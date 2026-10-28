// Connecteurs du domaine « litiges » (backend-kit/apps/vendeur_litiges).
import { c, type ConnecteursDe } from './types'

const D = 'Litiges'

export const ROUTES_LITIGES: ConnecteursDe<'litiges'> = {
  'litiges.regles': c(D, 'branche', 'GET /api/vendors/disputes/rules', '→ ReglesLitiges', 'lues au registre (LIT-*, RET-*)'),
  'litiges.liste': c(D, 'branche', 'GET /api/vendors/disputes?state=', '→ Litige[]', 'a_repondre | en_mediation | clos ; triés par échéance'),
  'litiges.compteurs': c(D, 'branche', 'GET /api/vendors/disputes/counts', '→ CompteursLitiges', 'gele null pour l’accès Préparation'),
  'litiges.detail': c(D, 'branche', 'GET /api/vendors/disputes/{id}', '→ Litige ; 404 → null', 'anonyme : ni le client, ni son relais, ni son palier ; gele, trajetRetour et livraisonRetour (moteur des frais) null pour l’accès Préparation'),
  'litiges.ajouterPreuve': c(D, 'branche', 'POST /api/vendors/disputes/{id}/evidence {photo} (Idempotency-Key)', '→ Resultat<{piece}, clos|introuvable> ; 400 photo_invalide', 'propriétaire ou Préparation (Q-17) ; horodatée par le serveur'),
  'litiges.retirerPreuve': c(D, 'branche', 'DELETE /api/vendors/disputes/{id}/evidence/{pieceId}', '→ Resultat<{}, deja_repondu|introuvable>'),
  'litiges.garderBrouillon': c(D, 'branche', 'PUT /api/vendors/disputes/{id}/draft {brouillon}', '→ 204', 'gardé LIT-BROUILLON-H ; null efface'),
  'litiges.repondre': c(D, 'branche', 'POST /api/vendors/disputes/{id}/answer {posture: accepte|conteste|arrangement, texte, arrangement?} (Idempotency-Key)', '→ Resultat<{issue}, RefusReponse>', 'propriétaire seulement (raison reserve_proprietaire) ; branche apps.aftersales.reponse_du_vendeur'),
  'litiges.contester': c(D, 'branche', 'POST /api/vendors/disputes/{id}/appeal {texte} (Idempotency-Key)', '→ Resultat<{}, RefusRecours>', 'recours du vendeur, une fois, sous LIT-RECOURS-H'),
}
