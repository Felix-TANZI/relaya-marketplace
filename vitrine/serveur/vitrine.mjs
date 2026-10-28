// Serveur de la vitrine BelivaY sur belivay.com (derrière le nginx de relaya, qui termine le HTTPS).
//
// Une seule source de règles : site/vercel.json, celle du site déjà en ligne sur Vercel. Ce serveur en applique les
// redirections, les réécritures (une application monopage par espace) et les en-têtes (sécurité, noindex de /admin/,
// cache) : belivay.com et Vercel ne peuvent pas diverger.
//
// Deux modes (variable MODE), deux services du docker-compose, la même image :
//   MODE=fichiers  les six espaces construits (site/dist) ; aucun secret, aucune base ;
//   MODE=comptes   les comptes réels sous /api/ (site/serveur/routeur.js, base Neon par DATABASE_URL) ; aucun fichier ;
//   MODE=tout      les deux (essais locaux et CI : node serveur/verifier.mjs).
// Variables : PORT (8080), DIST (../site/dist), REGLES (../site/vercel.json), BASE=memoire (essais : Postgres en
// mémoire, PGlite, dépendance de développement de site/), PROXY_DE_CONFIANCE=1 (en-têtes X-Forwarded-* lus : le nginx
// de relaya les pose ; à 0 si le serveur est exposé directement).
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODE = process.env.MODE ?? 'tout'
if (!['fichiers', 'comptes', 'tout'].includes(MODE)) throw new Error(`MODE=${MODE} : attendu fichiers, comptes ou tout`)
const FICHIERS = MODE !== 'comptes'
const COMPTES = MODE !== 'fichiers'
const PORT = Number(process.env.PORT || 8080)
const ICI = fileURLToPath(new URL('.', import.meta.url))
const DIST = normalize(process.env.DIST ?? join(ICI, '../site/dist')) + sep
const REGLES = process.env.REGLES ?? join(ICI, '../site/vercel.json')
const PROXY = process.env.PROXY_DE_CONFIANCE !== '0'
const CORPS_MAX = 1024 * 1024 // les comptes n'acceptent que du JSON court (photo de profil : 150 Ko au plus)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.map': 'application/json; charset=utf-8',
}

// ── Règles de vercel.json ───────────────────────────────────────────────────────────────────────────────────────────
/** Motif Vercel → expression régulière. Seules les formes employées par vercel.json sont admises (« (.*) », « :nom »,
 *  « :nom* ») : une forme inconnue arrête le démarrage plutôt que d'être mal comprise. @param {string} source */
export function motif(source) {
  let re = ''
  for (let i = 0; i < source.length; ) {
    if (source.startsWith('(.*)', i)) {
      re += '(.*)'
      i += 4
      continue
    }
    const p = /^:([A-Za-z_]\w*)(\*)?/.exec(source.slice(i))
    if (p) {
      re += p[2] ? '(.*)' : '([^/]+)'
      i += p[0].length
      continue
    }
    const c = source[i]
    if ('()[]{}?+*|^$\\'.includes(c)) throw new Error(`vercel.json : motif non pris en charge « ${source} »`)
    re += c === '.' ? '\\.' : c
    i++
  }
  return new RegExp('^' + re + '$')
}

