import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, Home, LayoutGrid, ShoppingCart, UserCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { getFavoriteProductIds } from "@/lib/favorites";

const NAV_ITEMS = [
  { icon: Home, label: "Accueil", to: "/" },
  { icon: LayoutGrid, label: "Catégories", to: "/categories" },
  { icon: ShoppingCart, label: "Panier", to: "/cart", badge: "cart" as const },
  { icon: Heart, label: "Favoris", to: "/wishlist", badge: "favorites" as const },
  { icon: UserCircle, label: "Compte", to: "/profile" },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const navItems = user ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.to !== "/profile");
  const { itemCount } = useCart();
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
    const sync = () => setFavoritesCount(getFavoriteProductIds().length);
    const raf = requestAnimationFrame(sync);
    window.addEventListener("belivay-favorites-updated", sync);
    window.addEventListener("storage", sync);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("belivay-favorites-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/95 lg:hidden">
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          const count = item.badge === "cart" ? itemCount : item.badge === "favorites" ? favoritesCount : 0;

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
                {count > 0 ? (
                  <span className="absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
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
