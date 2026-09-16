import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PfShellStyles } from "@/styles/pfShell";
import { OperatorLogo } from "./OperatorLogo";

export function PaymentMethodsStrip({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <PfShellStyles />
      <div style={{ padding: 13, borderRadius: 14, background: "var(--pf-s3)", border: "1px solid var(--pf-border)" }}>
        <div className="pf-sec" style={{ padding: 0 }}>{t("pm2_method_strip.accepted_methods")}</div>
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
          <div className="pf-muted-sm">{t("pm2_method_strip.escrow_protected")}</div>
        </div>
      )}
    </>
  );
}
