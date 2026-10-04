// frontend/src/features/vendors/v2/compte/croissance/ServicesPage.tsx
// Écran "Les services qui lèvent les freins" — VD-10 §SER, Fig.10.
//
// Catalogue de services payants d'accompagnement vendeur. Les prix affichés
// (3 000 F / 1 000 F / 5 000 F) sont ceux du document source VD-10 — des
// constantes canoniques, jamais fabriquées.
//
// MANQUE BACKEND : aucun modèle "demande de service / agent" n'existe côté
// backend (aucune trace dans backend/apps/vendors). Les CTA "Photos par un
// agent" et "Fiche prioritaire" ouvrent donc une feuille de confirmation
// honnête (même motif que SeFaireVoirPage : visibility_not_wired) plutôt que
// de simuler un envoi réussi — avec un relais WhatsApp support réel pour que
// le vendeur puisse quand même passer sa demande dès maintenant.
// "Saisie assistée" pointe vers l'écran déjà câblé (v2/saisie-assistee), lui,
// bien réel.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Camera, FileText, Users, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';
import { buildWhatsAppSupportLink } from '../shared/format';

type ServiceKey = 'photos' | 'sheet';

export default function ServicesPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const p = palette(theme);
  const [confirm, setConfirm] = useState<ServiceKey | null>(null);

  const confirmTitleKey = confirm === 'photos' ? 'sl14_croissance.services_photos_title' : 'sl14_croissance.services_sheet_title';
  const confirmPrice = confirm === 'photos' ? t('sl14_croissance.services_photos_price') : t('sl14_croissance.services_sheet_price');

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl14_croissance.services_title')} subtitle={t('sl14_croissance.services_subtitle')} />

      {/* Service mis en avant — photos par un agent (Fig.10, encart principal). */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1.5px solid ${p.orange}55` }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.orange}1A` }}>
            <Camera size={18} color={p.orange} />
          </div>
          <div className="min-w-0">
            <p className="font-bold" style={{ fontSize: 14.5, color: p.text }}>{t('sl14_croissance.services_photos_title')}</p>
            <p className="font-bold" style={{ fontSize: 13, color: p.orange }}>{t('sl14_croissance.services_photos_price')}</p>
          </div>
        </div>
        <p className="mt-2" style={{ fontSize: 12, color: p.textMuted }}>{t('sl14_croissance.services_photos_desc')}</p>
        <button
          type="button"
          onClick={() => setConfirm('photos')}
          className="w-full rounded-xl font-bold text-white mt-3 active:scale-[0.99] transition-transform"
          style={{ padding: '11px', background: p.orange, fontSize: 13 }}
        >
          {t('sl14_croissance.services_photos_cta')}
        </button>
      </div>

      {/* Autres services (Fig.10, liste). */}
      <p className="font-black uppercase mb-2 px-1" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
        {t('sl14_croissance.services_others_title')}
      </p>
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <button
          type="button"
          onClick={() => setConfirm('sheet')}
          className="w-full flex items-start gap-3 text-left"
          style={{ padding: '13px 14px' }}
        >
          <FileText size={18} color={p.orange} style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="min-w-0">
            <p className="font-semibold" style={{ fontSize: 13, color: p.text }}>
              {t('sl14_croissance.services_sheet_title')} · {t('sl14_croissance.services_sheet_price')}
            </p>
            <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl14_croissance.services_sheet_desc')}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate('/seller/v2/saisie-assistee')}
          className="w-full flex items-start gap-3 text-left"
          style={{ padding: '13px 14px', borderTop: `1px solid ${p.border}` }}
        >
          <Users size={18} color={p.orange} style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="min-w-0">
            <p className="font-semibold" style={{ fontSize: 13, color: p.text }}>{t('sl14_croissance.services_assisted_title')}</p>
            <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl14_croissance.services_assisted_desc')}</p>
          </div>
        </button>
      </div>

      <Collapsible title={t('sl14_croissance.how_it_works')}>
        <p>{t('sl14_croissance.services_how')}</p>
      </Collapsible>

      {confirm ? (
        <div
          className="fixed inset-0 z-[900] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl p-5"
            style={{ background: p.card, border: `1px solid ${p.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-black mb-1" style={{ fontSize: 15, color: p.text }}>{t(confirmTitleKey)}</p>
            <p className="mb-3" style={{ fontSize: 12, color: p.textMuted }}>
              {t('sl14_croissance.services_confirm_desc', { price: confirmPrice })}
            </p>
            <div className="flex items-start gap-2 rounded-xl p-3 mb-3" style={{ background: p.cardAlt }}>
              <AlertTriangle size={15} color={p.amber} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl14_croissance.services_not_wired')}</p>
            </div>
            <a
              href={buildWhatsAppSupportLink(t('sl14_croissance.services_whatsapp_message', { service: t(confirmTitleKey) }))}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center rounded-xl font-bold text-white mb-2"
              style={{ padding: '12px', background: p.orange, fontSize: 13 }}
            >
              {t('sl14_croissance.services_whatsapp_cta')}
            </a>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="w-full rounded-xl font-bold"
              style={{ padding: '12px', border: `1.5px solid ${p.border}`, color: p.text, fontSize: 13 }}
            >
              {t('sl14_croissance.close')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
