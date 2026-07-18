// frontend/src/hooks/useAdminAttentionBadges.ts
// Fournit les compteurs "éléments nécessitant une action" pour les badges de la
// sidebar admin. Les clés du map correspondent EXACTEMENT aux `item.key` de la
// config SECTIONS d'AdminLayout (ex. "vendors_kyc", "vendors_withdrawals",
// "disputes"). Pour ajouter un badge : ajouter une source ci-dessous et mapper
// le résultat sur la clé du bon élément de navigation.

import { createContext, useEffect, useState } from "react";
import { adminApi } from "@/services/api/admin";

export type AdminBadgeMap = Record<string, number>;

/** Contexte consommé par SideNavItem pour afficher les pastilles. */
export const AdminBadgesContext = createContext<AdminBadgeMap>({});

/** Intervalle de rafraîchissement des compteurs (ms). */
const REFRESH_MS = 90_000;

/** Longueur d'un résultat de liste, robuste si la réponse n'est pas un tableau. */
function count(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/**
 * Récupère les compteurs à traiter et les renvoie sous forme de map
 * { [navItemKey]: number }. Chaque source est isolée (Promise.allSettled) :
 * si l'une échoue, les autres badges s'affichent quand même.
 */
export function useAdminAttentionBadges(): AdminBadgeMap {
  const [badges, setBadges] = useState<AdminBadgeMap>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [kyc, withdrawals, disputes] = await Promise.allSettled([
        adminApi.getKYCQueue("PENDING"),        // vendeurs en attente de validation
        adminApi.listWithdrawals("PENDING"),    // demandes de retrait en attente
        adminApi.listDisputes(),                // litiges (on ne compte que ceux ouverts)
      ]);

      const next: AdminBadgeMap = {};

      if (kyc.status === "fulfilled") {
        next.vendors_kyc = count(kyc.value);
      }

      if (withdrawals.status === "fulfilled") {
        next.vendors_withdrawals = count(withdrawals.value);
      }

      if (disputes.status === "fulfilled") {
        const list = Array.isArray(disputes.value) ? disputes.value : [];
        next.disputes = list.filter(
          (dispute) => dispute.status === "OPEN" || dispute.status === "IN_PROGRESS",
        ).length;
      }

      if (!cancelled) setBadges(next);
    };

    void load();
    const interval = window.setInterval(() => void load(), REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return badges;
}