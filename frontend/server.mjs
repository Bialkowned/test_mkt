/**
 * The static server for every site in the vertical. Identical in all five repos;
 * everything that differs lives in site.config.json next to it.
 *
 * It replaces `serve -s dist`, which could not express what these sites need.
 * serve-handler applies its rewrites *before* looking for a file, so the blanket
 * "** -> /index.html" rule meant a prerendered page was never reached and the
 * app shell was returned for every URL. Removing the rule 404s every
 * client-side route instead. There is no configuration of serve that does both.
 *
 * The order here is the order that works, and it is the whole point of the file:
 *
 *   1. /api and /uploads proxy to the backend, same-origin. That also means the
 *      prerenderer needs no CORS workaround, because it crawls through here.
 *   2. A real file wins. Prerendered HTML is a real file.
 *   3. A directory serves its index.html. That is how /resources/<slug> resolves.
 *   4. Anything else falls back to the SPA shell, so /dashboard still works.
 *
 * It also fixes the MIME bug `serve` had: a missing /assets/*.js returned 200
 * with text/html, so a stale chunk surfaced as a confusing parse error rather
 * than a 404.
 */
import http from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(path.join(here, 'site.config.json'), 'utf8'));

// BUILD_DIR exists for one caller: scripts/prerender.mjs spawns this server to
// crawl a build that is not live yet. Without it the prerenderer served the dist
// symlink -- the *previous* release -- and wrote that page's asset references
// into the new one, so the shipped index.html pointed at hashed bundles that did
// not exist in its own release. The site stayed up only because Cloudflare still
// had the old immutable assets cached; at origin they were 404.
// Unset, as it is under pm2, this is 'dist' exactly as before.
const distDir = path.join(here, process.env.BUILD_DIR || 'dist');
const port = Number(process.env.PORT || config.port);
const host = process.env.HOST || '127.0.0.1';
const apiTarget = new URL(process.env.API_TARGET || config.apiTarget);
const headers = config.headers || {};

const MIME = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
}));

const contentType = (f) => MIME.get(path.extname(f).toLowerCase()) || 'application/octet-stream';

/**
 * Resolve a request path inside dist, or refuse.
 *
 * The boundary check is `base + sep`, not a bare startsWith: with dist at
 * /srv/dist, a plain prefix test also accepts /srv/dist-backup, so `../dist-backup/x`
 * would escape while looking contained.
 */
function safeJoin(base, target) {
  const resolved = path.resolve(base, target);
  return resolved === base || resolved.startsWith(base + path.sep) ? resolved : null;
}

/**
 * The path patterns the SPA router will actually render, written by
 * scripts/generate-routes.mjs at build time.
 *
 * Without this the only safe fallback for an extensionless URL is the app shell
 * at 200, which makes every typo, every dead link and every probe look like a
 * real page. A crawler cannot tell them apart, so the whole site reads as one
 * large soft 404. With it, an unknown path still renders NotFound.tsx -- the
 * client behaviour does not change -- but the response carries the true status.
 *
 * Absent or unreadable, every route is treated as known and the behaviour is
 * exactly what it was before. That is deliberate: this file is identical across
 * the vertical, and a site that has not generated a manifest yet must keep
 * serving rather than start 404ing its own pages.
 */
function compileRouteMatchers() {
  const file = path.join(distDir, 'routes.json');
  if (!existsSync(file)) return null;
  try {
    const patterns = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(patterns) || patterns.length === 0) return null;
    return patterns.map((pattern) => {
      const body = pattern
        // Escape regex metacharacters. ':' and '*' are left alone; they are
        // router syntax and are translated below.
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\/\*$/, '(?:/.*)?')          // /mobile/*  -> /mobile and below
        .replace(/:[A-Za-z0-9_]+/g, '[^/]+');   // /blog/:slug -> one segment
      return new RegExp(`^${body}/?$`);
    });
  } catch {
    return null;
  }
}

/**
 * Re-read routes.json when it changes, so a release does not need a restart.
 *
 * dist is a symlink into releases/<ts> (see scripts/release.sh) and the swap is
 * atomic, so after a release this path resolves to a different file. Reading it
 * once at startup meant the only reason to restart this process on a content
 * rebuild was to pick up a manifest that had usually not even changed -- route
 * *patterns* come from App.tsx, so they move on a code deploy, not when a post
 * is published. That restart was the last thing dropping requests during a
 * deploy: the atomic swap costs nothing, but bouncing the process costs every
 * connection in flight.
 *
 * The stat is rate-limited to once a second rather than done per request. Worst
 * case after a swap is up to a second of the previous manifest, which can only
 * affect whether an unknown URL is answered 404 or 200.
 */
