// Domaine « publicite » branché sur le kit (DP-59, backend-kit/apps/publicite) : tableau, campagnes, produits
// annonçables, mouvements du solde, estimation et création (espace.py, types de l'écran, refus en Resultat) ; pause,
// arrêt et recharge par les routes de services.py, leurs refus 422 traduits en Resultat. Rien n'est crédité avant la
// confirmation sur le téléphone. Réservé au propriétaire : 403 owner_only → ReserveAuProprietaire.
import type { ClientApi } from '@client/api/client'
import { ErreurApi } from '@client/api/erreurs'
import type { SourceVendeur } from '../../donnees/source'
import type { Campagne, Estimation, MouvementPub, ProduitAnnoncable, Recharge, TableauPub } from '../../donnees/domaines/publicite'
import { appels, ouNull, seg } from '../outils'

/** Refus 422 attendu (code du kit) → { ok: false, raison } ; toute autre erreur passe. */
async function ou422<T extends object, R extends string>(appel: Promise<T>, codes: Record<string, R>): Promise<({ ok: true } & T) | { ok: false; raison: R }> {
  try {
    return { ok: true, ...(await appel) }
  } catch (e) {
    if (e instanceof ErreurApi && e.code && e.code in codes) return { ok: false, raison: codes[e.code] }
    throw e
  }
}

interface MouvementKit {
  id: string
  montant: number
  a: number
  statut: Recharge['statut']
}

export function domainePublicite(api: ClientApi): SourceVendeur['publicite'] {
  const a = appels(api, 'publicité')
  const idem = { idempotence: true as const }
  return {
    tableau: () => a.get<TableauPub>('/ads/dashboard'),
    campagnes: () => a.get<Campagne[]>('/ads/campaigns'),
    produits: () => a.get<ProduitAnnoncable[]>('/ads/products'),
    mouvements: () => a.get<MouvementPub[]>('/ads/ledger'),
    estimer: (d) => a.post<Estimation>('/ads/quote', d),
    creer: (d) => a.post('/ads/campaigns/new', d, idem),
    pause: async (id) => {
      const r = await ou422(a.post<object>(`/ads/campaigns/${seg(id)}/pause`, { pause: true }), { state_changed: 'etat' as const })
      return r.ok ? { ok: true } : r
    },
    reprendre: (id) => a.post(`/ads/campaigns/${seg(id)}/resume`),
    arreter: async (id) => {
      const r = await ou422(a.post<{ rembourse: number }>(`/ads/campaigns/${seg(id)}/stop`, {}, idem), { state_changed: 'etat' as const })
      return r.ok ? { ok: true, rembourse: r.rembourse } : r
    },
    enchere: (id, enchere, budgetJour) => a.post(`/ads/campaigns/${seg(id)}/bid`, { enchere, budgetJour }),
    recharger: async (montant) => {
      const r = await ou422(a.post<MouvementKit>('/ads/top-up', { montant }, idem), { annonce_refusee: 'montant' as const, invalid: 'montant' as const })
      return r.ok ? { ok: true, demande: { id: r.id, montant: r.montant, envoyeeA: r.a, statut: r.statut } } : r
    },
    recharge: (id) => ouNull(a.get<Recharge>(`/ads/top-up/${seg(id)}`)),
    annulerRecharge: async (id) => {
      await a.supprimer(`/ads/top-up/${seg(id)}`)
    },
  }
}
