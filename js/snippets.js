/* La Súper Liga · snippets.js
   Sección "Snippets" del panel admin. Se descarga SOLO al entrar a esa sección
   (lo carga admin.js). Los clicks llegan desde admin.js: LSL.snippets.onAction(a, v). */
(function (w) {
  'use strict';
  var LSL = w.LSL, S = LSL.store, U = LSL.u, esc = U.esc, UI = LSL.ui, ic = UI.ic;
  var doc = document;
  var SNP = LSL.snippets = {};
  var state = { view: 'list', id: null, q: '', draft: null };

  var FILE_TARGETS = ['js/app.js', 'js/ui.js', 'js/store.js', 'js/admin.js', 'js/edit.js', 'js/onboard.js', 'css/styles.css', 'css/admin.css', 'css/onboard.css', 'index.html'];
  var CATEGORIES = ['function', 'style', 'listener', 'component', 'util', 'other'];
  var LOCATIONS = [['end', 'Al final del archivo'], ['start', 'Al inicio del archivo'], ['custom', 'En una línea específica']];

  function host() { return doc.getElementById('adm-b'); }
  function toast(m) { LSL.toast(m); }
  function opts(list, cur) {
    return list.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }
  function val(id) { var el = doc.getElementById(id); return el ? el.value : ''; }

  /* ---------- Lista ---------- */
  function listHTML() {
    var all = S.snippets.cache || [];
    var q = state.q.trim().toLowerCase();
    var rows = !q ? all : all.filter(function (s) {
      return (s.name + ' ' + s.file_target + ' ' + (s.category || '') + ' ' + (s.description || '')).toLowerCase().indexOf(q) >= 0;
    });
    var out = '<div class="adm-bar"><button class="btn" data-a="snp-new">' + ic('plus') + 'Nuevo snippet</button></div>';
    if (all.length > 4) out += '<div class="fl" style="padding:0 16px"><input class="fld" id="snp-q" type="search" placeholder="Buscar por nombre, archivo o categoría…" value="' + esc(state.q) + '"></div>';
    if (!rows.length) {
      return out + '<div class="empty"><b>' + (all.length ? 'Sin resultados' : 'No hay snippets') + '</b><span>' + (all.length ? 'Probá con otra búsqueda.' : 'Creá el primero con el botón de arriba.') + '</span></div>';
    }
    return out + '<div class="stack">' + rows.map(function (s) {
      var meta = esc(s.file_target) + (s.category ? ' · ' + esc(s.category) : '') + ' · ' + (s.history ? s.history.length : 0) + ' versión(es) previas';
      return '<div class="ar"><div class="ar-m"><div class="ar-t"><b>' + esc(s.name) + '</b></div><div class="ar-s">' + meta + '</div></div>' +
        '<div class="ar-b">' +
        '<button class="ib" data-a="snp-apply" data-v="' + esc(s.id) + '" aria-label="Aplicar al archivo">' + ic('bolt') + '</button>' +
        '<button class="ib" data-a="snp-copy" data-v="' + esc(s.id) + '" aria-label="Copiar código">' + ic('copy') + '</button>' +
        '<button class="ib" data-a="snp-edit" data-v="' + esc(s.id) + '" aria-label="Editar">' + ic('edit') + '</button>' +
        '<button class="ib" data-a="snp-del" data-v="' + esc(s.id) + '" aria-label="Eliminar">' + ic('trash') + '</button>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  /* ---------- Formulario ---------- */
  function formHTML() {
    var ex = state.id ? S.snippets.get(state.id) : null;
    var d = state.draft || ex || { name: '', code: '', file_target: 'js/app.js', location: 'end', custom_line: '', category: '', description: '' };
    var hist = ex && ex.history && ex.history.length ? '<button class="btn wide" data-a="snp-hist" data-v="' + esc(ex.id) + '" style="margin-top:8px">Ver historial (' + ex.history.length + ')</button>' : '';
    return '<div style="padding:0 16px 24px">' +
      '<label class="fl"><span class="fl-t">Nombre</span><input class="fld" id="snp-name" type="text" placeholder="Isla dinámica - JS" value="' + esc(d.name) + '"></label>' +
      '<label class="fl half"><span class="fl-t">Archivo destino</span><select class="fld" id="snp-file">' + opts(FILE_TARGETS, d.file_target) + '</select></label>' +
      '<label class="fl half"><span class="fl-t">Categoría</span><select class="fld" id="snp-cat"><option value="">Sin categoría</option>' + opts(CATEGORIES, d.category || '') + '</select></label>' +
      '<label class="fl"><span class="fl-t">Dónde se inserta</span><select class="fld" id="snp-loc">' + opts(LOCATIONS, d.location) + '</select></label>' +
      '<label class="fl" id="snp-line-w"' + (d.location === 'custom' ? '' : ' hidden') + '><span class="fl-t">Número de línea</span><input class="fld" id="snp-line" type="number" min="1" value="' + esc(d.custom_line || '') + '"></label>' +
      '<label class="fl"><span class="fl-t">Código</span><textarea class="fld" id="snp-code" rows="12" spellcheck="false" style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;white-space:pre;overflow:auto">' + esc(d.code) + '</textarea></label>' +
      '<label class="fl"><span class="fl-t">Descripción (opcional)</span><textarea class="fld" id="snp-desc" rows="2">' + esc(d.description || '') + '</textarea></label>' +
      '<button class="btn wide" data-a="snp-save">' + (ex ? 'Guardar cambios' : 'Crear snippet') + '</button>' +
      hist +
      '<button class="btn wide" data-a="snp-back" style="margin-top:8px">Cancelar</button></div>';
  }

  /* ---------- Historial ---------- */
  function histHTML() {
    var s = S.snippets.get(state.id);
    if (!s) return '<div class="empty"><b>Snippet no encontrado</b></div>';
    var h = s.history || [];
    if (!h.length) return '<div class="empty"><b>Sin versiones anteriores</b><span>Aparecen cuando editás el código.</span></div><div style="padding:0 16px"><button class="btn wide" data-a="snp-edit" data-v="' + esc(s.id) + '">Volver</button></div>';
    return '<p class="mut sm pad">Versiones anteriores de <b>' + esc(s.name) + '</b></p><div class="stack">' + h.map(function (x, i) {
      var date = ''; try { date = new Date(x.updated_at).toLocaleString('es-AR'); } catch (e) { }
      return '<div class="ar" style="display:block"><div class="ar-s" style="margin:0 0 6px">' + esc(date) + '</div>' +
        '<pre style="margin:0 0 8px;max-height:140px;overflow:auto;font-size:11px;white-space:pre-wrap;word-break:break-word">' + esc((x.code || '').slice(0, 600)) + ((x.code || '').length > 600 ? '\n…' : '') + '</pre>' +
        '<button class="btn sm" data-a="snp-restore" data-v="' + i + '">Restaurar esta versión</button></div>';
    }).join('') + '</div><div style="padding:12px 16px"><button class="btn wide" data-a="snp-edit" data-v="' + esc(s.id) + '">Volver</button></div>';
  }

  /* ---------- Render ---------- */
  function render() {
    var b = host(); if (!b) return;
    b.innerHTML = state.view === 'form' ? formHTML() : state.view === 'hist' ? histHTML() : listHTML();
    b.scrollTop = 0;
    var loc = doc.getElementById('snp-loc');
    if (loc) loc.addEventListener('change', function () { var w2 = doc.getElementById('snp-line-w'); if (w2) w2.hidden = loc.value !== 'custom'; });
    bindSearch();
  }
  function bindSearch() {
    var q = doc.getElementById('snp-q'); if (!q) return;
    q.addEventListener('input', function () {
      state.q = q.value; var pos = q.selectionStart, b = host();
      b.innerHTML = listHTML(); bindSearch();
      var q2 = doc.getElementById('snp-q');
      if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) { } }
    });
  }
  function go(view, id) { state.view = view; state.id = id || null; state.draft = null; render(); }

  /* ---------- Insertar en el texto de un archivo ---------- */
  function insertInto(text, code, loc, line, path) {
    var isHtml = /\.html$/.test(path);
    if (loc === 'start') {
      if (isHtml) { var m = text.match(/<head[^>]*>/i); if (m) { var at = m.index + m[0].length; return text.slice(0, at) + '\n' + code + '\n' + text.slice(at); } }
      return code + '\n\n' + text;
    }
    if (loc === 'custom' && line > 0) {
      var ls = text.split('\n'); var n = Math.min(line - 1, ls.length);
      ls.splice(n, 0, code); return ls.join('\n');
    }
    if (isHtml) { var i = text.toLowerCase().lastIndexOf('</body>'); if (i >= 0) return text.slice(0, i) + code + '\n' + text.slice(i); }
    return text.replace(/\s+$/, '') + '\n\n' + code + '\n';
  }
  function currentText(path) {
    var go2 = function () {
      var row = S.code.get(path);
      var t = row && (row.draft != null ? row.draft : row.published);
      if (t != null) return t;
      return fetch(path + '?raw=' + Date.now(), { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('No pude leer ' + path);
        return r.text();
      });
    };
    return S.code.cache ? Promise.resolve(go2()) : S.code.list().then(go2);
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) {
      var ta = doc.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; doc.body.appendChild(ta); ta.select();
      try { doc.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } ta.remove();
    });
  }

  /* ---------- Acciones (las llama admin.js) ---------- */
  SNP.onAction = function (a, v) {
    var s = v ? S.snippets.get(v) : null;
    if (a === 'snp-new') return go('form');
    if (a === 'snp-edit') return go('form', v);
    if (a === 'snp-back') return go('list');
    if (a === 'snp-hist') return go('hist', v);

    if (a === 'snp-save') {
      var f = {
        name: val('snp-name').trim(), code: val('snp-code').replace(/\s+$/, ''), file_target: val('snp-file'),
        location: val('snp-loc'), custom_line: parseInt(val('snp-line'), 10) || null, category: val('snp-cat'), description: val('snp-desc').trim()
      };
      if (!f.name || !f.code) { state.draft = f; toast('Falta el nombre o el código.'); return; }
      if (f.location === 'custom' && !f.custom_line) { toast('Indicá el número de línea.'); return; }
      var p = state.id ? S.snippets.update(state.id, f) : S.snippets.create(f);
      toast('Guardando…');
      p.then(function () { toast('Snippet guardado'); go('list'); })
        .catch(function (e) { state.draft = f; toast('Error: ' + ((e && e.message) || 'no se pudo guardar')); });
      return;
    }
    if (a === 'snp-del') {
      if (!s || !w.confirm('¿Eliminar "' + s.name + '"?')) return;
      S.snippets.delete(v).then(function () { toast('Snippet eliminado'); render(); })
        .catch(function (e) { toast('Error: ' + ((e && e.message) || 'no se pudo eliminar')); });
      return;
    }
    if (a === 'snp-copy') {
      if (!s) return;
      copyText(s.code).then(function () { toast('Código copiado'); }, function () { toast('No pude copiar.'); });
      return;
    }
    if (a === 'snp-restore') {
      var cur = S.snippets.get(state.id), h = cur && cur.history && cur.history[parseInt(v, 10)];
      if (!h || !w.confirm('¿Restaurar esta versión? La actual queda en el historial.')) return;
      S.snippets.update(cur.id, { name: cur.name, code: h.code, file_target: cur.file_target, location: cur.location, custom_line: cur.custom_line, category: cur.category, description: cur.description })
        .then(function () { toast('Versión restaurada'); go('hist', cur.id); })
        .catch(function (e) { toast('Error: ' + ((e && e.message) || 'no se pudo restaurar')); });
      return;
    }
    if (a === 'snp-apply') {
      if (!s) return;
      if (!S.code || !S.code.supported()) { toast('Hace falta la conexión con Supabase.'); return; }
      var where = s.location === 'start' ? 'al inicio' : s.location === 'custom' ? 'en la línea ' + s.custom_line : 'al final';
      if (!w.confirm('Se inserta "' + s.name + '" ' + where + ' de ' + s.file_target + ' como BORRADOR (no lo ve nadie hasta publicar desde "Código").')) return;
      toast('Aplicando…');
      currentText(s.file_target).then(function (text) {
        if (text.indexOf(s.code.trim()) >= 0 && !w.confirm('Este código ya parece estar en el archivo. ¿Insertarlo igual?')) return;
        return S.code.saveDraft(s.file_target, insertInto(text, s.code, s.location, s.custom_line, s.file_target)).then(function () {
          toast('Listo: borrador en ' + s.file_target + '. Revisalo y publicalo en Código.');
        });
      }).catch(function (e) { toast('Error: ' + ((e && e.message) || 'no se pudo aplicar')); });
      return;
    }
  };

  SNP.init = function () {
    state.view = 'list'; state.id = null; state.q = ''; state.draft = null;
    var b = host(); if (b) b.innerHTML = '<p class="mut sm pad">Cargando snippets…</p>';
    S.snippets.list().then(render).catch(function (e) {
      var b2 = host(); if (!b2) return;
      b2.innerHTML = '<div class="empty"><b>No se pudieron cargar</b><span>' + esc((e && e.message) || 'Revisá la tabla lsl_snippets y tu sesión de admin.') + '</span></div>';
    });
  };
})(window);
