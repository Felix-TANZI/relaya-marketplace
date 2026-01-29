import { Outlet, Link, useLocation } from "react-router-dom";
import { Search, ShoppingCart, User, Menu, X, Sun, Moon, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export default function AppLayout() {
  const [theme, setTheme] = useState<"dark" | "light">(
    (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark"
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

useEffect(() => {
  const id = requestAnimationFrame(() => {
    setMobileMenuOpen(false);
  });

  return () => cancelAnimationFrame(id);
}, [location.pathname]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("relaya-theme", newTheme);
  };

  return (
    <div className="min-h-screen flex flex-col bg-primary text-text-primary">
      {/* HEADER */}
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-base",
          scrolled ? "glass-strong border-b border-border-default shadow-lg" : "bg-transparent"
        )}
      >
        <div className="container">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 gradient-holographic rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative w-10 h-10 rounded-full gradient-holographic flex items-center justify-center text-text-inverse font-display font-bold text-xl">
                  R
                </div>
              </div>
              <span className="font-display font-bold text-2xl tracking-tight">Relaya</span>
            </Link>

            {/* Desktop Search */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-accent-cyan transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher des produits, boutiques..."
                  className="w-full pl-12 pr-4 py-3 rounded-full glass border-border-default focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <kbd className="px-2 py-1 text-xs rounded bg-primary-tertiary text-text-tertiary border border-border-subtle">⌘K</kbd>
                </div>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-3 rounded-xl glass border-border-subtle hover:border-accent-cyan hover:shadow-glow-cyan transition-all"
                title="Changer de thème"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button className="p-3 rounded-xl glass border-border-subtle hover:border-accent-cyan hover:shadow-glow-cyan transition-all">
                <Globe size={20} />
              </button>

              <button className="relative p-3 rounded-xl glass border-border-subtle hover:border-accent-cyan hover:shadow-glow-cyan transition-all">
                <ShoppingCart size={20} />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-pink text-text-inverse text-xs font-bold flex items-center justify-center animate-glow-pulse">3</span>
              </button>

              <button className="ml-2 px-6 py-3 rounded-xl gradient-holographic text-text-inverse animate-gradient shadow-md hover:shadow-xl transition-all font-medium">
                <User size={18} className="inline mr-2" />
                Connexion
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-3 rounded-xl glass border-border-subtle"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Search */}
          <div className="lg:hidden pb-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-12 pr-4 py-3 rounded-full glass border-border-default focus:border-accent-cyan transition-all"
              />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border-subtle glass-strong">
            <div className="container py-4 space-y-3">
              <Link to="/" className="block px-4 py-3 rounded-xl hover:bg-primary-tertiary transition-colors">
                Accueil
              </Link>
              <Link to="/catalog" className="block px-4 py-3 rounded-xl hover:bg-primary-tertiary transition-colors">
                Catalogue
              </Link>
              <Link to="/shops" className="block px-4 py-3 rounded-xl hover:bg-primary-tertiary transition-colors">
                Boutiques
              </Link>
              <div className="flex items-center gap-2 pt-2">
                <button className="flex-1 px-6 py-3 rounded-xl gradient-holographic text-text-inverse animate-gradient font-medium">
                  Connexion
                </button>
                <button onClick={toggleTheme} className="p-3 rounded-xl glass border-border-subtle">
                  {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* MAIN */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border-subtle bg-primary-secondary mt-20">
        <div className="container py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full gradient-holographic flex items-center justify-center text-text-inverse font-display font-bold text-xl">R</div>
                <span className="font-display font-bold text-xl">Relaya</span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">
                La marketplace premium du Cameroun. Paiement sécurisé, livraison rapide, confiance garantie.
              </p>
            </div>

            <div>
              <h3 className="font-display font-semibold text-lg mb-4">Marketplace</h3>
              <ul className="space-y-3">
                <li><Link to="/catalog" className="text-text-secondary hover:text-accent-cyan transition-colors">Catalogue</Link></li>
                <li><Link to="/shops" className="text-text-secondary hover:text-accent-cyan transition-colors">Boutiques</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display font-semibold text-lg mb-4">Vendeurs</h3>
              <ul className="space-y-3">
                <li><Link to="/sell" className="text-text-secondary hover:text-accent-cyan transition-colors">Devenir vendeur</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display font-semibold text-lg mb-4">Support</h3>
              <ul className="space-y-3">
                <li><Link to="/help" className="text-text-secondary hover:text-accent-cyan transition-colors">Centre d'aide</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border-subtle flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-text-tertiary text-sm">© {new Date().getFullYear()} Relaya. Tous droits réservés.</p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/privacy" className="text-text-tertiary hover:text-accent-cyan transition-colors">Confidentialité</Link>
              <Link to="/terms" className="text-text-tertiary hover:text-accent-cyan transition-colors">Conditions</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}