#!/usr/bin/env python3
import json
import os
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("BELIVAY_FRONT_URL", "http://localhost:5174")
os.environ.setdefault("BELIVAY_CHROME_DEBUG_PORT", "9401")
os.environ.setdefault(
    "BELIVAY_CAPTURE_DIR",
    str(ROOT / "assets/captures-par-date/17-08-2026/location-assistant-checkout"),
)

from capture_workflow_views import (  # noqa: E402
    BASE_FRONT,
    CDP,
    CHROME_BIN,
    DEBUG_PORT,
    OUT_DIR,
    click_text,
    open_target,
    screenshot,
    wait_for_json,
    wait_for_render,
)


GOOD_PRECISION = {
    "normalizedAddress": "Jouvence, Royaume des témoins, Yaoundé",
    "city": "Yaoundé",
    "district": "Jouvence",
    "landmarks": ["Royaume des témoins"],
    "driverHint": "Yaoundé - Jouvence, Royaume des témoins",
    "precisionScore": 80,
    "precisionLabel": "bon",
    "needsMoreDetail": False,
    "followUpQuestion": "Confirmez que ce repère est bien celui que le livreur doit viser.",
    "warnings": [],
    "semanticMatches": [
        {
            "label": "Royaume des témoins",
            "reason": "Repère connu à Jouvence, zone fréquemment utilisée pour les livraisons.",
        }
    ],
    "source": "openrouter",
    "providerReady": True,
    "model": "openrouter/free",
}

LOW_PRECISION = {
    "normalizedAddress": "Yaoundé",
    "city": "Yaoundé",
    "district": "",
    "landmarks": [],
    "driverHint": "Yaoundé - zone non précisée",
    "precisionScore": 28,
    "precisionLabel": "faible",
    "needsMoreDetail": True,
    "followUpQuestion": "Quel repère ou carrefour le livreur doit-il viser ?",
    "warnings": ["Adresse trop vague pour guider le livreur."],
    "semanticMatches": [],
    "source": "openrouter",
    "providerReady": True,
    "model": "openrouter/free",
}

MVAN_PRECISION = {
    "normalizedAddress": "Mvan, près du carrefour Total, Yaoundé",
    "city": "Yaoundé",
    "district": "Mvan",
    "landmarks": ["Carrefour Total"],
    "driverHint": "Yaoundé - Mvan, carrefour Total",
    "precisionScore": 72,
    "precisionLabel": "moyen",
    "needsMoreDetail": False,
    "followUpQuestion": "",
    "warnings": [],
    "semanticMatches": [],
    "source": "openrouter",
    "providerReady": True,
    "model": "openrouter/free",
}


def evaluate(cdp: CDP, expression: str, pause: float = 0.7):
    result = cdp.call(
        "Runtime.evaluate",
        {"expression": expression, "awaitPromise": True, "returnByValue": True},
    )
    time.sleep(pause)
    return result.get("result", {}).get("value")


def goto(cdp: CDP, path: str, pause: float = 2.0):
    cdp.call("Page.navigate", {"url": BASE_FRONT + path})
    wait_for_render(cdp)
    time.sleep(pause)


def wait_for_text(cdp: CDP, text: str, timeout: float = 20):
    end = time.time() + timeout
    while time.time() < end:
        found = evaluate(
            cdp,
            f"document.body && document.body.innerText.includes({json.dumps(text)})",
            0.2,
        )
        if found:
            return
    raise RuntimeError(f"Texte introuvable après {timeout}s: {text}")


def install_capture_mocks(cdp: CDP):
    user = {
        "id": 15,
        "username": "workflow_client",
        "email": "workflow_client@belivay.test",
        "first_name": "Client",
        "last_name": "Workflow",
        "date_joined": "2026-01-01T00:00:00Z",
        "phone": "+237658100004",
        "loyalty_points": 120,
        "loyalty_tier": "bronze",
    }
    cart = {
        "items": [
            {
                "id": 13,
                "name": "Téléphone Workflow Flash",
                "price": 12000,
                "quantity": 1,
                "image": "/belivay-logo-mark.png",
                "isDemo": True,
                "color": "Noir",
                "storage": "128 Go",
            }
        ]
    }
    cdp.call(
        "Page.addScriptToEvaluateOnNewDocument",
        {
            "source": f"""
            window.__belivayCaptureUser = {json.dumps(user, ensure_ascii=False)};
            window.__belivayCaptureCart = {json.dumps(cart, ensure_ascii=False)};
            window.__belivayLocationMock = {{
              good: {json.dumps(GOOD_PRECISION, ensure_ascii=False)},
              low: {json.dumps(LOW_PRECISION, ensure_ascii=False)},
              mvan: {json.dumps(MVAN_PRECISION, ensure_ascii=False)},
            }};
            const originalFetch = window.fetch.bind(window);
            window.fetch = async (...args) => {{
              const url = String(args[0] || '');
              if (url.includes('/api/auth/me/')) {{
                return new Response(JSON.stringify(window.__belivayCaptureUser), {{
                  status: 200,
                  headers: {{ 'Content-Type': 'application/json' }},
                }});
              }}
              if (url.includes('/api/auth/cart/')) {{
                return new Response(JSON.stringify(window.__belivayCaptureCart), {{
                  status: 200,
                  headers: {{ 'Content-Type': 'application/json' }},
                }});
              }}
              if (url.includes('/categories') || url.includes('/notifications') || url.includes('/brands')) {{
                return new Response('[]', {{
                  status: 200,
                  headers: {{ 'Content-Type': 'application/json' }},
                }});
              }}
              if (url.includes('/products') || url.includes('/catalog')) {{
                return new Response('{{"results":[]}}', {{
                  status: 200,
                  headers: {{ 'Content-Type': 'application/json' }},
                }});
              }}
              if (url.includes('/api/ai/location-assistant/')) {{
                let body = {{}};
                try {{
                  body = JSON.parse(args[1]?.body || '{{}}');
                }} catch (_) {{}}
                const address = String(body.address || '').toLowerCase();
                let payload = window.__belivayLocationMock.good;
                if (address === 'yaoundé' || address === 'yaounde') payload = window.__belivayLocationMock.low;
                if (address.includes('mvan')) payload = window.__belivayLocationMock.mvan;
                await new Promise((resolve) => setTimeout(resolve, 900));
                return new Response(JSON.stringify(payload), {{
                  status: 200,
                  headers: {{ 'Content-Type': 'application/json' }},
                }});
              }}
              if (url.includes('/api/')) {{
                return new Response('{{}}', {{
                  status: 200,
                  headers: {{ 'Content-Type': 'application/json' }},
                }});
              }}
              return originalFetch(...args);
            }};
            """
        },
    )


