/* La Súper Liga · codeeditor.js
   Sección "Código" del panel admin: agregar fragmentos de HTML/CSS/JS a
   cualquier archivo del proyecto SIN tocar manualmente el resto — vos
   pegás el pedacito de código y se suma solo, siempre al final, envuelto
   en un marcador para poder identificarlo y sacarlo después.
   Sigue habiendo borrador (vista previa solo en este dispositivo) +
   publicar (para todo el mundo) + restaurar una versión anterior completa,
   por si algo sale mal.
   Se descarga solo cuando el admin entra a esta sección — no pesa nada
   para nadie más, ni siquiera para el resto del panel admin. */
(function (w) {
  'use strict';
  var LSL = w.LSL, S = LSL.store, U = LSL.u, esc = U.esc, UI = LSL.ui, ic = UI.ic;
  var doc = document;
  var CE = LSL.codeEditor = {};

  /* ---------- catálogo de archivos editables ----------
     Cada uno con: categoría (para las pestañas), qué es, y si es sensible.
     Si en el futuro agregás un archivo nuevo al proyecto, sumalo acá con
     estos mismos campos y aparece solo. */
  var FILES = [
    { path: 'index.html', cat: 'Estructura', name: 'index.html', desc: 'El esqueleto de la página: los contenedores vacíos que después llena el JavaScript, el bootloader del editor de código, y el sprite de íconos SVG. Los fragmentos que agregues acá van justo antes de que cierre la página.', tips: ['Un banner, un aviso o un bloque de texto nuevo', 'Una meta-etiqueta nueva para buscadores', 'Con cuidado: un <div> mal cerrado puede afectar lo que viene después — probá siempre en tu celular antes de publicar'] },
    { path: 'css/styles.css', cat: 'Diseño', name: 'styles.css', desc: 'Todos los estilos visuales de la app pública: colores, tipografías, tarjetas de partidos, tabla de posiciones, menú lateral, tema claro/oscuro. Como el CSS que agregues va al final, gana por encima de lo anterior (cascada) sin romper nada.', tips: ['Redefinir :root { --ac: #tu-color; } para cambiar el color de acento', 'Agregar una animación nueva con @keyframes', 'Un estilo nuevo para alguna clase, ej: .card { border-radius: 20px; }'] },
    { path: 'css/admin.css', cat: 'Diseño', name: 'admin.css', desc: 'Estilos del panel de administración: el menú de tarjetas, los formularios, el editor de toque largo y esta misma pantalla.', tips: ['Un color nuevo para alguna tarjeta del menú admin', 'Ajustar tamaños de fuente de los formularios'] },
    { path: 'css/onboard.css', cat: 'Diseño', name: 'onboard.css', desc: 'Estilos de la bienvenida (elegir nombre, foto, equipo) y el tutorial guiado.', tips: ['Ajustar el tamaño de los botones de equipo', 'Un color nuevo para algún paso de la bienvenida'] },
    { path: 'js/store.js', cat: 'Datos', name: 'store.js', desc: 'El cerebro de datos: calcula la tabla de posiciones, guarda y sincroniza con Supabase, valida contraseñas. Sin esto, nada funciona.', tips: ['Un fragmento JS se ejecuta apenas termina de cargar este archivo — sirve para "engancharte" a algo que S. (LSL.store) ya deja disponible'], danger: true },
    { path: 'js/ui.js', cat: 'Diseño', name: 'ui.js', desc: 'Construye el HTML de cada pantalla: tarjetas de partidos, tabla de posiciones, tarjetas de noticias. Es lo que arma lo que se ve.', tips: ['Un fragmento JS que reescriba alguna función de LSL.ui después de que se cargue'] },
    { path: 'js/app.js', cat: 'Comportamiento', name: 'app.js', desc: 'Arranque de la app, navegación entre pantallas, menú lateral, tema, y qué elementos son editables con el toque largo.', tips: ['Un pequeño ajuste de comportamiento que se ejecute al arrancar'], danger: true },
    { path: 'js/admin.js', cat: 'Comportamiento', name: 'admin.js', desc: 'Todo el panel de administración: el menú de tarjetas, los formularios de partidos/equipos/noticias, y esta sección de código.', tips: ['Un ajuste chico al panel admin'], danger: true },
    { path: 'js/edit.js', cat: 'Comportamiento', name: 'edit.js', desc: 'El editor de "toque largo": detecta cuándo mantenés presionado un elemento marcado y abre el panel para cambiarlo.', tips: [] },
    { path: 'js/onboard.js', cat: 'Comportamiento', name: 'onboard.js', desc: 'La bienvenida obligatoria (nombre → foto → equipo) y el tutorial guiado con foco.', tips: [] },
    { path: 'js/config.js', cat: 'Datos', name: 'config.js', desc: 'La configuración de conexión: URL y clave de Supabase, cada cuánto revisa novedades, el ID de OneSignal.', tips: [], danger: true },
    { path: 'data/data.js', cat: 'Datos', name: 'data.js', desc: 'Los datos de ejemplo que trae el proyecto (equipos, partidos, noticias) para el modo local, sin Supabase.', tips: ['Solo tiene sentido tocarlo si usás modo local — en modo nube esto no se ve'] }
  ];
  var CATS = ['Estructura', 'Diseño', 'Comportamiento', 'Datos'];

  var state = { cat: null, path: null, loading: false, adding: false };

  function fileDef(path) { return FILES.filter(function (f) { return f.path === path; })[0]; }
  function CODE_ROW(path) { return (S.code.cache && S.code.cache[path]) || null; }
  function currentPath() { return state.path; }
  /* Lista de fragmentos "activa" para mostrar/editar: la del borrador si hay
     uno pendiente, si no la publicada. */
  function activeSnippets(row) { row = row || {}; return row.draft != null ? (row.draft_snippets || []) : (row.snippets || []); }

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
    return crashWarn + '<p class="mut sm" style="margin-bottom:12px">Estos son todos los archivos que arman la app. Tocá una categoría para ver sus archivos, elegí uno, y agregale el código que quieras — se suma solo, no hace falta que sepas dónde va. Los cambios que publiques se aplican a todo el mundo, así que usá siempre "Probar en mi celular" primero.</p>' +
      '<div class="adm-menu">' + CATS.map(function (c) {
        var n = FILES.filter(function (f) { return f.cat === c; }).length;
        var icon = { Estructura: 'book', Diseño: 'sliders', Comportamiento: 'bolt', Datos: 'db' }[c] || 'edit';
        return '<button class="am-card" data-a="ce-cat" data-v="' + esc(c) + '"><span class="am-ic">' + ic(icon) + '</span><span class="am-tx"><b>' + esc(c) + '</b><small>' + n + (n === 1 ? ' archivo' : ' archivos') + '</small></span><span class="am-go">' + ic('chev-r') + '</span></button>';
      }).join('') + '</div>';
  };

  /* ---------- pantalla: archivos de una categoría ---------- */
  CE.fileList = function (cat) {
    var files = FILES.filter(function (f) { return f.cat === cat; });
    return '<div class="adm-menu">' + files.map(function (f) {
      var row = CODE_ROW(f.path);
      var n = row ? activeSnippets(row).length : 0;
      var badge = '';
      if (row && row.draft != null) badge = '<span class="ce-badge draft">Sin publicar' + (n ? ' · ' + n + (n === 1 ? ' fragmento' : ' fragmentos') : '') + '</span>';
      else if (n) badge = '<span class="ce-badge pub">' + n + (n === 1 ? ' fragmento agregado' : ' fragmentos agregados') + '</span>';
      return '<button class="am-card" data-a="ce-file" data-v="' + esc(f.path) + '"><span class="am-ic">' + ic(f.danger ? 'lock' : 'edit') + '</span><span class="am-tx"><b>' + esc(f.name) + '</b><small>' + esc(f.desc.slice(0, 70)) + (f.desc.length > 70 ? '…' : '') + '</small>' + badge + '</span><span class="am-go">' + ic('chev-r') + '</span></button>';
    }).join('') + '</div>';
  };

  /* ---------- helpers de presentación ---------- */
  function codePreview(code) {
    var t = String(code || '').replace(/\s+/g, ' ').trim();
    return t.length > 90 ? t.slice(0, 90) + '…' : (t || '(vacío)');
  }
  function timeAgo(iso) {
    var d = new Date(iso), diff = Math.max(0, Date.now() - d.getTime()), m = Math.round(diff / 60000);
    if (m < 1) return 'recién agregado';
    if (m < 60) return 'hace ' + m + ' min';
    var h = Math.round(m / 60); if (h < 24) return 'hace ' + h + (h === 1 ? ' hora' : ' horas');
    var dd = Math.round(h / 24); return 'hace ' + dd + (dd === 1 ? ' día' : ' días');
  }
  function snippetListHTML(list) {
    if (!list || !list.length) return '<div class="empty" style="margin:4px 0 14px"><b>Todavía no agregaste nada acá.</b><span>Los fragmentos que sumes van a aparecer en esta lista, en el orden en que los agregaste.</span></div>';
    return '<div class="ce-sn-list">' + list.map(function (s) {
      return '<div class="ce-sn-row"><div class="ce-sn-code">' + esc(codePreview(s.code)) + '</div><div class="ce-sn-meta"><span>' + esc(timeAgo(s.at)) + '</span><button class="btn ghost sm" data-a="ce-sn-remove" data-v="' + esc(s.id) + '">' + ic('trash') + ' Quitar</button></div></div>';
    }).join('') + '</div>';
  }
  function addSheetHTML() {
    return '<div class="ce-sn-new">' +
      '<p class="mut sm">Pegá o escribí el código. Se agrega automáticamente al final del archivo — no hace falta que sepas dónde va ni tocar el resto.</p>' +
      '<div class="ce-editorwrap sm"><textarea class="ce-editor" id="ce-sn-ta" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="Pegá acá tu código…"></textarea></div>' +
      '<div class="ce-actions"><button class="btn ghost sm" data-a="ce-sn-cancel">Cancelar</button><button class="btn sm" data-a="ce-sn-save">' + ic('plus') + ' Agregar</button></div>' +
      '</div>';
  }

  /* ---------- pantalla: detalle de un archivo (lista de fragmentos) ---------- */
  CE.fileDetail = function (path) {
    var f = fileDef(path); if (!f) return '<p class="mut">Archivo no encontrado.</p>';
    var row = CODE_ROW(path) || {};
    var hasDraft = row.draft != null;
    var hist = row.history || [];
    var list = activeSnippets(row);
    return '' +
      '<section class="ce-info">' +
      '<p>' + esc(f.desc) + '</p>' +
      (f.danger ? '<p class="ce-warn">' + ic('bolt') + ' Este archivo es sensible: un error puede impedir que la app arranque para todos. Probá siempre "Probar en mi celular" antes de publicar.</p>' : '') +
      (f.tips && f.tips.length ? '<div class="ce-tips"><b>Ideas de fragmentos</b><ul>' + f.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '') +
      '</section>' +
      '<div class="ce-status">' +
      (hasDraft ? '<span class="ce-badge draft">Tenés cambios sin publicar</span>' : '<span class="ce-badge ' + (list.length ? 'pub' : 'none') + '">' + (list.length ? 'Publicado, sin cambios pendientes' : 'Nunca se tocó — se usa el archivo original') + '</span>') +
      '</div>' +
      snippetListHTML(list) +
      (state.adding ? addSheetHTML() : '<div class="ce-actions"><button class="btn ghost sm" data-a="ce-sn-add">' + ic('plus') + ' Agregar fragmento</button></div>') +
      '<div class="ce-actions">' +
      '<button class="btn ghost sm" data-a="ce-discard">Descartar cambios</button>' +
      '<button class="btn ghost sm" data-a="ce-preview" id="ce-preview-btn">Probar en mi celular</button>' +
      '<button class="btn sm" data-a="ce-publish">Publicar para todos</button>' +
      '</div>' +
      (hist.length ? '<div class="ce-hist"><h3>Versiones publicadas anteriores (todo el archivo)</h3><p class="mut sm">Por si algo sale mal: esto vuelve el archivo entero a como estaba antes, sin tus fragmentos.</p>' + hist.map(function (h, i) {
        return '<div class="ce-hist-row"><span>' + esc(new Date(h.at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) + '</span><button class="btn ghost sm" data-a="ce-restore" data-v="' + i + '">Restaurar esta</button></div>';
      }).join('') + '</div>' : '');
  };

  /* ---------- validación best-effort antes de agregar un fragmento ----------
     No es un compilador completo (nada lo es para HTML/CSS sueltos), pero
     atrapa el error más común de cada tipo antes de que llegue a publicarse. */
  function validateSnippet(path, code) {
    code = String(code || '').trim();
    if (!code) return { block: 'Escribí algo antes de agregarlo.' };
    if (/\.js$/i.test(path)) {
      try { new Function(code); } catch (e) { return { block: 'Ese código JavaScript tiene un error de sintaxis: ' + e.message }; }
    } else if (/\.html?$/i.test(path)) {
      try { doc.createRange().createContextualFragment(code); } catch (e) { return { block: 'Ese HTML no se pudo interpretar — revisá que las etiquetas estén bien cerradas.' }; }
    } else if (/\.css$/i.test(path)) {
      try {
        var st = doc.createElement('style'); st.textContent = code;
        var host = doc.createElement('div'); host.style.cssText = 'position:absolute;left:-9999px'; host.appendChild(st); doc.body.appendChild(host);
        var n = st.sheet ? st.sheet.cssRules.length : 0;
        host.parentNode.removeChild(host);
        if (n === 0) return { confirm: 'Ese CSS no generó ninguna regla válida (¿faltará una llave { } o un punto y coma?). ¿Agregarlo igual?' };
      } catch (e) { /* CSS es muy tolerante — no bloqueamos por esto */ }
    }
    return {};
  }

  /* ---------- acciones ---------- */
  CE.onAction = function (action, v, render) {
    if (action === 'ce-cat') { state.cat = v; state.path = null; state.adding = false; render(); return; }
    if (action === 'ce-file') {
      state.path = v; state.loading = true; state.adding = false; render();
      S.code.list().then(function () { state.loading = false; render(); });
      return;
    }
    if (action === 'ce-back-cats') { state.cat = null; state.adding = false; render(); return; }
    if (action === 'ce-back-files') { state.path = null; state.adding = false; render(); return; }

    if (action === 'ce-sn-add') { state.adding = true; render(); return; }
    if (action === 'ce-sn-cancel') { state.adding = false; render(); return; }
    if (action === 'ce-sn-save') {
      var path = currentPath(); var ta = doc.getElementById('ce-sn-ta'); if (!path || !ta) return;
      var code = ta.value;
      var v2 = validateSnippet(path, code);
      if (v2.block) { LSL.toast(v2.block, 3400); return; }
      if (v2.confirm && !confirm(v2.confirm)) return;
      LSL.toast('Agregando…', 900);
      S.code.addSnippet(path, code).then(function () {
        state.adding = false;
        LSL.toast('Agregado. Con "Probar en mi celular" lo ves antes de publicarlo.', 3400);
        render();
      }).catch(function (e) { LSL.toast(e.message || 'No se pudo agregar.'); });
      return;
    }
    if (action === 'ce-sn-remove') {
      var path = currentPath(); if (!path) return;
      if (!confirm('¿Quitar este fragmento? Se saca solo él, el resto queda igual.')) return;
      LSL.toast('Quitando…', 900);
      S.code.removeSnippet(path, v).then(function () { LSL.toast('Quitado.'); render(); }).catch(function (e) { LSL.toast(e.message || 'No se pudo quitar.'); });
      return;
    }

    if (action === 'ce-discard') {
      var path = currentPath(); if (!path) return;
      var row = CODE_ROW(path);
      if (!row || row.draft == null) { LSL.toast('No hay cambios sin publicar.'); return; }
      if (!confirm('¿Descartar los cambios sin publicar de este archivo?')) return;
      S.code.discardDraft(path).then(function () { S.code.setPreview(false); LSL.toast('Descartado.'); render(); });
      return;
    }
    if (action === 'ce-preview') {
      var path = currentPath(); if (!path) return;
      var row = CODE_ROW(path);
      if (!row || row.draft == null) { LSL.toast('No hay cambios sin publicar para probar.'); return; }
      S.code.setPreview(true);
      LSL.toast('Listo. Recargá la página para probarlo en este celular.', 3200);
      render();
      return;
    }
    if (action === 'ce-publish') {
      var path = currentPath(); if (!path) return;
      var row = CODE_ROW(path);
      if (!row || row.draft == null) { LSL.toast('No hay cambios sin publicar.'); return; }
      var f = fileDef(path);
      if (!confirm('¿Publicar este cambio para TODOS los que usan la app? ' + (f && f.danger ? 'Este archivo es sensible: si algo falla, restaurá una versión anterior desde acá mismo.' : ''))) return;
      LSL.toast('Publicando…', 1200);
      S.code.publish(path).then(function () { LSL.toast('Publicado. Ya se está aplicando a todos.'); render(); }).catch(function (e) { LSL.toast(e.message || 'No se pudo publicar.'); });
      return;
    }
    if (action === 'ce-restore') {
      var path = currentPath(); if (!path) return;
      if (!confirm('¿Restaurar esta versión anterior? Se publica de inmediato para todos y se pierden los fragmentos actuales.')) return;
      LSL.toast('Restaurando…', 1200);
      S.code.restore(path, +v).then(function () { LSL.toast('Restaurado y publicado.'); render(); }).catch(function (e) { LSL.toast(e.message || 'No se pudo restaurar.'); });
      return;
    }
  };

  CE.afterRender = function () {
    var ta = doc.getElementById('ce-sn-ta');
    if (ta) {
      ta.focus();
      ta.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') { e.preventDefault(); var s = ta.selectionStart, en = ta.selectionEnd; ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en); ta.selectionStart = ta.selectionEnd = s + 2; }
      });
    }
    var pb = doc.getElementById('ce-preview-btn');
    if (pb && S.code.previewOn() && CODE_ROW(state.path) && CODE_ROW(state.path).draft != null) pb.textContent = 'Ya lo estás probando en este celular';
  };

  CE.cats = CATS; CE.files = FILES; CE.state = state; CE.fileDef = fileDef;
})(window);
