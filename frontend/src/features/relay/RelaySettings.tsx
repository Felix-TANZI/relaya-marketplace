/**
 * Paramètres : qui je suis, et où se trouve mon relais.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UNE IDENTITÉ QUI SE CORRIGE, MAIS PAS SANS SE NOMMER
 *
 * Le nom affiché, l'adresse et la ville ne sont pas des préférences : ce
 * sont les informations sur lesquelles un client choisit de venir, et un
 * livreur de se déplacer. Elles se modifient ici, mais sous mot de passe.
 *
 * Pourquoi ce rappel alors que la session est déjà ouverte : un comptoir
 * reste déverrouillé sur un téléphone posé entre deux clients. Sans lui,
 * n'importe qui passant derrière le guichet déplacerait le relais d'un
 * quartier à l’autre en trois gestes. Le serveur le revérifie dans
 * l'écriture elle-même, et non par un appel séparé qui laisserait une
 * fenêtre entre la vérification et l’enregistrement.
 *
 * Ce que le formulaire NE fait pas : relancer la vérification du relais.
 * Corriger une faute dans un nom de rue n'a pas à passer par un ticket ;
 * changer de quartier, si — d'où la ligne qui le dit sous le bouton.
 */
import { useState } from "react";
import { Check, Settings2, ShoppingCart } from "lucide-react";
import { RelaySheet, RelaySheetHeader } from "./RelayUi";

const MOIS_ANNEE = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export interface RelaySettingsProfile {
  name: string;
  manager: string;
  phone: string;
  city: string;
  address: string;
  relayCode: string;
  status: string;
  memberSince: string | null;
  /** Palier public, quand le Trust Score en a attribué un. */
  tier?: string;
}

/** Ce que le gérant peut corriger lui-même, dans l'ordre où l'écran les montre. */
const CHAMPS = [
  { cle: "name", label: "Nom affiché", aide: "Le nom que les clients voient sur la carte.", type: "text" },
  { cle: "manager_name", label: "Nom du gérant", aide: "La personne responsable du comptoir.", type: "text" },
  { cle: "phone", label: "Téléphone", aide: "Le numéro que les livreurs appellent.", type: "tel" },
  { cle: "address", label: "Adresse", aide: "Rue et repère : c'est ce que lit un livreur.", type: "text" },
  { cle: "city", label: "Ville", aide: "", type: "text" },
] as const;

type ChampCle = (typeof CHAMPS)[number]["cle"];

export type RelayIdentityPayload = Record<ChampCle, string> & { current_password: string };

/** La valeur de départ d'un champ — le profil ne nomme pas le gérant pareil. */
function champInitial(profile: RelaySettingsProfile, cle: ChampCle) {
  return cle === "manager_name" ? profile.manager : profile[cle];
}

/**
 * Le formulaire d'identité, derrière le mot de passe.
 *
 * Le mot de passe est demandé EN DERNIER, après les champs. Le demander
 * d'abord ferait franchir une porte sans savoir ce qu'il y a derrière ; ici
 * le gérant voit ce qu'il change, puis confirme que c'est bien lui.
 */
