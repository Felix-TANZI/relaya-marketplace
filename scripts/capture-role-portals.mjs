import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import undici from "../frontend/node_modules/undici/index.js";

const { WebSocket } = undici;

const root = process.cwd();
const outputRoot = process.env.CAPTURE_OUTPUT
  ? path.resolve(root, process.env.CAPTURE_OUTPUT)
  : path.join(root, "assets", "portal-audit-20260812");
const apiUrl = process.env.BELIVAY_API_URL || "http://localhost:8000";
const viewportWidth = Number(process.env.VIEWPORT_WIDTH || 1440);
const viewportHeight = Number(process.env.VIEWPORT_HEIGHT || 1000);
const captureOnly = new Set(
  (process.env.CAPTURE_ONLY || "").split(",").map((item) => item.trim()).filter(Boolean),
);

const portals = [
  {
    key: "relay-point",
    baseUrl: "http://localhost:5179/relay-point",
    username: process.env.RELAY_USERNAME,
    password: process.env.RELAY_PASSWORD,
    tabs: [
      "dashboard", "reception", "stock", "retrait", "historique", "trust",
      "tokens", "niveaux", "finances", "capacite", "litiges", "kyc",
      "aide", "notifications", "formation",
    ],
  },
  {
    key: "delivery-organization",
    baseUrl: "http://localhost:5178/delivery-organization",
    username: process.env.ORG_USERNAME,
    password: process.env.ORG_PASSWORD,
    tabs: [
      "dashboard", "contract", "fleet", "missions", "parcels", "zones",
      "pricing", "proofs", "disputes", "performance", "payments",
      "messages", "settings",
    ],
  },
];

for (const portal of portals) {
  if (!portal.username || !portal.password) {
    throw new Error(`Identifiants manquants pour ${portal.key}.`);
  }
}

async function login(username, password) {
  const response = await fetch(`${apiUrl}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(`Connexion impossible pour ${username}: ${response.status}`);
  const tokens = await response.json();
  if (!tokens.access || !tokens.refresh) throw new Error(`Jetons absents pour ${username}.`);
  return tokens;
}

async function waitForDebugger(port) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const pages = await response.json();
        const page = pages.find((target) => target.type === "page");
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error("Chrome debugging endpoint unavailable.");
}

class CdpClient {
  constructor(url) {
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) {
        this.events.push(message);
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForPage(client) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const result = await client.send("Runtime.evaluate", {
      expression: "document.readyState === 'complete' && document.body.innerText.length > 150",
      returnByValue: true,
    });
    if (result.result.value) break;
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  await new Promise((resolve) => setTimeout(resolve, 1600));
}

await mkdir(outputRoot, { recursive: true });
const debugPort = 9333;
const chrome = spawn("google-chrome", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-extensions",
  "--disable-dev-shm-usage",
  "--hide-scrollbars",
  `--remote-debugging-port=${debugPort}`,
  `--window-size=${viewportWidth},${viewportHeight}`,
  "about:blank",
], { stdio: "ignore" });

let client;
try {
  const debuggerUrl = await waitForDebugger(debugPort);
  client = new CdpClient(debuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: 1,
    mobile: viewportWidth < 768,
  });

  const manifest = [];
  for (const portal of portals) {
    const tokens = await login(portal.username, portal.password);
    const outputDir = path.join(outputRoot, portal.key);
    await mkdir(outputDir, { recursive: true });

    await client.send("Page.navigate", { url: portal.baseUrl });
    await waitForPage(client);
    await client.send("Runtime.evaluate", {
      expression: `localStorage.setItem('access_token', ${JSON.stringify(tokens.access)}); localStorage.setItem('refresh_token', ${JSON.stringify(tokens.refresh)});`,
    });

    for (let index = 0; index < portal.tabs.length; index += 1) {
      const tab = portal.tabs[index];
      if (captureOnly.size && !captureOnly.has(`${portal.key}:${tab}`)) continue;
      const url = `${portal.baseUrl}?tab=${encodeURIComponent(tab)}`;
      client.events = [];
      await client.send("Page.navigate", { url });
      await waitForPage(client);
      const titleResult = await client.send("Runtime.evaluate", {
        expression: "document.querySelector('h1')?.innerText || document.querySelector('h2')?.innerText || document.title",
        returnByValue: true,
      });
      const screenshot = await client.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        fromSurface: true,
      });
      const filename = `${String(index + 1).padStart(2, "0")}-${tab}.png`;
      await writeFile(path.join(outputDir, filename), Buffer.from(screenshot.data, "base64"));
      const errors = client.events
        .filter((event) => event.method === "Runtime.exceptionThrown")
        .map((event) => event.params?.exceptionDetails?.exception?.description || event.params?.exceptionDetails?.text)
        .filter(Boolean);
      manifest.push({ portal: portal.key, tab, title: titleResult.result.value, url, file: `${portal.key}/${filename}`, errors });
    }
  }
  const manifestName = captureOnly.size ? "manifest-debug.json" : "manifest.json";
  await writeFile(path.join(outputRoot, manifestName), JSON.stringify(manifest, null, 2));
  process.stdout.write(`Captured ${manifest.length} portal views in ${outputRoot}\n`);
} finally {
  client?.close();
  chrome.kill("SIGTERM");
}
