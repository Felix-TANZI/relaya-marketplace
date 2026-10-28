// Marque sonore du client (src/composants/marque-sonore.ts, Sons.ts) : chaque geste clé demande le bon son. Le module
// est mis en mode « enregistrement » (rien ne joue, chaque son demandé est noté). Tableau : logique-metier/SONS.md.
import { expect, test, type Page } from '@playwright/test'

const sons = (page: Page) => page.evaluate(() => ((window as unknown as { __blvSons?: { action: string; son: string; retenu: boolean }[] }).__blvSons ?? []).map((x) => `${x.action}:${x.son}`))

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => void ((window as unknown as { __BLV_SONS__: string }).__BLV_SONS__ = 'enregistrer'))
})

test('rien au chargement ; ajout au panier, favori ; aperçu des sons ; « Sons » coupé : silence', async ({ page }) => {
  await page.goto('/liste?cat=tel')
  await expect(page.locator('.pcard').first()).toBeVisible()
  expect(await sons(page)).toEqual([])
  await page.locator('.pcard').first().getByRole('button', { name: /Ajouter au panier/ }).click()
  await expect.poll(() => sons(page)).toEqual(['panier:panier'])
  await page.locator('.pcard').nth(1).getByRole('button', { name: 'Ajouter aux favoris' }).click()
  await expect.poll(() => sons(page)).toEqual(['panier:panier', 'favori:favori'])

  await page.goto('/reglages')
  await page.getByText('Écouter les sons').click()
  await expect(page.locator('[data-son]').first()).toBeVisible()
  await page.locator('[data-son="paiement"]').click()
  await page.locator('[data-son="colis"]').click()
  await expect.poll(() => sons(page)).toEqual(['paiement:paiement', 'colisAuRelais:colis'])
  await expect(page.locator('[data-son="colis"]')).toContainText('Colis arrivé au relais')
  await expect(page.locator('[data-son="colis"]')).toContainText('Nouveauté, arrivée')

  await page.getByRole('switch', { name: 'Sons', exact: true }).click() // le tic de l'interrupteur, puis plus rien
  await page.locator('[data-son="paiement"]').click()
  await page.goto('/liste?cat=tel')
  await page.locator('.pcard').first().getByRole('button', { name: /Ajouter au panier/ }).click()
  await page.waitForTimeout(300)
  expect(await sons(page)).toEqual([])
})
