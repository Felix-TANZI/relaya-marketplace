// Bandeau de panne (ADM-P28, S5) : la console est la sixième application ; une panne déclarée s'y affiche comme dans
// les cinq autres espaces, en tête du contenu de toutes les pages, avec le service, les zones et l'état (mode papier,
// rétablie en attente de clôture). Il mène à la page Panne pour les rôles qui l'ouvrent.
import { Link } from 'react-router-dom'
import { chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { useRouteOuverte, useSession } from '../session'
import { Icone } from './Icone'

export function BandeauPanne() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const ouverte = useRouteOuverte()
  const p = s.panne
  if (!s.connecte || !p) return null
  const etat = p.etat === 'papier' ? t('mode papier en cours') : p.etat === 'retabli' ? t('service rétabli, ressaisie en cours') : t('panne déclarée')
  return (
    <div className={'bandeau ' + (p.etat === 'retabli' ? 'ambre' : 'rouge')} role="region" aria-label={t('Panne en cours')}>
      <Icone nom="siren" taille={18} />
      <span className="grow">{tf('{service} · {etat} · zones {zones}', { service: p.service, etat, zones: p.zones.join(', ') })}</span>
      {ouverte('panne') && (
        <Link className="bd-lien" to={chemin('panne', { id: p.id })}>
          {t('Voir la panne')}
        </Link>
      )}
    </div>
  )
}
