// DONNÉES DE DÉMONSTRATION — le MODÈLE CENTRAL des colis au relais (possédé par le SOCLE) : UNE seule liste de colis,
// lue par les démonstrations reception, retrait, stock, departs, incidents, historique, aujourdhui et session.
// - État de base gardé (attendu, en stock, constat, groupage, remis…) ; « dernier jour » (J7) et « à renvoyer » (J8)
//   avancent seuls avec le jour (calculs/cycle.ts : etatDuJour).
// - Garde PAR GROUPE de remise (calculs/garde.ts) : J1 = GARDE-J1-DEBUT (dépôt du dernier colis du groupe, avis
//   délivré), jours fermés et suspendus jamais facturés, plafond à la valeur ; encaissée en espèces UNE fois, au premier
//   retrait du groupe (ARL-02).
// - Code de retrait PAR COLIS (ARL-01) : seule son empreinte est gardée (« serveur ») ; jamais exposé au relais.
// - Chaque geste passe par appliquer() : transition vérifiée par calculs/cycle.ts (photo, PIN, encaissement…),
//   idempotente (clé d'origine × colis), écrite au journal signé.
import { PARAMETRES } from '../calculs/registre'
import { attribuerEmplacement, occupation, type Case } from '../calculs/capacite'
import { etatDuJour, transition, PRESENTS, type ContexteGeste, type EvenementCycle, type RefusCycle } from '../calculs/cycle'
import { dernierJourDeRetrait, etat as etatGarde, groupe as groupeEnGarde, j1De, renvoi, type GroupeEnGarde } from '../calculs/garde'
import { ajouterJours, jourDe, type Jour } from '../calculs/temps'
import type { Acteur, ClasseColis, EntreeJournal, Instant, Origine, Photo } from '../donnees/communs'
import type { ArriveeColis, ColisRelais, EtatColis, GardeColis, GroupeRemise, MotifSortie, OngletStock, PaiementColis, Preuve, ResultatReception } from '../donnees/domaines/colis'
import { etatCalendrier, horairesGarde } from './calendrier'
import { aujourdhui, maintenant } from './horloge'
import { COLIS, CONSTAT, ENTREPRISE, LIVRAISON_PAYEE, LIVREUR, LOTS, PLAN, h, type ColisJeu } from './jeu-essai'
import { relaisPasOuvert, scenario } from './scenario'
import { magasin } from './stockage'
// Les lots annoncés depuis les commandes du client rejoignent ceux du jeu d'essai avant toute lecture.
import './lots-pont'

const P = PARAMETRES.relais

// ── Code de retrait (démonstration du « serveur ») ─────────────────────────────────────────────────────────────
/** Empreinte (FNV-1a ; le serveur réel garde un hachage salé) : le code lui-même n'est jamais gardé. */
export function empreinte(texte: string): string {
  let x = 0x811c9dc5
  for (const c of texte) x = Math.imul(x ^ c.charCodeAt(0), 0x01000193) >>> 0
  return x.toString(16)
}
/** Code de démonstration d'un colis, à CODE-LONGUEUR chiffres, déterministe : seule la simulation du client le lit. */
export const codeDemo = (colisId: string) => String(parseInt(empreinte('code:' + colisId), 16) % 10 ** P.code.longueur).padStart(P.code.longueur, '0')
/** Contenu du QR que présente le client : le code, signé (démonstration : préfixe). */
export const qrDemo = (colisId: string) => `BLV1.${codeDemo(colisId)}`

