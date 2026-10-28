// Domaine « relais » (possédé par PR-10 Mon relais) : capacité déclarée (places, occupation, seuil de saturation),
// horaires structurés 7 jours + pause, équipe (PR-EQUIPE-MAX employés, ajout et retrait par code SMS au téléphone du
// gérant), appareils connectés, documents (KYC, jamais montrés), convention et annexes, formation (modules et quiz),
// préférences du compte, données personnelles, fin de convention.
// Le relais est un EXÉCUTANT DE TERRAIN (DP-66/67 appliquées au relais ; METHODE.md règle 3) : tout ce qui est
// contractuel passe par BelivaY. CAPACITÉ DÉCLARÉE (hausse ou baisse), HORAIRES DÉCLARÉS, NOM AFFICHÉ et REPÈRE (PAR-03),
// FIN DE CONVENTION sont des DEMANDES, appliquées après accord de BelivaY (ARL-120, ARL-121) ; une pièce se renvoie
// seulement quand BelivaY la demande, qu'elle est refusée ou bientôt expirée (ARL-124) ; les données personnelles se
// DEMANDENT (loi n° 2024/017). DP-20 : aucun réglage « refuser les encombrants ».
import type { ClasseColis, Instant, Origine, Photo, Resultat } from '../communs'
import type { Droit, Membre, StatutRelais } from './session'

