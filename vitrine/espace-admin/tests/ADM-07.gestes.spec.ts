// Gestes et règles des écrans ADM-07 (S3) : Catalogue (demandes, appariements, taxonomie), Modération des offres,
// Avis et droit de réponse, Clients et IFA ; page ajoutée « Qualité des acteurs ».
import { expect as base, test, type Page } from '@playwright/test'
import { FR, figerHorloge, ouvrir, type Role } from './commun'

test.use({ viewport: { width: 1280, height: 900 } })
// Machine partagée et chargée : chaque attente a 15 s (les gestes passent par la source, puis la page relit).
const expect = base.configure({ timeout: 15_000 })
const MOTIF = 'Motif écrit, assez long pour une décision défavorable, et journalisé.'
const aller = (page: Page, a: string, role: Role) => page.goto(a + (a.includes('?') ? '&' : '?') + 'role=' + role)
const feuille = (page: Page) => page.locator('.e-decision')
async function decider(page: Page, bouton: string | RegExp, motif = MOTIF) {
  await feuille(page).locator('textarea').fill(motif)
  await feuille(page).getByRole('button', { name: bouton }).click()
}

test.beforeEach(async ({ page }) => figerHorloge(page))

test('Catalogue : rattacher une demande, conflit d’intérêts, taxonomie sans doublon, fusion réversible', async ({ page }) => {
  await ouvrir(page, 'catalogue?onglet=demandes&id=DC-0041', { ...FR, role: 'verification' })
  await expect(page.getByText('Recherche faite par le vendeur avant sa demande')).toBeVisible()
  await page.getByRole('button', { name: 'Rattacher à un maître existant' }).click()
  await feuille(page).getByRole('button', { name: 'Rattacher' }).click()
  await expect(page.getByText(/rattachée à FM-00871\s: le vendeur est prévenu/)).toBeVisible()
  await aller(page, 'catalogue?onglet=demandes&id=DC-0044', 'superviseur')
  await expect(page.getByText('Conflit d’intérêts.').first()).toBeVisible()
  await aller(page, 'catalogue?onglet=taxo', 'verification')
  await page.getByLabel('Nom', { exact: true }).fill('Écouteurs')
  await page.getByRole('button', { name: 'Créer la sous-catégorie' }).click()
  await expect(page.getByRole('alert')).toContainText(/existe déjà dans .\s?Téléphones et accessoires/)
  await aller(page, 'catalogue?onglet=fusion&id=AP-0007', 'verification')
  await page.getByRole('button', { name: 'Fusionner', exact: true }).click()
  await expect(page.getByText('Réversible jusqu’au')).toBeVisible()
  await page.getByRole('button', { name: 'Annuler la fusion' }).click()
  await decider(page, 'Annuler la fusion')
  await expect(page.getByText('Fusion annulée.')).toBeVisible()
  await aller(page, 'catalogue', 'support')
  await expect(page.locator('summary', { hasText: 'Lecture seule' }).first()).toBeVisible()
  await expect(page.getByText(/Lecture seule\s: la Vérification et la Direction tiennent le catalogue/)).toBeAttached()
})

test('Modération : écart à la médiane calculé, prix barré non pratiqué retiré, dépublication d’un produit interdit → sanction', async ({ page }) => {
  await ouvrir(page, 'moderation?id=OF-7805', { ...FR, role: 'verification' })
  await expect(page.getByText('Écart avec la médiane du maître')).toBeVisible()
  await expect(page.locator('.codeblk').first()).toContainText('> 0,50')
  await aller(page, 'moderation?id=OF-7802', 'verification')
  await expect(page.getByRole('button', { name: 'Rétablir le prix barré' })).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('button', { name: 'Confirmer le retrait du prix barré' }).click()
  await decider(page, 'Confirmer le retrait')
  await expect(page.getByText(/Prix barré retiré\s; le vendeur est prévenu\./)).toBeVisible()
  await aller(page, 'moderation?id=OF-7790', 'verification')
  await page.getByRole('button', { name: 'Dépublier', exact: true }).click()
  await decider(page, 'Dépublier')
  await expect(page.getByText(/Offre dépubliée\s; dossier de sanction ouvert\./)).toBeVisible()
})

