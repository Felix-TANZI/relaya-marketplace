// Règles du groupe S5 (pilotage et communication : ADM-P24, ADM-P26 à ADM-P29, interrupteurs, modèles), PURES : la
// source de démonstration (le « serveur ») et les écrans les appliquent de la même façon. Aucune valeur écrite ici :
// chaque délai, seuil ou montant est lu au registre officiel par src/calculs/registre.ts (les valeurs du paquet ADMIN
// que S5 lit y sont entrées : A-VALIDER § 4).
import { REGISTRE, PARAMETRES, valeur, type Registre } from '../../calculs/registre'
import { ParametreIllisible } from '../../calculs/erreurs'
import { HEURE, JOUR, MINUTE } from '../../calculs/temps'

const brut = (r: Registre, code: string): string => valeur(r, code)
const nombre = (s: string) => Number(s.replace(/[\s  ]/g, '').replace(',', '.'))
/** Premier nombre d'une valeur écrite (« 2 h pendant les heures du support » → 2 ; « 3,5 » → 3.5). */
function premier(r: Registre, code: string): number {
  const m = /(\d[\d  ]*(?:,\d+)?)/.exec(brut(r, code))
  if (!m) throw new ParametreIllisible(`${code} : « ${brut(r, code)} » ne contient pas de nombre`)
  return nombre(m[1])
}
/** Tous les nombres d'une valeur (« 600 / 450 / 350 », « 7 h – 21 h »). */
function nombres(r: Registre, code: string, attendus: number): number[] {
  const l = [...brut(r, code).matchAll(/(\d+(?:[  ]\d{3})*(?:,\d+)?)/g)].map((m) => nombre(m[1]))
  if (l.length < attendus) throw new ParametreIllisible(`${code} : ${attendus} nombres attendus`)
  return l.slice(0, attendus)
}

export interface ReglesS5 {
  motifMin: number
  zones: { code: string; nom: string }[]
  // Paramétrage (ADM-P24)
  margeSecuritePct: number
  preavisJ: number
  prixRelais: number
  prixDomicile: number
  partRelais: [number, number, number] // S, M, L
  tourneeYafé: [number, number, number] // 1-4, 5-9, 10 et plus (par colis)
  domicileYafé: [number, number] // entre Z2, Z3, Z6 ; depuis ou vers Z1
  // Promotions (ADM-P26)
  flashDureeMaxH: number
  flashRemiseMinPct: number
  flashMajorationPts: number
  generositeLancementPct: number
  generositeCourantPct: number
  fidelitePlafondPct: number
  croissanceAn1Pct: number
  croissanceEnsuitePct: number
  promoParSemaine: number
  promoHeures: [number, number]
  // Messagerie (ADM-P27)
  smsMaxCommande: number
  smsBudgetCommande: number
  smsPrix: number
  delivranceAlertePct: number
  c1CarteMin: number
  codeRenvois24h: number
  diffusionSeuil: number
  validiteH: [number, number, number] // criticité 1, 2, 3
  pushMax24h: number
  nuit: [number, number]
  conservationMois: number
  // Panne (ADM-P28)
  ressaisieH: number
  rapportH: number
  diffusionObjectifMin: number
  // Support (ADM-P29)
  supportDelaiH: number
  supportHeures: [number, number]
  supportAlerteMin: number
  gesteMontant: number
}

