// Recette multi-applis en MODE API : une commande suivie à travers les six applications, toutes branchées sur le même
// serveur d'essai du kit (connectivite/pw-api.config.ts). Chaque geste passe par l'appli de l'acteur, à l'écran ou par
// sa source (src/donnees/source.ts → src/api/domaines → client HTTP : le même module que les écrans) ; ce qui se
// passe hors des applis (SMS reçus, webhook de l'agrégateur Mobile Money, heure limite d'un paquet) passe par les routes
// de l'essai (/api/_essai/…).
//   1. client (Bertrand) : relais de Mokolo choisi, article de Maison Ngono au panier, commande payée en Mobile Money ;
//   2. vendeur (Maison Ngono) : la commande arrive, bon de préparation, « C'est prêt », code de remise affiché ;
//   3. entreprise (Yafé Express, répartiteur) : le paquet publié est accepté et affecté à Serge, à l'écran ;
//   4. livreur (Serge) : connexion, tournée, ramassage chez le vendeur (photo, contrôle, emballage, code du vendeur) ;
//   5. relais (Rose) : connexion, réception du lot (code de dépôt montré par Serge, étiquette, photo, PIN), Serge confirme ;
//   6. client : « prêt au retrait » et son code ; relais : retrait avec ce code, photo, « Remis », PIN ; client : retirée ;
//   7. vendeur : remis au client ; console (Direction) : la commande, retirée, et sa chronologie.
import { createHmac } from 'node:crypto'
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { PORTS } from './pw-api.config'

const API = `http://localhost:${process.env.PORT_API_MULTI || 8070}/api`
const MDP = 'Essai-BelivaY-2026'
const BERTRAND = 'bertrand.essomba@gmail.com'
const PIN_LIVREUR = '482915'
const URL = {
  client: `http://localhost:${PORTS.client}/`,
  vendeur: `http://localhost:${PORTS.vendeur}/vendeur/`,
  entreprise: `http://localhost:${PORTS.entreprise}/entreprise/`,
  livreur: `http://localhost:${PORTS.livreur}/livreur/`,
  relais: `http://localhost:${PORTS.relais}/relais/`,
  admin: `http://localhost:${PORTS.admin}/admin/`,
}
const SOURCE = { client: '/src/donnees/source.ts', vendeur: '/vendeur/src/donnees/source.ts', entreprise: '/entreprise/src/donnees/source.ts', livreur: '/livreur/src/donnees/source.ts', relais: '/relais/src/donnees/source.ts', admin: '/admin/src/donnees/source.ts' }
type App = keyof typeof URL

test.describe.configure({ mode: 'serial' })

interface Monde {
  motDePasse: string
  membres: Record<'repartiteur', { email: string; telephone: string }>
  livreurs: Record<'serge', { id: number; telephone: string; etiquettes: { du: number } }>
  vendeur: { email: string; telephone: string; boutique: string }
  relais: { nom: string; zone: string }
  gerante: { prenom: string; telephone: string; pin: string }
  produit: string
}
let monde: Monde
const pages = {} as Record<App, Page>
const erreurs: string[] = []

async function essai<T = Record<string, unknown>>(api: APIRequestContext, chemin: string, data: object = {}): Promise<T> {
  const r = await api.post(`${API}/_essai/${chemin}`, { data })
  expect(r.ok(), `POST /_essai/${chemin} : ${r.status()} ${await r.text()}`).toBe(true)
  return r.json() as Promise<T>
}
async function codeSms(api: APIRequestContext, destination: string): Promise<string> {
  const r = await api.get(`${API}/_essai/codes`, { params: { destination } })
  expect(r.ok(), `code envoyé à ${destination}`).toBe(true)
  return (await r.json()).code as string
}

