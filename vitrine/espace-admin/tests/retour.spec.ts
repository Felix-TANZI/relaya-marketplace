// Bouton « Revenir » avec mémoire (comme les autres espaces) : la flèche ramène à la page où l'on était juste avant
// dans la visite ; ouverte directement, la page mène à son parent logique (fiche de la route : parent). Téléphone :
// flèche de l'en-tête secondaire ; ordinateur : flèche de la barre du haut, seulement pour les pages de détail (une
// entrée de la barre latérale n'en a pas).
import { expect, test, type Page } from '@playwright/test'
import { FICHE, FR, OUVERTES, adresse, figerHorloge, ouvrir } from './commun'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

async function allerDansLaVisite(page: Page, route: string) {
  await page.evaluate((url) => {
    const idx = ((history.state as { idx?: number } | null)?.idx ?? 0) + 1
    history.pushState({ usr: null, key: Math.random().toString(36).slice(2, 10), idx }, '', url)
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
  }, '/admin/' + (route === 'file' ? '' : route))
}

// Téléphone : pages secondaires (ni onglet de la Direction, ni Menu). Ordinateur : pages hors barre latérale.
const ONGLETS = new Set(['file', 'litige', 'versements', 'menu'])
const NAV = new Set(['direct', 'file', 'litige', 'commandes', 'support', 'escrow', 'remboursements', 'versements', 'rapprochement', 'kyc', 'vendeurs', 'clients', 'paliers', 'sanctions', 'fraude', 'catalogue', 'moderation', 'avis', 'relais', 'entreprises', 'livreurs', 'paquets', 'zones', 'carte', 'emballages', 'parametrage', 'commissions', 'promotions', 'messagerie', 'panne', 'rapports', 'sante', 'journal', 'roles', 'comptes', 'pays', 'legal', 'assistant', 'quatreyeux', 'candidatures', 'export', 'interrupteurs', 'modeles', 'taches', 'conservation'])
const AVEC_PARENT = OUVERTES.filter((r) => FICHE[r].parent && !FICHE[r].sansSession)

for (const [nom, largeur] of [
  ['téléphone', 375],
  ['ordinateur', 1280],
] as const)
  test.describe(`retour (${nom})`, () => {
    test.use({ viewport: { width: largeur, height: largeur > 1000 ? 860 : 812 } })
    // Un échantillon par groupe suffit au socle (les écrans repris ajoutent les leurs).
    for (const r of AVEC_PARENT.filter((x) => ['direct', 'litige', 'escrow', 'kyc', 'catalogue', 'paquets', 'zones', 'parametrage', 'support', 'journal', 'rapports', 'profil', 'quatreyeux', 'recherche'].includes(x))) {
      const fleche = largeur < 1000 ? !ONGLETS.has(r) : !NAV.has(r)
      test(r, async ({ page }) => {
        await ouvrir(page, adresse('file'), FR)
        await allerDansLaVisite(page, r)
        await expect(page).toHaveURL(new RegExp('/admin/' + r + '$'))
        const f = page.getByRole('link', { name: 'Revenir' })
        if (!fleche) {
          await expect(f).toHaveCount(0)
          return
        }
        await f.first().click()
        await expect(page).toHaveURL(/\/admin\/?$/)
        await page.goto(adresse(r))
        await page.waitForLoadState('networkidle')
        const parent = FICHE[r].parent === 'file' ? '/admin' : '/admin/' + FICHE[r].parent
        await expect(page.getByRole('link', { name: 'Revenir' }).first()).toHaveAttribute('href', new RegExp('^' + parent + '/?$'))
      })
    }
  })

test('profil : l’avatar ouvre le Profil ; la flèche revient à la page d’avant', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await ouvrir(page, adresse('litige'), FR)
  await page.locator('header').getByRole('link', { name: 'Mon profil' }).first().click()
  await expect(page).toHaveURL(/\/profil$/)
  await page.getByRole('link', { name: 'Revenir' }).click()
  await expect(page).toHaveURL(/\/litige$/)
})
