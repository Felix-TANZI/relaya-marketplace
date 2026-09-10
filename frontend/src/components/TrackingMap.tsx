import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocodingApiUrl, isGoogleMapsEnabled, mapAttribution, mapTileUrl } from "@/config/maps";
import { GoogleMap } from "@/components/maps/GoogleMap";
import { googleGeocodeAddress } from "@/lib/googleMaps";

// Fix default marker icons in React
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const vendorIcon = new L.DivIcon({
  html: `
    <div style="width:38px;height:38px;border-radius:50%;border:3px solid rgba(255,255,255,.95);background:linear-gradient(135deg,#0F172A,#1F2937);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(0,0,0,.28)">
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 10h16l-1.2-4.2A2.5 2.5 0 0 0 16.4 4H7.6a2.5 2.5 0 0 0-2.4 1.8L4 10Z" fill="#F47920"/>
        <path d="M5 10v9h14v-9" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
        <path d="M9 19v-5h6v5" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
        <path d="M3 10h18" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  className: "",
});

const deliveryIcon = new L.DivIcon({
  html: `
    <div style="width:38px;height:38px;border-radius:50%;border:3px solid rgba(255,255,255,.95);background:linear-gradient(135deg,#F47920,#C85E14);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(0,0,0,.28)">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 17h6.2l2.7-6H19" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 10h3.8l1.2 1" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
        <path d="M5.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="#FFFFFF"/>
        <path d="M8 14.5 10.5 9H8" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
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
  "jouvence":     [3.8300, 11.4820],
  "odza":         [3.7986, 11.5291],
  "nkolndongo":   [3.8650, 11.5280],
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
const GEOCODE_CACHE_KEY = "belivay_geocode_cache_v1";

type GeocodeCache = Record<string, [number, number]>;

function readGeocodeCache(): GeocodeCache {
  try {
    const raw = window.localStorage.getItem(GEOCODE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeGeocodeCache(query: string, coords: [number, number]) {
  try {
    const cache = readGeocodeCache();
    cache[query] = coords;
    window.localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache best-effort: la carte doit continuer a fonctionner sans localStorage.
  }
}

/** Resolve an address string to GPS coordinates. Returns null when nothing but the generic city center matches. */
function findNeighborhoodMatch(address?: string | null, city?: string | null, district?: string | null): [number, number] | null {
  const search = `${district || ""} ${address || ""} ${city || ""}`.toLowerCase();
  for (const [name, coords] of Object.entries(NEIGHBORHOODS)) {
    if (name !== "yaounde" && name !== "douala" && name !== "centre ville" && search.includes(name)) return coords;
  }
  return null;
}

function resolveAddress(address?: string | null, city?: string | null, district?: string | null): [number, number] {
  if (!address && !city) return DEFAULT_DEST;
  const known = findNeighborhoodMatch(address, city, district);
  if (known) return known;
  const search = `${address || ""} ${city || ""}`.toLowerCase();
  // If city is Douala, return Douala center
  if (search.includes("douala")) return NEIGHBORHOODS["douala"];
  // Default to Yaoundé center
  return NEIGHBORHOODS["yaounde"];
}

/** Sous-ensemble du resultat de l'assistant IA de precision d'adresse utile a la carte. */
export interface AddressPrecisionHint {
  district?: string;
  landmarks?: string[];
  driverHint?: string;
}

function buildGeocodeQuery(address?: string | null, city?: string | null) {
  const parts = [address, city, "Cameroon"]
    .map((part) => (part || "").trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.join(", ") : "";
}

/**
 * Les adresses camerounaises informelles ("Odza Petit Doubi", "Jouvence,
 * royaume des temoins") contiennent des reperes locaux que le geocodeur
 * public ne connait pas et echouent donc a resoudre. Le quartier englobant
 * qu'un assistant IA en extrait (ex. "Jouvence", "Odza") est lui generalement
 * connu — on tente cette requete plus courte en priorite avant l'adresse
 * complete.
 */
function buildDistrictGeocodeQuery(precision: AddressPrecisionHint | null | undefined, city?: string | null) {
  const district = precision?.district?.trim();
  if (!district) return "";
  const parts = [district, city, "Cameroon"].map((part) => (part || "").trim()).filter(Boolean);
  return parts.length > 1 ? parts.join(", ") : "";
}

async function geocodeAddress(query: string, signal: AbortSignal): Promise<[number, number] | null> {
  const cache = readGeocodeCache();
  if (cache[query]) return cache[query];

  if (isGoogleMapsEnabled) {
    if (signal.aborted) return null;
    const coords = await googleGeocodeAddress(query);
    if (coords && !signal.aborted) writeGeocodeCache(query, coords);
    return signal.aborted ? null : coords;
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
    countrycodes: "cm",
    q: query,
  });
  const response = await fetch(`${geocodingApiUrl}/search?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json", "Accept-Language": "fr" },
  });
  if (!response.ok) return null;

  const results = await response.json() as Array<{ lat?: string; lon?: string }>;
  const first = results[0];
  if (!first?.lat || !first.lon) return null;

  const coords: [number, number] = [Number(first.lat), Number(first.lon)];
  if (!Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return null;
  writeGeocodeCache(query, coords);
  return coords;
}

interface TrackingMapProps {
  /** Override vendor/origin location */
  vendorLocation?: [number, number];
  /** Override customer destination */
  customerLocation?: [number, number];
  /** Override current delivery truck position */
  currentLocation?: [number, number];
  /** Ordered GPS trail captured for the current shipment */
  locationHistory?: [number, number][];
  /** Client address string (e.g. "Biyemassi, Yaoundé") — used to resolve GPS */
  destinationAddress?: string | null;
  /** Client city */
  destinationCity?: string | null;
  /** Analyse IA de l'adresse (district/reperes) — ameliore la resolution des adresses informelles */
  destinationPrecision?: AddressPrecisionHint | Record<string, unknown> | null;
  /** Vendor label */
  originLabel?: string;
  /** Destination label */
  destinationLabel?: string;
  className?: string;
  height?: number;
}

function distanceInMeters(from: [number, number], to: [number, number]) {
  const earthRadius = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(to[0] - from[0]);
  const longitudeDelta = toRadians(to[1] - from[1]);
  const fromLatitude = toRadians(from[0]);
  const toLatitude = toRadians(to[0]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
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
  locationHistory = [],
  destinationAddress,
  destinationCity,
  destinationPrecision,
  originLabel = "Mokolo — Centre BelivaY",
  destinationLabel,
  className = "",
  height = 280,
}: TrackingMapProps) {
  // Origin: always Mokolo by default
  const origin = vendorLocation || MOKOLO;

  const precisionHint = destinationPrecision as AddressPrecisionHint | null | undefined;
  const knownNeighborhood = useMemo(
    () => customerLocation ? origin : findNeighborhoodMatch(destinationAddress, destinationCity, precisionHint?.district),
    [customerLocation, origin, destinationAddress, destinationCity, precisionHint?.district],
  );
  // Destination: resolve from address string, or use explicit prop, or default
  const fallbackDestination = customerLocation || resolveAddress(destinationAddress, destinationCity, precisionHint?.district);

  // Les adresses informelles ("Odza Petit Doubi") echouent au geocodage complet ;
  // le quartier englobant extrait par l'IA ("Odza") reussit generalement seul.
  const districtGeocodeQuery = useMemo(
    () => customerLocation ? "" : buildDistrictGeocodeQuery(precisionHint, destinationCity),
    [customerLocation, precisionHint, destinationCity],
  );
  const fullAddressGeocodeQuery = useMemo(
    () => customerLocation ? "" : buildGeocodeQuery(destinationAddress, destinationCity),
    [customerLocation, destinationAddress, destinationCity],
  );
  const [geocodedDestination, setGeocodedDestination] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!districtGeocodeQuery && !fullAddressGeocodeQuery) {
      setGeocodedDestination(null);
      return;
    }

    const controller = new AbortController();
    (async () => {
      const districtResult = districtGeocodeQuery
        ? await geocodeAddress(districtGeocodeQuery, controller.signal).catch(() => null)
        : null;
      if (controller.signal.aborted) return;
      if (districtResult) {
        setGeocodedDestination(districtResult);
        return;
      }
      const fullResult = fullAddressGeocodeQuery
        ? await geocodeAddress(fullAddressGeocodeQuery, controller.signal).catch(() => null)
        : null;
      if (!controller.signal.aborted) setGeocodedDestination(fullResult);
    })();

    return () => controller.abort();
  }, [districtGeocodeQuery, fullAddressGeocodeQuery]);

  const destination = geocodedDestination || fallbackDestination;
  // Ni geocodage ni quartier connu : le pin affiche est un centre-ville generique, pas une vraie position.
  const isApproximate = !customerLocation && !geocodedDestination && !knownNeighborhood;

  // Keep the map centered between both endpoints until the courier shares GPS.
  const deliveryPos = useMemo(() => {
    if (currentLocation) return currentLocation;
    return [
      (origin[0] + destination[0]) / 2,
      (origin[1] + destination[1]) / 2,
    ] as [number, number];
  }, [currentLocation, destination, origin]);

  const trailPoints = locationHistory.length
    ? locationHistory
    : currentLocation
      ? [currentLocation]
      : [];
  const routePoints: [number, number][] = [origin, ...trailPoints, destination];
  const remainingDistance = currentLocation
    ? distanceInMeters(currentLocation, destination)
    : null;
  // A district-only address (for example "Mvan, Yaounde") is not precise enough
  // for a door-level geofence, so use a one-kilometre arrival zone.
  const isNearDestination = remainingDistance !== null && remainingDistance <= 1000;

  // Build destination label from address
  const destLabel = destinationLabel || destinationAddress || "Adresse de livraison";

  if (isGoogleMapsEnabled) {
    return (
      <div className={`relative z-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>
        <GoogleMap
          markers={[
            { id: "vendor", position: origin, title: originLabel, color: "#0F172A" },
            ...(currentLocation
              ? [{ id: "delivery", position: currentLocation, title: "Position GPS actuelle du livreur", color: "#F47920" }]
              : []),
            { id: "customer", position: destination, title: destLabel, color: "#16A34A" },
          ]}
          center={deliveryPos}
          zoom={13}
          height={height}
          scrollWheelZoom={false}
          className="rounded-none"
          polylines={[
            { positions: routePoints, color: "#F47920", weight: 4, opacity: 0.8 },
            ...(trailPoints.length > 1
              ? [{ positions: trailPoints, color: "#0284C7", weight: 6, opacity: 0.9 }]
              : []),
          ]}
        />
        {isApproximate ? (
          <div className="absolute top-3 left-3 z-[500] rounded-full bg-amber-500/95 px-3 py-2 text-xs font-black text-white shadow-lg backdrop-blur">
            Position approximative — repère non localisé précisément
          </div>
        ) : null}
        {remainingDistance !== null ? (
          <div
            className={`absolute bottom-3 left-3 z-[500] rounded-full px-3 py-2 text-xs font-black shadow-lg backdrop-blur ${
              isNearDestination
                ? "bg-emerald-600/95 text-white"
                : "bg-white/95 text-gray-800 dark:bg-gray-900/95 dark:text-white"
            }`}
          >
            {isNearDestination
              ? "Livreur arrivé dans la zone de destination"
              : `Distance restante : ${remainingDistance < 1000
                  ? `${Math.round(remainingDistance)} m`
                  : `${(remainingDistance / 1000).toFixed(1)} km`}`}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`relative z-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>
      <MapContainer
        center={deliveryPos}
        zoom={13}
        style={{ height: `${height}px`, width: "100%" }}
        scrollWheelZoom={false}
        attributionControl
        fadeAnimation={false}
        zoomAnimation={false}
      >
        <TileLayer url={mapTileUrl} attribution={mapAttribution} keepBuffer={4} />
        <FitBounds points={routePoints} />

        <Marker position={origin} icon={vendorIcon}>
          <Popup>{originLabel}</Popup>
        </Marker>

        {currentLocation ? (
          <Marker position={currentLocation} icon={deliveryIcon}>
            <Popup>Position GPS actuelle du livreur</Popup>
          </Marker>
        ) : null}

        <Marker position={destination} icon={customerIcon}>
          <Popup>{destLabel}</Popup>
        </Marker>

        <Polyline
          positions={routePoints}
          pathOptions={{ color: "#F47920", weight: 4, dashArray: "10 6", opacity: 0.8 }}
        />
        {trailPoints.length > 1 ? (
          <Polyline
            positions={trailPoints}
            pathOptions={{ color: "#0284C7", weight: 6, opacity: 0.9 }}
          />
        ) : null}
      </MapContainer>
      {isApproximate ? (
        <div className="absolute top-3 left-3 z-[500] rounded-full bg-amber-500/95 px-3 py-2 text-xs font-black text-white shadow-lg backdrop-blur">
          Position approximative — repère non localisé précisément
        </div>
      ) : null}
      {remainingDistance !== null ? (
        <div
          className={`absolute bottom-3 left-3 z-[500] rounded-full px-3 py-2 text-xs font-black shadow-lg backdrop-blur ${
            isNearDestination
              ? "bg-emerald-600/95 text-white"
              : "bg-white/95 text-gray-800 dark:bg-gray-900/95 dark:text-white"
          }`}
        >
          {isNearDestination
            ? "Livreur arrivé dans la zone de destination"
            : `Distance restante : ${remainingDistance < 1000
                ? `${Math.round(remainingDistance)} m`
                : `${(remainingDistance / 1000).toFixed(1)} km`}`}
        </div>
      ) : null}
    </div>
  );
}
