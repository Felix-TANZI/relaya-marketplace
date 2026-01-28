import type { ReactNode } from "react";
import { Link, useLoaderData } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CreditCard, Truck } from "lucide-react";
import type { Shipment } from "@/services/api/shipping";
import type { OrderDetail } from "@/services/api/orders";
import type { PaymentTransaction } from "@/services/api/payments";

/**
 * Les données arrivent depuis le loader du router (donc pas de fetch ici).
 * Cela réduit les bugs et évite les useEffect inutiles.
 */
type LoaderData = {
  order: OrderDetail;
  payments: PaymentTransaction[];
  shipment: Shipment | null;
};

function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgb(var(--border))",
        background: "rgb(var(--card))",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {label}
    </span>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid rgb(var(--border))",
        borderRadius: 18,
        padding: 16,
        background: "rgb(var(--card))",
        boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {icon}
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function toXaf(amount: number) {
  return `${amount.toLocaleString()} FCFA`;
}

export default function OrderDetailPage() {
  const { order, payments, shipment } = useLoaderData() as LoaderData;
  const { t } = useTranslation();

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* =========================
          HEADER
         ========================= */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>
            {t("orders.title", "Commande")} #{order.id}
          </h1>
          <div style={{ color: "rgb(var(--muted))", fontSize: 13, marginTop: 4 }}>
            {t("orders.status", "Statut")} : <strong>{order.status}</strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge label={`Order: ${order.status}`} />
          {shipment ? (
            <Badge label={`Shipping: ${shipment.status}`} />
          ) : (
            <Badge label="Shipping: N/A" />
          )}
          {payments.length > 0 ? (
            <Badge label={`Payments: ${payments.length}`} />
          ) : (
            <Badge label="Payments: 0" />
          )}
        </div>
      </div>

      {/* =========================
          TRACKING LIVRAISON
         ========================= */}
      <Card
        title={t("shipping.tracking", "Suivi de livraison")}
        icon={<Truck size={18} />}
      >
        {!shipment && (
          <div style={{ color: "rgb(var(--muted))", lineHeight: 1.5 }}>
            {t(
              "shipping.notStarted",
              "La livraison n’a pas encore été créée pour cette commande."
            )}
            <div style={{ marginTop: 10, fontSize: 13 }}>
              Astuce (dev): crée un shipment dans Swagger (Shipping → create), puis ajoute des events.
            </div>
          </div>
        )}

        {shipment && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>
                  {t("shipping.status", "Statut")}
                </div>
                <div style={{ fontWeight: 900 }}>{shipment.status}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>
                  {t("shipping.courier", "Livreur")}
                </div>
                <div style={{ fontWeight: 700 }}>
                  {shipment.courier_name
                    ? `${shipment.courier_name}${
                        shipment.courier_phone ? ` (${shipment.courier_phone})` : ""
                      }`
                    : t("shipping.notAssigned", "Non assigné")}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>
                  {t("shipping.createdAt", "Créé")}
                </div>
                <div style={{ fontWeight: 700 }}>{formatDate(shipment.created_at)}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>
                  {t("shipping.updatedAt", "Mis à jour")}
                </div>
                <div style={{ fontWeight: 700 }}>{formatDate(shipment.updated_at)}</div>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginBottom: 10 }}>
                {t("shipping.timeline", "Timeline")}
              </div>

              {shipment.events.length === 0 && (
                <div style={{ color: "rgb(var(--muted))" }}>
                  {t("shipping.noEvents", "Aucun événement de suivi pour l’instant.")}
                </div>
              )}

              {shipment.events.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    borderLeft: "3px solid rgb(var(--border))",
                    paddingLeft: 14,
                  }}
                >
                  {shipment.events.map((ev) => (
                    <div key={ev.id} style={{ position: "relative" }}>
                      <div
                        style={{
                          position: "absolute",
                          left: -22,
                          top: 2,
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "rgb(var(--text))",
                        }}
                      />
                      <div style={{ fontWeight: 900 }}>{ev.status}</div>
                      <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 2 }}>
                        {formatDate(ev.created_at)}
                        {ev.location ? ` • ${ev.location}` : ""}
                      </div>
                      {ev.message && <div style={{ marginTop: 4 }}>{ev.message}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* =========================
          PAIEMENTS
         ========================= */}
      <Card title={t("payments.title", "Paiements")} icon={<CreditCard size={18} />}>
        {payments.length === 0 && (
          <div style={{ color: "rgb(var(--muted))" }}>
            {t("payments.none", "Aucun paiement enregistré")}
          </div>
        )}

        {payments.length > 0 && (
          <div style={{ display: "grid", gap: 8 }}>
            {payments.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid rgb(var(--border))",
                  borderRadius: 14,
                  padding: "10px 12px",
                  background: "rgb(var(--bg))",
                  fontSize: 14,
                }}
              >
                <div style={{ display: "grid" }}>
                  <strong>
                    {p.provider} • {p.status}
                  </strong>
                  <span style={{ color: "rgb(var(--muted))", fontSize: 12 }}>
                    {t("payments.txId", "Transaction")} : #{p.id}
                  </span>
                </div>
                <strong>{toXaf(p.amount_xaf)}</strong>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ marginTop: 6 }}>
        <Link to="/" style={{ fontWeight: 900 }}>
          ← {t("common.back", "Retour à l’accueil")}
        </Link>
      </div>
    </div>
  );
}
