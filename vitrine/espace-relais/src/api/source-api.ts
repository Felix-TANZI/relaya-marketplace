// Source « api » de l'espace point relais : la même interface que la démonstration (src/donnees/source.ts), servie par
// le serveur (kit backend-kit/apps/relais_compte et relais_guichet : routes /api/relay/…), même patron que le livreur :
// une fabrique par domaine (src/api/domaines/), le client HTTP partagé du site (site/src/api/client.ts). Les routes de
// chaque méthode : src/api/routes.ts (CONNECTEURS-RELAIS.md). Une méthode propre à la démonstration (geste de
// l'application du client, de l'agrégateur ou de la console) lève NonDisponible.
// Client du relais : celui du site, avec deux réglages propres au relais —
//   - l'en-tête X-Device-Id à CHAQUE requête (le serveur tient l'étape de connexion de cet appareil, CNX-04), même sur
//     une autre origine que l'API (le kit le permet dans ses en-têtes CORS) ;
//   - les listes longues servies par pages (CAP-05 : tableau + en-tête X-Next-Cursor) sont lues en entier : la page
//     suivante est demandée tant que le serveur en annonce une (PAGES_MAX pages au plus).
import { creerClient, type ClientApi } from '@client/api/client'
import { signalerReponseSpeciale } from '@client/api/reponses-speciales'
import { env } from '@client/config/env'
import type { SourceRelais } from '../donnees/source'
import { BRANCHES } from './domaines'
import { appareil } from './domaines/session'

export const PAGES_MAX = 20

/** fetch qui suit X-Next-Cursor sur une lecture paginée (GET dont le corps est un tableau) et rend le tableau entier. */
export function fetchPagine(f: typeof fetch = (...a) => fetch(...a)): typeof fetch {
  return (async (entree: RequestInfo | URL, init?: RequestInit) => {
    const rep = await f(entree, init)
    const methode = (init?.method ?? 'GET').toUpperCase()
    let curseur = rep.headers.get('x-next-cursor')
    if (methode !== 'GET' || !rep.ok || !curseur) return rep
    const premier: unknown = await rep.json()
    if (!Array.isArray(premier)) return new Response(JSON.stringify(premier), { status: rep.status, headers: rep.headers })
    const tout = [...premier]
    for (let n = 1; curseur && n < PAGES_MAX; n++) {
      const u = new URL(String(entree instanceof Request ? entree.url : entree))
      u.searchParams.set('cursor', curseur)
      const suite = await f(u.toString(), init)
      if (!suite.ok) break
      const page: unknown = await suite.json()
      if (!Array.isArray(page)) break
      tout.push(...page)
      curseur = suite.headers.get('x-next-cursor')
    }
    const h = new Headers(rep.headers)
    h.delete('x-next-cursor')
    h.delete('content-length')
    return new Response(JSON.stringify(tout), { status: rep.status, headers: h })
  }) as typeof fetch
}

/** Le client du relais, réglé par l'environnement (null sans VITE_API_URL). */
export function clientRelais(): ClientApi | null {
  if (!env.apiUrl) return null
  return creerClient({
    baseUrl: env.apiUrl,
    delaiMs: env.apiDelaiMs,
    tentatives: env.apiTentatives,
    journal: !env.production,
    appareil,
    fetch: fetchPagine(),
    surErreur: signalerReponseSpeciale,
  })
}

export function sourceApi(api: ClientApi | null = clientRelais()): SourceRelais {
  if (!api) throw new Error('VITE_SOURCE=api demande VITE_API_URL')
  return BRANCHES(api)
}
