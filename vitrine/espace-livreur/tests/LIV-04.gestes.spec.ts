// Gestes des écrans de la journée (LIV-04), repris sur le prototype : accueil, feuille « Mon statut » (hors service
// refusé, pause, hors connexion, « je ne peux pas »), paquet (modifié, kit insuffisant, réassort), feuille « Mon kit »
// (réception, consommation) et page ajoutée (rouleau perdu), journée sans paquet.
import { expect, test } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('accueil : carte Maintenant, paquets dans l’ordre, alerte de kit ; hors service refusé avec 2 colis', async ({ page }) => {
  await ouvrir(page, '#aujourdhui', FR)
  await expect(page.locator('.hero.night')).toContainText('Arrêt 2 sur 4')
  await expect(page.locator('.hero.night')).toContainText('reste 2 h 15 avant la limite')
  await expect(page.locator('.li.l4-pq .lt')).toHaveText([/PQ-Z1-261013-003/, /PQ-Z1-261013-006/, /PQ-Z1-261013-008/, /PQ-Z1-261013-007/, /PQ-Z1-261013-011/, /PQ-Z1-261013-012/, /PQ-Z1-261013-013/, /PQ-Z1-261013-010/, /PQ-Z1-261013-001/])
  await expect(page.locator('.li.l4-alerte').first()).toContainText('Kit insuffisant pour PQ-Z1-261013-007')
  await page.locator('.liva-seg a', { hasText: 'Hors service' }).click()
  await expect(page).toHaveURL(/statut\?choix=hors_service/)
  await expect(page.locator('.sheet')).toContainText('Vous avez 2 colis sur vous')
  // La feuille se ferme sur l'accueil.
  await page.getByRole('button', { name: 'Rester disponible' }).click()
  await expect(page.locator('.sheet')).toHaveCount(0)
  await expect(page.locator('.hero.night')).toBeVisible()
})

test('pause : motif et durée, l’heure de fin, puis le statut affiché', async ({ page }) => {
  await ouvrir(page, '#statut', FR)
  await page.getByRole('radio', { name: /En pause/ }).click()
  await page.getByRole('button', { name: 'Repas' }).click()
  await page.getByRole('button', { name: '30 min' }).click()
  await page.getByRole('button', { name: 'Passer en pause · jusqu’à 14 h 35' }).click()
  await expect(page.locator('.sheet')).toHaveCount(0)
  await expect(page.locator('.liva-seg a.on')).toContainText('En pause')
  await page.locator('.liva-seg a', { hasText: 'En pause' }).click()
  await expect(page.locator('.sheet')).toContainText('Repas')
})

test('hors connexion : le statut est mis en file, l’entreprise voit encore l’ancien', async ({ page, context }) => {
  await ouvrir(page, '#statut', FR)
  await context.setOffline(true)
  await page.getByRole('radio', { name: /En pause/ }).click()
  await page.getByRole('button', { name: 'Passer en pause · mis en file' }).click()
  await expect(page.locator('.l4-statut')).toContainText('part au retour du réseau')
  await expect(page.locator('.l4-statut')).toContainText('voit encore « Disponible »')
  await context.setOffline(false)
})

test('paquet modifié et kit insuffisant : différences, réassort demandé', async ({ page }) => {
  await ouvrir(page, '#paquet?id=PQ-Z1-261013-007', FR)
  await expect(page.locator('.l4-change')).toContainText('portail vert')
  await expect(page.locator('.liva-need.bad')).toContainText('Manque 1')
  await page.getByRole('button', { name: 'Prévenir Yafé Express · réassort' }).click()
  await expect(page.getByText('Réassort demandé : Yafé Express est prévenue.')).toBeVisible()
})

test('je ne peux pas faire ce paquet : rendu avant le ramassage, incident après', async ({ page }) => {
  await ouvrir(page, '#statut?paquet=PQ-Z1-261013-007', FR)
  await page.getByRole('radio', { name: /Santé/ }).click()
  await page.getByRole('button', { name: 'Rendre le paquet à Yafé Express' }).click()
  await expect(page.getByText('Paquet PQ-Z1-261013-007 rendu à Yafé Express')).toBeVisible()
  await page.goto('statut?paquet=PQ-Z1-261013-003')
  await expect(page.locator('.sheet')).toContainText('2 colis sont déjà sous votre garde')
  await expect(page.getByRole('button', { name: 'Déclarer l’incident « panne »' })).toBeDisabled()
})

test('kit : feuille sur l’accueil, réception refusée pour un autre rouleau, puis rouleau perdu dans la vue « suivi » du même kit (DP-66)', async ({ page }) => {
  await ouvrir(page, '#kit', FR)
  await expect(page.locator('.sheet .liva-fmt > div').nth(2)).toContainText('manque')
  await page.getByRole('button', { name: 'J’ai reçu des emballages' }).click()
  await page.getByLabel('Scanner le rouleau : première étiquette').fill('BV 24 9990')
  await page.getByRole('button', { name: 'Confirmer la réception' }).click()
  await expect(page.locator('.sheet [role=alert]')).toContainText('pas celui que votre entreprise vous a remis')
  await page.getByLabel('Scanner le rouleau : première étiquette').fill('BV 24 8200')
  await page.getByRole('button', { name: 'Confirmer la réception' }).click()
  await expect(page.locator('.sheet')).toContainText('Mon kit d’emballage')
  await page.getByRole('button', { name: /Pochette abîmée, rouleau perdu/ }).click()
  await expect(page).toHaveURL(/\/kit\?vue=suivi$/)
  await page.getByRole('button', { name: 'Déclarer un rouleau perdu' }).click()
  await page.getByRole('button', { name: 'Invalider la plage du rouleau' }).click()
  await expect(page.getByText(/Rouleau déclaré perdu/)).toBeVisible()
  await page.getByRole('button', { name: 'Retour au kit' }).click()
  await expect(page.locator('.sheet')).toContainText('Mon kit d’emballage')
})

test('journée sans paquet : carte vide expliquée', async ({ page }) => {
  await ouvrir(page, '#aujourdhui?demo=aucun_paquet', FR)
  await expect(page.getByRole('heading', { name: 'Pas de paquet pour l’instant' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Vérifier mon kit' })).toBeVisible()
})
