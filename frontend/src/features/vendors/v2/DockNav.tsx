// frontend/src/features/vendors/v2/DockNav.tsx
// Dock de navigation — VD-01 §NAV-01/02/09.
// Quatre onglets fixes, identiques sur toutes les pages racines : Accueil,
// Commandes, Produits, Argent. Remplace le tiroir de 20 entrées (GEN action
// VD-D02.A01/A02) : le reste des fonctions vit dans l'écran Menu (VD-11).
// Détaché du bord bas (DS-03 : 12px), capsule orangée sur l'onglet actif.

import { NavLink, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Package, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { palette } from './theme';
import { useTheme } from '@/context/ThemeContext';

export interface DockBadges {
  /** Nombre de commandes à préparer (badge sur l'onglet Commandes). */
  toPrepare?: number;
  /** Vrai si un montant est gelé (point rouge sur l'onglet Argent). */
  frozen?: boolean;
}

// Les 4 onglets racine sont maintenant tous sur des écrans v2 (lot Argent
// construit le 04/10 — modèle retrait à la demande).
const TABS = [
  { key: 'home', path: '/seller/v2/accueil', icon: Home },
  { key: 'orders', path: '/seller/v2/commandes', icon: ShoppingBag },
  { key: 'products', path: '/seller/v2/produits', icon: Package },
  { key: 'money', path: '/seller/v2/argent', icon: Wallet },
] as const;

export default function DockNav({ badges = {} }: { badges?: DockBadges }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);

  const labels: Record<(typeof TABS)[number]['key'], string> = {
    home: t('sl5_fondations.dock_home'),
    orders: t('sl5_fondations.dock_orders'),
    products: t('sl5_fondations.dock_products'),
    money: t('sl5_fondations.dock_money'),
  };

  const location = useLocation();

  return (
    <nav
      role="navigation"
      aria-label={t('sl5_fondations.dock_label')}
      className="fixed left-0 right-0 z-[700] flex justify-center"
      style={{ bottom: 12 }}
    >
      <div
        className="flex items-center gap-1 rounded-[28px] px-2 py-2"
        style={{
          background: p.glass,
          backdropFilter: 'blur(24px) brightness(1.05) saturate(1.6)',
          border: `1px solid ${p.border}`,
          boxShadow: '0 12px 34px rgba(0,0,0,0.18)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
          marginBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = location.pathname.startsWith(tab.path);
          const badgeCount = tab.key === 'orders' ? badges.toPrepare : undefined;
          const showDot = tab.key === 'money' && badges.frozen;
          return (
            <NavLink
              key={tab.key}
              to={tab.path}
              className="relative flex flex-col items-center justify-center gap-0.5 rounded-[20px] px-4 py-2 min-w-[64px] transition-all active:scale-95"
              style={active ? { background: p.orange } : undefined}
            >
              <span className="relative">
                <Icon size={18} color={active ? '#fff' : p.textMuted} />
                {badgeCount ? (
                  <span
                    className="absolute -top-1.5 -right-2 rounded-full font-bold flex items-center justify-center"
                    style={{ fontSize: 9, minWidth: 15, height: 15, padding: '0 3px', background: p.red, color: '#fff' }}
                  >
                    {badgeCount}
                  </span>
                ) : null}
                {showDot ? (
                  <span
                    className="absolute -top-0.5 -right-1 rounded-full"
                    style={{ width: 7, height: 7, background: p.red }}
                  />
                ) : null}
              </span>
              <span
                className="font-semibold"
                style={{ fontSize: 10, color: active ? '#fff' : p.textMuted }}
              >
                {labels[tab.key]}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
