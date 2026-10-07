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
 * DEUX CAS DÉCRIVENT UNE PROTECTION QUI N'EXISTE PAS
 *
 * « Encore 2 essais » et « Colis bloqué 24 h » supposent un compteur
 * d'essais sur le code de retrait et un verrouillage temporaire. Ni l'un ni
 * l'autre n'est implémenté : aujourd'hui un code faux échoue, et on peut
 * réessayer indéfiniment. Ces deux fiches sont donc marquées « à venir » —
 * un catalogue qui enseigne une règle inappliquée formerait le gérant à
 * rassurer un client sur une protection absente.
 *
 * La règle commune, elle, vaut pour tous : un message dit ce qui s'est
 * passé, ce que le gérant peut faire, et ne montre jamais de code technique.
 */
import { useState } from "react";
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
      <>
        Ce code ne correspond à aucun colis de votre relais. <strong>Encore 2 essais</strong> pour ce
        colis, puis il sera bloqué 24 h.
      </>
    ),
    actions: [{ label: "Ressaisir le code", style: "bleu", cible: "retrait" }],
    aVenir: true,
  },
  {
    key: "colis-bloque",
    chip: "Colis bloqué",
    ton: "rouge",
    icon: Lock,
    titre: "Colis bloqué 24 h",
    corps: (
      <>
        3 codes faux de suite pour BV-40231. Le colis est bloqué jusqu'à demain 10:14 et BelivaY est
        prévenu. Le client doit passer par le support ; vous ne pouvez pas débloquer vous-même.
      </>
    ),
    actions: [{ label: "Écrire au support", style: "blanc", cible: "messagerie" }],
    aVenir: true,
  },
  {
    key: "paiement",
    chip: "Paiement",
    ton: "ambre",
    icon: CreditCard,
    titre: "Paiement non abouti",
    corps: (
      <>
        La demande de 400 F n'a pas été validée par le client (délai de 3 minutes dépassé ou solde
        insuffisant). <strong>Rien n'a été débité.</strong>
      </>
    ),
    actions: [
      { label: "Annuler", style: "blanc" },
      { label: "Renvoyer la demande", style: "orange" },
    ],
  },
  {
    key: "qr",
    chip: "Mauvais QR",
    ton: "rouge",
    icon: QrCode,
    titre: "Ce colis n'est pas pour votre relais",
    corps: (
      <>
        L'étiquette scannée (BV-40412, lot M-4133) est destinée au relais Mvog-Mbi. Ne prenez pas ce
        colis : le livreur doit l'y déposer.
      </>
    ),
    actions: [{ label: "Signaler au support", style: "blanc", cible: "messagerie" }],
  },
  {
    key: "reseau",
    chip: "Sans réseau",
    ton: "ambre",
    icon: Wifi,
    titre: "Réseau nécessaire pour le paiement",
    corps: (
      <>
        Ce colis a 400 F de garde à régler. Le paiement Mobile Money a besoin du réseau : attendez le
        retour de la connexion ou proposez au client de repasser.{" "}
        <strong>Même en mode papier, un colis avec un montant ne se remet pas.</strong>
      </>
    ),
    actions: [{ label: "Réessayer", style: "blanc" }],
  },
  {
    key: "non-remettable",
    chip: "Non remettable",
    ton: "ambre",
    icon: TriangleAlert,
    titre: "Ce colis ne peut pas être remis",
    corps: (
      <>
        BV-40077 est <strong>en constat</strong> (dossier LIT-00912) : il reste au relais, sans
        frais, jusqu'à la décision. Même chose pour un colis en groupage ou à renvoyer.
      </>
    ),
    actions: [{ label: "Voir le dossier", style: "blanc", cible: "litiges" }],
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
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          États d'erreur au comptoir
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          Ce que voit le gérant quand quelque chose bloque. Choisissez un cas.
        </p>
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
            La fiche decrit une protection que le serveur n'applique pas
            encore : aucun compteur d'essais, aucun verrouillage 24 h sur un
            colis. Le dire evite qu'un gerant rassure un client sur une
            securite absente.
          */}
          {cas.aVenir ? (
            <p className="mt-3 rounded-[10px] bg-slate-100 px-3 py-2 text-[12.5px] font-semibold leading-snug text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {cas.key === "non-remettable"
                ? "Message prévu : la garde continue de courir pendant un constat, elle n'est pas encore suspendue."
                : "Message prévu : le comptage des essais et le blocage 24 h ne sont pas encore appliqués."}
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
        <HelpCircle size={18} strokeWidth={2.2} className="mt-[2px] flex-shrink-0" />
        Règle commune : un message d'erreur dit ce qui s'est passé, ce que le gérant peut faire, et ne
        montre jamais de code technique.
      </p>
    </div>
  );
}