export function lireReglesS5(r: Registre = REGISTRE): ReglesS5 {
  const [rS, rM, rL] = nombres(r, 'RELAIS-GAIN-COLIS', 3)
  const [t14, t59, t10] = nombres(r, 'ENT-YAFE-TOURNEE', 3)
  const [d1, d2] = nombres(r, 'ENT-YAFE-DOMICILE', 2)
  const [v1, v2, v3] = nombres(r, 'MSG-VALIDITE', 6).filter((_, i) => i % 2 === 1)
  const [ph1, ph2] = nombres(r, 'PUSH-PROMO', 3).slice(1)
  const [n1, n2] = nombres(r, 'PUSH-NUIT', 2)
  const [s1, s2] = nombres(r, 'SUP-HORAIRES', 2)
  return {
    motifMin: PARAMETRES.console.motifMin,
    zones: PARAMETRES.zonesExploitees,
    margeSecuritePct: premier(r, 'ADM-MARGE-SECURITE'),
    preavisJ: premier(r, 'ADM-PREAVIS-J'),
    prixRelais: premier(r, 'LIV-RELAIS-BASE'),
    prixDomicile: premier(r, 'LIV-DOM-BASE'),
    partRelais: [rS, rM, rL],
    tourneeYafé: [t14, t59, t10],
    domicileYafé: [d1, d2],
    flashDureeMaxH: premier(r, 'FLASH-DUREE-MAX'),
    flashRemiseMinPct: premier(r, 'FLASH-REMISE-MIN'),
    flashMajorationPts: premier(r, 'VD-PUB-FLASH-MAJORATION'),
    generositeLancementPct: premier(r, 'ADM-GENEROSITE-LANCEMENT'),
    generositeCourantPct: premier(r, 'ADM-GENEROSITE-COURANT'),
    fidelitePlafondPct: premier(r, 'ADM-FIDELITE-PLAFOND'),
    croissanceAn1Pct: premier(r, 'ADM-CROISSANCE-AN1'),
    croissanceEnsuitePct: premier(r, 'ADM-CROISSANCE-ENSUITE'),
    promoParSemaine: premier(r, 'PUSH-PROMO'),
    promoHeures: [ph1, ph2],
    smsMaxCommande: premier(r, 'SMS-MAX-CMD'),
    smsBudgetCommande: premier(r, 'sms_budget_par_commande'),
    smsPrix: premier(r, 'sms_prix_unitaire'),
    delivranceAlertePct: premier(r, 'sms_taux_delivrance_alerte'),
    c1CarteMin: premier(r, 'ADM-MSG-C1-MIN'),
    codeRenvois24h: premier(r, 'CODE-RENVOI'),
    diffusionSeuil: premier(r, 'diffusion_quatre_yeux_seuil'),
    validiteH: [v1, v2, v3],
    pushMax24h: premier(r, 'PUSH-MAX-24H'),
    nuit: [n1, n2],
    conservationMois: premier(r, 'NOT-CONSERV'),
    ressaisieH: premier(r, 'ADM-PAPIER-RESSAISIE-H'),
    rapportH: premier(r, 'ADM-PANNE-RAPPORT-H'),
    diffusionObjectifMin: premier(r, 'panne_diffusion_objectif_min'),
    supportDelaiH: premier(r, 'SUP-DELAI'),
    supportHeures: [s1, s2],
    supportAlerteMin: premier(r, 'support_alerte_retard_min'),
    gesteMontant: premier(r, 'SUP-GESTE'),
  }
}
export const REGLES_S5: ReglesS5 = lireReglesS5()

// ── Paramétrage (ADM-P24) ──────────────────────────────────────────────────────────────────────────────────────────
/** Familles critiques (ADM-P24R-04 : commissions, grilles, plafonds, seuils IFA, garde, escrow) et paramètres de la console. */
const CRITIQUES = [/^VD-COM/, /^COM-/, /^PLAF/, /^GARDE-/, /^IFA-/, /^LIB-/, /^ESCROW/, /^WALLET-/, /^ABO-/, /^ENT-YAFE-/, /^LIV-(RELAIS|DOM)-BASE$/, /^LIV-SEUIL-/, /^FF-/, /^REMB-CONTROLE-SEUIL$/, /^VERSEMENT-CONTROLE-SEUIL$/, /^motif_min_caracteres$/, /^ZONES-EXPLOITEES$/, /^CONSOLE-CONTRESEING-H$/, /^RELAIS-GAIN-/]
export const estCritique = (code: string) => CRITIQUES.some((re) => re.test(code))

/** Statut du registre (Décidé, Proposé, Recommandé, À trancher) : un « Décidé » ne change que sur décision écrite citée (ADM-P24R-03). */
export const exigeReference = (statut: string) => statut === 'Décidé'
/** Référence d'une décision écrite : « DP-68 », « décision du 22 sept. », « A-VALIDER A-13 »… (8 caractères au moins). */
export const referenceValable = (r: string) => /^DP-\d+$/i.test(r.trim()) || r.trim().length >= 8

