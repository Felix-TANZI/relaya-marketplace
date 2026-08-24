#!/usr/bin/env python3
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

import capture_workflow_views as workflow
from capture_workflow_views import CDP, open_target, screenshot, wait_for_json, wait_for_render


API_URL = "http://localhost:8000"
DEBUG_PORT = 9239
OUT_DIR = Path("assets/avatar-profile-captures-20260812")
PHOTO = Path("backend/mediafiles/avatars/2026/07/hoom1.jpg").resolve()

PORTALS = (
    {
        "role": "livreur",
        "username": "workflow_courier",
        "password": "Courier2026",
        "base": "http://localhost:5177",
        "path": "/courier?tab=profil",
        "theme": "dark",
        "control": "01-livreur-profil-photo",
        "crop": "02-livreur-recadrage-compression",
    },
    {
        "role": "organisation",
        "username": "workflow_org",
        "password": "Orga2026",
        "base": "http://localhost:5178",
        "path": "/delivery-organization?tab=settings",
        "control": "03-organisation-profil-photo",
        "crop": "04-organisation-recadrage-compression",
    },
    {
        "role": "point-relais",
        "username": "workflow_relay",
        "password": "Relay2026",
        "base": "http://localhost:5179",
        "path": "/relay-point",
        "open_profile": True,
        "control": "05-point-relais-menu-profil",
        "crop": "06-point-relais-recadrage-compression",
    },
)


def login(username: str, password: str) -> dict:
    payload = json.dumps({"username": username, "password": password}).encode()
    for attempt in range(6):
        request = urllib.request.Request(
            f"{API_URL}/api/auth/login/",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as error:
            body = error.read().decode(errors="replace")
            if error.code == 429 and attempt < 5:
                time.sleep(12)
                continue
            raise RuntimeError(f"Connexion impossible pour {username}: {error.code} {body}") from error
    raise RuntimeError(f"Connexion impossible pour {username}")


def evaluate(cdp: CDP, expression: str):
    result = cdp.call("Runtime.evaluate", {"expression": expression, "returnByValue": True})
    return result.get("result", {}).get("value")


def set_auth_and_goto(cdp: CDP, portal: dict, tokens: dict):
    cdp.call("Page.enable")
    cdp.call("Runtime.enable")
    cdp.call("DOM.enable")
    cdp.call("Page.navigate", {"url": portal["base"] + "/"})
    time.sleep(1)
    evaluate(
        cdp,
        "localStorage.setItem('access_token', %s);"
        "localStorage.setItem('refresh_token', %s);"
        "localStorage.setItem('i18nextLng', 'fr');"
        "localStorage.setItem('belivay-theme', %s);"
        % (
            json.dumps(tokens["access"]),
            json.dumps(tokens["refresh"]),
            json.dumps(portal.get("theme", "light")),
        ),
    )
    cdp.call("Page.navigate", {"url": portal["base"] + portal["path"]})
    wait_for_render(cdp)
    time.sleep(1.5)


def open_relay_profile_menu(cdp: CDP):
    clicked = evaluate(
        cdp,
        """
        (() => {
          const button = [...document.querySelectorAll('button')].find((item) =>
            (item.textContent || '').includes('workflow_relay')
          );
          if (!button) return false;
          button.click();
          return true;
        })()
        """,
    )
    if not clicked:
        raise RuntimeError("Le menu profil du point relais est introuvable.")
    time.sleep(0.8)


def attach_photo(cdp: CDP):
    document = cdp.call("DOM.getDocument", {"depth": -1, "pierce": True})
    root_id = document["root"]["nodeId"]
    result = cdp.call("DOM.querySelector", {"nodeId": root_id, "selector": "input[type=file]"})
    node_id = result.get("nodeId")
    if not node_id:
        raise RuntimeError("Le sélecteur de photo est introuvable.")
    cdp.call("DOM.setFileInputFiles", {"nodeId": node_id, "files": [str(PHOTO)]})
    end = time.time() + 10
    while time.time() < end:
        if evaluate(cdp, "document.body.innerText.includes('Rogner et enregistrer')"):
            time.sleep(1)
            return
        time.sleep(0.25)
    raise RuntimeError("Le dialogue de recadrage ne s'est pas ouvert.")


def main():
    if not PHOTO.exists():
        raise FileNotFoundError(PHOTO)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    workflow.OUT_DIR = OUT_DIR
    workflow.DEBUG_PORT = DEBUG_PORT
    tokens = {portal["role"]: login(portal["username"], portal["password"]) for portal in PORTALS}

    chrome_dir = Path("/tmp/belivay-avatar-capture-chrome")
    chrome_dir.mkdir(parents=True, exist_ok=True)
    process = subprocess.Popen(
        [
            "/usr/bin/google-chrome",
            "--headless=new",
            f"--remote-debugging-port={DEBUG_PORT}",
            f"--user-data-dir={chrome_dir}",
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
        for portal in PORTALS:
            cdp = CDP(open_target(portal["base"] + "/"))
            cdp.call(
                "Emulation.setDeviceMetricsOverride",
                {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False},
            )
            set_auth_and_goto(cdp, portal, tokens[portal["role"]])
            if portal.get("open_profile"):
                open_relay_profile_menu(cdp)
            screenshot(cdp, portal["control"])
            attach_photo(cdp)
            screenshot(cdp, portal["crop"])
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    main()
