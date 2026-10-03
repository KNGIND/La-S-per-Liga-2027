/* La Súper Liga · game.js
   Ranking, pronósticos y rachas. Módulo diferido: app.js lo descarga después de arrancar.
   Todo lo que escribe el público pasa por funciones de Supabase (supabase-ranking.sql). */
(function (w) {
  'use strict';
  var LSL = w.LSL, S = LSL.store, U = LSL.u, esc = U.esc, UI = LSL.ui, T = LSL.t, doc = document;
  var CFG = w.LSL_CONFIG || {};
  var base = (CFG.supabaseUrl || '').replace(/\/+$/, ''), key = CFG.supabaseAnonKey || '';
  var K_PL = 'lsl:player', K_DAY = 'lsl:checkin';
  var G = LSL.game = { settings: null, board: null, me: null, draft: {}, busy: false, ready: false };

  function on() { return !!(base && key); }
  function rpc(name, body, tok) {
    return fetch(base + '/rest/v1/rpc/' + name, {
      method: 'POST', cache: 'no-store',
      headers: { apikey: key, Authorization: 'Bearer ' + (tok || key), 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { }
        if (!r.ok) { var e = new Error((j && (j.message || j.hint)) || ('Error ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function rerender() { if (LSL.rerender) LSL.rerender(); }

  /* ---------- identidad de este celular ---------- */
  function rnd(n) { var a = new Uint8Array(n); (w.crypto || {}).getRandomValues ? w.crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; }); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function uuid() { if (w.crypto && w.crypto.randomUUID) return w.crypto.randomUUID(); var h = rnd(16); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-a' + h.slice(17, 20) + '-' + h.slice(20, 32); }
  function player() {
    var p = LSL.ls.get(K_PL, null);
    if (!p || !p.id || !p.secret) { p = { id: uuid(), secret: rnd(24), sig: '' }; LSL.ls.set(K_PL, p); }
    return p;
  }
  G.profile = function () { return LSL.profile && LSL.profile.get(); };

  /* Registra / actualiza el nombre y equipo del perfil en el ranking (solo si cambió) */
  G.register = function () {
    var pr = G.profile(); if (!pr || !on()) return Promise.resolve(false);
    var p = player(), sig = pr.name + '|' + (pr.team || '');
    if (p.sig === sig) return Promise.resolve(true);
    return rpc('lsl_register', { p_id: p.id, p_secret: p.secret, p_name: pr.name, p_team: pr.team || null }).then(function (r) {
      if (r && r.ok) { p.sig = sig; LSL.ls.set(K_PL, p); return true; }
      return false;
    }).catch(function () { return false; });
  };

  /* ---------- ajustes (los prende/apaga el admin) ---------- */
  G.loadSettings = function () {
    if (!on()) return Promise.resolve(null);
    return fetch(base + '/rest/v1/lsl_settings?id=eq.1&select=*', { headers: { apikey: key }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { G.settings = rows && rows[0] ? rows[0] : null; return G.settings; })
      .catch(function () { return null; });
  };
  G.can = function (what) { return !!(G.settings && G.settings[what]); };

  G.loadMe = function () {
    var p = player();
    return rpc('lsl_my_stats', { p_id: p.id, p_secret: p.secret }).then(function (r) { G.me = r && r.ok ? r : null; return G.me; }).catch(function () { return null; });
  };
  G.loadBoard = function (force) {
    return rpc('lsl_leaderboard', { p_force: false }).then(function (rows) { G.board = rows || []; return G.board; }).catch(function () { G.board = G.board || []; return G.board; });
  };
  /* El admin logueado puede ver el ranking aunque esté oculto para el público */
  G.loadBoardAdmin = function () {
    return S.cloud.token().then(function (tok) { return rpc('lsl_leaderboard', { p_force: true }, tok); }).then(function (rows) { G.board = rows || []; return G.board; });
  };

  /* ---------- arranque (lo llama app.js después de cargar) ---------- */
  G.init = function () {
    return G.loadSettings().then(function (s) {
      G.ready = true;
      if (!s) return;
      var pr = G.profile();
      var tasks = [];
      if (pr && (s.streaks_enabled || s.predictions_enabled || s.hidden_enabled || s.leaderboard_visible)) tasks.push(G.register());
      return Promise.all(tasks).then(function () {
        var p = [];
        if (pr && s.streaks_enabled) p.push(G.checkin());
        if (pr && (s.predictions_enabled || s.streaks_enabled)) p.push(G.loadMe());
        if (s.leaderboard_visible) p.push(G.loadBoard());
        return Promise.all(p);
      }).then(function () { rerender(); });
    });
  };

  G.checkin = function () {
    var p = player(), day = new Date().toDateString();
    if (LSL.ls.get(K_DAY, '') === day) return Promise.resolve(null);
    return rpc('lsl_checkin', { p_id: p.id, p_secret: p.secret }).then(function (r) {
      if (r && r.ok) {
        LSL.ls.set(K_DAY, day);
        if (r.new && UI.toast) UI.toast('Racha: ' + r.streak + (r.streak === 1 ? ' día' : ' días') + ' seguidos');
      }
      return r;
    }).catch(function () { return null; });
  };

  /* Objeto oculto encontrado (lo usa Avisos 2.0 en la próxima fase) */
  G.found = function (id) {
    var p = player();
    return rpc('lsl_found', { p_id: p.id, p_secret: p.secret, p_item: id }).then(function (r) {
      if (r && r.ok) { UI.toast(r.already ? 'Ya habías encontrado este' : '¡Encontraste algo oculto! +' + r.points + ' pts'); G.loadMe().then(rerender); }
      return r;
    });
  };

  /* ---------- pronóstico en el detalle del partido ---------- */
  function closed(m) { return m.status !== 'upcoming' || (T && T.ts ? T.ts(m.date) <= Date.now() : false); }
  function myPred(m) { var pr = G.me && G.me.predictions && G.me.predictions[m.id]; return pr || null; }
  function dr(m) { return G.draft[m.id] || (G.draft[m.id] = (function () { var p = myPred(m); return { h: p ? p[0] : 0, a: p ? p[1] : 0 }; })()); }

  G.predHTML = function (m) {
    if (!G.can('predictions_enabled')) return '';
    var mine = myPred(m), pr = G.profile();
    if (closed(m)) {
      return mine ? '<div class="pr-box"><span class="pr-k">Tu pronóstico</span><b class="pr-v">' + (+mine[0]) + ' – ' + (+mine[1]) + '</b></div>' : '';
    }
    if (!pr) {
      return '<div class="pr-box"><div class="pr-t"><b>¿Cómo termina?</b><small>Creá tu perfil para jugar y sumar puntos.</small></div><button class="btn sm" data-pr="profile">Crear perfil</button></div>';
    }
    var h = S.team(m.home), a = S.team(m.away), d = dr(m), pts = G.settings;
    return '<div class="pr-box col"><div class="pr-t"><b>¿Cómo termina?</b><small>Exacto +' + (+pts.pts_exact) + ' pts · Ganador o empate +' + (+pts.pts_outcome) + ' pts. Se cierra al empezar.</small></div>' +
      '<div class="pr-row"><div class="pr-s"><span>' + esc(h ? h.name : 'Local') + '</span><div>' + stepBtn('h', m, -1) + '<b>' + d.h + '</b>' + stepBtn('h', m, 1) + '</div></div>' +
      '<i>–</i><div class="pr-s"><span>' + esc(a ? a.name : 'Visitante') + '</span><div>' + stepBtn('a', m, -1) + '<b>' + d.a + '</b>' + stepBtn('a', m, 1) + '</div></div></div>' +
      '<button class="btn wide" data-pr="save" data-m="' + esc(m.id) + '">' + (mine ? 'Cambiar pronóstico (' + (+mine[0]) + '–' + (+mine[1]) + ')' : 'Guardar pronóstico') + '</button></div>';
  };
  function stepBtn(side, m, d) { return '<button class="pr-b" data-pr="' + side + (d > 0 ? '+' : '-') + '" data-m="' + esc(m.id) + '" aria-label="' + (d > 0 ? 'Sumar gol' : 'Restar gol') + '">' + (d > 0 ? '+' : '−') + '</button>'; }

  /* Clicks dentro del detalle del partido (los llama ui.js) */
  G.onSheetClick = function (e) {
    var b = e.target.closest('[data-pr]'); if (!b) return false;
    var act = b.getAttribute('data-pr'), mid = b.getAttribute('data-m'), m = mid && S.match ? S.match(mid) : null;
    if (act === 'profile') {
      UI.closeSheet();
      setTimeout(function () { LSL.loadOnboard(function () { LSL.onboard.edit('name'); }); }, 320);
      return true;
    }
    if (!m) return true;
    if (act.length === 2 && (act[1] === '+' || act[1] === '-')) {
      var v = dr(m); v[act[0]] = Math.max(0, Math.min(30, v[act[0]] + (act[1] === '+' ? 1 : -1)));
      UI.renderSheet(); return true;
    }
    if (act === 'save') {
      if (G.busy) return true;
      if (closed(m)) { UI.toast('El partido ya empezó', 2200, 'warn'); UI.renderSheet(); return true; }
      var d = dr(m), p = player(); G.busy = true;
      G.register().then(function () {
        return rpc('lsl_predict', { p_id: p.id, p_secret: p.secret, p_match: m.id, p_home: d.h, p_away: d.a });
      }).then(function (r) {
        G.busy = false;
        if (r && r.ok) {
          G.me = G.me || { predictions: {} }; G.me.predictions = G.me.predictions || {}; G.me.predictions[m.id] = [d.h, d.a];
          UI.toast('Pronóstico guardado: ' + d.h + '–' + d.a);
        } else {
          UI.toast({ cerrado: 'El partido ya empezó', apagado: 'Los pronósticos están desactivados', clave: 'No pude validar tu perfil, probá de nuevo', partido: 'Partido no encontrado' }[r && r.error] || 'No se pudo guardar', 2600, 'warn');
        }
        UI.renderSheet();
      }).catch(function () { G.busy = false; UI.toast('Sin conexión. Probá de nuevo.', 2400, 'warn'); });
      return true;
    }
    return true;
  };

  /* ---------- ranking (pestaña dentro de Liga) ---------- */
  G.rankHTML = function () {
    if (!G.can('leaderboard_visible')) return '';
    if (!G.board) { G.loadBoard().then(rerender); return '<p class="note">Cargando ranking…</p>'; }
    var meId = player().id, s = G.settings, rows = G.board;
    var h = '<div class="rk-top"><div><b>Ranking de jugadores</b><small>' + rows.length + (rows.length === 1 ? ' jugador' : ' jugadores') + '</small></div>' +
      (G.me && s.streaks_enabled ? '<span class="rk-streak">Racha ' + (+G.me.streak || 0) + (G.me.streak === 1 ? ' día' : ' días') + '</span>' : '') + '</div>';
    if (!rows.length) return h + '<div class="empty"><b>Todavía no hay jugadores</b><span>Aparecen cuando se crean un perfil.</span></div>';
    h += '<div class="rk">' + rows.map(function (r) {
      var t = r.team ? S.team(r.team) : null, me = r.player_id === meId;
      return '<div class="rk-r' + (me ? ' me' : '') + (+r.pos <= 3 ? ' top' : '') + '"><span class="rk-p">' + (+r.pos) + '</span>' +
        UI.avatar({ name: r.name }, 36) + '<div class="rk-n"><b>' + esc(r.name) + (me ? ' · vos' : '') + '</b><small>' + (+r.predictions || 0) + ' pronósticos · ' + (+r.exact_hits || 0) + ' exactos</small></div>' +
        (t ? UI.crest(t, 's') : '') + '<span class="rk-pt">' + (+r.points) + '<small>pts</small></span></div>';
    }).join('') + '</div>';
    var how = [];
    if (s.predictions_enabled) how.push('pronóstico exacto +' + (+s.pts_exact) + ', ganador o empate +' + (+s.pts_outcome));
    if (s.streaks_enabled) how.push('entrar cada día +' + (+s.pts_daily) + ' (y +' + (+s.pts_streak7) + ' cada 7 días seguidos)');
    if (s.hidden_enabled) how.push('encontrar cosas ocultas');
    return h + (how.length ? '<p class="note">Sumás puntos por: ' + how.join(' · ') + '.</p>' : '');
  };

  /* ---------- Panel admin (las llama admin.js) ---------- */
  G.admin = {
    load: function () {
      if (!on()) return Promise.reject(new Error('Falta conectar Supabase (Nube).'));
      return S.cloud.token().then(function (tok) {
        return fetch(base + '/rest/v1/lsl_settings?id=eq.1&select=*', { headers: { apikey: key, Authorization: 'Bearer ' + tok }, cache: 'no-store' });
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status === 404 ? 'Falta correr supabase-ranking.sql en Supabase.' : 'Error ' + r.status);
        return r.json();
      }).then(function (rows) { G.settings = rows[0] || null; return G.settings; });
    },
    save: function (patch) {
      patch.updated_at = new Date().toISOString();
      return S.cloud.token().then(function (tok) {
        return fetch(base + '/rest/v1/lsl_settings?id=eq.1', { method: 'PATCH', cache: 'no-store', headers: { apikey: key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(patch) });
      }).then(function (r) { return r.ok ? r.json() : r.text().then(function (t) { throw new Error(t.slice(0, 160)); }); })
        .then(function (rows) { if (rows && rows[0]) G.settings = rows[0]; return G.settings; });
    },
    board: function () { return G.loadBoardAdmin(); },
    settle: function () { return S.cloud.token().then(function (tok) { return rpc('lsl_settle', {}, tok); }); },
    /* Puntos a mano (premios, correcciones). points puede ser negativo */
    give: function (playerId, points, note) {
      return S.cloud.token().then(function (tok) {
        return fetch(base + '/rest/v1/lsl_points', { method: 'POST', cache: 'no-store', headers: { apikey: key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: playerId, kind: 'manual', ref: 'm' + Date.now().toString(36), points: points, note: note || 'Ajuste del admin' }) });
      }).then(function (r) { if (!r.ok) throw new Error('No se pudo dar los puntos'); return true; });
    }
  };

  /* arranca solo, sin frenar la app */
  (w.requestIdleCallback || function (f) { return setTimeout(f, 800); })(function () { G.init(); });
})(window);
