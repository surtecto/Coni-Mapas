// Compila la aplicación: node tools/build.mjs [--dev]
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
const dev = process.argv.includes('--dev');
mkdirSync('assets', { recursive: true });
await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  format: 'iife',
  target: ['es2020'],
  outfile: 'assets/app.js',
  logLevel: 'info',
  legalComments: 'none',
});
copyFileSync('src/app.css', 'assets/app.css');
copyFileSync('node_modules/ol/ol.css', 'assets/ol.css');
console.log('ok');
