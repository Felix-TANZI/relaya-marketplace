// Grands écrans (DISPOSITION-ECRANS.md § 9, lot 16) : contrôles de la coque posée par les lots 0 à 4.
// Les tests du téléphone (identique, squelette, gestes…) ne bougent pas ; ceux-ci s'ajoutent.
// - aucun défilement horizontal, sur toutes les routes ouvertes, de 600 à 1920 px ;
// - coque attendue : un seul en-tête de site dès 768, barre du bas sous 1024 seulement, barre de navigation dès
//   1024, pied de page dès 768, aucun lien vers une adresse inconnue dans l'en-tête, la navigation et le pied ;
// - feuilles : modale centrée, tiroir à droite dès 1024, focus dedans, Échap qui ferme ;
// - menus : menu du profil et panneau des notifications ancrés sous l'en-tête, Échap qui ferme ; méga-menu ;
// - raccourci « / » vers la recherche de l'en-tête ;
// - rendus : clair et sombre à 1440, anglais à 1280, très grande taille du texte à 1280.
// Chaque lot d'écrans y ajoute ses routes (gabarits, asides collants, barres masquées dès 1024).
import { COORDONNEES } from '../src/config/coordonnees'
import { expect, test, type Page } from '@playwright/test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

interface P {
  route: string
  interrupteur: string | null
}
const PAGES: P[] = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
const INTERRUPTEURS: Record<string, boolean> = JSON.parse(readFileSync(new URL('../src/config/interrupteurs.json', import.meta.url), 'utf-8'))
const OUVERTES = PAGES.filter((p) => !p.interrupteur || INTERRUPTEURS[p.interrupteur])
const PAGES_SITE: string[] = readdirSync(new URL('../src/pages/', import.meta.url), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(new URL(`../src/pages/${d.name}/pages-site.json`, import.meta.url)))
  .flatMap((d) => JSON.parse(readFileSync(new URL(`../src/pages/${d.name}/pages-site.json`, import.meta.url), 'utf-8')).routes as string[])
const ROUTES = [...new Set([...OUVERTES.map((p) => p.route), ...PAGES_SITE])]
// Coordonnées officielles de BelivaY (réseaux sociaux, téléphone, e-mail) : liens sortants attendus du pied de page.
const OFFICIELS = new Set([...COORDONNEES.reseaux.map((r) => r.url), COORDONNEES.telephoneLien, 'mailto:' + COORDONNEES.email])
const CHEMINS = new Set(ROUTES.map((r) => (r === 'accueil' ? '/' : '/' + r)))
const chemin = (r: string) => (r === 'accueil' ? '/' : '/' + r)

const TAILLES = [
  [600, 960],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
] as const

async function prepare(page: Page, o: { theme?: string; lang?: string; text?: string } = {}) {
  await page.addInitScript(
    ([t, l, x]) => {
      localStorage.setItem('blv_c_theme', t)
      localStorage.setItem('blv_c_lang', l)
      localStorage.setItem('blv_c_text', x)
    },
    [o.theme ?? 'light', o.lang ?? 'fr', o.text ?? 'normale'],
  )
}

function erreurs(page: Page) {
  const liste: string[] = []
  page.on('pageerror', (e) => liste.push('exception : ' + e.message))
  page.on('console', (m) => m.type() === 'error' && liste.push('console : ' + m.text()))
  return liste
}

// Débordements : la page, main, et tout élément visible qui dépasse la fenêtre de plus d'un pixel sans être rogné
// par un ancêtre qui défile (rails horizontaux, carrousels) ou qui masque son contenu.
async function debordements(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('#app main')
    const W = window.innerWidth
    const dehors: string[] = []
    for (const e of document.querySelectorAll<HTMLElement>('#app *')) {
      const r = e.getBoundingClientRect()
      if (!r.width || !r.height || r.right <= W + 1) continue
      const cs = getComputedStyle(e)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      let rogne = false
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX
        if (ox !== 'visible' && a.getBoundingClientRect().right <= W + 1) {
          rogne = true
          break
        }
      }
      if (!rogne) dehors.push(`${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} → ${Math.round(r.right)}`)
    }
    return {
      page: document.documentElement.scrollWidth - W,
      main: main ? main.scrollWidth - main.clientWidth : 0,
      dehors: dehors.slice(0, 5),
    }
  })
}

test.describe('aucun défilement horizontal', () => {
  for (const r of ROUTES) {
    test(r, async ({ page }) => {
      const errs = erreurs(page)
      await prepare(page)
      for (const [w, h] of TAILLES) {
        await page.setViewportSize({ width: w, height: h })
        await page.goto(chemin(r))
        await expect(page.locator('#app main')).toBeVisible()
        const d = await debordements(page)
        expect(d.page, `${r} à ${w} px : défilement de la page`).toBeLessThanOrEqual(0)
        expect(d.main, `${r} à ${w} px : défilement de main`).toBeLessThanOrEqual(0)
        expect(d.dehors, `${r} à ${w} px : éléments hors de la fenêtre`).toEqual([])
      }
      expect(errs).toEqual([])
    })
  }
})

