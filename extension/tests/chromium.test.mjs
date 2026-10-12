// Loads extension/dist/chromium into Playwright's Chromium and drives the toolbar page,
// the right-click path (multi-line selection read from a real page) and the fallback.
// Run: python3 extension/build_extension.py && node extension/tests/chromium.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
const pw = await import('/Users/jaytarzwell/claude-code-resources/node_modules/playwright/index.mjs');

const dist = new URL('../dist/chromium/', import.meta.url).pathname;
const thread = 'From: Mira Quill <mira.quill@example.com>\nSent: March 3, 2026 9:14 AM\nTo: Nolan Vale\nSubject: Lantern\n\nHi Nolan,\n\nCall me at 613-555-0100.\n\nRegards,\nMira';

// The shipped manifest has no host access; the selection test needs a copy that can
// script a local page the way activeTab allows after a real right-click.
const scripted = fs.mkdtempSync(path.join(os.tmpdir(), 'scrub-ext-'));
fs.cpSync(dist, scripted, { recursive: true });
const mf = JSON.parse(fs.readFileSync(path.join(scripted, 'manifest.json')));
mf.host_permissions = ['http://127.0.0.1/*'];
fs.writeFileSync(path.join(scripted, 'manifest.json'), JSON.stringify(mf));

const server = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end('<pre id="t">' + thread.replace(/</g, '&lt;') + '</pre>'); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;

async function launch(dir) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'scrub-profile-'));
  const ctx = await pw.chromium.launchPersistentContext(profile, { channel: process.env.BROWSER_CHANNEL || 'chromium', args: ['--disable-extensions-except=' + dir, '--load-extension=' + dir] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host, errors = [], network = [];
  const watch = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); };
  ctx.on('page', watch); ctx.pages().forEach(watch);
  ctx.on('request', r => { if (!/^(chrome-extension|data|blob):/.test(r.url()) && !r.url().startsWith(origin)) network.push(r.url()); });
  return { ctx, sw, id, errors, network };
}
const clean = p => p.locator('#out').evaluate(e => { const c = e.cloneNode(true); c.querySelectorAll('.sr-only,.review-controls').forEach(n => n.remove()); return c.textContent; });

let a, b;
try {
  a = await launch(dist);
  // Toolbar page: same scrubber, scripts load under the extension CSP.
  const page = await a.ctx.newPage();
  await page.goto('chrome-extension://' + a.id + '/scrubber.html');
  assert.equal(await page.title(), 'Email Thread Scrubber');
  await page.click('#demo');
  await page.waitForFunction(() => document.getElementById('out').textContent.includes('<'));
  assert.match(await clean(page), /<CLIENT>|<PERSON-1>|<ME>/);
  await page.fill('#input', thread); await page.click('#go');
  assert.match(await clean(page), /<PHONE>/);
  await page.click('#language-toggle'); assert.equal(await page.textContent('#go'), 'Nettoyer'); await page.click('#language-toggle');
  // Preferences persist in the extension's own storage across a reload.
  await page.fill('#me', 'Mira Quill'); await page.click('#go'); await page.reload();
  assert.equal(await page.inputValue('#me'), 'Mira Quill'); assert.equal(await page.inputValue('#input'), '');

  // Right-click fallback: no page access, so the context menu's own text is used.
  const flat = await a.sw.evaluate(() => EmailScrubExtension.readSelection({ selectionText: 'flat text' }, { id: 999999 }));
  assert.equal(flat, 'flat text');

  // Opening with a selection: text arrives intact, is scrubbed, and leaves no trace.
  const opened = a.ctx.waitForEvent('page');
  await a.sw.evaluate(t => EmailScrubExtension.openScrubber(t), thread);
  const sel = await opened;
  await sel.waitForFunction(() => document.getElementById('out').textContent.includes('<PHONE>'));
  assert.equal(await sel.inputValue('#input'), thread);
  assert.equal(new URL(sel.url()).hash, '');
  const out = await clean(sel);
  assert.match(out, /<PERSON-1>/); assert(!out.includes('Mira Quill') && !out.includes('613-555-0100'));
  assert.deepEqual(await a.sw.evaluate(() => chrome.storage.session.get(null)), {});
  assert.equal(await sel.evaluate(() => sessionStorage.length), 0);
  assert(!(await sel.evaluate(() => JSON.stringify(localStorage))).includes('Nolan'));
  assert.deepEqual(a.errors, []); assert.deepEqual(a.network, []);
  await a.ctx.close(); a = null;

  // Real selection read from a web page keeps its line breaks.
  b = await launch(scripted);
  const web = await b.ctx.newPage(); await web.goto(origin + '/');
  await web.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById('t')); getSelection().addRange(r); });
  const tabId = await b.sw.evaluate(async u => (await chrome.tabs.query({ url: u + '/*' }))[0].id, origin);
  const read = await b.sw.evaluate(id => EmailScrubExtension.readSelection({ selectionText: 'collapsed', frameId: 0 }, { id }), tabId);
  assert.equal(read, thread);
  assert.deepEqual(b.errors, []); assert.deepEqual(b.network, []);
  console.log('PASS ' + (process.env.BROWSER_CHANNEL || 'chromium') + ' extension: toolbar page under extension CSP, demo, scrub, FR toggle, saved prefs, selection hand-off with line breaks, fallback, session key deleted, no network/errors');
} finally {
  if (a) await a.ctx.close(); if (b) await b.ctx.close(); server.close();
  fs.rmSync(scripted, { recursive: true, force: true });
}
