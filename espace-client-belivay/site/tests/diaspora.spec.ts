// DP-54 : diaspora de bout en bout. Côté Cameroun : accepter le lien d'invitation d'un proche à l'étranger, régler
// sa livraison, partager son code famille (QR, WhatsApp), envoyer son panier à un proche relié, l'annuler.
// Côté diaspora : le type de compte dès l'inscription (menus, compte, panier, paiement, commandes adaptés), lien
// d'invitation, relier par code, devise d'affichage (euro), boîte « À payer pour mes proches », payer « chez X »
// par Apple Pay sans jamais voir l'adresse ni le code, suivi, commandes envoyées, notifications ; refuser avec un mot.
import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
})

async function inscrireDiaspora(page: Page) {
  await page.goto('/inscription-diaspora')
  await expect(page.locator('main')).toContainText('Pas de retrait pour toi')
  await page.getByRole('link', { name: 'Avec mon e-mail' }).click()
  await page.getByLabel('Prénom').fill('Hervé')
  await page.getByLabel('Nom', { exact: true }).fill('Mbarga')
  await page.getByLabel('E-mail').fill('herve.mbarga@exemple.fr')
  await page.getByLabel('Pays où tu vis').selectOption('France')
  await page.getByLabel('Ville').fill('Lyon')
  await page.getByLabel('Date de naissance').fill('1990-05-14')
  await page.getByLabel('Ton numéro de téléphone').fill('612345678')
  await page.getByLabel('Mot de passe').fill('Belivay2026')
  await page.getByRole('checkbox', { name: /J’achète pour mes proches/ }).click()
  await page.getByRole('button', { name: 'Recevoir mes codes (SMS et e-mail)' }).click()
  await page.getByLabel('Code reçu par SMS').fill('503917')
  await page.getByLabel('Code reçu par e-mail').fill('284615')
  await page.getByRole('button', { name: 'Créer mon compte diaspora' }).click()
  await expect(page).toHaveURL(/\/proches$/)
}

test('côté Cameroun : invitation par lien, livraison chez moi, code famille partagé, panier envoyé au proche', async ({ page }) => {
  // Le lien d'invitation de Mireille (Canada) s'ouvre avec le code déjà rempli.
  await page.goto('/proches?invitation=INV-M4PB')
  await expect(page.getByLabel('Code d’invitation')).toHaveValue('INV-M4PB')
  await page.getByRole('button', { name: 'Utiliser ce code' }).click()
  await expect(page.locator('.note.green')).toContainText('Mireille est relié à ton compte')
  // Sa livraison : mon relais, et la livraison chez moi (mon adresse ne lui est jamais montrée).
  await page.getByRole('checkbox', { name: /Mireille peut aussi me faire livrer chez moi/ }).check()
  await page.getByRole('button', { name: 'Enregistrer ma livraison' }).click()
  await expect(page.locator('.note.green')).toContainText('Livraison pour Mireille enregistrée.')
  // Code famille en lien partageable : QR, WhatsApp, SMS.
  await page.getByRole('button', { name: 'Créer mon code famille' }).click()
  await expect(page.locator('main')).toContainText(/FAM-[A-Z0-9]{4}/)
  await expect(page.locator('.cl10-qr svg')).toBeVisible()
  await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=.*proches%3Fcode%3DFAM-/)
  // Envoyer mon panier à Paul (Belgique), relié : dans son application, sans lien.
  await page.goto('/fiche?p=mixeur')
  await page.locator('.fp-bar').getByRole('button', { name: 'Ajouter', exact: true }).click()
  await page.goto('/diaspora')
  await page.getByRole('radio', { name: /Paul · Belgique/ }).click()
  await page.getByLabel('Un mot pour lui (facultatif)').fill('Merci Paul !')
  await page.getByRole('button', { name: /^Envoyer à Paul/ }).click()
  await expect(page.locator('main')).toContainText('Panier envoyé à Paul')
  await expect(page.locator('.cl08-sq')).toBeVisible()
  // Le suivi : en attente, puis annulé.
  await page.goto('/paniers-proches')
  await expect(page.locator('main')).toContainText('En attente')
  await page.getByRole('button', { name: 'Annuler' }).click()
  await expect(page.locator('.note.green')).toContainText('Panier pour Paul annulé.')
  await expect(page.locator('main')).toContainText('Annulé')
  // L'espace diaspora, vu du Cameroun.
  await page.goto('/espace-diaspora')
  await expect(page.locator('main')).toContainText('Mireille · Canada')
})

