#!/usr/bin/env python3
"""Build email-scrub.html: src/app.html with src/lists.js and src/engine.js inlined. No dependencies."""
import pathlib

HERE = pathlib.Path(__file__).parent
page = (HERE / "src" / "app.html").read_text(encoding="utf-8")
for marker, name in (("/*LISTS*/", "lists.js"), ("/*ENGINE*/", "engine.js")):
    assert page.count(marker) == 1, marker
    page = page.replace(marker, (HERE / "src" / name).read_text(encoding="utf-8"))
out = HERE / "email-scrub.html"
out.write_text(page, encoding="utf-8")
print(f"{out.name}: {out.stat().st_size / 1024:.0f} KB")
