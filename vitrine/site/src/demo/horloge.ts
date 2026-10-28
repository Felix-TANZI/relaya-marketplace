// DONNÉES DE DÉMONSTRATION — l'heure de la démonstration : mardi 13 octobre 2026, 10 h 15 à Yaoundé, le jour commun
// aux cinq applications (vendeur, entreprise, livreur, relais). Le jeu d'essai de CL-02, écrit pour le jeudi
// 24 septembre, a été décalé de 19 jours d'un bloc (outils/decaler-dates.mjs : « retirée jeu. 8 oct. », « notable
// jusqu'au jeu. 15 oct. ») : les délais entre les dates restent les mêmes. La démonstration avance au rythme réel
// depuis la première visite de l'onglet ; tout ce qui dépend du temps (fenêtre d'avis, recharge de 72 h, garde,
// codes) reste cohérent avec les données. L'API utilisera l'heure du serveur.
export const REFERENCE = Date.UTC(2026, 9, 13, 9, 15)

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
