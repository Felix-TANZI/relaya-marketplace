/**
 * Connexion du portail point relais — numéro, puis code à quatre chiffres.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI UN PIN PLUTÔT QU'UN MOT DE PASSE
 *
 * Au comptoir on se reconnecte dix fois par jour, debout, une main sur un
 * colis. Un mot de passe long n'y survit pas : il finit écrit sur le mur,
 * et c'est alors tout le relais qui est ouvert.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUI PROTÈGE RÉELLEMENT CES QUATRE CHIFFRES
 *
 * Rien dans cet écran. Le PIN est vérifié par le serveur
 * (`RelayPinLoginView`), qui le compare à une empreinte, compte les échecs
 * et ferme l'accès trente minutes au cinquième.
 *
 * Un compteur tenu ici ne protégerait de rien : il suffirait d'appeler
 * l'API directement. L'écran se contente donc d'afficher ce que le serveur
 * décide — et le nombre d'essais restants vient de lui, pas d'un calcul
 * local.
 */
import { useCallback, useEffect, useState } from "react";
import { Store } from "lucide-react";
import { RelayPinPad } from "./RelayUi";
import { http } from "@/services/api/http";

type Etape = "telephone" | "pin" | "oubli";

interface PinStatus {
  has_pin: boolean;
  first_name: string;
  locked: boolean;
  max_attempts: number;
  lock_minutes: number;
}

/** « 691248350 » → « 6 91 24 83 50 ». */
function formaterTelephone(brut: string) {
  const chiffres = brut.replace(/\D/g, "").slice(0, 9);
  if (chiffres.length <= 1) return chiffres;
  return [chiffres.slice(0, 1), ...(chiffres.slice(1).match(/.{1,2}/g) ?? [])].join(" ");
}

