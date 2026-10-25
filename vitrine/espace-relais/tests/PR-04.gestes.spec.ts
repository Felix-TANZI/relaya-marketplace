// Gestes du Guichet 1 (PR-04) : Aujourd'hui, Réception d'un lot, Appareil photo. Démonstration du mardi 13 octobre
// 2026 à 14 h 05 (horloge figée) : lot PQ-Z1-261013-003 de Yafé Express (4 colis, code de dépôt 418306, le même que
// l'application du livreur). L'appareil photo du navigateur piloté est remplacé par « aucun appareil » : la
// démonstration prend alors une image de démonstration (CAM-05 : sans autorisation, l'étape reste bloquée).
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { figerHorloge, ouvrir } from './commun'

const JEU = readFileSync(new URL('../src/demo/jeu-essai.ts', import.meta.url), 'utf-8')
const PIN = /PIN_DEMO = '(\d+)'/.exec(JEU)![1]
const CODE = /'PQ-Z1-261013-003': '(\d+)'/.exec(JEU)![1]
const LOT = 'PQ-Z1-261013-003'
const R = { nom: 'clair', theme: 'light' as const, lang: 'fr' as const }

async function sansAppareil(page: Page) {
  await page.addInitScript(() => {
    const md = navigator.mediaDevices
    if (md) Object.defineProperty(md, 'getUserMedia', { configurable: true, value: () => Promise.reject(Object.assign(new Error('aucun appareil'), { name: 'NotFoundError' })) })
  })
}
/** Code de dépôt au gros pavé : sans appareil photo, il est ouvert ; vérification au 6e chiffre. */
async function saisirCode(page: Page, code: string) {
  for (const k of code) await page.locator('main').getByRole('button', { name: k, exact: true }).click()
}
/** Référence d'une étiquette au pavé (« BLV-00008-1 » = 000081), la lecture reste ouverte entre deux scans. */
async function scannerRef(page: Page, ref: string) {
  const [, a, b] = /BLV-(\d{5})-(\d)/.exec(ref)!
  for (const k of a + b) await page.locator('main').getByRole('button', { name: k, exact: true }).click()
}
const PHOTO = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }
async function photo(page: Page, n = 1) {
  await expect(page).toHaveURL(/\/camera\?/)
  await expect(page.getByRole('button', { name: /^(Autoriser l’appareil photo|Prendre la photo)/ }).first()).toBeVisible()
  const autoriser = page.getByRole('button', { name: 'Autoriser l’appareil photo' })
  if (await autoriser.isVisible()) await autoriser.click()
  for (let k = 0; k < n; k++) await page.getByRole('button', { name: /^Prendre la photo/ }).click()
}

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
  await sansAppareil(page)
})