/** Appelle une méthode de la source de l'appli (client : « methode » ; autres : « domaine.methode »). */
async function src<T = unknown>(app: App, cle: string, ...args: unknown[]): Promise<T> {
  const r = (await pages[app].evaluate(
    async ([chemin, c, a]) => {
      const mod = (await import(/* @vite-ignore */ chemin as string)) as { source: Record<string, unknown> }
      const [d, m] = (c as string).includes('.') ? (c as string).split('.') : [null, c as string]
      const cible = (d ? mod.source[d] : mod.source) as Record<string, (...x: unknown[]) => Promise<unknown>>
      try {
        return { ok: true, v: await cible[m](...(a as unknown[])) }
      } catch (e) {
        return { ok: false, nom: (e as Error).name, code: (e as { code?: string }).code ?? null, message: (e as Error).message }
      }
    },
    [SOURCE[app], cle, args] as const,
  )) as { ok: boolean; v?: unknown; nom?: string; code?: string | null; message?: string }
  if (!r.ok) throw new Error(`${app} · ${cle} : ${r.nom} ${r.code ?? ''} ${r.message}`)
  return r.v as T
}
const origine = () => ({ cle: `multi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`, heure: Date.now(), position: null })
const re = (texte: string) => new RegExp(texte.split(' ').map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\u00a0\\u202f]+'))

/** Une page d'une appli ; ses exceptions et les réponses 5xx du kit sont des échecs de la recette. */
async function ouvrir(browser: Browser, app: App, init?: (p: Page) => Promise<void>) {
  const p = await browser.newPage()
  if (init) await init(p)
  p.on('pageerror', (e) => erreurs.push(`${app} ${p.url()} : ${e.message}`))
  p.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 500) erreurs.push(`${app} : ${r.status()} ${r.request().method()} ${r.url().slice(API.length)}`)
  })
  await p.goto(URL[app])
  pages[app] = p
  return p
}

let ref = '' // « BLV-… » : la commande suivie
let commande = 0 // son numéro
let paquet = ''
let codeRemise = ''

test.beforeAll(async ({ request }) => {
  monde = await essai<Monde>(request, 'multi/monde')
  await request.post(`${API}/_essai/limites`)
})
test.afterAll(async () => {
  for (const p of Object.values(pages)) await p.close()
})

test('1. client : relais de Mokolo choisi, article de Maison Ngono au panier, commande payée en Mobile Money', async ({ browser, request }) => {
  await ouvrir(browser, 'client')
  const c = await src<{ ok: boolean }>('client', 'connecterEmail', BERTRAND, MDP, true)
  expect(c.ok).toBe(true)
  await src('client', 'choisirRelais', monde.relais.nom)
  for (const l of (await src<{ lignes: { id: string }[] }>('client', 'panier')).lignes) await src('client', 'retirerLigne', l.id).catch(() => undefined)
  await src('client', 'ajouterProduit', monde.produit, {}, 1)
  const p = await src<{ relais: string; lignes: { p: string }[] }>('client', 'panier')
  expect(p.relais).toBe(monde.relais.nom)
  expect(p.lignes.map((l) => l.p)).toEqual([monde.produit])
  const livraison = await pages.client.evaluate(async () => {
    const { source } = (await import(/* @vite-ignore */ '/src/donnees/source.ts')) as typeof import('../src/donnees/source')
    const { calculer } = (await import(/* @vite-ignore */ '/src/donnees/frais.ts')) as typeof import('../src/donnees/frais')
    const x = await source.panier()
    const bs = [...new Set(x.lignes.map((l) => l.boutique))]
    const r = calculer(x.mode, bs.map((b) => ({ boutique: b, zone: x.boutiques[b]?.zone ?? 'Mokolo', articles: x.lignes.filter((l) => l.boutique === b).map((l) => ({ prix: l.prix, quantite: l.qte, classe: l.classe })) })))
    return r.total - r.sousTotal
  })
  const cmd = await src<{ ref: string; etat: string }>('client', 'passerCommande', { mode: 'relais', moyen: 'mtn', comptoir: false, numero: null, livraison, frais: 0 })
  expect(cmd.etat).toBe('attente')
  ref = cmd.ref
  commande = Number(ref.replace('BLV-', ''))
  // L'opérateur Mobile Money confirme (webhook de l'agrégateur) : la commande est payée.
  expect((await essai<{ domaine: string }>(request, 'paiements/confirmer', { commande: ref })).domaine).toBe('commande')
  expect((await src<{ etat: string }>('client', 'confirmerPaiement', ref)).etat).toBe('payee')
  await pages.client.goto(`${URL.client}commande?ref=${ref}`)
  await expect(pages.client.getByText(ref).first()).toBeVisible()
  expect((await src<{ commande: { etat: string } }>('client', 'commandeClient', ref)).commande.etat).toBe('preparation')
  expect(erreurs).toEqual([])
})

