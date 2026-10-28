// Pont commun : décisions de la console d'administration (« app: 'admin' », src/demo/pont-console.ts) vues par Carine M.
// — commande annulée par BelivaY (fil « En direct », état, remboursement), litige tranché, remboursement exécuté (R68,
// R72), geste commercial et message diffusé (notifications « BelivaY · … »), panne en bandeau tant qu'elle dure.
import { expect, test, type Page } from '@playwright/test'

const LE = Date.parse('2026-10-13T13:03:00Z')
const ADMIN = (e: Record<string, unknown>, cle: string, le = LE) => ({ ...e, cle: 'admin-' + cle, app: 'admin', le })
const ajouter = (page: Page, l: unknown[]) => page.evaluate((x) => localStorage.setItem('blv_pont', JSON.stringify([...JSON.parse(localStorage.getItem('blv_pont') ?? '[]'), ...x])), l)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
})

test('console → client : commande annulée, litige tranché, remboursement, geste, message et panne', async ({ page }) => {
  await page.goto('/commandes')
  await ajouter(page, [
    ADMIN({ type: 'commande_annulee', commande: 'BLV-52107', motif: 'Vendeur injoignable depuis 48 h', montant: 180280 }, 'a1'),
    ADMIN({ type: 'litige_decide', id: 'LIT-7', commande: 'BLV-51877', decision: 'rembourser', motif: 'Chargeur défectueux, photos concordantes.', montant: 15800, transporteurEnCause: false }, 'l1'),
    ADMIN({ type: 'remboursement_execute', id: 'RB-40', commande: 'BLV-51877', montant: 15800, moyen: 'momo' }, 'r1'),
    ADMIN({ type: 'geste', ticket: 'TK-12', ref: 'BLV-52089', montant: 1000 }, 'g1'),
    ADMIN({ type: 'diffusion', id: 'DIF-4', espaces: ['client'], zones: [], programmeeLe: LE, texte: 'Les relais de Bastos ferment à 17 h demain.' }, 'd1'),
    ADMIN({ type: 'diffusion', id: 'DIF-5', espaces: ['relais'], zones: [], programmeeLe: LE, texte: 'Pour les relais seulement.' }, 'd2'),
    ADMIN({ type: 'panne', id: 'INC-8', etat: 'declare', zones: ['Z1'], message: 'Paiement Mobile Money ralenti.', relais: [] }, 'p1'),
  ])
  await page.reload()
  await expect(page.locator('[data-console="panne-INC-8"]')).toContainText('Paiement Mobile Money ralenti.')
  await page.goto('/suivi?ref=BLV-52107')
  await expect(page.locator('main')).toContainText('Annulée par BelivaY')
  // Le litige tranché et son remboursement : sur la commande (fil « En direct »), une notification groupée par commande.
  await page.goto('/suivi?ref=BLV-51877')
  await expect(page.locator('main')).toContainText('Décision de BelivaY')
  await page.goto('/notifications')
  const main = page.locator('main')
  await expect(main).toContainText('BelivaY · Commande annulée · BLV-52107')
  await expect(main).toContainText('BelivaY · Remboursement envoyé · BLV-51877')
  await expect(main).toContainText('ton Mobile Money')
  await expect(main).toContainText('BelivaY · Geste commercial')
  await expect(main).toContainText('Les relais de Bastos ferment à 17 h demain.')
  await expect(main).not.toContainText('Pour les relais seulement.')
  await expect(main).not.toContainText('MTN')
  await ajouter(page, [ADMIN({ type: 'panne', id: 'INC-8', etat: 'clos', zones: [], message: '', relais: [] }, 'p2', LE + 1000)])
  await page.reload()
  await expect(page.locator('[data-console="panne-INC-8"]')).toHaveCount(0)
})
