// Lecture des paramètres de la console (CCH-15 : aucune valeur dans le code) : SEUL lecteur du registre. Source : le
// registre officiel (logique-metier/parametres-en-vigueur.json, généré par logique-metier/outils/revue.py ; les codes
// proposés pour la console y entrent par logique-metier/parametres.json, A-VALIDER § 4), complété seulement par ce qui
// ne peut pas y aller (src/config/parametres-proposes.ts, vide aujourd'hui) ; l'officiel l'emporte. Chaque valeur est
// lue avec une forme et une unité attendues : si l'une change, la lecture s'arrête (ParametreIllisible) au lieu de
// deviner. Un écran ou un groupe lit par ce fichier (REGISTRE et ses fonctions), jamais un JSON de paramètres.
import donnees from '../../../logique-metier/parametres-en-vigueur.json' with { type: 'json' }
import { PARAMETRES_PROPOSES } from '../config/parametres-proposes'
import { ParametreAbsent, ParametreIllisible } from './erreurs'

export interface Parametre {
  code: string
  valeur: string
  unite: string | null
}
export type Registre = Record<string, Parametre>

/** Code → paramètre (code, valeur, unité) : registre officiel, puis les propositions absentes de l'officiel. */
export function chargerRegistre(d: { parametres: { code: string; valeur: string; unite?: string | null }[] } = donnees): Registre {
  const r: Registre = Object.fromEntries(PARAMETRES_PROPOSES.map((p) => [p.code, { code: p.code, valeur: p.valeur, unite: p.unite }]))
  for (const p of d.parametres) r[p.code] = { code: p.code, valeur: p.valeur, unite: p.unite ?? null }
  return r
}
export const REGISTRE: Registre = chargerRegistre()

function parametre(r: Registre, code: string): Parametre {
  const p = r[code]
  if (!p) throw new ParametreAbsent(code)
  return p
}

/** Valeur écrite d'un code, telle quelle (« 7 jours sur 30 », « S = 1, M = 2, L = 5 … »). */
export const valeur = (r: Registre, code: string): string => parametre(r, code).valeur
/** Valeur suivie de son unité, pour l'afficher ou la lire avec son unité (« 48 heures », « 500 F »). */
export function texte(r: Registre, code: string): string {
  const p = parametre(r, code)
  return p.unite ? `${p.valeur} ${p.unite}` : p.valeur
}

/** Créneaux interdits aux maintenances (maintenance_creneaux_interdits : « jeudi 18 h – 24 h, vendredi 0 h – 12 h »),
 * heures de Yaoundé ; jour : 0 dimanche … 6 samedi. */
export function lireCreneauxInterdits(r: Registre): { jour: number; de: number; a: number; libelle: string }[] {
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const v = valeur(r, 'maintenance_creneaux_interdits')
  return v.split(',').map((x) => {
    const m = /^\s*(\p{L}+)\s+(\d+)\s*h\s*[–-]\s*(\d+)\s*h\s*$/u.exec(x)
    const jour = m ? JOURS.indexOf(m[1].toLowerCase()) : -1
    if (!m || jour < 0 || Number(m[2]) >= Number(m[3]) || Number(m[3]) > 24) throw new ParametreIllisible(`maintenance_creneaux_interdits : « ${v} » ne suit pas la forme « jeudi 18 h – 24 h, … »`)
    return { jour, de: Number(m[2]), a: Number(m[3]), libelle: x.trim() }
  })
}

/** Entier positif écrit seul (« 15 », « 100 000 »), dans l'unité attendue (début du libellé d'unité). */
export function entier(r: Registre, code: string, unite: RegExp): number {
  const p = parametre(r, code)
  const v = p.valeur.replace(/[\s  ]/g, '')
  if (!/^\d+$/.test(v)) throw new ParametreIllisible(`${code} : « ${p.valeur} » n'est pas un nombre entier`)
  if (!unite.test(p.unite ?? '')) throw new ParametreIllisible(`${code} : unité « ${p.unite} » inattendue`)
  return Number(v)
}

