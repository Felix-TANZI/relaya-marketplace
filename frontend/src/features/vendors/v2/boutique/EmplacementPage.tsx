// frontend/src/features/vendors/v2/boutique/EmplacementPage.tsx
// Écran "Emplacement" — VD-11 fig.4.
//
// Réutilise ShopLocationPicker (déjà construit pour OUV-01/VD-03) plutôt que
// de refaire une carte Leaflet — voir ShopLocationPicker.tsx pour le détail
// (carte OpenStreetMap + bouton "Me localiser"). Bridge réel :
// GET/PATCH /api/vendors/locations/ (VendorLocation, voir boutique/api.ts) —
// même route déjà utilisée en lecture par BoutiquePage.tsx.
//
// Écart assumé : le mockup HTML affiche "Point posé le 7 mai" / "Vérifié le
// 9 mai", deux dates figées. VendorLocation n'a ni pinned_at ni verified_at
// (seulement created_at/updated_at) : on affiche donc les coordonnées et le
// statut "Principal" réels, jamais une date de vérification inventée.

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MapPin, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette, primaryGradient } from '../theme';
import ScreenHeader from '../compte/shared/ScreenHeader';
import Collapsible from '../compte/shared/Collapsible';
import ShopLocationPicker from '../ouverture/ShopLocationPicker';
import { getVendorLocations, updateVendorLocation, type VendorLocation } from './api';

export default function EmplacementPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const [location, setLocation] = useState<VendorLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [zoneLabel, setZoneLabel] = useState<string | null>(null);
  const [landmark, setLandmark] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const locations = await getVendorLocations();
      const main = locations.find((l) => l.is_main) ?? locations[0] ?? null;
      setLocation(main);
      // L'API renvoie latitude/longitude en chaîne (DecimalField DRF, ex.
      // "3.889500"), jamais en nombre malgré le type VendorLocation — d'où
      // la conversion explicite ici plutôt qu'une affectation directe.
      setLat(main?.latitude != null ? Number(main.latitude) : null);
      setLng(main?.longitude != null ? Number(main.longitude) : null);
      setLandmark(main?.description ?? '');
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    if (!location) return;
    setSaving(true);
    try {
      await updateVendorLocation(location.id, {
        description: landmark,
        latitude: lat != null ? String(lat) : undefined,
        longitude: lng != null ? String(lng) : undefined,
      });
      navigate(-1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Même mécanisme que le bouton "Me localiser" intégré à ShopLocationPicker
  // (navigator.geolocation) — exposé ici comme CTA séparé parce que le mockup
  // VD-11 distingue "reposer le point" (action volontaire, pleine largeur) du
  // petit bouton flottant sur la carte.
  const relocateFromShop = () => {
    if (!navigator.geolocation) {
      setError(t('sl13_boutique.location_error'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setError(null); },
      () => setError(t('sl13_boutique.location_error')),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl13_boutique.location_title')} subtitle={t('sl13_boutique.location_subtitle')} />

      {loading ? (
        <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.loading')}</p>
      ) : !location ? (
        <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl13_boutique.location_none')}</p>
      ) : (
        <>
          <ShopLocationPicker
            lat={lat}
            lng={lng}
            zoneLabel={zoneLabel}
            onChange={(nLat, nLng, zone) => { setLat(nLat); setLng(nLng); setZoneLabel(zone); }}
            p={p}
          />

          <div className="rounded-2xl p-4 mt-3 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <MapPin size={15} color={p.textMuted} />
              <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{location.name}</p>
              {location.is_main ? (
                <span className="flex items-center gap-1 rounded-full font-bold" style={{ fontSize: 10.5, padding: '3px 8px', background: `${p.green}1A`, color: p.green }}>
                  <CheckCircle2 size={11} />{t('sl13_boutique.location_verified_pill')}
                </span>
              ) : null}
            </div>
            <p style={{ fontSize: 12, color: p.textMuted }}>{location.address}</p>
            <p className="mt-1" style={{ fontSize: 12, color: p.textMuted }}>
              {lat !== null && lng !== null ? `${lat.toFixed(6)}° N · ${lng.toFixed(6)}° E` : t('sl13_boutique.location_no_coords')}
            </p>

            <div className="mt-3">
              <label className="block font-bold mb-1" style={{ fontSize: 12, color: p.text }}>{t('sl13_boutique.landmark_label')}</label>
              <input
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder={t('sl13_boutique.landmark_placeholder')}
                className="w-full rounded-xl"
                style={{ padding: '10px 12px', fontSize: 13, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text }}
              />
              <p className="mt-1" style={{ fontSize: 11, color: p.textMuted }}>{t('sl13_boutique.landmark_hint')}</p>
            </div>
          </div>

          <Collapsible title={t('sl11_compte.how_it_works')}>
            <p className="mb-2"><b style={{ color: p.text }}>{t('sl13_boutique.how_cost_strong')}</b> {t('sl13_boutique.how_cost_text')}</p>
            <p className="mb-2"><b style={{ color: p.text }}>{t('sl13_boutique.how_tie_strong')}</b> {t('sl13_boutique.how_tie_text')}</p>
            <p className="mb-2"><b style={{ color: p.text }}>{t('sl13_boutique.how_fail_strong')}</b> {t('sl13_boutique.how_fail_text')}</p>
            <p>{t('sl13_boutique.how_no_choice_text')}</p>
          </Collapsible>

          <button
            type="button"
            onClick={relocateFromShop}
            className="w-full flex items-center justify-center gap-2 rounded-xl font-bold mb-2"
            style={{ padding: '12px', border: `1.5px solid ${p.border}`, color: p.text, fontSize: 13 }}
          >
            <MapPin size={15} />
            {t('sl13_boutique.relocate_cta')}
          </button>
          <p className="mb-3" style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl13_boutique.relocate_hint')}</p>

          {error ? <p className="mb-2" style={{ fontSize: 12, color: p.red }}>{error}</p> : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl font-bold text-white disabled:opacity-60"
            style={{ padding: '13px', background: primaryGradient(p), fontSize: 14 }}
          >
            {saving ? t('sl11_compte.loading') : t('sl11_compte.save')}
          </button>
        </>
      )}
    </div>
  );
}
