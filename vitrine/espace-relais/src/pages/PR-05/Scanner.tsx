// Scanner du QR présenté par le client (RET-02) : l'appareil photo de l'application lit le QR (BarcodeDetector quand le
// téléphone le permet) ; sinon, ou si l'appareil photo est refusé, le gérant tape les 6 chiffres. Le contenu lu part
// au serveur tel quel : jamais affiché. DÉMONSTRATION : l'application du client n'existe pas ici, la feuille propose
// donc les clients au relais qui « présentent » leur QR (signalé comme tel).
import { useEffect, useRef, useState } from 'react'
import { Feuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { CLASSES } from './commun'

interface Detecteur {
  detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
const DEMO = import.meta.env.VITE_SOURCE !== 'api'

export function Scanner(p: { ouverte: boolean; fermer: () => void; lu: (valeur: string) => void }) {
  const { t, tf } = usePreferences()
  const video = useRef<HTMLVideoElement>(null)
  const [etat, setEtat] = useState<'demarre' | 'vise' | 'indisponible'>('demarre')
  const [clients, setClients] = useState<{ colis: string; client: string; classe: 'S' | 'M' | 'L' }[]>([])
  useEffect(() => {
    if (!p.ouverte) return
    let flux: MediaStream | null = null
    let fini = false
    let minuteur = 0
    setEtat('demarre')
    const B = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detecteur }).BarcodeDetector
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('aucun appareil')
        flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (fini) return flux.getTracks().forEach((x) => x.stop())
        if (video.current) {
          video.current.srcObject = flux
          await video.current.play().catch(() => undefined)
        }
        if (!B) throw new Error('lecture impossible')
        const d = new B({ formats: ['qr_code'] })
        setEtat('vise')
        const lire = async () => {
          if (fini || !video.current) return
          const r = await d.detect(video.current).catch(() => [])
          if (r[0]?.rawValue) return p.lu(r[0].rawValue)
          minuteur = window.setTimeout(lire, 250)
        }
        void lire()
      } catch {
        if (!fini) setEtat('indisponible')
      }
    })()
    if (DEMO) void source.retrait.presentables().then((l) => !fini && setClients(l))
    return () => {
      fini = true
      window.clearTimeout(minuteur)
      flux?.getTracks().forEach((x) => x.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.ouverte])
  return (
    <Feuille ouverte={p.ouverte} fermer={p.fermer} titre={t('Scanner le QR du client')}>
      <div className="pr05-feuille">
        <h2 className="p-9j1bbu">{t('Scanner le QR du client')}</h2>
        <div className="pr05-visee">
          <video ref={video} muted playsInline aria-hidden="true" />
          <span className="pr05-cadre" aria-hidden="true" />
        </div>
        <p className="p-ug5qrn" role="status">
          {etat === 'indisponible' ? t('Appareil photo indisponible sur ce téléphone : tapez les 6 chiffres que le client montre.') : etat === 'vise' ? t('Visez le QR que le client montre dans son application : la lecture se fait toute seule.') : t('Ouverture de l’appareil photo…')}
        </p>
        <button type="button" className="p-rbzobc" onClick={p.fermer}>
          <Icone nom="keyboard" taille={18} className="p-emic6i" />
          {t('Saisir le code à la main')}
        </button>
        {DEMO && clients.length > 0 && (
          <div className="pr05-demo">
            <div className="p-yscrc8">{t('DÉMONSTRATION · LE CLIENT PRÉSENTE SON QR')}</div>
            <ul className="pr05-liste">
              {clients.map((c) => (
                <li key={c.colis}>
                  <button
                    type="button"
                    className="pr05-ligne"
                    onClick={async () => {
                      signal('toucher')
                      const q = await source.retrait.simulerPresentation(c.colis)
                      if (q) p.lu(q.valeur)
                    }}
                  >
                    <Icone nom="r-qr" taille={18} className="p-672m16" />
                    <span className="r-grow">{tf('{client} · colis {classe}', { client: c.client, classe: t(CLASSES[c.classe]) })}</span>
                    <span className="r-ref pr05-discret">{c.colis}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Feuille>
  )
}
