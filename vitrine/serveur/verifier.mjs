// Vérification de la vitrine servie : pages des six espaces, redirections, réécritures, en-têtes de sécurité, noindex
// de /admin/, cache, compression, comptes réels. Sans adresse, démarre le serveur (MODE=tout, base en mémoire) sur
// site/dist déjà construit ; avec des adresses, vérifie des serveurs déjà lancés (CI : les conteneurs Docker).
//   node serveur/verifier.mjs                                   serveur local, tout vérifié (comptes en mémoire)
//   node serveur/verifier.mjs --fichiers URL [--comptes URL]   serveurs déjà lancés (comptes : base absente attendue)
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const option = (/** @type {string} */ n) => {
  const i = args.indexOf(n)
  return i < 0 ? null : args[i + 1]
}
let fichiers = option('--fichiers')
let comptes = option('--comptes')
/** @type {import('node:child_process').ChildProcess | null} */
let enfant = null
const local = !fichiers

if (local) {
  const port = 18000 + Math.floor(Math.random() * 1000)
  enfant = spawn(process.execPath, [fileURLToPath(new URL('vitrine.mjs', import.meta.url))], {
    env: { ...process.env, MODE: 'tout', BASE: 'memoire', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  await new Promise((ok, ko) => {
    enfant?.stdout?.on('data', (d) => String(d).includes('port') && ok(null))
    enfant?.on('exit', (c) => ko(new Error('serveur arrêté : ' + c)))
  })
  fichiers = comptes = `http://127.0.0.1:${port}`
}

let echecs = 0
let total = 0
/** @param {string} nom @param {boolean} ok @param {string} [detail] */
function verifier(nom, ok, detail = '') {
  total++
  if (!ok) echecs++
  console.log(`${ok ? 'ok ' : 'ÉCHEC'}  ${nom}${ok || !detail ? '' : '  → ' + detail}`)
}
/** @param {string} chemin @param {RequestInit & { base?: string }} [o] */
const get = (chemin, o = {}) => fetch((o.base ?? fichiers) + chemin, { redirect: 'manual', ...o })

// ── Pages des six espaces ──
const ESPACES = ['vendeur', 'entreprise', 'livreur', 'relais', 'admin']
const accueil = await get('/')
const html = await accueil.text()
verifier('/ : page du client (200, HTML)', accueil.status === 200 && /text\/html/.test(accueil.headers.get('content-type') ?? '') && html.includes('src="/assets/'))
for (const a of ESPACES) {
  const r = await get(`/${a}/`)
  const t = await r.text()
  verifier(`/${a}/ : page de l'espace (200, base /${a}/)`, r.status === 200 && t.includes(`src="/${a}/assets/`), `${r.status}`)
  const sans = await get(`/${a}`)
  verifier(`/${a} → /${a}/ (307)`, sans.status === 307 && sans.headers.get('location') === `/${a}/`, `${sans.status} ${sans.headers.get('location')}`)
  const profonde = await get(`/${a}/une/page/profonde?x=1`)
  verifier(`/${a}/une/page/profonde : application de l'espace (réécriture)`, profonde.status === 200 && (await profonde.text()).includes(`src="/${a}/assets/`))
}
const fiche = await get('/produit/exemple-de-fiche')
verifier('/produit/… : application du client (réécriture)', fiche.status === 200 && (await fiche.text()).includes('src="/assets/'))
verifier('/vendeurs-et-plus : pas pris pour /vendeur/', (await (await get('/vendeurs-et-plus')).text()).includes('src="/assets/'))

// ── En-têtes de sécurité (vercel.json) ──
const h = accueil.headers
verifier('Content-Security-Policy', (h.get('content-security-policy') ?? '').includes("frame-ancestors 'none'"))
verifier('X-Frame-Options DENY', h.get('x-frame-options') === 'DENY')
verifier('X-Content-Type-Options nosniff', h.get('x-content-type-options') === 'nosniff')
verifier('Referrer-Policy', h.get('referrer-policy') === 'strict-origin-when-cross-origin')
verifier('Strict-Transport-Security', (h.get('strict-transport-security') ?? '').startsWith('max-age=63072000'))
verifier('Permissions-Policy', (h.get('permissions-policy') ?? '').includes('geolocation=(self)'))
verifier('Cross-Origin-Opener-Policy', h.get('cross-origin-opener-policy') === 'same-origin')
verifier('pages : revalidées à chaque visite', h.get('cache-control') === 'public, max-age=0, must-revalidate', h.get('cache-control') ?? '')
verifier('/ : pas de noindex', !h.get('x-robots-tag'))
for (const c of ['/admin/', '/admin/comptes/1', '/admin']) {
  verifier(`${c} : X-Robots-Tag noindex`, (await get(c)).headers.get('x-robots-tag') === 'noindex, nofollow')
}
verifier('/vendeur/ : en-têtes de sécurité aussi', (await get('/vendeur/')).headers.get('x-frame-options') === 'DENY')

// ── Cache, service workers, manifeste ──
const script = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1] ?? ''
const s = await get(script)
verifier(`${script} : immuable 1 an`, s.status === 200 && s.headers.get('cache-control') === 'public, max-age=31536000, immutable', `${s.status} ${s.headers.get('cache-control')}`)
verifier('script : type JavaScript', /javascript/.test(s.headers.get('content-type') ?? ''))
const vScript = /src="(\/vendeur\/assets\/[^"]+\.js)"/.exec(await (await get('/vendeur/')).text())?.[1] ?? ''
verifier(`${vScript} : immuable 1 an`, (await get(vScript)).headers.get('cache-control') === 'public, max-age=31536000, immutable')
verifier('/assets/absent.js : 404 (pas la page)', (await get('/assets/absent-0000.js')).status === 404)
verifier('/vendeur/assets/absent.js : 404', (await get('/vendeur/assets/absent-0000.js')).status === 404)
const sw = await get('/sw.js')
verifier('/sw.js : no-cache, Service-Worker-Allowed /', sw.status === 200 && sw.headers.get('cache-control') === 'no-cache' && sw.headers.get('service-worker-allowed') === '/')
for (const a of ['vendeur', 'livreur', 'relais']) {
  const r = await get(`/${a}/sw.js`)
  if (r.status === 200) verifier(`/${a}/sw.js : Service-Worker-Allowed /${a}/`, r.headers.get('service-worker-allowed') === `/${a}/` && r.headers.get('cache-control') === 'no-cache')
}
const m = await get('/manifest.webmanifest')
verifier('/manifest.webmanifest : type et cache 1 h', m.headers.get('content-type') === 'application/manifest+json' && m.headers.get('cache-control') === 'public, max-age=3600')
const img = await get('/partage.jpg')
verifier('/partage.jpg : cache 1 jour', img.status === 200 && img.headers.get('cache-control') === 'public, max-age=86400, stale-while-revalidate=604800')
const robots = await (await get('/robots.txt')).text()
verifier('/robots.txt : plan du site sur belivay.com', robots.includes('Sitemap: https://belivay.com/sitemap.xml'))
const plan = await (await get('/sitemap.xml')).text()
verifier('/sitemap.xml : adresses belivay.com, sans /admin/', plan.includes('https://belivay.com/vendeur/') && !plan.includes('/admin/'))
verifier('pages : adresse canonique belivay.com', html.includes('https://belivay.com') && !html.includes('__SITE_URL__'))

