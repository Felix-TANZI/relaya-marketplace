// Frais du panier, côté écran (DP-54) : la même formule que moteurs/belivay_moteurs/frais.py (CAL-06 à CAL-11 ;
// DP-07, DP-18, DP-19, DP-25), pour que le panier réagisse tout de suite ; le serveur recalcule au paiement
// (CAL-11 : une hausse est bloquée et montrée, une baisse appliquée).
//   S     = Σ prix × quantité
//   Ram   = Σ_zones [R + (n_z − 1) × R′]           une boutique au plein tarif par zone, les suivantes partagent
//   Rem   = Σ_colis remise(mode, classe du colis)  relais : S/M 400 F, L 600 F ; domicile : 1 000 F
//   Off   = R + remise d'un colis S, si S ≥ seuil  (jamais plus que Ram + Rem)
//   Total = S + Ram + Rem − Off

export type Classe = 'S' | 'M' | 'L' | 'XL' | 'HG'
export type ModeLivraison = 'relais' | 'domicile'

export const PARAMETRES = {
  ramassage: 500, // LIV-R
  ramassageSuivant: 380, // R′ = R × (1 − 24 %), même zone
  remiseRelais: { S: 400, M: 400, L: 600 } as Record<string, number>, // LIV-REM-RELAIS (DP-18, DP-25)
  remiseDomicile: 1000, // LIV-REM-DOM, par colis (DP-19)
  seuilRelais: 30000, // LIV-SEUIL-RELAIS
  seuilDomicile: 50000, // LIV-SEUIL-DOM
}

const RANG: Classe[] = ['S', 'M', 'L', 'XL', 'HG']

export interface SousCommandeFrais {
  boutique: string
  zone: string
  articles: { prix: number; quantite: number; classe: Classe }[]
}

export interface Frais {
  sousTotal: number
  ramassages: { boutique: string; montant: number; partage: boolean }[]
  remises: { boutique: string; montant: number }[]
  offert: number
  total: number
  seuil: number
  manque: number
  progression: number
  interditRelais: string[] // boutiques dont le colis (XL, hors gabarit) ne va pas en relais
}

export const classeColis = (sc: SousCommandeFrais): Classe => sc.articles.reduce<Classe>((m, a) => (RANG.indexOf(a.classe) > RANG.indexOf(m) ? a.classe : m), 'S')

export function calculer(mode: ModeLivraison, sousCommandes: SousCommandeFrais[]): Frais {
  const p = PARAMETRES
  const s = sousCommandes.reduce((t, sc) => t + sc.articles.reduce((u, a) => u + a.prix * a.quantite, 0), 0)
  const vues = new Map<string, number>()
  const ramassages = sousCommandes.map((sc) => {
    const n = vues.get(sc.zone) ?? 0
    vues.set(sc.zone, n + 1)
    return { boutique: sc.boutique, montant: n ? p.ramassageSuivant : p.ramassage, partage: n > 0 }
  })
  const interditRelais = mode === 'relais' ? sousCommandes.filter((sc) => ['XL', 'HG'].includes(classeColis(sc))).map((sc) => sc.boutique) : []
  const remises = sousCommandes.map((sc) => ({ boutique: sc.boutique, montant: mode === 'domicile' ? p.remiseDomicile : (p.remiseRelais[classeColis(sc)] ?? p.remiseRelais.L) }))
  const ram = ramassages.reduce((t, r) => t + r.montant, 0)
  const rem = remises.reduce((t, r) => t + r.montant, 0)
  const seuil = mode === 'relais' ? p.seuilRelais : p.seuilDomicile
  const offert = sousCommandes.length && s >= seuil ? Math.min(p.ramassage + (mode === 'domicile' ? p.remiseDomicile : p.remiseRelais.S), ram + rem) : 0
  return {
    sousTotal: s,
    ramassages,
    remises,
    offert,
    total: s + ram + rem - offert,
    seuil,
    manque: Math.max(seuil - s, 0),
    progression: s >= seuil ? 100 : Math.min(Math.floor((s / seuil) * 100), 99),
    interditRelais,
  }
}
