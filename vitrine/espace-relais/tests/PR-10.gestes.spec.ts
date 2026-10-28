// Gestes des écrans PR-10 (Mon relais) : Menu selon le rôle, demandes de capacité et d'horaires, équipe (code SMS,
// retrait, droits), documents et convention, formation (quiz corrigé au serveur), paramètres (langue, thème, PIN,
// données, fin de convention, déconnexion) ; droits du gérant et de l'employé.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const main = '#app main'
const feuille = '.sheet'
// Données de démonstration (src/demo/jeu-essai.ts) : code SMS du téléphone du gérant et PIN des membres.
const CODE_SMS = '481920'
const PIN = '240913'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

const lien = (page: Page, nom: string | RegExp) => page.locator(main).getByRole('link', { name: nom })

test('menu du gérant : tout le relais ; se déconnecter mène à la connexion', async ({ page }) => {
  await ouvrir(page, '#menu', FR)
  for (const e of ['Capacité et horaires', 'Documents', 'Mon équipe', 'Versements', 'Formation', 'Statut du relais']) await expect(lien(page, e)).toBeVisible()
  await expect(lien(page, 'Caméra')).toHaveCount(0)
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page.locator(feuille)).toContainText('Se déconnecter ?')
  await page.locator(feuille).getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/connexion/)
})

test('menu de l’employé : ni argent ni gestion (MEN-01) ; capacité, équipe et documents refusés', async ({ page }) => {
  await ouvrir(page, '#menu?demo=employe', FR)
  await expect(page.locator(main)).toContainText('Paul Essomba, employé de comptoir')
  for (const e of ['Capacité et horaires', 'Documents', 'Mon équipe', 'Versements', 'Rapports', 'Activation et partenariat']) await expect(lien(page, e)).toHaveCount(0)
  await expect(lien(page, 'Formation')).toBeVisible()
  for (const r of ['capacite', 'equipe', 'documents', 'documents?doc=annexe3'])
    await ouvrir(page, '#' + r, FR).then(() => expect(page.getByRole('heading', { name: 'Accès réservé au gérant' })).toBeVisible())
})

test('capacité : hausse demandée à BelivaY, annulable ; jamais sous les places occupées', async ({ page }) => {
  await ouvrir(page, '#capacite', FR)
  const envoyer = page.getByRole('button', { name: 'Demander ces changements' })
  await expect(envoyer).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('button', { name: 'Ajouter une place' }).click()
  await page.getByRole('button', { name: 'Ajouter une place' }).click()
  await expect(page.locator(main)).toContainText('places demandées · 60 déclarées')
  await envoyer.click()
  await expect(page.locator(main)).toContainText('Demande de hausse envoyée à BelivaY.')
  await expect(page.locator(main)).toContainText('62 places')
  await expect(page.locator(main)).toContainText('revue à distance par BelivaY')
  await expect(page.getByRole('button', { name: 'Ajouter une place' })).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('button', { name: 'Annuler la demande de places' }).click()
  await expect(page.locator(main)).toContainText('places déclarées · 35 occupées')
  // CAP-01 : le − s'arrête aux places occupées.
  const moins = page.getByRole('button', { name: 'Retirer une place' })
  for (let i = 0; i < 25; i++) await moins.click()
  await expect(page.locator('.p-nu35xx')).toHaveText('35')
  await expect(moins).toHaveAttribute('aria-disabled', 'true')
  await expect(page.locator(main)).toContainText('vous n’êtes plus proposé aux nouveaux clients')
})

