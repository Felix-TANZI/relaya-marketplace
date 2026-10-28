// DONNÉES DE DÉMONSTRATION — domaine « equipe » (logique-metier/ACCES-CONSOLE.md) : la source tient les règles comme
// le serveur (backend-kit/apps/console/equipes.py), l'écran ne fait que les montrer :
// - § 3 qui donne quoi : refusAttribution (personne pour soi-même ; Responsable dans SON équipe et SON périmètre ;
//   Accès et personnel et Direction pour tout compte ; un compte Direction : la Direction seule) ;
// - quatre yeux (Finance, Direction, Accès et personnel, Audit, plafond au-dessus du seuil, réactivation, accès
//   temporaire long) : la demande attend la Direction (QY), l'effet s'applique à la contre-signature, jamais avant ;
// - § 4 conflits refusés (séparation des tâches) ; § 5 cycle : suspension = sessions fermées tout de suite, départ =
//   dossiers en cours réattribués avant la clôture ; toujours ADM-DIRECTION-MIN comptes Direction actifs ;
// - § 6 avertissements avec accusé de lecture, chaque changement d'accès prévenu au membre, alertes aux administrateurs ;
// - § 7 revue trimestrielle par le responsable ; § 8 accès d'urgence ; § 9 descentes terrain.
// Tout changement d'accès va au journal (avant → après), que l'Audit lit en entier.
import { PARAMETRES } from '../calculs/registre'
import { HEURE, JOUR } from '../calculs/temps'
import { CODES_EQUIPES, DOMAINES, EQUIPES, GESTES_EQUIPE, MOTS_GESTE, NOM_NIVEAU, accesDomaine, conflitBloquant, conflitsDe, droitsEffectifs, exigeQuatreYeux, limiteGeste, niveauPermet, perimetreParDefaut, refusAttribution, rolesEffectifs, texteConflit, type AccesMembre, type Attributeur, type Cible } from '../config/acces-console'
import { PERMISSIONS, droitDe, type Permission } from '../config/droits'
import { NOM_ROLE } from '../config/libelles'
import { AccesRefuse, type Role } from '../donnees/communs'
import type { AlerteAcces, CodeEquipe, DemandeAcces, Descente, DomaineEquipe, IssueAcces, LigneRevue, Membre, MessageMembre, Niveau, Perimetre, RaisonAcces, RevueAcces } from '../donnees/domaines/equipe'
import type { EtatCompte } from '../donnees/domaines/gouvernance'
import { agentCourant, exigerPage, roleCourant, sessionDemo, verifierSession, zonesVisibles } from './acces'
import { kycARevoir } from './acteurs'
import { jetonInvitation } from './agents-actives'
import { CONTROLES, accesMembre, agentConnu, equipeDemo, etatDuCompte, etatMembre, periodeRevue, tousLesAgents, type DemandeStock, type EtatMembre, type MessageStock } from './equipe-etat'
import { maintenant } from './horloge'
import { CLIENTS, COMMANDES, LITIGES, RELAIS, ZONES, nomAgent } from './jeu-essai'
import { journalDemo, journaliser, journaliserSysteme } from './journal'
import { idPont } from './logistique'
import { publier } from './pont'
import { demanderSecond, effetQuatreYeux, quatreYeuxDemo } from './quatreyeux'
import { repondre } from './stockage'

const motifOk = (m: string) => m.trim().length >= PARAMETRES.console.motifMin
const non = <R extends RaisonAcces>(raison: R, detail?: string) => ({ ok: false as const, raison, ...(detail ? { detail } : {}) })
const ADMIN: Role[] = ['superviseur', 'rh']
const nomDe = (id: string) => {
  const a = agentConnu(id)
  return a ? nomAgent(a) : id
}

// ── Qui agit ────────────────────────────────────────────────────────────────────────────────────────────────────────
function moi(): Attributeur {
  const a = agentCourant()
  const m = etatMembre(a.id)
  return { id: a.id, equipe: m?.equipe ?? 'direction', niveau: m?.niveau ?? 'agent', perimetre: m?.perimetre ?? { zones: null, niveauLitige: null, plafond: null }, roles: [roleCourant()] }
}
const estAdmin = () => ADMIN.includes(roleCourant())
/** Équipes que le compte connecté gère : toutes (Accès et personnel, Direction) ou la sienne (Responsable). */
function gerees(): CodeEquipe[] {
  if (estAdmin()) return [...CODES_EQUIPES]
  const p = moi()
  return p.niveau === 'responsable' ? [p.equipe] : []
}
/** Lecture de l'équipe : Rôles et accès (Direction, Accès et personnel, Audit en lecture) ou Mon équipe (Responsable). */
function exigerLectureEquipe(equipe?: CodeEquipe) {
  verifierSession()
  const r = roleCourant()
  if (ADMIN.includes(r) || r === 'audit') return exigerPage('roles', 'Équipe et accès')
  exigerPage('mon-equipe', 'Mon équipe')
  if (equipe && equipe !== moi().equipe) throw new AccesRefuse('Une autre équipe que la sienne', ['superviseur', 'rh'])
}
/** Geste sur un compte : Direction ou Accès et personnel (Rôles et accès), ou Responsable d'équipe (Mon équipe). */
function exigerGestion(): Attributeur {
  verifierSession()
  const r = roleCourant()
  if (ADMIN.includes(r)) exigerPage('roles', 'Équipe et accès')
  else exigerPage('mon-equipe', 'Mon équipe')
  if (droitDe('roles', r).acces === 'lecture') throw new AccesRefuse('Modifier un accès', ADMIN)
  return moi()
}

// ── Vues ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function issueQY(qy: string): 'a_contresigner' | 'contresignee' | 'refusee' {
  const d = quatreYeuxDemo.lire().decisions.find((x) => x.id === qy)
  if (!d) return 'a_contresigner'
  if (d.etat === 'a_contresigner' && d.expireLe <= maintenant()) return 'refusee'
  return d.etat === 'contresignee' ? 'contresignee' : d.etat === 'refusee' ? 'refusee' : 'a_contresigner'
}
function etatVu(id: string, m: EtatMembre): EtatCompte {
  if (m.etat === 'a_contresigner' && m.qy && issueQY(m.qy) === 'refusee') return 'ferme'
  return etatDuCompte(id)
}
const acces = (id: string, m: EtatMembre): AccesMembre => ({ id, equipe: m.equipe, niveau: m.niveau, perimetre: m.perimetre, roleAdditionnel: m.roleAdditionnel, temporaires: m.temporaires })
function vue(id: string, n = maintenant()): Membre | null {
  const s = equipeDemo.lire()
  const m = s.membres[id]
  const a = agentConnu(id)
  if (!m || !a) return null
  const etat = etatVu(id, m)
  const inviteLe = m.inviteLe
  const u = s.urgences.find((x) => x.agentId === id && !x.fermeeLe && x.jusqua > n)
  const vu = Math.max(...a.appareils.map((x) => x.vuLe), 0) || null
  const p = periodeRevue(n)
  const r = s.revues[p.cle]?.[`${id}:base`]
  return {
    agent: a,
    equipe: m.equipe,
    niveau: m.niveau,
    perimetre: m.perimetre,
    roleAdditionnel: m.roleAdditionnel,
    temporaires: m.temporaires.map((t) => ({ ...t, etat: t.etat === 'actif' && t.fin <= n ? 'expire' : t.etat })),
    etat,
    derniereConnexion: m.derniereConnexion ?? vu,
    inviteLe,
    jetonActivation: etat === 'invitation' && inviteLe ? jetonInvitation(id, inviteLe) : null,
    suspension: etat === 'suspendu' ? m.suspension : null,
    depart: m.depart,
    revueLe: r?.decision === 'confirme' ? r.le : null,
    dossiers: s.dossiers.filter((d) => d.agentId === id).length,
    urgence: u ? { jusqua: u.jusqua, motif: u.motif } : null,
    conflits: conflitsDe(rolesEffectifs(acces(id, m), n)),
  }
}
const membres = () => Object.keys(equipeDemo.lire().membres).map((id) => vue(id)).filter((x): x is Membre => !!x)
const directionActifs = () => membres().filter((m) => m.equipe === 'direction' && m.etat === 'actif').length
const cible = (id: string): (Cible & { m: EtatMembre; etat: EtatCompte }) | null => {
  const m = etatMembre(id)
  return m ? { id, equipe: m.equipe, niveau: m.niveau, m, etat: etatVu(id, m) } : null
}

