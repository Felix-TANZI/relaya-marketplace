// DONNÉES DE DÉMONSTRATION — droits côté « serveur » (ADM-ROL-01 : contrôlés côté serveur, jamais seulement masqués) :
// une lecture ou un geste refusés au rôle lèvent AccesRefuse (403 ROLE_FORBIDDEN), comme le serveur ; l'écran le dit
// (composants/Garde.tsx). Le périmètre de zones (ADM-ROL-03) filtre les listes des Opérations et de l'agent terrain.
// Accès de la console (logique-metier/ACCES-CONSOLE.md) : l'agent porte ses rôles et ses zones EFFECTIFS (équipe,
// niveau, rôle additionnel, accès temporaires en cours : equipe-etat.ts) ; un compte suspendu ou fermé n'a plus de
// session (toute lecture la ferme) ; un accès temporaire échu ne sert plus, même ouvert à l'écran ; un geste réservé à
// un niveau (contre-signer dès Senior) ou une page réservée (Mon équipe : Responsable) est refusé ici.
import { niveauPermet } from '../config/acces-console'
import { PERMISSIONS, pageOuverteNiveau, rolesDe, type Permission } from '../config/droits'
import { AccesRefuse, type CodeZone, type Role } from '../donnees/communs'
import { agentActive } from './agents-actives'
import { agentEffectif, etatMembre, sessionValable } from './equipe-etat'
import { AGENT_DU_ROLE, agent } from './jeu-essai'
import { magasin } from './stockage'

export interface EtatSession {
  connecte: boolean
  agentId: string
  role: Role // rôle sous lequel l'agent agit (ADM-ROL-02)
  ouverteLe: number // ouverture de la session (une suspension ferme toute session ouverte avant)
}
export const sessionDemo = magasin<EtatSession>('session', () => ({ connecte: true, agentId: AGENT_DU_ROLE.superviseur, role: 'superviseur', ouverteLe: 0 }))

export const agentCourant = () => agentEffectif(agentActive(sessionDemo.lire().agentId) ?? agent(sessionDemo.lire().agentId))
export const roleCourant = (): Role => sessionDemo.lire().role
/** Niveau de l'agent connecté dans son équipe (null : compte hors équipe). */
export const niveauCourant = () => etatMembre(sessionDemo.lire().agentId)?.niveau ?? null

/** Compte suspendu ou fermé, sessions fermées : la session se ferme et la source refuse (comme le 401 du serveur). */
export function verifierSession(): void {
  const s = sessionDemo.lire()
  if (!s.connecte) return
  if (!sessionValable(s.agentId, s.ouverteLe)) {
    sessionDemo.ecrire((e) => void (e.connecte = false))
    throw new AccesRefuse('Session fermée : compte suspendu ou fermé', [])
  }
}
/** Le rôle sous lequel l'agent agit est-il encore le sien (un accès temporaire échu ne sert plus) ? */
function exigerRoleTenu(quoi: string): void {
  const a = agentCourant()
  const r = roleCourant()
  if (!a.roles.includes(r)) throw new AccesRefuse(`${quoi} : le rôle ${r} n’est plus tenu (accès temporaire échu ou retiré)`, a.roles)
}
/** Refuse la lecture d'une page au rôle qui ne l'ouvre pas (droits.ts), ou au niveau qui ne l'ouvre pas. */
export function exigerPage(route: string, quoi: string): void {
  verifierSession()
  exigerRoleTenu(quoi)
  if (!pageOuverteNiveau(route, roleCourant(), niveauCourant())) throw new AccesRefuse(quoi, rolesDe(route))
}
/** Refuse un geste transverse (démasquer, contresigner, exporter…) au rôle qui ne l'a pas, ou au niveau trop bas. */
export function exiger(p: Permission): void {
  verifierSession()
  exigerRoleTenu(PERMISSIONS[p].quoi)
  if (!PERMISSIONS[p].roles.includes(roleCourant()) || !niveauPermet(p, niveauCourant())) throw new AccesRefuse(PERMISSIONS[p].quoi, PERMISSIONS[p].roles)
}

/** Zones visibles du rôle courant : null = toutes (rôles sans périmètre de zone). */
export function zonesVisibles(): CodeZone[] | null {
  const r = roleCourant()
  return r === 'operations' || r === 'terrain' ? agentCourant().zones : null
}
export const dansPerimetre = (zone: CodeZone | null) => {
  const z = zonesVisibles()
  return !z || zone === null || z.includes(zone)
}
/** Filtre une liste au périmètre (ADM-ROL-03 : Opérations et agent terrain, leurs zones seulement). */
export const auPerimetre = <T extends { zone: CodeZone | null }>(l: T[]): T[] => l.filter((x) => dansPerimetre(x.zone))
