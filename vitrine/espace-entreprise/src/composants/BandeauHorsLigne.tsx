// Bandeau hors connexion (ENT-01-R17 : données déjà affichées conservées, heure des dernières données) : posé par la
// coque en tête du contenu de toutes les pages, avec le NOMBRE de gestes gardés dans la file hors connexion (M8 ;
// leur détail, « Envoyer maintenant » et « Retirer » : FileEnAttente, posée une fois par la coque juste dessous).
import { useEffect, useState } from 'react'
import { useFile } from '../donnees/fileHorsLigne'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

export function BandeauHorsLigne() {
  const { t, tf, langue } = usePreferences()
  const file = useFile()
  const [depuis, setDepuis] = useState<number | null>(() => (typeof navigator !== 'undefined' && navigator.onLine === false ? Date.now() : null))
  useEffect(() => {
    const hors = () => setDepuis(Date.now())
    const en = () => setDepuis(null)
    window.addEventListener('offline', hors)
    window.addEventListener('online', en)
    return () => (window.removeEventListener('offline', hors), window.removeEventListener('online', en))
  }, [])
  if (depuis === null) return null
  const heure = new Date(depuis).toLocaleTimeString(langue === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala' })
  return (
    <div className="bandeau ambre" role="status">
      <Icone nom="wifi-off" taille={18} />
      <span className="grow">
        {`${t('Hors connexion')} · ${tf('données de {h}', { h: heure })}`}
        {file.gestes.length > 0 && ` · ${tf('{n} geste(s) en attente d’envoi', { n: file.gestes.length })}`}
      </span>
    </div>
  )
}
