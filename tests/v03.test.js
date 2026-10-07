const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('../src/engine');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS ' + name); }
const run = (text, opts={}) => E.scrub(text, {note:false,...opts});
test('E1 short selections are bounded and case sensitive', () => {
  assert.equal(run('I can tell you. Tel: x. Cheers, TE',{excluded:[{text:'TE',n:1}]}).text,'I can tell you. Tel: x. Cheers, <EXCLUDED-1>');
  assert.equal(run('TE',{excluded:[{text:'te',n:1}]}).text,'TE');
  const cases=run('te TE',{excluded:[{text:'te',n:1}]});assert.equal(cases.text,'<EXCLUDED-1> TE');assert.deepEqual(cases.leaks,[]);
  assert.equal(run('le potentiel et malheureusement TE',{excluded:[{text:'TE',n:8}]}).text,'le potentiel et malheureusement <EXCLUDED-8>');
});
test('E1 Analyst and Analyste have separate boundaries; punctuation fragments match', () => {
  assert.equal(run('Analyst Analyste',{excluded:[{text:'Analyst',n:1}]}).text,'<EXCLUDED-1> Analyste');
  assert.equal(run('Analyst Analyste',{excluded:[{text:'Analyste',n:1}]}).text,'Analyst <EXCLUDED-1>');
  assert.equal(run('name@Org HQ@Place',{excluded:[{text:'@Org HQ@Place',n:1}]}).text,'name<EXCLUDED-1>');
});
test('E2 Last, First with initial is one person', () => {
  for(const initial of ['T','T.']) {
    const r = run(`From: Smith, Jane ${initial}@ORG HQ@Place <a@b.com>`);
    assert.equal(r.text,'From: <PERSON-1> <ORG-1> <EMAIL>'); assert.equal(r.people.length,1);
    assert(r.secrets.includes('@ORG HQ@Place'));
  }
});
test('E2 parentheses, square brackets, pipes, combinations, duplicates and French headers', () => {
  for(const deco of ['(Finance)','[Finance]','| Acme Corp','@Org (Finance) [Place] | Acme Corp']) {
    const r = run(`To: Doe, John ${deco} <j@x.com>\nCc: Ann Lee ${deco} <a@acme.com>`);
    assert.equal(r.text,'To: <PERSON-1> <ORG-1> <EMAIL>\nCc: <PERSON-2> <ORG-1> <EMAIL>');
  }
  assert.equal(run('De : Tremblay, Marie-Ève T@Bureau@Ville <a@example.com>\nÀ : Luc Gagnon (Finances) <b@example.com>').text,'De : <PERSON-1> <ORG-1> <EMAIL>\nÀ : <PERSON-2> <ORG-2> <EMAIL>');
  const r=run('From: Jane Doe (Finance) <a@b.com>\nelsewhere (Finance)'); assert(r.leaks.includes('(Finance)'));
  assert.equal(run('From: Smith, Jane <a@b.com>').text,'From: <PERSON-1> <EMAIL>');
});
test('E2 every supported header and multiple decorated recipients', () => {
  for(const h of ['From','To','Cc','Bcc','De','À','Cci','Sender','Reply-To']) {
    assert.equal(run(`${h}: Smith, Jane T@ORG HQ@Place <a@b.com>`).text, `${h}: <PERSON-1> <ORG-1> <EMAIL>`);
  }
  assert.equal(run('To: Jane Doe (Finance) <a@b.com>; John Smith [Office] <b@c.com>').text,'To: <PERSON-1> <ORG-1> <EMAIL>; <PERSON-2> <ORG-2> <EMAIL>');
});
test('E3 prose names warn without replacement or leak gate', () => {
  const r = run('Tell Andre she is the POC.');
  assert.equal(r.text,'Tell Andre she is the POC.'); assert.deepEqual(r.possibleNames,['Andre']); assert.deepEqual(r.leaks,[]);
  assert(r.warnings.includes('Possible names still in the text: Andre.'));
  assert.deepEqual(run('From: Andre Doe <a@b.com>\nTell Andre.').possibleNames,[]);
  assert.deepEqual(run('in May 2026. Will this work? En mai 2026.').possibleNames,[]);
  assert(run('Tell May about it.').possibleNames.includes('May'));
  assert(run('Dites à André de venir.').possibleNames.includes('André'));
  assert(run('contact Zorvex Drenn today.').possibleNames.includes('Zorvex Drenn'));
  const removed = run(r.text,{excluded:[{text:'Andre',n:1}]}); assert.equal(removed.text,'Tell <EXCLUDED-1> she is the POC.'); assert.deepEqual(removed.possibleNames,[]);
});
test('E4 stable exclusion IDs across add, forget and length-sort changes', () => {
  const excluded=[{text:'long private passage',n:1},{text:'TE',n:2}];
  const text='long private passage TE another even longer private passage';
  assert(run(text,{excluded}).text.includes('<EXCLUDED-1> <EXCLUDED-2>'));
  excluded.push({text:'another even longer private passage',n:3});
  assert.equal(run(text,{excluded}).text,'<EXCLUDED-1> <EXCLUDED-2> <EXCLUDED-3>');
  excluded.splice(1,1); assert.equal(run(text,{excluded}).text,'<EXCLUDED-1> TE <EXCLUDED-3>');
  const prefs=E.migratePreferences({people:[],kill:'',excluded,nextExcluded:9});assert.equal(prefs.nextExcluded,9);
  assert.equal(run('short then a longer term',{kill:['short','','a longer term']}).text,'<TERM-1> then <TERM-2>');
});
test('E4 migration preserves v1 order and monotonically increasing counter', () => {
  const old={people:[{role:'Me',title:'',names:'Demo'}],kill:'X',excluded:['short','longer passage']};
  const saved=E.migratePreferences(old);
  assert.deepEqual(saved.excluded,[{text:'short',n:1},{text:'longer passage',n:2}]); assert.equal(saved.nextExcluded,3);
  assert.deepEqual(old.excluded,['short','longer passage']); assert.deepEqual(E.migratePreferences(saved),saved);
  assert.throws(()=>E.migratePreferences({...old,excluded:[{text:'x',n:0}]}));
});
test('F1 inline demo 40–90 lines, complete chain, bilingual and all token types', () => {
  assert(E.sample.split('\n').length>=40 && E.sample.split('\n').length<=90);
  const r=run(E.sample,{roles:[{label:'Client',names:['Mira Quill']}],kill:['Project Lantern'],excluded:[{text:'sample-private',n:1}]});
  for(const tok of ['CLIENT','PERSON-1','ORG-1','EMAIL','PHONE','ADDRESS','POSTAL','DATE-1','ID','SIN','SSN','CARD','URL','TERM-1','EXCLUDED-1']) assert(r.text.includes(`<${tok}>`),tok);
  assert(r.text.includes('[Confidentiality notice removed]')); assert(r.possibleNames.includes('Andre'));
  assert.equal((r.text.match(/From:/g)||[]).length,3); assert(r.text.includes('Cordialement'));
});
test('privacy and inline deliverable constraints', () => {
  const html=fs.readFileSync('email-scrub.html','utf8'), oldCsp="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'";
  assert(html.includes(oldCsp)); assert(!/<(?:script|link)[^>]+(?:src|href)=/i.test(html));
  assert(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/.test(html));
  assert.equal(E.version,'0.5.0'); assert(html.includes("version: '0.5.0'"));
  assert.equal((html.match(/popovertarget=/g)||[]).length,7); assert(html.includes('<dialog'));
});
console.log(`PASS v0.3: ${checks} acceptance groups`);
