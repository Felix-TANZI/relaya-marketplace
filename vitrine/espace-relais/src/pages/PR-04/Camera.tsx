// « Appareil photo de preuve » (PR-04 CAM-01 à CAM-06 ; v6 D15 ; PR-12 règle 7 : plein écran, sans en-tête ni barre).
// Structure du prototype (Camera · qr, Camera · photo) gardée : fermer, bascule QR / Photo, lampe ; en QR, cadre de visée
// et ligne de scan, consigne, « Saisir le code à la main » ; en photo, cadre guide, consigne de l'étape, déclencheur,
// vignette, compteur k / n. Ajouts des règles :
// - CAM-05 : autorisation demandée au premier usage avec une explication ; refus = aide pour la réactiver (et saisie à
//   la main en QR) ; l'étape photo reste bloquée tant que la photo n'est pas prise (D15) ;
// - CAM-01 : un seul scanner reconnaît le type de QR (code de dépôt du livreur, étiquette de colis, code de retrait du
//   client, étiquette de retour) ; ouvert par un écran (« pour »), il lui rend ce qu'il a lu (contrat : appareil.ts) ;
// - CAM-04 : jamais la galerie ; heure et position incrustées dans l'image ; compressée sous PHOTO-MAX-KO ; gardée sur
//   l'appareil jusqu'à l'envoi (file hors connexion) ;
// - sans appareil photo (ordinateur de démonstration), une image de démonstration est prise à la place.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { env } from '@client/config/env'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { noterPosition, origine } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { avecParametre, garderPhoto, imageDe, type PourPhoto, type PourScan } from './appareil'
import './pr04.css'

type EtatCam = 'explication' | 'ouverture' | 'video' | 'demo' | 'refusee' | 'indisponible'
const CLE_EXPLIQUEE = 'blv_r_camera_expliquee'

/** Consigne du mode photo selon l'étape (CAM-03). */
const CONSIGNES: Record<PourPhoto, string[]> = {
  lot: ['Photo du lot · tous les colis visibles'],
  reserve: ['Réserve · le problème en gros plan, étiquette visible'],
  refus: ['Refus · le colis entier, étiquette visible', 'Refus · le problème en gros plan'],
  en_trop: ['Colis en trop · colis entier, étiquette visible'],
  remise: ['Photo de remise · colis entier, étiquette visible'],
  deballage: ['Déballage devant le client · contenu visible'],
  constat: ['Constat · le colis entier, étiquette visible', 'Constat · le problème en gros plan'],
  retour: ['Retour · le colis entier, étiquette visible', 'Retour · le scellé en gros plan'],
  sortie: ['Sortie · les colis remis au livreur'],
}
const POUR_PHOTO = Object.keys(CONSIGNES) as PourPhoto[]
const POUR_SCAN: PourScan[] = ['depot', 'etiquette', 'retrait', 'retour']

/** Ce que dit un QR lu sans écran demandeur (CAM-01). */
type Lu = { type: 'depot' | 'retrait' | 'colis' | 'retour'; valeur: string } | { type: 'six_chiffres'; valeur: string } | { type: 'inconnu' }
function reconnaitre(v: string, longueur: number): Lu {
  const x = v.trim()
  if (/^BLV1\.[A-Za-z0-9+/_-]{8,}\.sig$/.test(x)) return { type: 'depot', valeur: x }
  if (new RegExp(`^BLV1\\.\\d{${longueur}}$`).test(x)) return { type: 'retrait', valeur: x }
  if (/^BLV-\d{5}-\d{1,2}$/i.test(x)) return { type: 'colis', valeur: x.toUpperCase() }
  if (/^RT-\d{3,6}$/i.test(x)) return { type: 'retour', valeur: x.toUpperCase() }
  if (new RegExp(`^\\d{${longueur}}$`).test(x.replace(/\s/g, ''))) return { type: 'six_chiffres', valeur: x.replace(/\s/g, '') }
  return { type: 'inconnu' }
}

/** Couleur d'un jeton (l'image de démonstration se dessine avec la palette, jamais une couleur écrite ici). */
const jeton = (nom: string) => getComputedStyle(document.documentElement).getPropertyValue(nom).trim() || 'gray'

