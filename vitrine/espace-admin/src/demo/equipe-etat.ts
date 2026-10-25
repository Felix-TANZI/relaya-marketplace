// DONNÉES DE DÉMONSTRATION — l'état des comptes de la console (logique-metier/ACCES-CONSOLE.md) : pour chaque employé,
// son équipe, son niveau, son périmètre, son rôle additionnel, ses accès temporaires et l'état de son compte (invité,
// actif, suspendu, fermé) ; les avertissements, la revue des accès, les dossiers en cours (charge de travail), les accès
// d'urgence, les connexions refusées et les descentes terrain. UNE seule vérité, lue par la session (acces.ts : rôles et
// zones EFFECTIFS de l'agent connecté, compte suspendu = session fermée), par la gouvernance (Rôles et accès, journal)
// et par le domaine « equipe ». Ce module ne dépend que du jeu d'essai (aucun cycle avec acces.ts).
// Jeu d'essai : 22 employés, 8 équipes ; 2 demandes d'accès à valider par la Direction (QY-0008, QY-0009), 6 accès à
// revoir ce trimestre (Service client, rôle additionnel de Franck Penga), 3 accès temporaires qui finissent sous 48 h,
// une revue du trimestre passé en retard (Audit), un accès d'urgence d'hier à revoir.
import { PARAMETRES } from '../calculs/registre'
import { EQUIPES, perimetreParDefaut, rolesEffectifs, type AccesMembre } from '../config/acces-console'
import type { CodeZone, Role } from '../donnees/communs'
import type { AccesTemporaire, ChangementAcces, CodeEquipe, Descente, DossierEnCours, GenreMessage, Niveau, Perimetre, TypeDescente } from '../donnees/domaines/equipe'
import type { EtatCompte } from '../donnees/domaines/gouvernance'
import type { Agent } from '../donnees/domaines/session'
import { maintenant } from './horloge'
import { AGENTS, HEURE, JOUR, T } from './jeu-essai'
import { P6 } from './registre-s6'
import { magasin } from './stockage'

export interface EtatMembre {
  equipe: CodeEquipe
  niveau: Niveau
  perimetre: Perimetre
  roleAdditionnel: Role | null
  temporaires: AccesTemporaire[]
  etat: EtatCompte
  derniereConnexion: number | null
  confirmeLe: number | null
  qy: string | null // invitation dans une équipe à quatre yeux, en attente de la Direction
  amorcage: boolean
  reactiveLe: number | null
  inviteLe: number | null
  suspension: { motif: string; le: number; par: string } | null
  depart: { le: number; motif: string; reattribues: number } | null
  sessionsFermeesLe: number | null // suspension, départ : toute session ouverte avant est fermée
}
export interface MessageStock {
  id: string
  genre: GenreMessage
  texte: string
  deId: string
  de: string
  le: number
  pour: { genre: 'membre'; id: string } | { genre: 'equipe'; equipe: CodeEquipe }
  destinataires: string[]
  lus: Record<string, number>
}
export interface DemandeStock {
  genre: 'niveau' | 'perimetre' | 'role' | 'temporaire' | 'reactivation' | 'invitation'
  membreId: string
  resume: string
  parId: string
  par: string
  le: number
  /** Ce qui s'applique à la contre-signature. */
  apres: { niveau?: Niveau; perimetre?: Perimetre; role?: Role | null; temporaire?: string; motif?: string }
}
export interface UrgenceStock {
  id: string
  agentId: string
  motif: string
  debut: number
  jusqua: number
  fermeeLe: number | null
  revue: { parId: string; par: string; le: number; motif: string } | null
}
export interface EtatEquipe {
  membres: Record<string, EtatMembre>
  nouveaux: Agent[]
  messages: MessageStock[]
  nMessage: number
  nTemporaire: number
  changements: Record<string, ChangementAcces[]>
  /** Décisions de la revue, par trimestre (« 2026-T4 ») puis par ligne. */
  revues: Record<string, Record<string, { decision: 'confirme' | 'retire'; parId: string; par: string; le: number }>>
  dossiers: (DossierEnCours & { equipe: CodeEquipe })[]
  demandes: Record<string, DemandeStock>
  urgences: UrgenceStock[]
  refus: Record<string, { n: number; le: number }>
  descentes: Descente[]
  nDescente: number
  /** Accès temporaires échus déjà notés au journal (retrait automatique). */
  expiresNotes: string[]
}

const j = (n: number) => T(-n * 24 * 60)
const h = (n: number) => T(n * 60)

