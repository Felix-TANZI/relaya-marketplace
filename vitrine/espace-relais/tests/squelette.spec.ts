// Squelette de l'espace point relais : chaque route (et chaque état du prototype) s'ouvre sans erreur, sans débordement
// de 360 à 430 px (téléphone d'abord), à 820 px (tablette, PR-12) et 1280 px (ordinateur de comptoir), en clair et
// sombre, en français et en anglais ; aucun lien vers une adresse inconnue ; une adresse inconnue mène à « Ce lien ne
// mène à aucune page ». Contrôles statiques : dictionnaires sans doublon, anonymat du client et du vendeur (GEN-01)
// dans les types de la SourceRelais, chaque groupe déclare ses routes.
import { expect, test, type Page } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { OUVERTES, PAGES, REPRISES, ROUTES_DECLAREES, figerHorloge, ouvrir, type Rendu } from './commun'

const ROUTES = new Set(ROUTES_DECLAREES)
const RENDUS: (Rendu & { largeurs: number[] })[] = [
  { nom: 'clair, français', theme: 'light', lang: 'fr', largeurs: [360, 430] },
  { nom: 'sombre, anglais', theme: 'dark', lang: 'en', largeurs: [390, 820, 1280] },
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
  const inconnus = liens.map((h) => new URL(h).pathname.replace(/^\/relais\/?/, '').split('/')[0] || 'accueil').filter((r) => !ROUTES.has(r))
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

// Chaque état du prototype (?etat=…) s'ouvre lui aussi, sans erreur ni débordement.
test.describe('états du prototype', () => {
  for (const p of PAGES)
    for (const e of p.etats.slice(1))
      test(e.adresse, async ({ page }) => {
        const erreurs: string[] = []
        page.on('pageerror', (x) => erreurs.push(x.message))
        page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()))
        await figerHorloge(page)
        await ouvrir(page, '#' + e.adresse, { nom: 'clair', theme: 'light', lang: 'fr' })
        await controler(page, erreurs)
        // Le sélecteur d'états n'existe que sur une page provisoire ; un écran repris lit ?etat= comme un lien profond.
        if (!REPRISES.includes(p.route)) await expect(page.locator('.r-etat.on')).toHaveText(e.libelle)
      })
})

test('adresse inconnue : « Ce lien ne mène à aucune page », barre du bas présente', async ({ page }) => {
  await ouvrir(page, '#nulle-part', { nom: 'clair', theme: 'light', lang: 'fr' })
  await expect(page.getByRole('heading', { name: 'Ce lien ne mène à aucune page' })).toBeVisible()
  await expect(page.locator('nav.dock .tab')).toHaveCount(4)
})

test('coque : en-tête racine du prototype (☰ Menu, thème, cloche, avatar « Mon compte », libellé, 3 pastilles réelles), Menu = page', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, '#accueil', { nom: 'clair', theme: 'light', lang: 'fr' })
  await expect(page.locator('nav.dock a.tab[aria-current="page"]')).toContainText('Aujourd’hui')
  await expect(page.locator('nav.dock a.tab')).toHaveText([/Aujourd’hui/, /Réception/, /Retrait/, /Stock/])
  await expect(page.locator('.p-hd-label-t')).toContainText(/Point relais\s·\sRelais Bastos Carrefour, Bastos/i)
  const pastilles = page.locator('.r-pastilles .r-pill')
  await expect(pastilles).toHaveCount(3)
  await expect(pastilles.nth(0)).toContainText(/Ouvert\s·\s19\sh/)
  await expect(pastilles.nth(1)).toContainText(/\d+\s\/\s\d+\splaces/)
  await expect(pastilles.nth(2)).toContainText(/Trust/)
  await page.getByRole('link', { name: 'Mon compte' }).click()
  await expect(page).toHaveURL(/\/parametres$/)
  await page.goto('./')
  await page.getByRole('link', { name: 'Menu', exact: true }).click()
  await expect(page).toHaveURL(/\/menu$/)
  await expect(page.locator('header h1')).toHaveText('Menu')
  // En-tête secondaire : retour, titre, marque BelivaY vers Aujourd'hui ; aucun onglet allumé hors onglets (NAV-01).
  await expect(page.getByRole('link', { name: 'Revenir', exact: true })).toBeVisible()
  await expect(page.locator('nav.dock a.tab[aria-current="page"]')).toHaveCount(0)
  await page.getByRole('link', { name: 'BelivaY, accueil' }).click()
  await expect(page).toHaveURL(/\/relais\/?$/)
})

