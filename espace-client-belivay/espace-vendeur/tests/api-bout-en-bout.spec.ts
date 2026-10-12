// L'espace vendeur en mode API (VITE_SOURCE=api) contre le VRAI serveur : le projet d'essai du kit (backend-kit/_essai,
// Django + les applications du kit client et vendeur + l'imitation des routes existantes de relaya), lancé par
// pw-api.config.ts (serveur 8020, base essai-vendeur.sqlite3 ; site 5190).
//   npx playwright test -c pw-api.config.ts
// Chaque parcours passe par le code de l'espace vendeur (écrans, ou src/donnees/source.ts → src/api/domaines → client
// HTTP) et par les vraies routes du serveur. Le client passe par les VRAIES routes du kit client (panier, paiement,
// litige, remise au relais) ; ce que font le livreur, le relais, le prestataire de vérification, la console BelivaY,
// l'opérateur Mobile Money et l'horloge passe par les routes réservées à l'essai (/api/_essai/…).
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const API = `http://localhost:${process.env.PORT_API_VENDEUR || 8020}/api`
const MDP = 'Essai-BelivaY-2026' // backend-kit/apps/vendeur_core/demo.py et relaya_essai/charger_demo.py
const FRANCK = 'franck.penga@belivay.test' // propriétaire de « Tonton PG » (@Penga12)
const AICHA = 'aicha.n@belivay.test' // accès Préparation
const BERTRAND = 'bertrand.essomba@gmail.com' // client du jeu de démonstration du site

test.describe.configure({ mode: 'serial' })

const tour = Date.now().toString(36)
const numeroNeuf = (prefixe = '67') => `${prefixe}${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`

/** Appelle `domaine.methode` de la source de l'espace vendeur (le même module que les écrans) dans la page. */
async function src<T = unknown>(page: Page, cle: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    async ([c, a]) => {
      const [d, m] = (c as string).split('.')
      const mod = (await import(/* @vite-ignore */ '/vendeur/src/donnees/source.ts')) as { source: Record<string, Record<string, (...x: unknown[]) => Promise<unknown>>> }
      try {
        return { ok: true, v: await mod.source[d][m](...(a as unknown[])) }
      } catch (e) {
        return { ok: false, nom: (e as Error).name, code: (e as { code?: string }).code ?? null, message: (e as Error).message }
      }
    },
    [cle, args] as const,
  ).then((r) => {
    const x = r as { ok: boolean; v?: unknown; nom?: string; code?: string | null; message?: string }
    if (!x.ok) throw Object.assign(new Error(`${cle} : ${x.nom} ${x.code ?? ''} ${x.message}`), { nom: x.nom, code: x.code })
    return x.v as T
  })
}

/** Rejet attendu d'une méthode : le nom de l'erreur levée côté site. */
async function refus(page: Page, cle: string, ...args: unknown[]): Promise<string> {
  try {
    await src(page, cle, ...args)
  } catch (e) {
    return (e as { nom: string }).nom
  }
  throw new Error(`${cle} aurait dû être refusé`)
}

async function code(api: APIRequestContext, destination: string): Promise<string> {
  const r = await api.get(`${API}/_essai/codes`, { params: { destination } })
  expect(r.ok(), `code envoyé à ${destination}`).toBe(true)
  return (await r.json()).code as string
}

async function essai(api: APIRequestContext, chemin: string, data: object = {}) {
  const r = await api.post(`${API}/_essai/${chemin}`, { data })
  expect(r.ok(), `POST /_essai/${chemin} : ${r.status()} ${await r.text()}`).toBe(true)
  return r.json()
}

// Numéro du compte, où part le second facteur d'un appareil inconnu (CNX-01) : lu comme le vendeur lirait son SMS.
const NUMEROS: Record<string, string> = { '@Penga12': '677124217', [FRANCK]: '677124217', [AICHA]: '699410890' }

async function seConnecter(page: Page, identifiant: string, api?: APIRequestContext) {
  await src(page, 'session.deconnecter').catch(() => undefined)
  const r = await src<{ ok: boolean; raison?: string }>(page, 'session.connecter', identifiant, MDP, { seSouvenir: true })
  if (!r.ok && r.raison === 'deuxieme_facteur' && api) {
    const v = await src(page, 'session.validerDeuxiemeFacteur', await code(api, NUMEROS[identifiant]))
    expect(v, `second facteur de ${identifiant} : ${JSON.stringify(v)} ${JSON.stringify(r)}`).toMatchObject({ ok: true })
    return
  }
  expect(r, `connexion de ${identifiant}`).toMatchObject({ ok: true })
}

