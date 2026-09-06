// frontend/src/components/AppDownloadBanner.tsx
// Distribution des applis partenaires hors Play Store : bannière affichée
// dans chaque portail web (vendeur/livreur/organisation/point relais) tant
// qu'un admin a publié une version dans AppRelease. Ne s'affiche pas si
// aucune version n'est configurée — pas de lien mort.
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { appReleaseApi, type AppRelease, type AppReleasePortal } from "@/services/api/appRelease";

export default function AppDownloadBanner({ portal }: { portal: AppReleasePortal }) {
  const [release, setRelease] = useState<AppRelease | null>(null);

  useEffect(() => {
    let active = true;
    appReleaseApi.getLatest(portal).then((result) => {
      if (active) setRelease(result);
    });
    return () => {
      active = false;
    };
  }, [portal]);

  if (!release) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900 dark:bg-orange-950/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Download className="h-5 w-5 shrink-0 text-orange-600" />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Application {release.portal_display} disponible (v{release.version})
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Téléchargez l'appli mobile pour gérer votre activité en déplacement.
          </p>
        </div>
      </div>
      <a
        href={release.apk_url}
        className="shrink-0 rounded-xl bg-orange-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-orange-700"
      >
        Télécharger l'APK
      </a>
    </div>
  );
}
