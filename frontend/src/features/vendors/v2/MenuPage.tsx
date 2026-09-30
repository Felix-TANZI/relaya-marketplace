// frontend/src/features/vendors/v2/MenuPage.tsx
// Écran "Menu" — VD-11 §MEN-01 à MEN-04.
// Sept groupes rangés du plus utilisé au moins utilisé, avec des compteurs
// réels (branchés au lot 5 sur GET /seller/today ; liens directs pour l'instant).
// Remplace le tiroir sombre à 20 entrées de l'ancien SellerLayout (action
// VD-D12.A01).

import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorProfile } from '@/services/api/vendors';
import { palette } from './theme';

interface MenuItem { labelKey: string; path?: string; action?: () => void; danger?: boolean }
interface MenuGroup { titleKey: string; items: MenuItem[] }

export default function MenuPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const p = palette(theme);
  const [profile, setProfile] = useState<VendorProfile | null>(null);

  useEffect(() => {
    vendorsApi.getProfile().then(setProfile).catch(() => {});
  }, []);

  const groups: MenuGroup[] = [
    {
      titleKey: 'sl5_fondations.menu_group_to_handle',
      items: [
        { labelKey: 'sl5_fondations.menu_to_prepare', path: '/seller/orders' },
        { labelKey: 'sl5_fondations.menu_disputes', path: '/seller/disputes' },
        { labelKey: 'sl5_fondations.menu_returns', path: '/seller/returns' },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_messages',
      items: [
        { labelKey: 'sl5_fondations.menu_notifications', path: '/seller/v2/notifications' },
        { labelKey: 'sl5_fondations.menu_messaging', path: '/seller/v2/messagerie' },
        { labelKey: 'sl5_fondations.menu_help', path: '/seller/v2/aide' },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_money',
      items: [
        { labelKey: 'sl5_fondations.menu_my_money', path: '/seller/wallet' },
        { labelKey: 'sl5_fondations.menu_payouts', path: '/seller/settlements' },
        { labelKey: 'sl5_fondations.menu_documents', path: '/seller/payments' },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_catalog',
      items: [
        { labelKey: 'sl5_fondations.menu_my_products', path: '/seller/products' },
        { labelKey: 'sl5_fondations.menu_new_offer', path: '/seller/products/new' },
        { labelKey: 'sl5_fondations.menu_assisted_entry', path: '/seller/v2/saisie-assistee' },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_grow',
      items: [
        { labelKey: 'sl5_fondations.menu_trust_score', path: '/seller/certifications' },
        { labelKey: 'sl5_fondations.menu_my_numbers', path: '/seller/analytics' },
        { labelKey: 'sl5_fondations.menu_plans', path: '/seller/plans' },
        { labelKey: 'sl5_fondations.menu_visibility', path: '/seller/boost' },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_shop',
      items: [
        { labelKey: 'sl5_fondations.menu_my_shop', path: '/seller/shop' },
        { labelKey: 'sl5_fondations.menu_hours', path: '/seller/v2/horaires' },
        { labelKey: 'sl5_fondations.menu_reviews', path: '/seller/v2/avis' },
        { labelKey: 'sl5_fondations.menu_team', path: '/seller/v2/equipe' },
        { labelKey: 'sl5_fondations.menu_location', path: '/seller/v2/emplacement' },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_account',
      items: [
        { labelKey: 'sl5_fondations.menu_settings', path: '/seller/settings' },
        { labelKey: 'sl5_fondations.menu_security', path: '/seller/v2/securite' },
        { labelKey: 'sl5_fondations.menu_install', path: '/seller/v2/installer' },
        { labelKey: 'sl5_fondations.menu_logout', action: () => { logout(); navigate('/'); }, danger: true },
      ],
    },
  ];

  return (
    <div className="pb-24 pt-2">
      {/* Carte boutique — identité interne, jamais montrée au client (BOU-02). */}
      <div className="rounded-2xl p-4 mb-5 flex items-center gap-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white flex-shrink-0"
          style={{ background: p.orange }}
        >
          {(profile?.business_name ?? '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate" style={{ color: p.text, fontSize: 14 }}>
            {profile?.business_name ?? t('sl5_fondations.shop_default')}
          </p>
          <p style={{ color: p.textMuted, fontSize: 11.5 }}>
            {t('sl5_fondations.menu_owner')}
            {profile?.certification_tier ? ` · ${profile.certification_tier}` : ''}
          </p>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.titleKey} className="mb-5">
          <p
            className="font-black uppercase mb-2 px-1"
            style={{ fontSize: 10.5, letterSpacing: '.14em', color: p.textMuted }}
          >
            {t(group.titleKey)}
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ background: p.card, border: `1px solid ${p.border}` }}>
            {group.items.map((item, i) => {
              const content = (
                <>
                  <span style={{ color: item.danger ? p.red : p.text, fontSize: 13.5, fontWeight: 600 }}>
                    {t(item.labelKey)}
                  </span>
                  {item.danger
                    ? <LogOut size={16} color={p.red} />
                    : <ChevronRight size={16} color={p.textMuted} />}
                </>
              );
              const rowStyle = {
                padding: '13px 14px',
                borderTop: i > 0 ? `1px solid ${p.border}` : undefined,
                minHeight: 44,
              };
              return item.action ? (
                <button
                  key={item.labelKey}
                  type="button"
                  onClick={item.action}
                  className="w-full flex items-center justify-between text-left"
                  style={rowStyle}
                >
                  {content}
                </button>
              ) : (
                <Link
                  key={item.labelKey}
                  to={item.path!}
                  className="flex items-center justify-between"
                  style={rowStyle}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-center" style={{ fontSize: 10.5, color: p.textMuted }}>
        {t('sl5_fondations.menu_version')}
      </p>
    </div>
  );
}
