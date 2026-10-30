// Bandeau hors connexion commun à TOUS les écrans (OFF-01 à OFF-03) : « Hors ligne. Données de 14 h 05. Vos
// opérations partiront au retour du réseau. 2 opérations en attente d'envoi. » Réception, remise, dépôt de retour,
// sortie et constat continuent hors ligne (file horodatée, rejouée au retour du réseau) ; le paiement Mobile Money au
// comptoir exige le réseau (OFF-02). L'heure est celle notée au passage hors connexion (useReseauGlobal, App.tsx).
// Un écran qui dit plus précisément ce qui attend le réseau (élément [data-hors-ligne]) le remplace : une seule annonce
// « status » pour les lecteurs d'écran. L'observateur ne fait que lire le contenu et poser un booléen : React ignore une
// valeur inchangée, il ne peut jamais se relancer sans fin (aucune écriture dans le DOM observé).
import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chemin } from '../config/pages'
import { enAttente, useEnLigne, useFile } from '../donnees/fileHorsLigne'
import { heure } from '../i18n/temps'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

function Contenu() {
  const { t, tf, langue } = usePreferences()
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
  const depuis = file?.horsLigneDepuis ?? null
  const n = enAttente(file).length
  return (
    <>
      <span ref={repere} hidden />
      {!remplace && (
        <Link className="r-horsligne" role="status" to={chemin('accueil', { etat: 'hors-ligne' })}>
          <Icone nom="r-reseau" taille={20} />
          <span>
            <b>{t('Hors ligne.')}</b> {depuis !== null ? tf('Données de {h}. Vos opérations partiront au retour du réseau.', { h: heure(depuis, langue) }) : t('Vos opérations partiront au retour du réseau.')}
            {n > 0 ? ' ' + (n > 1 ? tf('{n} opérations en attente d’envoi', { n }) : t('1 opération en attente d’envoi')) : ''}
          </span>
        </Link>
      )}
    </>
  )
}

export function BandeauHorsLigne() {
  return useEnLigne() ? null : <Contenu />
}
