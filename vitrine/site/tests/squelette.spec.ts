// Contrôles de comportement du squelette (étape 4), sur toutes les routes du site. L'apparence est jugée
// à part, par comparaison au pixel avec le prototype (identique.spec.ts).
// - chaque route ouverte s'affiche sans erreur, dans les rendus de CRD-01 (clair, sombre, anglais,
//   Grande et Très grande taille de texte ; pas de pidgin, DP-13), de 360 à 430 px (CRD-10) ;
// - aucun défilement horizontal de la page, aucune icône absente (CDS-09) ;
// - aucun lien vers une adresse inconnue ;
// - une route d'un module fermé ouvre « Ce lien ne mène à aucune page » (CCH-19, CFS-02, CFS-04).
import { expect, test, type Page } from '@playwright/test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

interface P {
  route: string
  interrupteur: string | null
}
const PAGES: P[] = JSON.parse(readFileSync(new URL('../src/genere/pages.json', import.meta.url), 'utf-8'))
// Une route est ouverte si elle n'a pas d'interrupteur ou si le sien l'est (src/config/interrupteurs.json, DP-50).
const INTERRUPTEURS: Record<string, boolean> = JSON.parse(readFileSync(new URL('../src/config/interrupteurs.json', import.meta.url), 'utf-8'))
const ouverte = (p: P) => !p.interrupteur || INTERRUPTEURS[p.interrupteur]
const OUVERTES = PAGES.filter(ouverte)
const FERMEES = PAGES.filter((p) => !ouverte(p))
// Pages propres au site (DP-52, DP-53 : src/pages/*/pages-site.json), absentes de l'inventaire du prototype.
const PAGES_SITE: string[] = readdirSync(new URL('../src/pages/', import.meta.url), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(new URL(`../src/pages/${d.name}/pages-site.json`, import.meta.url)))
  .flatMap((d) => JSON.parse(readFileSync(new URL(`../src/pages/${d.name}/pages-site.json`, import.meta.url), 'utf-8')).routes as string[])
const CHEMINS = new Set([...OUVERTES.map((p) => (p.route === 'accueil' ? '/' : '/' + p.route)), ...PAGES_SITE.map((r) => '/' + r)])
const chemin = (r: string) => (r === 'accueil' ? '/' : '/' + r)

const RENDUS = [
  { nom: 'clair', theme: 'light', lang: 'fr', text: 'normale', largeur: 375 },
  { nom: 'sombre', theme: 'dark', lang: 'fr', text: 'normale', largeur: 375 },
  { nom: 'anglais', theme: 'light', lang: 'en', text: 'normale', largeur: 375 },
  { nom: 'grande', theme: 'light', lang: 'fr', text: 'grande', largeur: 375 },
  { nom: 'très grande', theme: 'light', lang: 'fr', text: 'tres', largeur: 375 },
  { nom: '360 px', theme: 'light', lang: 'fr', text: 'normale', largeur: 360 },
  { nom: '430 px', theme: 'dark', lang: 'en', text: 'normale', largeur: 430 },
] as const

async function prepare(page: Page, r: (typeof RENDUS)[number]) {
  await page.setViewportSize({ width: r.largeur, height: 812 })
  await page.addInitScript(
    ([t, l, x]) => {
      localStorage.setItem('blv_c_theme', t)
      localStorage.setItem('blv_c_lang', l)
      localStorage.setItem('blv_c_text', x)
    },
    [r.theme, r.lang, r.text],
  )
}

function erreurs(page: Page) {
  const liste: string[] = []
  page.on('pageerror', (e) => liste.push('exception : ' + e.message))
  page.on('console', (m) => m.type() === 'error' && liste.push('console : ' + m.text()))
  return liste
}

for (const r of RENDUS) {
  test.describe(`rendu ${r.nom}`, () => {
    for (const p of OUVERTES) {
      test(p.route, async ({ page }) => {
        const errs = erreurs(page)
        await prepare(page, r)
        await page.goto(chemin(p.route))
        await expect(page.locator('main')).toBeVisible()
        if (r.lang === 'en') await expect(page.locator('html')).toHaveAttribute('lang', 'en')
        await expect(page.locator('html')).toHaveAttribute('data-theme', r.theme)

        const mesure = await page.evaluate(() => ({
          debord: document.documentElement.scrollWidth - window.innerWidth,
          liens: [...document.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''),
        }))
        expect(mesure.debord, 'défilement horizontal').toBeLessThanOrEqual(0)
        // Liens sortants permis : la carte OpenStreetMap (DP-54), le partage par WhatsApp, SMS ou e-mail, l’appel et les réseaux officiels ;
        // les autres espaces du même domaine (DP-38 : /vendeur/, /entreprise/, /livreur/, /relais/ ; connexion des personnages, VAGUE n° 2).
        const inconnus = mesure.liens.filter((h) => h !== '#' && !/^(https:\/\/www\.openstreetmap\.org\/|https:\/\/wa\.me\/|https:\/\/www\.(facebook|instagram|tiktok)\.com\/|sms:|mailto:|tel:|geo:|\/(vendeur|entreprise|livreur|relais)\/)/.test(h) && !(h.startsWith('/') && CHEMINS.has(h.split('?')[0])))
        expect(inconnus, 'liens vers une adresse inconnue').toEqual([])
        expect(errs).toEqual([])
      })
    }
  })
}

