// Anglais (DP-13, DP-63) : sur chaque écran repris (états du prototype et pages ajoutées par les groupes), en anglais,
// aucun texte passé par t() ne reste en français faute de traduction. L'application relève chaque clé absente du
// dictionnaire dans window.__blvManquantes (src/preferences.tsx) ; ce test les liste par écran.
import { expect, test } from '@playwright/test'
import { PAGES, ROUTES_DECLAREES, exclu, figerHorloge, ouvrir } from './commun'

const ANGLAIS = { nom: 'anglais', theme: 'light', lang: 'en' } as const
const adresses = new Map<string, string[]>()
for (const r of ROUTES_DECLAREES) {
  const p = PAGES.find((x) => x.route === r)
  const etats = p ? p.etats.map((e) => e.adresse).filter((a) => !exclu(a)) : []
  adresses.set(r, etats.length ? etats : ['#' + r])
}
// Situations qui montrent d'autres textes : employé, relais neuf, suspendu.
adresses.get('accueil')?.push('#accueil?demo=employe', '#accueil?demo=neuf', '#accueil?demo=suspendu')
// Pages ajoutées ouvertes sur une donnée du jeu d'essai.
adresses.set('dossier-litige', ['#dossier-litige?id=CS-2207', '#dossier-litige?id=CS-2194'])
adresses.set('decision', ['#decision?id=D-61'])
adresses.set('activation', [...(adresses.get('activation') ?? []), '#activation?demo=configuration'])

for (const [route, liste] of adresses)
  test(`anglais : ${route}`, async ({ page }) => {
    test.setTimeout(30_000 + liste.length * 8_000)
    const manquantes: string[] = []
    for (const a of liste) {
      await figerHorloge(page)
      await ouvrir(page, a, ANGLAIS)
      await page.waitForTimeout(300)
      const l = await page.evaluate(() => [...((window as unknown as { __blvManquantes?: Set<string> }).__blvManquantes ?? [])])
      for (const k of l) manquantes.push(`${a} : « ${k} »`)
    }
    expect([...new Set(manquantes)]).toEqual([])
  })
