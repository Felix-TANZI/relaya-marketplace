// frontend/src/features/vendors/v2/MenuPage.tsx
// Écran "Menu" — VD-11 §MEN-01 à MEN-04.
// Sept groupes rangés du plus utilisé au moins utilisé. Remplace le tiroir
// sombre à 20 entrées de l'ancien SellerLayout (action VD-D12.A01).
//
// Correction VD-D14 (comparaison à la vraie maquette Menu.jpg) : la carte
// boutique et les lignes du menu portent maintenant un compteur ou un
// sous-titre réel, branché sur les données déjà exposées par l'API — jamais un
// chiffre fabriqué. Là où aucune API n'existe encore (Notifications,
// Messagerie — voir compte/notifications/NotificationsPage.tsx et
// compte/messagerie/MessageriePage.tsx, tous deux honnêtement vides), la ligne
// garde juste son libellé, sans pastille inventée.

import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorProfile } from '@/services/api/vendors';
import { vendorsV2Api } from '@/services/api/vendorsV2';
import { palette } from './theme';
import { mapLegacyTier, mapLegacyPlanCode, formatXAF } from './compte/shared/format';
import { disputeTabOf, returnTabOf } from './litiges/helpers';

interface MenuItem {
  labelKey: string;
  path?: string;
  action?: () => void;
  danger?: boolean;
  /** Sous-titre descriptif ou compteur textuel — jamais fabriqué (ex. "3 produits"). */
  subtitle?: string;
  /** Pastille orange à droite — uniquement des comptes réels (à préparer/litiges/retours). */
  badge?: number;
  /** Valeur mise en avant à droite (ex. "17 840 F à verser", "63") à la place/en plus du chevron. */
  highlight?: string;
  highlightColor?: string;
  hideChevron?: boolean;
}
interface MenuGroup { titleKey: string; items: MenuItem[] }

const PREPARE_STATUSES = new Set(['PAID_IN_ESCROW', 'VENDOR_ACKNOWLEDGED', 'PREPARING']);

