import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  Bell,
  Bike,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileBadge2,
  Gauge,
  LoaderCircle,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  QrCode,
  Route,
  ScanLine,
  Settings2,
  ShieldCheck,
  Siren,
  Truck,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { authApi, type CourierApplicationResponse, type User as AuthUser } from "@/services/api/auth";
import {
  courierApi,
  type CourierShipment,
  type CourierShipmentAction,
} from "@/services/api/courier";
import { MOCK_COURIER_SHIPMENTS } from "@/data/mockCourier";

type CourierTab =
  | "dashboard"
  | "tournee"
  | "courses"
  | "scanner"
  | "map"
  | "gains"
  | "lcompte"
  | "profil"
  | "formation"
  | "notifications"
  | "messages"
  | "incidents"
  | "litiges"
  | "securite"
  | "parametres";

const VEHICLE_LABELS: Record<string, string> = {
  MOTORBIKE: "Moto",
  CAR: "Voiture",
  BIKE: "Velo",
  TRICYCLE: "Tricycle",
  VAN: "Camionnette",
};

const TAB_LABELS: Record<CourierTab, string> = {
  dashboard: "Vue d'ensemble",
  tournee: "Ma Tournee",
  courses: "Courses",
  scanner: "Scanner QR",
  map: "Carte & Navigation",
  gains: "Gains & Rentabilite",
  lcompte: "Mon Compte BelivaY",
  profil: "Mon Profil",
  formation: "Formation",
  notifications: "Notifications",
  messages: "Messages",
  incidents: "Incidents",
  litiges: "Litiges",
  securite: "Securite SOS",
  parametres: "Parametres",
};

const QUICK_MESSAGES = [
  "J'arrive dans 10 minutes.",
  "Le colis est bien pris en charge.",
  "Je suis devant votre portail.",
  "Pouvez-vous confirmer votre position ?",
];

function formatXaf(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function statusLabel(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "Assignee";
    case "PICKED_UP":
      return "Pris en charge";
    case "OUT_FOR_DELIVERY":
      return "En livraison";
    case "DELIVERED":
      return "Livree";
    case "FAILED":
      return "Echec";
    default:
      return "En attente";
  }
}

function statusTone(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "PICKED_UP":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "OUT_FOR_DELIVERY":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    case "DELIVERED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "FAILED":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

function applyLocalAction(
  shipment: CourierShipment,
  action: CourierShipmentAction,
  message?: string,
  location?: string,
) {
  const nextStatus =
    action === "ACCEPT"
      ? "ASSIGNED"
      : action === "PICKED_UP"
        ? "PICKED_UP"
        : action === "OUT_FOR_DELIVERY"
          ? "OUT_FOR_DELIVERY"
          : action === "DELIVERED"
            ? "DELIVERED"
            : action === "FAILED"
              ? "FAILED"
              : action === "DECLINE"
                ? "CREATED"
                : shipment.status;

  return {
    ...shipment,
    status: nextStatus,
    events: [
      ...shipment.events,
      {
        id: Date.now(),
        status: nextStatus,
        message: message || action,
        location: location || shipment.city,
        created_at: new Date().toISOString(),
      },
    ],
  };
}

function SectionShell({
  kicker,
  title,
  children,
  accent = "text-emerald-300",
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <section className="rounded-[24px] border border-white/5 bg-[#161B22] p-5 shadow-[0_18px_48px_rgba(0,0,0,.18)]">
      <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${accent}`}>{kicker}</p>
      <h2 className="mt-1 text-[24px] font-extrabold tracking-tight text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
}) {
  return (
    <article className={`rounded-[20px] border p-4 ${tone}`}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-black/10">
        <Icon size={19} />
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">{label}</div>
      <div className="mt-2 text-[24px] font-extrabold text-white">{value}</div>
    </article>
  );
}

function InfoPill({
  icon: Icon,
  children,
  tone = "border-white/10 bg-white/5 text-white",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-bold ${tone}`}>
      <Icon size={13} />
      {children}
    </div>
  );
}

