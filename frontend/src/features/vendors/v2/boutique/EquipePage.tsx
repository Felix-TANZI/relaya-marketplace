// frontend/src/features/vendors/v2/boutique/EquipePage.tsx
// Écran "Mon équipe" — VD-11 fig.5.
//
// MANQUE BACKEND : aucun modèle d'accès multi-utilisateur par boutique
// (staff/rôle "Préparation") n'existe dans apps/vendors (grep models.py/
// views.py/serializers.py : les seuls "role"/"staff" trouvés sont
// User.is_staff — réservé aux admins BelivaY — et DisputeMessage.sender_role ;
// rien d'équivalent à "un second compte Préparation pour une boutique"). Cet
// écran affiche donc honnêtement :
//   - le seul accès réel existant aujourd'hui, le propriétaire (useAuth +
//     VendorProfile, même dérivation ownerName que BoutiquePage.tsx) ;
//   - la matrice "Ce que voit un accès Préparation" en texte statique qui
//     documente l'intention produit (même capacités que EquipeAjoutPage.tsx) ;
//   - "Ajouter un accès" mène à EquipeAjoutPage, dont la soumission est un
//     placeholder clairement annoncé (aucun POST d'invitation n'existe) ;
//   - "Aperçu de l'accueil Préparation" reste non cliquable (pas de second
//     compte réel à prévisualiser) plutôt qu'un lien mort déguisé en lien
//     fonctionnel.
//
// Le drapeau isPrepAccess de useAccueilData.ts (accueil/types.ts) est
// aujourd'hui toujours `false`, commenté "pas encore de rôle distinct en
// session" — exactement le même manque que documenté ici. Si un jour un
// second compte existe, c'est CE drapeau qui doit piloter la vue Préparation
// de l'Accueil ; cet écran ne redéfinit pas un concept concurrent.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Users, ShieldAlert, ChevronRight, Check, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { palette, primaryGradient } from '../theme';
import ScreenHeader from '../compte/shared/ScreenHeader';
import Collapsible from '../compte/shared/Collapsible';
import { vendorsApi, type VendorProfile } from '@/services/api/vendors';

const CAN_DO_KEYS = ['prep_can_1', 'prep_can_2', 'prep_can_3', 'prep_can_4'] as const;
const CANNOT_KEYS = ['prep_cannot_1', 'prep_cannot_2', 'prep_cannot_3'] as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  return parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export default function EquipePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const p = palette(theme);
  const [profile, setProfile] = useState<VendorProfile | null>(null);

  useEffect(() => {
    vendorsApi.getProfile().then(setProfile).catch(() => {});
  }, []);

  // Même dérivation que BoutiquePage.tsx (ownerName) : prénom/nom du compte
  // utilisateur réel, jamais une identité fabriquée.
  const ownerName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    || profile?.business_name
    || '—';

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl13_boutique.team_title')} subtitle={t('sl13_boutique.team_subtitle')} />

      <div className="rounded-2xl mb-3 overflow-hidden" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center gap-3 p-3">
          <span
            className="flex items-center justify-center rounded-full font-black text-white flex-shrink-0"
            style={{ width: 44, height: 44, background: p.text }}
          >
            {initialsOf(ownerName)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold truncate" style={{ fontSize: 13.5, color: p.text }}>{ownerName}</span>
              <span className="rounded-full font-bold" style={{ fontSize: 10, padding: '2px 7px', background: `${p.orange}1A`, color: p.orange }}>
                {t('sl13_boutique.role_owner')}
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl13_boutique.team_owner_caption')}</p>
          </div>
        </div>
      </div>

      <p className="flex items-start gap-1.5 mb-3" style={{ fontSize: 11.5, color: p.textMuted }}>
        <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{t('sl13_boutique.team_no_second_access')}</span>
      </p>

      <Link
        to="/seller/v2/equipe/ajouter"
        className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white mb-3"
        style={{ padding: '13px', background: primaryGradient(p), fontSize: 14 }}
      >
        <Users size={16} />
        {t('sl13_boutique.team_add_cta')}
      </Link>

      <div className="rounded-xl p-3 mb-3 flex items-start gap-2" style={{ background: `${p.red}14` }}>
        <ShieldAlert size={16} color={p.red} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: p.text }}>{t('sl13_boutique.team_never_share')}</p>
      </div>

      <Collapsible title={t('sl13_boutique.team_prep_matrix_title')}>
        <p className="font-bold uppercase" style={{ fontSize: 10.5, letterSpacing: '.06em', color: p.textMuted, marginBottom: 4 }}>
          {t('sl13_boutique.team_can_do')}
        </p>
        {CAN_DO_KEYS.map((k) => (
          <div key={k} className="flex items-start gap-2 py-1">
            <Check size={14} color={p.green} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: p.text }}>{t(`sl13_boutique.${k}`)}</span>
          </div>
        ))}
        <p className="font-bold uppercase mt-2" style={{ fontSize: 10.5, letterSpacing: '.06em', color: p.textMuted, marginBottom: 4 }}>
          {t('sl13_boutique.team_never_sees')}
        </p>
        {CANNOT_KEYS.map((k) => (
          <div key={k} className="flex items-start gap-2 py-1">
            <X size={14} color={p.red} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: p.text }}>{t(`sl13_boutique.${k}`)}</span>
          </div>
        ))}
        <p className="mt-2">{t('sl13_boutique.team_owner_can_all')}</p>
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${p.border}` }}>
          <div className="flex items-center gap-1 font-bold" style={{ color: p.textMuted }}>
            <span>{t('sl13_boutique.team_preview_prep_home')}</span>
            <ChevronRight size={14} />
          </div>
          <p className="mt-1" style={{ fontSize: 11, color: p.textMuted }}>{t('sl13_boutique.team_preview_not_wired')}</p>
        </div>
      </Collapsible>

      <Collapsible title={t('sl11_compte.how_it_works')}>
        <p className="mb-2">{t('sl13_boutique.team_how_2fa')}</p>
        <p>{t('sl13_boutique.team_how_log')}</p>
      </Collapsible>
    </div>
  );
}
