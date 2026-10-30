// Codes de la chaîne, réception d'un lot et capacité (compléments) : PORTAGE FIDÈLE de moteurs/belivay_moteurs/relais.py
// (essai_code, controle_reception, places_manquantes, propose_au_client) ; mêmes exemples de test que
// moteurs/tests/test_relais.py. REC-01 à REC-11, CAL-20 à CAL-31, ARL-11, ARL-133, DP-20, PR-RC-04, 05, 08, 16, 21.
// Chaque contrôle rend une liste ORDONNÉE de blocages (code stable, règle) : l'écran montre le premier, le serveur
// refuse le geste tant qu'elle n'est pas vide. Occupation et emplacement : capacite.ts (occupation, attribuerEmplacement).
import type { ClasseColis, Instant } from '../donnees/communs'
import type { Occupation } from './capacite'
import type { ParametresMoteursRelais } from './parametres-moteurs'
import { HEURE } from './temps'

/** Ce qui empêche un geste d'aboutir : `code` stable (écran, API, textes FR/EN), `regle` source, colis concerné. */
export interface Blocage {
  code: string
  regle: string
  colis: string | null
}
const blocage = (code: string, regle: string, colis: string | null = null): Blocage => ({ code, regle, colis })

const positifs = (...v: number[]) => {
  if (v.some((x) => x < 0)) throw new Error('compteur ou montant négatif')
}

// ── Codes (CAL-31, REC-01, RET-02, PR-RC-21) ──
export interface EssaiDeCode {
  accepte: boolean
  essaisFaux: number // après cet essai ; 0 après un code juste
  essaisRestants: number // « Code incorrect · encore n essais »
  bloqueJusquAu: Instant | null
}
/** Un essai du code de dépôt (REC-01) ou du code de retrait (RET-02) : bloqué CODE-BLOCAGE-H après CODE-ESSAIS faux ;
 * pendant le blocage rien n'est compté ni accepté ; le blocage échu, le compteur repart de zéro. */
export function essaiDeCode(juste: boolean, essaisFauxAvant: number, maintenant: Instant, p: Pick<ParametresMoteursRelais, 'codeEssais' | 'codeBlocageHeures'>, bloqueJusquAu: Instant | null = null): EssaiDeCode {
  positifs(essaisFauxAvant)
  let avant = essaisFauxAvant
  if (bloqueJusquAu !== null) {
    if (maintenant < bloqueJusquAu) return { accepte: false, essaisFaux: avant, essaisRestants: 0, bloqueJusquAu }
    avant = 0
  }
  if (juste) return { accepte: true, essaisFaux: 0, essaisRestants: p.codeEssais, bloqueJusquAu: null }
  const faux = avant + 1
  if (faux >= p.codeEssais) return { accepte: false, essaisFaux: faux, essaisRestants: 0, bloqueJusquAu: maintenant + p.codeBlocageHeures * HEURE }
  return { accepte: false, essaisFaux: faux, essaisRestants: p.codeEssais - faux, bloqueJusquAu: null }
}

// ── Réception d'un lot ──
export type ResultatReception = 'ok' | 'réserve' | 'refusé' | 'absent' | 'en_trop'
export interface ColisDuLot {
  reference: string
  resultat: ResultatReception | null
  photos: number
  annonce: boolean // dans la liste du lot téléchargée ; false : scanné en plus
  pourCeRelais: boolean // l'étiquette dit ce relais (REC-11)
}
export const colisDuLot = (reference: string, resultat: ResultatReception | null, o: Partial<Omit<ColisDuLot, 'reference' | 'resultat'>> = {}): ColisDuLot => ({
  reference,
  resultat,
  photos: o.photos ?? 0,
  annonce: o.annonce ?? true,
  pourCeRelais: o.pourCeRelais ?? true,
})

export interface ControleReception {
  blocages: Blocage[]
  valide: boolean // « Valider le lot » actif (REC-02)
  recus: string[] // entrent en stock à la confirmation du livreur
  repartent: string[] // refusés, en trop, d'un autre relais : restent au livreur
  absents: string[] // écart à la charge du livreur
  aAccepterParLivreur: string[] // réserves et refus, acceptés par le livreur avant sa confirmation (PR-RC-08)
}

const ORDRE_RECEPTION = ['colis_en_double', 'resultat_manquant', 'colis_en_trop', 'resultat_incoherent', 'pas_pour_ce_relais', 'photo_reserve', 'photos_refus', 'photo_du_lot']
const seul = (b: Blocage): ControleReception => ({ blocages: [b], valide: false, recus: [], repartent: [], absents: [], aAccepterParLivreur: [] })

