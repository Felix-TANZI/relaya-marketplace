// Squelette de l'espace vendeur : chaque route s'ouvre sans erreur, sans débordement de 360 à 430 px, en clair et
// sombre, en français et en anglais ; aucun lien vers une adresse inconnue ; les écrans retirés le disent ; une
// adresse inconnue mène à « Ce lien ne mène à aucune page ». Contrôles statiques : dictionnaires sans doublon,
// anonymat des types de la SourceVendeur, chaque groupe déclare ses routes dans son dossier.
import { expect, test, type Page } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { OUVERTES, PAGES, RETIREES, adresse, figerHorloge, ouvrir, type Rendu } from './commun'

// Routes connues : l'inventaire (pages.json, régénéré en vague d'intégration) et les routes déclarées par chaque groupe
// (src/pages/*/routes.ts : les pages ajoutées AJ-x existent avant la régénération de l'inventaire).
const ROUTES = new Set(PAGES.map((p) => p.route))
for (const d of readdirSync(new URL('../src/pages/', import.meta.url), { withFileTypes: true }))
  if (d.isDirectory())
    try {
      for (const m of readFileSync(new URL(`../src/pages/${d.name}/routes.ts`, import.meta.url), 'utf-8').matchAll(/route:\s*'([\w-]+)'/g)) ROUTES.add(m[1])
    } catch {
      /* dossier sans routes.ts */
    }
const RENDUS: (Rendu & { largeurs: number[] })[] = [
  { nom: 'clair, français', theme: 'light', lang: 'fr', largeurs: [360, 430] },
  { nom: 'sombre, anglais', theme: 'dark', lang: 'en', largeurs: [390] },
]

async function controler(page: Page, route: string, erreurs: string[]) {
  // Aucune erreur, écran non vide, aucun « undefined », « NaN », « null » ni « [object ».
  expect(erreurs, 'erreurs JavaScript').toEqual([])
  const texte = await page.locator('#app').innerText()
  expect(texte.trim().length, 'écran vide').toBeGreaterThan(route === 'lancement' || route === 'camera' ? 0 : 20)
  expect(texte).not.toMatch(/\bundefined\b|\bNaN\b|\[object /)
  // Aucun défilement horizontal de la page ni du contenu.
  const debord = await page.evaluate(() => {
    const m = document.querySelector('#app main') as HTMLElement | null
    return { page: document.documentElement.scrollWidth - innerWidth, main: m ? m.scrollWidth - m.clientWidth : 0 }
  })
  expect(debord.page, 'défilement horizontal de la page').toBeLessThanOrEqual(0)
  expect(debord.main, 'défilement horizontal du contenu').toBeLessThanOrEqual(0)
  // Liens internes : vers une route connue de l'inventaire (retirée comprise : elle dit pourquoi).
  const liens = await page.evaluate(() => [...document.querySelectorAll('#app a[href]')].map((a) => (a as HTMLAnchorElement).href).filter((h) => h.startsWith(location.origin)))
  const inconnus = liens
    .map((h) => new URL(h).pathname.replace(/^\/vendeur\/?/, '').split('/')[0] || 'accueil')
    .filter((r) => !ROUTES.has(r))
  expect(inconnus, 'liens vers une route inconnue').toEqual([])
}

for (const r of RENDUS)
  test.describe(`squelette, ${r.nom}`, () => {
    for (const route of OUVERTES)
      test(route, async ({ page }) => {
        const erreurs: string[] = []
        page.on('pageerror', (e) => erreurs.push(e.message))
        page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()))
        await figerHorloge(page)
        for (const largeur of r.largeurs) {
          await page.setViewportSize({ width: largeur, height: 812 })
          await ouvrir(page, '#' + route, r)
          await controler(page, route, erreurs)
          expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(r.theme)
          expect(await page.getByText(/Ce lien ne mène à aucune page|This link leads to no page/).count(), 'la route existe').toBe(0)
        }
      })
  })

test('écrans retirés : « Écran retiré »', async ({ page }) => {
  for (const route of RETIREES) {
    await ouvrir(page, '#' + route, { nom: 'clair', theme: 'light', lang: 'fr' })
    await expect(page.getByRole('heading', { name: 'Écran retiré' })).toBeVisible()
  }
})

test('adresse inconnue : « Ce lien ne mène à aucune page », barre du bas présente', async ({ page }) => {
  await ouvrir(page, '#nulle-part', { nom: 'clair', theme: 'light', lang: 'fr' })
  await expect(page.getByRole('heading', { name: 'Ce lien ne mène à aucune page' })).toBeVisible()
  await expect(page.locator('nav.dock .tab')).toHaveCount(4)
})

