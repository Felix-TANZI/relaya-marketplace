// Descentes terrain (logique-metier/ACCES-CONSOLE.md § 9) : le responsable des Opérations planifie (vérification de
// boutique, inspection de relais, recrutement, constat de litige, contrôle de zone), choisit la zone, la date et l'agent
// (un agent terrain de cette zone), suit le statut ; le compte rendu de l'agent alimente la KYC, le relais ou le litige
// (lien vers le dossier). Fonctions d'abord : Planifier, Assigner, Suivre ; ses zones seulement (la source filtre).
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Pill, Px, Vide, useSurtitre, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { Descente, StatutDescente, TableauDescentes, TypeDescente } from '../../donnees/domaines/equipe'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge } from '../../session'
import { useFonctions } from '../AJ-A/fonctions-page'
import { EtatLecture, useDate } from '../ADM-12/commun-s6'
import { useIssue } from './commun'

export const TYPES_DESCENTE: Record<TypeDescente, [string, string, Descente['cible']['genre'][]]> = {
  verification_boutique: ['Vérification de boutique', 'store', ['kyc']],
  inspection_relais: ['Inspection de relais', 'package-check', ['relais']],
  recrutement: ['Recrutement', 'user-plus', ['zone', 'recrutement']],
  constat_litige: ['Constat de litige', 'scale', ['litige']],
  controle_zone: ['Contrôle de zone', 'map-pinned', ['zone']],
}
export const STATUT_DESCENTE: Record<StatutDescente, [string, Ton]> = { planifiee: ['Planifiée', 'blue'], en_route: ['En route', 'amber'], sur_place: ['Sur place', 'amber'], terminee: ['Terminée', 'green'], annulee: ['Annulée', 'ink'] }
export const RESULTAT: Record<'conforme' | 'non_conforme' | 'a_revoir', [string, Ton]> = { conforme: ['Conforme', 'green'], non_conforme: ['Non conforme', 'red'], a_revoir: ['À revoir', 'amber'] }
/** Page du dossier relié à la descente. */
export const lienCible = (c: Descente['cible']) => (c.genre === 'kyc' ? chemin('kyc', { id: c.ref }) : c.genre === 'relais' ? chemin('relais', { id: c.ref }) : c.genre === 'litige' ? chemin('litige', { id: c.ref }) : chemin('zones', { zone: c.ref }))

type Filtre = 'a_venir' | 'en_cours' | 'terminees' | 'sans_agent'

export default function Descentes() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const [params, setParams] = useSearchParams()
  const filtre = (params.get('filtre') ?? 'a_venir') as Filtre
  const l = useLecture(() => source.equipe.descentes(), [])
  const [planifier, setPlanifier] = useState(false)
  const droit = useDroit('descentes')
  const d = l.donnees
  const n = (f: Filtre) => (d ? d.descentes.filter((x) => passe(x, f)).length : 0)
  const choisir = (f: Filtre) => setParams(f === 'a_venir' ? {} : { filtre: f }, { replace: true })
  const fonctions = useFonctions([
    droit.acces !== 'lecture' && { verbe: 'Planifier', n: null, unite: ['descente', 'descentes'], icone: 'calendar-plus', onClick: () => setPlanifier(true) },
    { verbe: 'Assigner', n: n('sans_agent'), unite: ['descente sans agent', 'descentes sans agent'], icone: 'user-plus', onClick: () => choisir('sans_agent'), alerte: true },
    { verbe: 'Suivre', n: n('en_cours'), unite: ['descente en cours', 'descentes en cours'], icone: 'navigation', onClick: () => choisir('en_cours') },
    { verbe: 'Lire', n: n('terminees'), unite: ['compte rendu', 'comptes rendus'], icone: 'clipboard-check', onClick: () => choisir('terminees') },
  ])
  return (
    <Ecran route="descentes" kicker={surtitre} fonctions={fonctions}>
      <Px>
        <EtatLecture l={l} quoi="les descentes terrain">
          {(v) => (
            <>
              <div className="chips a-segs mt16" role="group" aria-label={t('Filtrer les descentes')}>
                {(
                  [
                    ['a_venir', 'À venir'],
                    ['en_cours', 'En cours'],
                    ['sans_agent', 'Sans agent'],
                    ['terminees', 'Terminées'],
                  ] as [Filtre, string][]
                ).map(([f, lib]) => (
                  <button key={f} type="button" className={'chip' + (filtre === f ? ' on' : '')} aria-pressed={filtre === f} onClick={() => choisir(f)}>
                    {t(lib)} <span className="n">{n(f)}</span>
                  </button>
                ))}
              </div>
              <div className="dt-liste">
                {v.descentes
                  .filter((x) => passe(x, filtre))
                  .map((x) => (
                    <CarteDescente key={x.id} d={x} v={v} lecture={droit.acces === 'lecture'} />
                  ))}
                {!v.descentes.some((x) => passe(x, filtre)) && <Vide icone="map-pinned" t={t('Aucune descente dans ce filtre')} />}
              </div>
              <Planifier ouverte={planifier} fermer={() => setPlanifier(false)} v={v} />
            </>
          )}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}

