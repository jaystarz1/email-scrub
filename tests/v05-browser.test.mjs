import assert from 'node:assert/strict';
const pw=await import('/Users/jaytarzwell/claude-code-resources/node_modules/playwright/index.mjs');
const browser=await pw.chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
const ctx=await browser.newContext({viewport:{width:1000,height:900},hasTouch:true});await ctx.grantPermissions(['clipboard-read','clipboard-write']);
const page=await ctx.newPage(),errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!/^(file|blob|data):/.test(r.url()))network.push(r.url());});
const clean=()=>page.locator('#out').evaluate(e=>{const c=e.cloneNode(true);c.querySelectorAll('.review-controls,.sr-only').forEach(n=>n.remove());return c.textContent;});
const prefs=()=>page.evaluate(()=>localStorage.getItem('email-scrub.preferences.v3'));
async function scrub(text){await page.fill('#input',text);await page.click('#go');return clean();}
try{
 await page.goto('file://'+new URL('../email-scrub.html',import.meta.url).pathname);await page.uncheck('#note');
 await scrub('ordinary text');assert.equal(await page.textContent('#copy'),'Copy');
 await scrub('R10 843 221; A1234-56789-01234; aged 52');assert.equal(await page.locator('.review').count(),3);assert.equal(await page.textContent('#review-counter'),'3 to review');assert.equal(await page.textContent('#copy'),'Accept (3 to review)');
 assert(!(await page.locator('#review-panel').evaluate(e=>e.open)));await page.click('#review-next');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Replace R10 843 221');
 await page.click('#review-next');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Replace A1234-56789-01234');await page.click('#review-next');await page.click('#review-next');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Replace R10 843 221');
 // Keyboard Replace is thread-local, all occurrences, no storage changes.
 const before=await prefs();await page.keyboard.press('Enter');assert((await clean()).includes('<EXCLUDED-1>'));assert.equal(await prefs(),before);assert.equal(await page.textContent('#review-counter'),'2 to review');
 await page.getByRole('button',{name:'Keep aged 52',exact:true}).click();assert((await clean()).includes('aged 52'));assert.equal(await page.textContent('#review-counter'),'1 to review');await page.click('#go');assert.equal(await page.locator('[aria-label="Keep aged 52"]').count(),0);
 // Accept requires a second click to copy, exact engine text only.
 await page.click('#copy');assert.equal(await page.textContent('#copy'),'Copy');assert.equal(await page.locator('.review').count(),0);await page.click('#copy');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),await clean());assert.equal(await page.textContent('#copy'),'Copied');
 await page.reload();assert.equal(await prefs(),before);await page.uncheck('#note');await scrub('R10 843 221');assert.equal(await page.locator('.review').count(),1);
 // Always remove persists; Keep and Replace don't.
 await page.getByRole('button',{name:'Always remove R10 843 221',exact:true}).click();let p=JSON.parse(await prefs());assert.deepEqual(p.excluded,[{text:'R10 843 221',n:1}]);await page.reload();await page.uncheck('#note');assert.equal(await scrub('R10 843 221'),'<EXCLUDED-1>');
 await scrub('A1234-56789-01234 and A1234-56789-01234');await page.getByRole('button',{name:'Replace A1234-56789-01234',exact:true}).first().click();assert.equal(await clean(),'<EXCLUDED-2> and <EXCLUDED-2>');assert.equal(JSON.parse(await prefs()).excluded.length,1);
 await page.click('#clear');assert.equal(await scrub('A1234-56789-01234').then(()=>page.locator('.review').count()),1);
 await page.getByRole('button',{name:'Keep A1234-56789-01234',exact:true}).click();await page.click('#go');assert.equal(await page.locator('.review').count(),0);await page.click('#clear');await scrub('A1234-56789-01234');assert.equal(await page.locator('.review').count(),1);
 // Acceptance resets after a text-changing removal, keeping alone leaves copy usable.
 await scrub('Tell Andre: aged 52; A1234-56789-01234');await page.click('#review-panel summary');await page.locator('#review-list button').first().click();assert.match(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),/^Replace /);
 await page.getByRole('button',{name:'Keep Andre',exact:true}).click();assert((await clean()).includes('Andre'));await page.click('#copy');assert.equal(await page.textContent('#copy'),'Copy');
 await page.click('#go');assert.equal(await page.textContent('#copy'),'Copy');
 // Change people/terms/input invalidates stale copies; new flags return Accept.
 await page.fill('#input','R11 843 222');assert(await page.isHidden('#res'));await page.click('#go');assert((await page.textContent('#copy')).startsWith('Accept'));
 await page.fill('#kill','R11 843 222');assert(await page.isHidden('#res'));await page.click('#go');assert.equal(await page.textContent('#copy'),'Copy');await page.fill('#kill','');
 // Synthetic leak: a configured spelling with ordinary word-like first-name ambiguity.
 await page.fill('#me','Will Smith');await scrub('From: Will Smith <will@example.com>\nWe will proceed.');assert.equal(await page.textContent('#copy'),'Accept with 1 leak');assert(await page.locator('#copy').evaluate(e=>e.classList.contains('danger')));assert.equal(await page.locator('.leak-mark').count(),1);await page.click('#copy');assert.equal(await page.textContent('#copy'),'Copy');await page.click('#copy');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),await clean());await page.fill('#me','');
 // Scroll regression: remove selected text far down inside the output without either scroll resetting.
 await scrub(Array.from({length:120},(_,i)=>'ordinary line '+i).join('\n')+'\nprivate-fragment\nordinary ending');
 await page.evaluate(()=>{const o=document.getElementById('out');o.scrollTop=1300;window.scrollTo(0,o.getBoundingClientRect().top+window.scrollY-280);const walk=document.createTreeWalker(o,NodeFilter.SHOW_TEXT);let n;while(n=walk.nextNode()){const at=n.textContent.indexOf('private-fragment');if(at<0)continue;const r=document.createRange();r.setStart(n,at);r.setEnd(n,at+16);window.getSelection().removeAllRanges();window.getSelection().addRange(r);break;}});
 await page.waitForFunction(()=>!document.getElementById('exclude').disabled);const position=await page.evaluate(()=>[scrollY,document.getElementById('out').scrollTop]);await page.evaluate(()=>document.getElementById('exclude').click());assert.deepEqual(await page.evaluate(()=>[scrollY,document.getElementById('out').scrollTop]),position);assert(!(await clean()).includes('private-fragment'));
 // Manual selection copy strips controls and hidden accessibility labels too.
 await scrub('A1234-56789-01234');await page.evaluate(()=>{const r=document.createRange();r.selectNodeContents(document.getElementById('out'));window.getSelection().removeAllRanges();window.getSelection().addRange(r);});await page.keyboard.press(process.platform==='darwin'?'Meta+c':'Control+c');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),await clean());
 // Native popovers work with click, touch, keyboard and Escape.
 for(const id of ['help-review','help-copy','help-4']){const button=page.locator('[popovertarget="'+id+'"]'),pop=page.locator('#'+id);await button.click();assert(await pop.evaluate(e=>e.matches(':popover-open')));await button.click();assert(!(await pop.evaluate(e=>e.matches(':popover-open'))));await button.focus();await page.keyboard.press('Enter');assert(await pop.evaluate(e=>e.matches(':popover-open')));await page.keyboard.press('Escape');await button.tap();assert(await pop.evaluate(e=>e.matches(':popover-open')));await page.keyboard.press('Escape');}
 await page.click('#help-open');assert(!(await page.textContent('#help-dialog')).includes('I checked: copy anyway'));await page.click('#help-close');await page.click('#demo');assert((await page.textContent('#copy')).startsWith('Accept ('));assert.equal(await page.locator('.leak-mark').count(),0);
 assert.equal(await page.evaluate(()=>sessionStorage.length),0);assert.deepEqual(network,[]);assert.deepEqual(errors,[]);
 await page.setViewportSize({width:375,height:850});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.SHOT)await page.screenshot({path:process.env.SHOT,fullPage:true});
 console.log('PASS '+(process.env.BROWSER_CHANNEL||'chrome')+' v0.5: inline review, keyboard/focus/wrap, transient persistence, saved removal, accept/copy/reset, red leaks, manual clipboard, selection scroll preservation, help click/touch/keyboard, mobile, demo, zero page network/errors');
}finally{await browser.close();}