// ── État gardé ─────────────────────────────────────────────────────────────────────────────────────────────────
export interface ColisDemo {
  id: string
  groupe: string
  classe: ClasseColis
  gros: boolean
  fragile: boolean
  valeur: number // côté serveur seulement : plafond de garde
  paye: number // côté serveur seulement : ce que le client a payé (retenue au plus)
  client: string // « Awa N. »
  emplacement: string | null
  etat: EtatColis
  arrivee: ArriveeColis
  avisA: Instant | null
  paiement: PaiementColis
  porteurDesigne: string | null
  groupageJusquau: Jour | null
  constat: string | null
  suspendu: { du: Jour; au: Jour | null } | null // constat, groupage, transfert : garde et renvoi suspendus
  retour: ColisRelais['retour']
  sortie: ColisRelais['sortie']
  remise: ColisRelais['remise']
  preuves: Preuve[]
  journal: EntreeJournal[]
  code: { empreinte: string; faux: number; bloqueJusqua: Instant | null }
}
export interface GroupeDemo {
  id: string
  total: number
  encaissee: GardeColis['encaissee']
}
const groupeDe = (id: string) => id.replace(/-\d+$/, '')
const membre = (id: 'm-rose' | 'm-paul'): Acteur => ({ type: 'membre', nom: id === 'm-rose' ? 'RM' : 'PE', membreId: id })
const livreur: Acteur = { type: 'livreur', nom: LIVREUR, membreId: null }
const entree = (le: Instant, action: string, par: Acteur, signe: boolean, detail: string | null = null): EntreeJournal => ({ le, action, par, signe, detail, cle: null })

function depuisJeu(c: ColisJeu): ColisDemo {
  const recuPar = membre(c.depot && jourDe(c.depot) === '2026-10-13' ? 'm-rose' : Number(c.id.slice(6, 9)) % 2 ? 'm-paul' : 'm-rose')
  const auComptoir = c.auComptoir !== undefined
  const arrive = c.etat !== 'attendu' && c.lot !== null
  const paiement: PaiementColis = auComptoir
    ? { mode: 'au_comptoir', montant: c.auComptoir!, etat: c.remise?.paiement ? 'confirme' : 'a_payer', reference: c.remise?.paiement ?? null }
    : { mode: 'paye', montant: 0, etat: 'paye', reference: null }
  const preuves: Preuve[] = []
  const journal: EntreeJournal[] = []
  if (arrive && c.depot) {
    preuves.push({ nature: 'lot', photos: [`ph-lot-${c.lot}`], par: recuPar, le: c.depot + 3 * 60_000 })
    journal.push(entree(c.depot, 'depot_livreur', livreur, false, c.lot), entree(c.depot + 3 * 60_000, 'lot_valide', recuPar, true, c.lot))
    if (c.reserve) preuves.push({ nature: 'reserve', photos: [`ph-res-${c.id}`], par: recuPar, le: c.depot + 2 * 60_000 })
  }
  if (c.retour) {
    preuves.push({ nature: 'retour', photos: [`ph-ret1-${c.id}`, `ph-ret2-${c.id}`], par: membre('m-rose'), le: c.retour.deposeA })
    journal.push(entree(c.retour.deposeA, 'retour_depose', membre('m-rose'), true, c.retour.reference))
  }
  if (c.remise) {
    preuves.push({ nature: 'remise', photos: [`ph-rem-${c.id}`], par: membre(c.remise.par), le: c.remise.a })
    journal.push(entree(c.remise.a, 'remis', membre(c.remise.par), true, c.remise.tiers ? 'porteur désigné, pièce vérifiée' : null))
  }
  if (c.id === CONSTAT.colis) {
    // Constat ouvert au comptoir lundi par Paul, devant la cliente : déballage photographié, journal signé du PIN.
    preuves.push({ nature: 'deballage', photos: ['ph-cs1', 'ph-cs2'], par: membre(CONSTAT.par), le: CONSTAT.ouvertA })
    journal.push(entree(CONSTAT.ouvertA, 'un_probleme', membre(CONSTAT.par), true, CONSTAT.motif))
  }
  if (c.sortie?.le) {
    preuves.push({ nature: 'sortie', photos: [`ph-sortie-${c.id}`], par: membre('m-rose'), le: c.sortie.le })
    journal.push(entree(c.sortie.le, 'parti', membre('m-rose'), true, c.sortie.collecte))
  }
  return {
    id: c.id,
    groupe: groupeDe(c.id),
    classe: c.classe,
    gros: !!c.gros,
    fragile: !!c.fragile,
    valeur: c.valeur,
    paye: auComptoir ? LIVRAISON_PAYEE : c.valeur + LIVRAISON_PAYEE,
    client: c.client,
    emplacement: c.emplacement,
    etat: c.etat,
    arrivee: { lot: c.lot, mission: LOTS.find((l) => l.id === c.lot)?.arret ?? null, livreur: c.lot ? LIVREUR : null, entreprise: c.lot ? ENTREPRISE : null, le: arrive ? c.depot : null, photo: arrive ? `ph-lot-${c.lot}` : null, resultat: arrive ? (c.reserve ? 'reserve' : 'ok') : null, reserve: c.reserve ? { note: c.reserve, photos: [`ph-res-${c.id}`] } : null },
    avisA: c.avis !== undefined ? c.avis : arrive && c.depot ? c.depot + 2 * 60_000 : null,
    paiement,
    porteurDesigne: c.porteurDesigne ?? null,
    groupageJusquau: c.groupageJusquau ?? null,
    constat: c.id === CONSTAT.colis ? CONSTAT.id : null,
    suspendu: c.id === CONSTAT.colis ? { du: jourDe(CONSTAT.ouvertA), au: null } : c.etat === 'en_groupage' ? { du: jourDe(c.depot!), au: null } : null,
    retour: c.retour ? { reference: c.retour.reference, motif: c.retour.motif, scelle: 'intact', destination: c.retour.destination } : null,
    sortie: c.sortie ?? null,
    remise: c.remise ? { le: c.remise.a, par: membre(c.remise.par), porteur: c.remise.tiers ? 'tiers' : 'client', pieceVerifiee: !!c.remise.tiers, photo: `ph-rem-${c.id}` } : null,
    preuves,
    journal,
    code: { empreinte: empreinte(codeDemo(c.id)), faux: 0, bloqueJusqua: null },
  }
}

