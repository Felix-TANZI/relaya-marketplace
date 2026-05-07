import { CreditCard, Package, Percent, ShieldCheck } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';

const PLANS = [
  { key: 'FREE', label: 'Gratuit', fee: 12, monthly: '0 FCFA' },
  { key: 'STARTER', label: 'Starter', fee: 10, monthly: '9 900 FCFA' },
  { key: 'PRO', label: 'Pro', fee: 7, monthly: '24 900 FCFA' },
  { key: 'BUSINESS', label: 'Business', fee: 5, monthly: '59 900 FCFA' },
];

const CATEGORIES = [
  { name: 'Mode Femme / Homme', base: 1, volume: 'Élevé' },
  { name: 'Électronique & Téléphones', base: 2, volume: 'Très élevé' },
  { name: 'Beauté & Santé', base: 0, volume: 'Moyen' },
  { name: 'Maison & Déco', base: 1, volume: 'Moyen' },
  { name: 'Supermarché', base: -1, volume: 'Élevé' },
  { name: 'Sport & Loisirs', base: 0, volume: 'Moyen' },
  { name: 'Bébé & Enfant', base: 0, volume: 'Stable' },
];

export default function CommissionsPage() {
  const T = useAdminTheme();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text }}>
            Commissions par Catégorie
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: T.muted }}>
            Barème visible par paquet d'abonnement vendeur et famille de produits.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}>
          <ShieldCheck size={14} style={{ color: T.red }} />
          Référence interne admin
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <article key={plan.key} className="rounded-2xl p-4"
            style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: T.red + '12', color: T.red }}>
                <CreditCard size={17} />
              </div>
              <span style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>{plan.monthly}</span>
            </div>
            <h2 style={{ marginTop: 14, color: T.text, fontSize: 18, fontWeight: 800 }}>{plan.label}</h2>
            <p style={{ marginTop: 4, color: T.muted, fontSize: 12 }}>
              Commission standard à partir de <strong style={{ color: T.text }}>{plan.fee}%</strong>
            </p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
          <Package size={15} style={{ color: T.red }} />
          <h2 style={{ color: T.text, fontSize: 14, fontWeight: 800 }}>Table des commissions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: T.muted, fontSize: 11, textTransform: 'uppercase' }}>Catégorie</th>
                {PLANS.map((plan) => (
                  <th key={plan.key} style={{ padding: '12px 16px', textAlign: 'left', color: T.muted, fontSize: 11, textTransform: 'uppercase' }}>
                    {plan.label}
                  </th>
                ))}
                <th style={{ padding: '12px 16px', textAlign: 'left', color: T.muted, fontSize: 11, textTransform: 'uppercase' }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((category) => (
                <tr key={category.name} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '14px 16px', color: T.text, fontSize: 13, fontWeight: 700 }}>{category.name}</td>
                  {PLANS.map((plan) => (
                    <td key={plan.key} style={{ padding: '14px 16px' }}>
                      <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-black"
                        style={{ background: T.red + '10', color: T.red }}>
                        <Percent size={12} />
                        {Math.max(3, plan.fee + category.base)}%
                      </span>
                    </td>
                  ))}
                  <td style={{ padding: '14px 16px', color: T.muted, fontSize: 12, fontWeight: 700 }}>{category.volume}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
