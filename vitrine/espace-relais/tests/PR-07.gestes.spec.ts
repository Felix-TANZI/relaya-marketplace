// Gestes des écrans PR-07 (Constats et retours, Dossier, Fermeture exceptionnelle, Historique), de bout en bout sur la
// démonstration (mardi 13 octobre 2026, 14 h 05) : constat signé du PIN, colis remis orienté vers le client, retour
// non validé refusé puis retour validé déposé, contestation unique, fermeture (préavis, durée, droits), historique sans
// montants pour l'employé et export pour le gérant.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const R = { nom: 'clair', theme: 'light' as const, lang: 'fr' as const }
const PIN = '240913'

async function photo(page: Page, bouton: ReturnType<Page['locator']>) {
  await bouton.click()
  const feuille = page.getByRole('dialog', { name: 'Appareil photo' })
  await expect(feuille).toBeVisible()
  await feuille.getByRole('button', { name: 'Prendre la photo' }).click()
  await expect(feuille).toBeHidden()
}
async function signer(page: Page) {
  await page.locator('#r7-pin').fill(PIN)
  await page.getByRole('button', { name: 'Signer avec mon PIN' }).click()
}

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('constat : motif, deux photos dont le déballage, PIN ; le dossier s’ouvre, garde suspendue', async ({ page }) => {
  await ouvrir(page, '#litiges?ref=BLV-00042-1', R)
  await expect(page.getByText(/BLV-00042-1 · en garde/)).toBeVisible()
  const envoyer = page.getByRole('button', { name: 'Envoyer le constat' })
  await expect(envoyer).toBeDisabled()
  await page.getByRole('radio', { name: 'Abîmé' }).click()
  await expect(page.getByRole('radio', { name: 'Abîmé' })).toHaveAttribute('aria-checked', 'true')
  await photo(page, page.getByRole('button', { name: 'Le colis', exact: true }))
  await expect(envoyer).toBeDisabled()
  await photo(page, page.getByRole('button', { name: 'Le déballage', exact: true }))
  await expect(envoyer).toBeEnabled()
  await envoyer.click()
  await page.locator('#r7-pin').fill('111111')
  await page.getByRole('button', { name: 'Signer avec mon PIN' }).click()
  await expect(page.getByText('PIN incorrect. Réessayez.')).toBeVisible()
  await signer(page)
  await expect(page).toHaveURL(/onglet=dossiers/)
  await expect(page.getByText('Constat envoyé : le colis reste chez vous sans frais jusqu’à la décision de BelivaY.')).toBeVisible()
  await expect(page.getByRole('link', { name: /BLV-00042-1/ })).toBeVisible()
})

