// Chantier F (vendeur, validé par le porteur le 18 oct.) : points 1, 2, 3 et 5. Le moteur v2.0 lui-même est vérifié par
// vitest (src/calculs/v20-client.test.ts) ; ici, les montants du jeu d'essai sont posés avec leur calcul (BV-DEV-03).
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const f = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F'
const action = (page: Page, cle: string) => page.locator(`.vd4-acts [data-action=${cle}]`)

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test.describe('1 · accueil : les actions d’abord, avec leur nombre', () => {
  test('quatre tuiles avant la liste, qui filtrent ce qu’il y a à faire', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await expect(page.locator('.vd4-acts [data-action]')).toHaveCount(4)
    await expect(page.locator('.vd4-acts .vd4-act-l')).toHaveText(['Préparer', 'Marquer prêt', 'Répondre', 'Stock bas'])
    // Jeu d'essai : 3 à préparer dont BLV-00008 (photo et emballage faits) ; 2 litiges, 4 retours, 2 questions ; 3 stocks bas.
    await expect(page.locator('.vd4-acts .vd4-act-v')).toHaveText(['2', '1', '8', '3'])
    // Les actions sont au-dessus de la liste et de toute statistique.
    const yActions = (await page.locator('.vd4-acts').boundingBox())!.y
    expect(yActions).toBeLessThan((await page.locator('.card.ord, .hero.orange').first().boundingBox())!.y)
    expect(yActions).toBeLessThan((await page.locator('[data-carte=versement]').boundingBox())!.y)
    await action(page, 'pret').click()
    await expect(action(page, 'pret')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.card.ord, .hero.orange')).toHaveCount(1)
    await expect(page.locator('.card.ord')).toContainText('BLV-00008')
    await expect(page.locator('[data-etat=a-marquer]')).toBeVisible()
    await action(page, 'repondre').click()
    await expect(page.locator('.card.ord')).toHaveCount(6)
    await expect(page.locator('[data-ligne=questions]')).toContainText('2 questions de clients')
    await page.getByRole('button', { name: 'Tout voir' }).click()
    await expect(page.locator('[data-action=tout]')).toHaveText(/Voir les 5 autres/)
    await action(page, 'stock').click()
    await expect(page).toHaveURL(/\/stock$/)
  })

  test('cibles de 44 px au moins, une colonne de deux au téléphone', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    for (const b of await page.locator('.vd4-acts [data-action]').all()) {
      const r = (await b.boundingBox())!
      expect(r.height).toBeGreaterThanOrEqual(44)
      expect(r.width).toBeGreaterThan(140)
    }
  })
})

test.describe('2 · préparation en trois gestes, heure limite R45/R47', () => {
  test('photo, emballage, puis « C’est prêt » ; l’accueil compte la commande à marquer prête', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00010', FR)
    const gestes = page.locator('.vd5-gestes')
    await expect(gestes.locator('[data-geste]')).toHaveCount(3)
    await expect(gestes.locator('[data-geste="3"]')).toContainText('C’est prêt')
    await gestes.locator('input[type=file]').setInputFiles({ name: 'article.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) })
    await expect(gestes.locator('[data-geste="1"]')).toHaveClass(/fait/)
    await expect(gestes.locator('[data-geste="1"]')).toContainText('Photo prise')
    await gestes.getByRole('button', { name: 'C’est emballé' }).click()
    await expect(gestes.locator('[data-geste="2"]')).toHaveClass(/fait/)
    await page.goto('./')
    await expect(page.locator('.vd4-acts .vd4-act-v')).toHaveText(['1', '2', '8', '3'])
  })

  test('mardi 9 h 48 : prête avant 13 h, livrée aujourd’hui avant 15 h, avec le temps qui reste', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00008', FR)
    const limite = page.locator('.vd5-limite')
    await expect(limite).toHaveAttribute('data-limite', 'jour-meme')
    await expect(limite).toContainText('Prête avant 13 h : livrée aujourd’hui avant 15 h')
    await expect(limite).toContainText('Il reste 3 h 12')
  })

  test('payable au retrait (relais) : pas d’heure limite à domicile', async ({ page }) => {
    await ouvrir(page, '#commande?ref=BLV-00009', FR)
    await expect(page.locator('.vd5-limite')).toHaveCount(0)
    await expect(page.locator('.vd5-gestes')).toBeVisible()
  })
})

