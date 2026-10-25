// Plantillas de proyecto: los dos modelos de referencia y la figura de Coni (estrés oxidativo en pingüinos)
import { emptyState, newLayerState, newInset, newText, mergeDeep } from './state.js';
import { rotationForMeridian, registerProjections } from './projections.js';
import { uid } from './util.js';

const L = (id, over) => newLayerState(id, over);

function penguinCategories() {
  return [
    { id: 'adelia', name: 'Adelia', color: '#3176b1' },
    { id: 'emperador', name: 'Emperador', color: '#e29f2c' },
    { id: 'papua', name: 'Papúa', color: '#36a177' },
  ];
}

export function templateConi() {
  registerProjections();
  const s = emptyState();
  s.title = 'Sitios de muestreo de pingüinos 2025–2026';
  s.page = mergeDeep(s.page, { preset: 'custom', widthMM: 180, heightMM: 200, margins: { top: 6, right: 6, bottom: 9, left: 10 }, background: '#ffffff', frame: { show: true, color: '#1d1d1d', width: 0.6 } });
  s.projection = 'EPSG:3031';
  s.view = { center: [-58.6, -64.6], mpm: 11500, rotation: rotationForMeridian('EPSG:3031', -58) };
  s.page.background = '#d9e6ec';
  s.layers = [
    L('add-costa', { style: { polygon: { fill: '#f7f9fa', stroke: '#43525c', strokeWidth: 0.35 }, categorize: { field: 'surface', values: { land: '#f7f9fa', 'ice shelf': '#e4eef3', 'ice tongue': '#e4eef3', rumple: '#ecf2f5' } } } }),
    L('rema-relieve', { blend: 'multiply', opacity: 0.55 }),
    L('ne-paises', { style: { polygon: { fill: '#ece7db', stroke: '#6f6a5f', strokeWidth: 0.3 }, categorize: { field: 'iso', values: { ARG: '#e3dccb' } } } }),
    L('ign-zee', { visible: false }),
    L('ref-sector', { style: { polygon: { stroke: '#2b2b2b', strokeWidth: 0.7, dash: 'dashed' } }, legend: { show: true, label: 'Sector Antártico Argentino' } }),
    L('ref-60s', { visible: false }),
    L('ign-bases', { style: { point: { shape: 'square', size: 4, fill: '#ffffff', stroke: '#1d1d1d', strokeWidth: 0.6 }, label: { show: false } }, legend: { show: true, label: 'Bases antárticas argentinas' } }),
    L('graticule', { style: { line: { color: '#5a6b78', width: 0.3, opacity: 0.7, dash: 'solid' }, label: { show: true, mode: 'frame', size: 6, color: '#33424e', font: 'Source Sans 3', edges: 'classic', vertical: true }, interval: 'auto', intervalLon: 'auto' } }),
  ];
  s.categories = penguinCategories();
  s.paletteId = 'pinguinos';
  s.sites = [
    { id: uid('S'), name: 'Isla Cerro Nevado', lon: -57.27, lat: -64.48, cats: ['emperador'], label: { show: true, dx: 0, dy: -9, align: 'center' }, note: 'Colonia de pingüino emperador (octubre 2025, n = 7)' },
    { id: uid('S'), name: 'Península Potter', lon: -58.64, lat: -62.255, cats: ['adelia', 'papua'], label: { show: true, dx: 0, dy: -9, align: 'center' }, note: 'Isla 25 de Mayo (enero 2026; Adelia n = 9, papúa n = 16)' },
  ];
  s.siteStyle.size = 8.5;
  s.siteStyle.multi = 'pie';
  s.insets = [newInset({
    name: 'Zoom norte de la península', shape: 'circle', x: 92, y: 12, w: 78, h: 78,
    center: [-57.95, -63.37], mpm: 4300, bg: '#d9e6ec',
    border: { color: '#1d1d1d', width: 0.7, dash: 'dashed' },
    connector: { type: 'tangent', color: '#1d1d1d', width: 0.6, dash: 'dashed' },
    footprint: { show: true, color: '#1d1d1d', width: 0.6, dash: 'dashed', fill: '#ffffff', fillOpacity: 0 },
  })];
  s.legend = mergeDeep(s.legend, { x: 104, y: 158, title: 'Especies muestreadas', size: 7.5, titleSize: 8, symbolSize: 8, bgOpacity: 0.92 });
  s.north = mergeDeep(s.north, { x: 160, y: 136, size: 11, style: 'circle' });
  s.scalebar = mergeDeep(s.scalebar, { x: 16, y: 183, lengthMM: 34, style: 'alternating', segments: 4, units: 'km', showRF: false });
  s.texts = [
    newText({ text: 'Mar de Weddell', anchor: 'geo', lon: -50.5, lat: -69.5, font: 'Source Sans 3', size: 9, italic: true, uppercase: true, letterSpacing: 0.35, color: '#2f6f9f', halo: '#ffffff', haloWidth: 0.8 }),
    newText({ text: 'Pasaje Drake', anchor: 'geo', lon: -66, lat: -58.8, size: 8, italic: true, uppercase: true, letterSpacing: 0.3, color: '#2f6f9f', halo: '#ffffff', haloWidth: 0.8, rotation: -18 }),
    newText({ text: 'Península Antártica', anchor: 'geo', lon: -64.6, lat: -67.6, size: 7, uppercase: true, letterSpacing: 0.22, color: '#33414d', halo: '#ffffff', haloWidth: 0.9, rotation: -62 }),
    newText({ text: 'Islas Shetland del Sur', anchor: 'geo', lon: -62.3, lat: -61.95, size: 6.5, uppercase: true, letterSpacing: 0.1, color: '#33414d', halo: '#ffffff', haloWidth: 0.8, rotation: -14 }),
  ];
  s.caption = { figure: 'Figura 1', lead: 'Ubicación de los sitios de muestreo de pingüino emperador (isla Cerro Nevado, octubre de 2025) y de pingüinos Adelia y papúa (península Potter, isla 25 de Mayo, enero de 2026).' };
  return s;
}

