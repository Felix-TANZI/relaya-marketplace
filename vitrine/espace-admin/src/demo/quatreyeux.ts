// DONNÉES DE DÉMONSTRATION — décisions motivées et quatre yeux (ADM-01 § 12). Une décision « quatre yeux » attend un
// second validateur d'un AUTRE compte (jamais le même agent, même sous un autre de ses rôles), d'un rôle permis ; un
// refus garde son motif ; au-delà de CONSOLE-CONTRESEING-H, elle expire et revient au premier agent. Chaque étape écrit
// au journal. Le motif d'une décision a une longueur minimale (registre : motif_min_caracteres, ADM-PRI-03).
// Effets : un domaine qui décide (litiges, commandes…) inscrit l'effet de son action (`effetQuatreYeux`) ; l'effet
// s'applique à la contresignature, jamais avant (le serveur fait de même : la décision n'existe qu'à deux).
import { PARAMETRES } from '../calculs/registre'
import type { Role } from '../donnees/communs'
import type { DecisionQuatreYeux, DemandeDecision, DomaineQuatreYeux } from '../donnees/domaines/quatreyeux'
import { maintenant } from './horloge'
import { agentCourant, exiger, exigerPage, roleCourant, verifierSession } from './acces'
import { equipeDemo, etatMembre } from './equipe-etat'
import { journaliser } from './journal'
import { HEURE, T, nomAgent } from './jeu-essai'
import { magasin, repondre } from './stockage'

const motifValable = (m: string) => m.trim().length >= PARAMETRES.console.motifMin

export const quatreYeuxDemo = magasin<{ decisions: DecisionQuatreYeux[]; n: number }>('quatreyeux', () => ({
  n: 9,
  decisions: [
    // Demandes d'accès d'Accès et personnel (ACCES-CONSOLE § 3), en attente de la Direction (demo/equipe-etat.ts).
    {
      id: 'QY-0009',
      action: 'acces.temporaire',
      objet: 'Compte Aïcha Bouba',
      resume: 'Aïcha Bouba : Médiation pendant 10 jours',
      motif: 'Renfort des recours pendant le pic de la rentrée (10 jours)',
      preuves: [],
      montant: null,
      premier: { agentId: 'a-pauline', agent: 'Pauline Manga', role: 'rh', le: T(-60) },
      second: null,
      rolesSecond: ['superviseur'],
      etat: 'a_contresigner',
      expireLe: T(-60) + PARAMETRES.console.quatreYeuxExpireH * HEURE,
    },
    {
      id: 'QY-0008',
      action: 'acces.perimetre',
      objet: 'Compte Boris Tchinda',
      resume: 'Boris Tchinda : plafond 25 000 F → 150 000 F',
      motif: 'Reprend les remboursements de Nadège Eyenga le samedi',
      preuves: [],
      montant: null,
      premier: { agentId: 'a-pauline', agent: 'Pauline Manga', role: 'rh', le: T(-150) },
      second: null,
      rolesSecond: ['superviseur'],
      etat: 'a_contresigner',
      expireLe: T(-150) + PARAMETRES.console.quatreYeuxExpireH * HEURE,
    },
    {
      id: 'QY-0007',
      action: 'remboursement.executer',
      objet: 'RB-0031',
      resume: 'Rembourser 180 280 F au client de BLV-52107 (au-delà du seuil : second validateur Finance)',
      motif: 'Rupture chez les deux vendeurs après deux tentatives (RUPTURE-TENTATIVES) ; le client a payé par Mobile Money.',
      preuves: [
        { id: 'p1', libelle: 'Commande BLV-52107 · payée le 24 sept.', route: 'commandes', params: { ref: 'BLV-52107' } },
        { id: 'p2', libelle: 'Deux refus de préparation des vendeurs, journalisés' },
      ],
      montant: 180280,
      premier: { agentId: 'a-clarisse', agent: 'Clarisse Mvondo', role: 'support', le: T(-70) },
      second: null,
      rolesSecond: ['finance', 'superviseur'],
      etat: 'a_contresigner',
      expireLe: T(-70) + PARAMETRES.console.quatreYeuxExpireH * HEURE,
    },
    {
      id: 'QY-0006',
      action: 'kyc.refuser',
      objet: 'KYC-0090',
      resume: 'Refuser la pièce de Rapide Colis Yaoundé (assurance expirée)',
      motif: 'Attestation d’assurance expirée depuis le 30 septembre ; l’entreprise reste restreinte jusqu’au dépôt d’une pièce valide.',
      preuves: [{ id: 'p1', libelle: 'Attestation déposée le 2 oct. · échue le 30 sept.' }],
      montant: null,
      premier: { agentId: 'a-armand', agent: 'Armand Kouam', role: 'verification', le: T(-26 * 60) },
      second: { agentId: 'a-franck', agent: 'Franck Penga', role: 'superviseur', le: T(-25 * 60), motif: 'Pièce relue : échéance du 30 septembre confirmée, refus justifié.' },
      rolesSecond: ['superviseur'],
      etat: 'contresignee',
      expireLe: T(-26 * 60) + PARAMETRES.console.quatreYeuxExpireH * HEURE,
    },
  ],
}))

