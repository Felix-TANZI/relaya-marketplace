/**
 * Écrans d'état et d'accès.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * À QUOI SERT CET ÉCRAN
 *
 * Les huit entrées ne sont pas des destinations de travail : ce sont les
 * situations dans lesquelles le portail se met, et que personne ne sait
 * nommer quand elles arrivent. « Ça marche plus » recouvre aussi bien une
 * caméra refusée, un réseau coupé, un relais pas encore activé et une
 * session expirée — quatre pannes sans rapport, quatre gestes différents.
 *
 * Chaque entrée montre donc l'ÉTAT RÉEL de la machine, pas une capture
 * d'écran : le réseau tel qu'il est maintenant, la caméra testée pour de
 * vrai, la version de l'appli réellement publiée. Un gérant qui appelle le
 * support peut lire ce qu'il voit au lieu de le décrire.
 */
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Download,
  LayoutGrid,
  ScanLine,
  Store,
  User,
  UserPlus,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getOfflineCacheStats, type OfflineCacheStats } from "@/lib/offlineCache";
import { appReleaseApi, type AppRelease } from "@/services/api/appRelease";
import { useQrCamera } from "@/lib/useQrCamera";

/** Une entrée de la liste, et son icône dans la maquette. */
const STATE_ENTRIES: Array<{ id: string; icon: LucideIcon; label: string }> = [
  { id: "connexion", icon: User, label: "Connexion" },
  { id: "invitation", icon: UserPlus, label: "Invitation d'un employé" },
  { id: "neuf", icon: LayoutGrid, label: "Relais neuf (écrans vides)" },
  { id: "statut", icon: Store, label: "Statut du relais" },
  { id: "offline", icon: Wifi, label: "Hors connexion" },
  { id: "erreur", icon: AlertTriangle, label: "États d'erreur" },
  { id: "camera", icon: ScanLine, label: "Caméra" },
  { id: "install", icon: Download, label: "Installer l'application" },
];

const DATE_LONGUE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** Ligne d'un état : libellé à gauche, valeur mesurée à droite. */
function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="text-[13.5px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-right text-[13.5px] font-black ${tone || "text-slate-900 dark:text-white"}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * Test caméra.
 *
 * La permission ne se devine pas : un navigateur peut l'avoir accordée hier
 * et la refuser aujourd'hui, et le gerant ne l'apprendra qu'au moment de
 * scanner, livreur devant lui. On l'ouvre donc ici, a froid.
 */
function CameraTest() {
  const [on, setOn] = useState(false);
  const { videoRef, canvasRef, error, streaming } = useQrCamera({ enabled: on });

  return (
    <div>
      {on ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          {!streaming ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs font-bold text-blue-200/70">
              {error || "Activation de la caméra..."}
            </div>
          ) : null}
        </div>
      ) : null}

      {on && streaming ? (
        <p className="mt-3 flex items-center gap-2 text-[13.5px] font-black text-emerald-600 dark:text-emerald-400">
          <Check size={16} strokeWidth={3} /> La caméra fonctionne. Le scan des QR est disponible.
        </p>
      ) : null}

      {on && error ? (
        <p className="mt-3 text-[13.5px] font-semibold leading-relaxed text-red-600 dark:text-red-400">
          {error} — autorisez la caméra dans les réglages du navigateur, puis relancez le test. Sans
          caméra, la réception se fait en saisissant le code à la main.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setOn((current) => !current)}
        className="mt-3 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-black text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        {on ? "Arrêter le test" : "Tester la caméra"}
      </button>
    </div>
  );
}

