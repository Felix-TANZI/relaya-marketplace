/**
 * Le corps des paramètres : sécurité, affichage, compte.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UN RÉGLAGE QUI N'AGIT PAS EST UN MENSONGE
 *
 * Plusieurs lignes de cet écran décrivent des protections que le serveur ne
 * porte pas encore : le PIN de remise, la double vérification, la liste des
 * appareils, l'équipe. Elles sont présentes — un gérant doit savoir ce que
 * le produit prévoit — mais aucune n'affiche un interrupteur allumé.
 *
 * C'est le seul endroit où je m'écarte de la maquette, et sciemment : un
 * interrupteur « Code PIN de remise » en position active dit au gérant que
 * ses remises sont protégées par un code. Elles ne le sont pas. Une
 * promesse de sécurité fausse coûte plus cher qu'une case grise.
 */
import { useEffect, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  Globe,
  Lock,
  LogOut,
  Moon,
  ShieldCheck,
  Smartphone,
  User,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RelaySheet, RelaySheetHeader } from "./RelayUi";

/** Les trois tailles de texte proposées. */
const TAILLES = [
  { key: "normal", label: "Normale", zoom: 1 },
  { key: "large", label: "Grande", zoom: 1.15 },
  { key: "xlarge", label: "Très grande", zoom: 1.3 },
] as const;

type TailleKey = (typeof TAILLES)[number]["key"];

const CLE_TAILLE = "belivay-relay-text-scale";

