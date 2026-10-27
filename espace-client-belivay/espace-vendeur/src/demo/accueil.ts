// DONNÉES DE DÉMONSTRATION — domaine « accueil » (GET /seller/today) : composé des autres domaines de la démonstration
// (commandes, litiges, retours, produits, palier) ; la plus urgente d'abord ; aucun compteur écrit.
import type { ActionEnFile, Aujourdhui, Calme, DomaineAccueil, ElementAFaire, FileHorsLigne, PremierJour, Suspension } from '../donnees/domaines/accueil'
import { calculerCommission, decouverteActive, familleDe, finDecouverte } from '../calculs/commission'
import { alerteAEnvoyer, alerteDeSeuil, palierDeLancement, palierSuivant } from '../calculs/paliers'
import { Dec } from '../calculs/argent'
import { passageSuivant } from '../calculs/ouverture'
import type { Palier } from '../donnees/communs'
import { PARAMETRES, REGISTRE } from '../calculs/registre'
import { HEURE, ajouterMois, ecartJours, jourDe, yaounde } from '../calculs/temps'
import { dateDeLiberation, montantDu, vendrediDeVersement, type Gain } from '../calculs/versements'
import { ParametreIllisible } from '../calculs/erreurs'
import { maintenant } from './horloge'
import { ARTICLES, BOUTIQUE, COMMANDES, LIVREUR, MEMBRES } from './jeu-essai'
import { calendrier, commandesComptees, etatCommandes, etatEffectif, gardeFige } from './commandes'
import { REGLES, litigesOuverts } from './litiges'
import { retoursOuverts } from './retours'
import { demoProduits, gardeParVente, produitsActifs, stocksBas } from './produits'
import { demoPreparation } from './preparation'
import { demoBoutique, etatBoutique } from './boutique'
import { FILE_HEURES } from './remise'
import { estProprietaire, roleCourant } from './session'
import { DECISION_DU_CAS, decisionDe } from './trust'
import { JOURS_DEMANDE, rechercheLaPlusDemandee } from './plans'
import { ajouterNotification } from './notifications'
import { magasin, repondre } from './stockage'

// Alerte avant un seuil (score.threshold_near ; ACC-25, SAN-02, DP-57 A-5) : calculée par alerteDeSeuil (montée vers
// le seuil suivant, descente au seuil du palier), une fois par seuil et par semaine (alerteAEnvoyer) ; « Masquer » la
// range pour la semaine. Le jeu d'essai la tient masquée depuis le dimanche 20 sept. (le prototype ne la montre que
// par ?alerte=1).
const etat = magasin('accueil', () => ({ alerteMasqueeLe: '2026-09-20' as string | null, alerteMasqueeSeuil: null as number | null }))
const palierDuDessous = (p: Palier): Palier => (p === 'Platine' ? 'Or' : p === 'Or' ? 'Argent' : 'Bronze')
const HHMM = (t: number) => new Date(t + HEURE).toISOString().slice(11, 16) // heure de Yaoundé (UTC+1)


