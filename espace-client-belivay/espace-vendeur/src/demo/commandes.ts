// DONNÉES DE DÉMONSTRATION — domaine « commandes » : les commandes BLV-00001 à 00009 du jeu d'essai et leur état
// (préparée, remise, rupture, délai…). Le montant gardé de chaque commande est CALCULÉ (src/calculs/commission.ts)
// au palier et à l'offre de découverte du jour de son paiement, puis figé (D5) : jamais écrit.
// Échéances en heures d'ouverture de la boutique (calendrier du domaine « preparation ») ; journal en ajout seul,
// rempli de l'histoire des commandes du jeu d'essai (paiement, entrée dans la file, retrait, litige, retour, versement)
// puis de chaque geste, signé par son auteur (GEN-09, JRN-01).
import type { Commande, CompteursDetail, DomaineCommandes, EntreeJournal, FiltreCommandes, MotifAnnulation, StatutCommande, VueCommandes } from '../donnees/domaines/commandes'
import { ajouterOuvertes, ouvertureSuivante, passageSuivant, type CalendrierBoutique } from '../donnees/domaines/preparation'
import type { Instant, Role } from '../donnees/communs'
import { calculerCommission, decouverteActive, familleDe, type ResultatCommission } from '../calculs/commission'
import { PARAMETRES } from '../calculs/registre'
import { HEURE, JOUR, debutDuJour, jourDe, yaounde } from '../calculs/temps'
import { dateDeLiberation, progressionPourCent, vendrediDeVersement } from '../calculs/versements'
import { etatDeLArgent, type EtatArgent as EtatDeLArgent } from '../calculs/argent-vendeur'
import { maintenant } from './horloge'
import { ARTICLES, BOUTIQUE, COMMANDES, LIVREUR, MEMBRES, OFFRES, type CommandeEssai, type EtapeCommande } from './jeu-essai'
import { magasin, repondre } from './stockage'
import { avecDroit, roleCourant } from './session'
import { etatBoutique } from './boutique'
import { litigesOuverts } from './litiges'
import { tousLesRetours } from './retours'

const ETATS_COMMANDE: Record<EtatDeLArgent, 'en_cours' | 'se_libere' | 'gele' | 'a_verser' | 'verse'> = { 'En cours': 'en_cours', 'Se libère': 'se_libere', Gelé: 'gele', 'À verser': 'a_verser', Versé: 'verse' }

interface EtatCommande {
  etape: EtapeCommande | 'chez_le_livreur' | 'annulee'
  echeance: Instant | null
  prolongee: boolean
  preteA: Instant | null
  remiseA?: Instant | null // posé par la remise (VD-06) ; à défaut, lu dans le journal
  annulation?: { motif: MotifAnnulation; a: Instant } | null
  journal: EntreeJournal[]
}

// Référence de chaque variante (imprimée sur la boîte) et ce qui est livré avec l'article (fiche BelivaY).
const REFERENCES: Record<string, string> = { 'itel-noir': 'ITL-AC52-NR', 'itel-bleu': 'ITL-AC52-BL', iphone: 'APL-IP15PM-256', chargeur: 'ORM-CH18-BL', coque: 'ITL-AC52-CQ-NR', ecouteurs: 'ORM-EC35-NR', 'pagne-bleu': 'VLS-WAX6-BL', 'pagne-rouge': 'VLS-WAX6-RG', 'itel-64': 'ITL-AC52-64-NR', 'iphone-128': 'APL-IP15PM-128' }
const ACCESSOIRES: Record<string, string[]> = { 'itel-noir': ['chargeur', 'câble', 'boîte d’origine'], 'itel-bleu': ['chargeur', 'câble', 'boîte d’origine'], iphone: ['câble', 'boîte d’origine'], chargeur: ['câble USB-C', 'boîte d’origine'], 'pagne-bleu': ['étiquette d’origine'], 'pagne-rouge': ['étiquette d’origine'] }
export const referenceDe = (offreId: string) => REFERENCES[offreId] ?? offreId.toUpperCase()
export const accessoiresDe = (offreId: string) => ACCESSOIRES[offreId] ?? ['boîte d’origine']
const MOYENS: Record<CommandeEssai['moyen'], string> = { momo: 'Mobile Money', carte: 'carte bancaire', apple: 'Apple Pay', google: 'Google Pay', wallet: 'Portefeuille BelivaY', usd: 'carte en dollars', eur: 'carte en euros', comptoir: 'au comptoir du relais' }
const SYSTEME = 'Système BelivaY'
const INSPECTION_HEURES = 48 // inspection d'un retour à réception (VD-07)