test.describe('coque des grands écrans', () => {
  // Pages à en-tête racine et enfant (accueil, compte, commande, adresses, fiche).
  for (const r of ['accueil', 'compte', 'commande', 'adresses', 'fiche', 'panier']) {
    test(`en-tête, navigation et pied de page : ${r}`, async ({ page }) => {
      const errs = erreurs(page)
      await prepare(page)
      for (const [w, h] of TAILLES) {
        await page.setViewportSize({ width: w, height: h })
        await page.goto(chemin(r))
        await expect(page.locator('#app main')).toBeVisible()
        const site = page.locator('header.hd-site')
        if (w >= 768) {
          await expect(site).toHaveCount(1)
          await expect(page.locator('header.hd:not(.hd-site)')).toHaveCount(0)
          await expect(page.locator('#app main > footer.pied')).toHaveCount(1)
        } else {
          await expect(site).toHaveCount(0)
          await expect(page.locator('footer.pied')).toHaveCount(0)
        }
        await expect(page.locator('nav.hd-nav')).toHaveCount(w >= 1024 ? 1 : 0)
        if (w >= 1024) await expect(page.locator('nav.dock')).toHaveCount(0)
      }
      // Liens de la coque : aucun vers une adresse inconnue.
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto(chemin(r))
      await expect(page.locator('footer.pied')).toHaveCount(1)
      const liens = await page.locator('header.hd-site a[href], footer.pied a[href], #app > .evitement').evaluateAll((l) => l.map((a) => a.getAttribute('href') || ''))
      const inconnus = liens.filter((x) => x !== '#contenu' && !/^https:\/\/wa\.me\//.test(x) && !OFFICIELS.has(x) && !(x.startsWith('/') && CHEMINS.has(x.split('?')[0])))
      expect(inconnus, 'liens vers une adresse inconnue').toEqual([])
      expect(errs).toEqual([])
    })
  }

  test('barre du bas : capsule en tablette portrait, remplacée par la navigation dès 1024', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    const dock = page.locator('nav.dock')
    await expect(dock).toBeVisible()
    const b = (await dock.boundingBox())!
    expect(b.width).toBeLessThanOrEqual(520)
    expect(Math.abs(b.x + b.width / 2 - 384)).toBeLessThanOrEqual(1)
    await page.setViewportSize({ width: 1024, height: 768 })
    await expect(page.locator('nav.dock')).toHaveCount(0)
    await expect(page.locator('nav.hd-nav a.hn[aria-current="page"]')).toContainText('Accueil')
  })

  test('barre de navigation : capsule de verre ; la bulle suit le survol, se fait glisser et navigue au relâchement', async ({ page }) => {
    await prepare(page)
    await page.addInitScript(() => localStorage.setItem('blv_mouv', '1'))
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    const liens = page.locator('nav.hd-nav .hn-in > a.hn')
    await expect(liens.first()).toHaveAttribute('aria-current', 'page')
    // Capsule ovale : rayon = moitié de la hauteur.
    const capsule = await page.locator('nav.hd-nav .hn-in').evaluate((e) => ({ h: e.getBoundingClientRect().height, r: parseFloat(getComputedStyle(e).borderTopLeftRadius) }))
    expect(capsule.r).toBeGreaterThanOrEqual(capsule.h / 2)
    const centre = async (l: ReturnType<typeof page.locator>) => {
      const b = (await l.boundingBox())!
      return b.x + b.width / 2
    }
    // Survol : la bulle glisse vers le lien survolé et s'y pose (pilule : rayon = moitié de la hauteur).
    const cible = liens.nth(3)
    const bc = (await cible.boundingBox())!
    await page.mouse.move(bc.x + bc.width / 2, bc.y + bc.height / 2, { steps: 3 })
    const bulle = page.locator('nav.hd-nav .dock-bulle')
    await expect(bulle).toHaveCount(1)
    await expect.poll(async () => Math.abs((await centre(bulle)) - (await centre(cible))), { timeout: 3000 }).toBeLessThan(1.5)
    const forme = await bulle.evaluate((e) => ({ h: e.getBoundingClientRect().height, r: parseFloat(e.style.borderRadius) }))
    expect(Math.abs(forme.r - forme.h / 2)).toBeLessThan(0.6)
    // Départ de la souris : retour sur l'onglet actif, la bulle disparaît.
    await page.mouse.move(640, 600)
    await expect(bulle).toHaveCount(0, { timeout: 3000 })
    // Glisser : saisie sur Accueil, relâche sur Promotions → la page Promotions s'ouvre.
    const a0 = (await liens.nth(0).boundingBox())!
    const a2 = (await liens.nth(2).boundingBox())!
    await page.mouse.move(a0.x + a0.width / 2, a0.y + a0.height / 2)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(a0.x + a0.width / 2 + ((a2.x + a2.width / 2 - a0.x - a0.width / 2) * i) / 10, a0.y + a0.height / 2 + 2)
      await page.waitForTimeout(16)
    }
    await expect(bulle).toHaveCount(1)
    // Pendant la glisse, la bulle saisie déborde la capsule (ovale plus haut que les liens).
    expect((await bulle.boundingBox())!.height).toBeGreaterThan(a0.height + 4)
    await page.waitForTimeout(200)
    await page.mouse.up()
    await expect(page).toHaveURL(/\/promotions$/)
    await expect(page.locator('nav.hd-nav a.hn[aria-current="page"]')).toContainText('Promotions')
    await page.mouse.move(640, 600)
    await expect(bulle).toHaveCount(0, { timeout: 3000 })
  })

  test('raccourci « / » : le focus va dans la recherche de l’en-tête, le panneau s’ouvre', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/compte')
    await expect(page.locator('header.hd-site')).toBeVisible()
    await page.locator('#app main').click({ position: { x: 5, y: 400 } })
    await page.keyboard.press('/')
    await expect(page.locator('header.hd-site input[role=combobox]')).toBeFocused()
    await expect(page.locator('.hs-pan')).toBeVisible()
    await page.keyboard.type('tecno')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/recherche-resultats\?q=tecno/)
  })

  test('menu du profil : déroulant sous l’avatar, focus dedans, Échap le ferme', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/commande')
    await page.locator('header.hd-site .hs-compte').click()
    await expect(page).toHaveURL(/pop=profil/)
    const menu = page.locator('#av-pop')
    await expect(menu).toBeVisible()
    const hd = (await page.locator('header.hd-site').boundingBox())!
    const m = (await menu.boundingBox())!
    expect(m.y).toBeGreaterThanOrEqual(hd.y + hd.height - 8)
    expect(m.x + m.width).toBeLessThanOrEqual(1280)
    await expect(menu.locator(':focus')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.locator('#av-pop')).toHaveCount(0)
  })

  test('panneau des notifications : la cloche l’ouvre, « Voir toutes » mène à la page', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/')
    await page.locator('header.hd-site .hs-cloche').click()
    const pan = page.locator('.pop-notifs')
    await expect(pan).toBeVisible()
    await expect(pan.locator('.cl10-nc').first()).toBeVisible()
    await pan.getByRole('link', { name: 'Voir toutes les notifications' }).click()
    await expect(page).toHaveURL(/\/notifications$/)
  })

  test('méga-menu des catégories : univers, sous-catégories comptées, Échap', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await page.locator('.hn-fl').click()
    const mm = page.locator('.mm')
    await expect(mm).toBeVisible()
    await expect(mm.locator('.mm-u a')).toHaveCount(10)
    await page.keyboard.press('Escape')
    await expect(page.locator('.mm')).toHaveCount(0)
  })

  test('fil d’Ariane et nom du parent dans la barre de titre dès 1024', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/adresses')
    await expect(page.locator('main .fil')).toContainText('Mon compte')
    await expect(page.locator('main .hd-page .hd-sub h1')).toContainText('Mes adresses')
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/adresses')
    await expect(page.locator('main .fil')).toHaveCount(0)
    await expect(page.locator('main .hd-page .hd-sub h1')).toContainText('Mes adresses')
  })
})

test.describe('feuilles en modales et tiroirs', () => {
  test('modale centrée : focus dedans, Échap la ferme', async ({ page }) => {
    await prepare(page)
    for (const [w, h] of [
      [768, 1024],
      [1280, 800],
    ] as const) {
      await page.setViewportSize({ width: w, height: h })
      await page.goto('/compte?sheet=deconnexion')
      const f = page.locator('.sheet')
      await expect(f).toBeVisible()
      const b = (await f.boundingBox())!
      expect(b.width).toBeLessThanOrEqual(560)
      expect(Math.abs(b.x + b.width / 2 - w / 2)).toBeLessThanOrEqual(2)
      expect(Math.abs(b.y + b.height / 2 - h / 2)).toBeLessThanOrEqual(2)
      await expect(f.locator('.sheet-x')).toBeVisible()
      await expect(f.locator(':focus')).toHaveCount(1)
      await page.keyboard.press('Escape')
      await expect(page.locator('.sheet')).toHaveCount(0)
    }
  })

  test('tiroir : à droite dès 1024, modale en tablette portrait', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/relais-selecteur')
    const f = page.locator('.sheet[data-forme=tiroir]')
    await expect(f).toBeVisible()
    let b = (await f.boundingBox())!
    expect(Math.round(b.x + b.width)).toBe(1280)
    expect(b.width).toBeLessThanOrEqual(440)
    await expect(f.locator(':focus')).toHaveCount(1)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/relais-selecteur')
    b = (await page.locator('.sheet').boundingBox())!
    expect(Math.abs(b.x + b.width / 2 - 384)).toBeLessThanOrEqual(2)
  })

  test('feuille en balisage brut : grande modale, Échap la ferme par son voile', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/panier')
    await page.goto('/paiement-moyen')
    const f = page.locator('.sheet[data-forme=large]')
    await expect(f).toBeVisible()
    const b = (await f.boundingBox())!
    expect(b.width).toBeGreaterThan(560)
    expect(b.width).toBeLessThanOrEqual(920)
    await expect(f.locator(':focus')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.locator('.sheet')).toHaveCount(0)
    await expect(page).toHaveURL(/\/panier/)
  })

  test('feuille du téléphone inchangée sous 768 px', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 600, height: 960 })
    await page.goto('/compte?sheet=deconnexion')
    const b = (await page.locator('.sheet').boundingBox())!
    expect(Math.round(b.y + b.height)).toBe(960)
    await expect(page.locator('.sheet .sheet-x')).toHaveCount(0)
  })
})

