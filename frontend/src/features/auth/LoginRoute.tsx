import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import {
  inferPortalRoleFromPath,
  isDedicatedPortal,
  portalRole,
  type PortalRole,
} from '@/config/portals';

/**
 * Point d'entree unique de /login.
 *
 * Chaque portail a son propre fichier de connexion (features/auth/portals/*),
 * charge a la demande. Les portails pas encore refondus retombent sur
 * l'ancienne page, ce qui permet de les migrer un par un sans casser /login.
 *
 * Comme avant : les apps mobiles dediees ont un portalRole fixe ; le site web
 * sert tous les portails depuis un seul build et devine le portail vise depuis
 * la page qui a redirige ici.
 */
const LoginSeller = lazy(() => import('./portals/LoginSeller'));
const LoginAdmin = lazy(() => import('./portals/LoginAdmin'));
const LoginCourier = lazy(() => import('./portals/LoginCourier'));
const LoginRelayPoint = lazy(() => import('./portals/LoginRelayPoint'));
const LoginDeliveryOrganization = lazy(() => import('./portals/LoginDeliveryOrganization'));
const LoginClient = lazy(() => import('./portals/LoginClient'));
const LegacyLoginPage = lazy(() => import('./LoginPage'));

const pageByRole: Partial<Record<PortalRole, React.LazyExoticComponent<() => React.ReactElement>>> = {
  seller: LoginSeller,
  admin: LoginAdmin,
  courier: LoginCourier,
  relay_point: LoginRelayPoint,
  delivery_organization: LoginDeliveryOrganization,
  client: LoginClient,
};

export default function LoginRoute() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const role = isDedicatedPortal ? portalRole : inferPortalRoleFromPath(from);
  const PortalPage = pageByRole[role] ?? LegacyLoginPage;

  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-[#0B0F14]" />}>
      <PortalPage />
    </Suspense>
  );
}
