// Gestes de la tournée (LIV-05 : P08 tournée, P09 navigation, P33 appel) : ordre imposé et arrêt en cours, aucune
// valeur ni identité client affichée, heure limite et colis sous garde ; itinéraire de l'arrêt en cours seulement,
// route coupée (note minimale) ; appel masqué ouvert seulement aux parties de l'arrêt en cours, journalisé sans contenu,
// message masqué à texte fixe.
import { expect, test } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'
import { re } from './LIV-06.parcours'

const CLAIR = { nom: 'clair', theme: 'light', lang: 'fr' } as const

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('tournée : ordre imposé, arrêt en cours, heure limite, anonymat ; « Je suis arrivé » ouvre l’arrivée', async ({ page }) => {
  await ouvrir(page, '#tournee', CLAIR)
  await expect(page.getByText(re('Ordre calculé')).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Maison Ngono' })).toBeVisible()
  await expect(page.getByText(re('Heure limite 16 h 20'))).toBeVisible()
  await expect(page.locator('.lv-reste')).toContainText(re('reste 2 h 15'))
  // Remise à domicile à venir : ni prénom ni position avant qu'elle soit l'arrêt en cours.
  const liste = page.locator('.lv-liste').last()
  await expect(liste).toContainText(re('Remise à domicile · Bastos'))
  await expect(liste).not.toContainText('Solange')
  await expect(page.locator('#app')).not.toContainText(/\+237|\b6\d{8}\b/)
  await page.getByRole('button', { name: re('Je suis arrivé') }).click()
  await expect(page).toHaveURL(/\/arrivee\?a=A2/)
})

test('tournée en anglais et sombre : textes traduits', async ({ page }) => {
  await ouvrir(page, '#tournee', { nom: 'sombre', theme: 'dark', lang: 'en' })
  await expect(page.getByText(re('Calculated order')).first()).toBeVisible()
  await expect(page.getByRole('button', { name: re('I have arrived') })).toBeVisible()
})

test('navigation : itinéraire de l’arrêt en cours ; route coupée signalée avec une note suffisante', async ({ page }) => {
  await ouvrir(page, '#navigation', CLAIR)
  await expect(page.locator('.lv-cartouche')).toContainText(/min/)
  await expect(page.getByRole('link', { name: re('Ouvrir dans une autre application') })).toHaveAttribute('href', /^geo:-?\d+\.\d+,-?\d+\.\d+$/)
  await page.getByRole('button', { name: re('Signaler une route coupée') }).click()
  const envoyer = page.getByRole('button', { name: re('Envoyer le signalement') })
  await page.getByLabel(re('Ce que vous voyez')).fill('Pluie')
  await expect(envoyer).toBeDisabled()
  await page.getByLabel(re('Ce que vous voyez')).fill('Route inondée après le carrefour, impraticable à moto.')
  await envoyer.click()
  await expect(page.getByText(re('Route coupée signalée'))).toBeVisible()
})

test('appel : client fermé hors de sa remise ; appel masqué au vendeur journalisé ; message masqué à texte fixe', async ({ page }) => {
  await ouvrir(page, '#appel', CLAIR)
  await expect(page.getByRole('radio', { name: re('Client de l’arrêt en cours') })).toBeDisabled()
  await page.getByRole('radio', { name: re('Maison Ngono') }).click()
  await page.getByRole('button', { name: re('Appel dans l’application') }).click()
  const appel = page.getByRole('region', { name: re('Appel en cours') })
  await expect(appel).toContainText(re('aucun numéro'))
  await appel.getByRole('button', { name: 'Raccrocher' }).click()
  await expect(appel).toHaveCount(0)
  await expect(page.locator('.lv-liste')).toContainText(re('Appel dans l’application'))
  await page.getByRole('button', { name: re('Pas de réponse ? Message masqué') }).click()
  await expect(page.locator('main textarea, main input[type=text]')).toHaveCount(0)
  await page.getByRole('button', { name: re('J’arrive dans 5 minutes.') }).click()
  // Geste réversible : « Annuler » pendant 5 s, rien n'est envoyé.
  await expect(page.getByText(re('Envoi dans'))).toBeVisible()
  await page.getByRole('button', { name: 'Annuler' }).click()
  await expect(page.getByText(re('Envoi dans'))).toHaveCount(0)
  await page.waitForTimeout(5500)
  await expect(page.getByText(re('SMS masqué envoyé à Maison Ngono'))).toHaveCount(0)
  await page.getByRole('button', { name: re('Pas de réponse ? Message masqué') }).click()
  await page.getByRole('button', { name: re('J’arrive dans 5 minutes.') }).click()
  await expect(page.getByText(re('SMS masqué envoyé à Maison Ngono'))).toBeVisible({ timeout: 10_000 })
})

test('tournée : filtres et recherche d’un arrêt, arrêt vide expliqué, action principale dans la barre du bas', async ({ page }) => {
  await ouvrir(page, '#tournee', CLAIR)
  const liste = page.locator('.lv-liste')
  const lignes = liste.locator('.stop')
  const total = await lignes.count()
  expect(total).toBeGreaterThan(1)
  await page.getByRole('button', { name: /^Faits/ }).click()
  await expect(page.getByRole('button', { name: /^Faits/ })).toHaveAttribute('aria-pressed', 'true')
  expect(await lignes.count()).toBeLessThan(total)
  await page.getByRole('button', { name: /^Tous/ }).click()
  await expect(lignes).toHaveCount(total)
  await page.getByLabel('Chercher un arrêt').fill('zzz introuvable')
  await expect(liste).toContainText('Aucun arrêt ne correspond')
  await page.getByRole('button', { name: 'Voir tous les arrêts' }).click()
  await expect(lignes).toHaveCount(total)
  await expect(page.locator('.bottom-cta .btn.primary')).toBeVisible()
})
