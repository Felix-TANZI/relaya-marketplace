// Briques d'ENT-07 propres aux écrans repris sur le prototype (aides entC7_* du prototype) : erreur de lecture
// (C.loadErr dans un dk-banner), gros montant du héros (« 3 700 F » → « 3 700<small>F</small> »), anneau du score
// (C.ring), mini-indicateur du héros (m4). Les montants passent toujours par useF (jamais saisis).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Banniere } from '../../composants/prototype'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { usePreferences } from '../../preferences'
import { REGISTRE, entier } from '../../calculs/registre'
import { useF } from './commun'

/** Relevés et versements consultables en lecture seule après la fin du contrat (lecture_apres_resiliation, jours). */
export const LECTURE_APRES_FIN_J = entier(REGISTRE, 'lecture_apres_resiliation', /^jours/)

/** C.loadErr : « Impossible de charger … » ; ce qui est affiché reste valable ; Réessayer ; support. */
export function ErreurPx({ erreur, relire, quoi }: { erreur: Error | null; relire: () => void; quoi: string }) {
  const { t, tf } = usePreferences()
  if (!erreur) return null
  return (
    <Banniere
      ton="red"
      icone="cloud-off"
      className="ec-bn"
      role="alert"
      bouton={
        <button type="button" className="btn secondary sm" onClick={relire}>
          <Icone nom="rotate-cw" taille={16} />
          <span>{t('Réessayer')}</span>
        </button>
      }
    >
      <b>{tf('Impossible de charger {q}.', { q: t(quoi) })}</b> {t('Ce qui est affiché reste valable. Vérifiez la connexion puis réessayez.')}{' '}
      <Link to={chemin('messages', { sheet: 'nouveau' })}>{t('Écrire au support')}</Link>
    </Banniere>
  )
}

/** Gros montant du héros : chiffre, puis l'unité en petit (comme le prototype). */
export function Gros({ n, className = 'big' }: { n: number; className?: string }) {
  const f = useF()
  const x = f(n)
  const i = x.lastIndexOf(' ')
  return (
    <div className={className + ' num'}>
      {x.slice(0, i)}
      <small>{x.slice(i + 1)}</small>
    </div>
  )
}

/** m4 du héros : libellé, valeur, complément. */
export const M4 = ({ l, v, s }: { l: ReactNode; v: ReactNode; s?: ReactNode }) => (
  <div className="m4">
    <div className="l">{l}</div>
    <div className="v">{v}</div>
    {s && <div className="s">{s}</div>}
  </div>
)

/** C.ring : l'anneau commun (composants/prototype : texte lisible à toute taille). */
export { Anneau } from '../../composants/prototype'

/** Colonne du prototype (entC7_col) : blocs empilés, 16 px d'écart. */
export const Col = ({ children }: { children: ReactNode }) => <div className="e7-col">{children}</div>
