import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, MapPin, Phone, RefreshCw, Route, Search, Truck, Users } from "lucide-react";
import { http } from "@/services/api/http";
import { useAdminTheme } from "@/hooks/useAdminTheme";

interface DeliveryOrganization {
  id: number;
  company_name: string;
  manager_name: string;
  phone: string;
  city: string;
  zones: string[];
  address: string;
  contract_reference: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
}

const mapPositions = [
  { top: "34%", left: "58%" },
  { top: "64%", left: "38%" },
  { top: "48%", left: "48%" },
  { top: "72%", left: "57%" },
];

function statusLabel(status: DeliveryOrganization["status"]) {
  if (status === "APPROVED") return "Approuvee";
  if (status === "SUSPENDED") return "Suspendue";
  return "En attente";
}

export default function DeliveryOrganizationsMapPage() {
  const T = useAdminTheme();
  const [organizations, setOrganizations] = useState<DeliveryOrganization[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    http<DeliveryOrganization[]>("/api/auth/admin/delivery-organizations/")
      .then((items) => {
        if (alive) {
          setOrganizations(items);
          setSelectedId(items[0]?.id ?? null);
        }
      })
      .catch(() => {
        if (alive) {
          setOrganizations([]);
          setSelectedId(null);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((org) =>
      [org.company_name, org.manager_name, org.city, org.address, org.contract_reference, ...org.zones]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [organizations, search]);

  const selected = filtered.find((org) => org.id === selectedId) ?? filtered[0] ?? null;
  const approvedCount = organizations.filter((org) => org.status === "APPROVED").length;
  const zonesCount = new Set(organizations.flatMap((org) => org.zones)).size;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">
            Reseau logistique partenaire
          </p>
          <h1 style={{ color: T.text }} className="mt-1 text-2xl font-black">
            Organisations de livraison BelivaY
          </h1>
          <p style={{ color: T.muted }} className="mt-1 max-w-2xl text-sm">
            Vue admin de supervision : entreprises partenaires, zones couvertes, contrats et rattachement operationnel des livreurs.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
        >
          <RefreshCw size={15} />
          Actualiser
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Organisations", organizations.length.toString(), Building2],
          ["Approuvees", approvedCount.toString(), CheckCircle2],
          ["Zones couvertes", zonesCount.toString(), Route],
          ["Livreurs rattaches", "A connecter", Truck],
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: T.muted }} className="text-xs font-bold uppercase tracking-[0.12em]">{label as string}</p>
                <p style={{ color: T.text }} className="mt-2 text-2xl font-black">{value as string}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                <Icon size={20} />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-hidden rounded-2xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: T.border }}>
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: T.muted }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher organisation, ville, zone, contrat..."
                className="w-full rounded-xl py-2 pl-10 pr-3 text-sm outline-none"
                style={{ background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text }}
              />
            </div>
            <span style={{ color: T.muted }} className="text-sm font-semibold">
              {loading ? "Chargement..." : `${filtered.length} organisations affichees`}
            </span>
          </div>

          <div className="relative min-h-[520px] overflow-hidden bg-[#e9f8fb]">
            <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(8,116,144,.11)_1px,transparent_1px),linear-gradient(90deg,rgba(8,116,144,.11)_1px,transparent_1px)] [background-size:42px_42px]" />
            <div className="absolute left-[9%] top-[18%] h-[66%] w-[78%] rounded-[45%] border-[18px] border-cyan-200/70" />
            <div className="absolute left-[21%] top-[28%] h-[44%] w-[56%] rotate-[-12deg] rounded-[45%] border-[12px] border-emerald-200/70" />
            <div className="absolute left-[8%] top-[57%] h-4 w-[88%] -rotate-6 rounded-full bg-slate-300/70" />
            <div className="absolute left-[18%] top-[35%] h-3 w-[74%] rotate-12 rounded-full bg-slate-300/70" />

            {filtered.map((org, index) => {
              const position = mapPositions[index % mapPositions.length];
              const active = selected?.id === org.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedId(org.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition"
                  style={{ top: position.top, left: position.left }}
                  title={org.company_name}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full border-4 shadow-lg ${active ? "border-cyan-800 bg-cyan-700 text-white" : "border-white bg-white text-cyan-700"}`}>
                    <Building2 size={22} />
                  </span>
                  <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[11px] font-bold text-white shadow">
                    {org.city || org.company_name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          {selected ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">
                    {selected.contract_reference || "Contrat a definir"}
                  </p>
                  <h2 style={{ color: T.text }} className="mt-1 text-xl font-black">{selected.company_name}</h2>
                  <p style={{ color: T.muted }} className="mt-1 text-sm">{selected.address || selected.city}</p>
                </div>
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                  {statusLabel(selected.status)}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <Users size={17} className="text-cyan-700" />
                  <span className="text-sm font-semibold text-slate-700">{selected.manager_name || "Responsable a completer"}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <Phone size={17} className="text-cyan-700" />
                  <span className="text-sm font-semibold text-slate-700">{selected.phone || "Telephone a completer"}</span>
                </div>
              </div>

              <div className="mt-5">
                <p style={{ color: T.muted }} className="text-xs font-bold uppercase tracking-[0.12em]">Zones couvertes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selected.zones.length ? selected.zones : [selected.city || "Zone a definir"]).map((zone) => (
                    <span key={zone} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                      {zone}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: T.muted }} className="text-sm">Aucune organisation a afficher.</p>
          )}
        </aside>
      </section>
    </div>
  );
}
