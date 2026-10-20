// frontend/src/features/vendors/v2/compte/croissance/DemandePage.tsx
// Écran "La demande" — VD-10 §DEM, Fig.12.
//
// Principe de la maquette : montrer les recherches de clients proches restées
// sans résultat ("chargeur itel : cherché 14 fois près de chez vous"), par
// zone, pour orienter le vendeur sur quoi stocker/vendre ensuite.
//
// MANQUE BACKEND : aucun suivi de recherche (aucune trace de "search_log" /
// "no_results" / "demand" dans backend/apps/catalog) n'existe côté serveur.
// Rien n'est fabriqué ici (règle V16) : la carte principale affiche un état
// vide honnête expliquant que la fonctionnalité n'est pas encore active, au
// lieu d'un faux "chargeur itel : cherché 14 fois". La section "Ce qui freine
// vos ventes" de la maquette (Fig.12) repose elle aussi sur une détection
// personnalisée par vendeur qui n'existe pas côté backend ; elle est donc
// remplacée par des liens d'aide génériques (pas des insights inventés) vers
// les écrans réels Services / Se faire voir / Avis.

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Camera, Eye, Star, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';

export default function DemandePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const p = palette(theme);

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl14_croissance.demande_title')} subtitle={t('sl14_croissance.demande_subtitle')} />

      <div className="flex items-start gap-2 mb-3 px-1">
        <ShieldAlert size={14} color={p.textMuted} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl14_croissance.demande_privacy_hint')}</p>
      </div>

      {/* État vide honnête — pas de suivi de recherche côté backend aujourd'hui. */}
      <div className="rounded-2xl p-4 mb-5" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-1" style={{ fontSize: 13.5, color: p.text }}>{t('sl14_croissance.demande_unavailable_title')}</p>
        <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl14_croissance.demande_unavailable_body')}</p>
      </div>

      {/* Aide générique — pas une détection personnalisée (celle-ci n'existe pas côté backend). */}
      <p className="font-black uppercase mb-2 px-1" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
        {t('sl14_croissance.demande_blockers_title')}
      </p>
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <BlockerRow
          p={p}
          icon={<Camera size={18} color={p.amber} />}
          title={t('sl14_croissance.demande_blocker_photos_title')}
          desc={t('sl14_croissance.demande_blocker_photos_desc')}
          cta={t('sl14_croissance.demande_blocker_photos_cta')}
          onClick={() => navigate('/seller/v2/services')}
          first
        />
        <BlockerRow
          p={p}
          icon={<Eye size={18} color={p.amber} />}
          title={t('sl14_croissance.demande_blocker_visibility_title')}
          desc={t('sl14_croissance.demande_blocker_visibility_desc')}
          cta={t('sl14_croissance.demande_blocker_visibility_cta')}
          onClick={() => navigate('/seller/v2/se-faire-voir')}
        />
        <BlockerRow
          p={p}
          icon={<Star size={18} color={p.amber} />}
          title={t('sl14_croissance.demande_blocker_reviews_title')}
          desc={t('sl14_croissance.demande_blocker_reviews_desc')}
          cta={t('sl14_croissance.demande_blocker_reviews_cta')}
          onClick={() => navigate('/seller/v2/avis')}
        />
      </div>

      <Collapsible title={t('sl14_croissance.how_it_works')}>
        <p>{t('sl14_croissance.demande_how')}</p>
      </Collapsible>
    </div>
  );
}

function BlockerRow({
  p, icon, title, desc, cta, onClick, first,
}: {
  p: ReturnType<typeof palette>;
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
  first?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 text-left"
      style={{ padding: '13px 14px', borderTop: first ? undefined : `1px solid ${p.border}` }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.amber}1A` }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold" style={{ fontSize: 13, color: p.text }}>{title}</p>
        <p style={{ fontSize: 11.5, color: p.textMuted }}>{desc}</p>
        <p className="font-bold mt-1" style={{ fontSize: 11.5, color: p.orange }}>{cta}</p>
      </div>
      <ChevronRight size={16} color={p.textMuted} style={{ flexShrink: 0, marginTop: 4 }} />
    </button>
  );
}
