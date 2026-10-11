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

  /* ---------- ajustes: valores del admin (para todos) + elección de cada persona ---------- */
  var DEF = { tilt: true, confetti: true, flip: true, aurora: true, crest3d: true, glow: true, ripple: true, haptic: true, lists: true, slowpoll: true };
  var ADM_DEF = {
    defaults: {}, userFx: true, userZoom: true, trans: 'morph', skel: 'shimmer', zoom: 100,
    champ: { on: true, auto: true, liga: true, copas: true, title: '¡CAMPEÓN!', color: 'gold', confetti: true, secs: 8, ver: 1, manual: null }
  };
  var admDraft = null;                       // copia que se está editando en el panel de admin (se aplica en vivo)
  function adminFx() {
    if (admDraft) return admDraft;
    var s0 = st(), a0 = (s0 && s0.design && s0.design.fx) || {};
    return Object.assign({}, ADM_DEF, a0, { defaults: Object.assign({}, a0.defaults || {}), champ: Object.assign({}, ADM_DEF.champ, a0.champ || {}) });
  }
  function eff(k) {
    var a1 = adminFx(), u = (L().prefs || {}).fx || {};
    if (a1.userFx !== false && u[k] !== undefined) return !!u[k];       // lo que eligió la persona (si el admin lo permite)
    if (a1.defaults && a1.defaults[k] !== undefined) return !!a1.defaults[k];   // lo que puso el admin para todos
    return DEF[k];
  }
  function cfg() { var o = {}; Object.keys(DEF).forEach(function (k) { o[k] = eff(k); }); return o; }
  function zoomEff() {
    var a1 = adminFx(), u = (L().prefs || {}).fx || {};
    var z = (a1.userZoom !== false && u.zoom != null) ? +u.zoom : +a1.zoom;
    return Math.max(85, Math.min(115, z || 100));
  }
  function setFx(k, v) {                       // guarda solo lo que la persona cambió; null = volver al valor del admin
    var P = L().prefs; if (!P) return;
    P.fx = Object.assign({}, P.fx || {}); if (v === null) delete P.fx[k]; else P.fx[k] = v;
    if (L().savePrefs) L().savePrefs();
    applyAttrs();
  }
  function applyAttrs() {
    var c = cfg(), a1 = adminFx();
    Object.keys(DEF).forEach(function (k) { root.setAttribute('data-fx-' + k, c[k] ? '1' : '0'); });
    root.setAttribute('data-fx-trans', a1.trans || 'morph');
    root.setAttribute('data-fx-skel', a1.skel || 'shimmer');
    var z = zoomEff(); root.style.setProperty('--fx-zoom', (z / 100).toFixed(2));
    if (z !== 100) root.setAttribute('data-fx-zoomed', ''); else root.removeAttribute('data-fx-zoomed');
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
    '.fx-pv p{margin:0;color:var(--mut,#9fb0cc);font-size:12.5px;text-align:center}' +
    /* texto ajustable */
    'html[data-fx-zoomed] #view,html[data-fx-zoomed] #sbody{zoom:var(--fx-zoom)}' +
    '#fx-sec .fx-zr{display:flex;gap:10px;align-items:center;padding:4px 0 10px}#fx-sec .fx-zr input{flex:1;accent-color:var(--ac,#27C4C9)}#fx-sec .fx-zr .fx-test{margin:0;width:auto;padding:8px 12px}' +
    /* transición entre pantallas */
    '.fx-ghost{position:fixed;top:0;z-index:5;overflow:hidden;pointer-events:none}' +
    '@keyframes fx-gout-n{to{transform:translate3d(-36px,0,0);opacity:0}}@keyframes fx-gout-p{to{transform:translate3d(36px,0,0);opacity:0}}@keyframes fx-gout-f{to{opacity:0}}' +
    '@keyframes fx-in-n{from{transform:translate3d(44px,0,0);opacity:0}}@keyframes fx-in-p{from{transform:translate3d(-44px,0,0);opacity:0}}@keyframes fx-in-f{from{opacity:0}}' +
    '.fx-ghost[data-d=n]{animation:fx-gout-n .28s ease-in forwards}.fx-ghost[data-d=p]{animation:fx-gout-p .28s ease-in forwards}.fx-ghost[data-d=f]{animation:fx-gout-f .22s ease-in forwards}' +
    F + '[data-fx-trans=morph] .view.enter[data-fxd=n],' + F + '[data-fx-trans=slide] .view.enter[data-fxd=n]{animation:fx-in-n .34s cubic-bezier(.2,.8,.3,1) both}' +
    F + '[data-fx-trans=morph] .view.enter[data-fxd=p],' + F + '[data-fx-trans=slide] .view.enter[data-fxd=p]{animation:fx-in-p .34s cubic-bezier(.2,.8,.3,1) both}' +
    F + '[data-fx-trans=fade] .view.enter[data-fxd]{animation:fx-in-f .26s ease-out both}' +
    /* la tarjeta se convierte en el detalle del partido */
    'html[data-fxm] #sheet .panel{transition:none!important;animation:fx-pin .38s cubic-bezier(.2,.8,.2,1) both}' +
    '@keyframes fx-pin{0%{opacity:0;transform:scale(.96)}60%{opacity:1}100%{opacity:1;transform:none}}' +
    /* esqueletos de imágenes */
    'html[data-fx-skel=shimmer] img.fx-sk{background:linear-gradient(100deg,var(--card2,#1b2740) 30%,rgba(255,255,255,.14) 50%,var(--card2,#1b2740) 70%) 0 0/300% 100%;animation:fx-sh 1.3s linear infinite}' +
    'html[data-fx-skel=static] img.fx-sk,html[data-fx-skel=shimmer][data-perf=lite] img.fx-sk{background:var(--card2,#1b2740)}' +
    '@keyframes fx-sh{to{background-position:-300% 0}}' +
    /* campeón */
    '.fx-champ{position:fixed;inset:0;z-index:2147482700;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;color:#fff;cursor:pointer;background:radial-gradient(120% 90% at 50% 30%,color-mix(in srgb,var(--cc,#27C4C9) 55%,#04101F),#020812 70%);animation:fx-chin .4s ease-out both}' +
    '@keyframes fx-chin{from{opacity:0}}' +
    '.fx-champ svg.fx-tr{width:min(46vw,200px);height:auto;filter:drop-shadow(0 12px 28px rgba(0,0,0,.5));animation:fx-trin .9s cubic-bezier(.2,1.3,.4,1) both}' +
    '@keyframes fx-trin{0%{transform:translateY(40px) scale(.3) rotate(-12deg);opacity:0}100%{transform:none;opacity:1}}' +
    '.fx-champ .fx-cr{display:flex;align-items:center;justify-content:center;margin:16px 0 6px;width:84px;height:84px;border-radius:50%;object-fit:cover;font:800 28px system-ui,sans-serif;animation:fx-crin .7s .35s ease-out both}' +
    '@keyframes fx-crin{from{transform:scale(.4);opacity:0}}' +
    '.fx-champ small{letter-spacing:3px;font-weight:800;font-size:15px;opacity:.9;text-transform:uppercase}' +
    '.fx-champ h2{margin:6px 0 4px;font:900 38px/1.05 system-ui,sans-serif;letter-spacing:.3px}' +
    '.fx-champ b{font-size:22px}.fx-champ .fx-sub{margin-top:4px;opacity:.7;font-size:15px}.fx-champ em{margin-top:28px;font-style:normal;font-size:12.5px;opacity:.55}' +
    /* panel de admin: Efectos y animaciones */
    '.fxp{position:fixed;left:0;right:0;bottom:0;z-index:2147482000;height:62vh;max-height:calc(100vh - 96px);display:flex;flex-direction:column;background:var(--bg2,#0f1b33);color:var(--tx,#fff);border-top:1px solid var(--line,rgba(255,255,255,.14));border-radius:20px 20px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.5);transition:transform .3s cubic-bezier(.3,.7,.2,1);font:500 14px/1.35 system-ui,-apple-system,sans-serif}' +
    '.fxp.min{transform:translateY(calc(100% - 58px))}' +
    '.fxp-h{display:flex;align-items:center;gap:8px;padding:12px 14px 8px}.fxp-h b{flex:1;font-size:15px}' +
    '.fxp-ib{display:flex;align-items:center;justify-content:center;padding:0;width:36px;height:36px;border-radius:50%;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--card,#16233f);color:inherit;font-size:15px;cursor:pointer}' +
    '.fxp-t{display:flex;gap:6px;padding:0 12px 8px;overflow-x:auto;scrollbar-width:none}' +
    '.fxp-t button{flex:none;padding:7px 13px;border-radius:999px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--card,#16233f);color:inherit;font:600 13px system-ui;cursor:pointer}' +
    '.fxp-t button.on{background:var(--ac,#27C4C9);color:var(--on-ac,#001018);border-color:transparent}' +
    '.fxp-b{flex:1;overflow-y:auto;padding:4px 14px 18px;-webkit-overflow-scrolling:touch}' +
    '.fxp h4{margin:16px 0 8px;font-size:11.5px;text-transform:uppercase;letter-spacing:.9px;color:var(--mut,#9fb0cc)}.fxp h4:first-child{margin-top:4px}' +
    '.fxa-r{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line,rgba(255,255,255,.1))}.fxa-r>span{flex:1}.fxa-r small{display:block;color:var(--mut,#9fb0cc);font-size:11.5px;margin-top:2px}' +
    '.fxa-r input{-webkit-appearance:none;appearance:none;width:44px;height:26px;border-radius:13px;background:var(--card2,#2a3550);position:relative;flex:none;margin:0;transition:background .2s}' +
    '.fxa-r input:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}' +
    '.fxa-r input:checked{background:var(--ac,#27C4C9)}.fxa-r input:checked:after{transform:translateX(18px)}' +
    '.fxa-f{display:block;margin:12px 0}.fxa-f>span{display:block;font-size:12.5px;color:var(--mut,#9fb0cc);margin-bottom:6px}' +
    '.fxa-f select,.fxa-f input[type=text]{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--card,#16233f);color:inherit;font:inherit}' +
    '.fxa-f input[type=range]{width:100%;accent-color:var(--ac,#27C4C9)}' +
    '.fxa-g{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}' +
    '.fxa-b{padding:10px 12px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--card,#16233f);color:inherit;font:600 13px system-ui;cursor:pointer}.fxa-b.pri{background:var(--ac,#27C4C9);color:var(--on-ac,#001018);border-color:transparent}.fxa-b.dng{color:#ff6b7d}' +
    '.fxa-hint{font-size:12px;color:var(--mut,#9fb0cc);margin:6px 0 10px}' +
    '.fxp-f{display:flex;gap:8px;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,rgba(255,255,255,.14))}.fxp-f .fxa-b{flex:1}';
  function injectCSS() { if (d.getElementById('lsl-fx-css')) return; var s = d.createElement('style'); s.id = 'lsl-fx-css'; s.textContent = CSS; d.head.appendChild(s); }

  /* ---------- confeti ---------- */
  function confetti(colors, opt) {
    opt = opt || {};
    if ((!opt.force && !cfg().confetti) || lite() || reduced) return;
    var old = d.getElementById('fx-cf'); if (old && !opt.keep) { old.remove(); old = null; }
    var c = d.createElement('canvas'), W = c.width = w.innerWidth, H = c.height = w.innerHeight;
    if (!old) c.id = 'fx-cf'; c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:' + (opt.force ? 2147482800 : 2147482500);
    d.body.appendChild(c);
    var g = c.getContext('2d'), P = [], cols = colors && colors.length ? colors : ['#27C4C9', '#FFD226', '#ffffff', '#ff5468'];
    for (var i = 0; i < (opt.n || 110); i++) P.push({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .28, vx: (Math.random() - .5) * 11, vy: -Math.random() * 13 - 3, r: Math.random() * 6 + 3, a: Math.random() * 6, va: (Math.random() - .5) * .4, c: cols[i % cols.length], s: i % 3 });
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
    var cardEl = e.target && e.target.closest && e.target.closest('[data-match],[data-news]'); if (cardEl) { lastCard = cardEl; lastCardAt = Date.now(); }
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
    var a1 = adminFx(), c = cfg(), showFx = a1.userFx !== false, showZ = a1.userZoom !== false;
    if (!showFx && !showZ) return '';
    var h = '<section class="dr-c" id="fx-sec" data-sig="' + sig() + '"><h3>Efectos</h3>';
    if (showZ) {
      var z = zoomEff();
      h += '<div class="fx-r" style="border-top:0"><span>Tamaño del texto <b data-fx-zv>' + z + '%</b><small>Agranda o achica el contenido de las pantallas</small></span></div>' +
        '<div class="fx-zr"><input type="range" min="85" max="115" step="5" value="' + z + '" data-fx-zoom aria-label="Tamaño del texto"><button type="button" class="fx-test" data-fx-zreset>Restablecer</button></div>';
    }
    if (showFx) {
      h += '<p class="mut sm">' + (lite() ? 'Estás en modo Ligero: los efectos visuales están apagados y se usan las optimizaciones.' : 'Elegí qué efectos querés ver. Las opciones "Solo Ligero" se usan únicamente en modo Ligero.') + '</p>' +
        ROWS.map(function (r) { return '<label class="fx-r"><span>' + r[1] + '<small>' + r[2] + '</small></span><input type="checkbox" data-fx-t="' + r[0] + '"' + (c[r[0]] ? ' checked' : '') + '></label>'; }).join('') +
        (lite() ? '' : '<button type="button" class="fx-test" data-fx-demo>🎉 Probar confeti</button>');
    }
    return h + '</section>';
  }
  function sig() { var a1 = adminFx(); return (a1.userFx !== false ? 1 : 0) + ':' + (a1.userZoom !== false ? 1 : 0) + ':' + (lite() ? 'l' : 'f'); }
  function injectDrawer() {
    var dr = d.getElementById('drawer'); if (!dr) return;
    var perf = dr.querySelector('#dr-perf'), cur = dr.querySelector('#fx-sec');
    if (cur && cur.getAttribute('data-sig') !== sig()) { cur.remove(); cur = null; }
    if (perf && !cur) { var html = sectionHTML(); if (html) perf.insertAdjacentHTML('afterend', html); }
    var nav = dr.querySelector('.dr-l');
    if (nav && !nav.querySelector('[data-fx-stats]')) nav.insertAdjacentHTML('afterbegin', '<button type="button" data-fx-stats>' + ((L().ui && L().ui.ic) ? L().ui.ic('trophy') : '') + 'Estadísticas</button>');
  }
  d.addEventListener('input', function (e) {
    var t = e.target; if (!t || !t.hasAttribute || !t.hasAttribute('data-fx-zoom')) return;
    setFx('zoom', +t.value); var lb = d.querySelector('[data-fx-zv]'); if (lb) lb.textContent = zoomEff() + '%';
  });
  d.addEventListener('change', function (e) {
    var k = e.target && e.target.getAttribute && e.target.getAttribute('data-fx-t'); if (!k) return;
    setFx(k, e.target.checked); if (k === 'tilt' && e.target.checked) askOrientation();
  });
  d.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    if (t.closest('[data-fx-demo]')) { confetti(); return; }
    if (t.closest('[data-fx-zreset]')) { setFx('zoom', null); var old = d.getElementById('fx-sec'); if (old) old.remove(); schedule(); return; }
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

  /* ---------- transiciones entre pantallas y del detalle del partido ---------- */
  var lastTab = null, lastCard = null, lastCardAt = 0, ORDER = ['home', 'league', 'matches', 'news', 'profile'];
  function transMode() { return (lite() || reduced) ? 'off' : (adminFx().trans || 'morph'); }
  // app.js llama a tabOut ANTES de cambiar el contenido y a tabIn DESPUÉS: así el contenido viejo sale mientras entra el nuevo
  FX.tabOut = function (view, tab) {
    var prev = lastTab; lastTab = tab; var T = transMode();
    if (T === 'off' || !prev || prev === tab || !view) return null;
    var r = view.getBoundingClientRect(), g = d.createElement('div'), c = view.cloneNode(true);
    c.removeAttribute('id'); c.classList.remove('enter');
    c.style.cssText = 'position:absolute;left:0;top:' + r.top + 'px;width:' + r.width + 'px;margin:0';
    g.className = 'fx-ghost'; g.setAttribute('aria-hidden', 'true');
    g.style.cssText = 'left:' + r.left + 'px;width:' + r.width + 'px;height:' + (w.innerHeight || 800) + 'px';
    var dir = T === 'fade' ? 'f' : (ORDER.indexOf(tab) >= ORDER.indexOf(prev) ? 'n' : 'p');
    g.setAttribute('data-d', dir); g.appendChild(c); d.body.appendChild(g);
    return { g: g, dir: dir };
  };
  FX.tabIn = function (tok, view) {
    if (!tok) return;
    view.setAttribute('data-fxd', tok.dir);
    setTimeout(function () { if (tok.g.parentNode) tok.g.parentNode.removeChild(tok.g); view.removeAttribute('data-fxd'); }, 520);
  };
  // La tarjeta tocada se expande hasta convertirse en el detalle (solo en modo "Morphing")
  function wrapSheet() {
    var UI = L().ui; if (!UI || !UI.openSheet || UI.openSheet.__fx) return;
    var orig = UI.openSheet;
    var fn = function () {
      var src = lastCard, ok = transMode() === 'morph' && src && (Date.now() - lastCardAt) < 1500 && d.body.contains(src);
      lastCard = null;
      if (!ok) return orig.apply(UI, arguments);
      var r = src.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return orig.apply(UI, arguments);
      var ghost = src.cloneNode(true);
      ghost.querySelectorAll('.fx-gl,.fx-rp,.fx-fl').forEach(function (n) { n.remove(); });
      ghost.removeAttribute('id'); ghost.setAttribute('data-fxg', '1');
      root.setAttribute('data-fxm', '');
      var ret = orig.apply(UI, arguments);
      var panel = d.querySelector('#sheet .panel'), pr = panel ? panel.getBoundingClientRect() : null;
      if (!pr || !pr.width) { root.removeAttribute('data-fxm'); return ret; }
      ghost.style.cssText = 'position:fixed;margin:0;z-index:2147482400;pointer-events:none;transform-origin:0 0;overflow:hidden;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
      d.body.appendChild(ghost);
      var tx = pr.left - r.left, ty = pr.top - r.top, sx = pr.width / r.width, sy = pr.height / r.height;
      var done = function () { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); root.removeAttribute('data-fxm'); };
      if (ghost.animate) {
        var an = ghost.animate([
          { transform: 'translate(0,0) scale(1,1)', opacity: 1 },
          { opacity: .85, offset: .5 },
          { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + sx + ',' + sy + ')', opacity: 0 }
        ], { duration: 400, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
        an.onfinish = done;
      }
      setTimeout(done, 700);
      return ret;
    };
    fn.__fx = true; UI.openSheet = fn;
  }

  /* ---------- esqueletos: marcador de posición de las imágenes mientras cargan ---------- */
  function scanSkel() {
    if ((adminFx().skel || 'shimmer') === 'off') return;
    d.querySelectorAll('img').forEach(function (im) {
      if (im.complete || im.classList.contains('fx-sk') || im.closest('#fx-share,#fx-champ')) return;
      im.classList.add('fx-sk');
      var rm = function () { im.classList.remove('fx-sk'); im.removeEventListener('load', rm); im.removeEventListener('error', rm); };
      im.addEventListener('load', rm); im.addEventListener('error', rm);
    });
  }

  /* ---------- campeón: trofeo y confeti al terminar la liga o una copa (o cuando lo corona el admin) ---------- */
  var CK = 'lsl:fx-champ';
  function chGet() { try { var a = JSON.parse(localStorage.getItem(CK)); return Array.isArray(a) ? a : null; } catch (e) { return null; } }
  function chSet(a) { try { localStorage.setItem(CK, JSON.stringify(a.slice(-60))); } catch (e) { } }
  function parseSc(x) { var m = /(\d+)\s*[-–:]\s*(\d+)/.exec(String(x || '')); return m ? [+m[1], +m[2]] : null; }
  function tieWinner(legs) {                  // misma regla que la llave de copas de la app: global, ida en texto y penales
    legs = legs.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var A = legs[0].home, B = legs[0].away, ga = 0, gb = 0, done = true;
    legs.forEach(function (m) {
      if (m.status !== 'finished') done = false;
      if (m.status === 'upcoming') return;
      var hs = +m.hs || 0, as = +m.as || 0;
      if (m.home === A) { ga += hs; gb += as; } else { ga += as; gb += hs; }
    });
    var f = legs.length === 1 && legs[0].leg2 ? parseSc(legs[0].firstLeg) : null; if (f) { ga += f[1]; gb += f[0]; }
    if (!done) return null;
    var last = legs[legs.length - 1], pn = parseSc(last.pens), pa = null, pb = null;
    if (pn) { pa = last.home === A ? pn[0] : pn[1]; pb = last.home === A ? pn[1] : pn[0]; }
    return ga > gb ? A : gb > ga ? B : (pn ? (pa > pb ? A : pb > pa ? B : null) : null);
  }
  function champions() {
    var s0 = st(), out = [], ms = (s0 && s0.matches) || [], season = (s0 && s0.league && s0.league.season) || '', cp = adminFx().champ, v = '#v' + (+cp.ver || 1);
    if (cp.liga) {
      var ls = ms.filter(function (m) { return m.comp === 'liga'; });
      if (ls.length && ls.every(function (m) { return m.status === 'finished'; })) {
        var row = S().standings()[0]; if (row) out.push({ key: 'liga:' + season + ':' + row.id + v, team: row.id, title: 'Campeón de la liga', sub: season });
      }
    }
    if (cp.copas) {
      var names = {}; ms.forEach(function (m) { if (m.comp === 'copa') names[m.cup || 'Copa'] = 1; });
      Object.keys(names).forEach(function (n) {
        var fin = ms.filter(function (m) { return m.comp === 'copa' && (m.cup || 'Copa') === n && /\bfinal\b/i.test(m.round || '') && !/semi|cuartos|octavos|dieciseis|treintaidos|1\/\d/i.test(m.round || ''); });
        if (!fin.length) return;
        var pairs = {}; fin.forEach(function (m) { var k = [m.home, m.away].sort().join('|'); (pairs[k] = pairs[k] || []).push(m); });
        var last = Object.keys(pairs).map(function (k) { return pairs[k]; }).sort(function (x, y) { return new Date(y[0].date) - new Date(x[0].date); })[0];
        var win = tieWinner(last); if (win) out.push({ key: 'copa:' + n + ':' + season + ':' + win + v, team: win, title: 'Campeón de ' + n, sub: season });
      });
    }
    var man = cp.manual; if (man && man.team) out.push({ key: 'manual:' + man.id + v, team: man.team, title: man.title || 'Campeón', sub: '', manual: true });
    return out;
  }
  function checkChamp() {
    if (!st() || !L().prefs) return;
    var cp = adminFx().champ, list = champions(), seen = chGet();
    if (seen === null) { chSet(list.map(function (x) { return x.key; })); return; }      // primera vez en este celular: no repite lo viejo
    var fresh = list.filter(function (x) { return seen.indexOf(x.key) < 0; }); if (!fresh.length) return;
    if (L().adminOpen) return;                                                           // si el admin está editando, se muestra después
    chSet(seen.concat(fresh.map(function (x) { return x.key; })));
    if (!cp.on) return;
    var pick = fresh.filter(function (x) { return x.manual; })[0] || fresh[fresh.length - 1];
    if (!cp.auto && !pick.manual) return;
    showChamp(pick);
  }
  function trophySVG(p) {
    return '<svg class="fx-tr" viewBox="0 0 120 140" aria-hidden="true"><defs><linearGradient id="fxtg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + p[0] + '"/><stop offset="1" stop-color="' + p[1] + '"/></linearGradient></defs>' +
      '<path d="M30 14h60v32c0 22-14 38-30 42-16-4-30-20-30-42z" fill="url(#fxtg)"/>' +
      '<path d="M30 22H12c0 22 10 36 26 40M90 22h18c0 22-10 36-26 40" fill="none" stroke="url(#fxtg)" stroke-width="8" stroke-linecap="round"/>' +
      '<rect x="52" y="88" width="16" height="22" rx="3" fill="url(#fxtg)"/><rect x="34" y="110" width="52" height="14" rx="5" fill="url(#fxtg)"/>' +
      '<path d="M44 26c0 14 4 26 12 34" stroke="rgba(255,255,255,.55)" stroke-width="5" fill="none" stroke-linecap="round"/></svg>';
  }
  function showChamp(info) {
    var t = team(info.team); if (!t) return;
    var cp = adminFx().champ, col = hex(t.color, '#27C4C9'), old = d.getElementById('fx-champ'); if (old) old.remove();
    var pair = cp.color === 'silver' ? ['#F4F7FB', '#9AA7B8'] : cp.color === 'team' ? ['#ffffff', col] : ['#FFE27A', '#E0A100'];
    var crest = t.logo ? '<img class="fx-cr" alt="" src="' + esc(t.logo) + '">' : '<span class="fx-cr" style="background:linear-gradient(135deg,' + col + ',' + rgba(col, .6) + ')">' + esc((t.short || t.name).slice(0, 3).toUpperCase()) + '</span>';
    var o = d.createElement('div'); o.id = 'fx-champ'; o.className = 'fx-champ'; o.style.setProperty('--cc', col);
    o.innerHTML = trophySVG(pair) + crest + '<small>' + esc(cp.title || '¡CAMPEÓN!') + '</small><h2>' + esc(t.name) + '</h2><b>' + esc(info.title || 'Campeón') + '</b>' + (info.sub ? '<span class="fx-sub">' + esc(info.sub) + '</span>' : '') + '<em>Tocá para cerrar</em>';
    d.body.appendChild(o);
    var tm = 0, closed = false;
    function close() { if (closed) return; closed = true; clearTimeout(tm); if (o.parentNode) o.parentNode.removeChild(o); }
    o.addEventListener('click', close);
    if (+cp.secs > 0) tm = setTimeout(close, +cp.secs * 1000);
    if (L().pushLayer) L().pushLayer(close);
    if (cp.confetti) {
      var cols = [col, '#ffffff', pair[1]];
      confetti(cols, { force: true, n: 150 }); setTimeout(function () { confetti(cols, { force: true, keep: true, n: 110 }); }, 700); setTimeout(function () { confetti(cols, { force: true, keep: true, n: 90 }); }, 1500);
    }
    try { if (cfg().haptic && navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 120]); } catch (_) { }
  }

  /* ================= PANEL DE ADMIN: Efectos y animaciones ================= */
  var admPanel = null, admTab = 'fx', admT = 0;
  var ATABS = [['fx', 'Efectos'], ['trans', 'Transiciones'], ['champ', 'Campeón'], ['text', 'Texto']];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function aGet(p) { return p.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, admDraft); }
  function aSetV(p, v) { var ks = p.split('.'), o = admDraft; for (var i = 0; i < ks.length - 1; i++) { o[ks[i]] = o[ks[i]] || {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = v; }
  function admCommit(now) {
    clearTimeout(admT);
    function run() { var s1 = S(); if (!s1 || !s1.commit || !admDraft) return; var snap = clone(admDraft); s1.commit(function (state) { state.design = state.design || {}; state.design.fx = snap; }); }
    if (now) run(); else admT = setTimeout(run, 350);
  }
  function aChk(p, l, h) { var v = aGet(p); if (v === undefined && /^defaults\./.test(p)) v = DEF[p.slice(9)]; return '<label class="fxa-r"><span>' + l + (h ? '<small>' + h + '</small>' : '') + '</span><input type="checkbox" data-ap="' + p + '"' + (v ? ' checked' : '') + '></label>'; }
  function aRng(p, l, a, b, s1, u) { var v = aGet(p); return '<label class="fxa-f"><span>' + l + ': <b data-av="' + p + '">' + v + '</b>' + (u || '') + '</span><input type="range" data-ap="' + p + '" min="' + a + '" max="' + b + '" step="' + (s1 || 1) + '" value="' + v + '"></label>'; }
  function aSel(p, l, o) { var v = aGet(p); return '<label class="fxa-f"><span>' + l + '</span><select data-ap="' + p + '">' + o.map(function (x) { return '<option value="' + x[0] + '"' + (String(v) === String(x[0]) ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>'; }
  function aTxt(p, l, ph) { return '<label class="fxa-f"><span>' + l + '</span><input type="text" data-ap="' + p + '" placeholder="' + esc(ph || '') + '" value="' + esc(aGet(p) || '') + '"></label>'; }
  function tabFx() {
    var h = '<p class="fxa-hint">Lo que elijas acá es el valor por defecto para todos. Cada persona puede cambiarlo desde su menú ☰, salvo que lo bloquees.</p>' +
      aChk('userFx', 'Permitir que cada persona elija sus efectos', 'Muestra la sección Efectos en el menú ☰') + '<h4>Por defecto para todos</h4>';
    ROWS.forEach(function (r) { h += aChk('defaults.' + r[0], r[1], r[2]); });
    return h;
  }
  function tabTrans() {
    return '<h4>Entre pantallas</h4>' + aSel('trans', 'Animación', [['morph', 'Morphing: las pantallas se deslizan y la tarjeta se abre en el detalle'], ['slide', 'Solo deslizar las pantallas'], ['fade', 'Solo desvanecer'], ['off', 'Sin animación']]) +
      '<p class="fxa-hint">Solo se ve en modo Alto. Para verlo, cerrá el panel de admin y cambiá de pestaña o abrí un partido.</p>' +
      '<h4>Mientras cargan las imágenes</h4>' + aSel('skel', 'Marcador de posición', [['shimmer', 'Brillo animado (en Ligero queda fijo)'], ['static', 'Fijo'], ['off', 'Ninguno']]);
  }
  function tabChamp() {
    var teams = (st() && st().teams) || [];
    return aChk('champ.on', 'Mostrar la animación de campeón') +
      aChk('champ.auto', 'Detectar sola cuándo termina', 'Liga: cuando todos sus partidos están terminados. Copa: cuando la final ya tiene ganador.') +
      aChk('champ.liga', 'Incluir la liga') + aChk('champ.copas', 'Incluir las copas') +
      aTxt('champ.title', 'Texto grande', '¡CAMPEÓN!') +
      aSel('champ.color', 'Color del trofeo', [['gold', 'Dorado'], ['silver', 'Plateado'], ['team', 'Color del equipo']]) +
      aChk('champ.confetti', 'Confeti') + aRng('champ.secs', 'Se cierra sola a los (0 = solo al tocar)', 0, 30, 1, ' s') +
      '<h4>Coronar a mano</h4><label class="fxa-f"><span>Equipo campeón</span><select data-mt>' + teams.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="fxa-f"><span>Título (opcional)</span><input type="text" data-mtx placeholder="Ej: Campeón de la Copa Súper"></label>' +
      '<div class="fxa-g"><button type="button" class="fxa-b pri" data-aa="crown">👑 Coronar y avisar</button><button type="button" class="fxa-b" data-aa="prev">▶ Probar acá</button></div>' +
      '<p class="fxa-hint">Todos ven la celebración una sola vez, la próxima vez que abran la app.</p>' +
      '<button type="button" class="fxa-b" data-aa="again">Volver a mostrar a todos…</button>';
  }
  function tabText() {
    return aRng('zoom', 'Tamaño del texto por defecto', 85, 115, 5, ' %') + aChk('userZoom', 'Permitir que cada persona lo cambie', 'Aparece un control en el menú ☰') +
      '<p class="fxa-hint">Agranda o achica el contenido de las pantallas y del detalle de los partidos.</p>';
  }
  var ATAB_FN = { fx: tabFx, trans: tabTrans, champ: tabChamp, text: tabText };
  function admRender(keep) {
    var b = admPanel.querySelector('.fxp-b'), top = b.scrollTop; b.innerHTML = ATAB_FN[admTab]();
    admPanel.querySelectorAll('.fxp-t button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-at') === admTab); });
    if (keep) b.scrollTop = top;
  }
  function openAdmin() {
    if (admPanel) return;
    admDraft = clone(adminFx());
    admPanel = d.createElement('div'); admPanel.className = 'fxp';
    admPanel.innerHTML = '<div class="fxp-h"><b>Efectos y animaciones</b><button type="button" class="fxp-ib" data-ad="min" aria-label="Achicar panel">▾</button><button type="button" class="fxp-ib" data-ad="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="fxp-t">' + ATABS.map(function (x) { return '<button type="button" data-at="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div class="fxp-b"></div>' +
      '<div class="fxp-f"><button type="button" class="fxa-b dng" data-ad="reset">Restablecer todo</button></div>';
    d.body.appendChild(admPanel); admRender();
    admPanel.addEventListener('input', onAdmInput); admPanel.addEventListener('change', onAdmChange); admPanel.addEventListener('click', onAdmClick);
    if (L().pushLayer) L().pushLayer(closeAdmin);
  }
  function closeAdmin() {
    if (!admPanel) return;
    admCommit(true); admPanel.parentNode.removeChild(admPanel); admPanel = null; admDraft = null; applyAttrs();
  }
  function admApply(t) {
    var p = t.getAttribute('data-ap'); if (!p) return false;
    var v = t.type === 'checkbox' ? t.checked : (t.type === 'range' ? +t.value : t.value);
    aSetV(p, v); var lb = admPanel.querySelector('[data-av="' + p + '"]'); if (lb) lb.textContent = v;
    applyAttrs(); admCommit(); return true;
  }
  function onAdmInput(e) { var t = e.target; if (t.type === 'range' || t.type === 'text') admApply(t); }
  function onAdmChange(e) { var t = e.target; if (t.type === 'checkbox' || t.tagName === 'SELECT') admApply(t); }
  function toast(m) { if (L().ui && L().ui.toast) L().ui.toast(m); }
  function onAdmClick(e) {
    var b = e.target.closest('button'); if (!b) return;
    var at = b.getAttribute('data-at'), ad = b.getAttribute('data-ad'), aa = b.getAttribute('data-aa');
    if (at) { admTab = at; admRender(); return; }
    if (ad === 'close') { closeAdmin(); toast('Efectos guardados'); return; }
    if (ad === 'min') { admPanel.classList.toggle('min'); b.textContent = admPanel.classList.contains('min') ? '▴' : '▾'; return; }
    if (ad === 'reset') { if (w.confirm && !w.confirm('¿Volver todos los efectos y animaciones a su configuración original?')) return; admDraft = clone(ADM_DEF); applyAttrs(); admCommit(true); admRender(); return; }
    if (aa) {
      var tm = admPanel.querySelector('[data-mt]'), tx = admPanel.querySelector('[data-mtx]');
      if (aa === 'crown') { if (!tm || !tm.value) return toast('Elegí un equipo'); admDraft.champ.manual = { id: Date.now(), team: tm.value, title: (tx && tx.value.trim()) || '' }; admCommit(true); toast('Listo: todos verán la celebración al abrir la app'); return; }
      if (aa === 'prev') { if (!tm || !tm.value) return; showChamp({ team: tm.value, title: (tx && tx.value.trim()) || 'Campeón', sub: '' }); return; }
      if (aa === 'again') { if (w.confirm && !w.confirm('Todos van a volver a ver las celebraciones. ¿Seguro?')) return; admDraft.champ.ver = (+admDraft.champ.ver || 1) + 1; admCommit(true); toast('Se volverá a mostrar a todos'); return; }
    }
  }
  function injectAdminCard() {
    var m = d.querySelector('#admin-root .adm-menu'); if (!m || m.querySelector('[data-fx-adm]')) return;
    var b = d.createElement('button'); b.type = 'button'; b.className = 'am-card c4'; b.setAttribute('data-fx-adm', '1');
    b.innerHTML = '<span class="am-ic"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/></svg></span><span class="am-tx"><b>Efectos y animaciones</b><small>Transiciones, campeón, texto y más</small></span><span class="am-go"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></span>';
    m.insertBefore(b, m.firstChild);
  }
  function hookAdmin() {
    d.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-fx-adm]'); if (b) { e.preventDefault(); e.stopPropagation(); openAdmin(); } }, true);
    var tries = 0, iv = setInterval(function () {
      var r = d.getElementById('admin-root');
      if (r) { clearInterval(iv); new MutationObserver(injectAdminCard).observe(r, { childList: true, subtree: true }); injectAdminCard(); }
      else if (++tries > 400) clearInterval(iv);
    }, 300);
  }

  /* ---------- vigilancia del DOM ---------- */
  var raf = 0;
  function schedule() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; try { injectDrawer(); injectSheet(); scanScores(); liteImgs(); scanSkel(); } catch (e) { } }); }
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
    L().fx = FX; lastTab = (L().curTab && L().curTab()) || null; applyAttrs(); snapScores(); wrapSheet();
    S().on('change', function () { checkGoal(); schedule(); applyAttrs(); checkChamp(); });
    watch(); hookAdmin(); setTimeout(checkChamp, 1800);
  }
  function boot() {
    injectCSS();
    var n = 0, iv = setInterval(function () { if (L().store && st() && L().prefs && S().on) { clearInterval(iv); attach(); } else if (++n > 200) clearInterval(iv); }, 100);
  }
  FX.confetti = confetti; FX.openStats = openStats; FX.share = shareMatch; FX.calendarURL = calendarURL;
  FX.openAdmin = openAdmin; FX.showChamp = showChamp;
  FX._t = { cfg: cfg, setFx: setFx, stats: computeStats, scan: scanScores, renderShare: renderShare, checkGoal: checkGoal, adminFx: adminFx, eff: eff, zoomEff: zoomEff, champions: champions, checkChamp: checkChamp };
  w.LSL = w.LSL || {}; w.LSL.fx = FX;
  if (d.body) boot(); else d.addEventListener('DOMContentLoaded', boot);
})(window);
