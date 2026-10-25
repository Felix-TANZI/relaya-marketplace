// Gestes du terrain (une main sur le guidon, réseau qui coupe, batterie faible) : enchaînement automatique des arrêts
// avec « Annuler », récupération groupée chez le vendeur (photo ou scan par colis, compteur, colis manquant), un seul
// « Un problème ? » selon l'étape, « Faire cet arrêt d'abord » (refusé si un dépôt précède son ramassage), pastilles
// hors réseau et batterie détectées sans bouton. PW_MOUVEMENTS=1 : mêmes gestes avec les animations du téléphone.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'
import { arriver, ramasserA2, re } from './LIV-06.parcours'

const CLAIR = { nom: 'clair', theme: 'light', lang: 'fr' } as const

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

async function photoDemo(page: Page) {
  const cam = page.locator('.lv-cam')
  await cam.getByRole('button', { name: re('Photo de démonstration') }).click()
  await expect(cam).toHaveCount(0, { timeout: 15_000 })
}

test('enchaînement : après la remise validée, « Arrêt suivant » 3 s puis la tournée sur l’arrêt suivant', async ({ page }) => {
  test.setTimeout(180_000)
  await ouvrir(page, '#tournee', CLAIR)
  await ramasserA2(page)
  const bandeau = page.locator('.lvt-suivant')
  await expect(bandeau).toContainText(re('Arrêt suivant · 3/7'))
  await expect(bandeau).toContainText('Relais Bastos Carrefour')
  await expect(page).toHaveURL(/\/tournee$/, { timeout: 6_000 })
  await expect(page.getByRole('heading', { name: 'Relais Bastos Carrefour' })).toBeVisible()
  await expect(page.getByText(re('Arrêt 3 sur 7'))).toBeVisible()
})

test('enchaînement : « Annuler » garde l’écran de la remise validée', async ({ page }) => {
  test.setTimeout(180_000)
  await ouvrir(page, '#tournee', CLAIR)
  await ramasserA2(page)
  await page.locator('.lvt-suivant').getByRole('button', { name: 'Annuler' }).click()
  await expect(page.locator('.lvt-suivant')).toHaveCount(0)
  await page.waitForTimeout(4_000)
  await expect(page).toHaveURL(/\/code-remise/)
  await expect(page.getByRole('heading', { name: 'Remise validée' })).toBeVisible()
})

test('récupération groupée : compteur, scan, colis pas prêt (attendre ou partir), « Tout récupéré »', async ({ page }) => {
  await ouvrir(page, '#tournee', CLAIR)
  await arriver(page)
  await expect(page).toHaveURL(/\/arrivee\?a=A2/)
  const compteur = page.locator('.lvt-compteur')
  const tout = page.getByRole('button', { name: 'Tout récupéré' })
  await expect(compteur).toHaveText('0/2')
  await expect(tout).toBeDisabled()
  // Scan : le colis tenu devant l'appareil est coché, la photo est gardée (R66).
  await page.getByRole('button', { name: 'Scanner un colis' }).click()
  await photoDemo(page)
  await expect(compteur).toHaveText('1/2')
  await expect(page.getByText(re('Scanné à'))).toBeVisible()
  await expect(tout).toBeDisabled()
  // Le second n'est pas prêt : attendre (minuteur), puis partir avec les autres.
  await page.getByRole('button', { name: /^Colis manquant ou pas prêt · Écouteurs/ }).click()
  await page.getByRole('button', { name: /^Attendre/ }).click()
  await expect(page.getByRole('timer').filter({ hasText: re('Pas prêt · attente') })).toBeVisible()
  await page.getByRole('button', { name: /^Colis manquant ou pas prêt · Écouteurs/ }).click()
  await page.getByRole('button', { name: /^Partir avec les autres/ }).click()
  await expect(compteur).toHaveText('1/1')
  await expect(page.getByText(re('reste chez Maison Ngono'))).toBeVisible()
  await page.getByRole('link', { name: 'Tout récupéré' }).click()
  await expect(page).toHaveURL(/\/controle\?a=A2&c=BLV-00011-1/)
})

