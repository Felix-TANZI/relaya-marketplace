/**
 * Mon équipe — qui tient le guichet, et à quoi chacun a droit.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UN REGISTRE, PAS ENCORE UN VERROU
 *
 * `RelayPointProfile.user` est un OneToOne : un relais, un compte. Tant
 * qu'une authentification par personne n'existe pas, tous ceux qui tiennent
 * le comptoir partagent la même session, et les permissions ci-dessous
 * décrivent une consigne du gérant — pas une barrière technique.
 *
 * L'écran le dit, et ce n'est pas un détail de politesse : laisser croire à
 * un accès cloisonné ferait partager l'identifiant du relais à la légère,
 * numéro de versement compris. Le serveur renvoie `enforced`, aujourd'hui
 * faux ; le jour où chaque employé se connectera, l'avertissement
 * disparaîtra tout seul.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * « QUI A FAIT QUOI » N'EST PAS AFFICHÉ
 *
 * Aucune opération n'enregistre l'agent qui l'a faite : sur `RelayParcel`,
 * `picked_up_by_name` désigne le CLIENT venu chercher son colis, pas la
 * personne qui l'a remis. Un récapitulatif par employé serait donc inventé
 * de bout en bout — et c'est précisément le tableau qu'on consulte après un
 * colis perdu. L'écran renvoie vers l'historique, qui lui est vrai.
 */
import { useCallback, useEffect, useState } from "react";
import { History, Plus, ShieldCheck, X } from "lucide-react";
import { http } from "@/services/api/http";

type Permission = "can_receive" | "can_hand_over" | "can_money" | "can_settings";

const PERMISSIONS: Array<{ key: Permission; label: string }> = [
  { key: "can_receive", label: "Recevoir" },
  { key: "can_hand_over", label: "Remettre" },
  { key: "can_money", label: "Argent" },
  { key: "can_settings", label: "Paramètres" },
];

interface TeamMember {
  id: number;
  display_name: string;
  phone: string;
  role: "OWNER" | "EMPLOYEE";
  role_display: string;
  is_active: boolean;
  last_seen_at: string | null;
  can_receive: boolean;
  can_hand_over: boolean;
  can_money: boolean;
  can_settings: boolean;
}

interface TeamPayload {
  members: TeamMember[];
  active_count: number;
  max_active: number;
  /** Les permissions sont-elles appliquées à l'accès ? Pas encore. */
  enforced: boolean;
}

/** Les initiales, pour la pastille. « Aïcha N. » → « AN ». */
function initiales(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? "")
    .join("");
}

/** Couleur stable par personne : la même initiale garde la même teinte. */
const TEINTES = ["bg-[#0E1B38]", "bg-[#2456D6]", "bg-[#6B4700]", "bg-[#1F7A4D]"];
const teinteDe = (id: number) => TEINTES[id % TEINTES.length];

const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { weekday: "long" });

