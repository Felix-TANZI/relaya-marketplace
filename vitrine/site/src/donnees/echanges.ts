// Règles des échanges entre clients (DP-54, consigne du porteur du 4 oct. : « la règle BelivaY ne perd jamais »).
// Une seule règle pour tous les échanges : commander pour un proche (diaspora ou Cameroun), envoyer son panier
// à payer, offrir depuis une liste d'envies ou un anniversaire, cagnotte, cotisation, panier partagé.
//
// Rôles : le PAYEUR règle les articles ; le DESTINATAIRE reçoit le colis (relais ou domicile) ; les frais de
// livraison sont payés par l'un OU l'autre, au choix fixé avant le paiement.
//
// Garanties pour BelivaY (rien ne part sans que chaque franc soit couvert) :
// 1. Articles : toujours payés et bloqués AVANT l'envoi au vendeur.
// 2. Frais payés par le payeur : encaissés avec les articles.
// 3. Frais payés par le destinataire : encaissés à la remise (comptoir du relais ou livreur, Mobile Money). Le
//    payeur donne sa garantie : si le destinataire refuse ou ne vient pas, frais + garde + renvoi sont retenus
//    sur le remboursement des articles (jamais plus que le payé, DP-24).
// 4. Donc « destinataire paie » n'est permis que si la valeur des articles couvre le pire cas
//    (frais + garde maximale + renvoi) ; sinon le payeur paie les frais.
// 5. Un compte diaspora paie toujours tout (il est le payeur) ; son proche ne paie jamais rien, sauf s'il choisit
//    lui-même la livraison à domicile au lieu du relais offert par le payeur (supplément à sa charge, payé à
//    la remise, couvert par la même garantie).
// 6. Le destinataire voit ce qu'il aura à payer AVANT d'accepter ; il peut refuser le colis sans frais tant que
//    le vendeur n'a pas expédié (le payeur est alors remboursé en entier).
import { GRILLE_GARDE, RENVOI_GARDE } from '../pages/CL-09/Commun'

export type PaieFrais = 'payeur' | 'destinataire'

export const GARDE_MAX = GRILLE_GARDE.reduce((n, g) => n + g, 0)

/** Pire cas à couvrir si le destinataire ne paie pas : frais + garde complète + renvoi au vendeur. */
export const pireCas = (frais: number, gros = false) => frais + GARDE_MAX + (gros ? 300 * GRILLE_GARDE.length : 0) + RENVOI_GARDE

/** « Le destinataire paie la livraison » est-il permis pour ce colis ? */
export function destinatairePeutPayer(o: { articles: number; frais: number; gros?: boolean; payeurDiaspora?: boolean }) {
  if (o.payeurDiaspora) return { ok: false as const, raison: 'diaspora' as const }
  if (o.frais <= 0) return { ok: false as const, raison: 'offert' as const }
  if (o.articles < pireCas(o.frais, o.gros)) return { ok: false as const, raison: 'garantie' as const }
  return { ok: true as const, raison: null }
}

/** Répartition de ce que chacun paie, et quand. */
export function repartition(o: { articles: number; frais: number; qui: PaieFrais }) {
  const payeurMaintenant = o.articles + (o.qui === 'payeur' ? o.frais : 0)
  const destinataireALaRemise = o.qui === 'destinataire' ? o.frais : 0
  return { payeurMaintenant, destinataireALaRemise, garantie: o.qui === 'destinataire' ? Math.min(pireCas(o.frais), o.articles) : 0 }
}

/** Retenue si le destinataire refuse ou ne retire pas (jamais plus que le payé). */
export function retenueRefus(o: { articles: number; frais: number; qui: PaieFrais; joursGarde: number }) {
  const garde = GRILLE_GARDE.slice(0, Math.max(0, o.joursGarde)).reduce((n, g) => n + g, 0)
  const du = (o.qui === 'destinataire' ? o.frais : 0) + garde + RENVOI_GARDE
  return Math.min(du, o.articles + (o.qui === 'payeur' ? o.frais : 0))
}