/** Accès temporaires arrivés à leur fin : retirés tout seuls, journalisés, le membre prévenu (une fois chacun). */
async function balayer() {
  const n = maintenant()
  const s = equipeDemo.lire()
  const echus: [string, string, Role][] = []
  for (const [id, m] of Object.entries(s.membres)) for (const t of m.temporaires) if (t.etat === 'actif' && t.fin <= n && !s.expiresNotes.includes(t.id)) echus.push([id, t.id, t.role])
  if (!echus.length) return
  equipeDemo.ecrire((e) => {
    for (const [id, tid] of echus) {
      const t = e.membres[id].temporaires.find((x) => x.id === tid)!
      t.etat = 'expire'
      e.expiresNotes.push(tid)
      ;(e.changements[id] ??= []).unshift({ le: n, quoi: `Accès temporaire ${NOM_ROLE[t.role]} retiré à sa fin`, par: 'Système BelivaY', motif: null })
    }
  })
  for (const [id, tid, role] of echus) await journaliserSysteme({ action: 'acces.temporaire_expire', objet: `Compte ${nomDe(id)}`, motif: `${tid} : fin atteinte, retiré tout seul`, avant: NOM_ROLE[role], apres: 'Retiré' })
}

function noterChangement(e: { changements: Record<string, { le: number; quoi: string; par: string; motif: string | null }[]> }, id: string, quoi: string, motif: string | null) {
  ;(e.changements[id] ??= []).unshift({ le: maintenant(), quoi, par: nomAgent(agentCourant()), motif })
}

// ── Quatre yeux : la demande attend la Direction, l'effet s'applique à la contre-signature ───────────────────────────
async function appliquer(d: DemandeStock): Promise<void> {
  const nom = nomDe(d.membreId)
  const m = etatMembre(d.membreId)
  if (!m) return
  const motif = d.apres.motif ?? null
  switch (d.genre) {
    case 'niveau':
      equipeDemo.ecrire((e) => {
        Object.assign(e.membres[d.membreId], { niveau: d.apres.niveau!, ...(d.apres.perimetre ? { perimetre: d.apres.perimetre } : {}) })
        noterChangement(e, d.membreId, `Niveau : ${NOM_NIVEAU[m.niveau]} → ${NOM_NIVEAU[d.apres.niveau!]}`, motif)
      })
      await journaliser({ action: 'acces.niveau', objet: `Compte ${nom}`, motif, avant: NOM_NIVEAU[m.niveau], apres: NOM_NIVEAU[d.apres.niveau!] })
      return
    case 'perimetre':
      equipeDemo.ecrire((e) => {
        e.membres[d.membreId].perimetre = d.apres.perimetre!
        noterChangement(e, d.membreId, `Périmètre : ${textePerimetre(d.apres.perimetre!)}`, motif)
      })
      await journaliser({ action: 'acces.perimetre', objet: `Compte ${nom}`, motif, avant: textePerimetre(m.perimetre), apres: textePerimetre(d.apres.perimetre!) })
      return
    case 'role':
      equipeDemo.ecrire((e) => {
        e.membres[d.membreId].roleAdditionnel = d.apres.role ?? null
        noterChangement(e, d.membreId, d.apres.role ? `Rôle additionnel : ${NOM_ROLE[d.apres.role]}` : 'Rôle additionnel retiré', motif)
      })
      await journaliser({ action: 'acces.role', objet: `Compte ${nom}`, motif, avant: m.roleAdditionnel ? NOM_ROLE[m.roleAdditionnel] : 'Aucun', apres: d.apres.role ? NOM_ROLE[d.apres.role] : 'Aucun' })
      return
    case 'temporaire': {
      const t = m.temporaires.find((x) => x.id === d.apres.temporaire)
      if (!t) return
      equipeDemo.ecrire((e) => {
        const x = e.membres[d.membreId].temporaires.find((y) => y.id === t.id)!
        x.etat = 'actif'
        noterChangement(e, d.membreId, `Accès temporaire : ${NOM_ROLE[t.role]} jusqu’au ${jourCourt(t.fin)}`, t.motif)
      })
      await journaliser({ action: 'acces.temporaire', objet: `Compte ${nom}`, motif: t.motif, avant: null, apres: `${NOM_ROLE[t.role]} · ${t.id} · fin ${jourCourt(t.fin)}` })
      return
    }
    case 'reactivation':
      equipeDemo.ecrire((e) => {
        Object.assign(e.membres[d.membreId], { etat: 'actif', reactiveLe: maintenant(), suspension: null })
        noterChangement(e, d.membreId, 'Compte réactivé', motif)
      })
      await journaliser({ action: 'acces.reactiver', objet: `Compte ${nom}`, motif, avant: 'Suspendu', apres: 'Actif' })
      return
    case 'invitation':
      equipeDemo.ecrire((e) => Object.assign(e.membres[d.membreId], { etat: 'invitation', inviteLe: maintenant(), qy: null }))
      await journaliser({ action: 'acces.inviter', objet: `Compte ${nom}`, motif, avant: null, apres: `${EQUIPES[m.equipe].nom} · ${NOM_NIVEAU[m.niveau]} · invitation envoyée` })
      return
  }
}
effetQuatreYeux('acces.', async (_objet, d) => {
  const dem = equipeDemo.lire().demandes[d.id]
  if (!dem) return
  if (d.etat === 'contresignee') await appliquer(dem)
  else
    equipeDemo.ecrire((e) => {
      const m = e.membres[dem.membreId]
      if (dem.genre === 'temporaire') {
        const t = m?.temporaires.find((x) => x.id === dem.apres.temporaire)
        if (t) t.etat = 'refuse'
      }
      if (dem.genre === 'invitation' && m) m.etat = 'ferme'
    })
  equipeDemo.ecrire((e) => void delete e.demandes[d.id])
})

async function demanderOuAppliquer(quatre: boolean, d: Omit<DemandeStock, 'parId' | 'par' | 'le'>, motif: string): Promise<IssueAcces> {
  const a = agentCourant()
  const dem: DemandeStock = { ...d, parId: a.id, par: nomAgent(a), le: maintenant() }
  if (!quatre) {
    await appliquer(dem)
    return { ok: true, etat: 'applique', qy: null }
  }
  const qy = await demanderSecond({ action: `acces.${d.genre}`, objet: `Compte ${nomDe(d.membreId)}`, resume: d.resume, motif, preuves: [], quatreYeux: true, rolesSecond: ['superviseur'] })
  equipeDemo.ecrire((e) => void (e.demandes[qy] = dem))
  return { ok: true, etat: 'a_contresigner', qy }
}

