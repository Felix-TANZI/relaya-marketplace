// frontend/src/features/admin/d24/PrestationsEntreprisesPage.tsx
// Prestations des entreprises de livraison — BelivaY Admin (spec v2.1, R53 ; décision du 27/10/2026 : la grille
// remplace la part du transport). Chaque prestation faite, son tarif de grille et la semaine de son versement du
// vendredi (R43.1). Une ligne à 0 F (grille absente, ligne bloquée R54.3) est à régler par l'équipe.

import { useCallback, useEffect, useRef, useState } from 'react';
import i18n from "@/i18n";
import { Truck } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';
import { EnTete, Section, Tableau, Tuile, Tuiles, dateCourte } from './ui';

interface Donnees {
  totaux: { organisation__company_name: string; versee_semaine: string; nombre: number; montant: number }[];
  lignes: {
    id: number; entreprise: string; commande: number | null; nature: string; param: string; quantite: number;
    tarif: number; montant: number; note: string; faite_le: string; versee_semaine: string;
  }[];
}

const F = (n: number) => `${n.toLocaleString('fr-FR')} F`;

export default function PrestationsEntreprisesPage() {
  const { showToast } = useToast();
  const toast = useRef(showToast);
  useEffect(() => { toast.current = showToast; });
  const [data, setData] = useState<Donnees | null>(null);
  const [aVerser, setAVerser] = useState(true);
  const [chargement, setChargement] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setData(await http<Donnees>(`/api/shipping/admin/prestations/${aVerser ? '?a_verser=1' : ''}`));
    } catch {
      toast.current('Prestations indisponibles.', 'error');
    } finally {
      setChargement(false);
    }
  }, [aVerser]);
  useEffect(() => { void charger(); }, [charger]);

  const aZero = data?.lignes.filter((l) => l.montant === 0).length ?? 0;
  return (
    <div className="p-4 sm:p-6">
      <EnTete icon={Truck} titre={i18n.t("ad9.prestations_des_entreprises")} sousTitre={i18n.t("ad9.payees_au_tarif_de_leur_grille_le_vendredi")}
        onRefresh={() => void charger()} chargement={chargement} />
      <label className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={aVerser} onChange={(e) => setAVerser(e.target.checked)} />{i18n.t("t06.seulement_ce_qui_reste_a_verser")}</label>
      {data && (
        <>
          <Tuiles>
            <Tuile libelle={i18n.t("ad9.prestations_listees")} valeur={data.lignes.length} />
            <Tuile libelle={i18n.t("ad9.a_0_f_a_regler")} valeur={aZero} alerte={aZero > 0} />
          </Tuiles>
          <Section titre={i18n.t("ad9.par_entreprise_et_par_vendredi")}>
            <Tableau entetes={['Entreprise', 'Vendredi', 'Prestations', 'Montant']}
              lignes={data.totaux.map((t) => [t.organisation__company_name, t.versee_semaine || 'À verser', t.nombre, F(t.montant)])}
              vide={i18n.t("ad9.aucune_prestation")} />
          </Section>
          <Section titre="Détail">
            <Tableau entetes={['Date', 'Entreprise', 'Commande', 'Prestation', 'Qté', 'Tarif', 'Montant', 'Note']}
              lignes={data.lignes.map((l) => [dateCourte(l.faite_le), l.entreprise, l.commande ? `#${l.commande}` : '—',
                `${l.nature} ${l.param}`.trim(), l.quantite, F(l.tarif), F(l.montant), l.note || '—'])}
              vide={i18n.t("ad9.aucune_prestation")} />
          </Section>
        </>
      )}
    </div>
  );
}
