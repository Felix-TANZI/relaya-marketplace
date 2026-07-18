import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  Banknote,
  Bell,
  BookOpen,
  Box,
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileBadge2,
  FileCheck2,
  FileText,
  Gauge,
  HelpCircle,
  History,
  IdCard,
  KeyRound,
  Layers3,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageSquareText,
  Moon,
  PackageCheck,
  PackagePlus,
  QrCode,
  Scale,
  ShieldCheck,
  Star,
  Store,
  Sun,
  TimerReset,
  Truck,
  UserCircle,
  Users,
  WalletCards,
  Warehouse,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { http } from "@/services/api/http";

type RelayTab =
  | "dashboard"
  | "reception"
  | "stock"
  | "retrait"
  | "historique"
  | "trust"
  | "tokens"
  | "niveaux"
  | "finances"
  | "capacite"
  | "litiges"
  | "kyc"
  | "aide"
  | "notifications"
  | "formation";

type IconComponent = typeof Store;

interface RelayParcel {
  id: number;
  shipment_id: number;
  order_id: number;
  status: string;
  slot_code: string;
  pickup_code: string;
  customer_phone: string;
  delivery_address: string;
  city: string;
  received_at: string | null;
  picked_up_at: string | null;
  returned_at: string | null;
  updated_at: string;
}

const relayCopy = {
  fr: {
    groups: { pilotage: "Pilotage", operations: "Opérations", quality: "Qualité", management: "Gestion", risk: "Risque", support: "Support" },
    tabs: {
      dashboard: "Tableau de bord",
      reception: "Réception colis",
      stock: "Colis en stock",
      retrait: "Retrait acheteur",
      historique: "Historique",
      trust: "Trust Score PR",
      tokens: "Relais Tokens",
      niveaux: "Niveaux PR",
      finances: "Finances MoMo",
      capacite: "Capacité & horaires",
      litiges: "Litiges",
      kyc: "Documents KYC",
      aide: "Aide & support",
      notifications: "Notifications",
      formation: "Formation",
    } satisfies Record<RelayTab, string>,
    space: "Espace gérant point relais",
    brand: "Point relais",
    profile: "Profil",
    openProfile: "Ouvrir le profil",
    logout: "Se déconnecter",
    close: "Fermer",
    emptyArrivals: "Aucune arrivée livreur connectée pour le moment.",
    emptyActivity: "Aucune activité opérationnelle connectée pour le moment.",
    emptyStock: "Aucun colis en stock connecté pour le moment.",
    dev: "En dev",
  },
  en: {
    groups: { pilotage: "Control", operations: "Operations", quality: "Quality", management: "Management", risk: "Risk", support: "Support" },
    tabs: {
      dashboard: "Dashboard",
      reception: "Parcel reception",
      stock: "Stored parcels",
      retrait: "Buyer pickup",
      historique: "History",
      trust: "Relay trust score",
      tokens: "Relay tokens",
      niveaux: "Relay levels",
      finances: "MoMo finances",
      capacite: "Capacity & hours",
      litiges: "Disputes",
      kyc: "KYC documents",
      aide: "Help & support",
      notifications: "Notifications",
      formation: "Training",
    } satisfies Record<RelayTab, string>,
    space: "Relay point manager workspace",
    brand: "Relay point",
    profile: "Profile",
    openProfile: "Open profile",
    logout: "Log out",
    close: "Close",
    emptyArrivals: "No courier arrival connected yet.",
    emptyActivity: "No operational activity connected yet.",
    emptyStock: "No stored parcel connected yet.",
    dev: "In dev",
  },
};

const tabs: Array<{ id: RelayTab; icon: IconComponent; badge?: string; groupKey: keyof typeof relayCopy.fr.groups }> = [
  { id: "dashboard", icon: Gauge, groupKey: "pilotage" },
  { id: "reception", icon: PackagePlus, groupKey: "operations" },
  { id: "stock", icon: Archive, groupKey: "operations" },
  { id: "retrait", icon: KeyRound, groupKey: "operations" },
  { id: "historique", icon: History, groupKey: "operations" },
  { id: "trust", icon: Star, groupKey: "quality" },
  { id: "tokens", icon: BadgeCheck, groupKey: "quality" },
  { id: "niveaux", icon: Layers3, groupKey: "quality" },
  { id: "finances", icon: WalletCards, groupKey: "management" },
  { id: "capacite", icon: CalendarClock, groupKey: "management" },
  { id: "litiges", icon: Scale, groupKey: "risk" },
  { id: "kyc", icon: IdCard, groupKey: "risk" },
  { id: "aide", icon: HelpCircle, groupKey: "support" },
  { id: "notifications", icon: Bell, groupKey: "support" },
  { id: "formation", icon: BookOpen, groupKey: "support" },
];

