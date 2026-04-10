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

const vendorIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const deliveryIcon = new L.DivIcon({
  html: '<div style="background:#F47920;width:32px;height:32px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,.3)">🚚</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: "",
});

const customerIcon = new L.DivIcon({
  html: '<div style="background:#16A34A;width:32px;height:32px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,.3)">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: "",
});

interface TrackingMapProps {
  vendorLocation?: [number, number];
  customerLocation?: [number, number];
  currentLocation?: [number, number];
  className?: string;
}

// Default locations in Cameroon
const YAOUNDE: [number, number] = [3.8480, 11.5021];
const DOUALA: [number, number] = [4.0511, 9.7679];

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
  vendorLocation = YAOUNDE,
  customerLocation = DOUALA,
  currentLocation,
  className = "",
}: TrackingMapProps) {
  const deliveryPos = currentLocation || [
    (vendorLocation[0] + customerLocation[0]) / 2 + 0.02,
    (vendorLocation[1] + customerLocation[1]) / 2 - 0.01,
  ] as [number, number];

  const routePoints: [number, number][] = [vendorLocation, deliveryPos, customerLocation];
  const allPoints = [vendorLocation, deliveryPos, customerLocation];

  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>
      <MapContainer
        center={deliveryPos}
        zoom={8}
        style={{ height: "280px", width: "100%" }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={allPoints} />

        <Marker position={vendorLocation} icon={vendorIcon}>
          <Popup>🏪 Boutique vendeur</Popup>
        </Marker>

        <Marker position={deliveryPos} icon={deliveryIcon}>
          <Popup>🚚 Position actuelle du livreur</Popup>
        </Marker>

        <Marker position={customerLocation} icon={customerIcon}>
          <Popup>📍 Adresse de livraison</Popup>
        </Marker>

        <Polyline
          positions={routePoints}
          pathOptions={{ color: "#F47920", weight: 4, dashArray: "10 6", opacity: 0.8 }}
        />
      </MapContainer>
    </div>
  );
}
