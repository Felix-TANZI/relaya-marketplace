// Page PROVISOIRE d'un écran du prototype point relais, en attendant que l'agent de son groupe le reprenne
// (METHODE.md) : la VRAIE coque de la route (en-tête, retour, barre du bas) autour du balisage transcrit du prototype
// (src/pages/PR-xx/provisoires/<Écran>.tsx, généré par outils/transcription.mjs), l'état choisi par « ?etat=<id> »,
// puis la fiche de l'écran : ses états (liens), et ce que l'extraction du paquet en dit (éléments, gestes, règles :
// src/genere/fiches.json). La fiche est un relevé de travail en français (lang="fr"), pas un texte de l'application.
import { useEffect, useState, type ComponentType } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { chemin } from '../config/pages'
import { ROUTES } from '../config/routes'
import { usePreferences } from '../preferences'
import { Ecran } from './coque'
import { Icone } from './Icone'

interface Fiche {
  ecrans: string[]
  etats: string[]
  elements: string[]
  actions: string[]
  regles: string[]
  etatsExtraction: string[]
}
export interface EtatProvisoire {
  id: string
  libelle: string
  Rendu: ComponentType
}

export function PageProvisoire({ route, etats }: { route: string; etats: EtatProvisoire[] }) {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const e = etats.find((x) => x.id === params.get('etat')) ?? etats[0]
  const [fiche, setFiche] = useState<Fiche | null>(null)
  useEffect(() => {
    let vivant = true
    void import('../genere/fiches.json').then((m) => vivant && setFiche((m.default as Record<string, Fiche>)[route] ?? null))
    return () => void (vivant = false)
  }, [route])
  const r = ROUTES[route]
  const liste = (titre: string, icone: string, lignes: string[]) =>
    lignes.length > 0 && (
      <details className="r-fiche">
        <summary>
          <Icone nom={icone} taille={20} />
          <span className="r-grow">{t(titre)}</span>
          <span className="r-nombre">{lignes.length}</span>
        </summary>
        <ul lang="fr">
          {lignes.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </details>
    )
  const Rendu = e.Rendu
  return (
    <Ecran route={route}>
      <Rendu />
      <section className="r-provisoire" aria-label={t('Écran provisoire')}>
        <div className="r-kicker">{tf('{groupe} · écran provisoire', { groupe: r?.groupe ?? '' })}</div>
        <p>{tf('Transcription du prototype ({ecran}), en cours de reprise. État affiché : {etat}.', { ecran: r?.ecran ?? '', etat: e.libelle })}</p>
        {etats.length > 1 && (
          <nav className="r-etats" lang="fr" aria-label={t('États de l’écran')}>
            {etats.map((x) => (
              <Link key={x.id} to={chemin(route, x.id === etats[0].id ? undefined : { etat: x.id })} aria-current={x.id === e.id ? 'page' : undefined} className={'r-etat' + (x.id === e.id ? ' on' : '')}>
                {x.libelle}
              </Link>
            ))}
          </nav>
        )}
        {fiche && (
          <>
            {liste('Éléments de l’écran', 'r-document', fiche.elements)}
            {liste('Gestes et issues', 'r-cle', fiche.actions)}
            {liste('Règles', 'r-balance', fiche.regles)}
          </>
        )}
      </section>
    </Ecran>
  )
}
