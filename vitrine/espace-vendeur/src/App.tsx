// Routes de l'espace vendeur : une par route déclarée dans un fichier src/pages/VD-xx/routes.ts (config/routes.ts).
// Écran retiré (démonstrations du prototype) : « Écran retiré » ; adresse inconnue : « Ce lien ne mène à aucune page ».
// Sans session (déconnecté), toute page renvoie à la connexion, qui ramène ensuite à la page demandée.
import { Suspense, useLayoutEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { GardeErreurs } from './composants/Garde'
import { PAGES, chemin } from './config/pages'
import { ROUTES } from './config/routes'
import { Introuvable } from './pages/Introuvable'
import { useReseauGlobal } from './donnees/fileHorsLigne'
import { useSession } from './session'

// Pages ouvertes sans être connecté (accès et ouverture de la boutique, VD-03).
const SANS_SESSION = new Set(['connexion', 'ouvrir', 'otp', 'lancement', 'faceid', 'bienvenue_client', 'installer'])

// Démonstration : le scénario « ?role=prep » (accès Préparation) suit le vendeur d'écran en écran. Un lien de
// l'application qui ne le porte pas le reprend, avant l'affichage (aucun montant ne paraît). En production, le rôle
// vient de la session.
function useRoleConserve() {
  const lieu = useLocation()
  const naviguer = useNavigate()
  const avant = useRef<string | null>(null)
  useLayoutEffect(() => {
    const p = new URLSearchParams(lieu.search)
    if (avant.current === 'prep' && !p.has('role') && lieu.pathname !== chemin('connexion')) {
      p.set('role', 'prep')
      naviguer({ pathname: lieu.pathname, search: '?' + p.toString(), hash: lieu.hash }, { replace: true, state: lieu.state })
      return
    }
    avant.current = p.get('role')
  }, [lieu, naviguer])
}

export default function App() {
  const { connecte, maintenant } = useSession()
  const lieu = useLocation()
  // Hors connexion : heure des données notée ; au retour du réseau, la file part toute seule (VD04-R14, Q-93).
  useReseauGlobal(connecte ? maintenant : null)
  useRoleConserve()
  return (
    <GardeErreurs key={lieu.pathname}>
      <Suspense fallback={null}>
        <Routes>
          {Object.values(ROUTES).map(({ route, Composant }) => (
            <Route
              key={route}
              path={chemin(route)}
              element={
                connecte || SANS_SESSION.has(route) ? (
                  <Composant />
                ) : (
                  <Navigate to={chemin('connexion', { next: lieu.pathname + lieu.search })} replace />
                )
              }
            />
          ))}
          {PAGES.filter((p) => p.statut === 'retiré').map((p) => (
            <Route key={p.route} path={chemin(p.route)} element={<Introuvable retire />} />
          ))}
          <Route path="*" element={<Introuvable />} />
        </Routes>
      </Suspense>
    </GardeErreurs>
  )
}
