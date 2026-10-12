/**
 * Notifications — le relais ne reçoit un message que s'il doit faire quelque
 * chose.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI UN RÉSUMÉ, PUIS PRESQUE RIEN
 *
 * Un point relais qui reçoit une alerte par colis en reçoit soixante par
 * jour. Au bout d'une semaine il ne les lit plus, et le jour où une alerte
 * compte vraiment, elle est noyée. Le portail fait donc l'inverse : un
 * résumé le matin, qui dit la charge de la journée, puis un message
 * seulement quand une action est attendue de lui.
 *
 * D'où les deux sections. « À traiter » appelle un geste — et chaque ligne
 * ouvre l'écran où ce geste se fait. « Pour information » ne demande rien,
 * et peut être lu plus tard, ou pas du tout.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE RÉSUMÉ EST CALCULÉ, PAS STOCKÉ
 *
 * Aucune table ne range un « résumé du matin ». Les chiffres sont lus de
 * l'état réel du relais au moment où l'écran s'ouvre : les colis annoncés,
 * ceux qui attendent leur client, ceux qui doivent partir. Ils sont donc
 * toujours justes — mais ils ne sont pas l'image de 7 h du matin, et
 * l'écran ne prétend pas qu'ils le soient.
 */
import { ArrowLeftRight, Bell, Clock, CreditCard, Moon, Package, Scale, ShieldCheck, TriangleAlert, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Les natures d'entrée, et la couleur qui leur correspond. */
export type NotifTone = "orange" | "red" | "gold" | "green" | "blue";

const TONE_STYLE: Record<NotifTone, string> = {
  orange: "bg-[#FFF1E2] text-[#EF6A00] dark:bg-orange-950/50 dark:text-orange-300",
  red: "bg-[#FDECEA] text-[#B42318] dark:bg-red-950/50 dark:text-red-300",
  gold: "bg-[#FFF4D6] text-[#8A5A00] dark:bg-amber-950/50 dark:text-amber-300",
  green: "bg-[#E6F4EC] text-[#1F7A4D] dark:bg-emerald-950/50 dark:text-emerald-300",
  blue: "bg-[#EAF0FF] text-[#2456D6] dark:bg-blue-950/50 dark:text-blue-300",
};

const ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  retour: ArrowLeftRight,
  dossier: Scale,
  versement: CreditCard,
  colis: Package,
  cloche: Bell,
  bouclier: ShieldCheck,
  horloge: Clock,
  lune: Moon,
  alerte: TriangleAlert,
};

export interface NotifItem {
  id: string;
  tone: NotifTone;
  icon: keyof typeof ICONS;
  title: string;
  detail: string;
  /** ISO 8601, ou vide quand le fait n'est pas daté. */
  at: string;
  /** Présent uniquement si l'entrée mène quelque part. */
  onOpen?: () => void;
}

export interface MorningSummary {
  toReceive: number;
  pickupsExpected: number;
  outbound: number;
  freePlaces: number;
  /** Capacité déclarée, 0 tant qu'elle ne l'est pas. */
  capacity: number;
}

/**
 * Ce que le relais accepte de recevoir, et quand.
 *
 * `honored` liste les réglages qui changent RÉELLEMENT quelque chose
 * aujourd'hui. Il arrive vide du serveur, et l'écran s'en sert pour le dire
 * au gérant. Le jour où un canal existe, il s'ajoute à cette liste et
 * l'avertissement disparaît de lui-même.
 */
export interface NotifSettings {
  push_enabled: boolean;
  courier_approach: boolean;
  settlements: boolean;
  score_and_sanctions: boolean;
  digest_hour: number;
  quiet_from_hour: number;
  quiet_to_hour: number;
  digest_earliest_hour: number;
  honored: string[];
}

/** « 7 h 00 » — l'heure pleine, lisible d'un coup d'oeil. */
function heurePleine(valeur: number) {
  return `${valeur} h 00`;
}

