// Squelette de l'espace entreprise : chaque route s'ouvre sans erreur, sans débordement au téléphone (360, 430 px) et à
// l'ordinateur (1280 px), en clair et sombre, en français et en anglais ; aucun lien vers une adresse inconnue ; une
// page réservée à d'autres rôles le dit ; une adresse inconnue mène à « Ce lien ne mène à aucune page ».
// Contrôles statiques : inventaire à jour, chaque groupe déclare ses routes dans son dossier, chaque écran de
// l'extraction a sa route, dictionnaires sans doublon et complets, aucune donnée d'argent du client dans les types.
import { expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { FICHE, FR, PAGES, ROUTES, adresse, figerHorloge, ouvrir, type Rendu } from './commun'
import { sansTraduction } from '../outils/textes.mjs'

const RENDUS: (Rendu & { largeurs: number[] })[] = [
  { nom: 'clair, français', theme: 'light', lang: 'fr', largeurs: [360, 430, 1280] },
  { nom: 'sombre, anglais', theme: 'dark', lang: 'en', largeurs: [390, 1280] },
]

async function controler(page: Page, erreurs: string[]) {
  expect(erreurs, 'erreurs JavaScript').toEqual([])
  const texte = await page.locator('#app').innerText()
  expect(texte.trim().length, 'écran vide').toBeGreaterThan(20)
  expect(texte).not.toMatch(/\bundefined\b|\bNaN\b|\[object /)
  // Aucun défilement horizontal de la page.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'défilement horizontal').toBeLessThanOrEqual(0)
  // Liens internes : vers une route connue.
  const liens = await page.evaluate(() => [...document.querySelectorAll('#app a[href]')].map((a) => (a as HTMLAnchorElement).href).filter((h) => h.startsWith(location.origin)))
  const inconnus = liens.map((h) => new URL(h).pathname.replace(/^\/entreprise\/?/, '').split('/')[0] || 'tableau').filter((r) => !ROUTES.includes(r))
  expect(inconnus, 'liens vers une route inconnue').toEqual([])
}

for (const r of RENDUS)
  test.describe(`squelette, ${r.nom}`, () => {
    for (const route of ROUTES)
      test(route, async ({ page }) => {
        const erreurs: string[] = []
        page.on('pageerror', (e) => erreurs.push(e.message))
        page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()))
        await figerHorloge(page)
        for (const largeur of r.largeurs) {
          await page.setViewportSize({ width: largeur, height: largeur > 1000 ? 860 : 812 })
          await ouvrir(page, adresse(route), r)
          await controler(page, erreurs)
          expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(r.theme)
          await expect(page.getByText(/Ce lien ne mène à aucune page|This link leads to no page/)).toHaveCount(0)
          // Le titre de la page est un titre de niveau 1 (dans l'en-tête ou le contenu).
          await expect(page.locator('#app h1').first()).toBeAttached()
        }
      })
  })

test('sans session : toute page mène à la connexion, qui ramène à la page demandée', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('profil'), FR)
  await page.locator('button', { hasText: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/entreprise\/connexion$/)
  await page.goto(adresse('zones'))
  await expect(page).toHaveURL(/\/connexion\?next=%2Fzones$/)
  await expect(page.locator('nav.dock, aside.sl')).toHaveCount(0)
  // Le compte de démonstration (un seul, celui de l'appli) ramène à la page demandée.
  await page.getByRole('button', { name: 'Essayer avec le compte de démonstration' }).click()
  await expect(page).toHaveURL(/\/entreprise\/zones$/)
})

test('rôles : le répartiteur ne voit ni règlements ni relevés, et une adresse directe le dit (ENT-RG-R25)', async ({ page }) => {
  await figerHorloge(page)
  await page.setViewportSize({ width: 1280, height: 860 })
  await ouvrir(page, adresse('reglements'), { ...FR, role: 'repartiteur' })
  await expect(page.getByRole('heading', { name: 'Réservé à d’autres rôles' })).toBeVisible()
  await expect(page.locator('aside.sl a[href$="/reglements"], aside.sl a[href$="/releves"], aside.sl a[href$="/integrations"]')).toHaveCount(0)
  await expect(page.locator('aside.sl a[href$="/paquets"]')).toHaveCount(1)
})

