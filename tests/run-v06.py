#!/usr/bin/env python3
"""Run the local review build/tests, retain genuine output, stage approved-scope files.
No notification, publication, git mutation or account access.
"""
import hashlib,json,pathlib,shutil,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
out=pathlib.Path('/Users/jaytarzwell/chief-of-staff/outbox/T-20261008-1232-email-scrub-v06')
out.mkdir(parents=True,exist_ok=True)
commands=[['python3','build.py'],['python3','tests/generate-v06-review.py']]
commands += [['node','tests/'+name] for name in ['v06-core.test.js','v06-signatures.test.js','v06-fixtures.test.js','v06-entities.test.js','v06-performance.test.js','v06-scrub-performance.test.js']]
commands += [['node','tests/v06-regressions.mjs'],['env','BROWSER_CHANNEL=msedge','node','tests/v06-regressions.mjs'],['env','FIREFOX_ONLY=1','GECKODRIVER_URL=http://127.0.0.1:4446','node','tests/v06-regressions.mjs']]
commands += [['node','tests/v06-browser.test.mjs'],['env','SHOT='+str(out/'chrome-french-mobile.png'),'node','tests/v06-extended-browser.test.mjs'],['env','BROWSER_CHANNEL=msedge','node','tests/v06-browser.test.mjs'],['env','BROWSER_CHANNEL=msedge','SHOT='+str(out/'edge-french-mobile.png'),'node','tests/v06-extended-browser.test.mjs'],['node','tests/v06-firefox.test.mjs']]
log=[];results=[]
initial_session=hashlib.sha256((root/'session_log.yaml').read_bytes()).hexdigest()
for cmd in commands:
    print('RUN '+' '.join(cmd),flush=True)
    run=subprocess.run(cmd,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    log.extend(['$ '+' '.join(cmd),run.stdout,'EXIT '+str(run.returncode),''])
    (out/'test-output.txt').write_text('\n'.join(log))
    results.append({'command':cmd,'exit':run.returncode})
    print(run.stdout,flush=True)
    if run.returncode:
        (out/'test-results.json').write_text(json.dumps(results,indent=2)+'\n')
        sys.exit(run.returncode)
assert hashlib.sha256((root/'session_log.yaml').read_bytes()).hexdigest()==initial_session,'Concurrent session log changed during tests; inspect, never overwrite'
for source,target in [('email-scrub.html','email-scrub.html'),('CHANGELOG.md','CHANGELOG.md'),('docs/FRENCH-REVIEW-V06.md','FRENCH-REVIEW-V06.md'),('docs/PAID-ROADMAP-V06.md','PAID-ROADMAP-V06.md'),('tests/V06-CHECKLIST.md','V06-CHECKLIST.md')]:shutil.copy2(root/source,out/target)
(out/'test-results.json').write_text(json.dumps(results,indent=2)+'\n')
manifest=[]
for file in sorted(out.iterdir()):
    if file.is_file() and file.name!='SHA256SUMS':manifest.append(hashlib.sha256(file.read_bytes()).hexdigest()+'  '+file.name)
(out/'SHA256SUMS').write_text('\n'.join(manifest)+'\n')
print('PASS all local verification and staging. Session log untouched by this runner. HTML SHA256 '+hashlib.sha256((out/'email-scrub.html').read_bytes()).hexdigest())
