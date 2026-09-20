/* Compatibility loader: the source file remains at the repository root. */
(function () {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '../ui.js', false);
  xhr.send(null);
  if (xhr.status >= 200 && xhr.status < 300) (0, eval)(xhr.responseText + '\n//# sourceURL=../ui.js');
  else throw new Error('No se pudo cargar ../ui.js (' + xhr.status + ')');
}());
