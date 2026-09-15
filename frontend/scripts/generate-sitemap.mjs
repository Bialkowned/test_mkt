/**
 * Write sitemap.xml and robots.txt from the site's own route manifest.
 *
 * The routes are already extracted at build time into dist/routes.json for
 * server.mjs to decide real 404s. A sitemap is the same fact pointed the other
 * way, so it is generated from that single source rather than hand-maintained --
 * a hand-kept sitemap drifts the first time someone adds a page, and the failure
 * is silent: the page simply never gets crawled.
 *
 * What is excluded, and why:
 *
 *   :param and * routes   a pattern is not a URL. /blog/:slug cannot be listed;
 *                         only a real slug can, and this script does not know
 *                         them. A site with real content pages should generate
 *                         those from its own data (see the more_time sites).
 *   private surfaces      login, admin, dashboard, account, billing, checkout,
 *                         reset-password and friends. Listing them invites
 *                         crawling of pages that require auth, which produces a
 *                         site full of soft-redirects to a login screen.
 *
 * robots.txt gets the Sitemap: line, because Search Console submission is a
 * manual step somebody has to remember and this one keeps working on its own.
 * An existing robots.txt is preserved -- only the Sitemap: line is added -- since
 * these files carry real Disallow rules.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const dist = path.join(webRoot, process.env.BUILD_DIR || 'dist');

let cfg = {};
try {
  cfg = JSON.parse(readFileSync(path.join(webRoot, 'site.config.json'), 'utf8'));
} catch {
  /* no config: nothing to do, a sitemap needs an origin */
}

const origin = (process.env.SITE_URL || cfg.siteUrl || '').replace(/\/+$/, '');
if (!origin) {
  console.error('  generate-sitemap: no siteUrl in site.config.json; nothing written');
  process.exit(0);
}

const manifest = path.join(dist, 'routes.json');
if (!existsSync(manifest)) {
  console.error('  generate-sitemap: no routes.json yet; run generate-routes first');
  process.exit(0);
}

const PRIVATE = [
  'login', 'logout', 'register', 'signup', 'sign-in', 'sign-up', 'admin',
  'dashboard', 'account', 'settings', 'profile', 'billing', 'checkout',
  'payment', 'onboarding', 'verify-email', 'reset-password', 'forgot-password',
  'confirm-email', 'unsubscribe', 'callback', 'auth', 'app',
];

const routes = JSON.parse(readFileSync(manifest, 'utf8'));
const urls = routes
  .filter((r) => !r.includes(':') && !r.includes('*'))
  .filter((r) => {
    const segs = r.split('/').filter(Boolean);
    return !segs.some((s) => PRIVATE.includes(s.toLowerCase()));
  })
  .sort();

if (urls.length === 0) {
  console.error('  generate-sitemap: every route is private or parameterised; nothing written');
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls
    .map(
      (u) =>
        `  <url>\n    <loc>${origin}${u === '/' ? '/' : u}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <priority>${u === '/' ? '1.0' : '0.7'}</priority>\n  </url>\n`,
    )
    .join('') +
  '</urlset>\n';

/**
 * Never SHRINK an existing sitemap.
 *
 * Route-derived URLs cannot include parameterised pages -- /city/:slug,
 * /programs/:id -- because this script does not know the slugs. A site that
 * generates its sitemap from real data therefore has a richer one, and
 * overwriting it silently drops those pages from every crawler's view.
 *
 * That is not hypothetical: this overwrote 76 urls with 17 on one site and 90
 * with 23 on another before the guard existed. If the file already lists more
 * than this script produced, it is better and it stays.
 */
function wouldShrink(file) {
  if (!existsSync(file)) return false;
  try {
    const existing = (readFileSync(file, 'utf8').match(/<loc>/g) || []).length;
    return existing > urls.length;
  } catch {
    return false;
  }
}

for (const dir of [path.join(webRoot, 'public'), dist]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const target = path.join(dir, 'sitemap.xml');
  if (wouldShrink(target)) {
    console.log(
      `  generate-sitemap: ${path.relative(webRoot, target)} already lists more ` +
        `URLs than ${urls.length} route-derived ones; keeping it`,
    );
  } else {
    writeFileSync(target, xml);
  }

  const robotsPath = path.join(dir, 'robots.txt');
  const line = `Sitemap: ${origin}/sitemap.xml`;
  let robots = existsSync(robotsPath) ? readFileSync(robotsPath, 'utf8') : null;
  if (robots === null) {
    robots = `User-agent: *\nAllow: /\n\n${line}\n`;
  } else if (!/^\s*sitemap:/im.test(robots)) {
    robots = `${robots.replace(/\n+$/, '')}\n\n${line}\n`;
  } else {
    robots = robots.replace(/^\s*Sitemap:.*$/im, line);
  }
  writeFileSync(robotsPath, robots);
}

console.log(
  `  generate-sitemap: ${urls.length} URL(s) -> sitemap.xml, robots.txt updated (${origin})`,
);
