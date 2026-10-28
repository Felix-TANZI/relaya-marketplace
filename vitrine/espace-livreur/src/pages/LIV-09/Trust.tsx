// LIV-P26 · Mon Trust Score (LIV-09-R26 à R37, LIV-TSC-01 à 07, LIV-P26R-01 à R04, DED-35).
// Structure du prototype (route('trust') : en-tête secondaire, onglet Moi) : segments Mon score · Événements · Paliers
// (?onglet=).
// - Mon score : héros nuit (heure du calcul, tendance depuis l'activation, jauge 0-100 avec les seuils des paliers lus au
//   registre, note entière et palier), « Ce qui compose votre note » (cinq critères : poids, valeur, barre, points ; le
//   plus faible signalé, avec un conseil), courbe d'évolution avec le seuil du palier, qui voit le score ;
// - nouveau livreur (aucun événement mesuré) : jauge au neutre, aucun paquet refusé pour un score de départ, conseils ;
// - Événements : datés, reliés à leur mission, gravité, critère ; contestables UNE fois dans le délai (feuille du bas :
//   motif, note, effet suspendu jusqu'à la décision ; en file hors connexion) ;
// - Paliers : paliers, règles de passage, veto, barème, score de l'entreprise (lecture seule).
// Visible par le livreur, son entreprise et la console ; jamais par les clients, vendeurs ou gérants.
// Enrichissements : « Comment monter » vers la fiche de travail de l'Aide (M14) ; la courbe d'évolution se dessine (M9, coupé en
// mouvement réduit : graphes.tsx / liv09.css).
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Anneau, Barre, Btn, Foot, Hint, HorsConnexion, Kv, Li, Note, Pill, Sec, Seg } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { useEnLigne } from '../../donnees/fileHorsLigne'
import type { EvenementTrust, IdCritere, MotifContestation, Palier, TrustLivreur } from '../../donnees/domaines/trust'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { jourDe } from '../../calculs/temps'
import { echeance, heure, jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Chargement, ErreurLecture, useMaintenant, useMontee, useOrigine } from '../LIV-08/commun'
import { BarresH, Courbe, Jauge } from './graphes'
import './liv09.css'

