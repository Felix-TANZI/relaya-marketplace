// « Ce lien ne mène à aucune page » (comme le client, CCH-19) : adresse inconnue ; et « Écran retiré » : écran du
// prototype qui n'était qu'une démonstration (île, téléphone, écran verrouillé, Android : PLAN-VENDEUR.md, règle 3).
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarreDuBas } from '../composants/coque'
import { Icone } from '../composants/Icone'
import { chemin } from '../config/pages'
import { usePreferences } from '../preferences'

export function Introuvable({ retire = false }: { retire?: boolean }) {
  const { t } = usePreferences()
  const titre = retire ? 'Écran retiré' : 'Ce lien ne mène à aucune page'
  useEffect(() => {
    document.title = t('BelivaY vendeur') + ' — ' + t(titre)
  }, [t, titre])
  return (
    <div id="app">
      <main style={{ paddingTop: 'calc(var(--sb) + 48px)' }}>
        <div className="empty">
          <div className="ei">
            <Icone nom={retire ? 'eye-off' : 'link-2-off'} taille={26} />
          </div>
          <h3>{t(titre)}</h3>
          <p>{t(retire ? 'Cet écran du prototype était une démonstration : il n’existe pas dans l’espace vendeur.' : 'Cet écran n’existe pas, ou plus. Revenez à l’accueil de votre espace vendeur.')}</p>
          <Link className="btn primary" to={chemin('accueil')}>
            <Icone nom="house" taille={18} />
            <span>{t('Retour à l’accueil')}</span>
          </Link>
        </div>
      </main>
      <BarreDuBas actif={null} />
    </div>
  )
}
