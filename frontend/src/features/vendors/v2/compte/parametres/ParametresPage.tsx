// frontend/src/features/vendors/v2/compte/parametres/ParametresPage.tsx
// Écran "Paramètres" — VD-11 §PAR, Fig.7.
// Langue (FR/EN/pidgin), taille du texte, thème, économie de données,
// notifications, pause boutique, profil, numéro de versement.
//
// Pont API réel : vendorsApi.getProfile() (lecture) et
// vendorsApi.savePaymentPreferences() (numéro de versement, whitelist backend
// ['default_withdrawal_operator', 'default_withdrawal_phone']) et
// vendorsApi.updateShop({is_online}) (pause boutique).
//
// QUESTION OUVERTE (VD-D13.Q04 / arbitrage 12) : le pidgin est proposé comme 3e
// langue de l'application ET des SMS par VD-11/VD-12, mais la règle client
// CIN-09 impose le français dans les SMS tant que la traduction n'est pas
// validée. Ici le sélecteur pidgin est visible mais désactivé (aucune ressource
// i18n `pcm` n'existe encore dans l'app) — décision : ne jamais l'appliquer aux
// SMS, cohérent avec CIN-09.
//
// Téléphone personnel / e-mail : aucune fonction vendorsApi listée ne permet de
// les modifier (savePaymentPreferences ne whiteliste que le numéro de
// versement) — champs affichés en lecture seule avec renvoi vers le support.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Globe, Type, Moon, Wifi, Bell, Pause, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import i18n from '@/i18n';
import { vendorsApi, type VendorProfile, type WithdrawalOperator } from '@/services/api/vendors';
import { palette, TEXT_SIZE } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import { mapLegacyTier } from '../shared/format';

type Lang = 'fr' | 'en' | 'pcm';
type TextSize = keyof typeof TEXT_SIZE;

const NOTIF_KEYS = ['payouts', 'reviews', 'tips'] as const;

