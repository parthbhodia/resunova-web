"""Render the Chrome Web Store listing images for Resunova Auto-Fill.

Sizes are exact (device scale factor 1) and every file is saved as 24-bit RGB PNG, because the
Store wants 24-bit PNG or JPEG with no alpha channel.

    python marketing/render_cws.py

The screenshots embed REAL captures of the extension (marketing/assets/cws/raw/), produced by
autoapply-extension/e2e/store_shots.py against a demo page. Re-capture there if the widget changes.
"""
import pathlib
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

BASE = pathlib.Path(__file__).parent
OUT = BASE / "assets" / "cws"
OUT.mkdir(parents=True, exist_ok=True)

JOBS = [
    ("cws-tile-440x280.html",       "cws-small-tile-440x280.png",   440,  280),
    ("cws-marquee-1400x560.html",   "cws-marquee-1400x560.png",     1400, 560),
    ("cws-shot-1.html",             "cws-screenshot-1-1280x800.png", 1280, 800),
    ("cws-shot-2.html",             "cws-screenshot-2-1280x800.png", 1280, 800),
    ("cws-shot-3.html",             "cws-screenshot-3-1280x800.png", 1280, 800),
    ("cws-shot-4.html",             "cws-screenshot-4-1280x800.png", 1280, 800),
    ("cws-shot-5.html",             "cws-screenshot-5-1280x800.png", 1280, 800),
]

only = sys.argv[1:]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    for src, out, w, h in JOBS:
        if only and not any(o in src or o in out for o in only):
            continue
        html = BASE / "html" / src
        if not html.exists():
            print("skipped (no template yet)", src)
            continue
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        page.goto(f"file://{html}")
        page.wait_for_timeout(500)  # fonts and images settle
        target = OUT / out
        page.screenshot(path=str(target))
        page.close()
        Image.open(target).convert("RGB").save(target, "PNG")  # drop any alpha channel
        im = Image.open(target)
        assert im.size == (w, h) and im.mode == "RGB", (out, im.size, im.mode)
        print("rendered", out, im.size, im.mode)
    browser.close()
