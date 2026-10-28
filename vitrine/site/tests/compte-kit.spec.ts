// Compte (kit « compte » des quatre applications) côté client : la photo du compte Google reprise dans Mon profil
// (code SMS) puis visible dans l'en-tête ; retour « e-mail seulement » (appareil retenu : compte reconnu, photo
// affichée) ; lien de connexion reçu par e-mail. Comptes de démonstration seulement.
import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-13T09:15:00Z'))
})

async function sortir(page: Page) {
  await page.goto('/compte')
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await page.locator('.sheet').getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('photo du compte Google reprise avec un code : visible dans l’en-tête', async ({ page }) => {
  await page.goto('/profil?sheet=photo')
  await page.locator('[data-ck="photo-google"]').click()
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await page.getByLabel(/code/i).first().fill('503917')
  await page.getByRole('button', { name: 'Enregistrer mon profil' }).click()
  await expect(page).toHaveURL(/st=ok/)
  await page.goto('/')
  await expect(page.locator('header.hd img[src^="data:image/jpeg"]').first()).toBeVisible()
})

test('retour avec l’e-mail seulement : compte reconnu, photo affichée', async ({ page }) => {
  await sortir(page)
  await page.goto('/connexion-email')
  const carte = page.locator('[data-ck="reconnu"]')
  await expect(carte).toContainText('Bon retour, Carine')
  await expect(carte.locator('img')).toBeVisible()
  await carte.locator('[data-ck="continuer-reconnu"]').click()
  await expect(page).not.toHaveURL(/connexion/)
  await page.goto('/compte')
  await expect(page.locator('.cl13-pf h1')).toHaveText('Carine Mballa')
})

test('lien de connexion reçu par e-mail', async ({ page }) => {
  await sortir(page)
  await page.goto('/connexion-email')
  await page.locator('[data-ck="lien-magique"]').click()
  await page.locator('[data-ck="ouvrir-email"]').click()
  await page.locator('[data-ck="me-connecter-lien"]').click()
  await expect(page).not.toHaveURL(/connexion/)
  await page.goto('/compte')
  await expect(page.locator('.cl13-pf h1')).toHaveText('Carine Mballa')
})
