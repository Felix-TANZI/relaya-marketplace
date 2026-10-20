// frontend/src/hooks/useGeoLocation.ts
/**
 * Hook pour gérer la géolocalisation de l'utilisateur.
 * Demande automatiquement la permission et stocke les coordonnées.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCachedGeo, requestGeolocation, type GeoCoords } from '@/services/geolocation';

interface UseGeoLocationResult {
  coords: GeoCoords | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => void;
}

export function useGeoLocation(): UseGeoLocationResult {
  const { t } = useTranslation();
  // Coordonnées mises en cache lues une seule fois à l'initialisation : ça évite
  // un setState synchrone dans l'effet pour ce cas déjà résolu au premier rendu.
  const [coords, setCoords] = useState<GeoCoords | null>(() => getCachedGeo());
  const [loading, setLoading] = useState(() => getCachedGeo() === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getCachedGeo()) return;

    // Sinon, demander silencieusement la géolocalisation
    let requestError: unknown;
    try {
      requestGeolocation();
    } catch (err) {
      requestError = err;
    }

    // Attendre un peu que la géolocalisation se mette à jour (ou signaler
    // l'échec) — toujours différé, jamais de setState synchrone dans l'effet.
    const timer = setTimeout(() => {
      if (requestError !== undefined) {
        setError(requestError instanceof Error ? requestError.message : t('misc1_geolocation.error_generic'));
        setLoading(false);
        return;
      }
      const updated = getCachedGeo();
      setCoords(updated);
      setLoading(false);
    }, requestError !== undefined ? 0 : 2000);

    return () => clearTimeout(timer);
  }, [t]);

  const requestPermission = () => {
    if (!navigator.geolocation) {
      setError(t('misc1_geolocation.error_unavailable'));
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords: GeoCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: Date.now(),
        };
        setCoords(newCoords);
        setLoading(false);
      },
      (err) => {
        const messages: { [key: string]: string } = {
          'PERMISSION_DENIED': t('misc1_geolocation.error_permission_denied'),
          'POSITION_UNAVAILABLE': t('misc1_geolocation.error_position_unavailable'),
          'TIMEOUT': t('misc1_geolocation.error_timeout'),
        };
        setError(messages[err.code] || t('misc1_geolocation.error_generic'));
        setLoading(false);
      }
    );
  };

  return { coords, loading, error, requestPermission };
}
