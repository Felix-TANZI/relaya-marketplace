// Fonctions d'abord (espace-entreprise/LECONS-PROTOTYPES.md, comme le tableau de l'entreprise et l'accueil du vendeur) :
// en tête d'une page, les gestes qu'on y fait, chacun avec son nombre (« Arbitrer · 3 litiges »), jamais une phrase
// d'explication. La première fonction qui a du travail est le héros (dégradé de l'interface) ; une fonction sans travail
// reste visible, calme. Chaque tuile ouvre l'écran (ou le filtre) où l'on agit. Les écrans les passent à la coque
// (<Ecran fonctions={…}>), qui les pose sous le titre. Sur une page secondaire (composants/rang.ts), les mêmes gestes
// deviennent une rangée de filtres avec leur nombre (puces), jamais des tuiles.
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'
import { useSecondaire } from './rang'

export interface Fonction {
  /** Verbe à l'infinitif : « Arbitrer », « Valider », « Lancer ». */
  verbe: string
  /** Nombre d'objets à traiter (null : geste sans compte, ex. « Exporter »). */
  n: number | null
  /** Objet au singulier et au pluriel : ['litige', 'litiges']. */
  unite: [string, string]
  icone: string
  /** Adresse dans l'application (chemin()) ; ou un geste sur la page. */
  vers?: string
  onClick?: () => void
  /** Montant ou précision courte (« 1,2 M F ») sous le nombre. */
  detail?: string
  /** Alerte (retard, fraude) : bordure orange même hors héros. */
  alerte?: boolean
}

export function Fonctions({ items, libelle, compact }: { items: Fonction[]; libelle?: string; compact?: boolean }) {
  const { t } = usePreferences()
  const secondaire = useSecondaire() && !compact
  const lieu = useLocation()
  // Fonction choisie sur la page (filtre posé par son geste) : marquée enfoncée, même si le filtre l'était déjà.
  const [choisie, setChoisie] = useState<number | null>(null)
  // Adresse de la page ouverte, sans le rôle de démonstration (« ?role=… ») ni la carte ouverte.
  const q = new URLSearchParams(lieu.search)
  q.delete('role')
  const adresse = lieu.pathname + (q.toString() ? '?' + q.toString() : '')
  const ici = adresse
  const l = items.filter(Boolean)
  if (!l.length) return null
  const heros = l.findIndex((x) => (x.n ?? 0) > 0)
  if (secondaire)
    return (
      <nav className="a-travail a-fil" aria-label={libelle ?? t('Fonctions de la page')}>
        {l.map((x, i) => {
          const unite = x.n === null ? '' : x.n > 1 ? t(x.unite[1]) : t(x.unite[0])
          const aria = `${t(x.verbe)}${x.n !== null ? ` ${x.n} ${unite}` : ''}`
          const ici = x.vers !== undefined && x.vers === adresse
          const classe = 'chip' + (ici || choisie === i ? ' on' : '') + (x.alerte && (x.n ?? 0) > 0 ? ' a-fil-chaud' : '')
          const corps = (
            <>
              <Icone nom={x.icone} taille={15} />
              {t(x.verbe)}
              {x.n !== null && <span className="n">{x.n}</span>}
            </>
          )
          if (ici)
            return (
              <span key={x.verbe + i} className={classe} role="group" aria-label={aria} title={aria}>
                {corps}
              </span>
            )
          return x.vers ? (
            <Link key={x.verbe + i} to={x.vers} className={classe} aria-label={aria} title={aria}>
              {corps}
            </Link>
          ) : (
            <button key={x.verbe + i} type="button" className={classe} aria-label={aria} title={aria} aria-pressed={choisie === i} onClick={() => (setChoisie(i), x.onClick?.())}>
              {corps}
            </button>
          )
        })}
      </nav>
    )
  return (
    <nav className={'a-travail' + (compact ? ' a-travail-c' : '') + ` a-n${Math.min(l.length, 5)}`} aria-label={libelle ?? t('Fonctions de la page')}>
      {l.map((x, i) => {
        const classe = 'a-act' + (i === heros ? ' a-act-heros' : (x.n ?? 0) > 0 ? (x.alerte ? ' a-act-chaud' : ' a-act-actif') : x.n === null ? ' a-act-actif' : ' a-act-calme')
        const unite = x.n === null ? '' : x.n > 1 ? t(x.unite[1]) : t(x.unite[0])
        const corps = (
          <>
            <span className="a-act-h" aria-hidden="true">
              <span className="a-act-i">
                <Icone nom={x.icone} taille={20} />
              </span>
              <Icone nom="arrow-right" taille={18} />
            </span>
            <span className="a-act-v">{t(x.verbe)}</span>
            <span className="a-act-n">
              {x.n !== null && <b>{x.n}</b>} {unite}
            </span>
            {x.detail && <span className="a-act-d">{x.detail}</span>}
          </>
        )
        const aria = `${t(x.verbe)}${x.n !== null ? ` ${x.n} ${unite}` : ''}`
        // Une fonction qui mène à la page déjà ouverte n'est pas un lien : son nombre suffit (la liste est dessous).
        if (x.vers && x.vers === ici)
          return (
            <div key={x.verbe + i} className={classe + ' a-act-ici'} role="group" aria-label={aria}>
              {corps}
            </div>
          )
        return x.vers ? (
          <Link key={x.verbe + i} to={x.vers} className={classe} aria-label={aria}>
            {corps}
          </Link>
        ) : (
          <button key={x.verbe + i} type="button" className={classe + (choisie === i ? ' a-act-on' : '')} aria-label={aria} aria-pressed={choisie === i} onClick={() => (setChoisie(i), x.onClick?.())}>
            {corps}
          </button>
        )
      })}
    </nav>
  )
}
