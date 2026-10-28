// Recommandation BelivaY (accueil et pages de catégories) : quels produits sont mis en avant, et dans quel ordre,
// décidé par la meilleure offre (BV-DEV-02, R29 à R34 ; moteur src/calculs/meilleureOffre.ts, le même que
// moteurs/belivay_moteurs/v20/meilleure_offre.py). Aucune règle nouvelle :
// - un produit n'est mis en avant que s'il a une offre retenue vers le relais du client (R32 éligibilité, R33 prix
//   anormal en contrôle, R74 zone couverte : sinon `offre` vaut null) et du stock ;
// - l'ordre suit le score de l'offre retenue (R30 : prix dans la tolérance de la phase R29, Trust Score, délai, stock,
//   avis, bonus Made in Cameroon), puis l'écart de son coût total livré au meilleur CTL du produit, puis les ventes ;
// - égalité parfaite : l'ordre servi par le catalogue (tri stable).
// Le score sert ici à comparer des produits différents : interprétation notée dans logique-metier/REPRISES-FIN.md.
// Source : `Produit.offre` est calculé par le serveur (mode api) ou par la source de démonstration (src/demo/) ;
// absent partout (serveur qui ne le sert pas encore) : l'ordre du catalogue est gardé tel quel.
import type { Produit } from './source'

/** Offre retenue d'un produit pour le relais du client (BV-DEV-02). */
export interface OffreRetenue {
  score: number // R30, de l'offre retenue
  ctl: number // coût total livré de l'offre retenue (prix + frais bruts, BV-DEV-01)
  meilleurCtl: number // meilleur CTL du produit (R29)
}

const avecOffre = (ps: Produit[]) => ps.some((p) => p.offre !== undefined)

/** Comparaison de deux offres retenues : la meilleure d'abord. */
function comparer(a: Produit, b: Produit): number {
  const x = a.offre
  const y = b.offre
  if (!x || !y) return Number(!x) - Number(!y)
  return y.score - x.score || x.ctl - x.meilleurCtl - (y.ctl - y.meilleurCtl) || b.ventes - a.ventes
}

/** Produits mis en avant (accueil) : seulement ceux qui ont une offre retenue et du stock, la meilleure offre d'abord. */
export function recommander(produits: Produit[]): Produit[] {
  if (!avecOffre(produits)) return produits
  return produits.filter((p) => p.offre && p.stock > 0).sort(comparer)
}

/** Ordre « pertinence » d'une liste (catégorie, recherche) : rien n'est retiré ; les produits sans offre retenue
 * (non éligibles, en contrôle, zone non couverte) passent après les autres. */
export function ordonner(produits: Produit[]): Produit[] {
  if (!avecOffre(produits)) return produits
  return [...produits].sort(comparer)
}
