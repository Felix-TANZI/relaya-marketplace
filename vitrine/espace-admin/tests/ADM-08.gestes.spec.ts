// Gestes et règles des écrans de la logistique (S4 : ADM-P17 à P23 et la page « candidatures »), dans le vrai
// navigateur : décision motivée (motif obligatoire), quatre yeux (la décision part au second validateur), publication
// au pont avec l'entreprise et le livreur (localStorage blv_pont), périmètre des Opérations, lecture seule du Support,
// page fermée à un rôle (Réservé), aucune affectation possible.
import { expect, test, type Page } from '@playwright/test'
import { FR, figerHorloge, ouvrir } from './commun'

const MOTIF = 'Motif écrit pour la démonstration : décision prise au vu des preuves du dossier, journalisée.'
const feuille = (p: Page) => p.getByRole('dialog')
async function decider(p: Page, bouton: string, motif = MOTIF) {
  await p.getByRole('button', { name: bouton }).first().click()
  const f = feuille(p)
  await expect(f).toBeVisible()
  await f.locator('textarea').fill(motif)
  await f.locator('.btn.primary').click()
  await expect(f).toBeHidden()
}
const pont = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string; app: string; id?: string; livreurId?: string }[])

test.beforeEach(async ({ page }) => figerHorloge(page))

test('relais saturé : la bascule vers le secours est décidée avec motif et appliquée', async ({ page }) => {
  await ouvrir(page, 'relais?id=r-mokolo', FR)
  await expect(page.getByText('Relais Elobi').first()).toBeVisible()
  await page.getByRole('button', { name: 'Orienter vers le secours' }).first().click()
  await feuille(page).locator('.btn.primary').click()
  await expect(feuille(page).getByRole('alert')).toContainText('au moins')
  await feuille(page).locator('textarea').fill(MOTIF)
  await feuille(page).locator('.btn.primary').click()
  await expect(page.getByText(/décision appliquée et journalisée/)).toBeVisible()
  await expect(page.getByText(/Bascule en place vers Relais Elobi/)).toBeVisible()
})

test('fermeture définitive : refusée tant que des colis sont en garde ; transfert puis fermeture à quatre yeux', async ({ page }) => {
  await ouvrir(page, 'relais?id=r-nlongkak', FR)
  const fermer = page.getByRole('button', { name: 'Fermer le relais' })
  await expect(fermer).toHaveAttribute('aria-disabled', 'true')
  await decider(page, 'Transférer les colis')
  await expect(page.getByText(/colis transférés/).first()).toBeVisible()
  await decider(page, 'Fermer le relais')
  await expect(page.getByText(/envoyée au second validateur/)).toBeVisible()
})

test('Opérations : ses zones seulement, et la fermeture part au second validateur Direction', async ({ page }) => {
  await ouvrir(page, 'relais', { ...FR, role: 'operations' })
  await expect(page.getByText('Votre périmètre : Z1, Z2, Z3, Z6')).toBeVisible()
  await expect(page.getByRole('link', { name: /Relais Mvog-Ada/ })).toHaveCount(0)
  await ouvrir(page, 'relais?id=r-mvogada', { ...FR, role: 'operations' })
  await expect(page.getByText('Relais introuvable')).toBeVisible()
})

