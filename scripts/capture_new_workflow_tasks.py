#!/usr/bin/env python3
import subprocess
import time
from pathlib import Path

import capture_workflow_views as base
from capture_workflow_views import (
    ACCOUNTS,
    BASE_API,
    BASE_FRONT,
    CHROME_BIN,
    DEBUG_PORT,
    CDP,
    click_text,
    login,
    open_target,
    screenshot,
    set_auth_and_goto,
    wait_for_json,
    wait_for_render,
)


def goto_public(cdp: CDP, path: str):
    cdp.call("Page.enable")
    cdp.call("Runtime.enable")
    cdp.call("Page.navigate", {"url": BASE_FRONT + "/"})
    time.sleep(0.8)
    cdp.call(
        "Runtime.evaluate",
        {
            "expression": (
                "localStorage.setItem('i18nextLng', 'fr');"
                "localStorage.setItem('belivay_client_tour_completed', 'true');"
                "localStorage.setItem('belivay_tour_completed', 'true');"
            )
        },
    )
    cdp.call("Page.navigate", {"url": BASE_FRONT + path})
    wait_for_render(cdp)


def goto_absolute(cdp: CDP, url: str):
    cdp.call("Page.enable")
    cdp.call("Runtime.enable")
    cdp.call("Page.navigate", {"url": url})
    wait_for_render(cdp)


def main():
    base.OUT_DIR.mkdir(parents=True, exist_ok=True)
    tokens = {role: login(*creds) for role, creds in ACCOUNTS.items()}
    blocked_order_id = "12"

    chrome_user_dir = Path("/tmp/belivay-new-tasks-capture-chrome")
    chrome_user_dir.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(
        [
            CHROME_BIN,
            "--headless=new",
            f"--remote-debugging-port={DEBUG_PORT + 2}",
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
        base.DEBUG_PORT = DEBUG_PORT + 2
        wait_for_json(f"http://localhost:{DEBUG_PORT + 2}/json/version")
        ws = open_target(BASE_FRONT + "/")
        cdp = CDP(ws)
        cdp.call(
            "Emulation.setDeviceMetricsOverride",
            {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False},
        )

        goto_public(cdp, "/promotions")
        screenshot(cdp, "09-promotion-flash-deals")

        goto_absolute(cdp, f"{BASE_API}/api/catalog/products/13/")
        screenshot(cdp, "10-produit-trust-score-flash")

        set_auth_and_goto(cdp, tokens["client"], f"/orders/{blocked_order_id}")
        screenshot(cdp, "11-client-statut-vehicule-incompatible")

        set_auth_and_goto(cdp, tokens["organization"], "/delivery-organization")
        click_text(cdp, "Missions")
        screenshot(cdp, "12-organisation-missions-capacite-vehicule")

        click_text(cdp, "Zones & capacité")
        screenshot(cdp, "13-organisation-zones-capacite")

        set_auth_and_goto(cdp, tokens["relay"], "/relay-point")
        click_text(cdp, "Colis en stock")
        screenshot(cdp, "14-point-relais-stock-reel")

        click_text(cdp, "Retrait acheteur")
        screenshot(cdp, "15-point-relais-retrait-code")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        time.sleep(0.2)


if __name__ == "__main__":
    main()
