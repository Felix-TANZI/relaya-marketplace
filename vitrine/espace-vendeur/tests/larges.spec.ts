// Tablette de l'espace vendeur (DISPOSITION-ECRANS.md du vendeur), comme site/tests/larges.spec.ts. Les tests du
// téléphone (identique, squelette, gestes, boutons à 375) ne bougent pas ; ceux-ci s'ajoutent :
// - toutes les routes ouvertes, de 600 à 1023 px : aucune erreur, aucun défilement horizontal, rien de coupé
//   (élément hors de la fenêtre, texte rogné sans ellipse voulue) ; et à 1280 px, vue ordinateur ;
// - ordinateur (1280 et 1440 px) : barre latérale groupée visible, en-tête fin, contenu centré, aucune erreur, aucun
//   débordement ;
// - coque : un seul en-tête, en-tête de site dès 768 px, barre du bas en capsule centrée, pied de page, contenu sous
//   l'en-tête, liens de la coque vers des adresses connues ; titre des pages enfants dans le contenu ;
// - feuilles en modales centrées, menu du profil ancré sous l'avatar ;
// - rendus : sombre, anglais, très grande taille du texte à 768 px.
import { expect, test, type Page } from '@playwright/test'
import { OUVERTES, adresse, figerHorloge } from './commun'

const TAILLES = [
  [600, 960],
  [768, 1024],
  [900, 1200],
  [1023, 768],
  [1280, 800], // « rien de cassé »
] as const

async function preparer(page: Page, o: { theme?: string; lang?: string; text?: string } = {}) {
  await figerHorloge(page) // heure du jeu d'essai : comptes à rebours immobiles
  await page.addInitScript(
    ([t, l, x]) => {
      try {
        if (!sessionStorage.getItem('blv_v_test')) {
          localStorage.clear()
          sessionStorage.setItem('blv_v_test', '1')
          localStorage.setItem('blv_v_theme', t)
          localStorage.setItem('blv_v_lang', l)
          localStorage.setItem('blv_v_text', x)
        }
      } catch {
        /* rien */
      }
    },
    [o.theme ?? 'light', o.lang ?? 'fr', o.text ?? 'normale'] as const,
  )
}

function erreurs(page: Page) {
  const liste: string[] = []
  page.on('pageerror', (e) => liste.push('exception : ' + e.message))
  page.on('console', (m) => m.type() === 'error' && liste.push('console : ' + m.text()))
  return liste
}

async function aller(page: Page, a: string) {
  await page.goto(adresse(a))
  await expect(page.locator('#app main')).toBeVisible()
  await page.waitForLoadState('networkidle')
}

// Débordements : la page, main, et tout élément visible qui dépasse la fenêtre sans être rogné par un ancêtre qui
// défile (rangées défilantes) ; texte coupé : un bloc de texte dont le contenu dépasse sa boîte sans ellipse voulue.
async function debordements(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('#app main')
    const W = window.innerWidth
    const dehors: string[] = []
    const coupes: string[] = []
    const nom = (e: Element) => `${e.tagName.toLowerCase()}.${String((e as HTMLElement).className).slice(0, 40)}`
    for (const e of document.querySelectorAll<HTMLElement>('#app *')) {
      const r = e.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const cs = getComputedStyle(e)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      if (r.right > W + 1 || r.left < -1) {
        let rogne = false
        for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
          const ox = getComputedStyle(a).overflowX
          const ra = a.getBoundingClientRect()
          if (ox !== 'visible' && ra.right <= W + 1 && ra.left >= -1) {
            rogne = true
            break
          }
        }
        if (!rogne && !e.closest('.sr-only,[aria-hidden=true]') && cs.position !== 'fixed') dehors.push(`${nom(e)} → ${Math.round(r.left)}…${Math.round(r.right)}`)
      }
      // Texte coupé : boîte qui masque son débordement horizontal sans ellipse, et dont le texte dépasse.
      if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 2 && e.childElementCount === 0 && (e.textContent ?? '').trim()) coupes.push(nom(e) + ' « ' + (e.textContent ?? '').trim().slice(0, 30) + ' »')
    }
    return {
      page: document.documentElement.scrollWidth - W,
      main: main ? main.scrollWidth - main.clientWidth : 0,
      dehors: dehors.slice(0, 5),
      coupes: coupes.slice(0, 5),
    }
  })
}

test.describe('aucun débordement, de 600 à 1023 px (et 1280)', () => {
  for (const r of OUVERTES) {
    test(r, async ({ page }) => {
      test.setTimeout(90_000)
      const errs = erreurs(page)
      await preparer(page)
      for (const [w, h] of TAILLES) {
        await page.setViewportSize({ width: w, height: h })
        await aller(page, '#' + r)
        const d = await debordements(page)
        expect(d.page, `${r} à ${w} px : défilement de la page`).toBeLessThanOrEqual(0)
        expect(d.main, `${r} à ${w} px : défilement de main`).toBeLessThanOrEqual(0)
        expect(d.dehors, `${r} à ${w} px : éléments hors de la fenêtre`).toEqual([])
        expect(d.coupes, `${r} à ${w} px : textes coupés`).toEqual([])
      }
      expect(errs).toEqual([])
    })
  }
})

