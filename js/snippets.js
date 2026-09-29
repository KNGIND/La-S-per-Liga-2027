/* La Súper Liga · snippets.js
   Sección "Snippets" del panel admin: crear, editar, eliminar y ver historial
   de fragmentos de código reutilizables que se insertan automáticamente. */
(function (w) {
  'use strict';
  var LSL = w.LSL, S = LSL.store, U = LSL.u, esc = U.esc, UI = LSL.ui, ic = UI.ic;
  var doc = document;
  var SNP = LSL.snippets = {};

  var state = { view: 'list', editing: null, formData: {} };

  /* Opciones disponibles */
  var FILE_TARGETS = ['js/app.js', 'js/admin.js', 'js/store.js', 'js/ui.js', 'js/edit.js', 'css/styles.css', 'css/admin.css', 'css/onboard.css'];
  var CATEGORIES = ['function', 'style', 'listener', 'component', 'util', 'other'];
  var LOCATIONS = [
    { value: 'start', label: 'Al inicio' },
    { value: 'end', label: 'Al final' },
    { value: 'custom', label: 'Línea específica' }
  ];

  /* ---------- Vista: Lista de snippets ---------- */
  SNP.listView = function () {
    return S.snippets.list().then(function (snippets) {
      if (!snippets || snippets.length === 0) {
        return '<p class="mut" style="text-align:center;padding:40px 20px;">No hay snippets aún. ' +
          '<button class="btn sm" data-a="snp-new" style="margin-top:16px;">+ Crear el primero</button></p>';
      }
      return '<div class="adm-menu">' + snippets.map(function (s) {
        var badge = s.category ? '<span style="font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">' + esc(s.category) + '</span>' : '';
        return '<div class="am-card" style="padding:16px;cursor:default;">' +
          '<span class="am-ic">' + ic('code') + '</span>' +
          '<span class="am-tx" style="flex:1;">' +
          '<b>' + esc(s.name) + '</b>' +
          '<small>' + esc(s.file_target) + (s.description ? ' — ' + esc(s.description.slice(0, 50)) : '') + '</small>' +
          badge +
          '</span>' +
          '<div style="display:flex;gap:6px;margin-top:10px;">' +
          '<button class="btn ghost xs" data-a="snp-edit" data-v="' + esc(s.id) + '">Editar</button>' +
          '<button class="btn ghost xs" data-a="snp-hist" data-v="' + esc(s.id) + '">Historial</button>' +
          '<button class="btn ghost xs" data-a="snp-del" data-v="' + esc(s.id) + '" style="color:var(--live);">Eliminar</button>' +
          '</div>' +
          '</div>';
      }).join('') + '</div>' +
        '<div style="text-align:center;margin-top:20px;">' +
        '<button class="btn sm" data-a="snp-new">+ Crear nuevo</button>' +
        '</div>';
    });
  };

  /* ---------- Vista: Formulario (crear/editar) ---------- */
  SNP.formView = function (snippetId) {
    var snippet = snippetId ? S.snippets.get(snippetId) : null;
    var isEdit = !!snippet;

    return (isEdit ? '<p class="mut sm" style="margin-bottom:14px;">Editando: <b>' + esc(snippet.name) + '</b></p>' : '') +
      '<div class="edt-c" style="position:static;max-height:none;border:none;padding:0;box-shadow:none;transform:none;">' +
      '<label style="margin-top:0;"><b>Nombre del snippet</b></label>' +
      '<input type="text" id="snp-name" placeholder="Mi función" value="' + esc(snippet ? snippet.name : '') + '" style="width:100%;padding:10px;margin-bottom:12px;border:1px solid var(--line);border-radius:8px;background:var(--card);">' +

      '<label><b>Archivo destino</b></label>' +
      '<select id="snp-file" style="width:100%;padding:10px;margin-bottom:12px;border:1px solid var(--line);border-radius:8px;background:var(--card);">' +
      FILE_TARGETS.map(function (f) {
        return '<option value="' + esc(f) + '" ' + (snippet && snippet.file_target === f ? 'selected' : '') + '>' + esc(f) + '</option>';
      }).join('') +
      '</select>' +

      '<label><b>Categoría</b></label>' +
      '<select id="snp-cat" style="width:100%;padding:10px;margin-bottom:12px;border:1px solid var(--line);border-radius:8px;background:var(--card);">' +
      '<option value="">-- Sin categoría --</option>' +
      CATEGORIES.map(function (c) {
        return '<option value="' + c + '" ' + (snippet && snippet.category === c ? 'selected' : '') + '>' + esc(c) + '</option>';
      }).join('') +
      '</select>' +

      '<label><b>Ubicación</b></label>' +
      '<select id="snp-loc" style="width:100%;padding:10px;margin-bottom:12px;border:1px solid var(--line);border-radius:8px;background:var(--card);">' +
      LOCATIONS.map(function (l) {
        return '<option value="' + l.value + '" ' + (snippet && snippet.location === l.value ? 'selected' : '') + '>' + l.label + '</option>';
      }).join('') +
      '</select>' +

      '<div id="snp-custom-line-wrapper" style="display:none;margin-bottom:12px;">' +
      '<label><b>Número de línea</b></label>' +
      '<input type="number" id="snp-custom-line" placeholder="100" value="' + (snippet && snippet.custom_line ? snippet.custom_line : '') + '" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--card);">' +
      '</div>' +

      '<label><b>Código</b></label>' +
      '<textarea id="snp-code" placeholder="function test() { ... }" style="width:100%;height:200px;padding:10px;margin-bottom:12px;border:1px solid var(--line);border-radius:8px;background:var(--card);font-family:Courier New,monospace;font-size:12px;">' + esc(snippet ? snippet.code : '') + '</textarea>' +

      '<label><b>Descripción (opcional)</b></label>' +
      '<textarea id="snp-desc" placeholder="Breve descripción..." style="width:100%;height:80px;padding:10px;margin-bottom:16px;border:1px solid var(--line);border-radius:8px;background:var(--card);font-size:13px;">' + esc(snippet ? (snippet.description || '') : '') + '</textarea>' +

      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
      '<button class="btn ghost sm" data-a="snp-back">Cancelar</button>' +
      '<button class="btn sm" data-a="snp-save" data-v="' + (snippetId || '') + '">' + (isEdit ? 'Guardar cambios' : 'Crear') + '</button>' +
      '</div>' +
      '</div>';
  };

  /* ---------- Vista: Historial ---------- */
  SNP.historyView = function (snippetId) {
    var snippet = S.snippets.get(snippetId);
    if (!snippet) return '<p class="mut">Snippet no encontrado.</p>';

    var hist = snippet.history || [];
    if (hist.length === 0) {
      return '<p class="mut">Sin versiones anteriores.</p>' +
        '<button class="btn ghost sm" data-a="snp-back" style="margin-top:10px;">Volver</button>';
    }

    return '<p class="mut sm" style="margin-bottom:14px;">Versiones anteriores de <b>' + esc(snippet.name) + '</b></p>' +
      '<div style="display:flex;flex-direction:column;gap:12px;">' +
      hist.map(function (h, i) {
        var date = new Date(h.updated_at).toLocaleString('es-AR');
        return '<div style="padding:12px;background:var(--card);border-radius:8px;border:1px solid var(--line);">' +
          '<div style="font-size:12px;color:var(--mut);margin-bottom:8px;">Versión ' + (i + 1) + ' — ' + esc(date) + '</div>' +
          '<pre style="background:var(--bg);padding:10px;border-radius:4px;overflow-x:auto;font-size:11px;color:var(--text-secondary);margin:0;max-height:150px;overflow-y:auto;">' + esc(h.code.slice(0, 500)) + (h.code.length > 500 ? '\n...' : '') + '</pre>' +
          '<button class="btn ghost xs" data-a="snp-restore" data-v="' + esc(snippetId + '|' + i) + '" style="margin-top:8px;">Restaurar esta</button>' +
          '</div>';
      }).join('') +
      '</div>' +
      '<button class="btn ghost sm" data-a="snp-back" style="margin-top:16px;">Volver</button>';
  };

  /* ---------- Render ---------- */
  SNP.render = function (container) {
    if (state.view === 'list') {
      SNP.listView().then(function (html) {
        container.innerHTML = html;
        SNP.attachListeners();
      });
    } else if (state.view === 'form') {
      var html = SNP.formView(state.editing);
      container.innerHTML = html;
      SNP.attachFormListeners();
    } else if (state.view === 'history') {
      var html = SNP.historyView(state.editing);
      container.innerHTML = html;
      SNP.attachListeners();
    }
  };

  /* ---------- Listeners ---------- */
  SNP.attachListeners = function () {
    var btns = doc.querySelectorAll('[data-a^="snp-"]');
    btns.forEach(function (btn) {
      btn.addEventListener('click', SNP.onAction);
    });
  };

  SNP.attachFormListeners = function () {
    var locSelect = doc.getElementById('snp-loc');
    var customLineWrapper = doc.getElementById('snp-custom-line-wrapper');
    if (locSelect && customLineWrapper) {
      locSelect.addEventListener('change', function () {
        customLineWrapper.style.display = this.value === 'custom' ? 'block' : 'none';
      });
      locSelect.dispatchEvent(new Event('change'));
    }
    SNP.attachListeners();
  };

  SNP.onAction = function (e) {
    var el = e.target.closest('[data-a]');
    var action = el.getAttribute('data-a');
    var value = el.getAttribute('data-v');

    if (action === 'snp-new') {
      state.view = 'form';
      state.editing = null;
      SNP.render(doc.getElementById('admin-content'));
      return;
    }
    if (action === 'snp-edit') {
      state.view = 'form';
      state.editing = value;
      SNP.render(doc.getElementById('admin-content'));
      return;
    }
    if (action === 'snp-hist') {
      state.view = 'history';
      state.editing = value;
      SNP.render(doc.getElementById('admin-content'));
      return;
    }
    if (action === 'snp-back') {
      state.view = 'list';
      state.editing = null;
      SNP.render(doc.getElementById('admin-content'));
      return;
    }
    if (action === 'snp-save') {
      var name = doc.getElementById('snp-name').value.trim();
      var code = doc.getElementById('snp-code').value.trim();
      var file = doc.getElementById('snp-file').value;
      var loc = doc.getElementById('snp-loc').value;
      var cat = doc.getElementById('snp-cat').value;
      var desc = doc.getElementById('snp-desc').value.trim();
      var customLine = loc === 'custom' ? parseInt(doc.getElementById('snp-custom-line').value) : null;

      if (!name || !code) {
        LSL.toast('Nombre y código son obligatorios.');
        return;
      }

      if (value) {
        // Editar
        var oldSnippet = S.snippets.get(value);
        S.snippets.addToHistory(value, oldSnippet.code).then(function () {
          S.snippets.update(value, name, code, loc, cat, desc).then(function () {
            LSL.toast('✓ Snippet actualizado');
            state.view = 'list';
            state.editing = null;
            SNP.render(doc.getElementById('admin-content'));
          }).catch(function (e) {
            LSL.toast('Error: ' + (e.message || 'No se pudo actualizar'));
          });
        });
      } else {
        // Crear
        S.snippets.create(name, code, file, loc, cat, desc).then(function () {
          LSL.toast('✓ Snippet creado');
          state.view = 'list';
          SNP.render(doc.getElementById('admin-content'));
        }).catch(function (e) {
          LSL.toast('Error: ' + (e.message || 'No se pudo crear'));
        });
      }
      return;
    }
    if (action === 'snp-del') {
      if (confirm('¿Eliminar este snippet?')) {
        S.snippets.delete(value).then(function () {
          LSL.toast('✓ Snippet eliminado');
          SNP.render(doc.getElementById('admin-content'));
        }).catch(function (e) {
          LSL.toast('Error: ' + (e.message || 'No se pudo eliminar'));
        });
      }
      return;
    }
    if (action === 'snp-restore') {
      var parts = value.split('|');
      var snippetId = parts[0];
      var histIndex = parseInt(parts[1]);
      var snippet = S.snippets.get(snippetId);
      if (snippet && snippet.history && snippet.history[histIndex]) {
        var oldCode = snippet.history[histIndex].code;
        if (confirm('¿Restaurar esta versión?')) {
          S.snippets.update(snippetId, snippet.name, oldCode, snippet.location, snippet.category, snippet.description).then(function () {
            LSL.toast('✓ Versión restaurada');
            state.view = 'list';
            SNP.render(doc.getElementById('admin-content'));
          });
        }
      }
      return;
    }
  };

  SNP.init = function () {
    S.snippets.list().then(function () {
      state.view = 'list';
      SNP.render(doc.getElementById('admin-content'));
    });
  };

})(window);
