// Types partagés par les domaines de la SourceAdmin (console d'administration BelivaY). Règles de fond :
// - montants en francs CFA entiers (Francs), calculés et figés par le serveur : la console les affiche, jamais ne les
//   invente ; instants en millisecondes (heure de Yaoundé à l'affichage), jours civils « AAAA-MM-JJ » ;
// - HUIT RÔLES de console (A-VALIDER A-01, Proposé ; ADM-01 § 11) : un agent peut en cumuler plusieurs (ADM-ROL-02),
//   il agit sous UN rôle à la fois (« Agir en tant que »), et chaque ligne du journal porte ce rôle ;
// - les droits sont contrôlés par la source (AccesRefuse, comme le 403 du serveur), jamais seulement masqués (ADM-ROL-01) ;
// - Opérations : limité à ses zones, exports compris (ADM-ROL-03) ; Finance ne voit pas le contenu des litiges, Support
//   ne voit pas les versements (ADM-ROL-04) ;
// - données personnelles masquées par défaut (logique-metier/visibilite-anonymat.json, loi n° 2024/017) : un démasquage
//   est motivé et journalisé (composants/Masque.tsx).
export type Francs = number
export type Instant = number
export type Jour = string

export type Role = 'superviseur' | 'finance' | 'support' | 'mediation' | 'operations' | 'verification' | 'audit' | 'terrain' | 'rh'
export const ROLES: Role[] = ['superviseur', 'finance', 'support', 'mediation', 'operations', 'verification', 'audit', 'terrain', 'rh']

/** Zone de Yaoundé (« Z3 ») : douze zones, quatre exploitées au lancement (ZONES-EXPLOITEES). */
export type CodeZone = string

/** Espace de l'écosystème BelivaY (les six interfaces). */
export type Espace = 'client' | 'vendeur' | 'relais' | 'entreprise' | 'livreur' | 'admin'

/** Résultat d'un geste : réussi, ou refusé avec une raison que l'écran met en mots. */
export type Resultat<T = object, R extends string = string> = ({ ok: true } & T) | { ok: false; raison: R; detail?: string }

/** Refus du serveur pour un rôle qui n'a pas ce droit (403 ROLE_FORBIDDEN, ADM-ROL-01). */
export class AccesRefuse extends Error {
  readonly roles: Role[]
  constructor(quoi: string, roles: Role[]) {
    super(`${quoi} : réservé à ${roles.join(', ')} (ROLE_FORBIDDEN)`)
    this.name = 'AccesRefuse'
    this.roles = roles
  }
}

/** Acteur tel qu'une ligne le montre (vendeur, relais, entreprise, livreur, client masqué). */
export interface ActeurCourt {
  id: string
  espace: Espace
  nom: string // « Tonton PG », « Relais Bastos Carrefour », « Client ••• 4217 »
  zone: CodeZone | null
}

/** Décision motivée : appliquée tout de suite, ou en attente d'un second validateur d'un autre compte (quatre yeux). */
export type EtatDecision = 'appliquee' | 'a_contresigner' | 'contresignee' | 'refusee'
