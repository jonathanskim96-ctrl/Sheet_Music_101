// Checks the production build in dist/. Run after `npm run build`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
  if (text.includes('data-answer'))
    problems.push(`${file}: e2e answer hook leaked into production`);
  if (/<script(?![^>]*\bsrc=)[^>]*>\s*\S/.test(text) && file.endsWith('.html'))
    problems.push(`${file}: inline <script> found`);
}

if (problems.length) {
  console.error(`check-dist: ${problems.length} problem(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-dist: OK (${files.length} files)`);
