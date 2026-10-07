const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('../src/engine');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS ' + name); }
const run = (text, opts={}) => E.scrub(text,{note:false,me:'',thread:[],saved:[],...opts});
const saved = (names,label='',id='s1',lastUsed='') => ({names,label,id,lastUsed});
test('P2/P3/P4 new user starts empty',()=>{assert.deepEqual(E.emptyPreferences(),{me:'',saved:[],kill:'',excluded:[],nextExcluded:1});});
test('P2 Me applies every form first',()=>{
 const r=run('Jay Tarzwell said Jay can attend.',{me:'Jay Tarzwell, Jay',thread:[{names:'Jay',label:'OTHER'}],saved:[saved('Jay Tarzwell','SAVED')]});
 assert.equal(r.text,'<ME> said <ME> can attend.');assert.deepEqual(r.usedSaved,[]);
});
test('P1 explicit and discovered share appearance numbering in either order',()=>{
 const opts={thread:[{names:'Zorvex Quill',label:''}]};
 assert.equal(run('Zorvex Quill\nFrom: Jane Doe <x@example.com>',opts).text,'<PERSON-1>\nFrom: <PERSON-2> <EMAIL>');
 assert.equal(run('From: Jane Doe <x@example.com>\nZorvex Quill',opts).text,'From: <PERSON-1> <EMAIL>\n<PERSON-2>');
});
test('P1 labels participate and cannot collide with automatic tokens or ME',()=>{
 const r=run('Zorvex Quill\nFrom: Jane Doe <x@example.com>',{thread:[{names:'Zorvex Quill',label:'PERSON-1'}]});
 assert.equal(r.text,'<PERSON-1>\nFrom: <PERSON-2> <EMAIL>');
 assert.equal(run('Zorvex Quill',{thread:[{names:'Zorvex Quill',label:'ME'}]}).text,'<ME-2>');
 assert.equal(run('Zorvex Quill\nFrom: Jane Doe <x@example.com>',{thread:[{names:'Zorvex Quill',label:'GRIEVOR'}]}).text,'<GRIEVOR>\nFrom: <PERSON-1> <EMAIL>');
});
test('P3 labelled row sanitizes; repeated labels remain distinct',()=>{
 assert.equal(run('Zorvex Quill',{thread:[{names:'Zorvex Quill',label:' grievor '}]}).text,'<GRIEVOR>');
 assert.equal(run('Zorvex Quill; Velqor Drenn',{thread:[{names:'Zorvex Quill',label:'Team lead'},{names:'Velqor Drenn',label:'Team lead'}]}).text,'<TEAM-LEAD>; <TEAM-LEAD-2>');
});
test('P3 Save moves a row; Clear keeps Me and Saved people',()=>{
 const p=E.emptyPreferences();p.me='Fiction Sender';const thread=[{names:'Zorvex Quill',label:'GRIEVOR'},{names:'Velqor Drenn',label:''}];
 assert(E.savePerson(p,thread,0));assert.equal(thread.length,1);assert.equal(p.saved[0].label,'GRIEVOR');E.clearThread(thread);assert.deepEqual(thread,[]);assert.equal(p.me,'Fiction Sender');assert.equal(p.saved.length,1);
 assert(!E.savePerson(p,[{names:'',label:''}],0));
});
test('P4 saved search ignores accents/case and matches substrings',()=>{assert.equal(E.searchSaved([saved('Jónes, Joñ')],'jon').length,1);assert.equal(E.searchSaved([saved('Jones')],'JON').length,1);});
test('P4 saved people apply automatically, thread exact forms win unchanged saved data',()=>{
 const people=[saved('Zorvex Quill, Zorvex','SAVED')], before=JSON.stringify(people);
 assert.equal(run('Zorvex Quill',{saved:people}).text,'<SAVED>');
 const r=run('Zorvex Quill',{saved:people,thread:[{names:'Zorvex Quill',label:'THREAD'}]});assert.equal(r.text,'<THREAD>');assert.deepEqual(r.usedSaved,[]);assert.equal(JSON.stringify(people),before);
});
test('P4 last used changes only for actual replacement, stores date only',()=>{
 const p=E.emptyPreferences();p.saved=[saved('Zorvex Quill','CLIENT','a','2026-10-01'),saved('Velqor Drenn','BOSS','b','2026-10-02')];
 let r=run('ordinary text',{saved:p.saved});E.updateLastUsed(p,r.usedSaved,'2026-10-07');assert.equal(p.saved[0].lastUsed,'2026-10-01');
 r=run('Zorvex Quill',{saved:p.saved});E.updateLastUsed(p,r.usedSaved,'2026-10-07');assert.deepEqual(p.saved.map(r=>r.lastUsed),['2026-10-07','2026-10-02']);
 r=run('Zorvex Quill',{saved:p.saved,kill:['Zorvex Quill']});assert.deepEqual(r.usedSaved,[]);
});
test('P5 v2 migrates Me, CLIENT and custom label; excludes empty rows',()=>{
 const p=E.migratePreferences({people:[{role:'Me',title:'Reviewer',names:'Fiction Sender, Fiction'},{role:'Client',title:'',names:'Zorvex Quill'},{role:'Boss',title:'GRIEVOR',names:'Velqor Drenn'},{role:'Vendor',title:'',names:''}],kill:'term',excluded:[{text:'TE',n:3}],nextExcluded:8});
 assert.equal(p.me,'Fiction Sender, Fiction');assert.deepEqual(p.saved.map(r=>r.label),['CLIENT','GRIEVOR']);assert.equal(p.nextExcluded,8);assert.deepEqual(Object.keys(p),['me','saved','kill','excluded','nextExcluded']);assert.deepEqual(E.migratePreferences(p),p);
 const r=run('Fiction Sender, Zorvex Quill and Velqor Drenn',{me:p.me,saved:p.saved});assert(r.text.includes('<ME>')&&r.text.includes('<CLIENT>')&&r.text.includes('<GRIEVOR>'));
});
test('P5 Forget erases remembered sources and exclusions',()=>{assert.deepEqual(E.forgetPreferences(),E.emptyPreferences());});
test('R1 demo disables Forget with exact tooltip; exits reenable it',()=>{assert.deepEqual(E.demoControls(true),{disabled:true,title:'Leave the demo to manage saved preferences.'});assert.deepEqual(E.demoControls(false),{disabled:false,title:''});});
test('R2 pair acronym and colon suppression retains Andre and Fictional Widgets',()=>{
 const r=run('Demo SIN: test\nDemo SSN: test\nDemo POC test\nFictional Labels: test\nTell Andre about Fictional Widgets.');
 for(const name of ['Demo SIN','Demo SSN','Demo POC','Fictional Labels'])assert(!r.possibleNames.includes(name));
 for(const name of ['Andre','Fictional Widgets'])assert(r.possibleNames.includes(name));
 const d=run(E.sample);assert(!d.possibleNames.includes('Demo SIN')&&!d.possibleNames.includes('Demo SSN'));assert(d.possibleNames.includes('Andre')&&d.possibleNames.includes('Fictional Widgets'));
});
test('R3 Canadian/US city in address context only, quoted and bilingual',()=>{
 for(const line of ['Sampleville, ON K1A 0B1','New York, NY 10001','Québec, QC G1A 0A2'])assert.equal(run('123 Demo Street\n'+line).text,'<ADDRESS>\n<ADDRESS> <POSTAL>');
 assert.equal(run('> 123 Demo Street\n> Sampleville, ON').text,'> <ADDRESS>\n> <ADDRESS>');
 assert.equal(run('Sampleville, ON K1A 0B1').text,'<ADDRESS> <POSTAL>');assert.equal(run('Meet in Ottawa, ON tomorrow.').text,'Meet in Ottawa, ON tomorrow.');
 assert.equal(run('Ottawa, ZZ K1A 0B1').text,'Ottawa, ZZ <POSTAL>');
});
test('R4 close button is plain, invokes dialog.close, no form',()=>{const html=fs.readFileSync('src/app.html','utf8');assert(html.includes('id="help-close" type="button"'));assert(html.includes("$('help-dialog').close()"));assert(!/<form/.test(html));});
test('R5 old exclusions trigger notice; current exclusions do not',()=>{assert(E.migrationNotice({excluded:['Analyst']}));assert(!E.migrationNotice({excluded:[{text:'Analyst',n:1}]}));assert(!E.migrationNotice({excluded:[]}));assert.equal(run('Analyste Analyst',{excluded:E.migratePreferences({people:[],kill:'',excluded:['Analyst']}).excluded}).text,'Analyste <EXCLUDED-1>');});
test('delivery version/privacy constraints retained',()=>{
 const html=fs.readFileSync('email-scrub.html','utf8');assert.equal(E.version,'0.5.0');assert(html.includes("version: '0.5.0'"));assert(html.includes("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'"));assert(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/.test(html));assert(!/<(?:script|link)[^>]+(?:src|href)=/i.test(html));
});
console.log(`PASS v0.4: ${checks} acceptance groups`);
