// Domaine « session » branché sur le kit (backend-kit/apps/livreur_session) : connexion par numéro (+237), code SMS et
// PIN, appareil unique (LIV-03-R10), ouverture par l'empreinte du téléphone.
// - Appareil : un identifiant tiré une fois et gardé dans localStorage « blv_l_appareil », envoyé dans le corps (ou
//   l'adresse) ; le serveur lie le compte à cet appareil.
// - Jetons : ceux de relaya (simplejwt) ; l'ouverture (PIN créé, PIN bon, empreinte) les rend (`jetons: {access,
//   refresh}`) et ils sont écrits ici, sur le téléphone ; la connexion elle-même se fait sans jeton.
import type { ClientApi } from '@client/api/client'
import type { Origine } from '../../donnees/communs'
import type { DomaineSession, EcranConnexion, Securite, SessionLivreur } from '../../donnees/domaines/session'
import type { SourceLivreur } from '../../donnees/source'
import { appels, prevenir } from '../outils'

const CLE_APPAREIL = 'blv_l_appareil'
let appareilMemoire: string | null = null

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

interface AvecJetons {
  jetons?: { access: string; refresh: string }
}

export function domaineSession(api: ClientApi): SourceLivreur['session'] {
  const a = appels(api)
  const anonyme = { anonyme: true } as const
  /** Geste de connexion (sans jeton) : l'appareil et l'origine du geste partent dans le corps. */
  const connexion = <T>(chemin: string, origine: Origine | null, corps: object = {}) => a.post<T>(chemin, { ...corps, appareil: appareil(), ...(origine ? { origine } : {}) }, anonyme)

  /** Écrit les jetons rendus à l'ouverture et retire ce qui n'est pas du contrat de l'écran ; la coque relit alors la
   * session (« blv:donnees », comme après un geste de la démonstration). */
  function garder<T extends object>(r: T & AvecJetons): T {
    const { jetons, ...reste } = r
    if (jetons) {
      api.jetons.ecrire({ acces: jetons.access, rafraichissement: jetons.refresh }, true)
      prevenir('session')
    }
    return reste as T
  }

  const d: DomaineSession = {
    session: () => a.get<SessionLivreur>('/session', api.jetons.lire() ? undefined : anonyme),
    ecranConnexion: () => a.get<EcranConnexion>('/auth/screen', { ...anonyme, query: { appareil: appareil() } }),
    saisirNumero: (numero, origine) => connexion('/auth/phone', origine, { numero }),
    confirmerBascule: (origine) => connexion('/auth/switch', origine),
    demanderCode: (motif, origine) => connexion('/auth/otp/request', origine, { motif }),
    verifierCode: (code, origine) => connexion('/auth/otp/verify', origine, { code }),
    creerPin: async (pin, origine) => garder(await connexion<Awaited<ReturnType<DomaineSession['creerPin']>> & AvecJetons>('/auth/pin', origine, { pin })),
    verifierPin: async (pin, origine) => garder(await connexion<Awaited<ReturnType<DomaineSession['verifierPin']>> & AvecJetons>('/auth/pin/verify', origine, { pin })),
    deverrouillerBiometrie: async (origine) => garder(await connexion<Awaited<ReturnType<DomaineSession['deverrouillerBiometrie']>> & AvecJetons>('/auth/biometric', origine)),
    securite: () => a.get<Securite>('/security'),
    changerPin: (ancien, nouveau, origine) => a.geste('/auth/pin/change', origine, { ancien, nouveau }),
    reglerBiometrie: (active, origine) => a.geste('/auth/biometric/setting', origine, { active }),
    annulerCode: async () => {
      await connexion('/auth/otp/cancel', null)
    },
    async deconnecter() {
      const j = api.jetons.lire()
      try {
        // Au mieux : la session se ferme sur le téléphone quoi qu'il arrive.
        await connexion('/logout', null, { refresh: j?.rafraichissement ?? null }).catch(() => undefined)
      } finally {
        api.jetons.ecrire(null)
        prevenir('session')
      }
    },
  }
  return d
}
