// Données de démo qui grossissent (tests, présentation) : aucune page de l'espace vendeur ne plante. Avant le
// chargement, l'appareil reçoit 80 offres (fiches du catalogue et produits nouveaux, tous les états) et le pont
// commun 50 commandes payées par le client pour la vitrine (une ou deux colis, relais ou domicile, payables au
// retrait). Puis chaque écran s'ouvre, téléphone et ordinateur : ni écran d'erreur, ni « NaN », ni erreur de page.
import { expect, test, type Page } from '@playwright/test'
import { OUVERTES, adresse, figerHorloge } from './commun'

const FICHES = ['itel-ac52', 'pagne-wax', 'iphone-15-pro-max', 'chargeur-18w', 'coque-itel-ac52', 'ecouteurs-filaires', 'itel-ac52-64']
const ETATS = ['en_vente', 'en_vente', 'en_vente', 'en_pause', 'brouillon', 'en_verification', 'refusee', 'en_vente']
const T0 = Date.UTC(2026, 9, 12, 8, 0)

const offre = (i: number) => {
  const nouveau = i % 5 === 4
  const etat = ETATS[i % ETATS.length]
  return {
    id: 'vol-' + i,
    ficheId: nouveau ? null : FICHES[i % FICHES.length],
    demande: nouveau ? { titre: 'Produit nouveau ' + i, marque: 'Marque ' + i, categorie: 'Maison & Déco' } : null,
    variante: 'Variante ' + i,
    etat,
    etatArticle: 'Neuf',
    prix: i % 9 === 8 ? null : 5000 + i * 750,
    stock: i % 8 === 7 ? 0 : i % 13,
    seuilAlerte: 3,
    delaiPreparationH: 4,
    colis: (['S', 'M', 'L', 'XL'] as const)[i % 4],
    poidsKg: null,
    dimensionsCm: null,
    paiementAuRetrait: i % 2 === 0,
    madeInCameroon: i % 3 === 0,
    prixAuto: false,
    plancherPrive: null,
    photos: [],
    envoyeeA: etat === 'brouillon' ? null : T0 - i * 3600_000,
    verificationAvant: etat === 'en_verification' ? T0 + 48 * 3600_000 : null,
    verifieeA: etat === 'en_vente' || etat === 'en_pause' ? T0 - i * 3000_000 : null,
    motifRefus: etat === 'refusee' ? 'Photos floues : reprenez-les à la lumière du jour.' : null,
    ficheDemandee: null,
    descriptionProposee: null,
    dupliqueDe: null,
    resterJusqua: null,
    historique: [{ a: T0 - i * 3600_000, quoi: 'Offre envoyée en vérification' }],
    creeA: T0 - i * 3600_000,
    majA: T0 - i * 1800_000,
  }
}

const commande = (i: number, le: number) => {
  const ref = 'BLV-' + (70000 + i)
  const deux = i % 4 === 0
  const colis = Array.from({ length: deux ? 2 : 1 }, (_, k) => ({
    colis: `${ref}-${k + 1}`,
    boutique: 'Boutique B',
    classe: (['S', 'M', 'L', 'XL'] as const)[(i + k) % 4],
    lignes: [{ produit: 'vol-p' + (i % 17), titre: 'Article de volume ' + (i % 17), variante: i % 3 ? 'Noir' : null, prix: 3000 + i * 1100, qte: 1 + (i % 3), categorie: i % 5 ? 'GEM' : null, photo: null }],
  }))
  const domicile = i % 3 === 0
  return { type: 'order.paid', commande: ref, mode: domicile ? 'domicile' : 'relais', lieu: domicile ? 'Maison · Mvog-Ada' : 'Relais Bastos Carrefour', relais: domicile ? null : 'rel-z1-001', zone: 'Z1', payableAuRetrait: i % 7 === 0, delaiH: 4, colis, cle: 'vol-paid-' + i, app: 'client', le: le - i * 60_000, n: le - i * 60_000 }
}

async function preparer(page: Page) {
  await figerHorloge(page)
  const offres = Array.from({ length: 80 }, (_, i) => offre(i))
  await page.addInitScript((offres) => {
    if (sessionStorage.getItem('blv_v_volume')) return
    sessionStorage.setItem('blv_v_volume', '1')
    localStorage.clear()
    localStorage.setItem('blv_v_theme', 'light')
    localStorage.setItem('blv_v_lang', 'fr')
    localStorage.setItem('blv_demo_debut', String(Date.now()))
    // Sans empreinte : la forme de l'état fait foi (src/demo/stockage.ts) ; mêmes clés que l'état initial.
    localStorage.setItem('blv_v_demo_produits', JSON.stringify({ version: 2, etat: { forme: 3, offres, corbeille: [], attente: {}, publications: {}, derniere: null, manques: {}, n: 0 } }))
  }, offres)
  await page.addInitScript(
    ([evs]) => {
      if (localStorage.getItem('blv_pont')) return
      localStorage.setItem('blv_pont', JSON.stringify(evs))
    },
    [Array.from({ length: 50 }, (_, i) => commande(i, Date.UTC(2026, 9, 13, 8, 40)))],
  )
}

async function verifier(page: Page, a: string, errs: string[], problemes: string[]) {
  errs.length = 0
  await page.goto(adresse(a))
  await page.waitForSelector('#app', { state: 'attached' })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(100)
  const texte = await page.locator('body').innerText()
  if (/Quelque chose s.est mal passé/.test(texte)) problemes.push(a + ' : écran d’erreur')
  if (/\bNaN\b/.test(texte)) problemes.push(a + ' : NaN')
  if (/\bundefined\b|\[object /.test(texte)) problemes.push(a + ' : « undefined » affiché')
  for (const e of errs) problemes.push(a + ' : ' + e)
}

test('vendeur : 80 offres et 50 commandes payées par le client', async ({ page }) => {
  test.setTimeout(600_000)
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push('exception : ' + e.message))
  const problemes: string[] = []
  await preparer(page)
  await page.goto(adresse('#commandes'))
  // Les commandes du pont sont entrées dans « À préparer ».
  await expect(page.getByText('BLV-70001').first()).toBeVisible()
  // Les offres préparées sont lues (forme acceptée), pas remplacées par le jeu d'essai.
  await page.goto(adresse('#produits'))
  await expect(page.getByText(/Variante \d+/).first()).toBeVisible()
  const chemins = [
    ...OUVERTES.map((r) => '#' + r),
    '#commande?ref=BLV-70001',
    '#commande?ref=BLV-70000-2',
    '#bon?ref=BLV-70003',
    '#journal?ref=BLV-70005',
    '#offre_detail?p=vol-4',
    '#offre_detail?p=vol-12',
    '#offre_detail?p=vol-6',
  ]
  for (const a of chemins) await verifier(page, a, errs, problemes)
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const a of chemins) await verifier(page, a, errs, problemes)
  expect(problemes).toEqual([])
})
