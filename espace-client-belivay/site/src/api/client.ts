// Client HTTP de l'API BelivaY (relaya-marketplace : Django REST Framework + simplejwt).
//
// - base URL (VITE_API_URL, préfixe /api compris), JSON dans les deux sens, FormData pour les photos ;
// - délai d'expiration par requête (VITE_API_DELAI_MS) ;
// - nouvelles tentatives sur les lectures (GET) seulement, jamais sur une écriture : une écriture rejouée peut
//   débiter deux fois ; panne réseau, délai, 502, 503, 504 ou 429 (avec Retry-After), attente croissante ;
// - Authorization: Bearer <accès> ; sur un 401, un seul rafraîchissement à la fois (POST /auth/refresh/ de
//   relaya, simplejwt avec ROTATE_REFRESH_TOKENS : le serveur renvoie aussi un nouveau jeton de
//   rafraîchissement), puis la requête est rejouée une fois ; si le rafraîchissement échoue, les jetons sont
//   effacés et surSessionPerdue() est appelée ;
// - Idempotency-Key sur les paiements et toute action d'argent (CAP-03) : même clé pour la même intention ;
// - Accept-Language (CAP-08) : la langue de la page (document.documentElement.lang, posée par preferences.tsx) ;
// - X-Device-Id (CAP-02) : identifiant de l'appareil, pour le panier d'un visiteur (même origine seulement, voir plus bas) ;
// - erreurs typées (src/api/erreurs.ts) ;
// - journal des requêtes hors production (méthode, chemin, statut, durée ; jamais les corps ni les jetons).
import { env } from '../config/env'
import { ErreurApi, ErreurDelai, ErreurNonAuthentifie, ErreurReseau, ErreurTropDeRequetes, erreurDeReponse } from './erreurs'
import { signalerReponseSpeciale } from './reponses-speciales'

export type Methode = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface Jetons {
  acces: string
  rafraichissement: string | null
}

/** Où vivent les jetons. Par défaut : localStorage si « Se souvenir de moi », sinon sessionStorage. */
export interface StockageJetons {
  lire(): Jetons | null
  ecrire(j: Jetons | null, persistant?: boolean): void
}

const CLE_JETONS = 'blv_api_jetons'

function stockageNavigateur(): StockageJetons {
  const zones = (): Storage[] => {
    const z: Storage[] = []
    try {
      if (typeof localStorage !== 'undefined') z.push(localStorage)
    } catch {
      /* accès refusé (navigation privée) */
    }
    try {
      if (typeof sessionStorage !== 'undefined') z.push(sessionStorage)
    } catch {
      /* idem */
    }
    return z
  }
  let memoire: Jetons | null = null
  return {
    lire() {
      for (const s of zones()) {
        try {
          const v = s.getItem(CLE_JETONS)
          if (v) return JSON.parse(v) as Jetons
        } catch {
          /* valeur illisible : ignorée */
        }
      }
      return memoire
    },
    ecrire(j, persistant) {
      memoire = j
      const [local, session] = [(() => { try { return localStorage } catch { return null } })(), (() => { try { return sessionStorage } catch { return null } })()]
      // Un rafraîchissement garde l'emplacement d'origine (persistant non précisé).
      const garderLocal = persistant ?? (() => { try { return local?.getItem(CLE_JETONS) != null } catch { return false } })()
      for (const s of [local, session]) {
        try {
          s?.removeItem(CLE_JETONS)
        } catch {
          /* rien */
        }
      }
      if (!j) return
      try {
        ;(garderLocal ? local : session)?.setItem(CLE_JETONS, JSON.stringify(j))
      } catch {
        /* stockage plein ou refusé : les jetons restent en mémoire pour cette page */
      }
    },
  }
}

/** Stockage en mémoire (tests, ou appareil qui refuse le stockage). */
export function stockageMemoire(initial: Jetons | null = null): StockageJetons {
  let j = initial
  return { lire: () => j, ecrire: (n) => void (j = n) }
}

