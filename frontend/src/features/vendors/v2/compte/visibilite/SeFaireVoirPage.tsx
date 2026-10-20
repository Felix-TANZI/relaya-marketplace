// frontend/src/features/vendors/v2/compte/visibilite/SeFaireVoirPage.tsx
// Écran "Se faire voir" — VD-10 §VIS, Fig.9.
// Catalogue de visibilité payante, TOUJOURS étiqueté "Sponsorisé" — jamais
// "Boost Buy Box" (VIS-01/A4 : « l'attribution ne s'achète pas », explicitement
// rejeté et à ne jamais implémenter).
//
// Tarifs repris tels quels du document VD-10 (constantes canoniques, pas de
// données fabriquées). Pas de pont API listé (POST /visibility) : le paiement
// n'est pas branché, la feuille de confirmation se termine par un message
// honnête plutôt qu'un faux succès de paiement.
//
// La vente flash est masquée tant que le feature-flag FF-FLASH est fermé au
// lancement (VD-D11.A25, question ouverte Q06) — jamais affichée par défaut.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';

// VD-D11.A25 : vente flash offerte masquée tant que FF-FLASH est fermé.
const FLASH_SALES_ENABLED = false;

interface VisibilityItem {
  key: string;
  price: string;
}

const CATALOG: VisibilityItem[] = [
  { key: 'feature_24h', price: '500 F' },
  { key: 'category_boost_7d', price: '2 000 F' },
  { key: 'neighborhood_showcase_7d', price: '1 500 F' },
  { key: 'result_boost', price: '0 F' },
  { key: 'favorites_campaign', price: '25 F' },
];

export default function SeFaireVoirPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const [confirmItem, setConfirmItem] = useState<VisibilityItem | null>(null);

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.visibility_title')} />

      {FLASH_SALES_ENABLED ? (
        <div className="rounded-2xl p-4 mb-4" style={{ background: `${p.green}1A`, border: `1px solid ${p.green}55` }}>
          <p className="font-bold" style={{ fontSize: 13, color: p.green }}>{t('sl11_compte.visibility_free_this_month')}</p>
        </div>
      ) : null}

      {/* Mise en avant 24h — mis en avant, bouton plein */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold" style={{ fontSize: 14, color: p.text }}>{t('sl11_compte.visibility_feature_24h_title')}</p>
          <span className="px-2 py-0.5 rounded-full font-bold" style={{ fontSize: 9.5, background: `${p.amber}22`, color: p.amber }}>
            {t('sl11_compte.visibility_sponsored_badge')}
          </span>
        </div>
        <p className="mb-3" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.visibility_feature_24h_desc')}</p>
        <button
          type="button"
          onClick={() => setConfirmItem(CATALOG[0])}
          className="w-full rounded-xl font-bold text-white"
          style={{ padding: '11px', background: p.orange, fontSize: 13 }}
        >
          {t('sl11_compte.visibility_feature_24h_cta', { price: CATALOG[0].price })}
        </button>
      </div>

      {/* Autres emplacements */}
      <div className="mb-4">
        <p className="font-black uppercase mb-2 px-1" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
          {t('sl11_compte.visibility_others_title')}
        </p>
        <div className="rounded-2xl overflow-hidden" style={{ background: p.card, border: `1px solid ${p.border}` }}>
          {CATALOG.slice(1).map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setConfirmItem(item)}
              className="w-full flex items-center justify-between text-left"
              style={{ padding: '13px 14px', borderTop: i > 0 ? `1px solid ${p.border}` : undefined }}
            >
              <div className="min-w-0">
                <p className="font-semibold" style={{ fontSize: 13, color: p.text }}>{t(`sl11_compte.visibility_${item.key}_title`)}</p>
                <p style={{ fontSize: 11, color: p.textMuted }}>{t(`sl11_compte.visibility_${item.key}_desc`)}</p>
              </div>
              <span className="font-bold flex-shrink-0 ml-2" style={{ fontSize: 12.5, color: p.text }}>{item.price}</span>
            </button>
          ))}
        </div>
      </div>

      <Collapsible title={t('sl11_compte.how_it_works')}>
        <p>{t('sl11_compte.visibility_how')}</p>
      </Collapsible>

      <Collapsible title={t('sl11_compte.visibility_guardrails_title')}>
        <p className="mb-1">{t('sl11_compte.visibility_guardrail_1')}</p>
        <p className="mb-1">{t('sl11_compte.visibility_guardrail_2')}</p>
        <p className="mb-1">{t('sl11_compte.visibility_guardrail_3')}</p>
        <p>{t('sl11_compte.visibility_guardrail_4')}</p>
      </Collapsible>

      {confirmItem ? (
        <div className="fixed inset-0 z-[900] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setConfirmItem(null)}>
          <div className="w-full max-w-md rounded-t-3xl p-5" style={{ background: p.card, border: `1px solid ${p.border}` }} onClick={(e) => e.stopPropagation()}>
            <p className="font-black mb-1" style={{ fontSize: 15, color: p.text }}>{t(`sl11_compte.visibility_${confirmItem.key}_title`)}</p>
            <p className="mb-3" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.visibility_confirm_desc', { price: confirmItem.price })}</p>
            <div className="rounded-xl p-3 mb-3" style={{ background: p.cardAlt }}>
              <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl11_compte.visibility_not_wired')}</p>
            </div>
            <button type="button" onClick={() => setConfirmItem(null)} className="w-full rounded-xl font-bold" style={{ padding: '12px', border: `1.5px solid ${p.border}`, color: p.text, fontSize: 13 }}>
              {t('sl11_compte.close')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