export default function CourierDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<CourierTab>("dashboard");
  const [booting, setBooting] = useState(true);
  const [progress, setProgress] = useState(8);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [application, setApplication] = useState<CourierApplicationResponse | null>(null);
  const [shipments, setShipments] = useState<CourierShipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [messagesTab, setMessagesTab] = useState<"client" | "vendeur" | "support">("client");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((value) => Math.min(value + 12, 94));
    }, 110);

    Promise.allSettled([authApi.getProfile(), authApi.getCourierApplication(), courierApi.listMyShipments()])
      .then(([profileResult, applicationResult, shipmentsResult]) => {
        const resolvedShipments =
          shipmentsResult.status === "fulfilled" && shipmentsResult.value.length
            ? shipmentsResult.value
            : MOCK_COURIER_SHIPMENTS;

        if (profileResult.status === "fulfilled") setUser(profileResult.value);
        if (applicationResult.status === "fulfilled") setApplication(applicationResult.value);
        setShipments(resolvedShipments);
        setSelectedShipmentId((current) => current ?? resolvedShipments[0]?.id ?? null);
      })
      .finally(() => {
        window.clearInterval(interval);
        setProgress(100);
        window.setTimeout(() => setBooting(false), 320);
      });

    return () => window.clearInterval(interval);
  }, []);

  const courierProfile = application?.application ?? user?.courier_profile ?? null;
  const isApprovedCourier = application?.status === "approved" || Boolean(user?.is_courier);
  const firstName = user?.first_name || user?.username || "Livreur";
  const zones = courierProfile?.zones?.length ? courierProfile.zones : ["Centre-ville", "Bastos", "Mvog-Ada"];

  const activeShipments = useMemo(
    () => shipments.filter((shipment) => ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(shipment.status)),
    [shipments],
  );
  const completedShipments = useMemo(
    () => shipments.filter((shipment) => ["DELIVERED", "FAILED"].includes(shipment.status)),
    [shipments],
  );
  const availableShipments = useMemo(
    () => shipments.filter((shipment) => shipment.status === "CREATED"),
    [shipments],
  );
  const selectedShipment =
    shipments.find((shipment) => shipment.id === selectedShipmentId) ??
    activeShipments[0] ??
    shipments[0] ??
    null;

  const earnings = useMemo(() => {
    const delivered = shipments.filter((shipment) => shipment.status === "DELIVERED");
    const total = delivered.reduce((sum, shipment) => sum + Math.round(shipment.order_total_xaf * 0.08), 0);
    const today = delivered.slice(0, 2).reduce((sum, shipment) => sum + Math.round(shipment.order_total_xaf * 0.08), 0);
    return {
      total,
      today,
      average: delivered.length ? Math.round(total / delivered.length) : 0,
      deliveredCount: delivered.length,
      pending: Math.round(activeShipments.reduce((sum, shipment) => sum + shipment.order_total_xaf * 0.08, 0)),
    };
  }, [activeShipments, shipments]);

  const handleShipmentAction = async (action: CourierShipmentAction) => {
    if (!selectedShipment) return;
    setActionLoading(action);

    try {
      const updated = await courierApi.actOnShipment(selectedShipment.id, {
        action,
        message: action === "NOTE" ? noteDraft.trim() : undefined,
        location: selectedShipment.city,
      });
      setShipments((current) => current.map((shipment) => (shipment.id === updated.id ? updated : shipment)));
      if (action === "NOTE") setNoteDraft("");
    } catch {
      setShipments((current) =>
        current.map((shipment) =>
          shipment.id === selectedShipment.id
            ? applyLocalAction(shipment, action, action === "NOTE" ? noteDraft.trim() : undefined, selectedShipment.city)
            : shipment,
        ),
      );
      if (action === "NOTE") setNoteDraft("");
    } finally {
      setActionLoading(null);
    }
  };

  const menu = [
    { id: "dashboard", label: "Vue d'ensemble", icon: Gauge },
    { id: "tournee", label: "Ma Tournee", icon: Route },
    { id: "courses", label: "Courses", icon: Package },
    { id: "scanner", label: "Scanner QR", icon: ScanLine },
    { id: "map", label: "Carte & Navigation", icon: Map },
    { id: "gains", label: "Gains & Rentabilite", icon: BadgeDollarSign },
    { id: "lcompte", label: "Mon Compte BelivaY", icon: Wallet },
    { id: "profil", label: "Mon Profil", icon: User },
    { id: "formation", label: "Formation", icon: BookOpen },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "incidents", label: "Incidents", icon: AlertTriangle },
    { id: "litiges", label: "Litiges", icon: ShieldCheck },
    { id: "securite", label: "Securite SOS", icon: Siren },
    { id: "parametres", label: "Parametres", icon: Settings2 },
  ] as const;

  const quickStats = [
    {
      label: "Courses actives",
      value: activeShipments.length,
      icon: Package,
      tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Livrees",
      value: earnings.deliveredCount,
      icon: CheckCircle2,
      tone: "text-sky-300 bg-sky-500/10 border-sky-500/20",
    },
    {
      label: "Gains du jour",
      value: formatXaf(earnings.today),
      icon: Wallet,
      tone: "text-orange-300 bg-orange-500/10 border-orange-500/20",
    },
    {
      label: "Moyenne/course",
      value: formatXaf(earnings.average),
      icon: Gauge,
      tone: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    },
  ];

  const leaderboard = [
    { name: "Boris M.", score: "96.8%", badge: "Elite", tone: "text-emerald-300" },
    { name: `${firstName}`, score: "94.1%", badge: "Top 12", tone: "text-orange-300" },
    { name: "Yann N.", score: "92.7%", badge: "Stable", tone: "text-sky-300" },
  ];

  const notifications = [
    { title: "Nouvelle course premium", body: "Zone Bastos, retrait immediat, bonus +1500 FCFA.", tone: "text-orange-300" },
    { title: "Controle qualite", body: "Ton score client est passe a 4.8/5 cette semaine.", tone: "text-emerald-300" },
    { title: "Paiement programme", body: "Versement Mobile Money prevu a 18h30.", tone: "text-sky-300" },
  ];

  const disputes = [
    { ref: "LIT-203", label: "Commande #1058", status: "En mediation", tone: "text-orange-300", detail: "Client absent a la premiere tentative." },
    { ref: "LIT-188", label: "Commande #1042", status: "Justificatif envoye", tone: "text-sky-300", detail: "Photo depot et appel client horodates." },
  ];

  const renderDashboard = () => (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        {quickStats.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionShell kicker="Briefing du jour" title={`Bonjour ${firstName}, prete pour la tournee ?`}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[20px] border border-emerald-500/15 bg-emerald-500/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] font-black uppercase tracking-[0.15em] text-[#6EE7B7]">Statut terrain</span>
                <InfoPill icon={Bike} tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  {courierProfile?.is_online ? "Disponible" : "Hors ligne"}
                </InfoPill>
              </div>
              <div className="space-y-2 text-[14px] text-white/85">
                <div className="flex items-center justify-between rounded-[14px] bg-black/10 px-4 py-3">
                  <span>Depart conseille</span>
                  <strong>08:15</strong>
                </div>
                <div className="flex items-center justify-between rounded-[14px] bg-black/10 px-4 py-3">
                  <span>Trafic</span>
                  <strong>Fluide</strong>
                </div>
                <div className="flex items-center justify-between rounded-[14px] bg-black/10 px-4 py-3">
                  <span>Meteo</span>
                  <strong>27°C, sec</strong>
                </div>
              </div>
            </div>
            <div className="rounded-[20px] border border-white/5 bg-white/[0.03] p-4">
              <div className="mb-3 text-[12px] font-black uppercase tracking-[0.15em] text-orange-300">Checklist pre-shift</div>
              <div className="space-y-3">
                {["Telephone charge", "Application GPS active", "Casque et gilet", "Solde data suffisant"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-[14px] bg-black/10 px-4 py-3 text-[14px] text-white">
                    <CheckCircle2 size={16} className="text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionShell>

        <SectionShell kicker="Classement" title="Top livreurs & score" accent="text-orange-300">
          <div className="space-y-3">
            {leaderboard.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between rounded-[18px] border border-white/5 bg-white/[0.03] px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-extrabold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-white">{item.name}</div>
                    <div className={`text-[12px] font-semibold ${item.tone}`}>{item.badge}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-extrabold text-white">{item.score}</div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-white/50">Performance</div>
                </div>
              </div>
            ))}
          </div>
        </SectionShell>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SectionShell kicker="Carte rapide" title="Zone chaude & disponibilites">
          <div className="rounded-[24px] border border-emerald-500/10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,.22),_rgba(15,23,42,0)_55%),linear-gradient(180deg,#0c1520,#101a26)] p-5">
            <div className="grid gap-4 md:grid-cols-3">
              {zones.map((zone, index) => (
                <div key={zone} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.15em] text-[#6EE7B7]">
                    <MapPin size={13} />
                    {zone}
                  </div>
                  <div className="mt-3 text-[28px] font-extrabold text-white">{78 - index * 9}%</div>
                  <div className="mt-1 text-[12px] text-[#8B949E]">Demande attendue entre 12h et 18h</div>
                </div>
              ))}
            </div>
          </div>
        </SectionShell>

        <SectionShell kicker="Courses" title="Missions disponibles" accent="text-sky-300">
          <div className="space-y-3">
            {(availableShipments.length ? availableShipments : activeShipments).slice(0, 4).map((shipment) => (
              <button
                key={shipment.id}
                type="button"
                onClick={() => {
                  setTab("courses");
                  setSelectedShipmentId(shipment.id);
                }}
                className="w-full rounded-[18px] border border-white/5 bg-white/[0.03] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-white">Commande #{shipment.order}</div>
                    <div className="mt-1 text-[12px] text-[#8B949E]">{shipment.delivery_address}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-extrabold text-emerald-300">
                      {formatXaf(Math.round(shipment.order_total_xaf * 0.08))}
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">Estime</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SectionShell>
      </section>
    </>
  );

  const renderTournee = () => (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionShell kicker="Route optimise" title="Ma tournee du jour">
        <div className="space-y-4">
          <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <InfoPill icon={Route} tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                7 stops
              </InfoPill>
              <InfoPill icon={Clock3}>3h 25 min</InfoPill>
              <InfoPill icon={Navigation}>21 km</InfoPill>
            </div>
            <p className="mt-3 text-[14px] leading-7 text-white/80">
              L'algorithme recommande de commencer par Bastos, puis de redescendre vers Centre-ville pour eviter
              la congestion de 16h.
            </p>
          </div>
          {activeShipments.concat(completedShipments).slice(0, 5).map((shipment, index) => (
            <div key={shipment.id} className="flex gap-4 rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-extrabold text-emerald-300">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-bold text-white">{shipment.customer_name}</div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone(shipment.status)}`}>
                    {statusLabel(shipment.status)}
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-[#8B949E]">{shipment.delivery_address}</div>
                <div className="mt-2 text-[12px] text-white/60">ETA recommandee: {10 + index * 8} min</div>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Terrain" title="Conseils live & regroupement" accent="text-orange-300">
        <div className="space-y-4">
          {[
            {
              title: "Batching recommande",
              body: "Les courses Bastos + Omnisports peuvent etre groupees sur le meme segment.",
              tone: "border-orange-500/20 bg-orange-500/5",
            },
            {
              title: "Client prioritaire",
              body: "Commande #1054: client disponible jusqu'a 14h uniquement.",
              tone: "border-sky-500/20 bg-sky-500/5",
            },
            {
              title: "Zone a risque",
              body: "Mvog-Ada: trafic dense, prevoir +12 minutes sur le passage principal.",
              tone: "border-red-500/20 bg-red-500/5",
            },
          ].map((item) => (
            <div key={item.title} className={`rounded-[18px] border p-4 ${item.tone}`}>
              <div className="font-bold text-white">{item.title}</div>
              <div className="mt-2 text-[13px] leading-6 text-white/75">{item.body}</div>
            </div>
          ))}
          <div className="rounded-[18px] border border-emerald-500/15 bg-[#0f1722] p-4">
            <div className="mb-3 text-[12px] font-black uppercase tracking-[0.15em] text-[#6EE7B7]">Prochaine action</div>
            <button
              type="button"
              onClick={() => setTab("map")}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] px-5 py-3 text-[12px] font-extrabold text-white"
            >
              Ouvrir la navigation
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </SectionShell>
    </section>
  );

  const renderCourses = () => (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionShell kicker="Operations" title="Toutes les courses">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { label: "Actives", count: activeShipments.length, tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" },
            { label: "Disponibles", count: availableShipments.length, tone: "border-sky-500/20 bg-sky-500/10 text-sky-300" },
            { label: "Historique", count: completedShipments.length, tone: "border-white/10 bg-white/5 text-white" },
          ].map((pill) => (
            <div key={pill.label} className={`rounded-full border px-4 py-2 text-[12px] font-bold ${pill.tone}`}>
              {pill.label} · {pill.count}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {shipments.map((shipment) => (
            <button
              key={shipment.id}
              type="button"
              onClick={() => setSelectedShipmentId(shipment.id)}
              className={`w-full rounded-[18px] border p-4 text-left transition ${
                selectedShipment?.id === shipment.id
                  ? "border-orange-500/35 bg-orange-500/8"
                  : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-extrabold text-white">Commande #{shipment.order}</div>
                  <div className="mt-1 text-[12px] text-[#8B949E]">{shipment.customer_name}</div>
                  <div className="mt-2 inline-flex items-center gap-2 text-[12px] text-[#8B949E]">
                    <MapPin size={12} />
                    {shipment.delivery_address}
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone(shipment.status)}`}>
                  {statusLabel(shipment.status)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Mission selectionnee" title={selectedShipment ? `Commande #${selectedShipment.order}` : "Aucune mission"} accent="text-orange-300">
        {selectedShipment ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Client</div>
                <div className="mt-2 font-semibold text-white">{selectedShipment.customer_name}</div>
                <div className="mt-1 text-[12px] text-[#8B949E]">{selectedShipment.customer_phone}</div>
              </div>
              <div className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Valeur commande</div>
                <div className="mt-2 text-[20px] font-extrabold text-emerald-300">{formatXaf(selectedShipment.order_total_xaf)}</div>
                <div className="mt-1 text-[12px] text-white/55">Commission estimee: {formatXaf(Math.round(selectedShipment.order_total_xaf * 0.08))}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {selectedShipment.status === "ASSIGNED" ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("ACCEPT")}
                    className="rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] px-5 py-3 text-[12px] font-extrabold text-white"
                  >
                    {actionLoading === "ACCEPT" ? "Validation..." : "Accepter la mission"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("DECLINE")}
                    className="rounded-full border border-red-500/25 bg-red-500/10 px-5 py-3 text-[12px] font-extrabold text-red-300"
                  >
                    Refuser
                  </button>
                </>
              ) : null}
              {(selectedShipment.status === "PICKED_UP" || selectedShipment.status === "ASSIGNED") && (
                <button
                  type="button"
                  onClick={() => handleShipmentAction("PICKED_UP")}
                  className="rounded-full border border-amber-500/25 bg-amber-500/10 px-5 py-3 text-[12px] font-extrabold text-amber-300"
                >
                  Marquer pris en charge
                </button>
              )}
              {selectedShipment.status === "PICKED_UP" && (
                <button
                  type="button"
                  onClick={() => handleShipmentAction("OUT_FOR_DELIVERY")}
                  className="rounded-full border border-orange-500/25 bg-orange-500/10 px-5 py-3 text-[12px] font-extrabold text-orange-300"
                >
                  Marquer en cours de livraison
                </button>
              )}
              {selectedShipment.status === "OUT_FOR_DELIVERY" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("DELIVERED")}
                    className="rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] px-5 py-3 text-[12px] font-extrabold text-white"
                  >
                    Marquer livree
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("FAILED")}
                    className="rounded-full border border-red-500/25 bg-red-500/10 px-5 py-3 text-[12px] font-extrabold text-red-300"
                  >
                    Marquer echec
                  </button>
                </>
              )}
              <a
                href={`tel:${selectedShipment.customer_phone}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[12px] font-extrabold text-white"
              >
                <Phone size={14} />
                Contacter le client
              </a>
            </div>

            <div className="mt-5 rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#8B949E]">
                Ajouter une note ou une position
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Ex: client joint, arrivee estimee 12 min"
                  className="flex-1 rounded-[14px] border border-white/10 bg-[#0D1117] px-4 py-3 text-[13px] text-white outline-none placeholder:text-[#6B7280]"
                />
                <button
                  type="button"
                  onClick={() => handleShipmentAction("NOTE")}
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-white px-5 py-3 text-[12px] font-extrabold text-[#0D1117]"
                >
                  {actionLoading === "NOTE" ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  Enregistrer
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
            Aucune course selectionnee.
          </div>
        )}
      </SectionShell>
    </section>
  );

  const renderScanner = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker="Verification colis" title="Scanner QR">
        <div className="rounded-[28px] border border-emerald-500/20 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,.18),_transparent_55%),#0d1520] p-6">
          <div className="mx-auto flex h-[280px] max-w-[320px] items-center justify-center rounded-[28px] border-2 border-dashed border-emerald-400/40 bg-black/20">
            <div className="text-center">
              <QrCode size={80} className="mx-auto text-emerald-300" />
              <div className="mt-4 text-[14px] font-bold text-white">Place le QR du colis dans la zone de scan</div>
              <div className="mt-2 text-[12px] text-[#8B949E]">Le systeme confirme le retrait, la remise ou le retour.</div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] px-5 py-3 text-[12px] font-extrabold text-white">
              Simuler un scan
            </button>
            <InfoPill icon={ScanLine}>Mode camera HD</InfoPill>
            <InfoPill icon={ShieldCheck}>Scan securise</InfoPill>
          </div>
        </div>
      </SectionShell>

      <SectionShell kicker="Historique" title="Derniers scans" accent="text-sky-300">
        <div className="space-y-3">
          {(selectedShipment ? [selectedShipment] : shipments.slice(0, 1)).concat(shipments.slice(1, 4)).map((shipment, index) => (
            <div key={`${shipment.id}-${index}`} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-white">QR Commande #{shipment.order}</div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone(shipment.status)}`}>
                  {statusLabel(shipment.status)}
                </span>
              </div>
              <div className="mt-2 text-[12px] text-[#8B949E]">{new Date().toLocaleString("fr-FR")}</div>
            </div>
          ))}
          <div className="rounded-[18px] border border-orange-500/20 bg-orange-500/5 p-4 text-[13px] leading-6 text-white/80">
            Conseil: scanne toujours au retrait et a la remise pour horodater automatiquement la mission.
          </div>
        </div>
      </SectionShell>
    </section>
  );

  const renderMap = () => (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <SectionShell kicker="Navigation" title="Carte & itineraire">
        <div className="rounded-[26px] border border-white/5 bg-[linear-gradient(180deg,#0d1621,#121d2a)] p-5">
          <div className="flex h-[360px] items-end rounded-[22px] border border-emerald-500/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,.22),_rgba(15,23,42,0)_40%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,.18),_rgba(15,23,42,0)_32%),#0b1220] p-5">
            <div className="grid gap-3 md:grid-cols-3">
              {zones.map((zone, index) => (
                <div key={zone} className="rounded-[18px] border border-white/5 bg-black/20 p-4">
                  <div className="text-[12px] font-black uppercase tracking-[0.16em] text-[#6EE7B7]">{zone}</div>
                  <div className="mt-3 text-[24px] font-extrabold text-white">{index + 3} hotspots</div>
                  <div className="mt-1 text-[12px] text-[#8B949E]">Heure optimale: {11 + index}h - {15 + index}h</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell kicker="Aide conduite" title="Meilleurs choix terrain" accent="text-orange-300">
        <div className="space-y-3">
          {[
            "Contourner le carrefour Warda entre 17h10 et 18h.",
            "Zone Bastos plus rentable en debut d'apres-midi.",
            "Relancer la navigation si GPS faible sous tunnel.",
            "Mode pluie disponible automatiquement si precipitation detectee.",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
              <Navigation size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <div className="text-[13px] leading-6 text-white/80">{item}</div>
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderGains = () => (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
      <SectionShell kicker="Monetisation" title="Gains & rentabilite">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Total gains" value={formatXaf(earnings.total)} icon={Wallet} tone="text-emerald-300 bg-emerald-500/10 border-emerald-500/20" />
          <MetricCard label="Aujourd'hui" value={formatXaf(earnings.today)} icon={BadgeDollarSign} tone="text-orange-300 bg-orange-500/10 border-orange-500/20" />
          <MetricCard label="En attente" value={formatXaf(earnings.pending)} icon={CreditCard} tone="text-sky-300 bg-sky-500/10 border-sky-500/20" />
        </div>
        <div className="mt-5 rounded-[22px] border border-white/5 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[12px] font-black uppercase tracking-[0.16em] text-[#8B949E]">Objectif du mois</div>
            <div className="text-[13px] font-bold text-white">68%</div>
          </div>
          <div className="h-3 rounded-full bg-white/5">
            <div className="h-full w-[68%] rounded-full bg-[linear-gradient(90deg,#10B981,#6EE7B7)]" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[35, 48, 61, 82].map((height, index) => (
              <div key={height} className="rounded-[16px] border border-white/5 bg-black/10 p-3">
                <div className="flex h-28 items-end">
                  <div className="w-full rounded-t-[14px] bg-[linear-gradient(180deg,#6EE7B7,#10B981)]" style={{ height: `${height}%` }} />
                </div>
                <div className="mt-3 text-center text-[12px] font-bold text-white">S{index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell kicker="Versements" title="Mobile Money & historique" accent="text-sky-300">
        <div className="space-y-3">
          {completedShipments.slice(0, 5).map((shipment) => (
            <div key={shipment.id} className="flex items-center justify-between rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
              <div>
                <div className="text-[13px] font-bold text-white">Commande #{shipment.order}</div>
                <div className="mt-1 text-[12px] text-[#8B949E]">
                  {shipment.status === "DELIVERED" ? "Versement programme" : "Pas de versement"}
                </div>
              </div>
              <div className={`text-[18px] font-extrabold ${shipment.status === "DELIVERED" ? "text-[#6EE7B7]" : "text-red-300"}`}>
                {shipment.status === "DELIVERED" ? `+${formatXaf(Math.round(shipment.order_total_xaf * 0.08))}` : "0 FCFA"}
              </div>
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderCompte = () => (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker="Wallet" title="Mon Compte BelivaY">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Solde dispo</div>
            <div className="mt-2 text-[26px] font-extrabold text-[#6EE7B7]">{formatXaf(earnings.total)}</div>
          </div>
          <div className="rounded-[20px] border border-orange-500/20 bg-orange-500/5 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Retraits</div>
            <div className="mt-2 text-[26px] font-extrabold text-orange-300">2</div>
          </div>
          <div className="rounded-[20px] border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Compte MoMo</div>
            <div className="mt-2 text-[18px] font-extrabold text-sky-300">{courierProfile?.phone || user?.phone || "Non lie"}</div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            "Demander un retrait Mobile Money",
            "Rattacher un compte bancaire",
            "Voir les bonus hebdomadaires",
            "Consulter les prelevements et frais",
          ].map((item) => (
            <div key={item} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4 text-[14px] text-white">
              {item}
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Confiance" title="Historique financier" accent="text-orange-300">
        <div className="space-y-3">
          {[
            "Retrait Mobile Money · 45 000 FCFA · Reussi",
            "Bonus performance · 5 000 FCFA · Credite",
            "Commission course premium · 2 500 FCFA · Creditee",
          ].map((item) => (
            <div key={item} className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4 text-[13px] text-white/80">
              {item}
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderProfil = () => (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker="Identite" title="Mon Profil">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Telephone", value: courierProfile?.phone || user?.phone || "—", icon: Phone },
            { label: "Ville", value: courierProfile?.city || "Yaounde", icon: MapPin },
            { label: "Zones", value: zones.join(", "), icon: Truck },
            { label: "Vehicule", value: courierProfile ? VEHICLE_LABELS[courierProfile.vehicle_type] || courierProfile.vehicle_type : "Moto", icon: Bike },
            { label: "Piece d'identite", value: courierProfile?.id_card || "En attente", icon: FileBadge2 },
            { label: "Statut", value: isApprovedCourier ? "Approuve" : "En validation", icon: BadgeCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#8B949E]">
                  <Icon size={13} className="text-[#6EE7B7]" />
                  {item.label}
                </div>
                <div className="text-[14px] font-semibold text-white">{item.value}</div>
              </div>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell kicker="Reputation" title="Badges & pouvoir metier" accent="text-orange-300">
        <div className="space-y-3">
          {[
            "Voir vos livraisons assignees",
            "Accepter ou refuser une mission",
            "Marquer pris en charge, en livraison, livre ou echec",
            "Ajouter une note ou une position",
            "Contacter client et vendeur si necessaire",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-emerald-500/15 bg-emerald-500/5 p-4 text-[13px] text-white">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#6EE7B7]" />
              {item}
            </div>
          ))}
          {[
            "Modifier les produits ou les prix",
            "Voir toutes les commandes de tous les vendeurs",
            "Changer les paiements ou l'escrow",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-red-500/15 bg-red-500/5 p-4 text-[13px] text-white">
              <XCircle size={16} className="mt-0.5 shrink-0 text-red-300" />
              {item}
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderFormation = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker="Academie" title="Formation livreur">
        <div className="rounded-[22px] border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.15em] text-[#6EE7B7]">Progression</div>
              <div className="mt-1 text-[26px] font-extrabold text-white">72%</div>
            </div>
            <BookOpen size={28} className="text-emerald-300" />
          </div>
          <div className="mt-4 h-3 rounded-full bg-black/20">
            <div className="h-full w-[72%] rounded-full bg-[linear-gradient(90deg,#10B981,#6EE7B7)]" />
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {[
            "Retrait et verification du colis",
            "Navigation intelligente et etiquette client",
            "Gestion des incidents et preuves",
            "Securite nuit & bouton SOS",
          ].map((item, index) => (
            <div key={item} className="flex items-center justify-between rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="font-semibold text-white">{item}</div>
              <div className="text-[12px] font-bold text-[#8B949E]">{index < 2 ? "Valide" : "A terminer"}</div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Certification" title="Quiz & badges" accent="text-sky-300">
        <div className="space-y-3">
          {[
            "Badge Ponctualite",
            "Badge Communication client",
            "Badge Securite terrain",
          ].map((item) => (
            <div key={item} className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4 text-[14px] font-semibold text-white">
              {item}
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderNotifications = () => (
    <SectionShell kicker="Centre d'alertes" title="Notifications">
      <div className="space-y-3">
        {notifications.map((item) => (
          <div key={item.title} className="flex gap-4 rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
            <Bell size={18} className={`mt-0.5 shrink-0 ${item.tone}`} />
            <div>
              <div className="font-bold text-white">{item.title}</div>
              <div className="mt-1 text-[13px] leading-6 text-white/75">{item.body}</div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );

  const renderMessages = () => {
    const threadTitle =
      messagesTab === "client" ? "Client final" : messagesTab === "vendeur" ? "Vendeur expeditor" : "Support BelivaY";

    return (
      <section className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <SectionShell kicker="Canaux" title="Messages">
          <div className="flex gap-2">
            {[
              ["client", "Client"],
              ["vendeur", "Vendeur"],
              ["support", "Support"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMessagesTab(id as "client" | "vendeur" | "support")}
                className={`rounded-full border px-4 py-2 text-[12px] font-bold ${
                  messagesTab === id
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {[
              "Commande #1054 · Derniere reponse 2 min",
              "Commande #1048 · Reponse vendeur attendue",
              "Support logistique · Ticket #SUP-18",
            ].map((item) => (
              <div key={item} className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4 text-[13px] text-white">
                {item}
              </div>
            ))}
          </div>
        </SectionShell>

        <SectionShell kicker="Conversation" title={threadTitle} accent="text-orange-300">
          <div className="space-y-3">
            <div className="max-w-[80%] rounded-[18px] border border-white/5 bg-white/[0.03] px-4 py-3 text-[13px] text-white/80">
              Bonjour, votre colis est bien pris en charge. Je vous tiens au courant.
            </div>
            <div className="ml-auto max-w-[80%] rounded-[18px] bg-[linear-gradient(135deg,#10B981,#065F46)] px-4 py-3 text-[13px] text-white">
              Merci, j'arrive dans votre zone dans environ 10 minutes.
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_MESSAGES.map((item) => (
              <button key={item} type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white">
                {item}
              </button>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <input
              placeholder="Ecrire un message..."
              className="flex-1 rounded-[14px] border border-white/10 bg-[#0D1117] px-4 py-3 text-[13px] text-white outline-none placeholder:text-[#6B7280]"
            />
            <button type="button" className="rounded-[14px] bg-white px-5 py-3 text-[12px] font-extrabold text-[#0D1117]">
              Envoyer
            </button>
          </div>
        </SectionShell>
      </section>
    );
  };

  const renderIncidents = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker="Assistant terrain" title="Incidents">
        <div className="space-y-3">
          {[
            "Client absent",
            "Adresse introuvable",
            "Colis endommage",
            "Route bloquee / trafic severe",
          ].map((item) => (
            <div key={item} className="rounded-[18px] border border-red-500/15 bg-red-500/5 p-4">
              <div className="font-bold text-white">{item}</div>
              <div className="mt-2 text-[13px] text-white/75">
                Ouvre un protocole rapide avec preuves, photo, horodatage et message automatique.
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Protocoles" title="Actions conseillees" accent="text-sky-300">
        <div className="space-y-3">
          {[
            "Appeler le client 2 fois avant de cloturer un echec.",
            "Joindre une photo geolocalisee si depot refuse.",
            "Signaler le vendeur si le colis ne correspond pas.",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange-300" />
              <div className="text-[13px] leading-6 text-white/80">{item}</div>
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderLitiges = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
      <SectionShell kicker="Mediation" title="Litiges livreur">
        <div className="space-y-3">
          {disputes.map((item) => (
            <div key={item.ref} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-white">{item.ref} · {item.label}</div>
                  <div className="mt-1 text-[13px] text-white/70">{item.detail}</div>
                </div>
                <div className={`text-[12px] font-bold ${item.tone}`}>{item.status}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Cadre metier" title="Droits & obligations" accent="text-orange-300">
        <div className="space-y-3">
          {[
            "Toujours fournir les preuves de passage ou de remise.",
            "Ne jamais cloturer un litige hors protocole support.",
            "Le livreur peut repondre, pas arbitrer seul.",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <div className="text-[13px] leading-6 text-white/80">{item}</div>
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderSecurite = () => (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionShell kicker="Urgence" title="Securite SOS">
        <div className="rounded-[26px] border border-red-500/20 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,.18),_transparent_48%),#1c1013] p-6 text-center">
          <button type="button" className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border-4 border-red-400/30 bg-red-500/15 text-red-300 shadow-[0_0_0_14px_rgba(239,68,68,.06)]">
            <Siren size={54} />
          </button>
          <div className="mt-5 text-[22px] font-extrabold text-white">Declencher une alerte SOS</div>
          <div className="mt-2 text-[13px] leading-6 text-white/70">
            Utilise cette action pour contacter les contacts d'urgence et le support securite.
          </div>
        </div>
      </SectionShell>

      <SectionShell kicker="Protection" title="Contacts & procedures" accent="text-sky-300">
        <div className="space-y-3">
          {[
            "Contact urgence 1: +237 6 90 00 00 00",
            "Contact urgence 2: +237 6 80 00 00 00",
            "Support surete BelivaY: 24/7",
            "Mode nuit automatique apres 19h",
          ].map((item) => (
            <div key={item} className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4 text-[13px] text-white/80">
              {item}
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderParametres = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker="Configuration" title="Parametres">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            "Compte",
            "Vehicule",
            "Notifications",
            "Affichage",
            "Statistiques",
            "Securite",
            "Langue",
            "A propos",
          ].map((item) => (
            <div key={item} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4 font-semibold text-white">
              {item}
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Actions rapides" title="Reglages frequents" accent="text-orange-300">
        <div className="space-y-3">
          {[
            "Activer / desactiver le mode disponible",
            "Choisir la langue d'interface",
            "Mettre a jour la zone principale",
            "Verifier les permissions GPS et camera",
          ].map((item) => (
            <div key={item} className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4 text-[13px] text-white/80">
              {item}
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderCurrentTab = () => {
    switch (tab) {
      case "dashboard":
        return renderDashboard();
      case "tournee":
        return renderTournee();
      case "courses":
        return renderCourses();
      case "scanner":
        return renderScanner();
      case "map":
        return renderMap();
      case "gains":
        return renderGains();
      case "lcompte":
        return renderCompte();
      case "profil":
        return renderProfil();
      case "formation":
        return renderFormation();
      case "notifications":
        return renderNotifications();
      case "messages":
        return renderMessages();
      case "incidents":
        return renderIncidents();
      case "litiges":
        return renderLitiges();
      case "securite":
        return renderSecurite();
      case "parametres":
        return renderParametres();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <div className="fixed inset-x-0 top-0 z-[1000] h-1 bg-white/5">
        <div
          className="h-full bg-[linear-gradient(90deg,#10B981,#6EE7B7)] transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <header className="fixed inset-x-0 top-1 z-[950] flex h-[58px] items-center gap-4 bg-[linear-gradient(135deg,#021f16,#033b28_55%,#065F46)] px-4 shadow-[0_2px_22px_rgba(0,0,0,.4)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-[#6EE7B7]">
            <Bike size={20} />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-tight">BelivaY Livreur</div>
            <div className="text-[11px] text-white/70">
              {isApprovedCourier ? "Toutes les vues operationnelles" : "Validation du profil en attente"}
            </div>
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white">
            {courierProfile?.is_online ? "Disponible" : "Hors ligne"}
          </div>
          <button
            type="button"
            onClick={() => navigate("/profile?panel=livreur")}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[12px] font-bold text-white transition hover:bg-white/15"
          >
            Mon compte client
          </button>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-[59px] hidden w-[232px] border-r border-white/5 bg-[#0D1117] lg:block">
        <div className="m-4 rounded-[14px] border border-emerald-500/15 bg-emerald-500/5 p-4">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] text-lg font-extrabold text-white">
            {user?.first_name?.[0] || user?.username?.[0] || "L"}
          </div>
          <div className="font-bold text-white">
            {user?.first_name || "Livreur"} {user?.last_name || ""}
          </div>
          <div className="mt-1 text-[12px] text-[#6EE7B7]">
            {courierProfile ? `${courierProfile.city} · ${VEHICLE_LABELS[courierProfile.vehicle_type] || courierProfile.vehicle_type}` : "Demande a finaliser"}
          </div>
        </div>

        <nav className="px-3 pb-8">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`mb-1 flex w-full items-center gap-3 rounded-[12px] px-4 py-3 text-left text-[13px] font-semibold transition ${
                  active
                    ? "border-l-[3px] border-[#10B981] bg-emerald-500/10 text-[#6EE7B7]"
                    : "text-[#8B949E] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="px-4 pb-12 pt-[84px] lg:ml-[232px] lg:px-6">
        {booting ? (
          <div className="mx-auto max-w-[1180px] animate-pulse space-y-4">
            <div className="h-32 rounded-[24px] bg-white/5" />
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 rounded-[20px] bg-white/5" />
              ))}
            </div>
            <div className="h-[420px] rounded-[24px] bg-white/5" />
          </div>
        ) : (
          <div className="mx-auto max-w-[1180px] space-y-5">
            <section className="overflow-hidden rounded-[24px] border border-emerald-500/15 bg-[linear-gradient(135deg,#161B22,#0f2a21)] p-6 shadow-[0_18px_48px_rgba(0,0,0,.24)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#6EE7B7]">
                    <ShieldCheck size={13} />
                    Acteur livreur
                  </div>
                  <h1 className="text-[30px] font-extrabold tracking-tight text-white">
                    {TAB_LABELS[tab]}
                  </h1>
                  <p className="mt-2 max-w-[760px] text-[14px] leading-7 text-[#8B949E]">
                    Cette interface reprend toutes les vues du modele BelivaY Livreur: operations, securite,
                    gains, communication, navigation et suivi metier du livreur.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-white/5 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Ville</div>
                    <div className="mt-2 text-[22px] font-extrabold text-[#6EE7B7]">{courierProfile?.city || "Yaounde"}</div>
                  </div>
                  <div className="rounded-[18px] border border-white/5 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Vehicule</div>
                    <div className="mt-2 text-[22px] font-extrabold text-orange-300">
                      {courierProfile ? VEHICLE_LABELS[courierProfile.vehicle_type] || courierProfile.vehicle_type : "Moto"}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/5 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Statut</div>
                    <div className="mt-2 text-[22px] font-extrabold text-sky-300">
                      {isApprovedCourier ? "Actif" : "Pending"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {renderCurrentTab()}
          </div>
        )}
      </main>
    </div>
  );
}
