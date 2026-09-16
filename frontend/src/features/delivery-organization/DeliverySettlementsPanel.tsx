// frontend/src/features/delivery-organization/DeliverySettlementsPanel.tsx
//
// =============================================================================
//  L'ONGLET REGLEMENTS DE L'ENTREPRISE DE LIVRAISON
//
//  Remplace le contenu de `tab === "payments"`. Il conserve la structure
//  existante — quatre cartes puis des panneaux — et branche les vraies
//  donnees a la place des « 0 FCFA » en dur.
//
//  ─────────────────────────────────────────────────────────────────────────
//  CE QUI DISTINGUE LE TRANSPORTEUR DU POINT RELAIS
//
//  Sa part est prelevee sur les frais de livraison payes par l'acheteur.
//  Elle existe donc des le paiement — mais elle ne lui APPARTIENT qu'a la
//  preuve de livraison.
//
//  D'ou la section « pas encore acquis », que le relais n'a pas : l'argent
//  est la, il n'est pas encore a lui. Le lui presenter comme un solde serait
//  une promesse que le sequestre ne tient pas.
// =============================================================================

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle, CheckCircle2, Clock3, Lock, WalletCards,
} from "lucide-react";

import {
  countdown, formatLongDate, formatPeriod, formatShortDate, getDeliveryDue,
  humanizeBlocker, listDeliveryAdjustments, listDeliveryEscrow,
  listDeliveryPayouts, listDeliverySettlements, payoutLabel,
  type DeliveryAdjustment, type DeliveryAmountDue, type DeliveryEscrowHold,
  type DeliveryPayout, type DeliverySettlement,
} from "@/services/api/deliverySettlements";

type Locale = "fr" | "en";

const nf = (n: number) => n.toLocaleString("fr-FR");

interface Props {
  locale: Locale;
  /** Ou envoyer un partenaire dont le dossier bloque le versement. */
  onOpenSettings?: () => void;
}

