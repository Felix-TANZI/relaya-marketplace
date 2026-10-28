// Types partagés par les domaines de la SourceEntreprise. Règles de fond (DP-60, extraction ENT) :
// - montants en francs CFA entiers (Francs), calculés et figés par le serveur : l'écran les affiche, jamais ne les
//   invente ; instants en millisecondes (heure de Yaoundé à l'affichage), jours civils « AAAA-MM-JJ » ;
// - RÔLES internes (ENT-RG-R25, ENT-ACC-01) : propriétaire (tout), répartiteur (paquets, affectation, suivi,
//   incidents, flotte ; aucun montant détaillé, ni moyen de règlement ni contrat), comptable (règlements, relevés,
//   retenues, exports ; ni acceptation, ni affectation, ni réponse aux litiges), gérant (employeur délégué des livreurs,
//   DP-66, DP-67 : tout ce que fait le répartiteur, plus les décisions d'emploi — essai, avertissement, suspension,
//   fin de contrat, congés ; aucun montant détaillé). La source refuse ce qu'un rôle ne
//   peut pas faire (AccesRefuse, comme le 403 ROLE_FORBIDDEN du serveur) ; la coque masque ce qu'il ne peut pas ouvrir ;
// - DONNÉES DU CLIENT FINAL (GEN-01, contrat ENT-CT) : l'entreprise voit l'adresse de remise et le prénom utiles à la
//   course, jamais le total payé, le moyen de paiement ni l'historique du client (tests/squelette le vérifie).
export type Francs = number
export type Instant = number
export type Jour = string

export type Role = 'proprietaire' | 'gerant' | 'repartiteur' | 'comptable'
export const ROLES: Role[] = ['proprietaire', 'gerant', 'repartiteur', 'comptable']

/** Le gérant a tous les droits du répartiteur (exploitation), en plus des siens (décisions d'emploi). */
const HERITE: Partial<Record<Role, Role>> = { gerant: 'repartiteur' }
/** Vrai si le rôle a le droit réservé aux rôles `roles` (directement, ou par le rôle dont il hérite). */
export function rolePermis(role: Role, roles: readonly Role[]): boolean {
  return roles.includes(role) || (!!HERITE[role] && roles.includes(HERITE[role]!))
}
/** Montants détaillés (à verser, règlements, retenues) : propriétaire et comptable (ENT-P02R-03). */
export const voitMontants = (role: Role): boolean => role === 'proprietaire' || role === 'comptable'

/** Zone de Yaoundé (« Z3 ») : douze zones, quatre exploitées au lancement (ZONES-EXPLOITEES). */
export type CodeZone = string
/** Classe de tarification d'un colis (ENT-RG-R05) : S, M, L, XL, hors gabarit. */
export type ClasseColis = 'S' | 'M' | 'L' | 'XL' | 'HG'
/** Palier de l'entreprise (ENT-PLAFOND-*, ENT-SEUIL-*) : il fixe le plafond de valeur transportée. */
export type PalierEntreprise = 'Nouveau' | 'Confirme' | 'Or'

/** Résultat d'un geste : réussi, ou refusé avec une raison que l'écran met en mots. */
export type Resultat<T = object, R extends string = string> = ({ ok: true } & T) | { ok: false; raison: R; detail?: string }

/** Refus du serveur pour un rôle qui n'a pas ce droit (403 ROLE_FORBIDDEN, ENT-RG-R25). */
export class AccesRefuse extends Error {
  readonly roles: Role[]
  constructor(quoi: string, roles: Role[]) {
    super(`${quoi} : réservé à ${roles.join(', ')} (ROLE_FORBIDDEN)`)
    this.name = 'AccesRefuse'
    this.roles = roles
  }
}

/** Livreur tel qu'une ligne le montre (affectation, mission, colis). */
export interface LivreurCourt {
  id: string
  nom: string // « Junior T. »
  initiales: string
  vehicule: 'moto' | 'tricycle' | 'voiture' | 'camionnette' | 'velo'
}

/** Lieu d'une étape : boutique du vendeur, point relais, adresse de remise. */
export interface Lieu {
  type: 'boutique' | 'relais' | 'domicile' | 'stockage'
  nom: string
  zone: CodeZone
  quartier: string
}
