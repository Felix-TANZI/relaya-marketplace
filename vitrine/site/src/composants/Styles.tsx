// Bloc de styles qu'un écran du prototype insère à un endroit précis (outils/styles.mjs les écrit dans
// src/styles/ecrans/) : gardé à sa place, car un <style> compte pour :first-child et ses voisins.
const BLOCS = import.meta.glob('../styles/ecrans/*.css', { query: '?inline', import: 'default', eager: true }) as Record<string, string>

export function Styles({ id }: { id: string }) {
  const css = BLOCS[`../styles/ecrans/${id}.css`]
  if (css === undefined) console.error('[bloc de styles absent]', id)
  return <style>{css}</style>
}
