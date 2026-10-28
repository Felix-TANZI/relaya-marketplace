// Domaine « messages » (possédé par PR-08 Communication). Règles : MSG-01 à MSG-06, GEN-08, AID-03, LIT-08, ARL-40,
// PR-RC-25, PR-RC-29, DP-12, DP-61.
// - Le relais n'écrit qu'à BelivaY (MSG-01, GEN-08) : trois sortes de fils — Support BelivaY (et une demande du
//   formulaire d'aide par fil, AID-03), un fil par DOSSIER de constat (créé à l'ouverture, fermé à la clôture définitive
//   après le délai de recours, lisible PR-PREUVES-CONSERV-J jours : MSG-03, ARL-40), « Collectes et livraisons »
//   (messages automatiques officiels, réponses rapides seulement : MSG-06).
// - Aucune donnée personnelle ne circule (MSG-01) : le serveur masque tout numéro de téléphone ou adresse e-mail écrit
//   dans un message (REF-D01.A64) ; jamais un nom, un numéro ni une adresse d'un client ou d'un vendeur.
// - Messages conservés comme preuves, jamais supprimables par le relais (MSG-02) ; photos compressées (PHOTO-MAX-KO),
//   envoi différé hors connexion (MSG-04).
// - « Rappelez-moi » demande un rappel téléphonique du support pendant ses heures (SUP-HORAIRES, DP-12 : 7 h – 21 h,
//   7 j/7) ; hors de ces heures, le rappel est programmé à l'ouverture (MSG-06).
// - Appel MASQUÉ (DP-61, PR-RC-25) : avec le livreur pendant sa mission au relais (lot en approche ou arrivé, jusqu'à la
//   confirmation du dépôt), avec le support pendant ses heures ; jamais le vrai numéro ; journal des appels sans contenu
//   (durée, heure) pour l'administrateur. Le relais n'appelle jamais un client (le client l'appelle pendant son retrait).
import type { Instant, Origine, Photo, Resultat } from '../communs'
import type { EtapeDossier } from './incidents'
import type { Texte } from './notifications'

export type TypeFil = 'support' | 'dossier' | 'logistique'

export interface Message {
  id: string
  auteur: 'relais' | 'belivay' | 'systeme'
  /** Initiales du membre qui a écrit (« RM ») ; « Support BelivaY » ; null pour un message automatique. */
  signe: string | null
  /** Texte écrit par une personne (dans sa langue) ; un message automatique porte son modèle dans les deux langues. */
  texte: string
  modele: Texte | null
  pieces: Photo[]
  le: Instant
  /** Message du relais : lu par BelivaY (« lu »). */
  lu: boolean
  /** Le serveur a masqué un numéro ou une adresse e-mail écrits dans ce message (MSG-01). */
  masque: boolean
  /** Message de BelivaY qui demande une photo (dossier) : ce qu'il faut photographier. */
  photoDemandee: Texte | null
}

/** Dossier de constat lié au fil (LIT-08 : Constat, Vendeur 48 h, Médiation, Décision, Recours). Le fil d'un dossier
 * vit dans le dossier (domaine « incidents », ARL-95) : la Messagerie le montre dans sa liste et l'ouvre sur la page
 * `dossier-litige?id=` ; écrire dans ce fil passe par incidents.ecrire. */
export interface DossierFil {
  id: string // « CS-2207 »
  colis: string // « BLV-00043-1 »
  motif: Texte // « Abîmé »
  etape: EtapeDossier
}

