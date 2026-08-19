import { useEffect } from "react";
import type { ReactNode } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mapAttribution, mapTileUrl } from "@/config/maps";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export type MapPosition = [number, number];

const CITY_COORDS: Record<string, MapPosition> = {
  yaounde: [3.8667, 11.5167],
  douala: [4.0511, 9.7679],
  bafoussam: [5.4781, 10.414],
  bamenda: [5.9597, 10.1459],
  garoua: [9.3, 13.399],
  maroua: [10.59, 14.32],
  ngaoundere: [7.3236, 13.5836],
  bertoua: [4.5753, 13.684],
  ebolowa: [2.9, 11.15],
  kribi: [2.9395, 9.9088],
  limbe: [4.0167, 9.2],
  buea: [4.154, 9.241],
  edea: [3.7947, 10.1297],
  kumba: [4.6333, 9.45],
  nkongsamba: [4.9504, 9.9404],
};

const NEIGHBORHOOD_COORDS: Record<string, MapPosition> = {
  mokolo: [3.872, 11.513],
  biyemassi: [3.835, 11.482],
  bastos: [3.89, 11.505],
  mvan: [3.818, 11.505],
  essos: [3.866, 11.535],
  nlongkak: [3.878, 11.518],
  melen: [3.858, 11.497],
  "ngoa ekelle": [3.855, 11.49],
  nkolbisson: [3.86, 11.465],
  ekounou: [3.848, 11.54],
  emana: [3.905, 11.525],
  nkoldongo: [3.865, 11.528],
  "mvog ada": [3.856, 11.516],
  tsinga: [3.882, 11.506],
  obili: [3.862, 11.494],
  mendong: [3.84, 11.475],
  nkomo: [3.83, 11.515],
  soa: [3.97, 11.59],
  nsimeyong: [3.84, 11.495],
  etoudi: [3.895, 11.515],
  omnisport: [3.885, 11.538],
  mimboman: [3.873, 11.545],
  awae: [3.835, 11.528],
  efoulan: [3.848, 11.488],
  akwa: [4.048, 9.705],
  bonanjo: [4.042, 9.692],
  deido: [4.058, 9.713],
  bonapriso: [4.035, 9.695],
  makepe: [4.067, 9.738],
  bepanda: [4.06, 9.735],
  bonaberi: [4.07, 9.68],
  ndokotti: [4.05, 9.725],
  pk8: [4.035, 9.755],
  logbessou: [4.08, 9.75],
};

export interface OpenStreetMapMarker {
  id: string | number;
  position: MapPosition;
  title: string;
  subtitle?: string;
  color?: string;
  iconHtml?: string;
  popup?: ReactNode;
}

function normalizePlace(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveCameroonPosition(...parts: Array<string | null | undefined>): MapPosition {
  const text = normalizePlace(parts.filter(Boolean).join(" "));
  for (const [name, coords] of Object.entries(NEIGHBORHOOD_COORDS)) {
    if (text.includes(name)) return coords;
  }
  for (const [name, coords] of Object.entries(CITY_COORDS)) {
    if (text.includes(name)) return coords;
  }
  return CITY_COORDS.yaounde;
}

export function offsetPosition(position: MapPosition, seed: number, amplitude = 0.012): MapPosition {
  return [
    position[0] + Math.sin(seed * 1.91) * amplitude,
    position[1] + Math.cos(seed * 2.17) * amplitude,
  ];
}

function markerIcon(marker: OpenStreetMapMarker) {
  const color = marker.color || "#F47920";
  return L.divIcon({
    html: `
      <div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;width:42px;height:42px;border-radius:50%;background:${color}22"></div>
        <div style="position:relative;width:34px;height:34px;border-radius:50%;border:3px solid #fff;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(15,23,42,.28);color:#fff">
          ${marker.iconHtml || `<span style="font-size:13px;font-weight:900">${marker.title.slice(0, 1).toUpperCase()}</span>`}
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    className: "",
  });
}

function FitBounds({ positions }: { positions: MapPosition[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 13);
      return;
    }
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [46, 46], maxZoom: 14 });
    }
  }, [map, positions]);
  return null;
}

export function OpenStreetMap({
  markers,
  height = 520,
  center = [4.5, 11.3],
  zoom = 6,
  className = "",
}: {
  markers: OpenStreetMapMarker[];
  height?: number;
  center?: MapPosition;
  zoom?: number;
  className?: string;
}) {
  const positions = markers.map((marker) => marker.position);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <MapContainer center={center} zoom={zoom} style={{ height, width: "100%" }} scrollWheelZoom>
        <TileLayer url={mapTileUrl} attribution={mapAttribution} />
        {positions.length > 0 ? <FitBounds positions={positions} /> : null}
        {markers.map((marker) => (
          <Marker key={marker.id} position={marker.position} icon={markerIcon(marker)}>
            <Popup maxWidth={300}>
              {marker.popup || (
                <div className="min-w-[180px]">
                  <div className="text-sm font-black text-slate-950">{marker.title}</div>
                  {marker.subtitle ? <div className="mt-1 text-xs font-semibold text-slate-600">{marker.subtitle}</div> : null}
                </div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