// ── Trimestres (revue des accès, ADM-REVUE-MOIS) ────────────────────────────────────────────────────────────────────
const YAOUNDE = HEURE
/** Période de revue d'un instant : « 2026-T4 », son début et sa fin (fin de période, 17 h à Yaoundé). */
export function periodeRevue(t: number): { cle: string; debut: number; fin: number } {
  const d = new Date(t + YAOUNDE)
  const pas = PARAMETRES.acces.revueMois
  const m0 = Math.floor(d.getUTCMonth() / pas) * pas
  const debut = Date.UTC(d.getUTCFullYear(), m0, 1) - YAOUNDE
  const fin = Date.UTC(d.getUTCFullYear(), m0 + pas, 0, 17) - YAOUNDE
  return { cle: `${d.getUTCFullYear()}-T${m0 / pas + 1}`, debut, fin }
}

// ── Jeu d'essai ─────────────────────────────────────────────────────────────────────────────────────────────────────
type Graine = [string, CodeEquipe, Niveau, Partial<EtatMembre>?]
const tmp = (id: string, role: Role, motif: string, debut: number, fin: number, par: string, etat: AccesTemporaire['etat'] = 'actif', qy: string | null = null): AccesTemporaire => ({ id, role, motif, debut, fin, par, etat, qy })
const GRAINES: Graine[] = [
  ['a-franck', 'direction', 'responsable', { roleAdditionnel: 'mediation' }],
  ['a-helene', 'direction', 'senior'],
  ['a-mireille', 'litiges', 'responsable'],
  ['a-thierry', 'litiges', 'senior'],
  ['a-sandrine', 'litiges', 'agent'],
  ['a-patrice', 'service_client', 'responsable'],
  ['a-clarisse', 'service_client', 'senior', { temporaires: [tmp('AT-0003', 'mediation', 'Renfort des litiges pendant le congé de Mireille Ngo Bassong', j(5), h(30), 'Pauline Manga')] }],
  ['a-aicha', 'service_client', 'agent', { temporaires: [tmp('AT-0005', 'mediation', 'Renfort des recours pendant le pic de la rentrée (10 jours)', h(1), h(1 + 10 * 24), 'Pauline Manga', 'a_valider', 'QY-0009')] }],
  ['a-paul', 'service_client', 'agent', { derniereConnexion: j(118), confirmeLe: j(150) }],
  ['a-armand', 'verification', 'responsable'],
  ['a-estelle', 'verification', 'agent', { roleAdditionnel: 'support' }],
  ['a-nadege', 'finance', 'responsable'],
  ['a-boris', 'finance', 'agent'],
  ['a-yannick', 'operations', 'responsable', { perimetre: { zones: ['Z1', 'Z2', 'Z3', 'Z6'], niveauLitige: null, plafond: null } }],
  ['a-rodrigue', 'operations', 'senior', { perimetre: { zones: ['Z1', 'Z3', 'Z6'], niveauLitige: null, plafond: null }, temporaires: [tmp('AT-0002', 'operations', 'Remplacement de Yannick Owona à Mokolo pendant sa formation', j(2), h(40), 'Pauline Manga')] }],
  ['a-stephane', 'operations', 'agent', { perimetre: { zones: ['Z1', 'Z3'], niveauLitige: null, plafond: null } }],
  ['a-linda', 'operations', 'agent', { perimetre: { zones: ['Z2', 'Z6'], niveauLitige: null, plafond: null }, temporaires: [tmp('AT-0004', 'operations', 'Pic d’activité de la rentrée à Melen', j(3), h(6), 'Yannick Owona')] }],
  ['a-beatrice', 'audit', 'responsable'],
  ['a-gaston', 'audit', 'agent', { derniereConnexion: j(35) }],
  ['a-pauline', 'acces', 'responsable'],
  ['a-josue', 'acces', 'agent', { temporaires: [tmp('AT-0001', 'rh', 'Arrivées de la rentrée', j(40), j(10), 'Pauline Manga', 'expire')] }],
]

function membreInitial([, equipe, niveau, x]: Graine): EtatMembre {
  return {
    equipe,
    niveau,
    perimetre: x?.perimetre ?? perimetreParDefaut(equipe, niveau),
    roleAdditionnel: x?.roleAdditionnel ?? null,
    temporaires: x?.temporaires ?? [],
    etat: 'actif',
    derniereConnexion: x?.derniereConnexion ?? null,
    confirmeLe: x?.confirmeLe ?? null,
    qy: null,
    amorcage: false,
    reactiveLe: null,
    inviteLe: null,
    suspension: null,
    depart: null,
    sessionsFermeesLe: null,
  }
}

