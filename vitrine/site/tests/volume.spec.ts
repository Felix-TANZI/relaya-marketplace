// Données de démo qui grossissent (tests, présentation) : aucune page ne plante. Le panier se remplit par les gestes
// de l'appli (fiche → « Ajouter au panier », cœur des favoris) avec des produits de toutes les boutiques ; les
// commandes passées et les notifications sont ajoutées à l'état de l'appareil. Puis chaque écran s'ouvre : ni écran
// d'erreur, ni « NaN », ni erreur de page.
import { expect, test, type Page } from '@playwright/test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const lire = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf-8')
interface P {
  route: string
  interrupteur: string | null
}
const PAGES: P[] = JSON.parse(lire('../src/genere/pages.json'))
const INTERRUPTEURS: Record<string, boolean> = JSON.parse(lire('../src/config/interrupteurs.json'))
const PAGES_SITE: string[] = readdirSync(new URL('../src/pages/', import.meta.url), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(new URL(`../src/pages/${d.name}/pages-site.json`, import.meta.url)))
  .flatMap((d) => JSON.parse(lire(`../src/pages/${d.name}/pages-site.json`)).routes as string[])
const ROUTES = [...new Set([...PAGES.filter((p) => !p.interrupteur || INTERRUPTEURS[p.interrupteur]).map((p) => p.route), ...PAGES_SITE])]
  .filter((r) => r !== 'deconnexion' && !r.includes(':'))
  .map((r) => (r === 'accueil' ? '/' : '/' + r))

