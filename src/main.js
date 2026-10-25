// Coni-Mapas: generador de mapas de localización para investigación antártica
import { MapCtx } from './mapctx.js';
import { registerProjections, PROJECTIONS, projInfo, rotationForMeridian, lonLatTo, toLonLatFrom } from './projections.js';
import { drawOverlay, frameRect, hitTest, footprintAt, insetAt, scaleInfo, insetOutline, textPosition } from './overlay.js';
import { History, normalizeState, saveLocal, loadLocal, serializeState } from './state.js';
import { TEMPLATES, templateConi } from './templates.js';
import { renderLayersPanel } from './ui/layersPanel.js';
import { renderSitesPanel } from './ui/sitesPanel.js';
import { renderFigurePanel } from './ui/figurePanel.js';
import { renderInspector } from './ui/inspector.js';
import { openExportDialog } from './ui/exportDialog.js';
import { sourcesShort } from './caption.js';
import { siteSymbolCfg } from './layers.js';
import { el, clear, debounce, rafThrottle, uid, formatDMS, fmtInt, roundScale, downloadBlob, readFileAs, PT_MM, fmtNum } from './util.js';

class App {
  constructor() {
    this.ui = { expanded: new Set(), expandedSites: new Set(), tab: 'capas', previewZoom: 1 };
    this.selection = null;
    this.mode = null;
    this.modeDraft = null;
    this.hits = [];
    this.insetViews = new Map();
    this.loading = 0;
    this.layerErrors = new Map();
    this.history = new History();
    this.redraw = rafThrottle(() => this.drawPreviewOverlay());
    this.scheduleHistory = debounce(() => this.history.push(serializeState(this.state)), 350);
    this.scheduleSave = debounce(() => saveLocal(JSON.parse(serializeState(this.state))), 800);
    this.updateStatusSoon = debounce(() => this.updateStatus(), 120);
    this.renderLeftSoon = debounce(() => this.renderLeft(), 300);
  }

  init() {
    registerProjections();
    const saved = loadLocal();
    try { this.state = normalizeState(saved || templateConi()); } catch (e) { this.state = normalizeState(templateConi()); }
    this.$ = {
      stage: document.getElementById('stage'), pasteboard: document.getElementById('pasteboard'), paper: document.getElementById('paper'),
      mapMain: document.getElementById('map-main'), overlay: document.getElementById('overlay'), left: document.getElementById('left-body'),
      inspector: document.getElementById('inspector-body'), status: document.getElementById('statusbar'), title: document.getElementById('title'),
      projection: document.getElementById('projection'), toast: document.getElementById('toast'),
    };
    this.computePxPerMm();
    const f0 = frameRect(this.state);
    Object.assign(this.$.mapMain.style, { left: `${f0.x * this.pxPerMm}px`, top: `${f0.y * this.pxPerMm}px`, width: `${f0.w * this.pxPerMm}px`, height: `${f0.h * this.pxPerMm}px` });
    this.mainCtx = new MapCtx({ app: this, target: this.$.mapMain, role: 'main', pxPerMm: this.pxPerMm });
    this.wireMainMap();
    this.buildInsets();
    this.setupChrome();
    this.setupPointer();
    this.setupKeyboard();
    this.layout();
    this.renderLeft();
    this.renderInspector();
    this.history.push(serializeState(this.state));
    new ResizeObserver(debounce(() => this.layout(), 60)).observe(this.$.pasteboard);
    window.coniApp = this;
    if (!saved) setTimeout(() => this.toast('Proyecto de ejemplo cargado: sitios de muestreo de pingüinos. Podés cambiar todo o elegir otra plantilla en Figura › Plantillas.'), 900);
  }

  // ---------- geometría de la vista previa ----------
  computePxPerMm() {
    const pb = this.$.pasteboard;
    const availW = Math.max(200, pb.clientWidth - 48), availH = Math.max(200, pb.clientHeight - 48);
    const p = this.state.page;
    const fit = Math.min(availW / p.widthMM, availH / p.heightMM);
    this.pxPerMm = Math.max(0.5, fit * (this.ui.previewZoom || 1));
    return this.pxPerMm;
  }

