#!/usr/bin/env python3
import base64
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
    safe_name,
    screenshot,
    set_auth_and_goto,
    wait_for_json,
    wait_for_render,
)


DESKTOP_TABS = [
    ("Tableau de bord", "org-rect-01-dashboard-desktop"),
    ("Contrat & KYC", "org-rect-02-contract-desktop"),
    ("Flotte & livreurs", "org-rect-03-fleet-desktop"),
    ("Missions", "org-rect-04-missions-desktop"),
    ("Colis", "org-rect-05-parcels-desktop"),
    ("Zones & capacité", "org-rect-06-zones-desktop"),
    ("Prix & SLA", "org-rect-07-pricing-desktop"),
    ("Preuves", "org-rect-08-proofs-desktop"),
    ("Litiges", "org-rect-09-disputes-desktop"),
    ("Score qualité", "org-rect-10-performance-desktop"),
    ("Règlements", "org-rect-11-payments-desktop"),
    ("Messages", "org-rect-12-messages-desktop"),
    ("Paramètres", "org-rect-13-settings-desktop"),
]

MOBILE_TABS = [
    ("Tableau de bord", "org-rect-14-dashboard-mobile"),
    ("Contrat & KYC", "org-rect-15-contract-mobile"),
    ("Flotte & livreurs", "org-rect-16-fleet-mobile"),
    ("Missions", "org-rect-17-missions-mobile"),
    ("Zones & capacité", "org-rect-18-zones-mobile"),
    ("Règlements", "org-rect-19-payments-mobile"),
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


def capture_tabs(cdp: CDP, tabs: list[tuple[str, str]], full_page: bool = False):
    for label, filename in tabs:
        click_text(cdp, label)
        wait_for_render(cdp, timeout=8)
        if full_page:
            full_page_screenshot(cdp, filename)
        else:
            screenshot(cdp, filename)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    org_tokens = login(*ACCOUNTS["organization"])

    chrome_user_dir = Path("/tmp/belivay-org-rectification-chrome")
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
        set_auth_and_goto(cdp, org_tokens, "/delivery-organization")
        time.sleep(1)
        capture_tabs(cdp, DESKTOP_TABS)

        set_viewport(cdp, 390, 900, True)
        set_auth_and_goto(cdp, org_tokens, "/delivery-organization")
        time.sleep(1)
        capture_tabs(cdp, MOBILE_TABS)
        capture_tabs(cdp, [(label, f"{filename}-full") for label, filename in MOBILE_TABS], full_page=True)

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