export type FormeValeur =
  | { genre: 'montant'; n: number; pas: number; suffixe: string }
  | { genre: 'pourcent'; n: number; pas: number; suffixe: string }
  | { genre: 'entier'; n: number; pas: number; suffixe: string }
  | { genre: 'texte' }

/**
 * Forme d'une valeur du registre : seule une valeur chiffrée se propose, par pas imposés (ADM-LEC-03 : 0,5 point
 * pour un taux, 50 F pour un prix, 1 pour un délai ou un nombre) ; une valeur écrite en mots change par décision.
 */
export function formeValeur(valeur: string, unite: string | null): FormeValeur {
  const v = valeur.trim()
  const m = /^(\d+(?:[  ]\d{3})*(?:,\d+)?)\s*(F CFA|F|%|h|min|jours?|heures?|minutes?)?$/.exec(v)
  if (!m) return { genre: 'texte' }
  const n = nombre(m[1])
  const u = m[2] ?? ''
  const uniteTout = (u || unite || '').trim()
  if (/^F( CFA)?\b/.test(uniteTout)) return { genre: 'montant', n, pas: 50, suffixe: u ? ' ' + u : '' }
  if (/^%/.test(uniteTout)) return { genre: 'pourcent', n, pas: 0.5, suffixe: u ? ' %' : '' }
  if (!Number.isInteger(n)) return { genre: 'texte' }
  return { genre: 'entier', n, pas: 1, suffixe: u ? ' ' + u : '' }
}
export const surLePas = (f: FormeValeur, n: number) => f.genre !== 'texte' && n > 0 && Math.abs(n / f.pas - Math.round(n / f.pas)) < 1e-9
/** Valeur écrite comme au registre (« 800 F », « 16,5 % », « 72 »). */
export function ecrireValeur(f: FormeValeur, n: number): string {
  if (f.genre === 'texte') return ''
  const corps = f.genre === 'pourcent' ? String(n).replace('.', ',') : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return corps + f.suffixe
}

/** Date d'effet la plus proche : annonce aux partenaires `preavisJ` jours avant (ADM-PRI-05), jamais rétroactive. */
export const dateEffetMin = (maintenant: number, preavisJ: number) => maintenant + preavisJ * JOUR

/** Plafond d'achat d'une remise au relais : (prix client − part du gérant) ÷ (1 + marge), à la dizaine inférieure (ADM-02-R33). */
export const plafondAchat = (prix: number, part: number, margePct: number) => Math.floor((prix - part) / (1 + margePct / 100) / 10) * 10
/** Marge d'un cas type après la marge de sécurité (ADM-02-R34) : prix client − (part du gérant + prix d'achat) × (1 + marge). */
export const margeCasType = (prix: number, part: number, achat: number, margePct: number) => Math.round(prix - (part + achat) * (1 + margePct / 100))

export interface CasType {
  id: string
  mode: 'relais' | 'domicile'
  tranche: string // « 1–4 » colis
  zone: string
  prix: number
  part: number
  achat: number
  marge: number
}
export interface EntreesTarif {
  prixRelais: number
  prixDomicile: number
  partS: number
  tournee: [number, number, number]
  domicile: [number, number]
  margePct: number
  plafondS: number | null // PLAFOND-RELAIS-S (registre) ; null : recalculé
}

/** Cas types de la simulation (colis S) : relais × trois tranches de tournée, domicile, dans chaque zone exploitée. */
export function casTypes(e: EntreesTarif, zones: { code: string; nom: string }[]): CasType[] {
  const out: CasType[] = []
  const tranches: [string, number][] = [['1–4', e.tournee[0]], ['5–9', e.tournee[1]], ['10+', e.tournee[2]]]
  for (const z of zones) {
    for (const [tr, achat] of tranches) out.push({ id: `relais-${tr}-${z.code}`, mode: 'relais', tranche: tr, zone: z.code, prix: e.prixRelais, part: e.partS, achat, marge: margeCasType(e.prixRelais, e.partS, achat, e.margePct) })
    const achatDom = z.code === 'Z1' ? e.domicile[1] : e.domicile[0]
    out.push({ id: `domicile-${z.code}`, mode: 'domicile', tranche: '1', zone: z.code, prix: e.prixDomicile, part: 0, achat: achatDom, marge: margeCasType(e.prixDomicile, 0, achatDom, e.margePct) })
  }
  return out
}

