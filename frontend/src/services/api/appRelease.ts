// frontend/src/services/api/appRelease.ts
// Distribution des applis partenaires hors Play Store : lit la derniere
// version publiee (vendeur/livreur/organisation/point relais) pour afficher
// un lien de telechargement direct dans le portail web correspondant.
import { http } from "@/services/api/http";

export type AppReleasePortal = "VENDOR" | "COURIER" | "DELIVERY_ORG" | "RELAY_POINT";

export type AppRelease = {
  portal: AppReleasePortal;
  portal_display: string;
  version: string;
  apk_url: string;
  release_notes: string;
  updated_at: string;
};

export const appReleaseApi = {
  getLatest: async (portal: AppReleasePortal): Promise<AppRelease | null> => {
    try {
      return await http<AppRelease>(`/api/auth/app-release/?portal=${portal}`);
    } catch {
      // 404 (rien de publie pour ce portail) ou erreur reseau : on masque
      // simplement le bouton de telechargement plutot que de faire echouer
      // le chargement du tableau de bord.
      return null;
    }
  },
};