def bootstrap_client_session(cdp: CDP, address: str, city: str = "Yaoundé"):
    goto(cdp, "/", 2.0)
    evaluate(
        cdp,
        f"""
        localStorage.setItem('access_token', 'capture-access-token');
        localStorage.setItem('refresh_token', 'capture-refresh-token');
        localStorage.setItem('i18nextLng', 'fr');
        localStorage.setItem('belivay_client_tour_completed', 'true');
        localStorage.setItem('belivay_checkout_selected_cart_ids', JSON.stringify([13]));
        localStorage.setItem('belivay_checkout_draft', JSON.stringify({{
          firstName:'Client', lastName:'Workflow', phone:'+237658100004', paymentPhone:'+237658100004',
          address:{json.dumps(address)}, city:{json.dumps(city)}, pickupCenterId:'yaounde-mokolo',
          deliverySpeed:'standard', promoCode:''
        }}));
        """,
    )
    goto(cdp, "/", 3.0)


def fill_address(cdp: CDP, address: str):
    evaluate(
        cdp,
        f"""
        (() => {{
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          const input = [...document.querySelectorAll('input[type="text"]')].find((el) => {{
            const ph = (el.getAttribute('placeholder') || '').toLowerCase();
            return ph.includes('quartier') || ph.includes('repère') || ph.includes('adresse') || ph.includes('livraison');
          }});
          if (!input || !setter) return false;
          input.focus();
          setter.call(input, {json.dumps(address)});
          input.dispatchEvent(new Event('input', {{ bubbles: true }}));
          input.dispatchEvent(new Event('change', {{ bubbles: true }}));
          return true;
        }})()
        """,
    )


def open_checkout(cdp: CDP):
    goto(cdp, "/checkout", 3.0)
    wait_for_text(cdp, "Réception", timeout=25)


def trigger_address_analysis(cdp: CDP):
    click_text(cdp, "Continuer")
    try:
        wait_for_text(cdp, "Analyse de la zone en cours", timeout=3)
        screenshot(cdp, "03-checkout-analyse-en-cours")
    except RuntimeError:
        pass
    time.sleep(1.5)
    click_text(cdp, "Coordonnées")
    wait_for_render(cdp, timeout=8)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    chrome_dir = Path(f"/tmp/belivay-location-assistant-{DEBUG_PORT}")
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
            "--window-size=1440,1100",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        wait_for_json(f"http://localhost:{DEBUG_PORT}/json/version")
        cdp = CDP(open_target("about:blank"))
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")
        install_capture_mocks(cdp)
        cdp.call(
            "Emulation.setDeviceMetricsOverride",
            {"width": 1440, "height": 1100, "deviceScaleFactor": 1, "mobile": False},
        )

        bootstrap_client_session(cdp, "Jouvence, Royaume des témoins")
        open_checkout(cdp)
        click_text(cdp, "Coordonnées")
        screenshot(cdp, "01-checkout-coordonnees-adresse-saisie")
        fill_address(cdp, "Jouvence, Royaume des témoins")
        screenshot(cdp, "02-checkout-coordonnees-repere-jouvence")

        trigger_address_analysis(cdp)
        wait_for_text(cdp, "Précision adresse", timeout=25)
        screenshot(cdp, "04-checkout-analyse-precision-bonne")

        click_text(cdp, "Paiement")
        time.sleep(1.0)
        click_text(cdp, "Vérification")
        wait_for_text(cdp, "Vérifiez avant de payer")
        screenshot(cdp, "05-checkout-verification-precision")

        bootstrap_client_session(cdp, "Yaoundé")
        open_checkout(cdp)
        click_text(cdp, "Coordonnées")
        fill_address(cdp, "Yaoundé")
        screenshot(cdp, "06-checkout-adresse-vague")
        click_text(cdp, "Continuer")
        wait_for_text(cdp, "Précision adresse", timeout=25)
        screenshot(cdp, "07-checkout-precision-insuffisante")

        cdp.call(
            "Emulation.setDeviceMetricsOverride",
            {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True},
        )
        bootstrap_client_session(cdp, "Mvan, près du carrefour Total")
        open_checkout(cdp)
        click_text(cdp, "Coordonnées")
        fill_address(cdp, "Mvan, près du carrefour Total")
        trigger_address_analysis(cdp)
        wait_for_text(cdp, "Précision adresse", timeout=25)
        screenshot(cdp, "08-mobile-checkout-precision-adresse")

        print(f"captures={len(list(OUT_DIR.glob('*.png')))} dir={OUT_DIR}")
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    main()
