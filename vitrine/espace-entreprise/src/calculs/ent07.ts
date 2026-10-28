// Argent et qualité de l'entreprise (ENT-07 : litiges, règlements, relevés, score) : paramètres lus dans le registre
// (aucune valeur dans le code) et moteurs purs, partagés par la démonstration (le « serveur ») et les écrans.
// - Litiges selon DP-35 seule (DP-62, QUESTIONS L-01) : réponse sous delai_reponse_litige, décision de BelivaY au plus
//   LIT-DECISION-H après l'échéance, recours une fois sous LIT-RECOURS-H examiné par une autre personne (le médiateur
//   senior), arrangement sans réponse en LIT-ARRANG-REPONSE-J jours ⇒ retour en examen. Transporteur en tort : valeur
//   de l'article (plafonnée par le palier), livraison remboursée et trajet retour RET-TRAJET (DED-10, A-06).
// - Versements (ENT-ARG-01, ENT-P18R-*) : vendredi avant midi de ce qui est validé au plus tard le jeudi 23 h 59 ;
//   3 tentatives à 24 h ; changement de moyen ⇒ 7 jours bloqués ; solde négatif reporté 4 vendredis au plus.
// - Trust Score (ENT-TSC-01 à 04, ENT-P20R-04) : départ au neutre (µ, k), poids 0,5^(âge / demi-vie), gravités g1 = 1,
//   g2 = 2, g3 = 4 échecs (ENT-TSC-02, règle verrouillée), veto qui plafonne, baisse maximale par recalcul. Le score de
//   l'entreprise compte toutes les missions de ses livreurs (pondéré par le volume) et ses événements propres.
// Deux valeurs décidées par DP-35 manquent encore au registre de l'entreprise (LIT-DECISION-H, LIT-ARRANG-REPONSE-J) :
// elles sont lues si le registre les porte, sinon la valeur de DP-35 s'applique (INTEGRATION.md d'ENT-07).
import type { PalierEntreprise } from '../donnees/communs'
import { ParametreAbsent, ParametreIllisible } from './erreurs'
import { PARAMETRES, REGISTRE, entier, nombre, type Registre } from './registre'
import { HEURE, JOUR, MINUTE } from './temps'


function brut(r: Registre, code: string): { valeur: string; unite: string } {
  const p = r[code]
  if (!p) throw new ParametreAbsent(code)
  return { valeur: p.valeur.trim(), unite: (p.unite ?? '').trim() }
}
function groupe(r: Registre, code: string, motif: RegExp, dans: 'valeur' | 'unite' = 'valeur'): number {
  const m = motif.exec(brut(r, code)[dans])
  if (!m) throw new ParametreIllisible(`${code} : forme inattendue (${dans})`)
  return Number(m[1].replace(/[\s  ]/g, ''))
}
const JOURS_SEMAINE = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
export function jourSemaine(r: Registre, code: string): number {
  const v = brut(r, code).valeur.toLowerCase()
  const j = JOURS_SEMAINE.findIndex((n) => v.startsWith(n))
  if (j < 0) throw new ParametreIllisible(`${code} : jour de la semaine attendu`)
  return j
}
function heureMinute(r: Registre, code: string): { h: number; min: number } {
  const m = /(\d{1,2})\s*h\s*(\d{2})?/.exec(brut(r, code).valeur)
  if (!m) throw new ParametreIllisible(`${code} : heure attendue`)
  return { h: Number(m[1]), min: Number(m[2] ?? 0) }
}
export { brut as parametreBrut, groupe as groupeDuParametre }

