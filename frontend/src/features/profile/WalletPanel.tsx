// frontend/src/features/profile/WalletPanel.tsx
// Le Wallet du client — feuille de route D16, spec v2.1 R03. Tout vient du serveur (payments.wallet) : solde, frais,
// plafond, numéros autorisés. Rien n'est gardé dans le navigateur.
//
// DP-17 : tant que le Wallet est fermé (r_wallet_ouvert = 0), ce panneau ne s'affiche pas et rien ne le mentionne ;
// le profil ne montre ni l'entrée de menu ni le raccourci (useWalletOuvert).
//
// DEV-SRV-01 v1.8, C06 : textes en français et en anglais (domaine c06.wallet), dates dans la langue choisie.

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { walletApi, type DevisRetrait, type MonWallet } from "@/features/payments/api/wallet.api";
import { useToast } from "@/context/ToastContext";

const F = (n: number) => `${n.toLocaleString("fr-FR")} F`;
const nouvelleCle = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

/** Le Wallet du client connecté, ou null (non connecté, ou réponse en attente). */
// eslint-disable-next-line react-refresh/only-export-components -- hook partagé, pas un composant
export function useWallet() {
  const [wallet, setWallet] = useState<MonWallet | null>(null);
  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;
    walletApi.moi().then(setWallet).catch(() => setWallet(null));
  }, []);
  return wallet;
}

/** Le Wallet est-il ouvert ? Faux tant que le serveur ne l'a pas dit (DP-17 : rien n'apparaît par défaut). */
// eslint-disable-next-line react-refresh/only-export-components -- hook partagé, pas un composant
export function useWalletOuvert() {
  return Boolean(useWallet()?.ouvert);
}