test('horaires : ouvrir le dimanche est une demande, les horaires en vigueur restent', async ({ page }) => {
  await ouvrir(page, '#capacite', FR)
  await page.getByRole('switch', { name: 'Dimanche : ouvert' }).click()
  await expect(page.locator(feuille)).toContainText('Dimanche')
  await page.locator(feuille).getByLabel('OUVERTURE').fill('09:00')
  await page.locator(feuille).getByLabel('FERMETURE').fill('13:00')
  await page.locator(feuille).getByRole('button', { name: 'Garder ces heures' }).click()
  await expect(page.getByRole('switch', { name: 'Dimanche : ouvert' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Demander ces changements' }).click()
  await expect(page.locator(main)).toContainText('Nouveaux horaires demandés le')
  await expect(page.getByRole('switch', { name: 'Lundi : ouvert' })).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('button', { name: 'Annuler la demande d’horaires' }).click()
  await expect(page.getByRole('switch', { name: 'Dimanche : ouvert' })).toHaveAttribute('aria-checked', 'false')
})

test('équipe : inviter avec le code SMS du gérant, régler ses droits, retirer un accès', async ({ page }) => {
  await ouvrir(page, '#equipe', FR)
  await expect(page.locator(main)).toContainText('Ajouter une personne · 1 / 3')
  await page.getByRole('button', { name: /Ajouter une personne/ }).click()
  await page.getByLabel('PRÉNOM ET NOM').fill('Nadine Owona')
  await page.getByLabel('NUMÉRO DE TÉLÉPHONE').fill('691 22 33 44')
  await page.getByRole('button', { name: 'Fermeture imprévue du jour' }).click()
  await page.getByRole('button', { name: 'Envoyer l’invitation' }).click()
  await expect(page.locator(feuille)).toContainText('Confirmer l’invitation')
  await page.locator(feuille).getByLabel('CODE REÇU PAR SMS').fill('000000')
  await page.locator(feuille).getByRole('button', { name: 'Envoyer l’invitation' }).click()
  await expect(page.locator(feuille)).toContainText('Code SMS faux ou expiré')
  await page.locator(feuille).getByLabel('CODE REÇU PAR SMS').fill(CODE_SMS)
  await page.locator(feuille).getByRole('button', { name: 'Envoyer l’invitation' }).click()
  await expect(page.locator(main)).toContainText('Nadine O.')
  await expect(page.locator(main)).toContainText('Formation 0/5 · ne remet pas encore')
  await expect(page.locator(main)).toContainText('Ajouter une personne · 2 / 3')
  // Droits de Paul : la fermeture imprévue du jour lui est donnée.
  await page.getByRole('region', { name: 'Paul Essomba' }).getByRole('button', { name: 'Modifier ses droits' }).click()
  await page.locator(feuille).getByRole('switch', { name: 'Fermeture imprévue du jour' }).click()
  await page.locator(feuille).getByRole('button', { name: 'Enregistrer ses droits' }).click()
  await expect(page.getByRole('region', { name: 'Paul Essomba' })).not.toContainText('Fermeture imprévue du jour · non')
  // Retrait : code SMS, Paul et son téléphone disparaissent.
  await page.getByRole('switch', { name: 'Accès de Paul E.' }).click()
  await page.locator(feuille).getByLabel('CODE REÇU PAR SMS').fill(CODE_SMS)
  await page.locator(feuille).getByRole('button', { name: 'Retirer l’accès' }).click()
  await expect(page.getByRole('region', { name: 'Paul Essomba' })).toHaveCount(0)
  await expect(page.locator('#p10-appareils')).not.toContainText('Itel A70')
})

test('équipe : appareil déconnecté à distance ; PIN d’un employé réinitialisé', async ({ page }) => {
  await ouvrir(page, '#equipe?voir=appareils', FR)
  await page.locator('#p10-appareils').getByRole('button', { name: 'Déconnecter' }).click()
  await expect(page.locator('#p10-appareils')).not.toContainText('Itel A70')
  await page.getByRole('button', { name: 'Nouveau PIN' }).click()
  await page.locator(feuille).getByRole('button', { name: 'Envoyer le SMS' }).click()
  await expect(page.locator(main)).toContainText('SMS de nouveau PIN envoyé.')
})

test('documents : une pièce vérifiée se voit ; le NIU facultatif s’ajoute ; convention et fiche d’ouverture', async ({ page }) => {
  await ouvrir(page, '#documents', FR)
  await expect(page.locator(main)).toContainText('Dossier complet')
  await expect(page.getByRole('button', { name: /^Renvoyer/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Voir : Pièce d’identité' }).click()
  await expect(page.locator(feuille)).toContainText('Jamais montrée aux clients ni aux vendeurs')
  await expect(page.locator(feuille).getByRole('button', { name: 'Renvoyer la pièce' })).toHaveCount(0)
  await page.locator(feuille).getByRole('button', { name: 'Fermer' }).last().click()
  await page.getByRole('button', { name: 'Ajouter : NIU / patente' }).click()
  const choix = page.waitForEvent('filechooser')
  await page.locator(feuille).getByRole('button', { name: 'Ajouter la pièce' }).click()
  await (await choix).setFiles({ name: 'niu.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff]) })
  await expect(page.locator(main)).toContainText('Pièce envoyée')
  await expect(page.locator(main)).toContainText('En vérification')
  await lien(page, /Annexe 3/).click()
  await expect(page.locator(main)).toContainText('Partenaire fondateur')
  await expect(page.locator(main)).toContainText('hors capacité')
})

test('formation : quiz corrigé au serveur, module compté seulement au seuil', async ({ page }) => {
  await ouvrir(page, '#formation?module=m3', FR)
  await expect(page.locator(main)).toContainText('La garde en espèces')
  await page.getByRole('button', { name: /passer au quiz/ }).click()
  const groupes = page.getByRole('radiogroup')
  await groupes.nth(0).getByLabel('Il paie par Mobile Money').check()
  await groupes.nth(1).getByLabel('En espèces').check()
  await groupes.nth(2).getByLabel('J’encaisse en espèces').check()
  await page.getByRole('button', { name: 'Valider mes réponses' }).click()
  await expect(page.locator(main)).toContainText('0 % de bonnes réponses, 80 % demandés')
  await groupes.nth(0).getByLabel(/Il paie en espèces/).check()
  await groupes.nth(1).getByLabel('En Mobile Money seulement').check()
  await groupes.nth(2).getByLabel('La remise attend le réseau').check()
  await page.getByRole('button', { name: 'Valider mes réponses' }).click()
  await expect(page.locator(main)).toContainText('Module terminé · 100 %')
})

test('formation de l’employé : sa propre progression, ouverte sans droit de gestion', async ({ page }) => {
  await ouvrir(page, '#formation?demo=employe', FR)
  await expect(page.locator(main)).toContainText('Formation terminée')
  await expect(lien(page, 'Voir la formation de mon équipe')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Télécharger l’attestation' })).toBeVisible()
})

test('paramètres : langue, thème, PIN, données et fin de convention demandée puis annulée', async ({ page }) => {
  await ouvrir(page, '#parametres', FR)
  await page.getByRole('switch', { name: 'Thème sombre' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  // Mon code PIN : l'ancien faux est refusé, puis changé.
  await page.getByRole('button', { name: /Mon code PIN/ }).click()
  await page.locator(feuille).getByLabel('PIN ACTUEL').fill('111222')
  await page.locator(feuille).getByLabel('NOUVEAU PIN', { exact: true }).fill('482915')
  await page.locator(feuille).getByLabel('NOUVEAU PIN, ENCORE UNE FOIS').fill('482915')
  await page.locator(feuille).getByRole('button', { name: 'Enregistrer mon PIN' }).click()
  await expect(page.locator(feuille)).toContainText('PIN actuel faux.')
  await page.locator(feuille).getByLabel('PIN ACTUEL').fill(PIN)
  await page.locator(feuille).getByRole('button', { name: 'Enregistrer mon PIN' }).click()
  await expect(page.locator(main)).toContainText('Nouveau PIN enregistré')
  // Mes données : demandées, prêtes sous le délai.
  await page.getByRole('button', { name: /Mes données/ }).click()
  await page.locator(feuille).getByRole('button', { name: /Demander mes données/ }).click()
  await expect(page.locator(feuille)).toContainText('votre export arrive dans l’application au plus tard le')
  await page.locator(feuille).getByRole('button', { name: 'Fermer' }).last().click()
  // Fin de la convention : demandée avec motif, annulée.
  await page.getByRole('button', { name: /Demander la fin de la convention/ }).click()
  await page.locator(feuille).getByLabel('Je déménage').check()
  await page.locator(feuille).getByRole('button', { name: 'Envoyer ma demande de fin' }).click()
  await expect(page.locator(feuille)).toContainText('Demandée le')
  await page.locator(feuille).getByRole('button', { name: 'Annuler ma demande, je continue' }).click()
  await expect(page.locator(main)).toContainText('Avec un préavis de 30 jours')
  // Langue : anglais tout de suite.
  await page.getByRole('radio', { name: 'English' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator(main)).toContainText('Display and app')
})

test('paramètres de l’employé : son compte, sans la gestion du relais', async ({ page }) => {
  await ouvrir(page, '#parametres?demo=employe', FR)
  await expect(page.locator(main)).toContainText('Employé de comptoir')
  for (const x of [/Demander la fin de la convention/, /Demander une modification/]) await expect(page.getByRole('button', { name: x })).toHaveCount(0)
  for (const x of ['Numéro de versement', 'Appareils connectés', 'Horaires déclarés']) await expect(page.locator(main)).not.toContainText(x)
  await expect(page.getByRole('button', { name: /Mes données/ })).toBeVisible()
})
