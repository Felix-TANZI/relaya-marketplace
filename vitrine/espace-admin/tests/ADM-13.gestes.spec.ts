// Gestes et règles des écrans ADM-13 et des pages ajoutées de S6 : rapports (définitions au survol, périmètre du
// rôle), santé (maintenance : préavis et créneaux interdits), contenus légaux (vocabulaire, préavis), tâches (une
// exécution par période ; la tâche en échec se relance), conservation (journal jamais effacé, demande de données),
// assistant IA caché (FF-IA fermé : rien n'y mène).
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

const MOTIF = 'Motif écrit assez long pour une décision motivée et journalisée.'
test.use({ viewport: { width: 1280, height: 900 } })
test.beforeEach(async ({ page }) => figerHorloge(page))

async function motiver(page: Page, bouton: string) {
  const f = page.locator('.sheet').last()
  await f.locator('textarea').last().fill(MOTIF)
  await f.getByRole('button', { name: bouton }).click()
}

test('rapports : définitions au survol ; les Opérations ne voient que la logistique de leurs zones', async ({ page }) => {
  await ouvrir(page, adresse('rapports'), FR)
  await expect(page.locator('.e-def', { hasText: 'Délai relais → retrait' })).toHaveAttribute('title', /Médiane/)
  await expect(page.locator('main')).toContainText('Marge par commande')
  await ouvrir(page, adresse('rapports', 'zone=Z4'), { ...FR, role: 'operations' })
  await expect(page.locator('main')).toContainText('Logistique')
  await expect(page.locator('main')).not.toContainText('Marge par commande')
  await expect(page.locator('main')).toContainText('Votre périmètre : Z1, Z2, Z3, Z6')
})

test('santé : une maintenance sans préavis est refusée ; jamais un jeudi soir', async ({ page }) => {
  await ouvrir(page, adresse('sante'), FR)
  await expect(page.locator('main')).toContainText('Paiement Mobile Money (Orange)')
  const p = page.locator('#maintenance')
  await p.getByLabel('Jour', { exact: true }).fill('2026-10-14')
  await p.getByLabel('Motif écrit (obligatoire, journalisé)').fill(MOTIF)
  await p.getByRole('button', { name: 'Programmer', exact: true }).click()
  await expect(p.locator('[role=alert]')).toContainText('à l’avance')
  await p.getByLabel('Jour', { exact: true }).fill('2026-10-22')
  await p.getByLabel('Heure (Yaoundé)').fill('20:00')
  await p.getByRole('button', { name: 'Programmer', exact: true }).click()
  await expect(p.locator('[role=alert]')).toContainText('Créneau interdit')
  await p.getByLabel('Jour', { exact: true }).fill('2026-10-20')
  await p.getByRole('button', { name: 'Programmer', exact: true }).click()
  await expect(p.locator('[role=status]')).toContainText('annoncée aux six applications')
})

test('contenus légaux : le vocabulaire d’établissement de paiement est refusé', async ({ page }) => {
  await ouvrir(page, adresse('legal'), FR)
  await expect(page.locator('main')).toContainText('Conditions générales · entreprise de livraison')
  await page.getByRole('button', { name: 'Proposer une version' }).click()
  const f = page.locator('.sheet')
  await f.locator('select').selectOption('cg-client')
  await f.getByLabel('Ce qui change (résumé public)').fill('Nouveau compte bancaire BelivaY')
  await expect(f).toContainText('Vocabulaire refusé')
  await f.getByLabel('Ce qui change (résumé public)').fill('Le Wallet se recharge au relais')
  await motiver(page, 'Annoncer la version')
  await expect(page.locator('main')).toContainText('v1.1 annoncée')
})

test('tâches : le versement du vendredi ne se rejoue pas ; la conservation en échec se relance', async ({ page }) => {
  await ouvrir(page, adresse('taches'), FR)
  await page.getByRole('button', { name: 'Lancer livraison.vendredi' }).click()
  await motiver(page, 'Lancer')
  await expect(page.locator('.sheet [role=alert]')).toContainText('ne se rejoue pas')
  await page.locator('.sheet').getByRole('button', { name: 'Annuler' }).click()
  await page.getByRole('button', { name: 'Lancer console.conservation' }).click()
  await motiver(page, 'Lancer')
  await expect(page.getByRole('row', { name: /console\.conservation/ })).toContainText('À jour')
})

test('conservation : le journal n’est jamais effacé ; une demande d’accès reçoit sa réponse', async ({ page }) => {
  await ouvrir(page, adresse('conservation'), FR)
  await expect(page.getByRole('row', { name: /Journal d’audit signé/ })).toContainText('Jamais effacé')
  await page.getByRole('button', { name: 'Répondre' }).first().click()
  const telechargement = page.waitForEvent('download')
  await motiver(page, 'Préparer l’export')
  await telechargement
  await expect(page.locator('#demandes')).toContainText('Répondue')
})

test('assistant IA : caché au lancement, rien n’y mène', async ({ page }) => {
  await ouvrir(page, adresse('assistant'), FR)
  await expect(page).not.toHaveURL(/assistant/)
  await expect(page.locator('a[href*="assistant"]')).toHaveCount(0)
  await page.goto(adresse('fraude', 'alerte=FR-261013-01'))
  await expect(page.locator('main')).not.toContainText('Assistant · proposition')
})