/** Entrées tarifaires en vigueur, éventuellement remplacées par la valeur proposée d'un paramètre. */
export function entreesTarif(r: ReglesS5, plafondS: number | null, code?: string, valeur?: number): EntreesTarif {
  const e: EntreesTarif = { prixRelais: r.prixRelais, prixDomicile: r.prixDomicile, partS: r.partRelais[0], tournee: [...r.tourneeYafé], domicile: [...r.domicileYafé], margePct: r.margeSecuritePct, plafondS }
  if (code === 'LIV-RELAIS-BASE' && valeur !== undefined) e.prixRelais = valeur
  if (code === 'LIV-DOM-BASE' && valeur !== undefined) e.prixDomicile = valeur
  if (code === 'PLAFOND-RELAIS-S' && valeur !== undefined) e.plafondS = valeur
  return e
}
/** Codes dont la valeur entre dans les cas types (les autres ne touchent ni prix ni marge d'une course). */
export const TARIFAIRES = new Set(['LIV-RELAIS-BASE', 'LIV-DOM-BASE', 'PLAFOND-RELAIS-S'])

export interface Controle {
  id: 'marge' | 'grille' | 'preavis' | 'retroactif' | 'motif' | 'reference' | 'pas'
  ok: boolean
}
export interface Simulation {
  cas: CasType[]
  avant: CasType[]
  negatifs: number
  plafondS: number
  grilleAuDessus: boolean // la première tranche de la grille de l'entreprise sous contrat dépasse le plafond
  controles: Controle[]
  bloquee: boolean
}

export interface DemandeSimulation {
  code: string
  forme: FormeValeur
  apres: number
  dateEffet: number
  motif: string
  reference: string
  statut: string
  maintenant: number
}

/** Simulation d'une proposition (ADM-P24R-01, R-05) : cas types avant / après, contrôles ; bloquée si un contrôle échoue. */
export function simuler(d: DemandeSimulation, r: ReglesS5 = REGLES_S5, plafondRegistre: number | null = null): Simulation {
  const avantE = entreesTarif(r, plafondRegistre)
  const apresE = entreesTarif(r, plafondRegistre, d.code, d.apres)
  const avant = casTypes(avantE, r.zones)
  const cas = TARIFAIRES.has(d.code) ? casTypes(apresE, r.zones) : avant
  const negatifs = cas.filter((c) => c.marge < 0).length
  const calcule = plafondAchat(apresE.prixRelais, apresE.partS, apresE.margePct)
  const plafondS = apresE.plafondS !== null ? Math.min(apresE.plafondS, calcule) : calcule
  const grilleAuDessus = TARIFAIRES.has(d.code) && apresE.tournee[0] > plafondS
  const controles: Controle[] = [
    { id: 'marge', ok: negatifs === 0 },
    { id: 'grille', ok: !grilleAuDessus },
    { id: 'pas', ok: surLePas(d.forme, d.apres) },
    { id: 'preavis', ok: d.dateEffet >= dateEffetMin(d.maintenant, r.preavisJ) - MINUTE },
    { id: 'retroactif', ok: d.dateEffet > d.maintenant },
    { id: 'motif', ok: d.motif.trim().length >= r.motifMin },
    { id: 'reference', ok: !exigeReference(d.statut) || referenceValable(d.reference) },
  ]
  return { cas, avant, negatifs, plafondS, grilleAuDessus, controles, bloquee: controles.some((c) => !c.ok) }
}

// ── Promotions et ventes flash (ADM-P26) ───────────────────────────────────────────────────────────────────────────
/** Remise flash réelle (ADM-P26R-01) : (prix pratiqué sur 30 jours − prix flash) ÷ prix pratiqué, en %. */
export const remiseReelle = (prix30: number, prixFlash: number) => (prix30 > 0 ? ((prix30 - prixFlash) / prix30) * 100 : 0)