test('2. vendeur : la commande arrive chez Maison Ngono, bon de préparation, « C’est prêt », code de remise', async ({ browser, request }) => {
  await ouvrir(browser, 'vendeur', (p) => p.addInitScript(() => localStorage.setItem('blv_v_appareil', 'appareil-multi')))
  const c = await src<{ ok: boolean; raison?: string }>('vendeur', 'session.connecter', monde.vendeur.email, MDP, { seSouvenir: true })
  if (!c.ok) {
    expect(c.raison).toBe('deuxieme_facteur')
    expect(await src('vendeur', 'session.validerDeuxiemeFacteur', await codeSms(request, monde.vendeur.telephone))).toMatchObject({ ok: true })
  }
  const vue = await src<{ items: { ref: string }[] }>('vendeur', 'commandes.vue', 'prep')
  expect(vue.items.map((x) => x.ref)).toContain(ref)
  await pages.vendeur.goto(`${URL.vendeur}commande?ref=${ref}`)
  await expect(pages.vendeur.getByText(ref).first()).toBeVisible()
  const bon = await src<{ aVerifier: unknown[] }>('vendeur', 'preparation.bon', ref)
  await src('vendeur', 'preparation.ouvrirBon', ref)
  for (let i = 0; i < bon.aVerifier.length; i++) await src('vendeur', 'preparation.cocher', ref, i, true)
  expect(await src('vendeur', 'preparation.cestPret', ref)).toMatchObject({ ok: true })
  expect((await src<{ etape: string }>('vendeur', 'remise.remise', ref)).etape).toBe('prete')
  codeRemise = (await src<{ code: string }>('vendeur', 'remise.afficherCode', ref)).code
  expect(codeRemise).toMatch(/^\d{6}$/)
  // Le client voit sa commande prête (« Prêt, livreur bientôt affecté »).
  await expect.poll(async () => (await src<{ commande: { colis: { etat?: string }[] } }>('client', 'commandeClient', ref)).commande.colis.length).toBeGreaterThan(0)
  expect(erreurs).toEqual([])
})

