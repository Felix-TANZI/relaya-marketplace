// Écran « Lancement de l’app » (CL-03) : animation d'ouverture (décision du porteur du 30 sept., B1), balisage
// du prototype (outils/ecran.mjs), repris à la main :
// - la largeur du nom (--nw) se mesure une fois la police chargée ; le prototype la mesure trop tôt
//   (setTimeout 0) et coupe le mot : c'est pourquoi cet écran n'est pas comparé au pixel (construits.json) ;
// - après l'animation (2,6 s), l'écran d'ouverture ;
// - « ↻ Rejouer » est un repère de revue du prototype (CCH-19) : seulement en mode prototype de la démonstration.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

const DUREE_MS = 2600

export function Lancement() {
  // Le parcours d'accueil est vu : les visites suivantes arrivent directement sur l'accueil (App.tsx).
  useEffect(() => {
    try {
      localStorage.setItem('blv_arrivee', 'vu')
    } catch {
      /* stockage indisponible : le parcours peut revenir, sans gêne */
    }
  }, [])
  const { t } = usePreferences()
  const { reperesPrototype } = useSession()
  const naviguer = useNavigate()
  const nom = useRef<HTMLSpanElement>(null)
  const [largeur, setLargeur] = useState<number | null>(null)

  useLayoutEffect(() => {
    let vivant = true
    document.fonts.ready.then(() => vivant && nom.current && setLargeur(nom.current.scrollWidth))
    return () => {
      vivant = false
    }
  }, [])
  useEffect(() => {
    const minuterie = setTimeout(() => naviguer(chemin('ouverture'), { replace: true }), DUREE_MS)
    return () => clearTimeout(minuterie)
  }, [naviguer])

  return (
    <Ecran
      route="lancement"
      parEtat
      fixes={
        <>
          <Styles id="e83f62e910" />
          <div className="blv-spl run" role="img" aria-label="BelivaY" style={(largeur !== null ? { '--nw': largeur + 'px' } : {}) as CSSProperties}>
            <div className="lu">
              <Dessin id="af28954ee65e" />
              <span className="nm">
                <span ref={nom}>{t('BelivaY')}</span>
              </span>
            </div>
            <p className="spl-tg">{t('Tout près de toi')}</p>
          </div>
          {reperesPrototype && (
            <Link
              to={chemin('lancement', { r: String(Date.now()) })}
              style={{ position: 'absolute', zIndex: 10000, left: '50%', bottom: '26px', translate: '-50% 0', color: '#fff', font: '700 13px system-ui', textDecoration: 'none', opacity: 0.85 }}
            >
              {t('↻ Rejouer')}
            </Link>
          )}
        </>
      }
    />
  )
}
