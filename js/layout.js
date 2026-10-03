/* La Súper Liga · layout.js
   Editor visual de diseño. Se descarga solo cuando el admin toca "Diseño visual" en la barra de edición.
   Toca un bloque → barra flotante (fondo, texto, escala, ocultar) + tiradores para estirar.
   Solo toca estilos (design.layout): no cambia partidos, noticias ni ningún dato.
   Los bloques y el CSS que se genera viven en app.js (LSL.layoutReg / LSL.setLayout) para que
   los cambios guardados los vea todo el público sin descargar este archivo. */
(function (w) {
  'use strict';
  var LSL = w.LSL, S = LSL.store, U = LSL.u, esc = U.esc, UI = LSL.ui, ic = UI.ic, doc = document, html = doc.documentElement;
  var REG = LSL.layoutReg;
  var LE = LSL.layoutEditor = {};
  var on = false, draft = {}, saved = {}, sel = null, el = null, ui = null, tb = null, hd = null, bar = null, drag = null, raf = 0;

  /* ---------- datos ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o || {})); }
  function get(k) { return draft[k] || (draft[k] = {}); }
  function clean() { Object.keys(draft).forEach(function (k) { if (!Object.keys(draft[k]).length) delete draft[k]; }); }
  function live() { LSL.setLayout(draft); place(); }
  function hex(v) { return U.hexOr(v, ''); }

  /* ---------- qué bloque tocó ---------- */
  function pick(t) {
    var hits = [];
    REG.forEach(function (r) { var n = t.closest(r.sel); if (n) hits.push({ r: r, n: n }); });
    if (!hits.length) return null;
    var best = hits[0];
    hits.forEach(function (h) { if (best.n !== h.n && best.n.contains(h.n)) best = h; });   // el más interno
    return best;
  }

  /* ---------- selección, marco y tiradores ---------- */
  function select(h) {
    sel = h ? h.r : null; el = h ? h.n : null;
    if (!sel) { hideUI(); return; }
    showUI();
  }
  function hideUI() { if (ui) ui.hidden = true; }
  function build() {
    if (ui) return;
    ui = doc.createElement('div'); ui.className = 'lay-ui lay-frame'; ui.hidden = true;
    ui.innerHTML = '<i class="lay-h tl" data-h="s"></i><i class="lay-h tr" data-h="s"></i><i class="lay-h bl" data-h="s"></i><i class="lay-h br" data-h="s"></i>' +
      '<i class="lay-h bm" data-h="v" title="Alto"></i><i class="lay-h rm" data-h="x" title="Ancho"></i>';
    doc.body.appendChild(ui);
    tb = doc.createElement('div'); tb.className = 'lay-ui lay-tb'; tb.hidden = true; doc.body.appendChild(tb);
    bar = doc.createElement('div'); bar.className = 'lay-ui lay-bar';
    bar.innerHTML = '<button class="btn sm ghost" data-l="cancel">Cancelar</button><span class="lay-hint">Tocá un bloque para editarlo</span><button class="btn sm" data-l="save">Guardar cambios</button>';
    doc.body.appendChild(bar);
    ui.addEventListener('pointerdown', down);
    [tb, bar].forEach(function (n) { n.addEventListener('click', onTool); n.addEventListener('input', onInput); });
  }
  function showUI() { ui.hidden = false; tb.hidden = false; paintTb(); place(); }

  function place() {
    if (!on || !sel || !ui) return;
    if (!el || !el.isConnected) { el = doc.querySelector(sel.sel); if (!el) { ui.hidden = true; tb.hidden = true; return; } }
    ui.hidden = false; ui.classList.toggle('only-v', !!sel.fixed);
    var r = el.getBoundingClientRect(), W = w.innerWidth, H = w.innerHeight;
    ui.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    var th = tb.offsetHeight || 150, y = r.top - th - 10;
    if (y < 56) y = Math.min(r.bottom + 10, H - th - 70);
    tb.style.top = Math.max(56, y) + 'px';
    tb.style.left = Math.max(8, Math.min(r.left + r.width / 2 - tb.offsetWidth / 2, W - tb.offsetWidth - 8)) + 'px';
  }
  function sched() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; place(); }); }

  /* ---------- barra flotante ---------- */
  function paintTb() {
    if (!sel) return;
    var c = get(sel.key), bg = hex(c.bg) || '#0B1E33', fg = hex(c.color) || '#EAF4FA';
    tb.innerHTML = '<div class="lay-t"><b>' + esc(sel.label) + '</b><span>' + (c.hide ? 'Oculto' : '') + '</span></div>' +
      '<div class="lay-r"><label>Fondo<input type="color" data-i="bg" value="' + bg + '"><input type="text" class="fld" data-i="bgx" maxlength="7" placeholder="#HEX" value="' + esc(hex(c.bg)) + '"></label>' +
      '<label>Texto<input type="color" data-i="color" value="' + fg + '"><input type="text" class="fld" data-i="colorx" maxlength="7" placeholder="#HEX" value="' + esc(hex(c.color)) + '"></label></div>' +
      '<div class="lay-r">' + (sel.key === 'top' ? '<span class="lay-sc"><button data-l="h-" aria-label="Achicar">−</button><b>Alto ' + (c.h || 52) + '</b><button data-l="h+" aria-label="Agrandar">+</button></span>' : sel.fixed ? '' : '<span class="lay-sc"><button data-l="sc-" aria-label="Achicar">−</button><b>' + Math.round((c.scale || 1) * 100) + '%</b><button data-l="sc+" aria-label="Agrandar">+</button></span>') +
      (sel.fixed ? '' : '<button class="lay-b" data-l="hide">' + (c.hide ? 'Mostrar' : 'Ocultar') + '</button>') +
      '<button class="lay-b" data-l="reset">Restablecer</button></div>';
    place();
  }
  function setProp(k, v) {
    var c = get(sel.key);
    if (v === '' || v == null || v === false) delete c[k]; else c[k] = v;
    clean(); live();
  }
  function onInput(e) {
    var i = e.target.getAttribute && e.target.getAttribute('data-i'); if (!i || !sel) return;
    var v = e.target.value;
    if (i === 'bg' || i === 'color') {
      setProp(i, hex(v));
      var t = tb.querySelector('[data-i="' + i + 'x"]'); if (t) t.value = hex(v);
    } else if (i === 'bgx' || i === 'colorx') {
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { var k = i.slice(0, -1); setProp(k, hex(v)); var p = tb.querySelector('[data-i="' + k + '"]'); if (p) p.value = hex(v); }
      else if (v === '') setProp(i.slice(0, -1), '');
    }
  }
  function onTool(e) {
    var b = e.target.closest('[data-l]'); if (!b) return;
    var a = b.getAttribute('data-l');
    if (a === 'cancel') return stop(false);
    if (a === 'save') return save();
    if (!sel) return;
    var c = get(sel.key);
    if (a === 'h+' || a === 'h-') { var cc = get(sel.key), nh = Math.max(40, Math.min(220, (cc.h || 52) + (a === 'h+' ? 4 : -4))); if (nh === 52) delete cc.h; else cc.h = nh; clean(); live(); paintTb(); return; }
    if (a === 'sc+' || a === 'sc-') { var s = Math.round(((c.scale || 1) + (a === 'sc+' ? .05 : -.05)) * 100) / 100; s = Math.max(.6, Math.min(1.6, s)); setProp('scale', s === 1 ? '' : s); paintTb(); }
    else if (a === 'hide') { setProp('hide', !c.hide); paintTb(); }
    else if (a === 'reset') { delete draft[sel.key]; live(); paintTb(); }
  }

  /* ---------- tiradores: esquinas = escala, abajo = alto, derecha = ancho ---------- */
  function down(e) {
    var h = e.target.closest('[data-h]'); if (!h || !sel || !el) return;
    e.preventDefault();
    var r = el.getBoundingClientRect(), c = get(sel.key);
    drag = { t: h.getAttribute('data-h'), x: e.clientX, y: e.clientY, w: r.width, h: r.height, s: c.scale || 1, hh: c.h || 0, ww: c.w || 100, id: e.pointerId, left: h.classList.contains('tl') || h.classList.contains('bl') };
    try { h.setPointerCapture(e.pointerId); } catch (x) { }
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
  }
  function move(e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y, c = get(sel.key);
    if (drag.t === 's' && !sel.fixed) {
      var d = ((drag.left ? -dx : dx) + dy) / 2, s = Math.max(.6, Math.min(1.6, drag.s * (1 + d / Math.max(120, drag.w))));
      s = Math.round(s * 100) / 100; if (Math.abs(s - 1) < .02) s = 1;
      if (s === 1) delete c.scale; else c.scale = s;
    } else if (drag.t === 'v' && sel.key === 'top') {
      var sat = parseFloat(w.getComputedStyle(el).paddingTop) || 0, th2 = Math.max(40, Math.min(220, Math.round(drag.h - sat + dy)));
      if (th2 === 52) delete c.h; else c.h = th2;
    } else if (drag.t === 'v' && !sel.fixed) {
      var hh = Math.max(0, Math.min(600, Math.round((drag.h + dy) / (c.scale || 1))));
      if (hh < 24) delete c.h; else c.h = hh;
    } else if (drag.t === 'x' && !sel.fixed) {
      var ww = Math.max(50, Math.min(100, Math.round(drag.ww * (drag.w + dx) / drag.w)));
      if (ww >= 100) delete c.w; else c.w = ww;
    }
    clean(); live();
  }
  function up(e) {
    var h = e.target; h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
    drag = null; paintTb();
  }

  /* ---------- tocar para elegir (frena el comportamiento normal de la página) ---------- */
  function capture(e) {
    if (!on) return;
    if (e.target.closest('.lay-ui')) return;
    e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (e.type === 'click') select(pick(e.target));
  }
  var BLOCK = ['click', 'auxclick', 'contextmenu', 'dblclick'];

  /* ---------- ciclo ---------- */
  LE.start = function () {
    if (on) return;
    build(); on = true; saved = clone(S.state.design.layout); draft = clone(saved);
    html.classList.add('lay-on'); bar.hidden = false;
    BLOCK.forEach(function (t) { doc.addEventListener(t, capture, true); });
    w.addEventListener('scroll', sched, { passive: true }); w.addEventListener('resize', sched);
    LSL.pushLayer(function () { stop(false, true); });
    var eb = doc.querySelector('.edt-bar'); if (eb) eb.classList.add('edt-bar-hide');
    UI.toast('Diseño visual: tocá un bloque', 2200);
  };
  function stop(keep, fromPop) {
    if (!on) return;
    on = false; sel = null; el = null; drag = null;
    html.classList.remove('lay-on');
    BLOCK.forEach(function (t) { doc.removeEventListener(t, capture, true); });
    w.removeEventListener('scroll', sched); w.removeEventListener('resize', sched);
    if (!keep) LSL.setLayout(saved);                                   // cancelar = vuelve a lo guardado
    [ui, tb, bar].forEach(function (n) { if (n) n.remove(); }); ui = tb = bar = null;
    var eb = doc.querySelector('.edt-bar'); if (eb) eb.classList.remove('edt-bar-hide');
    if (!fromPop) LSL.popLayer();
  }
  function save() {
    clean(); var out = clone(draft);
    S.commit(function (st) { st.design.layout = out; });
    UI.toast('Diseño guardado');
    stop(true);
  }
  LE.stop = function () { stop(false); };
})(window);
