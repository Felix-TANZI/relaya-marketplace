// Première visite : le nouveau visiteur passe par le parcours d'accueil (ouverture, langue, centres
// d'intérêt, compte avec l'entrée diaspora), une seule fois par appareil.
import { expect, test } from '@playwright/test'

test('première visite : ouverture, bienvenue, intérêts, compte et diaspora ; puis accueil direct', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('pret')) {
      localStorage.clear()
      localStorage.setItem('blv_arrivee_test', '1')
      sessionStorage.setItem('pret', '1')
    }
  })
  await page.goto('/')
  // Plus d'écran d'ouverture animé : l'écran « Ouverture » tout de suite (l'ancienne adresse y mène aussi).
  await expect(page).toHaveURL(/\/ouverture/)
  await expect(page.locator('.blv-spl')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Compte diaspora/ })).toBeVisible()
  await page.getByRole('link', { name: 'Commencer' }).click()
  await expect(page).toHaveURL(/\/bienvenue/)
  await page.getByRole('link', { name: 'Continuer' }).first().click()
  await expect(page).toHaveURL(/\/interets/)
  await page.getByRole('checkbox').first().click()
  await page.getByRole('button', { name: /^Continuer/ }).click()
  await expect(page).toHaveURL(/connexion\?lancement=1/)
  // Les deux chemins d'emblée ; la diaspora est un des deux profils de « Créer un compte ».
  await page.getByRole('link', { name: 'Créer un compte' }).click()
  await expect(page.getByRole('link', { name: /À l’étranger \(diaspora\)/ })).toBeVisible()
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
})
