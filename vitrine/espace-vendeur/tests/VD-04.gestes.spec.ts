// Gestes de l'Accueil vendeur (VD-04), écran de référence de la méthode : chaque geste change les données (source de
// démonstration, gardée sur l'appareil) et l'écran les suit ; les compteurs et les montants viennent des données.
import { expect, test } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'
import { calculerCommission, familleDe } from '../src/calculs/commission'
import { PARAMETRES } from '../src/calculs/registre'
import { ecartJours } from '../src/calculs/temps'
import { ARTICLES, BOUTIQUE, COMMANDES, OFFRES } from '../src/demo/jeu-essai'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
// Montants attendus calculés par src/calculs depuis le jeu d'essai, jamais écrits : gardé d'une vente d'un article
// au palier de la boutique (découverte active ou non), en francs à la française ou à l'anglaise.
const PC = PARAMETRES.commission
const garde = (offre: keyof typeof ARTICLES, decouverte = true) => {
  const a = ARTICLES[offre]
  return calculerCommission([{ famille: familleDe(a.categorie, PC), prixUnitaire: a.prix, quantite: 1, madeInCameroon: a.madeInCameroon }], BOUTIQUE.palier, decouverte, PC).garde
}
const F = (n: number) => n.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ') + ' F'
const FEN = (n: number) => n.toLocaleString('en-US') + ' F'
// À préparer dans le jeu d'essai (lundi 21 sept., 09 h 48) : le retard de samedi (BLV-00010, chargeur) d'abord.
const A_PREPARER = COMMANDES.filter((c) => c.etape === 'a_preparer').length

