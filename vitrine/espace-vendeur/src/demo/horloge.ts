// DONNÉES DE DÉMONSTRATION — l'heure de la démonstration : mardi 13 octobre 2026 à 09 h 48 (Yaoundé), le jour commun
// aux cinq applications. Le jeu d'essai du paquet vendeur (VD-02 p2, V01), écrit pour le lundi 21 septembre, a été
// décalé de 22 jours d'un bloc (site/outils/decaler-dates.mjs) : les délais entre les dates restent les mêmes. La
// démonstration part de ce moment et avance au rythme réel depuis la première visite de l'onglet. Une horloge réglée
// sur ce jour même (tests, horloge figée) est prise telle quelle. L'API utilisera l'heure du serveur.
import { yaounde } from '../calculs/temps'

export const REFERENCE = yaounde(2026, 10, 13, 9, 48)
const CLE = 'blv_v_demo_debut'

export function maintenant(): number {
  const reel = Date.now()
  if (reel >= REFERENCE - 3600 * 1000 && reel < REFERENCE + 24 * 3600 * 1000) return reel
  try {
    let debut = Number(sessionStorage.getItem(CLE))
    if (!debut) {
      debut = reel
      sessionStorage.setItem(CLE, String(debut))
    }
    return REFERENCE + (reel - debut)
  } catch {
    return REFERENCE
  }
}
