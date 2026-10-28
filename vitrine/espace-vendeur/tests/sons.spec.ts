// Marque sonore du vendeur (src/composants/marque-sonore.ts, sons.ts) : chaque geste clé demande le bon son. Le module
// est mis en mode « enregistrement » (rien ne joue, chaque son demandé est noté). Tableau : logique-metier/SONS.md.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const sons = (page: Page) => page.evaluate(() => ((window as unknown as { __blvSons?: { action: string; son: string; appli: string }[] }).__blvSons ?? []).map((x) => `${x.appli}.${x.action}:${x.son}`))

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
  await page.addInitScript(() => void ((window as unknown as { __BLV_SONS__: string }).__BLV_SONS__ = 'enregistrer'))
})

test('rien au chargement ; « C’est prêt » validé ; nouvelle commande et versement dans l’aperçu', async ({ page }) => {
  await ouvrir(page, '#accueil', FR)
  await expect(page.locator('.hero.orange')).toBeVisible()
  expect(await sons(page)).toEqual([])
  await page.locator('.hero.orange').getByText('C’est prêt').click()
  await expect(page).toHaveURL(/commande_prete/)
  await expect.poll(() => sons(page)).toEqual(['vendeur.cestPret:valide'])

  await ouvrir(page, '#parametres', FR)
  await page.getByText('Écouter le son', { exact: true }).click()
  await page.getByText('Écouter les sons').click()
  await page.locator('[data-son="versement"]').click()
  await expect(page.locator('[data-son="commande"]')).toContainText('Nouvelle commande')
  await expect.poll(() => sons(page)).toEqual(['vendeur.nouvelleCommande:commande', 'vendeur.versementRecu:versement'])
})