test('« Un problème ? » : un seul bouton, options selon l’étape ; retard prévu en deux touchers', async ({ page }) => {
  await ouvrir(page, '#tournee', CLAIR)
  const carte = page.locator('.lv-arret')
  await expect(carte.getByRole('button', { name: 'Un problème ?' })).toHaveCount(1)
  // En route : panne, pluie forte, adresse introuvable, route coupée.
  await carte.getByRole('button', { name: 'Un problème ?' }).click()
  const feuille = page.getByRole('dialog')
  await expect(feuille).toContainText('Panne ou crevaison')
  await expect(feuille).not.toContainText('Vendeur fermé')
  await feuille.getByRole('button', { name: /^Pluie forte/ }).click()
  await feuille.getByRole('button', { name: '+15 min' }).click()
  await expect(feuille).toContainText(re('Le vendeur et votre entreprise sont prévenus : arrivée vers 14 h 45.'))
  await feuille.getByRole('button', { name: 'Fermer' }).last().click()
  // Sur place chez le vendeur : vendeur fermé, colis pas prêt, colis abîmé, adresse introuvable.
  await arriver(page)
  await page.getByRole('button', { name: 'Un problème ?' }).click()
  await expect(page.getByRole('dialog')).toContainText('Colis abîmé')
  await expect(page.getByRole('dialog')).not.toContainText('Panne ou crevaison')
  await page.getByRole('link', { name: re('Vendeur fermé') }).click()
  await expect(page).toHaveURL(/s=ferme/)
})

test('« Faire cet arrêt d’abord » : refusé si le dépôt précède son ramassage, sinon l’ordre change', async ({ page }) => {
  await ouvrir(page, '#tournee', CLAIR)
  const liste = page.locator('.lv-liste').last()
  // Le dépôt au relais attend les colis de Maison Ngono : refusé, avec l'explication.
  await liste.getByRole('button', { name: re('dépôt au relais') }).click()
  await liste.getByRole('button', { name: 'Faire cet arrêt d’abord' }).click()
  await expect(liste.getByRole('alert')).toContainText(re('les colis sont encore chez Maison Ngono'))
  // Afrik Déco (un ramassage) passe devant : l'entreprise est prévenue.
  await liste.getByRole('button', { name: /Afrik Déco/ }).click()
  await liste.getByRole('button', { name: 'Faire cet arrêt d’abord' }).click()
  await expect(page.getByRole('heading', { name: 'Afrik Déco' })).toBeVisible()
  await expect(page.getByText(re('Ordre changé : Afrik Déco d’abord. Yafé Express est prévenue'))).toBeVisible()
  await expect(page.getByText(re('Arrêt 2 sur 7'))).toBeVisible()
})

test('contact : « Appeler » en un toucher ouvre l’appel masqué en cours', async ({ page }) => {
  await ouvrir(page, '#tournee', CLAIR)
  await page.locator('.lv-arret').getByRole('button', { name: 'Appeler' }).click()
  await expect(page.getByRole('region', { name: re('Appel en cours') })).toBeVisible()
})

test('hors réseau et batterie faible : pastilles discrètes, mode sobre, sans bouton', async ({ page, context }) => {
  await page.addInitScript(() => {
    const b = Object.assign(new EventTarget(), { level: 0.12, charging: false })
    Object.defineProperty(navigator, 'getBattery', { value: () => Promise.resolve(b) })
  })
  await ouvrir(page, '#tournee', CLAIR)
  await expect(page.locator('.lvt-etat.batterie')).toContainText(re('Batterie faible — mode sobre'))
  expect(await page.evaluate(() => document.documentElement.dataset.sobre)).toBe('1')
  await context.setOffline(true)
  await expect(page.locator('.lvt-etat').first()).toContainText(re('Hors réseau — vos actions sont gardées'))
  await context.setOffline(false)
  await expect(page.locator('.l-horsligne-p')).toHaveCount(0)
})
