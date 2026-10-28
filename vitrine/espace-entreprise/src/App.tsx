// Routes de l'espace entreprise : une par route déclarée dans un fichier src/pages/ENT-xx/routes.ts (config/routes.ts).
// Sans session, toute page (sauf la connexion) renvoie à la connexion, qui ramène ensuite à la page demandée. Une page
// réservée à d'autres rôles (fiche de la route : roles, ENT-RG-R25) le dit dans la coque, sans rien montrer d'autre.
// Adresse inconnue : « Ce lien ne mène à aucune page ».
import { Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Ecran } from './composants/coque'
import { AppelEnCours } from './composants/AppelEnCours'
import { GardeErreurs, Reserve } from './composants/Garde'
import { chemin } from './config/pages'
import { ROUTES, type RouteChargee } from './config/routes'
import { Introuvable } from './pages/Introuvable'
import { sortieDemandee, useRole, useSession } from './session'

function Page({ r }: { r: RouteChargee }) {
  const { connecte } = useSession()
  const role = useRole()
  const lieu = useLocation()
  if (!connecte && !r.sansSession) return <Navigate to={sortieDemandee() ? chemin('connexion') : chemin('connexion', { next: lieu.pathname + lieu.search })} replace />
  if (r.roles && !r.roles.includes(role))
    return (
      <Ecran route={r.route}>
        <Reserve roles={r.roles} />
      </Ecran>
    )
  return <r.Composant />
}

// Premier chargement d'un écran pas encore préchargé (rare) : le fond de la coque, sans rien d'autre, jamais un noir.
function Attente() {
  return <div className="attente" aria-busy="true" style={{ minHeight: '100vh', background: 'var(--sand)' }} />
}

export default function App() {
  const lieu = useLocation()
  return (
    <>
    <GardeErreurs cle={lieu.pathname}>
      {/* Navigation en transition (routeur) : la page ouverte reste à l'écran tant que la suivante se charge ; les
          écrans sont de plus préchargés au repos (main.tsx) et au survol ou au toucher d'un lien (Precharge). */}
      <Suspense fallback={<Attente />}>
        <Routes>
          {Object.values(ROUTES).map((r) => (
            <Route key={r.route} path={chemin(r.route)} element={<Page r={r} />} />
          ))}
          <Route path="*" element={<Introuvable />} />
        </Routes>
      </Suspense>
    </GardeErreurs>
    {/* Appel masqué en cours : flottant, hors des routes et de la garde (il survit au changement de page). */}
    <AppelEnCours />
    </>
  )
}