test('compteurs de la barre (NAV-02) : Réception = colis annoncés non reçus, Stock = colis en stock', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, '#accueil', { nom: 'clair', theme: 'light', lang: 'fr' })
  await expect(page.locator('nav.dock a.tab', { hasText: 'Réception' }).locator('.r-bdg')).toHaveText(/^\d+$/)
  await expect(page.locator('nav.dock a.tab', { hasText: 'Stock' }).locator('.r-bdg')).toHaveText(/^\d+$/)
})

test('thème, langue et taille du texte : gardés, le thème suit l’en-tête', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, '#accueil', { nom: 'clair', theme: 'light', lang: 'fr' })
  await page.getByRole('button', { name: 'Thème sombre' }).click()
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
  await page.evaluate(() => {
    localStorage.setItem('blv_r_lang', 'en')
    localStorage.setItem('blv_r_echelle', '130')
  })
  await page.reload()
  await page.waitForFunction(() => document.documentElement.lang === 'en')
  await expect(page.locator('nav.dock')).toContainText('Today')
  expect(parseFloat(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize))).toBeGreaterThan(16)
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
})

test('sans session : toute page mène à la connexion, qui garde la page demandée', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, '#stock?demo=premiere', { nom: 'clair', theme: 'light', lang: 'fr' })
  await expect(page).toHaveURL(/\/connexion\?next=/)
})

test('droits : l’employé de comptoir ne voit ni l’argent ni la gestion du relais (« Accès réservé au gérant »)', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, '#versements?demo=employe', { nom: 'clair', theme: 'light', lang: 'fr' })
  await expect(page.getByRole('heading', { name: 'Accès réservé au gérant' })).toBeVisible()
  for (const r of ['capacite', 'equipe', 'rapports', 'changer-momo']) {
    await page.goto(r)
    await expect(page.getByRole('heading', { name: 'Accès réservé au gérant' })).toBeVisible()
  }
  await page.goto('retrait')
  await expect(page.getByRole('heading', { name: 'Accès réservé au gérant' })).toHaveCount(0)
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

test('anonymat (GEN-01) : aucun nom, téléphone ni adresse d’un client ou d’un vendeur, aucun code de retrait dans les types du relais', () => {
  const dossier = new URL('../src/donnees/domaines/', import.meta.url)
  // Exception unique : le nom du porteur désigné par le client (porteurDesigne), pour vérifier sa pièce.
  const INTERDITS = /^\s*(nomClient|prenomClient|client(Nom|Prenom|Telephone|Email|Adresse|Id)|telephoneClient|numeroClient|adresseClient|nomVendeur|vendeur(Nom|Telephone|Adresse)|telephoneVendeur|codeRetrait|codeClient|qrClient|numeroMomoClient)\??\s*:/m
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

test('routes : chaque groupe PR-03 à PR-10 les déclare dans son dossier, aucune en double, l’inventaire est à jour, les 35 écrans du prototype ont leur route', () => {
  const dossier = new URL('../src/pages/', import.meta.url)
  const declarees: string[] = []
  for (const d of readdirSync(dossier, { withFileTypes: true }).filter((x) => x.isDirectory())) {
    expect(d.name, 'dossier de groupe').toMatch(/^PR-(0[3-9]|10)$/)
    const texte = readFileSync(new URL(d.name + '/routes.ts', dossier), 'utf-8')
    expect(texte, d.name).toContain(`groupe: '${d.name}'`)
    for (const m of texte.matchAll(/route:\s*'([\w-]+)'/g)) declarees.push(m[1])
  }
  expect(declarees.length, 'routes en double').toBe(new Set(declarees).size)
  expect([...declarees].sort(), 'inventaire en retard : npm run transcrire').toEqual([...OUVERTES].sort())
  // 35 écrans du prototype : 33 routes, journée calme et hors connexion étant des états de l'accueil ; les pages
  // ajoutées par les écrans repris (sans état du prototype) viennent en plus.
  const ecrans = new Set(PAGES.flatMap((p) => [p.ecran, ...p.etats.map((e) => e.adresse)]))
  expect(PAGES.filter((p) => p.etats.length > 0).length).toBe(33)
  expect(PAGES.find((p) => p.route === 'accueil')!.etats.map((e) => e.id)).toEqual(['defaut', 'vide', 'hors-ligne'])
  expect(ecrans.size).toBeGreaterThan(33)
})
