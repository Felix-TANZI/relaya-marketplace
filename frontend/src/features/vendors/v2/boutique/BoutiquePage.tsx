// frontend/src/features/vendors/v2/boutique/BoutiquePage.tsx
// Écran "Ma boutique · identité" — VD-11 §BOU, Fig.2.
//
// RÈGLE VERROUILLÉE (audit de /seller/shop, frontend/src/features/vendors/
// SellerShopPage.tsx, 1624 lignes) : cette page-là construit un QR code
// public, une URL publique et laisse le vendeur éditer une bannière/photo/
// téléphone/adresse destinés à l'affichage client — ce qui VIOLE la règle
// produit. Ici, "Ma boutique" est un écran d'IDENTITÉ INTERNE uniquement :
// badge palier + Trust Score (ce que le client voit, et rien d'autre), puis
// les informations d'identité du compte, toutes en LECTURE SEULE. Aucun nom,
// photo, adresse, téléphone, lien ou QR de boutique n'est jamais montré ou
// construit ici pour un usage client.
//
// Pont API réel : vendorsApi.getProfile() (identité, palier, score, dates de
// création/approbation) + useAuth (nom du titulaire) + GET
// /api/vendors/locations/ (compte d'emplacements réel, repris tel quel de
// SellerShopPage.tsx, juste pour un sous-titre honnête — jamais l'adresse ni
// le statut "vérifié" détaillés, qui appartiennent à l'écran Emplacement).
//
// Écart assumé : la maquette affiche "Statut : Particulier · sans RCCM"
// (type juridique du compte). Aucun champ de ce type n'existe sur
// VendorProfile (backend/apps/vendors/models.py) — seul `status` (PENDING/
// APPROVED/REJECTED/SUSPENDED) existe. On affiche donc le statut
// d'approbation réel du compte à la place, jamais une donnée inventée.
//
// "Demander une modification" : pas de messagerie générique de compte
// branchée (MessageriePage.tsx n'a pas d'API — fils rattachés aux commandes
// uniquement). On réutilise donc le même canal que AidePage.tsx : le support
// WhatsApp vendeur réel (buildWhatsAppSupportLink), jamais un faux bouton.

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Clock, Star, Users, MapPin, ChevronRight, Lock, Send,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorProfile } from '@/services/api/vendors';
import { http } from '@/services/api/http';
import { palette } from '../theme';
import ScreenHeader from '../compte/shared/ScreenHeader';
import Collapsible from '../compte/shared/Collapsible';
import { mapLegacyTier, buildWhatsAppSupportLink } from '../compte/shared/format';

interface LocationLite { id: number; is_active: boolean }

const STATUS_KEY: Record<VendorProfile['status'], string> = {
  PENDING: 'sl13_boutique.status_pending',
  APPROVED: 'sl13_boutique.status_approved',
  REJECTED: 'sl13_boutique.status_rejected',
  SUSPENDED: 'sl13_boutique.status_suspended',
};

function formatDate(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long' });
}

