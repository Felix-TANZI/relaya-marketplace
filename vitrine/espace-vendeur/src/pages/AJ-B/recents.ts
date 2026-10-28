// Recherches récentes : une commodité de CET appareil (localStorage), jamais une donnée de la boutique. Six au plus,
// la plus récente d'abord ; tout accès au stockage peut échouer (navigation privée) : la page marche sans.
const CLE = 'blv_v_recherches'
const MAX = 6

/** Texte comparé sans accents ni majuscules. */
export const normaliser = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '’')

export function lireRecents(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) || '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, MAX) : []
  } catch {
    return []
  }
}

export function retenirRecent(q: string): string[] {
  const liste = [q, ...lireRecents().filter((x) => normaliser(x) !== normaliser(q))].slice(0, MAX)
  try {
    localStorage.setItem(CLE, JSON.stringify(liste))
  } catch {
    /* stockage refusé */
  }
  return liste
}

export function oublierRecents(): string[] {
  try {
    localStorage.removeItem(CLE)
  } catch {
    /* rien */
  }
  return []
}
