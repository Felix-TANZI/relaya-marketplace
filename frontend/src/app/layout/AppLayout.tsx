import { Outlet, Link } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  User,
  Globe,
  Sun,
  Moon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export default function AppLayout() {
  const [theme, setTheme] = useState<"dark" | "light">(
    (document.documentElement.getAttribute("data-theme") as "dark" | "light") ||
      "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      {/* ================= HEADER ================= */}
      <header
        className={cn(
          "sticky top-0 z-[var(--z-header)]",
          "border-b border-[var(--border-soft)]",
          "bg-[var(--bg-glass)] backdrop-blur-xl"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-extrabold tracking-tight"
          >
            <span className="text-lg">Relaya</span>
            <span className="h-2 w-2 rounded-full bg-[var(--accent-main)]" />
          </Link>

          {/* Search Bar (signature) */}
          <div className="flex-1 hidden md:block">
            <div className="glass shadow-soft flex items-center gap-3 px-4 py-2 rounded-full">
              <Search size={18} className="text-[var(--text-soft)]" />
              <input
                type="text"
                placeholder="Rechercher un produit, une boutique, une idée…"
                className="w-full bg-transparent outline-none text-sm placeholder:text-[var(--text-soft)]"
              />
              <span className="text-xs text-[var(--text-soft)]">Yaoundé</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="glass p-2 rounded-full hover:glow-accent transition">
              <ShoppingCart size={18} />
            </button>

            <button className="glass p-2 rounded-full hover:glow-accent transition">
              <User size={18} />
            </button>

            <button className="glass p-2 rounded-full hover:glow-accent transition">
              <Globe size={18} />
            </button>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="glass p-2 rounded-full hover:glow-accent transition"
              title="Changer de thème"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <Outlet />
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-[var(--border-soft)] bg-[var(--bg-soft)]">
        <div className="mx-auto max-w-7xl px-4 py-10 grid gap-8 md:grid-cols-3">
          <div>
            <div className="font-bold text-lg">Relaya</div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Marketplace premium du Cameroun.
              <br />
              Paiement sécurisé · Livraison suivie.
            </p>
          </div>

          <div className="text-sm">
            <div className="font-semibold mb-2">Plateforme</div>
            <ul className="space-y-1 text-[var(--text-muted)]">
              <li>
                <Link to="/">Accueil</Link>
              </li>
              <li>
                <Link to="/shops">Boutiques</Link>
              </li>
              <li>
                <Link to="/sell">Devenir vendeur</Link>
              </li>
            </ul>
          </div>

          <div className="text-sm">
            <div className="font-semibold mb-2">Légal</div>
            <ul className="space-y-1 text-[var(--text-muted)]">
              <li>Conditions d’utilisation</li>
              <li>Politique de confidentialité</li>
              <li>Paiements & retours</li>
            </ul>
          </div>
        </div>

        <div className="text-center text-xs text-[var(--text-soft)] pb-6">
          © {new Date().getFullYear()} Relaya — Tous droits réservés
        </div>
      </footer>
    </div>
  );
}
