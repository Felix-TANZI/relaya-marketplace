// Première visite : le nouveau visiteur passe par le parcours d'accueil (lancement, ouverture, langue, centres
// d'intérêt, compte avec l'entrée diaspora), une seule fois par appareil.
import { expect, test } from '@playwright/test'

test('première visite : lancement, ouverture, bienvenue, intérêts, compte et diaspora ; puis accueil direct', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('pret')) {
      localStorage.clear()
      localStorage.setItem('blv_arrivee_test', '1')
      sessionStorage.setItem('pret', '1')
    }
  })
  await page.goto('/')
  await expect(page).toHaveURL(/\/lancement/)
  await expect(page).toHaveURL(/\/ouverture/, { timeout: 8000 })
  await expect(page.getByRole('link', { name: /Compte diaspora/ })).toBeVisible()
  await page.getByRole('link', { name: 'Commencer' }).click()
  await expect(page).toHaveURL(/\/bienvenue/)
  await page.getByRole('link', { name: 'Continuer' }).first().click()
  await expect(page).toHaveURL(/\/interets/)
  await page.getByRole('checkbox').first().click()
  await page.getByRole('button', { name: /^Continuer/ }).click()
  await expect(page).toHaveURL(/connexion\?lancement=1/)
  await expect(page.getByRole('link', { name: /Tu vis à l’étranger/ })).toBeVisible()
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
})