test('Aujourd’hui (gérante) : héros de la prochaine livraison, tuiles filtrées, tâches, gains et caisse du jour', async ({ page }) => {
  await ouvrir(page, '#accueil', R)
  await expect(page.getByRole('heading', { name: 'Bonjour Rose' })).toBeVisible()
  // 15 h 15 est à plus de PR-HEROS-FENETRE-MIN (60 min) : prochaine livraison, sans bouton (critère 1).
  await expect(page.getByText('PROCHAINE LIVRAISON')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Préparer la réception' })).toHaveCount(0)
  await expect(page.locator('a.p-cevv9w').first()).toHaveAttribute('href', /\/stock$/)
  await expect(page.locator('a.p-cevv9w').nth(1)).toHaveAttribute('href', /stock\?onglet=urgents/)
  await expect(page.getByText('Préparer la collecte de 15 h 25')).toBeVisible()
  await expect(page.getByText(/au dernier jour/).first()).toBeVisible()
  await expect(page.getByText('GAGNÉ CETTE SEMAINE')).toBeVisible()
  await expect(page.getByText('CAISSE DU JOUR')).toBeVisible()
  // « À faire maintenant » passe avant le héros de la livraison.
  const ordre = await page.locator('main').innerText()
  expect(ordre.indexOf('À faire maintenant')).toBeLessThan(ordre.indexOf('PROCHAINE LIVRAISON'))
  await page.getByText('Préparer la collecte de 15 h 25').click()
  await expect(page).toHaveURL(/\/departs$/)
})

test('Aujourd’hui (employé) : aucun montant du relais (ACC-05, ARL-06)', async ({ page }) => {
  await ouvrir(page, '#accueil?demo=employe', R)
  await expect(page.getByRole('heading', { name: 'Bonjour Paul' })).toBeVisible()
  await expect(page.getByText('GAGNÉ CETTE SEMAINE')).toHaveCount(0)
  const texte = await page.locator('main').innerText()
  expect(texte).not.toMatch(/FCFA|\d\s?F\b|caisse/)
  // Places libres : l'employé ne gère pas la capacité, la tuile ouvre le stock.
  await expect(page.locator('a.p-cevv9w').nth(3)).toHaveAttribute('href', /\/stock$/)
})

test('Aujourd’hui · relais neuf : premier jour, cartes pointillées, jamais de liste blanche (VID-01 à VID-04)', async ({ page }) => {
  await ouvrir(page, '#accueil?demo=neuf', R)
  await expect(page.getByRole('heading', { name: 'Bienvenue au relais !' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Votre premier jour' })).toBeVisible()
  await expect(page.getByText('Pas encore de gains')).toBeVisible()
  await expect(page.getByText('Trust Score : en construction')).toBeVisible()
})

test('Aujourd’hui · hors connexion : bannière, ce qui marche, file, réessayer (HLN-01 à HLN-05)', async ({ page, context }) => {
  await ouvrir(page, '#accueil', R)
  await context.setOffline(true)
  await expect(page.getByText(/Hors connexion/).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ce qui marche sans réseau' })).toBeVisible()
  await page.getByRole('button', { name: 'Réessayer l’envoi' }).click()
  await expect(page.getByText('Toujours hors connexion : l’envoi partira tout seul au retour du réseau.')).toBeVisible()
  await context.setOffline(false)
})

test('Réception : code faux, essais restants, puis saisie bloquée au 3e (REC-01)', async ({ page }) => {
  await ouvrir(page, '#reception', R)
  await saisirCode(page, '111111')
  await expect(page.getByText('Code incorrect · encore 2 essais')).toBeVisible()
  await saisirCode(page, '222222')
  await expect(page.getByText('Code incorrect · encore 1 essai')).toBeVisible()
  await saisirCode(page, '333333')
  await expect(page.getByText(/Saisie bloquée jusqu’à/).first()).toBeVisible()
  await expect(page.locator('.cpt-pave')).toHaveCount(0)
})

test('Réception : sans code, « Ne prenez pas le lot », rappel du support', async ({ page }) => {
  await ouvrir(page, '#reception', R)
  await page.getByRole('button', { name: 'Le livreur n’a pas de code ?' }).click()
  await expect(page.getByRole('heading', { name: 'Ne prenez pas le lot' })).toBeVisible()
  await page.getByRole('button', { name: 'Demander un rappel du support' }).click()
  await expect(page.locator('.r4-message')).toBeVisible()
})

test('Réception en continu : scans enchaînés sans quitter l’écran, emplacement proposé, réserve en feuille, « Terminer » signe le dépôt', async ({ page }) => {
  test.setTimeout(90_000)
  await ouvrir(page, '#reception', R)
  await expect(page.getByRole('button', { name: 'Valider le code' })).toHaveCount(0)
  await saisirCode(page, CODE)
  await expect(page.getByText('CODE DE DÉPÔT VALIDÉ', { exact: true })).toBeVisible()
  await expect(page.getByText('sur 4 colis scannés')).toBeVisible()
  // Étiquette d'un autre relais (PR-RC-04) : refusée au scan, rien n'est ajouté.
  await scannerRef(page, 'BLV-00017-1')
  await expect(page.getByText(/Pas pour votre relais/)).toBeVisible()
  for (const ref of ['BLV-00008-1', 'BLV-00009-1', 'BLV-00011-1', 'BLV-00014-1']) {
    await scannerRef(page, ref)
    await expect(page.getByText(new RegExp(ref + ' → rangez'))).toBeVisible()
    await expect(page.locator('#r4-colis-' + ref)).toContainText('scanné')
  }
  await expect(page).toHaveURL(/\/reception$/) // jamais quitté l'écran
  await expect(page.locator('.cpt-compteur b').first()).toHaveText('4')
  await expect(page.locator('#r4-colis-BLV-00014-1')).toContainText('remplacement')
  // Seule l'exception se touche : réserve avec photo (REC-03, DP-62).
  await page.locator('#r4-colis-BLV-00014-1').click()
  await page.getByRole('button', { name: 'Abîmé · je le garde avec réserve' }).click()
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles(PHOTO)
  await page.getByRole('button', { name: 'Garder avec réserve' }).click()
  await expect(page.locator('#r4-colis-BLV-00014-1')).toContainText('gardé avec réserve')
  // Terminer : récapitulatif, photo du lot, PIN (faux puis juste) au pavé.
  await page.getByRole('button', { name: 'Terminer' }).click()
  const f = page.getByRole('dialog')
  await expect(f.getByText('Reçus, scellé intact')).toBeVisible()
  await expect(f.getByText('Gardés avec réserve')).toBeVisible()
  await f.locator('input[type=file]').setInputFiles(PHOTO)
  for (const k of '000000') await f.getByRole('button', { name: k, exact: true }).click()
  await expect(f.getByText('PIN incorrect. Réessayez.')).toBeVisible()
  for (const k of PIN) await f.getByRole('button', { name: k, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Le livreur confirme le lot' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lot reçu · 4 colis' })).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL(new RegExp(`lot=${LOT}`))
  await expect(page.getByText('Clients prévenus')).toBeVisible()
  await page.getByRole('button', { name: 'Nouvelle réception' }).click()
  await saisirCode(page, CODE)
  await expect(page.getByText(/Lot déjà reçu/)).toBeVisible()
  await page.goto('./')
  await expect(page.getByText(/Garder 1 colis\s:\sclient pas encore prévenu/)).toBeVisible()
})

test('Réception : refus avec deux photos, colis inattendu, non scanné signalé absent à « Terminer »', async ({ page }) => {
  test.setTimeout(90_000)
  await ouvrir(page, '#reception', R)
  await saisirCode(page, CODE)
  await scannerRef(page, 'BLV-00009-1')
  await page.locator('#r4-colis-BLV-00009-1').click()
  await page.getByRole('button', { name: 'Je le refuse · il repart avec le livreur' }).click()
  const f = page.getByRole('dialog')
  await f.locator('input[type=file]').setInputFiles(PHOTO)
  await f.locator('input[type=file]').setInputFiles(PHOTO)
  await page.getByRole('button', { name: 'Refuser ce colis' }).click()
  await expect(page.locator('#r4-colis-BLV-00009-1')).toContainText('refusé')
  await scannerRef(page, 'BLV-00099-1')
  await expect(page.getByRole('dialog').getByText(/BLV-00099-1\s:\scolis inattendu/)).toBeVisible()
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles(PHOTO)
  await page.getByRole('button', { name: 'Signaler le colis inattendu' }).click()
  await expect(page.getByText(/BLV-00099-1 signalé inattendu/)).toBeVisible()
  await scannerRef(page, 'BLV-00008-1')
  await page.getByRole('button', { name: 'Terminer' }).click()
  await expect(page.getByRole('dialog').getByText(/Non scannés\s:\sBLV-00011-1, BLV-00014-1/)).toBeVisible()
  await expect(page.getByRole('dialog').getByText('Absents du lot')).toBeVisible()
})

test('Appareil photo : explication au premier usage, saisie à la main, type reconnu (CAM-01, CAM-02, CAM-05)', async ({ page }) => {
  await ouvrir(page, '#camera', R)
  await expect(page.getByRole('heading', { name: 'Autorisez l’appareil photo' })).toBeVisible()
  await page.getByRole('button', { name: 'Autoriser l’appareil photo' }).click()
  await page.getByRole('button', { name: 'Lampe' }).click()
  await expect(page.locator('.r4-annonce')).toContainText(/lampe/i)
  await page.getByRole('button', { name: 'Saisir le code à la main' }).click()
  await page.locator('#r4-saisie').fill('BLV-00006-1')
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page).toHaveURL(/\/colis\?ref=BLV-00006-1/)
})

test('Appareil photo : autorisation refusée, aide pour la réactiver (CAM-05)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => Promise.reject(Object.assign(new Error('refus'), { name: 'NotAllowedError' })) })
  })
  await ouvrir(page, '#camera?mode=photo&pour=lot&n=1', R)
  await page.getByRole('button', { name: 'Autoriser l’appareil photo' }).click()
  await expect(page.getByRole('heading', { name: 'L’appareil photo est refusé' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Prendre la photo/ })).toHaveCount(0)
})
