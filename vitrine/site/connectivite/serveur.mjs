// Serveur statique du dist commun (outils/construire-tout.sh), avec les redirections et réécritures de vercel.json :
// /vendeur → /vendeur/, un fichier existant tel quel, sinon l'index.html de l'application du chemin. Pour les recettes
// multi-applis (connectivite/*.spec.ts) : les six applications sous une même origine, comme en production.
//   node connectivite/serveur.mjs [port]
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const PORT = Number(process.argv[2] || process.env.PORT_CONNECTIVITE || 4190)
const APPS = ['vendeur', 'entreprise', 'livreur', 'relais', 'admin']
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.geojson': 'application/json',
}
const fichier = (f) => existsSync(f) && statSync(f).isFile()

createServer((req, res) => {
  const [chemin, requete = ''] = (req.url ?? '/').split('?')
  const p = decodeURIComponent(chemin)
  const app = APPS.find((a) => p === '/' + a || p.startsWith('/' + a + '/'))
  if (app && p === '/' + app) return void res.writeHead(307, { Location: `/${app}/` + (requete ? '?' + requete : '') }).end()
  let f = normalize(join(DIST, p))
  if (!f.startsWith(DIST)) return void res.writeHead(400).end()
  if (!fichier(f)) f = extname(p) && !p.endsWith('.html') ? null : join(DIST, app ? app : '', 'index.html')
  if (!f || !fichier(f)) return void res.writeHead(404).end()
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(readFileSync(f))
}).listen(PORT, () => console.log(`dist commun servi sur http://localhost:${PORT}/`))
