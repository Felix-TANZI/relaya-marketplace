// Modèle des accès de la console (logique-metier/ACCES-CONSOLE.md, validé par le porteur) : ÉQUIPES, NIVEAUX,
// PÉRIMÈTRE, CONFLITS, RÈGLES D'ATTRIBUTION et QUATRE YEUX, en fonctions pures (lues par la source de démonstration,
// les écrans et les tests ; le kit tient les mêmes règles : backend-kit/apps/console/equipes.py).
// Droits effectifs = matrice page × rôle (config/droits.ts, le socle, jamais réécrit) restreinte par le niveau
// (contre-signer dès Senior ; gérer les membres : Responsable d'équipe) et par le périmètre (zones, niveau de litige,
// plafond de montant). Aucun seuil ici : ils viennent du registre (PARAMETRES.acces, codes « Proposé »).
import { PARAMETRES } from '../calculs/registre'
import type { CodeZone, Francs, Instant, Role } from '../donnees/communs'
import type { AccesDomaine, CodeEquipe, Conflit, DroitDomaine, DroitsEffectifs, GesteEffectif, Niveau, Perimetre, RaisonAcces } from '../donnees/domaines/equipe'
import { PERMISSIONS, droitDe, type Acces, type Permission } from './droits'
import { NOM_ROLE } from './libelles'

// ── 1. Équipes et niveaux ───────────────────────────────────────────────────────────────────────────────────────────
export interface DefEquipe {
  nom: string
  icone: string
  mission: string
  roles: Record<Niveau, Role[]> // rôles de base de la matrice, par niveau
  quatreYeux: boolean // entrer dans l'équipe ou y changer d'accès : validé par la Direction (§ 3)
  litige: 1 | 2 | null // niveau de litige le plus haut que l'équipe tranche
  plafond: boolean // l'équipe engage de l'argent (remboursement, geste commercial)
  zones: boolean // le périmètre de zones est obligatoire
}
const tous = (r: Role[]): Record<Niveau, Role[]> => ({ agent: r, senior: r, responsable: r })

export const EQUIPES: Record<CodeEquipe, DefEquipe> = {
  direction: { nom: 'Direction', icone: 'crown', mission: 'Pilotage, dernier recours, accès d’urgence', roles: tous(['superviseur']), quatreYeux: true, litige: null, plafond: false, zones: false },
  litiges: { nom: 'Litiges et médiation', icone: 'scale', mission: 'Litiges, recours, sanctions', roles: tous(['mediation', 'support']), quatreYeux: false, litige: 2, plafond: true, zones: false },
  service_client: { nom: 'Service client', icone: 'life-buoy', mission: 'Messages, litiges niveau 1, clients', roles: tous(['support']), quatreYeux: false, litige: 1, plafond: true, zones: false },
  verification: { nom: 'Vérification et catalogue', icone: 'badge-check', mission: 'KYC, catalogue, modération, avis', roles: tous(['verification']), quatreYeux: false, litige: null, plafond: false, zones: false },
  finance: { nom: 'Finance', icone: 'banknote', mission: 'Séquestre, remboursements, versements, rapprochement', roles: tous(['finance']), quatreYeux: true, litige: null, plafond: true, zones: false },
  operations: { nom: 'Opérations et terrain', icone: 'truck', mission: 'Zones, relais, entreprises, pannes, descentes terrain', roles: { agent: ['terrain'], senior: ['terrain'], responsable: ['operations'] }, quatreYeux: false, litige: null, plafond: false, zones: true },
  audit: { nom: 'Audit et conformité', icone: 'scroll-text', mission: 'Lecture des traces, fraude, exports', roles: tous(['audit']), quatreYeux: true, litige: null, plafond: false, zones: false },
  acces: { nom: 'Accès et personnel', icone: 'key-round', mission: 'Comptes des employés, rôles, arrivées et départs', roles: tous(['rh']), quatreYeux: true, litige: null, plafond: false, zones: false },
}
export const CODES_EQUIPES = Object.keys(EQUIPES) as CodeEquipe[]
export const NOM_NIVEAU: Record<Niveau, string> = { agent: 'Agent', senior: 'Senior', responsable: 'Responsable d’équipe' }
export const NIVEAUX: Niveau[] = ['agent', 'senior', 'responsable']
/** Équipe dont un rôle est le rôle de base (rôle additionnel, accès temporaire : l'équipe qu'il ouvre). */
export const equipeDuRole = (r: Role): CodeEquipe => (r === 'superviseur' ? 'direction' : r === 'mediation' ? 'litiges' : r === 'support' ? 'service_client' : r === 'verification' ? 'verification' : r === 'finance' ? 'finance' : r === 'audit' ? 'audit' : r === 'rh' ? 'acces' : 'operations')