test.describe('rendus des grands écrans', () => {
  const RENDUS = [
    { nom: 'clair 1440', theme: 'light', lang: 'fr', text: 'normale', w: 1440, h: 900 },
    { nom: 'sombre 1440', theme: 'dark', lang: 'fr', text: 'normale', w: 1440, h: 900 },
    { nom: 'anglais 1280', theme: 'light', lang: 'en', text: 'normale', w: 1280, h: 800 },
    { nom: 'très grande 1280', theme: 'light', lang: 'fr', text: 'tres', w: 1280, h: 800 },
  ]
  for (const r of RENDUS)
    for (const route of ['accueil', 'compte', 'commande', 'liste', 'panier'])
      test(`${r.nom} : ${route}`, async ({ page }) => {
        const errs = erreurs(page)
        await prepare(page, r)
        await page.setViewportSize({ width: r.w, height: r.h })
        await page.goto(chemin(route))
        await expect(page.locator('header.hd-site')).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('data-theme', r.theme)
        if (r.lang === 'en') await expect(page.locator('html')).toHaveAttribute('lang', 'en')
        const d = await debordements(page)
        expect(d.page).toBeLessThanOrEqual(0)
        expect(d.main).toBeLessThanOrEqual(0)
        expect(d.dehors).toEqual([])
        expect(errs).toEqual([])
      })
})

// ================================ Lots 5 et 6 : accueil, catégories, listes, recherche ================================
test.describe('lots 5 et 6 : accueil, catégories, listes, recherche', () => {
  test('accueil : Catégories à gauche, Flash Deals et garanties à droite dès 1200, déplacés et non dupliqués', async ({ page }) => {
    const errs = erreurs(page)
    await prepare(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(page.locator('.g-catalogue > .gab-gauche .cc')).toBeVisible()
    const droite = page.locator('.g-catalogue > .gab-droite .acc-droite')
    await expect(droite.locator('.h0-flash')).toBeVisible()
    await expect(droite.locator('.h0-float')).toBeVisible()
    await expect(droite.locator('.acc-gar a')).toHaveCount(4)
    await expect(page.locator('#app .h0-flash')).toHaveCount(1)
    await expect(page.locator('#app .h0-float')).toHaveCount(1)
    // Colonnes dans l'ordre des captures : gauche < centre < droite.
    const g = (await page.locator('.gab-gauche').boundingBox())!
    const c = (await page.locator('.g-catalogue > .gab-contenu').boundingBox())!
    const d = (await page.locator('.gab-droite').boundingBox())!
    expect(g.x + g.width).toBeLessThanOrEqual(c.x)
    expect(c.x + c.width).toBeLessThanOrEqual(d.x)
    // La colonne droite reste collante après un défilement.
    await page.locator('#app main').evaluate((m) => m.scrollTo({ top: 1000 }))
    await page.waitForTimeout(200)
    const d2 = (await page.locator('.gab-droite').boundingBox())!
    expect(d2.y).toBeLessThan(900)
    // Le carrousel avance avec sa flèche.
    await page.locator('#app main').evaluate((m) => m.scrollTo({ top: 0 }))
    const avant = await page.locator('.h0-hero').evaluate((h) => h.scrollLeft)
    await page.locator('.gab-contenu > .rail-fl.d').click()
    await expect.poll(() => page.locator('.h0-hero').evaluate((h) => h.scrollLeft)).toBeGreaterThan(avant)
    // Petit ordinateur : Flash Deals dans le flux, colis en tête du centre.
    await page.setViewportSize({ width: 1024, height: 768 })
    await expect(page.locator('.gab-droite')).toHaveCount(0)
    await expect(page.locator('.gab-contenu .h0-flash')).toHaveCount(1)
    await expect(page.locator('.gab-contenu .acc-tete .h0-float')).toBeVisible()
    expect(errs).toEqual([])
  })

  test('accueil : rien ne bouge sur téléphone', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.locator('.acc-droite, .acc-tete, .rail-fl, .gab')).toHaveCount(0)
    await expect(page.locator('main > .h0-flash, main .h0-flash')).toHaveCount(1)
    await expect(page.locator('#app > .h0-float')).toHaveCount(1)
  })

  test('catégories : la liste des univers est la colonne gauche dès 1024', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/categories?u=femme')
    const rail = page.locator('.gab-gauche > .cl04-rail2')
    await expect(rail.locator('a')).toHaveCount(10)
    await expect(rail.locator('a[aria-current]')).toHaveCount(1)
    await expect(page.locator('.gab-contenu .cl04-rail2')).toHaveCount(0)
    await rail.locator('a', { hasText: 'Chaussures' }).click()
    await expect(page).toHaveURL(/u=chauss/)
    await expect(page.locator('.cl04-cat-l .cl04-ban2 h2')).toContainText('Chaussures')
  })

  test('liste : panneau des filtres en place, tri en menu, sans feuille', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/liste')
    const pan = page.locator('.gab-gauche .cl05-fp.en-place')
    await expect(pan).toBeVisible()
    await expect(page.locator('.cl04-lchips a[href^="/recherche-filtres"]')).toHaveCount(0)
    await pan.locator('.cl05-trow', { hasText: 'En promotion' }).locator('button').click()
    await expect(page).toHaveURL(/promo=1/)
    await expect(pan.locator('.cl05-fn')).toHaveText('1')
    await page.locator('.l-tri select').selectOption('prix')
    await expect(page).toHaveURL(/tri=prix/)
    // La page Filtres d'une liste ouvre la liste, panneau en place.
    await page.goto('/recherche-filtres?retour=liste&cat=femme')
    await expect(page).toHaveURL(/\/liste\?cat=femme/)
  })

  test('résultats : grille ou lignes, relais d’origine, page Filtres qui ouvre les résultats', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/recherche-resultats?q=wax')
    await expect(page.locator('header.hd-site')).toHaveCount(1)
    await expect(page.locator('header.cl05-hd')).toHaveCount(0)
    await expect(page.locator('.gab-gauche .cl05-fp.en-place')).toBeVisible()
    await expect(page.locator('.pgrid.l-res .pcard').first()).toBeVisible()
    await expect(page.locator('.cl05-chr .l-rp')).toBeVisible()
    await page.locator('.l-vue button', { hasText: 'Liste' }).click()
    await expect(page.locator('.cl05-row').first()).toBeVisible()
    await page.locator('.l-vue button', { hasText: 'Grille' }).click()
    await expect(page.locator('.pgrid.l-res')).toBeVisible()
    await page.goto('/recherche-filtres?q=wax&retour=recherche-resultats')
    await expect(page).toHaveURL(/\/recherche-resultats\?q=wax/)
  })

  test('recherche : accueil en trois colonnes ; rien trouvé centré ; tiroir des relais avec sa carte', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/recherche')
    await expect(page.locator('main .cl05-acc')).toBeVisible()
    await page.goto('/recherche-zero?q=zzzzz')
    await expect(page.locator('.cl05-zero > .cl05-blk')).toBeVisible()
    await page.goto('/relais-selecteur?q=wax')
    const f = page.locator('.sheet[data-forme=tiroir]')
    await expect(f).toBeVisible()
    await expect(f.locator('.cl05-rs-carte')).toBeVisible()
    await f.getByRole('button', { name: 'Garder mon relais' }).click()
    await expect(page).toHaveURL(/\/recherche-resultats\?q=wax/)
  })
})

