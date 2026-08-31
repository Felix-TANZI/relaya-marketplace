import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";

const ROOT = process.cwd();
const OUT_DIR = process.env.BELIVAY_CAPTURE_OUT_DIR
  ? path.resolve(ROOT, process.env.BELIVAY_CAPTURE_OUT_DIR)
  : path.join(ROOT, "docs/cahier_modifs_depuis_samedi/screenshots");
const CHROME = process.env.CHROME_BIN || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.CDP_PORT || 9352);
const CLIENT_ORIGIN = process.env.BELIVAY_CLIENT_ORIGIN || "http://localhost:5174";
const ADMIN_ORIGIN = process.env.BELIVAY_ADMIN_ORIGIN || "http://localhost:5175";
const ORG_ORIGIN = process.env.BELIVAY_ORG_ORIGIN || "http://localhost:5178";
const RELAY_ORIGIN = process.env.BELIVAY_RELAY_ORIGIN || "http://localhost:5179";
const ACCESS_TOKEN = process.env.BELIVAY_CAPTURE_ACCESS_TOKEN || "";
const REFRESH_TOKEN = process.env.BELIVAY_CAPTURE_REFRESH_TOKEN || "";
const ORDER_ID = process.env.BELIVAY_CAPTURE_ORDER_ID || "16";
const TRACKING_ONLY = process.env.BELIVAY_TRACKING_ONLY === "1";
const TRACKING_FILE = process.env.BELIVAY_TRACKING_FILE || "tracking-client.png";
const HOME_ONLY = process.env.BELIVAY_HOME_ONLY === "1";
const GENERIC_ONLY = process.env.BELIVAY_GENERIC_ONLY === "1";
const GENERIC_ORIGIN = process.env.BELIVAY_GENERIC_ORIGIN || CLIENT_ORIGIN;
const GENERIC_ROUTE = process.env.BELIVAY_GENERIC_ROUTE || "/";
const GENERIC_FILE = process.env.BELIVAY_GENERIC_FILE || "capture.png";
const GENERIC_EVAL = process.env.BELIVAY_GENERIC_EVAL || "";

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

  async evaluate(expression, waitMs = 800) {
    await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    await sleep(waitMs);
  }

  async screenshot(file) {
    await sleep(900);
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
    "--user-data-dir=/tmp/belivay-google-review-captures",
    "--window-size=1440,980",
    "about:blank",
  ], { stdio: "ignore" });

  try {
    await waitForCdp();
    const target = await newTarget();
    const page = new CdpPage(target.webSocketDebuggerUrl);
    await page.open();
    await page.setViewport(1440, 980);

    if (GENERIC_ONLY) {
      await page.navigate(`${GENERIC_ORIGIN}/`, 1000);
      await page.evaluate(`
        localStorage.setItem("belivay_client_tour_completed", "true");
        localStorage.setItem("access_token", ${JSON.stringify(ACCESS_TOKEN)});
        localStorage.setItem("refresh_token", ${JSON.stringify(REFRESH_TOKEN)});
      `, 300);
      await page.navigate(`${GENERIC_ORIGIN}${GENERIC_ROUTE}`, 6500);
      if (GENERIC_EVAL) await page.evaluate(GENERIC_EVAL, 800);
      await page.screenshot(GENERIC_FILE);
      page.close();
      return;
    }

    if (HOME_ONLY) {
      await page.navigate(`${CLIENT_ORIGIN}/`, 1000);
      await page.evaluate(`localStorage.setItem("belivay_client_tour_completed", "true");`, 300);
      await page.navigate(`${CLIENT_ORIGIN}/`, 5000);
      await page.screenshot(TRACKING_FILE);
      page.close();
      return;
    }

    if (TRACKING_ONLY) {
      await page.navigate(`${CLIENT_ORIGIN}/`, 1000);
      await page.evaluate(`
        localStorage.setItem("belivay_client_tour_completed", "true");
        localStorage.setItem("access_token", ${JSON.stringify(ACCESS_TOKEN)});
        localStorage.setItem("refresh_token", ${JSON.stringify(REFRESH_TOKEN)});
      `, 300);
      await page.navigate(`${CLIENT_ORIGIN}/orders/${ORDER_ID}`, 5500);
      await page.evaluate(`
        const heading = Array.from(document.querySelectorAll("h2"))
          .find((item) => item.textContent && item.textContent.toLowerCase().includes("suivi"));
        if (heading) heading.scrollIntoView({ block: "start", behavior: "instant" });
        window.scrollBy(0, -90);
      `, 700);
      await page.screenshot(TRACKING_FILE);
      page.close();
      return;
    }

    await page.navigate(`${CLIENT_ORIGIN}/`, 2500);
    await page.evaluate(`localStorage.setItem("belivay_client_tour_completed", "true");`, 200);
    await page.navigate(`${CLIENT_ORIGIN}/register`, 6500);
    await page.screenshot("google-01-client-register.png");
    await page.evaluate(`window.scrollTo({ top: 520, behavior: "instant" });`, 500);
    await page.screenshot("google-01b-client-register-google.png");

    await page.evaluate(`
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_user");
      localStorage.setItem("belivay_client_tour_completed", "true");
    `, 200);
    await page.navigate(`${CLIENT_ORIGIN}/login`, 4500);
    await page.screenshot("google-02-client-login-2fa.png");
    await page.screenshot("current-login-client.png");

    await page.navigate(`${ADMIN_ORIGIN}/login`, 6500);
    await page.screenshot("current-login-admin.png");

    await page.navigate(`${ORG_ORIGIN}/login`, 6500);
    await page.screenshot("current-login-organisation.png");

    await page.navigate(`${RELAY_ORIGIN}/login`, 6500);
    await page.screenshot("current-login-point-relais.png");

    await page.navigate(`${CLIENT_ORIGIN}/`, 1000);
    await page.evaluate(`
      localStorage.setItem("belivay_client_tour_completed", "true");
      localStorage.setItem("access_token", ${JSON.stringify(ACCESS_TOKEN)});
      localStorage.setItem("refresh_token", ${JSON.stringify(REFRESH_TOKEN)});
    `, 300);
    await page.navigate(`${CLIENT_ORIGIN}/orders/${ORDER_ID}`, 6500);
    await page.evaluate(`window.scrollTo({ top: 760, behavior: "instant" });`, 500);
    await page.screenshot("reviews-01-order-item-review-form.png");
    await page.evaluate(`
      const inputs = Array.from(document.querySelectorAll("input"));
      const titleInput = inputs.find((input) => input.placeholder && input.placeholder.includes("Titre"));
      const commentInput = inputs.find((input) => input.placeholder && input.placeholder.includes("commentaire"));
      if (titleInput) {
        titleInput.value = "Produit conforme";
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (commentInput) {
        commentInput.value = "Article reçu, bonne qualité et livraison suivie.";
        commentInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      window.scrollTo({ top: 840, behavior: "instant" });
    `, 500);
    await page.screenshot("reviews-02-order-item-review-filled.png");
    await page.evaluate(`
      const button = Array.from(document.querySelectorAll("button"))
        .find((item) => item.textContent && item.textContent.includes("Publier"));
      if (button) button.click();
    `, 1800);
    await page.screenshot("reviews-03-order-item-review-saved.png");
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
