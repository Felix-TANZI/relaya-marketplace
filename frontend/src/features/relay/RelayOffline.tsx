/**
 * Hors connexion — ce qu'on peut encore faire, et ce qui attend d'être envoyé.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE RÉSEAU TOMBE, PAS LE COMPTOIR
 *
 * Un client est devant le gérant avec son code. Lui dire « revenez quand il
 * y aura du réseau » n'est pas une réponse. Le portail continue donc à
 * travailler, et range ce qu'il ne peut pas envoyer.
 *
 * Mais tout ne se continue pas : un paiement Mobile Money exige le réseau,
 * et prétendre l'encaisser hors ligne ferait partir un colis contre un
 * règlement qui n'a jamais eu lieu. D'où la liste — ce qui marche, ce qui ne
 * marche pas, et ce qui passe au papier.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA FILE EST RÉELLE
 *
 * « En attente d'envoi » lit `listPendingEvidence()` — la vraie file
 * IndexedDB du portail, avec l'heure où chaque opération a été faite et le
 * poids de sa photo. « Réessayer » appelle `syncPendingEvidence()`.
 *
 * Rien n'est simulé : une file vide affiche une file vide.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Camera, Check, CreditCard, FileText, KeyRound, Package, RefreshCw, WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  listPendingEvidence, syncPendingEvidence, type PendingEvidence,
} from "@/lib/evidenceQueue";

/** Combien de temps une opération en attente reste valable. */
const EXPIRATION_HEURES = 72;

type Verdict = "oui" | "non" | "papier";

const VERDICT_STYLE: Record<Verdict, { label: string; classe: string; tuile: string }> = {
  oui: {
    label: "Oui",
    classe: "border-[#BFE3CF] bg-[#E6F4EC] text-[#1F7A4D]",
    tuile: "bg-[#E6F4EC] text-[#1F7A4D]",
  },
  non: {
    label: "Non",
    classe: "border-[#F4C3BE] bg-[#FDECEA] text-[#B42318]",
    tuile: "bg-[#FDECEA] text-[#B42318]",
  },
  papier: {
    label: "Papier",
    classe: "border-[#F0DA9C] bg-[#FFF4D6] text-[#8A5A00]",
    tuile: "bg-[#FFF4D6] text-[#8A5A00]",
  },
};

/** Ce qui marche sans réseau, et ce qui ne marche pas. */
const CAPACITES: Array<{ icon: LucideIcon; titre: string; detail: string; verdict: Verdict }> = [
  {
    icon: Package,
    titre: "Recevoir un lot",
    detail: "Code de dépôt vérifié si le lot était déjà téléchargé",
    verdict: "oui",
  },
  {
    icon: KeyRound,
    titre: "Remettre un colis sans montant dû",
    detail: "Code vérifié sur la liste chiffrée du téléphone",
    verdict: "oui",
  },
  {
    icon: CreditCard,
    titre: "Remettre avec paiement",
    detail: "Le paiement Mobile Money exige le réseau",
    verdict: "non",
  },
  {
    icon: Camera,
    titre: "Photos, constats, dépôts, sorties",
    detail: "Enregistrés et envoyés plus tard",
    verdict: "oui",
  },
  {
    icon: FileText,
    titre: "Panne générale annoncée",
    detail: "Par SMS ou WhatsApp de diffusion : registre papier, colis sans montant seulement",
    verdict: "papier",
  },
];

/** « 420 Ko » — le poids réel du fichier en attente. */
function poids(octets: number) {
  if (octets >= 1_048_576) return `${(octets / 1_048_576).toFixed(1).replace(".", ",")} Mo`;
  return `${Math.round(octets / 1024)} Ko`;
}

