#!/usr/bin/env python3
import base64
import hashlib
import json
import os
import socket
import struct
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path


BASE_API = os.environ.get("BELIVAY_API_URL", "http://localhost:8000")
BASE_FRONT = os.environ.get("BELIVAY_FRONT_URL", "http://localhost:5173")
OUT_DIR = Path(os.environ.get("BELIVAY_CAPTURE_DIR", "assets/workflow-captures"))
CHROME_BIN = os.environ.get("CHROME_BIN", "/usr/bin/google-chrome")
DEBUG_PORT = int(os.environ.get("BELIVAY_CHROME_DEBUG_PORT", "9227"))


ACCOUNTS = {
    "client": (
        os.environ.get("BELIVAY_CAPTURE_CLIENT_USER", "workflow_client"),
        os.environ.get("BELIVAY_CAPTURE_CLIENT_PASSWORD", "Client2026"),
    ),
    "organization": (
        os.environ.get("BELIVAY_CAPTURE_ORG_USER", "workflow_org"),
        os.environ.get("BELIVAY_CAPTURE_ORG_PASSWORD", "Orga2026"),
    ),
    "relay": (
        os.environ.get("BELIVAY_CAPTURE_RELAY_USER", "workflow_relay"),
        os.environ.get("BELIVAY_CAPTURE_RELAY_PASSWORD", "Relay2026"),
    ),
    "courier": (
        os.environ.get("BELIVAY_CAPTURE_COURIER_USER", "workflow_courier"),
        os.environ.get("BELIVAY_CAPTURE_COURIER_PASSWORD", "Courier2026"),
    ),
}


class CDP:
    def __init__(self, ws_url: str):
        parsed = urllib.parse.urlparse(ws_url)
        self.host = parsed.hostname or "localhost"
        self.port = parsed.port or 80
        self.path = parsed.path
        if parsed.query:
            self.path += "?" + parsed.query
        self.sock = socket.create_connection((self.host, self.port), timeout=10)
        self._handshake()
        self._next_id = 1

    def _handshake(self):
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f"GET {self.path} HTTP/1.1\r\n"
            f"Host: {self.host}:{self.port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(req.encode())
        data = self.sock.recv(4096)
        if b"101" not in data.split(b"\r\n", 1)[0]:
            raise RuntimeError(f"WebSocket handshake failed: {data[:200]!r}")

    def _send_frame(self, payload: bytes):
        header = bytearray([0x81])
        length = len(payload)
        if length < 126:
            header.append(0x80 | length)
        elif length < 65536:
            header.append(0x80 | 126)
            header.extend(struct.pack("!H", length))
        else:
            header.append(0x80 | 127)
            header.extend(struct.pack("!Q", length))
        mask = os.urandom(4)
        header.extend(mask)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        self.sock.sendall(header + masked)

    def _recv_exact(self, n: int) -> bytes:
        chunks = []
        remaining = n
        while remaining:
            chunk = self.sock.recv(remaining)
            if not chunk:
                raise RuntimeError("WebSocket closed")
            chunks.append(chunk)
            remaining -= len(chunk)
        return b"".join(chunks)

    def _recv_frame(self) -> dict:
        first = self._recv_exact(2)
        opcode = first[0] & 0x0F
        masked = first[1] & 0x80
        length = first[1] & 0x7F
        if length == 126:
            length = struct.unpack("!H", self._recv_exact(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", self._recv_exact(8))[0]
        mask = self._recv_exact(4) if masked else b""
        payload = self._recv_exact(length)
        if masked:
            payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        if opcode == 8:
            raise RuntimeError("WebSocket closed by Chrome")
        if opcode in (9, 10):
            return self._recv_frame()
        return json.loads(payload.decode())

    def call(self, method: str, params: dict | None = None, timeout: float = 20):
        msg_id = self._next_id
        self._next_id += 1
        self._send_frame(json.dumps({"id": msg_id, "method": method, "params": params or {}}).encode())
        end = time.time() + timeout
        while time.time() < end:
            msg = self._recv_frame()
            if msg.get("id") == msg_id:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
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
    endpoints = [
        urllib.request.Request(f"http://localhost:{DEBUG_PORT}/json/new?{encoded}", method="PUT"),
        urllib.request.Request(f"http://localhost:{DEBUG_PORT}/json/new?{encoded}", method="GET"),
    ]
    last = None
    for req in endpoints:
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())["webSocketDebuggerUrl"]
        except Exception as exc:
            last = exc
    raise RuntimeError(f"Unable to create Chrome target: {last}")


def safe_name(name: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in name.lower())


def set_auth_and_goto(cdp: CDP, tokens: dict, path: str):
    cdp.call("Page.enable")
    cdp.call("Runtime.enable")
    cdp.call("Page.navigate", {"url": BASE_FRONT + "/"})
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
    cdp.call("Page.navigate", {"url": BASE_FRONT + path})
    wait_for_render(cdp)


def wait_for_render(cdp: CDP, timeout: float = 12):
    end = time.time() + timeout
    last_len = 0
    while time.time() < end:
        result = cdp.call(
            "Runtime.evaluate",
            {
                "expression": "document.body ? document.body.innerText.length : 0",
                "returnByValue": True,
            },
        )
        last_len = int(result.get("result", {}).get("value") or 0)
        if last_len > 250:
            time.sleep(1.2)
            return
        time.sleep(0.4)
    print(f"warning: page text still short after wait ({last_len} chars)")


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
    cdp.call("Runtime.evaluate", {"expression": expr, "returnByValue": True})
    wait_for_render(cdp, timeout=8)


def screenshot(cdp: CDP, name: str):
    cdp.call("Runtime.evaluate", {"expression": "window.scrollTo(0, 0)"})
    time.sleep(0.5)
    result = cdp.call(
        "Page.captureScreenshot",
        {"format": "png", "captureBeyondViewport": False, "fromSurface": True},
        timeout=30,
    )
    path = OUT_DIR / f"{safe_name(name)}.png"
    path.write_bytes(base64.b64decode(result["data"]))
    print(path)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tokens = {role: login(*creds) for role, creds in ACCOUNTS.items()}
    order_id = os.environ.get("BELIVAY_CAPTURE_ORDER_ID", "11")

    chrome_user_dir = Path("/tmp/belivay-capture-chrome")
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
        cdp.call("Emulation.setDeviceMetricsOverride", {"width": 1440, "height": 1000, "deviceScaleFactor": 1, "mobile": False})

        set_auth_and_goto(cdp, tokens["client"], f"/orders/{order_id}")
        screenshot(cdp, "01-client-detail-commande-litige")

        set_auth_and_goto(cdp, tokens["organization"], "/delivery-organization")
        screenshot(cdp, "02-organisation-tableau-de-bord")
        click_text(cdp, "Missions")
        screenshot(cdp, "03-organisation-missions")
        click_text(cdp, "Litiges")
        screenshot(cdp, "04-organisation-litiges")

        set_auth_and_goto(cdp, tokens["relay"], "/relay-point")
        screenshot(cdp, "05-point-relais-tableau-de-bord")
        click_text(cdp, "Litiges")
        screenshot(cdp, "06-point-relais-litiges")

        set_auth_and_goto(cdp, tokens["courier"], "/courier")
        screenshot(cdp, "07-livreur-tableau-de-bord")
        click_text(cdp, "Litiges")
        screenshot(cdp, "08-livreur-litiges")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
