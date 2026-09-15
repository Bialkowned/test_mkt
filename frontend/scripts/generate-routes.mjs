/**
 * Write dist/routes.json: every path pattern the SPA router will actually serve.
 *
 * server.mjs needs this to tell "a real route the client renders" from "a URL
 * that does not exist". Without it the only safe fallback is to serve the app
 * shell for anything extensionless, which means every unknown URL answers 200
 * and the whole site is one large soft 404 to a crawler. With it, an unknown
 * path still renders NotFound — the SPA is unchanged — but the response
 * carries the status that is true.
 *
 * The patterns are read out of the router file rather than maintained by hand,
 * because a hand-kept copy drifts the first time someone adds a route and the
 * failure is silent in the worst direction: a real page starts returning 404.
 *
 * NESTED ROUTES. The earlier version read `path="..."` flat and kept only values
 * starting with "/". React Router lets a child route be RELATIVE to its parent:
 *
 *     <Route path="/admin" element={<Layout/>}>
 *       <Route path="users" element={<Users/>} />     ->  /admin/users
 *       <Route index element={<Home/>} />             ->  /admin
 *     </Route>
 *
 * Flat extraction sees "/admin" and "users", discards the second as relative,
 * and writes a manifest containing the parent alone — so /admin/users, a real
 * working page, starts answering 404. That is worse than the soft 404 this
 * script exists to fix, because it breaks pages rather than mislabelling them.
 * Seven sites in the fleet are shaped this way and were held back from migration
 * until this could resolve them.
 *
 * So the file is walked as a tree: <Route> elements are paired with their
 * closing tags, a stack carries the parent prefix, and each child's full path is
 * the join of the two. An absolute child path ignores the parent, which is what
 * React Router does. `index` routes resolve to the parent's own path.
 *
 * Extraction being a scan over JSX rather than a real parse is still a weakness,
 * so it is checked rather than trusted: the floor below refuses to write a
 * manifest that lost most of its routes, and verify-prerender.mjs requires every
 * sitemap URL to match something in here.
 *
 * This file is identical across the fleet. Everything per-site lives in
 * site.config.json under "routeManifest".
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const dist = path.join(webRoot, process.env.BUILD_DIR || 'dist');

let siteConfig = {};
try {
  siteConfig = JSON.parse(readFileSync(path.join(webRoot, 'site.config.json'), 'utf8'));
} catch {
  // No config is not an error: the defaults below are the old behaviour.
}
const routeCfg = siteConfig.routeManifest || {};

const CANDIDATES = ['src/App.tsx', 'src/App.jsx', 'src/App.js'];
const appFile = routeCfg.appFile
  ? path.join(webRoot, routeCfg.appFile)
  : CANDIDATES.map((c) => path.join(webRoot, c)).find((p) => existsSync(p));

if (!appFile || !existsSync(appFile)) {
  console.error(
    `  generate-routes: no router file (tried ${
      routeCfg.appFile || CANDIDATES.join(', ')
    }); nothing written`,
  );
  process.exit(0);
}

const src = readFileSync(appFile, 'utf8');

/** Join a parent route prefix with a child's path the way React Router does. */
function joinRoute(parent, child) {
  if (child.startsWith('/')) return child; // absolute child ignores the parent
  const base = parent === '/' ? '' : parent;
  const tail = child.replace(/^\/+/, '');
  return tail ? `${base}/${tail}` : base || '/';
}

/**
 * Find each <Route ...> / </Route> tag and say where its attributes end.
 *
 * A regex cannot do this. `<Route path="x" element={<Admin/>} />` contains a '>'
 * INSIDE an attribute value, so /<Route\b([^>]*?)(\/?)>/ stops early, misreads a
 * self-closing tag as an opening one, and never pops the stack — which silently
 * nests every following sibling one level deeper. That produced
 * /app/admin/admin/users on a real site.
 *
 * So scan forward tracking brace depth and string quotes, and only accept a '>'
 * at depth zero outside a string as the end of the tag.
 */
function scanRouteTags(text) {
  const out = [];
  const re = /<(\/?)Route\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] === '/') {
      const gt = text.indexOf('>', m.index);
      out.push({ closing: true });
      re.lastIndex = gt === -1 ? m.index + 6 : gt + 1;
      continue;
    }
    let i = m.index + m[0].length;
    let depth = 0;
    let quote = null;
    for (; i < text.length; i += 1) {
      const c = text[i];
      if (quote) {
        if (c === '\\') i += 1;
        else if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') quote = c;
      else if (c === '{') depth += 1;
      else if (c === '}') depth -= 1;
      else if (c === '>' && depth === 0) break;
    }
    const raw = text.slice(m.index + m[0].length, i);
    out.push({
      closing: false,
      selfClosing: raw.trimEnd().endsWith('/'),
      attrs: raw,
    });
    re.lastIndex = i + 1;
  }
  return out;
}

