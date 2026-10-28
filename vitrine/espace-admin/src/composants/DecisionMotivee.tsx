// Décision motivée (ADM-01 § 12, ADM-PRI-03) : LA feuille commune à TOUS les écrans qui décident (litige, remboursement,
// KYC, sanction, paramètre, suspension, alerte de fraude…). Motif écrit obligatoire (longueur minimale du registre :
// motif_min_caracteres), preuves citées, et, pour une décision à quatre yeux, l'avertissement : un second validateur
// d'un AUTRE compte devra contresigner avant qu'elle ne s'applique. Deux façons de décider :
// - sans `envoyer` : la décision passe par source.quatreyeux.decider (action, objet) ; l'écran reçoit l'issue par `apres` ;
// - avec `envoyer(motif)` : la méthode du domaine qui décide ET refuse (conflit d'intérêts, pièces non vues, auteur du
//   recours…) ; elle rend null / { ok: true } (fait), un message déjà traduit, ou { ok: false, raison } (traduit ici par
//   `refus`, sinon par la table commune RAISONS_REFUS).
// Les feuilles propres des groupes (S3 FeuilleDecision, S5 et S6 FeuilleMotif) sont retirées à l'intégration.
import { useId, useState, type ReactNode } from 'react'
import { Feuille } from '@client/composants/Feuille'
import { PARAMETRES } from '../calculs/registre'
import { NOM_ROLE } from '../config/libelles'
import type { EtatDecision, Role } from '../donnees/communs'
import type { Preuve } from '../donnees/domaines/quatreyeux'
import { source } from '../donnees/source'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'
import { sonner } from './marque-sonore'
import { Note } from './prototype'
import { RAISONS_REFUS } from './refus'

/** Ce que rend `envoyer` : null ou { ok: true } (fait), un message traduit, ou une raison de refus de la source. */
export type IssueEnvoi = null | string | { ok: true } | { ok: false; raison: string }

export interface PropsDecision {
  ouverte: boolean
  fermer: () => void
  titre: string // « Trancher le litige LT-0412 »
  resume: ReactNode // ce qui sera fait, en une phrase
  action?: string // « litige.decider » (sans `envoyer`)
  objet?: string // « LT-0412 » (sans `envoyer`)
  preuves?: Preuve[]
  quatreYeux?: boolean
  rolesSecond?: Role[]
  montant?: number | null
  libelle?: string // texte du bouton (« Rembourser »)
  icone?: string
  danger?: boolean
  motif?: 'obligatoire' | 'facultatif' | 'aucun'
  etiquetteMotif?: string
  children?: ReactNode // raison, pièces, événements cités (au-dessus du motif)
  vu?: ReactNode // « Ce que voit l'acteur » (sous le motif)
  avertissement?: ReactNode
  bloque?: string | null // raison affichée qui empêche d'envoyer
  envoyer?: (motif: string) => Promise<IssueEnvoi>
  refus?: (raison: string) => string
  apres?: (issue: { etat: EtatDecision; id: string } | null) => void
}

