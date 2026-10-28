// L'espace livreur en mode API (VITE_SOURCE=api) contre le VRAI serveur : le projet d'essai du kit (backend-kit/_essai,
// Django + les applications livreur_*, entreprise_* et tout le kit), lancé par pw-api.config.ts (serveur 8040, base
// essai-livreur.sqlite3 neuve ; appli 5210).
//   npx playwright test -c pw-api.config.ts
// Chaque parcours passe par les écrans de l'appli (ou src/donnees/source.ts → src/api/domaines → client HTTP) et par les
// vraies routes /api/courier/… Le monde est Yafé Express (relaya_essai/essai_entreprise.py) : Serge Atangana, son
// livreur en période d'essai. Ce que font l'entreprise (accepter, affecter, décisions d'emploi), le vendeur (code de
// remise), le relais (scan, résultat) passe par leurs vraies routes ou par celles de l'essai (/api/_essai/…) ; les
// codes SMS sont lus comme Serge les lirait (/api/_essai/codes). L'appareil photo est celui du navigateur piloté (flux
// simulé, pw-api.config.ts) : jamais de photo de démonstration.
import { readFileSync } from 'node:fs'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const API = `http://localhost:${process.env.PORT_API_LIVREUR || 8040}/api`
const PIN = '482915'

test.describe.configure({ mode: 'serial' })

interface Monde {
  motDePasse: string
  membres: Record<'proprietaire' | 'gerant' | 'repartiteur' | 'comptable', { email: string; telephone: string }>
  livreurs: Record<'serge' | 'junior', { id: number; prenom: string; telephone: string; zones: string[]; etiquettes: { du: number; au: number } }>
}
let monde: Monde
let page: Page
const erreurs: string[] = []
const enVol = new Set<unknown>()

async function essai<T = Record<string, unknown>>(api: APIRequestContext, chemin: string, data: object = {}): Promise<T> {
  const r = await api.post(`${API}/_essai/${chemin}`, { data })
  expect(r.ok(), `POST /_essai/${chemin} : ${r.status()} ${await r.text()}`).toBe(true)
  return r.json() as Promise<T>
}
async function codeSms(api: APIRequestContext, numero: string): Promise<string> {
  const r = await api.get(`${API}/_essai/codes`, { params: { destination: numero } })
  expect(r.ok(), `code envoyé à ${numero}`).toBe(true)
  return (await r.json()).code as string
}

/** Jeton d'un accès de l'entreprise (gestes de l'autre interface : accepter, affecter, décisions d'emploi). */
const jetonsEntreprise: Record<string, string> = {}
async function entreprise(api: APIRequestContext, role: 'repartiteur' | 'gerant', methode: 'post' | 'put' | 'get', chemin: string, data?: object) {
  if (!jetonsEntreprise[role]) {
    await api.post(`${API}/_essai/limites`)
    const p = monde.membres[role]
    const r = await (await api.post(`${API}/company/auth/login`, { data: { identifiant: p.email, motDePasse: monde.motDePasse, appareil: `recette-${role}` } })).json()
    const v = r.code ? await (await api.post(`${API}/company/auth/verify`, { data: { defi: r.defi, code: await codeSms(api, p.telephone) } })).json() : r
    expect(v.ok, `connexion de l'entreprise (${role}) : ${JSON.stringify(v)}`).toBe(true)
    jetonsEntreprise[role] = v.jetons.access
  }
  const r = await api[methode](`${API}/company${chemin}`, {
    data,
    headers: { Authorization: `Bearer ${jetonsEntreprise[role]}`, 'Idempotency-Key': `recette-${Date.now()}-${Math.random().toString(36).slice(2)}` },
  })
  expect(r.ok(), `${methode.toUpperCase()} /company${chemin} : ${r.status()} ${await r.text()}`).toBe(true)
  return r.json()
}

