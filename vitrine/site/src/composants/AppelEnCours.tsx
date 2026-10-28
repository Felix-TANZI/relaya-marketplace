// Appel en cours (phase finale, consigne du porteur) — COMPOSANT COMMUN : même fichier dans chaque application qui
// passe des appels masqués (console, entreprise, et livreur, vendeur, relais, client s'ils en passent). Il ne dépend
// que de React et des préférences de l'application (t, tf) ; ses icônes et ses styles (AppelEnCours.css) sont à lui.
//
// Un appel masqué (DP-61 : jamais le vrai numéro, ni d'un côté ni de l'autre) ne bloque JAMAIS l'application :
// - lancerAppel({…}) ouvre l'appel en grand dans un panneau flottant, sans voile : la page reste utilisable dessous ;
// - « Réduire » le range en bulle (nom, durée, raccrocher), qui reste visible sur toutes les pages pendant qu'on
//   navigue ; un toucher sur la bulle le rouvre en grand ;
// - micro et haut-parleur (démonstration : l'état seul), « Noter l'appel » (la note de l'employé, jamais le contenu de
//   la conversation), raccrocher ; à la fin, la durée et la note sont rendues à l'appelant (noter, raccrocher), qui les
//   journalise à sa façon (journal d'audit de la console, journal de la mission de l'entreprise…).
// L'état vit hors des pages (magasin du module) : changer de page ne coupe pas l'appel. <AppelEnCours /> est monté une
// fois dans App.tsx, hors des routes.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { usePreferences } from '../preferences'
import './AppelEnCours.css'

export interface DemandeAppel {
  /** Nom affiché (« Aïcha N. », « Relais Obili ») : jamais un numéro. */
  nom: string
  /** Qui c'est (« Client », « Livreur », « Point relais »…), déjà traduit ou à traduire par t(). */
  qui?: string
  /** Pourquoi on appelle (« Explication du litige LT-0412 », « Déblocage du retrait »). */
  motif?: string
  /** Canal affiché (« Ligne masquée BelivaY » par défaut). */
  canal?: string
  /** Ligne d'aide sous l'appel en cours (par défaut, au vouvoiement : numéros masqués, on peut réduire). */
  pied?: string
  /** Fin de l'appel : durée en secondes (journal : qui, quand, combien de temps, jamais ce qui a été dit). */
  raccrocher?: (dureeS: number) => void | Promise<void>
  /** Le panneau disparaît dès qu'on raccroche (l'appli montre l'appel terminé ailleurs, sans note à prendre). */
  fermerAuRaccroche?: boolean
  /** Note de l'employé, enregistrée à sa demande (pendant ou après l'appel) ; un texte rendu est une erreur à afficher
   * (note refusée : trop courte…), rien rendu : note enregistrée. */
  noter?: (note: string, dureeS: number) => void | string | Promise<void | string>
}

interface Etat {
  id: number
  demande: DemandeAppel
  debut: number
  fin: number | null
  reduit: boolean
  micro: boolean
  hautParleur: boolean
  notes: string[]
}

let etat: Etat | null = null
let suivant = 1
const abonnes = new Set<() => void>()
const publier = (e: Etat | null) => {
  etat = e
  abonnes.forEach((f) => f())
}
const abonner = (f: () => void) => (abonnes.add(f), () => void abonnes.delete(f))

/** Ouvre un appel en grand. Un seul appel à la fois : s'il y en a déjà un en cours, il est rouvert en grand et
 * la demande est refusée (false). */
export function lancerAppel(demande: DemandeAppel): boolean {
  if (etat && etat.fin === null) {
    publier({ ...etat, reduit: false })
    return false
  }
  publier({ id: suivant++, demande, debut: Date.now(), fin: null, reduit: false, micro: true, hautParleur: false, notes: [] })
  return true
}

/** Rouvre en grand l'appel en cours (bouton « Afficher l'appel » d'une page). */
export function afficherAppel() {
  if (etat) publier({ ...etat, reduit: false })
}

/** L'appel en cours (ou terminé, tant que son panneau n'est pas fermé), pour les pages qui veulent le savoir. */
export function useAppel(): Etat | null {
  return useSyncExternalStore(abonner, () => etat, () => null)
}

