// Domaine « livreurs » (ENT-P05, ENT-P06) : liste filtrable et fiche du livreur (statut, certification, pièces —
// contrôlées par l'entreprise : voir chaque pièce, la valider ou la refuser avec motif, suivre son expiration et relancer
// le livreur (consigne du porteur, 12 oct. 2026, qui remplace ENT-P06R-03 « statut et date seulement ») ; l'image n'est
// servie que par un lien signé de courte durée, en filigrane, et chaque consultation est journalisée —, véhicule,
// zones, capacité, Trust Score et
// ses critères, activité, journal de la fiche). L'entreprise approuve, suspend, lève sa propre suspension, retire (effet
// après les missions en cours : ENT-P05R-01) ; une suspension décidée par BelivaY ne se lève pas ici (409
// BELIVAY_SUSPENSION, ENT-P05R-03) ; chaque modification est notifiée au livreur et journalisée {auteur, champ, avant,
// après} (ENT-P06R-01). Le tarif par mission affiché au livreur reste entre eux (ENT-P06R-02) ; la note interne est
// chiffrée, jamais visible du livreur (ENT-P06R-04, S-10). Droits : propriétaire et répartiteur (ENT-02-R61).
// API : GET /api/company/couriers?zone=, /couriers/{id} ; POST …/approve | suspend | reinstate | remove ;
// PATCH /riders/{id} ; POST /riders/{id}/note ; POST /riders/{id}/trust/events/{event_id}/evidence ;
// pièces : GET /couriers/documents/queue, GET /couriers/{id}/documents/{type}/view, POST …/review, POST …/remind.
// DP-66 (le livreur est employé par son entreprise ; il DEMANDE, l'entreprise décide) : départs demandés (GET
// /couriers/departures ; kit restitué POST /couriers/{id}/departure/kit ; clôture POST …/departure/close), absences
// prévenues (GET /couriers/absences ; POST /couriers/absences/{id}/seen), nouvelle vérification de la photo (POST
// /couriers/{id}/documents/selfie/reverify) : la photo est l'identité vérifiée, elle ne change que par une nouvelle
// vérification demandée par l'entreprise.
// DP-67 (justes pour les deux côtés) : pendant le préavis, paquets jusqu'à la veille du dernier jour (affectationJusqua) ;
// constat du kit (POST /couriers/{id}/departure/kit {constat, manquants?, montant?, photo?} : restitué, ou incomplet avec
// photo, éléments manquants de KIT-VALEUR-F et retenue plafonnée, contestable par le livreur, au plus tard
// DEPART-KIT-CONSTAT-H après la fin du préavis ; silence : « kit non contesté », sans retenue) ; dernier versement détaillé
// (litiges ouverts retenus au plus le montant contesté) et marqué fait (POST …/departure/paid : SMS au livreur) ; absences
// avec motif de liste, texte, « imprévu » et « prévenue après le début du créneau » ; nouvelle photo : statut dédié
// « reverification », échéance PHOTO-REVERIF-J, puis plus de nouvelle mission jusqu'à la validation.
import type { CodeZone, Francs, Instant, Jour, LivreurCourt, Resultat } from '../communs'

export type StatutLivreur = 'en_activation' | 'actif' | 'en_ligne' | 'en_mission' | 'suspendu' | 'retire'

export interface SuspensionLivreur {
  par: 'entreprise' | 'belivay'
  niveau: number | null // échelle des sanctions (BelivaY)
  motif: string
  depuis: Instant
  jusqua: Instant | null
}

export interface Livreur extends LivreurCourt {
  telephone: string
  statut: StatutLivreur
  zones: CodeZone[]
  trustScore: number | null // null : pas encore assez de missions
  certifieJusqua: Instant | null
  missionsDuJour: number
  capacite?: number // colis par jour
  plaque?: string | null
  suspension?: SuspensionLivreur | null
  retraitDemande?: Instant | null // retrait décidé par l'entreprise : effectif après les missions en cours
  activeLe?: Instant | null
  /** Alertes (pièce à renouveler, certification qui expire, véhicule non proposé). */
  alertes?: string[]
}