const CRITERES: Record<IdCritere, [string, string]> = {
  ponctualite: ['Ponctualité', 'Annoncez-vous dans le créneau et déclarez tout retard tout de suite : un incident validé n’a aucun effet sur la Ponctualité.'],
  qualite: ['Qualité', 'Des photos nettes, prises à l’étape prévue : une preuve complète vaut un succès.'],
  litiges: ['Litiges', 'Vos photos de contrôle vous défendent ; un litige en cours ne compte pas, un litige gagné n’a aucun effet.'],
  anciennete: ['Ancienneté', 'Elle monte toute seule avec vos mois d’activité et vos missions validées.'],
  formation: ['Formation', 'Gardez votre certification à jour : expirée, ce critère tombe à zéro.'],
}
const PALIERS: Record<Palier, string> = { nouveau: 'Nouveau', confirme: 'Confirmé', or: 'Or' }
const SEV: Record<EvenementTrust['gravite'], [string, string]> = {
  succes: ['Succès', 'ok'],
  neutre: ['Neutre', 'neu'],
  g1: ['g1', 'g1'],
  g2: ['g2', 'g2'],
  g3: ['g3', 'g3'],
  veto: ['Veto', 'veto'],
}
/** Classe de gravité d'une ligne du barème (texte du registre). */
const classeBareme = (g: string) => (g.startsWith('Succès') ? 'ok' : g.startsWith('Veto') ? 'veto' : g.startsWith('Neutre') ? 'neu' : /^\d/.test(g) ? 'form' : g.slice(0, 2))
const MOTIFS: [MotifContestation, string, string][] = [
  ['incident_non_pris', 'Incident non pris en compte', 'Un incident validé couvre ce retard'],
  ['horodatage', 'Erreur d’horodatage', 'L’heure enregistrée ne correspond pas'],
  ['autre', 'Autre motif', 'Expliquez dans la note'],
]
const ETATS_CONTESTATION: Record<NonNullable<EvenementTrust['contestation']>['etat'], [string, string]> = {
  en_file: ['Contestation en file', 'amber'],
  en_examen: ['Contestation en examen · effet suspendu', 'amber'],
  acceptee: ['Contestation acceptée', 'green'],
  rejetee: ['Contestation rejetée', 'red'],
}
const nombre = (n: number, langue: string) => n.toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export default function Trust() {
  const { t, tf, langue } = usePreferences()
  const [p, setP] = useSearchParams()
  const en = useEnLigne()
  const onglet = p.get('onglet') ?? 'score'
  const lec = useLecture(() => source.trust.trust(), [])
  const aller = (o: string) => {
    const n = new URLSearchParams(p)
    if (o === 'score') n.delete('onglet')
    else n.set('onglet', o)
    n.delete('sheet')
    setP(n, { replace: true })
  }
  const d = lec.donnees
  return (
    <Ecran route="trust" proto action="aucune">
      {!en && d && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> · {tf('dernières données téléchargées à {h}. Le score se met à jour au retour du réseau.', { h: heure(d.recalculeA, langue) })}
        </HorsConnexion>
      )}
      <Seg
        label={t('Trust Score')}
        items={(
          [
            ['score', 'Mon score'],
            ['evenements', 'Événements'],
            ['paliers', 'Paliers'],
          ] as const
        ).map(([v, lib]) => ({ t: t(lib), on: onglet === v, onClick: () => aller(v) }))}
      />
      {lec.erreur ? <ErreurLecture relire={lec.relire} /> : !d ? <Chargement lignes={3} /> : onglet === 'evenements' ? <Evenements d={d} /> : onglet === 'paliers' ? <Paliers d={d} /> : <Score d={d} aller={aller} />}
    </Ecran>
  )
}

/** Description d'un critère, tirée de ses événements (succès, échecs, contestations suspendues). */
function useDescription(d: TrustLivreur) {
  const { t, tf, langue } = usePreferences()
  return (id: IdCritere) => {
    const ev = d.evenements.filter((e) => e.critere === id)
    const succes = ev.filter((e) => e.gravite === 'succes').length
    const echecs = ev.filter((e) => e.gravite !== 'succes' && e.gravite !== 'neutre')
    const suspendus = echecs.filter((e) => e.contestation?.etat === 'en_examen' || e.contestation?.etat === 'en_file').length
    if (id === 'anciennete') return tf('Activé le {d} · monte avec les mois et les missions validées', { d: jourLong(d.activeLe, langue) })
    if (id === 'formation') return ev.length ? t('Certification à jour') : t('Certification à passer')
    if (id === 'litiges') {
      const enCours = ev.filter((e) => e.gravite === 'neutre').length
      return [echecs.length ? tf('{n} litige perdu', { n: echecs.length }) : t('Aucun litige perdu'), enCours ? tf('{n} en cours, sans effet', { n: enCours }) : null].filter(Boolean).join(' · ')
    }
    return [tf(succes > 1 ? '{n} succès' : '{n} succès', { n: succes }), echecs.length ? tf(echecs.length > 1 ? '{n} échecs' : '{n} échec', { n: echecs.length }) : null, suspendus ? tf('{n} contesté, effet suspendu', { n: suspendus }) : null].filter(Boolean).join(' · ')
  }
}

