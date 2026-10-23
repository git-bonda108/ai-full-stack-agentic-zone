"""Build one self-contained HTML file of the runbook (all CSS/JS inlined).

    python tools/build_single.py            -> dist/agentic-zone-runbook.html
    python tools/build_single.py --fragment <out.html>   (no <html>/<head>/<body>, for hosted viewers)

The single file opens by double-click, can be emailed or put on a share drive, and needs
internet only for web fonts and the Mermaid diagram library.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def inline(html: str) -> str:
    def css(m: re.Match) -> str:
        return "<style>\n" + (ROOT / m.group(1)).read_text(encoding="utf-8") + "\n</style>"

    def js(m: re.Match) -> str:
        code = (ROOT / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
        return f"<script>/* {m.group(1)} */\n{code}\n</script>"

    html = re.sub(r'<link rel="stylesheet" href="((?:assets|content)/[^"]+)">', css, html)
    html = re.sub(r'<script src="((?:assets|content)/[^"]+)"></script>', js, html)
    return html


def main() -> None:
    html = inline((ROOT / "index.html").read_text(encoding="utf-8"))
    if len(sys.argv) > 2 and sys.argv[1] == "--fragment":
        head = re.search(r"<head>(.*)</head>", html, re.S).group(1)
        body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
        head = re.sub(r'\s*<meta (charset|name="viewport")[^>]*>', "", head)
        out = Path(sys.argv[2])
        out.write_text(head.strip() + "\n" + body.strip() + "\n", encoding="utf-8")
    else:
        out = ROOT / "dist" / "agentic-zone-runbook.html"
        out.parent.mkdir(exist_ok=True)
        out.write_text(html, encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