// ——— Le client, par les vraies routes du kit client ———

async function client(api: APIRequestContext, email = BERTRAND) {
  const r = await api.post(`${API}/auth/login/`, { data: { email, password: MDP } })
  expect(r.ok()).toBe(true)
  const h = { Authorization: `Bearer ${(await r.json()).access}` }
  const get = async (chemin: string) => (await api.get(`${API}${chemin}`, { headers: h })).json()
  const post = (chemin: string, data: object, cle?: string) => api.post(`${API}${chemin}`, { headers: { ...h, ...(cle ? { 'Idempotency-Key': cle } : {}) }, data })
  return {
    get,
    post,
    /** Commande d'un produit au relais, payée en Mobile Money (webhook d'essai) ; rend la référence « BLV-… ». */
    async commander(productId: string | number, qte = 1): Promise<string> {
      for (const l of ((await get('/cart')).lignes ?? []) as { id: string }[]) await api.delete(`${API}/cart/lines/${l.id}`, { headers: h })
      expect((await post('/cart/lines', { produit: String(productId), qte })).ok()).toBe(true)
      const corps = { mode: 'relais', moyen: 'mtn', comptoir: false, numero: null, livraison: 0, frais: 0 }
      let c = await post('/checkout', corps, `vendeur-${tour}-${productId}-${Math.random()}`)
      if (c.status() === 409) c = await post('/checkout', { ...corps, livraison: (await c.json()).error.data.livraison }, `vendeur-${tour}-${productId}-${Math.random()}`)
      expect(c.ok(), await c.text()).toBe(true)
      const ref = (await c.json()).ref as string
      expect((await essai(api, 'paiements/confirmer', { commande: ref })).domaine).toBe('commande')
      return ref
    },
    /** Le relais remet le colis au client avec son code de retrait (lu par le client dans sa commande). */
    async retirer(ref: string) {
      await essai(api, `commandes/${ref}/avancer`, { jusqua: 'arrivee' })
      const o = await get(`/orders/${ref.replace('BLV-', '')}/`)
      expect(o.espace_client?.code, 'code de retrait du client').toMatch(/^\d{6}$/)
      expect((await essai(api, `commandes/${ref}/remettre`, { code: o.espace_client.code })).ok).toBe(true)
    },
  }
}

/** Une photo JPEG dessinée dans la page (data: URL), de la taille demandée. */
async function photo(page: Page, cote = 1200): Promise<string> {
  return page.evaluate((n) => {
    const c = document.createElement('canvas')
    c.width = c.height = n
    const g = c.getContext('2d')!
    g.fillStyle = '#e8eef4'
    g.fillRect(0, 0, n, n)
    g.fillStyle = '#25303b'
    g.fillRect(n * 0.3, n * 0.15, n * 0.4, n * 0.7)
    return c.toDataURL('image/jpeg', 0.8)
  }, cote)
}

/** Un changement de numéro d'un passage précédent (le serveur garde ses données) : sa revue se termine d'abord
 * (l'horloge de l'espace vendeur avance), sinon les versements attendraient. */
async function finirRevue(request: APIRequestContext) {
  let n = await src<{ actuel: { masque: string }; telephonePersonnel: string; revueJours: number; enRevue: { jusqua: number } | null }>(page, 'versements.numero')
  if (n.enRevue) {
    const t = (await (await request.get(`${API}/_essai/horloge`)).json()).maintenant as number
    await essai(request, 'horloge', { heures: (n.enRevue.jusqua - t) / 3600_000 + 1 })
    n = await src(page, 'versements.numero')
    expect(n.enRevue).toBeNull()
  }
  return n
}

let page: Page
test.beforeAll(async ({ browser, request }) => {
  page = await browser.newPage()
  // Un même appareil d'un passage à l'autre (le serveur garde ses données) : reconnu, il n'a pas de second facteur.
  await page.addInitScript(() => localStorage.setItem('blv_v_appareil', 'appareil-bout-en-bout'))
  await request.post(`${API}/_essai/limites`)
  await page.goto('connexion')
})
test.afterAll(async () => {
  await page.close()
})

