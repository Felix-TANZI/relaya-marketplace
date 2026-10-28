// Outils communs des connecteurs de l'entreprise (src/api/domaines/*.ts) : chemins sous /company/ (/api/company/…, kit
// backend-kit/apps/entreprise_*), refus du serveur traduits comme la démonstration les rend :
// - 403 role_forbidden (rôle sans ce droit, ENT-RG-R25 ; data.roles) → AccesRefuse(quoi, roles) (communs.ts) ;
// - 404 → null quand la méthode rend « … | null » ;
// - un refus métier attendu par l'écran est un 200 { ok: false, raison } (Resultat) : rendu tel quel ;
// - après chaque écriture réussie, l'événement « blv:donnees » : les écrans relisent (useLecture, session.tsx), comme
//   après un geste de la démonstration.
import type { ClientApi, OptionsRequete } from '@client/api/client'
import { ErreurApi, ErreurIntrouvable } from '@client/api/erreurs'
import { AccesRefuse, ROLES, type Role } from '../donnees/communs'

export const seg = encodeURIComponent

/** Chemin d'une route de l'entreprise : e('/packages') → '/company/packages'. */
export const e = (chemin: string) => `/company${chemin}`

/** 403 role_forbidden → AccesRefuse(quoi, rôles admis) ; toute autre erreur passe. */
export function role(quoi: string) {
  return (x: unknown): never => {
    if (x instanceof ErreurApi && x.code === 'role_forbidden') {
      const d = x.data as { roles?: unknown } | undefined
      const roles = Array.isArray(d?.roles) ? (d.roles.filter((r) => ROLES.includes(r as Role)) as Role[]) : []
      throw new AccesRefuse(quoi, roles)
    }
    throw x
  }
}

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
function ecriture<T>(quoi: string) {
  return (x: T): T => (prevenir(quoi), x)
}

/** Fabrique raccourcie des appels d'un domaine : GET, POST, PUT, PATCH, DELETE sur /company/…, role_forbidden traduit. */
export function appels(api: ClientApi, quoi: string) {
  const r = role(quoi)
  return {
    get: <T>(chemin: string, o?: Opts) => api.get<T>(e(chemin), o).catch(r),
    // Une écriture anonyme (connexion, code, mot de passe oublié) ne fait rien relire : la session le fait elle-même.
    post: <T>(chemin: string, corps?: unknown, o?: Opts) => api.post<T>(e(chemin), corps, o).then(o?.anonyme ? (x: T) => x : ecriture<T>(quoi)).catch(r),
    put: <T>(chemin: string, corps?: unknown, o?: Opts) => api.put<T>(e(chemin), corps, o).then(ecriture<T>(quoi)).catch(r),
    patch: <T>(chemin: string, corps?: unknown, o?: Opts) => api.patch<T>(e(chemin), corps, o).then(ecriture<T>(quoi)).catch(r),
    supprimer: <T = void>(chemin: string, o?: Omit<OptionsRequete, 'methode'>) => api.supprimer<T>(e(chemin), o).then(ecriture<T>(quoi)).catch(r),
  }
}
