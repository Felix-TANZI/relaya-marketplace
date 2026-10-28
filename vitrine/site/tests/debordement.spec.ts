// Téléphone étroit (320 px) et texte agrandi au maximum (140 %) : aucune page ne défile en largeur, et rien (hors
// rangées qui défilent exprès) ne sort du bord droit de l'écran. Le texte agrandi élargit les contenus ; une pastille
// sur une ligne, une case de grille ou une rangée qui gardait la largeur de son contenu poussait la page.
// `main` défile en hauteur et coupe en largeur (overflow-x: hidden) : ce qui sort du bord droit y est rogné, sans
// défilement pour l'atteindre (compte, panier, catégories). Mesuré élément par élément : avec le zoom du texte
// (main > * { zoom }), scrollWidth de main compte aussi les rangées pleine largeur qui ne sortent pas de l'écran.
import { expect, test } from '@playwright/test'
const CLE = 'blv_c_echelle'
const ADRESSES = ['/', '/compte', '/panier', '/categories'] // accueil : rangées de produits (mention « Sponsorisé ») ; compte, panier, catégories

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
        localStorage.setItem('blv_c_text', 'tres') // comme le réglage de l'appareil : 140 % est de la famille « très grande »
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
      // Ce qui sort du bord droit sans être dans une rangée qui défile exprès (overflow-x auto/scroll).
      for (const e of Array.from(document.querySelectorAll('main *'))) {
        if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue
        const b = e.getBoundingClientRect()
        if (!b.width || b.right <= W + 0.5 || getComputedStyle(e).position === 'fixed') continue
        let defile = false
        // Décor vide (cercle, reflet) coupé exprès par sa carte (overflow: hidden) : rien à lire ni à toucher.
        const decor = !(e.textContent || '').trim() && !e.matches('a,button,input,select,textarea,img,svg,[role]') && !e.querySelector('a,button,input,img,svg')
        for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) {
          const o = getComputedStyle(x).overflowX
          if (o === 'auto' || o === 'scroll' || (decor && (o === 'hidden' || o === 'clip'))) {
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
