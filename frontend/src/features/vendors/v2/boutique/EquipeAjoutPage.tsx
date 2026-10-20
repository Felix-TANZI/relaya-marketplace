// frontend/src/features/vendors/v2/boutique/EquipeAjoutPage.tsx
// Écran "Mon équipe · ajouter un accès" — VD-11 fig.6.
//
// MANQUE BACKEND : pas de POST d'invitation d'équipe (aucun endpoint
// équivalent n'existe — voir le commentaire de tête d'EquipePage.tsx). Le
// formulaire est donc entièrement fonctionnel côté saisie, mais "Envoyer
// l'invitation" n'appelle aucun réseau et n'affiche jamais un faux succès :
// un bandeau explicite annonce que l'envoi n'est pas encore branché et
// renvoie vers le support WhatsApp (numéro réel, même canal déjà utilisé par
// SecuriteAppareilsPage.tsx et BoutiquePage.tsx pour les actions sans pont
// serveur) pour un ajout manuel en attendant.
//
// Le sélecteur de niveau d'accès de la maquette HTML (Propriétaire vs
// Préparation) n'a qu'une seule valeur utilisable aujourd'hui : transférer la
// propriété n'est pas un flux qui existe nulle part dans ce dossier. Le choix
// "Préparation" est donc affiché comme seul niveau disponible, jamais un
// sélecteur qui ferait croire à un transfert de propriété fonctionnel.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Send, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette, primaryGradient } from '../theme';
import ScreenHeader from '../compte/shared/ScreenHeader';
import { buildWhatsAppSupportLink } from '../compte/shared/format';

export default function EquipeAjoutPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  const fullName = `${firstName} ${lastName}`.trim();
  const whatsappLink = buildWhatsAppSupportLink(
    t('sl13_boutique.add_whatsapp_message', { name: fullName || '—', phone: phone ? `+237 ${phone}` : '—' }),
  );

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl13_boutique.add_title')} subtitle={t('sl13_boutique.add_subtitle')} />

      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="mb-3">
          <label className="block font-bold mb-1" style={{ fontSize: 12, color: p.text }}>{t('sl13_boutique.add_firstname_label')}</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t('sl13_boutique.add_firstname_placeholder')}
            className="w-full rounded-xl mb-2"
            style={{ padding: '10px 12px', fontSize: 13, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text }}
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t('sl13_boutique.add_lastname_placeholder')}
            className="w-full rounded-xl"
            style={{ padding: '10px 12px', fontSize: 13, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text }}
          />
        </div>
        <div>
          <label className="block font-bold mb-1" style={{ fontSize: 12, color: p.text }}>{t('sl13_boutique.add_phone_label')}</label>
          <div className="flex items-center gap-2 rounded-xl" style={{ padding: '10px 12px', background: p.cardAlt, border: `1px solid ${p.border}` }}>
            <span className="font-bold" style={{ fontSize: 13, color: p.textMuted }}>+237</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="677 12 34 56"
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: 13, color: p.text }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-1" style={{ fontSize: 13, color: p.text }}>{t('sl13_boutique.add_access_prep_title')}</p>
        <p className="mb-1" style={{ fontSize: 12, color: p.textMuted }}>{t('sl13_boutique.add_access_prep_can')}</p>
        <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl13_boutique.add_access_prep_cannot')}</p>
        <p className="mt-2" style={{ fontSize: 11, color: p.textMuted }}>{t('sl13_boutique.add_access_level_fixed_note')}</p>
      </div>

      {showPlaceholder ? (
        <div className="rounded-xl p-3 mb-3 flex items-start gap-2" style={{ background: `${p.amber}1A` }}>
          <AlertTriangle size={16} color={p.amber} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="font-bold mb-1" style={{ fontSize: 12.5, color: p.text }}>{t('sl13_boutique.add_not_wired_title')}</p>
            <p className="mb-2" style={{ fontSize: 12, color: p.textMuted }}>{t('sl13_boutique.add_not_wired_text')}</p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg font-bold"
              style={{ padding: '8px 12px', border: `1.5px solid ${p.orange}`, color: p.orange, fontSize: 12 }}
            >
              {t('sl13_boutique.add_not_wired_whatsapp_cta')}
            </a>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowPlaceholder(true)}
        disabled={!firstName.trim() || !phone.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white mb-2 disabled:opacity-50"
        style={{ padding: '13px', background: primaryGradient(p), fontSize: 14 }}
      >
        <Send size={15} />
        {t('sl13_boutique.add_send_cta')}
      </button>
      <p className="mb-3" style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl13_boutique.add_sms_hint')}</p>

      <Link
        to="/seller/v2/equipe"
        className="block w-full text-center rounded-xl font-bold"
        style={{ padding: '12px', color: p.textMuted, fontSize: 13 }}
      >
        {t('sl11_compte.cancel')}
      </Link>
    </div>
  );
}
