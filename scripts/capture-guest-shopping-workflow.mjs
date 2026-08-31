import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs/cahier_modifs_depuis_samedi/screenshots");
const CHROME = process.env.CHROME_BIN || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.CDP_PORT || 9344);
const CLIENT_ORIGIN = process.env.BELIVAY_CLIENT_ORIGIN || "http://localhost:5174";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForCdp() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools Protocol did not start in time.");
}

async function newTarget() {
  let response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`);
  if (!response.ok) throw new Error(`Cannot create Chrome target: ${response.status}`);
  return response.json();
}

class SimpleWebSocket extends EventEmitter {
  constructor(wsUrl) {
    super();
    const url = new URL(wsUrl);
    this.buffer = Buffer.alloc(0);
    this.handshakeDone = false;
    this.socket = net.createConnection(Number(url.port || 80), url.hostname, () => {
      const key = crypto.randomBytes(16).toString("base64");
      this.socket.write([
        `GET ${url.pathname}${url.search} HTTP/1.1`,
        `Host: ${url.host}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "",
        "",
      ].join("\r\n"));
    });
    this.socket.on("data", (chunk) => this.handleData(chunk));
    this.socket.on("error", (error) => this.emit("error", error));
    this.socket.on("close", () => this.emit("close"));
  }

  addEventListener(event, handler, options = {}) {
    if (options.once) this.once(event, handler);
    else this.on(event, handler);
  }

  handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (!this.handshakeDone) {
      const marker = this.buffer.indexOf("\r\n\r\n");
      if (marker === -1) return;
      const header = this.buffer.subarray(0, marker).toString("utf8");
      if (!header.includes("101")) {
        this.emit("error", new Error(`WebSocket handshake failed: ${header}`));
        return;
      }
      this.handshakeDone = true;
      this.buffer = this.buffer.subarray(marker + 4);
      this.emit("open");
    }
    this.readFrames();
  }

  readFrames() {
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 0x0f;
      const masked = Boolean(second & 0x80);
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < offset + 2) return;
        length = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) return;
        length = Number(this.buffer.readBigUInt64BE(offset));
        offset += 8;
      }
      let mask;
      if (masked) {
        if (this.buffer.length < offset + 4) return;
        mask = this.buffer.subarray(offset, offset + 4);
        offset += 4;
      }
      if (this.buffer.length < offset + length) return;
      let payload = this.buffer.subarray(offset, offset + length);
      if (mask) payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
      this.buffer = this.buffer.subarray(offset + length);
      if (opcode === 1) this.emit("message", { data: payload.toString("utf8") });
      else if (opcode === 8) this.close();
    }
  }

  send(data) {
    const payload = Buffer.from(data);
    const mask = crypto.randomBytes(4);
    let header;
    if (payload.length < 126) {
      header = Buffer.from([0x81, 0x80 | payload.length]);
    } else if (payload.length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(payload.length), 2);
    }
    const maskedPayload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
    this.socket.write(Buffer.concat([header, mask, maskedPayload]));
  }

  close() {
    this.socket.end();
  }
}

class CdpPage {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.ws = new SimpleWebSocket(wsUrl);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (!data.id || !this.pending.has(data.id)) return;
      const { resolve, reject } = this.pending.get(data.id);
      this.pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
    });
    await this.send("Page.enable");
    await this.send("Runtime.enable");
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  async navigate(url, waitMs = 4500) {
    await this.send("Page.navigate", { url });
    await sleep(waitMs);
  }

  async reload(waitMs = 4500) {
    await this.send("Page.reload", { ignoreCache: true });
    await sleep(waitMs);
  }

  async evaluate(expression, waitMs = 800) {
    await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    await sleep(waitMs);
  }

  async screenshot(file) {
    await sleep(1200);
    const result = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    await writeFile(path.join(OUT_DIR, file), Buffer.from(result.data, "base64"));
    console.log(`captured ${file}`);
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const chrome = spawn(CHROME, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-web-security",
    "--allow-running-insecure-content",
    `--remote-debugging-port=${CDP_PORT}`,
    "--user-data-dir=/tmp/belivay-guest-shopping-captures",
    "--window-size=1440,980",
    "about:blank",
  ], { stdio: "ignore" });

  try {
    await waitForCdp();
    const target = await newTarget();
    const page = new CdpPage(target.webSocketDebuggerUrl);
    await page.open();
    await page.setViewport(1440, 980);

    await page.navigate(`${CLIENT_ORIGIN}/catalog`, 6500);
    await page.evaluate(`
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.setItem("belivay_guest_cart_items", JSON.stringify([{
        id: 72,
        name: "Montre Classique Homme Cuir",
        price: 28000,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
        isDemo: true
      }]));
      localStorage.setItem("belivay_favorite_product_ids", JSON.stringify([72]));
      localStorage.setItem("belivay_client_tour_completed", "true");
      window.dispatchEvent(new Event("belivay-favorites-updated"));
      window.dispatchEvent(new Event("storage"));
    `, 900);
    await page.reload(6500);
    await page.evaluate(`window.scrollTo({ top: 0, left: 0, behavior: "instant" });`, 1600);
    await page.screenshot("guest-01-catalog-favori-panier.png");

    await page.navigate(`${CLIENT_ORIGIN}/wishlist`, 5000);
    await page.screenshot("guest-02-favoris-publics.png");

    await page.navigate(`${CLIENT_ORIGIN}/cart`, 5000);
    await page.screenshot("guest-03-panier-public.png");

    await page.navigate(`${CLIENT_ORIGIN}/checkout`, 5000);
    await page.screenshot("guest-04-checkout-redirection-login.png");

    page.close();
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
