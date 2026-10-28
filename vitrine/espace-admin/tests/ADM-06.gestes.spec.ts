// Gestes et règles des écrans ADM-06 (S3) : Revue KYC, Vendeurs, Paliers et Trust Score, Sanctions et recours.
// Chaque geste passe par la source (droits, motif, conflit d'intérêts, pièces ouvertes, quatre yeux d'un AUTRE
// compte) ; les rôles se changent par « ?role= » sur le même appareil (même état de démonstration).
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

test('KYC : « Approuver » inactif tant que chaque pièce n’est pas ouverte (lien court, motif) ; puis approuvé', async ({ page }) => {
  await ouvrir(page, 'kyc?id=KYC-0096', { ...FR, role: 'verification' })
  const approuver = page.getByRole('button', { name: 'Approuver les pièces' })
  await expect(approuver).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByText('0 pièce ouverte sur 3')).toBeVisible()
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Voir la pièce' }).first().click()
    await page.getByLabel('Motif de la consultation (journalisé)').fill('Revue du doublon de CNI entre deux rôles déclarés')
    await page.getByRole('button', { name: 'Ouvrir le lien court' }).click()
  }
  await expect(page.getByText('3 pièces ouvertes sur 3')).toBeVisible()
  await expect(page.getByText(/Doublon autorisé\s: même personne, rôles déclarés/)).toBeVisible()
  await approuver.click()
  await feuille(page).getByRole('button', { name: 'Approuver' }).click()
  await expect(page.getByText(/Pièces approuvées · Boutique Essos Mode/)).toBeVisible()
})

test('KYC : rejet d’un faux document (motif court refusé) → dossier de sanction niveau 4 ; complément suspend l’échéance', async ({ page }) => {
  await ouvrir(page, 'kyc?id=KYC-0094', { ...FR, role: 'verification' })
  await page.getByRole('button', { name: 'Rejeter avec motif' }).click()
  await feuille(page).getByText('Faux document', { exact: true }).click()
  await decider(page, 'Rejeter la pièce', 'trop court')
  await expect(feuille(page).getByRole('alert')).toContainText('au moins 40 caractères')
  await decider(page, 'Rejeter la pièce')
  await expect(page.getByText(/faux document\. Dossier de sanction ouvert/)).toBeVisible()
  await aller(page, 'kyc?id=KYC-0091', 'verification')
  await page.getByRole('button', { name: 'Demander un complément' }).click()
  await decider(page, 'Demander le complément')
  await expect(page.getByText(/Complément demandé\s: l’acteur reçoit le motif/)).toBeVisible()
  await aller(page, 'sanctions', 'mediation')
  await expect(page.locator('.admk-list')).toContainText('Mboa Logistique')
})

