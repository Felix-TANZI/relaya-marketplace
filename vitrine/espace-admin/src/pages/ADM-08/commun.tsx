// Briques communes des écrans de la logistique (S4 : ADM-08, ADM-09, page « candidatures ») : mêmes balises que les
// aides du prototype (admLg_gauge, admLg_chain, admLg_m4, admLg_rowst, admLg_zone, admLg_n, C.tl, C.stop, C.check) et
// le GESTE motivé : un bouton qui demande d'abord à la source si le geste est permis (rôle, zone, état : verifier),
// puis ouvre DecisionMotivee (motif, preuves, quatre yeux) ; la source applique et journalise, l'écran dit l'issue.
import { useState, type ReactNode } from 'react'
import { F } from '@client/i18n/format'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Banniere, Note, Pill, Vide } from '../../composants/prototype'
import { NOM_ROLE } from '../../config/libelles'
import type { EtatDecision } from '../../donnees/communs'
import type { ActionLogistique, Etape, Moment, Ton } from '../../donnees/domaines/logistique'
import type { Preuve } from '../../donnees/domaines/quatreyeux'
import { source } from '../../donnees/source'
import { useLecture, type Lecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { PARAM } from './parametres'
import './s4.css'

export const francs = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${F(n)} F`)

/** Jour et heure de Yaoundé : « mar. 13 oct. · 14 h 05 » (« Tue 13 Oct · 14:05 »). */
export function quand(le: number | null, langue: 'fr' | 'en', jour = true): string {
  if (le === null) return '—'
  const p = Object.fromEntries(new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Douala', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(le)).map((x) => [x.type, x.value]))
  const h = langue === 'en' ? `${p.hour}:${p.minute}` : `${Number(p.hour)} h ${p.minute}`
  return jour ? `${p.weekday} ${p.day} ${p.month} · ${h}` : h
}
/** « ven. 9 oct. » */
export const jourCourt = (le: number, langue: 'fr' | 'en') => new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Douala', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(le))
export const dateCourte = (le: number, langue: 'fr' | 'en') => new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Douala', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(le))

// ── Lecture : chargement, erreur (données gardées, Réessayer), réservé au rôle (la garde le dit) ──────────────────
export function Lu<T>({ l, children, quoi }: { l: Lecture<T>; quoi: string; children: (d: T) => ReactNode }) {
  const { t, tf } = usePreferences()
  if (l.erreur?.name === 'AccesRefuse') throw l.erreur
  return (
    <>
      {l.erreur && (
        <Banniere ton="red" icone="cloud-off" role="alert" bouton={<BoutonRelire l={l} />}>
          <b>{tf('{quoi} n’a pas pu être chargé.', { quoi: t(quoi) })}</b> {t('Rien n’est perdu : les dernières données restent affichées.')}
        </Banniere>
      )}
      {l.donnees === null ? (
        !l.erreur && (
          <div className="card s4-charge" aria-busy="true">
            <Icone nom="loader" taille={18} />
            <span>{t('Chargement…')}</span>
          </div>
        )
      ) : (
        children(l.donnees)
      )}
    </>
  )
}
function BoutonRelire({ l }: { l: Lecture<unknown> }) {
  const { t } = usePreferences()
  return (
    <button type="button" className="btn sm" onClick={l.relire}>
      <Icone nom="rotate-cw" taille={16} />
      <span>{t('Réessayer')}</span>
    </button>
  )
}

/** Fiche introuvable ou hors du périmètre de l'agent (la source ne la rend pas). */
export function Introuvable({ quoi, retour, libelle }: { quoi: string; retour: () => void; libelle: string }) {
  const { t } = usePreferences()
  return (
    <Vide
      icone="search-x"
      t={t(quoi)}
      s={t('Cette fiche n’existe pas ou n’est pas dans votre périmètre : la source ne la montre qu’aux rôles et aux zones qui en ont le droit.')}
      action={
        <button type="button" className="btn secondary" onClick={retour}>
          <Icone nom="arrow-left" taille={18} />
          <span>{t(libelle)}</span>
        </button>
      }
    />
  )
}

// ── Petites aides visuelles du prototype ──────────────────────────────────────────────────────────────────────────
export function Jauge({ occupes, capacite, off, sous, grande }: { occupes: number; capacite: number; off?: boolean; sous?: boolean; grande?: boolean }) {
  const { t, tf } = usePreferences()
  const p = capacite ? Math.round((100 * occupes) / capacite) : 0
  const mauvais = p >= PARAM.relais.saturePct
  return (
    <div>
      <div className="admlg-gw" role="img" aria-label={off ? t('Non sélectionnable') : tf('{p} % des places occupées', { p })}>
        <div className={'admlg-gauge' + (grande ? ' big' : '')}>
          <i className={off ? 'off' : mauvais ? 'bad' : ''} style={{ width: Math.min(100, Math.max(off ? 100 : p, 2)) + '%' }}></i>
          <span className="m90" style={{ left: PARAM.relais.saturePct + '%' }}></span>
        </div>
        <b>{off ? '—' : `${p} %`}</b>
      </div>
      {sous && <div className="t12 c3 s4-sous">{off ? t('Non sélectionnable') : tf('{o} / {c} places', { o: occupes, c: capacite })}</div>}
    </div>
  )
}
export function ZonePt({ code, nom, ton }: { code: string; nom?: string; ton?: 'warn' | 'sale' | '' }) {
  return (
    <span className="admlg-zdot">
      <i className={ton ?? ''}></i>
      {code + (nom ? ' · ' + nom : '')}
    </span>
  )
}
export function Nb({ v, ton }: { v: number; ton?: 'on' | 'red' | 'green' | 'amber' | 'or' }) {
  return <span className={'admlg-n ' + (v ? (ton ?? 'on') : '')}>{v}</span>
}
const ST_ETAPE = { fait: 'done', en_cours: 'cur', a_faire: '', bloque: 'lock' } as const
export function Chaine({ etapes }: { etapes: Etape[] }) {
  const { t } = usePreferences()
  return (
    <ol className="admlg-chain s4-chain">
      {etapes.map((e, i) => (
        <li key={e.titre} className={'s ' + ST_ETAPE[e.etat]}>
          <b aria-hidden="true">{e.etat === 'fait' ? <Icone nom="check" taille={15} /> : e.etat === 'bloque' ? <Icone nom="lock" taille={14} /> : i + 1}</b>
          <div>
            <div className="t">{t(e.titre)}</div>
            <div className="d">{t(e.detail)}</div>
            <span className="vh">{t(e.etat === 'fait' ? 'Fait' : e.etat === 'en_cours' ? 'En cours' : e.etat === 'bloque' ? 'Bloqué' : 'À faire')}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}
export function M4({ l, v, s, icone }: { l: ReactNode; v: ReactNode; s?: ReactNode; icone?: string }) {
  return (
    <div className="m4">
      <div className="l">
        {icone && <Icone nom={icone} taille={14} />}
        {l}
      </div>
      <div className="v">{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  )
}
export function RowSt({ l, r, couleur }: { l: ReactNode; r: ReactNode; couleur?: string }) {
  return (
    <div className="admlg-rowst">
      <span className="l">
        {couleur && <i style={{ background: couleur }}></i>}
        {l}
      </span>
      <span>{r}</span>
    </div>
  )
}
export function Check({ ok, mauvais, children }: { ok: boolean; mauvais?: boolean; children: ReactNode }) {
  const { t } = usePreferences()
  return (
    <div className="check">
      <span className={'cbx' + (ok ? ' on' : '') + (mauvais ? ' bad' : '')} aria-label={t(ok ? 'Fait' : 'À faire')} role="img">
        {ok ? <Icone nom="check" taille={14} /> : mauvais ? <Icone nom="x" taille={14} /> : null}
      </span>
      <span className="grow">{children}</span>
    </div>
  )
}
const ST_MOMENT = { fait: 'done', en_cours: 'cur', mauvais: 'bad', a_venir: '' } as const
export function Chronologie({ items }: { items: Moment[] }) {
  const { t, langue } = usePreferences()
  if (!items.length) return <p className="t13 c3">{t('Rien aujourd’hui.')}</p>
  return (
    <div className="tl">
      {items.map((m, i) => (
        <div key={i} className={'ti ' + ST_MOMENT[m.etat]}>
          <div className="tt">{(m.le !== null ? quand(m.le, langue, false) + ' · ' : '') + t(m.titre)}</div>
          {m.detail && <div className="td">{t(m.detail)}</div>}
        </div>
      ))}
    </div>
  )
}
export function Arret({ n, etat, t: titre, s, droite }: { n: number; etat: 'fait' | 'en_cours' | 'a_venir' | 'mauvais'; t: ReactNode; s?: ReactNode; droite?: ReactNode }) {
  return (
    <div className={'stop ' + { fait: 'done', en_cours: 'cur', a_venir: '', mauvais: 'bad' }[etat]}>
      <span className="sn">{etat === 'fait' ? <Icone nom="check" taille={15} /> : n}</span>
      <span className="grow">
        <span className="st" style={{ display: 'block' }}>
          {titre}
        </span>
        {s && (
          <span className="ss" style={{ display: 'block' }}>
            {s}
          </span>
        )}
      </span>
      {droite}
    </div>
  )
}
export const StatutPill = ({ t, ton }: { t: string; ton: Ton }) => {
  const { t: tr } = usePreferences()
  return (
    <Pill ton={ton} dot sm>
      {tr(t)}
    </Pill>
  )
}

// ── Geste motivé ─────────────────────────────────────────────────────────────────────────────────────────────────
/** Libellés des gestes (bouton, titre de la feuille, phrase de ce qui sera fait). */
export const GESTES: Record<ActionLogistique, { bouton: string; icone: string; titre: string }> = {
  'relais.basculer': { bouton: 'Orienter vers le secours', icone: 'arrow-right-left', titre: 'Orienter les nouveaux paquets vers le relais de secours' },
  'relais.attendre': { bouton: 'Garder en attente', icone: 'pause', titre: 'Garder le relais saturé en attente' },
  'relais.transferer': { bouton: 'Transférer les colis', icone: 'truck', titre: 'Transférer les colis en garde' },
  'relais.relancer': { bouton: 'Relancer le gérant', icone: 'message-circle', titre: 'Relancer le gérant du relais fermé' },
  'relais.activer': { bouton: 'Ouvrir le relais', icone: 'store', titre: 'Ouvrir le relais aux clients' },
  'relais.fin_convention': { bouton: 'Mettre fin à la convention', icone: 'circle-x', titre: 'Mettre fin à la convention du relais' },
  'relais.fermer': { bouton: 'Fermer le relais', icone: 'lock', titre: 'Fermer définitivement le relais' },
  'relais.apurement': { bouton: 'Valider le plan d’apurement', icone: 'calendar-check', titre: 'Valider le plan d’apurement de la dette d’espèces' },
  'entreprise.suspendre': { bouton: 'Suspendre l’entreprise', icone: 'ban', titre: 'Suspendre l’entreprise de livraison' },
  'entreprise.lever': { bouton: 'Lever la suspension', icone: 'circle-check', titre: 'Lever la suspension de l’entreprise' },
  'entreprise.activer': { bouton: 'Activer l’entreprise', icone: 'circle-check', titre: 'Activer l’entreprise (phase pilote)' },
  'zone.placer': { bouton: 'Placer', icone: 'map-pin', titre: 'Placer le quartier dans une zone' },
  'livreur.suspendre': { bouton: 'Suspendre le livreur', icone: 'user-x', titre: 'Suspendre le livreur' },
  'livreur.activer': { bouton: 'Valider la certification', icone: 'badge-check', titre: 'Valider la certification du livreur' },
  'livreur.retablir': { bouton: 'Rétablir le livreur', icone: 'user-check', titre: 'Rétablir le livreur' },
  'depart.clore': { bouton: 'Clore le départ (kit non contesté)', icone: 'log-out', titre: 'Clore le départ échu, kit non contesté' },
  'kit.maintenir': { bouton: 'Maintenir la retenue', icone: 'scale', titre: 'Maintenir la retenue du kit' },
  'kit.annuler': { bouton: 'Annuler la retenue', icone: 'undo-2', titre: 'Annuler la retenue du kit' },
  'identifiant.accepter': { bouton: 'Accepter le changement', icone: 'smartphone', titre: 'Accepter le nouvel identifiant du livreur' },
  'identifiant.refuser': { bouton: 'Refuser', icone: 'x', titre: 'Refuser le nouvel identifiant du livreur' },
  'paquet.elargir': { bouton: 'Élargir la publication', icone: 'megaphone', titre: 'Élargir la publication du paquet' },
  'paquet.priorite': { bouton: 'Relever la priorité', icone: 'arrow-up-wide-narrow', titre: 'Relever la priorité du paquet' },
  'paquet.prevenir': { bouton: 'Prévenir le vendeur et le client', icone: 'send', titre: 'Prévenir le vendeur et le client d’un décalage' },
  'paquet.retirer': { bouton: 'Retirer le paquet vidé', icone: 'package-x', titre: 'Retirer un paquet vidé par des annulations' },
  'zone.plan': { bouton: 'Enregistrer le plan d’action', icone: 'list-checks', titre: 'Plan d’action de la zone en alerte' },
  'zone.saison': { bouton: 'Délai saisonnier', icone: 'cloud-rain', titre: 'Activer ou retirer le délai saisonnier de la zone' },
  'emballage.commander': { bouton: 'Commander', icone: 'shopping-cart', titre: 'Commander un format sous le seuil' },
  'emballage.facturer': { bouton: 'Facturer l’écart', icone: 'receipt', titre: 'Facturer l’écart d’emballages à l’entreprise' },
  'emballage.justifier': { bouton: 'Demander la justification', icone: 'message-circle', titre: 'Demander la justification de l’écart' },
  'etiquettes.attribuer': { bouton: 'Attribuer une plage', icone: 'tag', titre: 'Attribuer une plage d’étiquettes' },
  'etiquettes.invalider': { bouton: 'Invalider la plage', icone: 'tag', titre: 'Invalider une plage d’étiquettes perdue' },
  'candidature.prendre': { bouton: 'Prendre en charge', icone: 'hand', titre: 'Prendre la candidature en charge' },
  'candidature.completer': { bouton: 'Demander un complément', icone: 'circle-help', titre: 'Demander un complément au candidat' },
  'candidature.accepter': { bouton: 'Accepter', icone: 'check', titre: 'Accepter la candidature' },
  'candidature.refuser': { bouton: 'Refuser', icone: 'x', titre: 'Refuser la candidature' },
}

interface Demande {
  action: ActionLogistique
  objet: string
  resume: string
  preuves?: Preuve[]
  quatreYeux: boolean
  rolesSecond: import('../../donnees/communs').Role[]
}
/**
 * Gestes d'un écran : `demander` revérifie à la source (le refus est dit, avec sa raison) puis ouvre la décision
 * motivée ; `rendu` porte la feuille et l'issue (appliquée et journalisée, ou envoyée au second validateur).
 */
export function useGestes() {
  const { t, tf } = usePreferences()
  const [d, setD] = useState<Demande | null>(null)
  const [issue, setIssue] = useState<{ ton: 'green' | 'amber' | 'red'; texte: string } | null>(null)
  const demander = async (action: ActionLogistique, objet: string, resume: string, preuves?: Preuve[]) => {
    setIssue(null)
    const v = await source.logistique.verifier(action, objet).catch(() => null)
    if (!v) return setIssue({ ton: 'red', texte: t('La vérification n’a pas pu être faite. Rien n’a été appliqué : réessayez.') })
    if (!v.ok) return setIssue({ ton: 'red', texte: v.detail ? t(v.detail) : t(RAISON[v.raison] ?? RAISON.inconnu) })
    setD({ action, objet, resume, preuves, quatreYeux: v.regle.quatreYeux, rolesSecond: v.regle.rolesSecond })
  }
  const apres = (x: { etat: EtatDecision; id: string }, q: Demande) =>
    setIssue(
      x.etat === 'a_contresigner'
        ? { ton: 'amber', texte: tf('Décision envoyée au second validateur ({id}) : elle s’appliquera à la contre-signature par {roles}.', { id: x.id, roles: q.rolesSecond.map((r) => t(NOM_ROLE[r])).join(', ') }) }
        : { ton: 'green', texte: tf('{geste} : décision appliquée et journalisée ({objet}).', { geste: t(GESTES[q.action].bouton), objet: q.objet }) },
    )
  const rendu = (
    <>
      {issue && (
        <Note ton={issue.ton} icone={issue.ton === 'green' ? 'circle-check' : issue.ton === 'amber' ? 'users' : 'triangle-alert'} className="s4-issue" role={issue.ton === 'red' ? 'alert' : 'status'}>
          <span>{issue.texte}</span>{' '}
          <button type="button" className="lnk" onClick={() => setIssue(null)}>
            {t('Fermer')}
          </button>
        </Note>
      )}
      {d && (
        <DecisionMotivee
          ouverte
          fermer={() => setD(null)}
          titre={t(GESTES[d.action].titre)}
          action={d.action}
          objet={d.objet}
          resume={d.resume}
          preuves={d.preuves}
          quatreYeux={d.quatreYeux}
          rolesSecond={d.rolesSecond}
          libelle={GESTES[d.action].bouton}
          apres={(x) => x && apres(x, d)}
        />
      )}
    </>
  )
  return { demander, rendu }
}
const RAISON: Record<string, string> = {
  role: 'Votre rôle ne permet pas ce geste.',
  zone: 'Hors de votre périmètre de zones.',
  etat: 'Ce geste n’est pas possible dans l’état actuel.',
  inconnu: 'Ce dossier est introuvable.',
}

/**
 * Bouton d'un geste : la source dit d'avance s'il est permis. Rôle sans ce geste : rien (lecture seule) ; état ou zone
 * qui ne le permettent pas : bouton inactif qui dit pourquoi ; sinon, il ouvre la décision motivée.
 */
export function BoutonGeste({ g, action, objet, resume, preuves, genre = 'primary', sm, libelle }: { g: ReturnType<typeof useGestes>; action: ActionLogistique; objet: string; resume: string; preuves?: Preuve[]; genre?: 'primary' | 'secondary' | 'ghost'; sm?: boolean; libelle?: string }) {
  const { t } = usePreferences()
  const v = useLecture(() => source.logistique.verifier(action, objet), [action, objet])
  if (!v.donnees || (!v.donnees.ok && v.donnees.raison === 'role' && !v.donnees.detail)) return null
  const permis = v.donnees.ok
  const raison = v.donnees.ok ? null : v.donnees.detail ? t(v.donnees.detail) : t(RAISON[v.donnees.raison])
  const quatre = v.donnees.ok && v.donnees.regle.quatreYeux
  return (
    <button
      type="button"
      className={'btn ' + genre + (sm ? ' sm' : '')}
      aria-disabled={!permis || undefined}
      title={raison ?? undefined}
      data-raison={raison ?? undefined}
      onClick={() => void g.demander(action, objet, resume, preuves)}
    >
      <Icone nom={quatre ? 'users' : GESTES[action].icone} taille={sm ? 16 : 18} />
      <span>{t(libelle ?? GESTES[action].bouton)}</span>
    </button>
  )
}
