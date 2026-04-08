import { Link, useRouteError } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return "Unknown error"; }
}

export default function ErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f5f1] px-4 py-20 dark:bg-gray-950">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("system.errorTitle", "Une erreur est survenue")}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t("system.unexpectedError", "Nous n'avons pas pu charger cette page.")}
        </p>
        <p className="mt-3 break-words rounded-xl bg-gray-100 p-3 text-xs text-gray-400 dark:bg-gray-800">
          {formatError(error)}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {t("system.backHome", "Retour à l'accueil")}
          </Link>
          <button type="button" onClick={() => window.location.reload()} className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark">
            {t("system.retry", "Réessayer")}
          </button>
        </div>
      </div>
    </div>
  );
}
