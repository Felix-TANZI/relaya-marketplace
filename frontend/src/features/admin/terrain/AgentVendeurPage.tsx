// frontend/src/features/admin/terrain/AgentVendeurPage.tsx
// DEV-SRV-01, T07-4/5 — fiche d'un vendeur inscrit par l'agent : photographier la pièce sur place (appareil photo du
// téléphone, envoi direct vers R2 côté serveur), saisir le catalogue, redonner un accès provisoire. La conformité
// valide la pièce ensuite (KYC & Approbations) ; jusque-là, rien n'est publié.

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Camera, KeyRound, PackagePlus, Smartphone, Store } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { categoriesApi, type Category } from '@/services/api/categories';
import { EnTete, Section, dateCourte } from '../d24/ui';
import { terrainApi, type FicheVendeur, type Piece } from './api';

const PIECES: { piece: Piece; accept: string; capture: 'environment' | 'user' }[] = [
  { piece: 'recto', accept: 'image/*', capture: 'environment' },
  { piece: 'verso', accept: 'image/*', capture: 'environment' },
  { piece: 'selfie', accept: 'video/*,image/*', capture: 'user' },
];

const PRODUIT_VIDE = { title: '', description: '', price_xaf: '', category: '', stock_quantity: '1' };

export default function AgentVendeurPage() {
  const { t } = useTranslation();
  const T = useAdminTheme();
  const { id } = useParams();
  const vendeurId = Number(id);
  const { showToast } = useToast();
  const toast = useRef(showToast);
  useEffect(() => { toast.current = showToast; });
  const k = (cle: string, opts?: Record<string, unknown>) => t(`ad8_terrain.${cle}`, opts);

  const [fiche, setFiche] = useState<FicheVendeur | null>(null);
  const [chargement, setChargement] = useState(false);
  const [envoiPiece, setEnvoiPiece] = useState<Piece | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [produit, setProduit] = useState(PRODUIT_VIDE);
  const [photos, setPhotos] = useState<File[]>([]);
  const [envoiProduit, setEnvoiProduit] = useState(false);
  const [motDePasse, setMotDePasse] = useState<string | null>(null);
  const [numeroMomo, setNumeroMomo] = useState('');
  const [envoiMomo, setEnvoiMomo] = useState(false);
  const champPhotos = useRef<HTMLInputElement>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setFiche(await terrainApi.fiche(vendeurId));
    } catch {
      toast.current(t('ad8_terrain.toast_error_load'), 'error');
    } finally {
      setChargement(false);
    }
  }, [t, vendeurId]);
  useEffect(() => { void charger(); }, [charger]);
  useEffect(() => {
    categoriesApi.flat({ leaves_only: true }).then(setCategories).catch(() => setCategories([]));
  }, []);

  const deposer = async (piece: Piece, fichier: File | undefined) => {
    if (!fichier) return;
    setEnvoiPiece(piece);
    try {
      setFiche(await terrainApi.deposerPiece(vendeurId, piece, fichier));
      toast.current(k('toast_piece_ok'), 'success');
    } catch (erreur) {
      toast.current(erreur instanceof Error ? erreur.message : k('toast_error_piece'), 'error');
    } finally {
      setEnvoiPiece(null);
    }
  };

  const ajouterProduit = async (e: FormEvent) => {
    e.preventDefault();
    const corps = new FormData();
    Object.entries(produit).forEach(([cle, valeur]) => corps.append(cle, valeur));
    photos.forEach((photo) => corps.append('photos', photo));
    setEnvoiProduit(true);
    try {
      await terrainApi.ajouterProduit(vendeurId, corps);
      toast.current(k('toast_product_ok', { title: produit.title }), 'success');
      setProduit(PRODUIT_VIDE);
      setPhotos([]);
      if (champPhotos.current) champPhotos.current.value = '';
      void charger();
    } catch (erreur) {
      toast.current(erreur instanceof Error ? erreur.message : k('toast_error_product'), 'error');
    } finally {
      setEnvoiProduit(false);
    }
  };

  const enregistrerMomo = async (e: FormEvent) => {
    e.preventDefault();
    setEnvoiMomo(true);
    try {
      setFiche(await terrainApi.enregistrerMobileMoney(vendeurId, numeroMomo));
      setNumeroMomo('');
      toast.current(k('toast_momo_ok'), 'success');
    } catch (erreur) {
      toast.current(erreur instanceof Error ? erreur.message : k('toast_error_momo'), 'error');
    } finally {
      setEnvoiMomo(false);
    }
  };

  const nouvelAcces = async () => {
    try {
      const reponse = await terrainApi.nouvelAcces(vendeurId);
      setMotDePasse(reponse.mot_de_passe_provisoire ?? null);
      setFiche(reponse);
    } catch (erreur) {
      toast.current(erreur instanceof Error ? erreur.message : k('toast_error_access'), 'error');
    }
  };

  const style = { background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text };
  const couleur = (statut: string | null) =>
    statut === 'APPROVED' ? T.green : statut === 'REJECTED' ? T.red : statut === 'PENDING' ? T.text : T.muted;
  const champ = (cle: keyof typeof PRODUIT_VIDE) => ({
    value: produit[cle],
    onChange: (e: { target: { value: string } }) => setProduit((p) => ({ ...p, [cle]: e.target.value })),
  });

  if (!fiche) {
    return <div className="p-6 text-sm" style={{ color: T.muted }}>{chargement ? '…' : k('toast_error_load')}</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <EnTete icon={Store} titre={fiche.boutique}
        sousTitre={`${fiche.telephone} · ${fiche.quartier} · ${k(`vendor_${fiche.statut}`)}`}
        onRefresh={() => void charger()} chargement={chargement} />

      <Section titre={k('pieces_section')}>
        <div className="p-4">
          <p className="text-sm mb-3" style={{ color: T.muted }}>
            {fiche.identite.verifiee ? k('identity_verified')
              : fiche.identite.peut_publier ? k('can_publish_selfie_left') : k('pieces_explain')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PIECES.map(({ piece, accept, capture }) => (
              <label key={piece} className="rounded-xl p-3 cursor-pointer text-center"
                style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                <Camera size={22} className="mx-auto mb-1" style={{ color: T.red }} />
                <div className="font-bold text-sm" style={{ color: T.text }}>{k(`piece_${piece}`)}</div>
                <div className="text-xs font-bold mt-1" style={{ color: couleur(fiche.pieces[piece]) }}>
                  {envoiPiece === piece ? k('uploading') : k(`piece_st_${fiche.pieces[piece] ?? 'NONE'}`)}
                </div>
                <input type="file" accept={accept} capture={capture} className="hidden" disabled={envoiPiece !== null}
                  onChange={(e) => { void deposer(piece, e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section titre={k('momo_section')}>
        <form onSubmit={(e) => void enregistrerMomo(e)} className="p-4 space-y-3">
          <p className="text-sm" style={{ color: fiche.mobile_money ? T.text : T.muted }}>
            {fiche.mobile_money
              ? k(fiche.mobile_money.verifie ? 'momo_verified' : 'momo_pending', { numero: fiche.mobile_money.numero })
              : k('momo_explain')}
          </p>
          <div className="flex gap-2">
            <input required type="tel" inputMode="tel" maxLength={20} placeholder={k('field_momo')} value={numeroMomo}
              onChange={(e) => setNumeroMomo(e.target.value)} className="flex-1 px-3 py-2 rounded-xl text-sm" style={style} />
            <button type="submit" disabled={envoiMomo} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-60"
              style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}` }}>
              <Smartphone size={15} /> {envoiMomo ? '…' : k(fiche.mobile_money ? 'momo_change' : 'momo_save')}
            </button>
          </div>
          <p className="text-xs" style={{ color: T.muted }}>{k('momo_note')}</p>
        </form>
      </Section>

      <Section titre={k('catalogue_section', { n: fiche.produits })}>
        <form onSubmit={(e) => void ajouterProduit(e)} className="p-4 space-y-3">
          <input required maxLength={255} placeholder={k('field_product_title')} className="w-full px-3 py-2 rounded-xl text-sm" style={style} {...champ('title')} />
          <textarea rows={2} placeholder={k('field_product_description')} className="w-full px-3 py-2 rounded-xl text-sm" style={style} {...champ('description')} />
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" min={1} inputMode="numeric" placeholder={k('field_product_price')} className="px-3 py-2 rounded-xl text-sm" style={style} {...champ('price_xaf')} />
            <input required type="number" min={0} inputMode="numeric" placeholder={k('field_product_stock')} className="px-3 py-2 rounded-xl text-sm" style={style} {...champ('stock_quantity')} />
          </div>
          <select required className="w-full px-3 py-2 rounded-xl text-sm" style={style} {...champ('category')}>
            <option value="">{k('field_product_category')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.full_path || c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer" style={{ color: T.text }}>
            <Camera size={16} style={{ color: T.red }} />
            {photos.length ? k('photos_count', { n: photos.length }) : k('field_product_photos')}
            <input ref={champPhotos} type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={(e) => setPhotos((avant) => [...avant, ...Array.from(e.target.files ?? [])].slice(0, 6))} />
          </label>
          <button type="submit" disabled={envoiProduit} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
            style={{ background: T.red, color: '#fff' }}>
            <PackagePlus size={16} /> {envoiProduit ? '…' : k('add_product')}
          </button>
          <p className="text-xs" style={{ color: T.muted }}>{k('product_note')}</p>
        </form>
      </Section>

      <Section titre={k('access_section')}>
        <div className="p-4">
          <p className="text-sm mb-3" style={{ color: T.text }}>
            {fiche.acces_provisoire_expire_le
              ? k('access_pending', { date: dateCourte(fiche.acces_provisoire_expire_le), login: fiche.telephone })
              : k('access_taken')}
          </p>
          {motDePasse ? (
            <div className="text-2xl font-black tracking-widest text-center py-3 mb-3 rounded-xl select-all"
              style={{ background: T.cardAlt, color: T.text, fontFamily: 'monospace', border: `2px dashed ${T.red}` }}>
              {motDePasse}
            </div>
          ) : null}
          {fiche.acces_provisoire_expire_le ? (
            <button onClick={() => void nouvelAcces()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold"
              style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}` }}>
              <KeyRound size={15} /> {k('new_access')}
            </button>
          ) : null}
        </div>
      </Section>
    </div>
  );
}
