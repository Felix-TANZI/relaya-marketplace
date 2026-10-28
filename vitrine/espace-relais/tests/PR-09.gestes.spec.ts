// Gestes des écrans PR-09 (Argent et performance) : versements et relevé (part BelivaY des espèces déduite, retenue
// fiscale 0 %, réclamation), dette (reportée, à reverser), refus répétés, changement de numéro (préfixe, deux codes,
// vérification par une personne, versement suspendu, annulation, réseau obligatoire), rapports (périodes, export),
// Trust Score (critères, alerte de seuil, contestation une fois), avis (réponse privée, signalement), paliers (rien
// d'après le lancement), et l'employé qui reçoit « Accès réservé au gérant » partout.
import { expect, test } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const main = '#app main'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('versements : net prévu calculé, relevé ligne par ligne avec la part BelivaY des espèces et la retenue fiscale à 0 %', async ({ page }) => {
  await ouvrir(page, '#versements', FR)
  const m = page.locator(main)
  await expect(m).toContainText('PRÉVU · VENDREDI 16 OCTOBRE')
  await expect(m).toContainText('Provisoire : se met à jour à chaque remise')
  await expect(m).toContainText('Gagné cette semaine')
  await expect(m).toContainText('Espèces de garde : part BelivaY')
  await expect(m).toContainText('Retenue fiscale')
  await expect(page.getByRole('table', { name: 'Le détail de la semaine' })).toBeVisible()
  // Le net de la carte = le net du tableau.
  const net = (await page.locator('.p-rpadgd').innerText()).replace(/\D/g, '')
  const total = (await page.locator('.p-ovpzya .p-exl0y8').innerText()).replace(/\D/g, '')
  expect(net).toBe(total)
  await expect(m).toContainText('Reçus en octobre')
  await expect(m).toContainText('BLV-VP-0141')
})

test('relevé : une semaine passée s’ouvre avec sa référence ; « Versement non reçu » signalé une fois, réponse avant lundi midi', async ({ page }) => {
  await ouvrir(page, '#versements', FR)
  await page.getByRole('link', { name: /BLV-VP-0141/ }).click()
  await expect(page).toHaveURL(/releve\?v=V-2026-10-02/)
  await expect(page.locator(main)).toContainText('Versement du vendredi 9 octobre')
  await expect(page.locator(main)).toContainText('12 969 F')
  await page.getByRole('button', { name: 'Signaler un versement non reçu' }).click()
  await expect(page.locator(main)).toContainText('BelivaY vous répond lundi 19 oct.')
  await expect(page.getByRole('button', { name: 'Signaler un versement non reçu' })).toHaveCount(0)
  await page.goto('releve')
  await expect(page.locator(main)).toContainText('Toutes les semaines')
  await expect(page.locator('.r9-liste li')).toHaveCount(18)
})

test('dette reportée : solde négatif de la semaine passée déduit du prochain versement', async ({ page }) => {
  await ouvrir(page, '#versements?versement=dette', FR)
  await expect(page.locator(main)).toContainText('Dette reportée')
  await expect(page.locator(main)).toContainText('Report de la semaine précédente')
})

test('espèces à reverser : deux semaines négatives, échéance dépassée, encaissement suspendu, paiement Mobile Money', async ({ page }) => {
  await ouvrir(page, '#versements?versement=reverser', FR)
  const carte = page.getByRole('region', { name: 'Espèces à reverser' })
  await expect(carte).toContainText('BLV-DR-0141')
  await expect(carte).toContainText('l’encaissement des gardes est suspendu')
  await carte.getByRole('button', { name: /Payer .* par Mobile Money/ }).click()
  await expect(page.locator(main)).toContainText('Espèces reversées.')
  await expect(page.getByRole('region', { name: 'Espèces à reverser' })).toHaveCount(0)
})

test('refus répétés : motif, essais, suspendu et appel du support', async ({ page }) => {
  await ouvrir(page, '#versements?versement=refuse', FR)
  await page.getByRole('link', { name: /Versement refusé · BLV-VP-0141/ }).click()
  await expect(page.locator(main)).toContainText('Refusé par l’opérateur : numéro au nom d’un tiers.')
  await expect(page.locator(main)).toContainText('4 essais refusés : versement suspendu')
})

test('changer de numéro : préfixe, deux codes, vérification par une personne, versement suspendu puis annulé', async ({ page }) => {
  await ouvrir(page, '#changer-momo', FR)
  const m = page.locator(main)
  await page.getByRole('button', { name: 'Orange Money' }).click()
  await page.getByLabel('NUMÉRO').fill('677 40 21 18')
  await expect(m).toContainText('Ce préfixe ne correspond pas à l’opérateur choisi.')
  await expect(page.getByRole('button', { name: 'Recevoir les deux codes' })).toBeDisabled()
  await page.getByRole('button', { name: 'MTN MoMo' }).click()
  await page.getByRole('button', { name: 'Recevoir les deux codes' }).click()
  await expect(m).toContainText('Deux codes à 6 chiffres sont partis par SMS')
  await page.getByLabel('CODE REÇU AU NOUVEAU NUMÉRO').fill('111111')
  await page.getByLabel('CODE REÇU SUR VOTRE TÉLÉPHONE').fill('481920')
  await page.getByRole('button', { name: 'Valider le numéro' }).click()
  await expect(m).toContainText('Un des deux codes est faux.')
  await page.getByLabel('CODE REÇU AU NOUVEAU NUMÉRO').fill('481920')
  await page.getByRole('button', { name: 'Valider le numéro' }).click()
  await expect(m).toContainText('Nouveau numéro enregistré')
  await expect(m).toContainText('le vendredi 23 octobre')
  await expect(m).toContainText('MTN ···· 8350') // l'ancien numéro reste actif : jamais effectif tout de suite
  await page.getByRole('link', { name: 'Retour aux versements' }).click()
  await expect(page.locator('.p-svzvpz')).toContainText('SUSPENDU')
  await expect(m).toContainText('versé le vendredi 23 octobre, rien n’est perdu')
  await page.getByRole('link', { name: 'Voir le changement en cours' }).click()
  await page.getByRole('button', { name: 'Annuler ce changement' }).click()
  await page.getByRole('button', { name: 'Oui, annuler le changement' }).click()
  await expect(page.getByRole('button', { name: 'Recevoir les deux codes' })).toBeVisible()
})

