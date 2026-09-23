/* La Súper Liga · edit.js
   Editor de "toque largo": disponible SOLO cuando el panel admin está abierto
   (LSL.adminOpen === true). Mantené presionado 600ms sobre un elemento marcado
   con data-edit="..." para abrir un panel chico y cambiarlo ahí mismo.
   Se descarga en diferido, junto con admin.js — no pesa nada para el público. */
(function (w) {
  'use strict';
  var LSL = w.LSL, S = LSL.store, U = LSL.u, esc = U.esc, UI = LSL.ui, ic = UI.ic;
  var doc = document;
  var HOLD_MS = 600, MOVE_TOL = 10;
  var pressTimer = null, pressEl = null, startX = 0, startY = 0, longFired = false;
  var sheetEl = null;

  /* ---------- diccionario: qué es editable y cómo se lee/escribe ---------- */
  // get(): valor actual. set(v): guarda. kind: 'text' | 'color' | 'image'.
  function defFor(key) {
    var L = S.state.league, D = S.state.design;
    if (key === 'league.name') return { label: 'Nombre de la liga', kind: 'text', max: 40, get: function () { return L.name; }, set: function (v) { S.commit(function (st) { st.league.name = v; }); } };
    if (key === 'league.tagline') return { label: 'Eslogan (debajo del nombre)', kind: 'text', max: 30, allowEmpty: true, get: function () { return L.tagline; }, set: function (v) { S.commit(function (st) { st.league.tagline = v; }); } };
    if (key === 'league.logo') return { label: 'Logo de la liga', kind: 'image', max: 300, get: function () { return L.logo; }, set: function (v) { S.commit(function (st) { st.league.logo = v; }); } };
    if (key === 'nav.menuBtn') return { label: 'Botón de menú (☰)', kind: 'color2', get: function () { return D.accent; }, set: function (v) { S.commit(function (st) { st.design.accent = v; }); }, info: 'Este botón usa el color principal del sitio. Para cambiarlo del todo, andá a Diseño → Colores.' };
    if (key.indexOf('nav.label.') === 0) {
      var nk = key.slice('nav.label.'.length);
      return { label: 'Texto del botón de navegación', kind: 'text', max: 14, get: function () { return (D.navLabels || {})[nk] || defaultNavLabel(nk); }, set: function (v) { S.commit(function (st) { st.design.navLabels = st.design.navLabels || {}; st.design.navLabels[nk] = v; }); }, resettable: true, reset: function () { S.commit(function (st) { if (st.design.navLabels) delete st.design.navLabels[nk]; }); } };
    }
    if (key.indexOf('drawer.label.') === 0) {
      var dk = key.slice('drawer.label.'.length);
      return { label: 'Texto del menú lateral', kind: 'text', max: 28, get: function () { return (D.drawerLabels || {})[dk] || defaultDrawerLabel(dk); }, set: function (v) { S.commit(function (st) { st.design.drawerLabels = st.design.drawerLabels || {}; st.design.drawerLabels[dk] = v; }); }, resettable: true, reset: function () { S.commit(function (st) { if (st.design.drawerLabels) delete st.design.drawerLabels[dk]; }); } };
    }
    if (key === 'drawer.footer') return { label: 'Texto del pie del menú', kind: 'text', max: 40, get: function () { return (D.drawerLabels || {}).footer || (L.name + ' · v2.0'); }, set: function (v) { S.commit(function (st) { st.design.drawerLabels = st.design.drawerLabels || {}; st.design.drawerLabels.footer = v; }); }, resettable: true, reset: function () { S.commit(function (st) { if (st.design.drawerLabels) delete st.design.drawerLabels.footer; }); } };
    return null;
  }
  function defaultNavLabel(k) { return { home: 'Inicio', league: 'Liga', matches: 'Partidos', news: 'Noticias', profile: 'Perfil' }[k] || k; }
  function defaultDrawerLabel(k) { return { about: 'Sobre la liga', rules: 'Reglamento', sanc: 'Sanciones', share: 'Compartir', install: 'Instalar en el celular', push: 'Notificaciones', tour: 'Ver tutorial', updcheck: 'Buscar actualizaciones' }[k] || k; }

  /* ---------- UI: hoja de edición ---------- */
  function closeSheet() {
    if (!sheetEl) return;
    var s = sheetEl; sheetEl = null;
    s.classList.remove('on');
    var bar = doc.querySelector('.edt-bar'); if (bar) bar.classList.remove('edt-bar-hide');
    setTimeout(function () { s.remove(); }, 200);
  }
  function openSheet(key) {
    closeSheet();
    var def = defFor(key); if (!def) return;
    var val = def.get() || '';
    var s = doc.createElement('div'); s.className = 'edt-sheet';
    var body = '';
    if (def.kind === 'text') {
      body = '<label class="fl"><span class="fl-t">' + esc(def.label) + '</span><input class="fld" id="edt-in" type="text" maxlength="' + (def.max || 60) + '" value="' + esc(val) + '" placeholder="' + (def.allowEmpty ? '(vacío = no se muestra)' : '') + '"></label>';
    } else if (def.kind === 'color2') {
      var hv = U.hexOr(val, '#27C4C9');
      body = '<p class="mut sm">' + esc(def.info || '') + '</p><label class="fl"><span class="fl-t">' + esc(def.label) + '</span><div class="clrf"><input class="fld clrp" type="color" id="edt-clr" value="' + hv + '"><input class="fld clrh" type="text" id="edt-clrh" maxlength="7" value="' + hv + '"></div></label>';
    } else if (def.kind === 'image') {
      body = '<span class="fl-t">' + esc(def.label) + '</span><div class="imgf" id="edt-imgf">' + (val ? '<img class="imgf-p" src="' + esc(val) + '" alt="">' : '<span class="imgf-e">Sin imagen</span>') +
        '<div class="imgf-b"><label class="btn sm ghost">' + (val ? 'Cambiar' : 'Elegir') + '<input type="file" accept="image/*" id="edt-file" hidden></label>' + (val ? '<button class="btn sm ghost" id="edt-imgclear">Quitar</button>' : '') + '</div></div>';
    }
    s.innerHTML = '<div class="edt-scrim" id="edt-scrim"></div><div class="edt-c">' +
      '<div class="edt-grab"></div><h3>Editar</h3>' + body +
      '<div class="edt-btns">' + (def.resettable ? '<button class="btn ghost sm" id="edt-reset">Restablecer</button>' : '<span></span>') + '<button class="btn" id="edt-save">Guardar</button></div></div>';
    doc.body.appendChild(s); sheetEl = s;
    void s.offsetWidth; s.classList.add('on');
    var bar = doc.querySelector('.edt-bar'); if (bar) bar.classList.add('edt-bar-hide');

    var pendingImg = null;
    function $(sel) { return s.querySelector(sel); }
    s.addEventListener('click', function (e) {
      if (e.target.id === 'edt-scrim') return closeSheet();
      if (e.target.id === 'edt-save') {
        if (def.kind === 'text') {
          var v = $('#edt-in').value.trim();
          if (!def.allowEmpty && !v) { LSL.toast('Este campo no puede quedar vacío.'); return; }
          def.set(v);
        } else if (def.kind === 'color2') {
          def.set($('#edt-clrh').value.toUpperCase());
        } else if (def.kind === 'image') {
          def.set(pendingImg === null ? val : pendingImg);
        }
        closeSheet(); LSL.toast('Guardado');
      }
      if (e.target.id === 'edt-reset') { def.reset(); closeSheet(); LSL.toast('Restablecido'); }
      if (e.target.id === 'edt-imgclear') { pendingImg = ''; var box = $('#edt-imgf'); box.innerHTML = '<span class="imgf-e">Sin imagen</span><div class="imgf-b"><label class="btn sm ghost">Elegir<input type="file" accept="image/*" id="edt-file" hidden></label></div>'; }
    });
    s.addEventListener('change', function (e) {
      if (e.target.id !== 'edt-file') return;
      var file = e.target.files && e.target.files[0]; if (!file) return;
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = def.max || 240, r = Math.min(1, max / Math.max(img.width, img.height));
        var cw = Math.max(1, Math.round(img.width * r)), ch = Math.max(1, Math.round(img.height * r));
        var c = doc.createElement('canvas'); c.width = cw; c.height = ch; c.getContext('2d').drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        var out; try { out = c.toDataURL('image/webp', .82); if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/png'); } catch (er) { out = c.toDataURL('image/png'); }
        pendingImg = out;
        var box = $('#edt-imgf'); box.innerHTML = '<img class="imgf-p" src="' + esc(out) + '" alt=""><div class="imgf-b"><label class="btn sm ghost">Cambiar<input type="file" accept="image/*" id="edt-file" hidden></label><button class="btn sm ghost" id="edt-imgclear">Quitar</button></div>';
      };
      img.src = url;
    });
    if (def.kind === 'color2') {
      s.addEventListener('input', function (e) {
        if (e.target.id === 'edt-clr') { $('#edt-clrh').value = e.target.value.toUpperCase(); }
        if (e.target.id === 'edt-clrh') { var h = U.hexn(e.target.value); if (h) $('#edt-clr').value = h; }
      });
    }
    setTimeout(function () { var f = $('#edt-in'); if (f) { f.focus(); f.select(); } }, 260);
  }

  /* ---------- detección de long-press (solo con el panel admin abierto) ---------- */
  function findTarget(e) {
    var t = e.target.closest && e.target.closest('[data-edit]');
    return t || null;
  }
  function onStart(e) {
    if (!LSL.editMode) return;                       // solo activo en modo edición (panel admin minimizado)
    var t = findTarget(e); if (!t) return;
    var p = e.touches ? e.touches[0] : e;
    startX = p.clientX; startY = p.clientY; longFired = false; pressEl = t;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(function () {
      longFired = true;
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (er) { }
      openSheet(t.getAttribute('data-edit'));
    }, HOLD_MS);
  }
  function onMove(e) {
    if (!pressEl) return;
    var p = e.touches ? e.touches[0] : e;
    if (Math.abs(p.clientX - startX) > MOVE_TOL || Math.abs(p.clientY - startY) > MOVE_TOL) cancelPress();
  }
  function cancelPress() { clearTimeout(pressTimer); pressEl = null; }
  function onEnd(e) {
    if (longFired && pressEl) {
      // absorbe el click/tap que sigue al long-press para no disparar la acción normal del botón
      e.preventDefault(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); e.stopPropagation();
    }
    cancelPress();
  }
  doc.addEventListener('touchstart', onStart, { passive: true });
  doc.addEventListener('touchmove', onMove, { passive: true });
  doc.addEventListener('touchend', onEnd, true);
  doc.addEventListener('touchcancel', cancelPress, true);
  doc.addEventListener('mousedown', onStart);
  doc.addEventListener('mousemove', onMove);
  doc.addEventListener('mouseup', onEnd, true);
  doc.addEventListener('click', function (e) { if (longFired) { e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); longFired = false; } }, true);
  doc.addEventListener('contextmenu', function (e) { if (LSL.editMode && findTarget(e)) e.preventDefault(); });

  LSL.editTouch = { close: closeSheet };
})(window);
