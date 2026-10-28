// Gestes et règles du groupe S1, écrans d'ADM-03 et pages ajoutées : connexion en deux étapes (blocage, codes faux,
// arrivée), File d'action (tri, filtres, verrou, délégation, périmètre de chaque rôle), quatre yeux (jamais les siennes,
// un autre compte contresigne), vue d'ensemble (chaque chiffre mène à sa liste), recherche (selon le rôle).
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

test.use({ viewport: { width: 1280, height: 900 } })

const MOTIF = 'Motif de démonstration suffisamment long pour être accepté par la console.'

async function deconnecter(page: Page) {
  await ouvrir(page, adresse('profil'), FR)
  await page.locator('button', { hasText: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/admin\/connexion$/)
}

test.describe('connexion (ADM-P01)', () => {
  test('identifiants, second facteur, trois codes faux ramènent à l’étape 1, puis arrivée et file', async ({ page }) => {
    await figerHorloge(page)
    await deconnecter(page)
    await expect(page.getByText('Étape 1 sur 2')).toBeVisible()
    await page.getByLabel('Identifiant nominatif').fill('franck@belivay.com')
    await page.getByLabel('Mot de passe', { exact: true }).fill('mauvais-mot-de-passe')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByRole('alert')).toContainText(/Encore 4 essais?/)
    await page.getByLabel('Mot de passe', { exact: true }).fill('Belivay2026')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByText('Étape 2 sur 2')).toBeVisible()
    const valider = page.getByRole('button', { name: 'Valider' })
    await expect(valider).toBeDisabled()
    for (let i = 0; i < 3; i++) {
      await page.getByLabel('Code à 6 chiffres').fill('111111')
      await valider.click()
    }
    await expect(page.getByText('Étape 1 sur 2')).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('Trois codes incorrects')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Belivay2026')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('246810')
    await page.getByRole('button', { name: 'Valider' }).click()
    await expect(page.getByText('Bonjour Franck')).toBeVisible()
    await expect(page.getByText('Nouvel appareil')).toBeVisible()
    await page.getByRole('button', { name: 'Ouvrir la file d’action' }).click()
    await expect(page.locator('#app h1')).toContainText(/décisions? à prendre|Rien à décider/)
  })

  test('cinq échecs : blocage, Réessayer inactif, alerte Direction', async ({ page }) => {
    await figerHorloge(page)
    await deconnecter(page)
    await page.getByLabel('Identifiant nominatif').fill('clarisse@belivay.com')
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Mot de passe', { exact: true }).fill('faux' + i)
      await page.getByRole('button', { name: 'Se connecter' }).click()
      if (i < 4) await expect(page.getByRole('alert')).toContainText(new RegExp(`Encore ${4 - i} essais?`))
    }
    await expect(page.getByRole('heading', { name: /Accès bloqué pendant 30 minutes/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeDisabled()
    await expect(page.getByText('Les comptes Direction ont été alertés')).toBeVisible()
  })
})

test.describe('File d’action (ADM-P02)', () => {
  test('Direction : retards en tête, filtres, verrou posé à l’ouverture, délégation journalisée', async ({ page }) => {
    await figerHorloge(page)
    await ouvrir(page, adresse('file'), FR)
    const cartes = page.locator('button.admA-q')
    await expect(cartes.first()).toHaveClass(/late/)
    await expect(page.getByText(/dossiers? en retard/).first()).toBeVisible()
    // Filtre par type, puis toutes.
    // Six types en puces, les autres dans « Autres » : Litige est dans l'un ou l'autre.
    const puce = page.locator('.chips button', { hasText: 'Litige' })
    if (await puce.count()) await puce.first().click()
    else await page.locator('.chips .a-autres select').selectOption('litige')
    await expect(cartes.first()).toContainText('BLV-')
    await page.locator('.chips button', { hasText: 'Toutes' }).click()
    // Ouvrir : verrou « Vous traitez ce dossier ».
    await cartes.first().click()
    await expect(page.locator('.admA-dos')).toContainText('Vous traitez ce dossier')
    await page.getByRole('button', { name: /Fermer le dossier et libérer le verrou/ }).click()
    await expect(page.locator('.admA-dos')).toContainText('Aucun dossier ouvert')
    // Un dossier verrouillé par un autre agent : lecture seulement.
    await page.locator('button.admA-q', { hasText: 'SP-0207' }).click()
    await expect(page.locator('.admA-dos')).toContainText('Clarisse Mvondo traite ce dossier')
    // Surcharge : déléguer les cartes en retard à l'agent de leur métier, avec motif.
    await page.locator('.admA-dos').getByRole('button', { name: /Fermer le dossier/ }).click()
    await page.locator('.chips button', { hasText: 'En retard' }).click()
    await page.getByRole('radio', { name: /Yannick Owona/ }).click()
    await page.locator('.admA-dos textarea').fill(MOTIF)
    await page.getByRole('button', { name: /Déléguer \d+ cartes?/ }).click()
    await expect(page.getByRole('status')).toContainText(/confiées? à Yannick Owona/)
  })

  test('chaque rôle ne reçoit que ses cartes, et le panneau hors périmètre', async ({ page }) => {
    await figerHorloge(page)
    await ouvrir(page, adresse('file'), { ...FR, role: 'finance' })
    const types = await page.locator('button.admA-q .ty').allInnerTexts()
    expect(new Set(types.map((x) => x.trim().toUpperCase()))).toEqual(new Set(['ARGENT', 'FINANCE', 'QUATRE YEUX']))
    await expect(page.getByText('Cartes hors de votre périmètre')).toBeVisible()
    await ouvrir(page, adresse('file'), { ...FR, role: 'support' })
    await expect(page.locator('button.admA-q', { hasText: 'LT-0405' })).toHaveCount(0) // recours : Médiation
    await expect(page.locator('button.admA-q', { hasText: 'QY-0007' })).toHaveCount(0) // sa propre demande
    await expect(page.locator('button.admA-q', { hasText: 'LT-0412' })).toHaveCount(1)
    await ouvrir(page, adresse('file'), { ...FR, role: 'operations' })
    await expect(page.locator('button.admA-q', { hasText: 'BLV-51877' })).toHaveCount(0) // Z9 : hors de ses zones
    await expect(page.locator('button.admA-q .amt')).toHaveCount(0) // jamais l'argent
  })
})

test('quatre yeux : jamais les siennes ; un autre compte, du bon rôle, contresigne', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('quatreyeux'), { ...FR, role: 'finance' })
  const carte = page.locator('.e-qy', { hasText: 'QY-0007' })
  await carte.locator('textarea').fill(MOTIF)
  await carte.getByRole('button', { name: 'Contresigner' }).click()
  await expect(page.getByText('Rien à contresigner')).toBeVisible()
  await expect(page.locator('.e-qy', { hasText: 'QY-0007' })).toContainText('Contresignée')
})

