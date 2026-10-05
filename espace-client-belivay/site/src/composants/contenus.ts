// Contenus éditoriaux de l'accueil (donnees/contenus.ts) lus une fois par visite : le contenu par défaut s'affiche
// aussitôt (aucun saut à l'ouverture), celui du serveur le remplace dès qu'il arrive. En démonstration, la source
// rend le même objet : rien ne change.
import { useEffect, useState } from 'react'
import { COORDONNEES, type Coordonnees } from '../config/coordonnees'
import { CONTENU_ACCUEIL, type ContenuAccueil } from '../donnees/contenus'
import { source } from '../donnees/source'

let cache: ContenuAccueil | null = null
let enCours: Promise<ContenuAccueil> | null = null

export function useContenuAccueil(): ContenuAccueil {
  const [c, setC] = useState<ContenuAccueil>(cache ?? CONTENU_ACCUEIL)
  useEffect(() => {
    if (cache) return
    let vivant = true
    enCours ??= source.contenuAccueil().then(
      (v) => (cache = v),
      () => CONTENU_ACCUEIL,
    )
    enCours.then((v) => vivant && v !== CONTENU_ACCUEIL && setC(v))
    return () => {
      vivant = false
    }
  }, [])
  return c
}

// Coordonnées officielles (téléphone, e-mail, WhatsApp, réseaux) : celles du serveur si les contenus en portent,
// sinon celles de config/coordonnees.ts.
export function useCoordonnees(): Coordonnees {
  const c = useContenuAccueil().coordonnees
  return c ? { ...COORDONNEES, ...c, reseaux: c.reseaux?.length ? c.reseaux : COORDONNEES.reseaux } : COORDONNEES
}
