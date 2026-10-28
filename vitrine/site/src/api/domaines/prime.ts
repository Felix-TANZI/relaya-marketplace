// Domaine « Abonnement et cagnotte » (CL-14 ; FF-ABONNEMENT, 404 si fermé ; CAB-43, CAB-44 ; DP-54) : palier,
// prélèvements, cagnotte, parrainage, cadeau d'abonnement. Routes du kit : backend-kit/apps/subscriptions
// (réponses au format de src/donnees/source.ts, adaptateur identité).
import type { Abonnement, CarteJeton, DonneesPrime, Source } from '../../donnees/source'
import type { ClientApi } from '../client'

type ResultatCadeau = Awaited<ReturnType<Source['offrirAbonnement']>>

export function domainePrime(api: ClientApi) {
  return {
    // GET /api/me/subscription → DonneesPrime (le scénario n'existe que dans la démonstration)
    prime: async () => api.get<DonneesPrime>('/me/subscription'),

    // POST /api/me/subscription/pay {moyen} (Idempotency-Key) → Abonnement (après un prélèvement refusé)
    payerAbonnement: async (moyen: string) => api.post<Abonnement>('/me/subscription/pay', { moyen }, { idempotence: true }),

    // PATCH /api/me/subscription {moyen} → 204
    changerMoyenAbonnement: async (moyen: string) => {
      await api.patch('/me/subscription', { moyen })
    },

    // POST /api/me/subscription {palier, formule, moyen} (Idempotency-Key) → Abonnement ; 409 trial_used
    souscrire: async (p: { palier: Abonnement['palier']; formule: Abonnement['formule']; moyen: string }) =>
      api.post<Abonnement>('/me/subscription', p, { idempotence: true }),

    // POST /api/me/subscription/cancel → 204
    resilierAbonnement: async () => {
      await api.post('/me/subscription/cancel')
    },

    // POST /api/me/subscription/resume → 204
    reprendreAbonnement: async () => {
      await api.post('/me/subscription/resume')
    },

    // POST /api/subscription-gifts {numero, prenom, palier, mois, message, carte} (Idempotency-Key) → résultat ;
    // carte : le jeton du prestataire (jamais le numéro). Numéro sans opérateur → 200 {ok: false, raison: 'inconnu'}.
    // 422 action_requise (3-D Secure), carte_refusee, plafond_carte : ErreurApi avec le message du serveur.
    offrirAbonnement: async (p: { numero: string; prenom: string; palier: 'plus' | 'prime' | 'duo'; mois: 1 | 3 | 12; message: string; carte: CarteJeton }) =>
      api.post<ResultatCadeau>(
        '/subscription-gifts',
        { numero: p.numero, prenom: p.prenom, palier: p.palier, mois: p.mois, message: p.message, carte: p.carte.jeton },
        { idempotence: true },
      ),

    // POST /api/me/cagnotte/payout → montant versé
    verserCagnotte: async () => api.post<number>('/me/cagnotte/payout'),
  } satisfies Partial<Source>
}
