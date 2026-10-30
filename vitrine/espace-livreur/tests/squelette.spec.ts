// Squelette de l'espace livreur : chaque route s'ouvre sans erreur, sans débordement de 360 à 430 px (téléphone
// d'abord) et à 768 px (tablette), en clair et sombre, en français et en anglais ; aucun lien vers une adresse
// inconnue ; une adresse inconnue mène à « Ce lien ne mène à aucune page ». Contrôles statiques : dictionnaires sans
// doublon, ce que le livreur ne voit jamais absent des types de la SourceLivreur, chaque groupe déclare ses routes.
import { expect, test, type Page } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { OUVERTES, PAGES, ROUTES_DECLAREES, adresse, figerHorloge, ouvrir, type Rendu } from './commun'

const ROUTES = new Set(ROUTES_DECLAREES)
const RENDUS: (Rendu & { largeurs: number[] })[] = [
  { nom: 'clair, français', theme: 'light', lang: 'fr', largeurs: [360, 430] },
  { nom: 'sombre, anglais', theme: 'dark', lang: 'en', largeurs: [390, 768] },
]

async function controler(page: Page, erreurs: string[]) {
  // Aucune erreur, écran non vide, aucun « undefined », « NaN », « null » ni « [object ».
  expect(erreurs, 'erreurs JavaScript').toEqual([])
  const texte = await page.locator('#app').innerText()
  expect(texte.trim().length, 'écran vide').toBeGreaterThan(20)
  expect(texte).not.toMatch(/\bundefined\b|\bNaN\b|\[object /)
  // Aucun défilement horizontal de la page ni du contenu.
  const debord = await page.evaluate(() => {
    const m = document.querySelector('#app main') as HTMLElement | null
    return { page: document.documentElement.scrollWidth - innerWidth, main: m ? m.scrollWidth - m.clientWidth : 0 }
  })
  expect(debord.page, 'défilement horizontal de la page').toBeLessThanOrEqual(0)
  expect(debord.main, 'défilement horizontal du contenu').toBeLessThanOrEqual(0)
  // Liens internes : vers une route déclarée.
  const liens = await page.evaluate(() => [...document.querySelectorAll('#app a[href]')].map((a) => (a as HTMLAnchorElement).href).filter((h) => h.startsWith(location.origin)))
  const inconnus = liens.map((h) => new URL(h).pathname.replace(/^\/livreur\/?/, '').split('/')[0] || 'aujourdhui').filter((r) => !ROUTES.has(r))
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
          await controler(page, erreurs)
          expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(r.theme)
          expect(await page.getByText(/Ce lien ne mène à aucune page|This link leads to no page/).count(), 'la route existe').toBe(0)
        }
      })
  })

test('adresse inconnue : « Ce lien ne mène à aucune page », barre du bas présente', async ({ page }) => {
  await ouvrir(page, '#nulle-part', { nom: 'clair', theme: 'light', lang: 'fr' })
  await expect(page.getByRole('heading', { name: 'Ce lien ne mène à aucune page' })).toBeVisible()
  await expect(page.locator('nav.dock .tab')).toHaveCount(4)
})

test('coque : en-tête racine du prototype (☰ Menu, incident, cloche, avatar Profil, pastilles), Menu ≠ Profil', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, '#aujourdhui', { nom: 'clair', theme: 'light', lang: 'fr' })
  await expect(page.locator('nav.dock a.tab[aria-current="page"]')).toContainText('Aujourd’hui')
  await expect(page.getByRole('link', { name: 'Signaler un incident' })).toBeVisible()
  await expect(page.locator('.l-pastilles .l-pill')).toHaveCount(3)
  // Langue : pilule segmentée FR | EN dans l'en-tête, comme la console et l'entreprise (porteur, 24 oct.), et
  // toujours dans le Menu et les Réglages.
  await expect(page.locator('.l-hd-rang .vie-lang')).toHaveAccessibleName('Passer en anglais')
  await expect(page.locator('.l-hd-rang .vie-lang .vl-o.on')).toHaveText('FR')
  await page.getByRole('link', { name: 'Menu', exact: true }).click()
  await expect(page).toHaveURL(/\/menu$/)
  await expect(page.locator('main')).toContainText('Serge Atangana')
  await expect(page.locator('main .divider-t')).toContainText(['Ma journée', 'Sur la route', 'Mes résultats', 'Mon compte', 'Affichage'])
  await page.goto('./')
  await page.getByRole('link', { name: 'Mon profil' }).click()
  await expect(page).toHaveURL(/\/moi$/)
  await expect(page.locator('main .hero.night')).toContainText('Serge Atangana')
  await expect(page.getByRole('link', { name: 'SOS : danger immédiat' })).toBeVisible()
})

