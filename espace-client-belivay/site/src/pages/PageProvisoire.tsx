// Page provisoire du squelette : la coque de la route est déjà celle du prototype (en-tête, barre du bas,
// marges) ; le contenu dit ce qu'il faudra y construire à l'étape 6 (sections du document, états du
// prototype, règles du squelette, API). Contenu destiné à l'équipe : il n'est pas traduit et ne sera
// jamais publié.
import { Link } from 'react-router-dom'
import { Ecran } from '../composants/coque'
import { Carte, Ligne, Pastille, Section, Titre, Vide } from '../composants/socle'
import { NAVIGATION, adresseDuSite, chemin, type Page } from '../config/pages'
import { source } from '../donnees/source'
import { useDonnees } from '../donnees/useDonnees'

export function PageProvisoire({ page }: { page: Page }) {
  const nav = NAVIGATION[page.route]
  const entete = useDonnees(() => source.entete(page.route))
  return (
    <Ecran route={page.route} gabarit="centre" titre={entete?.titre ?? undefined} sousTitre={entete ? entete.sousTitre : undefined}>
      <div data-provisoire={page.route}>
        {nav.entete !== 'enfant' && <Titre titre={page.titre} sous={page.document} />}
        <Vide
          icone="square-dashed"
          titre="Écran à construire"
          texte={page.documentee ? `Décrit dans ${page.document} · ${page.regles} règles` : `Écran du prototype sans section dans ${page.document} : à documenter`}
        />
        {page.sections.length > 0 && (
          <>
            <Section titre="Sections du document" />
            <Carte classe="tight">
              {page.sections.map((s, i) => (
                <Ligne key={i} titre={s} />
              ))}
            </Carte>
          </>
        )}
        {page.etats.length > 0 && (
          <>
            <Section titre={`États du prototype (${page.etats.length})`} />
            <Carte classe="tight">
              {/* Un même état peut être cité par CL-01 et par le document de l'écran : la clé est la position. */}
              {page.etats.map((e, i) => (
                <Ligne key={i} vers={adresseDuSite(e.adresse)} titre={e.libelle} />
              ))}
            </Carte>
          </>
        )}
        {page.regles_etape4.length > 0 && (
          <>
            <Section titre="Règles du squelette (étape 4)" />
            <div className="chips">
              {page.regles_etape4.map((r) => (
                <Pastille key={r}>{r}</Pastille>
              ))}
            </div>
          </>
        )}
        {page.api.length > 0 && (
          <>
            <Section titre="API" />
            <Carte classe="tight">
              {page.api.map((a, i) => (
                <Ligne key={i} titre={a} />
              ))}
            </Carte>
          </>
        )}
        {nav.entete === 'aucun' && !nav.barre && (
          <p className="mn-foot">
            <Link to={chemin('accueil')}>Accueil</Link>
          </p>
        )}
      </div>
    </Ecran>
  )
}
