// Fábrica de capas OpenLayers a partir del estado
import TileLayer from 'ol/layer/Tile.js';
import ImageLayer from 'ol/layer/Image.js';
import VectorLayer from 'ol/layer/Vector.js';
import XYZ from 'ol/source/XYZ.js';
import TileWMS from 'ol/source/TileWMS.js';
import TileArcGISRest from 'ol/source/TileArcGISRest.js';
import VectorSource from 'ol/source/Vector.js';
import RasterSource from 'ol/source/Raster.js';
import TileGrid from 'ol/tilegrid/TileGrid.js';
import { createXYZ, extentFromProjection } from 'ol/tilegrid.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import EsriJSON from 'ol/format/EsriJSON.js';
import { bbox as bboxStrategy } from 'ol/loadingstrategy.js';
import { transformExtent } from 'ol/proj.js';
import { getRenderPixel } from 'ol/render.js';
import { getDef, RAMPS } from './catalog.js';
import { EMBEDDED } from './embedded.js';
import { makeVectorStyleFn } from './styles.js';
import { hexToRgb } from './util.js';
import { lonLatTo, metersPerUnit } from './projections.js';

const geojson = new GeoJSON();
const esrijson = new EsriJSON();

// ---------- caché de datos ----------
const dataCache = new Map(); // url -> Promise<GeoJSON object>
export function fetchGeoJSON(url) {
  if (EMBEDDED[url]) return Promise.resolve(EMBEDDED[url]);
  if (!dataCache.has(url)) {
    const p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    p.catch(() => dataCache.delete(url));
    dataCache.set(url, p);
  }
  return dataCache.get(url);
}

export function wfsUrl(def) {
  const p = new URLSearchParams({
    service: 'WFS', version: '1.1.0', request: 'GetFeature', typeName: def.typeName,
    outputFormat: 'application/json', srsName: 'EPSG:4326', bbox: `${def.bbox},EPSG:4326`,
  });
  return `${def.url}?${p.toString()}`;
}

// ---------- geometrías de referencia ----------
export function obliquityDeg(date = new Date()) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  return 23.439279444 - 0.013010213 * T - 5.086e-8 * T * T + 5.565e-7 * T * T * T;
}

export function generatedGeoJSON(gen, projCode) {
  const minLat = projCode === 'EPSG:3857' ? -85 : -90;
  const feats = [];
  if (gen === 'sector') {
    const ring = [];
    for (let lon = -74; lon <= -25; lon += 0.5) ring.push([lon, -60]);
    for (let lat = -60.5; lat >= minLat; lat -= 0.5) ring.push([-25, lat]);
    for (let lon = -25.5; lon >= -74; lon -= 0.5) ring.push([lon, minLat]);
    for (let lat = minLat + 0.5; lat <= -60; lat += 0.5) ring.push([-74, lat]);
    ring.push(ring[0]);
    feats.push({ type: 'Feature', properties: { nombre: 'Sector Antártico Argentino' }, geometry: { type: 'Polygon', coordinates: [ring] } });
  } else if (gen === 'parallel60' || gen === 'polarCircle') {
    const lat = gen === 'parallel60' ? -60 : -(90 - obliquityDeg());
    const line = [];
    if (projCode === 'EPSG:3857' || projCode === 'EPSG:4326') {
      for (let lon = -180; lon <= 180; lon += 1) line.push([lon, lat]);
    } else {
      for (let lon = -180; lon <= 180; lon += 0.5) line.push([lon, lat]);
    }
    feats.push({ type: 'Feature', properties: { nombre: gen === 'parallel60' ? 'Paralelo 60°S' : 'Círculo Polar Antártico', lat }, geometry: { type: 'LineString', coordinates: line } });
  }
  return { type: 'FeatureCollection', features: feats };
}

export function sectorRingLonLat(projCode) {
  return generatedGeoJSON('sector', projCode).features[0].geometry.coordinates[0];
}

