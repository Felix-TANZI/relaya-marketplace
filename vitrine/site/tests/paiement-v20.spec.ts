// Panier et paiement selon les règles BV-DEV v2.0 (DP-69) et la consigne du porteur : le mode de livraison se choisit
// une fois, dans le panier ; le client paie toujours (domicile : tout maintenant ; relais : maintenant, ou au comptoir
// avec la livraison d'avance) ; il ne voit que les moyens qu'il peut utiliser (MTN Mobile Money, Orange Money ; ni
// Wallet fermé, ni carte avant son ouverture) ; jamais le nom d'un prestataire ; panier minimum (R84).
// Panier de référence : Boutique A (Mvog-Ada, pochette, 150 699 F), Boutique B (Mvog-Ada, carton C1, 84 000 F),
// Boutique C (Mvan, Z11 périphérie, carton C1, 37 000 F) ; relais Mvog-Ada (Z9), adresse Maison · Mvog-Ada.
import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-13T09:15:00Z')) // mardi 10 h 15 à Yaoundé
  await page.setViewportSize({ width: 390, height: 844 })
})

const barre = (page: Page) => page.locator('.cl07-bar')
const feuille = (page: Page) => page.locator('.sheet[data-forme=large]')
// Ne garde que le cuiseur à riz (32 000 F, Boutique B, carton C1) ; prix : la ligne repassée à ce prix.
const garderCuiseur = async (page: Page, prix?: number) => {
  await page.goto('/panier')
  for (const titre of ['Brosse à dents Oral-B iO Series 9', 'Imprimante multifonction HP DeskJet 4220e', 'Service de table en grès Luminarc, 16 pièces']) {
    await page.locator('.blk', { hasText: titre }).first().getByRole('link', { name: 'Retirer l’article' }).click()
    await expect(page.locator('.blk', { hasText: titre })).toHaveCount(0)
  }
  if (prix) {
    await page.evaluate((prix) => {
      const e = JSON.parse(localStorage.getItem('blv_demo_etat')!)
      e.panier.lignes[0].prix = prix
      localStorage.setItem('blv_demo_etat', JSON.stringify(e))
    }, prix)
    await page.reload()
  }
}

test('panier : barre compacte, aucun prestataire nommé, Wallet fermé, carte montrée en démonstration (FF-CARTE)', async ({ page }) => {
  await page.goto('/panier')
  // R04, R07, R08, R09 : 900 F + 2 cartons C1 (1 000 F) + 2 boutiques de la zone du relais (1 000 F) − 900 F offerts ;
  // R02 : ⌈273 699 × 100 ÷ 98⌉ = 279 285 F, frais de paiement compris.
  await expect(barre(page).locator('[data-total-livre]')).toHaveText('Total 279 285 Fdont livraison 2 000 F')
  await expect(barre(page).locator('.btn.primary')).toHaveText('Passer commande')
  await expect(barre(page).locator('.btn')).toHaveCount(1)
  await expect(page.locator('main')).not.toContainText('CamPay')
  await expect(page.locator('main')).not.toContainText('Wallet')
  await expect(page.locator('.cl07-pm')).toContainText('VISA') // FF-CARTE ouvert dans la démonstration seulement
  await expect(page.locator('[data-offerte]')).toContainText('Livraison offerte jusqu’à 900 F : il te reste 2 000 F à payer.')
  await expect(page.locator('main')).not.toContainText('gratuite')
  await page.locator('[data-detail] summary').click()
  await expect(page.locator('[data-promesse]')).toContainText('Disponible au relais demain avant 17 h 30')
  await expect(page.locator('[data-detail]')).toContainText('Frais de paiement, compris dans le total5 586 F')
})