test('l’espace vendeur tourne sur le serveur : connexion de la boutique de démonstration, session et accueil', async ({ request }) => {
  // Mauvais mot de passe : refus propre, jamais d'erreur technique (VD03-R03).
  const faux = await src<{ ok: boolean; raison: string; essaisRestants: number }>(page, 'session.connecter', '@Penga12', 'pas-le-bon-1', {})
  expect(faux).toMatchObject({ ok: false, raison: 'identifiants' })
  await seConnecter(page, '@Penga12', request)
  const s = await src<{ connecte: boolean; membre: { role: string }; boutique: { nom: string; palier: string; trustScore: number } }>(page, 'session.session')
  expect(s.connecte).toBe(true)
  expect(s.membre.role).toBe('proprietaire')
  expect(s.boutique).toMatchObject({ nom: 'Tonton PG', palier: 'Bronze', trustScore: 62.7 })
  const a = await src<{ aFaire: { type: string; ref: string }[]; compteurs: { total: number } }>(page, 'accueil.aujourdhui')
  expect(a.compteurs.total).toBeGreaterThan(0)
  expect(a.aFaire.some((x) => x.type === 'preparer')).toBe(true)
  await page.goto('/vendeur/')
  await expect(page.getByText(a.aFaire[0].ref.replace('BLV-', '')).first()).toBeVisible()
})

test('ouverture d’une boutique et KYC : code SMS, pièces, numéro de versement, vérification, contrat signé', async ({ request }) => {
  await src(page, 'session.deconnecter')
  const tel = numeroNeuf('67')
  const zone = await src<{ code: string } | null>(page, 'session.zoneDuPoint', { lat: 3.896, lon: 11.509 })
  expect(zone?.code).toBeTruthy()
  const cats = await src<string[]>(page, 'session.categories')
  const d = await src<{ ok: boolean }>(page, 'session.demarrerOuverture', {
    nom: `Essai ${tour}`,
    categorie: cats[0],
    statut: 'particulier',
    telephone: tel,
    point: { lat: 3.896, lon: 11.509, precision: 12 },
  })
  expect(d).toMatchObject({ ok: true })
  expect(await src(page, 'session.validerCodeOuverture', '000000')).toMatchObject({ ok: false, raison: 'code' })
  expect(await src(page, 'session.validerCodeOuverture', await code(request, tel))).toMatchObject({ ok: true })
  const img = await photo(page, 900)
  for (const piece of ['recto', 'verso', 'selfie']) expect(await src(page, 'session.envoyerPiece', piece, img)).toMatchObject({ ok: true })
  const versement = numeroNeuf('69')
  expect(await src(page, 'session.demanderCodeVersement', versement)).toMatchObject({ ok: true })
  expect(await src(page, 'session.validerCodeVersement', await code(request, versement))).toMatchObject({ ok: true })
  const envoye = await src<{ ok: boolean; dossier: { ref: string; etape: string; reponseAvant: number } }>(page, 'session.envoyerPourVerification')
  expect(envoye.ok).toBe(true)
  expect(envoye.dossier.etape).toBe('attente')
  expect(envoye.dossier.reponseAvant).toBeGreaterThan(Date.now() - 3600_000)
  // Le prestataire de vérification répond (accord) : la boutique est créée.
  await essai(request, `vendeur/kyc/${envoye.dossier.ref}`, { accord: true })
  const dossier = await src<{ etape: string; contrat: { gardeMinPourCent: string; exemple: { prix: number; garde: number } } }>(page, 'session.ouverture')
  expect(dossier.etape).toBe('contrat')
  // Le contrat lit les paramètres en vigueur : l'exemple « Vous gardez » vient du moteur de commission.
  expect(dossier.contrat.exemple.garde).toBeLessThan(dossier.contrat.exemple.prix)
  const signe = await src<{ ok: boolean; dossier: { etape: string } }>(page, 'session.signerContrat', { immatricule: false })
  expect(signe).toMatchObject({ ok: true, dossier: { etape: 'signee' } })
  const s = await src<{ connecte: boolean; boutique: { nom: string; palier: string } | null; membre: { role: string } }>(page, 'session.session')
  expect(s.boutique?.nom).toBe(`Essai ${tour}`)
  expect(s.membre.role).toBe('proprietaire')
})