export function templateModelo1() {
  registerProjections();
  const s = emptyState();
  s.title = 'Modelo 1: sector antártico con imagen satelital';
  s.page = mergeDeep(s.page, { preset: 'custom', widthMM: 180, heightMM: 195, margins: { top: 0, right: 0, bottom: 0, left: 0 }, background: '#ffffff', frame: { show: true, color: '#555555', width: 0.5 } });
  s.projection = 'EPSG:3031';
  s.view = { center: [-56.5, -63.2], mpm: 12500, rotation: rotationForMeridian('EPSG:3031', -56) };
  s.layers = [
    L('esri-antartida'),
    L('ign-plataforma', { style: { polygon: { fill: '#a9d8ee', fillOpacity: 0.35, stroke: '#a9e1ff', strokeWidth: 0.5, dash: 'dashdot' } }, legend: { show: false } }),
    L('ign-zee', { style: { polygon: { fill: '#a9d8ee', fillOpacity: 0.35, stroke: '#a9e1ff', strokeWidth: 0.5, dash: 'dashdot' } }, legend: { show: false } }),
    L('ref-sector', { style: { polygon: { stroke: '#3b3b3b', strokeWidth: 0.7, dash: 'solid' } }, legend: { show: false } }),
    L('graticule', { visible: false }),
  ];
  s.categories = [
    { id: 'c1', name: 'Base Esperanza', color: '#1747e8' },
    { id: 'c2', name: 'Base Marambio', color: '#f7e017' },
    { id: 'c3', name: 'Isla Cerro Nevado', color: '#ee1c1c' },
  ];
  s.paletteId = 'modelo1';
  s.sites = [
    { id: uid('S'), name: 'Base Esperanza', lon: -56.997, lat: -63.398, cats: ['c1'], label: { show: false } },
    { id: uid('S'), name: 'Base Marambio', lon: -56.625, lat: -64.241, cats: ['c2'], label: { show: false } },
    { id: uid('S'), name: 'Isla Cerro Nevado', lon: -57.25, lat: -64.5, cats: ['c3'], label: { show: false } },
  ];
  s.siteStyle = mergeDeep(s.siteStyle, { size: 7, stroke: '#1d1d1d', strokeWidth: 0.4, label: { show: false } });
  s.insets = [newInset({
    name: 'Zoom', shape: 'circle', x: 72, y: 9, w: 103, h: 103, center: [-57.0, -63.95], mpm: 1500, bg: '#5d8fa8',
    border: { color: '#111111', width: 0.6, dash: 'dashed' }, connector: { type: 'center', color: '#111111', width: 0.6, dash: 'dashed' },
    footprint: { show: true, color: '#111111', width: 0.6, dash: 'dashed', fill: '#ffffff', fillOpacity: 0 },
  })];
  s.legend = mergeDeep(s.legend, { x: 94, y: 148, title: '', size: 12, symbolSize: 8, color: '#ffffff', bold: true, bg: '#1d3a4c', bgOpacity: 0.72, border: '#1d3a4c', borderWidth: 0, radius: 2.5, padding: 4, gap: 3 });
  s.north = mergeDeep(s.north, { x: 160, y: 172, size: 13, style: 'circle' });
  s.scalebar = mergeDeep(s.scalebar, { show: false, x: 10, y: 186 });
  s.texts = [
    newText({ text: 'Islas Malvinas\n(Arg.)', anchor: 'geo', lon: -59.3, lat: -50.6, size: 6.5, color: '#3a3a3a', uppercase: true }),
    newText({ text: 'Pasaje Drake', anchor: 'geo', lon: -63.5, lat: -59.2, size: 7.5, color: '#7cc8f0', uppercase: true, rotation: -20 }),
    newText({ text: 'Islas Shetland\ndel Sur', anchor: 'geo', lon: -61.2, lat: -61.5, size: 6.5, color: '#3a3a3a', uppercase: true }),
    newText({ text: 'Mar de Weddell', anchor: 'geo', lon: -47, lat: -68.5, size: 8, color: '#7cc8f0', uppercase: true, letterSpacing: 0.9 }),
    newText({ text: 'Península Antártica', anchor: 'geo', lon: -64.5, lat: -69.2, size: 6.5, color: '#3a3a3a', uppercase: true, rotation: -70 }),
  ];
  s.caption = { figure: 'Figura 1', lead: 'Ubicación del área de estudio en el Sector Antártico Argentino.' };
  return s;
}

