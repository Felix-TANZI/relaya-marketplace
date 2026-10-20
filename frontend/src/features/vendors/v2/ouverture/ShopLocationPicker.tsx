// frontend/src/features/vendors/v2/ouverture/ShopLocationPicker.tsx
// Point de la boutique sur la carte OpenStreetMap + « Me localiser »
// (VD-D04.A08, OUV-01). Widget dédié (plutôt que components/maps/OpenStreetMap,
// pensé pour l'affichage de plusieurs marqueurs non déplaçables) : ici il faut
// un point unique posé au clic ou par géolocalisation, avec zone en aperçu.

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import { mapAttribution, mapTileUrl } from '@/config/maps';
import { primaryGradient, type VendorPalette } from '../theme';
import { previewZoneLabel } from './api';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const YAOUNDE: [number, number] = [3.8667, 11.5167];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export interface ShopLocationPickerProps {
  lat: number | null;
  lng: number | null;
  zoneLabel: string | null;
  onChange: (lat: number, lng: number, zoneLabel: string | null) => void;
  p: VendorPalette;
}

export default function ShopLocationPicker({ lat, lng, zoneLabel, onChange, p }: ShopLocationPickerProps) {
  const { t } = useTranslation();
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(false);
  const position: [number, number] = lat !== null && lng !== null ? [lat, lng] : YAOUNDE;

  const applyPoint = useCallback(async (nextLat: number, nextLng: number) => {
    onChange(nextLat, nextLng, null);
    const zone = await previewZoneLabel(nextLat, nextLng);
    onChange(nextLat, nextLng, zone);
  }, [onChange]);

  const locate = () => {
    if (!navigator.geolocation) {
      setLocateError(true);
      return;
    }
    setLocating(true);
    setLocateError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); void applyPoint(pos.coords.latitude, pos.coords.longitude); },
      () => { setLocating(false); setLocateError(true); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  useEffect(() => {
    // Aucune position saisie au premier rendu : tenter une géolocalisation
    // silencieuse pour épargner le clic à la majorité des vendeurs.
    if (lat === null && lng === null) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl" style={{ border: `1px solid ${p.border}` }}>
        <MapContainer center={position} zoom={lat !== null ? 15 : 12} style={{ height: 220, width: '100%' }} scrollWheelZoom={false}>
          <TileLayer url={mapTileUrl} attribution={mapAttribution} />
          <ClickHandler onPick={(nLat, nLng) => void applyPoint(nLat, nLng)} />
          {lat !== null && lng !== null ? <Marker position={[lat, lng]} /> : null}
        </MapContainer>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full font-bold text-white disabled:opacity-70"
          style={{ padding: '9px 14px', fontSize: 12, background: primaryGradient(p), boxShadow: '0 8px 20px rgba(0,0,0,0.25)', zIndex: 1000 }}
        >
          <LocateFixed size={14} />
          {locating ? t('sl9_ouverture.locating') : t('sl9_ouverture.locate_me')}
        </button>
      </div>
      <p className="mt-2" style={{ fontSize: 12, color: lat !== null ? p.textMuted : p.amber, fontWeight: lat !== null ? 400 : 700 }}>
        {lat !== null && lng !== null
          ? (zoneLabel ? `${t('sl9_ouverture.zone_preview_prefix')} ${zoneLabel}` : t('sl9_ouverture.zone_computing'))
          : t('sl9_ouverture.pin_required')}
      </p>
      {locateError ? (
        <p className="mt-1" style={{ fontSize: 11.5, color: p.red }}>{t('sl9_ouverture.locate_error')}</p>
      ) : null}
    </div>
  );
}
