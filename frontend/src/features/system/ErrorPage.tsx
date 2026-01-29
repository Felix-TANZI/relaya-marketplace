import { Link, useRouteError } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export default function ErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();

  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <div className="text-2xl font-extrabold">
        {t("system.errorTitle", "Une erreur est survenue")}
      </div>
      <p className="mt-3 text-sm text-[color:var(--muted)]">
        {t("system.unexpectedError", "Nous n'avons pas pu charger cette page.")}
      </p>
      <p className="mt-3 break-words text-xs text-[rgb(var(--subtext-rgb))]">
        {formatError(error)}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--border-rgb),0.45)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-[rgba(var(--glass),0.55)]"
        >
          {t("system.backHome", "Retour à l’accueil")}
        </Link>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-full border border-transparent bg-[rgba(var(--primary),0.16)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-[rgba(var(--primary),0.22)]"
        >
          {t("system.retry", "Réessayer")}
        </button>
      </div>
    </Card>
  );
}
