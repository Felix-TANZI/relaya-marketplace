// Bouton « Revenir » avec mémoire (comme le client et le vendeur) : la flèche ramène à la page où l'on était juste
// avant dans la visite (RetourMemoire du client, branché dans main.tsx) ; ouverte directement, la page mène à son
// parent logique (fiche de la route : parent). Téléphone : flèche de l'en-tête enfant ; ordinateur : flèche de la
// barre du haut, avant le fil d'Ariane, seulement pour les pages de détail (une entrée de la barre latérale n'en a pas).
import { expect, test, type Page } from '@playwright/test'
import { FICHE, FR, OUVERTES, adresse, figerHorloge, ouvrir } from './commun'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

/** Va à une adresse DANS l'application (comme un lien touché : une entrée d'historique de plus, sans recharger). */
async function allerDansLaVisite(page: Page, route: string) {
  await page.evaluate((url) => {
    const idx = ((history.state as { idx?: number } | null)?.idx ?? 0) + 1
    history.pushState({ usr: null, key: Math.random().toString(36).slice(2, 10), idx }, '', url)
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
  }, '/entreprise/' + (route === 'tableau' ? '' : route))
}

const AVEC_PARENT = OUVERTES.filter((r) => FICHE[r].parent && !FICHE[r].sansSession)
// Ordinateur : entrées de la barre latérale sans flèche ; les pages de détail en ont une.
const ENTREES_LATERALES = new Set(['tableau', 'paquets', 'missions', 'incidents', 'colis', 'preuves', 'flotte', 'pieces', 'planning', 'roles', 'vehicules', 'emballages', 'reglements', 'releves', 'score', 'litiges', 'contrat', 'zones', 'sla', 'messages', 'rapports', 'integrations', 'parametres', 'etat', 'equipe'])

for (const [nom, largeur] of [
  ['téléphone', 375],
  ['ordinateur', 1280],
] as const)
  test.describe(`retour (${nom})`, () => {
    test.use({ viewport: { width: largeur, height: largeur > 1000 ? 860 : 812 } })
    for (const r of AVEC_PARENT) {
      const fleche = largeur < 1000 || !ENTREES_LATERALES.has(r)
      test(r, async ({ page }) => {
        // Dans la visite, depuis le tableau de bord : la flèche ramène au tableau de bord.
        await ouvrir(page, adresse('tableau'), FR)
        await allerDansLaVisite(page, r)
        await expect(page).toHaveURL(new RegExp('/entreprise/' + r + '$'))
        const f = page.getByRole('link', { name: 'Revenir' })
        if (!fleche) {
          await expect(f).toHaveCount(0)
          return
        }
        await f.first().click()
        await expect(page).toHaveURL(/\/entreprise\/$/)
        // Ouverte directement : le parent logique.
        await page.goto(adresse(r))
        await page.waitForLoadState('networkidle')
        const parent = FICHE[r].parent === 'tableau' ? '/entreprise' : '/entreprise/' + FICHE[r].parent
        await expect(page.getByRole('link', { name: 'Revenir' }).first()).toHaveAttribute('href', parent)
        await page.getByRole('link', { name: 'Revenir' }).first().click()
        await expect(page).toHaveURL(new RegExp(parent + '/?$'))
      })
    }
  })

test('profil : l’avatar ouvre le Profil ; une page ouverte depuis le Profil revient au Profil, puis à la page d’avant', async ({ page }) => {
  await ouvrir(page, adresse('paquets'), FR)
  await page.locator('header').getByRole('link', { name: 'Mon profil' }).click()
  await expect(page).toHaveURL(/\/profil$/)
  await page.locator('a.li', { hasText: 'Paramètres du compte' }).click()
  await expect(page).toHaveURL(/\/parametres#profil$/)
  await page.getByRole('link', { name: 'Revenir' }).click()
  await expect(page).toHaveURL(/\/profil$/)
  await page.getByRole('link', { name: 'Revenir' }).click()
  await expect(page).toHaveURL(/\/paquets$/)
})
