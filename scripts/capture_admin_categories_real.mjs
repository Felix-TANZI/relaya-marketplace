import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import undici from "../frontend/node_modules/undici/index.js";

const { WebSocket } = undici;
const token = process.env.CAPTURE_ADMIN_ACCESS;
if (!token) throw new Error("CAPTURE_ADMIN_ACCESS is required");

const outputDir = path.join(process.cwd(), "assets", "admin-category-capture-20260813");
const output = path.join(outputDir, "02-categorie-recemment-creee.png");
const debugPort = 9383;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadRealCategories() {
  const categories = [];
  let url = "http://127.0.0.1:8000/api/catalog/categories/?page_size=100";
  while (url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Category API returned ${response.status}`);
    const payload = await response.json();
    if (Array.isArray(payload)) return payload;
    categories.push(...(payload.results ?? []));
    url = payload.next;
  }
  return categories;
}

async function debuggerUrl() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const pages = response.ok ? await response.json() : [];
      const page = pages.find((item) => item.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
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
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
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

await mkdir(outputDir, { recursive: true });
const realCategories = await loadRealCategories();
if (!realCategories.some((category) => category.id === 319)) {
  throw new Error("The recently created category #319 is absent from the real API");
}
const chrome = spawn("/usr/bin/google-chrome", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-extensions",
  "--disable-dev-shm-usage", "--hide-scrollbars", `--remote-debugging-port=${debugPort}`,
  "--window-size=1440,1000", "about:blank",
], { stdio: "ignore" });

try {
  const client = new CdpClient(await debuggerUrl());
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      localStorage.setItem('access_token', ${JSON.stringify(token)});
      localStorage.removeItem('refresh_token');
      const admin = {
        id: 2, username: 'admin1', email: 'admin@belivay.com',
        first_name: 'Admin', last_name: 'BelivaY',
        is_staff: true, is_superuser: true, is_vendor: false,
        is_courier: false, is_delivery_organization: false, is_relay_point: false
      };
      const categories = ${JSON.stringify(await loadRealCategories())};
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = String(typeof input === 'string' ? input : input.url);
        if (url.includes('/api/auth/me/')) {
          return Promise.resolve(new Response(JSON.stringify(admin), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        if (url.includes('/api/catalog/categories/')) {
          return Promise.resolve(new Response(JSON.stringify(categories), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        return originalFetch(input, init);
      };
    })();`,
  });
  await client.send("Page.navigate", { url: "http://127.0.0.1:5184/admin/catalogue/categories" });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const found = await client.send("Runtime.evaluate", {
      expression: "document.body.innerText.includes('Catégorie test admin')",
      returnByValue: true,
    });
    if (found.result.value) break;
    await sleep(300);
  }

  const positioned = await client.send("Runtime.evaluate", {
    expression: `(() => {
      [...document.querySelectorAll('svg.lucide-chevron-down')]
        .map((icon) => icon.closest('button'))
        .filter(Boolean)
        .forEach((button) => button.click());
      const target = [...document.querySelectorAll('span')].find((el) => el.textContent.trim() === 'Catégorie test admin');
      if (!target) return { found: false, text: document.body.innerText.slice(0, 300) };
      target.scrollIntoView({ block: 'center', inline: 'nearest' });
      target.parentElement.style.background = 'rgba(220,38,38,.08)';
      target.parentElement.style.outline = '2px solid rgba(220,38,38,.30)';
      return { found: true, category: target.textContent.trim(), top: target.getBoundingClientRect().top };
    })()`,
    returnByValue: true,
  });
  if (!positioned.result.value?.found) throw new Error(`Category not visible: ${JSON.stringify(positioned.result.value)}`);
  await sleep(700);

  const screenshot = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(output, Buffer.from(screenshot.data, "base64"));
  console.log(output);
} finally {
  chrome.kill("SIGTERM");
}
