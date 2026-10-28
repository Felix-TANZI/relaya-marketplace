// Domaine « affectation » (ENT-P12) : livreurs éligibles pour un paquet accepté (actif, certifié, disponible, zone,
// véhicule adapté à la plus grande classe : ENT-AFF-01, ENT-02-R26) et ceux qui ne le sont pas avec leurs raisons ;
// suggestion (VAGUE n° 6 : zone, charge du jour, Trust Score puis distance ; calculs/suggestion.ts) ; affecter, réaffecter
// (avant le premier code de remise ; ensuite transfert : DED-28). Créneau annoncé au vendeur (ENT-P12R-03). Alerte si
// non affecté ENT-ALERTE-NON-AFFECTE minutes après l'acceptation. Propriétaire et répartiteur.
// API : GET /api/company/packages/{id}/eligible-couriers ; POST …/assign · …/reassign (422 COURIER_NOT_ELIGIBLE).
// DP-63 : seule l'entreprise affecte ; BelivaY publie le paquet et n'affecte jamais un livreur.
// DP-67 : « preavis » : dernier jour du préavis de départ (ou après) : plus de nouvelle affectation ; « photo » :
// nouvelle photo demandée, pas validée dans le délai PHOTO-REVERIF-J.
import type { Suggestion } from '../../calculs/suggestion'
import type { ClasseColis, Instant, LivreurCourt, Resultat } from '../communs'

export type RaisonNonEligible = 'zone' | 'vehicule' | 'certification' | 'suspendu' | 'activation' | 'en_mission' | 'preavis' | 'photo'

export interface Eligible extends LivreurCourt {
  trustScore: number | null
  distanceKm: number | null // null : position inconnue
  trajetMin: number | null
  kitManque: { format: string; nombre: number }[] // manque en ambre : à prendre au point de stockage (O-09)
  zones: string[]
  missionsDuJour: number // charge du jour (tri « charge » ; une seule mission à la fois : au-delà, écarté « en mission »)
  certifieJusqua: Instant | null // fin de validité de la certification (ambre dans le délai d'alerte du registre)
}

export interface Eligibilite {
  paquetId: string
  statut: 'accepte' | 'affecte' | 'autre'
  plusGrandeClasse: ClasseColis
  accepteLe: Instant | null
  affecterAvant: Instant | null // acceptation + alerte « non affecté »
  ramasse: boolean
  suggere: string | null
  // VAGUE n° 6 : la note de la suggestion (zone, charge, Trust Score, distance : calculs/suggestion.ts) ; absente : aucune.
  suggestion?: Suggestion | null
  eligibles: Eligible[]
  nonEligibles: { id: string; nom: string; initiales: string; raisons: RaisonNonEligible[] }[]
  affecte: (LivreurCourt & { affecteLe: Instant; creneau: { debut: Instant; fin: Instant } | null }) | null
}

export interface DomaineAffectation {
  eligibles(paquetId: string): Promise<Eligibilite>
  affecter(paquetId: string, livreurId: string): Promise<Resultat<{ creneau: { debut: Instant; fin: Instant } | null }, 'non_eligible' | 'conflit' | 'deja_ramasse'>>
}