/** Jeu d'essai filtré selon la situation : « neuf » garde le lot du matin et le lot attendu, rien d'autre. */
function colisDuJeu(): ColisJeu[] {
  if (relaisPasOuvert()) return []
  if (scenario() === 'neuf') return COLIS.filter((c) => c.lot === 'PQ-Z1-261013-001' || c.lot === 'PQ-Z1-261013-003')
  return COLIS
}

function initial() {
  const colis: Record<string, ColisDemo> = {}
  for (const c of colisDuJeu()) colis[c.id] = depuisJeu(c)
  const groupes: Record<string, GroupeDemo> = {}
  for (const c of colisDuJeu()) {
    const g = (groupes[groupeDe(c.id)] ??= { id: groupeDe(c.id), total: 0, encaissee: null })
    g.total = Math.max(g.total + 1, c.groupeTotal ?? 0)
  }
  const e = { colis, groupes, appliques: [] as string[] }
  // Garde des retraits du jour : encaissée au premier retrait du groupe (ARL-02), calculée comme au comptoir.
  for (const g of Object.values(groupes)) {
    const remis = Object.values(colis).filter((c) => c.groupe === g.id && c.remise).sort((a, b) => a.remise!.le - b.remise!.le)
    if (!remis.length) continue
    const premier = remis[0].remise!
    const gg = gardeDuGroupe(e, g.id)
    const du = gg ? etatGarde(gg, jourDe(premier.le), P.garde, premier.le).du : 0
    g.encaissee = { montant: du, le: premier.le, par: premier.par.nom ?? '' }
    if (du > 0) remis[0].journal.push(entree(premier.le - 30_000, 'especes_encaissees', premier.par, true, `garde du groupe ${g.id}`))
  }
  return e
}

