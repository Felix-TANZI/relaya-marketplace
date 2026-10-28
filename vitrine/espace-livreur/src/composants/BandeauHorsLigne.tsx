// Pastille hors réseau commune à TOUS les écrans (LIV-P22), discrète : « Hors réseau — vos actions sont gardées »,
// avec le nombre de gestes en file ; elle mène à la synchronisation. La file part toute seule au retour du réseau
// (useReseauGlobal, App.tsx). Batterie faible : pastille « mode sobre » (batterie.ts). Un écran qui dit plus précisément ce qui attend le réseau (élément
// [data-hors-ligne]) le remplace : une seule annonce « status » pour les lecteurs d'écran.
import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chemin } from '../config/pages'
import { enAttente, useEnLigne, useFile } from '../donnees/fileHorsLigne'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'
import { useBatterieFaible } from './batterie'
import './livraison/terrain.css'

function Contenu({ horsLigne, batterie }: { horsLigne: boolean; batterie: boolean }) {
  const { t, tf } = usePreferences()
  const file = useFile()
  const repere = useRef<HTMLSpanElement>(null)
  const [remplace, setRemplace] = useState(false)
  useLayoutEffect(() => {
    const main = repere.current?.closest('main')
    if (!main) return
    const voir = () => setRemplace(!!main.querySelector('[data-hors-ligne]'))
    voir()
    const o = new MutationObserver(voir)
    o.observe(main, { childList: true, subtree: true })
    return () => o.disconnect()
  }, [])
  const n = enAttente(file).length
  return (
    <>
      <span ref={repere} hidden />
      {((horsLigne && !remplace) || batterie) && (
        <div className="lvt-etats">
          {horsLigne && !remplace && (
            <Link className="lvt-etat l-horsligne-p" role="status" to={chemin('synchronisation')}>
              <Icone nom="cloud-off" taille={16} />
              <span>
                {t('Hors réseau — vos actions sont gardées')}
                {n > 0 ? ' · ' + (n > 1 ? tf('{n} en attente', { n }) : t('1 en attente')) : ''}
              </span>
            </Link>
          )}
          {batterie && (
            <span className="lvt-etat batterie" role="status">
              <Icone nom="battery-low" taille={16} />
              <span>{t('Batterie faible — mode sobre')}</span>
            </span>
          )}
        </div>
      )}
    </>
  )
}

/** Pastilles discrètes, détectées sans bouton : hors réseau (la file est rejouée seule au retour) et batterie faible. */
export function BandeauHorsLigne() {
  const enLigne = useEnLigne()
  const batterie = useBatterieFaible()
  return enLigne && !batterie ? null : <Contenu horsLigne={!enLigne} batterie={batterie} />
}
