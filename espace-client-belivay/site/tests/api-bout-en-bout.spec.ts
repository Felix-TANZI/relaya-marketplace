// Le site en mode API (VITE_SOURCE=api) contre le VRAI serveur : le projet d'essai du kit (backend-kit/_essai,
// Django + toutes les applications du kit + l'imitation des routes existantes de relaya), lancé par pw-api.config.ts.
//   npx playwright test -c pw-api.config.ts
// Chaque parcours passe par le code du site (écrans, ou src/donnees/source.ts → domaines → client HTTP) et par les
// vraies routes du serveur ; ce que font les prestataires (SMS, webhook Mobile Money, banque 3-D Secure) et les
// applications des livreurs et des relais passe par les routes réservées à l'essai (/api/_essai/…).
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const API = `http://localhost:${process.env.PORT_API || 8010}/api`
const MDP_DEMO = 'Essai-BelivaY-2026' // backend-kit/_essai/relaya_essai/management/commands/charger_demo.py
const CARINE = 'carine@gmail.com'
const BERTRAND = 'bertrand.essomba@gmail.com'
const HERVE = 'herve.mbarga@gmail.com'

test.describe.configure({ mode: 'serial' })

// Identifiants propres à ce passage (le serveur garde ses données d'un passage à l'autre).
const tour = Date.now().toString(36)
const numeroNeuf = () => `67${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`

/** Appelle une méthode de la source du site (le même module que les écrans) dans la page. */
async function src<T = unknown>(page: Page, methode: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    async ([m, a]) => {
      const mod = (await import(/* @vite-ignore */ '/src/donnees/source.ts')) as { source: Record<string, (...x: unknown[]) => Promise<unknown>> }
      return (await mod.source[m as string](...(a as unknown[]))) as never
    },
    [methode, args] as const,
  ) as Promise<T>
}

async function code(api: APIRequestContext, destination: string): Promise<string> {
  const r = await api.get(`${API}/_essai/codes`, { params: { destination } })
  expect(r.ok(), `code envoyé à ${destination}`).toBe(true)
  return (await r.json()).code as string
}

async function seConnecter(page: Page, email: string, mdp = MDP_DEMO) {
  await src(page, 'deconnecter').catch(() => undefined)
  const r = await src<{ ok: boolean }>(page, 'connecterEmail', email, mdp, true)
  expect(r.ok, `connexion de ${email}`).toBe(true)
}

/** Attend que l'interface écoute les erreurs communes (AvisErreurs monté) : une promesse rejetée « réseau » affiche
 * son message. */
async function interfacePrete(page: Page) {
  await expect(async () => {
    await page.evaluate(() => void Promise.reject({ genre: 'reseau' }))
    await expect(page.locator('.cl05-toast')).toHaveText(/Pas de connexion/, { timeout: 500 })
  }).toPass({ timeout: 15_000 })
}

let page: Page
test.beforeAll(async ({ browser, request }) => {
  page = await browser.newPage()
  await request.post(`${API}/_essai/limites`)
  await page.goto('/')
})
test.afterAll(async () => {
  await page.close()
})

test('le site tourne sur le serveur (source « api »), contenus de l’accueil servis par le kit', async ({ request }) => {
  const nom = await page.evaluate(async () => ((await import(/* @vite-ignore */ '/src/donnees/source.ts')) as { source: { nom: string } }).source.nom)
  expect(nom).toBe('api')
  const serveur = await (await request.get(`${API}/content/home`)).json()
  const c = await src<{ carrousel: { titre: string }[]; categories: unknown[] }>(page, 'contenuAccueil')
  expect(c.carrousel.map((b) => b.titre)).toEqual(serveur.carrousel.map((b: { titre: string }) => b.titre))
  await expect(page.getByText(serveur.carrousel[0].titre).first()).toBeVisible()
})

