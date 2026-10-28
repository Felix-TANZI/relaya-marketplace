// Frais de livraison v2.0 (BV-DEV-01 § 5 et § 6 ; R04 à R10, R83, R84), même calcul que
// moteurs/belivay_moteurs/v20/livraison.py ; les tests de BV-DEV-07 servent d'oracle (espace-vendeur, v20-client.test.ts).
//   frais bruts = base + km + suppléments de format + colis en plus + boutiques en plus ; client = brut − couverture
//   relais : base 900 F, pas de km ; boutique de base : celle d'une autre zone que le relais (égalité : la première)
//   domicile : course seule = niveau max(boutique, client) + 250 F × max(0 ; km − 5) ; la plus chère est la base ;
//              XL : 4 000 F + (niveau − 1 500 F), sans supplément de format ; jamais au relais
//   formats : pochette 0, C1 +500 F, C2 ou carton d'origine +700 F ; colis en plus : 900 F relais, 500 F domicile
//   boutiques en plus : 500 F dans la zone de la destination ; sinon 1 000 F (+ à domicile 250 F × max(0 ; détour − 5))
//   couverture (panier entier, R07) : relais min(900 ; brut) dès 30 000 F ; domicile min(1 500 ; brut) dès 50 000 F
import { NIVEAUX, prixNiveau, reglage, type Niveau } from './reglages'

export type Format = 'P' | 'C1' | 'C2' | 'CO' | 'XL' | 'HG'
export type Mode = 'relais' | 'domicile'
const SUPPLEMENT: Partial<Record<Format, string>> = { C1: 'sup_c1', C2: 'sup_c2', CO: 'sup_c2' }

export interface Destination { zone: string; niveau: Niveau; quartier?: string | null }
export interface BoutiqueFrais { zone: string; colis: Format[]; km: number; detour: number; niveau: Niveau }
export interface Frais {
  mode: Mode; niveau: Niveau | null; xl: boolean; base: number; km: number; sup_formats: number; colis_en_plus: number
  boutiques: number; detour: number; brut: number; couverture: number; client: number; n_boutiques: number; n_colis: number
  i_base: number; sous_total: number
}
/** R84 : manque du panier entier (boutique null) ou du premier colis sous le minimum (rang 0…). */
export interface Minimum { manque: number; boutique: number | null }
export type Refus = { refus: 'xl-relais' | 'hors-gabarit' } | { refus: 'minimum'; minimum: Minimum }

export function manqueMinimum(sousTotaux: number[]): Minimum | null {
  const manque = reglage('panier_min') - sousTotaux.reduce((a, b) => a + b, 0)
  if (manque > 0) return { manque, boutique: null }
  const i = sousTotaux.findIndex((s) => s < reglage('boutique_min'))
  return i < 0 ? null : { manque: reglage('boutique_min') - sousTotaux[i], boutique: i }
}

export const seuilOffert = (mode: Mode) => reglage(mode === 'relais' ? 'seuil_relais' : 'seuil_dom')
/** 900 F au relais ; 1 500 F à domicile (500 F de ramassage + 1 000 F de remise, R05). */
export const couvertureMax = (mode: Mode) => (mode === 'relais' ? reglage('relais') : reglage('ramassage') + reglage('remise_dom'))

const niveauMax = (...n: Niveau[]) => n.reduce((a, b) => (NIVEAUX.indexOf(b) > NIVEAUX.indexOf(a) ? b : a))
const prixKm = (km: number) => reglage('prix_km') * Math.max(0, km - reglage('km_inclus'))

export function fraisLivraison(mode: Mode, dest: Destination, boutiques: BoutiqueFrais[], sousTotaux: number[], o: { apresPaiement?: boolean; offerteAcquise?: boolean } = {}): Frais | Refus {
  const colis = boutiques.flatMap((b) => b.colis)
  if (colis.includes('HG')) return { refus: 'hors-gabarit' }
  const xl = colis.includes('XL')
  if (xl && mode === 'relais') return { refus: 'xl-relais' }
  const m = o.apresPaiement ? null : manqueMinimum(sousTotaux)
  if (m) return { refus: 'minimum', minimum: m }
  const relais = mode === 'relais'
  const s = sousTotaux.reduce((a, b) => a + b, 0)
  const autre = boutiques.map((b) => b.zone !== dest.zone)
  const seul = relais ? autre.map(Number) : boutiques.map((b) => prixNiveau(niveauMax(b.niveau, dest.niveau)) + prixKm(b.km))
  const iBase = seul.indexOf(Math.max(...seul))
  const b0 = boutiques[iBase]
  const niveau = relais ? null : niveauMax(b0.niveau, dest.niveau)
  let base = relais ? reglage('relais') : prixNiveau(niveau!)
  if (xl) base = reglage('xl_base') + base - prixNiveau('centre')
  const km = relais ? 0 : prixKm(b0.km)
  const sup = colis.reduce((t, c) => t + (SUPPLEMENT[c] ? reglage(SUPPLEMENT[c]!) : 0), 0)
  const enPlus = relais ? reglage('relais') : reglage('colis_en_plus')
  const colisEnPlus = boutiques.reduce((t, b) => t + enPlus * (b.colis.length - 1), 0)
  let suppBoutiques = 0
  let detour = 0
  boutiques.forEach((b, i) => {
    if (i === iBase) return
    if (!autre[i]) return void (suppBoutiques += reglage('boutique_meme_zone'))
    const d = relais ? 0 : reglage('prix_km') * Math.max(0, b.detour - reglage('detour_inclus'))
    suppBoutiques += reglage('boutique_autre_zone') + d
    detour += d
  })
  const brut = base + km + sup + colisEnPlus + suppBoutiques
  const couverture = o.offerteAcquise || s >= seuilOffert(mode) ? Math.min(couvertureMax(mode), brut) : 0
  return { mode, niveau, xl, base, km, sup_formats: sup, colis_en_plus: colisEnPlus, boutiques: suppBoutiques, detour, brut, couverture, client: brut - couverture, n_boutiques: boutiques.length, n_colis: colis.length, i_base: iBase, sous_total: s }
}
export const estRefus = (f: Frais | Refus): f is Refus => 'refus' in f
