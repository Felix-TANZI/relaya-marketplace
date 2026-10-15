// Gestes de la remise (VD-06) : remise au livreur avec code, remis au livreur, reçu, erreurs de remise. Chaque geste
// écrit dans la source de démonstration (gardée sur l'appareil) et l'écran suit ; les montants viennent des calculs.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const code = (page: Page) => page.locator('.hero.night .code6')

async function pretEtCode(page: Page) {
  await ouvrir(page, '#commande_prete?ref=BLV-00008', FR)
  await page.locator('.hero.night').getByRole('button', { name: 'C’est prêt' }).click()
  await expect(page.locator('.meta .pill').first()).toHaveText('Prête à 09 h 48')
}

async function livreurSaisit(page: Page, valeur: string) {
  await page.getByRole('button', { name: 'Serge M. saisit le code' }).click()
  const champ = page.getByLabel('Code à 6 chiffres')
  await champ.fill(valeur)
  await page.getByRole('button', { name: 'Valider la remise' }).click()
}

test.describe('VD-06 · Remise', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('commande pas encore prête : « C’est prêt » crée le code ; le code est masqué, s’affiche au toucher en deux groupes, se masque', async ({ page }) => {
    await ouvrir(page, '#commande_prete?ref=BLV-00008', FR)
    await expect(page.locator('header')).toContainText('Remise · BLV-00008')
    // Livreur visible avant tout code (REM-02) ; aucun bouton plein orange (REM-08).
    await expect(page.locator('.hero.night')).toContainText('Serge M.')
    await expect(page.locator('.hero.night')).toContainText('Aujourd’hui entre 14 h et 16 h')
    await expect(page.locator('main .btn.primary')).toHaveCount(0)
    await expect(page.locator('.hero.night')).toContainText('Le code se crée quand la commande est prête.')
    await page.locator('.hero.night').getByRole('button', { name: 'C’est prêt' }).click()
    await expect(code(page)).toHaveClass(/mask/)
    await expect(code(page).locator('span')).toHaveText(['•', '•', '•', '•', '•', '•'])
    await page.getByRole('button', { name: 'Afficher le code' }).click()
    await expect(code(page).locator('span')).toHaveText(['4', '8', '1', '7', '2', '9'])
    await expect(page.locator('main')).toContainText('En attente de la saisie du code')
    await page.getByRole('button', { name: 'Masquer le code' }).click()
    await expect(code(page)).toHaveClass(/mask/)
    // « Comment ça marche » fermé à l'ouverture (VD06-R06).
    await expect(page.locator('details.more').first()).not.toHaveAttribute('open', '')
    // Code masqué à chaque nouvelle ouverture (REM-01).
    await page.getByRole('button', { name: 'Afficher le code' }).click()
    await page.reload()
    await expect(code(page)).toHaveClass(/mask/)
  })

  test('le livreur saisit le bon code : « Remis au livreur » s’ouvre seul, vous êtes couvert, deux photos, reçu', async ({ page }) => {
    await pretEtCode(page)
    await livreurSaisit(page, '481729')
    await expect(page).toHaveURL(/\/commande_remise\?ref=BLV-00008$/)
    await expect(page.locator('h1.pg-t')).toHaveText('Remis au livreur')
    await expect(page.locator('main')).toContainText('Serge M. a pris l’article aujourd’hui à 09 h 48.')
    await expect(page.locator('main')).toContainText('Vous êtes couvert')
    await expect(page.locator('.keep')).toContainText('17 840 F')
    await expect(page.locator('main')).toContainText('À découvert · 09 h 47')
    await expect(page.locator('main')).toContainText('Colis scellé · 09 h 48')
    await page.getByRole('button', { name: 'Agrandir : À découvert' }).click()
    await expect(page.locator('.sheet')).toContainText('Mvog-Ada')
    await page.keyboard.press('Escape')
    await page.getByRole('link', { name: 'Voir le reçu' }).click()
    await expect(page).toHaveURL(/\/recu\?ref=BLV-00008$/)
  })

  test('trois codes faux : remise bloquée 24 h, ne rien remettre ; le vendeur demande un nouveau code', async ({ page }) => {
    await pretEtCode(page)
    await livreurSaisit(page, '000001')
    await expect(page.locator('.sheet')).toContainText('Ce code ne correspond pas. Encore 2 essais.')
    const champ = page.getByLabel('Code à 6 chiffres')
    await champ.fill('000002')
    await page.getByRole('button', { name: 'Valider la remise' }).click()
    await expect(page.locator('.sheet')).toContainText('Dernier essai.')
    await champ.fill('000003')
    await page.getByRole('button', { name: 'Valider la remise' }).click()
    await page.keyboard.press('Escape')
    const carte = page.locator('[data-cas=bloque]')
    await expect(carte).toContainText('Remise bloquée 24 h')
    await expect(carte).toContainText('Trois codes faux ont été saisis. BelivaY est prévenu.')
    await expect(carte).toContainText('Débloquée demain (mardi 22) à 09 h 48')
    await expect(page.getByRole('button', { name: 'Afficher le code' })).toHaveCount(0)
    await carte.getByRole('button', { name: 'Demander un nouveau code' }).click()
    await expect(page.locator('main')).toContainText('Nouveau code demandé : l’ancien est annulé.')
    await expect(carte.getByRole('link', { name: 'Écrire au support' }).first()).toHaveAttribute('href', /messages\?fil=support&ref=BLV-00008/)
  })

  test('livreur absent et client qui annule : les cartes d’erreur avec leurs issues', async ({ page }) => {
    await pretEtCode(page)
    await page.getByRole('button', { name: 'Le livreur ne vient pas' }).click()
    const absent = page.locator('[data-cas=absent]')
    await expect(absent).toContainText('Le livreur n’est pas venu')
    await expect(absent).toContainText('Serge M. n’est pas passé entre 14 h et 16 h.')
    await expect(absent).toContainText('Il repasse demain (mardi 22) entre 14 h et 16 h')
    await expect(page.locator('.hero.night')).toContainText('Demain (mardi 22) entre 14 h et 16 h')
    await page.goto('erreurs')
    await expect(page.locator('main')).toContainText('BLV-00008 · Livreur absent')
    await ouvrir(page, '#commande_prete?ref=BLV-00009', FR)
    await page.getByRole('button', { name: 'Le client annule' }).click()
    const annulee = page.locator('[data-cas=annulee]')
    await expect(annulee).toContainText('Annulée par le client')
    await expect(annulee).toContainText('Le stock réservé vous est rendu')
    await expect(page.locator('.hero.night')).toHaveCount(0)
    await annulee.getByRole('link', { name: 'Retour aux commandes' }).click()
    await expect(page).toHaveURL(/\/commandes$/)
  })

  test('pas de réseau : le code reste lisible, la carte le dit', async ({ page, context }) => {
    await pretEtCode(page)
    await context.setOffline(true)
    const carte = page.locator('[data-cas=reseau]')
    await expect(carte).toContainText('Le code de remise marche quand même : donnez-le au livreur.')
    await expect(carte).toContainText('« C’est prêt » partira au retour du réseau, avec son heure d’origine (09 h 48)')
    await carte.getByRole('button', { name: 'Afficher le code' }).click()
    await expect(code(page).locator('span')).toHaveText(['4', '8', '1', '7', '2', '9'])
    await context.setOffline(false)
    await expect(carte).toHaveCount(0)
  })

  test('erreurs : la remise bloquée en ce moment ; six cas, chacun avec un seul bouton plein qui mène où l’action se fait', async ({ page }) => {
    await ouvrir(page, '#erreurs', FR)
    await expect(page.locator('h1.pg-t')).toHaveText('Quand la remise bloque')
    // BLV-00010 devait être prête samedi 19 avant 14 h : seule commande en retard du jeu d'essai.
    await expect(page.locator('main')).toContainText('En ce momentBLV-00010 · Délai dépassé')
    await expect(page.locator('main')).not.toContainText('Aucune remise bloquée')
    await expect(page.locator('.chips .chip')).toHaveText(['Livreur absent', 'Remise bloquée', 'Annulée', 'Délai dépassé', 'Pas de réseau', 'Colis de valeur'])
    for (const [puce, titre] of [
      ['Livreur absent', 'Le livreur n’est pas venu'],
      ['Remise bloquée', 'Remise bloquée 24 h'],
      ['Annulée', 'Annulée par le client'],
      ['Délai dépassé', 'Délai dépassé'],
      ['Pas de réseau', 'Pas de réseau'],
      ['Colis de valeur', 'Colis de valeur : livreur Or'],
    ]) {
      await page.locator('.chips').getByText(puce, { exact: true }).click()
      const carte = page.locator('main .card[data-cas]')
      await expect(carte).toContainText(titre)
      await expect(carte.locator('.btn.primary')).toHaveCount(1)
      await expect(carte.locator('details.more')).not.toHaveAttribute('open', '')
      await expect(carte).not.toContainText(/\b(E\d|g\d|V\d\d)\b/)
    }
    await expect(page.locator('main .card[data-cas=plafond]')).toContainText('iPhone 15 Pro Max')
    await expect(page.locator('main .card[data-cas=plafond]')).toContainText('Ce colis vaut 350 000 F')
    await page.locator('main .card[data-cas=plafond] .btn.primary').click()
    await expect(page).toHaveURL(/\/commandes\?f=prep$/)
  })

  test('reçu : prix et « vous gardez », identité masquée, un seul bouton plein, PDF ; liste des reçus avec recherche', async ({ page }) => {
    await ouvrir(page, '#recu', FR)
    await expect(page.locator('header')).toContainText('Reçu · BLV-00008')
    const carte = page.locator('main .card').first()
    await expect(carte).toContainText('20 000 F')
    await expect(carte).toContainText('17 840 F')
    await expect(carte).toContainText('Identité masquée')
    await expect(carte).toContainText('ni nom, ni numéro, ni adresse, ni relais')
    await expect(carte).toContainText('Mobile Money')
    await expect(carte).not.toContainText(/commission/i)
    await expect(page.locator('main .btn.primary')).toHaveCount(1)
    const telechargement = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Télécharger le PDF' }).click()
    expect((await telechargement).suggestedFilename()).toBe('recu-BLV-00008.pdf')
    await page.locator('.vx-chips').getByRole('link', { name: 'BLV-00011' }).click()
    await expect(page.locator('header')).toContainText('Reçu · BLV-00011')
    await page.locator('.vx-chips').getByRole('button', { name: 'Tous' }).click()
    await page.getByLabel('Chercher un reçu').fill('00003')
    await expect(page.locator('.sheet .li')).toHaveCount(1)
    await page.locator('.sheet .li').click()
    await expect(page.locator('header')).toContainText('Reçu · BLV-00003')
    await expect(page.locator('main')).toContainText('Libéré · versé le ven. 25 sept. 2026')
    await page.locator('.vx-chips').getByRole('button', { name: 'Tous' }).click()
    await page.getByLabel('Chercher un reçu').fill('00002')
    await expect(page.locator('.sheet .li')).toHaveCount(1)
    await page.locator('.sheet .li').click()
    await expect(page.locator('header')).toContainText('Reçu · BLV-00002')
  })

  test('reçu : payable au retrait sans reçu tant que rien n’est encaissé ; accès Préparation : réservé au propriétaire', async ({ page }) => {
    await ouvrir(page, '#recu?ref=BLV-00009', FR)
    await expect(page.locator('main')).toContainText('Pas encore de reçu')
    await ouvrir(page, '#recu?role=prep', FR)
    await expect(page.locator('main')).toContainText('Réservé au propriétaire')
    await expect(page.locator('main')).not.toContainText(/\d F\b/)
  })

  test('accès Préparation : remet le colis, sans aucun montant', async ({ page }) => {
    await ouvrir(page, '#commande_prete?ref=BLV-00008&role=prep', FR)
    await page.locator('.hero.night').getByRole('button', { name: 'C’est prêt' }).click()
    await page.getByRole('button', { name: 'Afficher le code' }).click()
    await expect(code(page).locator('span')).toHaveText(['4', '8', '1', '7', '2', '9'])
    await expect(page.locator('main')).not.toContainText(/\d F\b/)
  })

  test('anglais : textes et heures à l’anglaise', async ({ page }) => {
    await ouvrir(page, '#commande_prete?ref=BLV-00008', { nom: 'anglais', theme: 'light', lang: 'en' })
    await expect(page.locator('header')).toContainText('Handover · BLV-00008')
    await expect(page.locator('.hero.night')).toContainText('Today between 2 and 4 pm')
    await ouvrir(page, '#recu', { nom: 'anglais', theme: 'dark', lang: 'en' })
    await expect(page.locator('main .card').first()).toContainText('17,840 F')
    await expect(page.locator('main')).toContainText('Identity hidden')
  })
})