/** Un interrupteur. Bleu quand il est actif, comme partout dans le portail. */
function Bascule({
  on,
  label,
  onToggle,
  busy,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={onToggle}
      className={`relative h-[31px] w-[52px] flex-shrink-0 rounded-full transition disabled:opacity-50 ${
        on ? "bg-[#2456D6]" : "bg-slate-200 dark:bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-[3px] h-[25px] w-[25px] rounded-full bg-white shadow-[0_1px_3px_rgba(60,35,15,.3)] transition-all ${
          on ? "left-[24px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

/** Une ligne de réglage : icône pêche, libellé, puis le contrôle à droite. */
function LigneReglage({
  icon,
  titre,
  detail,
  dernier,
  children,
}: {
  icon: keyof typeof ICONS;
  titre: string;
  detail: string;
  dernier: boolean;
  children: React.ReactNode;
}) {
  const Icon = ICONS[icon] ?? Bell;
  return (
    <div
      className={`flex items-center gap-3 px-4 ${dernier ? "pb-4 pt-3.5" : "border-b border-slate-100 py-3.5 dark:border-slate-800"}`}
    >
      <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[#FFF1E2] text-[#EF6A00] dark:bg-orange-950/50 dark:text-orange-300">
        <Icon size={19} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">{titre}</span>
        <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
          {detail}
        </span>
      </span>
      {children}
    </div>
  );
}

/** La pastille bleu pâle qui porte une valeur réglable. */
const PASTILLE =
  "flex-shrink-0 cursor-pointer appearance-none rounded-full bg-[#EAF0FF] px-3 py-[7px] text-center text-[13px] font-bold text-[#2456D6] outline-none transition disabled:opacity-50 dark:bg-blue-950/60 dark:text-blue-300";

const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

/**
 * « 09:48 » aujourd'hui, « hier », « ven. » dans la semaine, sinon la date.
 *
 * Au comptoir, l'heure exacte ne compte que pour ce qui s'est passé
 * aujourd'hui. Au-delà, c'est le jour qu'on retient.
 */
function quand(iso: string, maintenant: Date) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const aJour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const ecart = Math.round((aJour(maintenant) - aJour(date)) / 86_400_000);
  if (ecart <= 0) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  if (ecart === 1) return "hier";
  if (ecart < 7) return JOUR_COURT.format(date);
  return JOUR_MOIS.format(date);
}

/** Une ligne de la liste. */
function Ligne({ item, maintenant, dernier }: { item: NotifItem; maintenant: Date; dernier: boolean }) {
  const Icon = ICONS[item.icon] ?? Bell;
  const corps = (
    <>
      <span className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] ${TONE_STYLE[item.tone]}`}>
        <Icon size={19} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 flex-1 text-[15px] font-black leading-tight text-slate-900 dark:text-white">
            {item.title}
          </span>
          <span className="flex flex-shrink-0 items-center gap-2 text-[12.5px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">
            {quand(item.at, maintenant)}
            {/* La pastille ne dit pas « non lu » : elle dit « on attend
                quelque chose de vous ». Seules les lignes a traiter en
                portent une. */}
            {item.onOpen ? (
              <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#EF6A00]" aria-hidden />
            ) : null}
          </span>
        </span>
        <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
          {item.detail}
        </span>
      </span>
    </>
  );

  const classes = `flex w-full items-start gap-3 px-4 text-left ${dernier ? "pb-4 pt-3.5" : "py-3.5"}`;

  return item.onOpen ? (
    <li className={dernier ? "" : "border-b border-slate-100 dark:border-slate-800"}>
      <button type="button" onClick={item.onOpen} className={`${classes} transition active:scale-[.99]`}>
        {corps}
      </button>
    </li>
  ) : (
    <li className={`${classes} ${dernier ? "" : "border-b border-slate-100 dark:border-slate-800"}`}>
      {corps}
    </li>
  );
}