// ================================ Lots 7 et 8 : fiche produit, avis, question, panier, favoris, paiement ================================
test.describe('lots 7 et 8 : fiche, panier, paiement', () => {
  // L'aside reste dans la fenêtre après un défilement (collant).
  async function resteVisible(page: Page, selecteur: string, defile = 1000) {
    await page.evaluate((y) => document.querySelector('#app main')!.scrollTo(0, y), defile)
    await page.waitForTimeout(150)
    return page.evaluate((s) => {
      const r = document.querySelector(s)!.getBoundingClientRect()
      return r.bottom > 0 && r.top < innerHeight
    }, selecteur)
  }

  test('fiche : galerie, informations et bloc d’achat collant dès 1200 ; pas de barre fixée dès 1024', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/fiche?p=camon30')
    const g = page.locator('.g-colonnes.fp-l')
    await expect(g.locator('> .gab-visuel .fp-gal')).toBeVisible()
    await expect(g.locator('> .gab-contenu .fp-t')).toHaveText('Tecno Camon 30')
    const achat = g.locator('> aside.gab-aside.fp-achat')
    await expect(achat.getByRole('button', { name: 'Acheter' })).toBeVisible()
    await expect(page.locator('.fp-bar')).toHaveCount(0)
    // Trois colonnes côte à côte.
    const x = await Promise.all(['.gab-visuel', '.gab-contenu', '.gab-aside'].map((s) => g.locator('> ' + s).evaluate((e) => e.getBoundingClientRect().left)))
    expect(x[0]).toBeLessThan(x[1])
    expect(x[1]).toBeLessThan(x[2])
    // Le fil de la fiche (univers › sous-catégorie › produit) remplace celui de la barre de titre.
    await expect(page.locator('.fp-l .gab-haut .fil [aria-current]')).toHaveText('Tecno Camon 30')
    await expect(page.locator('.hd-page > .fil')).toBeHidden()
    // Collant tant que la grille défile (les blocs pleine largeur qui suivent sont hors de la grille).
    expect(await resteVisible(page, '.fp-achat', 400)).toBe(true)
    await page.evaluate(() => document.querySelector('#app main')!.scrollTo(0, 0))
    // Détails : description et caractéristiques côte à côte ; Avis : trois avis et « Lire les avis ».
    await expect(page.locator('.fp-det .kv').first()).toBeVisible()
    await page.locator('.fp-tabs button', { hasText: 'Avis' }).click()
    await expect(page.locator('.fp-avi')).toHaveCount(3)
    await expect(page.locator('.fp-tab a', { hasText: 'Lire les avis' })).toBeVisible()
    // Ajouter au panier depuis le bloc d'achat.
    await achat.getByRole('button', { name: 'Ajouter au panier' }).click()
    await expect(achat.locator('.note.green')).toContainText('ajouté au panier')
  })

  test('fiche : deux colonnes en 1024, une colonne et barre fixée en tablette portrait', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/fiche?p=camon30')
    await expect(page.locator('.fp-bar')).toHaveCount(0)
    await expect(page.locator('.fp-achat .fp-btns .btn.primary')).toBeVisible()
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('.fp-bar')).toBeVisible()
    await expect(page.locator('.fp-l')).toHaveCount(0)
  })

  test('galerie : visionneuse plein écran, flèches et Échap', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/galerie?p=camon30')
    const v = page.locator('.cl06-vw')
    const r = await v.boundingBox()
    expect(r!.width).toBe(1280)
    await expect(v.locator('.cl06-n')).toHaveText('1 / 7')
    await page.keyboard.press('ArrowRight')
    await expect(v.locator('.cl06-n')).toHaveText('2 / 7')
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/fiche\?p=camon30/)
  })

  test('avis : aside à gauche (note, filtres, tri), avis à droite ; question : produit dans l’aside', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/avis?p=camon30')
    const aside = page.locator('.g-colonnes.inverse > aside.gab-aside')
    await expect(aside.locator('.cl06-sum')).toBeVisible()
    const [a, c] = await Promise.all([aside.evaluate((e) => e.getBoundingClientRect().left), page.locator('.g-colonnes > .gab-contenu').evaluate((e) => e.getBoundingClientRect().left)])
    expect(a).toBeLessThan(c)
    await aside.locator('.cl06-fl .chip', { hasText: 'Avec photo' }).click()
    await expect(page.locator('.gab-contenu .cl06-rv').first()).toBeVisible()
    await page.goto('/question?p=camon30')
    await expect(page.locator('.g-colonnes > aside.gab-aside .cl06-tw')).toBeVisible()
    await expect(page.locator('.gab-contenu .cl06-tw')).toHaveCount(0)
  })

  test('panier : colis à gauche, récapitulatif collant à droite avec « Passer commande » ; favoris dessous', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/panier')
    await expect(page.locator('.cl07-bar')).toHaveCount(0)
    const recap = page.locator('.pa-l > aside.gab-aside.pa-recap')
    await expect(recap.locator('.cl07-rc')).toBeVisible()
    await expect(recap.locator('.blv-pourqui')).toHaveCount(1)
    const passer = recap.locator('.cl07-act .btn.primary')
    await expect(passer).toBeVisible()
    await expect(page.locator('.pa-l > .gab-contenu .cl07-sc').first()).toBeVisible()
    expect(await resteVisible(page, '.pa-recap .cl07-act .btn.primary')).toBe(true)
    await expect(page.locator('.pa-l-bas .cl07-svh')).toBeVisible()
    await passer.click()
    await expect(page).toHaveURL(/\/paiement-moyen$/)
    // Passer commande : feuille large en deux colonnes, « Payer » à droite.
    const f = page.locator('.sheet[data-forme=large]')
    await expect(f.locator('> .pm-choix .cl08-row').first()).toBeVisible()
    await expect(f.locator('> .pm-recap button.btn.primary', { hasText: 'Payer' })).toBeVisible()
  })

  test('panier : une colonne et barre fixée en tablette portrait', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/panier')
    await expect(page.locator('.cl07-bar')).toBeVisible()
    await expect(page.locator('.pa-l')).toHaveCount(0)
  })

  test('favoris : barre d’outils et grille', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/sauvegardes')
    await expect(page.locator('.sv-outils .chips')).toBeVisible()
    await expect(page.locator('.sv-outils .vedette .btn.primary')).toBeVisible()
    const cartes = page.locator('.sv-grille > .cl07-fv')
    expect(await cartes.count()).toBeGreaterThan(1)
    const [a, b] = await Promise.all([cartes.nth(0).boundingBox(), cartes.nth(1).boundingBox()])
    expect(a!.y).toBe(b!.y)
  })

  test('paiement : attente centrée, principal à droite ; confirmée en deux colonnes', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/paiement-moyen')
    await page.locator('.cl08-row', { hasText: 'MTN MoMo' }).first().click()
    await page.locator('button.btn.primary', { hasText: 'Payer' }).click()
    await expect(page).toHaveURL(/paiement-attente/)
    const ok = page.getByRole('button', { name: 'J’ai validé sur mon téléphone' })
    const renvoi = page.getByRole('button', { name: 'Rien reçu ? Renvoyer la demande' })
    const [o, r] = await Promise.all([ok.boundingBox(), renvoi.boundingBox()])
    expect(o!.x).toBeGreaterThan(r!.x)
    expect(Math.abs(o!.y - r!.y)).toBeLessThan(2)
    await ok.click()
    await expect(page).toHaveURL(/confirmee\?ref=/)
    const aside = page.locator('.g-colonnes > aside.cf-aside')
    await expect(aside.locator('.cl08-rel')).toBeVisible()
    await expect(aside.getByRole('link', { name: 'Suivre ma commande' })).toBeVisible()
    await expect(page.locator('.gab-contenu .cl08-rel')).toHaveCount(0)
  })
})

