// Bouton « Revenir » avec mémoire (comme le client, le vendeur et le livreur) : la flèche de l'en-tête enfant ramène à la page où
// l'on était juste avant dans la visite (RetourMemoire du client, branché dans main.tsx), pas à un parent fixe ; sans
// page précédente dans la visite (lien ouvert directement), elle mène au parent logique déclaré dans routes.ts.
import { expect, test, type Page } from '@playwright/test'
import { PAGES, adresse, figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

/** Va à une adresse DANS l'application (comme un lien touché : une entrée d'historique de plus, sans recharger). */
async function allerDansLaVisite(page: Page, a: string) {
  await page.evaluate((url) => {
    const idx = ((history.state as { idx?: number } | null)?.idx ?? 0) + 1
    history.pushState({ usr: null, key: Math.random().toString(36).slice(2, 10), idx }, '', url)
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
  }, '/relais/' + a.replace(/^\.\//, ''))
}

// Lien vers une route tel que le routeur l'écrit (l'accueil est la racine : « /relais »).
const cheminDe = (route: string | null) => (!route || route === 'accueil' ? '/relais' : '/relais/' + route)

test('retour : plusieurs pas de suite, dans l’ordre de la visite', async ({ page }) => {
  await ouvrir(page, '#accueil', FR)
  await page.locator('nav.dock a.tab', { hasText: 'Stock' }).click()
  await expect(page).toHaveURL(/\/stock$/)
  await allerDansLaVisite(page, 'colis')
  await expect(page).toHaveURL(/\/colis$/)
  await page.getByRole('link', { name: 'Revenir', exact: true }).click()
  await expect(page).toHaveURL(/\/stock$/)
})

// Chaque route à en-tête enfant : ouverte DANS la visite depuis Aujourd'hui, sa flèche ramène à Aujourd'hui (la page
// précédente) ; ouverte directement, la flèche mène à son parent logique (routes.ts), jamais à elle-même.
for (const p of PAGES.filter((x) => x.entete === 'enfant'))
  test(`retour : ${p.route}`, async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await allerDansLaVisite(page, adresse('#' + p.route))
    await expect(page).toHaveURL(new RegExp('/relais/' + p.route + '$'))
    await page.getByRole('link', { name: 'Revenir', exact: true }).click()
    await expect(page).toHaveURL(/\/relais\/$/)
    await page.goto(adresse('#' + p.route))
    const fleche = page.getByRole('link', { name: 'Revenir', exact: true })
    // Le parent peut porter sa donnée (« arrivee?a=A2 » : l'arrêt en cours) : la route, puis ses paramètres.
    const parent = cheminDe(p.retour).replace(/\//g, '\\/')
    await expect(fleche).toHaveAttribute('href', new RegExp('^' + parent + '(\\?.*)?$'))
    expect(cheminDe(p.retour)).not.toBe(cheminDe(p.route))
    await fleche.click()
    await expect(page).toHaveURL(new RegExp(parent + '/?(\\?.*)?$'))
    await expect(page.locator('#app')).not.toContainText('Ce lien ne mène à aucune page')
  })

test('Menu : la page ouverte depuis le Menu revient au Menu, et le Menu à la page d’avant', async ({ page }) => {
  await ouvrir(page, '#stock', FR)
  await page.getByRole('link', { name: 'Menu', exact: true }).click()
  await expect(page).toHaveURL(/\/menu$/)
  await allerDansLaVisite(page, 'versements')
  await expect(page).toHaveURL(/\/versements$/)
  await page.getByRole('link', { name: 'Revenir', exact: true }).click()
  await expect(page).toHaveURL(/\/menu$/)
  await page.getByRole('link', { name: 'Revenir', exact: true }).click()
  await expect(page).toHaveURL(/\/stock$/)
})
