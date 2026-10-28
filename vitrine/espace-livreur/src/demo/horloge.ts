// DONNÉES DE DÉMONSTRATION — l'heure de la démonstration. La journée du livreur se passe le mardi 13 octobre 2026 à
// 14 h 05 à Yaoundé, le même jour et la même heure que l'espace entreprise (Yafé Express, pilote jour 2) : une mission
// affectée par l'entreprise et les gestes du livreur se lisent dans les deux applications au même instant. La
// démonstration part de ce moment et avance au rythme réel depuis la première visite (heure de départ partagée par les
// deux applications sur l'appareil, src/demo/pont.ts). Une horloge réglée sur ce jour même (tests) est prise telle quelle.
import { HEURE, yaounde } from '../calculs/temps'
import { debutPartage } from './pont'

export const REFERENCE = yaounde(2026, 10, 13, 14, 5)

export function maintenant(): number {
  const reel = Date.now()
  // Une horloge déjà réglée sur la journée de démonstration (tests, horloge figée) est prise telle quelle.
  if (reel >= REFERENCE - 15 * HEURE && reel < REFERENCE + 10 * HEURE) return reel
  return REFERENCE + (reel - debutPartage(reel))
}