function passe(d: Descente, f: Filtre) {
  if (f === 'terminees') return d.statut === 'terminee'
  if (f === 'en_cours') return d.statut === 'en_route' || d.statut === 'sur_place'
  if (f === 'sans_agent') return d.statut === 'planifiee' && !d.agentId
  return d.statut === 'planifiee'
}

function CarteDescente({ d, v, lecture }: { d: Descente; v: TableauDescentes; lecture: boolean }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const issue = useIssue()
  const [ouvert, setOuvert] = useState(false)
  const [annuler, setAnnuler] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const agents = v.agents.filter((a) => a.zones.includes(d.zone))
  const [lib, ic] = TYPES_DESCENTE[d.type]
  return (
    <article className="card dt-carte" aria-label={`${d.id} · ${t(lib)}`}>
      <div className="dt-l1">
        <span className="row" style={{ gap: 10, alignItems: 'center', minWidth: 0 }}>
          <Icone nom={ic} taille={20} />
          <b>{`${t(lib)} · ${d.lieu}`}</b>
        </span>
        <Pill ton={STATUT_DESCENTE[d.statut][1]} sm dot>
          {t(STATUT_DESCENTE[d.statut][0])}
        </Pill>
      </div>
      <div className="dt-meta">
        <span>
          <Icone nom="calendar" taille={14} />
          {date(d.prevueLe)}
        </span>
        <span>
          <Icone nom="map-pin" taille={14} />
          {d.zone}
        </span>
        <span>
          <Icone nom="user-round" taille={14} />
          {d.agent ?? t('Sans agent')}
        </span>
        <Link to={lienCible(d.cible)}>{d.cible.libelle}</Link>
      </div>
      {d.statut === 'planifiee' && !lecture ? (
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="fld" style={{ minWidth: 200, flex: '1 1 200px' }}>
            <span className="vh">{tf('Agent de {d}', { d: d.id })}</span>
            <span className="inp">
              <select
                aria-label={tf('Agent de {d}', { d: d.id })}
                value={d.agentId ?? ''}
                onChange={async (e) => {
                  if (e.target.value) setErreur(issue(await source.equipe.assigner(d.id, e.target.value)))
                }}
              >
                <option value="">{t('Choisir l’agent…')}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {tf('{n} · {k} à faire', { n: a.nom, k: a.aFaire })}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <button type="button" className="lnk" onClick={() => setAnnuler(true)}>
            {t('Annuler')}
          </button>
        </div>
      ) : (
        <details className="a-plie" open={ouvert} onToggle={(e) => setOuvert((e.target as HTMLDetailsElement).open)}>
          <summary>{d.statut === 'terminee' && d.resultat ? `${t('Compte rendu')} · ${t(RESULTAT[d.resultat][0])}` : tf('{n} contrôles', { n: d.controles.length })}</summary>
          <div className="a-plie-c">
            {d.controles.map((c) => (
              <div key={c.id} className="check">
                <span className={'cbx ' + (c.ok === true ? 'on' : c.ok === false ? 'bad' : '')}>{c.ok !== null && <Icone nom={c.ok ? 'check' : 'x'} taille={14} trait={3} />}</span>
                <span className="grow">{t(c.libelle)}</span>
              </div>
            ))}
            {d.compteRendu && <p className="mt10">{d.compteRendu}</p>}
            {d.photos.length > 0 && (
              <div className="dt-photos">
                {d.photos.map((p) => (
                  <Pill key={p.id} ton="ink" sm icone="image">
                    {p.nom}
                  </Pill>
                ))}
              </div>
            )}
          </div>
        </details>
      )}
      {erreur && (
        <p className="e-erreur" role="alert">
          {erreur}
        </p>
      )}
      <DecisionMotivee ouverte={annuler} fermer={() => setAnnuler(false)} titre={tf('Annuler {d}', { d: d.id })} resume={`${t(lib)} · ${d.lieu}`} libelle="Annuler la descente" danger envoyer={async (m) => issue(await source.equipe.annulerDescente(d.id, m))} />
    </article>
  )
}

