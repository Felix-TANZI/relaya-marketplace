// Routes de l'espace point relais : une par route déclarée dans un fichier src/pages/PR-xx/routes.ts (config/routes.ts).
// Adresse inconnue : « Ce lien ne mène à aucune page ». Sans session, toute page (sauf connexion, invitation,
// inscription, installation) renvoie à la connexion, qui ramène ensuite à la page demandée. Une route que le membre
// n'a pas le droit d'ouvrir (employé de comptoir : argent, capacité, équipe, paramètres… ; config/droits.ts) mène à
// « Accès réservé au gérant », jamais à un écran vide.
import { Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AccesReserve } from './composants/AccesReserve'
import { AppelEnCours } from './composants/AppelEnCours'
import { GardeErreurs } from './composants/Garde'
import { peutOuvrir } from './config/droits'
import { chemin, routeDe } from './config/pages'
import { ROUTES, precharger } from './config/routes'
import { useReseauGlobal } from './donnees/fileHorsLigne'
import { Introuvable } from './pages/Introuvable'
import { useSession } from './session'

export default function App() {
  const { connecte, maintenant, membre } = useSession()
  const lieu = useLocation()
  // Hors connexion : heure des données notée ; au retour du réseau, la file part toute seule (OFF-01).
  useReseauGlobal(connecte ? maintenant : null)
  usePrechargerVoisins(lieu.pathname)
  // Transitions directes : la limite Suspense reste en place d'un écran à l'autre (seule la garde d'erreurs repart à
  // chaque adresse) ; tant que l'écran suivant se charge, le précédent reste affiché — jamais d'écran vide.
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
                ) : connecte && !peutOuvrir(membre, route) ? (
                  <AccesReserve route={route} />
                ) : (
                  <Composant />
                )
              }
            />
          ))}
          <Route path="*" element={<Introuvable />} />
        </Routes>
      </GardeErreurs>
      {/* Appel masqué en cours : flottant, hors des routes (il suit le relais d'écran en écran). */}
      <AppelEnCours />
    </Suspense>
  )
}

/** Écrans voisins chargés d'avance, au repos : la barre du bas, le Menu, les liens de l'en-tête (cloche, avatar,
 * pastilles), le parent du retour et chaque lien de l'écran ouvert (feuilles comprises). Un toucher ouvre alors l'écran suivant d'un coup (rien à télécharger). */
function usePrechargerVoisins(pathname: string) {
  useEffect(() => {
    const repos = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 300))
    const id = repos(() => {
      const base = import.meta.env.BASE_URL.replace(/\/$/, '')
      const ici = ROUTES[routeDe(pathname.slice(base.length))]
      const voisines = new Set<string>(['accueil', 'reception', 'retrait', 'stock', 'menu', 'notifications', 'parametres'])
      if (ici?.retour) voisines.add(ici.retour)
      for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        const u = new URL(a.href, location.href)
        if (u.origin === location.origin && u.pathname.startsWith(base)) voisines.add(routeDe(u.pathname.slice(base.length)))
      }
      for (const r of voisines) void precharger(r)
    })
    return () => ('cancelIdleCallback' in window ? cancelIdleCallback(id as number) : clearTimeout(id as ReturnType<typeof setTimeout>))
  }, [pathname])
}
