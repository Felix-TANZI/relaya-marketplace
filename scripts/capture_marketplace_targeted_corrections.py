#!/usr/bin/env python3
import os
import subprocess
import time
from pathlib import Path

os.environ.setdefault("BELIVAY_FRONT_URL", "http://localhost:5174")
os.environ.setdefault("BELIVAY_API_URL", "http://localhost:8000")
os.environ.setdefault("BELIVAY_CHROME_DEBUG_PORT", "9397")
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
)
from capture_marketplace_perfectionnement import (
    evaluate,
    reset_server_cart,
    screenshot_current,
    wait_for_text,
)


def wait_for_map_tiles(cdp: CDP, timeout: float = 30):
    end = time.time() + timeout
    while time.time() < end:
        status = evaluate(
            cdp,
            """
            (() => {
              const tiles = [...document.querySelectorAll('.leaflet-tile')];
              const loaded = tiles.filter((tile) => tile.complete && tile.naturalWidth > 0);
              return {total: tiles.length, loaded: loaded.length};
            })()
            """,
            0.4,
        )
        if status and status.get("loaded", 0) >= 6 and status["loaded"] == status["total"]:
            time.sleep(1.5)
            return
    raise RuntimeError(f"Les tuiles OpenStreetMap ne sont pas toutes chargées: {status}")


def click_checkout_link(cdp: CDP):
    opened = evaluate(
        cdp,
        """
        (() => {
          const target = [...document.querySelectorAll('a[href^="/checkout"]')]
            .find((link) => {
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
        raise RuntimeError("Lien checkout introuvable")
    wait_for_text(cdp, "Réception")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tokens = login("workflow_client", "Client2026")
    reset_server_cart(tokens)
    chrome_dir = Path(f"/tmp/belivay-targeted-captures-{DEBUG_PORT}")
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

        set_auth_and_goto(cdp, tokens, "/orders/13")
        wait_for_text(cdp, "Suivi de commande")
        wait_for_map_tiles(cdp)
        screenshot(cdp, "14-suivi-commande-openstreetmap-desktop")

        reset_server_cart(tokens)
        set_auth_and_goto(cdp, tokens, "/cart")
        wait_for_text(cdp, "Téléphone Workflow Flash")
        evaluate(
            cdp,
            """
            localStorage.setItem('belivay_checkout_draft', JSON.stringify({
              firstName:'Client', lastName:'Workflow',
              phone:'+237658100004', paymentPhone:'+237658100004',
              address:'Mvan, près du carrefour', city:'Yaoundé',
              pickupCenterId:'yaounde-mokolo', deliverySpeed:'standard', promoCode:''
            }));
            """,
        )
        click_checkout_link(cdp)
        click_text(cdp, "Coordonnées")
        evaluate(cdp, "window.scrollTo(0, 150)")
        screenshot_current(cdp, "09-checkout-02-coordonnees")
        click_text(cdp, "Vérification")
        screenshot(cdp, "09-checkout-04-verification")
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    main()
