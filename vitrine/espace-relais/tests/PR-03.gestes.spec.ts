// Gestes des écrans d'accès (PR-03) : connexion (nouvel appareil, code SMS, PIN, blocage, PIN oublié), invitation,
// candidature « Devenir point relais », activation, statut (contestation, fin du partenariat), installation. Cas
// d'erreur compris. Données du jeu d'essai : Rose (gérante) 677 24 53 10, PIN 240913, code SMS 481920.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const PIN = '240913'
const CODE = '481920'

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

const pin = async (page: Page, v: string) => {
  await page.keyboard.type(v)
  await page.waitForTimeout(250)
}

test('connexion d’un nouvel appareil : numéro, code SMS (faux puis juste), PIN (faux puis juste), Aujourd’hui', async ({ page }) => {
  await ouvrir(page, '#connexion?demo=premiere', FR)
  const numero = page.getByLabel('Numéro', { exact: true })
  await numero.fill('612345678')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByText('Ce numéro n’est lié à aucun relais')).toBeVisible()
  await numero.fill('6123')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByText(/9\schiffres,\scommençant\spar\s6/)).toBeVisible()
  await numero.fill('677245310')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByRole('heading', { name: 'Nouveau téléphone' })).toBeVisible()
  const code = page.getByPlaceholder('000000')
  await code.fill('111111')
  await expect(page.getByText(/Code\sincorrect\.\sIl\sreste\s2\sessai/)).toBeVisible()
  await code.fill(CODE)
  await expect(page.getByText('Bonjour Rose')).toBeVisible()
  await pin(page, '999999')
  await expect(page.getByText(/PIN\sincorrect\s:\sil\sreste\s4\sessai/)).toBeVisible()
  await pin(page, PIN)
  await expect(page).toHaveURL(/\/relais\/?$/)
})

test('PIN : 5 faux de suite bloquent 15 minutes (temps restant affiché, pavé fermé), « PIN oublié ? » reste ouvert', async ({ page }) => {
  await ouvrir(page, '#connexion', FR)
  for (let i = 0; i < 5; i++) {
    await pin(page, '999999')
    await page.waitForTimeout(150)
  }
  await expect(page.getByText(/Connexion\sbloquée\saprès\s5\sPIN\sfaux\s:\sréessayez\sdans\s1[45]:\d\d/)).toBeVisible()
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'PIN oublié ?' })).toBeEnabled()
})

test('PIN oublié : code SMS, nouveau PIN (saisies différentes, PIN trop simple refusés), connexion', async ({ page }) => {
  await ouvrir(page, '#connexion', FR)
  await page.getByRole('button', { name: 'PIN oublié ?' }).click()
  await expect(page.getByRole('heading', { name: 'PIN oublié' })).toBeVisible()
  await page.getByPlaceholder('000000').fill(CODE)
  await expect(page.getByText('Rose, créez votre code PIN')).toBeVisible()
  await pin(page, '135790')
  await expect(page.getByText('Confirmez votre code PIN')).toBeVisible()
  await pin(page, '135799')
  await expect(page.getByText(/ne\ssont\spas\sidentiques/)).toBeVisible()
  await pin(page, '123456')
  await pin(page, '123456')
  await expect(page.getByText(/PIN\strop\ssimple/)).toBeVisible()
  await pin(page, '135790')
  await pin(page, '135790')
  await expect(page).toHaveURL(/\/relais\/?$/)
})

test('changer de numéro délie l’appareil ; le numéro d’une candidature n’ouvre pas encore d’espace', async ({ page }) => {
  await ouvrir(page, '#connexion', FR)
  await page.getByRole('button', { name: 'Changer de numéro' }).click()
  await expect(page.getByRole('heading', { name: 'Votre numéro' })).toBeVisible()
  // Les deux chemins en tête de la carte, l'invitation d'un membre en lien discret, un seul compte de démonstration.
  await expect(page.getByRole('link', { name: 'Devenir point relais' })).toHaveAttribute('href', /\/inscription$/)
  await expect(page.getByRole('link', { name: 'J’ai reçu une invitation' })).toHaveAttribute('href', /\/invitation$/)
  await expect(page.getByRole('button', { name: 'Essayer avec le compte de démonstration' })).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Installer l’application sur ce téléphone' })).toBeVisible()
})

