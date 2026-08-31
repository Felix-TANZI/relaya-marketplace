import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs/cahier_modifs_depuis_samedi/screenshots");
const API_BASE = process.env.BELIVAY_API_BASE || "http://localhost:8000";
const CHROME = process.env.CHROME_BIN || "/usr/bin/google-chrome";
const CDP_PORT = Number(process.env.CDP_PORT || 9333);

const accounts = {
  admin: { username: "admin1", password: "Admin2026" },
  client: { username: "client_test", password: "Client2026" },
  courier: { username: "livreur_test", password: "Livreur2026" },
  seller: { username: "vendeur_payout_test", password: "Vendeur2026" },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function login({ username, password }) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API_BASE}/api/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) return response.json();
    const text = await response.text();
    if (response.status === 429 && attempt < 3) {
      const match = text.match(/Expected available in (\\d+) seconds/);
      const waitSeconds = match ? Number(match[1]) + 2 : 18;
      await sleep(waitSeconds * 1000);
      continue;
    }
    throw new Error(`Login failed for ${username}: ${response.status} ${text}`);
  }
  throw new Error(`Login failed for ${username}`);
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) return null;
  return response.json();
}

async function waitForCdp() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools Protocol did not start in time.");
}

async function newTarget() {
  let response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) {
    response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`);
  }
  if (!response.ok) {
    throw new Error(`Cannot create Chrome target: ${response.status}`);
  }
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
      if (mask) {
        payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
      }
      this.buffer = this.buffer.subarray(offset + length);
      if (opcode === 1) {
        this.emit("message", { data: payload.toString("utf8") });
      } else if (opcode === 8) {
        this.close();
      }
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
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    });
    await this.send("Page.enable");
    await this.send("Runtime.enable");
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  async navigate(url, waitMs = 4500) {
    await this.send("Page.navigate", { url });
    await sleep(waitMs);
  }

  async reload(waitMs = 3500) {
    await this.send("Page.reload", { ignoreCache: true });
    await sleep(waitMs);
  }

  async evaluate(expression, waitMs = 800) {
    await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    await sleep(waitMs);
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  async setTokens(access, refresh) {
    await this.send("Runtime.evaluate", {
      expression: `
        localStorage.setItem("access_token", ${JSON.stringify(access)});
        localStorage.setItem("refresh_token", ${JSON.stringify(refresh)});
        localStorage.setItem("relaya.lang", "fr");
      `,
      awaitPromise: true,
    });
  }

  async loginInPage(username, password) {
    const result = await this.send("Runtime.evaluate", {
      expression: `
        (async () => {
          let tokens = null;
          for (let attempt = 0; attempt < 4; attempt += 1) {
            const loginResponse = await fetch(${JSON.stringify(`${API_BASE}/api/auth/login/`)}, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: ${JSON.stringify(username)}, password: ${JSON.stringify(password)} })
            });
            const loginText = await loginResponse.text();
            if (loginResponse.ok) {
              tokens = JSON.parse(loginText);
              break;
            }
            if (loginResponse.status === 429 && attempt < 3) {
              const match = loginText.match(/Expected available in (\\d+) seconds/);
              const waitMs = ((match ? Number(match[1]) : 15) + 2) * 1000;
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              continue;
            }
            throw new Error("Login API failed: " + loginResponse.status + " " + loginText);
          }
          if (!tokens.access || !tokens.refresh) {
            throw new Error("Login API did not return tokens.");
          }
          localStorage.setItem("access_token", tokens.access);
          localStorage.setItem("refresh_token", tokens.refresh);
          localStorage.setItem("relaya.lang", "fr");
          localStorage.setItem("belivay_client_tour_completed", "true");
          const meResponse = await fetch(${JSON.stringify(`${API_BASE}/api/auth/me/`)}, {
            headers: { Authorization: "Bearer " + tokens.access }
          });
          const meText = await meResponse.text();
          if (!meResponse.ok) {
            throw new Error("Auth /me failed: " + meResponse.status + " " + meText);
          }
          return { href: window.location.href, user: JSON.parse(meText) };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result?.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Browser login failed");
    }
  }

  async screenshot(file) {
    await sleep(1600);
    const result = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    await writeFile(path.join(OUT_DIR, file), Buffer.from(result.data, "base64"));
  }

  close() {
    this.ws.close();
  }
}

