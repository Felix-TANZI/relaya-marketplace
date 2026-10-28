// Marque sonore du livreur (src/composants/marque-sonore.ts, signaux.ts) : chaque geste clé demande le bon son. Le
// module est mis en mode « enregistrement » (rien ne joue, chaque son demandé est noté). Tableau : logique-metier/SONS.md.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const sons = (page: Page) => page.evaluate(() => ((window as unknown as { __blvSons?: { action: string; son: string; appli: string }[] }).__blvSons ?? []).map((x) => `${x.appli}.${x.action}:${x.son}`))

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
  await page.addInitScript(() => void ((window as unknown as { __BLV_SONS__: string }).__BLV_SONS__ = 'enregistrer'))
})

test('rien au chargement ; SOS par appui long : l’alerte grave ; aperçu dans les réglages', async ({ page }) => {
  await ouvrir(page, '#aide?s=sos', FR)
  const sos = page.locator('.l10-sosb')
  await expect(sos).toBeVisible()
  expect(await sons(page)).toEqual([])
  await sos.hover()
  await page.mouse.down()
  await page.waitForTimeout(2300)
  await page.mouse.up()
  await expect(page.locator('#app main')).toContainText('SOS en cours · depuis')
  await expect.poll(() => sons(page)).toContain('livreur.sos:urgence')

  await ouvrir(page, '#reglages?voir=confort', FR)
  await page.getByText('Écouter les sons').click()
  await page.locator('[data-son="nouveau"]').click()
  await page.locator('[data-son="deverrouille"]').click()
  await expect(page.locator('[data-son="nouveau"]')).toContainText('Nouveau paquet affecté')
  await expect.poll(() => sons(page)).toEqual(['livreur.nouveauPaquet:nouveau', 'livreur.codeValide:deverrouille'])
})