// ——— Compte diaspora (ajout DP-54, détail de la règle 5) ———
// Le compte diaspora est le payeur : articles + livraison au relais + frais de service carte (2 %), encaissés avant
// l'envoi au vendeur (règles 1 et 2). Livraison « chez le proche » :
// - choisie par le diaspora : il paie tout (livraison à domicile comprise) ;
// - demandée par le proche (son panier envoyé, livraison chez lui) : le diaspora paie aussi le supplément domicile
//   par défaut ; il peut le laisser au proche, payé à la remise (règle 5), seulement si la valeur des articles
//   couvre le pire cas de ce supplément (règle 4) ; sinon le diaspora le paie.
export const SERVICE_CARTE = 0.02

/** « Laisser le supplément domicile au proche » est-il permis ? */
export function supplementAuProche(o: { articles: number; supplement: number; demandeParProche: boolean; gros?: boolean }) {
  if (!o.demandeParProche) return { ok: false as const, raison: 'choix-payeur' as const }
  if (o.supplement <= 0) return { ok: false as const, raison: 'offert' as const }
  if (o.articles < pireCas(o.supplement, o.gros)) return { ok: false as const, raison: 'garantie' as const }
  return { ok: true as const, raison: null }
}

/** Ce que paie le compte diaspora maintenant, et ce que le proche paierait à la remise. */
export function totalDiaspora(o: { articles: number; fraisRelais: number; fraisDomicile: number; livraison: 'relais' | 'domicile'; supplementPar: PaieFrais }) {
  const livraison = o.livraison === 'domicile' ? o.fraisDomicile : o.fraisRelais
  const supplement = o.livraison === 'domicile' ? Math.max(0, o.fraisDomicile - o.fraisRelais) : 0
  const aLaRemise = o.supplementPar === 'destinataire' ? supplement : 0
  const livraisonPayee = livraison - aLaRemise
  const service = Math.round((o.articles + livraisonPayee) * SERVICE_CARTE)
  return { livraison, supplement, aLaRemise, livraisonPayee, service, total: o.articles + livraisonPayee + service }
}

// ——— Compléments (cadeaux, listes, cotisations, envois pour un proche ; DP-54) ———

/** Un article de liste « cher » : on peut l'offrir à plusieurs ; la participation bascule en cotisation. */
export const COTISER_DES = 15000

/** Le propriétaire d'une liste relance lui-même ses invités BelivaY : un rappel tous les 3 jours au plus. */
export const RAPPEL_ECART = 3 * 864e5

/** Rappels proposés à qui suit la liste d'un proche : nombre de jours avant la date de remise. */
export const RAPPELS_JOURS = [1, 3, 7] as const

/**
 * Refus d'un colis par le destinataire (règle 6) : sans frais tant que le vendeur n'a pas expédié (le payeur est
 * remboursé en entier) ; ensuite, retenue (retenueRefus) sur le remboursement des articles. Des frais payés par le
 * payeur ont servi au transport : après l'expédition, ils ne reviennent pas.
 */
export function refusColis(o: { articles: number; frais: number; qui: PaieFrais; expedie: boolean; joursGarde: number }) {
  if (!o.expedie) return { retenue: 0, rembourse: o.articles + (o.qui === 'payeur' ? o.frais : 0) }
  const retenue = Math.min(retenueRefus(o), o.articles)
  return { retenue, rembourse: o.articles - retenue }
}

/** Objectif d'une cotisation : prix figé à la création (avec la livraison si les participants la paient) + 2 %. */
export function objectifCotisation(o: { prix: number; frais: number; qui: PaieFrais }) {
  const base = o.prix + (o.qui === 'payeur' ? o.frais : 0)
  return base + Math.round(base * 0.02)
}
