// Real-browser check of email-scrub.html: scrub, roles, copy, leak gate, local preferences, no stored threads, no network.
// Needs Playwright; set PLAYWRIGHT to its index.mjs if it is not at the default path below.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const pw = await import(process.env.PLAYWRIGHT || '/Users/jaytarzwell/claude-code-resources/node_modules/playwright/index.mjs');
const url = 'file://' + new URL('../email-scrub.html', import.meta.url).pathname;
const thread = fs.readFileSync(new URL('./engine.test.js', import.meta.url), 'utf8').match(/const OUTLOOK_EN = `([\s\S]*?)`;/)[1];
const b = await pw.chromium.launch(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {});
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
  // Persist configuration only, never the raw thread or scrubbed result.
  const prefs = await p.evaluate(() => JSON.parse(localStorage.getItem('email-scrub.preferences.v1')));
  assert.equal(prefs.kill, 'Invoice 4471'); assert(!JSON.stringify(prefs).includes('clause 12.1.3'));
  assert.equal(prefs.people[0].names, 'Adaeze Okafor, Adaeze');
  assert.equal(await p.evaluate(() => sessionStorage.length), 0);
  await p.reload(); assert.equal(await p.inputValue('#input'), ''); assert(await p.isHidden('#res'));
  assert.equal(await p.locator('#roles input.names').first().inputValue(), 'Adaeze Okafor, Adaeze');
  // Every row has an editable title and role; add more than the old seven slots.
  assert.equal(await p.locator('#roles select').first().locator('option').count(), 10);
  for (let i = 0; i < 6; i++) await p.click('#add-person');
  assert.equal(await p.locator('.role-row').count(), 10);
  const person = p.locator('.role-row').last();
  await person.locator('.names').fill('Zorvex Quill'); await person.locator('.labin').fill('Team lead');
  await p.fill('#input', 'Zorvex Quill sent Project Cobalt. Project Cobalt stays secret.'); await p.click('#go');
  assert((await p.textContent('#out')).includes('<TEAM-LEAD>'));
  // Select across real rendered text and use the highlighter button.
  async function highlight(text) {
    await p.evaluate(text => {
      const out = document.getElementById('out'), walk = document.createTreeWalker(out, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walk.nextNode())) { const start = node.textContent.indexOf(text); if (start < 0) continue;
        const range = document.createRange(); range.setStart(node, start); range.setEnd(node, start + text.length);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); return;
      }
      throw new Error('Selection text not found');
    }, text);
    await p.waitForFunction(() => !document.getElementById('exclude').disabled);
    await p.click('#exclude');
  }
  await highlight('Project Cobalt');
  assert(!(await p.textContent('#out')).includes('Project Cobalt')); assert((await p.textContent('#out')).includes('<EXCLUDED-1>'));
  await p.click('#copy'); assert.equal(await p.evaluate(() => navigator.clipboard.readText()), await p.textContent('#out'));
  await p.reload(); assert.equal(await p.inputValue('#input'), '');
  await p.fill('#input', 'Project Cobalt and Zorvex Quill again.'); await p.click('#go');
  assert(!(await p.textContent('#out')).includes('Project Cobalt')); assert((await p.textContent('#out')).includes('<TEAM-LEAD>'));
  // Editing input invalidates the old result and prevents copying stale text.
  await p.fill('#input', 'Changed thread'); assert(await p.isHidden('#res'));
  // Multiline selection, markup injection remains literal, fragments are removed everywhere.
  await p.fill('#input', 'privatecode and privatecode.\nLine one\nLine two\n<img src=x onerror=alert(1)>'); await p.click('#go');
  assert.equal(await p.locator('#out img').count(), 0);
  await highlight('vatecode'); assert(!(await p.textContent('#out')).includes('vatecode'));
  await highlight('Line one\nLine two'); assert(!(await p.textContent('#out')).includes('Line two'));
  // Existing placeholders must not become saved private terms.
  await p.evaluate(() => { const node = document.querySelector('#out .t').firstChild; const range = document.createRange(); range.selectNodeContents(node); window.getSelection().removeAllRanges(); window.getSelection().addRange(range); });
  await p.waitForFunction(() => document.getElementById('exclude').disabled);
  await p.locator('details').filter({ has: p.locator('#saved-terms') }).locator('summary').click();
  await p.locator('#saved-terms button').first().click(); await p.reload();
  assert(!(await p.textContent('#saved-terms')).includes('Project Cobalt'));
  // Clear wipes the thread/result but keeps configured people and exclusions
  await p.click('#clear'); assert(await p.isHidden('#res')); assert.equal(await p.inputValue('#input'), '');
  assert.equal(await p.locator('#roles input.names').first().inputValue(), 'Adaeze Okafor, Adaeze');
  await p.click('#forget'); assert.equal(await p.evaluate(() => localStorage.getItem('email-scrub.preferences.v1')), null);
  await p.reload(); assert.equal(await p.locator('#roles input.names').first().inputValue(), '');
  // Phone width: no sideways scroll
  await p.setViewportSize({ width: 375, height: 800 }); await p.fill('#input', thread); await p.click('#go');
  assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'horizontal scroll at 375px');
  if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT, fullPage: true });
  assert.equal(errors.length, 0, errors.join('\n')); assert.equal(network.length, 0, network.join('\n'));
  // Browser storage can be blocked; scrubbing must keep working and state that it cannot remember.
  await p.evaluate(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); }, configurable: true }); });
  await p.fill('#kill', 'Harbourline Logistics'); await p.click('#go');
  assert((await p.textContent('#storage-status')).includes('unavailable')); assert(await p.isVisible('#res'));
  console.log('PASS browser: highlighting + repeated/fragments/multiline, persisted roles/titles/exclusions, no stored threads, add/remove/forget, copy matches, stale output hidden, storage blocked, 375px, zero network/errors');
} finally { await b.close(); }
