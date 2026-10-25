// Compte (kit « compte » des quatre applications) côté vendeur : compte Google associé dans Mon profil, sa photo
// reprise (code SMS) puis visible dans l'en-tête ; connexion par e-mail puis retour « e-mail seulement » (compte
// reconnu, photo affichée) ; lien de connexion reçu par e-mail.
import { expect, test, type Page } from '@playwright/test'
import { adresse, ouvrir } from './commun'

const CLAIR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const ACCUEIL = /\/vendeur\/?(\?|$)/

async function sortir(page: Page) {
  await page.goto(adresse('#profil'))
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/connexion/)
}

test('compte Google associé, sa photo reprise avec un code : visible dans l’en-tête', async ({ page }) => {
  await ouvrir(page, '#profil', CLAIR)
  const bloc = page.locator('[data-ck="google-vendeur"]')
  await bloc.locator('[data-ck="associer-google"]').click()
  await page.locator('[data-ck="google-compte"]').click()
  await expect(bloc).toContainText('Connexion possible avec Google')
  await page.getByRole('button', { name: 'Utiliser la photo de votre compte Google' }).click()
  await page.getByLabel('Code à 6 chiffres').fill('123456')
  await page.getByRole('button', { name: 'Enregistrer la photo' }).click()
  await expect(page.locator('.ajb-avatar img')).toHaveAttribute('src', /^data:image\/jpeg/)
  await page.goto(adresse('#accueil'))
  await expect(page.locator('.avatar.a-photo img').first()).toHaveAttribute('src', /^data:image\/jpeg/)
})

test('connexion par e-mail, puis retour avec l’e-mail seulement (compte reconnu)', async ({ page }) => {
  await ouvrir(page, '#profil', CLAIR)
  await sortir(page)
  await page.goto(adresse('#connexion?s=email'))
  await page.locator('#cx-id').fill('franck.penga@exemple.cm')
  await page.locator('#cx-mdp').fill('Belivay2026')
  await page.locator('form').getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(ACCUEIL)
  await sortir(page)
  await page.goto(adresse('#connexion?s=email&id='))
  await page.locator('#cx-id').fill('franck.penga@exemple.cm')
  await expect(page.locator('[data-ck="reconnu"]')).toContainText('Bon retour, Franck')
  await page.locator('[data-ck="continuer-reconnu"]').click()
  await expect(page).toHaveURL(ACCUEIL)
})

test('lien de connexion reçu par e-mail', async ({ page }) => {
  await ouvrir(page, '#profil', CLAIR)
  await sortir(page)
  await page.goto(adresse('#connexion?s=email&id='))
  await page.locator('#cx-id').fill('franck.penga@exemple.cm')
  await page.locator('[data-ck="lien-magique"]').click()
  await page.locator('[data-ck="ouvrir-email"]').click()
  await page.locator('[data-ck="me-connecter-lien"]').click()
  await expect(page).toHaveURL(ACCUEIL)
})
