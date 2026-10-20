// frontend/src/features/profile/PasswordCard.tsx
// Carte "Mot de passe" — changement réel via /api/auth/change-password/.
// Aucune révélation du mot de passe (les champs restent masqués) pour raison de sécurité.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Lock, ShieldCheck } from 'lucide-react';
import { http } from '@/services/api/http';
import { useToast } from '@/context/ToastContext';

function scorePassword(pw: string, t: TFunction): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const s = Math.min(Math.max(score - 1, 0), 3);
  const labels = [
    t('cl7_password_card.strength_weak'),
    t('cl7_password_card.strength_medium'),
    t('cl7_password_card.strength_good'),
    t('cl7_password_card.strength_excellent'),
  ];
  const colors = ['#dc2626', '#f59e0b', '#16a34a', '#16a34a'];
  return { score: s, label: labels[s], color: colors[s] };
}

export default function PasswordCard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [saving, setSaving] = useState(false);

  const strength = useMemo(() => scorePassword(newPwd, t), [newPwd, t]);

  const reset = () => {
    setOldPwd('');
    setNewPwd('');
    setNewPwd2('');
  };

  const submit = async () => {
    if (!oldPwd || !newPwd || !newPwd2) {
      showToast(t('cl7_password_card.fill_fields_error'), 'error');
      return;
    }
    if (newPwd !== newPwd2) {
      showToast(t('cl7_password_card.mismatch_error'), 'error');
      return;
    }
    if (newPwd.length < 8) {
      showToast(t('cl7_password_card.min_length_error'), 'error');
      return;
    }
    setSaving(true);
    try {
      await http('/api/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({ old_password: oldPwd, new_password: newPwd, new_password2: newPwd2 }),
      });
      showToast(t('cl7_password_card.success'), 'success');
      reset();
      setOpen(false);
    } catch {
      showToast(t('cl7_password_card.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-[10px] border border-[#e5e7eb] bg-white/70 px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#f47920] focus:ring-2 focus:ring-[#f47920]/20 dark:border-gray-700 dark:bg-gray-900/60';

  return (
    <div className="rounded-[14px] border border-white/40 bg-white/40 p-[14px] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-[11px]">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ff9d4d] to-[#f4610f] text-white shadow-[0_5px_14px_rgba(244,97,15,.35)]">
            <Lock size={17} />
          </span>
          <div>
            <div className="font-bold text-[#111827] dark:text-white">{t('cl7_password_card.title')}</div>
            <div className="text-[12px] text-[#9ca3af]">{t('cl7_password_card.subtitle')}</div>
          </div>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-shrink-0 rounded-[10px] border border-[#e5e7eb] bg-white/60 px-4 py-2 text-[12.5px] font-bold text-[#4b5563] transition hover:border-[#f47920] hover:text-[#f47920] dark:border-gray-700 dark:bg-white/5 dark:text-gray-300"
          >
            {t('cl7_password_card.edit_button')}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <input
            value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)}
            type="password"
            autoComplete="off"
            readOnly
            onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
            placeholder={t('cl7_password_card.current_password_placeholder')}
            className={inputCls}
          />

          <input
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            type="password"
            autoComplete="off"
            readOnly
            onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
            placeholder={t('cl7_password_card.new_password_placeholder')}
            className={inputCls}
          />

          {newPwd && (
            <div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-colors"
                    style={{ background: i <= strength.score ? strength.color : '#e5e7eb' }}
                  />
                ))}
              </div>
              <div className="mt-1.5 text-[11px] font-semibold" style={{ color: strength.color }}>
                {strength.label}
              </div>
            </div>
          )}

          <input
            value={newPwd2}
            onChange={(e) => setNewPwd2(e.target.value)}
            type="password"
            autoComplete="off"
            readOnly
            onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
            placeholder={t('cl7_password_card.confirm_password_placeholder')}
            className={inputCls}
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#ff9d4d] to-[#f4610f] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_8px_20px_rgba(244,97,15,.34)] transition hover:brightness-105 disabled:opacity-50"
            >
              <ShieldCheck size={14} />
              {saving ? t('cl7_password_card.saving') : t('cl7_password_card.update_button')}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="rounded-[10px] px-3 py-2.5 text-[12.5px] font-bold text-[#9ca3af] transition hover:text-[#4b5563]"
            >
              {t('cl7_password_card.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