const JOURS_PASSAGE: Record<string, number[]> = { 'lun–ven': [0, 1, 2, 3, 4], sam: [5], dim: [6] }

/** Calendrier de préparation : horaires de la boutique et passages du livreur. « Fermer aujourd'hui » n'arrête pas
 *  la préparation des commandes déjà reçues (« elles restent à préparer », Q-39) : il ne compte pas ici. */
export function calendrier(): CalendrierBoutique {
  const b = etatBoutique()
  return {
    horaires: b.horaires,
    fermeeLe: b.fermeeLe,
    fermetures: b.fermetures,
    passages: BOUTIQUE.passageLivreur.map((p) => ({ jours: JOURS_PASSAGE[p.jours] ?? [0, 1, 2, 3, 4], de: p.de, a: p.a })),
  }
}

function histoire(c: CommandeEssai): EntreeJournal[] {
  const a = ARTICLES[c.article]
  const cal = calendrier()
  const j: EntreeJournal[] = [
    c.payableAuRetrait
      ? { a: c.payeeA, auteur: SYSTEME, role: 'systeme', action: 'Commande validée · payable au retrait', detail: 'Rien n’est encaissé avant le retrait' }
      : { a: c.payeeA, auteur: SYSTEME, role: 'systeme', action: 'Commande payée par le client', detail: 'Encaissée par BelivaY · ' + MOYENS[c.moyen] },
    { a: c.payeeA, auteur: SYSTEME, role: 'systeme', action: 'Entrée dans la file à préparer', detail: 'Système BelivaY · prête avant {h}', detailA: c.echeance ?? ajouterOuvertes(ouvertureSuivante(c.payeeA, cal), 4 * HEURE, cal) },
  ]
  // Faits du jeu d'essai (prototype, Journal de BLV-00008) : bon ouvert par le propriétaire, stock mis à jour par l'employée.
  if (c.ref === 'BLV-00008') {
    j.push({ a: yaounde(2026, 9, 21, 9, 12), auteur: 'Franck Penga', role: 'proprietaire', action: 'Bon de préparation ouvert' })
    j.push({ a: yaounde(2026, 9, 21, 9, 20), auteur: 'Aïcha N.', role: 'preparation', action: 'Stock de l’{p} mis à jour', detail: `${a.titre} ${a.variante}`, avant: '4', apres: '3' })
  }
  const preparateur = `${MEMBRES[1].prenom} ${MEMBRES[1].nom}`
  if (c.preteA) j.push({ a: c.preteA, auteur: preparateur, role: 'preparation', action: '« C’est prêt »' })
  if (c.remiseA) j.push({ a: c.remiseA, auteur: preparateur, role: 'preparation', action: 'Remis au livreur', detail: `${LIVREUR.nom} · ${LIVREUR.societe}` })
  if (c.annulation) j.push({ a: c.annulation.a, auteur: c.annulation.motif === 'rupture' ? `${MEMBRES[0].prenom} ${MEMBRES[0].nom}` : SYSTEME, role: c.annulation.motif === 'rupture' ? 'proprietaire' : 'systeme', action: c.annulation.motif === 'rupture' ? 'Rupture signalée · commande annulée' : 'Annulée par le client avant le ramassage', detail: 'Client remboursé en entier · rien ne vous est retenu' })
  if (c.retraitA) j.push({ a: c.retraitA, auteur: SYSTEME, role: 'systeme', action: 'Retirée par le client' })
  if (c.litige) j.push({ a: c.litige.ouvertA, auteur: SYSTEME, role: 'systeme', action: 'Litige ouvert par le client', detail: c.litige.motif })
  if (c.retour && c.retraitA) j.push({ a: c.retraitA + 30 * HEURE, auteur: SYSTEME, role: 'systeme', action: 'Retour signalé par le client', detail: c.retour.motif })
  if (c.fermetureA && c.retraitA) {
    const confirmee = c.fermetureA < c.retraitA + PARAMETRES.versements.fenetreRetourJours * JOUR
    j.push({ a: c.fermetureA, auteur: SYSTEME, role: 'systeme', action: confirmee ? 'Confirmée par le client' : 'Fenêtre de retour close' })
    const lib = dateDeLiberation(c.fermetureA, BOUTIQUE.palier, c.moyen === 'carte', PARAMETRES.versements)
    if (lib <= maintenant() || c.versement) j.push({ a: lib, auteur: SYSTEME, role: 'systeme', action: 'Argent libéré' })
    if (c.versement) j.push({ a: debutDuJour(vendrediDeVersement(lib, PARAMETRES.versements)) + PARAMETRES.versements.heureVersement * HEURE - HEURE, auteur: SYSTEME, role: 'systeme', action: 'Versée', detail: 'Versement ' + c.versement })
  }
  return j.sort((x, y) => x.a - y.a)
}

