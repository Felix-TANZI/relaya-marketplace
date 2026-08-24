import { useEffect, useMemo, useState } from "react";
import { Building2, Clock3, MapPin, Package, Phone, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { http } from "@/services/api/http";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import { offsetPosition, OpenStreetMap, resolveCameroonPosition, type OpenStreetMapMarker } from "@/components/maps/OpenStreetMap";

interface RelayPoint {
  id: number;
  name: string;
  manager_name: string;
  phone: string;
  city: string;
  zones: string[];
  address: string;
  relay_code: string;
  opening_hours: string;
  storage_capacity: number;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  username: string;
}

function statusLabel(status: RelayPoint["status"]) {
  if (status === "APPROVED") return "Approuve";
  if (status === "SUSPENDED") return "Suspendu";
  return "En attente";
}

export default function RelayPointsMapPage() {
  const T = useAdminTheme();
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    http<RelayPoint[]>("/api/auth/admin/relay-points/")
      .then((items) => {
        if (alive) {
          setRelayPoints(items);
          setSelectedId(items[0]?.id ?? null);
        }
      })
      .catch(() => {
        if (alive) {
          setRelayPoints([]);
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
    if (!q) return relayPoints;
    return relayPoints.filter((relay) =>
      [relay.name, relay.city, relay.address, relay.relay_code, relay.manager_name, ...relay.zones]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [relayPoints, search]);

  const selected = filtered.find((relay) => relay.id === selectedId) ?? filtered[0] ?? null;
  const approvedCount = relayPoints.filter((relay) => relay.status === "APPROVED").length;
  const totalCapacity = relayPoints.reduce((sum, relay) => sum + (relay.storage_capacity || 0), 0);
  const markers: OpenStreetMapMarker[] = filtered.map((relay, index) => {
    const position = offsetPosition(resolveCameroonPosition(relay.address, relay.city, relay.zones.join(" ")), relay.id || index);
    const active = selected?.id === relay.id;
    return {
      id: relay.id,
      position,
      title: relay.name,
      subtitle: relay.address || relay.city,
      color: active ? "#4f46e5" : "#2563eb",
      iconHtml: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" fill="white"/><circle cx="12" cy="10" r="3" fill="${active ? "#4f46e5" : "#2563eb"}"/></svg>`,
      popup: (
        <button type="button" onClick={() => setSelectedId(relay.id)} className="block min-w-[210px] text-left">
          <div className="text-sm font-black text-slate-950">{relay.name}</div>
          <div className="mt-1 text-xs font-semibold text-slate-600">{relay.address || relay.city}</div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-blue-700">{relay.relay_code || "Code a definir"}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 font-black text-emerald-700">{statusLabel(relay.status)}</span>
          </div>
        </button>
      ),
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p style={{ color: T.red }} className="text-[11px] font-black uppercase tracking-[0.18em]">
            Reseau points relais
          </p>
          <h1 style={{ color: T.text }} className="mt-1 text-2xl font-black">
            Carte des points relais BelivaY
          </h1>
          <p style={{ color: T.muted }} className="mt-1 max-w-2xl text-sm">
            Vue admin de supervision : localisation operationnelle, capacite, couverture et statut des relais partenaires.
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

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Points relais", relayPoints.length.toString(), Building2],
          ["Approuves", approvedCount.toString(), ShieldCheck],
          ["Capacite totale", totalCapacity.toString(), Package],
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: T.muted }} className="text-xs font-bold uppercase tracking-[0.12em]">{label as string}</p>
                <p style={{ color: T.text }} className="mt-2 text-3xl font-black">{value as string}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Icon size={20} />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="overflow-hidden rounded-2xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: T.border }}>
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: T.muted }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher ville, zone, code relais..."
                className="w-full rounded-xl py-2 pl-10 pr-3 text-sm outline-none"
                style={{ background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text }}
              />
            </div>
            <span style={{ color: T.muted }} className="text-sm font-semibold">
              {loading ? "Chargement..." : `${filtered.length} relais affiches`}
            </span>
          </div>

          <OpenStreetMap markers={markers} height={520} className="rounded-none" />
        </div>

        <aside className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          {selected ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-700">{selected.relay_code || "Code a definir"}</p>
                  <h2 style={{ color: T.text }} className="mt-1 text-xl font-black">{selected.name}</h2>
                  <p style={{ color: T.muted }} className="mt-1 text-sm">{selected.address || selected.city}</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  {statusLabel(selected.status)}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <Phone size={17} className="text-violet-700" />
                  <span className="text-sm font-semibold text-slate-700">{selected.phone || "Telephone a completer"}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <Clock3 size={17} className="text-violet-700" />
                  <span className="text-sm font-semibold text-slate-700">{selected.opening_hours || "Horaires a completer"}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <Package size={17} className="text-violet-700" />
                  <span className="text-sm font-semibold text-slate-700">Capacite {selected.storage_capacity || 0} colis</span>
                </div>
              </div>

              <div className="mt-5">
                <p style={{ color: T.muted }} className="text-xs font-bold uppercase tracking-[0.12em]">Zones couvertes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selected.zones.length ? selected.zones : [selected.city || "Zone a definir"]).map((zone) => (
                    <span key={zone} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                      {zone}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: T.muted }} className="text-sm">Aucun point relais a afficher.</p>
          )}
        </aside>
      </section>
    </div>
  );
}
