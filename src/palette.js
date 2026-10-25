// Paletas de color para categorías de sitios: preajustes científicos, extracción desde gráficos y control de daltonismo
import { hexToRgb, rgbToHex, rgbToLab, deltaE, simulateCVD, clamp } from './util.js';

export const PALETTES = [
  { id: 'pinguinos', name: 'Pingüinos (de tu gráfico: Adelia, Emperador, Papúa)', colors: ['#3176b1', '#e29f2c', '#36a177'], labels: ['Adelia', 'Emperador', 'Papúa'] },
  { id: 'modelo1', name: 'Modelo 1 (azul, amarillo, rojo)', colors: ['#1747e8', '#f7e017', '#ee1c1c'] },
  { id: 'modelo2', name: 'Modelo 2 (celeste, naranja, violeta)', colors: ['#8ebdd9', '#f98f39', '#651368'] },
  { id: 'okabe', name: 'Okabe–Ito (apta daltonismo)', colors: ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'] },
  { id: 'tolbright', name: 'Paul Tol, brillante (apta daltonismo)', colors: ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB'] },
  { id: 'tolmuted', name: 'Paul Tol, apagada (apta daltonismo)', colors: ['#332288', '#88CCEE', '#44AA99', '#117733', '#999933', '#DDCC77', '#CC6677', '#882255', '#AA4499'] },
  { id: 'ggplot', name: 'ggplot2 por defecto (R)', generator: 'ggplot' },
  { id: 'viridis', name: 'Viridis (secuencial)', generator: 'viridis' },
  { id: 'npg', name: 'Nature Publishing Group (ggsci)', colors: ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4', '#91D1C2', '#DC0000', '#7E6148'] },
  { id: 'lancet', name: 'The Lancet (ggsci)', colors: ['#00468B', '#ED0000', '#42B540', '#0099B4', '#925E9F', '#FDAF91', '#AD002A', '#ADB6B6'] },
  { id: 'set2', name: 'ColorBrewer Set2', colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'] },
  { id: 'dark2', name: 'ColorBrewer Dark2', colors: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'] },
  { id: 'set1', name: 'ColorBrewer Set1', colors: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'] },
];

// HCL (CIE LCh(uv)) → sRGB, como grDevices::hcl de R
function hclToHex(h, c, l) {
  const hr = (h * Math.PI) / 180;
  const U = c * Math.cos(hr), V = c * Math.sin(hr);
  const Xn = 95.047, Yn = 100, Zn = 108.883;
  const un = (4 * Xn) / (Xn + 15 * Yn + 3 * Zn), vn = (9 * Yn) / (Xn + 15 * Yn + 3 * Zn);
  const Y = l > 8 ? Yn * Math.pow((l + 16) / 116, 3) : (Yn * l) / 903.3;
  const u = U / (13 * l) + un, v = V / (13 * l) + vn;
  const X = (9 * Y * u) / (4 * v), Z = (Y * (12 - 3 * u - 20 * v)) / (4 * v);
  const x = X / 100, y = Y / 100, z = Z / 100;
  let r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  let g = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  let b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  const gam = (t) => (t <= 0.0031308 ? 12.92 * t : 1.055 * Math.pow(t, 1 / 2.4) - 0.055);
  return rgbToHex([gam(r), gam(g), gam(b)].map((t) => clamp(t, 0, 1) * 255));
}

const VIRIDIS = ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'];
function sampleStops(stops, n) {
  if (n <= 1) return [stops[Math.floor(stops.length / 2)]];
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (stops.length - 1);
    const a = Math.floor(t), b = Math.min(stops.length - 1, a + 1), f = t - a;
    const ca = hexToRgb(stops[a]), cb = hexToRgb(stops[b]);
    out.push(rgbToHex(ca.map((v, k) => v + (cb[k] - v) * f)));
  }
  return out;
}

export function paletteColors(p, n) {
  if (!p) return [];
  if (p.generator === 'ggplot') {
    const out = [];
    for (let i = 0; i < n; i++) out.push(hclToHex(15 + (360 / n) * i, 100, 65));
    return out;
  }
  if (p.generator === 'viridis') return sampleStops(VIRIDIS, Math.max(n, 2)).slice(0, n);
  const out = [];
  for (let i = 0; i < n; i++) out.push(p.colors[i % p.colors.length]);
  return out;
}

export function getPalette(id) { return PALETTES.find((p) => p.id === id); }

// ---------- Extracción desde una imagen de gráfico estadístico ----------
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  if (max !== min) s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return [0, s, l];
}

export async function extractPaletteFromImage(src, { k = 8, minShare = 0.012 } = {}) {
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
  const maxSide = 360;
  const sc = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pts = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 200) continue;
      const rgb = [data[i], data[i + 1], data[i + 2]];
      const [, s, l] = rgbToHsl(rgb);
      if (s < 0.22 || l < 0.1 || l > 0.93) continue; // descarta fondo, ejes, texto y grises
      pts.push({ rgb, lab: rgbToLab(rgb), x: x / w });
    }
  }
  if (pts.length < 20) return [];
  // k-means++ en Lab
  const K = Math.min(k, pts.length);
  const centers = [pts[Math.floor(pts.length / 2)].lab.slice()];
  while (centers.length < K) {
    let sum = 0;
    const d = pts.map((p) => {
      let m = Infinity;
      for (const c0 of centers) m = Math.min(m, (p.lab[0] - c0[0]) ** 2 + (p.lab[1] - c0[1]) ** 2 + (p.lab[2] - c0[2]) ** 2);
      sum += m;
      return m;
    });
    let r = Math.random() * sum, idx = 0;
    for (; idx < d.length; idx++) { r -= d[idx]; if (r <= 0) break; }
    centers.push(pts[Math.min(idx, pts.length - 1)].lab.slice());
  }
  const assign = new Int32Array(pts.length);
  for (let it = 0; it < 18; it++) {
    for (let i = 0; i < pts.length; i++) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < centers.length; j++) {
        const c0 = centers[j], p = pts[i].lab;
        const dd = (p[0] - c0[0]) ** 2 + (p[1] - c0[1]) ** 2 + (p[2] - c0[2]) ** 2;
        if (dd < bd) { bd = dd; best = j; }
      }
      assign[i] = best;
    }
    const acc = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pts.length; i++) {
      const a = acc[assign[i]], p = pts[i].lab;
      a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3] += 1;
    }
    acc.forEach((a, j) => { if (a[3]) centers[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  // Agrega por grupo: color mediano en RGB, participación y posición horizontal media
  let groups = centers.map(() => ({ rgbs: [], xs: 0, n: 0 }));
  for (let i = 0; i < pts.length; i++) {
    const g = groups[assign[i]];
    g.rgbs.push(pts[i].rgb); g.xs += pts[i].x; g.n += 1;
  }
  groups = groups.filter((g) => g.n > 0).map((g) => {
    const med = [0, 1, 2].map((ch) => {
      const v = g.rgbs.map((r) => r[ch]).sort((a, b) => a - b);
      return v[Math.floor(v.length / 2)];
    });
    return { color: rgbToHex(med), rgb: med, share: g.n / pts.length, x: g.xs / g.n, n: g.n };
  });
  // Fusiona grupos casi iguales (ΔE < 14)
  groups.sort((a, b) => b.n - a.n);
  const merged = [];
  for (const g of groups) {
    const m = merged.find((q) => deltaE(q.rgb, g.rgb) < 14);
    if (m) { m.x = (m.x * m.n + g.x * g.n) / (m.n + g.n); m.n += g.n; m.share += g.share; }
    else merged.push({ ...g });
  }
  return merged.filter((g) => g.share >= minShare).sort((a, b) => a.x - b.x);
}

// ---------- Control de distinguibilidad ----------
export function paletteDiagnostics(colors) {
  const types = [['normal', 'Visión típica'], ['deutan', 'Deuteranopía'], ['protan', 'Protanopía'], ['tritan', 'Tritanopía']];
  const out = [];
  for (const [t, label] of types) {
    let min = Infinity, pair = null;
    const sim = colors.map((c) => (t === 'normal' ? hexToRgb(c) : simulateCVD(hexToRgb(c), t)));
    for (let i = 0; i < sim.length; i++) {
      for (let j = i + 1; j < sim.length; j++) {
        const d = deltaE(sim[i], sim[j]);
        if (d < min) { min = d; pair = [i, j]; }
      }
    }
    out.push({ type: t, label, minDeltaE: isFinite(min) ? min : null, pair, simulated: sim.map(rgbToHex) });
  }
  return out;
}
