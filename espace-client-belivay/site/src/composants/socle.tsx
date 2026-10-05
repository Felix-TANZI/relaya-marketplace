// Composants du socle (CDS-13) : chacun rend exactement le balisage de son équivalent C.* du prototype
// (mêmes balises, mêmes classes, même ordre), pour que la feuille de styles du prototype s'applique
// telle quelle. Les textes arrivent déjà passés par t().
import type { ReactNode } from 'react'
import { usePreferences } from '../preferences'
import { Link } from 'react-router-dom'
import type { Image as ImageDonnee } from '../donnees/source'
import { Icone } from './Icone'

// C.pill
export function Pastille(p: { children: ReactNode; ton?: string; sm?: boolean; point?: boolean; icone?: string }) {
  return (
    <span className={'pill ' + (p.ton || 'ink') + (p.sm ? ' sm' : '')}>
      {p.point && <i className="d" />}
      {p.icone && <Icone nom={p.icone} taille={13} />}
      {p.children}
    </span>
  )
}

// C.btn : un lien si vers est donné, sinon un bouton.
export function Bouton(p: {
  children?: ReactNode
  genre?: string
  vers?: string
  icone?: string
  tailleIcone?: number
  classe?: string
  sm?: boolean
  inactif?: boolean
  aria?: string
  onClick?: () => void
}) {
  const cl = 'btn ' + (p.genre || 'primary') + (p.classe ? ' ' + p.classe : '') + (p.sm ? ' sm' : '') + (p.inactif ? ' off' : '')
  const contenu = (
    <>
      {p.icone && <Icone nom={p.icone} taille={p.tailleIcone || 18} />}
      {p.children !== undefined && <span>{p.children}</span>}
    </>
  )
  return p.vers ? (
    <Link to={p.vers} className={cl} aria-label={p.aria}>
      {contenu}
    </Link>
  ) : (
    <button type="button" className={cl} aria-label={p.aria} onClick={p.onClick}>
      {contenu}
    </button>
  )
}

// C.title
export function Titre(p: { titre: ReactNode; sous?: ReactNode; surtitre?: ReactNode }) {
  return (
    <div className="pg">
      {p.surtitre && <div className="pg-k">{p.surtitre}</div>}
      <h1 className="pg-t">{p.titre}</h1>
      {p.sous && <p className="pg-s">{p.sous}</p>}
    </div>
  )
}

// C.sec
export function Section(p: { titre: ReactNode; lien?: ReactNode; vers?: string }) {
  return (
    <div className="sec">
      <h2>{p.titre}</h2>
      {p.lien && (
        <Link className="a" to={p.vers || '#'}>
          {p.lien}
          <Icone nom="chevron-right" taille={16} />
        </Link>
      )}
    </div>
  )
}

// C.card
export function Carte(p: { children?: ReactNode; classe?: string }) {
  return <div className={'card ' + (p.classe || '')}>{p.children}</div>
}

// C.li
export function Ligne(p: {
  titre: ReactNode
  sous?: ReactNode
  vers?: string
  icone?: string
  ton?: string
  gauche?: ReactNode
  droite?: ReactNode
  chevron?: boolean
}) {
  const corps = (
    <>
      {p.icone && (
        <span className={'ic ' + (p.ton || '')}>
          <Icone nom={p.icone} taille={20} />
        </span>
      )}
      {p.gauche}
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {p.titre}
        </span>
        {p.sous && (
          <span className="ls" style={{ display: 'block' }}>
            {p.sous}
          </span>
        )}
      </span>
      {p.droite}
      {p.vers && p.chevron !== false && (
        <span className="chev">
          <Icone nom="chevron-right" taille={18} />
        </span>
      )}
    </>
  )
  return p.vers ? (
    <Link to={p.vers} className="li">
      {corps}
    </Link>
  ) : (
    <div className="li">{corps}</div>
  )
}

// C.note
export function Note(p: { ton: string; icone: string; children: ReactNode }) {
  return (
    <div className={'note ' + p.ton}>
      <Icone nom={p.icone} taille={18} />
      <div>{p.children}</div>
    </div>
  )
}

// C.tg
export function Interrupteur(p: { actif: boolean; verrou?: boolean; aria?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      className={'tg' + (p.actif ? ' on' : '') + (p.verrou ? ' lock' : '')}
      role="switch"
      aria-checked={p.actif ? 'true' : 'false'}
      aria-label={p.aria}
      onClick={p.onClick}
    />
  )
}

// C.empty
export function Vide(p: { icone: string; titre: ReactNode; texte: ReactNode; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ei">
        <Icone nom={p.icone} taille={26} />
      </div>
      <h3>{p.titre}</h3>
      <p>{p.texte}</p>
      {p.children}
    </div>
  )
}

// C.offline
export function BandeauHorsLigne(p: { children: ReactNode }) {
  return (
    <div className="offline-banner">
      <Icone nom="wifi-off" taille={18} />
      <span>{p.children}</span>
    </div>
  )
}

// C.hint
export function Aide(p: { children: ReactNode; icone?: string }) {
  return (
    <div className="hint-l">
      <Icone nom={p.icone || 'info'} taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{p.children}</span>
    </div>
  )
}

// Image servie par l'API ou dessin de démonstration, dans le conteneur de l'écran.
export function Illustration({ image, classe, style }: { image: ImageDonnee; classe: string; style?: React.CSSProperties }) {
  const { theme } = usePreferences()
  if ('url' in image)
    return (
      <span className={classe} style={style}>
        <img src={image.url} srcSet={image.srcset || undefined} alt={image.alt ?? ''} loading="lazy" decoding="async" />
      </span>
    )
  const svg = theme === 'dark' && image.svgSombre ? image.svgSombre : image.svg
  return <span className={classe} style={style} dangerouslySetInnerHTML={{ __html: svg }} />
}
