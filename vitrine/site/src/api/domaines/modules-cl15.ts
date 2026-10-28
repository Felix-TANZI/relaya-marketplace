// Modules CL-15 : mises de côté (FF-EX03), rentrée scolaire et listes d'école (FF-EX01), panier famille (FF-EX05),
// troc / reprise de téléphone (FF-EX04), assistant WhatsApp (FF-EX06). Routes du kit : backend-kit/apps/extras
// (réponses au format de src/donnees/source.ts : adaptateur identité). Un module fermé par son interrupteur répond
// 404 sur ses routes (CAP-13).
import type { CarteJeton, ConversationWa, DonneesFamille, DonneesRentree, MiseDeCote, PanierFamille, Source, Troc } from '../../donnees/source'
import type { ClientApi } from '../client'
import { fichierPhoto, seg, suivreRedirection } from './refus'

export function domaineModulesCl15(api: ClientApi) {
  return {
    // ——— Mises de côté ———

    // GET /api/me/layaways → { liste, maintenant }
    misesDeCote: async () => api.get<{ liste: MiseDeCote[]; maintenant: number }>('/me/layaways'),

    // POST /api/me/layaways {produit, rythme, moyen} (Idempotency-Key) → 201 MiseDeCote (acompte payé) ; 422 prix_min
    creerMiseDeCote: async (p: string, rythme: '2sem' | 'mois', moyen: string) =>
      api.post<MiseDeCote>('/me/layaways', { produit: p, rythme, moyen }, { idempotence: true }).then(suivreRedirection),

    // POST /api/me/layaways {liste, exclus, equivalents, rythme, moyen} (Idempotency-Key) → 201 MiseDeCote ; 422 trop_tard
    creerMiseDeCoteListe: async (liste: string, c: { exclus: string[]; equivalents: string[]; rythme: '2sem' | 'mois'; moyen: string }) =>
      api.post<MiseDeCote>('/me/layaways', { liste, ...c }, { idempotence: true }).then(suivreRedirection),

    // POST /api/me/layaways/{id}/installments {moyen} (Idempotency-Key) → MiseDeCote ; 409 state_changed
    payerVersement: async (id: string, moyen: string) =>
      api.post<MiseDeCote>(`/me/layaways/${seg(id)}/installments`, { moyen }, { idempotence: true }).then(suivreRedirection),

    // POST /api/me/layaways/{id}/cancel → MiseDeCote ; 409 state_changed
    annulerMiseDeCote: async (id: string) => api.post<MiseDeCote>(`/me/layaways/${seg(id)}/cancel`),

    // ——— Rentrée scolaire ———

    // GET /api/school-lists → DonneesRentree
    rentree: async () => api.get<DonneesRentree>('/school-lists'),

    // POST /api/school-lists/{id}/order {exclus, equivalents, moyen} (Idempotency-Key) → référence de commande ;
    // 422 vide, relais_absent
    commanderRentree: async (liste: string, c: { exclus: string[]; equivalents: string[]; moyen: string }) =>
      api.post<string>(`/school-lists/${seg(liste)}/order`, c, { idempotence: true }),

    // POST /api/school-lists/photo (multipart) {classe, photo} → 204 (liste papier à saisir par l'équipe)
    envoyerListePapier: async (classe: string, photo: string) => {
      const f = new FormData()
      f.append('classe', classe)
      f.append('photo', await fichierPhoto(photo, 'liste.jpg'))
      await api.post('/school-lists/photo', f)
    },

    // POST /api/school-lists/{id}/publish → 204 ; 403 forbidden, ecole_non_verifiee
    publierListe: async (id: string) => {
      await api.post(`/school-lists/${seg(id)}/publish`)
    },

    // ——— Panier famille ———

    // GET /api/me/family-baskets → DonneesFamille
    famille: async () => api.get<DonneesFamille>('/me/family-baskets'),

    // POST /api/me/family-baskets (création) · PUT /api/me/family-baskets/{id} → PanierFamille ; 422 article, jour
    enregistrerPanierFamille: async (p: Partial<PanierFamille> & { id?: string }) => {
      const { id, ...corps } = p
      return id ? api.put<PanierFamille>(`/me/family-baskets/${seg(id)}`, corps) : api.post<PanierFamille>('/me/family-baskets', corps)
    },

    // POST /api/me/family-baskets/recipient {prenom, numero, relais} → 204 ; 422 numero, relais
    lierDestinataire: async (d: { prenom: string; numero: string; relais: string }) => {
      await api.post('/me/family-baskets/recipient', d)
    },

    // POST /api/me/family-baskets/{id}/pay {carte: jeton, email, mensuel, jour} (Idempotency-Key) → PanierFamille ;
    // 422 vide, destinataire, poids, plafond. Carte : le jeton du prestataire seul (CAP-24).
    payerPanierFamille: async (id: string, p: { carte: CarteJeton; email: string; mensuel: boolean; jour: number }) =>
      api
        .post<PanierFamille>(`/me/family-baskets/${seg(id)}/pay`, { carte: p.carte.jeton, email: p.email, mensuel: p.mensuel, jour: p.jour }, { idempotence: true })
        .then(suivreRedirection),

    // PATCH /api/me/family-baskets/{id} {suspendu} → 204
    suspendrePanierFamille: async (id: string, suspendu: boolean) => {
      await api.patch(`/me/family-baskets/${seg(id)}`, { suspendu })
    },

    // ——— Troc (reprise de téléphone) ———

    // GET /api/me/trades → { liste, relais, maintenant }
    trocs: async () => api.get<{ liste: Troc[]; relais: string | null; maintenant: number }>('/me/trades'),

    // POST /api/me/trades {produit, modele, declare} → 201 Troc ; 422 declare, non_eligible, relais_absent
    creerTroc: async (t: { p: string; modele: string; declare: Troc['declare'] }) => api.post<Troc>('/me/trades', { produit: t.p, modele: t.modele, declare: t.declare }),

    // POST /api/me/trades/{id}/answer {accepte} → Troc ; 409 state_changed
    repondreTroc: async (id: string, accepte: boolean) => api.post<Troc>(`/me/trades/${seg(id)}/answer`, { accepte }),

    // POST /api/me/trades/{id}/contest {texte} → Troc ; 409 state_changed
    contesterTroc: async (id: string, texte: string) => api.post<Troc>(`/me/trades/${seg(id)}/contest`, { texte }),

    // POST /api/me/trades/{id}/pay {moyen} (Idempotency-Key) → Troc ; 409 state_changed
    payerTroc: async (id: string, moyen: string) => api.post<Troc>(`/me/trades/${seg(id)}/pay`, { moyen }, { idempotence: true }).then(suivreRedirection),

    // DELETE /api/me/trades/{id} → 204 (avant le dépôt) ; 409 state_changed
    annulerTroc: async (id: string) => {
      await api.supprimer(`/me/trades/${seg(id)}`)
    },

    // ——— WhatsApp ———
    // GET /api/whatsapp/conversation · POST /api/whatsapp/conversation/messages {texte} → ConversationWa.
    // Le kit répond 501 a_finir tant que l'API WhatsApp Business n'est pas en service (FF-EX06 : « non au lancement »).
    whatsapp: async () => api.get<ConversationWa>('/whatsapp/conversation'),
    repondreWhatsapp: async (texte: string) => api.post<ConversationWa>('/whatsapp/conversation/messages', { texte }),
  } satisfies Partial<Source>
}