function readFeatures(obj, projCode) {
  const feats = geojson.readFeatures(obj, { dataProjection: 'EPSG:4326', featureProjection: projCode });
  if (projCode === 'EPSG:3857') {
    // descarta geometrías que se van a infinito cerca del polo
    return feats.filter((f) => {
      const g = f.getGeometry();
      if (!g) return false;
      const e = g.getExtent();
      return e.every((v) => Number.isFinite(v));
    });
  }
  return feats;
}

// ---------- fuentes ráster compartidas ----------
const rasterSources = new Map();
function cacheKey(ls, extra = '') { return `${ls.uid}:${ls.rev}:${extra}`; }

const IGN_WMS_PROJ = ['EPSG:3857', 'EPSG:3031', 'EPSG:4326', 'EPSG:6932', 'EPSG:32720', 'EPSG:32721'];

function wmsRequestProjection(def, mapProj) {
  const list = def.wmsProjections || IGN_WMS_PROJ;
  if (list.includes(mapProj)) return mapProj;
  if (list.includes('EPSG:3031') && /^CONI:/.test(mapProj)) return 'EPSG:4326';
  return list.includes('EPSG:4326') ? 'EPSG:4326' : list[0];
}

function makeTileGrid(g) {
  return new TileGrid({ origin: g.origin, resolutions: g.resolutions, tileSize: g.tileSize, extent: g.extent });
}

