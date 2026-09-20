/* Compatibility loader: the source file remains at the repository root. */
(function () {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '../app.js', false);
  xhr.send(null);
  if (xhr.status >= 200 && xhr.status < 300) (0, eval)(xhr.responseText + '\n//# sourceURL=../app.js');
  else throw new Error('No se pudo cargar ../app.js (' + xhr.status + ')');
}());