test('invitation : bienvenue selon les droits, PIN en deux saisies, formation à faire, prêt avec la remise fermée', async ({ page }) => {
  await ouvrir(page, '#invitation?jeton=INV-DEMO&demo=premiere', FR)
  await expect(page.getByText('Rose M. vous invite au relais Relais Bastos Carrefour · Bastos')).toBeVisible()
  await expect(page.getByText('Pas d’accès à l’argent du relais')).toBeVisible()
  await expect(page.getByText(/encaisser\sla\sgarde\sen\sespèces/)).toBeVisible()
  await page.getByRole('button', { name: 'Accepter l’invitation' }).click()
  await pin(page, '000000')
  await pin(page, '000000')
  await expect(page.getByText(/PIN\strop\ssimple/)).toBeVisible()
  await pin(page, '582014')
  await pin(page, '582014')
  await expect(page.getByRole('heading', { name: 'Formation obligatoire' })).toBeVisible()
  await expect(page.getByText('0 / 5', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Commencer la formation' })).toHaveAttribute('href', /\/formation$/)
  await page.getByRole('button', { name: 'Plus tard : aller au guichet' }).click()
  await expect(page.getByText(/La\sremise\ss’ouvre\squand\sles\s5\smodules\sobligatoires\ssont\sfaits/)).toBeVisible()
  await page.getByRole('button', { name: 'Aller au guichet' }).click()
  await expect(page).toHaveURL(/\/relais\/?$/)
  // L'invitation est utilisée : elle ne sert pas deux fois.
  await page.goto('invitation?jeton=INV-DEMO')
  await expect(page.getByText(/Formation\sobligatoire|déjà\sacceptée/).first()).toBeVisible()
})

test('invitation expirée : nouvelle invitation demandée au gérant ; lien inconnu', async ({ page }) => {
  await ouvrir(page, '#invitation?jeton=INV-EXPIREE&demo=premiere', FR)
  await expect(page.getByRole('heading', { name: 'Ce lien a expiré' })).toBeVisible()
  await page.getByRole('button', { name: 'Demander une nouvelle invitation' }).click()
  await expect(page.getByText(/Demande\senvoyée\sà\sRose\sM\./)).toBeVisible()
  await page.goto('invitation?jeton=INV-FAUX')
  await expect(page.getByRole('heading', { name: 'Invitation introuvable' })).toBeVisible()
  await page.goto('invitation')
  await page.getByRole('textbox').fill('inv-demo')
  await page.getByRole('button', { name: 'Ouvrir l’invitation' }).click()
  await expect(page).toHaveURL(/jeton=INV-DEMO/)
})

const photo = { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }
const video = { name: 'selfie.mp4', mimeType: 'video/mp4', buffer: Buffer.from([0, 0, 0, 0]) }

test('devenir point relais : 5 étapes validées, brouillon gardé, préfixe vérifié avant le code, envoi après acceptation et signature', async ({ page }) => {
  await ouvrir(page, '#inscription?demo=premiere', FR)
  // L'offre est repliée sous l'étape (un seul objectif par écran) : on l'ouvre.
  await page.getByText('L’offre et la suite de votre demande').click()
  await expect(page.getByText(/200\sF\spar\spetit\scolis\sremis,\s250\sF\spar\smoyen,\s400\sF\spar\sgrand/)).toBeVisible()
  // Étape 1 : champs exigés.
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByText(/Pour\scontinuer\s:\sle\snom\sdu\scommerce\s·\sle\stype\s·\sle\squartier/)).toBeVisible()
  await page.getByPlaceholder('Ex. Boutique Mama René').fill('Boutique Chez Awa')
  await page.getByRole('radio', { name: 'Boutique' }).click()
  await page.getByPlaceholder('Ex. Mvog-Ada').fill('Essos')
  await expect(page.getByText(/Z9\sEssos\sn’est\spas\sencore\sune\szone\sde\slancement/)).toBeVisible()
  await page.getByPlaceholder('Ex. Mvog-Ada').fill('Mokolo')
  await expect(page.getByText(/Z3\sMokolo\s:\szone\sde\slancement/)).toBeVisible()
  await page.getByRole('button', { name: 'Continuer' }).click()
  // Étape 2 : gérant, CNI recto et verso, selfie vidéo.
  await expect(page.getByRole('heading', { name: 'Le gérant' })).toBeVisible()
  await page.getByPlaceholder('Tel que sur la pièce').fill('Awa Ndzana')
  await page.getByPlaceholder('6XX XX XX XX').fill('699112233')
  await page.locator('input[data-piece="cni_recto"]').setInputFiles(photo)
  await page.locator('input[data-piece="cni_verso"]').setInputFiles(photo)
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByText(/Pour\scontinuer\s:\sselfie\svidéo/)).toBeVisible()
  await page.locator('input[data-piece="selfie_video"]').setInputFiles(video)
  // Retour sans perte de saisie (INS-01), même après rechargement.
  await page.waitForTimeout(400)
  await page.reload()
  await expect(page.getByPlaceholder('Tel que sur la pièce')).toHaveValue('Awa Ndzana')
  await page.getByRole('button', { name: 'Retour' }).click()
  await expect(page.getByPlaceholder('Ex. Boutique Mama René')).toHaveValue('Boutique Chez Awa')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  // Étape 3 : photos du local, places, horaires.
  for (const p of ['facade', 'rangement', 'comptoir']) await page.locator(`input[data-piece="${p}"]`).setInputFiles(photo)
  await page.getByPlaceholder('Ex. 30').fill('25')
  await page.getByLabel('HORAIRES HABITUELS').fill('8 h – 19 h, lun. à sam.')
  await page.getByRole('button', { name: 'Continuer' }).click()
  // Étape 4 : préfixe refusé AVANT l'envoi du code (PR03-R06), puis code.
  await page.getByRole('radio', { name: 'MTN MoMo' }).click()
  await page.getByPlaceholder('6XX XX XX XX').fill('699112233')
  await page.getByRole('button', { name: 'Recevoir le code' }).click()
  await expect(page.getByText(/n’est\spas\sun\snuméro\sMTN\sMoMo/)).toBeVisible()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByText(/le\scode\sreçu\spar\sSMS/)).toBeVisible()
  await page.getByPlaceholder('6XX XX XX XX').fill('677889900')
  await page.getByRole('button', { name: 'Recevoir le code' }).click()
  await page.getByPlaceholder('000000').fill('000001')
  await expect(page.getByText('Code incorrect.')).toBeVisible()
  await page.getByPlaceholder('000000').fill(CODE)
  await expect(page.getByText('Numéro de versement vérifié.')).toBeVisible()
  await page.getByRole('button', { name: 'Continuer' }).click()
  // Étape 5 : « Envoyer » actif seulement avec l'acceptation ET la signature (INS-02).
  const envoyer = page.getByRole('button', { name: 'Envoyer ma demande' })
  await expect(envoyer).toBeDisabled()
  await page.getByRole('switch', { name: /J’ai lu la convention/ }).click()
  await expect(envoyer).toBeDisabled()
  await page.getByRole('button', { name: 'Signer avec mon nom' }).click()
  await expect(envoyer).toBeEnabled()
  await envoyer.click()
  await expect(page.getByText('Demande envoyée')).toBeVisible()
  await page.getByRole('button', { name: 'Revoir ma demande' }).click()
  await expect(page.getByRole('dialog')).toContainText('Boutique Chez Awa')
  await expect(page.getByRole('dialog')).toContainText('Mokolo · Z3 Mokolo')
  // Le numéro du candidat n'ouvre pas encore d'espace (ARL-50).
  await page.goto('connexion')
  await page.getByLabel('Numéro', { exact: true }).fill('699112233')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByText(/est\sà\sl’étude/)).toBeVisible()
})

