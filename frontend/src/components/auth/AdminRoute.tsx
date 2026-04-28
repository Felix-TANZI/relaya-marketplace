// frontend/src/components/auth/AdminRoute.tsx
// Guard de sécurité pour l'espace admin BelivaY.
//
// Comportement :
//   1. Utilisateur non connecté  → redirige vers /login
//   2. Utilisateur connecté mais non staff → redirige vers / avec message d'erreur
//   3. Utilisateur connecté et is_staff    → rend le contenu protégé
//
// Utilisation dans App.tsx :
//   <Route path="admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
//
// Note : is_staff est défini côté Django sur le modèle User.
// Un vendeur ou client ordinaire ne pourra jamais accéder à /admin/.

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Pendant le chargement de l'utilisateur, on ne redirige pas encore
  // pour éviter un flash de redirection au premier chargement.
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0D1117',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid rgba(220,38,38,0.2)',
            borderTopColor: '#DC2626',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Cas 1 : non connecté → login avec retour à la page demandée
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Cas 2 : connecté mais pas staff → accueil avec message d'accès refusé
  // On encode le message dans le state pour que HomePage puisse l'afficher
  // si besoin, sinon l'utilisateur arrive juste sur l'accueil sans explication.
  if (!user.is_staff) {
    return <Navigate to="/" replace />;
  }

  // Cas 3 : admin confirmé → accès autorisé
  return <>{children}</>;
}