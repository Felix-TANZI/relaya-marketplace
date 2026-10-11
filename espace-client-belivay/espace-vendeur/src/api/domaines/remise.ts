// Domaine « remise » branché sur le kit (backend-kit/apps/vendeur_commandes) : remise d'une commande (sans le code),
// remises à faire et toutes, code au toucher (journalisé, handover_code.viewed), nouveau code après un blocage
// (DP-56), reçu vendeur et reçus (propriétaire seulement : 403 owner_only → ReserveAuProprietaire).
// saisieLivreur et simuler appartiennent à l'application du livreur et au client : démonstration seulement ici (le
// serveur d'essai les sert par ses routes /api/_essai/…).
import type { ClientApi } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import type { DomaineRemise, Recu, RecuResume, Remise } from '../../donnees/domaines/remise'
import type { SourceVendeur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineRemise(api: ClientApi): SourceVendeur['remise'] {
  const a = appels(api, 'remise')
  const o = (ref: string, quoi = '') => `/orders/${seg(ref)}${quoi}`
  const d: DomaineRemise = {
    remise: (ref) => ouNull(a.get<Remise>(o(ref, '/handover'))),
    aRemettre: () => a.get<Remise[]>('/handovers', { query: { state: 'a_remettre' } }),
    toutes: () => a.get<Remise[]>('/handovers'),
    afficherCode: (ref) => a.get(o(ref, '/handover-code')),
    nouveauCode: (ref) => a.post(o(ref, '/handover-code/renew'), {}, { idempotence: true }),
    saisieLivreur: () => Promise.reject(new NonDisponible('remise.saisieLivreur', 'démonstration seulement')),
    simuler: () => Promise.reject(new NonDisponible('remise.simuler', 'démonstration seulement')),
    recu: (ref) => ouNull(a.get<Recu>(o(ref, '/receipt'))),
    recus: () => a.get<RecuResume[]>('/receipts'),
  }
  return d
}
