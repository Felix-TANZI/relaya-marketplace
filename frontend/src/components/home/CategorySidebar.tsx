import { useNavigate } from "react-router-dom";
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
  { slug: "all",    icon: ShoppingBag,  name: "Tout voir",       count: "15 240" },
  { slug: "femme",  icon: Shirt,        name: "Mode Femme",      count: "3 400" },
  { slug: "homme",  icon: Shirt,        name: "Mode Homme",      count: "2 100" },
  { slug: "tech",   icon: Laptop,       name: "Électronique",    count: "1 850" },
  { slug: "phone",  icon: Smartphone,   name: "Téléphones",      count: "980" },
  { slug: "beaute", icon: Sparkles,     name: "Beauté & Santé",  count: "2 600" },
  { slug: "maison", icon: Home,         name: "Maison & Déco",   count: "1 720" },
  { slug: "super",  icon: ShoppingCart, name: "Supermarché",     count: "890" },
  { slug: "shoes",  icon: Footprints,   name: "Chaussures",      count: "1 100" },
  { slug: "sport",  icon: Dumbbell,     name: "Sport & Loisirs", count: "640" },
  { slug: "bebe",   icon: Baby,         name: "Bébé & Enfant",   count: "520" },
];

interface CategorySidebarProps {
  activeCategory: string;
  onSelectCategory: (slug: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function CategorySidebar({
  activeCategory,
  onSelectCategory,
  collapsed,
  onToggle,
}: CategorySidebarProps) {
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed left-2 z-30 hidden h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-all hover:border-primary hover:bg-primary hover:text-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 lg:flex"
        style={{ top: "calc(var(--belivay-fixed-top, 100px) + 8px)" }}
        aria-label="Toggle sidebar"
      >
        <Menu size={14} />
      </button>

      <aside
        className={`hidden flex-shrink-0 flex-col gap-3 overflow-y-auto border-r border-gray-200 bg-white p-3 transition-all dark:border-gray-800 dark:bg-gray-900 lg:flex ${
          collapsed ? "w-0 overflow-hidden border-none p-0 opacity-0" : "w-[232px] opacity-100"
        }`}
        style={{
          position: "sticky",
          top: "var(--belivay-fixed-top, 100px)",
          height: "calc(100vh - var(--belivay-fixed-top, 100px))",
        }}
      >
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
                <span className="text-[10px] font-bold text-gray-400">{cat.count}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