export interface PlageJour {
  jour: number // 0 = lundi … 6 = dimanche
  ferme: boolean
  ouverture: string | null // « 08:00 »
  fermeture: string | null // « 19:00 »
  pause: { de: string; a: string } | null
}
export interface Horaires {
  semaine: PlageJour[]
  demandeEnCours: { semaine: PlageJour[]; le: Instant } | null
}
/** Demande de changement des places déclarées (CAP-01, CAP-02, PAL-04 ; ARL-120). */
export interface DemandeCapacite {
  places: number
  le: Instant
  sens: 'hausse' | 'baisse'
  /** hausse : vérifiée à une visite BelivaY, ou à distance au palier Confirmé dans la limite PR-PAL-CAPACITE-PCT ;
   * baisse : revue à distance par une personne. */
  verification: 'visite' | 'distance'
}
export interface Capacite {
  placesDeclarees: number
  /** Places occupées par les colis présents (les retours déposés ne comptent jamais, CAP-08). */
  occupees: number
  /** Retours déposés en ce moment (hors capacité). */
  retoursDeposes: number
  /** Places prises par un colis de chaque classe (RELAIS-PLACES : S 1, M 2, L 5). */
  placesParClasse: Record<ClasseColis, number>
  etageres: { etagere: 'A' | 'B' | 'C'; cases: number; places: number }[]
  /** Seuil de saturation (PR-SATURATION, %) : au-delà, le relais n'est plus proposé aux nouveaux clients (CAL-21). */
  seuilPct: number
  /** Hausse validée à distance au palier Confirmé, jusqu'à ce pourcentage (PR-PAL-CAPACITE-PCT) ; null sous ce palier. */
  hausseADistancePct: number | null
  demandeEnCours: DemandeCapacite | null
}
export type TypeDocument = 'identite' | 'activite' | 'numero_versement' | 'photos_relais' | 'visite' | 'niu'
export interface DocumentRelais {
  type: TypeDocument
  statut: 'valide' | 'en_verification' | 'refuse' | 'expire' | 'a_fournir'
  facultatif: boolean
  /** Ce que la pièce contient, sans rien d'identifiant (« CNI recto verso + selfie vidéo », « MTN ···· 8350 »). */
  detail: string
  verifieLe: Instant | null
  expireLe: Instant | null
  /** BelivaY demande une nouvelle pièce (motif écrit par une personne) : seul cas, avec le refus et l'expiration
   * proche, où le gérant renvoie une pièce. */
  demande: { motif: string; le: Instant } | null
  motifRefus: string | null
}
export interface ModuleFormation {
  id: string
  titre: string
  /** Ce que le module couvre (ARL-28 : le module 3 couvre la garde en espèces et le Mobile Money au comptoir). */
  resume: string
  obligatoire: boolean
  minutes: number
  /** « a_revoir » : rouvert par une mise à jour des règles (FOR-03). */
  statut: 'a_faire' | 'en_cours' | 'termine' | 'a_revoir'
  score: number | null
  termineLe: Instant | null
}
/** Contenu d'un module : leçons à lire jusqu'au bout, puis quiz (FOR-02) ; les bonnes réponses restent au serveur. */
/** Un texte du serveur avec ses valeurs (« Préavis de {j} jours ») : traduit par modèle, valeurs insérées ensuite. */
export interface TexteRegle {
  texte: string
  valeurs?: Record<string, string | number>
}
export interface ContenuModule {
  id: string
  lecons: ({ titre: string } & TexteRegle)[]
  questions: { id: string; texte: string; choix: string[] }[]
  seuilPct: number // PR-FORMATION-QUIZ-PCT
}
export interface Appareil {
  id: string
  nom: string
  membre: string // initiales
  membreId: string
  dernierAcces: Instant
  ceAppareil: boolean
}
/** Ce que le relais a déclaré et ce que BelivaY a vérifié avant l'ouverture (annexe 3, PR-CT04). */
export interface FicheOuverture {
  remplieLe: Instant
  agent: string // prénom et initiale de l'agent BelivaY
  emplacements: { code: 'A' | 'B' | 'C' | 'R'; places: number | null; verifie: boolean }[]
  local: { abri: boolean; horsDeVue: boolean; photos: boolean }
  etapes: { id: string; titre: string; le: Instant }[]
  ouvertLe: Instant
  fondateur: { numero: number; sur: number; exclusiviteM: number; exclusiviteJusquau: Instant | null } | null
  grille: 'standard' | 'accord_particulier'
}
export interface Contrat {
  convention: { version: string; du: Instant; signeeLe: Instant; signataire: string; articles: { numero: number; titre: string; points: TexteRegle[] }[] }
  annexes: { id: 'annexe1' | 'annexe2' | 'annexe3'; titre: string; points: TexteRegle[] }[]
  fiche: FicheOuverture
}
export interface FicheRelais {
  id: string
  nom: string
  quartier: string
  zone: string
  ville: string
  repere: string
  /** Code de la zone BelivaY du relais (« Z1 ») : les douze zones de Yaoundé (logique-metier/livraison/zones-yaounde.geo.json). */
  zoneCode: string
  /** Position du relais relevée à la visite d'ouverture (annexe 3) : montrée aux clients sur la carte ; null tant que
   * la visite ne l'a pas relevée (le serveur ne l'invente jamais). */
  position: { lat: number; lng: number } | null
  statut: StatutRelais
  ouvertLe: Instant
  fondateur: boolean
  verifie: boolean
  capacite: Capacite
  horaires: Horaires
  equipe: Membre[]
  equipeMax: number
  documents: DocumentRelais[]
  formation: Record<string, ModuleFormation[]> // par membre
  formationModules: number // PR-FORMATION-MODULES
  /** Préférences du compte gardées par le serveur. L'heure du résumé du matin se règle dans les notifications de
   * chaque membre (domaine « notifications », ARL-100), seule source. */
  parametres: { langue: 'fr' | 'en' }
  appareils: Appareil[]
  /** Nom affiché et repère : changement demandé, validé par BelivaY (PAR-03). */
  ficheDemandee: { nom: string; repere: string; motif: string; le: Instant } | null
  /** Demande de ses données (loi n° 2024/017), prête au plus tard à `pretLe`. */
  donneesDemandees: { le: Instant; pretLe: Instant } | null
  /** Fin de convention demandée : BelivaY la prononce à `effetLe` (ARL-26) ; annulable tant qu'elle n'est pas prononcée. */
  fin: { demandeeLe: Instant; effetLe: Instant; sansColisDes: Instant; motif: string } | null
  /** Règles du serveur citées par les écrans (jamais écrites dans le code). */
  regles: {
    finPreavisJours: number
    finSansColisJours: number
    documentAlerteJours: number
    preuvesJours: number
    donneesDelaiJours: number
    invitationHeures: number
    codeSmsMinutes: number
    heuresCalmes: { de: number; a: number }
    grillePreavisJours: number // PR-GRILLE-PREAVIS-J : évolution annoncée avant, jamais rétroactive
    pinLongueur: number // PIN-LONGUEUR
  }
}

export type RefusRelais = 'droit_refuse' | 'equipe_complete' | 'code_faux' | 'introuvable' | 'invalide' | 'deja_demandee' | 'sous_occupees' | 'identique' | 'pin_faux' | 'pin_trop_simple' | 'bloque' | 'aucune_demande' | 'non_demandee'

