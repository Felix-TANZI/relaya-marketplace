// Serveur local équivalent à Vercel pour les comptes réels : sert dist/ (les six applications, mêmes réécritures que
// vercel.json) et monte la fonction des comptes sous /api/ (serveur/routeur.js).
//   node outils/serveur-local.mjs                 Postgres en mémoire (PGlite) : rien à installer, tout s'efface à l'arrêt
//   DATABASE_URL=… node outils/serveur-local.mjs  la vraie base (Neon) : prudence, ce sont les comptes réels
//   BASE=aucune node outils/serveur-local.mjs     sans base : les applications le disent et gardent la démonstration
// PORT (défaut 4300). Utilisé par les tests Playwright des comptes (pw-comptes.config.ts).
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { adresseBase, baseNeon } from '../serveur/base.js'
import { baseMemoire } from '../serveur/base-memoire.js'
import { envoyeurDeLEnvironnement } from '../serveur/envoyeur.js'
import { creerRouteur } from '../serveur/routeur.js'

const RACINE = fileURLToPath(new URL('../dist/', import.meta.url))
const PORT = Number(process.env.PORT || 4300)
const APPS = ['vendeur', 'entreprise', 'livreur', 'relais', 'admin']
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg' }

const traiter = creerRouteur({
  base: async () => {
    if (process.env.BASE === 'aucune') return null
    const url = adresseBase()
    return url ? baseNeon(url) : baseMemoire()
  },
  envoyeur: envoyeurDeLEnvironnement(),
})

/** @param {import('node:http').IncomingMessage} req */
async function versRequest(req) {
  const morceaux = []
  for await (const m of req) morceaux.push(m)
  const corps = Buffer.concat(morceaux)
  const h = new Headers()
  for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) h.set(k, Array.isArray(v) ? v.join(', ') : v)
  return new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: h, body: corps.length && req.method !== 'GET' && req.method !== 'HEAD' ? corps : undefined })
}

/** @param {string} chemin */
function fichier(chemin) {
  const p = normalize(join(RACINE, decodeURIComponent(chemin)))
  if (!p.startsWith(RACINE)) return null
  return existsSync(p) && statSync(p).isFile() ? p : null
}

createServer(async (req, res) => {
  try {
    const u = new URL(req.url ?? '/', 'http://local')
    if (u.pathname.startsWith('/api/')) {
      const r = await traiter(await versRequest(req))
      const entetes = {}
      r.headers.forEach((v, k) => k !== 'set-cookie' && (entetes[k] = v))
      const cookies = r.headers.getSetCookie()
      if (cookies.length) entetes['set-cookie'] = cookies
      res.writeHead(r.status, entetes)
      res.end(Buffer.from(await r.arrayBuffer()))
      return
    }
    const app = APPS.find((a) => u.pathname === '/' + a || u.pathname.startsWith('/' + a + '/'))
    if (app && u.pathname === '/' + app) {
      res.writeHead(307, { location: '/' + app + '/' })
      res.end()
      return
    }
    const p = fichier(u.pathname) ?? fichier((app ? '/' + app : '') + '/index.html')
    if (!p) {
      res.writeHead(404)
      res.end()
      return
    }
    res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
    createReadStream(p).pipe(res)
  } catch {
    res.writeHead(500)
    res.end()
  }
}).listen(PORT, () => console.log(`BelivaY local (comptes réels) : http://localhost:${PORT}`))
