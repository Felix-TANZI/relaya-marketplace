// Bulle de verre de la barre du bas à 5 onglets (client, coins doux) pendant une vraie glisse au doigt (événements
// tactiles du navigateur, animations permises) : elle existe tout du long, suit le doigt, garde les coins doux, ne
// couvre pas plus d'un onglet et demi et ne sort jamais de l'écran (premier et dernier onglet, élan au-delà des bords).
// Au lâcher, l'onglet visé s'ouvre. Même contrôle à 375 et 430 px, clair et sombre, glisse lente et rapide.
import { expect, test, type Page } from '@playwright/test'

test.use({ hasTouch: true, isMobile: true })

async function preparer(page: Page, largeur: number, theme: 'light' | 'dark') {
  await page.setViewportSize({ width: largeur, height: 812 })
  await page.addInitScript((th) => {
    try {
      localStorage.setItem('blv_mouv', '1') // animations du vrai navigateur sous navigateur piloté
      localStorage.setItem('blv_c_theme', th)
    } catch {
      /* rien */
    }
  }, theme)
  await page.goto('/sauvegardes')
  await page.locator('nav.dock .tab.on').waitFor()
}

for (const largeur of [375, 430])
  for (const theme of ['light', 'dark'] as const)
    for (const vitesse of ['lente', 'rapide'] as const)
      test(`bulle à 5 onglets : suit le doigt, coins doux, dans l'écran (${largeur} px, ${theme}, glisse ${vitesse})`, async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'événements tactiles réels : Chromium')
        test.setTimeout(120_000) // une centaine de pas du doigt, mesurés un sur deux
        await preparer(page, largeur, theme)
        const cdp = await page.context().newCDPSession(page)
        const nav = (await page.locator('nav.dock').boundingBox())!
        const tabs = await page.locator('nav.dock > a.tab').evaluateAll((t) => t.map((e) => e.getBoundingClientRect()).map((r) => ({ c: r.x + r.width / 2, w: r.width })))
        expect(tabs).toHaveLength(5)
        const vers = (await page.locator('nav.dock > a.tab').nth(1).getAttribute('href'))!
        const y = nav.y + nav.height / 2
        const toucher = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
        const mesure = () =>
          page.evaluate(() => {
            const b = document.querySelector<HTMLElement>('nav.dock .dock-bulle')
            if (!b) return null
            const r = b.getBoundingClientRect()
            return { g: r.left, d: r.right, c: r.left + r.width / 2, w: r.width, h: r.height, rayon: parseFloat(b.style.borderRadius), simple: b.classList.contains('simple') }
          })
        // De Favoris (4e) jusqu'au bord gauche de l'écran, puis jusqu'au bord droit, puis lâcher sur Catégories.
        const pas = vitesse === 'lente' ? 6 : 18
        const attente = vitesse === 'lente' ? 24 : 12
        const parcours: number[] = []
        for (let x = tabs[3].c; x >= 2; x -= pas) parcours.push(x)
        for (let x = 2; x <= largeur - 2; x += pas) parcours.push(x)
        for (let x = largeur - 2; x >= tabs[1].c; x -= pas) parcours.push(x)
        parcours.push(tabs[1].c)
        await toucher('touchStart', tabs[3].c)
        let vues = 0
        for (const [i, x] of parcours.entries()) {
          await toucher('touchMove', x)
          await page.waitForTimeout(attente)
          if (i < 3 || (vitesse === 'lente' && i % 2)) continue
          const m = await mesure()
          expect(m, `bulle visible pendant la glisse (doigt à ${Math.round(x)} px)`).not.toBeNull()
          vues++
          expect(m!.simple).toBe(false)
          // Dans l'écran, toujours.
          expect(m!.g).toBeGreaterThanOrEqual(0)
          expect(m!.d).toBeLessThanOrEqual(largeur)
          // Coins doux : jamais une pilule, jamais un angle droit.
          expect(m!.rayon).toBeGreaterThanOrEqual(13)
          expect(m!.rayon).toBeLessThan(m!.h / 2 - 4)
          // Un onglet et demi au plus (élan compris).
          expect(m!.w).toBeLessThanOrEqual(tabs[0].w * 1.62)
        }
        expect(vues).toBeGreaterThan(5)
        // Doigt arrêté : la bulle le rattrape (glisse lente) et s'y centre, à quelques pixels près.
        await page.waitForTimeout(450)
        const fin = (await mesure())!
        expect(Math.abs(fin.c - tabs[1].c)).toBeLessThan(6)
        await toucher('touchEnd')
        await expect(page).toHaveURL((u) => u.pathname === vers)
        await expect(page.locator('nav.dock .tab[aria-current="page"]')).toHaveAttribute('href', vers)
        await expect(page.locator('nav.dock .dock-bulle')).toHaveCount(0, { timeout: 3000 })
      })
