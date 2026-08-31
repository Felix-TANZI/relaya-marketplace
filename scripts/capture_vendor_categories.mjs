import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import undici from "../frontend/node_modules/undici/index.js";

const { WebSocket } = undici;
const root = process.cwd();
const outputDir = path.join(root, "assets", "vendor-category-capture-20260813");
const debugPort = 9381;
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
}

const categories = [
  {
    id: 1, name: "Électronique", slug: "electronics", parent: null, level: 0,
    icon_name: "Laptop", description: "Téléphones, informatique et accessoires", display_order: 1,
    is_active: true, is_deprecated: false, requires_admin_approval: false,
    children: [
      { id: 11, name: "Téléphones", slug: "electronics-phones", parent: 1, level: 1, icon_name: "Smartphone", description: "Smartphones et téléphones", display_order: 1, is_active: true, is_deprecated: false, requires_admin_approval: false, children: [] },
      { id: 12, name: "Ordinateurs", slug: "electronics-computers", parent: 1, level: 1, icon_name: "Monitor", description: "PC portables et ordinateurs", display_order: 2, is_active: true, is_deprecated: false, requires_admin_approval: false, children: [] },
      { id: 13, name: "Audio & accessoires", slug: "electronics-audio", parent: 1, level: 1, icon_name: "Headphones", description: "Casques, écouteurs et accessoires", display_order: 3, is_active: true, is_deprecated: false, requires_admin_approval: false, children: [] },
    ],
  },
  { id: 2, name: "Mode", slug: "fashion", parent: null, level: 0, icon_name: "Shirt", description: "Vêtements et accessoires", display_order: 2, is_active: true, is_deprecated: false, requires_admin_approval: false, children: [{ id: 21, name: "Mode femme", slug: "fashion-women", parent: 2, level: 1, icon_name: "Shirt", description: "Vêtements femme", display_order: 1, is_active: true, is_deprecated: false, requires_admin_approval: false, children: [] }, { id: 22, name: "Mode homme", slug: "fashion-men", parent: 2, level: 1, icon_name: "Shirt", description: "Vêtements homme", display_order: 2, is_active: true, is_deprecated: false, requires_admin_approval: false, children: [] }] },
  { id: 3, name: "Maison & cuisine", slug: "home", parent: null, level: 0, icon_name: "House", description: "Équipement de la maison", display_order: 3, is_active: true, is_deprecated: false, requires_admin_approval: false, children: [{ id: 31, name: "Électroménager", slug: "home-appliances", parent: 3, level: 1, icon_name: "CookingPot", description: "Appareils pour la maison", display_order: 1, is_active: true, is_deprecated: false, requires_admin_approval: false, children: [] }] },
];

const flat = categories.flatMap((rootCategory) => [rootCategory, ...rootCategory.children]);
const user = { id: 77, username: "vendeur_demo", email: "vendeur@belivay.test", first_name: "Vendeur", last_name: "Démo", date_joined: "2026-08-13T00:00:00Z", is_vendor: true, is_staff: false, is_superuser: false, is_courier: false, is_delivery_organization: false, is_relay_point: false, courier_status: "not_applied" };

const injectedScript = `(() => {
  localStorage.setItem('access_token', 'capture-token');
  localStorage.setItem('refresh_token', 'capture-refresh');
  const tree = ${JSON.stringify(categories)};
  const flat = ${JSON.stringify(flat)};
  const user = ${JSON.stringify(user)};
  const json = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = String(typeof input === 'string' ? input : input.url);
    if (!url.includes('/api/')) return originalFetch(input, init);
    if (url.includes('/api/auth/me/') || url.includes('/api/auth/profile/')) return json(user);
    if (url.includes('/api/catalog/categories/tree/')) return json(tree);
    if (url.includes('/api/catalog/categories/')) return json({ count: flat.length, next: null, previous: null, results: flat });
    if (url.includes('/api/catalog/conditions/')) return json([]);
    if (url.includes('/api/auth/cart/')) return json({ items: [], total_items: 0, total_xaf: 0 });
    if (url.includes('/api/auth/favorites/')) return json([]);
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
  await client.send("Log.enable");
  await client.send("Network.enable");
  await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await client.send("Page.addScriptToEvaluateOnNewDocument", { source: injectedScript });
  await client.send("Page.navigate", { url: "http://127.0.0.1:5186/seller/products/new" });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const mounted = await client.send("Runtime.evaluate", {
      expression: "Boolean(document.querySelector('#root')?.children.length)",
      returnByValue: true,
    });
    if (mounted.result.value) break;
    await sleep(300);
  }
  await sleep(2500);

  const diagnostics = await client.send("Runtime.evaluate", {
    expression: `JSON.stringify({readyState:document.readyState, html:document.documentElement.outerHTML.slice(0,1000), root:document.querySelector('#root')?.innerHTML.slice(0,1000), href:location.href})`,
    returnByValue: true,
  });
  console.log(diagnostics.result.value);
  console.log(JSON.stringify(client.events.filter((event) =>
    event.method === "Runtime.exceptionThrown" ||
    event.method === "Log.entryAdded" ||
    (event.method === "Network.loadingFailed")
  ).slice(-30)));

  await client.send("Runtime.evaluate", {
    expression: `(() => { const input=[...document.querySelectorAll('input')].find(el => el.placeholder?.includes('iPhone 15 Pro')); if (!input) return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'Produit catégorie capture'); input.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`,
    returnByValue: true,
  });
  await sleep(1300);
  await client.send("Runtime.evaluate", {
    expression: `(() => { const button=[...document.querySelectorAll('button')].find(el => el.textContent.includes('Créer un nouveau produit')); if (!button) return false; button.click(); return true; })()`,
    returnByValue: true,
  });
  await sleep(1500);

  const position = await client.send("Runtime.evaluate", {
    expression: `(() => { const target=[...document.querySelectorAll('*')].find(el => el.children.length === 0 && el.textContent.trim() === 'Catégorie & Attributs'); if (!target) return 'not-found'; let parent=target.parentElement; while(parent && !(parent.scrollHeight > parent.clientHeight && getComputedStyle(parent).overflowY !== 'visible')) parent=parent.parentElement; if(parent) parent.scrollTop += target.getBoundingClientRect().top - 180; else window.scrollBy(0,target.getBoundingClientRect().top-180); return JSON.stringify({text:target.textContent, parent:parent?.tagName, scrollTop:parent?.scrollTop}); })()`,
    returnByValue: true,
  });
  await sleep(700);
  const first = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(path.join(outputDir, "01-formulaire-vendeur-categories.png"), Buffer.from(first.data, "base64"));

  await client.send("Runtime.evaluate", {
    expression: `(() => { const elements=[...document.querySelectorAll('button')]; const button=elements.find(el => el.textContent.includes('Électronique')); if (!button) return false; button.click(); return true; })()`,
    returnByValue: true,
  });
  await sleep(900);
  const second = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(path.join(outputDir, "02-sous-categories-electronique.png"), Buffer.from(second.data, "base64"));

  const textResult = await client.send("Runtime.evaluate", { expression: "document.body.innerText", returnByValue: true });
  await writeFile(path.join(outputDir, "page-text.txt"), textResult.result.value);
  console.log(JSON.stringify({ outputDir, position: position.result.value }));
} finally {
  chrome.kill("SIGTERM");
}
