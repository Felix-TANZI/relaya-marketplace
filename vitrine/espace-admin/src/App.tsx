// Routes de la console : une par route déclarée dans un fichier src/pages/<groupe>/routes.ts (config/routes.ts).
// Sans session, toute page (sauf la connexion) renvoie à la connexion, qui ramène ensuite à la page demandée. Une page
// fermée au rôle (config/droits.ts) le dit dans la coque, sans rien montrer d'autre (la source refuse de toute façon).
// Une page cachée par un interrupteur fermé (assistant : FF-IA) renvoie à l'accueil du rôle, comme une adresse que la
// console n'a pas encore. L'accueil (File d'action) d'un rôle qui ne l'ouvre pas (agent terrain) mène à sa page
// d'arrivée. Adresse inconnue : « Ce lien ne mène à aucune page ».
import { Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Ecran } from './composants/coque'
import { AppelEnCours } from './composants/AppelEnCours'
import { GardeErreurs, Reserve } from './composants/Garde'
import { SonsDeLaConsole } from './composants/sons'
import { pageOuverte, pageOuverteNiveau, rolesDe } from './config/droits'
import { ACCUEIL, ACCUEIL_ROLE, chemin } from './config/pages'
import { ROUTES, type RouteChargee } from './config/routes'
import { Introuvable } from './pages/Introuvable'
import { sortieDemandee, useSession } from './session'

function Page({ r }: { r: RouteChargee }) {
  const { connecte, role, interrupteurs, membre } = useSession()
  const lieu = useLocation()
  if (!connecte && !r.sansSession) return <Navigate to={sortieDemandee() ? chemin('connexion') : chemin('connexion', { next: lieu.pathname + lieu.search })} replace />
  if (r.interrupteur && !interrupteurs[r.interrupteur]) return <Navigate to={chemin(ACCUEIL_ROLE[role])} replace />
  if (r.route === ACCUEIL && !pageOuverte(ACCUEIL, role)) return <Navigate to={chemin(ACCUEIL_ROLE[role]) + lieu.search} replace />
  if (!r.sansSession && !pageOuverteNiveau(r.route, role, membre?.niveau ?? null))
    return (
      <Ecran route={r.route}>
        <Reserve roles={rolesDe(r.route)} route={r.route} role={role} />
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
      <SonsDeLaConsole />
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
