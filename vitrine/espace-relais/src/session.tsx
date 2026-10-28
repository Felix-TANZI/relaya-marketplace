// Session de l'espace point relais : membre connecté sur cet appareil (gérant ou employé), son relais (ouvert,
// places, Trust Score) et compteurs de la coque. Lue au démarrage, relue quand les données changent (geste fait ici ou
// ailleurs) et quand l'adresse change. Tant qu'elle n'est pas arrivée, rien ne s'affiche.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { SessionRelais } from './donnees/domaines/session'
import { source } from './donnees/source'

const Ctx = createContext<{ session: SessionRelais; relire: () => Promise<void> } | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionRelais | null>(null)
  const { search } = useLocation()
  // Rend la lecture : l'écran qui ouvre une session l'attend avant de naviguer (avec le serveur, la session arrive
  // après un aller-retour ; sinon la garde de App.tsx verrait encore l'ancienne et renverrait à la connexion).
  const relire = useCallback(() => source.session.session().then(setSession), [])
  useEffect(() => void relire(), [relire, search])
  useEffect(() => {
    const ecouter = () => void relire()
    window.addEventListener('blv:donnees', ecouter)
    return () => window.removeEventListener('blv:donnees', ecouter)
  }, [relire])
  if (!session) return null
  return <Ctx.Provider value={{ session, relire }}>{children}</Ctx.Provider>
}

export function useSession(): SessionRelais {
  const s = useContext(Ctx)
  if (!s) throw new Error('useSession hors de SessionProvider')
  return s.session
}

export function useRelireSession(): () => Promise<void> {
  const s = useContext(Ctx)
  if (!s) throw new Error('useRelireSession hors de SessionProvider')
  return s.relire
}

/** Heure du serveur (démonstration : celle du jeu d'essai), qui avance : heure du livreur en approche, garde qui avance. */
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
