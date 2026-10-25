# Coni-Mapas

Generador web de **mapas de localización para investigación antártica**, pensado para figuras de artículos científicos: se elige la proyección, las capas oficiales del IGN y las bases polares, se ubican los sitios de estudio con colores tomados de los gráficos estadísticos del trabajo, se agregan zooms en lupa y textos, y se exporta a tamaño de revista (PNG, TIFF, PDF, JPEG o SVG por capas).

**Usar en línea** (cuando el repositorio esté publicado con GitHub Pages): https://surtecto.github.io/Coni-Mapas/

**Usar en la computadora**: abrir `index.html` con Chrome, Edge o Firefox. No hace falta instalar nada; las capas se descargan de sus servidores, así que se necesita conexión a internet.

El proyecto se guarda solo en el navegador y también puede descargarse como archivo `.coni.json`.

## Qué permite hacer

- **Capas del IGN** en vivo: Argenmap (cinco estilos), bases antárticas argentinas, islas, barreras de hielo, glaciares, cerros, accidentes costeros, áreas protegidas y ZAEP, límites de espacios marítimos, zona económica exclusiva, plataforma continental, zona contigua, límites del Sector Antártico, territorio nacional bicontinental, mar territorial, 200 millas del sector antártico, MDE y curvas de nivel.
- **Costa antártica SCAR ADD v7.12** (resolución media o alta según la escala), estaciones de todos los países (COMNAP) y países de Natural Earth en su versión con punto de vista argentino.
- **Relieve y batimetría**: modelo de elevación REMA del Polar Geospatial Center (sombreado multidireccional o clásico, hipsometría, pendientes, orientación y curvas de nivel cada 25 m), mapa base polar del Norwegian Polar Institute, GEBCO (sombreado, color y topografía bajo el hielo), sombreado Esri, Blue Marble y un **DEM analítico** con rampa de color, cotas, azimut y altura del sol a elección.
- **Imágenes satelitales**: mosaico polar de la Antártida (EPSG:3031), imagen mundial Esri, Sentinel-2 sin nubes y MODIS por fecha.
- **Referencias**: Sector Antártico Argentino (25°O–74°O), paralelo 60°S, Círculo Polar Antártico calculado para el año en curso, toponimia antártica y grilla de coordenadas vectorial con rótulos en el marco.
- **Proyecciones**: estereográfica polar antártica (EPSG:3031), bicontinental IGN (Lambert acimutal equivalente, 40°S 60°O), Lambert polar sur (EPSG:6932), UTM 20S y 21S, Mercator web y geográficas.
- **Estilo por capa**: visibilidad, orden, opacidad, modo de fusión, brillo, contraste, saturación, recorte al Sector Antártico, símbolos (círculo, cuadrado, triángulo, rombo, estrella, cruz…), tipos de línea (continua, discontinua, punteada, punto y raya…), rellenos con tramas, rótulos y colores por atributo.
- **Sitios de estudio** por coordenadas (decimales o grados-minutos-segundos), marcándolos en el mapa o desde CSV. Un sitio con varias categorías se dibuja dividido (torta, franjas o anillos); también puede llevar un círculo de área de radio fijo o en kilómetros, como en el modelo 2.
- **Paletas**: la de los pingüinos (Adelia, Emperador, Papúa), los dos modelos de referencia, Okabe–Ito, Paul Tol, ggplot2, Viridis, ColorBrewer, NPG y Lancet. Se puede **subir la imagen de un gráfico** y la aplicación extrae sus colores en el orden de las barras. Incluye un control de distinguibilidad con simulación de daltonismo.
- **Zooms**: lupas circulares, rectangulares o redondeadas con el área ampliada marcada sobre el mapa y conectores tangentes o centrales; también mapas de ubicación (por ejemplo, bicontinental) con su propia proyección.
- **Composición**: textos movibles y rotables (anclados a la hoja o a una coordenada), leyenda automática y editable, flecha de norte verdadero calculada en su posición, escala gráfica medida sobre el elipsoide, marco y márgenes.
- **Exportación** a 150, 300, 600 o 1200 ppp con la resolución grabada en el archivo; PDF con el tamaño exacto en milímetros; SVG con cada capa en su propio grupo y la composición en vectores editables (Illustrator, Inkscape).
- **Epígrafe automático** con proyección, datum, coordenadas de los sitios y citas de las fuentes visibles.

## Fuentes y atribuciones

| Fuente | Servicio | Uso en la figura |
|---|---|---|
| Instituto Geográfico Nacional (IGN) | WMS/WFS `wms.ign.gob.ar` y teselas Argenmap | Citar “Instituto Geográfico Nacional de la República Argentina” |
| SCAR Antarctic Digital Database v7.12 (BAS) | ArcGIS Feature Service | Gerrish, Fretwell y Cooper (2025) |
| REMA (Polar Geospatial Center) | ImageServer `overlord.pgc.umn.edu` | Howat et al. (2019) |
| COMNAP Antarctic Facilities | Feature Service del PGC | COMNAP |
| Norwegian Polar Institute (REMA, IBCSO v2, SCAR ADD) | Mapa base polar | Norwegian Polar Institute |
| GEBCO Compilation Group | WMS `wms.gebco.net` | GEBCO 2025 Grid |
| NASA GIBS | WMTS polar y Mercator | NASA Worldview / GIBS |
| Esri, Earthstar Geographics, Maxar | Teselas ArcGIS Online | Atribución Esri |
| EOX IT Services | Sentinel-2 cloudless 2020 | CC BY-NC-SA 4.0 (uso no comercial) |
| Natural Earth | GeoJSON incluido en `data/` | Dominio público |
| Mapzen / AWS Terrain Tiles | Teselas Terrarium | SRTM, GMTED2010, ETOPO1 |

Los datos de bases antárticas (`data/bases_antarticas_ign.geojson`) son una copia de la capa `ign:bahra_base_antartica` consultada el 25 de octubre de 2026; el régimen permanente o temporario sigue el registro de COMNAP (7 permanentes, 6 temporarias). Los puntos de rotulación de islas derivan de la capa `ign:areas_de_zona_costera_BA030`; los de mares y regiones son posiciones de rotulación, no puntos de medición.

## Desarrollo

```bash
npm install
npm run build     # genera assets/app.js, assets/app.css y assets/ol.css
python3 -m http.server 8000
```

El código está en `src/` (OpenLayers 10, proj4, fflate y shpjs, empaquetados con esbuild). La composición (lupas, conectores, grilla, sitios, leyenda, norte, escala y textos) se dibuja con una sola rutina en milímetros de papel, compartida por la vista previa, la exportación ráster y la exportación SVG, de modo que lo que se ve es lo que se exporta.

## Licencia

Código bajo licencia MIT. Cada capa conserva la licencia y las condiciones de uso de su proveedor.
