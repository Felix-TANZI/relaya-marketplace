// Session de la console : l'agent connecté, ses rôles cumulés et le rôle sous lequel il agit (ADM-ROL-02), ses zones
// (ADM-ROL-03), l'espace pays, les compteurs, les interrupteurs. Lue au démarrage, relue quand les données changent et
// quand l'adresse change (« ?role=<code> » de la démonstration connecte l'agent de ce rôle). Tant qu'elle n'est pas
// arrivée, rien ne s'affiche.
// Les écrans demandent useDroit(route) avant d'offrir un geste de page, usePeut(permission) avant un geste transverse
// (démasquer, contresigner, exporter…) ; la source refuse de toute façon (AccesRefuse).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { env } from '@client/config/env'
import { useLocation, useNavigate } from 'react-router-dom'
import { niveauPermet } from './config/acces-console'
import { PERMISSIONS, droitDe, pageOuverteNiveau, type Droit, type Permission } from './config/droits'
import { chemin } from './config/pages'
import { ROUTES } from './config/routes'
import { ROLES, type CodeZone, type Role } from './donnees/communs'
import type { SessionAdmin } from './donnees/domaines/session'
import { source } from './donnees/source'

const Ctx = createContext<{ session: SessionAdmin; relire: () => void } | null>(null)

// Déconnexion demandée : la page quittée n'est pas une « page demandée » (la connexion ne doit pas y ramener).
let sortie = false
export const sortieDemandee = () => sortie

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionAdmin | null>(null)
  const { search } = useLocation()
  const relire = useCallback(() => {
    void source.session.session().then((s) => {
      if (s.connecte) sortie = false
      setSession(s)
    })
  }, [])
  // Démonstration : « ?role=finance » connecte l'agent de démonstration qui tient ce rôle (un autre compte).
  useEffect(() => {
    const q = new URLSearchParams(search)
    const r = q.get('role') as Role | null
    // « ?agent=a-linda » : un employé précis (sélecteur de la connexion, groupé par équipe).
    const ag = q.get('agent')
    // Avec le kit (mode API), chaque agent se connecte avec son accès nominatif : ces paramètres ne servent pas.
    if (env.source === 'api') relire()
    else if (ag && /^a-[a-z-]+$/.test(ag)) void source.session.changerAgent(ag).then(relire)
    else if (r && ROLES.includes(r)) void source.session.changerRole(r).then(relire)
    else relire()
  }, [relire, search])
  useEffect(() => {
    window.addEventListener('blv:donnees', relire)
    return () => window.removeEventListener('blv:donnees', relire)
  }, [relire])
  if (!session) return null
  return <Ctx.Provider value={{ session, relire }}>{children}</Ctx.Provider>
}

export function useSession(): SessionAdmin {
  const s = useContext(Ctx)
  if (!s) throw new Error('useSession hors de SessionProvider')
  return s.session
}

export function useRelireSession(): () => void {
  const s = useContext(Ctx)
  if (!s) throw new Error('useRelireSession hors de SessionProvider')
  return s.relire
}

/** Rôle sous lequel l'agent agit. */
export const useRole = (): Role => useSession().role

/** Droit du rôle courant sur une page (oui, lecture, zone, part, aucun ; note). */
export const useDroit = (route: string): Droit => droitDe(route, useRole())

/** Un geste transverse (démasquer, contresigner, exporter…) : vrai si le rôle courant l'a. */
export function usePeut(p: Permission): boolean {
  const s = useSession()
  return PERMISSIONS[p].roles.includes(s.role) && niveauPermet(p, s.membre?.niveau ?? null)
}

/** Zones de l'agent (ADM-ROL-03) ; null : tous les périmètres. */
export function usePerimetre(): CodeZone[] | null {
  const s = useSession()
  return s.role === 'operations' || s.role === 'terrain' ? (s.agent?.zones ?? null) : null
}

/** Pages qu'on peut ouvrir (droits du rôle, interrupteurs) : la navigation masque les autres. */
export function useRouteOuverte(): (route: string) => boolean {
  const { role, interrupteurs, membre } = useSession()
  const niveau = membre?.niveau ?? null
  return useCallback(
    (route: string) => {
      const r = ROUTES[route]
      return !!r && pageOuverteNiveau(route, role, niveau) && (!r.interrupteur || !!interrupteurs[r.interrupteur])
    },
    [role, interrupteurs, niveau],
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