test('vue d’ensemble : chaque chiffre mène à sa liste ; aucun montant sans l’argent', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('direct'), FR)
  await expect(page.getByText('Escrow bloqué')).toBeVisible()
  await page.getByRole('link', { name: /Litiges ouverts : \d+, voir la liste/ }).click()
  await expect(page).toHaveURL(/\/admin\/litige/)
  await ouvrir(page, adresse('direct'), { ...FR, role: 'operations' })
  await expect(page.getByText('Escrow bloqué')).toHaveCount(0)
  await expect(page.locator('.s1-zone', { hasText: 'Z9' })).toHaveCount(0)
})

test('recherche : selon le rôle et le périmètre ; téléphone pour le Support seulement, masqué', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('recherche', 'q=tonton'), FR)
  await expect(page.getByRole('region', { name: 'Litiges' })).toBeVisible()
  await ouvrir(page, adresse('recherche', 'q=tonton'), { ...FR, role: 'finance' })
  await expect(page.getByRole('region', { name: 'Commandes' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Litiges' })).toHaveCount(0)
  await ouvrir(page, adresse('recherche', 'q=677124217'), { ...FR, role: 'support' })
  await expect(page.getByRole('region', { name: 'Clients (téléphone)' })).toContainText('+237 6•• •• •• 17')
  await ouvrir(page, adresse('recherche', 'q=677124217'), { ...FR, role: 'finance' })
  await expect(page.getByRole('region', { name: 'Clients (téléphone)' })).toHaveCount(0)
})