export default function BoutiquePage() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const p = palette(theme);

  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [locationCount, setLocationCount] = useState<number | null>(null);

  useEffect(() => {
    vendorsApi.getProfile().then(setProfile).catch(() => {});
    http<LocationLite[]>('/api/vendors/locations/')
      .then((locs) => setLocationCount(locs.filter((l) => l.is_active).length))
      .catch(() => {});
  }, []);

  const tier = mapLegacyTier(profile?.certification_tier);
  const tierLabel = t(`sl11_compte.tier_${tier.toLowerCase()}`);
  const score = profile?.total_points ?? null;

  const ownerName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || null;

  const statusLabel = profile ? t(STATUS_KEY[profile.status]) : '—';
  const statusColor = profile?.status === 'APPROVED' ? p.green
    : profile?.status === 'SUSPENDED' || profile?.status === 'REJECTED' ? p.red
    : p.amber;

  const createdLabel = formatDate(profile?.created_at, i18n.language);
  const approvedLabel = formatDate(profile?.approved_at, i18n.language);
  const accountLine = createdLabel
    ? (approvedLabel
      ? t('sl13_boutique.identity_account_created_approved', { created: createdLabel, approved: approvedLabel })
      : t('sl13_boutique.identity_account_created', { date: createdLabel }))
    : '—';

  const locationSubtitle = locationCount === null
    ? undefined
    : locationCount === 0
      ? t('sl13_boutique.link_location_none')
      : t(locationCount > 1 ? 'sl13_boutique.link_location_count_plural' : 'sl13_boutique.link_location_count', { count: locationCount });

  const whatsappLink = buildWhatsAppSupportLink(
    t('sl13_boutique.request_change_whatsapp_message', { shop: profile?.business_name || '', id: profile?.id || '' }),
  );

  const links: { to: string; icon: ReactNode; label: string; subtitle?: string }[] = [
    { to: '/seller/v2/horaires', icon: <Clock size={18} color={p.textMuted} />, label: t('sl13_boutique.link_hours'), subtitle: t('sl13_boutique.link_hours_subtitle') },
    { to: '/seller/v2/avis', icon: <Star size={18} color={p.textMuted} />, label: t('sl13_boutique.link_reviews') },
    { to: '/seller/v2/equipe', icon: <Users size={18} color={p.textMuted} />, label: t('sl13_boutique.link_team') },
    { to: '/seller/v2/emplacement', icon: <MapPin size={18} color={p.textMuted} />, label: t('sl13_boutique.link_location'), subtitle: locationSubtitle },
  ];

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl13_boutique.title')} subtitle={t('sl13_boutique.subtitle')} />

      {/* Ce que voit le client — règle verrouillée, jamais contournée ici. */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-black uppercase mb-3" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
          {t('sl13_boutique.client_sees_label')}
        </p>
        <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: p.cardAlt }}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white flex-shrink-0"
            style={{ background: p.orange, fontSize: 14 }}
          >
            {tierLabel.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate" style={{ fontSize: 13.5, color: p.text }}>{tierLabel}</p>
            <p style={{ fontSize: 12, color: p.textMuted }}>
              {score !== null ? t('sl13_boutique.trust_score_label', { score }) : '—'}
            </p>
          </div>
          <ShieldCheck size={22} color={p.green} />
        </div>
        <p className="mt-3" style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>{t('sl13_boutique.nothing_else')}</p>
        <p style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>{t('sl13_boutique.trust_score_explain')}</p>
      </div>

      <Collapsible title={t('sl13_boutique.how_it_works')}>
        <p className="mb-2"><b style={{ color: p.text }}>{t('sl13_boutique.client_never_sees')}</b></p>
        <p className="mb-2"><b style={{ color: p.text }}>{t('sl13_boutique.vendor_never_sees')}</b></p>
        <p><b style={{ color: p.text }}>{t('sl13_boutique.between_you')}</b></p>
      </Collapsible>

      {/* Liens — sous-titres uniquement quand une donnée réelle existe. */}
      <div className="rounded-2xl overflow-hidden mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        {links.map((item, i) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3"
            style={{ padding: '13px 14px', borderTop: i > 0 ? `1px solid ${p.border}` : undefined, minHeight: 44 }}
          >
            {item.icon}
            <div className="min-w-0 flex-1">
              <span style={{ fontSize: 13.5, fontWeight: 600, color: p.text }}>{item.label}</span>
              {item.subtitle ? (
                <p className="truncate" style={{ fontSize: 11, color: p.textMuted, marginTop: 1 }}>{item.subtitle}</p>
              ) : null}
            </div>
            <ChevronRight size={16} color={p.textMuted} />
          </Link>
        ))}
      </div>

      {/* Identité — tout en lecture seule. */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <h3 className="font-bold mb-3" style={{ fontSize: 14, color: p.text }}>{t('sl13_boutique.identity_title')}</h3>

        <div className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${p.border}` }}>
          <span style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl13_boutique.identity_shop_name')}</span>
          <span className="font-semibold text-right" style={{ fontSize: 13, color: p.text }}>{profile?.business_name ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${p.border}` }}>
          <span style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl13_boutique.identity_owner')}</span>
          <span className="font-semibold text-right flex items-center gap-1.5" style={{ fontSize: 13, color: p.text }}>
            {ownerName ?? '—'} <Lock size={12} color={p.textMuted} />
          </span>
        </div>
        <div className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${p.border}` }}>
          <span style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl13_boutique.identity_username')}</span>
          <span className="font-semibold text-right" style={{ fontSize: 13, color: p.text }}>
            {profile?.username ? `@${profile.username}` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${p.border}` }}>
          <span style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl13_boutique.identity_status')}</span>
          <span className="font-bold text-right" style={{ fontSize: 13, color: statusColor }}>{statusLabel}</span>
        </div>
        <div className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${p.border}` }}>
          <span style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl13_boutique.identity_account')}</span>
          <span className="font-semibold text-right" style={{ fontSize: 13, color: p.text }}>{accountLine}</span>
        </div>

        <p className="flex items-start gap-1.5 mt-3" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.5 }}>
          <Lock size={13} color={p.textMuted} style={{ flexShrink: 0, marginTop: 1 }} />
          {t('sl13_boutique.identity_hint')}
        </p>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl font-bold mt-4"
          style={{ padding: '12px', border: `1.5px solid ${p.orange}`, color: p.orange, fontSize: 13 }}
        >
          <Send size={15} />
          {t('sl13_boutique.request_change')}
        </a>
      </div>
    </div>
  );
}
