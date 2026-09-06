import { useEffect, useRef, useState } from "react";
import {
  Menu,
  ShoppingBag,
  Shirt,
  Laptop,
  Smartphone,
  Sparkles,
  Home,
  ShoppingCart,
  Footprints,
  Dumbbell,
  Baby,
  LayoutGrid,
  Package,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CATEGORY_THEMES } from "@/data/categoryThemes";

export interface HomeCategoryItem {
  id: number | null;
  slug: string;
  name: string;
  iconName?: string;
  count: number;
}

const ICONS: Record<string, LucideIcon> = {
  Baby, Dumbbell, Footprints, Home, Laptop, LayoutGrid, Package, Shirt,
  ShoppingBag, ShoppingCart, Smartphone, Sparkles,
};

const THEME_BY_SLUG = new Map(CATEGORY_THEMES.map((theme) => [theme.slug, theme]));

export function categoryIcon(category: Pick<HomeCategoryItem, "name" | "slug" | "iconName">) {
  const theme = THEME_BY_SLUG.get(category.slug);
  if (theme) return theme.icon;
  if (category.iconName && ICONS[category.iconName]) return ICONS[category.iconName];
  const value = `${category.slug} ${category.name}`.toLowerCase();
  if (value.includes("phone") || value.includes("télé") || value.includes("smart")) return Smartphone;
  if (value.includes("électron") || value.includes("electron") || value.includes("ordinateur")) return Laptop;
  if (value.includes("mode") || value.includes("vêtement") || value.includes("vetement")) return Shirt;
  if (value.includes("chauss")) return Footprints;
  if (value.includes("sport")) return Dumbbell;
  if (value.includes("bébé") || value.includes("bebe") || value.includes("enfant")) return Baby;
  if (value.includes("maison") || value.includes("bureau")) return Home;
  if (value.includes("aliment") || value.includes("marché") || value.includes("marche")) return ShoppingCart;
  if (value.includes("beauté") || value.includes("beaute") || value.includes("santé")) return Sparkles;
  return category.slug === "all" ? ShoppingBag : Package;
}

const THEME_HOME_CATEGORIES: HomeCategoryItem[] = CATEGORY_THEMES.map((theme) => ({
  id: null,
  slug: theme.slug,
  name: theme.name,
  count: Number(theme.count.replace(/\D/g, "")) || 0,
}));

interface CategorySidebarProps {
  activeCategory: string;
  onSelectCategory: (slug: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  trackTop: number;
  trackHeight: number;
  topOffset: number;
  /** Par défaut : le thème statique br1, pour les pages qui ne chargent pas le catalogue live. */
  categories?: HomeCategoryItem[];
}

export default function CategorySidebar({
  activeCategory,
  onSelectCategory,
  collapsed,
  onToggle,
  trackTop,
  trackHeight,
  topOffset,
  categories = THEME_HOME_CATEGORIES,
}: CategorySidebarProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<"start" | "fixed" | "end">("start");
  const [endTop, setEndTop] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      const panel = panelRef.current;
      if (!panel) return;

      const panelHeight = panel.getBoundingClientRect().height;
      const maxTop = Math.max(0, trackHeight - panelHeight);
      const fixedStart = Math.max(0, trackTop - topOffset);
      const fixedEnd = fixedStart + maxTop;
      const y = window.scrollY;

      if (y < fixedStart) {
        setMode("start");
        setEndTop(0);
      } else if (y >= fixedEnd) {
        setMode("end");
        setEndTop(maxTop);
      } else {
        setMode("fixed");
        setEndTop(0);
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [collapsed, trackTop, trackHeight, topOffset]);

  return (
    <div
      className={`hidden flex-shrink-0 lg:block ${collapsed ? "w-[68px]" : "w-[244px]"}`}
      style={{ position: "relative", height: trackHeight || "auto" }}
    >
      <aside
        ref={panelRef}
        className="rounded-[28px] border border-[#f2d1bc] bg-[linear-gradient(180deg,#fff,#fff7f0)] shadow-[0_20px_50px_rgba(15,23,42,.08)] dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]"
        style={{
          position: mode === "fixed" ? "fixed" : "absolute",
          top: mode === "fixed" ? topOffset : endTop,
          left: mode === "fixed" ? "max(12px, calc((100vw - 1760px) / 2 + 12px))" : 0,
          width: collapsed ? "68px" : "244px",
          zIndex: 35,
        }}
      >
        <div className="flex flex-col gap-3 p-4">
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
            {!collapsed ? (
              <span className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                <ShoppingBag size={15} className="text-primary" />
                Catégories
              </span>
            ) : null}

            <button
              onClick={onToggle}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              aria-label={collapsed ? "Déplier les catégories" : "Replier les catégories"}
            >
              {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            </button>
          </div>

          {!collapsed ? (
            <>
              <div className="mb-1 flex items-center gap-2 text-[13px] font-extrabold text-gray-900 dark:text-white">
                <ShoppingBag size={14} className="text-primary" />
                Catégories
              </div>
              <div className="flex flex-col gap-0.5">
                {categories.map((cat) => {
                  const Icon = categoryIcon(cat);
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => onSelectCategory(cat.slug)}
                      className={`relative flex items-center gap-2.5 rounded-xl px-3 py-3.5 text-left transition-all duration-200 ${
                        activeCategory === cat.slug
                          ? "bg-[#fff4ea] text-primary ring-1 ring-[#f7ddc6] dark:bg-primary/10 dark:ring-primary/25"
                          : "text-gray-700 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      {activeCategory === cat.slug ? (
                        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-primary" />
                      ) : null}
                      <Icon size={17} className="flex-shrink-0 text-primary" />
                      <span className="flex-1 text-[12.5px] font-bold">{cat.name}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {cat.count.toLocaleString("fr-FR")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              {categories.slice(0, 6).map((cat) => {
                const Icon = categoryIcon(cat);
                const active = activeCategory === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => onSelectCategory(cat.slug)}
                    title={`${cat.name} · ${cat.count}`}
                    aria-label={cat.name}
                    className={`relative flex h-12 w-full items-center justify-center rounded-xl transition-all duration-200 ${
                      active
                        ? "bg-[#fff4ea] ring-1 ring-[#f7ddc6] dark:bg-primary/10 dark:ring-primary/25"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {active ? (
                      <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-primary" />
                    ) : null}
                    <Icon size={19} className="text-primary" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
