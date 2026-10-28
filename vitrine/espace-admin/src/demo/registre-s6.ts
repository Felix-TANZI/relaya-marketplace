// DONNÉES DE DÉMONSTRATION — paramètres lus par le « serveur » des écrans S6 (gouvernance et système), au registre
// officiel seulement (src/calculs/registre.ts) : les codes proposés par S6 y sont entrés (A-VALIDER § 4).
import { REGISTRE, entier, lireCreneauxInterdits, montant, texte as texteDe, type Registre } from '../calculs/registre'
import { ParametreAbsent, ParametreIllisible } from '../calculs/erreurs'

/** Registre lu par S6 : le registre officiel (nom gardé pour les écrans). */
export const REGISTRE_S6: Registre = REGISTRE

/** Valeur écrite d'un code (texte du registre), pour l'afficher telle quelle (« 500 F », « l’agrégateur / secours »). */
/** Aucun nom de prestataire à l'écran (comme demo/pilotage.ts « neutre ») : le registre nomme les agrégateurs, la
 * console dit leur rôle. */
const ROLES_PRESTATAIRES: [RegExp, string][] = [
  [/CamPay\s*\/\s*Fapshi/g, 'Agrégateur principal / agrégateur de secours'],
  [/CinetPay \(principal\), Flutterwave \(secours\)/g, 'Prestataire carte principal, prestataire carte de secours'],
  [/\b(CamPay|CinetPay)\b/g, 'agrégateur principal'],
  [/\b(Fapshi|Flutterwave)\b/g, 'agrégateur de secours'],
]
export const texte = (code: string): string => ROLES_PRESTATAIRES.reduce((x, [re, r]) => x.replace(re, r), texteDe(REGISTRE, code))
const n = (code: string, unite: RegExp) => entier(REGISTRE, code, unite)

/** Créneaux interdits aux maintenances (maintenance_creneaux_interdits) : jeudi soir et vendredi matin, cycle des
 * versements. Jours : 0 dimanche … 4 jeudi, 5 vendredi ; heures de Yaoundé. */
export const CRENEAUX_INTERDITS = lireCreneauxInterdits(REGISTRE)

export const P6 = {
  fraude: {
    fenetreJ: n('FRAUDE-FENETRE-J', /^jours/),
    anneauComptes: n('FRAUDE-ANNEAU-COMPTES', /^comptes/),
    rembAuto: n('FRAUDE-REMB-AUTO-N', /^remboursements/),
    refusComptoir: n('PAY-CPT-REFUS', /^$/),
    avisNote: n('FRAUDE-AVIS-NOTE', /^étoiles/),
    retraitsN: n('FRAUDE-RETRAITS-N', /^retraits/),
    retraitsF: montant(REGISTRE, 'FRAUDE-RETRAITS-F'),
    gelRevueJ: n('ADM-GEL-FRAUDE-J', /^jours/),
  },
  maintenancePreavisH: n('ADM-MAINTENANCE-PREAVIS-H', /^heures/),
  preavisJ: n('ADM-PREAVIS-J', /^jours/),
  accesDonneesJ: n('ADM-ACCES-DONNEES-J', /^jours/),
  compteInactifJ: n('ADM-COMPTE-INACTIF-J', /^jours/),
  directionMin: n('ADM-DIRECTION-MIN', /^comptes/),
  brisGlaceH: n('ADM-BRIS-GLACE-H', /^heures/),
  sessionInactifMin: n('ADM-SESSION-INACTIF-MIN', /^minutes/),
  echantillonMin: n('RAPPORT-ECHANTILLON-MIN', /^commandes/),
}

/** Durée d'un code de conservation, en jours (« 12 mois » → 360, « 10 ans » → 3 650) ; minutes → null (moins d'un jour). */
export function joursDe(code: string): number | null {
  if (!REGISTRE[code]) throw new ParametreAbsent(code)
  const v = texteDe(REGISTRE, code)
  const m = /(\d[\d\s]*)\s*(jours?|mois|ans?|minutes?|min)\b/.exec(v)
  if (!m) throw new ParametreIllisible(`${code} : « ${v} » n'est pas une durée`)
  const k = Number(m[1].replace(/\s/g, ''))
  return /^min/.test(m[2]) ? null : /^mois/.test(m[2]) ? k * 30 : /^an/.test(m[2]) ? k * 365 : k
}
