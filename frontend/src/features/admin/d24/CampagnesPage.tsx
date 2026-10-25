// frontend/src/features/admin/d24/CampagnesPage.tsx
// Boost & Campagnes, partie campagnes — BelivaY Admin (feuille de route D9).
// Créer, valider et arrêter une promotion ou un Flash Deal. Le prix flash, le stock et le compte à rebours sont les
// mêmes pour tous (le serveur les sert) ; l'approbation d'un Flash Deal déclenche l'alerte flash des clients qui
// l'ont activée, selon leurs préférences. La partie « boost » reste pour la priorité 5.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { adminApi, type AdminPromotionCampaign } from '@/services/api/admin';
import { EnTete, Section, Tableau, Tuile, Tuiles, dateCourte } from './ui';

type Statut = AdminPromotionCampaign['status'];
const F = (n: number) => `${n.toLocaleString('fr-FR')} F`;
const STATUTS: Record<Statut, string> = {
  DRAFT: 'Brouillon', PENDING: 'À valider', APPROVED: 'Approuvée', REJECTED: 'Rejetée',
  SUSPENDED: 'Arrêtée', EXPIRED: 'Expirée',
};
const VIDE = { produit: '', type: 'FLASH' as 'FLASH' | 'REGULAR', titre: '', debut: '', fin: '', reference: '', promo: '', stock: '' };

export default function CampagnesPage() {
  const { showToast } = useToast();
  const toast = useRef(showToast);
  useEffect(() => { toast.current = showToast; });
  const [lignes, setLignes] = useState<AdminPromotionCampaign[]>([]);
  const [filtre, setFiltre] = useState<Statut | ''>('PENDING');
  const [chargement, setChargement] = useState(false);
  const [f, setF] = useState(VIDE);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const data = await adminApi.listPromotionCampaigns(filtre ? { status: filtre } : undefined);
      setLignes(Array.isArray(data) ? data : ((data as unknown as { results?: AdminPromotionCampaign[] }).results ?? []));
    } catch {
      toast.current('Campagnes indisponibles.', 'error');
    } finally {
      setChargement(false);
    }
  }, [filtre]);
  useEffect(() => { void charger(); }, [charger]);

  const agir = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.current(ok, 'success');
      await charger();
    } catch (e) {
      toast.current(e instanceof Error ? e.message : 'Action refusée.', 'error');
    }
  };

  const creer = () => agir(async () => {
    await adminApi.createProductCampaign(Number(f.produit), {
      campaign_type: f.type, title: f.titre.trim(),
      starts_at: new Date(f.debut).toISOString(), ends_at: new Date(f.fin).toISOString(),
      reference_price_xaf: Number(f.reference), promo_price_xaf: Number(f.promo),
      ...(f.type === 'FLASH' ? { stock_reserved: Number(f.stock) } : {}),
    });
    setF(VIDE);
  }, 'Campagne créée : elle attend la validation.');

  const decider = (c: AdminPromotionCampaign, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') => agir(
    () => adminApi.decidePromotionCampaign(c.id, {
      status, ...(status === 'REJECTED' ? { rejection_reason: window.prompt('Motif du rejet') || '' } : {}),
    }),
    status === 'APPROVED' ? 'Campagne validée.' : status === 'SUSPENDED' ? 'Campagne arrêtée.' : 'Campagne rejetée.',
  );

  const champ = (cle: keyof typeof VIDE, libelle: string, type = 'text') => (
    <label className="flex flex-col text-xs font-semibold">
      {libelle}
      <input className="mt-1 rounded-lg border px-3 py-2 text-sm font-normal" type={type} value={f[cle]}
        onChange={(e) => setF({ ...f, [cle]: e.target.value })} />
    </label>
  );

  const actives = lignes.filter((c) => c.status === 'APPROVED').length;
  return (
    <div className="p-4 sm:p-6">
      <EnTete icon={Zap} titre="Boost & Campagnes" sousTitre="Promotions et Flash Deals : créer, valider, arrêter"
        onRefresh={() => void charger()} chargement={chargement} />
      <Tuiles>
        <Tuile libelle="Dans cette liste" valeur={lignes.length} />
        <Tuile libelle="Approuvées" valeur={actives} />
      </Tuiles>

      <Section titre="Nouvelle campagne">
        <div className="grid gap-3 sm:grid-cols-4">
          {champ('produit', 'Identifiant du produit')}
          <label className="flex flex-col text-xs font-semibold">
            Type
            <select className="mt-1 rounded-lg border px-3 py-2 text-sm font-normal" value={f.type}
              onChange={(e) => setF({ ...f, type: e.target.value as 'FLASH' | 'REGULAR' })}>
              <option value="FLASH">Flash Deal</option>
              <option value="REGULAR">Promotion</option>
            </select>
          </label>
          {champ('titre', 'Titre')}
          {champ('debut', 'Début', 'datetime-local')}
          {champ('fin', 'Fin', 'datetime-local')}
          {champ('reference', 'Prix de référence (F)', 'number')}
          {champ('promo', 'Prix promo (F)', 'number')}
          {f.type === 'FLASH' && champ('stock', 'Stock réservé', 'number')}
        </div>
        <button type="button" className="mt-3 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          disabled={!f.produit || !f.titre.trim() || !f.debut || !f.fin || !f.reference || !f.promo || (f.type === 'FLASH' && !f.stock)}
          onClick={() => void creer()}>
          Créer
        </button>
      </Section>

      <Section titre="Campagnes">
        <div className="mb-3 flex flex-wrap gap-2">
          {(['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED', ''] as const).map((s) => (
            <button key={s || 'tout'} type="button" onClick={() => setFiltre(s)}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${filtre === s ? 'bg-orange-600 text-white' : ''}`}>
              {s ? STATUTS[s] : 'Toutes'}
            </button>
          ))}
        </div>
        <Tableau
          entetes={['Produit', 'Type', 'Période', 'Prix', 'Stock', 'Statut', '']}
          lignes={lignes.map((c) => [
            `${c.product_title} (#${c.product})`,
            c.campaign_type === 'FLASH' ? 'Flash Deal' : 'Promotion',
            `${dateCourte(c.starts_at)} → ${dateCourte(c.ends_at)}`,
            `${F(c.promo_price_xaf)} au lieu de ${F(c.reference_price_xaf)} (−${c.discount_percent} %)`,
            c.campaign_type === 'FLASH' ? `${c.stock_claimed} / ${c.stock_reserved}` : '—',
            STATUTS[c.status],
            <span key={c.id} className="flex flex-wrap gap-1">
              {c.status !== 'APPROVED' && c.status !== 'EXPIRED' && (
                <button type="button" className="rounded border px-2 py-1 text-xs font-semibold" onClick={() => void decider(c, 'APPROVED')}>Valider</button>
              )}
              {c.status === 'PENDING' && (
                <button type="button" className="rounded border px-2 py-1 text-xs font-semibold" onClick={() => void decider(c, 'REJECTED')}>Rejeter</button>
              )}
              {c.status === 'APPROVED' && (
                <button type="button" className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700" onClick={() => void decider(c, 'SUSPENDED')}>Arrêter</button>
              )}
            </span>,
          ])}
          vide="Aucune campagne."
        />
      </Section>
    </div>
  );
}