export default function RelayTeam({
  onError,
  onOpenHistory,
}: {
  onError: (error: unknown) => void;
  onOpenHistory: () => void;
}) {
  const [payload, setPayload] = useState<TeamPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [nom, setNom] = useState("");

  const charger = useCallback(() => {
    http<TeamPayload>("/api/auth/relay-point/team/")
      .then(setPayload)
      .catch(() => setPayload(null));
  }, []);

  useEffect(() => charger(), [charger]);

  const modifier = async (corps: Record<string, unknown>) => {
    setBusy(true);
    try {
      await http("/api/auth/relay-point/team/", { method: "PATCH", body: JSON.stringify(corps) });
      charger();
    } catch (erreur) {
      onError(erreur);
    } finally {
      setBusy(false);
    }
  };

  const ajouter = async () => {
    const propre = nom.trim();
    if (!propre) return;
    setBusy(true);
    try {
      await http("/api/auth/relay-point/team/", {
        method: "POST",
        body: JSON.stringify({ display_name: propre }),
      });
      setNom("");
      setFormOpen(false);
      charger();
    } catch (erreur) {
      onError(erreur);
    } finally {
      setBusy(false);
    }
  };

  const membres = payload?.members ?? [];
  const actifs = payload?.active_count ?? 0;
  const maximum = payload?.max_active ?? 3;
  const complet = actifs >= maximum;

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Mon équipe
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          Qui tient le guichet, et à quoi chacun a droit. {maximum} personnes au plus.
        </p>
      </header>

      {/* ── Les membres ────────────────────────────────────────────────── */}
      {membres.length === 0 ? (
        <section className="rounded-[14px] border border-slate-200 bg-white px-4 py-6 text-center shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
            Vous tenez le comptoir seul. Ajoutez une personne si quelqu'un vous remplace.
          </p>
        </section>
      ) : (
        membres.map((membre) => {
          const proprietaire = membre.role === "OWNER";
          return (
            <section
              key={membre.id}
              className={`rounded-[14px] border border-slate-200 bg-white px-4 pb-4 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900 ${
                membre.is_active ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-full text-[15px] font-black text-white ${teinteDe(membre.id)}`}
                >
                  {initiales(membre.display_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[17px] font-black leading-tight text-slate-900 dark:text-white">
                    {membre.display_name}
                  </div>
                  <p className="mt-1 text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                    {membre.role_display}
                    {/* La derniere activite reste vide tant qu'aucune
                        connexion par personne n'existe : on ne devine pas
                        une presence. */}
                    {membre.last_seen_at
                      ? ` · vu ${JOUR_COURT.format(new Date(membre.last_seen_at))}`
                      : membre.is_active
                        ? " · accès ouvert"
                        : " · accès retiré"}
                  </p>
                </div>

                {proprietaire ? (
                  <span className="flex-shrink-0 rounded-full border border-[#C9D7FB] bg-[#EAF0FF] px-3 py-[5px] text-[12.5px] font-bold text-[#2456D6] dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {membre.role_display}
                  </span>
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={membre.is_active}
                    aria-label={`Accès de ${membre.display_name}`}
                    disabled={busy}
                    onClick={() => void modifier({ id: membre.id, is_active: !membre.is_active })}
                    className={`relative h-[31px] w-[52px] flex-shrink-0 rounded-full transition disabled:opacity-50 ${
                      membre.is_active ? "bg-[#2456D6]" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-[3px] h-[25px] w-[25px] rounded-full bg-white shadow-[0_1px_3px_rgba(60,35,15,.3)] transition-all ${
                        membre.is_active ? "left-[24px]" : "left-[3px]"
                      }`}
                    />
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {PERMISSIONS.map((permission) => {
                  const on = membre[permission.key];
                  // Le proprietaire a tout, et cela ne se discute pas : c'est
                  // lui qui repond du relais.
                  const fige = proprietaire;
                  return (
                    <button
                      key={permission.key}
                      type="button"
                      aria-pressed={on || fige}
                      disabled={busy || fige || !membre.is_active}
                      onClick={() => void modifier({ id: membre.id, [permission.key]: !on })}
                      className={`rounded-full px-3.5 py-[7px] text-[13px] font-bold transition active:scale-[.96] disabled:active:scale-100 ${
                        on || fige
                          ? "bg-[#EAF0FF] text-[#2456D6] dark:bg-blue-950/60 dark:text-blue-300"
                          : "border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {permission.label}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {/* ── Ajouter ────────────────────────────────────────────────────── */}
      {formOpen ? (
        <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-4 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-black text-slate-900 dark:text-white">Nouvelle personne</h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label="Fermer"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
          <input
            value={nom}
            onChange={(event) => setNom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void ajouter();
            }}
            placeholder="Prénom et initiale (ex : Aïcha N.)"
            aria-label="Nom de la personne"
            className="mt-3 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold outline-none transition focus:border-[#2456D6] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <p className="mt-2 text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
            Elle pourra recevoir et remettre. L'argent et les réglages restent fermés — vous les
            ouvrirez si besoin.
          </p>
          <button
            type="button"
            onClick={() => void ajouter()}
            disabled={busy || !nom.trim()}
            className="pr-btn mt-3 w-full rounded-[12px] px-4 py-3.5 text-[16px] font-black text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
          >
            {busy ? "Ajout…" : "Ajouter"}
          </button>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          disabled={complet || busy}
          className="pr-btn flex w-full items-center justify-center gap-2.5 rounded-[12px] px-4 py-4 text-[17px] font-black text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
        >
          <Plus size={19} strokeWidth={3} /> Ajouter une personne · {actifs} / {maximum}
        </button>
      )}

      {/* ── Votre responsabilité ───────────────────────────────────────── */}
      <section className="flex items-start gap-2.5 rounded-[14px] border border-[#F0DA9C] bg-[#FFF4D6] px-4 py-3.5 dark:border-amber-800 dark:bg-amber-950/30">
        <ShieldCheck size={18} strokeWidth={2.2} className="mt-[2px] flex-shrink-0 text-[#8A5A00] dark:text-amber-400" />
        <p className="text-[13px] font-medium leading-[1.55] text-[#8A5A00] dark:text-amber-200">
          Vous restez responsable du relais : les colis perdus ou mal remis par un employé comptent
          dans votre Trust Score. Retirez un accès dès qu'une personne part.
        </p>
      </section>

      {/*
        Ce que l'ecran doit au gerant.

        `enforced` arrive faux du serveur : un relais, un compte. Les
        permissions ci-dessus sont une consigne, pas une barriere. Le taire
        ferait partager l'identifiant du relais a la legere.
      */}
      {payload && !payload.enforced ? (
        <p className="px-1 text-[12.5px] font-medium leading-[1.55] text-slate-400 dark:text-slate-500">
          Ces accès sont pour l'instant un registre : chacun se connecte encore avec l'identifiant du
          relais. Gardez-le pour vous — il ouvre aussi le numéro de versement. La connexion par
          personne arrive, et ces réglages s'appliqueront alors d'eux-mêmes.
        </p>
      ) : null}

      {/* ── Qui a fait quoi ────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-4 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Qui a fait quoi
        </h3>
        {/*
          Pas de recapitulatif par personne, et c'est deliberе : aucune
          operation n'enregistre l'agent qui l'a faite. Sur `RelayParcel`,
          `picked_up_by_name` designe le CLIENT venu chercher son colis.
          Un tableau par employe serait invente — et c'est justement celui
          qu'on consulte apres un colis perdu.
        */}
        <p className="mt-2 text-[13px] font-medium leading-[1.5] text-slate-500 dark:text-slate-400">
          Les opérations ne portent pas encore le nom de la personne qui les a faites : elles sont
          toutes enregistrées au compte du relais. L'historique montre l'heure, le colis et la preuve
          de chaque geste.
        </p>
        <button
          type="button"
          onClick={onOpenHistory}
          className="mt-3 flex items-center gap-2 text-[14px] font-black text-[#2456D6] underline underline-offset-4 dark:text-blue-400"
        >
          <History size={17} strokeWidth={2.4} /> Voir l'historique complet
        </button>
      </section>
    </div>
  );
}
