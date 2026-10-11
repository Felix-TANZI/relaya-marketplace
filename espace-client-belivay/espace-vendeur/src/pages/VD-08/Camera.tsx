// Caméra (VD-08) — reprise du prototype (route('camera'), plein écran) : la vraie caméra du téléphone
// (getUserMedia, caméra arrière), ou, quand elle n'est pas disponible ou refusée, l'appareil photo du système
// (<input size={1} capture>). Le dessin du prototype reste le fond tant qu'aucune image n'arrive.
// - « ?mode=photo » : photo réelle de l'article (PHO-01 à PHO-04, VD08-R15) pour « ?pour= » (une offre, un brouillon,
//   « demande », « copie:<offre> » ; sans lui, le brouillon en cours). Déclencheur → recadrage carré (glisser, zoom,
//   ou photo entière) → contrôle 800 × 800 px (« Moins de 800 × 800 px : reprenez-la ») → allègement → envoi avec
//   l'heure et le lieu de la prise. « Photo n sur 8 · 3 au minimum », vignette de la dernière prise, « Terminé · n ».
// - « ?mode=scan » : code-barres (BarcodeDetector quand le téléphone l'a, sinon saisie des chiffres) ; code connu ⇒
//   la page « Nouveau produit » montre la fiche trouvée ; inconnu ⇒ elle le dit et « créer » s'active (VD08-R09, DP-58). Secours
//   « Dicter » et « Taper ».
// - « ?mode=reco » : une photo du produit, reconnue côté serveur ⇒ fiches proposées, « C'est celui-là ».
// - Lampe (torche) quand la caméra la propose. Consignes sur voile sombre (PHO-04). « ?retour= » : écran d'arrivée.
// - Accès Préparation : photos d'une offre existante seulement (VD11-CA-EQU-1) ; le reste est réservé.
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Dessin, Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { adresseDuSite, chemin } from '../../config/pages'
import type { FicheCatalogue, PhotoPrise, Reglages } from '../../donnees/domaines/offres'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles } from '../../session'
import { ImagePhoto, Reserve, useToast } from './commun'
import { lireImage, positionDeLaPrise, preparerPhoto, type Cadre } from './photos'

type Mode = 'scan' | 'photo' | 'reco'
const VOILE = { background: 'rgba(0,0,0,.5)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' } as const
const ROND = { width: '44px', height: '44px', background: 'rgba(0,0,0,.45)', color: '#fff', borderRadius: '50%', border: 0, cursor: 'pointer' } as const

interface Capture {
  image: CanvasImageSource
  apercu: string
  largeur: number
  hauteur: number
  octets: number | null
  prise: number
  position: Promise<PhotoPrise['position']>
}

