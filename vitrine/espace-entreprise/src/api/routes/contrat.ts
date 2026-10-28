// Connecteurs du domaine « contrat » (backend-kit/apps/entreprise_session). Console : contrat.publier_document,
// contrat.verifier_piece.
import { c, type ConnecteursDe } from './types'

const D = 'Contrat'

export const ROUTES_CONTRAT: ConnecteursDe<'contrat'> = {
  'contrat.contrat': c(D, 'branche', 'GET /api/company/contract', '→ {versions, pieces}', 'pièce d’identité du gérant rendue au propriétaire seulement ; assurance des véhicules calculée véhicule par véhicule'),
  'contrat.accepter': c(D, 'branche', 'POST /api/company/contract/{id}/accept (Idempotency-Key)', '→ Resultat<object, statut> ; 403 role_forbidden', 'propriétaire ; la version signée remplace la précédente du même genre'),
  'contrat.fiche': c(D, 'branche', 'GET /api/company/profile', '→ FicheEntreprise'),
  'contrat.modifierFiche': c(D, 'branche', 'PATCH /api/company/profile {nomLegal?, rccm?, niu?, responsable?, adresse?, agence?, stockageNuit?, telephone?}', '→ Resultat<{enVerification}, vide|telephone> ; 403 role_forbidden', 'propriétaire ; nom légal, RCCM, NIU repassent en vérification (ENT-P03R-02)'),
  'contrat.envoyerPiece': c(D, 'branche', 'POST /api/company/compliance/pieces/{type} {nom, taille, type, lisible} (Idempotency-Key)', '→ Resultat<{piece}, illisible|taille|format|statut> ; 403 role_forbidden', 'propriétaire ; PDF ou image ≤ taille_max_piece Mo ; revue avant delai_verification_humaine heures ouvrées'),
  'contrat.activation': c(D, 'branche', 'GET /api/company/compliance/activation', '→ EtapeActivation[]', 'six étapes (ENT-RG-R16), motif d’une pièce rejetée'),
}
