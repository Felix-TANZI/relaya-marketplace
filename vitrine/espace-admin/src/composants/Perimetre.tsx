// Périmètre du rôle courant, rappelé en tête d'une liste ou d'un export (ADM-ROL-03 : un agent Opérations ne voit que
// ses zones, exports compris) : rien n'est affiché pour un rôle sans périmètre de zone.
import { usePreferences } from '../preferences'
import { useDroit, usePerimetre } from '../session'
import { Note } from './prototype'

export function Perimetre({ route }: { route: string }) {
  const { t, tf } = usePreferences()
  const zones = usePerimetre()
  const d = useDroit(route)
  if (!zones && d.acces !== 'part' && d.acces !== 'lecture') return null
  return (
    <Note ton="ink" icone={zones ? 'map-pinned' : d.acces === 'lecture' ? 'eye' : 'shield-check'} className="e-perimetre">
      {zones && tf('Votre périmètre : {zones}. Les listes et les exports s’y limitent.', { zones: zones.join(', ') })}
      {zones && d.note ? ' ' : ''}
      {d.acces === 'lecture' && !zones && t('Lecture seule : aucun geste sur cette page pour votre rôle.')}
      {d.note && <span>{tf('Votre droit ici : {note}.', { note: t(d.note) })}</span>}
    </Note>
  )
}
