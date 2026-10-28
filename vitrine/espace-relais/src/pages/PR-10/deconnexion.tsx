// « Se déconnecter » (Menu et Paramètres) : feuille de confirmation qui dit ce qui reste en file d'envoi (rien ne se
// perd : la file reste chiffrée sur ce téléphone et repart à la reconnexion, OFF-05), puis retour à la connexion.
import { useNavigate } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { enAttente, useFile } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'

export function useDeconnexion() {
  return useFeuille('deconnexion')
}

export function FeuilleDeconnexion() {
  const { t, tf } = usePreferences()
  const f = useDeconnexion()
  const file = useFile()
  const naviguer = useNavigate()
  const n = enAttente(file).length
  const sortir = async () => {
    await source.session.deconnecter()
    naviguer(chemin('connexion'), { replace: true })
  }
  return (
    <Feuille ouverte={f.ouverte} fermer={f.fermer} titre={t('Se déconnecter')} classe="p10-feuille">
      <h2>{t('Se déconnecter ?')}</h2>
      <div className="p10-col">
        <p className="p-81u2s6 p10-txt">{t('À la prochaine ouverture, votre numéro puis votre code PIN personnel. Chaque geste reste signé de votre nom.')}</p>
        {n > 0 && (
          <div className="p-fht1zk" role="status">
            <Icone nom="r-reseau" taille={18} />
            <div>{n > 1 ? tf('{n} opérations attendent encore le réseau : elles restent sur ce téléphone et partiront à votre reconnexion.', { n }) : t('1 opération attend encore le réseau : elle reste sur ce téléphone et partira à votre reconnexion.')}</div>
          </div>
        )}
        <button type="button" className="p-ui2zy9" onClick={() => void sortir()}>
          <Icone nom="r-entrer" taille={18} />
          {t('Se déconnecter')}
        </button>
        <button type="button" className="p-rbzobc" onClick={f.fermer}>
          {t('Annuler')}
        </button>
      </div>
    </Feuille>
  )
}
