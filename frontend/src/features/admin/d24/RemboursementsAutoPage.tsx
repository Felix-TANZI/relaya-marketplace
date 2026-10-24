// frontend/src/features/admin/d24/RemboursementsAutoPage.tsx
// Remboursements automatiques sans retour — BelivaY Admin (feuille de route D32, spec v2.1 R71).
// Chaque demande examinée est journalisée ; le plafond mensuel (r_auto_rmb_plafond_mois, 0 = fermé) se règle
// dans les réglages ; le retrait du droit d'un client est proposé par une personne et validé par une autre.

import { useCallback, useEffect, useRef, useState } from 'react';
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
      toast.current('Suivi des remboursements automatiques indisponible.', 'error');
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
      toast.current(e instanceof Error ? e.message : 'Action refusée.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <EnTete
        icon={Undo2}
        titre="Remboursements automatiques"
        sousTitre="Sans retour du colis, payés par BelivaY (R71) — chaque demande examinée est journalisée"
        onRefresh={() => void charger()}
        chargement={chargement}
      />
      {data && (
        <>
          <Tuiles>
            <Tuile libelle="Plafond du mois (F, 0 = fermé)" valeur={data.plafond_mois_xaf} alerte={data.plafond_mois_xaf === 0} />
            <Tuile libelle="Remboursé ce mois (F)" valeur={data.rembourse_ce_mois_xaf}
              alerte={data.plafond_mois_xaf > 0 && data.rembourse_ce_mois_xaf >= data.plafond_mois_xaf} />
            <Tuile libelle="Remboursements ce mois" valeur={data.nombre_ce_mois} />
          </Tuiles>

          <Section titre="Vendeurs dont les articles cumulent ces remboursements (30 jours)">
            <Tableau
              entetes={['Vendeur', 'Remboursements', 'Montant']}
              lignes={data.vendeurs_30j.map((v) => [v.vendor__username ?? '—', v.nombre, F(v.montant)])}
              vide="Aucun remboursement automatique sur 30 jours."
            />
          </Section>

          <Section titre="Demandes examinées">
            <Tableau
              entetes={['Date', 'Commande', 'Client', 'Vendeur', 'Article', 'Décision', 'Montant']}
              lignes={data.cas.map((c) => [
                dateCourte(c.le), `#${c.commande}`, c.client, c.vendeur ?? '—', c.article,
                c.statut === 'REFUSE' ? `Traitement normal : ${c.raison}` : c.statut, F(c.total_xaf),
              ])}
              vide="Aucune demande examinée."
            />
          </Section>

          <Section titre="Retirer le droit à un client pris en abus (il garde le retour normal)">
            <div className="mb-3 flex flex-wrap gap-2">
              <input className="rounded-lg border px-3 py-2" placeholder="Identifiant du client" value={client}
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
              entetes={['Client', 'Motif', 'Proposé par', 'Validation']}
              lignes={data.retraits.map((r) => [
                r.client, r.motif, r.propose_par,
                r.valide_le ? `Validé par ${r.valide_par} le ${dateCourte(r.valide_le)}` : (
                  <button key={r.id} type="button" className="rounded-lg border px-3 py-1 font-semibold"
                    onClick={() => void agir(`${BASE}retraits/${r.id}/valider/`)}>
                    Valider (autre personne)
                  </button>
                ),
              ])}
              vide="Aucun droit retiré."
            />
          </Section>
        </>
      )}
    </div>
  );
}