export interface OptionsClient {
  baseUrl: string
  delaiMs?: number
  tentatives?: number
  stockage?: StockageJetons
  /** fetch à utiliser (tests : fetch simulé). */
  fetch?: typeof fetch
  /** Attente entre deux tentatives (tests : attente nulle). */
  attendre?: (ms: number) => Promise<void>
  langue?: () => string
  appareil?: () => string | null
  journal?: boolean
  /** Route de rafraîchissement, relative à baseUrl (relaya : /auth/refresh/). */
  routeRafraichissement?: string
  /** Appelée quand la session est perdue (rafraîchissement refusé) : l'interface renvoie vers la connexion. */
  surSessionPerdue?: () => void
  /** Appelée pour chaque erreur levée (après les nouvelles tentatives) : réponses spéciales (src/api/reponses-speciales.ts). */
  surErreur?: (e: ErreurApi, requete: { methode: Methode; chemin: string }) => void
}

export interface OptionsRequete {
  methode?: Methode
  corps?: unknown
  query?: Record<string, string | number | boolean | null | undefined>
  /** Clé d'idempotence : une chaîne fixe pour une même intention (paiement : commande + n° de tentative), ou true pour en tirer une. */
  idempotence?: string | true
  /** Requête sans jeton (connexion, inscription, pages publiques). */
  anonyme?: boolean
  signal?: AbortSignal
  delaiMs?: number
  tentatives?: number
  enTetes?: Record<string, string>
}

export interface ClientApi {
  requete<T>(chemin: string, o?: OptionsRequete): Promise<T>
  get<T>(chemin: string, o?: Omit<OptionsRequete, 'methode' | 'corps'>): Promise<T>
  post<T>(chemin: string, corps?: unknown, o?: Omit<OptionsRequete, 'methode' | 'corps'>): Promise<T>
  put<T>(chemin: string, corps?: unknown, o?: Omit<OptionsRequete, 'methode' | 'corps'>): Promise<T>
  patch<T>(chemin: string, corps?: unknown, o?: Omit<OptionsRequete, 'methode' | 'corps'>): Promise<T>
  supprimer<T = void>(chemin: string, o?: Omit<OptionsRequete, 'methode'>): Promise<T>
  jetons: {
    lire(): Jetons | null
    ecrire(j: Jetons | null, persistant?: boolean): void
    /** Rafraîchit maintenant (une seule requête à la fois) ; vrai si un nouveau jeton d'accès est obtenu. */
    rafraichir(): Promise<boolean>
  }
}

/** Clé d'idempotence aléatoire (UUID v4). */
export function cleIdempotence(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c?.randomUUID) return c.randomUUID()
  const o = new Uint8Array(16)
  if (c?.getRandomValues) c.getRandomValues(o)
  else for (let i = 0; i < 16; i++) o[i] = Math.floor(Math.random() * 256)
  o[6] = (o[6] & 0x0f) | 0x40
  o[8] = (o[8] & 0x3f) | 0x80
  const h = [...o].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function langueDeLaPage(): string {
  try {
    const l = typeof document !== 'undefined' ? document.documentElement.lang : ''
    return l === 'en' ? 'en, fr;q=0.8' : 'fr'
  } catch {
    return 'fr'
  }
}

function appareilParDefaut(): string | null {
  try {
    let id = localStorage.getItem('blv_appareil')
    if (!id) {
      id = cleIdempotence()
      localStorage.setItem('blv_appareil', id)
    }
    return id
  } catch {
    return null
  }
}

