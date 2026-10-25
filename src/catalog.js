// Catálogo de capas: fuentes cartográficas para investigación antártica
// Todas las fuentes de este catálogo fueron verificadas con CORS habilitado (exportables a imagen).

export const FONTS = [
  'Source Sans 3', 'Archivo', 'Noto Sans', 'Roboto Condensed', 'Open Sans', 'Lato',
  'Source Serif 4', 'Noto Serif', 'Merriweather', 'Arial', 'Helvetica', 'Times New Roman',
];

export const GROUPS = [
  { id: 'ign-base', title: 'Bases IGN (Argenmap)' },
  { id: 'ign-vec', title: 'IGN: Antártida y espacios marítimos' },
  { id: 'ign-wms', title: 'IGN: servicios WMS (imagen oficial)' },
  { id: 'costas', title: 'Costas, hielos y países' },
  { id: 'relieve', title: 'Relieve, DEM y batimetría' },
  { id: 'sat', title: 'Imágenes satelitales' },
  { id: 'ref', title: 'Referencias geográficas' },
];

const IGN_TMS = (name) => `https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/${name}@EPSG%3A3857@png/{z}/{x}/{-y}.png`;
export const IGN_OWS = 'https://wms.ign.gob.ar/geoserver/ows';
const IGN_CITE = 'Instituto Geográfico Nacional de la República Argentina (IGN). Geoservicios WMS/WFS. https://www.ign.gob.ar';
const ANT_BBOX = '-82,-90,-18,-50';

const POLAR_GRID_ESRI = {
  origin: [-33699550.99203, 33699551.01703],
  resolutions: Array.from({ length: 20 }, (_, i) => 238810.813354 / Math.pow(2, i)),
  tileSize: 256,
  extent: [-4524537.706, -4524537.706, 4524537.706, 4524537.706],
};
const POLAR_GRID_GIBS = (levels) => ({
  origin: [-4194304, 4194304],
  resolutions: Array.from({ length: levels }, (_, i) => 8192 / Math.pow(2, i)),
  tileSize: 512,
  extent: [-4194304, -4194304, 4194304, 4194304],
});

// ---- estilos base ----
export function baseStyle(over = {}) {
  const s = {
    point: { shape: 'circle', size: 5, fill: '#d6452b', fillOpacity: 1, stroke: '#ffffff', strokeWidth: 0.6, strokeOpacity: 1 },
    line: { color: '#2b3a4a', width: 0.6, opacity: 1, dash: 'solid' },
    polygon: { fill: '#c8d8de', fillOpacity: 0.6, pattern: 'none', patternColor: '#34495e', patternSpacing: 1.6, patternWidth: 0.25, stroke: '#34495e', strokeWidth: 0.4, strokeOpacity: 1, dash: 'solid' },
    label: { show: false, field: 'fna', font: 'Source Sans 3', size: 6.5, color: '#1d2b38', halo: '#ffffff', haloWidth: 1.2, bold: false, italic: false, uppercase: false, letterSpacing: 0, offsetX: 0, offsetY: -6, declutter: true },
    categorize: { field: '', values: {} },
  };
  for (const k of Object.keys(over)) s[k] = typeof over[k] === 'object' && !Array.isArray(over[k]) ? { ...s[k], ...over[k] } : over[k];
  return s;
}

const wfs = (typeName, bbox = ANT_BBOX) => ({ type: 'wfs', url: IGN_OWS, typeName, bbox });

