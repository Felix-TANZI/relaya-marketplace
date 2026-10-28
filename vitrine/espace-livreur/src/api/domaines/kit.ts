// Domaine « kit » branché sur le kit (backend-kit/apps/livreur_journee) : stock calculé par le serveur, remise de
// l'entreprise, rouleau d'étiquettes, fin de journée.
import type { ClientApi } from '@client/api/client'
import type { DomaineKit, Kit } from '../../donnees/domaines/kit'
import type { SourceLivreur } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineKit(api: ClientApi): SourceLivreur['kit'] {
  const a = appels(api)
  const d: DomaineKit = {
    lire: () => a.get<Kit>('/kit'),
    confirmerReception: (quantites, accessoires, premiereEtiquette, origine) => a.geste('/kit/receipts', origine, { quantites, accessoires, premiereEtiquette }),
    demanderReassort: (formats, paquetId, origine) => a.geste('/kit/restock-request', origine, { formats, paquetId }),
    declarerAbimee: (format, origine) => a.geste('/kit/damage', origine, { format }),
    declarerRouleauPerdu: (origine) => a.geste('/kit/label-rolls/current/lost', origine),
    lierEtiquette: (format, etiquette, paquetId, origine) => a.geste(`/kit/labels/${seg(etiquette)}/link`, origine, { format, paquetId }),
    declarerRendu: (rendu, origine) => a.geste('/kit/return', origine, { rendu }),
    declarerMotifEcart: (format, motif, origine) => a.geste(`/kit/gaps/${seg(format)}`, origine, { motif }),
  }
  return d
}