export const etatColis = magasin('colis', initial)
type Etat = ReturnType<typeof etatColis.lire>

// Colis de chaque groupe, indexés une fois par état gardé (le groupe se lit dans l'identifiant et ne change jamais) :
// sans index, chaque vue d'un colis relisait tous les colis, et un grand relais (150 colis et plus, en démonstration)
// ralentissait chaque écran. Un état en cours d'écriture (dans ecrire) n'est pas indexé : il change encore.
const INDEX_GROUPES = new WeakMap<Etat['colis'], Map<string, string[]>>()
export function membresDuGroupe(e: Etat, groupe: string): ColisDemo[] {
  if (e.colis !== etatColis.courant()?.colis) return Object.values(e.colis).filter((c) => c.groupe === groupe)
  let groupes = INDEX_GROUPES.get(e.colis)
  if (!groupes) {
    groupes = new Map<string, string[]>()
    for (const [id, c] of Object.entries(e.colis)) {
      const l = groupes.get(c.groupe)
      if (l) l.push(id)
      else groupes.set(c.groupe, [id])
    }
    INDEX_GROUPES.set(e.colis, groupes)
  }
  return (groupes.get(groupe) ?? []).map((id) => e.colis[id])
}

// ── Garde par groupe ───────────────────────────────────────────────────────────────────────────────────────────
const ARRIVES: EtatColis[] = ['recu', 'recu_reserve', 'en_stock', 'dernier_jour', 'a_renvoyer', 'en_constat', 'transfert_demande', 'refuse_comptoir', 'a_faire_partir', 'remis', 'parti']

/** Le groupe en garde (calculs/garde.ts), ou null : groupe incomplet, en groupage, ou avis pas encore délivré. Calculé une
 * fois par état gardé des colis et du calendrier (les vues de tous les colis le relisent souvent). */
const GARDES = new WeakMap<Etat['colis'], { calendrier: object; groupes: Map<string, GroupeEnGarde | null> }>()
export function gardeDuGroupe(e: Etat, groupeId: string): GroupeEnGarde | null {
  const calendrier = etatCalendrier.courant()
  if (!calendrier || e.colis !== etatColis.courant()?.colis) return calculerGarde(e, groupeId)
  let x = GARDES.get(e.colis)
  if (!x || x.calendrier !== calendrier) GARDES.set(e.colis, (x = { calendrier, groupes: new Map() }))
  if (!x.groupes.has(groupeId)) x.groupes.set(groupeId, calculerGarde(e, groupeId))
  return x.groupes.get(groupeId) ?? null
}
/** État de la garde d'un groupe un jour donné (calculs/garde.ts), gardé avec le groupe. */
const ETATS_GARDE = new WeakMap<GroupeEnGarde, Map<string, ReturnType<typeof etatGarde>>>()
function etatGardeDu(g: GroupeEnGarde, jour: Jour): ReturnType<typeof etatGarde> {
  let m = ETATS_GARDE.get(g)
  if (!m) ETATS_GARDE.set(g, (m = new Map()))
  // Aujourd'hui, la garde se lit à l'heure (tranches de 24 h, R37) : la clé suit la minute.
  const t = maintenant()
  const cle = jourDe(t) === jour ? `${jour}@${Math.floor(t / 60_000)}` : jour
  let s = m.get(cle)
  if (!s) m.set(cle, (s = etatGarde(g, jour, P.garde)))
  return s
}
function calculerGarde(e: Etat, groupeId: string): GroupeEnGarde | null {
  const g = e.groupes[groupeId]
  const membres = membresDuGroupe(e, groupeId).filter((c) => !c.retour)
  if (!g || !membres.length || membres.length < g.total || membres.some((c) => !ARRIVES.includes(c.etat) || c.arrivee.le === null)) return null
  const depot = Math.max(...membres.map((c) => c.arrivee.le!))
  const avis = membres.map((c) => c.avisA)
  if (avis.some((a) => a === null)) return null
  const j1 = j1De(depot, Math.max(depot, ...(avis as number[])))
  const suspendus: Jour[] = []
  for (const c of membres)
    if (c.suspendu) for (let j = c.suspendu.du, k = 0; (c.suspendu.au === null || j <= c.suspendu.au) && k < 60; j = ajouterJours(j, 1), k++) suspendus.push(j)
  const auComptoir = membres.some((c) => c.paiement.mode === 'au_comptoir' && c.paiement.etat !== 'confirme')
  // R37 (v2.0) : tranches de 24 h depuis le scan d'arrivée du dernier colis.
  return groupeEnGarde(groupeId, j1, membres.reduce((n, c) => n + c.valeur, 0), membres.reduce((n, c) => n + c.paye, 0), membres.some((c) => c.gros), horairesGarde(), { joursSuspendus: suspendus, auComptoir, colis: membres.map((c) => c.valeur), arrivee: depot })
}

