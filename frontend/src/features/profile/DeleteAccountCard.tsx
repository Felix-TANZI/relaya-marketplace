// frontend/src/features/profile/DeleteAccountCard.tsx
// Carte "Supprimer mon compte" — suppression réelle via DELETE /api/auth/me/
// (App Store Review Guideline 5.1.1(v)). Comptes email : ressaisie du mot de
// passe ; comptes Google/Apple (sans mot de passe) : saisie du mot de confirmation.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { authApi } from '@/services/api/auth';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const CONFIRM_WORD = 'SUPPRIMER';

// Données personnelles conservées localement sur l'appareil (hors jetons et
// avatar, déjà nettoyés par logout()).
const LOCAL_PERSONAL_KEYS = [
  'belivay-payment-methods',
  'relaya_checkout_draft_v1',
  'belivay_account',
  'belivay_support_inbox',
  'belivay_order_disputes',
  'belivay_favorite_product_ids',
  'belivay_recently_viewed',
  'belivay_last_search',
  'belivay_geo',
];

export default function DeleteAccountCard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState('');
  const [deleting, setDeleting] = useState(false);

  const needsPassword = user?.has_usable_password !== false;
  const canSubmit = needsPassword ? secret.length > 0 : secret.trim().toUpperCase() === CONFIRM_WORD;

  const close = () => {
    setSecret('');
    setOpen(false);
  };

  const submit = async () => {
    if (!canSubmit || deleting) return;
    setDeleting(true);
    try {
      await authApi.deleteAccount(needsPassword ? { password: secret } : { confirm: CONFIRM_WORD });
      LOCAL_PERSONAL_KEYS.forEach((key) => localStorage.removeItem(key));
      logout();
      showToast(t('cl7_delete_account.success'), 'success');
      navigate('/');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('cl7_delete_account.error'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const inputCls =
    'w-full rounded-[10px] border border-[#e5e7eb] bg-white/70 px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#dc2626] focus:ring-2 focus:ring-[#dc2626]/20 dark:border-gray-700 dark:bg-gray-900/60';

  return (
    <div className="rounded-[14px] border border-white/40 bg-white/40 p-[14px] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-[11px]">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#f87171] to-[#dc2626] text-white shadow-[0_5px_14px_rgba(220,38,38,.35)]">
            <Trash2 size={17} />
          </span>
          <div>
            <div className="font-bold text-[#111827] dark:text-white">{t('cl7_delete_account.title')}</div>
            <div className="text-[12px] text-[#9ca3af]">{t('cl7_delete_account.subtitle')}</div>
          </div>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-shrink-0 rounded-[10px] border border-[#e5e7eb] bg-white/60 px-4 py-2 text-[12.5px] font-bold text-[#dc2626] transition hover:border-[#dc2626] dark:border-gray-700 dark:bg-white/5"
          >
            {t('cl7_delete_account.open_button')}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2.5 rounded-[10px] border border-[#fecaca] bg-[#fef2f2]/80 p-3 text-[12.5px] leading-relaxed text-[#991b1b] dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-bold">{t('cl7_delete_account.warning_title')}</div>
              <div>{t('cl7_delete_account.warning_body')}</div>
            </div>
          </div>

          {needsPassword ? (
            <input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              type="password"
              autoComplete="off"
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              placeholder={t('cl7_delete_account.password_placeholder')}
              className={inputCls}
            />
          ) : (
            <div className="space-y-1.5">
              <div className="text-[12px] text-[#6b7280] dark:text-gray-400">
                {t('cl7_delete_account.confirm_label', { word: CONFIRM_WORD })}
              </div>
              <input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder={CONFIRM_WORD}
                className={inputCls}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || deleting}
              className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#f87171] to-[#dc2626] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_8px_20px_rgba(220,38,38,.3)] transition hover:brightness-105 disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? t('cl7_delete_account.deleting') : t('cl7_delete_account.confirm_button')}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-[10px] px-3 py-2.5 text-[12.5px] font-bold text-[#9ca3af] transition hover:text-[#4b5563]"
            >
              {t('cl7_delete_account.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
