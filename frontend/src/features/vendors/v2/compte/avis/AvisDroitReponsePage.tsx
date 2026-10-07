// frontend/src/features/vendors/v2/compte/avis/AvisDroitReponsePage.tsx
// Écran "Avis et droit de réponse" — VD-11 §AVI, MSG, Fig.11.
// Affiche les avis vérifiés, leur poids dans le Trust Score (20 %, canonique
// SCO), et la réponse privée via le support (jamais de réponse publique
// signée, jamais de suppression par le vendeur — AVI-01).
//
// GET /api/vendors/reviews/ ajouté pour cet écran (réutilise le modèle
// ProductReview existant, acheteur anonymisé comme pour les commandes —
// "Acheteur #XXXX"). La réponse privée (POST /reviews/{id}/private-reply)
// n'a pas d'endpoint dédié : redirigée vers le support WhatsApp existant,
// comme les autres actions sans pont API de cet espace (cf. AID-02).

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, MessageCircleReply } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { http } from '@/services/api/http';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';
import { buildWhatsAppSupportLink } from '../shared/format';

interface VendorReview {
  id: number;
  product_id: number;
  product_name: string;
  buyer_display: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
}

interface VendorReviewsPayload {
  average_rating: number | null;
  count: number;
  results: VendorReview[];
}

export default function AvisDroitReponsePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const [payload, setPayload] = useState<VendorReviewsPayload | null>(null);

  useEffect(() => {
    http<VendorReviewsPayload>('/api/vendors/reviews/')
      .then(setPayload)
      .catch(() => setPayload({ average_rating: null, count: 0, results: [] }));
  }, []);

  const reviews = payload?.results ?? [];
  const average = payload?.average_rating ?? 0;

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.reviews_title')} />

      <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center justify-center gap-1 mb-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={16} color={p.orange} fill={i < Math.round(average) ? p.orange : 'transparent'} />
          ))}
        </div>
        <p style={{ fontSize: 12, color: p.textMuted }}>
          {payload?.average_rating != null
            ? t('sl11_compte.reviews_summary', { rating: payload.average_rating, count: payload.count })
            : t('sl11_compte.reviews_no_data_yet')}
        </p>
        <p className="mt-1 font-semibold" style={{ fontSize: 11.5, color: p.text }}>{t('sl11_compte.reviews_weight_note')}</p>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        {reviews.length === 0 ? (
          <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.reviews_empty')}</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="pb-3" style={{ borderBottom: `1px solid ${p.border}` }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} color={p.orange} fill={i < r.rating ? p.orange : 'transparent'} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10.5, color: p.textMuted }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <p className="font-bold" style={{ fontSize: 12.5, color: p.text }}>{r.product_name}</p>
                {r.title ? <p className="font-semibold mt-0.5" style={{ fontSize: 12, color: p.text }}>{r.title}</p> : null}
                {r.comment ? <p className="mt-0.5" style={{ fontSize: 12, color: p.textMuted }}>{r.comment}</p> : null}
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span style={{ fontSize: 10.5, color: p.textMuted }}>
                    {r.buyer_display}{r.is_verified_purchase ? ` · ${t('sl11_compte.reviews_verified_purchase')}` : ''}
                  </span>
                  <a
                    href={buildWhatsAppSupportLink(t('sl11_compte.reviews_reply_whatsapp_message', { product: r.product_name }))}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold"
                    style={{ fontSize: 10.5, color: p.orange }}
                  >
                    <MessageCircleReply size={11} />
                    {t('sl11_compte.reviews_reply_cta')}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Collapsible title={t('sl11_compte.how_it_works')}>
        <p className="mb-1">{t('sl11_compte.reviews_how_1')}</p>
        <p>{t('sl11_compte.reviews_how_2')}</p>
      </Collapsible>
    </div>
  );
}
