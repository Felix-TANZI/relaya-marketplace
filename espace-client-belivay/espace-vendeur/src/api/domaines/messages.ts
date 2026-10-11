// Domaine « messages » branché sur le kit (backend-kit/apps/vendeur_boutique) : le vendeur répond dans les conversations
// du client (apps.messaging), anonymes dans les deux sens ; Support BelivaY ; réponses rapides. Le filtre des
// coordonnées est appliqué par le serveur avant l'enregistrement ; `filtrer` en montre l'effet avant l'envoi, avec la
// même règle (apps.client_core.masquage.nettoyer_message : e-mails, liens, numéros de 8 chiffres et plus).
import type { ClientApi } from '@client/api/client'
import { ErreurApi, ErreurIntrouvable } from '@client/api/erreurs'
import type { DomaineMessages, Fil, Message } from '../../donnees/domaines/messages'
import type { SourceVendeur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const LIEN = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|cm|fr|io|me|co|ly|app)(?:\/\S*)?\b/gi
const NUMERO = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\d[\s.-]?){7,}\d/g

export function filtrerCoordonnees(texte: string): { propre: string; filtre: boolean } {
  const propre = texte.replace(EMAIL, '•••').replace(LIEN, '•••').replace(NUMERO, '•••')
  return { propre, filtre: propre !== texte }
}

export function domaineMessages(api: ClientApi): SourceVendeur['messages'] {
  const a = appels(api, 'messages')
  const d: DomaineMessages = {
    fils: () => a.get<Fil[]>('/threads'),
    fil: (id) => ouNull(a.get<{ fil: Fil; messages: Message[] }>(`/threads/${seg(id)}`)),
    async envoyer(id, texte) {
      try {
        return await a.post<Message>(`/threads/${seg(id)}/messages`, { texte }, { idempotence: true })
      } catch (e) {
        // Mêmes erreurs que la démonstration : l'écran lit e.message (« ferme »).
        if (e instanceof ErreurApi && (e.code === 'ferme' || e.code === 'vide')) throw new Error(e.code)
        if (e instanceof ErreurIntrouvable) throw new Error('inconnu')
        throw e
      }
    },
    lire: async (id) => {
      await a.post<void>(`/threads/${seg(id)}/read`, {})
    },
    filtrer: filtrerCoordonnees,
    ecrireAuSupport: (texte, ref) => a.post<{ fil: string }>('/threads/support', { texte, ref: ref ?? null }, { idempotence: true }),
    reponsesRapides: (type) => a.get<string[]>('/quick-replies', { query: { type } }),
    ouvrirFil: (ref) => ouNull(a.post<{ fil: string }>('/threads', { order_id: ref })),
  }
  return d
}
