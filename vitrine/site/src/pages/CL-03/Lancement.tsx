// Adresse « Lancement de l’app » (CL-03) : plus d'écran d'ouverture animé (consigne du porteur, 25 oct. 2026 :
// l'application ouvre directement son premier écran). L'adresse reste valable (liens, application installée) et mène
// aussitôt à l'écran « Ouverture » du parcours d'accueil, qui marque ce parcours comme vu.
import { Navigate } from 'react-router-dom'
import { chemin } from '../../config/pages'

export function Lancement() {
  return <Navigate to={chemin('ouverture')} replace />
}
