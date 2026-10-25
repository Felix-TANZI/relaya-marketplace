// Gestes des litiges et retours (VD-07) : chaque geste change les données (source de démonstration, gardée sur
// l'appareil) et les écrans les suivent ; montants calculés (src/calculs), délais lus dans le registre.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
// Une vraie petite photo (PNG 2 × 2) pour « Ajouter » : l'appareil la réduit et l'horodate.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64')
const photo = (nom: string) => ({ name: nom, mimeType: 'image/png', buffer: PNG })

async function ajouterPhoto(page: Page, nom: string) {
  const avant = await page.locator('.photo').count()
  await page.locator('input[data-vd07-photo]').first().setInputFiles(photo(nom))
  await expect(page.locator('.photo')).toHaveCount(avant + 1)
}

test.describe('VD-07 · Litiges reçus', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('la liste vient des données : argent gelé calculé, filtres comptés, plus urgent d’abord, un seul bouton plein', async ({ page }) => {
    await ouvrir(page, '#litiges', FR)
    // Jeu d'essai : BLV-00005 et BLV-00006 à répondre ; BLV-00017 en médiation (réponse envoyée) ; BLV-00018 (gagné,
    // délai de recours passé) et BLV-00019 (accepté) clos.
    await expect(page.locator('.chips .chip')).toHaveText(['À répondre 2', 'En médiation 1', 'Clos 2'])
    await expect(page.locator('.card.ord .oref')).toHaveText(['LITIGE · BLV-00005', 'LITIGE · BLV-00006'])
    await expect(page.locator('.card.ord .cd')).toHaveText(['il reste 19 h 42', 'il reste 44 h 14'])
    await expect(page.locator('.card.ord').first()).toContainText('demain à 05 h 30')
    await expect(page.locator('.card.ord').nth(1)).toContainText('jeudi 15 oct. à 06 h 02')
    // Un seul bouton plein : « Je conteste » du plus urgent (chantier F : trois réponses en un geste).
    await expect(page.locator('main .btn.primary, main .vd7-rep.plein')).toHaveCount(1)
    await expect(page.locator('.card.ord').first().locator('.vd7-rep')).toHaveText(['J’accepte', 'Arrangement', 'Je conteste'])
    await expect(page.locator('.card.ord').first().locator('[data-silence]')).toContainText('BelivaY arbitre')
    // Total gelé = somme des montants gelés des litiges en cours (à répondre + en médiation ; calculés, jamais écrits).
    const total = Number((await page.locator('.hero.night .big').innerText()).replace(/\D/g, ''))
    const montants = await page.locator('.card.ord .cr').allInnerTexts()
    await page.getByRole('tab', { name: /En médiation/ }).click()
    await expect(page.locator('.card.ord .oref')).toHaveText(['LITIGE · BLV-00017'])
    montants.push(...(await page.locator('.card.ord .cr').allInnerTexts()))
    expect(montants).toHaveLength(3)
    const somme = montants.map((m) => Number(m.replace(/\D/g, ''))).reduce((a, b) => a + b, 0)
    expect(total).toBe(somme)
    await page.getByRole('tab', { name: /À répondre/ }).click()
    await expect(page.locator('.hero.night')).toContainText('Sans réponse, BelivaY décide en partant de ce que dit le client.')
    await expect(page.locator('main details[open]')).toHaveCount(0)
  })

  // Le jeu d'essai a désormais un litige à chaque étape : aucun filtre n'est vide au départ (« Aucun litige ici » n'est
  // plus atteignable par les gestes) ; le vide se montre par la recherche, dans un autre filtre que « À répondre ».
  test('recherche et vide : « Aucun litige ne correspond », effacer, retour au filtre « À répondre »', async ({ page }) => {
    await ouvrir(page, '#litiges', FR)
    await page.getByLabel('Chercher un litige').fill('abîmé')
    await expect(page.locator('.card.ord')).toHaveCount(1)
    await expect(page.locator('.card.ord .oref')).toHaveText('LITIGE · BLV-00006')
    await page.getByLabel('Chercher un litige').fill('')
    await page.getByRole('tab', { name: /Clos/ }).click()
    await expect(page.locator('.card.ord')).toHaveCount(2)
    await page.getByLabel('Chercher un litige').fill('BLV-99999')
    await expect(page.getByRole('heading', { name: 'Aucun litige ne correspond' })).toBeVisible()
    await page.getByRole('button', { name: 'Effacer la recherche' }).click()
    await expect(page.locator('.card.ord')).toHaveCount(2)
    await page.getByRole('tab', { name: /À répondre/ }).click()
    await expect(page.locator('.card.ord')).toHaveCount(2)
  })

  test('« Je conteste » : constat obligatoire, confirmation, puis la médiation ; la liste suit', async ({ page }) => {
    await ouvrir(page, '#litige?ref=BLV-00005', FR)
    await expect(page.locator('.pg-k')).toHaveText('Il reste 19 h 42')
    const envoyer = page.getByRole('button', { name: 'Envoyer ma réponse' })
    await expect(envoyer).toBeDisabled()
    await page.getByRole('button', { name: 'Contrôle au ramassage' }).click()
    await expect(page.locator('#vd07-constat')).toHaveValue(/Le livreur a contrôlé/)
    await envoyer.click()
    await expect(page.getByRole('dialog')).toContainText('Envoyer votre réponse ?')
    await page.getByRole('dialog').getByRole('button', { name: 'Envoyer', exact: true }).click()
    await expect(page).toHaveURL(/\/litige_envoye\?ref=BLV-00005$/)
    await expect(page.locator('.hero.night .hk')).toHaveText('Réponse envoyée')
    await expect(page.locator('.hero.night')).toContainText('BelivaY décide avant jeudi 15 oct. à 05 h 30')
    await page.getByRole('link', { name: 'Retour aux litiges' }).click()
    await expect(page.locator('.chips .chip')).toHaveText(['À répondre 1', 'En médiation 2', 'Clos 2'])
    await page.reload()
    await expect(page.locator('.chips .chip')).toHaveText(['À répondre 1', 'En médiation 2', 'Clos 2'])
  })

  test('arrangement : moins de 40 caractères, envoi impossible ; compteur vert à 40', async ({ page }) => {
    await ouvrir(page, '#litige?ref=BLV-00006&pos=arrangement', FR)
    await expect(page.getByRole('radio', { name: /Remplacement/ })).toHaveAttribute('aria-checked', 'true')
    const champ = page.locator('#vd07-proposition')
    await champ.fill('Un iPhone neuf.')
    await expect(page.locator('.cnt')).toHaveText('15 caractères · 40 au moins')
    await expect(page.getByRole('button', { name: 'Envoyer ma réponse' })).toBeDisabled()
    await champ.fill('Je propose un iPhone 15 Pro Max neuf, même couleur, expédié vite.')
    await expect(page.locator('.cnt')).toHaveClass(/ok/)
    await expect(page.getByRole('button', { name: 'Envoyer ma réponse' })).toBeEnabled()
    await expect(page.locator('.note.amber')).toContainText('72 h ouvrées')
  })

  test('« J’accepte » : le litige est clos, jamais « Réponse envoyée » ; ce que paie le vendeur', async ({ page }) => {
    await ouvrir(page, '#litige?ref=BLV-00006&pos=accepte', FR)
    await expect(page.locator('.note.amber')).toContainText('Le client est remboursé dès qu’il dépose l’article au relais.')
    await expect(page.locator('.note.amber')).toContainText('vous payez seulement le trajet retour (500 F) et la livraison du colis')
    await expect(page.locator('summary', { hasText: 'Vos preuves' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Envoyer ma réponse' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Envoyer', exact: true }).click()
    await expect(page).toHaveURL(/\/litige_envoye\?ref=BLV-00006&issue=accepte$/)
    await expect(page.locator('.hero .hk')).toHaveText('Litige clos')
    await expect(page.locator('main')).not.toContainText('Réponse envoyée')
    await page.goto('litiges?f=clos')
    // Rejoint BLV-00018 et BLV-00019 (clos du jeu d'essai), rangés par échéance.
    await expect(page.locator('.card.ord .oref')).toHaveText(['LITIGE · BLV-00018', 'LITIGE · BLV-00019', 'LITIGE · BLV-00006'])
  })

  test('preuves : une photo ajoutée au dossier (horodatée), retirable avant l’envoi ; brouillon gardé', async ({ page }) => {
    await ouvrir(page, '#litige?ref=BLV-00005', FR)
    await expect(page.locator('summary', { hasText: 'Vos preuves' })).toHaveText(/2 photos déjà au dossier/)
    await ajouterPhoto(page, 'boite.png')
    await expect(page.locator('summary', { hasText: 'Vos preuves' })).toHaveText(/3 photos déjà au dossier/)
    await expect(page.locator('.photo').last()).toContainText('Votre photo · 13 oct. 09 h 48')
    await page.getByRole('button', { name: 'Retirer cette photo' }).click()
    await expect(page.locator('summary', { hasText: 'Vos preuves' })).toHaveText(/2 photos déjà au dossier/)
    await page.locator('#vd07-constat').fill('Le modèle remis est celui de la commande.')
    await expect(page.getByText('Brouillon gardé sur ce téléphone pendant 24 h.')).toBeVisible()
    await page.reload()
    await expect(page.locator('#vd07-constat')).toHaveValue('Le modèle remis est celui de la commande.')
  })

  test('hors connexion : « Répondre à un litige demande le réseau », envoi désactivé, texte gardé', async ({ page, context }) => {
    await ouvrir(page, '#litige?ref=BLV-00005', FR)
    await page.locator('#vd07-constat').fill('Le livreur a vérifié le modèle.')
    await context.setOffline(true)
    await expect(page.getByText('Répondre à un litige demande le réseau')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Envoyer ma réponse' })).toBeDisabled()
    await expect(page.locator('#vd07-constat')).toHaveValue('Le livreur a vérifié le modèle.')
    await context.setOffline(false)
    await expect(page.getByRole('button', { name: 'Envoyer ma réponse' })).toBeEnabled()
  })

  test('accès Préparation : aucun montant, il ajoute des preuves, la réponse revient au propriétaire', async ({ page }) => {
    await ouvrir(page, '#litige?ref=BLV-00005&role=prep', FR)
    await expect(page.locator('main')).not.toContainText(/\d F\b|FCFA/)
    await expect(page.getByRole('radio')).toHaveCount(0)
    await expect(page.locator('main')).toContainText('La réponse au litige revient à Franck Penga, propriétaire.')
    await ajouterPhoto(page, 'scelle.png')
    await page.goto('litiges?role=prep')
    await expect(page.locator('main')).not.toContainText(/\d F\b|FCFA/)
    await expect(page.locator('.card.ord .btn').first()).toHaveText('Ajouter des preuves')
  })
})

test.describe('VD-07 · Décision et suites', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('gagné : la vente reste, libérée après le délai de recours, versée un vendredi ; aucun effet sur le score', async ({ page }) => {
    await ouvrir(page, '#litige_envoye?issue=gagne&ref=BLV-00005', FR)
    await expect(page.locator('.hero.green .hk')).toHaveText('Litige gagné')
    await expect(page.locator('.hero.green .hs')).toContainText(/Libérés .+, versés vendredi \d+ \w+ vers MTN ···· 4217\./)
    await expect(page.locator('main')).toContainText('Effet sur votre Trust Score')
    await expect(page.locator('main')).toContainText('Aucun')
    await expect(page.locator('.note.ink')).toContainText('Le client peut contester une fois')
    await expect(page.getByRole('button', { name: 'Contester la décision' })).toHaveCount(0)
    await expect(page.locator('main')).not.toContainText('tribunal')
  })

  test('perdu : effet sur le Trust Score, contestation une fois (40 caractères), puis « Contestation utilisée le »', async ({ page }) => {
    await ouvrir(page, '#litige_envoye?issue=perdu&ref=BLV-00005', FR)
    await expect(page.locator('.hero.red .hk')).toHaveText('Litige perdu')
    await expect(page.locator('main')).toContainText('Échec léger sur le critère Litiges')
    await page.getByRole('button', { name: 'Contester la décision' }).click()
    const dialogue = page.getByRole('dialog')
    await dialogue.locator('#vd07-recours').fill('Trop court.')
    await expect(dialogue.getByRole('button', { name: 'Envoyer ma contestation' })).toBeDisabled()
    await dialogue.locator('#vd07-recours').fill('La photo du ramassage montre la boîte 256 Go, prise devant le livreur.')
    await dialogue.getByRole('button', { name: 'Envoyer ma contestation' }).click()
    await expect(page.locator('main')).toContainText('Contestation utilisée le mar. 13 oct. à 09 h 48')
    await expect(page.getByRole('button', { name: 'Contester la décision' })).toHaveCount(0)
  })

  test('en médiation : ce qui peut arriver (des textes, pas des liens), historique du dossier', async ({ page }) => {
    await ouvrir(page, '#litige_envoye?ref=BLV-00006', FR)
    await expect(page.locator('main')).toContainText('Vous n’avez pas encore répondu')
    await page.getByRole('link', { name: 'Répondre' }).click()
    await expect(page).toHaveURL(/\/litige\?ref=BLV-00006$/)
  })
})

