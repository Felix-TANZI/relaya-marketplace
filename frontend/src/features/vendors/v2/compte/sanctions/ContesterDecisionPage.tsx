// frontend/src/features/vendors/v2/compte/sanctions/ContesterDecisionPage.tsx
// Écran "Contester une décision" — VD-10 §CON, Fig.5.
// Contester une sanction/descente, une seule fois (CON-01), réponse humaine
// sous 72 h ouvrées.
//
// Pas de pont API listé (POST /score/appeal n'est pas dans vendorsApi) : l'envoi
// est simulé côté client. On ne prétend JAMAIS qu'une contestation a été reçue
// par le serveur — le message de confirmation dit explicitement que l'envoi
// réel sera branché plus tard. Le verrou "une seule fois" (CON-01) est appliqué
// localement (localStorage) comme garde-fou UX ; l'application réelle devra être
// faite côté serveur.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'react-router-dom';
import { Paperclip, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';

interface DecisionState {
  kind?: string;
  date?: string;
  reason?: string;
}

export default function ContesterDecisionPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const decision = (location.state as DecisionState) || {};

  const storageKey = id ? `belivay-appeal-sent-${id}` : null;
  const [alreadySent] = useState(() => (storageKey ? localStorage.getItem(storageKey) === '1' : false));
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sent, setSent] = useState(false);

  const canSend = text.trim().length > 0 && !alreadySent && !sent;

  const handleSend = () => {
    if (!canSend) return;
    if (storageKey) localStorage.setItem(storageKey, '1');
    setSent(true);
  };

  if (!id) {
    return (
      <div className="pb-24 pt-2">
        <ScreenHeader title={t('sl11_compte.contest_title')} />
        <div className="rounded-2xl p-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
          <p style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl11_compte.contest_no_decision')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.contest_title')} />

      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-1" style={{ fontSize: 13.5, color: p.text }}>{t('sl11_compte.contest_decision_title')}</p>
        <p style={{ fontSize: 12, color: p.textMuted }}>{decision.kind || t('sl11_compte.contest_decision_unknown')}</p>
        {decision.date ? <p style={{ fontSize: 11.5, color: p.textMuted }}>{decision.date}</p> : null}
        {decision.reason ? <p style={{ fontSize: 11.5, color: p.textMuted }}>{decision.reason}</p> : null}
      </div>

      {alreadySent || sent ? (
        <div className="rounded-2xl p-4" style={{ background: `${p.green}1A`, border: `1px solid ${p.green}55` }}>
          <p className="font-bold" style={{ fontSize: 13, color: p.green }}>{t('sl11_compte.contest_sent_title')}</p>
          <p style={{ fontSize: 12, color: p.text }}>{t('sl11_compte.contest_sent_body')}</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
            <p className="font-bold mb-2" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.contest_explain_label')}</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('sl11_compte.contest_explain_placeholder')}
              rows={4}
              className="w-full rounded-xl p-3 resize-none"
              style={{ background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text, fontSize: 13 }}
            />
          </div>

          <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
            <p className="font-bold mb-2" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.contest_evidence_label')}</p>
            <label
              className="flex items-center justify-center gap-2 rounded-xl cursor-pointer"
              style={{ padding: '12px', border: `1.5px dashed ${p.border}`, color: p.textMuted, fontSize: 12.5 }}
            >
              <Paperclip size={15} />
              {t('sl11_compte.contest_evidence_add')}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
              />
            </label>
            {files.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between" style={{ fontSize: 11.5, color: p.text }}>
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                      <X size={13} color={p.textMuted} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className="w-full rounded-2xl font-bold text-white"
            style={{ padding: '13px', fontSize: 13.5, background: canSend ? p.orange : p.border, opacity: canSend ? 1 : 0.7 }}
          >
            {t('sl11_compte.contest_send_cta')}
          </button>
          <p className="mt-2 text-center" style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl11_compte.contest_once_note')}</p>
        </>
      )}
    </div>
  );
}
