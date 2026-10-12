from pathlib import Path
import re, html
s=Path(__file__).resolve().parents[1].joinpath('src/app.html').read_text()
body=s[:s.index('<script>')]
print('MARKUP')
print('\n'.join(html.unescape(x.strip()) for x in re.findall(r'>([^<>]+)<',body) if x.strip() and not x.startswith(':root')))
print('JS')
print('\n'.join(sorted(set(x for x in re.findall(r"'([^'\n]*)'",s[s.index('(function ()'):]) if ' ' in x and re.search('[A-Za-z]',x)))))
