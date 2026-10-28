// Gestes et règles des écrans d'argent (groupe S2) : escrow et Wallet, remboursements (et automatiques), versements du
// vendredi, rapprochement, commissions, export comptable — chaque rôle concerné par « ?role= », quatre yeux par un
// AUTRE compte, Finance sans contenu de litige, Support sans versements, Opérations limitées à leurs zones.
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir, type Role } from './commun'

const MOTIF = 'Motif écrit et journalisé, assez long pour une décision sur l’argent.'
const aller = (page: Page, a: string, role: Role) => page.goto(a + (a.includes('?') ? '&' : '?') + 'role=' + role)
async function decider(page: Page, bouton: RegExp) {
  const f = page.locator('.e-decision')
  await f.locator('textarea').fill(MOTIF)
  await f.getByRole('button', { name: bouton }).click()
  await expect(f).toHaveCount(0)
}

test.beforeEach(async ({ page }) => figerHorloge(page))

test('escrow : registre équilibré, gel motivé, libération anticipée à quatre yeux', async ({ page }) => {
  await ouvrir(page, 'escrow', { ...FR, role: 'finance' })
  await expect(page.getByText(/Escrow détenu chez l’agrégateur/)).toBeVisible()
  await expect(page.locator('.admA-led')).toContainText('Σ débits = Σ crédits')
  // Gelé par un litige : la Finance voit la référence, jamais le contenu ni le lien.
  await page.getByRole('button', { name: /^Gelé/ }).click()
  await expect(page.getByText('BLV-51877').first()).toBeVisible()
  await expect(page.getByText(/la Finance ne voit que la référence/)).toBeVisible()
  await expect(page.locator('a[href*="/admin/litige"]')).toHaveCount(0)
  // Gel conservatoire de BLV-00008.
  await page.getByRole('button', { name: /^Bloqué/ }).click()
  await page.getByRole('button', { name: /Voir le registre de BLV-00008/ }).click()
  await page.getByRole('button', { name: 'Geler', exact: true }).click()
  await decider(page, /Geler/)
  await page.getByRole('button', { name: /^Gelé/ }).click()
  await expect(page.getByText('BLV-00008').first()).toBeVisible()
  // Libération anticipée de BLV-00009 : en attente du second validateur.
  await page.getByRole('button', { name: /^Bloqué/ }).click()
  await page.getByRole('button', { name: /Voir le registre de BLV-00009/ }).click()
  await page.getByRole('button', { name: 'Libérer', exact: true }).click()
  await decider(page, /second validateur/)
  await expect(page.getByText(/Libération anticipée · QY-/)).toBeVisible()
})

test('escrow : Opérations en lecture, ses zones seulement ; Wallet fermé aux Opérations', async ({ page }) => {
  await ouvrir(page, 'escrow', { ...FR, role: 'operations' })
  await expect(page.getByText(/Votre périmètre\s*:\s*Z1, Z2, Z3, Z6/)).toBeVisible()
  await expect(page.getByText('BLV-52107')).toHaveCount(0) // Z9
  await expect(page.getByRole('button', { name: 'Geler', exact: true })).toBeDisabled()
  await aller(page, 'wallet', 'operations')
  await expect(page.getByText('Réservé à d’autres rôles')).toBeVisible()
})

test('Wallet : plafond, simulateur de retrait, gel des retraits à quatre yeux', async ({ page }) => {
  await ouvrir(page, 'wallet', { ...FR, role: 'finance' })
  await expect(page.getByRole('heading', { name: 'Suivi du Wallet' }).first()).toBeVisible()
  await expect(page.getByText(/Plafond [\d\s ]+F par compte/) /* WALLET-PLAFOND du registre (écart v6 noté : A-VALIDER § 4) */).toBeVisible()
  await page.getByLabel('Montant demandé (F)').fill('500')
  await expect(page.getByText(/Refusé\s*:\s*1\s000\sF au moins/)).toBeVisible()
  await page.getByRole('row', { name: /WL-0011/ }).getByRole('button', { name: 'Geler les retraits' }).click()
  await decider(page, /second validateur/)
  await expect(page.getByText(/Gel à contresigner · QY-/)).toBeVisible()
})

test('remboursements : exécution sous le seuil, statut de l’opérateur, quatre yeux au-delà', async ({ page }) => {
  await ouvrir(page, 'remboursements?id=RB-0034', { ...FR, role: 'finance' })
  await page.getByRole('button', { name: /Exécuter vers/ }).click()
  await expect(page.getByText('En cours · opérateur').first()).toBeVisible()
  await page.getByRole('button', { name: 'Relever le statut de l’opérateur' }).click()
  await expect(page.getByText('Remboursé').first()).toBeVisible()
  // RB-0031 (180 280 F + frais rendus) : premier validateur Support, la Finance contresigne.
  await aller(page, 'remboursements?id=RB-0031', 'finance')
  await page.locator('.e-qy textarea').fill(MOTIF)
  await page.locator('.e-qy').getByRole('button', { name: 'Contresigner' }).click()
  await expect(page.getByText('En cours · opérateur').first()).toBeVisible()
})

