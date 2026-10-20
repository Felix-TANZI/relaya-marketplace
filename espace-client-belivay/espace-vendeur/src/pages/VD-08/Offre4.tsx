// Ancienne étape 4 (récapitulatif) (VD-08, route « offre4 ») : n'a plus d'écran propre depuis DP-58. « Nouveau produit » tient sur une seule
// page (offre1 : produit, photos réelles, prix et stock, publier), comme l'interface réelle du vendeur. Les anciennes
// adresses (liens gardés, notifications, favoris) mènent au même brouillon : « ?b= » est gardé, « ?q= » aussi.
import { Navigate, useSearchParams } from 'react-router-dom'
import { chemin } from '../../config/pages'

export default function Redirection() {
  const [params] = useSearchParams()
  const b = params.get('b') ?? params.get('o')
  const q = params.get('q')
  return <Navigate replace to={chemin('offre1', b ? { b } : q ? { q } : {})} />
}
