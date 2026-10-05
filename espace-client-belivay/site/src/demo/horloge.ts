// DONNÉES DE DÉMONSTRATION — l'heure de la démonstration. Le jeu d'essai de CL-02 se passe le jeudi 24 septembre
// 2026 (« retirée sam. 19 sept. », « notable jusqu'au sam. 26 sept. ») : la démonstration part de ce moment,
// 10 h 15 à Yaoundé, et avance au rythme réel depuis la première visite de l'onglet. Ainsi tout ce qui dépend
// du temps (fenêtre d'avis, recharge de 72 h, garde, codes) reste cohérent avec les données. L'API utilisera
// l'heure du serveur.
export const REFERENCE = Date.UTC(2026, 8, 24, 9, 15)

const CLE = 'blv_demo_debut'

export function maintenant(): number {
  // Une horloge réglée sur le jour même du jeu d'essai (tests au pixel, horloge figée) est prise telle quelle.
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
