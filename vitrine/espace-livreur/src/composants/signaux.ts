// Sons et vibrations du livreur (sur la route, le téléphone dans un support : on entend et on sent avant de lire). Un signal = une action de la marque sonore BelivaY (marque-sonore.ts, la même dans
// les cinq applications) : son et vibration accordés, réglages « Sons » et « Vibrations » de l'appareil respectés
// (preferences.tsx), jamais sous navigateur piloté (tests), pas de double ni de chevauchement. Les gestes importants
// nomment leur action (signal('remiseReussie'), signal('codeFaux')…) ; les signaux génériques gardent leur nom :
// succès, erreur, alerte, nouveau ; un toucher ne fait jamais de son, seulement une vibration brève.
// Tableau des actions et de leurs sons : logique-metier/SONS.md.
import { reglerVibrations, sonner, vibrer as vibrerSeul, type Action } from './marque-sonore'

export type Signal = 'succes' | 'erreur' | 'alerte' | 'nouveau' | 'toucher' | Action

const GENERIQUES: Record<'succes' | 'erreur' | 'alerte' | 'nouveau', Action> = {
  succes: 'valide',
  erreur: 'erreur',
  alerte: 'attention',
  nouveau: 'nouveauPaquet',
}

/** Réglage « Vibrations » (preferences.tsx). */
export const reglerVibrationsLivreur = reglerVibrations

export function signal(s: Signal) {
  if (s === 'toucher') return vibrerSeul([12])
  sonner(s in GENERIQUES ? GENERIQUES[s as keyof typeof GENERIQUES] : (s as Action))
}
