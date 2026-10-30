// Page PROVISOIRE du socle, commune à tous les écrans pas encore repris : dans la vraie coque (navigation, en-tête,
// droits), elle montre ce que le PROTOTYPE montre de l'écran (src/genere/ecrans.json, relu par outils/ecrans.mjs :
// page ADM-Pxx, titre, surtitre, sous-titre, états, sections et panneaux), et le droit du rôle courant sur la page. Elle
// sert de carte de travail à l'agent qui reprend l'écran (METHODE.md) ; elle disparaît quand toutes les routes sont
// « repris ». Le texte du prototype reste en français (lang="fr") : c'est la référence, pas une page finie.
// Connexion : tant qu'elle est provisoire, la démonstration ouvre la console avec l'agent d'un des huit rôles.
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../composants/coque'
import { Icone } from '../composants/Icone'
import { Perimetre } from '../composants/Perimetre'
import { ICONE_ROLE, NOM_ROLE } from '../config/libelles'
import { ACCUEIL_ROLE, chemin, routeDe } from '../config/pages'
import { ROUTES } from '../config/routes'
import { source } from '../donnees/source'
import { useLecture } from '../donnees/useLecture'
import { usePreferences } from '../preferences'
import { useDroit, useSession } from '../session'

export interface EcranPrototype {
  page: string // « ADM-P03 »
  titre: string
  doc: string // « ADM-04 »
  kicker: string
  sous: string
  etats: string[]
  sections: string[]
}

const NOM_ACCES = { oui: 'Lecture et gestes', lecture: 'Lecture seule', zone: 'Limité à vos zones', part: 'Une partie', aucun: 'Aucun accès' }

function ConnexionDemo() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const agents = useLecture(() => source.session.agentsDemo(), [])
  const suite = params.get('next')?.startsWith('/') ? params.get('next')! : null
  if (s.connecte)
    return (
      <div className="bandeau">
        <Icone nom="circle-check" taille={18} />
        <span className="grow">
          {t('Vous êtes connecté.')} <Link to={chemin(ACCUEIL_ROLE[s.role])}>{t('Aller à l’accueil de la console')}</Link>
        </span>
      </div>
    )
  return (
    <section className="card">
      <h2 className="card-t">{t('Démonstration')}</h2>
      <p className="card-s">{t('L’écran de connexion n’est pas encore repris : ouvrez la console avec l’agent d’un des huit rôles (un rôle, une personne).')}</p>
      <div className="btns mt14 e-roles">
        {(agents.donnees ?? []).map((a) => (
          <button
            key={a.role}
            type="button"
            className={'btn ' + (a.role === 'superviseur' ? 'primary' : 'secondary')}
            aria-label={tf('{role} : {nom}', { role: t(NOM_ROLE[a.role]), nom: a.nom })}
            onClick={async () => {
              await source.session.changerRole(a.role)
              naviguer(suite ?? chemin(ACCUEIL_ROLE[a.role]), { replace: true })
            }}
          >
            <Icone nom={ICONE_ROLE[a.role]} taille={18} />
            <span>{t(NOM_ROLE[a.role])}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function Liste({ titre, lignes }: { titre: string; lignes: string[] }) {
  const { t } = usePreferences()
  if (!lignes.length) return null
  return (
    <div>
      <h2 className="sec">{t(titre)}</h2>
      <section className="card">
        <ul className="prov-l" lang="fr">
          {lignes.map((l, i) => (
            <li key={i}>{l}</li>
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
  const droit = useDroit(route)
  const attendu = useLecture(() => import('../genere/ecrans.json').then((m) => (m.default as Record<string, EcranPrototype>)[route] ?? null), [route])
  const e = attendu.donnees
  return (
    <Ecran route={route}>
      {route === 'connexion' && <ConnexionDemo />}
      {route !== 'connexion' && <Perimetre route={route} />}
      <section className="card prov">
        <div className="e-pills">
          <span className="pill amber">
            <Icone nom="square-dashed" taille={13} />
            {t('Page provisoire')}
          </span>
          <span className="pill acc">{e?.page ?? fiche.ecran}</span>
          <span className="pill">{fiche.groupe}</span>
          {route !== 'connexion' && (
            <span className="pill ink">
              <Icone nom="key-round" taille={13} />
              {`${t(NOM_ACCES[droit.acces])}${droit.note ? ' · ' + t(droit.note) : ''}`}
            </span>
          )}
        </div>
        {e ? (
          <>
            <h2 className="card-t mt14" lang="fr">
              {e.titre}
            </h2>
            {e.sous && (
              <p className="card-s" lang="fr">
                {e.sous}
              </p>
            )}
          </>
        ) : (
          attendu.erreur && <p className="card-s mt14">{t('L’inventaire des écrans n’a pas pu être lu.')}</p>
        )}
        <p className="mt10">{e ? tf('Cet écran sera repris par le groupe {groupe} : voici ce que le prototype en montre ({doc}).', { groupe: fiche.groupe, doc: e.doc }) : tf('Page ajoutée à la console, reprise par le groupe {groupe}.', { groupe: fiche.groupe })}</p>
      </section>
      {e && (
        <div className="prov-g">
          <Liste titre="États du prototype" lignes={e.etats} />
          <Liste titre="Sections et panneaux" lignes={e.sections} />
        </div>
      )}
    </Ecran>
  )
}
