// Lancement de l'app (VD-03 ; DP-56 Q-41 V3 « Ouverture ») : l'adresse d'ouverture de l'application installée.
// L'animation d'ouverture « BelivaY · Espace vendeur » (2 s), puis l'accueil si la session est ouverte (INS-02 :
// l'application installée garde la session), sinon la connexion. La largeur du nom se mesure une fois la police
// chargée (le prototype la mesurait trop tôt et coupait le mot). Animations réduites ou navigateur piloté : pas
// d'animation, on passe aussitôt.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { mouvementLibre } from '@client/composants/Animations'
import { Ecran } from '../../composants/coque'
import { SVG_LANCEMENT } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

const DUREE_MS = 2000

export default function Lancement() {
  const { t } = usePreferences()
  const s = useSession()
  const naviguer = useNavigate()
  const nom = useRef<HTMLSpanElement>(null)
  const [largeur, setLargeur] = useState(166)
  const [sortie, setSortie] = useState(false)
  useLayoutEffect(() => {
    const mesurer = () => nom.current && setLargeur(nom.current.scrollWidth)
    mesurer()
    void document.fonts?.ready.then(mesurer)
  }, [])
  useEffect(() => {
    const vers = s.connecte ? chemin('accueil') : chemin('connexion')
    const libre = mouvementLibre()
    const a = setTimeout(() => setSortie(true), libre ? DUREE_MS : 0)
    const b = setTimeout(() => naviguer(vers, { replace: true }), libre ? DUREE_MS + 450 : 300)
    return () => (clearTimeout(a), clearTimeout(b))
  }, [s.connecte, naviguer])
  return (
    <Ecran
      route="lancement"
      fixes={
        <div className={'blv-spl run' + (sortie ? ' out' : '')} role="img" aria-label={'BelivaY · ' + t('Espace vendeur')} style={{ '--nw': largeur + 'px', position: 'fixed' } as CSSProperties}>
          <div className="lu">
            <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: SVG_LANCEMENT }} />
            <span className="nm">
              <span ref={nom}>{t('BelivaY')}</span>
            </span>
          </div>
          <p className="spl-tg">
            <Icone nom="store" taille={15} />
            {t('Espace vendeur')}
          </p>
        </div>
      }
    />
  )
}
