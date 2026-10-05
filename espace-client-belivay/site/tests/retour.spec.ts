// Bouton « Revenir » avec mémoire : il ramène à la page où l'on était juste avant, pas à un parent fixe ; sans page
// précédente dans la visite (lien ouvert directement), il mène au parent logique.
import { expect, test } from '@playwright/test'

test('retour : la flèche ramène à la page précédente de la visite', async ({ page }) => {
  await page.goto('/')
  await page.locator('nav.dock a', { hasText: 'Favoris' }).click()
  await expect(page).toHaveURL(/\/sauvegardes$/)
  await page.getByRole('link', { name: /Listes d’envies/ }).first().click()
  await expect(page).toHaveURL(/\/listes/)
  await page.getByRole('link', { name: 'Revenir' }).first().click()
  await expect(page).toHaveURL(/\/sauvegardes$/)
})

test('retour : sans page précédente, le parent logique', async ({ page }) => {
  await page.goto('/cotisation')
  const avant = page.url()
  await page.getByRole('link', { name: 'Revenir' }).first().click()
  await expect(page).not.toHaveURL(avant)
})
