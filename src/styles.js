// Simbología: símbolos puntuales, tramas, guiones y funciones de estilo de OpenLayers
import { Style, Stroke, Fill, Text } from 'ol/style.js';
import { PT_MM, rgba } from './util.js';

export const SHAPES = [
  ['circle', 'Círculo'], ['square', 'Cuadrado'], ['triangle', 'Triángulo'], ['triangle-down', 'Triángulo invertido'],
  ['diamond', 'Rombo'], ['star', 'Estrella'], ['pentagon', 'Pentágono'], ['hexagon', 'Hexágono'],
  ['cross', 'Cruz'], ['x', 'Aspa'], ['none', 'Sin símbolo'],
];

export const DASH_OPTIONS = [
  ['solid', 'Continua'], ['dashed', 'Discontinua'], ['short', 'Discontinua corta'], ['long', 'Trazos largos'],
  ['dotted', 'Punteada'], ['dashdot', 'Punto y raya'], ['dashdotdot', 'Raya y dos puntos'],
];
const DASHES = {
  solid: [], dashed: [3.5, 2.2], short: [1.8, 1.5], long: [7, 2.8], dotted: [0.01, 2], dashdot: [4.5, 1.8, 0.01, 1.8], dashdotdot: [4.5, 1.6, 0.01, 1.6, 0.01, 1.6],
};
export function dashArray(name, widthPx, minUnitPx = 1) {
  const d = DASHES[name] || [];
  if (!d.length) return undefined;
  const f = Math.max(widthPx, minUnitPx);
  return d.map((v) => v * f);
}
export function dashCap(name) { return name === 'dotted' || name === 'dashdot' || name === 'dashdotdot' ? 'round' : 'butt'; }

export const PATTERNS = [
  ['none', 'Sin trama'], ['diag', 'Diagonal ／'], ['diag2', 'Diagonal ＼'], ['cross', 'Cruzada ✕'], ['horiz', 'Horizontal'], ['vert', 'Vertical'], ['grid', 'Cuadrícula'], ['dots', 'Puntos'],
];

// ---------- símbolos ----------
export function shapePath(ctx, x, y, r, shape) {
  ctx.beginPath();
  const poly = (n, rot = -Math.PI / 2, rr = r) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i * 2 * Math.PI) / n;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  switch (shape) {
    case 'square': ctx.rect(x - r * 0.886, y - r * 0.886, r * 1.772, r * 1.772); break;
    case 'triangle': poly(3, -Math.PI / 2, r * 1.2); break;
    case 'triangle-down': poly(3, Math.PI / 2, r * 1.2); break;
    case 'diamond': poly(4, -Math.PI / 2, r * 1.15); break;
    case 'pentagon': poly(5, -Math.PI / 2, r * 1.05); break;
    case 'hexagon': poly(6, 0, r * 1.02); break;
    case 'star': {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r * 1.25 : r * 0.52;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'cross': {
      const t = r * 0.36;
      ctx.moveTo(x - t, y - r); ctx.lineTo(x + t, y - r); ctx.lineTo(x + t, y - t); ctx.lineTo(x + r, y - t);
      ctx.lineTo(x + r, y + t); ctx.lineTo(x + t, y + t); ctx.lineTo(x + t, y + r); ctx.lineTo(x - t, y + r);
      ctx.lineTo(x - t, y + t); ctx.lineTo(x - r, y + t); ctx.lineTo(x - r, y - t); ctx.lineTo(x - t, y - t);
      ctx.closePath();
      break;
    }
    case 'x': {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.translate(-x, -y);
      shapePath(ctx, x, y, r * 1.1, 'cross');
      ctx.restore();
      break;
    }
    default: ctx.arc(x, y, r, 0, Math.PI * 2);
  }
}

