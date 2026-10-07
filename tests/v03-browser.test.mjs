import assert from 'node:assert/strict';
const pw=await import(process.env.PLAYWRIGHT || '/Users/jaytarzwell/claude-code-resources/node_modules/playwright/index.mjs');
const browser=await pw.chromium.launch({channel:process.env.BROWSER_CHANNEL || 'chrome'});
const ctx=await browser.newContext({hasTouch:true});
const page=await ctx.newPage(), errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!/^(file|data|blob):/.test(r.url()))requests.push(r.url());});
try {
 await page.goto('file://'+new URL('../email-scrub.html',import.meta.url).pathname);
 const legacy={people:[{role:'Me',title:'Reviewer',names:'Fiction Person'}],kill:'legacy term',excluded:['first','a longer second']};
 await page.evaluate(legacy=>{localStorage.clear();localStorage.setItem('email-scrub.preferences.v1',JSON.stringify(legacy));},legacy);
 await page.reload();
 assert.equal(await page.evaluate(()=>localStorage.getItem('email-scrub.preferences.v1')),null);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('email-scrub.preferences.v3')));
 assert.deepEqual(saved.excluded,[{text:'first',n:1},{text:'a longer second',n:2}]);assert.equal(saved.nextExcluded,3);
 // No demo writes, even when removing candidates, adding rows, changing terms or forgetting.
 const before=await page.evaluate(()=>localStorage.getItem('email-scrub.preferences.v3'));
 await page.click('#demo');assert.equal(await page.textContent('#results-title'),'4. Check and copy (demo)');
 assert((await page.textContent('#review-list')).includes('Andre'));assert(!(await page.isDisabled('#copy')));
 await page.getByRole('button',{name:'Always remove Andre',exact:true}).click();
 assert(!(await page.textContent('#review-list')).includes('Andre'));
 await page.click('#add-person');await page.fill('#kill','demo only');await page.click('#go');
 assert.equal(await page.evaluate(()=>localStorage.getItem('email-scrub.preferences.v3')),before);
 await page.fill('#input','Tell Andre she is the POC.'); // leaves demo, restores preferences
 assert.equal(await page.inputValue('#kill'),'legacy term'); assert(await page.isHidden('#res'));
 await page.click('#go');assert.equal(await page.textContent('#results-title'),'4. Check and copy');
 await page.getByRole('button',{name:'Always remove Andre',exact:true}).click();
 assert((await page.locator('#out').evaluate(e=>{const c=e.cloneNode(true);c.querySelectorAll('.review-controls,.sr-only').forEach(n=>n.remove());return c.textContent;})).includes('<EXCLUDED-3>'));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('email-scrub.preferences.v3')).nextExcluded),4);
 // Forget a middle item and then add another; IDs are never reused, including across reload.
 await page.locator('details').filter({has:page.locator('#saved-terms')}).locator('summary').click();
 await page.locator('#saved-terms button').nth(1).click();await page.reload();
 await page.fill('#input','Tell Alice to contact Andre.');await page.click('#go');
 await page.getByRole('button',{name:'Always remove Alice',exact:true}).click();
 const prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem('email-scrub.preferences.v3')));
 assert.deepEqual(prefs.excluded.map(t=>t.n),[1,3,4]);
 // Demo Clear exits without overwriting the saved settings.
 const prefsBefore=await page.evaluate(()=>localStorage.getItem('email-scrub.preferences.v3'));
 await page.click('#demo');assert(await page.isDisabled('#forget'));assert.equal(await page.getAttribute('#forget','title'),'Leave the demo to manage saved preferences.');await page.click('#clear');assert(!(await page.isDisabled('#forget')));
 assert.equal(await page.textContent('#results-title'),'4. Check and copy');assert.equal(await page.inputValue('#input'),'');
 assert.equal(await page.evaluate(()=>localStorage.getItem('email-scrub.preferences.v3')),prefsBefore);
 await page.click('#demo');
 // Five native popovers: mouse toggle, outside dismiss, keyboard, tap, Escape.
 for(let i=1;i<=5;i++) {
  const button=page.locator(`[popovertarget="help-${i}"]`), box=page.locator(`#help-${i}`);
  await button.click();assert(await box.evaluate(e=>e.matches(':popover-open')));
  await page.mouse.click(2,2);assert(!(await box.evaluate(e=>e.matches(':popover-open'))));
  await button.focus();await page.keyboard.press('Enter');assert(await box.evaluate(e=>e.matches(':popover-open')));
  await page.keyboard.press('Escape');assert(!(await box.evaluate(e=>e.matches(':popover-open'))));
  await button.tap();assert(await box.evaluate(e=>e.matches(':popover-open')));
  await page.keyboard.press('Escape');assert(!(await box.evaluate(e=>e.matches(':popover-open'))));
 }
 await page.locator('#help-open').focus();await page.keyboard.press('Enter');assert(await page.locator('#help-dialog').evaluate(e=>e.open));
 await page.keyboard.press('Escape');assert(!(await page.locator('#help-dialog').evaluate(e=>e.open)));
 await page.click('#help-open');assert((await page.textContent('#help-dialog')).includes("If this computer is shared, use Forget when you're done."));
 if(process.env.SHOT) await page.screenshot({path:process.env.SHOT});
 await page.getByRole('button',{name:'Close help'}).click();
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(requests.length,0,requests.join('\n'));
 console.log('PASS '+(process.env.BROWSER_CHANNEL||'chrome')+' v0.3: migration, monotonic IDs, warning Remove, isolated demo, five popovers (click/tap/keyboard/outside/Escape), dialog, file:// zero network/errors');
} finally {await browser.close();}
