// Run original regression suites through a documented v0.6 compatibility adapter.
// Originals remain intact. Changes: v4 key; signatures explicitly off for v0.5
// snapshots; Forget confirmation accepted and retained empty v4 settings asserted.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url),tests=new URL('./',import.meta.url);
let failed=false;
const suites=process.env.FIREFOX_ONLY?['firefox.test.mjs','v05-firefox.test.mjs']:['engine.test.js','v03.test.js','v04.test.js','v05.test.js','browser.test.mjs','v03-browser.test.mjs','v04-browser.test.mjs','v05-browser.test.mjs'];
for(const name of suites){
 let source=fs.readFileSync(new URL(name,tests),'utf8');
 source=source.replaceAll("'0.5.0'","'0.6.0'").replaceAll('email-scrub.preferences.v3','email-scrub.preferences.v4');
 if(name==='v03.test.js')source=source.replace('||[]).length,7)','||[]).length,10)');
 if(name==='v05.test.js'){
  source=source.replace("html.includes(\"setAttribute('aria-label','Replace '+r.text)\")","/setAttribute\\('aria-label',uiText\\([^)]*\\)\\+r.text\\)/.test(html)");
  source=source.replace("html.includes(\"setAttribute('aria-label','Keep '+r.text)\")","/setAttribute\\('aria-label',uiText\\([^)]*\\)\\+r.text\\)/.test(html)");
 }
 if(name.includes('firefox')){
  source=source.replace("await click('#forget');","await js(\"window.confirm=()=>true\");await click('#forget');").replace("assert.equal(await js(\"return localStorage.getItem('email-scrub.preferences.v4')\"),null)","assert.equal(await js(\"return JSON.parse(localStorage.getItem('email-scrub.preferences.v4')).me\"),'')");
  source=source.replaceAll("await click('#demo');","await js(\"document.getElementById('signatures').checked=false\");await click('#demo');").replaceAll("await actualClick('#demo');","await js(\"document.getElementById('signatures').checked=false\");await actualClick('#demo');");
 }else if(name.endsWith('.mjs')){
  const pageName=name==='browser.test.mjs'?'p':'page';
  source=source.replace('try {','try {\n '+pageName+".on('dialog',d=>d.accept());");
  source=source.replace('try{','try{\n '+pageName+".on('dialog',d=>d.accept());");
  const navigation=/await (?:p|page)\.goto\([^;]*\);/;
  source=source.replace(navigation,m=>m+'await '+pageName+".uncheck('#signatures');");
  // Migration itself asserts the v0.6 default-on; old demo snapshots opt out.
  if(name==='v03-browser.test.mjs')source=source.replace('await page.reload();','await page.reload();await page.uncheck(\'#signatures\');');
  if(name==='v04-browser.test.mjs')source=source.replace('await page.click(\'#demo\');','await page.uncheck(\'#signatures\');await page.click(\'#demo\');');
  if(name==='browser.test.mjs')source=source.replace("assert.equal(await p.evaluate(() => localStorage.getItem('email-scrub.preferences.v4')), null)","assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('email-scrub.preferences.v4')).me), '')");
  if(name==='v04-browser.test.mjs')source=source.replace("assert.equal(await page.evaluate(()=>localStorage.getItem('email-scrub.preferences.v4')),null)","assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('email-scrub.preferences.v4')).me),'')");
 }
 const temp=new URL('.v06-regression-'+name,tests);fs.writeFileSync(temp,source);
 try{const result=spawnSync('node',[temp.pathname],{cwd:root.pathname,env:{...process.env,BROWSER_CHANNEL:process.env.BROWSER_CHANNEL||'chrome'},encoding:'utf8',timeout:600000});console.log('SUITE '+name+'\n'+result.stdout+result.stderr);if(result.status!==0)failed=true;}finally{fs.unlinkSync(temp);}
}
process.exitCode=failed?1:0;
