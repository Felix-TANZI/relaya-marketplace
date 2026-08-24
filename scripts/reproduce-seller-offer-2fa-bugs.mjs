import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "assets/seller-offer-2fa-reproduction-20260812");
const CHROME = "/usr/bin/google-chrome";
const CDP_PORT = 9364;
const SELLER_ORIGIN = "http://localhost:5176";
const API_ORIGIN = "http://localhost:8000";
const USERNAME = "smoke_vendor";
const PASSWORD = "SmokeVendor2026!";
const PRODUCT_ID = 15;
const AVATAR_ONLY = process.env.BELIVAY_AVATAR_ONLY === "1";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForCdp() {
  for (let i = 0; i < 80; i += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome DevTools Protocol did not start.");
}

async function newTarget() {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" });
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
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        length = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }
      if (this.buffer.length < offset + length) return;
      const payload = this.buffer.subarray(offset, offset + length);
      this.buffer = this.buffer.subarray(offset + length);
      if (opcode === 1) this.emit("message", { data: payload.toString("utf8") });
      if (opcode === 8) this.socket.end();
    }
  }

  send(value) {
    const payload = Buffer.from(value);
    const mask = crypto.randomBytes(4);
    let header;
    if (payload.length < 126) {
      header = Buffer.from([0x81, 0x80 | payload.length]);
    } else {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(payload.length, 2);
    }
    const masked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i += 1) masked[i] = payload[i] ^ mask[i % 4];
    this.socket.write(Buffer.concat([header, mask, masked]));
  }

  close() { this.socket.end(); }
}

class CdpPage {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.ws = new SimpleWebSocket(wsUrl);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (!data.id) {
        this.events.push(data);
        return;
      }
      if (!this.pending.has(data.id)) return;
      const { resolve, reject } = this.pending.get(data.id);
      this.pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
    });
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("Network.enable");
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  }

  async navigate(url, waitMs = 3500) {
    await this.send("Page.navigate", { url });
    await sleep(waitMs);
  }

  async evaluate(expression, waitMs = 500) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    await sleep(waitMs);
    return result.result?.value;
  }

  async screenshot(file) {
    await sleep(600);
    const result = await this.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
    await writeFile(path.join(OUT_DIR, file), Buffer.from(result.data, "base64"));
  }

  close() { this.ws.close(); }
}

