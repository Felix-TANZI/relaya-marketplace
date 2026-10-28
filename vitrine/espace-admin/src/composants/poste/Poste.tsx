// Poste de travail d'une décision encadrée (logique-metier/DECISIONS-ENCADREES.md), commun aux litiges et aux autres
// dossiers (vérification d'identité, remboursements, sanctions, constats des relais, retenues de kit, signalements) :
// - en tête : ce qu'il faut décider, l'échéance en compte à rebours, la minuterie du dossier, le montant, le niveau
//   requis ; « Dossier suivant » ;
// - à gauche (onglet « Preuves » au téléphone) : la liste de contrôle calculée d'office (✓ / ✕ / ⚠, le douteux en tête,
//   confirmée ou corrigée en un geste), la frise des preuves (vignette, heure, lieu, qui), la visionneuse (zoom,
//   comparaison côte à côte), les positions des parties ;
// - à droite (onglet « Décision ») : la suggestion de la règle et qui en supporte le coût ; les issues permises, celles
//   à transmettre (au-delà du plafond) et celles bloquées, grisées avec leur raison ; le champ de manœuvre (fourchette,
//   geste, une prolongation) ; motif de la liste + note ; message aux parties pré-rempli ; « Noter un appel » ;
//   « Transmettre » au niveau supérieur ;
// - au-dessus : la file triée par échéance, les lots de dossiers identiques (décision en lot plafonnée).
// Raccourcis à l'ordinateur (aide « ? ») : n / k dossier suivant / précédent, 1-9 une issue, c comparer, a appel,
// t transmettre, Ctrl+Entrée décider. La source refait chaque contrôle (src/demo/decisions.ts) : l'écran grise, elle refuse.
import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { NOM_PARTIE_COURT } from '../../calculs/decisions'
import { PARAMETRES } from '../../calculs/registre'
import { chemin } from '../../config/pages'
import type { AppelPoste, DossierCourt, DossierPoste, EtatControle, GenreDossier, IssuePoste, Partie, PieceDossier } from '../../donnees/domaines/decisions'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, useSession } from '../../session'
import { Ecran, useAppareil } from '../coque'
import type { Fonction } from '../Fonctions'
import { Icone } from '../Icone'
import { BoutonAppel } from '../BoutonAppel'
import { Heure } from '../LigneJournal'
import { Note, Pill, Rebours, Vide, useRestant } from '../prototype'
import { Legende, Vignette, Visionneuse } from './Visionneuse'
export { RACCOURCIS_POSTE } from './raccourcis'
import './poste.css'
import { TexteTraduisible } from '@client/traduction/Traduisible'

const f = (n: number) => `${F(n)} F`
export const NOM_GENRE: Record<GenreDossier, string> = { litige: 'Litige', kyc: 'Vérification d’identité', remboursement: 'Remboursement', sanction: 'Sanction', constat: 'Constat de relais', kit: 'Retenue de kit', signalement: 'Signalement' }
export const ICONE_GENRE: Record<GenreDossier, string> = { litige: 'scale', kyc: 'id-card', remboursement: 'undo-2', sanction: 'gavel', constat: 'package-check', kit: 'shopping-bag', signalement: 'flag' }
const ICONE_NATURE: Record<PieceDossier['nature'], string> = { photo: 'camera', scan: 'scan-line', code: 'lock', position: 'map-pin', appel: 'phone', message: 'message-square-text', piece: 'id-card', constat: 'clipboard-check', systeme: 'history' }
const ICONE_ETAT: Record<EtatControle, string> = { ok: 'check', ko: 'x', doute: 'triangle-alert' }
const NOM_ETAT: Record<EtatControle, string> = { ok: 'Conforme', ko: 'Non conforme', doute: 'Douteux' }
const enSaisie = (e: EventTarget | null) => e instanceof HTMLElement && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName))
type Mode = null | 'appel' | 'transmettre' | 'prolonger'
type Retour = { ton: 'green' | 'amber' | 'red'; texte: string; suivant?: boolean } | null

/** Minuterie du dossier : le temps passé dessus depuis son ouverture à l'écran. */
function Minuterie({ depuis }: { depuis: number }) {
  const { tf } = usePreferences()
  const n = useHorloge(1000)
  const restant = useRestant()
  return (
    <span className="po-minu" role="timer" aria-live="off">
      <Icone nom="timer" taille={14} />
      {tf('Sur ce dossier : {d}', { d: restant(Math.max(0, n - depuis)) })}
    </span>
  )
}

/** Une ligne de la file : genre ou type, référence, échéance, montant, niveau, doutes, suggestion. */
function LigneFile({ d, actif, choisir }: { d: DossierCourt; actif: boolean; choisir: () => void }) {
  const { t, tf } = usePreferences()
  return (
    <button type="button" className={'po-q' + (actif ? ' on' : '') + (d.etat === 'decide' ? ' fait' : '')} aria-current={actif ? 'true' : undefined} onClick={choisir}>
      <span className="po-q-i">
        <Icone nom={ICONE_GENRE[d.genre]} taille={18} />
      </span>
      <span className="po-q-t">
        <b>
          {d.id} · {d.ref}
        </b>
        <span>{d.titre}</span>
        <span className="po-q-p">
          <Pill ton="ink" sm>
            {t(d.typeLibelle)}
          </Pill>
          {d.etat === 'transmis' && (
            <Pill ton="violet" sm icone="arrow-up-right">
              {t('Transmis')}
            </Pill>
          )}
          {d.etat === 'trop_tot' && (
            <Pill ton="ink" sm icone="hourglass">
              {t('Trop tôt')}
            </Pill>
          )}
          {d.etat === 'attente' && (
            <Pill ton="amber" sm icone="users">
              {t('Quatre yeux')}
            </Pill>
          )}
          {d.etat === 'decide' && (
            <Pill ton="green" sm icone="check">
              {t('Décidé')}
            </Pill>
          )}
          {d.doutes > 0 && d.etat !== 'decide' && (
            <Pill ton="amber" sm icone="triangle-alert">
              {tf('{n} à vérifier', { n: d.doutes })}
            </Pill>
          )}
        </span>
      </span>
      <span className="po-q-d">
        {d.echeance !== null && d.etat !== 'decide' ? <Rebours fin={d.echeance} urgent={6 * 3_600_000} critique={3_600_000} /> : <span className="c3 t13">{d.etat === 'decide' ? t('Décidé') : t('Sans échéance')}</span>}
        {d.montant > 0 && <b>{f(d.montant)}</b>}
        <span className="c3 t13">{tf('Niveau : {n}', { n: t(d.niveauRequis) })}</span>
      </span>
    </button>
  )
}

