import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import undici from "../frontend/node_modules/undici/index.js";

const { WebSocket } = undici;
const root = process.cwd();
const outputDir = path.join(root, "assets", "admin-category-capture-20260813");
const debugPort = 9382;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDebugger() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (response.ok) {
        const pages = await response.json();
        const page = pages.find((target) => target.type === "page");
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(150);
  }
  throw new Error("Chrome debugging endpoint unavailable");
}

class CdpClient {
  constructor(url) {
    this.id = 0;
    this.pending = new Map();
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
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
}

const categories = [
  { id: 1, name: "Électronique", slug: "electronique", parent: null, is_active: true, products_count: 8 },
  { id: 11, name: "Téléphones", slug: "telephones", parent: 1, is_active: true, products_count: 5 },
  { id: 12, name: "Ordinateurs", slug: "ordinateurs", parent: 1, is_active: true, products_count: 3 },
  { id: 13, name: "Audio & accessoires", slug: "audio-accessoires", parent: 1, is_active: true, products_count: 0 },
  { id: 2, name: "Mode", slug: "mode", parent: null, is_active: true, products_count: 4 },
  { id: 21, name: "Mode femme", slug: "mode-femme", parent: 2, is_active: true, products_count: 3 },
  { id: 22, name: "Mode homme", slug: "mode-homme", parent: 2, is_active: true, products_count: 1 },
  { id: 3, name: "Maison & cuisine", slug: "maison-cuisine", parent: null, is_active: true, products_count: 2 },
  { id: 31, name: "Électroménager", slug: "electromenager", parent: 3, is_active: true, products_count: 2 },
];

const user = {
  id: 1,
  username: "admin_belivay",
  email: "admin@belivay.com",
  first_name: "Admin",
  last_name: "BelivaY",
  is_staff: true,
  is_superuser: true,
  is_vendor: false,
  is_courier: false,
  is_delivery_organization: false,
  is_relay_point: false,
};

const injectedScript = `(() => {
  localStorage.setItem('access_token', 'capture-admin-token');
  localStorage.setItem('refresh_token', 'capture-admin-refresh');
  const categories = ${JSON.stringify(categories)};
  const user = ${JSON.stringify(user)};
  const json = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = String(typeof input === 'string' ? input : input.url);
    if (!url.includes('/api/')) return originalFetch(input, init);
    if (url.includes('/api/auth/me/') || url.includes('/api/auth/profile/')) return json(user);
    if (url.includes('/api/catalog/categories/')) return json({ count: categories.length, next: null, previous: null, results: categories });
    if (url.includes('/api/auth/notifications/')) return json([]);
    return json([]);
  };
})();`;

await mkdir(outputDir, { recursive: true });
const chrome = spawn("/usr/bin/google-chrome", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-extensions",
  "--disable-dev-shm-usage", "--hide-scrollbars", `--remote-debugging-port=${debugPort}`,
  "--window-size=1440,1000", "about:blank",
], { stdio: "ignore" });

try {
  const client = new CdpClient(await waitForDebugger());
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await client.send("Page.addScriptToEvaluateOnNewDocument", { source: injectedScript });
  await client.send("Page.navigate", { url: "http://127.0.0.1:5184/admin/catalogue/categories" });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = await client.send("Runtime.evaluate", {
      expression: "document.body.innerText.includes('Catégories & Sous-catégories')",
      returnByValue: true,
    });
    if (ready.result.value) break;
    await sleep(300);
  }
  await sleep(1800);

  const screenshot = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const output = path.join(outputDir, "01-categories-admin.png");
  await writeFile(output, Buffer.from(screenshot.data, "base64"));
  console.log(output);
} finally {
  chrome.kill("SIGTERM");
}
