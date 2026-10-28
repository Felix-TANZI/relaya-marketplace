// Domaine « Messagerie, aide et rappel » (CL-13 ; CMS-01 à CMS-12 ; DP-12) : conversations (support, dossiers,
// questions aux vendeurs), envoi masqué, question sur une fiche produit, aide, FAQ, rappel par le support.
// Routes du kit : backend-kit/apps/messaging (réponses au format de src/donnees/source.ts, adaptateur identité).
// ecrireSupport reste sur POST /api/contact/ de relaya.
import type { Conversation, DemandeRappel, DonneesAide, Masque, Rappel, Source, ThemeFaq } from '../../donnees/source'
import type { RUtilisateur } from '../adaptateurs'
import type { ClientApi } from '../client'
import { ErreurIntrouvable } from '../erreurs'
import { toutesLesPages } from './pages'

const seg = encodeURIComponent
const langue = () => (typeof document !== 'undefined' && document.documentElement.lang ? document.documentElement.lang.slice(0, 2) : 'fr')

export function domaineMessages(api: ClientApi) {
  return {
    // GET /api/me/threads (pagination par curseur) → {conversations, maintenant, commandesEnCours}
    conversations: async () => {
      const { elements, maintenant, premiere } = await toutesLesPages<Conversation>(api, '/me/threads', 'conversations')
      return { conversations: elements, maintenant, commandesEnCours: (premiere.commandesEnCours as string[] | undefined) ?? [] }
    },

    // GET /api/me/threads/{id} → {conversation, maintenant} (la marque lue) ; 404 → null
    conversation: async (id: string) => {
      try {
        return await api.get<{ conversation: Conversation; maintenant: number }>(`/me/threads/${seg(id)}`)
      } catch (e) {
        if (e instanceof ErreurIntrouvable) return null
        throw e
      }
    },

    // POST /api/me/threads/{id}/messages {texte?, photo?} → {masques} (numéros, e-mails, liens retirés par le serveur)
    envoyerMessage: async (id: string, m: { texte?: string; photo?: string }) =>
      api.post<{ masques: Masque[] }>(`/me/threads/${seg(id)}/messages`, m),

    // POST /api/me/threads/read → 204
    marquerToutLu: async () => {
      await api.post('/me/threads/read')
    },

    // POST /api/messages/threads {produit, texte} → {id, masques}
    poserQuestion: async (p: { cle: string; titre: string; dessin: string }, texte: string) =>
      api.post<{ id: string; masques: Masque[] }>('/messages/threads', { produit: p.cle, texte }),

    // GET /api/help/faq?lang= → ThemeFaq[] (publique)
    faq: async () => api.get<ThemeFaq[]>('/help/faq', { query: { lang: langue() }, anonyme: !api.jetons.lire() }),

    // GET /api/help → DonneesAide
    aide: async () => api.get<DonneesAide>('/help'),

    // GET /api/support/callback → Rappel | null
    rappel: async () => (await api.get<Rappel | null>('/support/callback')) ?? null,

    // POST /api/support/callback {sujet, commande, creneau, precision} → Rappel (aujourd'hui ou demain)
    demanderRappel: async (r: DemandeRappel) => api.post<Rappel>('/support/callback', r),

    // POST /api/contact/ (relaya) {name, email, phone, subject, message} → {id}
    ecrireSupport: async (m: { sujet: string; commande: string | null; texte: string; photo: string | null }) => {
      const moi = await api.get<RUtilisateur>('/auth/me/')
      const r = await api.post<{ id: number }>('/contact/', {
        name: [moi.first_name, moi.last_name].filter(Boolean).join(' ') || moi.username,
        email: moi.email,
        phone: moi.phone ?? '',
        subject: m.commande ? `${m.sujet} · ${m.commande}` : m.sujet,
        message: m.texte,
      })
      return { id: String(r.id), masques: [] }
    },

    // DELETE /api/support/callback → 204
    annulerRappel: async () => {
      await api.supprimer('/support/callback')
    },
  } satisfies Partial<Source>
}
