// frontend/src/features/admin/d24/RemboursementsAutoPage.tsx
// Remboursements automatiques sans retour — BelivaY Admin (feuille de route D32, spec v2.1 R71).
// Chaque demande examinée est journalisée ; le plafond mensuel (r_auto_rmb_plafond_mois, 0 = fermé) se règle
// dans les réglages ; le retrait du droit d'un client est proposé par une personne et validé par une autre.

import { useCallback, useEffect, useRef, useState } from 'react';
import i18n from "@/i18n";
import { Undo2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';
import { EnTete, Section, Tableau, Tuile, Tuiles, dateCourte } from './ui';

interface Suivi {
  plafond_mois_xaf: number;
  rembourse_ce_mois_xaf: number;
  nombre_ce_mois: number;
  vendeurs_30j: { vendor__username: string | null; nombre: number; montant: number }[];
  cas: {
    id: number; commande: number; client: string; vendeur: string | null; article: string; statut: string;
    raison: string; total_xaf: number; le: string;
  }[];
  retraits: { id: number; client: string; motif: string; propose_par: string; valide_par: string | null; valide_le: string | null }[];
}

const F = (n: number) => `${n.toLocaleString('fr-FR')} F`;
const BASE = '/api/orders/admin/remboursements-auto/';

export default function RemboursementsAutoPage() {
  const { showToast } = useToast();
  const toast = useRef(showToast);
  useEffect(() => { toast.current = showToast; });
  const [data, setData] = useState<Suivi | null>(null);
  const [chargement, setChargement] = useState(false);
  const [client, setClient] = useState('');
  const [motif, setMotif] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setData(await http<Suivi>(BASE));
    } catch {
      toast.current(i18n.t("ad9.suivi_des_remboursements_automatiques_indi"), 'error');
    } finally {
      setChargement(false);
    }
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  const agir = async (url: string, body?: object) => {
    try {
      await http(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      await charger();
    } catch (e) {
      toast.current(e instanceof Error ? e.message : i18n.t("ad9.action_refusee"), 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <EnTete
        icon={Undo2}
        titre="Remboursements automatiques"
        sousTitre={i18n.t("ad9.sans_retour_du_colis_payes_par_belivay_r71")}
        onRefresh={() => void charger()}
        chargement={chargement}
      />
      {data && (
        <>
          <Tuiles>
            <Tuile libelle={i18n.t("ad9.plafond_du_mois_f_0_ferme")} valeur={data.plafond_mois_xaf} alerte={data.plafond_mois_xaf === 0} />
            <Tuile libelle={i18n.t("ad9.rembourse_ce_mois_f")} valeur={data.rembourse_ce_mois_xaf}
              alerte={data.plafond_mois_xaf > 0 && data.rembourse_ce_mois_xaf >= data.plafond_mois_xaf} />
            <Tuile libelle={i18n.t("ad9.remboursements_ce_mois")} valeur={data.nombre_ce_mois} />
          </Tuiles>

          <Section titre={i18n.t("ad9.vendeurs_dont_les_articles_cumulent_ces_re")}>
            <Tableau
              entetes={['Vendeur', 'Remboursements', 'Montant']}
              lignes={data.vendeurs_30j.map((v) => [v.vendor__username ?? '—', v.nombre, F(v.montant)])}
              vide={i18n.t("ad9.aucun_remboursement_automatique_sur_30_jou")}
            />
          </Section>

          <Section titre={i18n.t("ad9.demandes_examinees")}>
            <Tableau
              entetes={['Date', 'Commande', 'Client', 'Vendeur', 'Article', 'Décision', 'Montant']}
              lignes={data.cas.map((c) => [
                dateCourte(c.le), `#${c.commande}`, c.client, c.vendeur ?? '—', c.article,
                c.statut === 'REFUSE' ? `Traitement normal : ${c.raison}` : c.statut, F(c.total_xaf),
              ])}
              vide={i18n.t("ad9.aucune_demande_examinee")}
            />
          </Section>

          <Section titre={i18n.t("ad9.retirer_le_droit_a_un_client_pris_en_abus")}>
            <div className="mb-3 flex flex-wrap gap-2">
              <input className="rounded-lg border px-3 py-2" placeholder={i18n.t("ad9.identifiant_du_client")} value={client}
                onChange={(e) => setClient(e.target.value)} />
              <input className="min-w-0 flex-1 rounded-lg border px-3 py-2" placeholder="Motif" value={motif}
                onChange={(e) => setMotif(e.target.value)} />
              <button type="button" className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                disabled={!client.trim() || !motif.trim()}
                onClick={() => void agir(`${BASE}retraits/`, { client: client.trim(), motif: motif.trim() })}>
                Proposer
              </button>
            </div>
            <Tableau
              entetes={['Client', 'Motif', i18n.t("ad9.propose_par"), 'Validation']}
              lignes={data.retraits.map((r) => [
                r.client, r.motif, r.propose_par,
                r.valide_le ? `Validé par ${r.valide_par} le ${dateCourte(r.valide_le)}` : (
                  <button key={r.id} type="button" className="rounded-lg border px-3 py-1 font-semibold"
                    onClick={() => void agir(`${BASE}retraits/${r.id}/valider/`)}>
                    Valider (autre personne)
                  </button>
                ),
              ])}
              vide={i18n.t("ad9.aucun_droit_retire")}
            />
          </Section>
        </>
      )}
    </div>
  );
}
