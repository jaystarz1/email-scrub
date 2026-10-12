// Installs extension/dist firefox zip as a temporary add-on in headless Firefox through
// geckodriver (WebDriver HTTP, no client library) and drives the toolbar page and the
// right-click hand-off. Run: node extension/tests/firefox.test.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';

const dist = new URL('../dist/', import.meta.url).pathname;
const zip = fs.readdirSync(dist).find(f => /^email-scrub-firefox-.*\.zip$/.test(f));
const manifest = JSON.parse(fs.readFileSync(dist + 'firefox/manifest.json'));
const uuid = '4b1d6c1e-5c2a-4f3e-9d61-0e5c3a1b2c7d';
const base = 'moz-extension://' + uuid + '/scrubber.html';
const thread = 'From: Mira Quill <mira.quill@example.com>\nSent: March 3, 2026 9:14 AM\nTo: Nolan Vale\nSubject: Lantern\n\nHi Nolan,\n\nCall me at 613-555-0100.\n\nRegards,\nMira';

const port = await new Promise(r => { const t = net.createServer().listen(0, '127.0.0.1', () => { const p = t.address().port; t.close(() => r(p)); }); });
const driver = spawn('geckodriver', ['--port', String(port), '--allow-system-access'], { stdio: 'ignore' });
const url = 'http://127.0.0.1:' + port;
async function call(method, p, body) {
  const r = await fetch(url + p, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  const j = await r.json();
  if (j.value && j.value.error) throw new Error(j.value.error + ': ' + j.value.message);
  return j.value;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
let sid;
try {
  for (let i = 0; i < 50; i++) { try { await fetch(url + '/status'); break; } catch { await wait(100); } }
  const s = await call('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': {
    args: ['-headless'], prefs: { 'extensions.webextensions.uuids': JSON.stringify({ [manifest.browser_specific_settings.gecko.id]: uuid }) } } } } });
  sid = s.sessionId; const S = '/session/' + sid;
  const version = s.capabilities.browserVersion;
  await call('POST', S + '/moz/addon/install', { addon: fs.readFileSync(dist + zip).toString('base64'), temporary: true });
  const run = (script, args = []) => call('POST', S + '/execute/sync', { script, args });
  const runAsync = (script, args = []) => call('POST', S + '/execute/async', { script, args });
  const outText = "var c=document.getElementById('out').cloneNode(true);c.querySelectorAll('.sr-only,.review-controls').forEach(function(n){n.remove();});return c.textContent;";

  // Marionette refuses moz-extension:// navigation from content, so open the tab from chrome.
  const start = await call('GET', S + '/window/handles');
  await call('POST', S + '/moz/context', { context: 'chrome' });
  await run("gBrowser.selectedTab = gBrowser.addTab(arguments[0], { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });", [base]);
  await call('POST', S + '/moz/context', { context: 'content' });
  let tabs = start;
  for (let i = 0; i < 50 && tabs.length === start.length; i++) { await wait(100); tabs = await call('GET', S + '/window/handles'); }
  await call('POST', S + '/window', { handle: tabs.find(h => !start.includes(h)) });
  for (let i = 0; i < 50 && await run('return document.readyState') !== 'complete'; i++) await wait(100);
  assert.equal(await call('GET', S + '/title'), 'Email Thread Scrubber');
  await run("document.getElementById('demo').click();");
  assert.match(await run(outText), /<CLIENT>|<PERSON-1>|<ME>/);
  await run("var i=document.getElementById('input');i.value=arguments[0];i.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('go').click();", [thread]);
  assert.match(await run(outText), /<PHONE>/);
  await run("document.getElementById('me').value='Mira Quill';document.getElementById('go').click();");
  await call('POST', S + '/refresh', {});
  assert.equal(await run("return document.getElementById('me').value"), 'Mira Quill');

  // Right-click hand-off, through the background page's own function.
  const before = await call('GET', S + '/window/handles');
  const sent = await runAsync("var text=arguments[0],done=arguments[1];browser.runtime.getBackgroundPage().then(function(bg){return bg.EmailScrubExtension.openScrubber(text);}).then(function(){done('ok');},function(e){done('ERR '+e);});", [thread]);
  assert.equal(sent, 'ok');
  let handles = before;
  for (let i = 0; i < 50 && handles.length === before.length; i++) { await wait(100); handles = await call('GET', S + '/window/handles'); }
  await call('POST', S + '/window', { handle: handles.find(h => !before.includes(h)) });
  let out = '';
  for (let i = 0; i < 50 && !out.includes('<PHONE>'); i++) { await wait(100); out = await run(outText); }
  assert.match(out, /<PERSON-1>/); assert(!out.includes('Mira Quill') && !out.includes('613-555-0100'));
  assert.equal(await run("return document.getElementById('input').value"), thread);
  assert.equal(await run('return location.hash'), '');
  assert.equal(await runAsync("var d=arguments[0];browser.storage.session.get(null).then(function(x){d(JSON.stringify(x));});"), '{}');
  console.log('PASS firefox ' + version + ' extension: temporary install, toolbar page, demo, scrub, saved prefs, selection hand-off with line breaks, session key deleted');
} finally {
  if (sid) await call('DELETE', '/session/' + sid).catch(() => {});
  driver.kill();
}
