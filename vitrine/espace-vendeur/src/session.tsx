// Session de l'espace vendeur : membre connecté et son RÔLE (propriétaire ou accès Préparation), boutique (pastilles
// de l'en-tête), badges. Lue au démarrage, relue quand les données changent (geste fait ici ou ailleurs) et quand
// l'adresse change (scénario « ?role=prep » de la démonstration). Tant qu'elle n'est pas arrivée, rien ne s'affiche.
// Règle de fond (PLAN-VENDEUR.md, 6) : l'accès Préparation ne voit AUCUN montant et ne peut rien acheter ; les écrans
// demandent useMontantsVisibles() avant d'écrire un montant, la source ne leur en donne de toute façon pas.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { SessionVendeur } from './donnees/domaines/session'
import type { Role } from './donnees/communs'
import { DROIT_DE_ROUTE, type Droit } from './donnees/droits'
import { source } from './donnees/source'
import { env } from '@client/config/env'
import { ecouterEvenements } from './api/ecoute'

const Ctx = createContext<{ session: SessionVendeur; relire: () => Promise<void> } | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionVendeur | null>(null)
  const { search } = useLocation()
  // Rend une promesse : après une connexion, l'écran attend la session relue avant d'ouvrir la page demandée (en mode
  // API, la réponse du serveur arrive après la navigation sinon, et la garde des routes renverrait à la connexion).
  const relire = useCallback(() => source.session.session().then(setSession), [])
  useEffect(() => {
    void relire()
  }, [relire, search])
  useEffect(() => {
    const f = () => void relire()
    window.addEventListener('blv:donnees', f)
    return () => window.removeEventListener('blv:donnees', f)
  }, [relire])
  // Mode API : les gestes des autres interfaces arrivent par le flux d'événements du serveur (api/ecoute.ts).
  const connecte = !!session?.connecte
  useEffect(() => (env.source === 'api' && connecte ? ecouterEvenements() : undefined), [connecte])
  if (!session) return null
  return <Ctx.Provider value={{ session, relire }}>{children}</Ctx.Provider>
}

export function useSession(): SessionVendeur {
  const s = useContext(Ctx)
  if (!s) throw new Error('useSession hors de SessionProvider')
  return s.session
}

export function useRelireSession(): () => Promise<void> {
  const s = useContext(Ctx)
  if (!s) throw new Error('useRelireSession hors de SessionProvider')
  return s.relire
}

export const useRole = (): Role => useSession().membre?.role ?? 'proprietaire'

/** Montants visibles : jamais pour l'accès Préparation (DP-55, VD-02 p8). */
export const useMontantsVisibles = (): boolean => useRole() === 'proprietaire'

/** Un droit de l'accès employé (src/donnees/droits.ts) : le propriétaire les a tous. Les écrans masquent un bouton ou
 *  disent « Réservé » sans lui ; la source refuse de toute façon. */
export function useDroit(d: Droit): boolean {
  const m = useSession().membre
  return !m || m.role === 'proprietaire' || m.droits.includes(d)
}

/** Pages qu'on peut ouvrir (DROIT_DE_ROUTE) : les entrées de navigation sans le droit sont masquées à l'employé. */
export function useRouteOuverte(): (route: string) => boolean {
  const m = useSession().membre
  return (route) => {
    const d = DROIT_DE_ROUTE[route]
    return !d || !m || m.role === 'proprietaire' || m.droits.includes(d)
  }
}

/** Heure du serveur (démonstration : celle du jeu d'essai), qui avance : comptes à rebours des écrans. */
export function useHorloge(pasMs = 30_000): number {
  const s = useSession()
  const [decalage] = useState(() => s.maintenant - Date.now())
  const [n, setN] = useState(() => Date.now() + decalage)
  useEffect(() => {
    const id = setInterval(() => setN(Date.now() + decalage), pasMs)
    return () => clearInterval(id)
  }, [decalage, pasMs])
  return n
}
