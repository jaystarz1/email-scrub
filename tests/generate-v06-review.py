#!/usr/bin/env python3
"""Generate complete French review inventory from the authoritative source tables."""
import json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
ui=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./src/v06.js').UI))"],cwd=root,text=True))
legacy=json.loads((root/'src/ui-translations.json').read_text())
lines=['# French review — v0.6.0','','LOCAL REVIEW ONLY. French is not approved for release. Extracted from the authoritative build tables. Review Canadian/Federal French terminology, tone, placeholder terminology, accessibility labels and complete help. No real email content is included.','','## New UI, help, prompts and modifiers','']
for key,value in ui['fr'].items():
    lines.extend(['### '+key,''])
    if isinstance(value,dict):
        for name,text in value.items():lines.extend(['EN: '+ui['en'][key][name],'','FR: '+text,''])
    elif isinstance(value,list):
        for en,fr in zip(ui['en'][key],value):lines.extend(['EN: '+en,'','FR: '+fr,''])
    else:lines.extend(['EN: '+ui['en'][key],'','FR: '+value,''])
lines.extend(['## Full inherited UI and help — localized in v0.6',''])
for en,fr in legacy.items():lines.extend(['EN: '+en,'','FR: '+fr,''])
lines.extend(['## Review notes','','- Placeholder tokens and EMAIL THREAD START/END markers intentionally remain English.','- Preset modifiers are instructions to an external AI, not promises of correctness.','- Signature matching is heuristic; review output or disable removal.','- Demo remains the same bilingual fictional thread.','- Approval and terminology corrections are pending; no publication performed.'])
out=root/'docs/FRENCH-REVIEW-V06.md';out.parent.mkdir(exist_ok=True);out.write_text('\n'.join(lines)+'\n');print(str(out))
