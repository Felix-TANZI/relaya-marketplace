// Les cinq états de l'argent du vendeur et la page Argent : portage fidèle de moteurs/belivay_moteurs/argent_vendeur.py
// (ARG-01, VD09-R04, LIB-01, LIB-02, GEL-01, GEL-02 ; DP-22, DP-55 ; Q-64).
//
//     En cours   = payée, pas encore retirée par le client                    (ambre)
//     Se libère  = retirée, date de libération à venir                        (orange)
//     Gelé       = litige, retour, recours ou vérification anti-fraude        (rouge), jamais de date de versement
//     À verser   = libérée, part le vendredi                                  (vert)
//     Versé      = crédité, avec sa référence BLV-VS-nnnn                     (sans couleur, dans Versements)
//     En circulation = À verser + Se libère + En cours + Gelé                  (ARG-01 : la somme est toujours juste)
//
// - Le gel prime sur tout compte à rebours (LIB-02) ; sa date de libération est recalculée à la fin du gel
//   (versements.liberationApresLitige, litiges.finDuGel).
// - Vérification anti-fraude (GEL-02, Q-64) : frozen.checks{amount, count}, libellé « Vérification en cours », motif
//   écrit sous 48 h (versements.echeanceMotifAntifraude), sans échéance.
// - Une seule source (GET /money/summary) : ces états se calculent à partir des gains figés au paiement.
import type { ParametresVersements } from './registre'
import type { Jour } from './temps'
import { vendrediDeVersement, type Gain } from './versements'

export type EtatArgent = 'En cours' | 'Se libère' | 'Gelé' | 'À verser' | 'Versé'
export const ETATS_ARGENT: EtatArgent[] = ['En cours', 'Se libère', 'Gelé', 'À verser', 'Versé']

/** VD09-R04. Ordre : versé, puis gelé (le gel prime, LIB-02), puis en cours, se libère, à verser. */
export function etatDeLArgent(g: Gain, maintenant: number): EtatArgent {
  if (g.verse) return 'Versé'
  if (g.gel) return 'Gelé'
  if (g.liberation === null) return 'En cours'
  return g.liberation > maintenant ? 'Se libère' : 'À verser'
}

/** Vendredi annoncé sur la carte ; jamais pour une somme gelée (GEL-01, « Sans date de versement ») ni en cours (date de
 * libération inconnue) ; la date du versement passé pour une somme versée n'est pas recalculée ici. */
export function dateDeVersement(g: Gain, maintenant: number, p: ParametresVersements): Jour | null {
  const etat = etatDeLArgent(g, maintenant)
  return etat === 'Se libère' || etat === 'À verser' ? vendrediDeVersement(g.liberation!, p) : null
}

/** frozen.checks (Q-64) : sommes gelées pour vérification anti-fraude. */
export interface Verifications {
  amount: number
  count: number
}

/** GET /money/summary (ARG-01) : un total par état, et « En circulation ». */
export interface ResumeArgent {
  enCours: number
  seLibere: number
  gele: number
  aVerser: number
  verse: number
  verifications: Verifications
  enCirculation: number // À verser + Se libère + En cours + Gelé (ARG-01) ; le versé n'y est plus
}

/** Jeu d'essai VD09-R04 : En cours 17 840 F · Se libère 17 840 F · Gelé 688 488 F · À verser 17 840 F · Versé 35 680 F ⇒
 * En circulation 742 008 F. */
export function resume(gains: Gain[], maintenant: number): ResumeArgent {
  const totaux: Record<EtatArgent, number> = { 'En cours': 0, 'Se libère': 0, Gelé: 0, 'À verser': 0, Versé: 0 }
  const checks: Verifications = { amount: 0, count: 0 }
  for (const g of gains) {
    const etat = etatDeLArgent(g, maintenant)
    totaux[etat] += g.garde
    if (etat === 'Gelé' && g.gel === 'vérification anti-fraude') {
      checks.amount += g.garde
      checks.count += 1
    }
  }
  const r = { enCours: totaux['En cours'], seLibere: totaux['Se libère'], gele: totaux.Gelé, aVerser: totaux['À verser'], verse: totaux.Versé, verifications: checks }
  return { ...r, enCirculation: r.aVerser + r.seLibere + r.enCours + r.gele }
}