function aujourdhui(): Aujourdhui {
  const proprio = estProprietaire()
  const e = etatCommandes.lire()
  const cal = calendrier()
  const preparer: ElementAFaire[] = COMMANDES.filter((c) => e[c.ref].etape === 'a_preparer').map((c) => {
    const a = ARTICLES[c.article]
    // Le livreur passe au créneau qui suit l'échéance (après « Plus de temps » au jour suivant : le jour suivant, P-6).
    const ramassage = passageSuivant(e[c.ref].echeance!, cal)
    return {
      type: 'preparer',
      ref: c.ref,
      echeance: e[c.ref].echeance!,
      payeeA: c.payeeA,
      payableAuRetrait: c.payableAuRetrait,
      article: { offreId: a.offreId, titre: a.titre, variante: a.variante, etat: a.etat, dessin: a.dessin, categorie: a.categorie },
      quantite: c.quantite,
      colis: c.colis,
      garde: proprio && !c.remplacementDe ? gardeFige(c) : null,
      livreur: { ...LIVREUR, creneau: [HHMM(ramassage.debut), HHMM(ramassage.fin)] },
      ramassage,
      calendrier: cal,
    }
  })
  const litiges: ElementAFaire[] = litigesOuverts()
    .filter((l) => l.etat === 'a_repondre')
    .map((l) => ({ type: 'litige', ref: l.ref, echeance: l.echeance, motif: l.motif, gele: l.gele, article: l.article }))
  const retours: ElementAFaire[] = retoursOuverts().map((r) => ({ type: 'retour', ref: r.ref, article: r.article, motif: r.motif, arrivee: r.arrivee!, gele: r.gele, inspectionH: REGLES.inspectionH }))
  const urgence = (x: ElementAFaire) => (x.type === 'retour' ? Number.MAX_SAFE_INTEGER : x.echeance)
  // Préparer d'abord (le travail du jour), puis les litiges, puis les retours ; chacun par échéance.
  const aFaire = [...preparer.sort((a, b) => urgence(a) - urgence(b)), ...litiges.sort((a, b) => urgence(a) - urgence(b)), ...retours]
  const pp = PARAMETRES.paliers
  const a = proprio ? alerteDeSeuil(BOUTIQUE.palier, Dec.de(String(BOUTIQUE.trustScore)), pp) : null
  const { alerteMasqueeLe, alerteMasqueeSeuil } = etat.lire()
  const memeSeuil = !!a && (alerteMasqueeSeuil ?? a.seuil) === a.seuil
  const alerteMasquee = !!a && !alerteAEnvoyer(a, memeSeuil ? alerteMasqueeLe : null, jourDe(maintenant()), pp)
  const ref = ARTICLES['itel-noir']
  const cible = a && a.palierVise !== 'Bronze' ? pp.conditions[a.palierVise] : null
  return {
    maintenant: maintenant(),
    aFaire,
    compteurs: { preparer: preparer.length, litiges: litiges.length, retours: retours.length, total: aFaire.length },
    alerteScore:
      a && cible
        ? {
            sens: a.sens === 'montée' ? 'montee' : 'descente',
            score: BOUTIQUE.trustScore,
            seuil: a.seuil,
            points: a.pointsAffiches,
            palier: a.palierVise,
            // Montée : gardé en plus par vente au palier visé ; descente : gardé en moins au palier du dessous.
            gainParVente:
              a.sens === 'montée'
                ? gardeParVente(ref.prix, ref.categorie, false, a.palierVise) - gardeParVente(ref.prix, ref.categorie, false)
                : gardeParVente(ref.prix, ref.categorie, false) - gardeParVente(ref.prix, ref.categorie, false, palierDuDessous(a.palierVise)),
            titreReference: ref.titre,
            livrees: BOUTIQUE.commandesLivrees,
            livreesCible: cible.commandesLivrees,
            masquee: alerteMasquee,
          }
        : null,
    stockBas: stocksBas().map((p) => ({ offreId: p.id, titre: p.titre, dessin: p.dessin, stock: p.stock, seuil: p.seuilAlerte })),
    enAttenteEnvoi: file.lire().actions.filter((a) => a.etat === 'en_attente').length,
  }
}

// ── « Rien à faire » : chiffres lus dans les commandes (gardé figé, libération et vendredi par src/calculs) ──────
// Recherche sans résultat de la zone : lue dans la demande de la zone (domaine plans, VD-10 : GET /demand?limit=1).

function liberationDe(ref: string): number | null {
  const c = COMMANDES.find((x) => x.ref === ref)!
  return c.fermetureA ? dateDeLiberation(c.fermetureA, BOUTIQUE.palier, c.moyen === 'carte', PARAMETRES.versements) : null
}

