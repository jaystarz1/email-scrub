// Email Thread Scrubber browser extension: toolbar button and right-click entry.
// Nothing here touches the network. Selected text is handed to the scrubber page
// through in-memory session storage and deleted as soon as the page reads it.
'use strict';
var api = globalThis.browser || globalThis.chrome;
var PAGE = 'scrubber.html';
var MENU = 'scrub-selection';

function createMenu() {
  Promise.resolve(api.contextMenus.removeAll()).then(function () {
    api.contextMenus.create({ id: MENU, title: api.i18n.getMessage('menuScrub'), contexts: ['selection'] });
  });
}
api.runtime.onInstalled.addListener(createMenu);
if (api.runtime.onStartup) api.runtime.onStartup.addListener(createMenu);

function openScrubber(text) {
  if (!text) return api.tabs.create({ url: api.runtime.getURL(PAGE) });
  var key = 'pending-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  var item = {}; item[key] = text;
  return api.storage.session.set(item).then(function () {
    return api.tabs.create({ url: api.runtime.getURL(PAGE) + '#' + key });
  });
}

// The context menu's selectionText collapses line breaks in Chromium, which loses
// the From/To/Sent header lines the scrubber relies on. Read the selection from the
// page itself (allowed by activeTab after the right-click) and fall back to
// selectionText where the frame can't be read (for example a cross-origin frame).
function readSelection(info, tab) {
  var fallback = info.selectionText || '';
  if (!tab || tab.id === undefined || !api.scripting) return Promise.resolve(fallback);
  var target = { tabId: tab.id };
  if (info.frameId) target.frameIds = [info.frameId];
  return api.scripting.executeScript({
    target: target,
    func: function () { var s = window.getSelection(); return s ? s.toString() : ''; }
  }).then(function (results) {
    var text = results && results[0] && results[0].result;
    return typeof text === 'string' && text.trim() ? text : fallback;
  }, function () { return fallback; });
}

api.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId !== MENU) return;
  readSelection(info, tab).then(openScrubber);
});

api.action.onClicked.addListener(function () { openScrubber(''); });

// Test hook: lets the automated suite drive the same path as a right-click.
globalThis.EmailScrubExtension = { openScrubber: openScrubber, readSelection: readSelection };