/** Périmètre par défaut d'un niveau dans une équipe (zones choisies à l'invitation). */
export function perimetreParDefaut(e: CodeEquipe, n: Niveau, zones: CodeZone[] | null = null): Perimetre {
  const d = EQUIPES[e]
  return { zones: d.zones ? zones : null, niveauLitige: d.litige === null ? null : n === 'agent' || d.litige === 1 ? 1 : 2, plafond: d.plafond ? PARAMETRES.acces.plafond[n] : null }
}

// ── 2. Rôles effectifs ──────────────────────────────────────────────────────────────────────────────────────────────
export interface AccesMembre {
  id: string
  equipe: CodeEquipe
  niveau: Niveau
  perimetre: Perimetre
  roleAdditionnel: Role | null
  temporaires: { role: Role; debut: Instant; fin: Instant; etat: string }[]
}
export const temporaireActif = (t: AccesMembre['temporaires'][number], n: Instant) => t.etat === 'actif' && t.debut <= n && n < t.fin
/** Rôles tenus à l'instant n : ceux de l'équipe au niveau, le rôle additionnel, les accès temporaires en cours. */
export function rolesEffectifs(m: AccesMembre, n: Instant): Role[] {
  const r = [...EQUIPES[m.equipe].roles[m.niveau]]
  if (m.roleAdditionnel) r.push(m.roleAdditionnel)
  for (const t of m.temporaires) if (temporaireActif(t, n)) r.push(t.role)
  return [...new Set(r)]
}

// ── 4. Conflits (séparation des tâches) ─────────────────────────────────────────────────────────────────────────────
const METIER: Role[] = ['finance', 'support', 'mediation', 'operations', 'verification', 'terrain']
const DECIDENT: Role[] = ['superviseur', ...METIER, 'rh']
const REGLES_CONFLIT: { a: Role; b: Role[]; raison: string; dossier?: boolean }[] = [
  { a: 'finance', b: ['mediation'], raison: 'Qui paie ne tranche pas le litige qui décide du paiement.' },
  { a: 'finance', b: ['rh'], raison: 'Qui paie ne crée pas les comptes qui paient.' },
  { a: 'verification', b: ['support'], raison: 'Qui répond au vendeur ne valide pas son identité sur le même dossier.', dossier: true },
  { a: 'audit', b: DECIDENT, raison: 'Qui contrôle ne décide pas.' },
  { a: 'rh', b: METIER, raison: 'Qui donne les accès ne fait pas le travail métier.' },
]
/** Conflits d'un ensemble de rôles (ceux « sur le même dossier » sont signalés, le compte reste possible). */
export function conflitsDe(roles: Role[]): Conflit[] {
  const out: Conflit[] = []
  for (const c of REGLES_CONFLIT)
    if (roles.includes(c.a)) for (const b of c.b) if (b !== c.a && roles.includes(b)) out.push({ roles: [c.a, b], raison: c.raison, ...(c.dossier ? { dossier: true } : {}) })
  return out
}
export const conflitBloquant = (roles: Role[]): Conflit | null => conflitsDe(roles).find((c) => !c.dossier) ?? null
export const texteConflit = (c: Conflit) => `${NOM_ROLE[c.roles[0]]} + ${NOM_ROLE[c.roles[1]]} : ${c.raison}`

