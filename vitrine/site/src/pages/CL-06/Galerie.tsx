// Ancienne galerie plein écran supprimée (consigne du porteur, 13 oct. 2026) : les photos se voient sur la fiche.
// Une ancienne adresse /galerie ramène à la fiche du produit.
import { Navigate, useSearchParams } from 'react-router-dom'
import { chemin } from '../../config/pages'

export function Galerie() {
  const [q] = useSearchParams()
  const p = q.get('p')
  return <Navigate to={p ? chemin('fiche', { p }) : chemin('accueil')} replace />
}