test.describe('3 · Mes produits : prix et stock dans la liste, prix conseillé, course', () => {
  test('dans ou hors course (R29, R33) ; revenir dans la course en baissant le prix dans la liste', async ({ page }) => {
    await ouvrir(page, '#produits', FR)
    const itel = page.locator('.card.ord', { hasText: 'ITEL AC52 · noir' }).first()
    await expect(itel.locator('[data-course]')).toHaveText('Dans la course')
    const iphone = page.locator('.card.ord', { hasText: 'iPhone 15 Pro Max · 256 Go' })
    // 350 000 F face à 330 000 / 345 000 / 365 000 F, phase Démarrage (tolérance 1 000 F) : 19 000 F de trop.
    await expect(iphone.locator('[data-course]')).toHaveText('Hors course · trop cher de 19 000 F')
    const prix = iphone.getByRole('textbox', { name: 'Prix de iPhone 15 Pro Max · 256 Go' })
    await prix.fill('331000')
    await iphone.getByRole('button', { name: /Enregistrer le prix/ }).click()
    await expect(iphone.locator('[data-course]')).toHaveText('Dans la course')
    await expect(prix).toHaveValue(/^331\s000$/)
  })

  test('prix conseillé appliqué d’un geste ; stock − et + sans quitter la liste', async ({ page }) => {
    await ouvrir(page, '#produits', FR)
    const itel = page.locator('.card.ord', { hasText: 'ITEL AC52 · noir' }).first()
    const conseil = itel.locator('.vd8-conseil')
    await expect(conseil).toContainText('Prix conseillé 19 750 F')
    await conseil.getByRole('button', { name: 'Appliquer' }).click()
    await expect(itel.getByRole('textbox', { name: 'Prix de ITEL AC52 · noir' })).toHaveValue(/^19\s750$/)
    await expect(itel.locator('.vd8-conseil')).toHaveCount(0)
    const stock = itel.getByRole('button', { name: /Changer le stock/ })
    await expect(stock).toHaveText('3')
    await itel.getByRole('button', { name: /Ajouter un au stock/ }).click()
    await expect(stock).toHaveText('4')
    await itel.getByRole('button', { name: /Retirer un au stock/ }).click()
    await expect(stock).toHaveText('3')
    for (const b of await itel.locator('.vd8-pas').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })
})

test.describe('5 · prochain versement net, détail replié', () => {
  // À verser : BLV-00003 (ITEL AC52, 20 000 F) et BLV-00018 (pagne wax Made in Cameroon, 14 000 F), Bronze, découverte.
  // Famille A : 20 000 × 13,5 % × 0,8 = 2 160 F (planchers R14 : 700 F, 2 % = 400 F). Famille B, Made in Cameroon :
  // 14 000 × (23,5 − 2) % × 0,8 = 2 408 F. TVA sur la commission : 0 (R21, régime actuel).
  const ventes = [{ commission: 2160 }, { commission: 2408 }]
  const avant = 34000 - 2160 - 2408 // 29 432 F
  const fraisVersement = (x: number) => Math.ceil(x / 100) // 1 % au franc supérieur (R22) : 295 F
  const net = avant - fraisVersement(avant) // 29 137 F

  test('Mon argent : le net du vendredi, puis ventes, commission et 1 % Mobile Money en détail', async ({ page }) => {
    await ouvrir(page, '#argent', FR)
    await expect(page.locator('.hero.night .big')).toHaveAttribute('data-net', String(net))
    const detail = page.locator('.hero.night details.vf-detail')
    await expect(detail).not.toHaveAttribute('open')
    await detail.locator('summary').click()
    await expect(detail.locator('.vf-l')).toHaveText([
      `2 ventes libérées${f(34000)}`,
      `Commission BelivaY− ${f(ventes[0].commission + ventes[1].commission)}`,
      `Frais Mobile Money (1 %)− ${f(fraisVersement(avant))}`,
      `Vous recevez${f(net)}`,
    ])
    await expect(page.locator('main')).not.toContainText(/CamPay/i)
  })

  test('accueil : même montant net, un seul bouton, détail replié', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    const carte = page.locator('[data-carte=versement]')
    await expect(carte.locator('.vf-k')).toHaveText('Prochain versement · vendredi 16 oct.')
    await expect(carte.locator('.vf-big')).toHaveText(f(net))
    await expect(carte.locator('.btn')).toHaveCount(1)
    await expect(carte.locator('details')).not.toHaveAttribute('open')
  })

  test('accès Préparation : ni carte de versement, ni montant', async ({ page }) => {
    await ouvrir(page, '#accueil?role=prep', FR)
    await expect(page.locator('[data-carte=versement]')).toHaveCount(0)
  })
})