/** Ce que l'opération était, lu de l'étape de la preuve. */
function decrire(entry: PendingEvidence) {
  const stage = entry.fields.stage || "";
  const ref = entry.fields.parcel_id ? `BV-${entry.fields.parcel_id}` : "";
  const libelles: Record<string, { titre: string; icon: LucideIcon }> = {
    RELAY_RECEIVED: { titre: "Réception", icon: Package },
    RELAY_RELEASED: { titre: "Remise", icon: Check },
    RELAY_RELEASED_SIGNATURE: { titre: "Signature", icon: Check },
    RELAY_REFUSED: { titre: "Réserve", icon: Camera },
    RETURN_DEPOSIT: { titre: "Dépôt retour", icon: Package },
  };
  const connu = libelles[stage] ?? { titre: "Opération", icon: Camera };
  return { titre: [connu.titre, ref].filter(Boolean).join(" "), icon: connu.icon };
}

export default function RelayOffline() {
  const [file, setFile] = useState<PendingEvidence[]>([]);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [depuis, setDepuis] = useState<number | null>(() => (navigator.onLine ? null : Date.now()));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const charger = useCallback(() => {
    listPendingEvidence()
      .then(setFile)
      .catch(() => setFile([]));
  }, []);

  useEffect(() => {
    charger();
    const versEnLigne = () => {
      setOnline(true);
      setDepuis(null);
      charger();
    };
    const versHorsLigne = () => {
      setOnline(false);
      // On note QUAND la coupure a commence : « depuis 14 min » n'a de sens
      // que mesure, pas estime.
      setDepuis((actuel) => actuel ?? Date.now());
    };
    window.addEventListener("online", versEnLigne);
    window.addEventListener("offline", versHorsLigne);
    return () => {
      window.removeEventListener("online", versEnLigne);
      window.removeEventListener("offline", versHorsLigne);
    };
  }, [charger]);

  const reessayer = async () => {
    setBusy(true);
    setMessage("");
    try {
      const bilan = await syncPendingEvidence();
      setMessage(
        bilan.sent > 0
          ? `${bilan.sent} opération${bilan.sent > 1 ? "s" : ""} envoyée${bilan.sent > 1 ? "s" : ""}.`
          : "Rien n'a pu partir. Le réseau est toujours absent.",
      );
      charger();
    } catch {
      setMessage("L'envoi a échoué. Vos opérations restent en attente.");
    } finally {
      setBusy(false);
    }
  };

  const minutes = depuis ? Math.max(1, Math.round((Date.now() - depuis) / 60_000)) : 0;

  return (
    <div className="space-y-4">
      {/* ── L'état du réseau ───────────────────────────────────────────── */}
      {!online ? (
        <section className="flex items-start gap-3 rounded-[14px] border border-[#F0DA9C] bg-[#FFF4D6] px-4 py-3.5 dark:border-amber-800 dark:bg-amber-950/30">
          <WifiOff size={19} strokeWidth={2.2} className="mt-[2px] flex-shrink-0 text-[#8A5A00] dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-black leading-tight text-[#8A5A00] dark:text-amber-200">
              Hors connexion depuis {minutes} min
            </div>
            <p className="mt-1 text-[13.5px] font-medium leading-snug text-[#8A5A00] dark:text-amber-300/85">
              Vous pouvez continuer : tout sera envoyé au retour du réseau.
            </p>
          </div>
        </section>
      ) : (
        <section className="flex items-start gap-3 rounded-[14px] border border-[#BFE3CF] bg-[#E6F4EC] px-4 py-3.5 dark:border-emerald-800 dark:bg-emerald-950/30">
          <Check size={19} strokeWidth={2.6} className="mt-[2px] flex-shrink-0 text-[#1F7A4D] dark:text-emerald-400" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-black leading-tight text-[#155C39] dark:text-emerald-200">
              Réseau présent
            </div>
            <p className="mt-1 text-[13.5px] font-medium leading-snug text-[#1F7A4D] dark:text-emerald-300/85">
              {file.length > 0
                ? `${file.length} opération${file.length > 1 ? "s" : ""} attend${file.length > 1 ? "ent" : ""} encore de partir.`
                : "Tout est à jour."}
            </p>
          </div>
        </section>
      )}

      {/* ── Ce qui marche sans réseau ──────────────────────────────────── */}
      <h2 className="px-1 pt-0.5 text-[23px] font-black leading-[1.14] tracking-[-0.03em] text-slate-900 dark:text-white">
        Ce qui marche sans réseau
      </h2>

      <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-2 pt-2 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {CAPACITES.map((capacite) => {
            const style = VERDICT_STYLE[capacite.verdict];
            const Icon = capacite.icon;
            return (
              <li key={capacite.titre} className="flex items-start gap-3 px-1 py-3.5">
                <span className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] ${style.tuile} dark:bg-slate-800 dark:text-slate-300`}>
                  <Icon size={19} strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                    {capacite.titre}
                  </span>
                  <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                    {capacite.detail}
                  </span>
                </span>
                <span className={`flex-shrink-0 rounded-full border px-3 py-[5px] text-[12.5px] font-semibold ${style.classe} dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300`}>
                  {style.label}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── En attente d'envoi ─────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-4 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 px-1">
          <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
            En attente d'envoi
          </h3>
          <span
            className={`flex h-[26px] min-w-[26px] flex-shrink-0 items-center justify-center rounded-full px-2 text-[13px] font-black tabular-nums ${
              file.length > 0
                ? "bg-[#FFF4D6] text-[#8A5A00] dark:bg-amber-950 dark:text-amber-300"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            {file.length}
          </span>
        </div>

        {file.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
            Rien n'attend. Tout ce que vous avez fait est parti.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {file.map((entry) => {
              const { titre, icon: Icon } = decrire(entry);
              const heure = new Date(entry.createdAt);
              // Une operation trop vieille ne partira plus : il faut la
              // refaire, et le gerant doit le voir avant de s'en remettre a
              // un envoi qui n'aura pas lieu.
              const perimee = Date.now() - entry.createdAt > EXPIRATION_HEURES * 3_600_000;
              return (
                <li key={entry.id} className="flex items-start gap-3 px-1 py-3.5">
                  <span
                    className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] ${
                      perimee
                        ? "bg-[#FDECEA] text-[#B42318] dark:bg-red-950/50 dark:text-red-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    <Icon size={19} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black leading-tight tabular-nums text-slate-900 dark:text-white">
                      {String(heure.getHours()).padStart(2, "0")}:
                      {String(heure.getMinutes()).padStart(2, "0")} · {titre}
                    </span>
                    <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                      {perimee
                        ? `Expirée après ${EXPIRATION_HEURES} h — à refaire`
                        : `photo ${poids(entry.blob.size)}`}
                      {entry.attempts > 0 ? ` · ${entry.attempts} tentative${entry.attempts > 1 ? "s" : ""}` : ""}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {file.length > 0 ? (
          <button
            type="button"
            onClick={() => void reessayer()}
            disabled={busy}
            className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-[12px] bg-[#2456D6] px-4 py-3.5 text-[16px] font-black text-white shadow-[0_4px_14px_rgba(36,86,214,.35)] transition active:scale-[.97] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
          >
            <RefreshCw size={18} strokeWidth={2.4} className={busy ? "animate-spin" : ""} />
            {busy ? "Envoi…" : "Réessayer l'envoi"}
          </button>
        ) : null}

        {message ? (
          <p className="mt-2.5 text-center text-[13px] font-semibold text-slate-500 dark:text-slate-400">
            {message}
          </p>
        ) : null}
      </section>

      {/*
        La regle des 72 h.

        ATTENTION : elle n'est PAS appliquee par la file. `evidenceQueue` ne
        purge rien et ne refuse rien — l'ecran signale une operation perimee,
        mais le serveur l'accepterait encore. La regle est contractuelle, son
        application reste a ecrire.
      */}
      <p className="flex items-start gap-2.5 rounded-[14px] bg-[#EAF0FF] px-4 py-3.5 text-[13px] font-medium leading-[1.55] text-[#1E4BC4] dark:bg-blue-950/40 dark:text-blue-200">
        <RefreshCw size={18} strokeWidth={2.2} className="mt-[2px] flex-shrink-0" />
        Les opérations gardent l'heure où elles ont été faites, pas l'heure d'envoi. Une opération en
        attente depuis plus de {EXPIRATION_HEURES} h expire : il faut la refaire (le registre papier
        aussi se saisit sous {EXPIRATION_HEURES} h). Ne désinstallez pas l'application tant que des
        opérations sont en attente.
      </p>
    </div>
  );
}
