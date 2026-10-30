// Appareil photo intégré pour les pièces d'activation (LIV-03-R21, LIV-UIX-07, LIV-DON-03) : plein écran sombre,
// gabarit au format de la pièce, « Pièce x sur 8 » ; jamais la galerie (aucun choix de fichier), jamais enregistré dans
// le téléphone ; trois contrôles avant envoi (netteté, pièce entière dans le cadre, aucun reflet) : le déclencheur
// n'envoie que si les trois sont bons ; photo compressée sous la taille maximale servie par le serveur. Le selfie est
// une courte vidéo avec preuve de vie (v6, DP-63). La permission de la caméra est demandée à ce moment, au premier
// besoin (LIV-03-R27). Les seuils ci-dessous sont des réglages techniques de l'analyse d'image, pas des règles.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icone } from '../../composants/Icone'
import { Btn, Pill } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import type { PieceKyc } from '../../donnees/domaines/acces'
import { usePreferences } from '../../preferences'

const ANALYSE = { largeur: 160, nettete: 90, refletPixel: 248, refletPart: 0.02, bord: 18, lumiereMin: 45, lumiereMax: 225 }
const VIDEO_MS = 3000

type Controles = { nettete: boolean; cadre: boolean; reflet: boolean }
type Etat = 'demande' | 'refus' | 'direct' | 'enregistre' | 'apercu'

