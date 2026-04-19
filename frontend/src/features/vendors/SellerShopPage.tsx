// frontend/src/features/vendors/SellerShopPage.tsx
// Page "Ma Boutique" — espace vendeur BelivaY.
// Permet de configurer la boutique publique (bannière, photo, infos, QR code).

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Store, Upload, Save, RefreshCw,
  Copy, Check, QrCode, Download, MapPin,
  Globe, FileText, Image as ImageIcon,
} from 'lucide-react';
import { vendorsApi, type ShopInfo, type VendorProfile } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import QRCode from 'qrcode';

const T = {
  orange: '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.12)',
  cream: '#F5F0E8', creamAlt: '#EDE7DC',
  white: '#FFFFFF', border: '#E8E2D9',
  text: '#1A1209', muted: '#7C6E5A', mutedL: '#B8A898',
  green: '#16A34A', greenL: 'rgba(22,163,74,0.10)',
  red: '#DC2626', redL: 'rgba(220,38,38,0.10)',
  sidebar: '#1C1209',
};

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32', SILVER: '#A8A9AD', GOLD: '#FFD700', DIAMOND: '#B9F2FF',
};
const TIER_LABELS: Record<string, string> = {
  BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or', DIAMOND: 'Diamant',
};
const PREP_LABELS: Record<string, string> = {
  '24H': '24h ouvrables', '48H': '48h ouvrables', '72H': '72h ouvrables', 'CUSTOM': 'Sur commande',
};

function Section({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 6px rgba(28,18,9,0.05)' }}>
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.orangeB }}>
          <span style={{ color: T.orange }}>{icon}</span>
        </div>
        <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>{title}</p>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12.5px] font-semibold" style={{ color: T.text }}>{label}</label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: T.mutedL }}>{hint}</p>}
    </div>
  );
}

const inp: React.CSSProperties = {
  background: T.cream, border: `1px solid ${T.border}`, color: T.text,
  borderRadius: 12, padding: '10px 14px', fontSize: 13.5, outline: 'none', width: '100%',
};

type ShopProfile = VendorProfile & Partial<ShopInfo>;

