// « Mon compte » de l'espace entreprise en mode API (VITE_SOURCE=api) : les routes du kit
// (backend-kit/apps/entreprise_session/mon_compte.py ; /api/company/me/account…, /profile/cover, /me/device,
// /auth/link…, /auth/device…). src/donnees/mon-compte.ts y renvoie chaque geste quand la source est l'API ; l'écran ne
// change pas. Le compte lu (CompteServeur, avec la couverture de l'entreprise) est gardé en mémoire de la page et relu
// après chaque changement (« blv:compte ») : les crochets de l'écran (useCompte, usePhoto, useCouverture) restent
// synchrones. Refus : ceux du kit, tels quels ; « trop_tot » : un code vient de partir (429, OTP-RENVOI) ;
// « indisponible » : connexion Google pas encore branchée au kit.
import { clientDeLEnvironnement, type ClientApi } from '@client/api/client'
import { ErreurApi } from '@client/api/erreurs'
import type { ResultatConnexion } from '../donnees/domaines/session'
import { appareil, signalerSession } from './domaines/session'
import { e } from './outils'

export type RefusApi = 'code' | 'valeur' | 'mot_de_passe' | 'faible' | 'meme' | 'essais' | 'lourde' | 'indisponible' | 'trop_tot'
export type IssueApi = { ok: true } | { ok: false; raison: RefusApi }

export interface CompteServeur {
  id: string
  prenom: string
  nom: string
  initiales: string
  telephone: string
  email: string
  photo: string | null
  google: { email: string; nom: string; photo: string } | null
  motDePasseLe: number | null
  alertes: { id: string; quoi: string; vers: string; le: number }[]
  couverture: string | null
}

let client: ClientApi | null = null
let compte: CompteServeur | null = null
let lecture: Promise<CompteServeur | null> | null = null

function api(): ClientApi {
  client ??= clientDeLEnvironnement()
  if (!client) throw new Error('VITE_SOURCE=api demande VITE_API_URL')
  return client
}
const signaler = () => {
  window.dispatchEvent(new Event('blv:compte'))
  window.dispatchEvent(new Event('blv:donnees'))
}

/** Compte de la personne connectée, lu au kit (une lecture à la fois) ; null sans session. */
export function relireCompte(): Promise<CompteServeur | null> {
  if (!api().jetons.lire()) {
    compte = null
    return Promise.resolve(null)
  }
  lecture ??= api()
    .get<CompteServeur>(e('/me/account'))
    .then((c) => {
      const change = JSON.stringify(c) !== JSON.stringify(compte)
      compte = c
      if (change) signaler()
      return c
    })
    .catch(() => compte)
    .finally(() => {
      lecture = null
    })
  return lecture
}

/** Dernier compte lu (null tant qu'il n'est pas arrivé, ou si la personne n'est pas celle-là). */
export function compteLu(id: string | null | undefined): CompteServeur | null {
  return compte && id && compte.id === id ? compte : null
}
/** Couverture de l'entreprise de la personne connectée (dernier compte lu). */
export const couvertureLue = (): string | null => compte?.couverture ?? null

/** 429 (un code vient de partir) → trop_tot ; 400 (saisie refusée) → valeur ; le reste passe. */
function refus(x: unknown): { ok: false; raison: RefusApi } {
  if (x instanceof ErreurApi && x.statut === 429) return { ok: false, raison: 'trop_tot' }
  if (x instanceof ErreurApi && x.statut === 400) return { ok: false, raison: x.code === 'photo_invalide' && /lourde/.test(x.message) ? 'lourde' : 'valeur' }
  throw x
}

async function geste<T extends object>(chemin: string, corps: unknown = {}): Promise<T | { ok: false; raison: RefusApi }> {
  try {
    const r = await api().post<T>(e(chemin), corps)
    await relireCompte()
    return r
  } catch (x) {
    return refus(x)
  }
}

export async function demanderCodeNom(): Promise<{ ok: true; vers: string } | { ok: false; raison: RefusApi }> {
  try {
    return await api().post<{ ok: true; vers: string } | { ok: false; raison: RefusApi }>(e('/me/account/name/code'), {})
  } catch (x) {
    return refus(x)
  }
}
export const changerNom = (prenom: string, nom: string, code: string) => geste<IssueApi>('/me/account/name', { prenom, nom, code }) as Promise<IssueApi>