test('rôles : le comptable n’ouvre pas l’affectation, voit les règlements', async ({ page }) => {
  await figerHorloge(page)
  await page.setViewportSize({ width: 1280, height: 860 })
  await ouvrir(page, adresse('affectation'), { ...FR, role: 'comptable' })
  await expect(page.getByRole('heading', { name: 'Réservé à d’autres rôles' })).toBeVisible()
  await expect(page.locator('aside.sl a[href$="/reglements"]')).toHaveCount(1)
})

test('adresse inconnue : « Ce lien ne mène à aucune page », navigation présente', async ({ page }) => {
  await ouvrir(page, 'nulle-part', FR)
  await expect(page.getByRole('heading', { name: 'Ce lien ne mène à aucune page' }).first()).toBeVisible()
  await expect(page.locator('nav.dock .tab')).toHaveCount(4)
})

test('langue et thème : l’en-tête et le Profil les changent, ils sont gardés', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('tableau'), FR)
  await page.locator('header button.lang').click()
  await page.waitForFunction(() => document.documentElement.lang === 'en')
  await expect(page.locator('nav.dock')).toContainText('Packages')
  await page.getByRole('button', { name: 'Dark theme' }).click()
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
  await page.goto(adresse('profil'))
  await page.locator('[data-preferences-menu] [role=radio]', { hasText: 'Français' }).click()
  await page.locator('[data-preferences-menu] [role=radio]', { hasText: /^(Clair|Light)$/ }).click()
  await page.reload()
  await page.waitForSelector('#app')
  expect(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dataset.theme])).toEqual(['fr', 'light'])
})

test('inventaire à jour, chaque écran ENT-P01 à P27 a sa route', () => {
  execFileSync('node', ['outils/inventaire.mjs', '--verifier'], { cwd: new URL('..', import.meta.url) })
  const ecrans = Object.keys(JSON.parse(readFileSync(new URL('../src/genere/ecrans.json', import.meta.url), 'utf-8')))
  expect(ecrans.length).toBe(27)
  expect(ecrans.filter((e) => !PAGES.some((p) => p.ecran === e)), 'écrans sans route').toEqual([])
  for (const p of PAGES) if (p.parent) expect(FICHE[p.parent], `${p.route} : parent`).toBeTruthy()
})

test('routes : chaque groupe les déclare dans son dossier, aucune en double', () => {
  const dossier = new URL('../src/pages/', import.meta.url)
  const declarees: string[] = []
  for (const d of readdirSync(dossier, { withFileTypes: true }).filter((x) => x.isDirectory())) {
    expect(d.name, 'nom de groupe').toMatch(/^(ENT-\d\d|AJ-E|EQUIPE)$/)
    const texte = readFileSync(new URL(d.name + '/routes.ts', dossier), 'utf-8')
    expect(texte, d.name).toContain(`groupe: '${d.name}'`)
    for (const m of texte.matchAll(/route:\s*'([\w-]+)'/g)) declarees.push(m[1])
  }
  expect(declarees.length, 'routes en double').toBe(new Set(declarees).size)
})

test('dictionnaires anglais : complets, aucune clé en double entre fichiers', () => {
  expect(sansTraduction(), 'textes sans traduction anglaise').toEqual([])
  const dossier = new URL('../src/i18n/', import.meta.url)
  const vus: Record<string, string> = {}
  const doubles: string[] = []
  for (const f of readdirSync(dossier).filter((x) => x.endsWith('.en.json')))
    for (const k of Object.keys(JSON.parse(readFileSync(new URL(f, dossier), 'utf-8')))) {
      if (vus[k]) doubles.push(`${f} : « ${k} » est déjà dans ${vus[k]}`)
      vus[k] = f
    }
  expect(doubles).toEqual([])
})

test('données du client final : aucun type ne porte le total payé, le moyen de paiement ni l’historique du client (GEN-01)', () => {
  const dossier = new URL('../src/donnees/domaines/', import.meta.url)
  const INTERDITS = /^\s*(totalPaye|montantPaye|totalClient|moyenPaiement(Client)?|historiqueClient|emailClient|client(Email|Historique|Total|Paiement))\??\s*:/m
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