function calme(): Calme {
  const t = maintenant()
  const jour = jourDe(t)
  const e = etatCommandes.lire()
  // État effectif : un litige tranché (gagné, délai de recours passé) reprend sa libération (CMD-07), comme Argent.
  const etape = (ref: string) => etatEffectif(ref, e[ref]).etape
  const enArgent = COMMANDES.filter((c) => ['versee', 'a_verser', 'se_libere'].includes(etape(c.ref)))
  const liberees = enArgent.filter((c) => {
    const lib = liberationDe(c.ref)
    return etape(c.ref) !== 'se_libere' || (lib !== null && lib <= t)
  })
  const debutMois = jour.slice(0, 8) + '01'
  const commandesDuMois = COMMANDES.filter((c) => jourDe(c.payeeA) >= debutMois).length
  // Produit qui rapporte le plus : le plus de ventes libérées (nombre, sans répéter le montant : ACC-20).
  const parProduit = new Map<string, number>()
  for (const c of liberees) parProduit.set(c.article, (parProduit.get(c.article) ?? 0) + c.quantite)
  const meilleur = [...parProduit].sort((a, b) => b[1] - a[1])[0]
  let argent: Calme['argent'] = null
  if (estProprietaire()) {
    const gagne = liberees.reduce((s, c) => s + gardeFige(c), 0)
    const ceJour = enArgent.find((c) => etape(c.ref) === 'se_libere' && liberationDe(c.ref)! > t && jourDe(liberationDe(c.ref)!) === jour)
    const gains: Gain[] = enArgent.map((c) => ({ reference: c.ref, garde: gardeFige(c), liberation: liberationDe(c.ref), verse: etape(c.ref) === 'versee' }))
    const vendredi = vendrediDeVersement(t, PARAMETRES.versements)
    const montant = montantDu(vendredi, gains, PARAMETRES.versements)
    const aVerser = gains.filter((g) => !g.verse && g.liberation !== null && vendrediDeVersement(g.liberation, PARAMETRES.versements) <= vendredi)
    const deja = aVerser.filter((g) => g.liberation! <= t).reduce((s, g) => s + g.garde, 0)
    const duMois = liberees.filter((c) => {
      const lib = liberationDe(c.ref)
      return lib !== null && jourDe(lib) >= debutMois
    })
    // Progrès en francs gardés (ACC-13) : sur le produit le plus vendu, au palier suivant.
    const suivant = palierSuivant(BOUTIQUE.palier)
    const ref = meilleur ? ARTICLES[meilleur[0]] : null
    const cond = suivant && suivant !== 'Bronze' ? PARAMETRES.paliers.conditions[suivant] : null
    argent = {
      gagne,
      liberationDuJour: ceJour ? { garde: gardeFige(ceJour), ref: ceJour.ref, a: liberationDe(ceJour.ref)! } : null,
      prochainVersement: montant > 0 ? { vendredi, montant, deja, ceSoir: montant - deja, numero: `${BOUTIQUE.numeroVersement.operateur} ${BOUTIQUE.numeroVersement.masque}` } : null,
      mois: duMois.length
        ? {
            debut: debutMois,
            garde: duMois.reduce((s, c) => s + gardeFige(c), 0),
            ventes: duMois.reduce((s, c) => s + ARTICLES[c.article].prix * c.quantite, 0),
            impayes: 0, // payable au retrait refusé ou non retiré : rien ne coûte au vendeur (ACC-12)
            transport: 0, // le livreur vient chez le vendeur, à la charge de la livraison (ACC-12)
          }
        : null,
      progres:
        suivant && cond && ref
          ? {
              palier: suivant,
              gainParVente: gardeParVente(ref.prix, ref.categorie, ref.madeInCameroon, suivant) - gardeParVente(ref.prix, ref.categorie, ref.madeInCameroon),
              titre: ref.titre,
              points: Math.max(0, cond.trustScore - Math.round(BOUTIQUE.trustScore)),
              commandes: Math.max(0, cond.commandesLivrees - BOUTIQUE.commandesLivrees),
            }
          : null,
    }
  }
  return {
    argent,
    commandesDuMois,
    idee: (() => {
      const r = rechercheLaPlusDemandee()
      return r ? { recherche: r.mots, fois: r.fois, jours: JOURS_DEMANDE } : null
    })(),
    meilleurProduit: meilleur ? { offreId: meilleur[0], titre: ARTICLES[meilleur[0]].titre, ventes: meilleur[1] } : null,
  }
}

