// Outils communs des connecteurs de la console (src/api/domaines/*.ts) : chemins sous /console/ (/api/console/…, kit
// backend-kit/apps/console), refus du serveur traduits comme la démonstration les rend :
// - 403 console_forbidden (rôle sans cette permission ; data : {permission, roles}) → AccesRefuse(quoi, rôles admis) ;
// - 403 hors_perimetre (décision hors des zones de l'agent, ADM-ROL-03) → AccesRefuse(quoi + « hors de vos zones ») ;
// - 404 → null quand la méthode rend « … | null » (ouNull) ;
// - une décision (POST /console/decisions) refusée par une règle → Resultat { ok: false, raison } (decision) :
//   400 motif_requis → motif_court ; 404 → inconnu ; 409 et 422 → leur code (state_changed, meme_personne…) ;
// - une méthode sans route au kit lève NonBranche (route attendue et raison : CONNECTEURS-ADMIN.md).
// Les montants sont ceux du kit : un connecteur les recopie, il ne les recalcule jamais.
import type { ClientApi, OptionsRequete } from '@client/api/client'
import { ErreurApi, ErreurIntrouvable, NonDisponible } from '@client/api/erreurs'
import { AccesRefuse, ROLES, type EtatDecision, type Resultat, type Role } from '../donnees/communs'

export const seg = encodeURIComponent

/** Chemin d'une route de la console : k('/vues/session') → '/console/vues/session'. */
export const k = (chemin: string) => `/console${chemin}`

/** La méthode n'a pas de route au kit : refus propre (jamais une donnée inventée). */
export class NonBranche extends NonDisponible {
  readonly raison: string
  constructor(methode: string, attendu: string, raison: string) {
    super(methode, attendu)
    this.name = 'NonBranche'
    this.raison = raison
    this.message = `source.${methode}() n'est pas branchée sur le kit : ${raison} (route attendue : ${attendu} ; CONNECTEURS-ADMIN.md).`
    // Hors construction de production : visible dans la console du navigateur (la recette de bout en bout la relève).
    if (import.meta.env?.DEV && !import.meta.env?.VITEST) console.warn(`[non branché] ${this.message}`)
  }
}

/** 403 console_forbidden / hors_perimetre → AccesRefuse ; toute autre erreur passe. */
export function role(quoi: string) {
  return (x: unknown): never => {
    if (x instanceof ErreurApi && x.statut === 403 && (x.code === 'console_forbidden' || x.code === 'hors_perimetre')) {
      const d = x.data as { roles?: unknown } | undefined
      const roles = Array.isArray(d?.roles) ? (d.roles.filter((r) => ROLES.includes(r as Role)) as Role[]) : []
      throw new AccesRefuse(x.code === 'hors_perimetre' ? `${quoi} (hors de vos zones)` : quoi, roles)
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

/** Appels d'un domaine : GET et POST sur /console/…, refus de rôle traduits. */
export function appels(api: ClientApi, quoi: string) {
  const r = role(quoi)
  return {
    get: <T>(chemin: string, o?: Opts) => api.get<T>(k(chemin), o).catch(r),
    post: <T>(chemin: string, corps?: unknown, o?: Opts) => api.post<T>(k(chemin), corps, o).catch(r),
  }
}
export type Appels = ReturnType<typeof appels>

/** Code d'un refus métier attendu par l'écran (decision, et les gestes qui rendent un Resultat) ; null : erreur à lever. */
export function codeRefus(x: unknown): string | null {
  if (!(x instanceof ErreurApi)) return null
  if (x.code === 'motif_requis') return 'motif_court'
  if (x.statut === 404) return 'inconnu'
  if (x.statut === 409 || x.statut === 422 || (x.statut === 400 && x.code)) return x.code ?? 'etat'
  return null
}

/** Rend le refus métier en Resultat ; lève le reste (réseau, 401, 403 déjà traduit, 5xx). */
export async function resultat<T extends object, R extends string>(appel: Promise<T>, traduire: (code: string) => R): Promise<Resultat<T, R>> {
  try {
    return { ok: true, ...(await appel) } as Resultat<T, R>
  } catch (x) {
    const c = codeRefus(x)
    if (c === null) throw x
    return { ok: false, raison: traduire(c), detail: (x as Error).message }
  }
}

/** Décision du kit (decisions.decision_json). */
export interface DecisionKit {
  reference: string
  action: string
  objet: string
  statut: 'appliquee' | 'a_contresigner' | 'refusee' | 'expiree' | 'echec'
  resultat: unknown
}

export const etatDecision = (d: DecisionKit): EtatDecision => (d.statut === 'a_contresigner' ? 'a_contresigner' : d.statut === 'appliquee' ? 'appliquee' : 'refusee')

/**
 * Décision motivée : POST /console/decisions {action, donnees, motif, preuves} (Idempotency-Key) ; 201 appliquée,
 * 202 à contre-signer. Refus de règle → { ok: false, raison } (traduire : code du kit → raison de l'écran).
 */
export function decision<R extends string = string>(
  a: Appels,
  action: string,
  donnees: Record<string, unknown>,
  motif: string,
  preuves: string[] = [],
  traduire: (code: string) => R = (c) => c as R,
): Promise<Resultat<{ etat: EtatDecision; id: string; resultat: unknown }, R>> {
  return resultat(
    a.post<DecisionKit>('/decisions', { action, donnees, motif, preuves }, { idempotence: true }).then((d) => ({ etat: etatDecision(d), id: d.reference, resultat: d.resultat })),
    traduire,
  )
}