let offreId = ''
let productId = ''
test('publication d’une offre : brouillon, photos réelles, « Vous gardez » du moteur, publication, modération', async ({ request }) => {
  await seConnecter(page, FRANCK, request)
  const r = await src<{ exacts: { id: string; titre: string; variantes: string[]; dejaVendues: string[] }[] }>(page, 'offres.rechercher', 'itel')
  const fiche = r.exacts.find((f) => f.titre === 'ITEL AC52')!
  expect(fiche.dejaVendues).toContain('noir')
  const variante = fiche.variantes.find((v) => !fiche.dejaVendues.includes(v)) ?? `essai-${tour}`
  const c = await src<{ ok: boolean; brouillonId: string }>(page, 'offres.commencer', fiche.id, variante)
  expect(c.ok).toBe(true)
  offreId = c.brouillonId
  expect(await src(page, 'offres.modifier', offreId, { prix: 20000, stock: 4, etatArticle: 'Neuf', paiementAuRetrait: true })).toMatchObject({ ok: true })
  const reglages = await src<{ photosMin: number; photoMinPx: number }>(page, 'offres.reglages')
  const img = await photo(page, Math.max(1200, reglages.photoMinPx))
  for (let i = 0; i < reglages.photosMin; i++) {
    const p = await src<{ ok: boolean }>(page, 'offres.ajouterPhoto', offreId, { image: img, prise: Date.now(), largeur: 1200, hauteur: 1200, octetsAvant: 6_300_000, octetsApres: 540_000, position: null })
    expect(p.ok).toBe(true)
  }
  // « Vous gardez » : calculé par le serveur (moteur), le même que l'écran affiche ; sous le prix minimum : refus.
  const ap = await src<{ garde: number; refus: string | null; minimum: number }>(page, 'offres.apercu', offreId, 20000)
  expect(ap.refus).toBeNull()
  expect(ap.garde).toBeGreaterThan(0)
  expect(ap.garde).toBeLessThan(20000)
  expect((await src<{ refus: string | null }>(page, 'offres.apercu', offreId, Math.max(1, ap.minimum - 1))).refus).toBe('minimum')
  const pub = await src<{ ok: boolean; reponseAvant: number }>(page, 'offres.publier', offreId, { rester: false, horsLigne: false })
  expect(pub.ok).toBe(true)
  expect((await src<{ etat: string }>(page, 'produits.detail', offreId)).etat).toBe('en_verification')
  // La console de BelivaY vérifie l'offre : elle passe en vente et devient un produit que le client peut commander.
  const m = await essai(request, `vendeur/offres/${offreId}/moderer`, { accord: true })
  productId = String(m.productId)
  expect((await src<{ etat: string; garde: number }>(page, 'produits.detail', offreId)).etat).toBe('en_vente')
  await page.goto(`offre_detail?p=${offreId}`)
  await expect(page.getByText('ITEL AC52').first()).toBeVisible()
})