test('changer de numéro hors connexion : jamais sans réseau', async ({ page, context }) => {
  await ouvrir(page, '#changer-momo', FR)
  await page.getByLabel('NUMÉRO').fill('677402118')
  await context.setOffline(true)
  await expect(page.locator(main)).toContainText('un changement de numéro ne se fait jamais sans réseau')
  await expect(page.getByRole('button', { name: 'Recevoir les deux codes' })).toBeDisabled()
  await context.setOffline(false)
})

test('rapports : la période change le graphique et le total ; total = somme des colonnes ; export CSV', async ({ page }) => {
  await ouvrir(page, '#rapports', FR)
  await expect(page.locator('.p-ch33fq')).toHaveText('GAGNÉ EN OCTOBRE')
  const mois = await page.locator('.p-2je1sf').innerText()
  await page.getByRole('tab', { name: 'Trimestre' }).click()
  await expect(page.getByRole('tab', { name: 'Trimestre' })).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(/periode=trimestre/)
  await expect(page.locator('.p-ch33fq')).toHaveText('GAGNÉ CE TRIMESTRE')
  expect(await page.locator('.p-2je1sf').innerText()).not.toBe(mois)
  await expect(page.locator('.p-zf2e7o .p-4vlkma')).toHaveCount(3)
  const telechargement = page.waitForEvent('download')
  await page.getByRole('button', { name: /Relevé d’activité · CSV/ }).click()
  expect((await telechargement).suggestedFilename()).toMatch(/\.csv$/)
})

test('Trust Score : 78, cinq critères pondérés, jamais montré au client ; contester un événement une fois', async ({ page }) => {
  await ouvrir(page, '#trust', FR)
  await expect(page.getByRole('img', { name: 'Trust Score 78 sur 100' })).toBeVisible()
  await expect(page.locator('.p-jrtuf6')).toHaveCount(5)
  await expect(page.locator(main)).toContainText('Jamais montré aux clients')
  await page.getByRole('link', { name: 'Tout le journal et contester' }).click()
  await expect(page).toHaveURL(/trust-journal/)
  await page.getByRole('button', { name: /Contester · jusqu’au vendredi 16/ }).click()
  await page.getByLabel('VOTRE EXPLICATION').fill('La photo a été prise, l’envoi était resté en file hors connexion.')
  await page.getByRole('button', { name: 'Envoyer la contestation' }).click()
  await expect(page.locator(main)).toContainText('Contestation en examen · effet suspendu')
  await expect(page.getByRole('button', { name: /Contester · jusqu’au vendredi 16/ })).toHaveCount(0)
})

test('alerte de seuil (ARL-15) et sanction proposée à contester', async ({ page }) => {
  await ouvrir(page, '#trust?trust=alerte', FR)
  await expect(page.locator(main)).toContainText('À 2 points du seuil de 70.')
  await page.goto('trust?trust=sanction')
  await expect(page.locator(main)).toContainText('Sanction niveau 2 · Visibilité réduite · proposée par le calcul')
  await page.getByRole('link', { name: 'Contester', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Contester' })).toBeVisible()
})

test('avis : note, 58 avis anonymes ; réponse privée puis signalement', async ({ page }) => {
  await ouvrir(page, '#avis', FR)
  await expect(page.locator('.p-f42sy9')).toHaveText('4,6')
  await expect(page.locator(main)).toContainText('58 avis · 30 derniers jours')
  await page.locator('.r9-bulle').first().click()
  const f = page.getByRole('dialog', { name: 'Avis d’un client' })
  await f.getByLabel('VOTRE RÉPONSE').fill('Merci pour votre passage !')
  await f.getByRole('button', { name: 'Envoyer la réponse privée' }).click()
  await expect(f).toContainText('Votre réponse du')
  await f.getByRole('radio', { name: 'Hors-sujet' }).click()
  await f.getByRole('button', { name: 'Signaler à BelivaY' }).click()
  await expect(f).toContainText('BelivaY examine')
})

test('paliers : Confirmé tenu, rien d’après le lancement (ARL-16)', async ({ page }) => {
  await ouvrir(page, '#paliers', FR)
  await expect(page.locator('.p-9f8cs4').nth(1)).toContainText('Votre palier')
  await expect(page.locator(main)).not.toContainText('+25 F')
  await expect(page.locator(main)).not.toContainText('ambassadeur')
})

test('employé de comptoir : « Accès réservé au gérant » sur chaque écran PR-09', async ({ page }) => {
  await ouvrir(page, '#versements?demo=employe', FR)
  for (const r of ['versements', 'releve', 'changer-momo', 'rapports', 'trust', 'trust-journal', 'avis', 'paliers']) {
    await page.goto(r)
    await expect(page.getByRole('heading', { name: 'Accès réservé au gérant' }), r).toBeVisible()
  }
})