// ── Droits effectifs, par domaine et par geste ──────────────────────────────────────────────────────────────────────
export const DOMAINES: { id: string; nom: string; routes: string[] }[] = [
  { id: 'litiges', nom: 'Litiges et sanctions', routes: ['litige', 'sanctions', 'qualite'] },
  { id: 'argent', nom: 'Argent', routes: ['escrow', 'remboursements', 'versements', 'rapprochement', 'wallet', 'remb-auto', 'frais-paiement', 'export', 'commissions'] },
  { id: 'identites', nom: 'Identités et acteurs', routes: ['kyc', 'vendeurs', 'clients', 'vue-client', 'abonnements', 'paliers', 'candidatures'] },
  { id: 'catalogue', nom: 'Catalogue et avis', routes: ['catalogue', 'moderation', 'avis'] },
  { id: 'logistique', nom: 'Logistique et zones', routes: ['relais', 'entreprises', 'livreurs', 'paquets', 'zones', 'carte', 'emballages'] },
  { id: 'terrain', nom: 'Descentes terrain', routes: ['descentes', 'mes-descentes', 'comptes'] },
  { id: 'pilotage', nom: 'Pilotage et messages', routes: ['parametrage', 'promotions', 'contenu-site', 'messagerie', 'panne', 'support', 'modeles', 'interrupteurs', 'rapports', 'sante'] },
  { id: 'gouvernance', nom: 'Fraude, journal et équipe', routes: ['fraude', 'journal', 'roles', 'pays', 'legal', 'taches', 'conservation', 'quatreyeux'] },
]
const RANG: Record<Acces, number> = { aucun: 0, lecture: 1, part: 2, zone: 3, oui: 4 }

/** Accès à un domaine pour des rôles : le meilleur accès de ses pages. */
export function accesDomaine(routes: string[], roles: Role[]): AccesDomaine {
  let best: Acces = 'aucun'
  for (const r of routes) for (const role of roles) if (RANG[droitDe(r, role).acces] > RANG[best]) best = droitDe(r, role).acces
  return best
}

/** Gestes réservés à un niveau (au-delà de la matrice) : un Agent ne contre-signe pas. */
export const NIVEAU_GESTE: Partial<Record<Permission, Niveau[]>> = { contresigner: ['senior', 'responsable'] }
export const niveauPermet = (p: Permission, n: Niveau | null) => !n || !NIVEAU_GESTE[p] || NIVEAU_GESTE[p]!.includes(n)

/** Gestes propres à l'équipe et au terrain (hors PERMISSIONS de la matrice). */
export const GESTES_EQUIPE: { id: string; quoi: string; mots: string[]; ok: (roles: Role[], n: Niveau) => boolean }[] = [
  { id: 'equipe.gerer', quoi: 'Gérer les membres de son équipe (inviter, Agent ↔ Senior, périmètre)', mots: ['inviter', 'équipe', 'membre', 'senior'], ok: (r, n) => n === 'responsable' || r.includes('rh') || r.includes('superviseur') },
  { id: 'acces.temporaire', quoi: 'Donner un accès temporaire, suspendre, réactiver, désactiver un compte', mots: ['suspendre', 'réactiver', 'désactiver', 'temporaire', 'accès'], ok: (r) => r.includes('rh') || r.includes('superviseur') },
  { id: 'descente.planifier', quoi: 'Planifier une descente terrain et choisir l’agent', mots: ['descente', 'terrain', 'planifier', 'visite', 'inspection'], ok: (r) => r.includes('operations') || r.includes('superviseur') },
  { id: 'descente.faire', quoi: 'Faire une descente terrain (contrôles, photos, compte rendu)', mots: ['descente', 'terrain', 'photo', 'compte rendu'], ok: (r) => r.includes('terrain') },
  { id: 'urgence.ouvrir', quoi: 'Ouvrir l’accès d’urgence (motif, durée limitée, revu le lendemain)', mots: ['urgence', 'bris de glace'], ok: (r) => r.includes('superviseur') },
]
/** Mots de recherche d'un geste de la matrice (« qui peut rembourser ? »). */
export const MOTS_GESTE: Partial<Record<Permission, string[]>> = {
  'remboursement.executer': ['rembourser', 'remboursement', 'argent'],
  'versement.executer': ['verser', 'versement', 'payer', 'vendredi'],
  'litige.decider': ['litige', 'trancher', 'arbitrer'],
  'kyc.decider': ['kyc', 'identité', 'valider', 'pièce'],
  demasquer: ['démasquer', 'téléphone', 'donnée'],
  'piece.consulter': ['pièce', 'identité'],
  contresigner: ['contresigner', 'quatre yeux', 'valider'],
  exporter: ['exporter', 'export', 'csv'],
  'sanction.decider': ['sanction', 'recours', 'suspendre un vendeur'],
  'fraude.decider': ['fraude', 'geler', 'gel'],
  'role.attribuer': ['rôle', 'inviter', 'compte', 'accès'],
  'parametre.valider': ['paramètre', 'valider'],
  'parametre.proposer': ['paramètre', 'proposer'],
  'compte.saisir': ['saisir', 'boutique', 'relais'],
  'interrupteur.basculer': ['interrupteur', 'fonction'],
  'tache.lancer': ['tâche'],
  'maintenance.programmer': ['maintenance'],
  'legal.publier': ['légal', 'cgu'],
}