export interface FlashAControler {
  prix30: number
  joursPratique: number // jours sur 30 où le prix barré a été pratiqué
  prixFlash: number
  debut: number
  fin: number
  stockReserve: number
  stockOffre: number
  zone: string | null
  remiseCumuleePct: number // flash + code promo + fidélité sur l'article (codes et fidélité fermés : flash seule)
}
export type ControleFlash = 'prix_barre' | 'remise' | 'generosite' | 'duree' | 'stock' | 'ciblage' | 'futur'
/** Contrôles avant programmation (ADM-P26R-02, R-06, ADM-02-R37) : un contrôle en échec bloque. */
export function controlerFlash(f: FlashAControler, maintenant: number, r: ReglesS5 = REGLES_S5): { id: ControleFlash; ok: boolean }[] {
  const remise = remiseReelle(f.prix30, f.prixFlash)
  return [
    { id: 'prix_barre', ok: f.joursPratique >= 7 },
    { id: 'remise', ok: remise + 1e-9 >= r.flashRemiseMinPct },
    { id: 'generosite', ok: Math.max(remise, f.remiseCumuleePct) <= r.generositeLancementPct + 1e-9 },
    { id: 'duree', ok: f.fin > f.debut && f.fin - f.debut <= r.flashDureeMaxH * HEURE },
    { id: 'stock', ok: f.stockReserve > 0 && f.stockReserve <= f.stockOffre },
    { id: 'ciblage', ok: !!f.zone },
    { id: 'futur', ok: f.debut > maintenant },
  ]
}

export type EtatFlash = 'brouillon' | 'programmee' | 'en_cours' | 'terminee' | 'epuisee' | 'arretee' | 'annulee'
/** État d'une vente flash à l'heure du serveur : fin jamais prolongée ; stock nul → arrêt automatique. */
export function etatFlash(f: { programmee: boolean; debut: number; fin: number; stockReserve: number; ventes: number[]; arreteeLe: number | null; annuleeLe: number | null }, maintenant: number): { etat: EtatFlash; vendus: number; finReelle: number } {
  if (f.annuleeLe !== null) return { etat: 'annulee', vendus: 0, finReelle: f.annuleeLe }
  if (!f.programmee) return { etat: 'brouillon', vendus: 0, finReelle: f.fin }
  const ventes = [...f.ventes]
    .sort((a, b) => a - b)
    .filter((v) => v >= f.debut && v < f.fin && v <= maintenant && (f.arreteeLe === null || v < f.arreteeLe))
    .slice(0, f.stockReserve)
  const vendus = ventes.length
  const epuiseLe = vendus >= f.stockReserve ? ventes[f.stockReserve - 1] : null
  if (f.arreteeLe !== null && f.arreteeLe <= maintenant && (epuiseLe === null || f.arreteeLe < epuiseLe)) return { etat: 'arretee', vendus, finReelle: f.arreteeLe }
  if (epuiseLe !== null) return { etat: 'epuisee', vendus, finReelle: epuiseLe }
  if (maintenant < f.debut) return { etat: 'programmee', vendus, finReelle: f.fin }
  if (maintenant < f.fin) return { etat: 'en_cours', vendus, finReelle: f.fin }
  return { etat: 'terminee', vendus, finReelle: f.fin }
}

export interface Budget {
  croissanceMax: number
  croissanceConsomme: number
  fideliteMax: number
  fideliteConsomme: number
  arretCroissance: boolean
  arretFidelite: boolean
}
/** Budgets (ADM-P26R-04, R-08) : croissance = part des revenus ; fidélité = part du volume d'affaires ; au-delà, arrêt. */
export function budgets(m: { revenus: number; volume: number; premiereAnnee: boolean; livraisonOfferte: number; gestes: number; remisesBelivay: number; fidelite: number }, r: ReglesS5 = REGLES_S5): Budget {
  const croissanceMax = Math.floor((m.revenus * (m.premiereAnnee ? r.croissanceAn1Pct : r.croissanceEnsuitePct)) / 100)
  const fideliteMax = Math.floor((m.volume * r.fidelitePlafondPct) / 100)
  const croissanceConsomme = m.livraisonOfferte + m.gestes + m.remisesBelivay
  return { croissanceMax, croissanceConsomme, fideliteMax, fideliteConsomme: m.fidelite, arretCroissance: croissanceConsomme >= croissanceMax, arretFidelite: m.fidelite >= fideliteMax }
}

