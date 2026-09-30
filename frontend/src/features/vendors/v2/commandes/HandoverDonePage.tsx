// frontend/src/features/vendors/v2/commandes/HandoverDonePage.tsx
// Écran « Remis au livreur » — VD-06 §REM-04/06/07/08.
// Route recommandée : /seller/v2/commandes/:id/remis
// "Vous êtes couvert" : à la remise, la responsabilité passe à l'entreprise
// de livraison (REM-04) — kept_amount déjà figé au paiement. Bridge : pas de
// photos réelles exposées côté vendeur (webhook handover.completed avec
// photos[] côté doc) — on décrit ce qui a été versé au dossier (REM-06) sans
// fabriquer d'URL d'image. Palier lu via vendorsApi.getProfile() pour la
// frise de libération (REM-07 : 3 j Bronze/Argent, 1 j Or/Platine).

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, CheckCircle2, Inbox, RefreshCw } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import { vendorsApi, type VendorProfile } from '@/services/api/vendors';
import { Card, CenterState, Collapsible, KeepAmount, PageHeader, PrimaryButton } from './ui';
import { fmtXAF, orderRef, releaseDelayDays, useOrder } from './helpers';

export default function HandoverDonePage() {
  const { id } = useParams();
  const orderId = id ? Number(id) : undefined;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { order, loading, error } = useOrder(orderId);
  const [profile, setProfile] = useState<VendorProfile | null>(null);

  useEffect(() => {
    vendorsApi.getProfile().then(setProfile).catch(() => {});
  }, []);

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl7_commandes.loading')} p={p} />;
  }
  if (error || !order) {
    return <CenterState icon={<Inbox size={22} color={p.red} />} title={error ?? t('sl7_commandes.not_found')} p={p} />;
  }

  const delayDays = releaseDelayDays(profile?.certification_tier);

  return (
    <div className="pb-24 pt-2">
      <PageHeader title={t('sl7_commandes.handover_done_title')} subtitle={orderRef(order.id)} p={p} />

      <div className="flex justify-center mb-4">
        <div className="rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: `${p.green}22` }}>
          <CheckCircle2 size={30} color={p.green} />
        </div>
      </div>

      <Card p={p} accent={p.green}>
        <p className="text-center font-black" style={{ fontSize: 16, color: p.green }}>{t('sl7_commandes.handover_done_covered')}</p>
        <p className="text-center mt-1" style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.4 }}>
          {t('sl7_commandes.handover_done_covered_detail')}
        </p>
        <div className="mt-4">
          <KeepAmount amount={fmtXAF(order.vendor_net_amount)} label={t('sl7_commandes.you_keep')} p={p} size={22} />
        </div>
      </Card>

      <div className="mt-3">
        <Collapsible title={t('sl7_commandes.how_it_works')} p={p}>
          {t('sl7_commandes.handover_done_release', { days: delayDays })}
        </Collapsible>
      </div>

      <p className="font-black uppercase mt-4 mb-2 px-1" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
        {t('sl7_commandes.handover_done_photos_title')}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(['open', 'closed'] as const).map((k) => (
          <div key={k} className="rounded-2xl flex flex-col items-center justify-center gap-2 text-center" style={{ background: p.cardAlt, border: `1px solid ${p.border}`, padding: '18px 10px', minHeight: 96 }}>
            <Camera size={20} color={p.textMuted} />
            <span style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.3 }}>{t(`sl7_commandes.handover_done_photo_${k}`)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.4 }}>{t('sl7_commandes.handover_done_photos_note')}</p>

      <div className="flex flex-col gap-2 mt-6">
        <PrimaryButton onClick={() => navigate(`/seller/v2/commandes/${order.id}/recu`)} p={p}>
          {t('sl7_commandes.handover_done_see_receipt')}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => navigate('/seller/v2/commandes')}
          className="w-full rounded-2xl font-bold"
          style={{ background: p.card, border: `1px solid ${p.border}`, color: p.text, padding: '13px', fontSize: 13.5, minHeight: 48 }}
        >
          {t('sl7_commandes.handover_done_finish')}
        </button>
      </div>
    </div>
  );
}
