// Panier : glisser une ligne d'article (composants/Glisser.tsx). Vers la gauche : « Supprimer » (retrait annulable,
// comme le bouton corbeille) ; vers la droite : « Mettre en favori » (comme le bouton de la ligne). Sous le seuil,
// la ligne revient en place sans rien changer. Glissé à la souris (le même geste qu'au doigt).
import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/panier')
  await expect(page.locator('.pan-gl').first()).toBeVisible()
})

async function glisser(page: Page, index: number, dx: number) {
  const ligne = page.locator('.pan-gl .gl-av').nth(index)
  await ligne.scrollIntoViewIfNeeded()
  const b = (await ligne.boundingBox())!
  const x = b.x + b.width / 2
  const y = b.y + Math.min(40, b.height / 2)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y, { steps: 12 })
  await page.mouse.up()
}

const titre = (page: Page, index: number) => page.locator('.pan-gl .cn').nth(index).innerText()

test('sous le seuil, la ligne revient en place et rien ne change', async ({ page }) => {
  const n = await page.locator('.pan-gl').count()
  const t0 = await titre(page, 0)
  await glisser(page, 0, -40)
  await expect(page.locator('.pan-gl')).toHaveCount(n)
  expect(await titre(page, 0)).toBe(t0)
  await expect(page.locator('.pan-gl .gl-av').first()).not.toHaveAttribute('style', /translate/)
})

test('glisser à gauche retire l’article (annulable)', async ({ page }) => {
  const n = await page.locator('.pan-gl').count()
  const t0 = await titre(page, 0)
  await glisser(page, 0, -260)
  await expect(page.locator('.pan-gl')).toHaveCount(n - 1)
  await expect(page.locator('.pan-gl .cn', { hasText: t0 })).toHaveCount(0)
  await expect(page.getByText('retiré du panier').first()).toBeVisible()
  await page.getByRole('button', { name: 'Annuler' }).click()
  await expect(page.locator('.pan-gl')).toHaveCount(n)
})

test('glisser à droite met l’article en favori', async ({ page }) => {
  const n = await page.locator('.pan-gl').count()
  const t0 = await titre(page, 0)
  await glisser(page, 0, 260)
  await expect(page.locator('.pan-gl')).toHaveCount(n - 1)
  await expect(page.getByText('mis en favori').first()).toBeVisible()
  await expect(page.locator('.cl07-sv', { hasText: t0 }).first()).toBeVisible()
})
