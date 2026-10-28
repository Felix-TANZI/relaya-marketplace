// Domaine « disponibilite » branché sur le kit (backend-kit/apps/livreur_tournee) : trois statuts ; « Hors service »
// refusé avec des colis sous garde (Resultat colis_sous_garde, nombre) ; compte non actif refusé. Planning des 14 jours
// (lecture) et absences prévenues (DP-66) : backend-kit/apps/livreur_journee.
import type { ClientApi } from '@client/api/client'
import type { DomaineDisponibilite, EtatDisponibilite, Planning } from '../../donnees/domaines/disponibilite'
import type { SourceLivreur } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineDisponibilite(api: ClientApi): SourceLivreur['disponibilite'] {
  const a = appels(api)
  const d: DomaineDisponibilite = {
    lire: () => a.get<EtatDisponibilite>('/status'),
    planning: () => a.get<Planning>('/planning'),
    prevenirAbsence: (x, origine) => a.geste('/absences', origine, { du: x.du, au: x.au, motif: x.motif, texte: x.texte }),
    annulerAbsence: (id, origine) => a.geste(`/absences/${seg(id)}/cancel`, origine),
    changer: (statut, origine, pause) => a.geste('/status', origine, { statut, pause: pause ?? null }),
  }
  return d
}
