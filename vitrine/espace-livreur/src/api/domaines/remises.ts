// Domaine « remises » branché sur le kit (backend-kit/apps/livreur_tournee) : dépôt au relais (QR de dépôt pendant
// l'arrêt en cours seulement), domicile, échec, départs du relais, retour au vendeur. Les gestes de l'autre téléphone
// (gérante, agrégateur) sont des routes d'essai : démonstration seulement ici.
import type { ClientApi } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import type { Collecte, DepotRelais, DomaineRemises, PreuvesEchec, RemiseDomicile, RetourVendeur } from '../../donnees/domaines/remises'
import type { SourceLivreur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineRemises(api: ClientApi): SourceLivreur['remises'] {
  const a = appels(api)
  const s = (id: string, suite: string) => `/stops/${seg(id)}/${suite}`
  const demo = (m: string, qui: string) => () => Promise.reject(new NonDisponible(`remises.${m}`, `démonstration seulement (${qui})`))
  const d: DomaineRemises = {
    depotRelais: (arretId) => ouNull(a.get<DepotRelais>(s(arretId, 'relay-drop'))),
    accepterConstat: (arretId, colisId, origine) => a.geste(s(arretId, `relay-drop/parcels/${seg(colisId)}/accept-report`), origine),
    confirmerDepot: (arretId, origine) => a.geste(s(arretId, 'relay-drop/confirm'), origine),
    relaisFerme: (arretId, photo, origine) => a.geste(s(arretId, 'relay-closed'), origine, { photo }),
    registrePapier: (arretId, photo, origine) => a.geste(s(arretId, 'paper-register'), origine, { photo }),

    domicile: (arretId) => ouNull(a.get<RemiseDomicile>(s(arretId, 'home'))),
    livrerDomicile: (arretId, code, photo, porteur, origine) => a.geste(s(arretId, 'home/deliver'), origine, { code, photo, porteur }),
    constat: (arretId, photos, note, origine) => a.geste(s(arretId, 'home/report'), origine, { photos, note }),
    preuvesEchec: (arretId) => a.get<PreuvesEchec>(s(arretId, 'home/fail-proofs')),
    echecDomicile: (arretId, motif, preuves, origine) => a.geste(s(arretId, 'home/fail'), origine, { motif, photo: preuves.photo, note: preuves.note }),

    collecte: (arretId) => ouNull(a.get<Collecte>(s(arretId, 'departures'))),
    confirmerDepart: (arretId, colisId, origine) => a.geste(s(arretId, `departures/${seg(colisId)}/confirm`), origine),
    photoScelle: (arretId, colisId, photo, origine) => a.geste(s(arretId, `departures/${seg(colisId)}/seal-photo`), origine, { photo }),
    departManquant: (arretId, colisId, origine) => a.geste(s(arretId, `departures/${seg(colisId)}/missing`), origine),
    terminerCollecte: (arretId, origine) => a.geste(s(arretId, 'departures/confirm'), origine),

    retour: (arretId) => ouNull(a.get<RetourVendeur>(s(arretId, 'return'))),
    remettreRetour: (arretId, code, photo, origine) => a.geste(s(arretId, 'return/deliver'), origine, { code, photo }),
    retourImpossible: (arretId, raison, photo, origine) => a.geste(s(arretId, 'return/vendor-absent'), origine, { raison, photo }),

    simulerScanRelais: demo('simulerScanRelais', 'application du relais'),
    simulerPresentation: demo('simulerPresentation', 'application du relais'),
  }
  return d
}
