// frontend/src/features/vendors/v2/compte/securite/SecuriteAppareilsPage.tsx
// Écran "Sécurité, appareils et données" — VD-11 §SEC, Fig.8.
//
// Appareils connectés : /api/auth/sessions/ existe déjà (générique à tout
// User, utilisé côté client par features/profile/SessionsCard.tsx) — l'écran
// pensait initialement qu'aucun pont n'existait ("GET/DELETE /devices"),
// alors que la route s'appelle juste différemment. Branché ici.
//
// L'export (POST /me/export) et la clôture (POST /account/closure) restent
// sans pont dédié : ces deux actions passent par le canal support WhatsApp
// existant (numéro réel réutilisé de app/layout/Header.tsx) plutôt que de
// simuler un succès qui n'aurait aucun effet réel côté serveur — cohérent
// avec AID-02 (un seul numéro support).
//
// La grille "Vous gardez · votre grille" affichée est la grille de référence
// documentée par VD-12 §2.4 (palier Bronze, par famille) — valeurs canoniques
// reprises telles quelles, pas une donnée personnelle fabriquée.

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Database, Smartphone, Monitor, Globe, Clock, Loader2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';
import { vendorsApi, type VendorProfile } from '@/services/api/vendors';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';
import { buildWhatsAppSupportLink, mapLegacyTier } from '../shared/format';

interface DeviceSession {
  jti: string;
  device_name: string | null;
  browser: string | null;
  os_name: string | null;
  ip_address: string | null;
  created_at: string;
  last_activity: string;
  is_current: boolean;
}

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
  const { showToast } = useToast();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [closeSheet, setCloseSheet] = useState(false);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [busyJti, setBusyJti] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      setDevicesLoading(true);
      const data = await http<DeviceSession[]>('/api/auth/sessions/');
      setDevices(data);
    } catch {
      /* silencieux : l'état vide reste correct si l'appel échoue */
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    vendorsApi.getProfile().then(setProfile).catch(() => {});
    loadDevices();
  }, [loadDevices]);

  const revokeDevice = async (jti: string) => {
    try {
      setBusyJti(jti);
      await http(`/api/auth/sessions/${jti}/revoke/`, { method: 'DELETE' });
      showToast(t('sl11_compte.security_devices_revoked_toast'), 'success');
      loadDevices();
    } catch {
      showToast(t('sl11_compte.security_devices_error_toast'), 'error');
    } finally {
      setBusyJti(null);
    }
  };

  const revokeAllDevices = async () => {
    try {
      setBusyJti('all');
      await http('/api/auth/sessions/revoke-all/', { method: 'POST' });
      showToast(t('sl11_compte.security_devices_revoked_all_toast'), 'success');
      loadDevices();
    } catch {
      showToast(t('sl11_compte.security_devices_error_toast'), 'error');
    } finally {
      setBusyJti(null);
    }
  };

  const otherDevicesCount = devices.filter((d) => !d.is_current).length;

  const tierLabel = t(`sl11_compte.tier_${mapLegacyTier(profile?.certification_tier).toLowerCase()}`);
  const exportLink = buildWhatsAppSupportLink(t('sl11_compte.security_export_whatsapp_message', { shop: profile?.business_name || '' }));
  const closeLink = buildWhatsAppSupportLink(t('sl11_compte.security_close_whatsapp_message', { shop: profile?.business_name || '' }));

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.security_title')} />

      {/* Appareils */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Smartphone size={15} color={p.textMuted} />
            <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.security_devices_title')}</p>
          </div>
          {otherDevicesCount > 0 ? (
            <button
              type="button"
              onClick={revokeAllDevices}
              disabled={busyJti === 'all'}
              className="font-bold disabled:opacity-50"
              style={{ fontSize: 11.5, color: p.red }}
            >
              {busyJti === 'all' ? '…' : t('sl11_compte.security_devices_revoke_all')}
            </button>
          ) : null}
        </div>

        {devicesLoading ? (
          <div className="flex items-center gap-2 py-2" style={{ fontSize: 12, color: p.textMuted }}>
            <Loader2 size={13} className="animate-spin" />
            {t('sl11_compte.security_devices_loading')}
          </div>
        ) : devices.length === 0 ? (
          <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.security_devices_empty')}</p>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => {
              const isMobile = /mobile|android|iphone|ipad/i.test(`${d.device_name || ''} ${d.os_name || ''}`);
              const Icon = isMobile ? Smartphone : Monitor;
              return (
                <div
                  key={d.jti}
                  className="flex items-center gap-2.5 rounded-xl p-2.5"
                  style={{ border: `1px solid ${d.is_current ? p.orange : p.border}`, background: d.is_current ? `${p.orange}0D` : 'transparent' }}
                >
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: d.is_current ? p.orange : p.cardAlt, color: d.is_current ? '#fff' : p.textMuted }}
                  >
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold" style={{ fontSize: 12.5, color: p.text }}>
                        {d.device_name || t('sl11_compte.security_devices_fallback')} · {d.browser || '—'}
                      </span>
                      {d.is_current ? (
                        <span className="rounded-full font-bold" style={{ fontSize: 9.5, padding: '2px 6px', background: p.orange, color: '#fff' }}>
                          {t('sl11_compte.security_devices_this_device')}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5" style={{ fontSize: 10.5, color: p.textMuted }}>
                      {d.ip_address ? (
                        <span className="inline-flex items-center gap-1"><Globe size={9} />{d.ip_address}</span>
                      ) : null}
                      <span className="inline-flex items-center gap-1"><Clock size={9} />{new Date(d.last_activity).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  {!d.is_current ? (
                    <button
                      type="button"
                      onClick={() => revokeDevice(d.jti)}
                      disabled={busyJti === d.jti}
                      className="flex-shrink-0 rounded-lg font-bold disabled:opacity-50"
                      style={{ fontSize: 10.5, padding: '5px 8px', border: `1px solid ${p.red}`, color: p.red }}
                    >
                      {busyJti === d.jti ? '…' : t('sl11_compte.security_devices_revoke')}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
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
