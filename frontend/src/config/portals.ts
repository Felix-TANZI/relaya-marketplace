export type PortalRole =
  | 'client'
  | 'seller'
  | 'courier'
  | 'admin'
  | 'delivery_organization'
  | 'relay_point';

const allowedPortalRoles: PortalRole[] = [
  'client',
  'seller',
  'courier',
  'admin',
  'delivery_organization',
  'relay_point',
];

const rawPortalRole = import.meta.env.VITE_PORTAL_ROLE as string | undefined;

export const portalRole: PortalRole = allowedPortalRoles.includes(rawPortalRole as PortalRole)
  ? (rawPortalRole as PortalRole)
  : 'client';

export const portalHomePathByRole: Record<PortalRole, string> = {
  client: '/',
  seller: '/seller/dashboard',
  courier: '/courier',
  admin: '/admin/dashboard',
  delivery_organization: '/delivery-organization',
  relay_point: '/relay-point',
};

export const portalLabelByRole: Record<PortalRole, string> = {
  client: 'Client',
  seller: 'Vendeur',
  courier: 'Livreur',
  admin: 'Admin',
  delivery_organization: 'Organisation de livraison',
  relay_point: 'Point relais',
};

export const portalHomePath = portalHomePathByRole[portalRole];

export const isDedicatedPortal = portalRole !== 'client';

/**
 * Deduit le portail vise a partir d'un chemin (ex. "/admin/dashboard" -> admin).
 *
 * Sert uniquement au site web, qui sert tous les portails depuis un seul
 * build (portalRole y vaut toujours 'client', faute de VITE_PORTAL_ROLE au
 * moment de la compilation) : sans ca, la page de connexion s'affichait
 * toujours avec l'habillage "client", meme quand on venait de /admin ou
 * /seller. Les applications mobiles dediees n'en ont pas besoin, chacune
 * a deja son propre portalRole fixe.
 */
export function inferPortalRoleFromPath(pathname: string | undefined | null): PortalRole {
  if (!pathname) return 'client';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/seller')) return 'seller';
  if (pathname.startsWith('/courier') || pathname.startsWith('/driver')) return 'courier';
  if (pathname.startsWith('/relay-point')) return 'relay_point';
  if (pathname.startsWith('/delivery-organization')) return 'delivery_organization';
  return 'client';
}