export default function ParametresPage() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const p = palette(theme);

  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('relaya.lang') as Lang) || 'fr');
  const [textSize, setTextSize] = useState<TextSize>(() => (localStorage.getItem('belivay-text-scale') as TextSize) || 'normal');
  const [dataSaver, setDataSaver] = useState(() => localStorage.getItem('belivay-data-saver') === '1');
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('belivay-notif-prefs') || '{}'); } catch { return {}; }
  });
  const [paused, setPaused] = useState(false);
  const [savingPause, setSavingPause] = useState(false);

  const [operator, setOperator] = useState<WithdrawalOperator>('MTN_MOMO');
  const [phone, setPhone] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);

  useEffect(() => {
    vendorsApi.getProfile().then((profileData) => {
      setProfile(profileData);
      setOperator((profileData.default_withdrawal_operator as WithdrawalOperator) || 'MTN_MOMO');
      setPhone(profileData.default_withdrawal_phone || '');
    }).catch(() => {});
  }, []);

  const changeLang = (l: Lang) => {
    if (l === 'pcm') return; // Pas encore de ressource i18n pcm — voir note en tête de fichier.
    setLang(l);
    i18n.changeLanguage(l);
    localStorage.setItem('relaya.lang', l);
  };

  const changeTextSize = (s: TextSize) => {
    setTextSize(s);
    localStorage.setItem('belivay-text-scale', s);
    // Application immédiate — best effort. Une persistance complète au
    // rechargement suppose une application au démarrage (main.tsx), hors
    // périmètre de ce lot (voir rapport final).
    document.documentElement.style.fontSize = `${16 * TEXT_SIZE[s]}px`;
  };

  const toggleDataSaver = () => {
    const next = !dataSaver;
    setDataSaver(next);
    localStorage.setItem('belivay-data-saver', next ? '1' : '0');
  };

  const toggleNotif = (key: string) => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    localStorage.setItem('belivay-notif-prefs', JSON.stringify(next));
  };

  const togglePause = async () => {
    setSavingPause(true);
    try {
      await vendorsApi.updateShop({ is_online: paused });
      setPaused((v) => !v);
    } catch {
      // Silencieux : l'utilisateur reste sur l'état affiché, pas de fausse confirmation.
    } finally {
      setSavingPause(false);
    }
  };

  const savePayout = async () => {
    if (!phone.trim()) return;
    setSavingPayout(true);
    setPayoutMsg(null);
    try {
      await vendorsApi.savePaymentPreferences({ default_withdrawal_operator: operator, default_withdrawal_phone: phone.trim() });
      setPayoutMsg(t('sl11_compte.settings_payout_saved'));
    } catch {
      setPayoutMsg(t('sl11_compte.settings_payout_error'));
    } finally {
      setSavingPayout(false);
    }
  };

  const tierLabel = t(`sl11_compte.tier_${mapLegacyTier(profile?.certification_tier).toLowerCase()}`);

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.settings_title')} />

      {/* Carte d'identité */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold" style={{ fontSize: 14, color: p.text }}>{profile?.business_name ?? '—'}</p>
        <p style={{ fontSize: 11.5, color: p.textMuted }}>{tierLabel}</p>
      </div>

      {/* Langue */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Globe size={15} color={p.textMuted} />
          <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.settings_language')}</p>
        </div>
        <div className="flex gap-2">
          {(['fr', 'en', 'pcm'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              disabled={l === 'pcm'}
              onClick={() => changeLang(l)}
              className="flex-1 rounded-xl font-semibold"
              style={{
                padding: '9px',
                fontSize: 12,
                border: `1.5px solid ${lang === l ? p.orange : p.border}`,
                color: l === 'pcm' ? p.textMuted : lang === l ? p.orange : p.text,
                opacity: l === 'pcm' ? 0.55 : 1,
              }}
            >
              {l === 'fr' ? 'Français' : l === 'en' ? 'English' : 'Pidgin'}
            </button>
          ))}
        </div>
        {lang !== 'pcm' ? null : null}
        <p className="mt-2" style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl11_compte.settings_pidgin_soon')}</p>
      </div>

      {/* Taille du texte */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Type size={15} color={p.textMuted} />
          <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.settings_text_size')}</p>
        </div>
        <div className="flex gap-2">
          {(['normal', 'large', 'xlarge'] as TextSize[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeTextSize(s)}
              className="flex-1 rounded-xl font-semibold"
              style={{ padding: '9px', fontSize: 12, border: `1.5px solid ${textSize === s ? p.orange : p.border}`, color: textSize === s ? p.orange : p.text }}
            >
              {t(`sl11_compte.settings_text_size_${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Thème + économie de données */}
      <div className="rounded-2xl overflow-hidden mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <button type="button" onClick={toggleTheme} className="w-full flex items-center justify-between" style={{ padding: '13px 14px' }}>
          <span className="flex items-center gap-2" style={{ fontSize: 13, color: p.text, fontWeight: 600 }}>
            <Moon size={15} color={p.textMuted} /> {t('sl11_compte.settings_dark_theme')}
          </span>
          <span className="rounded-full" style={{ width: 40, height: 22, background: theme === 'dark' ? p.orange : p.border, position: 'relative' }}>
            <span className="absolute rounded-full bg-white" style={{ width: 18, height: 18, top: 2, left: theme === 'dark' ? 20 : 2, transition: 'left .15s' }} />
          </span>
        </button>
        <button type="button" onClick={toggleDataSaver} className="w-full flex items-center justify-between" style={{ padding: '13px 14px', borderTop: `1px solid ${p.border}` }}>
          <span className="flex items-center gap-2" style={{ fontSize: 13, color: p.text, fontWeight: 600 }}>
            <Wifi size={15} color={p.textMuted} /> {t('sl11_compte.settings_data_saver')}
          </span>
          <span className="rounded-full" style={{ width: 40, height: 22, background: dataSaver ? p.orange : p.border, position: 'relative' }}>
            <span className="absolute rounded-full bg-white" style={{ width: 18, height: 18, top: 2, left: dataSaver ? 20 : 2, transition: 'left .15s' }} />
          </span>
        </button>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Bell size={15} color={p.textMuted} />
          <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.settings_notifications')}</p>
        </div>
        <div className="flex items-center justify-between mb-2" style={{ opacity: 0.6 }}>
          <span style={{ fontSize: 12.5, color: p.text }}>{t('sl11_compte.settings_notif_orders_disputes')}</span>
          <span style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl11_compte.settings_locked')}</span>
        </div>
        {NOTIF_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12.5, color: p.text }}>{t(`sl11_compte.settings_notif_${key}`)}</span>
            <button
              type="button"
              onClick={() => toggleNotif(key)}
              className="rounded-full"
              style={{ width: 36, height: 20, background: notifPrefs[key] !== false ? p.orange : p.border, position: 'relative' }}
            >
              <span className="absolute rounded-full bg-white" style={{ width: 16, height: 16, top: 2, left: notifPrefs[key] !== false ? 18 : 2, transition: 'left .15s' }} />
            </button>
          </div>
        ))}
        <p className="mt-1" style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl11_compte.settings_notif_no_sms_promo')}</p>
      </div>

      {/* Boutique — pause + fermeture ponctuelle (Parametres.jpg) */}
      <div className="rounded-2xl overflow-hidden mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold px-3.5 pt-3" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.settings_shop_section')}</p>
        <button
          type="button"
          disabled={savingPause}
          onClick={togglePause}
          className="w-full flex items-center justify-between"
          style={{ padding: '11px 14px' }}
        >
          <span className="flex items-start gap-2 text-left">
            <Pause size={15} color={p.textMuted} className="flex-shrink-0 mt-0.5" />
            <span>
              <span className="block" style={{ fontSize: 13, color: p.text, fontWeight: 600 }}>{t('sl11_compte.settings_pause_shop')}</span>
              <span className="block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl11_compte.settings_pause_desc')}</span>
            </span>
          </span>
          <span className="rounded-full flex-shrink-0" style={{ width: 40, height: 22, background: paused ? p.red : p.border, position: 'relative' }}>
            <span className="absolute rounded-full bg-white" style={{ width: 18, height: 18, top: 2, left: paused ? 20 : 2, transition: 'left .15s' }} />
          </span>
        </button>
        <Link
          to="/seller/v2/horaires"
          className="flex items-center justify-between"
          style={{ padding: '11px 14px', borderTop: `1px solid ${p.border}` }}
        >
          <span style={{ fontSize: 12.5, color: p.orange, fontWeight: 700 }}>{t('sl11_compte.settings_closed_today_cta')}</span>
          <ChevronRight size={15} color={p.orange} />
        </Link>
      </div>

      {/* Profil (lecture seule — pas de pont d'écriture disponible) */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-2" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.settings_profile')}</p>
        <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.settings_profile_phone')} : {user?.phone || profile?.phone || '—'}</p>
        <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.settings_profile_email')} : {user?.email || profile?.email || '—'}</p>
        <p className="mt-1" style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl11_compte.settings_profile_edit_via_support')}</p>
      </div>

      {/* Numéro de versement — vraie écriture via savePaymentPreferences */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-2" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.settings_payout_number')}</p>
        <div className="flex gap-2 mb-2">
          {(['MTN_MOMO', 'ORANGE_MONEY'] as WithdrawalOperator[]).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setOperator(op)}
              className="flex-1 rounded-xl font-semibold"
              style={{ padding: '9px', fontSize: 12, border: `1.5px solid ${operator === op ? p.orange : p.border}`, color: operator === op ? p.orange : p.text }}
            >
              {op === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money'}
            </button>
          ))}
        </div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="6XX XXX XXX"
          className="w-full rounded-xl p-3 mb-2"
          style={{ background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text, fontSize: 13 }}
        />
        <p className="mb-2" style={{ fontSize: 10.5, color: p.amber }}>{t('sl11_compte.settings_payout_simplified_note')}</p>
        {payoutMsg ? <p className="mb-2" style={{ fontSize: 11.5, color: p.text }}>{payoutMsg}</p> : null}
        <button
          type="button"
          disabled={savingPayout || !phone.trim()}
          onClick={savePayout}
          className="w-full rounded-xl font-bold text-white"
          style={{ padding: '11px', background: p.orange, fontSize: 13, opacity: savingPayout ? 0.7 : 1 }}
        >
          {savingPayout ? t('sl11_compte.loading') : t('sl11_compte.save')}
        </button>
      </div>

      <button type="button" onClick={logout} className="w-full rounded-2xl font-bold mb-4" style={{ padding: '13px', border: `1.5px solid ${p.red}`, color: p.red, fontSize: 13.5 }}>
        {t('sl11_compte.settings_logout')}
      </button>

      <p className="text-center" style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl11_compte.settings_footer')}</p>
    </div>
  );
}