async function captureOne({ origin, route, file, account, width = 1440, height = 980 }) {
  const target = await newTarget();
  const page = new CdpPage(target.webSocketDebuggerUrl);
  await page.open();
  await page.setViewport(width, height);
  if (account) {
    await page.navigate(`${origin}/login`, 2500);
    await page.loginInPage(account.username, account.password);
    await page.reload(2500);
  }
  await page.navigate(`${origin}${route}`, 6500);
  if (file === "real-seller-payout-verification.png") {
    await page.evaluate(`
      [...document.querySelectorAll("*")]
        .reverse()
        .find((element) => element.textContent?.includes("Compte d'encaissement vérifié"))
        ?.scrollIntoView({ block: "center", inline: "nearest" });
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent?.includes("Remplacer"))
        ?.click();
      [...document.querySelectorAll("*")]
        .reverse()
        .find((element) => element.textContent?.includes("Compte d'encaissement vérifié"))
        ?.scrollIntoView({ block: "center", inline: "nearest" });
    `, 1600);
  }
  if (file === "real-client-checkout-payment-no-cod.png") {
    await page.evaluate(`window.scrollTo({ top: 360, left: 0, behavior: "instant" });`, 1200);
  }
  await page.screenshot(file);
  page.close();
  console.log(`captured ${file} from ${origin}${route}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const clientTokens = await login(accounts.client);

  const orders = await fetchJson(`${API_BASE}/api/orders/my-orders/`, clientTokens.access);
  const orderList = Array.isArray(orders) ? orders : Array.isArray(orders?.results) ? orders.results : [];
  const deliveryOrder = orderList.find((order) => order.delivery_mode !== "PICKUP") || orderList[0];

  const chrome = spawn(CHROME, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-web-security",
    "--allow-running-insecure-content",
    `--remote-debugging-port=${CDP_PORT}`,
    "--user-data-dir=/tmp/belivay-real-map-captures",
    "--window-size=1440,980",
    "about:blank",
  ], { stdio: "ignore" });

  try {
    await waitForCdp();
    const captures = [
      {
        id: "admin-organisations",
        origin: "http://localhost:5175",
        route: "/admin/deliveries/organization",
        file: "real-admin-map-organisations.png",
        account: accounts.admin,
      },
      {
        id: "admin-relay-points",
        origin: "http://localhost:5175",
        route: "/admin/deliveries/relay-point",
        file: "real-admin-map-points-relais.png",
        account: accounts.admin,
      },
      {
        id: "admin-zones",
        origin: "http://localhost:5175",
        route: "/admin/deliveries/zones",
        file: "real-admin-map-zones.png",
        account: accounts.admin,
      },
      {
        id: "admin-orders",
        origin: "http://localhost:5175",
        route: "/admin/orders/map",
        file: "real-admin-map-commandes.png",
        account: accounts.admin,
      },
      {
        id: "admin-live",
        origin: "http://localhost:5175",
        route: "/admin/live/map",
        file: "real-admin-map-live.png",
        account: accounts.admin,
      },
      {
        id: "admin-vendors",
        origin: "http://localhost:5175",
        route: "/admin/vendors/overview",
        file: "real-admin-map-vendors.png",
        account: accounts.admin,
      },
      {
        id: "client-tracking",
        origin: "http://localhost:5174",
        route: deliveryOrder?.id ? `/orders/${deliveryOrder.id}` : "/orders",
        file: "real-client-tracking-map.png",
        account: accounts.client,
      },
      {
        id: "client-checkout-payment",
        origin: "http://localhost:5174",
        route: "/checkout",
        file: "real-client-checkout-payment-no-cod.png",
        account: accounts.client,
      },
      {
        id: "seller-payout-verification",
        origin: "http://localhost:5176",
        route: "/seller/settings",
        file: "real-seller-payout-verification.png",
        account: accounts.seller,
        height: 1180,
      },
      {
        id: "courier",
        origin: "http://localhost:5177",
        route: "/courier?tab=map",
        file: "real-courier-map.png",
        account: accounts.courier,
      },
    ];

    const only = (process.env.CAPTURE_ONLY || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    for (const capture of captures.filter((item) => only.length === 0 || only.includes(item.id))) {
      await captureOne(capture);
    }
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