// ── Messages (ADM-P27, modèles) ────────────────────────────────────────────────────────────────────────────────────
/** Variables d'un modèle : le serveur les remplit à l'envoi. `{code}` n'existe que dans le modèle du code de retrait. */
export const VARIABLES = ['ref', 'relais', 'heure', 'date', 'montant', 'boutique', 'entreprise', 'motif', 'zone', 'jour', 'code'] as const
export type Variable = (typeof VARIABLES)[number]

export type RaisonContenu = 'numero' | 'code' | 'variable_inconnue' | 'code_hors_modele'
/**
 * Jamais de numéro ni de code dans un texte (ADM-CACHEE-27, ADM-P29R-05 : 422 CONTENU_INTERDIT) : un numéro de
 * téléphone (8 chiffres ou plus, +237) ou un code (4 à 6 chiffres seuls) refuse le texte ; les références (BLV-…),
 * montants, heures, durées et années restent permis.
 */
export function contenuInterdit(texte: string, o: { codePermis?: boolean } = {}): RaisonContenu | null {
  for (const m of texte.matchAll(/\{(\w+)\}/g)) {
    if (!(VARIABLES as readonly string[]).includes(m[1])) return 'variable_inconnue'
    if (m[1] === 'code' && !o.codePermis) return 'code_hors_modele'
  }
  const s = texte
    .replace(/\{\w+\}/g, ' ')
    .replace(/\b[A-Z]{2,4}(?:-[A-Z0-9]+)+\b/g, ' ')
    .replace(/\d+(?:[   ]\d{3})*(?:,\d+)?\s?(?:F CFA|F\b|%|h\b|min\b|jours?\b|heures?\b|kg\b|g\b|Go\b|mois\b|ans?\b|yards?\b)/g, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
  if (/\+\s?237/.test(s) || /\d(?:[\s.-]?\d){7,}/.test(s)) return 'numero'
  if (/(?<![\d,])\d{4,6}(?![\d,])/.test(s)) return 'code'
  return null
}

/** Remplit les variables d'un modèle pour l'aperçu ; le code reste masqué, même dans l'aperçu (ADM-P27R-05). */
export const remplir = (texte: string, valeurs: Partial<Record<Variable, string>>) => texte.replace(/\{(\w+)\}/g, (_, v: string) => (v === 'code' ? '●●●●●●' : (valeurs[v as Variable] ?? `{${v}}`)))

// Alphabet GSM 03.38 (base) : au-delà, un SMS passe en UCS-2 (70 caractères, 67 par partie).
const GSM = new Set("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà".split(''))
const GSM_EXT = new Set('^{}\\[~]|€'.split(''))
/** Parties facturées d'un SMS (160 / 153 caractères en GSM, 70 / 67 en UCS-2). */
export function partiesSms(texte: string): { caracteres: number; parties: number; unicode: boolean } {
  const unicode = [...texte].some((c) => !GSM.has(c) && !GSM_EXT.has(c))
  const caracteres = unicode ? [...texte].length : [...texte].reduce((n, c) => n + (GSM_EXT.has(c) ? 2 : 1), 0)
  const [un, plusieurs] = unicode ? [70, 67] : [160, 153]
  return { caracteres, unicode, parties: caracteres <= un ? 1 : Math.ceil(caracteres / plusieurs) }
}

/** Taux de délivrance (ADM-11-R04) : délivrés ÷ envoyés ; null sans envoi. */
export const tauxDelivrance = (delivres: number, envoyes: number) => (envoyes ? (delivres / envoyes) * 100 : null)
/** Coût SMS par commande (ADM-11-R03) : Σ coûts ÷ commandes ; un SMS en échec n'est pas facturé. */
export const coutParCommande = (cout: number, commandes: number) => (commandes ? Math.round(cout / commandes) : null)
/** Diffusion à quatre yeux au-delà du seuil de destinataires (ADM-11-R06). */
export const diffusionQuatreYeux = (destinataires: number, r: ReglesS5 = REGLES_S5) => destinataires > r.diffusionSeuil

/** Heure de Yaoundé (0-23) d'un instant. */
export const heureYaounde = (t: number) => new Date(t + HEURE).getUTCHours()
/** Une promotion part entre ses heures (PUSH-PROMO : 9 h – 20 h). */
export const dansHeuresPromo = (t: number, r: ReglesS5 = REGLES_S5) => heureYaounde(t) >= r.promoHeures[0] && heureYaounde(t) < r.promoHeures[1]

// ── Panne et mode papier (ADM-P28) ─────────────────────────────────────────────────────────────────────────────────
/** Prolongation des délais (ADM-P28R-04) : fin de la panne déclarée − déclaration (la détection ne compte pas). */
export const prolongation = (declareLe: number, retabliLe: number) => Math.max(0, retabliLe - declareLe)
/** Durée de la panne au rapport (ADM-11-R12) : retour du service − détection. */
export const dureePanne = (detecteLe: number, retabliLe: number) => Math.max(0, retabliLe - detecteLe)
export const echeanceRessaisie = (remiseLe: number, r: ReglesS5 = REGLES_S5) => remiseLe + r.ressaisieH * HEURE
export const echeanceRapport = (retabliLe: number, r: ReglesS5 = REGLES_S5) => retabliLe + r.rapportH * HEURE
/** Clôture possible ⇔ service rétabli, toutes les remises papier ressaisies (409 REGISTRE_NON_RESSAISI) et rapport écrit. */
export function peutClore(i: { retabliLe: number | null; rapport: { cause: string; effets: string; change: string } | null; remises: { ressaisieLe: number | null }[] }, maintenant: number, r: ReglesS5 = REGLES_S5): 'ok' | 'non_retabli' | 'registre' | 'rapport' {
  if (i.retabliLe === null) return 'non_retabli'
  if (i.remises.some((x) => x.ressaisieLe === null || x.ressaisieLe > maintenant)) return 'registre'
  if (!i.rapport || [i.rapport.cause, i.rapport.effets, i.rapport.change].some((x) => x.trim().length < r.motifMin)) return 'rapport'
  return 'ok'
}

// ── Support (ADM-P29) ──────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Échéance de la première réponse (ADM-P29R-04) : arrivée + délai, compté seulement pendant les heures d'ouverture
 * (7 h – 21 h à Yaoundé) ; hors heures, le délai court à partir de l'ouverture.
 */
export function echeanceSupport(arrivee: number, r: ReglesS5 = REGLES_S5): number {
  const [ouv, ferm] = r.supportHeures
  let reste = r.supportDelaiH * HEURE
  let t = arrivee
  for (let i = 0; i < 30 && reste > 0; i++) {
    const debutJour = t - ((t + HEURE) % JOUR) // minuit à Yaoundé
    const o = debutJour + ouv * HEURE
    const f = debutJour + ferm * HEURE
    if (t < o) t = o
    if (t >= f) {
      t = debutJour + JOUR + ouv * HEURE
      continue
    }
    const dispo = f - t
    if (reste <= dispo) return t + reste
    reste -= dispo
    t = debutJour + JOUR + ouv * HEURE
  }
  return t
}
/** Geste commercial (ADM-CACHEE-14, ADM-11-R15) : montant fixe du paramètre, jamais au-delà de la commission perçue. */
export const gestePossible = (commission: number, r: ReglesS5 = REGLES_S5) => r.gesteMontant <= commission

/** Interrupteur : s'ouvre seulement quand tous ses paramètres sont décidés (ADM-CACHEE-25, ADM-P24R-07 : 423 MODULE_BLOQUE). */
export const moduleBloque = (statuts: string[]) => statuts.some((s) => s === 'À trancher')
