/* La Súper Liga · onboard.js
   Registro obligatorio (nombre → foto → equipo), edición del perfil y tutorial con foco.
   Se descarga solo cuando hace falta (primera vez, "Ver tutorial" o editar el perfil). */
(function (w) {
  'use strict';
  var LSL = w.LSL, S = LSL.store, U = LSL.u, UI = LSL.ui, esc = U.esc, ic = UI.ic, doc = document, root = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var OB = LSL.onboard = {};
  var K_OB = 'lsl:ob';
  var obRoot = doc.getElementById('ob-root'), trRoot = doc.getElementById('tour-root');
  function lite() { return root.getAttribute('data-perf') === 'lite'; }

  /* =====================  REGISTRO / EDICIÓN  ===================== */
  var st = null;   // { mode:'first'|'edit', step, name, photo, team, cropping, src, done, layer }

  function steps() { return ['name', 'photo'].concat(S.state.teams.length ? ['team'] : []); }
  function cleanName(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function nameState(v) {
    v = cleanName(v);
    if (!v) return ['', 'De 2 a 20 caracteres.'];
    if (v.length < 2) return ['bad', 'Muy corto: mínimo 2 caracteres.'];
    var ok; try { ok = /^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(v); } catch (e) { ok = /^[\w][\w ._-]*$/.test(v); }
    if (!ok) return ['bad', 'Solo letras, números, espacios y . _ -'];
    return ['ok', 'Así te van a ver los demás.'];
  }
  function persist() { if (st && st.mode === 'first' && !st.done) LSL.ls.set(K_OB, { step: st.step, name: st.name, photo: st.photo, team: st.team }); }

  /* ----- botón "atrás" del celular dentro del registro ----- */
  function pushBack() { if (st) { st.layer = true; LSL.pushLayer(onBack); } }
  function onBack() {
    if (!st) return;
    st.layer = false;
    if (st.mode === 'edit') return closeOb();
    if (st.cropping) { st.cropping = false; render(); return pushBack(); }
    if (st.done) return pushBack();
    var sts = steps(), i = sts.indexOf(st.step);
    if (i > 0) { st.step = sts[i - 1]; persist(); render(); } else UI.toast('Primero completá tu perfil para entrar');
    pushBack();
  }
  function closeOb(after) {
    var s = st; st = null;
    obRoot.innerHTML = '';
    if (s && s.layer) LSL.popLayer();
    if (after) after();
  }

  /* ----- pantallas ----- */
  function stepName(lbl) {
    return '<div class="ob-c"><p class="ob-k">' + lbl + '</p><h1 class="ob-h">¿Cómo te llamás?</h1>' +
      '<p class="ob-p">Elegí el nombre de usuario con el que te van a ver en La Súper Liga.</p>' +
      '<div class="ob-f"><input id="ob-name" class="ob-in" type="text" maxlength="20" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" placeholder="Tu nombre" value="' + esc(st.name) + '" aria-label="Nombre de usuario"><p class="ob-e" id="ob-err"></p></div></div>';
  }
  function stepPhoto(lbl) {
    if (st.cropping) {
      return '<div class="ob-c"><p class="ob-k">' + lbl + '</p><h1 class="ob-h sm">Encuadrá tu foto</h1><p class="ob-p">Arrastrá para moverla y usá el control para acercar.</p>' +
        '<canvas id="ob-cv" width="260" height="260"></canvas><input id="ob-z" type="range" min="100" max="300" value="100" aria-label="Zoom"></div>';
    }
    return '<div class="ob-c"><p class="ob-k">' + lbl + '</p><h1 class="ob-h">Ponele cara a tu perfil</h1><p class="ob-p">Subí una foto o sacate una ahora. Podés cambiarla cuando quieras.</p>' +
      '<div class="ob-av">' + UI.avatar({ name: st.name, photo: st.photo }, 172) + '<span class="ob-cam">' + ic('camera') + '</span></div>' +
      '<div class="ob-pick"><label class="btn ghost">' + ic('gallery') + 'Galería<input id="ob-f1" type="file" accept="image/*"></label>' +
      '<label class="btn ghost">' + ic('camera') + 'Cámara<input id="ob-f2" type="file" accept="image/*" capture="user"></label></div></div>';
  }
  function stepTeam(lbl) {
    var rows = S.standings(), pos = {};
    rows.forEach(function (r, i) { pos[r.id] = { i: i + 1, pts: r.pts }; });
    var ts = S.state.teams.slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    return '<div class="ob-c"><p class="ob-k">' + lbl + '</p><h1 class="ob-h">Elegí tu equipo</h1><p class="ob-p">Vamos a resaltar sus partidos y su lugar en la tabla.</p>' +
      '<div class="tg">' + ts.map(function (t, k) {
        var p = pos[t.id];
        return '<button class="tt' + (t.id === st.team ? ' on' : '') + '" data-t="' + esc(t.id) + '" style="--c1:' + esc(t.color || '#27C4C9') + ';--i:' + k + '">' + UI.crest(t, 'l') +
          '<b>' + esc(t.name) + '</b><small>' + (p ? p.i + '° · ' + p.pts + ' pts' : '&nbsp;') + '</small><span class="ok">' + ic('check') + '</span></button>';
      }).join('') + '</div></div>';
  }
  function confetti() {
    if (lite()) return '';
    var cols = ['#27C4C9', '#FFD226', '#FF5468', '#FFFFFF', '#8E7CFF'], h = '<div class="cf">';
    for (var i = 0; i < 28; i++) h += '<i style="--x:' + Math.round(Math.random() * 100) + '%;--c:' + cols[i % 5] + ';--d:' + (Math.random() * 0.55).toFixed(2) + 's"></i>';
    return h + '</div>';
  }
  function stepDone() {
    var t = S.team(st.team);
    return confetti() + '<div class="ob-c ob-done"><div class="dn-av">' + UI.avatar({ name: st.name, photo: st.photo }, 150) + (t ? '<span class="dn-tm">' + UI.crest(t, 'l') + '</span>' : '') + '</div>' +
      '<p class="ob-k">Todo listo</p><h1 class="ob-h">¡Bienvenido, ' + esc(st.name) + '!</h1><p class="ob-p">Ya sos parte de La Súper Liga. Ahora te muestro cómo funciona todo.</p></div>';
  }

  function render() {
    if (!st) return;
    if (!$('.ob', obRoot)) obRoot.innerHTML = '<div class="ob" role="dialog" aria-modal="true"><div class="ob-bg"></div><header class="ob-top"></header><div class="ob-body" id="ob-body"></div><div class="ob-a" id="ob-foot"></div></div>';
    var body = $('#ob-body'), foot = $('#ob-foot'), tp = $('.ob-top'), sts = steps(), i = sts.indexOf(st.step), first = st.mode === 'first';
    var lbl = first ? 'Paso ' + (i + 1) + ' de ' + sts.length : 'Editar perfil';
    if (first) {
      tp.innerHTML = '<button class="ib" data-ob-back aria-label="Volver" style="' + ((i < 1 && !st.cropping) || st.done ? 'visibility:hidden' : '') + '">' + ic('chev-l') + '</button>' +
        '<div class="ob-dots">' + sts.map(function (s, k) { return '<i' + (st.done || k <= i ? ' class="on"' : '') + '></i>'; }).join('') + '</div><span class="ib" style="visibility:hidden"></span>';
    } else {
      tp.innerHTML = '<button class="ib" data-ob-x aria-label="Cerrar">' + ic('close') + '</button><span class="ob-ttl">' + { name: 'Nombre', photo: 'Foto', team: 'Equipo' }[st.step] + '</span><span class="ib" style="visibility:hidden"></span>';
    }
    if (st.done) {
      body.innerHTML = stepDone();
      foot.innerHTML = '<button class="btn ob-btn" data-ob-go>Empezar</button>';
      return;
    }
    body.innerHTML = st.step === 'name' ? stepName(lbl) : st.step === 'photo' ? stepPhoto(lbl) : stepTeam(lbl);
    body.scrollTop = 0;
    var label = !first ? 'Guardar' : (i === sts.length - 1 ? 'Terminar' : 'Continuar');
    if (st.cropping) foot.innerHTML = '<button class="btn ghost ob-btn" data-ob-cropno>Cancelar</button><button class="btn ob-btn" data-ob-cropok>Usar esta foto</button>';
    else foot.innerHTML = '<button class="btn ob-btn" id="ob-next" data-ob-next disabled>' + label + '</button>';
    if (st.step === 'name') { checkName(); setTimeout(function () { var el = $('#ob-name'); if (el) el.focus(); }, 300); }
    else if (st.step === 'photo' && !st.cropping) checkNext();
    else if (st.step === 'team') checkNext();
    if (st.cropping) bindCrop();
  }

  function checkName() {
    var v = $('#ob-name') ? $('#ob-name').value : st.name, s = nameState(v), e = $('#ob-err'), n = $('#ob-next');
    if (e) { e.className = 'ob-e ' + s[0]; e.textContent = s[1]; }
    st.name = v;
    if (n) n.disabled = s[0] !== 'ok';
  }
  function checkNext() {
    var n = $('#ob-next'); if (!n) return;
    n.disabled = st.step === 'photo' ? !st.photo : st.step === 'team' ? !st.team : false;
  }

  /* ----- foto: elegir, recortar, guardar ----- */
  function pickFile(f) {
    if (!f) return;
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      URL.revokeObjectURL(url);
      var iw = im.naturalWidth, ih = im.naturalHeight, k = Math.min(1, 1100 / Math.max(iw, ih)), c = doc.createElement('canvas');
      c.width = Math.max(1, Math.round(iw * k)); c.height = Math.max(1, Math.round(ih * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      st.src = c; st.cropping = true; render();
    };
    im.onerror = function () { URL.revokeObjectURL(url); UI.toast('No pude leer esa imagen. Probá con otra.'); };
    im.src = url;
  }
  function bindCrop() {
    var cv = $('#ob-cv'), cx = cv.getContext('2d'), src = st.src, SZ = 260, R = SZ / 2 - 6, iw = src.width, ih = src.height;
    var min = Math.max(SZ / iw, SZ / ih), sc = min, ox = (SZ - iw * sc) / 2, oy = (SZ - ih * sc) / 2, drag = null;
    function clamp() { ox = Math.min(0, Math.max(SZ - iw * sc, ox)); oy = Math.min(0, Math.max(SZ - ih * sc, oy)); }
    function draw() {
      cx.clearRect(0, 0, SZ, SZ); cx.drawImage(src, ox, oy, iw * sc, ih * sc);
      cx.fillStyle = 'rgba(3,10,20,.68)'; cx.beginPath(); cx.rect(0, 0, SZ, SZ); cx.arc(SZ / 2, SZ / 2, R, 0, Math.PI * 2, true); cx.fill('evenodd');
      cx.strokeStyle = 'rgba(255,255,255,.9)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(SZ / 2, SZ / 2, R, 0, Math.PI * 2); cx.stroke();
    }
    draw();
    cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, ox: ox, oy: oy }; try { cv.setPointerCapture(e.pointerId); } catch (x) { } });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var k = SZ / cv.getBoundingClientRect().width;
      ox = drag.ox + (e.clientX - drag.x) * k; oy = drag.oy + (e.clientY - drag.y) * k; clamp(); draw();
    });
    cv.addEventListener('pointerup', function () { drag = null; }); cv.addEventListener('pointercancel', function () { drag = null; });
    $('#ob-z').addEventListener('input', function (e) {
      var cxp = (SZ / 2 - ox) / sc, cyp = (SZ / 2 - oy) / sc;
      sc = min * (+e.target.value / 100); ox = SZ / 2 - cxp * sc; oy = SZ / 2 - cyp * sc; clamp(); draw();
    });
    st.export = function () {
      var o = doc.createElement('canvas'); o.width = o.height = 256;
      o.getContext('2d').drawImage(src, (SZ / 2 - R - ox) / sc, (SZ / 2 - R - oy) / sc, 2 * R / sc, 2 * R / sc, 0, 0, 256, 256);
      return o.toDataURL('image/jpeg', 0.86);
    };
  }

  /* ----- avanzar / guardar ----- */
  function next() {
    if (!st) return;
    if (st.step === 'name') { if (nameState(st.name)[0] !== 'ok') return; st.name = cleanName(st.name); }
    if (st.step === 'photo' && !st.photo) return;
    if (st.step === 'team' && !st.team) return;
    if (st.mode === 'edit') return saveEdit();
    var sts = steps(), i = sts.indexOf(st.step);
    if (i < sts.length - 1) { st.step = sts[i + 1]; persist(); render(); } else finish();
  }
  function finish() {
    LSL.profile.save({ name: st.name, photo: st.photo || '', team: st.team || '', tour: false, created: Date.now() });
    LSL.ls.del(K_OB);
    st.done = true; render();
    LSL.afterProfile();
  }
  function saveEdit() {
    var patch = {}, k = st.step;
    if (k === 'name') patch.name = st.name; else if (k === 'photo') patch.photo = st.photo; else patch.team = st.team;
    LSL.profile.save(patch);
    closeOb(function () { LSL.afterProfile(); UI.toast('Perfil actualizado'); });
  }
  function go() { var s = st; closeOb(function () { setTimeout(function () { OB.tour(true); }, 350); }); return s; }

  /* ----- eventos del registro ----- */
  obRoot.addEventListener('click', function (e) {
    var t = e.target, el;
    if (!st) return;
    if (t.closest('[data-ob-next]')) return next();
    if (t.closest('[data-ob-back]')) return LSL.popLayer();
    if (t.closest('[data-ob-x]')) return LSL.popLayer();
    if (t.closest('[data-ob-go]')) return go();
    if (t.closest('[data-ob-cropno]')) { st.cropping = false; return render(); }
    if (t.closest('[data-ob-cropok]')) { st.photo = st.export(); st.cropping = false; persist(); return render(); }
    if ((el = t.closest('.tt'))) {
      st.team = el.getAttribute('data-t'); persist();
      [].forEach.call(obRoot.querySelectorAll('.tt'), function (b) { b.classList.toggle('on', b === el); });
      return checkNext();
    }
  });
  obRoot.addEventListener('input', function (e) { if (e.target.id === 'ob-name') checkName(); });
  obRoot.addEventListener('change', function (e) {
    if (e.target.id === 'ob-f1' || e.target.id === 'ob-f2') { pickFile(e.target.files && e.target.files[0]); e.target.value = ''; }
  });
  obRoot.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'ob-name') { e.preventDefault(); var n = $('#ob-next'); if (n && !n.disabled) next(); e.target.blur(); }
  });

  OB.start = function () {
    if (LSL.profile.get() || st) return;
    var sv = LSL.ls.get(K_OB, null) || {};
    st = { mode: 'first', step: steps().indexOf(sv.step) >= 0 ? sv.step : 'name', name: sv.name || '', photo: sv.photo || '', team: S.team(sv.team) ? sv.team : '' };
    pushBack(); render();
  };
  OB.edit = function (kind) {
    var p = LSL.profile.get() || {};
    if (st) return;
    if (kind === 'team' && !S.state.teams.length) return UI.toast('Todavía no hay equipos para elegir.');
    st = { mode: 'edit', step: kind === 'photo' || kind === 'team' ? kind : 'name', name: p.name || '', photo: p.photo || '', team: S.team(p.team) ? p.team : '' };
    pushBack(); render();
  };

  /* =====================  TUTORIAL CON FOCO  ===================== */
  var T = null;   // { active, i, el, busy, steps, layer, tip, ring, dim, bl[] }

  function tsteps() {
    var f = S.state.features;
    return [
      { sel: '.hero', t: 'Partido destacado', p: 'Acá ves el partido en vivo, el próximo o el último resultado. Tocá la tarjeta para abrir todos los detalles.' },
      f.lineups && { sel: '#sheet [data-seg="stab"][data-v="lin"]', need: 'sheet', t: 'Detalles del partido', p: 'Resumen con goles y tarjetas, Alineaciones sobre la cancha e Info con canal, horario y código de sala. Tocá "Alineaciones".' },
      { sel: '#sheet .sx', need: 'sheet', t: 'Cerrar', p: 'Tocá la X para volver. También podés deslizar hacia abajo o usar el botón atrás del celular.' },
      { sel: '#nav [data-go="league"]', t: 'Liga', p: 'Tabla de posiciones, sanciones y reglamento. Tocá "Liga".' },
      { sel: '[data-seg="lseg"][data-v="cups"]', t: 'Copas', p: 'Todas las copas que se jugaron, con su cuadro: cuartos, semifinales y final. Tocá "Copas".' },
      { sel: '#nav [data-go="matches"]', t: 'Partidos', p: 'Todos los partidos, con filtros por competición y por tu equipo. Tocá "Partidos".' },
      f.calendar && { sel: '[data-seg="seg"][data-v="cal"]', t: 'Calendario', p: 'Mirá qué partidos hay cada día del mes. Tocá "Calendario".' },
      f.news && { sel: '#nav [data-go="news"]', t: 'Noticias', p: 'Las novedades de la liga. Tocá "Noticias".' },
      { sel: '#menu-btn', t: 'Menú', p: 'Acá están la apariencia, el rendimiento y más opciones. Tocá el botón para abrirlo.' },
      { sel: '#drawer [data-seg="pperf"][data-v="auto"]', need: 'drawer', t: 'Rendimiento', p: 'Si tu celular va lento, elegí "Ligero". "Alto" activa desenfoque y animaciones; "Automático" lo decide por vos. Tocá "Automático".' },
      { sel: '#drawer .dr-x', need: 'drawer', t: 'Cerrar el menú', p: 'Tocá la X para cerrarlo.' },
      { sel: '#nav [data-go="profile"]', t: 'Tu perfil', p: 'Tu foto, tu equipo y tus estadísticas. Tocá "Perfil".' },
      { end: true, t: '¡Eso es todo!', p: 'Ya conocés La Súper Liga. Podés repetir este tutorial cuando quieras desde el menú.' }
    ].filter(Boolean);
  }

  function waitFor(sel, cb, max) {
    var t0 = Date.now(), last = '';
    (function poll() {
      if (!T || !T.active) return;
      var el = doc.querySelector(sel), ok = false;
      if (el) {
        var r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) { var k = [r.left, r.top, r.width, r.height].map(Math.round).join(); ok = k === last; last = k; }
      }
      if (ok) return cb(el);
      if (Date.now() - t0 > max) return cb(null);
      setTimeout(poll, 90);
    })();
  }
  function box(el, l, t, w, h) { el.style.left = l + 'px'; el.style.top = t + 'px'; el.style.width = Math.max(0, w) + 'px'; el.style.height = Math.max(0, h) + 'px'; }

  function layout() {
    if (!T || !T.active || !T.el) return;
    var host = $('#tour'), hr = host.getBoundingClientRect(), W = hr.width, H = hr.height, r = T.el.getBoundingClientRect(), pad = 6;
    var x = Math.max(2, r.left - pad), y = Math.max(2, r.top - pad), wd = Math.min(W - 2 - x, r.width + pad * 2), ht = r.height + pad * 2, rad = Math.min(16, ht / 2, wd / 2);
    T.dim.setAttribute('d', 'M0 0H' + W + 'V' + H + 'H0Z M' + (x + rad) + ' ' + y + 'H' + (x + wd - rad) + 'A' + rad + ' ' + rad + ' 0 0 1 ' + (x + wd) + ' ' + (y + rad) + 'V' + (y + ht - rad) +
      'A' + rad + ' ' + rad + ' 0 0 1 ' + (x + wd - rad) + ' ' + (y + ht) + 'H' + (x + rad) + 'A' + rad + ' ' + rad + ' 0 0 1 ' + x + ' ' + (y + ht - rad) + 'V' + (y + rad) + 'A' + rad + ' ' + rad + ' 0 0 1 ' + (x + rad) + ' ' + y + 'Z');
    box(T.bl[0], 0, 0, W, y); box(T.bl[1], 0, y + ht, W, H - y - ht); box(T.bl[2], 0, y, x, ht); box(T.bl[3], x + wd, y, W - x - wd, ht);
    box(T.ring, x, y, wd, ht); T.ring.style.borderRadius = rad + 'px'; T.ring.hidden = false;
    T.tip.classList.remove('tour-mid');
    if (H - (y + ht) >= 190) { T.tip.style.top = (y + ht + 14) + 'px'; T.tip.style.bottom = 'auto'; }
    else { T.tip.style.bottom = (H - y + 14) + 'px'; T.tip.style.top = 'auto'; }
  }
  var lyT = 0;
  function relayout() { if (lyT) return; lyT = requestAnimationFrame(function () { lyT = 0; layout(); }); }

  function setTip(s, i, n) {
    $('#tn').textContent = s.end ? 'Tutorial completo' : 'Paso ' + (i + 1) + ' de ' + (n - 1);
    $('#tt').textContent = s.t; $('#tp').textContent = s.p;
    $('#tf').innerHTML = s.end ? '<button class="btn" data-tour-ok style="width:100%">¡Entendido!</button>' : '<span></span><button class="tour-skip" data-tour-skip>Saltar tutorial</button>';
  }
  function show(i) {
    if (!T || !T.active) return;
    if (i >= T.steps.length) return end();
    T.i = i; T.el = null; T.busy = false;
    var s = T.steps[i], n = T.steps.length;
    if (s.end) {
      T.dim.setAttribute('d', 'M0 0H' + 4000 + 'V' + 4000 + 'H0Z'); T.ring.hidden = true;
      var host = $('#tour').getBoundingClientRect(); box(T.bl[0], 0, 0, host.width, host.height); box(T.bl[1], 0, 0, 0, 0); box(T.bl[2], 0, 0, 0, 0); box(T.bl[3], 0, 0, 0, 0);
      T.tip.style.top = '50%'; T.tip.style.bottom = 'auto'; T.tip.classList.add('tour-mid'); setTip(s, i, n);
      return;
    }
    if (s.need === 'sheet' && !UI.sh.open) return show(i + 1);
    if (s.need === 'drawer' && !$('#drawer.on')) return show(i + 1);
    waitFor(s.sel, function (el) {
      if (!T || !T.active || T.i !== i) return;
      if (!el) return show(i + 1);
      if (!el.closest('#nav,#top,#sheet,#drawer')) { var r0 = el.getBoundingClientRect(); if (r0.top < 70 || r0.bottom > w.innerHeight - 100) { el.scrollIntoView({ block: 'center' }); } }
      T.el = el; setTip(s, i, n); layout();
      setTimeout(layout, 120);
    }, s.need ? 1600 : 1400);
  }
  function wiggle() {
    if (!T) return; var t = T.tip; t.classList.remove('wig'); void t.offsetWidth; t.classList.add('wig');
  }
  function onTourClick(e) {
    if (!T || !T.active) return;
    var t = e.target;
    if (t.closest('#tour-root')) {
      if (t.closest('[data-tour-skip]') || t.closest('[data-tour-ok]')) { e.preventDefault(); return end(); }
      if (t.closest('.tb')) wiggle();
      return;
    }
    if (T.el && !T.busy && (t === T.el || T.el.contains(t))) {     // tocó lo marcado: se ejecuta la acción real y pasamos al siguiente
      T.busy = true; var i = T.i;
      setTimeout(function () { if (T && T.active && T.i === i) show(i + 1); }, 420);
    }
  }
  function tourBack() {
    if (!T || !T.active) return;
    T.layer = false; UI.toast('Tocá lo que marca el tutorial (o "Saltar")'); T.layer = true; LSL.pushLayer(tourBack);
  }
  function end() {
    if (!T || !T.active) return;
    var t = T; t.active = false;
    doc.removeEventListener('click', onTourClick, true); w.removeEventListener('scroll', relayout); w.removeEventListener('resize', relayout);
    trRoot.innerHTML = ''; T = null;
    if (LSL.profile.get()) LSL.profile.save({ tour: true });
    var reqS = false, reqD = false;
    (function close() {                                   // cerramos lo que haya quedado abierto y después soltamos la capa del tutorial
      if (UI.sh.open) { if (!reqS) { reqS = true; UI.closeSheet(); } return setTimeout(close, 100); }
      if ($('#drawer.on')) { if (!reqD) { reqD = true; LSL.closeDrawer(); } return setTimeout(close, 100); }
      if (t.layer) { t.layer = false; LSL.popLayer(); }
      LSL.go('home');
    })();
  }

  OB.tour = function (first) {
    if (T && T.active) return;
    if (st) return;
    var prep = function () {
      trRoot.innerHTML = '<div class="tour" id="tour"><svg class="tour-dim" aria-hidden="true"><path fill-rule="evenodd" id="tdim"/></svg><i class="tb"></i><i class="tb"></i><i class="tb"></i><i class="tb"></i>' +
        '<span class="tour-ring" hidden></span><div class="tour-tip" role="dialog" aria-live="polite"><span class="tour-n" id="tn"></span><b id="tt"></b><p id="tp"></p><div class="tour-f" id="tf"></div></div></div>';
      var host = $('#tour');
      T = { active: true, i: 0, el: null, busy: false, steps: tsteps(), layer: true, first: !!first, dim: $('#tdim'), ring: $('.tour-ring', host), tip: $('.tour-tip', host), bl: [].slice.call(host.querySelectorAll('.tb')) };
      LSL.pushLayer(tourBack);
      doc.addEventListener('click', onTourClick, true); w.addEventListener('scroll', relayout, { passive: true }); w.addEventListener('resize', relayout);
      show(0);
    };
    if (LSL.curTab() !== 'home') LSL.go('home');
    if (UI.sh.open) { UI.closeSheet(); return setTimeout(prep, 380); }
    prep();
  };
})(window);
