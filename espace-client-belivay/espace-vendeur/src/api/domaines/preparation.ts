// Domaine « preparation » branché sur le kit (backend-kit/apps/vendeur_commandes) : « C'est prêt » (heure d'origine
// d'une action gardée hors connexion), rupture (vendeur suivant ou remboursement, DP-01), plus de temps (options et
// demande), bon de préparation (ouvert, cases, référence scannée). Refus attendus : 200 { ok: false, raison } ;
// 404 → null.
import type { ClientApi } from '@client/api/client'
import type { BonPreparation, DomainePreparation, OptionsDelai } from '../../donnees/domaines/preparation'
import type { SourceVendeur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domainePreparation(api: ClientApi): SourceVendeur['preparation'] {
  const a = appels(api, 'preparation')
  const o = (ref: string, quoi = '') => `/orders/${seg(ref)}${quoi}`
  const d: DomainePreparation = {
    cestPret: (ref, at) => a.post(o(ref, '/ready'), at === undefined ? {} : { a: at }, { idempotence: true }),
    signalerRupture: (ref, stockAZero) => a.post(o(ref, '/stockout'), { stockAZero }, { idempotence: true }),
    optionsDelai: (ref) => ouNull(a.get<OptionsDelai>(o(ref, '/extend'))),
    demanderDelai: (ref, choix) => a.post(o(ref, '/extend'), { choix }),
    bon: (ref) => ouNull(a.get<BonPreparation>(o(ref, '/slip'))),
    ouvrirBon: async (ref) => {
      await ouNull(a.post<void>(o(ref, '/slip/open')))
    },
    cocher: (ref, i, fait) => ouNull(a.post<BonPreparation>(o(ref, '/slip/checks'), { i, fait })),
    verifierReference: (ref, lu) => a.post(o(ref, '/slip/verify'), { lu }),
  }
  return d
}
