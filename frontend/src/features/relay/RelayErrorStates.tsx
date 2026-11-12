/**
 * États d'erreur au comptoir — le catalogue des messages de blocage.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CET ÉCRAN NE DÉCLENCHE RIEN
 *
 * Il MONTRE. C'est une page de référence : le gérant y vient pour
 * reconnaître un message avant de le rencontrer, et le support pour savoir
 * ce que le gérant a sous les yeux au téléphone. Son propre sous-titre le
 * dit — « Choisissez un cas ».
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UN SEUL CAS DÉCRIT ENCORE UNE PROTECTION QUI N'EXISTE PAS
 *
 * « Encore 2 essais » et « Colis bloqué 24 h » sont désormais appliqués
 * cote serveur (RelayPickupAttempt, §8.2 Regles Systeme DEV v2.0 : 3 codes
 * faux consecutifs bloquent le code 24 h, BelivaY est prevenu). Seul
 * « Non remettable » reste une regle affichee mais pas appliquee : rien ne
 * suspend `garde_fee_due()` pendant un constat, faute d'un etat « colis en
 * constat » dans le modele — a construire avant de retirer son « à venir ».
 *
 * La règle commune, elle, vaut pour tous : un message dit ce qui s'est
 * passé, ce que le gérant peut faire, et ne montre jamais de code technique.
 */
import { useState } from "react";
import i18n from "@/i18n";
import {
  CreditCard, HelpCircle, Lock, QrCode, TriangleAlert, Wifi, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RelayTab } from "./relayNav";

type Ton = "rouge" | "ambre";

const TON_STYLE: Record<Ton, { liseré: string; tuile: string }> = {
  rouge: {
    liseré: "bg-[#B42318]",
    tuile: "bg-[#FDECEA] text-[#B42318] dark:bg-red-950/50 dark:text-red-300",
  },
  ambre: {
    liseré: "bg-[#8A5A00]",
    tuile: "bg-[#FFF4D6] text-[#8A5A00] dark:bg-amber-950/50 dark:text-amber-300",
  },
};

interface Action {
  label: string;
  /** Bleu pour reprendre la saisie, orange pour relancer, blanc sinon. */
  style: "bleu" | "orange" | "blanc";
  cible?: RelayTab;
}

interface Cas {
  key: string;
  chip: string;
  ton: Ton;
  icon: LucideIcon;
  titre: string;
  /** Le code saisi, affiché en cases rouges au-dessus de la fiche. */
  code?: string;
  corps: React.ReactNode;
  actions: Action[];
  /** La règle décrite n'est pas encore appliquée par le serveur. */
  aVenir?: boolean;
}

const CAS: Cas[] = [
  {
    key: "code-faux",
    chip: "Code faux",
    ton: "rouge",
    icon: X,
    titre: "Code incorrect",
    code: "482951",
    corps: (
      <>{i18n.t("t06.ce_code_ne_correspond_a_aucun_colis_de_vot")}<strong>Encore 2 essais</strong>{i18n.t("t06.pour_ce_colis_puis_il_sera_bloque_24_h")}</>
    ),
    actions: [{ label: i18n.t("rl3.ressaisir_le_code"), style: "bleu", cible: "retrait" }],
  },
  {
    key: "colis-bloque",
    chip: i18n.t("rl3.colis_bloque"),
    ton: "rouge",
    icon: Lock,
    titre: i18n.t("rl3.colis_bloque_24_h"),
    corps: (
      <>
        3 codes faux de suite pour BV-40231. Le colis est bloqué jusqu'à demain 10:14 et BelivaY est
        prévenu. Le client doit passer par le support ; vous ne pouvez pas débloquer vous-même.
      </>
    ),
    actions: [{ label: i18n.t("rl3.ecrire_au_support"), style: "blanc", cible: "messagerie" }],
  },
  {
    key: "paiement",
    chip: "Paiement",
    ton: "ambre",
    icon: CreditCard,
    titre: "Paiement non abouti",
    corps: (
      <>{i18n.t("t06.la_demande_de_400_f_n_a_pas_ete_validee_pa")}<strong>{i18n.t("rl3.rien_n_a_ete_debite")}</strong>
      </>
    ),
    actions: [
      { label: "Annuler", style: "blanc" },
      { label: i18n.t("rl3.renvoyer_la_demande"), style: "orange" },
    ],
  },
  {
    key: "qr",
    chip: "Mauvais QR",
    ton: "rouge",
    icon: QrCode,
    titre: i18n.t("rl3.ce_colis_n_est_pas_pour_votre_relais"),
    corps: (
      <>{i18n.t("t06.l_etiquette_scannee_bv_40412_lot_m_4133_es")}</>
    ),
    actions: [{ label: i18n.t("rl3.signaler_au_support"), style: "blanc", cible: "messagerie" }],
  },
  {
    key: "reseau",
    chip: i18n.t("rl3.sans_reseau"),
    ton: "ambre",
    icon: Wifi,
    titre: i18n.t("rl3.reseau_necessaire_pour_le_paiement"),
    corps: (
      <>{i18n.t("t06.ce_colis_a_400_f_de_garde_a_regler_le_paie")}{" "}
        <strong>{i18n.t("rl3.meme_en_mode_papier_un_colis_avec_un_monta")}</strong>
      </>
    ),
    actions: [{ label: "Réessayer", style: "blanc" }],
  },
  {
    key: "non-remettable",
    chip: "Non remettable",
    ton: "ambre",
    icon: TriangleAlert,
    titre: i18n.t("rl3.ce_colis_ne_peut_pas_etre_remis"),
    corps: (
      <>{i18n.t("t06.bv_40077_est")}<strong>en constat</strong>{i18n.t("t06.dossier_lit_00912_il_reste_au_relais_sans")}</>
    ),
    actions: [{ label: i18n.t("rl3.voir_le_dossier"), style: "blanc", cible: "litiges" }],
    // « Sans frais pendant le dossier » est une regle affichee, pas appliquee :
    // rien ne suspend `garde_fee_due()` quand un constat est ouvert.
    aVenir: true,
  },
];

