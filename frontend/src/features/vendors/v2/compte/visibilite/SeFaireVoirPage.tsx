// frontend/src/features/vendors/v2/compte/visibilite/SeFaireVoirPage.tsx
// Écran "Se faire voir" — VD-10 §VIS, Fig.9.
// Catalogue de visibilité payante, TOUJOURS étiqueté "Sponsorisé" — jamais
// "Boost Buy Box" (VIS-01/A4 : « l'attribution ne s'achète pas », explicitement
// rejeté et à ne jamais implémenter).
//
// DEV-SRV-01, T02-5 / T05 (décision du porteur du 2026-11-08) : aucune API ne vend encore ces options, donc aucun
// tarif n'est affiché ni écrit dans le code. Les offres sont présentées « bientôt disponibles » ; leurs prix
// viendront du serveur le jour où la vente y existera.
//
// La vente flash est masquée tant que le feature-flag FF-FLASH est fermé au
// lancement (VD-D11.A25, question ouverte Q06) — jamais affichée par défaut.

import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';

const OFFRES = ['feature_24h', 'category_boost_7d', 'neighborhood_showcase_7d', 'result_boost', 'favorites_campaign'] as const;

export default function SeFaireVoirPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.visibility_title')} />

      <div className="rounded-2xl p-4 mb-4" style={{ background: `${p.amber}1A`, border: `1px solid ${p.amber}55` }}>
        <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.visibility_soon_banner')}</p>
      </div>

      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        {OFFRES.map((offre, i) => (
          <div key={offre} className="flex items-center justify-between"
            style={{ padding: '13px 14px', borderTop: i > 0 ? `1px solid ${p.border}` : undefined }}>
            <div className="min-w-0">
              <p className="font-semibold flex items-center gap-2" style={{ fontSize: 13, color: p.text }}>
                {t(`sl11_compte.visibility_${offre}_title`)}
                <span className="px-2 py-0.5 rounded-full font-bold" style={{ fontSize: 9.5, background: `${p.amber}22`, color: p.amber }}>
                  {t('sl11_compte.visibility_sponsored_badge')}
                </span>
              </p>
              <p style={{ fontSize: 11, color: p.textMuted }}>
                {t(`sl11_compte.visibility_${offre}_desc`)}
              </p>
            </div>
            <span className="font-bold flex-shrink-0 ml-2" style={{ fontSize: 11, color: p.textMuted }}>
              {t('sl11_compte.visibility_soon')}
            </span>
          </div>
        ))}
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
    </div>
  );
}