test('3. entreprise (répartiteur de Yafé Express) : le paquet publié est accepté puis affecté à Serge, à l’écran', async ({ browser, request }) => {
  const pq = await essai<{ paquet: string; statut: string }>(request, 'multi/publier', { commande: ref })
  paquet = pq.paquet
  expect(paquet).toMatch(/^PQ-Z3-/)
  expect(pq.statut).toBe('publie')
  // Connexion de l'accès nominatif (mot de passe, code SMS), jetons posés dans l'appli avant son premier script.
  const p = monde.membres.repartiteur
  await request.post(`${API}/_essai/limites`)
  const r = await (await request.post(`${API}/company/auth/login`, { data: { identifiant: p.email, motDePasse: monde.motDePasse, appareil: 'multi-repartiteur' } })).json()
  const v = r.code ? await (await request.post(`${API}/company/auth/verify`, { data: { defi: r.defi, code: await codeSms(request, p.telephone) } })).json() : r
  expect(v.ok, JSON.stringify(v)).toBe(true)
  const page = await ouvrir(browser, 'entreprise', (x) =>
    x.addInitScript(
      ([j]) => {
        if (!sessionStorage.getItem('blv_multi')) {
          sessionStorage.setItem('blv_multi', '1')
          localStorage.setItem('blv_api_jetons', j)
          localStorage.setItem('blv_e_appareil', 'multi-repartiteur')
        }
      },
      [JSON.stringify({ acces: v.jetons.access, rafraichissement: v.jetons.refresh })],
    ),
  )
  await page.goto(`${URL.entreprise}paquets`)
  const carte = page.locator('article.entb-pq', { has: page.locator(`[id="pq-${paquet}"]`) })
  await expect(carte).toBeVisible({ timeout: 20_000 })
  await carte.getByRole('button', { name: 'Accepter' }).click()
  await expect.poll(async () => (await src<{ statut: string }>('entreprise', 'paquets.paquet', paquet)).statut, { timeout: 20_000 }).toBe('accepte')
  await page.goto(`${URL.entreprise}affectation?id=${paquet}`)
  await page.getByRole('button', { name: 'Affecter Serge A.', exact: true }).click()
  await expect.poll(async () => (await src<{ statut: string }>('entreprise', 'paquets.paquet', paquet)).statut, { timeout: 20_000 }).toBe('affecte')
  expect(erreurs).toEqual([])
})

/** Photo prise par l'appareil photo de l'appli du livreur (flux simulé du navigateur). */
async function declencher(page: Page) {
  const cam = page.locator('.lv-cam')
  await expect(cam).toBeVisible()
  const bouton = cam.locator('.lv-cam-declencheur')
  await expect(bouton).toBeEnabled({ timeout: 15_000 })
  await expect.poll(() => page.evaluate(() => (document.querySelector('.lv-cam video') as HTMLVideoElement | null)?.videoWidth ?? 0), { timeout: 15_000 }).toBeGreaterThan(0)
  await bouton.click()
  await expect(cam).toHaveCount(0, { timeout: 20_000 })
}
const CASES = ['Bon article', 'Bonne variante', 'Bonne quantité', 'État conforme', 'Aucun dommage visible', 'Accessoires annoncés présents']