const CHEMIN = { telephone: 'phone', email: 'email' } as const
// Le nouveau numéro (ou la nouvelle adresse) attend son code : gardé ici entre la demande et la confirmation.
const enAttente: Record<string, string> = {}
export async function demanderCode(quoi: 'telephone' | 'email', valeur: string): Promise<{ ok: true; vers: string } | { ok: false; raison: RefusApi }> {
  try {
    const r = await api().post<{ ok: true; vers: string } | { ok: false; raison: RefusApi }>(e(`/me/account/${CHEMIN[quoi]}/code`), { valeur })
    if (r.ok) enAttente[quoi] = valeur
    return r
  } catch (x) {
    return refus(x)
  }
}
export async function confirmerCode(quoi: 'telephone' | 'email', code: string): Promise<IssueApi> {
  const valeur = enAttente[quoi]
  if (!valeur) return { ok: false, raison: 'code' }
  const r = (await geste<IssueApi>(`/me/account/${CHEMIN[quoi]}`, { valeur, code })) as IssueApi
  if (r.ok || r.raison === 'essais') delete enAttente[quoi]
  return r
}

export async function changerPhoto(photo: string | null): Promise<IssueApi> {
  const r = await geste<{ ok: true; photo: string | null } | { ok: false; raison: RefusApi }>('/me/account/photo', { photo })
  return r.ok ? { ok: true } : r
}
export async function changerCouverture(photo: string | null): Promise<IssueApi> {
  const r = await geste<{ ok: true; couverture: string | null } | { ok: false; raison: RefusApi }>('/profile/cover', { photo })
  return r.ok ? { ok: true } : r
}

/** Google : le kit vérifie un jeton d'identité Google ; tant que son vérificateur n'est pas branché, « indisponible ». */
export const associerGoogle = (jeton: string) => geste<IssueApi>('/me/account/google', { jeton }) as Promise<IssueApi>
export const dissocierGoogle = () => geste<IssueApi>('/me/account/google/remove') as Promise<IssueApi>
export const synchroniserGoogle = () => geste<IssueApi>('/me/account/google/sync') as Promise<IssueApi>

// ── Connexion : lien par e-mail, appareil qui se souvient ────────────────────────────────────────────────────────────
const PUBLIC = { anonyme: true } as const

export async function envoyerLienConnexion(email: string): Promise<{ ok: true; vers: string } | { ok: false; raison: 'valeur' }> {
  try {
    return await api().post<{ ok: true; vers: string }>(e('/auth/link'), { email: email.trim() }, PUBLIC)
  } catch (x) {
    if (x instanceof ErreurApi && x.statut === 400) return { ok: false, raison: 'valeur' }
    throw x
  }
}

export type ResultatLien = ResultatConnexion | { ok: false; raison: 'lien_expire' }

/** Le lien reçu par e-mail remplace le mot de passe ; le code SMS reste demandé là où il l'est (même suite que la
 * connexion : les jetons rendus sont écrits). */
export async function ouvrirLienConnexion(jeton: string): Promise<ResultatLien> {
  const r = await api().post<ResultatLien & { jetons?: { access: string; refresh: string } }>(e('/auth/link/open'), { jeton, appareil: appareil() }, PUBLIC)
  if ('jetons' in r && r.jetons) {
    api().jetons.ecrire({ acces: r.jetons.access, rafraichissement: r.jetons.refresh }, true)
    delete r.jetons
    signalerSession()
  }
  return r
}

export interface AppareilServeur {
  email: string
  prenom: string
  initiales: string
  photo: string | null
}
/** L'appareil se souvient-il de quelqu'un ? (lu au kit à l'ouverture de l'écran de connexion). */
export const appareilRetenu = () => api().get<{ appareil: AppareilServeur | null }>(e('/auth/device'), { ...PUBLIC, query: { appareil: appareil() } }).then((r) => r.appareil)
export const oublierAppareil = () => api().post<{ ok: true }>(e('/auth/device/forget'), { appareil: appareil() }, PUBLIC)
export const retenirAppareil = (retenu: boolean) => api().post<{ ok: boolean }>(e('/me/device'), { appareil: appareil(), retenu })