function Planifier({ ouverte, fermer, v }: { ouverte: boolean; fermer: () => void; v: TableauDescentes }) {
  const { t, tf } = usePreferences()
  const issue = useIssue()
  const n = useHorloge()
  const [type, setType] = useState<TypeDescente>('inspection_relais')
  const [cible, setCible] = useState('')
  const [quand, setQuand] = useState('1')
  const [heure, setHeure] = useState('10:00')
  const [agent, setAgent] = useState('')
  const [repere, setRepere] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const cibles = v.cibles.filter((c) => TYPES_DESCENTE[type][2].includes(c.genre))
  const c = cibles.find((x) => x.ref === cible) ?? null
  const agents = c ? v.agents.filter((a) => a.zones.includes(c.zone)) : []
  const envoyer = async () => {
    if (!c) return
    const [h, mn] = heure.split(':').map(Number)
    const jour = new Date(n + 3600_000)
    const prevueLe = Date.UTC(jour.getUTCFullYear(), jour.getUTCMonth(), jour.getUTCDate() + Number(quand), h, mn) - 3600_000
    const r = await source.equipe.planifier({ type, zone: c.zone, cible: { genre: type === 'recrutement' ? 'recrutement' : c.genre, ref: c.ref, libelle: c.libelle }, lieu: c.lieu, repere, prevueLe, agentId: agent || null })
    const e = issue(r)
    setErreur(e)
    if (!e && r.ok && 'id' in r) {
      setInfo(tf('{d} planifiée.', { d: r.id }))
      setCible('')
      setAgent('')
      setRepere('')
    }
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Planifier une descente')} forme="large">
      <div className="e-decision">
        <h2 className="card-t">{t('Planifier une descente')}</h2>
        <label className="fld mt14">
          <span className="fld-t">{t('Type')}</span>
          <span className="inp">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as TypeDescente)
                setCible('')
                setAgent('')
              }}
            >
              {(Object.keys(TYPES_DESCENTE) as TypeDescente[]).map((x) => (
                <option key={x} value={x}>
                  {t(TYPES_DESCENTE[x][0])}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="fld mt10">
          <span className="fld-t">{t('Lieu ou dossier')}</span>
          <span className="inp">
            <select
              value={cible}
              onChange={(e) => {
                setCible(e.target.value)
                setAgent('')
              }}
            >
              <option value="">{t('Choisir…')}</option>
              {cibles.map((x) => (
                <option key={x.ref} value={x.ref}>{`${x.libelle} · ${x.zone}`}</option>
              ))}
            </select>
          </span>
        </label>
        <div className="g g2 mt10">
          <label className="fld">
            <span className="fld-t">{t('Jour')}</span>
            <span className="inp">
              <select value={quand} onChange={(e) => setQuand(e.target.value)}>
                <option value="0">{t('Aujourd’hui')}</option>
                <option value="1">{t('Demain')}</option>
                <option value="2">{t('Après-demain')}</option>
                <option value="7">{t('Dans une semaine')}</option>
              </select>
            </span>
          </label>
          <label className="fld">
            <span className="fld-t">{t('Heure')}</span>
            <span className="inp">
              <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
            </span>
          </label>
        </div>
        <label className="fld mt10">
          <span className="fld-t">{t('Agent terrain')}</span>
          <span className="inp">
            <select value={agent} onChange={(e) => setAgent(e.target.value)} disabled={!c}>
              <option value="">{t('Plus tard')}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {tf('{n} · {k} à faire', { n: a.nom, k: a.aFaire })}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="fld mt10">
          <span className="fld-t">{t('Repère')}</span>
          <span className="inp">
            <input value={repere} onChange={(e) => setRepere(e.target.value)} placeholder={t('Face au lycée, boutique bleue…')} />
          </span>
        </label>
        {erreur && (
          <p className="e-erreur mt10" role="alert">
            {erreur}
          </p>
        )}
        {info && (
          <p className="t13 mt10" role="status">
            {info}
          </p>
        )}
        <div className="btns mt16">
          <button type="button" className="btn ghost" onClick={fermer}>
            {t('Fermer')}
          </button>
          <button type="button" className="btn primary" disabled={!c} onClick={() => void envoyer()}>
            <Icone nom="calendar-plus" taille={18} />
            <span>{t('Planifier')}</span>
          </button>
        </div>
      </div>
    </Feuille>
  )
}
