import assert from 'node:assert/strict';
const pw=await import('/Users/jaytarzwell/claude-code-resources/node_modules/playwright/index.mjs');
const channel=process.env.BROWSER_CHANNEL||'chrome',browser=await pw.chromium.launch({channel});
const ctx=await browser.newContext({locale:'fr-CA',viewport:{width:1100,height:900}});await ctx.grantPermissions(['clipboard-read','clipboard-write']);const page=await ctx.newPage(),network=[],errors=[];page.on('request',r=>{if(!/^(file|data|blob):/.test(r.url()))network.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
const prefs=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('email-scrub.preferences.v4')));
async function load(text){await page.fill('#input',text);await page.click('#go');}
try{
 await page.goto('file://'+new URL('../email-scrub.html',import.meta.url).pathname);assert.equal(await page.evaluate(()=>document.documentElement.lang),'fr');assert.equal(await page.textContent('#help-open'),'Aide');
 await load('ordinary text');
 for(const preset of ['summary','reply-short','reply-medium','reply-long','action-items','timeline','whos-who','open-questions','point-by-point','decline','follow-up','brief','translate']){
  await page.selectOption('#prompt-preset',preset);assert(await page.isVisible('#prompt-edit'));assert.equal(await page.isVisible('#tone-control'),/^(reply-|decline|follow-up|brief)/.test(preset));assert.equal(await page.isVisible('#length-control'),!/^reply-/.test(preset));assert.equal(await page.inputValue('#prompt-language'),'fr');
  await page.click('#copy');const copied=await page.evaluate(()=>navigator.clipboard.readText());assert(copied.includes('Réponds en français.'));assert(copied.includes('--- EMAIL THREAD START ---'));assert(copied.endsWith('exactement tel qu’il est écrit.'));
 }
 await page.fill('#prompt-edit','TEMPORARY-PROMPT-NOT-STORED');assert(!JSON.stringify(await prefs()).includes('TEMPORARY-PROMPT-NOT-STORED'));
 await page.reload();assert.equal(await page.inputValue('#prompt-preset'),'translate');assert(!JSON.stringify(await prefs()).includes('ordinary text'));await page.click('#help-open');await page.click('#language-toggle');assert(await page.locator('#help-dialog').evaluate(e=>e.open));assert.match(await page.textContent('#help-new'),/^Prompts are optional/);await page.click('#help-close');
 await page.uncheck('#note');await load('ordinary text');await page.selectOption('#prompt-preset','none');
 await load('A1234-56789-01234');await page.getByRole('button',{name:'Always remove A1234-56789-01234',exact:true}).click();const before=(await prefs()).excluded;
 await load('R10 843 221');await page.getByRole('button',{name:'Always remove R10 843 221',exact:true}).click();await page.click('#undo');assert.deepEqual((await prefs()).excluded,before);await page.click('#copy');
 await page.fill('#input','EDIT-CLEARS-HISTORY');assert(await page.isDisabled('#undo'));
 await page.click('#demo');const drop=await page.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['dropped local text'],'drop.txt',{type:'text/plain'}));return d;});await page.dispatchEvent('#input','dragover',{dataTransfer:drop});assert.match(await page.textContent('#file-status'),/Drop to load/);await page.dispatchEvent('#input','drop',{dataTransfer:drop});await page.waitForFunction(()=>document.getElementById('input').value==='dropped local text');assert(await page.isHidden('#res'));assert(await page.isDisabled('#undo'));assert(!(await page.isDisabled('#forget')));
 const multiple=await page.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['first'],'a.txt'));d.items.add(new File(['second'],'b.eml'));return d;});await page.dispatchEvent('#input','drop',{dataTransfer:multiple});assert.equal(await page.inputValue('#input'),'dropped local text');assert.match(await page.textContent('#file-status'),/one file at a time/);
 await page.setInputFiles('#file',{name:'bad.eml',mimeType:'message/rfc822',buffer:Buffer.from('Content-Transfer-Encoding: base64\n\n@@invalid@@')});await page.waitForFunction(()=>document.getElementById('file-status').textContent.includes('could not be read'));assert.equal(await page.inputValue('#input'),'dropped local text');
 await page.uncheck('#signatures');await page.click('#language-toggle');const settings=await prefs();page.once('dialog',d=>{assert.match(d.message(),/langue/);d.accept();});await page.click('#forget');const erased=await prefs();assert.equal(erased.lang,settings.lang);assert.equal(erased.signatures,false);assert.equal(erased.lastPreset,'none');assert.equal(erased.me,'');assert.deepEqual(erased.excluded,[]);
 await load('Merci,\nMira Quill\nCoordonnatrice\n613-555-0100\nDe : Nolan Vale\nBonjour.');await page.check('#signatures');await page.click('#go');assert.match(await page.textContent('#counts'),/signatures retirées/);assert((await page.textContent('#review-list')).includes('Possible')||!(await page.textContent('#review-list')));
 await page.setViewportSize({width:375,height:850});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.SHOT)await page.screenshot({path:process.env.SHOT,fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);console.log('PASS '+channel+' extended v06: all presets/modifiers in French, persisted choice, open help switch, prior exclusions preserved by Undo, synthetic drops/multiple/malformed safety, Forget choices, French signatures/mobile, zero errors/network');
}finally{await browser.close();}
