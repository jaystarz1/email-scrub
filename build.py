#!/usr/bin/env python3
"""Build email-scrub.html: src/app.html with src/lists.js and src/engine.js inlined. No dependencies."""
import pathlib
import re
import json
import html
import html.entities

HERE = pathlib.Path(__file__).parent
entity_table = {key[:-1]: value for key, value in html.entities.html5.items() if key.endswith(';')}
entity_json = json.dumps(entity_table, ensure_ascii=False, sort_keys=True)
(HERE / 'src/entities.json').write_text(entity_json + '\n', encoding='utf-8')
page = (HERE / "src" / "app.html").read_text(encoding="utf-8")
translations = json.loads((HERE / 'src/ui-translations.json').read_text())
keys = {text: 'legacy' + str(i) for i, text in enumerate(translations)}
tables = {lang: {keys[text]: text if lang == 'en' else fr for text, fr in translations.items()} for lang in ('en', 'fr')}
def localize_markup(match):
    text = html.unescape(match.group(1))
    stripped = text.strip()
    if not stripped or stripped in ('?', '·'):
        return match.group(0)
    if stripped not in keys:
        raise ValueError('Untranslated markup: ' + stripped)
    return '>' + (' ' if text[:1].isspace() else '') + '<span data-i18n="' + keys[stripped] + '"></span>' + (' ' if text[-1:].isspace() else '') + '<'
parts = re.split(r'(<style>[\s\S]*?</style>|<script>[\s\S]*?</script>)', page)
for i, part in enumerate(parts):
    if part.startswith(('<script>', '<style>')):
        continue
    part = re.sub(r'<title>[^<]*</title>', '<title data-i18n="' + keys['Email Thread Scrubber'] + '"></title>', part)
    part = re.sub(r'>([^<>]+)<', localize_markup, part)
    def attr(m):
        text = html.unescape(m.group(2))
        if text == '?':
            return m.group(0)
        if text not in keys:
            raise ValueError('Untranslated attribute: ' + text)
        return m.group(1) + '="" data-i18n-' + m.group(1) + '="' + keys[text] + '"'
    parts[i] = re.sub(r'(aria-label|placeholder)="([^"]+)"', attr, part)
page = ''.join(parts)
# Compile the legacy template's English keys into table lookups, not UI literals.
# IDs and machine/type strings are not human-facing labels.
structural = {'text', 'file', 'id', 'age', 'url', 'zip', 'name', 'title', 'header', 'signature'}
start = page.index('(function ()')
script = page[start:]
def replace_script(m):
    raw=m.group(0);value=raw[1:-1].replace("\\'", "'")
    prefix=script[max(0,m.start()-30):m.start()]
    if value in keys and value not in structural and not re.search(r"\$\($|createElement\($|getElementById\($",prefix):
        return 'uiText('+json.dumps(keys[value])+')'
    return raw
page=page[:start]+re.sub(r"'(?:\\.|[^'\\])*'",replace_script,script)
page=page.replace('/*LOCALIZE*/', "document.querySelectorAll('[data-i18n]').forEach(function(el){el.textContent=t(el.dataset.i18n);});['aria-label','placeholder'].forEach(function(attr){document.querySelectorAll('[data-i18n-'+attr+']').forEach(function(el){el.setAttribute(attr,t(el.getAttribute('data-i18n-'+attr)));});});")
table_script='\nvar LegacyUI='+json.dumps(tables,ensure_ascii=False)+';Object.keys(LegacyUI).forEach(function(lang){Object.assign(EmailScrubV06.UI[lang],LegacyUI[lang]);});\n'
for marker, name in (("/*LISTS*/", "lists.js"), ("/*ENGINE*/", "engine.js"), ("/*V06*/", "v06.js")):
    assert page.count(marker) == 1, marker
    page = page.replace(marker, (HERE / "src" / name).read_text(encoding="utf-8"))
page=page.replace('<script>/*ENTITIES*/</script>', '<script>var EmailScrubEntities='+entity_json+';</script>')
page=page.replace('<script>\n(function ()', '<script>'+table_script+'\n(function ()')
out = HERE / "email-scrub.html"
out.write_text(page, encoding="utf-8")
print(f"{out.name}: {out.stat().st_size / 1024:.0f} KB")
