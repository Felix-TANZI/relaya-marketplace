// Mon compte (kit « compte » des quatre applications) : photo ajoutée puis visible dans l'en-tête, e-mail changé avec
// un code envoyé à la nouvelle adresse, connexion par e-mail puis retour « e-mail seulement » (compte reconnu), lien
// de connexion reçu par e-mail, compte Google associé puis connexion par Google.
import { expect, test, type Page } from '@playwright/test'
import { adresse, ouvrir } from './commun'

const CLAIR = { nom: 'clair', theme: 'light', lang: 'fr' } as const

async function image(page: Page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 900
    c.height = 600
    const x = c.getContext('2d')!
    x.fillStyle = '#C2410C'
    x.fillRect(0, 0, 900, 600)
    x.fillStyle = '#FDE68A'
    x.beginPath()
    x.arc(450, 300, 180, 0, Math.PI * 2)
    x.fill()
    return c.toDataURL('image/png').split(',')[1]
  })
  return { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }
}
async function sortir(page: Page) {
  await page.goto(adresse('#reglages?s=deconnexion'))
  const f = page.getByRole('dialog')
  await expect(f.locator('.l10-deco')).toBeVisible()
  if (await f.locator('.l10-compris input').count()) await f.locator('.l10-compris input').check()
  await f.locator('.l10-deco').click()
}
const repli = (page: Page, id: string) => page.locator(`details[data-repli="${id}"] > summary`).click()

test('photo ajoutée depuis la galerie, recadrée : visible dans l’en-tête', async ({ page }) => {
  await ouvrir(page, '#mon-compte', CLAIR)
  await page.locator('[data-ck="changer-photo"]').click()
  await page.locator('input[data-ck="galerie"]').setInputFiles(await image(page))
  await expect(page.locator('[data-ck="recadrage"]')).toBeVisible()
  await page.locator('[data-ck="utiliser"]').click()
  await expect(page.getByText('Photo de profil enregistrée')).toBeVisible()
  const src = await page.locator('[data-ck="tete"] .ck-av img').getAttribute('src')
  expect(src).toMatch(/^data:image\/jpeg/)
  expect(Math.ceil(((src!.length - src!.indexOf(',') - 1) * 3) / 4)).toBeLessThanOrEqual(300 * 1024)
  await page.goto(adresse('#aujourdhui'))
  await expect(page.locator('.l-avatar img')).toHaveAttribute('src', src!)
})

test('e-mail changé avec un code envoyé à la nouvelle adresse', async ({ page }) => {
  await ouvrir(page, '#mon-compte', CLAIR)
  await repli(page, 'email')
  await page.locator('[data-ck="email"]').fill('serge.nouveau@exemple.cm')
  await page.locator('[data-ck="mdp-email"]').fill('Belivay2026')
  await page.locator('[data-ck="envoyer-code-email"]').click()
  await page.locator('[data-ck="code"]').fill('111111')
  await page.locator('[data-ck="confirmer-code"]').click()
  await expect(page.getByText('Ce code ne correspond pas')).toBeVisible()
  await page.locator('[data-ck="code"]').fill('246810')
  await page.locator('[data-ck="confirmer-code"]').click()
  await expect(page.getByText('Adresse e-mail confirmée et enregistrée.')).toBeVisible()
  await expect(page.locator('[data-ck="tete"]')).toContainText('s•••••@exemple.cm')
  await expect(page.getByText('L’adresse e-mail de votre compte a changé.')).toBeVisible()
})

test('connexion par e-mail, puis retour avec l’e-mail seulement (compte reconnu)', async ({ page }) => {
  await ouvrir(page, '#connexion?demo=premiere', CLAIR)
  await page.locator('[data-ck="par-email"]').click()
  await page.locator('[data-ck="identifiant"]').fill('serge.atangana@exemple.cm')
  await page.locator('[data-ck="mdp"]').fill('mauvais1')
  await page.locator('[data-ck="se-connecter"]').click()
  await expect(page.getByText('E-mail, numéro ou mot de passe incorrect.')).toBeVisible()
  await page.locator('[data-ck="mdp"]').fill('Belivay2026')
  await page.locator('[data-ck="se-connecter"]').click()
  await expect(page).toHaveURL(/\/livreur\/?(\?|$)/)
  await sortir(page)
  await expect(page).toHaveURL(/connexion/)
  await page.locator('[data-ck="par-email"]').click()
  await expect(page.getByText('Cet appareil est retenu : votre e-mail suffit.').first()).toBeVisible()
  await page.locator('[data-ck="identifiant"]').fill('serge.atangana@exemple.cm')
  await expect(page.locator('[data-ck="reconnu"]')).toContainText('Bon retour, Serge')
  await page.locator('[data-ck="continuer-reconnu"]').click()
  await expect(page).toHaveURL(/\/livreur\/?(\?|$)/)
})

test('lien de connexion reçu par e-mail', async ({ page }) => {
  await ouvrir(page, '#connexion?demo=premiere&par=email', CLAIR)
  await page.locator('[data-ck="lien-magique"]').click()
  await expect(page.getByText('Écrivez d’abord votre adresse e-mail.')).toBeVisible()
  await page.locator('[data-ck="identifiant"]').fill('serge.atangana@exemple.cm')
  await page.locator('[data-ck="lien-magique"]').click()
  await page.locator('[data-ck="ouvrir-email"]').click()
  await page.locator('[data-ck="me-connecter-lien"]').click()
  await expect(page).toHaveURL(/\/livreur\/?(\?|$)/)
})

test('compte Google associé, puis connexion par Google', async ({ page }) => {
  await ouvrir(page, '#mon-compte', CLAIR)
  await repli(page, 'google')
  await page.locator('[data-ck="associer-google"]').click()
  await page.locator('[data-ck="google-compte"]').click()
  await expect(page.locator('[data-ck="tete"]')).toContainText('Associé à Google')
  await sortir(page)
  await page.locator('[data-ck="par-email"]').click()
  await page.locator('[data-ck="google"]').click()
  await expect(page).toHaveURL(/\/livreur\/?(\?|$)/)
})
