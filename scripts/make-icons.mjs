// Generates public/favicon.svg and the PNG app icons from the treble clef glyph.
// One-off: run `node scripts/make-icons.mjs` and commit the results. Uses the
// Playwright Chromium (pre-installed in cloud sessions; never run `playwright install` there).
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync('src/notation/glyphs.ts', 'utf8');
const match = /gClef: \{\s*d: '([^']+)'/.exec(source);
if (!match) throw new Error('gClef path not found in glyphs.ts');
const clefPath = match[1];
const [minX, minY, maxX, maxY] = [0, -658, 671, 1098]; // GLYPHS.gClef.bounds

/** Square icon SVG: green background (rounded unless full-bleed), white clef of the given height ratio. */
function iconSvg(size, { rounded, clefRatio }) {
  const target = size * clefRatio;
  const scale = target / (maxY - minY);
  const tx = (size - (maxX - minX) * scale) / 2;
  const ty = (size - target) / 2 + maxY * scale;
  const radius = rounded ? size * 0.22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<rect width="${size}" height="${size}" rx="${radius}" fill="#15803D"/>
<circle cx="${size * 0.78}" cy="${size * 0.22}" r="${size * 0.07}" fill="#FACC15"/>
<path d="${clefPath}" fill="#FFFFFF" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})"/>
</svg>`;
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/favicon.svg', iconSvg(64, { rounded: true, clefRatio: 0.72 }));

const outputs = [
  ['public/icons/icon-192.png', 192, { rounded: true, clefRatio: 0.66 }],
  ['public/icons/icon-512.png', 512, { rounded: true, clefRatio: 0.66 }],
  ['public/icons/icon-maskable-512.png', 512, { rounded: false, clefRatio: 0.5 }],
  ['public/icons/apple-touch-icon-180.png', 180, { rounded: false, clefRatio: 0.62 }],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [path, size, options] of outputs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${iconSvg(size, options)}</body></html>`,
  );
  await page.locator('svg').screenshot({ path, omitBackground: true });
}
await browser.close();
console.log('Icons written to public/');
