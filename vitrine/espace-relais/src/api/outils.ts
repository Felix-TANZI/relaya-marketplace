// Outils communs des connecteurs du point relais (src/api/domaines/*.ts) : chemins sous /relay/ (/api/relay/…, kit
// backend-kit/apps/relais_compte et relais_guichet), même grammaire que le livreur (espace-livreur/src/api/outils.ts).
// - Toute action métier porte son ORIGINE (clé, heure et position du téléphone) : envoyée dans le corps (« origine ») et
//   comme clé d'idempotence (en-tête Idempotency-Key = origine.cle) ; la même action rejouée (file hors connexion,
//   double appui) rend la même réponse sans refaire le geste (serveur : relais_core.acces.geste).
// - 404 → null quand la méthode rend « … | null » ; un refus métier attendu par l'écran est un 200 { ok: false, raison }.
// - Un geste refusé par les droits du membre (403 droit_refuse ou owner_only : le serveur refait les droits, ARL-06)
//   devient le refus { ok: false, raison: 'droit_refuse' } que les écrans savent dire.
// - Après chaque écriture réussie, l'événement « blv:donnees » : les écrans relisent (comme en démonstration).
import type { ClientApi, OptionsRequete } from '@client/api/client'
import { ErreurInterdit, ErreurIntrouvable } from '@client/api/erreurs'
import { env } from '@client/config/env'
import type { Origine } from '../donnees/communs'

export const seg = encodeURIComponent

/** Chemin d'une route du relais : r('/today') → '/relay/today'. */
export const r = (chemin: string) => `/relay${chemin}`

/** Appel dont la réponse est « T | null » : 404 → null. */
export async function ouNull<T>(appel: Promise<T>): Promise<T | null> {
  try {
    return await appel
  } catch (x) {
    if (x instanceof ErreurIntrouvable) return null
    throw x
  }
}

/** Geste refusé par les droits (403 droit_refuse | owner_only) → { ok: false, raison: 'droit_refuse' }. */
export async function sousDroits<T>(appel: Promise<T>): Promise<T> {
  try {
    return await appel
  } catch (x) {
    if (x instanceof ErreurInterdit && (x.code === 'droit_refuse' || x.code === 'owner_only')) return { ok: false, raison: 'droit_refuse' } as T
    throw x
  }
}

type Opts = Omit<OptionsRequete, 'methode' | 'corps'>

/** Photo servie par le serveur (« /media/… ») : adresse complète, l'appli pouvant vivre sur une autre origine que l'API. */
export function urlMedia(u: string | null, base: string | null = env.apiUrl): string | null {
  if (!u || !u.startsWith('/') || u.startsWith('//') || !base || !/^https?:\/\//.test(base)) return u
  return new URL(base).origin + u
}

/** Après une écriture réussie : les écrans relisent (même événement que la démonstration, useLecture et session.tsx). */
export function prevenir(domaine = 'api'): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') setTimeout(() => window.dispatchEvent(new CustomEvent('blv:donnees', { detail: { domaine } })), 0)
}
async function ecriture<T>(appel: Promise<T>): Promise<T> {
  const x = await appel
  prevenir()
  return x
}

/** Fabrique raccourcie des appels d'un domaine sur /relay/… ; geste() : action avec son origine (idempotente). */
export function appels(api: ClientApi) {
  return {
    get: <T>(chemin: string, o?: Opts) => api.get<T>(r(chemin), o),
    /** POST sans effet sur les données (aperçu, connexion) : aucun événement. */
    post: <T>(chemin: string, corps?: unknown, o?: Opts) => api.post<T>(r(chemin), corps, o),
    /** POST d'une écriture sans origine (lu, tout lu) : les écrans relisent ensuite. */
    ecrire: <T>(chemin: string, corps?: unknown, o?: Opts) => ecriture(api.post<T>(r(chemin), corps, o)),
    /** PUT d'un réglage (avec son origine quand l'écran la donne) ; refus de droits → droit_refuse. */
    put: <T>(chemin: string, corps?: unknown, o?: Opts) => sousDroits(ecriture(api.put<T>(r(chemin), corps, o))),
    /** DELETE ; `origine` : corps { ...corps, origine } et Idempotency-Key = origine.cle ; refus de droits → droit_refuse. */
    supprimer: <T = void>(chemin: string, origine?: Origine | null, corps: object = {}, o?: Opts) =>
      sousDroits(ecriture(api.supprimer<T>(r(chemin), { ...o, ...(origine ? { corps: { ...corps, origine }, idempotence: origine.cle } : Object.keys(corps).length ? { corps } : {}) }))),
    /** POST d'une action métier : { ...corps, origine }, Idempotency-Key = origine.cle ; refus de droits → droit_refuse. */
    geste: <T>(chemin: string, origine: Origine, corps: object = {}, o?: Opts) => sousDroits(ecriture(api.post<T>(r(chemin), { ...corps, origine }, { ...o, idempotence: origine.cle }))),
  }
}