async function api(pathname, options = {}, access = "") {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (access) headers.Authorization = `Bearer ${access}`;
  const response = await fetch(`${API_ORIGIN}${pathname}`, { ...options, headers });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let access = process.env.BELIVAY_CAPTURE_ACCESS_TOKEN || "";
  let refresh = process.env.BELIVAY_CAPTURE_REFRESH_TOKEN || "";
  if (!access) {
    const login = await api("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    });
    if (login.status !== 200 || !login.body.access) throw new Error(`Login failed: ${JSON.stringify(login)}`);
    access = login.body.access;
    refresh = login.body.refresh;
  }
  const beforeProduct = await api(`/api/vendors/products/${PRODUCT_ID}/`, {}, access);
  const before2fa = await api("/api/auth/2fa/status/", {}, access);

  const chrome = spawn(CHROME, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--disable-web-security", `--remote-debugging-port=${CDP_PORT}`,
    "--user-data-dir=/tmp/belivay-seller-bug-reproduction", "--window-size=1440,1000", "about:blank",
  ], { stdio: "ignore" });

  let page;
  try {
    await waitForCdp();
    page = new CdpPage((await newTarget()).webSocketDebuggerUrl);
    await page.open();
    await page.setViewport(1440, 1000);
    await page.navigate(`${SELLER_ORIGIN}/login`, 1000);
    await page.evaluate(`
      localStorage.setItem("access_token", ${JSON.stringify(access)});
      localStorage.setItem("refresh_token", ${JSON.stringify(refresh)});
    `);

    if (AVATAR_ONLY) {
      await page.navigate(`${SELLER_ORIGIN}/seller/settings`, 4500);
      await page.evaluate(`(async () => {
        const response = await fetch('/belivay-logo.png');
        const blob = await response.blob();
        const file = new File([blob], 'belivay-avatar-test.png', { type: blob.type || 'image/png' });
        const input = Array.from(document.querySelectorAll('input[type="file"]')).find(el => el.accept === 'image/*');
        if (!input) throw new Error('Avatar input not found');
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()`, 1200);
      await page.screenshot("08-avatar-recadrage.png");
      await page.evaluate(`(() => {
        const sliders = document.querySelectorAll('input[type="range"]');
        if (sliders[0]) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(sliders[0], '1.4');
          sliders[0].dispatchEvent(new Event('input', { bubbles: true }));
        }
        const button = Array.from(document.querySelectorAll('button')).find(el => (el.textContent || '').includes('Rogner et enregistrer'));
        if (button) button.click();
      })()`, 250);
      await page.screenshot("09-avatar-transfert.png");
      await sleep(3500);
      await page.screenshot("10-avatar-enregistree.png");
      return;
    }

    await page.navigate(`${SELLER_ORIGIN}/seller/products/${PRODUCT_ID}/edit`, 5000);
    await page.screenshot("01-offre-avant-modification.png");
    const formBefore = await page.evaluate(`JSON.stringify(Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({name: el.name, placeholder: el.placeholder, type: el.type, value: el.value})))`);

    const fillResult = await page.evaluate(`(() => {
      const controls = Array.from(document.querySelectorAll('input, textarea'));
      const set = (el, value) => {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const byPlaceholder = (needle) => controls.find(el => (el.placeholder || '').toLowerCase().includes(needle));
      const price = byPlaceholder('14 500');
      const compare = byPlaceholder('22 000');
      const description = byPlaceholder('matière');
      const stock = byPlaceholder('ex : 12');
      const threshold = byPlaceholder('ex : 3');
      const note = byPlaceholder('information visible');
      const promoEnd = controls.find(el => el.type === 'date');
      if (price) set(price, '151234');
      if (compare) set(compare, '179999');
      if (description) set(description, 'Description diagnostic suffisamment longue pour autoriser la modification.');
      if (stock) set(stock, '9');
      if (threshold) set(threshold, '4');
      if (note) set(note, 'NOTE DIAGNOSTIC OFFRE MODIFIEE');
      if (promoEnd) set(promoEnd, '2026-08-30');
      return { price: !!price, compare: !!compare, description: !!description, stock: !!stock, threshold: !!threshold, note: !!note, promoEnd: !!promoEnd };
    })()`);
    await page.screenshot("02-offre-formulaire-modifie.png");
    const clickedSave = await page.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('button')).find(el => (el.textContent || '').trim() === 'Enregistrer');
      if (button) button.click();
      return !!button;
    })()`, 4500);
    await page.screenshot("03-offre-apres-enregistrement.png");
    const afterProduct = await api(`/api/vendors/products/${PRODUCT_ID}/`, {}, access);
    await page.navigate(`${SELLER_ORIGIN}/seller/products/${PRODUCT_ID}/edit`, 4500);
    await page.screenshot("04-offre-rechargee.png");
    const formAfter = await page.evaluate(`JSON.stringify(Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({name: el.name, placeholder: el.placeholder, type: el.type, value: el.value})))`);

    await page.navigate(`${SELLER_ORIGIN}/seller/settings`, 4500);
    await page.evaluate(`(() => {
      const node = Array.from(document.querySelectorAll('div, p')).find(el => (el.textContent || '').trim() === 'Double authentification');
      if (node) node.scrollIntoView({ block: 'center', behavior: 'instant' });
      return !!node;
    })()`);
    await page.screenshot("05-2fa-avant-desactivation.png");
    const disableAttempt = await page.evaluate(`(() => {
      const input = Array.from(document.querySelectorAll('input')).find(el => el.placeholder === 'Votre mot de passe actuel');
      if (!input) return { input: false, button: false };
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(PASSWORD)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const button = Array.from(document.querySelectorAll('button')).find(el => (el.textContent || '').includes('Désactiver la 2FA'));
      if (button) button.click();
      return { input: true, button: !!button };
    })()`, 1800);
    await page.screenshot("06-2fa-message-succes.png");
    await page.navigate(`${SELLER_ORIGIN}/seller/settings`, 3500);
    await page.evaluate(`(() => {
      const node = Array.from(document.querySelectorAll('div, p')).find(el => (el.textContent || '').trim() === 'Double authentification');
      if (node) node.scrollIntoView({ block: 'center', behavior: 'instant' });
      return !!node;
    })()`);
    await page.screenshot("07-2fa-apres-rechargement.png");
    const after2fa = await api("/api/auth/2fa/status/", {}, access);

    const requests = page.events.filter((event) => event.method === "Network.requestWillBeSent")
      .map((event) => ({ method: event.params.request.method, url: event.params.request.url, postData: event.params.request.postData }))
      .filter((request) => request.url.includes("/api/vendors/products/") || request.url.includes("/api/auth/2fa/disable/"));
    await writeFile(path.join(OUT_DIR, "diagnostic.json"), JSON.stringify({
      beforeProduct, afterProduct, before2fa, after2fa,
      formBefore: JSON.parse(formBefore), formAfter: JSON.parse(formAfter),
      fillResult, clickedSave, disableAttempt, requests,
    }, null, 2));
  } finally {
    if (page) page.close();
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
