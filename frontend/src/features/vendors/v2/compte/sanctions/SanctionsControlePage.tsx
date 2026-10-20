// frontend/src/features/vendors/v2/compte/sanctions/SanctionsControlePage.tsx
// Écran "Sanctions et contrôle" — VD-10 §SAN, Fig.4.
// Répond à « Est-ce que je risque quelque chose ? ».
//
// Pas de pont API listé pour cet écran (GET /account/status, GET /account/
// decisions n'existent pas dans vendorsApi) : l'état par défaut est l'état
// "RAS" (vert) et l'historique une liste vide — c'est l'état vide explicitement
// prévu par la spec, jamais une donnée fabriquée. La fréquence de contrôle
// utilise le Trust Score déjà disponible via getCertifications() (règle C8).

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type CertificationData } from '@/services/api/vendors';
import { palette, type VendorPalette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';

// Sanctions.jpg : les 4 niveaux sont des cercles numérotés 1→4, de plus en
// plus "chauds" (jaune pâle → rouge), jamais de simples icônes génériques.
const SANCTION_LEVEL_KEYS = ['level_1', 'level_2', 'level_3', 'level_4'] as const;

function levelColor(p: VendorPalette, index: number): string {
  return index === 0 ? p.amber : index === 1 ? p.orange : p.red;
}

export default function SanctionsControlePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const p = palette(theme);
  const [cert, setCert] = useState<CertificationData | null>(null);
  // Historique vide tant que GET /account/decisions n'est pas branché.
  const decisions: never[] = [];

  useEffect(() => {
    vendorsApi.getCertifications().then(setCert).catch(() => {});
  }, []);

  const score = cert?.total_points ?? null;
  // C8 : 100 % des 5 premières commandes ; < 70 → 1/20 ; sinon 1/100 ; retour à
  // 100 % si le score chute. On ne connaît pas ici le nombre de commandes déjà
  // passées (pas de pont), donc on affiche la règle générale + la fréquence
  // déduite du score quand il est connu.
  const frequencyKey = score === null ? null : score < 70 ? 'freq_1_20' : 'freq_1_100';

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.sanctions_title')} />

      {/* Carte d'état — verte si RAS (aucune sanction ni décision en cours). */}
      <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: `${p.green}1A`, border: `1px solid ${p.green}55` }}>
        <ShieldCheck size={22} color={p.green} />
        <p className="font-bold" style={{ fontSize: 13.5, color: p.green }}>{t('sl11_compte.sanctions_ras')}</p>
      </div>

      {/* Contrôle au ramassage (SAN-03, calcul C8). */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-2" style={{ fontSize: 13.5, color: p.text }}>{t('sl11_compte.sanctions_control_title')}</p>
        <p className="mb-1" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.sanctions_control_first5')}</p>
        <p className="mb-1" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.sanctions_control_below70')}</p>
        <p className="mb-2" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.sanctions_control_above70')}</p>
        {frequencyKey ? (
          <p className="font-semibold" style={{ fontSize: 12, color: p.text }}>
            {t('sl11_compte.sanctions_control_current', { freq: t(`sl11_compte.${frequencyKey}`) })}
          </p>
        ) : null}
      </div>

      {/* 4 niveaux de sanction — jamais niveau 2 à 4 sans validation humaine (SAN-01). */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        {SANCTION_LEVEL_KEYS.map((key, i) => {
          const color = levelColor(p, i);
          return (
            <div key={key} className="flex items-start gap-3" style={{ padding: '13px 14px', borderTop: i > 0 ? `1px solid ${p.border}` : undefined }}>
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{ width: 28, height: 28, background: `${color}26` }}
              >
                <span className="font-black" style={{ fontSize: 13, color }}>{i + 1}</span>
              </div>
              <div>
                <p className="font-semibold" style={{ fontSize: 13, color: p.text }}>{t(`sl11_compte.sanctions_${key}_title`)}</p>
                <p style={{ fontSize: 11.5, color: p.textMuted }}>{t(`sl11_compte.sanctions_${key}_desc`)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historique des décisions — état vide prévu par la spec. */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-2" style={{ fontSize: 13.5, color: p.text }}>{t('sl11_compte.sanctions_history_title')}</p>
        {decisions.length === 0 ? (
          <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.sanctions_history_empty')}</p>
        ) : null}
      </div>

      <button
        type="button"
        disabled={decisions.length === 0}
        onClick={() => navigate('/seller/v2/sanctions/contester')}
        className="w-full rounded-2xl font-bold"
        style={{
          padding: '13px',
          fontSize: 13.5,
          background: 'transparent',
          border: `1.5px solid ${decisions.length === 0 ? p.border : p.orange}`,
          color: decisions.length === 0 ? p.textMuted : p.orange,
        }}
      >
        {t('sl11_compte.sanctions_contest_cta')}
      </button>
    </div>
  );
}