export interface DomaineRelais {
  relais(): Promise<FicheRelais>
  /** Places déclarées : DEMANDE de hausse ou de baisse (jamais sous les places occupées, CAP-01), validée par BelivaY. */
  demanderCapacite(placesDeclarees: number, o: Origine): Promise<Resultat<{ verification: DemandeCapacite['verification'] }, RefusRelais>>
  annulerDemandeCapacite(o: Origine): Promise<Resultat<object, RefusRelais>>
  /** Horaires déclarés : demande à BelivaY (contractuel), appliquée après accord. */
  demanderHoraires(semaine: PlageJour[], o: Origine): Promise<Resultat<object, RefusRelais>>
  annulerDemandeHoraires(o: Origine): Promise<Resultat<object, RefusRelais>>
  /** Code SMS envoyé au téléphone du gérant avant d'ajouter ou de retirer un accès. */
  demanderCodeEquipe(o: Origine): Promise<Resultat<{ expireA: Instant }, RefusRelais>>
  ajouterEmploye(e: { prenom: string; nom: string; telephone: string; droits: Droit[] }, codeSms: string, o: Origine): Promise<Resultat<{ id: string }, RefusRelais>>
  /** Retrait immédiat : sa session tombe, ses appareils sont déliés (EQU-03). */
  retirerEmploye(id: string, codeSms: string, o: Origine): Promise<Resultat<object, RefusRelais>>
  reglerDroits(id: string, droits: Droit[], o: Origine): Promise<Resultat<object, RefusRelais>>
  /** Le gérant réinitialise le PIN d'un employé (EQU-04) : SMS de création d'un nouveau PIN à l'employé. */
  reinitialiserPin(id: string, o: Origine): Promise<Resultat<object, RefusRelais>>
  module(id: string): Promise<ContenuModule | null>
  /** Réponses du quiz : le serveur corrige ; le module compte seulement réussi au seuil (FOR-02). */
  repondreQuiz(membreId: string, module: string, reponses: number[], o: Origine): Promise<Resultat<{ score: number; reussi: boolean; fausses: string[] }, RefusRelais>>
  reglerParametres(p: Partial<FicheRelais['parametres']>, o: Origine): Promise<Resultat<object, RefusRelais>>
  deconnecterAppareil(id: string, o: Origine): Promise<Resultat<object, RefusRelais>>
  /** Pièce renvoyée (photo) : seulement demandée, refusée, à fournir ou bientôt expirée (ARL-124). */
  envoyerDocument(type: TypeDocument, photo: Photo, o: Origine): Promise<Resultat<object, RefusRelais>>
  contrat(): Promise<Contrat>
  /** Nom affiché et repère : demande à BelivaY (PAR-03). */
  demanderModificationFiche(f: { nom: string; repere: string; motif: string }, o: Origine): Promise<Resultat<object, RefusRelais>>
  /** PIN personnel du membre connecté (PIN-LONGUEUR chiffres, codes trop simples refusés, INV-02). */
  changerPin(ancien: string, nouveau: string, o: Origine): Promise<Resultat<object, RefusRelais>>
  /** Demande de ses données (loi n° 2024/017) : export préparé par BelivaY. */
  demanderDonnees(o: Origine): Promise<Resultat<{ pretLe: Instant }, RefusRelais>>
  /** Fin de convention : demande ; BelivaY la prononce à l'échéance du préavis PR-FIN-PREAVIS-J (ARL-26). */
  demanderFin(motif: string, o: Origine): Promise<Resultat<{ effetLe: Instant }, RefusRelais>>
  annulerFin(o: Origine): Promise<Resultat<object, RefusRelais>>
  /** Photo de profil du membre connecté (image carrée déjà recadrée, JPEG) ; null la retire. Visible de l'équipe et
   * de BelivaY seulement, jamais des clients (anonymat GEN-01 inversé : le client ne voit pas le gérant). */
  changerPhoto(photo: string | null, o: Origine): Promise<Resultat<object, RefusRelais>>
  /** DÉMONSTRATION : BelivaY accepte la demande en cours (horaires ou places) — en production, la console décide. */
  simulerAccord(objet: 'horaires' | 'capacite'): Promise<void>
}
