const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('../src/engine');
let checks=0;function test(label,fn){fn();checks++;console.log('PASS '+label);}const run=(t,o={})=>E.scrub(t,{note:false,...o});
test('I1 checksum identifiers, originals and negative checksum cases',()=>{
 for(const [value,token] of [['GB82 WEST 1234 5698 7654 32','IBAN'],['DE89370400440532013000','IBAN'],['12345-001-1234567','BANK'],['12345 001 123456789012','BANK'],['192.168.1.42','IP'],['255.0.255.0','IP'],['2001:0db8:0000:0000:0000:ff00:0042:8329','IP'],['2001:db8::42','IP'],['::1','IP'],['::ffff:192.0.2.42','IP'],['02:00:00:00:00:42','MAC'],['02-00-00-00-00-42','MAC'],['1M8GDM9AXKP042788','VIN'],['45.0000, -75.0000','GPS'],['-90.0000, 180.0000','GPS'],['@jay_t','HANDLE']]){const r=run(value);assert.equal(r.text,'<'+token+'>',value);assert(r.secrets.includes(value));assert.deepEqual(r.leaks,[]);}
 for(const value of ['GB83 WEST 1234 5698 7654 32','1M8GDM9A1KP042788','version 1.2.3.4','192.168.1','256.1.2.3','1.2.3.4.5','2001:::42','2001:db8:1:2:3:4:5','91.0000, 180.0000','45.000, -75.0000','@example.com'])assert.equal(run(value).text,value,value);
 assert.equal(run('name@example.com').text,'<EMAIL>');
});
test('I2 six kinds; final offsets; no overlap; currency/date/time/phone/token guards',()=>{
 const r=E.scrub('Tell Andre: R10 843 221; A1234-56789-01234; Smith_J_PAR_2024.pdf; aged 52; linkedin.com/in/fake-test; NY 10001.');
 assert.deepEqual(new Set(r.flags.map(f=>f.kind)),new Set(['name','id','file','age','url','zip']));
 for(const f of r.flags){assert.equal(r.text.slice(f.start,f.end),f.text);assert(f.id);assert(f.start>=r.text.indexOf('\n\n'));}
 for(let i=1;i<r.flags.length;i++)assert(r.flags[i].start>=r.flags[i-1].end);
 for(const value of ['$12,500','€12500','2026-10-07','613 555 0100','12:50000','<EXCLUDED-12345>','<PERSON-12345>'])assert(!run(value).flags.some(f=>f.kind==='id'),value);
 assert.equal(run('10001').flags[0].kind,'id');assert.equal(run('NY 10001-1234').flags[0].kind,'zip');
 for(const age of ['52-year-old','aged 52','age 52','âgé de 52 ans','52 ans'])assert.equal(run(age).flags[0].kind,'age');
 assert(!run('https://linkedin.com/in/test').flags.some(f=>f.kind==='url'));
});
test('V1/V2 kept text is unchanged, exclusions replace all occurrences, leak/yellow separation',()=>{
 const t='R10 843 221 and R10 843 221';const r=run(t);assert.equal(r.flags.length,2);
 const kept=run(t,{kept:['R10 843 221']});assert.equal(kept.text,t);assert.deepEqual(kept.flags,[]);
 assert.equal(run(t,{excluded:[{text:'R10 843 221',n:7}]}).text,'<EXCLUDED-7> and <EXCLUDED-7>');
 assert.equal(run(t).flags.length,2);
 assert.deepEqual(E.reviewFlags(t,[],[],['R10 843 221']),[]);assert.equal(E.leakRanges(t,['R10 843 221']).length,2);
});
test('A1/A2 pure button state and reset signatures',()=>{
 const clean=run('ordinary text'),yellow=run('R10 843 221'),red={...yellow,leaks:['R10 843 221']};
 assert.deepEqual(E.reviewState(clean,false),{label:'Copy',accept:false,red:false});
 assert.equal(E.reviewState(yellow,false).label,'Accept (1 to review)');
 assert.deepEqual(E.reviewState(red,false),{label:'Accept with 1 leak',accept:true,red:true});assert.equal(E.reviewState({...red,flags:[]},true).label,'Copy');
 assert.notEqual(E.reviewSignature(yellow),E.reviewSignature(run('changed text')));
 assert.notEqual(E.reviewSignature(yellow),E.reviewSignature(red));assert.notEqual(E.reviewSignature(yellow),E.reviewSignature({...yellow,flags:[]}));
});
test('T1 post-exclusion renumbering with accurate map, labels and ME protected',()=>{
 const r=run('Hi Alice,\nHi Bob,\nHi Carol,',{excluded:[{text:'Alice',n:1}]});assert.equal(r.text,'Hi <EXCLUDED-1>,\nHi <PERSON-1>,\nHi <PERSON-2>,');assert.deepEqual(r.people.map(p=>p.token),['<PERSON-1>','<PERSON-2>']);
 assert.equal(run('Hi Alice,\nHi Bob,',{me:'Alice',thread:[{names:'Bob',label:'LABEL'}]}).text,'Hi <ME>,\nHi <LABEL>,');
});
test('T2 symbolic group mailboxes, generic display strings and decorated people',()=>{
 for(const prefix of ['++','#','*'])assert.equal(run('Cc: '+prefix+'Team Inquiries@Dept@City <team@example.com>').text,'Cc: <ORG-1> <EMAIL>');
 assert.equal(run('Cc: ++Support <team@example.com>').text,'Cc: <ORG-1> <EMAIL>');
 assert.equal(run('Cc: Smith, John@Dept@City <john@example.com>').text,'Cc: <PERSON-1> <ORG-1> <EMAIL>');
});
test('H1/H2 UI structure, privacy constraints, controls, demo and version',()=>{
 const html=fs.readFileSync('email-scrub.html','utf8');assert.equal(E.version,'0.5.0');assert(!html.includes('I checked: copy anyway'));assert(!html.includes('Remove possible name'));
 for(const id of ['review-panel','review-counter','review-next','help-review','help-copy'])assert(html.includes('id="'+id+'"'));
 assert(html.includes('user-select:none'));assert(html.includes("setAttribute('aria-label','Replace '+r.text)"));assert(html.includes("setAttribute('aria-label','Keep '+r.text)"));assert(html.includes('sr-only'));
 for(const phrase of ['What is caught automatically','What is flagged for you','What is not reliably caught','Reviewing the result','Preferences'])assert(html.includes(phrase));
 assert(html.indexOf('What is caught automatically')<html.indexOf('What is flagged for you'));assert(html.indexOf('What is flagged for you')<html.indexOf('What is not reliably caught'));
 const demo=run(E.sample);for(const token of ['IBAN','BANK','IP','MAC','VIN','GPS','HANDLE'])assert(demo.text.includes('<'+token+'>'));
 assert.deepEqual(demo.leaks,[]);assert(demo.flags.length);for(const kind of ['id','file','age','name','url','zip'])assert(demo.flags.some(f=>f.kind===kind));
 const baseline=fs.readFileSync('tests/V04-CHECKLIST.md','utf8');assert(baseline);
 assert(html.includes("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'"));assert(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/.test(html));assert(!/<(?:script|link)[^>]+(?:src|href)=/i.test(html));
});
test('V5 highlight colours meet AA in both themes',()=>{
 function luminance(hex){const c=hex.replace('#','').match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
 for(const [ink,bg] of [['#382900','#ffe39a'],['#174ea6','#e6eefc'],['#a9c6ff','#22324d']]){const a=luminance(ink),b=luminance(bg);assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);}
});
console.log('PASS v0.5: '+checks+' engine/spec groups');
