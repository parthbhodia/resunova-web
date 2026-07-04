import pathlib
from playwright.sync_api import sync_playwright

BASE = pathlib.Path(__file__).parent
OUT = BASE / "assets"
OUT.mkdir(exist_ok=True)

JOBS = [
    ("ph-01-hero.html",            "ph-gallery-1-hero-1270x760.png",      1270, 760, 2),
    ("ph-02-honest.html",          "ph-gallery-2-honesty-1270x760.png",   1270, 760, 2),
    ("ph-03-rewrites.html",        "ph-gallery-3-rewrites-1270x760.png",  1270, 760, 2),
    ("ph-04-jobs.html",            "ph-gallery-4-jobs-1270x760.png",      1270, 760, 2),
    ("ph-thumb-512.html",          "ph-thumbnail-512x512.png",            512,  512, 2),
    ("og-1200x630.html",           "og-link-share-1200x630.png",          1200, 630, 2),
    ("sq-1080.html",               "social-square-1080x1080.png",         1080, 1080, 2),
    ("reddit-banner-1920x384.html","reddit-banner-1920x384.png",          1920, 384, 1),
]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    for src, out, w, h, scale in JOBS:
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=scale)
        page.goto(f"file://{BASE / "html" / src}")
        page.wait_for_timeout(400)  # font settle
        page.screenshot(path=str(OUT / out))
        page.close()
        print("rendered", out)
    browser.close()