export default function WalletPanel() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-GB" : "fr-FR";
  const { showToast } = useToast();
  const [w, setW] = useState<MonWallet | null>(null);
  const [recharge, setRecharge] = useState({ montant: "", numero: "", operateur: "MTN" });
  const [retrait, setRetrait] = useState({ montant: "", numero: "" });
  const [devis, setDevis] = useState<DevisRetrait | null>(null);
  const [code, setCode] = useState({ nouveau: "", ancien: "" });
  const [oubli, setOubli] = useState<{ envoye: boolean; sms: string; nouveau: string }>({ envoye: false, sms: "", nouveau: "" });
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(() => {
    walletApi.moi().then(setW).catch(() => setW(null));
  }, []);
  useEffect(charger, [charger]);

  const agir = async (fn: () => Promise<unknown>, ok: string) => {
    setOccupe(true);
    try {
      await fn();
      showToast(ok, "success");
      charger();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("c06.wallet.action_refusee"), "error");
    } finally {
      setOccupe(false);
    }
  };

  useEffect(() => {
    const montant = Number(retrait.montant);
    if (!w?.ouvert || !montant) {
      setDevis(null);
      return;
    }
    const id = window.setTimeout(() => {
      walletApi.devisRetrait(montant).then(setDevis).catch(() => setDevis(null));
    }, 300);
    return () => window.clearTimeout(id);
  }, [retrait.montant, w?.ouvert]);

  if (!w?.ouvert) return null;

  return (
    <div className="pf-anim">
      <div className="pf-card pf-mb">
        <div className="pf-card-title">{t("c06.wallet.titre")}</div>
        <div className="pf-summary-row"><span className="pf-muted-sm">{t("c06.wallet.solde")}</span><b>{F(w.solde_xaf)}</b></div>
        <div className="pf-summary-row"><span className="pf-muted-sm">{t("c06.wallet.retirable")}</span><span>{F(w.retirable_xaf)}</span></div>
        <div className="pf-summary-row"><span className="pf-muted-sm">{t("c06.wallet.gestes")}</span><span>{F(w.geste_xaf)}</span></div>
        <p className="pf-muted-sm">{t("c06.wallet.plafond", { plafond: F(w.plafond_xaf), seuil_code: F(w.code_des_xaf) })}</p>
      </div>

      <div className="pf-card pf-mb">
        <div className="pf-card-title">{t("c06.wallet.recharger_titre")}</div>
        <div className="flex flex-wrap gap-2">
          <input className="pf-input" inputMode="numeric" placeholder={t("c06.wallet.montant")} value={recharge.montant}
            onChange={(e) => setRecharge({ ...recharge, montant: e.target.value.replace(/\D/g, "") })} />
          <input className="pf-input" inputMode="tel" placeholder={t("c06.wallet.numero_momo")} value={recharge.numero}
            onChange={(e) => setRecharge({ ...recharge, numero: e.target.value })} />
          <select className="pf-input" value={recharge.operateur} onChange={(e) => setRecharge({ ...recharge, operateur: e.target.value })}>
            <option value="MTN">MTN MoMo</option>
            <option value="ORANGE">Orange Money</option>
          </select>
          <button type="button" className="pf-btn-accent" disabled={occupe || !recharge.montant || !recharge.numero.trim()}
            onClick={() => void agir(() => walletApi.recharger(Number(recharge.montant), recharge.numero.replace(/\s/g, ""), recharge.operateur, nouvelleCle()),
              t("c06.wallet.recharge_a_valider"))}>
            {t("c06.wallet.recharger")}
          </button>
        </div>
      </div>

      <div className="pf-card pf-mb">
        <div className="pf-card-title">{t("c06.wallet.retirer")}</div>
        <p className="pf-muted-sm">{t("c06.wallet.retrait_regle", { minimum: F(w.retrait_min_xaf) })}</p>
        <div className="flex flex-wrap gap-2">
          <input className="pf-input" inputMode="numeric" placeholder={t("c06.wallet.montant")} value={retrait.montant}
            onChange={(e) => setRetrait({ ...retrait, montant: e.target.value.replace(/\D/g, "") })} />
          {devis?.numeros.length ? (
            <select className="pf-input" value={retrait.numero} onChange={(e) => setRetrait({ ...retrait, numero: e.target.value })}>
              <option value="">{t("c06.wallet.dernier_numero")}</option>
              {devis.numeros.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : null}
        </div>
        {devis && (
          <p className="pf-muted-sm">{t("c06.wallet.devis", { frais: F(devis.frais), recu: F(devis.recu) })}</p>
        )}
        <button type="button" className="pf-btn-accent" disabled={occupe || !devis || devis.montant < devis.minimum}
          onClick={() => void agir(() => walletApi.retirer(Number(retrait.montant), retrait.numero, nouvelleCle()), t("c06.wallet.retrait_envoye"))}>
          {t("c06.wallet.retirer")}
        </button>
      </div>

      <div className="pf-card pf-mb">
        <div className="pf-card-title">{w.code_defini ? t("c06.wallet.changer_code") : t("c06.wallet.choisir_code")}</div>
        <div className="flex flex-wrap gap-2">
          {w.code_defini && (
            <input className="pf-input" inputMode="numeric" maxLength={4} placeholder={t("c06.wallet.code_actuel")} value={code.ancien}
              onChange={(e) => setCode({ ...code, ancien: e.target.value.replace(/\D/g, "") })} />
          )}
          <input className="pf-input" inputMode="numeric" maxLength={4} placeholder={t("c06.wallet.nouveau_code")} value={code.nouveau}
            onChange={(e) => setCode({ ...code, nouveau: e.target.value.replace(/\D/g, "") })} />
          <button type="button" className="pf-btn-ghost" disabled={occupe || code.nouveau.length !== 4}
            onClick={() => void agir(() => walletApi.definirCode(code.nouveau, code.ancien), t("c06.wallet.code_enregistre"))}>
            {t("c06.wallet.enregistrer")}
          </button>
        </div>
        {w.code_bloque_jusqua && (
          <p className="pf-muted-sm">
            {t("c06.wallet.code_bloque", { date: new Date(w.code_bloque_jusqua).toLocaleString(locale) })}
          </p>
        )}
        {w.code_defini && !oubli.envoye && (
          <button type="button" className="pf-btn-ghost" disabled={occupe}
            onClick={() => void agir(async () => {
              await walletApi.codeOublie();
              setOubli({ envoye: true, sms: "", nouveau: "" });
            }, t("c06.wallet.code_envoye_sms"))}>
            {t("c06.wallet.code_oublie")}
          </button>
        )}
        {oubli.envoye && (
          <div className="flex flex-wrap gap-2">
            <input className="pf-input" inputMode="numeric" placeholder={t("c06.wallet.code_recu_sms")} value={oubli.sms}
              onChange={(e) => setOubli({ ...oubli, sms: e.target.value.replace(/\D/g, "") })} />
            <input className="pf-input" inputMode="numeric" maxLength={4} placeholder={t("c06.wallet.nouveau_code")} value={oubli.nouveau}
              onChange={(e) => setOubli({ ...oubli, nouveau: e.target.value.replace(/\D/g, "") })} />
            <button type="button" className="pf-btn-ghost" disabled={occupe || !oubli.sms || oubli.nouveau.length !== 4}
              onClick={() => void agir(async () => {
                await walletApi.reinitialiserCode(oubli.sms, oubli.nouveau);
                setOubli({ envoye: false, sms: "", nouveau: "" });
              }, t("c06.wallet.nouveau_code_enregistre"))}>
              {t("c06.wallet.valider")}
            </button>
          </div>
        )}
      </div>

      <div className="pf-card">
        <div className="pf-card-title">{t("c06.wallet.mouvements")}</div>
        {w.mouvements.length === 0 ? <p className="pf-muted-sm">{t("c06.wallet.aucun_mouvement")}</p> : w.mouvements.map((m) => (
          <div key={m.id} className="pf-summary-row">
            <span className="pf-muted-sm">{new Date(m.le).toLocaleDateString(locale)} · {m.libelle}</span>
            <span>{m.montant_xaf > 0 ? "+" : ""}{F(m.montant_xaf)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
