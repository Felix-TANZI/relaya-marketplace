// Lien vers le poste de décision d'un genre (même modèle que les litiges : preuves, suggestion, issues permises,
// plafonds, transmission, journal), posé dans les actions des pages qui tiennent ces dossiers.
import { Link } from 'react-router-dom'
import { chemin } from '../../config/pages'
import type { GenreDossier } from '../../donnees/domaines/decisions'
import { usePreferences } from '../../preferences'
import { useRouteOuverte } from '../../session'
import { Icone } from '../Icone'

export function LienPoste({ genre }: { genre: GenreDossier }) {
  const { t } = usePreferences()
  const ouverte = useRouteOuverte()
  if (!ouverte('postes')) return null
  return (
    <Link className="btn secondary" to={chemin('postes', { genre })}>
      <Icone nom="clipboard-check" taille={18} />
      <span>{t('Poste de décision')}</span>
    </Link>
  )
}
