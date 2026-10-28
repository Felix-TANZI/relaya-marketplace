// Connecteurs du domaine « paliers » (backend-kit/apps/vendeur_croissance).
import { c, type ConnecteursDe } from "./types";

export const ROUTES_PALIERS: ConnecteursDe<"paliers"> = {
  "paliers.monPalier": c(
    "Paliers",
    "branche",
    "GET /api/vendors/tiers",
    "→ MonPalier",
    "montants à null pour l’accès Préparation (DP-55)",
  ),
};