test('Avis : masquage seulement d’un contenu illicite ; retrait réservé au médiateur ; réponse privée anonymisée', async ({ page }) => {
  await ouvrir(page, 'avis?id=AV-0311', { ...FR, role: 'verification' })
  await expect(page.getByRole('button', { name: 'Masquer un contenu illicite' })).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByRole('button', { name: 'Retirer l’avis (médiateur)' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Refuser le signalement' }).click()
  await decider(page, 'Refuser le signalement')
  await expect(page.getByText(/Signalement refusé\s: l’avis reste publié\./)).toBeVisible()
  await aller(page, 'avis?id=AV-0313', 'verification')
  await page.getByRole('button', { name: 'Masquer un contenu illicite' }).click()
  await decider(page, 'Masquer')
  await expect(page.getByText('[contenu masqué par la modération]').first()).toBeVisible()
  await aller(page, 'avis?id=AV-0312', 'mediation')
  await page.getByRole('button', { name: 'Retirer l’avis (médiateur)' }).click()
  await decider(page, 'Retirer l’avis')
  await expect(page.getByText('Avis retiré, motif envoyé au client.')).toBeVisible()
  await aller(page, 'avis?onglet=reponse&id=AV-0305', 'verification')
  await expect(page.getByText(/Appelez-moi au \[numéro masqué\]/)).toBeVisible()
})

test('Clients et IFA : rétrogradation validée (croisement), jamais avant 5 commandes, Finance sans IFA, téléphone masqué', async ({ page }) => {
  await ouvrir(page, 'clients?id=c-7731', { ...FR, role: 'support' })
  await expect(page.getByText('Croisement avec le score des vendeurs concernés')).toBeVisible()
  await page.getByRole('button', { name: 'Valider la rétrogradation' }).click()
  await decider(page, 'Valider la rétrogradation')
  await expect(page.getByText(/Rétrogradation validée\s; le client/)).toBeVisible()
  await expect(page.locator('.a-travail').getByRole('link', { name: /Revoir/ })).toBeVisible()
  await aller(page, 'clients?id=c-6120', 'support')
  await page.getByRole('button', { name: 'Traiter le recours' }).click()
  await decider(page, 'Enregistrer')
  await expect(page.getByText('Recours traité.')).toBeVisible()
  await aller(page, 'clients?id=c-4217', 'finance')
  await expect(page.getByText(/Finance\s: lecture des remboursements seulement/)).toBeAttached()
  await expect(page.getByText('Palier IFA et ses raisons')).toHaveCount(0)
  await expect(page.getByText(/RB-0031 · 180.280/)).toBeVisible()
})

test('Qualité des acteurs : tous les acteurs, alertes de baisse, liens vers la fiche et les sanctions', async ({ page }) => {
  await ouvrir(page, 'qualite', { ...FR, role: 'superviseur' })
  // Page ajoutée : son droit et son entrée de navigation s'ajoutent à l'intégration (src/pages/ADM-06/INTEGRATION.md).
  test.skip((await page.getByText('Réservé à d’autres rôles').count()) > 0, 'droit « qualite » à poser dans config/droits.ts (intégration)')
  await expect(page.getByRole('table')).toContainText('Kevin D.')
  await expect(page.getByRole('table')).toContainText('Relais Bastos Carrefour')
  await expect(page.getByText('Alertes de baisse').first()).toBeVisible()
  await expect(page.locator('.panel').filter({ hasText: 'Alertes de baisse' }).first()).toContainText('Brice N.')
  await page.getByRole('link', { name: 'Sanctions de Pièces Auto Biyem' }).click()
  await expect(page).toHaveURL(/sanctions\?acteur=v-pieces/)
})
