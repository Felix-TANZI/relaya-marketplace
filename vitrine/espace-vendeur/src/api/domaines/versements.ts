// Domaine « versements » branché sur le kit (backend-kit/apps/vendeur_argent) : prochain versement (référence
// BLV-VS-nnnn, statut de la machine VERSEMENT), historique, versement non reçu, numéro de versement changé avec deux
// codes SMS (nouveau numéro, téléphone personnel du propriétaire) et 7 jours de revue. Propriétaire seulement
// (403 owner_only → ReserveAuProprietaire). Un refus attendu par l'écran est un 200 { ok: false, raison }.
// Le serveur ne renvoie jamais le code (pas de codeDemo).
import type { ClientApi } from '@client/api/client'
import type { DomaineVersements, Historique, NumeroVersement, Prochain } from '../../donnees/domaines/versements'
import type { SourceVendeur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineVersements(api: ClientApi): SourceVendeur['versements'] {
  const a = appels(api, 'versements')
  const d: DomaineVersements = {
    prochain: () => ouNull(a.get<Prochain>('/payouts/next')),
    historique: (periode) => a.get<Historique>('/payouts', { query: { period: periode } }),
    signalerNonRecu: (reference) => a.post(`/payouts/${seg(reference)}/incident`, {}, { idempotence: true }),
    numero: () => a.get<NumeroVersement>('/payout-number'),
    demanderCodes: (operateur, numero) => a.post('/payout-number/codes', { operateur, numero }, { idempotence: true }),
    renvoyerCode: (quel) => a.post('/payout-number/codes/resend', { quel }, { idempotence: true }),
    confirmerNumero: (codeNouveau, codePersonnel) => a.put('/payout-number', { codeNouveau, codePersonnel }, { idempotence: true }),
    annulerSaisie: async () => {
      await a.supprimer('/payout-number/codes')
    },
  }
  return d
}
