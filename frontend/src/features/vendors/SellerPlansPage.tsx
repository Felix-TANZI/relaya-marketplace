// frontend/src/features/vendors/SellerPlansPage.tsx
// Page Plans & Tarifs — espace vendeur BelivaY.

import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard, RefreshCw, Check, Zap, Star,
  ChevronDown, ChevronUp, Phone, AlertTriangle, X,
} from 'lucide-react';
import { vendorsApi, type SubscriptionPlan, type PlansResponse } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';

const T = {
  orange: '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.12)',
  cream: '#F5F0E8', creamAlt: '#EDE7DC',
  white: '#FFFFFF', border: '#E8E2D9',
  text: '#1A1209', muted: '#7C6E5A', mutedL: '#B8A898',
  green: '#16A34A', greenL: 'rgba(22,163,74,0.10)', greenB: 'rgba(22,163,74,0.22)',
  red: '#DC2626', redL: 'rgba(220,38,38,0.10)',
  amber: '#D97706', amberL: 'rgba(217,119,6,0.10)',
  violet: '#7C3AED', violetL: 'rgba(124,58,237,0.10)',
  sidebar: '#1C1209',
};

function fmtXAF(n: number) { return Math.round(n).toLocaleString('fr-FR') + ' FCFA'; }

interface SubscriptionHistoryItem {
  id: number;
  plan_name: string;
  reference: string;
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  operator?: string | null;
  amount_paid_xaf: number;
  sub_status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED' | string;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// ─── CALCULATEUR ROI ─────────────────────────────────────────────────────────

function RoiCalculator() {
  const [sales, setSales] = useState(150000);
  const freeCommission    = sales * 0.10;
  const proCommission     = sales * 0.05;
  const proCost           = 9900;
  const saving            = freeCommission - proCommission - proCost;

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: `linear-gradient(135deg,${T.sidebar},#2A1C0E)`, color: T.white }}>
      <div>
        <p className="font-black text-[16px]" style={{ fontFamily: 'Poppins,sans-serif' }}>
          Calculez votre économie avec le Plan Pro
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Glissez pour estimer vos économies mensuelles
        </p>
      </div>
      <div>
        <div className="flex justify-between text-[12px] mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <span>Ventes mensuelles estimées</span>
          <span className="font-black" style={{ color: T.violet }}>{fmtXAF(sales)}</span>
        </div>
        <input type="range" min={10000} max={1000000} step={5000} value={sales}
          onChange={e => setSales(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: T.orange }}/>
      </div>
      <div className="rounded-xl p-4 space-y-2"
        style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="flex justify-between text-[12.5px]">
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Commission Gratuit (10%)</span>
          <span className="font-bold" style={{ color: T.red }}>-{fmtXAF(freeCommission)}</span>
        </div>
        <div className="flex justify-between text-[12.5px]">
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Commission Pro (5%) + abonnement</span>
          <span className="font-bold" style={{ color: T.amber }}>-{fmtXAF(proCommission + proCost)}</span>
        </div>
        <div className="h-px" style={{ background: 'rgba(255,255,255,0.12)' }}/>
        <div className="flex justify-between items-center">
          <span className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.7)' }}>Économie mensuelle avec Pro</span>
          <span className="font-black text-[16px]" style={{ color: saving > 0 ? T.green : T.red }}>
            {saving > 0 ? '+' : ''}{fmtXAF(saving)}
          </span>
        </div>
        {saving <= 0 && (
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Pour ce niveau de ventes, le plan Gratuit est plus avantageux.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── MODALE SOUSCRIPTION ─────────────────────────────────────────────────────

function SubscribeModal({
  plan, cycle, onClose, onSuccess,
}: {
  plan: SubscriptionPlan;
  cycle: 'MONTHLY' | 'ANNUAL';
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [operator, setOperator] = useState<'ORANGE_MONEY' | 'MTN_MOMO'>('ORANGE_MONEY');
  const [phone,    setPhone]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const amount = cycle === 'ANNUAL' ? plan.price_annual_xaf : plan.price_monthly_xaf;

  const handleSubmit = async () => {
    if (!phone.trim() || phone.replace(/\s/g,'').length < 9) {
      showToast('Entrez un numéro valide (9 chiffres)', 'error');
      return;
    }
    try {
      setLoading(true);
      const res = await vendorsApi.subscribePlan({
        plan_code:    plan.code,
        billing_cycle: cycle,
        operator,
        phone_number: phone.trim(),
      });
      showToast(res.message, 'success');
      onSuccess();
    } catch (e: unknown) {
      showToast(errorMessage(e, 'Erreur lors de la souscription'), 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(28,18,9,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: T.white }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
          <p className="font-black text-[15px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            Souscrire — {plan.name}
          </p>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.creamAlt }}>
            <X size={15} style={{ color: T.muted }}/>
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Résumé */}
          <div className="rounded-xl p-4" style={{ background: T.orangeL, border: `1px solid ${T.orangeB}` }}>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-[13.5px]" style={{ color: T.text }}>{plan.name}</p>
                <p className="text-[12px]" style={{ color: T.muted }}>
                  {cycle === 'ANNUAL' ? 'Annuel (2 mois offerts)' : 'Mensuel'}
                </p>
              </div>
              <p className="font-black text-[20px]" style={{ color: T.orange, fontFamily: 'Poppins,sans-serif' }}>
                {fmtXAF(amount)}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-xl p-4" style={{ background: T.amberL, border: `1px solid rgba(217,119,6,0.2)` }}>
            <p className="flex items-center gap-2 font-bold text-[12.5px] mb-2" style={{ color: T.amber }}>
              <AlertTriangle size={13}/> Comment ça marche
            </p>
            <ol className="space-y-1.5 text-[12px]" style={{ color: T.muted }}>
              <li>1. Choisissez votre opérateur Mobile Money</li>
              <li>2. Effectuez le paiement de <strong>{fmtXAF(amount)}</strong> vers le numéro BelivaY</li>
              <li>3. Entrez votre numéro et soumettez</li>
              <li>4. Un admin BelivaY confirme votre paiement sous 24h</li>
            </ol>
          </div>

          {/* Numéro BelivaY à payer */}
          <div>
            <p className="text-[12px] font-semibold mb-3" style={{ color: T.text }}>
              Envoyez le paiement vers :
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['ORANGE_MONEY','MTN_MOMO'] as const).map(op => (
                <button key={op} type="button" onClick={() => setOperator(op)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all"
                  style={{
                    background:  operator===op ? T.orangeL : T.cream,
                    borderColor: operator===op ? T.orange  : T.border,
                  }}>
                  <span className="text-2xl">{op==='ORANGE_MONEY' ? '🟠' : '🟡'}</span>
                  <span className="text-[12px] font-bold" style={{ color: T.text }}>
                    {op==='ORANGE_MONEY' ? 'Orange Money' : 'MTN MoMo'}
                  </span>
                  <span className="text-[11.5px] font-black" style={{ color: T.orange }}>
                    {op==='ORANGE_MONEY' ? '+237 695 000 000' : '+237 680 000 000'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Numéro expéditeur */}
          <div>
            <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
              Votre numéro {operator==='ORANGE_MONEY' ? 'Orange Money' : 'MTN MoMo'} (expéditeur)
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: T.cream, border: `1px solid ${T.border}` }}>
              <Phone size={13} style={{ color: T.mutedL }}/>
              <span className="text-[13px] font-semibold" style={{ color: T.muted }}>+237</span>
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,9))}
                placeholder="6XX XXX XXX" maxLength={9}
                className="flex-1 outline-none text-[13.5px] font-bold"
                style={{ background: 'transparent', color: T.text }}/>
            </div>
          </div>

          <button type="button" onClick={handleSubmit} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[13.5px] text-white disabled:opacity-50"
            style={{ background: T.orange, boxShadow: '0 4px 14px rgba(244,121,32,0.4)' }}>
            {loading
              ? <><RefreshCw size={14} className="animate-spin"/>Soumission…</>
              : <><Check size={14}/>J'ai effectué le paiement</>}
          </button>
          <p className="text-center text-[11px]" style={{ color: T.mutedL }}>
            Votre plan sera activé dans les 24h après vérification du paiement par notre équipe.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── CARTE PLAN ───────────────────────────────────────────────────────────────

function PlanCard({
  plan, cycle, isCurrent, onSubscribe,
}: {
  plan: SubscriptionPlan;
  cycle: 'MONTHLY' | 'ANNUAL';
  isCurrent: boolean;
  onSubscribe: (p: SubscriptionPlan) => void;
}) {
  const price = cycle === 'ANNUAL' ? plan.price_annual_xaf : plan.price_monthly_xaf;
  const isViolet = plan.code === 'BUSINESS';
  const border   = isCurrent ? T.green : plan.is_popular ? T.orange : isViolet ? T.violet : T.border;
  const topBg    = isCurrent ? T.greenL : plan.is_popular ? T.orangeL : isViolet ? T.violetL : T.cream;

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5"
      style={{ background: T.white, border: `2px solid ${border}`, boxShadow: isCurrent || plan.is_popular ? `0 6px 24px ${border}40` : 'none' }}>

      {/* Badge */}
      {(plan.is_popular || isCurrent) && (
        <div className="py-1.5 text-center text-[11px] font-bold text-white"
          style={{ background: isCurrent ? T.green : T.orange }}>
          {isCurrent ? '✓ Plan actuel' : '⚡ Plus populaire'}
        </div>
      )}

      <div className="p-5 space-y-4 flex-1">
        {/* Nom + Prix */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-black text-[16px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              {plan.name}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>{plan.description}</p>
          </div>
          <div className="text-right">
            {price === 0
              ? <p className="font-black text-[20px]" style={{ color: T.green, fontFamily: 'Poppins,sans-serif' }}>Gratuit</p>
              : <>
                  <p className="font-black text-[20px]" style={{ color: isViolet?T.violet:T.orange, fontFamily: 'Poppins,sans-serif' }}>
                    {fmtXAF(price)}
                  </p>
                  <p className="text-[10.5px]" style={{ color: T.mutedL }}>
                    /{cycle==='ANNUAL'?'an':'mois'}
                    {cycle==='ANNUAL' && <span style={{ color: T.green }}> (-17%)</span>}
                  </p>
                </>
            }
          </div>
        </div>

        {/* Stats clés */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2.5 text-center" style={{ background: topBg }}>
            <p className="font-bold text-[11px]" style={{ color: T.muted }}>Commission</p>
            <p className="font-black text-[15px]" style={{ color: isViolet?T.violet:T.orange, fontFamily: 'Poppins,sans-serif' }}>
              {plan.commission_rate}%
            </p>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ background: topBg }}>
            <p className="font-bold text-[11px]" style={{ color: T.muted }}>Produits max</p>
            <p className="font-black text-[15px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              {plan.max_products === null ? '∞' : plan.max_products}
            </p>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-2">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px]" style={{ color: T.muted }}>
              <Check size={13} className="flex-shrink-0 mt-0.5" style={{ color: isCurrent?T.green:plan.is_popular?T.orange:isViolet?T.violet:T.muted }}/>
              {f}
            </li>
          ))}
          {plan.max_boosts_month > 0 && (
            <li className="flex items-start gap-2 text-[12.5px]" style={{ color: T.muted }}>
              <Zap size={13} className="flex-shrink-0 mt-0.5" style={{ color: T.amber }}/>
              {plan.max_boosts_month} boost{plan.max_boosts_month>1?'s':''}/mois inclus
            </li>
          )}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        {isCurrent ? (
          <div className="w-full py-2.5 rounded-xl text-center text-[13px] font-bold"
            style={{ background: T.greenL, color: T.green, border: `1px solid ${T.greenB}` }}>
            <Check size={13} className="inline mr-1.5"/>Plan actuel
          </div>
        ) : plan.code === 'FREE' ? (
          <div className="w-full py-2.5 rounded-xl text-center text-[13px]"
            style={{ background: T.creamAlt, color: T.muted }}>
            Plan de base (toujours disponible)
          </div>
        ) : (
          <button type="button" onClick={() => onSubscribe(plan)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
            style={{ background: isViolet?T.violet:T.orange }}>
            <Star size={13}/> Choisir ce plan
          </button>
        )}
      </div>
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = [
  { q: 'Puis-je changer de plan à tout moment ?', a: 'Oui. Votre plan actuel reste actif jusqu\'à expiration. Vous pouvez initier une nouvelle souscription à tout moment.' },
  { q: 'Comment la commission est-elle prélevée ?', a: 'La commission est déduite automatiquement de chaque vente lors de la libération de l\'escrow. Vous recevez le montant net directement sur votre compte BelivaY.' },
  { q: 'Que se passe-t-il si mon plan expire ?', a: 'Vous revenez automatiquement sur le plan Gratuit. Vos produits et commandes ne sont pas affectés, seule la commission standard s\'applique.' },
  { q: 'Le paiement est-il sécurisé ?', a: 'Oui. Vous payez via votre compte Mobile Money habituel (Orange ou MTN). Notre équipe vérifie le paiement manuellement sous 24h.' },
  { q: 'Puis-je obtenir un remboursement ?', a: 'Les plans sont non remboursables une fois activés. En cas de problème technique, contactez notre support à support@belivay.com.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0" style={{ borderColor: T.border }}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-3">
        <p className="font-semibold text-[13px]" style={{ color: T.text }}>{q}</p>
        {open ? <ChevronUp size={14} style={{ color: T.muted, flexShrink:0 }}/> : <ChevronDown size={14} style={{ color: T.muted, flexShrink:0 }}/>}
      </button>
      {open && <p className="pb-4 text-[12.5px] leading-relaxed" style={{ color: T.muted }}>{a}</p>}
    </div>
  );
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function SellerPlansPage() {
  const { showToast } = useToast();
  const [data,       setData]       = useState<PlansResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [cycle,      setCycle]      = useState<'MONTHLY'|'ANNUAL'>('MONTHLY');
  const [modalPlan,  setModalPlan]  = useState<SubscriptionPlan | null>(null);
  const [history,    setHistory]    = useState<SubscriptionHistoryItem[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [plans, hist] = await Promise.all([
        vendorsApi.getPlans(),
        vendorsApi.getSubscriptionHistory(),
      ]);
      setData(plans);
      setHistory(hist as SubscriptionHistoryItem[]);
    } catch { showToast('Erreur de chargement', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }}/>
    </div>
  );

  return (
    <div className="space-y-6 pb-10 max-w-5xl mx-auto">

      {/* EN-TÊTE */}
      <div>
        <h1 className="flex items-center gap-2 font-black text-[22px]"
          style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
          <CreditCard size={20} style={{ color: T.orange }}/> Plans & Abonnements
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
          Choisissez le plan adapté à votre croissance
        </p>
      </div>

      {/* PLAN ACTUEL */}
      {data && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl"
          style={{ background: T.greenL, border: `1px solid ${T.greenB}` }}>
          <Check size={16} style={{ color: T.green, flexShrink: 0 }}/>
          <div>
            <p className="font-bold text-[13.5px]" style={{ color: T.green }}>
              Plan actuel : {data.current_plan.name}
            </p>
            {data.current_plan.expires_at && (
              <p className="text-[12px]" style={{ color: T.muted }}>
                Expire le {new Date(data.current_plan.expires_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ROI CALCULATOR */}
      <RoiCalculator/>

      {/* TOGGLE MENSUEL/ANNUEL */}
      <div className="flex items-center justify-center gap-4">
        <span className="text-[13px] font-semibold" style={{ color: cycle==='MONTHLY'?T.text:T.muted }}>Mensuel</span>
        <button type="button" onClick={() => setCycle(c => c==='MONTHLY'?'ANNUAL':'MONTHLY')}
          className="w-14 h-7 rounded-full transition-all relative"
          style={{ background: cycle==='ANNUAL' ? T.orange : T.border }}>
          <span className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
            style={{ left: cycle==='ANNUAL' ? '32px' : '2px' }}/>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold" style={{ color: cycle==='ANNUAL'?T.text:T.muted }}>Annuel</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: T.greenL, color: T.green }}>2 mois offerts</span>
        </div>
      </div>

      {/* GRILLE PLANS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {data?.plans.map(plan => (
          <PlanCard
            key={plan.code}
            plan={plan}
            cycle={cycle}
            isCurrent={plan.code === data.active_plan_code}
            onSubscribe={setModalPlan}
          />
        ))}
      </div>

      {/* HISTORIQUE SOUSCRIPTIONS */}
      {history.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: T.white, border: `1px solid ${T.border}` }}>
          <div className="px-5 py-4" style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
            <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              Historique de vos abonnements
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: T.border }}>
            {history.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3.5 gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-[13px]" style={{ color: T.text }}>{s.plan_name}</p>
                  <p className="text-[11.5px]" style={{ color: T.muted }}>
                    {s.reference} · {s.billing_cycle === 'ANNUAL' ? 'Annuel' : 'Mensuel'} · {s.operator?.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[13px]" style={{ color: T.text }}>
                    {fmtXAF(s.amount_paid_xaf)}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: s.sub_status==='ACTIVE'?T.greenL:s.sub_status==='PENDING'?T.amberL:T.creamAlt,
                      color:      s.sub_status==='ACTIVE'?T.green :s.sub_status==='PENDING'?T.amber  :T.muted,
                    }}>
                    {s.sub_status==='ACTIVE'?'Actif':s.sub_status==='PENDING'?'En attente':s.sub_status==='EXPIRED'?'Expiré':'Annulé'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: T.white, border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4" style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
          <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            Questions fréquentes
          </p>
        </div>
        <div className="px-5">
          {FAQ.map((item, i) => <FaqItem key={i} q={item.q} a={item.a}/>)}
        </div>
      </div>

      {/* MODAL SOUSCRIPTION */}
      {modalPlan && (
        <SubscribeModal
          plan={modalPlan}
          cycle={cycle}
          onClose={() => setModalPlan(null)}
          onSuccess={() => { setModalPlan(null); load(); }}
        />
      )}
    </div>
  );
}
