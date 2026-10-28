// Fiche produit et Favoris simplifiés (consigne du porteur, présentations) : trois sections séparées, blocs de
// confiance au prix D10, meilleure offre en une ligne, découverte chargée au défilement ; ajout à une liste en un
// geste (appui long sur le cœur, ou « Ajouter à une liste ») ; sélection multiple dans Favoris.
import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('blv_c_theme', 'light')
    localStorage.setItem('blv_c_lang', 'fr')
  })
})

const descendre = (page: Page) => page.evaluate(() => document.querySelector('#app main')!.scrollTo(0, 1e7))

test('fiche : Description, Caractéristiques et Avis en trois sections séparées ; blocs de confiance ; meilleure offre en une ligne', async ({ page }) => {
  await page.goto('/fiche?p=camon30')
  const sections = page.locator('section.fp-sec')
  await expect(sections.locator('h2')).toHaveText(['Description', 'Caractéristiques', 'Avis128'])
  await expect(page.getByRole('tablist')).toHaveCount(0)
  // Chacune sa carte, l'une sous l'autre, sans chevauchement.
  const b = await Promise.all([0, 1, 2].map((i) => sections.nth(i).boundingBox()))
  expect(b[1]!.y).toBeGreaterThan(b[0]!.y + b[0]!.height)
  expect(b[2]!.y).toBeGreaterThan(b[1]!.y + b[1]!.height)
  await expect(sections.nth(1).locator('.kv').first()).toBeVisible()
  await expect(sections.nth(2).getByRole('link', { name: 'Lire les avis' })).toBeVisible()
  // Description repliée au téléphone, dépliée par « Lire la suite ».
  await sections.nth(0).getByRole('button', { name: 'Lire la suite' }).click()
  await expect(sections.nth(0).getByRole('button', { name: 'Réduire' })).toHaveAttribute('aria-expanded', 'true')

  // Blocs de confiance : domicile et relais au prix v2.0 (914 100 F : relais offert, domicile offert jusqu'à 1 500 F),
  // puis trois garanties.
  const conf = page.locator('.fp-conf')
  await expect(conf.locator('.fp-ct')).toHaveCount(5)
  await expect(conf.locator('.fp-ct', { hasText: 'Livraison à domicile' })).toContainText(/Offerte jusqu’à 1\s500\sF · reste 200\sF/) // R07 : niveau périphérie de la boutique, 1 700 − 1 500 F
  await expect(conf.locator('.fp-ct', { hasText: 'Retrait au relais' })).toContainText(/Offerte \(dès 30\s000\sF d’achat\)/)
  for (const x of ['Paiement sécurisé', 'Retour 7 jours', 'Vendeur certifié']) await expect(conf.locator('.fp-ct.mini', { hasText: x })).toBeVisible()
  await expect(conf.locator('.fp-ct', { hasText: 'Paiement sécurisé' })).toContainText('Mobile Money · Escrow')

  // Meilleure offre : une ligne ; le détail sous « Pourquoi ? ».
  const offre = page.locator('[data-offre-attribuee]')
  await expect(offre).toContainText('Meilleure offre : 914 100 F livrés au relais')
  await expect(offre).not.toContainText('BelivaY choisit pour toi')
  await offre.getByRole('button', { name: 'Pourquoi ?' }).click()
  await expect(offre).toContainText('BelivaY choisit pour toi l’offre la mieux placée')

  // Petit panier (1 600 F) : 900 F au relais, la course à domicile, les seuils écrits.
  await page.goto('/fiche?p=pates')
  await expect(page.locator('.fp-ct', { hasText: 'Retrait au relais' })).toContainText(/Dès 900\sF · offerte dès 30\s000\sF d’achat/)
  await expect(page.locator('.fp-ct', { hasText: 'Livraison à domicile' })).toContainText(/Dès \d\s?\d{3}\sF · offerte jusqu’à 1\s500\sF dès 50\s000\sF d’achat/)
  // Prix livré au relais : 1 600 F + 900 F.
  await expect(page.locator('[data-offre-attribuee]')).toContainText('Meilleure offre : 2 500 F livrés au relais')
})

