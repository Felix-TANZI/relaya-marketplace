// Gestes des écrans du groupe VD-11 (Boutique, compte et communication) : chaque geste change les données (source de
// démonstration, gardée sur l'appareil) et l'écran les suit ; montants calculés, jamais écrits ; accès Préparation sans
// montant ni geste réservé au propriétaire.
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const EN = { nom: 'anglais', theme: 'light', lang: 'en' } as const
const main = (page: Page) => page.locator('#app main')

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test.describe('VD-11 · Menu', () => {
  test('compteurs réels du jour, groupes dans l’ordre, recherche d’un écran', async ({ page }) => {
    await ouvrir(page, '#menu', FR)
    await expect(page.locator('.divider-t')).toHaveText(['À traiter', 'Messages et aide', 'Mon argent', 'Mon catalogue', 'Vendre plus', 'Ma boutique', 'Mon compte'])
    // Jeu d'essai : BLV-00008, -00009 et -00010 à préparer ; BLV-00005 et -00006 à répondre.
    await expect(page.locator('a.li', { hasText: 'À préparer' }).locator('.badge-num')).toHaveText('3')
    await expect(page.locator('a.li', { hasText: 'Litiges' }).locator('.badge-num.red')).toHaveText('2')
    // À verser : BLV-00003 (ITEL 20 000 F → 17 840 F) + BLV-00015 (pagne fabriqué au Cameroun 14 000 F → 11 592 F).
    await expect(page.locator('a.li', { hasText: 'Mon argent' })).toContainText('29 137 F vendredi') // 17 840 + 11 592 = 29 432, moins 1 % Mobile Money (295 F)
    // Dix offres (brouillon compris), l'ITEL bleu en vérification.
    await expect(page.locator('a.li', { hasText: 'Mes produits' })).toContainText('10 produits · 1 en vérification')
    await expect(main(page)).not.toContainText('Écrans d’état et d’accès')
    await page.getByRole('searchbox', { name: 'Chercher dans le menu' }).fill('vacances')
    await expect(page.locator('a.li')).toHaveText([/Horaires et fermetures/])
    await page.getByRole('searchbox', { name: 'Chercher dans le menu' }).fill('zzz')
    await expect(main(page)).toContainText('Aucun écran ne correspond')
    await page.getByRole('button', { name: 'Effacer la recherche' }).click()
    await page.locator('a.li', { hasText: 'Horaires et fermetures' }).click()
    await expect(page).toHaveURL(/\/horaires$/)
  })

  test('« C’est prêt » ailleurs : le compteur À préparer suit ; « Se déconnecter » ferme la session', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await page.locator('.hero.orange').getByText('C’est prêt').click()
    await page.goto('menu')
    await expect(page.locator('a.li', { hasText: 'À préparer' }).locator('.badge-num')).toHaveText('2') // 3 − 1
    await page.locator('a.li', { hasText: 'Se déconnecter' }).click()
    await expect(page).toHaveURL(/\/connexion$/)
  })

  test('accès Préparation : ni argent, ni équipe, ni achats', async ({ page }) => {
    await ouvrir(page, '#menu?role=prep', FR)
    await expect(page.locator('.hero.night')).toContainText('Aïcha N.')
    for (const x of ['Mon argent', 'Versements', 'Nouvelle offre', 'Plans & tarifs', 'Se faire voir', 'Mon équipe']) await expect(page.locator('a.li', { hasText: x })).toHaveCount(0)
    await expect(main(page)).not.toContainText(/\d F\b/)
  })
})

