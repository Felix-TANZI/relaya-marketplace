#!/usr/bin/env python3
import base64
import os
import subprocess
import time
from pathlib import Path

from capture_workflow_views import (
    ACCOUNTS,
    BASE_FRONT,
    CDP,
    CHROME_BIN,
    DEBUG_PORT,
    OUT_DIR,
    click_text,
    login,
    open_target,
    screenshot,
    safe_name,
    set_auth_and_goto,
    wait_for_json,
    wait_for_render,
)


DESKTOP_TABS = [
    ("Tableau de bord", "relay-rect-01-dashboard-desktop"),
    ("Réception colis", "relay-rect-02-reception-desktop"),
    ("Colis en stock", "relay-rect-03-stock-desktop"),
    ("Retrait acheteur", "relay-rect-04-retrait-desktop"),
    ("Trust Score PR", "relay-rect-05-trust-desktop"),
    ("Finances MoMo", "relay-rect-06-finances-desktop"),
    ("Capacité & horaires", "relay-rect-07-capacite-desktop"),
    ("Litiges", "relay-rect-08-litiges-desktop"),
    ("Documents KYC", "relay-rect-09-kyc-desktop"),
    ("Historique", "relay-rect-10-historique-desktop"),
    ("Notifications", "relay-rect-11-notifications-desktop"),
    ("Formation", "relay-rect-12-formation-desktop"),
]

MOBILE_TABS = [
    ("Tableau de bord", "relay-rect-13-dashboard-mobile"),
    ("Réception colis", "relay-rect-14-reception-mobile"),
    ("Colis en stock", "relay-rect-15-stock-mobile"),
    ("Capacité & horaires", "relay-rect-16-capacite-mobile"),
    ("Documents KYC", "relay-rect-17-kyc-mobile"),
    ("Formation", "relay-rect-18-formation-mobile"),
]


def set_viewport(cdp: CDP, width: int, height: int, mobile: bool):
    cdp.call(
        "Emulation.setDeviceMetricsOverride",
        {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": mobile},
    )
    cdp.call(
        "Emulation.setTouchEmulationEnabled",
        {"enabled": mobile, "configuration": "mobile" if mobile else "desktop"},
    )


def capture_tabs(cdp: CDP, tabs: list[tuple[str, str]]):
    for label, filename in tabs:
        click_text(cdp, label)
        wait_for_render(cdp, timeout=8)
        screenshot(cdp, filename)


def full_page_screenshot(cdp: CDP, name: str):
    cdp.call("Runtime.evaluate", {"expression": "window.scrollTo(0, 0)"})
    time.sleep(0.5)
    result = cdp.call(
        "Page.captureScreenshot",
        {"format": "png", "captureBeyondViewport": True, "fromSurface": True},
        timeout=30,
    )
    path = OUT_DIR / f"{safe_name(name)}.png"
    path.write_bytes(base64.b64decode(result["data"]))
    print(path)


def capture_tabs_full(cdp: CDP, tabs: list[tuple[str, str]]):
    for label, filename in tabs:
        click_text(cdp, label)
        wait_for_render(cdp, timeout=8)
        full_page_screenshot(cdp, filename)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    relay_tokens = login(*ACCOUNTS["relay"])

    chrome_user_dir = Path("/tmp/belivay-relay-rectification-chrome")
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
        ws = open_target(BASE_FRONT + "/")
        cdp = CDP(ws)

        set_viewport(cdp, 1440, 1000, False)
        set_auth_and_goto(cdp, relay_tokens, "/relay-point")
        time.sleep(1)
        capture_tabs(cdp, DESKTOP_TABS)

        set_viewport(cdp, 390, 900, True)
        set_auth_and_goto(cdp, relay_tokens, "/relay-point")
        time.sleep(1)
        capture_tabs(cdp, MOBILE_TABS)
        capture_tabs_full(
            cdp,
            [
                ("Tableau de bord", "relay-rect-19-dashboard-mobile-full"),
                ("Colis en stock", "relay-rect-20-stock-mobile-full"),
                ("Capacité & horaires", "relay-rect-21-capacite-mobile-full"),
                ("Documents KYC", "relay-rect-22-kyc-mobile-full"),
                ("Litiges", "relay-rect-23-litiges-mobile-full"),
                ("Formation", "relay-rect-24-formation-mobile-full"),
            ],
        )

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
