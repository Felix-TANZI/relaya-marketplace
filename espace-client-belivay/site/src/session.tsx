// Session lue au démarrage : client, relais habituel, badges, interrupteurs (GET /config/flags, CCH-18).
// Tant qu'elle n'est pas arrivée, l'application n'affiche rien (pas d'écran faux, même un instant).
// Un profil enregistré (DP-52) remplace le client de la session : nom et photo changent partout aussitôt ;
// une connexion ou une déconnexion (DP-53) remplace la session. Type de compte et devise d'affichage : DP-54.
import { Fragment, createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { source, type Client, type Session } from './donnees/source'
import { reglerDevise } from './i18n/format'

const Ctx = createContext<{ session: Session; majClient: (c: Client) => void; majSession: (s: Session) => void } | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  useEffect(() => {
    let vivant = true
    source.session().then((s) => vivant && setSession(s))
    return () => {
      vivant = false
    }
  }, [])
  if (!session) return null
  const majClient = (client: Client) => setSession((s) => (s ? { ...s, client } : s))
  // Devise d'affichage (DP-54) : celle du compte diaspora, F CFA pour tout autre compte. Posée avant le rendu ;
  // un changement de devise redessine tout le site (chaque prix passe par F()).
  const devise = session.typeCompte === 'diaspora' ? (session.devise ?? 'XAF') : 'XAF'
  reglerDevise(devise)
  return (
    <Ctx.Provider value={{ session, majClient, majSession: setSession }}>
      <Fragment key={devise}>{children}</Fragment>
    </Ctx.Provider>
  )
}

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