let ref = ''
test('commande passée par le client (routes du kit client), reçue chez le vendeur, « C’est prêt », remise avec le code saisi par le livreur', async ({ request }) => {
  const cl = await client(request)
  ref = await cl.commander(productId)
  // La commande entre chez le vendeur, payée, montant gardé figé ; aucune donnée du client (anonymat).
  const vue = await src<{ items: { ref: string; statut: string; garde: number; lignes: { article: { offreId: string } }[] }[]; compteurs: { prep: number } }>(page, 'commandes.vue', 'prep')
  const c = vue.items.find((x) => x.ref === ref)!
  expect(c, `commande ${ref} chez le vendeur`).toBeTruthy()
  expect(c.lignes[0].article.offreId).toBe(offreId)
  expect(c.garde).toBeGreaterThan(0)
  expect(JSON.stringify(c)).not.toMatch(/Bertrand|Essomba|Essos|699245318/)
  // Confirmation : le bon de préparation (quatre vérifications), coché, puis « C'est prêt ».
  const bon = await src<{ aVerifier: { cle: string }[] }>(page, 'preparation.bon', ref)
  expect(bon.aVerifier.map((v) => v.cle)).toEqual(['modele', 'etat', 'accessoires', 'boite'])
  await src(page, 'preparation.ouvrirBon', ref)
  for (let i = 0; i < 4; i++) await src(page, 'preparation.cocher', ref, i, true)
  expect(await src(page, 'preparation.cestPret', ref)).toMatchObject({ ok: true })
  expect(await src(page, 'preparation.cestPret', ref)).toMatchObject({ ok: false, raison: 'deja_prete' })
  // Le colis du client est « prêt » de son côté.
  // Remise : le code n'est jamais dans la lecture ; il s'affiche au toucher (journalisé), le livreur le saisit.
  const remise = await src<Record<string, unknown>>(page, 'remise.remise', ref)
  expect(remise).not.toHaveProperty('code')
  expect(remise.etape).toBe('prete')
  const { code: codeRemise } = await src<{ ok: boolean; code: string }>(page, 'remise.afficherCode', ref)
  expect(codeRemise).toMatch(/^\d{6}$/)
  const faux = await essai(request, `vendeur/commandes/${ref}/livreur`, { code: codeRemise === '000000' ? '111111' : '000000' })
  expect(faux).toMatchObject({ ok: false, essaisRestants: 2 })
  expect(await essai(request, `vendeur/commandes/${ref}/livreur`, { code: codeRemise })).toMatchObject({ ok: true })
  expect((await src<{ etape: string; photos: unknown[] }>(page, 'remise.remise', ref)).etape).toBe('remise')
  const j = await src<{ action: string }[]>(page, 'commandes.journal', ref)
  expect(j.length).toBeGreaterThan(2)
  await page.goto(`commande?ref=${ref}`)
  await expect(page.getByText(ref).first()).toBeVisible()
})

let refLitige = ''
test('litige ouvert par le client, réponse du vendeur avec preuve, décision de la médiation', async ({ request }) => {
  const cl = await client(request)
  refLitige = await cl.commander(productId)
  await src(page, 'commandes.vue', 'prep')
  await src(page, 'preparation.cestPret', refLitige)
  const { code: cr } = await src<{ code: string }>(page, 'remise.afficherCode', refLitige)
  await essai(request, `vendeur/commandes/${refLitige}/livreur`, { code: cr })
  await cl.retirer(refLitige)
  // Le client ouvre un litige (route du kit client).
  const o = await cl.post('/disputes', { ref: refLitige, colis: 1, pb: 'abime', description: 'Le boîtier est fendu sur le côté.', souhait: 'rembourse', photos: [] }, `litige-${tour}`)
  expect(o.ok(), await o.text()).toBe(true)
  const l = await src<{ etat: string; ceQueDitLeClient: string; gele: number; preuves: unknown[] }>(page, 'litiges.detail', refLitige)
  expect(l.etat).toBe('a_repondre')
  expect(l.ceQueDitLeClient).toContain('fendu')
  expect(l.gele).toBeGreaterThan(0)
  expect(JSON.stringify(l)).not.toMatch(/Bertrand|Essomba|Essos/)
  expect(await src(page, 'litiges.ajouterPreuve', refLitige, await photo(page, 800))).toMatchObject({ ok: true })
  expect(await src(page, 'litiges.repondre', refLitige, 'arrangement', 'Trop court', 'remise')).toMatchObject({ ok: false, raison: 'trop_court' })
  const rep = await src<{ ok: boolean }>(page, 'litiges.repondre', refLitige, 'conteste', 'L’article est parti intact : photos du scellé et du ramassage au dossier, colis remis fermé au livreur.', null)
  expect(rep.ok).toBe(true)
  expect((await src<{ etat: string }>(page, 'litiges.detail', refLitige)).etat).toBe('en_mediation')
  // La médiation décide (motif écrit) : le vendeur gagne.
  await essai(request, `vendeur/litiges/${refLitige}/decider`, { issue: 'gagne', motif: 'Photos du scellé probantes, colis remis intact.' })
  const d = await src<{ etat: string; issue: string; decision: { motif: string } }>(page, 'litiges.detail', refLitige)
  expect(d.issue).toBe('gagne')
  expect(d.decision.motif).toContain('scellé')
  await page.goto(`litige?ref=${refLitige}`)
  await expect(page.getByText(refLitige).first()).toBeVisible()
})