const initial = () =>
  Object.fromEntries(
    COMMANDES.map((c) => [
      c.ref,
      { etape: c.etape, echeance: c.echeance ?? null, prolongee: false, preteA: c.preteA ?? null, remiseA: c.remiseA ?? null, annulation: c.annulation ?? null, journal: histoire(c) } satisfies EtatCommande as EtatCommande,
    ]),
  ) as Record<string, EtatCommande>

export const etatCommandes = magasin('commandes', initial)

// ── Sous-commandes de remplacement (REFCL-R080, VD07-R31) ──────────────────────────────────────────────────────
// Un remplacement proposé au client crée une commande « à préparer » (même parcours : C'est prêt, remise au livreur),
// sans nouvel argent (la vente d'origine reste la seule). Gardées dans le magasin des commandes, rejointes à la liste.
const SOUS = magasin('commandes_remplacement', () => ({ liste: [] as { ref: string; origine: string; a: number; echeance: number }[] }))
function joindreSousCommandes() {
  for (const s of SOUS.lire().liste) {
    if (COMMANDES.some((c) => c.ref === s.ref)) continue
    const o = COMMANDES.find((c) => c.ref === s.origine)
    if (o && etatCommandes.lire()[s.ref]) COMMANDES.push({ ref: s.ref, article: o.article, quantite: o.quantite, colis: o.colis, payeeA: s.a, payableAuRetrait: false, moyen: o.moyen, etape: 'a_preparer', echeance: s.echeance, remplacementDe: s.origine })
  }
}
joindreSousCommandes()

/** Crée la sous-commande de remplacement d'un retour, à préparer avant `echeance` ; rend sa référence. */
export function creerSousCommande(origine: string, echeance: number): string {
  const ref = origine + '-R'
  if (!SOUS.lire().liste.some((s) => s.ref === ref)) {
    const a = maintenant()
    etatCommandes.ecrire((x) => {
      x[ref] = { etape: 'a_preparer', echeance, prolongee: false, preteA: null, remiseA: null, annulation: null, journal: [{ a, auteur: SYSTEME, role: 'systeme', action: 'Remplacement à préparer', detail: 'Retour ' + origine + ' · même parcours, aucun nouvel encaissement' }] }
    })
    SOUS.ecrire((e) => {
      e.liste.push({ ref, origine, a, echeance })
    })
    joindreSousCommandes()
  }
  return ref
}

// ── Nouvelle commande pendant la visite (son des pièces, src/composants/sonPieces.ts) ─────────────────────────────
// Une seule par visite, environ 45 s après l'ouverture, jamais sous navigateur piloté (tests) : une vraie commande
// payée par Mobile Money, à la suite des références du jeu d'essai, qui entre dans « À préparer » (échéance : 4 h
// ouvertes, comme les autres), avec sa notification (notifications.ts, commandesArrivees) ; le badge des commandes
// monte, ce qui déclenche le son. Son montant gardé est calculé comme pour les autres (gardeFige, src/calculs).
const ARRIVEES = magasin('commandes_arrivees', () => ({ liste: [] as { ref: string; article: string; a: number; echeance: number }[] }))
function joindreArrivees() {
  for (const x of ARRIVEES.lire().liste)
    if (!COMMANDES.some((c) => c.ref === x.ref) && etatCommandes.lire()[x.ref])
      COMMANDES.push({ ref: x.ref, article: x.article, quantite: 1, colis: 'S', payeeA: x.a, payableAuRetrait: false, moyen: 'momo', etape: 'a_preparer', echeance: x.echeance })
}
joindreArrivees()

/** Commandes arrivées pendant les visites (notifications « à préparer »). */
export const commandesArrivees = () => ARRIVEES.lire().liste.map((x) => essaiDe(x.ref)).filter((c): c is CommandeEssai => !!c)

