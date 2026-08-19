#!/usr/bin/env python3
"""Capture d'ecran de la nouvelle confirmation de reception par QR/code (18-08-2026)."""
import json
import os
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("BELIVAY_CLIENT_URL", "http://localhost:5174")
os.environ.setdefault("BELIVAY_COURIER_URL", "http://localhost:5177")
os.environ.setdefault("BELIVAY_CHROME_DEBUG_PORT", "9411")
os.environ.setdefault(
    "BELIVAY_CAPTURE_DIR",
    str(ROOT / "assets/captures-par-date/18-08-2026/qr-receipt-confirmation-20260818"),
)

import base64  # noqa: E402

from capture_workflow_views import (  # noqa: E402
    CDP,
    click_text,
    open_target,
    safe_name,
    screenshot,
    wait_for_json,
    wait_for_render,
)


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
    """Comme screenshot() mais sans reset du scroll en haut de page."""
    result = cdp.call(
        "Page.captureScreenshot",
        {"format": "png", "captureBeyondViewport": False, "fromSurface": True},
        timeout=30,
    )
    path = OUT_DIR / f"{safe_name(name)}.png"
    path.write_bytes(base64.b64decode(result["data"]))
    print(path)

CLIENT_URL = os.environ["BELIVAY_CLIENT_URL"]
COURIER_URL = os.environ["BELIVAY_COURIER_URL"]
DEBUG_PORT = int(os.environ["BELIVAY_CHROME_DEBUG_PORT"])
OUT_DIR = Path(os.environ["BELIVAY_CAPTURE_DIR"])
CHROME_BIN = os.environ.get("CHROME_BIN", "/usr/bin/google-chrome")
ORDER_ID = os.environ.get("BELIVAY_CAPTURE_ORDER_ID", "10")

with open("/tmp/qr_tokens.json") as fh:
    TOKENS = json.load(fh)


def set_auth_and_goto(cdp: CDP, base_front: str, tokens: dict, path: str):
    cdp.call("Page.enable")
    cdp.call("Runtime.enable")
    cdp.call("Page.navigate", {"url": base_front + "/"})
    time.sleep(1.2)
    access = json.dumps(tokens["access"])
    refresh = json.dumps(tokens["refresh"])
    cdp.call(
        "Runtime.evaluate",
        {
            "expression": (
                f"localStorage.setItem('access_token', {access});"
                f"localStorage.setItem('refresh_token', {refresh});"
                "localStorage.setItem('i18nextLng', 'fr');"
                "localStorage.setItem('belivay_client_tour_completed', 'true');"
            )
        },
    )
    cdp.call("Page.navigate", {"url": base_front + path})
    wait_for_render(cdp)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    chrome_user_dir = Path("/tmp/belivay-capture-chrome-qr")
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
            # Fausse camera pour que getUserMedia reussisse en headless
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        wait_for_json(f"http://localhost:{DEBUG_PORT}/json/version")

        # ── Livreur : voir le code de confirmation a presenter au client ──
        ws = open_target(COURIER_URL + "/")
        cdp = CDP(ws)
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
        set_auth_and_goto(cdp, COURIER_URL, TOKENS["courier"], "/courier")
        time.sleep(2)
        debug = cdp.call("Runtime.evaluate", {"expression": "document.body.innerText.slice(0,600)", "returnByValue": True})
        print("COURIER PAGE AFTER NAV:", repr(debug.get("result", {}).get("value")))
        click_text(cdp, "Scanner QR")
        time.sleep(1.5)
        screenshot(cdp, "01-livreur-code-confirmation-reception")

        # ── Client : bouton + panneau de confirmation ──
        ws2 = open_target(CLIENT_URL + "/")
        cdp2 = CDP(ws2)
        cdp2.call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
        set_auth_and_goto(cdp2, CLIENT_URL, TOKENS["client"], f"/orders/{ORDER_ID}")
        time.sleep(1.5)
        full_text = cdp2.call("Runtime.evaluate", {"expression": "document.body.innerText", "returnByValue": True})
        has_confirm = "confirmer" in (full_text.get("result", {}).get("value") or "").lower()
        scroll_height = cdp2.call("Runtime.evaluate", {"expression": "document.body.scrollHeight", "returnByValue": True})
        print("CLIENT PAGE has 'confirmer':", has_confirm, "| scrollHeight:", scroll_height.get("result", {}).get("value"))
        found = scroll_to_text(cdp2, "Confirmer la réception")
        print("scroll_to_text found target:", found)
        scroll_y = cdp2.call("Runtime.evaluate", {"expression": "window.scrollY", "returnByValue": True})
        print("scrollY after scroll_to_text:", scroll_y.get("result", {}).get("value"))
        screenshot_here(cdp2, "02-client-commande-bouton-confirmer-reception")

        click_text(cdp2, "Confirmer la réception")
        time.sleep(0.8)
        scroll_to_text(cdp2, "Scanner le QR")
        screenshot_here(cdp2, "03-client-panneau-scan-ou-code")

        click_text(cdp2, "Scanner le QR")
        time.sleep(1.2)
        screenshot_here(cdp2, "04-client-scanner-camera-ouvert")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
