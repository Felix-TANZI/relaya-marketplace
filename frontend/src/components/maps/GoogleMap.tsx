import { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps, toGooglePosition, type GoogleMapPosition } from "@/lib/googleMaps";

export interface GoogleMapMarker {
  id: string | number;
  position: GoogleMapPosition;
  title: string;
  subtitle?: string;
  color?: string;
}

interface DraggableGoogleMarker {
  position: GoogleMapPosition;
  title: string;
  subtitle?: string;
  color?: string;
  onDragEnd: (lat: number, lng: number) => void;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markerSvg(color: string) {
  const encoded = encodeURIComponent(`
    <svg width="42" height="42" viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
      <circle cx="21" cy="21" r="18" fill="${color}" stroke="white" stroke-width="4"/>
      <circle cx="21" cy="21" r="6" fill="white"/>
    </svg>
  `);
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

function popupHtml(title: string, subtitle?: string) {
  return `
    <div style="min-width:160px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:4px">${escapeHtml(title)}</div>
      ${subtitle ? `<div style="font-size:12px;color:#4B5563">${escapeHtml(subtitle)}</div>` : ""}
    </div>
  `;
}

export function GoogleMap({
  markers,
  height = 520,
  center = [4.5, 11.3],
  zoom = 6,
  className = "",
  scrollWheelZoom = true,
  polylines = [],
  onMapClick,
  draggableMarker,
  minZoom,
  mapTypeId = "roadmap",
  showMapTypeToggle = false,
}: {
  markers: GoogleMapMarker[];
  height?: number;
  center?: GoogleMapPosition;
  zoom?: number;
  className?: string;
  scrollWheelZoom?: boolean;
  polylines?: Array<{ positions: GoogleMapPosition[]; color: string; weight?: number; opacity?: number }>;
  onMapClick?: (lat: number, lng: number) => void;
  draggableMarker?: DraggableGoogleMarker | null;
  /** Empêche de dézoomer au-delà de ce niveau (17 ≈ vue d'environ 200-300 m). */
  minZoom?: number;
  /** "roadmap" (défaut) ou "satellite". */
  mapTypeId?: "roadmap" | "satellite";
  /** Affiche un bouton Plan/Satellite en overlay (coin haut-droit). */
  showMapTypeToggle?: boolean;
}) {
  const [currentMapType, setCurrentMapType] = useState<"roadmap" | "satellite">(mapTypeId);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown | null>(null);
  const [loadError, setLoadError] = useState(false);
  const markerKey = useMemo(
    () => JSON.stringify({ markers, polylines, draggableMarker, center, zoom }),
    [markers, polylines, draggableMarker, center, zoom],
  );

  useEffect(() => {
    let cancelled = false;
    const cleanup: Array<() => void> = [];

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const map = new maps.Map(containerRef.current, {
          center: toGooglePosition(center),
          zoom,
          minZoom,
          mapTypeId: currentMapType,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          scrollwheel: scrollWheelZoom,
          gestureHandling: scrollWheelZoom ? "auto" : "cooperative",
        });
        mapRef.current = map;

        if (onMapClick) {
          maps.event.addListener(map, "click", (event) => {
            const latLng = event.latLng;
            if (latLng) onMapClick(latLng.lat(), latLng.lng());
          });
        }

        const bounds = new maps.LatLngBounds();
        const allPositions: GoogleMapPosition[] = [];

        for (const marker of markers) {
          allPositions.push(marker.position);
          bounds.extend(toGooglePosition(marker.position));
          const gMarker = new maps.Marker({
            map,
            position: toGooglePosition(marker.position),
            title: marker.title,
            icon: {
              url: markerSvg(marker.color || "#F47920"),
              scaledSize: { width: 42, height: 42 },
              anchor: { x: 21, y: 21 },
            },
          });
          const infoWindow = new maps.InfoWindow({ content: popupHtml(marker.title, marker.subtitle) });
          gMarker.addListener("click", () => infoWindow.open({ anchor: gMarker, map }));
          cleanup.push(() => gMarker.setMap(null));
        }

        if (draggableMarker) {
          allPositions.push(draggableMarker.position);
          bounds.extend(toGooglePosition(draggableMarker.position));
          const gMarker = new maps.Marker({
            map,
            position: toGooglePosition(draggableMarker.position),
            title: draggableMarker.title,
            draggable: true,
            icon: {
              url: markerSvg(draggableMarker.color || "#F47920"),
              scaledSize: { width: 48, height: 48 },
              anchor: { x: 24, y: 24 },
            },
          });
          const infoWindow = new maps.InfoWindow({ content: popupHtml(draggableMarker.title, draggableMarker.subtitle) });
          gMarker.addListener("click", () => infoWindow.open({ anchor: gMarker, map }));
          gMarker.addListener("dragend", () => {
            const position = gMarker.getPosition();
            if (position) draggableMarker.onDragEnd(position.lat(), position.lng());
          });
          cleanup.push(() => gMarker.setMap(null));
        }

        for (const polyline of polylines) {
          const gPolyline = new maps.Polyline({
            map,
            path: polyline.positions.map(toGooglePosition),
            strokeColor: polyline.color,
            strokeOpacity: polyline.opacity ?? 0.85,
            strokeWeight: polyline.weight ?? 4,
          });
          cleanup.push(() => gPolyline.setMap(null));
          for (const position of polyline.positions) {
            allPositions.push(position);
            bounds.extend(toGooglePosition(position));
          }
        }

        if (allPositions.length === 1) {
          (map as { setCenter: (position: unknown) => void; setZoom: (zoom: number) => void }).setCenter(toGooglePosition(allPositions[0]));
          (map as { setZoom: (zoom: number) => void }).setZoom(Math.max(zoom, 14, minZoom ?? 0));
        } else if (allPositions.length > 1) {
          (map as { fitBounds: (bounds: unknown, padding?: number) => void }).fitBounds(bounds, 46);
          // fitBounds respecte normalement minZoom, mais au cas où (bug navigateur /
          // très peu de marqueurs très proches), on reclamp une fois le cadrage posé.
          if (minZoom != null) {
            maps.event.addListenerOnce(map, "idle", () => {
              const m = map as { getZoom: () => number | undefined; setZoom: (zoom: number) => void };
              const current = m.getZoom();
              if (current != null && current < minZoom) m.setZoom(minZoom);
            });
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      cleanup.forEach((fn) => fn());
    };
  }, [markerKey, onMapClick, scrollWheelZoom, minZoom]);

  useEffect(() => {
    (mapRef.current as { setMapTypeId?: (id: string) => void } | null)?.setMapTypeId?.(currentMapType);
  }, [currentMapType]);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div ref={containerRef} style={{ height, width: "100%" }} />
      {showMapTypeToggle ? (
        <div className="absolute top-3 right-3 z-10 flex overflow-hidden rounded-lg shadow-md" style={{ fontSize: 12 }}>
          <button
            type="button"
            onClick={() => setCurrentMapType("roadmap")}
            className="px-3 py-1.5 font-bold"
            style={{
              background: currentMapType === "roadmap" ? "#111827" : "#FFFFFF",
              color: currentMapType === "roadmap" ? "#FFFFFF" : "#111827",
            }}
          >
            Plan
          </button>
          <button
            type="button"
            onClick={() => setCurrentMapType("satellite")}
            className="px-3 py-1.5 font-bold"
            style={{
              background: currentMapType === "satellite" ? "#111827" : "#FFFFFF",
              color: currentMapType === "satellite" ? "#FFFFFF" : "#111827",
            }}
          >
            Satellite
          </button>
        </div>
      ) : null}
      {loadError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/95 px-4 text-center text-sm font-bold text-slate-700">
          Google Maps est indisponible. Verifiez la cle API et les APIs activees.
        </div>
      ) : null}
    </div>
  );
}