function faireArriverUneCommande() {
  const offre = OFFRES.find((o) => o.etat === 'en_vente' && o.stock > 0 && ARTICLES[o.id])
  if (!offre) return
  const n = Math.max(...COMMANDES.map((c) => Number(/^BLV-(\d+)$/.exec(c.ref)?.[1] ?? 0))) + 1
  const ref = 'BLV-' + String(n).padStart(5, '0')
  const a = maintenant()
  const cal = calendrier()
  const echeance = ajouterOuvertes(ouvertureSuivante(a, cal), 4 * HEURE, cal)
  const c: CommandeEssai = { ref, article: offre.id, quantite: 1, colis: 'S', payeeA: a, payableAuRetrait: false, moyen: 'momo', etape: 'a_preparer', echeance }
  ARRIVEES.ecrire((e) => {
    e.liste.push({ ref, article: offre.id, a, echeance })
  })
  // Jointe à la liste dans la même écriture : la session relue à l'événement compte déjà la nouvelle commande.
  etatCommandes.ecrire((x) => {
    x[ref] = { etape: 'a_preparer', echeance, prolongee: false, preteA: null, remiseA: null, annulation: null, journal: histoire(c) }
    COMMANDES.push(c)
  })
}

const CLE_ARRIVEE = 'blv_v_arrivee'
if (typeof window !== 'undefined' && !navigator.webdriver) {
  let deja = true
  try {
    deja = !!sessionStorage.getItem(CLE_ARRIVEE)
  } catch {
    /* stockage refusé : pas de commande surprise */
  }
  if (!deja)
    setTimeout(() => {
      try {
        if (sessionStorage.getItem(CLE_ARRIVEE)) return
        sessionStorage.setItem(CLE_ARRIVEE, '1')
      } catch {
        return
      }
      faireArriverUneCommande()
    }, 45_000)
}

/** Commandes encaissées comptées par l'offre de découverte (Q-62) : payées, hors payables au retrait non payées. */
export const commandesComptees = () => COMMANDES.filter((c) => !c.payableAuRetrait && !c.remplacementDe).length

/** Commission, TVA et gardé figés au paiement (D5) : palier et découverte du jour du paiement (aussi lus par l'argent :
 * facture des commissions). */
export function commissionFigee(c: CommandeEssai): ResultatCommission {
  const a = ARTICLES[c.article]
  const p = PARAMETRES.commission
  const rang = COMMANDES.filter((x) => !x.payableAuRetrait && x.payeeA < c.payeeA).length
  // L'offre de découverte part de la première commande payée : une vente plus ancienne (comptoir) n'en profite pas.
  const decouverte = jourDe(c.payeeA) >= BOUTIQUE.premiereCommandePayee && decouverteActive(BOUTIQUE.premiereCommandePayee, jourDe(c.payeeA), rang, p)
  return calculerCommission([{ famille: familleDe(a.categorie, p), prixUnitaire: a.prix, quantite: c.quantite, madeInCameroon: a.madeInCameroon }], BOUTIQUE.palier, decouverte, p)
}
/** Montant gardé figé au paiement (D5). */
export const gardeFige = (c: CommandeEssai): number => commissionFigee(c).garde

export const essaiDe = (ref: string) => COMMANDES.find((c) => c.ref === ref) ?? null

const remiseDe = (e: EtatCommande) => e.remiseA ?? e.journal.find((x) => x.action.startsWith('Remis au livreur'))?.a ?? null

function statut(c: CommandeEssai, e: EtatCommande): StatutCommande {
  switch (e.etape) {
    case 'a_preparer':
      return c.payableAuRetrait ? 'payable_au_retrait' : 'a_preparer'
    case 'chez_le_livreur':
      return remiseDe(e) ? 'chez_le_livreur' : 'prete'
    case 'litige':
      return 'litige_gele'
    case 'retour':
      return 'retour_gele'
    case 'annulee':
      return 'annulee'
    default:
      return 'livree'
  }
}

