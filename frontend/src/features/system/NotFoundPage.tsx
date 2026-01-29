import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <div className="text-4xl font-extrabold">404</div>
      <p className="mt-3 text-sm text-[color:var(--muted)]">
        {t("system.notFound", "Page introuvable.")}
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-full border border-[rgba(var(--border-rgb),0.45)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-[rgba(var(--glass),0.55)]"
      >
        {t("system.backHome", "Retour à l’accueil")}
      </Link>
    </Card>
  );
}