export default function MenuPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const p = palette(theme);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [toPrepareCount, setToPrepareCount] = useState<number | null>(null);
  const [disputesToAnswerCount, setDisputesToAnswerCount] = useState<number | null>(null);
  const [returnsToDecideCount, setReturnsToDecideCount] = useState<number | null>(null);
  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [toPayXaf, setToPayXaf] = useState<number | null>(null);
  const [activePlanCode, setActivePlanCode] = useState<string | null>(null);

  useEffect(() => {
    vendorsApi.getProfile().then(setProfile).catch(() => {});

    vendorsApi.getOrders()
      .then((orders) => setToPrepareCount(orders.filter((o) => PREPARE_STATUSES.has(o.fulfillment_status)).length))
      .catch(() => {});

    vendorsApi.getDisputes()
      .then((disputes) => setDisputesToAnswerCount(disputes.filter((d) => disputeTabOf(d) === 'to_answer').length))
      .catch(() => {});

    vendorsApi.getReturns()
      .then((returns) => setReturnsToDecideCount(returns.filter((r) => returnTabOf(r) === 'to_decide').length))
      .catch(() => {});

    vendorsApi.getStats()
      .then((stats) => setTotalProducts(stats.total_products))
      .catch(() => {});

    // "17 840 F à verser" (MON-01) : même source privilégiée que useAccueilData
    // (money-summary v2), repli sur l'ancien résumé si indisponible.
    vendorsV2Api.getMoneySummary()
      .then((summary) => setToPayXaf(summary.to_pay.amount_xaf))
      .catch(() => {
        vendorsApi.getPaymentSummary()
          .then((summary) => setToPayXaf(summary.total_release_pending_xaf))
          .catch(() => {});
      });

    vendorsApi.getPlans()
      .then((plans) => setActivePlanCode(plans.active_plan_code))
      .catch(() => {});
  }, []);

  const tier = mapLegacyTier(profile?.certification_tier);
  const tierLabel = t(`sl11_compte.tier_${tier.toLowerCase()}`);
  const score = profile?.total_points ?? null;

  const planKey = activePlanCode ? mapLegacyPlanCode(activePlanCode) : null;
  const planLabel = planKey ? t(`sl11_compte.plan_${planKey.toLowerCase()}`) : null;
  // Free reste toujours l'offre de découverte tant que le vendeur n'a pas changé de plan (VD-10 §PLN).
  const planPill = planKey === 'FREE' ? `${planLabel} · ${t('sl5_fondations.menu_shop_plan_discovery')}` : planLabel;

  const ownerName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  const avatarInitials = ownerName
    ? `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()
    : (profile?.business_name ?? '?').slice(0, 1).toUpperCase();
  const ownerSubtitle = ownerName
    ? `${ownerName} · ${t('sl5_fondations.menu_owner')}`
    : t('sl5_fondations.menu_owner');

  const statusLabel = profile?.status === 'APPROVED' ? t('sl5_fondations.menu_shop_status_open')
    : profile?.status === 'SUSPENDED' ? t('sl5_fondations.menu_shop_status_suspended')
    : profile?.status === 'REJECTED' ? t('sl5_fondations.menu_shop_status_rejected')
    : t('sl5_fondations.menu_shop_status_pending');
  const statusColor = profile?.status === 'APPROVED' ? p.green
    : profile?.status === 'SUSPENDED' || profile?.status === 'REJECTED' ? p.red
    : p.amber;

  const groups: MenuGroup[] = [
    {
      titleKey: 'sl5_fondations.menu_group_to_handle',
      items: [
        { labelKey: 'sl5_fondations.menu_to_prepare', path: '/seller/v2/commandes', badge: toPrepareCount || undefined },
        { labelKey: 'sl5_fondations.menu_disputes', path: '/seller/v2/litiges', badge: disputesToAnswerCount || undefined },
        { labelKey: 'sl5_fondations.menu_returns', path: '/seller/v2/retours', badge: returnsToDecideCount || undefined },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_messages',
      items: [
        { labelKey: 'sl5_fondations.menu_notifications', path: '/seller/v2/notifications' },
        { labelKey: 'sl5_fondations.menu_messaging', path: '/seller/v2/messagerie' },
        { labelKey: 'sl5_fondations.menu_help', path: '/seller/v2/aide', subtitle: t('sl5_fondations.menu_help_subtitle') },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_money',
      items: [
        {
          labelKey: 'sl5_fondations.menu_my_money',
          path: '/seller/v2/argent',
          highlight: toPayXaf !== null ? t('sl5_fondations.menu_my_money_highlight', { amount: formatXAF(toPayXaf) }) : undefined,
          highlightColor: p.green,
        },
        { labelKey: 'sl5_fondations.menu_payouts', path: '/seller/v2/versements', subtitle: t('sl5_fondations.menu_payouts_subtitle') },
        { labelKey: 'sl5_fondations.menu_documents', path: '/seller/v2/argent/documents', subtitle: t('sl5_fondations.menu_documents_subtitle') },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_catalog',
      items: [
        {
          labelKey: 'sl5_fondations.menu_my_products',
          path: '/seller/v2/produits',
          subtitle: totalProducts !== null ? t('sl5_fondations.menu_products_subtitle', { count: totalProducts }) : undefined,
        },
        { labelKey: 'sl5_fondations.menu_new_offer', path: '/seller/v2/produits/nouveau' },
        { labelKey: 'sl5_fondations.menu_assisted_entry', path: '/seller/v2/saisie-assistee', subtitle: t('sl5_fondations.menu_assisted_entry_subtitle') },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_grow',
      items: [
        {
          labelKey: 'sl5_fondations.menu_trust_score',
          path: '/seller/v2/palier',
          subtitle: t('sl5_fondations.menu_trust_score_subtitle'),
          highlight: score !== null ? String(score) : undefined,
          highlightColor: p.orange,
          hideChevron: true,
        },
        { labelKey: 'sl5_fondations.menu_my_numbers', path: '/seller/v2/chiffres' },
        { labelKey: 'sl5_fondations.menu_plans', path: '/seller/v2/plans' },
        { labelKey: 'sl5_fondations.menu_visibility', path: '/seller/v2/se-faire-voir' },
        { labelKey: 'sl14_croissance.menu_services', path: '/seller/v2/services' },
        { labelKey: 'sl14_croissance.menu_demand', path: '/seller/v2/demande' },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_shop',
      items: [
        { labelKey: 'sl5_fondations.menu_my_shop', path: '/seller/v2/boutique', subtitle: t('sl5_fondations.menu_my_shop_subtitle') },
        { labelKey: 'sl5_fondations.menu_hours', path: '/seller/v2/horaires' },
        { labelKey: 'sl5_fondations.menu_reviews', path: '/seller/v2/avis' },
        { labelKey: 'sl5_fondations.menu_team', path: '/seller/v2/equipe' },
        { labelKey: 'sl5_fondations.menu_location', path: '/seller/v2/emplacement' },
      ],
    },
    {
      titleKey: 'sl5_fondations.menu_group_account',
      items: [
        { labelKey: 'sl5_fondations.menu_settings', path: '/seller/v2/parametres', subtitle: t('sl5_fondations.menu_settings_subtitle') },
        { labelKey: 'sl5_fondations.menu_security', path: '/seller/v2/securite' },
        { labelKey: 'sl5_fondations.menu_install', path: '/seller/v2/installer' },
        { labelKey: 'sl5_fondations.menu_logout', action: () => { logout(); navigate('/'); }, danger: true },
      ],
    },
  ];

  return (
    <div className="pb-24 pt-2">
      {/* Carte boutique — identité interne, jamais montrée au client (BOU-02). */}
      <div className="rounded-2xl p-4 mb-5" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white flex-shrink-0"
            style={{ background: p.orange, fontSize: 14 }}
          >
            {avatarInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate" style={{ color: p.text, fontSize: 14 }}>
              {profile?.business_name ?? t('sl5_fondations.shop_default')}
            </p>
            <p className="truncate" style={{ color: p.textMuted, fontSize: 11.5 }}>{ownerSubtitle}</p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full font-bold flex-shrink-0"
            style={{ fontSize: 10.5, padding: '4px 9px', background: `${statusColor}1F`, color: statusColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
            {statusLabel}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {score !== null ? (
            <span className="rounded-full font-bold" style={{ fontSize: 11, padding: '5px 10px', background: `${p.orange}1F`, color: p.orange }}>
              {tierLabel} · {score}
            </span>
          ) : null}
          {planPill ? (
            <span className="rounded-full font-bold" style={{ fontSize: 11, padding: '5px 10px', background: `${p.textMuted}1F`, color: p.textMuted }}>
              {planPill}
            </span>
          ) : null}
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
                  <div className="min-w-0">
                    <span style={{ color: item.danger ? p.red : p.text, fontSize: 13.5, fontWeight: 600 }}>
                      {t(item.labelKey)}
                    </span>
                    {item.subtitle ? (
                      <p className="truncate" style={{ fontSize: 11, color: p.textMuted, marginTop: 1 }}>{item.subtitle}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.highlight ? (
                      <span className="font-black" style={{ fontSize: item.hideChevron ? 15 : 12.5, color: item.highlightColor ?? p.text }}>
                        {item.highlight}
                      </span>
                    ) : null}
                    {item.badge ? (
                      <span
                        className="rounded-full font-bold flex items-center justify-center flex-shrink-0"
                        style={{ minWidth: 19, height: 19, padding: '0 5px', fontSize: 10.5, background: p.orange, color: '#fff' }}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                    {item.danger
                      ? <LogOut size={16} color={p.red} />
                      : !item.hideChevron ? <ChevronRight size={16} color={p.textMuted} /> : null}
                  </div>
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

      <div className="flex flex-col items-center gap-1 pt-1">
        <img src="/belivay-logo.png" alt="BelivaY" style={{ height: 20, width: 'auto' }} />
        <p style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl5_fondations.menu_version')}</p>
      </div>
    </div>
  );
}
