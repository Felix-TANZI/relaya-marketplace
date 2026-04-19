import { Link, useLocation } from "react-router-dom";
import { Home, Package, Heart, TriangleAlert, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

const NAV_ITEMS = [
  { icon: Home, labelKey: "mobile_nav.home", to: "/" },
  { icon: Tag, labelKey: "mobile_nav.promotions", to: "/promotions" },
  { icon: Package, labelKey: "mobile_nav.orders", to: "/orders" },
  { icon: Heart, labelKey: "mobile_nav.favorites", to: "/wishlist" },
  { icon: TriangleAlert, labelKey: "mobile_nav.disputes", to: "/profile?tab=disputes" },
];

export default function MobileBottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/95 lg:hidden">
      <div className="flex items-center justify-around px-1 py-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
