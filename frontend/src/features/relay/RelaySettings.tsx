/**
 * Paramètres : qui je suis, et où se trouve mon relais.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UNE IDENTITÉ QUI NE SE MODIFIE PAS SEULE
 *
 * Le nom affiché, l'adresse et la ville ne sont pas des préférences : ce
 * sont les informations sur lesquelles un client choisit de venir, et un
 * livreur de se déplacer. Le serveur ne les laisse d'ailleurs pas changer —
 * `/api/auth/relay-point/profile/` n'accepte que la capacité et les
 * horaires.
 *
 * « Modifier » ouvre donc une demande au support plutôt qu'un formulaire.
 * Ce n'est pas une limitation contournée : un relais qui déménage doit être
 * revérifié, sinon des colis partent à une adresse où personne n'attend.
 */
import { Check, Settings2, ShoppingCart } from "lucide-react";

const MOIS_ANNEE = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export interface RelaySettingsProfile {
  name: string;
  manager: string;
  city: string;
  address: string;
  relayCode: string;
  status: string;
  memberSince: string | null;
  /** Palier public, quand le Trust Score en a attribué un. */
  tier?: string;
}

/** Ligne d'information : libellé à gauche, valeur à droite. */
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="flex-shrink-0 text-[14px] font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 text-right text-[14px] font-black text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

export default function RelaySettings({
  profile,
  username,
  avatarUrl,
  onAvatarFile,
  onRequestChange,
  children,
}: {
  profile: RelaySettingsProfile;
  username: string;
  avatarUrl?: string;
  onAvatarFile: (file: File | null) => void;
  /** Ouvre le canal support : le seul chemin pour changer une adresse. */
  onRequestChange: () => void;
  /** Le reste des réglages — thème, langue, sécurité, déconnexion. */
  children?: React.ReactNode;
}) {
  const verifie = profile.status === "Ouvert" || profile.status === "Vérifié";

  return (
    <div className="space-y-4">
      {/* ── Identité ─────────────────────────────────────────────────────
          Bandeau orange pleine largeur et avatar à cheval sur son bord : la
          photo est ce qu'on vient changer ici neuf fois sur dix, elle occupe
          donc le seul endroit de l'écran qu'on ne peut pas manquer. */}
      <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
        <div className="relative h-[130px] bg-gradient-to-br from-[#F79020] via-[#F07E16] to-[#E85D04]">
          <ShoppingCart
            size={34}
            strokeWidth={2}
            className="absolute right-5 top-4 text-white/85"
            aria-hidden
          />
          <label className="absolute inset-x-0 -bottom-[46px] mx-auto flex h-[92px] w-[92px] cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#101C3D] text-[30px] font-black text-white ring-[3px] ring-[#3B7BF0] transition active:scale-95">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile.manager || username).slice(0, 2).toUpperCase()
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => onAvatarFile(event.target.files?.[0] || null)}
            />
          </label>
        </div>

        <div className="px-4 pt-[58px] text-center sm:px-6">
          <h2 className="text-[22px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
            {profile.manager || username}
          </h2>
          <p className="mt-1 text-[14px] font-medium text-slate-500 dark:text-slate-400">
            Gérant · {profile.name}
            {profile.city ? `, ${profile.city}` : ""}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-[6px] text-[13px] font-bold ${
                verifie
                  ? "border-[#B7E0C4] bg-[#F1FAF3] text-[#2E7D4F] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-[#F2D79B] bg-[#FDF6E3] text-[#B4791A] dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {verifie ? <Check size={14} strokeWidth={3} /> : null}
              {verifie ? "Relais vérifié" : profile.status}
            </span>
            {profile.tier ? (
              <span className="rounded-full border border-[#C3D4FA] bg-[#EEF3FE] px-3.5 py-[6px] text-[13px] font-bold text-[#2A5BD7] dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                {profile.tier}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Mon relais ───────────────────────────────────────────────────── */}
      <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-5 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
          Mon relais
        </h3>

        <dl className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          <Info label="Nom affiché" value={profile.name || "à définir"} />
          <Info label="Adresse" value={profile.address || "à compléter"} />
          <Info label="Ville" value={profile.city || "à définir"} />
          {profile.relayCode ? <Info label="Code relais" value={profile.relayCode} /> : null}
          <Info
            label="Partenaire depuis"
            value={profile.memberSince ? MOIS_ANNEE.format(new Date(profile.memberSince)) : "—"}
          />
        </dl>

        <button
          type="button"
          onClick={onRequestChange}
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <Settings2 size={18} strokeWidth={2.2} /> Modifier
        </button>

        <p className="mt-3 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
          Le nom, l'adresse et la ville se changent par le support : un relais qui déménage est
          revérifié avant que des colis n'y soient envoyés.
        </p>
      </section>

      {children}
    </div>
  );
}
