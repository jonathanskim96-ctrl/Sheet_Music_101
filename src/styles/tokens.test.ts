import { describe, expect, it } from 'vitest';
import css from './tokens.css?raw';

type Palette = Record<string, string>;

/** Pulls `--name: #hex` pairs out of one CSS block body. */
function parseVars(body: string): Palette {
  const out: Palette = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    const [, name, hex] = m;
    if (name !== undefined && hex !== undefined) out[name] = hex;
  }
  return out;
}

const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const light = parseVars(css.slice(0, darkStart));
const dark = { ...light, ...parseVars(css.slice(darkStart)) };

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

/** WCAG contrast ratio between two colours. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

function colour(p: Palette, name: string): string {
  if (name === 'white') return '#ffffff';
  const v = p[name];
  if (v === undefined) throw new Error(`token --${name} missing`);
  return v;
}

const pairs: [string, string][] = [
  ['text', 'bg'],
  ['text-muted', 'bg'],
  ['on-primary', 'primary'],
  ['correct-text', 'correct-bg'],
  ['wrong-text', 'wrong-bg'],
  ...Array.from({ length: 11 }, (_, i): [string, string] => ['white', `unit-${String(i + 1)}`]),
];

describe('colour tokens', () => {
  it('parses both palettes completely', () => {
    expect(Object.keys(light)).toHaveLength(32);
    expect(dark.bg).toBe('#111827');
    expect(light.bg).toBe('#ffffff');
  });

  for (const [scheme, palette] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    for (const [fg, bg] of pairs) {
      it(`${scheme}: ${fg} on ${bg} has contrast >= 4.5`, () => {
        expect(contrast(colour(palette, fg), colour(palette, bg))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('contrast helper is correct (black on white = 21)', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});