// Consigne du porteur (24 oct. 2026) : à 4 onglets, la barre du bas reste la pilule d'avant (12 px des bords, onglet
// actif et bulle de verre en pilule) ; seul le client (5 onglets) a le rectangle aux coins doux. Contenu à 12 px des
// bords au téléphone.
test('barre du bas à 4 onglets : pilule, 12 px des bords ; contenu à 12 px des bords', async ({ page }) => {
  await ouvrir(page, '#accueil', { nom: 'clair', theme: 'light', lang: 'fr' })
  for (const w of [360, 375, 430]) {
    await page.setViewportSize({ width: w, height: 844 })
    await page.locator('nav.dock .tab.on').waitFor()
    const f = await page.evaluate(() => {
      const d = document.querySelector<HTMLElement>('nav.dock')!
      const r = d.getBoundingClientRect()
      const on = d.querySelector<HTMLElement>('.tab.on')!
      const m = getComputedStyle(document.querySelector('main')!)
      return { forme: d.dataset.forme, n: d.querySelectorAll('.tab').length, g: r.left, dr: innerWidth - r.right, pilule: parseFloat(getComputedStyle(d).borderRadius) >= r.height / 2, onglet: parseFloat(getComputedStyle(on).borderRadius) >= on.getBoundingClientRect().height / 2, ml: m.paddingLeft, mr: m.paddingRight }
    })
    expect(f).toEqual({ forme: 'ovale', n: 4, g: 12, dr: 12, pilule: true, onglet: true, ml: '12px', mr: '12px' })
  }
  // Bulle de verre saisie : pilule (rayon = moitié de sa hauteur). Avec les mouvements (PW_MOUVEMENTS), l'écran
  // d'ouverture passe d'abord.
  await expect(page.locator('.blv-spl')).toHaveCount(0, { timeout: 15_000 })
  const t = (await page.locator('nav.dock .tab.on').boundingBox())!
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 6; i++) await page.mouse.move(t.x + t.width / 2 + i * 8, t.y + t.height / 2)
  const bulle = page.locator('nav.dock .dock-bulle')
  await expect(bulle).toHaveCount(1)
  const forme = await bulle.evaluate((e) => ({ h: e.getBoundingClientRect().height, r: parseFloat(e.style.borderRadius) }))
  expect(forme.r).toBeCloseTo(forme.h / 2, 0)
  await page.mouse.up()
})

test('langue et thème : l’en-tête et le Menu les changent, ils sont gardés', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, '#accueil', { nom: 'clair', theme: 'light', lang: 'fr' })
  await page.locator('header button.lang').click()
  await page.waitForFunction(() => document.documentElement.lang === 'en')
  await expect(page.locator('nav.dock')).toContainText('Orders')
  await page.locator('header button[data-act="theme"]').click()
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
  await page.goto(adresse('#menu'))
  await page.locator('[data-preferences-menu] [role=radio]', { hasText: 'Français' }).click()
  await page.locator('[data-preferences-menu] [role=radio]', { hasText: /^(Clair|Light)$/ }).click()
  await page.reload()
  await page.waitForSelector('#app')
  expect(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dataset.theme])).toEqual(['fr', 'light'])
})

test('dictionnaires anglais : aucune clé en double avec le prototype ni entre groupes', () => {
  const proto = JSON.parse(readFileSync(new URL('../src/genere/en.json', import.meta.url), 'utf-8'))
  const dossier = new URL('../src/i18n/', import.meta.url)
  const vus: Record<string, string> = {}
  const doubles: string[] = []
  for (const f of readdirSync(dossier).filter((x) => x.endsWith('.en.json'))) {
    for (const k of Object.keys(JSON.parse(readFileSync(new URL(f, dossier), 'utf-8')))) {
      if (k in proto) doubles.push(`${f} : « ${k} » est déjà dans le dictionnaire du prototype`)
      else if (vus[k]) doubles.push(`${f} : « ${k} » est déjà dans ${vus[k]}`)
      vus[k] = f
    }
  }
  expect(doubles).toEqual([])
})

test('anonymat : aucun type de la SourceVendeur ne porte l’identité, le relais ou le total payé du client (GEN-01)', () => {
  const dossier = new URL('../src/donnees/domaines/', import.meta.url)
  const INTERDITS = /^\s*(nomClient|prenomClient|client(Nom|Prenom|Telephone|Email|Adresse|Quartier|Id)|telephoneClient|adresseClient|quartierClient|relais(Client)?|pointRelais|totalPaye|montantPaye|modeLivraison|adresseLivraison)\??\s*:/m
  const fautes = readdirSync(dossier)
    .filter((f) => f.endsWith('.ts'))
    .flatMap((f) =>
      readFileSync(new URL(f, dossier), 'utf-8')
        .split('\n')
        .filter((l) => INTERDITS.test(l))
        .map((l) => `${f} : ${l.trim()}`),
    )
  expect(fautes).toEqual([])
})

test('routes : chaque groupe les déclare dans son dossier, aucune route en double, toutes les routes ouvertes ont un écran', () => {
  const dossier = new URL('../src/pages/', import.meta.url)
  const declarees: string[] = []
  for (const d of readdirSync(dossier, { withFileTypes: true }).filter((x) => x.isDirectory() && /^(VD-\d\d|AJ-[A-Z])$/.test(x.name))) {
    const texte = readFileSync(new URL(d.name + '/routes.ts', dossier), 'utf-8')
    expect(texte, d.name).toContain(`groupe: '${d.name}'`)
    for (const m of texte.matchAll(/route:\s*'([\w-]+)'/g)) declarees.push(m[1])
  }
  expect(declarees.length, 'routes en double').toBe(new Set(declarees).size)
  expect(OUVERTES.filter((r) => !declarees.includes(r)), 'routes sans écran').toEqual([])
})
