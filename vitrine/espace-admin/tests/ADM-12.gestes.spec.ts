// Gestes et règles des écrans ADM-12 (S6) : fraude (revue avant décision, contrôles, issue motivée journalisée ;
// Support en lecture, Audit sans décision), journal (consultation journalisée, sa part), rôles (compte nominatif avec
// périmètre, Direction à quatre yeux, toujours deux comptes Direction), espaces pays (fermé sans conditions), agents
// terrain (aucune validation à la place de l'acteur ; contrôle par la Vérification).
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

const MOTIF = 'Motif écrit assez long pour une décision motivée et journalisée.'
test.use({ viewport: { width: 1280, height: 900 } })
test.beforeEach(async ({ page }) => figerHorloge(page))

async function motiver(page: Page, bouton: string) {
  const f = page.locator('.sheet').last()
  await f.locator('textarea').first().fill(MOTIF)
  await f.getByRole('button', { name: bouton }).click()
  await expect(page.locator('.sheet')).toHaveCount(0)
}

test('fraude : revue ouverte et journalisée, décision bloquée tant que les contrôles ne sont pas cochés, puis classée', async ({ page }) => {
  await ouvrir(page, adresse('fraude'), FR)
  await expect(page.locator('main')).toContainText('Même moyen de paiement') // moteur fraude.py : numéro de versement et moyen de paiement séparés
  await page.getByRole('row', { name: /FR-261013-01/ }).getByRole('button', { name: 'Ouvrir une revue' }).click()
  await expect(page).toHaveURL(/alerte=FR-261013-01/)
  await expect(page.locator('.adme-graph svg')).toBeVisible()
  const classer = page.getByRole('button', { name: 'Classer sans suite' })
  await expect(classer).toBeDisabled()
  for (const c of await page.locator('.panel', { hasText: 'Avant de décider' }).locator('input[type=checkbox]').all()) await c.check()
  await expect(classer).toBeEnabled()
  await classer.click()
  await motiver(page, 'Classer sans suite')
  await expect(page.locator('main')).toContainText('Classée')
  await page.goto(adresse('journal'))
  await expect(page.locator('main')).toContainText('fraude.classer')
  await expect(page.locator('main')).toContainText('fraude.revue.ouvrir')
})

test('fraude : le Support lit sans ouvrir de revue ; l’Audit instruit sans décider', async ({ page }) => {
  await ouvrir(page, adresse('fraude', 'alerte=FR-261012-02'), { ...FR, role: 'support' })
  await expect(page.locator('main')).toContainText('Lecture seule')
  await expect(page.getByRole('button', { name: 'Classer sans suite' })).toHaveCount(0)
  await ouvrir(page, adresse('fraude'), { ...FR, role: 'audit' })
  await expect(page.locator('.a-travail').getByText('Instruire')).toBeVisible()
  await page.goto(adresse('fraude', 'alerte=FR-261012-02'))
  await expect(page.locator('main')).toContainText('sans décider')
})

test('journal : la consultation est journalisée ; la Finance ne voit que sa part', async ({ page }) => {
  await ouvrir(page, adresse('journal'), { ...FR, role: 'audit' })
  await expect(page.getByRole('row', { name: /journal\.consulter/ }).first()).toContainText('Béatrice Essomba')
  await expect(page.locator('main')).toContainText('Intacte')
  await ouvrir(page, adresse('journal'), { ...FR, role: 'finance' })
  await expect(page.locator('main')).toContainText('votre part')
  await expect(page.locator('main')).not.toContainText('Clarisse Mvondo')
})

test('rôles (Équipe et accès) : Opérations sans zone refusée ; personne ne touche son propre compte', async ({ page }) => {
  await ouvrir(page, adresse('roles', 'inviter=1'), { ...FR, role: 'rh' })
  const f = page.locator('.sheet')
  await f.getByLabel('Équipe').selectOption({ label: 'Opérations et terrain' })
  await f.getByLabel('Prénom').fill('Awa')
  await f.getByLabel('Nom', { exact: true }).fill('Bello')
  await f.getByLabel('E-mail professionnel').fill('awa@belivay.com')
  await f.getByLabel('Motif').fill('Arrivée d’un agent terrain à Mokolo pour les descentes')
  await expect(f.getByRole('button', { name: 'Créer et inviter' })).toBeDisabled()
  await f.getByLabel('Z3 Mokolo').check()
  await f.getByRole('button', { name: 'Créer et inviter' }).click()
  await expect(f.getByRole('status')).toContainText('awa@belivay.com')
  await ouvrir(page, adresse('membre', 'id=a-franck'), FR)
  await expect(page.getByRole('button', { name: 'Suspendre' })).toHaveCount(0)
})

test('espaces pays : le Gabon en préparation n’ouvre pas sans ses conditions ; un paramètre se revoit', async ({ page }) => {
  await ouvrir(page, adresse('pays', 'pays=GA'), FR)
  await expect(page.getByRole('button', { name: 'Ouvrir l’espace' })).toBeDisabled()
  await page.getByRole('button', { name: /Revoir : TVA/ }).click()
  await page.locator('.sheet input').fill('18 % sur la commission')
  await page.locator('.sheet').getByRole('button', { name: 'Marquer comme revu' }).click()
  await expect(page.getByRole('row', { name: /TVA/ })).toContainText('Revu')
})

test('agents terrain : l’agent relance mais ne valide jamais ; la Vérification contrôle', async ({ page }) => {
  await ouvrir(page, adresse('comptes', 'fiche=ST-0042'), { ...FR, role: 'terrain' })
  await expect(page.getByRole('button', { name: /valider/i })).toHaveCount(0)
  await page.getByRole('button', { name: 'Relancer l’acteur' }).click()
  await expect(page.locator('main')).toContainText('Relance n° 1')
  await ouvrir(page, adresse('comptes', 'fiche=ST-0040'), { ...FR, role: 'verification' })
  await page.getByRole('button', { name: 'Contrôler : conforme' }).click()
  await motiver(page, 'Contrôler : conforme')
  await expect(page.locator('main')).toContainText('Conforme')
})

test('pont : un signalement d’un espace (hors offre et produit) devient une alerte de fraude, une seule fois', async ({ page }) => {
  await ouvrir(page, adresse('fraude'), FR)
  const e = { type: 'report.filed', app: 'vendeur', espace: 'vendeur', objet: 'BLV-52108', motif: 'Colis suspect', gravite: 'grave', cle: 'test-signal-1', le: Date.UTC(2026, 9, 13, 12, 0), n: 1 }
  await page.evaluate((x) => localStorage.setItem('blv_pont', JSON.stringify([x, { ...x, cle: 'test-signal-2', gravite: 'normale' }])), e)
  await page.reload()
  await expect(page.getByRole('row', { name: /Signalement d’un espace/ })).toHaveCount(2)
  await page.reload()
  await expect(page.getByRole('row', { name: /Signalement d’un espace/ })).toHaveCount(2)
})
