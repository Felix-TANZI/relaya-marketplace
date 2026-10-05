// Domaines « Litiges et retours » (CL-11) : dossiers, ouverture (un dossier par colis), preuves, arrangement du
// vendeur, recours, retrait du dossier, dépôt d'un retour au relais ; et « Avis sur une commande » (CL-12).
// Routes du kit : backend-kit/apps/aftersales (réponses au format de src/donnees/source.ts, adaptateur identité).
import type { AvisEnvoye, CommandeLitige, DonneesAvis, Litige, NouveauLitige, Source } from '../../donnees/source'
import type { ClientApi } from '../client'
import { ErreurApi, ErreurConflit, ErreurIntrouvable } from '../erreurs'
import { toutesLesPages } from './pages'

const seg = encodeURIComponent

export function domaineLitiges(api: ClientApi) {
  const litige = async (id: string) => {
    try {
      return await api.get<{ litige: Litige; maintenant: number }>(`/disputes/${seg(id)}`)
    } catch (e) {
      if (e instanceof ErreurIntrouvable) return null
      throw e
    }
  }

  return {
    // ——— Avis sur une commande (AVIS-FENETRE après le retrait) ———
    // GET /api/orders/{id}/reviews → DonneesAvis ; 404 → null
    avis: async (ref: string) => {
      try {
        return await api.get<DonneesAvis>(`/orders/${seg(ref)}/reviews`)
      } catch (e) {
        if (e instanceof ErreurIntrouvable) return null
        throw e
      }
    },
    // POST /api/orders/{id}/reviews {notes[], commentaire, photo} → {ok} ; 403 non_eligible (pas retirée), 410 fenetre_fermee
    envoyerAvis: async (ref: string, a: Omit<AvisEnvoye, 'envoyeLe'>) => {
      try {
        return await api.post<{ ok: true }>(`/orders/${seg(ref)}/reviews`, { notes: a.notes, commentaire: a.commentaire, photo: a.photo })
      } catch (e) {
        if (e instanceof ErreurApi && e.code === 'non_eligible') return { ok: false as const, raison: 'non_retiree' as const }
        if (e instanceof ErreurApi && e.code === 'fenetre_fermee') return { ok: false as const, raison: 'ferme' as const }
        throw e
      }
    },

    // GET /api/me/disputes (pagination par curseur) → {litiges, maintenant}
    litiges: async () => {
      const { elements, maintenant } = await toutesLesPages<Litige>(api, '/me/disputes', 'litiges')
      return { litiges: elements, maintenant }
    },

    // GET /api/disputes/{id} → {litige, maintenant} ; 404 → null
    litige,

    // GET /api/orders/{id}?for=dispute → colis et relais de la commande ; 404 → null
    commandeLitige: async (ref: string) => {
      try {
        return await api.get<CommandeLitige>(`/orders/${seg(ref)}`, { query: { for: 'dispute' } })
      } catch (e) {
        if (e instanceof ErreurIntrouvable) return null
        throw e
      }
    },

    // POST /api/disputes {ref, colis, pb, description, souhait, photos, origine?} (Idempotency-Key) → Litige
    // (remboursé d'office si le montant est sous le seuil). 409 deja : le dossier déjà ouvert pour ce colis est rendu.
    ouvrirLitige: async (n: NouveauLitige) => {
      try {
        return await api.post<Litige>('/disputes', n, { idempotence: true })
      } catch (e) {
        const id = e instanceof ErreurConflit && e.code === 'deja' ? (e.data as { id?: string } | undefined)?.id : undefined
        const existant = id ? await litige(id) : null
        if (existant) return existant.litige
        throw e
      }
    },

    // POST /api/disputes/{id}/photos {photo} → 204 (photo : data: URL, horodatée par le serveur)
    ajouterPreuve: async (id: string, photo: string) => {
      await api.post(`/disputes/${seg(id)}/photos`, { photo })
    },

    // POST /api/disputes/{id}/arrangement {accepte} → 204 ; 409 state_changed, 422 fenetre_fermee
    repondreArrangement: async (id: string, accepte: boolean) => {
      await api.post(`/disputes/${seg(id)}/arrangement`, { accepte })
    },

    // POST /api/disputes/{id}/appeal {motif} → 204 (une fois, sous 48 h, DP-35)
    contesterDecision: async (id: string, motif: string) => {
      await api.post(`/disputes/${seg(id)}/appeal`, { motif })
    },

    // POST /api/disputes/{id}/withdraw → 204
    retirerLitige: async (id: string) => {
      await api.post(`/disputes/${seg(id)}/withdraw`)
    },

    // POST /api/returns/{id}/deposit → 204 (id : le dossier dont le retour est déposé)
    deposerRetour: async (id: string) => {
      await api.post(`/returns/${seg(id)}/deposit`)
    },
  } satisfies Partial<Source>
}
