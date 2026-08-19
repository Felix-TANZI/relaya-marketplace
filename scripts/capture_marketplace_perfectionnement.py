#!/usr/bin/env python3
import json
import os
import base64
import subprocess
import time
import urllib.request
from pathlib import Path

os.environ.setdefault("BELIVAY_FRONT_URL", "http://localhost:5174")
os.environ.setdefault("BELIVAY_API_URL", "http://localhost:8000")
os.environ.setdefault("BELIVAY_CHROME_DEBUG_PORT", "9396")
os.environ.setdefault(
    "BELIVAY_CAPTURE_DIR",
    "assets/captures-par-date/13-08-2026/perfectionnement-marketplace-client",
)

from capture_workflow_views import (  # noqa: E402
    BASE_FRONT,
    CDP,
    CHROME_BIN,
    DEBUG_PORT,
    OUT_DIR,
    click_text,
    login,
    open_target,
    screenshot,
    set_auth_and_goto,
    wait_for_json,
    wait_for_render,
)


def evaluate(cdp: CDP, expression: str, pause: float = 0.7):
    result = cdp.call(
        "Runtime.evaluate",
        {"expression": expression, "awaitPromise": True, "returnByValue": True},
    )
    time.sleep(pause)
    return result.get("result", {}).get("value")


def goto(cdp: CDP, path: str, pause: float = 2.2):
    cdp.call("Page.navigate", {"url": BASE_FRONT + path})
    wait_for_render(cdp)
    time.sleep(pause)


def set_viewport(cdp: CDP, width: int, height: int, mobile: bool = False):
    cdp.call(
        "Emulation.setDeviceMetricsOverride",
        {
            "width": width,
            "height": height,
            "deviceScaleFactor": 1,
            "mobile": mobile,
        },
    )
    time.sleep(0.5)


def wait_for_text(cdp: CDP, text: str, timeout: float = 15):
    end = time.time() + timeout
    while time.time() < end:
        found = evaluate(
            cdp,
            f"document.body && document.body.innerText.includes({json.dumps(text)})",
            0.2,
        )
        if found:
            return
    diagnostics = evaluate(
        cdp,
        "({url: location.href, body: document.body?.innerText || '', errors: window.__belivayCaptureErrors || []})",
        0,
    )
    raise RuntimeError(f"Texte introuvable après {timeout}s: {text}; diagnostics={diagnostics}")


def screenshot_current(cdp: CDP, name: str):
    time.sleep(0.5)
    result = cdp.call(
        "Page.captureScreenshot",
        {"format": "png", "captureBeyondViewport": False, "fromSurface": True},
        timeout=30,
    )
    path = OUT_DIR / f"{name}.png"
    path.write_bytes(base64.b64decode(result["data"]))
    print(path)


def set_guest_state(cdp: CDP):
    evaluate(
        cdp,
        """
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.setItem('belivay_client_tour_completed', 'true');
        localStorage.setItem('belivay_favorite_product_ids', JSON.stringify([13, 15]));
        localStorage.setItem('belivay_guest_cart_items', JSON.stringify([
          {id:13,name:'Téléphone Workflow Flash',price:12000,quantity:1,image:'/belivay-logo-mark.png',isDemo:true,color:'Noir',storage:'128 Go'},
          {id:15,name:'Smoke iPhone offer 1',price:150000,quantity:1,image:'/belivay-logo-symbol.png',isDemo:false}
        ]));
        localStorage.setItem('belivay_checkout_selected_cart_ids', JSON.stringify([13,15]));
        localStorage.setItem('belivay_checkout_draft', JSON.stringify({
          firstName:'Client',lastName:'Test',phone:'+237658100004',paymentPhone:'+237658100004',
          address:'Mvan, près du carrefour',city:'Yaoundé',pickupCenterId:'yaounde-mokolo',
          deliverySpeed:'standard',promoCode:''
        }));
        """,
    )


def reset_server_cart(tokens: dict):
    payload = {
        "items": [
            {"id": 13, "name": "Téléphone Workflow Flash", "price": 12000, "quantity": 1, "image": "/belivay-logo-mark.png", "isDemo": True, "color": "Noir", "storage": "128 Go"},
            {"id": 15, "name": "Smoke iPhone offer 1", "price": 150000, "quantity": 1, "image": "/belivay-logo-symbol.png", "isDemo": False},
        ]
    }
    request = urllib.request.Request(
        os.environ["BELIVAY_API_URL"] + "/api/auth/cart/",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {tokens['access']}"},
        method="PUT",
    )
    with urllib.request.urlopen(request, timeout=15):
        pass