// Lots 10 et 15 : Mon compte et ses sous-pages (§ 5.11), menu, kit, erreurs (§ 5.16).
test.describe('lots 10 et 15 : compte, menu, kit, erreurs', () => {
  test('compte : carte d’identité, menu du compte collant à gauche, vue d’ensemble en grille', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/compte')
    const menu = page.locator('.g-compte .gab-menu nav.mc')
    await expect(menu).toBeVisible()
    await expect(page.locator('.gab-identite .ci')).toBeVisible()
    await expect(menu.locator('a[aria-current="page"]')).toHaveText(/Vue d’ensemble/)
    // Une seule recherche du compte (dans le menu) et pas de doublon de la carte de profil.
    await expect(page.locator('.gab-contenu .cl13-pf')).toBeHidden()
    const m = (await menu.boundingBox())!
    const c = (await page.locator('.gab-contenu').boundingBox())!
    expect(m.x + m.width).toBeLessThanOrEqual(c.x)
    // Portefeuille et avantages côte à côte.
    const [w, a] = await Promise.all([page.locator('.c13-ov > .wl-card').boundingBox(), page.locator('.c13-ov > .cl13-advc').boundingBox()])
    expect(Math.abs(w!.y - a!.y)).toBeLessThan(2)
    expect(a!.x).toBeGreaterThan(w!.x)
    // Le menu reste dans la fenêtre après un défilement.
    await page.locator('#app main').evaluate((e) => e.scrollTo(0, 1000))
    const apres = (await page.locator('.gab-menu').boundingBox())!
    expect(apres.y).toBeGreaterThanOrEqual(0)
    expect(apres.y).toBeLessThan(800)
  })

  test('compte : pas de menu latéral en tablette portrait (la page Mon compte joue ce rôle)', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/compte')
    await expect(page.locator('.gab-menu')).toHaveCount(0)
    await expect(page.locator('.cl13-pf')).toBeVisible()
  })

  test('sous-pages : deux colonnes de cartes, profil photo à gauche, adresses avec l’ajout en tête', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    for (const r of ['securite', 'confidentialite', 'reglages', 'reseau', 'moyens-paiement']) {
      await page.goto('/' + r)
      const cols = page.locator('.c13-g2').first().locator('> .c13-k')
      await expect(cols).toHaveCount(2)
      const [a, b] = await Promise.all([cols.nth(0).boundingBox(), cols.nth(1).boundingBox()])
      expect(b!.x, r).toBeGreaterThan(a!.x + a!.width - 1)
    }
    await page.goto('/profil')
    const [g, d] = await Promise.all([page.locator('.c13-pfg').boundingBox(), page.locator('.c13-pfd').boundingBox()])
    expect(d!.x).toBeGreaterThan(g!.x + g!.width - 1)
    await page.goto('/adresses')
    // « Ajouter une adresse » est l'action de la barre de titre de la page (à droite du titre).
    const ajout = page.locator('.hd-page .hd-sub a.btn.primary', { hasText: 'Ajouter une adresse' })
    await expect(ajout).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ajouter une adresse' })).toHaveCount(1)
    await ajout.click()
    await expect(page).toHaveURL(/adresses\?st=ajout/)
    await expect(page.locator('.c13-adf > .c13-k')).toHaveCount(2)
  })

  test('messagerie : maître-détail dès 1024, la conversation s’ouvre à droite sans nouvelle entrée d’historique', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/messagerie')
    await expect(page.locator('.md13-d .md13-vide')).toBeVisible()
    const avant = await page.evaluate(() => history.length)
    await page.locator('.md13-l a.li').first().click()
    await expect(page).toHaveURL(/fil\?id=/)
    await expect(page.locator('.md13-l a.li[aria-current="true"]')).toHaveCount(1)
    await expect(page.locator('.md13-d .cl13-comp [role="textbox"]')).toBeVisible()
    expect(await page.evaluate(() => history.length)).toBe(avant)
  })

  test('factures et pages légales : maître-détail dès 1200, feuille en dessous', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/factures')
    await page.locator('.md13-l a.li').first().click()
    await expect(page).toHaveURL(/st=apercu/)
    await expect(page.locator('.md13-d').getByRole('button', { name: 'Partager le PDF' })).toBeVisible()
    await expect(page.locator('.sheet')).toHaveCount(0)
    await page.goto('/legal')
    await page.locator('.md13-l a.li', { hasText: 'Conditions générales de vente' }).click()
    await expect(page).toHaveURL(/legal-doc\?d=/)
    await expect(page.locator('.md13-d h1.pg-t')).toHaveText(/Conditions générales de vente/)
    await page.setViewportSize({ width: 1100, height: 800 })
    await page.goto('/factures?st=apercu&ref=BLV-51206')
    await expect(page.locator('.sheet')).toBeVisible()
  })

  test('aide et FAQ : « Nous joindre » à droite, thèmes à gauche', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/aide')
    const joindre = page.locator('aside.c13-joindre')
    await expect(joindre.getByRole('link', { name: /Demander un rappel/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Demander un rappel/ })).toHaveCount(1)
    await page.goto('/faq')
    const themes = page.locator('nav.c13-themes a')
    await expect(themes.nth(3)).toBeVisible()
    await expect(page.locator('.c13-rep .chips')).toHaveCount(0)
    await themes.nth(1).click()
    await expect(themes.nth(1)).toHaveAttribute('aria-current', 'page')
  })

  test('menu, kit et page introuvable', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/menu')
    await expect(page.locator('.mn-plan')).toBeVisible()
    expect(await page.locator('.mn-plan').evaluate((e) => getComputedStyle(e).columnCount)).toBe('3')
    await page.goto('/kit')
    await expect(page.locator('.kit-g > .kit-b').nth(4)).toBeVisible()
    await page.goto('/page-inexistante')
    await expect(page.locator('#app')).toHaveClass(/g-centre/)
    const b = (await page.locator('.btns.i404 > *').first().boundingBox())!
    expect(b.width).toBeLessThanOrEqual(360)
  })
})