const NADEGE = { email: `nadege.${tour}@exemple.cm`, mdp: 'Plantain-Mur-2026', numero: numeroNeuf() }
test('inscription à l’écran (relaya : /auth/register/), puis premier numéro vérifié par le code SMS (kit : otp)', async ({ request }) => {
  const email = NADEGE.email
  await src(page, 'deconnecter')
  await page.goto('/connexion-email?st=inscription')
  await page.locator('#cx-prenom').fill('Nadège')
  await page.locator('#cx-email').fill(email)
  await page.getByRole('button', { name: /Mot de passe proposé/ }).click()
  await page.locator('#cx-mdp').fill(NADEGE.mdp)
  await page.locator('.btn.primary', { hasText: 'Créer mon compte' }).click()
  await expect.poll(() => src<{ connecte: boolean; client: { email: string } | null }>(page, 'session').then((s) => s.connecte && s.client?.email)).toBe(email)

  // Premier numéro : le code part par SMS (prestataire console du kit), lu ici comme le client le lirait.
  const numero = NADEGE.numero
  const envoi = await src<{ destination: string; valideMinutes: number }>(page, 'envoyerCode', 'numero-nouveau', numero)
  expect(envoi.valideMinutes).toBeGreaterThan(0)
  const faux = await src<{ ok: boolean; essaisRestants?: number }>(page, 'verifierPremierNumero', numero, '000000')
  expect(faux.ok).toBe(false)
  const r = await src<{ ok: boolean; client?: { numeroMasque: string } }>(page, 'verifierPremierNumero', numero, await code(request, numero))
  expect(r.ok).toBe(true)
  const s = await src<{ client: { numeroMasque: string; prenom: string } }>(page, 'session')
  expect(s.client.prenom).toBe('Nadège')
  expect(s.client.numeroMasque.replace(/\D/g, '').slice(-2)).toBe(numero.slice(-2))
  expect((await src<{ numeroVerifie: boolean }>(page, 'compte')).numeroVerifie).toBe(true)
})

test('connexion à l’écran avec le compte de Carine (jetons simplejwt), session et relais habituel', async () => {
  await src(page, 'deconnecter')
  await page.goto('/connexion-email')
  await page.locator('#cx-email').fill(CARINE)
  const mdp = page.getByRole('button', { name: /Mot de passe enregistré|Mot de passe proposé/ })
  if (await mdp.count()) await mdp.click()
  await page.locator('#cx-mdp').fill(MDP_DEMO)
  await page.locator('.btn.primary', { hasText: 'Se connecter' }).click()
  await expect.poll(() => src<{ connecte: boolean }>(page, 'session').then((s) => s.connecte)).toBe(true)
  const s = await src<{ client: { prenom: string }; relais: { nom: string } | null }>(page, 'session')
  expect(s.client.prenom).toBe('Carine')
  expect(s.relais?.nom).toBe('Relais Mvog-Ada')
  // Mauvais mot de passe : refus propre, pas d'erreur.
  expect(await src(page, 'connecterEmail', CARINE, 'pas-le-bon-1', false)).toMatchObject({ ok: false, raison: 'incorrect' })
  await seConnecter(page, CARINE)
})

let produit = ''
test('catalogue, recherche et fiche : les produits du serveur (relaya : /catalog/products/)', async () => {
  const produits = await src<{ p: string; titre: string; prix: number; stock: number }[]>(page, 'produits')
  expect(produits.length).toBe(30)
  const camon = produits.find((x) => x.titre === 'Tecno Camon 30')!
  expect(camon.prix).toBe(150699)
  const robe = produits.find((x) => /robe/i.test(x.titre)) ?? produits.find((x) => x.prix < 30000 && x.stock > 3)!
  produit = robe.p
  const fiche = await src<{ titre: string; description: string; prixBarre: number | null }>(page, 'produit', camon.p)
  expect(fiche.titre).toBe('Tecno Camon 30')
  expect(fiche.prixBarre).toBe(168000)
  expect(await src(page, 'produit', '999999')).toBeNull()
  // Écran de la fiche, données du serveur.
  await page.goto(`/fiche?p=${camon.p}`)
  await expect(page.getByText('Tecno Camon 30').first()).toBeVisible()
  // Recherche : l'écran de résultats filtre le catalogue servi.
  await page.goto(`/recherche-resultats?q=${encodeURIComponent('Camon')}`)
  await expect(page.getByText('Tecno Camon 30').first()).toBeVisible()
})