test('4. livreur (Serge) : connexion, tournée, ramassage chez Maison Ngono (photo, contrôle, emballage, code du vendeur)', async ({ browser, request }) => {
  const page = await ouvrir(browser, 'livreur')
  const taper = async (chiffres: string) => {
    for (const c of chiffres) await page.locator('.keypad button', { hasText: new RegExp('^' + c + '$') }).click()
  }
  await request.post(`${API}/_essai/limites`)
  await page.goto(`${URL.livreur}connexion`)
  await page.getByLabel('Numéro de téléphone').fill(monde.livreurs.serge.telephone)
  await page.getByRole('button', { name: 'Recevoir le code' }).click()
  await expect(page.locator('.keypad')).toBeVisible()
  await taper(await codeSms(request, monde.livreurs.serge.telephone))
  await expect(page.getByRole('heading', { name: 'Créez votre code PIN' })).toBeVisible()
  await taper(PIN_LIVREUR)
  await taper(PIN_LIVREUR)
  await expect(page).toHaveURL(/\/livreur\/?$/, { timeout: 20_000 })
  // Le paquet affecté par l'entreprise est là.
  await expect(page.getByText(paquet).first()).toBeVisible({ timeout: 20_000 })
  await page.getByRole('link', { name: 'Voir le paquet et le kit' }).click()
  await expect(page).toHaveURL(new RegExp(`/paquet\\?id=${paquet}`))
  await page.getByRole('button', { name: /démarrer la tournée/i }).click()
  await expect(page).toHaveURL(/\/tournee/, { timeout: 20_000 })
  await request.post(`${API}/_essai/limites`)
  await page.getByRole('button', { name: re('Je suis arrivé') }).first().click()
  await expect(page).toHaveURL(/\/arrivee\?a=/)
  const boutons = page.getByRole('button', { name: /^Photographier ·/ })
  await expect(boutons).toHaveCount(1)
  await boutons.first().click()
  await declencher(page)
  await page.getByRole('link', { name: 'Tout récupéré' }).click()
  await expect(page).toHaveURL(/\/controle/)
  await page.getByRole('radio', { name: re('Non : sortir le produit') }).click()
  for (const c of CASES) await page.getByRole('checkbox', { name: new RegExp('^' + c) }).click()
  await page.getByRole('button', { name: re('Prendre la photo') }).first().click()
  await declencher(page)
  await page.getByRole('button', { name: re('Emballer et sceller') }).click()
  await page.waitForURL(/\/(audit|emballage)\?/)
  if (/\/audit/.test(page.url())) {
    // Audit C4 tiré au sort par le serveur (fréquence selon le Trust Score du vendeur) : fait s'il est demandé.
    await expect(page.getByRole('radio', { name: 'Conforme' })).toHaveCount(4)
    for (const b of await page.getByRole('radio', { name: 'Conforme' }).all()) await b.click()
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: re('Prendre la photo') }).first().click()
      await declencher(page)
    }
    await expect(page.getByText('4 sur 4')).toBeVisible()
    await page.getByRole('button', { name: re('Terminer l’audit') }).click()
  }
  await expect(page).toHaveURL(/\/emballage/)
  await page.getByLabel(re('Ou saisissez le numéro à la main')).fill(String(monde.livreurs.serge.etiquettes.du))
  await page.getByRole('button', { name: re('Lier l’étiquette') }).click()
  await expect(page.getByText(re('définitivement'))).toBeVisible()
  for (const s of ['Ruban sur toutes les ouvertures', 'Signature au marqueur', 'Étiquette collée à plat']) await page.getByRole('checkbox', { name: re(s) }).click()
  await page.getByRole('button', { name: re('Prendre la photo') }).first().click()
  await declencher(page)
  await page.getByRole('button', { name: re('Valider l’emballage') }).click()
  // Le code de remise que la boutique montre dans son application.
  await expect(page).toHaveURL(/\/code-remise/)
  for (const c of codeRemise) await page.locator('.lv-pave, .keypad').getByRole('button', { name: c, exact: true }).click()
  await page.getByRole('button', { name: re('Valider la remise') }).click()
  await expect(page.getByRole('heading', { name: /Remise validée/ })).toBeVisible({ timeout: 20_000 })
  expect((await src<{ colisSousGarde: number }>('livreur', 'session.session')).colisSousGarde).toBe(1)
  // Chez le vendeur : remis au livreur.
  await expect.poll(async () => (await src<{ etape: string }>('vendeur', 'remise.remise', ref)).etape, { timeout: 20_000 }).toBe('remise')
  expect(erreurs).toEqual([])
})

const PHOTO = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }

