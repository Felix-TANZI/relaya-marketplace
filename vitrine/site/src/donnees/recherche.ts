// Recherche intelligente (CL-05 ; VAGUE-AMELIORATIONS.md n° 4) : les règles, pures, partagées par la recherche, ses
// suggestions et l'assistant (composants/Catalogue.tsx les réexporte) ; le serveur appliquera les mêmes.
// - Sans accents ni majuscules (norme).
// - Chaque mot de la recherche doit se trouver dans le titre, la marque, la variante, la catégorie, l'univers, les
//   étiquettes ou les mots-clés ; une faute légère passe par le début du mot (« tekno ») ; un mot de tous les jours a ses
//   équivalents (SYNONYMES : « frigo » → réfrigérateur, « télé » → téléviseur, « ordi » → MacBook…).
// - Fautes corrigées (corriger) : un mot absent du catalogue devient le mot du catalogue le plus proche, à une ou deux
//   lettres près selon sa longueur, ou qui se prononce pareil (phonetique : « ifone » → iphone, « samsoung » → samsung).
import type { Produit } from './source'

export const norme = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Mots de tous les jours (sans accents) et leurs équivalents dans le catalogue. */
export const SYNONYMES: Record<string, string[]> = {
  frigo: ['refrigerateur'],
  frigidaire: ['refrigerateur'],
  tele: ['televiseur'],
  tv: ['televiseur'],
  ordi: ['macbook', 'informatique'],
  ordinateur: ['macbook', 'informatique'],
  laptop: ['macbook'],
  pc: ['macbook', 'informatique'],
  portable: ['smartphone'],
  telephone: ['smartphone'],
  tel: ['smartphone'],
  phone: ['smartphone'],
  console: ['playstation', 'xbox', 'switch'],
  manette: ['dualsense'],
  ecouteur: ['ecouteurs', 'airpods', 'buds'],
  laveuse: ['lave-linge'],
  clim: ['climatiseur'],
  powerbank: ['batterie'],
  chargeur: ['chargeur', 'magsafe'],
}

export const motsDe = (q: string) => norme(q).split(/\s+/).filter((m) => m.length > 1)
const texteDe = (p: Produit) => norme([p.titre, p.marque, p.variante, p.sousCategorie, p.universTitre, ...p.tags, ...(p.motsCles ?? [])].filter(Boolean).join(' '))

/** Nombre de mots de la recherche trouvés dans le produit (un équivalent compte ; « exact » : sans tolérance). */
// Le début d'un mot deviné (« tekno » → « tekn… ») ne compte qu'au début d'un mot du produit : « ifone » ne trouve pas
// « multifonction ».
export function score(p: Produit, q: string, exact = false): number {
  const texte = texteDe(p)
  const debuts = ' ' + texte.replace(/[^a-z0-9]+/g, ' ')
  return motsDe(q).filter((m) => [m, ...(SYNONYMES[m] ?? [])].some((v) => texte.includes(v) || (!exact && v.length > 3 && debuts.includes(' ' + v.slice(0, 4))))).length
}
export const correspond = (p: Produit, q: string) => score(p, q) === motsDe(q).length

/** Forme prononcée d'un mot (sans accents) : ph → f, k et qu → c, y → i, ou → u, lettres doublées simples, e et s muets à la fin. */
export function phonetique(m: string): string {
  return norme(m)
    .replace(/ph/g, 'f')
    .replace(/qu/g, 'c')
    .replace(/k/g, 'c')
    .replace(/y/g, 'i')
    .replace(/ou/g, 'u')
    .replace(/(.)\1+/g, '$1')
    .replace(/[es]+$/, '')
}

/** Distance d'édition (insertion, suppression, remplacement d'une lettre). */
export function ecart(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prec = d[0]
    d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const t = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prec + (a[i - 1] === b[j - 1] ? 0 : 1))
      prec = t
    }
  }
  return d[b.length]
}

/** Recherche corrigée (« chargeur tekno » → « chargeur tecno », « ifone » → « iphone ») ; null si rien n'est à corriger. */
export function corriger(produits: Produit[], q: string): string | null {
  const vocab = [...new Set(produits.flatMap((p) => texteDe(p).split(/[^a-z0-9]+/)).filter((m) => m.length > 2))]
  const connu = new Set(vocab)
  let change = false
  const r = q
    .trim()
    .split(/\s+/)
    .map((m) => {
      const n = norme(m)
      if (n.length < 3 || connu.has(n) || SYNONYMES[n] || vocab.some((v) => v.startsWith(n))) return m
      const son = phonetique(n)
      const meme = vocab.find((v) => phonetique(v) === son)
      const max = n.length > 6 ? 2 : 1
      const proche = meme ?? (n.length < 4 ? undefined : vocab.map((v) => [v, ecart(n, v)] as const).filter(([, e]) => e <= max).sort((a, b) => a[1] - b[1] || b[0].length - a[0].length)[0]?.[0])
      if (!proche) return m
      change = true
      return proche
    })
    .join(' ')
  return change ? r : null
}
