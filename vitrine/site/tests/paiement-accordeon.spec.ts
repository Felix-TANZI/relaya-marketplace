// Moyens de paiement en sections repliables (CL-08, demande du porteur du 18 oct.) : Mobile Money ; carte et
// portefeuilles (FF-CARTE, ouvert dans la démonstration seulement) ; autres moyens (comptoir quand il est possible, jamais par carte,
// Wallet quand il est ouvert). Une seule section ouverte ; celle du moyen choisi ouverte d'abord ; une section vide
// n'apparaît pas ; jamais le nom d'un intermédiaire ; frais de paiement compris dans le total (R02).
import { expect, test, type Page } from '@playwright/test'

const prepare = async (page: Page, theme: 'light' | 'dark', w: number, h: number) => {
  await page.clock.setFixedTime(new Date('2026-10-13T09:15:00Z'))
  await page.setViewportSize({ width: w, height: h })
  await page.addInitScript((t) => localStorage.setItem('blv_c_theme', t), theme)
}
// Ne garde que le cuiseur à riz (32 000 F) : sous le plafond du comptoir (R42), « Autres moyens » apparaît.
const garderCuiseur = async (page: Page) => {
  await page.goto('/panier')
  for (const titre of ['Brosse à dents Oral-B iO Series 9', 'Imprimante multifonction HP DeskJet 4220e', 'Service de table en grès Luminarc, 16 pièces']) {
    await page.locator('.blk', { hasText: titre }).first().getByRole('link', { name: 'Retirer l’article' }).click()
    await expect(page.locator('.blk', { hasText: titre })).toHaveCount(0)
  }
}
const feuille = (page: Page) => page.locator('.sheet[data-forme=large]')
const entete = (page: Page, titre: string) => feuille(page).locator('.pm-sech', { hasText: titre })

for (const [nom, theme, w, h] of [
  ['clair 390', 'light', 390, 844],
  ['sombre 390', 'dark', 390, 844],
  ['clair 1440', 'light', 1440, 900],
  ['sombre 1440', 'dark', 1440, 900],
] as const)
  test(`accordéon des moyens de paiement · ${nom}`, async ({ page }) => {
    await prepare(page, theme, w, h)
    await garderCuiseur(page)
    await page.goto('/paiement-moyen')
    const f = feuille(page)
    await expect(f.locator('.pm-sec')).toHaveCount(3)
    // Le moyen déjà choisi (Mobile Money) : sa section est ouverte, les autres fermées.
    await expect(entete(page, 'Mobile Money')).toHaveAttribute('aria-expanded', 'true')
    await expect(entete(page, 'Carte et portefeuilles')).toHaveAttribute('aria-expanded', 'false')
    await expect(entete(page, 'Autres moyens')).toHaveAttribute('aria-expanded', 'false')
    await expect(f.locator('.cl08-row', { hasText: 'Orange Money' })).toBeVisible()
    // En Mobile Money, « Autres moyens » propose le comptoir (R42) ; jamais le nom d'un intermédiaire.
    await entete(page, 'Autres moyens').click()
    await expect(f.locator('.cl08-row', { hasText: 'Payer au comptoir' })).toBeVisible()
    await expect(f).not.toContainText('CamPay')
    // Un toucher ouvre la carte et referme la section ouverte (une seule ouverte).
    await entete(page, 'Carte et portefeuilles').click()
    await expect(entete(page, 'Carte et portefeuilles')).toHaveAttribute('aria-expanded', 'true')
    await expect(entete(page, 'Mobile Money')).toHaveAttribute('aria-expanded', 'false')
    await expect(entete(page, 'Autres moyens')).toHaveAttribute('aria-expanded', 'false')
    for (const x of ['Apple Pay', 'Google Pay', 'Nouvelle carte Visa ou Mastercard']) await expect(f.locator('.cl08-row', { hasText: x })).toBeVisible()
    // Nouvelle carte (factice) : numéro, date, cryptogramme ; un champ faux est refusé avant tout paiement.
    await f.locator('.cl08-row', { hasText: 'Nouvelle carte' }).click()
    await f.getByLabel('Numéro de carte').fill('4111111111111111')
    await expect(f.getByLabel('Numéro de carte')).toHaveValue('4111 1111 1111 1111')
    await f.getByLabel('Expire fin').fill('1228')
    await expect(f.getByLabel('Expire fin')).toHaveValue('12/28')
    await f.locator('button.btn.primary').click()
    await expect(f).toContainText('Cryptogramme : les 3 chiffres au dos de la carte.')
    await expect(entete(page, 'Carte et portefeuilles')).toContainText('Carte bancaire')
    // Un second toucher referme ; par carte, jamais de comptoir (R42) : Wallet fermé, « Autres moyens » vide disparaît.
    await entete(page, 'Carte et portefeuilles').click()
    await expect(entete(page, 'Carte et portefeuilles')).toHaveAttribute('aria-expanded', 'false')
    await expect(f.locator('[data-section=autres]')).toHaveCount(0)
    await expect(f.locator('.pm-sec')).toHaveCount(2)
    await expect(f).not.toContainText('CamPay')
    await expect(f.locator('.cl07-tot')).toBeVisible()
    // Les couleurs suivent le thème : l'en-tête d'une section n'est jamais transparent sur fond transparent.
    const fond = await f.locator('.pm-sec').first().evaluate((e) => getComputedStyle(e).backgroundColor)
    expect(fond).not.toBe('rgba(0, 0, 0, 0)')
    await page.waitForTimeout(400) // fin de l’animation
    await page.screenshot({ path: `test-results/accordeon-${theme}-${w}.png` })
  })

test('accordéon : au comptoir, la section des cartes disparaît ; la section du moyen choisi s’ouvre', async ({ page }) => {
  await prepare(page, 'light', 390, 844)
  await garderCuiseur(page)
  await page.goto('/paiement-moyen')
  const f = feuille(page)
  await entete(page, 'Autres moyens').click()
  await f.locator('.cl08-row', { hasText: 'Payer au comptoir' }).click()
  await expect(f.locator('[data-section=carte]')).toHaveCount(0)
  await expect(entete(page, 'Autres moyens')).toContainText('Payer au comptoir')
})

test('accordéon : panier au-delà du plafond du comptoir, Wallet fermé : « Autres moyens » n’apparaît pas', async ({ page }) => {
  await prepare(page, 'light', 390, 844)
  await page.goto('/paiement-moyen')
  await expect(feuille(page).locator('.pm-sec')).toHaveCount(2)
  await expect(feuille(page).locator('[data-section=autres]')).toHaveCount(0)
})
