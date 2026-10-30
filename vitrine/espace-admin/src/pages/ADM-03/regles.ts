// Délais et seuils du groupe S1 (connexion, File d'action, litiges, commandes, vue d'ensemble), LUS au registre
// officiel par src/calculs/registre.ts (les codes proposés par S1 y sont entrés : A-VALIDER § 4). Aucune valeur n'est
// écrite ici : si un code manque ou change de forme, la lecture s'arrête (ParametreAbsent, ParametreIllisible).
// Les valeurs officielles sont parfois rédigées (« 48 h », « jusqu’à 3 000 F », « moins de 5 h ») : on lit le premier
// nombre et l'on vérifie l'unité écrite dans la valeur ou dans la colonne unité.
import { REGISTRE, texte, valeur } from '../../calculs/registre'
import { ParametreIllisible } from '../../calculs/erreurs'

/** Premier nombre entier de la valeur (officielle d'abord), dont le texte « valeur + unité » suit `unite`. */
export function nombre(code: string, unite: RegExp): number {
  const v = valeur(REGISTRE, code)
  const t = texte(REGISTRE, code)
  const m = /(\d[\d\s  ]*)/.exec(v)
  if (!m) throw new ParametreIllisible(`${code} : « ${v} » ne contient aucun nombre`)
  if (!unite.test(t)) throw new ParametreIllisible(`${code} : unité inattendue dans « ${t.trim()} »`)
  return Number(m[1].replace(/[\s  ]/g, ''))
}

const H = /\bh\b|heure/
const J = /jour|\bj\b/
const MIN = /min/
const F = /\bF\b|F CFA/

/** Règles de S1, lues une fois. */
export const REGLES_S1 = {
  // Connexion (ADM-P01)
  inactifMin: nombre('ADM-SESSION-INACTIF-MIN', MIN),
  brisDeGlaceH: nombre('ADM-BRIS-GLACE-H', H),
  // File d'action (ADM-P02)
  verrouMin: nombre('ADM-VERROU-MIN', MIN),
  surchargeDirection: nombre('QUEUE-SURCHARGE-DIRECTION', /carte/),
  supportH: nombre('SUP-DELAI', H),
  kycHumainH: nombre('ADM-KYC-HUMAIN-H', H),
  departPreavisJ: nombre('DEPART-PREAVIS-J', J),
  kitConstatH: nombre('DEPART-KIT-CONSTAT-H', H),
  kitValeur: nombre('KIT-VALEUR-F', F),
  // Litiges (ADM-P03)
  vendeurH: nombre('LIT-VENDEUR-H', H),
  decisionH: nombre('LIT-DECISION-H', H),
  recoursH: nombre('LIT-RECOURS-H', H),
  mediateurJ: nombre('LIT-MEDIATEUR-J', J),
  clientSilenceJ: nombre('LIT-CLIENT-SILENCE-J', J),
  inspectionH: nombre('RET-INSPECT-H', H),
  retourTrajet: nombre('RET-TRAJET', F),
  seuilQuatreYeux: nombre('REMB-CONTROLE-SEUIL', F),
  // Vue d'ensemble (page ajoutée « direct »)
  livraisonH: nombre('SLA-ZONE-H', H),
  relaisAlertePct: nombre('RELAIS-CAPACITE-ALERTE', /%/),
}
/** ADM-P01R-03 : codes faux d'affilée ⇒ retour à l'étape 1 (ADM-2FA-CODES-FAUX). */
export const CODES_FAUX_MAX = nombre('ADM-2FA-CODES-FAUX', /code/)
