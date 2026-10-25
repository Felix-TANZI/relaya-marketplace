// DONNÉES DE DÉMONSTRATION — comptes d'employés activés depuis leur lien d'invitation (Activation.tsx) : l'agent, son
// empreinte de mot de passe (démonstration : le mot de passe lui-même n'est jamais gardé, seulement une empreinte) et la
// clé de son second facteur. Lu par la connexion (session.ts) et par agentCourant() (acces.ts) : un employé activé se
// connecte et agit sous son propre nom, comme les agents du jeu d'essai.
import type { Agent } from '../donnees/domaines/session'
import { magasin } from './stockage'

export interface CompteActive {
  agent: Agent
  empreinte: string
  cle: string
  activeLe: number
}
export const agentsActives = magasin<{ comptes: CompteActive[] }>('agents-actives', () => ({ comptes: [] }))

/** Empreinte d'un mot de passe (démonstration : FNV-1a salé par l'identifiant ; le serveur utilise un hachage lent). */
export function empreinteMotDePasse(email: string, motDePasse: string): string {
  let h = 2166136261
  for (const ch of email.trim().toLowerCase() + ':' + motDePasse) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return h.toString(36)
}
export const agentActive = (id: string): Agent | null => agentsActives.lire().comptes.find((c) => c.agent.id === id)?.agent ?? null

/** Jeton du lien d'activation d'un employé invité : son identifiant et l'heure de l'invitation (« a-aline~lx3k9c »). */
export const jetonInvitation = (id: string, inviteLe: number): string => `${id}~${Math.round(inviteLe).toString(36)}`
export function lireJeton(jeton: string): { id: string; inviteLe: number } | null {
  const m = /^([a-z0-9-]+)~([0-9a-z]+)$/.exec(jeton.trim())
  if (!m) return null
  const le = parseInt(m[2], 36)
  return Number.isFinite(le) ? { id: m[1], inviteLe: le } : null
}
/** Clé du second facteur d'un agent (démonstration : dérivée de son identifiant, groupes de 4 caractères). */
export function cleSecondFacteur(id: string): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let h = 2166136261
  let s = ''
  for (let i = 0; i < 16; i++) {
    for (const ch of id + i) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
    s += A[h % A.length]
  }
  return s.match(/.{4}/g)!.join(' ')
}