export interface EntreeJournal {
  le: Instant
  auteur: string // « Gaëlle Wankeu · propriétaire »
  champ: string
  avant: string
  apres: string
}

export interface EvenementTrust {
  id: string
  le: Instant
  libelle: string
  critere: string
  effet: number
  contestation: { le: Instant; texte: string; elements: string | null } | null
}

export type TypePiece = 'identite' | 'selfie' | 'permis'
export type StatutPiece = 'manquante' | 'en_revue' | 'valide' | 'refusee' | 'expiree' | 'reverification'
export type FacePiece = 'recto' | 'verso' | 'photo'

/** Pièce du livreur (envoyée par lui depuis son application, contrôlée par l'entreprise). */
export interface PieceLivreur {
  type: TypePiece
  statut: StatutPiece // « expiree » : calculé à la lecture (date passée)
  expireLe: Instant | null
  numero: string | null // masqué : « ···· 4821 »
  envoyeeLe: Instant | null
  motif: string | null // motif écrit du refus, envoyé au livreur
  controle: { par: string; le: Instant } | null // dernier contrôle (validation ou refus)
  relances: Instant[] // rappels envoyés au livreur (le plus récent d'abord)
  faces: FacePiece[] // faces envoyées (recto et verso, ou une photo)
  /** Nouvelle vérification de la photo demandée (selfie seulement, null sinon) : gardée pendant « en_revue » qui suit
   * l'envoi, effacée à la validation ; « bloque » : délai PHOTO-REVERIF-J passé, plus de nouvelle mission. */
  reverification: { le: Instant; motif: string; jusqua: Instant; bloque: boolean } | null
}

/** Consultation d'une pièce : liens signés, valables quelques minutes, image en filigrane (qui consulte, quand). */
export interface VuePiece {
  faces: { face: FacePiece; url: string }[]
  valableJusqua: Instant
  filigrane: string
}

export type RaisonControle = 'a_controler' | 'refusee' | 'expiree' | 'expire_bientot' | 'manquante' | 'reverification'
/** File des pièces de la flotte qui demandent un geste. */
export interface PieceAControler {
  livreur: LivreurCourt & { statut: StatutLivreur }
  piece: PieceLivreur
  raison: RaisonControle
}

export interface DecisionPiece {
  decision: 'valide' | 'refusee'
  motif?: string // exigé pour un refus
  expireLe?: Instant | null // exigée pour valider une pièce d'identité ou un permis (date lue sur la pièce)
}

/** Motif d'une demande de départ (moteurs/belivay_moteurs/depart.py MOTIFS). */
export type MotifDepart = 'autre_emploi' | 'horaires' | 'remuneration' | 'demenagement' | 'sante' | 'personnel' | 'autre'
export type ConditionDepart = 'sans_mission' | 'sans_colis' | 'kit_constate'
export type ConstatKit = 'restitue' | 'incomplet'

/** Kit rendu par le livreur qui part, constaté par l'entreprise (DP-67, 2). */
export interface KitDepart {
  constat: ConstatKit | null
  manquants: string[] // libellés des éléments de KIT-VALEUR-F
  retenue: Francs // 0 si restitué ou non constaté
  photo: boolean
  constateLe: Instant | null
  constatePar: string | null // « Prénom Nom · rôle »
  constatJusqua: Instant // fin du préavis + DEPART-KIT-CONSTAT-H
  echu: boolean // délai passé sans constat : l'administrateur peut clôturer « kit non contesté »
  contestation: { le: Instant; motif: string; decision: 'maintenue' | 'annulee' | null; decideLe: Instant | null } | null
}

