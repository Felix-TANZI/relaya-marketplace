// Domaine « session » (ENT-P01, en-tête) : qui est connecté (utilisateur nominatif et rôle), quelle entreprise (état
// du compte, pilote, palier et plafond), les compteurs de la coque ; la connexion (numéro +237 ou e-mail, mot de
// passe), le code SMS (propriétaire et comptable toujours, répartiteur sur un appareil nouveau : ENT-P01R-03), le
// blocage après plusieurs échecs, l'accès retiré (ENT-03-R05), le mot de passe oublié (code SMS), la première
// connexion sur invitation nominative à usage unique (ENT-P01R-01), le choix de l'espace pour un numéro à deux rôles
// (entreprise et point relais, ENT-PAR-06), la session expirée, la déconnexion.
// API (extraction 01, api) : POST /api/company/auth/login → {mfa_required, challenge_id} | {session} ;
// POST /auth/verify ; POST /auth/verify/resend (429 avant 60 s) ; POST /auth/password/forgot | reset ;
// GET · POST /auth/invitations/{token} ; GET /api/company/me (espaces). Durées et nombres lus dans le registre
// (duree_session, echecs_avant_blocage, duree_blocage, delai_renvoi_code_sms, ENT-CODE-SMS-LONGUEUR, MDP-LONG).
// Jamais de code secret Mobile Money demandé (ENT-ARG-08) ; aucun code donné par téléphone (ENT-03-R05).
import type { Instant, PalierEntreprise, Role } from '../communs'
import type { EtatCompte } from './compte'

export interface Utilisateur {
  id: string
  prenom: string
  nom: string
  initiales: string
  role: Role
}

export interface EntrepriseSession {
  id: string
  nom: string // « Yafé Express »
  etat: EtatCompte
  pilote: { jour: number; duree: number } | null // « jour 2 sur 30 » pendant le pilote
  palier: PalierEntreprise
  plafond: number | null // valeur transportée maximale (F) ; null : sans plafond (Or, assurance obligatoire)
  livreurs: number
  zones: number
  quartier: string // « Mokolo »
}

/** Compteurs de la coque (barre latérale, onglets, cloche). */
export interface Badges {
  paquets: number // paquets publiés à accepter
  missions: number // missions en cours
  incidents: number // incidents à valider
  litiges: number // litiges ouverts qui attendent une réponse
  pieces: number // pièces de livreurs envoyées, à contrôler par l'entreprise
  /** Demandes des livreurs qui attendent l'entreprise (DP-66) : départs ouverts et absences prévenues pas encore vues
   * (propriétaire et répartiteur ; facultatif : absent, aucun badge). */
  demandes?: number
  notifications: number
  messages: number
}

export interface SessionEntreprise {
  connecte: boolean
  utilisateur: Utilisateur | null
  entreprise: EntrepriseSession | null
  badges: Badges
  maintenant: Instant // heure du serveur à la lecture
  expire: Instant | null // fin de la session (12 h)
  /** La dernière session s'est fermée d'elle-même (durée de session atteinte) : la connexion le dit. */
  expiree?: boolean
}

/** Espace ouvert par un numéro (ENT-PAR-06 : une entreprise qui est aussi point relais a deux espaces). */
export interface EspaceAcces {
  espace: 'entreprise' | 'relais'
  nom: string // « Yafé Express », « Relais Mokolo · Agence Yafé Express »
}

export type ResultatConnexion =
  | { ok: true; code: false; espaces?: EspaceAcces[] }
  | { ok: true; code: true; defi: string; destination: string; renvoiDans: number } // code SMS demandé
  | { ok: false; raison: 'identifiants'; essaisRestants: number }
  | { ok: false; raison: 'bloque'; jusqua: Instant }
  | { ok: false; raison: 'retire' } // « Accès retiré par votre entreprise » (ENT-03-R05)

export type ResultatCode = { ok: true; espaces?: EspaceAcces[] } | { ok: false; raison: 'code_faux' | 'expire'; essaisRestants: number }
export type ResultatRenvoi = { ok: true; renvoiDans: number } | { ok: false; raison: 'trop_tot'; renvoiDans: number } | { ok: false; raison: 'support' }

/** Code SMS envoyé (mot de passe oublié, invitation) : défi, numéro masqué, attente avant renvoi. */
export interface EnvoiCode {
  defi: string
  destination: string // « +237 ••• •• 01 »
  renvoiDans: number
}

export type ResultatReinitialisation = { ok: true } | { ok: false; raison: 'code_faux' | 'expire'; essaisRestants: number } | { ok: false; raison: 'mot_de_passe' }

/** Invitation nominative à usage unique (lien reçu par SMS ou e-mail ; ENT-RG-R37 : aucun accès sans invitation). */
export interface InvitationAcces {
  jeton: string
  prenom: string
  nom: string
  role: Role
  entreprise: string
  telephone: string // masqué : « +237 ••• •• 02 »
  expireLe: Instant
  statut: 'valide' | 'expiree' | 'utilisee'
}

export interface DomaineSession {
  session(): Promise<SessionEntreprise>
  connecter(identifiant: string, motDePasse: string): Promise<ResultatConnexion>
  verifierCode(defi: string, code: string): Promise<ResultatCode>
  renvoyerCode(defi: string): Promise<ResultatRenvoi>
  /** Mot de passe oublié : un code SMS part vers le numéro du compte, s'il existe (la réponse ne le dit jamais). */
  oublie(identifiant: string): Promise<{ ok: true } & EnvoiCode>
  reinitialiser(defi: string, code: string, motDePasse: string): Promise<ResultatReinitialisation>
  invitation(jeton: string): Promise<InvitationAcces | null>
  /** Première connexion : le mot de passe est créé, puis un code SMS confirme le numéro (verifierCode ouvre la session). */
  creerAcces(jeton: string, motDePasse: string): Promise<({ ok: true } & EnvoiCode) | { ok: false; raison: 'expiree' | 'utilisee' | 'mot_de_passe' }>
  deconnecter(): Promise<void>
  /** Démonstration seulement : voir l'espace avec un autre rôle (« ?role=repartiteur »). */
  changerRole(role: Role): Promise<void>
}