/**
 * Walk <Route> elements, tracking nesting, and collect full paths.
 *
 * Deliberately a scan and not a parser: the `path` attribute is unambiguous, and
 * pulling in a JSX parser would make this script depend on the app's toolchain.
 * What it must get right is the PAIRING of open and close tags, so that a child
 * is attributed to the correct parent.
 */
function extractRoutes(text, basePath = '', routes = []) {
  const stack = [];
  for (const m of scanRouteTags(text)) {
    if (m.closing) {
      stack.pop();
      continue;
    }
    const { attrs, selfClosing } = m;
    const parent = stack.length ? stack[stack.length - 1] : basePath;

    const pm = attrs.match(/\bpath\s*=\s*"([^"]*)"/);
    const isIndex = /\bindex\b(?!\s*=)/.test(attrs);

    let full = null;
    // Where this element's OWN children are based. For a catch-all the route is
    // not a page, but anything rendered inside it still hangs off its prefix:
    // path="/admin/*" bases its children at /admin.
    let childBase = parent || '/';

    if (pm) {
      const p = pm[1];
      const isCatchAll = p === '*' || p.endsWith('/*');
      if (isCatchAll) {
        const prefix = p.replace(/\/?\*$/, '');
        childBase = prefix ? joinRoute(parent || '/', prefix) : parent || '/';
        // A PREFIXED catch-all (path="/admin/*") is kept as a pattern as well as
        // recursed into. It usually hands the subtree to a nested router that
        // often lives in another file this scan never opens, so dropping it in
        // favour of the children found here would 404 real pages — the one
        // direction that is worse than the soft 404 being fixed.
        //
        // A ROOT catch-all (path="/*") is different and must NOT be kept:
        // server.mjs compiles it to a pattern matching every URL, which would
        // mark the whole site known and restore the soft 404 wholesale.
        if (prefix) routes.push(joinRoute(parent || '/', p));
      } else {
        full = joinRoute(parent || '/', p);
        childBase = full;
      }
    } else if (isIndex) {
      full = parent || '/'; // <Route index> IS the parent's own path
    }

    if (full) routes.push(full);

    // A whole <Routes> tree can live inside element={...}, which is an ATTRIBUTE,
    // so the scan above steps over it. theauthentech puts all 22 of its real
    // pages there, under a path="/*" shell route; without this recursion the
    // manifest came back with 2 entries and would have 404ed the entire site.
    if (attrs.includes('<Route')) extractRoutes(attrs, childBase, routes);

    if (!selfClosing) stack.push(childBase);
  }
  return routes;
}

/**
 * Routes defined in a data table rather than as JSX.
 *
 *     const PUBLIC_ROUTES = [
 *       { path: '/services', element: <ServicesPage /> },
 *       ...
 *     ];
 *     PUBLIC_ROUTES.map(({path, element}) => <Route path={path} .../>)
 *
 * The JSX carries `path={path}` — an identifier, not a literal — so the tree walk
 * above finds nothing and the manifest comes back empty. Sites do this precisely
 * to avoid keeping two <Routes> trees in sync, so it is a pattern worth reading
 * rather than refusing.
 *
 * Only absolute values are taken, and only from `path:` in object position,
 * which is distinct from the JSX `path=` handled above.
 */
function extractTableRoutes(text) {
  const out = [];
  const re = /\bpath\s*:\s*(['"`])([^'"`]*)\1/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[2].startsWith('/')) out.push(m[2]);
  }
  return out;
}

const routes = [...new Set([...extractRoutes(src), ...extractTableRoutes(src)])]
  .filter((p) => p.startsWith('/'))
  .sort();

const MIN_ROUTES = Number.isFinite(routeCfg.minRoutes) ? routeCfg.minRoutes : 20;
if (routes.length < MIN_ROUTES) {
  console.error(
    `\n  FAILED: generate-routes extracted only ${routes.length} route(s) from ` +
      `${path.relative(webRoot, appFile)} (expected at least ${MIN_ROUTES}).\n` +
      `  The extraction has probably broken. Not writing ${
        process.env.BUILD_DIR || 'dist'
      }/routes.json — a short manifest would 404 real pages.\n`,
  );
  process.exit(1);
}

const REQUIRED = Array.isArray(routeCfg.required) ? routeCfg.required : ['/'];
const absent = REQUIRED.filter((r) => !routes.includes(r));
if (absent.length) {
  console.error(`\n  FAILED: generate-routes lost required route(s): ${absent.join(', ')}\n`);
  process.exit(1);
}

if (!existsSync(dist)) mkdirSync(dist, { recursive: true });
writeFileSync(path.join(dist, 'routes.json'), JSON.stringify(routes, null, 2) + '\n');
console.log(
  `  generate-routes: ${routes.length} route pattern(s) from ` +
    `${path.relative(webRoot, appFile)} -> ` +
    `${path.relative(webRoot, path.join(dist, 'routes.json'))}`,
);
