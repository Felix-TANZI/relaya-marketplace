// Briques propres au groupe S1 (File d'action, litige, commandes, vue d'ensemble, quatre yeux, recherche), sur les
// classes de la console du prototype (admA-*) : type d'une carte de file, échéance, verrou, panneau hors périmètre,
// preuve photo d'un changement de main. Styles complémentaires : ./s1.css (jetons seulement).
import { useId, type ReactNode } from 'react'
import type { Fonction } from '../../composants/Fonctions'
import { droitDe } from '../../config/droits'
import { chemin } from '../../config/pages'
import { PARAMETRES } from '../../calculs/registre'
import type { FamilleCarte } from '../../donnees/domaines/files'
import type { PreuveGarde } from '../../donnees/domaines/litiges'
import { Icone } from '../../composants/Icone'
import { Heure, Quand } from '../../composants/LigneJournal'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import './s1.css'

/** Type de carte : libellé, icône, couleur du rail et du texte (ADMA_TY du prototype, étendu aux nouvelles files). */
export const FAMILLES: Record<FamilleCarte, { t: string; i: string; c: string; x: string }> = {
  litige: { t: 'Litige', i: 'scale', c: 'var(--red)', x: 'var(--red)' },
  recours: { t: 'Recours', i: 'gavel', c: 'var(--violet)', x: 'var(--violet-txt)' },
  remboursement: { t: 'Argent', i: 'banknote', c: 'var(--green)', x: 'var(--green)' },
  kyc: { t: 'KYC', i: 'id-card', c: 'var(--acc)', x: 'var(--acc-txt)' },
  piece: { t: 'Pièce', i: 'file-check', c: 'var(--acc)', x: 'var(--acc-txt)' },
  moderation: { t: 'Modération', i: 'badge-check', c: 'var(--blue)', x: 'var(--blue)' },
  score: { t: 'Score', i: 'gauge', c: 'var(--gold)', x: 'var(--amber)' },
  support: { t: 'Support', i: 'life-buoy', c: 'var(--blue)', x: 'var(--blue)' },
  livraison: { t: 'Livraison', i: 'truck', c: 'var(--or)', x: 'var(--or-txt)' },
  retour: { t: 'Retour', i: 'undo-2', c: 'var(--or)', x: 'var(--or-txt)' },
  depart: { t: 'Départ', i: 'log-out', c: 'var(--amber)', x: 'var(--amber)' },
  kit: { t: 'Kit', i: 'shopping-bag', c: 'var(--amber)', x: 'var(--amber)' },
  fraude: { t: 'Fraude', i: 'shield-alert', c: 'var(--red)', x: 'var(--red)' },
  quatreyeux: { t: 'Quatre yeux', i: 'users', c: 'var(--acc)', x: 'var(--acc-txt)' },
  finance: { t: 'Finance', i: 'landmark', c: 'var(--green)', x: 'var(--green)' },
  candidature: { t: 'Candidature', i: 'user-plus', c: 'var(--acc)', x: 'var(--acc-txt)' },
  sanction: { t: 'Sanction', i: 'gavel', c: 'var(--violet)', x: 'var(--violet-txt)' },
  messagerie: { t: 'Message', i: 'send', c: 'var(--blue)', x: 'var(--blue)' },
  relais: { t: 'Relais', i: 'package-check', c: 'var(--or)', x: 'var(--or-txt)' },
  panne: { t: 'Panne', i: 'siren', c: 'var(--red)', x: 'var(--red)' },
  equipe: { t: 'Équipe', i: 'users', c: 'var(--ink-3)', x: 'var(--ink-2)' },
  systeme: { t: 'Système', i: 'timer', c: 'var(--ink-3)', x: 'var(--ink-2)' },
}

/** Durée courte à la minute (« 12 min », « 3 h 20 », « 2 j 17 h ») : ancienneté et échéance des cartes. */
export function useDuree() {
  const { tf } = usePreferences()
  return (ms: number) => {
    const m = Math.max(0, Math.round(ms / 60_000))
    const j = Math.floor(m / 1440)
    const h = Math.floor((m % 1440) / 60)
    if (j >= 1) return tf('{j} j {h} h', { j, h })
    if (h >= 1) return tf('{h} h {m}', { h, m: String(m % 60).padStart(2, '0') })
    return tf('{m} min', { m })
  }
}

/** « depuis 12 min » : ancienneté d'un dossier, à l'heure du serveur. */
export function Depuis({ le }: { le: number }) {
  const { tf } = usePreferences()
  const n = useHorloge()
  const restant = useDuree()
  return (
    <span className="ag">
      <Icone nom="clock" taille={12} style={{ verticalAlign: -2 }} /> {tf('depuis {d}', { d: restant(Math.max(0, n - le)) })}
    </span>
  )
}

