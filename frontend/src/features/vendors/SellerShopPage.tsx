// frontend/src/features/vendors/SellerShopPage.tsx
// Page "Ma Boutique" — espace vendeur BelivaY.

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Store, Upload, Save, RefreshCw,
  Copy, Check, QrCode, Download, Phone, Mail, MapPin,
  Plus, Pencil, Trash2, Globe, Lock, AlertTriangle,
  X, Paperclip, Send, ChevronRight,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { vendorsApi } from '@/services/api/vendors';
import { http } from '@/services/api/http';
import { useToast } from '@/context/ToastContext';
import * as QRCode from 'qrcode';

// Fix icônes Leaflet avec Vite/Webpack
interface LeafletDefaultIconPrototype extends L.Icon.Default {
  _getIconUrl?: unknown;
}
delete (L.Icon.Default.prototype as LeafletDefaultIconPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const T = {
  orange: '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.12)',
  cream: '#F5F0E8', creamAlt: '#EDE7DC',
  white: '#FFFFFF', border: '#E8E2D9',
  text: '#1A1209', muted: '#7C6E5A', mutedL: '#B8A898',
  green: '#16A34A', greenL: 'rgba(22,163,74,0.10)', greenB: 'rgba(22,163,74,0.22)',
  red: '#DC2626', redL: 'rgba(220,38,38,0.10)',
  amber: '#D97706', amberL: 'rgba(217,119,6,0.10)',
  blue: '#2563EB', blueL: 'rgba(37,99,235,0.10)',
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

// ─── Interfaces locales ───────────────────────────────────────────────────────
interface ShopProfile {
  shop_slug: string; business_name: string; business_description: string;
  city: string; address: string; whatsapp_phone: string;
  is_online: boolean; photo_url: string | null; banner_url: string | null;
  certification_tier: string; active_plan_code: string; public_url: string | null;
}
type SensitiveField = keyof Pick<ShopProfile, 'business_name' | 'business_description' | 'city' | 'address'>;
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

const SENSITIVE_FIELD_LABELS: Record<SensitiveField, string> = {
  business_name:        'Nom de la boutique',
  business_description: 'Description',
  city:                 'Ville',
  address:              'Adresse',
};
const SENSITIVE_FIELD_ENTRIES = Object.entries(SENSITIVE_FIELD_LABELS) as [SensitiveField, string][];

const EMPTY_LOCATION: Location = {
  name: '', address: '', phone: '', email: '',
  representative_name: '', representative_phone: '',
  latitude: '', longitude: '', is_active: true,
};

const LOCATION_TEXT_FIELDS = [
  { key: 'name',                 label: 'Nom',                   placeholder: 'Ex: Safara Mokolo' },
  { key: 'address',              label: 'Adresse complÃ¨te',       placeholder: 'Quartier Mokolo, YaoundÃ©' },
  { key: 'phone',                label: 'TÃ©lÃ©phone emplacement',  placeholder: '+237 6XX XXX XXX' },
  { key: 'email',                label: 'Email emplacement',      placeholder: 'mokolo@boutique.cm' },
  { key: 'representative_name',  label: 'Nom du reprÃ©sentant',   placeholder: 'Jean Dupont' },
  { key: 'representative_phone', label: 'TÃ©l. reprÃ©sentant',     placeholder: '+237 6XX XXX XXX' },
] satisfies { key: keyof Pick<Location, 'name' | 'address' | 'phone' | 'email' | 'representative_name' | 'representative_phone'>; label: string; placeholder: string }[];

const LOCATION_COORD_FIELDS = [
  { key: 'latitude',  label: 'Latitude',  placeholder: '3.848490' },
  { key: 'longitude', label: 'Longitude', placeholder: '11.502075' },
] satisfies { key: keyof Pick<Location, 'latitude' | 'longitude'>; label: string; placeholder: string }[];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erreur';
}

// ─── Composants ───────────────────────────────────────────────────────────────

function Section({ title, icon, children, accent }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.white, border: `1px solid ${accent ? T.orange : T.border}`, boxShadow: '0 1px 6px rgba(28,18,9,0.05)' }}>
      <div className="flex items-center gap-2.5 px-5 py-4"
        style={{ background: accent ? T.orangeL : T.cream, borderBottom: `1px solid ${accent ? T.orangeB : T.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: accent ? T.orangeB : 'rgba(28,18,9,0.06)' }}>
          <span style={{ color: accent ? T.orange : T.muted }}>{icon}</span>
        </div>
        <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>{title}</p>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

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
    if (!reason.trim()) { showToast('La justification est requise.', 'error'); return; }
    const empty = selectedFields.filter(f => !newValues[f]?.trim());
    if (empty.length) { showToast('Remplissez les nouvelles valeurs pour tous les champs sélectionnés.', 'error'); return; }

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

      showToast('Demande de modification envoyée à BelivaY.', 'success');
      onSuccess();
    } catch (e: unknown) { showToast(getErrorMessage(e), 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(28,18,9,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full sm:max-w-lg max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: T.white }}>
        <div className="sticky top-0 flex items-center justify-between px-5 py-4"
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
          {/* Demande en cours */}
          {pendingReq && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: T.amberL, border: `1px solid rgba(217,119,6,0.25)` }}>
              <p className="font-bold text-[13px] flex items-center gap-2" style={{ color: T.amber }}>
                <AlertTriangle size={13}/> Demande en cours — #{pendingReq.id}
              </p>
              <p className="text-[12px]" style={{ color: T.muted }}>
                Statut : <strong>{pendingReq.status}</strong>
                {pendingReq.status === 'DOCS_REQUIRED' && ' — L\'admin vous demande des documents.'}
              </p>
              {pendingReq.admin_note && (
                <p className="text-[12px]" style={{ color: T.text }}>
                  Note admin : {pendingReq.admin_note}
                </p>
              )}
              {pendingReq.required_docs.length > 0 && (
                <div>
                  <p className="text-[11.5px] font-semibold mb-1" style={{ color: T.muted }}>Documents demandés :</p>
                  <ul className="space-y-0.5">
                    {pendingReq.required_docs.map(d => (
                      <li key={d.id} className="text-[12px]" style={{ color: T.text }}>• {d.name} — {d.description}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px]" style={{ color: T.mutedL }}>
                Vous ne pouvez pas faire une nouvelle demande tant que celle-ci est en cours.
              </p>
            </div>
          )}

          {!pendingReq && (
            <>
              {/* Info légale */}
              <div className="rounded-xl p-4" style={{ background: T.blueL, border: `1px solid rgba(37,99,235,0.2)` }}>
                <p className="text-[12.5px] leading-relaxed" style={{ color: T.blue }}>
                  Ces informations sont liées à vos documents officiels (RCCM, CNI, etc.) et sont soumises à validation par l'équipe BelivaY selon la réglementation camerounaise.
                </p>
              </div>

              {/* Champs à modifier */}
              <div>
                <p className="text-[12.5px] font-semibold mb-3" style={{ color: T.text }}>
                  Champ(s) à modifier
                </p>
                <div className="space-y-3">
                  {SENSITIVE_FIELD_ENTRIES.map(([field, label]) => (
                    <div key={field}>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={selectedFields.includes(field)}
                          onChange={() => toggleField(field)}
                          className="w-4 h-4 rounded" style={{ accentColor: T.orange }}/>
                        <span className="text-[13px] font-semibold" style={{ color: T.text }}>{label}</span>
                        <span className="text-[11.5px]" style={{ color: T.mutedL }}>
                          Actuel : {profile[field] || '—'}
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
              </div>

              {/* Justification */}
              <div>
                <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
                  Justification <span style={{ color: T.red }}>*</span>
                </label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                  placeholder="Ex : Changement de dénomination sociale suite à enregistrement au RCCM…"
                  style={{ ...inp, resize: 'none' }}/>
              </div>

              {/* Pièces jointes */}
              <div>
                <p className="text-[12.5px] font-semibold mb-2" style={{ color: T.text }}>
                  Pièces jointes (optionnel)
                </p>
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
                <p className="text-[11px] mt-1.5" style={{ color: T.mutedL }}>
                  PDF, JPG, PNG. L'admin pourra également vous demander des documents complémentaires.
                </p>
              </div>

              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13.5px] text-white disabled:opacity-50"
                style={{ background: T.orange }}>
                {submitting ? <><RefreshCw size={13} className="animate-spin"/>Envoi…</> : <><Send size={13}/>Envoyer la demande</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODALE EMPLACEMENT ───────────────────────────────────────────────────────

function LocationModal({
  initial, onClose, onSave,
}: {
  initial: Location | null; onClose: () => void; onSave: (data: Location) => void;
}) {
  const [form, setForm] = useState<Location>(initial || EMPTY_LOCATION);
  const set = (k: keyof Location, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(28,18,9,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full sm:max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: T.white }}>
        <div className="sticky top-0 flex items-center justify-between px-5 py-4"
          style={{ background: T.white, borderBottom: `1px solid ${T.border}` }}>
          <p className="font-black text-[15px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            {initial?.id ? 'Modifier l\'emplacement' : 'Ajouter un emplacement'}
          </p>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.creamAlt }}>
            <X size={15} style={{ color: T.muted }}/>
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {LOCATION_TEXT_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-[12.5px] font-semibold mb-1 block" style={{ color: T.text }}>{label}</label>
              <input value={form[key] || ''} placeholder={placeholder}
                onChange={e => set(key, e.target.value)}
                style={inp}/>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            {LOCATION_COORD_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[12.5px] font-semibold mb-1 block" style={{ color: T.text }}>{label}</label>
                <input value={form[key] || ''} placeholder={placeholder} type="number" step="any"
                  onChange={e => set(key, e.target.value)}
                  style={inp}/>
              </div>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: T.mutedL }}>
            Coordonnées GPS. Pour trouver les coordonnées : ouvrez Google Maps, faites un clic droit sur l'emplacement → les coordonnées apparaissent.
          </p>

          <button type="button" onClick={() => onSave(form)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13.5px] text-white"
            style={{ background: T.orange }}>
            <Check size={14}/> {initial?.id ? 'Enregistrer' : 'Ajouter l\'emplacement'}
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
      const [shopData, locsData, modsData] = await Promise.all([
        http<ShopProfile>('/api/vendors/shop/'),
        http<Location[]>('/api/vendors/locations/'),
        http<ModRequest[]>('/api/vendors/mod-requests/'),
      ]);

      setShop(shopData);
      setLocations(locsData);
      setModRequests(modsData);
      setWhatsapp(shopData.whatsapp_phone || '');
      setIsOnline(shopData.is_online !== false);

      if (shopData.public_url || shopData.shop_slug) {
        const qrTarget = shopData.public_url || `https://belivay.com?ref=${shopData.shop_slug}`;
        const url = await QRCode.toDataURL(qrTarget, {
          width: 280, margin: 2,
          color: { dark: T.sidebar, light: T.white },
        });
        setQrDataUrl(url);
      }
    } catch { showToast('Erreur de chargement', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await vendorsApi.updateShop({ whatsapp_phone: whatsapp, is_online: isOnline });
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
      const token = localStorage.getItem('access_token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const body = JSON.stringify({
        ...data,
        latitude:  data.latitude  || null,
        longitude: data.longitude || null,
      });
      if (data.id) {
        await fetch(`/api/vendors/locations/${data.id}/update/`, { method: 'PATCH', headers, body });
        showToast('Emplacement mis à jour', 'success');
      } else {
        await fetch('/api/vendors/locations/create/', { method: 'POST', headers, body });
        showToast('Emplacement ajouté', 'success');
      }
      setLocModal({ open: false, data: null });
      await load();
    } catch { showToast('Erreur lors de la sauvegarde', 'error'); }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!window.confirm('Supprimer cet emplacement ?')) return;
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/vendors/locations/${id}/delete/`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Emplacement supprimé', 'success');
      await load();
    } catch { showToast('Erreur suppression', 'error'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }}/>
    </div>
  );

  const tier    = shop?.certification_tier || 'BRONZE';
  const qrUrl   = shop?.public_url || `https://belivay.com?ref=${shop?.shop_slug}`;
  const locWithCoords = locations.filter(l => l.latitude && l.longitude);
  const mapCenter: [number, number] = locWithCoords.length > 0
    ? [parseFloat(String(locWithCoords[0].latitude)), parseFloat(String(locWithCoords[0].longitude))]
    : [3.848, 11.502]; // Yaoundé par défaut

  const pendingModReq = modRequests.find(r => ['PENDING','DOCS_REQUIRED','DOCS_UPLOADED'].includes(r.status));

  return (
    <div className="space-y-5 pb-10 max-w-4xl mx-auto">

      {/* EN-TÊTE */}
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

      {/* NOTIFICATION DEMANDE EN COURS */}
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

      {/* BANNIÈRE */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ height: 160, background: `linear-gradient(135deg, ${T.sidebar}, #2A1C0E)`, border: `1px solid ${T.border}` }}>
        {shop?.banner_url && (
          <img src={shop.banner_url} alt="bannière" className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
        )}
        {!shop?.banner_url && (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Cliquez pour ajouter une bannière</p>
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

      {/* PHOTO + NOM + TIER */}
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
            {isOnline ? 'Boutique active' : 'Boutique en pause'}
          </span>
          <button type="button" onClick={() => setIsOnline(!isOnline)}
            className="w-11 h-6 rounded-full transition-all relative" style={{ background: isOnline ? T.green : T.border }}>
            <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
              style={{ left: isOnline ? '24px' : '2px' }}/>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* INFORMATIONS SENSIBLES — VERROUILLÉES */}
        <Section title="Informations officielles" icon={<Lock size={15}/>}>
          <div className="rounded-xl p-3" style={{ background: T.blueL, border: `1px solid rgba(37,99,235,0.2)` }}>
            <p className="text-[12px]" style={{ color: T.blue }}>
              Ces informations correspondent à vos documents officiels et ne peuvent être modifiées que via une demande validée par l'équipe BelivaY.
            </p>
          </div>
          {SENSITIVE_FIELD_ENTRIES.map(([field, label]) => (
            <div key={field} className="rounded-xl px-4 py-3"
              style={{ background: T.creamAlt, border: `1px solid ${T.border}` }}>
              <p className="text-[11.5px] font-semibold mb-0.5" style={{ color: T.muted }}>{label}</p>
              <p className="text-[13px] font-semibold" style={{ color: T.text }}>
                {shop?.[field] || '—'}
              </p>
            </div>
          ))}
          <button type="button" onClick={() => setShowModModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-80"
            style={{ background: T.orangeL, border: `1px solid ${T.orangeB}`, color: T.orange }}>
            <Pencil size={13}/> Demander une modification
            <ChevronRight size={13}/>
          </button>
        </Section>

        {/* INFORMATIONS MODIFIABLES */}
        <div className="space-y-5">
          <Section title="Contact & disponibilité" icon={<Phone size={15}/>} accent>
            <div>
              <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
                Téléphone WhatsApp
              </label>
              <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="+237 6XX XXX XXX" style={inp}/>
              <p className="text-[11px] mt-1" style={{ color: T.mutedL }}>
                Affiché sur votre page publique BelivaY.
              </p>
            </div>
          </Section>

          {/* QR CODE */}
          <Section title="QR Code BelivaY" icon={<QrCode size={15}/>}>
            <p className="text-[12.5px]" style={{ color: T.muted }}>
              Ce QR code dirige vers la page d'accueil de BelivaY avec votre identifiant. Affichez-le dans votre boutique physique.
            </p>
            <div className="flex items-center gap-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code BelivaY" className="rounded-xl flex-shrink-0"
                  style={{ width: 120, height: 120, border: `2px solid ${T.border}` }}/>
              ) : (
                <div className="w-28 h-28 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.creamAlt, border: `2px solid ${T.border}` }}>
                  <RefreshCw size={16} className="animate-spin" style={{ color: T.mutedL }}/>
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: T.cream, border: `1px solid ${T.border}` }}>
                  <Globe size={12} style={{ color: T.orange }}/>
                  <span className="text-[11.5px] truncate" style={{ color: T.muted }}>
                    {qrUrl}
                  </span>
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
          </Section>
        </div>
      </div>

      {/* EMPLACEMENTS PHYSIQUES */}
      <Section title="Emplacements physiques" icon={<MapPin size={15}/>}>
        <p className="text-[12.5px]" style={{ color: T.muted }}>
          Ajoutez tous les endroits où vos clients peuvent vous retrouver physiquement.
        </p>

        {/* Carte */}
        {locWithCoords.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ height: 260, border: `1px solid ${T.border}` }}>
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {locWithCoords.map((loc, i) => (
                <Marker key={i} position={[parseFloat(String(loc.latitude)), parseFloat(String(loc.longitude))]}>
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <p style={{ fontWeight: 800, fontSize: 13 }}>{loc.name}</p>
                      <p style={{ fontSize: 12, color: '#7C6E5A' }}>{loc.address}</p>
                      <p style={{ fontSize: 12 }}>{loc.phone}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* Liste */}
        <div className="space-y-3">
          {locations.length === 0 && (
            <div className="rounded-xl py-8 text-center" style={{ background: T.creamAlt }}>
              <MapPin size={28} className="mx-auto mb-2" style={{ color: T.mutedL }}/>
              <p className="text-[13px]" style={{ color: T.muted }}>Aucun emplacement ajouté.</p>
            </div>
          )}
          {locations.map(loc => (
            <div key={loc.id} className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: T.cream, border: `1px solid ${T.border}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: T.orangeB }}>
                <MapPin size={15} style={{ color: T.orange }}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[13.5px]" style={{ color: T.text }}>{loc.name}</p>
                <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>{loc.address}</p>
                <div className="flex flex-wrap gap-3 mt-1.5 text-[11.5px]" style={{ color: T.mutedL }}>
                  <span className="flex items-center gap-1"><Phone size={10}/>{loc.phone}</span>
                  {loc.email && <span className="flex items-center gap-1"><Mail size={10}/>{loc.email}</span>}
                  <span>Repr. : {loc.representative_name} · {loc.representative_phone}</span>
                  {loc.latitude && loc.longitude && (
                    <span className="flex items-center gap-1" style={{ color: T.green }}>
                      <MapPin size={10}/>GPS OK
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button type="button"
                  onClick={() => setLocModal({ open: true, data: loc })}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: T.blueL, border: `1px solid rgba(37,99,235,0.2)` }}>
                  <Pencil size={13} style={{ color: T.blue }}/>
                </button>
                <button type="button" onClick={() => handleDeleteLocation(loc.id!)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.2)` }}>
                  <Trash2 size={13} style={{ color: T.red }}/>
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setLocModal({ open: true, data: null })}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold"
          style={{ background: T.cream, border: `2px dashed ${T.border}`, color: T.muted }}>
          <Plus size={14}/> Ajouter un emplacement
        </button>
      </Section>

      {/* MODALES */}
      {showModModal && (
        <ModRequestModal
          profile={shop!}
          existingRequests={modRequests}
          onClose={() => setShowModModal(false)}
          onSuccess={() => { setShowModModal(false); load(); }}
        />
      )}
      {locModal.open && (
        <LocationModal
          initial={locModal.data}
          onClose={() => setLocModal({ open: false, data: null })}
          onSave={handleSaveLocation}
        />
      )}
    </div>
  );
}

