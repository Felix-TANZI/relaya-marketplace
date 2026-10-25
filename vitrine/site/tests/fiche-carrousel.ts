// Fiche produit (consigne du porteur) : l'image principale se balaie au doigt d'une photo à l'autre (accrochage photo
// par photo, points et vignettes synchronisés) ; le badge « Certifié » posé sur la photo garde la largeur de son texte
// (Safari l'élargissait). Partagé par fiche-carrousel.spec.ts (Chromium tactile) et fiche-carrousel-webkit.spec.ts.
import { expect, type Page } from '@playwright/test'

export const LARGEURS = [375, 390, 430]

export async function ouvrirFiche(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    localStorage.setItem('blv_c_theme', t)
    localStorage.setItem('blv_c_lang', 'fr')
  }, theme)
  await page.goto('/fiche')
  await expect(page.locator('.fp-piste .fp-slide')).toHaveCount(4)
}

/** Le badge reste une pastille : moins de 60 % de la largeur de la photo, une seule ligne. */
export async function badgeEtroit(page: Page) {
  const m = await page.evaluate(() => {
    const c = document.querySelector('.fp-cert')!.getBoundingClientRect()
    const p = document.querySelector('.fp-main')!.getBoundingClientRect()
    return { ratio: c.width / p.width, h: c.height, droite: p.right - c.right }
  })
  expect(m.ratio).toBeLessThan(0.6)
  expect(m.h).toBeLessThan(30)
  expect(m.droite).toBeGreaterThan(4)
}

/** Après le balayage : la photo 2 est affichée, vignette et point suivent. */
export async function photo2(page: Page) {
  await expect.poll(() => page.locator('.fp-piste').evaluate((el) => Math.round(el.scrollLeft / el.clientWidth))).toBe(1)
  await expect(page.locator('.fp-th button').nth(1)).toHaveClass(/\bon\b/)
  await expect(page.locator('.fp-pts i').nth(1)).toHaveClass(/\bon\b/)
  await expect(page.locator('.fp-slide').nth(1)).not.toHaveAttribute('aria-hidden', 'true')
}