/** @param {string} fichier */
export function lireRegles(fichier) {
  const v = JSON.parse(readFileSync(fichier, 'utf-8'))
  const fixe = (/** @type {string} */ d) => {
    if (/[:$(]/.test(d)) throw new Error(`vercel.json : destination à paramètre non prise en charge « ${d} »`)
    return d
  }
  return {
    redirections: (v.redirects ?? []).map((/** @type {any} */ r) => ({ re: motif(r.source), vers: fixe(r.destination), statut: r.permanent ? 308 : 307 })),
    // Les réécritures vers /api/ sont celles des comptes : ici, /api/ va directement au routeur (MODE comptes).
    reecritures: (v.rewrites ?? []).filter((/** @type {any} */ r) => !r.destination.startsWith('/api/')).map((/** @type {any} */ r) => ({ re: motif(r.source), vers: fixe(r.destination) })),
    entetes: (v.headers ?? []).map((/** @type {any} */ h) => ({ re: motif(h.source), liste: h.headers.map((/** @type {any} */ e) => [e.key.toLowerCase(), e.value]) })),
  }
}

const regles = lireRegles(REGLES)

/** En-têtes de vercel.json pour ce chemin (toutes les règles qui le couvrent ; la dernière l'emporte). @param {string} chemin */
function entetesPour(chemin) {
  /** @type {Record<string, string>} */
  const h = {}
  for (const r of regles.entetes) if (r.re.test(chemin)) for (const [k, v] of r.liste) h[k] = v
  return h
}

// ── Fichiers ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Fichier de dist pour ce chemin (index.html d'un dossier), ou null ; jamais hors de dist ni caché. @param {string} chemin */
function fichier(chemin) {
  if (chemin.includes('\0') || chemin.split('/').some((s) => s.startsWith('.') && s !== '.well-known')) return null
  let p = normalize(join(DIST, chemin))
  if (!p.startsWith(DIST)) return null
  try {
    let s = statSync(p)
    if (s.isDirectory()) {
      p = join(p, 'index.html')
      s = statSync(p)
    }
    return s.isFile() ? { p, s } : null
  } catch {
    return null
  }
}

// Fichiers de construction absents : 404 (Vercel renverrait la page d'accueil, qu'un navigateur prendrait pour un script).
const ACTIFS = /^\/(?:(?:vendeur|entreprise|livreur|relais|admin)\/)?assets\//

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res @param {URL} u */
function servirFichier(req, res, u) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' })
    return res.end()
  }
  let chemin
  try {
    chemin = decodeURIComponent(u.pathname)
  } catch {
    res.writeHead(400)
    return res.end()
  }
  const h = entetesPour(chemin)
  for (const r of regles.redirections) {
    if (r.re.test(chemin)) {
      res.writeHead(r.statut, { ...h, location: r.vers + u.search })
      return res.end()
    }
  }
  let f = fichier(chemin)
  if (!f && !ACTIFS.test(chemin)) {
    const r = regles.reecritures.find((x) => x.re.test(chemin))
    if (r) f = fichier(r.vers)
  }
  if (!f) {
    res.writeHead(404, { ...h, 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
    return res.end('404')
  }
  envoyer(req, res, f.p, f.s, h)
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res @param {string} p @param {import('node:fs').Stats} s @param {Record<string, string>} h */
function envoyer(req, res, p, s, h) {
  const type = TYPES[extname(p).toLowerCase()] ?? 'application/octet-stream'
  // Fichiers compressés d'avance à la construction (serveur/compresser.mjs) : br, sinon gzip.
  const accepte = String(req.headers['accept-encoding'] ?? '')
  let codage = ''
  let chemin = p
  let taille = s.size
  for (const [c, ext] of [['br', '.br'], ['gzip', '.gz']]) {
    if (new RegExp(`\\b${c}\\b`).test(accepte) && existsSync(p + ext)) {
      codage = c
      chemin = p + ext
      taille = statSync(chemin).size
      break
    }
  }
  const etag = `W/"${s.size.toString(16)}-${Math.floor(s.mtimeMs).toString(16)}${codage ? '-' + codage : ''}"`
  /** @type {Record<string, string | number>} */
  const entetes = {
    'cache-control': 'public, max-age=0, must-revalidate', // comme Vercel quand aucune règle ne dit autre chose
    ...h,
    'content-type': h['content-type'] ?? type,
    etag,
    'last-modified': s.mtime.toUTCString(),
    vary: 'Accept-Encoding',
    'accept-ranges': codage ? 'none' : 'bytes',
  }
  if (codage) entetes['content-encoding'] = codage
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, entetes)
    return res.end()
  }
  // Une seule plage (lecteurs audio et vidéo de Safari), sur le fichier non compressé.
  const plage = !codage && /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''))
  if (plage && (plage[1] || plage[2])) {
    let debut = plage[1] ? Number(plage[1]) : Math.max(0, taille - Number(plage[2]))
    let fin = plage[1] && plage[2] ? Math.min(Number(plage[2]), taille - 1) : taille - 1
    if (debut > fin || debut >= taille) {
      res.writeHead(416, { ...entetes, 'content-range': `bytes */${taille}` })
      return res.end()
    }
    res.writeHead(206, { ...entetes, 'content-range': `bytes ${debut}-${fin}/${taille}`, 'content-length': fin - debut + 1 })
    if (req.method === 'HEAD') return res.end()
    return createReadStream(chemin, { start: debut, end: fin }).pipe(res)
  }
  res.writeHead(200, { ...entetes, 'content-length': taille })
  if (req.method === 'HEAD') return res.end()
  createReadStream(chemin).on('error', () => res.destroy()).pipe(res)
}

