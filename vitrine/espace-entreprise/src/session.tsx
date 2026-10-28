// Session de l'espace entreprise : utilisateur connecté et son RÔLE (propriétaire, répartiteur, comptable : ENT-RG-R25),
// entreprise (état du compte, pilote, palier), compteurs de la coque. Lue au démarrage, relue quand les données
// changent (geste fait ici ou ailleurs) et quand l'adresse change (scénario « ?role=… » de la démonstration). Tant
// qu'elle n'est pas arrivée, rien ne s'affiche.
// Les écrans demandent useMontantsVisibles() avant d'écrire un montant détaillé, usePeut() avant d'offrir un geste ;
// la source refuse de toute façon (AccesRefuse).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { SessionEntreprise } from './donnees/domaines/session'
import { rolePermis, voitMontants, type Role } from './donnees/communs'
import { chemin } from './config/pages'
import { ROUTES } from './config/routes'
import { source } from './donnees/source'
import { env } from '@client/config/env'
import { ecouterTempsReel } from './api/temps-reel'

const Ctx = createContext<{ session: SessionEntreprise; relire: () => void } | null>(null)

// Déconnexion demandée : la page quittée n'est pas une « page demandée » (la connexion ne doit pas y ramener).
let sortie = false
export const sortieDemandee = () => sortie

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionEntreprise | null>(null)
  const { search } = useLocation()
  const relire = useCallback(() => {
    source.session.session().then((s) => {
      if (s.connecte) sortie = false
      setSession(s)
    })
  }, [])
  useEffect(relire, [relire, search])
  useEffect(() => {
    window.addEventListener('blv:donnees', relire)
    return () => window.removeEventListener('blv:donnees', relire)
  }, [relire])
  // Mode API : ce qui arrive à l'entreprise sans qu'elle agisse (canal « flotte » du temps réel) fait relire les écrans.
  const connecte = !!session?.connecte
  useEffect(() => (env.source === 'api' && connecte ? ecouterTempsReel({ canal: 'flotte' }) : undefined), [connecte])
  if (!session) return null
  return <Ctx.Provider value={{ session, relire }}>{children}</Ctx.Provider>
}

export function useSession(): SessionEntreprise {
  const s = useContext(Ctx)
  if (!s) throw new Error('useSession hors de SessionProvider')
  return s.session
}

export function useRelireSession(): () => void {
  const s = useContext(Ctx)
  if (!s) throw new Error('useRelireSession hors de SessionProvider')
  return s.relire
}

export const useRole = (): Role => useSession().utilisateur?.role ?? 'proprietaire'

/** Montants détaillés (à verser, règlements, montants en jeu) : propriétaire et comptable (ENT-P02R-03). */
export const useMontantsVisibles = (): boolean => voitMontants(useRole())

/** Un geste réservé : vrai si le rôle connecté fait partie des rôles permis (le gérant a aussi ceux du répartiteur). */
export function usePeut(roles: Role[]): boolean {
  return rolePermis(useRole(), roles)
}

/** Pages qu'on peut ouvrir (fiche de la route : roles) : la navigation masque les autres. */
export function useRouteOuverte(): (route: string) => boolean {
  const role = useRole()
  // Stable tant que le rôle ne change pas (dépendance d'effet sûre : la recherche relit son index au changement).
  return useCallback(
    (route: string) => {
      const r = ROUTES[route]
      return !!r && (!r.roles || rolePermis(role, r.roles))
    },
    [role],
  )
}

/** Se déconnecter : la session se ferme vraiment (source), puis la connexion. */
export function useSeDeconnecter(): () => Promise<void> {
  const naviguer = useNavigate()
  return async () => {
    sortie = true
    await source.session.deconnecter()
    naviguer(chemin('connexion'), { replace: true })
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
