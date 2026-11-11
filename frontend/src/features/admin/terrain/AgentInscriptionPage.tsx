// frontend/src/features/admin/terrain/AgentInscriptionPage.tsx
// DEV-SRV-01, T07-4/5 — l'agent de terrain inscrit un vendeur sur place : boutique, téléphone, quartier (plus le
// point GPS pris avec son téléphone et des repères). Le compte naît EN ATTENTE ; le mot de passe provisoire n'est
// montré qu'une fois, ici, pour être remis au vendeur. Ensuite : la pièce d'identité et le catalogue.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Crosshair, KeyRound, UserPlus } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { EnTete, Section } from '../d24/ui';
import { terrainApi, type FicheVendeur, type Inscription, type Quartier } from './api';

const VIDE: Inscription = { boutique: '', telephone: '', quartier: '', gerant: '', reperes: '', latitude: null, longitude: null };

export default function AgentInscriptionPage() {
  const { t } = useTranslation();
  const T = useAdminTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const toast = useRef(showToast);
  useEffect(() => { toast.current = showToast; });
  const k = (cle: string, opts?: Record<string, unknown>) => t(`ad8_terrain.${cle}`, opts);

  const [form, setForm] = useState<Inscription>(VIDE);
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [inscrit, setInscrit] = useState<FicheVendeur | null>(null);

  useEffect(() => {
    terrainApi.quartiers().then((d) => setQuartiers(d.quartiers)).catch(() => toast.current(t('ad8_terrain.toast_error_quartiers'), 'error'));
  }, [t]);

  const champ = (cle: keyof Inscription) => ({
    value: (form[cle] ?? '') as string,
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [cle]: e.target.value })),
  });

  const position = () => {
    if (!navigator.geolocation) {
      toast.current(k('gps_unavailable'), 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setForm((f) => ({ ...f, latitude: Number(p.coords.latitude.toFixed(6)), longitude: Number(p.coords.longitude.toFixed(6)) }));
        toast.current(k('gps_ok'), 'success');
      },
      () => toast.current(k('gps_refused'), 'error'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      setInscrit(await terrainApi.inscrire(form));
    } catch (erreur) {
      toast.current(erreur instanceof Error ? erreur.message : k('toast_error_register'), 'error');
    } finally {
      setEnvoi(false);
    }
  };

  const style = { background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text };
  const libelle = (texte: string, obligatoire = false) => (
    <span className="block text-xs font-bold mb-1" style={{ color: T.muted }}>{texte}{obligatoire ? ' *' : ''}</span>
  );

  if (inscrit) {
    return (
      <div className="p-4 sm:p-6 max-w-xl">
        <EnTete icon={KeyRound} titre={k('done_title')} sousTitre={k('done_subtitle', { shop: inscrit.boutique })}
          onRefresh={() => undefined} chargement={false} />
        <Section titre={k('password_section')}>
          <div className="p-4">
            <p className="text-sm mb-3" style={{ color: T.text }}>{k('password_explain')}</p>
            <div className="text-3xl font-black tracking-widest text-center py-4 rounded-xl select-all"
              style={{ background: T.cardAlt, color: T.text, fontFamily: 'monospace', border: `2px dashed ${T.red}` }}>
              {inscrit.mot_de_passe_provisoire}
            </div>
            <p className="text-sm mt-3" style={{ color: T.text }}>{k('password_login', { phone: inscrit.telephone })}</p>
            <p className="text-xs font-bold mt-2" style={{ color: T.red }}>{k('password_once')}</p>
          </div>
        </Section>
        <button onClick={() => navigate(`/admin/terrain/${inscrit.id}`, { replace: true })}
          className="w-full px-4 py-3 rounded-xl text-sm font-bold" style={{ background: T.red, color: '#fff' }}>
          {k('continue_to_pieces')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl">
      <EnTete icon={UserPlus} titre={k('register_title')} sousTitre={k('register_subtitle')} onRefresh={() => setForm(VIDE)} chargement={false} />
      <form onSubmit={(e) => void envoyer(e)}>
        <Section titre={k('shop_section')}>
          <div className="p-4 space-y-3">
            <label className="block">{libelle(k('field_shop'), true)}
              <input required maxLength={255} className="w-full px-3 py-2 rounded-xl text-sm" style={style} {...champ('boutique')} />
            </label>
            <label className="block">{libelle(k('field_phone'), true)}
              <input required inputMode="tel" placeholder="6XXXXXXXX" className="w-full px-3 py-2 rounded-xl text-sm" style={style} {...champ('telephone')} />
            </label>
            <label className="block">{libelle(k('field_quartier'), true)}
              <input required list="agent-quartiers" className="w-full px-3 py-2 rounded-xl text-sm" style={style} {...champ('quartier')} />
              <datalist id="agent-quartiers">
                {quartiers.map((q) => <option key={q.quartier} value={q.quartier}>{q.commune}</option>)}
              </datalist>
            </label>
            <label className="block">{libelle(k('field_manager'))}
              <input maxLength={150} className="w-full px-3 py-2 rounded-xl text-sm" style={style} {...champ('gerant')} />
            </label>
          </div>
        </Section>
        <Section titre={k('location_section')}>
          <div className="p-4 space-y-3">
            <button type="button" onClick={position} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold"
              style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}` }}>
              <Crosshair size={15} /> {form.latitude != null ? k('gps_taken', { lat: form.latitude, lon: form.longitude }) : k('gps_button')}
            </button>
            <label className="block">{libelle(k('field_landmarks'))}
              <textarea rows={2} className="w-full px-3 py-2 rounded-xl text-sm" style={style} placeholder={k('landmarks_placeholder')} {...champ('reperes')} />
            </label>
          </div>
        </Section>
        <button type="submit" disabled={envoi} className="w-full px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
          style={{ background: T.red, color: '#fff' }}>
          {envoi ? '…' : k('register_submit')}
        </button>
        <p className="text-xs mt-3" style={{ color: T.muted }}>{k('register_note')}</p>
      </form>
    </div>
  );
}
