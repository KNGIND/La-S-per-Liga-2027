/* Compatibility loader: the admin source remains at the repository root. */
(function () {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '../admin.js', false);
  xhr.send(null);
  if (xhr.status >= 200 && xhr.status < 300) (0, eval)(xhr.responseText + '\n//# sourceURL=../admin.js');
  else throw new Error('No se pudo cargar ../admin.js (' + xhr.status + ')');
}());