/** Effets des actions à quatre yeux, inscrits par les domaines qui décident (litiges, commandes…). */
const EFFETS = new Map<string, (objet: string, d: DecisionQuatreYeux) => void | Promise<void>>()
export function effetQuatreYeux(prefixe: string, f: (objet: string, d: DecisionQuatreYeux) => void | Promise<void>) {
  EFFETS.set(prefixe, f)
}
const effetDe = (action: string) => [...EFFETS.entries()].find(([p]) => action.startsWith(p))?.[1]

/** Une décision échue revient au premier agent (ADM-01-R11) : elle n'est plus contresignable. */
const echue = (d: DecisionQuatreYeux) => d.etat === 'a_contresigner' && d.expireLe <= maintenant()
export const decisionsEnAttente = () => quatreYeuxDemo.lire().decisions.filter((d) => d.etat === 'a_contresigner' && !echue(d))

/** Crée une demande à contresigner (utilisée aussi par les domaines qui décident). */
export async function demanderSecond(d: DemandeDecision): Promise<string> {
  const a = agentCourant()
  let id = ''
  quatreYeuxDemo.ecrire((s) => {
    s.n++
    id = `QY-${String(s.n).padStart(4, '0')}`
    s.decisions.push({ id, action: d.action, objet: d.objet, resume: d.resume, motif: d.motif, preuves: d.preuves, montant: d.montant ?? null, premier: { agentId: a.id, agent: nomAgent(a), role: roleCourant(), le: maintenant() }, second: null, rolesSecond: d.rolesSecond, etat: 'a_contresigner', expireLe: maintenant() + PARAMETRES.console.quatreYeuxExpireH * HEURE })
  })
  await journaliser({ action: d.action + '.premier', objet: d.objet, motif: d.motif })
  return id
}