const RELIRE = new Set([502, 503, 504])
const attenteParDefaut = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function creerClient(o: OptionsClient): ClientApi {
  const base = o.baseUrl.replace(/\/+$/, '')
  const delaiDefaut = o.delaiMs ?? 15_000
  const tentativesDefaut = o.tentatives ?? 2
  const stockage = o.stockage ?? stockageNavigateur()
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a))
  const attendre = o.attendre ?? attenteParDefaut
  const langue = o.langue ?? langueDeLaPage
  // X-Device-Id n'est pas dans les en-têtes CORS permis par relaya (vérifié le 4 oct. 2026) : sur une autre origine
  // que l'API, le navigateur bloquerait toutes les requêtes. Envoyé seulement quand le site et l'API partagent
  // l'origine (pas de contrôle CORS), ou quand l'appelant le demande.
  const memeOrigine = !/^https?:\/\//.test(base) || (typeof location !== 'undefined' && base.startsWith(location.origin))
  const appareil = o.appareil ?? (memeOrigine ? appareilParDefaut : () => null)
  const journal = o.journal ?? false
  const routeRafraichissement = o.routeRafraichissement ?? '/auth/refresh/'

  const url = (chemin: string, query?: OptionsRequete['query']) => {
    const u = /^https?:\/\//.test(chemin) ? chemin : `${base}${chemin.startsWith('/') ? '' : '/'}${chemin}`
    if (!query) return u
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) q.set(k, String(v))
    const s = q.toString()
    return s ? `${u}${u.includes('?') ? '&' : '?'}${s}` : u
  }

  const log = (methode: string, chemin: string, issue: string, debut: number) => {
    if (journal) console.debug(`[api] ${methode} ${chemin} → ${issue} (${Math.round(performance.now() - debut)} ms)`)
  }

  // Un appel réseau, avec délai d'expiration ; renvoie la Response ou lève ErreurReseau / ErreurDelai.
  async function envoyer(adresse: string, init: RequestInit, delaiMs: number, signal?: AbortSignal): Promise<Response> {
    const ctrl = new AbortController()
    let expire = false
    const minuteur = setTimeout(() => {
      expire = true
      ctrl.abort()
    }, delaiMs)
    const relayer = () => ctrl.abort()
    signal?.addEventListener('abort', relayer, { once: true })
    try {
      return await f(adresse, { ...init, signal: ctrl.signal })
    } catch (e) {
      if (expire) throw new ErreurDelai(delaiMs)
      if (signal?.aborted) throw e // annulé par l'appelant : on laisse passer l'AbortError
      throw new ErreurReseau(undefined, e)
    } finally {
      clearTimeout(minuteur)
      signal?.removeEventListener('abort', relayer)
    }
  }

  async function lireCorps(r: Response): Promise<unknown> {
    if (r.status === 204 || r.status === 205) return undefined
    const t = await r.text()
    if (!t) return undefined
    if ((r.headers.get('content-type') ?? '').includes('json')) {
      try {
        return JSON.parse(t)
      } catch {
        return t
      }
    }
    return t
  }

  // Rafraîchissement unique : plusieurs 401 simultanés attendent la même promesse.
  let enCours: Promise<boolean> | null = null
  function rafraichir(): Promise<boolean> {
    if (enCours) return enCours
    enCours = (async () => {
      const j = stockage.lire()
      if (!j?.rafraichissement) return false
      const debut = performance.now()
      try {
        const r = await envoyer(
          url(routeRafraichissement),
          { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ refresh: j.rafraichissement }) },
          delaiDefaut,
        )
        log('POST', routeRafraichissement, String(r.status), debut)
        if (!r.ok) {
          // 401/400 : jeton de rafraîchissement expiré ou révoqué ; la session est perdue.
          if (r.status === 401 || r.status === 400 || r.status === 403) {
            stockage.ecrire(null)
            o.surSessionPerdue?.()
          }
          return false
        }
        const c = (await lireCorps(r)) as { access?: string; refresh?: string } | undefined
        if (!c?.access) return false
        stockage.ecrire({ acces: c.access, rafraichissement: c.refresh ?? j.rafraichissement })
        return true
      } catch {
        return false // panne réseau : la session n'est pas perdue, la requête échouera avec son 401
      }
    })().finally(() => {
      enCours = null
    })
    return enCours
  }

  async function requete<T>(chemin: string, r: OptionsRequete = {}): Promise<T> {
    const methode = r.methode ?? 'GET'
    const lecture = methode === 'GET'
    const maxTentatives = lecture ? (r.tentatives ?? tentativesDefaut) : 0
    const delaiMs = r.delaiMs ?? delaiDefaut
    const adresse = url(chemin, r.query)
    const formulaire = typeof FormData !== 'undefined' && r.corps instanceof FormData
    const cle = r.idempotence === true ? cleIdempotence() : r.idempotence

    const entetes = (): Record<string, string> => {
      const h: Record<string, string> = { Accept: 'application/json', 'Accept-Language': langue(), ...r.enTetes }
      if (r.corps !== undefined && !formulaire) h['Content-Type'] = 'application/json'
      if (cle) h['Idempotency-Key'] = cle
      const a = appareil()
      if (a) h['X-Device-Id'] = a
      if (!r.anonyme) {
        const j = stockage.lire()
        if (j?.acces) h.Authorization = `Bearer ${j.acces}`
      }
      return h
    }
    const corps = r.corps === undefined ? undefined : formulaire ? (r.corps as FormData) : JSON.stringify(r.corps)

    let rafraichi = false
    for (let essai = 0; ; essai++) {
      const debut = performance.now()
      let rep: Response
      try {
        const h = entetes()
        rep = await envoyer(adresse, { method: methode, headers: h, body: corps }, delaiMs, r.signal)
      } catch (e) {
        log(methode, chemin, e instanceof ErreurApi ? e.genre : 'annulé', debut)
        if (e instanceof ErreurApi && essai < maxTentatives) {
          await attendre(300 * 2 ** essai)
          continue
        }
        if (e instanceof ErreurApi) o.surErreur?.(e, { methode, chemin })
        throw e
      }
      log(methode, chemin, String(rep.status), debut)

      if (rep.ok) return (await lireCorps(rep)) as T

      // 401 : jeton d'accès expiré ; un rafraîchissement, puis la même requête une fois.
      if (rep.status === 401 && !r.anonyme && !rafraichi && stockage.lire()?.rafraichissement) {
        rafraichi = true
        if (await rafraichir()) {
          essai-- // le rejeu après rafraîchissement ne compte pas comme une tentative
          continue
        }
        const e = erreurDeReponse(401, await lireCorps(rep), null) as ErreurNonAuthentifie
        o.surErreur?.(e, { methode, chemin })
        throw e
      }
      // 401 sans jeton de rafraîchissement (ou déjà rejouée) alors qu'une session était ouverte : session perdue.
      if (rep.status === 401 && !r.anonyme && stockage.lire()) {
        stockage.ecrire(null)
        o.surSessionPerdue?.()
      }

      const err = erreurDeReponse(rep.status, await lireCorps(rep), rep.headers.get('retry-after'))
      if (essai < maxTentatives && (RELIRE.has(rep.status) || (err instanceof ErreurTropDeRequetes && (err.reessayerDans ?? 99) <= 5))) {
        await attendre(err instanceof ErreurTropDeRequetes && err.reessayerDans !== null ? err.reessayerDans * 1000 : 300 * 2 ** essai)
        continue
      }
      o.surErreur?.(err, { methode, chemin })
      throw err
    }
  }

  return {
    requete,
    get: (c, x) => requete(c, { ...x, methode: 'GET' }),
    post: (c, corps, x) => requete(c, { ...x, methode: 'POST', corps }),
    put: (c, corps, x) => requete(c, { ...x, methode: 'PUT', corps }),
    patch: (c, corps, x) => requete(c, { ...x, methode: 'PATCH', corps }),
    supprimer: (c, x) => requete(c, { ...x, methode: 'DELETE' }),
    jetons: { lire: () => stockage.lire(), ecrire: (j, p) => stockage.ecrire(j, p), rafraichir },
  }
}

/** Le client de l'application, réglé par l'environnement (null en démonstration : pas de serveur). Les réponses
 * spéciales (prix changé au paiement, 3-D Secure, trop de requêtes) deviennent des événements de la page, traités
 * par src/composants/AvisErreurs.tsx. */
export function clientDeLEnvironnement(surSessionPerdue?: () => void): ClientApi | null {
  if (!env.apiUrl) return null
  return creerClient({
    baseUrl: env.apiUrl,
    delaiMs: env.apiDelaiMs,
    tentatives: env.apiTentatives,
    journal: !env.production,
    surSessionPerdue,
    surErreur: signalerReponseSpeciale,
  })
}
