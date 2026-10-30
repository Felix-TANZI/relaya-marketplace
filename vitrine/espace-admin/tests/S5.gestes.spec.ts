// Gestes et règles des écrans S5 (Paramétrage, Promotions, Messagerie, Panne, Support, Interrupteurs, Modèles), à
// l'écran, rôle par rôle (?role=) : double contrôle par un autre compte, motif, contenu interdit, parties réservées.
import { expect, test, type Page } from '@playwright/test'
import { FR, figerHorloge, ouvrir } from './commun'

const MOTIF = 'Motif assez long pour une décision, écrit, cité et journalisé.'
const feuille = (page: Page) => page.getByRole('dialog')
async function motiver(page: Page, bouton: RegExp) {
  await feuille(page).locator('textarea').fill(MOTIF)
  await feuille(page).getByRole('button', { name: bouton }).click()
  await expect(feuille(page)).toBeHidden()
}
test.beforeEach(async ({ page }) => figerHorloge(page))

test('paramétrage : 800 F au relais bloque ; la Finance contresigne la proposition du jeu d’essai, la version est annoncée', async ({ page }) => {
  await ouvrir(page, 'parametrage?s=simulation&code=LIV-RELAIS-BASE', FR)
  await page.getByRole('spinbutton').fill('800')
  await page.getByPlaceholder('DP-68').fill('DP-68')
  await page.locator('.s5-champ textarea, .fld textarea').first().fill(MOTIF)
  await page.getByRole('button', { name: /Simuler sur 30 jours/ }).click()
  await expect(page.getByText(/Validation bloquée\s:\s\d contrôle/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Soumettre à quatre yeux/ })).toBeDisabled()
  await page.goto('parametrage?s=quatre-yeux')
  await expect(page.getByText('Vous ne pouvez pas valider votre propre demande', { exact: false })).toBeVisible()
  await page.goto('parametrage?s=quatre-yeux&role=finance')
  const carte = page.locator('.e-qy').filter({ hasText: 'REMB-CONTROLE-SEUIL' })
  await carte.locator('textarea').fill(MOTIF)
  await carte.getByRole('button', { name: 'Contresigner' }).click()
  await page.goto('parametrage?s=applique&role=finance')
  await expect(page.getByText('REMB-CONTROLE-SEUIL · v2')).toBeVisible()
})

test('promotions : le Support arrête une vente flash avec un motif ; la Finance n’ouvre pas la page', async ({ page }) => {
  await ouvrir(page, 'promotions?s=flash&id=FL-0021', { ...FR, role: 'support' })
  await page.getByRole('button', { name: 'Arrêter maintenant' }).click()
  await motiver(page, /Arrêter maintenant/)
  await expect(page.getByText('Arrêtée', { exact: true }).first()).toBeVisible()
  await page.goto('promotions?role=finance')
  await expect(page.getByText('Réservé à d’autres rôles')).toBeVisible()
})

test('messagerie : renvoyer l’échec critique (même clé) ; la Finance ne voit que le budget', async ({ page }) => {
  await ouvrir(page, 'messagerie?s=echec&id=EV-0412', { ...FR, role: 'support' })
  await page.getByRole('button', { name: 'Renvoyer maintenant' }).click()
  await expect(page.getByText(/Renvoyé avec la même clé/)).toBeVisible()
  await page.goto('messagerie?role=finance')
  await expect(page.getByRole('heading', { name: 'Messagerie et notifications' })).toBeVisible()
  await expect(page.getByText('Journal des envois')).toHaveCount(0)
  await expect(page.getByText('Clé d’idempotence')).toHaveCount(0)
})

test('panne : retour du service, registre à ressaisir, rapport, clôture (Opérations, sa zone)', async ({ page }) => {
  await ouvrir(page, 'panne', { ...FR, role: 'operations' })
  await page.getByRole('button', { name: 'Déclarer le retour du service' }).click()
  await expect(page.getByRole('button', { name: 'Clore l’incident' })).toBeDisabled()
  await page.getByRole('button', { name: 'Relancer le gérant' }).click()
  for (const t of await page.locator('.fld textarea').all()) await t.fill(MOTIF)
  await page.getByRole('button', { name: 'Enregistrer le rapport' }).click()
  await page.getByRole('button', { name: 'Clore l’incident' }).click()
  await expect(page.getByText('Aucun incident en cours')).toBeVisible()
})

test('support : rattacher, répondre ; un numéro est refusé ; la Direction lit sans répondre', async ({ page }) => {
  await ouvrir(page, 'support?id=SP-0207', { ...FR, role: 'support' })
  await expect(page.getByRole('button', { name: 'Envoyer la réponse' })).toBeDisabled()
  await page.getByRole('button', { name: /Rattacher à BLV-00008/ }).click()
  const brouillon = page.locator('.s5-champ textarea')
  await brouillon.fill('Appelle le 699 31 03 88')
  await expect(page.getByText(/contient un numéro de téléphone/).first()).toBeVisible()
  await brouillon.fill('Ton colis est en route ; ton code arrive à son arrivée au relais.')
  await page.getByRole('button', { name: 'Envoyer la réponse' }).click()
  await expect(page.getByText('Réponse envoyée dans le canal de la demande.')).toBeVisible()
  await page.goto('support?id=SP-0208&role=superviseur')
  await expect(page.getByText(/Répondre aux demandes\s:\sréservé à Support client/)).toBeVisible()
})

test('interrupteurs : une bascule part à quatre yeux ; l’Audit lit seulement', async ({ page }) => {
  await ouvrir(page, 'interrupteurs', FR)
  await expect(page.locator('.dk-banner', { hasText: 'DP-50' })).toBeVisible()
  await page.getByRole('switch', { name: /FF-FLASH/ }).click()
  await motiver(page, /Envoyer au second validateur/)
  await expect(page.getByText('fermeture demandée', { exact: false }).first()).toBeVisible()
  await page.goto('interrupteurs?role=audit')
  await expect(page.getByText('réservé à Direction', { exact: false }).first()).toBeVisible()
})

test('modèles : {code} interdit hors du code de retrait ; une version publiée', async ({ page }) => {
  await ouvrir(page, 'modeles?id=MERCI', { ...FR, role: 'support' })
  const fr = page.locator('.s5-champ textarea').first()
  await fr.fill('Merci, ton code est {code}')
  await expect(page.getByText(/n’existe que dans le modèle du code de retrait/).first()).toBeVisible()
  await fr.fill('BelivaY : merci ! Ta commande {ref} est bien confirmée.')
  await page.locator('.fld textarea').last().fill(MOTIF)
  await page.getByRole('button', { name: /Publier la version v2/ }).click()
  await expect(page.getByText(/Version v2 publiée\s:/)).toBeVisible()
})

test('fonctions d’abord : paramétrage (valider, proposer, simuler, annoncer) ; aucun nom de prestataire au registre affiché', async ({ page }) => {
  await ouvrir(page, 'parametrage', FR)
  const f = page.getByRole('navigation', { name: 'Fonctions de la page' })
  await expect(f.getByRole('link', { name: /^Valider/ })).toBeVisible()
  await expect(f.getByRole('link', { name: /^Proposer/ })).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/CamPay|Fapshi|CinetPay|Flutterwave/)
})
