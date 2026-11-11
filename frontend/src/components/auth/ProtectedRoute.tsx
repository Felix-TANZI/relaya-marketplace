// frontend/src/components/auth/ProtectedRoute.tsx
// Composant de route protégée
// Redirige les utilisateurs non authentifiés vers la connexion

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Route de MotDePasseProvisoirePage (router.tsx).
const MOT_DE_PASSE_PROVISOIRE = '/mot-de-passe-provisoire';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  // DEV-SRV-01 (T07-5) : vendeur inscrit par un agent, encore sur son mot de passe provisoire.
  if (user?.doit_changer_mot_de_passe && location.pathname !== MOT_DE_PASSE_PROVISOIRE) {
    return <Navigate to={MOT_DE_PASSE_PROVISOIRE} replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}