test('5. relais (Rose) : connexion, réception du lot avec le code de dépôt montré par Serge, Serge confirme : la garde passe au relais', async ({ browser, request }) => {
  // L'appli du relais tape les codes au pavé (pas d'appareil photo sur ce poste).
  const page = await ouvrir(browser, 'relais', (p) =>
    p.addInitScript(() => {
      const md = navigator.mediaDevices
      if (md && /\/(reception|retrait|camera)/.test(location.pathname))
        Object.defineProperty(md, 'getUserMedia', { configurable: true, value: () => Promise.reject(Object.assign(new Error('aucun appareil'), { name: 'NotFoundError' })) })
    }),
  )
  await request.post(`${API}/_essai/limites`)
  await page.goto(`${URL.relais}connexion`)
  await page.getByLabel('Numéro', { exact: true }).fill(monde.gerante.telephone)
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByRole('heading', { name: 'Nouveau téléphone' })).toBeVisible()
  await page.getByPlaceholder('000000').fill(await codeSms(request, monde.gerante.telephone))
  await expect(page.getByText(`Bonjour ${monde.gerante.prenom}`)).toBeVisible()
  await page.keyboard.type(monde.gerante.pin)
  await expect(page).toHaveURL(/\/relais\/?$/)
  // Serge arrive au relais : son application montre le code de dépôt.
  const t = await src<{ arrets: { id: string; type: string }[] }>('livreur', 'tournee.courante')
  const arret = t.arrets.find((a) => a.type === 'relais')!
  await pages.livreur.goto(`${URL.livreur}tournee`)
  await request.post(`${API}/_essai/limites`)
  await pages.livreur.getByRole('button', { name: re('Je suis au relais') }).first().click()
  await expect(pages.livreur).toHaveURL(/\/depot-relais/)
  const dep = await src<{ qr: { code: string } | null }>('livreur', 'remises.depotRelais', arret.id)
  expect(dep.qr?.code).toMatch(/^\d{6}$/)
  // Rose tape le code, l'étiquette du colis (« BLV-<commande>-1 » en 6 chiffres), photographie le lot, signe au PIN.
  const pave = async (chiffres: string) => {
    for (const k of chiffres) await page.locator('main').getByRole('button', { name: k, exact: true }).click()
  }
  await page.goto(`${URL.relais}reception`)
  await pave(dep.qr!.code)
  await expect(page.getByText('CODE DE DÉPÔT VALIDÉ', { exact: true })).toBeVisible()
  await pave(String(commande).padStart(5, '0') + '1')
  await expect(page.getByText(new RegExp(`BLV-${commande}-1 → rangez`))).toBeVisible()
  await page.getByRole('button', { name: 'Terminer' }).click()
  const f = page.getByRole('dialog')
  await f.locator('input[type=file]').setInputFiles(PHOTO)
  for (const k of monde.gerante.pin) await f.getByRole('button', { name: k, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Le livreur confirme le lot' })).toBeVisible()
  // Serge confirme la remise du lot dans son application : la garde passe au relais.
  await expect(pages.livreur.getByRole('button', { name: re('Confirmer la remise du lot') })).toBeEnabled({ timeout: 20_000 })
  await pages.livreur.getByRole('button', { name: re('Confirmer la remise du lot') }).click()
  await pages.livreur.getByRole('dialog').getByRole('button', { name: re('Confirmer la remise') }).click()
  await expect(page.getByRole('heading', { name: 'Lot reçu · 1 colis' })).toBeVisible({ timeout: 30_000 })
  await expect.poll(async () => (await src<{ colisSousGarde: number }>('livreur', 'session.session')).colisSousGarde, { timeout: 20_000 }).toBe(0)
  expect(erreurs).toEqual([])
})

test('6. client : prêt au retrait avec son code ; relais : retrait avec ce code, photo, « Remis », PIN ; client : retirée', async ({ request }) => {
  await request.post(`${API}/_essai/limites`)
  await expect.poll(async () => (await src<{ commande: { etat: string } }>('client', 'commandeClient', ref)).commande.etat, { timeout: 20_000 }).toBe('retirable')
  const code = (await src<{ commande: { code: string | null } }>('client', 'commandeClient', ref)).commande.code!
  expect(code).toMatch(/^\d{6}$/)
  await pages.client.goto(`${URL.client}commande?ref=${ref}`)
  await expect(pages.client.getByText(ref).first()).toBeVisible()
  // Au comptoir du relais : le code du client, la photo de la remise, « Remis », le PIN de Rose.
  const page = pages.relais
  const zone = async () => ((await page.getByRole('dialog').count()) ? page.getByRole('dialog') : page.locator('main'))
  const taper = async (chiffres: string) => {
    const z = await zone()
    for (const k of chiffres) await z.getByRole('button', { name: k, exact: true }).click()
  }
  await page.goto(`${URL.relais}retrait`)
  await expect(page.getByText(/Appareil photo indisponible\s:\stapez le code\./)).toBeVisible()
  // Le code que le client voit est celui que le relais vérifie (un code par colis, v6 D12).
  const { codes } = (await (await request.get(`${API}/_essai/relais/codes/${commande}`)).json()) as { codes: { code: string }[] }
  expect(codes.map((x) => x.code)).toEqual([code])
  await taper(code)
  await expect(page.getByText('✓ Code correct')).toBeVisible()
  await page.locator('main input[type=file]').first().setInputFiles(PHOTO)
  const remis = page.getByRole('button', { name: 'Remis', exact: true })
  await expect(remis).toBeEnabled()
  await remis.click()
  await expect(page).toHaveURL(/pin-remise\?remise=/)
  await taper(monde.gerante.pin)
  await expect(page.getByText('Colis retiré')).toBeVisible()
  await expect.poll(async () => (await src<{ commande: { etat: string } }>('client', 'commandeClient', ref)).commande.etat, { timeout: 20_000 }).toBe('retiree')
  await src('client', 'confirmerRetrait', ref)
  expect(erreurs).toEqual([])
})

/** Code TOTP de la clé de démonstration de la console (apps/console/demo.py, CLE_DEMO), comme une application. */
function totp(cle = 'JBSWY3DPEHPK3PXPJBSWY3DP', t = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of cle) bits += alphabet.indexOf(c).toString(2).padStart(5, '0')
  const octets = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)))
  const compteur = Buffer.alloc(8)
  compteur.writeBigUInt64BE(BigInt(Math.floor(t / 1000 / 30)))
  const h = createHmac('sha1', octets).update(compteur).digest()
  const o = h[h.length - 1] & 0x0f
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}