  layout() {
    const s = this.computePxPerMm();
    const p = this.state.page;
    const paper = this.$.paper;
    paper.style.width = `${p.widthMM * s}px`;
    paper.style.height = `${p.heightMM * s}px`;
    paper.style.background = p.background;
    const f = frameRect(this.state);
    Object.assign(this.$.mapMain.style, { left: `${f.x * s}px`, top: `${f.y * s}px`, width: `${f.w * s}px`, height: `${f.h * s}px` });
    this.mainCtx.setPxPerMm(s);
    this.mainCtx.map.updateSize();
    this.layoutInsets();
    const dpr = window.devicePixelRatio || 1;
    const c = this.$.overlay;
    c.width = Math.round(p.widthMM * s * dpr);
    c.height = Math.round(p.heightMM * s * dpr);
    c.style.width = `${p.widthMM * s}px`;
    c.style.height = `${p.heightMM * s}px`;
    this.redraw();
    this.updateStatusSoon();
  }

  layoutInsets() {
    const s = this.pxPerMm;
    for (const z of this.state.insets) {
      const v = this.insetViews.get(z.id);
      if (!v) continue;
      Object.assign(v.el.style, {
        left: `${z.x * s}px`, top: `${z.y * s}px`, width: `${z.w * s}px`, height: `${(z.shape === 'circle' ? z.w : z.h) * s}px`,
        borderRadius: z.shape === 'circle' ? '50%' : z.shape === 'rounded' ? `${Math.min(z.w, z.h) * 0.1 * s}px` : '0',
        background: z.bg,
      });
      v.ctx.setPxPerMm(s);
      v.ctx.map.updateSize();
    }
  }

  buildInsets() {
    const ids = new Set(this.state.insets.map((z) => z.id));
    for (const [id, v] of this.insetViews) {
      if (!ids.has(id)) { v.ctx.dispose(); v.el.remove(); this.insetViews.delete(id); }
    }
    for (const z of this.state.insets) {
      if (z.shape === 'circle') z.h = z.w;
      let v = this.insetViews.get(z.id);
      if (!v) {
        const elx = el('div', { class: 'inset', dataset: { id: z.id } });
        const target = el('div', { class: 'inset-map' });
        elx.appendChild(target);
        this.$.paper.insertBefore(elx, this.$.overlay);
        Object.assign(elx.style, { left: `${z.x * this.pxPerMm}px`, top: `${z.y * this.pxPerMm}px`, width: `${z.w * this.pxPerMm}px`, height: `${z.h * this.pxPerMm}px` });
        const ctx = new MapCtx({ app: this, target, role: 'inset', insetId: z.id, pxPerMm: this.pxPerMm });
        v = { el: elx, ctx };
        this.insetViews.set(z.id, v);
        ctx.map.on('moveend', () => {
          if (ctx._applying) return;
          const zz = this.state.insets.find((x) => x.id === z.id);
          if (!zz) return;
          const r = ctx.readView();
          zz.center = r.center; zz.mpm = r.mpm;
          this.redraw();
          this.scheduleHistory(); this.scheduleSave();
        });
        ctx.map.on('postrender', () => this.redraw());
      } else {
        v.ctx.applyView();
        v.ctx.sync();
      }
    }
    // orden de apilado según el estado
    this.state.insets.forEach((z, i) => { const v = this.insetViews.get(z.id); if (v) v.el.style.zIndex = String(10 + i); });
    this.layoutInsets();
  }

  wireMainMap() {
    const m = this.mainCtx.map;
    m.on('postrender', () => this.redraw());
    m.on('moveend', () => {
      if (this.mainCtx._applying) return;
      const r = this.mainCtx.readView();
      this.state.view.center = r.center;
      this.state.view.mpm = r.mpm;
      this.state.view.rotation = r.rotation;
      this.redraw();
      this.updateStatusSoon();
      this.scheduleHistory(); this.scheduleSave();
    });
  }

