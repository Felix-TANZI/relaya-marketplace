// frontend/src/features/payments/OperatorLogo.tsx
import type { PaymentProvider } from "@/services/api/payments";

type Props = { provider: PaymentProvider | "CARD" | "VISA" | "MASTERCARD"; size?: number; className?: string };

/** Logos opérateurs réels. MTN & Orange : PNG de marque dans /public/logos. */
export function OperatorLogo({ provider, size = 46, className = "" }: Props) {
  const box: React.CSSProperties = {
    width: size,
    height: size,
    flex: "none",
    borderRadius: Math.round(size * 0.3),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  if (provider === "MTN_MOMO") {
    return (
      <span className={className} style={{ ...box, background: "#FFCC00", boxShadow: "0 8px 18px rgba(255,204,0,.4)" }}>
        <img src="/logos/mtn-momo.png" alt="MTN Mobile Money" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </span>
    );
  }

  if (provider === "ORANGE_MONEY") {
    return (
      <span className={className} style={{ ...box, background: "#fff", boxShadow: "0 8px 18px rgba(255,121,0,.28)" }}>
        <img src="/logos/orange-money.png" alt="Orange Money" style={{ width: "82%", height: "82%", objectFit: "contain" }} />
      </span>
    );
  }

  // Visa seul — pastille autonome, au meme titre que MTN et Orange.
  if (provider === "VISA") {
    return (
      <span className={className} style={{ ...box, background: "#fff", border: "1px solid rgba(0,0,0,.08)" }}>
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="#1434CB" aria-label="Visa">
          <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" />
        </svg>
      </span>
    );
  }

  // Mastercard seul — pastille autonome.
  if (provider === "MASTERCARD") {
    return (
      <span className={className} style={{ ...box, background: "#fff", border: "1px solid rgba(0,0,0,.08)" }}>
        <svg width={size * 0.66} height={size * 0.4} viewBox="0 0 36 22" aria-label="Mastercard">
          <circle cx="14" cy="11" r="9" fill="#EB001B" />
          <circle cx="22" cy="11" r="9" fill="#F79E1B" fillOpacity=".9" />
        </svg>
      </span>
    );
  }

  // Carte bancaire : Visa + Mastercard vectoriels
  return (
    <span className={className} style={{ ...box, background: "#fff", border: "1px solid rgba(0,0,0,.08)", gap: 3 }}>
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="#1434CB" aria-label="Visa">
        <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" />
      </svg>
      <svg width={size * 0.42} height={size * 0.26} viewBox="0 0 36 22" aria-label="Mastercard">
        <circle cx="14" cy="11" r="9" fill="#EB001B" />
        <circle cx="22" cy="11" r="9" fill="#F79E1B" fillOpacity=".9" />
      </svg>
    </span>
  );
}
