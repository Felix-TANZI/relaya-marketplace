// Commission par catégorie et palier v1.4 (D17, DP-68) et frais de versement du vendeur : portage fidèle de
// moteurs/belivay_moteurs/commission_categorie.py (mêmes formules, mêmes arrondis ; commission14.test.ts rejoue les
// tests d'acceptation livrés avec les données, comme moteurs/tests/test_v14.py).
//   taux        = max(plancher ; taux de base de la catégorie − ajustement du palier)   (catégorie inconnue : DIV)
//   commission  = max(minimum par expédition ; Σ ⌈taux × prix × quantité⌉)             au franc supérieur, hors taxe
//   frais       = ⌈taux de versement × (base − commission)⌉                             à la charge du vendeur
//   net         = base − commission − frais
// Base : prix payé par le client après les remises du vendeur, hors livraison et hors frais Mobile Money. Taux et
// palier figés au paiement. BelivaY ne perd jamais (DP-55) : une expédition où le vendeur garderait moins de 0 F est
// refusée. Codes COM14-* du registre (logique-metier/parametres-en-vigueur.json), lus avec leur forme attendue.
import { OffreRefusee, ParametreIllisible, VenteInvalide } from './erreurs'
import { PALIERS, REGISTRE, type Palier, type Registre } from './registre'

export interface ParametresCommission14 {
  tauxBase: Record<string, number> // en points (8 = 8 %)
  ajustement: Record<Palier, number> // points retirés
  plancher: number
  minimum: number
  versement: number // points
  defaut: string
}
const pc = (code: string, v: string) => {
  const m = /^(\d+(?:,\d+)?) ?%$/.exec(v.trim())
  if (!m) throw new ParametreIllisible(`${code} : « ${v} » n'est pas un taux`)
  return Number(m[1].replace(',', '.'))
}
export function lireCommission14(r: Registre = REGISTRE): ParametresCommission14 {
  const tauxBase = Object.fromEntries(Object.keys(r).filter((c) => /^COM14-[A-Z]{3}$/.test(c) && c !== 'COM14-TVA').map((c) => [c.slice(6), pc(c, r[c])]))
  const a = /^Bronze (\d+(?:,\d+)?) ; Argent (\d+(?:,\d+)?) ; Or (\d+(?:,\d+)?) ; Platine (\d+(?:,\d+)?)$/.exec((r['COM14-AJUSTEMENT'] ?? '').trim())
  if (!a) throw new ParametreIllisible('COM14-AJUSTEMENT illisible')
  const min = /^(\d+) F$/.exec((r['COM14-MINIMUM'] ?? '').trim())
  if (!min) throw new ParametreIllisible('COM14-MINIMUM illisible')
  const defaut = (r['COM14-DEFAUT'] ?? '').trim()
  if (!(defaut in tauxBase)) throw new ParametreIllisible(`COM14-DEFAUT : la catégorie ${defaut} n'a pas de taux`)
  return {
    tauxBase,
    ajustement: Object.fromEntries(PALIERS.map((p, i) => [p, Number(a[i + 1].replace(',', '.'))])) as Record<Palier, number>,
    plancher: pc('COM14-PLANCHER', r['COM14-PLANCHER']),
    minimum: Number(min[1]),
    versement: pc('COM14-VERSEMENT', r['COM14-VERSEMENT']),
    defaut,
  }
}
export const PARAMETRES_COMMISSION14 = lireCommission14()

/** Taux en points (exact au dixième : calcul en centièmes de point). */
export function taux14(p: ParametresCommission14, categorie: string, palier: Palier): number {
  if (!PALIERS.includes(palier)) throw new VenteInvalide(`palier inconnu : ${palier}`)
  const base = p.tauxBase[categorie] ?? p.tauxBase[p.defaut]
  return Math.max(p.plancher * 100, Math.round(base * 100) - Math.round(p.ajustement[palier] * 100)) / 100
}
export interface Ligne14 {
  categorie: string
  prix: number
  quantite?: number
}
export interface Commission14 {
  base: number
  taux: number[]
  commission: number
  reste: number
  fraisVersement: number
  net: number
}
// ⌈t % × montant⌉ en entiers : t en centièmes de point (10 000 = 100 %).
const plafondPc = (t: number, montant: number) => Math.ceil((Math.round(t * 100) * montant) / 10_000 - 1e-9)

export function commissionExpedition(p: ParametresCommission14, palier: Palier, lignes: Ligne14[]): Commission14 {
  if (!lignes.length || lignes.some((x) => x.prix < 0 || (x.quantite ?? 1) <= 0)) throw new VenteInvalide('expédition sans article, ou prix et quantité invalides')
  const t = lignes.map((x) => taux14(p, x.categorie, palier))
  const base = lignes.reduce((s, x) => s + x.prix * (x.quantite ?? 1), 0)
  const commission = Math.max(p.minimum, lignes.reduce((s, x, i) => s + plafondPc(t[i], x.prix * (x.quantite ?? 1)), 0))
  const reste = base - commission
  const fraisVersement = reste > 0 ? plafondPc(p.versement, reste) : 0
  if (reste - fraisVersement < 0) throw new OffreRefusee(`le vendeur garderait ${reste - fraisVersement} F sur une expédition de ${base} F`)
  return { base, taux: t, commission, reste, fraisVersement, net: reste - fraisVersement }
}
