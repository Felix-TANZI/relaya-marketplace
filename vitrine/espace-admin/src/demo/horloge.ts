// DONNÉES DE DÉMONSTRATION — l'heure de la démonstration de la console : le mardi 13 octobre 2026 à 14 h 05 (Yaoundé),
// même jour et même heure que l'entreprise et le livreur. La démonstration part de ce moment et avance au rythme réel
// depuis la première visite (heure de départ partagée sur l'appareil avec l'entreprise et le livreur, src/demo/pont.ts). Une horloge réglée sur ce jour même (tests,
// horloge figée) est prise telle quelle. L'API donnera l'heure du serveur.
import { HEURE, yaounde } from '../calculs/temps'
import { debutPartage } from './pont'

export const REFERENCE = yaounde(2026, 10, 13, 14, 5)

export function maintenant(): number {
  const reel = Date.now()
  // Une horloge déjà réglée sur la journée de démonstration (tests, horloge figée) est prise telle quelle.
  if (reel >= REFERENCE - 15 * HEURE && reel < REFERENCE + 10 * HEURE) return reel
  return REFERENCE + (reel - debutPartage(reel))
}
