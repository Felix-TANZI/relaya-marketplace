/**
 * Briques visuelles partagees du portail point relais.
 *
 * Extraites de RelayPointPage pour que les ecrans du workflow (reception,
 * retrait...) gardent exactement le meme cadre sans dupliquer les classes.
 */
import { useEffect } from "react";
import { Delete, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Feuille modale des ecrans de guichet.
 *
 * Sur telephone elle s'ancre en bas et prend toute la largeur : c'est la forme
 * attendue d'une feuille mobile, et elle laisse les boutons a portee de pouce.
 * A partir de `sm` on retrouve la modale centree.
 */
export function RelaySheet({
  label,
  onClose,
  children,
  size = "md",
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`animate-sheet-up overscroll-none-y safe-pb max-h-[92vh] w-full overflow-y-auto rounded-t-[18px] border border-slate-200 bg-white p-4 shadow-[0_-8px_40px_rgba(14,27,56,.32)] dark:border-slate-800 dark:bg-slate-900 sm:animate-page-in sm:rounded-[14px] sm:p-5 sm:shadow-[0_30px_80px_rgba(60,35,15,.35)] ${
          size === "sm" ? "sm:max-w-md" : "sm:max-w-2xl"
        }`}
      >
        {/* Poignee visuelle : signale que la feuille se ferme vers le bas. */}
        <div className="mx-auto mb-3 h-1.5 w-11 flex-shrink-0 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" aria-hidden />
        {children}
      </div>
    </div>
  );
}

/** En-tete d'une feuille : icone, titre, sous-titre et fermeture. */
export function RelaySheetHeader({
  icon: Icon,
  title,
  subtitle,
  onClose,
  tone = "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Classes de la pastille : chaque geste du guichet garde sa couleur. */
  tone?: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] ${tone}`}>
          <Icon size={19} />
        </div>
        <div>
          <h2 className="pr-h2 text-slate-950 dark:text-white">{title}</h2>
          {subtitle ? <p className="pr-sub mt-1">{subtitle}</p> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="rounded-full bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
      >
        <X size={17} />
      </button>
    </div>
  );
}


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
    <section className="pr-card p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {kicker ? <p className="pr-kicker uppercase">{kicker}</p> : null}
          <h2 className="pr-h2 mt-1 flex items-center gap-2 text-slate-950 dark:text-white">
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
        <h2 className="pr-h1 flex items-center gap-2.5 text-slate-950 dark:text-white">
          <Icon size={22} strokeWidth={2.3} className={`flex-shrink-0 ${tone}`} />
          {title}
        </h2>
        <p className="pr-sub mt-1 font-semibold">{subtitle}</p>
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
  return <span className={`inline-flex h-[26px] items-center rounded-full border px-2.5 text-[12px] font-bold ${cls}`}>{children}</span>;
}

/**
 * Le pave numerique du PIN, et les points qui disent ou l'on en est.
 *
 * Deux ecrans le demandent : la connexion d'un gerant qui ouvre son guichet,
 * et la creation du code d'un employe qui rejoint le relais. C'est le meme
 * geste — viser quatre chiffres sans regarder — donc la meme touche de
 * 58 px et le meme pave, decrit une seule fois.
 *
 * Les points sont `aria-hidden` : ils montrent la progression a l'oeil, mais
 * c'est le champ qui porte le compte pour un lecteur d'ecran. Les annoncer
 * deux fois ferait lire « quatre points » a chaque frappe.
 */
/** La case vide avant le zero garde la touche « effacer » sous le pouce droit. */
const RELAY_PIN_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "effacer"];

export function RelayPinPad({
  value,
  onChange,
  length = 4,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
}) {
  const taper = (touche: string) => {
    if (disabled) return;
    if (touche === "effacer") onChange(value.slice(0, -1));
    else if (value.length < length) onChange(value + touche);
  };

  return (
    <>
      <div className="mt-4 flex justify-center gap-3" aria-hidden>
        {Array.from({ length }, (_, rang) => (
          <span
            key={rang}
            className={`h-[13px] w-[13px] rounded-full transition ${
              rang < value.length ? "bg-[#2456D6]" : "bg-slate-300 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {RELAY_PIN_KEYS.map((touche, index) =>
          touche === "" ? (
            <span key={`vide-${index}`} />
          ) : (
            <button
              key={touche}
              type="button"
              onClick={() => taper(touche)}
              disabled={disabled}
              aria-label={touche === "effacer" ? "Effacer" : touche}
              className="flex h-[58px] items-center justify-center rounded-[14px] bg-white text-[22px] font-black text-slate-900 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] transition active:scale-[.94] disabled:opacity-50 dark:bg-slate-900 dark:text-white"
            >
              {touche === "effacer" ? <Delete size={22} strokeWidth={2.2} /> : touche}
            </button>
          ),
        )}
      </div>
    </>
  );
}
