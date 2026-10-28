// Outils communs des connecteurs du livreur (src/api/domaines/*.ts) : chemins sous /courier/ (/api/courier/…, kit
// backend-kit/apps/livreur_*).
// - Toute action métier porte son ORIGINE (communs.ts : clé, heure et position du téléphone, LIV-P22) : envoyée dans le
//   corps (« origine ») et comme clé d'idempotence (en-tête Idempotency-Key = origine.cle) ; la même action rejouée (file
//   hors connexion, double appui) rend la même réponse sans refaire le geste (serveur : livraison_core.acces.geste).
// - 404 → null quand la méthode rend « … | null » ; un refus métier attendu par l'écran est un 200 { ok: false, raison }.
// - Après chaque écriture réussie, l'événement « blv:donnees » : les écrans relisent (useLecture, session.tsx), comme
//   après un geste de la démonstration (connexion comprise : l'écran de connexion se relit à chaque étape).
import type { ClientApi, OptionsRequete } from '@client/api/client'
import { ErreurIntrouvable } from '@client/api/erreurs'
import type { Origine } from '../donnees/communs'

export const seg = encodeURIComponent

/** Chemin d'une route du livreur : l('/today') → '/courier/today'. */
export const l = (chemin: string) => `/courier${chemin}`

/** Appel dont la réponse est « T | null » : 404 → null. */
export async function ouNull<T>(appel: Promise<T>): Promise<T | null> {
  try {
    return await appel
  } catch (x) {
    if (x instanceof ErreurIntrouvable) return null
    throw x
  }
}

type Opts = Omit<OptionsRequete, 'methode' | 'corps'>

/** Après une écriture réussie : les écrans relisent (même événement que la démonstration). */
export function prevenir(domaine = 'api'): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') setTimeout(() => window.dispatchEvent(new CustomEvent('blv:donnees', { detail: { domaine } })), 0)
}
const ecrit =
  <T>(_o?: unknown) =>
  (x: T): T => (prevenir(), x)

/** Fabrique raccourcie des appels d'un domaine sur /courier/… ; geste() : action avec son origine (idempotente). */
export function appels(api: ClientApi) {
  return {
    get: <T>(chemin: string, o?: Opts) => api.get<T>(l(chemin), o),
    post: <T>(chemin: string, corps?: unknown, o?: Opts) => api.post<T>(l(chemin), corps, o).then(ecrit<T>(o)),
    put: <T>(chemin: string, corps?: unknown, o?: Opts) => api.put<T>(l(chemin), corps, o).then(ecrit<T>(o)),
    patch: <T>(chemin: string, corps?: unknown, o?: Opts) => api.patch<T>(l(chemin), corps, o).then(ecrit<T>(o)),
    supprimer: <T = void>(chemin: string, o?: Omit<OptionsRequete, 'methode'>) => api.supprimer<T>(l(chemin), o).then(ecrit<T>(o)),
    /** POST d'une action métier : { ...corps, origine }, Idempotency-Key = origine.cle. */
    geste: <T>(chemin: string, origine: Origine, corps: object = {}, o?: Opts) => api.post<T>(l(chemin), { ...corps, origine }, { ...o, idempotence: origine.cle }).then(ecrit<T>(o)),
  }
}
