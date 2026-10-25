// Scanner du comptoir : l'appareil photo s'ouvre EN PREMIER (viseur dans l'écran, sans quitter la page), lecture du QR
// toute seule (BarcodeDetector quand le téléphone le permet). Repli « Saisir le code » : le gros pavé (PaveCode), qui
// vérifie au dernier chiffre. Sans appareil photo (refusé, absent, lecture impossible), le pavé s'ouvre de lui-même.
// `continu` : la lecture reprend après chaque scan (réception d'un lot : colis après colis) ; un même contenu relu dans
// les 2,5 s est ignoré (le colis encore sous l'objectif). Le contenu lu part tel quel à l'écran qui l'a demandé :
// jamais affiché (un code de retrait n'est jamais vu par le gérant).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePreferences } from '../../preferences'
import { Icone } from '../Icone'
import './comptoir.css'

interface Detecteur {
  detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
type EtatCam = 'demarre' | 'vise' | 'indisponible' | 'pause'

export function ScanComptoir(p: {
  /** Consigne courte sous le viseur (« Visez le QR du client »). */
  consigne: string
  lu: (valeur: string) => void
  continu?: boolean
  /** Le pavé de saisie (repli), rendu quand « Saisir le code » est ouvert. */
  pave: ReactNode
  libelleSaisie?: string
  /** Lignes de démonstration (le client ou le livreur « présente » son QR). */
  demo?: ReactNode
  /** Coupe la caméra (feuille ouverte par-dessus, remise en cours). */
  arret?: boolean
}) {
  const { t } = usePreferences()
  const video = useRef<HTMLVideoElement>(null)
  const [etat, setEtat] = useState<EtatCam>('demarre')
  const [saisie, setSaisie] = useState(false)
  const lu = useRef(p.lu)
  lu.current = p.lu
  const dernier = useRef<{ v: string; a: number } | null>(null)
  const actif = !p.arret && !saisie
  useEffect(() => {
    if (!actif) return
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
        const d = new B({ formats: ['qr_code', 'code_128'] })
        setEtat('vise')
        const lire = async () => {
          if (fini || !video.current) return
          const r = await d.detect(video.current).catch(() => [])
          const v = r[0]?.rawValue
          const maintenant = Date.now()
          if (v && !(dernier.current && dernier.current.v === v && maintenant - dernier.current.a < 2500)) {
            dernier.current = { v, a: maintenant }
            lu.current(v)
            if (!p.continu) return
          }
          minuteur = window.setTimeout(lire, 250)
        }
        void lire()
      } catch {
        if (fini) return
        flux?.getTracks().forEach((x) => x.stop())
        setEtat('indisponible')
        setSaisie(true)
      }
    })()
    return () => {
      fini = true
      window.clearTimeout(minuteur)
      flux?.getTracks().forEach((x) => x.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif, p.continu])
  return (
    <div className="cpt-scan">
      {!saisie && (
        <div className="cpt-visee">
          <video ref={video} muted playsInline aria-hidden="true" />
          <span className="cpt-cadre" aria-hidden="true" />
          {p.continu && etat === 'vise' && <span className="cpt-ligne" aria-hidden="true" />}
        </div>
      )}
      <p className="cpt-consigne" role="status">
        {etat === 'indisponible' ? t('Appareil photo indisponible : tapez le code.') : saisie ? t('Tapez les chiffres : la vérification part toute seule.') : etat === 'vise' ? p.consigne : t('Ouverture de l’appareil photo…')}
      </p>
      {saisie && p.pave}
      {etat !== 'indisponible' && (
        <button type="button" className="cpt-bascule" onClick={() => setSaisie((x) => !x)} aria-expanded={saisie}>
          <Icone nom={saisie ? 'camera' : 'keyboard'} taille={20} />
          {saisie ? t('Revenir à l’appareil photo') : (p.libelleSaisie ?? t('Saisir le code'))}
        </button>
      )}
      {p.demo}
    </div>
  )
}
