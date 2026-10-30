// Domaine « paramètres » (ENT-P24) et profil de l'utilisateur connecté (Menu, ENT-00).
// - Utilisateurs internes : acces_internes_max accès nominatifs, aucun compte partagé (ENT-ACC-01) ; invitation d'un
//   répartiteur ou d'un comptable (403 pour un propriétaire, 409 ACCESS_LIMIT au-delà) ; retrait immédiat, sessions
//   révoquées (ENT-P24R-04). Seul le propriétaire modifie les utilisateurs, le moyen de règlement et le point de
//   stockage ; chaque modification est journalisée avec son auteur (ENT-P24R-03, ENT-UIX-08, DED-17).
// - Sécurité, chacun pour soi : mot de passe, code SMS (toujours pour le propriétaire et le comptable : ENT-P01R-03),
//   session de duree_session heures, appareils connectés.
// - Mes notifications : zones suivies, matrice type × canal ; litige et versement refusé verrouillés (ENT-P23R-02) ;
//   confort DP-61 (DED-33) : résumé quotidien par e-mail, plage calme ; aucun réglage ne masque une alerte obligatoire.
// - Point de stockage de nuit déclaré, visitable par BelivaY (ENT-P24R-01). Suppression du compte : par résiliation
//   du contrat (préavis), jamais par un bouton (ENT-P24R-02). Données personnelles (loi n° 2024/017, DED-31) : export
//   avec code SMS ; effacement qui épargne preuves (180 jours) et comptabilité (10 ans).
// API : GET · POST · DELETE /api/company/users ; PUT /api/company/settings, /notification-preferences ; /me/*.
import type { CodeZone, Instant, Resultat, Role } from '../communs'
import type { Canal, TypeAlerte } from '../../calculs/ent08'

export interface UtilisateurInterne {
  id: string
  nom: string
  role: Role
  telephone: string // masqué sauf pour soi : « +237 6 77 ·· ·· 02 »
  email: string
  derniereConnexion: Instant | null
  codeSms: boolean
  statut: 'actif' | 'invite' | 'retire'
  moi: boolean
}

export interface Appareil {
  id: string
  nom: string // « Chrome · Windows »
  lieu: string // « Yaoundé »
  vuLe: Instant
  actuel: boolean
}

export interface PreferencesNotifications {
  zones: CodeZone[]
  matrice: Record<TypeAlerte, Canal[]>
  resumeQuotidien: boolean
  plageCalme: { de: number; a: number } | null // heures ; jamais pour une alerte verrouillée
}

export interface ReglagesEntreprise {
  pointStockage: { adresse: string; consignes: string; modifieLe: Instant; par: string }
  accesMax: number
  zonesExploitees: { code: CodeZone; nom: string }[]
  journal: { le: Instant; par: string; quoi: string }[]
}

export type RefusParametres = 'nom' | 'telephone' | 'email' | 'role' | 'limite' | 'soi' | 'mot_de_passe' | 'faible' | 'code' | 'adresse' | 'doublon' | 'plage'

export interface DomaineParametres {
  utilisateurs(): Promise<UtilisateurInterne[]>
  inviter(p: { nom: string; telephone: string; email: string; role: Role }): Promise<Resultat<object, RefusParametres>>
  retirer(id: string): Promise<Resultat<object, RefusParametres>>
  reglages(): Promise<ReglagesEntreprise>
  modifierStockage(adresse: string, consignes: string): Promise<Resultat<object, RefusParametres>>
  appareils(): Promise<Appareil[]>
  deconnecterAppareil(id: string): Promise<void>
  changerMotDePasse(actuel: string, nouveau: string): Promise<Resultat<object, RefusParametres>>
  notifications(): Promise<PreferencesNotifications>
  reglerNotifications(p: PreferencesNotifications): Promise<Resultat<object, RefusParametres>>
  /** Export de mes données : code SMS d'abord (DED-31). */
  demanderExport(): Promise<{ defi: string; codeDemo: string | null }>
  exporter(defi: string, code: string): Promise<Resultat<{ nom: string; contenu: string }, RefusParametres>>
}
