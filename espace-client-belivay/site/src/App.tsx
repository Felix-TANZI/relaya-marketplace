// Routes du site : une par page de l'inventaire (logique-metier/pages.json), sauf le plan du prototype.
// Une page dont l'interrupteur est fermé n'a pas de route (CFS-02) : son adresse ouvre « Ce lien ne mène
// à aucune page » (CCH-19), comme toute adresse inconnue (CNV-13).
import { Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { EXIGE_COMPTE, PAGES, chemin } from './config/pages'
import { GardeErreurs } from './composants/Garde'
import { Introuvable } from './pages/Introuvable'
import { Menu } from './pages/Menu'
import { PageProvisoire } from './pages/PageProvisoire'
import { ECRANS } from './pages/registre'
import { HORS_DIASPORA } from './composants/PourQui'
import { useCompteDiaspora, useSession } from './session'

// Écrans déjà construits ; les autres routes ont une page provisoire jusqu'à ce que leur document soit construit.
const ECRANS_CONSTRUITS: Record<string, React.ComponentType> = { menu: Menu, ...ECRANS }

// Écran qui plante, ou fichier d'un document qui n'arrive pas (réseau coupé) : « Quelque chose s'est mal passé »,
// Recharger et l'Aide (composants/Garde.tsx), l'erreur part au suivi ; l'ouverture d'une autre adresse réessaie
// (pages/registre.ts ne garde pas un chargement manqué).

// Page du compte sans session : la connexion, qui ramène ici ensuite (DP-53, CAC-29).
function AvecCompte({ children }: { children: ReactNode }) {
  const { connecte } = useSession()
  const lieu = useLocation()
  if (connecte) return <>{children}</>
  return <Navigate to={chemin('connexion', { next: lieu.pathname + lieu.search })} replace />
}

// Compte diaspora (DP-54) : une page qu'il n'utilise pas le ramène à son espace, avec la raison (HORS_DIASPORA). Le
// suivi d'une commande mène au suivi « pour un proche » ; le sélecteur de relais, au choix « Pour qui ? ».
function PourDiaspora({ route, children }: { route: string; children: ReactNode }) {
  const diaspora = useCompteDiaspora()
  const { proche } = useSession()
  const lieu = useLocation()
  if (!diaspora) return <>{children}</>
  const q = new URLSearchParams(lieu.search)
  if ((route === 'commande' || route === 'suivi') && q.get('ref')) return <Navigate to={chemin('commander-pour', { suivi: q.get('ref')! })} replace />
  if (route === 'relais-selecteur') {
    if (!proche) return <Navigate to={chemin('proches')} replace />
    const [r, rq] = (q.get('retour') ?? '').replace(/^\/+/, '').split('?')
    const p = new URLSearchParams(rq)
    p.set('sheet', 'pour-qui')
    return <Navigate to={chemin(r || 'accueil') + '?' + p.toString()} replace />
  }
  // Seule exception : le relais où il passera au Cameroun, pour une liste d'envies « à moi » (ListeEnvoyer).
  if (route === 'relais-choix' && (q.get('retour') ?? '').startsWith('liste-envoyer')) return <>{children}</>
  if (HORS_DIASPORA[route]) return <Navigate to={chemin('espace-diaspora', { hors: route })} replace />
  return <>{children}</>
}

// Lien court d'une liste d'envies (DP-54) : « belivay.com/l/<code> », celui de l'image de statut et de son QR code,
// ouvre la page publique de la liste (sans compte) ; un paramètre (?devise=EUR) suit.
function LienCourt() {
  const { code = '' } = useParams()
  const lieu = useLocation()
  const q = new URLSearchParams(lieu.search)
  q.set('l', code)
  return <Navigate to={chemin('liste-publique') + '?' + q.toString()} replace />
}

// Première visite (consigne du porteur) : le nouveau visiteur, quel que soit son profil, arrive d'abord sur le
// parcours d'accueil — lancement, ouverture « BelivaY » et Commencer, langue, centres d'intérêt, puis compte
// (dont « S'inscrire en tant que diaspora »). Une seule fois par appareil (blv_arrivee, posé par Lancement).
// Navigateur piloté (tests) : pas de détour, sauf si blv_arrivee_test vaut « 1 ».
function premiereVisite(): boolean {
  try {
    if (localStorage.getItem('blv_arrivee')) return false
    if (navigator.webdriver && localStorage.getItem('blv_arrivee_test') !== '1') return false
    return true
  } catch {
    return false
  }
}

export default function App() {
  const { interrupteurs } = useSession()
  const ouvertes = PAGES.filter((p) => !p.interrupteur || interrupteurs[p.interrupteur])
  // Le temps de charger le fichier d'un document, rien n'est affiché (pas d'écran faux, même un instant).
  const adresse = useLocation().pathname
  if (adresse === chemin('accueil') && premiereVisite()) return <Navigate to={chemin('lancement')} replace />
  return (
    <GardeErreurs key={adresse}>
    <Suspense fallback={null}>
    <Routes>
      {ouvertes.map((p) => {
        const Construit = ECRANS_CONSTRUITS[p.route]
        const ecran = <PourDiaspora route={p.route}>{Construit ? <Construit /> : <PageProvisoire page={p} />}</PourDiaspora>
        return <Route key={p.route} path={chemin(p.route)} element={EXIGE_COMPTE.has(p.route) ? <AvecCompte>{ecran}</AvecCompte> : ecran} />
      })}
      <Route path="/accueil" element={<Navigate to={chemin('accueil')} replace />} />
      <Route path="/l/:code" element={<LienCourt />} />
      <Route path="*" element={<Introuvable />} />
    </Routes>
    </Suspense>
    </GardeErreurs>
  )
}
