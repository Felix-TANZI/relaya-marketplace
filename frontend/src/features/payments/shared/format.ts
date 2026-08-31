// frontend/src/features/payments/shared/format.ts
// Formatage monetaire — isole des composants.
//
// Ce fichier existe pour une raison precise : `react-refresh/only-export-components`
// interdit d'exporter autre chose qu'un composant depuis un fichier de
// composant. Le rafraichissement a chaud casserait sinon.

/**
 * Formate un montant en francs CFA.
 *
 * Le separateur de milliers est un espace INSECABLE : un montant ne doit
 * jamais se couper en fin de ligne. Le signe est traite par l'appelant.
 */
export function formatXaf(value: number): string {
  return Math.round(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

/** Couleurs de la barre de maturite, dans l'ordre du parcours. */
export const MATURITY_COLORS = {
  /** Sous sequestre : la commande est vivante, ce n'est pas encore son argent. */
  held: '#D3D1C7',
  /** En reglement : le lot est en preparation. */
  settling: '#F0997B',
  /** Acquis : il lui revient au prochain cycle. */
  earned: '#1D9E75',
} as const;