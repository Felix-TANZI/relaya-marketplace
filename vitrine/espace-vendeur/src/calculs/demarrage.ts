// Plafond de démarrage d'un nouveau vendeur : portage fidèle de moteurs/belivay_moteurs/demarrage.py (KYC-09, PRX-09,
// VD-02 p10 ; DP-55 : Q-14, Q-63 ; DP-57 : A-7).
//
// - Jusqu'à 10 commandes livrées sans incident, une sous-commande attribuée à ce vendeur ne dépasse pas 500 000 F
//   (prix × quantité, tous ses articles de la commande) ; la quantité en trop va à un autre vendeur.
// - Incident = litige perdu, rupture, non-préparation, retour validé pour défaut.
// - Compteur (A-7) : les commandes livrées sans incident, au total ; un incident ne remet pas le compteur à zéro.
// - À la publication (PRX-09) : un prix unitaire au-dessus du plafond, avant 10 commandes livrées sans incident, ne se
//   publie pas ; le brouillon est gardé et le champ prix le dit en une ligne (start_cap{amount, delivered_ok, needed}).
import { ecrire } from './argent'
import { OffreRefusee, VenteInvalide } from './erreurs'
import type { ParametresPaliers } from './registre'

export type Incident = 'litige perdu' | 'rupture' | 'non-préparation' | 'retour validé pour défaut'

/** Nombre de commandes livrées sans aucun incident, au total (A-7) ; chaque élément = incidents d'une commande livrée.
 * 9 commandes propres, un incident, puis 1 propre : 10, le plafond est levé. */
export const livreesSansIncident = (commandesLivrees: Iterable<Incident>[]) => commandesLivrees.filter((i) => [...i].length === 0).length

export const plafondActif = (sansIncident: number, p: ParametresPaliers) => sansIncident < p.demarrageCommandes

/** Unités d'une ligne attribuables à ce vendeur. 3 téléphones à 200 000 F pour un nouveau vendeur : 2, le 3e ailleurs. */
export function quantiteAttribuable(prixUnitaire: number, quantite: number, sansIncident: number, p: ParametresPaliers, dejaAttribue = 0): number {
  if (prixUnitaire < 1 || quantite < 1 || dejaAttribue < 0) throw new VenteInvalide('prix et quantité au moins 1, déjà attribué positif ou nul')
  if (!plafondActif(sansIncident, p)) return quantite
  return Math.min(quantite, Math.floor(Math.max(p.plafondDemarrage - dejaAttribue, 0) / prixUnitaire))
}

/** start_cap de l'appel de calcul (PRX-09) : {amount, delivered_ok, needed}. */
export interface PlafondDeDemarrage {
  amount: number
  deliveredOk: number
  needed: number
  actif: boolean // deliveredOk < needed
}

export function plafondDeDemarrage(sansIncident: number, p: ParametresPaliers): PlafondDeDemarrage {
  if (sansIncident < 0) throw new VenteInvalide('compteur sans incident négatif')
  return { amount: p.plafondDemarrage, deliveredOk: sansIncident, needed: p.demarrageCommandes, actif: sansIncident < p.demarrageCommandes }
}

/** PRX-09 : deliveredOk < 10 ∧ prix unitaire > 500 000 F ⇒ publication refusée, brouillon gardé (OffreRefusee avec la ligne
 * du champ prix). 500 000 F tout juste se publie. */
export function verifierPrixDemarrage(prixUnitaire: number, sansIncident: number, p: ParametresPaliers): void {
  const cap = plafondDeDemarrage(sansIncident, p)
  if (cap.actif && prixUnitaire > cap.amount)
    throw new OffreRefusee(
      `prix ${ecrire(prixUnitaire)} : au-dessus du plafond de démarrage de ${ecrire(cap.amount)} tant que ${cap.needed} commandes ne sont pas livrées sans incident (${cap.deliveredOk} sur ${cap.needed}) ; brouillon gardé (PRX-09, VD-PLAFOND-DEMARRAGE)`,
    )
}