test('7. vendeur : remis au client ; console (Direction) : la commande retirée, sa chronologie et la liste des commandes', async ({ browser, request }) => {
  await expect.poll(async () => (await src<{ etape: string }>('vendeur', 'remise.remise', ref)).etape, { timeout: 20_000 }).not.toBe('prete')
  const j = await src<{ action: string }[]>('vendeur', 'commandes.journal', ref)
  expect(j.length).toBeGreaterThan(2)
  // Console : connexion d'un agent de la Direction (mot de passe, second facteur), jetons posés dans l'appli.
  await request.post(`${API}/_essai/limites`)
  const e = await (await request.post(`${API}/console/auth/login`, { data: { identifiant: 'franck@belivay.com', motDePasse: MDP, appareil: 'multi-console' } })).json()
  expect(e.ok, JSON.stringify(e)).toBe(true)
  const c = await (await request.post(`${API}/console/auth/code`, { data: { etape: e.etape, code: totp(), appareil: 'multi-console' } })).json()
  expect(c.ok, JSON.stringify(c)).toBe(true)
  const page = await ouvrir(browser, 'admin', (x) =>
    x.addInitScript(
      ([j]) => {
        if (!sessionStorage.getItem('blv_multi')) {
          sessionStorage.setItem('blv_multi', '1')
          localStorage.setItem('blv_api_jetons', j)
        }
      },
      [JSON.stringify({ acces: c.jetons.access, rafraichissement: c.jetons.refresh })],
    ),
  )
  const fiche = await src<{ ref: string; etat: string; relais: string | null; vendeurs: string[]; chronologie: unknown[]; paquet: string | null } | null>('admin', 'commandes.commande', ref)
  expect(fiche).not.toBeNull()
  expect(fiche!.ref).toBe(ref)
  expect(fiche!.vendeurs.join(' ')).toContain(monde.vendeur.boutique)
  expect(fiche!.chronologie.length).toBeGreaterThan(2)
  expect(JSON.stringify(fiche)).toMatch(/retir/i)
  await page.goto(`${URL.admin}commandes`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/Impossible de charger/)).toHaveCount(0)
  expect(erreurs).toEqual([])
})
