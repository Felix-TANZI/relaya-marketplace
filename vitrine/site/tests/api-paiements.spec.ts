// Le site en mode API sur LA MÊME ORIGINE que le serveur (mandataire de Vite : /api → serveur d'essai, comme
// belivay.com/api), avec les paiements unifiés du kit (apps.paiements, passerelle d'essai : aucun argent, aucun appel) :
// chaque demande Mobile Money se conclut par une notification SIGNÉE de l'opérateur (HMAC du corps,
// POST /api/payments/notifications/{operateur}), comme en production. Lancé par pw-api.config.ts.
//   - panier d'un visiteur (X-Device-Id) gardé puis fusionné à la connexion ;
//   - paiement en attente, confirmé, refusé, expiré : ce que l'écran d'attente montre à chaque fois ;
//   - notification à la signature fausse : refusée, rien ne change.
import { createHmac } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const API = `http://localhost:${process.env.PORT_API_PAIEMENTS || 8011}/api`
const SITE = `http://localhost:${process.env.PORT_SITE_PAIEMENTS || 5181}`
const SECRET = 'essai-notifications-belivay' // PAIEMENT_WEBHOOK_SECRET du serveur (pw-api.config.ts)
const MDP_DEMO = 'Essai-BelivaY-2026'
const BERTRAND = 'bertrand.essomba@gmail.com'

test.describe.configure({ mode: 'serial' })
test.use({ baseURL: SITE })

async function src<T = unknown>(page: Page, methode: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    async ([m, a]) => {
      const mod = (await import(/* @vite-ignore */ '/src/donnees/source.ts')) as { source: Record<string, (...x: unknown[]) => Promise<unknown>> }
      return (await mod.source[m as string](...(a as unknown[]))) as never
    },
    [methode, args] as const,
  ) as Promise<T>
}

/** Notification de l'opérateur, signée comme le ferait l'agrégateur (en-tête X-Signature, HMAC-SHA256 hexadécimal). */
async function notifier(api: APIRequestContext, commande: string, statut: string, montant: number, secret = SECRET) {
  const r = await api.get(`${API}/_essai/paiements`, { params: { commande } })
  expect(r.ok(), `demande de paiement de ${commande}`).toBe(true)
  const { reference } = (await r.json()) as { reference: string }
  const corps = JSON.stringify({ id: `evt-${reference}-${statut}`, reference, statut, montant, devise: 'XAF' })
  return api.post(`${API}/payments/notifications/mtn`, {
    data: corps,
    headers: { 'Content-Type': 'application/json', 'X-Signature': createHmac('sha256', secret).update(corps).digest('hex') },
  })
}

let page: Page
let produit = ''
test.beforeAll(async ({ browser, request }) => {
  page = await browser.newPage()
  await request.post(`${API}/_essai/limites`)
  await page.goto('/')
})
test.afterAll(async () => {
  await page.close()
})

/** Commande Mobile Money d'un article, au montant que l'écran affiche (frais de livraison et R02 compris). */
async function commander(): Promise<{ ref: string; etat: string; montant: number }> {
  for (const l of (await src<{ lignes: { id: string }[] }>(page, 'panier')).lignes) await src(page, 'retirerLigne', l.id).catch(() => undefined)
  await src(page, 'ajouterProduit', produit, {}, 1)
  const livraison = await page.evaluate(async () => {
    const { source } = (await import(/* @vite-ignore */ '/src/donnees/source.ts')) as typeof import('../src/donnees/source')
    const { calculer } = (await import(/* @vite-ignore */ '/src/donnees/frais.ts')) as typeof import('../src/donnees/frais')
    const p = await source.panier()
    const bs = [...new Set(p.lignes.map((l) => l.boutique))]
    const r = calculer(p.mode, bs.map((b) => ({ boutique: b, zone: p.boutiques[b]?.zone ?? 'Mvog-Ada', articles: p.lignes.filter((l) => l.boutique === b).map((l) => ({ prix: l.prix, quantite: l.qte, classe: l.classe })) })))
    return r.total - r.sousTotal
  })
  return src(page, 'passerCommande', { mode: 'relais', moyen: 'mtn', comptoir: false, numero: null, livraison, frais: 0 })
}

test('même origine : le site passe par /api, le serveur sert les paiements unifiés', async ({ request }) => {
  expect(await page.evaluate(async () => ((await import(/* @vite-ignore */ '/src/donnees/source.ts')) as { source: { nom: string } }).source.nom)).toBe('api')
  const produits = await src<{ p: string; prix: number; stock: number }[]>(page, 'produits')
  produit = produits.find((x) => x.stock > 5 && x.prix > 3000 && x.prix < 40_000)!.p
  expect(produit).toBeTruthy()
  // Une notification sans signature est refusée (401), jamais appliquée.
  const r = await request.post(`${API}/payments/notifications/mtn`, { data: { reference: 'BLV-1-1', statut: 'SUCCESSFUL' } })
  expect(r.status()).toBe(401)
})

