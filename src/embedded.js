// Datos estáticos incluidos en el paquete: la aplicación funciona también abriendo index.html sin servidor
import paises from '../data/paises_ne_vista_arg.geojson';
import bases from '../data/bases_antarticas_ign.geojson';
import hitos from '../data/hitos_antarticos.geojson';

export const EMBEDDED = {
  'data/paises_ne_vista_arg.geojson': paises,
  'data/bases_antarticas_ign.geojson': bases,
  'data/hitos_antarticos.geojson': hitos,
};
