// frontend/src/features/profile/SessionsCard.tsx
// Appareils connectés — API réelle /api/auth/sessions/ (liste + révocation).

import { useCallback, useEffect, useState } from 'react';
import { Monitor, Smartphone, Clock, Globe, Loader2, Shield } from 'lucide-react';
import { http } from '@/services/api/http';
import { useToast } from '@/context/ToastContext';

type Session = {
  jti: string;
  device_name: string | null;
  browser: string | null;
  os_name: string | null;
  ip_address: string | null;
  created_at: string;
  last_activity: string;
  is_current: boolean;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

export default function SessionsCard() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await http<Session[]>('/api/auth/sessions/');
      setSessions(data);
    } catch {
      /* silencieux */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (jti: string) => {
    try {
      setBusy(jti);
      await http(`/api/auth/sessions/${jti}/revoke/`, { method: 'DELETE' });
      showToast('Session révoquée.', 'success');
      load();
    } catch {
      showToast('Erreur lors de la révocation.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const revokeAll = async () => {
    try {
      setBusy('all');
      await http('/api/auth/sessions/revoke-all/', { method: 'POST' });
      showToast('Autres sessions révoquées.', 'success');
      load();
    } catch {
      showToast('Erreur.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const others = sessions.filter((s) => !s.is_current).length;

  return (
    <div className="rounded-[14px] border border-white/40 bg-white/40 p-[14px] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-[11px]">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ff9d4d] to-[#f4610f] text-white shadow-[0_5px_14px_rgba(244,97,15,.35)]">
            <Shield size={17} />
          </span>
          <div>
            <div className="font-bold text-[#111827] dark:text-white">Appareils connectés</div>
            <div className="text-[12px] text-[#9ca3af]">Sessions actives sur votre compte.</div>
          </div>
        </div>
        {others > 0 && (
          <button
            type="button"
            onClick={revokeAll}
            disabled={busy === 'all'}
            className="flex-shrink-0 rounded-[10px] border border-[#fecaca] px-3 py-2 text-[12px] font-bold text-[#dc2626] transition hover:bg-red-50 disabled:opacity-50"
          >
            {busy === 'all' ? '…' : 'Tout déconnecter'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-[13px] text-[#9ca3af]">
          <Loader2 size={15} className="animate-spin" />
          Chargement…
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-3 text-[13px] text-[#9ca3af]">Aucune session active.</div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const isMobile = /mobile|android|iphone|ipad/i.test(`${s.device_name || ''} ${s.os_name || ''}`);
            const Icon = isMobile ? Smartphone : Monitor;
            return (
              <div
                key={s.jti}
                className={`flex items-center gap-3 rounded-[12px] border p-3 ${s.is_current ? 'border-[#f47920] bg-[#fff9f4] dark:border-orange-800 dark:bg-orange-950/20' : 'border-[#e5e7eb] dark:border-gray-700'}`}
              >
                <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] ${s.is_current ? 'bg-[#f47920] text-white' : 'bg-[#f3f4f6] text-[#6b7280] dark:bg-gray-800'}`}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-bold text-[#111827] dark:text-white">
                      {s.device_name || 'Appareil'} · {s.browser || '—'}
                    </span>
                    {s.is_current && (
                      <span className="rounded-full bg-[#f47920] px-2 py-0.5 text-[10px] font-bold text-white">Cet appareil</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[11.5px] text-[#9ca3af]">
                    {s.ip_address && (
                      <span className="inline-flex items-center gap-1"><Globe size={10} />{s.ip_address}</span>
                    )}
                    <span className="inline-flex items-center gap-1"><Clock size={10} />{timeAgo(s.last_activity)}</span>
                  </div>
                </div>
                {!s.is_current && (
                  <button
                    type="button"
                    onClick={() => revoke(s.jti)}
                    disabled={busy === s.jti}
                    className="flex-shrink-0 rounded-[9px] border border-[#fecaca] px-2.5 py-1.5 text-[11.5px] font-bold text-[#dc2626] transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy === s.jti ? '…' : 'Révoquer'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}