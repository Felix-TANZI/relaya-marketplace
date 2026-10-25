// Fond OpenStreetMap des cartes (composants/CarteOsm) : navigator.webdriver masqué (sinon : plan schématique, comme
// dans tous les autres tests) et tuiles tile.openstreetmap.org interceptées (une petite image locale : aucun appel aux
// serveurs OSM). Zones, missions et fiche d'un livreur en mission : tuiles et mention « © OpenStreetMap contributors »
// cliquable ; au téléphone avec « Données économes », fond sur demande ; hors ligne, plan schématique.
// CAPTURES_CARTE=<dossier> : captures en clair et en sombre pour les regarder.
import { expect, test, type Page } from '@playwright/test'
import { adresse, figerHorloge, ouvrir, type Rendu } from './commun'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN4/eH7fwAJcQPm3QrAawAAAABJRU5ErkJggg==', 'base64')
const CAPTURES = process.env.CAPTURES_CARTE

async function preparer(page: Page) {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }))
  await page.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }))
  await figerHorloge(page)
}

const ECRANS: [string, string, string][] = [
  ['zones', adresse('zones'), '.e-carte'],
  ['missions', adresse('missions'), '.lv-carte'],
  ['position', adresse('livreur', 'id=l-junior'), '.e-pos'],
]

for (const theme of ['light', 'dark'] as const)
  for (const [nom, a, sel] of ECRANS)
    test(`fond OSM (${theme}) : ${nom}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await preparer(page)
      const r: Rendu = { nom: theme, theme, lang: 'fr' }
      await ouvrir(page, a, r)
      const carte = page.locator(sel).first()
      await expect(carte).toHaveAttribute('data-fond', 'osm')
      expect(await carte.locator('image.osm-tuile').count()).toBeGreaterThan(0)
      const lien = carte.getByRole('link', { name: 'OpenStreetMap' })
      await expect(lien).toBeVisible()
      await expect(lien).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
      await expect(carte.locator('.osm-mention')).toContainText('© OpenStreetMap contributeurs')
      if (CAPTURES) await carte.screenshot({ path: `${CAPTURES}/${nom}-${theme}.png` })
    })

test('téléphone, données économes : fond sur demande ; hors ligne : plan schématique', async ({ page, context }) => {
  await preparer(page)
  await ouvrir(page, adresse('zones'), { nom: 'clair', theme: 'light', lang: 'fr' })
  const carte = page.locator('.e-carte')
  await expect(carte).toHaveAttribute('data-fond', 'demande')
  await expect(carte.locator('image.osm-tuile')).toHaveCount(0)
  await carte.getByRole('button', { name: 'Afficher le fond de carte' }).click()
  await expect(carte).toHaveAttribute('data-fond', 'osm')
  await expect(carte.getByRole('link', { name: 'OpenStreetMap' })).toBeVisible()
  if (CAPTURES) await carte.screenshot({ path: `${CAPTURES}/zones-375.png` })
  await context.setOffline(true)
  await expect(carte).toHaveAttribute('data-fond', 'plan')
  await expect(carte.locator('image.osm-tuile')).toHaveCount(0)
  await expect(carte.locator('g[aria-label]')).toHaveCount(12)
  await context.setOffline(false)
})
