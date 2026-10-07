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
try {
 await http(path+'/url',{url:'file://'+new URL('../email-scrub.html',import.meta.url).pathname});
 assert.equal(await js("return document.getElementById('js').hidden"),true);
 const legacy={people:[{role:'Me',title:'',names:'Fiction Person'}],kill:'legacy term',excluded:['first','a longer second']};
 await js(`localStorage.clear();localStorage.setItem('email-scrub.preferences.v1',${JSON.stringify(JSON.stringify(legacy))});`);
 await http(path+'/refresh',{});
 assert.equal(await js("return localStorage.getItem('email-scrub.preferences.v1')"),null);
 const before=await js("return localStorage.getItem('email-scrub.preferences.v3')");
 assert.deepEqual(JSON.parse(before).excluded,[{text:'first',n:1},{text:'a longer second',n:2}]);
 await actualClick('#demo');assert.equal(await js("return document.getElementById('results-title').textContent"),'4. Check and copy (demo)');
 assert((await js("return document.getElementById('possible-names').textContent")).includes('Andre'));
 assert.equal(await js("return document.getElementById('copy').disabled"),false);
 await actualClick('[aria-label="Remove possible name Andre"]');assert(!(await js("return document.getElementById('possible-names').textContent")).includes('Andre'));
 await click('#add-person');await js("document.getElementById('kill').value='demo only';document.getElementById('kill').dispatchEvent(new Event('input',{bubbles:true}));");await click('#go');
 assert.equal(await js("return localStorage.getItem('email-scrub.preferences.v3')"),before);
 await js("document.getElementById('input').value='Tell Andre she is the POC.';document.getElementById('input').dispatchEvent(new Event('input',{bubbles:true}));");
 assert.equal(await js("return document.getElementById('kill').value"),'legacy term');
 await click('#go');await actualClick('[aria-label="Remove possible name Andre"]');
 assert((await js("return document.getElementById('out').textContent")).includes('<EXCLUDED-3>'));
 await http(path+'/refresh',{});
 assert.equal(await js("return document.getElementById('input').value"),'');
 assert.equal(await js("return JSON.parse(localStorage.getItem('email-scrub.preferences.v3')).nextExcluded"),4);
 // v0.4 saved people: reload, search, usage, this-thread override, and Save/Clear.
 await click('#clear');
 await js("document.getElementById('me').value='Fiction Sender, Fiction';document.getElementById('me').dispatchEvent(new Event('input',{bubbles:true}));");
 await click('#add-person');
 await js("document.querySelector('#roles .names').value='Jónes, Jones';document.querySelector('#roles .labin').value='GRIEVOR';document.querySelector('#roles button').click();");
 assert.equal(await js("return document.querySelectorAll('#roles .role-row').length"),0);
 await click('#clear');await http(path+'/refresh',{});
 assert.equal(await js("return document.getElementById('me').value"),'Fiction Sender, Fiction');
 assert.equal(await js("return JSON.parse(localStorage.getItem('email-scrub.preferences.v3')).saved[0].lastUsed"),'');
 await js("document.getElementById('saved-people-panel').open=true;document.getElementById('saved-search').value='jon';document.getElementById('saved-search').dispatchEvent(new Event('input',{bubbles:true}));");
 assert((await js("return document.getElementById('saved-people').textContent")).includes('Jónes'));
 await js("document.getElementById('input').value='Fiction Sender told Fiction to ask Jones.';document.getElementById('input').dispatchEvent(new Event('input',{bubbles:true}));");await click('#go');
 assert((await js("return document.getElementById('out').textContent")).includes('<ME> told <ME> to ask <GRIEVOR>'));
 assert.match(await js("return JSON.parse(localStorage.getItem('email-scrub.preferences.v3')).saved[0].lastUsed"),/^\d{4}-\d{2}-\d{2}$/);
 await js("const p=JSON.parse(localStorage.getItem('email-scrub.preferences.v3'));p.saved[0].lastUsed='2026-10-01';localStorage.setItem('email-scrub.preferences.v3',JSON.stringify(p));");await http(path+'/refresh',{});await click('#add-person');
 await js("document.querySelector('#roles .names').value='Jones';document.querySelector('#roles .labin').value='THREAD';document.getElementById('input').value='Jones spoke.';");await click('#go');
 assert((await js("return document.getElementById('out').textContent")).includes('<THREAD>'));assert.equal(await js("return JSON.parse(localStorage.getItem('email-scrub.preferences.v3')).saved[0].lastUsed"),'2026-10-01');
 await click('#demo');assert.equal(await js("return document.getElementById('forget').disabled"),true);
 await js("document.getElementById('saved-people-panel').open=true;document.getElementById('saved-search').value='jon';document.getElementById('saved-search').dispatchEvent(new Event('input',{bubbles:true}));");
 for(let i=1;i<=5;i++) {
  const sel=`[popovertarget="help-${i}"]`;
  await actualClick(sel);assert(await js(`return document.getElementById('help-${i}').matches(':popover-open')`));
  await key('\uE00C');assert(!(await js(`return document.getElementById('help-${i}').matches(':popover-open')`)));
  await js(`document.querySelector(${JSON.stringify(sel)}).focus()`);await key('\uE007');assert(await js(`return document.getElementById('help-${i}').matches(':popover-open')`));
  await key('\uE00C');
  await actualClick(sel);await http(path+'/actions',{actions:[{type:'pointer',id:'mouse',parameters:{pointerType:'mouse'},actions:[{type:'pointerMove',x:2,y:2,origin:'viewport'},{type:'pointerDown',button:0},{type:'pointerUp',button:0}]}]});
  assert(!(await js(`return document.getElementById('help-${i}').matches(':popover-open')`)));
  // Touch action supplied through WebDriver, then native Escape.
  const rect=await js(`const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}`);
  await http(path+'/actions',{actions:[{type:'pointer',id:'touch',parameters:{pointerType:'touch'},actions:[{type:'pointerMove',...rect,origin:'viewport'},{type:'pointerDown',button:0},{type:'pointerUp',button:0}]}]});
  assert(await js(`return document.getElementById('help-${i}').matches(':popover-open')`));await key('\uE00C');
 }
 await js("document.getElementById('help-open').focus()");await key('\uE007');assert(await js("return document.getElementById('help-dialog').open"));await key('\uE00C');assert(!(await js("return document.getElementById('help-dialog').open")));
 await click('#help-open');assert((await js("return document.getElementById('help-dialog').textContent")).includes("If this computer is shared, use Forget when you're done."));
 const screenshot=await http(path+'/screenshot',undefined,'GET');if(process.env.SHOT)fs.writeFileSync(process.env.SHOT,Buffer.from(screenshot,'base64'));
 await actualClick('#help-close');assert(!(await js("return document.getElementById('help-dialog').open")));
 assert.equal(requests.length,0,requests.join('\n'));
 await click('#clear');assert.equal(await js("return document.getElementById('results-title').textContent"),'4. Check and copy');
 const fixture=fs.readFileSync(new URL('./engine.test.js',import.meta.url),'utf8').match(/const OUTLOOK_EN = `([\s\S]*?)`;/)[1];
 await js(`document.getElementById('input').value=${JSON.stringify(fixture)};document.getElementById('input').dispatchEvent(new Event('input',{bubbles:true}));`);await click('#go');
 const text=await js("return document.getElementById('out').textContent");assert(text.includes('<PHONE>')&&text.includes('<PERSON-1>'));
 for(const secret of ['Whitfield','Adaeze','harbourline.ca'])assert(!text.includes(secret));
 // Clipboard action can be restricted on file://; UI must report either success or its manual fallback.
 await actualClick('#copy');
 assert((await js("return document.getElementById('copied').textContent")).match(/Copied|Copy was blocked/));
 assert.equal(requests.length,0,requests.join('\n'));
 // v1 migration notice dismisses once and opens the exclusions panel.
 await js("localStorage.clear();localStorage.setItem('email-scrub.preferences.v1',JSON.stringify({people:[],kill:'',excluded:['Analyst']}));");await http(path+'/refresh',{});
 assert.equal(await js("return document.getElementById('migration-notice').hidden"),false);await actualClick('#check-exclusions');assert(await js("return document.getElementById('exclusions-panel').open"));
 await actualClick('#dismiss-notice');await http(path+'/refresh',{});assert.equal(await js("return document.getElementById('migration-notice').hidden"),true);
 await click('#demo');await click('#clear');assert.equal(await js("return document.getElementById('forget').disabled"),false);await click('#forget');assert.equal(await js("return localStorage.getItem('email-scrub.preferences.v3')"),null);
 assert.equal(requests.length,0,requests.join('\n'));
 console.log('PASS installed Firefox '+session.capabilities.browserVersion+': file:// scrub/demo/help, preferences migration/isolation, candidate Remove, monotonic IDs, popover mouse/keyboard/touch/outside/Escape, dialog, copy feedback, zero page network requests (BiDi)');
} finally {ws.close();await http(path,undefined,'DELETE');}