function Score({ d, aller }: { d: TrustLivreur; aller: (o: string) => void }) {
  const { t, tf, langue } = usePreferences()
  const en = useEnLigne()
  const score = d.score ?? d.depart
  const v = useMontee(score)
  const desc = useDescription(d)
  const neuf = d.evenements.filter((e) => e.critere !== 'formation').length === 0
  const seuils = d.paliers.filter((x) => x.seuil > 0)
  const faible = [...d.criteres].sort((a, b) => a.valeur - b.valeur)[0]
  const tendance = score - d.depart
  const total = d.criteres.reduce((s, c) => s + c.points, 0)
  const suivant = d.paliers.find((x) => x.seuil > score)
  const seuil = d.paliers.find((x) => x.id === d.palier && x.seuil > 0) ?? suivant
  const pct = (p: number) => Math.round(p * 100)
  if (neuf)
    return (
      <>
        <div className="hero night">
          <div className="hk">
            {jourLong(d.activeLe, langue)} · {heure(d.activeLe, langue)}
          </div>
          <Jauge v={v} palier={t(PALIERS[d.palier])} sur={t('sur 100')} seuils={seuils.map((x) => x.seuil)} />
          <div className="center" style={{ marginTop: 4 }}>
            <Pill ton="dk" icone="sparkles">
              {t(PALIERS[d.palier])}
            </Pill>
          </div>
          <div className="hs center" style={{ marginTop: 10 }}>
            {t('Score au neutre : il bouge avec vos premières missions.')}
          </div>
        </div>
        <Note ton="green" icone="shield-check">
          <b>{t('Aucun paquet ne vous est refusé à cause d’un score de départ.')}</b> {t('Votre entreprise vous affecte ses paquets dès l’ouverture des tournées.')}
        </Note>
        <Sec titre={t('Pour bien démarrer')} />
        <div className="card tight">
          <Li icone="clock" ton="acc" t={t('Soyez dans le créneau annoncé')} s={tf('Ponctualité · {p} % du score', { p: pct(d.criteres.find((c) => c.id === 'ponctualite')?.poids ?? 0) })} vers={chemin('aide')} />
          <Li icone="camera" ton="or" t={t('Des photos nettes, dans l’étape prévue')} s={tf('Qualité · {p} % du score', { p: pct(d.criteres.find((c) => c.id === 'qualite')?.poids ?? 0) })} vers={chemin('aide', { geste: 'controle' })} />
          <Li icone="triangle-alert" ton="red" t={t('Un problème ? Déclarez l’incident tout de suite')} s={t('Un incident validé n’a aucun effet sur votre Ponctualité')} vers={chemin('incident')} />
          <Li icone="graduation-cap" ton="blue" t={t('Formation à jour')} s={tf('Formation · {p} % du score', { p: pct(d.criteres.find((c) => c.id === 'formation')?.poids ?? 0) })} vers={chemin('certification')} />
        </div>
        <div className="card">
          <div className="kick">{t('Les cinq critères')}</div>
          <BarresH lignes={d.criteres.map((c) => ({ l: t(CRITERES[c.id][0]), v: c.poids * 100, max: 30, r: `${pct(c.poids)} %` }))} />
        </div>
      </>
    )
  return (
    <>
      <div className="hero night">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <span className="hk">
            {jourCourt(d.recalculeA, langue)} · {heure(d.recalculeA, langue)}
          </span>
          <Pill ton="dk" icone={tendance >= 0 ? 'trending-up' : 'trending-down'}>
            {tf(tendance >= 0 ? '+{n} depuis l’activation' : '{n} depuis l’activation', { n: tendance })}
          </Pill>
        </div>
        <Jauge v={v} palier={t(PALIERS[d.palier])} sur={t('sur 100')} seuils={seuils.map((x) => x.seuil)} />
        <div className="row l9-paliers-l">
          {d.paliers.map((x) => (
            <span key={x.id}>{x.seuil > 0 ? `${t(PALIERS[x.id])} ≥ ${x.seuil}` : t(PALIERS[x.id])}</span>
          ))}
        </div>
      </div>
      <Sec titre={t('Ce qui compose votre note')} />
      <div className="card tight">
        {d.criteres.map((c) => {
          const bas = c.id === faible.id
          return (
            <div key={c.id} className={'livc-crit' + (bas ? ' low' : '')}>
              <div className="h">
                <span className="n">{t(CRITERES[c.id][0])}</span>
                <span className="w">{pct(c.poids)} %</span>
                <span className="v">{Math.round(c.valeur)}</span>
              </div>
              <Barre pct={c.valeur} ton={bas ? '' : 'acc'} label={`${t(CRITERES[c.id][0])} · ${Math.round(c.valeur)} / 100`} />
              <div className="p">
                <span>{desc(c.id)}</span>
                <b>{tf('{n} pts', { n: nombre(c.points, langue) })}</b>
              </div>
            </div>
          )
        })}
        <div className="kv" style={{ padding: '12px 0' }}>
          <span className="k b8" style={{ color: 'var(--ink)' }}>
            {t('Total')}
          </span>
          <span className="v t17">{tf('{n} pts · {s}', { n: nombre(total, langue), s: score })}</span>
        </div>
      </div>
      <div className="note or">
        <Icone nom="lightbulb" taille={18} />
        <div>
          <b>{tf('Conseil · {c} ({v}).', { c: t(CRITERES[faible.id][0]), v: Math.round(faible.valeur) })}</b> {t(CRITERES[faible.id][1])}
          {suivant && <> {tf('Palier {p} à {s} : le seuil doit tenir {j} jours.', { p: t(PALIERS[suivant.id]), s: suivant.seuil, j: d.hysteresisJours })}</>}{' '}
          <Link className="l9-monter" to={chemin('aide', { geste: 'score' })}>
            {t('Comment monter')} ›
          </Link>
        </div>
      </div>
      <Sec titre={t('Évolution depuis votre activation')} />
      <div className="card">
        <Courbe
          label={d.courbe.map((x) => `${jourCourt(x.quand, langue)} : ${x.score}`).join(', ')}
          data={d.courbe.map((x) => x.score)}
          labels={d.courbe.map((x, i) => (i === 0 ? t('Activation') : jourCourt(x.quand, langue).replace(/^(\S{3})\S*/, '$1')))}
          min={Math.max(0, Math.floor((Math.min(...d.courbe.map((x) => x.score), seuil?.seuil ?? 100) - 10) / 10) * 10)}
          max={100}
          seuil={seuil?.seuil}
          seuilLabel={seuil ? `${t(PALIERS[seuil.id])} ${seuil.seuil}` : undefined}
        />
      </div>
      <Note ton="ink" icone="eye">
        {t('Visible par vous, par votre entreprise et par la console BelivaY ; jamais par les clients, les vendeurs ni les gérants de relais. Aucun classement, jamais le score d’un autre livreur.')}
      </Note>
      <div className="btns" style={{ marginTop: 12 }}>
        <Btn kind="acc-soft" icone="list" onClick={() => aller('evenements')}>
          {t('Voir les événements')}
        </Btn>
        <Btn kind="secondary" icone="award" onClick={() => aller('paliers')}>
          {t('Paliers')}
        </Btn>
      </div>
      <Foot icone={en ? 'shield-check' : 'wifi-off'}>{en ? tf('Recalculé à {h} · journal immuable', { h: heure(d.recalculeA, langue) }) : tf('Hors connexion · dernière synchronisation à {h}', { h: heure(d.recalculeA, langue) })}</Foot>
    </>
  )
}

