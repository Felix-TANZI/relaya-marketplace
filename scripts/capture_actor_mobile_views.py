#!/usr/bin/env python3
import subprocess
import time
from pathlib import Path

from capture_workflow_views import (
    ACCOUNTS,
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
)


def main():
    tokens = {role: login(*creds) for role, creds in ACCOUNTS.items()}
    chrome_user_dir = Path("/tmp/belivay-mobile-capture-chrome")
    chrome_user_dir.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(
        [
            CHROME_BIN,
            "--headless=new",
            f"--remote-debugging-port={DEBUG_PORT + 1}",
            f"--user-data-dir={chrome_user_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-gpu",
            "--no-sandbox",
            "--window-size=390,844",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        import capture_workflow_views as desktop

        desktop.DEBUG_PORT = DEBUG_PORT + 1
        wait_for_json(f"http://localhost:{DEBUG_PORT + 1}/json/version")
        ws = open_target(BASE_FRONT + "/")
        cdp = CDP(ws)
        cdp.call(
            "Emulation.setDeviceMetricsOverride",
            {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True},
        )
        cdp.call("Emulation.setTouchEmulationEnabled", {"enabled": True})

        set_auth_and_goto(cdp, tokens["organization"], "/delivery-organization")
        screenshot(cdp, "mobile-organisation-tableau-de-bord")
        click_text(cdp, "Litiges")
        screenshot(cdp, "mobile-organisation-litiges")

        set_auth_and_goto(cdp, tokens["relay"], "/relay-point")
        screenshot(cdp, "mobile-point-relais-tableau-de-bord")
        click_text(cdp, "Litiges")
        screenshot(cdp, "mobile-point-relais-litiges")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        time.sleep(0.2)


if __name__ == "__main__":
    main()
