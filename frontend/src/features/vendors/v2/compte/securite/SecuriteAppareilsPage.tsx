// frontend/src/features/vendors/v2/compte/securite/SecuriteAppareilsPage.tsx
// Écran "Sécurité, appareils et données" — VD-11 §SEC, Fig.8.
//
// Pas de pont API listé pour les appareils (GET/DELETE /devices), l'export
// (POST /me/export) ou la clôture (POST /account/closure) : ces trois actions
// passent par le canal support WhatsApp existant (numéro réel réutilisé de
// app/layout/Header.tsx) plutôt que de simuler un succès qui n'aurait aucun
// effet réel côté serveur — cohérent avec AID-02 (un seul numéro support).
//
// La grille "Vous gardez · votre grille" affichée est la grille de référence
// documentée par VD-12 §2.4 (palier Bronze, par famille) — valeurs canoniques
// reprises telles quelles, pas une donnée personnelle fabriquée.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Database, Smartphone } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorProfile } from '@/services/api/vendors';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';
import { buildWhatsAppSupportLink, mapLegacyTier } from '../shared/format';

const KEEP_GRID = [
  { key: 'electronics', range: '86,5 – 98 %' },
  { key: 'fashion_beauty', range: '76,5 – 86,5 %' },
  { key: 'grocery', range: '92,5 – 95 %' },
  { key: 'home_sport_baby_pets', range: '85 – 91,5 %' },
  { key: 'books_media', range: '87,5 – 91 %' },
];

export default function SecuriteAppareilsPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [closeSheet, setCloseSheet] = useState(false);
  const devices: never[] = []; // Pas de pont GET /devices — état vide honnête.

  useEffect(() => {
    vendorsApi.getProfile().then(setProfile).catch(() => {});
  }, []);

  const tierLabel = t(`sl11_compte.tier_${mapLegacyTier(profile?.certification_tier).toLowerCase()}`);
  const exportLink = buildWhatsAppSupportLink(t('sl11_compte.security_export_whatsapp_message', { shop: profile?.business_name || '' }));
  const closeLink = buildWhatsAppSupportLink(t('sl11_compte.security_close_whatsapp_message', { shop: profile?.business_name || '' }));

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.security_title')} />

      {/* Appareils */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Smartphone size={15} color={p.textMuted} />
          <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.security_devices_title')}</p>
        </div>
        {devices.length === 0 ? (
          <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.security_devices_empty')}</p>
        ) : null}
      </div>

      {/* Mot de passe et second facteur */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={15} color={p.textMuted} />
          <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.security_password_title')}</p>
        </div>
        <p className="mb-2" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.security_password_rule')}</p>
        <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.security_2fa_note')}</p>
      </div>

      {/* Statut du compte */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-2" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.security_status_title')}</p>
        <p style={{ fontSize: 12, color: p.textMuted }}>
          {t('sl11_compte.security_status_since')} : {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '—'}
        </p>
        <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.security_status_tier')} : {tierLabel}</p>
        <Collapsible title={t('sl11_compte.security_keep_grid_title')}>
          <ul className="space-y-1">
            {KEEP_GRID.map((row) => (
              <li key={row.key} className="flex items-center justify-between">
                <span>{t(`sl11_compte.security_grid_${row.key}`)}</span>
                <span className="font-semibold" style={{ color: p.text }}>{row.range}</span>
              </li>
            ))}
          </ul>
        </Collapsible>
      </div>

      {/* Mes données */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Database size={15} color={p.textMuted} />
          <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.security_data_title')}</p>
        </div>
        <p className="mb-3" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.security_data_retention')}</p>
        <a
          href={exportLink}
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center rounded-xl font-bold mb-2"
          style={{ padding: '11px', border: `1.5px solid ${p.orange}`, color: p.orange, fontSize: 12.5 }}
        >
          {t('sl11_compte.security_data_export_cta')}
        </a>
        <button
          type="button"
          onClick={() => setCloseSheet(true)}
          className="w-full text-center rounded-xl font-bold"
          style={{ padding: '11px', color: p.red, fontSize: 12.5 }}
        >
          {t('sl11_compte.security_close_account_cta')}
        </button>
      </div>

      {closeSheet ? (
        <div className="fixed inset-0 z-[900] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setCloseSheet(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-5" style={{ background: p.card, border: `1px solid ${p.border}` }} onClick={(e) => e.stopPropagation()}>
            <p className="font-black mb-2" style={{ fontSize: 15, color: p.text }}>{t('sl11_compte.security_close_sheet_title')}</p>
            <p className="mb-4" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.security_close_sheet_desc')}</p>
            <a
              href={closeLink}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center rounded-xl font-bold text-white mb-2"
              style={{ padding: '12px', background: p.red, fontSize: 13 }}
            >
              {t('sl11_compte.security_close_confirm')}
            </a>
            <button type="button" onClick={() => setCloseSheet(false)} className="w-full" style={{ fontSize: 12, color: p.textMuted }}>
              {t('sl11_compte.cancel')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
