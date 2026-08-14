// frontend/src/features/payments/SavedPaymentMethods.tsx
import { useCallback, useState } from "react";
import { Plus, Smartphone, Trash2, Wallet } from "lucide-react";
import { CAMEROON, detectOperator, isValidNationalNumber, toE164, toNationalNumber } from "@/lib/phone";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useToast } from "@/context/ToastContext";
import { PfShellStyles } from "@/styles/pfShell";
import { OperatorLogo } from "./OperatorLogo";

const STORAGE_KEY = "belivay-payment-methods";

export type SavedMethod = { id: string; operator: "MTN" | "ORANGE"; phone: string; default: boolean };

function read(): SavedMethod[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedMethod[]) : [];
  } catch {
    return [];
  }
}

function write(list: SavedMethod[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / mode privé */
  }
}

/** Le moyen par défaut, réutilisable au checkout pour pré-remplir le numéro. */
// eslint-disable-next-line react-refresh/only-export-components
export function getDefaultPaymentMethod(): SavedMethod | null {
  const list = read();
  return list.find((m) => m.default) ?? list[0] ?? null;
}

export function SavedPaymentMethods() {
  const { showToast } = useToast();
  // Lecture a l'initialisation plutot que dans un effet : `read()` est un
  // acces localStorage synchrone, le passer par un effet declencherait un
  // rendu en cascade pour rien.
  const [methods, setMethods] = useState<SavedMethod[]>(read);
  const [phone, setPhone] = useState("");

  const persist = useCallback((list: SavedMethod[]) => {
    setMethods(list);
    write(list);
  }, []);

  const national = toNationalNumber(phone);
  const operator = detectOperator(national);
  const valid = isValidNationalNumber(national, CAMEROON);
  // L'opérateur est déduit du préfixe : pas de sélecteur manuel à se tromper.
  const detected: SavedMethod["operator"] | null =
    operator?.name === "MTN" ? "MTN" : operator?.name === "Orange" ? "ORANGE" : null;

  const add = () => {
    if (!valid || !detected) {
      showToast("Numéro invalide", { description: "Seuls les numéros MTN et Orange acceptent le Mobile Money.", type: "error" });
      return;
    }
    const e164 = toE164(national);
    if (methods.some((m) => m.phone === e164)) {
      showToast("Ce numéro est déjà enregistré", "error");
      return;
    }
    persist([...methods, { id: `pm-${Date.now()}`, operator: detected, phone: e164, default: methods.length === 0 }]);
    setPhone("");
    showToast("Moyen de paiement ajouté", { description: `${detected === "MTN" ? "MTN Mobile Money" : "Orange Money"} · ${e164}`, type: "success" });
  };

  const setDefault = (id: string) => persist(methods.map((m) => ({ ...m, default: m.id === id })));

  const remove = (id: string) => {
    const next = methods.filter((m) => m.id !== id);
    if (next.length && !next.some((m) => m.default)) next[0].default = true;
    persist(next);
    showToast("Moyen de paiement retiré", "success");
  };

  return (
    <>
      <PfShellStyles />

      <div className="pf-panel-head">
        <div>
          <div className="pf-panel-title">Mes moyens de paiement</div>
          <div className="pf-panel-sub">Vos comptes Mobile Money enregistrés sur cet appareil</div>
        </div>
      </div>

      {methods.length === 0 ? (
        <div className="pf-empty">
          <span className="pf-empty-ic"><Smartphone size={22} /></span>
          <div className="pf-empty-t">Aucun moyen enregistré</div>
          <div className="pf-muted-sm">Ajoutez un numéro pour payer en un geste au prochain achat.</div>
        </div>
      ) : (
        <div className="pf-addr-grid" style={{ marginBottom: 16 }}>
          {methods.map((m) => (
            <div key={m.id} className={`pf-addr${m.default ? " def" : ""}`}>
              <div className="pf-addr-label">
                <OperatorLogo provider={m.operator === "MTN" ? "MTN_MOMO" : "ORANGE_MONEY"} size={30} />
                {m.operator === "MTN" ? "MTN Mobile Money" : "Orange Money"}
                {m.default && <span className="pf-badge-soft">Par défaut</span>}
              </div>
              <div className="pf-addr-line">{m.phone}</div>
              <div className="pf-addr-actions">
                {!m.default && <button type="button" className="pf-btn-ghost" onClick={() => setDefault(m.id)}>Par défaut</button>}
                <button type="button" className="pf-btn-danger" onClick={() => remove(m.id)}><Trash2 size={13} />Retirer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pf-card-title pf-mb">Ajouter un compte</div>
      <div className="pf-pay-form">
        <div style={{ flex: 1, minWidth: 200 }}>
          <PhoneInput value={phone} onChange={setPhone} placeholder="6XX XXX XXX" />
        </div>
        <button type="button" className="pf-btn-accent" onClick={add} disabled={!valid || !detected}><Plus size={14} />Ajouter</button>
      </div>

      <div className="pf-info-note">
        <span className="pf-info-ic"><Wallet size={15} /></span>
        <div>
          <div className="pf-toggle-t" style={{ fontSize: 13 }}>
            {detected ? `Opérateur détecté : ${detected === "MTN" ? "MTN" : "Orange"}` : "Modes acceptés sur BelivaY"}
          </div>
          <div className="pf-muted-sm">
            L'opérateur est déduit du préfixe. BelivaY ne stocke jamais votre code secret Mobile Money.
          </div>
        </div>
      </div>
    </>
  );
}
