// Domaine « acces » (LIV-03 : LIV-P02 activation, LIV-P03 certification, LIV-P32 états du compte). Règles :
// - activation complète ⇔ charte acceptée ∧ pièces exigées vérifiées ∧ certification réussie ∧ approbation de
//   l'entreprise ∧ entreprise active ; seul le serveur passe le compte à « actif » (LIV-03-R17, LIV-P02R-05) ;
// - l'entreprise voit le statut de chaque pièce, jamais son image (LIV-03-R22) ; une pièce rejetée a toujours un motif ;
// - certification : 7 modules, quiz de 20 questions tirées et corrigées par le serveur (les bonnes réponses ne
//   viennent jamais au téléphone), seuil 16, nouvel essai après 2 h, 3 essais par jour, badge 12 mois (LIV-CER-*) ;
// - sept états du compte (LIV-03-R37) ; tout état non actif s'affiche avec motif écrit par la personne qui a décidé,
//   durée, ce qui reste possible et recours (une fois, 7 jours ; LIV-P32R-02, LIV-03-R51).
import type { EtatCompte, Francs, Instant, Origine, Resultat } from '../communs'

/** Les sept états du compte (machine serveur, LIV-03-R37) ; « en vérification » : tout est envoyé, attente du serveur. */
export type EtatDetaille = Exclude<EtatCompte, 'en_verification'>

// ---------- Activation (LIV-P02) ----------

export type IdPiece = 'cni_recto' | 'cni_verso' | 'selfie' | 'permis' | 'carte_grise' | 'vehicule' | 'assurance' | 'profil'
export type EtatPiece = 'a_envoyer' | 'en_verification' | 'verifiee' | 'rejetee'
export interface PieceKyc {
  id: IdPiece
  /** Prise de vue : carte (gabarit au format CNI), document, véhicule, visage ; le selfie est une courte vidéo. */
  gabarit: 'carte' | 'document' | 'vehicule' | 'visage'
  video: boolean
  etat: EtatPiece
  motif: string | null // pièce rejetée : le motif, en clair
  envoyeeLe: Instant | null
  verifieeLe: Instant | null
  revueHumaine: boolean // doute : revue humaine dans la console (ADM-P09)
  reponseAvant: Instant | null // en vérification : réponse attendue au plus tard
  expireLe: Instant | null // pièce datée (CNI, permis, assurance)
}
export type IdEtape = 'charte' | 'pieces_envoyees' | 'pieces_verifiees' | 'certification' | 'approbation'
export interface EtapeActivation {
  id: IdEtape
  etat: 'a_faire' | 'en_cours' | 'fait' | 'refuse'
}
export interface Charte {
  version: string // version en vigueur
  publieeLe: Instant
  accepteeLe: Instant | null // acceptation horodatée par le serveur
  versionAcceptee: string | null
  interdits: string[] // charte d'accès : interdits consolidés (LIV-RG-R249 à R260)
}
export interface Activation {
  etat: EtatDetaille
  prenom: string
  entreprise: { nom: string; active: boolean }
  zone: string
  vehicule: string
  inviteLe: Instant
  charte: Charte
  pieces: PieceKyc[]
  etapes: EtapeActivation[]
  certification: { reussie: boolean; modulesFaits: number; modulesTotal: number }
  approbation: { etat: 'attente' | 'approuvee'; le: Instant | null }
  activeLe: Instant | null
  regles: { verificationAutoMin: number; revueHumaineH: number; photoMaxKo: number; pieceAlerteJours: number }
}

// ---------- Certification (LIV-P03) ----------