export default function RelayPinLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [etape, setEtape] = useState<Etape>("telephone");
  const [telephone, setTelephone] = useState("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<PinStatus | null>(null);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  // Le parcours « PIN oublié » : code reçu, puis nouveau PIN.
  const [code, setCode] = useState("");
  const [nouveauPin, setNouveauPin] = useState("");

  const numeroComplet = `+237${telephone.replace(/\D/g, "")}`;

  /**
   * Le numéro est mémorisé sur CE téléphone, pas le PIN.
   *
   * Retenir le numéro évite de le retaper dix fois par jour. Retenir le
   * code annulerait tout l'intérêt d'en avoir un.
   */
  useEffect(() => {
    try {
      const retenu = window.localStorage.getItem("belivay.relay.phone");
      if (retenu) setTelephone(formaterTelephone(retenu));
    } catch {
      /* Stockage bloque : on repart du numero vide, l'ecran marche. */
    }
  }, []);

  const consulter = useCallback(async (numero: string) => {
    setBusy(true);
    setErreur("");
    try {
      const etat = await http<PinStatus>(
        `/api/auth/relay-point/pin/status/?phone=${encodeURIComponent(numero)}`,
      );
      setStatus(etat);
      setEtape("pin");
      if (!etat.has_pin) {
        // Pas encore de PIN : il faut d'abord prouver qu'on detient le
        // numero. On bascule directement sur le parcours de mise en place.
        await demanderCode(numero);
        setEtape("oubli");
      }
    } catch {
      setErreur("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setBusy(false);
    }
  }, []);

  const demanderCode = async (numero: string) => {
    try {
      const reponse = await http<{ channel: string }>(
        "/api/auth/relay-point/pin/request-code/",
        { method: "POST", body: JSON.stringify({ phone: numero }) },
      );
      // Le canal vient du serveur. La maquette annonce un SMS ; aucun envoi
      // SMS n'existe, et mentir ici ferait attendre un message qui ne
      // viendra pas.
      setInfo(
        reponse.channel === "sms"
          ? "Un code à 6 chiffres vous a été envoyé par SMS."
          : "Un code à 6 chiffres a été envoyé à l'adresse e-mail du compte.",
      );
    } catch {
      setInfo("");
    }
  };

  const connecter = async () => {
    if (pin.length !== 4) return;
    setBusy(true);
    setErreur("");
    try {
      const reponse = await http<{ access: string; refresh: string }>(
        "/api/auth/relay-point/pin/login/",
        { method: "POST", body: JSON.stringify({ phone: numeroComplet, pin }) },
      );
      try {
        window.localStorage.setItem("access_token", reponse.access);
        window.localStorage.setItem("refresh_token", reponse.refresh);
        window.localStorage.setItem("belivay.relay.phone", telephone.replace(/\D/g, ""));
      } catch {
        /* Sans stockage, la session ne survit pas au rechargement. */
      }
      onAuthenticated();
    } catch (erreurAppel) {
      const detail =
        (erreurAppel as { data?: { detail?: string; attempts_left?: number } })?.data ?? {};
      setErreur(
        detail.detail
          ?? "Numéro ou code incorrect."
            + (detail.attempts_left !== undefined ? ` ${detail.attempts_left} essais restants.` : ""),
      );
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  const creerPin = async () => {
    setBusy(true);
    setErreur("");
    try {
      await http("/api/auth/relay-point/pin/set/", {
        method: "POST",
        body: JSON.stringify({ phone: numeroComplet, code, pin: nouveauPin }),
      });
      setCode("");
      setNouveauPin("");
      setInfo("");
      setPin("");
      setEtape("pin");
      await consulter(numeroComplet);
    } catch (erreurAppel) {
      const detail = (erreurAppel as { data?: { detail?: string; pin?: string } })?.data ?? {};
      setErreur(detail.pin ?? detail.detail ?? "Code invalide ou expiré.");
    } finally {
      setBusy(false);
    }
  };

  /* Le pave partage dit le PIN complet apres chaque frappe ; l'ecran n'a
     plus qu'a l'enregistrer et a effacer l'erreur precedente. */
  const taper = (suivant: string) => {
    setErreur("");
    setPin(suivant);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-[linear-gradient(180deg,#FDF6EE_0%,#FBEEE2_55%,#F7E6DA_100%)] px-5 py-8 dark:bg-slate-950 dark:bg-none">
      <img src="/belivay-logo.png" alt="BelivaY" className="h-9 w-auto object-contain dark:brightness-0 dark:invert" />
      <p className="mt-2.5 flex items-center gap-2 text-[12.5px] font-black uppercase tracking-[0.1em] text-[#2456D6] dark:text-blue-400">
        <span className="h-[7px] w-[7px] bg-[#2456D6] dark:bg-blue-400" aria-hidden />
        Espace point relais
      </p>

      <div className="mt-6 w-full max-w-[360px]">
        {/* ── Le numéro ─────────────────────────────────────────────────── */}
        {etape === "telephone" ? (
          <>
            <section className="rounded-[14px] bg-white px-5 pb-5 pt-4 shadow-[0_2px_12px_rgba(60,35,15,.08)] dark:bg-slate-900">
              <h1 className="text-[23px] font-black tracking-[-0.03em] text-slate-900 dark:text-white">
                Connexion
              </h1>
              <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                Entrez le numéro de téléphone enregistré pour votre relais.
              </p>

              <label className="mt-4 block text-[11.5px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                Numéro de téléphone
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-[12px] border-2 border-[#2456D6] bg-white px-4 py-3 dark:bg-slate-950">
                <span className="text-[16px] font-bold text-slate-500 dark:text-slate-400">+237</span>
                <input
                  value={telephone}
                  onChange={(event) => setTelephone(formaterTelephone(event.target.value))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && telephone.replace(/\D/g, "").length === 9) {
                      void consulter(numeroComplet);
                    }
                  }}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="6 91 24 83 50"
                  aria-label="Numéro de téléphone"
                  className="min-w-0 flex-1 bg-transparent text-[17px] font-bold tracking-wide text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-300 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => void consulter(numeroComplet)}
                disabled={busy || telephone.replace(/\D/g, "").length !== 9}
                className="pr-btn mt-4 w-full rounded-[12px] px-4 py-3.5 text-[16px] font-black text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
              >
                {busy ? "…" : "Continuer"}
              </button>

              {erreur ? (
                <p className="mt-3 text-[13px] font-semibold text-[#B42318]">{erreur}</p>
              ) : null}

              <p className="mt-3 text-[12.5px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
                {/* Pas de « sur ce telephone » : aucune liaison a l'appareil
                    n'existe. Un PIN vole fonctionne depuis n'importe ou. */}
                Première connexion : un code à 6 chiffres vous est envoyé avant le PIN.
              </p>
            </section>

            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-white px-4 py-3.5 text-[15px] font-bold text-slate-700 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] transition active:scale-[.98] dark:bg-slate-900 dark:text-slate-100"
            >
              <Store size={18} strokeWidth={2.2} /> Devenir point relais
            </button>
          </>
        ) : null}

        {/* ── Le PIN ────────────────────────────────────────────────────── */}
        {etape === "pin" ? (
          <>
            <h1 className="text-center text-[23px] font-black tracking-[-0.03em] text-slate-900 dark:text-white">
              Bonjour {status?.first_name || ""}
            </h1>
            <p className="mt-1 text-center text-[13.5px] font-medium text-slate-500 dark:text-slate-400">
              Entrez votre code PIN à 4 chiffres
            </p>

            <RelayPinPad value={pin} onChange={taper} />

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setEtape("telephone");
                  setPin("");
                  setErreur("");
                }}
                className="text-[13.5px] font-semibold text-slate-500 dark:text-slate-400"
              >
                Changer de numéro
              </button>
              <button
                type="button"
                onClick={() => {
                  setErreur("");
                  void demanderCode(numeroComplet);
                  setEtape("oubli");
                }}
                className="text-[13.5px] font-bold text-[#2456D6] dark:text-blue-400"
              >
                PIN oublié ?
              </button>
            </div>

            <button
              type="button"
              onClick={() => void connecter()}
              disabled={busy || pin.length !== 4}
              className="pr-btn mt-3 w-full rounded-[12px] px-4 py-3.5 text-[16px] font-black text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
            >
              {busy ? "…" : "Se connecter"}
            </button>

            {erreur ? (
              <p className="mt-3 text-center text-[13px] font-semibold text-[#B42318]">{erreur}</p>
            ) : null}

            <p className="mt-3 text-center text-[12.5px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
              {status?.max_attempts ?? 5} PIN faux de suite : connexion bloquée{" "}
              {status?.lock_minutes ?? 30} minutes.
            </p>
          </>
        ) : null}

        {/* ── PIN oublié / première mise en place ───────────────────────── */}
        {etape === "oubli" ? (
          <section className="rounded-[14px] bg-white px-5 pb-5 pt-4 shadow-[0_2px_12px_rgba(60,35,15,.08)] dark:bg-slate-900">
            <h1 className="text-[23px] font-black tracking-[-0.03em] text-slate-900 dark:text-white">
              {status?.has_pin ? "PIN oublié" : "Créer votre PIN"}
            </h1>
            <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-slate-500 dark:text-slate-400">
              {info || "Un code de réinitialisation est envoyé au compte."} Un employé peut aussi
              demander au gérant de réinitialiser son PIN depuis « Mon équipe ».
            </p>

            <label className="mt-4 block text-[11.5px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              Code reçu
            </label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-label="Code reçu"
              className="mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-center text-[22px] font-black tracking-[0.3em] text-slate-900 outline-none transition focus:border-[#2456D6] placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />

            <label className="mt-4 block text-[11.5px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              Nouveau PIN · 4 chiffres
            </label>
            <input
              value={nouveauPin}
              onChange={(event) => setNouveauPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="····"
              aria-label="Nouveau PIN"
              className="mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-center text-[22px] font-black tracking-[0.4em] text-slate-900 outline-none transition focus:border-[#2456D6] placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <p className="mt-2 text-[12.5px] font-medium text-slate-400 dark:text-slate-500">
              Évitez quatre chiffres identiques ou qui se suivent — ils se devinent avant d'être
              attaqués.
            </p>

            <button
              type="button"
              onClick={() => void creerPin()}
              disabled={busy || code.length !== 6 || nouveauPin.length !== 4}
              className="pr-btn mt-4 w-full rounded-[12px] px-4 py-3.5 text-[16px] font-black text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
            >
              {busy ? "…" : "Créer un nouveau PIN"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEtape(status?.has_pin ? "pin" : "telephone");
                setErreur("");
              }}
              className="mt-2.5 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              Retour
            </button>

            {erreur ? (
              <p className="mt-3 text-[13px] font-semibold text-[#B42318]">{erreur}</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
