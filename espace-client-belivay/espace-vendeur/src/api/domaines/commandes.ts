// Domaine « commandes » branché sur le kit (backend-kit/apps/vendeur_commandes) : commandes reçues par filtre, avec
// compteurs et détail de la même lecture (CMD-02), une commande, son journal signé. Statut et état de l'argent sont
// dérivés côté serveur des faits du client et de BelivaY ; l'accès Préparation reçoit les montants à null.
// Réponses au format de src/donnees/domaines/commandes.ts ; 404 → null.
import type { ClientApi } from '@client/api/client'
import type { Commande, DomaineCommandes, EntreeJournal, FiltreCommandes, VueCommandes } from '../../donnees/domaines/commandes'
import type { SourceVendeur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineCommandes(api: ClientApi): SourceVendeur['commandes'] {
  const a = appels(api, 'commandes')
  const vue = (filtre: FiltreCommandes) => a.get<VueCommandes>('/orders', { query: { state: filtre } })
  const d: DomaineCommandes = {
    vue,
    liste: async (filtre) => (await vue(filtre)).items,
    compteurs: async () => (await vue('prep')).compteurs,
    detail: (ref) => ouNull(a.get<Commande>(`/orders/${seg(ref)}`)),
    journal: (ref) => a.get<EntreeJournal[]>(`/orders/${seg(ref)}/journal`),
  }
  return d
}
