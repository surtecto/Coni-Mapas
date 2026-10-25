"""Prepara los datos vectoriales estáticos de Coni-Mapas.
Fuentes: Natural Earth 10m (vista de Argentina, dominio público) e IGN (bases antárticas, WFS 2026-10-25).
"""
import json, os
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union

OUT = os.path.join(os.path.dirname(__file__), '..', 'data')
NE = '/tmp/ne/ne_10m_admin_0_countries_arg.geojson'

def rnd(geom, nd=4):
    def r(c):
        if isinstance(c[0], (int, float)):
            return [round(c[0], nd), round(c[1], nd)]
        return [r(x) for x in c]
    g = mapping(geom)
    return {'type': g['type'], 'coordinates': r(g['coordinates'])}

region = box(-130, -90, 10, 15)
d = json.load(open(NE))
feats = []
for f in d['features']:
    p = f['properties']
    g = shape(f['geometry'])
    if not g.intersects(region):
        continue
    g = g.intersection(region)
    if g.is_empty:
        continue
    iso = p.get('ADM0_A3_AR') or p.get('ADM0_A3')
    tol = 0.02 if iso == 'ATA' else 0.006
    gs = g.simplify(tol, preserve_topology=True)
    if gs.is_empty:
        continue
    # descartar islotes diminutos para aligerar
    if gs.geom_type == 'MultiPolygon':
        parts = [pp for pp in gs.geoms if pp.area > (0.0004 if iso != 'ATA' else 0.002)]
        if not parts:
            continue
        from shapely.geometry import MultiPolygon
        gs = MultiPolygon(parts)
    feats.append({'type': 'Feature', 'properties': {
        'nombre': p.get('NAME_ES') or p.get('NAME'), 'iso': iso, 'continente': p.get('CONTINENT')},
        'geometry': rnd(gs, 3)})
