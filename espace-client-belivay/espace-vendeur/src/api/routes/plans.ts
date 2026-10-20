// Connecteurs du domaine « plans » (backend-kit/apps/vendeur_croissance). Paiements : demande Mobile Money,
// confirmée par le webhook de l'agrégateur (services.confirmer_paiement) ; rien n'est activé avant.
import { c, type ConnecteursDe } from "./types";

const D = "Plans et croissance";
export const ROUTES_PLANS: ConnecteursDe<"plans"> = {
  "plans.plans": c(
    D,
    "branche",
    "GET /api/vendors/plans",
    "→ OffrePlan[] ; 403 owner_only",
  ),
  "plans.etat": c(
    D,
    "branche",
    "GET /api/vendors/plans/state",
    "→ EtatPlan ; 403 owner_only",
    "échéances de l’essai, de la grâce et de l’arrêt appliquées à la lecture (moteur plans)",
  ),
  "plans.simuler": c(
    D,
    "branche",
    "GET /api/vendors/plans/simulate?sales=&billing=",
    "→ Simulation ; 400 invalid ; 403 owner_only",
    "moteur commission : simuler_plans",
  ),
  "plans.essayer": c(
    D,
    "branche",
    "POST /api/vendors/plans/subscribe {plan, trial} (Idempotency-Key)",
    "→ { ok: true, finEssai, rappelLe } | { ok: false, raison: deja_essaye | deja_actif } ; 403 owner_only",
    "un essai par plan, 0 F aujourd’hui",
  ),
  "plans.souscrire": c(
    D,
    "branche",
    "POST /api/vendors/plans/subscribe {plan, facturation: mensuelle|annuelle} (Idempotency-Key)",
    "→ { ok: true, demande: DemandePaiement } | { ok: false, raison: deja_actif } ; 403 owner_only",
    "le plan s’active à la confirmation Mobile Money",
  ),
  "plans.paiement": c(
    D,
    "branche",
    "GET /api/vendors/payments/{id}",
    "→ DemandePaiement ; 404 → null ; 403 owner_only",
  ),
  "plans.annulerPaiement": c(
    D,
    "branche",
    "DELETE /api/vendors/payments/{id}",
    "→ 204 ; 403 owner_only",
  ),
  "plans.arreter": c(
    D,
    "branche",
    "POST /api/vendors/plans/stop {arret}",
    "→ EtatPlan ; 403 owner_only",
    "retour à Free à la fin de la période",
  ),
  "plans.visibilite": c(
    D,
    "branche",
    "GET /api/vendors/visibility",
    "→ Visibilite ; 403 owner_only",
    "récompenses au mérite seulement (DP-14)",
  ),
  "plans.utiliserRecompense": c(
    D,
    "branche",
    "POST /api/vendors/rewards/{id}/use (Idempotency-Key)",
    "→ { ok: true, jusqua } | { ok: false, raison: deja_utilisee | score_trop_bas | rupture } ; 403 owner_only",
  ),
  "plans.programmerVenteFlash": c(
    D,
    "branche",
    "POST /api/vendors/flash-sales {id, remisePourCent} (Idempotency-Key)",
    "→ { ok: true, etat } | { ok: false, raison: remise_trop_basse | remise_trop_haute | deja_utilisee | ferme | score_trop_bas | rupture } ; 403 owner_only",
    "au-delà de 50 %, relue sous 24 h (FF-FLASH)",
  ),
  "plans.services": c(
    D,
    "branche",
    "GET /api/vendors/services",
    "→ Services ; 403 owner_only",
  ),
  "plans.demanderService": c(
    D,
    "branche",
    "POST /api/vendors/services/request {service} (Idempotency-Key)",
    "→ { ok: true, demande: DemandePaiement } | { ok: false, raison: deja_demande | gratuit_ailleurs } ; 403 owner_only",
  ),
  "plans.stats": c(
    D,
    "branche",
    "GET /api/vendors/stats?period=30d",
    "→ Stats ; 400 invalid ; 403 owner_only",
    "lu dans les commandes reçues",
  ),
  "plans.demande": c(
    D,
    "branche",
    "GET /api/vendors/demand",
    "→ Demande",
    "Free : 3 recherches visibles ; ouvert à l’accès Préparation (freins sans montant)",
  ),
};
