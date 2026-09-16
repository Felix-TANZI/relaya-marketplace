// frontend/src/features/admin/operations/SupervisionPage.tsx
// Console de supervision — version minimale (proposition validée) :
// "deux listes suffisent — colis en retard, tournées non prises.
// Un tableau, pas un tableau de bord." + subvention par zone (sorties
// forcées, règle verrouillée n°11 : toute sortie forcée est journalisée).

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Gauge, PackageX, Clock3, PiggyBank } from 'lucide-react';
import { adminApi, type SupervisionDashboard } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

export default function SupervisionPage() {
  const { t } = useTranslation();
  const T = useAdminTheme();
  const { showToast } = useToast();
  const [data, setData] = useState<SupervisionDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    adminApi.getSupervisionDashboard()
      .then(setData)
      .catch(() => showToast(t('ad5b_supervision.toast_load_error'), 'error'))
      .finally(() => setLoading(false));
  }, [showToast, t]);

  useEffect(() => { load(); }, [load]);

  const thStyle: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 900, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, padding: '8px 10px', borderBottom: `1px solid ${T.border}` };
  const tdStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: T.text, padding: '10px', borderBottom: `1px solid ${T.border}` };

  return (
    <div style={{ minHeight: '100vh', background: T.page, padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: T.redB, color: T.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gauge size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: T.text, margin: 0 }}>{t('ad5b_supervision.title')}</h1>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.muted, margin: '2px 0 0' }}>
              {t('ad5b_supervision.subtitle')}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ background: T.card, borderRadius: 16, padding: 32, textAlign: 'center', color: T.muted, fontWeight: 600 }}>{t('ad5b_supervision.loading')}</div>
        ) : !data ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Colis en retard */}
            <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Clock3 size={16} color={T.red} />
                <h2 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: 0 }}>
                  {t('ad5b_supervision.late_shipments_title', { count: data.late_shipments_count })}
                </h2>
              </div>
              {data.late_shipments.length === 0 ? (
                <p style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>{t('ad5b_supervision.no_late_shipments')}</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{t('ad5b_supervision.col_order')}</th>
                        <th style={thStyle}>{t('ad5b_supervision.col_shipment')}</th>
                        <th style={thStyle}>{t('ad5b_supervision.col_status')}</th>
                        <th style={thStyle}>{t('ad5b_supervision.col_zone')}</th>
                        <th style={thStyle}>{t('ad5b_supervision.col_city')}</th>
                        <th style={thStyle}>{t('ad5b_supervision.col_delay')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.late_shipments.map((item) => (
                        <tr key={item.shipment_id}>
                          <td style={tdStyle}>
                            <a href={`/admin/operations/orders/${item.order_id}`} style={{ color: T.red, fontWeight: 800, textDecoration: 'none' }}>
                              #{item.order_id}
                            </a>
                          </td>
                          <td style={tdStyle}>#{item.shipment_id}</td>
                          <td style={tdStyle}>{item.status}</td>
                          <td style={tdStyle}>{item.zone || '—'}</td>
                          <td style={tdStyle}>{item.city}</td>
                          <td style={{ ...tdStyle, color: T.red, fontWeight: 800 }}>{t('ad5b_supervision.hours_unit', { count: item.hours_late })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Tournées non prises */}
            <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <PackageX size={16} color="#F59E0B" />
                <h2 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: 0 }}>
                  {t('ad5b_supervision.unclaimed_tournees_title', { count: data.unclaimed_tournees_count })}
                </h2>
              </div>
              {data.unclaimed_tournees.length === 0 ? (
                <p style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>{t('ad5b_supervision.no_unclaimed_tournees')}</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{t('ad5b_supervision.col_zone')}</th>
                        <th style={thStyle}>{t('ad5b_supervision.col_city')}</th>
                        <th style={thStyle}>{t('ad5b_supervision.col_shipment')}</th>
                        <th style={thStyle}>{t('ad5b_supervision.col_waiting_since')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.unclaimed_tournees.map((item) => (
                        <tr key={item.id}>
                          <td style={tdStyle}>{item.zone}</td>
                          <td style={tdStyle}>{item.city}</td>
                          <td style={tdStyle}>{item.colis_count}</td>
                          <td style={{ ...tdStyle, color: '#F59E0B', fontWeight: 800 }}>{t('ad5b_supervision.hours_unit', { count: item.waiting_hours })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Compteur de subvention par zone */}
            <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <PiggyBank size={16} color={T.text} />
                <h2 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: 0 }}>
                  {t('ad5b_supervision.subsidy_title')}
                </h2>
              </div>
              <p style={{ fontSize: 12, color: T.muted, marginTop: -4, marginBottom: 12 }}>
                {t('ad5b_supervision.subsidy_intro')}
              </p>
              {data.subsidy_by_zone.length === 0 ? (
                <p style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>{t('ad5b_supervision.no_forced_exits')}</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{t('ad5b_supervision.col_zone')}</th>
                        <th style={thStyle}>{t('ad5b_supervision.col_city')}</th>
                        <th style={thStyle}>{t('ad5b_supervision.col_forced_exits')}</th>
                        <th style={thStyle}>{t('ad5b_supervision.col_affected_shipments')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.subsidy_by_zone.map((item) => (
                        <tr key={item.zone_id}>
                          <td style={tdStyle}>{item.zone__name}</td>
                          <td style={tdStyle}>{item.zone__city}</td>
                          <td style={tdStyle}>{item.forced_exits}</td>
                          <td style={tdStyle}>{item.colis_perdus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
