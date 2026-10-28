// frontend/src/features/admin/d24/CouriersOverviewPage.tsx
// Vue d'ensemble — Livreurs — BelivaY Admin (feuille de route D24) : effectifs, charge, SOS
// (GET /api/auth/admin/couriers/overview/).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';
import { EnTete, Section, Tableau, Tuile, Tuiles } from './ui';

interface Vue {
  compteurs: Record<'inscrits' | 'a_valider' | 'actifs' | 'en_ligne' | 'disponibles' | 'en_mission' | 'missions_en_cours'
    | 'missions_sans_livreur' | 'sos_ouverts', number>;
  livreurs: {
    id: number; nom: string; entreprise: string; ville: string; en_ligne: boolean; disponibilite: string; vehicule: string;
    missions_en_cours: number; capacite: number; sos_ouverts: number;
  }[];
}

export default function CouriersOverviewPage() {
  const { t } = useTranslation();
  const T = useAdminTheme();
  const { showToast } = useToast();
  const toast = useRef(showToast);
  useEffect(() => { toast.current = showToast; });
  const [data, setData] = useState<Vue | null>(null);
  const [chargement, setChargement] = useState(false);
  const k = (cle: string) => t(`ad7_d24_couriers.${cle}`);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setData(await http<Vue>('/api/auth/admin/couriers/overview/'));
    } catch {
      toast.current(t('ad7_d24_couriers.toast_error_load'), 'error');
    } finally {
      setChargement(false);
    }
  }, [t]);
  useEffect(() => { void charger(); }, [charger]);

  const c = data?.compteurs;
  return (
    <div className="p-4 sm:p-6">
      <EnTete icon={Truck} titre={k('title')} sousTitre={k('subtitle')} onRefresh={() => void charger()} chargement={chargement} />
      {c ? (
        <Tuiles>
          <Tuile libelle={k('k_inscrits')} valeur={c.inscrits} />
          <Tuile libelle={k('k_a_valider')} valeur={c.a_valider} alerte />
          <Tuile libelle={k('k_actifs')} valeur={c.actifs} />
          <Tuile libelle={k('k_en_ligne')} valeur={c.en_ligne} />
          <Tuile libelle={k('k_disponibles')} valeur={c.disponibles} />
          <Tuile libelle={k('k_en_mission')} valeur={c.en_mission} />
          <Tuile libelle={k('k_missions')} valeur={c.missions_en_cours} />
          <Tuile libelle={k('k_sans_livreur')} valeur={c.missions_sans_livreur} alerte />
          <Tuile libelle={k('k_sos')} valeur={c.sos_ouverts} alerte />
        </Tuiles>
      ) : null}
      {data ? (
        <Section titre={k('title')}>
          <Tableau vide={k('empty')}
            entetes={[k('c_name'), k('c_company'), k('c_city'), k('c_status'), k('c_load'), k('c_vehicle'), k('c_sos')]}
            lignes={data.livreurs.map((l) => [
              <span key="n" className="font-bold">{l.nom}</span>,
              l.entreprise || '—',
              l.ville || '—',
              <span key="s" className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: l.en_ligne ? T.green : T.gray }} />
                {l.en_ligne ? k('online') : k('offline')} · {l.disponibilite}
              </span>,
              `${l.missions_en_cours} / ${l.capacite}`,
              l.vehicule || '—',
              <span key="o" style={{ color: l.sos_ouverts ? T.red : T.muted, fontWeight: l.sos_ouverts ? 800 : 400 }}>{l.sos_ouverts}</span>,
            ])} />
        </Section>
      ) : null}
    </div>
  );
}