test('domicile : choisi au panier, repris au paiement, tout payé maintenant en Mobile Money', async ({ page }) => {
  await page.goto('/panier')
  await page.getByRole('radio', { name: /À domicile/ }).click()
  // R05, R06 : niveau périphérie de la boutique de Mvan (1 700 F) + cartons + boutiques ; 1 500 F offerts dès 50 000 F.
  await expect(barre(page).locator('[data-total-livre]')).toHaveText('Total 279 489 Fdont livraison 2 200 F')
  await barre(page).locator('.btn.primary').click()
  await expect(page).toHaveURL(/\/paiement-moyen$/)
  const f = feuille(page)
  await expect(f.locator('[data-livraison]')).toContainText('À domicile')
  await expect(f.locator('[data-livraison]')).toContainText('Livré demain avant 13 h')
  // Jamais reproposé : ni relais à choisir, ni comptoir, ni paiement à la livraison.
  await expect(f.locator('.cl08-row', { hasText: 'Au relais' })).toHaveCount(0)
  await expect(f).not.toContainText('Payer au comptoir')
  await expect(f).toContainText('le livreur ne touche jamais d’argent')
  await expect(f).not.toContainText(/Wallet|CamPay/) // carte, Apple Pay et Google Pay : section repliable (FF-CARTE, démonstration)
  // Seul le numéro du moyen choisi : Orange, son numéro enregistré ; un numéro MTN y est refusé.
  await f.locator('.cl08-row', { hasText: 'Orange Money' }).first().click()
  await expect(f.locator('[data-numero=Orange]')).toContainText('6 55 ·· ·· 08')
  await expect(f.locator('[data-numero=MTN]')).toHaveCount(0)
  await f.getByRole('link', { name: 'Utiliser un autre numéro Orange Money' }).click()
  await f.getByLabel('Numéro Orange Money').fill('677123456')
  await f.locator('button.btn.primary').click()
  await expect(f.locator('.note.red')).toContainText('Ce numéro n’est pas un numéro Orange Money.')
  await f.locator('.cl08-row', { hasText: 'MTN Mobile Money' }).first().click()
  await expect(f.locator('button.btn.primary')).toHaveText('Payer 279 489 F avec MTN Mobile Money')
  await expect(f).toContainText('Dont 5 590 F de frais de paiement.')
  await f.locator('button.btn.primary').click()
  await expect(page).toHaveURL(/paiement-attente\?ref=BLV-/)
  await page.getByRole('button', { name: 'J’ai validé sur mon téléphone' }).click()
  await expect(page).toHaveURL(/confirmee\?ref=BLV-/)
  await expect(page.locator('.cl08-amt')).toHaveText('279 489 F')
})

test('relais, payer maintenant : pas de comptoir au-delà du plafond, « Modifier » renvoie au panier', async ({ page }) => {
  await page.goto('/paiement-moyen')
  const f = feuille(page)
  await expect(f.locator('[data-livraison]')).toContainText('Au relais · Relais Mvog-Ada')
  // Au-delà du plafond du comptoir (R42) : l'option n'apparaît pas du tout.
  await expect(f).not.toContainText(/comptoir|Quand payer/)
  await expect(f.locator('button.btn.primary')).toHaveText('Payer 279 285 F avec MTN Mobile Money')
  await f.getByRole('link', { name: 'Modifier la livraison' }).click()
  await expect(page).toHaveURL(/\/panier$/)
})

test('relais, payer au comptoir : livraison d’avance (+ 900 F, offerte), le reste au retrait, commande validée', async ({ page }) => {
  await garderCuiseur(page) // cuiseur à riz 32 000 F, carton C1 : livraison 1 400 F, 900 F offerts
  await page.goto('/paiement-moyen')
  const f = feuille(page)
  await f.locator('.pm-sech', { hasText: 'Autres moyens' }).click() // sections repliables (CL-08)
  await f.locator('.cl08-row', { hasText: 'Payer au comptoir' }).click()
  // R42 : avance = 500 F + 900 F = 1 400 F (+ 29 F, R02) ; au comptoir 32 000 + 500 − 1 400 = 31 100 F (+ 635 F).
  await expect(f.locator('.cl07-tot')).toContainText('À payer maintenant1 429 F')
  await expect(f.locator('[data-au-comptoir]')).toContainText('31 735 F')
  await expect(f.locator('[data-comptoir]')).toContainText('jamais en espèces')
  await expect(f.locator('[data-comptoir]')).toContainText('ton code de retrait apparaît une fois payé')
  await expect(f).toContainText('en espèces au gérant')
  await f.locator('button.btn.primary').click()
  await expect(page).toHaveURL(/paiement-attente\?ref=BLV-/)
  await page.getByRole('button', { name: 'J’ai validé sur mon téléphone' }).click()
  await expect(page).toHaveURL(/validee\?ref=BLV-/)
})

test('panier minimum : « Passer commande » bloqué, le colis nommé par son produit', async ({ page }) => {
  await garderCuiseur(page, 2500)
  await expect(barre(page).locator('[data-minimum]')).toHaveText('Encore 500 F pour commander')
  await expect(barre(page).locator('.btn.primary')).toHaveAttribute('aria-disabled', 'true')
  await expect(barre(page).locator('.btn.primary')).toHaveClass(/off/)
  await expect(barre(page).locator('[data-minimum]')).not.toContainText('Boutique')
})
