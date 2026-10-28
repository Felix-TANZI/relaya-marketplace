// Outils de l'entreprise (ENT-08 : emballages, messages, notifications, paramètres, rapports, intégrations) :
// paramètres lus dans le registre et petits moteurs purs (stock attendu, réassort, écart, remplissage, masquage).
// Valeurs décidées par le porteur mais pas encore au registre de l'entreprise (lues si le registre les porte, sinon la
// décision s'applique ; INTEGRATION.md d'ENT-08) : délai du support DP-62/O-11 (DP-12 pour tous : 2 h, 7 h – 21 h),
// résumé quotidien CONF-ENT-RESUME (DP-61 : 19 h).
import { ParametreIllisible } from './erreurs'
import { PARAMETRES, REGISTRE, entier, nombre, type Registre } from './registre'
import { jourSemaine, parametreBrut } from './ent07'


export type FormatEmballage = 'S' | 'M' | 'L' | 'C1' | 'C2'
export const FORMATS: FormatEmballage[] = ['S', 'M', 'L', 'C1', 'C2']
export type TypeAlerte = 'paquet' | 'non_affecte' | 'depart' | 'incident' | 'litige' | 'versement_refuse' | 'vente_flash' | 'document'
export type Canal = 'portail' | 'push' | 'email' | 'sms'

export interface ParametresOutils {
  reassortPct: number
  ecartPct: number
  kit: { format: FormatEmballage; n: number; auStockage: boolean }[]
  jourInventaire: number
  rapportMin: number
  objectifTournee: number
  alerteRemplissage: { sous: number; jours: number }
  webhookH: number
  debitParMinute: number
  integrationsActives: boolean
  pieceMo: number
  accesMax: number
  preavisJours: number
  piloteJours: number
  sessionH: number
  alertesVerrouillees: TypeAlerte[]
  typesSms: TypeAlerte[]
  canauxParDefaut: Canal[]
  support: { h: number; ouverture: number; fermeture: number }
  resumeH: number
}

function liste<T extends string>(r: Registre, code: string, table: [RegExp, T][]): T[] {
  const v = parametreBrut(r, code).valeur.toLowerCase()
  const t = table.filter(([re]) => re.test(v)).map(([, x]) => x)
  if (!t.length) throw new ParametreIllisible(`${code} : liste inattendue`)
  return t
}
const ALERTES: [RegExp, TypeAlerte][] = [
  [/litige/, 'litige'],
  [/versement refus/, 'versement_refuse'],
]

