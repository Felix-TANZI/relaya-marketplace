// Bouton « Revenir » avec mémoire (comme site/tests/retour.spec.ts) : la flèche de l'en-tête enfant ramène à la page
// où l'on était juste avant dans la visite (RetourMemoire du client, branché dans main.tsx), pas à un parent fixe ;
// sans page précédente dans la visite (lien ouvert directement), elle mène au parent logique de l'écran.
import { expect, test, type Page } from '@playwright/test'
import { AJOUTEES, ETATS, OUVERTES, PAGES, adresse, exclu, figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('retour : la flèche ramène à la page précédente de la visite', async ({ page }) => {
  // Une commande ouverte depuis l'accueil revient à l'accueil, pas à la liste des commandes (son parent logique).
  await ouvrir(page, '#accueil', FR)
  await page.locator('main a[href*="commande?ref=BLV-00008"]').first().click()
  await expect(page).toHaveURL(/\/commande\?ref=BLV-00008$/)
  await expect(page.getByRole('link', { name: 'Revenir' })).toHaveAttribute('href', '/vendeur/commandes')
  await page.getByRole('link', { name: 'Revenir' }).click()
  await expect(page).toHaveURL(/\/vendeur\/?$/)
})

test('retour : plusieurs pas de suite, dans l’ordre de la visite', async ({ page }) => {
  await ouvrir(page, '#accueil', FR)
  await page.locator('nav.dock a.tab', { hasText: 'Argent' }).click()
  await expect(page).toHaveURL(/\/argent$/)
  await page.locator('main [data-ligne="gele"]').click()
  await expect(page).toHaveURL(/\/gele$/)
  await page.locator('main a[href*="litige?"], main a[href*="commande?"]').first().click()
  await expect(page).not.toHaveURL(/\/gele$/)
  await page.getByRole('link', { name: 'Revenir' }).click()
  await expect(page).toHaveURL(/\/gele$/)
  await page.getByRole('link', { name: 'Revenir' }).click()
  await expect(page).toHaveURL(/\/argent$/)
})

test('retour : sans page précédente, le parent logique', async ({ page }) => {
  await ouvrir(page, '#commande?ref=BLV-00008', FR)
  await page.getByRole('link', { name: 'Revenir' }).click()
  await expect(page).toHaveURL(/\/vendeur\/commandes$/)
  await expect(page.locator('nav.dock a.tab[aria-current="page"]')).toContainText('Commandes')
})

// ---------- Toutes les routes ----------
// Chaque route ouverte (prototype et pages ajoutées AJ-A, AJ-B, feuilles et étapes de parcours comprises) : ouverte
// DANS la visite depuis l'accueil, sa flèche « Revenir » ramène à l'accueil (la page précédente) ; ouverte
// directement, la flèche mène à une page existante (son parent logique), jamais à elle-même ni à « aucune page ».
// Une route sans flèche (connexion, caméra, lancement, Face ID, écrans racine) n'a rien à vérifier.
const TOUTES = [...new Set([...OUVERTES, ...AJOUTEES])]
const adresseDe = (r: string) => {
  const p = PAGES.find((x) => x.route === r)
  return adresse(p?.etats.find((e) => !exclu(e.adresse))?.adresse ?? '#' + r)
}
/** Va à une adresse DANS l'application (comme un lien touché : une entrée d'historique de plus, sans recharger). */
async function allerDansLaVisite(page: Page, a: string) {
  await page.evaluate((url) => {
    const idx = ((history.state as { idx?: number } | null)?.idx ?? 0) + 1
    history.pushState({ usr: null, key: Math.random().toString(36).slice(2, 10), idx }, '', url)
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
  }, '/vendeur/' + a.replace(/^\.\//, ''))
}

for (const [nom, largeur] of [
  ['téléphone', 375],
  ['ordinateur', 1280],
] as const)
  test.describe(`retour sur toutes les routes (${nom})`, () => {
    test.use({ viewport: { width: largeur, height: largeur > 1000 ? 900 : 812 } })
    for (const r of TOUTES) {
      test(r, async ({ page }) => {
        const a = adresseDe(r)
        await ouvrir(page, '#accueil', FR)
        await allerDansLaVisite(page, a)
        await page.waitForLoadState('networkidle')
        const fleche = page.getByRole('link', { name: 'Revenir' }).first()
        // Écran sans en-tête enfant (racine, connexion, caméra, lancement) : pas de flèche, rien à vérifier.
        if (ETATS[r]?.entete !== 'enfant') return
        await expect(page).toHaveURL(new RegExp('/vendeur/' + r + '(\\?|$)'))
        await expect(fleche).toBeVisible()
        await fleche.click()
        await expect(page).toHaveURL(/\/vendeur\/?$/)
        // Ouverte directement : le parent logique.
        await page.goto(a)
        await page.waitForLoadState('networkidle')
        const f2 = page.getByRole('link', { name: 'Revenir' }).first()
        await f2.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined)
        if (!(await f2.isVisible())) return // l'écran a mené ailleurs (étape déjà faite, sans session)
        const ici = new URL(page.url()).pathname
        const vers = await f2.getAttribute('href')
        expect(vers, `${r} : la flèche mène à la page elle-même`).not.toBe(ici)
        await f2.click()
        await page.waitForLoadState('networkidle')
        await expect(page.locator('#app')).not.toContainText('Ce lien ne mène à aucune page')
        expect(new URL(page.url()).pathname).not.toBe(ici)
      })
    }
  })

test('menu du profil : la page ouverte depuis le menu revient à la page d’avant, menu fermé', async ({ page }) => {
  await ouvrir(page, '#commandes', FR)
  await page.getByRole('link', { name: 'Menu du profil' }).click()
  await expect(page).toHaveURL(/pop=profil/)
  await page.locator('.pm a.r', { hasText: 'Paramètres' }).click()
  await expect(page).toHaveURL(/\/parametres$/)
  await page.getByRole('link', { name: 'Revenir' }).click()
  await expect(page).toHaveURL(/\/commandes$/)
  await expect(page.locator('.pm')).toHaveCount(0)
})

test.describe('ordinateur', () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  test('« Retour au site » mène à l’espace client ; la carte de la boutique ouvre Mon profil', async ({ page }) => {
    await ouvrir(page, '#commandes', FR)
    await expect(page.locator('.sl a', { hasText: 'Retour au site' })).toHaveAttribute('href', '/')
    await page.locator('.sl .tr-carte-l').click()
    await expect(page).toHaveURL(/\/profil$/)
    await page.getByRole('link', { name: 'Revenir' }).click()
    await expect(page).toHaveURL(/\/commandes$/)
  })
})

test('Menu : la carte de la boutique ouvre Mon profil', async ({ page }) => {
  await ouvrir(page, '#menu', FR)
  await page.locator('a.vd-carte-profil').click()
  await expect(page).toHaveURL(/\/profil$/)
  await page.getByRole('link', { name: 'Revenir' }).click()
  await expect(page).toHaveURL(/\/menu$/)
})