// ── Textes ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const fr = (f: number) => `${f.toLocaleString('fr-FR').replace(/[\s  ]/g, ' ')} F`
export function textePerimetre(p: Perimetre): string {
  const x = p.zones ? [p.zones.join(', ')] : ['tout le périmètre']
  if (p.niveauLitige) x.push(`litiges niveau ${p.niveauLitige}`)
  if (p.plafond !== null) x.push(`plafond ${fr(p.plafond)}`)
  return x.join(' · ')
}
const jourCourt = (t: number) => new Date(t + HEURE).toISOString().slice(0, 10).split('-').reverse().slice(0, 2).join('/')

// ── Alertes aux administrateurs (§ 6) ───────────────────────────────────────────────────────────────────────────────
export function alertesAcces(n = maintenant()): AlerteAcces[] {
  const s = equipeDemo.lire()
  const out: AlerteAcces[] = []
  const P = PARAMETRES.acces
  for (const m of membres()) {
    if (m.etat === 'actif' && m.derniereConnexion && n - m.derniereConnexion > P.alerteInactifJ * JOUR)
      out.push({ id: `IN-${m.agent.id}`, genre: 'inactif', membreId: m.agent.id, titre: `${nomAgent(m.agent)} · aucune connexion depuis ${Math.floor((n - m.derniereConnexion) / JOUR)} jours`, sous: `${EQUIPES[m.equipe].nom} · réduire ou suspendre`, le: m.derniereConnexion, echeance: null })
    for (const t of m.temporaires)
      if (t.etat === 'actif' && t.fin > n && t.fin - n <= P.alerteExpireH * HEURE)
        out.push({ id: `EX-${t.id}`, genre: 'temporaire_expire', membreId: m.agent.id, titre: `${nomAgent(m.agent)} · ${NOM_ROLE[t.role]} finit le ${jourCourt(t.fin)}`, sous: t.motif, le: t.debut, echeance: t.fin })
    if (m.etat === 'actif') for (const c of m.conflits) out.push({ id: `CF-${m.agent.id}-${c.roles.join('-')}`, genre: 'conflit', membreId: m.agent.id, titre: `${nomAgent(m.agent)} · conflit ${NOM_ROLE[c.roles[0]]} + ${NOM_ROLE[c.roles[1]]}`, sous: c.dossier ? 'Jamais sur le même dossier' : c.raison, le: n, echeance: null })
  }
  for (const [k, r] of Object.entries(s.refus))
    if (r.n >= PARAMETRES.console.echecsAvantBlocage - 1 && n - r.le < JOUR) {
      const a = tousLesAgents().find((x) => x.email === k)
      out.push({ id: `RF-${k}`, genre: 'connexions_refusees', membreId: a?.id ?? null, titre: `${a ? nomAgent(a) : k} · ${r.n} connexions refusées`, sous: 'Vérifier l’appareil ; réinitialiser si besoin', le: r.le, echeance: null })
    }
  const avant = periodeRevue(periodeRevue(n).debut - JOUR)
  for (const e of CODES_EQUIPES) {
    const l = lignesRevue(e, avant.cle)
    if (l.some((x) => !x.decision)) out.push({ id: `RV-${e}-${avant.cle}`, genre: 'revue_retard', membreId: null, titre: `Revue des accès en retard · ${EQUIPES[e].nom}`, sous: `${l.filter((x) => !x.decision).length} accès sans réponse (${avant.cle})`, le: avant.fin, echeance: avant.fin })
  }
  for (const u of s.urgences)
    if (!u.revue && (u.fermeeLe ?? u.jusqua) <= n) out.push({ id: `UR-${u.id}`, genre: 'urgence_a_revoir', membreId: u.agentId, titre: `Accès d’urgence de ${nomDe(u.agentId)} à revoir`, sous: u.motif, le: u.debut, echeance: u.debut + JOUR + 12 * HEURE })
  return out
}

function demandesEnAttente(): DemandeAcces[] {
  return Object.entries(equipeDemo.lire().demandes)
    .filter(([qy]) => issueQY(qy) === 'a_contresigner')
    .map(([qy, d]) => ({ qy, genre: d.genre, membreId: d.membreId, nom: nomDe(d.membreId), resume: d.resume, par: d.par, le: d.le }))
}

// ── Revue (§ 7) ─────────────────────────────────────────────────────────────────────────────────────────────────────
function lignesRevue(equipe: CodeEquipe, cle: string): LigneRevue[] {
  const s = equipeDemo.lire()
  const dec = s.revues[cle] ?? {}
  const out: LigneRevue[] = []
  for (const [id, m] of Object.entries(s.membres)) {
    if (m.equipe !== equipe || m.etat === 'ferme' || m.etat === 'invitation' || m.etat === 'a_contresigner') continue
    const nom = nomDe(id)
    const l = (k: string, acces: string, genre: LigneRevue['genre']) => out.push({ id: `${id}:${k}`, membreId: id, nom, acces, genre, decision: dec[`${id}:${k}`]?.decision ?? null, par: dec[`${id}:${k}`]?.par ?? null })
    l('base', `${EQUIPES[m.equipe].nom} · ${NOM_NIVEAU[m.niveau]} · ${textePerimetre(m.perimetre)}`, 'base')
    if (m.roleAdditionnel) l('additionnel', `Rôle additionnel : ${NOM_ROLE[m.roleAdditionnel]}`, 'additionnel')
    for (const t of m.temporaires) if (t.etat === 'actif' && t.fin > maintenant()) l(`temporaire:${t.id}`, `Accès temporaire : ${NOM_ROLE[t.role]} jusqu’au ${jourCourt(t.fin)}`, 'temporaire')
  }
  return out
}
function revueDe(equipe: CodeEquipe): RevueAcces {
  const n = maintenant()
  const p = periodeRevue(n)
  const lignes = lignesRevue(equipe, p.cle)
  const resp = Object.entries(equipeDemo.lire().membres).find(([, m]) => m.equipe === equipe && m.niveau === 'responsable' && m.etat === 'actif')?.[0]
  const avant = periodeRevue(p.debut - JOUR)
  return { equipe, responsable: resp ? nomDe(resp) : null, echeance: p.fin, enRetard: lignesRevue(equipe, avant.cle).some((x) => !x.decision) || (n > p.fin && lignes.some((x) => !x.decision)), lignes }
}

// ── Descentes (§ 9) ─────────────────────────────────────────────────────────────────────────────────────────────────
function agentsTerrain() {
  return membres()
    .filter((m) => m.agent.roles.includes('terrain') && m.etat === 'actif')
    .map((m) => ({ id: m.agent.id, nom: nomAgent(m.agent), zones: m.perimetre.zones ?? [], aFaire: equipeDemo.lire().descentes.filter((d) => d.agentId === m.agent.id && d.statut !== 'terminee' && d.statut !== 'annulee').length }))
}
function exigerPlanification(zone?: string) {
  exigerPage('descentes', 'Descentes terrain')
  if (droitDe('descentes', roleCourant()).acces === 'lecture') throw new AccesRefuse('Planifier une descente', ['superviseur', 'operations'])
  const z = zonesVisibles()
  if (zone && z && !z.includes(zone)) return false
  return true
}
function maDescente(id: string): Descente {
  verifierSession()
  const d = equipeDemo.lire().descentes.find((x) => x.id === id)
  if (roleCourant() === 'terrain') {
    exigerPage('mes-descentes', 'Mes descentes')
    if (!d || d.agentId !== agentCourant().id) throw new AccesRefuse('La descente d’un autre agent', ['operations', 'superviseur'])
    return d
  }
  exigerPage('descentes', 'Descentes terrain')
  const z = zonesVisibles()
  if (!d || (z && !z.includes(d.zone))) throw new AccesRefuse('Une descente hors de vos zones', ['superviseur'])
  return d
}
const majDescente = (id: string, f: (d: Descente) => void) => equipeDemo.ecrire((e) => f(e.descentes.find((x) => x.id === id)!))

