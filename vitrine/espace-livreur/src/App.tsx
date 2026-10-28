// Routes de l'espace livreur : une par route déclarée dans un fichier src/pages/LIV-xx/routes.ts (config/routes.ts).
// Adresse inconnue : « Ce lien ne mène à aucune page ». Sans session (déconnecté), toute page renvoie à la connexion,
// qui ramène ensuite à la page demandée. Compte ni actif ni restreint (LIV-01-R013) : une adresse ouverte directement
// hors des pages qui lui restent ouvertes mène à l'état du compte (ou à l'activation), comme la connexion. Une ancienne
// adresse (page fusionnée ou retirée, DP-66) mène à la page qui reprend le besoin (config/routes.ts, REDIRECTIONS).
import { Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppelEnCours } from './composants/AppelEnCours'
import { GardeErreurs } from './composants/Garde'
import { chemin, routeDe } from './config/pages'
import { REDIRECTIONS, ROUTES, precharger, redirection } from './config/routes'
import { useReseauGlobal } from './donnees/fileHorsLigne'
import { Introuvable } from './pages/Introuvable'
import { useSession } from './session'

/** Pages ouvertes à un compte qui ne reçoit pas de missions (activation, état du compte, aide, preuves, file). */
const OUVERTES_SANS_MISSION = new Set(['connexion', 'compte', 'activation', 'certification', 'tournee', 'historique', 'moi', 'aide', 'messages', 'notifications', 'reglages', 'synchronisation', 'incident', 'cloture', 'appel'])

export default function App() {
  const { connecte, maintenant, etatCompte } = useSession()
  const sansMission = connecte && etatCompte !== 'actif' && etatCompte !== 'restreint'
  const accueilDuCompte = etatCompte.startsWith('en_') ? 'activation' : 'compte'
  const lieu = useLocation()
  // Hors connexion : heure des données notée ; au retour du réseau, la file part toute seule (LIV-P22).
  useReseauGlobal(connecte ? maintenant : null)
  usePrechargerVoisins(lieu.pathname)
  // Transitions directes : la navigation passe par startTransition (routeur) et la limite Suspense reste en place
  // d'un écran à l'autre (seule la garde d'erreurs repart à chaque adresse) ; tant que l'écran suivant se charge,
  // le précédent reste affiché — jamais d'écran vide entre deux pages.
  return (
    <Suspense fallback={null}>
      <GardeErreurs key={lieu.pathname}>
        <Routes>
          {Object.values(ROUTES).map(({ route, sansSession, Composant }) => (
            <Route
              key={route}
              path={chemin(route)}
              element={
                !connecte && !sansSession ? (
                  <Navigate to={chemin('connexion', { next: lieu.pathname + lieu.search })} replace />
                ) : sansMission && !OUVERTES_SANS_MISSION.has(route) ? (
                  <Navigate to={chemin(accueilDuCompte)} replace />
                ) : (
                  <Composant />
                )
              }
            />
          ))}
          {Object.keys(REDIRECTIONS).map((r) => (
            <Route key={'ancienne-' + r} path={chemin(r)} element={<AncienneAdresse route={r} />} />
          ))}
          <Route path="*" element={<Introuvable />} />
        </Routes>
      </GardeErreurs>
      {/* Appel masqué en cours : panneau flottant, réductible en bulle, hors des routes (il suit le livreur). */}
      {connecte && <AppelEnCours />}
    </Suspense>
  )
}

/** Ancienne adresse : remplacée (pas d'entrée d'historique en plus) par la page qui reprend le besoin. */
function AncienneAdresse({ route }: { route: string }) {
  const lieu = useLocation()
  const r = redirection(route, new URLSearchParams(lieu.search))!
  return <Navigate to={chemin(r.route, r.params)} replace state={lieu.state} />
}

/** Écrans voisins chargés d'avance, au repos : la barre du bas, le parent du retour et chaque lien de l'écran ouvert.
 * Un toucher ouvre alors l'écran suivant d'un coup (rien à télécharger). */
function usePrechargerVoisins(pathname: string) {
  useEffect(() => {
    const repos = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 300))
    const id = repos(() => {
      const base = import.meta.env.BASE_URL.replace(/\/$/, '')
      const ici = ROUTES[routeDe(pathname.slice(base.length))]
      const voisines = new Set<string>(['aujourdhui', 'tournee', 'messages', 'moi', 'menu'])
      if (ici?.retour) voisines.add(ici.retour)
      for (const a of document.querySelectorAll<HTMLAnchorElement>('#app a[href]')) {
        const u = new URL(a.href, location.href)
        if (u.origin === location.origin && u.pathname.startsWith(base)) voisines.add(routeDe(u.pathname.slice(base.length)))
      }
      for (const r of voisines) void precharger(r)
    })
    return () => ('cancelIdleCallback' in window ? cancelIdleCallback(id as number) : clearTimeout(id as ReturnType<typeof setTimeout>))
  }, [pathname])
}
