#!/usr/bin/env python3
"""Captures UI reelles remplacant les tests curl du 18-08-2026 :
catalogue rapide, fiche produit non cassee, precision d'adresse au checkout,
et carte de suivi affichant des positions distinctes pour Odza et Jouvence.
"""
import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

os.environ.setdefault("BELIVAY_CLIENT_URL", "http://localhost:5174")
os.environ.setdefault("BELIVAY_CHROME_DEBUG_PORT", "9430")
os.environ.setdefault(
    "BELIVAY_CAPTURE_DIR",
    str(ROOT / "assets/captures-par-date/18-08-2026/ui-corrections-20260818"),
)

from capture_workflow_views import (  # noqa: E402
    CDP,
    click_text,
    open_target,
    safe_name,
    screenshot,
    wait_for_json,
    wait_for_render,
)

CLIENT_URL = os.environ["BELIVAY_CLIENT_URL"]
DEBUG_PORT = int(os.environ["BELIVAY_CHROME_DEBUG_PORT"])
OUT_DIR = Path(os.environ["BELIVAY_CAPTURE_DIR"])
CHROME_BIN = os.environ.get("CHROME_BIN", "/usr/bin/google-chrome")

with open("/tmp/client_token.json") as fh:
    TOKENS = json.load(fh)


