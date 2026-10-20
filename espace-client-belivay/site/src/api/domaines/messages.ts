// Domaine « Messagerie, aide et rappel » (CL-13 ; CMS-01 à CMS-12 ; DP-12) : conversations (support, dossiers,
// questions aux vendeurs), envoi masqué, question sur une fiche produit, aide, FAQ, rappel par le support.
//
// Vérifié le 14 oct. contre backend/ réel (pas backend-kit, qui n'est qu'un prototype non installé dans
// backend/relaya/settings/base.py — seuls client_core/otp/client_accounts/notifications_client en sont tirés) :
// - conversations/conversation/envoyerMessage/marquerToutLu (fil acheteur↔vendeur) : AUCUNE route réelle. Un
//   système MessageThread/ThreadMessage existe bien (backend/apps/vendors/models.py, construit début oct.), mais
//   strictement côté vendeur (auth vendeur obligatoire, backend/apps/vendors/views.py "boutique/messages") et sa
//   propre note de code le dit non validé pour la mise en production : il contredit la décision verrouillée
//   « pas de messagerie directe acheteur-vendeur, Product.faq compense » (Addendum Décisions v1.0). Ne pas
//   l'étendre côté client sans décision du porteur — laissé en NonDisponible (routes.ts : 'serveur').
// - faq/aide/rappel/demanderRappel/annulerRappel : aucun centre d'aide ni rappel programmé côté serveur
//   aujourd'hui (seul un FAQ statique codé en dur existe côté vendeur, apps/vendors/views.py _HELP_QUESTIONS, sans
//   équivalent client) — laissés en NonDisponible (routes.ts : 'serveur') en attendant une décision produit
//   (contenu statique front, ou petite route backend).
// - poserQuestion : branché pour de vrai sur le système de questions clients qui existait déjà côté vendeur
//   (ProductQuestion, réponse publique du vendeur) mais sans route pour POSER la question côté acheteur — complété
//   ici (POST /api/catalog/products/{id}/ask_question/), pas une nouvelle messagerie.
// - ecrireSupport : déjà correctement branché sur POST /api/contact/ (relaya), inchangé.
import type { Source } from '../../donnees/source'
import type { RUtilisateur } from '../adaptateurs'
import type { ClientApi } from '../client'

export function domaineMessages(api: ClientApi) {
  return {
    // POST /api/catalog/products/{id}/ask_question/ {text} → {id, product, text, masked[]}
    // (ProductQuestion existant côté vendeur, complété du côté « poser » ; coordonnées retirées côté serveur)
    poserQuestion: async (p: { cle: string; titre: string; dessin: string }, texte: string) => {
      const r = await api.post<{ id: string; masked: string[] }>(`/catalog/products/${encodeURIComponent(p.cle)}/ask_question/`, { text: texte })
      return { id: String(r.id), masques: r.masked ?? [] }
    },

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
  } satisfies Partial<Source>
}
