// Domaine « acces » (possédé par PR-03 Accès) : invitation d'un membre (INV-01 à INV-07), candidature « Devenir point
// relais » (INS-01 à INS-07, CT01 R05, ARL-18/30/34/35, DP-09), activation en 6 étapes (ACT-01 à ACT-03, PR03-R07),
// statut du relais (STA-01 à STA-06, PR-RC-10, PR-RC-28). DP-66 et DP-67 appliquées au relais : le contractuel
// (convention, suspension, fin) passe par BelivaY ; le gérant VOIT ou DEMANDE (contester une fois, demander la fin et
// l'annuler tant qu'elle n'est pas prononcée), il ne décide jamais.
// Données du candidat : les siennes (gérant, commerce) ; jamais un client ni un vendeur (GEN-01).
import type { Instant, Origine, Photo, Resultat } from '../communs'
import type { Droit, Role, StatutRelais } from './session'

// ---------- Invitation d'un membre ----------

export interface Invitation {
  relais: string // « Relais Bastos Carrefour »
  quartier: string
  /** Qui invite : prénom et initiale (« Rose M. »). */
  invitePar: string
  prenom: string
  role: Role
  /** Ce que le gérant lui donne (DRO-03) : recevoir, remettre… ; jamais l'argent ni la gestion. */
  droits: Droit[]
  expireLe: Instant
  /** valide ; expiree (lien de plus de PR-INVITATION-H) ; utilisee (PIN déjà créé) ; retiree (accès retiré par le gérant). */
  etat: 'valide' | 'expiree' | 'utilisee' | 'retiree'
  /** Une nouvelle invitation a déjà été demandée au gérant (lien expiré). */
  redemandeeLe: Instant | null
}

/** Module de formation tel que le membre le voit (le programme vient de « Mon relais », PR-10). */
export interface ModuleVu {
  id: string
  titre: string
  minutes: number
  obligatoire: boolean
  statut: 'a_faire' | 'en_cours' | 'termine'
}
export interface FormationMembre {
  modules: ModuleVu[]
  obligatoires: number // PR-FORMATION-MODULES
  faits: number
  /** Les modules obligatoires sont faits : première remise permise (DRO-01, INV-03). */
  terminee: boolean
}

export type RefusInvitation = 'expiree' | 'pin_trop_simple' | 'deja_utilisee' | 'retiree' | 'equipe_complete'

// ---------- Candidature ----------

export type TypeCommerce = 'boutique' | 'pharmacie' | 'papeterie' | 'salon' | 'station' | 'autre'
export type Operateur = 'mtn' | 'orange'
export type PieceCandidat = 'cni_recto' | 'cni_verso' | 'selfie_video' | 'facade' | 'rangement' | 'comptoir'

/** Quartier proposé au candidat : sa zone, exploitée au lancement ou non (DP-09), et s'il reste une place de relais
 * dans la zone (RELAIS-PAR-ZONE) ; sinon la demande va en liste d'attente (INS-05). */
export interface QuartierCandidat {
  quartier: string
  zone: string | null
  exploitee: boolean
  placeLibre: boolean
}

export interface Brouillon {
  etape: 1 | 2 | 3 | 4 | 5
  commerce: { nom: string; type: TypeCommerce | null; quartier: string; repere: string; position: { lat: number; lng: number; plusCode: string } | null }
  gerant: { nom: string; telephone: string; niu: string }
  local: { placesEstimees: string; horaires: string }
  versement: { operateur: Operateur | null; numero: string; verifie: boolean }
  convention: { acceptee: boolean; signature: string | null }
  /** Pièces envoyées depuis ce téléphone (photos et selfie vidéo : identifiants, jamais montrés ailleurs). */
  pieces: Partial<Record<PieceCandidat, Photo>>
}

export interface EtapeSuivi {
  etape: 'envoyee' | 'appel' | 'visite' | 'formation' | 'ouverture'
  etat: 'faite' | 'en_cours' | 'a_venir'
  le: Instant | null
}
export interface Candidature {
  reference: string
  envoyeeLe: Instant
  commerce: string
  quartier: string
  zone: string | null
  /** en_etude : dossier dans la file de la console ; liste_attente : hors zone ou zone déjà pourvue (INS-05). */
  etat: 'en_etude' | 'liste_attente' | 'refusee'
  /** Appel d'un agent au plus tard (PR-APPEL-CANDIDAT-H). */
  appelAvant: Instant
  /** Pièces d'identité : vérification automatique, sinon revue humaine (ARL-18 : comme le vendeur, VD-KYC-DELAIS). */
  identite: 'en_verification' | 'verifiee' | 'a_refaire'
  suivi: EtapeSuivi[]
}

export type RefusCandidature = 'deja_candidat' | 'incomplet' | 'versement_non_verifie' | 'convention_non_signee'
export type RefusVersement = 'prefixe' | 'numero_invalide' | 'trop_tot' | 'code_faux' | 'expire'

// ---------- Activation ----------

