// Marque sonore de l'entreprise (src/composants/marque-sonore.ts) : chaque geste clé demande le bon son. Le module est
// mis en mode « enregistrement » (rien ne joue, chaque son demandé est noté). Tableau : logique-metier/SONS.md.
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

const sons = (page: Page) => page.evaluate(() => ((window as unknown as { __blvSons?: { action: string; son: string; appli: string }[] }).__blvSons ?? []).map((x) => `${x.appli}.${x.action}:${x.son}`))

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addInitScript(() => void ((window as unknown as { __BLV_SONS__: string }).__BLV_SONS__ = 'enregistrer'))
})

test('rien au chargement ; paquet accepté puis affecté ; incident et alerte grave dans l’aperçu', async ({ page }) => {
  await ouvrir(page, adresse('paquet', 'id=PQ-Z3-261013-009'), FR)
  await expect(page.getByRole('button', { name: 'Accepter', exact: true })).toBeVisible()
  expect(await sons(page)).toEqual([])
  await page.getByRole('button', { name: 'Accepter', exact: true }).click()
  await expect(page.getByText(/Paquet accepté\s:\sla rémunération/)).toBeVisible()
  await expect.poll(() => sons(page)).toEqual(['entreprise.paquetAccepte:valide'])
  await page.getByRole('link', { name: 'Affecter un livreur' }).first().click()
  await page.getByRole('button', { name: 'Affecter Brice N.' }).first().click()
  await expect(page.getByText(/Brice N\. est affecté/)).toBeVisible({ timeout: 10_000 })
  await expect.poll(() => sons(page)).toContain('entreprise.paquetAffecte:remise')

  await ouvrir(page, adresse('parametres'), FR)
  await page.getByText('Écouter les sons').click()
  await page.locator('[data-son="urgence"]').click()
  await expect(page.locator('[data-son="urgence"]')).toContainText('Incident de sécurité')
  await expect(page.locator('[data-son="nouveau"]')).toContainText('Nouveau paquet à accepter')
  await expect.poll(() => sons(page)).toEqual(['entreprise.incidentSecurite:urgence'])
})
