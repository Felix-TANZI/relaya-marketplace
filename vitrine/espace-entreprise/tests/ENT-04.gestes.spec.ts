// Gestes du groupe ENT-04 (zones, flotte, fiche du livreur, ajout, véhicules) : chaque geste passe par la source de
// démonstration, l'écran et les autres écrans suivent ; règles et valeurs lues dans le registre (PARAMETRES_FLOTTE).
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'
import { PARAMETRES_FLOTTE } from '../src/calculs/flotte'

const P = PARAMETRES_FLOTTE
const ORDI = { width: 1280, height: 860 }
async function photo(page: Page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 900
    c.height = 700
    c.getContext('2d')!.fillRect(0, 0, 10, 10)
    return c.toDataURL('image/png').split(',')[1]
  })
  return { name: 'plaque.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }
}

test.describe('ENT-04 · gestes', () => {
  test.beforeEach(async ({ page }) => {
    await figerHorloge(page)
    await page.setViewportSize(ORDI)
  })

  test('zones : carte des 12 zones ; déclarer une zone non exploitée avec une capacité honnête ; pause', async ({ page }) => {
    await ouvrir(page, adresse('zones'), FR)
    await expect(page.locator('.e-carte g[aria-label]')).toHaveCount(12)
    await expect(page.locator('.kpi-r', { has: page.getByText('Zones actives', { exact: true }) }).locator('.kr-v')).toHaveText(/^4\s*sur 4$/)
    // Toucher Z9 (vague 2, non exploitée) sur la carte ouvre la déclaration de cette zone.
    await page.locator('.e-carte g[role=button][aria-label^="Z9 "]').click()
    const f = page.locator('.sheet')
    await expect(f.getByRole('heading', { name: 'Déclarer une zone' })).toBeVisible()
    await expect(f.getByText('Zone ouverte à la vente seulement')).toBeVisible()
    await f.getByRole('checkbox', { name: /Hugo M\./ }).check()
    await f.getByLabel('Capacité par jour (colis)').fill('999')
    await expect(f.getByRole('button', { name: 'Déclarer la zone' })).toBeDisabled()
    await f.getByLabel('Capacité par jour (colis)').fill('10')
    await f.getByRole('button', { name: 'Déclarer la zone' }).click()
    await expect(page.locator('tr', { hasText: /Z9\s*Essos/ })).toContainText('en attente d’ouverture')
    // Une zone exploitée ne compte pas Z9 dans les zones actives.
    await expect(page.locator('.kpi-r', { has: page.getByText('Zones actives', { exact: true }) }).locator('.kr-v')).toHaveText(/^4\s*sur 4$/)
    await page.locator('tr', { hasText: /Z1\s*Centre-ville/ }).getByRole('button', { name: /Ouvrir/ }).click()
    await page.getByRole('switch').click()
    await expect(page.locator('.sheet .pill').first()).toHaveText('En pause')
    await expect(page.locator('.kpi-r', { has: page.getByText('Zones actives', { exact: true }) }).locator('.kr-v')).toHaveText(/^3\s*sur 4$/)
  })

  test('flotte : compteurs égaux à la liste filtrée ; recherche par plaque ; suspension de BelivaY', async ({ page }) => {
    await ouvrir(page, adresse('flotte'), FR)
    const lignes = page.locator('table.dt tbody tr')
    await page.locator('button.kpi', { hasText: 'Suspendus' }).click()
    await expect(page).toHaveURL(/statut=suspendus/)
    const n = Number(await page.locator('button.kpi', { hasText: 'Suspendus' }).locator('.v').innerText())
    await expect(lignes).toHaveCount(n)
    await expect(lignes.first()).toContainText('Suspendu par BelivaY')
    await expect(lignes.first()).toContainText('Niveau 2')
    await page.locator('button.kpi', { hasText: 'Suspendus' }).click()
    await page.getByLabel('Chercher un livreur par nom ou plaque').fill('CE 415')
    await expect(lignes).toHaveCount(1)
    await expect(lignes.first()).toContainText('Inès K.')
    await expect(lignes.first()).toContainText('Assurance du véhicule expirée')
    // Fiche d'Éric : la suspension de BelivaY ne se lève pas ici.
    await ouvrir(page, adresse('livreur', 'id=l-eric'), FR)
    await expect(page.locator('.hero')).toContainText('Suspendu par BelivaY')
    await expect(page.locator('.hero .m4', { hasText: 'Niveau' })).toContainText('2')
    await expect(page.getByRole('button', { name: 'Lever la suspension' })).toHaveCount(0)
  })

  test('fiche : modifier la capacité (journal et notification), joindre des éléments à une contestation', async ({ page }) => {
    await ouvrir(page, adresse('livreur', 'id=l-brice'), FR)
    await page.locator('.entA-hero').getByRole('button', { name: 'Modifier' }).click()
    await page.getByLabel('Capacité par jour (colis)').fill('30')
    await page.getByRole('button', { name: 'Enregistrer et prévenir le livreur' }).click()
    await expect(page.locator('.tl .ti', { hasText: 'capacité : 25 → 30' })).toBeVisible()
    await page.getByRole('button', { name: 'Messages', exact: true }).click()
    await expect(page.getByText(/Votre entreprise a modifié votre fiche \(capacité\)/)).toBeVisible()
    await page.getByRole('button', { name: /^Score/ }).click()
    await expect(page.locator('.entA-crit:has(.bar)')).toHaveCount(P.poidsTrust.length)
    const total = await page.locator('.entA-crit:has(.bar) .p').allInnerTexts()
    const somme = Math.round(total.reduce((s, x) => s + Number(x.replace(/[^\d,]/g, '').replace(',', '.')), 0))
    await expect(page.locator('.ring b').first()).toHaveText(String(somme))
    await page.getByRole('button', { name: 'Joindre des éléments' }).click()
    await page.getByLabel('Motif écrit').fill('La boutique a confirmé l’ouverture tardive par message.')
    await page.getByRole('button', { name: 'Joindre', exact: true }).click()
    await expect(page.getByText('Vos éléments')).toBeVisible()
  })

  test('ajout : numéro d’une autre entreprise refusé ; invitation envoyée ; approbation d’un invité prêt', async ({ page }) => {
    await ouvrir(page, adresse('ajout'), FR)
    const rempli = async (tel: string, plaque: string) => {
      await page.getByLabel('Nom et prénom').fill('Rosine T.')
      await page.getByLabel('Téléphone (numéro de connexion du livreur)').fill(tel)
      await page.getByLabel('Plaque').fill(plaque)
      await page.getByLabel('Capacité par jour (colis)').fill('18')
      await page.getByRole('checkbox', { name: /Z3/ }).check()
    }
    await rempli('6 99 00 00 01', 'LT 901 RT')
    await page.getByRole('button', { name: 'Envoyer l’invitation par SMS' }).click()
    await expect(page.getByRole('alert')).toContainText('autre entreprise')
    await page.getByLabel('Téléphone (numéro de connexion du livreur)').fill('6 98 76 54 32')
    await page.getByRole('button', { name: 'Envoyer l’invitation par SMS' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Invitation envoyée à Rosine T. par SMS.' })).toBeVisible()
    await expect(page.locator('li.card', { hasText: 'Rosine T.' })).toBeVisible()
    const ange = page.locator('li.card', { hasText: 'Ange M.' })
    await expect(ange.locator('.pill').first()).toHaveText('Prêt à approuver')
    await ange.getByRole('button', { name: 'Approuver Ange M.' }).click()
    await expect(page.locator('li.card', { hasText: 'Ange M.' })).toHaveCount(0)
    await ouvrir(page, adresse('flotte', 'q=Ange'), FR)
    await expect(page.locator('table.dt tbody tr')).toHaveCount(1)
    await expect(page.locator('table.dt tbody tr')).toContainText('Actif')
  })

  test('véhicules : classes du type, plaque en double, photo obligatoire ; assurance renouvelée', async ({ page }) => {
    await ouvrir(page, adresse('vehicules'), FR)
    await expect(page.locator('.dk-banner.red')).toContainText('assurance expirée')
    await page.getByRole('button', { name: 'Déclarer un véhicule' }).first().click()
    const f = page.locator('.sheet')
    await expect(f.getByRole('checkbox', { name: 'XL' })).toBeDisabled() // jamais de XL sur une moto
    await f.getByLabel('Plaque').fill('CE 900 ZZ')
    await f.getByLabel('Capacité par tournée (colis)').fill('8')
    await f.getByLabel('Fin de l’assurance').fill('2027-06-30')
    await expect(f.getByRole('button', { name: 'Déclarer le véhicule' })).toBeDisabled()
    await f.getByLabel('Choisir la photo').setInputFiles(await photo(page))
    await f.getByRole('button', { name: 'Déclarer le véhicule' }).click()
    await expect(f.getByRole('alert')).toContainText('déjà déclarée')
    await f.getByLabel('Plaque').fill('LT 777 KM')
    await f.getByRole('button', { name: 'Déclarer le véhicule' }).click()
    await expect(page.locator('tr', { hasText: 'LT 777 KM' })).toContainText('En vérification')
    // Inès : assurance expirée, mise à jour avec l'attestation → de nouveau proposée.
    await page.locator('tr', { hasText: 'CE 415 AF' }).getByRole('button', { name: /Fiche/ }).click()
    await page.getByLabel('Nouvelle date de fin').fill('2027-10-01')
    await page.getByLabel('Choisir l’attestation').setInputFiles(await photo(page))
    await page.getByRole('button', { name: 'Enregistrer l’assurance' }).click()
    await expect(page.locator('.sheet .pill').first()).toHaveText('Proposé à l’affectation')
    expect(P.classes.moto).not.toContain('XL')
  })

  test('pièces : la file de la flotte ; ouvrir une pièce (filigrane, journal), valider avec sa date, refuser avec motif, relancer ; journal', async ({ page }) => {
    await ouvrir(page, adresse('flotte'), FR)
    await page.getByRole('link', { name: 'Contrôler les pièces' }).first().click()
    await expect(page).toHaveURL(/\/pieces$/)
    await page.getByRole('button', { name: /^Manquantes/ }).click()
    await expect(page.locator('#contenu')).toContainText('Thierry W. · Permis de conduire')
    await page.getByRole('button', { name: /^Toutes/ }).click()
    // Marius : trois pièces à contrôler ; on ouvre la pièce d'identité depuis la file.
    await page.getByRole('link', { name: /Marius K\. · Pièce d’identité/ }).click()
    const f = page.locator('.sheet')
    await expect(f.locator('.e-face')).toHaveCount(2)
    await expect(f.locator('.e-filigrane').first()).toContainText('Yafé Express')
    await f.getByRole('button', { name: 'Valider' }).click()
    await f.getByLabel('Date d’expiration lue sur la pièce').fill('2020-01-01')
    await expect(f.getByRole('button', { name: 'Valider la pièce' })).toBeDisabled()
    await f.getByLabel('Date d’expiration lue sur la pièce').fill('2031-04-10')
    await f.getByRole('button', { name: 'Valider la pièce' }).click()
    await expect(page.locator('#contenu')).toContainText('Pièce validée : Marius K. est prévenu.')
    await expect(page.locator('#piece-identite')).toContainText('Validée')
    // Selfie : validé sans date ; permis : refusé, motif écrit envoyé au livreur.
    await page.locator('#piece-selfie').getByRole('button', { name: 'Ouvrir et contrôler' }).click()
    await f.getByRole('button', { name: 'Valider' }).click()
    await f.getByRole('button', { name: 'Valider la pièce' }).click()
    await page.locator('#piece-permis').getByRole('button', { name: 'Ouvrir et contrôler' }).click()
    await f.getByRole('button', { name: 'Refuser' }).click()
    await expect(f.getByRole('button', { name: 'Refuser et prévenir le livreur' })).toBeDisabled()
    await f.getByRole('button', { name: /Photo floue ou illisible/ }).click()
    await f.getByRole('button', { name: 'Refuser et prévenir le livreur' }).click()
    await expect(page.locator('#piece-permis')).toContainText('Refusée')
    await expect(page.locator('#piece-permis')).toContainText('Photo floue ou illisible')
    // Relance du livreur pour la pièce refusée, gardée sur la pièce.
    await page.locator('#piece-permis').getByRole('button', { name: 'Relancer le livreur' }).click()
    await expect(page.locator('#piece-permis')).toContainText('Relances')
    // La fiche dit tout : journal (consultation, contrôle) et notifications au livreur.
    await page.getByRole('link', { name: 'Fiche de Marius K.' }).click()
    await expect(page.locator('#contenu')).toContainText('Pièce d’identité')
    await page.goto(adresse('activite'))
    await expect(page.locator('#contenu')).toContainText(/consultée|Marius/)
  })

  test('pièces : une pièce refusée ferme l’approbation tant qu’elle n’est pas renvoyée ; le comptable n’y a pas accès', async ({ page }) => {
    await ouvrir(page, adresse('pieces', 'id=l-nadege'), FR)
    await page.locator('#piece-identite').getByRole('button', { name: 'Ouvrir et contrôler' }).click()
    const f = page.locator('.sheet')
    await f.getByRole('button', { name: 'Valider' }).click()
    await f.getByRole('button', { name: 'Valider la pièce' }).click()
    await expect(page.locator('#piece-identite')).toContainText('Validée')
    // Permis refusé : rien à valider tant que le livreur ne l'a pas renvoyé ; l'approbation reste fermée.
    await expect(page.locator('#piece-permis').getByRole('button', { name: 'Ouvrir et contrôler' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Approuver' })).toHaveCount(0)
    await ouvrir(page, adresse('pieces'), { ...FR, role: 'comptable' })
    await expect(page.locator('#contenu')).toContainText('Réservé à d’autres rôles')
  })
  test('départs (DP-66, DP-67) : file à DEPART-VISIBLE-J jours ; Kevin au dernier jour, délai du constat qui court ; Josiane : kit restitué, clôture anticipée d’un commun accord', async ({ page }) => {
    await ouvrir(page, adresse('flotte'), FR)
    // Bandeau des demandes, puis la file « Départs » (filtre de la flotte, dans l'adresse).
    await page.getByRole('button', { name: 'Voir les départs' }).click()
    await expect(page).toHaveURL(/statut=departs/)
    const file = page.locator('section[aria-label="Départs"]')
    await expect(file).toContainText('Josiane E.')
    await expect(file).toContainText('Autre emploi')
    await expect(file).toContainText('paquets jusqu’au ven. 16 oct.')
    await expect(file.locator('li, a', { hasText: 'Kevin D.' }).first()).toContainText('Préavis échu')
    await expect(page.locator('table.dt tbody tr')).toHaveCount(2)
    // Départs clos : Pauline (il y a 40 jours) et Arnaud restent visibles ; Yannick (100 jours) n'y est plus.
    const clos = page.locator('.panel', { hasText: 'Départs clôturés' })
    await expect(clos).toContainText('Pauline K.')
    await expect(clos.locator('.li', { hasText: 'Pauline K.' })).toContainText('kit incomplet')
    await expect(clos.locator('.li', { hasText: 'Pauline K.' })).toContainText('dernier versement fait le ven. 4 sept.')
    await expect(clos.locator('.li', { hasText: 'Arnaud F.' })).toContainText('kit non contesté')
    await expect(clos).not.toContainText('Yannick B.')
    await expect(clos).toContainText(`Visibles ici ${P.departVisibleJours} jours après la clôture`)
    // Kevin : préavis échu ce midi (dernier jour : plus de nouveau paquet), encore en tournée ; le constat de son kit a 72 h.
    await page.goto(adresse('livreur', 'id=l-kevin'))
    const bloc = page.locator('#depart')
    await expect(bloc).toContainText('Préavis échu : l’administrateur BelivaY peut clôturer à votre place')
    await expect(bloc).toContainText('Dernier jour du préavis atteint : plus de nouveau paquet')
    await expect(bloc).toContainText('Constat du kit à faire avant le ven. 16 oct. à 12 h 30')
    await expect(bloc.getByRole('button', { name: 'Clôturer le départ' })).toBeDisabled()
    await expect(bloc).toContainText('une mission est encore en cours')
    // Dernier versement estimé à ce jour : 14 missions validées au tarif affiché.
    await expect(bloc.locator('section[aria-label="Dernier versement"]')).toContainText(/Dû pour ces missions14\s000\sF/)
    // Josiane : préavis du registre, aucune mission ; elle reçoit des paquets jusqu'à la veille du dernier jour.
    await page.goto(adresse('livreur', 'id=l-josiane'))
    await expect(bloc).toContainText('Autre emploi')
    await expect(bloc).toContainText(`${P.preavisDepartJours} jours (registre)`)
    await expect(bloc).toContainText('Vous pouvez lui confier des paquets jusqu’au ven. 16 oct.')
    await expect(bloc).toContainText('ne lui coûte aucun point de Trust Score')
    await expect(bloc.getByRole('button', { name: 'Clôturer le départ' })).toBeDisabled()
    await expect(bloc).toContainText('le kit n’est pas encore constaté')
    await expect(bloc).toContainText(`(${P.kitConstatH} h après la fin du préavis)`)
    await bloc.getByRole('button', { name: 'Constater : kit restitué' }).click()
    await expect(bloc).toContainText('constaté par Gaëlle Wankeu · propriétaire')
    await expect(bloc).toContainText('Conditions remplies : vous pouvez clôturer dès maintenant, avant la fin du préavis, d’un commun accord avec Josiane.')
    await bloc.getByRole('button', { name: 'Clôturer le départ' }).click()
    const f = page.locator('.sheet')
    await expect(f).toContainText('Le préavis court jusqu’au sam. 17 oct. : vous clôturez avant, d’un commun accord avec lui.')
    await expect(f).toContainText('le versement de ce relevé le vendredi suivant, en Mobile Money')
    await expect(f).toContainText('un SMS au livreur avec la date de ce versement')
    await expect(f).toContainText('la fermeture de son accès et la déliaison de son téléphone')
    await f.getByRole('button', { name: 'Clôturer définitivement' }).click()
    await expect(page).toHaveURL(/statut=departs/)
    await expect(page.locator('#contenu')).toContainText('Départ de Josiane E. clôturé')
    await expect(page.locator('#contenu')).toContainText('ven. 16 oct.')
    await expect(page.locator('.panel', { hasText: 'Départs clôturés' })).toContainText('Josiane E.')
    // Accès fermé : elle n'est plus dans la flotte.
    await page.goto(adresse('flotte'))
    await expect(page.locator('table.dt tbody tr', { hasText: 'Josiane E.' })).toHaveCount(0)
  })

  test('kit incomplet (DP-67) : éléments du registre cochés, photo obligatoire, montant calculé, jamais plus ; retenue jamais au-delà de ce qui reste dû', async ({ page }) => {
    await ouvrir(page, adresse('livreur', 'id=l-josiane'), FR)
    const bloc = page.locator('#depart')
    const kit = bloc.locator('section[aria-label="Kit rendu"]')
    await kit.getByRole('radio', { name: 'Incomplet' }).click()
    // Les éléments et leur valeur viennent de KIT-VALEUR-F.
    for (const e of P.kit.elements) await expect(kit.getByRole('checkbox', { name: new RegExp(e.libelle.replace(/[()]/g, '.')) })).toBeVisible()
    const [sac, etiquettes] = [P.kit.elements[0], P.kit.elements[2]]
    await kit.getByRole('checkbox', { name: new RegExp(sac.libelle) }).check()
    await kit.getByRole('checkbox', { name: new RegExp(etiquettes.libelle) }).check()
    const valeur = sac.valeur + etiquettes.valeur
    const fr = (n: number) => new RegExp(n.toLocaleString('fr-FR').replace(/\D/g, '\\s') + '\\sF')
    await expect(kit).toContainText(fr(valeur))
    // Photo obligatoire : sans elle, rien ne part.
    await expect(kit.getByRole('button', { name: 'Constater : kit incomplet' })).toBeDisabled()
    await kit.getByLabel('Choisir la photo du kit').setInputFiles(await photo(page))
    await expect(kit.getByRole('button', { name: 'Constater : kit incomplet' })).toBeEnabled()
    // Jamais plus que la valeur des éléments manquants.
    await kit.getByLabel('Retenir moins (facultatif)').fill(String(valeur + 1000))
    await expect(kit.getByRole('button', { name: 'Constater : kit incomplet' })).toBeDisabled()
    await kit.getByLabel('Retenir moins (facultatif)').fill('')
    await kit.getByRole('button', { name: 'Constater : kit incomplet' }).click()
    await expect(kit).toContainText(`Kit incomplet : ${sac.libelle}, ${etiquettes.libelle}`)
    await expect(kit).toContainText(fr(valeur))
    await expect(kit).toContainText('photo jointe')
    // Dernier versement : 9 missions validées au tarif affiché ; la retenue ne dépasse jamais ce qui reste dû.
    const v = bloc.locator('section[aria-label="Dernier versement"]')
    await expect(v).toContainText('Dernier versement (estimé à ce jour)')
    await expect(v).toContainText(/Retenue du kit−\s10\s800\sF/)
    await expect(v).toContainText(/À verser0\sF/)
    await expect(bloc.getByRole('button', { name: 'Clôturer le départ' })).toBeEnabled()
    // Corriger le constat : la retenue tombe.
    await kit.getByRole('button', { name: 'Corriger le constat' }).click()
    await expect(bloc).toContainText('le kit n’est pas encore constaté')
    // Le répartiteur constate aussi, sans voir les montants du versement.
    await ouvrir(page, adresse('livreur', 'id=l-josiane'), { ...FR, role: 'repartiteur' })
    await expect(page.locator('#depart section[aria-label="Dernier versement"]')).toContainText('Montants : propriétaire et comptable.')
    await expect(page.locator('#depart section[aria-label="Dernier versement"]')).not.toContainText('Dû pour ces missions')
  })

  test('départs clos (DP-67) : Arnaud, « kit non contesté » ; le propriétaire marque le versement Mobile Money fait ; la tâche du tableau disparaît', async ({ page }) => {
    await ouvrir(page, adresse('tableau'), FR)
    const tache = page.locator('#contenu .entA-row', { hasText: 'Arnaud F. · dernier versement' })
    await expect(tache).toContainText('à verser depuis le ven. 9 oct.')
    await expect(page.locator('#contenu')).toContainText('Kevin D. · kit à constater')
    await tache.getByRole('link', { name: 'Verser' }).click()
    // La tâche mène à sa fiche : parti, son départ s'ouvre dans la file « Départs ».
    await expect(page.locator('#contenu')).toContainText('Arnaud F. est parti : départ clôturé')
    await page.getByRole('link', { name: 'Voir son départ' }).click()
    await expect(page).toHaveURL(/sheet=depart&depart=DP-0371/)
    const f = page.locator('.sheet')
    await expect(f).toContainText('Kit non contesté')
    await expect(f).toContainText(`Aucun constat dans les ${P.kitConstatH} h après la fin du préavis : clôturé par BelivaY sans aucune retenue.`)
    await expect(f).toContainText('par l’administrateur BelivaY')
    await expect(f).toContainText(/À verser11\s000\sF/)
    await expect(f).toContainText('Versement attendu depuis le ven. 9 oct.')
    await f.getByRole('button', { name: 'Marquer le versement Mobile Money fait' }).click()
    await expect(f).toContainText('SMS envoyé')
    await expect(f.getByRole('button', { name: 'Marquer le versement Mobile Money fait' })).toHaveCount(0)
    await page.goto(adresse('tableau'))
    await expect(page.locator('#contenu')).toContainText('Kevin D. · kit à constater')
    await expect(page.locator('#contenu')).not.toContainText('Arnaud F. · dernier versement')
    // Pauline : kit incomplet, un litige alors ouvert (retenu au plus le montant contesté), versement fait.
    await page.goto(adresse('flotte', 'statut=departs'))
    await page.locator('.li', { hasText: 'Pauline K.' }).click()
    await expect(f).toContainText('Kit incomplet : sac de transport étanche')
    await expect(f).toContainText(/Retenu\s:\s1\slitige\souvert−\s1\s200\sF/)
    await expect(f).toContainText(/À verser6\s000\sF/)
    await expect(f).toContainText('fait le ven. 4 sept.')
    // Le répartiteur voit les départs sans les montants ni le geste du versement.
    await ouvrir(page, adresse('flotte', 'statut=departs&sheet=depart&depart=DP-0371'), { ...FR, role: 'repartiteur' })
    await expect(page.locator('.sheet')).toContainText('Kit non contesté')
    await expect(page.locator('.sheet').getByRole('button', { name: 'Marquer le versement Mobile Money fait' })).toHaveCount(0)
  })

  test('affectation (DP-67) : Kevin au dernier jour de son préavis est écarté avec le message ; Josiane reçoit encore des paquets ; Gilles, nouvelle photo en retard, écarté', async ({ page }) => {
    await ouvrir(page, adresse('affectation', 'id=PQ-Z3-261013-007'), FR)
    await expect(page.locator('.lv-non', { hasText: 'Kevin D.' })).toContainText('Dernier jour de son préavis de départ : plus de nouveau paquet')
    await expect(page.locator('.lv-non', { hasText: 'Gilles A.' })).toContainText('Nouvelle photo pas validée dans le délai : plus de nouvelle mission')
    await expect(page.locator('.lv-non', { hasText: 'Josiane E.' })).toHaveCount(0)
    await expect(page.locator('#contenu')).toContainText('Départ demandé · paquets jusqu’au ven. 16 oct.')
    await expect(page.locator('#contenu')).toContainText('Préavis et nouvelle photo')
  })

  test('absences prévenues et demandes au tableau de bord ; le comptable ne voit pas ces gestes', async ({ page }) => {
    await ouvrir(page, adresse('tableau'), FR)
    await expect(page.locator('#contenu')).toContainText('Josiane E. · départ demandé')
    await expect(page.locator('#contenu')).toContainText('Kevin D. · préavis de départ échu')
    await expect(page.locator('#contenu')).toContainText('Aimé O. · absence prévenue')
    // Motif de la liste, repères « imprévu » et « prévenue après le début du créneau » (DP-67, 4).
    await expect(page.locator('#contenu .entA-row', { hasText: 'Aimé O. · absence prévenue' })).toContainText('Maladie · imprévu')
    await expect(page.locator('#contenu .entA-row', { hasText: 'Fabrice T. · absence prévenue' })).toContainText('Panne de moto · imprévu, après le début du créneau')
    // Fiche d'Aimé : l'absence de demain, marquée vue ; la tâche disparaît.
    await page.goto(adresse('livreur', 'id=l-aime'))
    const abs = page.locator('.panel', { hasText: 'Absences prévenues' })
    await expect(abs).toContainText('Maladie')
    await expect(abs).toContainText('« Rendez-vous médical le matin »')
    await expect(abs).toContainText('Imprévu')
    await expect(abs).toContainText(`Une absence dure ${P.absenceMaxJours} jours au plus`)
    await abs.getByRole('button', { name: 'Marquer comme vue' }).click()
    await expect(abs).toContainText('Vue')
    await page.goto(adresse('tableau'))
    await expect(page.locator('#contenu')).toContainText('Josiane E. · départ demandé')
    await expect(page.locator('#contenu')).not.toContainText('Aimé O. · absence prévenue')
    await ouvrir(page, adresse('livreur', 'id=l-josiane'), { ...FR, role: 'comptable' })
    await expect(page.locator('#depart')).toContainText('Départ demandé')
    await expect(page.locator('#depart').getByRole('button', { name: 'Clôturer le départ' })).toHaveCount(0)
    await expect(page.locator('#depart').getByRole('button', { name: 'Constater : kit restitué' })).toHaveCount(0)
  })

  test('pièces (DP-67) : demander une nouvelle photo (motif exigé) ; statut « nouvelle vérification demandée », échéance ; en retard, plus de nouvelle mission', async ({ page }) => {
    await ouvrir(page, adresse('livreur', 'id=l-junior'), FR)
    await page.getByRole('link', { name: 'Demander une nouvelle photo' }).click()
    await expect(page).toHaveURL(/pieces\?id=l-junior&sheet=photo/)
    const f = page.locator('.sheet')
    await expect(f).toContainText(`a ${P.photoReverifJours} jours pour reprendre son selfie, en continuant de travailler`)
    await expect(f).toContainText('Doute réel sur son identité')
    await expect(f.getByRole('button', { name: 'Demander la nouvelle photo' })).toBeDisabled()
    await f.getByRole('button', { name: /Votre apparence a changé/ }).click()
    await f.getByRole('button', { name: 'Demander la nouvelle photo' }).click()
    await expect(page.locator('#contenu')).toContainText('Nouvelle photo demandée')
    const selfie = page.locator('#piece-selfie')
    await expect(selfie).toContainText('Nouvelle vérification demandée')
    await expect(selfie).not.toContainText('Refusée')
    await expect(selfie).toContainText('Votre apparence a changé')
    await expect(selfie).toContainText(`mar. 20 oct. à 14 h 05 · encore ${P.photoReverifJours} jours`)
    await expect(selfie).toContainText('Il travaille normalement d’ici là')
    await expect(selfie.getByRole('button', { name: 'Demander une nouvelle photo' })).toHaveCount(0)
    // Gilles : demandée il y a 9 jours, jamais envoyée : délai passé, plus de nouvelle mission.
    await page.goto(adresse('pieces', 'id=l-gilles'))
    await expect(selfie).toContainText('Délai passé : plus aucune nouvelle mission jusqu’à la validation de sa nouvelle photo.')
    // File de la flotte : puce « Nouvelles photos ».
    await page.goto(adresse('pieces', 'raison=reverification'))
    await expect(page.locator('#contenu .li', { hasText: 'Gilles A.' })).toContainText('délai passé le')
    await expect(page.locator('#contenu .li', { hasText: 'David N.' })).toContainText('encore 2 jours')
    await expect(page.locator('#contenu .li', { hasText: 'Junior T.' })).toContainText('Nouvelle photo demandée')
  })
})

