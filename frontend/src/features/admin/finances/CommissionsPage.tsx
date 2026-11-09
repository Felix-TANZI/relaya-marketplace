import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Percent, ShieldCheck } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { adminApi } from '@/services/api/admin';

// DEV-SRV-01, T09 (décision du porteur du 2026-11-08) : la page montrait des plans inventés (9 900 / 24 900 /
// 59 900 F) et une table de commissions par catégorie inventée. Elle lit maintenant les vrais plans (ceux que
// l'abonnement facture, créés par charger_reference, réglés dans l'admin Django). Le taux stocké sur un plan n'est
// pas affiché : la commission réelle se calcule par sous-commande selon les règles (apps/orders/commission.py).

interface Plan {
  id: number;
  code: string;
  name: string;
  price_monthly_xaf: number;
  price_annual_xaf: number;
  is_active?: boolean;
  subscribers_count?: number;
}

const prix = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

export default function CommissionsPage() {
  const T = useAdminTheme();
  const { t } = useTranslation();
  const k = (cle: string, opts?: Record<string, unknown>) => t(`ad6_fin_commissions.${cle}`, opts);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    adminApi.listPlans()
      .then((reponse) => setPlans((reponse as Plan[]) ?? []))
      .catch(() => setErreur(true));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text }}>{k('title')}</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: T.muted }}>{k('subtitle')}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}>
          <ShieldCheck size={14} style={{ color: T.red }} />
          {k('internal_reference')}
        </div>
      </div>

      {erreur ? <p style={{ color: T.red, fontSize: 13 }}>{k('load_error')}</p> : null}
      {plans && plans.length === 0 ? <p style={{ color: T.muted, fontSize: 13 }}>{k('empty')}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(plans ?? []).map((plan) => (
          <article key={plan.id} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: T.red + '12', color: T.red }}>
                <CreditCard size={17} />
              </div>
              <span style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>
                {plan.is_active === false ? k('inactive') : k('subscribers', { count: plan.subscribers_count ?? 0 })}
              </span>
            </div>
            <h2 style={{ marginTop: 14, color: T.text, fontSize: 18, fontWeight: 800 }}>{plan.name}</h2>
            <p style={{ marginTop: 4, color: T.text, fontSize: 13, fontWeight: 700 }}>{k('per_month', { price: prix(plan.price_monthly_xaf) })}</p>
            <p style={{ marginTop: 2, color: T.muted, fontSize: 12 }}>{k('per_year', { price: prix(plan.price_annual_xaf) })}</p>
          </article>
        ))}
      </div>

      <section className="flex items-start gap-3 rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <Percent size={16} style={{ color: T.red, marginTop: 2 }} />
        <p style={{ color: T.text, fontSize: 13 }}>{k('commission_note')}</p>
      </section>
    </div>
  );
}