test('diaspora de bout en bout : type de compte, devise, panier reçu payé chez le proche, suivi sans adresse ni code', async ({ page }) => {
  await inscrireDiaspora(page)
  // Lien d'invitation partageable.
  await page.getByRole('radio', { name: 'Lien ou QR' }).click()
  await page.getByRole('button', { name: 'Créer mon lien d’invitation' }).click()
  await expect(page.locator('main')).toContainText(/INV-[A-Z0-9]{4}/)
  await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /invitation%3DINV-/)
  // Relier Odile par son code famille : elle envoie aussitôt son panier (démonstration).
  await page.getByRole('radio', { name: 'Avec son code famille' }).click()
  await page.getByLabel('Code famille').fill('FAM-4821')
  await page.getByRole('button', { name: 'Relier' }).click()
  await expect(page.locator('.note.green')).toContainText('Odile est relié à ton compte.')

  // Le site s'adapte au compte diaspora : compte sans portefeuille, panier « Pour qui ? », paiement réservé.
  await page.goto('/compte')
  await expect(page.locator('main')).toContainText('Espace diaspora')
  await expect(page.locator('main')).not.toContainText('Wallet BelivaY')
  await page.goto('/fiche?p=mixeur')
  await page.locator('.fp-bar').getByRole('button', { name: 'Ajouter', exact: true }).click()
  await page.goto('/panier')
  await expect(page.locator('main')).toContainText('Pour qui ?')
  await expect(page.getByRole('button', { name: 'Payer au comptoir du relais' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^Commander pour Odile/ })).toBeVisible()
  await page.goto('/paiement-moyen')
  await expect(page).toHaveURL(/\/commander-pour$/)

  // Devise d'affichage : euro, partout (le franc CFA reste écrit à côté).
  await page.goto('/reglages')
  await page.getByRole('button', { name: 'Euro' }).click()
  await expect(page.getByRole('button', { name: 'Euro' })).toHaveClass(/\bon\b/)
  await page.goto('/espace-diaspora')
  await expect(page.locator('main')).toContainText('€ ·')
  await expect(page.locator('main')).toContainText('Odile t’a envoyé son panier')

  // Le panier d'Odile : détail, puis paiement chez elle, par Apple Pay.
  await page.getByRole('link', { name: /Odile t’a envoyé son panier/ }).click()
  await expect(page).toHaveURL(/paniers-proches\?id=DP-/)
  await expect(page.locator('main')).toContainText('Cartable scolaire')
  await expect(page.locator('main')).toContainText('Chez Odile · Yaoundé')
  await page.getByRole('link', { name: /^Payer pour Odile/ }).click()
  await expect(page).toHaveURL(/commander-pour\?lien=LF-.*demande=DP-/)
  await expect(page.getByRole('radio', { name: 'Chez Odile' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('main')).toContainText('L’adresse reste dans le compte de Odile')
  await expect(page.getByRole('radio', { name: 'Je paie tout' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radio', { name: 'Apple Pay' }).click()
  await expect(page.getByLabel('Numéro de carte')).toHaveCount(0)
  await page.getByRole('button', { name: /^Payer/ }).click()
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.locator('.hero')).toContainText('part vers Odile')
  await expect(page.locator('main')).toContainText('Paiement accepté')

  // Suivi : étapes et preuve, jamais l'adresse ni le code.
  await page.getByRole('link', { name: 'Suivre la commande' }).click()
  await expect(page.locator('main')).toContainText('Chez Odile')
  await expect(page.locator('main')).toContainText('Payé avec')
  await expect(page.locator('main')).not.toContainText('699')
  await expect(page.locator('main')).not.toContainText(/code de retrait\s*:\s*\d/i)

  // Commandes envoyées, boîte à payer vidée, notifications.
  await page.goto('/commandes')
  await expect(page.locator('main')).toContainText('pour Odile')
  await page.goto('/paniers-proches')
  await expect(page.locator('main')).toContainText('Payé')
  await page.goto('/notifications')
  await expect(page.locator('main')).toContainText('Odile t’a envoyé son panier à payer')
  await expect(page.locator('main')).toContainText('Commande pour Odile')
})

test('diaspora : refuser un panier reçu, avec un mot', async ({ page }) => {
  await inscrireDiaspora(page)
  await page.getByLabel('Code famille').fill('FAM-4821')
  await page.getByRole('button', { name: 'Relier' }).click()
  await page.getByRole('link', { name: /À payer pour mes proches/ }).click()
  await page.getByRole('link', { name: /De Odile/ }).click()
  await page.getByRole('button', { name: 'Refuser' }).click()
  await page.getByLabel('Un mot pour Odile (facultatif)').fill('Je paie la semaine prochaine')
  await page.getByRole('button', { name: 'Confirmer le refus' }).click()
  await expect(page.locator('.note.green')).toContainText('Panier de Odile refusé')
  await expect(page.locator('main')).toContainText('Refusé · « Je paie la semaine prochaine »')
})

test('inscription diaspora avec Google : identité reprise, code SMS seul, puis connexion Google vers l’espace diaspora', async ({ page }) => {
  await page.goto('/inscription-diaspora')
  await page.getByRole('link', { name: 'Continuer avec Google' }).click()
  await page.getByRole('link', { name: 'Utiliser un autre compte' }).click()
  // Prénom, nom et e-mail viennent de Google (e-mail déjà vérifié) : ni mot de passe ni code e-mail.
  await expect(page.getByLabel('Prénom')).toHaveValue('Hervé')
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Mbarga')
  await expect(page.locator('main')).toContainText('herve.mbarga@gmail.com · e-mail vérifié par Google')
  await expect(page.getByLabel('Mot de passe')).toHaveCount(0)
  // L'étape diaspora commune : mêmes contrôles (pas de +237, 18 ans).
  await page.getByLabel('Date de naissance').fill('2015-01-01')
  await page.getByLabel('Pays où tu vis').selectOption('France')
  await page.getByLabel('Ville').fill('Lyon')
  await page.getByLabel('Ton numéro de téléphone').fill('+237 677 12 34 56')
  await page.getByRole('checkbox', { name: /J’achète pour mes proches/ }).click()
  await page.getByRole('button', { name: 'Recevoir mon code SMS' }).click()
  await expect(page.locator('main')).toContainText('Un numéro camerounais ouvre un compte normal')
  await expect(page.locator('main')).toContainText('réservé aux personnes majeures')
  await page.getByLabel('Date de naissance').fill('1990-05-14')
  await page.getByLabel('Ton numéro de téléphone').fill('612345678')
  await page.getByRole('button', { name: 'Recevoir mon code SMS' }).click()
  await expect(page.getByLabel('Code reçu par e-mail')).toHaveCount(0)
  await page.getByLabel('Code reçu par SMS').fill('503917')
  await page.getByRole('button', { name: 'Créer mon compte diaspora' }).click()
  await expect(page).toHaveURL(/\/proches$/)
  await page.goto('/compte')
  await expect(page.locator('main')).toContainText('Espace diaspora')
  // Se reconnecter avec Google depuis la connexion : l'espace diaspora s'ouvre.
  await page.goto('/connexion')
  await page.getByRole('link', { name: 'Continuer avec Google' }).click()
  await page.getByRole('link', { name: /Hervé Mbarga/ }).click()
  await page.getByRole('link', { name: 'Ouvrir mon compte' }).click()
  await expect(page).toHaveURL(/\/espace-diaspora$/)
})

test('inscription diaspora avec le numéro étranger : code vérifié d’abord, e-mail facultatif ; compte Google existant passé en diaspora', async ({ page }) => {
  await page.goto('/inscription-diaspora')
  await page.getByRole('link', { name: 'Avec mon numéro (étranger)' }).click()
  await page.getByLabel('Pays où tu vis').selectOption('Belgique')
  await page.getByLabel('Ton numéro de téléphone').fill('470123456')
  await page.getByRole('button', { name: 'Recevoir mon code par SMS' }).click()
  await page.getByLabel('Code reçu par SMS').fill('503917')
  await page.getByRole('button', { name: 'Valider mon numéro' }).click()
  await expect(page.locator('main')).toContainText('Numéro vérifié')
  await page.getByLabel('Prénom').fill('Paul')
  await page.getByLabel('Nom', { exact: true }).fill('Ngono')
  await page.getByLabel('Date de naissance').fill('1985-03-02')
  await page.getByLabel('Ville').fill('Bruxelles')
  await page.getByRole('checkbox', { name: /J’achète pour mes proches/ }).click()
  await page.getByRole('button', { name: 'Créer mon compte diaspora' }).click()
  await expect(page).toHaveURL(/\/proches$/)
})

test('compte Google déjà ouvert : se connecter ou le passer en diaspora', async ({ page }) => {
  await page.goto('/inscription-diaspora')
  await page.getByRole('link', { name: 'Continuer avec Google' }).click()
  await page.locator('.cl03-acct').first().click()
  await expect(page.getByRole('link', { name: 'Me connecter à ce compte' })).toBeVisible()
  await page.getByRole('link', { name: 'Passer ce compte en diaspora' }).click()
  await expect(page.locator('main')).toContainText('Passer mon compte en diaspora')
  await page.getByLabel('Date de naissance').fill('1990-05-14')
  await page.getByLabel('Pays où tu vis').selectOption('Canada')
  await page.getByLabel('Ville').fill('Montréal')
  await page.getByLabel('Ton numéro de téléphone').fill('5145550123')
  await page.getByRole('checkbox', { name: /J’achète pour mes proches/ }).click()
  await page.getByRole('button', { name: 'Recevoir mon code SMS' }).click()
  await page.getByLabel('Code reçu par SMS').fill('503917')
  await page.getByRole('button', { name: 'Passer mon compte en diaspora' }).click()
  await expect(page).toHaveURL(/\/proches$/)
  await page.goto('/compte')
  await expect(page.locator('main')).toContainText('Espace diaspora')
})

// DP-54 : un compte diaspora voit partout les infos de la personne à qui il envoie (son proche actif, « Pour qui ? ») :
// distances, retrait, délais et frais depuis le relais du proche, son prénom et son quartier seulement ; jamais son
// adresse, son numéro ni son code. Les pages qu'il n'utilise pas le ramènent à son espace, avec la raison.
test('compte diaspora : infos du proche partout', async ({ page }) => {
  test.setTimeout(120_000)
  await inscrireDiaspora(page)
  const main = page.locator('main')
  // Sans proche relié : l'invitation à en relier un, et les phrases « du relais de ton proche ».
  await page.goto('/')
  await expect(main).toContainText('Près du relais de ton proche')
  await expect(main).not.toContainText('Près de ton relais')
  await page.goto('/menu')
  await expect(page.getByRole('link', { name: 'Relier un proche' })).toBeVisible()

  // Relier Odile (Mvog-Ada, livraison chez elle acceptée) puis Junior (Essos) ; le dernier relié est actif.
  await page.goto('/proches')
  await page.getByLabel('Code famille').fill('FAM-4821')
  await page.getByRole('button', { name: 'Relier' }).click()
  await expect(page.locator('.note.green')).toContainText('Odile est relié')
  await page.getByLabel('Code famille').fill('FAM-7350')
  await page.getByRole('button', { name: 'Relier' }).click()
  await expect(page.locator('.note.green')).toContainText('Junior est relié')

  // Distances depuis le relais de Junior, puis « Pour qui ? » (menu) : Odile, mémorisée.
  await page.goto('/fiche?p=mixeur')
  await expect(main).toContainText('du relais de Junior (Essos)')
  const kmJunior = await main.getByText(/à [\d,]+ km du relais de Junior/).innerText()
  await page.goto('/menu')
  await page.getByRole('link', { name: 'Pour qui : Junior. Changer' }).click()
  await expect(page.getByRole('dialog', { name: 'Pour qui ?' })).toBeVisible()
  await page.getByRole('radio', { name: /Odile/ }).click()
  await expect(page.getByRole('link', { name: 'Pour qui : Odile. Changer' })).toBeVisible()

  // Accueil : « Près du relais de Odile », pas de colis à lui.
  await page.goto('/')
  await expect(main).toContainText('Près du relais de Odile')
  await expect(page.locator('.h0-float')).toHaveCount(0)
  // Fiche : distance et retrait depuis le relais de Odile, livraison chez elle (sans adresse).
  await page.goto('/fiche?p=mixeur')
  await expect(main).toContainText('du relais de Odile (Mvog-Ada)')
  await expect(main).toContainText('Retrait au relais de Odile (Mvog-Ada)')
  await expect(main).toContainText('Livraison chez Odile · 24–72 h')
  await expect(main).not.toContainText('ton relais')
  expect(await main.getByText(/à [\d,]+ km du relais de Odile/).innerText()).not.toBe(kmJunior.replace('Junior (Essos)', 'Odile (Mvog-Ada)'))
  // Recherche : d'où partent les distances, et la distance de chaque carte.
  await page.goto('/recherche-resultats?q=mixeur')
  await expect(page.locator('.cl05-rp').first()).toContainText('Odile · Mvog-Ada')
  await expect(main).toContainText('du relais de Odile')
  await expect(main).not.toContainText('de ton relais')
  // Le sélecteur de relais est remplacé par « Pour qui ? ».
  await page.goto('/relais-selecteur?retour=fiche%3Fp%3Dmixeur')
  await expect(page).toHaveURL(/\/fiche\?p=mixeur&sheet=pour-qui/)
  await expect(page.getByRole('dialog', { name: 'Pour qui ?' })).toBeVisible()

  // Panier : pour Odile, frais au relais de Odile, ni MoMo ni comptoir.
  await page.goto('/fiche?p=mixeur')
  await page.locator('.fp-bar').getByRole('button', { name: 'Ajouter', exact: true }).click()
  await page.goto('/panier')
  await expect(page.getByRole('radio', { name: 'Odile' })).toHaveAttribute('aria-checked', 'true')
  await expect(main).toContainText('Remise au relais de Odile (Mvog-Ada)')
  await expect(main).not.toContainText('MTN')
  await expect(page.getByRole('button', { name: 'Payer au comptoir du relais' })).toHaveCount(0)

  // Paiement : carte, Apple Pay ou Google Pay ; la commande, le suivi, les notifications : jamais d'adresse ni de code.
  await page.getByRole('link', { name: /^Commander pour Odile/ }).first().click()
  await expect(page).toHaveURL(/commander-pour\?lien=LF-/)
  await expect(main).not.toContainText('699')
  await page.getByRole('radio', { name: 'Apple Pay' }).click()
  await page.getByRole('button', { name: /^Payer/ }).click()
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(main).toContainText('Paiement accepté')
  await page.getByRole('link', { name: 'Suivre la commande' }).click()
  await expect(main).toContainText('Odile')
  await expect(main).not.toContainText('699')
  await expect(main).not.toContainText(/code de retrait\s*:\s*\d/i)
  await page.goto('/commandes')
  await expect(main).toContainText('pour Odile')
  await page.goto('/notifications')
  await expect(main).toContainText('Commande pour Odile')
  await expect(main).not.toContainText('699')

  // Pages qu'il n'utilise pas : son espace, avec la raison ; le suivi d'une commande mène au suivi pour le proche.
  await page.goto('/wallet')
  await expect(page).toHaveURL(/\/espace-diaspora\?hors=wallet/)
  await expect(main).toContainText('pas de portefeuille BelivaY')
  await page.goto('/comptoir')
  await expect(page).toHaveURL(/hors=comptoir/)
  await page.goto('/adresses')
  await expect(page).toHaveURL(/hors=adresses/)
  await expect(main).toContainText('Pour qui ?')

  // Grands écrans : la ligne « Pour qui ? » dans l'en-tête ; aucun défilement horizontal à 375, 768 et 1440.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('.hn-rly')).toContainText('Pour Odile')
  for (const [w, h] of [[375, 812], [768, 1024], [1440, 900]]) {
    await page.setViewportSize({ width: w, height: h })
    for (const r of ['/', '/fiche?p=mixeur', '/recherche-resultats?q=mixeur', '/panier', '/espace-diaspora', '/menu', '/compte', '/commandes', '/notifications', '/liste?cat=maison']) {
      await page.goto(r)
      await expect(main).toBeVisible()
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(deborde, `${r} à ${w} px`).toBeLessThanOrEqual(1)
    }
  }
})
