// Session de l'espace livreur : livreur connecté sur ce téléphone, état de son compte, disponibilité, colis sous sa
// garde, Trust Score et compteurs de la coque. Lue au démarrage, relue quand les données changent (geste fait ici ou
// ailleurs) et quand l'adresse change. Tant qu'elle n'est pas arrivée, rien ne s'affiche.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { SessionLivreur } from './donnees/domaines/session'
import { source } from './donnees/source'
import { env } from '@client/config/env'
import { ecouterTempsReel } from './api/temps-reel'

const Ctx = createContext<{ session: SessionLivreur; relire: () => void } | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionLivreur | null>(null)
  const { search } = useLocation()
  const relire = useCallback(() => {
    source.session.session().then(setSession)
  }, [])
  useEffect(relire, [relire, search])
  useEffect(() => {
    window.addEventListener('blv:donnees', relire)
    return () => window.removeEventListener('blv:donnees', relire)
  }, [relire])
  // Mode API : ce qui arrive au livreur sans qu'il agisse (canal « notifications » du temps réel) fait relire les écrans.
  const connecte = !!session?.connecte
  useEffect(() => (env.source === 'api' && connecte ? ecouterTempsReel({ canal: 'notifications', espace: 'livreur' }) : undefined), [connecte])
  if (!session) return null
  return <Ctx.Provider value={{ session, relire }}>{children}</Ctx.Provider>
}

export function useSession(): SessionLivreur {
  const s = useContext(Ctx)
  if (!s) throw new Error('useSession hors de SessionProvider')
  return s.session
}

export function useRelireSession(): () => void {
  const s = useContext(Ctx)
  if (!s) throw new Error('useRelireSession hors de SessionProvider')
  return s.relire
}

/** Heure du serveur (démonstration : celle du jeu d'essai), qui avance : comptes à rebours de la tournée. */
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