// ── Sécurité de l'employé, Voir comme le client ────────────────────────────────────────────────────────────────────
const SENSIBLES_2FA: CodeEquipe[] = ['finance', 'direction', 'acces']
export const applicationObligatoire = (id: string) => SENSIBLES_2FA.includes(etatMembre(id)?.equipe ?? 'service_client')
const vuesClient = new Map<string, { client: string; jusqua: number }>()
const securite: Pick<DomaineEquipe, 'mesSessions' | 'fermerAutresSessions' | 'ouvrirVueClient' | 'vueClient'> = {
  async mesSessions() {
    verifierSession()
    const a = agentCourant()
    const m = etatMembre(a.id)
    const fermeesLe = m?.sessionsFermeesLe ?? 0
    return repondre({
      sessions: a.appareils.map((x) => ({ id: x.id, appareil: x.nom, vuLe: x.vuLe, courante: x.courant && x === a.appareils.find((y) => y.courant), fermee: !(x.courant && x === a.appareils.find((y) => y.courant)) && x.vuLe <= fermeesLe })),
      secondFacteur: a.secondFacteur,
      applicationObligatoire: applicationObligatoire(a.id),
      verrouillage: { echecs: equipeDemo.lire().refus[a.email]?.n ?? 0, avant: PARAMETRES.console.echecsAvantBlocage, minutes: PARAMETRES.console.blocageMinutes },
    })
  },
  async fermerAutresSessions() {
    verifierSession()
    const a = agentCourant()
    const n = maintenant()
    const autres = a.appareils.filter((x) => x !== a.appareils.find((y) => y.courant)).length
    equipeDemo.ecrire((e) => {
      if (e.membres[a.id]) e.membres[a.id].sessionsFermeesLe = n
      noterChangement(e, a.id, `${autres} autre(s) session(s) fermée(s) depuis le Profil`, null)
    })
    // La session de cet appareil reste ouverte : elle repart de maintenant.
    sessionDemo.ecrire((s) => void (s.ouverteLe = n + 1))
    await journaliser({ action: 'session.fermer_autres', objet: `Compte ${nomAgent(a)}`, motif: null, apres: `${autres} session(s) fermée(s)` })
    return { fermees: autres }
  },
  async ouvrirVueClient(client: string, motif: string) {
    verifierSession()
    if (!['support', 'superviseur'].includes(roleCourant())) throw new AccesRefuse('Voir comme le client', ['support', 'superviseur'])
    exigerPage('vue-client', 'Voir comme le client')
    const c = CLIENTS.find((x) => x.id === client)
    if (!c) return { ok: false as const, raison: 'inconnu' as const }
    if (!motifOk(motif)) return { ok: false as const, raison: 'motif_court' as const }
    const jusqua = maintenant() + PARAMETRES.console.demasqueMin * 60_000
    vuesClient.set(agentCourant().id, { client, jusqua })
    await journaliser({ action: 'support.voir_comme_client', objet: c.masque, motif: motif.trim(), zone: c.zone, avant: null, apres: `Lecture seule jusqu’à ${new Date(jusqua + HEURE).toISOString().slice(11, 16)}` })
    return { ok: true as const, jusqua }
  },
  async vueClient(client: string) {
    verifierSession()
    exigerPage('vue-client', 'Voir comme le client')
    const v = vuesClient.get(agentCourant().id)
    if (!v || v.client !== client || v.jusqua <= maintenant()) return null
    const c = CLIENTS.find((x) => x.id === client)!
    return repondre({
      client: c.masque,
      zone: c.zone,
      jusqua: v.jusqua,
      commandes: COMMANDES.filter((x) => x.client === client).map((x) => ({ ref: x.ref, vendeurs: x.vendeurs.join(', '), relais: x.relais, total: x.total, etat: x.etat })),
      abonnement: null,
    })
  },
}


