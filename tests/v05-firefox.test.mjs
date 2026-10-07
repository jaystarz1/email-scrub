// Stock installed Firefox via geckodriver; no product dependencies are added.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const endpoint=process.env.GECKODRIVER_URL||'http://127.0.0.1:4445';
async function http(path,body,method='POST') {
 const r=await fetch(endpoint+path,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const result=await r.json();
 if(result.value?.error) throw new Error(JSON.stringify(result.value));return result.value;
}
const session=await http('/session',{capabilities:{alwaysMatch:{browserName:'firefox',webSocketUrl:true,'moz:firefoxOptions':{binary:'/Applications/Firefox.app/Contents/MacOS/firefox',args:['-headless']}}}});
const id=session.sessionId, path='/session/'+id;
const js=script=>http(path+'/execute/sync',{script,args:[]});
const requests=[];const ws=new WebSocket(session.capabilities.webSocketUrl);
await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail;});
await new Promise((ok,fail)=>{ws.onmessage=evt=>{const data=JSON.parse(evt.data);if(data.id===1){data.error?fail(new Error(data.message)):ok();}else if(data.method==='network.beforeRequestSent'&&!/^(file|data|blob):/.test(data.params.request.url))requests.push(data.params.request.url);};ws.send(JSON.stringify({id:1,method:'session.subscribe',params:{events:['network.beforeRequestSent']}}));});
async function click(sel) {await js(`document.querySelector(${JSON.stringify(sel)}).click()`);}
async function key(value) {await http(path+'/actions',{actions:[{type:'key',id:'keyboard',actions:[{type:'keyDown',value},{type:'keyUp',value}]}]});}
async function actualClick(sel) { const el=await http(path+'/element',{using:'css selector',value:sel}); await http(path+'/element/'+el['element-6066-11e4-a52e-4f735466cecf']+'/click',{}); }
const clean=()=>js("const c=document.getElementById('out').cloneNode(true);c.querySelectorAll('.review-controls,.sr-only').forEach(n=>n.remove());return c.textContent;");
async function scrub(text){await js(`document.getElementById('input').value=${JSON.stringify(text)};document.getElementById('input').dispatchEvent(new Event('input',{bubbles:true}));`);await click('#go');return clean();}
const prefs=()=>js("return localStorage.getItem('email-scrub.preferences.v3')");
try{
 await http(path+'/url',{url:'file://'+new URL('../email-scrub.html',import.meta.url).pathname});await js("document.getElementById('note').checked=false;");
 await scrub('ordinary text');assert.equal(await js("return document.getElementById('copy').textContent"),'Copy');
 await scrub('R10 843 221; A1234-56789-01234; aged 52');assert.equal(await js("return document.querySelectorAll('.review').length"),3);assert.equal(await js("return document.getElementById('copy').textContent"),'Accept (3 to review)');
 const before=await prefs();await actualClick('#review-next');assert.equal(await js("return document.activeElement.getAttribute('aria-label')"),'Replace R10 843 221');await key('\uE007');assert((await clean()).includes('<EXCLUDED-1>'));assert.equal(await prefs(),before);
 await actualClick('[aria-label="Keep aged 52"]');await click('#go');assert.equal(await js("return document.querySelectorAll('[aria-label=\"Keep aged 52\"]').length"),0);
 await actualClick('#copy');assert.equal(await js("return document.getElementById('copy').textContent"),'Copy');assert.equal(await js("return document.querySelectorAll('.review').length"),0);await actualClick('#copy');assert.match(await js("return document.getElementById('copied').textContent"),/Copied|Copy was blocked/);
 await http(path+'/refresh',{});await js("document.getElementById('note').checked=false;");await scrub('R10 843 221');assert.equal(await js("return document.querySelectorAll('.review').length"),1);await actualClick('[aria-label="Always remove R10 843 221"]');assert.equal(JSON.parse(await prefs()).excluded.length,1);
 await http(path+'/refresh',{});await js("document.getElementById('note').checked=false;");assert.equal(await scrub('R10 843 221'),'<EXCLUDED-1>');
 await scrub('A1234-56789-01234 and A1234-56789-01234');await actualClick('[aria-label="Replace A1234-56789-01234"]');assert.equal(await clean(),'<EXCLUDED-2> and <EXCLUDED-2>');assert.equal(JSON.parse(await prefs()).excluded.length,1);
 await click('#clear');await scrub('A1234-56789-01234');assert.equal(await js("return document.querySelectorAll('.review').length"),1);await actualClick('[aria-label="Keep A1234-56789-01234"]');await click('#go');assert.equal(await js("return document.querySelectorAll('.review').length"),0);await click('#clear');await scrub('A1234-56789-01234');assert.equal(await js("return document.querySelectorAll('.review').length"),1);
 await js("document.getElementById('me').value='Will Smith';document.getElementById('me').dispatchEvent(new Event('input',{bubbles:true}));");await scrub('From: Will Smith <will@example.com>\nWe will proceed.');assert.equal(await js("return document.getElementById('copy').textContent"),'Accept with 1 leak');assert.equal(await js("return document.querySelectorAll('.leak-mark').length"),1);await actualClick('#copy');assert.equal(await js("return document.getElementById('copy').textContent"),'Copy');await js("document.getElementById('me').value='';");
 for(const pop of ['help-review','help-copy']){const selector='[popovertarget="'+pop+'"]';await actualClick(selector);assert(await js(`return document.getElementById('${pop}').matches(':popover-open')`));await key('\uE00C');await js(`document.querySelector(${JSON.stringify(selector)}).focus()`);await key('\uE007');assert(await js(`return document.getElementById('${pop}').matches(':popover-open')`));await key('\uE00C');}
 await click('#demo');assert.match(await js("return document.getElementById('copy').textContent"),/^Accept \(/);assert.equal(await js("return document.querySelectorAll('.leak-mark').length"),0);await click('#help-open');await click('#help-close');assert.deepEqual(requests,[]);
 console.log('PASS Firefox '+session.capabilities.browserVersion+' v0.5: yellow review, keyboard focus/Replace, Keep persistence, saved removal/reload, Clear, accept/copy states, red leaks, new popovers, demo/help, zero page network requests (BiDi). Clipboard feedback verified; actual system clipboard contents remain a manual check.');
}finally{ws.close();await http(path,undefined,'DELETE');}
