// Estado serializable del proyecto, historial y persistencia
import { getDef } from './catalog.js';
import { deepClone, uid, safeStorage } from './util.js';

export const STATE_VERSION = 1;

export const PAGE_PRESETS = [
  { id: 'col1', name: 'Revista: 1 columna (85 × 85 mm)', w: 85, h: 85 },
  { id: 'col15', name: 'Revista: 1,5 columnas (140 × 120 mm)', w: 140, h: 120 },
  { id: 'col2', name: 'Revista: 2 columnas (180 × 180 mm)', w: 180, h: 180 },
  { id: 'col2v', name: 'Revista: 2 columnas vertical (180 × 220 mm)', w: 180, h: 220 },
  { id: 'a5v', name: 'A5 vertical (148 × 210 mm)', w: 148, h: 210 },
  { id: 'a4v', name: 'A4 vertical (210 × 297 mm)', w: 210, h: 297 },
  { id: 'a4h', name: 'A4 horizontal (297 × 210 mm)', w: 297, h: 210 },
  { id: 'a3h', name: 'A3 horizontal (420 × 297 mm)', w: 420, h: 297 },
  { id: 'carta', name: 'Carta vertical (216 × 279 mm)', w: 215.9, h: 279.4 },
  { id: 'slide', name: 'Diapositiva 16:9 (254 × 142,9 mm)', w: 254, h: 142.875 },
  { id: 'poster', name: 'Póster A1 vertical (594 × 841 mm)', w: 594, h: 841 },
];

export function newLayerState(defId, over = {}) {
  const def = getDef(defId);
  if (!def) throw new Error('Capa desconocida: ' + defId);
  const d = def.defaults || {};
  const ls = {
    uid: uid('L'),
    def: defId,
    name: def.name,
    visible: true,
    opacity: d.opacity == null ? 1 : d.opacity,
    blend: 'normal',
    adjust: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0 },
    clip: d.clip || 'none',
    style: d.style ? deepClone(d.style) : null,
    params: d.params ? deepClone(d.params) : {},
    legend: { show: def.kind === 'vector' && def.type !== 'esri-feature' && !def.labelsOnly && defId !== 'ne-paises', label: def.name },
    insets: {},
    rev: 0,
    _styleVersion: 0,
  };
  return mergeDeep(ls, over);
}

export function mergeDeep(target, src) {
  for (const [k, v] of Object.entries(src || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) mergeDeep(target[k], v);
    else target[k] = v;
  }
  return target;
}

export function defaultSiteStyle() {
  return {
    shape: 'circle', size: 8, stroke: '#ffffff', strokeWidth: 0.8, strokeOpacity: 1, fillOpacity: 1, multi: 'pie',
    halo: { show: false, unit: 'pt', size: 22, km: 4, fillOpacity: 0.35, strokeWidth: 2.4 },
    label: { show: true, font: 'Source Sans 3', size: 7, color: '#1d2b38', halo: '#ffffff', haloWidth: 1.2, bold: true, italic: false },
  };
}

export function defaultLegend() {
  return {
    show: true, x: 8, y: 8, title: '', font: 'Source Sans 3', size: 7.5, titleSize: 8.5, color: '#1d2b38', bold: false,
    bg: '#ffffff', bgOpacity: 0.88, border: '#3a4652', borderWidth: 0.4, radius: 1.2, padding: 2.4, symbolSize: 7, gap: 1.4, columns: 1,
    overrides: {}, order: [], custom: [],
  };
}

export function defaultNorth() {
  return { show: true, x: 0, y: 0, size: 11, style: 'circle', color: '#111111', bg: '#ffffff', bgOpacity: 1, trueNorth: true, font: 'Source Sans 3' };
}

export function defaultScalebar() {
  return { show: true, x: 0, y: 0, lengthMM: 32, style: 'alternating', segments: 4, units: 'km', color: '#111111', font: 'Source Sans 3', size: 6.5, height: 1.4, showRF: false, bg: '#ffffff', bgOpacity: 0 };
}