/** Montant en francs CFA : « 100 000 F » (unité dans la valeur) ou « 100 000 » avec l'unité « F » / « F CFA ». */
export function montant(r: Registre, code: string): number {
  const p = parametre(r, code)
  const m = /^([\d\s  ]+?)\s*(F(?: CFA)?)?$/.exec(p.valeur.trim())
  const unite = m?.[2] ?? p.unite ?? ''
  if (!m || !/^F( CFA)?$/.test(unite)) throw new ParametreIllisible(`${code} : « ${p.valeur} » n'est pas un montant en F`)
  return Number(m[1].replace(/[\s  ]/g, ''))
}

// ── Accès et décisions de la console (ADM-03, ADM-01 § 12, ADM-PRI-03) ─────────────────────────────────────────────
export interface ParametresConsole {
  sessionHeures: number
  echecsAvantBlocage: number
  blocageMinutes: number
  motifMin: number // caractères d'un motif de décision défavorable (motif_min_caracteres, ADM-PRI-03)
  seuilRemboursementQuatreYeux: number // F CFA
  quatreYeuxExpireH: number
  lienPieceMin: number
  demasqueMin: number
  invitationH: number // validité du lien d'activation d'un employé invité (ADM-INVITATION-H, Proposé)
  motDePasseMin: number // MDP-LONG : « 8 caractères au moins, dont un chiffre »
}
/** MDP-LONG : « 8 caractères au moins, dont un chiffre » → 8. */
function longueurMotDePasse(r: Registre): number {
  const v = parametre(r, 'MDP-LONG').valeur
  const m = /^(\d+) caractères au moins/.exec(v)
  if (!m) throw new ParametreIllisible(`MDP-LONG : « ${v} » ne suit pas la forme « 8 caractères au moins… »`)
  return Number(m[1])
}
export function lireConsole(r: Registre): ParametresConsole {
  return {
    sessionHeures: entier(r, 'duree_session', /^heures?/),
    echecsAvantBlocage: entier(r, 'echecs_avant_blocage', /^échecs/),
    blocageMinutes: entier(r, 'duree_blocage', /^minutes/),
    motifMin: entier(r, 'motif_min_caracteres', /^caractères/),
    seuilRemboursementQuatreYeux: montant(r, 'REMB-CONTROLE-SEUIL'),
    quatreYeuxExpireH: entier(r, 'CONSOLE-CONTRESEING-H', /^heures/),
    lienPieceMin: entier(r, 'PIECE-LIEN-MIN', /^minutes/),
    demasqueMin: entier(r, 'ADM-DEMASQUE-MIN', /^minutes/),
    invitationH: entier(r, 'ADM-INVITATION-H', /^heures/),
    motDePasseMin: longueurMotDePasse(r),
  }
}

// ── Équipe et accès de la console (logique-metier/ACCES-CONSOLE.md, codes « Proposé ») ───────────────────────────────
export interface ParametresAcces {
  tempQuatreYeuxJ: number // accès temporaire plus long : validé par la Direction (ADM-ACCES-TEMP-QY-J)
  tempMaxJ: number // durée maximale d'un accès temporaire (ADM-ACCES-TEMP-MAX-J, à trancher)
  alerteInactifJ: number // compte sans connexion signalé (ADM-ALERTE-INACTIF-J)
  alerteExpireH: number // accès temporaire signalé avant sa fin (ADM-ALERTE-EXPIRE-H)
  revueMois: number // fréquence de la revue des accès (ADM-REVUE-MOIS)
  plafond: { agent: number; senior: number; responsable: number } // ADM-PLAFOND-* (F)
  urgenceH: number // accès d'urgence de la Direction (ADM-BRIS-GLACE-H)
  directionMin: number // comptes Direction actifs exigés (ADM-DIRECTION-MIN)
}
export function lireAcces(r: Registre): ParametresAcces {
  return {
    tempQuatreYeuxJ: entier(r, 'ADM-ACCES-TEMP-QY-J', /^jours/),
    tempMaxJ: entier(r, 'ADM-ACCES-TEMP-MAX-J', /^jours/),
    alerteInactifJ: entier(r, 'ADM-ALERTE-INACTIF-J', /^jours/),
    alerteExpireH: entier(r, 'ADM-ALERTE-EXPIRE-H', /^heures/),
    revueMois: entier(r, 'ADM-REVUE-MOIS', /^mois/),
    plafond: { agent: montant(r, 'ADM-PLAFOND-AGENT'), senior: montant(r, 'ADM-PLAFOND-SENIOR'), responsable: montant(r, 'ADM-PLAFOND-RESPONSABLE') },
    urgenceH: entier(r, 'ADM-BRIS-GLACE-H', /^heures/),
    directionMin: entier(r, 'ADM-DIRECTION-MIN', /^comptes/),
  }
}

