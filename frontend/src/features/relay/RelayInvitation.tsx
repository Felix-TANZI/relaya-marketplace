/**
 * Rejoindre un relais : le parcours d'un employé invité par son gérant.
 *
 * Quatre étapes, dans l'ordre où elles engagent : on lit ce qu'on est invité
 * à faire, on choisit le code qui signera chaque remise, on suit la
 * formation, et on entre au guichet.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI UN PARCOURS, ET PAS UN FORMULAIRE
 *
 * Un employé n'ouvre pas un compte : il accepte une responsabilité. Il va
 * manipuler les colis d'autrui et signer des remises de son PIN. Le découpage
 * en étapes nommées — et la barre qui les montre toutes dès la première —
 * dit ce qui l'attend avant qu'il ne s'engage, plutôt que de le découvrir
 * écran après écran.
 *
 * Le bandeau d'invitation nomme l'inviteur ET le relais. « Vous êtes
 * invité » ne dit rien : c'est le nom du gérant qui permet de reconnaître
 * une invitation légitime, et de refuser celle qu'on n'attendait pas.
 *
 * La carte « Ce que vous pourrez faire » se termine sur ce qu'on NE pourra
 * pas faire. Dire ses limites à quelqu'un qui accepte est plus honnête que
 * de le laisser les découvrir devant un bouton grisé — et cela protège le
 * gérant, dont l'argent reste hors de portée.
 */
import { useState } from "react";
import {
  CalendarX,
  Check,
  ChevronLeft,
  GraduationCap,
  KeyRound,
  Lock,
  Package,
  ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RelayPinPad } from "./RelayUi";

type Etape = "bienvenue" | "pin" | "formation" | "pret";

/** Les étapes sont montrées toutes les quatre dès la première : on sait où on va. */
const ETAPES: Array<{ id: Etape; label: string }> = [
  { id: "bienvenue", label: "Bienvenue" },
  { id: "pin", label: "Code PIN" },
  { id: "formation", label: "Formation" },
  { id: "pret", label: "Prêt" },
];

/**
 * Ce que l'employé pourra faire, et ce qu'il ne pourra pas.
 *
 * `sourd` marque la dernière ligne : une limite n'est pas une capacité, et
 * lui donner la même tuile bleue qu'aux trois autres la ferait lire comme un
 * pouvoir de plus.
 */
const POUVOIRS: Array<{ icon: LucideIcon; titre: string; detail: string; sourd?: boolean }> = [
  {
    icon: Package,
    titre: "Recevoir",
    detail: "Code de dépôt du livreur, scan des colis, contrôle des scellés",
  },
  {
    icon: KeyRound,
    titre: "Remettre",
    detail: "Vérifier les codes, prendre la photo de remise",
  },
  {
    icon: CalendarX,
    titre: "Fermeture imprévue",
    detail: "Déclarer une fermeture pour aujourd'hui seulement",
  },
  {
    icon: Lock,
    titre: "Pas d'accès à l'argent",
    detail: "Versements, rapports et paramètres : gérant uniquement",
    sourd: true,
  },
];

/**
 * Le socle obligatoire de l'employé : cinq modules, 46 minutes.
 *
 * Ce n'est pas le catalogue du gérant (`RelayTrainingMobile`), qui en compte
 * six et descend jusqu'à l'anglais et au pidgin. Un employé doit savoir
 * tenir le comptoir ; le gérant doit en plus savoir tenir la boutique.
 */
const MODULES: Array<{ titre: string; minutes: number }> = [
  { titre: "Réception et scellés", minutes: 12 },
  { titre: "Retrait, codes et tiers", minutes: 10 },
  { titre: "Paiement au comptoir", minutes: 8 },
  { titre: "Constat de litige", minutes: 10 },
  { titre: "Dépôt des retours", minutes: 6 },
];

const TOTAL_MINUTES = MODULES.reduce((somme, m) => somme + m.minutes, 0);

/**
 * Les PIN que le serveur refuse.
 *
 * Un code deviné est un code qui ne signe rien. On refuse ici, avant
 * l'envoi, pour que le refus arrive pendant la frappe et non après — c'est
 * le serveur qui fait autorité, mais lui faire dire non trois fois de suite
 * apprend moins vite qu'un message immédiat.
 */
function pinRefuse(pin: string) {
  if (/^(\d)\1{3}$/.test(pin)) return "Quatre fois le même chiffre : trop facile à deviner.";
  if ("0123456789".includes(pin) || "9876543210".includes(pin)) {
    return "Une suite de chiffres : trop facile à deviner.";
  }
  return "";
}