const formatF = (f: Francs) => `${f.toLocaleString('fr-FR').replace(/[\s  ]/g, ' ')} F`
/** Limite d'un geste pour un membre (« jusqu'à 25 000 F », « niveau 1 », « Z1, Z3 »). */
export function limiteGeste(p: Permission, m: AccesMembre, roles: Role[]): string | null {
  if (p === 'litige.decider' && m.perimetre.niveauLitige === 1 && !roles.includes('superviseur')) return 'Niveau 1'
  if (p === 'remboursement.executer' && m.perimetre.plafond !== null && !roles.includes('superviseur')) return `Jusqu’à ${formatF(m.perimetre.plafond)}`
  if (p === 'exporter' && m.perimetre.zones && !roles.some((r) => r === 'superviseur' || r === 'finance' || r === 'audit')) return m.perimetre.zones.join(', ')
  return null
}

/** Ce que le membre peut faire, en clair : rôles tenus, accès par domaine, gestes (oui / non, avec leur limite). */
export function droitsEffectifs(m: AccesMembre, n: Instant): DroitsEffectifs {
  const roles = rolesEffectifs(m, n)
  const domaines: DroitDomaine[] = DOMAINES.map((d) => {
    const acces = accesDomaine(d.routes, roles)
    let note: string | null = null
    if (acces === 'zone' && m.perimetre.zones) note = m.perimetre.zones.join(', ')
    else if (d.id === 'litiges' && acces !== 'aucun' && m.perimetre.niveauLitige === 1 && !roles.includes('superviseur')) note = 'Niveau 1'
    else if (d.id === 'argent' && acces === 'oui' && m.perimetre.plafond !== null && !roles.includes('superviseur')) note = `Jusqu’à ${formatF(m.perimetre.plafond)}`
    return { id: d.id, nom: d.nom, acces, note }
  })
  const gestes: GesteEffectif[] = [
    ...(Object.entries(PERMISSIONS) as [Permission, (typeof PERMISSIONS)[Permission]][]).map(([id, g]) => {
      const ok = g.roles.some((r) => roles.includes(r)) && niveauPermet(id, m.niveau)
      return { id, quoi: g.quoi, ok, limite: ok ? limiteGeste(id, m, roles) : null }
    }),
    ...GESTES_EQUIPE.map((g) => ({ id: g.id, quoi: g.quoi, ok: g.ok(roles, m.niveau), limite: g.id === 'equipe.gerer' && m.niveau === 'responsable' && !roles.includes('rh') && !roles.includes('superviseur') ? EQUIPES[m.equipe].nom : null })),
  ]
  return { roles, domaines, gestes }
}

// ── 3. Qui donne quoi ───────────────────────────────────────────────────────────────────────────────────────────────
export type GesteAcces = 'inviter' | 'niveau' | 'perimetre' | 'role' | 'temporaire' | 'suspendre' | 'reactiver' | 'desactiver' | 'avertir' | 'revoir'
export interface Attributeur {
  id: string
  equipe: CodeEquipe
  niveau: Niveau
  perimetre: Perimetre
  roles: Role[] // rôles effectifs
}
export interface Cible {
  id: string | null // null : invitation
  equipe: CodeEquipe
  niveau: Niveau
}
export interface Apres {
  equipe?: CodeEquipe
  niveau?: Niveau
  perimetre?: Perimetre
  role?: Role | null
}

/** Le périmètre p tient-il dans le périmètre q (zones incluses, niveau de litige et plafond pas plus hauts) ? */
export function dansPerimetre(p: Perimetre, q: Perimetre): boolean {
  if (q.zones && (!p.zones || p.zones.some((z) => !q.zones!.includes(z)))) return false
  if (p.niveauLitige !== null && (q.niveauLitige ?? 0) < p.niveauLitige) return false
  if (p.plafond !== null && (q.plafond ?? 0) < p.plafond) return false
  return true
}

