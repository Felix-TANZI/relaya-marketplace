// Libellés français des valeurs de la source (traduits par t() à l'affichage) : rôles de console et leur périmètre.
import type { Role } from '../donnees/communs'

export const NOM_ROLE: Record<Role, string> = {
  superviseur: 'Direction',
  finance: 'Finance',
  support: 'Support client',
  mediation: 'Médiation',
  operations: 'Opérations et logistique',
  verification: 'Vérification et modération',
  audit: 'Conformité et audit',
  terrain: 'Agent terrain',
  rh: 'Ressources humaines',
}

/** Périmètre d'un rôle, rappelé dans la pastille de l'en-tête (ADM-ROL-01) quand l'agent n'a pas de zones. */
export const PERIMETRE_ROLE: Record<Role, string> = {
  superviseur: 'tous périmètres',
  finance: 'argent',
  support: 'litiges niveau 1, messages',
  mediation: 'litiges niveau 2, recours',
  operations: 'ses zones',
  verification: 'identités, catalogue, avis',
  audit: 'lecture et journal',
  terrain: 'sa tournée',
  rh: 'employés de la console',
}

/** Ce que le rôle ne fait jamais (Profil, Rôles et accès). */
export const JAMAIS_ROLE: Record<Role, string> = {
  superviseur: 'Agir seul sur ce qui exige quatre yeux.',
  finance: 'Voir le contenu des litiges ; paramétrer seul.',
  support: 'Exécuter un versement ; valider une identité ; paramétrer.',
  mediation: 'Paramétrer ; exécuter un paiement.',
  operations: 'Voir d’autres zones ; toucher l’argent.',
  verification: 'Répondre au vendeur sur son litige ; toucher l’argent.',
  audit: 'Décider, modifier ou payer quoi que ce soit.',
  terrain: 'Valider une identité ; publier sans l’accord du vendeur.',
  rh: 'Décider sur un acteur des six espaces (litige, argent, identité) ; s’attribuer un rôle ; créer seul un compte Direction.',
}

/** Icône d'un rôle (Profil, Rôles et accès). */
export const ICONE_ROLE: Record<Role, string> = { superviseur: 'crown', finance: 'banknote', support: 'life-buoy', mediation: 'scale', operations: 'truck', verification: 'badge-check', audit: 'scroll-text', terrain: 'map-pinned', rh: 'users' }

/** Code du registre tel qu'affiché : aucun nom d'intermédiaire de paiement à l'écran (« PAY-CAMPAY-FRAIS » → « PAY-AGREG-FRAIS »). */
export const codeVu = (code: string) => code.replace(/CAMPAY|FAPSHI|CINETPAY|FLUTTERWAVE/g, 'AGREG')