// cfg: {shape, size(pt), fill, fillOpacity, stroke, strokeWidth(pt), strokeOpacity, colors?:[], multi?: 'pie'|'rings'}
export function drawSymbol(ctx, x, y, cfg, pxPerPt) {
  if (!cfg || cfg.shape === 'none' || !(cfg.size > 0)) return;
  const r = (cfg.size / 2) * pxPerPt;
  const colors = cfg.colors && cfg.colors.length ? cfg.colors : [cfg.fill];
  const fo = cfg.fillOpacity == null ? 1 : cfg.fillOpacity;
  ctx.save();
  if (colors.length > 1) {
    ctx.save();
    shapePath(ctx, x, y, r, cfg.shape);
    ctx.clip();
    const n = colors.length;
    if (cfg.multi === 'rings') {
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.arc(x, y, r * 1.6 * (1 - i / n), 0, Math.PI * 2);
        ctx.fillStyle = rgba(colors[i], fo);
        ctx.fill();
      }
    } else if (cfg.multi === 'halves-v') {
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = rgba(colors[i], fo);
        ctx.fillRect(x - r * 1.6 + (i * 3.2 * r) / n, y - r * 1.6, (3.2 * r) / n + 0.5, r * 3.2);
      }
    } else {
      for (let i = 0; i < n; i++) {
        const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n, a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / n;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, r * 1.6, a0, a1);
        ctx.closePath();
        ctx.fillStyle = rgba(colors[i], fo);
        ctx.fill();
      }
    }
    ctx.restore();
  } else if (colors[0] && fo > 0) {
    shapePath(ctx, x, y, r, cfg.shape);
    ctx.fillStyle = rgba(colors[0], fo);
    ctx.fill();
  }
  const sw = (cfg.strokeWidth || 0) * pxPerPt;
  if (sw > 0 && cfg.stroke && (cfg.strokeOpacity == null || cfg.strokeOpacity > 0)) {
    shapePath(ctx, x, y, r, cfg.shape);
    ctx.lineWidth = sw;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(cfg.stroke, cfg.strokeOpacity == null ? 1 : cfg.strokeOpacity);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- tramas ----------
const patternCache = new Map();
export function getPattern(kind, color, spacingPx, lineWidthPx) {
  if (!kind || kind === 'none') return null;
  const s = Math.max(3, Math.round(spacingPx));
  const lw = Math.max(0.5, lineWidthPx);
  const key = `${kind}|${color}|${s}|${lw.toFixed(2)}`;
  if (patternCache.has(key)) return patternCache.get(key);
  const c = document.createElement('canvas');
  c.width = s; c.height = s;
  const x = c.getContext('2d');
  x.strokeStyle = color; x.fillStyle = color; x.lineWidth = lw; x.lineCap = 'square';
  const line = (x0, y0, x1, y1) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
  if (kind === 'diag' || kind === 'cross') { line(-1, s + 1, s + 1, -1); line(-1, 1, 1, -1); line(s - 1, s + 1, s + 1, s - 1); }
  if (kind === 'diag2' || kind === 'cross') { line(-1, -1, s + 1, s + 1); line(s - 1, -1, s + 1, 1); line(-1, s - 1, 1, s + 1); }
  if (kind === 'horiz' || kind === 'grid') line(0, s / 2, s, s / 2);
  if (kind === 'vert' || kind === 'grid') line(s / 2, 0, s / 2, s);
  if (kind === 'dots') { x.beginPath(); x.arc(s / 2, s / 2, lw * 1.1, 0, Math.PI * 2); x.fill(); }
  const pat = x.createPattern(c, 'repeat');
  patternCache.set(key, pat);
  return pat;
}

// ---------- texto ----------
export function fontString({ font = 'Source Sans 3', sizePx = 10, bold = false, italic = false, weight }) {
  const w = weight || (bold ? 700 : 400);
  const fam = /\s/.test(font) ? `"${font}"` : font;
  return `${italic ? 'italic ' : ''}${w} ${sizePx.toFixed(2)}px ${fam}, sans-serif`;
}

// Espaciado de letras aproximado para OpenLayers (inserta espacios finos)
export function spacedText(text, letterSpacing) {
  if (!text) return '';
  if (!(letterSpacing > 0)) return text;
  const n = Math.max(1, Math.round(letterSpacing / 0.12));
  const sp = ' '.repeat(n);
  return text.split('\n').map((line) => Array.from(line).join(sp)).join('\n');
}

const CLASS_LABEL = {
  mar: { italic: true, upper: true, spacing: 0.35, color: '#3f7fb3', scale: 1.25 },
  pasaje: { italic: true, upper: true, spacing: 0.3, color: '#3f7fb3', scale: 1.1 },
  estrecho: { italic: true, upper: false, spacing: 0.05, color: '#3f7fb3', scale: 0.9 },
  bahia: { italic: true, upper: false, spacing: 0, color: '#3f7fb3', scale: 0.85 },
  peninsula: { italic: false, upper: true, spacing: 0.25, color: '#33414d', scale: 1.05 },
  archipielago: { italic: false, upper: true, spacing: 0.15, color: '#33414d', scale: 0.95 },
  isla: { italic: false, upper: false, spacing: 0, color: '#2b3843', scale: 0.85 },
  barrera: { italic: true, upper: false, spacing: 0.08, color: '#4f7f99', scale: 0.95 },
  region: { italic: false, upper: true, spacing: 0.4, color: '#5a6670', scale: 1.15, bold: true },
  polo: { italic: false, upper: false, spacing: 0, color: '#1d2b38', scale: 1, bold: true },
};
export function classLabelStyle(cls) { return CLASS_LABEL[cls] || CLASS_LABEL.isla; }

// ---------- funciones de estilo de capas vectoriales ----------
// ctx: { pxPerMm (px CSS por mm de papel), pixelRatio }
export function makeVectorStyleFn(getLayerState, def, ctx) {
  const cache = new Map();
  let cacheVersion = -1;
  let cacheScale = -1;
  return function styleFn(feature) {
    const layerState = getLayerState();
    if (!layerState) return null;
    const st = layerState.style;
    if (layerState._styleVersion !== cacheVersion || ctx.pxPerMm !== cacheScale) {
      cache.clear(); cacheVersion = layerState._styleVersion; cacheScale = ctx.pxPerMm;
    }
    const pxPerPt = ctx.pxPerMm * PT_MM;
    const geomType = feature.getGeometry() ? feature.getGeometry().getType() : 'Point';
    const cat = st.categorize && st.categorize.field ? feature.get(st.categorize.field) : undefined;
    const catColor = cat !== undefined && st.categorize.values ? st.categorize.values[cat] : undefined;
    if (st.categorize && st.categorize.field && st.categorize.hideOthers && catColor === undefined) return null;
    const lab = st.label || {};
    let text = '';
    let labelCfg = lab;
    if (lab.show && lab.field) {
      const v = feature.get(lab.field);
      text = v == null ? '' : String(v);
      if (lab.byClass) {
        const cl = classLabelStyle(feature.get('clase'));
        labelCfg = { ...lab, italic: cl.italic, bold: cl.bold || lab.bold, uppercase: cl.upper, letterSpacing: cl.spacing, color: cl.color, size: lab.size * cl.scale };
      }
      if (labelCfg.uppercase) text = text.toLocaleUpperCase('es');
      if (lab.prefixRemove) text = text.replace(/^(Base|Isla)\s+/i, '');
    }
    const key = `${geomType}|${catColor || ''}|${text}|${feature.get('clase') || ''}`;
    if (cache.has(key)) return cache.get(key);
    const styles = [];
    const isPoint = geomType === 'Point' || geomType === 'MultiPoint';
    const isLine = geomType === 'LineString' || geomType === 'MultiLineString';
    if (isPoint) {
      const p = { ...st.point };
      if (catColor) p.fill = catColor;
      if (p.shape !== 'none' && p.size > 0) {
        styles.push(new Style({
          renderer(coords, state) {
            const pr = state.pixelRatio;
            const draw = (c) => drawSymbol(state.context, c[0], c[1], p, pxPerPt * pr);
            if (Array.isArray(coords[0])) coords.forEach(draw); else draw(coords);
          },
        }));
      }
    } else if (isLine) {
      const l = st.line;
      const w = l.width * pxPerPt;
      styles.push(new Style({
        stroke: new Stroke({ color: rgba(catColor || l.color, l.opacity == null ? 1 : l.opacity), width: w, lineDash: dashArray(l.dash, w, pxPerPt * 0.6), lineCap: dashCap(l.dash), lineJoin: 'round' }),
      }));
    } else {
      const pg = st.polygon;
      const fillColor = catColor || pg.fill;
      const sw = pg.strokeWidth * pxPerPt;
      if (pg.fillOpacity > 0) styles.push(new Style({ fill: new Fill({ color: rgba(fillColor, pg.fillOpacity) }) }));
      if (pg.pattern && pg.pattern !== 'none') {
        const pat = getPattern(pg.pattern, rgba(pg.patternColor, 1), pg.patternSpacing * ctx.pxPerMm * ctx.pixelRatio, (pg.patternWidth || 0.25) * pxPerPt * ctx.pixelRatio);
        if (pat) styles.push(new Style({ fill: new Fill({ color: pat }) }));
      }
      if (sw > 0 && pg.strokeOpacity > 0) {
        styles.push(new Style({ stroke: new Stroke({ color: rgba(pg.stroke, pg.strokeOpacity), width: sw, lineDash: dashArray(pg.dash, sw, pxPerPt * 0.6), lineCap: dashCap(pg.dash), lineJoin: 'round' }) }));
      }
    }
    if (text) {
      const sizePx = labelCfg.size * pxPerPt;
      styles.push(new Style({
        text: new Text({
          text: spacedText(text, labelCfg.letterSpacing),
          font: fontString({ font: labelCfg.font, sizePx, bold: labelCfg.bold, italic: labelCfg.italic }),
          fill: new Fill({ color: labelCfg.color }),
          stroke: labelCfg.haloWidth > 0 ? new Stroke({ color: labelCfg.halo, width: labelCfg.haloWidth * pxPerPt * 2 }) : undefined,
          offsetX: (labelCfg.offsetX || 0) * pxPerPt,
          offsetY: isPoint ? (labelCfg.offsetY || 0) * pxPerPt : 0,
          placement: isLine && lab.alongLine ? 'line' : 'point',
          overflow: true,
          textAlign: 'center',
          padding: [1, 1, 1, 1],
        }),
      }));
    }
    cache.set(key, styles);
    return styles;
  };
}