test('fiche : la découverte charge des produits au défilement, sans doublon, cœur favori sur chaque carte', async ({ page }) => {
  await page.goto('/fiche?p=camon30')
  const cartes = page.locator('.fp-dec a.pv-c')
  await expect(page.locator('.fp-dec [data-partie=similaires] a.pv-c').first()).toBeVisible()
  const n1 = await cartes.count()
  expect(n1).toBeGreaterThan(0)
  expect(n1).toBeLessThanOrEqual(8)
  await expect(page.locator('.fp-dec [data-partie=aimer]')).toHaveCount(0)
  // Défiler jusqu'en bas charge les lots suivants : « Du même vendeur », puis « Vous aimerez aussi » par 20.
  for (let i = 0; i < 8 && (await page.locator('.fp-dec [data-partie=aimer] a.pv-c').count()) < 40; i++) {
    await descendre(page)
    await page.waitForTimeout(250)
  }
  await expect(page.locator('.fp-dec [data-partie=vendeur] h2')).toContainText('Du même vendeur')
  expect(await page.locator('.fp-dec [data-partie=aimer] a.pv-c').count()).toBeGreaterThanOrEqual(40)
  // Sans doublon entre les parties ni avec le produit de la fiche ; une photo, un prix et un cœur par carte.
  const premiers = await page.locator('.fp-dec :is([data-partie=similaires],[data-partie=vendeur]) a.pv-c, .fp-dec [data-partie=aimer] a.pv-c').evaluateAll((as) => as.slice(0, 36).map((a) => a.getAttribute('href')))
  expect(new Set(premiers).size).toBe(premiers.length)
  expect(premiers).not.toContain('/fiche?p=camon30')
  const c = cartes.first()
  await expect(c.locator('.im :is(img,svg)').first()).toBeVisible()
  await expect(c.locator('.p')).toContainText('F')
  // Le cœur d'une carte met ce produit en favori, sans ouvrir sa fiche.
  const coeur = c.locator('.hr')
  await coeur.click()
  await expect(coeur).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/fiche\?p=camon30$/)
  // Une carte ouvre sa fiche, qui a sa propre découverte.
  const vers = await cartes.nth(1).getAttribute('href')
  await cartes.nth(1).click()
  await expect(page).toHaveURL(vers!)
  await expect(page.locator('.fp-dec a.pv-c').first()).toBeVisible()
})

test('ajouter à une liste en un geste : appui long sur le cœur, ou « Ajouter à une liste » ; nouvelle liste', async ({ page }) => {
  await page.goto('/fiche?p=mixeur')
  const coeur = page.locator('.fp-bar .fp-fav')
  // Appui long : la feuille des listes, avec leur statut.
  const bb = (await coeur.boundingBox())!
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
  const feuille = page.getByRole('dialog', { name: 'Ajouter à une liste' })
  await expect(feuille).toBeVisible()
  await expect(coeur).toHaveAttribute('aria-pressed', 'false') // l'appui long n'est pas un toucher du cœur
  await expect(feuille.locator('.al-r', { hasText: 'Mon anniversaire' })).toContainText('Partagée')
  await expect(feuille.locator('.al-r', { hasText: 'Mariage de Sandrine' })).toContainText('Privée')
  await feuille.locator('.al-r', { hasText: 'Mon anniversaire' }).click()
  await expect(feuille).toHaveCount(0)
  await expect(page.locator('.note.green')).toContainText('« Ninja Blender professionnel 1 200 W » ajouté à « Mon anniversaire ».')
  // Un toucher du cœur : favori, sans feuille ; puis « Ajouter aussi à une liste » est proposé.
  await coeur.click()
  await expect(coeur).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.note.green')).toContainText('Ajouté à tes favoris.')
  await expect(page.locator('.note.green').getByRole('button', { name: 'Ajouter aussi à une liste' })).toBeVisible()
  // « Ajouter à une liste » puis « Nouvelle liste » : créée, l'article y entre.
  await page.getByRole('button', { name: 'Ajouter à une liste', exact: true }).click()
  await feuille.getByRole('button', { name: /Nouvelle liste/ }).click()
  await feuille.getByLabel('Nom de la nouvelle liste').fill('Cuisine')
  await feuille.getByRole('button', { name: 'Créer et ajouter' }).click()
  await expect(page.locator('.note.green')).toContainText('ajouté à « Cuisine ».')
  await page.goto('/listes')
  await expect(page.locator('a.card', { hasText: 'Cuisine' })).toContainText('1 article')
  await expect(page.locator('a.card', { hasText: 'Cuisine' })).toContainText('Privée')
  await page.goto('/liste-envies?id=anniv')
  await expect(page.locator('main')).toContainText('Ninja Blender professionnel 1 200 W')
})

