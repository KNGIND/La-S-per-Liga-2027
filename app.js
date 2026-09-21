/* La Súper Liga · app.js
   Arranque, navegación, tema/diseño, rendimiento, menú lateral, botón "atrás", sesión y eventos
   (delegados: un solo listener por tipo). */
(function (w) {
  'use strict';
  var LSL = w.LSL, S = LSL.store, U = LSL.u, T = LSL.t, UI = LSL.ui, P = LSL.prefs, VS = UI.vs, esc = U.esc, CFG = w.LSL_CONFIG || {};
  var doc = document, root = doc.documentElement;
  var $ = function (s) { return doc.querySelector(s); };
  var view, nav, styleEl, cur = 'home', scrolls = {}, pendingScroll = 0, pendingSheet = null;
  var TABS = [['home', 'Inicio', 'home'], ['league', 'Liga', 'trophy'], ['matches', 'Partidos', 'ball'], ['news', 'Noticias', 'news'], ['profile', 'Perfil', 'user']];
  var launch = root.getAttribute('data-launch') || 'fresh';
  function lite() { return root.getAttribute('data-perf') === 'lite'; }

  /* ---------- fondos de la página (los elige el admin) ---------- */
  var BGS = {
    navy: { bg: '#04101F', bg2: '#071A2E', card: '#0B1E33', card2: '#10283F', line: '#173653' },
    carbon: { bg: '#0B0C0F', bg2: '#121419', card: '#171A20', card2: '#1E222A', line: '#2A2F39' },
    violet: { bg: '#0D0A1F', bg2: '#140F2E', card: '#1A1440', card2: '#241C55', line: '#33296F' },
    forest: { bg: '#04140F', bg2: '#082018', card: '#0D2B21', card2: '#13382B', line: '#1C4A39' },
    wine: { bg: '#160609', bg2: '#210A10', card: '#2C1017', card2: '#3A1620', line: '#54202E' }
  };
  LSL.BGS = BGS;

  /* ---------- diseño / tema / rendimiento ---------- */
  function applyDesign() {
    var d = S.state.design, ac = d.accent || '#27C4C9', ac2 = d.accent2 || '#FFD226', b = BGS[d.bg] || BGS.navy;
    var css = ':root{--ac:' + ac + ';--ac2:' + ac2 + ';--on-ac:' + U.ink(ac) + ';--ac-soft:' + U.alpha(ac, 0.16) +
      ';--acg1:' + U.mix(ac, '#000000', 0.4) + ';--acg2:' + U.mix(U.hue(ac, 48), '#000000', 0.32) + ';--r:' + (+d.radius || 16) + 'px}' +
      ':root[data-theme=dark]{--bg:' + b.bg + ';--bg2:' + b.bg2 + ';--card:' + b.card + ';--card2:' + b.card2 + ';--line:' + b.line + ';--act:' + ac + ';--pts:' + ac2 + '}' +
      ':root[data-theme=light]{--act:' + U.mix(ac, '#000000', 0.42) + ';--pts:' + U.mix(ac2, '#000000', 0.55) + '}';
    styleEl.textContent = css;
    applyTheme(); applyPerf();
  }
  function applyTheme() {
    var m = (P.mode && P.mode !== 'auto') ? P.mode : (S.state.design.mode === 'light' ? 'light' : 'dark');
    root.setAttribute('data-theme', m);
    var mt = $('meta[name=theme-color]');
    if (mt) mt.setAttribute('content', m === 'light' ? '#EEF3F7' : (BGS[S.state.design.bg] || BGS.navy).bg);
  }
  function autoPerf() {
    if (LSL.probeLite) return 'lite';
    var n = navigator, mem = n.deviceMemory, cpu = n.hardwareConcurrency, con = n.connection;
    var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ((mem && mem <= 4) || (cpu && cpu <= 4) || reduce || (con && con.saveData)) return 'lite';
    return 'full';
  }
  function applyPerf() {
    var d = S.state.design.perf, p = (P.perf && P.perf !== 'auto') ? P.perf : (d && d !== 'auto' ? d : autoPerf());
    root.setAttribute('data-perf', p);
  }
  LSL.applyDesign = applyDesign;

  /* ---------- cabecera (menú + logo + estado) ---------- */
  function liveMatch() {
    var mm = S.state.matches, i;
    for (i = 0; i < mm.length; i++) if (mm[i].status === 'live' || mm[i].status === 'paused') return mm[i];
    return null;
  }
  function renderHeader() {
    var L = S.state.league, top = $('#top'), lm = liveMatch();
    doc.title = L.name || 'La Súper Liga';
    top.className = 'top' + (lm ? ' has-live' : '');
    top.innerHTML = '<button class="ib menu-btn" id="menu-btn" data-menu aria-label="Abrir menú" aria-haspopup="dialog">' + UI.ic('menu') + '</button>' +
      '<button class="logo" id="logo" data-secret aria-label="' + esc(L.name) + '">' +
      (L.logo ? '<img class="mark img" src="' + esc(L.logo) + '" alt="">' : '<span class="mark">' + esc((L.short || 'LSL').slice(0, 4)) + '</span>') +
      '<span class="brand">' + esc(L.name) + '</span></button><span class="sp"></span>' +
      (lm ? '<button class="livechip" data-match="' + esc(lm.id) + '"><i></i>En vivo</button>'
        : '<span class="season"><i></i>' + esc(String(L.season || '').replace(/^Temporada\s*/i, 'T')) + '</span>');
  }
  function renderBanner() {
    var b = S.state.banner, el = $('#banner');
    var seen = false; try { seen = sessionStorage.getItem('lsl:bn') === b.text; } catch (e) { }
    if (!b.active || !b.text || seen) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<span>' + esc(b.text) + '</span><button class="ib" data-act="bn-x" aria-label="Cerrar aviso">' + UI.ic('close') + '</button>';
  }

  /* ---------- navegación inferior ---------- */
  function visibleTabs() { var f = S.state.features; return TABS.filter(function (t) { return t[0] !== 'news' || f.news; }); }
  function buildNav() {
    var tabs = visibleTabs(), i = 0, pr = LSL.profile.get();
    tabs.forEach(function (t, k) { if (t[0] === cur) i = k; });
    nav.setAttribute('data-nav', S.state.design.nav || 'floating');
    nav.innerHTML = '<div class="nav-bar" style="--n:' + tabs.length + ';--i:' + i + '"><span class="nav-ind"></span>' + tabs.map(function (t) {
      var ico = (t[0] === 'profile' && pr && pr.photo) ? '<img class="nav-av" src="' + esc(pr.photo) + '" alt="">' : UI.ic(t[2]);
      return '<button class="nav-i' + (t[0] === 'matches' ? ' c' : '') + (t[0] === cur ? ' on' : '') + '" data-go="' + t[0] + '"' + (t[0] === cur ? ' aria-current="page"' : '') + '><span class="ico">' + ico + '</span><span class="lb">' + t[1] + '</span></button>';
    }).join('') + '</div>';
  }
  function setActive() {
    var tabs = visibleTabs(), bar = nav.firstChild, i = 0;
    tabs.forEach(function (t, k) { if (t[0] === cur) i = k; });
    bar.style.setProperty('--i', i);
    [].forEach.call(nav.querySelectorAll('.nav-i'), function (b) {
      var on = b.getAttribute('data-go') === cur; b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  /* Estilo píldora: al deslizar el dedo la píldora sigue al dedo, pero NO entra a ninguna
     sección hasta que soltás. */
  function initPillDrag() {
    var st = null, sup = 0;
    nav.addEventListener('pointerdown', function (e) {
      if (nav.getAttribute('data-nav') !== 'pill' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var bar = nav.firstChild; if (!bar) return;
      var r = bar.getBoundingClientRect(), n = visibleTabs().length;
      st = { id: e.pointerId, x0: e.clientX, bar: bar, left: r.left + 5, iw: (r.width - 10) / n, n: n, drag: false, hov: -1 };
    });
    nav.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      if (!st.drag) {
        if (Math.abs(e.clientX - st.x0) < 7) return;
        st.drag = true; st.bar.classList.add('dragging');
        try { nav.setPointerCapture(e.pointerId); } catch (x) { }
      }
      var px = Math.max(0, Math.min((st.n - 1) * st.iw, e.clientX - st.left - st.iw / 2));
      st.bar.style.setProperty('--px', px + 'px');
      var idx = Math.max(0, Math.min(st.n - 1, Math.floor((px + st.iw / 2) / st.iw)));
      if (idx !== st.hov) {
        st.hov = idx;
        [].forEach.call(st.bar.querySelectorAll('.nav-i'), function (b, i) { b.classList.toggle('hov', i === idx); });
        if (navigator.vibrate) { try { navigator.vibrate(6); } catch (x) { } }
      }
    });
    function end(e) {
      if (!st || e.pointerId !== st.id) return;
      var s = st; st = null;
      if (!s.drag) return;
      sup = Date.now() + 350;
      s.bar.classList.remove('dragging'); s.bar.style.removeProperty('--px');
      [].forEach.call(s.bar.querySelectorAll('.hov'), function (b) { b.classList.remove('hov'); });
      if (e.type === 'pointerup') { var t = visibleTabs()[s.hov]; if (t && t[0] !== cur) go(t[0]); }
    }
    nav.addEventListener('pointerup', end); nav.addEventListener('pointercancel', end);
    nav.addEventListener('click', function (e) { if (Date.now() < sup) { e.stopPropagation(); e.preventDefault(); } }, true);
  }

  /* ---------- render de pantallas ---------- */
  function render(anim) {
    var html = UI.views[cur]();
    view.innerHTML = html;
    if (anim) { view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); }
  }
  function go(tab, keepScroll) {
    if (tab === 'more') tab = 'profile';
    if (tab === 'news' && !S.state.features.news) tab = 'home';
    if (tab !== cur) { scrolls[cur] = w.pageYOffset; cur = tab; setActive(); render(true); w.scrollTo(0, scrolls[tab] || 0); }
    else if (!keepScroll) { render(false); w.scrollTo({ top: 0 }); }
    try { history.replaceState(history.state, '', '#/' + tab); } catch (e) { }
    saveSoon();
  }
  function rerender() { var y = w.pageYOffset; render(false); w.scrollTo(0, y); }
  LSL.go = go; LSL.rerender = rerender;
  LSL.curTab = function () { return cur; };

  /* ---------- sesión: al volver de segundo plano seguís donde estabas ---------- */
  var K_UI = 'lsl:ui';
  function saveUI() {
    try {
      LSL.ls.set(K_UI, {
        tab: cur, y: w.pageYOffset, t: Date.now(),
        vs: { seg: VS.seg, filter: VS.filter, lim: VS.lim, month: VS.month, day: VS.day, lseg: VS.lseg, full: VS.full, ncat: VS.ncat, cup: VS.cup, nsi: VS.nsi },
        sheet: UI.sh.open ? { type: UI.sh.type, id: UI.sh.id, tab: UI.sh.tab, side: UI.sh.side } : null
      });
    } catch (e) { }
  }
  var saveSoon = U.debounce(saveUI, 350);
  UI.onSheet = saveSoon;
  function restoreUI() {
    var o = LSL.ls.get(K_UI, null); if (!o) return;
    Object.keys(o.vs || {}).forEach(function (k) { if (o.vs[k] != null) VS[k] = o.vs[k]; });
    if (TABS.some(function (t) { return t[0] === o.tab; })) cur = o.tab;
    pendingScroll = +o.y || 0; pendingSheet = o.sheet || null;
  }

  /* ---------- capas y botón "atrás" de Android ----------
     Atrás: 1) cierra lo que esté abierto (ventanita, menú, tutorial…)
            2) si no hay nada que cerrar, avisa; con un segundo "atrás" se sale de la app. */
  var layers = [], armed = false, armT = 0;
  function pushBuf() { try { history.pushState({ lsl: 'buf' }, ''); } catch (e) { } }
  LSL.pushLayer = function (close) { layers.push(close); try { history.pushState({ lsl: 'layer' }, ''); } catch (e) { } };
  LSL.popLayer = function () { if (layers.length) history.back(); };
  function disarm() { if (!armed) return; armed = false; clearTimeout(armT); pushBuf(); }
  w.addEventListener('popstate', function () {
    if (armed) { history.back(); return; }                   // segundo "atrás": seguimos hacia atrás y se sale
    var c = layers.pop();
    if (c) { c(); return; }
    armed = true; UI.toast('Volvé a presionar atrás para salir', 2000);
    armT = setTimeout(function () { if (armed) { armed = false; pushBuf(); } }, 2000);
  });
  doc.addEventListener('pointerdown', disarm, true);

  /* ---------- menú lateral (hamburguesa) ---------- */
  var DR = { open: false, after: null };
  function drawerHTML() {
    var p = LSL.profile.get(), t = S.team(P.fav), L = S.state.league, ic = UI.ic;
    var perf = P.perf || 'auto', mode = P.mode || 'auto';
    var items = '';
    if (L.info) items += '<button data-act="about">' + ic('info') + 'Sobre la liga</button>';
    items += '<button data-act="rules">' + ic('book') + 'Reglamento</button>';
    if (S.state.features.sanctions) items += '<button data-act="sanc">' + ic('lock') + 'Sanciones</button>';
    items += '<button data-act="share">' + ic('share') + 'Compartir</button>';
    if (LSL.installEvt) items += '<button data-act="install">' + ic('download') + 'Instalar en el celular</button>';
    if (CFG.oneSignalAppId) items += '<button data-act="push">' + ic('bell') + 'Notificaciones</button>';
    items += '<button data-act="tour">' + ic('help') + 'Ver tutorial</button>';
    return '<div class="dr-scrim" data-dr-close></div><aside class="dr-p" role="dialog" aria-modal="true" aria-label="Menú">' +
      '<header class="dr-h"><button class="dr-me" data-drgo="profile">' + UI.avatar(p, 46) + '<span><b>' + esc(p ? p.name : 'Invitado') + '</b><small>' + esc(t ? t.name : 'Sin equipo') + '</small></span></button>' +
      '<button class="ib dr-x" data-dr-close aria-label="Cerrar menú">' + ic('close') + '</button></header>' +
      '<div class="dr-b"><section class="dr-c"><h3>Apariencia</h3>' + UI.seg([['auto', 'Del sitio'], ['dark', 'Oscuro'], ['light', 'Claro']], mode, 'pmode') + '</section>' +
      '<section class="dr-c" id="dr-perf"><h3>Rendimiento</h3><p class="mut sm">Ligero apaga animaciones y efectos para celulares de gama baja. Alto activa desenfoque, animaciones y el apilado de noticias.</p>' +
      UI.seg([['auto', 'Automático'], ['full', 'Alto'], ['lite', 'Ligero']], perf, 'pperf') + '<p class="mut sm dr-now">Ahora: <b>' + (lite() ? 'Ligero' : 'Alto') + '</b></p></section>' +
      '<nav class="dr-l">' + items + '</nav></div><footer class="dr-f">' + esc(L.name) + ' · v2.0</footer></aside>';
  }
  function renderDrawer() {
    var d = $('#drawer'); if (!d || !DR.open) return;
    var b = d.querySelector('.dr-b'), st = b ? b.scrollTop : 0;
    d.innerHTML = drawerHTML(); d.querySelector('.dr-b').scrollTop = st;
  }
  function openDrawer() {
    if (DR.open) return;
    var d = $('#drawer'); d.innerHTML = drawerHTML(); d.hidden = false; void d.offsetWidth;
    d.classList.add('on'); root.classList.add('lock'); DR.open = true;
    LSL.pushLayer(hideDrawer);
  }
  function hideDrawer() {
    var d = $('#drawer'); DR.open = false; d.classList.remove('on');
    if (!UI.sh.open) root.classList.remove('lock');
    setTimeout(function () { if (!DR.open) d.hidden = true; }, lite() ? 0 : 300);
    var cb = DR.after; DR.after = null; if (cb) cb();
  }
  function closeDrawer(cb) { if (!DR.open) { if (cb) cb(); return; } DR.after = cb || null; LSL.popLayer(); }
  LSL.openDrawer = openDrawer; LSL.closeDrawer = closeDrawer;
  function initDrawerSwipe() {
    var d = $('#drawer'), x0 = 0, y0 = 0, on = false;
    d.addEventListener('touchstart', function (e) { if (!e.target.closest('.dr-p')) return; on = true; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    d.addEventListener('touchend', function (e) {
      if (!on) return; on = false;
      var t = e.changedTouches[0]; if (x0 - t.clientX > 70 && Math.abs(t.clientY - y0) < 60) closeDrawer();
    }, { passive: true });
  }

  /* ---------- carga diferida: panel admin y perfil/tutorial ---------- */
  LSL.openAdmin = function () {
    if (LSL.admin) return LSL.admin.open();
    UI.toast('Abriendo panel…', 1200);
    var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/admin.css'; doc.head.appendChild(l);
    var s = doc.createElement('script'); s.src = 'js/admin.js';
    s.onload = function () { LSL.admin.open(); };
    s.onerror = function () { UI.toast('No se pudo cargar el panel. Revisá tu conexión.'); };
    doc.head.appendChild(s);
  };
  var obQ = null;
  LSL.loadOnboard = function (cb) {
    if (LSL.onboard) { if (cb) cb(); return; }
    if (obQ) { if (cb) obQ.push(cb); return; }
    obQ = cb ? [cb] : [];
    var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/onboard.css'; doc.head.appendChild(l);
    var s = doc.createElement('script'); s.src = 'js/onboard.js';
    s.onload = function () { var q = obQ; obQ = null; q.forEach(function (f) { f(); }); };
    s.onerror = function () { obQ = null; UI.toast('No se pudo cargar. Revisá tu conexión.'); };
    doc.head.appendChild(s);
  };

  /* ---------- notificaciones push (opcional, con OneSignal) ---------- */
  var pushP = null;
  LSL.push = {
    enable: function () {
      if (!CFG.oneSignalAppId) return;
      if (!pushP) {
        pushP = new Promise(function (res, rej) {
          w.OneSignalDeferred = w.OneSignalDeferred || [];
          var s = doc.createElement('script'); s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'; s.defer = true;
          s.onerror = function () { pushP = null; rej(new Error('carga')); };
          doc.head.appendChild(s);
          w.OneSignalDeferred.push(function (OS) {
            OS.init({ appId: CFG.oneSignalAppId, serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js', serviceWorkerParam: { scope: '/push/onesignal/' }, notifyButton: { enable: false } }).then(function () { res(OS); }, rej);
          });
        });
      }
      pushP.then(function (OS) {
        return OS.Notifications.requestPermission().then(function () {
          var p = LSL.profile.get(); if (p && p.team) OS.User.addTag('team', p.team);
          UI.toast('Notificaciones listas');
        });
      }).catch(function () { UI.toast('No se pudieron activar las notificaciones.'); });
    }
  };

  /* ---------- eventos ---------- */
  var taps = 0, tapT = 0;
  function onClick(e) {
    var t = e.target;
    if (t.closest('#admin-root') || t.closest('#ob-root') || t.closest('#tour-root')) return;
    var el;
    if ((el = t.closest('[data-copy]'))) {
      var v = el.getAttribute('data-copy');
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { UI.toast('Código copiado'); }, function () { UI.toast(v); });
      else UI.toast(v);
      return;
    }
    if (t.closest('#sheet')) return;
    if (t.closest('#drawer')) {
      if ((el = t.closest('[data-dr-close]'))) return closeDrawer();
      if ((el = t.closest('[data-drgo]'))) { var g = el.getAttribute('data-drgo'); return closeDrawer(function () { go(g); }); }
    }
    if ((el = t.closest('[data-menu]'))) return openDrawer();
    if ((el = t.closest('[data-secret]'))) {          // 7 toques seguidos al logo = acceso admin
      var now = Date.now(); taps = (now - tapT < 2500) ? taps + 1 : 1; tapT = now;
      if (taps >= 7) { taps = 0; LSL.openAdmin(); return; }
      if (el.id === 'logo' && cur !== 'home') go('home');
      else if (el.id === 'logo') w.scrollTo({ top: 0 });
      return;
    }
    if ((el = t.closest('[data-ob]'))) {
      var kind = el.getAttribute('data-ob');
      return LSL.loadOnboard(function () { if (kind === 'tour') LSL.onboard.tour(); else LSL.onboard.edit(kind); });
    }
    if ((el = t.closest('[data-match]'))) return UI.openSheet('match', el.getAttribute('data-match'));
    if ((el = t.closest('[data-news]'))) return UI.openSheet('news', el.getAttribute('data-news'));
    if ((el = t.closest('[data-go]'))) {
      var f = el.getAttribute('data-f');
      if (f) { VS.filter = f; VS.seg = 'list'; VS.lim = 20; }
      return go(el.getAttribute('data-go'));
    }
    if ((el = t.closest('[data-filter]'))) { VS.filter = el.getAttribute('data-filter'); VS.lim = 20; saveSoon(); return rerender(); }
    if ((el = t.closest('[data-ncat]'))) { VS.ncat = el.getAttribute('data-ncat'); saveSoon(); return rerender(); }
    if ((el = t.closest('[data-cupsel]'))) { VS.cup = el.getAttribute('data-cupsel'); saveSoon(); return rerender(); }
    if ((el = t.closest('[data-seg]'))) {
      var k = el.getAttribute('data-seg'), val = el.getAttribute('data-v');
      if (k === 'pmode') { P.mode = val; LSL.savePrefs(); applyTheme(); renderDrawer(); }
      else if (k === 'pperf') { P.perf = val; LSL.savePrefs(); LSL.probeLite = false; applyPerf(); renderDrawer(); }
      else VS[k] = val;
      saveSoon();
      return rerender();
    }
    if ((el = t.closest('[data-cal]'))) {
      var d = new Date(VS.month), n = new Date(d.getFullYear(), d.getMonth() + (+el.getAttribute('data-cal')), 1), today = new Date();
      VS.month = n.getTime();
      VS.day = (n.getFullYear() === today.getFullYear() && n.getMonth() === today.getMonth()) ? T.key(today.getTime()) : T.key(n.getTime());
      saveSoon(); return rerender();
    }
    if ((el = t.closest('[data-day]'))) { VS.day = el.getAttribute('data-day'); saveSoon(); return rerender(); }
    if ((el = t.closest('[data-act]'))) {
      var a = el.getAttribute('data-act');
      if (a === 'full') { VS.full = !VS.full; rerender(); }
      else if (a === 'more') { VS.lim += 20; rerender(); }
      else if (a === 'bn-x') { try { sessionStorage.setItem('lsl:bn', S.state.banner.text); } catch (x) { } renderBanner(); }
      else if (a === 'install' && LSL.installEvt) { LSL.installEvt.prompt(); LSL.installEvt = null; closeDrawer(); rerender(); }
      else if (a === 'share') {
        var data = { title: S.state.league.name, url: location.href.split('#')[0] };
        if (navigator.share) navigator.share(data).catch(function () { });
        else if (navigator.clipboard) navigator.clipboard.writeText(data.url).then(function () { UI.toast('Link copiado'); });
      }
      else if (a === 'about') closeDrawer(function () { UI.openSheet('about', ''); });
      else if (a === 'rules') closeDrawer(function () { VS.lseg = 'rules'; go('league'); });
      else if (a === 'sanc') closeDrawer(function () { VS.lseg = 'sanc'; go('league'); });
      else if (a === 'push') LSL.push.enable();
      else if (a === 'tour') closeDrawer(function () { LSL.loadOnboard(function () { LSL.onboard.tour(); }); });
    }
  }

  /* ---------- apilado de noticias: deslizá de costado para pasar de tarjeta ---------- */
  function initStack() {
    var st = null, sup = 0;
    doc.addEventListener('pointerdown', function (e) {
      var ns = e.target.closest && e.target.closest('.ns'); if (!ns) return;
      st = { ns: ns, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, drag: false, card: null };
    });
    doc.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      var dx = e.clientX - st.x0, dy = e.clientY - st.y0;
      if (!st.drag) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { st = null; return; }
        if (Math.abs(dx) < 8) return;
        st.drag = true; st.card = st.ns.querySelector('.ns-i[data-o="0"]'); st.ns.classList.add('drag');
        try { st.ns.setPointerCapture(e.pointerId); } catch (x) { }
      }
      st.dx = dx;
      if (st.card) st.card.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 24) + 'deg)';
    });
    function end(e) {
      if (!st || e.pointerId !== st.id) return;
      var s = st; st = null;
      if (!s.drag) return;
      sup = Date.now() + 350;
      s.ns.classList.remove('drag');
      if (s.card) s.card.style.transform = '';
      if (e.type === 'pointerup' && Math.abs(s.dx) > 64) {
        var N = s.ns.querySelectorAll('.ns-i').length;
        VS.nsi = (VS.nsi + (s.dx < 0 ? 1 : -1) + N) % N;
        UI.stackApply(s.ns);
        if (navigator.vibrate) { try { navigator.vibrate(6); } catch (x) { } }
        saveSoon();
      }
    }
    doc.addEventListener('pointerup', end); doc.addEventListener('pointercancel', end);
    doc.addEventListener('click', function (e) { if (Date.now() < sup && e.target.closest && e.target.closest('.ns')) { e.stopPropagation(); e.preventDefault(); } }, true);
  }

  /* ---------- cuenta regresiva del partido destacado ---------- */
  function tickCountdown() {
    if (doc.hidden || cur !== 'home') return;
    [].forEach.call(doc.querySelectorAll('[data-cd]'), function (el) { el.textContent = T.inLabel(+el.getAttribute('data-cd')); });
  }

  /* ---------- sondeo de rendimiento: si va trabado, pasa a modo ligero ---------- */
  function probe() {
    if (doc.hidden || lite()) return;
    if ((P.perf && P.perf !== 'auto') || (S.state.design.perf && S.state.design.perf !== 'auto')) return;
    var n = 0, slow = 0, last = 0;
    function f(t) {
      if (last) { n++; if (t - last > 50) slow++; }
      last = t;
      if (n < 45) return requestAnimationFrame(f);
      if (slow / n > 0.3) { LSL.probeLite = true; applyPerf(); rerender(); renderDrawer(); UI.toast('Modo ligero activado para que todo vaya más fluido.', 3200); }
    }
    requestAnimationFrame(f);
  }

  /* ---------- bienvenida (CADA VEZ que se abre la app) y perfil ---------- */
  function afterSplash() {
    var p = LSL.profile.get();
    if (!p) return LSL.loadOnboard(function () { LSL.onboard.start(); });
    if (p.team && !S.team(p.team) && S.state.teams.length) return LSL.loadOnboard(function () { LSL.onboard.edit('team'); });   // el admin borró tu equipo
    if (!p.tour) LSL.loadOnboard(function () { LSL.onboard.tour(true); });
  }
  function runSplash() {
    var el = $('#splash'), L = S.state.league, p = LSL.profile.get();
    if (!el) return afterSplash();
    if (launch !== 'fresh') { el.remove(); return afterSplash(); }
    var lg = $('#sp-logo');
    lg.innerHTML = L.logo ? '<img class="mark img" src="' + esc(L.logo) + '" alt="">' : '<span class="mark">' + esc((L.short || 'LSL').slice(0, 4)) + '</span>';
    $('#sp-name').innerHTML = String(L.name || 'La Súper Liga').split(/\s+/).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join(' ');
    $('#sp-hi').textContent = p ? '¡Hola de nuevo, ' + p.name + '!' : 'Bienvenido';
    if (!p) LSL.loadOnboard();          // lo vamos bajando mientras se ve la bienvenida
    requestAnimationFrame(function () { el.classList.add('go'); });
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); afterSplash(); }, lite() ? 0 : 420);
    }, lite() ? 900 : 1900);
  }
  LSL.afterProfile = function () { buildNav(); renderHeader(); renderDrawer(); rerender(); };

  /* ---------- arranque ---------- */
  function onData() {
    applyDesign(); renderHeader(); renderBanner(); buildNav(); renderDrawer();
    if (!S.state.features.news && cur === 'news') cur = 'home';
    if (!LSL.adminOpen) { rerender(); if (UI.sh.open) UI.renderSheet(); }
  }
  LSL.refreshView = onData;

  function routeOf(hash) { var x = (hash || '').replace(/^#\/?/, ''); return x === 'more' ? 'profile' : x; }

  function boot() {
    view = $('#view'); nav = $('#nav');
    styleEl = doc.createElement('style'); doc.head.appendChild(styleEl);
    S.init();
    var h = routeOf(location.hash);
    if (launch === 'resume') restoreUI();
    else if (TABS.some(function (t) { return t[0] === h; })) cur = h;
    if (cur === 'news' && !S.state.features.news) cur = 'home';
    try { history.replaceState({ lsl: 'base' }, ''); } catch (e) { }
    pushBuf();
    applyDesign(); renderHeader(); renderBanner(); buildNav(); UI.initSheet(); render(true);
    try { history.replaceState(history.state, '', '#/' + cur); } catch (e) { }
    if (pendingScroll) w.scrollTo(0, pendingScroll);
    if (pendingSheet) {
      UI.openSheet(pendingSheet.type, pendingSheet.id);
      if (pendingSheet.tab) UI.sh.tab = pendingSheet.tab;
      if (pendingSheet.side) UI.sh.side = pendingSheet.side;
      UI.renderSheet();
    }
    doc.addEventListener('click', onClick);
    initPillDrag(); initStack(); initDrawerSwipe();
    S.on('change', function () { requestAnimationFrame(onData); });
    if (h === 'admin') LSL.openAdmin();
    w.addEventListener('hashchange', function () {
      var x = routeOf(location.hash);
      if (x === 'admin') LSL.openAdmin(); else if (x !== cur && TABS.some(function (t) { return t[0] === x; })) go(x);
    });
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) saveUI(); else tickCountdown(); });
    w.addEventListener('pagehide', saveUI);
    w.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); LSL.installEvt = e; if (cur === 'profile') rerender(); });
    var st = 0; w.addEventListener('scroll', function () { if (!st) st = setTimeout(function () { st = 0; saveUI(); }, 600); }, { passive: true });
    setInterval(tickCountdown, 30000);
    S.startPolling();
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      w.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
    }
    w.addEventListener('load', function () { setTimeout(probe, 600); });
    runSplash();
  }
  boot();
})(window);
