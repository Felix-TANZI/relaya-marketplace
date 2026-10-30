// Domaine « session » branché sur le kit (backend-kit/apps/entreprise_session) : session et badges, connexion (numéro
// +237 ou e-mail et mot de passe, code SMS), renvoi, mot de passe oublié, invitation nominative, déconnexion.
// - Jetons : ceux de relaya (simplejwt) ; une connexion réussie les rend (`jetons: {access, refresh}`), écrits ici.
// - Appareil : un identifiant tiré une fois et gardé dans localStorage « blv_e_appareil », envoyé dans le corps : le
//   répartiteur n'a plus de code sur un appareil reconnu ; « Mes appareils » liste et déconnecte les appareils.
// - changerRole : démonstration seulement.
import type { ClientApi } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import type { DomaineSession, EnvoiCode, InvitationAcces, ResultatCode, ResultatConnexion, SessionEntreprise } from '../../donnees/domaines/session'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

const CLE_APPAREIL = 'blv_e_appareil'
let appareilMemoire: string | null = null

function tirer(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    /* rien */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** Identifiant de cet appareil (tiré une fois, gardé sur l'appareil ; en mémoire si le stockage est refusé). */
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

/** La session a changé (jetons écrits ou effacés) : la coque la relit. */
export function signalerSession() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('blv:donnees'))
}

interface AvecJetons {
  jetons?: { access: string; refresh: string }
}

export function domaineSession(api: ClientApi): SourceEntreprise['session'] {
  const a = appels(api, 'session')
  const anonyme = { anonyme: true } as const

  /** Écrit les jetons rendus par le serveur et retire ce qui n'est pas du contrat de l'écran ; la coque relit alors la
   * session (« blv:donnees », comme après un geste de la démonstration). */
  function garder<T extends object>(r: T & AvecJetons): T {
    const { jetons, ...reste } = r
    if (jetons) {
      api.jetons.ecrire({ acces: jetons.access, rafraichissement: jetons.refresh }, true)
      signalerSession()
    }
    return reste as T
  }

  const d: DomaineSession = {
    session: () => a.get<SessionEntreprise>('/session', api.jetons.lire() ? undefined : anonyme),
    connecter: async (identifiant, motDePasse) => garder(await a.post<ResultatConnexion & AvecJetons>('/auth/login', { identifiant, motDePasse, appareil: appareil() }, anonyme)),
    verifierCode: async (defi, code) => garder(await a.post<ResultatCode & AvecJetons>('/auth/verify', { defi, code }, anonyme)),
    renvoyerCode: (defi) => a.post('/auth/verify/resend', { defi }, anonyme),
    oublie: (identifiant) => a.post<{ ok: true } & EnvoiCode>('/auth/password/forgot', { identifiant }, anonyme),
    reinitialiser: (defi, code, motDePasse) => a.post('/auth/password/reset', { defi, code, motDePasse }, anonyme),
    invitation: (jeton) => ouNull(a.get<InvitationAcces>(`/auth/invitations/${seg(jeton)}`, anonyme)),
    creerAcces: (jeton, motDePasse) => a.post(`/auth/invitations/${seg(jeton)}`, { motDePasse, appareil: appareil() }, anonyme),
    async deconnecter() {
      const j = api.jetons.lire()
      try {
        // Au mieux : la session se ferme sur l'appareil quoi qu'il arrive.
        if (j?.rafraichissement) await a.post('/auth/logout', { refresh: j.rafraichissement }).catch(() => undefined)
      } finally {
        api.jetons.ecrire(null)
        signalerSession()
      }
    },
    changerRole: () => Promise.reject(new NonDisponible('session.changerRole', 'démonstration seulement')),
  }
  return d
}
