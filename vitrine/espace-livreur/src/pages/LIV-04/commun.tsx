// Éléments partagés par les écrans de la journée (LIV-04) : états de lecture, noms des formats et des types
// de paquet, heure du serveur qui avance (comptes à rebours), batterie du téléphone (lue ici, jamais transmise :
// LIV-P04R-05).
import { useEffect, useState } from 'react'
import { Icone } from '../../composants/Icone'
import { jourLong } from '../../i18n/temps'
import type { FormatKit } from '../../donnees/domaines/kit'
import type { FormatEmballage, TypePaquet } from '../../donnees/domaines/paquets'
import { usePreferences } from '../../preferences'

export function Chargement({ lignes = 3 }: { lignes?: number }) {
  const { t } = usePreferences()
  return (
    <div className="l4-charge" role="status" aria-live="polite">
      <span className="l4-sr">{t('Chargement…')}</span>
      {Array.from({ length: lignes }, (_, i) => (
        <i key={i} style={{ width: `${94 - i * 16}%` }} />
      ))}
    </div>
  )
}

export function ErreurLecture({ relire }: { relire: () => void }) {
  const { t } = usePreferences()
  return (
    <div className="l-carte l4-erreur" role="alert">
      <Icone nom="cloud-off" taille={24} />
      <div className="l-grow">
        <b>{t('Lecture impossible pour le moment')}</b>
        <p>{t('Vérifiez le réseau puis réessayez. Rien de ce que vous avez fait n’est perdu.')}</p>
      </div>
      <button type="button" className="l-btn l-second l4-court" onClick={relire}>
        <Icone nom="rotate-cw" taille={18} />
        <span>{t('Réessayer')}</span>
      </button>
    </div>
  )
}

export const TYPES_PAQUET: Record<TypePaquet, string> = {
  relais: 'Tournée relais',
  domicile: 'Course à domicile',
  collecte: 'Collecte au relais',
  retour: 'Course de retour',
  transfert: 'Transfert',
}

/** Nom d'un format d'emballage, au singulier ou au pluriel. */
export function nomFormat(f: FormatKit | FormatEmballage, n: number): string {
  if (f === 'origine') return n > 1 ? 'cartons d’origine filmés' : 'carton d’origine filmé'
  if (f === 'C1' || f === 'C2') return (n > 1 ? 'cartons ' : 'carton ') + f
  return (n > 1 ? 'pochettes ' : 'pochette ') + f
}

/** Heure du serveur qui avance (pas en ms), à partir de l'heure lue dans la session. */
export function useMaintenant(serveur: number, pas = 30_000): number {
  const [decalage] = useState(() => serveur - Date.now())
  const [n, setN] = useState(() => Date.now() + decalage)
  useEffect(() => {
    const id = setInterval(() => setN(Date.now() + decalage), pas)
    return () => clearInterval(id)
  }, [decalage, pas])
  return n
}

interface BatterieNavigateur {
  level: number
  charging: boolean
  addEventListener(t: string, f: () => void): void
  removeEventListener(t: string, f: () => void): void
}
/** Batterie du téléphone (pourcentage, en charge) ; null si le navigateur ne la donne pas. */
export function useBatterie(): { pourcent: number; enCharge: boolean } | null {
  const [b, setB] = useState<{ pourcent: number; enCharge: boolean } | null>(null)
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatterieNavigateur> }
    if (!nav.getBattery) return
    let bat: BatterieNavigateur | null = null
    let vivant = true
    const maj = () => bat && vivant && setB({ pourcent: Math.round(bat.level * 100), enCharge: bat.charging })
    nav
      .getBattery()
      .then((x) => {
        bat = x
        maj()
        x.addEventListener('levelchange', maj)
        x.addEventListener('chargingchange', maj)
      })
      .catch(() => undefined)
    return () => {
      vivant = false
      bat?.removeEventListener('levelchange', maj)
      bat?.removeEventListener('chargingchange', maj)
    }
  }, [])
  return b
}

/** « jeudi 3 septembre », avec l'année quand ce n'est pas l'année en cours (« vendredi 3 septembre 2027 »). */
export const jourAn = (ms: number, langue: 'fr' | 'en'): string => jourLong(ms, langue)
