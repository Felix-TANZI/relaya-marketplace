// Outils communs aux écrans de la tournée (LIV-05, LIV-06, LIV-07 ; kit partagé de src/composants/livraison) :
// - useRegles : paramètres de la tournée (registre, téléchargés avec le paquet) ;
// - useAgir : un geste métier avec son ORIGINE (clé d'idempotence, heure, position) ; en ligne il part tout de suite,
//   hors connexion il est mis en file avec sa charge (geste() : l'appel noté par la source `s`) ET appliqué à la copie
//   locale du paquet téléchargé, puis rejoué au retour du réseau avec la même clé (LIV-UIX-06) ; signal et vibration ;
// - usePositionMission : GPS du téléphone, suivi SEULEMENT pendant la mission (LIV-JOU-02), noté pour les origines ;
// - états communs : chargement, erreur (relire), rien à faire ici ;
// - formats : distance, durée, « il y a ».
import './livraison.css'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { Origine } from '../../donnees/communs'
import type { ReglesLivreur } from '../../donnees/domaines/tournee'
import type { TypeAction } from '../../donnees/domaines/horsligne'
import { geste, noterPosition, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source, type SourceLivreur } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'

let regles: Promise<ReglesLivreur> | null = null
/** Paramètres de la tournée : lus une fois (registre ; GET /config en production). */
export function useRegles(): ReglesLivreur | null {
  const [r, setR] = useState<ReglesLivreur | null>(null)
  useEffect(() => {
    let vivant = true
    ;(regles ??= source.tournee.regles()).then((x) => vivant && setR(x), () => (regles = null))
    return () => void (vivant = false)
  }, [])
  return r
}

/** Un geste métier : origine, file hors connexion, copie locale, signal. */
export function useAgir() {
  const enLigne = useEnLigne()
  const maintenant = useHorloge(1000)
  const [occupe, setOccupe] = useState(false)
  const agir = useCallback(
    async <T,>(type: TypeAction, objet: string, faire: (o: Origine, s: SourceLivreur) => Promise<T>): Promise<{ r: T; enFile: boolean } | null> => {
      const o = origine(maintenant)
      setOccupe(true)
      try {
        // Hors connexion : le geste part en file avec sa charge ; la copie locale du paquet l'applique dès maintenant.
        const g = await geste(enLigne, type, objet, o, (s) => faire(o, s), true)
        return { r: g.r, enFile: g.etat === 'en_file' }
      } catch {
        signal('erreur')
        return null
      } finally {
        setOccupe(false)
      }
    },
    [enLigne, maintenant],
  )
  return { agir, occupe, enLigne, maintenant }
}

/** Position du téléphone pendant la mission (jamais hors mission) : notée pour l'origine des gestes. */
export function usePositionMission(active: boolean) {
  const [pos, setPos] = useState<{ lat: number; lng: number; precisionM: number; a: number } | null>(null)
  const [etat, setEtat] = useState<'attente' | 'ok' | 'refus' | 'indisponible'>('attente')
  useEffect(() => {
    if (!active) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return setEtat('indisponible')
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const v = { lat: p.coords.latitude, lng: p.coords.longitude, precisionM: Math.round(p.coords.accuracy), a: p.timestamp || Date.now() }
        setPos(v)
        setEtat('ok')
        noterPosition(v)
      },
      (e) => setEtat(e.code === 1 ? 'refus' : 'indisponible'),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [active])
  return { pos, etat }
}

/** Tournée courante (lue dans la source, relue à chaque geste) : `charge` faux tant qu'elle n'est pas arrivée ;
 * `tournee` nul quand aucun paquet n'est affecté. */
export function useTournee() {
  const l = useLecture(() => source.tournee.courante().then((tournee) => ({ tournee })), [])
  return { tournee: l.donnees?.tournee ?? null, charge: l.donnees !== null, erreur: l.erreur, relire: l.relire }
}

// ---------- États communs ----------

export function Chargement() {
  const { t } = usePreferences()
  return (
    <div className="lv-charge" role="status" aria-label={t('Chargement')}>
      <div className="lv-os lv-os-h" />
      <div className="lv-os" />
      <div className="lv-os lv-os-c" />
    </div>
  )
}

export function Erreur({ relire }: { relire: () => void }) {
  const { t } = usePreferences()
  return (
    <section className="l-carte l-vide" role="alert">
      <div className="l-vide-i l-rouge">
        <Icone nom="cloud-off" taille={28} />
      </div>
      <h1>{t('Données indisponibles')}</h1>
      <p>{t('La tournée n’a pas pu être lue. Vos gestes déjà faits sont gardés sur le téléphone.')}</p>
      <button type="button" className="l-btn l-second lv-mt" onClick={relire}>
        <Icone nom="refresh-cw" taille={20} />
        {t('Réessayer')}
      </button>
    </section>
  )
}

/** Rien à faire sur cet écran maintenant (pas d'arrêt de ce type en cours) : retour à la tournée. */
export function RienIci({ titre, texte, icone = 'route' }: { titre: string; texte: string; icone?: string }) {
  const { t } = usePreferences()
  return (
    <section className="l-carte l-vide">
      <div className="l-vide-i">
        <Icone nom={icone} taille={28} />
      </div>
      <h1>{t(titre)}</h1>
      <p>{t(texte)}</p>
      <Link className="l-btn l-principal lv-mt" to={chemin('tournee')}>
        <Icone nom="route" taille={20} />
        {t('Revenir à la tournée')}
      </Link>
    </section>
  )
}

/** Message d'un geste refusé ou mis en file (annoncé aux lecteurs d'écran). */
export function Message({ ton, icone, children }: { ton: 'ok' | 'info' | 'alerte' | 'erreur'; icone?: string; children: ReactNode }) {
  const ic = icone ?? (ton === 'ok' ? 'circle-check' : ton === 'erreur' ? 'circle-alert' : ton === 'alerte' ? 'triangle-alert' : 'info')
  return (
    <div className={'lv-msg lv-' + ton} role={ton === 'erreur' || ton === 'alerte' ? 'alert' : 'status'}>
      <Icone nom={ic} taille={20} />
      <div>{children}</div>
    </div>
  )
}

// ---------- Formats ----------

export function distanceTexte(m: number, langue: 'fr' | 'en'): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`
  const km = (m / 1000).toFixed(1)
  return `${langue === 'fr' ? km.replace('.', ',') : km} km`
}
export function minutesTexte(min: number, langue: 'fr' | 'en'): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return langue === 'fr' ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${h} h ${String(m % 60).padStart(2, '0')} min`
}
/** « 1:05 » (minutes:secondes) pour un compteur d'attente. */
export const chrono = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Demande à garder l'écran allumé pendant une étape (QR présenté, appel) : refusé sans effet. */
export function useEcranAllume(actif: boolean) {
  useEffect(() => {
    if (!actif || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let verrou: { release(): Promise<void> } | null = null
    ;(navigator as unknown as { wakeLock: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock.request('screen').then(
      (v) => (verrou = v),
      () => undefined,
    )
    return () => void verrou?.release()
  }, [actif])
}

/** Longueur d'un trajet (mètres, grand cercle entre points successifs) : parcours affiché en fin de tournée. */
export function longueurTrajet(pts: { lat: number; lng: number }[]): number {
  const R = 6_371_000
  const rad = (x: number) => (x * Math.PI) / 180
  let d = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const s = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
    d += 2 * R * Math.asin(Math.sqrt(s))
  }
  return d
}
