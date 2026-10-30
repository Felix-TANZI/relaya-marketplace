// Domaine « plans » branché sur le serveur (backend-kit/apps/vendeur_croissance) : offres, état du plan, simulateur
// (moteur commission : simuler_plans), essai et souscription (demande Mobile Money : rien n'est activé avant la
// confirmation), paiements, arrêt, visibilité au mérite, vente flash, services, chiffres, demande de la zone.
// Tout sauf la demande de la zone est réservé au propriétaire : 403 owner_only → ReserveAuProprietaire.
import type { ClientApi } from "@client/api/client";
import type { SourceVendeur } from "../../donnees/source";
import type {
  DemandePaiement,
  Demande,
  EtatPlan,
  OffrePlan,
  Services,
  Simulation,
  Stats,
  Visibilite,
} from "../../donnees/domaines/plans";
import { appels, ouNull, seg } from "../outils";

export function domainePlans(api: ClientApi): SourceVendeur["plans"] {
  const a = appels(api, "croissance");
  const idem = { idempotence: true as const };
  return {
    plans: () => a.get<OffrePlan[]>("/plans"),
    etat: () => a.get<EtatPlan>("/plans/state"),
    simuler: (ventes, facturation) =>
      a.get<Simulation>("/plans/simulate", {
        query: { sales: ventes, billing: facturation },
      }),
    essayer: (plan) => a.post("/plans/subscribe", { plan, trial: true }, idem),
    souscrire: (plan, facturation) =>
      a.post("/plans/subscribe", { plan, facturation }, idem),
    paiement: (id) => ouNull(a.get<DemandePaiement>(`/payments/${seg(id)}`)),
    annulerPaiement: async (id) => {
      await a.supprimer(`/payments/${seg(id)}`);
    },
    arreter: (arret) => a.post<EtatPlan>("/plans/stop", { arret }),
    visibilite: () => a.get<Visibilite>("/visibility"),
    utiliserRecompense: (id) => a.post(`/rewards/${seg(id)}/use`, {}, idem),
    programmerVenteFlash: (id, remisePourCent) =>
      a.post("/flash-sales", { id, remisePourCent }, idem),
    services: () => a.get<Services>("/services"),
    demanderService: (service) =>
      a.post("/services/request", { service }, idem),
    stats: () => a.get<Stats>("/stats", { query: { period: "30d" } }),
    demande: () => a.get<Demande>("/demand"),
  };
}