test.describe('coque des grands écrans', () => {
  // Une page à en-tête racine (accueil), deux pages enfants (commande, paramètres).
  for (const r of ['accueil', 'commande', 'parametres']) {
    test(`en-tête, navigation et pied de page : ${r}`, async ({ page }) => {
      const errs = erreurs(page)
      await preparer(page)
      for (const [w, h] of TAILLES) {
        await page.setViewportSize({ width: w, height: h })
        await aller(page, '#' + r)
        await expect(page.locator('#app header.hd')).toHaveCount(1)
        await expect(page.locator('header.hd-site')).toHaveCount(w >= 768 ? 1 : 0)
        await expect(page.locator('#app main > footer.pied')).toHaveCount(w >= 768 ? 1 : 0)
        await expect(page.locator('nav.hd-nav')).toHaveCount(0)
        // Dès 1024 px (ordinateur) : la barre latérale remplace la barre du bas.
        await expect(page.locator('nav.dock')).toHaveCount(w >= 1024 ? 0 : 1)
        await expect(page.locator('#app aside.sl')).toHaveCount(w >= 1024 ? 1 : 0)
        // Le contenu commence sous l'en-tête : rien n'est caché dessous.
        const hd = (await page.locator('#app header.hd').boundingBox())!
        const premier = (await page.locator('#app main > *:visible').first().boundingBox())!
        expect(premier.y, `${r} à ${w} px : contenu sous l'en-tête`).toBeGreaterThanOrEqual(hd.y + hd.height - 1)
      }
      // Liens de la coque : vers des routes connues de l'espace vendeur (ou l'espace client, les réseaux officiels).
      await page.setViewportSize({ width: 900, height: 1000 })
      await aller(page, '#' + r)
      const liens = await page.locator('header.hd-site a[href], footer.pied a[href]').evaluateAll((l) => l.map((a) => a.getAttribute('href') || ''))
      const connues = new Set(['/vendeur', ...OUVERTES.map((x) => (x === 'accueil' ? '/vendeur/' : '/vendeur/' + x))])
      const inconnus = liens.filter((x) => !/^(https:|tel:|mailto:)/.test(x) && x !== '/' && !connues.has(x.split('?')[0]))
      expect(inconnus, 'liens vers une adresse inconnue').toEqual([])
      expect(errs).toEqual([])
    })
  }

  test('pages enfants : titre dans le contenu, retour mémorisé', async ({ page }) => {
    await preparer(page)
    await page.setViewportSize({ width: 768, height: 1024 })
    await aller(page, '#journal?ref=BLV-00008')
    const barre = page.locator('#app main .hd-page')
    await expect(barre.locator('h1')).toBeVisible()
    await expect(page.locator('#app header.hd-site')).toHaveCount(1)
    // Sans page précédente dans la visite : le parent logique (la commande).
    await barre.getByRole('link', { name: 'Revenir' }).click()
    await expect(page).toHaveURL(/\/commande\?ref=BLV-00008/)
  })

  test('barre du bas : capsule centrée de 768 à 1023 px', async ({ page }) => {
    await preparer(page)
    for (const w of [768, 1023]) {
      await page.setViewportSize({ width: w, height: 900 })
      await aller(page, '#accueil')
      const dock = page.locator('nav.dock')
      await expect(dock).toBeVisible()
      const b = (await dock.boundingBox())!
      expect(b.width).toBeLessThanOrEqual(520)
      expect(Math.abs(b.x + b.width / 2 - w / 2)).toBeLessThanOrEqual(1)
      await dock.locator('a.tab').nth(1).click()
      await expect(page).toHaveURL(/\/commandes$/)
      await expect(dock.locator('a.tab').nth(1)).toHaveAttribute('aria-current', 'page')
    }
  })

  test('menu du profil : ancré sous l’avatar, dans la fenêtre, Échap le ferme', async ({ page }) => {
    await preparer(page)
    await page.setViewportSize({ width: 900, height: 1000 })
    await aller(page, '#commandes')
    await page.locator('header.hd-site .avatar').click()
    await expect(page).toHaveURL(/pop=profil/)
    const menu = page.locator('#app .pm')
    await expect(menu).toBeVisible()
    await page.waitForTimeout(400) // fin de l'ouverture (pmIn du prototype)
    const hd = (await page.locator('header.hd-site').boundingBox())!
    const m = (await menu.boundingBox())!
    expect(m.y).toBeGreaterThanOrEqual(hd.y + hd.height - 8)
    expect(m.x + m.width).toBeLessThanOrEqual(900)
    await page.keyboard.press('Escape')
    await expect(page.locator('#app .pm')).toHaveCount(0)
  })

  test('feuilles : modale centrée dès 768 px, Échap la ferme', async ({ page }) => {
    await preparer(page)
    for (const w of [768, 1023]) {
      await page.setViewportSize({ width: w, height: 900 })
      await aller(page, '#commandes')
      await page.getByRole('button', { name: 'Exporter, factures' }).click()
      const f = page.locator('#app .sheet')
      await expect(f).toBeVisible()
      const b = (await f.boundingBox())!
      expect(b.width).toBeLessThanOrEqual(560)
      expect(Math.abs(b.x + b.width / 2 - w / 2)).toBeLessThanOrEqual(2)
      expect(b.y).toBeGreaterThan(0)
      await page.keyboard.press('Escape')
      await expect(page.locator('#app .sheet')).toHaveCount(0)
    }
  })
})

