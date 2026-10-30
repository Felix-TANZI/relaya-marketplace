// « Ce lien ne mène à aucune page » (comme le client et le vendeur) : adresse inconnue ; la barre du bas reste, pour
// repartir d'un geste.
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarreDuBas } from '../composants/coque'
import { Icone } from '../composants/Icone'
import { ACCUEIL, chemin } from '../config/pages'
import { usePreferences } from '../preferences'

export function Introuvable() {
  const { t } = usePreferences()
  useEffect(() => {
    document.title = t('BelivaY livreur') + ' — ' + t('Ce lien ne mène à aucune page')
  }, [t])
  return (
    <div id="app" className="l-app a-barre">
      <main className="l-main l-seul">
        <div className="l-vide">
          <div className="l-vide-i">
            <Icone nom="link-2-off" taille={28} />
          </div>
          <h1>{t('Ce lien ne mène à aucune page')}</h1>
          <p>{t('Cet écran n’existe pas, ou plus. Revenez à votre journée.')}</p>
        </div>
        <Link className="l-btn l-principal" to={chemin(ACCUEIL)}>
          <Icone nom="house" taille={20} />
          <span>{t('Revenir à ma journée')}</span>
        </Link>
      </main>
      <BarreDuBas actif={null} />
    </div>
  )
}