export function Camera(p: { piece: PieceKyc; rang: number; total: number; titre: string; photoMaxKo: number; fermer: () => void; envoyer: (octets: number) => Promise<string | null> }) {
  const { t, tf } = usePreferences()
  const video = useRef<HTMLVideoElement>(null)
  const flux = useRef<MediaStream | null>(null)
  const [etat, setEtat] = useState<Etat>('demande')
  const [ctl, setCtl] = useState<Controles>({ nettete: false, cadre: false, reflet: false })
  const [apercu, setApercu] = useState<{ url: string; octets: number } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const visage = p.piece.gabarit === 'visage'

  const arreter = () => {
    flux.current?.getTracks().forEach((x) => x.stop())
    flux.current = null
  }
  const demarrer = useCallback(async () => {
    setEtat('demande')
    setErreur(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('indisponible')
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: visage ? 'user' : 'environment', width: { ideal: 1600 } }, audio: false })
      flux.current = s
      setEtat('direct')
    } catch {
      setEtat('refus')
    }
  }, [visage])
  useEffect(() => {
    void demarrer()
    return arreter
  }, [demarrer])
  useEffect(() => {
    if (etat === 'direct' && video.current && flux.current && video.current.srcObject !== flux.current) {
      video.current.srcObject = flux.current
      void video.current.play().catch(() => undefined)
    }
  }, [etat])

  // Contrôles en direct, sur une image réduite : netteté (variance du laplacien), reflet (pixels brûlés), cadre (bords
  // de la pièce présents sur le pourtour du gabarit, lumière correcte).
  useEffect(() => {
    if (etat !== 'direct') return
    const toile = document.createElement('canvas')
    const id = setInterval(() => {
      const v = video.current
      if (!v || !v.videoWidth) return
      const w = ANALYSE.largeur
      const hgt = Math.round((w * v.videoHeight) / v.videoWidth)
      toile.width = w
      toile.height = hgt
      const c = toile.getContext('2d', { willReadFrequently: true })
      if (!c) return
      c.drawImage(v, 0, 0, w, hgt)
      const d = c.getImageData(0, 0, w, hgt).data
      const lum = new Float32Array(w * hgt)
      let brules = 0
      let somme = 0
      for (let i = 0; i < w * hgt; i++) {
        const l = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
        lum[i] = l
        somme += l
        if (l >= ANALYSE.refletPixel) brules++
      }
      let n = 0
      let m = 0
      let m2 = 0
      let bord = 0
      let nb = 0
      const mx = Math.round(w * 0.1)
      const my = Math.round(hgt * 0.18)
      for (let y = 1; y < hgt - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x
          const lap = 4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - w] - lum[i + w]
          n++
          m += lap
          m2 += lap * lap
          const pres = (Math.abs(x - mx) < 4 || Math.abs(x - (w - mx)) < 4) && y > my && y < hgt - my
          if (pres || ((Math.abs(y - my) < 4 || Math.abs(y - (hgt - my)) < 4) && x > mx && x < w - mx)) {
            nb++
            bord += Math.abs(lap)
          }
        }
      const variance = m2 / n - (m / n) ** 2
      const moyenne = somme / (w * hgt)
      setCtl({
        nettete: variance > ANALYSE.nettete,
        reflet: brules / (w * hgt) < ANALYSE.refletPart,
        cadre: moyenne > ANALYSE.lumiereMin && moyenne < ANALYSE.lumiereMax && (visage || bord / Math.max(1, nb) > ANALYSE.bord),
      })
    }, 400)
    return () => clearInterval(id)
  }, [etat, visage])

  const tousBons = ctl.nettete && ctl.cadre && ctl.reflet

  const prendre = async () => {
    const v = video.current
    if (!v || !tousBons) return
    signal('toucher')
    if (p.piece.video) {
      // Selfie vidéo : quelques secondes, tête tournée lentement (preuve de vie).
      if (typeof MediaRecorder === 'undefined' || !flux.current) return setErreur(t('Ce téléphone ne permet pas la vidéo : contactez le support livreur.'))
      const rec = new MediaRecorder(flux.current)
      const morceaux: Blob[] = []
      rec.ondataavailable = (e) => morceaux.push(e.data)
      setEtat('enregistre')
      rec.onstop = () => {
        const b = new Blob(morceaux, { type: rec.mimeType })
        setApercu({ url: URL.createObjectURL(b), octets: b.size })
        setEtat('apercu')
      }
      rec.start()
      setTimeout(() => rec.state !== 'inactive' && rec.stop(), VIDEO_MS)
      return
    }
    const toile = document.createElement('canvas')
    toile.width = v.videoWidth
    toile.height = v.videoHeight
    toile.getContext('2d')!.drawImage(v, 0, 0)
    // Compression jusqu'à passer sous la taille maximale (qualité, puis dimensions).
    let qualite = 0.82
    let b: Blob | null = null
    for (let essai = 0; essai < 8; essai++) {
      b = await new Promise<Blob | null>((r) => toile.toBlob(r, 'image/jpeg', qualite))
      if (b && b.size <= p.photoMaxKo * 1024) break
      if (qualite > 0.5) qualite -= 0.12
      else {
        const t2 = document.createElement('canvas')
        t2.width = Math.round(toile.width * 0.8)
        t2.height = Math.round(toile.height * 0.8)
        t2.getContext('2d')!.drawImage(toile, 0, 0, t2.width, t2.height)
        toile.width = t2.width
        toile.height = t2.height
        toile.getContext('2d')!.drawImage(t2, 0, 0)
      }
    }
    if (!b) return setErreur(t('La photo n’a pas pu être prise. Réessayez.'))
    setApercu({ url: URL.createObjectURL(b), octets: b.size })
    setEtat('apercu')
  }
  const reprendre = () => {
    if (apercu) URL.revokeObjectURL(apercu.url)
    setApercu(null)
    setErreur(null)
    setEtat(flux.current ? 'direct' : 'demande')
    if (!flux.current) void demarrer()
  }
  const envoyer = async () => {
    if (!apercu) return
    setOccupe(true)
    const e = await p.envoyer(apercu.octets)
    setOccupe(false)
    if (e) return setErreur(e)
    URL.revokeObjectURL(apercu.url) // rien n'est gardé sur le téléphone
    arreter()
    p.fermer()
  }

  const consigne = p.piece.video ? t('Placez votre visage dans l’ovale, puis tournez lentement la tête de gauche à droite.') : visage ? t('Placez votre visage dans l’ovale : visage net, sans lunettes de soleil ni casque.') : t('Placez la pièce entière dans le cadre')
  const controles: [keyof Controles, string, string][] = [
    ['nettete', 'Netteté : bonne', 'Netteté : à revoir'],
    ['cadre', visage ? 'Cadrage : visage dans l’ovale' : 'Cadrage : pièce entière', visage ? 'Cadrage : visage à placer' : 'Cadrage : pièce à placer'],
    ['reflet', 'Reflet : aucun', 'Reflet : à éviter'],
  ]
  // Structure du prototype (activation, état « photo ») : en-tête sombre ✕ · pièce x sur 8, viseur au gabarit, trois
  // contrôles en pastilles, déclencheur rond, rappel « jamais la galerie ».
  return (
    <div className="l3-plein l3-cam" role="dialog" aria-modal="true" aria-label={p.titre}>
      <div className="row" style={{ justifyContent: 'space-between', paddingTop: 4 }}>
        <button type="button" className="l-ibtn l3-fermer" onClick={() => (arreter(), p.fermer())} aria-label={t('Fermer l’appareil photo')}>
          <Icone nom="x" taille={24} />
        </button>
        <div className="center">
          <div className="b8 t17">{p.titre}</div>
          <div className="t12" style={{ opacity: 0.8 }}>
            {tf('Pièce {x} sur {n}', { x: p.rang, n: p.total })}
          </div>
        </div>
        <span style={{ width: 44 }}></span>
      </div>

      <div className="cam-view">
        {etat === 'apercu' && apercu ? p.piece.video ? <video className="l3-flux" src={apercu.url} autoPlay loop muted playsInline /> : <img className="l3-flux" src={apercu.url} alt={t('Aperçu de la photo')} /> : <video className="l3-flux" ref={video} playsInline muted />}
        {(etat === 'direct' || etat === 'enregistre') && <div className={'frame' + (visage ? ' l3-ovale' : '')} style={visage ? undefined : { inset: '24% 7%' }} aria-hidden="true"></div>}
        {(etat === 'direct' || etat === 'enregistre') && <div className="cap-t">{consigne}</div>}
        {etat === 'demande' && <p className="l3-cam-msg">{t('Ouverture de l’appareil photo…')}</p>}
        {etat === 'refus' && (
          <div className="l3-cam-msg" role="alert">
            <Icone nom="camera-off" taille={32} />
            <p>{t('L’appareil photo n’est pas accessible. Autorisez la caméra pour BelivaY dans les réglages du téléphone, puis réessayez.')}</p>
            <Btn kind="white" icone="rotate-cw" onClick={() => void demarrer()}>
              {t('Réessayer')}
            </Btn>
          </div>
        )}
        {etat === 'enregistre' && (
          <p className="l3-cam-rec" role="status">
            <i /> {t('Enregistrement…')}
          </p>
        )}
      </div>

      {etat === 'direct' && (
        <>
          <div className="row wrap mt12" style={{ gap: 6, justifyContent: 'center' }} aria-label={t('Contrôles avant envoi')} role="group">
            {controles.map(([k, bon, mauvais]) => (
              <Pill key={k} ton={ctl[k] ? 'green' : 'dk'} icone={ctl[k] ? 'check' : 'circle-dashed'}>
                {t(ctl[k] ? bon : mauvais)}
              </Pill>
            ))}
          </div>
          <button type="button" className="shutter l3-shutter" disabled={!tousBons} onClick={() => void prendre()} aria-label={p.piece.video ? t('Enregistrer la vidéo') : t('Prendre la photo')}></button>
        </>
      )}
      {etat === 'apercu' && (
        <div className="btns mt14">
          <Btn kind="dark" icone="rotate-ccw" onClick={reprendre}>
            {t('Reprendre')}
          </Btn>
          <Btn kind="primary" icone="cloud-upload" off={occupe} onClick={() => void envoyer()}>
            {t('Envoyer')}
          </Btn>
        </div>
      )}
      {erreur && (
        <p className="l3-cam-erreur mt8" role="alert">
          {erreur}
        </p>
      )}
      <div className="t12 center mt8" style={{ color: 'rgba(255,255,255,.75)' }}>
        {t('Appareil photo de l’application · jamais la galerie')}
      </div>
    </div>
  )
}