// ── Décisions encadrées (logique-metier/DECISIONS-ENCADREES.md) : champ de manœuvre et plafonds ─────────────────────
export interface ParametresDecisions {
  geste: { agent: number; senior: number; responsable: number } // SUP-GESTE (Agent), ADM-GESTE-SENIOR, ADM-GESTE-RESPONSABLE (F)
  partielMinPct: number // LIT-PARTIEL-MIN : bas de la fourchette d'un remboursement partiel (% du prix des articles)
  partielMaxPct: number // LIT-PARTIEL-MAX
  prolongationH: number // LIT-PROLONGATION-H : une seule prolongation d'échéance par dossier
  lotMax: number // ADM-LOT-MAX : dossiers identiques décidés en une fois
  rayonRemiseM: number // ADM-REMISE-RAYON-M : position de remise « proche de l'adresse »
  echantillon: number // ADM-ECART-ECHANTILLON : décisions tirées pour l'Audit
  appels: number // ABSENT-APPELS (R51) : appels du livreur avant de partir au relais
  attenteMin: number // ABSENT-ATTENTE-MIN (R51)
  constatH: number // LIT-CONSTAT-H : réponse de BelivaY à un constat du relais (heures ouvrées)
}
export function lireDecisions(r: Registre): ParametresDecisions {
  return {
    geste: { agent: montant(r, 'SUP-GESTE'), senior: montant(r, 'ADM-GESTE-SENIOR'), responsable: montant(r, 'ADM-GESTE-RESPONSABLE') },
    partielMinPct: entier(r, 'LIT-PARTIEL-MIN', /^%/),
    partielMaxPct: entier(r, 'LIT-PARTIEL-MAX', /^%/),
    prolongationH: entier(r, 'LIT-PROLONGATION-H', /^heures/),
    lotMax: entier(r, 'ADM-LOT-MAX', /^dossiers/),
    rayonRemiseM: entier(r, 'ADM-REMISE-RAYON-M', /^mètres/),
    echantillon: entier(r, 'ADM-ECART-ECHANTILLON', /^décisions/),
    appels: entier(r, 'ABSENT-APPELS', /^appels/),
    attenteMin: entier(r, 'ABSENT-ATTENTE-MIN', /^minutes/),
    constatH: Number(/^(\d+)\s*h/.exec(valeur(r, 'LIT-CONSTAT-H'))?.[1] ?? NaN),
  }
}

// ── Espace pays : zones exploitées (ZONES-EXPLOITEES : « Z1 Centre-ville, Z3 Mokolo, … ») ─────────────────────────────────
export function lireZonesExploitees(r: Registre): { code: string; nom: string }[] {
  const v = parametre(r, 'ZONES-EXPLOITEES').valeur
  const zones = v.split(',').map((x) => /^\s*(Z\d+)\s+(.+?)\s*$/.exec(x))
  if (!zones.length || zones.some((z) => !z)) throw new ParametreIllisible(`ZONES-EXPLOITEES : « ${v} » ne suit pas la forme « Z1 Centre-ville, … »`)
  return zones.map((z) => ({ code: z![1], nom: z![2] }))
}

// ── Mentions légales (BLV-MENTIONS-LEGALES) : pied de la barre latérale ───────────────────────────────────────────────
export interface MentionsLegales {
  denomination: string
  rccm: string
}
export function lireMentions(r: Registre): MentionsLegales {
  const v = parametre(r, 'BLV-MENTIONS-LEGALES').valeur.split(' · ').map((x) => x.trim())
  const rccm = /^RCCM (\S+)$/.exec(v[4] ?? '')
  if (v.length !== 6 || !rccm) throw new ParametreIllisible('BLV-MENTIONS-LEGALES : forme inattendue')
  return { denomination: v[0], rccm: rccm[1] }
}

/** Paramètres en vigueur, lus une fois. */
export const PARAMETRES = {
  console: lireConsole(REGISTRE),
  acces: lireAcces(REGISTRE),
  decisions: lireDecisions(REGISTRE),
  zonesExploitees: lireZonesExploitees(REGISTRE),
  mentions: lireMentions(REGISTRE),
}