/** Échéance d'une carte : dépassée (rouge, « dépassée de … »), proche (ambre), ou temps restant et heure limite. */
export function Echeance({ fin, proche = 4 * 3_600_000 }: { fin: number | null; proche?: number }) {
  const { t, tf } = usePreferences()
  const n = useHorloge()
  const restant = useDuree()
  if (fin === null)
    return (
      <span className="due">
        <Icone nom="hourglass" taille={13} />
        {t('Sans échéance')}
      </span>
    )
  const ms = fin - n
  return (
    <span className={'due ' + (ms <= 0 ? 'late' : ms < proche ? 'hot' : '')}>
      <Icone nom={ms <= 0 ? 'alarm-clock' : 'hourglass'} taille={13} />
      {ms <= 0 ? tf('Échéance dépassée de {d}', { d: restant(-ms) }) : <>{tf('{d} · limite', { d: restant(ms) })}&nbsp;<Heure le={fin} /></>}
    </span>
  )
}

/** Verrou d'un dossier (« En cours · Clarisse Mvondo », « Vous · jusqu'à 14 h 20 »). */
export function Lk({ children }: { children: ReactNode }) {
  return (
    <span className="admA-lk">
      <Icone nom="lock" taille={12} />
      {children}
    </span>
  )
}

/** Panneau hachuré : ce qui n'est ni affiché ni envoyé à ce poste (ADM-ROL-04, ADM-ANO-03). */
export function HorsPerimetre({ titre, texte, refs }: { titre: string; texte: string; refs?: string[] }) {
  const { t } = usePreferences()
  return (
    <div className="admA-oos">
      <div className="oi">
        <Icone nom="eye-off" taille={26} />
      </div>
      <h3>{t(titre)}</h3>
      <p>{t(texte)}</p>
      {refs && (
        <div className="row wrap mt10" style={{ gap: 6, justifyContent: 'center' }}>
          {refs.map((r) => (
            <span key={r} className="pill ink sm">
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const ICONE_POINT: Record<PreuveGarde['point'], string> = { C1: 'package', C2: 'scan-line', C3: 'hand-helping', client: 'user-round', vendeur: 'store', gerant: 'store', livreur: 'truck', entreprise: 'truck' }
const TON_POINT: Partial<Record<PreuveGarde['point'], string>> = { client: 'g', gerant: 'c', vendeur: 'c' }

/** Preuve d'un changement de main (C1, C2, C3) ou d'une partie : photo horodatée, ou constat sans photo, ou manquante. */
export function Preuve({ p }: { p: PreuveGarde }) {
  const { t, tf } = usePreferences()
  return (
    <div className="admA-ev">
      {p.photo ? (
        <div className="photo s1-photo" role="img" aria-label={tf('Photo : {quoi}', { quoi: p.quoi })}>
          <Icone nom={ICONE_POINT[p.point]} taille={34} />
          {p.point.startsWith('C') && (
            <span className="ok">
              <Icone nom="check" taille={14} trait={3} />
            </span>
          )}
          <span className="ts">
            <Quand le={p.le} /> · {p.lieu}
          </span>
        </div>
      ) : (
        <div className={'tile2' + (p.manquante ? ' s1-manque' : '')}>
          <Icone nom={p.manquante ? 'camera-off' : 'scan-line'} taille={24} />
          {p.manquante ? t('Photo manquante') : t('Sans photo')}
          <span>{p.lieu}</span>
        </div>
      )}
      <div className="cap">
        <span className={'st ' + (TON_POINT[p.point] ?? '')}>{p.point.startsWith('C') ? p.point : t(p.point === 'client' ? 'Client' : p.point === 'gerant' ? 'Gérant' : p.point === 'vendeur' ? 'Vendeur' : 'Transport')}</span>
        <span className="grow">{p.quoi}</span>
      </div>
      <div className="cm">
        {p.par} · {p.note}
        {p.saisieLe !== null && (
          <span className="s1-hl">
            {' · '}
            {t('saisi à')} <Quand le={p.saisieLe} /> · {t('reçu à')} <Quand le={p.le} />
          </span>
        )}
      </div>
    </div>
  )
}

/** Motif écrit d'une décision (ADM-PRI-03) : même champ, même compteur partout ; longueur minimale du registre. */
export function ChampMotif({ valeur, changer, libelle = 'Motif écrit *', aide, lignes = 4 }: { valeur: string; changer: (v: string) => void; libelle?: string; aide?: string; lignes?: number }) {
  const { t, tf } = usePreferences()
  const id = useId()
  const n = valeur.trim().length
  const min = PARAMETRES.console.motifMin
  return (
    <div className="admA-motif">
      <label className="lab" htmlFor={id}>
        <span>{t(libelle)}</span>
        <span className={n >= min ? 's1-ok' : 's1-court'} id={id + '-n'}>
          {n >= min ? tf('{n} caractères ✓', { n }) : tf('{n} sur {min} caractères', { n, min })}
        </span>
      </label>
      <textarea id={id} className="s1-motif mt4" rows={lignes} value={valeur} onChange={(e) => changer(e.target.value)} placeholder={aide ? t(aide) : undefined} aria-describedby={id + '-n'} />
    </div>
  )
}
export const motifSuffisant = (m: string) => m.trim().length >= PARAMETRES.console.motifMin

/** Heure de Yaoundé, précédée du jour quand ce n'est pas aujourd'hui (« 11 oct. · 14 h 05 »). */
export { Quand }

/**
 * Fonctions d'abord (composants/Fonctions.tsx) pour les écrans des groupes S1 à S3 : chaque geste avec son nombre lu des
 * données ; une page que le rôle n'ouvre pas disparaît, un geste qui décide (« geste ») disparaît en lecture seule.
 */
export interface DefFonctionS {
  verbe: string
  n: number | null
  unite: [string, string]
  icone: string
  route?: string
  params?: Record<string, string>
  onClick?: () => void
  detail?: string
  alerte?: boolean
  geste?: boolean
  /** Route dont le droit décide (par défaut `route`, sinon la page courante). */
  droit?: string
  /** Condition supplémentaire (permission transverse, niveau). */
  si?: boolean
}
export function useFonctionsS(page: string, defs: (DefFonctionS | false | null | undefined)[]): Fonction[] {
  const { role } = useSession()
  return defs
    .filter((d): d is DefFonctionS => !!d && d.si !== false)
    .filter((d) => {
      const a = droitDe(d.droit ?? d.route ?? page, role).acces
      return a !== 'aucun' && (!d.geste || a !== 'lecture')
    })
    .slice(0, 4)
    .map(({ route, params, geste: _g, droit: _d, si: _s, ...f }) => ({ ...f, vers: route ? chemin(route, params) : undefined }))
}

/** Détail secondaire replié (« a-plie ») : ce qui reste utile sans encombrer la page. */
export function Plie({ titre, children }: { titre: ReactNode; children: ReactNode }) {
  return (
    <details className="a-plie">
      <summary>{titre}</summary>
      <div className="a-plie-c t13 c3 lh">{children}</div>
    </details>
  )
}

/** Libellé court d'un point de la chaîne : C1 / C2 / C3, ou la partie. */
const NOM_POINT = (p: PreuveGarde['point']) => (p.startsWith('C') ? p : p === 'client' ? 'Client' : p === 'gerant' ? 'Gérant' : p === 'vendeur' ? 'Vendeur' : 'Transport')

/** Chaîne de preuves en étapes courtes : une pastille par preuve (point, ce qui est prouvé, heure), état visible d'un
 *  coup d'œil (photo ✓, constat sans photo, manquante en rouge) ; le détail (lieu, qui, note, photo) reste replié. */
export function ChainePreuves({ preuves }: { preuves: PreuveGarde[] }) {
  const { t, tf } = usePreferences()
  return (
    <>
      <ol className="admA-etapes" aria-label={tf('Chaîne de preuves · {n} éléments', { n: preuves.length })}>
        {preuves.map((p) => (
          <li key={p.id} className={p.manquante ? 'manque' : p.photo ? 'ok' : 'constat'}>
            <span className="pt">{t(NOM_POINT(p.point))}</span>
            <span className="q">{p.quoi}</span>
            <span className="e" role="img" aria-label={t(p.manquante ? 'Photo manquante' : p.photo ? 'Photo' : 'Sans photo')}>
              <Icone nom={p.manquante ? 'camera-off' : p.photo ? 'check' : 'scan-line'} taille={13} trait={p.photo && !p.manquante ? 3 : 2} />
            </span>
            <span className="h">
              <Heure le={p.le} />
            </span>
          </li>
        ))}
      </ol>
      <details className="admA-etapes-d">
        <summary>
          <Icone nom="chevron-down" taille={16} />
          {t('Voir le détail des preuves')}
        </summary>
        <div className="admA-phs" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {preuves.map((p) => (
            <Preuve key={p.id} p={p} />
          ))}
        </div>
      </details>
    </>
  )
}