function imageDemo(c: HTMLCanvasElement, consigne: string) {
  c.width = 960
  c.height = 720
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 960, 720)
  g.addColorStop(0, jeton('--acc-soft'))
  g.addColorStop(1, jeton('--acc-line'))
  x.fillStyle = g
  x.fillRect(0, 0, 960, 720)
  x.strokeStyle = jeton('--acc-txt')
  x.lineWidth = 3
  x.strokeRect(220, 180, 520, 380)
  x.fillStyle = jeton('--acc-txt')
  x.font = 'bold 36px system-ui, sans-serif'
  x.fillText(consigne.slice(0, 44), 48, 96)
}

export default function Camera() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const maintenant = useHorloge(1000)
  const regles = useLecture(() => source.reception.regles(), []).donnees
  const reglesFile = useLecture(() => source.horsligne.regles(), []).donnees

  const mode: 'qr' | 'photo' = params.get('mode') === 'photo' ? 'photo' : 'qr'
  const pourBrut = params.get('pour')
  const pourPhoto: PourPhoto = POUR_PHOTO.includes(pourBrut as PourPhoto) ? (pourBrut as PourPhoto) : 'remise'
  const pourScan = POUR_SCAN.includes(pourBrut as PourScan) ? (pourBrut as PourScan) : null
  const retour = params.get('retour')
  const retourSur = retour && retour.startsWith('/') && !retour.startsWith('//') ? retour : null
  const consignes = CONSIGNES[pourPhoto]
  const requises = Math.max(1, Math.min(Number(params.get('n')) || consignes.length, 6))

  const video = useRef<HTMLVideoElement>(null)
  const flux = useRef<MediaStream | null>(null)
  const [etat, setEtat] = useState<EtatCam>(() => {
    try {
      return localStorage.getItem(CLE_EXPLIQUEE) ? 'ouverture' : 'explication'
    } catch {
      return 'explication'
    }
  })
  const [lampe, setLampe] = useState<boolean | null>(null)
  const [annonce, setAnnonce] = useState('')
  const [manuel, setManuel] = useState(false)
  const [saisie, setSaisie] = useState('')
  const [choix, setChoix] = useState<string | null>(null) // 6 chiffres lus sans écran demandeur : dépôt ou retrait ?
  const [prises, setPrises] = useState<string[]>([])
  const [envoi, setEnvoi] = useState(false)
  const saisieRef = useRef<HTMLInputElement>(null)

  // Ouvre l'appareil photo (après l'explication du premier usage, CAM-05).
  useEffect(() => {
    if (etat !== 'ouverture') return
    let vivant = true
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined
    const sansAppareil = () => vivant && setEtat(env.source === 'api' ? 'indisponible' : 'demo')
    if (!md?.getUserMedia) {
      sansAppareil()
      return
    }
    md.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1600 } }, audio: false }).then(
      (s) => {
        if (!vivant) return s.getTracks().forEach((x) => x.stop())
        flux.current = s
        const cap = (s.getVideoTracks()[0]?.getCapabilities?.() ?? {}) as { torch?: boolean }
        setLampe(cap.torch ? false : null)
        if (video.current) {
          video.current.srcObject = s
          void video.current.play().catch(() => undefined)
        }
        setEtat('video')
      },
      (e: unknown) => {
        if (!vivant) return
        const nom = (e as { name?: string })?.name
        if (nom === 'NotAllowedError' || nom === 'SecurityError') {
          setEtat('refusee')
          signal('erreur')
        } else sansAppareil()
      },
    )
    return () => {
      vivant = false
    }
  }, [etat])
  useEffect(
    () => () => {
      flux.current?.getTracks().forEach((x) => x.stop())
      flux.current = null
    },
    [],
  )

  const fermer = retourSur ?? chemin('reception')
  // Échap ferme l'appareil photo (clavier de l'ordinateur de comptoir).
  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && naviguer(fermer)
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [fermer, naviguer])

  const autoriser = () => {
    try {
      localStorage.setItem(CLE_EXPLIQUEE, '1')
    } catch {
      /* rien */
    }
    setEtat('ouverture')
  }

  // ── Lecture d'un QR (ou d'une saisie à la main) ──
  const traiter = useCallback(
    (v: string) => {
      const valeur = v.trim()
      if (!valeur) return
      if (retourSur && pourScan) {
        signal('scan')
        naviguer(avecParametre(retourSur, 'scan', valeur), { replace: true })
        return
      }
      const lu = reconnaitre(valeur, regles?.codeLongueur ?? valeur.length)
      if (lu.type === 'inconnu') {
        signal('scanRefuse')
        setAnnonce(t('QR non reconnu : ce n’est ni une étiquette BelivaY, ni un code de retrait, ni un code de dépôt. Saisissez le code à la main.'))
        return
      }
      signal('scan')
      if (lu.type === 'six_chiffres') return setChoix(lu.valeur)
      if (lu.type === 'depot') naviguer(chemin('reception', { scan: lu.valeur }))
      else if (lu.type === 'retrait') naviguer(chemin('retrait', { scan: lu.valeur }))
      else if (lu.type === 'colis') naviguer(chemin('colis', { ref: lu.valeur }))
      else naviguer(chemin('litiges', { retour: lu.valeur }))
    },
    [retourSur, pourScan, naviguer, regles, t],
  )

  // Scanner du téléphone (BarcodeDetector quand il existe) : lecture toutes les 400 ms, sans geste.
  useEffect(() => {
    if (mode !== 'qr' || etat !== 'video') return
    const D = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!D) return
    const d = new D({ formats: ['qr_code', 'code_128'] })
    let fini = false
    const id = setInterval(() => {
      const v = video.current
      if (fini || !v || v.readyState < 2) return
      void d.detect(v).then((r) => {
        if (!fini && r[0]?.rawValue) {
          fini = true
          traiter(r[0].rawValue)
        }
      }, () => undefined)
    }, 400)
    return () => {
      fini = true
      clearInterval(id)
    }
  }, [mode, etat, traiter])

  const basculerLampe = () => {
    const piste = flux.current?.getVideoTracks()[0]
    if (!piste || lampe === null) {
      setAnnonce(etat === 'video' ? t('Pas de lampe sur cet appareil : approchez le colis d’une lumière.') : t('La lampe s’allume quand l’appareil photo est ouvert.'))
      return
    }
    void piste.applyConstraints({ advanced: [{ torch: !lampe } as MediaTrackConstraintSet] }).then(
      () => (setLampe(!lampe), setAnnonce(t(!lampe ? 'Lampe allumée' : 'Lampe éteinte'))),
      () => (setLampe(null), setAnnonce(t('Pas de lampe sur cet appareil : approchez le colis d’une lumière.'))),
    )
  }

  const changerMode = (m: 'qr' | 'photo') => {
    if (m === mode) return
    const s = new URLSearchParams(params)
    if (m === 'photo') s.set('mode', 'photo')
    else s.delete('mode')
    naviguer({ search: '?' + s.toString() }, { replace: true })
  }

  // ── Prise d'une photo de preuve ──
  const declencher = async () => {
    if (envoi || prises.length >= requises) return
    setEnvoi(true)
    try {
      const c = document.createElement('canvas')
      const v = video.current
      if (etat === 'video' && v && v.videoWidth) {
        const k = Math.min(1, 1280 / v.videoWidth)
        c.width = Math.round(v.videoWidth * k)
        c.height = Math.round(v.videoHeight * k)
        c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
      } else imageDemo(c, t(consignes[Math.min(prises.length, consignes.length - 1)]))
      // Position (seulement si déjà permise : aucune demande pendant le geste) et heure incrustées (CAM-04).
      const pos = await new Promise<string>((ok) => {
        const g = navigator.geolocation
        if (!g || !navigator.permissions?.query) return ok('—')
        navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(
          (p) =>
            p.state === 'granted'
              ? g.getCurrentPosition(
                  (x) => (noterPosition({ lat: x.coords.latitude, lng: x.coords.longitude, precisionM: Math.round(x.coords.accuracy) }), ok(`${x.coords.latitude.toFixed(5)}, ${x.coords.longitude.toFixed(5)}`)),
                  () => ok('—'),
                  { maximumAge: 30_000, timeout: 3000 },
                )
              : ok('—'),
          () => ok('—'),
        )
      })
      const x = c.getContext('2d')!
      const bande = Math.round(c.height * 0.08)
      x.fillStyle = jeton('--noir-55')
      x.fillRect(0, c.height - bande, c.width, bande)
      x.fillStyle = jeton('--camera-ink')
      x.font = `600 ${Math.round(bande * 0.42)}px system-ui, sans-serif`
      x.fillText(`BelivaY · ${heure(maintenant, langue)} · ${pos}`, Math.round(bande * 0.4), c.height - Math.round(bande * 0.35))
      // Compression sous le plafond du registre (PHOTO-MAX-KO).
      const max = (reglesFile?.photoMaxKo ?? regles?.photoMaxKo ?? 0) * 1024
      let q = 0.82
      let url = c.toDataURL('image/jpeg', q)
      const taille = (u: string) => Math.floor((u.length - u.indexOf(',') - 1) * 0.75)
      while (max > 0 && taille(url) > max && q > 0.3) {
        q -= 0.12
        url = c.toDataURL('image/jpeg', q)
      }
      const id = garderPhoto(url, origine(maintenant).cle)
      const toutes = [...prises, id]
      setPrises(toutes)
      signal('succes')
      setAnnonce(tf('Photo {k} sur {n} prise', { k: toutes.length, n: requises }))
      if (toutes.length >= requises) naviguer(avecParametre(retourSur ?? chemin('reception'), 'photos', toutes.join(',')), { replace: true })
    } finally {
      setEnvoi(false)
    }
  }

  const valider = (e: FormEvent) => {
    e.preventDefault()
    if (!saisie.trim()) {
      setAnnonce(t('Saisissez le code ou la référence lue sur l’étiquette.'))
      saisieRef.current?.focus()
      return
    }
    traiter(saisie)
  }
  const ouvrirSaisie = () => {
    setManuel((m) => !m)
    setTimeout(() => saisieRef.current?.focus(), 0)
  }

  const visible = etat === 'video' || etat === 'demo'
  const derniere = imageDe(prises[prises.length - 1])
  const consigne = consignes[Math.min(prises.length, consignes.length - 1)]

  return (
    <Ecran route="camera">
      <div className="p-qbrz47">
        <div className="p-0ftriw" />
        <video ref={video} className={'r4-video' + (etat === 'video' ? ' on' : '')} playsInline muted aria-hidden="true" />
        <div className="p-ino8of">
          <Link to={fermer} aria-label={t('Fermer')} className="p-src5ei r4-cible">
            <Icone nom="r-fermer" taille={20} className="p-i3112e" />
          </Link>
          <div className="p-9nc58m" role="group" aria-label={t('Mode de l’appareil photo')}>
            <button type="button" className={(mode === 'qr' ? 'p-0os0tj' : 'p-8r88o0') + ' r4-cible'} aria-pressed={mode === 'qr'} onClick={() => changerMode('qr')}>
              {t('QR')}
            </button>
            <button type="button" className={(mode === 'photo' ? 'p-0os0tj' : 'p-8r88o0') + ' r4-cible'} aria-pressed={mode === 'photo'} onClick={() => changerMode('photo')}>
              {t('Photo')}
            </button>
          </div>
          <button type="button" aria-label={t('Lampe')} aria-pressed={lampe === true} className="p-rxqb0j r4-cible" onClick={basculerLampe}>
            <Icone nom="r-oeil" taille={20} className="p-i3112e" />
          </button>
        </div>

        {!visible && (
          <div className="r4-cam-centre">
            {etat === 'explication' && (
              <div className="r4-cam-carte">
                <Icone nom="r-appareil-photo" taille={30} />
                <h1>{t('Autorisez l’appareil photo')}</h1>
                <p>{t('Il sert au scan des étiquettes et des codes, et aux photos de preuve à chaque changement de main. Les photos sont prises ici, jamais dans votre galerie, avec l’heure et le lieu.')}</p>
                <button type="button" className="r-btn r-principal" onClick={autoriser}>
                  <Icone nom="r-appareil-photo" taille={20} />
                  <span>{t('Autoriser l’appareil photo')}</span>
                </button>
              </div>
            )}
            {etat === 'ouverture' && (
              <div className="r4-cam-carte" role="status">
                <p>{t('Ouverture de l’appareil photo…')}</p>
              </div>
            )}
            {(etat === 'refusee' || etat === 'indisponible') && (
              <div className="r4-cam-carte" role="alert">
                <Icone nom="r-alerte" taille={30} />
                <h1>{t(etat === 'refusee' ? 'L’appareil photo est refusé' : 'Pas d’appareil photo')}</h1>
                {etat === 'refusee' ? (
                  <ol>
                    <li>{t('Touchez le cadenas à gauche de l’adresse (ou les réglages du navigateur).')}</li>
                    <li>{t('Ouvrez « Autorisations », puis « Appareil photo ».')}</li>
                    <li>{t('Choisissez « Autoriser », puis revenez ici.')}</li>
                  </ol>
                ) : (
                  <p>{t('Ce téléphone ne donne pas accès à un appareil photo. Utilisez le téléphone du comptoir.')}</p>
                )}
                <p>{t(mode === 'photo' ? 'Sans photo, l’étape reste bloquée : c’est la preuve du changement de main.' : 'Vous pouvez saisir le code à la main en attendant.')}</p>
                <button type="button" className="r-btn r-principal" onClick={() => setEtat('ouverture')}>
                  <Icone nom="r-reseau" taille={20} />
                  <span>{t('Réessayer')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'qr' && visible && (
          <>
            <div className="p-9ulogy" aria-hidden="true">
              <span className="p-yq2hxg" />
              <span className="p-un9ob5" />
              <span className="p-eu8j8o" />
              <span className="p-w5w4if" />
              <div className="p-ddbdz3" />
            </div>
            <div className="p-ofabty">
              <div className="p-nlvkht">{t(pourScan === 'depot' ? 'Visez le QR du livreur' : 'Visez le QR du colis ou du client')}</div>
              <div className="p-bfhcyb">
                {pourScan === 'depot' ? tf('Le QR du livreur porte son code de dépôt ; il est aussi écrit en {n} chiffres sous le QR.', { n: regles?.codeLongueur ?? '' }) : t('Le scan se fait tout seul. Étiquette de colis, code de retrait du client ou étiquette de retour : le même scanner reconnaît le type. Le lot du livreur se reçoit avec son code de dépôt.')}
              </div>
              {etat === 'demo' && <div className="r4-cam-note">{t('Démonstration : pas d’appareil photo sur cet appareil, saisissez le code à la main.')}</div>}
            </div>
          </>
        )}

        {mode === 'photo' && visible && (
          <>
            <div className="p-16kuuv" aria-hidden="true" />
            <div className="p-d6195a">
              <span className="p-axlehq">{t(consigne)}</span>
            </div>
            <div className="p-6760bi">
              {t('L’étape reste bloquée tant que la photo n’est pas prise. Envoi automatique, même hors connexion.')}
              {etat === 'demo' && <span className="r4-cam-note">{t('Démonstration : une image de démonstration est prise à la place.')}</span>}
            </div>
            <div className="p-f2knp8">
              {derniere ? <img className="p-geztyr r4-vignette" src={derniere} alt={t('Dernière photo prise')} /> : <div className="p-geztyr" aria-hidden="true" />}
              <button type="button" aria-label={tf('Prendre la photo {k} sur {n}', { k: Math.min(prises.length + 1, requises), n: requises })} className="p-z2h8bl" onClick={() => void declencher()} disabled={envoi}>
                <span className="p-kq3wz3" />
              </button>
              <span className="p-5ylbgv" aria-hidden="true">
                {`${prises.length} / ${requises}`}
              </span>
            </div>
          </>
        )}

        {mode === 'qr' && etat !== 'explication' && etat !== 'ouverture' && (
          <div className="p-dax1hi">
            {choix ? (
              <div className="r4-cam-choix" role="group" aria-label={t('Quel code est-ce ?')}>
                <p>{tf('{n} chiffres : de qui vient ce code ?', { n: choix.length })}</p>
                <button type="button" className="r-btn r-principal" onClick={() => naviguer(chemin('reception', { scan: choix }))}>
                  {t('Code de dépôt du livreur')}
                </button>
                <button type="button" className="r-btn r-second" onClick={() => naviguer(chemin('retrait', { scan: choix }))}>
                  {t('Code de retrait du client')}
                </button>
              </div>
            ) : manuel ? (
              <form className="r4-cam-saisie" onSubmit={valider}>
                <label htmlFor="r4-saisie">{pourScan === 'depot' ? tf('Code de dépôt ({n} chiffres)', { n: regles?.codeLongueur ?? '' }) : t('Code, ou référence de l’étiquette')}</label>
                <div className="r4-ligne">
                  <input
                    id="r4-saisie"
                    ref={saisieRef}
                    value={saisie}
                    onChange={(e) => setSaisie(e.target.value)}
                    inputMode={pourScan === 'depot' || pourScan === 'retrait' ? 'numeric' : 'text'}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                  <button type="submit" className="r-btn r-principal r4-court">
                    {t('Valider')}
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" className="p-nrbwx0 r4-cible" aria-expanded={manuel} onClick={ouvrirSaisie}>
                {t('Saisir le code à la main')}
              </button>
            )}
          </div>
        )}
        <div className="r4-annonce" aria-live="polite" role="status">
          {annonce}
        </div>
      </div>
    </Ecran>
  )
}
