// Domaine « Portefeuille, moyens de paiement, factures » (CL-13 ; CWL-01 à CWL-12, CCO-07, CCO-14, CCO-15, CCO-20 ;
// DP-23, DP-48 ; CAP-21, CAP-24). Routes du kit : backend-kit/apps/wallet, réponses au format du site.
// Portefeuille derrière FF-WALLET (404 si le module est fermé). Cartes : seul le jeton du prestataire part
// (src/connecteurs/paiementCarte.ts), jamais le numéro ni le CVC.
import type { Carte, DonneesFactures, DonneesPortefeuille, EnvoiCode, MoyenPaiement, NouvelleCarte, ResultatCode, ResultatPortefeuille } from '../../donnees/source'
import type { ClientApi } from '../client'
import { avecIntention } from './paiement'
import { jetonCarte, ou, seg } from './refus'

type PageFactures = DonneesFactures & { maintenant: number; next_cursor?: string | null }

export function domaineArgent(api: ClientApi) {
  return {
    // GET /api/me/factures (curseur, CAP-05) → toutes les pages ; le PDF : GET /api/orders/{id}/invoice.pdf
    factures: async () => {
      const premiere = await api.get<PageFactures>('/me/factures', { query: { limit: 50 } })
      const factures = [...premiere.factures]
      let curseur = premiere.next_cursor ?? null
      for (let n = 0; curseur && n < 20; n++) {
        const p = await api.get<PageFactures>('/me/factures', { query: { limit: 50, cursor: curseur } })
        factures.push(...p.factures)
        curseur = p.next_cursor ?? null
      }
      return { factures, annulees: premiere.annulees, maintenant: premiere.maintenant }
    },

    // ——— Portefeuille ———
    portefeuille: async () => api.get<DonneesPortefeuille>('/me/wallet'),
    // POST /api/me/wallet/topups {montant, moyen} (Idempotency-Key) → ResultatPortefeuille (crédit à la confirmation)
    recharger: async (montant: number, moyenId: string) =>
      avecIntention('recharge', { montant, moyenId }, (cle) => api.post<ResultatPortefeuille>('/me/wallet/topups', { montant, moyen: moyenId }, { idempotence: cle })),
    // GET /api/me/wallet/withdrawal-fee?montant= → frais (0 si le retrait serait refusé)
    fraisRetrait: async (montant: number) => api.get<number>('/me/wallet/withdrawal-fee', { query: { montant } }),
    // POST /api/me/wallet/withdrawals {montant, moyen} (Idempotency-Key) → ResultatPortefeuille
    retirer: async (montant: number, moyenId: string) =>
      avecIntention('retrait', { montant, moyenId }, (cle) => api.post<ResultatPortefeuille>('/me/wallet/withdrawals', { montant, moyen: moyenId }, { idempotence: cle })),

    // ——— Numéros Mobile Money ———
    moyensPaiement: async () => api.get<MoyenPaiement[]>('/me/moyens-paiement'),
    // POST /api/me/moyens-paiement {numero} → {ok, envoi} (le code part avec la réponse) ; 409 deja
    ajouterMoyen: async (numero: string) => ou(api.post<{ ok: true; envoi: EnvoiCode }>('/me/moyens-paiement', { numero }), ['deja'] as const),
    // POST /api/me/moyens-paiement/{numero ou id}/verify {code} → ResultatCode
    confirmerMoyen: async (numero: string, code: string) => api.post<ResultatCode>(`/me/moyens-paiement/${seg(numero.replace(/\s/g, ''))}/verify`, { code }),
    moyenParDefaut: async (id: string) => {
      await api.patch(`/me/moyens-paiement/${seg(id)}`, { par_defaut: true })
    },
    retirerMoyen: async (id: string) => {
      await api.supprimer(`/me/moyens-paiement/${seg(id)}`)
    },

    // ——— Cartes ———
    cartes: async () => api.get<Carte[]>('/me/cartes'),
    // POST /api/me/cartes {jeton, titulaire} → {ok, carte} (marque, 4 derniers chiffres, expiration lus chez le prestataire) ; 409 deja
    ajouterCarte: async (c: NouvelleCarte) => ou(api.post<{ ok: true; carte: Carte }>('/me/cartes', { jeton: jetonCarte(c.carte), titulaire: c.titulaire }), ['deja'] as const),
    retirerCarte: async (id: string) => {
      await api.supprimer(`/me/cartes/${seg(id)}`)
    },
    carteParDefaut: async (id: string) => {
      await api.patch(`/me/cartes/${seg(id)}`, { par_defaut: true })
    },
  }
}
