// Fil d'Ariane (grands écrans, DISPOSITION-ECRANS.md § 3.4 et § 6.7) : affiché dès 1024 px dans la barre de titre
// des pages enfants, construit avec la chaîne des parents naturels (NAVIGATION[route].retour, en remontant),
// « Accueil › Mon compte › Mes adresses ». Le dernier élément n'est pas un lien.
// Un écran qui a sa propre chaîne (fiche : univers › sous-catégorie › produit) passe ses éléments.
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ARIANE, NAVIGATION, TITRES_ARIANE, chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

export interface ElementAriane {
  texte: string
  vers?: string // absent : l'élément courant (pas un lien)
}

// Chaîne des parents d'une route, de l'accueil à la route (exclue).
export function parentsDe(route: string, parent?: string | null): ElementAriane[] {
  // Un état de la même route (« Nouvelle adresse » sous « Mes adresses ») : la route elle-même est le parent.
  const vus = new Set<string>(parent === route ? [] : [route])
  const chaine: ElementAriane[] = []
  let r = parent !== undefined ? parent : NAVIGATION[route]?.retour
  while (r && r !== 'accueil' && !vus.has(r) && chaine.length < 6) {
    vus.add(r)
    chaine.unshift({ texte: TITRES_ARIANE[r] ?? NAVIGATION[r]?.titre ?? r, vers: chemin(r) })
    r = ARIANE[r] ?? NAVIGATION[r]?.retour ?? null
  }
  return [{ texte: 'Accueil', vers: chemin('accueil') }, ...chaine]
}

export function FilAriane({ elements }: { elements: ElementAriane[] }) {
  const { t } = usePreferences()
  return (
    <nav className="fil" aria-label={t('Fil d’Ariane')}>
      <ol>
        {elements.map((e, i) => (
          <Fragment key={i}>
            <li>
              {e.vers && i < elements.length - 1 ? (
                <Link to={e.vers}>{t(e.texte)}</Link>
              ) : (
                <span aria-current="page">{t(e.texte)}</span>
              )}
            </li>
            {i < elements.length - 1 && (
              <li aria-hidden="true" className="fil-sep">
                <Icone nom="chevron-right" taille={13} />
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
