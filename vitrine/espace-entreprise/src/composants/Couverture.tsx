// Photo de couverture de l'entreprise (bandeau 3:1, recadrée, 450 Ko au plus) : le propriétaire la choisit, la change
// ou la retire depuis le Profil. Elle s'affiche derrière la carte de l'entreprise (barre latérale, Profil), sous un
// voile sombre qui garde l'en-tête à design lisible. Démonstration : src/donnees/mon-compte.ts.
import { useState } from 'react'
import { changerCouverture, useCouverture } from '../donnees/mon-compte'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'
import { useChoixPhoto } from './MonCompte'

export function Couverture({ entreprise }: { entreprise: string }) {
  const { t } = usePreferences()
  const photo = useCouverture(entreprise)
  const [info, setInfo] = useState<string | null>(null)
  const choix = useChoixPhoto('couverture', (p) => void changerCouverture(entreprise, p).then(() => setInfo(t('Photo de couverture enregistrée.'))), setInfo)
  return (
    <div className="card mt10 mc-couv">
      {choix.feuille}
      <div className="mc-k">{t('Photo de couverture de l’entreprise')}</div>
      {photo ? <img className="mc-couv-img" src={photo} alt={t('Photo de couverture de l’entreprise')} /> : <p className="t13 c3">{t('Aucune photo : la carte de l’entreprise garde son fond vert.')}</p>}
      <div className="mc-btns">
        {choix.bouton(photo ? 'Changer la couverture' : 'Ajouter une couverture', 'secondary sm', 'image')}
        {photo && (
          <button type="button" className="btn ghost sm" onClick={() => void changerCouverture(entreprise, null).then(() => setInfo(t('Photo de couverture retirée.')))}>
            <Icone nom="trash-2" taille={16} />
            <span>{t('Retirer la couverture')}</span>
          </button>
        )}
      </div>
      {info && (
        <p className="mc-info" role="status">
          <Icone nom="circle-check" taille={16} />
          {info}
        </p>
      )}
    </div>
  )
}
