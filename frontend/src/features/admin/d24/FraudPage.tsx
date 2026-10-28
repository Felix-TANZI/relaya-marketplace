// frontend/src/features/admin/d24/FraudPage.tsx
// Sécurité & fraude — BelivaY Admin (feuille de route D24). Lecture seule : les signaux réunis
// (GET /api/auth/admin/fraud/), chacun renvoie vers l'écran où l'on agit.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';
import { EnTete, Section, Tableau, Tuile, Tuiles, dateCourte } from './ui';

interface Signaux {
  compteurs: Record<'vetos' | 'sanctions' | 'codes_bloques' | 'retraits_bloques' | 'colis_codes_bloques' | 'liste_noire'
    | 'remboursements_a_approuver', number>;
  vetos: { user: string; user_id: number; role: string; score: number; motif: string }[];
  sanctions: { user: string; user_id: number; niveau: number; motif: string; jusqu: string | null }[];
  codes_bloques: { objet: string; destination: string; jusqu: string | null }[];
  retraits_bloques: { relais: string; essais_faux: number }[];
  colis_codes_bloques: { colis: number; commande: number }[];
  litiges_repetes: { user: string; user_id: number; litiges_90j: number }[];
  remboursements_a_approuver: { reference: string; amount_xaf: number; reason: string; created_at: string | null }[];
}

export default function FraudPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const toast = useRef(showToast);
  useEffect(() => { toast.current = showToast; });
  const [data, setData] = useState<Signaux | null>(null);
  const [chargement, setChargement] = useState(false);
  const k = (cle: string) => t(`ad7_d24_fraud.${cle}`);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setData(await http<Signaux>('/api/auth/admin/fraud/'));
    } catch {
      toast.current(t('ad7_d24_fraud.toast_error_load'), 'error');
    } finally {
      setChargement(false);
    }
  }, [t]);
  useEffect(() => { void charger(); }, [charger]);

  const compte = (id: number, nom: string) => <Link to={`/admin/users/${id}`} className="font-bold underline">{nom}</Link>;
  const c = data?.compteurs;

  return (
    <div className="p-4 sm:p-6">
      <EnTete icon={Shield} titre={k('title')} sousTitre={k('subtitle')} onRefresh={() => void charger()} chargement={chargement} />
      {c ? (
        <Tuiles>
          <Tuile libelle={k('k_vetos')} valeur={c.vetos} alerte />
          <Tuile libelle={k('k_sanctions')} valeur={c.sanctions} alerte />
          <Tuile libelle={k('k_codes')} valeur={c.codes_bloques} />
          <Tuile libelle={k('k_retraits')} valeur={c.retraits_bloques} alerte />
          <Tuile libelle={k('k_colis')} valeur={c.colis_codes_bloques} alerte />
          <Tuile libelle={k('k_liste_noire')} valeur={c.liste_noire} />
          <Tuile libelle={k('k_remboursements')} valeur={c.remboursements_a_approuver} alerte />
        </Tuiles>
      ) : null}
      {data ? (
        <>
          <Section titre={k('s_vetos')}>
            <Tableau vide={k('nothing')} entetes={[k('c_user'), k('c_role'), k('c_score'), k('c_reason')]}
              lignes={data.vetos.map((v) => [compte(v.user_id, v.user), v.role, v.score, v.motif])} />
          </Section>
          <Section titre={k('s_sanctions')}>
            <Tableau vide={k('nothing')} entetes={[k('c_user'), k('c_level'), k('c_reason'), k('c_until')]}
              lignes={data.sanctions.map((s) => [compte(s.user_id, s.user), s.niveau, s.motif, dateCourte(s.jusqu)])} />
          </Section>
          <Section titre={k('s_retraits')}>
            <Tableau vide={k('nothing')} entetes={[k('c_relay'), k('c_wrong')]}
              lignes={data.retraits_bloques.map((r) => [r.relais, r.essais_faux])} />
          </Section>
          <Section titre={k('s_colis')}>
            <Tableau vide={k('nothing')} entetes={[k('c_parcel'), k('c_order')]}
              lignes={data.colis_codes_bloques.map((p) => [
                `#${p.colis}`, <Link key={p.colis} to={`/admin/orders/${p.commande}`} className="font-bold underline">#{p.commande}</Link>])} />
          </Section>
          <Section titre={k('s_codes')}>
            <Tableau vide={k('nothing')} entetes={[k('c_purpose'), k('c_destination'), k('c_until')]}
              lignes={data.codes_bloques.map((x) => [x.objet, x.destination, dateCourte(x.jusqu)])} />
          </Section>
          <Section titre={k('s_litiges')}>
            <Tableau vide={k('nothing')} entetes={[k('c_user'), k('c_disputes')]}
              lignes={data.litiges_repetes.map((l) => [compte(l.user_id, l.user), l.litiges_90j])} />
          </Section>
          <Section titre={k('s_remboursements')}>
            <Tableau vide={k('nothing')} entetes={[k('c_reference'), k('c_amount'), k('c_reason'), k('c_date')]}
              lignes={data.remboursements_a_approuver.map((r) => [
                r.reference, `${r.amount_xaf.toLocaleString('fr-FR')} F`, r.reason, dateCourte(r.created_at)])} />
          </Section>
        </>
      ) : null}
    </div>
  );
}