test('panier d’un visiteur (X-Device-Id) : gardé sans compte, retrouvé après la connexion', async () => {
  await src(page, 'deconnecter').catch(() => undefined)
  expect((await src<{ connecte: boolean }>(page, 'session')).connecte).toBe(false)
  await src(page, 'ajouterProduit', produit, {}, 1)
  const avant = await src<{ lignes: { p: string; titre: string }[] }>(page, 'panier')
  expect(avant.lignes.map((l) => l.p)).toContain(produit)
  await page.goto('/panier')
  await expect(page.getByText(avant.lignes[0].titre).first()).toBeVisible()
  // Connexion : les lignes du visiteur passent dans le panier du compte (session du kit, même appareil).
  const r = await src<{ ok: boolean }>(page, 'connecterEmail', BERTRAND, MDP_DEMO, true)
  expect(r.ok).toBe(true)
  const apres = await src<{ lignes: { p: string }[] }>(page, 'panier')
  expect(apres.lignes.map((l) => l.p)).toContain(produit)
})

test('paiement en attente puis confirmé par la notification signée : l’écran passe à « confirmée » sans rien toucher', async ({ request }) => {
  const c = await commander()
  expect(c.etat).toBe('attente')
  expect((await src<{ ref: string }[]>(page, 'paiementsEnAttente')).map((x) => x.ref)).toContain(c.ref)
  await page.goto(`/paiement-attente?ref=${c.ref}`)
  await expect(page.getByText(c.ref.replace('BLV-', '')).first()).toBeVisible()
  // Signature fausse : refusée, la commande attend toujours.
  expect((await notifier(request, c.ref, 'SUCCESSFUL', c.montant, 'pas-le-secret')).status()).toBe(401)
  expect((await src<{ etat: string }>(page, 'commandePassee', c.ref)).etat).toBe('attente')
  // L'opérateur confirme : l'écran d'attente le voit et passe à la confirmation.
  const n = await notifier(request, c.ref, 'SUCCESSFUL', c.montant)
  expect(n.ok()).toBe(true)
  await page.waitForURL(/\/confirmee\?ref=/, { timeout: 15_000 })
  expect((await src<{ etat: string }>(page, 'commandePassee', c.ref)).etat).toBe('payee')
  // Rejouée : sans effet.
  expect((await notifier(request, c.ref, 'SUCCESSFUL', c.montant)).ok()).toBe(true)
  expect((await src<{ commandes: { ref: string; etat: string }[] }>(page, 'commandes')).commandes.find((x) => x.ref === c.ref)?.etat).toBe('preparation')
})

test('paiement refusé par l’opérateur : l’écran d’échec, rien n’est débité, l’article revient au panier', async ({ request }) => {
  const c = await commander()
  await page.goto(`/paiement-attente?ref=${c.ref}`)
  await expect(page.getByText(c.ref.replace('BLV-', '')).first()).toBeVisible()
  expect((await notifier(request, c.ref, 'FAILED', c.montant)).ok()).toBe(true)
  await page.waitForURL(/\/paiement-echec\?/, { timeout: 15_000 })
  expect(new URL(page.url()).searchParams.get('cause')).toBe('solde')
  expect((await src<{ etat: string }>(page, 'commandePassee', c.ref)).etat).toBe('echec')
  expect((await src<{ lignes: { p: string }[] }>(page, 'panier')).lignes.map((l) => l.p)).toContain(produit)
})

test('paiement expiré chez l’opérateur : l’écran d’échec « délai écoulé »', async ({ request }) => {
  const c = await commander()
  await page.goto(`/paiement-attente?ref=${c.ref}`)
  await expect(page.getByText(c.ref.replace('BLV-', '')).first()).toBeVisible()
  expect((await notifier(request, c.ref, 'EXPIRED', c.montant)).ok()).toBe(true)
  await page.waitForURL(/\/paiement-echec\?/, { timeout: 15_000 })
  expect(new URL(page.url()).searchParams.get('cause')).toBe('expire')
})

test('« J’ai validé » quand l’opérateur a déjà refusé : l’échec, jamais « confirmée »', async ({ request }) => {
  const c = await commander()
  await page.goto(`/paiement-attente?ref=${c.ref}`)
  await expect(page.getByText(c.ref.replace('BLV-', '')).first()).toBeVisible()
  expect((await notifier(request, c.ref, 'FAILED', c.montant)).ok()).toBe(true)
  const r = await src<{ etat: string }>(page, 'confirmerPaiement', c.ref)
  expect(r.etat).toBe('echec')
  await page.waitForURL(/\/paiement-echec\?/, { timeout: 15_000 })
})