export default function SellerShopPage() {
  const { showToast } = useToast();
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [shop,      setShop]      = useState<ShopInfo | null>(null);
  const [qrData,    setQrData]    = useState<{ slug: string; public_url: string; shop_name: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Champs formulaire
  const [name,        setName]        = useState('');
  const [description, setDesc]        = useState('');
  const [whatsapp,    setWhatsapp]     = useState('');
  const [city,        setCity]        = useState('');
  const [delay,       setDelay]       = useState<ShopInfo['preparation_delay']>('72H');
  const [returnP,     setReturnP]     = useState('');
  const [isOnline,    setIsOnline]    = useState(true);

  const bannerRef = useRef<HTMLInputElement>(null);
  const photoRef  = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [profile, qr] = await Promise.all([
        vendorsApi.getProfile(),
        vendorsApi.getShopQr(),
      ]);
      const p = profile as ShopProfile;
      setShop(p as ShopInfo);
      setQrData(qr);
      setName(p.business_name || '');
      setDesc(p.business_description || '');
      setWhatsapp(p.whatsapp_phone || '');
      setCity(p.city || '');
      setDelay(p.preparation_delay || '72H');
      setReturnP(p.return_policy || '');
      setIsOnline(p.is_online !== false);

      // Générer QR code
      if (qr.public_url) {
        const url = await QRCode.toDataURL(qr.public_url, {
          width: 280, margin: 2,
          color: { dark: T.sidebar, light: '#FFFFFF' },
        });
        setQrDataUrl(url);
      }
    } catch {
      showToast('Erreur de chargement', 'error');
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await vendorsApi.updateShop({
        business_name:        name,
        business_description: description,
        whatsapp_phone:       whatsapp,
        city,
        preparation_delay:    delay,
        return_policy:        returnP,
        is_online:            isOnline,
      });
      showToast('Boutique mise à jour', 'success');
      await load();
    } catch { showToast('Erreur lors de la sauvegarde', 'error'); }
    finally { setSaving(false); }
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      const res = await vendorsApi.uploadShopPhoto(file);
      setShop(prev => prev ? { ...prev, photo_url: res.photo_url } : prev);
      showToast('Photo mise à jour', 'success');
    } catch { showToast("Erreur upload photo", 'error'); }
  };

  const handleBannerUpload = async (file: File) => {
    try {
      const res = await vendorsApi.uploadShopBanner(file);
      setShop(prev => prev ? { ...prev, banner_url: res.banner_url } : prev);
      showToast('Bannière mise à jour', 'success');
    } catch { showToast("Erreur upload bannière", 'error'); }
  };

  const handleCopyLink = () => {
    if (qrData?.public_url) {
      navigator.clipboard.writeText(qrData.public_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Lien copié', 'success');
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a       = document.createElement('a');
    a.href        = qrDataUrl;
    a.download    = `qr-${qrData?.slug || 'boutique'}.png`;
    a.click();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }}/>
    </div>
  );

  const publicUrl = qrData?.public_url || '';
  const tier      = shop?.certification_tier || 'BRONZE';

  return (
    <div className="space-y-5 pb-10 max-w-4xl mx-auto">

      {/* EN-TÊTE */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2 font-black text-[22px]"
            style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            <Store size={20} style={{ color: T.orange }}/> Ma Boutique
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
            Configuration et présentation publique
          </p>
        </div>
        <div className="flex gap-2">
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold"
              style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
              <Globe size={13}/> Voir la boutique
            </a>
          )}
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
            style={{ background: T.orange, boxShadow: '0 3px 10px rgba(244,121,32,0.35)' }}>
            {saving ? <><RefreshCw size={13} className="animate-spin"/>Enregistrement…</> : <><Save size={13}/>Enregistrer</>}
          </button>
        </div>
      </div>

      {/* BANNIÈRE */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ height: 160, background: T.creamAlt, border: `1px solid ${T.border}` }}>
        {shop?.banner_url
          ? <img src={shop.banner_url} alt="bannière" className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center" style={{ color: T.mutedL }}>
              <ImageIcon size={32}/>
            </div>
        }
        <input type="file" ref={bannerRef} className="hidden" accept="image/*"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleBannerUpload(f); e.target.value=''; }}/>
        <button type="button" onClick={() => bannerRef.current?.click()}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white"
          style={{ background: 'rgba(28,18,9,0.65)', backdropFilter: 'blur(4px)' }}>
          <Upload size={12}/> Modifier la bannière
        </button>
      </div>

      {/* PROFIL */}
      <div className="flex items-end gap-4 px-2">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl overflow-hidden"
            style={{ border: `3px solid ${T.orange}`, background: T.creamAlt }}>
            {shop?.photo_url
              ? <img src={shop.photo_url} alt="photo boutique" className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center">
                  <Store size={28} style={{ color: T.mutedL }}/>
                </div>
            }
          </div>
          <input type="file" ref={photoRef} className="hidden" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value=''; }}/>
          <button type="button" onClick={() => photoRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white"
            style={{ background: T.orange }}>
            <Upload size={11}/>
          </button>
        </div>
        <div>
          <p className="font-black text-[18px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>{name || 'Ma Boutique'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${TIER_COLORS[tier]}25`, color: TIER_COLORS[tier] }}>
              {TIER_LABELS[tier]}
            </span>
            <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: isOnline ? T.greenL : T.redL, color: isOnline ? T.green : T.red }}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12px] font-semibold" style={{ color: T.muted }}>Boutique {isOnline ? 'active' : 'en pause'}</span>
          <button type="button" onClick={() => setIsOnline(!isOnline)}
            className="w-11 h-6 rounded-full transition-all relative" style={{ background: isOnline ? T.green : T.border }}>
            <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
              style={{ left: isOnline ? '24px' : '2px' }}/>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* INFORMATIONS */}
        <Section title="Informations" icon={<FileText size={15}/>}>
          <Field label="Nom de la boutique">
            <input value={name} onChange={e => setName(e.target.value)} maxLength={255} style={inp}/>
          </Field>
          <Field label="Description" hint="Visible sur votre page publique">
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={4}
              style={{ ...inp, resize: 'none' }}/>
          </Field>
          <Field label="Téléphone WhatsApp" hint="Affiché aux acheteurs pour vous contacter">
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+237 6XX XXX XXX" style={inp}/>
          </Field>
        </Section>

        {/* LOCALISATION & LIVRAISON */}
        <Section title="Localisation & Livraison" icon={<MapPin size={15}/>}>
          <Field label="Ville principale">
            <select value={city} onChange={e => setCity(e.target.value)} style={inp}>
              {['Yaoundé','Douala','Bafoussam','Garoua','Maroua','Bertoua','Bamenda','Limbé','Kribi','Libreville (Gabon)'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Délai de préparation">
            <select value={delay} onChange={e => setDelay(e.target.value as ShopInfo['preparation_delay'])} style={inp}>
              {Object.entries(PREP_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Politique de retour" hint="Conditions que vous imposez aux acheteurs">
            <textarea value={returnP} onChange={e => setReturnP(e.target.value)} rows={4}
              placeholder="Ex : Retour accepté sous 7 jours. Article en état d'origine. Remboursement via Escrow BelivaY."
              style={{ ...inp, resize: 'none' }}/>
          </Field>
        </Section>
      </div>

      {/* QR CODE */}
      <Section title="QR Code & Lien de partage" icon={<QrCode size={15}/>}>
        <p className="text-[12.5px]" style={{ color: T.muted }}>
          Affichez ce QR code dans votre boutique physique. Vos clients n'ont qu'à le scanner pour retrouver directement votre boutique sur BelivaY.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* QR Code */}
          <div className="flex-shrink-0">
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR Code boutique" className="rounded-xl"
                  style={{ width: 160, height: 160, border: `2px solid ${T.border}` }}/>
              : <div className="w-40 h-40 rounded-xl flex items-center justify-center"
                  style={{ background: T.creamAlt, border: `2px solid ${T.border}` }}>
                  <RefreshCw size={20} className="animate-spin" style={{ color: T.mutedL }}/>
                </div>
            }
          </div>

          <div className="flex-1 space-y-3">
            {/* Lien */}
            <div>
              <p className="text-[12px] font-semibold mb-1.5" style={{ color: T.muted }}>Lien de votre boutique</p>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style={{ background: T.cream, border: `1px solid ${T.border}` }}>
                <Globe size={13} style={{ color: T.orange, flexShrink: 0 }}/>
                <span className="flex-1 text-[12.5px] truncate font-medium" style={{ color: T.text }}>
                  {publicUrl || 'Chargement…'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
                style={{ background: copied ? T.greenL : T.cream, border: `1px solid ${copied ? T.green : T.border}`, color: copied ? T.green : T.muted }}>
                {copied ? <><Check size={13}/>Copié !</> : <><Copy size={13}/>Copier le lien</>}
              </button>
              <button type="button" onClick={handleDownloadQR} disabled={!qrDataUrl}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
                style={{ background: T.orangeL, border: `1px solid ${T.orangeB}`, color: T.orange }}>
                <Download size={13}/> Télécharger le QR
              </button>
            </div>
            <p className="text-[11px]" style={{ color: T.mutedL }}>
              Format PNG haute résolution — idéal pour impression et affichage en boutique physique.
            </p>
          </div>
        </div>
      </Section>

    </div>
  );
}
