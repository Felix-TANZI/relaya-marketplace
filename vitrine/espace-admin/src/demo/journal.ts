// DONNÉES DE DÉMONSTRATION — le journal d'audit de la démonstration, chaîné par empreinte SHA-256 (même principe que le
// serveur) : chaque geste de la console y écrit une ligne (journaliser) ; une ligne n'est ni modifiée ni effacée.
// L'agent et le rôle sous lequel il agit sont posés ici, jamais par l'écran (ADM-ROL-02).
import { empreinte } from '../donnees/exports'
import type { DomaineGouvernance, EntreeJournal, LigneJournal } from '../donnees/domaines/gouvernance'
import { maintenant } from './horloge'
import { agentCourant, dansPerimetre, exigerPage, roleCourant } from './acces'
import { agentConnu } from './equipe-etat'
import { AGENTS, T, agent, nomAgent } from './jeu-essai'
import { magasin, repondre } from './stockage'
import type { Role } from '../donnees/communs'

/** Lignes du jeu d'essai (gestes de la matinée), chaînées au premier accès. */
const AMORCE: (EntreeJournal & { le: number; agentId: string; role: Role })[] = [
  { le: T(-305), agentId: 'a-franck', role: 'superviseur', action: 'session.ouvrir', objet: 'Console' },
  { le: T(-240), agentId: 'a-armand', role: 'verification', action: 'piece.consulter', objet: 'KYC-0088', motif: 'Revue de la pièce du gérant avant activation du relais', zone: 'Z2' },
  { le: T(-180), agentId: 'a-clarisse', role: 'support', action: 'donnee.demasquer', objet: 'BLV-00008 · téléphone client', motif: 'Le client dit ne pas avoir reçu son code de retrait (SP-0207)', zone: 'Z1' },
  { le: T(-95), agentId: 'a-yannick', role: 'operations', action: 'paquet.escalader', objet: 'PQ-Z6-261013-002', motif: 'Domicile en retard : entreprise relancée', zone: 'Z6' },
  { le: T(-70), agentId: 'a-clarisse', role: 'support', action: 'remboursement.proposer', objet: 'RB-0031', motif: 'Rupture chez les deux vendeurs après deux tentatives', zone: 'Z9' },
]

interface EtatJournal {
  lignes: LigneJournal[]
}
export const journalDemo = magasin<EtatJournal>('journal', () => ({ lignes: [] }))

// L'avant et l'après entrent dans l'empreinte quand la ligne les porte (les lignes sans eux gardent la même forme).
const texteLigne = (l: Omit<LigneJournal, 'empreinte'>) => [l.n, l.le, l.agentId, l.role, l.action, l.objet, l.motif ?? '', l.zone ?? '', l.precedente, ...(l.avant != null || l.apres != null ? [l.avant ?? '', l.apres ?? ''] : [])].join('|')

async function chainer(base: LigneJournal[], e: EntreeJournal & { le: number; agentId: string; role: Role }): Promise<LigneJournal> {
  const prec = base.at(-1)
  const l: Omit<LigneJournal, 'empreinte'> = { n: (prec?.n ?? 0) + 1, le: e.le, agentId: e.agentId, agent: e.agentId === SYSTEME ? 'Système BelivaY' : nomAgent(agentConnu(e.agentId) ?? agent(e.agentId)), role: e.role, action: e.action, objet: e.objet, motif: e.motif ?? null, zone: e.zone ?? null, precedente: prec?.empreinte ?? '0', ...(e.avant != null || e.apres != null ? { avant: e.avant ?? null, apres: e.apres ?? null } : {}) }
  return { ...l, empreinte: await empreinte(texteLigne(l)) }
}

let amorce: Promise<void> | null = null
async function lignes(): Promise<LigneJournal[]> {
  if (!journalDemo.lire().lignes.length)
    await (amorce ??= (async () => {
      const l: LigneJournal[] = []
      for (const e of AMORCE) l.push(await chainer(l, e))
      if (!journalDemo.lire().lignes.length) journalDemo.ecrire((s) => void (s.lignes = l))
    })())
  return journalDemo.lire().lignes
}

/** Écrit une ligne au nom de l'agent connecté, sous son rôle courant (tout geste de la démonstration passe ici). */
export async function journaliser(e: EntreeJournal): Promise<LigneJournal> {
  const base = await lignes()
  const l = await chainer(base, { ...e, le: maintenant(), agentId: agentCourant().id, role: roleCourant() })
  journalDemo.ecrire((s) => void s.lignes.push(l))
  return l
}

/** Ligne écrite par le système lui-même (accès temporaire retiré à sa fin, tâche) : jamais au nom d'un agent. */
export const SYSTEME = 'systeme'
export async function journaliserSysteme(e: EntreeJournal): Promise<LigneJournal> {
  const base = await lignes()
  const l = await chainer(base, { ...e, le: maintenant(), agentId: SYSTEME, role: 'rh' })
  journalDemo.ecrire((s) => void s.lignes.push(l))
  return l
}

// S6 (src/demo/gouvernance.ts) prolonge ce socle avec le reste du domaine.
export const demoGouvernance: Pick<DomaineGouvernance, 'journal' | 'verifierChaine' | 'ecrire' | 'agents'> = {
  async journal(f = {}) {
    exigerPage('journal', 'Journal d’audit')
    const r = roleCourant()
    const moi = agentCourant().id
    const tout = r === 'superviseur' || r === 'audit'
    let l = (await lignes()).filter((x) => tout || x.agentId === moi || (r === 'operations' && x.zone !== null && dansPerimetre(x.zone)))
    if (f.action) l = l.filter((x) => x.action === f.action)
    if (f.objet) l = l.filter((x) => x.objet.includes(f.objet!))
    return repondre([...l].reverse().slice(0, f.limite ?? 200))
  },
  async verifierChaine() {
    const l = await lignes()
    for (let i = 0; i < l.length; i++) {
      const { empreinte: e, ...reste } = l[i]
      if (reste.precedente !== (i ? l[i - 1].empreinte : '0') || (await empreinte(texteLigne(reste))) !== e) return { ok: false, casseeA: reste.n, lignes: l.length }
    }
    return { ok: true, casseeA: null, lignes: l.length }
  },
  ecrire: (e) => journaliser(e),
  agents: async () => {
    exigerPage('roles', 'Rôles et accès')
    return repondre(AGENTS)
  },
}
