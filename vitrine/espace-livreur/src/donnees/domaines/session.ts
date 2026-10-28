// Domaine « session » (LIV-03, LIV-P01) : qui est connecté sur ce téléphone, l'état de son compte, sa disponibilité, ce
// qu'il a sous sa garde et les compteurs de la coque. Règles (LIV-P01R-01 à R06, LIV-03-R01 à R11, LIV-RG-R35 à R40) :
// - le numéro vérifié (+237) est la seule clé de connexion ; code SMS à la première connexion, au changement d'appareil,
//   quand le PIN est oublié et après un blocage ; PIN à 6 chiffres ensuite (jamais en clair, jamais journalisé) ;
// - un appareil porte un seul compte livreur ; un compte n'a qu'un appareil connecté (bascule : l'ancien est
//   déconnecté, l'entreprise prévenue) ;
// - session rouverte par PIN toutes les 12 h ; 5 PIN faux : blocage 30 min puis code SMS obligatoire ;
// - après chaque ouverture, l'état du compte (me/state) décide de la suite : Aujourd'hui, activation ou état du compte.
// Les valeurs (essais, délais, longueurs) viennent du serveur (`regles`), jamais d'un écran.
import type { Disponibilite, EtatCompte, Instant, Origine, Resultat } from '../communs'

export interface Livreur {
  id: string
  prenom: string
  nom: string
  initiales: string
  entreprise: string // « Yafé Express »
  vehicule: string // « Moto »
  zone: string // « Z1 Centre-ville »
  photo: string | null // photo vérifiée (pièces) ; sans photo, les initiales
}

export interface SessionLivreur {
  connecte: boolean
  maintenant: Instant // heure du serveur
  livreur: Livreur | null
  etatCompte: EtatCompte
  disponibilite: Disponibilite
  colisSousGarde: number
  trustScore: number | null // null : pas encore de score (en activation)
  badges: { notifications: number; messages: number; tournee: number }
}

/** Écran d'après l'ouverture, lu dans l'état du compte (LIV-03-R04). */
export type Suite = 'aujourdhui' | 'activation' | 'compte'

/** Pourquoi un code SMS est demandé. */
export type MotifCode = 'premiere_connexion' | 'nouvel_appareil' | 'pin_oublie' | 'apres_blocage'

/** Règles de la connexion, servies par le serveur (configuration versionnée). */
export interface ReglesConnexion {
  pinLongueur: number
  codeLongueur: number
  pinEssais: number // PIN faux consécutifs avant blocage
  pinBlocageMin: number
  codeEssais: number // codes SMS faux avant annulation du code
  renvoiSecondes: number // délai entre deux envois de code
  envoisMax: number // envois de code par heure, ensuite le support
  sessionHeures: number // réouverture par PIN
  inactivitePreuveMin: number // inactivité sur une étape de preuve avant le PIN
}

/** Ce que l'écran de connexion montre : identité si une session existe sur le téléphone, sinon le numéro. */
export interface EcranConnexion {
  appareilLie: boolean // session chiffrée présente sur ce téléphone
  identite: {
    prenom: string
    initiales: string
    photo: string | null
    entreprise: string
    vehicule: string
    immatriculation: string | null
    zone: string
  } | null
  numeroMasque: string | null // « +237 6 77 •• •• 27 » (numéro vérifié du compte lié)
  biometrie: boolean // empreinte activée sur le téléphone pour ce compte
  pinCree: boolean
  sessionExpiree: boolean // plus de 12 h depuis la dernière ouverture
  pinEssaisRestants: number
  bloqueJusqua: Instant | null // PIN bloqué
  smsObligatoire: boolean // après un blocage : le code SMS d'abord
  code: CodeEnCours | null // code SMS envoyé, en attente
  bascule: Bascule | null // numéro saisi sur un nouveau téléphone alors qu'un autre est connecté
  regles: ReglesConnexion
}

export interface CodeEnCours {
  motif: MotifCode
  numeroMasque: string
  envoyeA: Instant
  renvoiPossibleA: Instant
  envoisRestants: number // dans l'heure
  essaisRestants: number
  verifie: boolean // code bon : reste à créer le PIN (premier, oubli) ou à le saisir
}

