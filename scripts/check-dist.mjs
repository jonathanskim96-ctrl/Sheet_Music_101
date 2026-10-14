// Checks the production build in dist/. Run after `npm run build`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const problems = [];
const dist = 'dist';
if (!existsSync(dist)) {
  console.error('check-dist: dist/ not found; run npm run build first');
  process.exit(1);
}
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
};
walk(dist);

const html = readFileSync(join(dist, 'index.html'), 'utf8');
if (!html.includes('http-equiv="Content-Security-Policy"'))
  problems.push('index.html: CSP meta missing');
const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]*)"/
  .exec(html)?.[1]
  ?.replaceAll('&#39;', "'");
const scriptSrc = csp
  ?.split(';')
  .map((d) => d.trim())
  .find((d) => d.startsWith('script-src '));
if (scriptSrc !== "script-src 'self'")
  problems.push(`index.html: CSP script-src is not self-only (${scriptSrc ?? 'missing'})`);
// The whole policy must be exactly SPEC 7.9 (kept here on purpose, independent of vite.config.ts),
// so loosening any other directive (connect-src *, a dropped object-src…) also fails.
const EXPECTED_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');
if (csp !== undefined && csp !== EXPECTED_CSP)
  problems.push(`index.html: CSP differs from SPEC 7.9 (${csp})`);
for (const required of ['sw.js', 'manifest.webmanifest']) {
  if (!existsSync(join(dist, required))) problems.push(`${required} missing`);
}
for (const file of files) {
  if (file.endsWith('.map')) problems.push(`${file}: source maps must not ship`);
  if (!/\.(js|css|html|webmanifest|svg)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  // XML namespace identifiers (React, SVG) are names, not requests; any other http:// is.
  const insecure = text.match(/http:\/\/(?!www\.w3\.org\/)[^\s"'`)<>]*/);
  if (insecure) problems.push(`${file}: insecure URL ${insecure[0]}`);
  // No other site is ever contacted (SPEC 7.9). The only https:// strings allowed are links
  // inside library error messages, which are text and never fetched.
  for (const [url] of text.matchAll(/https:\/\/[^\s"'`)<>\\]*/g)) {
    if (url !== 'https://react.dev/errors/' && url !== 'https://bit.ly/wb-precache')
      problems.push(`${file}: outside URL ${url}`);
  }
  if (text.includes('__e2e')) problems.push(`${file}: e2e test helper leaked into production`);
  if (text.includes('data-answer'))
    problems.push(`${file}: e2e answer hook leaked into production`);
  if (/<script(?![^>]*\bsrc=)[^>]*>\s*\S/.test(text) && file.endsWith('.html'))
    problems.push(`${file}: inline <script> found`);
}

// Speed budget (M7 step 4): all JavaScript together stays under 300 kB gzipped.
const JS_BUDGET_BYTES = 300 * 1000;
const jsBytes = files
  .filter((file) => file.endsWith('.js'))
  .reduce((sum, file) => sum + gzipSync(readFileSync(file), { level: 9 }).length, 0);
if (jsBytes > JS_BUDGET_BYTES)
  problems.push(
    `JavaScript is ${Math.round(jsBytes / 1000)} kB gzipped; the budget is ${JS_BUDGET_BYTES / 1000} kB`,
  );

if (problems.length) {
  console.error(`check-dist: ${problems.length} problem(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `check-dist: OK (${files.length} files, JavaScript ${Math.round(jsBytes / 1000)} kB gzipped)`,
);
