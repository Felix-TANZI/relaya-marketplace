// Téléphone étroit (320 px) et texte agrandi au maximum (140 %) : aucune page ne défile en largeur, et rien (hors
// rangées qui défilent exprès) ne sort du bord droit de l'écran. Le texte agrandi élargit les contenus ; une pastille
// sur une ligne, une case de grille ou une rangée qui gardait la largeur de son contenu poussait la page.
import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { adresse } from './commun'
const CLE = 'blv_l_echelle'
const PAGES: { route: string }[] = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const ADRESSES = [...new Set(PAGES.map((p) => adresse(p.route)))]

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
      // Ce qui sort du bord droit sans être dans une rangée qui défile exprès (overflow-x auto/scroll) ni dans un cadre
      // qui le coupe (overflow hidden ou clip : filigrane de la photo des pages d'accès, qui ne pousse rien).
      for (const e of Array.from(document.querySelectorAll('main *'))) {
        if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue
        const b = e.getBoundingClientRect()
        if (!b.width || b.right <= W + 0.5 || getComputedStyle(e).position === 'fixed') continue
        let defile = false
        for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) {
          const o = getComputedStyle(x).overflowX
          if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') {
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
