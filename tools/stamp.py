"""Stamps every local script, stylesheet and asset reference with a content
hash (?v=…), so a browser never mixes a fresh page with stale cached files.

GitHub Pages lets browsers cache files for 10 minutes. Without stamps, a guest
who reloads right after an update can get the new HTML with the old scripts.
With stamps, each file names the exact version of everything it loads, and a
changed file changes the stamp of everything that depends on it.

Run from the repo root before committing:  python3 tools/stamp.py
"""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS_REF = re.compile(r"""(from\s+|import\(\s*|new URL\(\s*)(['"])(\.{1,2}/[^'"?]+?)(\?v=[0-9a-f]+)?\2""")
HTML_REF = re.compile(r"""((?:href|src)=")((?:\.\./)?assets/[^"?]+?\.(?:css|js|jpg|png|svg))(\?v=[0-9a-f]+)?(")""")

stamps = {}


def stamp_of(path):
    """Short hash of a file, after stamping the files it references (JS only)."""
    path = path.resolve()
    if path in stamps:
        return stamps[path]
    if path.suffix == '.js':
        text = path.read_text(encoding='utf-8')

        def repl(m):
            target = (path.parent / m.group(3)).resolve()
            return f"{m.group(1)}{m.group(2)}{m.group(3)}?v={stamp_of(target)}{m.group(2)}"

        stamped = JS_REF.sub(repl, text)
        if stamped != text:
            path.write_text(stamped, encoding='utf-8')
        data = stamped.encode('utf-8')
    else:
        data = path.read_bytes()
    stamps[path] = hashlib.sha1(data).hexdigest()[:8]
    return stamps[path]


def stamp_html(page):
    text = page.read_text(encoding='utf-8')

    def repl(m):
        target = (page.parent / m.group(2)).resolve()
        return f"{m.group(1)}{m.group(2)}?v={stamp_of(target)}{m.group(4)}"

    stamped = HTML_REF.sub(repl, text)
    if stamped != text:
        page.write_text(stamped, encoding='utf-8')
        print(f'stamped {page.relative_to(ROOT)}')


for page in [ROOT / 'index.html', ROOT / 'create' / 'index.html']:
    stamp_html(page)
for path, stamp in sorted(stamps.items()):
    print(f'  {stamp}  {path.relative_to(ROOT)}')
