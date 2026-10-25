// « Mon compte » de la console en mode API (VITE_SOURCE=api) : les routes du kit (backend-kit/apps/console/mon_compte.py,
// connexion_agent.py ; /api/console/moi/compte…, /api/console/auth/…). src/donnees/mon-compte.ts y renvoie chaque geste
// quand la source est l'API ; l'écran ne change pas. Le compte lu (CompteVu) est gardé en mémoire de la page et relu
// après chaque changement (« blv:compte ») : les crochets de l'écran (useCompte, usePhoto) restent synchrones.
// Refus (Issue de l'écran) : ceux du kit, tels quels ; « indisponible » : connexion Google pas encore branchée au kit.
import { ErreurApi } from '@client/api/erreurs'
import type { ResultatIdentifiants } from '../donnees/domaines/session'
import { appareilConsole, clientConsole } from './client-console'
import { garderEtape } from './domaines/session'
import { k } from './outils'

export type RefusApi = 'code' | 'valeur' | 'mot_de_passe' | 'faible' | 'meme' | 'essais' | 'lourde' | 'indisponible'
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
}

let compte: CompteServeur | null = null
let lecture: Promise<CompteServeur | null> | null = null

function api() {
  const c = clientConsole()
  if (!c) throw new Error('VITE_SOURCE=api demande VITE_API_URL')
  return c
}
const signaler = () => {
  window.dispatchEvent(new Event('blv:compte'))
  window.dispatchEvent(new Event('blv:donnees'))
}

/** Compte de l'agent connecté, lu au kit (une lecture à la fois) ; null sans session. */
export function relireCompte(): Promise<CompteServeur | null> {
  if (!api().jetons.lire()) {
    compte = null
    return Promise.resolve(null)
  }
  lecture ??= api()
    .get<CompteServeur>(k('/moi/compte'))
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

async function geste<T extends object>(chemin: string, corps: unknown = {}): Promise<T> {
  const r = await api().post<T>(k(chemin), corps)
  await relireCompte()
  return r
}

export const demanderCodeNom = () => api().post<{ ok: true; vers: string } | { ok: false; raison: RefusApi }>(k('/moi/compte/nom/code'), {})
export const changerNom = (prenom: string, nom: string, code: string) => geste<IssueApi>('/moi/compte/nom', { prenom, nom, code })

// Le nouveau numéro (ou la nouvelle adresse) attend son code : gardé ici entre la demande et la confirmation.
const enAttente: Record<string, string> = {}
export async function demanderCode(quoi: 'telephone' | 'email', valeur: string) {
  const r = await api().post<{ ok: true; vers: string } | { ok: false; raison: RefusApi }>(k(`/moi/compte/${quoi}/code`), { valeur })
  if (r.ok) enAttente[quoi] = valeur
  return r
}
export async function confirmerCode(quoi: 'telephone' | 'email', code: string): Promise<IssueApi> {
  const valeur = enAttente[quoi]
  if (!valeur) return { ok: false, raison: 'code' }
  const r = await geste<IssueApi>(`/moi/compte/${quoi}`, { valeur, code })
  if (r.ok || r.raison === 'essais') delete enAttente[quoi]
  return r
}

export const changerMotDePasse = (ancien: string, nouveau: string) => geste<IssueApi>('/moi/compte/mot-de-passe', { ancien, nouveau })

export async function changerPhoto(photo: string | null): Promise<IssueApi> {
  try {
    const r = await geste<{ ok: true; photo: string | null } | { ok: false; raison: RefusApi }>('/moi/compte/photo', { photo })
    return r.ok ? { ok: true } : r
  } catch (x) {
    if (x instanceof ErreurApi && x.statut === 400) return { ok: false, raison: x.code === 'photo_invalide' && /lourde/.test(x.message) ? 'lourde' : 'valeur' }
    throw x
  }
}

/** Google : le kit vérifie un jeton d'identité Google ; tant que son vérificateur n'est pas branché, « indisponible ». */
export const associerGoogle = (jeton: string) => geste<IssueApi>('/moi/compte/google', { jeton })
export const dissocierGoogle = () => geste<IssueApi>('/moi/compte/google/retirer')
export const synchroniserGoogle = () => geste<IssueApi>('/moi/compte/google/synchroniser')

// ── Connexion : lien par e-mail, mot de passe oublié, appareil qui se souvient ──────────────────────────────────────
const PUBLIC = { anonyme: true } as const

export async function envoyerLienConnexion(email: string): Promise<{ ok: true; vers: string } | { ok: false; raison: 'valeur' }> {
  try {
    return await api().post<{ ok: true; vers: string }>(k('/auth/lien'), { email: email.trim() }, PUBLIC)
  } catch (x) {
    if (x instanceof ErreurApi && x.statut === 400) return { ok: false, raison: 'valeur' }
    throw x
  }
}

/** Le lien reçu par e-mail remplace l'étape 1 (le second facteur reste demandé). */
export async function ouvrirLienConnexion(jeton: string): Promise<ResultatIdentifiants> {
  return garderEtape(await api().post<ResultatIdentifiants & { etape?: string }>(k('/auth/lien/ouvrir'), { jeton, appareil: appareilConsole() }, PUBLIC))
}

export async function demanderReinitialisation(email: string): Promise<{ ok: true; vers: string } | { ok: false; raison: 'valeur' }> {
  try {
    return await api().post<{ ok: true; vers: string }>(k('/auth/mot-de-passe/oubli'), { email: email.trim() }, PUBLIC)
  } catch (x) {
    if (x instanceof ErreurApi && x.statut === 400) return { ok: false, raison: 'valeur' }
    throw x
  }
}

export const reinitialiserMotDePasse = (jeton: string, nouveau: string) =>
  api().post<{ ok: true } | { ok: false; raison: 'faible' | 'lien_expire' }>(k('/auth/mot-de-passe'), { jeton, nouveau }, PUBLIC)

export interface AppareilServeur {
  email: string
  prenom: string
  initiales: string
  photo: string | null
}
/** L'appareil se souvient-il de quelqu'un ? (lu au kit à l'ouverture de l'écran de connexion). */
export const appareilRetenu = () => api().get<{ appareil: AppareilServeur | null }>(k('/auth/appareil'), { ...PUBLIC, query: { appareil: appareilConsole() } }).then((r) => r.appareil)
export const oublierAppareil = () => api().post<{ ok: true }>(k('/auth/appareil'), { appareil: appareilConsole() }, PUBLIC)
export const retenirAppareil = (retenu: boolean) => api().post<{ ok: boolean }>(k('/moi/appareil'), { appareil: appareilConsole(), retenu })
