// Panier famille (CL-15 ; EX-05) : le calcul, lu par les écrans et la source : 5 kg au plus par article ; le colis
// prend la classe de son poids (S ≤ 5 kg, M ≤ 15 kg, L ≤ 30 kg ; au-delà, jamais en XL : le panier se partage) ;
// la livraison suit le moteur (retrait offert dès 30 000 F ; la remise d'un colis L reste due).
import { calculer, PARAMETRES, type Classe } from './frais'
import type { ArticleFamille } from './source'

export const FAMILLE = { poidsArticle: 5, poidsMax: 30, fraisCarte: 0.02 }
export function calculFamille(catalogue: ArticleFamille[], lignes: { id: string; qte: number }[]) {
  const l = lignes.map((x) => ({ a: catalogue.find((y) => y.id === x.id)!, qte: x.qte })).filter((x) => x.a && x.qte > 0)
  const sousTotal = l.reduce((n, x) => n + x.a.prix * x.qte, 0)
  const poids = Math.round(l.reduce((n, x) => n + x.a.poids * x.qte, 0) * 10) / 10
  const classe: Classe = poids <= 5 ? 'S' : poids <= 15 ? 'M' : 'L'
  const f = calculer('relais', [{ boutique: 'Boutique G', zone: 'Mvan', articles: [{ prix: sousTotal, quantite: 1, classe }] }])
  const livraison = f.total - f.sousTotal
  const supplement = f.offert ? Math.max(0, (PARAMETRES.remiseRelais[classe] ?? 0) - PARAMETRES.remiseRelais.S) : 0
  return { lignes: l, sousTotal, poids, classe, livraison, supplement, offert: f.offert > 0, montantOffert: f.offert, tropLourd: poids > FAMILLE.poidsMax, total: sousTotal + livraison }
}
