// Outils communs des connecteurs vendeur (src/api/domaines/*.ts) : chemins sous /vendors/ (préfixe de relaya, Q-51),
// refus du serveur traduits comme la démonstration les rend :
// - 403 owner_only (accès Préparation sur l'argent, les prix, la publication…) et 403 forbidden_right (hors des droits
//   cochés pour cet employé, INTEGRATION-API.md § 8) → ReserveAuProprietaire (communs.ts : l'écran dit « Réservé ») ;
// - 404 → null quand la méthode rend « … | null » (commande, litige, offre inconnus) ;
// - un refus métier attendu par l'écran est un 200 { ok: false, raison } (Resultat) : rendu tel quel.
import type { ClientApi, OptionsRequete } from '@client/api/client'
import { ErreurApi, ErreurIntrouvable } from '@client/api/erreurs'
import { ReserveAuProprietaire } from '../donnees/communs'

export const seg = encodeURIComponent

/** Chemin d'une route vendeur : v('/orders') → '/vendors/orders'. */
export const v = (chemin: string) => `/vendors${chemin}`

/** 403 owner_only ou forbidden_right → ReserveAuProprietaire(quoi) ; toute autre erreur passe. */
export function proprietaire(quoi: string) {
  return (e: unknown): never => {
    if (e instanceof ErreurApi && (e.code === 'owner_only' || e.code === 'forbidden_right')) throw new ReserveAuProprietaire(quoi)
    throw e
  }
}

/** Appel dont la réponse est « T | null » : 404 → null. */
export async function ouNull<T>(appel: Promise<T>): Promise<T | null> {
  try {
    return await appel
  } catch (e) {
    if (e instanceof ErreurIntrouvable) return null
    throw e
  }
}

/** Les écrans relisent (useLecture, session.tsx : même événement que la démonstration, blv:donnees). */
export function prevenir(domaine = 'api'): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') setTimeout(() => window.dispatchEvent(new CustomEvent('blv:donnees', { detail: { domaine } })), 0)
}

/** POST qui ne changent rien (aperçus, filtre, reconnaissance) : lus par des écrans à chaque saisie, ils ne font rien
 *  relire (sinon l'écran relancerait l'aperçu sans fin). */
const LECTURES = /\/(ads\/quote|promotions\/quote|questions\/filter|catalog\/recognize)$/

/** Après une écriture réussie, les écrans relisent, comme après un geste de la démonstration. */
const ecriture = <T>(chemin: string, quoi: string) => (x: T): T => {
  if (!LECTURES.test(chemin)) prevenir(quoi)
  return x
}

/** Fabrique raccourcie des appels d'un domaine : GET, POST, PUT, PATCH, DELETE sur /vendors/…, owner_only traduit. */
export function appels(api: ClientApi, quoi: string) {
  const p = proprietaire(quoi)
  return {
    get: <T>(chemin: string, o?: Omit<OptionsRequete, 'methode' | 'corps'>) => api.get<T>(v(chemin), o).catch(p),
    post: <T>(chemin: string, corps?: unknown, o?: Omit<OptionsRequete, 'methode' | 'corps'>) => api.post<T>(v(chemin), corps, o).then(ecriture<T>(chemin, quoi), p),
    put: <T>(chemin: string, corps?: unknown, o?: Omit<OptionsRequete, 'methode' | 'corps'>) => api.put<T>(v(chemin), corps, o).then(ecriture<T>(chemin, quoi), p),
    patch: <T>(chemin: string, corps?: unknown, o?: Omit<OptionsRequete, 'methode' | 'corps'>) => api.patch<T>(v(chemin), corps, o).then(ecriture<T>(chemin, quoi), p),
    supprimer: <T = void>(chemin: string, o?: Omit<OptionsRequete, 'methode'>) => api.supprimer<T>(v(chemin), o).then(ecriture<T>(chemin, quoi), p),
  }
}
