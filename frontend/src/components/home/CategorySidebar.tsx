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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Category {
  slug: string;
  icon: LucideIcon;
  name: string;
  count: string;
}

const CATEGORIES: Category[] = [
  { slug: "all", icon: ShoppingBag, name: "Tout voir", count: "15 240" },
  { slug: "femme", icon: Shirt, name: "Mode Femme", count: "3 400" },
  { slug: "homme", icon: Shirt, name: "Mode Homme", count: "2 100" },
  { slug: "tech", icon: Laptop, name: "Électronique", count: "1 850" },
  { slug: "phone", icon: Smartphone, name: "Téléphones", count: "980" },
  { slug: "beaute", icon: Sparkles, name: "Beauté & Santé", count: "2 600" },
  { slug: "maison", icon: Home, name: "Maison & Déco", count: "1 720" },
  { slug: "super", icon: ShoppingCart, name: "Supermarché", count: "890" },
  { slug: "shoes", icon: Footprints, name: "Chaussures", count: "1 100" },
  { slug: "sport", icon: Dumbbell, name: "Sport & Loisirs", count: "640" },
  { slug: "bebe", icon: Baby, name: "Bébé & Enfant", count: "520" },
];

interface CategorySidebarProps {
  activeCategory: string;
  onSelectCategory: (slug: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  trackTop: number;
  trackHeight: number;
  topOffset: number;
}

export default function CategorySidebar({
  activeCategory,
  onSelectCategory,
  collapsed,
  onToggle,
  trackTop,
  trackHeight,
  topOffset,
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
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
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
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{cat.count}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              {CATEGORIES.slice(0, 6).map((cat) => {
                const Icon = cat.icon;
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