export default function RelayStates({
  focus,
  readiness,
  status,
  manager,
  email,
  lastError,
  parcelCount,
  onNavigate,
  onLogout,
}: {
  /** Entrée dépliée à l'ouverture, quand on arrive depuis le menu. */
  focus?: string | null;
  /** Les trois conditions d'ouverture, telles que le portail les évalue. */
  readiness: ReadonlyArray<readonly [string, boolean, string]>;
  status: string;
  manager: string;
  email: string;
  /** Dernier message d'erreur d'opération, s'il y en a eu un. */
  lastError: string | null;
  parcelCount: number;
  onNavigate: (tab: "capacite" | "kyc" | "aide") => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState<string | null>(focus ?? null);
  // Photo du cache prise au montage : elle sert a expliquer ce que le gerant
  // voit hors ligne, pas a suivre le cache en direct.
  const [cache] = useState<OfflineCacheStats>(() => getOfflineCacheStats());
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  // Le menu designe l'entree a ouvrir. On l'applique PENDANT le rendu plutot
  // que dans un effet : un effet provoquerait un premier rendu avec la
  // mauvaise entree depliee, puis un second pour la corriger.
  const [seenFocus, setSeenFocus] = useState(focus);
  if (focus !== seenFocus) {
    setSeenFocus(focus);
    setOpen(focus ?? null);
  }

  useEffect(() => {
    appReleaseApi.getLatest("RELAY_POINT").then(setRelease).catch(() => undefined);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const pending = readiness.filter(([, ok]) => !ok);

  const body = (id: string) => {
    switch (id) {
      case "connexion":
        return (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <Fact label="Session ouverte au nom de" value={manager} />
              <Fact label="Adresse du compte" value={email || "non renseignée"} />
            </div>
            <p className="mt-3 text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
              Un seul compte tient ce relais. Si vous vous déconnectez, il faudra les identifiants
              BelivaY pour rouvrir le guichet — ne le faites pas en pleine journée sans les avoir sous
              la main.
            </p>
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 w-full rounded-[12px] border border-red-100 bg-red-50 px-4 py-3 text-[15px] font-black text-red-700 transition active:scale-[.97] dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              Se déconnecter
            </button>
          </>
        );

      case "invitation":
        return (
          <p className="text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
            Pas encore disponible. Un point relais est aujourd'hui un compte unique : il n'y a ni
            second identifiant, ni rôle limité, ni invitation. Si quelqu'un d'autre tient le comptoir
            à votre place, il travaille sous votre compte et les remises sont tracées à votre nom.
            Prévenez le support avant de confier vos identifiants.
          </p>
        );

      case "neuf":
        return (
          <>
            <p className="text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
              {parcelCount > 0
                ? `Votre relais n'est plus neuf : ${parcelCount} colis y sont passés ou s'y trouvent. Les écrans vides ne s'affichent plus.`
                : "Tant qu'aucun colis n'est arrivé, chaque écran affiche son état vide : pas de tableau à moitié rempli, pas de chiffre à zéro sans explication."}
            </p>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {readiness.map(([label, ok, detail]) => (
                <Fact
                  key={label}
                  label={label}
                  value={ok ? "fait" : detail}
                  tone={ok ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}
                />
              ))}
            </div>
          </>
        );

      case "statut":
        return (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <Fact
                label="État actuel"
                value={status}
                tone={
                  status === "Ouvert"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : status === "Suspendu"
                      ? "text-red-600 dark:text-red-400"
                      : "text-orange-600 dark:text-orange-400"
                }
              />
            </div>
            <p className="mt-3 text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
              {pending.length === 0
                ? "Les trois conditions d'ouverture sont remplies : BelivaY peut vous envoyer des colis."
                : `Il manque ${pending.length === 1 ? "une condition" : `${pending.length} conditions`} : ${pending
                    .map(([label]) => label.toLowerCase())
                    .join(", ")}. Tant qu'elles ne sont pas remplies, aucune tournée ne vise votre relais.`}
            </p>
            {pending.length > 0 ? (
              <button
                type="button"
                onClick={() => onNavigate(pending[0][0] === "KYC BelivaY" ? "kyc" : "capacite")}
                className="mt-3 w-full rounded-[12px] bg-gradient-to-r from-[#F58A1F] to-[#E8590C] px-4 py-3 text-[15px] font-black text-white transition active:scale-[.97]"
              >
                Compléter maintenant
              </button>
            ) : null}
          </>
        );

      case "offline":
        return (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <Fact
                label="Réseau"
                value={online ? "connecté" : "coupé"}
                tone={online ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}
              />
              <Fact label="Écrans gardés en mémoire" value={String(cache.entries)} />
              <Fact
                label="Donnée la plus ancienne"
                value={cache.oldest ? DATE_LONGUE.format(cache.oldest) : "aucune"}
              />
            </div>
            <p className="mt-3 text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
              Sans réseau, le portail réaffiche les derniers écrans reçus — vous pouvez consulter, pas
              valider. Une remise, une réception ou un constat exigent la connexion : ils touchent à
              l'argent et aux preuves, ils ne se mettent pas en file d'attente.
            </p>
          </>
        );

      case "erreur":
        return (
          <>
            {lastError ? (
              <div className="rounded-[12px] border border-red-100 bg-red-50 px-4 py-3 text-[13.5px] font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                Dernière erreur : {lastError}
              </div>
            ) : (
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Aucune erreur depuis l'ouverture de cet écran.
              </p>
            )}
            <p className="mt-3 text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
              Une opération refusée ne se perd pas en silence : le message rouge en haut de l'écran dit
              ce que le serveur a refusé, et rien n'est enregistré à moitié. Recommencez le geste ; si
              le refus se répète à l'identique, c'est une règle métier, pas une panne — passez par
              l'aide.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("aide")}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-black text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              Ouvrir l'aide
            </button>
          </>
        );

      case "camera":
        return <CameraTest />;

      case "install":
        return release ? (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <Fact label="Version publiée" value={`v${release.version}`} />
            </div>
            <p className="mt-3 text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
              L'application installée garde la caméra et les preuves même quand le navigateur est
              fermé. Elle ne passe pas par le Play Store : le fichier vient directement de BelivaY.
            </p>
            <a
              href={release.apk_url}
              className="mt-3 block w-full rounded-[12px] bg-gradient-to-r from-[#F58A1F] to-[#E8590C] px-4 py-3 text-center text-[15px] font-black text-white transition active:scale-[.97]"
            >
              Télécharger l'application
            </a>
          </>
        ) : (
          <p className="text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
            Aucune version n'est publiée pour le portail point relais en ce moment. Continuez depuis
            le navigateur : toutes les opérations y sont disponibles.
          </p>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Écrans d'état et d'accès
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium text-slate-500 dark:text-slate-400">
          Ce que fait le portail quand quelque chose sort de l'ordinaire.
        </p>
      </header>

      <section className="overflow-hidden rounded-[18px] border border-slate-200/70 bg-white shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {STATE_ENTRIES.map(({ id, icon: Icon, label }) => {
            const on = open === id;
            const offlineRow = id === "offline" && !online;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setOpen(on ? null : id)}
                  aria-expanded={on}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:scale-[.99]"
                >
                  {offlineRow ? (
                    <WifiOff size={20} strokeWidth={2.1} className="flex-shrink-0 text-orange-500" />
                  ) : (
                    <Icon size={20} strokeWidth={2.1} className="flex-shrink-0 text-[#E8590C]" />
                  )}
                  <span className="min-w-0 flex-1 text-[15.5px] font-bold text-slate-900 dark:text-white">
                    {label}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 text-slate-300 transition-transform duration-200 dark:text-slate-600 ${
                      on ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {on ? <div className="px-4 pb-4">{body(id)}</div> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
