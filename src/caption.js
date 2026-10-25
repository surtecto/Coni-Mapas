// Epígrafe científico: proyección, datum, sitios y fuentes de las capas visibles
import { getDef } from './catalog.js';
import { projInfo } from './projections.js';
import { formatDMS } from './util.js';

const PROJ_SHORT = {
  'EPSG:3031': 'WGS 84 / estereográfica polar antártica (EPSG:3031)',
  'CONI:BICONT': 'Lambert acimutal equivalente centrada en 40°S 60°O (bicontinental IGN), WGS 84',
  'EPSG:6932': 'WGS 84 / Lambert acimutal equivalente polar sur (EPSG:6932)',
  'EPSG:32721': 'WGS 84 / UTM zona 21S (EPSG:32721)',
  'EPSG:32720': 'WGS 84 / UTM zona 20S (EPSG:32720)',
  'EPSG:3857': 'WGS 84 / Pseudo-Mercator (EPSG:3857)',
  'EPSG:4326': 'coordenadas geográficas WGS 84 (EPSG:4326)',
};

export function visibleDefs(state) {
  const seen = new Set();
  const defs = [];
  const insetOverrides = state.insets.flatMap((z) => Object.entries(z.layers || {}).filter(([, v]) => v === true).map(([k]) => k));
  for (const ls of state.layers) {
    if (!ls.visible && !insetOverrides.includes(ls.uid)) continue;
    const d = ls.def === 'user' ? { cite: `${ls.name} (datos propios)`, attribution: ls.name } : getDef(ls.def);
    if (!d || !d.cite) continue;
    if (seen.has(d.cite)) continue;
    seen.add(d.cite);
    defs.push(d);
  }
  return defs;
}

export function sourcesShort(state) {
  const set = new Set(visibleDefs(state).map((d) => d.attribution).filter(Boolean));
  return Array.from(set).join('; ');
}

export function buildCaption(state) {
  const parts = [];
  const c = state.caption || {};
  if (c.figure) parts.push(`${c.figure}.`);
  if (c.lead) parts.push(c.lead.trim().replace(/\.?$/, '.'));
  if (c.withSites !== false && state.sites.length) {
    const s = state.sites.map((x) => {
      const note = c.withNotes && x.note ? `, ${x.note}` : '';
      return `${x.name} (${formatDMS(x.lat, true, { seconds: false })}, ${formatDMS(x.lon, false, { seconds: false })}${note})`;
    });
    parts.push(`Sitios: ${s.join('; ')}.`);
  }
  const usedProj = new Set([state.projection, ...state.insets.filter((z) => z.projection && z.projection !== 'same').map((z) => z.projection)]);
  const projTxt = Array.from(usedProj).map((p) => PROJ_SHORT[p] || projInfo(p).name).join('; recuadro: ');
  parts.push(`Proyección: ${projTxt}.`);
  const cites = visibleDefs(state).map((d) => d.cite.replace(/\.$/, ''));
  if (cites.length) parts.push(`Fuentes: ${cites.join('; ')}.`);
  return parts.join(' ');
}
