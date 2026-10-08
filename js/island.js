/* La Súper Liga · island.js
   Isla dinámica configurable. Todo en un solo archivo:
   - la isla (forma, color, lugar, rotación, animaciones, contenido en "diapositivas")
   - el panel de ajustes (hoja inferior) que aparece como tarjeta "Isla dinámica" en el menú del admin
   La configuración se guarda en S.state.design.isl, así que se publica/sincroniza como el resto del diseño.
   Se instala con UNA línea en index.html:  <script src="js/island.js"></script>  (reemplaza la isla vieja). */
(function (w) {
  'use strict';
  var d = document, ISL = {};
  function L() { return w.LSL || {}; }
  function S() { return L().store; }
  function st() { var s = S(); return s && s.state; }

  /* ---------- valores por defecto (= la isla de siempre) ---------- */
  var DEF = {
    on: true, style: 'pill',
    pos: 'top', off: 50, gap: 8, rot: 0,
    w: 104, h: 30, r: 20, ow: 210, oh: 46, or: 26, fs: 12,
    bg: '#000000', bg2: '', ang: 135, theme: false, fg: '#ffffff', dot: '',
    bc: '', bw: 0, glow: '', gi: 0, op: 100,
    aopen: 'spring', speed: 100, idle: 'none', dotk: 'pulse', tr: 'fade',
    tap: 'expand', go: 'matches', close_after: 3, cycle: 0, auto_every: 0, auto_for: 4,
    alert: false, alert_news: false, haptic: true, fit: true,
    slides: [{ t: 'league' }]
  };
  var cfg = clone(DEF), el = null, open = false, idx = 0, playing = false, audio = null;
  var tClose = 0, tCycle = 0, tAuto = 0, tTick = 0, tSave = 0, panel = null, tab = 'design', popAct = null, popping = false, minSeen = {}, scores = {};

  /* ---------- utilidades ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hex(v, f) { return /^#[0-9a-f]{6}$/i.test(v || '') ? v : f; }
  function num(v, a, b, f) { v = +v; if (isNaN(v)) v = f; return Math.max(a, Math.min(b, v)); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function rgba(h, a) { var n = parseInt(hex(h, '#000000').slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function merge(c) {
    var o = clone(DEF);
    if (c && typeof c === 'object') Object.keys(c).forEach(function (k) {
      if (k === 'slides') { if (Array.isArray(c.slides)) o.slides = c.slides.filter(Boolean).slice(0, 12).map(function (x) { return Object.assign({}, x); }); }
      else o[k] = c[k];
    });
    return o;
  }
  function accent() { var s = st(); return hex(s && s.design && s.design.accent, '#27C4C9'); }
  function leagueName() { var s = st(); return (s && s.league && s.league.name) || 'La Súper Liga'; }
  function team(id) { var s = st(); return s ? s.teams.filter(function (t) { return t.id === id; })[0] : null; }
  function tn(id) { var t = team(id); return t ? (t.short || t.name) : '?'; }
  function tc(id) { var t = team(id); return hex(t && t.color, '#888888'); }
  function nextMatch() { var s = st(); if (!s) return null; return s.matches.filter(function (m) { return m.status === 'upcoming'; }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); })[0] || null; }
  function liveMatches() { var s = st(); return s ? s.matches.filter(function (m) { return m.status === 'live' || m.status === 'paused'; }) : []; }
  function fmtDay(iso) { var t = new Date(iso); if (isNaN(t)) return ''; return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][t.getDay()] + ' ' + p2(t.getHours()) + ':' + p2(t.getMinutes()); }
  function timeLeft(iso) {
    var ms = new Date(iso) - Date.now(); if (isNaN(ms)) return 'Elegí una fecha'; if (ms <= 0) return '¡Ya empezó!';
    var dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5), mm = Math.floor(ms % 36e5 / 6e4);
    return dd > 0 ? dd + 'd ' + hh + 'h' : (hh > 0 ? hh + 'h ' + mm + 'm' : mm + ' min');
  }
  function vib(p) { try { if (cfg.haptic && navigator.vibrate) navigator.vibrate(p || 8); } catch (e) { } }

  /* ---------- datos para las funciones nuevas ---------- */
  function logoSrc() { var s = st(); return (s && s.league && s.league.logo) || ''; }
  function dotKind() { if (playing) return 'bars'; if (cfg.dotk === 'logo') return logoSrc() ? 'logo' : 'pulse'; return cfg.dotk; }
  function trackMinutes() { liveMatches().forEach(function (m) { var v = String(m.minute == null ? '' : m.minute), o = minSeen[m.id]; if (!o || o.v !== v) minSeen[m.id] = { v: v, t: Date.now() }; }); }
  function minuteLabel(m) {
    if (m.status === 'paused') return 'Descanso';
    var raw = String(m.minute == null ? '' : m.minute).trim(); if (!raw) return 'En vivo';
    var n = parseInt(raw, 10); if (isNaN(n) || /[+:]/.test(raw)) return raw + "'";
    var o = minSeen[m.id], add = o ? Math.min(20, Math.floor((Date.now() - o.t) / 60000)) : 0;
    return (n + add) + "'";
  }
  function myTeamHTML() {
    var s = st(); if (!s) return null;
    var id = (L().prefs || {}).fav, t = id && team(id);
    if (!t) return '<span class="em">🛡️</span><div class="tx"><b>Elegí tu equipo</b><small>En la pestaña Perfil</small></div>';
    var pos = -1, row = null; S().standings().forEach(function (r, i) { if (r.id === t.id) { pos = i; row = r; } });
    var fin = s.matches.filter(function (m) { return m.status === 'finished' && (m.home === t.id || m.away === t.id); }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var lm = fin[fin.length - 1], sub = 'Sin partidos jugados';
    if (lm) {
      var home = lm.home === t.id, gf = (home ? +lm.hs : +lm.as) || 0, gc = (home ? +lm.as : +lm.hs) || 0;
      sub = (gf > gc ? 'Ganó ' : (gf < gc ? 'Perdió ' : 'Empató ')) + gf + '-' + gc + ' vs ' + tn(home ? lm.away : lm.home) + (gf === gc && lm.pens ? ' (pen. ' + lm.pens + ')' : '');
    }
    return '<i class="td" style="background:' + tc(t.id) + '"></i><div class="tx"><b>' + esc(t.short || t.name) + (row ? ' · ' + (pos + 1) + '° · ' + row.pts + ' pts' : '') + '</b><small>' + esc(sub) + '</small></div>';
  }
  function lastGoal(m, side) {
    var ev = (m.events || []).filter(function (e) { var ty = String(e.type || ''); return (ty === 'goal' && e.side === side) || (ty === 'own' && e.side !== side); });
    ev.sort(function (a, b) { return (+a.min || 0) - (+b.min || 0); }); return ev[ev.length - 1] || null;
  }
  function goalHTML(m, side) {
    var g = lastGoal(m, side), t = side === 'h' ? m.home : m.away;
    return '<span class="em">⚽</span><div class="tx"><b>¡GOL! ' + esc(g && g.player ? g.player : tn(t)) + '</b><small>' + esc(tn(m.home)) + ' ' + (+m.hs || 0) + ' - ' + (+m.as || 0) + ' ' + esc(tn(m.away)) + (g && g.min ? ' · ' + esc(g.min) + "'" : '') + '</small></div>';
  }

  /* ---------- contenido (diapositivas) ---------- */
  var TYPES = [['league', 'Nombre de la liga'], ['text', 'Texto'], ['next', 'Próximo partido'], ['live', 'Partido en vivo (marcador TV)'], ['myteam', 'Tu equipo (puesto y último resultado)'], ['countdown', 'Cuenta regresiva'], ['music', 'Canción'], ['photo', 'Foto'], ['clock', 'Reloj'], ['ticker', 'Texto que se desliza']];
  function slideHTML(s) {
    var m, now = new Date();
    switch (s.t) {
      case 'league': var se = st(); return '<div class="tx"><b>' + esc(leagueName()) + '</b>' + (se && se.league && se.league.season ? '<small>' + esc(se.league.season) + '</small>' : '') + '</div>';
      case 'text': return (s.emo ? '<span class="em">' + esc(s.emo) + '</span>' : '') + '<div class="tx"><b>' + esc(s.text || 'Tu texto acá') + '</b>' + (s.sub ? '<small>' + esc(s.sub) + '</small>' : '') + '</div>';
      case 'next': m = nextMatch(); if (!m) return null;
        return '<div class="tx"><div class="vs"><i class="td" style="background:' + tc(m.home) + '"></i><span>' + esc(tn(m.home)) + '</span><em>vs</em><span>' + esc(tn(m.away)) + '</span><i class="td" style="background:' + tc(m.away) + '"></i></div><small>' + esc(fmtDay(m.date)) + '</small></div>';
      case 'live': m = liveMatches()[0]; if (!m) return null;
        return '<div class="tx"><div class="itv"><i class="bar" style="background:' + tc(m.home) + '"></i><span>' + esc(tn(m.home)) + '</span><strong class="isc">' + (+m.hs || 0) + ' - ' + (+m.as || 0) + '</strong><span>' + esc(tn(m.away)) + '</span><i class="bar" style="background:' + tc(m.away) + '"></i></div><small class="ilv">● ' + esc(minuteLabel(m)) + '</small></div>';
      case 'myteam': return myTeamHTML();
      case 'countdown': return '<div class="tx"><b>' + esc(timeLeft(s.date)) + '</b><small>' + esc(s.text || 'Falta para el inicio') + '</small></div>';
      case 'music': return (s.img ? '<img class="cv" alt="" src="' + esc(s.img) + '">' : '<span class="em">🎵</span>') + '<div class="tx"><b>' + esc(s.title || 'Canción') + '</b><small>' + esc(s.artist || '') + '</small></div>' + (s.audio ? '<button type="button" class="pp" data-isl-play="1">' + (playing ? '❚❚' : '▶') + '</button>' : '');
      case 'photo': return (s.img ? '<img class="iph" alt="" src="' + esc(s.img) + '">' : '<span class="em">🖼️</span>') + (s.text ? '<div class="tx"><b>' + esc(s.text) + '</b></div>' : '');
      case 'clock': return '<div class="tx"><b class="clk">' + p2(now.getHours()) + ':' + p2(now.getMinutes()) + '</b><small>' + esc(['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][now.getDay()]) + '</small></div>';
      case 'ticker': var tt = esc(s.text || 'Texto que se desliza'); return '<div class="mq"><div class="mqt" style="animation-duration:calc(' + Math.max(6, tt.length * .3).toFixed(1) + 's*var(--ik,1))"><span>' + tt + '</span><span>' + tt + '</span></div></div>';
    }
    return null;
  }
  function slides() { var out = []; (cfg.slides || []).forEach(function (s, i) { var h = slideHTML(s); if (h) out.push({ i: i, h: h, s: s }); }); return out; }
  function fitWidth() {
    if (!el || !cfg.fit) return; var c = el.querySelector('.c'); if (!c) return;
    var old = c.getAttribute('style'); c.style.cssText = 'position:absolute;left:0;top:0;width:max-content;visibility:hidden;max-width:none;white-space:nowrap;opacity:0;transition:none';
    var nat = c.offsetWidth; if (old === null) c.removeAttribute('style'); else c.setAttribute('style', old);
    var base = popping ? (parseFloat(el.style.getPropertyValue('--iow')) || 0) : num(cfg.ow, 80, 420, 210);
    el.style.setProperty('--iow', Math.max(base, Math.min(Math.ceil(nat) + 48, (w.innerWidth || 360) - 16)) + 'px');
  }
  function content(h) { var c = el.querySelector('.c'); if (!c) return; c.innerHTML = h; c.classList.remove('in'); void c.offsetWidth; c.classList.add('in'); fitWidth(); }
  function showSlide(n, keep) {
    var L1 = slides(); if (!L1.length) L1 = [{ h: slideHTML({ t: 'league' }), s: { t: 'league' } }];
    idx = ((n % L1.length) + L1.length) % L1.length;
    var c = el.querySelector('.c');
    if (keep && c) { c.innerHTML = L1[idx].h; fitWidth(); } else content(L1[idx].h);
  }

  /* ---------- estilos de la isla ---------- */
  var CSS = '' +
    '#lsl-island{position:fixed;z-index:2147483000;display:flex;align-items:center;justify-content:center;gap:0;box-sizing:border-box;overflow:hidden;' +
    '--icw:var(--iw);--ich:var(--ih);--icr:var(--ir);width:var(--icw);height:var(--ich);border-radius:var(--icr);' +
    'background:var(--ibg);color:var(--ifg);opacity:var(--iop);border:var(--ibw) solid var(--ibc);box-shadow:var(--ish);' +
    'font:700 var(--ifs)/1.15 system-ui,-apple-system,sans-serif;letter-spacing:.2px;touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer;-webkit-tap-highlight-color:transparent;' +
    'transform:translate(calc(var(--itx) + var(--idx,0px)),calc(var(--ity) + var(--idy,0px))) rotate(var(--irot));' +
    'transition:width var(--it) var(--iease),height var(--it) var(--iease),border-radius var(--it) var(--iease),left var(--it) var(--iease),right var(--it) var(--iease),transform .35s cubic-bezier(.3,.7,.2,1),opacity .3s,background .3s,box-shadow .3s}' +
    '#lsl-island.open{--icw:var(--iow);--ich:var(--ioh);--icr:var(--ior)}' +
    '#lsl-island.drag,#lsl-island.noanim{transition:none}' +
    '#lsl-island[data-st=notch]{border-radius:0 0 var(--icr) var(--icr)}' +
    '#lsl-island[data-st=glass]{-webkit-backdrop-filter:blur(14px) saturate(1.5);backdrop-filter:blur(14px) saturate(1.5)}' +
    '#lsl-island .dt{display:flex;align-items:center;justify-content:center;gap:2px;width:14px;height:14px;flex:none;position:relative}' +
    '#lsl-island .dt b{display:block;background:var(--idc)}' +
    '#lsl-island[data-dot=none] .dt{display:none}' +
    '#lsl-island[data-dot=pulse] .dt b:nth-child(n+2),#lsl-island[data-dot=ping] .dt b:nth-child(n+2){display:none}' +
    '#lsl-island[data-dot=pulse] .dt b,#lsl-island[data-dot=ping] .dt b{width:8px;height:8px;border-radius:50%}' +
    '#lsl-island[data-dot=pulse] .dt b{animation:islx-pulse calc(1.8s*var(--ik,1)) ease-in-out infinite}' +
    '#lsl-island[data-dot=ping] .dt b{position:relative}' +
    '#lsl-island[data-dot=ping] .dt b:after{content:"";position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--idc);animation:islx-ping calc(1.6s*var(--ik,1)) ease-out infinite}' +
    '#lsl-island[data-dot=bars] .dt b{width:3px;height:11px;border-radius:2px;animation:islx-eq calc(.9s*var(--ik,1)) ease-in-out infinite}' +
    '#lsl-island[data-dot=bars] .dt b:nth-child(2){animation-delay:.2s}#lsl-island[data-dot=bars] .dt b:nth-child(3){animation-delay:.4s}' +
    '#lsl-island .c{display:flex;align-items:center;gap:8px;min-width:0;max-width:0;margin-left:0;opacity:0;overflow:hidden;white-space:nowrap;transition:opacity .25s .08s,max-width var(--it) var(--iease),margin-left var(--it) var(--iease)}' +
    '#lsl-island.open .c{opacity:1;max-width:calc(var(--iow) - 44px);margin-left:8px}' +
    '#lsl-island .tx{display:flex;flex-direction:column;gap:2px;min-width:0}' +
    '#lsl-island .tx b{font-size:1em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#lsl-island .tx small,#lsl-island .sm{font-size:.82em;font-weight:600;opacity:.72;overflow:hidden;text-overflow:ellipsis}' +
    '#lsl-island .tx .ilv{color:#ff5468;opacity:1}' +
    '#lsl-island .vs{display:flex;align-items:center;gap:6px}#lsl-island .vs em{font-style:normal;opacity:.6;font-size:.85em}' +
    '#lsl-island .isc{font-size:1.25em;letter-spacing:1px}#lsl-island .td{width:8px;height:8px;border-radius:50%;flex:none}' +
    '#lsl-island .em{font-size:1.5em;flex:none}#lsl-island .clk{font-size:1.3em;letter-spacing:1px}' +
    '#lsl-island .cv,#lsl-island .iph{width:calc(var(--ioh) - 14px);height:calc(var(--ioh) - 14px);max-width:78px;max-height:78px;object-fit:cover;border-radius:10px;flex:none}' +
    '#lsl-island .iph{border-radius:50%}' +
    '#lsl-island .pp{display:flex;align-items:center;justify-content:center;padding:0;width:28px;height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.2);color:inherit;font-size:11px;cursor:pointer;flex:none}' +
    '#lsl-island .mq{overflow:hidden;max-width:100%}#lsl-island .mqt{display:inline-flex;animation:islx-mq 9s linear infinite}#lsl-island .mqt span{padding-right:2.5em;white-space:nowrap}' +
    '#lsl-island[data-tr=fade] .c.in{animation:islx-fade .35s ease}#lsl-island[data-tr=slide] .c.in{animation:islx-slide .35s ease}' +
    '#lsl-island[data-tr=zoom] .c.in{animation:islx-zoom .35s ease}#lsl-island[data-tr=blur] .c.in{animation:islx-blur .4s ease}' +
    '#lsl-island:not(.open)[data-idle=breathe]{animation:islx-breathe calc(3.2s*var(--ik,1)) ease-in-out infinite}' +
    '#lsl-island:not(.open)[data-idle=float]{animation:islx-float calc(3s*var(--ik,1)) ease-in-out infinite}' +
    '#lsl-island:not(.open)[data-idle=glow]{animation:islx-glow calc(2.4s*var(--ik,1)) ease-in-out infinite}' +
    '#lsl-island:not(.open)[data-idle=wiggle]{animation:islx-wig calc(4s*var(--ik,1)) ease-in-out infinite}' +
    '@keyframes islx-pulse{50%{transform:scale(.55);opacity:.6}}@keyframes islx-ping{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.9);opacity:0}}' +
    '@keyframes islx-eq{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}@keyframes islx-mq{to{transform:translateX(-50%)}}' +
    '@keyframes islx-fade{from{opacity:0}}@keyframes islx-slide{from{opacity:0;transform:translateY(10px)}}@keyframes islx-zoom{from{opacity:0;transform:scale(.8)}}@keyframes islx-blur{from{opacity:0;filter:blur(6px)}}' +
    '@keyframes islx-breathe{50%{scale:1.06}}@keyframes islx-float{50%{translate:0 -3px}}' +
    '@keyframes islx-glow{50%{box-shadow:0 0 26px var(--igc,#fff),var(--ish)}}' +
    '@keyframes islx-wig{0%,78%,100%{rotate:0deg}84%{rotate:-5deg}90%{rotate:5deg}95%{rotate:-2deg}}' +
    '#lsl-island .dt .lg{display:none}' +
    '#lsl-island[data-dot=logo] .dt{width:20px;height:20px}#lsl-island[data-dot=logo] .dt b{display:none}' +
    '#lsl-island[data-dot=logo] .dt .lg{display:block;width:20px;height:20px;border-radius:50%;object-fit:cover;animation:islx-spin calc(6s*var(--ik,1)) linear infinite}' +
    '#lsl-island .itv{display:flex;align-items:center;gap:6px}#lsl-island .itv>span{font-weight:800}#lsl-island .itv .bar{width:4px;height:1.5em;border-radius:2px;flex:none}' +
    '#lsl-island .itv>*{flex:none}#lsl-island .itv .isc{background:rgba(255,255,255,.16);padding:2px 8px;border-radius:7px;font-size:1.15em;letter-spacing:1px;white-space:nowrap}' +
    '#lsl-island .c{position:relative;z-index:1}#lsl-island .dt{z-index:1}' +
    '#lsl-island.goal:before{content:"";position:absolute;inset:0;background:var(--igc,#fff);opacity:0;animation:islx-gflash 1.1s ease-out}' +
    '#lsl-island.goal{animation:islx-goal 1.2s ease-out}' +
    '@keyframes islx-spin{to{transform:rotate(360deg)}}@keyframes islx-gflash{0%{opacity:.85}100%{opacity:0}}' +
    '@keyframes islx-goal{0%{scale:1;box-shadow:0 0 0 0 var(--igc,#27C4C9)}16%{scale:1.1}100%{scale:1;box-shadow:0 0 0 24px transparent}}' +
    '@media(prefers-reduced-motion:reduce){#lsl-island,#lsl-island *{animation:none!important}}';
  var PCSS = '' +
    '.isp{position:fixed;left:0;right:0;bottom:0;z-index:2147482000;height:60vh;max-height:calc(100vh - 96px);display:flex;flex-direction:column;background:var(--bg2,#0f1b33);color:var(--tx,#fff);border-top:1px solid var(--line,rgba(255,255,255,.14));border-radius:20px 20px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.5);transition:transform .3s cubic-bezier(.3,.7,.2,1);font:500 14px/1.35 system-ui,-apple-system,sans-serif}' +
    '.isp.min{transform:translateY(calc(100% - 58px))}' +
    '.isp-h{display:flex;align-items:center;gap:8px;padding:12px 14px 8px}.isp-h b{flex:1;font-size:15px}' +
    '.isp-ib{display:flex;align-items:center;justify-content:center;padding:0;width:36px;height:36px;border-radius:50%;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--card,#16233f);color:inherit;font-size:15px;cursor:pointer}' +
    '.isp-t{display:flex;gap:6px;padding:0 12px 8px;overflow-x:auto;scrollbar-width:none}' +
    '.isp-t button{flex:none;padding:7px 13px;border-radius:999px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--card,#16233f);color:inherit;font:600 13px system-ui;cursor:pointer}' +
    '.isp-t button.on{background:var(--ac,#27C4C9);color:var(--on-ac,#001018);border-color:transparent}' +
    '.isp-b{flex:1;overflow-y:auto;padding:4px 14px 18px;-webkit-overflow-scrolling:touch}' +
    '.isp h4{margin:16px 0 8px;font-size:11.5px;text-transform:uppercase;letter-spacing:.9px;color:var(--mut,#9fb0cc)}.isp h4:first-child{margin-top:4px}' +
    '.isf{display:block;margin:0 0 14px}.isf>span{display:block;font-size:12.5px;color:var(--mut,#9fb0cc);margin-bottom:6px}' +
    '.isf select,.isf input[type=text],.isf input[type=datetime-local]{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--card,#16233f);color:inherit;font:inherit}' +
    '.isf input[type=range]{width:100%;accent-color:var(--ac,#27C4C9)}' +
    '.isf.chk{display:flex;align-items:center;gap:10px}.isf.chk>span{margin:0;color:inherit;font-size:14px}.isf.chk input{width:20px;height:20px;accent-color:var(--ac,#27C4C9)}' +
    '.clr{display:flex;gap:8px;align-items:center}.clr input[type=color]{width:46px;height:40px;padding:0;border:1px solid var(--line,rgba(255,255,255,.14));border-radius:10px;background:none;flex:none}.clr input[type=text]{flex:1}' +
    '.isb{padding:9px 12px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.14));background:var(--card,#16233f);color:inherit;font:600 13px system-ui;cursor:pointer}' +
    '.isb.pri{background:var(--ac,#27C4C9);color:var(--on-ac,#001018);border-color:transparent}.isb.dng{color:#ff6b7d}' +
    '.isp-g{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.isp-g .isb{text-align:left;display:flex;align-items:center;gap:8px}.isp-g .sw{width:22px;height:14px;border-radius:7px;flex:none;border:1px solid rgba(255,255,255,.25)}' +
    '.isp-sl{border:1px solid var(--line,rgba(255,255,255,.14));border-radius:14px;padding:12px;margin-bottom:10px;background:var(--card,#16233f)}' +
    '.isp-sh{display:flex;align-items:center;gap:6px;margin-bottom:10px}.isp-sh b{flex:1;font-size:13.5px}.isp-sh .isb{padding:6px 10px}' +
    '.isp-th{width:54px;height:54px;border-radius:10px;object-fit:cover;vertical-align:middle;margin-right:8px;border:1px solid rgba(255,255,255,.2)}' +
    '.isp-hint{font-size:12px;color:var(--mut,#9fb0cc);margin:-6px 0 12px}' +
    '.isp-f{display:flex;gap:8px;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,rgba(255,255,255,.14))}.isp-f .isb{flex:1;text-align:center}';

  function inject(id, css) { if (d.getElementById(id)) return; var s = d.createElement('style'); s.id = id; s.textContent = css; d.head.appendChild(s); }

  /* ---------- construir y aplicar ---------- */
  function sizeVars() { if (!el) return; el.style.setProperty('--iow', num(cfg.ow, 80, 420, 210) + 'px'); el.style.setProperty('--ioh', num(cfg.oh, 24, 220, 46) + 'px'); }
  function build() {
    var old = d.getElementById('lsl-isl'); if (old && old.parentNode) old.parentNode.removeChild(old);   // isla vieja
    if (d.getElementById('lsl-island')) { el = d.getElementById('lsl-island'); return; }
    inject('lsl-island-css', CSS);
    el = d.createElement('div'); el.id = 'lsl-island'; el.className = 'noanim';
    el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Isla dinámica');
    el.innerHTML = '<i class="dt"><b></b><b></b><b></b><img class="lg" alt=""></i><div class="c"></div>';
    d.body.appendChild(el); bind();
  }
  function apply(c) {
    cfg = merge(c); if (!el) build();
    var sty = cfg.style, acc = accent(), sp = num(cfg.speed, 30, 300, 100) / 100;
    function set(k, v) { el.style.setProperty(k, v); }
    set('--iw', num(cfg.w, 30, 300, 104) + 'px'); set('--ih', num(cfg.h, 16, 90, 30) + 'px'); set('--ir', num(cfg.r, 0, 60, 20) + 'px');
    if (!popping) sizeVars(); set('--ior', num(cfg.or, 0, 80, 26) + 'px');
    set('--ifs', num(cfg.fs, 9, 24, 12) + 'px'); set('--ifg', hex(cfg.fg, '#ffffff'));
    var bg = hex(cfg.bg, '#000000'), bg2 = cfg.bg2 ? hex(cfg.bg2, '') : '', bgc;
    if (cfg.theme) bgc = 'var(--grad,' + bg + ')';
    else if (bg2) bgc = 'linear-gradient(' + num(cfg.ang, 0, 360, 135) + 'deg,' + bg + ',' + bg2 + ')';
    else bgc = sty === 'glass' ? rgba(bg, .45) : bg;
    set('--ibg', bgc); set('--iop', (cfg.on ? num(cfg.op, 20, 100, 100) : 35) / 100);
    set('--idc', cfg.dot ? hex(cfg.dot, acc) : acc);
    var bc = cfg.bc ? hex(cfg.bc, '') : (sty === 'neon' ? acc : (sty === 'glass' ? 'rgba(255,255,255,.2)' : ''));
    var bw = num(cfg.bw, 0, 8, 0) || (sty === 'neon' ? 1.5 : (sty === 'glass' ? 1 : 0));
    set('--ibc', bc || 'transparent'); set('--ibw', (bc ? bw : 0) + 'px');
    var gl = cfg.glow ? hex(cfg.glow, '') : (sty === 'neon' ? acc : ''), gi = num(cfg.gi, 0, 60, 0) || (sty === 'neon' && !cfg.glow ? 18 : 0);
    var sh = []; if (gl && gi) sh.push('0 0 ' + gi + 'px ' + gl); if (sty !== 'flat') sh.push('0 6px 22px rgba(0,0,0,.35)');
    set('--ish', sh.length ? sh.join(',') : 'none'); set('--igc', gl || acc);
    var E = { spring: ['cubic-bezier(.34,1.45,.5,1)', .42], smooth: ['cubic-bezier(.4,0,.2,1)', .45], bounce: ['cubic-bezier(.3,1.9,.5,1)', .6], snap: ['cubic-bezier(.2,0,0,1)', .22] }[cfg.aopen] || [null, .42];
    set('--iease', E[0] || 'cubic-bezier(.34,1.45,.5,1)'); set('--it', (E[1] / sp).toFixed(2) + 's'); set('--ik', (1 / sp).toFixed(2));
    var pos = ['top', 'bottom', 'left', 'right'].indexOf(cfg.pos) < 0 ? 'top' : cfg.pos, off = num(cfg.off, 0, 100, 50), gap = num(cfg.gap, -80, 240, 8), rot = num(cfg.rot, -180, 180, 0);
    var vert = (pos === 'left' || pos === 'right') && Math.abs(Math.sin(rot * Math.PI / 180)) > .7;
    var safe = { top: 'env(safe-area-inset-top,0px)', bottom: 'env(safe-area-inset-bottom,0px)', left: 'env(safe-area-inset-left,0px)', right: 'env(safe-area-inset-right,0px)' };
    ['top', 'bottom', 'left', 'right'].forEach(function (k) { el.style[k] = ''; });
    el.style[pos] = 'calc(' + safe[pos] + ' + ' + gap + 'px' + (vert ? ' + (var(--ich) - var(--icw)) / 2' : '') + ')';
    if (pos === 'top' || pos === 'bottom') { el.style.left = off + '%'; set('--itx', '-50%'); set('--ity', '0px'); }
    else { el.style.top = off + '%'; set('--itx', '0px'); set('--ity', '-50%'); }
    set('--irot', rot + 'deg');
    el.setAttribute('data-st', sty); el.setAttribute('data-idle', cfg.idle); el.setAttribute('data-tr', cfg.tr); el.setAttribute('data-pos', pos);
    el.setAttribute('data-dot', dotKind());
    var lg = el.querySelector('.lg'), lsrc = logoSrc(); if (lg && (lg.getAttribute('src') || '') !== lsrc) { if (lsrc) lg.src = lsrc; else lg.removeAttribute('src'); }
    el.style.display = (cfg.on || panel) ? '' : 'none';
    if (!popping) showSlide(open ? idx : 0, true);
    startAuto();
    if (el.classList.contains('noanim')) setTimeout(function () { el.classList.remove('noanim'); }, 60);
  }

  /* ---------- comportamiento ---------- */
  function armClose() { clearTimeout(tClose); var s = num(cfg.close_after, 0, 120, 3); if (s > 0) tClose = setTimeout(function () { setOpen(false); }, s * 1000); }
  function setOpen(v, skip) {
    open = v; el.classList.toggle('open', v); clearTimeout(tClose); clearInterval(tCycle); clearInterval(tTick);
    if (!v) { popAct = null; popping = false; el.classList.remove('pop'); sizeVars(); return; }
    if (!skip) showSlide(idx);
    armClose();
    if (!skip) {
      var cy = num(cfg.cycle, 0, 60, 0); if (cy > 0 && slides().length > 1) tCycle = setInterval(function () { showSlide(idx + 1); }, cy * 1000);
      tTick = setInterval(function () { if (open) showSlide(idx, true); }, 20000);
    }
  }
  var autoSet = -1;
  function startAuto() {
    var n = num(cfg.auto_every, 0, 3600, 0); if (n === autoSet) return; autoSet = n; clearInterval(tAuto); if (!n) return;
    tAuto = setInterval(function () { if (open || panel) return; setOpen(true); clearTimeout(tClose); tClose = setTimeout(function () { setOpen(false); }, num(cfg.auto_for, 1, 60, 4) * 1000); }, n * 1000);
  }
  function wide() {
    var mw = Math.min(Math.max(num(cfg.ow, 80, 420, 210), 300), (w.innerWidth || 360) - 16);
    el.style.setProperty('--iow', mw + 'px'); el.style.setProperty('--ioh', Math.max(num(cfg.oh, 24, 220, 46), 58) + 'px'); el.classList.add('pop'); popping = true;
  }
  function popHTML(h, ms, vp) { if (!h) return; setOpen(true, true); wide(); content(h); clearTimeout(tClose); tClose = setTimeout(function () { setOpen(false); }, ms); vib(vp); }
  function pop(slide) { var h = slideHTML(slide); if (h) { popAct = null; popHTML(h, 5000); } }
  function goalPop(m, side) {
    popAct = { type: 'match', id: m.id }; popHTML(goalHTML(m, side), 6500, [30, 50, 30, 50, 90]);
    el.classList.remove('goal'); void el.offsetWidth; el.classList.add('goal'); setTimeout(function () { el.classList.remove('goal'); }, 1300);
  }
  function newsPop(n) { popAct = { type: 'news', id: n.id }; popHTML('<span class="em">📰</span><div class="tx"><b>' + esc(n.title) + '</b><small>' + esc(n.cat || 'Noticia') + ' · tocá para leer</small></div>', 7000, [20, 40, 20]); }
  function snapScores() { liveMatches().forEach(function (m) { scores[m.id] = [+m.hs || 0, +m.as || 0]; }); }
  var NKEY = 'lsl:isl-newsseen';
  function seenGet() { try { var a = JSON.parse(localStorage.getItem(NKEY)); return Array.isArray(a) ? a : null; } catch (e) { return null; } }
  function seenSet(a) { try { localStorage.setItem(NKEY, JSON.stringify(a.slice(-60))); } catch (e) { } }
  function checkNews(initial) {
    var s = st(); if (!s || !Array.isArray(s.news)) return;
    var ids = s.news.map(function (n) { return n.id; }), seen = seenGet();
    if (seen === null) { seenSet(ids); return; }
    var fresh = s.news.filter(function (n) { return seen.indexOf(n.id) < 0; }); if (!fresh.length) return;
    seenSet(seen.concat(fresh.map(function (n) { return n.id; })));
    if (cfg.alert_news && !panel && !L().adminOpen) { fresh.sort(function (a, b) { return new Date(b.date) - new Date(a.date); }); setTimeout(function () { newsPop(fresh[0]); }, initial ? 1500 : 0); }
  }
  function runPop(a) { try { var U = L().ui; if (U && U.openSheet) U.openSheet(a.type, a.id); } catch (e) { } }
  function checkGoals() {
    if (!st()) return; trackMinutes();
    var found = null;
    liveMatches().forEach(function (m) {
      var o = scores[m.id], h = +m.hs || 0, a = +m.as || 0;
      if (o && !found) { if (h > o[0]) found = [m, 'h']; else if (a > o[1]) found = [m, 'a']; }
      scores[m.id] = [h, a];
    });
    if (found && cfg.alert && !panel && !L().adminOpen) goalPop(found[0], found[1]);
  }
  function tapAction() {
    vib();
    if (open && popAct) { var pa = popAct; setOpen(false); runPop(pa); return; }
    if (cfg.tap === 'go' && cfg.go) { try { w.location.hash = '#/' + cfg.go; } catch (e) { } if (open) setOpen(false); return; }
    if (cfg.tap === 'cycle' && open) { showSlide(idx + 1); armClose(); return; }
    setOpen(!open);
  }
  function togglePlay() {
    var sl = slides()[idx], s = sl && sl.s; if (!s || s.t !== 'music' || !s.audio) return;
    if (!audio) { audio = new Audio(); audio.addEventListener('ended', function () { playing = false; sync(); }); audio.addEventListener('pause', function () { playing = false; sync(); }); audio.addEventListener('play', function () { playing = true; sync(); }); }
    if (audio.getAttribute('data-src') !== s.audio) { audio.src = s.audio; audio.setAttribute('data-src', s.audio); }
    if (audio.paused) { var pr = audio.play(); if (pr && pr.catch) pr.catch(function () { playing = false; sync(); }); } else audio.pause();
  }
  function sync() { el.setAttribute('data-dot', dotKind()); var b = el.querySelector('[data-isl-play]'); if (b) b.textContent = playing ? '❚❚' : '▶'; }
  function bind() {
    var down = false, moved = false, sx = 0, sy = 0, dx = 0, dy = 0;
    el.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('[data-isl-play]')) return;
      down = true; moved = false; sx = e.clientX; sy = e.clientY; dx = dy = 0; el.classList.add('drag'); try { el.setPointerCapture(e.pointerId); } catch (_) { }
    });
    el.addEventListener('pointermove', function (e) {
      if (!down) return; dx = e.clientX - sx; dy = e.clientY - sy; if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      if (moved) { el.style.setProperty('--idx', Math.max(-14, Math.min(dx * .25, 14)) + 'px'); el.style.setProperty('--idy', Math.max(-10, Math.min(dy * .25, 10)) + 'px'); }
    });
    function end() {
      if (!down) return; down = false; el.classList.remove('drag'); el.style.removeProperty('--idx'); el.style.removeProperty('--idy');
      if (moved) { if (open && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { showSlide(idx + (dx < 0 ? 1 : -1)); armClose(); } return; }
      tapAction();
    }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-isl-play]'); if (b) { e.stopPropagation(); togglePlay(); } });
  }

  /* ---------- guardado ---------- */
  function save(now) {
    clearTimeout(tSave);
    function run() { var s = S(); if (!s || !s.commit) return; var snap = clone(cfg); s.commit(function (state) { state.design = state.design || {}; state.design.isl = snap; }); }
    if (now) run(); else tSave = setTimeout(run, 350);
  }
  function live() { apply(cfg); save(); }

  /* ================= PANEL DE AJUSTES ================= */
  var PRESETS = [
    ['HyperOS negra', { style: 'pill', bg: '#000000', bg2: '', theme: false, fg: '#ffffff', bc: '', bw: 0, glow: '', gi: 0, w: 104, h: 30, r: 20, ow: 210, oh: 46, or: 26, fs: 12, op: 100, pos: 'top', off: 50, gap: 8, rot: 0, aopen: 'spring', dotk: 'pulse', idle: 'none' }, '#000000'],
    ['Estilo iPhone', { style: 'pill', bg: '#000000', bg2: '', theme: false, fg: '#ffffff', bc: '', bw: 0, glow: '', gi: 0, w: 124, h: 36, r: 20, ow: 300, oh: 64, or: 32, fs: 13, op: 100, pos: 'top', off: 50, gap: 10, rot: 0, aopen: 'bounce', dotk: 'pulse', idle: 'none' }, '#000000'],
    ['Cristal', { style: 'glass', bg: '#101826', bg2: '', theme: false, fg: '#ffffff', bc: '', bw: 0, glow: '', gi: 0, w: 112, h: 32, r: 20, ow: 230, oh: 50, or: 26, fs: 12, op: 100, pos: 'top', off: 50, gap: 10, rot: 0, aopen: 'smooth', dotk: 'ping', idle: 'none' }, '#44566f'],
    ['Neón', { style: 'neon', bg: '#050a14', bg2: '', theme: false, fg: '#ffffff', bc: '', bw: 0, glow: '', gi: 0, w: 108, h: 30, r: 20, ow: 220, oh: 48, or: 26, fs: 12, op: 100, pos: 'top', off: 50, gap: 10, rot: 0, aopen: 'spring', dotk: 'ping', idle: 'glow' }, '#27C4C9'],
    ['Degradado Marple', { style: 'pill', bg: '#CA2851', bg2: '#FFB173', ang: 135, theme: false, fg: '#ffffff', bc: '', bw: 0, glow: '#FF6766', gi: 14, w: 108, h: 30, r: 20, ow: 220, oh: 48, or: 26, fs: 12, op: 100, pos: 'top', off: 50, gap: 10, rot: 0, aopen: 'spring', dotk: 'pulse', idle: 'breathe' }, 'linear-gradient(90deg,#CA2851,#FFB173)'],
    ['Colores de la app', { style: 'pill', theme: true, bg2: '', fg: '#ffffff', bc: '', bw: 0, glow: '', gi: 0, aopen: 'spring', dotk: 'pulse', idle: 'none' }, 'linear-gradient(90deg,#27C4C9,#FFD226)'],
    ['Muesca (notch)', { style: 'notch', bg: '#000000', bg2: '', theme: false, fg: '#ffffff', bc: '', bw: 0, glow: '', gi: 0, w: 130, h: 26, r: 16, ow: 240, oh: 46, or: 24, fs: 12, op: 100, pos: 'top', off: 50, gap: 0, rot: 0, aopen: 'smooth', dotk: 'pulse', idle: 'none' }, '#000000'],
    ['Punto mini', { style: 'flat', bg: '#000000', bg2: '', theme: false, fg: '#ffffff', bc: '', bw: 0, glow: '', gi: 0, w: 28, h: 28, r: 14, ow: 170, oh: 40, or: 20, fs: 12, op: 100, pos: 'top', off: 50, gap: 10, rot: 0, aopen: 'snap', dotk: 'ping', idle: 'none' }, '#222222']
  ];
  var SF = {
    league: [], next: [], live: [], clock: [], myteam: [],
    text: [['text', 'Texto', 'txt'], ['sub', 'Subtexto (opcional)', 'txt'], ['emo', 'Emoji (opcional)', 'txt']],
    countdown: [['text', 'Título', 'txt'], ['date', 'Fecha y hora', 'dt']],
    music: [['title', 'Canción', 'txt'], ['artist', 'Artista', 'txt'], ['img', 'Portada', 'img'], ['audio', 'Audio: link .mp3 (opcional, se toca con ▶)', 'txt']],
    photo: [['img', 'Foto', 'img'], ['text', 'Texto (opcional)', 'txt']],
    ticker: [['text', 'Texto', 'txt']]
  };
  function sel(k, l, o) { return '<label class="isf"><span>' + l + '</span><select data-k="' + k + '">' + o.map(function (x) { return '<option value="' + x[0] + '"' + (String(cfg[k]) === String(x[0]) ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>'; }
  function rng(k, l, a, b, s, u) { return '<label class="isf"><span>' + l + ': <b data-v="' + k + '">' + cfg[k] + '</b>' + (u || '') + '</span><input type="range" data-k="' + k + '" min="' + a + '" max="' + b + '" step="' + (s || 1) + '" value="' + cfg[k] + '"></label>'; }
  function clr(k, l, clearable) { var v = cfg[k] || ''; return '<label class="isf"><span>' + l + '</span><div class="clr"><input type="color" data-k="' + k + '" value="' + hex(v, '#000000') + '"><input type="text" data-kt="' + k + '" maxlength="7" placeholder="#RRGGBB" value="' + esc(v) + '">' + (clearable ? '<button type="button" class="isb" data-clear="' + k + '">Quitar</button>' : '') + '</div></label>'; }
  function chk(k, l) { return '<label class="isf chk"><input type="checkbox" data-k="' + k + '"' + (cfg[k] ? ' checked' : '') + '><span>' + l + '</span></label>'; }

  function tabDesign() {
    var h = '<h4>Diseños listos</h4><div class="isp-g">' + PRESETS.map(function (p, i) { return '<button type="button" class="isb" data-preset="' + i + '"><span class="sw" style="background:' + p[2] + '"></span>' + p[0] + '</button>'; }).join('') + '</div>';
    h += '<h4>Estilo</h4>' + sel('style', 'Forma del material', [['pill', 'Píldora'], ['notch', 'Muesca (pegada al borde)'], ['glass', 'Cristal (translúcida)'], ['neon', 'Neón (borde que brilla)'], ['flat', 'Plana (sin sombra)']]);
    h += '<h4>Colores</h4>' + chk('theme', 'Usar el degradado de la app') + clr('bg', 'Fondo') + clr('bg2', 'Segundo color del degradado (opcional)', true) + rng('ang', 'Ángulo del degradado', 0, 360, 5, '°') +
      clr('fg', 'Color del texto') + clr('dot', 'Color del punto (vacío = color de la app)', true) + clr('bc', 'Borde', true) + rng('bw', 'Grosor del borde', 0, 8, 1, ' px') +
      clr('glow', 'Brillo alrededor', true) + rng('gi', 'Intensidad del brillo', 0, 60, 1) + rng('op', 'Opacidad', 20, 100, 5, ' %') + rng('fs', 'Tamaño del texto', 9, 24, 1, ' px');
    return h;
  }
  function tabShape() {
    return '<h4>Cerrada</h4>' + rng('w', 'Ancho', 30, 300, 2, ' px') + rng('h', 'Alto', 16, 90, 1, ' px') + rng('r', 'Redondeo', 0, 60, 1, ' px') +
      '<h4>Abierta (al tocarla)</h4>' + rng('ow', 'Ancho', 80, 420, 2, ' px') + rng('oh', 'Alto', 24, 220, 1, ' px') + rng('or', 'Redondeo', 0, 80, 1, ' px') +
      chk('fit', 'Ensanchar sola cuando el contenido no entra') + '<p class="isp-hint">Para que entren fotos o portadas grandes, subí el alto de la isla abierta.</p>';
  }
  function tabPlace() {
    return chk('on', 'Mostrar la isla') + sel('pos', 'Borde de la pantalla', [['top', 'Arriba'], ['bottom', 'Abajo'], ['left', 'Izquierda'], ['right', 'Derecha']]) +
      rng('off', 'Posición a lo largo del borde', 0, 100, 1, ' %') + rng('gap', 'Distancia al borde', -80, 240, 1, ' px') + rng('rot', 'Rotación', -180, 180, 5, '°') +
      '<p class="isp-hint">Tip: en los bordes izquierdo/derecho poné rotación 90° o −90° para una isla vertical.</p>';
  }
  function tabMotion() {
    return '<h4>Al abrir y cerrar</h4>' + sel('aopen', 'Animación', [['spring', 'Resorte (rebote suave)'], ['bounce', 'Rebote fuerte'], ['smooth', 'Suave'], ['snap', 'Rápida']]) + rng('speed', 'Velocidad', 30, 300, 10, ' %') +
      '<h4>Cuando está quieta</h4>' + sel('idle', 'Movimiento de la isla', [['none', 'Ninguno'], ['breathe', 'Respira'], ['float', 'Flota'], ['glow', 'Brilla'], ['wiggle', 'Se sacude de vez en cuando']]) +
      sel('dotk', 'Indicador', [['pulse', 'Punto que late'], ['ping', 'Punto con onda'], ['bars', 'Barras (ecualizador)'], ['logo', 'Logo de la liga girando'], ['none', 'Sin indicador']]) +
      '<p class="isp-hint">El logo gira solo si cargaste uno en la sección Liga; si no, queda el punto.</p>' +
      '<h4>Cambio de contenido</h4>' + sel('tr', 'Transición', [['fade', 'Desvanecer'], ['slide', 'Deslizar'], ['zoom', 'Zoom'], ['blur', 'Desenfoque']]);
  }
  function slideCard(s, i) {
    var f = SF[s.t] || [], n = cfg.slides.length;
    var h = '<div class="isp-sl"><div class="isp-sh"><b>' + (i + 1) + '. ' + esc((TYPES.filter(function (t) { return t[0] === s.t; })[0] || [0, s.t])[1]) + '</b>' +
      '<button type="button" class="isb" data-sa="up" data-si="' + i + '"' + (i === 0 ? ' disabled' : '') + '>↑</button><button type="button" class="isb" data-sa="down" data-si="' + i + '"' + (i === n - 1 ? ' disabled' : '') + '>↓</button><button type="button" class="isb dng" data-sa="del" data-si="' + i + '">✕</button></div>';
    h += '<label class="isf"><span>Tipo</span><select data-stype="' + i + '">' + TYPES.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === s.t ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></label>';
    f.forEach(function (x) {
      var k = x[0], v = s[k] || '';
      if (x[2] === 'img') h += '<div class="isf"><span>' + x[1] + '</span>' + (v ? '<img class="isp-th" alt="" src="' + esc(v) + '">' : '') + '<input type="file" accept="image/*" data-simg="' + i + ':' + k + '" style="max-width:100%">' + (v ? ' <button type="button" class="isb" data-sa="noimg" data-si="' + i + '" data-sk="' + k + '">Quitar</button>' : '') +
        '<input type="text" style="margin-top:8px" placeholder="o pegá un link de imagen" data-si="' + i + '" data-sk="' + k + '" value="' + (/^data:/.test(v) ? '' : esc(v)) + '"></div>';
      else if (x[2] === 'dt') h += '<label class="isf"><span>' + x[1] + '</span><input type="datetime-local" data-si="' + i + '" data-sk="' + k + '" value="' + esc(v) + '"></label>';
      else h += '<label class="isf"><span>' + x[1] + '</span><input type="text" data-si="' + i + '" data-sk="' + k + '" value="' + esc(v) + '"></label>';
    });
    return h + '</div>';
  }
  function tabContent() {
    var h = '<h4>Qué muestra (en orden)</h4>' + (cfg.slides.length ? cfg.slides.map(slideCard).join('') : '<p class="isp-hint">Sin contenido: se muestra el nombre de la liga.</p>');
    h += '<label class="isf"><span>Agregar contenido</span><select data-sadd="1"><option value="">Elegir…</option>' + TYPES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select></label>';
    h += '<h4>Al tocar la isla</h4>' + sel('tap', 'Acción', [['expand', 'Abrir / cerrar'], ['cycle', 'Abrir y pasar al siguiente contenido'], ['go', 'Ir a una pantalla']]) +
      sel('go', 'Pantalla a la que va', [['home', 'Inicio'], ['matches', 'Partidos'], ['league', 'Liga'], ['news', 'Noticias']]);
    h += '<h4>Comportamiento</h4>' + rng('close_after', 'Cerrarse sola a los (0 = no se cierra)', 0, 30, 1, ' s') + rng('cycle', 'Cambiar de contenido cada (0 = no)', 0, 20, 1, ' s') +
      rng('auto_every', 'Abrirse sola cada (0 = nunca)', 0, 300, 5, ' s') + rng('auto_for', 'Mantenerse abierta (cuando se abre sola)', 1, 30, 1, ' s') +
      chk('alert', 'Avisar cuando hay un gol (destello y nombre del goleador)') + chk('alert_news', 'Avisar cuando se publica una noticia (tocá la isla para leerla)') + chk('haptic', 'Vibrar al tocar') +
      '<h4>Probar avisos</h4><div class="isp-g"><button type="button" class="isb" data-pa="tgoal">⚽ Probar gol</button><button type="button" class="isb" data-pa="tnews">📰 Probar noticia</button></div>' +
      '<p class="isp-hint">Con la isla abierta, deslizá el dedo hacia los costados para cambiar de contenido.</p>';
    return h;
  }
  var TABS = [['design', 'Diseño', tabDesign], ['shape', 'Tamaño', tabShape], ['place', 'Lugar', tabPlace], ['content', 'Contenido', tabContent], ['motion', 'Movimiento', tabMotion]];

  function renderTab(keepScroll) {
    var b = panel.querySelector('.isp-b'), top = b.scrollTop;
    var t = TABS.filter(function (x) { return x[0] === tab; })[0];
    b.innerHTML = t[2]();
    panel.querySelectorAll('.isp-t button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-tab') === tab); });
    if (keepScroll) b.scrollTop = top;
  }
  function openPanel() {
    if (panel) return; if (!el) build();
    inject('lsl-island-pcss', PCSS);
    cfg = merge(st() && st().design && st().design.isl);
    panel = d.createElement('div'); panel.className = 'isp';
    panel.innerHTML = '<div class="isp-h"><b>Isla dinámica</b><button type="button" class="isp-ib" data-pa="min" aria-label="Achicar panel">▾</button><button type="button" class="isp-ib" data-pa="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="isp-t">' + TABS.map(function (x) { return '<button type="button" data-tab="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div class="isp-b"></div>' +
      '<div class="isp-f"><button type="button" class="isb pri" data-pa="test">Probar abrir/cerrar</button><button type="button" class="isb" data-pa="next">Siguiente</button><button type="button" class="isb dng" data-pa="reset">Restablecer</button></div>';
    d.body.appendChild(panel); renderTab(); apply(cfg);
    panel.addEventListener('input', onInput); panel.addEventListener('change', onChange); panel.addEventListener('click', onClick);
    if (L().pushLayer) L().pushLayer(closePanel);
  }
  function closePanel() { if (!panel) return; save(true); panel.parentNode.removeChild(panel); panel = null; apply(cfg); }
  function setK(k, v) { cfg[k] = v; var b = panel && panel.querySelector('[data-v="' + k + '"]'); if (b) b.textContent = v; live(); }
  function onInput(e) {
    var t = e.target, k = t.getAttribute('data-k'), kt = t.getAttribute('data-kt'), si = t.getAttribute('data-si'), sk = t.getAttribute('data-sk');
    if (k && (t.type === 'range' || t.type === 'color')) {
      setK(k, t.type === 'range' ? +t.value : t.value);
      if (t.type === 'color') { var tx = panel.querySelector('[data-kt="' + k + '"]'); if (tx) tx.value = t.value; }
    } else if (kt) {
      var v = t.value.trim(); if (/^#[0-9a-f]{6}$/i.test(v)) { setK(kt, v); var c = panel.querySelector('input[type=color][data-k="' + kt + '"]'); if (c) c.value = v; }
    } else if (si !== null && sk && cfg.slides[+si]) { cfg.slides[+si][sk] = t.value; live(); }
  }
  function onChange(e) {
    var t = e.target, k = t.getAttribute('data-k');
    if (k && t.tagName === 'SELECT') { setK(k, t.value); }
    else if (k && t.type === 'checkbox') { setK(k, t.checked); }
    else if (t.hasAttribute('data-stype')) { var s = cfg.slides[+t.getAttribute('data-stype')]; if (s) { var o = { t: t.value }; s.t = o.t; live(); renderTab(true); } }
    else if (t.hasAttribute('data-sadd')) { if (t.value && cfg.slides.length < 12) { cfg.slides.push({ t: t.value }); live(); renderTab(true); } }
    else if (t.hasAttribute('data-simg') && t.files && t.files[0]) {
      var p = t.getAttribute('data-simg').split(':'), f = t.files[0];
      var r = new FileReader(); r.onload = function () {
        var im = new Image(); im.onload = function () {
          var kk = Math.min(1, 192 / Math.max(im.width, im.height)), cv = d.createElement('canvas'); cv.width = Math.round(im.width * kk); cv.height = Math.round(im.height * kk);
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          if (cfg.slides[+p[0]]) { cfg.slides[+p[0]][p[1]] = cv.toDataURL('image/jpeg', .82); live(); renderTab(true); }
        }; im.src = r.result;
      }; r.readAsDataURL(f);
    }
  }
  function onClick(e) {
    var b = e.target.closest('button'); if (!b) return;
    var pa = b.getAttribute('data-pa'), tb = b.getAttribute('data-tab'), pr = b.getAttribute('data-preset'), cl = b.getAttribute('data-clear'), sa = b.getAttribute('data-sa'), si = +b.getAttribute('data-si');
    if (tb) { tab = tb; renderTab(); return; }
    if (cl) { cfg[cl] = ''; live(); renderTab(true); return; }
    if (pr !== null) { Object.assign(cfg, PRESETS[+pr][1]); live(); renderTab(true); return; }
    if (sa) {
      var a = cfg.slides;
      if (sa === 'del') a.splice(si, 1);
      else if (sa === 'up' && si > 0) a.splice(si - 1, 0, a.splice(si, 1)[0]);
      else if (sa === 'down' && si < a.length - 1) a.splice(si + 1, 0, a.splice(si, 1)[0]);
      else if (sa === 'noimg') { delete a[si][b.getAttribute('data-sk')]; }
      live(); renderTab(true); return;
    }
    if (pa === 'close') { closePanel(); if (L().ui && L().ui.toast) L().ui.toast('Isla guardada'); return; }
    if (pa === 'min') { panel.classList.toggle('min'); b.textContent = panel.classList.contains('min') ? '▴' : '▾'; return; }
    if (pa === 'test') { setOpen(!open); return; }
    if (pa === 'tgoal') { var sg = st(), mg = liveMatches()[0] || nextMatch() || (sg && sg.matches[0]); if (!mg) { if (L().ui && L().ui.toast) L().ui.toast('Cargá un partido para probar'); return; } goalPop(mg, 'h'); return; }
    if (pa === 'tnews') { var sn = st(), nw = ((sn && sn.news) || []).slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0]; if (!nw) { if (L().ui && L().ui.toast) L().ui.toast('No hay noticias para probar'); return; } newsPop(nw); return; }
    if (pa === 'next') { if (!open) setOpen(true); else { showSlide(idx + 1); armClose(); } return; }
    if (pa === 'reset') { if (w.confirm && !w.confirm('¿Volver la isla a su diseño original?')) return; cfg = clone(DEF); live(); renderTab(); }
  }

  /* ---------- tarjeta en el menú del admin ---------- */
  var SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="8" width="18" height="8" rx="4"/><circle cx="8" cy="12" r="1.2" fill="currentColor"/></svg>';
  var CHEV = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
  function injectCard() {
    var m = d.querySelector('#admin-root .adm-menu'); if (!m || m.querySelector('[data-isl-open]')) return;
    var b = d.createElement('button'); b.type = 'button'; b.className = 'am-card c3'; b.setAttribute('data-isl-open', '1');
    b.innerHTML = '<span class="am-ic">' + SVG + '</span><span class="am-tx"><b>Isla dinámica</b><small>Color, forma, lugar, animación y contenido</small></span><span class="am-go">' + CHEV + '</span>';
    m.insertBefore(b, m.firstChild);
  }
  function hookAdmin() {
    d.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-isl-open]'); if (b) { e.preventDefault(); e.stopPropagation(); openPanel(); } }, true);
    var tries = 0, iv = setInterval(function () {
      var r = d.getElementById('admin-root');
      if (r) { clearInterval(iv); new MutationObserver(injectCard).observe(r, { childList: true, subtree: true }); injectCard(); }
      else if (++tries > 400) clearInterval(iv);
    }, 300);
  }

  /* ---------- arranque ---------- */
  function fromState() { var s = st(); apply(s && s.design && s.design.isl); }
  function attach() {
    L().island = ISL; fromState(); trackMinutes(); snapScores(); checkNews(true);
    S().on('change', function () { if (!panel) fromState(); checkGoals(); checkNews(); });
    hookAdmin();
  }
  function boot() {
    build(); apply(DEF);
    var n = 0, iv = setInterval(function () { if (st() && S().on) { clearInterval(iv); attach(); } else if (++n > 150) clearInterval(iv); }, 100);
  }
  ISL._t = { minuteLabel: minuteLabel, minSeen: minSeen, goalPop: goalPop, newsPop: newsPop, myTeamHTML: myTeamHTML };
  ISL.close = function () { if (el) setOpen(false); };
  ISL.apply = function (c) { apply(c); }; ISL.openPanel = openPanel; ISL.pop = pop; ISL.DEF = DEF;
  ISL._state = function () { return { cfg: cfg, open: open, idx: idx }; };
  w.LSL = w.LSL || {}; w.LSL.island = ISL;
  if (d.body) boot(); else d.addEventListener('DOMContentLoaded', boot);
})(window);