// ── Premier jour (GET /seller/onboarding) ──────────────────────────────────────────────────────────────────────
function premierJour(): PremierJour {
  const jour = jourDe(maintenant())
  const p = PARAMETRES.commission
  const actifs = produitsActifs()
  const gestes: PremierJour['gestes'] = [
    { cle: 'produits', fait: actifs >= 1 }, // fait dès un produit en ligne (Q-81)
    { cle: 'horaires', fait: etatBoutique().horaires.some((h) => h.ouvert) },
    { cle: 'numero', fait: !!BOUTIQUE.numeroVersement.verifieLe }, // déjà vérifié à l'ouverture (Q-81) : coché, visible (ACC-16)
  ]
  const lancement = palierDeLancement(BOUTIQUE.signature, jour, actifs, PARAMETRES.paliers)
  const ref = ARTICLES['itel-noir']
  const ligne = [{ famille: familleDe(ref.categorie, p), prixUnitaire: ref.prix, madeInCameroon: ref.madeInCameroon }]
  const proprio = estProprietaire()
  const comptees = commandesComptees()
  return {
    termine: COMMANDES.length > 0 || gestes.every((g) => g.fait),
    jour: ecartJours(BOUTIQUE.signature, jour) + 1,
    gestes,
    produitsEnLigne: actifs,
    numero: proprio ? `${BOUTIQUE.numeroVersement.operateur} ${BOUTIQUE.numeroVersement.masque}` : null,
    lancement: lancement ? { palier: lancement, actifs, seuils: PARAMETRES.paliers.lancementProduits, fin: ajouterMois(BOUTIQUE.signature, PARAMETRES.paliers.lancementMois) } : null,
    decouverte: {
      gainParVente: proprio ? calculerCommission(ligne, BOUTIQUE.palier, true, p).garde - calculerCommission(ligne, BOUTIQUE.palier, false, p).garde : null,
      reference: ref.titre,
      prixReference: proprio ? ref.prix : null,
      mois: p.decouverteMois,
      commandes: p.decouverteCommandes,
      fin: BOUTIQUE.premiereCommandePayee ? finDecouverte(BOUTIQUE.premiereCommandePayee, p) : null,
      restantes: Math.max(0, p.decouverteCommandes - comptees),
      active: decouverteActive(BOUTIQUE.premiereCommandePayee, jour, comptees, p),
    },
    saisieAssisteeGratuite: true, // 10 premières boutiques de chaque zone exploitée (DP-56, Q-40)
  }
}

// ── Suspension (GET /account/status) : la boutique du jeu d'essai n'est pas suspendue ; l'exemple du prototype ──
function scoreSuspension(): number {
  const m = /sous un Trust Score de (\d+)/.exec(REGISTRE['VD-SAN-SUSPENSION'] ?? '')
  if (!m) throw new ParametreIllisible('VD-SAN-SUSPENSION : « sous un Trust Score de N » attendu')
  return Number(m[1])
}
function suspension(exemple: boolean): Suspension | null {
  if (!exemple) return null
  const d = decisionDe(DECISION_DU_CAS.suspension) // la contestation envoyée depuis « Contester » (VD-10) s'y lit
  return {
    decision: DECISION_DU_CAS.suspension,
    niveau: 3,
    depuis: yaounde(2026, 9, 18, 10, 12),
    motif: 'Trois commandes non préparées en 30 jours, sans rupture signalée.',
    contestation: d?.contestation ? { envoyeeLe: d.contestation.envoyeeA } : null,
    reponseHeuresOuvrees: PARAMETRES.console.contestationHeures, // VD-CONTESTATION-REPONSE (SUS-03)
    scoreGeleSous: scoreSuspension(),
    controleProbatoire: PARAMETRES.sanctions.probatoireCommandes, // VD-PROBATOIRE (DP-57, L-1)
    preparerEnCours: COMMANDES.filter((c) => etatCommandes.lire()[c.ref].etape === 'a_preparer').length,
    exemple: true,
  }
}

// ── File hors connexion ────────────────────────────────────────────────────────────────────────────────────
const file = magasin('accueil_file', () => ({ actions: [] as ActionEnFile[], n: 0, horsLigneDepuis: null as number | null, dernierEnvoi: null as FileHorsLigne['dernierEnvoi'] }))
const LIEU = BOUTIQUE.quartier.split(' / ').pop() ?? BOUTIQUE.quartier
const MOTIFS: Record<string, string> = { deja_prete: 'Elle était déjà prête.', annulee: 'La commande a été annulée entre-temps.', introuvable: 'Commande introuvable.' }