json.dump({'type': 'FeatureCollection', 'name': 'paises_natural_earth_vista_arg',
           'features': feats}, open(os.path.join(OUT, 'paises_ne_vista_arg.geojson'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('paises', len(feats), os.path.getsize(os.path.join(OUT, 'paises_ne_vista_arg.geojson')))

# Bases antárticas argentinas (IGN, capa ign:bahra_base_antartica, consultada 2026-10-25)
bases = [
 ('Base Orcadas', -44.740068, -60.737717, 'Islas del Atlántico Sur', 'Permanente'),
 ('Base Petrel', -56.226983, -63.477733, 'Antártida Argentina', 'Temporaria'),
 ('Base Brown', -62.870669, -64.895387, 'Antártida Argentina', 'Temporaria'),
 ('Base Melchior', -62.976429, -64.325730, 'Antártida Argentina', 'Temporaria'),
 ('Base Decepción', -60.697678, -62.975664, 'Antártida Argentina', 'Temporaria'),
 ('Base Primavera', -60.954741, -64.155832, 'Antártida Argentina', 'Temporaria'),
 ('Base Esperanza', -56.997122, -63.398008, 'Antártida Argentina', 'Permanente'),
 ('Base Carlini', -58.667012, -62.238467, 'Antártida Argentina', 'Permanente'),
 ('Base Cámara', -59.918406, -62.595108, 'Antártida Argentina', 'Temporaria'),
 ('Base Matienzo', -60.070946, -64.975817, 'Antártida Argentina', 'Temporaria'),
 ('Base Marambio', -56.625366, -64.241142, 'Antártida Argentina', 'Permanente'),
 ('Base Belgrano II', -34.679567, -77.875514, 'Antártida Argentina', 'Permanente'),
 ('Base San Martín', -67.100926, -68.129953, 'Antártida Argentina', 'Permanente'),
]
bf = [{'type': 'Feature', 'properties': {'nombre': n, 'departamento': dep, 'regimen': reg, 'fuente': 'IGN'},
       'geometry': {'type': 'Point', 'coordinates': [lon, lat]}} for n, lon, lat, dep, reg in bases]
json.dump({'type': 'FeatureCollection', 'name': 'bases_antarticas_argentinas_ign', 'features': bf},
          open(os.path.join(OUT, 'bases_antarticas_ign.geojson'), 'w'), ensure_ascii=False, indent=0)

# Hitos y toponimia antártica (selección). Islas: centro del rectángulo envolvente del polígono IGN (ign:areas_de_zona_costera_BA030).
# Mares, pasajes y regiones: puntos de rotulación aproximados (no son posiciones de medición).
hitos = [
 # nombre, lon, lat, clase
 ('Polo Sur', 0.0, -90.0, 'polo'),
 ('Mar de Weddell', -42.0, -72.5, 'mar'),
 ('Mar de Bellingshausen', -84.0, -71.0, 'mar'),
 ('Mar de la Flota', -42.0, -61.5, 'mar'),
 ('Pasaje Drake', -64.0, -58.5, 'pasaje'),
 ('Estrecho de Bransfield', -59.3, -63.0, 'estrecho'),
 ('Estrecho Antártico', -56.6, -63.35, 'estrecho'),
 ('Estrecho de Gerlache', -62.2, -64.5, 'estrecho'),
 ('Península Antártica', -64.5, -68.5, 'peninsula'),
 ('Península Potter', -58.66, -62.25, 'peninsula'),
 ('Bahía Esperanza', -57.0, -63.40, 'bahia'),
 ('Bahía Margarita', -68.3, -68.4, 'bahia'),
 ('Islas Shetland del Sur', -59.8, -62.2, 'archipielago'),
 ('Islas Orcadas del Sur', -45.3, -60.65, 'archipielago'),
 ('Islas Malvinas', -59.5, -51.75, 'archipielago'),
 ('Islas Georgias del Sur', -36.6, -54.4, 'archipielago'),
 ('Islas Sandwich del Sur', -26.5, -57.8, 'archipielago'),
 ('Isla Cerro Nevado', -57.182, -64.451, 'isla'),
 ('Isla Vicecomodoro Marambio', -56.740, -64.266, 'isla'),
 ('Isla 25 de Mayo', -58.304, -62.076, 'isla'),
 ('Isla Decepción', -60.624, -62.957, 'isla'),
 ('Isla Ross', -57.759, -64.114, 'isla'),
 ('Isla Vega', -57.377, -63.860, 'isla'),
 ('Isla Joinville', -55.797, -63.281, 'isla'),
 ('Isla Paulet', -55.777, -63.579, 'isla'),
 ('Isla Dundee', -55.987, -63.491, 'isla'),
 ('Isla Laurie', -44.604, -60.725, 'isla'),
 ('Isla Coronación', -45.592, -60.625, 'isla'),
 ('Isla Livingston', -60.511, -62.608, 'isla'),
 ('Isla Elefante', -55.064, -61.168, 'isla'),
 ('Isla Brabante', -62.392, -64.268, 'isla'),
 ('Isla Alejandro I', -71.783, -70.731, 'isla'),
 ('Barrera de hielo Larsen', -62.0, -67.5, 'barrera'),
 ('Barrera de hielo Filchner-Ronne', -61.0, -79.0, 'barrera'),
 ('Tierra de Coats', -27.0, -77.0, 'region'),
 ('Sector Antártico Argentino', -49.5, -75.0, 'region'),
]
hf = [{'type': 'Feature', 'properties': {'nombre': n, 'clase': c},
       'geometry': {'type': 'Point', 'coordinates': [lon, lat]}} for n, lon, lat, c in hitos]
json.dump({'type': 'FeatureCollection', 'name': 'hitos_antarticos', 'features': hf},
          open(os.path.join(OUT, 'hitos_antarticos.geojson'), 'w'), ensure_ascii=False, indent=0)
print('ok')
