// « Vous gardez » selon BV-DEV v2.0 (DP-69) : un seul calcul pour tout l'espace vendeur de démonstration, celui des
// moteurs v2.0 (site/src/calculs/commission.ts = moteurs/belivay_moteurs/v20/commission.py). Barème par famille et
// tranches, palier, découverte, planchers R14 (700 F, 2 %) ; gardé = sous-total − commission − TVA. Le 1 % Mobile
// Money est retenu une fois, sur le versement du vendredi (R22), jamais vente par vente.
import { commissionSousCommande, fraisVersement, type ResultatCommission20 } from '@client/calculs'
import type { LigneVendue } from '../calculs/commission'

// Familles A à E, mêmes lettres en v1 et v2.0 : un univers représentatif par famille.
const UNIVERS: Record<string, string> = { A: 'TEL', B: 'MOD', C: 'SUP', D: 'MAI', E: 'LIV' }

export interface Garde20 extends ResultatCommission20 {
  garde: number
  plancherApplique: boolean
}

/** Même appel que calculerCommission (v1), calculé par le moteur v2.0. Le 4e argument (paramètres v1) est ignoré. */
export function calculerCommission20(lignes: LigneVendue[], palier: string, decouverte: boolean, _p?: unknown): Garde20 {
  const r = commissionSousCommande(
    lignes.map((l) => ({ prix: l.prixUnitaire, quantite: l.quantite ?? 1, univers: UNIVERS[l.famille] ?? 'TEL', madeInCameroon: !!l.madeInCameroon })),
    palier,
    { decouverte },
  )
  return { ...r, garde: r.net, plancherApplique: r.motif !== 'barème' }
}

/** Détail d'un versement (R22) : ventes, commission, TVA, 1 % Mobile Money sur le total, net reçu. */
export function detailVersement(ventes: { sousTotal: number; commission: number; tva: number }[]) {
  const sousTotal = ventes.reduce((s, v) => s + v.sousTotal, 0)
  const commission = ventes.reduce((s, v) => s + v.commission, 0)
  const tva = ventes.reduce((s, v) => s + v.tva, 0)
  const avantFrais = sousTotal - commission - tva
  const frais = fraisVersement(avantFrais)
  return { ventes: ventes.length, sousTotal, commission, tva, avantFrais, frais, net: avantFrais - frais }
}