let ref = ''
test('panier, paiement Mobile Money (webhook d’essai), commande, code de retrait, remise au relais', async ({ request }) => {
  await seConnecter(page, BERTRAND)
  // Panier vidé des passages précédents, puis un article.
  for (const l of (await src<{ lignes: { id: string }[] }>(page, 'panier')).lignes) await src(page, 'retirerLigne', l.id).catch(() => undefined)
  await src(page, 'ajouterProduit', produit, {}, 1)
  const panier = await src<{ lignes: { p: string; titre: string }[]; relais: string }>(page, 'panier')
  expect(panier.lignes.map((l) => l.p)).toEqual([produit])
  expect(panier.relais).toBe('Relais Essos')
  await page.goto('/panier')
  await expect(page.getByText(panier.lignes[0].titre).first()).toBeVisible()

  // Frais calculés par le site comme l'écran de paiement (src/donnees/frais.ts) : le serveur recalcule avec les moteurs
  // et refuserait un écart (409 price_changed) ; les deux doivent tomber juste.
  const f = await page.evaluate(async () => {
    const { source } = (await import(/* @vite-ignore */ '/src/donnees/source.ts')) as typeof import('../src/donnees/source')
    const { calculer } = (await import(/* @vite-ignore */ '/src/donnees/frais.ts')) as typeof import('../src/donnees/frais')
    const p = await source.panier()
    const bs = [...new Set(p.lignes.map((l) => l.boutique))]
    const r = calculer(p.mode, bs.map((b) => ({ boutique: b, zone: p.boutiques[b]?.zone ?? 'Mvog-Ada', articles: p.lignes.filter((l) => l.boutique === b).map((l) => ({ prix: l.prix, quantite: l.qte, classe: l.classe })) })))
    return { livraison: r.total - r.sousTotal, total: r.total }
  })
  const livraison = f.livraison
  // Paiement : la demande part au téléphone (Mobile Money console), la commande attend la validation.
  const c = await src<{ ref: string; etat: string; montant: number }>(page, 'passerCommande', { mode: 'relais', moyen: 'mtn', comptoir: false, numero: null, livraison, frais: 0 })
  ref = c.ref
  expect(c.etat).toBe('attente')
  expect(c.montant).toBe(f.total)
  expect((await src<{ ref: string }[]>(page, 'paiementsEnAttente')).map((x) => x.ref)).toContain(ref)
  await page.goto(`/paiement-attente?ref=${ref}`)
  await expect(page.getByText(ref.replace('BLV-', '')).first()).toBeVisible()
  // Le client valide sur son téléphone : webhook de l'agrégateur → kit (client_core.webhooks).
  const w = await request.post(`${API}/_essai/paiements/confirmer`, { data: { commande: ref } })
  expect((await w.json()).domaine).toBe('commande')
  expect((await src<{ etat: string }>(page, 'confirmerPaiement', ref)).etat).toBe('payee')

  // Commande vue par le client (relaya /orders/ + espace_client du kit) : en préparation, pas encore de code.
  const liste = await src<{ commandes: { ref: string; etat: string }[] }>(page, 'commandes')
  expect(liste.commandes.find((x) => x.ref === ref)?.etat).toBe('preparation')
  // Vendeur, livreur, relais : le colis arrive (accusé fort) ; le code de retrait apparaît, la notification part.
  await request.post(`${API}/_essai/commandes/${ref}/avancer`, { data: { jusqua: 'arrivee' } })
  const vue = (await src<{ commande: { etat: string; code: string | null; colis: { boutique: string }[] } }>(page, 'commandeClient', ref)).commande
  expect(vue.etat).toBe('retirable')
  expect(vue.code).toMatch(/^\d{6}$/)
  expect(vue.colis[0].boutique).toBeTruthy()
  const notifs = await src<{ notifications: { id: string; titre: string; texte: string; lu: boolean }[] }>(page, 'notificationsClient')
  const arrivee = notifs.notifications.find((n) => n.titre === 'Ton colis est arrivé' && n.texte.includes(ref))!
  expect(arrivee).toBeTruthy()
  expect(arrivee.texte).not.toContain(vue.code!) // CAP-19 : jamais le code dans une notification
  await page.goto(`/commande?ref=${ref}`)
  await expect(page.getByText(ref).first()).toBeVisible()

  // Au comptoir : un code faux est refusé, le bon remet le colis ; « Tout est en ordre ».
  expect((await (await request.post(`${API}/_essai/commandes/${ref}/remettre`, { data: { code: vue.code === '000000' ? '111111' : '000000' } })).json()).ok).toBe(false)
  expect((await (await request.post(`${API}/_essai/commandes/${ref}/remettre`, { data: { code: vue.code } })).json()).ok).toBe(true)
  expect((await src<{ commande: { etat: string } }>(page, 'commandeClient', ref)).commande.etat).toBe('retiree')
  await src(page, 'confirmerRetrait', ref)

  // Notifications : lire une notification (relaya /auth/notifications/{id}/read/).
  await src(page, 'lireNotification', arrivee.id)
  expect((await src<{ notifications: { id: string; lu: boolean }[] }>(page, 'notificationsClient')).notifications.find((n) => n.id === arrivee.id)?.lu).toBe(true)
})