/** Appelle `domaine.methode` de la source de l'appli (le même module que les écrans) dans la page. */
async function src<T = unknown>(p: Page, cle: string, ...args: unknown[]): Promise<T> {
  const r = await p.evaluate(
    async ([c, a]) => {
      const [d, m] = (c as string).split('.')
      const mod = (await import(/* @vite-ignore */ '/livreur/src/donnees/source.ts')) as { source: Record<string, Record<string, (...x: unknown[]) => Promise<unknown>>> }
      try {
        return { ok: true, v: await mod.source[d][m](...(a as unknown[])) }
      } catch (e) {
        return { ok: false, nom: (e as Error).name, code: (e as { code?: string }).code ?? null, message: (e as Error).message }
      }
    },
    [cle, args] as const,
  )
  const x = r as { ok: boolean; v?: unknown; nom?: string; code?: string | null; message?: string }
  if (!x.ok) throw new Error(`${cle} : ${x.nom} ${x.code ?? ''} ${x.message}`)
  return x.v as T
}
const origine = () => ({ cle: `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`, heure: Date.now(), position: null })

/** La page a fini de lire : aucune requête vers le kit en vol pendant une demi-seconde (le flux du temps réel ne compte pas). */
async function calme(p: Page) {
  let depuis = 0
  for (let i = 0; i < 150; i++) {
    if (enVol.size === 0) {
      depuis ||= Date.now()
      if (Date.now() - depuis >= 500) return
    } else depuis = 0
    await p.waitForTimeout(100)
  }
}
const taper = async (chiffres: string) => {
  for (const c of chiffres) await page.locator('.keypad button', { hasText: new RegExp('^' + c + '$') }).click()
}

test.beforeAll(async ({ browser, request }) => {
  monde = await essai<Monde>(request, 'entreprise/monde')
  page = await browser.newPage()
  const ici = () => page.url().replace(/^.*\/livreur\//, '/')
  page.on('pageerror', (e) => erreurs.push(`${ici()} : ${e.message}`))
  page.on('console', (m) => {
    if (m.text().startsWith('[non branché]')) erreurs.push(`${ici()} : ${m.text()}`)
  })
  // 404 attendu : un écran sans paquet ou sans arrêt lit « introuvable » ; jamais 400, 401, 403, 429 ni 5xx.
  page.on('response', (r) => {
    if (r.url().startsWith(API) && !r.url().includes('/_essai/') && r.status() >= 400 && r.status() !== 404)
      erreurs.push(`${ici()} : ${r.status()} ${r.request().method()} ${r.url().slice(API.length)}`)
  })
  const fin = (q: import('@playwright/test').Request) => enVol.delete(q)
  page.on('request', (q) => q.url().startsWith(API) && !q.url().includes('/realtime/stream') && enVol.add(q))
  page.on('requestfinished', fin)
  page.on('requestfailed', fin)
})
test.afterAll(async () => {
  await page?.close()
})

// ——— Connexion ———

test('connexion à l’écran : numéro de Serge, code SMS lu sur son téléphone, PIN créé en deux saisies, Aujourd’hui', async ({ request }) => {
  await request.post(`${API}/_essai/limites`)
  await page.goto('connexion')
  await page.getByLabel('Numéro de téléphone').fill(monde.livreurs.serge.telephone)
  await page.getByRole('button', { name: 'Recevoir le code' }).click()
  await expect(page.locator('.keypad')).toBeVisible()
  await taper(await codeSms(request, monde.livreurs.serge.telephone))
  await expect(page.getByRole('heading', { name: 'Créez votre code PIN' })).toBeVisible()
  await taper(PIN)
  await taper(PIN)
  await expect(page).toHaveURL(/\/livreur\/?$/, { timeout: 20_000 })
  const s = await src<{ connecte: boolean; livreur: { prenom: string } }>(page, 'session.session')
  expect(s.connecte).toBe(true)
  expect(s.livreur.prenom).toBe('Serge')
  expect(erreurs).toEqual([])
})

// ——— Toutes les pages ———

test('toutes les pages de l’appli au nom de Serge : aucune erreur, aucun refus, aucune méthode non branchée', async ({ request }) => {
  test.setTimeout(240_000)
  const PAGES = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8')) as { route: string }[]
  for (const x of PAGES.filter((y) => !['connexion'].includes(y.route))) {
    // Limite de lecture du kit (240/min par compte) : une personne n'ouvre pas trente pages en une minute.
    await request.post(`${API}/_essai/limites`)
    // Une requête de la page quittée peut ne jamais signaler sa fin : seules comptent celles de la nouvelle page.
    enVol.clear()
    await page.goto(x.route === 'aujourdhui' ? './' : x.route)
    await calme(page)
    // L'écran est attendu (10 s au plus), pas lu à l'instant : le calme ne compte que les requêtes au serveur, et le
    // serveur de Vite compile le morceau de l'écran à la demande (plus lent quand d'autres recettes tournent en même temps).
    const affiche = await page.locator('main, [role=main]').first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false)
    if (!affiche) erreurs.push(`/${x.route} : rien d’affiché`)
    if (/\/connexion/.test(page.url())) erreurs.push(`/${x.route} : renvoyé à la connexion`)
  }
  expect(erreurs).toEqual([])
})

