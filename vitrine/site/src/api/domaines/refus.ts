// Outils communs des domaines « échanges entre clients » (listes, cotisations, reçus, diaspora, modules CL-15).
//
// Le kit répond un refus attendu par l'écran de deux façons (backend-kit/REPRISE-BACKEND.md, § 1.4) :
// - 200 avec l'union du site ({ ok: false, raison }) : rien à faire, la réponse est rendue telle quelle ;
// - un statut nommé dans routes.ts (409 deja, 422 plafond, 429 too_early…) avec { error: { code, data } } (CAP-04).
// `refusAttendu` convertit le second cas dans le premier quand le code est une raison connue de l'écran ; toute
// autre erreur remonte (message affiché par l'écran d'erreur commun).
import type { CarteJeton } from '../../donnees/source'
import { ErreurApi } from '../erreurs'

export const seg = encodeURIComponent

export type Refus<R extends string> = { ok: false; raison: R }

/** Le refus de l'écran si `e` porte un code attendu (ou un alias), sinon `e` est relancée. */
export function refusAttendu<R extends string>(e: unknown, raisons: readonly R[], alias: Partial<Record<string, R>> = {}): Refus<R> & { data: Record<string, unknown> } {
  if (e instanceof ErreurApi && e.code) {
    const r = (raisons as readonly string[]).includes(e.code) ? (e.code as R) : alias[e.code]
    if (r) return { ok: false, raison: r, data: e.data && typeof e.data === 'object' ? (e.data as Record<string, unknown>) : {} }
  }
  throw e
}

/** L'appel, ou le refus attendu (sans les données du refus). */
export async function ou<T, R extends string>(appel: Promise<T>, raisons: readonly R[], alias: Partial<Record<string, R>> = {}): Promise<T | Refus<R>> {
  try {
    return await appel
  } catch (e) {
    const { ok, raison } = refusAttendu(e, raisons, alias)
    return { ok, raison }
  }
}

/** Paiement par carte : 3-D Secure (ou la page Apple Pay / Google Pay du prestataire) quand le serveur renvoie une adresse. */
export function suivreRedirection<T>(r: T): T {
  const u = r && typeof r === 'object' ? (r as { redirection?: unknown }).redirection : undefined
  if (typeof u === 'string' && /^https:\/\//.test(u) && typeof window !== 'undefined') window.location.assign(u)
  return r
}

/** Le jeton du prestataire (jamais le numéro ni le CVC : CAP-24). */
export const jetonCarte = (c: CarteJeton | null | undefined) => c?.jeton ?? ''

/** Photo prise par l'écran (data URL ou blob:) → fichier pour un envoi multipart. */
export async function fichierPhoto(photo: string, nom = 'photo.jpg'): Promise<Blob> {
  const r = await fetch(photo)
  const b = await r.blob()
  return typeof File !== 'undefined' ? new File([b], nom, { type: b.type || 'image/jpeg' }) : b
}
