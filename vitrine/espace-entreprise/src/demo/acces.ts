// DONNÉES DE DÉMONSTRATION — droits des rôles côté « serveur » (ENT-RG-R25) : un geste ou une lecture refusés à un
// rôle lèvent AccesRefuse (403 ROLE_FORBIDDEN), comme le serveur ; l'écran le dit (composants/Garde.tsx).
import { AccesRefuse, rolePermis, voitMontants, type Role } from '../donnees/communs'
import { UTILISATEURS } from './jeu-essai'
import { magasin } from './stockage'

export interface EtatSession {
  connecte: boolean
  utilisateurId: string
  echecs: number
  bloqueJusqua: number | null
  defi: { id: string; code: string; essais: number; envoyeLe: number; renvois: number; utilisateurId: string } | null
}
export const sessionDemo = magasin<EtatSession>('session', () => ({ connecte: true, utilisateurId: 'u-gaelle', echecs: 0, bloqueJusqua: null, defi: null }))

export function roleCourant(): Role {
  const id = sessionDemo.lire().utilisateurId
  return UTILISATEURS.find((u) => u.id === id)?.role ?? 'proprietaire'
}

/** Refuse la lecture ou le geste à un rôle qui n'en a pas le droit (le gérant a aussi ceux du répartiteur). */
export function exiger(roles: Role[], quoi: string): void {
  if (!rolePermis(roleCourant(), roles)) throw new AccesRefuse(quoi, roles)
}

/** Montants détaillés : propriétaire et comptable (ENT-P02R-03). */
export const montantsVisibles = () => voitMontants(roleCourant())