function lireFile(): FileHorsLigne {
  const f = file.lire()
  const t = maintenant()
  return {
    actions: f.actions.map((a) => (a.etat === 'en_attente' && t - a.origine > FILE_HEURES * HEURE ? { ...a, etat: 'expiree' } : a)),
    heures: FILE_HEURES,
    horsLigneDepuis: f.horsLigneDepuis,
    dernierEnvoi: f.dernierEnvoi,
  }
}

async function rejouer(a: ActionEnFile): Promise<string | null> {
  switch (a.type) {
    case 'pret': {
      const r = await demoPreparation.cestPret(a.objet, a.origine) // heure d'origine gardée (origin_time, VD04-R14)
      return r.ok ? null : (MOTIFS[r.raison] ?? r.raison)
    }
    case 'masquer':
      await demoAccueil.masquerAlerte()
      return null
    case 'fermer':
    case 'rouvrir':
      await demoBoutique.fermerAujourdhui(a.type === 'fermer')
      return null
    case 'stock':
      if (a.detail?.offreId && a.detail.stock !== undefined) await demoProduits.changerStock(a.detail.offreId, a.detail.stock)
      return null
    default:
      return null // photo : envoyée avec son heure et sa position d'origine
  }
}

export const demoAccueil: DomaineAccueil = {
  aujourdhui: () => repondre(aujourdhui()),
  async masquerAlerte() {
    etat.ecrire((e) => {
      e.alerteMasqueeLe = jourDe(maintenant())
      e.alerteMasqueeSeuil = alerteDeSeuil(BOUTIQUE.palier, Dec.de(String(BOUTIQUE.trustScore)), PARAMETRES.paliers)?.seuil ?? null
    })
  },
  calme: () => repondre(calme()),
  premierJour: () => repondre(premierJour()),
  suspension: (o) => repondre(suspension(!!o?.exemple)),
  file: () => repondre(lireFile()),
  async noterReseau(depuis) {
    if (file.lire().horsLigneDepuis === depuis) return
    file.ecrire((f) => {
      f.horsLigneDepuis = depuis
    })
  },
  async mettreEnFile({ type, objet, detail }) {
    const m = MEMBRES.find((x) => x.role === roleCourant())!
    let action: ActionEnFile | null = null
    file.ecrire((f) => {
      f.n++
      action = { id: 'a' + f.n, type, objet, detail: detail ?? null, origine: maintenant(), lieu: LIEU, auteur: m.prenom, etat: 'en_attente', motif: null }
      f.actions.push(action)
    })
    return action!
  },
  async envoyerFile() {
    const t = maintenant()
    const bilan = { a: t, envoyees: 0, expirees: 0, refusees: 0 }
    const restantes: ActionEnFile[] = []
    // Dans l'ordre d'origine ; une action expirée (plus de 72 h) reste affichée, à refaire, et ne part pas.
    for (const a of [...lireFile().actions].sort((x, y) => x.origine - y.origine)) {
      if (a.etat === 'expiree') {
        bilan.expirees++
        restantes.push(a)
        continue
      }
      if (a.etat === 'refusee') {
        restantes.push(a)
        continue
      }
      const motif = await rejouer(a)
      if (motif) {
        bilan.refusees++
        restantes.push({ ...a, etat: 'refusee', motif })
        // Une action refusée au rejeu revient avec son motif dans les notifications (VD04-R14).
        ajouterNotification({ type: a.type === 'pret' ? 'preparer' : 'stock', canal: 'notification', titre: { modele: 'Refusée au retour du réseau : {objet}', valeurs: { objet: a.objet } }, texte: { modele: motif }, a: t, urgent: false, argent: false, lien: a.type === 'pret' ? `commande?ref=${a.objet}` : 'horsligne', contester: null })
      } else bilan.envoyees++
    }
    file.ecrire((f) => {
      f.actions = restantes
      f.dernierEnvoi = bilan
      f.horsLigneDepuis = null
    })
    return bilan
  },
  async retirer(id) {
    file.ecrire((f) => {
      f.actions = f.actions.filter((a) => a.id !== id)
    })
  },
}