test.describe('VD-04 · Accueil', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
  })

  test('ce qu’il y a à faire vient des données : neuf choses, la plus urgente en héros, comptes à rebours', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await expect(page.locator('h1.pg-t')).toHaveText('Neuf choses à faire')
    // Chantier F : les actions avec leur nombre (BLV-00008 a déjà photo et emballage : « Marquer prêt ») ; Répondre =
    // 2 litiges + 4 retours + 2 questions de clients ; 3 stocks bas.
    await expect(page.locator('.vd4-acts .vd4-act-v')).toHaveText([String(A_PREPARER - 1), '1', '8', '3'])
    // La plus urgente : la commande en retard depuis samedi (échéance passée), avant celles du jour.
    await expect(page.locator('.hero.orange .hk')).toHaveText('À préparer · BLV-00010')
    await expect(page.locator('.hero.orange .pill')).toHaveText('Délai dépassé')
    // Montant gardé calculé (chargeur 4 000 F, Bronze), jamais écrit.
    await expect(page.locator('.hero.orange')).toContainText(F(garde('chargeur')))
    // Puis les commandes du jour, par échéance, avec leur compte à rebours.
    await expect(page.locator('main .card.ord', { hasText: 'BLV-00008' }).first()).toContainText('il reste 2 h 54')
    await expect(page.locator('main .card.ord', { hasText: 'BLV-00009' }).first()).toContainText('il reste 3 h 17')
  })

  test('« C’est prêt » : la commande part chez le livreur, la remise s’ouvre, l’accueil compte une chose de moins', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await page.locator('.hero.orange').getByText('C’est prêt').click()
    await expect(page).toHaveURL(/\/commande_prete\?ref=BLV-00010$/)
    await page.goBack()
    await expect(page.locator('h1.pg-t')).toHaveText('Huit choses à faire')
    await expect(page.locator('.vd4-acts .vd4-act-v').first()).toHaveText(String(A_PREPARER - 2))
    await expect(page.locator('.hero.orange .hk')).toHaveText('À préparer · BLV-00008')
    // Badge Commandes de la barre du bas : ce qui reste à préparer.
    await expect(page.locator('nav.dock .tab', { hasText: 'Commandes' }).locator('.bdg')).toHaveText(String(A_PREPARER - 1))
    await page.reload()
    await expect(page.locator('h1.pg-t')).toHaveText('Huit choses à faire')
  })

  test('« Fermer aujourd’hui » puis « Rouvrir maintenant » : la pastille de l’en-tête et la carte suivent', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await page.getByRole('button', { name: 'Fermer aujourd’hui' }).click()
    await expect(page.locator('.hd-pills .pill').first()).toHaveText('Fermée aujourd’hui')
    await expect(page.locator('main')).toContainText(`Les ${A_PREPARER} commandes déjà reçues restent à préparer.`)
    await page.reload()
    await expect(page.locator('.hd-pills .pill').first()).toHaveText('Fermée aujourd’hui')
    await page.getByRole('button', { name: 'Rouvrir maintenant' }).click()
    await expect(page.locator('.hd-pills .pill').first()).toHaveText('Ouverte · 18 h')
  })

  test('alerte avant un seuil : montrée par ?alerte=1, gain calculé, « Masquer » la range pour la semaine', async ({ page }) => {
    await ouvrir(page, '#accueil?alerte=1', FR)
    await expect(page.locator('main')).toContainText('Plus que 2 points pour passer Argent et garder 324 F de plus par ITEL.')
    await page.getByRole('button', { name: 'Masquer' }).click()
    await expect(page).toHaveURL(/\/vendeur\/?$/)
    await expect(page.locator('main')).not.toContainText('Votre score approche')
  })

  test('accès Préparation : aucun montant, même travail', async ({ page }) => {
    await ouvrir(page, '#accueil?role=prep', FR)
    await expect(page.locator('.pg-k')).toHaveText('Bonjour Aïcha · accès Préparation')
    await expect(page.locator('main')).not.toContainText(/\d F\b/)
    await expect(page.locator('.hero.orange').getByText('C’est prêt')).toBeVisible()
    await expect(page.locator('nav.dock .dot')).toHaveCount(0)
    await expect(page.locator('main .hint-l')).toContainText('réservés à Franck Penga, propriétaire')
  })

  test('menu du profil : montant à verser calculé, messages non lus, déconnexion réelle', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await page.locator('header .avatar').click()
    // À verser : libéré, pas encore versé — BLV-00003 (ITEL) et BLV-00018 (pagne, litige gagné le 12 sept., libéré le 18).
    await expect(page.locator('.pm')).toContainText(`${F(garde('itel-noir') + garde('pagne-bleu'))} à verser`)
    await page.locator('.pm').getByText('Se déconnecter').click()
    await expect(page).toHaveURL(/\/connexion$/)
    await page.goto('./')
    await expect(page).toHaveURL(/\/connexion\?next=/)
    // Connexion (VD-03) : « Continuer avec Google » rouvre la session (appareil reconnu), ramène à l'accueil.
    await page.getByText('Continuer avec Google').click()
    await expect(page).toHaveURL(/\/vendeur\/?$/)
    await expect(page.locator('h1.pg-t')).toHaveText('Neuf choses à faire')
  })

  test('anglais : textes et montants à l’anglaise', async ({ page }) => {
    await ouvrir(page, '#accueil', { nom: 'anglais', theme: 'light', lang: 'en' })
    await expect(page.locator('h1.pg-t')).toHaveText('Nine things to do')
    await expect(page.locator('.hero.orange')).toContainText(FEN(garde('chargeur')))
    await expect(page.locator('.hero.orange')).toContainText('between 2 and 4 pm')
  })

  test('filtres : une action ne montre que ce qu’elle demande, la toucher encore montre tout', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await page.locator('.vd4-acts [data-action=repondre]').click()
    await expect(page.locator('main .card.ord.red')).toHaveCount(2)
    await expect(page.locator('main .hero.orange')).toHaveCount(0)
    await expect(page.locator('main .card.ord.ink')).toHaveCount(4)
    await expect(page.locator('main .card.ord.amber')).toHaveCount(0)
    await page.locator('.vd4-acts [data-action=repondre]').click()
    await expect(page.locator('main .hero.orange')).toHaveCount(1)
  })

  test('« En attente du livreur » : le colis prêt garde son code de remise à portée de main', async ({ page }) => {
    await ouvrir(page, '#accueil', FR)
    await page.locator('.hero.orange').getByText('C’est prêt').click()
    await expect(page).toHaveURL(/\/commande_prete\?ref=BLV-00010$/)
    await page.goBack()
    const ligne = page.locator('main .li', { hasText: 'BLV-00010 · Chargeur rapide 18 W · USB-C · blanc' })
    await expect(ligne).toContainText('Serge M. aujourd’hui entre 14 h et 16 h · code de remise')
    await ligne.click()
    await expect(page).toHaveURL(/\/commande_prete\?ref=BLV-00010$/)
  })

  test('hors connexion : bandeau, « Fermer aujourd’hui » mis en file, envoyé au retour du réseau', async ({ page, context }) => {
    await ouvrir(page, '#accueil', FR)
    await context.setOffline(true)
    await expect(page.locator('.offline-banner')).toContainText('Pas de connexion. Données de 09 h 48.')
    await page.getByRole('button', { name: 'Fermer aujourd’hui' }).click()
    await expect(page.locator('main')).toContainText('Fermeture en attente d’envoi')
    await expect(page.locator('main .foot')).toContainText('Connexion perdue · 1 action(s) en attente d’envoi')
    await expect(page.locator('.hd-pills .pill').first()).toHaveText('Ouverte · 18 h')
    await context.setOffline(false)
    await expect(page.locator('.hd-pills .pill').first()).toHaveText('Fermée aujourd’hui')
    await expect(page.locator('main .foot')).toContainText('Connecté · aucune action en attente d’envoi')
  })

  test('hors connexion (écran) : « C’est prêt » en file avec son heure, retirer, puis envoi au retour du réseau', async ({ page, context }) => {
    await ouvrir(page, '#horsligne', FR)
    await expect(page.locator('h1.pg-t')).toHaveText('Connecté')
    await context.setOffline(true)
    await expect(page.locator('h1.pg-t')).toHaveText('Hors connexion')
    const carte = page.locator('main .card.ord', { hasText: 'BLV-00008' })
    await carte.getByRole('button', { name: 'C’est prêt' }).click()
    await expect(carte).toContainText('« C’est prêt » en attente d’envoi · fait à 09 h 48')
    await expect(page.locator('main')).toContainText('1 action en attente')
    await expect(page.locator('main')).toContainText('Fait à 09 h 48 · Mvog-Ada · par Franck')
    await expect(page.locator('main')).toContainText('expire dans 72 h 00')
    await page.getByRole('button', { name: 'Retirer de la file' }).click()
    await expect(page.locator('main')).toContainText('Aucune action en attente')
    await carte.getByRole('button', { name: 'C’est prêt' }).click()
    await page.getByRole('button', { name: 'Réessayer' }).click()
    await expect(page.locator('main')).toContainText('Toujours pas de réseau')
    await context.setOffline(false)
    await expect(page.locator('main')).toContainText('Dernier envoi à 09 h 48 : 1 action(s) envoyée(s).')
    await expect(page.locator('main .card.ord', { hasText: 'À REMETTRE · BLV-00008' })).toBeVisible()
  })

  test('rien à faire : chiffres calculés (gagné, libération du jour, prochain versement), un seul bouton plein', async ({ page }) => {
    await ouvrir(page, '#accueil_calme', FR)
    await expect(page.locator('h1.pg-t')).toHaveText('Rien à faire pour l’instant')
    const cle = page.locator('.hero.night')
    // Gagné depuis l'inscription (douze mois de ventes libérées) : le total grandit ce soir du gardé de BLV-00007 (ITEL).
    await expect(cle.locator('.big')).toHaveText(/^\d[\d\s]*FCFA$/)
    const gagne = Number((await cle.locator('.big').innerText()).replace(/\D/g, ''))
    await expect(cle).toContainText(`${F(gagne + garde('itel-noir'))} ce soir à 18 h, quand BLV-00007 se libère`)
    // Prochain versement : ce qui est déjà libéré (BLV-00003) plus ce qui se libère d'ici là ; total = somme des deux.
    await expect(cle).toContainText('Vendredi 16 oct.')
    const versement = (await cle.innerText()).replace(/[\u202f\u00a0]/g, ' ')
    const m = /Vendredi 16 oct\.\s*([\d ]+) F\s*([\d ]+) F déjà prêts, plus ([\d ]+) F/.exec(versement)
    expect(m, versement).not.toBeNull()
    const [total, deja, reste] = m!.slice(1).map((x) => Number(x.replace(/\D/g, '')))
    expect(deja).toBeGreaterThanOrEqual(garde('itel-noir'))
    expect(total).toBe(deja + reste)
    // Mois de septembre : gardé < ventes libérées (la commission est retenue sur chaque vente).
    const mois = /Vous avez gardé ([\d ]+) F sur ([\d ]+) F de ventes libérées\./.exec((await page.locator('main').innerText()).replace(/[\u202f\u00a0]/g, ' '))
    expect(mois).not.toBeNull()
    expect(Number(mois![1].replace(/\D/g, ''))).toBeLessThan(Number(mois![2].replace(/\D/g, '')))
    await expect(page.locator('main')).toContainText('Au palier Argent, vous garderez 324 F de plus par ITEL')
    await expect(page.locator('main .btn.primary')).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'Ajouter ce produit' })).toHaveAttribute('href', /offre1\?q=chargeur\+itel/)
    await ouvrir(page, '#accueil_calme?role=prep', FR)
    await expect(page.locator('main')).not.toContainText(/\d F\b|FCFA/)
  })

  test('premier jour : gestes cochés, palier de lancement, découverte en francs gardés', async ({ page }) => {
    await ouvrir(page, '#premier_jour', FR)
    // Jour compté depuis la signature du contrat (jour 1 = jour de signature).
    await expect(page.locator('.pg-k')).toHaveText(`Bienvenue Franck · jour ${ecartJours(BOUTIQUE.signature, '2026-10-13') + 1}`)
    await expect(page.locator('main')).toContainText('3 sur 3 faits')
    const enLigne = OFFRES.filter((o) => o.etat === 'en_vente' && o.stock > 0).length
    await expect(page.locator('main')).toContainText(`${enLigne} produits en ligne`)
    await expect(page.locator('main')).toContainText('Votre boutique a démarré')
    // Palier de lancement : passé la fenêtre de lancement après la signature, il ne s'affiche plus.
    await expect(page.locator('main')).not.toContainText('pour passer Argent')
    await expect(page.locator('main')).toContainText(
      `Vous gardez ${F(garde('itel-noir', true) - garde('itel-noir', false))} de plus sur chaque ITEL AC52 à 20 000 F.`,
    )
    // Découverte : commandes encaissées comptées (hors payables au retrait), jusqu'au plafond du registre.
    const comptees = COMMANDES.filter((c) => !c.payableAuRetrait && !c.remplacementDe).length
    await expect(page.locator('main')).toContainText(`Encore ${PC.decouverteCommandes - comptees} commandes ou jusqu’au 18 déc., la première limite atteinte.`)
    // Sans palier de lancement, pas de carte « Comment ça marche » des paliers de lancement.
    await expect(page.locator('main details.more')).toHaveCount(0)
  })

  test('compte suspendu : motif, date, contestation seul bouton plein ; accès Préparation sans argent', async ({ page }) => {
    await ouvrir(page, '#suspendu', FR)
    await expect(page.locator('.hd-pills .pill').first()).toHaveText('Compte suspendu')
    const cle = page.locator('.hero.red')
    await expect(cle).toContainText('Compte suspendu · niveau 3')
    await expect(cle).toContainText('Depuis le samedi 10 octobre à 10 h 12.')
    await expect(cle).toContainText('gelé sous 40 pendant la suspension')
    await expect(cle.getByRole('link', { name: 'Contester cette décision' })).toHaveAttribute('href', /\/contester\?d=DEC-2026-0918-S3&depuis=suspendu$/)
    await expect(page.locator('main')).toContainText(`${A_PREPARER} commandes déjà reçues restent à préparer`)
    await expect(page.locator('main')).toContainText('20 commandes suivantes')
    await ouvrir(page, '#suspendu?role=prep', FR)
    await expect(page.getByRole('link', { name: /Voir votre argent/ })).toHaveCount(0)
  })

  test('anglais : rien à faire et hors connexion', async ({ page }) => {
    await ouvrir(page, '#accueil_calme', { nom: 'anglais', theme: 'dark', lang: 'en' })
    const gagne = Number((await page.locator('.hero.night .big').innerText()).replace(/\D/g, ''))
    await expect(page.locator('main')).toContainText(`${FEN(gagne + garde('itel-noir'))} tonight at 6 pm, when BLV-00007 is released`)
    await ouvrir(page, '#horsligne', { nom: 'anglais', theme: 'dark', lang: 'en' })
    await expect(page.locator('h1.pg-t')).toHaveText('Connected')
  })
})
