// DONNÉES DE DÉMONSTRATION — l'heure de la démonstration. La journée du relais se passe le mardi 13 octobre 2026 à
// 14 h 05 à Yaoundé, le même jour et la même heure que l'espace livreur et l'espace entreprise : un lot affecté par
// Yafé Express, le trajet de Serge A. et la réception au comptoir se lisent au même instant. La démonstration part de
// ce moment et avance au rythme réel depuis la première visite (heure de départ partagée, src/demo/pont.ts). Une
// horloge déjà réglée sur ce jour (tests, horloge figée) est prise telle quelle.
import { HEURE, jourDe, yaounde } from '../calculs/temps'
import { brancherHorloge } from '../calculs/garde'
import { debutPartage } from './pont'

export const REFERENCE = yaounde(2026, 10, 13, 14, 5)

export function maintenant(): number {
  const reel = Date.now()
  if (reel >= REFERENCE - 15 * HEURE && reel < REFERENCE + 10 * HEURE) return reel
  return REFERENCE + (reel - debutPartage(reel))
}
export const aujourdhui = () => jourDe(maintenant())

// La garde (calculs/garde.ts, tranches de 24 h) lit « aujourd'hui » à l'heure de la démonstration.
brancherHorloge(maintenant)