test('litige et avis sur la commande retirée (kit : aftersales), messagerie et aide', async () => {
  const l = await src<{ id: string; ref: string; etat: string }>(page, 'ouvrirLitige', { ref, colis: 1, pb: 'abime', description: 'Le boîtier est fendu sur le côté.', souhait: 'rembourse', photos: [] })
  expect(l.ref).toBe(ref)
  expect((await src<{ litiges: { id: string }[] }>(page, 'litiges')).litiges.map((x) => x.id)).toContain(l.id)
  expect((await src<{ litige: { id: string } } | null>(page, 'litige', l.id))?.litige.id).toBe(l.id)
  // Un seul dossier par colis : le serveur répond 409 deja, le site rouvre le dossier existant.
  expect((await src<{ id: string }>(page, 'ouvrirLitige', { ref, colis: 1, pb: 'abime', description: 'Encore', souhait: 'rembourse', photos: [] })).id).toBe(l.id)

  // Avis sur la commande retirée : une note par colis, puis le relais (fenêtre AVIS-FENETRE).
  const aNoter = await src<{ commande: { ref: string; relais: string }; fenetreJours: number }>(page, 'avis', ref)
  expect(aNoter.commande.ref).toBe(ref)
  const colis = (await src<{ commande: { colis: unknown[] } }>(page, 'commandeClient', ref)).commande.colis.length
  expect(await src(page, 'envoyerAvis', ref, { notes: [...Array(colis).fill(5), 4], commentaire: 'Colis bien emballé, relais rapide.', photo: null })).toEqual({ ok: true })

  // Messagerie : question au vendeur depuis la fiche (numéro masqué par le serveur), puis réponse dans le fil.
  const q = await src<{ id: string; masques: unknown[] }>(page, 'poserQuestion', { cle: produit, titre: 'Article', dessin: '' }, 'Bonjour, il existe en bleu ? Mon numéro : 677 11 22 41')
  expect(q.masques.length).toBeGreaterThan(0)
  const fils = await src<{ conversations: { id: string }[] }>(page, 'conversations')
  expect(fils.conversations.map((x) => x.id)).toContain(q.id)
  await src(page, 'envoyerMessage', q.id, { texte: 'Merci !' })
  const fil = await src<{ conversation: { messages: { texte?: string }[] } } | null>(page, 'conversation', q.id)
  expect(JSON.stringify(fil)).toContain('Merci !')
  // Aide : message au support (relaya /contact/) et FAQ du kit.
  expect((await src<{ id: string }>(page, 'ecrireSupport', { sujet: 'Colis abîmé', commande: ref, texte: 'Voir mon litige.', photo: null })).id).toBeTruthy()
  expect((await src<unknown[]>(page, 'faq')).length).toBeGreaterThan(0)
})

/** La dernière demande Mobile Money vue par le prestataire console (ce que l'agrégateur confirmerait). */
async function derniereDemande(api: APIRequestContext): Promise<string> {
  const d = (await (await api.get(`${API}/_essai/paiements`)).json()).mobileMoney as { reference: string }[]
  expect(d.length).toBeGreaterThan(0)
  return d[d.length - 1].reference
}
async function webhook(api: APIRequestContext, reference: string): Promise<string | null> {
  return (await (await api.post(`${API}/_essai/paiements/confirmer`, { data: { reference } })).json()).domaine
}