// ── Comptes réels ───────────────────────────────────────────────────────────────────────────────────────────────────
/** @type {null | ((r: Request) => Promise<Response>)} */
let traiter = null
if (COMPTES) {
  const { adresseBase, baseNeon } = await import('../site/serveur/base.js')
  const { envoyeurDeLEnvironnement } = await import('../site/serveur/envoyeur.js')
  const { creerRouteur } = await import('../site/serveur/routeur.js')
  const memoire = process.env.BASE === 'memoire'
  traiter = creerRouteur({
    base: async () => {
      if (memoire) return (await import('../site/serveur/base-memoire.js')).baseMemoire()
      const url = adresseBase()
      return url ? baseNeon(url) : null
    },
    envoyeur: envoyeurDeLEnvironnement(),
  })
}

class TropGros extends Error {}

/** @param {import('node:http').IncomingMessage} req */
async function versRequest(req) {
  const morceaux = []
  let total = 0
  for await (const m of req) {
    total += m.length
    if (total > CORPS_MAX) throw new TropGros()
    morceaux.push(m)
  }
  const corps = Buffer.concat(morceaux)
  const h = new Headers()
  for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) h.set(k, Array.isArray(v) ? v.join(', ') : v)
  // Adresse vue par le navigateur (liens des e-mails, cookies « __Host- » en HTTPS) : celle que nginx transmet.
  const proto = (PROXY && String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim()) || 'http'
  const hote = req.headers.host ?? 'localhost'
  // Le contrôle « même origine » du routeur compare Origin à X-Forwarded-Host, sinon à Host : seul Host (posé par
  // nginx) fait foi, un X-Forwarded-Host venu du navigateur est ignoré.
  h.delete('x-forwarded-host')
  if (!PROXY) {
    h.delete('x-forwarded-proto')
    h.delete('x-forwarded-for')
    h.delete('x-real-ip')
  }
  const sansCorps = req.method === 'GET' || req.method === 'HEAD'
  return new Request(`${proto === 'https' ? 'https' : 'http'}://${hote}${req.url}`, { method: req.method, headers: h, body: corps.length && !sansCorps ? corps : undefined })
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
async function servirComptes(req, res) {
  let r
  try {
    r = await /** @type {NonNullable<typeof traiter>} */ (traiter)(await versRequest(req))
  } catch (e) {
    const gros = e instanceof TropGros
    res.writeHead(gros ? 413 : 500, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    return res.end(JSON.stringify({ error: { code: gros ? 'trop_gros' : 'erreur', message: gros ? 'Requête trop volumineuse.' : 'Erreur du serveur.' } }))
  }
  /** @type {Record<string, string | string[]>} */
  const entetes = {}
  r.headers.forEach((v, k) => k !== 'set-cookie' && (entetes[k] = v))
  const cookies = r.headers.getSetCookie()
  if (cookies.length) entetes['set-cookie'] = cookies
  res.writeHead(r.status, entetes)
  res.end(Buffer.from(await r.arrayBuffer()))
}

// ── Serveur ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const serveur = createServer(async (req, res) => {
  try {
    const u = new URL(req.url ?? '/', 'http://vitrine')
    if (u.pathname.startsWith('/api/')) {
      if (COMPTES) return await servirComptes(req, res)
      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      return res.end('{"error":{"code":"introuvable"}}')
    }
    if (FICHIERS) return servirFichier(req, res, u)
    res.writeHead(404)
    res.end()
  } catch (e) {
    console.error('[vitrine] erreur', /** @type {Error} */ (e)?.name)
    if (!res.headersSent) res.writeHead(500)
    res.end()
  }
})
serveur.headersTimeout = 15_000
serveur.requestTimeout = 30_000
serveur.keepAliveTimeout = 65_000

if (FICHIERS && !existsSync(join(DIST, 'index.html'))) throw new Error(`vitrine : ${DIST}index.html absent (construire d'abord : site/outils/construire-tout.sh)`)
serveur.listen(PORT, () => console.log(`[vitrine] MODE=${MODE} sur le port ${PORT}`))

// Arrêt propre (docker stop) : plus de nouvelles connexions, les requêtes en cours finissent.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    serveur.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 10_000).unref()
  })
}