// ——— Paquet affecté par l'entreprise, temps réel ———

let paquet: { paquet: string; codeVendeur: string }[] = []

test('temps réel (SSE) : l’entreprise accepte et affecte un paquet à Serge pendant qu’il regarde Aujourd’hui ; il arrive sans recharger', async ({ request }) => {
  await page.goto('./')
  await calme(page)
  paquet = (await essai<{ paquets: { paquet: string; codeVendeur: string }[] }>(request, 'entreprise/paquets', { n: 2 })).paquets
  const ref = paquet[0].paquet
  expect(paquet[1].paquet).toBe(ref) // deux commandes de la même boutique, un paquet de tournée
  await entreprise(request, 'repartiteur', 'post', `/packages/${ref}/accept`)
  await entreprise(request, 'repartiteur', 'post', `/packages/${ref}/assign`, { livreurId: String(monde.livreurs.serge.id) })
  await expect(page.getByText(ref).first()).toBeVisible({ timeout: 20_000 })
  expect(erreurs).toEqual([])
})

// ——— Tournée à l'écran : démarrage, ramassage chez le vendeur, dépôt au relais ———

const re = (texte: string) => new RegExp(texte.split(' ').map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\u00a0\\u202f]+'))
/** Photo prise par l'appareil photo de l'appli (flux simulé du navigateur piloté), jamais une photo de démonstration. */
async function declencher() {
  const cam = page.locator('.lv-cam')
  await expect(cam).toBeVisible()
  const bouton = cam.locator('.lv-cam-declencheur')
  await expect(bouton).toBeEnabled({ timeout: 15_000 })
  // L'image vient du flux vidéo : il faut que la première image soit arrivée.
  await expect.poll(() => page.evaluate(() => (document.querySelector('.lv-cam video') as HTMLVideoElement | null)?.videoWidth ?? 0), { timeout: 15_000 }).toBeGreaterThan(0)
  await bouton.click()
  await expect(cam).toHaveCount(0, { timeout: 20_000 })
}
async function photo(ou = page.locator('main')) {
  await ou.getByRole('button', { name: re('Prendre la photo') }).first().click()
  await declencher()
}
const CASES = ['Bon article', 'Bonne variante', 'Bonne quantité', 'État conforme', 'Aucun dommage visible', 'Accessoires annoncés présents']

