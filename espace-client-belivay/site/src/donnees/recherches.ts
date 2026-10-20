// Recherches récentes (DP-54) : gardées sur l'appareil, les 8 dernières, la plus récente d'abord.
const CLE = 'blv_recherches'
export function recentes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLE) || '[]') as string[]
  } catch {
    return []
  }
}
export function retenirRecherche(q: string) {
  const v = q.trim()
  if (!v) return
  try {
    localStorage.setItem(CLE, JSON.stringify([v, ...recentes().filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 8)))
  } catch {
    // Stockage refusé : la recherche n'est pas gardée.
  }
}
export function oublierRecherches(q?: string) {
  try {
    if (q) localStorage.setItem(CLE, JSON.stringify(recentes().filter((x) => x !== q)))
    else localStorage.removeItem(CLE)
  } catch {
    // Stockage refusé.
  }
}
export const POPULAIRES = ['chargeur tecno', 'pagne wax', 'téléviseur', 'sandales', 'riz parfumé', 'ventilateur', 'écouteurs', 'karité']