// ================================ Lot 9 : commandes, notifications, litiges, modifications (§ 5.8 à 5.10) =========
test.describe('lot 9 : commandes, notifications, litiges, modifications', () => {
  const boite = async (page: Page, sel: string) => (await page.locator(sel).first().boundingBox())!

  test('Mes commandes : grille de 2 dès 1024, maître-détail dès 1200 (?ref=), téléphone inchangé', async ({ page }) => {
    const errs = erreurs(page)
    await prepare(page)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/commandes')
    await expect(page.locator('.c9-oc').first()).toBeVisible()
    await expect(page.locator('.c9-grille, .gab')).toHaveCount(0)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/commandes')
    const cartes = page.locator('.c9-grille > .c9-oc')
    await expect(cartes.nth(1)).toBeVisible()
    const [a, b] = [(await cartes.nth(0).boundingBox())!, (await cartes.nth(1).boundingBox())!]
    expect(Math.abs(a.y - b.y)).toBeLessThan(2)
    expect(b.x).toBeGreaterThan(a.x + a.width - 1)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/commandes')
    const liste = await boite(page, '.c9-md > .gab-liste')
    const detail = await boite(page, '.c9-md > .gab-detail')
    expect(detail.x).toBeGreaterThanOrEqual(liste.x + liste.width)
    await expect(page.locator('.c9-md .gab-detail .c9-cols .c9-dh h1')).toBeVisible()
    const mini = page.locator('.c9-mini').nth(1)
    const ref = (await mini.locator('.ti b').textContent())!.trim()
    await mini.locator('a.hd1').click()
    await expect(page).toHaveURL(new RegExp('ref=' + ref))
    await expect(mini.locator('a.hd1')).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('.gab-detail .c9-dh h1')).toContainText(ref)
    expect(errs).toEqual([])
  })

  test('Ma commande : bandeau d’action dans l’aside collant, à droite, encore visible après défilement', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/commande?ref=BLV-52018')
    const aside = page.locator('.c9-cols > aside.gab-aside')
    await expect(aside.getByRole('link', { name: 'Mon code' })).toBeVisible()
    expect((await aside.boundingBox())!.x).toBeGreaterThan((await boite(page, '.c9-cols > .gab-contenu')).x + 300)
    await page.locator('#app main').evaluate((m) => m.scrollBy(0, 1000))
    await page.waitForTimeout(200)
    const r = (await aside.boundingBox())!
    expect(r.y + r.height).toBeGreaterThan(0)
    expect(r.y).toBeLessThan(800)
  })

  test('barres fixées en bas masquées dès 1024 : le bouton principal est dans la page', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/suivi?ref=BLV-52107')
    await expect(page.locator('.cl09-bar')).toHaveCount(0)
    await expect(page.locator('aside.gab-aside').getByRole('link', { name: 'Signaler un problème' })).toBeVisible()
    await page.goto('/litige?ref=BLV-51702&colis=1&pb=autre&etape=3')
    await expect(page.locator('.cl11-bar')).toHaveCount(0)
    await expect(page.locator('.cl11-fin').getByRole('button', { name: 'Continuer' })).toBeVisible()
    await expect(page.locator('.cl11-prog-l li[aria-current=step]')).toHaveText(/Preuves/)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/litige?ref=BLV-51702&colis=1&pb=autre&etape=3')
    await expect(page.locator('.cl11-bar')).toHaveCount(1)
  })

  test('code, garde, changer de relais : contenu à gauche, aside à droite', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    for (const [r, lien] of [
      ['/code?ref=BLV-52018', 'Je suis au comptoir'],
      ['/garde?ref=BLV-52018', 'Je ne peux pas passer'],
      ['/changer-relais?ref=BLV-52107', 'Revenir à ma commande'],
    ]) {
      await page.goto(r)
      const aside = page.locator('aside.gab-aside')
      await expect(aside.getByRole('link', { name: new RegExp(lien) })).toBeVisible()
      expect((await aside.boundingBox())!.x, r).toBeGreaterThan((await boite(page, '.gab-contenu')).x + 300)
    }
  })

  test('notifications : filtres comptés à gauche ; écran verrouillé et SMS dans un cadre de téléphone', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/notifications')
    const filtres = page.locator('.cl10-g2 > aside .cl10-filtres a')
    await expect(filtres.first()).toBeVisible()
    expect((await filtres.first().boundingBox())!.x).toBeLessThan((await boite(page, '.cl10-g2 > .gab-contenu')).x)
    await filtres.filter({ hasText: 'Non lues' }).click()
    await expect(filtres.filter({ hasText: 'Non lues' })).toHaveAttribute('aria-pressed', 'true')
    for (const [r, sel] of [
      ['/push', '.cl10-ph'],
      ['/sms', '.cl10-sa'],
    ]) {
      await page.goto(r)
      const tel = await boite(page, '.cl10-cadre > ' + sel)
      expect(Math.round(tel.width), r).toBe(390)
      await expect(page.locator('.cl10-expl h2')).toBeVisible()
    }
  })

  test('Mes litiges : grille de 2 dès 1024, maître-détail dès 1200 avec le suivi du dossier', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/litiges')
    await expect(page.locator('.cl11-grille').first()).toBeVisible()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/litiges')
    await expect(page.locator('.cl11-md > .gab-detail .cl11-cols')).toBeVisible()
    const carte = page.locator('.cl11-md > .gab-liste a.card').nth(1)
    await carte.click()
    await expect(page).toHaveURL(/litiges\?id=/)
    await expect(carte).toHaveAttribute('aria-current', 'true')
  })
})

