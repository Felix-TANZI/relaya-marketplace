// Temps réel en mode API (VITE_SOURCE=api) : le canal « notifications » du livreur (backend-kit/apps/temps_reel)
// porte ce qui lui arrive sans qu'il agisse (paquet affecté par son entreprise, dépôt confirmé par le relais, décision
// d'un incident, message, décision de son employeur). Un événement fait relire les écrans (« blv:donnees », comme le
// pont de la démonstration), au plus une fois par seconde.
//   1. POST /api/realtime/ticket {canal} → {flux, repli, intervalleS} (ticket court, lié au compte et à l'appareil) ;
//   2. flux SSE (GET /api/realtime/stream?ticket=…) lu par fetch (les événements sont nommés par leur type) ; à
//      « event: fin », à une coupure ou à l'expiration, nouveau ticket et reprise après le dernier id reçu ;
//   3. repli : sans flux lisible (trois échecs de suite), interrogation de /api/realtime/events?apres=<curseur> toutes
//      les intervalleS secondes.
// Rien ne part sans session ; l'écoute s'arrête à la déconnexion (rendu de ecouterTempsReel).
import { clientDeLEnvironnement } from '@client/api/client'
import { env } from '@client/config/env'
import { prevenir } from './outils'

interface Ticket {
  flux: string
  repli: string
  intervalleS: number
}

const ATTENTE_MS = 3_000
const ECHECS_AVANT_REPLI = 3

/** Démarre l'écoute du canal ; rend la fonction qui l'arrête. */
export function ecouterTempsReel(corps: { canal: string; espace?: string }): () => void {
  const api = clientDeLEnvironnement()
  if (!api || !env.apiUrl || typeof window === 'undefined' || typeof fetch !== 'function') return () => undefined
  const origine = new URL(env.apiUrl, window.location.href).origin
  let fini = false
  let dernier: string | null = null
  let echecs = 0
  let controle: AbortController | null = null
  let minuterie: number | null = null
  let derniereRelecture = 0
  let relectureDiff: number | null = null

  const relire = () => {
    const t = Date.now()
    if (t - derniereRelecture >= 1_000) {
      derniereRelecture = t
      prevenir('temps-reel')
    } else if (relectureDiff === null) {
      relectureDiff = window.setTimeout(() => ((relectureDiff = null), (derniereRelecture = Date.now()), prevenir('temps-reel')), 1_000)
    }
  }
  const attendre = (ms: number) => new Promise<void>((ok) => (minuterie = window.setTimeout(ok, ms)))

  async function ticket(): Promise<Ticket | null> {
    if (!api!.jetons.lire()) return null
    try {
      return await api!.post<Ticket>('/realtime/ticket', corps)
    } catch {
      return null
    }
  }

  /** Lit le flux SSE jusqu'à « fin » ou coupure ; rend vrai si au moins un octet est arrivé. */
  async function lireFlux(t: Ticket): Promise<boolean> {
    controle = new AbortController()
    const url = origine + t.flux + (dernier ? '&lastEventId=' + encodeURIComponent(dernier) : '')
    const r = await fetch(url, { headers: { Accept: 'text/event-stream' }, signal: controle.signal })
    if (!r.ok || !r.body) return false
    const lecteur = r.body.getReader()
    const dec = new TextDecoder()
    let tampon = ''
    let recu = false
    for (;;) {
      const { value, done } = await lecteur.read()
      if (done) return recu
      recu = true
      tampon += dec.decode(value, { stream: true })
      let i: number
      while ((i = tampon.indexOf('\n\n')) >= 0) {
        const bloc = tampon.slice(0, i)
        tampon = tampon.slice(i + 2)
        let id: string | null = null
        let type: string | null = null
        for (const ligne of bloc.split('\n')) {
          if (ligne.startsWith('id:')) id = ligne.slice(3).trim()
          else if (ligne.startsWith('event:')) type = ligne.slice(6).trim()
        }
        if (id) dernier = id
        if (type === 'fin') {
          await lecteur.cancel().catch(() => undefined)
          return recu
        }
        if (type) relire()
      }
    }
  }

  async function interroger(t: Ticket) {
    // Repli : /events?apres=<curseur> (sans curseur : celui de maintenant, rien à relire).
    const r = await fetch(origine + t.repli + (dernier ? '&apres=' + encodeURIComponent(dernier) : ''), { headers: { Accept: 'application/json' } })
    if (!r.ok) throw new Error(String(r.status))
    const x = (await r.json()) as { evenements: unknown[]; curseur: string }
    if (dernier !== null && x.evenements.length) relire()
    dernier = x.curseur
  }

  async function boucle() {
    while (!fini) {
      const t = await ticket()
      if (fini) return
      if (!t) {
        await attendre(ATTENTE_MS * 5)
        continue
      }
      try {
        if (echecs >= ECHECS_AVANT_REPLI) {
          await interroger(t)
          await attendre(Math.max(5, t.intervalleS) * 1_000)
        } else {
          const recu = await lireFlux(t)
          echecs = recu ? 0 : echecs + 1
          if (!recu) await attendre(ATTENTE_MS)
        }
      } catch {
        if (fini) return
        echecs += 1
        await attendre(ATTENTE_MS)
      }
    }
  }
  void boucle()
  return () => {
    fini = true
    controle?.abort()
    if (minuterie !== null) window.clearTimeout(minuterie)
    if (relectureDiff !== null) window.clearTimeout(relectureDiff)
  }
}
