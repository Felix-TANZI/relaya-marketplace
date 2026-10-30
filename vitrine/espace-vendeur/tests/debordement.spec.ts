// Téléphone étroit (320 px) et texte agrandi au maximum (140 %) : aucune page ne défile en largeur, et rien (hors
// rangées qui défilent exprès) ne sort du bord droit de l'écran. Le texte agrandi élargit les contenus ; une pastille
// sur une ligne, une case de grille ou une rangée qui gardait la largeur de son contenu poussait la page.
// `main` défile en hauteur et coupe en largeur (overflow-x: hidden) : un contenu plus large que lui serait rogné, sans
// défilement pour l'atteindre (onglets « Problèmes », tri « Le plus vendu », boutons sur une ligne).
import { expect, test } from '@playwright/test'
const CLE = 'blv_v_echelle'
const ADRESSES = ['./', 'commandes', 'produits', 'boutique'] // accueil : cartes « Votre activité », tableau de bord ; onglets, tri, boutons

test.describe.configure({ mode: 'parallel' })
for (const a of ADRESSES)
  test(`320 px, texte à 140 % : rien ne déborde en largeur (${a})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await page.addInitScript((k) => {
      try {
        if (!sessionStorage.getItem('blv_deb_test')) {
          localStorage.clear()
          sessionStorage.setItem('blv_deb_test', '1')
        }
        localStorage.setItem(k, '140')
      } catch {
        /* rien */
      }
    }, CLE)
    await page.goto(a)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('html')).toHaveAttribute('data-echelle', '140')
    const ecarts = await page.evaluate(() => {
      const se = document.scrollingElement!
      const W = se.clientWidth
      const out: string[] = []
      if (se.scrollWidth > W) out.push(`la page défile de ${se.scrollWidth - W} px`)
      const main = document.querySelector('main')!
      if (main.scrollWidth > main.clientWidth) out.push(`main rogne ${main.scrollWidth - main.clientWidth} px de contenu`)
      // Ce qui sort du bord droit sans être dans une rangée qui défile exprès (overflow-x auto/scroll).
      for (const e of Array.from(document.querySelectorAll('main *'))) {
        if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue
        const b = e.getBoundingClientRect()
        if (!b.width || b.right <= W + 0.5 || getComputedStyle(e).position === 'fixed') continue
        let defile = false
        for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) {
          const o = getComputedStyle(x).overflowX
          if (o === 'auto' || o === 'scroll') {
            defile = true
            break
          }
        }
        const p = e.parentElement!.getBoundingClientRect()
        if (!defile && p.right <= W + 0.5) out.push(`${e.tagName.toLowerCase()}.${(e.getAttribute('class') || '').trim().split(/\s+/).join('.')} dépasse de ${Math.round(b.right - W)} px`)
      }
      return out
    })
    expect(ecarts).toEqual([])
  })
