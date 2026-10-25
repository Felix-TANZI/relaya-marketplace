// Connecteurs du domaine « acces » (backend-kit/apps/livreur_session) : activation, certification, états du compte.
import { c, type ConnecteursDe } from './types'

const D = 'Accès'

export const ROUTES_ACCES: ConnecteursDe<'acces'> = {
  'acces.activation': c(D, 'branche', 'GET /api/courier/activation', '→ Activation ; 403 not_courier', 'pièces : statut et dates, jamais l’image'),
  'acces.accepterCharte': c(D, 'branche', 'POST /api/courier/activation/charter {version, origine} (Idempotency-Key)', '→ Resultat version_perimee', 'acceptation horodatée par le serveur'),
  'acces.envoyerPiece': c(D, 'branche', 'POST /api/courier/kyc/documents {piece, octets, controles, origine} (Idempotency-Key)', '→ Resultat qualite | trop_lourde | deja_verifiee ; 422 piece_inconnue', 'vérification automatique sous KYC-AUTO-MIN, revue humaine sous KYC-REVUE-H'),
  'acces.certification': c(D, 'branche', 'GET /api/courier/certification', '→ Certification', 'modules servis par le serveur ; la bonne réponse ne vient jamais au téléphone'),
  'acces.lireCarte': c(D, 'branche', 'POST /api/courier/certification/modules/{id}/cards {carte}', '→ 204 ; 404 not_found'),
  'acces.terminerModule': c(D, 'branche', 'POST /api/courier/certification/modules/{id}/done {origine} (Idempotency-Key)', '→ Resultat cartes_non_lues ; 404 not_found'),
  'acces.reglerLectureVocale': c(D, 'branche', 'PUT /api/courier/certification/voice {active}', '→ 204', 'préférence du compte (lectureVocale)'),
  'acces.commencerQuiz': c(D, 'branche', 'POST /api/courier/certification/quiz/start {origine} (Idempotency-Key)', '→ Resultat {tentative} modules | attente | limite_jour | certifie', 'CERT-QUIZ-N questions tirées au sort, réponses mélangées'),
  'acces.envoyerQuiz': c(D, 'branche', 'POST /api/courier/certification/quiz/{id}/submit {reponses, horsLigne, origine} (Idempotency-Key)', '→ Resultat {resultat} tentative_inconnue', 'corrigé par le serveur ; rendu hors connexion après son temps : en attente de validation'),
  'acces.etatDuCompte': c(D, 'branche', 'GET /api/courier/me/state', '→ EtatDuCompte'),
  'acces.faireAppel': c(D, 'branche', 'POST /api/courier/sanctions/{id}/appeal {texte, preuves, origine} (Idempotency-Key)', '→ Resultat {reponseAvant} hors_delai | deja_fait | sans_recours | texte_trop_court | numero_interdit', 'une fois, sous LIV-RECOURS-J jours'),
}