export const CATALOG = [
  // ---------------- Bases IGN ----------------
  { id: 'ign-argenmap', group: 'ign-base', name: 'Argenmap', kind: 'raster', type: 'xyz', url: IGN_TMS('capabaseargenmap'), projection: 'EPSG:3857', maxZoom: 18,
    attribution: 'IGN – Argenmap', cite: IGN_CITE, note: 'Mapa base oficial del IGN con toponimia argentina. Teselas Mercator: sin cobertura al sur de 85°S.' },
  { id: 'ign-gris', group: 'ign-base', name: 'Argenmap gris', kind: 'raster', type: 'xyz', url: IGN_TMS('mapabase_gris'), projection: 'EPSG:3857', maxZoom: 18,
    attribution: 'IGN – Argenmap', cite: IGN_CITE },
  { id: 'ign-oscuro', group: 'ign-base', name: 'Argenmap oscuro', kind: 'raster', type: 'xyz', url: IGN_TMS('argenmap_oscuro'), projection: 'EPSG:3857', maxZoom: 18,
    attribution: 'IGN – Argenmap', cite: IGN_CITE },
  { id: 'ign-topo', group: 'ign-base', name: 'Argenmap topográfico', kind: 'raster', type: 'xyz', url: IGN_TMS('mapabase_topo'), projection: 'EPSG:3857', maxZoom: 18,
    attribution: 'IGN – Argenmap', cite: IGN_CITE },
  { id: 'ign-hibrido', group: 'ign-base', name: 'Argenmap híbrido (rótulos)', kind: 'raster', type: 'xyz', url: IGN_TMS('mapabase_hibrido'), projection: 'EPSG:3857', maxZoom: 18,
    attribution: 'IGN – Argenmap', cite: IGN_CITE, note: 'Rótulos y límites transparentes para superponer a imágenes satelitales.' },

  // ---------------- IGN vectorial ----------------
  { id: 'ign-bases', group: 'ign-vec', name: 'Bases antárticas argentinas', kind: 'vector', type: 'geojson', url: 'data/bases_antarticas_ign.geojson', geom: 'point',
    fields: ['nombre', 'regimen', 'departamento'],
    attribution: 'IGN – Bases antárticas', cite: IGN_CITE + ' Capa ign:bahra_base_antartica.',
    defaults: { style: baseStyle({ point: { shape: 'square', size: 5, fill: '#c8102e', stroke: '#ffffff', strokeWidth: 0.6 },
      label: { show: true, field: 'nombre', size: 6.5, offsetY: -7 } }) },
    note: '13 bases: 7 permanentes y 6 temporarias (régimen según COMNAP). Copia local de la capa del IGN.' },
  { id: 'comnap', group: 'ign-vec', name: 'Bases de todos los países (COMNAP)', kind: 'vector', type: 'geojson-multi', geom: 'point',
    urls: [0, 1].map((i) => 'https://overlord.pgc.umn.edu/arcgis/rest/services/reference/ant_comnap_antarctic_facilities/FeatureServer/{i}/query?where=1%3D1&outFields=official_name,english_name,operator__primary_,seasonality,type,year_established&outSR=4326&f=geojson'.replace('{i}', i)),
    fields: ['official_name', 'english_name', 'operator__primary_', 'seasonality', 'type'],
    attribution: 'COMNAP – Antarctic Facilities', cite: 'COMNAP (2024). Antarctic Facilities Information; servicio del Polar Geospatial Center.',
    defaults: { style: baseStyle({ point: { shape: 'circle', size: 4, fill: '#555555', stroke: '#ffffff', strokeWidth: 0.5 }, label: { field: 'official_name', size: 5.5 },
      categorize: { field: 'seasonality', values: { 'Year-Round': '#b5121b', Seasonal: '#e8a33d' } } }) },
    note: 'Estaciones permanentes y estacionales de todos los programas antárticos, con operador y año de fundación.' },
  { id: 'ign-islas', group: 'ign-vec', name: 'Islas', kind: 'vector', ...wfs('ign:areas_de_zona_costera_BA030'), geom: 'polygon', fields: ['fna', 'gna', 'tis'],
    attribution: 'IGN – Islas', cite: IGN_CITE,
    defaults: { style: baseStyle({ polygon: { fill: '#eef2f2', fillOpacity: 1, stroke: '#4d5d66', strokeWidth: 0.35 }, label: { field: 'fna', italic: false } }) } },
  { id: 'ign-barreras', group: 'ign-vec', name: 'Barreras de hielo', kind: 'vector', ...wfs('ign:areas_de_glaciologia_050705'), geom: 'polygon', fields: ['fna', 'gna'],
    attribution: 'IGN – Barreras de hielo', cite: IGN_CITE,
    defaults: { style: baseStyle({ polygon: { fill: '#d9edf6', fillOpacity: 1, pattern: 'none', stroke: '#7fa9bf', strokeWidth: 0.3 }, label: { field: 'fna', italic: true, color: '#3c6e8a' } }) } },
  { id: 'ign-glaciares', group: 'ign-vec', name: 'Glaciares (toponimia)', kind: 'vector', ...wfs('ign:puntos_de_glaciologia_BJ030'), geom: 'point', fields: ['fna', 'gna'],
    attribution: 'IGN – Glaciares', cite: IGN_CITE,
    defaults: { style: baseStyle({ point: { shape: 'triangle', size: 3.5, fill: '#5aa0c8', stroke: '#ffffff', strokeWidth: 0.4 }, label: { show: true, field: 'fna', size: 5.5, italic: true, color: '#2f6a8c' } }) } },
  { id: 'ign-cerros', group: 'ign-vec', name: 'Cerros y picos', kind: 'vector', ...wfs('ign:puntos_de_geomorfologia_NA100'), geom: 'point', fields: ['fna', 'alt', 'gna'],
    attribution: 'IGN – Cerros', cite: IGN_CITE,
    defaults: { style: baseStyle({ point: { shape: 'triangle', size: 3.5, fill: '#5b3a1e', stroke: '#ffffff', strokeWidth: 0.4 }, label: { show: true, field: 'fna', size: 5.5, color: '#4a3220' } }) } },
  { id: 'ign-accidentes', group: 'ign-vec', name: 'Accidentes costeros (bahías, estrechos)', kind: 'vector', ...wfs('ign:lineas_de_zona_costera_BA040'), geom: 'line', fields: ['fna', 'gna'],
    attribution: 'IGN – Accidentes costeros', cite: IGN_CITE,
    defaults: { style: baseStyle({ line: { color: '#3a7ca5', width: 0.4, dash: 'dotted' }, label: { show: true, field: 'fna', size: 5.5, italic: true, color: '#2c6d96' } }) } },
  { id: 'ign-zaep', group: 'ign-vec', name: 'Áreas protegidas y ZAEP', kind: 'vector', ...wfs('ign:area_protegida'), geom: 'polygon', fields: ['fna', 'tap', 'jap'],
    attribution: 'IGN – Áreas protegidas', cite: IGN_CITE,
    defaults: { style: baseStyle({ polygon: { fill: '#2e8b57', fillOpacity: 0.18, pattern: 'diag', patternColor: '#2e8b57', patternSpacing: 1.4, patternWidth: 0.2, stroke: '#2e8b57', strokeWidth: 0.5 }, label: { field: 'fna', color: '#1f6b40' } }) },
    note: 'Incluye las Zonas Antárticas Especialmente Protegidas (ZAEP) y áreas marinas protegidas.' },
  { id: 'ign-limmar', group: 'ign-vec', name: 'Límites de espacios marítimos', kind: 'vector', ...wfs('ign:linea_limite_maritimos', '-82,-90,-18,-20'), geom: 'line', fields: ['fna', 'gna'],
    attribution: 'IGN – Espacios marítimos', cite: IGN_CITE,
    defaults: { style: baseStyle({ line: { color: '#4a90c2', width: 0.5, dash: 'dashdot' } }) } },
  { id: 'ign-zee', group: 'ign-vec', name: 'Zona económica exclusiva', kind: 'vector', ...wfs('ign:zona_economica_exclusiva_argentina', '-82,-90,-18,-20'), geom: 'polygon', fields: ['fna'],
    attribution: 'IGN – Zona económica exclusiva', cite: IGN_CITE,
    defaults: { opacity: 1, style: baseStyle({ polygon: { fill: '#9fd0e8', fillOpacity: 0.35, stroke: '#6fb3d9', strokeWidth: 0.4, dash: 'dashed' } }) } },
  { id: 'ign-plataforma', group: 'ign-vec', name: 'Plataforma continental (límite exterior)', kind: 'vector', ...wfs('ign:plataforma_continental', '-82,-90,-18,-20'), geom: 'polygon', fields: ['fna'],
    attribution: 'IGN – Plataforma continental', cite: IGN_CITE,
    defaults: { style: baseStyle({ polygon: { fill: '#bfe3f2', fillOpacity: 0.3, stroke: '#7cc0e0', strokeWidth: 0.4, dash: 'dashdot' } }) } },
  { id: 'ign-contigua', group: 'ign-vec', name: 'Zona contigua', kind: 'vector', ...wfs('ign:zona_contigua_argentina', '-82,-90,-18,-20'), geom: 'polygon', fields: ['fna'],
    attribution: 'IGN – Zona contigua', cite: IGN_CITE,
    defaults: { style: baseStyle({ polygon: { fill: '#9fd0e8', fillOpacity: 0.25, stroke: '#5ea9d2', strokeWidth: 0.3 } }) } },
  { id: 'ign-sector', group: 'ign-vec', name: 'Límites del Sector Antártico Argentino (IGN)', kind: 'vector', ...wfs('ign:linea_de_limite_FA004'), geom: 'line', fields: ['fna'],
    attribution: 'IGN – Límite internacional', cite: IGN_CITE,
    defaults: { style: baseStyle({ line: { color: '#3b3b3b', width: 0.8, dash: 'solid' } }) },
    note: 'Meridianos 25°O y 74°O según la capa de límites internacionales del IGN.' },

  // ---------------- IGN WMS ----------------
  { id: 'ign-wms-pais', group: 'ign-wms', name: 'Territorio nacional (bicontinental)', kind: 'raster', type: 'wms', url: IGN_OWS, layers: 'ign:pais',
    attribution: 'IGN – País', cite: IGN_CITE, note: 'Polígono oficial (continental, insular y antártico). Es pesado: el servidor puede tardar unos segundos por tesela.' },
  { id: 'ign-wms-provincia', group: 'ign-wms', name: 'Provincias', kind: 'raster', type: 'wms', url: IGN_OWS, layers: 'ign:provincia',
    attribution: 'IGN – Provincias', cite: IGN_CITE },
  { id: 'ign-wms-200mn', group: 'ign-wms', name: '200 millas desde la costa del sector antártico', kind: 'raster', type: 'wms', url: IGN_OWS, layers: 'ign:doscientas_millas_sector_antartico',
    attribution: 'IGN – 200 millas sector antártico', cite: IGN_CITE },
  { id: 'ign-wms-marterr', group: 'ign-wms', name: 'Mar territorial', kind: 'raster', type: 'wms', url: IGN_OWS, layers: 'ign:mar_territorial_argentino',
    attribution: 'IGN – Mar territorial', cite: IGN_CITE },
  { id: 'ign-wms-zee', group: 'ign-wms', name: 'Zona económica exclusiva (imagen)', kind: 'raster', type: 'wms', url: IGN_OWS, layers: 'ign:zona_economica_exclusiva_argentina',
    attribution: 'IGN – ZEE', cite: IGN_CITE },
  { id: 'ign-wms-barrera', group: 'ign-wms', name: 'Barreras de hielo (imagen)', kind: 'raster', type: 'wms', url: IGN_OWS, layers: 'ign:areas_de_glaciologia_050705',
    attribution: 'IGN – Barreras de hielo', cite: IGN_CITE },
  { id: 'ign-wms-mde', group: 'ign-wms', name: 'Modelo digital de elevaciones (continente)', kind: 'raster', type: 'wms', url: IGN_OWS, layers: 'ign:mde',
    attribution: 'IGN – MDE-Ar', cite: IGN_CITE, note: 'Cubre el territorio continental; para la Antártida usar REMA/IBCSO o GEBCO.' },
  { id: 'ign-wms-curvas', group: 'ign-wms', name: 'Curvas hipsométricas', kind: 'raster', type: 'wms', url: IGN_OWS, layers: 'ign:lineas_de_geomorfologia_CA010',
    attribution: 'IGN – Curvas de nivel', cite: IGN_CITE },

  // ---------------- Costas y hielos ----------------
  { id: 'add-costa', group: 'costas', name: 'Costa antártica SCAR ADD (vectorial)', kind: 'vector', type: 'esri-feature', geom: 'polygon',
    urls: {
      medium: 'https://services7.arcgis.com/tPxy1hrFDhJfZ0Mf/ArcGIS/rest/services/Medium_resolution_vector_polygons_of_the_Antarctic_coastline/FeatureServer/1',
      high: 'https://services7.arcgis.com/tPxy1hrFDhJfZ0Mf/ArcGIS/rest/services/High_resolution_vector_polygons_of_the_Antarctic_coastline/FeatureServer/1',
    },
    fields: ['surface'],
    attribution: 'SCAR Antarctic Digital Database v7.12', cite: 'Gerrish, L., Fretwell, P. y Cooper, P. (2025). Costa antártica de resolución media y alta (polígonos), v7.12. SCAR Antarctic Digital Database. British Antarctic Survey.',
    defaults: { style: baseStyle({ polygon: { fill: '#f4f7f8', fillOpacity: 1, stroke: '#41535e', strokeWidth: 0.35 },
      categorize: { field: 'surface', values: { land: '#f4f7f8', 'ice shelf': '#dbe9f0', 'ice tongue': '#dbe9f0', rumple: '#e7eff3' } } }) },
    note: 'Resolución media o alta según la escala (cambia sola). Superficies: tierra, barrera de hielo, lengua de hielo.' },
  { id: 'ne-paises', group: 'costas', name: 'Países (Natural Earth, vista argentina)', kind: 'vector', type: 'geojson', url: 'data/paises_ne_vista_arg.geojson', geom: 'polygon',
    fields: ['nombre', 'iso'],
    attribution: 'Natural Earth 1:10M', cite: 'Natural Earth (2024). Admin 0 – Countries, 1:10M, versión con punto de vista argentino. https://www.naturalearthdata.com',
    defaults: { style: baseStyle({ polygon: { fill: '#e6e2d8', fillOpacity: 1, stroke: '#7d7a72', strokeWidth: 0.35 },
      categorize: { field: 'iso', values: { ARG: '#d8d2c2' } }, label: { field: 'nombre' } }) },
    note: 'Sudamérica y alrededores, con Islas Malvinas, Georgias y Sandwich del Sur como territorio argentino (vista ARG de Natural Earth). La Antártida se dibuja con la costa SCAR ADD.' },

  // ---------------- Relieve ----------------
  { id: 'rema-relieve', group: 'relieve', name: 'REMA: modelo de elevación de la Antártida', kind: 'raster', type: 'arcgis-image',
    url: 'https://overlord.pgc.umn.edu/arcgis/rest/services/elevation/pgc_rema_mosaics_latest/ImageServer', projection: 'EPSG:3031',
    functions: [['Hillshade Multidirectional', 'Sombreado multidireccional'], ['Hillshade Gray', 'Sombreado clásico (NO 315°)'], ['Hillshade Elevation Tinted', 'Hipsometría con sombreado'], ['Slope Map', 'Pendientes'], ['Aspect Map', 'Orientación de laderas']],
    attribution: 'REMA – Polar Geospatial Center', cite: 'Howat, I. M., Porter, C., Smith, B. E., Noh, M.-J. y Morin, P. (2019). The Reference Elevation Model of Antarctica. The Cryosphere 13, 665–674. Mosaico REMA servido por el Polar Geospatial Center (Universidad de Minnesota).',
    defaults: { params: { fn: 'Hillshade Multidirectional' }, clip: 'land' },
    note: 'Modelo de elevación de referencia de la Antártida (mosaico de 2 m). Por defecto se recorta a la costa SCAR ADD (agregá esa capa) para no teñir el mar. La primera carga puede tardar unos segundos.' },
  { id: 'rema-curvas', group: 'relieve', name: 'REMA: curvas de nivel cada 25 m', kind: 'raster', type: 'arcgis-image',
    url: 'https://overlord.pgc.umn.edu/arcgis/rest/services/elevation/pgc_rema_mosaics_latest/ImageServer', projection: 'EPSG:3031',
    functions: [['Contour Smoothed 25', 'Curvas suavizadas, 25 m'], ['Contour 25', 'Curvas sin suavizar, 25 m']],
    attribution: 'REMA – Polar Geospatial Center', cite: 'Howat et al. (2019). The Reference Elevation Model of Antarctica. Polar Geospatial Center.',
    defaults: { params: { fn: 'Contour Smoothed 25' }, clip: 'land' },
    note: 'Pensado para mapas de detalle (escalas mayores que 1:500.000); a escala chica las curvas se empastan.' },
  { id: 'npi-base', group: 'relieve', name: 'Mapa base polar NPI (relieve, batimetría y costa)', kind: 'raster', type: 'arcgis',
    url: 'https://geodata.npolar.no/arcgis/rest/services/Basisdata_Intern/NP_Antarktis_WMTS_3031/MapServer', params: {}, projection: 'EPSG:3031',
    attribution: 'Norwegian Polar Institute: REMA, IBCSO, SCAR ADD', cite: 'Norwegian Polar Institute (2024). Mapa base de la Antártida (REMA, IBCSO v2, SCAR ADD, ETOPO1).',
    note: 'Mapa compuesto: trae su propia grilla blanca y toponimia noruega en Tierra de la Reina Maud.' },
  { id: 'gebco-relieve', group: 'relieve', name: 'GEBCO relieve sombreado', kind: 'raster', type: 'wms', url: 'https://wms.gebco.net/mapserv', layers: 'GEBCO_LATEST', wmsProjections: ['EPSG:3857', 'EPSG:4326'],
    attribution: 'GEBCO Compilation Group', cite: 'GEBCO Compilation Group (2025). GEBCO 2025 Grid. doi:10.5285/37c52e96-24ea-67ce-e063-7086abc05f29' },
  { id: 'gebco-color', group: 'relieve', name: 'GEBCO topografía y batimetría (color)', kind: 'raster', type: 'wms', url: 'https://wms.gebco.net/mapserv', layers: 'GEBCO_LATEST_2', wmsProjections: ['EPSG:3857', 'EPSG:4326'],
    attribution: 'GEBCO Compilation Group', cite: 'GEBCO Compilation Group (2025). GEBCO 2025 Grid.' },
  { id: 'gebco-subhielo', group: 'relieve', name: 'GEBCO topografía bajo el hielo', kind: 'raster', type: 'wms', url: 'https://wms.gebco.net/mapserv', layers: 'GEBCO_LATEST_2_sub_ice_topo', wmsProjections: ['EPSG:3857', 'EPSG:4326'],
    attribution: 'GEBCO Compilation Group', cite: 'GEBCO Compilation Group (2025). GEBCO 2025 Grid (sub-ice topography).' },
  { id: 'dem-analitico', group: 'relieve', name: 'DEM analítico (rampa y sombreado a medida)', kind: 'raster', type: 'terrarium',
    url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png', projection: 'EPSG:3857', maxZoom: 13,
    attribution: 'Terrain Tiles (Mapzen/AWS): SRTM, GMTED, ETOPO1', cite: 'Mapzen / AWS Open Data. Terrain Tiles (formato Terrarium): SRTM, GMTED2010, ETOPO1.',
    defaults: { params: { ramp: 'hipsometrica', min: -4000, max: 2500, shade: true, azimuth: 315, altitude: 40, zFactor: 2, shadeStrength: 0.55, transparentSea: false } },
    note: 'Calcula colores y sombreado en el navegador a partir de elevaciones reales. En la Antártida la resolución es baja (ETOPO1).' },
  { id: 'esri-hillshade', group: 'relieve', name: 'Sombreado mundial Esri', kind: 'raster', type: 'xyz', projection: 'EPSG:3857', maxZoom: 13,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, USGS, NGA, NASA, CGIAR', cite: 'Esri (2024). World Hillshade.' },
  { id: 'gibs-relieve', group: 'relieve', name: 'Blue Marble relieve y batimetría (NASA)', kind: 'raster', type: 'xyz', projection: 'EPSG:3031',
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3031/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-08-01/500m/{z}/{y}/{x}.jpeg', tileGrid: POLAR_GRID_GIBS(5),
    attribution: 'NASA GIBS – Blue Marble', cite: 'NASA Earth Observatory / GIBS. Blue Marble Shaded Relief and Bathymetry.' },
  { id: 'esri-oceano', group: 'relieve', name: 'Océanos Esri (batimetría base)', kind: 'raster', type: 'xyz', projection: 'EPSG:3857', maxZoom: 13,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, GEBCO, NOAA, NGS', cite: 'Esri (2024). World Ocean Base.' },

  // ---------------- Satelital ----------------
  { id: 'esri-antartida', group: 'sat', name: 'Imagen satelital Antártida (polar)', kind: 'raster', type: 'xyz', projection: 'EPSG:3031',
    url: 'https://elevation3d.arcgis.com/arcgis/rest/services/Polar/Antarctic_Imagery/MapServer/tile/{z}/{y}/{x}', tileGrid: POLAR_GRID_ESRI,
    attribution: 'Esri, Earthstar Geographics', cite: 'Esri / Earthstar Geographics (2024). Antarctic Imagery (EPSG:3031).',
    note: 'Mosaico polar nativo en EPSG:3031: cubre todo el continente, incluido el polo.' },
  { id: 'esri-mundo', group: 'sat', name: 'Imagen satelital mundial (Esri)', kind: 'raster', type: 'xyz', projection: 'EPSG:3857', maxZoom: 18,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics', cite: 'Esri (2024). World Imagery.' },
  { id: 'eox-s2', group: 'sat', name: 'Sentinel-2 sin nubes 2020 (EOX)', kind: 'raster', type: 'xyz', projection: 'EPSG:3857', maxZoom: 15,
    url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg',
    attribution: 'Sentinel-2 cloudless – s2maps.eu, EOX (Copernicus 2020)', cite: 'EOX IT Services GmbH (2021). Sentinel-2 cloudless 2020 (contiene datos Copernicus Sentinel modificados 2020). CC BY-NC-SA 4.0.' },
  { id: 'gibs-modis', group: 'sat', name: 'MODIS color verdadero por fecha (NASA)', kind: 'raster', type: 'gibs-date', projection: 'EPSG:3031',
    layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', tileGrid: POLAR_GRID_GIBS(6),
    attribution: 'NASA GIBS – MODIS Terra', cite: 'NASA Worldview / GIBS. MODIS Terra Corrected Reflectance (True Color).',
    defaults: { params: { date: '2026-01-15' } },
    note: 'Imagen diaria: elegí una fecha de verano austral con poca nubosidad.' },
  { id: 'gibs-bmng', group: 'sat', name: 'Blue Marble Next Generation (NASA)', kind: 'raster', type: 'xyz', projection: 'EPSG:3031',
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3031/best/BlueMarble_NextGeneration/default/2004-08-01/500m/{z}/{y}/{x}.jpeg', tileGrid: POLAR_GRID_GIBS(5),
    attribution: 'NASA GIBS – Blue Marble NG', cite: 'NASA Earth Observatory. Blue Marble Next Generation.' },

  // ---------------- Referencias ----------------
  { id: 'ref-sector', group: 'ref', name: 'Sector Antártico Argentino (25°O–74°O)', kind: 'vector', type: 'generated', gen: 'sector', geom: 'polygon',
    attribution: 'Sector Antártico Argentino', cite: 'Sector Antártico Argentino: entre los meridianos 25°O y 74°O, al sur del paralelo 60°S (Decreto-Ley 2129/57).',
    defaults: { style: baseStyle({ polygon: { fill: '#ffffff', fillOpacity: 0, stroke: '#2b2b2b', strokeWidth: 0.8, dash: 'solid' } }) } },
  { id: 'ref-60s', group: 'ref', name: 'Paralelo 60°S (límite del Tratado Antártico)', kind: 'vector', type: 'generated', gen: 'parallel60', geom: 'line',
    attribution: 'Paralelo 60°S', cite: 'Área del Tratado Antártico: al sur de los 60°S (art. VI).',
    defaults: { style: baseStyle({ line: { color: '#1f4e79', width: 0.6, dash: 'dashed' } }) } },
  { id: 'ref-circulo', group: 'ref', name: 'Círculo Polar Antártico', kind: 'vector', type: 'generated', gen: 'polarCircle', geom: 'line',
    attribution: 'Círculo Polar Antártico', cite: 'Círculo Polar Antártico calculado con la oblicuidad de la eclíptica del año en curso.',
    defaults: { style: baseStyle({ line: { color: '#5b7c99', width: 0.5, dash: 'dotted' } }) } },
  { id: 'ref-hitos', group: 'ref', name: 'Hitos y toponimia antártica', kind: 'vector', type: 'geojson', url: 'data/hitos_antarticos.geojson', geom: 'point',
    fields: ['nombre', 'clase'], labelsOnly: true,
    attribution: 'Toponimia: IGN / SCAR CGA', cite: 'Toponimia argentina según IGN; puntos de rotulación de islas derivados de la capa ign:areas_de_zona_costera_BA030.',
    defaults: { style: baseStyle({ point: { shape: 'none', size: 0 }, label: { show: true, field: 'nombre', size: 6.5, color: '#2a4a63', halo: '#ffffff', haloWidth: 1, offsetY: 0, byClass: true } }) },
    note: 'Rótulos por clase: mares y pasajes en cursiva espaciada, islas en redonda, regiones en mayúsculas.' },
  { id: 'graticule', group: 'ref', name: 'Grilla de coordenadas', kind: 'special', type: 'graticule',
    attribution: '', cite: '',
    defaults: { style: { line: { color: '#5a6b78', width: 0.35, opacity: 0.8, dash: 'solid' }, label: { show: true, mode: 'frame', size: 6, color: '#33424e', font: 'Source Sans 3', edges: 'classic', vertical: true }, interval: 'auto', intervalLon: 'auto' } } },
];

export const CATALOG_BY_ID = new Map(CATALOG.map((d) => [d.id, d]));

export function getDef(id) {
  if (CATALOG_BY_ID.has(id)) return CATALOG_BY_ID.get(id);
  return null;
}

// Rampas de color para el DEM analítico.
// 'sea' se aplica de la cota mínima a 0 m y 'land' de 0 m a la máxima; 'all' recorre todo el rango.
export const RAMPS = {
  hipsometrica: { name: 'Hipsométrica clásica', sea: [[0, '#1d3b5c'], [0.6, '#5f9bc4'], [1, '#cfe7f0']], land: [[0, '#7fa36b'], [0.25, '#c9c08a'], [0.55, '#b88a5a'], [0.8, '#8f6a50'], [1, '#ffffff']] },
  hielo: { name: 'Hielo y mar', sea: [[0, '#0b2545'], [0.7, '#5c8db8'], [1, '#bcd7e6']], land: [[0, '#e3ecf1'], [1, '#ffffff']] },
  batimetria: { name: 'Batimetría azul, tierra gris', sea: [[0, '#08306b'], [0.6, '#4292c6'], [1, '#c6dbef']], land: [[0, '#d9d9d9'], [1, '#f7f7f7']] },
  grises: { name: 'Grises (todo el rango)', all: [[0, '#202020'], [1, '#f2f2f2']] },
  viridis: { name: 'Viridis (todo el rango)', all: [[0, '#440154'], [0.25, '#3b528b'], [0.5, '#21918c'], [0.75, '#5ec962'], [1, '#fde725']] },
  cividis: { name: 'Cividis, apta daltonismo (todo el rango)', all: [[0, '#00204c'], [0.25, '#414d6b'], [0.5, '#7c7b78'], [0.75, '#bcae6e'], [1, '#ffe945']] },
};
