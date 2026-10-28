// Mise de côté (CL-15 ; EX-03 ; DP-54) : réserver un article avec un acompte, puis payer en plusieurs fois, sans
// intérêts ni frais ; ce n'est pas un crédit : rien n'est remis avant le dernier versement. Règles :
// - dès 20 000 F de prix livré ; acompte de 20 % au moins (arrondi au franc supérieur) ;
// - versements toutes les 2 semaines ou chaque mois, 10 000 F au moins chacun, fin dans 60 jours au plus ;
//   le dernier absorbe l'arrondi ; le total égale le prix livré ;
// - rappel 2 jours avant chaque échéance, puis le jour même ; 7 jours de grâce, sans frais ;
// - annulation (ou grâce dépassée) : les versements reviennent, moins un forfait de 5 % du prix, 5 000 F au plus,
//   qui revient au vendeur qui a gardé l'article.
export const COTE = { minimum: 20000, acompte: 0.2, versementMin: 10000, joursMax: 60, grace: 7, forfait: 0.05, forfaitMax: 5000, avantRentree: 7 }
export type Rythme = '2sem' | 'mois'
const J = 864e5

export function planCote(prixLivre: number, rythme: Rythme, debut: number, jours: number = COTE.joursMax): { du: number; le: number }[] {
  const acompte = Math.ceil(prixLivre * COTE.acompte)
  const reste = prixLivre - acompte
  const pas = rythme === '2sem' ? 14 : 30
  const nMax = Math.floor(Math.min(COTE.joursMax, jours) / pas)
  const n = Math.max(1, Math.min(nMax, Math.floor(reste / COTE.versementMin)))
  const part = Math.ceil(reste / n)
  const v = [{ du: acompte, le: debut }]
  for (let i = 1; i <= n; i++) v.push({ du: i < n ? part : reste - part * (n - 1), le: debut + i * pas * J })
  return v
}
export const forfaitCote = (prixLivre: number) => Math.min(COTE.forfaitMax, Math.round(prixLivre * COTE.forfait))

// Liste de rentrée entière (CRS-16, RNT-08) : la liste compte comme un seul achat (20 000 F au moins sur son total) ;
// le dernier versement tombe 7 jours au moins avant la rentrée, le temps que la commande groupée arrive au relais ;
// toujours 60 jours au plus. Trop près de la rentrée pour un seul versement de ce rythme : null (payer en une fois).
export function planCoteRentree(prixLivre: number, rythme: Rythme, debut: number, rentreeLe: number): { du: number; le: number }[] | null {
  if (prixLivre < COTE.minimum) return null
  const jours = Math.floor((rentreeLe - COTE.avantRentree * J - debut) / J)
  if (jours < (rythme === '2sem' ? 14 : 30)) return null
  return planCote(prixLivre, rythme, debut, jours)
}
