// Gestes et règles d'ADM-04 : dossier de litige (aucune décision tant que le vendeur peut répondre ; niveau 1 au Support,
// niveau 2 et recours à la Médiation ; motif écrit ; au-delà du seuil, quatre yeux d'un autre compte ; remboursement au
// moyen d'origine ; la carte quitte la File d'action une fois décidée), commandes et fiche (filtres, téléphone démasqué
// sur motif et journalisé, Finance sans chronologie, annulation motivée avant le code de remise).
import { expect, test } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

test.use({ viewport: { width: 1440, height: 900 } })

const MOTIF = 'Scellé intact de C1 à C3 : la photo C1 montre le produit remis, conforme à la commande.'

/** Choisit le motif, écrit la note et décide (poste de travail). */
async function decider(page: import('@playwright/test').Page, motif = 'Preuves concordantes') {
  await page.getByRole('radio', { name: motif }).click()
  await page.locator('.po-note textarea').first().fill(MOTIF)
  await page.locator('.po-decider').click()
}

test('litige ouvert : le vendeur peut répondre, aucune décision possible', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('litige', 'id=LT-0418'), { ...FR, role: 'support' })
  await expect(page.getByText('Le vendeur peut encore répondre').first()).toBeVisible()
  await expect(page.getByRole('radio', { name: /Rembourser · charge à l’entreprise/ })).toBeDisabled()
  await expect(page.locator('.po-decider')).toBeDisabled()
})

test('niveau 1 : le Support tranche avec motif ; la carte quitte la file ; le niveau 2 lui est fermé', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('litige', 'id=LT-0412'), { ...FR, role: 'support' })
  await expect(page.getByRole('radio', { name: /Rembourser · charge au vendeur/ })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('.po-decider')).toBeDisabled()
  await decider(page)
  await expect(page.getByText('Suites envoyées aux espaces')).toBeVisible()
  await ouvrir(page, adresse('file'), { ...FR, role: 'support' })
  await expect(page.locator('button.admA-q', { hasText: 'LT-0412' })).toHaveCount(0)
  await ouvrir(page, adresse('litige', 'id=LT-0405'), { ...FR, role: 'support' })
  await expect(page.getByText('Dossier hors de votre périmètre')).toBeVisible()
})

test('recours : la Médiation décide ; au-delà du seuil, la Finance contresigne et la décision s’applique', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('litige', 'id=LT-0405'), { ...FR, role: 'mediation' })
  await expect(page.getByRole('radio', { name: /Charge au vendeur \(recours rejeté\)/ })).toBeDisabled()
  await expect(page.getByRole('radio', { name: /Charge au relais/ })).toHaveAttribute('aria-checked', 'true')
  await decider(page)
  await expect(page.getByText(/attend un second validateur d’un autre compte \(QY-/)).toBeVisible()
  await ouvrir(page, adresse('quatreyeux'), { ...FR, role: 'finance' })
  const carte = page.locator('.e-qy', { hasText: 'LT-0405' })
  await carte.locator('textarea').fill('Preuve de remise absente relue : la charge revient au relais.')
  await carte.getByRole('button', { name: 'Contresigner' }).click()
  await ouvrir(page, adresse('litige', 'id=LT-0405&role=superviseur'), FR)
  await expect(page.getByText('Contresignée')).toBeVisible()
  await expect(page.locator('.admA-eff')).toContainText('charge au relais')
})

test('la Finance n’ouvre pas le contenu des litiges', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('litige', 'id=LT-0412'), { ...FR, role: 'finance' })
  await expect(page.getByText(/Réservé à/).first()).toBeVisible()
  await expect(page.locator('.po')).toHaveCount(0)
})

test('commandes : filtre par indicateur, fiche, téléphone démasqué sur motif (Support), Finance sans chronologie', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('commandes'), FR)
  await expect(page.locator('.a-travail')).toContainText('Relancer')
  await page.locator('.a-segs').getByRole('button', { name: /Gelées/ }).click()
  await expect(page.locator('table.dt tbody tr')).toHaveCount(2)
  await ouvrir(page, adresse('commandes', 'ref=BLV-00008'), { ...FR, role: 'support' })
  await expect(page.getByText('Chronologie complète')).toBeVisible()
  await expect(page.getByText('Pas encore envoyé')).toBeVisible()
  await page.getByRole('button', { name: 'Démasquer' }).click()
  await page.getByLabel('Motif du démasquage (journalisé)').fill('Le client dit ne pas avoir reçu son code de retrait (SP-0207).')
  await page.locator('.e-masque-f').getByRole('button', { name: 'Démasquer' }).click()
  await expect(page.getByText('+237699310388')).toBeVisible()
  await ouvrir(page, adresse('commandes', 'ref=BLV-00008'), { ...FR, role: 'finance' })
  await expect(page.getByText('Chronologie complète')).toHaveCount(0)
  await expect(page.getByText('Commission figée au paiement')).toBeVisible()
})