export default function DeliverySettlementsPanel({
  locale, onOpenSettings,
}: Props) {
  const { t } = useTranslation();
  const [due, setDue] = useState<DeliveryAmountDue | null>(null);
  const [escrow, setEscrow] = useState<DeliveryEscrowHold[]>([]);
  const [adjustments, setAdjustments] = useState<DeliveryAdjustment[]>([]);
  const [settlements, setSettlements] = useState<DeliverySettlement[]>([]);
  const [payouts, setPayouts] = useState<DeliveryPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getDeliveryDue(),
      // Chaque appel secondaire retombe sur une liste vide : un onglet ne
      // doit pas disparaitre parce qu'une section n'a pas repondu.
      listDeliveryEscrow().catch(() => [] as DeliveryEscrowHold[]),
      listDeliveryAdjustments().catch(() => [] as DeliveryAdjustment[]),
      listDeliverySettlements().catch(() => [] as DeliverySettlement[]),
      listDeliveryPayouts().catch(() => [] as DeliveryPayout[]),
    ])
      .then(([d, e, a, s, p]) => {
        if (!mounted) return;
        setDue(d);
        setEscrow(e);
        setAdjustments(a);
        setSettlements(s);
        setPayouts(p);
      })
      .catch((exc: unknown) => {
        if (!mounted) return;
        setError(exc instanceof Error
          ? exc.message
          : t("do1_settlements_panel.error_load_failed"));
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [locale, t]);

  if (loading) {
    return (
      <Card>
        <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
          {t("do1_settlements_panel.loading")}
        </p>
      </Card>
    );
  }

  if (error || !due || !due.payee_code) {
    return (
      <Card>
        <p style={{ fontSize: 15, color: "#020617", margin: 0, fontWeight: 800 }}>
          {t("do1_settlements_panel.unavailable_title")}
        </p>
        <p style={{ fontSize: 13, color: "#64748B", margin: "6px 0 0", lineHeight: 1.6 }}>
          {error ?? t("do1_settlements_panel.unavailable_body_default")}
        </p>
      </Card>
    );
  }

  const blockers = Array.from(
    // Dedupliquer APRES traduction : le backend renvoie deux blocages
    // distincts — numero et operateur — qui se traduisent pareil.
    new Set(due.blockers.map((b) => humanizeBlocker(b, locale, t))),
  );
  const blocked = blockers.length > 0;

  const paidTotal = payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount_xaf, 0);
  const notYetMine = due.not_yet_due_xaf + due.frozen_xaf;
  const acquired = due.due_xaf + due.outstanding_debt_xaf;
  const lastPaid = payouts.find((p) => p.status === "PAID");

  // Les sequestres qui ne sont pas encore libres : c'est la specificite du
  // transporteur.
  const pending = escrow.filter(
    (h) => h.status === "HELD" || h.status === "FROZEN"
      || h.status === "RELEASE_SCHEDULED",
  );

  return (
    <div className="space-y-5">

      {/* ═══ QUATRE CARTES ══════════════════════════════════════════════ */}
      <section className="grid gap-4 md:grid-cols-4">
        <Metric
          icon={<WalletCards className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />}
          value={nf(due.due_xaf)}
          title={t("do1_settlements_panel.to_settle_title")}
          body={t("do1_settlements_panel.to_settle_body")}
        />
        <Metric
          icon={<CheckCircle2 className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />}
          value={nf(paidTotal)}
          title={t("do1_settlements_panel.paid_title")}
          body={lastPaid
            ? t("do1_settlements_panel.paid_body_last", {
              date: formatShortDate(lastPaid.settled_at, locale),
              msisdn: lastPaid.payee_msisdn_masked,
            })
            : t("do1_settlements_panel.paid_body_none")}
        />
        {blocked ? (
          <Metric
            icon={<AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            value={t("do1_settlements_panel.next_payout_suspended_value")}
            title={t("do1_settlements_panel.next_payout_title")}
            body={t("do1_settlements_panel.next_payout_suspended_body")}
            small
          />
        ) : (
          <Metric
            icon={<Clock3 className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />}
            value={formatLongDate(due.next_settlement_at, locale)
              || t("do1_settlements_panel.next_payout_on_threshold")}
            title={t("do1_settlements_panel.next_payout_title")}
            body={countdown(due.next_settlement_at, locale, t)
              || t("do1_settlements_panel.next_payout_waiting_minimum")}
            small
            accent
          />
        )}
        <Metric
          icon={<Lock className="h-5 w-5 text-slate-400" />}
          value={nf(notYetMine)}
          title={t("do1_settlements_panel.not_yours_yet_title")}
          body={t("do1_settlements_panel.not_yours_yet_body")}
        />
      </section>

      {/* ═══ BLOCAGES ═══════════════════════════════════════════════════ */}
      {/* Promettre un versement a un partenaire qui ne peut pas etre paye
          est deloyal — c'est le vendredi sans virement qui detruit la
          confiance. */}
      {blocked && (
        <div style={{
          background: "#FFF7ED", border: "1px solid #FED7AA",
          borderRadius: 18, padding: "18px 22px",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" style={{ marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, color: "#7C2D12", margin: "0 0 5px", fontWeight: 800 }}>
                {t("do1_settlements_panel.payout_suspended_title")}
              </p>
              {blockers.map((b) => (
                <p key={b} style={{
                  fontSize: 13, color: "#9A3412", margin: "0 0 6px", lineHeight: 1.6,
                }}>
                  {b}
                </p>
              ))}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  style={{
                    fontSize: 12.5, padding: "8px 15px", background: "#fff",
                    border: "1px solid #FDBA74", borderRadius: 10,
                    color: "#9A3412", fontWeight: 700, cursor: "pointer",
                    marginTop: 4,
                  }}
                >
                  {t("do1_settlements_panel.complete_file_button")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ DÉTAIL DU MONTANT ══════════════════════════════════════════ */}
      {/* `due_xaf` est deja net : l'afficher seul laisserait un chiffre
          inexplique, et un partenaire qui ne comprend pas son montant ouvre
          un litige. */}
      {due.outstanding_debt_xaf > 0 && (
        <PanelBox
          kicker={t("do1_settlements_panel.breakdown_kicker")}
          title={t("do1_settlements_panel.breakdown_title")}
        >
          <div style={{
            border: "1px solid #E2E8F0", borderRadius: 14,
            padding: "16px 18px", background: "#F8FAFC",
          }}>
            <Row
              label={t("do1_settlements_panel.breakdown_acquired_label")}
              value={nf(acquired)}
            />
            <Row
              label={t("do1_settlements_panel.breakdown_deduction_label")}
              value={`− ${nf(due.outstanding_debt_xaf)}`}
              red
            />
            <div style={{
              display: "flex", justifyContent: "space-between", paddingTop: 10,
            }}>
              <span style={{ fontSize: 13, color: "#020617", fontWeight: 800 }}>
                {t("do1_settlements_panel.breakdown_to_pay_label")}
              </span>
              <span style={{ fontSize: 16, color: "#020617", fontWeight: 900 }}>
                {nf(due.due_xaf)}{" "}
                <span style={{ fontSize: 11, color: "#94A3B8" }}>FCFA</span>
              </span>
            </div>
          </div>
        </PanelBox>
      )}

      {/* ═══ EN ATTENTE DE PREUVE ═══════════════════════════════════════ */}
      {pending.length > 0 && (
        <PanelBox
          kicker={t("do1_settlements_panel.awaiting_proof_kicker")}
          title={t("do1_settlements_panel.awaiting_proof_title")}
          lead={t("do1_settlements_panel.awaiting_proof_lead")}
        >
          <List>
            {pending.map((h, i) => {
              const frozen = h.status === "FROZEN";
              const scheduled = h.status === "RELEASE_SCHEDULED";
              return (
                <li
                  key={h.reference}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px",
                    borderBottom: i < pending.length - 1
                      ? "1px solid #F1F5F9" : "none",
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: frozen ? "#EF4444"
                      : scheduled ? "#0891B2" : "#CBD5E1",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* ─────────────────────────────────────────────────
                        UN SEQUESTRE TRANSPORT N'A PAS DE COMMANDE

                        Le composant transport est de niveau PAIEMENT : un
                        panier multi-vendeurs a plusieurs commandes mais UNE
                        seule livraison. `order_id` est donc nul, et
                        afficher « Commande #— » n'apprend rien.

                        On montre la reference du sequestre : elle est
                        verifiable et sert au support.
                        ───────────────────────────────────────────────── */}
                    <p style={{ fontSize: 13, color: "#020617", margin: 0, fontWeight: 800 }}>
                      {h.order_id
                        ? t("do1_settlements_panel.order_ref", { id: h.order_id })
                        : h.reference}
                    </p>
                    <p style={{
                      fontSize: 11.5, margin: "3px 0 0",
                      color: frozen ? "#B91C1C" : "#94A3B8",
                    }}>
                      {frozen
                        ? h.frozen_reason || t("do1_settlements_panel.frozen_reason_default")
                        : scheduled && h.release_at
                          // La date de liberation vaut mieux que celle de
                          // creation : c'est le jour ou l'argent devient sien.
                          ? t("do1_settlements_panel.available_on", { date: formatShortDate(h.release_at, locale) })
                          : `${formatShortDate(h.created_at, locale)} · ${h.status_label}`}
                      {/* La commission est prelevee sur SA part : il a le
                          droit de savoir. */}
                      {!frozen && h.commission_xaf > 0
                        && ` · ${t("do1_settlements_panel.commission_label")} ${nf(h.commission_xaf)}`}
                    </p>
                  </div>
                  {/* ─────────────────────────────────────────────────
                      TROIS ETATS, PAS DEUX

                      « preuve attendue » etait affiche meme sur un
                      sequestre RELEASE_SCHEDULED — dont la preuve est
                      justement VALIDEE. Un transporteur y lisait le
                      contraire de la realite.
                      ───────────────────────────────────────────────── */}
                  <span style={{
                    width: 130, textAlign: "right", fontSize: 11.5,
                    color: frozen ? "#B91C1C" : scheduled ? "#0E7490" : "#94A3B8",
                    fontWeight: frozen || scheduled ? 700 : 400,
                  }}>
                    {frozen
                      ? t("do1_settlements_panel.status_frozen")
                      : scheduled
                        ? t("do1_settlements_panel.status_release_scheduled")
                        : t("do1_settlements_panel.status_proof_awaited")}
                  </span>
                  <span style={{
                    width: 80, textAlign: "right", fontSize: 15,
                    color: "#020617", fontWeight: 800,
                  }}>
                    {nf(h.payable_xaf)}
                  </span>
                </li>
              );
            })}
          </List>
        </PanelBox>
      )}

      {/* ═══ RETENUES ═══════════════════════════════════════════════════ */}
      {adjustments.length > 0 && (
        <PanelBox
          kicker={t("do1_settlements_panel.deductions_kicker")}
          title={t("do1_settlements_panel.deductions_title")}
          lead={t("do1_settlements_panel.deductions_lead")}
        >
          <List>
            {adjustments.map((a, i) => {
              const deduction = a.direction === "CREDIT";
              return (
                <li
                  key={a.reference}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 13,
                    padding: "14px 16px",
                    borderBottom: i < adjustments.length - 1
                      ? "1px solid #F1F5F9" : "none",
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    marginTop: 6, background: deduction ? "#F59E0B" : "#10B981",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Le motif en premier : c'est ce qu'on veut lire. */}
                    <p style={{
                      fontSize: 13.5, color: "#020617", margin: 0,
                      fontWeight: 700, lineHeight: 1.5,
                    }}>
                      {a.reason}
                    </p>
                    <p style={{ fontSize: 11.5, color: "#94A3B8", margin: "4px 0 0" }}>
                      {a.category_label} · {formatShortDate(a.created_at, locale)}
                      {a.remaining_xaf > 0 && a.remaining_xaf !== a.amount_xaf
                        && ` · ${t("do1_settlements_panel.remaining_label")} ${nf(a.remaining_xaf)}`}
                      {a.remaining_xaf === 0
                        && ` · ${t("do1_settlements_panel.settled_label")}`}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 15, fontWeight: 800, whiteSpace: "nowrap",
                    color: deduction ? "#B91C1C" : "#065F46",
                  }}>
                    {deduction ? "− " : "+ "}{nf(a.amount_xaf)}
                  </span>
                </li>
              );
            })}
          </List>
        </PanelBox>
      )}

      {/* ═══ RAPPROCHEMENT ══════════════════════════════════════════════ */}
      <PanelBox
        kicker={t("do1_settlements_panel.reconciliation_kicker")}
        title={t("do1_settlements_panel.reconciliation_title")}
      >
        {settlements.length === 0 && payouts.length === 0 ? (
          <Empty>
            {t("do1_settlements_panel.reconciliation_empty")}
          </Empty>
        ) : (
          <List>
            {settlements.map((s, i) => (
              <li
                key={s.reference}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px",
                  borderBottom: i < settlements.length - 1 || payouts.length > 0
                    ? "1px solid #F1F5F9" : "none",
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: s.payout?.settled_at ? "#10B981" : "#F59E0B",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: "#020617", margin: 0, fontWeight: 800 }}>
                    {s.reference}
                  </p>
                  <p style={{ fontSize: 11.5, color: "#94A3B8", margin: "3px 0 0" }}>
                    {formatPeriod(s.period_start, s.period_end, locale, t)}
                    {s.lines.length > 0 && ` · ${s.lines.length} ${
                      t("do1_settlements_panel.deliveries_suffix")}`}
                    {s.payout && ` · ${t("do1_settlements_panel.ref_prefix")} ${s.payout.reference}`}
                  </p>
                </div>
                <span style={{
                  width: 115, textAlign: "right", fontSize: 11.5,
                  color: s.payout?.settled_at ? "#64748B" : "#B45309",
                  fontWeight: s.payout?.settled_at ? 400 : 700,
                }}>
                  {s.payout?.settled_at
                    ? t("do1_settlements_panel.paid_on", { date: formatShortDate(s.payout.settled_at, locale) })
                    : s.status_label}
                </span>
                <span style={{
                  width: 80, textAlign: "right", fontSize: 15,
                  color: "#020617", fontWeight: 800,
                }}>
                  {nf(s.net_amount_xaf)}
                </span>
              </li>
            ))}

            {/* Les versements a l'issue incertaine n'ont pas toujours de
                releve : on les montre a part plutot que de les taire. */}
            {payouts
              .filter((p) => p.status === "UNKNOWN" || p.status === "FAILED")
              .map((p, i, arr) => {
                const label = payoutLabel(p.status, locale, t);
                return (
                  <li
                    key={p.reference}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 16px",
                      borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none",
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      flexShrink: 0, background: label.color,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: "#020617", margin: 0, fontWeight: 800 }}>
                        {p.reference}
                      </p>
                      <p style={{ fontSize: 11.5, color: "#94A3B8", margin: "3px 0 0" }}>
                        {formatShortDate(p.requested_at, locale)}
                        {/* `UNKNOWN` n'est pas un echec : on ignore si
                            l'argent est parti, et le partenaire n'a rien
                            a faire. */}
                        {p.status === "UNKNOWN"
                          && ` · ${t("do1_settlements_panel.being_checked")}`}
                      </p>
                    </div>
                    <span style={{
                      width: 115, textAlign: "right", fontSize: 11.5,
                      color: label.color, fontWeight: 700,
                    }}>
                      {label.text}
                    </span>
                    <span style={{
                      width: 80, textAlign: "right", fontSize: 15,
                      color: "#020617", fontWeight: 800,
                    }}>
                      {nf(p.amount_xaf)}
                    </span>
                  </li>
                );
              })}
          </List>
        )}
      </PanelBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fragments — accordes au style cyan de l'espace livraison
