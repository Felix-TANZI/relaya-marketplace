// Paramètres de l'argent et de la performance du relais (PR-09 : versements, numéro, Trust Score, paliers, avis), lus
// au registre par calculs/registre.ts (PARAMETRES.argent) et calculs/parametres-moteurs.ts (PARAMETRES_MOTEURS : poids,
// baisse de nuit, gel, tenue, marge, contestation, retenue fiscale) ; jamais de repli local. Lus par les écrans de
// PR-09 (pages/PR-09/parametres.ts) et par la démonstration du serveur (demo/argent, demo/qualite).
import type { IdCritere } from '../donnees/domaines/qualite'
import { PARAMETRES_MOTEURS, type NomCritere } from './parametres-moteurs'
import { PARAMETRES, type ParametresArgent } from './registre'

export const IDS: Record<NomCritere, IdCritere> = { Ponctualité: 'ponctualite', 'Sécurité du stockage': 'stockage', Satisfaction: 'satisfaction', Litiges: 'litiges', Ancienneté: 'anciennete' }

export interface ParametresPR09 {
  /** PR-TRUST-POIDS (TRU-01) : poids des cinq critères, en %, dans l'ordre du registre (PARAMETRES_MOTEURS). */
  poids: { id: IdCritere; poids: number }[]
  /** PR-TS-VARIATION-NUIT : baisse maximale d'un recalcul de nuit (TRU-02). */
  variationNuit: number
  /** PR-TS-GEL-J : score gelé après ces jours sans activité. */
  gelJours: number
  /** PR-SAN-GEL-SEUIL : suspension, score gelé sous ce seuil (TRU-06). */
  gelSous: number
  /** PR-CONTESTATION-H : réponse motivée sous ces heures ouvrées, une contestation par décision (TRU-07). */
  contestationH: number
  /** PR-PAL-TENUE-J : un seuil se tient ces jours pour changer de palier (PAL-01, PAL-02). */
  tenueJours: number
  /** PR-PAL-MARGE : un palier se perd après PR-PAL-TENUE-J jours à ces points sous le seuil (PAL-02). */
  margePoints: number
  /** PR-PAL-CAPACITE-PCT : hausse de capacité du palier Confirmé (PAL-04). */
  capacitePct: number
  /** PR-ACCOMPAGNEMENT-J : accompagnement renforcé du support, palier Starter (PAL-03). */
  accompagnementJours: number
  /** PR-RETENUE-FISCALE-PCT (ARL-34) : retenue à la source, 0 % tant que le taux n'est pas confirmé. */
  retenueFiscalePct: number
  /** PR-DETTE-DELAI-H (ARL-05) : délai pour reverser les espèces dues. */
  detteDelaiH: number
  /** PR-NUM-VERIF-J (VER-03, MOM-03) : vérification d'un nouveau numéro par une personne, versements suspendus. */
  numeroVerifJours: number
  /** PR-NUM-CODE (MOM-02) : nombre de codes SMS, chiffres, validité en minutes. */
  numeroCodes: { nombre: number; chiffres: number; minutes: number }
  /** PR-VER-ESSAIS (VER-08) : nouveaux essais après un refus de l'opérateur. */
  versementEssais: number
  /** PR-VER-RECLAM (VER-05) : un versement non reçu et signalé reçoit une réponse avant ce jour, à midi. */
  reclamation: { jourSemaine: number; heure: number }
  /** CARTE-PREFIXES (MOM-05) : préfixes Mobile Money au Cameroun, tels qu'écrits au registre. */
  prefixes: { MTN: string[]; Orange: string[] }
}

export function lirePR09(a: ParametresArgent = PARAMETRES.argent): ParametresPR09 {
  const pt = PARAMETRES_MOTEURS.trust
  return {
    poids: (Object.keys(pt.poids) as NomCritere[]).map((c) => ({ id: IDS[c], poids: pt.poids[c] })),
    variationNuit: pt.baisseMax,
    gelJours: pt.gelJours,
    gelSous: a.gelSous,
    contestationH: pt.contestationHeures,
    tenueJours: pt.tenueJours,
    margePoints: pt.hysteresisPoints,
    capacitePct: a.capacitePct,
    accompagnementJours: a.accompagnementJours,
    retenueFiscalePct: PARAMETRES_MOTEURS.retenueFiscalePourCent,
    detteDelaiH: PARAMETRES_MOTEURS.detteDelaiHeures,
    numeroVerifJours: a.numeroVerifJours,
    numeroCodes: a.numeroCodes,
    versementEssais: a.versementEssais,
    reclamation: a.reclamation,
    prefixes: a.prefixes,
  }
}

export const P09 = lirePR09()
export const PR = PARAMETRES.relais

/** Opérateur d'un numéro camerounais (9 chiffres) selon CARTE-PREFIXES (« 67 », « 650 à 654 »…) ; null : inconnu. */
export function operateurDe(numero: string, p: Pick<ParametresPR09, 'prefixes'> = P09): 'MTN' | 'Orange' | null {
  if (!/^6\d{8}$/.test(numero)) return null
  const correspond = (liste: string[]) =>
    liste.some((x) => {
      const m = /^(\d+) à (\d+)$/.exec(x)
      if (!m) return numero.startsWith(x)
      const debut = Number(numero.slice(0, m[1].length))
      return debut >= Number(m[1]) && debut <= Number(m[2])
    })
  return correspond(p.prefixes.MTN) ? 'MTN' : correspond(p.prefixes.Orange) ? 'Orange' : null
}

/** Préfixes écrits pour l'écran : « 67X, 68X, 650 à 654 » (un préfixe à deux chiffres couvre la dizaine). */
export const prefixesEcrits = (liste: string[]) => liste.map((x) => (/^\d{2}$/.test(x) ? x + 'X' : x)).join(', ')

/** Segments du délai de retrait sur la grille de garde (RAP-04, v6) : le 1er jour (offert), les jours suivants au
 * premier tarif (« 100 F par jour »), puis les derniers jours jusqu'au 7e ; rangs [début, fin) comptés depuis 0. */
export function segmentsDelai(grille: readonly number[] = PR.garde.grille): [number, number][] {
  let k = 2
  while (k < grille.length && grille[k] === grille[1]) k++
  return [
    [0, 1],
    [1, k],
    [k, grille.length],
  ]
}