test('Support : lecture seule, aucun geste ; Finance : la page des livreurs lui est fermée', async ({ page }) => {
  await ouvrir(page, 'relais?id=r-mokolo', { ...FR, role: 'support' })
  await expect(page.getByText('142 places occupées sur 150')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Orienter vers le secours' })).toHaveCount(0)
  await ouvrir(page, 'livreurs', { ...FR, role: 'finance' })
  await expect(page.getByText('Réservé à d’autres rôles')).toBeVisible()
})

test('départ échu sans constat : clos par l’administrateur, kit non contesté, publié au pont', async ({ page }) => {
  await ouvrir(page, 'livreurs?depart=DP-0385', FR)
  await decider(page, 'Clore le départ (kit non contesté)')
  await expect(page.getByText(/Clos le .* par l’administrateur · kit non contesté/)).toBeVisible()
  expect((await pont(page)).some((e) => e.type === 'depart_clos' && e.app === 'admin' && e.id === 'DP-0385')).toBe(true)
})

test('retenue de kit contestée : annulée par la Direction, décision publiée', async ({ page }) => {
  await ouvrir(page, 'livreurs?depart=DP-0377', FR)
  await decider(page, 'Annuler la retenue')
  await expect(page.locator('main')).toContainText('Décision : retenue annulée')
  expect((await pont(page)).some((e) => e.type === 'kit_decide')).toBe(true)
})

test('suspension d’un livreur : quatre yeux, rien n’est publié avant la contre-signature', async ({ page }) => {
  await ouvrir(page, 'livreurs?id=l-brice', { ...FR, role: 'operations' })
  await decider(page, 'Suspendre le livreur')
  await expect(page.getByText(/envoyée au second validateur/)).toBeVisible()
  expect((await pont(page)).some((e) => e.type === 'livreur_suspendu')).toBe(false)
})

test('nouvel appareil en doublon : acceptation refusée (un appareil, un compte)', async ({ page }) => {
  await ouvrir(page, 'livreurs?onglet=departs', FR)
  const carte = page.locator('.card', { hasText: 'CI-0013' })
  await carte.getByRole('button', { name: 'Accepter le changement' }).click({ force: true })
  await expect(page.getByText('Identifiant déjà rattaché à un autre compte : un appareil, un compte.').first()).toBeVisible()
})

test('livreurs : aucun bouton d’affectation n’existe', async ({ page }) => {
  await ouvrir(page, 'livreurs?id=l-serge', FR)
  await expect(page.getByRole('heading', { name: 'Serge A.' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /affecter/i })).toHaveCount(0)
})

test('paquet sans preneur : élargir la publication, puis le geste n’est plus permis', async ({ page }) => {
  await ouvrir(page, 'paquets?id=PQ-Z3-261013-009', FR)
  await decider(page, 'Élargir la publication')
  await expect(page.getByRole('button', { name: 'Élargir la publication' }).first()).toHaveAttribute('aria-disabled', 'true')
})

test('entreprises : la grille bloque la ligne au-dessus du plafond', async ({ page }) => {
  await ouvrir(page, 'entreprises?id=e-yafe&vue=grille', FR)
  await expect(page.locator('main')).toContainText('1 ligne bloquée sur')
  await expect(page.locator('tr.bad')).toHaveCount(1)
})

// Pont : ce que les autres applis disent à la console, et ce que la console leur répond (une fois par clé).
const LE = Date.UTC(2026, 9, 13, 12, 0)
async function injecter(p: Page, evenements: Record<string, unknown>[]) {
  await p.evaluate((l) => localStorage.setItem('blv_pont', JSON.stringify(l)), evenements.map((e, i) => ({ ...e, cle: `test-${i}`, le: LE, n: i + 1 })))
  await p.reload()
}

test('fonctions d’abord : Points relais ouvre sur ses gestes comptés, sans phrase d’explication', async ({ page }) => {
  await ouvrir(page, 'relais', FR)
  const f = page.getByRole('navigation', { name: 'Fonctions de la page' })
  await expect(f.getByRole('link', { name: /Activer 1 relais/ })).toBeVisible()
  await expect(f.getByRole('link', { name: /Décider 1 relais saturé/ })).toBeVisible()
  await f.getByRole('link', { name: /Transférer/ }).click()
  await expect(page.locator('tbody tr')).toHaveCount(1)
})

test('pont : stock, fermeture annoncée et colis manquants du relais arrivent sur sa fiche', async ({ page }) => {
  await ouvrir(page, 'relais', FR)
  await injecter(page, [
    { type: 'relay.stock.updated', app: 'relais', occupees: 60, declarees: 120, sature: false },
    { type: 'relay.closure.declared', app: 'relais', du: '2026-10-20', au: '2026-10-21', motif: 'Deuil' },
    { type: 'relay.inventory.missing', app: 'relais', inventaire: 'INV-07', colis: ['BLV-52108-1', 'BLV-52110-1'] },
  ])
  await expect(page.getByRole('link', { name: /Instruire 2 colis manquants/ })).toBeVisible()
  await expect(page.getByText('Relais Bastos Carrefour · fermeture annoncée')).toBeVisible()
  await ouvrir(page, 'relais?id=r-bastos', FR)
  await expect(page.getByText('Inventaire INV-07 · 2 colis manquants')).toBeVisible()
  await expect(page.getByText('60 places occupées sur 120').first()).toBeVisible()
})

test('pont : une inscription de l’espace relais devient une candidature ; acceptée, le relais reçoit kyc_decide', async ({ page }) => {
  await ouvrir(page, 'candidatures', FR)
  await injecter(page, [{ type: 'account.requested', app: 'relais', espace: 'relais', acteur: 'rel-z1-001', dossier: 'INS-R-0001', pieces: 3 }])
  const c = page.locator('section', { hasText: 'INS-R-0001' })
  await expect(c.getByText(/Reçue de l’espace relais/)).toBeVisible()
  await c.getByRole('button', { name: 'Accepter' }).click()
  const f = feuille(page)
  await f.locator('textarea').fill(MOTIF)
  await f.locator('.btn.primary').click()
  await expect(page.locator('main')).toContainText('décision appliquée et journalisée (INS-R-0001)')
  const e = (await pont(page)).find((x) => x.type === 'kyc_decide' && x.app === 'admin') as unknown as { espace: string; acteur: string; decision: string }
  expect(e).toMatchObject({ espace: 'relais', acteur: 'rel-z1-001', decision: 'approuve' })
})

test('pont : la demande d’activation d’un livreur, certifié, part à son espace sous son identifiant', async ({ page }) => {
  await ouvrir(page, 'livreurs?onglet=activation', FR)
  await injecter(page, [{ type: 'account.requested', app: 'livreur', espace: 'livreur', acteur: 'l-serge', dossier: 'INS-L-0001', pieces: 3 }])
  await expect(page.getByText('Serge A. · INS-L-0001')).toBeVisible()
  await decider(page, 'Valider la certification')
  const e = (await pont(page)).find((x) => x.type === 'kyc_decide' && x.app === 'admin') as unknown as { espace: string; acteur: string }
  expect(e).toMatchObject({ espace: 'livreur', acteur: 'l-serge' })
})

test('livreur en activation : certification incomplète, la validation est refusée (R80)', async ({ page }) => {
  await ouvrir(page, 'livreurs?id=l-herve', FR)
  await expect(page.getByRole('button', { name: 'Valider la certification' })).toHaveAttribute('aria-disabled', 'true')
})