/** Recadrage carré de la photo prise : glisser, molette ou curseur de zoom ; ou la photo entière. */
function Recadrage({ c, r, annuler, utiliser }: { c: Capture; r: Reglages; annuler: () => void; utiliser: (cadre: Cadre | null) => void }) {
  const { t } = usePreferences()
  const boite = useRef<HTMLDivElement>(null)
  const [cote, setCote] = useState(0)
  const [v, setV] = useState({ x: 0, y: 0, zoom: 1 })
  const doigt = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const el = boite.current
    if (!el) return
    const m = () => setCote(el.clientWidth)
    m()
    const ro = new ResizeObserver(m)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const echelle = cote ? (cote / Math.min(c.largeur, c.hauteur)) * v.zoom : 1
  const borner = (x: { x: number; y: number; zoom: number }) => {
    const zoom = Math.min(4, Math.max(1, x.zoom))
    const e = cote ? (cote / Math.min(c.largeur, c.hauteur)) * zoom : 1
    const mx = Math.max(0, (c.largeur * e - cote) / 2)
    const my = Math.max(0, (c.hauteur * e - cote) / 2)
    return { zoom, x: Math.min(mx, Math.max(-mx, x.x)), y: Math.min(my, Math.max(-my, x.y)) }
  }
  const cadre = (): Cadre => {
    const s = cote / echelle
    const cx = c.largeur / 2 - v.x / echelle
    const cy = c.hauteur / 2 - v.y / echelle
    return { x: Math.max(0, cx - s / 2), y: Math.max(0, cy - s / 2), cote: Math.min(s, c.largeur, c.hauteur) }
  }
  const cotePx = Math.round(cote ? cote / echelle : Math.min(c.largeur, c.hauteur))
  return (
    <div style={{ position: 'absolute', inset: '0', zIndex: 20, background: '#0B0907', color: '#fff', display: 'flex', flexDirection: 'column', padding: '64px 16px 28px' }} role="dialog" aria-modal="true" aria-label={t('Recadrer la photo')}>
      <div className="b8 t17 center">{t('Recadrer la photo')}</div>
      <div className="t13 center mt4" style={{ color: 'rgba(255,255,255,.8)' }}>
        {t('Faites glisser pour placer l’article dans le carré ; zoomez si besoin.')}
      </div>
      <div
        ref={boite}
        tabIndex={0}
        aria-label={t('Cadre : flèches pour déplacer, + et − pour zoomer')}
        onPointerDown={(e: PointerEvent<HTMLDivElement>) => (e.currentTarget.setPointerCapture(e.pointerId), (doigt.current = { x: e.clientX, y: e.clientY }))}
        onPointerMove={(e) => {
          if (!doigt.current) return
          const dx = e.clientX - doigt.current.x
          const dy = e.clientY - doigt.current.y
          doigt.current = { x: e.clientX, y: e.clientY }
          setV((x) => borner({ ...x, x: x.x + dx, y: x.y + dy }))
        }}
        onPointerUp={() => (doigt.current = null)}
        onPointerCancel={() => (doigt.current = null)}
        onWheel={(e) => setV((x) => borner({ ...x, zoom: x.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }))}
        onKeyDown={(e) => {
          const d: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }
          if (d[e.key]) setV((x) => borner({ ...x, x: x.x + d[e.key][0], y: x.y + d[e.key][1] }))
          else if (e.key === '+' || e.key === '=') setV((x) => borner({ ...x, zoom: x.zoom + 0.1 }))
          else if (e.key === '-') setV((x) => borner({ ...x, zoom: x.zoom - 0.1 }))
          else return
          e.preventDefault()
        }}
        style={{ position: 'relative', width: '100%', aspectRatio: '1/1', marginTop: '16px', overflow: 'hidden', borderRadius: '18px', border: '2px solid var(--gold-l)', touchAction: 'none', cursor: 'grab', background: '#000' }}
      >
        {cote > 0 && (
          <img
            src={c.apercu}
            alt=""
            draggable={false}
            style={{ position: 'absolute', left: '50%', top: '50%', width: c.largeur + 'px', height: c.hauteur + 'px', maxWidth: 'none', transform: `translate(-50%, -50%) translate(${v.x}px, ${v.y}px) scale(${echelle})` }}
          />
        )}
      </div>
      <input type="range" min={1} max={4} step={0.01} value={v.zoom} aria-label={t('Zoom')} onChange={(e) => setV((x) => borner({ ...x, zoom: Number(e.target.value) }))} style={{ marginTop: '14px', accentColor: 'var(--or)', height: '28px' }} />
      <div className={'t12 center mt4'} style={{ color: cotePx < r.photoMinPx ? '#FF9A85' : 'rgba(255,255,255,.75)' }}>
        {cotePx < r.photoMinPx ? t('Moins de 800 × 800 px : reprenez-la ou dézoomez') : `${cotePx} × ${cotePx} px`}
      </div>
      <div style={{ flex: 1 }}></div>
      <button type="button" className="btn primary" onClick={() => utiliser(cadre())}>
        <Icone nom="check" taille={18} />
        <span>{t('Utiliser cette photo')}</span>
      </button>
      <div className="row mt8" style={{ gap: '8px' }}>
        <button type="button" className="btn dark grow" onClick={() => utiliser(null)}>
          <span>{t('Photo entière')}</span>
        </button>
        <button type="button" className="btn dark grow" onClick={annuler}>
          <Icone nom="rotate-ccw" taille={16} />
          <span>{t('Reprendre')}</span>
        </button>
      </div>
    </div>
  )
}

