#!/usr/bin/env python3
"""Captures des nouvelles fonctionnalites GPS/localisation (25-08-2026) :
- Lien "Devenir Vendeur" (header connecte/deconnecte + footer)
- Checkout client : champ Quartier + bouton GPS
- Espace vendeur : bouton GPS + toggle "Centre principal" dans la modale d'emplacement
- Tableau de bord livreur : lien "Position GPS exacte du client"
"""
import base64
import json
import os
import socket
import struct
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_API = os.environ.get("BELIVAY_API_URL", "http://localhost:8000")
OUT_DIR = Path("/home/jacquy-ngonga4/Bureau/rapport-belivay/assets/captures-par-date/25-08-2026/gps-location-features")
CHROME_BIN = os.environ.get("CHROME_BIN", "/usr/bin/google-chrome")
DEBUG_PORT = int(os.environ.get("BELIVAY_CHROME_DEBUG_PORT", "9410"))

FRONT_CLIENT = "http://localhost:5173"
FRONT_SELLER = "http://localhost:5174"
FRONT_COURIER = "http://localhost:5175"

ACCOUNTS = {
    "client": ("workflow_client", "Client2026"),
    "seller": ("workflow_seller", "Seller2026"),
    "courier": ("workflow_courier", "Courier2026"),
}


class CDP:
    def __init__(self, ws_url: str):
        parsed = urllib.parse.urlparse(ws_url)
        self.host = parsed.hostname or "localhost"
        self.port = parsed.port or 80
        self.path = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        self.sock = socket.create_connection((self.host, self.port), timeout=15)
        self._handshake()
        self._id = 0

    def _handshake(self):
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f"GET {self.path} HTTP/1.1\r\n"
            f"Host: {self.host}:{self.port}\r\n"
            "Upgrade: websocket\r\nConnection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(req.encode())
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self.sock.recv(4096)

    def _send(self, payload: dict):
        data = json.dumps(payload).encode()
        header = bytearray([0x81])
        length = len(data)
        mask = os.urandom(4)
        if length < 126:
            header.append(0x80 | length)
        elif length < 65536:
            header.append(0x80 | 126)
            header += struct.pack(">H", length)
        else:
            header.append(0x80 | 127)
            header += struct.pack(">Q", length)
        header += mask
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        self.sock.sendall(bytes(header) + masked)

    def _recv_frame(self):
        header = self._recvn(2)
        b1, b2 = header[0], header[1]
        length = b2 & 0x7F
        if length == 126:
            length = struct.unpack(">H", self._recvn(2))[0]
        elif length == 127:
            length = struct.unpack(">Q", self._recvn(8))[0]
        payload = self._recvn(length)
        return payload

    def _recvn(self, n):
        buf = b""
        while len(buf) < n:
            chunk = self.sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("socket closed")
            buf += chunk
        return buf

    def call(self, method: str, params: dict | None = None, timeout: float = 20):
        self._id += 1
        msg_id = self._id
        self._send({"id": msg_id, "method": method, "params": params or {}})
        end = time.time() + timeout
        while time.time() < end:
            self.sock.settimeout(max(0.1, end - time.time()))
            try:
                frame = self._recv_frame()
            except socket.timeout:
                break
            msg = json.loads(frame.decode())
            if msg.get("id") == msg_id:
                return msg.get("result", {})
        raise TimeoutError(method)