test('tournée à l’écran : Serge démarre, arrive chez le vendeur, photographie la liste, contrôle, emballe, saisit le code ; la garde passe à lui', async ({ request }) => {
  test.setTimeout(240_000)
  const ref = paquet[0].paquet
  await page.goto('./')
  await page.getByRole('link', { name: 'Voir le paquet et le kit' }).click()
  await expect(page).toHaveURL(new RegExp(`/paquet\\?id=${ref}`))
  await page.getByRole('button', { name: /démarrer la tournée/i }).click()
  await expect(page).toHaveURL(/\/tournee/, { timeout: 20_000 })
  await request.post(`${API}/_essai/limites`)
  await page.getByRole('button', { name: re('Je suis arrivé') }).first().click()
  await expect(page).toHaveURL(/\/arrivee\?a=/)
  // Liste groupée du vendeur : une photo par colis (ramassage.recuperer → POST parcels/{id}/collected).
  const boutons = page.getByRole('button', { name: /^Photographier ·/ })
  await expect(boutons.first()).toBeVisible()
  const n = await boutons.count()
  expect(n).toBe(2)
  for (let i = 0; i < n; i++) {
    await boutons.first().click()
    await declencher()
    await expect(boutons).toHaveCount(n - i - 1)
  }
  await page.getByRole('link', { name: 'Tout récupéré' }).click()
  const du = monde.livreurs.serge.etiquettes.du
  for (let k = 0; k < n; k++) {
    await request.post(`${API}/_essai/limites`)
    await expect(page).toHaveURL(/\/controle/)
    await page.getByRole('radio', { name: re('Non : sortir le produit') }).click()
    for (const c of CASES) await page.getByRole('checkbox', { name: new RegExp('^' + c) }).click()
    await photo()
    await page.getByRole('button', { name: re('Emballer et sceller') }).click()
    // Audit C4 tiré au sort par le serveur (fréquence selon le Trust Score du vendeur) : fait s'il est demandé.
    await page.waitForURL(/\/(audit|emballage)\?/)
    if (/\/audit/.test(page.url())) {
      await expect(page.getByRole('radio', { name: 'Conforme' })).toHaveCount(4)
      for (const b of await page.getByRole('radio', { name: 'Conforme' }).all()) await b.click()
      for (let i = 0; i < 3; i++) await photo()
      await expect(page.getByText('4 sur 4')).toBeVisible()
      await page.getByRole('button', { name: re('Terminer l’audit') }).click()
    }
    await expect(page).toHaveURL(/\/emballage/)
    await page.getByLabel(re('Ou saisissez le numéro à la main')).fill(String(du + k))
    await page.getByRole('button', { name: re('Lier l’étiquette') }).click()
    await expect(page.getByText(re('définitivement'))).toBeVisible()
    for (const s of ['Ruban sur toutes les ouvertures', 'Signature au marqueur', 'Étiquette collée à plat']) await page.getByRole('checkbox', { name: re(s) }).click()
    await photo()
    await page.getByRole('button', { name: re('Valider l’emballage') }).click()
  }
  // Un code de remise par commande (le vendeur les montre dans son application) : chacun fait passer les colis de sa
  // commande ; tant qu'un colis scellé attend son code, la saisie revient (« 1 colis déjà remis ici »).
  await expect(page).toHaveURL(/\/code-remise/)
  for (const [i, p] of paquet.entries()) {
    await expect(page.locator('.lv-pave, .keypad').getByRole('button', { name: '1', exact: true })).toBeEnabled()
    for (const c of p.codeVendeur) await page.locator('.lv-pave, .keypad').getByRole('button', { name: c, exact: true }).click()
    await page.getByRole('button', { name: re('Valider la remise') }).click()
    if (i < paquet.length - 1) await expect(page.getByText(re(`${i + 1} colis déjà remis ici`))).toBeVisible({ timeout: 20_000 })
  }
  await expect(page.getByRole('heading', { name: /Remise validée/ })).toBeVisible({ timeout: 20_000 })
  const s = await src<{ colisSousGarde: number }>(page, 'session.session')
  expect(s.colisSousGarde).toBe(2)
  expect(erreurs).toEqual([])
})

