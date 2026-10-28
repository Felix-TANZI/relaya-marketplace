// Alerte de baisse de prix (VAGUE-AMELIORATIONS.md n° 8) : un favori (ou un article enregistré pour plus tard, une
// ligne du panier) dont le prix du jour est plus bas que le prix noté à l'ajout. Une même règle pour l'écran, la
// notification et le serveur :
// - une baisse compte dès BAISSE_MIN_F francs (les arrondis de quelques francs ne réveillent personne) ;
// - le pourcentage est arrondi à l'unité, jamais à 0 % (« moins de 1 % ») ;
// - la notification part une fois par nouveau prix, seulement si l'alerte « prix » du favori est active.
export const BAISSE_MIN_F = 500

export interface Baisse {
  montant: number
  pourcent: number // 0 : moins de 1 %
}
export function baisseDePrix(avant: number | null | undefined, apres: number): Baisse | null {
  if (!avant || apres >= avant || avant - apres < BAISSE_MIN_F) return null
  return { montant: avant - apres, pourcent: Math.round(((avant - apres) / avant) * 100) }
}
/** Clé de la notification d'une baisse : une par favori et par prix. */
export const cleNotificationBaisse = (favori: string, prix: number) => `baisse-${favori}-${prix}`