function getRasterSource(ls, def, mctx) {
  const mapProj = mctx.projection;
  if (def.type === 'xyz') {
    const key = cacheKey(ls, 'xyz');
    if (!rasterSources.has(key)) {
      rasterSources.set(key, new XYZ({
        url: def.url, projection: def.projection || 'EPSG:3857', crossOrigin: 'anonymous', maxZoom: def.maxZoom || 19,
        tileGrid: def.tileGrid ? makeTileGrid(def.tileGrid) : undefined, attributions: def.attribution, transition: 0,
      }));
    }
    return rasterSources.get(key);
  }
  if (def.type === 'gibs-date') {
    const date = (ls.params && ls.params.date) || '2026-01-15';
    const polar = mapProj !== 'EPSG:3857' && mapProj !== 'EPSG:4326' && !/^EPSG:327/.test(mapProj);
    const key = cacheKey(ls, `gibs|${date}|${polar}`);
    if (!rasterSources.has(key)) {
      const src = polar
        ? new XYZ({ url: `https://gibs.earthdata.nasa.gov/wmts/epsg3031/best/${def.layer}/default/${date}/250m/{z}/{y}/{x}.jpg`, projection: 'EPSG:3031', tileGrid: makeTileGrid(def.tileGrid), crossOrigin: 'anonymous', attributions: def.attribution, transition: 0 })
        : new XYZ({ url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${def.layer}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`, projection: 'EPSG:3857', maxZoom: 9, crossOrigin: 'anonymous', attributions: def.attribution, transition: 0 });
      rasterSources.set(key, src);
    }
    return rasterSources.get(key);
  }
  if (def.type === 'wms') {
    const reqProj = wmsRequestProjection(def, mapProj);
    const key = cacheKey(ls, `wms|${reqProj}`);
    if (!rasterSources.has(key)) {
      rasterSources.set(key, new TileWMS({
        url: def.url, params: { LAYERS: def.layers, FORMAT: 'image/png', TRANSPARENT: true, VERSION: '1.3.0', STYLES: '' },
        projection: reqProj, crossOrigin: 'anonymous', attributions: def.attribution, tileGrid: undefined, transition: 0, gutter: 0,
      }));
    }
    return rasterSources.get(key);
  }
  if (def.type === 'arcgis-image') {
    const reqProj = /^EPSG:(3031|3857|6932|32720|32721)$/.test(mapProj) ? mapProj : 'EPSG:3031';
    const fn = (ls.params && ls.params.fn) || def.functions[0][0];
    const key = cacheKey(ls, `img|${reqProj}|${fn}`);
    if (!rasterSources.has(key)) {
      rasterSources.set(key, new TileArcGISRest({
        url: def.url, params: { renderingRule: JSON.stringify({ rasterFunction: fn }), format: 'png32', interpolation: 'RSP_BilinearInterpolation' }, projection: reqProj,
        crossOrigin: 'anonymous', attributions: def.attribution, transition: 0,
        tileGrid: createXYZ({ extent: extentFromProjection(reqProj), tileSize: 512, maxZoom: 22 }),
      }));
    }
    return rasterSources.get(key);
  }
  if (def.type === 'arcgis') {
    const reqProj = /^EPSG:(3031|3857|6932|32720|32721)$/.test(mapProj) ? mapProj : 'EPSG:3031';
    const key = cacheKey(ls, `arcgis|${reqProj}`);
    if (!rasterSources.has(key)) {
      rasterSources.set(key, new TileArcGISRest({
        url: def.url, params: { ...def.params }, projection: reqProj,
        crossOrigin: 'anonymous', attributions: def.attribution, transition: 0,
      }));
    }
    return rasterSources.get(key);
  }
  return null;
}

// ---------- DEM analítico ----------
function rampTable(rampId) {
  const r = RAMPS[rampId] || RAMPS.hipsometrica;
  const conv = (stops) => stops.map(([t, c]) => [t, ...hexToRgb(c)]);
  return r.all ? { all: conv(r.all) } : { sea: conv(r.sea), land: conv(r.land) };
}

function demOperation(inputs, data) {
  const img = inputs[0];
  const w = img.width, h = img.height, src = img.data;
  const out = new Uint8ClampedArray(src.length);
  const n = w * h;
  const el = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    el[i] = src[o + 3] === 0 ? NaN : src[o] * 256 + src[o + 1] + src[o + 2] / 256 - 32768;
  }
  function lerpStops(stops, t) {
    if (t <= stops[0][0]) return stops[0];
    for (let k = 1; k < stops.length; k++) {
      if (t <= stops[k][0]) {
        const a = stops[k - 1], b = stops[k];
        const f = (t - a[0]) / (b[0] - a[0] || 1);
        return [t, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
      }
    }
    return stops[stops.length - 1];
  }
  const dp = data.mPerPx * 2;
  const az = (data.azimuth * Math.PI) / 180, alt = (data.altitude * Math.PI) / 180;
  const zf = data.zFactor;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, o = i * 4;
      const z = el[i];
      if (Number.isNaN(z)) { out[o + 3] = 0; continue; }
      let c;
      if (data.ramp.all) {
        const t = (z - data.min) / (data.max - data.min);
        c = lerpStops(data.ramp.all, Math.max(0, Math.min(1, t)));
      } else if (z < 0) {
        const t = data.min < 0 ? (z - data.min) / (0 - data.min) : 1;
        c = lerpStops(data.ramp.sea, Math.max(0, Math.min(1, t)));
      } else {
        const t = data.max > 0 ? z / data.max : 0;
        c = lerpStops(data.ramp.land, Math.max(0, Math.min(1, t)));
      }
      let r = c[1], g = c[2], b = c[3];
      if (data.shade && dp > 0) {
        const xl = x > 0 ? el[i - 1] : z, xr = x < w - 1 ? el[i + 1] : z;
        const yu = y > 0 ? el[i - w] : z, yd = y < h - 1 ? el[i + w] : z;
        const dzdx = ((Number.isNaN(xr) ? z : xr) - (Number.isNaN(xl) ? z : xl)) / dp;
        const dzdy = ((Number.isNaN(yu) ? z : yu) - (Number.isNaN(yd) ? z : yd)) / dp;
        const slope = Math.atan(zf * Math.sqrt(dzdx * dzdx + dzdy * dzdy));
        const aspect = Math.atan2(dzdy, -dzdx);
        let cosInc = Math.sin(alt) * Math.cos(slope) + Math.cos(alt) * Math.sin(slope) * Math.cos(az - Math.PI / 2 - aspect);
        cosInc = Math.max(0, cosInc);
        const k = 1 - data.shadeStrength + data.shadeStrength * cosInc * 1.25;
        r *= k; g *= k; b *= k;
      }
      out[o] = r; out[o + 1] = g; out[o + 2] = b;
      out[o + 3] = data.transparentSea && z < 0 ? 0 : 255;
    }
  }
  return { data: out, width: w, height: h };
}

function buildDemLayer(ls, def, mctx, className) {
  const key = cacheKey(ls, 'terrarium');
  let elev = rasterSources.get(key);
  if (!elev) {
    elev = new XYZ({ url: def.url, projection: 'EPSG:3857', maxZoom: def.maxZoom || 13, crossOrigin: 'anonymous', interpolate: false, transition: 0, attributions: def.attribution });
    rasterSources.set(key, elev);
  }
  const raster = new RasterSource({ sources: [elev], operationType: 'image', operation: demOperation, threads: 0 });
  raster.on('beforeoperations', (e) => {
    const cur = mctx.getLayerState(ls.uid) || ls;
    const p = cur.params || {};
    const view = mctx.map && mctx.map.getView();
    let mPer = 1;
    try { mPer = metersPerUnit(mctx.projection, view.getCenter()); } catch (err) { mPer = 1; }
    e.data.mPerPx = e.resolution * mPer;
    e.data.ramp = rampTable(p.ramp);
    e.data.min = Number(p.min); e.data.max = Number(p.max);
    e.data.shade = !!p.shade; e.data.azimuth = Number(p.azimuth); e.data.altitude = Number(p.altitude);
    e.data.zFactor = Number(p.zFactor); e.data.shadeStrength = Number(p.shadeStrength);
    e.data.transparentSea = !!p.transparentSea;
  });
  return new ImageLayer({ source: raster, className });
}

// ---------- capas vectoriales ----------
function vectorSourceFromPromise(promiseFactory, projCode, onError) {
  const src = new VectorSource({ wrapX: false });
  src._loading = true;
  promiseFactory().then((obj) => {
    src.addFeatures(readFeatures(obj, projCode));
    src._loading = false;
    src.dispatchEvent('cm-loaded');
  }).catch((err) => {
    src._loading = false;
    src._error = err;
    if (onError) onError(err);
    src.dispatchEvent('cm-error');
  });
  return src;
}

const vectorSources = new Map();
function getStaticVectorSource(ls, def, mctx) {
  const proj = mctx.projection;
  let key, factory;
  if (def.type === 'geojson') { key = `${def.url}|${proj}`; factory = () => fetchGeoJSON(def.url); }
  else if (def.type === 'wfs') { const u = wfsUrl(def); key = `${u}|${proj}`; factory = () => fetchGeoJSON(u); }
  else if (def.type === 'geojson-multi') {
    key = `${def.id}|${proj}`;
    factory = () => Promise.all(def.urls.map((u) => fetchGeoJSON(u))).then((arr) => ({ type: 'FeatureCollection', features: arr.flatMap((g) => g.features || []) }));
  }
  else if (def.type === 'generated') { key = `gen:${def.gen}|${proj}`; factory = () => Promise.resolve(generatedGeoJSON(def.gen, proj)); }
  else return null;
  if (!vectorSources.has(key)) vectorSources.set(key, vectorSourceFromPromise(factory, proj, (e) => mctx.onLayerError && mctx.onLayerError(ls, e)));
  return vectorSources.get(key);
}

// Costa ADD: carga por extensión con generalización según la escala
function buildEsriFeatureSource(ls, def, mctx) {
  const src = new VectorSource({
    wrapX: false,
    strategy: bboxStrategy,
    loader(extent, resolution, projection, success, failure) {
      const pr = mctx.pixelRatio || 1;
      const center = mctx.map ? mctx.map.getView().getCenter() : [0, 0];
      let mPerPx = resolution;
      try { mPerPx = resolution * metersPerUnit(mctx.projection, center); } catch (e) { /* noop */ }
      mPerPx /= pr;
      const useHigh = mPerPx < 120;
      const url = useHigh ? def.urls.high : def.urls.medium;
      let ext3031;
      try { ext3031 = transformExtent(extent, projection, 'EPSG:3031', 16); } catch (e) { ext3031 = [-4.5e6, -4.5e6, 4.5e6, 4.5e6]; }
      const lim = 4.6e6;
      ext3031 = [Math.max(-lim, ext3031[0]), Math.max(-lim, ext3031[1]), Math.min(lim, ext3031[2]), Math.min(lim, ext3031[3])];
      if (!(ext3031[2] > ext3031[0] && ext3031[3] > ext3031[1]) || ext3031.some((v) => !Number.isFinite(v))) { success([]); return; }
      const offset = Math.max(1, mPerPx * 0.6);
      const outSR = /^EPSG:(3031|3857|32720|32721|6932)$/.test(mctx.projection) ? mctx.projection.split(':')[1] : '4326';
      const fetchPage = async (offsetIdx) => {
        const p = new URLSearchParams({
          where: '1=1', geometry: ext3031.join(','), geometryType: 'esriGeometryEnvelope', inSR: '3031', spatialRel: 'esriSpatialRelIntersects',
          outFields: 'surface', outSR, maxAllowableOffset: String(outSR === '4326' ? offset / 111000 : offset), f: 'json',
          resultOffset: String(offsetIdx), resultRecordCount: '2000',
        });
        const r = await fetch(`${url}/query?${p.toString()}`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      };
      src._pend = (src._pend || 0) + 1;
      src._loading = true;
      (async () => {
        try {
          let all = [];
          let off = 0;
          for (let guard = 0; guard < 12; guard++) {
            const j = await fetchPage(off);
            if (j.error) throw new Error(j.error.message);
            const feats = esrijson.readFeatures(j, { dataProjection: outSR === '4326' ? 'EPSG:4326' : `EPSG:${outSR}`, featureProjection: mctx.projection });
            all = all.concat(feats);
            if (!j.exceededTransferLimit) break;
            off += (j.features || []).length || 2000;
          }
          src.addFeatures(all);
          success(all);
        } catch (err) {
          if (mctx.onLayerError) mctx.onLayerError(ls, err);
          failure();
        } finally {
          src._pend -= 1;
          src._loading = src._pend > 0;
        }
      })();
    },
  });
  // Recarga al cambiar mucho la escala (otra generalización / otra resolución de costa)
  let lastRes = null;
  src._onResolution = (res) => {
    if (lastRes && Math.abs(Math.log2(res / lastRes)) < 1.2) return;
    const first = lastRes === null;
    lastRes = res;
    if (!first) src.refresh();
  };
  return src;
}

// ---------- sitios ----------
export function siteSymbolCfg(site, st) {
  const ss = st.siteStyle;
  const cats = (site.cats || []).map((id) => st.categories.find((c) => c.id === id)).filter(Boolean);
  const colors = cats.length ? cats.map((c) => c.color) : [site.color || '#555555'];
  return { shape: site.shape || ss.shape, size: site.size || ss.size, fill: colors[0], colors, multi: ss.multi, fillOpacity: ss.fillOpacity, stroke: ss.stroke, strokeWidth: ss.strokeWidth, strokeOpacity: ss.strokeOpacity };
}

// ---------- capas importadas ----------
function buildUserLayer(ls, mctx) {
  const key = `user:${ls.uid}:${ls.rev}|${mctx.projection}`;
  if (!vectorSources.has(key)) {
    const src = new VectorSource({ wrapX: false });
    try { src.addFeatures(readFeatures(ls.data, mctx.projection)); } catch (e) { if (mctx.onLayerError) mctx.onLayerError(ls, e); }
    vectorSources.set(key, src);
  }
  return vectorSources.get(key);
}

// ---------- recorte por Sector Antártico ----------
function landClipPath(ctx, e, mctx) {
  // recorta a los polígonos de la costa SCAR ADD presentes en este mapa
  let src = null;
  for (const [uid, l] of mctx.olLayers) {
    const st = mctx.getLayerState(uid);
    if (st && st.def === 'add-costa' && l.getSource) { src = l.getSource(); break; }
  }
  if (!src) return false;
  const c2p = e.frameState.coordinateToPixelTransform;
  const inv = e.inversePixelTransform;
  const toPx = (c) => {
    const x = c2p[0] * c[0] + c2p[2] * c[1] + c2p[4], y = c2p[1] * c[0] + c2p[3] * c[1] + c2p[5];
    return [inv[0] * x + inv[2] * y + inv[4], inv[1] * x + inv[3] * y + inv[5]];
  };
  ctx.beginPath();
  const feats = src.getFeaturesInExtent(e.frameState.extent);
  for (const f of feats) {
    const g = f.getGeometry();
    if (!g) continue;
    const polys = g.getType() === 'MultiPolygon' ? g.getCoordinates() : g.getType() === 'Polygon' ? [g.getCoordinates()] : [];
    for (const poly of polys) {
      for (const ring of poly) {
        ring.forEach((c, i) => { const p = toPx(c); if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.closePath();
      }
    }
  }
  ctx.clip('evenodd');
  return true;
}

function attachClip(layer, ls, mctx) {
  layer.on('prerender', (e) => {
    const cur = mctx.getLayerState(ls.uid) || ls;
    layer._clipped = false;
    if (!cur.clip || cur.clip === 'none' || !mctx.map) return;
    const ctx = e.context;
    ctx.save();
    layer._clipped = true;
    if (cur.clip === 'land') {
      if (!landClipPath(ctx, e, mctx)) { ctx.restore(); layer._clipped = false; }
      return;
    }
    ctx.beginPath();
    const ring = sectorRingLonLat(mctx.projection);
    ring.forEach((ll, i) => {
      const px = mctx.map.getPixelFromCoordinate(lonLatTo(mctx.projection, ll));
      if (!px) return;
      const rp = getRenderPixel(e, px);
      if (i === 0) ctx.moveTo(rp[0], rp[1]); else ctx.lineTo(rp[0], rp[1]);
    });
    ctx.closePath();
    if (cur.clip === 'outside') {
      ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.clip('evenodd');
    } else ctx.clip();
  });
  layer.on('postrender', (e) => {
    if (layer._clipped) { e.context.restore(); layer._clipped = false; }
  });
}

// ---------- fábrica principal ----------
export function buildOlLayer(ls, mctx) {
  const def = ls.def === 'user' ? { kind: 'vector', type: 'user' } : getDef(ls.def);
  if (!def) return null;
  let layer = null;
  const getLs = () => mctx.getLayerState(ls.uid);
  const className = `cm-layer cm-${ls.uid}`;
  const decl = !!(ls.style && ls.style.label && ls.style.label.show && ls.style.label.declutter);
  if (def.type === 'graticule') {
    return null; // la grilla se dibuja como vector en la capa de composición
  } else if (def.kind === 'raster') {
    if (def.type === 'terrarium') layer = buildDemLayer(ls, def, mctx, className);
    else {
      const src = getRasterSource(ls, def, mctx);
      if (!src) return null;
      layer = new TileLayer({ source: src, preload: 0, className });
    }
  } else if (def.type === 'esri-feature') {
    const src = buildEsriFeatureSource(ls, def, mctx);
    layer = new VectorLayer({ source: src, style: makeVectorStyleFn(getLs, def, mctx), declutter: false, className });
    layer._esriSource = src;
  } else if (def.type === 'user') {
    const src = buildUserLayer(ls, mctx);
    layer = new VectorLayer({ source: src, style: makeVectorStyleFn(getLs, def, mctx), declutter: decl, className });
  } else if (def.kind === 'vector') {
    const src = getStaticVectorSource(ls, def, mctx);
    if (!src) return null;
    layer = new VectorLayer({ source: src, style: makeVectorStyleFn(getLs, def, mctx), declutter: decl, className });
  }
  if (!layer) return null;
  layer.set('cmUid', ls.uid);
  attachClip(layer, ls, mctx);
  return layer;
}

