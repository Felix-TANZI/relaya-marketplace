// frontend/src/services/geolocation.ts
// Service de géolocalisation — demande silencieuse, stocke en localStorage
// Appelé une seule fois au démarrage de l'app (dans main.tsx ou App.tsx)

const GEO_KEY     = 'belivay_geo';
const GEO_MAX_AGE = 10 * 60 * 1000; // 10 minutes avant re-demande

export interface GeoCoords {
  lat:       number;
  lng:       number;
  accuracy:  number; // mètres
  timestamp: number;
}

/**
 * Retourne les coords stockées si elles sont récentes, sinon null.
 */
export function getCachedGeo(): GeoCoords | null {
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (!raw) return null;
    const geo: GeoCoords = JSON.parse(raw);
    if (Date.now() - geo.timestamp > GEO_MAX_AGE) return null;
    return geo;
  } catch {
    return null;
  }
}

/**
 * Demande la position GPS et la stocke dans localStorage.
 * Silencieuse — n'affiche aucune UI, ne bloque pas.
 * À appeler une fois au démarrage (App.tsx useEffect).
 */
export function requestGeolocation(): void {
  if (!navigator.geolocation) return;

  // Si coords récentes → pas de re-demande
  if (getCachedGeo()) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords: GeoCoords = {
        lat:       pos.coords.latitude,
        lng:       pos.coords.longitude,
        accuracy:  pos.coords.accuracy,
        timestamp: Date.now(),
      };
      localStorage.setItem(GEO_KEY, JSON.stringify(coords));
    },
    () => {
      // Refus ou erreur — silencieux, on utilise la ville comme fallback
    },
    {
      enableHighAccuracy: true,
      timeout:            8000,
      maximumAge:         GEO_MAX_AGE,
    }
  );
}