test.describe('VD-11 · Ma boutique', () => {
  test('aperçu client fixe, réglages avec leur valeur, description de la vitrine enregistrée', async ({ page }) => {
    await ouvrir(page, '#boutique', FR)
    await expect(page.locator('.hero.night')).toContainText('Vendeur certifié Bronze')
    await expect(page.locator('.hero.night')).toContainText('Trust Score 63')
    // Six avis : 3 + 5 + 5 + 4 + 3 + 4 = 24, soit 4,0 de moyenne.
    await expect(page.locator('a.li', { hasText: 'Avis' })).toContainText('4,0 · 6 avis vérifiés')
    // Le propriétaire et trois accès employés (Aïcha, Paul suspendu, Mireille invitée) : la limite de 3 est atteinte.
    await expect(page.locator('a.li', { hasText: 'Mon équipe' })).toContainText('4 personnes · 3 accès employé sur 3')
    await expect(page.locator('a.li', { hasText: 'Emplacement' })).toContainText('Z10 · Mvog-Mbi / Mvog-Ada · vérifié')
    await page.getByLabel('Ce que vous vendez').fill('Téléphones ITEL neufs et chargeurs')
    await page.getByRole('button', { name: 'Enregistrer la description' }).click()
    await expect(page.locator('[data-annonce]')).toContainText('Description enregistrée.')
    await page.reload()
    await expect(page.getByLabel('Ce que vous vendez')).toHaveValue('Téléphones ITEL neufs et chargeurs')
  })

  test('sécurité : chaque champ dit s’il change librement, sur demande ou jamais ; demande RCCM/NIU avec pièces et code SMS', async ({ page }) => {
    await ouvrir(page, '#boutique', FR)
    const champ = (nom: string) => page.locator(`[data-champ="${nom}"]`)
    await expect(champ('Nom de la boutique')).toContainText('Sur demande')
    await expect(champ('Numéro de versement')).toContainText('Sur demande')
    await expect(champ('Identifiant')).toContainText('Non modifiable')
    await expect(champ('Horaires')).toContainText('Modifiable')
    await expect(page.locator('[data-demande=dm-1]')).toContainText('Acceptée')
    await page.getByRole('button', { name: 'Demander une modification' }).click()
    await page.getByRole('radio', { name: 'Les informations officielles (RCCM, NIU)' }).click()
    await page.getByLabel('RCCM (registre du commerce)').fill('RC-YAO-2026-B-1234')
    await page.getByLabel('NIU (numéro fiscal)').fill('M012345678901A')
    await page.getByLabel('Motif').fill('Je suis immatriculé depuis le 7 octobre.')
    await page.getByRole('button', { name: 'Envoyer la demande' }).click()
    await expect(page.locator('.sheet [role=alert]')).toContainText('Ajoutez au moins une pièce justificative.')
    await page.locator('#modif-pieces').setInputFiles({ name: 'rccm.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
    await page.getByRole('button', { name: 'Envoyer la demande' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('000000')
    await page.getByRole('button', { name: 'Confirmer la demande' }).click()
    await expect(page.locator('.sheet')).toContainText('Rien n’a été envoyé')
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Confirmer la demande' }).click()
    await expect(page.locator('[data-annonce]')).toContainText('BelivaY vous répond sous 72 h ouvrées')
    const d = page.locator('[data-demande]', { hasText: 'RCCM RC-YAO-2026-B-1234' })
    await expect(d).toContainText('En attente')
    await expect(d).toContainText('rccm.pdf')
    await d.getByRole('button', { name: 'Annuler la demande' }).click()
    await expect(d).toContainText('Annulée')
  })

  test('accès Préparation : lecture seule', async ({ page }) => {
    await ouvrir(page, '#boutique?role=prep', FR)
    await expect(page.locator('a.li', { hasText: 'Mon équipe' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Demander une modification' })).toHaveCount(0)
    await expect(page.getByText('Prendre ou choisir une photo')).toHaveCount(0)
  })
})

test.describe('VD-11 · Horaires et fermetures', () => {
  test('« Fermé aujourd’hui » tout de suite, jusqu’à la prochaine ouverture ; rouvrir', async ({ page }) => {
    await ouvrir(page, '#horaires', FR)
    await page.getByRole('switch', { name: 'Fermé aujourd’hui' }).click()
    await expect(page.locator('main')).toContainText('Fermée jusqu’à mer. 14 oct. 08 h')
    await page.goto('./')
    await expect(page.locator('.hd-pills .pill').first()).toHaveText('Fermée aujourd’hui')
    await page.goto('horaires')
    await page.getByRole('switch', { name: 'Fermé aujourd’hui' }).click()
    await expect(page.locator('main')).toContainText('Ouverte aujourd’hui jusqu’à 18 h')
  })

  test('horaires : fermeture avant l’ouverture refusée, puis enregistrés et repris par Ma boutique', async ({ page }) => {
    await ouvrir(page, '#horaires', FR)
    await page.getByRole('button', { name: 'Changer les horaires : Samedi' }).click()
    await page.getByLabel('Fermeture', { exact: true }).fill('07:00')
    await expect(page.locator('.sheet')).toContainText('L’heure de fermeture doit suivre l’ouverture')
    await page.getByLabel('Fermeture', { exact: true }).fill('16:00')
    await page.getByRole('button', { name: 'Appliquer' }).click()
    await expect(page.locator('main')).toContainText('Modifications pas encore enregistrées.')
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page).toHaveURL(/\/boutique$/)
    await expect(page.locator('a.li', { hasText: 'Horaires' })).toContainText('sam 08 h – 16 h')
  })

  test('fermeture programmée : 48 h à l’avance, puis annulée d’un geste', async ({ page }) => {
    await ouvrir(page, '#horaires?prog=1', FR)
    await expect(page.locator('.sheet')).toContainText('au plus tôt vendredi 16 octobre')
    await page.getByLabel('Premier jour fermé').fill('2026-10-14')
    await expect(page.locator('.sheet [role=alert]')).toContainText('Au moins 48 h à l’avance.')
    await page.getByLabel('Premier jour fermé').fill('2026-10-23')
    await page.getByLabel('Dernier jour fermé').fill('2026-10-25')
    await page.getByLabel('Motif (facultatif)').fill('Inventaire')
    await expect(page.locator('.sheet')).toContainText('3 jours fermés')
    await page.getByRole('button', { name: 'Programmer', exact: true }).click()
    await expect(page).toHaveURL(/\/horaires$/)
    await expect(page.locator('.li', { hasText: 'Inventaire' })).toContainText('Du ven. 23 oct. au dim. 25 oct.')
    await page.getByRole('button', { name: 'Annuler la fermeture du ven. 23 oct.' }).click()
    await expect(page.locator('.li', { hasText: 'Inventaire' })).toHaveCount(0)
  })

  test('pause de 7 jours puis reprise', async ({ page }) => {
    await ouvrir(page, '#horaires', FR)
    await page.locator('.card', { hasText: 'Pause de la boutique' }).getByRole('button', { name: 'Mettre en pause' }).click()
    await page.locator('.sheet').getByRole('button', { name: 'Mettre en pause' }).click()
    await expect(page.locator('main')).toContainText('Vos offres sont masquées jusqu’au mar. 20 oct.')
    await page.getByRole('button', { name: 'Reprendre maintenant' }).click()
    await expect(page.locator('main')).toContainText('Pour plusieurs jours sans date de retour')
  })

  test('accès Préparation : ferme et rouvre le jour même, rien d’autre', async ({ page }) => {
    await ouvrir(page, '#horaires?role=prep', FR)
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Programmer une fermeture' })).toHaveCount(0)
    await page.getByRole('switch', { name: 'Fermé aujourd’hui' }).click()
    await expect(page.locator('main')).toContainText('Fermée jusqu’à')
    await page.getByRole('switch', { name: 'Fermé aujourd’hui' }).click()
    await expect(page.locator('main')).toContainText('Ouverte aujourd’hui')
  })
})

test.describe('VD-11 · Emplacement', () => {
  test('repère enregistré ; replacer le point : refus de localisation dit en mots', async ({ page, context }) => {
    await ouvrir(page, '#emplacement', FR)
    await expect(page.locator('[data-lieu]')).toContainText('3,851° N · 11,521° E')
    await page.getByRole('button', { name: 'Replacer le point depuis la boutique' }).click()
    await expect(main(page)).toContainText('Activez la localisation, dans la boutique, puis réessayez.')
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 3.8479, longitude: 11.521, accuracy: 10 })
    await page.getByRole('button', { name: 'Réessayer' }).click()
    await expect(page.locator('[data-annonce]')).toContainText('Point déplacé de 345 m')
    await expect(page.locator('[data-lieu] .pill', { hasText: 'À vérifier' })).toBeVisible()
    await page.getByLabel('Repère pour le livreur').fill('')
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(main(page)).toContainText('Écrivez un repère simple pour le livreur.')
    await page.getByLabel('Repère pour le livreur').fill('Portail bleu, face à la pharmacie')
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page).toHaveURL(/\/boutique$/)
    await expect(page.locator('a.li', { hasText: 'Emplacement' })).toContainText('à vérifier')
  })

  test('tous les lieux : un centre BelivaY en un geste, vérifié ; il devient principal avec le code SMS ; un lieu au GPS reste à vérifier', async ({ page, context }) => {
    await ouvrir(page, '#emplacement', FR)
    // Jeu d'essai : boutique (principale), entrepôt d'Essos vérifié, point de collecte à vérifier ; 5 lieux au plus.
    await expect(page.locator('[role=listitem]')).toHaveCount(3)
    await page.getByRole('button', { name: 'Ajouter Relais BelivaY · Mvan à mes lieux' }).click()
    await expect(page.locator('[role=listitem]')).toHaveCount(4)
    await expect(page.locator('[data-annonce]')).toContainText('vérifié d’office')
    await expect(page.locator('[role=listitem]', { hasText: 'Relais BelivaY · Mvan' })).toContainText('Vérifié')
    await page.getByRole('button', { name: 'Rendre principal' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Confirmer le lieu principal' }).click()
    await expect(page.locator('[role=listitem]').first()).toContainText('Relais BelivaY · Mvan')
    await expect(page.locator('[role=listitem]').first()).toContainText('Principal')
    // Lieu posé au GPS : « À vérifier » ; il ne peut pas devenir principal.
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 3.873, longitude: 11.537, accuracy: 12 })
    await page.getByRole('button', { name: 'Ajouter un lieu' }).click()
    await page.getByRole('radio', { name: 'Entrepôt' }).click()
    await page.getByLabel('Nom du lieu').fill('Dépôt d’Omnisport')
    await page.getByRole('button', { name: 'Me localiser ici' }).click()
    await expect(page.locator('.sheet')).toContainText('Point posé')
    await page.getByRole('button', { name: 'Ajouter ce lieu' }).click()
    await expect(page.locator('[role=listitem]', { hasText: 'Dépôt d’Omnisport' })).toContainText('À vérifier')
    await expect(page.locator('[role=listitem]')).toHaveCount(5)
    await expect(page.locator('[data-lieu]')).toContainText('Z9 · Essos / Nkolmesseng')
    await page.getByRole('button', { name: 'Rendre principal' }).click()
    await expect(page.locator('[data-annonce]')).toContainText('Un lieu à vérifier ne peut pas devenir principal')
  })

  test('accès Préparation : lecture seule ; anglais', async ({ page }) => {
    await ouvrir(page, '#emplacement?role=prep', EN)
    await expect(main(page)).toContainText('Location is read-only')
    await expect(page.getByRole('button', { name: 'Move the point from the shop' })).toHaveCount(0)
  })
})

test.describe('VD-11 · Mon équipe', () => {
  test('ajouter un accès : numéro déjà lié refusé, code faux sans effet, bon code puis compteur à jour', async ({ page }) => {
    await ouvrir(page, '#equipe', FR)
    // Limite atteinte (Aïcha, Paul suspendu, Mireille invitée) : on ne peut ajouter qu'après avoir libéré un accès.
    await expect(main(page)).toContainText('3 accès employés sur 3 : retirez un accès pour en ajouter un.')
    await expect(page.getByRole('button', { name: 'Ajouter un accès' })).toBeDisabled()
    await page.getByRole('button', { name: 'Annuler l’invitation de Mireille T.' }).click()
    await expect(main(page)).toContainText('2 accès employés sur 3 · sur tous les plans')
    await page.getByRole('button', { name: 'Ajouter un accès' }).click()
    await page.getByLabel('Prénom et nom').fill('Paul Ekambi')
    await page.getByLabel('Téléphone').fill('690 00 00 00')
    await page.getByRole('button', { name: 'Envoyer l’invitation' }).click()
    await expect(page.locator('.sheet')).toContainText('Ce numéro a déjà un compte BelivaY')
    await page.getByLabel('Téléphone').fill('677 12 34 56')
    await page.getByRole('button', { name: 'Envoyer l’invitation' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('000000')
    await page.getByRole('button', { name: 'Confirmer l’ajout' }).click()
    await expect(page.locator('.sheet')).toContainText('Code incorrect, réessayez. Rien n’a été créé.')
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Confirmer l’ajout' }).click()
    await expect(main(page)).toContainText('3 accès employés sur 3 : retirez un accès pour en ajouter un.')
    await expect(page.locator('[data-membre]', { hasText: 'Paul Ekambi' })).toContainText('Invitée')
    await expect(main(page)).toContainText('Franck a ajouté Paul Ekambi (Préparation)')
    await page.getByRole('button', { name: 'Annuler l’invitation de Paul Ekambi' }).click()
    await expect(page.locator('[data-membre]', { hasText: 'Paul Ekambi' })).toHaveCount(0)
    await expect(main(page)).toContainText('Franck a annulé l’invitation de Paul Ekambi')
    await expect(main(page)).toContainText('2 accès employés sur 3 · sur tous les plans')
  })

  test('recruter avec un rôle prédéfini ; droits cochés : jamais l’argent ni les prix', async ({ page }) => {
    // Limite de 3 atteinte dans le jeu d'essai : on libère l'invitation de Mireille avant d'ajouter.
    await ouvrir(page, '#equipe', FR)
    await page.getByRole('button', { name: 'Annuler l’invitation de Mireille T.' }).click()
    await page.getByRole('button', { name: 'Ajouter un accès' }).click()
    await page.getByRole('radio', { name: /Service client/ }).click()
    await expect(page.getByRole('checkbox', { name: /Répondre aux clients/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('checkbox', { name: /Préparer/ })).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByRole('checkbox', { name: /Argent, versements/ })).toBeDisabled()
    await expect(page.getByRole('checkbox', { name: /Modifier les prix/ })).toBeDisabled()
    // Cocher « Préparer » coche « Voir les commandes » et fait passer en « Personnalisé ».
    await page.getByRole('checkbox', { name: /Modifier le stock/ }).click()
    await expect(page.getByRole('checkbox', { name: /Voir les produits/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('radio', { name: /Personnalisé/ })).toHaveAttribute('aria-checked', 'true')
    await page.getByLabel('Prénom et nom').fill('Joëlle Mbarga')
    await page.getByLabel('Téléphone').fill('655 11 22 33')
    await page.getByRole('button', { name: 'Envoyer l’invitation' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Confirmer l’ajout' }).click()
    await expect(page.locator('[data-membre]', { hasText: 'Joëlle Mbarga' })).toContainText('Personnalisé')
  })

  test('droits changés avec le code SMS : chaque écran les suit ; suspendre coupe la session ; journal signé', async ({ page }) => {
    await ouvrir(page, '#equipe', FR)
    await page.getByRole('button', { name: 'Droits de Aïcha N.' }).click()
    await page.getByRole('radio', { name: /Gestion du stock/ }).click()
    await page.getByRole('button', { name: 'Enregistrer les droits' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Confirmer les droits' }).click()
    await expect(page.locator('[data-annonce]')).toContainText('Droits de Aïcha enregistrés : Gestion du stock.')
    await expect(page.locator('[data-membre=m-aicha]')).toContainText('Gestion du stock')
    // L'employée voit la commande sans pouvoir la préparer, ne lit plus les litiges ni les messages.
    await page.goto('commande?ref=BLV-00008&role=prep')
    await expect(main(page)).toContainText('Réservé : votre accès ne comprend pas la préparation.')
    await expect(page.getByRole('link', { name: 'C’est prêt' })).toHaveCount(0)
    await page.goto('litiges?role=prep')
    await expect(main(page)).toContainText('Réservé')
    await page.goto('horaires?role=prep')
    await expect(page.getByRole('switch', { name: 'Fermé aujourd’hui' })).toBeDisabled()
    // Journal des actions d'Aïcha, puis suspension : sa session est coupée.
    await page.goto('equipe')
    await page.getByRole('button', { name: 'Journal de Aïcha N.' }).click()
    await expect(page.locator('.sheet')).toContainText('Stock : ITEL AC52 noir 12 → 10')
    await page.getByRole('button', { name: 'Fermer', exact: true }).click()
    await page.getByRole('button', { name: 'Suspendre l’accès de Aïcha N.' }).click()
    await expect(page.locator('[data-membre=m-aicha]')).toContainText('Suspendu')
    await page.goto('commandes?role=prep')
    await expect(page).toHaveURL(/\/connexion\?next=/)
    await page.goto('equipe')
    await page.getByRole('button', { name: 'Réactiver l’accès de Aïcha N.' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Réactiver l’accès', exact: true }).click()
    await expect(page.locator('[data-membre=m-aicha]')).not.toContainText('Suspendu')
  })

  test('supprimer un accès avec le code SMS ; réservé au propriétaire ; l’accès retiré perd sa session', async ({ page }) => {
    await ouvrir(page, '#equipe?role=prep', FR)
    await expect(main(page)).toContainText('Réservé au propriétaire')
    await page.goto('equipe')
    await page.getByRole('button', { name: 'Supprimer l’accès de Aïcha N.' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Supprimer l’accès', exact: true }).click()
    await expect(main(page)).toContainText('2 accès employés sur 3') // Paul (suspendu) et Mireille (invitée) restent
    await expect(page.locator('[data-membre]', { hasText: 'Aïcha N.' })).toHaveCount(0)
    // EQU-04, VD11-R22 : le membre retiré n'a plus de session ; la connexion s'ouvre.
    await page.goto('equipe?role=prep')
    await expect(page).toHaveURL(/\/connexion\?next=/)
  })
})

test.describe('VD-11 · Paramètres', () => {
  test('gagné avec BelivaY calculé ; taille du texte et thème tout de suite ; notification désactivée gardée', async ({ page }) => {
    await ouvrir(page, '#parametres', FR)
    await expect(main(page)).toContainText('Gagné avec BelivaY')
    await expect(main(page)).toContainText(/\d{3}\sF/)
    await page.getByRole('slider', { name: 'Taille du texte' }).fill('4') // « Grande », 115 %
    await expect(page.locator('html')).toHaveAttribute('data-text', 'grande')
    await page.getByRole('switch', { name: 'Thème sombre' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('switch', { name: 'Commandes et litiges' })).toBeDisabled()
    await page.getByRole('switch', { name: 'Avis' }).click()
    await page.reload()
    await expect(page.getByRole('switch', { name: 'Avis' })).toHaveAttribute('aria-checked', 'false')
  })

  // Photo, nom, e-mail et téléphone se changent dans « Mon profil » (AJ-B, DP-58) : Paramètres y mène.
  test('e-mail changé avec deux codes (SMS puis adresse), dans Mon profil', async ({ page }) => {
    await ouvrir(page, '#parametres', FR)
    await page.getByRole('link', { name: 'Mon profil' }).click()
    await expect(page).toHaveURL(/\/profil$/)
    await page.getByRole('button', { name: 'Changer mon e-mail' }).click()
    await page.getByLabel('Nouvelle adresse e-mail').fill('pas-une-adresse')
    await page.getByRole('button', { name: 'Recevoir le code' }).click()
    await expect(page.locator('.sheet')).toContainText('Vérifiez l’adresse e-mail')
    await page.getByLabel('Nouvelle adresse e-mail').fill('tonton.pg@exemple.cm')
    await page.getByRole('button', { name: 'Recevoir le code' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Continuer' }).click()
    await expect(page.locator('.sheet')).toContainText('Étape 2 sur 2')
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Confirmer' }).click()
    await expect(page.locator('[data-annonce]')).toContainText('Adresse e-mail changée.')
    await expect(main(page)).toContainText('t•••••@exemple.cm')
  })

  test('accès Préparation : usage personnel, aucun montant', async ({ page }) => {
    await ouvrir(page, '#parametres?role=prep', FR)
    await expect(main(page)).not.toContainText(/\d F\b/)
    await expect(main(page)).not.toContainText('Mobile Money')
    await expect(page.getByRole('switch', { name: 'Versements du vendredi' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Mon profil' })).toBeVisible()
  })
})

test.describe('VD-11 · Sécurité', () => {
  test('déconnecter un appareil, Face ID, grille calculée, export avec code SMS', async ({ page }) => {
    await ouvrir(page, '#securite', FR)
    await page.getByRole('button', { name: 'Déconnecter Android · Chrome' }).click()
    await expect(page.locator('.li', { hasText: 'Android · Chrome' })).toHaveCount(0)
    await page.getByRole('switch', { name: 'Face ID ou empreinte' }).click()
    await expect(main(page)).toContainText('Face ID ou empreinte : désactivé')
    await page.getByText('Voir la grille par catégorie').click()
    await expect(page.locator('.kv', { hasText: 'Électronique, électroménager' })).toContainText('86,5 à 98 %')
    await page.getByRole('button', { name: /Exporter mes données/ }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Demander l’export' }).click()
    await expect(main(page)).toContainText('Un export est en cours')
  })

  test('mot de passe : règle, puis code SMS', async ({ page }) => {
    await ouvrir(page, '#securite', FR)
    await page.getByRole('button', { name: 'Changer mon mot de passe' }).click()
    await page.getByLabel('Mot de passe actuel').fill('ancien123')
    await page.getByLabel('Nouveau mot de passe').fill('court')
    await page.getByLabel('Confirmer le nouveau').fill('court')
    await page.getByRole('button', { name: 'Recevoir le code' }).click()
    await expect(page.locator('.sheet [role=alert]')).toContainText('8 caractères au minimum, dont un chiffre.')
    await page.getByLabel('Nouveau mot de passe').fill('nouveau2026')
    await page.getByLabel('Confirmer le nouveau').fill('nouveau2026')
    await page.getByRole('button', { name: 'Recevoir le code' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click()
    await expect(page.locator('[data-annonce]')).toContainText('Mot de passe changé.')
  })

  test('clôture : ce qui reste à solder, code SMS, 30 jours, annulable', async ({ page }) => {
    await ouvrir(page, '#securite?cloture=1', FR)
    await expect(page.locator('.sheet')).toContainText('Encore à solder avant la clôture')
    // Litiges ouverts : les seuls non tranchés (état effectif), comme le Menu et les commandes.
    await expect(page.locator('.sheet a.li', { hasText: /Litiges ouverts\s*:\s*3\b/ })).toBeVisible()
    await page.getByRole('button', { name: 'Demander la clôture' }).click()
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Confirmer la demande de clôture' }).click()
    await expect(main(page)).toContainText('Clôture prévue le jeudi 12 novembre')
    await page.getByRole('button', { name: 'Annuler la demande' }).click()
    await expect(main(page)).toContainText('Clôturer mon compte')
  })
})

test.describe('VD-11 · Notifications', () => {
  test('filtres avec leur nombre, lecture d’une notification, tout marquer comme lu', async ({ page }) => {
    await ouvrir(page, '#notifications', FR)
    // Urgent : BLV-00008 et -00009 à préparer, litiges BLV-00005 et -00006, retour BLV-00020 à inspecter.
    await expect(page.locator('.seg a')).toHaveText(['Tout 19', 'Urgent 5', 'Argent 4'])
    await expect(page.locator('a.li')).toHaveCount(19)
    await page.locator('.seg a', { hasText: 'Urgent' }).click()
    await expect(page.locator('a.li')).toHaveCount(5)
    await page.locator('a.li', { hasText: 'BLV-00009 à préparer' }).click()
    await expect(page).toHaveURL(/\/commande\?ref=BLV-00009$/)
    await page.goto('./')
    await expect(page.locator('header .bdg')).toHaveText('3')
    await page.goto('notifications')
    await page.getByRole('button', { name: /Tout marquer comme lu/ }).click()
    await page.goto('./')
    await expect(page.locator('header .bdg')).toHaveCount(0)
  })

  test('« C’est prêt » : la notification n’est plus urgente ; accès Préparation sans argent', async ({ page }) => {
    // BLV-00008 a une notification urgente (l'accueil met en tête BLV-00010, en retard, qui n'en a pas).
    await ouvrir(page, '#commande?ref=BLV-00008', FR)
    await page.getByRole('link', { name: 'C’est prêt' }).click()
    await expect(page).toHaveURL(/\/commande_prete\?ref=BLV-00008$/)
    await page.goto('notifications?f=urgent')
    await expect(page.locator('a.li')).toHaveCount(4)
    await expect(page.locator('a.li', { hasText: 'BLV-00008 à préparer' })).toHaveCount(0)
    await page.goto('notifications?role=prep')
    await expect(page.locator('.seg a', { hasText: 'Argent' })).toHaveCount(0)
    await expect(main(page)).not.toContainText(/\d F\b/)
  })
})

test.describe('VD-11 · Avis', () => {
  test('note moyenne, filtres, réponse privée par le support (coordonnées refusées)', async ({ page }) => {
    await ouvrir(page, '#avis', FR)
    await expect(page.locator('.hero.night .big')).toHaveText('4,0')
    await page.getByRole('button', { name: /3 ★/ }).click()
    await expect(page.locator('.card', { hasText: 'BLV-00002' })).toBeVisible()
    await expect(page.locator('.card', { hasText: 'BLV-00001' })).toHaveCount(0)
    // BLV-00002 a déjà sa réponse ; « À répondre » : BLV-00016 et BLV-00001 (dans les 30 jours, sans réponse).
    await page.getByRole('button', { name: /À répondre/ }).click()
    await expect(page.locator('.card', { hasText: 'BLV-00002' })).toHaveCount(0)
    await page.locator('.card', { hasText: 'BLV-00016' }).getByRole('button', { name: 'Répondre en privé' }).click()
    await page.getByLabel('Votre réponse').fill('Merci, appelez-moi au 677 12 34 56')
    await page.getByRole('button', { name: 'Envoyer au support' }).click()
    await expect(page.locator('.sheet [role=alert]')).toContainText('Pas de numéro')
    await page.getByLabel('Votre réponse').fill('Merci pour votre avis, nous protégeons mieux les boîtes.')
    await page.getByRole('button', { name: 'Envoyer au support' }).click()
    await expect(page).toHaveURL(/\/messages\?fil=f-support$/)
    await expect(main(page)).toContainText('Réponse privée à l’avis')
    await page.goto('avis')
    await expect(page.locator('.card', { hasText: 'BLV-00016' })).toContainText('Réponse privée transmise par le support')
  })
})

test.describe('VD-11 · Messagerie', () => {
  test('conversation : lue en ouvrant, numéro retiré avant l’envoi, réponse rapide', async ({ page }) => {
    await ouvrir(page, '#messages', FR)
    await expect(page.locator('a.li', { hasText: 'Client de BLV-00008' }).locator('.badge-num')).toHaveText('1')
    await page.locator('a.li', { hasText: 'Client de BLV-00008' }).click()
    await expect(page.locator('header h1')).toHaveText('Client de BLV-00008')
    await page.getByLabel('Votre message…').fill('Appelez le 699 11 22 33')
    await expect(main(page)).toContainText('sera retiré avant l’envoi')
    await page.getByRole('button', { name: 'Envoyer', exact: true }).click()
    await expect(main(page)).toContainText('Appelez le •••')
    await page.getByRole('button', { name: 'Le livreur passe aujourd’hui' }).click()
    await page.getByRole('button', { name: 'Envoyer', exact: true }).click()
    await expect(page.locator('[role=log]')).toContainText('Le livreur passe aujourd’hui')
    await page.goto('messages')
    await expect(page.locator('a.li', { hasText: 'Client de BLV-00008' }).locator('.badge-num')).toHaveCount(0)
  })

  test('conversation fermée : pas de champ ; support : accusé de réception', async ({ page }) => {
    await ouvrir(page, '#messages?fil=f-00002', FR)
    await expect(main(page)).toContainText('Conversation fermée à la fin du délai de litige')
    await expect(page.getByLabel('Votre message…')).toHaveCount(0)
    await page.goto('messages')
    await page.getByRole('button', { name: 'Écrire au support BelivaY' }).click()
    await expect(page.locator('header h1')).toHaveText('Support BelivaY')
  })
})

test.describe('VD-11 · Aide', () => {
  test('montants calculés, recherche, WhatsApp prérempli, coordonnées officielles', async ({ page }) => {
    await ouvrir(page, '#aide', FR)
    await page.getByText('Combien je garde sur une vente ?').click()
    await expect(main(page)).toContainText('vous gardez 17 840 F')
    await expect(page.getByRole('link', { name: 'Écrire au support' })).toHaveAttribute('href', /^https:\/\/wa\.me\/237689002812\?text=.*Penga12/)
    await expect(page.getByRole('link', { name: 'Appeler BelivaY au +237 689 002 812' })).toHaveAttribute('href', 'tel:+237689002812')
    await expect(page.getByRole('link', { name: 'BelivaY sur TikTok (nouvel onglet)' })).toHaveAttribute('href', 'https://www.tiktok.com/@belivaymarketplace')
    await page.getByLabel('Chercher dans les questions').fill('ivoire')
    await expect(page.locator('details.more')).toHaveCount(1)
    await expect(main(page)).toContainText('Quels produits sont interdits ?')
  })

  test('accès Préparation : pas de question d’argent ; anglais', async ({ page }) => {
    await ouvrir(page, '#aide?role=prep', EN)
    await expect(main(page)).not.toContainText(/\d F\b/)
    await expect(main(page)).toContainText('Who sees my shop name?')
  })
})
