#!/usr/bin/env python3
import os
import subprocess
from pathlib import Path

os.environ.setdefault("BELIVAY_FRONT_URL", "http://localhost:5174")
os.environ.setdefault("BELIVAY_API_URL", "http://localhost:8000")
os.environ.setdefault("BELIVAY_CHROME_DEBUG_PORT", "9398")
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
from capture_marketplace_perfectionnement import evaluate, goto, wait_for_text


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tokens = login("workflow_client", "Client2026")
    chrome_dir = Path(f"/tmp/belivay-offline-cache-captures-{DEBUG_PORT}")
    chrome_dir.mkdir(parents=True, exist_ok=True)
    process = subprocess.Popen(
        [CHROME_BIN, "--headless=new", f"--remote-debugging-port={DEBUG_PORT}",
         f"--user-data-dir={chrome_dir}", "--no-first-run", "--no-default-browser-check",
         "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage", "--disable-extensions",
         "--hide-scrollbars", "--window-size=1440,1000", "about:blank"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        wait_for_json(f"http://localhost:{DEBUG_PORT}/json/version")
        cdp = CDP(open_target(BASE_FRONT + "/"))
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")

        evaluate(cdp, "localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); localStorage.setItem('belivay_client_tour_completed','true');")
        goto(cdp, "/", 3)
        wait_for_text(cdp, "Produits populaires")
        click_text(cdp, "Ignorer")
        screenshot(cdp, "25-accueil-invite-sans-mock-ni-mon-compte")

        set_auth_and_goto(cdp, tokens, "/catalog")
        wait_for_text(cdp, "Catalogue")
        set_auth_and_goto(cdp, tokens, "/profile")
        wait_for_text(cdp, "Gestion du cache")
        click_text(cdp, "Gestion du cache")
        wait_for_text(cdp, "Entrées locales")
        screenshot(cdp, "26-profil-gestion-cache")

        cdp.call("Network.enable")
        cdp.call("Network.emulateNetworkConditions", {
            "offline": True, "latency": 0, "downloadThroughput": 0, "uploadThroughput": 0,
        })
        evaluate(
            cdp,
            """
            (() => {
              history.pushState({}, '', '/catalog');
              window.dispatchEvent(new PopStateEvent('popstate'));
            })()
            """,
            2.5,
        )
        wait_for_text(cdp, "Mode hors ligne")
        screenshot(cdp, "27-catalogue-mode-hors-ligne-cache")
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    main()
