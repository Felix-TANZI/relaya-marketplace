// Transitions entre écrans (retour du porteur : « un écran noir s'affiche quelques millisecondes ») : à chaque image
// pendant un changement d'écran, l'application montre un écran (un <main> rempli, opaque) et le fond de la page est
// celui du thème — jamais une image vide, transparente ou noire en clair, jamais un éclair clair la nuit. Les
// mouvements sont laissés libres (pas de reducedMotion) : l'entrée des pages est mesurée telle que le gérant la voit.
import { expect, test, type Page } from '@playwright/test'

const PARCOURS = [
  { de: './', lien: /Réception/ },
  { de: 'reception', lien: /Retrait/ },
  { de: 'retrait', lien: /Stock/ },
  { de: 'stock', lien: /Aujourd’hui/ },
]

async function sonde(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __img: { vide: number; pale: number; squelette: number; fond: string[]; n: number }; __stop: boolean }
    w.__img = { vide: 0, pale: 0, squelette: 0, fond: [], n: 0 }
    w.__stop = false
    const tour = () => {
      if (w.__stop) return
      const m = document.querySelector('#app main') as HTMLElement | null
      const premier = m?.firstElementChild as HTMLElement | null
      w.__img.n++
      // Écran vide : ni <main>, ni contenu, ni squelette de chargement (une lecture de données dure une image ou deux).
      if (!m || (!m.innerText.trim() && !m.querySelector('.r-charge, [role=status], svg, img'))) w.__img.vide++
      else if (m.querySelector('.r-charge')) w.__img.squelette++
      else if (premier && Number(getComputedStyle(premier).opacity) < 0.6) w.__img.pale++
      const f = getComputedStyle(document.body).backgroundColor
      if (!w.__img.fond.includes(f)) w.__img.fond.push(f)
      requestAnimationFrame(tour)
    }
    requestAnimationFrame(tour)
  })
}

for (const theme of ['light', 'dark'] as const)
  test(`transitions sans écran vide (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('t')) (localStorage.clear(), sessionStorage.setItem('t', '1'))
        localStorage.setItem('blv_mouv', '1') // mouvements libres sous navigateur piloté
      } catch {
        /* rien */
      }
    })
    await page.goto('./')
    await expect(page.locator('#app main')).toBeVisible()
    // Thème posé avant le premier rendu : l'attribut est déjà celui du téléphone au premier script de l'appli.
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme)
    for (const p of PARCOURS) {
      await page.goto(p.de)
      await expect(page.locator('#app main')).toBeVisible()
      await page.waitForTimeout(400)
      await sonde(page)
      const avant = page.url()
      await page.locator('nav.dock, .dock').getByRole('link', { name: p.lien }).first().click()
      await expect(page).not.toHaveURL(avant)
      await page.waitForTimeout(700)
      const img = await page.evaluate(() => {
        const w = window as unknown as { __img: { vide: number; pale: number; squelette: number; fond: string[]; n: number }; __stop: boolean }
        w.__stop = true
        return w.__img
      })
      expect(img.n, 'images observées').toBeGreaterThan(5)
      expect(img.vide, `images sans écran (${p.de} → ${page.url()})`).toBe(0)
      expect(img.squelette, `images de chargement (${p.de})`).toBeLessThanOrEqual(3)
      expect(img.pale, `images où l'écran est presque transparent (${p.de})`).toBe(0)
      expect(img.fond, 'fond de la page constant').toHaveLength(1)
      const [r, g, b] = img.fond[0].match(/\d+/g)!.map(Number)
      const lum = (r + g + b) / 3
      if (theme === 'light') expect(lum, 'fond clair').toBeGreaterThan(200)
      else expect(lum, 'fond sombre').toBeLessThan(40)
    }
  })