test('remboursements : moyen fermé → autre numéro du même titulaire, jamais le même compte en second', async ({ page }) => {
  await ouvrir(page, 'remboursements?id=RB-0030', { ...FR, role: 'support' })
  await page.getByRole('button', { name: 'Proposer l’autre numéro du même titulaire' }).click()
  await decider(page, /second validateur/)
  await aller(page, 'remboursements?id=RB-0030', 'finance')
  await page.locator('.e-qy textarea').fill(MOTIF)
  await page.locator('.e-qy').getByRole('button', { name: 'Contresigner' }).click()
  await expect(page.getByText(/MTN ···· 64/).first()).toBeVisible()
})

test('remboursements automatiques : plafond mensuel, doute → retour normal', async ({ page }) => {
  await ouvrir(page, 'remb-auto', { ...FR, role: 'finance' })
  await expect(page.getByText(/sur 150\s000\sF de plafond global/)).toBeVisible()
  await page.getByRole('row', { name: /RA-0015/ }).getByRole('button', { name: 'Retour normal' }).click()
  await decider(page, /Décider/)
  await expect(page.getByRole('row', { name: /RA-0015/ })).toContainText('Retour normal')
})

test('versements : lot au-delà du seuil contrôlé à quatre yeux (Finance puis Direction), plan d’apurement du relais', async ({ page }) => {
  await ouvrir(page, 'versements', { ...FR, role: 'finance' })
  await expect(page.getByText(/Prochain versement ·/)).toBeVisible()
  await page.getByRole('button', { name: 'Demander le contrôle' }).click()
  await decider(page, /second validateur/)
  await page.getByRole('button', { name: 'Valider un plan d’apurement' }).click()
  await decider(page, /Valider le plan/)
  await expect(page.getByText(/Plan d’apurement validé/).first()).toBeVisible()
  await aller(page, 'versements', 'superviseur')
  await page.locator('.e-qy textarea').first().fill(MOTIF)
  await page.locator('.e-qy').first().getByRole('button', { name: 'Contresigner' }).click()
  await expect(page.getByText(/Techno Bastos · .*Contrôlé/).first()).toBeVisible()
})

test('versements : jamais au Support', async ({ page }) => {
  await ouvrir(page, 'versements', { ...FR, role: 'support' })
  await expect(page.getByText('Réservé à d’autres rôles')).toBeVisible()
})

test('rapprochement : écart, import du relevé, clôture transmise', async ({ page }) => {
  await ouvrir(page, 'rapprochement?s=jour', { ...FR, role: 'finance' })
  await expect(page.getByText(/Origine probable · 186\sF/)).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({ name: 'releve.csv', mimeType: 'text/csv', buffer: Buffer.from('reference;montant;statut\r\nBLV-52261;9588;SUCCESSFUL\r\nBLV-52255;9999;SUCCESSFUL\r\n') })
  await expect(page.getByText(/2 lignes lues, 1 écart/)).toBeVisible()
  await page.getByRole('button', { name: /Mois de/ }).click()
  await page.getByRole('button', { name: 'Transmettre au comptable' }).click()
  await expect(page.getByText(/Transmis .* par Nadège Eyenga/)).toBeVisible()
})

test('commissions : grille V02 sur tout le prix, simulateur, plancher', async ({ page }) => {
  await ouvrir(page, 'commissions', { ...FR, role: 'finance' })
  await expect(page.getByText('Grille v3 en vigueur · taux par catégorie et palier, sur tout le prix')).toBeVisible()
  await page.getByLabel('Prix payé (F)').fill('3000')
  await expect(page.getByText(/700\sF · plancher/)).toBeVisible()
  await page.getByRole('button', { name: /Relevés/ }).click()
  await expect(page.getByText('Facture des commissions · aperçu')).toBeVisible()
})

test('export comptable : Audit exporte et vérifie ; Support n’y a pas accès', async ({ page }) => {
  await ouvrir(page, 'export', { ...FR, role: 'audit' })
  await expect(page.getByText(/Σ débits = Σ crédits/).first()).toBeVisible()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter (CSV signé)' }).click()
  const f = await dl
  const chemin = await f.path()
  await page.locator('input[type=file]').setInputFiles(chemin!)
  await expect(page.getByText(/Intact\s*:\s*empreinte/)).toBeVisible()
  await aller(page, 'export', 'support')
  await expect(page.getByText('Réservé à d’autres rôles')).toBeVisible()
})

test('versements (R43) : 1 % retenu à chaque bénéficiaire, relais et entreprises compris ; fonctions d’abord', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('versements'), { ...FR, role: 'finance' })
  await expect(page.locator('.a-travail').getByRole('button', { name: /Contrôler 1 lot/ })).toBeVisible()
  await expect(page.getByText('1 % Mobile Money retenu à chaque bénéficiaire', { exact: true })).toBeVisible()
  await expect(page.getByText(/sans frais/)).toHaveCount(0)
  const ligne = page.locator('table.dt tbody tr', { hasText: 'Yafé Express' })
  await expect(ligne).toContainText('retenus')
})
