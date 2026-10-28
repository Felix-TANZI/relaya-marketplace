// Domaine « session » branché sur le kit (backend-kit/apps/relais_compte, relais_core/connexion.py) : connexion appareil
// par appareil (CNX-01 à CNX-04, PAR-02) — numéro (+237), code SMS sur un nouvel appareil, PIN personnel.
// - Appareil : un identifiant tiré une fois et gardé dans localStorage « blv_r_appareil », envoyé par l'en-tête
//   X-Device-Id à CHAQUE requête (client de source-api.ts) ; le serveur tient l'étape de connexion de cet appareil.
// - Jetons : ceux de relaya (simplejwt), rendus à l'ouverture (PIN bon, nouveau PIN, invitation acceptée) et écrits
//   ici ; la clé des preuves signées hors connexion (horsLigne.cle) est gardée sur le téléphone (« blv_r_cle_hl ») :
//   le PIN ne voyage jamais dans la file (domaines/horsligne.ts).
import type { ClientApi } from '@client/api/client'
import { ErreurNonAuthentifie } from '@client/api/erreurs'
import type { Origine } from '../../donnees/communs'
import type { DomaineSession, EcranConnexion, SessionRelais } from '../../donnees/domaines/session'
import type { SourceRelais } from '../../donnees/source'
import { appels, prevenir, urlMedia } from '../outils'

const CLE_APPAREIL = 'blv_r_appareil'
const CLE_HL = 'blv_r_cle_hl'
let appareilMemoire: string | null = null
let cleMemoire: string | null = null

function tirer(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    /* rien */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** Identifiant de ce téléphone (tiré une fois, gardé sur l'appareil ; en mémoire si le stockage est refusé). */
export function appareil(): string {
  try {
    let id = localStorage.getItem(CLE_APPAREIL)
    if (!id) {
      id = appareilMemoire ?? tirer()
      localStorage.setItem(CLE_APPAREIL, id)
    }
    return id
  } catch {
    appareilMemoire ??= tirer()
    return appareilMemoire
  }
}

/** Clé des preuves signées hors connexion de la session ouverte sur ce téléphone (null sans session). */
export function cleHorsLigne(): string | null {
  try {
    return localStorage.getItem(CLE_HL) ?? cleMemoire
  } catch {
    return cleMemoire
  }
}
function ecrireCle(cle: string | null) {
  cleMemoire = cle
  try {
    if (cle) localStorage.setItem(CLE_HL, cle)
    else localStorage.removeItem(CLE_HL)
  } catch {
    /* gardée en mémoire */
  }
}

interface Ouverture {
  jetons?: { access: string; refresh: string }
  horsLigne?: { cle: string }
}

/** Écrit les jetons et la clé hors connexion rendus à l'ouverture, et ne rend que le contrat de l'écran. */
export function garder<T extends object>(api: ClientApi, x: T & Ouverture): T {
  const { jetons, horsLigne, ...reste } = x
  if (jetons) {
    api.jetons.ecrire({ acces: jetons.access, rafraichissement: jetons.refresh }, true)
    ecrireCle(horsLigne?.cle ?? null)
    prevenir('session')
  }
  return reste as T
}

export function domaineSession(api: ClientApi): SourceRelais['session'] {
  const a = appels(api)
  const anonyme = { anonyme: true } as const
  /** Geste de connexion (sans jeton : une session périmée ne doit pas bloquer la connexion). */
  const connexion = <T>(chemin: string, origine: Origine | null, corps: object = {}) => a.post<T>(chemin, { ...corps, ...(origine ? { origine } : {}) }, { ...anonyme, ...(origine ? { idempotence: origine.cle } : {}) })
  type R<K extends keyof DomaineSession> = Awaited<ReturnType<DomaineSession[K]>>

  const d: DomaineSession = {
    async session() {
      const lire = async (): Promise<SessionRelais> => {
        if (!api.jetons.lire()) return a.get<SessionRelais>('/me', anonyme)
        try {
          return await a.get<SessionRelais>('/me')
        } catch (x) {
          // Jeton refusé et non rafraîchi : la session est perdue sur ce téléphone, l'écran de connexion s'ouvre.
          if (x instanceof ErreurNonAuthentifie) return a.get<SessionRelais>('/me', anonyme)
          throw x
        }
      }
      const s = await lire()
      return s.membre ? { ...s, membre: { ...s.membre, photo: urlMedia(s.membre.photo) } } : s
    },
    ecranConnexion: () => a.get<EcranConnexion>('/auth/state', anonyme),
    commencer: (telephone, o) => connexion<R<'commencer'>>('/auth/start', o, { phone: telephone }),
    verifierCode: (code, o) => connexion<R<'verifierCode'>>('/auth/otp', o, { code }),
    renvoyerCode: (o) => connexion<R<'renvoyerCode'>>('/auth/otp/resend', o),
    connecter: async (pin, o) => garder(api, await connexion<R<'connecter'> & Ouverture>('/auth/pin', o, { pin })),
    pinOublie: (o) => connexion<R<'pinOublie'>>('/auth/pin/forgot', o),
    creerPin: async (pin, o) => garder(api, await connexion<R<'creerPin'> & Ouverture>('/auth/pin/new', o, { pin })),
    async changerNumero() {
      await api.supprimer<void>('/relay/auth/device', anonyme)
      api.jetons.ecrire(null)
      ecrireCle(null)
      prevenir('session')
    },
    async deconnecter() {
      try {
        // Au mieux : la session se ferme sur le téléphone quoi qu'il arrive ; l'appareil reste lié (CNX-04).
        if (api.jetons.lire()) await a.post('/logout').catch(() => undefined)
      } finally {
        api.jetons.ecrire(null)
        ecrireCle(null)
        prevenir('session')
      }
    },
  }
  return d
}
