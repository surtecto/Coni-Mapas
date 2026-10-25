// Importación de datos propios: GeoJSON, KML, GPX, CSV y Shapefile (.zip)
import GeoJSON from 'ol/format/GeoJSON.js';
import KML from 'ol/format/KML.js';
import GPX from 'ol/format/GPX.js';
import shp from 'shpjs';
import { readFileAs, parseCoordValue } from '../util.js';
import { ensureProjection } from '../projections.js';

const gj = new GeoJSON();

export function parseCSV(text) {
  const first = text.split(/\r?\n/)[0] || '';
  const delim = [';', '\t', ','].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  const header = (rows.shift() || []).map((h) => h.trim());
  return { header, rows: rows.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] || '').trim()]))) };
}

export function detectLatLon(header) {
  const low = header.map((h) => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
  const find = (re) => { const i = low.findIndex((h) => re.test(h)); return i >= 0 ? header[i] : null; };
  return {
    lat: find(/^(lat|latitud|latitude|y|lat_gd|latitud_gd)$/) || find(/lat/),
    lon: find(/^(lon|long|lng|longitud|longitude|x|long_gd|lon_gd)$/) || find(/lon|lng/),
    name: find(/^(nombre|name|sitio|site|localidad|id|colonia)$/) || find(/nombre|name|sitio|site/),
    cat: find(/^(categoria|category|especie|species|tipo|type|grupo|group)$/) || find(/categ|especie|species|tipo/),
  };
}

export function csvToGeoJSON(text) {
  const { header, rows } = parseCSV(text);
  const cols = detectLatLon(header);
  if (!cols.lat || !cols.lon) throw new Error('No encontré columnas de latitud y longitud (lat/lon, latitud/longitud).');
  const features = [];
  for (const r of rows) {
    const lat = parseCoordValue(r[cols.lat]);
    const lon = parseCoordValue(r[cols.lon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    features.push({ type: 'Feature', properties: { ...r }, geometry: { type: 'Point', coordinates: [lon, lat] } });
  }
  return { geojson: { type: 'FeatureCollection', features }, cols, header };
}

function crsOf(obj) {
  const n = obj && obj.crs && obj.crs.properties && obj.crs.properties.name;
  if (!n) return 'EPSG:4326';
  const m = /EPSG:{1,2}(\d+)/.exec(n);
  if (m) return `EPSG:${m[1]}`;
  if (/CRS84/.test(n)) return 'EPSG:4326';
  return 'EPSG:4326';
}

export async function fileToGeoJSON(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.zip')) {
    const buf = await readFileAs(file, 'buffer');
    const res = await shp(buf);
    const arr = Array.isArray(res) ? res : [res];
    return arr.map((g, i) => ({ name: g.fileName || `${file.name.replace(/\.zip$/i, '')}${arr.length > 1 ? ' ' + (i + 1) : ''}`, geojson: g }));
  }
  const text = await readFileAs(file, 'text');
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
    return [{ name: file.name, geojson: csvToGeoJSON(text).geojson }];
  }
  if (name.endsWith('.kml')) {
    const feats = new KML({ extractStyles: false }).readFeatures(text, { featureProjection: 'EPSG:4326' });
    return [{ name: file.name, geojson: gj.writeFeaturesObject(feats) }];
  }
  if (name.endsWith('.gpx')) {
    const feats = new GPX().readFeatures(text, { featureProjection: 'EPSG:4326' });
    return [{ name: file.name, geojson: gj.writeFeaturesObject(feats) }];
  }
  const obj = JSON.parse(text);
  const crs = crsOf(obj);
  if (crs !== 'EPSG:4326') {
    const code = ensureProjection(crs);
    if (code !== crs) throw new Error(`El sistema de coordenadas ${crs} no está disponible. Reproyectá el archivo a WGS 84 (EPSG:4326).`);
    const feats = gj.readFeatures(obj, { dataProjection: crs, featureProjection: 'EPSG:4326' });
    return [{ name: file.name, geojson: gj.writeFeaturesObject(feats) }];
  }
  return [{ name: file.name, geojson: obj.type === 'Feature' ? { type: 'FeatureCollection', features: [obj] } : obj }];
}
