// Session lue au démarrage : client, relais habituel, badges, interrupteurs (GET /config/flags, CCH-18).
// Tant qu'elle n'est pas arrivée, l'application n'affiche rien (pas d'écran faux, même un instant).
// Un profil enregistré (DP-52) remplace le client de la session : nom et photo changent partout aussitôt ;
// une connexion ou une déconnexion (DP-53) remplace la session. Type de compte et devise d'affichage : DP-54.
import { Fragment, createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { source, type Client, type Session } from './donnees/source'
import { reglerDevise } from './i18n/format'

const Ctx = createContext<{ session: Session; majClient: (c: Client) => void; majSession: (s: Session) => void } | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  // Changement de compte : un autre compte connecté remplace celui qui l'était (pas une première connexion, ni un
  // profil modifié) ; tout ce qui dépend du compte (panier, favoris, adresses, devise, proche actif, pages déjà
  // chargées) est alors relu depuis zéro, jamais l'état de l'ancien compte.
  const [generation, setGeneration] = useState(0)
  const dernier = useRef<string | null>(null)
  useEffect(() => {
    let vivant = true
    source.session().then((s) => {
      if (!vivant) return
      setSession(s)
      dernier.current = cleSession(s)
    })
    // Un favori ajouté ou retiré, de n'importe quel écran : la pastille de l'onglet suit tout de suite.
    const favori = () => void source.session().then((s) => vivant && setSession(s))
    window.addEventListener('blv:favori', favori)
    return () => {
      vivant = false
      window.removeEventListener('blv:favori', favori)
    }
  }, [])
  if (!session) return null
  // Profil modifié (e-mail compris) : même compte.
  const majClient = (client: Client) => {
    if (dernier.current) dernier.current = client.email.trim().toLowerCase()
    setSession((s) => (s ? { ...s, client } : s))
  }
  const majSession = (s: Session) => {
    const k = cleSession(s)
    if (k && dernier.current && k !== dernier.current) setGeneration((g) => g + 1)
    if (k) dernier.current = k
    setSession(s)
  }
  // Devise d'affichage (DP-54) : celle du compte diaspora, F CFA pour tout autre compte. Posée avant le rendu ;
  // un changement de devise redessine tout le site (chaque prix passe par F()).
  const devise = session.typeCompte === 'diaspora' ? (session.devise ?? 'XAF') : 'XAF'
  reglerDevise(devise)
  return (
    <Ctx.Provider value={{ session, majClient, majSession }}>
      <Fragment key={devise + '|' + generation}>{children}</Fragment>
    </Ctx.Provider>
  )
}

// Le compte connecté d'une session : son e-mail (null : visiteur).
const cleSession = (s: Session) => (s.connecte && s.client ? s.client.email.trim().toLowerCase() : null)

export function useSession(): Session {
  const s = useContext(Ctx)
  if (!s) throw new Error('useSession hors de SessionProvider')
  return s.session
}

export function useMajClient(): (c: Client) => void {
  const s = useContext(Ctx)
  if (!s) throw new Error('useMajClient hors de SessionProvider')
  return s.majClient
}

// Connexion, déconnexion (DP-53) : la session entière change (client, relais, badges).
export function useMajSession(): (s: Session) => void {
  const s = useContext(Ctx)
  if (!s) throw new Error('useMajSession hors de SessionProvider')
  return s.majSession
}

// Compte diaspora (DP-54) : le site s'adapte (menus, accueil, panier, paiement, commandes, compte).
export function useCompteDiaspora(): boolean {
  const s = useContext(Ctx)
  return !!s?.session.connecte && s.session.typeCompte === 'diaspora'
}
