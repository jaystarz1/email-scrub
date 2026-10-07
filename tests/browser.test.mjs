// Real-browser check of email-scrub.html: scrub, roles, copy, leak gate, nothing stored, no network.
// Needs Playwright; set PLAYWRIGHT to its index.mjs if it is not at the default path below.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const pw = await import(process.env.PLAYWRIGHT || '/Users/jaytarzwell/claude-code-resources/node_modules/playwright/index.mjs');
const url = 'file://' + new URL('../email-scrub.html', import.meta.url).pathname;
const thread = fs.readFileSync(new URL('./engine.test.js', import.meta.url), 'utf8').match(/const OUTLOOK_EN = `([\s\S]*?)`;/)[1];
const b = await pw.chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
const p = await ctx.newPage(), errors = [], network = [];
p.on('pageerror', e => errors.push(e.message));
p.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) network.push(r.url()); });
try {
  await p.goto(url);
  assert(await p.isHidden('#js'), 'page script did not start');
  await p.fill('#input', thread);
  await p.locator('#roles input.names').first().fill('Adaeze Okafor, Adaeze');
  await p.fill('#kill', 'Invoice 4471');
  await p.click('#go');
  const out = await p.textContent('#out');
  for (const g of ['Okafor', 'Adaeze', 'Whitfield', 'Jordan', 'harbourline.ca', '555-0142', 'Invoice 4471']) assert(!out.includes(g), 'leak: ' + g);
  for (const s of ['<CLIENT>', '<PERSON-1>', '<TERM-1>', 'clause 12.1.3', 'Note: placeholders']) assert(out.includes(s), 'missing: ' + s);
  assert((await p.textContent('#leak')).includes('Harbourline Logistics'), 'organisation warning shown');
  assert(!(await p.isDisabled('#copy')), 'copy enabled after a passing leak check');
  assert((await p.textContent('#counts')).includes('emails'));
  await p.click('#copy');
  assert.equal(await p.evaluate(() => navigator.clipboard.readText()), out);
  // Note off
  await p.uncheck('#note'); await p.click('#go'); assert(!(await p.textContent('#out')).startsWith('Note:'));
  // Nothing persisted anywhere
  assert.equal(await p.evaluate(() => localStorage.length + sessionStorage.length), 0);
  // Clear wipes the roles and the result
  await p.click('#clear'); assert(await p.isHidden('#res')); assert.equal(await p.inputValue('#input'), '');
  assert.equal(await p.locator('#roles input.names').first().inputValue(), '');
  // Phone width: no sideways scroll
  await p.setViewportSize({ width: 375, height: 800 }); await p.fill('#input', thread); await p.click('#go');
  assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'horizontal scroll at 375px');
  if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT, fullPage: true });
  assert.equal(errors.length, 0, errors.join('\n')); assert.equal(network.length, 0, network.join('\n'));
  console.log('PASS browser: scrub with role + term, copy matches output, note toggle, nothing stored, clear, 375px layout, zero network, zero JS errors');
} finally { await b.close(); }
