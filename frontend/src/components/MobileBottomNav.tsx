import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingCart, Heart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";

const NAV_ITEMS = [
  { icon: Home, label: "Accueil", to: "/" },
  { icon: Search, label: "Chercher", to: "/search" },
  { icon: ShoppingCart, label: "Panier", to: "/cart", showBadge: true },
  { icon: Heart, label: "Favoris", to: "/wishlist" },
  { icon: User, label: "Compte", to: "/profile" },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { items } = useCart();
  const totalItems = items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/95 lg:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {item.showBadge && totalItems > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
