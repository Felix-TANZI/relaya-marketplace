// frontend/src/features/admin/finances/PlansPage.tsx
// Gestion des plans d'abonnement vendeurs — admin BelivaY
// Lecture + édition inline de chaque plan (prix, commission, features, trial)

import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard, RefreshCw, Save, Plus, Trash2,
  Check, TrendingUp, Package, Zap, Award,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Plan {
  id:                number;
  code:              'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
  name:              string;
  description:       string;
  price_monthly_xaf: number;
  price_annual_xaf:  number;
  commission_rate:   number;
  max_products:      number | null;
  max_boosts_month:  number;
  trial_days:        number;
  plan_duration_days:number;
  features:          string[];
  is_active:         boolean;
  display_order:     number;
  subscribers_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG VISUELLE
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_CFG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  FREE:     { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', icon: Package  },
  STARTER:  { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  icon: TrendingUp },
  PRO:      { color: '#F47920', bg: 'rgba(244,121,32,0.12)',  icon: Zap       },
  BUSINESS: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: Award     },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf = (n: number) =>
  n === 0 ? 'Gratuit' : `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// CARD PLAN ÉDITABLE
// ─────────────────────────────────────────────────────────────────────────────

function PlanCard({
  plan, onSave, saving, T,
}: {
  plan:   Plan;
  onSave: (id: number, data: Partial<Plan>) => void;
  saving: number | null;
  T:      ReturnType<typeof useAdminTheme>;
}) {
  const [edited, setEdited] = useState<Partial<Plan>>({});
  const [newFeature, setNewFeature] = useState('');
  const isDirty = Object.keys(edited).length > 0;

  const cfg  = PLAN_CFG[plan.code] ?? PLAN_CFG.FREE;
  const Icon = cfg.icon;

  const current = (field: keyof Plan) =>
    field in edited ? (edited as Record<string, unknown>)[field] : plan[field];

  const set = (field: keyof Plan, value: unknown) =>
    setEdited(e => ({ ...e, [field]: value }));

  const addFeature = () => {
    const f = newFeature.trim();
    if (!f) return;
    const currentFeatures = (current('features') as string[]) ?? [];
    set('features', [...currentFeatures, f]);
    setNewFeature('');
  };

  const removeFeature = (i: number) => {
    const currentFeatures = (current('features') as string[]) ?? [];
    set('features', currentFeatures.filter((_, idx) => idx !== i));
  };

  const handleSave = () => {
    onSave(plan.id, edited);
    setEdited({});
  };

  const inp: React.CSSProperties = {
    background: T.input, color: T.text,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: 10, padding: '8px 12px',
    fontSize: 13, outline: 'none', width: '100%',
    fontFamily: "'Plus Jakarta Sans',sans-serif",
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: T.card,
        border: `2px solid ${isDirty ? cfg.color + '60' : T.border}`,
        boxShadow: isDirty ? `0 0 0 1px ${cfg.color}20` : 'none',
      }}
    >
      {/* Header */}
      <div className="p-5" style={{ borderBottom: `1px solid ${T.border}`, background: cfg.bg }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cfg.color + '25', border: `1px solid ${cfg.color}40` }}>
              <Icon size={18} style={{ color: cfg.color }} />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.text }}>
                Plan {plan.name}
              </h3>
              <p style={{ fontSize: 11.5, color: T.muted }}>
                {plan.subscribers_count} abonné{plan.subscribers_count > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle actif */}
            <div
              onClick={() => set('is_active', !(current('is_active') as boolean))}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer text-[11.5px] font-semibold"
              style={{
                background: (current('is_active') as boolean) ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.08)',
                color:      (current('is_active') as boolean) ? '#10B981' : '#EF4444',
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
              {(current('is_active') as boolean) ? 'Actif' : 'Inactif'}
            </div>
          </div>
        </div>
      </div>

      {/* Corps */}
      <div className="p-5 space-y-4">

        {/* Description */}
        <div>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 5 }}>Description</label>
          <input
            type="text"
            value={current('description') as string ?? ''}
            onChange={e => set('description', e.target.value)}
            style={inp}
            onFocus={e => (e.target.style.borderColor = cfg.color)}
            onBlur={e  => (e.target.style.borderColor = T.inputBorder)}
          />
        </div>

        {/* Prix */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 5 }}>Prix mensuel (FCFA)</label>
            <input type="number" min="0" step="500"
              value={current('price_monthly_xaf') as number ?? 0}
              onChange={e => set('price_monthly_xaf', Number(e.target.value))}
              style={inp}
              onFocus={e => (e.target.style.borderColor = cfg.color)}
              onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
            <p style={{ fontSize: 10.5, color: cfg.color, marginTop: 3 }}>
              {fmtXaf(current('price_monthly_xaf') as number ?? 0)}
            </p>
          </div>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 5 }}>Prix annuel (FCFA)</label>
            <input type="number" min="0" step="1000"
              value={current('price_annual_xaf') as number ?? 0}
              onChange={e => set('price_annual_xaf', Number(e.target.value))}
              style={inp}
              onFocus={e => (e.target.style.borderColor = cfg.color)}
              onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
            <p style={{ fontSize: 10.5, color: T.muted, marginTop: 3 }}>
              {fmtXaf(current('price_annual_xaf') as number ?? 0)}
            </p>
          </div>
        </div>

        {/* Commission + limites */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 5 }}>Commission (%)</label>
            <div className="relative">
              <input type="number" min="0" max="50" step="0.5"
                value={current('commission_rate') as number ?? 0}
                onChange={e => set('commission_rate', Number(e.target.value))}
                style={inp}
                onFocus={e => (e.target.style.borderColor = cfg.color)}
                onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 13 }}>%</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 5 }}>Max produits (vide = illimité)</label>
            <input type="number" min="1"
              value={current('max_products') as number | null ?? ''}
              placeholder="Illimité"
              onChange={e => set('max_products', e.target.value === '' ? null : Number(e.target.value))}
              style={inp}
              onFocus={e => (e.target.style.borderColor = cfg.color)}
              onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
          </div>
        </div>

        {/* Boosts + Essai */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 5 }}>Boosts max/mois</label>
            <input type="number" min="0"
              value={current('max_boosts_month') as number ?? 0}
              onChange={e => set('max_boosts_month', Number(e.target.value))}
              style={inp}
              onFocus={e => (e.target.style.borderColor = cfg.color)}
              onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
          </div>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 5 }}>Jours d'essai gratuit</label>
            <input type="number" min="0"
              value={current('trial_days') as number ?? 0}
              onChange={e => set('trial_days', Number(e.target.value))}
              style={inp}
              onFocus={e => (e.target.style.borderColor = cfg.color)}
              onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
          </div>
        </div>

        {/* Features */}
        <div>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 8 }}>
            Fonctionnalités incluses
          </label>
          <div className="space-y-2 mb-3">
            {((current('features') as string[]) ?? []).map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check size={12} style={{ color: cfg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: T.text, flex: 1 }}>{f}</span>
                <button onClick={() => removeFeature(i)}
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newFeature}
              onChange={e => setNewFeature(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addFeature(); }}
              placeholder="Ajouter une fonctionnalité…"
              style={{ ...inp, flex: 1 }}
              onFocus={e => (e.target.style.borderColor = cfg.color)}
              onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
            <button onClick={addFeature}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, flexShrink: 0 }}>
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Bouton sauvegarder */}
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={saving === plan.id}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}
          >
            {saving === plan.id ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Sauvegarder le plan {plan.name}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();

  const [plans,   setPlans]  = useState<Plan[]>([]);
  const [loading, setLoading]= useState(true);
  const [saving,  setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await http<Plan[]>('/api/vendors/admin/plans/', { headers: authHeader() });
      setPlans(data);
    } catch {
      showToast('Erreur chargement des plans', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (planId: number, data: Partial<Plan>) => {
    setSaving(planId);
    try {
      await http(`/api/vendors/admin/plans/${planId}/`, {
        method: 'PATCH', headers: authHeader(), body: JSON.stringify(data),
      });
      showToast('Plan mis à jour', 'success');
      await load();
    } catch { showToast('Erreur sauvegarde', 'error'); }
    finally  { setSaving(null); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Plans & Abonnements
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            Configuration des offres vendeurs — prix, commission, limites et fonctionnalités
          </p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {/* ── Résumé des abonnés ─────────────────────────────────────────── */}
      {!loading && plans.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {plans.map(p => {
            const cfg  = PLAN_CFG[p.code] ?? PLAN_CFG.FREE;
            const Icon = cfg.icon;
            return (
              <div key={p.id} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} style={{ color: cfg.color }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase' }}>{p.name}</span>
                </div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1 }}>
                  {p.subscribers_count}
                </p>
                <p style={{ fontSize: 11, color: cfg.color, marginTop: 4 }}>
                  {fmtXaf(p.price_monthly_xaf)}/mois · {p.commission_rate}%
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Grille des plans ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {plans.map(p => (
            <PlanCard key={p.id} plan={p} onSave={handleSave} saving={saving} T={T} />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <CreditCard size={16} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>
          Les modifications de prix et de commission ne s'appliquent qu'aux <strong style={{ color: T.text }}>nouveaux abonnements</strong>.
          Les vendeurs déjà abonnés conservent leur tarif jusqu'au renouvellement.
        </p>
      </div>
    </div>
  );
}