export default function RelayNotifications({
  summary,
  todo,
  info,
  settings,
  settingsBusy,
  onChangeSettings,
}: {
  summary: MorningSummary;
  /** Ce qui appelle un geste. */
  todo: NotifItem[];
  /** Ce qui n'en appelle aucun. */
  info: NotifItem[];
  /** Null tant que le serveur n'a pas repondu. */
  settings: NotifSettings | null;
  settingsBusy: boolean;
  onChangeSettings: (patch: Partial<NotifSettings>) => void;
}) {
  // Figé au rendu : « hier » ne doit pas devenir « aujourd'hui » entre deux
  // rafraîchissements de la liste.
  const maintenant = new Date();

  const tuiles = [
    { valeur: summary.toReceive, label: "colis à recevoir" },
    { valeur: summary.pickupsExpected, label: "retraits attendus" },
    { valeur: summary.outbound, label: summary.outbound > 1 ? "renvois" : "renvoi" },
  ];

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Notifications
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          Un résumé le matin, puis un message seulement quand il faut agir.
        </p>
      </header>

      {/* ── Le résumé ──────────────────────────────────────────────────────
          Le liseré or le détache de tout le reste : c'est la seule carte de
          l'écran qui se lit d'un coup d'oeil, avant d'ouvrir quoi que ce
          soit. */}
      <section className="rounded-[14px] border-2 border-[#E8A10E] bg-white px-4 pb-4 pt-3.5 shadow-[0_2px_10px_rgba(232,161,14,.18)] dark:border-amber-600/70 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[12.5px] font-black uppercase leading-none tracking-[0.09em] text-[#B84A00] dark:text-amber-400">
            Résumé du matin
          </h3>
          <Bell size={19} strokeWidth={2.2} className="flex-shrink-0 text-[#E8A10E]" aria-hidden />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {tuiles.map((tuile) => (
            <div
              key={tuile.label}
              className="rounded-[12px] bg-[#FFF1E2] px-2 py-3 text-center dark:bg-orange-950/40"
            >
              <div className="text-[23px] font-black leading-none tabular-nums text-[#EF6A00] dark:text-orange-300">
                {tuile.valeur}
              </div>
              <div className="mt-1.5 text-[12px] font-semibold leading-tight text-[#B84A00] dark:text-orange-200/80">
                {tuile.label}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
          {/* La capacite n'est pas toujours declaree : sans elle, on ne sait
              pas combien de places restent, et on ne l'invente pas. */}
          {summary.capacity > 0
            ? `${summary.freePlaces} place${summary.freePlaces > 1 ? "s" : ""} libre${
                summary.freePlaces > 1 ? "s" : ""
              } ce matin. Bonne journée au guichet.`
            : "Capacité non déclarée — renseignez vos places pour suivre ce qui reste. Bonne journée au guichet."}
        </p>
      </section>

      {/* ── À traiter ──────────────────────────────────────────────────── */}
      <section>
        <h3 className="px-1 pb-2 text-[11.5px] font-black uppercase leading-none tracking-[0.1em] text-slate-400 dark:text-slate-500">
          À traiter
        </h3>
        {todo.length === 0 ? (
          <div className="rounded-[14px] border border-slate-200 bg-white px-4 py-6 text-center shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
              Rien n'attend de vous. Le guichet est à jour.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
            {todo.map((item, rang) => (
              <Ligne key={item.id} item={item} maintenant={maintenant} dernier={rang === todo.length - 1} />
            ))}
          </ul>
        )}
      </section>

      {/* ── Pour information ───────────────────────────────────────────── */}
      {info.length > 0 ? (
        <section>
          <h3 className="px-1 pb-2 text-[11.5px] font-black uppercase leading-none tracking-[0.1em] text-slate-400 dark:text-slate-500">
            Pour information
          </h3>
          <ul className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
            {info.map((item, rang) => (
              <Ligne key={item.id} item={item} maintenant={maintenant} dernier={rang === info.length - 1} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Réglages ─────────────────────────────────────────────────────
          Ce que le gérant accepte de recevoir. Les choix sont ENREGISTRÉS
          (`RelayNotificationPreferences`) — ils ne sont pas encore appliqués
          à l'émission, et la note du bas le dit sans détour. */}
      {settings ? (
        <section>
          <h3 className="px-1 pb-2 text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
            Réglages
          </h3>
          <div className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
            <LigneReglage
              icon="cloche"
              titre="Notifications push"
              detail="Gratuites, pour tout ce qui est à faire"
              dernier={false}
            >
              <Bascule
                on={settings.push_enabled}
                label="Notifications push"
                busy={settingsBusy}
                onToggle={() => onChangeSettings({ push_enabled: !settings.push_enabled })}
              />
            </LigneReglage>

            <LigneReglage
              icon="truck"
              titre="Livreur en approche"
              /* La maquette annonce « 15 min avant son arrivee ». Le portail
                 relais ne recoit ni position du livreur ni heure de passage :
                 on promet l'avis, pas le delai. */
              detail="Quand une mission est annoncée vers votre comptoir"
              dernier={false}
            >
              <Bascule
                on={settings.courier_approach}
                label="Livreur en approche"
                busy={settingsBusy}
                onToggle={() => onChangeSettings({ courier_approach: !settings.courier_approach })}
              />
            </LigneReglage>

            <LigneReglage
              icon="versement"
              titre="Versements"
              detail="Envoi ou refus, sans montant : le détail est dans l'app"
              dernier={false}
            >
              <Bascule
                on={settings.settlements}
                label="Versements"
                busy={settingsBusy}
                onToggle={() => onChangeSettings({ settlements: !settings.settlements })}
              />
            </LigneReglage>

            <LigneReglage
              icon="horloge"
              titre="Heure du résumé"
              detail={`Réglable, jamais avant ${settings.digest_earliest_hour} h`}
              dernier={false}
            >
              <select
                value={settings.digest_hour}
                disabled={settingsBusy}
                aria-label="Heure du résumé"
                onChange={(event) => onChangeSettings({ digest_hour: Number(event.target.value) })}
                className={PASTILLE}
              >
                {Array.from({ length: 24 - settings.digest_earliest_hour }, (_, i) => i + settings.digest_earliest_hour).map((h) => (
                  <option key={h} value={h}>{heurePleine(h)}</option>
                ))}
              </select>
            </LigneReglage>

            <LigneReglage
              icon="lune"
              titre="Heures calmes"
              detail="Rien pendant cette plage, sauf l'urgent"
              dernier={false}
            >
              <span className="flex flex-shrink-0 items-center gap-1">
                <select
                  value={settings.quiet_from_hour}
                  disabled={settingsBusy}
                  aria-label="Début des heures calmes"
                  onChange={(event) => onChangeSettings({ quiet_from_hour: Number(event.target.value) })}
                  className={PASTILLE}
                >
                  {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                    <option key={h} value={h}>{h} h</option>
                  ))}
                </select>
                <span className="text-[13px] font-bold text-slate-400">–</span>
                <select
                  value={settings.quiet_to_hour}
                  disabled={settingsBusy}
                  aria-label="Fin des heures calmes"
                  onChange={(event) => onChangeSettings({ quiet_to_hour: Number(event.target.value) })}
                  className={PASTILLE}
                >
                  {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                    <option key={h} value={h}>{h} h</option>
                  ))}
                </select>
              </span>
            </LigneReglage>

            <LigneReglage
              icon="bouclier"
              titre="Score et sanctions"
              detail="Alerte avant un seuil, sanction ou descente proposée, avec « Contester »"
              dernier
            >
              {/* Pas d'interrupteur, et c'est voulu : une alerte de sanction
                  qu'on peut couper est une sanction qu'on apprend trop tard. */}
              <span className="flex-shrink-0 rounded-full bg-[#EAF0FF] px-3 py-[7px] text-[13px] font-bold text-[#2456D6] dark:bg-blue-950/60 dark:text-blue-300">
                Toujours
              </span>
            </LigneReglage>
          </div>

          {/*
            Ce que l'ecran doit au gerant.

            `honored` arrive vide du serveur : aucun canal push n'existe,
            aucune tache ne compose le resume, rien ne filtre les heures
            calmes a l'emission. Taire ce fait laisserait quelqu'un compter
            sur un telephone qui ne sonnera pas.
          */}
          {settings.honored.length === 0 ? (
            <p className="mt-2.5 px-1 text-[12.5px] font-medium leading-[1.55] text-slate-400 dark:text-slate-500">
              Vos choix sont enregistrés, mais aucun envoi hors de l'application n'est encore en
              service : les messages ci-dessus arrivent ici, dans « À traiter ». Ces réglages
              s'appliqueront dès que l'envoi push sera actif.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
