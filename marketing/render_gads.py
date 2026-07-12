import pathlib
from playwright.sync_api import sync_playwright

BASE = pathlib.Path(__file__).parent
OUT = BASE / "assets"
OUT.mkdir(exist_ok=True)

JOBS = [
    ("gads-landscape-a-1200x628.html",   "gads-landscape-a-1200x628.png",   1200, 628, 1),
    ("gads-landscape-b-1200x628.html",   "gads-landscape-b-1200x628.png",   1200, 628, 1),
    ("gads-square-a-1200.html",          "gads-square-a-1200x1200.png",     1200, 1200, 1),
    ("gads-square-b-1200.html",          "gads-square-b-1200x1200.png",     1200, 1200, 1),
    ("gads-logo-square-1200.html",       "gads-logo-square-1200x1200.png",  1200, 1200, 1),
    ("gads-logo-landscape-1200x300.html","gads-logo-landscape-1200x300.png",1200, 300, 1),
]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    for src, out, w, h, scale in JOBS:
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=scale)
        page.goto(f"file://{BASE / 'html' / src}")
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT / out))
        page.close()
        print("rendered", out)
    browser.close()
