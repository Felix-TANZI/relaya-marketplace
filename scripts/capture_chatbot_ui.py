#!/usr/bin/env python3
import subprocess
import time
from datetime import date
from pathlib import Path

import capture_workflow_views as workflow
from capture_workflow_views import CDP, open_target, screenshot, wait_for_json, wait_for_render


DEBUG_PORT = 9241
CAPTURE_DATE = date.today().strftime("%d-%m-%Y")
OUT_DIR = Path("assets/captures-par-date") / CAPTURE_DATE / f"chatbot-tests-{date.today():%Y%m%d}"


def evaluate(cdp: CDP, expression: str):
    result = cdp.call("Runtime.evaluate", {"expression": expression, "returnByValue": True})
    return result.get("result", {}).get("value")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    workflow.OUT_DIR = OUT_DIR
    workflow.DEBUG_PORT = DEBUG_PORT
    chrome_dir = Path("/tmp/belivay-chatbot-capture")
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
        cdp = CDP(open_target("http://localhost:5174/"))
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
        time.sleep(2)
        wait_for_render(cdp)
        evaluate(cdp, "localStorage.setItem('belivay_client_tour_completed', 'true')")
        cdp.call("Page.reload")
        wait_for_render(cdp)
        time.sleep(2)
        opened = evaluate(cdp, "(() => { const button = document.querySelector('[aria-label=\"Ouvrir l\\'assistant BelivaY\"]'); if (!button) return false; button.click(); return true; })()")
        if not opened:
            raise RuntimeError("Impossible d'ouvrir le chatbot")
        time.sleep(0.5)
        typed = evaluate(
            cdp,
            """
            (() => {
              const textarea = document.querySelector('textarea[placeholder*="Dis-moi"]');
              if (!textarea) return false;
              const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
              setter.call(textarea, "Puis-je payer en espèces à la livraison et comment mon paiement est-il protégé jusqu'à la réception du colis ?");
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              return true;
            })()
            """,
        )
        if not typed:
            raise RuntimeError("Impossible de saisir la question")
        time.sleep(0.5)
        screenshot(cdp, "01-chatbot-saisie-visible")
        submitted = evaluate(
            cdp,
            """
            (() => {
              const textarea = document.querySelector('textarea[placeholder*="Dis-moi"]');
              if (!textarea) return false;
              textarea.closest('form').requestSubmit();
              return true;
            })()
            """,
        )
        if not submitted:
            raise RuntimeError("Impossible d'envoyer la question")
        end = time.time() + 10
        while time.time() < end:
            if evaluate(cdp, "document.body.innerText.includes(\"Le paiement à la livraison n'existe pas\")"):
                break
            time.sleep(0.25)
        else:
            raise RuntimeError("La réponse attendue n'est pas apparue")
        time.sleep(1)
        evaluate(
            cdp,
            "(() => { const items = [...document.querySelectorAll('section article')]; items.at(-1)?.scrollIntoView({block: 'start'}); return items.length; })()",
        )
        time.sleep(0.5)
        screenshot(cdp, "02-chatbot-paiement-livraison-refuse")
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    main()
