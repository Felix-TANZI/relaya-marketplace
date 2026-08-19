import { ShieldCheck } from "lucide-react";
import { PfShellStyles } from "@/styles/pfShell";
import { OperatorLogo } from "./OperatorLogo";

export function PaymentMethodsStrip({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <PfShellStyles />
      <div style={{ padding: 13, borderRadius: 14, background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}>
        <div className="pf-sec" style={{ padding: 0 }}>Moyens acceptés</div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <OperatorLogo provider="MTN_MOMO" size={34} />
          <OperatorLogo provider="ORANGE_MONEY" size={34} />
          <OperatorLogo provider="VISA" size={34} />
          <OperatorLogo provider="MASTERCARD" size={34} />
        </div>
      </div>
      {!compact && (
        <div className="pf-info-note">
          <span className="pf-info-ic"><ShieldCheck size={15} /></span>
          <div className="pf-muted-sm">Paiement protégé par l'escrow BelivaY jusqu'à la réception de votre commande.</div>
        </div>
      )}
    </>
  );
}