/** Une ligne de la liste de contrôle : état calculé, raison, et les trois gestes (confirmer ou corriger). */
function LigneControle({ c, peut, changer }: { c: DossierPoste['controles'][number]; peut: boolean; changer: (e: EtatControle) => void }) {
  const { t, tf } = usePreferences()
  return (
    <li className={'po-c ' + c.etat}>
      <span className={'po-c-e ' + c.etat} aria-label={t(NOM_ETAT[c.etat])}>
        <Icone nom={ICONE_ETAT[c.etat]} taille={16} trait={3} />
      </span>
      <span className="po-c-t">
        <b>{t(c.libelle)}</b>
        <span>{c.pourquoi}</span>
        {c.corrige && <span className="po-c-k">{tf('Corrigé par {qui} (calcul : {de})', { qui: c.corrige.par, de: t(NOM_ETAT[c.corrige.de]) })}</span>}
        {!c.corrige && c.confirme && <span className="po-c-k ok">{t('Confirmé')}</span>}
      </span>
      {peut && (
        <span className="po-c-g" role="group" aria-label={tf('Vérifier : {l}', { l: t(c.libelle) })}>
          {(['ok', 'ko', 'doute'] as EtatControle[]).map((e) => (
            <button key={e} type="button" className={'po-c-b ' + e} aria-pressed={c.etat === e && (c.confirme || !!c.corrige)} title={t(NOM_ETAT[e])} aria-label={tf('{etat} : {l}', { etat: t(NOM_ETAT[e]), l: t(c.libelle) })} onClick={() => changer(e)}>
              <Icone nom={ICONE_ETAT[e]} taille={16} trait={2.6} />
            </button>
          ))}
        </span>
      )}
    </li>
  )
}

/** Une pièce de la frise : étape, titre et heure d'un coup d'œil, vignette (ouvre la visionneuse) ; lieu, qui et note
 *  repliés sous « Détail » ; manquante en rouge, sa raison visible. */
function LignePiece({ p, ouvrir }: { p: PieceDossier; ouvrir: () => void }) {
  const { t } = usePreferences()
  return (
    <li className={'po-p' + (p.manquante ? ' manque' : '')}>
      <span className="po-p-i">
        <Icone nom={p.manquante ? 'camera-off' : ICONE_NATURE[p.nature]} taille={16} />
      </span>
      <div className="po-p-c">
        <div className="po-p-h">
          <span className="po-p-e">{t(p.etape)}</span>
          {p.source === 'pont' && (
            <Pill ton="blue" sm>
              {t('Pont')}
            </Pill>
          )}
          {p.source === 'console' && (
            <Pill ton="violet" sm>
              {t('Console')}
            </Pill>
          )}
        </div>
        <div className="po-p-l">
          <b>{p.titre}</b>
          <span className="po-p-h">
            <Heure le={p.le} />
          </span>
        </div>
        {p.manquante ? (
          <TexteTraduisible comme="p" classe="po-p-n" texte={p.note} />
        ) : (
          <details className="po-p-d">
            <summary>
              <Icone nom="chevron-down" taille={14} />
              {t('Détail')}
            </summary>
            <Legende p={p} />
            <TexteTraduisible comme="p" classe="po-p-n" texte={p.note} />
          </details>
        )}
      </div>
      {p.image ? (
        <button type="button" className="po-p-v" aria-label={`${t('Voir en grand')} : ${p.titre}`} onClick={ouvrir}>
          <Vignette image={p.image} titre={p.titre} />
        </button>
      ) : (
        p.manquante && <span className="po-p-m">{t('Manquante')}</span>
      )}
    </li>
  )
}

/** Panneau repliable du poste (sections repliables de la console). */
function Section({ titre, icone, droite, ouvert = true, children, id }: { titre: ReactNode; icone: string; droite?: ReactNode; ouvert?: boolean; children: ReactNode; id?: string }) {
  return (
    <details className="po-s panel" open={ouvert} id={id}>
      <summary className="ph">
        <span className="ic acc" aria-hidden="true">
          <Icone nom={icone} taille={18} />
        </span>
        <h2>{titre}</h2>
        {droite}
        <Icone nom="chevron-down" taille={18} />
      </summary>
      <div className="po-s-c">{children}</div>
    </details>
  )
}

