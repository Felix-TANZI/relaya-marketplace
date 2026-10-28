// Recherche lancée par un scan (ENT-P15, motif M18) : la caméra de l'appareil lit le QR ou le code-barres de
// l'étiquette (BarcodeDetector du navigateur) ; sans caméra ni lecteur, la saisie du numéro d'étiquette. Le code lu
// part dans la recherche de la page ; rien n'est envoyé ni gardé (aucune image enregistrée).
import { useEffect, useRef, useState } from 'react'
import { Feuille } from '@client/composants/Feuille'
import { sonner } from '../../composants/marque-sonore'
import { Icone } from '../../composants/Icone'
import { usePreferences } from '../../preferences'

interface Lecteur {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}
type ConstructeurLecteur = new (o?: { formats?: string[] }) => Lecteur

/** Vrai si l'appareil peut lire un code à la caméra (lecteur du navigateur et accès à la caméra). */
export function scanPossible(): boolean {
  return typeof window !== 'undefined' && typeof (window as { BarcodeDetector?: unknown }).BarcodeDetector === 'function' && !!navigator.mediaDevices?.getUserMedia
}

export function FeuilleScan({ ouverte, fermer, lu }: { ouverte: boolean; fermer(): void; lu(code: string): void }) {
  const { t } = usePreferences()
  const video = useRef<HTMLVideoElement>(null)
  const [camera, setCamera] = useState<'arret' | 'active' | 'refusee'>('arret')
  const [saisie, setSaisie] = useState('')
  const possible = scanPossible()

  useEffect(() => {
    if (!ouverte || !possible) return
    let flux: MediaStream | null = null
    let fini = false
    let minuteur = 0
    const Ctor = (window as unknown as { BarcodeDetector: ConstructeurLecteur }).BarcodeDetector
    const lecteur = new Ctor({ formats: ['qr_code', 'code_128', 'ean_13'] })
    ;(async () => {
      try {
        flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (fini) return flux.getTracks().forEach((p) => p.stop())
        if (video.current) {
          video.current.srcObject = flux
          await video.current.play().catch(() => undefined)
        }
        setCamera('active')
        const boucle = async () => {
          if (fini || !video.current) return
          try {
            const r = await lecteur.detect(video.current)
            if (r[0]?.rawValue) {
              sonner('scan')
              lu(r[0].rawValue)
              return
            }
          } catch {
            /* image pas prête */
          }
          minuteur = window.setTimeout(boucle, 300)
        }
        void boucle()
      } catch {
        setCamera('refusee')
      }
    })()
    return () => {
      fini = true
      window.clearTimeout(minuteur)
      flux?.getTracks().forEach((p) => p.stop())
      setCamera('arret')
    }
  }, [ouverte, possible, lu])

  const valider = (e: React.FormEvent) => {
    e.preventDefault()
    if (saisie.trim()) lu(saisie.trim())
    setSaisie('')
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Scanner une étiquette')}>
      <div className="grab"></div>
      <h2 className="lv-h2">
        <Icone nom="scan-line" taille={18} />
        {t('Scanner une étiquette')}
      </h2>
      {possible && camera !== 'refusee' ? (
        <div className="lv-scan">
          <video ref={video} muted playsInline aria-label={t('Image de la caméra')} />
          <span className="lv-scan-cadre" aria-hidden="true" />
          <p className="lv-s">{camera === 'active' ? t('Visez le QR ou le code-barres de l’étiquette.') : t('Ouverture de la caméra…')}</p>
        </div>
      ) : (
        <p className="lv-s">{camera === 'refusee' ? t('La caméra n’est pas accessible : saisissez le numéro de l’étiquette.') : t('Cet appareil ne lit pas les codes à la caméra : saisissez le numéro de l’étiquette.')}</p>
      )}
      <form className="lv-scan-saisie" onSubmit={valider}>
        <label className="champ">
          <span>{t('Numéro de l’étiquette')}</span>
          <input className="lv-ta" style={{ minHeight: 44 }} value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="BV 24 8101" autoComplete="off" inputMode="text" />
        </label>
        <div className="btns mt10">
          <button type="submit" className="btn primary" disabled={!saisie.trim()}>
            <Icone nom="search" taille={18} />
            {t('Chercher ce colis')}
          </button>
          <button type="button" className="btn ghost" onClick={fermer}>
            {t('Fermer')}
          </button>
        </div>
      </form>
    </Feuille>
  )
}