// ================================ Lots 11 et 12 : abonnements, listes, assistant, modules CL-15 (§ 5.12, 5.13) ========
test.describe('lots 11 et 12 : abonnements, listes, assistant, modules', () => {
  const boite = async (page: Page, sel: string) => (await page.locator(sel).first().boundingBox())!
  // L'aside est à droite du contenu, sur la même ligne, et garde son action principale visible.
  async function asideADroite(page: Page, r: string, action: RegExp) {
    await page.goto(r)
    const aside = page.locator('aside.gab-aside')
    await expect(aside.getByRole('button', { name: action }).or(aside.getByRole('link', { name: action })).first(), r).toBeVisible()
    const c = await boite(page, '.gab-contenu')
    const a = await boite(page, 'aside.gab-aside')
    expect(a.x, r).toBeGreaterThanOrEqual(c.x + c.width - 1)
  }

  test('Abonnements : paliers en 2 × 2 à 1024, 4 de front dès 1200, comparatif en vraie table ; téléphone inchangé', async ({ page }) => {
    const errs = erreurs(page)
    await prepare(page)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/abonnements')
    await expect(page.locator('.cl14-tier').first()).toBeVisible()
    await expect(page.locator('.g5-paliers, .g5-cmp')).toHaveCount(0)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/abonnements')
    const p = page.locator('.g5-paliers > .cl14-tier')
    await expect(p).toHaveCount(4)
    const [a, b, c] = [await p.nth(0).boundingBox(), await p.nth(1).boundingBox(), await p.nth(2).boundingBox()]
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2)
    expect(c!.y).toBeGreaterThan(a!.y + 10)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/abonnements')
    const ys = await Promise.all([0, 1, 2, 3].map(async (i) => (await p.nth(i).boundingBox())!.x))
    expect(ys[3]).toBeGreaterThan(ys[2])
    // Chaque carte garde son bouton (rien ne disparaît) ; le comparatif est une table déplié.
    await expect(page.locator('.g5-paliers .btn')).toHaveCount(4)
    await expect(page.locator('table.g5-cmp tbody tr')).toHaveCount(4)
    expect(errs).toEqual([])
  })

  test('Mon abonnement, cagnotte, parrainage : gabarit compte et deux colonnes internes', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    for (const [r, action] of [
      ['/mon-abonnement', /Résilier/],
      ['/cagnotte', /Voir mon Portefeuille|Utiliser au panier/],
    ] as const) {
      await page.goto(r)
      await expect(page.locator('.gab-menu'), r).toBeVisible()
      const g = await boite(page, '.g5-duo > .g5-g')
      const d = await boite(page, '.g5-duo > .g5-d')
      expect(d.x, r).toBeGreaterThan(g.x + g.width - 1)
      await expect(page.locator('.g5-duo > .g5-d').locator('a, button').filter({ hasText: action }).first(), r).toBeVisible()
    }
    await page.goto('/parrainage')
    await expect(page.locator('.g5-duo > .g5-d h2').filter({ hasText: 'Mes parrainages' })).toBeVisible()
    expect((await boite(page, '.g5-duo > .g5-d')).x).toBeGreaterThan((await boite(page, '.g5-duo > .g5-g')).x + 300)
  })

  test('Souscrire : le récapitulatif et « Payer » dans l’aside collant dès 1024, à leur place sur tablette portrait', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await asideADroite(page, '/abonnement-souscrire?palier=plus&formule=mois', /Payer/)
    await expect(page.locator('aside.gab-aside .card.or')).toBeVisible()
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/abonnement-souscrire?palier=plus&formule=mois')
    await expect(page.locator('aside.gab-aside')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Payer/ })).toBeVisible()
  })

  test('Listes d’envies : maître-détail dès 1024 (les listes à gauche, la liste ouverte à droite)', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/liste-envies?id=anniv')
    await expect(page.locator('.chips .chip').first()).toBeVisible()
    await expect(page.locator('.g5-md')).toHaveCount(0)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/listes')
    const nav = page.locator('nav.g5-md-l')
    await expect(nav.getByRole('link', { name: /Nouvelle liste/ })).toBeVisible()
    const l = (await nav.boundingBox())!
    const d = await boite(page, '.g5-md-d')
    expect(d.x).toBeGreaterThan(l.x + l.width - 1)
    await nav.getByRole('link', { name: /Mon anniversaire/ }).click()
    await expect(page).toHaveURL(/liste-envies\?id=/)
    await expect(nav.locator('a[aria-current=page]')).toContainText(/anniversaire/)
    await expect(page.locator('.g5-md-d').getByRole('link', { name: /Mettre ma liste en statut/ })).toBeVisible()
  })

  test('Mettre en statut : l’aperçu à gauche, le partage à droite', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/liste-statut?id=anniv')
    await expect(page.locator('.g5-apercu canvas')).toBeVisible()
    await asideADroite(page, '/liste-statut?id=anniv', /Partager mon statut/)
  })

  test('Assistant : colonne de 760, saisie collée en bas de la colonne, raccourcis dans un aside dès 1200', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/assistant')
    const col = await boite(page, '.g5-assist-c')
    expect(col.width).toBeLessThanOrEqual(761)
    await expect(page.locator('.g5-assist-c form.cl14-in')).toBeVisible()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/assistant')
    const r = page.locator('aside.g5-assist-r')
    await expect(r.getByRole('link', { name: /Où est mon colis/ })).toBeVisible()
    await r.getByRole('link', { name: /Où est mon colis/ }).click()
    await expect(page.locator('.cl14-b.me').last()).toContainText(/colis/)
  })

  test('Ventes flash : colonne Catégories, Flash Deals en grille de grandes cartes', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/ventes-flash')
    await expect(page.locator('.gab-gauche')).toBeVisible()
    const c = page.locator('.gab-contenu .fd-rail > .fd-c')
    const [a, b] = [(await c.nth(0).boundingBox())!, (await c.nth(1).boundingBox())!]
    expect(Math.abs(a.y - b.y)).toBeLessThan(2)
    expect(a.width).toBeGreaterThan(180)
  })

  test('modules CL-15 : montant et action dans l’aside à droite dès 1024', async ({ page }) => {
    test.setTimeout(120_000)
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    for (const [r, action] of [
      ['/cote-plan?p=ventilo', /Payer|Valider/],
      ['/cote-suivre', /Payer/],
      ['/cote-versement', /Valider|Payer/],
      ['/cotisation-partager', /Partager le lien/],
      ['/rentree-liste', /Tout mettre au panier/],
      ['/rentree-panier?l=flamboyants-ce1', /Passer commande/],
      ['/troc', /Estimer ma reprise/],
      ['/troc-depot', /Suivre l’inspection|Voir le relais/],
      ['/famille', /./],
      ['/famille-payer?panier=PF-1', /Payer/],
    ] as const)
      await asideADroite(page, r, action)
  })

  test('Choisir la classe : sections côte à côte dès 1024 ; WhatsApp : décor de 480 et explication à gauche dès 1200', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/rentree-classe')
    const s = page.locator('.g5-sections > section')
    await expect(s).toHaveCount(2)
    expect((await s.nth(1).boundingBox())!.x).toBeGreaterThan((await s.nth(0).boundingBox())!.x + 100)
    await page.goto('/wa')
    expect(Math.round((await boite(page, '.cl15-wa')).width)).toBe(480)
    const g = await boite(page, 'aside.g5-wa-g')
    expect(g.x).toBeLessThan((await boite(page, '.cl15-wa')).x)
  })

  test('Mettre de côté : modale large, le choix à gauche et le récapitulatif à droite', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/cote?p=ventilo')
    const f = page.locator('.sheet[data-forme=large]')
    await expect(f).toBeVisible()
    const radio = (await f.locator('.radio').first().boundingBox())!
    const sum = (await f.locator('.cl15-sum').boundingBox())!
    expect(sum.x).toBeGreaterThan(radio.x + radio.width - 1)
    await expect(f.getByRole('link', { name: 'Voir le plan' })).toBeVisible()
  })
})

