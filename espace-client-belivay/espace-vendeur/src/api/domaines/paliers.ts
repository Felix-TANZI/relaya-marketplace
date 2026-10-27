// Domaine « paliers » branché sur le serveur (backend-kit/apps/vendeur_croissance) : GET /tiers (VD10-R08) rend
// MonPalier entier (conditions, projection, montée, descente, gardé par palier calculé par le moteur de commission ;
// montants à null pour l'accès Préparation).
import type { ClientApi } from "@client/api/client";
import type { SourceVendeur } from "../../donnees/source";
import type { MonPalier } from "../../donnees/domaines/paliers";
import { appels } from "../outils";

export function domainePaliers(api: ClientApi): SourceVendeur["paliers"] {
  const a = appels(api, "paliers");
  return {
    monPalier: () => a.get<MonPalier>("/tiers"),
  };
}
