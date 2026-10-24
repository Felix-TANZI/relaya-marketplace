// frontend/src/features/admin/d24/KycPiecesPage.tsx
// File des pièces vendeur — BelivaY Admin (feuilles de route D19 et D24) : une décision par pièce (CNI recto,
// verso, selfie vidéo), motif obligatoire pour un refus, réponse sous 48 h ouvrées.
// Une pièce ne s'ouvre jamais par un lien public : elle est lue avec le jeton de l'admin, puis montrée localement.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Check, Eye, X } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';
import { EnTete, Section, dateCourte } from './ui';

interface Piece {
  id: number; type: string; libelle: string; statut: 'PENDING' | 'APPROVED' | 'REJECTED'; motif: string;
  vendeur: string; vendeur_id: number | null; user_id: number; depose: string | null; maj: string | null;
  echeance: string | null; en_retard: boolean; fichier: string | null; video: boolean;
}

const FILTRES = [['PENDING', 'filter_pending'], ['APPROVED', 'filter_approved'], ['REJECTED', 'filter_rejected'], ['tous', 'filter_all']] as const;

export default function KycPiecesPage() {
  const { t } = useTranslation();
  const T = useAdminTheme();
  const { showToast } = useToast();
  const toast = useRef(showToast);
  useEffect(() => { toast.current = showToast; });
  const k = (cle: string, opts?: Record<string, unknown>) => t(`ad7_d24_kyc.${cle}`, opts);

  const [filtre, setFiltre] = useState<string>('PENDING');
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [retards, setRetards] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [apercu, setApercu] = useState<{ url: string; video: boolean } | null>(null);
  const [motifs, setMotifs] = useState<Record<number, string>>({});

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const data = await http<{ pieces: Piece[]; en_retard: number }>(`/api/auth/admin/kyc/pieces/?statut=${filtre}`);
      setPieces(data.pieces);
      setRetards(data.en_retard);
    } catch {
      toast.current(t('ad7_d24_kyc.toast_error_load'), 'error');
    } finally {
      setChargement(false);
    }
  }, [filtre, t]);
  useEffect(() => { void charger(); }, [charger]);
  useEffect(() => () => { if (apercu) URL.revokeObjectURL(apercu.url); }, [apercu]);

  const parVendeur = useMemo(() => {
    const groupes = new Map<string, Piece[]>();
    pieces.forEach((p) => groupes.set(p.vendeur, [...(groupes.get(p.vendeur) || []), p]));
    return [...groupes.entries()];
  }, [pieces]);

  const ouvrir = async (p: Piece) => {
    if (!p.fichier) return;
    try {
      const reponse = await fetch(p.fichier, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` } });
      if (!reponse.ok) throw new Error(String(reponse.status));
      setApercu({ url: URL.createObjectURL(await reponse.blob()), video: p.video });
    } catch {
      toast.current(t('ad7_d24_kyc.toast_error_file'), 'error');
    }
  };

  const decider = async (p: Piece, decision: 'APPROVED' | 'REJECTED') => {
    const motif = (motifs[p.id] || '').trim();
    if (decision === 'REJECTED' && !motif) {
      toast.current(t('ad7_d24_kyc.reason_required'), 'error');
      return;
    }
    try {
      await http(`/api/auth/admin/kyc/pieces/${p.id}/`, { method: 'POST', body: JSON.stringify({ decision, motif }) });
      toast.current(t(decision === 'APPROVED' ? 'ad7_d24_kyc.toast_approved' : 'ad7_d24_kyc.toast_rejected'), 'success');
      void charger();
    } catch {
      toast.current(t('ad7_d24_kyc.toast_error_decision'), 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <EnTete icon={BadgeCheck} titre={k('title')} sousTitre={k('subtitle')} onRefresh={() => void charger()} chargement={chargement} />
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {FILTRES.map(([valeur, cle]) => (
          <button key={valeur} onClick={() => setFiltre(valeur)} className="px-3 py-1.5 rounded-xl text-sm font-bold"
            style={{ background: filtre === valeur ? T.red : T.card, color: filtre === valeur ? '#fff' : T.text, border: `1px solid ${T.border}` }}>
            {k(cle)}
          </button>
        ))}
        {retards > 0 ? <span className="text-sm font-black" style={{ color: T.red }}>{k('late_count', { n: retards })}</span> : null}
      </div>

      {parVendeur.length === 0 && !chargement ? <p className="text-sm" style={{ color: T.muted }}>{k('empty')}</p> : null}
      {parVendeur.map(([vendeur, liste]) => (
        <Section key={vendeur} titre={vendeur}>
          <div className="divide-y" style={{ borderColor: T.border }}>
            {liste.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-[180px] flex-1">
                  <div className="font-bold" style={{ color: T.text }}>{p.libelle}</div>
                  <div className="text-xs" style={{ color: p.en_retard ? T.red : T.muted }}>
                    {k(`st_${p.statut}`)} · {p.en_retard ? k('late') : k('due', { date: dateCourte(p.echeance) })}
                    {p.motif ? ` · ${p.motif}` : ''}
                  </div>
                </div>
                <button onClick={() => void ouvrir(p)} disabled={!p.fichier}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
                  style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}` }}>
                  <Eye size={14} /> {k('open')}
                </button>
                {p.statut === 'PENDING' ? (
                  <>
                    <input value={motifs[p.id] || ''} onChange={(e) => setMotifs((m) => ({ ...m, [p.id]: e.target.value }))}
                      placeholder={k('reason_placeholder')} className="px-3 py-1.5 rounded-xl text-sm min-w-[220px]"
                      style={{ background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text }} />
                    <button onClick={() => void decider(p, 'APPROVED')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
                      style={{ background: T.green, color: '#fff' }}>
                      <Check size={14} /> {k('approve')}
                    </button>
                    <button onClick={() => void decider(p, 'REJECTED')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
                      style={{ background: T.red, color: '#fff' }}>
                      <X size={14} /> {k('reject')}
                    </button>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ))}

      {apercu ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.7)' }}
          onClick={() => setApercu(null)}>
          {apercu.video
            ? <video src={apercu.url} controls className="max-h-[85vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
            : <img src={apercu.url} alt="" className="max-h-[85vh] max-w-full rounded-xl" />}
        </div>
      ) : null}
    </div>
  );
}