// ================================ Lots 13 et 14 : diaspora, pages web publiques, arrivée (§ 4.6, 4.7, 5.14, 5.15) ===
test.describe('lots 13 et 14 : diaspora, pages web publiques, arrivée', () => {
  const zone = async (page: Page, sel: string) => (await page.locator(sel).first().boundingBox())!

  test('connexion : carte de 520 en tablette, écran partagé dès 1200 (photo à gauche, colonne à droite)', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/connexion')
    const carte = await zone(page, 'main .g-arrivee')
    expect(carte.width).toBeLessThanOrEqual(520)
    expect(Math.abs(carte.x + carte.width / 2 - 384)).toBeLessThanOrEqual(2)
    expect((await zone(page, '.gab-visuel .cx-hero')).y).toBeLessThan((await zone(page, '.gab-contenu')).y)
    for (const [w, h] of [
      [1280, 800],
      [1920, 1080],
    ] as const) {
      await page.setViewportSize({ width: w, height: h })
      await page.goto('/connexion')
      const v = await zone(page, '.g-arrivee > .gab-visuel')
      const c = await zone(page, '.g-arrivee > .gab-contenu')
      expect(v.x + v.width).toBeLessThanOrEqual(c.x)
      expect(c.width).toBeGreaterThanOrEqual(470)
      expect(c.width).toBeLessThanOrEqual(570)
      expect(v.height).toBeGreaterThan(h * 0.8)
      // Le retour passe en tête de la colonne ; aucun bouton n'est perdu.
      await expect(page.locator('.gab-contenu .cl03-back')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Découvrir sans compte' })).toBeVisible()
      await expect(page.locator('.cl03-brand')).toBeHidden()
    }
  })

  test('bienvenue : le choix de langue sous l’illustration dès 1200, et il marche', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/bienvenue')
    await expect(page.locator('.gab-visuel .cl03-lang')).toHaveCount(0)
    await expect(page.locator('.gab-contenu .cl03-lang')).toHaveCount(1)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/bienvenue')
    await expect(page.locator('.gab-visuel .cl03-lang')).toBeVisible()
    await page.locator('.gab-visuel .cl03-lang').getByRole('radio', { name: 'English' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('centres d’intérêt : tuiles en 3 colonnes dès 1200 ; e-mail, mot de passe, numéro, Face ID : photo à gauche', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/interets')
    const tuiles = page.locator('.cl03-tile')
    const xs = new Set<number>()
    for (let i = 0; i < 3; i++) xs.add(Math.round((await tuiles.nth(i).boundingBox())!.x))
    expect(xs.size).toBe(3)
    for (const r of ['/connexion-email', '/mdp-oublie', '/numero', '/faceid']) {
      await page.goto(r)
      const v = await zone(page, '.g-arrivee > .gab-visuel')
      expect(v.width, r).toBeGreaterThan(300)
      expect(v.x + v.width, r).toBeLessThanOrEqual((await zone(page, '.g-arrivee > .gab-contenu')).x)
    }
  })

  test('choisir mon relais, adresse, avant de payer : carte et bouton principal dans l’aside collant dès 1024', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/relais-choix')
    await expect(page.locator('nav.dock')).toHaveCount(0)
    const aside = page.locator('aside.gab-aside')
    await expect(aside.locator('.rc-carte')).toBeVisible()
    await expect(aside.getByRole('button', { name: /^Choisir le / })).toBeVisible()
    expect((await zone(page, 'aside.gab-aside')).x).toBeGreaterThan((await zone(page, '.gab-contenu')).x + 300)
    await page.goto('/adresse')
    await expect(page.locator('aside.gab-aside').getByRole('link', { name: 'Enregistrer l’adresse' })).toBeVisible()
    await page.goto('/premiere-commande')
    await expect(page.locator('aside.gab-aside').getByRole('button', { name: /^Payer / })).toBeVisible()
    await expect(page.locator('aside.gab-aside')).toContainText('Total à payer')
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/adresse')
    await expect(page.locator('aside.gab-aside')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Enregistrer l’adresse' })).toHaveCount(1)
  })

  test('changer de numéro : gabarit du compte, colonne de 560 ; ouverture : boutons centrés', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/numero-changer')
    await expect(page.locator('.gab-menu')).toBeVisible()
    expect((await zone(page, '.g-compte > .gab-contenu')).width).toBeLessThanOrEqual(560)
    await page.goto('/ouverture')
    const b = await zone(page, '.op-sc .btns')
    expect(b.width).toBeLessThanOrEqual(420)
    expect(Math.abs(b.x + b.width / 2 - 640)).toBeLessThanOrEqual(2)
  })

  test('pages web publiques : leur en-tête, pas d’en-tête de site, paiement à droite, pied de page réduit', async ({ page }) => {
    const errs = erreurs(page)
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    for (const [r, action] of [
      ['/liste-offrir?l=k7Q2mX&p=tapisyoga', /^Offrir · payer/],
      ['/abonnement-offrir', /^Offrir · payer/],
      ['/cotisation-participer?c=7KQ2M', /^Participer · /],
    ] as const) {
      await page.goto(r)
      await expect(page.locator('header.hd-site'), r).toHaveCount(0)
      await expect(page.locator('nav.hd-nav'), r).toHaveCount(0)
      const aside = page.locator('aside.gab-aside')
      await expect(aside.getByRole('button', { name: action }), r).toBeVisible()
      expect((await zone(page, 'aside.gab-aside')).x, r).toBeGreaterThan((await zone(page, '.g-web > .gab-contenu')).x + 300)
      const pied = page.locator('footer.pied-web')
      await expect(pied, r).toBeVisible()
      const liens = await pied.locator('a[href]').evaluateAll((l) => l.map((a) => a.getAttribute('href') || ''))
      expect(liens.filter((x) => !/^https:\/\/wa\.me\//.test(x) && !OFFICIELS.has(x) && !(x.startsWith('/') && CHEMINS.has(x.split('?')[0]))), r).toEqual([])
    }
    // Liste publique : les articles en grille (au moins deux colonnes), « Offrir » sur chaque carte.
    await page.goto('/liste-publique')
    const cartes = page.locator('.d13-articles > .card')
    expect((await cartes.nth(1).boundingBox())!.x).toBeGreaterThan((await cartes.nth(0).boundingBox())!.x + 100)
    await expect(cartes.first().getByRole('link', { name: 'Offrir cet article' })).toBeVisible()
    // Le contenu commence sous l'en-tête web, sans chevauchement.
    const hd = await zone(page, 'header.cl14-web')
    expect((await zone(page, '.pg-t')).y).toBeGreaterThanOrEqual(hd.y + hd.height)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/liste-publique')
    await expect(page.locator('footer.pied-web')).toHaveCount(0)
    expect(errs).toEqual([])
  })

  test('comptes diaspora, tout savoir : sommaire collant à gauche dès 1200, qui mène au bon passage', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/diaspora-infos')
    await expect(page.locator('.d13-sommaire')).toHaveCount(0)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/diaspora-infos')
    const s = page.locator('nav.d13-sommaire')
    await expect(s.locator('a')).toHaveCount(8)
    expect((await zone(page, '.d13-texte')).width).toBeLessThanOrEqual(761)
    await s.getByRole('link', { name: 'Tes données, ton argent et la loi' }).click()
    await expect(page.locator('#di-loi')).toBeFocused()
    await expect(page.locator('#di-loi')).toBeInViewport()
    await expect(s).toBeInViewport()
  })

  test('espace diaspora et mes proches (Cameroun) : gabarit du compte, code famille dans l’aside', async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/espace-diaspora')
    await expect(page.locator('.gab-menu')).toBeVisible()
    await page.goto('/proches')
    const aside = page.locator('aside.d13-aside')
    await expect(aside).toContainText('Mon code famille')
    await expect(aside.getByRole('button', { name: 'Créer mon code famille' })).toBeVisible()
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/proches')
    await expect(page.locator('aside.d13-aside')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Créer mon code famille' })).toHaveCount(1)
  })

  test('compte diaspora : maître-détail des paniers reçus, commandes en table, paiement dans l’aside', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/inscription-diaspora')
    await page.getByRole('link', { name: 'Avec mon e-mail' }).click()
    await page.getByLabel('Prénom').fill('Hervé')
    await page.getByLabel('Nom', { exact: true }).fill('Mbarga')
    await page.getByLabel('E-mail').fill('herve.mbarga@exemple.fr')
    await page.getByLabel('Pays où tu vis').selectOption('France')
    await page.getByLabel('Ville').fill('Lyon')
    await page.getByLabel('Date de naissance').fill('1990-05-14')
    await page.getByLabel('Ton numéro de téléphone').fill('612345678')
    await page.getByLabel('Mot de passe').fill('Belivay2026')
    await page.getByRole('checkbox', { name: /J’achète pour mes proches/ }).click()
    await page.getByRole('button', { name: 'Recevoir mes codes (SMS et e-mail)' }).click()
    await page.getByLabel('Code reçu par SMS').fill('503917')
    await page.getByLabel('Code reçu par e-mail').fill('284615')
    await page.getByRole('button', { name: 'Créer mon compte diaspora' }).click()
    await expect(page).toHaveURL(/\/proches$/)
    await page.getByLabel('Code famille').fill('FAM-4821')
    await page.getByRole('button', { name: 'Relier' }).click()
    await expect(page.locator('.note.green')).toContainText('Odile est relié')
    await page.setViewportSize({ width: 1280, height: 800 })
    // Mes proches : « Relier un proche » dans l'aside de 360.
    await expect(page.locator('aside.d13-aside')).toContainText('Relier un proche au Cameroun')
    // À payer : la liste et le premier panier ensemble ; choisir une ligne remplace l'adresse.
    await page.goto('/paniers-proches')
    await expect(page.locator('.d13-md-liste .li[aria-current="true"]')).toHaveCount(1)
    await expect(page.locator('.d13-md-detail')).toContainText('Panier de Odile')
    const avant = await page.evaluate(() => history.length)
    await page.locator('.d13-md-liste .li').first().click()
    await expect(page).toHaveURL(/paniers-proches\?id=DP-/)
    expect(await page.evaluate(() => history.length)).toBe(avant)
    // Payer : le total et « Payer » dans l'aside collant, à droite des articles.
    await page.locator('.d13-md-detail').getByRole('link', { name: /^Payer pour Odile/ }).click()
    await expect(page).toHaveURL(/commander-pour\?lien=LF-.*demande=DP-/)
    const aside = page.locator('aside.gab-aside')
    await expect(aside).toContainText('Total')
    await expect(aside.getByRole('button', { name: /^Payer/ })).toBeVisible()
    await aside.getByRole('radio', { name: 'Apple Pay' }).click()
    await aside.getByRole('button', { name: /^Payer/ }).click()
    await aside.getByRole('button', { name: 'Valider' }).click()
    await expect(page.locator('main')).toContainText('Paiement accepté')
    // Espace diaspora : les plafonds en tuiles, les commandes envoyées en vraie table.
    await page.goto('/espace-diaspora')
    await expect(page.locator('.d13-table table tbody tr')).toHaveCount(1)
    await expect(page.locator('.d13-duo > .d13-col')).toHaveCount(2)
  })
})
