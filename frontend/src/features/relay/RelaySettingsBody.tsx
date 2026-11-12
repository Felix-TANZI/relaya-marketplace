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
import i18n from "@/i18n";
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
  { key: "xlarge", label: i18n.t("rl3.tres_grande"), zoom: 1.3 },
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
    title: i18n.t("rl3.code_pin_de_remise"),
    body:
      i18n.t("rl3.pas_encore_disponible_la_remise_se_prouve")
      + i18n.t("rl3.photo_prises_au_comptoir_aucun_code_secret")
      + i18n.t("rl3.peut_pas_en_tenir_lieu_il_a_deja_servi_a_o"),
  },
  twofa: {
    title: i18n.t("rl3.double_verification"),
    body:
      i18n.t("rl3.pas_encore_disponible_votre_compte_s_ouvre")
      + i18n.t("rl3.ne_les_confiez_a_personne_les_remises_fait"),
  },
  devices: {
    title: i18n.t("rl3.appareils_connectes"),
    body:
      i18n.t("rl3.pas_encore_disponible_belivay_ne_tient_pas")
      + i18n.t("rl3.peut_pas_les_deconnecter_a_distance_si_vou")
      + i18n.t("rl3.mot_de_passe_et_prevenez_le_support"),
  },
  team: {
    title: i18n.t("rl3.mon_equipe"),
    body:
      i18n.t("rl3.pas_encore_disponible_un_point_relais_est")
      + i18n.t("rl3.si_quelqu_un_tient_le_comptoir_a_votre_pla")
      + i18n.t("rl3.tracees_a_votre_nom"),
  },
  data: {
    title: i18n.t("rl3.mes_donnees"),
    body:
      i18n.t("rl3.pas_encore_disponible_depuis_cet_ecran_vos")
      + i18n.t("rl3.restent_attachees_a_chaque_expedition_une"),
  },
  close: {
    title: i18n.t("rl3.cloturer_le_compte"),
    body:
      i18n.t("rl3.pas_encore_disponible_depuis_cet_ecran_la")
      + i18n.t("rl3.vos_colis_en_garde_soient_sortis_et_que_vo"),
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
            title={i18n.t("rl3.code_pin_de_remise")}
            body={i18n.t("rl3.prevu_pas_encore_actif_la_remise_se_signe")}
            onClick={() => setSheet("pin")}
            right={<Bascule on={false} disabled label={i18n.t("rl3.code_pin_de_remise")} />}
          />
          <Ligne
            icon={ShieldCheck}
            tone="amber"
            title={i18n.t("rl3.double_verification")}
            body={i18n.t("rl3.prevu_pas_encore_actif_code_sms_sur_un_nou")}
            onClick={() => setSheet("twofa")}
            right={<Bascule on={false} disabled label={i18n.t("rl3.double_verification")} />}
          />
          <Ligne
            icon={Smartphone}
            tone="blue"
            title={i18n.t("rl3.appareils_connectes")}
            body={i18n.t("rl3.deconnexion_a_distance_pas_encore_disponib")}
            onClick={() => setSheet("devices")}
            right={<span className="mt-1.5"><Chevron /></span>}
          />
          <Ligne
            icon={User}
            tone="blue"
            title={i18n.t("rl3.mon_equipe")}
            body={i18n.t("rl3.un_compte_unique_aujourd_hui_ils_recoivent")}
            onClick={() => setSheet("team")}
            right={<span className="mt-1.5"><Chevron /></span>}
          />
        </div>
      </section>

      {/* ── Affichage et application ─────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-2 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">{i18n.t("t06.affichage_et_application")}</h3>
        <div className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
          <Ligne
            icon={Moon}
            tone="amber"
            title={i18n.t("rl3.theme_sombre")}
            body={i18n.t("rl3.pour_le_guichet_en_fin_de_journee")}
            right={
              <Bascule on={theme === "dark"} label={i18n.t("rl3.theme_sombre")} onToggle={onToggleTheme} />
            }
          />

          <Ligne
            icon={Eye}
            tone="amber"
            title={i18n.t("rl3.taille_du_texte")}
            body={i18n.t("rl3.normale_grande_115_ou_tres_grande_130")}
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
            body={i18n.t("rl3.consultation_seule_les_receptions_et_remis")}
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
            body={i18n.t("rl3.icone_sur_l_ecran_d_accueil_camera_et_preu")}
            onClick={onInstall}
            right={<span className="mt-1.5"><Chevron /></span>}
          />

          <Ligne
            icon={Smartphone}
            tone="blue"
            title={i18n.t("rl3.numero_de_versement")}
            body={payoutMasked || "Aucun numéro enregistré"}
            onClick={onOpenPayout}
            right={<span className="mt-1.5"><Chevron /></span>}
          />

          <Ligne
            icon={FileText}
            tone="blue"
            title={i18n.t("rl3.mes_donnees")}
            body={i18n.t("rl3.consulter_corriger_exporter_par_le_support")}
            onClick={() => setSheet("data")}
            right={<span className="mt-1.5"><Chevron /></span>}
          />

          <Ligne
            icon={LogOut}
            tone="blue"
            title={i18n.t("rl3.cloturer_le_compte")}
            body={i18n.t("rl3.avec_un_preavis_de_30_jours")}
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
        <LogOut size={18} strokeWidth={2.4} />{i18n.t("t06.se_deconnecter")}</button>

      {sheet && INDISPONIBLES[sheet] ? (
        <RelaySheet label={INDISPONIBLES[sheet].title} onClose={() => setSheet(null)} size="sm">
          <RelaySheetHeader
            icon={ShieldCheck}
            title={INDISPONIBLES[sheet].title}
            subtitle={i18n.t("rl3.ce_que_le_portail_fait_aujourd_hui_et_ce_q")}
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
          >{i18n.t("t06.ecrire_au_support")}</button>
        </RelaySheet>
      ) : null}
    </>
  );
}
