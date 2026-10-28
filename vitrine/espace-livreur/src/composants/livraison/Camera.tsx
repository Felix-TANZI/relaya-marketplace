// Appareil photo de l'application (LIV-01-R028, LIV-UIX-07, LIV-DON-03) : étape plein écran sans dock ; consigne en
// haut, cadre de visée, heure et position INCRUSTÉES dans l'image, contrôle de netteté (variance du laplacien : une
// photo floue est refusée avant l'envoi et n'entre pas dans la file), compression sous PHOTO-MAX-KO, lampe si le
// téléphone en a une, icône de galerie barrée (la galerie n'est jamais accessible) ; quitter demande une confirmation.
// La photo n'est jamais enregistrée dans le téléphone : l'aperçu ne vit qu'en mémoire, le temps de la visite. Elle est
// envoyée (POST media) avant l'action qui la cite ; hors connexion, elle part en file avec son heure et sa position.
// Mode « scanner » : lecture de l'étiquette pré-imprimée (BarcodeDetector quand le téléphone le permet), sinon saisie.
// Sans appareil photo (ordinateur, autorisation refusée) : message clair ; en démonstration, une photo de démonstration.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { env } from '@client/config/env'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import type { TypeAction } from '../../donnees/domaines/horsligne'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useAgir, useRegles } from './outils'

/** Aperçus des photos prises pendant la visite (mémoire seulement, jamais sur le téléphone). */
const APERCUS = new Map<string, string>()
export const apercu = (id: string | null | undefined) => (id ? (APERCUS.get(id) ?? null) : null)

export interface Photo {
  id: string
  heure: number
  enFile: boolean
}

type EtatCam = 'ouverture' | 'video' | 'indisponible' | 'envoi' | 'floue' | 'confirmer'

async function empreinte(octets: Uint8Array): Promise<string> {
  try {
    const h = await crypto.subtle.digest('SHA-256', octets as unknown as ArrayBuffer)
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    let x = 2166136261
    for (const b of octets) x = Math.imul(x ^ b, 16777619)
    return (x >>> 0).toString(16)
  }
}

/** Variance du laplacien sur une image réduite en gris : mesure de netteté. */
function nettete(c: HTMLCanvasElement): number {
  const l = 160
  const h = Math.round((c.height / c.width) * l)
  const p = document.createElement('canvas')
  p.width = l
  p.height = h
  const x = p.getContext('2d', { willReadFrequently: true })!
  x.drawImage(c, 0, 0, l, h)
  const d = x.getImageData(0, 0, l, h).data
  const g = new Float32Array(l * h)
  for (let i = 0; i < l * h; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
  let s = 0
  let s2 = 0
  let n = 0
  for (let y = 1; y < h - 1; y++)
    for (let xx = 1; xx < l - 1; xx++) {
      const i = y * l + xx
      const v = g[i - 1] + g[i + 1] + g[i - l] + g[i + l] - 4 * g[i]
      s += v
      s2 += v * v
      n++
    }
  const m = s / n
  return s2 / n - m * m
}

/** Image de démonstration (pas d'appareil photo) : motif net, ou flou pour montrer le refus. */
function imageDemo(c: HTMLCanvasElement, consigne: string, floue: boolean) {
  const m = document.createElement('canvas')
  m.width = c.width = 960
  m.height = c.height = 720
  const x = m.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 960, 720)
  g.addColorStop(0, '#CFE9DB')
  g.addColorStop(1, '#7FB89A')
  x.fillStyle = g
  x.fillRect(0, 0, 960, 720)
  x.strokeStyle = 'rgba(15,31,25,.45)'
  x.lineWidth = 3
  for (let i = -480; i < 960; i += 22) {
    x.beginPath()
    x.moveTo(i, 140)
    x.lineTo(i + 300, 600)
    x.stroke()
  }
  x.fillStyle = '#0F1F19'
  x.font = 'bold 40px system-ui, sans-serif'
  x.fillText(consigne.slice(0, 40), 48, 96)
  const y = c.getContext('2d')!
  if (floue) y.filter = 'blur(14px)'
  y.drawImage(m, 0, 0)
  y.filter = 'none'
}

