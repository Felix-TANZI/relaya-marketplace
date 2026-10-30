// Gestes des écrans LIV-09 (historique, activité, Trust Score).
import { expect, test } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const main = '#app main'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('historique : recherche par les 4 derniers chiffres d’une étiquette, détail sans code ni donnée client', async ({ page }) => {
  await ouvrir(page, '#historique', FR)
  await expect(page.locator(main)).toContainText('Vos preuves · 180 jours')
  await page.getByRole('link', { name: 'Rechercher une étiquette' }).click()
  await expect(page).toHaveURL(/s=recherche/)
  await page.getByRole('searchbox', { name: 'Rechercher une étiquette' }).fill('8203')
  await page.getByRole('button', { name: 'Chercher' }).click()
  await expect(page.locator(main)).toContainText('PQ-Z1-261013-001')
  await page.getByRole('link', { name: /PQ-Z1-261013-001/ }).click()
  await expect(page).toHaveURL(/mission=PQ-Z1-261013-001/)
  await expect(page.locator(main)).toContainText('Code de remise validé')
  await expect(page.locator(main)).toContainText('••••••')
  await expect(page.locator(main)).toContainText('numéro de commande et zone seulement')
})

test('historique : la mission en litige montre le dossier sans effet sur le score', async ({ page }) => {
  await ouvrir(page, '#historique?mission=PQ-Z1-261009-003', FR)
  await expect(page.locator('.hero.amber')).toContainText('Litige en cours')
  await expect(page.locator(main)).toContainText('Vos preuves, versées automatiquement')
  await expect(page.locator(main)).toContainText('aucun effet')
  await page.getByRole('link', { name: 'Étapes horodatées et codes' }).click()
  await expect(page).toHaveURL(/vue=etapes/)
  await expect(page.locator(main)).toContainText('••••••')
})

test('activité : qui paie toujours affiché, onglet mémorisé, mission en revue vers l’historique', async ({ page }) => {
  await ouvrir(page, '#activite', FR)
  await expect(page.locator(main)).toContainText('Vous êtes payé par Yafé Express, selon votre accord avec elle.')
  await page.getByRole('tab', { name: 'Semaine' }).click()
  await expect(page.locator('svg.l9-chart')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Semaine' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: 'Mois' }).click()
  await expect(page.locator(main)).toContainText('Missions en revue · 1')
  await page.getByRole('link', { name: /PQ-Z1-261009-003/ }).click()
  await expect(page).toHaveURL(/mission=PQ-Z1-261009-003/)
})

test('Trust Score : note et critères ; contester un événement une fois, effet suspendu', async ({ page }) => {
  await ouvrir(page, '#trust', FR)
  await expect(page.locator('.livc-gauge')).toContainText('74')
  await expect(page.locator('.livc-crit')).toHaveCount(5)
  await page.getByRole('tab', { name: 'Événements' }).click()
  await page.getByRole('button', { name: /Contester · jusqu’au/ }).click()
  await page.getByRole('radio', { name: 'Erreur d’horodatage' }).click()
  await page.locator('#l9-note').fill('J’étais devant la boutique à 15 h 10, la position le montre.')
  await page.getByRole('button', { name: 'Envoyer la contestation' }).click()
  await expect(page.locator(main)).toContainText('Contestation en examen · effet suspendu')
  await expect(page.getByRole('button', { name: /Contester · jusqu’au/ })).toHaveCount(0)
})