export function newText(over = {}) {
  return Object.assign({
    id: uid('T'), text: 'Texto', anchor: 'page', x: 20, y: 20, lon: null, lat: null,
    font: 'Source Sans 3', size: 9, color: '#1d2b38', bold: false, italic: false, uppercase: false,
    letterSpacing: 0, lineHeight: 1.2, align: 'center', rotation: 0, halo: '#ffffff', haloWidth: 0,
    bg: { show: false, color: '#ffffff', opacity: 0.85, pad: 1.2, radius: 0.8 },
  }, over);
}

export function newInset(over = {}) {
  return mergeDeep({
    id: uid('Z'), name: 'Zoom', mode: 'detail', shape: 'circle', x: 100, y: 10, w: 70, h: 70,
    center: [-57.5, -63.8], mpm: 600, projection: 'same', bg: '#cfdde3',
    border: { color: '#1d1d1d', width: 0.7, dash: 'dashed' },
    connector: { type: 'tangent', color: '#1d1d1d', width: 0.6, dash: 'dashed' },
    footprint: { show: true, color: '#1d1d1d', width: 0.6, dash: 'dashed', fill: '#ffffff', fillOpacity: 0 },
    extentBox: { show: true, color: '#c8102e', width: 0.8, dash: 'solid' },
    layers: {}, graticule: false,
  }, over);
}

export function emptyState() {
  return {
    version: STATE_VERSION,
    title: 'Mapa de localización',
    page: { preset: 'col2', widthMM: 180, heightMM: 180, margins: { top: 0, right: 0, bottom: 0, left: 0 }, background: '#ffffff', frame: { show: true, color: '#222222', width: 0.6 } },
    projection: 'EPSG:3031',
    view: { center: [-58, -64], mpm: 3000, rotation: 0 },
    layers: [],
    sites: [],
    categories: [],
    siteStyle: defaultSiteStyle(),
    paletteId: 'pinguinos',
    insets: [],
    texts: [],
    legend: defaultLegend(),
    north: defaultNorth(),
    scalebar: defaultScalebar(),
    caption: { figure: 'Figura 1', lead: 'Mapa de localización del área de estudio.' },
  };
}

// Migra/valida un estado cargado
export function normalizeState(s) {
  const base = emptyState();
  const out = mergeDeep(base, s || {});
  out.layers = (out.layers || []).filter((l) => getDef(l.def) || l.def === 'user').map((l) => {
    if (l.def === 'user') return l;
    const fresh = newLayerState(l.def);
    const merged = mergeDeep(fresh, l);
    merged._styleVersion = 0;
    return merged;
  });
  out.siteStyle = mergeDeep(defaultSiteStyle(), out.siteStyle || {});
  out.legend = mergeDeep(defaultLegend(), out.legend || {});
  out.north = mergeDeep(defaultNorth(), out.north || {});
  out.scalebar = mergeDeep(defaultScalebar(), out.scalebar || {});
  out.insets = (out.insets || []).map((z) => newInset(z));
  out.texts = (out.texts || []).map((t) => newText(t));
  return out;
}

// ---------- Historial ----------
export class History {
  constructor(limit = 80) { this.stack = []; this.index = -1; this.limit = limit; }
  push(json) {
    if (this.stack[this.index] === json) return;
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(json);
    if (this.stack.length > this.limit) this.stack.shift();
    this.index = this.stack.length - 1;
  }
  canUndo() { return this.index > 0; }
  canRedo() { return this.index < this.stack.length - 1; }
  undo() { if (!this.canUndo()) return null; this.index -= 1; return this.stack[this.index]; }
  redo() { if (!this.canRedo()) return null; this.index += 1; return this.stack[this.index]; }
}

const KEY = 'coni-mapas:proyecto';
export function saveLocal(state) {
  const st = safeStorage();
  if (!st) return false;
  try { st.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
}
export function loadLocal() {
  const st = safeStorage();
  if (!st) return null;
  try { const t = st.getItem(KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; }
}
export function serializeState(state) {
  return JSON.stringify(state, (k, v) => (k.startsWith('_') ? undefined : v));
}