/** Changement de téléphone : trois conséquences annoncées avant la bascule (LIV-P01R-03, LIV-03-R10). */
export interface Bascule {
  ancienAppareil: string // « Tecno Spark 10 »
  ancienneSynchronisation: Instant | null // dernière synchronisation de l'ancien téléphone, connue du serveur
}

export type RefusPin = 'pin_faux' | 'bloque' | 'sms_obligatoire' | 'pas_de_session'
export type RefusNumero = 'numero_invalide' | 'sans_invitation' | 'autre_compte_sur_appareil' | 'refuse'

/** Page « Sécurité » (AJ-L) : le seul téléphone lié, les dernières ouvertures, l'empreinte, les règles du PIN. */
export interface Securite {
  appareil: { nom: string; lieLe: Instant; derniereSynchronisation: Instant | null }
  numeroMasque: string // « +237 6 77 •• •• 27 »
  biometrie: boolean
  pinChangeLe: Instant | null
  /** Dernières ouvertures et tentatives, du serveur (jamais un PIN ni un code). */
  connexions: { a: Instant; evenement: 'pin_ok' | 'biometrie_ok' | 'pin_faux' | 'blocage' | 'code_envoye' | 'pin_change' | 'verrouillage'; appareil: string }[]
  regles: ReglesConnexion
}

export interface DomaineSession {
  session(): Promise<SessionLivreur>
  ecranConnexion(): Promise<EcranConnexion>
  /** Première connexion ou nouveau téléphone : le numéro (+237, 9 chiffres) ; le code part si tout va bien. */
  saisirNumero(numero: string, origine: Origine): Promise<Resultat<{ bascule: boolean }, RefusNumero>>
  /** Bascule confirmée (après l'avertissement) : le code SMS part ; l'ancien téléphone sera déconnecté. */
  confirmerBascule(origine: Origine): Promise<Resultat<object, 'rien_a_confirmer'>>
  /** Code SMS sur le numéro vérifié (PIN oublié, après blocage) ou nouvel envoi du code en cours. */
  demanderCode(motif: MotifCode, origine: Origine): Promise<Resultat<{ renvoiPossibleA: Instant; envoisRestants: number }, 'trop_tot' | 'trop_d_envois' | 'pas_de_numero'>>
  verifierCode(code: string, origine: Origine): Promise<Resultat<{ suite: 'creer_pin' | 'saisir_pin' }, 'code_faux' | 'code_annule' | 'code_expire' | 'aucun_code'> & { essaisRestants?: number }>
  /** Nouveau PIN (première connexion, PIN oublié), après un code SMS vérifié. */
  creerPin(pin: string, origine: Origine): Promise<Resultat<{ suite: Suite }, 'pin_trop_simple' | 'code_requis'>>
  verifierPin(pin: string, origine: Origine): Promise<Resultat<{ suite: Suite }, RefusPin> & { essaisRestants?: number; debloqueA?: Instant }>
  /** Ouverture par l'empreinte du téléphone (si activée) : ne remplace jamais un code SMS. */
  deverrouillerBiometrie(origine: Origine): Promise<Resultat<{ suite: Suite }, 'indisponible' | 'sms_obligatoire' | 'bloque'>>
  /** Abandonner un code ou une bascule en cours (retour au PIN ou au numéro). */
  annulerCode(): Promise<void>
  /** Sécurité du compte (page « Sécurité ») : appareil lié, dernières connexions, empreinte. */
  securite(): Promise<Securite>
  /** Changer le PIN depuis l'application ouverte : l'ancien d'abord ; jamais un PIN trop simple. */
  changerPin(ancien: string, nouveau: string, origine: Origine): Promise<Resultat<object, 'pin_faux' | 'pin_trop_simple' | 'meme_pin' | 'bloque'> & { essaisRestants?: number }>
  /** Ouvrir l'application par l'empreinte du téléphone (jamais à la place d'un code SMS). */
  reglerBiometrie(active: boolean, origine: Origine): Promise<Resultat>
  /** Verrouiller (menu du profil) : la session se ferme, le téléphone reste lié ; le PIN est redemandé. */
  deconnecter(): Promise<void>
}
