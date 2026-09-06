#!/usr/bin/env python3
"""Captures des vues client modifiees par la fusion br1 -> dev (27/08/2026) :
Header (menu compte + tiroir mobile), HomePage (bandeau CEMAC + Flash Deals),
FlashDealsPage (nouvelle page), ProfilePage (nouveaux panneaux), FicheDetailPage.
Web (1440px) et mobile (390px).
"""
import sys, time, base64, subprocess
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import capture_gps_location_features as c

OUT_DIR = Path("/home/jacquy-ngonga4/Bureau/rapport-belivay/assets/captures-par-date/27-08-2026/merge-br1-views")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def shot(cdp, name):
    cdp.call("Runtime.evaluate", {"expression": "window.scrollTo(0, 0)"})
    time.sleep(0.4)
    result = cdp.call("Page.captureScreenshot", {"format": "png", "fromSurface": True}, timeout=30)
    (OUT_DIR / f"{name}.png").write_bytes(base64.b64decode(result["data"]))
    print(OUT_DIR / f"{name}.png")


def main():
    tokens = c.login(*c.ACCOUNTS["client"])

    c.DEBUG_PORT = 9440
    chrome_dir = Path("/tmp/belivay-merge-views-capture")
    chrome_dir.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(
        [c.CHROME_BIN, "--headless=new", f"--remote-debugging-port={c.DEBUG_PORT}",
         f"--user-data-dir={chrome_dir}", "--no-first-run", "--no-default-browser-check",
         "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
         "--window-size=1440,1200", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        c.wait_for_json(f"http://localhost:{c.DEBUG_PORT}/json/version")
        cdp = c.CDP(c.open_target("about:blank"))
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")

        # ═══════════════ WEB (1440x1200) ═══════════════
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1200, "deviceScaleFactor": 1, "mobile": False})

        # 1) Home visiteur non connecte
        c.goto(cdp, c.FRONT_CLIENT, "/", 1.0)
        c.evaluate(cdp, "localStorage.setItem('belivay_client_tour_completed', 'true')")
        c.goto(cdp, c.FRONT_CLIENT, "/", 2.5)
        shot(cdp, "01-web-home-visiteur")

        # 2) Bandeau "Pourquoi choisir BelivaY" + CEMAC
        c.evaluate(cdp, """
(() => {
  const h2 = [...document.querySelectorAll('h2')].find(el => (el.textContent||'').includes('Pourquoi choisir'));
  if (h2) { h2.closest('section').scrollIntoView({block: 'center'}); return true; }
  return false;
})()
""", 0.8)
        shot(cdp, "02-web-home-whybelivay-cemac")

        # 3) Connexion + menu compte (nouveau menu data-driven)
        c.set_auth(cdp, c.FRONT_CLIENT, tokens)
        c.goto(cdp, c.FRONT_CLIENT, "/", 2.0)
        c.evaluate(cdp, "document.getElementById('account')?.click()", 0.8)
        shot(cdp, "03-web-header-menu-compte")

        # 4) Flash Deals (nouvelle page)
        c.goto(cdp, c.FRONT_CLIENT, "/flash-deals", 2.5)
        shot(cdp, "04-web-flash-deals")

        # 5) Profil - dashboard principal
        c.goto(cdp, c.FRONT_CLIENT, "/profile", 2.5)
        shot(cdp, "05-web-profil-dashboard")

        # 6) Profil - panneau Compte BelivaY (wallet, nouveau)
        c.goto(cdp, c.FRONT_CLIENT, "/profile?panel=compte-belivay", 2.0)
        shot(cdp, "06-web-profil-compte-belivay")

        # 7) Profil - Messages (support inbox, nouveau)
        c.goto(cdp, c.FRONT_CLIENT, "/profile?panel=messages", 2.0)
        shot(cdp, "07-web-profil-messages")

        # 8) Profil - Fidelite (nouveau)
        c.goto(cdp, c.FRONT_CLIENT, "/profile?panel=fidelite", 2.0)
        shot(cdp, "08-web-profil-fidelite")

        # 9) Fiche produit (petit changement)
        c.goto(cdp, c.FRONT_CLIENT, "/catalog", 2.5)
        clicked = c.evaluate(cdp, """
(() => {
  const link = document.querySelector('a[href^="/product/"]');
  if (link) { link.click(); return true; }
  return false;
})()
""", 2.0)
        if clicked:
            shot(cdp, "09-web-fiche-produit")

        # ═══════════════ MOBILE (390x844) ═══════════════
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})

        # 10) Home mobile (bottom nav visible)
        c.goto(cdp, c.FRONT_CLIENT, "/", 2.5)
        shot(cdp, "10-mobile-home")

        # 11) Bandeau CEMAC mobile
        c.evaluate(cdp, """
(() => {
  const h2 = [...document.querySelectorAll('h2')].find(el => (el.textContent||'').includes('Pourquoi choisir'));
  if (h2) { h2.closest('section').scrollIntoView({block: 'center'}); return true; }
  return false;
})()
""", 0.8)
        shot(cdp, "11-mobile-whybelivay-cemac")

        # 12) Tiroir categories mobile
        c.goto(cdp, c.FRONT_CLIENT, "/", 2.0)
        c.evaluate(cdp, "document.querySelector('[aria-label=\"Ouvrir les categories\"]')?.click()", 0.8)
        shot(cdp, "12-mobile-tiroir-categories")

        # 13) Flash Deals mobile
        c.goto(cdp, c.FRONT_CLIENT, "/flash-deals", 2.5)
        shot(cdp, "13-mobile-flash-deals")

        # 14) Profil mobile
        c.goto(cdp, c.FRONT_CLIENT, "/profile", 2.5)
        shot(cdp, "14-mobile-profil-dashboard")

        # 15) Profil - Compte BelivaY mobile
        c.goto(cdp, c.FRONT_CLIENT, "/profile?panel=compte-belivay", 2.0)
        shot(cdp, "15-mobile-profil-compte-belivay")

        print(f"\ncaptures={len(list(OUT_DIR.glob('*.png')))} dir={OUT_DIR}")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
