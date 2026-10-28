// Domaine « Cotisations » (CL-15 ; FF-EX02) : un cadeau payé à plusieurs, lien public c/{code}, noms discrets
// masqués, hausse de prix à compléter ou rembourser. Routes du kit : backend-kit/apps/extras (réponses au format de
// src/donnees/source.ts : adaptateur identité).
import type { CarteJeton, Cotisation, Source } from '../../donnees/source'
import type { PaieFrais } from '../../donnees/echanges'
import type { ClientApi } from '../client'
import { ErreurIntrouvable } from '../erreurs'
import { jetonCarte, ou, seg, suivreRedirection } from './refus'

export function domaineCotisations(api: ClientApi) {
  return {
    // GET /api/me/pools → { liste, maintenant }
    cotisations: async () => api.get<{ liste: Cotisation[]; maintenant: number }>('/me/pools'),

    // POST /api/me/pools {nom, occasion, p, beneficiaire, relais, jusqua, qui?} → 201 Cotisation ; 422 relais, date
    creerCotisation: async (c: { nom: string; occasion: string; p: string; beneficiaire: string; relais: string; jusqua: number; qui?: PaieFrais }) =>
      api.post<Cotisation>('/me/pools', c),

    // GET /api/pools/{code} (public) → Cotisation (noms discrets masqués) ; 404 → null
    cotisationPublique: async (code: string) => {
      try {
        return await api.get<Cotisation>(`/pools/${seg(code)}`)
      } catch (e) {
        if (e instanceof ErreurIntrouvable) return null
        throw e
      }
    },

    // POST /api/pools/{code}/contributions {prenom, montant, discret, mot, moyen, jeton?, carte} (Idempotency-Key)
    // → { ok, cotisation } | { ok: false, raison: fermee | montant }. Carte : le jeton du prestataire seul (CAP-24).
    participer: async (code: string, p: { prenom: string; montant: number; discret: boolean; mot: string; moyen: string; carte: CarteJeton | null }) =>
      ou(
        api
          .post<{ ok: true; cotisation: Cotisation } | { ok: false; raison: 'fermee' | 'montant' }>(
            `/pools/${seg(code)}/contributions`,
            { prenom: p.prenom, montant: p.montant, discret: p.discret, mot: p.mot, moyen: p.moyen, jeton: jetonCarte(p.carte), carte: p.carte !== null },
            { idempotence: true },
          )
          .then(suivreRedirection),
        ['fermee', 'montant'] as const,
      ),

    // POST /api/me/pools/{id}/price-rise {choix, moyen?} → Cotisation ; 409 state_changed, 422 moyen
    deciderHausse: async (id: string, choix: 'completer' | 'rembourser', moyen?: string) =>
      api.post<Cotisation>(`/me/pools/${seg(id)}/price-rise`, { choix, moyen: moyen ?? null }, { idempotence: true }),
  } satisfies Partial<Source>
}