/** Les 6 étapes d'activation (ACT-01, PR03-R07) dans l'ordre du prototype. */
export type EtapeActivation = 'dossier' | 'numero_versement' | 'convention' | 'visite' | 'formation' | 'capacite_horaires'
export interface EtapeActivationVue {
  etape: EtapeActivation
  etat: 'a_faire' | 'en_verification' | 'validee' | 'refusee'
  /** Validée le (ou prévue le, pour la visite). */
  le: Instant | null
  /** Motif écrit par une personne (pièce refusée). */
  motif: string | null
  /** Formation : modules faits / obligatoires. */
  progression: { faits: number; total: number } | null
}
export interface Activation {
  statut: StatutRelais
  relais: string
  quartier: string
  ouvertLe: Instant | null
  etapes: EtapeActivationVue[]
  /** Visite de BelivaY prévue (contrôle du local + séance pratique). */
  visiteLe: Instant | null
  /** Partenaire fondateur (PR-FONDATEURS premiers relais activés) : numéro, exclusivité jusqu'au… (ARL-21). */
  fondateur: { numero: number; exclusiviteJusqua: Instant } | null
  convention: { version: string; signeeLe: Instant | null }
}

// ---------- Statut ----------

/** Décision écrite par une personne de BelivaY (sanction des niveaux 2 à 4, STA-05, TRU-06). */
export interface Decision {
  id: string
  niveau: 1 | 2 | 3 | 4
  le: Instant
  /** Fin prévue (suspension à durée fixe) ; null : jusqu'à nouvelle décision. */
  jusquA: Instant | null
  motif: string
  /** Une contestation au plus par décision (PR-CONTEST-H) ; réponse sous… heures ouvrées. */
  contestation: { le: Instant; texte: string; reponseAvant: Instant; etat: 'en_cours' | 'maintenue' | 'levee'; reponse: string | null } | null
  contestable: boolean
}
export interface StatutDetail {
  statut: StatutRelais
  depuis: Instant
  /** Motif écrit par une personne (suspension, fermeture), jamais automatique. */
  motif: string | null
  /** Décision en cours (suspension…) et historique des décisions (STA-05 : restent visibles). */
  decision: Decision | null
  decisions: Decision[]
  /** Colis encore en stock au relais (ce qui se passe pour eux dépend du statut). */
  colisEnStock: number
  /** Fin de convention demandée : prononcée par BelivaY à l'échéance du préavis (ARL-26, PR-RC-28). */
  finDemandee: { le: Instant; effetLe: Instant; sansNouveauxColisDes: Instant; motif: string | null; annulable: boolean } | null
}

/** Motif d'une demande de fin (liste courte, DP-67 appliquée au relais) ; la demande part par relais.demanderFin (PR-10). */
export type MotifFin = 'activite' | 'local' | 'sante' | 'remuneration' | 'demenagement' | 'autre'

export interface DomaineAcces {
  invitation(jeton: string): Promise<Invitation | null>
  /** PIN personnel créé : le membre est connecté sur cet appareil (code SMS du lien = double vérification). */
  accepterInvitation(jeton: string, pin: string, o: Origine): Promise<Resultat<object, RefusInvitation>>
  /** Lien expiré : une nouvelle invitation est demandée au gérant (INV-01, critère 1). */
  redemanderInvitation(jeton: string, o: Origine): Promise<Resultat<object, 'introuvable'>>
  /** Formation du membre connecté (DRO-01). */
  formation(): Promise<FormationMembre>

  quartiers(): Promise<QuartierCandidat[]>
  brouillon(): Promise<Brouillon | null>
  enregistrerBrouillon(b: Brouillon): Promise<void>
  /** Numéro de versement : préfixe vérifié selon l'opérateur avant l'envoi du code (INS-03, PR03-R06). */
  envoyerCodeVersement(operateur: Operateur, numero: string, o: Origine): Promise<Resultat<{ expireA: Instant }, RefusVersement>>
  verifierCodeVersement(code: string, o: Origine): Promise<Resultat<object, RefusVersement>>
  /** Crée un relais « candidat » visible en console (PR03-R06) ; hors zone ou zone pourvue : liste d'attente. */
  candidater(b: Brouillon, o: Origine): Promise<Resultat<{ reference: string }, RefusCandidature>>
  /** Candidature envoyée depuis ce téléphone. */
  candidature(): Promise<Candidature | null>
  /** Programme de la formation (visible avant l'ouverture de l'espace). */
  programme(): Promise<ModuleVu[]>

  activation(): Promise<Activation>
  statut(): Promise<StatutDetail>
  /** Contester une décision, une fois (STA-03) : réponse d'une personne sous PR-CONTEST-H heures ouvrées. */
  contester(decision: string, texte: string, o: Origine): Promise<Resultat<{ reponseAvant: Instant }, 'deja_contestee' | 'non_contestable' | 'introuvable' | 'droit_refuse'>>
  /** Annuler la demande de fin tant qu'elle n'est pas prononcée (DELETE /api/relay/account/closure ; DP-67). La
   * demande elle-même part par relais.demanderFin (PR-10, Paramètres › Clôturer), aussi ouverte depuis Statut du relais. */
  annulerFin(o: Origine): Promise<Resultat<object, 'aucune' | 'deja_prononcee' | 'droit_refuse'>>
}