/** Contrôles avant « Valider le lot », dans l'ordre : code de dépôt (sans lui, rien d'autre) ; colis en double ; colis
 * sans résultat ; en trop pris ; annoncé marqué en trop ; d'un autre relais pris ; photos des réserves et des refus ;
 * photo du lot (ARL-11). */
export function controleReception(codeDepotValide: boolean, colis: readonly ColisDuLot[], photosDuLot: number, p: Pick<ParametresMoteursRelais, 'lotPhotosMin' | 'reservePhotosMin' | 'refusPhotosMin'>, o: { codeBloque?: boolean; dejaRecu?: boolean } = {}): ControleReception {
  positifs(photosDuLot, ...colis.map((c) => c.photos))
  if (o.codeBloque) return seul(blocage('code_depot_bloque', 'REC-01, CAL-31'))
  if (o.dejaRecu) return seul(blocage('lot_deja_recu', 'REC-01 (code à usage unique)'))
  if (!codeDepotValide) return seul(blocage('code_depot_requis', 'REC-01'))
  const trouves: [number, number, Blocage][] = []
  const bloquer = (rang: number, code: string, regle: string, ref: string | null) => trouves.push([ORDRE_RECEPTION.indexOf(code), rang, blocage(code, regle, ref)])
  const vus = new Set<string>()
  const uniques: ColisDuLot[] = []
  colis.forEach((c, rang) => {
    if (vus.has(c.reference)) return void bloquer(rang, 'colis_en_double', 'REC-02', c.reference)
    vus.add(c.reference)
    uniques.push(c)
    const r = c.resultat
    if (r === null) return void bloquer(rang, 'resultat_manquant', 'REC-02', c.reference)
    if (!c.annonce && r !== 'en_trop' && r !== 'refusé') bloquer(rang, 'colis_en_trop', 'REC-05', c.reference)
    if (c.annonce && r === 'en_trop') bloquer(rang, 'resultat_incoherent', 'REC-05', c.reference)
    if (!c.pourCeRelais && (r === 'ok' || r === 'réserve')) bloquer(rang, 'pas_pour_ce_relais', 'REC-11, PR-RC-04', c.reference)
    if (r === 'réserve' && c.photos < p.reservePhotosMin) bloquer(rang, 'photo_reserve', 'REC-03, ARL-133', c.reference)
    if (r === 'refusé' && c.photos < p.refusPhotosMin) bloquer(rang, 'photos_refus', 'REC-04, ARL-133', c.reference)
  })
  if (photosDuLot < p.lotPhotosMin) bloquer(colis.length, 'photo_du_lot', 'ARL-11, v6 D15', null)
  const pris = (r: ResultatReception | null) => r === 'ok' || r === 'réserve'
  const blocages = trouves.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((t) => t[2])
  return {
    blocages,
    valide: blocages.length === 0,
    recus: uniques.filter((c) => c.annonce && c.pourCeRelais && pris(c.resultat)).map((c) => c.reference),
    repartent: uniques.filter((c) => c.resultat === 'refusé' || c.resultat === 'en_trop' || (pris(c.resultat) && (!c.pourCeRelais || !c.annonce))).map((c) => c.reference),
    absents: uniques.filter((c) => c.resultat === 'absent').map((c) => c.reference),
    aAccepterParLivreur: uniques.filter((c) => c.annonce && (c.resultat === 'réserve' || c.resultat === 'refusé')).map((c) => c.reference),
  }
}

// ── Capacité (compléments de capacite.ts) ──
const CLASSES: readonly ClasseColis[] = ['S', 'M', 'L']
export function classeAuRelais(c: string): ClasseColis {
  if (!CLASSES.includes(c as ClasseColis)) throw new Error(`classe ${c} : S, M ou L au relais ; XL et hors gabarit jamais (CAL-20)`)
  return c as ClasseColis
}
/** « Il manque n places : préparez les départs d'abord » (ACC-04, PR-RC-16) ; le lot est reçu quand même (DP-20). */
export function placesManquantes(classesAnnoncees: readonly string[], o: Pick<Occupation, 'libres'>, p: Pick<ParametresMoteursRelais, 'places'>): number {
  const besoin = classesAnnoncees.reduce((s, c) => s + p.places[classeAuRelais(c)], 0)
  return Math.max(besoin - o.libres, 0)
}
/** Le relais paraît au choix du client : ouvert, pas saturé (PR-RC-05), encombrants acceptés pour un L (CAP-07). */
export function proposeAuClient(o: Pick<Occupation, 'seuilAtteint'>, classe: string, opt: { ouvert?: boolean; accepteEncombrants?: boolean } = {}): boolean {
  const c = classeAuRelais(classe)
  return (opt.ouvert ?? true) && !o.seuilAtteint && (c !== 'L' || (opt.accepteEncombrants ?? true))
}