test.describe('rendus', () => {
  const RENDUS = [
    { nom: 'sombre à 768', w: 768, o: { theme: 'dark' } },
    { nom: 'anglais à 768', w: 768, o: { lang: 'en' } },
    { nom: 'très grand texte à 768', w: 768, o: { text: 'tres' } },
  ]
  for (const r of RENDUS)
    test(r.nom, async ({ page }) => {
      test.setTimeout(120_000)
      const errs = erreurs(page)
      await preparer(page, r.o)
      await page.setViewportSize({ width: r.w, height: 900 })
      for (const route of ['accueil', 'commandes', 'commande', 'produits', 'argent', 'litiges', 'messages', 'menu', 'parametres', 'palier', 'connexion']) {
        await aller(page, '#' + route)
        const d = await debordements(page)
        expect(d.page, `${route} : défilement de la page`).toBeLessThanOrEqual(0)
        expect(d.dehors, `${route} : éléments hors de la fenêtre`).toEqual([])
        if (r.o.lang === 'en') await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      }
      expect(errs).toEqual([])
    })
})

// ---------- Ordinateur (dès 1024 px) : barre latérale, en-tête fin, contenu centré ----------
test.describe('vue ordinateur, 1280 et 1440 px', () => {
  const PAGES_ORD = ['accueil', 'commandes', 'produits', 'offre1', 'stock', 'promotions', 'argent', 'parametres', 'profil', 'litiges']
  for (const w of [1280, 1440])
    test(`barre latérale, en-tête fin, aucune erreur ni débordement à ${w} px`, async ({ page }) => {
      test.setTimeout(120_000)
      const errs = erreurs(page)
      await preparer(page)
      await page.setViewportSize({ width: w, height: 900 })
      for (const r of PAGES_ORD) {
        await aller(page, '#' + r)
        const sl = page.locator('#app aside.sl')
        await expect(sl, `${r} : barre latérale`).toBeVisible()
        await expect(sl.locator('.tr-gt')).toHaveText(['Ventes', 'Catalogue', 'Croissance', 'Boutique', 'Mon compte'])
        await expect(sl.getByRole('link', { name: 'Retour au site' })).toHaveAttribute('href', '/')
        await expect(page.locator('nav.dock')).toHaveCount(0)
        // L'en-tête fin commence après la barre latérale ; le contenu aussi, et rien ne passe dessous.
        const b = (await sl.boundingBox())!
        const hd = (await page.locator('#app header.hd-site').boundingBox())!
        expect(hd.x, `${r} : en-tête après la barre`).toBeGreaterThanOrEqual(b.x + b.width - 1)
        expect(hd.height, `${r} : en-tête fin`).toBeLessThanOrEqual(80)
        const m = (await page.locator('#app main').boundingBox())!
        expect(m.x, `${r} : contenu après la barre`).toBeGreaterThanOrEqual(b.x + b.width - 1)
        const d = await debordements(page)
        expect(d.page, `${r} à ${w} px : défilement de la page`).toBeLessThanOrEqual(0)
        expect(d.main, `${r} à ${w} px : défilement de main`).toBeLessThanOrEqual(0)
        expect(d.dehors, `${r} à ${w} px : éléments hors de la fenêtre`).toEqual([])
        expect(d.coupes, `${r} à ${w} px : textes coupés`).toEqual([])
      }
      // L'entrée de la page ouverte est allumée ; l'avatar ouvre Mon profil.
      await aller(page, '#commandes')
      await expect(page.locator('#app aside.sl a[aria-current=page]')).toHaveText(/Commandes/)
      await page.locator('header.hd-site .avatar').click()
      await expect(page).toHaveURL(/\/profil$/)
      expect(errs).toEqual([])
    })
})
