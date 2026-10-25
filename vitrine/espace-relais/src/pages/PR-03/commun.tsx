// Éléments partagés par les écrans d'accès (PR-03), dans le balisage du prototype :
// - Chargement, ErreurLecture : états de lecture (jamais un écran faux) ;
// - Points + Pave : les points d'un PIN (« p-j3bvre », pleins « p-au0k5d », vides « p-3z2zrb ») et le pavé 3 × 4
//   (« p-a71a3h », touches « p-3ml6k6 » de 56 px) ; chiffres JAMAIS affichés ; le clavier physique marche aussi ;
// - Note : message en ligne (erreur, attente, succès) annoncé aux lecteurs d'écran ;
// - Progression : la barre en segments du prototype (« p-oqlq8x »), annoncée « étape n sur N » ;
// - useSecondes, mmss : comptes à rebours (renvoi du code, blocage) ;
// - useMaintenant : heure du serveur qui avance (décalage mesuré sur la session) ;
// - PiedRelais : liens du pied des pages d'accès (aide, installation, conditions, confidentialité).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AccesEtapes, AccesLiens } from '@client/compte/acces'
import { COORDONNEES } from '@client/config/coordonnees'
import { chemin } from '../../config/pages'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

export function Chargement() {
  const { t } = usePreferences()
  return (
    <div className="pr3-charge" role="status" aria-live="polite">
      <span className="pr3-sr">{t('Chargement…')}</span>
      <i />
      <i />
      <i />
    </div>
  )
}

export function ErreurLecture({ relire }: { relire: () => void }) {
  const { t } = usePreferences()
  return (
    <div className="p-yi6rkz" role="alert">
      <div className="r-vide">
        <div className="r-vide-i r-rouge">
          <Icone nom="cloud-off" taille={28} />
        </div>
        <h2>{t('Lecture impossible pour le moment')}</h2>
        <p>{t('Vérifiez le réseau puis réessayez. Rien de ce que vous avez fait n’est perdu.')}</p>
      </div>
      <button type="button" className="p-rbzobc" onClick={relire}>
        <Icone nom="rotate-cw" taille={18} className="p-emic6i" />
        {t('Réessayer')}
      </button>
    </div>
  )
}

export type Ton = 'rouge' | 'ambre' | 'vert' | 'accent'
const ICONE_TON: Record<Ton, string> = { rouge: 'circle-alert', ambre: 'triangle-alert', vert: 'circle-check', accent: 'info' }

/** Message en ligne : une icône et un texte, annoncé (alerte pour une erreur, statut sinon). */
export function Note({ ton, children, id }: { ton: Ton; children: ReactNode; id?: string }) {
  return (
    <div id={id} className={'pr3-note r-ton-' + (ton === 'accent' ? 'accent' : ton)} role={ton === 'rouge' ? 'alert' : 'status'} aria-live={ton === 'rouge' ? 'assertive' : 'polite'}>
      <Icone nom={ICONE_TON[ton]} taille={18} />
      <div>{children}</div>
    </div>
  )
}

/** Barre de progression en segments (INS-01 : 5 segments ; invitation : 4). */
export function Progression({ etapes, actuelle }: { etapes: string[]; actuelle: number }) {
  const { tf } = usePreferences()
  // Gabarit d'accès commun : « Étape n sur N · libellé » puis la barre ; aucun libellé coupé à la syllabe.
  return <AccesEtapes etapes={etapes} actuelle={actuelle} libelle={(n, total) => tf('Étape {n} sur {total}', { n, total })} />
}

/** Points du PIN : chiffres jamais montrés ; annonce « n chiffres sur N ». */
export function Points({ n, total, erreur }: { n: number; total: number; erreur?: boolean }) {
  const { tf } = usePreferences()
  return (
    <div className={'p-j3bvre' + (erreur ? ' pr3-secoue' : '')} role="status" aria-live="polite">
      <span className="pr3-sr">{tf('{n} chiffres sur {total}', { n, total })}</span>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < n ? 'p-au0k5d' : 'p-3z2zrb'} aria-hidden="true" />
      ))}
    </div>
  )
}

/** Pavé numérique du prototype (1-9, vide, 0, effacer) ; le clavier physique marche aussi tant qu'il est affiché. */
export function Pave({ ajouter, effacer, actif = true, saisis = 1 }: { ajouter: (c: string) => void; effacer: () => void; actif?: boolean; saisis?: number }) {
  const { t } = usePreferences()
  useEffect(() => {
    if (!actif) return
    const clavier = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return
      if (/^\d$/.test(e.key)) ajouter(e.key)
      else if (e.key === 'Backspace') effacer()
    }
    window.addEventListener('keydown', clavier)
    return () => window.removeEventListener('keydown', clavier)
  }, [actif, ajouter, effacer])
  const touche = (c: string) => (
    <button key={c} type="button" aria-label={c} className="p-3ml6k6" disabled={!actif} onClick={() => ajouter(c)}>
      {c}
    </button>
  )
  return (
    <div className="p-a71a3h">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(touche)}
      <span />
      {touche('0')}
      <button type="button" aria-label={t('Effacer')} className="p-3ml6k6" disabled={!actif || saisis === 0} onClick={effacer}>
        {'⌫'}
      </button>
    </div>
  )
}

/** Saisie d'un code chiffre par chiffre (PIN) : la saisie vit dans une référence (une seule validation par code). */
export function useSaisie(longueur: number, valider?: (v: string) => void) {
  const [v, setAffiche] = useState('')
  const ref = useRef('')
  const poser = (x: string) => {
    ref.current = x
    setAffiche(x)
  }
  const ajouter = useCallback(
    (c: string) => {
      if (ref.current.length >= longueur) return
      const y = ref.current + c
      poser(y)
      signal('toucher')
      if (y.length === longueur && valider) setTimeout(() => valider(y), 0)
    },
    [longueur, valider],
  )
  const effacer = useCallback(() => poser(ref.current.slice(0, -1)), [])
  const vider = useCallback(() => poser(''), [])
  return { v, ajouter, effacer, vider }
}

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

/** « 14:59 » */
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Heure du serveur qui avance : décalage mesuré sur la session à l'ouverture de l'écran. */
export function useMaintenant(): () => number {
  const s = useSession()
  const d = useRef(s.maintenant - Date.now())
  return useCallback(() => Date.now() + d.current, [])
}

/** Écrit un numéro de 9 chiffres comme au Cameroun : « 6 77 24 53 10 ». */
export const ecrireNumero = (n: string) => {
  const c = n.replace(/\D/g, '').slice(0, 9)
  return [c.slice(0, 1), c.slice(1, 3), c.slice(3, 5), c.slice(5, 7), c.slice(7, 9)].filter(Boolean).join(' ')
}

/** Pied des pages d'accès du relais : aide, installation sur le téléphone, conditions, confidentialité. */
export function PiedRelais() {
  const { t } = usePreferences()
  return (
    <AccesLiens label={t('Liens utiles')}>
      <a href={COORDONNEES.whatsapp} target="_blank" rel="noreferrer">
        {t('Aide et contact')}
      </a>
      <Link to={chemin('installer')}>{t('Installer l’application sur ce téléphone')}</Link>
      <a href="/cgu">{t('Conditions')}</a>
      <a href="/legal-doc?d=confidentialite">{t('Confidentialité')}</a>
    </AccesLiens>
  )
}