let liste = { id: '', code: '' }
test('liste d’envies de Carine, partagée ; Bertrand offre un article en Mobile Money (webhook)', async ({ request }) => {
  await seConnecter(page, CARINE)
  const l = await src<{ id: string }>(page, 'creerListe', { nom: `Anniversaire ${tour}`, mode: 'fil', remiseLe: null, surprise: false })
  await src(page, 'ajouterArticleListe', l.id, produit)
  const partagee = await src<{ partage: { code: string; prix: Record<string, number> } | null }>(page, 'partagerListe', l.id)
  expect(partagee.partage?.code).toBeTruthy()
  liste = { id: l.id, code: partagee.partage!.code }
  // Page publique, sans compte : prénom et relais, jamais d'adresse.
  await src(page, 'deconnecter')
  const pub = await src<{ prenom: string; articles: { p: string; prix: number; offert: boolean }[] }>(page, 'listePublique', liste.code)
  expect(pub.prenom).toBe('Carine')
  const article = pub.articles.find((a) => a.p === produit)!
  expect(article.offert).toBe(false)
  await page.goto(`/l/${liste.code}`)
  await expect(page.getByText('Carine').first()).toBeVisible()

  await seConnecter(page, BERTRAND)
  const r = await src<{ ok: boolean; ref?: string }>(page, 'offrirArticleListe', liste.code, produit, { prenom: 'Bertrand', email: BERTRAND, moyen: 'MTN MoMo · 699245318', prixVu: article.prix })
  expect(r.ok).toBe(true)
  expect(await webhook(request, await derniereDemande(request))).toBe('listes')
  await src(page, 'deconnecter')
  expect((await src<{ articles: { p: string; offert: boolean }[] }>(page, 'listePublique', liste.code)).articles.find((a) => a.p === produit)?.offert).toBe(true)
})

let cotisation = { id: '', code: '' }
test('cotisation de Carine ; envoi dans la boîte « Reçus » de Bertrand, qui participe (Mobile Money, webhook)', async ({ request }) => {
  await seConnecter(page, CARINE)
  const c = await src<{ id: string; code: string; objectif: number; etat: string }>(page, 'creerCotisation', {
    nom: `Cadeau de Junior ${tour}`,
    occasion: 'Anniversaire',
    p: produit,
    beneficiaire: 'Junior',
    relais: 'Relais Mvog-Ada',
    jusqua: Date.now() + 7 * 864e5,
  })
  expect(c.etat).toBe('ouverte')
  cotisation = { id: c.id, code: c.code }
  // Envoi A → B : la cotisation part dans la boîte « Reçus » de Bertrand (numéro vérifié de son compte).
  const e = await src<{ ok: boolean; envoi?: { id: string; dansLApplication: boolean } }>(page, 'envoyerRecu', {
    type: 'cotisation',
    a: '699245318',
    prenom: 'Bertrand',
    titre: `Cadeau de Junior ${tour}`,
    code: c.code,
    objectif: c.objectif,
    mot: 'On se cotise ?',
  })
  expect(e.ok).toBe(true)
  expect(e.envoi?.dansLApplication).toBe(true)

  await seConnecter(page, BERTRAND)
  const boite = await src<{ recus: { id: string; titre: string; etat: string; de: string }[]; aTraiter: number }>(page, 'recus')
  const recu = boite.recus.find((x) => x.titre === `Cadeau de Junior ${tour}`)!
  expect(recu.de).toBe('Carine')
  expect(recu.etat).toBe('a_traiter')
  const detail = await src<{ envoi: { id: string }; sens: string }>(page, 'recu', recu.id)
  expect(detail.sens).toBe('recu')
  await page.goto(`/recu?id=${recu.id}`)
  await expect(page.getByText(`Cadeau de Junior ${tour}`).first()).toBeVisible()
  // Exécution : Bertrand participe depuis la boîte « Reçus ».
  const x = await src<{ ok: boolean; paye?: number }>(page, 'executerRecu', recu.id, { action: 'participer', montant: 2000, moyen: 'momo:+237699245318', mot: 'Bon anniversaire !' })
  expect(x).toMatchObject({ ok: true, paye: 2000 })
  expect(await webhook(request, await derniereDemande(request))).toBe('modules')
  const pub = await src<{ participations: { prenom: string; montant: number }[] }>(page, 'cotisationPublique', cotisation.code)
  expect(pub.participations.some((p) => p.prenom === 'Bertrand' && p.montant === 2000)).toBe(true)
  // Côté Carine : l'envoi a sa réponse.
  await seConnecter(page, CARINE)
  const envoyes = (await src<{ envoyes: { id: string; titre: string; etat: string; actions: unknown[] }[] }>(page, 'recus')).envoyes
  expect(envoyes.find((x) => x.titre === `Cadeau de Junior ${tour}`)?.actions.length).toBeGreaterThan(0)
})