/** Chevron de ligne : fin et pâle, il indique sans attirer. */
function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] flex-shrink-0 text-slate-300 dark:text-slate-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/** Pastille d'icône : ambre pour ce qui se règle, bleu pour ce qui s'ouvre. */
function Pastille({ icon: Icon, tone }: { icon: LucideIcon; tone: "amber" | "blue" }) {
  return (
    <span
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] ${
        tone === "amber"
          ? "bg-[#FFF1E2] text-[#EF6A00] dark:bg-orange-950 dark:text-orange-300"
          : "bg-[#EAF0FF] text-[#3A6BEA] dark:bg-blue-950 dark:text-blue-300"
      }`}
    >
      <Icon size={19} strokeWidth={2.2} />
    </span>
  );
}

function Ligne({
  icon,
  tone,
  title,
  body,
  right,
  onClick,
}: {
  icon: LucideIcon;
  tone: "amber" | "blue";
  title: string;
  body?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const contenu = (
    <>
      <Pastille icon={icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">{title}</span>
        {body ? (
          <span className="mt-1 block text-[13px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
            {body}
          </span>
        ) : null}
      </span>
      {right}
    </>
  );

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 py-3.5 text-left transition active:scale-[.99]"
    >
      {contenu}
    </button>
  ) : (
    <div className="flex items-start gap-3 py-3.5">{contenu}</div>
  );
}

/** Interrupteur. Désactivé, il reste gris : jamais allumé par décoration. */
function Bascule({
  on,
  disabled,
  label,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  label: string;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-disabled={disabled}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`mt-0.5 flex h-[30px] w-[52px] flex-shrink-0 items-center rounded-full px-[3px] transition ${
        on ? "bg-[#2456D6]" : "bg-slate-300 dark:bg-slate-700"
      } ${disabled ? "opacity-45" : ""}`}
    >
      <span
        className={`h-6 w-6 rounded-full bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] transition-transform duration-200 ${
          on ? "translate-x-[22px]" : ""
        }`}
      />
    </button>
  );
}

/** Ce que le portail ne sait pas encore faire, dit sans détour. */
const INDISPONIBLES: Record<string, { title: string; body: string }> = {
  pin: {
    title: "Code PIN de remise",
    body:
      "Pas encore disponible. La remise se prouve aujourd'hui par la signature du client au doigt et la "
      + "photo, prises au comptoir. Aucun code secret n'est conservé côté BelivaY, et le code de retrait ne "
      + "peut pas en tenir lieu : il a déjà servi à ouvrir la remise.",
  },
  twofa: {
    title: "Double vérification",
    body:
      "Pas encore disponible. Votre compte s'ouvre avec vos seuls identifiants, sur n'importe quel appareil. "
      + "Ne les confiez à personne : les remises faites avec sont tracées à votre nom.",
  },
  devices: {
    title: "Appareils connectés",
    body:
      "Pas encore disponible. BelivaY ne tient pas la liste des appareils où votre compte est ouvert, et ne "
      + "peut pas les déconnecter à distance. Si vous pensez qu'un autre appareil y a accès, changez votre "
      + "mot de passe et prévenez le support.",
  },
  team: {
    title: "Mon équipe",
    body:
      "Pas encore disponible. Un point relais est un compte unique : ni second identifiant, ni rôle limité. "
      + "Si quelqu'un tient le comptoir à votre place, il travaille sous votre compte et les remises sont "
      + "tracées à votre nom.",
  },
  data: {
    title: "Mes données",
    body:
      "Pas encore disponible depuis cet écran. Vos preuves — photos de réception et de remise, signatures — "
      + "restent attachées à chaque expédition. Une demande d'accès ou de correction se fait par le support.",
  },
  close: {
    title: "Clôturer le compte",
    body:
      "Pas encore disponible depuis cet écran. La clôture se demande au support : il faut d'abord que tous "
      + "vos colis en garde soient sortis et que votre dernier versement soit crédité.",
  },
};

export default function RelaySettingsBody({
  locale,
  theme,
  onToggleTheme,
  onChangeLanguage,
  version,
  payoutMasked,
  onOpenPayout,
  onInstall,
  onSupport,
  onLogout,
}: {
  locale: "fr" | "en";
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onChangeLanguage: (next: "fr" | "en") => void;
  /** Mention de version, telle que le pied de menu l'affiche. */
  version: string;
  /** Numéro de versement masqué, vide s'il n'y en a pas. */
  payoutMasked: string;
  onOpenPayout: () => void;
  onInstall: () => void;
  onSupport: () => void;
  onLogout: () => void;
}) {
  const [sheet, setSheet] = useState<string | null>(null);
  // La taille se relit a la construction, pas dans un effet : lue apres coup,
  // elle provoquerait un premier rendu a la mauvaise taille puis un saut.
  // Elle ne quitte pas cet appareil — c'est un confort de lecture, pas un
  // reglage de compte.
  const [taille, setTaille] = useState<TailleKey>(() => {
    try {
      const stockee = localStorage.getItem(CLE_TAILLE) as TailleKey | null;
      if (stockee && TAILLES.some((item) => item.key === stockee)) return stockee;
    } catch {
      /* Navigation privee : on reste sur la taille normale. */
    }
    return "normal";
  });
  const [tailleOpen, setTailleOpen] = useState(false);

  useEffect(() => {
    const portail = document.querySelector<HTMLElement>(".belivay-portal");
    if (!portail) return;
    const choix = TAILLES.find((item) => item.key === taille) ?? TAILLES[0];
    portail.style.setProperty("zoom", choix.zoom === 1 ? "" : String(choix.zoom));
    try {
      localStorage.setItem(CLE_TAILLE, taille);
    } catch {
      /* Navigation privee : le reglage vaut pour la session, c'est tout. */
    }
  }, [taille]);

  const tailleLabel = TAILLES.find((item) => item.key === taille)?.label ?? "Normale";

  return (
    <>
      {/* ── Sécurité ─────────────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-2 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">Sécurité</h3>
        <div className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
          <Ligne
            icon={Lock}
            tone="amber"
            title="Code PIN de remise"
            body="Prévu, pas encore actif : la remise se signe au doigt"
            onClick={() => setSheet("pin")}
            right={<Bascule on={false} disabled label="Code PIN de remise" />}
          />
          <Ligne
            icon={ShieldCheck}
            tone="amber"
            title="Double vérification"
            body="Prévu, pas encore actif : code SMS sur un nouvel appareil"
            onClick={() => setSheet("twofa")}
            right={<Bascule on={false} disabled label="Double vérification" />}
          />
          <Ligne
            icon={Smartphone}
            tone="blue"
            title="Appareils connectés"
            body="Déconnexion à distance — pas encore disponible"
            onClick={() => setSheet("devices")}
            right={<span className="mt-1.5"><Chevron /></span>}
          />
          <Ligne
            icon={User}
            tone="blue"
            title="Mon équipe"
            body="Un compte unique aujourd'hui · ils reçoivent et remettent sous votre nom"
            onClick={() => setSheet("team")}
            right={<span className="mt-1.5"><Chevron /></span>}
          />
        </div>
      </section>

      {/* ── Affichage et application ─────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-2 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Affichage et application
        </h3>
        <div className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
          <Ligne
            icon={Moon}
            tone="amber"
            title="Thème sombre"
            body="Pour le guichet en fin de journée"
            right={
              <Bascule on={theme === "dark"} label="Thème sombre" onToggle={onToggleTheme} />
            }
          />

          <Ligne
            icon={Eye}
            tone="amber"
            title="Taille du texte"
            body="Normale, Grande (115 %) ou Très grande (130 %)"
            onClick={() => setTailleOpen((current) => !current)}
            right={
              <span className="mt-0.5 flex-shrink-0 rounded-full bg-[#EAF0FF] px-3.5 py-[6px] text-[13px] font-bold text-[#2456D6] dark:bg-blue-950 dark:text-blue-200">
                {tailleLabel}
              </span>
            }
          />
          {tailleOpen ? (
            <div className="flex gap-1.5 py-3 pl-[52px]">
              {TAILLES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTaille(item.key)}
                  className={`flex-1 rounded-[10px] px-2 py-2 text-[13px] font-bold transition active:scale-95 ${
                    taille === item.key
                      ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(60,35,15,.12)] dark:bg-slate-700 dark:text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          {/* Le pidgin figure au produit mais pas dans les traductions : la
              case existe, elle ne se choisit pas encore. */}
          <Ligne
            icon={Globe}
            tone="amber"
            title="Langue"
            right={
              <span className="mt-0.5 flex flex-shrink-0 items-center gap-0.5 rounded-[10px] bg-slate-100 p-1 dark:bg-slate-800">
                {(["fr", "en", "pidgin"] as const).map((code) => {
                  const dispo = code !== "pidgin";
                  const on = dispo && locale === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={!dispo}
                      onClick={() => dispo && onChangeLanguage(code)}
                      className={`rounded-[8px] px-2.5 py-1.5 text-[13px] font-bold transition ${
                        on
                          ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:bg-slate-700 dark:text-white"
                          : "text-slate-500 dark:text-slate-400"
                      } ${dispo ? "" : "opacity-40"}`}
                    >
                      {code === "pidgin" ? "Pidgin" : code.toUpperCase()}
                    </button>
                  );
                })}
              </span>
            }
          />

          <Ligne
            icon={Wifi}
            tone="amber"
            title="Hors connexion"
            body="Consultation seule : les réceptions et remises exigent le réseau"
            right={
              <span className="mt-0.5 flex-shrink-0 rounded-full border border-[#F0DA9C] bg-[#FFF4D6] px-3 py-[5px] text-[12.5px] font-bold text-[#8A5A00] dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Partiel
              </span>
            }
          />

          <Ligne
            icon={Download}
            tone="blue"
            title="Installer l'application"
            body="Icône sur l'écran d'accueil, caméra et preuves hors navigateur"
            onClick={onInstall}
            right={<span className="mt-1.5"><Chevron /></span>}
          />

          <Ligne
            icon={Smartphone}
            tone="blue"
            title="Numéro de versement"
            body={payoutMasked || "Aucun numéro enregistré"}
            onClick={onOpenPayout}
            right={<span className="mt-1.5"><Chevron /></span>}
          />

          <Ligne
            icon={FileText}
            tone="blue"
            title="Mes données"
            body="Consulter, corriger, exporter — par le support"
            onClick={() => setSheet("data")}
            right={<span className="mt-1.5"><Chevron /></span>}
          />

          <Ligne
            icon={LogOut}
            tone="blue"
            title="Clôturer le compte"
            body="Avec un préavis de 30 jours"
            onClick={() => setSheet("close")}
            right={<span className="mt-1.5"><Chevron /></span>}
          />

          <div className="flex items-center justify-between gap-3 py-3.5">
            <span className="text-[14px] font-medium text-slate-500 dark:text-slate-400">Version</span>
            <span className="text-right text-[14px] font-black text-slate-900 dark:text-white">{version}</span>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2.5 rounded-[14px] border border-red-100 bg-[#FDECEA] px-4 py-4 text-[16px] font-black text-[#B42318] transition active:scale-[.97] dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        <LogOut size={18} strokeWidth={2.4} /> Se déconnecter
      </button>

      {sheet && INDISPONIBLES[sheet] ? (
        <RelaySheet label={INDISPONIBLES[sheet].title} onClose={() => setSheet(null)} size="sm">
          <RelaySheetHeader
            icon={ShieldCheck}
            title={INDISPONIBLES[sheet].title}
            subtitle="Ce que le portail fait aujourd'hui, et ce qu'il ne fait pas encore."
            onClose={() => setSheet(null)}
          />
          <p className="text-[13.5px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
            {INDISPONIBLES[sheet].body}
          </p>
          <button
            type="button"
            onClick={() => {
              setSheet(null);
              onSupport();
            }}
            className="mt-5 w-full rounded-[12px] border border-slate-200 bg-white px-5 py-3 text-[15px] font-black text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Écrire au support
          </button>
        </RelaySheet>
      ) : null}
    </>
  );
}
