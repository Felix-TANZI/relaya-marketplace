// Gestes du groupe VD-03 (accès et ouverture de la boutique) : chaque geste passe par la source de démonstration
// (domaine session) et l'écran suit ; les codes sont tirés au sort par la démonstration et lus sous « Démonstration ».
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const

/** Remplit le code montré sous « Démonstration » et le valide. */
async function codeDemo(page: Page, bouton = 'Valider le code') {
  await page.locator('.vd03-demo').getByRole('button', { name: 'Le remplir' }).click()
  await page.getByRole('button', { name: bouton }).click()
}
async function deconnecter(page: Page) {
  await page.evaluate(() => {
    const e = JSON.parse(localStorage.getItem('blv_v_demo_session') ?? '{"version":2,"etat":{"connecte":true,"membre":"m-franck"}}')
    e.etat.connecte = false
    localStorage.setItem('blv_v_demo_session', JSON.stringify(e))
  })
}

test.describe('VD-03 · Connexion', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('e-mail : mot de passe faux (essais restants), puis le bon : l’accueil s’ouvre', async ({ page }) => {
    await ouvrir(page, '#connexion?s=email', FR)
    await deconnecter(page)
    await page.reload()
    await page.getByLabel('Identifiant ou e-mail').fill('@Penga12')
    await page.getByLabel('Mot de passe', { exact: true }).fill('mauvais1')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.locator('.note.red')).toContainText('Identifiant ou mot de passe incorrect · encore 4 essais')
    await page.locator('.vd03-demo').getByRole('button', { name: 'Remplir' }).click()
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page).toHaveURL(/\/vendeur\/?$/)
    await expect(page.locator('h1.pg-t')).toHaveText('Neuf choses à faire')
  })

  test('cinq mots de passe faux : connexion bloquée 15 minutes, propriétaire prévenu', async ({ page }) => {
    await ouvrir(page, '#connexion?s=email', FR)
    await page.getByLabel('Identifiant ou e-mail').fill('@Penga12')
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Mot de passe', { exact: true }).fill('faux' + i + 'x')
      await page.getByRole('button', { name: 'Se connecter' }).click()
    }
    await expect(page.locator('.note.red')).toContainText('Connexion bloquée 15 min. Un message a été envoyé au propriétaire.')
    await expect(page.locator('.note.red')).toContainText('Réessayez à 10 h 03')
  })

  test('appareil inconnu : second facteur par SMS, l’appareil est montré, puis l’accueil', async ({ page }) => {
    await ouvrir(page, '#connexion?s=email', FR)
    await page.evaluate(() => localStorage.setItem('blv_v_demo_acces', JSON.stringify({ version: 2, etat: { appareilConnu: false, seSouvenir: true, echecs: 0, bloqueJusqua: 0, motDePasse: 'Belivay2026', defi: null, numero: null, lien: null } })))
    await page.reload()
    await page.getByLabel('Identifiant ou e-mail').fill('franck.penga@exemple.cm')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Belivay2026')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page).toHaveURL(/s=2fa/)
    await expect(page.locator('main')).toContainText('Nouvel appareil : par sécurité, un code est envoyé au 677 •• •• 17.')
    await expect(page.locator('main')).toContainText('Connexion demandée aujourd’hui à 09 h 48')
    // Code faux : cases rouges, essais restants ; le bouton reste inactif tant que 6 chiffres ne sont pas tapés.
    await expect(page.getByRole('button', { name: 'Valider le code' })).toHaveAttribute('aria-disabled', 'true')
    for (const c of '000000') await page.locator('.keypad').getByRole('button', { name: c, exact: true }).click()
    await page.getByRole('button', { name: 'Valider le code' }).click()
    await expect(page.locator('.vd03-otpm')).toContainText(/Code incorrect · encore 4 essais|Code incorrect/)
    await codeDemo(page)
    await expect(page).toHaveURL(/\/vendeur\/?$/)
  })

  test('numéro : le code d’Aïcha ouvre l’accès Préparation', async ({ page }) => {
    await ouvrir(page, '#connexion?s=numero', FR)
    await deconnecter(page)
    await page.reload()
    await page.locator('#cx-num').fill('699 41 08 90')
    await expect(page.locator('.vx-op')).toHaveText('Orange')
    await page.getByRole('radio', { name: /SMS/ }).click()
    await expect(page).toHaveURL(/canal=sms/)
    await page.getByRole('button', { name: 'Recevoir le code' }).click()
    await expect(page).toHaveURL(/s=code&canal=sms|canal=sms&s=code|s=code.*canal=sms/)
    await expect(page.locator('main')).toContainText('Envoyé par SMS au 699 •• •• 90.')
    await codeDemo(page)
    await expect(page.locator('.pg-k')).toHaveText('Bonjour Aïcha · accès Préparation')
  })

  test('numéro inconnu : dit, sans code envoyé', async ({ page }) => {
    await ouvrir(page, '#connexion?s=numero', FR)
    await page.locator('#cx-num').fill('655 00 00 00')
    await page.getByRole('button', { name: 'Recevoir le code' }).click()
    await expect(page.locator('.note.red')).toContainText('Ce numéro n’a pas de compte vendeur.')
  })

  test('mot de passe oublié : lien, code SMS, nouveau mot de passe, reconnexion', async ({ page }) => {
    await ouvrir(page, '#connexion?s=oubli', FR)
    await page.getByLabel('Identifiant, e-mail ou téléphone').fill('@Penga12')
    await page.getByRole('button', { name: 'Recevoir le lien' }).click()
    await expect(page.locator('.note.green').first()).toContainText('Si un compte correspond, le lien arrive par SMS et par e-mail.')
    await expect(page.locator('main')).toContainText('Il vaut encore 15:00.')
    await page.getByRole('link', { name: 'Ouvrir le lien' }).click()
    await page.getByLabel('Nouveau mot de passe').fill('court')
    await expect(page.getByRole('button', { name: 'Continuer' })).toHaveAttribute('aria-disabled', 'true')
    await page.getByLabel('Nouveau mot de passe').fill('Boutique2027')
    await page.getByLabel('Encore une fois').fill('Boutique2027')
    await page.getByRole('button', { name: 'Continuer' }).click()
    await codeDemo(page, 'Changer mon mot de passe')
    await expect(page.locator('.blv-succes')).toContainText('Mot de passe changé')
    await page.getByRole('link', { name: 'Me connecter' }).click()
    await expect(page.getByLabel('Identifiant ou e-mail')).toHaveValue('@Penga12')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Belivay2026')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.locator('.note.red')).toContainText('incorrect')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Boutique2027')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page).toHaveURL(/\/vendeur\/?$/)
  })

  test('langue choisie avant la connexion : anglais', async ({ page }) => {
    await ouvrir(page, '#connexion', FR)
    await page.getByRole('button', { name: 'Langue' }).click()
    await page.getByRole('radio', { name: /English/ }).click()
    await expect(page.locator('h1.pg-t')).toHaveText('Log in')
    await expect(page.locator('.cx-hero')).toContainText('Seller space')
  })

  test('sans session, la page demandée revient après Google', async ({ page }) => {
    await ouvrir(page, '#connexion', FR)
    await deconnecter(page)
    await page.goto('argent')
    await expect(page).toHaveURL(/connexion\?next=%2Fargent/)
    await page.getByRole('button', { name: 'Continuer avec Google' }).click()
    await expect(page).toHaveURL(/\/argent$/)
  })
})

