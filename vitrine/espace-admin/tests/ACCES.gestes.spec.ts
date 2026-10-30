// Équipe et accès (logique-metier/ACCES-CONSOLE.md), vus de l'écran : conflit refusé, dernier compte Direction protégé,
// suspension qui ferme la session, accès temporaire retiré à sa fin, responsable limité à son équipe, agent terrain
// limité à ses descentes, 403 de la source ; et les parcours : inviter, qui peut faire quoi, revue, avertir et lire,
// répartir, planifier une descente, compte rendu au téléphone. « ?agent=a-… » connecte un employé précis.
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

const MOTIF = 'Motif écrit assez long pour une décision motivée et journalisée.'
test.use({ viewport: { width: 1280, height: 900 } })
test.beforeEach(async ({ page }) => figerHorloge(page))
const comme = (page: Page, route: string, agent: string, q = '') => ouvrir(page, adresse(route, `agent=${agent}${q ? '&' + q : ''}`), FR)

async function motiver(page: Page, bouton: string | RegExp, ferme = true) {
  const f = page.locator('.sheet').last()
  await f.locator('textarea').first().fill(MOTIF)
  await f.getByRole('button', { name: bouton }).click()
  if (ferme) await expect(page.locator('.sheet')).toHaveCount(0)
}

// Mot de passe d'essai des employés de la démonstration (src/demo/jeu-essai.ts).
const MDP = 'Belivay2026'

test('Équipe et accès : tuiles, personnes par équipe, fiche « Ce que X peut faire »', async ({ page }) => {
  await ouvrir(page, adresse('roles'), FR)
  await expect(page.getByRole('link', { name: /Valider 2 demandes d’accès/ }).or(page.getByRole('button', { name: /Valider 2 demandes d’accès/ }))).toBeVisible()
  await expect(page.getByRole('button', { name: /Revoir 6 accès/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Surveiller 3 accès temporaires qui expirent/ })).toBeVisible()
  for (const e of ['Direction', 'Litiges et médiation', 'Service client', 'Vérification et catalogue', 'Finance', 'Opérations et terrain', 'Audit et conformité', 'Accès et personnel']) await expect(page.getByRole('region', { name: e })).toBeVisible()
  await page.getByRole('region', { name: 'Service client' }).getByRole('link', { name: /Clarisse Mvondo/ }).click()
  await expect(page.getByRole('heading', { name: 'Ce que Clarisse peut faire' })).toBeVisible()
  await expect(page.locator('main')).toContainText('Médiation')
})

test('conflit refusé : Finance + Médiation ne se cumulent pas', async ({ page }) => {
  await comme(page, 'membre', 'a-pauline', 'id=a-boris')
  await page.getByRole('button', { name: 'Rôle additionnel' }).click()
  const f = page.locator('.sheet').last()
  await f.getByLabel('Rôle additionnel').selectOption({ label: 'Médiation' })
  await motiver(page, 'Enregistrer', false)
  await expect(f.getByRole('alert')).toContainText('Qui paie ne tranche pas le litige')
})

test('dernier compte Direction protégé : ni suspendu par la Direction, ni touché par Accès et personnel', async ({ page }) => {
  await ouvrir(page, adresse('membre', 'id=a-helene'), FR)
  await page.getByRole('button', { name: 'Suspendre' }).click()
  await motiver(page, 'Suspendre', false)
  await expect(page.locator('.sheet').last().getByRole('alert')).toContainText('toujours deux comptes Direction')
  await comme(page, 'membre', 'a-pauline', 'id=a-franck')
  await expect(page.getByRole('button', { name: 'Suspendre' })).toHaveCount(0)
})

test('suspension : la session de l’employé se ferme, sa connexion est refusée', async ({ page }) => {
  await comme(page, 'membre', 'a-pauline', 'id=a-aicha')
  await page.getByRole('button', { name: 'Suspendre' }).click()
  await motiver(page, 'Suspendre')
  await expect(page.locator('main')).toContainText('Suspendu le')
  await page.goto(adresse('file', 'agent=a-aicha'))
  await expect(page).toHaveURL(/\/admin\/connexion/)
  // Sa propre connexion (identifiant et mot de passe) est refusée : compte suspendu.
  await page.locator('input[autocomplete="username"]').last().fill('aicha@belivay.com')
  await page.locator('input[autocomplete="current-password"]').fill(MDP)
  await page.locator('button[type="submit"]').last().click()
  await expect(page.getByRole('alert')).toContainText('Compte suspendu ou fermé')
})

test('accès temporaire : retiré tout seul à sa fin (le rôle disparaît de la navigation)', async ({ page }) => {
  await comme(page, 'profil', 'a-linda')
  await expect(page.getByRole('button', { name: 'Agir en tant que Opérations et logistique' })).toBeVisible()
  await page.clock.setFixedTime(new Date('2026-10-13T19:30:00.000Z'))
  await page.reload()
  await expect(page.getByRole('button', { name: 'Agir en tant que Opérations et logistique' })).toHaveCount(0)
  await expect(page.locator('main')).toContainText('retiré à sa fin')
})