export function lireOutils(r: Registre = REGISTRE): ParametresOutils {
  const kitTexte = parametreBrut(r, 'ENT-EMB-KIT-MOTO').valeur
  const kit = [...kitTexte.matchAll(/(\d+)\s+(C1|C2|S|M|L)\b/g)].map((m) => ({ format: m[2] as FormatEmballage, n: Number(m[1]), auStockage: /\(\s*\+\s*$/.test(kitTexte.slice(0, m.index)) }))
  if (kit.length < 3) throw new ParametreIllisible('ENT-EMB-KIT-MOTO : kit illisible')
  const remp = parametreBrut(r, 'ZONE-REMPLISSAGE').valeur
  const sous = /sous (\d+) colis/.exec(remp)
  const jours = /sur (\d+) jours/.exec(remp)
  if (!sous || !jours) throw new ParametreIllisible(`ZONE-REMPLISSAGE : alerte illisible`)
  return {
    reassortPct: entier(r, 'ENT-EMB-REAPPRO', /^%/),
    ecartPct: entier(r, 'ENT-EMB-ECART', /^%/),
    kit,
    jourInventaire: jourSemaine(r, 'jour_inventaire'),
    rapportMin: entier(r, 'ENT-RAPPORT-MIN-MISSIONS', /^missions/),
    objectifTournee: PARAMETRES.pilote.objectifTournee,
    alerteRemplissage: { sous: Number(sous[1]), jours: Number(jours[1]) },
    webhookH: entier(r, 'ENT-WEBHOOK-REESSAIS', /^heures/),
    debitParMinute: nombre(r, 'debit_par_cle', /^(\d+) appels par minute$/),
    integrationsActives: !/^non\b/i.test(parametreBrut(r, 'integrations_actives').valeur),
    pieceMo: PARAMETRES.acces.tailleMaxPieceMo,
    accesMax: PARAMETRES.acces.accesInternesMax,
    preavisJours: entier(r, 'preavis_resiliation', /^jours/),
    piloteJours: PARAMETRES.pilote.dureeJours,
    sessionH: PARAMETRES.acces.sessionHeures,
    alertesVerrouillees: liste(r, 'alertes_verrouillees', ALERTES),
    typesSms: liste(r, 'types_sms', ALERTES),
    canauxParDefaut: liste(r, 'canaux_par_defaut', [
      [/portail/, 'portail'],
      [/push/, 'push'],
      [/e-?mail/, 'email'],
    ]),
    support: {
      h: nombre(r, 'ENT-SUPPORT-DP12', /^première réponse sous (\d+) h/),
      ouverture: nombre(r, 'ENT-SUPPORT-DP12', /, de (\d+) h à \d+ h/),
      fermeture: nombre(r, 'ENT-SUPPORT-DP12', /, de \d+ h à (\d+) h/),
    },
    resumeH: nombre(r, 'CONF-ENT-RESUME', /^(\d+) h$/),
  }
}
export const OUTILS = lireOutils()

// ── Emballages (ENT-EMB-02, -03, -04, ENT-P21R-*) ─────────────────────────────────────────────────────────────────
/** Ce qui doit rester : remis − étiquettes consommées − abîmés déclarés. */
export const resteAttendu = (s: { remis: number; consommes: number; declaresAbimes: number }) => Math.max(0, s.remis - s.consommes - s.declaresAbimes)
/** Réassort : le reste attendu est au seuil (≤ x % du stock avancé). */
export const auSeuil = (s: { remis: number; consommes: number; declaresAbimes: number }, p = OUTILS) => s.remis > 0 && resteAttendu(s) * 100 <= s.remis * p.reassortPct
/** Écart d'inventaire non justifié (en % du stock avancé) : facturé au coût d'achat au-delà du seuil sur un mois. */
export const ecartPct = (attendu: number, compte: number, remis: number) => (remis > 0 ? Math.round((1000 * Math.max(0, attendu - compte)) / remis) / 10 : 0)
/** Deux plages d'étiquettes se chevauchent-elles ? (409 sinon) */
export const chevauche = (a: { du: number; au: number }, b: { du: number; au: number }) => a.du <= b.au && b.du <= a.au

// ── Messages (ENT-P22R-02, ENT-ANO-01) ───────────────────────────────────────────────────────────────────────────
/** Masque numéros de téléphone, e-mails et identifiants sociaux (le serveur fait de même, masked: true). */
export function masquer(texte: string): { texte: string; masque: boolean } {
  const m = texte
    .replace(/(\+?\d[\d\s.-]{7,}\d)/g, '[numéro masqué]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[adresse masquée]')
    .replace(/(^|\s)@[\w.]{3,}/g, '$1[identifiant masqué]')
  return { texte: m, masque: m !== texte }
}

// ── Rapports (ENT-P25R-02) ───────────────────────────────────────────────────────────────────────────────────────
/** Remplissage moyen des tournées relais (colis par tournée), même définition que la console. */
export const remplissage = (tournees: number[]) => (tournees.length ? Math.round((10 * tournees.reduce((a, b) => a + b, 0)) / tournees.length) / 10 : null)

// ── Sécurité (ENT-P24) ─────────────────────────────────────────────────────────────────────────────────────────────
/** Mot de passe acceptable (DP-04, même règle que le client) : 8 caractères au moins, dont un chiffre. */
export const motDePasseValide = (m: string) => m.length >= 8 && /\d/.test(m)
