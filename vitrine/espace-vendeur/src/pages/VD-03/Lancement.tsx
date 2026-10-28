// Lancement de l'app (VD-03 ; DP-56 Q-41 V3 « Ouverture ») : l'adresse d'ouverture de l'application installée. Plus
// d'animation d'ouverture (consigne du porteur, 25 oct. 2026 : l'application ouvre directement son premier écran) :
// l'accueil si la session est ouverte (INS-02 : l'application installée garde la session), sinon la connexion.
import { Navigate } from 'react-router-dom'
import { chemin } from '../../config/pages'
import { useSession } from '../../session'

export default function Lancement() {
  const s = useSession()
  return <Navigate to={s.connecte ? chemin('accueil') : chemin('connexion')} replace />
}
