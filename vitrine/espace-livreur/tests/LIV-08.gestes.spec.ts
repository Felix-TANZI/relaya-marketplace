// Gestes des écrans LIV-08 (incident, synchronisation, clôture) : chaque geste écrit dans la source de démonstration
// et l'écran suit ; délais et seuils lus dans le registre (aucune valeur écrite dans l'écran).
import { expect, test, type Page } from '@playwright/test'
import { adresse, figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const main = '#app main'
// Une vraie petite image (PNG 2 × 2) : l'appareil photo de l'application la compresse comme une photo prise.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==', 'base64')
const NOTE = 'Rideau baissé, aucun panneau, le voisin dit fermé depuis midi.'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

async function declarerBoutiqueFermee(page: Page) {
  await ouvrir(page, '#incident', FR)
  await expect(page.locator(main)).toContainText('Aucun incident ne vous pénalise automatiquement')
  await page.getByRole('link', { name: /Chez le vendeur/ }).click()
  await page.getByRole('radio', { name: /Boutique fermée/ }).click()
  await expect(page.locator('.livc-cq')).toContainText('vous ne dissociez rien')
  await expect(page.locator('.livc-cq')).toContainText('Décision de Yafé Express sous 15 min')
  const envoyer = page.getByRole('button', { name: 'Envoyer l’incident' })
  await expect(envoyer).toBeDisabled()
  await page.locator('[data-lc-photo]').setInputFiles({ name: 'devanture.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.locator('.photos .photo')).toHaveCount(1)
  await page.locator('#l8-note').fill('Rideau baissé.')
  await expect(envoyer).toBeDisabled()
  await page.locator('#l8-note').fill(NOTE)
  await envoyer.click()
  await expect(page).toHaveURL(/incident\?id=IN-/)
}

test('incident bloquant : déclaré avec photo et note, en attente, puis validé par l’entreprise et l’arrêt dissocié', async ({ page }) => {
  await declarerBoutiqueFermee(page)
  await expect(page.locator('.livc-sh-h')).toContainText('En attente de validation')
  await expect(page.locator('.hero.amber')).toContainText('Yafé Express valide votre déclaration')
  await expect(page.locator(main)).toContainText('Reçu par Yafé Express')
  // L'entreprise (simulée) décide 30 s plus tard.
  await page.clock.setFixedTime(new Date('2026-10-13T13:06:00.000Z'))
  await page.reload()
  await expect(page.locator('.livc-sh-h')).toContainText('Validé : la tournée est ajustée', { timeout: 8000 })
  await expect(page.locator('.livc-sh-h')).toContainText('par Yafé Express')
  await expect(page.locator('.livc-strike')).toContainText('Dissocié')
  await page.getByRole('link', { name: 'Suivre la nouvelle tournée' }).click()
  await expect(page).toHaveURL(/\/tournee$/)
})

test('hors connexion : l’incident part en file, la synchronisation le montre, puis l’envoie au retour du réseau', async ({ page, context }) => {
  // Les écrans sont déjà sur le téléphone (application installée) : on les ouvre d'abord en ligne.
  await ouvrir(page, '#synchronisation', FR)
  await page.getByRole('link', { name: 'Signaler un incident' }).first().click()
  await page.getByRole('link', { name: /En route/ }).click()
  await context.setOffline(true)
  await page.getByRole('radio', { name: 'Pluie forte' }).click()
  await page.locator('#l8-note').fill('Orage sur Bastos, je m’abrite sous un auvent avec les colis.')
  await page.getByRole('button', { name: 'Mettre l’incident en file' }).click()
  await expect(page.locator('.livc-sh-h')).toContainText('Incident enregistré hors connexion')
  await expect(page.locator('.livc-q').first()).toContainText('En file')
  await page.getByRole('link', { name: 'Voir la file d’envoi' }).click()
  await expect(page.locator('[data-hors-ligne]')).toContainText('Hors connexion')
  await expect(page.locator(main)).toContainText('En attente d’envoi')
  await expect(page.locator(main)).toContainText('Expire')
  await context.setOffline(false)
  await expect(page.locator('.hero')).toContainText('Tout est envoyé', { timeout: 8000 })
})

test('clôture : refusée avec des colis sous garde ; sans garde, comptage du kit, écart expliqué, journée close', async ({ page }) => {
  await ouvrir(page, '#cloture', FR)
  await expect(page.locator('.hero.red')).toContainText('Clôture impossible pour l’instant')
  await expect(page.locator('.bottom-cta')).toContainText('Le bouton s’active quand plus aucun colis n’est sur vous.')
  await expect(page.getByRole('button', { name: 'Clôturer ma journée' })).toBeDisabled()
  await expect(page.getByRole('link', { name: 'Reprendre la tournée' })).toBeVisible()
  // Les colis ont été déposés : la situation « journée faite » du jeu d'essai (aucun colis sous garde).
  await page.goto(adresse('#cloture?demo=aucun_paquet'))
  await expect(page.locator('.hero.orange')).toContainText('Vous pouvez clôturer votre journée')
  await page.getByRole('button', { name: 'Pochettes S : un de moins' }).click()
  await expect(page.locator('.bottom-cta')).toContainText('Expliquez l’écart sur : Pochettes S.')
  await page.locator('.l8-ecart').getByRole('radio', { name: 'Perdue' }).click()
  await page.getByRole('button', { name: 'Clôturer ma journée' }).click()
  await page.getByRole('button', { name: 'Clôturer maintenant' }).click()
  await expect(page.locator('.hero')).toContainText('Bonne soirée, Serge')
  await expect(page.locator('.hero')).toContainText('Statut : hors service')
  // Récapitulatif de la journée en PDF (partagé, sinon enregistré).
  const pdf = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Récapitulatif de la journée (PDF)' }).click()
  expect((await pdf).suggestedFilename()).toMatch(/^journee-\d{4}-\d{2}-\d{2}\.pdf$/)
})
