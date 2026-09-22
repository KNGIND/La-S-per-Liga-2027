/* La Súper Liga · store.js
   Estado de la liga, cálculos (tabla), persistencia y sincronización. Sin dependencias. */
(function (w) {
  'use strict';
  var LSL = w.LSL = w.LSL || {};
  var CFG = w.LSL_CONFIG = w.LSL_CONFIG || {};
  var K_DRAFT = 'lsl:draft', K_CACHE = 'lsl:cache', K_PREFS = 'lsl:prefs', K_AUTH = 'lsl:auth', K_CFG = 'lsl:cfg';
  var CFG0 = { url: CFG.supabaseUrl || '', key: CFG.supabaseAnonKey || '' };   // lo que dice config.js

  /* ---------- almacenamiento seguro ---------- */
  var LS = LSL.ls = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  /* Conexión a Supabase guardada desde el panel (Nube): en este dispositivo pisa a config.js */
  (function () { var o = LS.get(K_CFG, null); if (o && o.url && o.key) { CFG.supabaseUrl = o.url; CFG.supabaseAnonKey = o.key; } })();

  /* ---------- utilidades ---------- */
  var U = LSL.u = {
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    uid: function (p) { return (p || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },
    clone: function (o) { return JSON.parse(JSON.stringify(o)); },
    pad: function (n) { return n < 10 ? '0' + n : '' + n; },
    debounce: function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; },
    /* HEX seguro: acepta #RGB / #RRGGBB (con o sin #) y devuelve '#RRGGBB' en mayúsculas, o '' si no es válido */
    hexn: function (v) {
      var m = /^\s*#?([0-9a-f]{3}|[0-9a-f]{6})\s*$/i.exec(String(v == null ? '' : v));
      if (!m) return '';
      var h = m[1]; if (h.length === 3) h = h.replace(/./g, '$&$&');
      return '#' + h.toUpperCase();
    },
    hexOr: function (v, d) { return U.hexn(v) || d || ''; },
    rgb: function (hex) {
      var n = parseInt((U.hexn(hex) || '#000000').slice(1), 16) || 0;
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    },
    hex: function (r, g, b) {
      return '#' + [r, g, b].map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
    },
    lum: function (hex) { var c = U.rgb(hex); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; },
    mix: function (a, b, t) {
      var x = U.rgb(a), y = U.rgb(b);
      return U.hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
    },
    ink: function (hex) { return U.lum(hex) > 0.6 ? '#04101F' : '#FFFFFF'; },
    alpha: function (hex, a) { var c = U.rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; },
    hue: function (hex, deg) {
      var c = U.rgb(hex), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
      if (d) {
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h /= 6;
      }
      h = (h + deg / 360 + 1) % 1;
      function f(p, q, t) { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
      if (!s) return U.hex(l * 255, l * 255, l * 255);
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      return U.hex(f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255);
    }
  };

  /* ---------- fechas (sin Intl: más rápido en celulares modestos) ---------- */
  var DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var DL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var ML = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var tsCache = {};
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  var T = LSL.t = {
    DS: DS, DL: DL, ML: ML, cap: cap,
    ts: function (s) { var v = tsCache[s]; if (v === undefined) { v = new Date(s).getTime(); if (isNaN(v)) v = 0; tsCache[s] = v; } return v; },
    time: function (ts) { var d = new Date(ts); return U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()); },
    key: function (ts) { var d = new Date(ts); return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()); },
    day0: function (ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); },
    short: function (ts) { var d = new Date(ts); return cap(DS[d.getDay()]) + ' ' + d.getDate() + ' ' + MS[d.getMonth()]; },
    dm: function (ts) { var d = new Date(ts); return d.getDate() + ' ' + MS[d.getMonth()]; },
    long: function (ts) { var d = new Date(ts); return cap(DL[d.getDay()]) + ' ' + d.getDate() + ' de ' + ML[d.getMonth()]; },
    rel: function (ts) {
      var diff = Math.round((T.day0(ts) - T.day0(Date.now())) / 864e5);
      return diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : diff === -1 ? 'Ayer' : T.short(ts);
    },
    inLabel: function (ts) {
      var ms = ts - Date.now();
      if (ms <= 0) return '';
      var m = Math.round(ms / 6e4);
      if (m < 60) return 'Empieza en ' + m + ' min';
      var h = Math.floor(m / 60);
      if (h < 24) return 'Empieza en ' + h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
      var d = Math.round(ms / 864e5);
      return 'Faltan ' + d + (d === 1 ? ' día' : ' días');
    }
  };

  /* ---------- preferencias del dispositivo ---------- */
  LSL.prefs = LS.get(K_PREFS, {}) || {};
  LSL.savePrefs = function () { LS.set(K_PREFS, LSL.prefs); };

  /* ---------- perfil de usuario (queda guardado en este dispositivo) ---------- */
  var K_PROFILE = 'lsl:profile';
  LSL.profile = {
    get: function () { var p = LS.get(K_PROFILE, null); return p && p.name ? p : null; },
    save: function (patch) {
      var o = Object.assign({}, LS.get(K_PROFILE, {}) || {}, patch);
      LS.set(K_PROFILE, o);
      if (o.team) { LSL.prefs.fav = o.team; LSL.savePrefs(); }   // el equipo del perfil es tu "Mi equipo"
      return o;
    }
  };

  /* ---------- estado por defecto ---------- */
  function defaults() {
    return {
      meta: { rev: 0, updatedAt: '', schema: 1 },
      league: { name: 'La Súper Liga', short: 'LSL', season: 'Temporada 1', seasonStatus: 'En curso', tagline: '', info: '', rules: '', pointsWin: 3, pointsDraw: 1, pointsLoss: 0, zoneTop: 0, zoneBottom: 0, logo: '' },
      design: { accent: '#27C4C9', accent2: '#FFD226', bg: 'navy', bgCustom: '#0A1428', mode: 'dark', nav: 'floating', radius: 16, perf: 'auto' },
      features: { calendar: true, news: true, lineups: true, sanctions: true, channels: true },
      banner: { active: false, text: '' },
      release: { id: '', notes: '', at: '', force: false },
      announcements: [],
      teams: [], channels: [], matches: [], news: [], sanctions: []
    };
  }
  function normalize(s) {
    var d = defaults(); s = s || {};
    ['meta', 'league', 'design', 'features', 'banner', 'release'].forEach(function (k) { s[k] = Object.assign({}, d[k], s[k] || {}); });
    ['teams', 'channels', 'matches', 'news', 'sanctions', 'announcements'].forEach(function (k) { if (!Array.isArray(s[k])) s[k] = []; });
    return s;
  }
  LSL.normalize = normalize;

  /* ---------- SHA-256 para la contraseña local ---------- */
  LSL.sha = function (str) {
    if (!(w.crypto && w.crypto.subtle)) return Promise.reject(new Error('Abrí el sitio con https para usar la contraseña.'));
    return w.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
    });
  };

  /* ---------- Store ---------- */
  var S = LSL.store = {
    state: null,
    mode: (CFG.supabaseUrl && CFG.supabaseAnonKey) ? 'cloud' : 'local',
    status: 'idle', statusMsg: '', hasDraft: false, dirty: false,
    _l: {}, _ix: null, _st: null, _sorted: null, _byDay: null, _last: 0, _tm: null, _busy: false,
    _remoteRaw: null, _gen: 0, _pushing: null, _fails: 0, _rt: 0, _polling: false, _bc: null, _warnedLocal: false,

    on: function (ev, fn) { (this._l[ev] = this._l[ev] || []).push(fn); },
    emit: function (ev, a) { (this._l[ev] || []).forEach(function (f) { try { f(a); } catch (e) { console.error(e); } }); },

    init: function () {
      var seed = w.LSL_DATA || null, s;
      var stamp = function (o) { return (o && o.meta && o.meta.updatedAt) || ''; };
      if (this.mode === 'cloud') {
        var cache = LS.get(K_CACHE);
        s = cache && (!seed || stamp(cache) >= stamp(seed)) ? cache : seed;
      } else {
        var draft = LS.get(K_DRAFT);
        if (draft && (!seed || stamp(draft) > stamp(seed))) { s = draft; this.hasDraft = true; }
        else { s = seed; if (draft) LS.del(K_DRAFT); }
      }
      this.state = normalize(s ? U.clone(s) : null);
      this._reindex();
      return this;
    },

    _reindex: function () {
      var s = this.state, T = {}, C = {}, M = {};
      s.teams.forEach(function (t) { T[t.id] = t; });
      s.channels.forEach(function (c) { C[c.id] = c; });
      s.matches.forEach(function (m) { M[m.id] = m; });
      this._ix = { T: T, C: C, M: M };
      this._st = this._sorted = this._byDay = null;
    },
    team: function (id) { return this._ix.T[id] || null; },
    channel: function (id) { return this._ix.C[id] || null; },
    match: function (id) { return this._ix.M[id] || null; },
    news: function (id) { for (var i = 0; i < this.state.news.length; i++) if (this.state.news[i].id === id) return this.state.news[i]; return null; },

    sorted: function () {
      if (!this._sorted) this._sorted = this.state.matches.slice().sort(function (a, b) { return T.ts(a.date) - T.ts(b.date); });
      return this._sorted;
    },
    byDay: function () {
      if (!this._byDay) {
        var map = {};
        this.sorted().forEach(function (m) { var k = T.key(T.ts(m.date)); (map[k] = map[k] || []).push(m); });
        this._byDay = map;
      }
      return this._byDay;
    },
    isTeamUsed: function (id) { return this.state.matches.some(function (m) { return m.home === id || m.away === id; }); },

    /* Tabla de posiciones: se calcula sola con los partidos de Liga finalizados. */
    standings: function () {
      if (this._st) return this._st;
      var st = this.state, L = st.league, rows = {}, W = +L.pointsWin, D = +L.pointsDraw, Ls = +L.pointsLoss;
      if (isNaN(W)) W = 3; if (isNaN(D)) D = 1; if (isNaN(Ls)) Ls = 0;
      st.teams.forEach(function (t) { rows[t.id] = { id: t.id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: +t.adj || 0, form: [] }; });
      this.sorted().forEach(function (m) {
        if (m.status !== 'finished' || m.comp !== 'liga') return;
        var h = rows[m.home], a = rows[m.away]; if (!h || !a) return;
        var hs = +m.hs || 0, as = +m.as || 0;
        h.pj++; a.pj++; h.gf += hs; h.gc += as; a.gf += as; a.gc += hs;
        if (hs > as) { h.g++; a.p++; h.pts += W; a.pts += Ls; h.form.push('w'); a.form.push('l'); }
        else if (hs < as) { a.g++; h.p++; a.pts += W; h.pts += Ls; a.form.push('w'); h.form.push('l'); }
        else { h.e++; a.e++; h.pts += D; a.pts += D; h.form.push('d'); a.form.push('d'); }
      });
      var names = {}; st.teams.forEach(function (t) { names[t.id] = t.name || ''; });
      var arr = Object.keys(rows).map(function (k) { var r = rows[k]; r.dg = r.gf - r.gc; r.form = r.form.slice(-5); return r; });
      arr.sort(function (a, b) { return b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || (names[a.id] < names[b.id] ? -1 : 1); });
      return (this._st = arr);
    },

    /* ---------- cambios ---------- */
    commit: function (fn) {
      fn(this.state);
      var m = this.state.meta; m.rev = (m.rev || 0) + 1; m.updatedAt = new Date().toISOString();
      this._gen++;
      this._reindex();
      this._persist();
      this.emit('change', { local: true });
    },
    replace: function (ns) {
      this.state = normalize(ns);
      var m = this.state.meta; m.rev = (m.rev || 0) + 1; m.updatedAt = new Date().toISOString();
      this._gen++;
      this._reindex(); this._persist(); this.emit('change', { local: true });
    },
    setStatus: function (st, msg) { this.status = st; this.statusMsg = msg || ''; this.emit('sync'); },

    /* Cada cambio (incluidos los DELETE de partidos, noticias, equipos…) reescribe el estado completo:
       en Supabase eso es un UPDATE de la fila única de lsl_state (no hay filas sueltas que borrar). */
    _persist: function () {
      var self = this;
      if (this.mode === 'cloud') {
        LS.set(K_CACHE, this.state);
        this.dirty = true;
        if (!C.sess()) {                       // antes esto salía en silencio: parecía guardado y no lo estaba
          this.setStatus('error', 'Sin sesión de administrador: el cambio quedó solo en este celular.');
          this._notify('Sin sesión: este cambio NO se publicó. Entrá de nuevo al panel (Nube → Iniciar sesión).', 'err');
          return;
        }
        this.setStatus('saving');
        clearTimeout(this._tm);
        this._tm = setTimeout(function () { self._flush(); }, 450);
      } else {
        var ok = LS.set(K_DRAFT, this.state);
        this.hasDraft = ok;
        this.setStatus(ok ? 'draft' : 'error', ok ? '' : 'No hay espacio en el dispositivo. Exportá y achicá las imágenes.');
        if (ok && !this._warnedLocal) { this._warnedLocal = true; this._notify('Modo local: el cambio queda como borrador en este celular. Conectá Supabase (panel → Nube) para publicarlo a todos.', 'warn', 5200); }
      }
    },
    _notify: function (msg, kind, ms) { try { if (LSL.toast) LSL.toast(msg, ms || 4600, kind); } catch (e) { } },

    /* Publica en la nube de a un pedido por vez (si hay más cambios mientras tanto, vuelve a publicar). */
    _flush: function () {
      var self = this;
      if (this.mode !== 'cloud') return Promise.resolve(false);
      if (this._pushing) return this._pushing;
      if (!C.sess()) return Promise.resolve(false);
      var g = this._gen;
      this.setStatus('saving');
      this._pushing = C.push(this.state).then(function () {
        self._fails = 0;
        if (self._gen === g) { self.dirty = false; self.setStatus('ok'); }
        self.emit('published');
        if (self._bc) { try { self._bc.postMessage(Date.now()); } catch (e) { } }
        return true;
      }, function (e) { return self._pushErr(e); }).then(function (r) {
        self._pushing = null;
        if (r && self._gen !== g && self.dirty) return self._flush();
        return r;
      });
      return this._pushing;
    },
    _pushErr: function (e) {
      var self = this, msg = (e && e.message) || 'No se pudo publicar.';
      if (e && e.conflict) {
        this.dirty = false;
        this.setStatus('error', msg);
        this._notify(msg, 'err', 6500);
        return this.refresh(true).then(function () { return false; });
      }
      this._fails++;
      this.setStatus('error', msg);
      if (this._fails === 1 || (e && e.auth)) this._notify(msg + (e && e.auth ? '' : ' Reintento automático…'), 'err', 6000);
      if (!(e && e.auth)) {
        clearTimeout(this._rt);
        this._rt = setTimeout(function () { if (self.dirty) self._flush(); }, Math.min(60000, 4000 * Math.pow(2, this._fails - 1)));
      }
      return false;
    },
    flush: function () { clearTimeout(this._tm); return this._flush(); },

    /* Conexión con Supabase (la usa el panel → Nube) */
    configure: function (url, k) {
      url = String(url || '').trim().replace(/\/+$/, ''); k = String(k || '').trim();
      var changed = (base + '|' + key) !== (url + '|' + k);
      base = url; key = k; CFG.supabaseUrl = url; CFG.supabaseAnonKey = k;
      this.mode = (url && k) ? 'cloud' : 'local';
      if (changed) { LS.del(K_AUTH); this._remoteRaw = null; this._last = 0; this._fails = 0; clearTimeout(this._rt); }
      this.emit('mode'); this.emit('sync');
      if (this.mode === 'cloud') this.startPolling();
    },
    saveConfig: function (url, k) { LS.set(K_CFG, { url: String(url).trim().replace(/\/+$/, ''), key: String(k).trim() }); this.configure(url, k); },
    clearConfig: function () { LS.del(K_CFG); this.configure(CFG0.url, CFG0.key); },
    hasDeviceConfig: function () { return !!LS.get(K_CFG, null); },
    discardDraft: function () { LS.del(K_DRAFT); LS.del(K_CACHE); },

    /* Exportar / importar */
    exportJS: function () { return 'window.LSL_DATA = ' + JSON.stringify(this.state) + ';\n'; },
    parseImport: function (text) {
      var i = text.indexOf('{'), j = text.lastIndexOf('}');
      if (i < 0 || j < i) throw new Error('El archivo no tiene datos válidos.');
      var o = JSON.parse(text.slice(i, j + 1));
      if (!Array.isArray(o.teams) || !Array.isArray(o.matches)) throw new Error('Faltan equipos o partidos en el archivo.');
      return o;
    },

    /* Contraseña local del panel (modo local) */
    checkPass: function (p) {
      var a = this.state.admin;
      if (!a || !a.hash) return Promise.resolve(p === 'superliga');
      return LSL.sha((a.salt || '') + p).then(function (h) { return h === a.hash; });
    },
    usingDefaultPass: function () { var a = this.state.admin; return !a || !a.hash; },
    setPass: function (p) {
      var salt = U.uid('s');
      return LSL.sha(salt + p).then(function (h) { S.commit(function (st) { st.admin = { salt: salt, hash: h }; }); });
    },

    /* Sincronización (solo modo nube). Primero pregunta solo por la marca de tiempo (liviano) y baja
       todos los datos únicamente si cambió: así los borrados de otro dispositivo llegan rápido y sin gastar datos. */
    refresh: function (force) {
      if (this.mode !== 'cloud' || this._busy || (!force && (this.dirty || this._pushing))) return Promise.resolve(false);
      var self = this; this._busy = true;
      return (force ? Promise.resolve(null) : C.fetchStamp()).then(function (stamp) {
        self._last = Date.now();
        if (!force && stamp && stamp === self._remoteRaw) return null;      // nada nuevo
        return C.fetchState();
      }).then(function (row) {
        self._busy = false;
        if (!row) return false;
        self._remoteRaw = row.updated_at || self._remoteRaw;
        if (self.dirty || self._pushing) return false;                      // cambiaste algo mientras bajaba: no lo pisamos
        if (!row.data || !Array.isArray(row.data.teams)) return false;      // tabla vacía: seguimos con lo local
        self.state = normalize(row.data); self._reindex();
        LS.set(K_CACHE, self.state);
        self.emit('change', { remote: true });
        return true;
      }).catch(function () { self._busy = false; return false; });
    },
    startPolling: function () {
      if (this._polling) { if (this.mode === 'cloud') this.refresh(); return; }
      this._polling = true;
      var self = this, sec = function () { return (CFG.pollSeconds || 30) * 1000; };
      setInterval(function () {
        if (document.hidden || self.mode !== 'cloud') return;
        var live = self.state.matches.some(function (m) { return m.status === 'live' || m.status === 'paused'; });
        if (Date.now() - self._last >= (live ? sec() : sec() * 2)) self.refresh();
      }, 10000);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden || self.mode !== 'cloud') return;
        if (self.dirty) self._flush();
        if (Date.now() - self._last > 15000) self.refresh();
      });
      w.addEventListener('online', function () { if (self.mode !== 'cloud') return; if (self.dirty) self._flush(); self.refresh(); });
      try { this._bc = new BroadcastChannel('lsl-sync'); this._bc.onmessage = function () { self.refresh(true); }; } catch (e) { }
      if (this.mode === 'cloud') this.refresh();
    }
  };

  /* ---------- Supabase (REST directo, sin librería: menos peso) ---------- */
  var base = (CFG.supabaseUrl || '').replace(/\/+$/, ''), key = CFG.supabaseAnonKey || '';

  /* Traduce los errores de Supabase/PostgREST a mensajes que se entiendan */
  function explain(status, text) {
    var j = {}; try { j = JSON.parse(text) || {}; } catch (e) { }
    var code = j.code || '', msg = j.message || j.msg || j.error_description || '';
    if (status === 401 || code === 'PGRST301') return 'La sesión venció o la clave no es válida. Volvé a iniciar sesión.';
    if (status === 403 || code === '42501') return 'Supabase rechazó la escritura (política RLS). Revisá que estés logueado como admin y que exista la política UPDATE en lsl_state.';
    if (status === 404 || code === 'PGRST205' || code === '42P01') return 'No existe la tabla lsl_state. Ejecutá supabase/schema.sql en el SQL Editor.';
    return 'No se pudo publicar (' + status + '). ' + String(msg || text || '').slice(0, 120);
  }
  function httpErr(r) {
    return r.text().then(function (t) { var e = new Error(explain(r.status, t)); e.status = r.status; e.auth = r.status === 401 || r.status === 403; throw e; });
  }
  function authErr(m) { var e = new Error(m); e.auth = true; return e; }

  var C = S.cloud = {
    sess: function () { return LS.get(K_AUTH); },
    who: function () { var s = C.sess(); return s && s.m || ''; },
    fetchStamp: function () {
      return fetch(base + '/rest/v1/lsl_state?id=eq.1&select=updated_at&t=' + Date.now(), { headers: { apikey: key, 'Pragma': 'no-cache', 'Cache-Control': 'no-cache, no-store, must-revalidate' }, cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (rows) { return rows && rows[0] ? rows[0].updated_at : null; });
    },
    fetchState: function () {
      return fetch(base + '/rest/v1/lsl_state?id=eq.1&select=data,updated_at&t=' + Date.now(), { headers: { apikey: key, 'Pragma': 'no-cache', 'Cache-Control': 'no-cache, no-store, must-revalidate' }, cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (rows) { return rows && rows[0] || null; });
    },
    login: function (email, pass) {
      return fetch(base + '/auth/v1/token?grant_type=password', {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pass })
      }).then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j.error_description || j.msg || 'Email o contraseña incorrectos.');
          LS.set(K_AUTH, { a: j.access_token, r: j.refresh_token, e: Date.now() + (j.expires_in || 3600) * 1000, m: email });
          return true;
        });
      });
    },
    token: function () {
      var s = C.sess();
      if (!s) return Promise.reject(authErr('Sesión vencida. Volvé a entrar al panel.'));
      if (s.e - Date.now() > 60000) return Promise.resolve(s.a);
      return fetch(base + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: s.r })
      }).then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) { LS.del(K_AUTH); throw authErr('Sesión vencida. Volvé a entrar al panel.'); }
          LS.set(K_AUTH, { a: j.access_token, r: j.refresh_token, e: Date.now() + (j.expires_in || 3600) * 1000, m: s.m });
          return j.access_token;
        });
      }, function () { throw new Error('Sin conexión con Supabase.'); });
    },
    logout: function () { LS.del(K_AUTH); },

    /* Publica el estado. Usa "solo si nadie publicó desde que lo leí" (PATCH con updated_at): así un celular con datos
       viejos NO puede resucitar lo que otro borró. force=true pisa todo (botón "Volver a subir todo"). */
    push: function (state, force) {
      return C.token().then(function (tok) {
        var stamp = new Date().toISOString(), known = S._remoteRaw;
        var h = { apikey: key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
        if (known && !force) {
          h.Prefer = 'return=representation';
          return fetch(base + '/rest/v1/lsl_state?id=eq.1&updated_at=eq.' + encodeURIComponent(known), { method: 'PATCH', headers: h, cache: 'no-store', body: JSON.stringify({ data: state, updated_at: stamp }) })
            .then(function (r) { return r.ok ? r.json() : httpErr(r); })
            .then(function (rows) {
              if (rows && rows.length) { S._remoteRaw = rows[0].updated_at || stamp; return; }
              /* 0 filas: o publicó otro dispositivo, o la política RLS de UPDATE lo bloquea en silencio */
              return C.fetchStamp().then(function (cur) {
                var e;
                if (cur && cur !== known) { e = new Error('Otro dispositivo publicó cambios antes que vos. Cargué la versión nueva: repetí tu cambio.'); e.conflict = true; }
                else { e = new Error('Supabase no aceptó la escritura (0 filas). Falta la política UPDATE para usuarios autenticados en lsl_state.'); e.auth = true; }
                throw e;
              }, function () { throw new Error('Sin conexión con Supabase.'); });
            });
        }
        h.Prefer = 'resolution=merge-duplicates,return=representation';
        return fetch(base + '/rest/v1/lsl_state?on_conflict=id', { method: 'POST', headers: h, cache: 'no-store', body: JSON.stringify({ id: 1, data: state, updated_at: stamp }) })
          .then(function (r) { return r.ok ? r.json() : httpErr(r); })
          .then(function (rows) { S._remoteRaw = (rows && rows[0] && rows[0].updated_at) || stamp; });
      }, function (e) { throw e; });
    },

    /* Diagnóstico para el botón "Comprobar conexión". No toca nada del estado de la app. */
    test: function (url, k, withWrite) {
      url = String(url || '').trim().replace(/\/+$/, ''); k = String(k || '').trim();
      var out = { steps: [], ok: false }, t0 = Date.now();
      function step(ok, label, detail) { out.steps.push({ ok: ok, label: label, detail: detail || '' }); return ok; }
      if (!/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url)) { step(false, 'La URL no parece válida', 'Formato esperado: https://abcdxyz.supabase.co'); return Promise.resolve(out); }
      if (!k) { step(false, 'Falta la clave anon/public'); return Promise.resolve(out); }
      return fetch(url + '/rest/v1/lsl_state?id=eq.1&select=updated_at', { headers: { apikey: k }, cache: 'no-store' }).then(function (r) {
        var ms = Date.now() - t0;
        step(true, 'Servidor alcanzable', ms + ' ms');
        return r.text().then(function (t) {
          var j = null; try { j = JSON.parse(t); } catch (e) { }
          if (r.status === 401 || (j && (j.code === 'PGRST301' || /invalid api key|JWT/i.test(j.message || j.msg || '')))) { step(false, 'Clave rechazada', 'Copiá de nuevo la clave anon/publishable (Project Settings → API).'); return out; }
          step(true, 'Clave válida');
          if (r.status === 404 || (j && (j.code === 'PGRST205' || j.code === '42P01'))) { step(false, 'No existe la tabla lsl_state', 'Ejecutá supabase/schema.sql en el SQL Editor de Supabase.'); return out; }
          if (!r.ok) { step(false, 'Error ' + r.status + ' al leer lsl_state', String((j && (j.message || j.hint)) || t).slice(0, 140)); return out; }
          step(true, 'Tabla lsl_state encontrada');
          var stamp = j && j[0] && j[0].updated_at;
          step(!!stamp, stamp ? 'Fila de datos (id = 1) encontrada' : 'La tabla está vacía', stamp ? '' : 'Entrá como admin y usá “Volver a subir todo”.');
          var sess = C.sess();
          if (!withWrite) { out.ok = out.steps.every(function (x) { return x.ok; }); return out; }
          if (!sess) { step(false, 'Sesión de administrador', 'Iniciá sesión abajo para poder publicar.'); out.ok = false; return out; }
          return C.token().then(function (tok) {
            step(true, 'Sesión de administrador activa', sess.m || '');
            if (!stamp) { out.ok = out.steps.every(function (x) { return x.ok; }); return out; }
            /* prueba de escritura inofensiva: reescribe updated_at con el mismo valor */
            return fetch(url + '/rest/v1/lsl_state?id=eq.1&updated_at=eq.' + encodeURIComponent(stamp), { method: 'PATCH', cache: 'no-store', headers: { apikey: k, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ updated_at: stamp }) })
              .then(function (w) { return w.ok ? w.json() : w.text().then(function () { return null; }); })
              .then(function (rows) {
                step(!!(rows && rows.length), 'Permiso de escritura (RLS UPDATE)', rows && rows.length ? '' : 'Supabase no dejó actualizar: revisá las políticas de lsl_state.');
                out.ok = out.steps.every(function (x) { return x.ok; }); return out;
              });
          }, function (e) { step(false, 'Sesión de administrador', e.message); out.ok = false; return out; });
        });
      }, function () {
        step(false, 'No se pudo conectar', 'Revisá la URL, tu internet o que el proyecto no esté pausado.'); return out;
      });
    }
  };
})(window);
