// Meilleure offre (BV-DEV-02 ; R27 à R35, R74) : même calcul que moteurs/belivay_moteurs/v20/meilleure_offre.py,
// réglages de BV-DEV-07_Donnees.json. Le client ne choisit pas son vendeur : CTL = prix + frais bruts de l'offre
// seule (BV-DEV-01) ; éligible : Trust Score ≥ 40, stock, boutique ouverte, zone couverte (R74), nouveau vendeur
// 500 000 F au plus ; prix anormal (R33) en contrôle dès 3 offres ; en course : CTL − meilleur ≤ tolérance de la
// phase (R29) ; score (R30) ; parts ∝ score² (R31) ; retenue : la plus en retard sur sa part cible.
import DONNEES from '../../../logique-metier/reference/BV-DEV-v2.0/A_envoyer_aux_developpeurs/BV-DEV-07_Donnees.json'
import { estRefus, fraisLivraison, type Destination, type Format, type Mode } from './livraison'
import type { Niveau } from './reglages'
import { reglage } from './reglages'

interface Phase { nom: string; mois_debut: number; tolerance_pct: number; tolerance_max: number }
const MO = (DONNEES as unknown as { meilleure_offre: { phases: Phase[]; poids_score: Record<'prix' | 'trust' | 'delai' | 'stock' | 'avis', number>; bonus_made_in_cameroon: number; exposant: number; note_sans_avis: number } }).meilleure_offre

/** Phase du mois compté depuis l'ouverture des achats (1 = premier mois). */
export function phase(mois: number): Phase {
  if (!(mois >= 1)) throw new RangeError('les mois se comptent à partir de 1')
  return MO.phases.filter((p) => p.mois_debut <= mois).at(-1)!
}
export const phaseNommee = (nom: string): Phase => MO.phases.find((p) => p.nom === nom)!
/** R29 : min(⌊meilleur CTL × taux⌋ ; maximum de la phase). */
export const tolerance = (meilleur: number, ph: Phase) => Math.min(Math.floor((meilleur * Math.round(ph.tolerance_pct * 100)) / 100), ph.tolerance_max)

export interface Offre {
  id: string
  prix: number
  zone: string
  niveau: Niveau
  km: number
  format: Format
  trust: number
  nouveau?: boolean
  partReelle?: number
  dernierService?: number // plus petit : servie il y a plus longtemps
  delaiH: number
  stock: number
  note: number | null
  mic?: boolean
  couverte?: boolean // R74
  fermee?: boolean // « Fermé aujourd'hui »
}
export interface EnCourse { id: string; ctl: number; score: number; partCible: number }
export interface Selection {
  meilleurCtl: number | null
  tolerance: number | null
  mediane: number | null
  enCourse: EnCourse[]
  retenue: string | null
  enControle: string[]
  ctl: Record<string, number>
}

export function ctl(mode: Mode, dest: Destination, o: Offre): number {
  if (o.format === 'HG') return o.prix + reglage('hg_min')
  const f = fraisLivraison(mode, dest, [{ zone: o.zone, colis: [o.format], km: o.km, detour: 0, niveau: o.niveau }], [o.prix], { apresPaiement: true })
  if (estRefus(f)) return Infinity
  return o.prix + f.brut
}

export const eligible = (o: Offre, montant?: number) =>
  o.trust >= reglage('trust_min') && o.stock > 0 && !o.fermee && o.couverte !== false && !(o.nouveau && (montant ?? o.prix) > reglage('plafond_nouveau'))

export function score(o: Offre, ecart: number, tol: number): number {
  const p = MO.poids_score
  const sPrix = tol === 0 ? 100 : 100 * (1 - ecart / tol)
  const sDelai = o.delaiH <= 4 ? 100 : o.delaiH <= 24 ? 50 : 0
  const sAvis = (100 * (o.note ?? MO.note_sans_avis)) / 5
  return (p.prix * sPrix + p.trust * o.trust + p.delai * sDelai + p.stock * Math.min(100, 20 * o.stock) + p.avis * sAvis) / 100 + (o.mic ? MO.bonus_made_in_cameroon : 0)
}

export function partsCibles(scores: number[], nouveaux: boolean[]): number[] {
  // Même résolution que le serveur (parts_cibles) : part(i) = min(haut ; max(bas_i ; k × poids_i)), k tel que
  // Σ parts = 100 %. f(k) est continue, croissante et affine entre deux ruptures (k = bas ÷ poids : l'offre quitte son
  // plancher ; k = haut ÷ poids : elle atteint le plafond) ; une fixation itérative des bornes au premier tour peut
  // garder au plancher une offre qui ne devrait plus l'être.
  const n = scores.length
  if (!n) return []
  let poids = scores.map((s) => s ** MO.exposant)
  if (!poids.some((p) => p > 0)) poids = poids.map(() => 1)
  const haut = n >= reglage('part_max_des') ? reglage('part_max') : 1
  const bas = Math.min(reglage('part_min_nouveau'), 1 / n)
  const basDe = nouveaux.map((x) => (x ? bas : 0))
  const PRECISION = 1e-12
  const part = (i: number, k: number) => {
    const v = k * poids[i]
    return v >= haut - PRECISION ? haut : Math.max(basDe[i], v)
  }
  const evenements: [number, number, number][] = [] // (k, variation de C, variation de S)
  let constante = 0
  let pente = 0
  // Ordre fixé par les valeurs : mêmes offres dans un autre ordre ⇒ mêmes parts.
  for (const i of [...Array(n).keys()].sort((a, b) => poids[a] - poids[b] || basDe[a] - basDe[b])) {
    if (poids[i] <= 0) {
      constante += basDe[i]
      continue
    }
    if (basDe[i] > 0) {
      constante += basDe[i]
      evenements.push([basDe[i] / poids[i], -basDe[i], poids[i]])
    } else pente += poids[i]
    evenements.push([haut / poids[i], haut, -poids[i]])
  }
  evenements.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
  let k: number | null = null
  for (const [x, dc, ds] of evenements) {
    if (constante + pente * x >= 1) {
      k = pente === 0 ? x : (1 - constante) / pente
      break
    }
    constante += dc
    pente += ds
  }
  if (k === null) {
    if (constante < 1 - PRECISION) throw new Error('parts cibles impossibles : trop d’offres sans score pour atteindre 100 %')
    k = evenements.at(-1)![0]
  }
  return [...Array(n).keys()].map((i) => part(i, k))
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b)
  const n = s.length
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}

