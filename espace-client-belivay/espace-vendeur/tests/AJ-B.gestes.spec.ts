// Gestes des pages AJ-B (DP-58) : Mon profil, Rechercher, Ramassages, Apprendre, Activité de la boutique, Mes
// ajustements. Chaque geste passe par la source de démonstration et l'écran le suit ; accès Préparation sans montant.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const EN = { nom: 'anglais', theme: 'light', lang: 'en' } as const
const main = (page: Page) => page.locator('#app main')

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test.describe('AJ-B · Mon profil', () => {
  test('l’avatar mène à Mon profil ; téléphone changé avec deux codes ; présentation filtrée puis enregistrée', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await page.locator('header.hd .avatar').click()
    await page.locator('.pm a.r', { hasText: 'Mon profil' }).click()
    await expect(page).toHaveURL(/\/profil$/)
    await expect(page.locator('.hero.night')).toContainText('Franck Penga')
    await expect(page.locator('.hero.night')).toContainText('Propriétaire · identité vérifiée')
    await page.getByRole('button', { name: 'Changer mon téléphone personnel' }).click()
    await page.getByLabel('Nouveau numéro').fill('612')
    await page.getByRole('button', { name: 'Recevoir le code' }).click()
    await expect(page.locator('.sheet')).toContainText('Numéro camerounais à 9 chiffres')
    await page.getByLabel('Nouveau numéro').fill('699 88 77 66')
    await page.getByRole('button', { name: 'Recevoir le code' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Confirmer' }).click()
    await expect(page.locator('[data-annonce]')).toContainText('Téléphone personnel changé.')
    await expect(main(page)).toContainText('6•• •• •• 66')
    const bio = page.getByLabel(/Facultatif/)
    await bio.fill('Appelez-moi au 699 88 77 66')
    await page.getByRole('button', { name: 'Enregistrer la présentation' }).click()
    await expect(main(page)).toContainText('Pas de numéro, d’e-mail ni de lien')
    await bio.fill('Téléphones neufs depuis 2019, à Mvog-Mbi.')
    await page.getByRole('button', { name: 'Enregistrer la présentation' }).click()
    await expect(page.locator('[data-annonce]')).toContainText('Présentation enregistrée.')
    await page.reload()
    await expect(page.getByLabel(/Facultatif/)).toHaveValue('Téléphones neufs depuis 2019, à Mvog-Mbi.')
  })

  test('accès Préparation : son rôle et ses limites, son nom changé avec un code, aucun montant', async ({ page }) => {
    await ouvrir(page, '#profil?role=prep', FR)
    await expect(page.locator('.hero.night')).toContainText('Accès Préparation')
    await expect(main(page)).toContainText('Aucun montant visible, rien à acheter')
    await expect(main(page)).not.toContainText(/\d F\b/)
    await page.getByRole('button', { name: 'Changer mon nom' }).click()
    await page.getByLabel('Prénom').fill('Aïcha')
    await page.getByLabel('Nom', { exact: true }).fill('Ndongo')
    await page.getByRole('button', { name: 'Recevoir le code' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Confirmer' }).click()
    await expect(page.locator('.hero.night')).toContainText('Aïcha Ndongo')
  })
})

test.describe('AJ-B · Rechercher', () => {
  test('référence exacte en tête, résultats groupés, récents gardés, raccourcis', async ({ page }) => {
    await ouvrir(page, '#menu', FR)
    await page.getByRole('searchbox', { name: 'Chercher dans le menu' }).fill('BLV-00005')
    await page.getByRole('link', { name: /Chercher « BLV-00005 » partout/ }).click()
    await expect(page).toHaveURL(/\/recherche\?q=BLV-00005$/)
    await expect(page.locator('.divider-t').first()).toContainText('Commandes · 1')
    await expect(main(page)).toContainText('Référence exacte')
    await expect(page.locator('.divider-t', { hasText: 'Litiges' })).toBeVisible()
    await page.getByRole('searchbox', { name: 'Rechercher partout' }).fill('itel')
    // « itel » : ITEL AC52 noir et bleu, ITEL AC52 · 64 Go, Coque ITEL AC52 (toutes les offres, quel que soit leur état).
    await expect(page.locator('.divider-t', { hasText: 'Produits · 4' })).toBeVisible()
    await page.getByRole('searchbox', { name: 'Rechercher partout' }).fill('BLV-VS-4085')
    await expect(page.locator('.divider-t').first()).toContainText('Versements · 1')
    await page.getByRole('searchbox', { name: 'Rechercher partout' }).press('Enter')
    await expect(page).toHaveURL(/\/versements\?periode=tout$/)
    await page.goto('recherche')
    await expect(main(page)).toContainText('Recherches récentes')
    await expect(main(page)).toContainText('BLV-VS-4085')
    await page.getByRole('searchbox', { name: 'Rechercher partout' }).fill('zzzz')
    await expect(main(page)).toContainText('Rien pour « zzzz »')
  })

  test('accès Préparation : ni versements ni montants', async ({ page }) => {
    await ouvrir(page, '#recherche?role=prep&q=BLV-VS', FR)
    await expect(page.locator('.divider-t', { hasText: 'Versements' })).toHaveCount(0)
    await expect(main(page)).not.toContainText(/\d F\b/)
  })
})

test.describe('AJ-B · Ramassages', () => {
  test('passage du jour, commandes à préparer, « C’est prêt » les fait passer à remettre', async ({ page }) => {
    await ouvrir(page, '#ramassages', FR)
    await expect(page.locator('.ajb-prochain')).toContainText('Aujourd’hui · 14 h – 16 h')
    await expect(page.locator('.ajb-jour')).toHaveCount(1)
    // Colis du jour : les 3 commandes à préparer et la prête (BLV-00011), aucune remise aujourd'hui.
    await expect(page.locator('.ajb-colis')).toHaveCount(4)
    await expect(page.locator('.ajb-colis', { hasText: 'BLV-00011' })).toContainText('code à donner au livreur')
    await page.goto('./')
    await page.locator('.hero.orange').getByText('C’est prêt').click()
    await page.goto('ramassages')
    // La plus urgente (BLV-00010, échéance du 19 sept. dépassée) est celle de l'accueil : elle passe à remettre.
    await expect(page.locator('.ajb-colis', { hasText: 'BLV-00010' }).getByRole('link', { name: 'Remettre' })).toBeVisible()
    await expect(page.locator('.ajb-colis', { hasText: 'BLV-00008' }).getByRole('link', { name: 'Préparer' })).toBeVisible()
    await page.getByRole('tab', { name: 'Semaine' }).click()
    await expect(page).toHaveURL(/j=sem/)
    await expect(page.locator('.ajb-jour')).toHaveCount(7)
    await expect(main(page)).toContainText('Boutique fermée ce jour-là') // dimanche
  })

  test('en anglais : jours et créneaux traduits', async ({ page }) => {
    await ouvrir(page, '#ramassages', EN)
    await expect(page.locator('.ajb-prochain')).toContainText('Next courier pickup')
    await expect(main(page)).toContainText('Mon–Fri')
  })
})

test.describe('AJ-B · Apprendre', () => {
  test('cocher les étapes fait avancer la fiche et la progression ; recommencer', async ({ page }) => {
    await ouvrir(page, '#apprendre', FR)
    // Progression du jeu d'essai (Franck) : « photos » terminée, « prix » commencée.
    await expect(page.locator('.ajb-anneau')).toContainText('1/5')
    await page.locator('.ajb-fiche', { hasText: 'Préparer un colis' }).click()
    await expect(page).toHaveURL(/fiche=colis/)
    for (let i = 1; i <= 4; i++) await page.getByRole('checkbox', { name: `Étape ${i} comprise` }).click()
    await expect(main(page)).toContainText('Fiche terminée')
    await page.getByRole('link', { name: 'Commandes à préparer' }).click()
    await expect(page).toHaveURL(/\/commandes\?f=prep$/)
    await page.goto('apprendre')
    await expect(page.locator('.ajb-anneau')).toContainText('2/5')
    await expect(page.locator('.ajb-fiche', { hasText: 'Préparer un colis' })).toContainText('Terminée')
  })

  test('accès Préparation : pas de lien vers « Ajouter un produit »', async ({ page }) => {
    await ouvrir(page, '#apprendre?role=prep&fiche=photos', FR)
    await expect(page.getByRole('link', { name: 'Ajouter un produit' })).toHaveCount(0)
  })
})

test.describe('AJ-B · Activité et ajustements', () => {
  test('activité : un geste fait ailleurs y paraît, signé, et mène au journal', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await page.locator('.hero.orange').getByText('C’est prêt').click()
    await page.goto('activite')
    await page.getByRole('radio', { name: 'Aujourd’hui' }).click()
    // La plus urgente de l'accueil est BLV-00010 (payée le 19 sept.) : sa ligne du jour vient du seul geste « C'est prêt ».
    const ligne = page.locator('.ajb-act', { hasText: 'BLV-00010' }).first()
    await expect(ligne).toBeVisible()
    await ligne.click()
    await expect(page).toHaveURL(/\/journal\?ref=BLV-00010$/)
  })

  test('ajustements : depuis Mon argent, lignes du mois, export comptable ; réservé au propriétaire', async ({ page }) => {
    await ouvrir(page, '#argent', FR)
    await page.locator('a.li', { hasText: 'Mes ajustements' }).click()
    await expect(page).toHaveURL(/\/ajustements$/)
    await expect(main(page)).toContainText('Vous gardez en')
    await expect(main(page)).not.toContainText(/commission retenue|prélevé/i)
    const telechargement = page.waitForEvent('download')
    await page.getByRole('button', { name: /Export comptable/ }).click()
    expect((await telechargement).suggestedFilename()).toMatch(/^belivay-ajustements-\d{4}-\d{2}\.csv$/)
    await page.goto('ajustements?role=prep')
    await expect(main(page)).toContainText('Réservé au propriétaire')
  })
})