const duree = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`
}

const initiales = (nom: string) =>
  nom
    .replace(/[^\p{L}\s-]/gu, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]!.toUpperCase())
    .join('')

// Icônes Lucide au trait, propres au composant (aucune dépendance au jeu d'icônes de l'application).
const TRACES: Record<string, string> = {
  phone:
    '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',
  'phone-off':
    '<path d="M10.1 13.9a14 14 0 0 0 3.732 2.668 1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2 18 18 0 0 1-12.728-5.272"/><path d="M22 2 2 22"/><path d="M4.76 13.582A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 .244.473"/>',
  mic: '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
  'mic-off':
    '<path d="M12 19v3"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M16.95 16.95A7 7 0 0 1 5 12v-2"/><path d="M18.89 13.23A7 7 0 0 0 19 12v-2"/><path d="m2 2 20 20"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>',
  'volume-2':
    '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
  'volume-1':
    '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'pen-line':
    '<path d="M13 21h8"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
}
function Ic({ nom, taille = 20 }: { nom: string; taille?: number }) {
  return <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TRACES[nom] ?? '' }} />
}

function useMaintenant(actif: boolean) {
  const [n, setN] = useState(() => Date.now())
  useEffect(() => {
    if (!actif) return
    const id = window.setInterval(() => setN(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [actif])
  return n
}

function Bouton({ ic, libelle, on, danger, onClick, children }: { ic: string; libelle: string; on?: boolean; danger?: boolean; onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" className={'ap-ctl' + (on ? ' on' : '') + (danger ? ' danger' : '')} aria-label={libelle} aria-pressed={on === undefined ? undefined : on} onClick={onClick}>
      <span className="ap-ctl-i">
        <Ic nom={ic} taille={22} />
      </span>
      <span className="ap-ctl-t">{children ?? libelle}</span>
    </button>
  )
}

/** Le panneau (en grand) ou la bulle (réduit) de l'appel en cours ; rien sans appel. Monté une fois dans App.tsx. */
export function AppelEnCours() {
  const { t, tf } = usePreferences()
  const a = useAppel()
  const maintenant = useMaintenant(!!a && a.fin === null)
  const [note, setNote] = useState('')
  const [ecrire, setEcrire] = useState(false)
  const [enregistree, setEnregistree] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const refNote = useRef<HTMLTextAreaElement>(null)
  const refPanneau = useRef<HTMLDivElement>(null)
  const refBulle = useRef<HTMLButtonElement>(null)
  const id = a?.id
  // Nouvel appel : brouillon vidé.
  useEffect(() => {
    setNote('')
    setEcrire(false)
    setEnregistree(false)
    setRefus(null)
  }, [id])
  useEffect(() => {
    if (ecrire) refNote.current?.focus()
  }, [ecrire])
  // Échap range le panneau en bulle (l'appel continue).
  useEffect(() => {
    if (!a || a.reduit) return
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && refPanneau.current?.contains(document.activeElement)) {
        e.preventDefault()
        reduire()
      }
    }
    document.addEventListener('keydown', touche)
    return () => document.removeEventListener('keydown', touche)
  })
  if (!a) return null
  const fini = a.fin !== null
  const ecoule = (a.fin ?? maintenant) - a.debut
  const secondes = Math.floor(ecoule / 1000)
  const changer = (m: Partial<Etat>) => etat && publier({ ...etat, ...m })
  function reduire() {
    changer({ reduit: true })
    window.setTimeout(() => refBulle.current?.focus(), 0)
  }
  const raccrocher = async () => {
    if (!etat || etat.fin !== null) return
    const fin = Date.now()
    publier(a.demande.fermerAuRaccroche ? null : { ...etat, fin, reduit: false })
    await a.demande.raccrocher?.(Math.floor((fin - a.debut) / 1000))
  }
  const enregistrer = async () => {
    const n = note.trim()
    if (!n) return
    const erreur = await a.demande.noter?.(n, secondes)
    if (typeof erreur === 'string') {
      setRefus(erreur)
      setEnregistree(false)
      return
    }
    setRefus(null)
    changer({ notes: [...a.notes, n] })
    setNote('')
    setEcrire(false)
    setEnregistree(true)
  }
  const fermer = () => publier(null)
  const qui = a.demande.qui ? t(a.demande.qui) : null
  const canal = t(a.demande.canal ?? 'Ligne masquée BelivaY')

  if (a.reduit)
    return (
      <div className="ap-bulle" role="region" aria-label={t('Appel en cours')}>
        <button ref={refBulle} type="button" className="ap-bulle-o" onClick={() => changer({ reduit: false })} aria-label={tf('Rouvrir l’appel avec {n}', { n: a.demande.nom })}>
          <span className={'ap-pt' + (fini ? ' fini' : '')} aria-hidden="true"></span>
          <span className="ap-bulle-n">{a.demande.nom}</span>
          <span className="ap-bulle-d" aria-live="off">
            {fini ? t('Terminé') : duree(ecoule)}
          </span>
          {!a.micro && !fini && (
            <span className="ap-bulle-m" aria-label={t('Micro coupé')}>
              <Ic nom="mic-off" taille={15} />
            </span>
          )}
        </button>
        {fini ? (
          <button type="button" className="ap-bulle-x" onClick={fermer} aria-label={t('Fermer')}>
            <Ic nom="x" taille={18} />
          </button>
        ) : (
          <button type="button" className="ap-bulle-r" onClick={() => void raccrocher()} aria-label={t('Raccrocher')}>
            <Ic nom="phone-off" taille={18} />
          </button>
        )}
      </div>
    )

  return (
    <div ref={refPanneau} className="ap-grand" role="region" aria-label={fini ? t('Appel terminé') : t('Appel en cours')}>
      <div className="ap-tete">
        <span className="ap-canal">
          <Ic nom="shield" taille={14} />
          {canal}
        </span>
        <button type="button" className="ap-reduire" onClick={fini ? fermer : reduire} aria-label={fini ? t('Fermer') : t('Réduire l’appel')}>
          <Ic nom={fini ? 'x' : 'chevron-down'} taille={22} />
        </button>
      </div>
      <div className="ap-qui">
        <span className={'ap-av' + (fini ? ' fini' : '')} aria-hidden="true">
          {initiales(a.demande.nom) || <Ic nom="phone" taille={22} />}
        </span>
        <div className="ap-qui-t">
          <strong>{a.demande.nom}</strong>
          {qui && <span>{qui}</span>}
        </div>
        <span className="ap-duree" aria-live="polite">
          {fini ? tf('Terminé · {d}', { d: duree(ecoule) }) : duree(ecoule)}
        </span>
      </div>
      {a.demande.motif && <p className="ap-motif">{a.demande.motif}</p>}
      {!fini && (
        <div className={'ap-ctls' + (a.demande.noter ? '' : ' ap-ctls-3')}>
          <Bouton ic={a.micro ? 'mic' : 'mic-off'} libelle={a.micro ? t('Couper le micro') : t('Rétablir le micro')} on={!a.micro} onClick={() => changer({ micro: !a.micro })}>
            {a.micro ? t('Micro') : t('Micro coupé')}
          </Bouton>
          <Bouton ic={a.hautParleur ? 'volume-2' : 'volume-1'} libelle={t('Haut-parleur')} on={a.hautParleur} onClick={() => changer({ hautParleur: !a.hautParleur })} />
          {a.demande.noter && <Bouton ic="pen-line" libelle={t('Noter l’appel')} on={ecrire} onClick={() => setEcrire((x) => !x)} />}
          <Bouton ic="phone-off" libelle={t('Raccrocher')} danger onClick={() => void raccrocher()} />
        </div>
      )}
      {a.demande.noter && (ecrire || fini) && (
        <div className="ap-note">
          <label className="ap-note-l" htmlFor={'ap-note-' + a.id}>
            {t('Note de l’appel')}
            <span>{t('Ce que vous retenez ou décidez ; jamais le contenu de la conversation.')}</span>
          </label>
          <textarea id={'ap-note-' + a.id} ref={refNote} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Ex. : client prévenu, retrait débloqué demain 10 h')} />
          <div className="ap-note-a">
            {refus && (
              <span className="ap-refus" role="alert">
                {refus}
              </span>
            )}
            {enregistree && !refus && <span className="ap-ok">{t('Note enregistrée')}</span>}
            <button type="button" className="ap-btn ap-btn-p" disabled={!note.trim()} onClick={() => void enregistrer()}>
              {t('Enregistrer la note')}
            </button>
          </div>
        </div>
      )}
      {enregistree && !refus && !ecrire && !fini && (
        <p className="ap-ok ap-ok-l" role="status">
          {t('Note enregistrée')}
        </p>
      )}
      {a.notes.length > 0 && (
        <ul className="ap-notes" aria-label={t('Notes de l’appel')}>
          {a.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      <p className="ap-pied">
        {fini
          ? tf('Appel noté au journal : durée {d}, sans contenu.', { d: duree(ecoule) })
          : (a.demande.pied ?? t('Numéros masqués des deux côtés. Vous pouvez réduire l’appel et continuer à naviguer.'))}
      </p>
      {fini && (
        <button type="button" className="ap-btn ap-fermer" onClick={fermer}>
          {t('Fermer')}
        </button>
      )}
    </div>
  )
}