// ── Compression, revalidation, plages, méthodes, chemins interdits ──
const br = await get(script, { headers: { 'accept-encoding': 'br' } })
verifier('script : brotli si accepté', br.headers.get('content-encoding') === 'br' && br.headers.get('vary') === 'Accept-Encoding')
const etag = s.headers.get('etag') ?? ''
verifier('ETag : 304 si inchangé', (await get(script, { headers: { 'if-none-match': etag } })).status === 304)
const plage = await get('/partage.jpg', { headers: { range: 'bytes=0-99' } })
verifier('plage d’octets : 206', plage.status === 206 && plage.headers.get('content-length') === '100')
verifier('POST / : 405', (await get('/', { method: 'POST' })).status === 405)
for (const c of ['/%2e%2e/package.json', '/..%2fserveur/vitrine.mjs', '/.env', '/%00']) {
  const r = await get(c)
  verifier(`${c} : rien hors de dist`, r.status === 404 || r.status === 400 || (r.status === 200 && (await r.text()).includes('src="/assets/')), `${r.status}`)
}

// ── Comptes réels ──
if (comptes) {
  const etat = await get('/api/auth/etat?espace=client', { base: comptes })
  const j = /** @type {any} */ (await etat.json().catch(() => ({})))
  verifier('/api/auth/etat : JSON du service des comptes', etat.status === 200 && typeof j.base === 'boolean' && etat.headers.get('cache-control') === 'no-store')
  if (local) {
    verifier('base en mémoire : comptes ouverts', j.base === true)
    const origine = new URL(comptes).origin
    const corps = { email: 'essai@example.cm', password: 'Soleil2026x', first_name: 'Essai', conditions_acceptees: true, conditions_version: '2026-10' }
    const enHttps = { 'content-type': 'application/json', origin: origine, 'x-forwarded-proto': 'https' }
    const ins = await get('/api/auth/register/?espace=client', { base: comptes, method: 'POST', headers: enHttps, body: JSON.stringify(corps) })
    const cookie = ins.headers.get('set-cookie') ?? ''
    verifier('inscription : 201, cookie __Host- HttpOnly Secure (HTTPS derrière nginx)', ins.status === 201 && cookie.startsWith('__Host-blv_s_client=') && /HttpOnly/i.test(cookie) && /Secure/i.test(cookie), `${ins.status} ${cookie.slice(0, 40)}`)
    const moi = await get('/api/auth/me/?espace=client', { base: comptes, headers: { cookie: cookie.split(';')[0], 'x-forwarded-proto': 'https' } })
    verifier('session : /api/auth/me/ rend le compte', moi.status === 200 && (/** @type {any} */ (await moi.json())).user?.email === corps.email)
    const ailleurs = await get('/api/auth/login/?espace=client', { base: comptes, method: 'POST', headers: { ...enHttps, origin: 'https://ailleurs.example' }, body: JSON.stringify({ email: corps.email, password: corps.password }) })
    verifier('écriture depuis un autre site : 403', ailleurs.status === 403)
    const faux = await get('/api/auth/login/?espace=client', { base: comptes, method: 'POST', headers: { ...enHttps, origin: 'https://ailleurs.example', 'x-forwarded-host': 'ailleurs.example' }, body: JSON.stringify({ email: corps.email, password: corps.password }) })
    verifier('X-Forwarded-Host du navigateur ignoré : 403', faux.status === 403)
    const gros = await get('/api/auth/login/?espace=client', { base: comptes, method: 'POST', headers: enHttps, body: 'x'.repeat(1024 * 1024 + 1) })
    verifier('corps de plus de 1 Mo : 413', gros.status === 413)
  } else {
    verifier('sans DATABASE_URL : base absente (la démonstration reste)', j.base === false)
    const r = await get('/', { base: comptes })
    verifier('service des comptes : aucun fichier servi', r.status === 404)
    const api = await get('/api/auth/etat?espace=client')
    verifier('service des fichiers : aucune API', api.status === 404)
  }
}

enfant?.kill('SIGTERM')
console.log(`\n${total - echecs}/${total} vérifications passées`)
process.exit(echecs ? 1 : 0)