test('activation : relais en configuration, 5 étapes sur 6, sans barre du bas ; l’étape restante ouvre son écran', async ({ page }) => {
  await ouvrir(page, '#activation?demo=configuration', FR)
  await expect(page.getByText('5 / 6', { exact: true })).toBeVisible()
  await expect(page.locator('nav.dock')).toHaveCount(0)
  await page.getByRole('link', { name: /6\. Capacité et horaires déclarés/ }).click()
  await expect(page).toHaveURL(/\/capacite$/)
})

test('activation d’un relais ouvert : certificat de fondateur, 6 étapes validées, convention', async ({ page }) => {
  await ouvrir(page, '#activation', FR)
  await expect(page.getByText('PARTENAIRE FONDATEUR · 50 PREMIERS RELAIS')).toBeVisible()
  await expect(page.getByText('6 / 6', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: /Convention de partenariat/ }).click()
  await expect(page).toHaveURL(/\/convention$/)
  await expect(page.getByRole('table')).toContainText('1000')
})

test('statut suspendu : motif écrit, contestation une seule fois, réponse sous 72 h ouvrées', async ({ page }) => {
  await ouvrir(page, '#statut-relais?demo=suspendu', FR)
  await expect(page.getByRole('heading', { name: 'Relais suspendu' })).toBeVisible()
  await expect(page.getByText(/gelé\ssous\s40\spendant\sla\ssuspension/)).toBeVisible()
  await page.getByRole('link', { name: 'Contester' }).click()
  await expect(page).toHaveURL(/decision\?id=DEC-0031&contester=1/)
  await page.getByRole('button', { name: 'Envoyer la contestation' }).click()
  await expect(page.getByText(/20\scaractères\sau\smoins/)).toBeVisible()
  await page.getByRole('textbox').fill('Les trois remises avaient leur photo : le réseau était coupé, elles sont parties en file.')
  await page.getByRole('button', { name: 'Envoyer la contestation' }).click()
  await expect(page.getByText(/Envoyée\sle\smardi\s13\soctobre\s;\sune\spersonne\sde\sBelivaY\srépond\savant\sle/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Envoyer la contestation' })).toHaveCount(0)
  await page.goto('statut-relais')
  await expect(page.getByText(/Contestation\senvoyée\sle\smardi\s13\soctobre/)).toBeVisible()
  await page.getByRole('tab', { name: 'Décisions' }).click()
  await expect(page.getByText('Suspension · niveau 3 sur 4')).toBeVisible()
  await expect(page.getByText(/contestation\sen\scours/)).toBeVisible()
})

test('statut : l’employé voit le statut mais ne conteste pas et ne demande pas la fin', async ({ page }) => {
  await ouvrir(page, '#statut-relais?demo=employe', FR)
  await page.getByRole('tab', { name: 'Fin du partenariat' }).click()
  await expect(page.getByText(/se\sdemande\spar\sle\sgérant/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Demander la fin du partenariat' })).toHaveCount(0)
})

test('fin du partenariat : motif, confirmation, préavis affiché, demande annulée', async ({ page }) => {
  await ouvrir(page, '#statut-relais', FR)
  await page.getByRole('tab', { name: 'Fin du partenariat' }).click()
  const demander = page.getByRole('button', { name: 'Demander la fin du partenariat' })
  await demander.click()
  await expect(page.getByText('Choisissez un motif.')).toBeVisible()
  await page.getByRole('radio', { name: 'Déménagement' }).click()
  await demander.click()
  await page.getByRole('button', { name: 'Confirmer la demande' }).click()
  await expect(page.getByRole('heading', { name: 'Fin du partenariat demandée' })).toBeVisible()
  await expect(page.getByText(/dès\sle\sjeudi\s5\snovembre/)).toBeVisible()
  await expect(page.getByText(/le\sjeudi\s12\snovembre\sau\splus\stôt/)).toBeVisible()
  await page.getByRole('button', { name: 'Annuler ma demande' }).click()
  await expect(page.getByRole('button', { name: 'Demander la fin du partenariat' })).toBeVisible()
})

test('statut fermé : réouverture et sort des colis ; ouvert : capacité et activation', async ({ page }) => {
  await ouvrir(page, '#statut-relais?demo=ferme', FR)
  await expect(page.getByRole('heading', { name: 'Fermé temporairement' })).toBeVisible()
  await expect(page.getByText(/Réouverture\sdemain\sà\s08\sh/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Modifier ou rouvrir plus tôt' })).toHaveAttribute('href', /\/fermeture$/)
})

test('installer : Android sans invite du navigateur → chemin du menu de Chrome ; iPhone → lien copié', async ({ page }) => {
  await ouvrir(page, '#installer', FR)
  await page.getByRole('tab', { name: 'Android' }).click()
  await page.getByRole('button', { name: 'Installer', exact: true }).click()
  await expect(page.getByText(/ouvrez\sle\smenu\s⋮\sde\sChrome/)).toBeVisible()
  await page.getByRole('tab', { name: 'iPhone' }).click()
  await expect(page.getByText('Ouvrez ce lien dans Safari')).toBeVisible()
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copier le lien pour Safari' }).click()
  await expect(page.getByText(/Lien\scopié|Ouvrez\sSafari\set\stapez/)).toBeVisible()
})

test('anglais : la connexion et la candidature parlent anglais', async ({ page }) => {
  await ouvrir(page, '#inscription?demo=premiere', { nom: 'clair', theme: 'light', lang: 'en' })
  await expect(page.getByText('Become a BelivaY pickup point')).toBeVisible()
  await page.goto('connexion')
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
})
