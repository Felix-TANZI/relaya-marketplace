// Pont commun : décisions de la console d'administration (« app: 'admin' », src/demo/pont-console.ts) vues par le Relais
// Bastos Carrefour — panne en mode papier (registre ouvert, bandeau), versement crédité et pièce à renvoyer (notifications
// « BelivaY · … » sans montant), suspension puis levée (statut du relais) ; et vers la console : l'avis signalé.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const main = '#app main'
const LE = Date.parse('2026-10-13T13:00:00Z')
const ADMIN = (e: Record<string, unknown>, cle: string, le = LE) => ({ ...e, cle: 'admin-' + cle, app: 'admin', le })
const ajouter = (page: Page, l: unknown[]) => page.evaluate((x) => localStorage.setItem('blv_pont', JSON.stringify([...JSON.parse(localStorage.getItem('blv_pont') ?? '[]'), ...x])), l)

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('console → relais : panne en mode papier (registre et bandeau), versement, pièce à renvoyer, ressaisie', async ({ page }) => {
  await ouvrir(page, '#accueil', FR)
  await ajouter(page, [
    ADMIN({ type: 'panne', id: 'INC-5', etat: 'declare', zones: ['Z1'], message: 'Réseau de paiement coupé.', relais: [] }, 'p1', LE - 60_000),
    ADMIN({ type: 'panne', id: 'INC-5', etat: 'papier', zones: ['Z1'], message: 'Remettez sur registre papier.', relais: ['rel-z1-001', 'rel-z6-004'] }, 'p2'),
    ADMIN({ type: 'versement_credite', lot: 'VS-42', espace: 'relais', beneficiaire: 'rel-z1-001', montant: 8400 }, 'v1'),
    ADMIN({ type: 'kyc_decide', dossier: 'KYC-0300', espace: 'relais', acteur: 'rel-z1-001', decision: 'complement', pieces: [{ nature: 'Attestation de commerce', motif: 'Document illisible, reprenez la photo.' }] }, 'k1'),
    ADMIN({ type: 'ressaisie_relancee', incident: 'INC-5', remise: 'RP-12', relais: 'rel-z1-001' }, 'r1'),
    ADMIN({ type: 'versement_credite', lot: 'VS-43', espace: 'relais', beneficiaire: 'rel-z3-002', montant: 5000 }, 'v2'),
  ])
  await page.reload()
  await expect(page.locator('[data-console="panne-INC-5"]')).toContainText('mode papier')
  await expect(page.locator('[data-console="kyc"]')).toContainText('Document illisible')
  await page.goto('mode-papier')
  await expect(page.locator(main)).toContainText('INC-5')
  await page.goto('notifications')
  await expect(page.locator(main)).toContainText('BelivaY · Mode papier')
  await expect(page.locator(main)).toContainText('BelivaY · Versement crédité')
  await expect(page.locator(main)).toContainText('BelivaY · Pièce à renvoyer')
  await expect(page.locator(main)).toContainText('BelivaY · Registre papier à ressaisir')
  await expect(page.locator(main)).not.toContainText('8 400') // aucun montant dans une notification du relais (NOT-03)
  await expect(page.locator(main)).not.toContainText('VS-43') // versement d'un autre relais
  await page.goto('documents')
  await expect(page.locator(main)).toContainText('Document illisible, reprenez la photo.')
  // Rétablie : le bandeau disparaît.
  await ajouter(page, [ADMIN({ type: 'panne', id: 'INC-5', etat: 'retabli', zones: ['Z1'], message: 'REPRISE', relais: ['rel-z1-001'] }, 'p3', LE + 60_000)])
  await page.reload()
  await expect(page.locator('[data-console="panne-INC-5"]')).toHaveCount(0)
})

test('console → relais : suspension de niveau 3 puis levée ; l’avis signalé part vers la console', async ({ page }) => {
  await ouvrir(page, '#statut-relais', FR)
  await ajouter(page, [ADMIN({ type: 'sanction_decidee', acteurId: 'rel-z1-001', espace: 'relais', niveau: 3, etat: 'vigueur', motif: 'Colis remis sans code à deux reprises', recoursJusqua: null }, 's1')])
  await page.reload()
  await expect(page.locator('[data-console="sanction"]')).toContainText('Colis remis sans code')
  await ajouter(page, [ADMIN({ type: 'sanction_decidee', acteurId: 'rel-z1-001', espace: 'relais', niveau: 3, etat: 'levee', motif: 'Recours accepté.', recoursJusqua: null }, 's2', LE + 1000)])
  await page.reload()
  await expect(page.locator('[data-console="sanction"]')).toHaveCount(0)
  // Un avis signalé part vers la console (report.filed, charge anonyme).
  await page.goto('avis')
  await page.locator('.r9-bulle').first().click()
  const f = page.getByRole('dialog', { name: 'Avis d’un client' })
  await f.getByRole('radio', { name: 'Hors-sujet' }).click()
  await f.getByRole('button', { name: 'Signaler à BelivaY' }).click()
  await expect(f).toContainText('BelivaY examine')
  const r = await page.evaluate(() => (JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string }[]).find((e) => e.type === 'report.filed'))
  expect(r).toMatchObject({ app: 'relais', espace: 'relais', motif: 'Avis hors sujet', gravite: 'normale' })
})