def login(username: str, password: str) -> dict:
    req = urllib.request.Request(
        f"{BASE_API}/api/auth/login/",
        data=json.dumps({"username": username, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def wait_for_json(url: str, timeout: float = 20):
    end = time.time() + timeout
    last = None
    while time.time() < end:
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                return json.loads(resp.read())
        except Exception as exc:
            last = exc
            time.sleep(0.25)
    raise RuntimeError(f"Timed out waiting for {url}: {last}")


def open_target(url: str) -> str:
    encoded = urllib.parse.quote(url, safe="")
    for method in ("PUT", "GET"):
        try:
            req = urllib.request.Request(f"http://localhost:{DEBUG_PORT}/json/new?{encoded}", method=method)
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())["webSocketDebuggerUrl"]
        except Exception as exc:
            last = exc
    raise RuntimeError(f"Unable to create Chrome target: {last}")


def safe_name(name: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in name.lower())


def wait_for_render(cdp: CDP, timeout: float = 12):
    end = time.time() + timeout
    last_len = 0
    while time.time() < end:
        result = cdp.call(
            "Runtime.evaluate",
            {"expression": "document.body ? document.body.innerText.length : 0", "returnByValue": True},
        )
        last_len = int(result.get("result", {}).get("value") or 0)
        if last_len > 200:
            time.sleep(1.0)
            return
        time.sleep(0.4)
    print(f"warning: page text still short after wait ({last_len} chars)")


def evaluate(cdp: CDP, expression: str, pause: float = 0.3):
    result = cdp.call("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True})
    time.sleep(pause)
    return result.get("result", {}).get("value")


def goto(cdp: CDP, base: str, path: str, pause: float = 2.0):
    cdp.call("Page.navigate", {"url": base + path})
    wait_for_render(cdp)
    time.sleep(pause)


def set_auth(cdp: CDP, base: str, tokens: dict):
    goto(cdp, base, "/", 1.0)
    access = json.dumps(tokens["access"])
    refresh = json.dumps(tokens["refresh"])
    cdp.call(
        "Runtime.evaluate",
        {"expression": (
            f"localStorage.setItem('access_token', {access});"
            f"localStorage.setItem('refresh_token', {refresh});"
            "localStorage.setItem('i18nextLng', 'fr');"
            "localStorage.setItem('belivay_client_tour_completed', 'true');"
        )},
    )


def click_text(cdp: CDP, text: str):
    expr = f"""
(() => {{
  const needle = {json.dumps(text)}.toLowerCase();
  const nodes = [...document.querySelectorAll('button,a,[role="button"]')]
    .filter((el) => {{
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }});
  const exact = nodes.filter((el) => (el.innerText || el.textContent || '').trim().toLowerCase() === needle);
  const loose = nodes.filter((el) => (el.innerText || el.textContent || '').toLowerCase().includes(needle));
  const target = exact[exact.length - 1] || loose[loose.length - 1];
  if (target) {{
    target.scrollIntoView({{block: 'center', inline: 'center'}});
    target.click();
    return true;
  }}
  return false;
}})()
"""
    result = evaluate(cdp, expr, 0.6)
    wait_for_render(cdp, timeout=8)
    return result


def fill_input(cdp: CDP, matcher_js: str, value: str):
    expr = f"""
(() => {{
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  const input = {matcher_js};
  if (!input || !setter) return false;
  input.scrollIntoView({{block:'center'}});
  input.focus();
  setter.call(input, {json.dumps(value)});
  input.dispatchEvent(new Event('input', {{ bubbles: true }}));
  input.dispatchEvent(new Event('change', {{ bubbles: true }}));
  return true;
}})()
"""
    return evaluate(cdp, expr, 0.4)


def screenshot(cdp: CDP, name: str):
    cdp.call("Runtime.evaluate", {"expression": "window.scrollTo(0, 0)"})
    time.sleep(0.4)
    result = cdp.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False, "fromSurface": True}, timeout=30)
    path = OUT_DIR / f"{safe_name(name)}.png"
    path.write_bytes(base64.b64decode(result["data"]))
    print(path)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tokens = {role: login(*creds) for role, creds in ACCOUNTS.items()}

    chrome_dir = Path(f"/tmp/belivay-gps-capture-{DEBUG_PORT}")
    chrome_dir.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(
        [
            CHROME_BIN, "--headless=new", f"--remote-debugging-port={DEBUG_PORT}",
            f"--user-data-dir={chrome_dir}", "--no-first-run", "--no-default-browser-check",
            "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
            "--window-size=1440,1000", "about:blank",
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        wait_for_json(f"http://localhost:{DEBUG_PORT}/json/version")
        cdp = CDP(open_target("about:blank"))
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
        # Autorise la geolocalisation "granted" par defaut + position simulee (Yaounde).
        cdp.call("Browser.grantPermissions", {"permissions": ["geolocation"]})
        cdp.call("Emulation.setGeolocationOverride", {"latitude": 3.868, "longitude": 11.521, "accuracy": 20})

        # ── 1. Header / Footer "Devenir Vendeur" (visiteur non connecte) ──────
        goto(cdp, FRONT_CLIENT, "/", 2.0)
        evaluate(cdp, "localStorage.setItem('belivay_client_tour_completed', 'true')")
        goto(cdp, FRONT_CLIENT, "/", 1.5)
        screenshot(cdp, "01-header-devenir-vendeur-visiteur")

        evaluate(cdp, "window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(0.6)
        cdp.call("Page.captureScreenshot", {"format": "png"})  # warm
        result = cdp.call("Page.captureScreenshot", {"format": "png", "fromSurface": True}, timeout=30)
        (OUT_DIR / "02-footer-devenir-vendeur.png").write_bytes(base64.b64decode(result["data"]))
        print(OUT_DIR / "02-footer-devenir-vendeur.png")

        # ── 2. Menu compte connecte (dropdown) ────────────────────────────────
        set_auth(cdp, FRONT_CLIENT, tokens["client"])
        goto(cdp, FRONT_CLIENT, "/", 2.0)
        evaluate(cdp, "document.getElementById('account')?.click()")
        time.sleep(0.6)
        screenshot(cdp, "03-header-devenir-vendeur-menu-compte")

        # ── 3. Page /become-seller (landing publique deja existante) ─────────
        goto(cdp, FRONT_CLIENT, "/become-seller", 2.0)
        screenshot(cdp, "04-page-devenir-vendeur")

        # ── 4. Checkout : Quartier + bouton GPS ───────────────────────────────
        goto(cdp, FRONT_CLIENT, "/checkout", 2.5)
        screenshot(cdp, "05-checkout-avant-remplissage")
        fill_input(
            cdp,
            "[...document.querySelectorAll('input[type=text]')].find(el => (el.getAttribute('placeholder')||'').toLowerCase().includes('bastos'))",
            "Jouvence",
        )
        screenshot(cdp, "06-checkout-quartier-rempli")
        click_text(cdp, "Utiliser ma position GPS")
        time.sleep(1.2)
        screenshot(cdp, "07-checkout-position-gps-enregistree")

        # ── 5. Espace vendeur : bouton GPS + toggle Centre principal ──────────
        set_auth(cdp, FRONT_SELLER, tokens["seller"])
        goto(cdp, FRONT_SELLER, "/seller/shop", 3.0)
        screenshot(cdp, "08-vendeur-boutique-avant-ajout")
        click_text(cdp, "Ajouter")
        time.sleep(1.0)
        screenshot(cdp, "09-vendeur-modale-emplacement-vide")
        fill_input(
            cdp,
            "[...document.querySelectorAll('input')].find(el => (el.getAttribute('placeholder')||'').includes('Safara Mokolo'))",
            "Boutique Jouvence",
        )
        click_text(cdp, "Utiliser ma position GPS actuelle")
        time.sleep(1.5)
        screenshot(cdp, "10-vendeur-gps-position-trouvee")
        expr_scroll = """
(() => {
  const target = [...document.querySelectorAll('p,button,span')].find(el => (el.textContent||'').includes('Centre principal'));
  if (target) { target.scrollIntoView({block: 'center'}); return true; }
  return false;
})()
"""
        evaluate(cdp, expr_scroll, 0.6)
        screenshot(cdp, "11-vendeur-toggle-centre-principal")

        # ── 6. Tableau de bord livreur : position GPS exacte du client ───────
        set_auth(cdp, FRONT_COURIER, tokens["courier"])
        goto(cdp, FRONT_COURIER, "/", 3.0)
        screenshot(cdp, "12-livreur-tableau-de-bord")
        expr_click_courses_nav = """
(() => {
  const link = [...document.querySelectorAll('button,a')].find(el => (el.textContent||'').trim() === 'Courses');
  if (link) { link.click(); return true; }
  return false;
})()
"""
        evaluate(cdp, expr_click_courses_nav, 1.0)
        expr_click_assigned = """
(() => {
  const btn = [...document.querySelectorAll('button')].find(el => (el.textContent||'').includes('ASSIGNEE'));
  if (btn) { btn.scrollIntoView({block:'center'}); btn.click(); return true; }
  return false;
})()
"""
        evaluate(cdp, expr_click_assigned, 0.8)
        expr_scroll_courier = """
(() => {
  const target = [...document.querySelectorAll('div')].find(el => (el.textContent||'').trim() === 'Details de commande');
  if (target) { target.scrollIntoView({block: 'center'}); return true; }
  return false;
})()
"""
        evaluate(cdp, expr_scroll_courier, 0.6)
        screenshot(cdp, "13-livreur-details-commande-position-gps")

        print(f"captures={len(list(OUT_DIR.glob('*.png')))} dir={OUT_DIR}")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
