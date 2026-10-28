// Grands écrans (console du prototype, ORDINATEUR D'ABORD) : à l'ordinateur, barre latérale groupée (7 groupes du
// prototype et « Console »), carte « Espace pays », barre du haut avec la pastille rôle · périmètre, pas de barre du
// bas, entrée active allumée ; à la tablette, la barre latérale en tiroir (« ?pop=menu »). Aucun débordement horizontal
// de 768 à 1920 px.
import { expect, test } from '@playwright/test'
import { FR, OUVERTES, adresse, figerHorloge, ouvrir } from './commun'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test.describe('ordinateur', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('barre latérale groupée, carte Espace pays, pastilles, pas de barre du bas', async ({ page }) => {
    await ouvrir(page, adresse('file'), FR)
    const sl = page.locator('aside.sl')
    await expect(sl).toBeVisible()
    await expect(sl.locator('.sd-g')).toHaveText(['Travail du jour', 'Argent', 'Acteurs et confiance', 'Catalogue', 'Logistique', 'Pilotage', 'Gouvernance', 'Console'])
    await expect(sl.locator('.nav-it[aria-current=page]')).toHaveText(/File d’action/)
    await expect(sl.locator('.sd-space')).toContainText('Cameroun · XAF')
    await expect(sl.locator('.sd-space')).toContainText('4 zones exploitées sur 12')
    await expect(sl.locator('.sd-space')).toContainText('Quatre yeux : 3 en attente')
    await expect(page.locator('header.tb .e-role')).toHaveText(/Direction · tous périmètres/)
    await expect(page.locator('nav.dock')).toHaveCount(0)
    // Entrée active : le graphite de la console, pas l'orange du client.
    const fond = await sl.locator('.nav-it.on').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(fond).toBe('rgb(238, 241, 245)')
  })
  test('la carte Espace pays ouvre Espaces pays ; la pastille de rôle ouvre le Profil', async ({ page }) => {
    await ouvrir(page, adresse('litige'), FR)
    await page.locator('aside.sl .sd-space').click()
    await expect(page).toHaveURL(/\/pays$/)
    await page.locator('header.tb a.e-role').click()
    await expect(page).toHaveURL(/\/profil$/)
  })
})

test.describe('tablette', () => {
  test.use({ viewport: { width: 820, height: 1100 } })
  test('le Menu de l’en-tête ouvre le tiroir ; Échap, le voile et une entrée le referment', async ({ page }) => {
    await ouvrir(page, adresse('litige'), FR)
    await expect(page.locator('aside.sl')).toHaveCount(0)
    await expect(page.locator('nav.dock')).toHaveCount(0)
    await page.getByRole('link', { name: 'Menu', exact: true }).first().click()
    await expect(page).toHaveURL(/pop=menu/)
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.tr')).toHaveCount(0)
    await page.goto(adresse('litige', 'pop=menu'))
    await page.locator('.tr-veil').click({ position: { x: 760, y: 500 } })
    await expect(page.locator('.tr')).toHaveCount(0)
    await page.goto(adresse('litige', 'pop=menu'))
    await page.locator('.tr .nav-it', { hasText: 'Revue KYC' }).click()
    await expect(page).toHaveURL(/\/kyc$/)
    await expect(page.locator('.tr')).toHaveCount(0)
  })
})

for (const largeur of [768, 1024, 1280, 1920])
  test(`aucun débordement horizontal à ${largeur} px`, async ({ page }) => {
    // Chaque ouverture attend l'écran ouvert, pas le préchargement de tous les autres (ouvrir, attente « ecran ») : avec
    // le repos du réseau, 3,8 s par page (62 écrans, 3,9 min par largeur) et le délai dépassé sous charge.
    test.setTimeout(30_000 + OUVERTES.length * 2_000)
    await page.setViewportSize({ width: largeur, height: 900 })
    for (const r of OUVERTES) {
      await ouvrir(page, adresse(r), FR, 'ecran')
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), r).toBeLessThanOrEqual(0)
    }
  })