function Evenements({ d }: { d: TrustLivreur }) {
  const { t, tf, langue } = usePreferences()
  const m = useMaintenant()
  const o = useOrigine()
  const en = useEnLigne()
  const feuille = useFeuille('contester')
  const [p] = useSearchParams()
  const [cible, setCible] = useState<string | null>(p.get('ev'))
  const [motif, setMotif] = useState<MotifContestation | null>(null)
  const [note, setNote] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const ev = d.evenements.find((x) => x.id === cible) ?? null
  const ouvrir = (id: string) => {
    setCible(id)
    setMotif(null)
    setNote('')
    setErreur(null)
    feuille.ouvrir()
  }
  const envoyer = async () => {
    if (!ev || !motif) return
    setEnvoi(true)
    const r = await source.trust.contester(ev.id, motif, note, o(), en)
    setEnvoi(false)
    if (!r.ok) {
      setErreur(r.raison === 'hors_delai' ? 'Le délai de contestation est passé.' : r.raison === 'deja_conteste' ? 'Cet événement a déjà été contesté.' : r.raison === 'note_trop_courte' ? 'Écrivez une note un peu plus précise.' : 'Cet événement ne se conteste pas.')
      signal('erreur')
      return
    }
    signal('succes')
    feuille.fermer()
  }
  const jours: { jour: string; l: EvenementTrust[] }[] = []
  for (const e of d.evenements) {
    const j = jourDe(e.quand)
    const g = jours.find((x) => x.jour === j)
    if (g) g.l.push(e)
    else jours.push({ jour: j, l: [e] })
  }
  return (
    <>
      <Hint icone="info">{tf('Chaque événement est relié à sa mission. Vous pouvez en contester un, une seule fois, dans les {n} jours : son effet est suspendu jusqu’à la décision.', { n: d.contestationJours })}</Hint>
      {jours.map((j) => (
        <section key={j.jour} aria-label={jourLong(j.l[0].quand, langue)}>
          <div className="divider-t">{jourLong(j.l[0].quand, langue)}</div>
          <div className="card tight">
            {j.l.map((e) => {
              const ouvert = e.contesterAvant !== null && !e.contestation && m() <= e.contesterAvant
              const c = e.contestation
              return (
                <div key={e.id} className="livc-ev">
                  <div className="dt">{heure(e.quand, langue)}</div>
                  <div className="grow">
                    <div className="et">{t(e.texte)}</div>
                    <div className="es">
                      {e.mission ? (
                        <Link className="l9-mission" to={chemin('historique', { mission: e.mission })}>
                          {e.mission}
                        </Link>
                      ) : (
                        t('Sans mission')
                      )}
                      {e.effet !== 0 && <> · {tf('{n} pt sur la note', { n: e.effet > 0 ? '+' + e.effet : '−' + Math.abs(e.effet) })}</>}
                    </div>
                    <div className="em">
                      <span className={'livc-sev ' + SEV[e.gravite][1]}>{t(SEV[e.gravite][0])}</span>
                      <Pill ton="ink" sm>
                        {t(CRITERES[e.critere][0])}
                      </Pill>
                    </div>
                    {ouvert && (
                      <button type="button" className="l9-contester t13 b8 cor" onClick={() => ouvrir(e.id)}>
                        <Icone nom="scale" taille={15} />
                        {tf('Contester · jusqu’au {d}', { d: echeance(e.contesterAvant!, m(), langue) })}
                      </button>
                    )}
                    {c && (
                      <div className={'note ' + ETATS_CONTESTATION[c.etat][1]} style={{ marginTop: 8 }}>
                        <Icone nom="scale" taille={16} />
                        <div>
                          <b>{tf('{etat} · contestée le {d}.', { etat: t(ETATS_CONTESTATION[c.etat][0]), d: `${jourCourt(c.le, langue)} ${heure(c.le, langue)}` })}</b> {c.decision ? `« ${c.decision} »` : c.etat === 'en_file' ? t('Elle part au retour du réseau, avec son heure.') : t('Effet suspendu jusqu’à la décision.')}
                        </div>
                      </div>
                    )}
                    {e.contesterAvant !== null && !c && !ouvert && <div className="es">{tf('Contestation close depuis le {d}', { d: jourLong(e.contesterAvant, langue) })}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
      <div className="livc-legend">
        <span>
          <i style={{ background: 'var(--green)' }}></i>
          {t('Succès')}
        </span>
        <span>
          <i style={{ background: 'var(--amber)' }}></i>
          {t('g1 · 1 échec')}
        </span>
        <span>
          <i style={{ background: 'var(--or)' }}></i>
          {t('g2 · 2')}
        </span>
        <span>
          <i style={{ background: 'var(--red)' }}></i>
          {t('g3 · 4')}
        </span>
        <span>
          <i style={{ background: 'var(--ink)' }}></i>
          {tf('Veto · score ≤ {n}', { n: d.veto })}
        </span>
      </div>
      <Feuille ouverte={feuille.ouverte && !!ev} fermer={feuille.fermer} titre={t('Contester cet événement')} classe="livc-sheet">
        {ev && (
          <>
            <div className="livc-sh-h">
              <span className="livc-ic amber" style={{ width: 46, height: 46 }}>
                <Icone nom="scale" taille={23} />
              </span>
              <div className="grow">
                <h2>{t('Contester cet événement')}</h2>
                <p>
                  {t(ev.texte)} · {jourCourt(ev.quand, langue)} {t('à')} {heure(ev.quand, langue)}
                  {ev.mission ? ` · ${ev.mission}` : ''}
                </p>
              </div>
              <button type="button" className="livc-x" aria-label={t('Fermer')} onClick={feuille.fermer}>
                <Icone nom="x" taille={20} />
              </button>
            </div>
            <div className="card flat" style={{ marginTop: 14 }}>
              <Kv k={t('Critère')} v={t(CRITERES[ev.critere][0])} />
              <Kv k={t('Effet')} v={<span className={'livc-sev ' + SEV[ev.gravite][1]}>{t(SEV[ev.gravite][0])}</span>} />
              <Kv k={t('Contestable jusqu’au')} v={echeance(ev.contesterAvant ?? 0, m(), langue)} />
              <Kv k={t('Contestations restantes')} v={t('1 sur 1')} />
            </div>
            <div className="livc-lab" id="l9-motif">
              <span>{t('Motif')}</span>
            </div>
            <div role="radiogroup" aria-labelledby="l9-motif">
              {MOTIFS.map(([id, lib, sous]) => (
                <button key={id} type="button" role="radio" aria-checked={motif === id} aria-label={t(lib)} className={'radio l9-radio' + (motif === id ? ' on' : '')} onClick={() => setMotif(id)}>
                  <span className="rd"></span>
                  <span className="grow">
                    <span className="rt" style={{ display: 'block' }}>
                      {t(lib)}
                    </span>
                    <span className="rs" style={{ display: 'block' }}>
                      {t(sous)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="fld">
              <label htmlFor="l9-note">{t('Note')}</label>
              <div className={'inp area' + (note.trim().length >= d.noteMin ? ' ok' : '')}>
                <textarea id="l9-note" className="l9-note-c" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t('Ce qui s’est passé, avec l’heure et le lieu…')} />
              </div>
              <div className="hint">{tf('{n} / {min} caractères au moins', { n: note.trim().length, min: d.noteMin })}</div>
            </div>
            <Note ton="acc" icone="pause">
              {t('L’effet de l’événement est')} <b>{t('suspendu')}</b> {t('dès l’envoi, jusqu’à la décision. Votre entreprise et la console voient votre contestation.')}
              {!en && <> {t('Pas de réseau : la contestation part en file, avec son heure.')}</>}
            </Note>
            {erreur && (
              <p className="l9-erreur" role="alert">
                {t(erreur)}
              </p>
            )}
            <div className="btns" style={{ marginTop: 14 }}>
              <Btn icone="send" cls="xl" off={!motif || note.trim().length < d.noteMin || envoi} onClick={() => void envoyer()}>
                {t('Envoyer la contestation')}
              </Btn>
            </div>
          </>
        )}
      </Feuille>
    </>
  )
}

function Paliers({ d }: { d: TrustLivreur }) {
  const { t, tf } = usePreferences()
  const score = d.score ?? d.depart
  const e = d.entreprise
  const medaille = (id: Palier) => (id === 'or' ? <span className="medal or"><Icone nom="trophy" taille={22} /></span> : id === 'confirme' ? <span className="medal acc"><Icone nom="award" taille={22} /></span> : <span className="medal bronze">N</span>)
  return (
    <>
      {d.paliers.map((x, i) => {
        const fin = d.paliers[i + 1]?.seuil
        const ici = d.palier === x.id
        const plage = x.seuil === 0 ? tf('Moins de {f} · départ au neutre, {n}', { f: fin ?? 0, n: d.depart }) : tf('{s} et plus', { s: x.seuil })
        const ou = ici ? tf('vous êtes à {s}', { s: score }) : x.seuil > score ? tf(x.seuil - score > 1 ? 'encore {n} points' : 'encore {n} point', { n: x.seuil - score }) : null
        return (
          <div key={x.id} className={'livc-tier' + (ici ? ' on' : '')}>
            {medaille(x.id)}
            <div className="grow">
              <div className="tn">{ici ? tf('{p} · votre palier', { p: t(PALIERS[x.id]) }) : t(PALIERS[x.id])}</div>
              <div className="ts">{ou ? `${plage} · ${ou}` : plage}</div>
            </div>
            {ici && (
              <span className="pill solid-acc sm">{t('Vous')}</span>
            )}
          </div>
        )
      })}
      <Sec titre={t('Comment on change de palier')} />
      <div className="card tight">
        <Li icone="trending-up" ton="green" t={t('Montée')} s={tf('Seuil franchi et tenu {j} jours', { j: d.hysteresisJours })} />
        <Li icone="trending-down" ton="amber" t={t('Descente')} s={tf('5 points sous le seuil pendant {j} jours, puis validation humaine avec motif écrit ; contestation une fois', { j: d.hysteresisJours })} />
        <Li icone="bell-ring" ton="acc" t={t('Alerte avant chaque seuil')} s={t('Vous êtes prévenu avant qu’un seuil ne déclenche une restriction')} />
        <Li icone="octagon-alert" ton="red" t={t('Veto')} s={tf('Colis ouvert, vol, photo réutilisée, fausse position, faux incident : score plafonné à {n} et sanction de niveau 4', { n: d.veto })} />
      </div>
      <Sec titre={t('Barème des événements')} />
      <div className="card">
        <table className="livc-kit">
          <thead>
            <tr>
              <th>{t('Événement')}</th>
              <th>{t('Effet')}</th>
            </tr>
          </thead>
          <tbody>
            {d.bareme.map((b) => (
              <tr key={b.evenement}>
                <td style={{ fontWeight: 600, paddingRight: 8 }}>
                  {t(b.evenement)}
                  <span className="l9-crit">{t(CRITERES[b.critere][0])}</span>
                </td>
                <td>
                  <span className={'livc-sev ' + classeBareme(b.gravite)}>{t(b.gravite).replace(/sanction (de |of )?/, '')}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Hint icone="sliders-horizontal">{t('Barème proposé sur la structure verrouillée : chaque valeur est un paramètre de la console.')}</Hint>
      </div>
      <Sec titre={t('Le score de votre entreprise')} />
      <div className="card">
        <div className="row" style={{ gap: 12 }}>
          <Anneau v={e.score} max={100} couleur="var(--acc)" taille={64} />
          <div className="grow">
            <div className="b8 t15">
              {e.nom} · {e.score}
            </div>
            <div className="t13 c3 mt4">
              {tf('Palier {p}', { p: t(PALIERS[e.palier]) })} · {e.plafondColis !== null ? tf('plafond {m} par colis', { m: F(e.plafondColis) }) : t('sans plafond de valeur par colis')}. {t('Calculé à partir des scores de ses livreurs actifs, pondérés par leur volume, moins ses propres pénalités.')}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