test('favoris : sélection multiple, barre d’actions (retirer et annuler, envoyer, déplacer vers une liste, panier)', async ({ page }) => {
  await page.goto('/sauvegardes')
  const cartes = page.locator('.cl07-fv')
  await expect(cartes).toHaveCount(2)
  const barre = page.getByRole('toolbar', { name: 'Actions sur la sélection' })
  await expect(barre).toHaveCount(0)
  // Une case par carte ; la barre apparaît (à la place de la barre d'onglets) avec le nombre choisi.
  await cartes.filter({ hasText: 'Montre' }).getByRole('checkbox').click()
  await expect(barre).toContainText('1 article sélectionné')
  await expect(page.locator('nav.dock')).toBeHidden()
  await page.getByRole('button', { name: 'Tout sélectionner' }).click()
  await expect(barre).toContainText('2 articles sélectionnés')
  await expect(page.locator('.cl07-fv.choisi')).toHaveCount(2)
  // Retirer les deux, puis annuler.
  await barre.getByRole('button', { name: 'Retirer' }).click()
  await expect(page.locator('.cl10-toast')).toContainText('2 articles retirés des favoris.')
  await expect(cartes).toHaveCount(0)
  await page.locator('.cl10-toast').getByRole('button', { name: 'Annuler' }).click()
  await expect(cartes).toHaveCount(2)
  // Envoyer à un proche : WhatsApp (lien encodé vers la fiche), SMS, copier.
  await cartes.filter({ hasText: 'Montre' }).getByRole('checkbox').click()
  await barre.getByRole('button', { name: 'Envoyer' }).click()
  const envoi = page.getByRole('dialog', { name: 'Envoyer à un proche' })
  await expect(envoi.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=Montre.*fiche%3Fp%3D/)
  await expect(envoi.getByRole('link', { name: 'SMS' })).toHaveAttribute('href', /^sms:\?&body=Montre/)
  await page.keyboard.press('Escape')
  await expect(envoi).toHaveCount(0)
  // Vers une liste, en déplaçant : l'article quitte les favoris et entre dans la liste.
  await barre.getByRole('button', { name: 'Vers une liste' }).click()
  const feuille = page.getByRole('dialog', { name: 'Ajouter à une liste' })
  await expect(feuille.locator('.al-r', { hasText: 'Mes favoris' })).toHaveCount(0)
  await feuille.getByLabel('Retirer de mes favoris (déplacer)').check()
  await feuille.locator('.al-r', { hasText: 'Mariage de Sandrine' }).click()
  await expect(page.locator('.note.green')).toContainText('1 article déplacé vers « Mariage de Sandrine ».')
  await expect(cartes).toHaveCount(1)
  await expect(barre).toHaveCount(0)
  // Un article en un toucher vers une liste (bouton de la carte), puis au panier depuis la sélection.
  await cartes.first().getByRole('button', { name: 'Ajouter à une liste' }).click()
  await expect(feuille.locator('.al-r', { hasText: 'Mes favoris' }).getByLabel('Déjà dedans')).toBeVisible()
  await page.keyboard.press('Escape')
  await cartes.first().getByRole('checkbox').click()
  await barre.getByRole('button', { name: 'Au panier' }).click()
  await expect(page.locator('.note.green')).toContainText('« Nike Air Max Dn » est dans ton panier.')
  await page.goto('/liste-envies?id=mariage')
  await expect(page.locator('main')).toContainText('Montre Garmin Fenix 8')
})

test('compte : « Mes services BelivaY » regroupés ; un groupe ouvre sa feuille, qui mène à chaque service', async ({ page }) => {
  await page.goto('/compte')
  const svc = page.locator('.dx-svc')
  await expect(svc.locator(':scope > a, :scope > button')).toHaveText(['Premium', '3Diaspora', '4Offrir', '2Payer à mon rythme', 'Rentrée', 'Troc', '2Assistance'])
  // Diaspora et « Diaspora : tout savoir » (et Mes proches) : un seul accès.
  await expect(svc.getByRole('link', { name: 'Diaspora : tout savoir' })).toHaveCount(0)
  await svc.getByRole('button', { name: /Diaspora/ }).click()
  const f = page.getByRole('dialog', { name: 'Diaspora' })
  await expect(f.locator('a.li')).toHaveCount(3)
  await expect(f.getByRole('link', { name: /Diaspora : tout savoir/ })).toHaveAttribute('href', '/diaspora-infos')
  await f.getByRole('link', { name: /Mes proches/ }).click()
  await expect(page).toHaveURL(/\/proches$/)
  await page.goBack()
  await page.goBack()
  await expect(page).toHaveURL(/\/compte$/)
  await svc.getByRole('button', { name: /Payer à mon rythme/ }).click()
  await expect(page.getByRole('dialog', { name: 'Payer à mon rythme' }).getByRole('link', { name: /Mise de côté/ })).toHaveAttribute('href', '/cote')
})
