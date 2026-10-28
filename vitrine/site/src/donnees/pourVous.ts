// Flux « Pour vous » de l'accueil (CL-04) : signaux du client gardés sur l'appareil et classement. Règles pures
// (aucun accès à l'écran) ; l'écran : pages/CL-04/PourVous.tsx.
// Signaux : catégories et produits vus (fiche), recherches, « Pas intéressé », produits mis au panier ; s'y ajoutent
// à la lecture les favoris et les centres d'intérêt du compte. Sans signal (nouveau client) ou personnalisation
// coupée (Confidentialité), le flux montre les meilleures ventes de la zone, disponibles au relais.
import type { Produit } from './source'

export interface Gouts {
  univers: Record<string, number> // univers → fiches vues
  vus: string[] // derniers produits vus (le plus récent d'abord)
  recherches: string[] // dernières recherches
  paniers: string[] // univers des produits mis au panier
  masques: string[] // « Pas intéressé »
}
const CLE = 'blv_gouts'
const MAX = 30
const vide = (): Gouts => ({ univers: {}, vus: [], recherches: [], paniers: [], masques: [] })

export function lireGouts(): Gouts {
  try {
    return { ...vide(), ...(JSON.parse(localStorage.getItem(CLE) ?? '{}') as Partial<Gouts>) }
  } catch {
    return vide()
  }
}
function maj(f: (g: Gouts) => void) {
  const g = lireGouts()
  f(g)
  try {
    localStorage.setItem(CLE, JSON.stringify(g))
  } catch {
    /* stockage refusé : la visite seule */
  }
}
const devant = (l: string[], x: string) => [x, ...l.filter((y) => y !== x)].slice(0, MAX)

export const noterVue = (p: Produit) =>
  maj((g) => {
    g.univers[p.univers] = (g.univers[p.univers] ?? 0) + 1
    g.vus = devant(g.vus, p.p)
  })
export const noterRecherche = (q: string) => q.trim().length > 1 && maj((g) => void (g.recherches = devant(g.recherches, q.trim().toLowerCase())))
export const noterPanier = (univers: string) => maj((g) => void (g.paniers = devant(g.paniers, univers)))
export const pasInteresse = (p: string) => maj((g) => void (g.masques = devant(g.masques, p)))
export const aDesSignaux = (g: Gouts, favoris: string[]) => g.vus.length + g.recherches.length + g.paniers.length + favoris.length > 0

const sansAccents = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const km = (d: string | null | undefined) => (d ? Number(d.replace(/[^\d,.]/g, '').replace(',', '.')) : NaN)

export interface Contexte {
  gouts: Gouts
  favoris: Produit[] // fiches des favoris
  interets: string[] // univers choisis à l'arrivée
  personnalise: boolean // Confidentialité : suggestions selon ce que tu regardes et achètes
}

/**
 * Score d'un produit : meilleures ventes de la zone (log des ventes, note), disponibilité au relais (en stock, près
 * du relais), puis, si la personnalisation est permise, affinité : univers vus, recherches dont il contient un mot,
 * univers des favoris, des paniers, centres d'intérêt ; un univers écarté (« Pas intéressé ») baisse.
 */
export function scorePourVous(p: Produit, c: Contexte, ecartes?: Record<string, number>): number {
  const note = Number(String(p.note ?? '0').replace(',', '.')) || 0
  const d = km(p.distance)
  let s = Math.log1p(p.ventes) + (note ? (note - 4) * 0.8 : 0) + (p.stock > 0 ? 0.5 : -6) + (d <= 2 ? 0.6 : d <= 5 ? 0.3 : 0)
  if (!c.personnalise) return s
  const g = c.gouts
  const vus = Object.values(g.univers).reduce((a, b) => a + b, 0)
  if (vus) s += 2.5 * ((g.univers[p.univers] ?? 0) / vus)
  const texte = sansAccents(`${p.titre} ${p.marque ?? ''} ${p.universTitre} ${p.sousCategorie ?? ''}`)
  if (g.recherches.some((q) => sansAccents(q).split(/\s+/).some((m) => m.length > 2 && texte.includes(m)))) s += 1.4
  if (c.favoris.some((f) => f.univers === p.univers)) s += 0.9
  if (g.paniers.includes(p.univers)) s += 0.7
  if (c.interets.includes(p.univers)) s += 0.6
  s -= 0.5 * (ecartes?.[p.univers] ?? 0)
  return s
}

/**
 * Classe le flux : les produits masqués et ceux déjà montrés plus haut (exclus) n'y sont pas ; rangés par score, en
 * évitant trois produits du même univers à la suite (diversité).
 */
export function classerPourVous(produits: Produit[], c: Contexte, exclus: Set<string>, univers: string | null): Produit[] {
  // Univers des produits écartés (« Pas intéressé ») : chacun baisse un peu son univers.
  const ecartes: Record<string, number> = {}
  for (const p of produits) if (c.gouts.masques.includes(p.p)) ecartes[p.univers] = (ecartes[p.univers] ?? 0) + 1
  const restants = produits
    .filter((p) => !exclus.has(p.p) && !c.gouts.masques.includes(p.p) && (!univers || p.univers === univers))
    .map((p) => ({ p, s: scorePourVous(p, c, ecartes) }))
    .sort((a, b) => b.s - a.s || a.p.p.localeCompare(b.p.p))
  const sortie: Produit[] = []
  while (restants.length) {
    const [a, b] = sortie.slice(-2)
    const i = restants.findIndex((x) => !(a && b && a.univers === b.univers && x.p.univers === a.univers))
    sortie.push(restants.splice(i < 0 ? 0 : i, 1)[0].p)
  }
  return sortie
}

/**
 * Flux dans l'ordre servi par le serveur (GET /api/catalog/for-you, mode api) : seuls les produits qu'il nomme, dans
 * son ordre ; les « Pas intéressé » gardés sur l'appareil et les produits déjà montrés plus haut n'y sont pas.
 */
export function suivreOrdreServeur(produits: Produit[], ordre: string[], c: Contexte, exclus: Set<string>): Produit[] {
  const parP = new Map(produits.map((p) => [p.p, p]))
  return ordre.flatMap((id) => {
    const p = parP.get(id)
    return p && !exclus.has(id) && !c.gouts.masques.includes(id) ? [p] : []
  })
}

// Catégories des pastilles « Tout + catégories préférées » : univers les plus vus, puis favoris, centres d'intérêt
// et meilleures ventes, 6 au plus.
export function universPreferes(produits: Produit[], c: Contexte): string[] {
  const poids = new Map<string, number>()
  const ajouter = (u: string, n: number) => poids.set(u, (poids.get(u) ?? 0) + n)
  if (c.personnalise) {
    Object.entries(c.gouts.univers).forEach(([u, n]) => ajouter(u, n * 3))
    c.favoris.forEach((f) => ajouter(f.univers, 2))
    c.interets.forEach((u) => ajouter(u, 2))
  }
  produits.forEach((p) => ajouter(p.univers, Math.log1p(p.ventes) / 10))
  return [...poids.entries()].sort((a, b) => b[1] - a[1]).map(([u]) => u).slice(0, 6)
}