/** Renvoi du groupe, ou null : pas d'avis délivré, ou garde suspendue sans fin connue (constat en cours : le renvoi
 * attend la décision, CAL-21). */
const RENVOIS = new WeakMap<GroupeEnGarde, ReturnType<typeof renvoi> | null>()
function renvoiDe(g: GroupeEnGarde) {
  if (RENVOIS.has(g)) return RENVOIS.get(g) ?? null
  let r: ReturnType<typeof renvoi> | null
  try {
    r = renvoi(g, P.garde)
  } catch {
    r = null
  }
  RENVOIS.set(g, r)
  return r
}

/** Confidentialité (PR-RC-09, DRO-03) : la part du relais ne part que vers un membre qui voit l'argent. Le domaine
 * « session » déclare la règle au chargement (sans import croisé) ; d'ici là, rien ne part. */
let voitArgent: () => boolean = () => false
export const argentVisibleSi = (f: () => boolean) => void (voitArgent = f)

function gardeVue(e: Etat, c: ColisDemo, jour: Jour): GardeColis | null {
  const g0 = gardeBrute(e, c, jour)
  if (!g0 || voitArgent()) return g0
  return { ...g0, partRelais: null, payeParBelivay: null }
}

function gardeBrute(e: Etat, c: ColisDemo, jour: Jour): GardeColis | null {
  if (c.retour || c.etat === 'attendu' || c.etat === 'refuse_reception' || c.etat === 'absent') return null
  const g = gardeDuGroupe(e, c.groupe)
  const enc = e.groupes[c.groupe]?.encaissee ?? null
  if (!g) return { j1: null, rang: null, gratuit: true, du: 0, duDemain: 0, dernierJour: null, renvoiLe: null, suspendue: !!c.suspendu, partRelais: 0, payeParBelivay: 0, encaissee: enc }
  // Remis : garde figée au jour du premier retrait du groupe.
  const j = enc ? jourDe(enc.le) : jour
  const s = etatGardeDu(g, j)
  const r = renvoiDe(g)
  return {
    j1: g.j0,
    rang: s.rang,
    gratuit: s.rang === 1 && s.du === 0,
    du: enc ? 0 : s.du,
    duDemain: enc ? 0 : s.duDemain,
    dernierJour: dernierJourDeRetrait(g),
    renvoiLe: r?.jour ?? null,
    suspendue: g.joursSuspendus.includes(jour),
    partRelais: s.gainRelais,
    payeParBelivay: s.payeParBelivay,
    encaissee: enc,
  }
}

/** État du jour : J7 dernier jour, J8 à renvoyer (avancent seuls). */
function etatVu(e: Etat, c: ColisDemo, jour: Jour): EtatColis {
  if (c.etat !== 'en_stock' && c.etat !== 'dernier_jour') return c.etat
  const g = gardeDuGroupe(e, c.groupe)
  if (!g) return c.etat
  const r = renvoiDe(g)
  return etatDuJour(c.etat, etatGardeDu(g, jour).rang, dernierJourDeRetrait(g) === jour, !!r && jour >= r.jour)
}