/** Dernier versement du livreur qui part (DP-67, 6) : estimé à ce jour pendant le préavis, figé à la clôture. */
export interface DernierVersement {
  du: Francs | null // missions validées (null : pas de tarif par mission, compteur seul)
  missions: number
  retenuLitiges: Francs
  litiges: number
  retenueKit: Francs // définitive
  kitDeCote: Francs // contestée : mise de côté jusqu'à la décision de BelivaY
  verse: Francs | null // versé le vendredi suivant la clôture
  faitLe: Instant | null // versement Mobile Money marqué fait (SMS envoyé au livreur)
}

/** Demande de départ d'un livreur (DP-66) : sans effet immédiat ; préavis DEPART-PREAVIS-J ; clôture par l'entreprise
 * quand les conditions sont remplies, ou par l'administrateur BelivaY une fois le préavis échu. */
export interface DemandeDepart {
  id: string
  /** « livreur » : il a demandé à partir ; « entreprise » : fin de contrat décidée par l'employeur (domaine « equipe »). */
  initiative: 'livreur' | 'entreprise'
  livreur: LivreurCourt & { statut: StatutLivreur }
  demandeLe: Instant
  motif: MotifDepart
  texte: string | null
  preavisJusqua: Instant
  echu: boolean
  etat: 'demande' | 'close'
  conditions: { missionsEnCours: number; colisSousGarde: number; kitConstate: boolean; litigesOuverts: number }
  manquantes: ConditionDepart[]
  closLe: Instant | null
  closPar: 'entreprise' | 'admin' | null
  versementLe: Instant | null
  affectationJusqua: Instant // début (0 h Yaoundé) du dernier jour du préavis : plus de nouvelle affectation à partir de là
  kit: KitDepart
  kitNonConteste: boolean // clôturé par l'administrateur sans constat dans le délai : aucune retenue
  versement: DernierVersement
}

/** Motif d'une absence (moteurs/belivay_moteurs/absence.py MOTIFS). */
export type MotifAbsence = 'maladie' | 'deuil_famille' | 'panne_moto' | 'demarches' | 'autre'

/** Absence prévenue par le livreur (il ne modifie pas son planning : il prévient) ; l'entreprise la marque vue. */
export interface AbsenceLivreur {
  id: string
  livreur: LivreurCourt
  du: Jour
  au: Jour // inclus
  motif: MotifAbsence
  texte: string | null // facultatif, 120 caractères au plus
  imprevu: boolean // maladie, deuil ou famille, panne de moto : prévenue dans le délai court, sans pénalité
  apresDebut: boolean // imprévu prévenu après le début de son premier créneau
  prevenueLe: Instant
  vueLe: Instant | null
}

export interface FicheLivreur extends Livreur {
  pieces: PieceLivreur[]
  vehiculeId: string | null
  note: string | null
  charteLe?: Instant | null
  certification?: { quiz: number | null; le: Instant | null; modules: number; modulesFaits: number }
  criteres?: { critere: string; poids: number; note: number }[]
  evenements?: EvenementTrust[]
  activite?: {
    jours: { jour: Jour; missions: number }[]
    paquets: { id: string; le: Instant; zone: CodeZone; colis: number; dansLeDelai: boolean | null }[]
    colisLivres: number
    dansLeDelai: number
    remis: number
  }
  tarifMission?: Francs | null
  notifications?: { le: Instant; texte: string }[]
  journal?: EntreeJournal[]
  /** Demande de départ ouverte (ou close récemment), null sans demande (DP-66). */
  depart?: DemandeDepart | null
  /** Absences prévenues à venir ou en cours. */
  absences?: AbsenceLivreur[]
}

export interface ModificationLivreur {
  vehiculeId?: string | null
  zones?: CodeZone[]
  capacite?: number
}