export interface CarteModule {
  id: string
  lieu: string // étiquette de lieu de l'illustration (« Boutique », « Relais »…)
  icone: string
  titre: string
  consigne: string // une seule consigne par carte
  consequences: string[] // pour chaque acteur
}
export interface ModuleCertification {
  id: string
  numero: number
  titre: string
  minutes: number
  cartes: CarteModule[]
  etat: 'a_faire' | 'en_cours' | 'fait'
  carteVue: number // dernière carte lue (reprise)
  aRevoir: boolean // raté au dernier quiz ou lié à une sanction
}
export interface QuestionQuiz {
  id: string
  texte: string
  lieu: string
  icone: string
  reponses: string[] // trois réponses ; la bonne n'est connue que du serveur
}
export interface TentativeQuiz {
  id: string
  questions: QuestionQuiz[]
  commenceeA: Instant
  finA: Instant
}
export interface ResultatQuiz {
  tentativeId: string
  le: Instant
  bonnes: number
  sur: number
  reussi: boolean
  enAttenteDeValidation: boolean // passé hors connexion : validé par le serveur au retour du réseau
  ratees: { question: string; reponseDonnee: string | null; bonneReponse: string; explication: string; module: number }[]
}
export type RaisonQuizFerme = 'modules' | 'attente' | 'limite_jour' | 'certifie' | null
export interface Certification {
  etat: 'a_faire' | 'en_cours' | 'reussie' | 'echouee' | 'expiree' | 'a_recertifier'
  modules: ModuleCertification[]
  quiz: {
    questions: number
    minutes: number
    seuil: number
    ouvert: boolean
    raisonFerme: RaisonQuizFerme
    prochainEssaiA: Instant | null
    essaisRestantsJour: number
    essaisParJour: number
    delaiEssaiH: number
    enCours: TentativeQuiz | null
    dernier: ResultatQuiz | null
  }
  badge: { obtenuLe: Instant; expireLe: Instant } | null
  recertificationDes: Instant | null // la recertification s'ouvre à cette date (30 jours avant l'expiration)
  lectureVocale: boolean // mémorisé pour le livreur
}

// ---------- États du compte (LIV-P32) ----------

export interface Preuve {
  id: string
  libelle: string
  quand: Instant
}
export interface Decision {
  id: string
  niveau: 1 | 2 | 3 | 4 | null // null : décision non disciplinaire (pièce expirée, entreprise suspendue…)
  le: Instant
  examenHumain: boolean
  auteur: string // rôle de la personne qui a décidé (« Opérations de zone, BelivaY »)
  motif: string // écrit par la personne qui a décidé, toujours affiché
  finLe: Instant | null
  limites: { plafondColis: Francs | null; domicile: boolean; modulesARefaire: string[] } | null
  scoreGeleSous: number | null
  probationJours: number | null
  recours: { possibleJusqua: Instant | null; deposeLe: Instant | null; reponseAvant: Instant | null; reponse: string | null }
}
export interface EtatDuCompte {
  etat: EtatDetaille
  entreprise: { nom: string; fermeLe: Instant | null }
  decision: Decision | null // la décision qui a mis le compte dans cet état
  historique: Decision[] // décisions passées (avertissements compris)
  colisSousGarde: number
  dossier: Preuve[] // preuves versées au dossier sans que le livreur ait à les renvoyer (LIV-LIT-03)
  historiqueJours: number // historique consultable après un rattachement fermé
  recoursJours: number
  recoursMinCaracteres: number // le recours se motive comme une décision
}

export interface DomaineAcces {
  activation(): Promise<Activation>
  accepterCharte(version: string, origine: Origine): Promise<Resultat<object, 'version_perimee'>>
  /** Envoi d'une pièce photographiée par l'appareil photo de l'application (contrôles de qualité passés). */
  envoyerPiece(id: IdPiece, envoi: { octets: number; controles: boolean }, origine: Origine): Promise<Resultat<object, 'qualite' | 'trop_lourde' | 'deja_verifiee'>>
  certification(): Promise<Certification>
  lireCarte(moduleId: string, carte: number): Promise<void>
  terminerModule(moduleId: string, origine: Origine): Promise<Resultat<object, 'cartes_non_lues'>>
  reglerLectureVocale(active: boolean): Promise<void>
  commencerQuiz(origine: Origine): Promise<Resultat<{ tentative: TentativeQuiz }, 'modules' | 'attente' | 'limite_jour' | 'certifie'>>
  /** Réponses (indice choisi ou null) ; horsLigne : corrigé sur le téléphone, « en attente de validation ». */
  envoyerQuiz(tentativeId: string, reponses: (number | null)[], horsLigne: boolean, origine: Origine): Promise<Resultat<{ resultat: ResultatQuiz }, 'tentative_inconnue'>>
  etatDuCompte(): Promise<EtatDuCompte>
  faireAppel(decisionId: string, texte: string, preuves: string[], origine: Origine): Promise<Resultat<{ reponseAvant: Instant }, 'hors_delai' | 'deja_fait' | 'sans_recours' | 'texte_trop_court' | 'numero_interdit'>>
}
