// Domaine « litiges » branché sur le kit (backend-kit/apps/vendeur_litiges) : dossiers ouverts par le client
// (apps.aftersales) vus par la boutique, preuves, brouillon de réponse (24 h), réponse du propriétaire, recours.
// Réponses au format de src/donnees/domaines/litiges.ts, rendues telles quelles ; un refus attendu par l'écran est un
// 200 { ok: false, raison } (reserve_proprietaire compris, comme la démonstration) ; litige inconnu : 404 → null.
import type { ClientApi } from '@client/api/client'
import type { Brouillon, CompteursLitiges, Litige, ReglesLitiges, DomaineLitiges } from '../../donnees/domaines/litiges'
import type { SourceVendeur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineLitiges(api: ClientApi): SourceVendeur['litiges'] {
  const a = appels(api, 'litiges')
  const d: DomaineLitiges = {
    regles: () => a.get<ReglesLitiges>('/disputes/rules'),
    liste: (etat) => a.get<Litige[]>('/disputes', { query: { state: etat } }),
    compteurs: () => a.get<CompteursLitiges>('/disputes/counts'),
    detail: (ref) => ouNull(a.get<Litige>(`/disputes/${seg(ref)}`)),
    ajouterPreuve: (ref, photo) => a.post(`/disputes/${seg(ref)}/evidence`, { photo }, { idempotence: true }),
    retirerPreuve: (ref, id) => a.supprimer(`/disputes/${seg(ref)}/evidence/${seg(id)}`),
    garderBrouillon: async (ref, b: Omit<Brouillon, 'gardeA'> | null) => {
      await a.put<void>(`/disputes/${seg(ref)}/draft`, { brouillon: b })
    },
    repondre: (ref, posture, texte, arrangement) =>
      a.post(`/disputes/${seg(ref)}/answer`, { posture, texte, arrangement }, { idempotence: true }),
    contester: (ref, texte) => a.post(`/disputes/${seg(ref)}/appeal`, { texte }, { idempotence: true }),
  }
  return d
}