export function vueCommande(c: CommandeEssai, role: Role): Commande {
  const e = etatEffectif(c.ref)
  const a = ARTICLES[c.article]
  const proprio = role === 'proprietaire'
  const figee = commissionFigee(c)
  const garde = figee.garde
  const cal = calendrier()
  const debut = ouvertureSuivante(c.payeeA, cal)
  const lib = c.fermetureA ? dateDeLiberation(c.fermetureA, BOUTIQUE.palier, c.moyen === 'carte', PARAMETRES.versements) : null
  // État de l'argent par la même règle que Mon argent (etatDeLArgent, VD09-R04) : une vente dont la libération est
  // passée est « à verser » ; le gel prime (LIB-02).
  const gel = e.etape === 'litige' ? 'litige' : e.etape === 'retour' ? 'retour' : null
  const enVente = ['versee', 'a_verser', 'se_libere', 'litige', 'retour'].includes(e.etape)
  const etatArgent = enVente ? ETATS_COMMANDE[etatDeLArgent({ reference: c.ref, garde: 0, liberation: lib, verse: e.etape === 'versee', gel }, maintenant())] : 'en_cours'
  const st = statut(c, e)
  const enPrep = e.etape === 'a_preparer'
  const pv = PARAMETRES.versements
  const litige = c.litige && e.etape === 'litige' ? litigesOuverts().find((l) => l.ref === c.ref) : null
  return {
    ref: c.ref,
    statut: st,
    payableAuRetrait: c.payableAuRetrait,
    payeeA: c.payeeA,
    debut,
    echeance: enPrep ? e.echeance : null,
    echeanceAbsolue: enPrep ? ajouterOuvertes(debut, 24 * HEURE, cal) : null,
    prolongee: e.prolongee,
    calendrier: cal,
    lignes: [{ article: { offreId: a.offreId, titre: a.titre, variante: a.variante, etat: a.etat, dessin: a.dessin, categorie: a.categorie }, quantite: c.quantite, prixUnitaire: proprio ? a.prix : null, reference: referenceDe(a.offreId), aMettreDeCote: accessoiresDe(a.offreId) }],
    colis: c.colis,
    garde: proprio && !c.remplacementDe ? garde : null,
    commissionMinimale: proprio && !c.remplacementDe && figee.plancherApplique ? figee.commission : null,
    remplacementDe: c.remplacementDe ?? null,
    liberationJours: c.moyen === 'carte' ? pv.libCarteJours : BOUTIQUE.palier === 'Or' || BOUTIQUE.palier === 'Platine' ? pv.libOrJours : pv.libStandardJours,
    argent: proprio && !c.remplacementDe ? { etat: etatArgent, liberation: lib, vendredi: lib ? vendrediDeVersement(lib, PARAMETRES.versements) : null, versement: c.versement ?? null } : null,
    livreur: st === 'a_preparer' || st === 'payable_au_retrait' || st === 'prete' || st === 'chez_le_livreur' ? { ...LIVREUR, photo: 'person' } : null,
    ramassage: enPrep && e.echeance ? passageSuivant(e.echeance, cal) : st === 'prete' && e.preteA ? passageSuivant(e.preteA, cal) : null,
    preteA: e.preteA,
    remiseA: remiseDe(e),
    retireeA: c.retraitA ?? null,
    confirmeeParLeClient: !!(c.fermetureA && c.retraitA && c.fermetureA < c.retraitA + pv.fenetreRetourJours * JOUR),
    annulation: e.etape === 'annulee' ? (e.annulation ?? { motif: 'rupture', a: maintenant() }) : null,
    probleme:
      c.litige && e.etape === 'litige'
        ? { type: 'litige', echeance: c.litige.echeance, motif: c.litige.motif, repondu: !!litige?.reponse }
        : c.retour && e.etape === 'retour'
          ? { type: 'retour', motif: c.retour.motif, arrivee: c.retour.arrivee, inspectionHeures: INSPECTION_HEURES }
          : null,
    gele: proprio && (e.etape === 'litige' || e.etape === 'retour') ? garde : null,
    moyenPaiement: c.moyen,
  }
}

/** Progression « Se libère » d'une commande (barre), ou null. */
export function progressionDe(ref: string): number | null {
  const c = essaiDe(ref)
  if (!c?.fermetureA) return null
  const lib = dateDeLiberation(c.fermetureA, BOUTIQUE.palier, c.moyen === 'carte', PARAMETRES.versements)
  return progressionPourCent(c.fermetureA, lib, maintenant())
}

/** État effectif d'une commande (CMD-07) : un litige ou un retour CLOS quitte « Problèmes » et l'argent gelé. Litige
 * accepté ou perdu, retour remboursé : la vente est annulée (client remboursé) ; litige gagné (délai de recours passé)
 * ou remplacement fait : l'argent reprend sa libération. Pendant le délai de recours, un litige gagné reste gelé
 * (Q-26). Le magasin garde l'étape écrite ; seule la lecture change. */
