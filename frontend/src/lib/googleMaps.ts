import { googleMapsApiKey } from "@/config/maps";

type GoogleLatLngLiteral = { lat: number; lng: number };
type GoogleMapMouseEvent = { latLng?: { lat: () => number; lng: () => number } | null };
type GoogleMarker = {
  setMap: (map: unknown | null) => void;
  addListener: (eventName: string, handler: (event: GoogleMapMouseEvent) => void) => void;
  getPosition: () => { lat: () => number; lng: () => number } | null;
};
type GoogleInfoWindow = { open: (options: { anchor: GoogleMarker; map: unknown }) => void };
type GooglePolyline = { setMap: (map: unknown | null) => void };
type GoogleMapsNamespace = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => unknown;
  Marker: new (options: Record<string, unknown>) => GoogleMarker;
  InfoWindow: new (options: { content: string }) => GoogleInfoWindow;
  LatLngBounds: new () => {
    extend: (position: GoogleLatLngLiteral) => void;
  };
  Polyline: new (options: Record<string, unknown>) => GooglePolyline;
  Geocoder: new () => {
    geocode: (
      request: Record<string, unknown>,
      callback: (
        results: Array<{ geometry?: { location?: { lat: () => number; lng: () => number } }; formatted_address?: string }> | null,
        status: string,
      ) => void,
    ) => void;
  };
  event: {
    addListener: (target: unknown, eventName: string, handler: (event: GoogleMapMouseEvent) => void) => void;
  };
};

declare global {
  interface Window {
    __belivayGoogleMapsPromise?: Promise<GoogleMapsNamespace>;
  }
}

export type GoogleMapPosition = [number, number];

function positionToLiteral(position: GoogleMapPosition): GoogleLatLngLiteral {
  return { lat: position[0], lng: position[1] };
}

function getGoogleMaps() {
  return (window.google as unknown as { maps?: GoogleMapsNamespace } | undefined)?.maps;
}

export function loadGoogleMaps(): Promise<GoogleMapsNamespace> {
  const existingMaps = getGoogleMaps();
  if (existingMaps) return Promise.resolve(existingMaps);
  if (window.__belivayGoogleMapsPromise) return window.__belivayGoogleMapsPromise;
  if (!googleMapsApiKey) return Promise.reject(new Error("Missing Google Maps API key"));

  window.__belivayGoogleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = `__belivayGoogleMapsReady_${Date.now()}`;
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: googleMapsApiKey,
      callback: callbackName,
      libraries: "places,marker",
      v: "weekly",
      language: "fr",
      region: "CM",
    });

    (window as unknown as Record<string, unknown>)[callbackName] = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      const maps = getGoogleMaps();
      if (maps) resolve(maps);
      else reject(new Error("Google Maps did not initialize"));
    };

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      reject(new Error("Unable to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return window.__belivayGoogleMapsPromise;
}

export async function googleGeocodeAddress(address: string): Promise<GoogleMapPosition | null> {
  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode(
      { address, componentRestrictions: { country: "CM" }, region: "CM" },
      (results, status) => {
        const location = status === "OK" ? results?.[0]?.geometry?.location : null;
        resolve(location ? [location.lat(), location.lng()] : null);
      },
    );
  });
}

export async function googleReverseGeocode(lat: number, lng: number): Promise<string | null> {
  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode({ location: { lat, lng }, region: "CM" }, (results, status) => {
      resolve(status === "OK" ? results?.[0]?.formatted_address || null : null);
    });
  });
}

export function toGooglePosition(position: GoogleMapPosition): GoogleLatLngLiteral {
  return positionToLiteral(position);
}
