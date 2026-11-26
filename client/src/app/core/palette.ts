import { Material } from './models';

/** Colour science for the mood board: k-means palette extraction + CIE Lab ΔE matching to paint catalogues. */

export type Rgb = [number, number, number];

export const toHex = ([r, g, b]: Rgb) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
export const fromHex = (hex: string): Rgb => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

/** k-means++ seeding, then Lloyd iterations. Deterministic for a given input order. */
export function kmeans(pixels: Rgb[], k: number, iterations = 12): { color: Rgb; share: number }[] {
  if (!pixels.length) return [];
  const d2 = (a: Rgb, b: Rgb) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const centers: Rgb[] = [pixels[Math.floor(pixels.length / 2)]];
  while (centers.length < k) {
    // Next centre = the pixel farthest from all current centres (deterministic k-means++ variant).
    let best = pixels[0], bestD = -1;
    for (const p of pixels) {
      const d = Math.min(...centers.map(c => d2(p, c)));
      if (d > bestD) { bestD = d; best = p; }
    }
    centers.push(best);
  }
  let assign = new Array(pixels.length).fill(0);
  for (let it = 0; it < iterations; it++) {
    assign = pixels.map(p => centers.reduce((bi, c, i) => (d2(p, c) < d2(p, centers[bi]) ? i : bi), 0));
    for (let c = 0; c < k; c++) {
      const members = pixels.filter((_, i) => assign[i] === c);
      if (members.length) centers[c] = [0, 1, 2].map(ch => members.reduce((s, m) => s + m[ch], 0) / members.length) as Rgb;
    }
  }
  return centers
    .map((color, i) => ({ color, share: assign.filter(a => a === i).length / pixels.length }))
    .filter(c => c.share >= 0.01)
    .sort((a, b) => b.share - a.share);
}

function rgbToLab([r, g, b]: Rgb): [number, number, number] {
  const lin = (v: number) => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** CIE76 colour difference – < 2.3 is barely noticeable to the human eye. */
export function deltaE(a: Rgb, b: Rgb): number {
  const [l1, a1, b1] = rgbToLab(a), [l2, a2, b2] = rgbToLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export function nearestPaint(color: Rgb, paints: Material[]): { paint: Material; delta: number } | null {
  const withHex = paints.filter(p => p.hex);
  if (!withHex.length) return null;
  return withHex.map(paint => ({ paint, delta: deltaE(color, fromHex(paint.hex!)) })).sort((a, b) => a.delta - b.delta)[0];
}

/** Classic colour-harmony suggestion: complementary + analogous hues. */
export function harmony(color: Rgb): Rgb[] {
  const [r, g, b] = color.map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  let h = 0;
  if (max !== min) h = max === r ? (g - b) / (max - min) + (g < b ? 6 : 0) : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4;
  h /= 6;
  const hsl = (hh: number): Rgb => {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const t = (x: number) => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 0.5 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
    return [t(hh + 1 / 3), t(hh), t(hh - 1 / 3)].map(v => v * 255) as Rgb;
  };
  return [hsl(h + 0.5), hsl(h + 1 / 12), hsl(h - 1 / 12)];
}