/** La barre des étapes : remplie jusqu'à celle où l'on est, vide après. */
function Barre({ etape }: { etape: Etape }) {
  const rang = ETAPES.findIndex((e) => e.id === etape);
  return (
    <ol className="flex gap-2 px-4 pt-3" aria-label="Étapes">
      {ETAPES.map(({ id, label }, index) => {
        const faite = index <= rang;
        return (
          <li key={id} className="min-w-0 flex-1">
            <span
              aria-hidden
              className={`block h-[3px] rounded-full ${
                faite
                  ? "bg-gradient-to-r from-[#2456D6] to-[#EF6A00]"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
            <span
              className={`mt-1.5 block truncate text-[11.5px] font-bold ${
                faite ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
              }`}
              aria-current={index === rang ? "step" : undefined}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function RelayInvitation({
  relais = "Mama René · Mvog-Ada",
  inviteur = "Franck Penga",
  onDone,
  onClose,
}: {
  /** Le relais qui invite, tel qu'il s'affiche au comptoir. */
  relais?: string;
  /** Le gérant qui a envoyé l'invitation : c'est lui qu'on reconnaît. */
  inviteur?: string;
  /** Appelée quand l'employé entre au guichet. */
  onDone: () => void;
  /** Appelée si l'on revient en arrière depuis la première étape. */
  onClose?: () => void;
}) {
  const [etape, setEtape] = useState<Etape>("bienvenue");
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState("");
  const [faits, setFaits] = useState(0);

  const reculer = () => {
    setErreur("");
    const rang = ETAPES.findIndex((e) => e.id === etape);
    if (rang <= 0) onClose?.();
    else setEtape(ETAPES[rang - 1].id);
  };

  const confirmerPin = () => {
    if (pin.length < 4) {
      setErreur("Il manque des chiffres.");
      return;
    }
    const refus = pinRefuse(pin);
    if (refus) {
      setErreur(refus);
      setPin("");
      return;
    }
    setErreur("");
    setEtape("formation");
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[linear-gradient(180deg,#FDF6EE_0%,#FBEEE4_38%,#F7F3EE_100%)] dark:bg-slate-950 dark:bg-none">
      {/* L'en-tête ne bouge pas : pendant quatre étapes, c'est le seul
          repère qui dit dans quel relais on est en train d'entrer. */}
      <header className="safe-pt-header pr-glass sticky top-0 z-30 pb-2">
        <div className="flex items-center gap-2 px-2 pt-1">
          <button
            type="button"
            onClick={reculer}
            aria-label="Revenir"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-slate-900 transition active:scale-90 dark:text-white"
          >
            <ChevronLeft size={24} strokeWidth={2.4} />
          </button>
          <h1 className="pr-h2 min-w-0 flex-1 truncate text-slate-900 dark:text-white">
            Rejoindre un relais
          </h1>
          <ShoppingCart
            size={26}
            strokeWidth={2.2}
            aria-hidden
            className="mr-2 flex-shrink-0 text-[#EF6A00]"
          />
        </div>
        <Barre etape={etape} />
      </header>

      <div className="px-4 pb-10 pt-4">
        {/* ── Bienvenue ────────────────────────────────────────────────── */}
        {etape === "bienvenue" ? (
          <>
            <section className="pr-sunrise pr-hero p-[18px]">
              <p className="text-[12px] font-black uppercase tracking-[0.09em] text-white/90">
                Invitation
              </p>
              <h2 className="pr-h1 mt-2 text-white">
                {inviteur} vous invite au relais {relais}
              </h2>
              <p className="mt-2.5 text-[14px] font-medium leading-[1.5] text-white/90">
                Vous pourrez recevoir les colis des livreurs et les remettre aux clients. L'argent
                et les réglages restent au gérant.
              </p>
            </section>

            <section className="pr-card mt-3 px-4 pb-1 pt-4">
              <h3 className="pr-h2 text-slate-900 dark:text-white">Ce que vous pourrez faire</h3>
              <ul className="mt-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                {POUVOIRS.map(({ icon: Icon, titre, detail, sourd }) => (
                  <li key={titre} className="flex items-start gap-3 py-3.5">
                    <span
                      aria-hidden
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] ${
                        sourd
                          ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      <Icon size={20} strokeWidth={2.1} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-slate-900 dark:text-white">
                        {titre}
                      </span>
                      <span className="pr-sub mt-0.5 block">{detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <button
              type="button"
              onClick={() => setEtape("pin")}
              className="pr-btn mt-4 w-full rounded-[12px] px-4 py-3.5 text-[15px] font-black transition active:scale-[.97]"
            >
              Accepter l'invitation
            </button>
          </>
        ) : null}

        {/* ── Le code PIN ──────────────────────────────────────────────── */}
        {etape === "pin" ? (
          <>
            <h2 className="pr-h1 text-center text-slate-900 dark:text-white">
              Créez votre code PIN
            </h2>
            <p className="mt-1 text-center text-[13.5px] font-medium text-slate-500 dark:text-slate-400">
              4 chiffres, à ne donner à personne. Il signe vos remises.
            </p>

            <RelayPinPad
              value={pin}
              onChange={(next) => {
                setErreur("");
                setPin(next);
              }}
            />

            <p
              className={`mt-4 text-center text-[12.5px] font-medium leading-[1.5] ${
                erreur
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
              role={erreur ? "alert" : undefined}
            >
              {erreur || "Évitez 1234, 0000 et votre date de naissance : ils sont refusés."}
            </p>

            <button
              type="button"
              onClick={confirmerPin}
              className="pr-btn mt-3 w-full rounded-[12px] px-4 py-3.5 text-[15px] font-black transition active:scale-[.97]"
            >
              Confirmer le PIN
            </button>
          </>
        ) : null}

        {/* ── La formation ─────────────────────────────────────────────── */}
        {etape === "formation" ? (
          <section className="pr-card px-4 pb-4 pt-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="pr-h2 min-w-0 text-slate-900 dark:text-white">
                Formation obligatoire
              </h2>
              <span className="pr-num flex h-[26px] flex-shrink-0 items-center rounded-full border border-[#F6CFA8] bg-[#FFF1E2] px-2.5 text-[12px] font-bold text-[#B84A00] dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300">
                {faits} / {MODULES.length}
              </span>
            </div>
            <p className="pr-sub mt-2">
              Avant votre première remise, suivez les {MODULES.length} modules (≈ {TOTAL_MINUTES} min
              au total, sur ce téléphone).
            </p>

            <ul className="mt-1.5 divide-y divide-slate-100 dark:divide-slate-800">
              {MODULES.map(({ titre, minutes }, index) => {
                const fait = index < faits;
                return (
                  <li key={titre} className="flex items-center gap-3 py-3.5">
                    <span
                      aria-hidden
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] ${
                        fait
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-[#FFF1E2] text-[#B84A00] dark:bg-orange-950 dark:text-orange-300"
                      }`}
                    >
                      {fait ? (
                        <Check size={20} strokeWidth={2.6} />
                      ) : (
                        <GraduationCap size={20} strokeWidth={2.1} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-slate-900 dark:text-white">
                        {titre}
                      </span>
                      <span className="pr-num pr-sub mt-0.5 block">{minutes} min</span>
                    </span>
                    <span
                      className={`flex h-[26px] flex-shrink-0 items-center rounded-full border px-2.5 text-[12px] font-bold ${
                        fait
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {fait ? "Fait" : "À faire"}
                    </span>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={() => setFaits((n) => Math.min(n + 1, MODULES.length))}
              className="pr-btn mt-4 w-full rounded-[12px] px-4 py-3.5 text-[15px] font-black transition active:scale-[.97]"
            >
              {faits === 0
                ? "Commencer la formation"
                : faits < MODULES.length
                  ? "Module suivant"
                  : "Formation terminée"}
            </button>

            {/* La maquette garde ce raccourci : le gérant qui montre le
                parcours à un nouvel employé doit pouvoir sauter 46 minutes
                de modules pour lui montrer où il arrive. */}
            <button
              type="button"
              onClick={() => {
                setFaits(MODULES.length);
                setEtape("pret");
              }}
              className="mt-2.5 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[15px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Voir l'écran final
            </button>
          </section>
        ) : null}

        {/* ── Prêt ─────────────────────────────────────────────────────── */}
        {etape === "pret" ? (
          <section className="pr-card px-5 pb-5 pt-7 text-center">
            <span
              aria-hidden
              className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#E6F4EC] text-[#1F7A4D] dark:bg-emerald-950 dark:text-emerald-300"
            >
              <Check size={32} strokeWidth={3} />
            </span>
            <h2 className="pr-h1 mt-4 text-slate-900 dark:text-white">Vous êtes prêt·e</h2>
            <p className="pr-sub mt-2">
              Formation terminée. Vous pouvez recevoir et remettre des colis au relais {relais}.
              Chaque opération est signée avec votre PIN.
            </p>
            <button
              type="button"
              onClick={onDone}
              className="pr-btn mt-5 w-full rounded-[12px] px-4 py-3.5 text-[15px] font-black transition active:scale-[.97]"
            >
              Aller au guichet
            </button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
