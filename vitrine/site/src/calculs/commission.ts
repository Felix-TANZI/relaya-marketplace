// Commission et argent du vendeur (BV-DEV-03 ; R13 à R22) : même calcul que moteurs/belivay_moteurs/v20/commission.py,
// réglages de BV-DEV-07_Donnees.json. Barème par famille et tranches (taux marginaux), +3 points sous 5 000 F, −2 points
// Made in Cameroon, × coefficient du palier, × 0,8 en découverte ; planchers par sous-commande : 700 F, 2 % et, livraison
// offerte, part de BelivaY + max(200 F ; 0,5 %) ; au franc le plus proche ; 1 % retenu sur le versement, au franc supérieur.
import DONNEES from '../../../logique-metier/reference/BV-DEV-v2.0/A_envoyer_aux_developpeurs/BV-DEV-07_Donnees.json'
import { reglage } from './reglages'

interface Tranche { borne_haute: number | null; taux_pct: number }
const C = (DONNEES as unknown as { commission: { familles: Record<string, { tranches: Tranche[] }>; univers: { code: string; famille: string }[]; paliers: { palier: string; multiplicateur: number }[] } }).commission

export interface LigneCommission { prix: number; quantite: number; univers: string; madeInCameroon?: boolean }
export interface ResultatCommission20 { sousTotal: number; bareme: number; commission: number; motif: string; tva: number; net: number; fraisVersement: number; recu: number }

export const familleUnivers = (univers: string) => {
  const u = C.univers.find((x) => x.code === univers)
  if (!u) throw new Error(`univers inconnu : ${univers}`)
  return u.famille
}
export const coefficientPalier = (palier: string) => {
  const p = C.paliers.find((x) => x.palier === palier)
  if (!p) throw new Error(`palier inconnu : ${palier}`)
  return p.multiplicateur
}
// Calcul en centièmes de franc pour rester exact (taux à une décimale × montants entiers).
export function commissionArticle(l: LigneCommission): number {
  if (l.prix < reglage('prix_min_publiable') || l.quantite < 1) throw new Error('prix sous le minimum publiable ou quantité nulle (R19)')
  const points = (l.prix < reglage('petit_prix') ? reglage('pts_petit_prix') : 0) - (l.madeInCameroon ? reglage('pts_mic') : 0)
  let total = 0
  let bas = 0
  for (const t of C.familles[familleUnivers(l.univers)].tranches) {
    const part = (t.borne_haute === null ? l.prix : Math.min(l.prix, t.borne_haute)) - bas
    if (part > 0) total += part * Math.max(0, Math.round((t.taux_pct + points) * 10))
    if (t.borne_haute === null || l.prix <= t.borne_haute) break
    bas = t.borne_haute
  }
  return total / 1000
}
export const fraisVersement = (montant: number) => (montant > 0 ? Math.ceil((montant * Math.round(reglage('versement') * 1e4)) / 1e4 - 1e-9) : 0)
const arrondi = (x: number) => Math.floor(x + 0.5 + 1e-9)

export function commissionSousCommande(lignes: LigneCommission[], palier: string, o: { decouverte?: boolean; couverture?: number } = {}): ResultatCommission20 {
  if (!lignes.length) throw new Error('sous-commande sans article')
  const sousTotal = lignes.reduce((s, l) => s + l.prix * l.quantite, 0)
  let bareme = lignes.reduce((s, l) => s + commissionArticle(l) * l.quantite, 0) * coefficientPalier(palier)
  if (o.decouverte) bareme *= reglage('decouverte')
  bareme = Math.round(bareme * 1e6) / 1e6
  const planchers: [number, string][] = [
    [reglage('com_min'), `minimum de ${reglage('com_min')} F`],
    [sousTotal * reglage('com_taux_min'), '2 % du sous-total'],
  ]
  if (o.couverture) planchers.push([o.couverture + Math.max(reglage('marge_min_f'), sousTotal * reglage('marge_min_part')), 'livraison offerte : part de BelivaY et marge minimale'])
  let [montant, motif] = [bareme, 'barème']
  for (const [v, m] of planchers) if (v > montant + 1e-9) [montant, motif] = [v, m]
  const commission = arrondi(montant)
  const tva = arrondi(commission * reglage('tva'))
  const net = sousTotal - commission - tva
  const frais = fraisVersement(net)
  return { sousTotal, bareme, commission, motif, tva, net, fraisVersement: frais, recu: net - frais }
}
/** R20 : commission d'origine × gardé ÷ sous-total, au franc le plus proche, sans minimum. */
export const commissionApresRemboursement = (c: ResultatCommission20, garde: number) => arrondi((c.commission * garde) / c.sousTotal)
