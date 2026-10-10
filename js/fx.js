/* La Súper Liga · fx.js
   Efectos visuales, estadísticas, compartir resultado y calendario. Un solo archivo, sin tocar el resto:
     <script src="js/fx.js"></script>   (debajo de la línea de island.js en index.html)
   Los interruptores aparecen en el menú ☰ → "Efectos" y se guardan en el celular de cada persona.
   Respetan el modo de Rendimiento: los efectos visuales solo corren en Alto; las optimizaciones, solo en Ligero. */
(function (w) {
  'use strict';
  var d = document, root = d.documentElement, FX = {};
  function L() { return w.LSL || {}; }
  function S() { return L().store; }
  function st() { var s = S(); return s && s.state; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hex(v, f) { return /^#[0-9a-f]{6}$/i.test(v || '') ? v : f; }
  function rgba(h, a) { var n = parseInt(hex(h, '#000000').slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function team(id) { var s = st(); return s ? (s.teams || []).filter(function (t) { return t.id === id; })[0] || null : null; }
  function tname(id) { var t = team(id); return t ? t.name : 'Equipo'; }
  function tshort(id) { var t = team(id); return t ? (t.short || t.name.slice(0, 3)) : '?'; }
  function lite() { return root.getAttribute('data-perf') === 'lite'; }
  var reduced = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- ajustes (se guardan en las preferencias del celular) ---------- */
  var DEF = { tilt: true, confetti: true, flip: true, aurora: true, crest3d: true, glow: true, ripple: true, haptic: true, lists: true, slowpoll: true };
  function cfg() { var p = L().prefs; return Object.assign({}, DEF, (p && p.fx) || {}); }
  function setFx(k, v) {
    var P = L().prefs; if (!P) return;
    P.fx = Object.assign({}, DEF, P.fx || {}); P.fx[k] = v;
    if (L().savePrefs) L().savePrefs();
    applyAttrs();
  }
  function applyAttrs() {
    var c = cfg();
    Object.keys(DEF).forEach(function (k) { root.setAttribute('data-fx-' + k, c[k] ? '1' : '0'); });
    syncTilt(); syncPoll();
  }

  /* ---------- estilos ---------- */
  var F = 'html:not([data-perf=lite])';
  var CSS = '' +
    /* fondo animado en la tarjeta del partido (usa ::after porque ::before ya lo usa la app) */
    F + '[data-fx-aurora="1"] .hero{isolation:isolate}' +
    F + '[data-fx-aurora="1"] .hero::after{content:"";position:absolute;inset:-35%;z-index:0;pointer-events:none;opacity:.5;background:radial-gradient(38% 38% at 28% 32%,var(--c1),transparent 70%),radial-gradient(38% 38% at 72% 68%,var(--c2),transparent 70%);animation:fx-aur 14s ease-in-out infinite alternate}' +
    F + '[data-fx-aurora="1"] .hero>*{z-index:1}' +
    '@keyframes fx-aur{to{transform:translate3d(6%,-4%,0) rotate(24deg) scale(1.12)}}' +
    /* marcador que gira */
    F + '[data-fx-flip="1"] .fx-flip{display:inline-block;animation:fx-flip .7s cubic-bezier(.2,.8,.3,1.2) both}' +
    '@keyframes fx-flip{0%{transform:perspective(300px) rotateX(90deg);opacity:0}60%{transform:perspective(300px) rotateX(-14deg);opacity:1}100%{transform:none}}' +
    /* escudos 3D al abrir el detalle de un partido */
    F + '[data-fx-crest3d="1"] #sheet[data-fxo] .hero-row .crest{animation:fx-c3d .85s cubic-bezier(.2,.9,.3,1.15) both}' +
    F + '[data-fx-crest3d="1"] #sheet[data-fxo] .hero-row .tm:last-child .crest{--fxd:100deg}' +
    '@keyframes fx-c3d{0%{transform:perspective(420px) rotateY(var(--fxd,-100deg)) scale(.55);opacity:0}100%{transform:none;opacity:1}}' +
    /* inclinar el celular */
    F + '[data-fx-tilt="1"] .hero{transform:perspective(900px) rotateX(calc(var(--fx-y,0)*-4deg)) rotateY(calc(var(--fx-x,0)*4deg));transition:transform .12s linear;will-change:transform}' +
    F + '[data-fx-tilt="1"] .hero .crest{transform:translate3d(calc(var(--fx-x,0)*9px),calc(var(--fx-y,0)*7px),0)}' +
    /* brillo que sigue el dedo, ondas y destello de gol */
    'html .fx-gl{position:absolute;inset:0;pointer-events:none;z-index:0;opacity:0;transition:opacity .25s;background:radial-gradient(190px circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,.24),transparent 65%)}' +
    'html .fx-gl.on{opacity:1}' +
    'html .fx-rp{position:absolute;border-radius:50%;pointer-events:none;z-index:2;background:rgba(255,255,255,.35);transform:scale(0);animation:fx-rp .55s ease-out forwards}' +
    '@keyframes fx-rp{to{transform:scale(1);opacity:0}}' +
    '.fx-rph{position:relative;overflow:hidden}' +
    'html .fx-fl{position:absolute;inset:0;pointer-events:none;z-index:0;background:var(--ac,#27C4C9);opacity:0;animation:fx-fl .9s ease-out}' +
    '@keyframes fx-fl{0%{opacity:.55}100%{opacity:0}}' +
    /* optimización para Ligero: no dibuja lo que no se ve */
    'html[data-perf=lite][data-fx-lists="1"] .mc,html[data-perf=lite][data-fx-lists="1"] .nw{content-visibility:auto;contain-intrinsic-size:auto 120px}' +
    /* menú ☰ → Efectos */
    '#fx-sec .fx-r{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line,rgba(255,255,255,.12))}' +
    '#fx-sec .fx-r>span{flex:1;font-size:14px}#fx-sec .fx-r small{display:block;color:var(--mut,#9fb0cc);font-size:11.5px;margin-top:2px}' +
    '#fx-sec .fx-r input{-webkit-appearance:none;appearance:none;width:44px;height:26px;border-radius:13px;background:var(--card2,#2a3550);position:relative;flex:none;margin:0;transition:background .2s}' +
    '#fx-sec .fx-r input:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}' +
    '#fx-sec .fx-r input:checked{background:var(--ac,#27C4C9)}#fx-sec .fx-r input:checked:after{transform:translateX(18px)}' +
    '#fx-sec .fx-test{margin-top:10px;width:100%;padding:10px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--card,#16233f);color:inherit;font:600 13px system-ui;cursor:pointer}' +
    /* hoja de detalle: compartir y calendario */
    '.fx-act{display:flex;gap:8px;margin:12px 14px 0;flex-wrap:wrap}' +
    '.fx-b{flex:1;min-width:140px;padding:10px 12px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--card,#16233f);color:var(--tx,#fff);font:600 13px system-ui;cursor:pointer}' +
    /* ventanas: estadísticas y vista previa de imagen */
    '.fx-ov{position:fixed;inset:0;z-index:2147482600;display:flex;flex-direction:column;background:var(--bg,#04101F);color:var(--tx,#fff);font:500 14px/1.35 system-ui,-apple-system,sans-serif}' +
    '.fx-ov-h{display:flex;align-items:center;gap:8px;padding:calc(12px + env(safe-area-inset-top,0px)) 14px 10px}.fx-ov-h b{flex:1;font-size:18px}' +
    '.fx-x{width:38px;height:38px;border-radius:50%;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--card,#16233f);color:inherit;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
    '.fx-ov-b{flex:1;overflow-y:auto;padding:0 14px calc(24px + env(safe-area-inset-bottom,0px));-webkit-overflow-scrolling:touch}' +
    '.fx-ov h4{margin:18px 0 8px;font-size:12px;letter-spacing:.9px;text-transform:uppercase;color:var(--mut,#9fb0cc)}' +
    '.fx-tb{width:100%;border-collapse:collapse}.fx-tb td{padding:9px 6px;border-top:1px solid var(--line,rgba(255,255,255,.1));font-size:14px}' +
    '.fx-tb td:first-child{width:26px;color:var(--mut,#9fb0cc)}.fx-tb td.n{text-align:right;font-weight:800;white-space:nowrap}.fx-tb small{display:block;color:var(--mut,#9fb0cc);font-size:11.5px}' +
    '.fx-em{color:var(--mut,#9fb0cc);padding:10px 2px}' +
    '.fx-pv{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:10px 14px calc(20px + env(safe-area-inset-bottom,0px))}' +
    '.fx-pv img{max-width:100%;max-height:68vh;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.5)}.fx-pv .fx-act{width:100%;max-width:420px}' +
    '.fx-pv p{margin:0;color:var(--mut,#9fb0cc);font-size:12.5px;text-align:center}';
  function injectCSS() { if (d.getElementById('lsl-fx-css')) return; var s = d.createElement('style'); s.id = 'lsl-fx-css'; s.textContent = CSS; d.head.appendChild(s); }

  /* ---------- confeti ---------- */
  function confetti(colors) {
    if (!cfg().confetti || lite() || reduced) return;
    var old = d.getElementById('fx-cf'); if (old) old.remove();
    var c = d.createElement('canvas'), W = c.width = w.innerWidth, H = c.height = w.innerHeight;
    c.id = 'fx-cf'; c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147482500';
    d.body.appendChild(c);
    var g = c.getContext('2d'), P = [], cols = colors && colors.length ? colors : ['#27C4C9', '#FFD226', '#ffffff', '#ff5468'];
    for (var i = 0; i < 110; i++) P.push({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .28, vx: (Math.random() - .5) * 11, vy: -Math.random() * 13 - 3, r: Math.random() * 6 + 3, a: Math.random() * 6, va: (Math.random() - .5) * .4, c: cols[i % cols.length], s: i % 3 });
    var t0 = 0, last = 0;
    (function step(t) {
      if (!t0) { t0 = t; last = t; }
      var dt = Math.min(32, t - last) || 16; last = t; g.clearRect(0, 0, W, H); var alive = 0;
      P.forEach(function (p) {
        p.vy += .32 * dt / 16; p.vx *= .995; p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.a += p.va;
        if (p.y < H + 20) {
          alive++; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c;
          if (p.s === 0) g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else if (p.s === 1) { g.beginPath(); g.arc(0, 0, p.r / 1.6, 0, 6.3); g.fill(); } else g.fillRect(-p.r / 2, -p.r, p.r, p.r * 2);
          g.restore();
        }
      });
      if (alive && t - t0 < 4200) requestAnimationFrame(step); else c.remove();
    })(performance.now());
  }

  /* ---------- gol: confeti + destello (detecta subidas de marcador en vivo) ---------- */
  var scoresFx = {};
  function liveMatches() { var s = st(); return s ? (s.matches || []).filter(function (m) { return m.status === 'live' || m.status === 'paused'; }) : []; }
  function snapScores() { liveMatches().forEach(function (m) { scoresFx[m.id] = [+m.hs || 0, +m.as || 0]; }); }
  function flash(id) {
    if (lite()) return;
    d.querySelectorAll('[data-match="' + id + '"]').forEach(function (card) {
      var s = d.createElement('span'); s.className = 'fx-fl'; card.appendChild(s); setTimeout(function () { s.remove(); }, 1000);
    });
  }
  function checkGoal() {
    if (!st()) return;
    liveMatches().forEach(function (m) {
      var o = scoresFx[m.id], h = +m.hs || 0, a = +m.as || 0;
      if (o && (h > o[0] || a > o[1]) && !L().adminOpen) {
        var t = team(h > o[0] ? m.home : m.away);
        confetti([hex(t && t.color, '#27C4C9'), '#ffffff', '#FFD226']); flash(m.id);
      }
      scoresFx[m.id] = [h, a];
    });
  }

  /* ---------- marcador que gira ---------- */
  var seenSc = {};
  function scanScores() {
    var on = cfg().flip && !lite();
    function one(card, id, tag) {
      var bs = card.querySelectorAll('.sc b, .hm-sc b'); if (bs.length < 2) return;
      [0, 1].forEach(function (i) {
        var v = parseInt(bs[i].textContent, 10); if (isNaN(v)) return;
        var k = id + ':' + i + ':' + tag, prev = seenSc[k]; seenSc[k] = v;
        if (on && prev !== undefined && v > prev) bs[i].classList.add('fx-flip');
      });
    }
    d.querySelectorAll('[data-match]').forEach(function (card) { one(card, card.getAttribute('data-match'), card.className.split(' ')[0]); });
    var sh = L().ui && L().ui.sh, row = d.querySelector('#sheet.on .hero-row');
    if (sh && sh.type === 'match' && row) one(row, sh.id, 'sheet');
  }

  /* ---------- brillo, ondas y vibración (un solo oyente) ---------- */
  var HOSTS = '.btn,.mc,.hero,.dr-l button,.seg button,#nav button';
  d.addEventListener('pointerdown', function (e) {
    var t = e.target && e.target.closest && e.target.closest(HOSTS); if (!t) return;
    var c = cfg();
    if (lite()) { if (c.haptic) { try { navigator.vibrate && navigator.vibrate(6); } catch (_) { } } return; }
    if (reduced) return;
    var r = t.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (c.glow && t.matches('.mc,.hero')) {
      var gl = t.querySelector('.fx-gl');
      if (!gl) { gl = d.createElement('span'); gl.className = 'fx-gl'; t.appendChild(gl); }
      gl.style.setProperty('--mx', x + 'px'); gl.style.setProperty('--my', y + 'px'); gl.classList.add('on');
      setTimeout(function () { gl.classList.remove('on'); }, 450);
    }
    if (c.ripple && !t.matches('#nav button')) {
      if (w.getComputedStyle(t).position === 'static') t.classList.add('fx-rph'); else if (!t.classList.contains('fx-rph') && w.getComputedStyle(t).overflow === 'visible') t.classList.add('fx-rph');
      var s = d.createElement('span'), size = Math.max(r.width, r.height) * 2;
      s.className = 'fx-rp'; s.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (x - size / 2) + 'px;top:' + (y - size / 2) + 'px';
      t.appendChild(s); setTimeout(function () { s.remove(); }, 650);
    }
  }, true);

  /* ---------- inclinar el celular (sensor de giro) ---------- */
  var tiltOn = false, tx = 0, ty = 0, ttx = 0, tty = 0, traf = 0;
  function tick() {
    traf = 0; tx += (ttx - tx) * .18; ty += (tty - ty) * .18;
    root.style.setProperty('--fx-x', tx.toFixed(3)); root.style.setProperty('--fx-y', ty.toFixed(3));
    if (Math.abs(ttx - tx) > .004 || Math.abs(tty - ty) > .004) traf = requestAnimationFrame(tick);
  }
  function onOri(e) {
    if (e.gamma == null || e.beta == null) return;
    ttx = Math.max(-1, Math.min(1, e.gamma / 25)); tty = Math.max(-1, Math.min(1, (e.beta - 50) / 30));
    if (!traf) traf = requestAnimationFrame(tick);
  }
  function syncTilt() {
    var want = cfg().tilt && !lite() && !reduced;
    if (want && !tiltOn) { w.addEventListener('deviceorientation', onOri); tiltOn = true; }
    else if (!want && tiltOn) { w.removeEventListener('deviceorientation', onOri); tiltOn = false; ttx = tty = tx = ty = 0; root.style.setProperty('--fx-x', 0); root.style.setProperty('--fx-y', 0); }
  }
  function askOrientation() {
    try { var D = w.DeviceOrientationEvent; if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(function () { }); } catch (_) { }
  }

  /* ---------- Ligero: menos refresco automático e imágenes diferidas ---------- */
  var pollOrig = null;
  function syncPoll() {
    var C = w.LSL_CONFIG; if (!C) return; if (pollOrig === null) pollOrig = C.pollSeconds || 30;
    C.pollSeconds = (lite() && cfg().slowpoll) ? Math.max(pollOrig, 90) : pollOrig;
  }
  function liteImgs() {
    if (!lite()) return;
    d.querySelectorAll('img:not([loading])').forEach(function (im) { im.setAttribute('loading', 'lazy'); im.setAttribute('decoding', 'async'); });
  }

  /* ---------- menú ☰ → Efectos y Estadísticas ---------- */
  var ROWS = [
    ['tilt', 'Inclinar el celular', 'Efecto de profundidad con el sensor de giro (solo Alto)'],
    ['confetti', 'Confeti al gol', 'Solo Alto'],
    ['flip', 'Marcador que gira', 'Solo Alto'],
    ['aurora', 'Fondo animado en el partido', 'Solo Alto'],
    ['crest3d', 'Escudos 3D al abrir un partido', 'Solo Alto'],
    ['glow', 'Brillo que sigue el dedo', 'Solo Alto'],
    ['ripple', 'Ondas al tocar', 'Solo Alto'],
    ['haptic', 'Vibración al tocar', 'Solo Ligero'],
    ['lists', 'Listas optimizadas', 'Solo Ligero'],
    ['slowpoll', 'Actualizar menos seguido', 'Solo Ligero: ahorra batería y datos']
  ];
  function sectionHTML() {
    var c = cfg();
    return '<section class="dr-c" id="fx-sec"><h3>Efectos</h3><p class="mut sm">' + (lite() ? 'Estás en modo Ligero: los efectos visuales están apagados y se usan las optimizaciones.' : 'Elegí qué efectos querés ver. Las opciones "Solo Ligero" se usan únicamente en modo Ligero.') + '</p>' +
      ROWS.map(function (r) { return '<label class="fx-r"><span>' + r[1] + '<small>' + r[2] + '</small></span><input type="checkbox" data-fx-t="' + r[0] + '"' + (c[r[0]] ? ' checked' : '') + '></label>'; }).join('') +
      (lite() ? '' : '<button type="button" class="fx-test" data-fx-demo>🎉 Probar confeti</button>') + '</section>';
  }
  function injectDrawer() {
    var dr = d.getElementById('drawer'); if (!dr) return;
    var perf = dr.querySelector('#dr-perf');
    if (perf && !dr.querySelector('#fx-sec')) perf.insertAdjacentHTML('afterend', sectionHTML());
    var nav = dr.querySelector('.dr-l');
    if (nav && !nav.querySelector('[data-fx-stats]')) nav.insertAdjacentHTML('afterbegin', '<button type="button" data-fx-stats>' + ((L().ui && L().ui.ic) ? L().ui.ic('trophy') : '') + 'Estadísticas</button>');
  }
  d.addEventListener('change', function (e) {
    var k = e.target && e.target.getAttribute && e.target.getAttribute('data-fx-t'); if (!k) return;
    setFx(k, e.target.checked); if (k === 'tilt' && e.target.checked) askOrientation();
  });
  d.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    if (t.closest('[data-fx-demo]')) { confetti(); return; }
    if (t.closest('[data-fx-stats]')) { var x = d.querySelector('#drawer [data-dr-close]'); if (x) x.click(); openStats(); return; }
    var sh = t.closest('[data-fx-share]'); if (sh) { shareMatch(sh.getAttribute('data-fx-share')); return; }
    var cal = t.closest('[data-fx-cal]'); if (cal) { addToCalendar(cal.getAttribute('data-fx-cal')); return; }
  });

  /* ---------- ventanas ---------- */
  function overlay(id, title, bodyHTML, cls) {
    var old = d.getElementById(id); if (old) old.remove();
    var o = d.createElement('div'); o.id = id; o.className = 'fx-ov';
    o.innerHTML = '<div class="fx-ov-h"><b>' + esc(title) + '</b><button type="button" class="fx-x" data-fx-close aria-label="Cerrar">✕</button></div><div class="' + (cls || 'fx-ov-b') + '">' + bodyHTML + '</div>';
    d.body.appendChild(o);
    function close() { if (o.parentNode) o.parentNode.removeChild(o); }
    o.querySelector('[data-fx-close]').addEventListener('click', close);
    if (L().pushLayer) L().pushLayer(close);
    return o;
  }

  /* ---------- estadísticas ---------- */
  function computeStats() {
    var s = st(), sc = {}, cd = {}, gc = {}, pj = {};
    ((s && s.matches) || []).forEach(function (m) {
      if (m.status !== 'finished' && m.status !== 'live' && m.status !== 'paused') return;
      (m.events || []).forEach(function (e) {
        if (!e.player) return;
        var tid = e.side === 'h' ? m.home : m.away, ty = String(e.type || ''), k = e.player + '|' + tid;
        if (ty === 'goal') { sc[k] = sc[k] || { p: e.player, t: tid, n: 0 }; sc[k].n++; }
        else if (ty !== 'own') { cd[k] = cd[k] || { p: e.player, t: tid, y: 0, r: 0 }; if (ty === 'red') cd[k].r++; else cd[k].y++; }
      });
      if (m.status === 'finished') [[m.home, +m.as || 0], [m.away, +m.hs || 0]].forEach(function (x) { gc[x[0]] = (gc[x[0]] || 0) + x[1]; pj[x[0]] = (pj[x[0]] || 0) + 1; });
    });
    var scorers = Object.keys(sc).map(function (k) { return sc[k]; }).sort(function (a, b) { return b.n - a.n || a.p.localeCompare(b.p); });
    var cards = Object.keys(cd).map(function (k) { return cd[k]; }).sort(function (a, b) { return b.r - a.r || b.y - a.y || a.p.localeCompare(b.p); });
    var keeper = Object.keys(pj).map(function (id) { return { t: id, gc: gc[id], pj: pj[id], avg: gc[id] / pj[id] }; }).sort(function (a, b) { return a.avg - b.avg || b.pj - a.pj; });
    return { scorers: scorers, cards: cards, keeper: keeper };
  }
  function table(rows, empty) {
    if (!rows.length) return '<div class="fx-em">' + empty + '</div>';
    return '<table class="fx-tb">' + rows.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td>' + r[0] + '</td><td class="n">' + r[1] + '</td></tr>'; }).join('') + '</table>';
  }
  function openStats() {
    var s = computeStats();
    var h = '<h4>⚽ Goleadores</h4>' + table(s.scorers.slice(0, 10).map(function (x) { return ['<b>' + esc(x.p) + '</b><small>' + esc(tname(x.t)) + '</small>', x.n]; }), 'Todavía no hay goles cargados con goleador.');
    h += '<h4>🟨 Tarjetas</h4>' + table(s.cards.slice(0, 10).map(function (x) { return ['<b>' + esc(x.p) + '</b><small>' + esc(tname(x.t)) + '</small>', (x.y ? '🟨 ' + x.y : '') + (x.y && x.r ? '  ' : '') + (x.r ? '🟥 ' + x.r : '')]; }), 'Todavía no hay tarjetas cargadas.');
    h += '<h4>🧤 Valla menos vencida</h4>' + table(s.keeper.slice(0, 8).map(function (x) { return ['<b>' + esc(tname(x.t)) + '</b><small>' + x.pj + (x.pj === 1 ? ' partido' : ' partidos') + '</small>', x.gc + ' GC']; }), 'Todavía no hay partidos terminados.');
    h += '<p class="fx-em" style="font-size:12px">Se cuentan los partidos terminados y en vivo de todas las competiciones.</p>';
    overlay('fx-stats', 'Estadísticas', h);
  }

  /* ---------- compartir resultado como imagen ---------- */
  function matchById(id) { var s = st(); return s ? (s.matches || []).filter(function (m) { return m.id === id; })[0] : null; }
  function fmtDay(iso) { var t = new Date(iso); if (isNaN(t)) return ''; return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][t.getDay()] + ' ' + t.getDate() + '/' + (t.getMonth() + 1) + ' · ' + p2(t.getHours()) + ':' + p2(t.getMinutes()); }
  function loadLogo(t) {
    return new Promise(function (res) {
      if (!t || !t.logo) return res(null);
      var im = new Image(); if (!/^data:/.test(t.logo)) im.crossOrigin = 'anonymous';
      var done = false; function fin(v) { if (!done) { done = true; res(v); } }
      im.onload = function () { fin(im); }; im.onerror = function () { fin(null); }; setTimeout(function () { fin(null); }, 2500); im.src = t.logo;
    });
  }
  function drawCrest(g, t, im, cx, cy, r, col) {
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.closePath();
    if (im) { g.clip(); try { g.drawImage(im, cx - r, cy - r, r * 2, r * 2); } catch (_) { } g.restore(); return; }
    var gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r); gr.addColorStop(0, col); gr.addColorStop(1, rgba(col, .6)); g.fillStyle = gr; g.fill(); g.restore();
    g.fillStyle = '#ffffff'; g.font = '800 ' + Math.round(r * .62) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(((t && (t.short || t.name)) || '?').slice(0, 3).toUpperCase(), cx, cy + 4);
  }
  function renderShare(m) {
    var s = st(), h = team(m.home), a = team(m.away), lg = (s && s.league) || {};
    return Promise.all([loadLogo(h), loadLogo(a)]).then(function (im) {
      var c = d.createElement('canvas'); c.width = c.height = 1080; var g = c.getContext('2d');
      var c1 = hex(h && h.color, '#27C4C9'), c2 = hex(a && a.color, '#FFD226');
      var bg = g.createLinearGradient(0, 0, 1080, 1080); bg.addColorStop(0, '#04101F'); bg.addColorStop(1, '#0b1c36'); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1080);
      [[300, c1], [780, c2]].forEach(function (p) { var gl = g.createRadialGradient(p[0], 360, 10, p[0], 360, 420); gl.addColorStop(0, rgba(p[1], .5)); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, 1080, 1080); });
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffffff'; g.font = '800 54px system-ui,sans-serif'; g.fillText((lg.name || 'La Súper Liga').toUpperCase().slice(0, 28), 540, 120);
      var rd = m.round ? (/^\d+$/.test(String(m.round).trim()) ? 'Jornada ' + m.round : String(m.round)) : '';
      g.fillStyle = 'rgba(255,255,255,.62)'; g.font = '600 34px system-ui,sans-serif'; g.fillText([lg.season, rd].filter(Boolean).join(' · ').slice(0, 44), 540, 172);
      drawCrest(g, h, im[0], 300, 360, 130, c1); drawCrest(g, a, im[1], 780, 360, 130, c2);
      g.fillStyle = '#ffffff'; g.font = '800 44px system-ui,sans-serif'; g.fillText((h ? h.name : 'Equipo').slice(0, 15), 300, 570); g.fillText((a ? a.name : 'Equipo').slice(0, 15), 780, 570);
      var fin = m.status === 'finished', live = m.status === 'live' || m.status === 'paused';
      g.fillStyle = '#ffffff';
      if (fin || live) {
        g.font = '900 230px system-ui,sans-serif'; g.fillText((+m.hs || 0) + ' - ' + (+m.as || 0), 540, 770);
        g.font = '800 40px system-ui,sans-serif'; g.fillStyle = live ? '#ff5468' : 'rgba(255,255,255,.7)'; g.fillText(live ? '● EN VIVO' : 'FINAL', 540, 895);
      } else {
        g.font = '900 190px system-ui,sans-serif'; var t = new Date(m.date); g.fillText(isNaN(t) ? 'VS' : p2(t.getHours()) + ':' + p2(t.getMinutes()), 540, 760);
        g.font = '700 44px system-ui,sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(fmtDay(m.date), 540, 885);
      }
      g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '600 36px system-ui,sans-serif'; g.fillText(m.comp === 'liga' ? 'Liga' : (m.cup || 'Copa'), 540, 960);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '700 30px system-ui,sans-serif'; g.fillText(w.location.host || '', 540, 1030);
      return c;
    });
  }
  function shareMatch(id) {
    var m = matchById(id); if (!m) return;
    renderShare(m).then(function (c) {
      var url = ''; try { url = c.toDataURL('image/png'); } catch (e) { if (L().ui && L().ui.toast) L().ui.toast('No se pudo crear la imagen.'); return; }
      var canShare = !!(navigator.share && w.File);
      var o = overlay('fx-share', 'Compartir resultado',
        '<img alt="Resultado del partido" src="' + url + '"><p>' + (canShare ? 'Tocá Compartir para mandarla por WhatsApp u otra app.' : 'Mantené apretada la imagen para guardarla o compartirla.') + '</p>' +
        '<div class="fx-act">' + (canShare ? '<button type="button" class="fx-b" data-fx-dosh>📤 Compartir</button>' : '') + '</div>', 'fx-pv');
      var b = o.querySelector('[data-fx-dosh]');
      if (b) b.addEventListener('click', function () {
        c.toBlob(function (bl) {
          if (!bl) return;
          var f = new File([bl], 'resultado.png', { type: 'image/png' });
          var data = { files: [f], title: tname(m.home) + ' vs ' + tname(m.away) };
          if (navigator.canShare && !navigator.canShare(data)) data = { title: data.title, text: data.title };
          navigator.share(data).catch(function () { });
        }, 'image/png');
      });
    });
    return true;
  }

  /* ---------- agregar al calendario ---------- */
  function gcalDate(t) { return t.getFullYear() + p2(t.getMonth() + 1) + p2(t.getDate()) + 'T' + p2(t.getHours()) + p2(t.getMinutes()) + '00'; }
  function calendarURL(m) {
    var t = new Date(m.date); if (isNaN(t)) return '';
    var e = new Date(t.getTime() + 2 * 3600000), s = st(), lg = (s && s.league && s.league.name) || 'La Súper Liga';
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('⚽ ' + tname(m.home) + ' vs ' + tname(m.away)) +
      '&dates=' + gcalDate(t) + '/' + gcalDate(e) + '&details=' + encodeURIComponent(lg + (m.round ? ' · Jornada ' + m.round : ''));
  }
  function addToCalendar(id) { var m = matchById(id), u = m && calendarURL(m); if (u) w.open(u, '_blank'); }

  /* ---------- botones dentro del detalle del partido ---------- */
  function injectSheet() {
    var sh = L().ui && L().ui.sh; if (!sh || sh.type !== 'match') return;
    var row = d.querySelector('#sbody .hero-row'); if (!row) return;
    if (d.querySelector('#sbody .fx-act')) return;
    var m = matchById(sh.id); if (!m) return;
    var html = '<div class="fx-act"><button type="button" class="fx-b" data-fx-share="' + esc(m.id) + '">🖼️ Compartir imagen</button>' + (m.status === 'upcoming' ? '<button type="button" class="fx-b" data-fx-cal="' + esc(m.id) + '">📅 Agregar al calendario</button>' : '') + '</div>';
    row.insertAdjacentHTML('afterend', html);
  }

  /* ---------- vigilancia del DOM ---------- */
  var raf = 0;
  function schedule() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; try { injectDrawer(); injectSheet(); scanScores(); liteImgs(); } catch (e) { } }); }
  function watch() {
    new MutationObserver(schedule).observe(d.body, { childList: true, subtree: true });
    var sheet = d.getElementById('sheet'), was = false;
    if (sheet) new MutationObserver(function () {
      var on = sheet.classList.contains('on');
      if (on && !was) { sheet.setAttribute('data-fxo', ''); setTimeout(function () { sheet.removeAttribute('data-fxo'); }, 1300); }
      was = on;
    }).observe(sheet, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(applyAttrs).observe(root, { attributes: true, attributeFilter: ['data-perf'] });
    schedule();
  }

  /* ---------- arranque ---------- */
  function attach() {
    L().fx = FX; applyAttrs(); snapScores();
    S().on('change', function () { checkGoal(); schedule(); });
    watch();
  }
  function boot() {
    injectCSS();
    var n = 0, iv = setInterval(function () { if (L().store && st() && L().prefs && S().on) { clearInterval(iv); attach(); } else if (++n > 200) clearInterval(iv); }, 100);
  }
  FX.confetti = confetti; FX.openStats = openStats; FX.share = shareMatch; FX.calendarURL = calendarURL;
  FX._t = { cfg: cfg, setFx: setFx, stats: computeStats, scan: scanScores, renderShare: renderShare, checkGoal: checkGoal };
  w.LSL = w.LSL || {}; w.LSL.fx = FX;
  if (d.body) boot(); else d.addEventListener('DOMContentLoaded', boot);
})(window);
