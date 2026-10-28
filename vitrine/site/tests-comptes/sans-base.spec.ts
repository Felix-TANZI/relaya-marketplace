// Sans base configurée (BASE=aucune) : l'écran le dit, et le compte de démonstration reste utilisable.
import { expect, test } from '@playwright/test'

test('sans base : l’inscription le dit, le compte de démonstration s’ouvre', async ({ page }) => {
  await page.goto('/connexion-email?st=inscription')
  await page.locator('#cx-prenom').fill('Awa')
  await page.locator('#cx-email').fill('awa.sans.base@example.cm')
  await page.getByRole('button', { name: /Mot de passe proposé/ }).click()
  await page.locator('#cx-mdp').fill('Soleil2026x')
  // Consentement explicite aux conditions et à la confidentialité (comptes réels).
  await page.getByRole('checkbox', { name: /J’accepte les conditions d’utilisation/ }).check()
  await page.getByText('Créer mon compte').click()
  await expect(page.locator('#blv-avis-comptes')).toContainText('pas encore ouverts')

  // Compte d'essai de la démonstration : il s'ouvre comme avant.
  await page.goto('/connexion-email')
  await page.locator('#cx-email').fill('carine@gmail.com')
  const champ = page.getByRole('button', { name: /Mot de passe enregistré/ })
  if (await champ.count()) await champ.click()
  await page.locator('#cx-mdp').fill('Belivay2026')
  await page.locator('a.btn.primary', { hasText: 'Se connecter' }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/connexion'))
})

// Décision du porteur : sans connexion, chaque espace professionnel s'ouvre sur sa page de connexion (jamais sur le
// tableau de bord du compte d'essai) ; le compte de démonstration est à un clic et ramène à la page demandée.
for (const [app, route] of [['vendeur', 'commandes'], ['entreprise', 'planning'], ['livreur', 'tournee'], ['relais', 'reception'], ['admin', 'commandes']] as const)
  test(`${app} : sans connexion, la page de connexion ; le compte de démonstration ramène à /${route}`, async ({ page }) => {
    const erreurs: string[] = []
    page.on('pageerror', (e) => erreurs.push(e.message))
    await page.goto(`/${app}/`)
    await page.waitForURL(new RegExp(`/${app}/connexion`))
    await page.goto(`/${app}/${route}`)
    await page.waitForURL(new RegExp(`/${app}/connexion\\?next=%2F${route}$`))
    await page.getByText('Essayer avec le compte de démonstration').first().click()
    await page.waitForURL(new RegExp(`/${app}/${route}$`))
    // Le choix de la démonstration est gardé : un rechargement reste dans l'espace.
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/${app}/${route}$`))
    expect(erreurs).toEqual([])
  })