export function selection(ph: Phase, mode: Mode, dest: Destination, offres: Offre[]): Selection {
  const elig = offres.filter((o) => eligible(o))
  const mediane = elig.length ? median(elig.map((o) => o.prix)) : null
  const enControle = mediane !== null && elig.length >= 3 ? elig.filter((o) => Math.abs(o.prix - mediane) > reglage('ecart_mediane') * mediane).map((o) => o.id) : []
  // BV-DEV-02 « Offres éligibles » : format compatible avec le mode (XL et hors gabarit : domicile seulement, R10) ;
  // elles restent des offres actives pour la médiane (R33).
  const valides = elig.filter((o) => !enControle.includes(o.id) && (mode === 'domicile' || (o.format !== 'XL' && o.format !== 'HG')))
  const couts = Object.fromEntries(valides.map((o) => [o.id, ctl(mode, dest, o)]))
  const possibles = valides.filter((o) => Number.isFinite(couts[o.id]))
  if (!possibles.length) return { meilleurCtl: null, tolerance: null, mediane, enCourse: [], retenue: null, enControle, ctl: couts }
  const meilleur = Math.min(...possibles.map((o) => couts[o.id]))
  const tol = tolerance(meilleur, ph)
  const course = possibles.filter((o) => couts[o.id] - meilleur <= tol)
  const scores = course.map((o) => score(o, couts[o.id] - meilleur, tol))
  const cibles = partsCibles(scores, course.map((o) => !!o.nouveau))
  const enCourse = course.map((o, i) => ({ id: o.id, ctl: couts[o.id], score: scores[i], partCible: cibles[i] }))
  // Égalité (au milliardième, comme le serveur) : meilleur score, puis servie le moins récemment ; enfin l'identifiant,
  // pour que l'ordre des offres reçues ne change jamais le choix.
  const cle = (i: number) => [-Math.round((cibles[i] - (course[i].partReelle ?? 0)) * 1e9), -Math.round(scores[i] * 1e9), course[i].dernierService ?? 0]
  const avant = (i: number, j: number) => {
    const [a, b] = [cle(i), cle(j)]
    for (let x = 0; x < a.length; x++) if (a[x] !== b[x]) return a[x] < b[x]
    return course[i].id < course[j].id
  }
  let r = 0
  for (let i = 1; i < course.length; i++) if (avant(i, r)) r = i
  return { meilleurCtl: meilleur, tolerance: tol, mediane, enCourse, retenue: course[r].id, enControle, ctl: couts }
}

// ── Prix conseillé et badge (R34) ───────────────────────────────────────────────────────────────────────────
const centaineInf = (x: number) => Math.floor(x / 100) * 100
/** Prix gagnant d'une zone : meilleur CTL concurrent − livraison de l'offre vers la zone − 100 F, à la centaine inf. */
export const prixGagnant = (meilleurCtlConcurrent: number, livraisonVersZone: number) => centaineInf(meilleurCtlConcurrent - livraisonVersZone - 100)
/** 10e centile, rang le plus proche (⌈0,1 × n⌉-ième prix). */
export function centile(valeurs: number[], q = 0.1): number {
  const v = [...valeurs].sort((a, b) => a - b)
  return v[Math.max(1, Math.ceil(q * v.length)) - 1]
}
/** min(prix saisi ; max(médiane des prix gagnants ; 10e centile du marché ; 1 000 F ; plancher)). */
export function prixConseille(prixSaisi: number, prixGagnants: number[], prixMarche: number[], plancher = 0): number {
  const bornes = [reglage('prix_min_publiable'), plancher]
  if (prixGagnants.length) bornes.push(Math.trunc(median(prixGagnants)))
  if (prixMarche.length) bornes.push(centile(prixMarche))
  return Math.min(prixSaisi, Math.max(...bornes))
}
/** Badge « Meilleur prix » : l'offre la moins chère, sauf hausse de plus de 10 % en 7 jours. */
export function meilleurPrix(offres: { id: string; prix: number; prixIlYa7Jours: number }[]): Set<string> {
  if (!offres.length) return new Set()
  const bas = Math.min(...offres.map((o) => o.prix))
  return new Set(offres.filter((o) => o.prix === bas && o.prix <= o.prixIlYa7Jours * 1.1).map((o) => o.id))
}