test.describe('modules fermés', () => {
  for (const p of FERMEES) {
    test(`${p.route} (${p.interrupteur})`, async ({ page }) => {
      const errs = erreurs(page)
      await page.goto(chemin(p.route))
      await expect(page.getByText('Ce lien ne mène à aucune page')).toBeVisible()
      await expect(page.locator('.btn.primary')).toHaveCount(1)
      expect(errs).toEqual([])
    })
  }
})

test.describe('coque', () => {
  test('ouverture en clair même si le téléphone est en sombre (CDS-03)', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await ctx.close()
  })

  test('barre du bas : cinq onglets, Mes commandes allume Compte (CNV-01)', async ({ page }) => {
    await page.goto('/commandes')
    const onglets = page.locator('.dock .tab')
    await expect(onglets).toHaveCount(5)
    await expect(page.locator('.dock .tab[aria-current="page"]')).toHaveText(/Compte/)
  })

  // Consigne du porteur (23 oct. 2026) : barre en rectangle aux coins doux (22 px), onglet actif à 14 px, jamais une
  // pilule ; 10 px des bords ; contenu des pages à 12 px des bords au téléphone, en-tête inchangé. 24 oct. 2026 : ce
  // rectangle ne vaut qu'à 5 onglets ou plus (le client) ; à 4 ou moins, la pilule d'avant (tests du vendeur).
  test('barre du bas : coins doux, 10 px des bords ; contenu à 12 px des bords', async ({ page }) => {
    for (const w of [320, 375, 430]) {
      await page.setViewportSize({ width: w, height: 844 })
      await page.goto('/commandes')
      await page.locator('nav.dock .tab.on').waitFor()
      const f = await page.evaluate(() => {
        const d = document.querySelector('nav.dock')!
        const r = d.getBoundingClientRect()
        const on = d.querySelector('.tab.on')!
        const m = getComputedStyle(document.querySelector('main')!)
        return { forme: (d as HTMLElement).dataset.forme, n: d.querySelectorAll('.tab').length, g: r.left, dr: innerWidth - r.right, rayon: getComputedStyle(d).borderRadius, onglet: getComputedStyle(on).borderRadius, ml: m.paddingLeft, mr: m.paddingRight }
      })
      expect(f).toEqual({ forme: 'doux', n: 5, g: 10, dr: 10, rayon: '22px', onglet: '14px', ml: '12px', mr: '12px' })
    }
    // Bulle de verre saisie : coins doux aussi (rayon de l'onglet, jamais la moitié de sa hauteur).
    const t = (await page.locator('nav.dock .tab.on').boundingBox())!
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2)
    await page.mouse.down()
    for (let i = 1; i <= 6; i++) await page.mouse.move(t.x + t.width / 2 + i * 8, t.y + t.height / 2)
    const bulle = page.locator('nav.dock .dock-bulle')
    await expect(bulle).toHaveCount(1)
    const forme = await bulle.evaluate((e) => ({ h: e.getBoundingClientRect().height, r: parseFloat(e.style.borderRadius) }))
    expect(forme.r).toBeGreaterThanOrEqual(14)
    expect(forme.r).toBeLessThan(forme.h / 2 - 4)
    await page.mouse.up()
  })

  test('écran de tâche sans barre du bas (CNV-08)', async ({ page }) => {
    await page.goto('/paiement-attente')
    await expect(page.locator('.dock')).toHaveCount(0)
  })

  test('le Menu bascule langue et thème, et les garde (CNV-02, CRD-02)', async ({ page }) => {
    await page.goto('/menu')
    await page.getByRole('link', { name: 'English' }).click()
    await expect(page.locator('.dock .tab').first()).toHaveText('Home')
    await page.getByRole('switch').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('le bouton retour mène au parent naturel, jamais au Menu (CNV-03, CNV-10)', async ({ page }) => {
    await page.goto('/menu')
    await page.goto('/commande')
    await page.getByRole('link', { name: 'Revenir' }).click()
    await expect(page).toHaveURL(/\/commandes$/)
  })

  test('les modules du Menu suivent leur interrupteur (CCH-18, CTV-34, DP-50)', async ({ page }) => {
    // Interrupteurs en vigueur (tous ouverts depuis DP-50) : un module fermé disparaît du Menu.
    const ff = INTERRUPTEURS
    await page.goto('/menu')
    await expect(page.locator('.dx-tiles a[href="/ventes-flash"]')).toHaveCount(ff['FF-FLASH'] ? 1 : 0)
    await expect(page.locator('.wl-card')).toHaveCount(0) // Wallet hors du menu (consigne du porteur) : depuis Compte seulement
    // Repères de revue du prototype (services d'après le lancement) : jamais sur le site.
    await expect(page.locator('.dx-svc')).toHaveCount(0)
  })
})