test('dépôt au relais à l’écran : arrivée, code de dépôt montré, la gérante scanne et contrôle, Serge confirme : la garde passe au relais', async ({ request }) => {
  const t = await src<{ arrets: { id: string; type: string }[] }>(page, 'tournee.courante')
  const relais = t.arrets.find((a) => a.type === 'relais')!
  await page.goto('tournee')
  await request.post(`${API}/_essai/limites`)
  await page.getByRole('button', { name: re('Je suis au relais') }).first().click()
  await expect(page).toHaveURL(/\/depot-relais/)
  const dep = await src<{ qr: { code: string } | null }>(page, 'remises.depotRelais', relais.id)
  expect(dep.qr?.code).toMatch(/^\d{6}$/)
  // L'application du relais : scan du code de dépôt, puis résultat de chaque colis (routes d'essai du socle).
  const scan = await essai<{ ok: boolean; colis: string[] }>(request, `livraison/relais/${relais.id}/scan`, { code: dep.qr!.code })
  expect(scan.ok && scan.colis.length === 2).toBe(true)
  for (const e of scan.colis) expect((await essai<{ ok: boolean }>(request, `livraison/relais/${relais.id}/resultat`, { etiquette: e, resultat: 'controle' })).ok).toBe(true)
  await expect(page.getByRole('button', { name: re('Confirmer la remise du lot') })).toBeEnabled({ timeout: 20_000 })
  await page.getByRole('button', { name: re('Confirmer la remise du lot') }).click()
  await page.getByRole('dialog').getByRole('button', { name: re('Confirmer la remise') }).click()
  await expect.poll(async () => (await src<{ confirmeA: number | null }>(page, 'remises.depotRelais', relais.id)).confirmeA, { timeout: 20_000 }).not.toBeNull()
  expect((await src<{ colisSousGarde: number }>(page, 'session.session')).colisSousGarde).toBe(0)
  expect(erreurs).toEqual([])
})

// ——— Gestes de terrain sur un nouveau paquet : retard annoncé, arrêt d'abord, colis manquant chez le vendeur ———

test('gestes de terrain (même source que les écrans) : retard annoncé, « faire cet arrêt d’abord » refusé avant le ramassage, colis pas prêt attendu puis laissé', async ({ request }) => {
  const p = (await essai<{ paquets: { paquet: string }[] }>(request, 'entreprise/paquets', { n: 2 })).paquets
  const ref = p[0].paquet
  await entreprise(request, 'repartiteur', 'post', `/packages/${ref}/accept`)
  await entreprise(request, 'repartiteur', 'post', `/packages/${ref}/assign`, { livreurId: String(monde.livreurs.serge.id) })
  await page.goto(`paquet?id=${ref}`)
  await page.getByRole('button', { name: /démarrer la tournée/i }).click()
  await expect(page).toHaveURL(/\/tournee/, { timeout: 20_000 })
  // Les arrêts du nouveau paquet (la tournée garde aussi ceux du paquet déposé).
  const pq = await src<{ arrets: { id: string; type: string }[] }>(page, 'paquets.paquet', ref)
  const boutique = pq.arrets.find((a) => a.type === 'ramassage')!
  const relais = pq.arrets.find((a) => a.type === 'relais')!
  // Retard annoncé sur l'arrêt en cours (la nouvelle heure part au vendeur et à l'entreprise) ; ailleurs, refusé.
  const r1 = await src<{ ok: boolean; arriveeEstimee?: number }>(page, 'tournee.annoncerRetard', boutique.id, 15, origine())
  expect(r1).toMatchObject({ ok: true })
  expect(r1.arriveeEstimee ?? 0).toBeGreaterThan(Date.now())
  expect(await src(page, 'tournee.annoncerRetard', relais.id, 10, origine())).toEqual({ ok: false, raison: 'hors_mission' })
  // Le relais ne passe pas avant le ramassage de ses colis.
  expect(await src(page, 'tournee.prioriser', relais.id, origine())).toMatchObject({ ok: false, raison: 'ramassage_avant' })
  expect(await src(page, 'tournee.prioriser', boutique.id, origine())).toMatchObject({ ok: false, raison: 'deja_en_cours' })
  // Chez le vendeur : un colis pas prêt, attendu (ATTENTE-VENDEUR-MIN), puis laissé : il sort du paquet.
  await request.post(`${API}/_essai/limites`)
  await page.getByRole('button', { name: re('Je suis arrivé') }).first().click()
  await expect(page).toHaveURL(/\/arrivee\?a=/)
  const ram = await src<{ colis: { colisId: string }[] }>(page, 'ramassage.ramassage', boutique.id)
  const c = ram.colis[1].colisId
  const a = await src<{ ok: boolean; jusqua?: number }>(page, 'ramassage.colisManquant', c, 'attendre', origine())
  expect(a.ok && (a.jusqua ?? 0) > Date.now()).toBe(true)
  expect(await src(page, 'ramassage.colisManquant', c, 'partir', origine())).toEqual({ ok: true })
  const apres = await src<{ arrets: { type: string; colis: unknown[] }[] }>(page, 'paquets.paquet', ref)
  expect(apres.arrets.find((x) => x.type === 'ramassage')!.colis.length).toBe(1)
  expect(erreurs).toEqual([])
})