export const demoQuatreYeux: DomaineQuatreYeux = {
  async decider(d) {
    verifierSession()
    if (!motifValable(d.motif)) return { ok: false, raison: 'motif_court' }
    // Le serveur décide aussi : un montant au-delà du seuil passe toujours à quatre yeux ; au-delà du PLAFOND de
    // l'agent (son périmètre : ACCES-CONSOLE § 2), aussi, même sous le seuil (un Senior ou la Finance contresigne).
    const a = agentCourant()
    const plafond = roleCourant() === 'superviseur' ? null : (etatMembre(a.id)?.perimetre.plafond ?? null)
    const auDela = plafond !== null && (d.montant ?? 0) > plafond
    const quatre = d.quatreYeux || auDela || (d.montant ?? 0) > PARAMETRES.console.seuilRemboursementQuatreYeux
    // Accès d'urgence de la Direction (§ 8) : la décision s'applique seule, journalisée « urgence », revue le lendemain.
    const urgence = roleCourant() === 'superviseur' && equipeDemo.lire().urgences.some((u) => u.agentId === a.id && !u.fermeeLe && u.jusqua > maintenant())
    if (quatre && urgence) {
      const id = await demanderSecond({ ...d, rolesSecond: d.rolesSecond.length ? d.rolesSecond : ['superviseur'] })
      const apres = quatreYeuxDemo.ecrire((s) => {
        const x = s.decisions.find((y) => y.id === id)!
        x.etat = 'contresignee'
        x.second = { agentId: a.id, agent: nomAgent(a), role: 'superviseur', le: maintenant(), motif: 'Accès d’urgence : appliqué seul, revu le lendemain par un second membre de la Direction' }
      })
      await journaliser({ action: d.action + '.urgence', objet: d.objet, motif: d.motif })
      const effet = effetDe(d.action)
      if (effet) await effet(d.objet, apres.decisions.find((y) => y.id === id)!)
      return { ok: true, etat: 'contresignee', id }
    }
    if (!quatre) {
      await journaliser({ action: d.action, objet: d.objet, motif: d.motif })
      return { ok: true, etat: 'appliquee', id: d.objet }
    }
    const seconds: Role[] = auDela && !d.rolesSecond.length ? ['finance', 'superviseur'] : d.rolesSecond.length ? d.rolesSecond : ['superviseur']
    return { ok: true, etat: 'a_contresigner', id: await demanderSecond({ ...d, rolesSecond: seconds }) }
  },
  async enAttente() {
    exigerPage('quatreyeux', 'Quatre yeux en attente')
    return repondre(decisionsEnAttente())
  },
  async historique() {
    exigerPage('quatreyeux', 'Quatre yeux en attente')
    const r = roleCourant()
    const moi = agentCourant().id
    const vues = quatreYeuxDemo.lire().decisions.filter((d) => d.etat !== 'a_contresigner' || echue(d))
    // La Direction et l'Audit voient tout ; les autres, ce qu'ils ont demandé ou peuvent contresigner.
    const l = vues.filter((d) => r === 'superviseur' || r === 'audit' || d.premier.agentId === moi || d.rolesSecond.includes(r))
    return repondre(l.map((d) => (echue(d) ? { ...d, etat: 'refusee' as const, second: null } : d)).sort((a, b) => (b.second?.le ?? b.expireLe) - (a.second?.le ?? a.expireLe)))
  },
  async contresigner(id, motif) {
    exiger('contresigner')
    return trancher(id, motif, 'contresignee')
  },
  async refuser(id, motif) {
    exiger('contresigner')
    return trancher(id, motif, 'refusee')
  },
}

async function trancher(id: string, motif: string, etat: 'contresignee' | 'refusee') {
  const d = quatreYeuxDemo.lire().decisions.find((x) => x.id === id)
  if (!d || d.etat !== 'a_contresigner' || echue(d)) return { ok: false as const, raison: 'deja_traitee' as const }
  const a = agentCourant()
  if (d.premier.agentId === a.id) return { ok: false as const, raison: 'meme_compte' as const }
  if (!d.rolesSecond.includes(roleCourant())) return { ok: false as const, raison: 'role_non_permis' as const }
  if (!motifValable(motif)) return { ok: false as const, raison: 'motif_court' as const }
  const apres = quatreYeuxDemo.ecrire((s) => {
    const x = s.decisions.find((y) => y.id === id)!
    x.etat = etat
    x.second = { agentId: a.id, agent: nomAgent(a), role: roleCourant(), le: maintenant(), motif }
  })
  await journaliser({ action: d.action + (etat === 'contresignee' ? '.second' : '.refus'), objet: d.objet, motif })
  const effet = effetDe(d.action)
  if (effet) await effet(d.objet, apres.decisions.find((y) => y.id === id)!)
  return { ok: true as const, etat }
}