test('KYC : conflit d’intérêts (Franck tient Tonton PG) ; le Support lit sans décider', async ({ page }) => {
  await ouvrir(page, 'kyc?id=KYC-0097', { ...FR, role: 'superviseur' })
  await expect(page.getByText('Conflit d’intérêts.').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approuver les pièces' })).toHaveCount(0)
  await aller(page, 'kyc?id=KYC-0091', 'support')
  await expect(page.locator('summary', { hasText: 'Lecture seule' }).first()).toBeVisible()
  await expect(page.getByText(/Votre rôle lit la revue KYC sans décider/)).toBeAttached()
  await expect(page.getByRole('button', { name: 'Rejeter avec motif' })).toHaveCount(0)
  await expect(page.getByText('Votre rôle ne consulte pas les pièces d’identité.').first()).toBeVisible()
})

test('Vendeurs : liste, carte, fiche ; téléphone sur motif ; le Support propose une sanction ; Opérations : sa zone', async ({ page }) => {
  await ouvrir(page, 'vendeurs', { ...FR, role: 'support' })
  await expect(page.getByRole('table')).toContainText('Tonton PG')
  await page.getByRole('link', { name: 'Carte des boutiques' }).click()
  await expect(page.getByRole('group', { name: 'Carte des boutiques' })).toBeVisible()
  await page.getByRole('link', { name: /Maman Wax Mokolo, Ouvert : ouvrir la fiche/ }).click()
  await expect(page.getByRole('heading', { name: 'Maman Wax Mokolo' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Démasquer' }).click()
  await page.getByLabel('Motif du démasquage (journalisé)').fill('Le vendeur demande un rappel au sujet du litige LT-0418')
  await page.getByRole('button', { name: 'Démasquer' }).last().click()
  await expect(page.getByText('Démasqué, journalisé')).toBeVisible()
  await page.getByRole('button', { name: 'Proposer une sanction' }).click()
  await decider(page, 'Proposer')
  await expect(page.getByText(/Sanction proposée\s: le dossier attend la décision/)).toBeVisible()
  await aller(page, 'vendeurs', 'operations')
  await expect(page.getByRole('table')).toContainText('Techno Bastos')
  await expect(page.getByRole('table')).not.toContainText('Tonton PG')
})

test('Vendeurs : Franck voit la fiche de sa boutique sans pouvoir proposer de sanction', async ({ page }) => {
  await ouvrir(page, 'vendeurs?id=v-tontonpg', { ...FR, role: 'superviseur' })
  await expect(page.getByText('Conflit d’intérêts.').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Proposer une sanction' })).toHaveCount(0)
})

test('Paliers : descente confirmée avec motif et événements cités ; contestation décidée par une autre personne', async ({ page }) => {
  await ouvrir(page, 'paliers?id=PT-0014', { ...FR, role: 'superviseur' })
  await expect(page.getByText('Visible avant la décision')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmer la descente' }).click()
  await decider(page, 'Confirmer la descente', 'court')
  await expect(feuille(page).getByRole('alert')).toBeVisible()
  await decider(page, 'Confirmer la descente')
  await expect(page.getByText(/Descente confirmée\s: Kevin D\. est prévenu/)).toBeVisible()
  await aller(page, 'paliers?id=PT-0013', 'mediation')
  await page.getByRole('button', { name: 'Décider le recours' }).click()
  await decider(page, 'Enregistrer la décision du recours')
  await expect(feuille(page).getByRole('alert')).toContainText('le recours revient à une autre personne')
  await aller(page, 'paliers?id=PT-0013', 'audit')
  await expect(page.locator('summary', { hasText: 'Lecture seule' }).first()).toBeVisible()
  await expect(page.getByText(/Lecture seule\s: la Direction et la Médiation décident des paliers\./)).toBeAttached()
})

test('Sanctions : exclusion à quatre yeux (Médiation puis Direction, deux comptes) ; le Support ne décide pas', async ({ page }) => {
  await ouvrir(page, 'sanctions?id=SN-0018', { ...FR, role: 'mediation' })
  await expect(page.getByText('Liste noire proposée')).toBeVisible()
  await page.getByRole('button', { name: 'Valider le niveau 4' }).click()
  await decider(page, 'Envoyer au second validateur')
  await expect(page.getByText(/l’exclusion attend le second validateur/)).toBeVisible()
  await expect(page.getByText(/Vous avez fait la première validation\s: un autre compte doit contresigner\./)).toBeVisible()
  await aller(page, 'sanctions?id=SN-0018', 'superviseur')
  await page.getByLabel('Votre motif (journalisé)').fill(MOTIF)
  await page.getByRole('button', { name: 'Contresigner' }).click()
  await page.reload()
  await expect(page.getByText('Liste noire active')).toBeVisible()
  await aller(page, 'sanctions?id=SN-0021', 'support')
  await expect(page.locator('summary', { hasText: 'Lecture seule' }).first()).toBeVisible()
  await expect(page.getByText(/Le Support propose\s; la Médiation et la Direction décident/)).toBeAttached()
  await expect(page.getByRole('button', { name: 'Valider le niveau 2' })).toHaveCount(0)
})

test('Sanctions : recours décidé par une autre personne que l’auteur ; niveau réduit', async ({ page }) => {
  await ouvrir(page, 'sanctions?id=SN-0017', { ...FR, role: 'superviseur' })
  await page.getByRole('button', { name: 'Décider le recours' }).click()
  await decider(page, 'Enregistrer la décision du recours')
  await expect(feuille(page).getByRole('alert')).toContainText('le recours revient à une autre personne')
  await aller(page, 'sanctions?id=SN-0017', 'mediation')
  await page.getByRole('button', { name: 'Décider le recours' }).click()
  await decider(page, 'Enregistrer la décision du recours')
  await expect(page.getByText('Décision du recours enregistrée et envoyée à l’acteur.')).toBeVisible()
})

test('pont : une demande d’activation reçue devient un dossier KYC à revoir ; fonctions d’abord', async ({ page }) => {
  await ouvrir(page, 'kyc', { ...FR, role: 'verification' })
  await page.evaluate(() => localStorage.setItem('blv_pont', JSON.stringify([{ type: 'account.requested', espace: 'entreprise', acteur: 'ent-yafe', dossier: 'KYC-P-002', pieces: 3, cle: 'ar2', app: 'entreprise', le: Date.now() }])))
  await page.reload()
  await expect(page.locator('.a-travail').getByRole('button', { name: /Valider/ })).toBeVisible()
  await expect(page.locator('a[href*="id=KYC-P-002"]:visible').first()).toBeVisible()
  await expect(page.locator('a[href*="id=KYC-P-002"]:visible').first()).toContainText('Yafé Express')
})