/** Lignes de la revue d'une période (la période courante : 6 sans décision, Service client et Direction). */
function revuesInitiales(): EtatEquipe['revues'] {
  const n = maintenant()
  const ici = periodeRevue(n)
  const avant = periodeRevue(ici.debut - JOUR)
  const tout = (sauf: CodeEquipe[], le: number) => {
    const r: Record<string, { decision: 'confirme'; parId: string; par: string; le: number }> = {}
    for (const g of GRAINES) {
      if (sauf.includes(g[1])) continue
      const resp = GRAINES.find((x) => x[1] === g[1] && x[2] === 'responsable')![0]
      const par = { parId: resp, par: AGENTS.find((a) => a.id === resp)!.prenom }
      r[`${g[0]}:base`] = { decision: 'confirme', ...par, le }
      if (g[3]?.roleAdditionnel) r[`${g[0]}:additionnel`] = { decision: 'confirme', ...par, le }
      for (const t of g[3]?.temporaires ?? []) r[`${g[0]}:temporaire:${t.id}`] = { decision: 'confirme', ...par, le }
    }
    return r
  }
  const courante = tout(['service_client'], ici.debut + 5 * JOUR)
  delete courante['a-franck:additionnel']
  return { [avant.cle]: tout(['audit'], avant.debut + 20 * JOUR), [ici.cle]: courante }
}

const C = (id: TypeDescente) => CONTROLES[id].map((libelle, i) => ({ id: `c${i + 1}`, libelle, ok: null as boolean | null }))
/** Liste de contrôle par type de descente (§ 9). */
export const CONTROLES: Record<TypeDescente, string[]> = {
  verification_boutique: ['Enseigne et adresse conformes à la demande', 'Titulaire rencontré, pièce vue en personne', 'Stock visible et cohérent avec le catalogue', 'Photos du local : façade et intérieur'],
  inspection_relais: ['Espace de garde fermé à clé', 'Étagères et capacité déclarée', 'Horaires affichés à l’entrée', 'Registre papier de secours présent', 'Photos du comptoir et du stockage'],
  recrutement: ['Lieu et repère relevés', 'Titulaire rencontré', 'Conditions de BelivaY expliquées', 'Numéro du titulaire noté (masqué)'],
  constat_litige: ['Colis examiné', 'Emballage et scellé photographiés', 'Version du gérant recueillie', 'Version du client recueillie s’il est présent'],
  controle_zone: ['Relais de la zone visités', 'Accès et repères vérifiés', 'Points de ramassage contrôlés'],
}

function descentesInitiales(): Descente[] {
  const d = (x: Omit<Descente, 'controles' | 'photos' | 'compteRendu' | 'resultat' | 'termineeLe' | 'envoiHorsReseau'> & Partial<Descente>): Descente => ({ controles: C(x.type), photos: [], compteRendu: '', resultat: null, termineeLe: null, envoiHorsReseau: false, ...x })
  return [
    d({ id: 'DT-0012', type: 'constat_litige', zone: 'Z3', lieu: 'Relais Mokolo Marché', repere: 'Entrée du marché, côté gare routière', cible: { genre: 'litige', ref: 'LT-0418', libelle: 'LT-0418 · colis abîmé au comptoir' }, prevueLe: T(85), agentId: 'a-stephane', agent: 'Stéphane Tchoua', statut: 'planifiee', creePar: 'Yannick Owona' }),
    d({ id: 'DT-0013', type: 'controle_zone', zone: 'Z1', lieu: 'Bastos et Nlongkak', repere: 'Du Carrefour Bastos à la pharmacie de Nlongkak', cible: { genre: 'zone', ref: 'Z1', libelle: 'Z1 Centre-ville · contrôle mensuel' }, prevueLe: j(1), agentId: 'a-stephane', agent: 'Stéphane Tchoua', statut: 'terminee', controles: C('controle_zone').map((c) => ({ ...c, ok: true })), photos: [{ id: 'ph-1', nom: 'Relais Bastos Carrefour · façade', le: j(1) + HEURE }], compteRendu: 'Deux relais visités, accès dégagés ; repère de Nlongkak à mettre à jour après les travaux.', resultat: 'conforme', termineeLe: j(1) + 2 * HEURE, creePar: 'Yannick Owona' }),
    d({ id: 'DT-0014', type: 'inspection_relais', zone: 'Z2', lieu: 'Relais Obili', repere: 'Face au lycée d’Obili, boutique bleue', cible: { genre: 'relais', ref: 'r-obili', libelle: 'Relais Obili · avant activation' }, prevueLe: T(115), agentId: 'a-linda', agent: 'Linda Abena', statut: 'en_route', creePar: 'Yannick Owona' }),
    d({ id: 'DT-0015', type: 'recrutement', zone: 'Z6', lieu: 'Biyem-Assi Acacias', repere: 'Carrefour des Acacias', cible: { genre: 'recrutement', ref: 'Z6', libelle: 'Futur relais à Biyem-Assi Acacias' }, prevueLe: T(24 * 60 + 60), agentId: 'a-linda', agent: 'Linda Abena', statut: 'planifiee', creePar: 'Yannick Owona' }),
    d({ id: 'DT-0016', type: 'verification_boutique', zone: 'Z6', lieu: 'Saveurs du Pays', repere: 'Marché de Melen, allée des épices', cible: { genre: 'kyc', ref: 'KYC-0093', libelle: 'KYC-0093 · Saveurs du Pays' }, prevueLe: T(24 * 60 + 180), agentId: null, agent: null, statut: 'planifiee', creePar: 'Yannick Owona' }),
  ]
}

