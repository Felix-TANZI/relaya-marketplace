// Domaine « paquets » branché sur le kit (backend-kit/apps/entreprise_operations) : paquets publiés visibles par
// l'entreprise, détail, accepter (Idempotency-Key), ignorer, rendre, alertes par zone. Réponses au format de
// src/donnees/domaines/paquets.ts ; un refus attendu est un 200 { ok: false, raison } ; paquet inconnu : 404 → null.
import type { ClientApi } from '@client/api/client'
import type { Disponibles, DetailPaquet, DomainePaquets, ReglageAlerte } from '../../donnees/domaines/paquets'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domainePaquets(api: ClientApi): SourceEntreprise['paquets'] {
  const a = appels(api, 'paquets')
  const d: DomainePaquets = {
    disponibles: () => a.get<Disponibles>('/packages'),
    paquet: (id) => ouNull(a.get<DetailPaquet>(`/packages/${seg(id)}`)),
    accepter: (id) => a.post(`/packages/${seg(id)}/accept`, {}, { idempotence: true }),
    ignorer: (id) => a.post(`/packages/${seg(id)}/ignore`, {}),
    rendre: (id) => a.post(`/packages/${seg(id)}/return`, {}),
    alertes: () => a.get<ReglageAlerte[]>('/packages/alerts'),
    reglerAlerte: async (zone, quoi, on) => {
      await a.patch<void>('/packages/alerts', { zone, quoi, on })
    },
  }
  return d
}
