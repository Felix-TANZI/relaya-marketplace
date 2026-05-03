import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons in React
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const vendorIcon = new L.DivIcon({
  html: `
    <div style="width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.95);background:linear-gradient(135deg,#1F2937,#111827);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(0,0,0,.28)">
      <div style="width:12px;height:12px;border-radius:4px;background:#F8FAFC;position:relative">
        <span style="position:absolute;left:-2px;right:-2px;top:-4px;height:4px;border-radius:4px 4px 0 0;background:#F47920"></span>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: "",
});

const deliveryIcon = new L.DivIcon({
  html: `
    <div style="width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.95);background:linear-gradient(135deg,#F47920,#C85E14);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(0,0,0,.28)">
      <div style="width:16px;height:10px;border-radius:3px;background:#FFF;position:relative">
        <span style="position:absolute;right:-5px;top:2px;width:5px;height:6px;border-radius:0 2px 2px 0;background:#FFE2CC"></span>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: "",
});

const customerIcon = new L.DivIcon({
  html: `
    <div style="width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.95);background:linear-gradient(135deg,#16A34A,#15803D);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(0,0,0,.28)">
      <div style="width:10px;height:10px;border-radius:50%;background:#FFF;box-shadow:0 0 0 4px rgba(255,255,255,.2)"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: "",
});

/* ═══════════════════════════════════════════
   GPS coordinates for Yaoundé & Douala neighborhoods
═══════════════════════════════════════════ */
const NEIGHBORHOODS: Record<string, [number, number]> = {
  // ── Yaoundé ──
  "mokolo":       [3.8720, 11.5130],
  "biyemassi":    [3.8350, 11.4820],
  "bastos":       [3.8900, 11.5050],
  "mvan":         [3.8180, 11.5050],
  "essos":        [3.8660, 11.5350],
  "nlongkak":     [3.8780, 11.5180],
  "melen":        [3.8580, 11.4970],
  "ngoa ekelle":  [3.8550, 11.4900],
  "nkolbisson":   [3.8600, 11.4650],
  "ekounou":      [3.8480, 11.5400],
  "emana":        [3.9050, 11.5250],
  "nkoldongo":    [3.8650, 11.5280],
  "mvog-ada":     [3.8560, 11.5160],
  "tsinga":       [3.8820, 11.5060],
  "obili":        [3.8620, 11.4940],
  "mendong":      [3.8400, 11.4750],
  "nkomo":        [3.8300, 11.5150],
  "soa":          [3.9700, 11.5900],
  "nsimeyong":    [3.8400, 11.4950],
  "etoudi":       [3.8950, 11.5150],
  "omnisport":    [3.8850, 11.5380],
  "mimboman":     [3.8730, 11.5450],
  "awae":         [3.8350, 11.5280],
  "efoulan":      [3.8480, 11.4880],
  "centre ville": [3.8667, 11.5167],
  "yaounde":      [3.8667, 11.5167],

  // ── Douala ──
  "akwa":         [4.0480, 9.7050],
  "bonanjo":      [4.0420, 9.6920],
  "deido":        [4.0580, 9.7130],
  "bonapriso":    [4.0350, 9.6950],
  "makepe":       [4.0670, 9.7380],
  "bepanda":      [4.0600, 9.7350],
  "bonaberi":     [4.0700, 9.6800],
  "ndokotti":     [4.0500, 9.7250],
  "pk8":          [4.0350, 9.7550],
  "logbessou":    [4.0800, 9.7500],
  "douala":       [4.0511, 9.7679],
};

// Default: Mokolo (centre commercial, point de départ par défaut)
const MOKOLO: [number, number] = NEIGHBORHOODS["mokolo"];
const DEFAULT_DEST: [number, number] = NEIGHBORHOODS["biyemassi"];

/** Resolve an address string to GPS coordinates */
function resolveAddress(address?: string | null, city?: string | null): [number, number] {
  if (!address && !city) return DEFAULT_DEST;
  const search = `${address || ""} ${city || ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Search for neighborhood match
  for (const [name, coords] of Object.entries(NEIGHBORHOODS)) {
    if (search.includes(name)) return coords;
  }
  // If city is Douala, return Douala center
  if (search.includes("douala")) return NEIGHBORHOODS["douala"];
  // Default to Yaoundé center
  return NEIGHBORHOODS["yaounde"];
}

interface TrackingMapProps {
  /** Override vendor/origin location */
  vendorLocation?: [number, number];
  /** Override customer destination */
  customerLocation?: [number, number];
  /** Override current delivery truck position */
  currentLocation?: [number, number];
  /** Client address string (e.g. "Biyemassi, Yaoundé") — used to resolve GPS */
  destinationAddress?: string | null;
  /** Client city */
  destinationCity?: string | null;
  /** Vendor label */
  originLabel?: string;
  /** Destination label */
  destinationLabel?: string;
  className?: string;
  height?: number;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

export default function TrackingMap({
  vendorLocation,
  customerLocation,
  currentLocation,
  destinationAddress,
  destinationCity,
  originLabel = "Mokolo — Centre BelivaY",
  destinationLabel,
  className = "",
  height = 280,
}: TrackingMapProps) {
  // Origin: always Mokolo by default
  const origin = vendorLocation || MOKOLO;

  // Destination: resolve from address string, or use explicit prop, or default
  const destination = customerLocation || resolveAddress(destinationAddress, destinationCity);

  // Delivery truck: midway between origin and destination
  const deliveryPos = currentLocation || [
    (origin[0] + destination[0]) / 2 + (Math.random() * 0.01 - 0.005),
    (origin[1] + destination[1]) / 2 + (Math.random() * 0.01 - 0.005),
  ] as [number, number];

  const routePoints: [number, number][] = [origin, deliveryPos, destination];

  // Build destination label from address
  const destLabel = destinationLabel || destinationAddress || "Adresse de livraison";

  return (
    <div className={`relative z-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>
      <MapContainer
        center={deliveryPos}
        zoom={13}
        style={{ height: `${height}px`, width: "100%" }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={[origin, deliveryPos, destination]} />

        <Marker position={origin} icon={vendorIcon}>
          <Popup>{originLabel}</Popup>
        </Marker>

        <Marker position={deliveryPos} icon={deliveryIcon}>
          <Popup>Position actuelle du livreur</Popup>
        </Marker>

        <Marker position={destination} icon={customerIcon}>
          <Popup>{destLabel}</Popup>
        </Marker>

        <Polyline
          positions={routePoints}
          pathOptions={{ color: "#F47920", weight: 4, dashArray: "10 6", opacity: 0.8 }}
        />
      </MapContainer>
    </div>
  );
}
