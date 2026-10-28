// « Ce lien ne mène à aucune page » (comme le client, le vendeur et le livreur) : adresse inconnue ; la barre du bas reste, pour
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
    document.title = t('BelivaY Point relais') + ' — ' + t('Ce lien ne mène à aucune page')
  }, [t])
  return (
    <div id="app" className="r-app a-barre">
      <main className="r-main r-seul">
        <div className="r-vide">
          <div className="r-vide-i">
            <Icone nom="link-2-off" taille={28} />
          </div>
          <h1>{t('Ce lien ne mène à aucune page')}</h1>
          <p>{t('Cet écran n’existe pas, ou plus. Revenez au guichet.')}</p>
        </div>
        <Link className="r-btn r-principal" to={chemin(ACCUEIL)}>
          <Icone nom="r-grille" taille={20} />
          <span>{t('Revenir au guichet')}</span>
        </Link>
      </main>
      <BarreDuBas actif={null} />
    </div>
  )
}
