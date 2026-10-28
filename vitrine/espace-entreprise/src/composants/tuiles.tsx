// Tuiles prioritaires (Menu, Profil ; REFONTE-PRESENTATION.md) : ce qui sert le plus, en grand et en un geste, avant la
// liste. Chaque tuile : icône, titre, à quoi elle sert (une ligne), compteur si quelque chose attend (orange : alerte).
// Une tuile dont la page est fermée au rôle n'apparaît pas (ENT-RG-R25). Même logique que « Le guichet » du point
// relais et les tuiles du livreur. Sur une page secondaire (Profil ; composants/rang.ts), les mêmes entrées sont une
// liste de lignes dans un bloc, jamais une rangée de tuiles.
import { Link } from 'react-router-dom'
import { badge } from '@client/i18n/format'
import { usePreferences } from '../preferences'
import { useRouteOuverte } from '../session'
import { Icone } from './Icone'
import { Li } from './prototype'
import { useSecondaire } from './rang'

export interface Tuile {
  route: string
  to: string
  titre: string
  sous: string
  icone: string
  n?: number
  info?: boolean // compteur d'information (missions en cours) : vert, pas d'alerte
}

export function Tuiles({ items, aria }: { items: Tuile[]; aria: string }) {
  const { t, tf } = usePreferences()
  const ouverte = useRouteOuverte()
  const visibles = items.filter((x) => ouverte(x.route))
  const secondaire = useSecondaire()
  if (visibles.length === 0) return null
  if (secondaire)
    return (
      <nav className="card e-tuiles-l" aria-label={aria}>
        {visibles.map((x) => {
          const n = badge(x.n ?? 0)
          return (
            <Li
              key={x.route + x.to}
              icone={x.icone}
              t={t(x.titre)}
              s={t(x.sous)}
              to={x.to}
              aria={n ? tf('{entree}, {n}', { entree: t(x.titre), n }) : undefined}
              droite={n ? <span className={'bdg' + (x.info ? ' info' : '')}>{n}</span> : undefined}
            />
          )
        })}
      </nav>
    )
  return (
    <nav className={'e-tuiles' + (visibles.length === 3 ? ' t3' : visibles.length === 6 ? ' t6' : '')} aria-label={aria}>
      {visibles.map((x) => {
        const n = badge(x.n ?? 0)
        return (
          <Link key={x.route + x.to} className={'e-tuile' + (n && !x.info ? ' chaud' : '')} to={x.to} aria-label={n ? tf('{entree}, {n}', { entree: t(x.titre), n }) : undefined}>
            <span className="ic">
              <Icone nom={x.icone} taille={22} />
            </span>
            <span className="tt">{t(x.titre)}</span>
            <span className="ts">{t(x.sous)}</span>
            {n && <span className={'bdg' + (x.info ? ' info' : '')}>{n}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
