import { Link } from 'react-router-dom';
import { Home, Search, Package } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        {/* 404 Illustration */}
        <div className="mb-8">
          <h1 className="text-9xl md:text-[12rem] font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">
            404
          </h1>
        </div>

        {/* Message */}
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-800 dark:text-white mb-4">
            Page introuvable
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link to="/">
            <button className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
              <Home size={20} />
              Retour à l'accueil
            </button>
          </Link>
          <Link to="/catalog">
            <button className="w-full sm:w-auto px-8 py-3.5 bg-white dark:bg-gray-800 border-2 border-primary text-primary hover:bg-primary hover:text-white dark:hover:bg-primary font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
              <Search size={20} />
              Explorer le catalogue
            </button>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
          <Link 
            to="/catalog"
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary transition-all text-center group"
          >
            <Package className="mx-auto mb-2 text-primary" size={24} />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary">
              Voir les produits
            </p>
          </Link>
          <Link 
            to="/orders"
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary transition-all text-center group"
          >
            <Package className="mx-auto mb-2 text-primary" size={24} />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary">
              Mes commandes
            </p>
          </Link>
          <Link 
            to="/contact"
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary transition-all text-center group"
          >
            <Package className="mx-auto mb-2 text-primary" size={24} />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary">
              Nous contacter
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}