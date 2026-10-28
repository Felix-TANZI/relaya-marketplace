// Mon compte (Profil) et connexion : la photo choisie se voit dans l'en-tête ; l'e-mail change avec un code envoyé à
// la nouvelle adresse (et sert ensuite à se connecter, second facteur toujours demandé) ; un appareil qui se souvient
// revient avec l'e-mail seulement.
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

test.use({ viewport: { width: 1280, height: 900 } })

// Image PNG de 1 × 1 px (rouge) : assez pour le recadrage.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64')
const compte = (page: Page) => page.getByRole('region', { name: 'Mon compte' })

async function deconnecter(page: Page) {
  await page.goto(adresse('profil'))
  await page.locator('button', { hasText: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/admin\/connexion$/)
}

test('photo de profil : recadrée, puis visible dans l’en-tête', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('profil'), FR)
  await compte(page).locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG })
  await page.getByRole('button', { name: 'Utiliser cette photo' }).click()
  await expect(compte(page).getByRole('status')).toContainText('Photo de profil enregistrée.')
  await expect(page.locator('header a.avatar img.portrait').first()).toBeVisible()
  await page.reload()
  await expect(page.locator('header a.avatar img.portrait').first()).toBeVisible()
})

test('changement d’e-mail : code envoyé à la nouvelle adresse, puis connexion avec elle (second facteur demandé)', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('profil'), FR)
  await compte(page).locator('.mc-l', { hasText: 'E-mail' }).getByRole('button', { name: 'Modifier' }).click()
  const f = page.locator('.sheet').last()
  await f.getByLabel('Nouvelle adresse e-mail').fill('franck.penga@belivay.com')
  await f.getByRole('button', { name: 'Recevoir le code' }).click()
  await expect(f).toContainText('Code envoyé à la nouvelle adresse f•••@belivay.com')
  await f.getByLabel('Code à 6 chiffres').fill('000000')
  await f.getByRole('button', { name: 'Confirmer' }).click()
  await expect(f.getByRole('alert')).toContainText('Code incorrect')
  await f.getByLabel('Code à 6 chiffres').fill('123456')
  await f.getByRole('button', { name: 'Confirmer' }).click()
  await expect(compte(page).getByRole('status')).toContainText('E-mail changé')
  await expect(compte(page)).toContainText('franck.penga@belivay.com')
  await expect(compte(page)).toContainText('alertes de sécurité envoyées')
  await deconnecter(page)
  await page.getByLabel('Identifiant nominatif').fill('franck@belivay.com')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Belivay2026')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByRole('alert')).toContainText('incorrect')
  await page.getByLabel('Identifiant nominatif').fill('franck.penga@belivay.com')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByText('Étape 2 sur 2')).toBeVisible()
})

test('se souvenir de cet appareil : au retour, l’e-mail seulement (mot de passe à saisir), « Ce n’est pas vous ? »', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('profil'), FR)
  await deconnecter(page)
  await page.getByLabel('Identifiant nominatif').fill('franck@belivay.com')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Belivay2026')
  await page.getByLabel(/Se souvenir de cet appareil/).check()
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.getByLabel('Code à 6 chiffres').fill('246810')
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByText('Connexion réussie')).toBeVisible()
  await deconnecter(page)
  const retour = page.getByRole('group', { name: 'Compte gardé sur cet appareil' })
  await expect(retour).toContainText('Bon retour, Franck')
  await expect(retour).toContainText('franck@belivay.com')
  await expect(page.getByLabel('Identifiant nominatif')).toHaveCount(0)
  await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveValue('')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Belivay2026')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByText('Étape 2 sur 2')).toBeVisible()
  await page.goto(adresse('connexion'))
  await retour.getByRole('button', { name: 'Ce n’est pas vous ?' }).click()
  await expect(page.getByLabel('Identifiant nominatif')).toHaveValue('')
})
