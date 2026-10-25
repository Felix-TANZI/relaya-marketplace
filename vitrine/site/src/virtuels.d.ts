// Modules virtuels de vite.config.ts.
declare module 'virtual:dessins' {
  // Pour chaque identifiant de dessin (src/demo/dessins.json), la fonction qui charge son fichier.
  export const CHARGEURS: Record<string, () => Promise<{ default: unknown }>>
}