export function Camera(p: {
  ouverte: boolean
  fermer: () => void
  consigne: string // « Photo 1 · produit à découvert »
  nature: string
  objet: string
  type?: TypeAction
  prise: (photo: Photo) => void
}) {
  const { t, tf, langue } = usePreferences()
  const regles = useRegles()
  const { agir, maintenant } = useAgir()
  const video = useRef<HTMLVideoElement>(null)
  const flux = useRef<MediaStream | null>(null)
  const [etat, setEtat] = useState<EtatCam>('ouverture')
  const [lampe, setLampe] = useState<boolean | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const { ouverte } = p

  useEffect(() => {
    if (!ouverte) return
    let vivant = true
    setEtat('ouverture')
    setRefus(null)
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined
    if (!md?.getUserMedia) {
      setEtat('indisponible')
      return
    }
    md.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1600 } }, audio: false }).then(
      (s) => {
        if (!vivant) return s.getTracks().forEach((x) => x.stop())
        flux.current = s
        const piste = s.getVideoTracks()[0]
        const cap = (piste?.getCapabilities?.() ?? {}) as { torch?: boolean }
        setLampe(cap.torch ? false : null)
        if (video.current) {
          video.current.srcObject = s
          void video.current.play().catch(() => undefined)
        }
        setEtat('video')
      },
      () => vivant && setEtat('indisponible'),
    )
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && setEtat((x) => (x === 'envoi' ? x : 'confirmer'))
    window.addEventListener('keydown', echap)
    return () => {
      vivant = false
      window.removeEventListener('keydown', echap)
      flux.current?.getTracks().forEach((x) => x.stop())
      flux.current = null
    }
  }, [ouverte])

  if (!ouverte) return null

  const basculerLampe = () => {
    const piste = flux.current?.getVideoTracks()[0]
    if (!piste || lampe === null) return
    void piste.applyConstraints({ advanced: [{ torch: !lampe } as MediaTrackConstraintSet] }).then(() => setLampe(!lampe), () => setLampe(null))
  }

  const declencher = async (demo?: 'nette' | 'floue') => {
    if (!regles) return
    const c = document.createElement('canvas')
    if (demo) imageDemo(c, t(p.consigne), demo === 'floue')
    else {
      const v = video.current
      if (!v || !v.videoWidth) return
      const k = Math.min(1, 1280 / v.videoWidth)
      c.width = Math.round(v.videoWidth * k)
      c.height = Math.round(v.videoHeight * k)
      c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
    }
    const x = c.getContext('2d')!
    const net = nettete(c) >= regles.netteteSeuil // mesurée sur l'image seule, avant l'incrustation
    // Heure et position d'origine incrustées (preuve lisible même hors de l'application).
    const pos = await new Promise<string>((ok) => {
      if (!navigator.geolocation) return ok('—')
      navigator.geolocation.getCurrentPosition(
        (g) => ok(`${g.coords.latitude.toFixed(5)}, ${g.coords.longitude.toFixed(5)} ±${Math.round(g.coords.accuracy)} m`),
        () => ok('—'),
        { maximumAge: 30_000, timeout: 3000 },
      )
    })
    const bande = Math.round(c.height * 0.08)
    x.fillStyle = 'rgba(0,0,0,.55)'
    x.fillRect(0, c.height - bande, c.width, bande)
    x.fillStyle = '#fff'
    x.font = `600 ${Math.round(bande * 0.42)}px system-ui, sans-serif`
    x.fillText(`BelivaY · ${heure(maintenant, langue)} · ${pos}`, Math.round(bande * 0.4), c.height - Math.round(bande * 0.35))
    if (!net) {
      signal('erreur')
      setEtat('floue')
      return
    }
    // Compression sous le plafond du registre.
    let q = 0.82
    let url = c.toDataURL('image/jpeg', q)
    const taille = (u: string) => Math.floor((u.length - u.indexOf(',') - 1) * 0.75)
    while (taille(url) > regles.photoMaxKo * 1024 && q > 0.3) {
      q -= 0.12
      url = c.toDataURL('image/jpeg', q)
    }
    const octets = Uint8Array.from(atob(url.slice(url.indexOf(',') + 1)), (ch) => ch.charCodeAt(0))
    setEtat('envoi')
    const res = await agir(p.type ?? 'photo', p.objet, async (o, s) => s.tournee.deposerPreuve({ nature: p.nature, objet: p.objet, octets: octets.length, empreinte: await empreinte(octets), nette: true }, o))
    if (!res || !res.r.ok) {
      setRefus(res && !res.r.ok && res.r.raison === 'trop_lourde' ? t('Photo trop lourde : reprenez-la de plus près.') : t('La photo n’a pas pu être enregistrée. Reprenez-la.'))
      setEtat(flux.current ? 'video' : 'indisponible')
      return
    }
    APERCUS.set(res.r.id, url)
    signal('photo')
    p.prise({ id: res.r.id, heure: maintenant, enFile: res.enFile })
    p.fermer()
  }

  const demo = env.source === 'demo'
  return createPortal(
    <div className="lv-cam" role="dialog" aria-modal="true" aria-label={t(p.consigne)}>
      <div className="lv-cam-haut">
        <button type="button" className="lv-cam-btn" aria-label={t('Fermer l’appareil photo')} onClick={() => setEtat('confirmer')}>
          <Icone nom="x" taille={26} />
        </button>
        <div className="lv-cam-consigne">{t(p.consigne)}</div>
        {lampe !== null ? (
          <button type="button" className={'lv-cam-btn' + (lampe ? ' on' : '')} aria-pressed={lampe} aria-label={t('Lampe')} onClick={basculerLampe}>
            <Icone nom="zap" taille={24} />
          </button>
        ) : (
          <span className="lv-cam-btn lv-cam-muet" aria-hidden="true">
            <Icone nom="zap" taille={24} />
          </span>
        )}
      </div>
      <div className="lv-cam-vue">
        <video ref={video} playsInline muted className={etat === 'video' || etat === 'envoi' ? '' : 'lv-cache'} />
        {(etat === 'video' || etat === 'envoi') && <div className="lv-cam-cadre" aria-hidden="true" />}
        {etat === 'ouverture' && <p className="lv-cam-info">{t('Ouverture de l’appareil photo…')}</p>}
        {etat === 'indisponible' && (
          <div className="lv-cam-info">
            <Icone nom="camera-off" taille={36} />
            <p>{t('Appareil photo indisponible. Autorisez l’appareil photo pour BelivaY dans les réglages du téléphone : la preuve ne peut pas être importée.')}</p>
          </div>
        )}
        {etat === 'floue' && (
          <div className="lv-cam-info" role="alert">
            <Icone nom="focus" taille={36} />
            <p>{t('Photo floue : elle n’est pas enregistrée. Tenez le téléphone immobile, à la lumière, et reprenez-la.')}</p>
            <button type="button" className="l-btn l-principal" onClick={() => setEtat(flux.current ? 'video' : 'indisponible')}>
              {t('Reprendre la photo')}
            </button>
          </div>
        )}
        {refus && etat !== 'floue' && (
          <p className="lv-cam-refus" role="alert">
            {refus}
          </p>
        )}
        {etat === 'confirmer' && (
          <div className="lv-cam-info" role="alertdialog" aria-label={t('Quitter sans photo ?')}>
            <p>
              <b>{t('Quitter sans photo ?')}</b>
              <br />
              {t('L’étape reste bloquée tant que la photo n’est pas prise.')}
            </p>
            <button type="button" className="l-btn l-principal" onClick={() => setEtat(flux.current ? 'video' : 'indisponible')}>
              {t('Continuer la photo')}
            </button>
            <button type="button" className="l-btn l-second" onClick={p.fermer}>
              {t('Quitter')}
            </button>
          </div>
        )}
      </div>
      <div className="lv-cam-bas">
        <span className="lv-cam-galerie" title={t('Galerie inaccessible')}>
          <Icone nom="image-off" taille={22} />
          <span>{t('Galerie inaccessible')}</span>
        </span>
        <button type="button" className="lv-cam-declencheur" aria-label={t('Prendre la photo')} disabled={etat !== 'video' || !regles} onClick={() => void declencher()}>
          <span />
        </button>
        <span className="lv-cam-galerie">
          <Icone nom="clock" taille={22} />
          <span>{tf('{h} · position', { h: heure(maintenant, langue) })}</span>
        </span>
      </div>
      {demo && (etat === 'indisponible' || etat === 'video') && (
        <div className="lv-cam-demo">
          <span>{t('Démonstration')}</span>
          <button type="button" onClick={() => void declencher('nette')} disabled={!regles}>
            {t('Photo de démonstration')}
          </button>
          <button type="button" onClick={() => void declencher('floue')} disabled={!regles}>
            {t('Photo floue')}
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}

/** Emplacement d'une photo exigée : vide (bloquant) → appareil photo ; prise → vignette horodatée, « Reprendre ». */
export function CasePhoto(p: { titre: string; consigne: string; nature: string; objet: string; id: string | null; heure?: number | null; enFile?: boolean; type?: TypeAction; prise: (ph: Photo) => void; desactive?: boolean; facultative?: boolean }) {
  const { t, langue } = usePreferences()
  const [ouverte, setOuverte] = useState(false)
  const url = apercu(p.id)
  return (
    <div className={'lv-photo' + (p.id ? ' lv-photo-ok' : '')}>
      <button type="button" className="lv-photo-case" onClick={() => setOuverte(true)} disabled={p.desactive} aria-label={p.id ? t('Reprendre la photo') + ' · ' + t(p.titre) : t(p.titre)}>
        {url ? <img src={url} alt="" /> : <Icone nom={p.id ? 'circle-check' : 'camera'} taille={30} />}
      </button>
      <div className="lv-photo-txt">
        <b>{t(p.titre)}</b>
        <span>
          {p.id
            ? (p.heure ? heure(p.heure, langue) + ' · ' : '') + (p.enFile ? t('en attente d’envoi') : t('horodatée et géolocalisée'))
            : p.facultative
              ? t('Facultative')
              : t('Obligatoire : l’étape reste bloquée sans elle')}
        </span>
        <button type="button" className="lv-lien" onClick={() => setOuverte(true)} disabled={p.desactive}>
          <Icone nom="camera" taille={16} />
          {p.id ? t('Reprendre la photo') : t('Prendre la photo')}
        </button>
      </div>
      <Camera ouverte={ouverte} fermer={() => setOuverte(false)} consigne={p.consigne} nature={p.nature} objet={p.objet} type={p.type} prise={p.prise} />
    </div>
  )
}