const MESSAGES: MessageStock[] = [
    { id: 'AV-0002', genre: 'consigne', texte: 'Recours LT-0405 : attendre les photos du relais avant toute décision.', deId: 'a-mireille', de: 'Mireille Ngo Bassong', le: T(-120), pour: { genre: 'equipe', equipe: 'litiges' }, destinataires: ['a-thierry', 'a-sandrine'], lus: { 'a-thierry': T(-100) } },
    { id: 'AV-0001', genre: 'rappel', texte: 'Sans connexion avant la fin du mois, votre compte sera fermé. Passez au bureau d’Accès et personnel.', deId: 'a-pauline', de: 'Pauline Manga', le: j(6), pour: { genre: 'membre', id: 'a-paul' }, destinataires: ['a-paul'], lus: {} },
]
export const equipeDemo = magasin<EtatEquipe>('equipe', () => ({
  membres: Object.fromEntries(GRAINES.map((g) => [g[0], membreInitial(g)])),
  nouveaux: [],
  messages: MESSAGES,
  nMessage: 2,
  nTemporaire: 5,
  changements: {
    'a-clarisse': [{ le: j(5), quoi: 'Accès temporaire : Médiation, jusqu’au 15 oct.', par: 'Pauline Manga', motif: 'Renfort des litiges pendant le congé de Mireille Ngo Bassong' }],
    'a-thierry': [{ le: j(45), quoi: 'Niveau : Agent → Senior', par: 'Mireille Ngo Bassong', motif: 'Six mois sans décision infirmée en recours' }],
  },
  revues: revuesInitiales(),
  dossiers: [
    { id: 'LT-0405', libelle: 'LT-0405 · recours de Techno Bastos', agentId: 'a-thierry', depuis: j(3), equipe: 'litiges' },
    { id: 'LT-0412', libelle: 'LT-0412 · article différent de la photo', agentId: 'a-sandrine', depuis: j(2), equipe: 'litiges' },
    { id: 'LT-0418', libelle: 'LT-0418 · colis abîmé au comptoir', agentId: 'a-sandrine', depuis: T(-90), equipe: 'litiges' },
    { id: 'SP-0207', libelle: 'SP-0207 · code de retrait non reçu', agentId: 'a-clarisse', depuis: T(-45), equipe: 'service_client' },
    { id: 'SP-0210', libelle: 'SP-0210 · relais plein, colis refusés', agentId: 'a-clarisse', depuis: T(-25), equipe: 'service_client' },
    { id: 'SP-0208', libelle: 'SP-0208 · versement de vendredi absent', agentId: 'a-aicha', depuis: T(-38), equipe: 'service_client' },
    { id: 'SP-0211', libelle: 'SP-0211 · application bloquée à la photo', agentId: 'a-aicha', depuis: T(-10), equipe: 'service_client' },
    { id: 'KYC-0088', libelle: 'KYC-0088 · Relais Obili', agentId: 'a-armand', depuis: T(-26 * 60), equipe: 'verification' },
    { id: 'KYC-0093', libelle: 'KYC-0093 · Saveurs du Pays', agentId: 'a-estelle', depuis: T(-180), equipe: 'verification' },
    { id: 'KYC-0094', libelle: 'KYC-0094 · Mboa Logistique', agentId: 'a-estelle', depuis: T(-120), equipe: 'verification' },
    { id: 'RB-0031', libelle: 'RB-0031 · remboursement à contresigner', agentId: 'a-boris', depuis: T(-70), equipe: 'finance' },
    { id: 'VS-1016', libelle: 'Lots du vendredi 16 oct.', agentId: 'a-nadege', depuis: j(1), equipe: 'finance' },
    { id: 'FR-261013-01', libelle: 'FR-261013-01 · anneau à Biyem-Assi', agentId: 'a-gaston', depuis: T(-73), equipe: 'audit' },
  ],
  demandes: {
    'QY-0008': { genre: 'perimetre', membreId: 'a-boris', resume: 'Boris Tchinda : plafond 25 000 F → 150 000 F', parId: 'a-pauline', par: 'Pauline Manga', le: T(-150), apres: { perimetre: { zones: null, niveauLitige: null, plafond: 150000 }, motif: 'Reprend les remboursements de Nadège Eyenga le samedi' } },
    'QY-0009': { genre: 'temporaire', membreId: 'a-aicha', resume: 'Aïcha Bouba : Médiation pendant 10 jours', parId: 'a-pauline', par: 'Pauline Manga', le: T(-60), apres: { temporaire: 'AT-0005' } },
  },
  urgences: [{ id: 'UR-0001', agentId: 'a-helene', motif: 'Panne de l’agrégateur la nuit : versement de secours à débloquer sans second compte joignable', debut: T(-20 * 60), jusqua: T(-20 * 60) + 90 * 60_000, fermeeLe: T(-20 * 60) + 70 * 60_000, revue: null }],
  refus: { 'aicha@belivay.com': { n: 4, le: T(-35) } },
  descentes: descentesInitiales(),
  nDescente: 16,
  expiresNotes: ['AT-0001'],
}))

