// « Ce lien ne mène à aucune page » (comme le client et le vendeur) : adresse inconnue, dans la coque (navigation
// disponible), avec un retour au tableau de bord.
import { Link } from 'react-router-dom'
import { Ecran } from '../composants/coque'
import { Icone } from '../composants/Icone'
import { ACCUEIL, chemin } from '../config/pages'
import { usePreferences } from '../preferences'

export function Introuvable() {
  const { t } = usePreferences()
  return (
    <Ecran route="introuvable" titre={t('Ce lien ne mène à aucune page')}>
      <div className="vide">
        <div className="ei">
          <Icone nom="search-x" taille={26} />
        </div>
        <h2>{t('Ce lien ne mène à aucune page')}</h2>
        <p>{t('Cet écran n’existe pas, ou plus. Revenez à votre page d’accueil de la console.')}</p>
        <Link className="btn primary mt16" to={chemin(ACCUEIL)}>
          <Icone nom="house" taille={18} />
          <span>{t('Accueil de la console')}</span>
        </Link>
      </div>
    </Ecran>
  )
}
