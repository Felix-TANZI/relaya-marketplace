// PR-06 · gestes des écrans Stock, Fiche colis, À faire partir et Inventaire, sur le jeu d'essai (mardi 13 octobre
// 2026, 14 h 05) : onglets et filtres du stock (STK-02), fiche et garde (FIC-03, FIC-06, ARL-08), déplacement (FIC-02),
// sortie au livreur (DEP-02, DEP-03, D15), inventaire, droits de l'employé (PR-RC-09), anglais.
import { expect, test } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const CLAIR = { nom: 'clair', theme: 'light' as const, lang: 'fr' as const }

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('stock : onglets avec compteurs, recherche, case du plan, ouverture de la fiche', async ({ page }) => {
  await ouvrir(page, '#stock', CLAIR)
  await expect(page.getByRole('heading', { name: 'Colis en stock' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Urgents/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toContainText('BLV-00003-1')
  await page.getByRole('tab', { name: /Payants/ }).click()
  await expect(page.getByRole('tab', { name: /Payants/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toContainText('BLV-00041-1')
  // Onglet gardé pendant la session.
  await page.reload()
  await expect(page.getByRole('tab', { name: /Payants/ })).toHaveAttribute('aria-selected', 'true')
  // Recherche par référence, puis Entrée ouvre la fiche.
  await page.locator('#r6-q').fill('00041')
  await expect(page.getByRole('tab', { name: /Payants/ })).toContainText('1')
  await page.locator('#r6-q').press('Enter')
  await expect(page).toHaveURL(/\/colis\?ref=BLV-00041-1/)
  await expect(page.locator('.p-p11vwd')).toHaveText('BLV-00041-1')
})

test('stock : une case à plusieurs colis filtre la liste ; la grille v6 est lue dans le registre', async ({ page }) => {
  await ouvrir(page, '#stock', CLAIR)
  await page.getByRole('button', { name: /^Case A-01/ }).click()
  await expect(page.locator('.r6-case-choisie')).toContainText('Case A-01 · 2 colis')
  await expect(page.locator('#r6-panneau .p-utsv4v')).toHaveText(['A-01', 'A-01'])
  await page.getByRole('button', { name: 'Toute la liste' }).click()
  await expect(page.locator('.r6-case-choisie')).toHaveCount(0)
  const grille = page.locator('.p-26n637')
  await expect(grille).toContainText('J2–J4')
  await expect(grille).toContainText('1 000 F')
  await expect(grille).toContainText('Vous touchez')
})

test('fiche : garde jour par jour en tranches de 24 h depuis l’arrivée (R37), dernier jour et renvoi', async ({ page }) => {
  await ouvrir(page, '#colis?ref=BLV-00036-1', CLAIR)
  const garde = page.locator('.p-yi6rkz', { has: page.getByRole('heading', { name: 'Garde' }) })
  await expect(garde).toContainText('sam. 17 oct.')
  await expect(garde).toContainText('dim. 18 oct.')
  await garde.getByRole('button', { name: 'Voir la garde jour par jour' }).click()
  await expect(garde.locator('.r6-jour')).toHaveCount(7)
  await expect(garde.locator('.r6-jour.a-aujourdhui')).toContainText('J3')
  await expect(page.locator('.p-8dmjde').first()).toContainText(/Client prévenu \d fois|Client prévenu 1 fois/)
  await expect(page.getByText('Aucune donnée du client ni du vendeur ici')).toBeVisible()
})

test('fiche : Remettre fermé avec son motif (groupage) ; colis inconnu', async ({ page }) => {
  await ouvrir(page, '#colis?ref=BLV-00047-1', CLAIR)
  await expect(page.locator('.r6-actions button', { hasText: 'Remettre' })).toHaveAttribute('aria-disabled', 'true')
  await expect(page.locator('#r6-motif')).toContainText('Colis en groupage')
  await page.goto('colis?ref=BLV-99999-9')
  await expect(page.getByRole('heading', { name: 'Colis introuvable au relais' })).toBeVisible()
})

test('fiche : déplacer vers une case compatible, journalisé', async ({ page }) => {
  await ouvrir(page, '#colis?ref=BLV-00041-1', CLAIR)
  await page.getByRole('button', { name: 'Déplacer' }).click()
  const feuille = page.getByRole('dialog', { name: 'Déplacer le colis' })
  await expect(feuille).toBeVisible()
  const premiere = feuille.getByRole('radio').first()
  const code = (await premiere.locator('.r-ref').textContent())!.trim()
  expect(code.startsWith('B')).toBe(true)
  await premiere.click()
  await feuille.getByRole('button', { name: `Ranger en ${code}` }).click()
  await expect(page.locator('.r6-annonce')).toContainText(`Rangé en ${code}`)
  await expect(page.locator('.p-efknlh')).toHaveText(code)
  await expect(page.locator('.r6-journal')).toContainText('Déplacé')
})

test('départs : scan, absent avec motif, photo et PIN, puis confirmation du livreur', async ({ page }) => {
  await ouvrir(page, '#departs', CLAIR)
  await expect(page.locator('.p-tybbfp')).toContainText('PROCHAINE COLLECTE')
  const valider = page.locator('.r6-cta .p-ncx7qc')
  await expect(valider).toBeDisabled()
  await page.getByLabel('Étiquette du colis').fill('BLV-00003-1')
  await page.getByRole('button', { name: 'Scanner', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: /BLV-00003-1/ })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('.p-t8bz1l')).toHaveText('1 / 2')
  await page.getByRole('button', { name: 'BLV-00004-2 absent ?' }).click()
  await page.getByRole('dialog', { name: 'Colis absent' }).getByRole('button', { name: /Introuvable/ }).click()
  await expect(page.locator('.r6-annonce')).toContainText('BelivaY est alerté')
  await expect(page.locator('.p-t8bz1l')).toHaveText('2 / 2')
  await valider.click()
  const feuille = page.getByRole('dialog', { name: 'Valider la sortie' })
  await feuille.locator('.r6-prise').click()
  await feuille.getByRole('button', { name: 'Photo de démonstration' }).click()
  await expect(feuille).toContainText('Photo prise')
  await feuille.getByLabel(/Votre PIN/).fill('000000')
  await feuille.getByRole('button', { name: 'Valider la sortie' }).click()
  await expect(feuille.locator('.r6-erreur')).toContainText('PIN incorrect')
  await feuille.getByLabel(/Votre PIN/).fill('240913')
  await feuille.getByRole('button', { name: 'Valider la sortie' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Sortie validée à' })).toBeVisible()
  // DEP-03 : la confirmation du livreur arrive ensuite (démonstration : quelques secondes).
  await expect(page.locator('.r6-annonce')).toContainText('Sortie confirmée par le livreur', { timeout: 15_000 })
  await page.getByRole('tab', { name: 'Partis' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('BLV-00003-1 renvoi')
})

test('inventaire : commencer, pointer, trouvé ailleurs, terminer avec le PIN', async ({ page }) => {
  await ouvrir(page, '#inventaire', CLAIR)
  await page.getByRole('button', { name: 'Commencer l’inventaire' }).click()
  await expect(page.getByRole('heading', { name: 'Inventaire en cours' })).toBeVisible()
  await page.getByRole('checkbox', { name: /BLV-00006-1/ }).click()
  await expect(page.getByRole('checkbox', { name: /BLV-00006-1/ })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'BLV-00006-2 est ailleurs ?' }).click()
  await page.getByRole('dialog', { name: 'Trouvé dans une autre case' }).getByRole('button', { name: /A-03/ }).click()
  await expect(page.locator('.r6-annonce')).toContainText('emplacement corrigé')
  await page.locator('.r6-cta .p-ncx7qc').click()
  const feuille = page.getByRole('dialog', { name: 'Terminer l’inventaire' })
  await feuille.getByLabel(/Votre PIN/).fill('240913')
  await feuille.getByRole('button', { name: /Terminer et signaler/ }).click()
  await expect(page.getByText(/Dernier inventaire/)).toBeVisible()
  await expect(page.getByText('Emplacements corrigés')).toBeVisible()
})

test('employé : la part du relais est cachée (PR-RC-09), la garde due reste visible', async ({ page }) => {
  await ouvrir(page, '#colis?ref=BLV-00041-1&demo=employe', CLAIR)
  await expect(page.locator('.p-8dmjde').first()).toContainText('Garde :')
  await expect(page.getByText('Vous toucherez')).toHaveCount(0)
  await page.goto('stock')
  await expect(page.locator('.p-26n637')).not.toContainText('Vous touchez')
})

test('anglais : textes et montants', async ({ page }) => {
  await ouvrir(page, '#stock', { nom: 'clair', theme: 'light', lang: 'en' })
  await expect(page.getByRole('main').getByRole('heading', { name: 'Parcels in stock' })).toBeVisible()
  await expect(page.locator('.p-26n637')).toContainText('1,000 F')
  await page.goto('departs')
  await expect(page.getByRole('main').getByRole('heading', { name: 'To send out' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Why a parcel leaves' })).toBeVisible()
})