def scroll_to_text(cdp: CDP, text: str):
    expr = f"""
(() => {{
  const needle = {json.dumps(text)}.toLowerCase();
  const nodes = [...document.querySelectorAll('button,a,h1,h2,h3,p,div,span')]
    .filter((el) => (el.innerText || el.textContent || '').trim().toLowerCase().includes(needle));
  const target = nodes[nodes.length - 1];
  if (target) target.scrollIntoView({{block: 'center'}});
  return Boolean(target);
}})()
"""
    result = cdp.call("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    time.sleep(0.5)
    return result.get("result", {}).get("value")


def screenshot_here(cdp: CDP, name: str):
    result = cdp.call(
        "Page.captureScreenshot",
        {"format": "png", "captureBeyondViewport": False, "fromSurface": True},
        timeout=30,
    )
    path = OUT_DIR / f"{safe_name(name)}.png"
    path.write_bytes(base64.b64decode(result["data"]))
    print(path)


def fill_input(cdp: CDP, placeholder: str, value: str):
    expr = f"""
(() => {{
  const input = document.querySelector('input[placeholder={json.dumps(placeholder)}]');
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, {json.dumps(value)});
  input.dispatchEvent(new Event('input', {{ bubbles: true }}));
  return true;
}})()
"""
    result = cdp.call("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    return result.get("result", {}).get("value")


def set_auth_and_goto(cdp: CDP, path: str, extra_ls: dict | None = None):
    cdp.call("Page.enable")
    cdp.call("Runtime.enable")
    cdp.call("Page.navigate", {"url": CLIENT_URL + "/"})
    time.sleep(1.2)
    access = json.dumps(TOKENS["access"])
    refresh = json.dumps(TOKENS["refresh"])
    ls_lines = [
        f"localStorage.setItem('access_token', {access});",
        f"localStorage.setItem('refresh_token', {refresh});",
        "localStorage.setItem('i18nextLng', 'fr');",
        "localStorage.setItem('belivay_client_tour_completed', 'true');",
    ]
    for key, value in (extra_ls or {}).items():
        ls_lines.append(f"localStorage.setItem({json.dumps(key)}, {json.dumps(value)});")
    cdp.call("Runtime.evaluate", {"expression": "".join(ls_lines)})
    cdp.call("Page.navigate", {"url": CLIENT_URL + path})
    wait_for_render(cdp)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    chrome_user_dir = Path("/tmp/belivay-capture-chrome-ui")
    chrome_user_dir.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(
        [
            CHROME_BIN,
            "--headless=new",
            f"--remote-debugging-port={DEBUG_PORT}",
            f"--user-data-dir={chrome_user_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-gpu",
            "--no-sandbox",
            "--window-size=1440,1000",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        wait_for_json(f"http://localhost:{DEBUG_PORT}/json/version")
        time.sleep(1.0)
        ws = open_target(CLIENT_URL + "/")
        cdp = CDP(ws)
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})

        # 1) Catalogue - liste produits rapide (fix N+1 sur /api/catalog/products/)
        set_auth_and_goto(cdp, "/catalog")
        time.sleep(1.5)
        screenshot(cdp, "01-catalogue-liste-produits-rapide")

        # 2) Fiche produit - contenu principal (endpoint detail, ex-500)
        set_auth_and_goto(cdp, "/product/smoke-iphone")
        time.sleep(2)
        screenshot(cdp, "02-fiche-produit-details-et-offres")

        # 3) Fiche produit - produits similaires / recommandations (endpoint liste, ex-500)
        # Ces deux carrousels dependent d'un second appel async independant du chargement
        # principal ; on laisse le temps aux deux requetes listMasters() de resoudre.
        time.sleep(5)
        found = scroll_to_text(cdp, "Produits similaires")
        if not found:
            scroll_to_text(cdp, "aimeriez aussi")
        screenshot_here(cdp, "03-fiche-produit-produits-similaires")

        # 4) Checkout - precision d'adresse IA pour une adresse informelle
        # Page.navigate() fait un rechargement complet qui remonte AuthContext a
        # zero ; le panier semble alors vide le temps que l'auth se reconfirme,
        # ce qui declenche la redirection "panier vide" de la page checkout. On
        # passe donc par /cart (navigation dure, le temps de tout hydrater) puis
        # on clique sur "Commander" pour une navigation interne React Router qui
        # conserve l'etat deja resolu, exactement comme un vrai utilisateur.
        set_auth_and_goto(
            cdp,
            "/cart",
            extra_ls={
                "belivay_checkout_draft": json.dumps({
                    "firstName": "Client", "lastName": "Test",
                    "phone": "+237650000000", "paymentPhone": "+237650000000",
                    "city": "Yaoundé",
                }),
            },
        )
        time.sleep(2.5)
        cart_text = cdp.call("Runtime.evaluate", {"expression": "document.body.innerText.slice(0,600)", "returnByValue": True})
        print("CART PAGE TEXT:", repr(cart_text.get("result", {}).get("value")))
        click_result = cdp.call("Runtime.evaluate", {
            "expression": (
                "(() => { const link = document.querySelector('a[href^=\"/checkout\"]'); "
                "if (!link) return 'NOT FOUND'; link.scrollIntoView({block:'center'}); "
                "link.click(); return 'clicked: ' + link.getAttribute('href'); })()"
            ),
            "returnByValue": True,
        })
        print("Direct checkout link click:", click_result.get("result", {}).get("value"))
        time.sleep(1.5)
        path_now = cdp.call("Runtime.evaluate", {"expression": "window.location.pathname", "returnByValue": True})
        print("pathname after Commander click:", path_now.get("result", {}).get("value"))
        click_text(cdp, "Coordonnées")
        time.sleep(1)
        fill_input(cdp, "Votre adresse de livraison", "Odza Petit Doubi")
        time.sleep(0.5)
        screenshot_here(cdp, "04-checkout-adresse-saisie-odza")
        click_text(cdp, "Continuer")
        time.sleep(16)  # analyse IA reelle (OpenRouter), peut prendre plusieurs secondes
        # Une analyse reussie avance directement a l'etape Paiement (deja pre-remplie) ;
        # le score de precision est visible en permanence sur l'etape Verification.
        click_text(cdp, "Continuer")
        time.sleep(1)
        scroll_to_text(cdp, "Précision")
        screenshot_here(cdp, "05-checkout-precision-adresse-odza")

        # 6) Carte de suivi - commande Odza (position desormais distincte)
        set_auth_and_goto(cdp, "/orders/21")
        time.sleep(2)
        scroll_to_text(cdp, "Suivi de commande")
        screenshot_here(cdp, "06-carte-suivi-commande-odza")

        # 7) Carte de suivi - commande Jouvence (position desormais distincte)
        set_auth_and_goto(cdp, "/orders/11")
        time.sleep(2)
        scroll_to_text(cdp, "Suivi de commande")
        screenshot_here(cdp, "07-carte-suivi-commande-jouvence")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