export function DecisionMotivee(p: PropsDecision) {
  const { t, tf } = usePreferences()
  const id = useId()
  const [motif, setMotif] = useState('')
  const [citees, setCitees] = useState<string[]>(() => (p.preuves ?? []).map((x) => x.id))
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const min = PARAMETRES.console.motifMin
  const mode = p.motif ?? 'obligatoire'
  const court = mode === 'obligatoire' && motif.trim().length < min
  const messageMin = tf('Le motif doit compter au moins {n} caractères.', { n: min })
  const traduire = (r: string) => (r === 'motif_court' ? messageMin : p.refus ? p.refus(r) : t(RAISONS_REFUS[r] ?? 'La décision n’a pas pu être enregistrée.'))
  const fermer = () => {
    setErreur(null)
    p.fermer()
  }
  const reussi = (issue: { etat: EtatDecision; id: string } | null) => {
    // Son de la console : l'argent qui part a le sien ; un compte activé, le sien ; sinon « décision enregistrée ».
    const a = p.action ?? ''
    sonner(/versement/.test(a) ? 'versementsLances' : /rembours/.test(a) ? 'remboursement' : /kyc|activer|candidature\.accepter/.test(a) ? 'compteActive' : 'decision')
    setMotif('')
    p.fermer()
    p.apres?.(issue)
  }
  const decider = async () => {
    if (court) return setErreur(messageMin)
    if (p.bloque) return setErreur(p.bloque)
    setEnvoi(true)
    setErreur(null)
    try {
      if (p.envoyer) {
        const r = await p.envoyer(mode === 'aucun' ? '' : motif.trim())
        if (r === null || (typeof r === 'object' && r.ok)) reussi(null)
        else {
          sonner('erreur')
          setErreur(typeof r === 'string' ? r : traduire((r as { raison: string }).raison))
        }
      } else {
        const resume = typeof p.resume === 'string' ? p.resume : p.titre
        const r = await source.quatreyeux.decider({ action: p.action ?? '', objet: p.objet ?? '', resume, motif: motif.trim(), preuves: (p.preuves ?? []).filter((x) => citees.includes(x.id)), montant: p.montant ?? null, quatreYeux: !!p.quatreYeux, rolesSecond: p.rolesSecond ?? ['superviseur'] })
        if (!r.ok) setErreur(r.raison === 'motif_court' ? messageMin : t('Votre rôle ne permet pas cette décision.'))
        else reussi({ etat: r.etat, id: r.id })
      }
    } catch (e) {
      setErreur(e instanceof Error && e.name === 'AccesRefuse' ? t('Votre rôle ne permet pas cette décision.') : t('La décision n’a pas pu être enregistrée. Rien n’a été appliqué : votre motif est gardé, réessayez.'))
    } finally {
      setEnvoi(false)
    }
  }
  return (
    <Feuille ouverte={p.ouverte} fermer={fermer} titre={p.titre}>
      <div className="e-decision px">
        <h2 className="card-t">{p.titre}</h2>
        <div className="card-s">{p.resume}</div>
        {p.children}
        {mode !== 'aucun' && (
          <label className="fld fld-l mt14" htmlFor={id + '-m'}>
            <span className="fld-t">{t(p.etiquetteMotif ?? (mode === 'obligatoire' ? 'Motif écrit (obligatoire, journalisé)' : 'Motif (facultatif, journalisé)'))}</span>
            <span className="inp">
              <textarea id={id + '-m'} value={motif} onChange={(e) => setMotif(e.target.value)} rows={4} aria-invalid={!!erreur && court} aria-describedby={id + '-n'} />
            </span>
            <span className="aide" id={id + '-n'}>
              {mode === 'obligatoire' ? tf('{n} caractères sur {min} au moins', { n: motif.trim().length, min }) : tf('{n} caractères', { n: motif.trim().length })}
            </span>
          </label>
        )}
        {p.vu && <div className="mt12">{p.vu}</div>}
        {!!p.preuves?.length && (
          <fieldset className="fld fld-g mt14">
            <legend className="fld-t">{t('Preuves citées')}</legend>
            {p.preuves.map((x) => (
              <label key={x.id} className="e-case">
                <input type="checkbox" checked={citees.includes(x.id)} onChange={(e) => setCitees((c) => (e.target.checked ? [...c, x.id] : c.filter((y) => y !== x.id)))} />
                <span>{x.libelle}</span>
              </label>
            ))}
          </fieldset>
        )}
        {p.avertissement && (
          <Note ton="amber" icone="info" className="mt14">
            {p.avertissement}
          </Note>
        )}
        {p.quatreYeux && (
          <Note ton="amber" icone="users" className="mt14">
            <b>{t('Quatre yeux')}</b> ·{' '}
            {p.rolesSecond?.length
              ? tf('un second validateur d’un autre compte ({roles}) devra contresigner avant que la décision ne s’applique.', { roles: p.rolesSecond.map((r) => t(NOM_ROLE[r])).join(', ') })
              : t('un second validateur d’un autre compte devra contresigner avant que la décision ne s’applique.')}
          </Note>
        )}
        {erreur && (
          <p className="e-erreur mt10" role="alert">
            <Icone nom="triangle-alert" taille={16} />
            {erreur}
          </p>
        )}
        <div className="btns mt16">
          <button type="button" className="btn ghost" onClick={fermer}>
            {t('Annuler')}
          </button>
          <button type="button" className={'btn ' + (p.danger ? 'danger' : 'primary')} onClick={() => void decider()} disabled={envoi} aria-busy={envoi}>
            <Icone nom={p.quatreYeux ? 'users' : (p.icone ?? 'check')} taille={18} />
            <span>{p.quatreYeux ? t('Envoyer au second validateur') : t(p.libelle ?? 'Décider')}</span>
          </button>
        </div>
      </div>
    </Feuille>
  )
}