const arrivals: Array<{ id: string; courier: string; parcels: number; eta: string; size: string; vehicle: string }> = [];
const history: Array<[string, string, string, string]> = [];

const trustCriteria = [
  ["Ponctualite reception", 22, 25],
  ["Securite stockage", 20, 25],
  ["Retraits sans litige", 18, 25],
  ["Satisfaction acheteur", 12, 25],
];

const training = [
  ["Reception & garde des colis", "Obligatoire", true],
  ["Verification CNI et code retrait", "Obligatoire", true],
  ["Securite du stockage", "Recommande", false],
  ["Gestion litige & mediateur", "Recommande", false],
];

function fmtXaf(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function progressTone(value: number) {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 55) return "bg-blue-600";
  return "bg-amber-500";
}

function groupTabs() {
  return tabs.reduce<Record<string, typeof tabs>>((acc, item) => {
    acc[item.groupKey] = [...(acc[item.groupKey] ?? []), item];
    return acc;
  }, {});
}

function Panel({
  title,
  kicker,
  children,
  action,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {kicker ? <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">{kicker}</p> : null}
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ tone, children }: { tone: "blue" | "emerald" | "amber" | "red" | "slate"; children: React.ReactNode }) {
  const cls = {
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${cls}`}>{children}</span>;
}

export default function RelayPointPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<RelayTab>("dashboard");
  const [pickupCode, setPickupCode] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [relayParcels, setRelayParcels] = useState<RelayParcel[]>([]);
  const [parcelsLoading, setParcelsLoading] = useState(false);
  const menu = useMemo(groupTabs, []);
  const locale = i18n.language.startsWith("en") ? "en" : "fr";
  const ui = relayCopy[locale];
  const activeLabel = ui.tabs[tab] ?? ui.brand;
  const relayAccount = user?.relay_point_profile;
  useEffect(() => {
    let cancelled = false;
    setParcelsLoading(true);
    http<RelayParcel[]>("/api/shipping/relay-point/parcels/")
      .then((items) => {
        if (!cancelled) setRelayParcels(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setRelayParcels([]);
      })
      .finally(() => {
        if (!cancelled) setParcelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const parcels = useMemo(
    () =>
      relayParcels
        .filter((parcel) => ["RECEIVED", "STORED"].includes(parcel.status))
        .map((parcel) => ({
          ref: `BV-${parcel.order_id}`,
          slot: parcel.slot_code || "A definir",
          buyer: parcel.customer_phone || "Client",
          age: parcel.received_at ? new Date(parcel.received_at).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR") : "-",
          status: parcel.status === "STORED" ? (locale === "en" ? "Stored" : "Stocke") : parcel.status,
          tone: "emerald" as const,
        })),
    [locale, relayParcels],
  );

  const relayProfile = {
    name: relayAccount?.name || "Point relais BelivaY",
    manager: relayAccount?.manager_name || user?.first_name || user?.username || "Gerant",
    city: relayAccount?.city || "Ville a definir",
    address: relayAccount?.address || "Adresse a completer",
    hours: relayAccount?.opening_hours || "Horaires a completer",
    status: relayAccount?.status === "APPROVED" ? "Ouvert" : relayAccount?.status === "SUSPENDED" ? "Suspendu" : "En attente",
    trust: 0,
    capacityUsed: parcels.length,
    capacityMax: relayAccount?.storage_capacity || 0,
    tokens: 0,
    monthlyRevenue: 0,
  };
  const capacityPct = Math.round((relayProfile.capacityUsed / relayProfile.capacityMax) * 100);
  const safeCapacityPct = Number.isFinite(capacityPct) ? capacityPct : 0;
  const switchLanguage = () => i18n.changeLanguage(i18n.language.startsWith("fr") ? "en" : "fr");
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const BrandBlock = () => (
    <div className="mb-5 rounded-[22px] border border-blue-100/15 bg-[linear-gradient(145deg,rgba(96,165,250,.16),rgba(255,255,255,.04))] p-4 shadow-[0_18px_40px_rgba(23,37,84,.35)]">
      <div className="flex min-h-16 items-center justify-center">
        <img src="/belivay-logo-relay-point.png" alt="BelivaY" className="h-14 w-full object-contain drop-shadow-[0_10px_24px_rgba(96,165,250,.18)]" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/65">{ui.brand}</span>
        <span className="rounded-full bg-blue-100/15 px-2 py-1 text-[10px] font-black text-blue-50">{relayProfile.status}</span>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Arrivees a confirmer", arrivals.length.toString(), PackagePlus, "Scan QR + preuves"],
          ["Colis en stock", parcels.length.toString(), PackageCheck, "Slots anonymises"],
          ["Capacite", `${relayProfile.capacityUsed}/${relayProfile.capacityMax}`, Warehouse, `${safeCapacityPct}% utilise`],
          [ui.tabs.tokens, ui.dev, BadgeCheck, locale === "en" ? "Module pending" : "Module en cours"],
        ].map(([label, value, Icon, sub]) => (
          <article key={label as string} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
              <Icon size={20} />
            </div>
            <div className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label as string}</div>
            <div className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value as string}</div>
            <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{sub as string}</div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          kicker="Arrivees prevues"
          title="Livreurs en approche"
          action={<button onClick={() => setTab("reception")} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Receptionner</button>}
        >
          <div className="space-y-3">
            {arrivals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                {ui.emptyArrivals}
              </div>
            ) : arrivals.map((arrival) => (
              <div key={arrival.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Truck size={20} />
                  </div>
                  <div>
                    <div className="font-black text-slate-950">{arrival.parcels} colis · {arrival.vehicle}</div>
                    <div className="mt-1 text-sm text-slate-500">Livreur {arrival.courier} · ETA {arrival.eta} · {arrival.size}</div>
                  </div>
                </div>
                <button onClick={() => setTab("reception")} className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700">
                  Scanner QR
                </button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel kicker="Trust & revenus" title="Performance point relais">
          <div className="flex items-center gap-5">
            <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-full border-[10px] border-blue-100 bg-white dark:border-blue-950 dark:bg-slate-900">
              <div className="text-center">
                <div className="text-3xl font-black text-blue-700">{relayProfile.trust}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">/100</div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <StatusPill tone="blue">Score public acheteur</StatusPill>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Le Trust Score depend de la ponctualite, de la securite du stockage, des retraits sans litige et de la satisfaction acheteur.
              </p>
              <button onClick={() => setTab("trust")} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-700">
                Voir le detail <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel kicker="Workflow guichet" title="Actions attendues">
          <div className="space-y-3">
            {[
              ["1", "Reception livreur", "Scanner la mission, controler l'etat du colis, prendre les preuves.", QrCode],
              ["2", "Stockage anonyme", "Attribuer un slot sans exposer le vendeur ni le detail client inutile.", Warehouse],
              ["3", "Retrait acheteur", "Verifier le code de retrait et la piece d'identite si BelivaY l'exige.", KeyRound],
              ["4", "Litige J+7", "Remonter tout colis bloque, endommage ou non retire.", Scale],
            ].map(([step, title, body, Icon]) => (
              <div key={step as string} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">Etape {step as string}</div>
                  <div className="font-black text-slate-950 dark:text-white">{title as string}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{body as string}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel kicker="Activite recente" title="Journal operationnel">
          <div className="grid gap-3">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                {ui.emptyActivity}
              </div>
            ) : history.map(([time, action, ref, detail]) => (
              <div key={`${time}-${ref}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-slate-950 dark:text-white">{action}</strong>
                  <span className="text-xs font-bold text-slate-400">{time}</span>
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{ref} · {detail}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );

  const renderReception = () => (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel kicker="Reception colis" title="Scanner le QR du livreur">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-3xl border border-blue-200 bg-white text-blue-700 shadow-sm">
            <QrCode size={52} />
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            Le gerant scanne le QR de mission presente par le livreur, puis valide les preuves obligatoires avant stockage.
          </p>
          <button className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Demarrer le scan</button>
        </div>
      </Panel>
      <Panel kicker="Workflow V5" title="Controle avant acceptation">
        <div className="space-y-3">
          {[
            ["QR mission", "Verifier que la mission appartient bien au reseau BelivaY.", QrCode],
            ["Controle colis", "Etat visuel, etiquette lisible, nombre de colis conforme.", ClipboardCheck],
            ["Photos preuve", "Face, dos et etiquette avant transfert de responsabilite.", Camera],
            ["Double signature", "Validation gerant point relais et livreur.", FileBadge2],
          ].map(([title, body, Icon]) => (
            <div key={title as string} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                <Icon size={18} />
              </div>
              <div>
                <div className="font-black text-slate-950">{title as string}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{body as string}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderStock = () => (
    <div className="space-y-5">
      <Panel kicker="Stock anonyme" title="Colis en stock">
        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-blue-950">Capacite utilisee</span>
            <strong className="text-sm text-blue-700">{safeCapacityPct}%</strong>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
            <div className={`h-full ${safeCapacityPct > 85 ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${safeCapacityPct}%` }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="py-3">Reference</th>
                <th>Slot</th>
                <th>Acheteur</th>
                <th>Delai</th>
                <th>Statut</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parcels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm font-semibold text-slate-500">
                    {ui.emptyStock}
                  </td>
                </tr>
              ) : parcels.map((parcel) => (
                <tr key={parcel.ref}>
                  <td className="py-4 font-black text-slate-950">{parcel.ref}</td>
                  <td>{parcel.slot}</td>
                  <td>{parcel.buyer}</td>
                  <td>{parcel.age}</td>
                  <td><StatusPill tone={parcel.tone as "emerald" | "amber" | "red"}>{parcel.status}</StatusPill></td>
                  <td className="text-right">
                    <button onClick={() => setTab("retrait")} className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black text-blue-700">Retrait</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );

  const renderRetrait = () => (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel kicker="Retrait acheteur" title="Code de retrait">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Code a 6 chiffres</label>
          <input
            value={pickupCode}
            onChange={(event) => setPickupCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-3xl font-black tracking-[0.35em] outline-none focus:border-blue-500"
            placeholder="000000"
          />
          <button disabled={pickupCode.length !== 6} className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">
            Verifier et remettre
          </button>
        </div>
      </Panel>
      <Panel kicker="Procedure de remise" title="Verification avant sortie">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Code retrait", "Correspondance exacte avec le colis.", KeyRound],
            ["Identite", "Controle CNI si requis par BelivaY.", IdCard],
            ["Photo remise", "Preuve de remise avant cloture.", Camera],
          ].map(([title, body, Icon]) => (
            <div key={title as string} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Icon className="text-blue-700" size={22} />
              <div className="mt-3 font-black text-slate-950">{title as string}</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{body as string}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderTrust = () => (
    <Panel kicker="Score public" title="Trust Score Point Relais">
      <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 text-center">
          <div className="text-6xl font-black text-blue-700">{relayProfile.trust}</div>
          <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-blue-900/55">Trust / 100</div>
          <p className="mt-4 text-sm leading-6 text-blue-950/75">Visible par l'acheteur au moment du choix du point relais.</p>
        </div>
        <div className="space-y-4">
          {trustCriteria.map(([label, value, max]) => {
            const pct = Math.round((Number(value) / Number(max)) * 100);
            return (
              <div key={label as string}>
                <div className="mb-2 flex justify-between text-sm">
                  <strong>{label as string}</strong>
                  <span className="font-bold text-slate-500">{value as number}/{max as number}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${progressTone(pct)}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );

  const renderTokens = () => (
    <Panel kicker="Relais Tokens" title="Module en cours de developpement">
      <div className="rounded-3xl border border-dashed border-blue-300 bg-blue-50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
          <BadgeCheck size={30} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-blue-950">Relais Tokens en cours de developpement</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-blue-950/70">
          La logique de tokens point relais sera activee plus tard. Pour la phase actuelle, BelivaY conserve le module visible,
          mais aucun solde fictif n'est affiche.
        </p>
      </div>
    </Panel>
  );

  const renderNiveaux = () => (
    <Panel kicker="Niveaux PR" title="Module en cours de developpement">
      <div className="rounded-3xl border border-dashed border-blue-300 bg-blue-50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
          <Layers3 size={30} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-blue-950">Niveaux PR en cours de developpement</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-blue-950/70">
          La vue finale prevoit des paliers Starter, Confirme et Premium avec quotas, remuneration et avantages.
          Pour la phase actuelle, BelivaY n'active pas encore cette logique.
        </p>
      </div>
    </Panel>
  );

  const renderFinances = () => (
    <Panel kicker="Reversements" title="Finances MoMo">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-5"><Banknote className="text-blue-700" /><div className="mt-3 text-sm text-slate-500">Tarif actuel</div><div className="text-2xl font-black">150 FCFA / colis</div></div>
        <div className="rounded-2xl bg-slate-50 p-5"><CreditCard className="text-blue-700" /><div className="mt-3 text-sm text-slate-500">Mois courant</div><div className="text-2xl font-black">{fmtXaf(relayProfile.monthlyRevenue)}</div></div>
        <div className="rounded-2xl bg-slate-50 p-5"><WalletCards className="text-blue-700" /><div className="mt-3 text-sm text-slate-500">Versement</div><div className="text-2xl font-black">Hebdomadaire</div></div>
      </div>
    </Panel>
  );

  const renderCapacite = () => (
    <Panel kicker="Capacite & horaires" title="Disponibilite du point relais">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <Warehouse className="text-blue-700" />
          <div className="mt-3 font-black">Stockage</div>
          <p className="mt-1 text-sm text-slate-600">{relayProfile.capacityUsed} colis stockes sur {relayProfile.capacityMax} places.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <Clock3 className="text-blue-700" />
          <div className="mt-3 font-black">Horaires</div>
          <p className="mt-1 text-sm text-slate-600">{relayProfile.hours} · statut {relayProfile.status.toLowerCase()}.</p>
        </div>
      </div>
    </Panel>
  );

  const renderLitiges = () => (
    <Panel kicker="Risque & mediation" title="Litiges Point Relais">
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-700" size={20} />
            <div>
              <div className="font-black text-amber-950">Colis BV-9F2931 non recupere a J+7</div>
              <p className="mt-1 text-sm leading-6 text-amber-900/75">Decision requise : retour livreur vers vendeur ou retour BelivaY selon arbitrage.</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <button className="rounded-2xl border border-slate-200 bg-white p-4 text-left font-black text-slate-800">Retour livreur vers vendeur</button>
          <button className="rounded-2xl border border-slate-200 bg-white p-4 text-left font-black text-slate-800">Retour BelivaY arbitre</button>
        </div>
      </div>
    </Panel>
  );

  const renderSimple = (kind: RelayTab) => {
    const map: Record<string, [string, string, IconComponent]> = {
      historique: ["Historique 30 jours", "Toutes les receptions, retraits, rappels, alertes et litiges.", History],
      kyc: ["Documents KYC", "CNI, registre, MoMo, photos du local et validation physique.", FileCheck2],
      aide: ["Aide & support", "FAQ, support BelivaY, mediateur et assistance logistique.", HelpCircle],
      notifications: ["Notifications", "Rappels J+6/J+7, messages support et alertes de capacite.", Bell],
      formation: ["Formation", "Modules obligatoires et bonnes pratiques de reception/retrait.", BookOpen],
    };
    const [title, body, Icon] = map[kind];
    return (
      <Panel kicker="Point relais" title={title}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <Icon className="text-blue-700" size={28} />
            <p className="mt-4 text-sm leading-7 text-blue-950/75">{body}</p>
          </div>
          {kind === "formation" ? (
            <div className="space-y-3">
              {training.map(([title, tag, done]) => (
                <div key={title as string} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div><strong>{title as string}</strong><div className="text-sm text-slate-500">{tag as string}</div></div>
                  {done ? <CheckCircle2 className="text-emerald-600" /> : <TimerReset className="text-amber-600" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              Cette section reprend la structure prevue dans le prototype final et sera connectee aux donnees backend du point relais.
            </div>
          )}
        </div>
      </Panel>
    );
  };

  const content = {
    dashboard: renderDashboard,
    reception: renderReception,
    stock: renderStock,
    retrait: renderRetrait,
    historique: () => renderSimple("historique"),
    trust: renderTrust,
    tokens: renderTokens,
    niveaux: renderNiveaux,
    finances: renderFinances,
    capacite: renderCapacite,
    litiges: renderLitiges,
    kyc: () => renderSimple("kyc"),
    aide: () => renderSimple("aide"),
    notifications: () => renderSimple("notifications"),
    formation: () => renderSimple("formation"),
  }[tab];

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="flex">
        <aside className="hidden min-h-screen w-[278px] flex-shrink-0 bg-[linear-gradient(185deg,#172554,#1E3A8A_55%,#1E40AF)] p-4 text-white lg:block">
          <BrandBlock />

          <div className="mb-5 rounded-2xl border border-white/10 bg-white/8 p-4">
            <div className="font-black">{relayProfile.name}</div>
            <div className="mt-1 text-xs text-blue-100/70">{relayProfile.manager} · {relayProfile.city}</div>
            <div className="mt-1 text-xs text-blue-100/55">{relayProfile.address}</div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
              <span className="text-blue-100/70">Trust Score PR</span>
              <strong>{relayProfile.trust}/100</strong>
            </div>
          </div>

          <nav className="space-y-4">
            {Object.entries(menu).map(([group, items]) => (
              <div key={group}>
                <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-100/40">{ui.groups[group as keyof typeof ui.groups]}</div>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = item.id === tab;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setTab(item.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                          active ? "bg-white/18 text-white" : "text-blue-50/75 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon size={17} />
                        <span className="min-w-0 flex-1 truncate">{ui.tabs[item.id]}</span>
                        {item.badge ? <span className="rounded-full bg-white/14 px-2 py-0.5 text-[10px]">{item.badge}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">{ui.space}</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">{activeLabel}</h1>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="relative hidden sm:block">
                  <button
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  title={ui.profile}
                >
                  <UserCircle size={17} />
                  <span className="max-w-[140px] truncate">{user?.username || relayProfile.manager}</span>
                </button>
                  {profileMenuOpen ? (
                    <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,.16)] dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
                        <div>
                          <div className="font-black text-slate-950 dark:text-white">{user?.username}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{relayProfile.name}</div>
                        </div>
                        <button type="button" onClick={() => setProfileMenuOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title={ui.close}>
                          <X size={15} />
                        </button>
                      </div>
                      <button type="button" onClick={() => { setProfileMenuOpen(false); navigate("/profile"); }} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800">
                        <UserCircle size={16} />
                        {ui.openProfile}
                      </button>
                      <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <LogOut size={16} />
                        {ui.logout}
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={switchLanguage}
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  title="Changer de langue"
                >
                  {locale === "fr" ? "FR" : "EN"}
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  title={theme === "dark" ? "Mode clair" : "Mode sombre"}
                >
                  {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100"
                  title="Se deconnecter"
                >
                  <LogOut size={17} />
                </button>
                <div className="hidden flex-wrap items-center gap-2 xl:flex">
                  <StatusPill tone="emerald">{relayProfile.status}</StatusPill>
                  <StatusPill tone="blue">{relayProfile.capacityUsed}/{relayProfile.capacityMax} places</StatusPill>
                  <StatusPill tone="slate">{relayProfile.hours}</StatusPill>
                </div>
              </div>
            </div>
          </header>

          <div className="block border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.slice(0, 8).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${
                      tab === item.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <Icon size={14} />
                    {ui.tabs[item.id]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 flex-shrink-0 text-blue-700" size={20} />
                <p className="text-sm leading-6 text-blue-950/75">
                  Interface point relais conforme a la vision BelivaY : anonymat vendeur, preuves de transfert, stockage par slot,
                  code de retrait, litiges J+7, Trust Score public et finances MoMo. Les niveaux PR restent volontairement en developpement.
                </p>
              </div>
            </div>
            {content()}
          </div>
        </section>
      </div>
    </main>
  );
}
