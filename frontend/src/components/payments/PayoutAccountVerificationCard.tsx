import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, Phone, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { http } from "@/services/api/http";
import { CAMEROON, detectOperator, formatNational, isValidNationalNumber, toE164, toNationalNumber } from "@/lib/phone";

export type PayoutOwnerRole = "VENDOR" | "COURIER" | "DELIVERY_ORGANIZATION" | "RELAY_POINT";

type PayoutAccount = {
  id: number;
  owner_role: PayoutOwnerRole;
  label: string;
  phone_e164: string;
  national_number: string;
  operator: string;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "DISABLED";
  is_primary: boolean;
  masked_phone: string;
  verified_at: string | null;
  dev_code?: string;
};

const ROLE_LABEL: Record<PayoutOwnerRole, string> = {
  VENDOR: "vendeur",
  COURIER: "livreur",
  DELIVERY_ORGANIZATION: "organisation de livraison",
  RELAY_POINT: "point relais",
};

const OPERATOR_LABEL: Record<string, string> = {
  MTN_MOMO: "MTN MoMo",
  ORANGE_MONEY: "Orange Money",
  MTN: "MTN MoMo",
  ORANGE: "Orange Money",
};

function statusLabel(status: PayoutAccount["status"]) {
  if (status === "VERIFIED") return "Vérifié";
  if (status === "DISABLED") return "Désactivé";
  return "Code requis";
}

export function PayoutAccountVerificationCard({
  ownerRole,
  accent = "#16A34A",
  surfaceClassName = "",
}: {
  ownerRole: PayoutOwnerRole;
  accent?: string;
  surfaceClassName?: string;
}) {
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [pendingAccount, setPendingAccount] = useState<PayoutAccount | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");

  const national = toNationalNumber(phone);
  const operator = detectOperator(national);
  const isPhoneValid = national.length === 0 || isValidNationalNumber(national, CAMEROON);
  const verifiedAccount = useMemo(
    () => accounts.find((account) => account.owner_role === ownerRole && account.status === "VERIFIED"),
    [accounts, ownerRole],
  );
  const roleLabel = ROLE_LABEL[ownerRole];

  const load = async () => {
    setLoading(true);
    try {
      const data = await http<PayoutAccount[]>("/api/auth/payout-accounts/");
      const roleAccounts = data.filter((account) => account.owner_role === ownerRole);
      setAccounts(roleAccounts);
      setPendingAccount(roleAccounts.find((account) => account.status === "PENDING_VERIFICATION") ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de charger les comptes de versement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerRole]);

  const requestCode = async () => {
    if (!isValidNationalNumber(national, CAMEROON)) {
      setMessage("Entrez un numéro camerounais valide avant de demander le code.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const account = await http<PayoutAccount & { dev_code?: string }>("/api/auth/payout-accounts/", {
        method: "POST",
        body: JSON.stringify({
          owner_role: ownerRole,
          phone: toE164(national),
          label: label.trim() || `Compte ${roleLabel}`,
          is_primary: true,
        }),
      });
      setPendingAccount(account);
      setAccounts((current) => [account, ...current.filter((item) => item.id !== account.id)]);
      setCode(account.dev_code ?? "");
      setMessage(account.dev_code
        ? `Code envoyé. En local/test, code: ${account.dev_code}`
        : "Code envoyé. Saisissez le code reçu pour activer ce numéro.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'envoyer le code.");
    } finally {
      setSaving(false);
    }
  };

  const verifyCode = async () => {
    if (!pendingAccount || code.trim().length < 4) {
      setMessage("Saisissez le code reçu avant de valider.");
      return;
    }
    setVerifying(true);
    setMessage("");
    try {
      const verified = await http<PayoutAccount>(`/api/auth/payout-accounts/${pendingAccount.id}/verify/`, {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setAccounts((current) => [verified, ...current.filter((item) => item.id !== verified.id)]);
      setPendingAccount(null);
      setReplacing(false);
      setCode("");
      setMessage("Numéro vérifié. BelivaY peut maintenant l'utiliser pour les versements.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Code invalide ou expiré.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white ${surfaceClassName}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: accent }}>
            <WalletCards size={15} />
            Versements BelivaY
          </div>
          <h3 className="mt-2 text-lg font-black">Compte d'encaissement vérifié</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Avant qu'un {roleLabel} puisse recevoir l'argent envoyé par BelivaY, le numéro Mobile Money doit être confirmé par code.
          </p>
        </div>
        <div className="rounded-full px-3 py-1 text-xs font-black" style={{ background: `${accent}18`, color: accent }}>
          {loading ? "Chargement" : verifiedAccount ? "Actif" : "À vérifier"}
        </div>
      </div>

      {verifiedAccount ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600" size={22} />
            <div>
              <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">
                {OPERATOR_LABEL[verifiedAccount.operator] ?? verifiedAccount.operator} · {verifiedAccount.masked_phone}
              </p>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                {statusLabel(verifiedAccount.status)} · Compte principal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPendingAccount(null);
              setReplacing(true);
              setPhone("");
              setLabel("");
              setMessage("Ajoutez un nouveau numéro si vous souhaitez remplacer le compte actuel.");
            }}
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-200"
          >
            Remplacer
          </button>
        </div>
      ) : null}

      {!verifiedAccount || pendingAccount || replacing ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              Numéro Mobile Money à vérifier
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-sm font-black text-slate-500">
                <span>{CAMEROON.flag}</span> +237
              </span>
              <input
                value={formatNational(national)}
                onChange={(event) => setPhone(toE164(toNationalNumber(event.target.value)))}
                placeholder="6XX XX XX XX"
                className="w-full rounded-xl border bg-slate-50 py-3 pl-20 pr-24 text-sm font-bold outline-none transition dark:bg-slate-950"
                style={{ borderColor: isPhoneValid ? "#E2E8F0" : "#DC2626" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-slate-200 px-2 py-1 text-[11px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {operator?.name ?? "Opérateur"}
              </span>
            </div>
            {!isPhoneValid ? <p className="text-xs font-semibold text-red-600">Numéro camerounais invalide ou opérateur non reconnu.</p> : null}
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={`Ex: Versement ${roleLabel}`}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950"
            />
            <button
              type="button"
              onClick={requestCode}
              disabled={saving || !national || !isPhoneValid}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              style={{ background: accent }}
            >
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Smartphone size={16} />}
              Demander le code
            </button>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-sm font-black">
              <ShieldCheck size={17} style={{ color: accent }} />
              Vérification du code
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
              Le numéro reste bloqué tant que le code n'est pas confirmé.
            </p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-xl font-black tracking-[0.35em] outline-none dark:border-slate-800 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={verifyCode}
              disabled={verifying || !pendingAccount || code.length < 4}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              style={{ background: accent }}
            >
              {verifying ? <LoaderCircle size={16} className="animate-spin" /> : <Phone size={16} />}
              Valider le numéro
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
          {message}
        </div>
      ) : null}
    </div>
  );
}
