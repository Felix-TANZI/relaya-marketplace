// Page PROVISOIRE du socle, commune à tous les écrans pas encore repris : dans la vraie coque (navigation, en-tête,
// rôles), elle montre ce que l'extraction du paquet attend de l'écran (src/genere/ecrans.json : états, éléments,
// actions), et chaque destination « → ENT-Pxx » devient un vrai lien vers l'écran concerné. Elle sert de carte de
// travail à l'agent qui reprend l'écran (METHODE.md) ; elle disparaît quand toutes les routes sont « repris ».
// Le texte de l'extraction reste en français (lang="fr") : c'est la référence, pas une page finie.
// Connexion : tant qu'elle est provisoire, la démonstration ouvre l'espace avec l'un des trois rôles.
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../composants/coque'
import { Icone } from '../composants/Icone'
import { NOM_ROLE } from '../config/libelles'
import { ACCUEIL, chemin, routeDe } from '../config/pages'
import { ROUTES } from '../config/routes'
import { ROLES } from '../donnees/communs'
import { source } from '../donnees/source'
import { useLecture } from '../donnees/useLecture'
import { usePreferences } from '../preferences'
import { useSession } from '../session'

interface EcranAttendu {
  nom: string
  ref: string
  etats: string[]
  elements: string[]
  actions: string[]
}

const ROUTE_DE_L_ECRAN = Object.fromEntries(Object.values(ROUTES).map((r) => [r.ecran, r.route]))

/** Texte d'une action, ses destinations « ENT-Pxx » en liens vers l'écran. */
function Destinations({ texte }: { texte: string }) {
  return (
    <>
      {texte.split(/(ENT-P\d\d)/).map((morceau, i) => {
        const route = ROUTE_DE_L_ECRAN[morceau]
        return route ? (
          <Link key={i} to={chemin(route)}>
            {morceau}
          </Link>
        ) : (
          <span key={i}>{morceau}</span>
        )
      })}
    </>
  )
}

function ConnexionDemo() {
  const { t } = usePreferences()
  const s = useSession()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const suite = params.get('next') && params.get('next')!.startsWith('/') ? params.get('next')! : chemin(ACCUEIL)
  if (s.connecte)
    return (
      <div className="bandeau">
        <Icone nom="circle-check" taille={18} />
        <span className="grow">
          {t('Vous êtes connecté.')} <Link to={chemin(ACCUEIL)}>{t('Aller au tableau de bord')}</Link>
        </span>
      </div>
    )
  return (
    <section className="card">
      <h2 className="card-t">{t('Démonstration')}</h2>
      <p className="card-s">{t('L’écran de connexion n’est pas encore repris : ouvrez l’espace avec l’un des rôles internes.')}</p>
      <div className="btns mt14">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            className={'btn ' + (r === 'proprietaire' ? 'primary' : 'secondary')}
            onClick={async () => {
              await source.session.changerRole(r)
              naviguer(suite, { replace: true })
            }}
          >
            {t(NOM_ROLE[r])}
          </button>
        ))}
      </div>
    </section>
  )
}

function Liste({ titre, lignes, liens }: { titre: string; lignes: string[]; liens?: boolean }) {
  const { t } = usePreferences()
  if (!lignes.length) return null
  return (
    <div>
      <h2 className="sec">{t(titre)}</h2>
      <section className="card">
        <ul className="prov-l" lang="fr">
          {lignes.map((l, i) => (
            <li key={i}>{liens ? <Destinations texte={l} /> : l}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default function Provisoire() {
  const { t, tf } = usePreferences()
  const route = routeDe(useLocation().pathname)
  const fiche = ROUTES[route]
  const attendu = useLecture(() => import('../genere/ecrans.json').then((m) => (m.default as Record<string, EcranAttendu>)[fiche.ecran] ?? null), [fiche.ecran])
  const e = attendu.donnees
  return (
    <Ecran route={route}>
      {route === 'connexion' && <ConnexionDemo />}
      <section className="card prov">
        <div className="e-pills">
          <span className="pill ambre">
            <Icone nom="square-dashed" taille={13} />
            {t('Page provisoire')}
          </span>
          <span className="pill e">{fiche.ecran}</span>
          <span className="pill">{fiche.groupe}</span>
        </div>
        {e ? (
          <>
            <h2 className="card-t mt14" lang="fr">
              {e.nom}
            </h2>
            <p className="card-s" lang="fr">
              {e.ref}
            </p>
          </>
        ) : (
          attendu.erreur && <p className="card-s mt14">{t('L’inventaire des écrans n’a pas pu être lu.')}</p>
        )}
        <p className="mt10">{tf('Cet écran sera repris par le groupe {groupe} : voici ce que le paquet en attend.', { groupe: fiche.groupe })}</p>
      </section>
      {e && (
        <div className="prov-g">
          <Liste titre="États attendus" lignes={e.etats} />
          <Liste titre="Éléments" lignes={e.elements} />
          <Liste titre="Actions et destinations" lignes={e.actions} liens />
        </div>
      )}
    </Ecran>
  )
}
