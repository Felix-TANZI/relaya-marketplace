// Carrousel de la fiche produit au doigt (Chromium tactile) ; voir tests/fiche-carrousel.ts.
import { expect, test } from '@playwright/test'
import { LARGEURS, badgeEtroit, ouvrirFiche, photo2 } from './fiche-carrousel'

test.use({ isMobile: true, hasTouch: true })

for (const theme of ['light', 'dark'] as const)
  for (const largeur of LARGEURS)
    test(`fiche · balayage au doigt vers la photo 2, badge étroit (${largeur} px, ${theme})`, async ({ page, context }) => {
      await page.setViewportSize({ width: largeur, height: 860 })
      await ouvrirFiche(page, theme)
      await badgeEtroit(page)
      const b = (await page.locator('.fp-piste').boundingBox())!
      const cdp = await context.newCDPSession(page)
      await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(b.x + b.width * 0.8), y: Math.round(b.y + b.height / 2), xDistance: -Math.round(b.width * 0.7), yDistance: 0, gestureSourceType: 'touch', speed: 1200 })
      await photo2(page)
      await badgeEtroit(page)
    })

test('fiche · vignette, flèches du clavier et points synchronisés', async ({ page }) => {
  await ouvrirFiche(page, 'light')
  await page.getByRole('button', { name: 'Photo 3' }).click()
  await expect.poll(() => page.locator('.fp-piste').evaluate((el) => Math.round(el.scrollLeft / el.clientWidth))).toBe(2)
  await expect(page.locator('.fp-pts i').nth(2)).toHaveClass(/\bon\b/)
  await page.locator('.fp-piste').focus()
  await page.keyboard.press('ArrowLeft')
  await photo2(page)
})