test('retour : accepté par BelivaY, déposé et rapporté par le livreur, inspection du vendeur, remboursement', async ({ request }) => {
  const cl = await client(request)
  const r = await cl.commander(productId)
  await src(page, 'commandes.vue', 'prep')
  await src(page, 'preparation.cestPret', r)
  const { code: cr } = await src<{ code: string }>(page, 'remise.afficherCode', r)
  await essai(request, `vendeur/commandes/${r}/livreur`, { code: cr })
  await cl.retirer(r)
  const o = await cl.post('/disputes', { ref: r, colis: 1, pb: 'autre', description: 'L’écran reste noir après une journée.', souhait: 'rembourse', photos: [] }, `retour-${tour}`)
  expect(o.ok(), await o.text()).toBe(true)
  await essai(request, `vendeur/litiges/${r}/retour`, { categorie: 'defaut_cache' })
  await essai(request, `vendeur/retours/${r}/avancer`, { evenement: 'return.deposited' })
  await essai(request, `vendeur/retours/${r}/avancer`, { evenement: 'return.collected' })
  expect((await src<{ etat: string }>(page, 'retours.detail', r)).etat).toBe('en_route')
  const recu = await src<{ ok: boolean; inspecterAvant: number }>(page, 'retours.recevoir', r)
  expect(recu.ok).toBe(true)
  expect(await src(page, 'retours.inspecter', r, 'conforme', { scelle: true, serie: true })).toMatchObject({ ok: false, raison: 'photos' })
  for (let i = 0; i < 2; i++) expect(await src(page, 'retours.ajouterPhoto', r, await photo(page, 800))).toMatchObject({ ok: true })
  expect(await src(page, 'retours.inspecter', r, 'conforme', { scelle: true, serie: true })).toMatchObject({ ok: true })
  expect((await src<{ suite: { type: string } }>(page, 'retours.detail', r)).suite.type).toBe('a_choisir')
  expect(await src(page, 'retours.proposer', r, 'rembourser')).toMatchObject({ ok: true })
  const fin = await src<{ etat: string; suite: { type: string } }>(page, 'retours.detail', r)
  expect(fin.suite.type).toBe('rembourse')
  await page.goto('retours')
  await page.getByRole('tab', { name: /Clos/ }).click()
  await expect(page.getByText(r).first()).toBeVisible()
})

test('rôle Préparation : prépare et remet, ne voit aucun montant et n’accède pas à l’argent (403 owner_only)', async ({ request }) => {
  await seConnecter(page, AICHA, request)
  expect((await src<{ membre: { role: string } }>(page, 'session.session')).membre.role).toBe('preparation')
  const vue = await src<{ items: { garde: number | null; argent: unknown; lignes: { prixUnitaire: number | null }[] }[] }>(page, 'commandes.vue', 'fin')
  expect(vue.items.length).toBeGreaterThan(0)
  for (const c of vue.items) {
    expect(c.garde).toBeNull()
    expect(c.argent).toBeNull()
    expect(c.lignes.every((l) => l.prixUnitaire === null)).toBe(true)
  }
  // Elle prépare et remet : « C'est prêt » et le code de remise, sans aucun montant.
  const aPreparer = await (await client(request)).commander(productId)
  const prep = await src<{ items: { ref: string; garde: number | null }[] }>(page, 'commandes.vue', 'prep')
  expect(prep.items.find((x) => x.ref === aPreparer)?.garde).toBeNull()
  expect(await src(page, 'preparation.cestPret', aPreparer)).toMatchObject({ ok: true })
  expect((await src<{ code: string }>(page, 'remise.afficherCode', aPreparer)).code).toMatch(/^\d{6}$/)
  expect((await src<{ valeurColis: number | null; garde: number | null }>(page, 'remise.remise', aPreparer)).garde).toBeNull()
  for (const cle of ['argent.resume', 'argent.seLibere', 'argent.gele', 'versements.prochain', 'versements.numero', 'plans.etat', 'equipe.membres', 'remise.recus'])
    expect(await refus(page, cle), cle).toBe('ReserveAuProprietaire')
  await page.goto('argent')
  await expect(page.getByText(/propriétaire/i).first()).toBeVisible()
  await seConnecter(page, FRANCK, request)
})

