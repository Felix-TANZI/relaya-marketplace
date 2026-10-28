// Page PROVISOIRE d'un écran du paquet livreur (LIV-P01 à LIV-P32), en attendant que l'agent de son groupe la
// reprenne (METHODE.md) : la vraie coque de la route (en-tête, retour, barre, menu du profil), puis la fiche de
// l'écran relevée dans le paquet (logique-metier/livreur/extraction, src/genere/fiches.json) : états, éléments et
// gestes attendus. La fiche est un relevé de travail en français (lang="fr"), pas un texte de l'application.
import { useEffect, useState } from 'react'
import { Ecran } from './coque'
import { Icone } from './Icone'
import { ROUTES } from '../config/routes'
import { usePreferences } from '../preferences'

interface Fiche {
  page: string
  nom: string
  etats: string[]
  elements: string[]
  actions: string[]
}

export function PageProvisoire({ route }: { route: string }) {
  const { t, tf } = usePreferences()
  const [fiche, setFiche] = useState<Fiche | null>(null)
  useEffect(() => {
    let vivant = true
    void import('../genere/fiches.json').then((m) => vivant && setFiche((m.default as Record<string, Fiche>)[route] ?? null))
    return () => void (vivant = false)
  }, [route])
  const r = ROUTES[route]
  const liste = (titre: string, icone: string, lignes: string[]) =>
    lignes.length > 0 && (
      <details className="l-carte l-fiche">
        <summary>
          <Icone nom={icone} taille={20} />
          <span className="l-grow">{t(titre)}</span>
          <span className="l-bdg-n">{lignes.length}</span>
        </summary>
        <ul lang="fr">
          {lignes.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </details>
    )
  return (
    <Ecran route={route}>
      <section className="l-carte l-provisoire">
        <div className="l-kicker">{tf('{page} · écran provisoire', { page: r?.page ?? '' })}</div>
        <h2>{t(r?.titre ?? '')}</h2>
        <p>{tf('Cet écran est en cours de reprise par le groupe {groupe}. Voici ce qu’il devra montrer et permettre.', { groupe: r?.groupe ?? '' })}</p>
      </section>
      {fiche && (
        <>
          {liste('États attendus', 'layers', fiche.etats)}
          {liste('Éléments de l’écran', 'list', fiche.elements)}
          {liste('Gestes et issues', 'list-checks', fiche.actions)}
        </>
      )}
    </Ecran>
  )
}