test('annuler une commande payée : motif, remboursement au moyen d’origine ; plus possible après le code de remise', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('commandes', 'ref=BLV-52245'), FR)
  await page.getByRole('button', { name: 'Annuler la commande' }).click()
  const ok = page.getByRole('button', { name: 'Annuler et rembourser' })
  await expect(ok).toBeDisabled()
  await page.locator('.panel textarea').fill('Rupture confirmée par le vendeur avant la préparation ; client prévenu.')
  await ok.click()
  await expect(page.getByText('Commande annulée ; remboursement intégral')).toBeVisible()
  await ouvrir(page, adresse('commandes', 'ref=BLV-00008'), FR)
  await expect(page.getByRole('button', { name: 'Annuler la commande' })).toHaveCount(0)
  await expect(page.getByText(/ne s’annule plus/)).toBeVisible()
})

test('fonctions d’abord : le Support arbitre ses litiges, sans phrase d’explication', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('litige'), { ...FR, role: 'support' })
  const f = page.locator('.a-travail')
  await expect(f.getByRole('button', { name: /^Décider \d+ dossiers/ })).toBeVisible()
  await expect(page.locator('.pg-s')).toHaveCount(0)
  await ouvrir(page, adresse('litige'), { ...FR, role: 'audit' })
  await expect(page.locator('.a-travail').getByRole('button', { name: /^Décider/ })).toHaveCount(0)
})

test('pont : le litige ouvert par le client et contesté par le vendeur arrive à arbitrer ; la commande payée est du jour', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('commandes'), { ...FR, role: 'support' })
  await page.evaluate(() => {
    const le = Date.now()
    const colis = [{ colis: 'BLV-60001-1', boutique: 'Boutique B', classe: 'M', lignes: [{ produit: 'fer', titre: 'Défroisseur vapeur', variante: null, prix: 65000, qte: 1, categorie: null, photo: null }] }]
    localStorage.setItem('blv_pont', JSON.stringify([
      { type: 'order.paid', commande: 'BLV-60001', mode: 'relais', lieu: 'Relais Bastos', relais: 'rel-z1-001', zone: 'Z1', payableAuRetrait: false, delaiH: 4, colis, livraisonOfferte: 0, cle: 'op1', app: 'client', le: le - 3600_000 },
      { type: 'claim.opened', commande: 'BLV-60001', colis: 'BLV-60001-1', dossier: 'LT-P-001', motif: 'Ne chauffe pas', souhait: 'rembourse', photos: 2, cle: 'co1', app: 'client', le: le - 1800_000 },
      { type: 'claim.answered', commande: 'BLV-60001', colis: 'BLV-60001-1', dossier: 'LT-P-001', posture: 'conteste', retour: null, cle: 'ca1', app: 'vendeur', le: le - 600_000 },
    ]))
  })
  await page.reload()
  await page.locator('.a-segs').getByRole('button', { name: /Aujourd’hui/ }).click()
  await expect(page.getByText('BLV-60001')).toBeVisible()
  await ouvrir(page, adresse('litige', 'id=LT-P-001'), { ...FR, role: 'support' })
  // Preuves du pont incomplètes : la règle ne tranche pas ; l'agent corrige les lignes douteuses en un geste.
  await expect(page.getByText('La règle ne tranche pas')).toBeVisible()
  await page.getByRole('button', { name: 'Conforme : Contenu au ramassage conforme à la commande', exact: true }).click()
  await page.getByRole('button', { name: 'Conforme : Colis scellé intact jusqu’au relais', exact: true }).click()
  await expect(page.getByText('La règle suggère')).toBeVisible()
  await page.getByRole('radio', { name: /Débouter le client/ }).click()
  await decider(page, 'Lecture des photos après appel')
  await expect(page.getByText('Suites envoyées aux espaces')).toBeVisible()
  const pont = await page.evaluate(() => localStorage.getItem('blv_pont') ?? '')
  expect(pont).toContain('"type":"litige_decide"')
  expect(pont).toContain('"commande":"BLV-60001"')
})
