// Connecteurs du domaine « equipe » (l'entreprise employeur, DP-66, DP-67) : routes du kit
// backend-kit/apps/entreprise_flotte/equipe.py (vues_equipe.py), sur les modèles des droits d'employeur (contrat, essai,
// avertissements, congés, horaires, départ du socle). Chaque décision : journal de la fiche {auteur, champ, avant,
// après, motif}, journal signé et notification au livreur.
import { c, type ConnecteursDe } from './types'

const D = 'Équipe'

export const ROUTES_EQUIPE: ConnecteursDe<'equipe'> = {
  'equipe.registre': c(D, 'branche', 'GET /api/company/staff', '→ LigneEquipe[]', 'registre du personnel ; nombre d’avertissements à 0 hors propriétaire et gérant'),
  'equipe.dossier': c(D, 'branche', 'GET /api/company/staff/{id}', '→ DossierEmploi ; 404 → null', 'vue selon le rôle (complete, exploitation, comptable) : aucun motif disciplinaire pour le répartiteur ni le comptable ; retenueKitMax (KIT-VALEUR-F) null sans droit aux montants'),
  'equipe.conclureEssai': c(D, 'branche', 'POST /api/company/staff/{id}/probation {decision: confirme|prolonge|rompu, motif} (Idempotency-Key)', '→ Resultat<{jusqua}, motif|statut|deja_prolonge> ; 403 role_forbidden', 'propriétaire et gérant ; motif écrit (facultatif pour confirmer) ; prolongation une fois, de la durée d’essai du contrat ; rupture : retrait après les missions en cours ; essai échu ou déjà décidé : statut'),
  'equipe.avertir': c(D, 'branche', 'POST /api/company/staff/{id}/warnings {motif} (Idempotency-Key)', '→ Resultat<{rang}, motif|statut> ; 403 role_forbidden', 'propriétaire et gérant ; rang suivant ; le livreur le voit (GET /api/courier/warnings) et en accuse lecture'),
  'equipe.fixerHoraires': c(D, 'branche', 'PUT /api/company/staff/{id}/schedule {creneaux: [{jour 0-6, de, a}]}', '→ Resultat<object, creneaux|statut> ; 403 role_forbidden', 'propriétaire, gérant, répartiteur ; un créneau par jour au plus, fin après début ; le planning du livreur suit ces créneaux (GET /api/courier/planning)'),
  'equipe.fixerZones': c(D, 'branche', 'PUT /api/company/staff/{id}/zones {zones, motif?}', '→ Resultat<object, zones|statut> ; 403 role_forbidden', 'propriétaire, gérant, répartiteur ; zones déclarées de l’entreprise seulement ; en tournée, pour les paquets suivants ; livreur prévenu'),
  'equipe.accorderConge': c(D, 'branche', 'POST /api/company/staff/{id}/leaves {du, au, motif} (Idempotency-Key)', '→ Resultat<{congeId}, motif|dates|chevauchement|statut> ; 403 role_forbidden', 'propriétaire et gérant ; pas dans le passé ; aucune affectation ces jours-là (raison conge) ; livreur prévenu'),
  'equipe.annulerConge': c(D, 'branche', 'POST /api/company/staff/{id}/leaves/{congeId}/cancel', '→ Resultat<object, inconnu|statut> ; 403 role_forbidden', 'propriétaire et gérant ; avant le premier jour du congé (sinon statut)'),
  'equipe.casier': c(D, 'branche', 'PUT /api/company/staff/{id}/record-check {etat: recu|a_demander|non_exige}', '→ Resultat<object, statut> ; 403 role_forbidden', 'propriétaire et gérant ; l’extrait lui-même n’est pas conservé par BelivaY : seule la date de réception'),
  'equipe.finContrat': c(D, 'branche', 'POST /api/company/staff/{id}/termination {motif} (Idempotency-Key)', '→ Resultat<{preavisJusqua}, motif|deja|statut> ; 403 role_forbidden', 'propriétaire et gérant ; préavis DEPART-PREAVIS-J ; ouvre un départ « initiative entreprise » (file des départs : kit, dernier versement, clôture) ; événement fin_contrat'),
  'equipe.annulerFinContrat': c(D, 'branche', 'POST /api/company/staff/{id}/termination/cancel {motif}', '→ Resultat<object, motif|inconnu> ; 403 role_forbidden', 'propriétaire et gérant ; pendant le préavis : le départ ouvert est annulé, le livreur reste et en est prévenu'),
  'equipe.attestation': c(D, 'branche', 'GET /api/company/staff/{id}/certificate', '→ Resultat<{nom, contenu, type}, statut> ; 403 role_forbidden', 'propriétaire, gérant, comptable ; PDF (un caractère par octet) sans rémunération ni motif disciplinaire ; délivrance journalisée'),
}