function IdentitySheet({
  profile,
  onClose,
  onSave,
}: {
  profile: RelaySettingsProfile;
  onClose: () => void;
  /** Rend le message d'erreur du serveur, ou `null` si c'est passé. */
  onSave: (payload: RelayIdentityPayload) => Promise<string | null>;
}) {
  const [valeurs, setValeurs] = useState<Record<ChampCle, string>>({
    name: profile.name,
    manager_name: profile.manager,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
  });
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [busy, setBusy] = useState(false);

  const vide = CHAMPS.some(({ cle }) => !valeurs[cle].trim());
  const change = CHAMPS.some(({ cle }) => valeurs[cle].trim() !== champInitial(profile, cle));

  const enregistrer = async () => {
    if (vide) {
      setErreur("Aucun de ces champs ne peut rester vide.");
      return;
    }
    if (!motDePasse) {
      setErreur("Entrez votre mot de passe pour confirmer.");
      return;
    }
    setBusy(true);
    setErreur("");
    const message = await onSave({
      name: valeurs.name.trim(),
      manager_name: valeurs.manager_name.trim(),
      phone: valeurs.phone.trim(),
      address: valeurs.address.trim(),
      city: valeurs.city.trim(),
      current_password: motDePasse,
    });
    setBusy(false);
    if (message) {
      // Le mot de passe ne se repropose pas pré-rempli : s'il était faux,
      // le reproposer invite à renvoyer le même.
      setErreur(message);
      setMotDePasse("");
      return;
    }
    onClose();
  };

  const champClasse =
    "mt-1.5 w-full rounded-[12px] border border-slate-200 bg-white px-3.5 py-3 text-[15px] font-bold text-slate-900 outline-none focus:border-[#2456D6] dark:border-slate-700 dark:bg-slate-800 dark:text-white";

  return (
    <RelaySheet label="Modifier mes informations" onClose={onClose}>
      <RelaySheetHeader
        icon={Settings2}
        tone="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        title="Mes informations"
        subtitle="Corrigez ce qui a changé, puis confirmez avec votre mot de passe."
        onClose={onClose}
      />

      <div className="space-y-3.5">
        {CHAMPS.map(({ cle, label, aide, type }) => (
          <label key={cle} className="block">
            <span className="pr-kicker block uppercase">{label}</span>
            <input
              value={valeurs[cle]}
              type={type}
              onChange={(event) => {
                setErreur("");
                setValeurs((actuel) => ({ ...actuel, [cle]: event.target.value }));
              }}
              className={champClasse}
            />
            {aide ? <span className="pr-sub mt-1 block">{aide}</span> : null}
          </label>
        ))}

        <div className="pr-rule" />

        <label className="block">
          <span className="pr-kicker block uppercase">Votre mot de passe</span>
          <input
            value={motDePasse}
            type="password"
            autoComplete="current-password"
            onChange={(event) => {
              setErreur("");
              setMotDePasse(event.target.value);
            }}
            className={champClasse}
          />
          <span className="pr-sub mt-1 block">
            Celui de votre compte BelivaY, pas votre code PIN de comptoir.
          </span>
        </label>

        {erreur ? (
          <p role="alert" className="text-[13px] font-bold text-red-600 dark:text-red-400">
            {erreur}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void enregistrer()}
          disabled={busy || vide || !change}
          className="pr-btn w-full rounded-[12px] px-4 py-3.5 text-[15px] font-black transition active:scale-[.97]"
        >
          {busy ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </RelaySheet>
  );
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
  onSaveIdentity,
  children,
}: {
  profile: RelaySettingsProfile;
  username: string;
  avatarUrl?: string;
  onAvatarFile: (file: File | null) => void;
  /** Ouvre le canal support — pour un déménagement, qui demande une revérification. */
  onRequestChange: () => void;
  /** Enregistre l'identité ; rend le message d'erreur du serveur, ou `null`. */
  onSaveIdentity: (payload: RelayIdentityPayload) => Promise<string | null>;
  /** Le reste des réglages — thème, langue, sécurité, déconnexion. */
  children?: React.ReactNode;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const verifie = profile.status === "Ouvert" || profile.status === "Vérifié";

  return (
    <div className="space-y-4">
      {/* ── Identité ─────────────────────────────────────────────────────
          Bandeau orange pleine largeur et avatar à cheval sur son bord : la
          photo est ce qu'on vient changer ici neuf fois sur dix, elle occupe
          donc le seul endroit de l'écran qu'on ne peut pas manquer. */}
      <div className="pr-span pr-bleed -mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
        <div className="pr-sunrise relative h-[130px]">
          <ShoppingCart
            size={34}
            strokeWidth={2}
            className="absolute right-5 top-4 text-white/85"
            aria-hidden
          />
          <label className="absolute inset-x-0 -bottom-[46px] mx-auto flex h-[92px] w-[92px] cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#0E1B38] text-[30px] font-black text-white ring-[3px] ring-[#3A6BEA] transition active:scale-95">
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
          <h2 className="text-[23px] font-black tracking-[-0.03em] text-slate-900 dark:text-white">
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
                  ? "border-[#BFE3CF] bg-[#E6F4EC] text-[#1F7A4D] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-[#F0DA9C] bg-[#FFF4D6] text-[#8A5A00] dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {verifie ? <Check size={14} strokeWidth={3} /> : null}
              {verifie ? "Relais vérifié" : profile.status}
            </span>
            {profile.tier ? (
              <span className="rounded-full border border-[#C9D7FB] bg-[#EAF0FF] px-3.5 py-[6px] text-[13px] font-bold text-[#2456D6] dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                {profile.tier}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Mon relais ───────────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
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
          onClick={() => setEditOpen(true)}
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <Settings2 size={18} strokeWidth={2.2} /> Modifier
        </button>

        <p className="mt-3 text-[13px] font-medium leading-[1.5] text-slate-400 dark:text-slate-500">
          Corrigez ici ce qui a changé au comptoir. Un vrai déménagement se signale au{" "}
          <button
            type="button"
            onClick={onRequestChange}
            className="font-bold text-blue-700 underline underline-offset-2 dark:text-blue-300"
          >
            support
          </button>{" "}
          : le relais est revérifié avant que des colis n'y soient envoyés.
        </p>
      </section>

      {children}

      {editOpen ? (
        <IdentitySheet
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={onSaveIdentity}
        />
      ) : null}
    </div>
  );
}