def capture_checkout_stages(cdp: CDP, prefix: str):
    opened = evaluate(
        cdp,
        """
        (() => {
          const links = [...document.querySelectorAll('a[href^="/checkout"]')];
          const target = links.find((link) => {
            const rect = link.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          if (!target) return false;
          target.click();
          return true;
        })()
        """,
        0.2,
    )
    if not opened:
        raise RuntimeError("Le bouton ouvrant /checkout est introuvable")
    time.sleep(2.5)
    wait_for_text(cdp, "Réception")
    screenshot(cdp, f"{prefix}-checkout-01-reception")
    click_text(cdp, "Coordonnées")
    screenshot(cdp, f"{prefix}-checkout-02-coordonnees")
    click_text(cdp, "Paiement")
    screenshot(cdp, f"{prefix}-checkout-03-paiement-campay")
    click_text(cdp, "Vérification")
    screenshot(cdp, f"{prefix}-checkout-04-verification")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    workflow_tokens = login("workflow_client", "Client2026")
    dispute_tokens = login("client_test", "Client2026")
    reset_server_cart(workflow_tokens)

    chrome_dir = Path(f"/tmp/belivay-perfectionnement-captures-{DEBUG_PORT}")
    chrome_dir.mkdir(parents=True, exist_ok=True)
    process = subprocess.Popen(
        [
            CHROME_BIN,
            "--headless=new",
            f"--remote-debugging-port={DEBUG_PORT}",
            f"--user-data-dir={chrome_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--hide-scrollbars",
            "--window-size=1440,1000",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        wait_for_json(f"http://localhost:{DEBUG_PORT}/json/version")
        cdp = CDP(open_target(BASE_FRONT + "/"))
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")
        cdp.call(
            "Page.addScriptToEvaluateOnNewDocument",
            {
                "source": """
                window.__belivayCaptureErrors = [];
                window.addEventListener('error', (event) => window.__belivayCaptureErrors.push(String(event.message || event.error)));
                window.addEventListener('unhandledrejection', (event) => window.__belivayCaptureErrors.push(String(event.reason)));
                const originalError = console.error;
                console.error = (...args) => { window.__belivayCaptureErrors.push(args.map(String).join(' ')); originalError(...args); };
                """
            },
        )
        set_viewport(cdp, 1440, 1000)

        goto(cdp, "/")
        set_guest_state(cdp)
        goto(cdp, "/")
        screenshot(cdp, "01-accueil-desktop")
        goto(cdp, "/catalog")
        screenshot(cdp, "02-catalogue-desktop")
        goto(cdp, "/categories")
        screenshot(cdp, "03-categories-desktop")
        goto(cdp, "/search?q=montre")
        screenshot(cdp, "04-recherche-desktop")
        goto(cdp, "/promotions")
        screenshot(cdp, "05-promotions-desktop")
        goto(cdp, "/wishlist")
        screenshot(cdp, "06-favoris-invite-desktop")
        goto(cdp, "/product/smoke-iphone")
        screenshot(cdp, "07-fiche-produit-desktop")
        goto(cdp, "/cart")
        screenshot(cdp, "08-panier-desktop")

        evaluate(cdp, "localStorage.removeItem('belivay_guest_cart_items'); localStorage.removeItem('belivay_checkout_selected_cart_ids');")
        reset_server_cart(workflow_tokens)
        set_auth_and_goto(cdp, workflow_tokens, "/")
        time.sleep(4)
        goto(cdp, "/cart", 2.5)
        wait_for_text(cdp, "Téléphone Workflow Flash")
        evaluate(
            cdp,
            """
            localStorage.setItem('belivay_checkout_draft', JSON.stringify({
              firstName:'Client',lastName:'Workflow',phone:'+237658100004',paymentPhone:'+237658100004',
              address:'Mvan, près du carrefour',city:'Yaoundé',pickupCenterId:'yaounde-mokolo',
              deliverySpeed:'standard',promoCode:''
            }));
            """,
        )
        capture_checkout_stages(cdp, "09")
        set_auth_and_goto(cdp, workflow_tokens, "/orders")
        screenshot(cdp, "13-commandes-desktop")
        set_auth_and_goto(cdp, workflow_tokens, "/orders/13")
        screenshot(cdp, "14-suivi-commande-openstreetmap-desktop")

        set_auth_and_goto(cdp, dispute_tokens, "/orders/9")
        wait_for_text(cdp, "Chat de litige pour cette commande")
        evaluate(
            cdp,
            """
            const heading = [...document.querySelectorAll('h2,h3')].find((node) => /chat de litige/i.test(node.textContent || ''));
            if (heading) { heading.scrollIntoView({block:'start'}); window.scrollBy(0,-90); }
            """,
        )
        screenshot_current(cdp, "15b-litige-ouvert-par-article-desktop")

        set_viewport(cdp, 390, 844, True)
        goto(cdp, "/")
        set_guest_state(cdp)
        goto(cdp, "/catalog")
        screenshot(cdp, "16-catalogue-mobile")
        goto(cdp, "/product/smoke-iphone")
        screenshot(cdp, "17-fiche-produit-mobile-barre-achat")
        goto(cdp, "/cart")
        screenshot(cdp, "18-panier-mobile-total-collant")
        evaluate(cdp, "localStorage.removeItem('belivay_guest_cart_items'); localStorage.removeItem('belivay_checkout_selected_cart_ids');")
        reset_server_cart(workflow_tokens)
        set_auth_and_goto(cdp, workflow_tokens, "/")
        time.sleep(4)
        goto(cdp, "/cart", 2.5)
        wait_for_text(cdp, "Téléphone Workflow Flash")
        evaluate(cdp, "localStorage.setItem('belivay_checkout_draft', JSON.stringify({firstName:'Client',lastName:'Workflow',phone:'+237658100004',paymentPhone:'+237658100004',address:'Mvan, près du carrefour',city:'Yaoundé',pickupCenterId:'yaounde-mokolo',deliverySpeed:'standard',promoCode:''}));")
        capture_checkout_stages(cdp, "19-mobile")
        set_auth_and_goto(cdp, workflow_tokens, "/orders/13")
        screenshot(cdp, "23-suivi-commande-mobile")

        errors = evaluate(cdp, "window.__belivayCaptureErrors || []", 0)
        (OUT_DIR / "console-errors.json").write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"captures={len(list(OUT_DIR.glob('*.png')))} errors={len(errors or [])}")
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    main()
