// Hors connexion, un préchargement manqué (vite:preloadError) ne recharge pas la page : recharger sans réseau
// remplacerait l'application par la page d'erreur du navigateur (src/main.tsx).
import { expect, test } from '@playwright/test'

test('hors connexion : un préchargement manqué ne recharge pas la page, l’application reste ouverte', async ({ page, context }) => {
  await page.goto('./')
  await page.waitForSelector('#root *', { state: 'attached' })
  await page.evaluate(() => ((window as unknown as { temoin: number }).temoin = 1))
  await context.setOffline(true)
  const empeche = await page.evaluate(() => {
    const e = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(e)
    return e.defaultPrevented
  })
  expect(empeche).toBe(true)
  await page.waitForTimeout(500)
  // Même document (pas de rechargement) et l'application toujours affichée.
  expect(await page.evaluate(() => (window as unknown as { temoin?: number }).temoin)).toBe(1)
  expect(page.url()).not.toContain('chrome-error')
  await expect(page.locator('#root')).not.toBeEmpty()
  await context.setOffline(false)
})