/** Vue d'un colis telle que le relais la reçoit (jamais le code, la valeur, ce qui a été payé ni le client). */
export function vue(c: ColisDemo, e: Etat = etatColis.lire(), jour: Jour = aujourdhui()): ColisRelais {
  const ordre = membresDuGroupe(e, c.groupe).map((x) => x.id).sort()
  const etat = etatVu(e, c, jour)
  const sortie = c.sortie ?? (etat === 'a_renvoyer' ? { motif: 'renvoi' as MotifSortie, destination: null, collecte: null, le: null } : null)
  // Code par colis (ARL-01) : envoyé à l'arrivée du colis (avis délivré), jamais avant le paiement d'une commande
  // payable au retrait, jamais pendant un groupage.
  const envoye = PRESENTS.includes(etat) && etat !== 'en_groupage' && !c.retour && c.arrivee.le !== null && c.avisA !== null && (c.paiement.mode === 'paye' || c.paiement.etat === 'confirme')
  return {
    id: c.id,
    groupe: c.groupe,
    rangDansGroupe: ordre.indexOf(c.id) + 1,
    classe: c.classe,
    gros: c.gros,
    fragile: c.fragile,
    places: P.places[c.classe],
    emplacement: c.emplacement,
    etat,
    arrivee: c.arrivee,
    garde: gardeVue(e, c, jour),
    paiement: c.paiement,
    code: { envoye, bloqueJusqua: c.code.bloqueJusqua && c.code.bloqueJusqua > maintenant() ? c.code.bloqueJusqua : null, essaisRestants: Math.max(P.code.essais - c.code.faux, 0) },
    porteurDesigne: c.porteurDesigne,
    groupageJusquau: c.groupageJusquau,
    constat: c.constat,
    retour: c.retour,
    sortie,
    remise: c.remise,
    preuves: c.preuves,
    journal: c.journal,
  }
}

export const tousLesColis = (): ColisRelais[] => {
  const e = etatColis.lire()
  const j = aujourdhui()
  return Object.values(e.colis).map((c) => vue(c, e, j))
}
export const unColis = (id: string): ColisRelais | null => {
  const e = etatColis.lire()
  return e.colis[id] ? vue(e.colis[id], e) : null
}
export function groupeVu(id: string): GroupeRemise | null {
  const e = etatColis.lire()
  const g = e.groupes[id]
  if (!g) return null
  const colis = membresDuGroupe(e, id)
  return { id, colis: colis.map((c) => c.id), arrives: colis.filter((c) => ARRIVES.includes(c.etat)).length, total: g.total }
}

/** Colis physiquement au relais (retours compris) ; `capacite` : sans les retours (CAL-21). */
export const presents = (l: ColisRelais[] = tousLesColis()) => l.filter((c) => PRESENTS.includes(c.etat))
export const occupationDuRelais = (placesDeclarees: number, l: ColisRelais[] = tousLesColis()) => occupation(presents(l).map((c) => ({ classe: c.classe, retour: c.etat === 'retour_depose' })), placesDeclarees, P)

/** Plan des étagères avec l'occupation réelle des cases (tous les colis présents rangés, retours compris). */
export function plan(l: ColisRelais[] = tousLesColis()): Case[] {
  return PLAN.map((k) => ({ ...k, occupee: presents(l).filter((c) => c.emplacement === k.code).reduce((n, c) => n + c.places, 0) }))
}
export const emplacementPour = (classe: ClasseColis) => attribuerEmplacement(classe, plan(), P)

