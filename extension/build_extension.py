#!/usr/bin/env python3
"""Package email-scrub.html as a browser extension. No dependencies beyond Pillow (icons).

Outputs, under extension/dist/:
  chromium/  + email-scrub-chromium-<ver>.zip  Chrome, Edge, Brave, Opera, Vivaldi
  firefox/   + email-scrub-firefox-<ver>.zip   Firefox 140+ (ESR 140 and current)

Extension pages may not run inline script, so each inline <script> in the built page
becomes its own file, loaded in the original order. The page's own CSP keeps its
no-network rules with script-src narrowed to the extension's files. Run build.py first
if src/ changed; this script packages whatever email-scrub.html currently holds.
"""
import json
import pathlib
import re
import shutil
import zipfile

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
SRC = HERE / 'src'
DIST = HERE / 'dist'
GECKO_ID = 'email-thread-scrubber@thechatbotgenius.com'
CSP = ("default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src data:; "
       "form-action 'none'; base-uri 'none'; object-src 'none'")


def version():
    text = (ROOT / 'CHANGELOG.md').read_text(encoding='utf-8')
    return re.search(r'^## (\d+\.\d+\.\d+)', text, re.M).group(1)


def split_page():
    page = (ROOT / 'email-scrub.html').read_text(encoding='utf-8')
    old_csp = re.search(r'<meta http-equiv="Content-Security-Policy" content="([^"]+)">', page)
    assert old_csp and "script-src 'unsafe-inline'" in old_csp.group(1), 'page CSP changed; review before packaging'
    page = page.replace(old_csp.group(0), '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">')
    assert not re.search(r'\son[a-z]+="', page), 'inline event handler attributes are blocked in extensions'
    scripts = []

    def externalize(m):
        scripts.append(m.group(1))
        return '<script src="scrub-%d.js"></script>' % len(scripts)
    page = re.sub(r'<script>([\s\S]*?)</script>', externalize, page)
    assert '<script>' not in page and len(scripts) >= 4, 'unexpected script layout'
    page = page.replace('</body>', '<script src="bridge.js"></script>\n</body>')
    assert 'bridge.js' in page, 'no </body> to attach the bridge to'
    return page, scripts


def icon(size):
    # Blue rounded square, white envelope, the flap drawn as a "scrubbed" bar.
    s = size * 4
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=s // 5, fill=(31, 95, 191, 255))
    m, top, bot = s * 0.18, s * 0.28, s * 0.74
    w = max(2, s // 14)
    d.rounded_rectangle([m, top, s - m, bot], radius=s // 20, outline='white', width=w)
    d.line([(m, top), (s / 2, s * 0.52), (s - m, top)], fill='white', width=w, joint='curve')
    return img.resize((size, size), Image.LANCZOS)


def manifest(target, ver):
    msg = json.loads((SRC / '_locales/en/messages.json').read_text(encoding='utf-8'))
    fr = json.loads((SRC / '_locales/fr/messages.json').read_text(encoding='utf-8'))
    for m in (msg, fr):
        assert len(m['extDescription']['message']) <= 132, 'store description over 132 characters'
        assert len(m['extName']['message']) <= 45, 'name over 45 characters'
    icons = {str(n): 'icons/icon-%d.png' % n for n in (16, 32, 48, 128)}
    m = {
        'manifest_version': 3,
        'name': '__MSG_extName__',
        'description': '__MSG_extDescription__',
        'version': ver,
        'default_locale': 'en',
        'icons': icons,
        'action': {'default_title': '__MSG_actionTitle__', 'default_icon': icons},
        'permissions': ['contextMenus', 'activeTab', 'scripting', 'storage'],
        'content_security_policy': {'extension_pages': CSP},
    }
    if target == 'chromium':
        m['background'] = {'service_worker': 'background.js'}
        m['minimum_chrome_version'] = '116'
    else:
        m['background'] = {'scripts': ['background.js']}
        m['browser_specific_settings'] = {
            'gecko': {'id': GECKO_ID, 'strict_min_version': '140.0',
                      'data_collection_permissions': {'required': ['none']}},
            'gecko_android': {'strict_min_version': '142.0'}}
    return m


def build():
    ver = version()
    page, scripts = split_page()
    if DIST.exists():
        shutil.rmtree(DIST)
    for target in ('chromium', 'firefox'):
        out = DIST / target
        (out / 'icons').mkdir(parents=True)
        (out / 'scrubber.html').write_text(page, encoding='utf-8')
        for i, body in enumerate(scripts, 1):
            (out / ('scrub-%d.js' % i)).write_text(body, encoding='utf-8')
        for name in ('background.js', 'bridge.js'):
            shutil.copy(SRC / name, out / name)
        shutil.copytree(SRC / '_locales', out / '_locales')
        for n in (16, 32, 48, 128):
            icon(n).save(out / 'icons' / ('icon-%d.png' % n))
        for name in ('LICENSE', 'NOTICE'):
            shutil.copy(ROOT / name, out / name)
        (out / 'manifest.json').write_text(json.dumps(manifest(target, ver), indent=2) + '\n', encoding='utf-8')
        archive = DIST / ('email-scrub-%s-%s.zip' % (target, ver))
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
            for f in sorted(out.rglob('*')):
                if f.is_file():
                    z.write(f, f.relative_to(out).as_posix())
        print('%s: %d KB' % (archive.name, archive.stat().st_size // 1024))


if __name__ == '__main__':
    build()
