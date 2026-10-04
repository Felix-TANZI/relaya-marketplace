// frontend/src/features/vendors/v2/boutique/HorairesPage.tsx
// Écran "Horaires et fermetures" — VD-11 §BOU/HOR, Fig.3.
//
// Écarts honnêtes assumés avec la maquette (jamais une donnée ou un bouton
// qui simule un vrai branchement serveur) :
//
// 1. "Fermé aujourd'hui" — ShopStatusBar.tsx (accueil) documente déjà
//    l'absence de `POST /shop/closed-today` : "plus de nouvelle commande
//    jusqu'à demain 08h" n'existe nulle part côté backend. Le bouton reste
//    désactivé ici aussi, avec la même explication, plutôt que d'appeler
//    vendorsApi.updateShop({is_online}) qui a une sémantique différente
//    (pause indéfinie de la boutique, déjà branchée dans ParametresPage.tsx).
//
// 2. Horaires d'ouverture — VendorProfile.closed_days (backend/apps/vendors/
//    models.py) verrouille 8h-18h du lundi au samedi pour TOUS les vendeurs
//    au lancement (pas d'horaires individuels, cf. commentaire du modèle).
//    Seul le jour de fermeture hebdomadaire varie par vendeur, mais ce champ
//    n'est PAS exposé par VendorProfileSerializer (grep confirmé) : on ne
//    peut ni le lire ni l'éditer ici. On affiche donc le vrai verrou
//    plateforme (Lun-sam 8h-18h, dimanche toujours fermé) — jamais les
//    horaires différenciés du samedi (8h-14h) inventés par la maquette, qui
//    ne correspondent à aucune donnée backend actuelle.
//
// 3. "Passage du livreur" et "Fermetures programmées" — aucun modèle
//    backend ne porte de créneau de passage transporteur ni de fermeture
//    programmée avec préavis. Cartes construites avec un état honnêtement
//    vide, même convention que MessageriePage.tsx / AvisDroitReponsePage.tsx.

import { useTranslation } from 'react-i18next';
import { Clock, Truck, CalendarOff, Info } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import ScreenHeader from '../compte/shared/ScreenHeader';

export default function HorairesPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl13_boutique.hours_title')} subtitle={t('sl13_boutique.hours_subtitle')} />

      {/* Fermé aujourd'hui — pas de pont API, voir note en tête de fichier. */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1.5px solid ${p.border}` }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold" style={{ fontSize: 15, color: p.text }}>{t('sl13_boutique.closed_today_title')}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: p.green }} />
              <span className="font-semibold" style={{ fontSize: 12, color: p.green }}>{t('sl13_boutique.closed_today_open_note')}</span>
            </div>
          </div>
          <button
            type="button"
            disabled
            role="switch"
            aria-checked={false}
            className="rounded-full flex-shrink-0"
            style={{ width: 40, height: 22, background: p.border, position: 'relative', opacity: 0.6, cursor: 'not-allowed' }}
          >
            <span className="absolute rounded-full bg-white" style={{ width: 18, height: 18, top: 2, left: 2 }} />
          </button>
        </div>
        <p className="mt-3" style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.45 }}>{t('sl13_boutique.closed_today_explain')}</p>
        <p className="flex items-start gap-1.5 mt-2" style={{ fontSize: 11, color: p.amber, lineHeight: 1.45 }}>
          <Info size={13} color={p.amber} style={{ flexShrink: 0, marginTop: 1 }} />
          {t('sl13_boutique.closed_today_not_ready')}
        </p>
      </div>

      {/* Horaires d'ouverture — verrou plateforme réel, voir note 2. */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <h3 className="font-bold mb-2" style={{ fontSize: 14, color: p.text }}>{t('sl13_boutique.hours_card_title')}</h3>
        <div className="flex items-center justify-between py-2">
          <span className="font-semibold" style={{ fontSize: 13.5, color: p.text }}>{t('sl13_boutique.hours_mon_sat')}</span>
          <span
            className="font-bold rounded-xl"
            style={{ fontSize: 13, color: p.text, padding: '8px 12px', border: `1.5px solid ${p.border}`, background: p.cardAlt }}
          >
            {t('sl13_boutique.hours_mon_sat_value')}
          </span>
        </div>
        <div className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${p.border}` }}>
          <span className="font-semibold" style={{ fontSize: 13.5, color: p.text }}>{t('sl13_boutique.hours_sunday')}</span>
          <span
            className="font-bold rounded-xl"
            style={{ fontSize: 13, color: p.textMuted, padding: '8px 12px', border: `1.5px solid ${p.border}`, background: p.cardAlt }}
          >
            {t('sl13_boutique.hours_sunday_value')}
          </span>
        </div>
        <p className="flex items-start gap-1.5 mt-3" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.5 }}>
          <Clock size={13} color={p.textMuted} style={{ flexShrink: 0, marginTop: 1 }} />
          {t('sl13_boutique.hours_locked_note')}
        </p>
      </div>

      {/* Passage du livreur — aucune donnée backend, voir note 3. */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Truck size={16} color={p.textMuted} />
          <h3 className="font-bold" style={{ fontSize: 14, color: p.text }}>{t('sl13_boutique.pickup_title')}</h3>
        </div>
        <p style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>{t('sl13_boutique.pickup_not_ready')}</p>
      </div>

      {/* Fermetures programmées — aucune donnée backend, voir note 3. */}
      <div className="rounded-2xl p-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <CalendarOff size={16} color={p.textMuted} />
          <h3 className="font-bold" style={{ fontSize: 14, color: p.text }}>{t('sl13_boutique.closures_title')}</h3>
        </div>
        <p className="mb-3" style={{ fontSize: 12, color: p.textMuted }}>{t('sl13_boutique.closures_empty')}</p>
        <button
          type="button"
          disabled
          className="w-full rounded-xl font-bold"
          style={{ padding: '12px', border: `1.5px solid ${p.border}`, color: p.textMuted, fontSize: 13, opacity: 0.6, cursor: 'not-allowed' }}
        >
          {t('sl13_boutique.closures_schedule_button')}
        </button>
        <p className="flex items-start gap-1.5 mt-2" style={{ fontSize: 11, color: p.amber, lineHeight: 1.45 }}>
          <Info size={13} color={p.amber} style={{ flexShrink: 0, marginTop: 1 }} />
          {t('sl13_boutique.closures_not_ready')}
        </p>
        <p className="mt-2" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.45 }}>{t('sl13_boutique.closures_advance_notice')}</p>
      </div>
    </div>
  );
}
