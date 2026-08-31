/**
 * Briques visuelles partagees du portail point relais.
 *
 * Extraites de RelayPointPage pour que les ecrans du workflow (reception,
 * retrait...) gardent exactement le meme cadre sans dupliquer les classes.
 */
import type { LucideIcon } from "lucide-react";


export function Panel({
  title,
  kicker,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  kicker?: string;
  /** Icone posee devant le titre, sur le modele des ecrans rapports/messagerie. */
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {kicker ? <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">{kicker}</p> : null}
          <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
            {Icon ? <Icon size={18} strokeWidth={2.4} className="flex-shrink-0 text-blue-700 dark:text-blue-300" /> : null}
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * En-tete d'ecran metier : icone coloree + titre + sous-titre, et un emplacement
 * a droite pour les actions globales (exports, bascules de periode...).
 */
export function ModuleHeader({
  icon: Icon,
  title,
  subtitle,
  tone = "text-blue-700 dark:text-blue-300",
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Classes de couleur de l'icone : chaque module garde son identite. */
  tone?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          <Icon size={26} strokeWidth={2.3} className={`flex-shrink-0 ${tone}`} />
          {title}
        </h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

export function StatusPill({ tone, children }: { tone: "blue" | "emerald" | "amber" | "red" | "slate"; children: React.ReactNode }) {
  const cls = {
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${cls}`}>{children}</span>;
}