const ROUTE_RECHECK_MS = 1000;
let routeCache = { matchers: null, checkedAt: 0, mtimeMs: -2 };

function routeMatchers() {
  const now = Date.now();
  if (now - routeCache.checkedAt < ROUTE_RECHECK_MS) return routeCache.matchers;
  routeCache.checkedAt = now;

  let mtimeMs = -1;
  try {
    mtimeMs = statSync(path.join(distDir, 'routes.json')).mtimeMs;
  } catch {
    mtimeMs = -1; // no manifest: every path is treated as known, as before
  }
  if (mtimeMs !== routeCache.mtimeMs) {
    routeCache.mtimeMs = mtimeMs;
    routeCache.matchers = mtimeMs === -1 ? null : compileRouteMatchers();
    console.log(
      routeCache.matchers
        ? `  routes: ${routeCache.matchers.length} pattern(s) loaded; unknown paths will 404`
        : '  routes: no routes.json; every path falls back to the shell at 200',
    );
  }
  return routeCache.matchers;
}

routeMatchers();

function serveFile(res, filePath, status = 200) {
  // Hashed assets are immutable; HTML never is, or a deploy is invisible to
  // anyone who has already visited.
  const isHtml = filePath.endsWith('.html');
  const isServiceWorker = filePath.endsWith('sw.js');
  res.writeHead(status, {
    'Content-Type': contentType(filePath),
    'Cache-Control':
      isHtml || isServiceWorker ? 'no-cache, must-revalidate' : 'public, max-age=31536000, immutable',
  });

  // A read that fails after the headers are out — the file replaced mid-deploy,
  // a disk error — emits 'error' on the stream. Unhandled, that is an uncaught
  // exception and the process dies, taking every in-flight request with it.
  const stream = createReadStream(filePath);
  stream.on('error', (err) => {
    console.error(`read failed for ${filePath}: ${err.message}`);
    res.destroy();
  });
  // If the client goes away mid-download, stop reading.
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}

function proxyApi(req, res) {
  const target = new URL(req.url || '/', apiTarget);
  const upstream = http.request(
    target,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: apiTarget.host,
        // The response body is piped through untouched while content-encoding is
        // stripped below, so a compressed upstream body would arrive labelled as
        // plain JSON and fail to parse.
        'accept-encoding': 'identity',
      },
    },
    (up) => {
      const h = { ...up.headers };
      delete h['content-encoding'];
      delete h['transfer-encoding'];
      res.writeHead(up.statusCode || 502, h);
      up.pipe(res);
    },
  );
  upstream.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ detail: 'Bad gateway', error: err.message }));
  });
  req.pipe(upstream);
}

function badRequest(res) {
  res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Bad request');
}

const server = http.createServer((req, res) => {
  // Everything below is untrusted input. A single malformed request must not be
  // able to take the process down: `/%` alone threw a URIError out of the
  // handler and killed the server, which is a denial of service anyone can
  // trigger with curl.
  let requestPath;
  let p;
  try {
    p = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
    requestPath = decodeURIComponent(p);
  } catch {
    return badRequest(res);
  }

  if (p === '/health' || p === '/api' || p.startsWith('/api/') || p.startsWith('/uploads/')) {
    return proxyApi(req, res);
  }

  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);

  // A null byte truncates a path in some syscalls; refuse rather than reason about it.
  if (requestPath.includes('\0')) return badRequest(res);

  const direct = safeJoin(distDir, requestPath.replace(/^\/+/, ''));

  if (direct && existsSync(direct)) {
    const st = statSync(direct);
    if (st.isFile()) return serveFile(res, direct);
    if (st.isDirectory()) {
      const idx = path.join(direct, 'index.html');
      if (existsSync(idx)) return serveFile(res, idx);
    }
  }

  // A missing asset is a 404, not the app shell. Returning HTML for a stale
  // /assets/*.js is what turned a cache miss into an unreadable parse error.
  if (path.extname(requestPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }

  // An unknown client-side route still gets the shell -- NotFound.tsx renders
  // and the app behaves normally -- but it answers 404 rather than 200, so a
  // crawler is told the truth. Known routes are unaffected.
  const matchers = routeMatchers();
  const known = !matchers || matchers.some((re) => re.test(requestPath));
  return serveFile(res, path.join(distDir, 'index.html'), known ? 200 : 404);
});

// A handler that throws before it has written anything leaves the socket hanging.
// This is the net under the specific guards above, not a substitute for them.
server.on('clientError', (err, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(port, host, () => {
  console.log(`${config.name} static server on http://${host}:${port}`);
  console.log(`  dist:  ${distDir}`);
  console.log(`  api:   ${apiTarget.origin}`);
});
