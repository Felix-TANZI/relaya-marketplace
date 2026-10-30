// Connecteurs du domaine « disponibilite » (backend-kit/apps/livreur_tournee ; planning : livreur_journee).
import { c, type ConnecteursDe } from './types'

const D = 'Disponibilité'

export const ROUTES_DISPONIBILITE: ConnecteursDe<'disponibilite'> = {
  'disponibilite.lire': c(D, 'branche', 'GET /api/courier/status', '→ EtatDisponibilite', 'preavisJusqua : départ demandé en cours, « hors service » sans point de Trust Score perdu (DP-67)'),
  'disponibilite.planning': c(D, 'branche', 'GET /api/courier/planning', '→ Planning', 'horaires prévus par l’entreprise sur 14 jours (lecture seule, DP-66), absences prévenues et règles (PLANNING-PREVENIR-H, ABSENCE-MAX-J, texte 120 caractères, imprévus)'),
  'disponibilite.prevenirAbsence': c(D, 'branche', 'POST /api/courier/absences {du, au, motif, texte, origine} (Idempotency-Key)', '→ Resultat {id, imprevu, apresDebut} date_passee | dates_inversees | motif | trop_longue | delai | chevauche', 'une demande que l’entreprise voit (tâche et planning), jamais une modification du planning ; prévue PLANNING-PREVENIR-H avant le premier créneau, imprévu le jour même (après le début : acceptée, marquée) ; ABSENCE-MAX-J jours au plus ; hors connexion par la file, délai jugé sur l’heure de saisie (jamais dans le futur ni avant la dernière synchronisation)'),
  'disponibilite.annulerAbsence': c(D, 'branche', 'POST /api/courier/absences/{id}/cancel {origine} (Idempotency-Key)', '→ Resultat inconnue | commencee'),
  'disponibilite.changer': c(D, 'branche', 'POST /api/courier/status {statut, pause?, origine} (Idempotency-Key)', '→ Resultat colis_sous_garde | compte_non_actif ; 400 origine_requise ; 422 invalid', 'hors service refusé avec des colis sous garde (nombre) ; diffusé à l’entreprise (courier.status_changed)'),
}
