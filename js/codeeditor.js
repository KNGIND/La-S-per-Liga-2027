/* La Súper Liga · codeeditor.js
   Sección "Código" del panel admin: ver y editar el código fuente de todos
   los archivos del proyecto, con borrador + vista previa (solo en este
   dispositivo) + publicar (a todo el mundo) + restaurar una versión anterior.
   Se descarga solo cuando el admin entra a esta sección — no pesa nada
   para nadie más, ni siquiera para el resto del panel admin. */
(function (w) {
  'use strict';
  var LSL = w.LSL, S = LSL.store, U = LSL.u, esc = U.esc, UI = LSL.ui, ic = UI.ic;
  var doc = document;
  var CE = LSL.codeEditor = {};

  /* ---------- catálogo de archivos editables ----------
     Cada uno con: categoría (para las pestañas), qué es, qué se puede tocar,
     y 2-3 sugerencias concretas. Si en el futuro agregás un archivo nuevo al
     proyecto, sumalo acá con estos mismos campos y aparece solo. */
  var FILES = [
    { path: 'index.html', cat: 'Estructura', name: 'index.html', desc: 'El esqueleto de la página: los contenedores vacíos que después llena el JavaScript, el bootloader del editor de código, y el sprite de íconos SVG.', tips: ['Agregar una meta-etiqueta o un ícono nuevo al sprite (cerca de "i-cursor")', 'Cambiar el <title> o la descripción para buscadores', 'Con cuidado: romper una etiqueta acá puede dejar la página en blanco — usá la Vista previa antes de publicar'] },
    { path: 'css/styles.css', cat: 'Diseño', name: 'styles.css', desc: 'Todos los estilos visuales de la app pública: colores, tipografías, tarjetas de partidos, tabla de posiciones, menú lateral, tema claro/oscuro.', tips: ['Cambiar --ac (color de acento) o --bg (fondo) en :root', 'Ajustar --r para esquinas más o menos redondeadas', 'Agregar una animación nueva con @keyframes'] },
    { path: 'css/admin.css', cat: 'Diseño', name: 'admin.css', desc: 'Estilos del panel de administración: el menú de tarjetas, los formularios, el editor de toque largo y esta misma pantalla de código.', tips: ['Cambiar los colores de las tarjetas del menú admin (.am-card.c1, .c2, etc.)', 'Ajustar el tamaño de fuente de los formularios'] },
    { path: 'css/onboard.css', cat: 'Diseño', name: 'onboard.css', desc: 'Estilos de la bienvenida (elegir nombre, foto, equipo) y el tutorial guiado.', tips: ['Cambiar la animación de transición entre pasos', 'Ajustar el tamaño de los botones de equipo'] },
    { path: 'js/store.js', cat: 'Datos', name: 'store.js', desc: 'El cerebro de datos: calcula la tabla de posiciones, guarda y sincroniza con Supabase, valida contraseñas. Sin esto, nada funciona.', tips: ['Cambiar cómo se calculan los puntos o el desempate en standings()', 'Agregar un campo nuevo al esquema de datos por defecto'], danger: true },
    { path: 'js/ui.js', cat: 'Diseño', name: 'ui.js', desc: 'Construye el HTML de cada pantalla: tarjetas de partidos, tabla de posiciones, tarjetas de noticias. Es lo que arma lo que se ve.', tips: ['Cambiar el formato de fecha u hora de las tarjetas de partido', 'Agregar un dato nuevo a la tarjeta de un partido o noticia'] },
    { path: 'js/app.js', cat: 'Comportamiento', name: 'app.js', desc: 'Arranque de la app, navegación entre pantallas, menú lateral, tema, y ahora también qué elementos son editables con el toque largo.', tips: ['Marcar un texto nuevo como editable agregando data-edit="..."', 'Cambiar el orden de los botones de la navegación inferior'], danger: true },
    { path: 'js/admin.js', cat: 'Comportamiento', name: 'admin.js', desc: 'Todo el panel de administración: el menú de tarjetas, los formularios de partidos/equipos/noticias, y esta sección de código.', tips: ['Agregar una categoría nueva al menú del panel', 'Cambiar el texto o el ícono de una tarjeta del menú'], danger: true },
    { path: 'js/edit.js', cat: 'Comportamiento', name: 'edit.js', desc: 'El editor de "toque largo": detecta cuándo mantenés presionado un elemento marcado y abre el panel para cambiarlo.', tips: ['Agregar un tipo de campo editable nuevo (además de texto/imagen/color)', 'Cambiar el tiempo de espera del toque largo (600ms)'] },
    { path: 'js/onboard.js', cat: 'Comportamiento', name: 'onboard.js', desc: 'La bienvenida obligatoria (nombre → foto → equipo) y el tutorial guiado con foco.', tips: ['Agregar un paso nuevo a la bienvenida', 'Cambiar el texto de alguno de los pasos'] },
    { path: 'js/config.js', cat: 'Datos', name: 'config.js', desc: 'La configuración de conexión: URL y clave de Supabase, cada cuánto revisa novedades, el ID de OneSignal.', tips: ['Cambiar pollSeconds para revisar cambios más o menos seguido'], danger: true },
    { path: 'data/data.js', cat: 'Datos', name: 'data.js', desc: 'Los datos de ejemplo que trae el proyecto (equipos, partidos, noticias) para el modo local, sin Supabase.', tips: ['Solo tiene sentido tocarlo si usás modo local — en modo nube esto no se ve, los datos reales están en Supabase'] },
    { path: 'sw.js', cat: 'Sistema', name: 'sw.js', desc: 'El Service Worker: decide qué se guarda en caché y qué se busca siempre de internet, para que la app funcione sin conexión y se actualice sola.', tips: ['Con mucho cuidado: un error acá puede hacer que la app no cargue hasta borrar caché'], danger: true }
  ];
  var CATS = ['Estructura', 'Diseño', 'Comportamiento', 'Datos', 'Sistema'];

  var state = { cat: null, path: null, loading: false, dirty: false, editorText: '' };

  function fileDef(path) { return FILES.filter(function (f) { return f.path === path; })[0]; }

  /* ---------- pantalla: lista de categorías ---------- */
  CE.catList = function () {
    var crashWarn = '';
    try {
      var c = JSON.parse(localStorage.getItem('lsl:code_last_crash') || 'null');
      if (c && c.at) {
        crashWarn = '<div class="ce-warn" style="margin-bottom:14px">' + ic('bolt') + ' La última vez que se cargó un código publicado, algo falló y la app tuvo que usar los archivos originales para no quedar rota. Revisá el archivo que hayas tocado más recientemente y probá de nuevo con "Probar en mi celular" antes de publicar.</div>';
        localStorage.removeItem('lsl:code_last_crash');
      }
    } catch (e) { }
    return crashWarn + '<p class="mut sm" style="margin-bottom:12px">Estos son todos los archivos que arman la app. Tocá una categoría para ver sus archivos. Los cambios que publiques acá se aplican a todo el mundo — usá siempre "Probar en mi celular" primero.</p>' +
      '<div class="adm-menu">' + CATS.map(function (c) {
        var n = FILES.filter(function (f) { return f.cat === c; }).length;
        var icon = { Estructura: 'book', Diseño: 'sliders', Comportamiento: 'bolt', Datos: 'db', Sistema: 'lock' }[c] || 'edit';
        return '<button class="am-card" data-a="ce-cat" data-v="' + esc(c) + '"><span class="am-ic">' + ic(icon) + '</span><span class="am-tx"><b>' + esc(c) + '</b><small>' + n + (n === 1 ? ' archivo' : ' archivos') + '</small></span><span class="am-go">' + ic('chev-r') + '</span></button>';
      }).join('') + '</div>';
  };

  /* ---------- pantalla: archivos de una categoría ---------- */
  CE.fileList = function (cat) {
    var files = FILES.filter(function (f) { return f.cat === cat; });
    return '<div class="adm-menu">' + files.map(function (f) {
      var row = CODE_ROW(f.path);
      var badge = '';
      if (row && row.draft != null) badge = '<span class="ce-badge draft">Borrador sin publicar</span>';
      else if (row && row.published != null) badge = '<span class="ce-badge pub">Publicado</span>';
      return '<button class="am-card" data-a="ce-file" data-v="' + esc(f.path) + '"><span class="am-ic">' + ic(f.danger ? 'lock' : 'edit') + '</span><span class="am-tx"><b>' + esc(f.name) + '</b><small>' + esc(f.desc.slice(0, 70)) + (f.desc.length > 70 ? '…' : '') + '</small>' + badge + '</span><span class="am-go">' + ic('chev-r') + '</span></button>';
    }).join('') + '</div>';
  };
  function CODE_ROW(path) { return (S.code.cache && S.code.cache[path]) || null; }

  /* ---------- pantalla: detalle + editor de un archivo ---------- */
  CE.fileDetail = function (path) {
    var f = fileDef(path); if (!f) return '<p class="mut">Archivo no encontrado.</p>';
    
    if (state.showAddForm) {
      return showAddCodeForm(path);
    }
    
    var row = CODE_ROW(path) || {};
    var hasDraft = row.draft != null;
    var hasPublished = row.published != null;
    var hist = row.history || [];
    return '' +
      '<section class="ce-info">' +
      '<p>' + esc(f.desc) + '</p>' +
      (f.danger ? '<p class="ce-warn">' + ic('bolt') + ' Este archivo es sensible: un error de sintaxis puede impedir que la app arranque para todos. Probá siempre en tu celular antes de publicar.</p>' : '') +
      (f.tips && f.tips.length ? '<div class="ce-tips"><b>Sugerencias de cambios</b><ul>' + f.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '') +
      '</section>' +
      '<div class="ce-status">' +
      (hasDraft ? '<span class="ce-badge draft">Tenés un borrador sin publicar</span>' : '<span class="ce-badge ' + (hasPublished ? 'pub' : 'none') + '">' + (hasPublished ? 'Publicado, sin borrador pendiente' : 'Nunca se editó — se usa el archivo original') + '</span>') +
      '</div>' +
      '<div class="ce-editorwrap"><div class="ce-gutter" id="ce-gutter"></div><textarea class="ce-editor" id="ce-editor" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea></div>' +
      '<div class="ce-actions">' +
      (fileDef(path) && fileDef(path).danger ? '<button class="btn ghost sm" data-a="ce-add-code">+ Agregar código</button>' : '') +
      '<button class="btn ghost sm" data-a="ce-discard">Descartar cambios</button>' +
      '<button class="btn ghost sm" data-a="ce-preview" id="ce-preview-btn">Probar en mi celular</button>' +
      '<button class="btn sm" data-a="ce-publish">Publicar para todos</button>' +
      '</div>' +
      (hist.length ? '<div class="ce-hist"><h3>Versiones anteriores</h3>' + hist.map(function (h, i) {
        return '<div class="ce-hist-row"><span>' + esc(new Date(h.at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) + '</span><button class="btn ghost sm" data-a="ce-restore" data-v="' + i + '">Restaurar esta</button></div>';
      }).join('') + '</div>' : '');
  };

  /* ---------- carga del contenido real en el textarea ---------- */
  function loadIntoEditor(path) {
    var ta = doc.getElementById('ce-editor'); if (!ta) return;
    ta.value = 'Cargando…'; ta.disabled = true;
    var row = CODE_ROW(path) || {};
    console.log('[CodeEditor] Cargando archivo:', path, 'Row:', row);
    var current = row.draft != null ? row.draft : row.published != null ? row.published : null;
    if (current != null) { 
      console.log('[CodeEditor] Usando datos de BD (draft o published)');
      fill(current); 
      return; 
    }
    // nunca se editó: traer el archivo original tal cual lo sirve el servidor
    console.log('[CodeEditor] Descargando archivo original del servidor:', path);
    fetch(path + '?raw=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : (console.warn('[CodeEditor] Fetch falló:', r.status), ''); })
      .then(fill)
      .catch(function (e) { console.error('[CodeEditor] Error fetch:', e); fill(''); });
    function fill(text) { ta.disabled = false; ta.value = text; state.editorText = text; state.dirty = false; syncGutter(); }
  }
  function syncGutter() {
    var ta = doc.getElementById('ce-editor'), g = doc.getElementById('ce-gutter'); if (!ta || !g) return;
    var n = (ta.value.match(/\n/g) || []).length + 1;
    var out = ''; for (var i = 1; i <= n; i++) out += i + '\n';
    g.textContent = out;
  }

  /* ---------- inserción inteligente de código ---------- */
  function analyzeCode(code) {
    var lines = code.split('\n');
    var firstLine = lines[0].trim();
    
    if (/^function\s+\w+/.test(firstLine)) return 'function';
    if (/^(var|let|const)\s+\w+/.test(firstLine)) return 'variable';
    if (/^(if|for|while|switch)\s*[\(\{]/.test(firstLine)) return 'statement';
    if (/^document\.addEventListener|^\$\(/.test(firstLine)) return 'listener';
    
    return 'other';
  }
  
  function findBestInsertLine(path, codeType) {
    var ta = doc.getElementById('ce-editor');
    if (!ta) return 0;
    
    var lines = ta.value.split('\n');
    var bestLine = lines.length;
    
    if (codeType === 'variable') {
      for (var i = 0; i < lines.length && i < 20; i++) {
        if (!/^\/\/|^\/\*|^import|^var|^let|^const|^\s*$/.test(lines[i].trim())) {
          bestLine = i;
          break;
        }
      }
    } else if (codeType === 'function') {
      bestLine = Math.max(0, lines.length - 2);
    } else if (codeType === 'listener') {
      for (var i = lines.length - 1; i > 0; i--) {
        if (/addEventListener/.test(lines[i])) {
          bestLine = i + 1;
          break;
        }
      }
    }
    
    return Math.max(0, bestLine);
  }

  /* ---------- guardar / publicar / restaurar ---------- */
  function currentPath() { return state.path; }
  function saveDraftNow(cb) {
    var path = currentPath(); var ta = doc.getElementById('ce-editor'); if (!path || !ta) return;
    LSL.toast('Guardando borrador…', 900);
    S.code.saveDraft(path, ta.value).then(function () { state.dirty = false; if (cb) cb(); }).catch(function (e) { LSL.toast(e.message || 'No se pudo guardar.'); });
  }
  CE.onAction = function (action, v, render) {
    if (action === 'ce-add-code') {
      state.showAddForm = true;
      render();
      return;
    }
    if (action === 'ac-cancel') {
      state.showAddForm = false;
      render();
      return;
    }
    if (action === 'ac-insert') {
      var codeInput = doc.querySelector('.ce-add-code-textarea');
      var typeRadio = doc.querySelector('input[name="acCodeType"]:checked');
      var locRadio = doc.querySelector('input[name="acLocation"]:checked');
      
      if (!codeInput || !codeInput.value.trim()) {
        LSL.toast('Pegá algo de código primero.');
        return;
      }
      
      var userCode = codeInput.value;
      var selectedType = typeRadio ? typeRadio.value : 'auto';
      var selectedLoc = locRadio ? locRadio.value : 'auto';
      var codeType = selectedType === 'auto' ? analyzeCode(userCode) : selectedType;
      var insertLine = selectedLoc === 'auto' ? findBestInsertLine(state.path, codeType) : (selectedLoc === 'start' ? 1 : null);
      
      var ta = doc.getElementById('ce-editor');
      if (!ta) return;
      
      var lines = ta.value.split('\n');
      if (insertLine === null) {
        lines.push('');
        lines.push(userCode);
      } else {
        lines.splice(insertLine, 0, '');
        lines.splice(insertLine + 1, 0, userCode);
      }
      
      ta.value = lines.join('\n');
      state.dirty = true;
      state.showAddForm = false;
      syncGutter();
      LSL.toast('✓ Código insertado. Presioná Guardar cuando esté listo.');
      render();
      return;
    }
    if (action === 'ce-cat') { state.cat = v; state.path = null; render(); return; }
    if (action === 'ce-file') {
      state.path = v; state.loading = true; render();
      S.code.list()
        .then(function () { state.loading = false; render(); setTimeout(function () { loadIntoEditor(v); }, 0); })
        .catch(function (e) {
          console.error('[CodeEditor] Error al cargar lista:', e);
          state.loading = false;
          state.path = null;
          LSL.toast('Error: ' + (e.message || 'No se pudo cargar el archivo. Revisá la consola (F12).'), 3000);
          render();
        });
      return;
    }
    if (action === 'ce-back-cats') { state.cat = null; render(); return; }
    if (action === 'ce-back-files') { state.path = null; render(); return; }
    if (action === 'ce-discard') {
      var path = currentPath(); if (!path) return;
      if (!confirm('¿Descartar los cambios sin publicar de este archivo?')) return;
      S.code.discardDraft(path).then(function () { S.code.setPreview(false); LSL.toast('Borrador descartado.'); loadIntoEditor(path); render(); });
      return;
    }
    if (action === 'ce-preview') {
      var path = currentPath(); var ta = doc.getElementById('ce-editor'); if (!path || !ta) return;
      saveDraftNow(function () {
        S.code.setPreview(true);
        LSL.toast('Guardado. Recargá la página para probarlo en este celular.', 3200);
        render();
      });
      return;
    }
    if (action === 'ce-publish') {
      var path = currentPath(); var ta = doc.getElementById('ce-editor'); if (!path || !ta) return;
      var f = fileDef(path);
      if (!confirm('¿Publicar este cambio para TODOS los que usan la app? ' + (f && f.danger ? 'Este archivo es sensible: si tiene un error, revisalo primero con "Probar en mi celular".' : ''))) return;
      LSL.toast('Guardando y publicando…', 1200);
      S.code.saveDraft(path, ta.value).then(function () { return S.code.publish(path); }).then(function () {
        LSL.toast('Publicado. Ya se está aplicando a todos.'); render();
      }).catch(function (e) { LSL.toast(e.message || 'No se pudo publicar.'); });
      return;
    }
    if (action === 'ce-restore') {
      var path = currentPath(); if (!path) return;
      if (!confirm('¿Restaurar esta versión anterior? Se publica de inmediato para todos.')) return;
      LSL.toast('Restaurando…', 1200);
      S.code.restore(path, +v).then(function () { LSL.toast('Restaurado y publicado.'); loadIntoEditor(path); render(); }).catch(function (e) { LSL.toast(e.message || 'No se pudo restaurar.'); });
      return;
    }
  };

  /* ---------- formulario para agregar código ---------- */
  function showAddCodeForm(path) {
    var f = fileDef(path);
    if (!f || !f.danger) return '';
    
    var tips = {
      auto: 'Auto-detecta qué tipo de código es. Recomendado si no estás seguro.',
      variable: 'Las variables van ARRIBA del archivo, al inicio. Ejemplo: var miVar = 123;',
      function: 'Las funciones van al FINAL del archivo. Ejemplo: function miFuncion() { ... }',
      listener: 'Los listeners van con otros addEventListener(). Al final. Ejemplo: document.addEventListener("click", ...);',
      other: 'Vos decidí dónde ponerlo: inicio o final.'
    };
    
    return '' +
      '<div class="ce-add-code-form">' +
      '<h3>Agregar código a ' + esc(f.name) + '</h3>' +
      '<p class="mut sm">Pegá el código abajo y el editor te ayudará a elegir dónde ponerlo.</p>' +
      
      '<label><b>¿Qué tipo de código es?</b></label>' +
      '<div class="ce-radio-group">' +
      '<label><input type="radio" name="acCodeType" value="auto" checked> Auto-detectar (recomendado)</label>' +
      '<label><input type="radio" name="acCodeType" value="variable"> Variable/Constante (var x = ...)</label>' +
      '<label><input type="radio" name="acCodeType" value="function"> Función (function foo() { ... })</label>' +
      '<label><input type="radio" name="acCodeType" value="listener"> Event Listener (addEventListener)</label>' +
      '<label><input type="radio" name="acCodeType" value="other"> No sé, déjame elegir</label>' +
      '</div>' +
      
      '<label><b>Pegá el código acá:</b></label>' +
      '<textarea class="ce-add-code-textarea" placeholder="function miFunc() {&#10;  // código aquí&#10;}"></textarea>' +
      
      '<div class="ce-add-code-tip" id="ce-add-code-tip">' + tips.auto + '</div>' +
      
      '<label><b>¿Dónde lo querés?</b></label>' +
      '<div class="ce-radio-group">' +
      '<label><input type="radio" name="acLocation" value="auto" checked> Donde corresponde (inteligente)</label>' +
      '<label><input type="radio" name="acLocation" value="start"> Al inicio del archivo</label>' +
      '<label><input type="radio" name="acLocation" value="end"> Al final del archivo (seguro)</label>' +
      '</div>' +
      
      '<div class="ce-add-code-actions">' +
      '<button class="btn ghost sm" data-a="ac-cancel">Cancelar</button>' +
      '<button class="btn sm" data-a="ac-insert">Insertar en el editor</button>' +
      '</div>' +
      '</div>';
  }

  CE.afterRender = function () {
    var ta = doc.getElementById('ce-editor'); if (!ta) return;
    // el textarea es nuevo (se reconstruyó el HTML): rellenarlo con el contenido real antes de habilitar edición
    if (state.path && ta.value === '') loadIntoEditor(state.path);
    syncGutter();
    ta.addEventListener('input', function () { state.dirty = true; syncGutter(); });
    ta.addEventListener('scroll', function () { var g = doc.getElementById('ce-gutter'); if (g) g.scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') { e.preventDefault(); var s = ta.selectionStart, en = ta.selectionEnd; ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en); ta.selectionStart = ta.selectionEnd = s + 2; state.dirty = true; syncGutter(); }
    });
    var pb = doc.getElementById('ce-preview-btn');
    if (pb && S.code.previewOn() && CODE_ROW(state.path) && CODE_ROW(state.path).draft != null) pb.textContent = 'Ya lo estás probando en este celular';
    
    // Actualizar tips cuando cambia el tipo de código
    var codeTypeRadios = doc.querySelectorAll('input[name="acCodeType"]');
    var tipElement = doc.getElementById('ce-add-code-tip');
    
    if (codeTypeRadios && tipElement) {
      var tips = {
        auto: 'Auto-detecta qué tipo de código es. Recomendado si no estás seguro.',
        variable: 'Las variables van ARRIBA del archivo, al inicio. Ejemplo: var miVar = 123;',
        function: 'Las funciones van al FINAL del archivo. Ejemplo: function miFuncion() { ... }',
        listener: 'Los listeners van con otros addEventListener(). Al final. Ejemplo: document.addEventListener("click", ...);',
        other: 'Vos decidí dónde ponerlo: inicio o final.'
      };
      
      codeTypeRadios.forEach(function(radio) {
        radio.addEventListener('change', function() {
          tipElement.textContent = tips[this.value] || '';
        });
      });
    }
  };

  CE.cats = CATS; CE.files = FILES; CE.state = state; CE.fileDef = fileDef;
})(window);
