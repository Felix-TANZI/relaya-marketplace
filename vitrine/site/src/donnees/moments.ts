// Accueil par moments (VAGUE-AMELIORATIONS.md n° 10) : la Rentrée, les Fêtes de fin d'année, la Saint-Valentin, la
// Fête des mères… chacun avec sa période (jours du calendrier, d'une année sur l'autre) et son interrupteur « actif »
// réglé par l'administrateur dans la console (contenus de l'accueil : GET /api/content/home, éditable dans l'admin).
// Le moment du jour est choisi par le serveur (momentDuJour) ; l'accueil le montre en tête : titre, accroche, lien,
// quelques produits de ses sous-catégories. Hors de toute période active : rien (l'accueil ordinaire).
// Aperçu de la console : « /?moment=<id> » montre un moment même hors de sa période ; « ?moment=aucun » aucun.
export interface Moment {
  id: string
  titre: string
  accroche: string
  du: string // « MM-JJ », inclus
  au: string // « MM-JJ », inclus ; avant « du » : la période passe le 31 décembre
  actif: boolean // interrupteur de l'administrateur
  priorite: number // deux moments en même temps : la plus haute
  lien: string
  sousCategories: string[] // les produits montrés
  ton: 'or' | 'violet' | 'vert' | 'rose'
  image?: { url: string; alt?: string } | null // photo posée par l'administrateur (sinon : aucune)
}

export const MOMENTS_PAR_DEFAUT: Moment[] = [
  { id: 'rentree', titre: 'C’est la rentrée', accroche: 'Cahiers, cartables, manuels : tout pour la classe, retiré au relais près de l’école.', du: '08-15', au: '10-15', actif: false, priorite: 2, lien: '/liste?cat=bebe&sub=Rentr%C3%A9e%20scolaire', sousCategories: ['Rentrée scolaire', 'Livres'], ton: 'or' },
  { id: 'fetes', titre: 'Les fêtes de fin d’année', accroche: 'Cadeaux, jouets, parfums : commande tôt, retire avant le réveillon.', du: '12-01', au: '01-06', actif: true, priorite: 3, lien: '/promotions', sousCategories: ['Jouets', 'Parfums', 'Montres', 'TV & vidéo'], ton: 'violet' },
  { id: 'saint-valentin', titre: 'Saint-Valentin', accroche: 'Un parfum, une montre, une attention : livré au relais de ton choix.', du: '02-01', au: '02-14', actif: true, priorite: 2, lien: '/liste?cat=beaute', sousCategories: ['Parfums', 'Montres', 'Accessoires'], ton: 'rose' },
  { id: 'fete-des-meres', titre: 'Fête des mères', accroche: 'Pour celle qui veille sur tout : soins, cuisine, bijoux.', du: '05-15', au: '05-31', actif: true, priorite: 2, lien: '/liste?cat=beaute', sousCategories: ['Parfums', 'Soins visage', 'Cuisine'], ton: 'vert' },
]

/** Jour « MM-JJ » d'un instant à Yaoundé (UTC + 1). */
export const jourDuMois = (instant: number) => new Date(instant + 3_600_000).toISOString().slice(5, 10)

export const dansLaPeriode = (m: Pick<Moment, 'du' | 'au'>, jour: string) => (m.du <= m.au ? jour >= m.du && jour <= m.au : jour >= m.du || jour <= m.au)

/** Le moment à montrer : actif, dans sa période, le plus prioritaire ; null : aucun. */
export function momentDuJour(moments: Moment[], instant: number): Moment | null {
  const jour = jourDuMois(instant)
  return moments.filter((m) => m.actif && dansLaPeriode(m, jour)).sort((a, b) => b.priorite - a.priorite)[0] ?? null
}