/** Onglets du stock (PR-06). */
export const FILTRES: Record<OngletStock, (c: ColisRelais) => boolean> = {
  tous: (c) => PRESENTS.includes(c.etat) && c.etat !== 'retour_depose',
  prets: (c) => (c.etat === 'en_stock' || c.etat === 'dernier_jour') && c.code.envoye,
  dernier_jour: (c) => c.etat === 'dernier_jour',
  a_faire_partir: (c) => ['a_renvoyer', 'a_faire_partir', 'refuse_comptoir', 'transfert_demande', 'retour_depose'].includes(c.etat),
  constats: (c) => c.etat === 'en_constat',
  groupage: (c) => c.etat === 'en_groupage',
  retours: (c) => c.etat === 'retour_depose',
}

// ── Gestes ─────────────────────────────────────────────────────────────────────────────────────────────────────
export type RefusGeste = RefusCycle | 'introuvable'

/**
 * Applique un événement du cycle à un colis : vérifié par calculs/cycle.ts, idempotent (une clé d'origine ne s'applique
 * qu'une fois par colis), écrit au journal (signé quand le PIN l'a été) ; `effet` complète l'état (emplacement, preuve…).
 */
export function appliquer(id: string, ev: EvenementCycle, ctx: ContexteGeste, o: Origine, par: Acteur, effet?: (c: ColisDemo, e: Etat) => void, detail: string | null = null): { ok: true; vers: EtatColis } | { ok: false; raison: RefusGeste } {
  const e = etatColis.lire()
  const c = e.colis[id]
  if (!c && ev !== 'en_trop' && ev !== 'depot_retour') return { ok: false, raison: 'introuvable' }
  const marque = `${o.cle}:${id}`
  if (e.appliques.includes(marque)) return { ok: true, vers: c?.etat ?? 'recu' }
  const de = c ? etatVu(e, c, jourDe(o.heure)) : null
  const t = transition(de, ev, ctx, P)
  if (!t.ok) return t
  etatColis.ecrire((x) => {
    x.appliques.push(marque)
    const y = x.colis[id]
    if (y) {
      y.etat = t.vers
      y.journal.push({ le: o.heure, action: ev, par, signe: !!ctx.pinOk, detail, cle: o.cle })
    }
    effet?.(x.colis[id], x)
  })
  return t
}

/** Ajoute une preuve (photos prises par le professionnel). */
export const preuve = (c: ColisDemo, nature: Preuve['nature'], photos: Photo[], par: Acteur, le: Instant) => void c.preuves.push({ nature, photos, par, le })

/** Crée un colis inconnu du relais (en trop dans un lot, retour déposé). */
export function creerColis(e: Etat, id: string, classe: ClasseColis, o: Partial<ColisDemo>): ColisDemo {
  const c: ColisDemo = {
    id,
    groupe: groupeDe(id),
    classe,
    gros: false,
    fragile: false,
    valeur: 0,
    paye: 0,
    client: '—',
    emplacement: null,
    etat: 'recu',
    arrivee: { lot: null, mission: null, livreur: null, entreprise: null, le: null, photo: null, resultat: null, reserve: null },
    avisA: null,
    paiement: { mode: 'paye', montant: 0, etat: 'paye', reference: null },
    porteurDesigne: null,
    groupageJusquau: null,
    constat: null,
    suspendu: null,
    retour: null,
    sortie: null,
    remise: null,
    preuves: [],
    journal: [],
    code: { empreinte: empreinte(codeDemo(id)), faux: 0, bloqueJusqua: null },
    ...o,
  }
  e.colis[id] = c
  e.groupes[c.groupe] ??= { id: c.groupe, total: 1, encaissee: null }
  return c
}

export const resultatVersEvenement: Record<ResultatReception, EvenementCycle> = { ok: 'resultat_ok', reserve: 'resultat_reserve', refus: 'resultat_refus', absent: 'resultat_absent', en_trop: 'en_trop' }

/** Heure de référence du jeu d'essai (lots, collectes) : réexportée pour les démonstrations voisines. */
export { h }
