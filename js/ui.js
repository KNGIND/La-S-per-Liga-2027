/* La Súper Liga · ui.js
   Construye el HTML de cada pantalla (strings + un solo innerHTML por render: rápido y liviano). */
(function (w) {
  'use strict';
  var LSL = w.LSL, S = LSL.store, U = LSL.u, T = LSL.t, esc = U.esc, P = LSL.prefs;
  var UI = LSL.ui = {};
  var VS = UI.vs = { seg: 'list', filter: 'all', lim: 20, month: null, day: null, lseg: 'table', full: false, ncat: '', cup: '', nsi: 0 };
  var V = UI.views = {};

  /* ---------- piezas base ---------- */
  function ic(n, c) { return '<svg class="ic' + (c ? ' ' + c : '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  UI.ic = ic;
  function isLive(m) { return m.status === 'live' || m.status === 'paused'; }
  function fav() { return P.fav && S.team(P.fav) ? P.fav : ''; }

  function crest(t, s) {
    s = s || 'm';
    if (!t) return '<span class="crest ' + s + '"><b>?</b></span>';
    if (t.logo) return '<img class="crest ' + s + '" src="' + esc(t.logo) + '" alt="" loading="lazy" decoding="async">';
    var c1 = U.hexOr(t.color, '#27C4C9'), c2 = U.hexOr(t.color2, c1);
    return '<span class="crest ' + s + '" style="--c1:' + esc(c1) + ';--c2:' + esc(c2) + ';color:' + U.ink(c1) + '"><b>' + esc((t.short || t.name || '?').slice(0, s === 's' ? 1 : 3)) + '</b></span>';
  }
  UI.crest = crest;

  function avatar(p, size) {
    size = size || 40;
    var st = ' style="--s:' + size + 'px"';
    if (p && p.photo) return '<img class="av"' + st + ' src="' + esc(p.photo) + '" alt="">';
    return '<span class="av"' + st + '>' + esc(((p && p.name) || '?').trim().charAt(0).toUpperCase()) + '</span>';
  }
  UI.avatar = avatar;

  function tint(h, a) {
    var c1 = U.hexOr(h && h.color, '#27C4C9'), c2 = U.hexOr(a && a.color, '#FFD226');
    return '--c1:' + esc(c1) + ';--c2:' + esc(c2);
  }
  function compLabel(m) {
    if (m.comp === 'copa') return (m.cup || 'Copa') + (m.round ? ' · ' + m.round : '');
    if (m.comp === 'amistoso') return 'Amistoso' + (m.round ? ' · ' + m.round : '');
    return 'Liga' + (m.round ? ' · ' + m.round : '');
  }
  UI.compLabel = compLabel;
  function statusText(m) {
    if (m.status === 'live') return m.minute ? String(m.minute).replace(/'$/, '') + "'" : 'En vivo';
    if (m.status === 'paused') return 'Descanso';
    if (m.status === 'finished') return m.pens ? 'Final · pen. ' + m.pens : 'Final';
    return '';
  }
  function seg(items, cur, key) {
    return '<div class="seg" role="tablist">' + items.map(function (i) {
      return '<button role="tab" aria-selected="' + (i[0] === cur) + '" class="' + (i[0] === cur ? 'on' : '') + '" data-seg="' + key + '" data-v="' + i[0] + '">' + esc(i[1]) + '</button>';
    }).join('') + '</div>';
  }
  UI.seg = seg;
  function segChips(items, cur, key) {
    return '<div class="chips" role="tablist">' + items.map(function (i) {
      return '<button role="tab" aria-selected="' + (i[0] === cur) + '" class="' + (i[0] === cur ? 'on' : '') + '" data-seg="' + key + '" data-v="' + i[0] + '">' + esc(i[1]) + '</button>';
    }).join('') + '</div>';
  }
  function empty(t, s) { return '<div class="empty"><b>' + esc(t) + '</b>' + (s ? '<span>' + esc(s) + '</span>' : '') + '</div>'; }
  function sec(title, link, go, body, f) {
    return '<section class="blk"><div class="sh"><h2>' + esc(title) + '</h2>' +
      (link ? '<button class="lnk" data-go="' + go + '"' + (f ? ' data-f="' + f + '"' : '') + '>' + esc(link) + ic('chev-r') + '</button>' : '') + '</div>' + body + '</section>';
  }

  /* ---------- tarjeta de partido (poco a la vista, todo al tocar) ---------- */
  function matchCard(m) {
    var h = S.team(m.home), a = S.team(m.away), ch = S.channel(m.channel), ts = T.ts(m.date), live = isLive(m), f = fav();
    var mid;
    if (m.status === 'upcoming') mid = '<span class="mt">' + T.time(ts) + '</span><span class="ms">' + T.rel(ts) + '</span>';
    else mid = '<span class="sc"><b>' + (+m.hs || 0) + '</b><i></i><b>' + (+m.as || 0) + '</b></span><span class="ms' + (live ? ' lv' : '') + '">' + statusText(m) + '</span>';
    var mine = f && (m.home === f || m.away === f);
    return '<button class="mc' + (live ? ' is-live' : '') + (mine ? ' mine' : '') + '" data-match="' + esc(m.id) + '" style="' + tint(h, a) + '">' +
      '<span class="mc-top"><span class="chip comp-' + esc(m.comp) + '">' + esc(compLabel(m)) + '</span>' +
      (live ? '<span class="live"><i></i>En vivo</span>' : '') + '<span class="sp"></span>' +
      (S.state.features.channels && ch && ch.logo ? '<img class="tv" src="' + esc(ch.logo) + '" alt="' + esc(ch.name) + '" loading="lazy" decoding="async">' : '') + '</span>' +
      '<span class="mc-row"><span class="tm">' + crest(h, 'm') + '<span class="nm">' + esc(h ? h.name : 'Equipo') + '</span></span>' +
      '<span class="mid">' + mid + '</span>' +
      '<span class="tm">' + crest(a, 'm') + '<span class="nm">' + esc(a ? a.name : 'Equipo') + '</span></span></span></button>';
  }

  /* ---------- hero del inicio ---------- */
  function heroMatch() {
    var mm = S.sorted(), i, now = Date.now();
    var live = mm.filter(isLive); if (live.length) return live[0];
    var up = mm.filter(function (m) { return m.status === 'upcoming'; });
    if (up.length) return up[0];
    var fin = mm.filter(function (m) { return m.status === 'finished'; });
    return fin.length ? fin[fin.length - 1] : null;
  }
  function hero(m) {
    if (!m) return '';
    var h = S.team(m.home), a = S.team(m.away), ch = S.channel(m.channel), ts = T.ts(m.date), live = isLive(m), up = m.status === 'upcoming';
    var tag = live ? 'En vivo ahora' : up ? 'Próximo partido' : 'Último resultado';
    var mid = up
      ? '<span class="hm-t">' + T.time(ts) + '</span><span class="hm-s">' + T.rel(ts) + '</span>' + '<span class="hm-c" data-cd="' + ts + '">' + esc(T.inLabel(ts)) + '</span>'
      : '<span class="hm-sc"><b>' + (+m.hs || 0) + '</b><i></i><b>' + (+m.as || 0) + '</b></span><span class="hm-s' + (live ? ' lv' : '') + '">' + statusText(m) + '</span>';
    return '<button class="hero" data-match="' + esc(m.id) + '" style="' + tint(h, a) + '">' +
      '<span class="hero-tag">' + (live ? '<span class="live"><i></i>' + tag + '</span>' : esc(tag)) + '</span>' +
      '<span class="hero-row"><span class="tm">' + crest(h, 'l') + '<span class="hn">' + esc(h ? h.name : 'Equipo') + '</span></span>' +
      '<span class="hero-mid">' + mid + '</span>' +
      '<span class="tm">' + crest(a, 'l') + '<span class="hn">' + esc(a ? a.name : 'Equipo') + '</span></span></span>' +
      '<span class="hero-foot"><span>' + esc(compLabel(m)) + '</span>' +
      (S.state.features.channels && ch ? '<span class="hf-ch">' + (ch.logo ? '<img src="' + esc(ch.logo) + '" alt="" decoding="async">' : ic('tv')) + esc(ch.name) + '</span>' : '') + '</span></button>';
  }

  /* ---------- tabla ---------- */
  function table(rows, o) {
    o = o || {};
    var L = S.state.league, full = !!o.full, zt = +L.zoneTop || 0, zb = +L.zoneBottom || 0, n = rows.length, f = fav();
    var h = '<div class="tw"><table class="tb' + (full ? ' full' : '') + '"><thead><tr><th class="t">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th>' +
      (full ? '<th>GF</th><th>GC</th>' : '') + '<th>DG</th>' + (full ? '<th>Forma</th>' : '') + '<th>Pts</th></tr></thead><tbody>';
    rows.forEach(function (r, i) {
      var t = S.team(r.id) || { name: '?' };
      var z = i < zt ? ' z1' : (zb && i >= n - zb ? ' z2' : '');
      h += '<tr class="' + (z + (f && r.id === f ? ' mine' : '')).trim() + '"><td class="t"><div><span class="pos">' + (i + 1) + '</span>' + crest(t, 's') + '<span class="tn">' + esc(t.name) + '</span></div></td>' +
        '<td>' + r.pj + '</td><td>' + r.g + '</td><td>' + r.e + '</td><td>' + r.p + '</td>' +
        (full ? '<td>' + r.gf + '</td><td>' + r.gc + '</td>' : '') +
        '<td>' + (r.dg > 0 ? '+' : '') + r.dg + '</td>' +
        (full ? '<td><span class="fm">' + r.form.map(function (x) { return '<i class="f-' + x + '"></i>'; }).join('') + '</span></td>' : '') +
        '<td class="p">' + r.pts + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  /* ---------- listas de partidos ---------- */
  function groupByDay(arr) {
    var out = [], last = '';
    arr.forEach(function (m) {
      var ts = T.ts(m.date), k = T.key(ts);
      if (k !== last) { out.push({ ts: ts, items: [] }); last = k; }
      out[out.length - 1].items.push(m);
    });
    return out;
  }
  function grp(title, sub, items) {
    return '<section class="grp"><h3 class="dh">' + esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</h3><div class="stack">' + items.map(matchCard).join('') + '</div></section>';
  }
  function dayGroups(arr) {
    return groupByDay(arr).map(function (g) { var r = T.rel(g.ts); return grp(r, r === T.short(g.ts) ? '' : T.dm(g.ts), g.items); }).join('');
  }
  function passFilter(m) {
    var f = VS.filter, fv = fav();
    if (f === 'all') return true;
    if (f === 'live') return isLive(m);
    if (f === 'up') return m.status === 'upcoming';
    if (f === 'fin') return m.status === 'finished';
    if (f === 'mine') return fv && (m.home === fv || m.away === fv);
    return m.comp === f;
  }
  function chips(items, cur, attr) {
    return '<div class="chips" role="tablist">' + items.map(function (i) {
      return '<button class="' + (i[0] === cur ? 'on' : '') + '" ' + attr + '="' + esc(i[0]) + '">' + esc(i[1]) + (i[2] ? '<em>' + i[2] + '</em>' : '') + '</button>';
    }).join('') + '</div>';
  }

  function calendar() {
    var now = new Date();
    if (!VS.month) VS.month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    if (!VS.day) VS.day = T.key(now.getTime());
    var first = new Date(VS.month), y = first.getFullYear(), mo = first.getMonth();
    var start = new Date(y, mo, 1 - ((first.getDay() + 6) % 7)); // semana desde lunes
    var by = S.byDay(), today = T.key(now.getTime()), h = '';
    h += '<div class="cal"><div class="cal-h"><button class="ib" data-cal="-1" aria-label="Mes anterior">' + ic('chev-l') + '</button><b>' + T.ML[mo] + ' ' + y + '</b><button class="ib" data-cal="1" aria-label="Mes siguiente">' + ic('chev-r') + '</button></div><div class="cal-g">';
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(function (d) { h += '<span class="cal-w">' + d + '</span>'; });
    var nCells = ((first.getDay() + 6) % 7 + new Date(y, mo + 1, 0).getDate()) > 35 ? 42 : 35;
    for (var i = 0; i < nCells; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), k = T.key(d.getTime()), ms = by[k] || [];
      var cls = 'cd' + (d.getMonth() !== mo ? ' o' : '') + (k === today ? ' td' : '') + (k === VS.day ? ' sel' : '');
      var dots = '', seen = {};
      ms.forEach(function (m) { if (!seen[m.comp] && dots.length < 60) { seen[m.comp] = 1; dots += '<i class="c-' + esc(m.comp) + (isLive(m) ? ' lv' : '') + '"></i>'; } });
      h += '<button class="' + cls + '" data-day="' + k + '" aria-label="' + d.getDate() + (ms.length ? ', ' + ms.length + ' partido' + (ms.length > 1 ? 's' : '') : '') + '"><span>' + d.getDate() + '</span><span class="dots">' + dots + '</span></button>';
    }
    h += '</div><div class="cal-lg"><span><i class="c-liga"></i>Liga</span><span><i class="c-copa"></i>Copa</span><span><i class="c-amistoso"></i>Amistoso</span></div></div>';
    var sel = (by[VS.day] || []);
    var dt = VS.day.split('-'), dts = new Date(+dt[0], +dt[1] - 1, +dt[2]).getTime();
    h += '<h3 class="dh">' + esc(T.long(dts)) + '</h3>';
    h += sel.length ? '<div class="stack">' + sel.map(matchCard).join('') + '</div>' : empty('Sin partidos este día', 'Tocá otro día marcado con puntos.');
    return h;
  }

  /* ---------- copas: cuadro de eliminatorias ---------- */
  function roundInfo(name) {
    var base = String(name || '').replace(/\s*[·\-–]\s*(ida|vuelta|partido\s*\d+)\s*$/i, '').trim() || 'Ronda', l = base.toLowerCase(), rank = 0;
    if (/semi/.test(l)) rank = 3; else if (/cuart/.test(l)) rank = 2; else if (/octav/.test(l)) rank = 1; else if (/tercer|3er/.test(l)) rank = 4; else if (/final/.test(l)) rank = 5;
    return { key: l, label: base, rank: rank };
  }
  function parseSc(x) { var m = /(\d+)\s*[-–:]\s*(\d+)/.exec(String(x || '')); return m ? [+m[1], +m[2]] : null; }
  function buildTie(legs) {
    legs.sort(function (a, b) { return T.ts(a.date) - T.ts(b.date); });
    var A = legs[0].home, B = legs[0].away, ga = 0, gb = 0, done = true, live = false, any = false, last = legs[legs.length - 1], open = null;
    legs.forEach(function (m) {
      if (m.status !== 'finished') done = false;
      if (isLive(m)) { live = true; open = m; }
      if (m.status === 'upcoming') { if (!open) open = m; return; }
      any = true;
      var hs = +m.hs || 0, as = +m.as || 0;
      if (m.home === A) { ga += hs; gb += as; } else { ga += as; gb += hs; }
    });
    var f = legs.length === 1 && legs[0].leg2 ? parseSc(legs[0].firstLeg) : null;
    if (f) { ga += f[1]; gb += f[0]; any = true; }       // la ida no está cargada como partido: sale del texto "2-1"
    var win = null, pa = null, pb = null, pn = parseSc(last.pens);
    if (pn) { pa = last.home === A ? pn[0] : pn[1]; pb = last.home === A ? pn[1] : pn[0]; }
    if (done) win = ga > gb ? A : gb > ga ? B : (pn ? (pa > pb ? A : pb > pa ? B : null) : null);
    return { a: A, b: B, ga: any ? ga : null, gb: any ? gb : null, done: done, live: live, win: win, legs: legs, ts: T.ts(legs[0].date), pa: pa, pb: pb, open: (open || last).id };
  }
  function cupData(name) {
    var ms = S.state.matches.filter(function (m) { return m.comp === 'copa' && (m.cup || 'Copa') === name; }), byR = {}, latest = 0;
    ms.forEach(function (m) {
      var ri = roundInfo(m.round), r = byR[ri.key] || (byR[ri.key] = { label: ri.label, rank: ri.rank, pairs: {} }), pk = [m.home, m.away].sort().join('|');
      (r.pairs[pk] = r.pairs[pk] || []).push(m);
      latest = Math.max(latest, T.ts(m.date));
    });
    var rounds = Object.keys(byR).map(function (k) {
      var r = byR[k];
      r.ties = Object.keys(r.pairs).map(function (pk) { return buildTie(r.pairs[pk]); });
      r.ts = Math.min.apply(null, r.ties.map(function (t) { return t.ts; }));
      return r;
    }).sort(function (a, b) { return (a.rank - b.rank) || (a.ts - b.ts); });
    rounds.forEach(function (r, i) {                      // cada llave queda junto a la de la ronda anterior
      if (!i) { r.ties.sort(function (x, y) { return x.ts - y.ts; }); return; }
      var pos = {}; rounds[i - 1].ties.forEach(function (t, k) { pos[t.a] = k; pos[t.b] = k; });
      r.ties.forEach(function (t) { t.k = Math.min(pos[t.a] == null ? 99 : pos[t.a], pos[t.b] == null ? 99 : pos[t.b]); });
      r.ties.sort(function (x, y) { return (x.k - y.k) || (x.ts - y.ts); });
    });
    var lastR = rounds[rounds.length - 1];
    if (lastR && lastR.rank !== 5 && lastR.ties.length > 1) {   // camino que falta hasta la final
      var prev = lastR;
      while (prev.ties.length > 1 && prev.ties.length % 2 === 0) {
        var ties = [];
        for (var j = 0; j < prev.ties.length; j += 2) ties.push({ a: prev.ties[j].win || '', b: prev.ties[j + 1].win || '', ga: null, gb: null, legs: [], done: false, win: null, ph: true });
        prev = { label: ties.length === 1 ? 'Final' : ties.length === 2 ? 'Semifinales' : ties.length === 4 ? 'Cuartos de final' : 'Siguiente ronda', rank: 9, ties: ties, ph: true };
        rounds.push(prev);
      }
    }
    var fin = rounds.filter(function (r) { return r.rank === 5 && r.ties.length === 1; })[0], champ = fin && fin.ties[0].done ? fin.ties[0].win : null;
    return { name: name, rounds: rounds, champ: champ, ts: latest };
  }
  function cupList() {
    var seen = {}, out = [];
    S.state.matches.forEach(function (m) { if (m.comp === 'copa') { var n = m.cup || 'Copa'; if (!seen[n]) { seen[n] = 1; out.push(cupData(n)); } } });
    return out.sort(function (a, b) { return (a.champ ? 1 : 0) - (b.champ ? 1 : 0) || b.ts - a.ts; });
  }
  function tieHTML(t) {
    var A = S.team(t.a), B = S.team(t.b), dec = t.done && t.win;
    function row(team, id, g) {
      return '<span class="tr' + (dec ? (t.win === id ? ' w' : ' l') : '') + '">' + crest(team, 's') + '<span class="tn2">' + esc(team ? team.name : 'Por definir') + '</span><b>' + (g == null ? '' : g) + '</b></span>';
    }
    var sub = '';
    if (t.legs.length > 1) {
      sub = t.legs.map(function (m, i) {
        var lb = i === 0 ? 'Ida' : i === t.legs.length - 1 ? 'Vuelta' : 'Partido ' + (i + 1);
        if (m.status === 'upcoming') return lb + ' ' + T.dm(T.ts(m.date));
        return lb + ' ' + (m.home === t.a ? (+m.hs || 0) + '-' + (+m.as || 0) : (+m.as || 0) + '-' + (+m.hs || 0));
      }).join(' · ');
    } else if (t.legs.length === 1) {
      var m = t.legs[0]; sub = m.status === 'upcoming' ? T.dm(T.ts(m.date)) + ' · ' + T.time(T.ts(m.date)) : isLive(m) ? 'En vivo' : '';
    } else sub = 'Por definir';
    if (t.pa != null) sub += (sub ? ' · ' : '') + 'pen. ' + t.pa + '-' + t.pb;
    var body = row(A, t.a, t.ga) + row(B, t.b, t.gb) + (sub ? '<small>' + esc(sub) + '</small>' : '');
    return t.legs.length ? '<button class="tie' + (t.live ? ' live' : '') + '" data-match="' + esc(t.open) + '">' + body + '</button>' : '<div class="tie ph">' + body + '</div>';
  }
  function bracket(cup) {
    var rs = cup.rounds;
    return '<div class="bk-w"><div class="bk">' + rs.map(function (r, ri) {
      var pairs = ri < rs.length - 1 && r.ties.length > 1 && r.ties.length % 2 === 0, body = '';
      if (pairs) for (var i = 0; i < r.ties.length; i += 2) body += '<div class="bpair">' + tieHTML(r.ties[i]) + tieHTML(r.ties[i + 1]) + '</div>';
      else body = r.ties.map(tieHTML).join('');
      return '<div class="bcol"><h4>' + esc(r.label) + '</h4><div class="bl">' + body + '</div></div>';
    }).join('') + '</div></div>';
  }
  function cupsView(cups) {
    var sel = cups.filter(function (c) { return c.name === VS.cup; })[0] || cups[0], h = '';
    VS.cup = sel.name;
    if (cups.length > 1) h += chips(cups.map(function (c) { return [c.name, c.name]; }), sel.name, 'data-cupsel');
    h += '<div class="cup-h">' + ic('trophy') + '<b>' + esc(sel.name) + '</b><span class="chip">' + (sel.champ ? 'Finalizada' : 'En juego') + '</span></div>';
    if (sel.champ) { var ct = S.team(sel.champ); h += '<div class="champ">' + crest(ct, 'l') + '<span><small>Campeón</small><b>' + esc(ct ? ct.name : '') + '</b></span></div>'; }
    return h + bracket(sel);
  }

  /* ---------- apilado de noticias (solo rendimiento Alto) ---------- */
  function stackO(i, act, N) { var r = (i - act + N) % N; return r === 0 ? '0' : r === 1 ? '1' : r === 2 ? '2' : r === N - 1 ? 'p' : 'h'; }
  UI.stackApply = function (ns) {
    var cards = ns.querySelectorAll('.ns-i'), N = cards.length, act = VS.nsi;
    [].forEach.call(cards, function (c, i) { c.setAttribute('data-o', stackO(i, act, N)); });
    [].forEach.call(ns.querySelectorAll('.ns-d i'), function (d, i) { d.classList.toggle('on', i === act); });
  };
  function newsStack(list) {
    var n = list.slice(0, 5), N = n.length;
    if (N < 2) return '<div class="stack">' + n.map(newsRow).join('') + '</div>';
    var act = Math.min(VS.nsi || 0, N - 1), h = '<div class="ns">';
    VS.nsi = act;
    n.forEach(function (x, i) {
      h += '<button class="ns-i" data-o="' + stackO(i, act, N) + '" data-news="' + esc(x.id) + '" aria-label="' + esc(x.title) + '">' +
        (x.img ? '<img class="ns-im" src="' + esc(x.img) + '" alt="" loading="lazy" decoding="async">' : '<span class="ns-im ph"></span>') +
        '<span class="ns-t"><span class="nw-c">' + esc(x.cat) + ' · ' + T.rel(T.ts(x.date)) + '</span><b>' + esc(x.title) + '</b></span></button>';
    });
    return h + '<div class="ns-d">' + n.map(function (x, i) { return '<i' + (i === act ? ' class="on"' : '') + '></i>'; }).join('') + '</div></div>';
  }

  /* ---------- pantallas ---------- */
  V.home = function () {
    var st = S.state, mm = S.sorted(), hm = heroMatch(), h = '';
    if (!mm.length) h += empty('Todavía no hay partidos', 'Cuando se cargue el primero, aparece acá.');
    h += hero(hm);
    var rest = function (fn) { return mm.filter(function (m) { return (!hm || m.id !== hm.id) && fn(m); }); };
    var live = rest(isLive);
    if (live.length) h += sec('En vivo', '', '', '<div class="stack">' + live.map(matchCard).join('') + '</div>');
    var up = rest(function (m) { return m.status === 'upcoming'; }).slice(0, 3);
    if (up.length) h += sec('Próximos partidos', 'Ver todos', 'matches', '<div class="stack">' + up.map(matchCard).join('') + '</div>', 'up');
    var fin = rest(function (m) { return m.status === 'finished'; }).reverse().slice(0, 3);
    if (fin.length) h += sec('Últimos resultados', 'Ver todos', 'matches', '<div class="stack">' + fin.map(matchCard).join('') + '</div>', 'fin');
    var rows = S.standings();
    if (rows.length) h += sec('Tabla', 'Completa', 'league', table(rows.slice(0, 5)));
    if (st.features.news && st.news.length) {
      var ns = st.news.slice().sort(function (a, b) { return T.ts(b.date) - T.ts(a.date); });
      var hi = document.documentElement.getAttribute('data-perf') === 'full';
      h += sec('Noticias', 'Ver todas', 'news', hi ? newsStack(ns) : '<div class="stack">' + ns.slice(0, 2).map(newsRow).join('') + '</div>');
    }
    return h;
  };

  V.matches = function () {
    var f = S.state.features, fv = fav(), all = S.sorted(), h = '<h1 class="h">Partidos</h1>';
    if (f.calendar) h += seg([['list', 'Lista'], ['cal', 'Calendario']], VS.seg, 'seg');
    else VS.seg = 'list';
    var nLive = all.filter(isLive).length;
    var items = [['all', 'Todos'], ['live', 'En vivo', nLive || ''], ['up', 'Próximos'], ['fin', 'Finalizados'], ['liga', 'Liga'], ['copa', 'Copa'], ['amistoso', 'Amistoso']];
    if (fv) items.push(['mine', 'Mi equipo']);
    else if (VS.filter === 'mine') VS.filter = 'all';
    if (VS.seg === 'cal') return h + calendar();
    h += chips(items, VS.filter, 'data-filter');
    var arr = all.filter(passFilter);
    if (!arr.length) return h + empty('No hay partidos para mostrar', 'Probá con otro filtro.');
    var live = arr.filter(isLive), up = arr.filter(function (m) { return m.status === 'upcoming'; }), fin = arr.filter(function (m) { return m.status === 'finished'; }).reverse();
    var showSec = VS.filter === 'all', more = '';
    if (fin.length > VS.lim) { more = '<button class="btn ghost more" data-act="more">Ver más resultados</button>'; fin = fin.slice(0, VS.lim); }
    if (live.length) h += (showSec ? '<h2 class="sh2">En vivo</h2>' : '') + '<div class="stack">' + live.map(matchCard).join('') + '</div>';
    if (up.length) h += (showSec ? '<h2 class="sh2">Próximos</h2>' : '') + dayGroups(up);
    if (fin.length) h += (showSec ? '<h2 class="sh2">Resultados</h2>' : '') + dayGroups(fin) + more;
    return h;
  };

  V.league = function () {
    var st = S.state, L = st.league, f = st.features, segs = [['table', 'Posiciones']], cups = cupList();
    if (cups.length) segs.push(['cups', 'Copas']);
    if (f.sanctions) segs.push(['sanc', 'Sanciones']);
    segs.push(['rules', 'Reglamento']);
    if (!segs.some(function (s) { return s[0] === VS.lseg; })) VS.lseg = 'table';
    var h = '<h1 class="h">Liga</h1><p class="sub">' + esc(L.season) + ' · ' + esc(L.seasonStatus) + '</p>' + segChips(segs, VS.lseg, 'lseg');
    if (VS.lseg === 'table') {
      var rows = S.standings();
      if (!rows.length) return h + empty('Sin equipos todavía', 'La tabla se arma sola con los partidos de Liga finalizados.');
      h += table(rows, { full: VS.full });
      var lg = '';
      if (+L.zoneTop > 0) lg += '<span><i class="k1"></i>Clasificación</span>';
      if (+L.zoneBottom > 0) lg += '<span><i class="k2"></i>Descenso</span>';
      h += '<div class="tb-foot">' + (lg ? '<div class="tb-lg">' + lg + '</div>' : '<span></span>') +
        '<button class="lnk" data-act="full">' + (VS.full ? 'Ver resumida' : 'Ver completa') + '</button></div>';
      h += '<p class="note">Victoria ' + (+L.pointsWin) + ' pts · Empate ' + (+L.pointsDraw) + ' · Derrota ' + (+L.pointsLoss) + '</p>';
    } else if (VS.lseg === 'cups') {
      h += cupsView(cups);
    } else if (VS.lseg === 'sanc') {
      var ss = st.sanctions;
      if (!ss.length) return h + empty('Sin sancionados', 'Tarjetas, suspensiones y lesiones activas aparecen acá.');
      h += '<div class="stack">' + ss.map(function (s) {
        var t = S.team(s.team), lb = { yellow: 'Amarillas', red: 'Expulsión', injury: 'Lesión', other: 'Otro' }[s.type] || 'Otro';
        return '<div class="sn"><span class="sn-i ' + esc(s.type) + '"></span><div class="sn-t"><b>' + esc(s.player) + '</b><small>' + esc(lb) + (s.duration ? ' · ' + esc(s.duration) : '') + (s.notes ? ' · ' + esc(s.notes) : '') + '</small></div>' + (t ? '<span class="sn-tm">' + crest(t, 's') + '</span>' : '') + '</div>';
      }).join('') + '</div>';
    } else {
      h += '<div class="card prose"><h3>Reglamento</h3><p>' + (esc(L.rules) || 'El reglamento será publicado pronto.') + '</p></div>';
    }
    return h;
  };

  function newsThumb(n, cls) {
    return n.img ? '<img class="' + cls + '" src="' + esc(n.img) + '" alt="" loading="lazy" decoding="async">' : '<span class="' + cls + ' ph"><b>' + esc((n.cat || 'LSL').slice(0, 10)) + '</b></span>';
  }
  function newsRow(n) {
    return '<button class="nw" data-news="' + esc(n.id) + '">' + newsThumb(n, 'nw-i') + '<span class="nw-t"><span class="nw-c">' + esc(n.cat) + ' · ' + T.rel(T.ts(n.date)) + '</span><b>' + esc(n.title) + '</b><span class="nw-s">' + esc(n.summary) + '</span></span></button>';
  }
  V.news = function () {
    var list = S.state.news.slice().sort(function (a, b) { return T.ts(b.date) - T.ts(a.date); });
    var h = '<h1 class="h">Noticias</h1>';
    if (!list.length) return h + empty('No hay noticias todavía', 'Las novedades de la liga se publican acá.');
    var cats = [], seen = {};
    list.forEach(function (n) { if (n.cat && !seen[n.cat]) { seen[n.cat] = 1; cats.push([n.cat, n.cat]); } });
    if (VS.ncat && !seen[VS.ncat]) VS.ncat = '';
    if (cats.length > 1) h += chips([['', 'Todas']].concat(cats), VS.ncat, 'data-ncat');
    if (VS.ncat) list = list.filter(function (n) { return n.cat === VS.ncat; });
    var top = list[0];
    if (top) h += '<button class="nf" data-news="' + esc(top.id) + '">' + newsThumb(top, 'nf-i') + '<span class="nf-t"><span class="nw-c">' + esc(top.cat) + ' · ' + T.rel(T.ts(top.date)) + '</span><b>' + esc(top.title) + '</b><span class="nw-s">' + esc(top.summary) + '</span></span></button>';
    h += '<div class="stack">' + list.slice(1).map(newsRow).join('') + '</div>';
    return h;
  };

  V.profile = function () {
    var p = LSL.profile.get() || { name: 'Invitado' }, t = S.team(P.fav), rows = S.standings(), pos = -1, row = null;
    rows.forEach(function (r, i) { if (t && r.id === t.id) { pos = i; row = r; } });
    var h = '<h1 class="h">Perfil</h1>';
    h += '<section class="pf" style="--c1:' + esc(U.hexOr(t && t.color, '#27C4C9')) + '"><div class="pf-av">' + avatar(p, 104) + (t ? '<span class="pf-tm">' + crest(t, 'm') + '</span>' : '') + '</div>' +
      '<h2 class="pf-n">' + esc(p.name) + '</h2><p class="pf-s">' + (t ? esc(t.name) + (row ? ' · ' + (pos + 1) + '° · ' + row.pts + ' pts' : '') : 'Todavía no elegiste equipo') + '</p>' +
      '<div class="btns pf-b"><button class="btn ghost sm" data-ob="photo">' + ic('camera') + 'Foto</button><button class="btn ghost sm" data-ob="name">' + ic('edit') + 'Nombre</button><button class="btn ghost sm" data-ob="team">' + ic('users') + 'Equipo</button></div></section>';
    if (row) {
      h += '<div class="pf-st">' + [['PJ', row.pj], ['G-E-P', row.g + '-' + row.e + '-' + row.p], ['DG', (row.dg > 0 ? '+' : '') + row.dg], ['Pts', row.pts]].map(function (x) { return '<div><b>' + x[1] + '</b><small>' + x[0] + '</small></div>'; }).join('') + '</div>';
    }
    if (t) {
      var mine = S.sorted().filter(function (m) { return m.home === t.id || m.away === t.id; });
      var nx = mine.filter(isLive)[0] || mine.filter(function (m) { return m.status === 'upcoming'; })[0];
      var ls = mine.filter(function (m) { return m.status === 'finished'; }).pop();
      if (nx) h += sec(isLive(nx) ? 'Tu equipo, en vivo' : 'Próximo de tu equipo', '', '', matchCard(nx));
      if (ls) h += sec('Último resultado', '', '', matchCard(ls));
    }
    h += '<section class="card"><h3>Tutorial</h3><p class="mut">Repasá qué hay en cada pantalla, paso a paso.</p><div class="btns"><button class="btn ghost" data-ob="tour">' + ic('help') + 'Ver tutorial</button></div></section>';
    h += '<section class="card"><h3>App</h3><div class="btns">' +
      (LSL.installEvt ? '<button class="btn" data-act="install">' + ic('download') + 'Instalar en el celular</button>' : '') +
      '<button class="btn ghost" data-act="share">' + ic('share') + 'Compartir</button></div></section>';
    return h;
  };

  /* ---------- ventanita de detalle (bottom sheet) ---------- */
  var SH = UI.sh = { type: '', id: '', tab: '', side: 'h', open: false };
  var sheet, panel, body, closeTimer;

  function evIcon(t) { return t === 'goal' ? ic('ball') : t === 'own' ? ic('ball') : '<i class="card-' + (t === 'red' ? 'r' : 'y') + '"></i>'; }
  function pitchHTML(lineup, formation, team) {
    lineup = lineup || [];
    if (!lineup.length) return empty('Alineación sin confirmar', 'Se publica cuando el equipo la define.');
    var rows = String(formation || '4-4-2').split('-').map(Number).filter(Boolean);
    var sum = rows.reduce(function (a, b) { return a + b; }, 0);
    if (sum !== 10) rows = [4, 4, 2];
    rows.unshift(1);
    var idx = 0, out = [];
    rows.forEach(function (n) {
      var r = [];
      for (var i = 0; i < n; i++) { r.push(lineup[idx++] || { n: '', name: '—' }); }
      out.push(r);
    });
    var c1 = U.hexOr(team && team.color, '#27C4C9');
    var h = '<div class="pitch" style="--pc:' + esc(c1) + ';--pi:' + U.ink(c1) + '"><span class="pf">' + esc(formation || '') + '</span>';
    for (var r = out.length - 1; r >= 0; r--) {
      h += '<div class="prow">' + out[r].map(function (p) {
        return '<span class="pl"><b>' + esc(p.n) + '</b><em>' + esc(String(p.name || '').split(' ').slice(-1)[0] || '—') + '</em></span>';
      }).join('') + '</div>';
    }
    return h + '</div>';
  }

  function matchSheet(m) {
    var h = S.team(m.home), a = S.team(m.away), ch = S.channel(m.channel), ts = T.ts(m.date), live = isLive(m), f = S.state.features;
    var tabs = [['sum', 'Resumen']]; if (f.lineups) tabs.push(['lin', 'Alineaciones']); tabs.push(['inf', 'Info']);
    if (!SH.tab || !tabs.some(function (t) { return t[0] === SH.tab; })) SH.tab = (m.status === 'upcoming') ? 'inf' : 'sum';
    var mid = m.status === 'upcoming'
      ? '<span class="hm-t">' + T.time(ts) + '</span>'
      : '<span class="hm-sc"><b>' + (+m.hs || 0) + '</b><i></i><b>' + (+m.as || 0) + '</b></span>';
    var st = statusText(m);
    var out = '<div class="mh" style="' + tint(h, a) + '"><div class="mh-top"><span class="chip comp-' + esc(m.comp) + '">' + esc(compLabel(m)) + '</span>' +
      (live ? '<span class="live"><i></i>' + esc(st) + '</span>' : (st ? '<span class="chip">' + st + '</span>' : '')) + '</div>' +
      '<div class="hero-row"><div class="tm">' + crest(h, 'x') + '<span class="hn" id="sheet-t">' + esc(h ? h.name : 'Equipo') + '</span></div><div class="hero-mid">' + mid + '</div><div class="tm">' + crest(a, 'x') + '<span class="hn">' + esc(a ? a.name : 'Equipo') + '</span></div></div>' +
      '<p class="mh-sub">' + esc(T.long(ts)) + ' · ' + T.time(ts) + (m.leg2 && m.firstLeg ? ' · Ida: ' + esc(m.firstLeg) : '') + (m.pens ? ' · Penales: ' + esc(m.pens) : '') + '</p></div>';
    out += '<div class="sb-in">' + seg(tabs, SH.tab, 'stab');

    if (SH.tab === 'sum') {
      var ev = (m.events || []).slice().sort(function (x, y) { return (parseInt(x.min, 10) || 0) - (parseInt(y.min, 10) || 0); });
      if (!ev.length) out += empty(m.status === 'upcoming' ? 'El partido todavía no empezó' : 'Sin eventos cargados', m.status === 'upcoming' ? 'Los goles y tarjetas aparecen acá.' : '');
      else out += '<div class="evs">' + ev.map(function (e) {
        var txt = '<span class="ev-p">' + esc(e.player || '') + '</span>' + evIcon(e.type);
        return '<div class="ev"><div class="ev-l">' + (e.side === 'h' ? txt : '') + '</div><span class="ev-m">' + esc(e.min) + "'</span><div class=\"ev-r\">" + (e.side === 'a' ? evIcon(e.type) + '<span class="ev-p">' + esc(e.player || '') + '</span>' : '') + '</div></div>';
      }).join('') + '</div>';
    } else if (SH.tab === 'lin') {
      var isH = SH.side !== 'a', tm = isH ? h : a;
      out += '<div class="sidesel"><button class="' + (isH ? 'on' : '') + '" data-side="h">' + esc(h ? h.name : 'Local') + '</button><button class="' + (!isH ? 'on' : '') + '" data-side="a">' + esc(a ? a.name : 'Visitante') + '</button></div>';
      out += pitchHTML(isH ? m.hl : m.al, isH ? m.hf : m.af, tm);
    } else {
      var rows = [
        ['Competición', m.comp === 'copa' ? (m.cup || 'Copa') : m.comp === 'amistoso' ? 'Amistoso' : 'Liga'],
        m.round ? ['Fase', m.round] : null,
        m.leg2 ? ['Partido', 'Vuelta' + (m.firstLeg ? ' (ida: ' + m.firstLeg + ')' : '')] : null,
        ['Fecha', T.long(ts)], ['Horario', T.time(ts)],
        m.pens ? ['Penales', m.pens] : null,
        m.stadium ? ['Estadio', m.stadium] : null
      ].filter(Boolean);
      out += '<div class="kv">' + rows.map(function (r) { return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
      if (f.channels && ch) {
        out += '<div class="kv-ch"><span>Dónde verlo</span><div class="ch">' + (ch.logo ? '<img src="' + esc(ch.logo) + '" alt="" decoding="async">' : ic('tv')) + '<b>' + esc(ch.name) + '</b>' +
          (ch.url ? '<a class="btn sm" href="' + esc(ch.url) + '" target="_blank" rel="noopener noreferrer">Ver</a>' : '') + '</div></div>';
      }
      if (m.room) out += '<div><span>Código de sala</span><b class="room">' + esc(m.room) + '<button class="ib" data-copy="' + esc(m.room) + '" aria-label="Copiar código">' + ic('copy') + '</button></b></div>';
      out += '</div>';
      if (m.notes) out += '<p class="note-b">' + esc(m.notes) + '</p>';
    }
    return out + '</div>';
  }

  function newsSheet(n) {
    var ts = T.ts(n.date), paras = String(n.body || n.summary || '').split(/\n{2,}/);
    return (n.img ? '<img class="art-i" src="' + esc(n.img) + '" alt="" decoding="async">' : '') +
      '<div class="sb-in art"><span class="nw-c">' + esc(n.cat) + ' · ' + esc(T.long(ts)) + '</span><h2 id="sheet-t">' + esc(n.title) + '</h2>' +
      (n.summary ? '<p class="lead">' + esc(n.summary) + '</p>' : '') + paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>';
  }

  function aboutSheet() {
    var L = S.state.league;
    return '<div class="sb-in art"><span class="nw-c">' + esc(L.season) + ' · ' + esc(L.seasonStatus) + '</span><h2 id="sheet-t">' + esc(L.name) + '</h2>' +
      String(L.info || 'Todavía no hay una descripción de la liga.').split(/\n+/).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div>';
  }

  UI.renderSheet = function () {
    if (!SH.open) return;
    var st = body.scrollTop, html = '';
    if (SH.type === 'match') { var m = S.match(SH.id); if (!m) return UI.closeSheet(); html = matchSheet(m); }
    else if (SH.type === 'about') html = aboutSheet();
    else { var n = S.news(SH.id); if (!n) return UI.closeSheet(); html = newsSheet(n); }
    body.innerHTML = html; body.scrollTop = st;
  };

  UI.openSheet = function (type, id) {
    sheet = sheet || document.getElementById('sheet'); panel = panel || sheet.querySelector('.panel'); body = body || document.getElementById('sbody');
    SH.type = type; SH.id = id; SH.tab = ''; SH.side = 'h'; SH.open = true;
    clearTimeout(closeTimer);
    body.scrollTop = 0; UI.renderSheet();
    sheet.hidden = false; void sheet.offsetWidth;
    sheet.classList.add('on'); document.documentElement.classList.add('lock');
    panel.style.transform = '';
    LSL.pushLayer(UI.hideSheet);
    if (UI.onSheet) UI.onSheet();
  };
  UI.hideSheet = function () {
    if (!SH.open) return;
    SH.open = false; sheet.classList.remove('on'); panel.style.transform = '';
    document.documentElement.classList.remove('lock');
    var lite = document.documentElement.getAttribute('data-perf') === 'lite';
    closeTimer = setTimeout(function () { sheet.hidden = true; body.innerHTML = ''; }, lite ? 0 : 300);
    if (UI.onSheet) UI.onSheet();
  };
  UI.closeSheet = function () { if (SH.open) LSL.popLayer(); };

  UI.initSheet = function () {
    sheet = document.getElementById('sheet'); panel = sheet.querySelector('.panel'); body = document.getElementById('sbody');
    sheet.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) return UI.closeSheet();
      var t = e.target.closest('[data-seg="stab"]'); if (t) { SH.tab = t.getAttribute('data-v'); UI.renderSheet(); if (UI.onSheet) UI.onSheet(); return; }
      var sd = e.target.closest('[data-side]'); if (sd) { SH.side = sd.getAttribute('data-side'); return UI.renderSheet(); }
    });
    /* arrastrar para cerrar (solo desde la manija) */
    var grab = document.getElementById('grab'), y0 = 0, dy = 0, drag = false, raf = 0;
    grab.addEventListener('touchstart', function (e) { drag = true; y0 = e.touches[0].clientY; dy = 0; panel.style.transition = 'none'; }, { passive: true });
    grab.addEventListener('touchmove', function (e) {
      if (!drag) return; dy = Math.max(0, e.touches[0].clientY - y0);
      if (!raf) raf = requestAnimationFrame(function () { raf = 0; panel.style.transform = 'translateY(' + dy + 'px)'; });
    }, { passive: true });
    grab.addEventListener('touchend', function () {
      if (!drag) return; drag = false; panel.style.transition = '';
      if (dy > 90) UI.closeSheet(); else panel.style.transform = '';
    });
  };

  /* ---------- toast (kind: '' | 'warn' | 'err' cambia el color) ---------- */
  var toastT;
  UI.toast = LSL.toast = function (msg, ms, kind) {
    var el = document.getElementById('toast'); if (!el) return;
    el.textContent = msg; el.className = 'toast on' + (kind ? ' ' + kind : ''); clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove('on'); }, ms || 2200);
  };
})(window);