// ——— Emploi : ce que l'entreprise décide, vu par Serge ———

test('emploi (DP-66) : l’entreprise avertit puis met fin au contrat ; Serge le voit dans son application (bandeau, avertissement), sans pouvoir l’annuler', async ({ request }) => {
  const id = String(monde.livreurs.serge.id)
  await entreprise(request, 'gerant', 'post', `/staff/${id}/warnings`, { motif: 'Retard de ramassage non prévenu.' })
  await entreprise(request, 'gerant', 'post', `/staff/${id}/termination`, { motif: 'Fin de la saison des pluies.' })
  await page.goto('./')
  await expect(page.locator('[data-emploi="fin"]')).toBeVisible({ timeout: 20_000 })
  const e = await src<{ avertissements: { rang: number; motif: string }[]; finContrat: { motif: string } | null; essai: unknown }>(page, 'moi.emploi')
  expect(e.avertissements).toEqual([expect.objectContaining({ rang: 1, motif: 'Retard de ramassage non prévenu.' })])
  expect(e.finContrat?.motif).toBe('Fin de la saison des pluies.')
  expect(await src<{ ok: boolean }>(page, 'moi.annulerDepart', origine())).toMatchObject({ ok: false })
  await entreprise(request, 'gerant', 'post', `/staff/${id}/termination/cancel`, { motif: 'Accord trouvé.' })
  await expect(page.locator('[data-emploi="fin"]')).toHaveCount(0, { timeout: 20_000 })
  expect(erreurs).toEqual([])
})

// ——— Zones v2 et compte ———

test('zones v2 et compte : zones de Serge nommées par la carte, sécurité du compte (PIN changé, appareil unique)', async () => {
  const geo = JSON.parse(readFileSync(new URL('../../logique-metier/livraison/zones-yaounde.geo.json', import.meta.url), 'utf-8')) as { features: { id: string; properties: { nom: string } }[] }
  const nom = Object.fromEntries(geo.features.map((f) => [f.id, f.properties.nom]))
  const moi = await src<{ zones: { code: string; nom: string }[] }>(page, 'moi.profil')
  expect(moi.zones.length).toBeGreaterThan(0)
  for (const z of moi.zones) expect(z.nom, z.code).toBe(nom[z.code])
  const s = await src<{ appareils?: unknown[] }>(page, 'session.securite')
  expect(s).toBeTruthy()
  expect(await src(page, 'session.changerPin', '000000', '593017', origine())).toMatchObject({ ok: false, raison: 'pin_faux' })
  expect(await src(page, 'session.changerPin', PIN, '593017', origine())).toMatchObject({ ok: true })
  // Mon compte en mode API : le compte du serveur (nom, numéro masqué), aucune donnée de démonstration.
  await page.goto('mon-compte')
  await expect(page.getByText('Serge Atangana')).toBeVisible()
  await expect(page.getByText(/\+237/).first()).toBeVisible()
  await expect(page.getByText('serge.atangana@exemple.cm')).toHaveCount(0)
  await page.goto('moi')
  await expect(page.getByRole('heading').first()).toBeVisible()
  expect(erreurs).toEqual([])
})
