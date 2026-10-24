// frontend/src/features/admin/system/SupportPage.tsx
// Support & tickets — BelivaY Admin (D24)
// Liste des fils du support à gauche, fil choisi à droite, réponse et clôture.
// Les numéros, e-mails et liens sont masqués par le serveur.

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  HeadphonesIcon, RefreshCw, Send, CheckCircle, RotateCcw,
  Clock, Image as ImageIcon, User, MessageSquare,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Fil {
  id:             number;
  client:         string;
  client_id:      number;
  titre:          string;
  resolue:        boolean;
  maj:            string | null;
  sans_reponse:   number;
  attente_depuis: string | null;
  dernier:        string;
}

interface Message {
  de:    'moi' | 'eux' | 'systeme' | 'photo';
  qui:   string;
  texte: string;
  photo: boolean;
  le:    string | null;
}

interface FilDetail extends Fil {
  messages: Message[];
}

interface ListeResponse {
  fils:      Fil[];
  a_traiter: number;
}

type Etat = 'a_traiter' | 'resolus' | 'tous';

const ETATS: Etat[] = ['a_traiter', 'resolus', 'tous'];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

function useDepuis() {
  const { t } = useTranslation();
  return (d: string | null) => {
    if (!d) return '';
    const min = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
    if (min < 60)   return t('ad7_d24_support.since_min', { n: min });
    const h = Math.round(min / 60);
    if (h < 48)     return t('ad7_d24_support.since_hours', { n: h });
    return t('ad7_d24_support.since_days', { n: Math.round(h / 24) });
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const T             = useAdminTheme();
  const { t }         = useTranslation();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });
  const depuis        = useDepuis();

  const [etat,      setEtat]      = useState<Etat>('a_traiter');
  const [liste,     setListe]     = useState<ListeResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<number | null>(null);
  const [fil,       setFil]       = useState<FilDetail | null>(null);
  const [filLoad,   setFilLoad]   = useState(false);
  const [reponse,   setReponse]   = useState('');
  const [sending,   setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadListe = useCallback(async () => {
    setLoading(true);
    try {
      const data = await http<ListeResponse>(`/api/auth/admin/support/?etat=${etat}`);
      setListe(data);
    } catch {
      toastRef.current(t('ad7_d24_support.toast_error_load'), 'error');
    } finally {
      setLoading(false);
    }
  }, [etat, t]);

  useEffect(() => { loadListe(); }, [loadListe]);

  const loadFil = useCallback(async (id: number) => {
    setFilLoad(true);
    try {
      const data = await http<FilDetail>(`/api/auth/admin/support/${id}/`);
      setFil(data);
    } catch {
      toastRef.current(t('ad7_d24_support.toast_error_thread'), 'error');
      setFil(null);
    } finally {
      setFilLoad(false);
    }
  }, [t]);

  useEffect(() => {
    if (selected !== null) loadFil(selected);
    else setFil(null);
  }, [selected, loadFil]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [fil?.messages.length]);

  const post = async (body: { texte?: string; resolue?: boolean }, okMsg: string) => {
    if (!fil) return;
    setSending(true);
    try {
      const data = await http<FilDetail>(`/api/auth/admin/support/${fil.id}/`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setFil(data);
      toastRef.current(okMsg, 'success');
      loadListe();
      return true;
    } catch (e) {
      toastRef.current(e instanceof Error ? e.message : t('ad7_d24_support.toast_error_send'), 'error');
      return false;
    } finally {
      setSending(false);
    }
  };

  const envoyer = async () => {
    const texte = reponse.trim();
    if (!texte) return;
    if (await post({ texte }, t('ad7_d24_support.toast_sent'))) setReponse('');
  };

  const basculer = () => {
    if (!fil) return;
    post({ resolue: !fil.resolue }, fil.resolue ? t('ad7_d24_support.toast_reopened') : t('ad7_d24_support.toast_closed'));
  };

  const etatLabel: Record<Etat, string> = {
    a_traiter: t('ad7_d24_support.filter_todo'),
    resolus:   t('ad7_d24_support.filter_resolved'),
    tous:      t('ad7_d24_support.filter_all'),
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            {t('ad7_d24_support.title')}
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {liste ? t('ad7_d24_support.subtitle', { n: liste.a_traiter }) : '—'} · {t('ad7_d24_support.masked_note')}
          </p>
        </div>
        <button onClick={() => { loadListe(); if (selected !== null) loadFil(selected); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)', cursor: 'pointer' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {t('ad7_d24_support.refresh')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Liste des fils */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden flex flex-col" style={{ background: T.card, border: `1px solid ${T.border}`, minHeight: 480 }}>
          <div className="flex items-center gap-2 p-3 flex-wrap" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
            {ETATS.map(e => {
              const active = etat === e;
              return (
                <button key={e} onClick={() => { setEtat(e); setSelected(null); }}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: active ? T.red + '18' : T.card, color: active ? T.red : T.muted, border: `1px solid ${active ? T.red + '40' : T.border}` }}>
                  {etatLabel[e]}
                  {e === 'a_traiter' && liste && etat === 'a_traiter' && liste.a_traiter > 0 && (
                    <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 5, background: T.red, color: '#fff' }}>{liste.a_traiter}</span>
                  )}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : !liste || liste.fils.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-3">
              <HeadphonesIcon size={30} style={{ color: T.muted }} />
              <p style={{ fontSize: 13.5, color: T.muted }}>{t('ad7_d24_support.empty_list')}</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: 640 }}>
              {liste.fils.map(f => {
                const active = selected === f.id;
                return (
                  <button key={f.id} onClick={() => setSelected(f.id)}
                    className="w-full text-left px-4 py-3"
                    style={{ display: 'block', borderBottom: `1px solid ${T.border}`, background: active ? T.red + '10' : 'transparent', borderLeft: `3px solid ${active ? T.red : 'transparent'}`, cursor: 'pointer' }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="truncate" style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{f.client}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {f.sans_reponse > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 5, background: T.red, color: '#fff' }}>
                            {f.sans_reponse}
                          </span>
                        )}
                        {f.resolue && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: T.greenL, color: T.green }}>
                            {t('ad7_d24_support.resolved_badge')}
                          </span>
                        )}
                      </div>
                    </div>
                    {f.titre && <p className="truncate" style={{ fontSize: 12, fontWeight: 600, color: T.text, opacity: 0.85 }}>{f.titre}</p>}
                    <p className="truncate" style={{ fontSize: 12, color: T.muted }}>{f.dernier || '—'}</p>
                    <p className="flex items-center gap-1 mt-1" style={{ fontSize: 10.5, color: f.sans_reponse > 0 ? T.amber : T.mutedL }}>
                      <Clock size={10} />
                      {f.sans_reponse > 0 && f.attente_depuis
                        ? t('ad7_d24_support.waiting_since', { since: depuis(f.attente_depuis) })
                        : fmtDateTime(f.maj)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Fil choisi */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden flex flex-col" style={{ background: T.card, border: `1px solid ${T.border}`, minHeight: 480 }}>
          {selected === null ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 py-14">
              <MessageSquare size={30} style={{ color: T.muted }} />
              <p style={{ fontSize: 13.5, color: T.muted }}>{t('ad7_d24_support.pick_thread')}</p>
            </div>
          ) : filLoad && !fil ? (
            <div className="flex items-center justify-center flex-1 py-16">
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : !fil ? (
            <div className="flex items-center justify-center flex-1 py-14">
              <p style={{ fontSize: 13.5, color: T.muted }}>{t('ad7_d24_support.toast_error_thread')}</p>
            </div>
          ) : (
            <>
              {/* En-tête du fil */}
              <div className="flex items-center justify-between gap-3 px-5 py-3 flex-wrap" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 800, color: T.text }}>
                    <User size={13} />
                    <Link to={`/admin/users/${fil.client_id}`} style={{ color: T.text }}>{fil.client}</Link>
                  </p>
                  {fil.titre && <p className="truncate" style={{ fontSize: 12, color: T.muted }}>{fil.titre}</p>}
                </div>
                <button onClick={basculer} disabled={sending}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', background: fil.resolue ? T.amberL : T.greenL, color: fil.resolue ? T.amber : T.green, border: `1px solid ${fil.resolue ? T.amber : T.green}40` }}>
                  {fil.resolue ? <><RotateCcw size={12} /> {t('ad7_d24_support.reopen')}</> : <><CheckCircle size={12} /> {t('ad7_d24_support.close')}</>}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 520 }}>
                {fil.messages.length === 0 && (
                  <p style={{ fontSize: 13, color: T.muted, textAlign: 'center' }}>{t('ad7_d24_support.no_messages')}</p>
                )}
                {fil.messages.map((m, i) => {
                  if (m.de === 'systeme') {
                    return (
                      <p key={i} style={{ fontSize: 11.5, color: T.muted, textAlign: 'center', fontStyle: 'italic' }}>
                        {m.texte} · {fmtDateTime(m.le)}
                      </p>
                    );
                  }
                  const support = m.de === 'eux';
                  return (
                    <div key={i} className={`flex ${support ? 'justify-end' : 'justify-start'}`}>
                      <div style={{ maxWidth: '78%', padding: '8px 12px', borderRadius: 14, background: support ? T.red + '14' : T.cardAlt, border: `1px solid ${support ? T.red + '30' : T.border}` }}>
                        <p style={{ fontSize: 10.5, fontWeight: 700, color: support ? T.red : T.muted, marginBottom: 2 }}>
                          {m.qui || (support ? t('ad7_d24_support.from_support') : t('ad7_d24_support.from_client'))}
                        </p>
                        {(m.photo || m.de === 'photo') && (
                          <p className="flex items-center gap-1" style={{ fontSize: 12, color: T.muted, marginBottom: m.texte ? 4 : 0 }}>
                            <ImageIcon size={12} /> {t('ad7_d24_support.photo_attached')}
                          </p>
                        )}
                        {m.texte && <p style={{ fontSize: 13, color: T.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.texte}</p>}
                        <p style={{ fontSize: 10, color: T.mutedL, marginTop: 4, textAlign: 'right' }}>{fmtDateTime(m.le)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Réponse */}
              <div className="p-4 flex items-end gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
                <textarea value={reponse} onChange={e => setReponse(e.target.value)} rows={2}
                  placeholder={t('ad7_d24_support.reply_placeholder')}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) envoyer(); }}
                  style={{ flex: 1, resize: 'vertical', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                <button onClick={envoyer} disabled={sending || !reponse.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: T.red, color: '#fff', border: 'none', cursor: sending || !reponse.trim() ? 'not-allowed' : 'pointer', opacity: sending || !reponse.trim() ? 0.5 : 1 }}>
                  <Send size={13} /> {t('ad7_d24_support.send')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
