// Connecteurs du domaine « moi » (backend-kit/apps/livreur_session) : profil, pièces, préférences du compte, demande de
// départ (DP-66, DP-67 : contestation de la retenue du kit), données personnelles. Retirés (DP-66) : changer sa photo (POST /me/photo), quitter immédiatement.
import { c, type ConnecteursDe } from './types'

const D = 'Moi'

export const ROUTES_MOI: ConnecteursDe<'moi'> = {
  'moi.profil': c(D, 'branche', 'GET /api/courier/me', '→ Profil', 'numéro du livreur masqué ; accès restreint si une pièce exigée ou la certification a expiré ; nouvelle photo demandée : état « reverification », demandee.jusqua (PHOTO-REVERIF-J), photoBloquee passé le délai ; départ : affectationJusqua, kit (constat, manquants, retenue, constatJusqua, contestation), kitNonConteste, versement (DernierVersement, estimé pendant le préavis, figé à la clôture) ; lisible même accès fermé'),
  'moi.emploi': c(D, 'branche', 'GET /api/courier/me/employment', '→ EmploiVu', 'DP-66 : suspension par son entreprise (motif, date de fin), avertissements écrits (rang, motif), zones et horaires de travail (un créneau par jour), issue de l’essai (confirmé, prolongé, rompu), fin de contrat décidée par l’entreprise (motif, préavis) ; il voit, il ne décide pas'),
  'moi.envoyerPiece': c(D, 'branche', 'POST /api/courier/documents/{id} {recto, verso, expireLe, origine} (Idempotency-Key)', '→ Resultat photo_manquante | date_passee | non_demandee ; 422 piece_inconnue', 'seulement une pièce renvoyable (refusée, demandée par l’entreprise, expirée ou bientôt) ; le selfie demandé passe par ici'),
  'moi.preferences': c(D, 'branche', 'GET /api/courier/me/preferences', '→ PreferencesCompte'),
  'moi.reglerPreference': c(D, 'branche', 'PATCH /api/courier/me/preferences {langue?, lectureVocale?, envoiPhotos?, enLigne, origine} (Idempotency-Key)', '→ Resultat ; 422 langue | envoi_photos'),
  'moi.demanderDepart': c(D, 'branche', 'POST /api/courier/company/leave {motif, texte?, origine} (Idempotency-Key)', '→ Resultat {preavisJusqua} deja_demande | motif_inconnu', 'aucun effet immédiat ; l’entreprise est prévenue (tâche, file « Départs ») ; préavis DEPART-PREAVIS-J : il travaille normalement, paquets jusqu’à la veille du dernier jour, hors service sans point de Trust Score perdu ; clôture par l’entreprise (même avant la fin du préavis, conditions remplies), ou l’administrateur après le préavis ; SMS à la clôture (date du dernier versement) et au versement fait'),
  'moi.annulerDepart': c(D, 'branche', 'POST /api/courier/company/leave/cancel {origine} (Idempotency-Key)', '→ Resultat aucune_demande | deja_close'),
  'moi.contesterKit': c(D, 'branche', 'POST /api/courier/company/leave/kit-contest {motif, origine} (Idempotency-Key)', '→ Resultat aucune_retenue | deja_contestee | motif', 'retenue du kit incomplet (plafonnée à KIT-VALEUR-F) contestée pendant le préavis ou après la clôture, même accès fermé ; BelivaY décide, le montant est mis de côté d’ici là ; l’entreprise est prévenue'),
  'moi.demanderCodeDonnees': c(D, 'branche', 'POST /api/courier/privacy/code', '→ Resultat {renvoiPossibleA} trop_tot | trop_d_envois'),
  'moi.demanderDonnees': c(D, 'branche', 'POST /api/courier/privacy/requests {type, code, origine} (Idempotency-Key)', '→ Resultat code_faux | deja_demande', 'export ou effacement préparé par la console'),
}
