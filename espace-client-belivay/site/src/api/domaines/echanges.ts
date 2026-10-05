// Domaine « Échanges entre clients » (DP-54) : proches, listes suivies, colis payés par l'un pour l'autre, panier
// payé pour un proche, et la boîte « Reçus » (reçus à traiter d'abord, envoyés avec les réponses).
// Règle commune (donnees/echanges.ts : qui paie la livraison, « BelivaY ne perd jamais ») refaite côté serveur.
// Routes du kit : backend-kit/apps/wishlists (échanges) et backend-kit/apps/recus (boîte « Reçus ») ; réponses au
// format de src/donnees/source.ts (adaptateur identité).
import type { ActionRecu, ColisEchange, DetailRecu, DonneesEchanges, DonneesRecus, EnvoiRecu, NouvelEnvoi, ProcheBelivay, ResultatRecu, Source } from '../../donnees/source'
import type { PaieFrais } from '../../donnees/echanges'
import type { ClientApi } from '../client'
import { ErreurIntrouvable } from '../erreurs'
import { ou, refusAttendu, seg, suivreRedirection } from './refus'

export function domaineEchanges(api: ClientApi) {
  return {
    // GET /api/me/exchanges → DonneesEchanges
    echanges: async () => api.get<DonneesEchanges>('/me/exchanges'),

    // POST /api/me/contacts/lookup {numero} → { ok, proche } | { ok: false, raison: numero | inconnu | moi } ; 429 au-delà de 20 par jour
    chercherProche: async (numero: string) =>
      api.post<{ ok: true; proche: ProcheBelivay } | { ok: false; raison: 'numero' | 'inconnu' | 'moi' }>('/me/contacts/lookup', { numero }),

    // POST /api/me/exchanges/send {type, id, proches[]} → { envoyes }
    envoyerAuxProches: async (objet: { type: 'liste' | 'cotisation'; id: string }, proches: string[]) =>
      api.post<{ envoyes: number }>('/me/exchanges/send', { type: objet.type, id: objet.id, proches }),

    // POST /api/me/wishlists/{id}/remind → { ok, n } | { ok: false, raison: personne } ; 429 too_early {prochain}
    rappelerInvites: async (liste: string) => {
      try {
        return await api.post<{ ok: true; n: number } | { ok: false; raison: 'personne' }>(`/me/wishlists/${seg(liste)}/remind`)
      } catch (e) {
        const x = refusAttendu(e, [] as const, { too_early: 'trop_tot' as const })
        return { ok: false as const, raison: x.raison, prochain: Number(x.data.prochain ?? 0) }
      }
    },

    // PUT /api/me/followed-wishlists/{code} {suivre, rappel} → 204 ; 422 rappel (jours non proposés)
    suivreListe: async (code: string, suivre: boolean, rappel: number | null) => {
      await api.put(`/me/followed-wishlists/${seg(code)}`, { suivre, rappel })
    },

    // POST /api/me/thanks {ref, texte} → 204
    remercier: async (ref: string, texte: string) => {
      await api.post('/me/thanks', { ref, texte })
    },

    // POST /api/me/incoming-parcels/{id}/answer {accepte} → ColisEchange ; 409 state_changed
    repondreColis: async (id: string, accepte: boolean) => api.post<ColisEchange>(`/me/incoming-parcels/${seg(id)}/answer`, { accepte }),

    // POST /api/wishlists/{code}/items/{produit}/pool → { ok, code } | { ok: false, raison: offert | ferme | petit }
    cotiserArticleListe: async (code: string, p: string) =>
      ou(api.post<{ ok: true; code: string } | { ok: false; raison: 'offert' | 'ferme' | 'petit' }>(`/wishlists/${seg(code)}/items/${seg(p)}/pool`), ['offert', 'ferme', 'petit'] as const),

    // POST /api/cart/send-to {prenom, proche, relais, qui_paie_livraison, moyen, mot} (Idempotency-Key) → { ok, ref } ;
    // refus vide, garantie, relais (200) ; 402 paiement_refuse remonte
    envoyerPanierA: async (c: { prenom: string; proche: string | null; relais: string; qui: PaieFrais; moyen: string; mot: string }) =>
      ou(
        api
          .post<{ ok: true; ref: string } | { ok: false; raison: 'vide' | 'garantie' | 'relais' }>(
            '/cart/send-to',
            { prenom: c.prenom, proche: c.proche, relais: c.relais, qui_paie_livraison: c.qui, moyen: c.moyen, mot: c.mot },
            { idempotence: true },
          )
          .then(suivreRedirection),
        ['vide', 'garantie', 'relais'] as const,
      ),

    // ——— Reçus (DP-54) ———

    // GET /api/me/inbox → DonneesRecus
    recus: async () => api.get<DonneesRecus>('/me/inbox'),

    // GET /api/me/inbox/{id} → DetailRecu ; 404 → null (lu seulement par l'envoyeur et le destinataire)
    recu: async (id: string) => {
      try {
        return await api.get<DetailRecu>(`/me/inbox/${seg(id)}`)
      } catch (e) {
        if (e instanceof ErreurIntrouvable) return null
        throw e
      }
    },

    // POST /api/me/inbox/{id}/actions {action, p?, montant?, moyen?, qui?, mot?, discret?, relais?} (Idempotency-Key)
    // → ResultatRecu ; 409 traite, 410 expire, 422 offert, montant, garantie, solde, moyen, diaspora
    executerRecu: async (id: string, a: ActionRecu) =>
      ou(api.post<ResultatRecu>(`/me/inbox/${seg(id)}/actions`, a, { idempotence: true }).then(suivreRedirection), [
        'traite',
        'expire',
        'offert',
        'montant',
        'garantie',
        'solde',
        'moyen',
        'diaspora',
      ] as const),

    // POST /api/me/inbox/{id}/thanks {texte} → { ok }
    remercierRecu: async (id: string, texte: string) => api.post<{ ok: boolean }>(`/me/inbox/${seg(id)}/thanks`, { texte }),

    // POST /api/me/outbox {type, a, prenom, titre, …} → { ok, envoi } ; refus numero, moi, vide (200 ou 422)
    envoyerRecu: async (e: NouvelEnvoi) =>
      ou(api.post<{ ok: true; envoi: EnvoiRecu } | { ok: false; raison: 'numero' | 'moi' | 'vide' }>('/me/outbox', e), ['numero', 'moi', 'vide'] as const),
  } satisfies Partial<Source>
}
