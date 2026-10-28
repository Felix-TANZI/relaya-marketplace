// Un lien touché tout de suite après l'ouverture d'une page est suivi. Cause des échecs « au hasard » de gestes et
// listes-statut : le garde-fou du carrousel tiré à la souris partait de 0, et performance.now() part aussi de 0 au
// chargement ; tout clic des 80 premières millisecondes était donc annulé. Ici l'horloge de la page est tenue à
// 50 ms : le clic tombe toujours dans cette fenêtre, sans dépendre de la vitesse du poste ni de l'ordre des tests.
import { expect, test } from '@playwright/test'

test('un lien touché dans les premières millisecondes de la page est suivi', async ({ page }) => {
  await page.addInitScript(() => {
    performance.now = () => 50
  })
  await page.goto('/listes')
  await page.getByRole('link', { name: /Catégories/ }).first().click()
  await expect(page).toHaveURL(/\/categories$/)
})
