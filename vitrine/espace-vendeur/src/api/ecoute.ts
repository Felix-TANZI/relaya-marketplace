// Mode API : ce que font les autres interfaces (le client paie, le livreur saisit le code, le relais remet le colis, la
// console décide) arrive par le flux GET /api/vendors/events?depuis= (connecteur echanges.evenements). Le site le lit
// toutes les 15 secondes, au retour du réseau et quand l'onglet revient au premier plan ; un événement nouveau fait
// relire les écrans (blv:donnees), comme le pont de la démonstration. Au démarrage, le curseur avance jusqu'au dernier
// événement sans rien relire (les écrans viennent d'être lus).
import { clientDeLEnvironnement } from '@client/api/client'
import { prevenir } from './outils'
import { sourcePages } from './pages/source'

const PERIODE_MS = 15_000
const PAGES_MAX = 20 // une page = 100 événements au plus (vendeur_core.echanges.LIMITE)

/** Démarre l'écoute ; rend la fonction qui l'arrête. */
export function ecouterEvenements(): () => void {
  const api = clientDeLEnvironnement()
  if (!api || typeof window === 'undefined') return () => undefined
  const echanges = sourcePages(api).echanges
  let curseur: string | null = null
  let fini = false
  let enCours = false
  const lire = async (premier: boolean) => {
    if (fini || enCours || (typeof navigator !== 'undefined' && navigator.onLine === false)) return
    enCours = true
    try {
      let nouveaux = 0
      for (let i = 0; i < PAGES_MAX && !fini; i++) {
        const r = await echanges.evenements(curseur)
        const avance = r.curseur !== curseur
        curseur = r.curseur
        nouveaux += r.evenements.length
        if (!r.evenements.length || !avance) break
      }
      if (!premier && nouveaux > 0) prevenir('evenements')
    } catch {
      /* réseau ou session : nouvel essai au prochain passage */
    } finally {
      enCours = false
    }
  }
  void lire(true)
  const minuterie = window.setInterval(() => void lire(false), PERIODE_MS)
  const auRetour = () => void lire(false)
  const visible = () => document.visibilityState === 'visible' && auRetour()
  window.addEventListener('online', auRetour)
  document.addEventListener('visibilitychange', visible)
  return () => {
    fini = true
    window.clearInterval(minuterie)
    window.removeEventListener('online', auRetour)
    document.removeEventListener('visibilitychange', visible)
  }
}