test('constat : un colis remis s’oriente vers le client ; « Défaut caché » explique sans être un motif', async ({ page }) => {
  await ouvrir(page, '#litiges?ref=BLV-00049-1', R)
  await expect(page.getByText(/le client signale lui-même depuis son application/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Envoyer le constat' })).toBeDisabled()
  await page.getByRole('button', { name: 'Défaut caché' }).click()
  await expect(page.getByText(/Le défaut caché ne se constate pas au comptoir/)).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(3)
})

test('dépôt de retour : non validé refusé ; validé, scellé, photos, PIN ; rangé hors capacité', async ({ page }) => {
  await ouvrir(page, '#litiges?onglet=retour', R)
  const champ = page.getByRole('textbox', { name: 'Numéro du retour' })
  await champ.fill('RT-0421')
  await champ.press('Enter')
  await expect(page.getByText('Retour non validé : ne le prenez pas')).toBeVisible()
  await page.getByRole('button', { name: /RT-0418/ }).click()
  await expect(page.getByText('Motif validé')).toBeVisible()
  const sceller = page.getByRole('button', { name: /Scellé du retour posé/ })
  await expect(sceller).toBeDisabled()
  await page.getByRole('checkbox', { name: 'J’ai posé le scellé du retour sur le colis' }).click()
  await photo(page, sceller)
  await photo(page, page.getByRole('button', { name: /Scellé du retour posé/ }))
  await page.getByRole('button', { name: 'Enregistrer le dépôt' }).click()
  await signer(page)
  await expect(page.getByText(/RT-0418 déposé et scellé\. Rangez-le en/)).toBeVisible()
})

test('dossier : la décision qui met le relais en cause se conteste une fois', async ({ page }) => {
  await ouvrir(page, '#dossier-litige?id=CS-2194', R)
  await expect(page.getByRole('heading', { name: 'Fil du dossier' })).toBeVisible()
  await expect(page.getByText('Retenue proposée')).toBeVisible()
  await page.getByRole('button', { name: 'Contester la décision' }).click()
  await page.getByRole('textbox', { name: 'Pourquoi contestez-vous ?' }).fill('La photo de remise a été prise à 10 h 12.')
  await page.getByRole('button', { name: 'Envoyer la contestation' }).click()
  await expect(page.getByText(/Contestation envoyée\s:\sune autre personne/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Contester la décision' })).toHaveCount(0)
})

test('dossier : la photo demandée par BelivaY se prend depuis le dossier', async ({ page }) => {
  await ouvrir(page, '#dossier-litige?id=CS-2207', R)
  await photo(page, page.getByRole('button', { name: 'Prendre la photo demandée' }))
  await expect(page.getByText(/Photo ajoutée au dossier\s:/)).toBeVisible()
  await expect(page.getByText(/^Répondu le/)).toBeVisible()
})

test('fermeture : la conséquence suit la durée ; un congé trop proche est refusé ; déclaration', async ({ page }) => {
  await ouvrir(page, '#fermeture', R)
  await expect(page.getByText(/chaque client choisit gratuitement un autre relais/)).toBeVisible()
  await page.getByRole('radio', { name: '< 24 h' }).click()
  await expect(page.getByText(/Rien ne bouge\s:\svous gardez les colis/)).toBeVisible()
  await page.getByRole('radio', { name: '> 3 jours' }).click()
  await expect(page.getByText(/masqué du choix des clients/)).toBeVisible()
  // Congé demain : moins de 48 h de préavis.
  await page.getByRole('button', { name: /^mercredi 14 octobre/ }).click()
  await expect(page.getByText(/Un congé se déclare au moins 48\sh avant/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Déclarer la fermeture' })).toBeDisabled()
  await page.getByRole('radio', { name: /Maladie/ }).click()
  await page.getByRole('button', { name: 'Déclarer la fermeture' }).click()
  await page.getByRole('button', { name: 'Confirmer la fermeture' }).click()
  await expect(page.getByText(/Fermeture déclarée\. BelivaY prévient les clients et les livreurs/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Justificatif avant/ }).first()).toBeVisible()
})

test('fermeture : un employé sans le droit du jour ne l’ouvre pas', async ({ page }) => {
  await ouvrir(page, '#fermeture?demo=employe', R)
  await expect(page.getByRole('heading', { name: 'Accès réservé au gérant' })).toBeVisible()
})

test('historique : l’employé ne voit aucun montant et n’exporte pas', async ({ page }) => {
  await ouvrir(page, '#historique?demo=employe', R)
  await expect(page.getByText('MARDI 13 OCTOBRE')).toBeVisible()
  await expect(page.getByText(/F pour le relais|F en espèces/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Exporter la période' })).toHaveCount(0)
  await expect(page.getByText('Montants et export réservés au gérant.')).toBeVisible()
})

test('historique : période, filtres, recherche qui ouvre la fiche, export du gérant', async ({ page }) => {
  await ouvrir(page, '#historique', R)
  await expect(page.getByText(/F pour le relais/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Retours' }).click()
  await expect(page.getByRole('button', { name: 'Retours' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/retour déposé/).first()).toBeVisible()
  await expect(page.getByText(/^BLV-00049-1 remis$/)).toHaveCount(0)
  const telechargement = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter la période' }).click()
  expect((await telechargement).suggestedFilename()).toMatch(/^historique-relais-semaine-.*\.csv$/)
  await page.getByRole('searchbox', { name: 'N° de commande, de colis ou de retour' }).fill('BLV-00049-1')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/colis\?ref=BLV-00049-1/)
})