// ── Litiges ─────────────────────────────────────────────────────────────────────────────────────────────────────
export interface ParametresLitigesDp35 {
  reponseH: number
  decisionH: number // après l'échéance de réponse
  recoursH: number // après la décision
  arrangementMin: number
  arrangementReponseJ: number
  conservationJours: number
  trajetRetour: number
}
export function lireLitigesDp35(r: Registre = REGISTRE): ParametresLitigesDp35 {
  return {
    reponseH: nombre(r, 'delai_reponse_litige', /^(\d+) h$/),
    decisionH: nombre(r, 'LIT-DECISION-H', /^(\d+) h après l'échéance/),
    recoursH: nombre(r, 'LIT-RECOURS-H', /sous (\d+) h/),
    arrangementMin: nombre(r, 'longueur_min_arrangement', /^(\d+) caractères$/),
    arrangementReponseJ: nombre(r, 'LIT-ARRANG-REPONSE-J', /^(\d+) jours/),
    conservationJours: entier(r, 'ENT-CONSERV-PREUVES', /^jours/),
    trajetRetour: nombre(r, 'RET-TRAJET', /^(\d+) F\b/),
  }
}

/** Retenue d'un litige perdu par le transporteur (ENT-RES-01, DED-10, A-06) : l'article est plafonné par le palier,
 *  jamais la livraison remboursée ni le trajet retour (BelivaY ne perd jamais les frais). */
export function retenueTransporteur(article: number, livraison: number, palier: PalierEntreprise, p = lireLitigesDp35()) {
  const plafond = PARAMETRES.paliers.plafonds[palier]
  return { article: plafond === null ? article : Math.min(article, plafond), livraison, trajet: p.trajetRetour }
}

// ── Versements ──────────────────────────────────────────────────────────────────────────────────────────────────
export interface ParametresVersements {
  jour: number // 5 : vendredi
  heureLimite: number // avant 12 h
  arrete: { jour: number; h: number; min: number } // jeudi 23 h 59
  essais: number
  intervalleH: number
  blocageMoyenJours: number
  reportVendredis: number
  minorationRetardPct: number
}
export function lireVersements(r: Registre = REGISTRE): ParametresVersements {
  return {
    jour: jourSemaine(r, 'ENT-VER-JOUR'),
    heureLimite: heureMinute(r, 'ENT-VER-JOUR').h,
    arrete: { jour: jourSemaine(r, 'ENT-VER-ARRETE'), ...heureMinute(r, 'ENT-VER-ARRETE') },
    essais: entier(r, 'ENT-VER-ESSAIS', /^tentatives/),
    intervalleH: groupe(r, 'ENT-VER-ESSAIS', /à (\d+) h/, 'unite'),
    blocageMoyenJours: entier(r, 'blocage_versements_changement_numero', /^jours/),
    reportVendredis: entier(r, 'ENT-REPORT-VENDREDIS', /^vendredis/),
    minorationRetardPct: nombre(r, 'ENT-MINORATION-RETARD', /^(\d+) % de moins\b/),
  }
}

// Heure de Yaoundé : UTC+1 toute l'année.
const local = (t: number) => new Date(t + HEURE)
const versUtc = (d: Date) => d.getTime() - HEURE

/** Prochain versement après `t` : arrêté (jeudi 23 h 59) et heure limite (vendredi 12 h), heure de Yaoundé. */
export function prochainVersement(t: number, p = lireVersements()): { arrete: number; limite: number } {
  const d = local(t)
  const jour0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  for (let i = 0; i < 8; i++) {
    const j = new Date(jour0 + i * JOUR)
    if (j.getUTCDay() !== p.jour) continue
    const limite = versUtc(new Date(j.getTime() + p.heureLimite * HEURE))
    if (limite <= t) continue
    const ecart = (p.jour - p.arrete.jour + 7) % 7 || 7
    const arrete = versUtc(new Date(j.getTime() - ecart * JOUR + p.arrete.h * HEURE + p.arrete.min * MINUTE))
    return { arrete, limite }
  }
  throw new ParametreIllisible('ENT-VER-JOUR : aucun jour de versement trouvé')
}

/** Prestation retardée au-delà de la promesse (ENT-REM-06) : payée avec la minoration, colis par colis. */
export const prixMinore = (prix: number, p = lireVersements()) => Math.round((prix * (100 - p.minorationRetardPct)) / 100)

/** Montant du vendredi : lignes validées moins retenues définitives ; un solde négatif ne se verse pas, il se
 *  reporte (ENT-REM-05). */
export function soldeDuVendredi(lignes: number[], retenues: number[]): { aVerser: number; report: number } {
  const s = lignes.reduce((a, b) => a + b, 0) - retenues.reduce((a, b) => a + b, 0)
  return { aVerser: Math.max(0, s), report: Math.max(0, -s) }
}

// ── Trust Score ─────────────────────────────────────────────────────────────────────────────────────────────────
export type Gravite = 'succes' | 'g1' | 'g2' | 'g3' | 'veto'
export const ECHECS: Record<Exclude<Gravite, 'succes' | 'veto'>, number> = { g1: 1, g2: 2, g3: 4 }

export interface ParametresTrust {
  mu: number
  k: number
  demiVieJours: number
  veto: number
  baisseMax: number
  seuils: { Confirme: number; Or: number }
  tenueJours: number
  ecartDescente: number
}
export function lireTrust(r: Registre = REGISTRE): ParametresTrust {
  const pal = PARAMETRES.paliers
  return {
    mu: groupe(r, 'ENT-TSC-PRIOR', /µ\s*=\s*(\d+)/),
    k: groupe(r, 'ENT-TSC-PRIOR', /k\s*=\s*(\d+)/),
    demiVieJours: entier(r, 'ENT-TSC-DEMI-VIE', /^jours/),
    veto: pal.veto,
    baisseMax: pal.baisseMax,
    seuils: pal.seuils,
    tenueJours: pal.tenueJours,
    ecartDescente: pal.ecartDescente,
  }
}

/** Score sur 100 (une décimale) d'une suite d'événements datés : lissage bayésien au neutre, poids qui décroît avec
 *  l'âge, veto qui plafonne. Aucun événement : le neutre (µ). */
export function scoreTrust(evenements: { le: number; gravite: Gravite }[], maintenant: number, p = lireTrust()): number {
  let succes = 0
  let echecs = 0
  let veto = false
  for (const e of evenements) {
    const w = 0.5 ** (Math.max(0, maintenant - e.le) / (p.demiVieJours * JOUR))
    if (e.gravite === 'succes') succes += w
    else if (e.gravite === 'veto') veto = true
    else echecs += w * ECHECS[e.gravite]
  }
  const s = (100 * ((p.k * p.mu) / 100 + succes)) / (p.k + succes + echecs)
  return Math.round(10 * (veto ? Math.min(s, p.veto) : s)) / 10
}

/** Baisse maximale par recalcul (ENT-TSC-04). */
export const borneBaisse = (precedent: number, calcule: number, p = lireTrust()) => Math.max(calcule, precedent - p.baisseMax)

/** Palier visé par le score (montée seulement après la tenue, descente seulement après validation humaine). */
export function palierVise(score: number, p = lireTrust()): PalierEntreprise {
  return score >= p.seuils.Or ? 'Or' : score >= p.seuils.Confirme ? 'Confirme' : 'Nouveau'
}
