// Grands écrans (console du prototype) : à l'ordinateur, barre latérale groupée, barre du haut, pas de barre du bas,
// entrée active allumée (une page de détail allume sa liste et garde sa flèche) ; à la tablette, la barre latérale en
// tiroir ouvert par le Menu de la barre du haut (« ?pop=menu », fermé par Échap, le voile ou une entrée).
// Aucun débordement horizontal de 768 à 1920 px.
import { expect, test } from '@playwright/test'
import { FR, ROUTES, adresse, figerHorloge, ouvrir } from './commun'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test.describe('ordinateur', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('barre latérale groupée, en-tête fin, pas de barre du bas', async ({ page }) => {
    await ouvrir(page, adresse('tableau'), FR)
    const sl = page.locator('aside.sl')
    await expect(sl).toBeVisible()
    await expect(sl.locator('.sd-g')).toHaveText(['Aujourd’hui', 'Paquets', 'Missions', 'Livreurs', 'Équipe', 'Argent', 'Qualité', 'Mon entreprise', 'Aide'])
    await expect(sl.locator('.nav-it[aria-current=page]')).toHaveText(/Tableau de bord/)
    await expect(page.locator('nav.dock')).toHaveCount(0)
    await expect(page.locator('header .avatar')).toBeVisible()
    // Couleur de l'entrée active : le vert de l'entreprise, pas l'orange du client.
    const fond = await sl.locator('.nav-it.on').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(fond).toBe('rgb(234, 243, 241)')
  })
  test('une page de détail allume sa liste et garde sa flèche ; une entrée n’en a pas', async ({ page }) => {
    await ouvrir(page, adresse('livreur'), FR)
    await expect(page.locator('aside.sl .nav-it[aria-current=page]')).toHaveText(/Livreurs/)
    await expect(page.getByRole('link', { name: 'Revenir' })).toHaveAttribute('href', '/entreprise/flotte')
    // « Livreurs » porte le badge des demandes des livreurs (DP-66 : départs, absences prévenues).
    await page.locator('aside.sl').getByRole('link', { name: /^Livreurs(, \d+)?$/ }).click()
    await expect(page).toHaveURL(/\/flotte$/)
    await expect(page.getByRole('link', { name: 'Revenir' })).toHaveCount(0)
  })
  test('la carte de l’entreprise ouvre l’État du compte ; la pastille d’état aussi', async ({ page }) => {
    await ouvrir(page, adresse('paquets'), FR)
    await page.locator('aside.sl .sd-space').click()
    await expect(page).toHaveURL(/\/etat$/)
    await page.goto(adresse('paquets'))
    await page.locator('header .tb-pills a.pill').click()
    await expect(page).toHaveURL(/\/etat$/)
  })
})

test.describe('tablette', () => {
  test.use({ viewport: { width: 820, height: 1100 } })
  test('le Menu de l’en-tête ouvre le tiroir ; Échap, le voile et une entrée le referment', async ({ page }) => {
    await ouvrir(page, adresse('missions'), FR)
    await expect(page.locator('aside.sl')).toHaveCount(0)
    await expect(page.locator('nav.dock')).toHaveCount(0)
    await page.getByRole('link', { name: 'Menu', exact: true }).first().click()
    await expect(page).toHaveURL(/pop=menu/)
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.tr')).toHaveCount(0)
    await page.goto(adresse('missions', 'pop=menu'))
    await page.locator('.tr-veil').click({ position: { x: 760, y: 500 } })
    await expect(page.locator('.tr')).toHaveCount(0)
    await page.goto(adresse('missions', 'pop=menu'))
    await page.locator('.tr .nav-it', { hasText: 'Véhicules' }).click()
    await expect(page).toHaveURL(/\/vehicules$/)
    await expect(page.locator('.tr')).toHaveCount(0)
  })
})

for (const largeur of [768, 1024, 1280, 1920])
  test(`aucun débordement horizontal à ${largeur} px`, async ({ page }) => {
    // Toutes les routes dans un seul test : ~2,6 s chacune (chargement + réseau au repos), 1,7 à 1,9 min seul ; marge pour la charge.
    test.setTimeout(30_000 + ROUTES.length * 5_000)
    await page.setViewportSize({ width: largeur, height: 900 })
    for (const r of ROUTES) {
      await ouvrir(page, adresse(r), FR)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), r).toBeLessThanOrEqual(0)
    }
  })