test('langue, thème et taille du texte : le Menu les change, ils sont gardés', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, '#aujourdhui', { nom: 'clair', theme: 'light', lang: 'fr' })
  await page.getByRole('button', { name: 'Thème sombre' }).click()
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
  await page.getByRole('link', { name: 'Menu', exact: true }).click()
  await page.getByRole('radio', { name: 'EN' }).click()
  await page.waitForFunction(() => document.documentElement.lang === 'en')
  await expect(page.locator('nav.dock')).toContainText('Today')
  await page.getByRole('button', { name: 'Larger text' }).click()
  const zoom = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
  expect(parseFloat(zoom)).toBeGreaterThan(16)
  await page.reload()
  await page.waitForSelector('#app')
  expect(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dataset.theme])).toEqual(['en', 'dark'])
})

test('sans session : toute page mène à la connexion, qui garde la page demandée', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, '#aujourdhui', { nom: 'clair', theme: 'light', lang: 'fr' })
  await page.getByRole('link', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: /Verrouiller/ }).click()
  await expect(page).toHaveURL(/\/connexion$/)
  await page.goto(adresse('#tournee'))
  await expect(page).toHaveURL(/\/connexion\?next=%2Flivreur%2Ftournee|\/connexion\?next=%2Ftournee/)
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

test('ce que le livreur ne voit jamais : contenu, prix, identité ou numéro du client, téléphone, compte de versement', () => {
  const dossier = new URL('../src/donnees/domaines/', import.meta.url)
  const INTERDITS = /^\s*(contenu|prix\w*|nomClient|prenomClient|client(Nom|Prenom|Telephone|Email|Adresse|Id)|telephone\w*|numero(Client|Telephone)|totalPaye|montantPaye|compteVersement|iban|numeroMomo|autreLivreur\w*)\??\s*:/m
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

test('routes : chaque groupe les déclare dans son dossier, aucune en double, l’inventaire est à jour, les 33 écrans (32 du paquet et Appel, LIV-P33, DP-61) ont leur route', () => {
  const dossier = new URL('../src/pages/', import.meta.url)
  const declarees: string[] = []
  for (const d of readdirSync(dossier, { withFileTypes: true }).filter((x) => x.isDirectory())) {
    expect(d.name, 'dossier de groupe').toMatch(/^(LIV-\d\d|AJ-L)$/)
    const texte = readFileSync(new URL(d.name + '/routes.ts', dossier), 'utf-8')
    expect(texte, d.name).toContain(`groupe: '${d.name}'`)
    for (const m of texte.matchAll(/route:\s*'([\w-]+)'/g)) declarees.push(m[1])
  }
  expect(declarees.length, 'routes en double').toBe(new Set(declarees).size)
  expect([...declarees].sort(), 'inventaire en retard : npm run inventaire').toEqual([...OUVERTES].sort())
  // Une page ajoutée (Menu, planning…) porte le code de l'écran du paquet d'où elle est ouverte.
  const ecrans = [...new Set(PAGES.map((p) => p.page))].sort()
  expect(ecrans).toEqual(Array.from({ length: 33 }, (_, i) => 'LIV-P' + String(i + 1).padStart(2, '0')))
})