  previewGeo() {
    const s = this.pxPerMm;
    const f = frameRect(this.state);
    const mk = (ctx, ox, oy) => ({
      projection: ctx.projection,
      toPage: (c) => { const px = ctx.map.getPixelFromCoordinate(c); return px ? [ox + px[0] / s, oy + px[1] / s] : null; },
      fromPage: (pt) => ctx.map.getCoordinateFromPixel([(pt[0] - ox) * s, (pt[1] - oy) * s]),
    });
    const geo = { frame: f, main: mk(this.mainCtx, f.x, f.y), insets: {} };
    for (const z of this.state.insets) {
      const v = this.insetViews.get(z.id);
      if (v && v.ctx.map.getView() && v.ctx.map.getSize()) geo.insets[z.id] = mk(v.ctx, z.x, z.y);
    }
    return geo;
  }

  drawPreviewOverlay() {
    const c = this.$.overlay;
    const ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    if (!this.mainCtx.map.getSize()) return;
    const dpr = window.devicePixelRatio || 1;
    const hits = [];
    try {
      drawOverlay(ctx, this.pxPerMm * dpr, this.previewGeo(), this.state, { preview: true, selection: this.selection, hits });
    } catch (err) {
      console.error('overlay', err);
    }
    this.hits = hits;
  }

  // ---------- cambios de estado ----------
  commit(kind = 'overlay', { history = true } = {}) {
    switch (kind) {
      case 'layers':
        this.mainCtx.sync();
        for (const v of this.insetViews.values()) v.ctx.sync();
        break;
      case 'sites':
        this.mainCtx.syncSites(); this.mainCtx.sync();
        for (const v of this.insetViews.values()) { v.ctx.syncSites(); v.ctx.sync(); }
        break;
      case 'view':
        this.mainCtx.applyView();
        for (const v of this.insetViews.values()) v.ctx.applyView();
        this.mainCtx.sync();
        for (const v of this.insetViews.values()) v.ctx.sync();
        break;
      case 'insets':
        this.buildInsets();
        break;
      case 'page':
        this.layout();
        break;
      case 'projection':
        this.mainCtx.applyView();
        this.mainCtx.sync();
        for (const v of this.insetViews.values()) { v.ctx.applyView(); v.ctx.sync(); }
        break;
      default:
        break;
    }
    this.redraw();
    this.updateStatusSoon();
    if (history) { this.scheduleHistory(); this.scheduleSave(); }
  }

  applyState() {
    for (const v of this.insetViews.values()) { v.ctx.dispose(); v.el.remove(); }
    this.insetViews.clear();
    this.selection = null;
    this.mainCtx.applyView();
    this.mainCtx.rebuildAll();
    this.mainCtx.sync();
    this.buildInsets();
    this.layout();
    this.$.title.value = this.state.title;
    this.$.projection.value = this.state.projection;
    this.renderLeft();
    this.renderInspector();
    this.redraw();
  }

