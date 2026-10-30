// Domaine « tournee » branché sur le kit (backend-kit/apps/livreur_tournee) : tournée du jour dans l'ordre imposé,
// paramètres, itinéraire de l'arrêt en cours, arrivée, route coupée, preuves photo, appels masqués. La validation d'un
// incident par l'entreprise est un geste du portail : démonstration seulement.
import type { ClientApi } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import type { Appel, DomaineTournee, Itineraire, Joignable, ReglesLivreur, Tournee } from '../../donnees/domaines/tournee'
import type { SourceLivreur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineTournee(api: ClientApi): SourceLivreur['tournee'] {
  const a = appels(api)
  const d: DomaineTournee = {
    courante: () => ouNull(a.get<Tournee>('/rounds/current')),
    regles: () => a.get<ReglesLivreur>('/rounds/rules'),
    itineraire: (arretId) => ouNull(a.get<Itineraire>(`/stops/${seg(arretId)}/route`)),
    arriver: (arretId, origine, confirme) => a.geste(`/stops/${seg(arretId)}/arrive`, origine, { confirme: confirme === true }),
    signalerRoute: (note, origine) => a.geste('/road-reports', origine, { note }),
    deposerPreuve: (p, origine) => a.geste('/media', origine, { ...p }),
    joignables: () => a.get<Joignable[]>('/calls/contacts'),
    appels: () => a.get<Appel[]>('/calls'),
    appeler: (correspondant, mode, origine, modele) => a.geste('/calls', origine, { correspondant, mode, modele: modele ?? null }),
    raccrocher: (appelId, origine) => a.geste(`/calls/${seg(appelId)}/hangup`, origine),
    prioriser: (arretId, origine) => a.geste(`/stops/${seg(arretId)}/first`, origine),
    annoncerRetard: (arretId, minutes, origine) => a.geste(`/stops/${seg(arretId)}/delay`, origine, { minutes }),
    simulerValidationIncident: () => Promise.reject(new NonDisponible('tournee.simulerValidationIncident', 'démonstration seulement (portail de l’entreprise)')),
  }
  return d
}