// ── Lectures ────────────────────────────────────────────────────────────────────────────────────────────────────────
export const etatMembre = (id: string): EtatMembre | null => equipeDemo.lire().membres[id] ?? null
export function accesMembre(id: string): AccesMembre | null {
  const m = etatMembre(id)
  return m ? { id, equipe: m.equipe, niveau: m.niveau, perimetre: m.perimetre, roleAdditionnel: m.roleAdditionnel, temporaires: m.temporaires } : null
}
/** L'agent avec ses rôles et ses zones EFFECTIFS (équipe, niveau, rôle additionnel, accès temporaires en cours). */
export function agentEffectif(a: Agent, n = maintenant()): Agent {
  const x = accesMembre(a.id)
  if (!x) return a
  const roles = rolesEffectifs(x, n)
  // Ordre : le rôle de base d'abord (« Agir en tant que » propose les autres).
  return { ...a, roles, zones: x.perimetre.zones ?? (roles.some((r) => r === 'operations' || r === 'terrain') ? a.zones : null) }
}
/** Tous les employés (jeu d'essai et invités), avec leurs accès effectifs. */
export const tousLesAgents = (): Agent[] => [...AGENTS, ...equipeDemo.lire().nouveaux].map((a) => agentEffectif(a))
export const agentConnu = (id: string): Agent | null => tousLesAgents().find((a) => a.id === id) ?? null

/** État du compte (G07 : inactif au-delà de ADM-COMPTE-INACTIF-J → suspendu, réactivable). */
export function etatDuCompte(id: string, n = maintenant()): EtatCompte {
  const m = etatMembre(id)
  if (!m) return 'actif'
  if (m.etat !== 'actif') return m.etat
  const a = [...AGENTS, ...equipeDemo.lire().nouveaux].find((x) => x.id === id)
  const vu = Math.max(...(a?.appareils.map((x) => x.vuLe) ?? [0]), 0)
  const ref = Math.max(m.derniereConnexion ?? vu, m.reactiveLe ?? 0)
  return ref && n - ref > P6.compteInactifJ * JOUR ? 'suspendu' : 'actif'
}

/** Session ouverte à `ouverteLe` encore valable (compte actif, aucune fermeture des sessions depuis) ? */
export function sessionValable(id: string, ouverteLe: number): boolean {
  const m = etatMembre(id)
  if (!m) return true
  if (etatDuCompte(id) !== 'actif') return false
  return !(m.sessionsFermeesLe && m.sessionsFermeesLe >= ouverteLe)
}

/** Note un refus de connexion (alerte « connexions refusées répétées »). */
export function noterRefus(identifiant: string) {
  equipeDemo.ecrire((s) => {
    const k = identifiant.trim().toLowerCase()
    const r = s.refus[k]
    s.refus[k] = { n: (r && maintenant() - r.le < JOUR ? r.n : 0) + 1, le: maintenant() }
  })
}
export const equipeDe = (id: string): CodeEquipe | null => etatMembre(id)?.equipe ?? null
export const def = EQUIPES
export type { CodeZone }