export default function RelayErrorStates({ onNavigate }: { onNavigate: (tab: RelayTab) => void }) {
  const [actif, setActif] = useState(CAS[0].key);
  const cas = CAS.find((item) => item.key === actif) ?? CAS[0];
  const style = TON_STYLE[cas.ton];

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">{i18n.t("t06.etats_d_erreur_au_comptoir")}</h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">{i18n.t("t06.ce_que_voit_le_gerant_quand_quelque_chose")}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {CAS.map((item) => {
          const on = item.key === actif;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={on}
              onClick={() => setActif(item.key)}
              className={`rounded-full px-3.5 py-[7px] text-[13px] font-bold transition active:scale-[.96] ${
                on
                  ? "bg-[#2456D6] text-white shadow-[0_2px_8px_rgba(36,86,214,.3)]"
                  : "bg-white text-slate-600 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {item.chip}
            </button>
          );
        })}
      </div>

      {/* Le code saisi, en cases rouges : c'est ce que le gérant a sous les
          yeux au moment du refus. */}
      {cas.code ? (
        <div className="flex gap-2">
          {cas.code.split("").map((chiffre, rang) => (
            <span
              key={`${chiffre}-${rang}`}
              className="flex h-[52px] flex-1 items-center justify-center rounded-[11px] border border-[#F4C3BE] bg-[#FDECEA] text-[22px] font-black tabular-nums text-[#B42318] dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {chiffre}
            </span>
          ))}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <span className={`block h-[3px] ${style.liseré}`} aria-hidden />
        <div className="px-5 pb-5 pt-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px] ${style.tuile}`}>
              <cas.icon size={21} strokeWidth={2.2} />
            </span>
            <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
              {cas.titre}
            </h3>
          </div>

          <p className="mt-3.5 text-[14px] font-medium leading-[1.55] text-slate-600 dark:text-slate-300">
            {cas.corps}
          </p>

          {/*
            Seul « non-remettable » porte encore aVenir : rien ne suspend
            garde_fee_due() pendant un constat. Le dire evite qu'un gerant
            rassure un client sur une protection absente.
          */}
          {cas.aVenir ? (
            <p className="mt-3 rounded-[10px] bg-slate-100 px-3 py-2 text-[12.5px] font-semibold leading-snug text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {cas.key === "non-remettable"
                ? i18n.t("rl3.message_prevu_la_garde_continue_de_courir")
                : i18n.t("rl3.message_prevu_le_comptage_des_essais_et_le")}
            </p>
          ) : null}

          <div className={`mt-4 ${cas.actions.length > 1 ? "grid grid-cols-2 gap-2.5" : ""}`}>
            {cas.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => action.cible && onNavigate(action.cible)}
                className={`pr-btn w-full rounded-[12px] px-4 py-3.5 text-[15px] font-black transition active:scale-[.97] ${ action.style === "bleu" ? "bg-[#2456D6] text-white shadow-[0_4px_14px_rgba(36,86,214,.35)]" : action.style === "orange" ? " text-white " : "border border-slate-200 bg-white font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <p className="flex items-start gap-2.5 rounded-[14px] bg-[#EAF0FF] px-4 py-3.5 text-[13px] font-medium leading-[1.55] text-[#1E4BC4] dark:bg-blue-950/40 dark:text-blue-200">
        <HelpCircle size={18} strokeWidth={2.2} className="mt-[2px] flex-shrink-0" />{i18n.t("t06.regle_commune_un_message_d_erreur_dit_ce_q")}</p>
    </div>
  );
}
