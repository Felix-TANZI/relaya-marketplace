// Aides du prototype LIV-08..10 (fonctions livc_ du moteur : livc_ic, livc_sh, livc_lab, livc_seg3, C.tg, C.radio),
// en React, avec le même balisage et les mêmes classes (src/styles/prototype.css) ; propres au groupe LIV-10.
import type { CSSProperties, ReactNode } from 'react'
import { Icone } from '../../composants/Icone'
import { usePreferences } from '../../preferences'
import './liv10.css'

/** livc_ic : pastille d'icône teintée (carrée, coins arrondis). */
export function LivcIc({ icone, ton = 'ink', taille = 40, style }: { icone: string; ton?: string; taille?: number; style?: CSSProperties }) {
  return (
    <span className={'livc-ic ' + ton} style={{ width: taille, height: taille, ...style }} aria-hidden="true">
      <Icone nom={icone} taille={Math.round(taille / 2)} />
    </span>
  )
}

/** livc_sh : en-tête d'une feuille du bas (icône, titre, sous-titre, fermer). */
export function LivcSh({ titre, sous, icone, ton, fermer }: { titre: ReactNode; sous?: ReactNode; icone?: string; ton?: string; fermer: () => void }) {
  const { t } = usePreferences()
  return (
    <div className="livc-sh-h">
      {icone && <LivcIc icone={icone} ton={ton} taille={46} />}
      <div className="grow">
        <h2>{titre}</h2>
        {sous && <p>{sous}</p>}
      </div>
      <button type="button" className="livc-x l10-x" onClick={fermer} aria-label={t('Fermer')}>
        <Icone nom="x" taille={20} />
      </button>
    </div>
  )
}

/** livc_lab : petit intitulé en capitales. */
export const LivcLab = ({ children, droite }: { children: ReactNode; droite?: ReactNode }) => (
  <div className="livc-lab">
    <span>{children}</span>
    {droite}
  </div>
)

/** Segments à trois choix des réglages (livc-seg3) : un seul choisi. */
export function Seg3<T extends string>({ items, actuel, poser, label }: { items: { v: T; t: string; icone?: string; vers?: () => void }[]; actuel: T; poser: (v: T) => void; label: string }) {
  return (
    <div className="livc-seg3" role="radiogroup" aria-label={label}>
      {items.map((i) => (
        <button key={i.v} type="button" role="radio" aria-checked={i.v === actuel} className={i.v === actuel ? 'on' : ''} onClick={() => (i.vers ? i.vers() : poser(i.v))}>
          {i.icone && <Icone nom={i.icone} taille={16} />}
          {i.t}
        </button>
      ))}
    </div>
  )
}

/** C.tg : interrupteur (verrouillé : cadenas, sans effet). */
export function Tg({ on, verrou, changer, label }: { on: boolean; verrou?: boolean; changer?: (v: boolean) => void; label: string }) {
  return <button type="button" className={'tg' + (on ? ' on' : '') + (verrou ? ' lock' : '')} role="switch" aria-checked={on} aria-label={label} aria-disabled={verrou || undefined} onClick={() => !verrou && changer?.(!on)}></button>
}

/** C.radio : choix exclusif en carte. */
export function Radio({ on, t, s, choisir }: { on: boolean; t: ReactNode; s?: ReactNode; choisir: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={'radio l10-radio' + (on ? ' on' : '')} onClick={choisir}>
      <span className="rd"></span>
      <span className="grow">
        <span className="rt" style={{ display: 'block' }}>
          {t}
        </span>
        {s && (
          <span className="rs" style={{ display: 'block' }}>
            {s}
          </span>
        )}
      </span>
    </button>
  )
}

/** Texte d'un tiers dont le serveur a masqué un numéro, un e-mail ou un code (« ••• ») : la pastille du prototype. */
export function TexteMasque({ texte }: { texte: string }) {
  const { t } = usePreferences()
  const morceaux = texte.split('•••')
  return (
    <>
      {morceaux.map((m, i) => (
        <span key={i}>
          {m}
          {i < morceaux.length - 1 && (
            <span className="livc-mask">
              <Icone nom="eye-off" taille={12} />
              {t('masqué')}
            </span>
          )}
        </span>
      ))}
    </>
  )
}
