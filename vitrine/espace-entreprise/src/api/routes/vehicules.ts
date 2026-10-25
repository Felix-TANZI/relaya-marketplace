// Connecteurs du domaine « véhicules » (backend-kit/apps/entreprise_flotte). Console : vehicules.verifier_carte_grise.
import { c, type ConnecteursDe } from './types'

const D = 'Véhicules'

export const ROUTES_VEHICULES: ConnecteursDe<'vehicules'> = {
  'vehicules.liste': c(D, 'branche', 'GET /api/company/vehicles', '→ Vehicule[]', 'statut calculé (assurance expirée, carte grise à vérifier, panne) et « proposé à l’affectation »'),
  'vehicules.declarer': c(D, 'branche', 'POST /api/company/vehicles {type, plaque, capacite, classes, livreurId, assuranceJusqua, photoPlaque, carteGrise} (Idempotency-Key)', '→ Resultat<{vehicule}, plaque|doublon|photo|assurance|classes|capacite> ; 403 role_forbidden', 'plaque unique dans tout le système (doublon signalé à la console) ; classes_par_type_vehicule'),
  'vehicules.rattacher': c(D, 'branche', 'PUT /api/company/vehicles/{id}/rider {livreurId}', '→ Resultat<object, statut>', 'livreur habituel = fiche du livreur (journal)'),
  'vehicules.mettreAJour': c(D, 'branche', 'PUT /api/company/vehicles/{id}/documents/{assurance|carte_grise} {jusqua}', '→ Resultat<object, date>', 'nouvelle carte grise : vérifiée par BelivaY'),
  'vehicules.indisponible': c(D, 'branche', 'PUT /api/company/vehicles/{id}/availability {panne, motif?}', '→ Resultat<object, motif>', 'le livreur habituel est prévenu'),
}