export interface DomaineLivreurs {
  liste(filtre?: { zone?: CodeZone; statut?: StatutLivreur }): Promise<Livreur[]>
  fiche(id: string): Promise<FicheLivreur | null>
  /** Suspension par l'employeur : motif écrit, date de fin facultative (null : jusqu'à la réintégration). */
  suspendre(id: string, motif: string, jusqua?: Instant | null): Promise<Resultat<object, 'motif' | 'date' | 'statut'>>
  /** Réintégration (levée de sa propre suspension) ; motif écrit, sauf l'annulation immédiate d'une erreur. */
  lever(id: string, motif?: string): Promise<Resultat<object, 'belivay' | 'statut'>>
  retirer(id: string, motif: string): Promise<Resultat<{ effetLe: 'maintenant' | 'apres_missions' }, 'motif'>>
  approuver(id: string): Promise<Resultat<object, 'pas_pret'>>
  modifier(id: string, m: ModificationLivreur): Promise<Resultat<object, 'zones' | 'capacite' | 'vehicule'>>
  noter(id: string, note: string): Promise<Resultat>
  tarif(id: string, montant: Francs | null): Promise<Resultat<object, 'montant'>>
  prevenir(id: string, sujet: 'piece' | 'certification' | 'vehicule'): Promise<Resultat>
  joindreElements(id: string, evenementId: string, texte: string): Promise<Resultat<object, 'texte' | 'statut'>>
  /** Pièces de toute la flotte qui demandent un geste (à contrôler, refusées, expirées ou bientôt). */
  controles(): Promise<PieceAControler[]>
  /** Ouvre une pièce (journalisé) : propriétaire et répartiteur. */
  voirPiece(id: string, type: TypePiece): Promise<Resultat<VuePiece, 'statut'>>
  /** Valide ou refuse une pièce (motif exigé pour un refus ; date d'expiration pour une pièce d'identité ou un permis). */
  controlerPiece(id: string, type: TypePiece, d: DecisionPiece): Promise<Resultat<object, 'motif' | 'date' | 'statut'>>
  /** Relance le livreur pour une pièce (à renvoyer, expirée ou bientôt). */
  relancerPiece(id: string, type: TypePiece): Promise<Resultat<object, 'statut'>>
  /** Demande une nouvelle vérification de la photo (selfie), motif exigé : le livreur reprend son selfie. */
  demanderPhoto(id: string, motif: string): Promise<Resultat<{ jusqua: Instant }, 'motif' | 'statut'>>
  /** Départs demandés par les livreurs (DP-66) : ouverts d'abord, puis clos récemment. */
  departs(): Promise<DemandeDepart[]>
  /** Constat du kit (condition de la clôture) : restitué, ou incomplet (photo, éléments manquants, montant au plus leur
   * valeur, plafonné à KIT-VALEUR-F) au plus tard DEPART-KIT-CONSTAT-H après la fin du préavis ; null : constat retiré.
   * « constat » : valeur inconnue ; « conteste » : le livreur a contesté la retenue, le constat est figé. */
  constaterKit(id: string, c: { constat: ConstatKit | null; manquants?: string[]; montant?: Francs | null; photo?: string | null }): Promise<Resultat<{ retenue: Francs }, 'aucune_demande' | 'constat' | 'conteste' | 'photo' | 'manquants' | 'element' | 'delai' | 'montant'>>
  /** Dernier versement Mobile Money fait (après la clôture) : SMS au livreur. */
  versementFait(id: string): Promise<Resultat<object, 'aucune_demande' | 'deja_fait'>>
  /** Clôture le départ : dernier relevé, versement le vendredi suivant, accès fermé, téléphone délié, journal, administrateur prévenu. */
  cloturerDepart(id: string): Promise<Resultat<{ versementLe: Instant; kitNonConteste: boolean }, 'aucune_demande' | 'conditions'> & { manquantes?: string[] }>
  /** Absences prévenues par les livreurs (à venir ou en cours). */
  absences(): Promise<AbsenceLivreur[]>
  /** L'entreprise a vu l'absence : le livreur en est prévenu. */
  absenceVue(absenceId: string): Promise<Resultat<object, 'inconnue'>>
}