test('libération et versement du vendredi : retrait, fenêtre de retour, libération, arrêté du jeudi, crédité (horloge d’essai)', async ({ request }) => {
  await finirRevue(request)
  const cl = await client(request)
  await cl.retirer(ref)
  const avant = await src<{ mouvements: { ref: string; etat: string; liberation: number | null }[]; enCirculation: number; aVerser: number; seLibere: number; enCours: number; gele: number }>(page, 'argent.resume')
  expect(avant.enCirculation).toBe(avant.aVerser + avant.seLibere + avant.enCours + avant.gele)
  const m = avant.mouvements.find((x) => x.ref === ref)!
  expect(m.etat).toBe('se_libere')
  const garde = (await src<{ garde: number }>(page, 'commandes.detail', ref)).garde
  // Fenêtre de retour (7 jours) puis libération (Bronze : 3 jours) : l'horloge de l'espace vendeur avance.
  const heures = (m.liberation! - (await (await request.get(`${API}/_essai/horloge`)).json()).maintenant) / 3600_000 + 1
  await essai(request, 'horloge', { heures })
  expect((await src<{ mouvements: { ref: string; etat: string; vendredi: string }[] }>(page, 'argent.resume')).mouvements.find((x) => x.ref === ref)!.etat).toBe('a_verser')
  const prochain = await src<{ vendredi: string; montant: number; reference: string; heureLimite: number }>(page, 'versements.prochain')
  expect(prochain.montant).toBeGreaterThanOrEqual(garde)
  // Après l'heure limite du vendredi : l'arrêté du jeudi est passé, le versement est envoyé puis crédité.
  const maintenant = (await (await request.get(`${API}/_essai/horloge`)).json()).maintenant
  await essai(request, 'horloge', { heures: (prochain.heureLimite - maintenant) / 3600_000 + 1 })
  await essai(request, 'vendeur/versements/executer')
  const h = await src<{ versements: { reference: string; statut: string; commandes: { ref: string }[]; montant: number }[] }>(page, 'versements.historique', 'tout')
  const v = h.versements.find((x) => x.commandes.some((c) => c.ref === ref))!
  expect(v, `versement du vendredi : ${JSON.stringify(prochain)} ${JSON.stringify(h.versements.slice(0, 3))}`).toBeTruthy()
  expect(v.reference).toMatch(/^BLV-VS-\d{4,}$/)
  expect(v.statut).toBe('credite')
  expect((await src<{ argent: { etat: string; versement: string } }>(page, 'commandes.detail', ref)).argent).toMatchObject({ etat: 'verse', versement: v.reference })
  await page.goto('versements')
  await expect(page.getByText(v.reference).first()).toBeVisible()
})

test('changement de numéro de versement : deux codes SMS, puis 7 jours de revue', async ({ request }) => {
  const n = await finirRevue(request)
  const nouveau = numeroNeuf('67')
  expect(await src(page, 'versements.demanderCodes', 'MTN', '6')).toMatchObject({ ok: false })
  const d = await src<{ ok: boolean }>(page, 'versements.demanderCodes', 'MTN', nouveau)
  expect(d, JSON.stringify(d)).toMatchObject({ ok: true })
  const codeNouveau = await code(request, nouveau)
  const codePerso = await code(request, '677124217') // téléphone personnel du propriétaire (second facteur, NUM-07)
  expect((await src<{ ok: boolean; raison?: string }>(page, 'versements.confirmerNumero', codeNouveau === '000000' ? '111111' : '000000', codePerso)).ok).toBe(false)
  const c = await src<{ ok: boolean; revueJusqua: number; premierVersement: string }>(page, 'versements.confirmerNumero', codeNouveau, codePerso)
  expect(c.ok).toBe(true)
  const apres = await src<{ enRevue: { masque: string; jusqua: number } | null }>(page, 'versements.numero')
  expect(apres.enRevue?.masque).toContain(nouveau.slice(-4))
  const serveur = (await (await request.get(`${API}/_essai/horloge`)).json()).maintenant as number
  expect(apres.enRevue!.jusqua - serveur).toBeGreaterThan((n.revueJours - 1) * 86400_000)
})