export function templateModelo2() {
  registerProjections();
  const s = emptyState();
  s.title = 'Modelo 2: vectorial plano bicontinental';
  s.page = mergeDeep(s.page, { preset: 'custom', widthMM: 180, heightMM: 172, margins: { top: 0, right: 0, bottom: 0, left: 0 }, background: '#f3f3f3', frame: { show: false, color: '#222222', width: 0.5 } });
  s.projection = 'CONI:BICONT';
  s.view = { center: [-44, -48], mpm: 36000, rotation: 0 };
  s.layers = [
    L('ne-paises', { style: { polygon: { fill: '#9ebebb', fillOpacity: 1, stroke: '#c9dad8', strokeWidth: 0.25 }, categorize: { field: 'iso', values: {} } }, legend: { show: false } }),
    L('add-costa', { style: { polygon: { fill: '#6aa39a', fillOpacity: 1, stroke: '#111111', strokeWidth: 0.35 }, categorize: { field: '', values: {} } }, legend: { show: false } }),
  ];
  s.categories = [
    { id: 'm1', name: 'Potter Peninsula', color: '#8ebdd9' },
    { id: 'm2', name: 'Esperanza/Hope Bay', color: '#f98f39' },
    { id: 'm3', name: 'Marambio Island', color: '#651368' },
  ];
  s.paletteId = 'modelo2';
  s.sites = [
    { id: uid('S'), name: 'Potter Peninsula', lon: -58.66, lat: -62.25, cats: ['m1'], label: { show: false } },
    { id: uid('S'), name: 'Esperanza/Hope Bay', lon: -57.0, lat: -63.39, cats: ['m2'], label: { show: false } },
    { id: uid('S'), name: 'Marambio Island', lon: -56.72, lat: -64.24, cats: ['m3'], label: { show: false } },
  ];
  s.siteStyle = mergeDeep(s.siteStyle, { size: 0, halo: { show: true, unit: 'km', km: 14, size: 22, fillOpacity: 0.38, strokeWidth: 2.6, dot: false }, label: { show: false } });
  s.insets = [newInset({
    name: 'Detalle', shape: 'circle', x: 58, y: 6, w: 116, h: 116, center: [-58.0, -63.25], mpm: 2400, bg: '#f3f3f3',
    border: { color: '#111111', width: 0.6, dash: 'solid' }, connector: { type: 'center', color: '#111111', width: 0.5, dash: 'solid' },
    footprint: { show: true, color: '#111111', width: 0.6, dash: 'solid', fill: '#ffffff', fillOpacity: 0 },
  })];
  s.legend = mergeDeep(s.legend, { x: 95, y: 128, title: '', size: 11, symbolSize: 11, color: '#111111', bg: '#f3f3f3', bgOpacity: 0, borderWidth: 0, padding: 2, gap: 3 });
  s.north = mergeDeep(s.north, { show: false, x: 165, y: 150 });
  s.scalebar = mergeDeep(s.scalebar, { show: false, x: 10, y: 160 });
  s.texts = [newText({ text: 'Fig. 1', anchor: 'page', x: 13, y: 160, size: 14, bold: true, color: '#111111', align: 'left' })];
  s.caption = { figure: 'Fig. 1', lead: 'Study sites in the northern Antarctic Peninsula.' };
  return s;
}

export function templateBlank() {
  registerProjections();
  const s = emptyState();
  s.title = 'Mapa nuevo';
  s.projection = 'EPSG:3031';
  s.view = { center: [-58, -66], mpm: 15000, rotation: rotationForMeridian('EPSG:3031', -58) };
  s.page = mergeDeep(s.page, { margins: { top: 5, right: 5, bottom: 8, left: 9 } });
  s.page.background = '#d9e6ec';
  s.layers = [L('add-costa'), L('rema-relieve', { blend: 'multiply', opacity: 0.6 }), L('ref-sector'), L('graticule')];
  s.legend.x = 14; s.legend.y = 12;
  s.north = mergeDeep(s.north, { x: 160, y: 20 });
  s.scalebar = mergeDeep(s.scalebar, { x: 16, y: 164 });
  return s;
}

export const TEMPLATES = [
  { id: 'coni', name: 'Coni: pingüinos emperador, Adelia y papúa', build: templateConi },
  { id: 'modelo1', name: 'Modelo 1: satelital con lupa punteada', build: templateModelo1 },
  { id: 'modelo2', name: 'Modelo 2: vectorial plano bicontinental', build: templateModelo2 },
  { id: 'blanco', name: 'Proyecto en blanco (Antártida)', build: templateBlank },
];
