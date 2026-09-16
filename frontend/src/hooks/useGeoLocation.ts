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
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Essayer d'obtenir les coordonnées mises en cache
    const cached = getCachedGeo();
    if (cached) {
      setCoords(cached);
      setLoading(false);
      return;
    }

    // Sinon, demander silencieusement la géolocalisation
    try {
      requestGeolocation();
      
      // Attendre un peu que la géolocalisation se mette à jour
      const timer = setTimeout(() => {
        const updated = getCachedGeo();
        setCoords(updated);
        setLoading(false);
      }, 2000);

      return () => clearTimeout(timer);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('misc1_geolocation.error_generic'));
      setLoading(false);
    }
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
