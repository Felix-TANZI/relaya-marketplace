// Reprise d'un ancien téléphone (CL-15 ; EX-04 ; DP-54) : un reconditionneur partenaire estime et paie la reprise
// (BelivaY n'achète rien). L'estimation part de la cote du modèle et de l'état déclaré ; le minimum est 78 % du
// maximum ; la valeur exacte est confirmée à l'inspection (48 h au plus) : dans la fourchette, on paie la
// différence ; un écart avec l'état déclaré donne une contre-offre (accepter, ou récupérer son téléphone, rendu
// gratuitement au relais). Compte Google et code de verrouillage retirés, sinon pas de reprise ; IMEI vérifié au
// dépôt, téléphone signalé volé refusé.
export const MODELES_REPRISE: { id: string; nom: string; cote: number }[] = [
  { id: 'camon20', nom: 'Tecno Camon 20 · 128 Go', cote: 41000 },
  { id: 'spark10', nom: 'Tecno Spark 10 · 64 Go', cote: 24000 },
  { id: 'a14', nom: 'Samsung Galaxy A14 · 64 Go', cote: 33000 },
  { id: 'itelp40', nom: 'itel P40 · 64 Go', cote: 15000 },
  { id: 'redmi12', nom: 'Xiaomi Redmi 12 · 128 Go', cote: 38000 },
]
export interface EtatDeclare {
  allume: boolean
  ecran: 'intact' | 'rayures' | 'fissure'
  batterie: boolean
  coque: 'bon' | 'abimee'
  compteRetire: boolean
  codeRetire: boolean
}
export function estimer(modele: string, e: EtatDeclare): { min: number; max: number } | null {
  const m = MODELES_REPRISE.find((x) => x.id === modele)
  if (!m || !e.compteRetire || !e.codeRetire) return null
  let v = m.cote
  if (!e.allume) v *= 0.4
  if (e.ecran === 'rayures') v *= 0.9
  if (e.ecran === 'fissure') v *= 0.7
  if (!e.batterie) v *= 0.85
  if (e.coque === 'abimee') v *= 0.95
  const max = Math.round(v / 500) * 500
  return { min: Math.round((max * 0.78) / 500) * 500, max }
}
