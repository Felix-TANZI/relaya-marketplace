// frontend/src/features/vendors/SellerShopPage.tsx
// Page "Ma Boutique" — espace vendeur BelivaY.
// Dépendances : npm install react-leaflet leaflet @types/leaflet qrcode @types/qrcode

import {
  useEffect, useState, useRef, useCallback,
  useMemo, memo,
} from 'react';
import {
  Store, Upload, Save, RefreshCw, Copy, Check, QrCode,
  Download, Phone, Mail, MapPin, Plus, Pencil, Trash2,
  Globe, Lock, AlertTriangle, X, Paperclip, Send,
  ChevronRight, Navigation, Loader2, CheckCircle2,
  XCircle, Target,
} from 'lucide-react';
import {
  MapContainer, TileLayer, Marker, Popup,
  useMapEvents, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { vendorsApi } from '@/services/api/vendors';
import { http } from '@/services/api/http';
import { useToast } from '@/context/ToastContext';
import * as QRCode from 'qrcode';

// ─── Fix icônes Leaflet (Vite / Webpack) ─────────────────────────────────────
interface LeafletIconDefault extends L.Icon.Default { _getIconUrl?: unknown; }
delete (L.Icon.Default.prototype as LeafletIconDefault)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Thème ────────────────────────────────────────────────────────────────────
const T = {
  orange:  '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.12)',
  cream:   '#F5F0E8', creamAlt: '#EDE7DC',
  white:   '#FFFFFF', border:   '#E8E2D9',
  text:    '#1A1209', muted:    '#7C6E5A', mutedL: '#B8A898',
  green:   '#16A34A', greenL:   'rgba(22,163,74,0.10)', greenB: 'rgba(22,163,74,0.22)',
  red:     '#DC2626', redL:     'rgba(220,38,38,0.10)',
  amber:   '#D97706', amberL:   'rgba(217,119,6,0.10)',
  blue:    '#2563EB', blueL:    'rgba(37,99,235,0.10)',
  sidebar: '#1C1209',
};

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32', SILVER: '#7C8490', GOLD: '#C8A000', DIAMOND: '#2563EB',
};
const TIER_LABELS: Record<string, string> = {
  BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or', DIAMOND: 'Diamant',
};

const inp: React.CSSProperties = {
  background: T.cream, border: `1px solid ${T.border}`, color: T.text,
  borderRadius: 12, padding: '10px 14px', fontSize: 13.5, outline: 'none', width: '100%',
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ShopProfile {
  shop_slug: string; business_name: string; business_description: string;
  city: string; address: string; whatsapp_phone: string;
  is_online: boolean; photo_url: string | null; banner_url: string | null;
  certification_tier: string; active_plan_code: string; public_url: string | null;
}

interface Location {
  id?: number; name: string; address: string; phone: string; email: string;
  representative_name: string; representative_phone: string;
  latitude: string; longitude: string; is_active: boolean;
}

interface DocType { id: number; name: string; description: string; }

interface ModRequest {
  id: number; fields_requested: Record<string, string>; reason: string;
  status: string; admin_note: string;
  required_docs: DocType[];
  documents: { id: number; document_type_name: string | null; file_url: string; description: string }[];
  created_at: string;
}

const SENSITIVE_FIELD_LABELS: Record<string, string> = {
  business_name:        'Nom de la boutique',
  business_description: 'Description',
  city:                 'Ville',
  address:              'Adresse',
};

const EMPTY_LOCATION: Location = {
  name: '', address: '', phone: '', email: '',
  representative_name: '', representative_phone: '',
  latitude: '', longitude: '', is_active: true,
};

// ─── MARQUEUR PERSONNALISÉ BelivaY ────────────────────────────────────────────
// Pin orange avec l'initiale de la boutique.
// Le CSS inline est obligatoire car Leaflet injecte le HTML dans le DOM directement.

function createLocationIcon(initial: string, size: 'normal' | 'large' = 'normal') {
  const s = size === 'large' ? 48 : 40;
  const fs = size === 'large' ? 18 : 15;
  const tri = size === 'large' ? 10 : 8;
  const letter = (initial || '?').charAt(0).toUpperCase();

  return L.divIcon({
    className: '',
    iconSize:   [s, s + tri + 4],
    iconAnchor: [s / 2, s + tri + 4],
    popupAnchor:[0, -(s + tri + 4)],
    html: `
      <div style="
        display: flex; flex-direction: column;
        align-items: center; gap: 0;
        filter: drop-shadow(0 4px 12px rgba(244,121,32,0.45));
      ">
        <div style="
          width: ${s}px; height: ${s}px;
          background: linear-gradient(145deg, #F47920, #D4640E);
          border-radius: 50%;
          border: 3px solid #ffffff;
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 900; font-size: ${fs}px;
          font-family: Poppins, sans-serif; line-height: 1;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
        ">${letter}</div>
        <div style="
          width: 0; height: 0;
          border-left: ${tri - 2}px solid transparent;
          border-right: ${tri - 2}px solid transparent;
          border-top: ${tri}px solid #D4640E;
          margin-top: -1px;
        "></div>
        <div style="
          width: 4px; height: 4px;
          background: rgba(244,121,32,0.25);
          border-radius: 50%;
        "></div>
      </div>
    `,
  });
}

// ─── COMPOSANTS CARTE LEAFLET ─────────────────────────────────────────────────

// Écoute les clics sur la carte et appelle onMapClick
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// Re-centre la carte programmatiquement sur une position
function RecenterMap({ position, zoom = 15 }: { position: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, zoom, { animate: true, duration: 0.6 });
    }
  }, [map, position, zoom]);
  return null;
}

