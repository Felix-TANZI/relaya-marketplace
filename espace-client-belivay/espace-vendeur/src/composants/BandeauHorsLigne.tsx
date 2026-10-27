// Bandeau hors connexion commun à TOUS les écrans (VD04-R14, coque VD-01) : « Pas de connexion. Données de 09 h 14.
// Ce que vous faites partira au retour du réseau. » L'heure est celle notée au passage hors connexion
// (useReseauGlobal, App.tsx) ; les actions gardées en file sont comptées. Monté par <Ecran> en tête du contenu ; un
// écran qui dit plus précisément ce qui attend le réseau (sa propre bannière : .offline-banner ou [data-hors-ligne]) le
// remplace : le bandeau commun n'est alors pas rendu (une seule annonce « status » pour les lecteurs d'écran).
import { useLayoutEffect, useRef, useState } from 'react'
import { useEnLigne, useFile, enAttente } from '../donnees/fileHorsLigne'
import { heure } from '../i18n/temps'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

const PROPRE = '.offline-banner:not(.bandeau-commun), [data-hors-ligne]'

function Contenu() {
  const { t, tf, langue } = usePreferences()
  const file = useFile()
  const repere = useRef<HTMLSpanElement>(null)
  const [remplace, setRemplace] = useState(false)
  useLayoutEffect(() => {
    const main = repere.current?.closest('main')
    if (!main) return
    const voir = () => setRemplace(!!main.querySelector(PROPRE))
    voir()
    const o = new MutationObserver(voir)
    o.observe(main, { childList: true, subtree: true })
    return () => o.disconnect()
  }, [])
  const depuis = file?.horsLigneDepuis ?? null
  const n = enAttente(file).length
  return (
    <>
      <span ref={repere} hidden />
      {!remplace && (
        <div className="offline-banner bandeau-commun" role="status">
          <Icone nom="wifi-off" taille={18} />
          <span>
            <b>{t('Pas de connexion.')}</b>{' '}
            {depuis !== null ? tf('Données de {h}. Ce que vous faites partira au retour du réseau.', { h: heure(depuis, langue) }) : t('Ce que vous faites partira au retour du réseau.')}
            {n > 0 ? ' ' + tf(n > 1 ? '{n} actions en attente d’envoi' : '{n} action en attente d’envoi', { n }) : ''}
          </span>
        </div>
      )}
    </>
  )
}

export function BandeauHorsLigne() {
  return useEnLigne() ? null : <Contenu />
}