test.describe('VD-03 · Ouvrir ma boutique', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('champs vérifiés : rien ne part tant qu’il manque un champ ; deux comptes au plus par numéro', async ({ page }) => {
    await ouvrir(page, '#ouvrir', FR)
    await page.getByRole('button', { name: 'Ouvrir ma boutique' }).click()
    await expect(page.locator('.hint.err')).toHaveCount(4)
    await page.locator('#ov-nom').fill('Chez Mado')
    await page.locator('#ov-cat').selectOption('Mode Femme')
    await page.locator('#ov-num').fill('690112233')
    await page.locator('.vd03-carte').click()
    await expect(page.locator('main')).toContainText('Z4 · Mvog-Mbi / Mvog-Ada')
    await page.getByRole('button', { name: 'Ouvrir ma boutique' }).click()
    await expect(page.locator('.note.red')).toContainText('Deux comptes au plus par téléphone.')
    await expect(page).toHaveURL(/\/ouvrir$/)
  })

  test('parcours complet : code, Face ID, pièces, refus puis accord, contrat, Premier jour', async ({ page }) => {
    await ouvrir(page, '#ouvrir', FR)
    await page.locator('#ov-nom').fill('Chez Mado')
    await page.locator('#ov-cat').selectOption('Mode Femme')
    await page.getByRole('radio', { name: 'Entreprise' }).click()
    await page.locator('#ov-num').fill('677 42 18 90')
    await page.locator('.vd03-carte').click()
    await page.getByRole('button', { name: 'Ouvrir ma boutique' }).click()
    await expect(page).toHaveURL(/\/otp$/)
    await expect(page.locator('main')).toContainText('Envoyé au 677 •• •• 90.')
    // « Changer de numéro » : les champs reviennent remplis.
    await page.getByRole('link', { name: 'Changer de numéro' }).click()
    await expect(page.locator('#ov-nom')).toHaveValue('Chez Mado')
    await page.getByRole('button', { name: 'Ouvrir ma boutique' }).click()
    await codeDemo(page)
    await expect(page).toHaveURL(/\/faceid\?nouveau=1/)
    await expect(page.locator('h1.pg-t')).toContainText('Boutique ouverte !')
    await page.getByRole('button', { name: 'Plus tard' }).click()
    await expect(page).toHaveURL(/\/kyc$/)
    await expect(page.locator('main')).toContainText('MTN ···· 1890 · à votre nom · vérifié par code')
    await expect(page.locator('.btn.primary')).toHaveText('Prendre le recto de la CNI')
    await expect(page.locator('main')).toContainText('Encore 3 éléments : CNI recto, CNI verso et selfie.')
    for (const p of ['CNI · recto', 'CNI · verso', 'Selfie vidéo avec votre pièce']) await page.locator('.vd03-demo').getByRole('button', { name: `Envoyer « ${p} »` }).click()
    await page.getByRole('button', { name: 'Envoyer pour vérification' }).click()
    await expect(page.locator('h1.pg-t')).toHaveText('Vérification en cours')
    await expect(page.locator('.hero.night')).toContainText('Mercredi 23 septembre à 09 h 48')
    await page.getByRole('button', { name: 'Recto refusé' }).click()
    await expect(page.locator('h1.pg-t')).toHaveText('Une photo à reprendre')
    await expect(page.locator('main')).toContainText('Motif écrit : Un reflet cache le numéro de la carte.')
    await page.locator('.vd03-demo').getByRole('button', { name: 'Envoyer « CNI · recto »' }).click()
    await page.getByRole('button', { name: 'Envoyer pour vérification' }).click()
    await page.getByRole('button', { name: 'Accord' }).click()
    await expect(page.locator('h1.pg-t')).toHaveText('Votre contrat en cinq lignes')
    // Lignes lues dans les paramètres, exemple calculé (ITEL 20 000 F, Bronze, découverte : 17 840 F ; +540 F).
    await expect(page.locator('.hero.night')).toContainText('Vous gardez de 76,5 à 98 % de chaque vente livrée')
    await expect(page.locator('.hero.night')).toContainText('minimum de 700 F par commande')
    await expect(page.locator('.hero.night')).toContainText('Plafond de démarrage : 500 000 F par commande, jusqu’à 10 commandes')
    await expect(page.locator('main')).toContainText('Vous gardez 540 F de plus sur un ITEL AC52 vendu 20 000 F.')
    // Entreprise : RCCM et NIU demandés et vérifiés.
    await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: 'Signer le contrat' }).click()
    await expect(page.locator('.hint.err')).toContainText('RCCM')
    await page.getByLabel('RCCM').fill('CM-YAO-2026-B-01234')
    await page.getByLabel('NIU').fill('M012345678901A')
    await page.getByRole('button', { name: 'Signer le contrat' }).click()
    await expect(page).toHaveURL(/\/premier_jour$/)
    await page.goto('kyc')
    await expect(page.locator('.blv-succes')).toContainText('Votre boutique est vérifiée')
  })

  test('numéro de versement : un autre numéro, vérifié par code', async ({ page }) => {
    await ouvrir(page, '#ouvrir', FR)
    await page.locator('#ov-nom').fill('Chez Mado')
    await page.locator('#ov-cat').selectOption('Mode Femme')
    await page.locator('#ov-num').fill('677421890')
    await page.locator('.vd03-carte').click()
    await page.getByRole('button', { name: 'Ouvrir ma boutique' }).click()
    await codeDemo(page)
    await page.getByRole('button', { name: 'Plus tard' }).click()
    await page.getByRole('button', { name: /Numéro de versement/ }).click()
    await page.locator('#kyc-num').fill('655123456')
    await expect(page.locator('.sheet')).toContainText('Orange Money')
    await page.locator('.sheet').getByRole('button', { name: 'Recevoir le code' }).click()
    await page.locator('.sheet .vd03-demo').getByRole('button', { name: 'Le remplir' }).click()
    await page.locator('.sheet').getByRole('button', { name: 'Vérifier ce numéro' }).click()
    await expect(page.locator('.sheet')).toHaveCount(0)
    await expect(page.locator('main')).toContainText('Orange ···· 3456 · à votre nom · vérifié par code')
  })
})

