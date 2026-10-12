// Domaine « trust » branché sur le serveur (backend-kit/apps/vendeur_croissance) : Trust Score du service Scores
// (Q-37), état du compte et contrôle au ramassage, décisions et contestation (une fois par décision). Réponses au
// format de src/donnees/domaines/trust.ts (adaptateur identité) ; refus de contestation = 200 { ok: false, raison }.
import type { ClientApi } from "@client/api/client";
import type { SourceVendeur } from "../../donnees/source";
import type {
  Decision,
  Score,
  StatutCompte,
} from "../../donnees/domaines/trust";
import { appels, ouNull, seg } from "../outils";

export function domaineTrust(api: ClientApi): SourceVendeur["trust"] {
  const a = appels(api, "trust");
  return {
    score: () => a.get<Score>("/score"),
    statut: () => a.get<StatutCompte>("/account/status"),
    decisions: () => a.get<Decision[]>("/account/decisions"),
    decision: (id) => ouNull(a.get<Decision>(`/account/decisions/${seg(id)}`)),
    contester: (decision, texte, preuves) =>
      a.post(
        "/score/appeal",
        { decision, texte, preuves },
        { idempotence: true },
      ),
  };
}