// Ajuste le zoom pour inclure tous les marqueurs (pour la carte de la page principale)
function FitBoundsController({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 15, { animate: true });
    } else if (positions.length > 1) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
    }
  }, [map, positions]);
  return null;
}

// Marqueur glissable avec callback sur dragend
const DraggableMarker = memo(function DraggableMarker({
  position, icon, onDragEnd, children,
}: {
  position: [number, number];
  icon: L.DivIcon;
  onDragEnd: (lat: number, lng: number) => void;
  children?: React.ReactNode;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(() => ({
    dragend() {
      const m = markerRef.current;
      if (m) {
        const { lat, lng } = m.getLatLng();
        onDragEnd(lat, lng);
      }
    },
  }), [onDragEnd]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      draggable
      eventHandlers={eventHandlers}
    >
      {children}
    </Marker>
  );
});

// ─── SERVICES GÉOCODAGE (Nominatim / OpenStreetMap) ──────────────────────────
// Gratuit, pas de clé API. User-Agent obligatoire selon les conditions d'utilisation.

const NOMINATIM_HEADERS = { 'User-Agent': 'BelivaY/1.0 (contact@belivay.com)' };

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res  = await fetch(url, { headers: NOMINATIM_HEADERS });
    const data = await res.json() as { lat: string; lon: string }[];
    if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    return null;
  } catch { return null; }
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res  = await fetch(url, { headers: NOMINATIM_HEADERS });
    const data = await res.json() as { display_name?: string };
    return data.display_name || null;
  } catch { return null; }
}

// ─── CARTE DES EMPLACEMENTS (page principale) ─────────────────────────────────