test.describe('VD-03 · Arrivée depuis l’espace client', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('champs repris et verrouillés ; seul le point manque ; puis Face ID et les pièces', async ({ page }) => {
    await ouvrir(page, '#bienvenue_client', FR)
    await expect(page.locator('h1.pg-t')).toHaveText('Bienvenue, Carine')
    await expect(page.locator('.vx-from')).toContainText('Votre demande VD-2026-0913')
    await expect(page.locator('.vx-lock')).toHaveText(['repris', 'repris', 'repris', 'vérifié'])
    await page.getByRole('button', { name: 'Confirmer et ouvrir mon espace' }).click()
    await expect(page.locator('.hint.err')).toContainText('Posez le point de votre boutique sur la carte.')
    await page.locator('.vd03-carte').click()
    await page.getByRole('button', { name: 'Confirmer et ouvrir mon espace' }).click()
    await expect(page).toHaveURL(/\/faceid\?nouveau=1/)
    await page.getByRole('button', { name: /Activer/ }).click()
    await expect(page).toHaveURL(/\/kyc$/)
    await expect(page.locator('main')).toContainText('Dossier VD-2026-0913')
    await page.goto('faceid')
    await expect(page.locator('.note.green')).toContainText('déjà activé')
  })

  test('compte client sans demande de boutique : on le dit', async ({ page }) => {
    await ouvrir(page, '#bienvenue_client', FR)
    await page.evaluate(() => localStorage.setItem('blv_demo_etat', JSON.stringify({ v: 1, profil: { prenom: 'Paul' }, boutique: null })))
    await page.reload()
    await expect(page.locator('.empty h3')).toHaveText('Aucune boutique demandée depuis votre compte client')
  })
})