export interface Fil {
  id: string
  type: TypeFil
  titre: Texte
  /** Ligne sous le titre : motif et référence (dossier), « Réponse moyenne : 12 min » (support), « officiel ». */
  objet: string | null // colis ou constat concerné
  dossier: DossierFil | null
  /** Ouvert, ou fermé (lecture seule) depuis `fermeLe` ; lisible jusqu'à `lisibleJusqua` (MSG-02, ARL-40). */
  ouvert: boolean
  fermeLe: Instant | null
  lisibleJusqua: Instant | null
  messages: Message[]
  nonLus: number
  /** Réponses rapides proposées (pastilles) ; seule façon d'écrire dans le fil logistique (MSG-06). */
  reponsesRapides: Texte[]
  /** Saisie libre permise (faux : fil logistique). */
  saisieLibre: boolean
  /** Une photo est demandée et pas encore envoyée (critère 1 : prise et envoyée depuis le fil). */
  photoDemandee: Texte | null
}

export interface Support {
  /** « 7 h – 21 h, 7 j/7 » (SUP-HORAIRES, DP-12). */
  horaires: Texte
  ouvertMaintenant: boolean
  /** Prochaine ouverture quand il est fermé. */
  ouvreA: Instant | null
  /** Engagement de première réponse (SUP-DELAI, en heures) et moyenne constatée sur 7 jours (MSG-05). */
  delaiH: number
  moyenneMin: number | null
  /** Rappel déjà demandé et pas encore fait : avant cette heure. */
  rappelAvant: Instant | null
}

/** Qui le relais peut appeler à cet instant, en numéro masqué (DP-61). */
export interface Joignable {
  cible: 'livreur' | 'support'
  /** Livreur : « Serge A. · Yafé Express » ; support : « Support BelivaY ». */
  nom: string
  /** Pourquoi c'est ouvert (« Lot PQ-Z1-261013-003 en approche · arrivée vers 15 h 15 »). */
  motif: Texte
  ouvert: boolean
  /** Fermé : pourquoi (« Le support répond de 7 h à 21 h », « Aucun livreur en mission vers le relais »). */
  ferme: Texte | null
  mission: string | null
}

export interface Appel {
  id: string
  cible: 'livreur' | 'support'
  nom: string
  mission: string | null
  debut: Instant
  /** null tant que l'appel est en cours. */
  dureeS: number | null
  par: string // initiales du membre
}

export interface DemandeSupport {
  categorie: 'reception' | 'retrait' | 'stock' | 'argent' | 'application' | 'autre'
  reference: string | null
  texte: string
  pieces: Photo[]
}

export type RefusEnvoi = 'introuvable' | 'vide' | 'ferme' | 'reponses_rapides_seulement' | 'reserve_au_gerant' | 'reference_invalide'

export interface DomaineMessages {
  fils(): Promise<Fil[]>
  /** Ouvre un fil : ses messages sont marqués lus. */
  fil(id: string): Promise<Fil | null>
  envoyer(filId: string, texte: string, pieces: Photo[], o: Origine): Promise<Resultat<{ id: string }, RefusEnvoi>>
  /** Réponse rapide (pastille) : seule écriture du fil logistique ; « Rappelez-moi » demande un rappel. */
  repondreVite(filId: string, reponse: number, o: Origine): Promise<Resultat<{ id: string; rappelAvant?: Instant }, RefusEnvoi | 'deja_demande'>>
  /** Formulaire « Écrire au support » : crée un fil Support, visible tout de suite dans la Messagerie (AID-03). */
  ecrireAuSupport(d: DemandeSupport, o: Origine): Promise<Resultat<{ filId: string }, RefusEnvoi>>
  support(): Promise<Support>
  demanderRappel(motif: string, o: Origine): Promise<Resultat<{ rappelAvant: Instant; programme: boolean }, 'deja_demande'>>
  /** Appel masqué (DP-61) : qui est joignable maintenant, les derniers appels, appeler, raccrocher. */
  joignables(): Promise<Joignable[]>
  appels(): Promise<Appel[]>
  appeler(cible: 'livreur' | 'support', o: Origine): Promise<Resultat<{ appel: Appel }, 'ferme' | 'deja_en_cours'>>
  raccrocher(appelId: string, o: Origine): Promise<Resultat<{ appel: Appel }, 'introuvable'>>
}