const ShopLocationsMap = memo(function ShopLocationsMap({
  locations, shopName,
}: {
  locations: Location[];
  shopName: string;
}) {
  const validLocs = locations.filter(l => l.latitude && l.longitude && l.is_active);
  if (validLocs.length === 0) return null;

  const positions: [number, number][] = validLocs.map(l => [
    parseFloat(l.latitude), parseFloat(l.longitude),
  ]);

  const defaultCenter: [number, number] = positions[0] || [3.848, 11.502];
  const icon = createLocationIcon(shopName, 'normal');

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(28,18,9,0.06)' }}>
      {/* En-tête */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.orangeB }}>
          <Globe size={15} style={{ color: T.orange }}/>
        </div>
        <div>
          <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            Emplacements sur la carte
          </p>
          <p className="text-[11.5px]" style={{ color: T.mutedL }}>
            {validLocs.length} emplacement{validLocs.length > 1 ? 's' : ''} localisé{validLocs.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Carte */}
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: 300, width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBoundsController positions={positions}/>
        {validLocs.map((loc, i) => (
          <Marker key={loc.id ?? i} position={positions[i]} icon={icon}>
            <Popup>
              <div style={{ minWidth: 200, fontFamily: 'system-ui, sans-serif' }}>
                <p style={{ fontWeight: 800, fontSize: 13, color: T.text, marginBottom: 6 }}>
                  {loc.name}
                </p>
                <p style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>
                  📍 {loc.address}
                </p>
                {loc.phone && (
                  <p style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>
                    📞 {loc.phone}
                  </p>
                )}
                {loc.representative_name && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                    <p style={{ fontSize: 11, color: T.mutedL, marginBottom: 2 }}>Représentant</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                      {loc.representative_name}
                    </p>
                    {loc.representative_phone && (
                      <p style={{ fontSize: 12, color: T.muted }}>
                        {loc.representative_phone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
});

// ─── MODALE DEMANDE DE MODIFICATION ──────────────────────────────────────────

function ModRequestModal({
  profile, existingRequests, onClose, onSuccess,
}: {
  profile: ShopProfile;
  existingRequests: ModRequest[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [newValues,  setNewValues]           = useState<Record<string, string>>({});
  const [reason,     setReason]              = useState('');
  const [files,      setFiles]               = useState<File[]>([]);
  const [submitting, setSubmitting]          = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pendingReq = existingRequests.find(r =>
    ['PENDING','DOCS_REQUIRED','DOCS_UPLOADED'].includes(r.status)
  );

  const toggleField = (f: string) => {
    setSelectedFields(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const handleSubmit = async () => {
    if (!selectedFields.length) { showToast('Sélectionnez au moins un champ.', 'error'); return; }
    if (!reason.trim())         { showToast('La justification est requise.', 'error'); return; }
    const empty = selectedFields.filter(f => !newValues[f]?.trim());
    if (empty.length)           { showToast('Remplissez les nouvelles valeurs.', 'error'); return; }

    try {
      setSubmitting(true);
      const fields: Record<string, string> = {};
      selectedFields.forEach(f => { fields[f] = newValues[f]; });

      const form = new FormData();
      form.append('fields_requested', JSON.stringify(fields));
      form.append('reason', reason);
      files.forEach(f => form.append('files', f));

      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/vendors/mod-requests/create/', {
        method: 'POST', body: form,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur');

      showToast('Demande envoyée à BelivaY.', 'success');
      onSuccess();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(28,18,9,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full sm:max-w-lg max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: T.white }}>
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4"
          style={{ background: T.white, borderBottom: `1px solid ${T.border}` }}>
          <p className="font-black text-[15px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            <Lock size={14} className="inline mr-1.5 mb-0.5" style={{ color: T.orange }}/>
            Demander une modification
          </p>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.creamAlt }}>
            <X size={15} style={{ color: T.muted }}/>
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {pendingReq ? (
            <div className="rounded-xl p-4 space-y-2" style={{ background: T.amberL, border: `1px solid rgba(217,119,6,0.25)` }}>
              <p className="font-bold text-[13px] flex items-center gap-2" style={{ color: T.amber }}>
                <AlertTriangle size={13}/> Demande en cours — #{pendingReq.id}
              </p>
              <p className="text-[12px]" style={{ color: T.muted }}>
                Statut : <strong>{pendingReq.status}</strong>
                {pendingReq.status === 'DOCS_REQUIRED' && ' — Des documents vous sont demandés.'}
              </p>
              {pendingReq.admin_note && (
                <p className="text-[12px] font-semibold" style={{ color: T.text }}>
                  Note BelivaY : {pendingReq.admin_note}
                </p>
              )}
              {pendingReq.required_docs.length > 0 && (
                <div>
                  <p className="text-[11.5px] font-semibold mb-1" style={{ color: T.muted }}>Documents demandés :</p>
                  <ul className="space-y-0.5">
                    {pendingReq.required_docs.map(d => (
                      <li key={d.id} className="text-[12px]" style={{ color: T.text }}>• {d.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-xl p-4" style={{ background: T.blueL, border: `1px solid rgba(37,99,235,0.2)` }}>
                <p className="text-[12.5px] leading-relaxed" style={{ color: T.blue }}>
                  Ces informations sont liées à vos documents officiels et soumises à validation BelivaY selon la réglementation camerounaise.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[12.5px] font-semibold" style={{ color: T.text }}>Champs à modifier</p>
                {Object.entries(SENSITIVE_FIELD_LABELS).map(([field, label]) => (
                  <div key={field}>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={selectedFields.includes(field)}
                        onChange={() => toggleField(field)}
                        className="w-4 h-4 rounded" style={{ accentColor: T.orange }}/>
                      <span className="text-[13px] font-semibold" style={{ color: T.text }}>{label}</span>
                      <span className="text-[11.5px]" style={{ color: T.mutedL }}>
                        Actuel : {(profile as unknown as Record<string, string>)[field] || '—'}
                      </span>
                    </label>
                    {selectedFields.includes(field) && (
                      <div className="mt-2 ml-6">
                        <input value={newValues[field] || ''} placeholder={`Nouvelle valeur pour ${label}`}
                          onChange={e => setNewValues(prev => ({ ...prev, [field]: e.target.value }))}
                          style={{ ...inp, fontSize: 13 }}/>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
                  Justification <span style={{ color: T.red }}>*</span>
                </label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                  placeholder="Ex : Changement de dénomination sociale suite à enregistrement au RCCM…"
                  style={{ ...inp, resize: 'none' }}/>
              </div>

              <div>
                <p className="text-[12.5px] font-semibold mb-2" style={{ color: T.text }}>Pièces jointes (optionnel)</p>
                <input type="file" ref={fileRef} className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => { if (e.target.files) setFiles(Array.from(e.target.files)); }}/>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-semibold"
                  style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
                  <Paperclip size={13}/> Joindre des documents
                </button>
                {files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <span key={i} className="text-[11.5px] px-2.5 py-1 rounded-full"
                        style={{ background: T.greenL, color: T.green }}>
                        {f.name.slice(0, 25)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13.5px] text-white disabled:opacity-50"
                style={{ background: T.orange }}>
                {submitting
                  ? <><RefreshCw size={13} className="animate-spin"/>Envoi…</>
                  : <><Send size={13}/>Envoyer la demande</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODALE EMPLACEMENT (refonte complète) ────────────────────────────────────

type GeoStatus = 'idle' | 'loading' | 'found' | 'not_found';

// Composant déclaré en dehors de LocationModal pour éviter la recréation à chaque render.
function GeoStatusIcon({ status }: { status: GeoStatus }) {
  if (status === 'loading')   return <Loader2 size={14} className="animate-spin" style={{ color: T.amber }}/>;
  if (status === 'found')     return <CheckCircle2 size={14} style={{ color: T.green }}/>;
  if (status === 'not_found') return <XCircle size={14} style={{ color: T.red }}/>;
  return null;
}

function LocationModal({
  initial, shopName, onClose, onSave,
}: {
  initial: Location | null;
  shopName: string;
  onClose: () => void;
  onSave: (data: Location) => void;
}) {
  const [form, setForm]     = useState<Location>(initial || EMPTY_LOCATION);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(
    initial?.latitude && initial?.longitude ? 'found' : 'idle'
  );
  const [mapPosition, setMapPosition] = useState<[number, number] | null>(
    initial?.latitude && initial?.longitude
      ? [parseFloat(initial.latitude), parseFloat(initial.longitude)]
      : null
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const icon = useMemo(() => createLocationIcon(shopName, 'large'), [shopName]);

  const set = (k: keyof Location, v: string | boolean) =>
    setForm(p => ({ ...p, [k]: v }));

  // ── Auto-géocodage sur changement d'adresse (debounce 800ms) ──────────────
  // Tous les setState sont à l'intérieur du setTimeout pour éviter
  // les cascades de render synchrones dans l'effet (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const addr = form.address.trim();

    debounceRef.current = setTimeout(async () => {
      if (addr.length < 6) {
        setGeoStatus('idle');
        return;
      }
      setGeoStatus('loading');
      const coords = await geocodeAddress(addr);
      if (coords) {
        setMapPosition(coords);
        setForm(p => ({ ...p, latitude: String(coords[0]), longitude: String(coords[1]) }));
        setGeoStatus('found');
      } else {
        setGeoStatus('not_found');
      }
    }, addr.length < 6 ? 50 : 800);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.address]);

  // ── Bouton "Localiser" (déclenche immédiatement) ───────────────────────────
  const handleLocalize = async () => {
    const addr = form.address.trim();
    if (!addr) return;
    setGeoStatus('loading');
    const coords = await geocodeAddress(addr);
    if (coords) {
      setMapPosition(coords);
      setForm(p => ({ ...p, latitude: String(coords[0]), longitude: String(coords[1]) }));
      setGeoStatus('found');
    } else {
      setGeoStatus('not_found');
    }
  };

  // ── Clic sur la carte → positionne le marqueur ───────────────────────────
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setMapPosition([lat, lng]);
    setForm(p => ({ ...p, latitude: String(lat.toFixed(6)), longitude: String(lng.toFixed(6)) }));
    setGeoStatus('found');
    // Géocodage inversé pour mettre à jour l'adresse
    const addr = await reverseGeocode(lat, lng);
    if (addr) {
      // On ne met à jour l'adresse que si elle est vide (ne pas écraser ce que l'utilisateur a tapé)
      setForm(p => ({ ...p, address: p.address || addr }));
    }
  }, []);

  // ── Fin de glissement du marqueur ────────────────────────────────────────
  const handleMarkerDragEnd = useCallback(async (lat: number, lng: number) => {
    setMapPosition([lat, lng]);
    setForm(p => ({ ...p, latitude: String(lat.toFixed(6)), longitude: String(lng.toFixed(6)) }));
    // Géocodage inversé → met à jour l'adresse
    const addr = await reverseGeocode(lat, lng);
    if (addr) setForm(p => ({ ...p, address: addr }));
  }, []);

  const canSave = form.name.trim() && form.address.trim();

  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(28,18,9,0.6)', backdropFilter: 'blur(6px)' }}>

      <div className="w-full sm:max-w-xl max-h-[calc(100vh-2rem)] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: T.white, boxShadow: '0 24px 60px rgba(28,18,9,0.3)' }}>

        {/* EN-TÊTE */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: T.orangeB }}>
              <MapPin size={16} style={{ color: T.orange }}/>
            </div>
            <div>
              <p className="font-black text-[15px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
                {initial?.id ? 'Modifier l\'emplacement' : 'Ajouter un emplacement'}
              </p>
              <p className="text-[11.5px]" style={{ color: T.mutedL }}>
                Les coordonnées GPS permettent l'affichage sur la carte.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ background: T.creamAlt }}>
            <X size={16} style={{ color: T.muted }}/>
          </button>
        </div>

        {/* CORPS — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── SECTION : INFORMATIONS ─────────────────────────────────────── */}
          <div className="space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.mutedL }}>
              Informations
            </p>

            {/* Nom */}
            <div>
              <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
                Nom de l'emplacement <span style={{ color: T.red }}>*</span>
              </label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Ex: Safara Mokolo" style={inp}/>
            </div>

            {/* Adresse avec bouton Localiser et indicateur */}
            <div>
              <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
                Adresse complète <span style={{ color: T.red }}>*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input value={form.address} onChange={e => set('address', e.target.value)}
                    placeholder="Marché Mokolo, Yaoundé, Cameroun"
                    style={{ ...inp, paddingRight: 36 }}/>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <GeoStatusIcon status={geoStatus}/>
                  </div>
                </div>
                <button type="button" onClick={handleLocalize} disabled={geoStatus === 'loading' || !form.address.trim()}
                  className="flex items-center gap-1.5 px-3.5 rounded-xl text-[12.5px] font-bold whitespace-nowrap transition-all hover:opacity-85 disabled:opacity-40"
                  style={{ background: T.orange, color: T.white }}>
                  {geoStatus === 'loading'
                    ? <Loader2 size={13} className="animate-spin"/>
                    : <Target size={13}/>}
                  Localiser
                </button>
              </div>
              {geoStatus === 'not_found' && (
                <p className="text-[11.5px] mt-1.5 flex items-center gap-1" style={{ color: T.red }}>
                  <XCircle size={12}/> Adresse introuvable. Cliquez sur la carte pour positionner manuellement.
                </p>
              )}
              {geoStatus === 'found' && (
                <p className="text-[11.5px] mt-1.5 flex items-center gap-1" style={{ color: T.green }}>
                  <CheckCircle2 size={12}/> Position trouvée — glissez le marqueur pour ajuster.
                </p>
              )}
            </div>

            {/* Téléphone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Téléphone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+237 6XX XXX XXX" style={inp}/>
              </div>
              <div>
                <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Email</label>
                <input value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="mokolo@boutique.cm" type="email" style={inp}/>
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <div style={{ height: 1, background: T.border }}/>

          {/* ── SECTION : REPRÉSENTANT ─────────────────────────────────────── */}
          <div className="space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.mutedL }}>
              Représentant sur place
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Nom</label>
                <input value={form.representative_name}
                  onChange={e => set('representative_name', e.target.value)}
                  placeholder="Jean Dupont" style={inp}/>
              </div>
              <div>
                <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Téléphone</label>
                <input value={form.representative_phone}
                  onChange={e => set('representative_phone', e.target.value)}
                  placeholder="+237 6XX XXX XXX" style={inp}/>
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <div style={{ height: 1, background: T.border }}/>

          {/* ── SECTION : CARTE ────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.mutedL }}>
                Position sur la carte
              </p>
              <p className="text-[11px]" style={{ color: T.mutedL }}>
                Optionnel
              </p>
            </div>

            {/* Instruction */}
            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: T.creamAlt }}>
              <Navigation size={14} style={{ color: T.orange, flexShrink: 0 }}/>
              <p className="text-[12px]" style={{ color: T.muted }}>
                {mapPosition
                  ? 'Glissez le marqueur pour ajuster précisément la position.'
                  : 'Cliquez sur la carte pour positionner votre emplacement.'}
              </p>
            </div>

            {/* Carte interactive */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${T.border}` }}>
              <MapContainer
                center={mapPosition || [3.848, 11.502]}
                zoom={mapPosition ? 15 : 12}
                style={{ height: 240, width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapClickHandler onMapClick={handleMapClick}/>
                <RecenterMap position={mapPosition}/>
                {mapPosition && (
                  <DraggableMarker
                    position={mapPosition}
                    icon={icon}
                    onDragEnd={handleMarkerDragEnd}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'system-ui', fontSize: 12 }}>
                        <p style={{ fontWeight: 700, marginBottom: 4 }}>{form.name || 'Emplacement'}</p>
                        <p style={{ color: T.muted }}>{form.address || 'Glissez pour ajuster'}</p>
                      </div>
                    </Popup>
                  </DraggableMarker>
                )}
              </MapContainer>
            </div>

            {/* Coordonnées — affichées en lecture et modifiables */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: T.muted }}>Latitude</label>
                <input value={form.latitude} placeholder="3.848490" type="number" step="any"
                  onChange={e => {
                    set('latitude', e.target.value);
                    if (e.target.value && form.longitude) {
                      setMapPosition([parseFloat(e.target.value), parseFloat(form.longitude)]);
                    }
                  }}
                  style={{ ...inp, fontSize: 12.5 }}/>
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: T.muted }}>Longitude</label>
                <input value={form.longitude} placeholder="11.502075" type="number" step="any"
                  onChange={e => {
                    set('longitude', e.target.value);
                    if (form.latitude && e.target.value) {
                      setMapPosition([parseFloat(form.latitude), parseFloat(e.target.value)]);
                    }
                  }}
                  style={{ ...inp, fontSize: 12.5 }}/>
              </div>
            </div>
            <p className="text-[11px]" style={{ color: T.mutedL }}>
              Coordonnées auto-remplies via la carte. Modifiables manuellement si besoin.
            </p>
          </div>
        </div>

        {/* PIED — bouton flottant */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${T.border}`, background: T.white }}>
          <button type="button" onClick={() => onSave(form)} disabled={!canSave}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[14px] text-white transition-all disabled:opacity-40"
            style={{ background: T.orange, boxShadow: canSave ? '0 4px 16px rgba(244,121,32,0.4)' : 'none' }}>
            <Check size={15}/>
            {initial?.id ? 'Enregistrer les modifications' : 'Ajouter cet emplacement'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function SellerShopPage() {
  const { showToast } = useToast();
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [shop,         setShop]         = useState<ShopProfile | null>(null);
  const [locations,    setLocations]    = useState<Location[]>([]);
  const [modRequests,  setModRequests]  = useState<ModRequest[]>([]);
  const [qrDataUrl,    setQrDataUrl]    = useState('');
  const [whatsapp,     setWhatsapp]     = useState('');
  const [isOnline,     setIsOnline]     = useState(true);
  const [showModModal, setShowModModal] = useState(false);
  const [locModal,     setLocModal]     = useState<{ open: boolean; data: Location | null }>({ open: false, data: null });

  const bannerRef = useRef<HTMLInputElement>(null);
  const photoRef  = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      // Appel principal — profil boutique
      const shopData = await http<ShopProfile>('/api/vendors/shop/');
      setShop(shopData);
      setWhatsapp(shopData.whatsapp_phone || '');
      setIsOnline(shopData.is_online !== false);

      // QR code — généré dès qu'on a le slug
      if (shopData.shop_slug) {
        const qrTarget = `https://belivay.com?ref=${shopData.shop_slug}`;
        try {
          const url = await QRCode.toDataURL(qrTarget, {
            width: 280, margin: 2,
            color: { dark: T.sidebar, light: T.white },
          });
          setQrDataUrl(url);
        } catch (e) { console.error('QR error:', e); }
      }

      // Appels secondaires — silencieux si erreur
      try { setLocations(await http<Location[]>('/api/vendors/locations/')); } catch { /* pas bloquant */ }
      try { setModRequests(await http<ModRequest[]>('/api/vendors/mod-requests/')); } catch { /* pas bloquant */ }
    } catch (err) {
      console.error('load error:', err);
      showToast('Erreur de chargement', 'error');
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await vendorsApi.updateShop({ whatsapp_phone: whatsapp, is_online: isOnline } as Parameters<typeof vendorsApi.updateShop>[0]);
      showToast('Boutique mise à jour', 'success');
      await load();
    } catch { showToast('Erreur lors de la sauvegarde', 'error'); }
    finally { setSaving(false); }
  };

  const handlePhoto = async (file: File) => {
    try {
      const res = await vendorsApi.uploadShopPhoto(file);
      setShop(p => p ? { ...p, photo_url: res.photo_url } : p);
      showToast('Photo mise à jour', 'success');
    } catch { showToast('Erreur upload photo', 'error'); }
  };

  const handleBanner = async (file: File) => {
    try {
      const res = await vendorsApi.uploadShopBanner(file);
      setShop(p => p ? { ...p, banner_url: res.banner_url } : p);
      showToast('Bannière mise à jour', 'success');
    } catch { showToast('Erreur upload bannière', 'error'); }
  };

  const handleCopy = () => {
    const url = shop?.public_url || `https://belivay.com?ref=${shop?.shop_slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    showToast('Lien copié', 'success');
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-belivay-${shop?.shop_slug || 'boutique'}.png`;
    a.click();
  };

  const handleSaveLocation = async (data: Location) => {
    try {
      const token   = localStorage.getItem('access_token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      // Le modèle Django accepte max 6 décimales (DecimalField max_digits=9, decimal_places=6).
      // Nominatim retourne parfois 10+ décimales — on tronque ici avant l'envoi.
      const roundCoord = (v: string) => {
        if (!v) return null;
        const n = parseFloat(v);
        return isNaN(n) ? null : parseFloat(n.toFixed(6));
      };

      const body = JSON.stringify({
        ...data,
        latitude:  roundCoord(data.latitude),
        longitude: roundCoord(data.longitude),
      });

      // http() utilise API_BASE_URL → pointe bien vers Django (localhost:8000)
      if (data.id) {
        await http(`/api/vendors/locations/${data.id}/update/`, { method: 'PATCH', headers, body });
        showToast('Emplacement mis à jour', 'success');
      } else {
        await http('/api/vendors/locations/create/', { method: 'POST', headers, body });
        showToast('Emplacement ajouté', 'success');
      }
      setLocModal({ open: false, data: null });
      await load();
    } catch (e) {
      console.error('handleSaveLocation error:', e);
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!window.confirm('Supprimer cet emplacement ?')) return;
    try {
      const token = localStorage.getItem('access_token');
      await http(`/api/vendors/locations/${id}/delete/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Emplacement supprimé', 'success');
      await load();
    } catch (e) {
      console.error('handleDeleteLocation error:', e);
      showToast('Erreur suppression', 'error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }}/>
    </div>
  );

  const tier  = shop?.certification_tier || 'BRONZE';
  const qrUrl = shop?.public_url || `https://belivay.com?ref=${shop?.shop_slug}`;
  const pendingModReq = modRequests.find(r => ['PENDING','DOCS_REQUIRED','DOCS_UPLOADED'].includes(r.status));

  return (
    <div className="space-y-5 pb-10 max-w-4xl mx-auto">

      {/* ── EN-TÊTE ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2 font-black text-[22px]"
            style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            <Store size={20} style={{ color: T.orange }}/> Ma Boutique
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>Configuration et présentation</p>
        </div>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: T.orange, boxShadow: '0 3px 10px rgba(244,121,32,0.35)' }}>
          {saving ? <><RefreshCw size={13} className="animate-spin"/>Enregistrement…</> : <><Save size={13}/>Enregistrer</>}
        </button>
      </div>

      {/* ── ALERTE DEMANDE EN COURS ───────────────────────────────────────── */}
      {pendingModReq && (
        <div className="rounded-2xl px-5 py-4 flex items-start gap-3"
          style={{ background: T.amberL, border: `1px solid rgba(217,119,6,0.25)` }}>
          <AlertTriangle size={16} style={{ color: T.amber, flexShrink: 0, marginTop: 2 }}/>
          <div>
            <p className="font-bold text-[13px]" style={{ color: T.amber }}>
              Demande de modification en cours — #{pendingModReq.id}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>
              Statut : <strong>{pendingModReq.status}</strong>
              {pendingModReq.status === 'DOCS_REQUIRED' && ' — L\'admin vous demande des documents supplémentaires.'}
            </p>
            {pendingModReq.admin_note && (
              <p className="text-[12px] mt-1 font-semibold" style={{ color: T.text }}>
                Note BelivaY : {pendingModReq.admin_note}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── BANNIÈRE ─────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ height: 160, background: `linear-gradient(135deg, ${T.sidebar}, #2A1C0E)`, border: `1px solid ${T.border}` }}>
        {shop?.banner_url && (
          <img src={shop.banner_url} alt="bannière" className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
        )}
        {!shop?.banner_url && (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Aucune bannière — cliquez pour en ajouter une</p>
          </div>
        )}
        <input type="file" ref={bannerRef} className="hidden" accept="image/*"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleBanner(f); e.target.value = ''; }}/>
        <button type="button" onClick={() => bannerRef.current?.click()}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white"
          style={{ background: 'rgba(28,18,9,0.65)', backdropFilter: 'blur(4px)' }}>
          <Upload size={12}/> Modifier la bannière
        </button>
      </div>

      {/* ── PROFIL ────────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-4 px-1">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl overflow-hidden"
            style={{ border: `3px solid ${T.orange}`, background: T.creamAlt }}>
            {shop?.photo_url ? (
              <img src={shop.photo_url} alt="photo boutique" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store size={28} style={{ color: T.mutedL }}/>
              </div>
            )}
          </div>
          <input type="file" ref={photoRef} className="hidden" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ''; }}/>
          <button type="button" onClick={() => photoRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white"
            style={{ background: T.orange, boxShadow: '0 2px 6px rgba(244,121,32,0.4)' }}>
            <Upload size={11}/>
          </button>
        </div>
        <div className="flex-1">
          <p className="font-black text-[18px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            {shop?.business_name || 'Ma Boutique'}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ background: `${TIER_COLORS[tier]}20`, color: TIER_COLORS[tier] }}>
              {TIER_LABELS[tier]}
            </span>
            <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: isOnline ? T.greenL : T.redL, color: isOnline ? T.green : T.red }}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <span className="text-[12px]" style={{ color: T.muted }}>
            {isOnline ? 'Active' : 'En pause'}
          </span>
          <button type="button" onClick={() => setIsOnline(!isOnline)}
            className="w-11 h-6 rounded-full transition-all relative" style={{ background: isOnline ? T.green : T.border }}>
            <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
              style={{ left: isOnline ? '24px' : '2px' }}/>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── INFOS OFFICIELLES ─────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: T.white, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2.5 px-5 py-4"
            style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(28,18,9,0.06)' }}>
              <Lock size={14} style={{ color: T.muted }}/>
            </div>
            <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              Informations officielles
            </p>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="rounded-xl p-3" style={{ background: T.blueL, border: `1px solid rgba(37,99,235,0.2)` }}>
              <p className="text-[12px]" style={{ color: T.blue }}>
                Ces informations correspondent à vos documents officiels. Toute modification est soumise à validation BelivaY.
              </p>
            </div>
            {Object.entries(SENSITIVE_FIELD_LABELS).map(([field, label]) => (
              <div key={field} className="rounded-xl px-4 py-3"
                style={{ background: T.creamAlt, border: `1px solid ${T.border}` }}>
                <p className="text-[11.5px] font-semibold mb-0.5" style={{ color: T.muted }}>{label}</p>
                <p className="text-[13px] font-semibold" style={{ color: T.text }}>
                  {(shop as unknown as Record<string, string>)?.[field] || '—'}
                </p>
              </div>
            ))}
            <button type="button" onClick={() => setShowModModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-80"
              style={{ background: T.orangeL, border: `1px solid ${T.orangeB}`, color: T.orange }}>
              <Pencil size={13}/> Demander une modification
              <ChevronRight size={13}/>
            </button>
          </div>
        </div>

        {/* ── CONTACT & QR ──────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Contact */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: T.white, border: `1px solid ${T.orange}` }}>
            <div className="flex items-center gap-2.5 px-5 py-4"
              style={{ background: T.orangeL, borderBottom: `1px solid ${T.orangeB}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: T.orangeB }}>
                <Phone size={14} style={{ color: T.orange }}/>
              </div>
              <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
                Contact & disponibilité
              </p>
            </div>
            <div className="px-5 py-5">
              <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
                Téléphone WhatsApp
              </label>
              <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="+237 6XX XXX XXX" style={inp}/>
              <p className="text-[11px] mt-1.5" style={{ color: T.mutedL }}>
                Affiché sur votre page publique BelivaY.
              </p>
            </div>
          </div>

          {/* QR Code */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: T.white, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2.5 px-5 py-4"
              style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: T.orangeB }}>
                <QrCode size={14} style={{ color: T.orange }}/>
              </div>
              <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
                QR Code BelivaY
              </p>
            </div>
            <div className="px-5 py-5">
              <p className="text-[12.5px] mb-4" style={{ color: T.muted }}>
                Affichez ce code dans votre boutique physique. Vos clients scannent et accèdent directement à BelivaY.
              </p>
              <div className="flex items-center gap-4">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code BelivaY" className="rounded-xl flex-shrink-0"
                    style={{ width: 110, height: 110, border: `2px solid ${T.border}` }}/>
                ) : (
                  <div className="w-28 h-28 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: T.creamAlt, border: `2px solid ${T.border}` }}>
                    <RefreshCw size={16} className="animate-spin" style={{ color: T.mutedL }}/>
                  </div>
                )}
                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: T.cream, border: `1px solid ${T.border}` }}>
                    <Globe size={12} style={{ color: T.orange }}/>
                    <span className="text-[11.5px] truncate" style={{ color: T.muted }}>{qrUrl}</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleCopy}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold flex-1"
                      style={{ background: copied ? T.greenL : T.cream, border: `1px solid ${copied ? T.green : T.border}`, color: copied ? T.green : T.muted }}>
                      {copied ? <><Check size={11}/>Copié</> : <><Copy size={11}/>Copier</>}
                    </button>
                    <button type="button" onClick={handleDownloadQR} disabled={!qrDataUrl}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold flex-1"
                      style={{ background: T.orangeL, border: `1px solid ${T.orangeB}`, color: T.orange }}>
                      <Download size={11}/>Télécharger
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ANNUAIRE DES EMPLACEMENTS (lecture seule — vue publique) ─────── */}
      {locations.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 6px rgba(28,18,9,0.04)' }}>

          {/* En-tête */}
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ background: T.orangeL, borderBottom: `1px solid ${T.orangeB}` }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: T.orangeB }}>
                <MapPin size={14} style={{ color: T.orange }}/>
              </div>
              <div>
                <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
                  Nos emplacements
                </p>
                <p className="text-[11.5px]" style={{ color: T.muted }}>
                  {locations.filter(l => l.is_active).length} emplacement{locations.filter(l => l.is_active).length > 1 ? 's' : ''} actif{locations.filter(l => l.is_active).length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Grille des emplacements */}
          <div className={`grid gap-0 divide-y`} style={{ borderColor: T.border }}>
            {locations.filter(l => l.is_active).map((loc, i) => (
              <div key={loc.id ?? i} className="px-5 py-5 flex items-start gap-4">

                {/* Badge initial */}
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${T.orange}, #D4640E)`,
                    boxShadow: '0 3px 10px rgba(244,121,32,0.3)',
                  }}>
                  <span className="font-black text-[16px] text-white" style={{ fontFamily: 'Poppins,sans-serif' }}>
                    {(loc.name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Nom */}
                  <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
                    {loc.name}
                  </p>

                  {/* Adresse */}
                  <p className="flex items-start gap-1.5 text-[12.5px] mt-1" style={{ color: T.muted }}>
                    <MapPin size={12} className="flex-shrink-0 mt-0.5" style={{ color: T.orange }}/>
                    {loc.address}
                  </p>

                  {/* Contacts emplacement */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2">
                    {loc.phone && (
                      <a href={`tel:${loc.phone}`}
                        className="flex items-center gap-1.5 text-[12px] font-semibold transition-all hover:opacity-70"
                        style={{ color: T.text }}>
                        <Phone size={11} style={{ color: T.orange }}/>
                        {loc.phone}
                      </a>
                    )}
                    {loc.email && (
                      <a href={`mailto:${loc.email}`}
                        className="flex items-center gap-1.5 text-[12px] font-semibold transition-all hover:opacity-70"
                        style={{ color: T.text }}>
                        <Mail size={11} style={{ color: T.orange }}/>
                        {loc.email}
                      </a>
                    )}
                  </div>

                  {/* Représentant */}
                  {loc.representative_name && (
                    <div className="mt-3 px-3 py-2.5 rounded-xl"
                      style={{ background: T.creamAlt }}>
                      <p className="text-[10.5px] font-bold uppercase tracking-wider mb-1"
                        style={{ color: T.mutedL }}>
                        Représentant
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[12.5px]" style={{ color: T.text }}>
                          {loc.representative_name}
                        </p>
                        {loc.representative_phone && (
                          <a href={`tel:${loc.representative_phone}`}
                            className="flex items-center gap-1.5 text-[12px] font-bold"
                            style={{ color: T.orange }}>
                            <Phone size={11}/>
                            {loc.representative_phone}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Indicateur GPS */}
                  {loc.latitude && loc.longitude && (
                    <p className="flex items-center gap-1 mt-2 text-[11px]" style={{ color: T.green }}>
                      <MapPin size={10}/>
                      Visible sur la carte
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EMPLACEMENTS PHYSIQUES ────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: T.white, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2.5 px-5 py-4"
          style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: T.orangeB }}>
            <MapPin size={14} style={{ color: T.orange }}/>
          </div>
          <div className="flex-1">
            <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              Emplacements physiques
            </p>
            <p className="text-[11.5px]" style={{ color: T.mutedL }}>
              Tous les endroits où vos clients peuvent vous retrouver.
            </p>
          </div>
          <button type="button" onClick={() => setLocModal({ open: true, data: null })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-bold text-white"
            style={{ background: T.orange }}>
            <Plus size={13}/> Ajouter
          </button>
        </div>

        <div className="px-5 py-5 space-y-3">
          {locations.length === 0 ? (
            <button type="button" onClick={() => setLocModal({ open: true, data: null })}
              className="w-full flex flex-col items-center justify-center py-10 rounded-2xl transition-all hover:opacity-75"
              style={{ background: T.creamAlt, border: `2px dashed ${T.border}` }}>
              <MapPin size={28} className="mb-2" style={{ color: T.mutedL }}/>
              <p className="text-[13px] font-semibold" style={{ color: T.muted }}>Aucun emplacement</p>
              <p className="text-[12px] mt-0.5" style={{ color: T.mutedL }}>Cliquez pour en ajouter un</p>
            </button>
          ) : (
            locations.map(loc => (
              <div key={loc.id}
                className="flex items-start gap-3 p-4 rounded-2xl transition-all"
                style={{ background: T.cream, border: `1px solid ${T.border}` }}>
                {/* Icône */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.orangeB }}>
                  <span className="font-black text-[14px]" style={{ color: T.orange }}>
                    {(loc.name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[13.5px]" style={{ color: T.text }}>{loc.name}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>{loc.address}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11.5px]" style={{ color: T.mutedL }}>
                    {loc.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={10}/>{loc.phone}
                      </span>
                    )}
                    {loc.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={10}/>{loc.email}
                      </span>
                    )}
                    {loc.representative_name && (
                      <span>Repr. : {loc.representative_name}</span>
                    )}
                    {loc.latitude && loc.longitude && (
                      <span className="flex items-center gap-1" style={{ color: T.green }}>
                        <MapPin size={10}/>Localisé sur la carte
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <button type="button"
                    onClick={() => setLocModal({ open: true, data: loc })}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                    style={{ background: T.blueL, border: `1px solid rgba(37,99,235,0.2)` }}>
                    <Pencil size={13} style={{ color: T.blue }}/>
                  </button>
                  <button type="button" onClick={() => handleDeleteLocation(loc.id!)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                    style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.2)` }}>
                    <Trash2 size={13} style={{ color: T.red }}/>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── CARTE DES EMPLACEMENTS ────────────────────────────────────────── */}
      {locations.some(l => l.latitude && l.longitude) && (
        <ShopLocationsMap
          locations={locations}
          shopName={shop?.business_name || 'B'}
        />
      )}

      {/* ── MODALES ───────────────────────────────────────────────────────── */}
      {showModModal && shop && (
        <ModRequestModal
          profile={shop}
          existingRequests={modRequests}
          onClose={() => setShowModModal(false)}
          onSuccess={() => { setShowModModal(false); load(); }}
        />
      )}
      {locModal.open && (
        <LocationModal
          initial={locModal.data}
          shopName={shop?.business_name || 'B'}
          onClose={() => setLocModal({ open: false, data: null })}
          onSave={handleSaveLocation}
        />
      )}
    </div>
  );
}