// Connecteurs du domaine « trust » (backend-kit/apps/vendeur_croissance).
import { c, type ConnecteursDe } from "./types";

export const ROUTES_TRUST: ConnecteursDe<"trust"> = {
  "trust.score": c(
    "Trust Score",
    "branche",
    "GET /api/vendors/score",
    "→ Score",
    "valeur exacte du service Scores (Q-37), critères, journal immuable, barème, 30 nuits",
  ),
  "trust.statut": c(
    "Trust Score",
    "branche",
    "GET /api/vendors/account/status",
    "→ StatutCompte",
    "contrôle au ramassage par le moteur des sanctions ; aussi lu par l’accueil (suspension)",
  ),
  "trust.decisions": c(
    "Trust Score",
    "branche",
    "GET /api/vendors/account/decisions",
    "→ Decision[]",
    "la plus récente en tête",
  ),
  "trust.decision": c(
    "Trust Score",
    "branche",
    "GET /api/vendors/account/decisions/{id}",
    "→ Decision ; 404 → null",
  ),
  "trust.contester": c(
    "Trust Score",
    "branche",
    "POST /api/vendors/score/appeal {decision, texte, preuves} (Idempotency-Key)",
    "→ { ok: true, reponseAvant } | { ok: false, raison: deja_contestee | trop_court | trop_long | introuvable }",
    "une fois par décision ; réponse sous 72 h ouvrées, dimanche non compté",
  ),
};