test.describe('VD-07 · Retours, inspection, remplacement', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('retour en route : trois lignes du jeu d’essai, puis « J’ai reçu le retour » lance les 48 h', async ({ page }) => {
    // Jeu d'essai : BLV-00020 à inspecter, BLV-00021 à choisir, BLV-00022 en médiation ; BLV-00004 en route ; BLV-00023 clos.
    await ouvrir(page, '#retours', FR)
    await expect(page.locator('.seg a')).toHaveText(['À décider 3', 'En route 1', 'Clos 1'])
    await page.getByRole('tab', { name: /En route/ }).click()
    const carte = page.locator('.card.ord', { hasText: 'BLV-00004' })
    await expect(page.locator('.card.ord')).toHaveCount(1)
    await expect(carte).toContainText('demain, entre 14 h et 16 h')
    await expect(carte).toContainText('vendredi 16 oct. à 16 h')
    await expect(carte).toContainText('17 840 F')
    await page.getByRole('button', { name: 'J’ai reçu le retour' }).click()
    await page.getByRole('tab', { name: /À décider/ }).click()
    await expect(page.locator('.seg a')).toHaveText(['À décider 4', 'En route 0', 'Clos 1'])
    await expect(page.getByRole('link', { name: /Inspecter · 48 h 00/ })).toBeVisible()
    await expect(carte).toContainText('jeudi 15 oct. à 09 h 48')
  })

  test('inspection conforme : deux cases, deux photos, verdict ; puis remplacement proposé, stock réservé', async ({ page }) => {
    await ouvrir(page, '#retours?f=en_route', FR)
    await page.getByRole('button', { name: 'J’ai reçu le retour' }).click()
    await page.goto('inspection?ref=BLV-00004')
    const bouton = page.getByRole('button', { name: 'Continuer : remplacer ou rembourser' })
    await expect(bouton).toBeDisabled()
    await page.getByRole('checkbox', { name: 'Scellé du retour intact' }).click()
    await page.getByRole('checkbox', { name: /numéro de série/ }).click()
    await ajouterPhoto(page, 'recu.png')
    await expect(page.getByText('Ajoutez au moins deux photos').first()).toBeVisible()
    await ajouterPhoto(page, 'ecran.png')
    await page.getByRole('radio', { name: /Oui : conforme au motif/ }).click()
    await expect(bouton).toBeEnabled()
    await bouton.click()
    await expect(page).toHaveURL(/\/remplacement\?ref=BLV-00004$/)
    await expect(page.locator('.pill.green')).toHaveText('En stock : 3')
    await expect(page.locator('.keep')).toContainText('17 840 F')
    await expect(page.locator('main')).toContainText('Échec grave sur la Qualité')
    await page.getByRole('button', { name: 'Proposer le remplacement' }).click()
    await expect(page).toHaveURL(/\/retours\?f=a_decider$/)
    const carte = page.locator('.card.ord', { hasText: 'BLV-00004' })
    await expect(carte.locator('.pill')).toHaveText('À expédier')
    // 72 h ouvrées depuis lundi 21 à 09 h 48, dimanche non compté : jeudi 24 à 09 h 48.
    await expect(carte).toContainText('vendredi 16 oct. à 09 h 48')
    await carte.getByRole('button', { name: 'Le remplacement est prêt' }).click()
    await expect(page.locator('.seg a')).toHaveText(['À décider 3', 'En route 0', 'Clos 2'])
  })

  test('inspection non conforme : le bouton suit la réponse, preuves en médiation', async ({ page }) => {
    await ouvrir(page, '#retours?f=en_route', FR)
    await page.getByRole('button', { name: 'J’ai reçu le retour' }).click()
    await page.goto('inspection?ref=BLV-00004&d=non')
    await page.getByRole('checkbox', { name: 'Scellé du retour intact' }).click()
    await page.getByRole('checkbox', { name: /numéro de série/ }).click()
    await ajouterPhoto(page, 'a.png')
    await ajouterPhoto(page, 'b.png')
    await page.getByRole('button', { name: 'Envoyer mes preuves en médiation' }).click()
    await expect(page).toHaveURL(/\/retours\?f=a_decider$/)
    const carte = page.locator('.card.ord', { hasText: 'BLV-00004' })
    await expect(carte.locator('.pill')).toHaveText('En médiation')
    await expect(carte).toContainText('BelivaY décide avant')
  })

  test('« Rembourser le client » : la carte du remplacement disparaît, le bouton change', async ({ page }) => {
    await ouvrir(page, '#retours?f=en_route', FR)
    await page.getByRole('button', { name: 'J’ai reçu le retour' }).click()
    await page.goto('inspection?ref=BLV-00004&d=conforme')
    await page.getByRole('checkbox', { name: 'Scellé du retour intact' }).click()
    await page.getByRole('checkbox', { name: /numéro de série/ }).click()
    await ajouterPhoto(page, 'a.png')
    await ajouterPhoto(page, 'b.png')
    await page.getByRole('button', { name: 'Continuer : remplacer ou rembourser' }).click()
    await page.getByRole('radio', { name: /Rembourser le client/ }).click()
    await expect(page).toHaveURL(/c=rembourser/)
    await expect(page.locator('.keep')).toHaveCount(0)
    await page.getByRole('button', { name: 'Rembourser le client' }).click()
    await expect(page).toHaveURL(/\/retours\?f=clos$/)
    await expect(page.locator('.card.ord', { hasText: 'BLV-00004' }).locator('.pill')).toHaveText('Remboursé')
  })

  test('accès Préparation : aucun montant ; il inspecte ; le choix revient au propriétaire', async ({ page }) => {
    await ouvrir(page, '#retours?f=en_route&role=prep', FR)
    await expect(page.locator('main')).not.toContainText(/\d F\b|FCFA/)
    await page.getByRole('button', { name: 'J’ai reçu le retour' }).click()
    await page.goto('inspection?ref=BLV-00004&d=conforme&role=prep')
    await expect(page.locator('main')).not.toContainText(/\d F\b/)
    await page.getByRole('checkbox', { name: 'Scellé du retour intact' }).click()
    await page.getByRole('checkbox', { name: /numéro de série/ }).click()
    await ajouterPhoto(page, 'a.png')
    await ajouterPhoto(page, 'b.png')
    await page.getByRole('button', { name: 'Continuer : remplacer ou rembourser' }).click()
    // ?role=prep est un scénario d'adresse (démonstration) : on le garde en ouvrant l'écran suivant.
    await page.goto('remplacement?ref=BLV-00004&role=prep')
    await expect(page.locator('main')).toContainText('revient à Franck Penga, propriétaire')
    await expect(page.locator('main')).not.toContainText(/\d F\b/)
    await expect(page.getByRole('button', { name: 'Proposer le remplacement' })).toHaveCount(0)
  })

  test('anglais : textes et montants à l’anglaise', async ({ page }) => {
    await ouvrir(page, '#litiges', { nom: 'anglais', theme: 'light', lang: 'en' })
    await expect(page.locator('h1.pg-t')).toHaveText('Disputes received')
    await expect(page.locator('.card.ord .cd').first()).toHaveText('19 h 42 min left')
    await expect(page.locator('.hero.night')).toContainText('Without a reply, BelivaY decides based on what the customer says.')
    await page.goto('retours?f=en_route')
    await expect(page.locator('.card.ord')).toContainText('17,840 F')
    await expect(page.locator('.card.ord')).toContainText('tomorrow, between 2 and 4 pm')
  })
})
