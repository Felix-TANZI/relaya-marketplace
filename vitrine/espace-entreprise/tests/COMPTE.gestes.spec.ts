// Mon compte (Profil) et connexion : la photo choisie se voit dans l'en-tête ; l'e-mail change avec un code envoyé à
// la nouvelle adresse (et sert ensuite à se connecter) ; un appareil qui se souvient revient avec l'e-mail seulement.
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

test.use({ viewport: { width: 1280, height: 860 } })

// Image PNG de 1 × 1 px (rouge) : assez pour le recadrage.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64')
const compte = (page: Page) => page.getByRole('region', { name: 'Mon compte' })

async function deconnecter(page: Page) {
  await page.goto(adresse('profil'))
  await page.locator('button', { hasText: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/connexion$/)
}
async function saisirCode(page: Page) {
  const code = (await page.locator('.note', { hasText: 'Démonstration : le code reçu est' }).innerText()).replace(/\D/g, '')
  await page.locator('.otp input').first().fill(code[0])
  for (let i = 1; i < code.length; i++) await page.locator('.otp input').nth(i).fill(code[i])
  await page.getByRole('button', { name: 'Valider' }).click()
}

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('photo de profil : recadrée, puis visible dans l’en-tête', async ({ page }) => {
  await ouvrir(page, adresse('profil'), FR)
  await compte(page).locator('.mc-photo input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG })
  await page.getByRole('button', { name: 'Utiliser cette photo' }).click()
  await expect(compte(page).getByRole('status')).toContainText('Photo de profil enregistrée.')
  await expect(page.locator('header a.avatar img.portrait').first()).toBeVisible()
  await page.reload()
  await expect(page.locator('header a.avatar img.portrait').first()).toBeVisible()
})

test('changement d’e-mail : code envoyé à la nouvelle adresse, puis connexion avec elle', async ({ page }) => {
  await ouvrir(page, adresse('profil'), FR)
  await compte(page).locator('.mc-l', { hasText: 'E-mail' }).getByRole('button', { name: 'Modifier' }).click()
  const f = page.locator('.sheet').last()
  await f.getByLabel('Nouvelle adresse e-mail').fill('gaelle.wankeu@gmail.com')
  await f.getByRole('button', { name: 'Recevoir le code' }).click()
  await expect(f).toContainText('Code envoyé à la nouvelle adresse g•••@gmail.com')
  await f.getByLabel('Code à 6 chiffres').fill('000000')
  await f.getByRole('button', { name: 'Confirmer' }).click()
  await expect(f.getByRole('alert')).toContainText('Code incorrect')
  await f.getByLabel('Code à 6 chiffres').fill('123456')
  await f.getByRole('button', { name: 'Confirmer' }).click()
  await expect(compte(page).getByRole('status')).toContainText('E-mail changé')
  // Adresse Google : la photo du compte Google est proposée.
  await expect(compte(page).getByRole('button', { name: 'Utiliser la photo de votre compte Google' })).toBeVisible()
  await deconnecter(page)
  await page.getByLabel('Numéro +237 ou e-mail').fill('gaelle@yafeexpress.cm')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Belivay2026')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('incorrect')
  await page.getByLabel('Numéro +237 ou e-mail').fill('gaelle.wankeu@gmail.com')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Code de vérification' })).toBeVisible()
})

test('se souvenir de cet appareil : au retour, l’e-mail seulement (mot de passe à saisir), « Ce n’est pas vous ? »', async ({ page }) => {
  await ouvrir(page, adresse('profil'), FR)
  await deconnecter(page)
  await page.getByLabel('Numéro +237 ou e-mail').fill('gaelle@yafeexpress.cm')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Belivay2026')
  await page.getByLabel(/Se souvenir de cet appareil/).check()
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await saisirCode(page)
  await expect(page.getByRole('heading', { name: 'Choisissez un espace' })).toBeVisible()
  await deconnecter(page)
  const retour = page.getByRole('group', { name: 'Compte gardé sur cet appareil' })
  await expect(retour).toContainText('Bon retour, Gaëlle')
  await expect(retour).toContainText('gaelle@yafeexpress.cm')
  await expect(page.getByLabel('Numéro +237 ou e-mail')).toHaveCount(0)
  await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveValue('')
  await retour.getByRole('button', { name: 'Ce n’est pas vous ?' }).click()
  await expect(page.getByLabel('Numéro +237 ou e-mail')).toHaveValue('')
})
