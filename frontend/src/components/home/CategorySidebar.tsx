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
      className={`hidden flex-shrink-0 lg:block ${collapsed ? "w-[72px]" : "w-[232px]"}`}
      style={{ position: "relative", height: trackHeight || "auto" }}
    >
      <aside
        ref={panelRef}
        className="rounded-[28px] border border-[#f2d1bc] bg-[linear-gradient(180deg,#fff,#fff7f0)] shadow-[0_20px_50px_rgba(15,23,42,.08)] dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]"
        style={{
          position: mode === "fixed" ? "fixed" : "absolute",
          top: mode === "fixed" ? topOffset : endTop,
          left: mode === "fixed" ? "max(12px, calc((100vw - 1760px) / 2 + 12px))" : 0,
          width: collapsed ? "72px" : "232px",
          zIndex: 35,
        }}
      >
        <div className="flex flex-col gap-3 p-3">
          <button
            onClick={onToggle}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-all hover:border-primary hover:bg-primary hover:text-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            aria-label="Toggle sidebar"
          >
            <Menu size={14} />
          </button>

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
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all ${
                        activeCategory === cat.slug
                          ? "bg-orange-50 text-primary dark:bg-primary/10"
                          : "text-gray-700 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon size={15} className="flex-shrink-0" />
                      <span className="flex-1 text-[12px] font-semibold">{cat.name}</span>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
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
                return (
                  <button
                    key={cat.slug}
                    onClick={() => onSelectCategory(cat.slug)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                      activeCategory === cat.slug
                        ? "bg-orange-50 text-primary dark:bg-primary/10"
                        : "bg-white text-gray-500 hover:text-primary dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <Icon size={16} />
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