export default function Camera() {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const maintenant = useHorloge(15_000)
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const mode: Mode = (['scan', 'photo', 'reco'].includes(params.get('mode') ?? '') ? params.get('mode') : 'scan') as Mode
  const pourVoulu = params.get('pour')
  const { dire, toast } = useToast()
  const lecture = useLecture(async () => {
    const r = await source.offres.reglages()
    const b = mode === 'photo' && !pourVoulu && montants ? await source.offres.brouillon() : null
    const pour = pourVoulu ?? b?.id ?? null
    const photos = pour ? await source.offres.photos(pour) : []
    return { r, pour, photos }
  }, [mode, pourVoulu, montants])
  const video = useRef<HTMLVideoElement>(null)
  const fichier = useRef<HTMLInputElement>(null)
  const [flux, setFlux] = useState<MediaStream | null>(null)
  const [lampe, setLampe] = useState(false)
  const [capture, setCapture] = useState<Capture | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [proposees, setProposees] = useState<FicheCatalogue[] | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const occupe = useRef(false)
  const d = lecture.donnees
  const pour = d?.pour ?? null
  const retour = params.get('retour') ? adresseDuSite('#' + params.get('retour')) : mode === 'photo' ? (pour && pour !== 'demande' && !pour.startsWith('copie:') ? chemin('offre1', { b: pour }) : chemin('offre1')) : chemin('offre1')
  const reserve = !montants && (mode !== 'photo' || !pourVoulu || pourVoulu === 'demande' || pourVoulu.startsWith('copie:'))

  // Caméra arrière du téléphone ; coupée en quittant l'écran.
  useEffect(() => {
    if (reserve || !navigator.mediaDevices?.getUserMedia) return
    let vivant = true
    let s: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false })
      .then((x) => {
        if (!vivant) return x.getTracks().forEach((tr) => tr.stop())
        s = x
        setFlux(x)
      })
      .catch(() => undefined)
    return () => {
      vivant = false
      s?.getTracks().forEach((tr) => tr.stop())
    }
  }, [reserve])
  useEffect(() => {
    if (video.current && flux) {
      video.current.srcObject = flux
      void video.current.play().catch(() => undefined)
    }
  }, [flux])

  // Code-barres lu par le téléphone quand il sait le faire (BarcodeDetector).
  const traiterCode = async (c: string) => {
    if (occupe.current) return
    occupe.current = true
    // Le scan vaut une recherche (DP-58) : la page « Nouveau produit » montre la fiche trouvée (et mes offres de cette
    // fiche) ; inconnu, il active « créer un nouveau produit » avec le code gardé.
    const f = await source.offres.parCodeBarres(c)
    occupe.current = false
    jouer(f ? 'code' : 'erreur')
    naviguer(chemin('offre1', { code: c.replace(/\D/g, '') }), { replace: true })
  }
  useEffect(() => {
    if (mode !== 'scan' || !flux) return
    const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> } }
    if (!W.BarcodeDetector) return
    const lecteur = new W.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] })
    const id = window.setInterval(() => {
      if (!video.current || occupe.current) return
      void lecteur
        .detect(video.current)
        .then((l) => l[0] && void traiterCode(l[0].rawValue))
        .catch(() => undefined)
    }, 450)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, flux])

  if (reserve) return <Reserve route="camera" />
  const r = d?.r
  const n = d?.photos.length ?? 0
  const plein = !!r && n >= r.photosMax
  const derniere = d?.photos[n - 1]

  const basculerLampe = async () => {
    const piste = flux?.getVideoTracks()[0]
    const peut = piste && 'torch' in ((piste.getCapabilities?.() as Record<string, unknown> | undefined) ?? {})
    if (!piste || !peut) return dire(t('Pas de lampe sur cet appareil'))
    try {
      await piste.applyConstraints({ advanced: [{ torch: !lampe } as MediaTrackConstraintSet] })
      setLampe(!lampe)
    } catch {
      dire(t('Pas de lampe sur cet appareil'))
    }
  }
  const prendre = () => {
    setErreur(null)
    if (mode === 'scan') return setCode('')
    if (plein) return
    const v = video.current
    if (flux && v && v.videoWidth) {
      const toile = document.createElement('canvas')
      toile.width = v.videoWidth
      toile.height = v.videoHeight
      toile.getContext('2d')!.drawImage(v, 0, 0)
      jouer('copie')
      setCapture({ image: toile, apercu: toile.toDataURL('image/jpeg', 0.85), largeur: toile.width, hauteur: toile.height, octets: null, prise: Date.now(), position: positionDeLaPrise() })
    } else fichier.current?.click()
  }
  const depuisFichier = async (f: File | undefined) => {
    if (!f) return
    try {
      const img = await lireImage(f)
      setCapture({ image: img, apercu: img.src, largeur: img.naturalWidth, hauteur: img.naturalHeight, octets: f.size, prise: f.lastModified || Date.now(), position: positionDeLaPrise() })
    } catch (e) {
      setErreur(t((e as Error).message === 'type' ? 'Choisissez une photo (JPG, PNG, WebP ou HEIC).' : (e as Error).message === 'taille' ? 'Photo trop lourde : 25 Mo au plus.' : 'Cette photo ne s’ouvre pas sur ce téléphone.'))
    } finally {
      if (fichier.current) fichier.current.value = ''
    }
  }
  const utiliser = async (cadre: Cadre | null) => {
    if (!capture || !r) return
    // L'aperçu se ferme tout de suite : une photo prise pendant la préparation de celle-ci n'est jamais effacée.
    const c = capture
    setCapture(null)
    const p = await preparerPhoto(c.image, c.largeur, c.hauteur, cadre, r, c.octets, c.prise, await c.position)
    if (p === 'petite') {
      jouer('erreur')
      return setErreur(t('Moins de 800 × 800 px : reprenez-la'))
    }
    if (mode === 'reco') {
      setProposees(await source.offres.reconnaitre(p))
      return
    }
    if (!pour) return setErreur(t('Aucune offre en cours pour cette photo : commencez par la recherche.'))
    const res = await source.offres.ajouterPhoto(pour, p)
    if (!res.ok) {
      jouer('erreur')
      return setErreur(t(res.raison === 'petite' ? 'Moins de 800 × 800 px : reprenez-la' : '8 photos au plus.'))
    }
    jouer('retrait')
  }
  const choisir = async (f: FicheCatalogue) => {
    const res = await source.offres.commencer(f.id)
    if (res.ok) naviguer(chemin('offre1', { b: res.brouillonId }), { replace: true })
  }
  const libelleMode = mode === 'scan' ? 'Scanner le code-barres' : mode === 'reco' ? 'Photo du produit' : 'Photo réelle de l’article'

  return (
    <Ecran
      route="camera"
      avant={
        <>
          <style>{'@keyframes vd08Visee{0%,100%{transform:translateY(-62px)}50%{transform:translateY(62px)}}html[data-mouv] .vd08-visee{animation:vd08Visee 2.4s ease-in-out infinite}'}</style>
          <div className="cam">
            {flux ? <video ref={video} playsInline muted autoPlay aria-label={t('Caméra')} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <Dessin id={mode === 'scan' ? '66438b76c5b7' : 'd07eeb6ff990'} />}
          </div>
          <input ref={fichier} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void depuisFichier(e.target.files?.[0])} />
          <div style={{ position: 'absolute', inset: '0', zIndex: 6, pointerEvents: 'none' }}>
            {mode === 'scan' ? (
              <>
                <div style={{ position: 'absolute', left: '50%', top: '300px', transform: 'translateX(-50%)', width: '270px', maxWidth: 'calc(100% - 48px)', height: '170px', borderRadius: '22px', boxShadow: '0 0 0 2000px rgba(0,0,0,.45)', border: '3px solid var(--gold-l)' }}></div>
                <div className="vd08-visee" style={{ position: 'absolute', left: '70px', right: '70px', top: '384px', height: '2px', background: 'var(--or)', boxShadow: '0 0 12px 2px var(--or)' }}></div>
                <div style={{ position: 'absolute', left: '24px', right: '24px', top: '596px', textAlign: 'center', color: '#fff', background: 'rgba(0,0,0,.55)', borderRadius: '16px', padding: '10px 14px' }}>
                  <div className="b8 t17">{t('Visez le code-barres de la boîte')}</div>
                  <div className="t13 mt4" style={{ color: 'rgba(255,255,255,.85)' }}>
                    {t('Le produit et sa catégorie se remplissent seuls')}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ position: 'absolute', left: '44px', right: '44px', top: '190px', height: '440px', borderRadius: '26px', border: '2px dashed rgba(255,255,255,.75)' }}></div>
                <div style={{ position: 'absolute', left: '0', right: '0', top: '140px', textAlign: 'center' }}>
                  <span className="pill" style={{ ...VOILE, height: '32px', fontSize: '13px' }}>
                    <Icone nom="camera" taille={14} />
                    {mode === 'reco' ? t('Le produit entier, de face') : r ? (plein ? tf('{n} photos : le maximum est atteint', { n }) : tf('Photo {n} sur {max} · {min} au minimum', { n: n + 1, max: r.photosMax, min: r.photosMin })) : ''}
                  </span>
                </div>
                <div style={{ position: 'absolute', left: '24px', right: '24px', top: '642px', textAlign: 'center', color: '#fff', background: 'rgba(0,0,0,.55)', borderRadius: '16px', padding: '10px 14px' }}>
                  <div className="t14 b8">{mode === 'reco' ? t('BelivaY reconnaît le produit et propose sa fiche') : derniere?.lieu ? `${heure(maintenant, langue)} · ${derniere.lieu}` : heure(maintenant, langue)}</div>
                  <div className="t12 mt4" style={{ color: 'rgba(255,255,255,.85)' }}>
                    {mode === 'reco' ? t('La photo sert seulement à chercher : elle n’est pas publiée.') : t('L’heure et le lieu restent dans la photo')}
                  </div>
                </div>
              </>
            )}
            {erreur && (
              <div role="alert" style={{ position: 'absolute', left: '24px', right: '24px', top: '110px', textAlign: 'center', color: '#fff', background: 'rgba(180,35,24,.92)', borderRadius: '14px', padding: '10px 14px', fontWeight: 700, fontSize: '14px' }}>
                {erreur}
              </div>
            )}
          </div>
          <div style={{ position: 'absolute', top: '58px', left: '14px', right: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 8 }}>
            <Link to={retour} replace className="ibtn" style={ROND} aria-label={t('Fermer')}>
              <Icone nom="x" taille={22} />
            </Link>
            <span className="pill" style={{ ...VOILE, height: '32px', fontSize: '13px' }}>
              {t(libelleMode)}
            </span>
            <button type="button" className="ibtn" style={{ ...ROND, background: lampe ? 'var(--gold-l)' : ROND.background, color: lampe ? '#1C1917' : '#fff' }} aria-label={t('Lampe')} aria-pressed={lampe} onClick={() => void basculerLampe()}>
              <Icone nom="flashlight" taille={20} />
            </button>
          </div>
          <div style={{ position: 'absolute', left: '0', right: '0', bottom: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 8 }}>
            {mode === 'scan' ? (
              <>
                <Link to={chemin('offre1', { dicter: 1 })} replace className="pill" style={{ ...VOILE, height: '44px', padding: '0 16px', fontSize: '13.5px' }}>
                  <Icone nom="mic" taille={15} />
                  {t('Dicter')}
                </Link>
                <button type="button" onClick={prendre} aria-label={t('Taper les chiffres du code-barres')} style={{ width: '74px', height: '74px', borderRadius: '50%', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'transparent', cursor: 'pointer' }}>
                  <Icone nom="scan-barcode" taille={30} />
                </button>
                <Link to={chemin('offre1', { taper: 1 })} replace className="pill" style={{ ...VOILE, height: '44px', padding: '0 16px', fontSize: '13.5px' }}>
                  <Icone nom="search" taille={15} />
                  {t('Taper')}
                </Link>
              </>
            ) : (
              <>
                {mode === 'photo' ? (
                  <Link to={retour} replace aria-label={t('Voir les photos prises')} style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #fff', background: 'rgba(0,0,0,.4)' }}>
                    {derniere ? <ImagePhoto p={derniere} /> : <span style={{ display: 'block', width: '100%', height: '100%' }}></span>}
                  </Link>
                ) : (
                  <span style={{ width: '48px' }}></span>
                )}
                <button
                  type="button"
                  onClick={prendre}
                  aria-label={t('Prendre la photo')}
                  aria-disabled={plein || undefined}
                  className={plein ? 'off' : undefined}
                  style={{ width: '76px', height: '76px', borderRadius: '50%', border: '4px solid #fff', padding: '4px', background: 'transparent', cursor: plein ? 'default' : 'pointer', opacity: plein ? 0.5 : 1 }}
                >
                  <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%', background: '#fff' }}></span>
                </button>
                {mode === 'photo' ? (
                  <Link to={retour} replace className="pill" style={{ ...VOILE, height: '44px', padding: '0 16px', fontSize: '13.5px' }}>
                    <Icone nom="check" taille={15} />
                    {tf('Terminé · {n}', { n })}
                  </Link>
                ) : (
                  <button type="button" className="pill" onClick={() => fichier.current?.click()} style={{ ...VOILE, height: '44px', padding: '0 16px', fontSize: '13.5px', cursor: 'pointer' }}>
                    <Icone nom="images" taille={15} />
                    {t('Galerie')}
                  </button>
                )}
              </>
            )}
          </div>
          {capture && r && <Recadrage c={capture} r={r} annuler={() => setCapture(null)} utiliser={(x) => void utiliser(x)} />}
          {code !== null && (
            <>
              <div className="veil" onClick={() => setCode(null)} />
              <form
                className="sheet"
                role="dialog"
                aria-modal="true"
                aria-label={t('Taper le code-barres')}
                onSubmit={(e) => {
                  e.preventDefault()
                  if (code.replace(/\D/g, '').length < 8) return setErreur(t('Un code-barres a 8 à 14 chiffres.'))
                  setCode(null)
                  void traiterCode(code)
                }}
              >
                <div className="grab" />
                <h2 className="pg-t" style={{ fontSize: '19px' }}>
                  {t('Taper le code-barres')}
                </h2>
                <p className="pg-s">{t('Les chiffres sous les barres, sur la boîte.')}</p>
                <div className="fld">
                  <div className="inp">
                    <Icone nom="scan-barcode" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
                    <input size={1} autoFocus inputMode="numeric" aria-label={t('Code-barres')} value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, '').slice(0, 18))} placeholder={t('Ex. : 6941812725203')} />
                  </div>
                </div>
                <div className="mt14">
                  <button type="submit" className="btn primary">
                    <Icone nom="search" taille={18} />
                    <span>{t('Trouver la fiche')}</span>
                  </button>
                </div>
              </form>
            </>
          )}
          {proposees && (
            <>
              <div className="veil" onClick={() => setProposees(null)} />
              <div className="sheet" role="dialog" aria-modal="true" aria-label={t('Fiches proposées')}>
                <div className="grab" />
                <h2 className="pg-t" style={{ fontSize: '19px' }}>
                  {t('Fiches proposées')}
                </h2>
                <p className="pg-s">{t(proposees.length ? 'Choisissez la bonne, ou cherchez par le nom.' : 'Aucune fiche reconnue : cherchez par le nom.')}</p>
                {proposees.map((f) => (
                  <div key={f.id} className="li">
                    <Vignette nom={f.dessin} taille={44} />
                    <span className="grow lt">{f.titre}</span>
                    <button type="button" className="btn soft auto" style={{ minHeight: '44px' }} onClick={() => void choisir(f)}>
                      <Icone nom="check" taille={16} />
                      <span>{t('C’est celui-là')}</span>
                    </button>
                  </div>
                ))}
                <div className="mt12">
                  <Link to={chemin('offre1', { taper: 1 })} replace className="btn secondary">
                    <Icone nom="search" taille={18} />
                    <span>{t('Chercher par le nom')}</span>
                  </Link>
                </div>
              </div>
            </>
          )}
          {toast}
        </>
      }
    ></Ecran>
  )
}