// ─────────────────────────────────────────────────────────────────────────────

function Metric({ icon, value, title, body, small, accent }: {
  icon: React.ReactNode; value: string; title: string; body: string;
  small?: boolean; accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {icon}
      <div
        className="mt-4 font-black leading-none text-slate-950 dark:text-white"
        style={{ fontSize: small ? 17 : 22, lineHeight: small ? 1.2 : 1 }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-black uppercase leading-tight tracking-[0.1em] text-slate-500">
        {title}
      </div>
      <p
        className={accent
          ? "mt-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300"
          : "mt-1.5 text-xs leading-snug text-slate-500 dark:text-slate-400"}
      >
        {body}
      </p>
    </div>
  );
}

function PanelBox({ kicker, title, lead, children }: {
  kicker: string; title: string; lead?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">
        {kicker}
      </p>
      <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
        {title}
      </h3>
      {lead && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {lead}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return (
    <ul style={{
      listStyle: "none", margin: 0, padding: 0,
      border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden",
    }}>
      {children}
    </ul>
  );
}

function Row({ label, value, red }: {
  label: string; value: string; red?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      paddingBottom: 10, borderBottom: "1px solid #E2E8F0", marginBottom: 10,
    }}>
      <span style={{ fontSize: 13, color: red ? "#B91C1C" : "#475569" }}>
        {label}
      </span>
      <span style={{
        fontSize: 14, fontWeight: 800, color: red ? "#B91C1C" : "#020617",
      }}>
        {value}
      </span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: "1px dashed #E2E8F0", borderRadius: 14,
      padding: "26px 18px", textAlign: "center",
    }}>
      <p style={{
        fontSize: 13, color: "#94A3B8", margin: 0, lineHeight: 1.6,
        maxWidth: 440, marginLeft: "auto", marginRight: "auto",
      }}>
        {children}
      </p>
    </div>
  );
}
