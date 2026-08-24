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
