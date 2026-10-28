// Domaine « ramassage » branché sur le kit (backend-kit/apps/livreur_tournee) : maillon C1 (arrivée, contrôle, audit
// C4, étiquette, emballage, code de remise du vendeur, refus). Le code du vendeur n'est jamais rendu (codeDemo absent).
import type { ClientApi } from '@client/api/client'
import type { DomaineRamassage, Ramassage } from '../../donnees/domaines/ramassage'
import type { SourceLivreur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineRamassage(api: ClientApi): SourceLivreur['ramassage'] {
  const a = appels(api)
  const arret = (id: string, geste: string) => `/stops/${seg(id)}/${geste}`
  const colis = (id: string, geste: string) => `/parcels/${seg(id)}/${geste}`
  const d: DomaineRamassage = {
    ramassage: (arretId) => ouNull(a.get<Ramassage>(arret(arretId, 'pickup'))),
    relancer: (arretId, origine) => a.geste(arret(arretId, 'remind'), origine),
    pasPret: (arretId, origine) => a.geste(arret(arretId, 'not-ready'), origine),
    boutiqueFermee: (arretId, photo, note, origine) => a.geste(arret(arretId, 'shop-closed'), origine, { photo, note }),
    controler: (colisId, c, origine) => a.geste(colis(colisId, 'control'), origine, { ...c }),
    auditer: (colisId, x, origine) => a.geste(colis(colisId, 'audit'), origine, { ...x }),
    lierEtiquette: (colisId, numero, origine) => a.geste(colis(colisId, 'label'), origine, { numero }),
    emballer: (colisId, e, origine) => a.geste(colis(colisId, 'seal'), origine, { ...e }),
    emballageManquant: (colisId, origine) => a.geste(colis(colisId, 'packaging-missing'), origine),
    validerCode: (arretId, code, origine) => a.geste(arret(arretId, 'handover-code'), origine, { code }),
    refuser: (colisId, motif, photo, note, origine) => a.geste(colis(colisId, 'refuse'), origine, { motif, photo, note }),
    corrigerSurPlace: (colisId, origine) => a.geste(colis(colisId, 'correct'), origine),
    recuperer: (colisId, par, photo, origine) => a.geste(colis(colisId, 'collected'), origine, { par, photo }),
    colisManquant: (colisId, choix, origine) => a.geste(colis(colisId, 'missing'), origine, { choix }),
  }
  return d
}
