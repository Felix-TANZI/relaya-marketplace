// Réponses spéciales du serveur, traitées pareil quel que soit l'écran qui appelle (src/composants/AvisErreurs.tsx) :
// - 409 price_changed au paiement (POST /api/checkout) → l'écran « Un prix a changé » (CL-08, il relit le panier
//   vérifié : les nouvelles données du serveur) ;
// - 422 action_requise (3-D Secure, vérification renforcée de la banque) → la page de la banque
//   (data.redirection, https seulement) ;
// - 401 → session perdue (événement « blv:session-perdue », émis par le client) : reconnexion, retour à la page ;
// - 429 → « Réessaie dans X s » (en-tête Retry-After) ; hors ligne → message réseau (AvisErreurs).
// Le client HTTP appelle signalerReponseSpeciale() pour chaque erreur levée ; l'écran reçoit quand même l'erreur.
import type { ErreurApi } from './erreurs'

export const EVENEMENT_PRIX_CHANGE = 'blv:prix-change'
export const EVENEMENT_ACTION_REQUISE = 'blv:action-requise'
export const EVENEMENT_SESSION_PERDUE = 'blv:session-perdue'

/** Routes de paiement dont un 409 price_changed renvoie vers l'écran « Un prix a changé » du panier. */
const PAIEMENT_DU_PANIER = /^\/checkout\/?$/

/** Adresse de la banque (3-D Secure) d'une réponse action_requise, si elle est sûre. */
export function redirectionDe(e: Pick<ErreurApi, 'code' | 'data'>): string | null {
  if (e.code !== 'action_requise' || !e.data || typeof e.data !== 'object') return null
  const u = (e.data as { redirection?: unknown }).redirection
  return typeof u === 'string' && /^https:\/\//.test(u) ? u : null
}

/** Le nom de l'événement de la page pour cette erreur (null : rien de spécial). */
export function reponseSpeciale(e: Pick<ErreurApi, 'code' | 'data' | 'statut'>, requete: { methode: string; chemin: string }): { nom: string; detail: Record<string, unknown> } | null {
  if (e.statut === 409 && e.code === 'price_changed' && requete.methode === 'POST' && PAIEMENT_DU_PANIER.test(requete.chemin))
    return { nom: EVENEMENT_PRIX_CHANGE, detail: { data: e.data ?? null } }
  if (e.code === 'action_requise') return { nom: EVENEMENT_ACTION_REQUISE, detail: { redirection: redirectionDe(e), data: e.data ?? null } }
  return null
}

export function signalerReponseSpeciale(e: ErreurApi, requete: { methode: string; chemin: string }) {
  const r = reponseSpeciale(e, requete)
  if (r && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(r.nom, { detail: r.detail }))
}