export function etatEffectif(ref: string, e: EtatCommande = etatCommandes.lire()[ref]): EtatCommande {
  if (e?.etape === 'litige') {
    const l = litigesOuverts().find((x) => x.ref === ref)
    if (l?.etat === 'clos') return l.issue === 'gagne' ? { ...e, etape: 'se_libere' } : { ...e, etape: 'annulee', annulation: e.annulation ?? { motif: 'litige_perdu', a: l.decision?.a ?? l.reponse?.envoyeeA ?? maintenant() } }
  }
  if (e?.etape === 'retour') {
    const r = tousLesRetours().find((x) => x.ref === ref)
    if (r?.etat === 'clos') return r.suite.type === 'rembourse' ? { ...e, etape: 'annulee', annulation: e.annulation ?? { motif: 'litige_perdu', a: r.suite.le } } : { ...e, etape: 'se_libere' }
  }
  return e
}
export const etapeEffective = (ref: string) => etatEffectif(ref).etape

/** Filtre d'une commande : une annulée reste dans « Terminées » avec son motif (Q-73), hors de la file à préparer. */
export function filtreDe(etape: EtatCommande['etape']): FiltreCommandes {
  if (etape === 'a_preparer') return 'prep'
  if (etape === 'chez_le_livreur') return 'cours'
  if (etape === 'litige' || etape === 'retour') return 'pb'
  return 'fin'
}

export function compterCommandes(): Record<FiltreCommandes, number> {
  const e = etatCommandes.lire()
  const n: Record<FiltreCommandes, number> = { prep: 0, cours: 0, fin: 0, pb: 0 }
  for (const c of COMMANDES) n[filtreDe(etatEffectif(c.ref, e[c.ref]).etape)]++
  return n
}

function detailCompteurs(): CompteursDetail {
  const e = etatCommandes.lire()
  const d: CompteursDetail = { prep: 0, cours: 0, litiges: 0, retours: 0, terminees: 0, annulees: 0 }
  for (const c of COMMANDES) {
    const x = etatEffectif(c.ref, e[c.ref]).etape
    if (x === 'a_preparer') d.prep++
    else if (x === 'chez_le_livreur') d.cours++
    else if (x === 'litige') d.litiges++
    else if (x === 'retour') d.retours++
    else if (x === 'annulee') d.annulees++
    else d.terminees++
  }
  return d
}

/** Note une action signée dans le journal de la commande (GEN-09) ; `a` : heure d'origine (action gardée hors connexion). */
export function journaliser(ref: string, role: Role, action: string, plus: Partial<EntreeJournal> = {}) {
  const membre = MEMBRES.find((m) => m.role === role)!
  etatCommandes.ecrire((e) => {
    e[ref].journal.push({ a: maintenant(), auteur: `${membre.prenom} ${membre.nom}`, role, action, ...plus })
  })
}

// Ordre de chaque filtre : la plus urgente d'abord (CMD-08), puis la plus récente.
function trier(f: FiltreCommandes, items: Commande[]): Commande[] {
  const cle = (c: Commande) =>
    f === 'prep' ? (c.echeance ?? 0) : f === 'pb' ? (c.probleme?.type === 'litige' ? c.probleme.echeance : Number.MAX_SAFE_INTEGER) : -(c.remiseA ?? c.preteA ?? c.annulation?.a ?? c.retireeA ?? c.payeeA)
  return items.sort((a, b) => cle(a) - cle(b))
}

function vue(filtre: FiltreCommandes): VueCommandes {
  const e = etatCommandes.lire()
  const role = roleCourant()
  const items = trier(filtre, COMMANDES.filter((c) => filtreDe(etatEffectif(c.ref, e[c.ref]).etape) === filtre).map((c) => vueCommande(c, role)))
  return { compteurs: compterCommandes(), detail: detailCompteurs(), total: COMMANDES.length, items, maintenant: maintenant() }
}

export const demoCommandes: DomaineCommandes = {
  vue: (filtre) => avecDroit('commandes.voir', 'commandes', () => repondre(vue(filtre))),
  liste: (filtre) => avecDroit('commandes.voir', 'commandes', () => repondre(vue(filtre).items)),
  compteurs: () => repondre(compterCommandes()),
  detail: (ref) => avecDroit('commandes.voir', 'commande', () => {
    const c = essaiDe(ref)
    return repondre(c ? vueCommande(c, roleCourant()) : null)
  }),
  journal: (ref) => repondre((etatCommandes.lire()[ref]?.journal ?? []).map((e, i) => ({ e, i })).sort((x, y) => y.e.a - x.e.a || y.i - x.i).map((x) => x.e)),
}