/**
 * Le compte `par` peut-il faire ce geste sur `cible` ? null : oui ; sinon la raison (§ 3). Personne ne se donne un
 * droit à soi-même ; Accès et personnel et la Direction gèrent tout compte (un compte Direction : la Direction seule) ;
 * un Responsable d'équipe gère SON équipe dans SON périmètre (inviter, Agent ↔ Senior, périmètre) et prévient ses
 * membres ; tout le reste passe par Accès et personnel.
 */
export function refusAttribution(par: Attributeur, cible: Cible, geste: GesteAcces, apres: Apres = {}): RaisonAcces | null {
  if (cible.id !== null && par.id === cible.id) return 'soi_meme'
  const touche = [cible.equipe, apres.equipe].includes('direction') || apres.role === 'superviseur'
  if (par.roles.includes('superviseur') || par.roles.includes('rh')) {
    if (touche && !par.roles.includes('superviseur')) return 'direction_seule'
    return null
  }
  if (par.niveau !== 'responsable') return 'reserve_acces'
  const equipeVisee = geste === 'inviter' ? (apres.equipe ?? cible.equipe) : cible.equipe
  if (equipeVisee !== par.equipe) return 'hors_equipe'
  if (geste === 'avertir' || geste === 'revoir') return null
  if (!['inviter', 'niveau', 'perimetre'].includes(geste)) return 'reserve_acces'
  if (cible.niveau === 'responsable' || apres.niveau === 'responsable') return 'niveau_reserve'
  if (apres.perimetre && !dansPerimetre(apres.perimetre, par.perimetre)) return 'hors_perimetre'
  return null
}

const ROLES_QUATRE_YEUX: Role[] = ['superviseur', 'finance', 'rh', 'audit']
/**
 * Le geste attend-il la validation de la Direction (§ 3) ? Finance, Direction, Accès et personnel, Audit ; tout plafond
 * au-dessus du seuil (REMB-CONTROLE-SEUIL) ; toute réactivation ; tout accès temporaire de plus de ADM-ACCES-TEMP-QY-J.
 */
export function exigeQuatreYeux(geste: GesteAcces, cible: Cible, apres: Apres & { dureeMs?: number; roleTemporaire?: Role }): boolean {
  if (geste === 'reactiver') return true
  if (geste === 'temporaire') return (apres.dureeMs ?? 0) > PARAMETRES.acces.tempQuatreYeuxJ * 86_400_000 || (!!apres.roleTemporaire && ROLES_QUATRE_YEUX.includes(apres.roleTemporaire))
  if (geste === 'role' && apres.role && ROLES_QUATRE_YEUX.includes(apres.role)) return true
  if (['inviter', 'niveau', 'perimetre', 'role'].includes(geste) && (EQUIPES[cible.equipe].quatreYeux || (!!apres.equipe && EQUIPES[apres.equipe].quatreYeux))) return true
  if (apres.perimetre?.plafond != null && apres.perimetre.plafond > PARAMETRES.console.seuilRemboursementQuatreYeux) return true
  return false
}

/** Raisons de refus, en mots (écrans ; la source refuse de toute façon). */
export const RAISONS_ACCES: Record<RaisonAcces, string> = {
  motif_court: 'Le motif est trop court.',
  inconnu: 'Membre introuvable.',
  soi_meme: 'Personne ne se donne un droit à soi-même : un autre compte habilité le fait.',
  hors_equipe: 'Un responsable d’équipe ne gère que les membres de son équipe : passez par Accès et personnel.',
  hors_perimetre: 'On ne donne pas plus que son propre périmètre (zones, niveau de litige, plafond).',
  reserve_acces: 'Ce geste passe par Accès et personnel.',
  niveau_reserve: 'Nommer ou retirer un responsable d’équipe passe par Accès et personnel.',
  conflit: 'Ces rôles ne se cumulent pas (séparation des tâches).',
  direction_min: 'Il faut toujours deux comptes Direction actifs : ce compte ne peut être ni suspendu ni rétrogradé.',
  direction_seule: 'Un compte Direction se gère par la Direction seulement.',
  etat: 'Ce compte n’est pas dans le bon état pour ce geste.',
  duree: 'La fin de l’accès temporaire est obligatoire et ne dépasse pas la durée maximale.',
  dossiers_en_cours: 'Ses dossiers en cours doivent d’abord être réattribués à un membre de l’équipe.',
  incomplet: 'Prénom, nom, e-mail professionnel et périmètre sont obligatoires.',
  email_pris: 'Cet e-mail a déjà un compte.',
  deja: 'Déjà fait.',
}
