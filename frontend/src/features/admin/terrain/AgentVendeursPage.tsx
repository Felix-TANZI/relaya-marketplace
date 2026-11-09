// frontend/src/features/admin/terrain/AgentVendeursPage.tsx
// DEV-SRV-01, T07-4 — « Mes inscriptions » : les vendeurs que l'agent de terrain a inscrits, et où en est chacun
// (pièce d'identité, catalogue, accès). Le serveur ne rend que les inscriptions de l'agent connecté.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Store, UserPlus } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { EnTete, Section, Tableau, dateCourte } from '../d24/ui';
import { terrainApi, type FicheVendeur } from './api';

export default function AgentVendeursPage() {
  const { t } = useTranslation();
  const T = useAdminTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const toast = useRef(showToast);
  useEffect(() => { toast.current = showToast; });
  const k = (cle: string, opts?: Record<string, unknown>) => t(`ad8_terrain.${cle}`, opts);

  const [vendeurs, setVendeurs] = useState<FicheVendeur[]>([]);
  const [chargement, setChargement] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setVendeurs(await terrainApi.liste());
    } catch {
      toast.current(t('ad8_terrain.toast_error_load'), 'error');
    } finally {
      setChargement(false);
    }
  }, [t]);
  useEffect(() => { void charger(); }, [charger]);

  const pieces = (v: FicheVendeur) =>
    v.identite.verifiee ? k('identity_verified')
      : v.identite.peut_publier ? k('can_publish')
        : k('pieces_count', { n: Object.values(v.pieces).filter(Boolean).length });

  return (
    <div className="p-4 sm:p-6">
      <EnTete icon={Store} titre={k('list_title')} sousTitre={k('list_subtitle')} onRefresh={() => void charger()} chargement={chargement} />
      <button onClick={() => navigate('/admin/terrain/inscrire')}
        className="flex items-center gap-2 px-4 py-2.5 mb-5 rounded-xl text-sm font-bold" style={{ background: T.red, color: '#fff' }}>
        <UserPlus size={16} /> {k('register_button')}
      </button>
      <Section titre={k('list_section', { n: vendeurs.length })}>
        <Tableau
          entetes={[k('col_shop'), k('col_phone'), k('col_quartier'), k('col_status'), k('col_identity'), k('col_products'), k('col_date')]}
          vide={chargement ? '…' : k('list_empty')}
          lignes={vendeurs.map((v) => [
            <button key="b" onClick={() => navigate(`/admin/terrain/${v.id}`)} className="font-bold underline text-left" style={{ color: T.text }}>
              {v.boutique}
            </button>,
            v.telephone,
            v.quartier,
            k(`vendor_${v.statut}`),
            pieces(v),
            v.produits,
            dateCourte(v.inscrit_le),
          ])}
        />
      </Section>
    </div>
  );
}
