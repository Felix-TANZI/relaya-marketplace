import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { Globe, Moon, ShoppingBag, Sun, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";
import { CATEGORY_THEMES } from "@/data/categoryThemes";

interface MobileCategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Liens secondaires repris de l'ancien menu mobile, sous la liste des thèmes. */
  extraLinks?: { label: string; to: string }[];
}

/**
 * Tiroir des catégories, ouvert par l'icône de menu placée à gauche du header.
 * Il remplace la frame « Catégories » qui occupait la page d'accueil en mobile :
 * la liste complète est là, mais elle ne consomme plus de hauteur de page.
 */
export default function MobileCategoryDrawer({ open, onClose, extraLinks = [] }: MobileCategoryDrawerProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { i18n } = useTranslation();

  /* Le fond ne défile pas pendant que le tiroir est ouvert. */
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const activeSlug = location.pathname.startsWith("/categorie/")
    ? location.pathname.replace("/categorie/", "")
    : "";

  const toggleLanguage = () => void i18n.changeLanguage(i18n.language === "fr" ? "en" : "fr");

  /*
    Le tiroir est déclaré dans le header, dont le `z-50` + `position:fixed` crée
    un contexte d'empilement : sans portail, aucun z-index interne ne peut
    passer devant le ruban d'annonces (z-60), qui recouvrait alors le titre
    « Catégories ». Le portail sort le tiroir de ce contexte et le rend au
    niveau du body, où son z-[100] prime réellement.
  */
  return createPortal(
    <div className="fixed inset-0 z-[100] lg:hidden">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le menu des catégories"
        className="absolute inset-0 h-full w-full bg-gray-900/45 backdrop-blur-[2px]"
      />

      <aside
        role="dialog"
        aria-label="Catégories"
        className="animate-drawer-in absolute inset-y-0 left-0 flex w-[86%] max-w-[340px] flex-col bg-white shadow-[0_0_60px_rgba(15,23,42,.28)] dark:bg-gray-900"
      >
        {/* Le titre démarre sous l'encoche : rien ne vient plus le rogner. */}
        <header className="flex items-center gap-2 border-b border-[#f5e3d7] bg-[#fff7ef] px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] dark:border-gray-800 dark:bg-gray-950">
          <ShoppingBag size={20} className="text-primary" fill="currentColor" />
          <h2 className="text-[17px] font-black tracking-tight text-primary">Catégories</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition hover:text-primary dark:bg-gray-800 dark:text-gray-300"
          >
            <X size={18} />
          </button>
        </header>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {CATEGORY_THEMES.map((category) => {
            const Icon = category.icon;
            const isActive = activeSlug === category.slug;

            return (
              <Link
                key={category.slug}
                to={`/categorie/${category.slug}`}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                  isActive
                    ? "bg-[#fff0e0] text-primary dark:bg-primary/15"
                    : "text-gray-700 hover:bg-[#fff7ef] dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                <Icon size={19} className={isActive ? "text-primary" : "text-primary/80"} />
                <span className="flex-1 truncate text-[14px] font-bold">{category.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isActive
                      ? "bg-[#ffd9b3] text-[#a24d0a] dark:bg-primary/25 dark:text-orange-200"
                      : "bg-[#f3f4f6] text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {category.count}
                </span>
              </Link>
            );
          })}

          {extraLinks.length > 0 ? (
            <>
              <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
              {extraLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className="block rounded-2xl px-3 py-2.5 text-[13.5px] font-semibold text-gray-600 transition hover:bg-[#fff7ef] hover:text-primary dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {link.label}
                </Link>
              ))}
            </>
          ) : null}
        </nav>

        <footer className="flex items-center gap-2 border-t border-gray-100 px-3 py-3 dark:border-gray-800">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f7f8fa] py-2.5 text-[12.5px] font-bold text-gray-700 transition hover:bg-[#fff0e0] hover:text-primary dark:bg-gray-800 dark:text-gray-200"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Mode clair" : "Mode sombre"}
          </button>

          <button
            type="button"
            onClick={toggleLanguage}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f7f8fa] py-2.5 text-[12.5px] font-bold text-gray-700 transition hover:bg-[#fff0e0] hover:text-primary dark:bg-gray-800 dark:text-gray-200"
          >
            <Globe size={15} />
            {i18n.language === "fr" ? "English" : "Français"}
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
