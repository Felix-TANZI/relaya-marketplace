// Domaine « Listes d'envies » (CL-14 ; FF-LISTE-ENVIES) : toutes les occasions (anniversaire, mariage avec sa
// cagnotte, dot, naissance…), le statut WhatsApp, la page publique l/{code} et « offrir » depuis n'importe où.
// Routes du kit : backend-kit/apps/wishlists (réponses au format de src/donnees/source.ts : adaptateur identité).
import type { CanalStatut, CarteJeton, ControleDiaspora, EnvoiCode, ListeEnvies, ListePublique, OccasionListe, Source, SuiviCadeau } from '../../donnees/source'
import type { PaieFrais } from '../../donnees/echanges'
import type { ClientApi } from '../client'
import { ErreurConflit, ErreurIntrouvable } from '../erreurs'
import { ou, refusAttendu, seg, suivreRedirection } from './refus'

const nullSi404 = async <T>(appel: Promise<T>): Promise<T | null> => {
  try {
    return await appel
  } catch (e) {
    if (e instanceof ErreurIntrouvable) return null
    throw e
  }
}

export function domaineListes(api: ClientApi) {
  return {
    // GET /api/me/wishlists → { listes, relais, maintenant }
    listes: async () => api.get<{ listes: ListeEnvies[]; relais: string | null; maintenant: number }>('/me/wishlists'),

    // POST /api/me/wishlists {nom, mode, remiseLe, surprise, occasion?, hotes?, cagnotte?} → 201 ListeEnvies
    creerListe: async (l: { nom: string; mode: 'fil' | 'groupe'; remiseLe: number | null; surprise: boolean; occasion?: OccasionListe | null; hotes?: string[]; cagnotte?: { titre: string; objectif: number } | null }) =>
      api.post<ListeEnvies>('/me/wishlists', l),

    // POST /api/me/wishlists/{id}/items {produit} → 204
    ajouterArticleListe: async (id: string, p: string) => {
      await api.post(`/me/wishlists/${seg(id)}/items`, { produit: p })
    },

    // DELETE /api/me/wishlists/{id}/items/{produit} → { ok } (ok: false pour un article déjà offert)
    retirerArticleListe: async (id: string, p: string) => api.supprimer<{ ok: boolean }>(`/me/wishlists/${seg(id)}/items/${seg(p)}`),

    // PATCH /api/me/wishlists/{id} {destination?, tiers?, surprise?, domicile?} → 204 ; 422 relais
    reglerListe: async (id: string, r: Partial<Pick<ListeEnvies, 'destination' | 'tiers' | 'surprise' | 'domicile'>>) => {
      await api.patch(`/me/wishlists/${seg(id)}`, r)
    },

    // POST /api/me/wishlists/{id}/share → ListeEnvies (code du lien public) · DELETE → 204
    partagerListe: async (id: string) => api.post<ListeEnvies>(`/me/wishlists/${seg(id)}/share`),
    arreterPartage: async (id: string) => {
      await api.supprimer(`/me/wishlists/${seg(id)}/share`)
    },

    // POST /api/me/wishlists/{id}/start → 204
    demarrerListe: async (id: string) => {
      await api.post(`/me/wishlists/${seg(id)}/start`)
    },

    // GET /api/wishlists/{code} (public, CAP-11) → ListePublique ; 404 → null
    listePublique: async (code: string) => nullSi404(api.get<ListePublique>(`/wishlists/${seg(code)}`)),

    // POST /api/wishlists/{code}/gifts (Idempotency-Key, public) → { ok, ref } ou { ok: false, raison } ;
    // 409 price_changed {prix} → raison « prix » ; 422 plafond, domicile ; 422 coherence, verification {controle}.
    // Carte : le jeton du prestataire seul (CAP-24), avec le BIN et le pays déclaré pour le contrôle de cohérence.
    offrirArticleListe: async (
      code: string,
      p: string,
      o: { prenom: string; email: string; moyen: string; prixVu: number; qui?: PaieFrais; livraison?: 'relais' | 'domicile'; devise?: 'EUR' | 'USD'; carte?: { jeton: CarteJeton; paysCarte: string; pays: string; codeEmail?: string } },
    ) => {
      type R = Awaited<ReturnType<Source['offrirArticleListe']>>
      try {
        const r = await api.post<R>(
          `/wishlists/${seg(code)}/gifts`,
          {
            produit: p,
            prenom: o.prenom,
            email: o.email,
            moyen: o.moyen,
            jeton: o.carte?.jeton.jeton ?? '',
            prix_vu: o.prixVu,
            qui: o.qui ?? 'payeur',
            livraison: o.livraison ?? 'relais',
            devise: o.devise ?? null,
            carte: o.carte ? { bin: o.carte.jeton.bin, pays_carte: o.carte.paysCarte, pays: o.carte.pays, code_email: o.carte.codeEmail ?? '' } : null,
          },
          { idempotence: true },
        )
        return suivreRedirection(r)
      } catch (e) {
        if (e instanceof ErreurConflit && e.code === 'price_changed') return { ok: false, raison: 'prix', prix: Number((e.data as { prix?: number } | undefined)?.prix ?? o.prixVu) } satisfies R
        const x = refusAttendu(e, ['plafond', 'domicile', 'coherence', 'verification', 'offert', 'ferme', 'garantie'] as const)
        if (x.raison === 'coherence' || x.raison === 'verification') return { ok: false, raison: x.raison, controle: x.data.controle as ControleDiaspora } satisfies R
        return { ok: false, raison: x.raison } satisfies R
      }
    },

    // POST /api/wishlists/{code}/gifts/otp {email} → EnvoiCode (vérification renforcée d'un cadeau par carte)
    envoyerCodeCadeau: async (code: string, email: string) => api.post<EnvoiCode>(`/wishlists/${seg(code)}/gifts/otp`, { email }),

    // GET /api/wishlists/{code}/gifts/{ref} (public, lien de l'e-mail de suivi) → SuiviCadeau ; 404 → null
    suiviCadeau: async (code: string, ref: string) => nullSi404(api.get<SuiviCadeau>(`/wishlists/${seg(code)}/gifts/${seg(ref)}`)),

    // POST /api/me/wishlists/{id}/status-shares {canal} → { code, jusqua } (crée le lien au besoin)
    partagerStatutListe: async (id: string, canal: CanalStatut) => api.post<{ code: string; jusqua: number }>(`/me/wishlists/${seg(id)}/status-shares`, { canal }),

    // POST /api/wishlists/{code}/fund {prenom, montant, moyen, mot, discret} (Idempotency-Key, public) → { ok, reuni } ;
    // refus ferme, montant (200 ou 422)
    participerCagnotteListe: async (code: string, p: { prenom: string; montant: number; moyen: string; mot: string; discret: boolean }) =>
      ou(api.post<{ ok: true; reuni: number } | { ok: false; raison: 'ferme' | 'montant' }>(`/wishlists/${seg(code)}/fund`, p, { idempotence: true }).then(suivreRedirection), ['ferme', 'montant'] as const),
  } satisfies Partial<Source>
}
