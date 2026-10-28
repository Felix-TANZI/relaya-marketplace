// Marque sonore du point relais (src/composants/marque-sonore.ts, signaux.ts) : chaque geste clé demande le bon son. Le
// module est mis en mode « enregistrement » (rien ne joue, chaque son demandé est noté). Tableau : logique-metier/SONS.md.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const RENDU = { nom: 'clair', theme: 'light' as const, lang: 'fr' as const }
const PIN = '240913'
const PHOTO = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }
const sons = (page: Page) => page.evaluate(() => ((window as unknown as { __blvSons?: { action: string; son: string; appli: string }[] }).__blvSons ?? []).map((x) => `${x.appli}.${x.action}:${x.son}`))

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
  await page.addInitScript(() => void ((window as unknown as { __BLV_SONS__: string }).__BLV_SONS__ = 'enregistrer'))
})

test('retrait : code juste, encaissement, photo, remise réussie ; aperçu dans les paramètres', async ({ page }) => {
  await ouvrir(page, '#retrait', RENDU)
  await expect(page.getByText('Code de retrait présenté par le client')).toBeVisible()
  expect(await sons(page)).toEqual([])
  await page.getByText(/Démonstration\s:\sle client présente son QR/).click()
  await page.getByRole('button', { name: /Mireille A\./ }).first().click()
  await expect(page.getByText('✓ Code correct')).toBeVisible()
  await expect.poll(() => sons(page)).toContain('relais.codeValide:deverrouille')
  await page.getByRole('button', { name: 'Compte juste' }).click()
  await expect.poll(() => sons(page)).toContain('relais.encaissement:paiement')
  await page.locator('main input[type=file]').first().setInputFiles(PHOTO)
  await expect.poll(() => sons(page)).toContain('relais.photo:photo')
  await page.getByRole('button', { name: 'Remis', exact: true }).click()
  for (const k of PIN) await page.getByRole('button', { name: k, exact: true }).click()
  await expect(page.getByText('Colis retiré')).toBeVisible()
  await expect.poll(() => sons(page)).toContain('relais.remiseReussie:remise')
  expect(await sons(page)).not.toContain('relais.erreur:erreur')

  await ouvrir(page, '#parametres', RENDU)
  await page.getByText('Écouter les sons').click()
  await page.locator('[data-son="scan"]').click()
  await expect(page.locator('[data-son="scan"]')).toContainText('Colis reçu (scan accepté)')
  await expect.poll(() => sons(page)).toEqual(['relais.colisRecu:scan'])
})