// ── Domaine ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const demoEquipe: DomaineEquipe = {
  ...securite,
  async tableau() {
    verifierSession()
    exigerPage('roles', 'Équipe et accès')
    await balayer()
    const n = maintenant()
    const l = membres()
    const p = periodeRevue(n)
    const moiM = etatMembre(agentCourant().id)
    return repondre({
      membres: l,
      equipes: CODES_EQUIPES.map((code) => {
        const x = l.filter((m) => m.equipe === code && m.etat !== 'ferme')
        const r = x.find((m) => m.niveau === 'responsable')
        return { code, responsable: r ? nomAgent(r.agent) : null, actifs: x.filter((m) => m.etat === 'actif').length, membres: x.length }
      }),
      demandes: demandesEnAttente(),
      aRevoir: CODES_EQUIPES.flatMap((e) => lignesRevue(e, p.cle)).filter((x) => !x.decision).length,
      expirent: l.flatMap((m) => m.temporaires).filter((t) => t.etat === 'actif' && t.fin > n && t.fin - n <= PARAMETRES.acces.alerteExpireH * HEURE).length,
      alertes: alertesAcces(n),
      directionActifs: directionActifs(),
      directionMin: PARAMETRES.acces.directionMin,
      seuil: PARAMETRES.console.seuilRemboursementQuatreYeux,
      gere: droitDe('roles', roleCourant()).acces === 'lecture' ? [] : gerees(),
      moi: moiM ? { id: agentCourant().id, equipe: moiM.equipe, niveau: moiM.niveau } : null,
    })
  },
  async membre(id) {
    verifierSession()
    const m0 = etatMembre(id)
    if (!m0) return null
    exigerLectureEquipe(m0.equipe)
    await balayer()
    const m = vue(id)!
    const s = equipeDemo.lire()
    const x = accesMembre(id)!
    const par = moi()
    const peut = (g: Parameters<typeof refusAttribution>[2]) => droitDe('roles', roleCourant()).acces !== 'lecture' && (estAdmin() || droitDe('mon-equipe', roleCourant()).acces !== 'aucun') && refusAttribution(par, { id, equipe: m.equipe, niveau: m.niveau }, g) === null
    const historique = journalDemo
      .lire()
      .lignes.filter((l) => l.objet === `Compte ${nomAgent(m.agent)}` || (l.agentId === id && l.action.startsWith('session.')))
      .reverse()
      .slice(0, 40)
    return repondre({
      membre: m,
      droits: droitsEffectifs(x, maintenant()),
      historique,
      messages: messagesVus(s.messages.filter((y) => y.destinataires.includes(id)), id),
      gestes: { niveau: peut('niveau'), perimetre: peut('perimetre'), temporaire: peut('temporaire'), avertir: peut('avertir'), suspendre: peut('suspendre') && m.etat === 'actif', reactiver: peut('reactiver') && m.etat === 'suspendu', desactiver: peut('desactiver') && m.etat !== 'ferme', role: peut('role') },
      repreneurs: membres()
        .filter((y) => y.equipe === m.equipe && y.agent.id !== id && y.etat === 'actif')
        .map((y) => ({ id: y.agent.id, nom: nomAgent(y.agent) })),
    })
  },
  async quiPeut() {
    verifierSession()
    exigerPage('roles', 'Équipe et accès')
    const n = maintenant()
    const l = membres().filter((m) => m.etat === 'actif')
    const gestes = [
      ...(Object.entries(PERMISSIONS) as [Permission, (typeof PERMISSIONS)[Permission]][]).map(([id, g]) => ({
        id,
        quoi: g.quoi,
        mots: MOTS_GESTE[id] ?? [],
        membres: l
          .filter((m) => g.roles.some((r) => m.agent.roles.includes(r)) && niveauPermet(id, m.niveau))
          .map((m) => ({ id: m.agent.id, nom: nomAgent(m.agent), equipe: m.equipe, niveau: m.niveau, limite: limiteGeste(id, accesMembre(m.agent.id)!, m.agent.roles) })),
      })),
      ...GESTES_EQUIPE.map((g) => ({ id: g.id, quoi: g.quoi, mots: g.mots, membres: l.filter((m) => g.ok(m.agent.roles, m.niveau)).map((m) => ({ id: m.agent.id, nom: nomAgent(m.agent), equipe: m.equipe, niveau: m.niveau, limite: null })) })),
    ]
    const matrice = CODES_EQUIPES.map((e) => ({ equipe: e, domaines: DOMAINES.map((d) => ({ id: d.id, acces: accesDomaine(d.routes, [...new Set((['agent', 'senior', 'responsable'] as Niveau[]).flatMap((nv) => EQUIPES[e].roles[nv]))]), note: e === 'operations' && d.id === 'logistique' ? 'Ses zones' : null })) }))
    void n
    return repondre({ gestes, matrice, domaines: DOMAINES.map((d) => ({ id: d.id, nom: d.nom })) })
  },

  async inviter(x, motif) {
    const par = exigerGestion()
    if (!motifOk(motif)) return non('motif_court')
    const def = EQUIPES[x.equipe]
    if (!x.prenom.trim() || !x.nom.trim() || !/^[^@\s]+@belivay\.com$/.test(x.email.trim()) || (def.zones && !x.zones?.length)) return non('incomplet')
    if (tousLesAgents().some((a) => a.email === x.email.trim().toLowerCase())) return non('email_pris')
    const perimetre = perimetreParDefaut(x.equipe, x.niveau, def.zones ? x.zones : null)
    const r = refusAttribution(par, { id: null, equipe: x.equipe, niveau: x.niveau }, 'inviter', { equipe: x.equipe, niveau: x.niveau, perimetre })
    if (r) return non(r)
    const quatre = exigeQuatreYeux('inviter', { id: null, equipe: x.equipe, niveau: x.niveau }, { equipe: x.equipe, perimetre })
    const id = `a-${(x.prenom + '-' + x.nom).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-')}`
    const roles = def.roles[x.niveau]
    equipeDemo.ecrire((e) => {
      e.nouveaux.push({ id, prenom: x.prenom.trim(), nom: x.nom.trim(), initiales: (x.prenom.trim()[0] + x.nom.trim()[0]).toUpperCase(), roles, zones: perimetre.zones, telephone: '—', email: x.email.trim().toLowerCase(), secondFacteur: 'application', appareils: [] })
      e.membres[id] = { equipe: x.equipe, niveau: x.niveau, perimetre, roleAdditionnel: null, temporaires: [], etat: quatre ? 'a_contresigner' : 'invitation', derniereConnexion: null, confirmeLe: null, qy: null, amorcage: false, reactiveLe: null, inviteLe: quatre ? null : maintenant(), suspension: null, depart: null, sessionsFermeesLe: null }
    })
    if (!quatre) {
      await journaliser({ action: 'acces.inviter', objet: `Compte ${x.prenom.trim()} ${x.nom.trim()}`, motif, avant: null, apres: `${def.nom} · ${NOM_NIVEAU[x.niveau]} · ${textePerimetre(perimetre)} · invitation envoyée` })
      return { ok: true, etat: 'applique', qy: null, id }
    }
    const i = await demanderOuAppliquer(true, { genre: 'invitation', membreId: id, resume: `Inviter ${x.prenom.trim()} ${x.nom.trim()} : ${def.nom} · ${NOM_NIVEAU[x.niveau]}`, apres: { motif } }, motif)
    if (i.ok && i.qy) equipeDemo.ecrire((e) => void (e.membres[id].qy = i.qy))
    return i.ok ? { ...i, id } : i
  },
  async changerNiveau(id, niveau, motif) {
    const par = exigerGestion()
    if (!motifOk(motif)) return non('motif_court')
    const c = cible(id)
    if (!c) return non('inconnu')
    if (c.etat !== 'actif') return non('etat')
    if (c.niveau === niveau) return non('deja')
    const perimetre = { ...perimetreParDefaut(c.equipe, niveau, c.m.perimetre.zones), zones: c.m.perimetre.zones }
    const r = refusAttribution(par, c, 'niveau', { niveau, perimetre })
    if (r) return non(r)
    const k = conflitBloquant(rolesEffectifs({ ...acces(id, c.m), niveau }, maintenant()))
    if (k) return non('conflit', texteConflit(k))
    return demanderOuAppliquer(exigeQuatreYeux('niveau', c, { niveau, perimetre }), { genre: 'niveau', membreId: id, resume: `${nomDe(id)} : ${NOM_NIVEAU[c.niveau]} → ${NOM_NIVEAU[niveau]}`, apres: { niveau, perimetre, motif } }, motif)
  },
  async changerPerimetre(id, p, motif) {
    const par = exigerGestion()
    if (!motifOk(motif)) return non('motif_court')
    const c = cible(id)
    if (!c) return non('inconnu')
    if (c.etat !== 'actif' && c.etat !== 'invitation') return non('etat')
    const def = EQUIPES[c.equipe]
    const q: Perimetre = { zones: def.zones ? p.zones : null, niveauLitige: def.litige === null ? null : (Math.min(p.niveauLitige ?? 1, def.litige) as 1 | 2), plafond: def.plafond ? p.plafond : null }
    if (def.zones && !q.zones?.length) return non('incomplet')
    const r = refusAttribution(par, c, 'perimetre', { perimetre: q })
    if (r) return non(r)
    return demanderOuAppliquer(exigeQuatreYeux('perimetre', c, { perimetre: q }), { genre: 'perimetre', membreId: id, resume: `${nomDe(id)} : ${textePerimetre(q)}`, apres: { perimetre: q, motif } }, motif)
  },
  async changerRole(id, role, motif) {
    const par = exigerGestion()
    if (!motifOk(motif)) return non('motif_court')
    const c = cible(id)
    if (!c) return non('inconnu')
    if (c.etat !== 'actif') return non('etat')
    const r = refusAttribution(par, c, 'role', { role })
    if (r) return non(r)
    if (role) {
      const k = conflitBloquant(rolesEffectifs({ ...acces(id, c.m), roleAdditionnel: role }, maintenant()))
      if (k) return non('conflit', texteConflit(k))
    }
    return demanderOuAppliquer(exigeQuatreYeux('role', c, { role }), { genre: 'role', membreId: id, resume: role ? `${nomDe(id)} : rôle additionnel ${NOM_ROLE[role]}` : `${nomDe(id)} : rôle additionnel retiré`, apres: { role, motif } }, motif)
  },
  async donnerTemporaire(id, t) {
    const par = exigerGestion()
    if (!motifOk(t.motif)) return non('motif_court')
    const c = cible(id)
    if (!c) return non('inconnu')
    if (c.etat !== 'actif') return non('etat')
    const r = refusAttribution(par, c, 'temporaire', { role: t.role })
    if (r) return non(r)
    const n = maintenant()
    const duree = t.fin - n
    if (!(duree > 0) || duree > PARAMETRES.acces.tempMaxJ * JOUR) return non('duree')
    const k = conflitBloquant([...rolesEffectifs(acces(id, c.m), n), t.role])
    if (k) return non('conflit', texteConflit(k))
    const quatre = exigeQuatreYeux('temporaire', c, { dureeMs: duree, roleTemporaire: t.role })
    let tid = ''
    equipeDemo.ecrire((e) => {
      e.nTemporaire++
      tid = `AT-${String(e.nTemporaire).padStart(4, '0')}`
      e.membres[id].temporaires.push({ id: tid, role: t.role, motif: t.motif.trim(), debut: n, fin: t.fin, par: nomAgent(agentCourant()), etat: quatre ? 'a_valider' : 'actif', qy: null })
    })
    const i = await demanderOuAppliquer(quatre, { genre: 'temporaire', membreId: id, resume: `${nomDe(id)} : ${NOM_ROLE[t.role]} jusqu’au ${jourCourt(t.fin)}`, apres: { temporaire: tid, motif: t.motif } }, t.motif)
    if (i.ok && i.qy) equipeDemo.ecrire((e) => void (e.membres[id].temporaires.find((x) => x.id === tid)!.qy = i.qy))
    return i.ok ? { ...i, id: tid } : i
  },
  async retirerTemporaire(id, tid, motif) {
    const par = exigerGestion()
    if (!motifOk(motif)) return non('motif_court')
    const c = cible(id)
    const t = c?.m.temporaires.find((x) => x.id === tid)
    if (!c || !t) return non('inconnu')
    const r = refusAttribution(par, c, 'temporaire')
    if (r) return non(r)
    if (t.etat !== 'actif' && t.etat !== 'a_valider') return non('etat')
    equipeDemo.ecrire((e) => {
      e.membres[id].temporaires.find((x) => x.id === tid)!.etat = 'retire'
      noterChangement(e, id, `Accès temporaire ${NOM_ROLE[t.role]} retiré`, motif)
    })
    await journaliser({ action: 'acces.temporaire_retirer', objet: `Compte ${nomDe(id)}`, motif, avant: `${NOM_ROLE[t.role]} · ${tid}`, apres: 'Retiré' })
    return { ok: true, etat: 'applique', qy: null }
  },
  async avertir(a, genre, texte) {
    const par = exigerGestion()
    if (!motifOk(texte)) return non('motif_court')
    let pour: MessageStock['pour']
    let dest: string[]
    if (a.genre === 'membre') {
      const c = cible(a.id)
      if (!c) return non('inconnu')
      const r = refusAttribution(par, c, 'avertir')
      if (r) return non(r)
      pour = { genre: 'membre', id: a.id }
      dest = [a.id]
    } else {
      if (!gerees().includes(a.equipe)) return non('hors_equipe')
      pour = { genre: 'equipe', equipe: a.equipe }
      dest = Object.entries(equipeDemo.lire().membres)
        .filter(([id, m]) => m.equipe === a.equipe && id !== par.id && etatDuCompte(id) === 'actif')
        .map(([id]) => id)
    }
    let id = ''
    equipeDemo.ecrire((e) => {
      e.nMessage++
      id = `AV-${String(e.nMessage).padStart(4, '0')}`
      e.messages.unshift({ id, genre, texte: texte.trim(), deId: par.id, de: nomAgent(agentCourant()), le: maintenant(), pour, destinataires: dest, lus: {} })
    })
    await journaliser({ action: `equipe.${genre}`, objet: a.genre === 'membre' ? `Compte ${nomDe(a.id)}` : `Équipe ${EQUIPES[a.equipe].nom}`, motif: texte.trim(), apres: `${dest.length} destinataire(s)` })
    return { ok: true, id, destinataires: dest.length }
  },
  async suspendre(id, motif) {
    const par = exigerGestion()
    if (!motifOk(motif)) return non('motif_court')
    const c = cible(id)
    if (!c) return non('inconnu')
    const r = refusAttribution(par, c, 'suspendre')
    if (r) return non(r)
    if (c.etat !== 'actif') return non('etat')
    if (c.equipe === 'direction' && directionActifs() - 1 < PARAMETRES.acces.directionMin) return non('direction_min')
    const n = maintenant()
    equipeDemo.ecrire((e) => {
      Object.assign(e.membres[id], { etat: 'suspendu', suspension: { motif, le: n, par: nomAgent(agentCourant()) }, sessionsFermeesLe: n })
      noterChangement(e, id, 'Compte suspendu · sessions fermées', motif)
    })
    await journaliser({ action: 'acces.suspendre', objet: `Compte ${nomDe(id)}`, motif, avant: 'Actif', apres: 'Suspendu · sessions fermées' })
    return { ok: true, etat: 'applique', qy: null }
  },
  async reactiver(id, motif) {
    const par = exigerGestion()
    if (!motifOk(motif)) return non('motif_court')
    const c = cible(id)
    if (!c) return non('inconnu')
    const r = refusAttribution(par, c, 'reactiver')
    if (r) return non(r)
    if (c.etat !== 'suspendu') return non('etat')
    if (Object.values(equipeDemo.lire().demandes).some((d) => d.genre === 'reactivation' && d.membreId === id)) return non('deja')
    return demanderOuAppliquer(exigeQuatreYeux('reactiver', c, {}), { genre: 'reactivation', membreId: id, resume: `Réactiver le compte de ${nomDe(id)}`, apres: { motif } }, motif)
  },
  async desactiver(id, motif, repreneur) {
    const par = exigerGestion()
    if (!motifOk(motif)) return non('motif_court')
    const c = cible(id)
    if (!c) return non('inconnu')
    const r = refusAttribution(par, c, 'desactiver')
    if (r) return non(r)
    if (c.etat === 'ferme') return non('etat')
    if (c.equipe === 'direction' && c.etat === 'actif' && directionActifs() - 1 < PARAMETRES.acces.directionMin) return non('direction_min')
    const dossiers = equipeDemo.lire().dossiers.filter((d) => d.agentId === id)
    if (dossiers.length) {
      if (!repreneur) return non('dossiers_en_cours', `${dossiers.length}`)
      const rep = etatMembre(repreneur)
      if (!rep || rep.equipe !== c.equipe || repreneur === id || etatDuCompte(repreneur) !== 'actif') return non('hors_equipe')
    }
    const n = maintenant()
    equipeDemo.ecrire((e) => {
      for (const d of e.dossiers) if (d.agentId === id) Object.assign(d, { agentId: repreneur, depuis: n })
      const m = e.membres[id]
      for (const t of m.temporaires) if (t.etat === 'actif' || t.etat === 'a_valider') t.etat = 'retire'
      Object.assign(m, { etat: 'ferme', depart: { le: n, motif, reattribues: dossiers.length }, sessionsFermeesLe: n, roleAdditionnel: null })
      noterChangement(e, id, 'Compte désactivé · accès retirés le jour même', motif)
    })
    for (const d of dossiers) await journaliser({ action: 'equipe.reattribuer', objet: d.id, motif: `Départ de ${nomDe(id)}`, avant: nomDe(id), apres: nomDe(repreneur!) })
    await journaliser({ action: 'acces.desactiver', objet: `Compte ${nomDe(id)}`, motif, avant: c.etat, apres: `Fermé · sessions fermées · ${dossiers.length} dossier(s) réattribué(s)` })
    return { ok: true, reattribues: dossiers.length }
  },
  async revue(equipe) {
    exigerLectureEquipe(equipe)
    await balayer()
    return repondre(revueDe(equipe))
  },
  async revoir(ligne, decision, motif) {
    const par = exigerGestion()
    const [id, genre, tid] = ligne.split(':')
    const c = cible(id)
    if (!c) return non('inconnu')
    const r = refusAttribution(par, c, 'revoir')
    if (r) return non(r)
    if (decision === 'retire' && !motifOk(motif)) return non('motif_court')
    const p = periodeRevue(maintenant())
    if (!lignesRevue(c.equipe, p.cle).some((x) => x.id === ligne)) return non('inconnu')
    equipeDemo.ecrire((e) => {
      ;(e.revues[p.cle] ??= {})[ligne] = { decision, parId: par.id, par: nomAgent(agentCourant()), le: maintenant() }
      if (decision === 'retire' && genre === 'additionnel') e.membres[id].roleAdditionnel = null
      if (decision === 'retire' && genre === 'temporaire') e.membres[id].temporaires.find((x) => x.id === tid)!.etat = 'retire'
      if (decision === 'retire') noterChangement(e, id, genre === 'base' ? 'Revue des accès : accès à retirer (Accès et personnel prévenu)' : 'Revue des accès : accès retiré', motif)
    })
    await journaliser({ action: decision === 'confirme' ? 'acces.revue_confirmer' : 'acces.revue_retirer', objet: `Compte ${nomDe(id)}`, motif: motif || `Revue ${p.cle}`, avant: null, apres: `${genre} · ${decision === 'confirme' ? 'confirmé' : 'retiré'}` })
    return { ok: true, etat: 'applique', qy: null }
  },
  async monEquipe() {
    exigerPage('mon-equipe', 'Mon équipe')
    await balayer()
    const e = moi().equipe
    const s = equipeDemo.lire()
    return repondre({
      equipe: e,
      membres: membres()
        .filter((m) => m.equipe === e && m.etat !== 'ferme')
        .map((m) => ({ ...m, liste: s.dossiers.filter((d) => d.agentId === m.agent.id) })),
      revue: revueDe(e),
      messages: messagesVus(s.messages.filter((x) => x.pour.genre === 'equipe' ? x.pour.equipe === e : etatMembre(x.pour.id)?.equipe === e), agentCourant().id),
    })
  },
  async repartir(dossier, vers) {
    const par = exigerGestion()
    const s = equipeDemo.lire()
    const d = s.dossiers.find((x) => x.id === dossier)
    if (!d) return non('inconnu')
    if (!estAdmin() && d.equipe !== par.equipe) return non('hors_equipe')
    const v = etatMembre(vers)
    if (!v || v.equipe !== d.equipe || etatDuCompte(vers) !== 'actif') return non('hors_equipe')
    if (d.agentId === vers) return non('deja')
    const avant = d.agentId
    equipeDemo.ecrire((e) => void Object.assign(e.dossiers.find((x) => x.id === dossier)!, { agentId: vers, depuis: maintenant() }))
    await journaliser({ action: 'equipe.repartir', objet: dossier, motif: 'Répartition du travail de l’équipe', avant: nomDe(avant), apres: nomDe(vers) })
    return { ok: true }
  },
  async mesMessages() {
    verifierSession()
    await balayer()
    const id = agentCourant().id
    const s = equipeDemo.lire()
    const messages = messagesVus(s.messages.filter((x) => x.destinataires.includes(id)), id)
    return repondre({ messages, changements: s.changements[id] ?? [], nonLus: messages.filter((m) => !m.luParMoi).length })
  },
  async lireMessage(mid) {
    verifierSession()
    const id = agentCourant().id
    const m = equipeDemo.lire().messages.find((x) => x.id === mid)
    if (!m || !m.destinataires.includes(id) || m.lus[id]) return
    equipeDemo.ecrire((e) => void (e.messages.find((x) => x.id === mid)!.lus[id] = maintenant()))
    await journaliser({ action: 'equipe.message_lu', objet: mid, motif: null })
  },
  async ouvrirUrgence(motif, heures) {
    verifierSession()
    if (roleCourant() !== 'superviseur') throw new AccesRefuse('Accès d’urgence', ['superviseur'])
    if (!motifOk(motif)) return non('motif_court')
    if (!(heures > 0) || heures > PARAMETRES.acces.urgenceH) return non('duree')
    const a = agentCourant()
    const n = maintenant()
    if (equipeDemo.lire().urgences.some((u) => u.agentId === a.id && !u.fermeeLe && u.jusqua > n)) return non('deja')
    const jusqua = n + heures * HEURE
    equipeDemo.ecrire((e) => {
      e.urgences.unshift({ id: `UR-${String(e.urgences.length + 1).padStart(4, '0')}`, agentId: a.id, motif: motif.trim(), debut: n, jusqua, fermeeLe: null, revue: null })
      e.nMessage++
      const dest = Object.entries(e.membres).filter(([id, m]) => m.equipe === 'direction' && id !== a.id).map(([id]) => id)
      e.messages.unshift({ id: `AV-${String(e.nMessage).padStart(4, '0')}`, genre: 'avertissement', texte: `Accès d’urgence ouvert par ${nomAgent(a)} jusqu’à ${new Date(jusqua + HEURE).toISOString().slice(11, 16)} : ${motif.trim()}`, deId: a.id, de: nomAgent(a), le: n, pour: { genre: 'equipe', equipe: 'direction' }, destinataires: dest, lus: {} })
    })
    await journaliser({ action: 'urgence.ouvrir', objet: `Compte ${nomAgent(a)}`, motif, avant: null, apres: `Accès d’urgence ${heures} h · revu le lendemain` })
    return { ok: true, jusqua }
  },
  async fermerUrgence() {
    verifierSession()
    const a = agentCourant()
    const u = equipeDemo.lire().urgences.find((x) => x.agentId === a.id && !x.fermeeLe)
    if (!u) return
    equipeDemo.ecrire((e) => void (e.urgences.find((x) => x.id === u.id)!.fermeeLe = maintenant()))
    await journaliser({ action: 'urgence.fermer', objet: `Compte ${nomAgent(a)}`, motif: null })
  },
  async revoirUrgence(id, motif) {
    verifierSession()
    if (roleCourant() !== 'superviseur') throw new AccesRefuse('Revoir un accès d’urgence', ['superviseur'])
    if (!motifOk(motif)) return non('motif_court')
    const u = equipeDemo.lire().urgences.find((x) => x.id === id)
    if (!u) return non('inconnu')
    if (u.agentId === agentCourant().id) return non('soi_meme')
    if (u.revue) return non('deja')
    equipeDemo.ecrire((e) => void (e.urgences.find((x) => x.id === id)!.revue = { parId: agentCourant().id, par: nomAgent(agentCourant()), le: maintenant(), motif }))
    await journaliser({ action: 'urgence.revoir', objet: `Compte ${nomDe(u.agentId)}`, motif, avant: 'À revoir', apres: 'Revu par un second membre' })
    return { ok: true }
  },

  async descentes() {
    exigerPage('descentes', 'Descentes terrain')
    const z = zonesVisibles()
    const dans = (zone: string) => !z || z.includes(zone)
    const exploitees = PARAMETRES.zonesExploitees.map((x) => x.code)
    return repondre({
      descentes: equipeDemo
        .lire()
        .descentes.filter((d) => dans(d.zone))
        .sort((a, b) => a.prevueLe - b.prevueLe),
      agents: agentsTerrain().filter((a) => !z || a.zones.some((x) => z.includes(x))),
      cibles: [
        ...kycARevoir().filter((k) => k.zone && dans(k.zone)).map((k) => ({ genre: 'kyc' as const, ref: k.id, libelle: `${k.id} · ${k.acteur}`, zone: k.zone!, lieu: k.acteur })),
        { genre: 'kyc' as const, ref: 'KYC-0093', libelle: 'KYC-0093 · Saveurs du Pays', zone: 'Z6', lieu: 'Saveurs du Pays' },
        ...RELAIS.filter((r) => dans(r.zone)).map((r) => ({ genre: 'relais' as const, ref: r.id, libelle: r.nom, zone: r.zone, lieu: r.nom })),
        ...LITIGES.filter((l) => dans(l.zone)).map((l) => ({ genre: 'litige' as const, ref: l.id, libelle: `${l.id} · ${l.motif}`, zone: l.zone, lieu: l.vendeur })),
        ...ZONES.filter((x) => exploitees.includes(x.code) && dans(x.code)).map((x) => ({ genre: 'zone' as const, ref: x.code, libelle: `${x.code} ${x.nom}`, zone: x.code, lieu: x.nom })),
      ].filter((c, i, l) => l.findIndex((y) => y.ref === c.ref) === i),
    })
  },
  async planifier(d) {
    if (!exigerPlanification(d.zone)) return non('hors_perimetre')
    if (!d.lieu.trim() || !d.cible.ref) return non('incomplet')
    if (d.agentId) {
      const a = agentsTerrain().find((x) => x.id === d.agentId)
      if (!a || !a.zones.includes(d.zone)) return non('hors_perimetre')
    }
    let id = ''
    equipeDemo.ecrire((e) => {
      e.nDescente++
      id = `DT-${String(e.nDescente).padStart(4, '0')}`
      e.descentes.push({ id, type: d.type, zone: d.zone, lieu: d.lieu.trim(), repere: d.repere.trim(), cible: d.cible, prevueLe: d.prevueLe, agentId: d.agentId, agent: d.agentId ? nomDe(d.agentId) : null, statut: 'planifiee', controles: CONTROLES[d.type].map((libelle, i) => ({ id: `c${i + 1}`, libelle, ok: null })), photos: [], compteRendu: '', resultat: null, creePar: nomAgent(agentCourant()), termineeLe: null, envoiHorsReseau: false })
    })
    await journaliser({ action: 'descente.planifier', objet: d.cible.ref, motif: `${id} · ${d.lieu.trim()}`, zone: d.zone, apres: d.agentId ? nomDe(d.agentId) : 'Sans agent' })
    // Le relais est prévenu d'une inspection (pont : il prépare son registre et ses étagères).
    if (d.type === 'inspection_relais') publier({ type: 'inspection_annoncee', relais: idPont(d.cible.ref), descente: id, prevueLe: d.prevueLe }, `admin-descente-${id}`, maintenant())
    return { ok: true, id }
  },
  async assigner(id, agentId) {
    const d = equipeDemo.lire().descentes.find((x) => x.id === id)
    if (!d) return non('inconnu')
    if (!exigerPlanification(d.zone)) return non('hors_perimetre')
    if (d.statut === 'terminee' || d.statut === 'annulee') return non('etat')
    const a = agentsTerrain().find((x) => x.id === agentId)
    if (!a || !a.zones.includes(d.zone)) return non('hors_perimetre')
    majDescente(id, (x) => Object.assign(x, { agentId, agent: a.nom }))
    await journaliser({ action: 'descente.assigner', objet: d.cible.ref, motif: id, zone: d.zone, avant: d.agent ?? 'Sans agent', apres: a.nom })
    return { ok: true }
  },
  async annulerDescente(id, motif) {
    const d = equipeDemo.lire().descentes.find((x) => x.id === id)
    if (!d) return non('inconnu')
    if (!exigerPlanification(d.zone)) return non('hors_perimetre')
    if (!motifOk(motif)) return non('motif_court')
    if (d.statut === 'terminee' || d.statut === 'annulee') return non('etat')
    majDescente(id, (x) => void (x.statut = 'annulee'))
    await journaliser({ action: 'descente.annuler', objet: d.cible.ref, motif, zone: d.zone, avant: d.statut, apres: 'Annulée' })
    return { ok: true }
  },
  async mesDescentes() {
    verifierSession()
    exigerPage('mes-descentes', 'Mes descentes')
    const id = agentCourant().id
    return repondre(
      equipeDemo
        .lire()
        .descentes.filter((d) => d.agentId === id && d.statut !== 'annulee')
        .sort((a, b) => Number(a.statut === 'terminee') - Number(b.statut === 'terminee') || a.prevueLe - b.prevueLe),
    )
  },
  async descente(id) {
    const d = maDescente(id)
    return repondre(d)
  },
  async avancer(id, statut) {
    const d = maDescente(id)
    if (roleCourant() !== 'terrain') throw new AccesRefuse('Faire la descente', ['terrain'])
    if (d.statut === 'terminee' || d.statut === 'annulee') return non('etat')
    majDescente(id, (x) => void (x.statut = statut))
    await journaliser({ action: `descente.${statut}`, objet: d.cible.ref, motif: id, zone: d.zone })
    return { ok: true }
  },
  async rapporter(id, r) {
    const d = maDescente(id)
    if (roleCourant() !== 'terrain') throw new AccesRefuse('Faire la descente', ['terrain'])
    if (d.statut === 'terminee' || d.statut === 'annulee') return non('etat')
    if (!r.resultat || !motifOk(r.compteRendu) || d.controles.some((c) => typeof r.controles[c.id] !== 'boolean')) return non('incomplet')
    const n = maintenant()
    majDescente(id, (x) => {
      for (const c of x.controles) c.ok = r.controles[c.id]
      x.photos = [...x.photos, ...r.photos.map((nom, i) => ({ id: `ph-${x.photos.length + i + 1}`, nom, le: n }))]
      Object.assign(x, { compteRendu: r.compteRendu.trim(), resultat: r.resultat, statut: 'terminee', termineeLe: n, envoiHorsReseau: !!r.horsReseau })
    })
    // Le résultat alimente le dossier concerné (KYC, relais, litige) : une ligne à son nom, lue par sa page.
    const libelle = r.resultat === 'conforme' ? 'Conforme' : r.resultat === 'non_conforme' ? 'Non conforme' : 'À revoir'
    await journaliser({ action: `terrain.${d.cible.genre}`, objet: d.cible.ref, motif: r.compteRendu.trim(), zone: d.zone, avant: null, apres: `${id} · ${libelle} · ${d.controles.length} contrôles · ${r.photos.length} photo(s)` })
    return { ok: true }
  },
}

function messagesVus(l: MessageStock[], id: string): MessageMembre[] {
  return l.map((m) => ({
    id: m.id,
    genre: m.genre,
    texte: m.texte,
    de: m.de,
    le: m.le,
    pour: m.pour.genre === 'membre' ? { genre: 'membre', id: m.pour.id, nom: nomDe(m.pour.id) } : m.pour,
    destinataires: m.destinataires.length,
    lus: Object.keys(m.lus).length,
    luParMoi: m.lus[id] ?? null,
  }))
}

/** Ce qui attend les administrateurs (File d'action) : demandes d'accès à valider et alertes (§ 6). */
export const aTraiterAcces = () => ({ demandes: demandesEnAttente(), alertes: alertesAcces() })