// Les produits du catalogue de démo (catalogue de base et suite), lus dans le source.
const ids = [
  ...[...lire('../src/demo/catalogue.ts').matchAll(/^ ([a-z0-9][a-z0-9-]*): \{$/gm)].map((m) => m[1]),
  ...[...lire('../src/demo/catalogue-etendu.ts').matchAll(/^\s*\[?\['([a-z0-9-]+)', '/gm)].map((m) => m[1]),
]

async function surveiller(page: Page) {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push('exception : ' + e.message))
  return errs
}

async function verifier(page: Page, chemin: string, errs: string[], problemes: string[]) {
  errs.length = 0
  await page.goto(chemin)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(150)
  const texte = await page.locator('body').innerText()
  if (/Quelque chose s.est mal passé/.test(texte)) problemes.push(chemin + ' : écran d’erreur')
  if (/\bNaN\b/.test(texte)) problemes.push(chemin + ' : NaN')
  if (/\bundefined\b/.test(texte)) problemes.push(chemin + ' : « undefined » affiché')
  for (const e of errs) problemes.push(chemin + ' : ' + e)
}

test('client : 40 produits de toutes les boutiques au panier, 60 favoris, 30 commandes, 40 notifications, 25 conversations, 30 avis à donner', async ({ page }) => {
  test.setTimeout(600_000)
  expect(ids.length).toBeGreaterThanOrEqual(60)
  const errs = await surveiller(page)
  const problemes: string[] = []
  await page.addInitScript(() => localStorage.setItem('blv_c_theme', 'light'))
  // Les gestes : 40 au panier (un produit sur deux pour couvrir toutes les boutiques), 60 favoris.
  let auPanier = 0
  let favoris = 0
  for (const [i, p] of ids.entries()) {
    if (favoris >= 60 && auPanier >= 40) break
    await page.goto('/fiche?p=' + p)
    const ajout = page.locator('.fp-bar').getByRole('button', { name: 'Ajouter', exact: true })
    await expect(page.locator('main')).toBeVisible()
    await page.waitForTimeout(150) // le cœur lit les favoris déjà faits
    if (auPanier < 40 && (i % 2 === 0 || ids.length - i <= 40 - auPanier) && (await ajout.isVisible())) {
      await ajout.click()
      await expect(page.getByText('ajouté au panier').first()).toBeVisible()
      auPanier++
    }
    // Le cœur de la fiche (ceux de la découverte, sous la fiche, portent le même nom).
    const coeur = page.locator('.fp-fav[aria-pressed=false]')
    if (favoris < 60 && (await coeur.isVisible())) {
      await coeur.click()
      await expect(page.locator('.fp-fav')).toHaveAttribute('aria-pressed', 'true')
      favoris++
    }
  }
  for (const e of errs) problemes.push('gestes : ' + e)
  expect(auPanier).toBe(40)
  expect(favoris).toBe(60)

  // 30 commandes payées et 40 notifications, faites des lignes du panier.
  await page.evaluate(() => {
    const e = JSON.parse(localStorage.getItem('blv_demo_etat') || '{}')
    const lignes = e.panier.lignes as { titre: string; dessin: string; qte: number; prix: number; boutique: string }[]
    const le = Date.UTC(2026, 9, 13, 7, 0)
    e.passees = [
      ...(e.passees ?? []),
      ...Array.from({ length: 30 }, (_, i) => {
        const l = [lignes[i % lignes.length], lignes[(i + 7) % lignes.length]].map((x) => ({ titre: x.titre, dessin: x.dessin, qte: x.qte, prix: x.prix, boutique: x.boutique }))
        const st = l.reduce((n, x) => n + x.prix * x.qte, 0)
        return { ref: 'BLV-' + (60000 + i), le: le - i * 3600_000, mode: i % 3 ? 'relais' : 'domicile', lieu: 'Relais Mvog-Ada', moyen: 'mtn', numero: '6 77 ·· ·· 41', comptoir: false, articles: 2, colis: 2, sousTotal: st, livraison: 1000, frais: 0, montant: st + 1000, dueAuRetrait: 0, etat: 'payee', expire: le, lignes: l }
      }),
    ]
    e.notifsPont = [
      ...(e.notifsPont ?? []),
      ...Array.from({ length: 40 }, (_, i) => ({ id: 'vol-' + i, type: ['Suivi', 'Paiement', 'Retrait', 'Incident', 'Messages', 'Promotions'][i % 6], titre: 'Colis BLV-' + (60000 + (i % 30)), texte: 'Ton colis avance.', le: le - i * 600_000, lu: i % 2 === 0, lien: '/suivi?ref=BLV-' + (60000 + (i % 30)), sms: false })),
    ]
    // 25 conversations avec des vendeurs (30 messages chacune) et 30 commandes à noter.
    e.conversations = [
      ...(e.conversations ?? []),
      ...Array.from({ length: 25 }, (_, i) => ({
        id: 'vol-conv-' + i, type: 'vendeur', titre: lignes[i % lignes.length].titre + ' · le vendeur', apercu: 'Le vendeur : « Oui. »', liste: { dessin: lignes[i % lignes.length].dessin }, visible: true,
        entete: { titre: lignes[i % lignes.length].titre, sous: lignes[i % lignes.length].boutique }, resolue: false, nonLus: i % 4, placeholder: 'Ton message…', pied: '',
        messages: Array.from({ length: 30 }, (_, j) => ({ de: j % 2 ? 'eux' : 'moi', qui: 'Le vendeur', le: le - (30 - j) * 60_000, texte: 'Message ' + j })),
      })),
    ]
    e.aNoter = [
      ...(e.aNoter ?? []),
      ...Array.from({ length: 30 }, (_, i) => ({ ref: 'BLV-' + (60000 + i), titre: lignes[i % lignes.length].titre, produit: '', dessin: lignes[i % lignes.length].dessin, retireeLe: le - i * 3600_000, payeeLe: le - (i + 5) * 3600_000, relais: 'Relais Mvog-Ada', gerant: 'Mme Ngo Bassong', colis: [{ produit: null }], avis: null })),
    ]
    localStorage.setItem('blv_demo_etat', JSON.stringify(e))
  })

  const chemins = [...ROUTES, '/suivi?ref=BLV-60000', '/suivi?ref=BLV-60029', '/commande?ref=BLV-60005', '/fil?id=vol-conv-3', '/avis-donner?ref=BLV-60004']
  // Téléphone, puis ordinateur (les écrans larges montrent plus de colonnes et d'aperçus).
  for (const r of chemins) await verifier(page, r, errs, problemes)
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const r of chemins) await verifier(page, r, errs, problemes)
  expect(problemes).toEqual([])
})