test('diaspora : inscription (deux codes), lien avec un proche, commande pour lui par carte (jeton), vérification renforcée et 3-D Secure', async ({ request }) => {
  const num = `6${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`
  const tel = `+33${num}`
  const email = `paul.ekane.${tour}@exemple.fr`
  await src(page, 'deconnecter')
  // Inscription : code SMS au numéro étranger, code à l'adresse e-mail (prestataires console du kit).
  await src(page, 'envoyerCodeDiaspora', 'sms', tel)
  const codeSms = await code(request, tel)
  expect(await src(page, 'verifierCodeDiaspora', tel, '000000')).toEqual({ ok: codeSms === '000000' })
  expect(await src(page, 'verifierCodeDiaspora', tel, codeSms)).toEqual({ ok: true })
  await src(page, 'envoyerCodeDiaspora', 'email', email)
  const ins = await src<{ ok: boolean; session?: { typeCompte?: string; client: { prenom: string } } }>(page, 'inscrireDiaspora', {
    fournisseur: 'email',
    prenom: 'Paul',
    nom: 'Ekane',
    email,
    motDePasse: 'Baobab-Lyon-2026',
    codeEmail: await code(request, email),
    naissance: '1987-04-02',
    pays: 'France',
    ville: 'Lyon',
    indicatif: '+33',
    numero: num,
    code: codeSms,
  })
  expect(ins.ok).toBe(true)
  expect(ins.session?.typeCompte).toBe('diaspora')

  // Le proche au Cameroun (Nadège, inscrite plus haut) choisit son relais et donne un code famille.
  await seConnecter(page, NADEGE.email, NADEGE.mdp)
  // (Au passage : elle ouvre sa boutique depuis son compte, kit client_accounts → profil vendeur en attente.)
  const boutique = await src<{ ok: boolean; boutique?: { nom: string; code: string } }>(page, 'ouvrirBoutique', { nom: `Chez Nadège ${tour}`, categorie: 'Mode', type: 'particulier' })
  expect(boutique.ok).toBe(true)
  expect((await src<{ nom: string } | null>(page, 'boutique'))?.nom).toBe(`Chez Nadège ${tour}`)
  await src(page, 'choisirRelais', 'Relais Bastos')
  const fam = await src<{ code: string }>(page, 'creerCodeFamille')
  await seConnecter(page, email, 'Baobab-Lyon-2026')
  const lien = await src<{ ok: boolean; lien: { id: string; prenom: string; etat: string } }>(page, 'lierParCode', fam.code)
  expect(lien).toMatchObject({ ok: true, lien: { prenom: 'Nadège', etat: 'actif' } })
  await src(page, 'ajouterProduit', produit, {}, 1)

  // Carte d'un autre pays que celui du compte : vérification renforcée (code SMS au numéro du compte).
  const carte = { jeton: 'tok_3ds', marque: 'Visa', derniers: '4242', expire: '08/29', bin: '42424242' }
  const commande = { carte, devise: 'EUR', mot: 'Pour la rentrée', titulaire: 'Paul Ekane', paysCarte: 'Belgique' }
  const v = await src<{ ok: boolean; raison?: string; controle?: { decision: string } }>(page, 'commanderPour', lien.lien.id, commande)
  expect(v).toMatchObject({ ok: false, raison: 'verification', controle: { decision: 'renforce' } })
  const compte = (await src<{ compte: { numeroMasque: string } }>(page, 'liensFamille')).compte
  await src(page, 'envoyerCodeDiaspora', 'sms', compte.numeroMasque)
  const renforce = await code(request, tel)

  // La banque demande 3-D Secure : le site suit l'adresse de la banque (page d'essai du kit), le client valide,
  // le prestataire confirme (webhook) et la banque ramène au site.
  await page.route('https://3ds.exemple/**', (r) => r.fulfill({ status: 302, headers: { Location: `${API}/_essai/3ds/${r.request().url().split('/').pop()}` } }))
  const banque = page.waitForURL(/\/_essai\/3ds\//)
  void page.evaluate(
    async (c) => {
      const { source } = (await import(/* @vite-ignore */ '/src/donnees/source.ts')) as typeof import('../src/donnees/source')
      const r = await source.commanderPour(c.id, c.p as never)
      sessionStorage.setItem('blv_essai_3ds', JSON.stringify(r))
    },
    { id: lien.lien.id, p: { ...commande, codeSms: renforce } },
  ).catch(() => undefined)
  await banque
  await expect(page.getByText('Confirme ton paiement')).toBeVisible()
  await page.getByRole('button', { name: 'Valider le paiement' }).click()
  await page.waitForURL(/localhost:\d+\/\?3ds=ok/)
  const suivi = await src<{ liens: { id: string; commandes: { ref: string }[] }[]; depensesMois: number }>(page, 'liensFamille')
  const l = suivi.liens.find((x) => x.id === lien.lien.id)!
  expect(l.commandes.length).toBe(1)
  expect(suivi.depensesMois).toBeGreaterThan(0)
  // Le proche voit sa commande, payée (en préparation), sans rien à payer.
  await seConnecter(page, NADEGE.email, NADEGE.mdp)
  const siennes = (await src<{ commandes: { ref: string; etat: string; payeur?: { prenom: string } }[] }>(page, 'commandes')).commandes
  expect(siennes.some((c) => c.etat === 'preparation' && c.payeur?.prenom === 'Paul')).toBe(true)
})

test('photos servies par le serveur : bandeau de l’accueil (variantes WebP), photo produit, téléversement par l’équipe', async ({ request }) => {
  const accueil = await src<{ carrousel: { titre: string; image: { url: string; srcset?: string; alt?: string } | null }[] }>(page, 'contenuAccueil')
  const photo = accueil.carrousel[0].image!
  expect(photo.url).toMatch(/^http:\/\/localhost:\d+\/media\/contenus\/.+\.jpg$/)
  const variantes = photo.srcset!.split(', ').map((x) => x.split(' '))
  expect(variantes.map((v) => v[1])).toEqual(['320w', '640w', '960w', '1600w'])
  for (const [url, largeur] of variantes) {
    const r = await request.get(url)
    expect(r.status(), url).toBe(200)
    expect(r.headers()['content-type']).toBe(largeur === '1600w' ? 'image/jpeg' : 'image/webp')
  }
  await page.goto('/')
  await expect(page.locator(`img[src="${photo.url}"]`).first()).toBeAttached()
  // Photo produit (relaya : ProductImage) : la fiche l'affiche à la place du dessin.
  const camon = (await src<{ p: string; titre: string; images: { url: string }[] }[]>(page, 'produits')).find((p) => p.titre === 'Tecno Camon 30')!
  expect(camon.images[0].url).toMatch(/\/media\/produits\/camon30.*\.jpg$/)
  expect((await request.get(camon.images[0].url)).status()).toBe(200)
  await page.goto(`/fiche?p=${camon.p}`)
  await expect(page.locator(`img[src="${camon.images[0].url}"]`).first()).toBeAttached()
  // Téléversement (outil de l'équipe) : POST /api/admin/media, compte is_staff seulement.
  const jeton = async (email: string) => (await (await request.post(`${API}/auth/login/`, { data: { username: email, password: MDP_DEMO } })).json()).access as string
  const fichier = { name: 'bandeau.jpg', mimeType: 'image/jpeg', buffer: await (await request.get(photo.url)).body() }
  const refuse = await request.post(`${API}/admin/media`, { headers: { Authorization: `Bearer ${await jeton(CARINE)}` }, multipart: { fichier } })
  expect(refuse.status()).toBe(403)
  const r = await request.post(`${API}/admin/media`, { headers: { Authorization: `Bearer ${await jeton('equipe@belivay.test')}` }, multipart: { fichier, alt: 'Essai' } })
  expect(r.status()).toBe(200)
  const m = await r.json()
  expect(m.srcset).toContain('-640.webp 640w')
  expect((await request.get(m.url)).status()).toBe(200)
})

test('réponses spéciales du serveur : prix changé au paiement, session expirée, trop de demandes', async ({ request }) => {
  await seConnecter(page, BERTRAND)
  for (const l of (await src<{ lignes: { id: string }[] }>(page, 'panier')).lignes) await src(page, 'retirerLigne', l.id).catch(() => undefined)
  const produits = await src<{ p: string; prix: number; stock: number }[]>(page, 'produits')
  const x = produits.filter((p) => p.stock > 3 && p.prix < 20000 && p.p !== produit)[0]
  await src(page, 'ajouterProduit', x.p, {}, 1)
  // Le vendeur augmente son prix entre l'affichage et le paiement : 409 price_changed → écran « Un prix a changé ».
  await request.post(`${API}/_essai/produits/${x.p}/prix`, { data: { prix: x.prix + 1500 } })
  try {
    await page.goto('/paiement-moyen')
    await page.evaluate(async () => {
      const { source } = (await import(/* @vite-ignore */ '/src/donnees/source.ts')) as typeof import('../src/donnees/source')
      void source.passerCommande({ mode: 'relais', moyen: 'mtn', comptoir: false, numero: null, livraison: 900, frais: 0 }).catch(() => undefined)
    })
    await page.waitForURL(/\/prix-change/)
    await expect(page.getByText('Un prix a augmenté').first()).toBeVisible()
  } finally {
    await request.post(`${API}/_essai/produits/${x.p}/prix`, { data: { prix: x.prix } })
  }
  for (const l of (await src<{ lignes: { id: string }[] }>(page, 'panier')).lignes) await src(page, 'retirerLigne', l.id).catch(() => undefined)

  // 3-D Secure demandé par la banque (422 action_requise) : quel que soit l'écran, le site part sur la page de la
  // banque ; validé, le prestataire confirme (webhook) et l'abonnement offert par Bertrand est appliqué à Nadège.
  await page.goto('/')
  await interfacePrete(page)
  await page.route('https://3ds.exemple/**', (r) => r.fulfill({ status: 302, headers: { Location: `${API}/_essai/3ds/${r.request().url().split('/').pop()}` } }))
  const banque = page.waitForURL(/\/_essai\/3ds\//)
  await page.evaluate(async (n) => {
    const { source } = (await import(/* @vite-ignore */ '/src/donnees/source.ts')) as typeof import('../src/donnees/source')
    const carte = { jeton: 'tok_3ds', marque: 'Visa', derniers: '4242', expire: '08/29', bin: '42424242' } as const
    void source.offrirAbonnement({ numero: n, prenom: 'Nadège', palier: 'plus', mois: 1, message: 'Pour tes courses', carte }).catch(() => undefined)
  }, NADEGE.numero)
  await banque
  await page.getByRole('button', { name: 'Valider le paiement' }).click()
  await page.waitForURL(/\?3ds=ok/)
  await seConnecter(page, NADEGE.email, NADEGE.mdp)
  const offert = await src<{ abonnement: { palier: string; offertPar: string | null; messageCadeau: string | null } | null; actif: boolean }>(page, 'prime')
  expect(offert.actif).toBe(true)
  expect(offert.abonnement).toMatchObject({ palier: 'plus', offertPar: 'Bertrand', messageCadeau: 'Pour tes courses' })
  await seConnecter(page, BERTRAND)

  // Trop de demandes (429, Retry-After ou délai du kit) : « réessaie dans X s » (message commun, AvisErreurs).
  await page.goto('/compte')
  await interfacePrete(page)
  await page.evaluate(async () => {
    const { source } = (await import(/* @vite-ignore */ '/src/donnees/source.ts')) as typeof import('../src/donnees/source')
    await source.envoyerCode('profil').catch(() => undefined) // le premier part (ou est déjà refusé)
    void source.envoyerCode('profil') // refusé (429), non attrapé par l'écran : le message commun
  })
  await expect(page.locator('.cl05-toast')).toHaveText(/Trop de demandes\s:\sréessaie dans \d+\s(s|min)\./)

  // Session expirée pendant la visite (jetons refusés, rafraîchissement refusé) : connexion, puis retour à la page.
  await page.goto('/commandes')
  await expect(page).toHaveURL(/\/commandes$/)
  await interfacePrete(page)
  await page.evaluate(() => localStorage.setItem('blv_api_jetons', JSON.stringify({ acces: 'perime', rafraichissement: 'perime' })))
  await page.evaluate(async () => {
    const { source } = (await import(/* @vite-ignore */ '/src/donnees/source.ts')) as typeof import('../src/donnees/source')
    void source.notificationsClient()
  })
  await page.waitForURL(/\/connexion\?next=%2Fcommandes/)
  await expect(page.locator('.cl05-toast')).toHaveText(/Ta session a expiré\s:\sreconnecte-toi\./)
  await page.goto(`/connexion-email?next=${encodeURIComponent('/commandes')}`)
  await page.locator('#cx-email').fill(BERTRAND)
  const champ = page.getByRole('button', { name: /Mot de passe enregistré|Mot de passe proposé/ })
  if (await champ.count()) await champ.click()
  await page.locator('#cx-mdp').fill(MDP_DEMO)
  await page.locator('.btn.primary', { hasText: 'Se connecter' }).click()
  await page.waitForURL(/\/commandes$/)
})
