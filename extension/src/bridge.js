// Runs last on scrubber.html inside the extension. If the page was opened from the
// right-click menu, take the selected text out of session storage (deleting it),
// put it in the input box and scrub it. The key is stripped from the address bar.
(function () {
  'use strict';
  var api = globalThis.browser || globalThis.chrome;
  var key = location.hash.slice(1);
  if (!/^pending-[a-z0-9]+$/.test(key) || !api || !api.storage || !api.storage.session) return;
  history.replaceState(null, '', location.pathname);
  api.storage.session.get(key).then(function (items) {
    api.storage.session.remove(key);
    var text = items && items[key];
    if (typeof text !== 'string' || !text) return;
    var input = document.getElementById('input');
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('go').click();
  });
})();
