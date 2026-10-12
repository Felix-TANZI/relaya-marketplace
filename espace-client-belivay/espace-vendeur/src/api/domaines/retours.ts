// Domaine « retours » branché sur le kit (backend-kit/apps/vendeur_litiges) : retours acceptés par BelivaY
// (apps.aftersales.Retour) vus par la boutique, réception (l'heure réelle lance l'inspection, Q-72), photos et
// brouillon d'inspection, verdict, choix remplacer / rembourser (propriétaire), remplacement prêt.
// Réponses au format de src/donnees/domaines/retours.ts ; refus attendus : 200 { ok: false, raison } ; 404 → null.
import type { ClientApi } from '@client/api/client'
import type { CompteursRetours, DomaineRetours, Retour } from '../../donnees/domaines/retours'
import type { SourceVendeur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineRetours(api: ClientApi): SourceVendeur['retours'] {
  const a = appels(api, 'retours')
  const d: DomaineRetours = {
    // /returns/v2 (et non /returns) : évite la collision avec l'ancienne liste du premier
    // frontend vendeur (frontend/src/services/api/vendors.ts) — voir backend/apps/vendors/urls.py.
    liste: (etat) => a.get<Retour[]>('/returns/v2', { query: { state: etat } }),
    compteurs: () => a.get<CompteursRetours>('/returns/counts'),
    detail: (ref) => ouNull(a.get<Retour>(`/returns/${seg(ref)}`)),
    recevoir: (ref) => a.post(`/returns/${seg(ref)}/receive`, {}, { idempotence: true }),
    ajouterPhoto: (ref, photo) => a.post(`/returns/${seg(ref)}/photos`, { photo }, { idempotence: true }),
    retirerPhoto: async (ref, id) => {
      await a.supprimer(`/returns/${seg(ref)}/photos/${seg(id)}`)
    },
    garderBrouillon: async (ref, b) => {
      await a.put<void>(`/returns/${seg(ref)}/draft`, b)
    },
    inspecter: (ref, verdict, controles) => a.post(`/returns/${seg(ref)}/inspection`, { verdict, controles }, { idempotence: true }),
    proposer: (ref, choix) => a.post(`/returns/${seg(ref)}/replacement`, { choix }, { idempotence: true }),
    remplacementPret: (ref) => a.post(`/returns/${seg(ref)}/replacement/ready`, {}, { idempotence: true }),
  }
  return d
}
