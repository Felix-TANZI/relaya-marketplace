// Transitions sans écran vide ni éclair (retour du porteur, 12 oct.) : en clair comme en sombre, le fond du thème est
// posé avant le premier rendu (index.html), et passer d'une page à l'autre ne vide jamais l'écran (la page ouverte
// reste jusqu'à ce que la suivante soit prête ; écrans préchargés). Un témoin posé avant le premier script note chaque
// fond vu et chaque instant où la racine n'a plus d'application.
import { expect, test } from '@playwright/test'

const FOND = { light: 'rgb(244, 246, 248)', dark: 'rgb(8, 9, 11)' }
const PARCOURS = ['direct', 'litige', 'commandes', 'escrow', 'kyc', 'paquets', 'zones', 'parametrage', 'journal', 'menu', 'profil', 'rapports', 'quatreyeux', 'support']

for (const theme of ['light', 'dark'] as const)
  test(`aucun écran vide ni éclair entre deux pages (${theme})`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 860 })
    await page.addInitScript((t) => {
      localStorage.setItem('blv_a_theme', t)
      const w = window as unknown as { __vides: string[]; __fonds: string[] }
      w.__vides = []
      w.__fonds = []
      const noter = () => {
        if (!document.body) return
        const f = getComputedStyle(document.documentElement).backgroundColor
        if (w.__fonds.at(-1) !== f) w.__fonds.push(f)
        const r = document.getElementById('root')
        // Avant le tout premier rendu, la racine est vide (fond du thème déjà posé) ; ensuite, jamais plus.
        if (r && r.dataset.vu && !r.querySelector('#app')) w.__vides.push(location.pathname)
        if (r && !r.dataset.vu && r.querySelector('#app')) r.dataset.vu = '1'
      }
      new MutationObserver(noter).observe(document, { subtree: true, childList: true, attributes: true })
    }, theme)
    await page.goto('./')
    await page.waitForSelector('#app main')
    for (const r of PARCOURS) {
      const lien = page.locator(`#app a[href="/admin/${r}"]`).first()
      if (await lien.count()) await lien.evaluate((a: HTMLAnchorElement) => a.click())
      else await page.evaluate((r) => (history.pushState({}, '', '/admin/' + r), dispatchEvent(new PopStateEvent('popstate'))), r)
      await expect(page).toHaveURL(new RegExp('/admin/' + r + '$'))
      await page.waitForSelector('#app main')
    }
    const { vides, fonds } = await page.evaluate(() => {
      const w = window as unknown as { __vides: string[]; __fonds: string[] }
      return { vides: [...new Set(w.__vides)], fonds: w.__fonds }
    })
    expect(vides, 'pages où l’écran s’est vidé').toEqual([])
    expect(fonds, 'fonds vus du premier rendu à la fin').toEqual([FOND[theme]])
  })

// En-tête en verre (retour du porteur) : le contenu qui passe dessous est flouté, en clair comme en sombre, au
// téléphone (en-tête) et à l'ordinateur (barre du haut) ; repli opaque prévu sans backdrop-filter (prototype.css).
for (const theme of ['light', 'dark'] as const)
  for (const largeur of [375, 1280])
    test(`en-tête en verre, ${theme}, ${largeur} px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 800 })
      await page.addInitScript((t) => localStorage.setItem('blv_a_theme', t), theme)
      await page.goto('litige')
      const h = page.locator(largeur > 1000 ? 'header.tb' : 'header.hd').first()
      await expect(h).toBeVisible()
      const s = await h.evaluate((e) => ({ f: getComputedStyle(e).backdropFilter, bg: getComputedStyle(e).backgroundColor }))
      expect(s.f).toMatch(/blur\((2\d|1\d)px\)/)
      // Alpha du fond, en rgba(…, a) comme en color(srgb r g b / a) (fond issu d'un color-mix).
      expect(Number(/(?:rgba\([^)]*,\s*|\/\s*)([\d.]+)\)/.exec(s.bg)?.[1] ?? 1)).toBeLessThan(0.9)
    })

// Interrupteurs (retour du porteur) : même taille éteint et allumé (la piste peinte ne déborde jamais dans la marge
// qui agrandit la cible) ; cible de 44 px au moins ; boutons pleins de même hauteur d'un écran à l'autre.
for (const theme of ['light', 'dark'] as const)
  test(`interrupteurs et boutons à la même mesure (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.addInitScript((t) => localStorage.setItem('blv_a_theme', t), theme)
    await page.goto('profil')
    await expect(page.locator('.tg.on').first()).toBeVisible()
    const m = await page.evaluate(() =>
      [...document.querySelectorAll('.tg')].map((e) => {
        const c = getComputedStyle(e)
        const r = e.getBoundingClientRect()
        return { on: e.classList.contains('on'), clip: c.backgroundClip, piste: `${c.width}×${c.height}`, cible: Math.min(r.width, r.height) }
      }),
    )
    expect(new Set(m.map((x) => x.on))).toEqual(new Set([true, false]))
    expect(new Set(m.map((x) => x.clip))).toEqual(new Set(['padding-box']))
    expect(new Set(m.map((x) => x.piste)).size).toBe(1)
    expect(Math.min(...m.map((x) => x.cible))).toBeGreaterThanOrEqual(44)
    const hauteurs = await page.evaluate(() => [...document.querySelectorAll('main .btn:not(.sm)')].filter((e) => !e.closest('.e-pouce,.dk-banner,.dk-head') && e.getBoundingClientRect().width).map((e) => Math.round(e.getBoundingClientRect().height)))
    expect(new Set(hauteurs)).toEqual(new Set([48]))
  })