test.describe('VD-03 · Saisie assistée', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('groupes comptés, prix anormal corrigé, validation en une fois', async ({ page }) => {
    await ouvrir(page, '#saisie_assistee', FR)
    await expect(page.locator('.divider-t')).toHaveText(['Prêts · 4', 'À vérifier · 1', 'Doublon · 1'])
    await expect(page.locator('.note.amber')).toContainText('Prix anormal : 1 800 F, moins de la moitié du prix habituel (4 000 F).')
    await page.locator('.card', { hasText: 'Chargeur rapide 18 W' }).getByRole('button', { name: 'Modifier' }).click()
    await page.locator('#sa-prix').fill('3500')
    await expect(page.locator('.sheet')).toContainText('Prix habituel de la catégorie : 4 000 F.')
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.locator('.divider-t')).toHaveText(['Prêts · 5', 'Doublon · 1'])
    await page.getByRole('button', { name: 'Valider les 5 produits prêts' }).click()
    await expect(page.locator('.note.green')).toContainText('5 produits validés.')
    await expect(page.locator('.divider-t')).toHaveText(['Doublon · 1', 'Validés · 5'])
    await page.reload()
    await expect(page.locator('.divider-t')).toHaveText(['Doublon · 1', 'Validés · 5'])
  })

  test('accès Préparation : réservé au propriétaire, aucun montant', async ({ page }) => {
    await ouvrir(page, '#saisie_assistee?role=prep', FR)
    await expect(page.locator('main')).toContainText('réservées à Franck Penga, propriétaire')
    await expect(page.locator('main')).not.toContainText(/\d F\b/)
  })
})

test.describe('VD-03 · Installer, lancement', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('onglets iPhone et Android ; pas de bouton d’installation sans invite du navigateur', async ({ page }) => {
    await ouvrir(page, '#installer?os=ios', FR)
    await expect(page.locator('.seg .on')).toHaveText('iPhone')
    await expect(page.locator('.card.tight')).toContainText('dans Safari')
    await page.getByRole('tab', { name: 'Android' }).click()
    await expect(page.locator('.card.tight')).toContainText('dans Chrome')
    await expect(page.locator('main .btn.primary')).toHaveCount(0)
  })

  test('lancement : l’accueil s’ouvre avec la session gardée', async ({ page }) => {
    await ouvrir(page, '#lancement', FR)
    await expect(page).toHaveURL(/\/vendeur\/?$/)
  })
})