  loadTemplate(id) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    this.state = normalizeState(t.build());
    this.applyState();
    this.history.push(serializeState(this.state));
    this.scheduleSave();
    this.toast(`Plantilla cargada: ${t.name}`);
  }

  undo() { const j = this.history.undo(); if (j) { this.state = normalizeState(JSON.parse(j)); this.applyState(); this.scheduleSave(); } }
  redo() { const j = this.history.redo(); if (j) { this.state = normalizeState(JSON.parse(j)); this.applyState(); this.scheduleSave(); } }

  applyOpacity(ls) {
    for (const ctx of [this.mainCtx, ...[...this.insetViews.values()].map((v) => v.ctx)]) {
      const l = ctx.olLayers.get(ls.uid);
      if (l) l.setOpacity(ls.opacity);
    }
  }

  styleChanged(ls) {
    ls._styleVersion = (ls._styleVersion || 0) + 1;
    this.commit('layers');
  }

  select(sel) {
    this.selection = sel;
    this.renderInspector();
    this.redraw();
    document.body.classList.toggle('has-selection', !!sel);
  }

  setMode(mode, draft) {
    this.mode = mode;
    this.modeDraft = draft || null;
    this.$.paper.classList.toggle('mode-add', mode === 'add-site');
    if (mode === 'add-site') this.toast('Tocá el mapa o un zoom para ubicar el sitio. Esc cancela.');
  }

  flyTo(center, mpm, rotation) {
    this.state.view.center = center;
    this.state.view.mpm = mpm;
    if (rotation !== undefined) this.state.view.rotation = rotation;
    else if (projInfo(this.state.projection).polar && this.state.projection !== 'CONI:BICONT') this.state.view.rotation = rotationForMeridian(this.mainCtx.projection, center[0], center[1]);
    this.commit('view');
    this.renderLeftSoon();
  }

  pageToLonLat(pt) {
    const geo = this.previewGeo();
    const c = geo.main.fromPage(pt);
    return c ? toLonLatFrom(this.mainCtx.projection, c) : null;
  }
  lonLatToPage(ll) {
    if (!ll || !Number.isFinite(ll[0])) return null;
    return this.previewGeo().main.toPage(lonLatTo(this.mainCtx.projection, ll));
  }

  currentScaleInfo() {
    try { return scaleInfo(this.previewGeo(), this.state); } catch (e) { return null; }
  }
  sourcesShort() { return sourcesShort(this.state); }

  // ---------- avisos ----------
  onLayerError(ls, err) {
    const prev = this.layerErrors.get(ls.uid);
    const msg = err && err.message ? err.message : String(err);
    this.layerErrors.set(ls.uid, msg);
    if (!prev || Date.now() - (this._lastErrToast || 0) > 20000) {
      this._lastErrToast = Date.now();
      this.toast(`No se pudo cargar «${ls.name}»: ${msg}. Revisá la conexión o probá más tarde.`, 'error');
    }
    this.renderLeftSoon();
  }
  onTileError() { this._tileErrors = (this._tileErrors || 0) + 1; this.updateStatusSoon(); }
  onTileLoad(d) { this.loading = Math.max(0, this.loading + d); this.updateStatusSoon(); }
  layerStatus(uid) {
    if (this.layerErrors.has(uid)) return { kind: 'error', text: this.layerErrors.get(uid) };
    return null;
  }

  toast(msg, kind = 'info') {
    const t = this.$.toast;
    const item = el('div', { class: `toast-item ${kind}`, role: kind === 'error' ? 'alert' : 'status' }, msg);
    t.appendChild(item);
    setTimeout(() => { item.classList.add('out'); setTimeout(() => item.remove(), 400); }, kind === 'error' ? 7000 : 4200);
  }

  // ---------- paneles ----------
  showTab(name) {
    this.ui.tab = name;
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    this.renderLeft();
  }
  renderLeft() {
    const root = this.$.left;
    const scroll = root.scrollTop;
    if (this.ui.tab === 'capas') renderLayersPanel(this, root);
    else if (this.ui.tab === 'sitios') renderSitesPanel(this, root);
    else renderFigurePanel(this, root);
    root.scrollTop = scroll;
  }
  renderInspector() {
    renderInspector(this, this.$.inspector);
    document.getElementById('inspector').classList.toggle('active', !!this.selection);
  }

  updateStatus() {
    const st = this.$.status;
    const info = this.currentScaleInfo();
    const scaleTxt = info && Number.isFinite(info.rf) ? `1:${fmtInt(roundScale(info.rf))}` : '—';
    st.querySelector('[data-k="scale"]').textContent = scaleTxt;
    st.querySelector('[data-k="scale"]').title = info && info.variation > 0.08 ? `La escala varía ${Math.round(info.variation * 100)}% dentro del mapa` : 'Escala en el centro del mapa, al tamaño de impresión';
    st.querySelector('[data-k="proj"]').textContent = projInfo(this.state.projection).name;
    st.querySelector('[data-k="load"]').textContent = this.loading > 0 ? `Cargando ${this.loading} teselas…` : '';
    st.querySelector('[data-k="size"]').textContent = `${fmtNum(this.state.page.widthMM, 1)} × ${fmtNum(this.state.page.heightMM, 1)} mm`;
  }

  // ---------- controles generales ----------
  setupChrome() {
    const projSel = this.$.projection;
    for (const p of PROJECTIONS) projSel.append(el('option', { value: p.code }, p.name));
    projSel.value = this.state.projection;
    projSel.addEventListener('change', () => {
      const code = projSel.value;
      this.state.projection = code;
      const info = projInfo(code);
      if (code === 'EPSG:3031' || code === 'EPSG:6932') this.state.view.rotation = rotationForMeridian(code, this.state.view.center[0], this.state.view.center[1]);
      else this.state.view.rotation = 0;
      this.mainCtx.projection = '';
      this.commit('projection');
      this.renderLeft();
      this.toast(info.detail);
    });
    this.$.title.value = this.state.title;
    this.$.title.addEventListener('change', () => { this.state.title = this.$.title.value; this.commit('overlay'); });
    document.getElementById('btn-undo').addEventListener('click', () => this.undo());
    document.getElementById('btn-redo').addEventListener('click', () => this.redo());
    document.getElementById('btn-export').addEventListener('click', () => openExportDialog(this));
    document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => this.showTab(b.dataset.tab)));
    document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
      const z = b.dataset.zoom;
      this.ui.previewZoom = z === 'fit' ? 1 : Math.max(0.5, Math.min(4, this.ui.previewZoom * (z === 'in' ? 1.25 : 0.8)));
      this.layout();
    }));
    // Menú de proyecto
    const menuBtn = document.getElementById('btn-project');
    const menu = document.getElementById('project-menu');
    menuBtn.addEventListener('click', () => { const open = menu.hasAttribute('hidden'); menu.toggleAttribute('hidden', !open); menuBtn.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== menuBtn) { menu.setAttribute('hidden', ''); menuBtn.setAttribute('aria-expanded', 'false'); } });
    menu.querySelector('[data-act="save"]').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(JSON.parse(serializeState(this.state)), null, 1)], { type: 'application/json' });
      downloadBlob(blob, `${(this.state.title || 'proyecto').replace(/[^\wáéíóúñ-]+/gi, '-').slice(0, 50)}.coni.json`);
      menu.setAttribute('hidden', '');
    });
    const openInput = document.getElementById('open-project');
    menu.querySelector('[data-act="open"]').addEventListener('click', () => { openInput.click(); menu.setAttribute('hidden', ''); });
    openInput.addEventListener('change', async () => {
      const f = openInput.files[0];
      if (!f) return;
      try {
        this.state = normalizeState(JSON.parse(await readFileAs(f, 'text')));
        this.applyState();
        this.history.push(serializeState(this.state));
        this.toast(`Proyecto abierto: ${this.state.title}`);
      } catch (err) { this.toast(`No se pudo abrir el proyecto: ${err.message}`, 'error'); }
      openInput.value = '';
    });
    menu.querySelector('[data-act="sites-geojson"]').addEventListener('click', () => {
      const fc = { type: 'FeatureCollection', features: this.state.sites.map((s) => ({ type: 'Feature', properties: { nombre: s.name, categorias: (s.cats || []).map((c) => (this.state.categories.find((k) => k.id === c) || {}).name).join('|'), nota: s.note || '' }, geometry: { type: 'Point', coordinates: [s.lon, s.lat] } })) };
      downloadBlob(new Blob([JSON.stringify(fc, null, 1)], { type: 'application/geo+json' }), 'sitios.geojson');
      menu.setAttribute('hidden', '');
    });
    menu.querySelector('[data-act="sites-csv"]').addEventListener('click', () => {
      const rows = [['nombre', 'latitud', 'longitud', 'lat_gms', 'lon_gms', 'categorias', 'nota']];
      for (const s of this.state.sites) rows.push([s.name, s.lat.toFixed(6), s.lon.toFixed(6), formatDMS(s.lat, true, { decimals: 1 }), formatDMS(s.lon, false, { decimals: 1 }), (s.cats || []).map((c) => (this.state.categories.find((k) => k.id === c) || {}).name).join('|'), s.note || '']);
      const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
      downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv' }), 'sitios.csv');
      menu.setAttribute('hidden', '');
    });
    menu.querySelectorAll('[data-tpl]').forEach((b) => b.addEventListener('click', () => { this.loadTemplate(b.dataset.tpl); menu.setAttribute('hidden', ''); }));
    // Paneles en pantallas angostas
    document.querySelectorAll('[data-toggle-panel]').forEach((b) => b.addEventListener('click', () => {
      document.body.classList.toggle(`show-${b.dataset.togglePanel}`);
    }));
  }

  // ---------- interacción con la figura ----------
  pointerMM(e) {
    const r = this.$.paper.getBoundingClientRect();
    return [(e.clientX - r.left) / this.pxPerMm, (e.clientY - r.top) / this.pxPerMm];
  }

  scopeAt(pt) {
    const z = insetAt(this.state, pt);
    const geo = this.previewGeo();
    if (z && geo.insets[z.id]) return { scope: geo.insets[z.id], insetId: z.id, ctx: this.insetViews.get(z.id).ctx };
    return { scope: geo.main, insetId: null, ctx: this.mainCtx };
  }

  siteAt(pt) {
    const { scope, insetId } = this.scopeAt(pt);
    let best = null, bestD = Infinity;
    for (const s of this.state.sites) {
      const p = scope.toPage(lonLatTo(scope.projection, [s.lon, s.lat]));
      if (!p) continue;
      const d = Math.hypot(p[0] - pt[0], p[1] - pt[1]);
      const cfg = siteSymbolCfg(s, this.state);
      const r = Math.max(2, ((cfg.size || 6) * PT_MM) / 2 + 0.8);
      if (d < r && d < bestD) { best = { kind: 'site', id: s.id, insetId }; bestD = d; }
    }
    return best;
  }

  setupPointer() {
    const paper = this.$.paper;
    let drag = null;
    paper.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const pt = this.pointerMM(e);
      if (this.mode === 'add-site') {
        const { scope } = this.scopeAt(pt);
        const c = scope.fromPage(pt);
        if (c) {
          const ll = toLonLatFrom(scope.projection, c);
          const d = this.modeDraft || {};
          const s = { id: uid('S'), name: d.name || `Sitio ${this.state.sites.length + 1}`, lon: ll[0], lat: ll[1], cats: d.cats || [], label: { show: true }, note: '' };
          this.state.sites.push(s);
          this.setMode(null);
          this.commit('sites');
          this.ui.expandedSites.add(s.id);
          this.select({ kind: 'site', id: s.id });
          this.renderLeft();
        }
        e.stopPropagation(); e.preventDefault();
        return;
      }
      let hit = hitTest(this.hits, pt, this.state, this.selection);
      if (!hit) hit = this.siteAt(pt);
      if (!hit) hit = footprintAt(this.hits, pt, this.state);
      if (!hit) { drag = { kind: 'map', start: pt, moved: false }; return; }
      e.stopPropagation(); e.preventDefault();
      paper.setPointerCapture(e.pointerId);
      const sel = hit.kind === 'footprint' || hit.kind === 'inset-resize' ? { kind: 'inset', id: hit.id } : hit.kind === 'text-rotate' ? { kind: 'text', id: hit.id } : { kind: hit.kind, id: hit.id };
      if (!this.selection || this.selection.kind !== sel.kind || this.selection.id !== sel.id) this.select(sel);
      drag = { ...hit, start: pt, last: pt, moved: false, pointerId: e.pointerId };
      if (hit.kind === 'text') {
        const t = this.state.texts.find((x) => x.id === hit.id);
        drag.origin = textPosition(this.previewGeo(), t);
      }
      if (hit.kind === 'footprint') {
        const z = this.state.insets.find((x) => x.id === hit.id);
        drag.startCoord = this.previewGeo().main.fromPage(pt);
        drag.centerMain = lonLatTo(this.mainCtx.projection, z.center);
      }
    }, true);

    paper.addEventListener('pointermove', (e) => {
      const pt = this.pointerMM(e);
      this.showCursorCoords(pt);
      if (!drag || drag.kind === 'map') { this.updateCursor(pt); if (drag && drag.kind === 'map' && Math.hypot(pt[0] - drag.start[0], pt[1] - drag.start[1]) > 0.8) drag.moved = true; return; }
      e.stopPropagation();
      const dx = pt[0] - drag.last[0], dy = pt[1] - drag.last[1];
      drag.last = pt;
      drag.moved = true;
      const st = this.state;
      const nudge = (o) => { o.x += dx; o.y += dy; };
      if (drag.kind === 'text') {
        const t = st.texts.find((x) => x.id === drag.id);
        const np = [drag.origin[0] + (pt[0] - drag.start[0]), drag.origin[1] + (pt[1] - drag.start[1])];
        if (t.anchor === 'geo') { const ll = this.pageToLonLat(np); if (ll) { t.lon = ll[0]; t.lat = ll[1]; } } else { t.x = np[0]; t.y = np[1]; }
      } else if (drag.kind === 'text-rotate') {
        const t = st.texts.find((x) => x.id === drag.id);
        const c = textPosition(this.previewGeo(), t);
        let a = (Math.atan2(pt[1] - c[1], pt[0] - c[0]) * 180) / Math.PI + 90;
        if (a > 180) a -= 360;
        if (!e.shiftKey) { const snap = Math.round(a / 15) * 15; if (Math.abs(snap - a) < 3) a = snap; }
        t.rotation = Math.round(a * 10) / 10;
      } else if (drag.kind === 'legend') nudge(st.legend);
      else if (drag.kind === 'north') nudge(st.north);
      else if (drag.kind === 'scale') nudge(st.scalebar);
      else if (drag.kind === 'inset') {
        const z = st.insets.find((x) => x.id === drag.id);
        nudge(z);
        this.layoutInsets();
      } else if (drag.kind === 'inset-resize') {
        const z = st.insets.find((x) => x.id === drag.id);
        if (z.shape === 'circle') { const d = Math.max(10, Math.max(pt[0] - z.x, pt[1] - z.y) - 1); z.w = d; z.h = d; }
        else { z.w = Math.max(10, pt[0] - z.x - 1); z.h = Math.max(10, pt[1] - z.y - 1); }
        this.layoutInsets();
      } else if (drag.kind === 'footprint') {
        const z = st.insets.find((x) => x.id === drag.id);
        const cur = this.previewGeo().main.fromPage(pt);
        if (cur && drag.startCoord) {
          const nc = [drag.centerMain[0] + (cur[0] - drag.startCoord[0]), drag.centerMain[1] + (cur[1] - drag.startCoord[1])];
          z.center = toLonLatFrom(this.mainCtx.projection, nc);
          const v = this.insetViews.get(z.id);
          if (v) v.ctx.applyView();
        }
      } else if (drag.kind === 'site') {
        const s = st.sites.find((x) => x.id === drag.id);
        const { scope } = this.scopeAt(pt);
        const c = scope.fromPage(pt);
        if (c) {
          const ll = toLonLatFrom(scope.projection, c);
          s.lon = ll[0]; s.lat = ll[1];
        }
      }
      this.redraw();
    }, true);

    const end = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (d.kind === 'map') {
        if (!d.moved && this.selection) this.select(null);
        return;
      }
      try { paper.releasePointerCapture(d.pointerId); } catch (err) { /* noop */ }
      if (d.moved) {
        if (d.kind === 'site') this.commit('sites');
        else if (d.kind === 'inset-resize' || d.kind === 'inset') { this.layoutInsets(); this.commit('overlay'); }
        else this.commit('overlay');
        this.renderInspector();
        if (d.kind === 'site') this.renderLeftSoon();
      }
    };
    paper.addEventListener('pointerup', end, true);
    paper.addEventListener('pointercancel', end, true);
    paper.addEventListener('dblclick', (e) => {
      const pt = this.pointerMM(e);
      const hit = hitTest(this.hits, pt, this.state, this.selection);
      if (hit && hit.kind === 'text') {
        e.stopPropagation(); e.preventDefault();
        this.select({ kind: 'text', id: hit.id });
        const ta = document.querySelector('#inspector-body textarea[data-focus="text"]');
        if (ta) { ta.focus(); ta.select(); }
      }
    }, true);
    paper.addEventListener('pointerleave', () => { this.$.status.querySelector('[data-k="coord"]').textContent = ''; });
  }

  updateCursor(pt) {
    const paper = this.$.paper;
    if (this.mode === 'add-site') { paper.style.cursor = 'crosshair'; return; }
    const hit = hitTest(this.hits, pt, this.state, this.selection) || this.siteAt(pt) || footprintAt(this.hits, pt, this.state);
    let cur = '';
    if (hit) cur = hit.kind === 'inset-resize' ? 'nwse-resize' : hit.kind === 'text-rotate' ? 'alias' : 'move';
    paper.style.cursor = cur;
  }

  showCursorCoords(pt) {
    const { scope } = this.scopeAt(pt);
    const c = scope.fromPage(pt);
    const out = this.$.status.querySelector('[data-k="coord"]');
    if (!c) { out.textContent = ''; return; }
    const ll = toLonLatFrom(scope.projection, c);
    if (!ll || !Number.isFinite(ll[0])) { out.textContent = ''; return; }
    out.textContent = `${formatDMS(ll[1], true)}  ${formatDMS(ll[0], false)}   (${ll[1].toFixed(4)}, ${ll[0].toFixed(4)})`;
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); return; }
      if (typing) return;
      if (e.key === 'Escape') { if (this.mode) { this.setMode(null); this.renderLeft(); } else this.select(null); return; }
      const sel = this.selection;
      if (!sel) return;
      const st = this.state;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (sel.kind === 'text') st.texts = st.texts.filter((t) => t.id !== sel.id);
        else if (sel.kind === 'inset') st.insets = st.insets.filter((t) => t.id !== sel.id);
        else if (sel.kind === 'site') st.sites = st.sites.filter((t) => t.id !== sel.id);
        else if (sel.kind === 'legend') st.legend.show = false;
        else if (sel.kind === 'north') st.north.show = false;
        else if (sel.kind === 'scale') st.scalebar.show = false;
        this.select(null);
        this.commit(sel.kind === 'inset' ? 'insets' : sel.kind === 'site' ? 'sites' : 'overlay');
        this.renderLeft();
        return;
      }
      const step = e.shiftKey ? 5 : 0.5;
      const dirs = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (dirs[e.key]) {
        e.preventDefault();
        const [dx, dy] = dirs[e.key];
        let o = null;
        if (sel.kind === 'text') { const t = st.texts.find((x) => x.id === sel.id); if (t && t.anchor === 'page') o = t; else if (t) { const p = this.lonLatToPage([t.lon, t.lat]); const ll = p && this.pageToLonLat([p[0] + dx, p[1] + dy]); if (ll) { t.lon = ll[0]; t.lat = ll[1]; } } }
        else if (sel.kind === 'legend') o = st.legend;
        else if (sel.kind === 'north') o = st.north;
        else if (sel.kind === 'scale') o = st.scalebar;
        else if (sel.kind === 'inset') o = st.insets.find((x) => x.id === sel.id);
        if (o) { o.x += dx; o.y += dy; }
        if (sel.kind === 'inset') this.layoutInsets();
        this.commit('overlay');
        this.renderInspector();
      }
    });
  }
}

const app = new App();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => app.init());
else app.init();
