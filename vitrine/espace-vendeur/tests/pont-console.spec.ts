// Pont commun : décisions de la console d'administration (« app: 'admin' », src/demo/pont-console.ts) vues par la
// boutique de démonstration (Tonton PG) — commande retirée, litige tranché, suspension, versements retenus, panne :
// effet sur la commande, bandeau en tête des écrans et notification « BelivaY · … ». Une décision d'un autre vendeur ou
// d'un autre espace n'a aucun effet.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const LE = Date.parse('2026-10-13T13:03:00Z')
const ADMIN = (e: Record<string, unknown>, cle: string, le = LE) => ({ ...e, cle: 'admin-' + cle, app: 'admin', le })
const ajouter = (page: Page, l: unknown[]) => page.evaluate((x) => localStorage.setItem('blv_pont', JSON.stringify([...JSON.parse(localStorage.getItem('blv_pont') ?? '[]'), ...x])), l)

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('console → vendeur : commande retirée, litige tranché, versements retenus, panne en bandeau, notifications', async ({ page }) => {
  await ouvrir(page, '#accueil', FR)
  await ajouter(page, [
    ADMIN({ type: 'commande_annulee', commande: 'BLV-00008', motif: 'Paiement contesté par l’opérateur', montant: 20000 }, 'a1'),
    ADMIN({ type: 'litige_decide', id: 'LIT-9', commande: 'BLV-00009', decision: 'rembourser', motif: 'Montre rayée à la remise, photos concordantes.', montant: 14000, transporteurEnCause: false }, 'l1'),
    ADMIN({ type: 'versement_gele', acteurId: 'v-tontonpg', alerte: 'FR-12', motif: 'Remboursements inhabituels cette semaine.' }, 'g1'),
    ADMIN({ type: 'versement_gele', acteurId: 'v-techno', alerte: 'FR-13', motif: 'Autre boutique.' }, 'g2'),
    ADMIN({ type: 'panne', id: 'INC-3', etat: 'declare', zones: ['Z1', 'Z4'], message: 'Paiements lents : vos commandes arrivent avec du retard.', relais: [] }, 'p1'),
    ADMIN({ type: 'offre_moderee', offre: 'OF-77', vendeurId: 'v-tontonpg', decision: 'dépubliée', motif: 'Prix anormal pour cette fiche.', suggestion: 21000 }, 'o1'),
  ])
  await page.reload()
  await expect(page.locator('[data-console="panne-INC-3"]')).toContainText('Paiements lents')
  await expect(page.locator('[data-console="gel"]')).toContainText('Remboursements inhabituels')
  await expect(page.locator('main')).not.toContainText('Autre boutique.')
  await page.goto('commande?ref=BLV-00008')
  await expect(page.locator('main')).toContainText('Annulée par BelivaY')
  await page.goto('notifications')
  const main = page.locator('main')
  await expect(main).toContainText('BelivaY · Commande retirée · BLV-00008')
  await expect(main).toContainText('BelivaY · Décision sur le litige · BLV-00009')
  await expect(main).toContainText('BelivaY · Versements retenus')
  await expect(main).toContainText('BelivaY · Offre OF-77 : dépubliée')
  // La panne rétablie : le bandeau disparaît.
  await ajouter(page, [ADMIN({ type: 'panne', id: 'INC-3', etat: 'retabli', zones: [], message: 'REPRISE', relais: [] }, 'p2', LE + 1000)])
  await page.reload()
  await expect(page.locator('[data-console="panne-INC-3"]')).toHaveCount(0)
})

test('console → vendeur : suspension de niveau 3 en vigueur sur l’accueil, levée ensuite', async ({ page }) => {
  await ouvrir(page, '#accueil', FR)
  await ajouter(page, [ADMIN({ type: 'sanction_decidee', acteurId: 'v-tontonpg', espace: 'vendeur', niveau: 3, etat: 'vigueur', motif: 'Trois commandes non préparées en 30 jours', recoursJusqua: LE + 2 * 86_400_000 }, 's1')])
  await page.reload()
  await expect(page.locator('[data-console="sanction"]')).toContainText('Trois commandes non préparées en 30 jours')
  await ajouter(page, [ADMIN({ type: 'sanction_decidee', acteurId: 'v-tontonpg', espace: 'vendeur', niveau: 3, etat: 'levee', motif: 'Recours accepté.', recoursJusqua: null }, 's2', LE + 1000)])
  await page.reload()
  await expect(page.locator('[data-console="sanction"]')).toHaveCount(0)
  await page.goto('notifications')
  await expect(page.locator('main')).toContainText('BelivaY · Sanction levée')
})

test('ouverture : le dossier envoyé part vers la console (account.requested) ; sa décision « complément » revient avec le motif', async ({ page }) => {
  await ouvrir(page, '#ouvrir', FR)
  await page.locator('#ov-nom').fill('Chez Mado')
  await page.locator('#ov-cat').selectOption('Mode Femme')
  await page.getByRole('radio', { name: 'Entreprise' }).click()
  await page.locator('#ov-num').fill('677 42 18 90')
  await page.locator('.vd03-carte').click()
  await page.getByRole('button', { name: 'Ouvrir ma boutique' }).click()
  await page.locator('.vd03-demo').getByRole('button', { name: 'Le remplir' }).click()
  await page.getByRole('button', { name: 'Valider le code' }).click()
  await page.getByRole('button', { name: 'Plus tard' }).click()
  for (const p of ['CNI · recto', 'CNI · verso', 'Selfie vidéo avec votre pièce']) await page.locator('.vd03-demo').getByRole('button', { name: `Envoyer « ${p} »` }).click()
  await page.getByRole('button', { name: 'Envoyer pour vérification' }).click()
  await expect(page.locator('h1.pg-t')).toHaveText('Vérification en cours')
  const demande = await page.evaluate(() => (JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string; app: string; espace: string; dossier: string; pieces: number }[]).find((e) => e.type === 'account.requested'))
  expect(demande).toMatchObject({ app: 'vendeur', espace: 'vendeur', pieces: 4 })
  await ajouter(page, [ADMIN({ type: 'kyc_decide', dossier: demande!.dossier, espace: 'vendeur', acteur: demande!.dossier, decision: 'complement', pieces: [{ nature: 'verso', motif: 'Le verso est coupé en bas.' }] }, 'kyc1')])
  await page.reload()
  await expect(page.locator('h1.pg-t')).toHaveText('Une photo à reprendre')
  await expect(page.locator('main')).toContainText('Le verso est coupé en bas.')
})