export function Poste({ route, genre: genreFixe }: { route: 'litige' | 'postes'; genre: GenreDossier | null }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const appareil = useAppareil()
  const [params, setParams] = useSearchParams()
  const filtre = (genreFixe ?? (params.get('genre') as GenreDossier | null)) || null
  const file = useLecture(() => source.decisions.file(filtre ?? undefined), [filtre, s.role, s.agent?.id])
  const liste = useMemo(() => file.donnees ?? [], [file.donnees])
  const idParam = params.get('id')
  const genreParam = (params.get('g') as GenreDossier | null) ?? null
  const choisi = liste.find((x) => x.id === idParam && (!genreParam || x.genre === genreParam)) ?? (idParam ? null : (liste.find((x) => x.etat === 'a_decider' || x.etat === 'transmis') ?? liste[0] ?? null))
  const genre = choisi?.genre ?? genreParam ?? filtre ?? 'litige'
  const id = choisi?.id ?? idParam
  const dossier = useLecture(() => (id ? source.decisions.dossier(genre, id) : Promise.resolve(null)), [genre, id, s.role, s.agent?.id])
  const d = dossier.donnees
  const onglet = params.get('vue') === 'decision' ? 'decision' : 'preuves'
  const [ouvertLe, setOuvertLe] = useState(() => Date.now() + (s.maintenant - Date.now()))
  const [vision, setVision] = useState<PieceDossier[] | null>(null)
  const [choix, setChoix] = useState<string | null>(null)
  const [montant, setMontant] = useState<number | null>(null)
  const [motif, setMotif] = useState('')
  const [note, setNote] = useState('')
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<Mode>(null)
  const [retour, setRetour] = useState<Retour>(null)
  const [envoi, setEnvoi] = useState(false)
  const [appel, setAppel] = useState<{ avec: Partie; resultat: AppelPoste['resultat']; accord: string; resume: string }>({ avec: 'client', resultat: 'joint', accord: '', resume: '' })
  const [lotOuvert, setLotOuvert] = useState<string | null>(null)
  const refNote = useRef<HTMLTextAreaElement>(null)

  const aller = (x: { genre: GenreDossier; id: string } | null, garder = false) => {
    setRetour(null) // le retour d'un geste ne suit pas vers un autre dossier
    const p = new URLSearchParams(params)
    if (x) {
      p.set('id', x.id)
      if (!genreFixe) p.set('g', x.genre)
    }
    if (!garder) p.delete('vue')
    setParams(p, { replace: true })
  }
  // Un autre dossier : tout repart de la suggestion de la règle.
  const cle = d ? `${d.genre}:${d.id}` : ''
  useEffect(() => {
    if (!d) return
    const sug = d.lecture?.issue && d.issues.find((i) => i.id === d.lecture!.issue && i.etat !== 'bloquee') ? d.lecture.issue : null
    setChoix(sug)
    setMontant(null)
    setMotif('')
    setNote('')
    setMode(null)
    setOuvertLe(Date.now() + (s.maintenant - Date.now()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle])
  const issue = d?.issues.find((i) => i.id === choix) ?? null
  useEffect(() => {
    if (!d) return
    const m = issue ? (d.messages[issue.id] ?? []) : []
    setMessages(Object.fromEntries(m.map((x) => [x.partie, x.texte])))
    if (issue?.fourchette) setMontant((v) => (v !== null && v >= issue.fourchette!.min && v <= issue.fourchette!.max ? v : issue.fourchette!.max))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, choix])

  const ouverts = liste.filter((x) => x.etat === 'a_decider' || x.etat === 'transmis')
  const rang = choisi ? ouverts.findIndex((x) => x.id === choisi.id && x.genre === choisi.genre) : -1
  const suivant = ouverts.length ? ouverts[(rang + 1) % ouverts.length] : null
  const precedent = ouverts.length ? ouverts[(rang - 1 + ouverts.length) % ouverts.length] : null
  const allerSuivant = () => {
    setRetour(null)
    if (suivant && (suivant.id !== id || suivant.genre !== genre)) aller(suivant)
  }

  const relire = () => {
    file.relire()
    dossier.relire()
  }
  const peut = !!d?.droits.decider
  const montantChoisi = issue?.fourchette ? montant : (issue?.montant ?? null)
  // État de l'issue pour CE montant (fourchette au-delà du plafond : à transmettre), comme la source le vérifiera.
  const auDela = !!issue && issue.etat === 'permise' && !!issue.fourchette && montantChoisi !== null && ((issue.id === 'geste' && montantChoisi > (d?.droits.geste ?? 0)) || (d?.droits.plafond !== null && d?.droits.plafond !== undefined && montantChoisi > d.droits.plafond))
  const etatChoix = issue ? (auDela ? 'transmettre' : issue.etat) : null
  const noteOk = note.trim().length >= PARAMETRES.console.motifMin
  const pret = peut && etatChoix === 'permise' && !!motif && noteOk && !envoi
  const peutTransmettre = !!d && !d.decision && !d.attente && s.role !== 'audit' && d.transmission?.parId !== s.agent?.id

  const decider = async () => {
    if (!d || !issue || !pret) return
    setEnvoi(true)
    try {
      const accord = d.appels.find((a) => a.resultat === 'accord' && a.accord === issue.id)
      const message = Object.entries(messages)
        .map(([p, x]) => `${t(NOM_PARTIE_COURT[p as Partie])} : ${x}`)
        .join('\n')
      const r = await source.decisions.decider(d.genre, d.id, { issue: issue.id, montant: issue.fourchette ? montant : null, motif, note, message, appel: accord?.id ?? null })
      if (!r.ok) setRetour({ ton: r.raison === 'transmettre' ? 'amber' : 'red', texte: r.detail ?? t('Décision refusée par la règle.') })
      else if (r.etat === 'a_contresigner') setRetour({ ton: 'amber', texte: tf('Au-delà de {seuil} : la décision attend un second validateur d’un autre compte ({id}). Rien ne s’applique avant.', { seuil: f(PARAMETRES.console.seuilRemboursementQuatreYeux), id: r.id }), suivant: true })
      else setRetour({ ton: 'green', texte: t('Décision appliquée et journalisée ; les parties sont prévenues.'), suivant: true })
      relire()
    } catch {
      setRetour({ ton: 'red', texte: t('La décision n’a pas pu être enregistrée. Rien n’a été appliqué : réessayez.') })
    } finally {
      setEnvoi(false)
    }
  }
  const controler = async (c: string, e: EtatControle) => {
    if (!d) return
    const r = await source.decisions.controler(d.genre, d.id, c, e)
    if (!r.ok) setRetour({ ton: 'red', texte: t('Ce contrôle ne se modifie pas ici.') })
    relire()
  }
  const noterAppel = async () => {
    if (!d) return
    const nom = d.parties.find((p) => p.partie === appel.avec)?.nom ?? t(NOM_PARTIE_COURT[appel.avec])
    const r = await source.decisions.noterAppel(d.genre, d.id, { avec: appel.avec, nom, resultat: appel.resultat, resume: appel.resume, accord: appel.resultat === 'accord' ? appel.accord || null : null })
    if (!r.ok) return setRetour({ ton: 'red', texte: r.detail ?? t('Appel non enregistré.') })
    setRetour({ ton: 'green', texte: appel.resultat === 'accord' ? t('Appel noté : il devient une preuve ; l’issue convenue est choisie.') : t('Appel noté : il devient une preuve du dossier.') })
    if (appel.resultat === 'accord' && appel.accord) {
      setChoix(appel.accord)
      setMotif('Accord trouvé au téléphone')
    }
    setAppel({ avec: 'client', resultat: 'joint', accord: '', resume: '' })
    setMode(null)
    relire()
  }
  const transmettre = async () => {
    if (!d) return
    const r = await source.decisions.transmettre(d.genre, d.id, note, issue && issue.etat !== 'bloquee' ? issue.id : null)
    if (!r.ok) return setRetour({ ton: 'red', texte: r.detail ?? t('Transmission refusée.') })
    setRetour({ ton: 'green', texte: tf('Dossier transmis : {vers}. Un autre compte le tranchera.', { vers: t(r.vers) }), suivant: true })
    setMode(null)
    relire()
  }
  const prolonger = async () => {
    if (!d) return
    const r = await source.decisions.prolonger(d.genre, d.id, note)
    if (!r.ok) return setRetour({ ton: 'red', texte: r.detail ?? t('Prolongation refusée.') })
    setRetour({ ton: 'green', texte: tf('Échéance prolongée de {h} h, une fois.', { h: d.prolongation.heures }) })
    setMode(null)
    relire()
  }
  const comparer = () => d && d.comparer.length > 0 && setVision(d.pieces.filter((p) => d.comparer.includes(p.id)).slice(0, 3))
  // Pièces d'identité : chaque pièce ouverte dans la visionneuse l'est par lien court journalisé (la KYC l'exige).
  useEffect(() => {
    if (!vision || !d || d.genre !== 'kyc') return
    const a = vision.filter((p) => d.aOuvrir.includes(p.id))
    if (!a.length) return
    void Promise.all(a.map((p) => source.acteurs.ouvrirPiece(d.id, p.id, 'Comparaison côte à côte au poste de décision (pièce, recto, verso, selfie).'))).then(relire, () => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vision])

  // Raccourcis du clavier (ordinateur) : jamais pendant une saisie ni une feuille ouverte.
  const choisirIssue = (i: IssuePoste) => i.etat !== 'bloquee' && (setChoix(i.id), setRetour(null))
  useEffect(() => {
    if (appareil === 'mobile') return
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || enSaisie(e.target) || document.querySelector('#app .sheet')) return
      const k = e.key.toLowerCase()
      if (k === 'n' || k === 'j') return e.preventDefault(), allerSuivant()
      if (k === 'k' && precedent) return e.preventDefault(), aller(precedent)
      if (k === 'c') return e.preventDefault(), comparer()
      if (k === 'a' && peut) return e.preventDefault(), setMode('appel')
      if (k === 't' && peutTransmettre) return e.preventDefault(), setMode('transmettre')
      if (/^[1-9]$/.test(k) && d) {
        const i = d.issues[Number(k) - 1]
        if (i) return e.preventDefault(), choisirIssue(i)
      }
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  })

  // Fonctions d'abord : décider, vérifier les doutes, décider en lot, suivre.
  const nDecider = liste.filter((x) => x.etat === 'a_decider').length
  const nDoutes = liste.filter((x) => x.etat !== 'decide' && x.doutes > 0).length
  const lots = useMemo(() => {
    const m = new Map<string, DossierCourt[]>()
    for (const x of liste) if (x.lot && x.etat === 'a_decider') m.set(x.lot, [...(m.get(x.lot) ?? []), x])
    return [...m.entries()].filter(([, l]) => l.length > 1)
  }, [liste])
  const nAttente = liste.filter((x) => x.etat === 'transmis' || x.etat === 'attente' || x.etat === 'trop_tot').length
  const premier = (p: (x: DossierCourt) => boolean) => () => {
    const x = liste.find(p)
    if (x) aller(x)
  }
  const lecture = useDroit(route).acces === 'lecture'
  const fonctions: Fonction[] = lecture ? [{ verbe: 'Suivre', n: liste.filter((x) => x.etat !== 'decide').length, unite: ['dossier ouvert', 'dossiers ouverts'], icone: 'hourglass', onClick: premier((x) => x.etat !== 'decide') }] : [
    { verbe: 'Décider', n: nDecider, unite: ['dossier', 'dossiers'], icone: 'gavel', onClick: premier((x) => x.etat === 'a_decider') },
    { verbe: 'Vérifier', n: nDoutes, unite: ['dossier douteux', 'dossiers douteux'], icone: 'triangle-alert', onClick: premier((x) => x.etat !== 'decide' && x.doutes > 0), alerte: nDoutes > 0 },
    { verbe: 'Décider en lot', n: lots.reduce((n, [, l]) => n + l.length, 0), unite: ['dossier identique', 'dossiers identiques'], icone: 'layers', onClick: () => lots[0] && setLotOuvert(lots[0][0]) },
    { verbe: 'Suivre', n: nAttente, unite: ['dossier en attente', 'dossiers en attente'], icone: 'hourglass', onClick: premier((x) => x.etat === 'transmis' || x.etat === 'attente' || x.etat === 'trop_tot') },
  ]
  const genres: (GenreDossier | 'tous')[] = ['tous', 'litige', 'kyc', 'remboursement', 'sanction', 'constat', 'kit', 'signalement']

  const titre = d ? (d.genre === 'litige' ? tf('Litige · {ref}', { ref: d.ref }) : `${t(NOM_GENRE[d.genre])} · ${d.id}`) : undefined
  const vueMobile = appareil === 'mobile'

  return (
    <Ecran route={route} titre={titre} fonctions={file.donnees ? fonctions : undefined}>
      <div className="po" data-poste="">
        {!genreFixe && (
          <div className="chips po-genres" role="group" aria-label={t('Genre de dossier')}>
            {genres.map((g) => (
              <button
                key={g}
                type="button"
                className={'chip' + ((g === 'tous' ? !filtre : filtre === g) ? ' on' : '')}
                aria-pressed={g === 'tous' ? !filtre : filtre === g}
                onClick={() => {
                  const p = new URLSearchParams()
                  if (g !== 'tous') p.set('genre', g)
                  setParams(p, { replace: true })
                }}
              >
                {g !== 'tous' && <Icone nom={ICONE_GENRE[g]} taille={15} />}
                {g === 'tous' ? t('Tous') : t(NOM_GENRE[g])}
              </button>
            ))}
          </div>
        )}
        {(file.erreur || dossier.erreur) && (
          <Note ton="red" icone="circle-alert" className="mt10" role="alert">
            {t('Le dossier n’a pas pu être lu.')}{' '}
            <button type="button" className="btn sm secondary" onClick={relire}>
              {t('Réessayer')}
            </button>
          </Note>
        )}
        {file.donnees && liste.length === 0 && <Vide icone="check-check" t={t('Aucun dossier à votre niveau')} />}

        {liste.length > 0 && (
          <Section titre={tf('File · {n} dossiers, par échéance', { n: liste.length })} icone="list-checks" ouvert={!vueMobile || !id} id="po-file">
            {lots.map(([k, l]) => (
              <LotBandeau key={k} l={l} ouvert={lotOuvert === l[0].id || lotOuvert === k} ouvrir={() => setLotOuvert(lotOuvert === k ? null : k)} apres={(texte) => (setRetour({ ton: 'green', texte, suivant: true }), setLotOuvert(null), relire())} />
            ))}
            <div className="po-qs">
              {liste.map((x) => (
                <LigneFile key={x.genre + x.id} d={x} actif={!!choisi && x.id === choisi.id && x.genre === choisi.genre} choisir={() => aller(x)} />
              ))}
            </div>
          </Section>
        )}

        {/* Dossier qui vient de quitter le périmètre par le geste (transmis à un autre niveau) : la confirmation reste dite. */}
        {id && dossier.arrive && !d && retour?.suivant && (
          <Note ton={retour.ton} icone={retour.ton === 'green' ? 'circle-check' : 'users'} className="mt10" role="status">
            {retour.texte}{' '}
            <Link className="btn sm secondary" to={chemin(route)} onClick={() => setRetour(null)}>
              {t('Mes dossiers')}
            </Link>
          </Note>
        )}
        {id && dossier.arrive && !d && !retour?.suivant && <Vide icone="eye-off" t={t('Dossier hors de votre périmètre')} action={<Link className="btn secondary" to={chemin(route)}>{t('Mes dossiers')}</Link>} />}

        {d && (
          <>
            <section className="po-tete panel" aria-label={t('Ce qu’il faut décider')}>
              <div className="po-tete-l">
                <span className="po-tete-i" aria-hidden="true">
                  <Icone nom={ICONE_GENRE[d.genre]} taille={22} />
                </span>
                <div className="po-tete-t">
                  <div className="po-tete-k">
                    <span>{`${d.id} · ${d.ref}`}</span>
                    <Pill ton="ink" sm>
                      {t(d.typeLibelle)}
                    </Pill>
                    {d.transmission && !d.decision && (
                      <Pill ton="violet" sm icone="arrow-up-right">
                        {tf('Transmis par {qui} · {vers}', { qui: d.transmission.par, vers: t(d.transmission.vers) })}
                      </Pill>
                    )}
                    {d.decision && (
                      <Pill ton="green" sm icone="check">
                        {t('Décidé')}
                      </Pill>
                    )}
                  </div>
                  <h2 className="po-tete-q">{d.aDecider}</h2>
                </div>
              </div>
              <dl className="po-tete-m">
                <div>
                  <dt>{t('Échéance')}</dt>
                  <dd>{d.echeance !== null && !d.decision ? <Rebours fin={d.echeance} urgent={6 * 3_600_000} critique={3_600_000} /> : d.decision ? t('Décidé') : t('Sans échéance')}</dd>
                </div>
                <div>
                  <dt>{t('Montant en jeu')}</dt>
                  <dd>{d.montant ? f(d.montant) : '—'}</dd>
                </div>
                <div>
                  <dt>{t('Niveau requis')}</dt>
                  <dd>{t(d.niveauRequis)}</dd>
                </div>
                <div>
                  <dt>{t('Votre plafond')}</dt>
                  <dd>{d.droits.plafond === null ? t('Sans plafond') : f(d.droits.plafond)}</dd>
                </div>
              </dl>
              <div className="po-tete-a">
                {!d.decision && <Minuterie depuis={ouvertLe} />}
                <button type="button" className="btn sm secondary" disabled={!suivant || (suivant.id === d.id && suivant.genre === d.genre)} onClick={allerSuivant} aria-keyshortcuts="n">
                  {t('Dossier suivant')}
                  <Icone nom="arrow-right" taille={16} />
                </button>
              </div>
            </section>

            {vueMobile && (
              <div className="seg po-onglets" role="tablist" aria-label={t('Poste de travail')}>
                {(['preuves', 'decision'] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="tab"
                    aria-selected={onglet === o}
                    className={onglet === o ? 'on' : ''}
                    onClick={() => {
                      const p = new URLSearchParams(params)
                      if (o === 'decision') p.set('vue', 'decision')
                      else p.delete('vue')
                      setParams(p, { replace: true })
                    }}
                  >
                    {o === 'preuves' ? t('Preuves') : t('Décision')}
                    {o === 'preuves' && d.controles.some((c) => c.etat === 'doute') && <span className="po-pt" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}

            <div className="po-cols">
              {(!vueMobile || onglet === 'preuves') && (
                <div className="po-col" role={vueMobile ? 'tabpanel' : undefined} aria-label={t('Preuves')}>
                  <Section
                    titre={t('Vérification des preuves')}
                    icone="list-checks"
                    droite={
                      d.controles.some((c) => c.etat === 'doute') ? (
                        <Pill ton="amber" sm icone="triangle-alert">
                          {tf('{n} à vérifier', { n: d.controles.filter((c) => c.etat === 'doute').length })}
                        </Pill>
                      ) : (
                        <Pill ton="green" sm icone="check">
                          {t('Tout est lu')}
                        </Pill>
                      )
                    }
                  >
                    <ul className="po-cs">
                      {d.controles.map((c) => (
                        <LigneControle key={c.id} c={c} peut={peut} changer={(e) => void controler(c.id, e)} />
                      ))}
                    </ul>
                  </Section>
                  <Section
                    titre={tf('Frise des preuves · {n}', { n: d.pieces.length })}
                    icone="camera"
                    droite={
                      d.comparer.length > 1 ? (
                        <button type="button" className="btn sm secondary po-cmp" onClick={comparer} aria-keyshortcuts="c">
                          <Icone nom="columns-2" taille={16} />
                          {t('Comparer')}
                        </button>
                      ) : undefined
                    }
                  >
                    {d.aOuvrir.length > 0 && (
                      <Note ton="amber" icone="eye" className="mb8">
                        {t('Comparez les pièces côte à côte : chaque pièce ouverte l’est par lien court journalisé, et « Approuver » le demande.')}
                      </Note>
                    )}
                    <ol className="po-ps">
                      {d.pieces.map((p) => (
                        <LignePiece key={p.id} p={p} ouvrir={() => setVision([p])} />
                      ))}
                    </ol>
                  </Section>
                  <Section titre={t('Positions des parties')} icone="messages-square" ouvert={!vueMobile}>
                    {d.parties.map((p, i) => (
                      <div key={i} className="po-part">
                        <div className="po-part-h">
                          <b>
                            {t(NOM_PARTIE_COURT[p.partie])} · {p.nom}
                          </b>
                          {peut && (
                            <BoutonAppel
                              petit
                              classe="btn ghost"
                              nom={p.nom}
                              qui={NOM_PARTIE_COURT[p.partie]}
                              motif={tf('Dossier {id} : explication ou accord', { id: d.id })}
                              objet={d.id}
                              noter={async (note) => {
                                const r = await source.decisions.noterAppel(d.genre, d.id, { avec: p.partie, nom: p.nom, resultat: 'joint', resume: note, accord: null })
                                if (!r.ok) return r.detail ?? t('Appel non enregistré.')
                                relire()
                              }}
                            />
                          )}
                        </div>
                        {p.position && <span>{p.position}</span>}
                      </div>
                    ))}
                  </Section>
                </div>
              )}
              {(!vueMobile || onglet === 'decision') && (
                <div className="po-col" role={vueMobile ? 'tabpanel' : undefined} aria-label={t('Décision')}>
                  {d.lecture && !d.decision && (
                    <section className={'po-sug' + (d.lecture.issue ? '' : ' amb')} aria-label={t('Suggestion de la règle')}>
                      <div className="po-sug-k">
                        <Icone nom="sparkles" taille={14} />
                        {d.lecture.issue ? t('La règle suggère') : t('La règle ne tranche pas')}
                      </div>
                      <div className="po-sug-t">
                        {d.lecture.issue ? t(d.issues.find((i) => i.id === d.lecture!.issue)?.libelle ?? d.lecture.issue) : t('Preuves contradictoires : à transmettre')}
                        {d.lecture.payeur && <span className="po-sug-p">{tf('Coût : {qui}', { qui: t(NOM_PARTIE_COURT[d.lecture.payeur]) })}</span>}
                      </div>
                      <p className="po-sug-r">{d.lecture.raison}</p>
                      <span className="po-sug-g">{d.lecture.regle}</span>
                    </section>
                  )}
                  {d.decision ? (
                    <Decide d={d} suivant={!!suivant && !(suivant.id === d.id && suivant.genre === d.genre)} allerSuivant={allerSuivant} />
                  ) : (
                    <Section titre={t('Décision')} icone="gavel" droite={d.droits.raison ? <Pill ton="ink" sm icone="lock">{t('Lecture seule')}</Pill> : undefined}>
                      {d.droits.raison && (
                        <Note ton="ink" icone="lock" className="mb8">
                          {t(d.droits.raison)}
                        </Note>
                      )}
                      {d.attente && (
                        <Note ton="amber" icone="users" className="mb8">
                          {tf('Décision envoyée au second validateur ({id}) : rien ne s’applique avant sa contresignature.', { id: d.attente })} <Link to={chemin('quatreyeux', { id: d.attente })}>{t('Voir la demande')}</Link>
                        </Note>
                      )}
                      <div className="po-is" role="radiogroup" aria-label={t('Issues')}>
                        {d.issues.map((i, n) => (
                          <button
                            key={i.id}
                            type="button"
                            role="radio"
                            aria-checked={choix === i.id}
                            disabled={i.etat === 'bloquee'}
                            className={'po-i ' + i.etat + (choix === i.id ? ' on' : '')}
                            onClick={() => choisirIssue(i)}
                            aria-keyshortcuts={n < 9 ? String(n + 1) : undefined}
                          >
                            <span className="po-i-r" aria-hidden="true" />
                            <span className="po-i-t">
                              <b>
                                {!vueMobile && n < 9 && <kbd className="e-touche">{n + 1}</kbd>}
                                {t(i.libelle)}
                                {i.montant !== null && i.montant > 0 && !i.fourchette && ` · ${f(i.montant)}`}
                                {i.fourchette && ` · ${tf('{a} à {b}', { a: f(i.fourchette.min), b: f(i.fourchette.max) })}`}
                              </b>
                              <span>{i.effet}</span>
                              {i.payeur && i.etat !== 'bloquee' && <span className="po-i-p">{tf('Coût : {qui}', { qui: t(NOM_PARTIE_COURT[i.payeur]) })}</span>}
                              {i.raison && (
                                <span className={'po-i-x ' + i.etat}>
                                  <Icone nom={i.etat === 'bloquee' ? 'lock' : 'arrow-up-right'} taille={13} /> {i.raison}
                                </span>
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                      {issue?.fourchette && issue.etat !== 'bloquee' && (
                        <div className="po-mano">
                          <label htmlFor="po-montant">
                            {issue.id === 'geste' ? t('Montant du geste') : t('Montant rendu')} : <b>{f(montant ?? issue.fourchette.max)}</b>
                          </label>
                          <input id="po-montant" type="range" min={issue.fourchette.min} max={issue.fourchette.max} step={issue.fourchette.pas} value={montant ?? issue.fourchette.max} disabled={!peut} onChange={(e) => setMontant(Number(e.target.value))} aria-valuetext={f(montant ?? issue.fourchette.max)} />
                          <span className="c3 t13">{tf('Champ de manœuvre : {a} à {b}', { a: f(issue.fourchette.min), b: f(issue.fourchette.max) })}</span>
                          {auDela && (
                            <Note ton="amber" icone="arrow-up-right" className="mt8">
                              {t('Au-delà de votre plafond : transmettez au niveau supérieur, ou baissez le montant.')}
                            </Note>
                          )}
                        </div>
                      )}
                      {peut && (
                        <>
                          <div className="po-motifs" role="radiogroup" aria-label={t('Motif')}>
                            <span className="po-lab">{t('Motif *')}</span>
                            <div className="chips">
                              {d.motifs.map((m) => (
                                <button key={m} type="button" role="radio" aria-checked={motif === m} className={'chip' + (motif === m ? ' on' : '')} onClick={() => setMotif(m)}>
                                  {t(m)}
                                </button>
                              ))}
                            </div>
                          </div>
                          <ChampNote valeur={note} changer={setNote} ref_={refNote} decider={() => void decider()} />
                          {issue && Object.keys(messages).length > 0 && (
                            <details className="po-msg">
                              <summary>
                                <Icone nom="send" taille={16} />
                                {tf('Message aux parties · {n}', { n: Object.keys(messages).length })}
                              </summary>
                              {d.modeles.length > 0 && (
                                <div className="chips" role="group" aria-label={t('Modèles de messages')}>
                                  {d.modeles.map((m) => (
                                    <button key={m.id} type="button" className="chip" onClick={() => setMessages((x) => ({ ...x, [Object.keys(x)[0] ?? 'client']: m.texte }))}>
                                      {t(m.titre)}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {Object.entries(messages).map(([p, x]) => (
                                <label key={p} className="po-m">
                                  <span>{t(NOM_PARTIE_COURT[p as Partie])}</span>
                                  <textarea rows={3} value={x} onChange={(e) => setMessages((y) => ({ ...y, [p]: e.target.value }))} />
                                </label>
                              ))}
                            </details>
                          )}
                        </>
                      )}
                      {retour && (
                        <Note ton={retour.ton} icone={retour.ton === 'green' ? 'circle-check' : retour.ton === 'amber' ? 'users' : 'triangle-alert'} className="mt10" role="status">
                          {retour.texte}
                          {retour.suivant && suivant && !(suivant.id === d.id && suivant.genre === d.genre) && (
                            <>
                              {' '}
                              <button type="button" className="btn sm secondary" onClick={allerSuivant}>
                                {t('Dossier suivant')}
                              </button>
                            </>
                          )}
                        </Note>
                      )}
                      <div className="po-act">
                        <button type="button" className="btn primary po-decider" disabled={!pret} onClick={() => void decider()}>
                          <Icone nom="gavel" taille={18} />
                          <span>{issue && etatChoix === 'permise' ? tf('Décider : {issue}', { issue: t(issue.libelle).toLowerCase() }) : t('Décider')}</span>
                        </button>
                        {peutTransmettre && (
                          <button type="button" className={'btn ' + (etatChoix === 'transmettre' || d.ambigu ? 'primary' : 'secondary')} aria-pressed={mode === 'transmettre'} onClick={() => setMode(mode === 'transmettre' ? null : 'transmettre')} aria-keyshortcuts="t">
                            <Icone nom="arrow-up-right" taille={18} />
                            <span>{t('Transmettre')}</span>
                          </button>
                        )}
                      </div>
                      {!pret && peut && (
                        <p className="po-pourquoi c3 t13">
                          {!issue ? t('Choisissez une issue permise.') : etatChoix === 'bloquee' ? t('Cette issue est bloquée par la règle.') : etatChoix === 'transmettre' ? t('Cette issue dépasse votre niveau : transmettez.') : !motif ? t('Choisissez un motif dans la liste.') : !noteOk ? tf('La note compte au moins {n} caractères.', { n: PARAMETRES.console.motifMin }) : ''}
                        </p>
                      )}
                      {mode === 'transmettre' && (
                        <div className="po-form">
                          <p className="t13">{issue && issue.etat !== 'bloquee' ? tf('Transmis avec l’issue proposée : {i}.', { i: t(issue.libelle).toLowerCase() }) : t('Transmis sans issue proposée.')}</p>
                          {!peut && <ChampNote valeur={note} changer={setNote} libelle="Raison de la transmission *" />}
                          {peut && !noteOk && <p className="c3 t13">{t('La raison est la note ci-dessus.')}</p>}
                          <button type="button" className="btn sm primary" disabled={!noteOk} onClick={() => void transmettre()}>
                            <Icone nom="send" taille={16} />
                            {t('Transmettre au niveau supérieur')}
                          </button>
                        </div>
                      )}
                    </Section>
                  )}
                  {!d.decision && (
                    <Section titre={t('Appels et délai')} icone="phone" ouvert={!vueMobile}>
                      {d.appels.length > 0 && (
                        <ul className="po-aps">
                          {d.appels.map((a) => (
                            <li key={a.id}>
                              <Icone nom="phone-call" taille={15} />
                              <span>
                                <b>
                                  {t(NOM_PARTIE_COURT[a.avec])} · {t(a.resultat === 'joint' ? 'Joint' : a.resultat === 'absent' ? 'Absent' : a.resultat === 'accord' ? 'Accord' : 'Refus')}
                                </b>
                                {` · ${a.resume} · ${a.par} · `}
                                <Heure le={a.le} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="po-gestes">
                        <button type="button" className="btn sm secondary" disabled={!peut} aria-pressed={mode === 'appel'} onClick={() => setMode(mode === 'appel' ? null : 'appel')} aria-keyshortcuts="a">
                          <Icone nom="phone" taille={16} />
                          {t('Noter un appel')}
                        </button>
                        <button type="button" className="btn sm secondary" disabled={!d.prolongation.possible} title={d.prolongation.raison ?? undefined} aria-pressed={mode === 'prolonger'} onClick={() => setMode(mode === 'prolonger' ? null : 'prolonger')}>
                          <Icone nom="calendar-plus" taille={16} />
                          {d.prolongation.faite ? t('Déjà prolongé') : tf('Prolonger de {h} h', { h: d.prolongation.heures })}
                        </button>
                      </div>
                      {mode === 'appel' && (
                        <div className="po-form">
                          <div className="chips" role="radiogroup" aria-label={t('Avec qui')}>
                            {d.parties.map((p) => (
                              <button key={p.partie + p.nom} type="button" role="radio" aria-checked={appel.avec === p.partie} className={'chip' + (appel.avec === p.partie ? ' on' : '')} onClick={() => setAppel((x) => ({ ...x, avec: p.partie }))}>
                                {t(NOM_PARTIE_COURT[p.partie])}
                              </button>
                            ))}
                          </div>
                          <div className="seg" role="radiogroup" aria-label={t('Résultat')}>
                            {(['joint', 'absent', 'accord', 'refus'] as const).map((r) => (
                              <button key={r} type="button" role="radio" aria-checked={appel.resultat === r} className={appel.resultat === r ? 'on' : ''} onClick={() => setAppel((x) => ({ ...x, resultat: r }))}>
                                {t(r === 'joint' ? 'Joint' : r === 'absent' ? 'Absent' : r === 'accord' ? 'Accord' : 'Refus')}
                              </button>
                            ))}
                          </div>
                          {appel.resultat === 'accord' && (
                            <label className="po-m">
                              <span>{t('Issue convenue (permises seulement)')}</span>
                              <select value={appel.accord} onChange={(e) => setAppel((x) => ({ ...x, accord: e.target.value }))}>
                                <option value="">{t('Choisir…')}</option>
                                {d.issues
                                  .filter((i) => i.etat === 'permise')
                                  .map((i) => (
                                    <option key={i.id} value={i.id}>
                                      {t(i.libelle)}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          )}
                          <label className="po-m">
                            <span>{t('Résumé de l’appel *')}</span>
                            <textarea rows={2} value={appel.resume} onChange={(e) => setAppel((x) => ({ ...x, resume: e.target.value }))} />
                          </label>
                          <button type="button" className="btn sm primary" disabled={appel.resume.trim().length < 10 || (appel.resultat === 'accord' && !appel.accord)} onClick={() => void noterAppel()}>
                            <Icone nom="check" taille={16} />
                            {t('Noter l’appel')}
                          </button>
                        </div>
                      )}
                      {mode === 'prolonger' && (
                        <div className="po-form">
                          <p className="t13">{tf('Une seule prolongation de {h} h par dossier ; la note dit pourquoi.', { h: d.prolongation.heures })}</p>
                          {!noteOk && <ChampNote valeur={note} changer={setNote} libelle="Pourquoi prolonger *" />}
                          <button type="button" className="btn sm primary" disabled={!noteOk} onClick={() => void prolonger()}>
                            {t('Prolonger l’échéance')}
                          </button>
                        </div>
                      )}
                      {d.route && (
                        <p className="t13 mt10">
                          <Link className="po-lien" to={chemin(d.route.route, d.route.params)}>
                            {t('Ouvrir la page d’origine')}
                            <Icone nom="arrow-right" taille={14} />
                          </Link>
                        </p>
                      )}
                    </Section>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        <Visionneuse pieces={vision ?? []} ouverte={!!vision} fermer={() => setVision(null)} titre={vision && vision.length > 1 ? t('Comparer côte à côte') : (vision?.[0]?.titre ?? t('Preuve'))} />
      </div>
    </Ecran>
  )
}

/** Note de la décision (motif écrit) : compteur ; Ctrl+Entrée décide. */
function ChampNote({ valeur, changer, libelle = 'Note *', ref_, decider }: { valeur: string; changer: (v: string) => void; libelle?: string; ref_?: Ref<HTMLTextAreaElement>; decider?: () => void }) {
  const { t, tf } = usePreferences()
  const n = valeur.trim().length
  const min = PARAMETRES.console.motifMin
  const id = 'po-note-' + libelle.length
  return (
    <div className="po-note">
      <label htmlFor={id} className="po-lab">
        <span>{t(libelle)}</span>
        <span className={n >= min ? 'ok' : 'c3'}>{n >= min ? tf('{n} caractères ✓', { n }) : tf('{n} sur {min} caractères', { n, min })}</span>
      </label>
      <textarea
        id={id}
        ref={ref_}
        rows={3}
        value={valeur}
        placeholder={t('Les faits établis par les preuves, en une ou deux phrases…')}
        onChange={(e) => changer(e.target.value)}
        onKeyDown={(e) => {
          if (decider && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            decider()
          }
        }}
      />
    </div>
  )
}

/** Décision rendue : issue, montant, motif, note, suites, écart à la suggestion. */
function Decide({ d, suivant, allerSuivant }: { d: DossierPoste; suivant: boolean; allerSuivant: () => void }) {
  const { t, tf } = usePreferences()
  const x = d.decision!
  return (
    <section className="panel po-dec" aria-label={t('Décision rendue')}>
      <div className="ph">
        <span className="ic green" aria-hidden="true">
          <Icone nom="circle-check" taille={18} />
        </span>
        <h2>{t('Décision rendue')}</h2>
        <Pill ton="green" sm>
          {t(x.etat === 'contresignee' ? 'Contresignée' : x.etat === 'a_contresigner' ? 'À contresigner' : 'Appliquée')}
        </Pill>
      </div>
      <p className="po-dec-t">
        <b>{t(x.libelle)}</b>
        {x.montant ? ` · ${f(x.montant)}` : ''}
      </p>
      <p className="t13 c3">
        {x.par} · <Heure le={x.le} />
        {x.lot && ` · ${tf('lot {l}', { l: x.lot })}`}
      </p>
      {x.ecart && (
        <Note ton="amber" icone="shuffle" className="mt8">
          {tf('S’écarte de la suggestion de la règle ; motif : {m}. L’Audit la relit.', { m: t(x.motif) })}
        </Note>
      )}
      {x.note && <p className="po-dec-n">{x.note}</p>}
      {x.suites.length > 0 && (
        <div className="admA-eff">
          <div className="k">{t('Suites envoyées aux espaces')}</div>
          <ul>
            {x.suites.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {suivant && (
        <button type="button" className="btn primary mt10" onClick={allerSuivant}>
          {t('Dossier suivant')}
          <Icone nom="arrow-right" taille={16} />
        </button>
      )}
    </section>
  )
}

/** Lot de dossiers identiques (même cause, même issue) : une décision pour tous, plafonnée. */
function LotBandeau({ l, ouvert, ouvrir, apres }: { l: DossierCourt[]; ouvert: boolean; ouvrir: () => void; apres: (texte: string) => void }) {
  const { t, tf } = usePreferences()
  const premier = useLecture(() => source.decisions.dossier(l[0].genre, l[0].id), [l[0].genre, l[0].id, ouvert])
  const d = premier.donnees
  const issue = d?.issues.find((i) => i.id === d.lecture?.issue) ?? null
  const [montant, setMontant] = useState<number | null>(null)
  const [motif, setMotif] = useState('')
  const [note, setNote] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const m = montant ?? issue?.fourchette?.min ?? null
  const valider = async () => {
    if (!d || !issue) return
    const r = await source.decisions.deciderLot(l[0].genre, l.map((x) => x.id), { issue: issue.id, montant: issue.fourchette ? m : null, motif, note, message: '' })
    if (!r.ok) setErreur(r.detail ?? t('Lot refusé.'))
    else apres(tf('{n} dossiers décidés en lot, chacun journalisé.', { n: r.n }))
  }
  return (
    <div className="po-lot">
      <div className="po-lot-h">
        <Icone nom="layers" taille={18} />
        <span className="grow">
          <b>{tf('Lot · {n} dossiers identiques', { n: l.length })}</b>
          <span className="c3 t13">{l.map((x) => x.id).join(', ') + (l[0].suggestion ? ` · ${t(l[0].suggestion)}` : '')}</span>
        </span>
        <button type="button" className="btn sm secondary" aria-expanded={ouvert} onClick={ouvrir}>
          {t('Décider en lot')}
        </button>
      </div>
      {ouvert && d && issue && (
        <div className="po-form">
          <p className="t13">{tf('Même issue pour chacun : {i}. Au plus {n} dossiers, total sous votre plafond.', { i: t(issue.libelle).toLowerCase(), n: PARAMETRES.decisions.lotMax })}</p>
          {issue.fourchette && (
            <label className="po-m">
              <span>
                {t('Montant par dossier')} : <b>{f(m ?? 0)}</b>
              </span>
              <input type="range" min={issue.fourchette.min} max={issue.fourchette.max} step={issue.fourchette.pas} value={m ?? issue.fourchette.min} onChange={(e) => setMontant(Number(e.target.value))} />
            </label>
          )}
          <div className="chips" role="radiogroup" aria-label={t('Motif')}>
            {d.motifs.map((x) => (
              <button key={x} type="button" role="radio" aria-checked={motif === x} className={'chip' + (motif === x ? ' on' : '')} onClick={() => setMotif(x)}>
                {t(x)}
              </button>
            ))}
          </div>
          <ChampNote valeur={note} changer={setNote} libelle="Note du lot *" />
          {erreur && (
            <Note ton="red" icone="triangle-alert" className="mt8" role="status">
              {erreur}
            </Note>
          )}
          <button type="button" className="btn sm primary" disabled={!motif || note.trim().length < PARAMETRES.console.motifMin} onClick={() => void valider()}>
            <Icone nom="gavel" taille={16} />
            {tf('Décider les {n} dossiers', { n: l.length })}
          </button>
        </div>
      )}
    </div>
  )
}
