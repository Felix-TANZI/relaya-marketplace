// Éléments partagés par les écrans d'accès (LIV-03) :
// - Chargement, ErreurLecture : états de lecture (jamais un écran faux) ;
// - Cases : les cases d'un PIN ou d'un code SMS, chiffres JAMAIS affichés en clair (LIV-03-R11, LIV-RG-R39) ;
// - Pave : pavé numérique 3 × 4 à grandes touches (≥ 52 px, LIV-UIX-02), touche Effacer ; le clavier physique marche
//   aussi (chiffres, retour arrière) ;
// - BasFixe : barre d'action collée en bas (bottom-cta du prototype) ; Visage : photo vérifiée ou initiales ;
// - useSecondes : compte à rebours à la seconde (renvoi du code, blocage, quiz) ;
// - parler : lecture vocale (cartes et questions de la certification, LIV-01-R047) dans la langue choisie.
import { useEffect, useState } from 'react'
import { Btn, Vide } from '../../composants/proto'
import type { IdPiece } from '../../donnees/domaines/acces'
import { jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'

export function Chargement({ lignes = 3 }: { lignes?: number }) {
  const { t } = usePreferences()
  return (
    <div className="l3-charge" role="status" aria-live="polite">
      <span className="l3-sr">{t('Chargement…')}</span>
      {Array.from({ length: lignes }, (_, i) => (
        <i key={i} style={{ width: `${92 - i * 18}%` }} />
      ))}
    </div>
  )
}

export function ErreurLecture({ relire }: { relire: () => void }) {
  const { t } = usePreferences()
  return (
    <div className="card" role="alert" style={{ marginTop: 14 }}>
      <Vide icone="cloud-off" t={t('Lecture impossible pour le moment')} s={t('Vérifiez le réseau puis réessayez. Rien de ce que vous avez fait n’est perdu.')}>
        <div className="btns liva-col mt12">
          <Btn kind="secondary" icone="rotate-cw" onClick={relire}>
            {t('Réessayer')}
          </Btn>
        </div>
      </Vide>
    </div>
  )
}

// Cases d'un code (C.otp) et pavé numérique (C.keypad) : ceux du kit commun, le même clavier pour tous les codes.
export { Cases, Pave } from '../../composants/proto'

/** Secondes restantes avant un instant (0 une fois passé), relues chaque seconde. */
export function useSecondes(jusqua: number | null, maintenant: () => number): number {
  const calc = () => (jusqua === null ? 0 : Math.max(0, Math.ceil((jusqua - maintenant()) / 1000)))
  const [s, setS] = useState(calc)
  useEffect(() => {
    setS(calc())
    if (jusqua === null) return
    const id = setInterval(() => setS(calc()), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jusqua])
  return s
}

/** « 29:41 » */
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Lecture vocale d'un texte (synthèse du téléphone) ; `fin` est appelé quand elle s'arrête. Faux si indisponible. */
export function parler(texte: string, langue: 'fr' | 'en', fin: () => void): boolean {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return false
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texte)
  u.lang = langue === 'en' ? 'en-GB' : 'fr-FR'
  u.rate = 0.95
  u.onend = fin
  u.onerror = fin
  speechSynthesis.speak(u)
  return true
}
export const taire = () => typeof speechSynthesis !== 'undefined' && speechSynthesis.cancel()

/** « jeudi 3 septembre », avec l'année quand ce n'est pas l'année en cours (« vendredi 3 septembre 2027 »). */
export const jourAn = (ms: number, langue: 'fr' | 'en'): string => jourLong(ms, langue)

/** Barre d'action collée en bas de l'écran : LA barre du kit commun (.bottom-cta du prototype, BarreAction). */
export { BarreAction as BasFixe } from '../../composants/proto'

/** Visage du livreur (photo vérifiée, sinon ses initiales) : rond plein, à la taille du bloc qui le contient. */
export function Visage({ photo, initiales }: { photo: string | null | undefined; initiales: string | undefined }) {
  return photo ? <img className="l3-visage" src={photo} alt="" /> : <span className="l3-visage l3-visage-i">{initiales ?? ''}</span>
}

/** Noms des pièces d'activation (LIV-P02). */
export const NOMS_PIECES: Record<IdPiece, string> = {
  cni_recto: 'CNI · recto',
  cni_verso: 'CNI · verso',
  selfie: 'Selfie vidéo · preuve de vie',
  permis: 'Permis de conduire',
  carte_grise: 'Carte grise du véhicule',
  vehicule: 'Photo du véhicule avec la plaque',
  assurance: 'Attestation d’assurance',
  profil: 'Photo de profil',
}