test('responsable : son équipe seulement (Mon équipe, répartir) ; pas la fiche d’une autre équipe', async ({ page }) => {
  await comme(page, 'mon-equipe', 'a-patrice')
  await expect(page.getByRole('heading', { name: /charge de travail/ })).toBeVisible()
  await page.getByText('Répartir les dossiers de Clarisse').click()
  await page.getByLabel('Donner SP-0207 à').selectOption({ label: 'Aïcha Bouba' })
  await expect(page.getByText('Répartir les dossiers de Clarisse')).toBeVisible()
  await page.getByRole('button', { name: /Confirmer : Aïcha Bouba/ }).click()
  await expect(page.locator('#revue')).toContainText('Confirmé')
  await page.goto(adresse('membre', 'id=a-sandrine'))
  await expect(page.getByRole('heading', { name: 'Réservé à d’autres rôles' })).toBeVisible()
  await page.goto(adresse('mon-equipe', 'agent=a-aicha'))
  await expect(page.getByRole('heading', { name: 'Réservé aux responsables d’équipe' })).toBeVisible()
})

test('403 de la source : la Finance n’ouvre pas Équipe et accès', async ({ page }) => {
  await ouvrir(page, adresse('roles'), { ...FR, role: 'finance' })
  await expect(page.getByRole('heading', { name: 'Réservé à d’autres rôles' })).toBeVisible()
})

test('qui peut faire quoi : « rembourser » nomme les membres et leur plafond', async ({ page }) => {
  await ouvrir(page, adresse('roles', 'onglet=qui'), FR)
  await page.getByLabel('Qui peut faire ce geste ?').fill('qui peut rembourser ?')
  const r = page.locator('.eq-res .card').first()
  await expect(r).toContainText('Nadège Eyenga')
  await expect(r).toContainText('Jusqu’à 25 000 F')
})

test('avertir et lire : le message arrive au Profil du membre, l’accusé de lecture remonte', async ({ page }) => {
  await comme(page, 'membre', 'a-pauline', 'id=a-josue')
  await page.getByRole('button', { name: 'Avertir' }).click()
  await motiver(page, 'Envoyer')
  await comme(page, 'profil', 'a-josue')
  await expect(page.locator('main')).toContainText(MOTIF)
  await page.getByRole('button', { name: 'J’ai lu' }).first().click()
  await expect(page.getByRole('heading', { name: /Mes messages · 0 non lu/ })).toBeVisible()
})

test('inviter : un Responsable invite dans son équipe ; Finance attend la Direction', async ({ page }) => {
  await ouvrir(page, adresse('roles', 'inviter=1'), { ...FR, role: 'rh' })
  const f = page.locator('.sheet')
  await f.getByLabel('Équipe').selectOption({ label: 'Finance' })
  await f.getByLabel('Prénom').fill('Awa')
  await f.getByLabel('Nom', { exact: true }).fill('Bello')
  await f.getByLabel('E-mail professionnel').fill('awa@belivay.com')
  await f.getByLabel('Motif').fill('Arrivée à la Finance pour les versements du vendredi')
  await f.getByRole('button', { name: 'Envoyer pour validation' }).click()
  await expect(f.getByRole('status')).toContainText('Envoyé à la Direction')
})

test('descentes : les Opérations planifient l’inspection du relais (relais prévenu) ; l’agent ne voit que les siennes', async ({ page }) => {
  await ouvrir(page, adresse('descentes'), { ...FR, role: 'operations' })
  await page.getByRole('button', { name: /^Planifier/ }).first().click()
  const f = page.locator('.sheet')
  await f.getByLabel('Lieu ou dossier').selectOption({ label: 'Relais Bastos Carrefour · Z1' })
  await f.getByLabel('Agent terrain').selectOption({ index: 1 })
  await f.getByRole('button', { name: 'Planifier', exact: true }).click()
  await expect(f.getByRole('status')).toContainText('planifiée')
  expect(await page.evaluate(() => (localStorage.getItem('blv_pont') ?? '').includes('inspection_annoncee'))).toBe(true)
  await ouvrir(page, adresse('mes-descentes'), { ...FR, role: 'terrain' })
  await expect(page.locator('main')).toContainText('Relais Mokolo Marché')
  await expect(page.locator('main')).not.toContainText('Relais Obili')
})

test('mes descentes : liste de contrôle, photo, compte rendu, envoyé', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await ouvrir(page, adresse('mes-descentes', 'id=DT-0012'), { ...FR, role: 'terrain' })
  await page.getByRole('button', { name: 'Je pars' }).click()
  await expect(page.getByRole('button', { name: 'Je suis sur place' })).toBeVisible()
  for (const g of await page.getByRole('radiogroup').all()) if ((await g.getAttribute('aria-label')) !== 'Résultat') await g.getByRole('radio', { name: 'Oui' }).click()
  await page.getByLabel('Compte rendu').fill(MOTIF)
  await page.getByRole('radio', { name: 'Non conforme' }).click()
  await page.getByRole('button', { name: 'Envoyer le compte rendu' }).click()
  await expect(page.getByRole('status')).toContainText('Compte rendu envoyé')
})
