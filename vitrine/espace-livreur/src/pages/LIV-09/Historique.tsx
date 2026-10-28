// LIV-P24 · Historique et preuves (LIV-09-R01 à R13, LIV-P24R-01 à R04, LIV-RG-R186 à R190, DED-09, DED-13).
// Structure du prototype (route('historique') : en-tête secondaire, onglet Moi) :
// - liste : champ de recherche (ouvre ?s=recherche), puces de période (7 jours, 30 jours, plage de dates), héros nuit
//   « Vos preuves · N jours », jours (divider-t) et cartes de missions (paquet, nature, zone, statut final), encadré
//   cadenas, pied de connexion ; hors connexion : bandeau, seuls les derniers jours gardés sur le téléphone ;
// - vide : recherche, puces, carte vide « Changer de période », encadré de la durée de visibilité ;
// - recherche (?s=recherche) : numéro complet de l'étiquette ou ses 4 derniers chiffres, sur la durée de visibilité ;
//   résultats, recherches récentes (gardées sur ce téléphone) ;
// - détail (?mission=) : carte de la mission, étapes horodatées (téléphone et serveur), photos non téléchargeables,
//   codes « validés » jamais montrés, encadrés anonymat et intégrité ;
// - litige (?mission= d'une mission liée à un dossier) : héros ambre du dossier, état du dossier, preuves versées
//   automatiquement, sans effet sur le Trust Score tant qu'il est en cours ; les étapes restent ouvrables (&vue=etapes).
// Rien n'est effaçable ni exportable par le livreur (pas d'export ici, malgré la proposition M6 : la règle prime).
// Une mission en cours ouvre la tournée. Enrichissement : puces par issue (toutes, terminées, en cours, dossier ouvert)
// avec leur compte, dans l'adresse (`?issue=`), sous les puces de période (M5).
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ajouterJours, debutDuJour, jourDe } from '../../calculs/temps'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Btn, Chips, Chrono, Foot, Hint, HorsConnexion, Li, Note, Pill, Sec, Vide, type Ton } from '../../composants/proto'
import { chemin } from '../../config/pages'
import { useEnLigne } from '../../donnees/fileHorsLigne'
import type { DetailMission, MissionResume, NatureMission } from '../../donnees/domaines/historique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, ErreurLecture, useMaintenant } from '../LIV-08/commun'
import './liv09.css'

const NATURES: Record<NatureMission, [string, string]> = {
  relais: ['Tournée relais', 'route'],
  domicile: ['Course domicile', 'house'],
  retour: ['Retour au vendeur', 'undo-2'],
}
const CLE_RECHERCHES = 'blv_l_h_recherches'
const lireRecherches = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(CLE_RECHERCHES) ?? '[]') as string[]
  } catch {
    return []
  }
}
const norme = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
type Tf = (s: string, v: Record<string, string | number>) => string

export default function Historique() {
  const [p] = useSearchParams()
  const id = p.get('mission')
  if (id) return <Mission id={id} etapes={p.get('vue') === 'etapes'} />
  if (p.get('s') === 'recherche') return <Recherche />
  return <Liste />
}

const useEntreprise = () => useSession().livreur?.entreprise ?? ''

/** Pastille d'état d'une mission (livc_hRow du prototype). */
function statut(m: MissionResume, t: (s: string) => string): [string, Ton] {
  if (m.statut === 'en_cours') return [t('En cours'), 'or']
  if (m.statut === 'dossier') return [t('Dossier'), 'amber']
  return [t(m.nature === 'relais' ? 'Déposé' : m.nature === 'retour' ? 'Rendu' : 'Remis'), 'green']
}

function Ligne({ m }: { m: MissionResume }) {
  const { t, tf, langue } = usePreferences()
  const [lib, ton] = statut(m, t)
  const detail =
    m.statut === 'en_cours'
      ? tf(m.arrets > 1 ? '{n} arrêts · {c} colis' : '{n} arrêt · {c} colis', { n: m.arrets, c: m.colis })
      : m.nature === 'relais'
        ? tf(m.colis > 1 ? '{n} colis déposés · {h}' : '{n} colis déposé · {h}', { n: m.colis, h: heure(m.heure, langue) })
        : `${m.libelle} · ${heure(m.heure, langue)}`
  return (
    <Li
      icone={NATURES[m.nature][1]}
      ton={ton === 'or' ? 'or' : ton === 'amber' ? 'amber' : 'acc'}
      t={<span className="l9-id">{m.id}</span>}
      s={`${t(NATURES[m.nature][0])} · ${m.zone} · ${detail}`}
      droite={
        <Pill ton={ton} sm icone={m.statut === 'dossier' ? 'scale' : undefined}>
          {lib}
        </Pill>
      }
      vers={m.statut === 'en_cours' ? chemin('tournee') : chemin('historique', { mission: m.id })}
    />
  )
}

function Liste() {
  const { t, tf, langue } = usePreferences()
  const [p, setP] = useSearchParams()
  const en = useEnLigne()
  const entreprise = useEntreprise()
  const m = useMaintenant()
  const auj = jourDe(m())
  const periode = p.get('periode') ?? '7'
  const de = periode === 'plage' ? (p.get('de') ?? ajouterJours(auj, -6)) : ajouterJours(auj, periode === '30' ? -29 : -6)
  const a = periode === 'plage' ? (p.get('a') ?? auj) : auj
  const h = useLecture(() => source.historique.liste(de, a), [de, a])
  const poser = (x: Record<string, string | null>) => {
    const n = new URLSearchParams(p)
    for (const [k, v] of Object.entries(x)) if (v === null) n.delete(k)
    else n.set(k, v)
    setP(n, { replace: true })
  }
  if (h.erreur)
    return (
      <Ecran route="historique" proto action="aucune">
        <ErreurLecture relire={h.relire} />
      </Ecran>
    )
  const d = h.donnees
  // Hors connexion : seuls les derniers jours gardés sur le téléphone se lisent.
  const limite = d && !en ? ajouterJours(auj, -(d.cacheJours - 1)) : null
  const jours = d ? d.jours.filter((j) => !limite || j.jour >= limite) : []
  const sansJour = (j: string) => jourLong(debutDuJour(j), langue).replace(/^\S+ /, '')
  const plage = periode === 'plage' ? (de.slice(0, 7) === a.slice(0, 7) ? `${Number(de.slice(8))} – ${sansJour(a)}` : `${sansJour(de)} – ${sansJour(a)}`) : t('Choisir des dates')
  const issue = (p.get('issue') ?? 'toutes') as 'toutes' | 'termine' | 'en_cours' | 'dossier'
  const compte = (x: string) => jours.reduce((n, j) => n + j.missions.filter((m) => m.statut === x).length, 0)
  const filtres = issue === 'toutes' ? jours : jours.map((j) => ({ ...j, missions: j.missions.filter((m) => m.statut === issue) })).filter((j) => j.missions.length)
  const nbPaquets = jours.reduce((n, j) => n + j.missions.length, 0)
  const premier = jours[jours.length - 1]?.jour
  return (
    <Ecran route="historique" proto action="aucune">
      {!en && d && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> · {tf('dernières données téléchargées à {h}. Les missions et les photos déjà chargées restent consultables.', { h: heure(d.aJourA, langue) })}
        </HorsConnexion>
      )}
      <Link to={chemin('historique', { s: 'recherche' })} className="l9-champ" aria-label={t('Rechercher une étiquette')}>
        <div className="fld">
          <div className="inp ph">
            <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <span className="grow">{t('Rechercher une étiquette · BV 24 …')}</span>
          </div>
        </div>
      </Link>
      <Chips
        items={[
          { t: t('7 derniers jours'), on: periode === '7', onClick: () => poser({ periode: null, de: null, a: null }) },
          { t: t('30 jours'), on: periode === '30', onClick: () => poser({ periode: '30', de: null, a: null }) },
          { t: plage, on: periode === 'plage', icone: 'calendar', onClick: () => poser({ periode: 'plage' }) },
        ]}
      />
      {periode === 'plage' && d && (
        <div className="l9-plage">
          <label>
            <span>{t('Du')}</span>
            <input className="inp" type="date" value={de} min={ajouterJours(auj, -(d.visiblesJours - 1))} max={a} onChange={(e) => e.target.value && poser({ de: e.target.value })} />
          </label>
          <label>
            <span>{t('au')}</span>
            <input className="inp" type="date" value={a} min={de} max={auj} onChange={(e) => e.target.value && poser({ a: e.target.value })} />
          </label>
        </div>
      )}
      {d && jours.length > 0 && (
        <Chips
          items={[
            { t: t('Toutes'), on: issue === 'toutes', n: nbPaquets, onClick: () => poser({ issue: null }) },
            { t: t('Terminées'), on: issue === 'termine', n: compte('termine'), onClick: () => poser({ issue: 'termine' }) },
            { t: t('En cours'), on: issue === 'en_cours', n: compte('en_cours'), onClick: () => poser({ issue: 'en_cours' }) },
            { t: t('Dossier ouvert'), on: issue === 'dossier', n: compte('dossier'), onClick: () => poser({ issue: 'dossier' }) },
          ]}
        />
      )}
      {!d ? (
        <Chargement lignes={3} />
      ) : jours.length === 0 ? (
        <>
          <div className="card">
            <Vide icone="calendar-x" t={t('Aucune mission sur cette période')} s={tf('Du {de} au {a}, aucune mission validée ni en cours.', { de: jourLong(debutDuJour(de), langue), a: jourLong(debutDuJour(a), langue) })}>
              <div className="btns">
                <Btn kind="acc-soft" icone="calendar" onClick={() => poser({ periode: '30', de: null, a: null })}>
                  {t('Changer de période')}
                </Btn>
              </div>
            </Vide>
          </div>
          <Note ton="ink" icone="info">
            {tf('Au-delà de {n} jours, une mission n’est plus consultable ici ; BelivaY ne la conserve que si un dossier est ouvert.', { n: d.visiblesJours })}
          </Note>
        </>
      ) : (
        <>
          <div className="hero night">
            <div className="hk">{tf('Vos preuves · {n} jours', { n: d.visiblesJours })}</div>
            <div className="livc-big">
              {nbPaquets > 1 ? tf('{n} paquets', { n: nbPaquets }) : tf('{n} paquet', { n: nbPaquets })}
              {premier && <small>{tf('depuis le {j}', { j: jourCourt(debutDuJour(premier), langue) })}</small>}
            </div>
            <div className="livc-hm l9-hm">
              <div>
                <b>{d.heros.colisRamasses}</b>
                <span>{t('colis ramassés')}</span>
              </div>
              <div>
                <b>{d.heros.photos}</b>
                <span>{t('photos')}</span>
              </div>
              <div>
                <b>{d.heros.dossiersEnCours}</b>
                <span>{d.heros.dossiersEnCours > 1 ? t('dossiers en cours') : t('dossier en cours')}</span>
              </div>
            </div>
          </div>
          {filtres.length === 0 && <Hint icone="list-checks">{t('Aucune mission avec cette issue sur la période.')}</Hint>}
          {filtres.map((j) => (
            <section key={j.jour} aria-label={jourLong(debutDuJour(j.jour), langue)}>
              <div className="divider-t">{j.jour === auj ? `${t('Aujourd’hui')} · ${jourLong(debutDuJour(j.jour), langue)}` : jourLong(debutDuJour(j.jour), langue)}</div>
              <div className="card tight">
                {j.missions.map((x) => (
                  <Ligne key={x.id} m={x} />
                ))}
              </div>
            </section>
          ))}
          {limite && <Hint icone="cloud-off">{tf('Hors connexion, seuls les {n} derniers jours et leurs photos sont gardés sur le téléphone ; le reste revient avec le réseau.', { n: d.cacheJours })}</Hint>}
          <Note ton="ink" icone="lock">
            {tf('Vous voyez vos preuves pendant {n} jours ; vous ne pouvez ni les supprimer ni les remplacer. Pas d’export pour le livreur : {e} exporte si besoin, dans les limites de l’anonymat.', { n: d.visiblesJours, e: entreprise })}
          </Note>
          <Foot icone={en ? 'wifi' : 'wifi-off'}>{en ? tf('Connecté · historique à jour à {h}', { h: heure(d.aJourA, langue) }) : tf('Hors connexion · dernière synchronisation à {h}', { h: heure(d.aJourA, langue) })}</Foot>
        </>
      )}
    </Ecran>
  )
}

function Recherche() {
  const { t, tf, langue } = usePreferences()
  const [p, setP] = useSearchParams()
  const q = p.get('q') ?? ''
  const [saisie, setSaisie] = useState(q)
  const [recentes, setRecentes] = useState(lireRecherches)
  const champ = useRef<HTMLInputElement>(null)
  useEffect(() => champ.current?.focus(), [])
  const m = useMaintenant()
  const auj = jourDe(m())
  const h = useLecture(() => source.historique.liste(auj, auj), [auj])
  const r = useLecture(() => (q ? source.historique.rechercher(q) : Promise.resolve(null)), [q])
  const chercher = (e?: FormEvent, v = saisie) => {
    e?.preventDefault()
    const s = v.trim()
    const n = new URLSearchParams(p)
    if (!s) n.delete('q')
    else {
      n.set('q', s)
      const l = [s, ...recentes.filter((x) => x !== s)].slice(0, 4)
      setRecentes(l)
      try {
        localStorage.setItem(CLE_RECHERCHES, JSON.stringify(l))
      } catch {
        /* stockage refusé */
      }
    }
    setP(n, { replace: true })
  }
  const visibles = h.donnees?.visiblesJours
  const etiquette = (x: MissionResume) => {
    const s = norme(q)
    return x.etiquettes.find((e) => (/^\d{4}$/.test(s) ? e.endsWith(s) : norme(e) === s)) ?? x.id
  }
  return (
    <Ecran route="historique" proto action="aucune" retour={chemin('historique')}>
      <form className="fld" role="search" onSubmit={chercher}>
        <div className="inp focus l9-inp">
          <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input ref={champ} type="search" inputMode="text" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={t('Rechercher une étiquette · BV 24 …')} aria-label={t('Rechercher une étiquette')} />
          <button type="submit" className="l9-chercher">
            {t('Chercher')}
          </button>
        </div>
      </form>
      {visibles !== undefined && <Hint icone="tag">{tf('Recherche sur les {n} derniers jours, par numéro d’étiquette complet ou ses 4 derniers chiffres.', { n: visibles })}</Hint>}
      {q &&
        (!r.donnees ? (
          <Chargement lignes={1} />
        ) : (
          <>
            <Sec titre={r.donnees.length === 0 ? t('Aucun résultat') : r.donnees.length > 1 ? tf('{n} résultats', { n: r.donnees.length }) : t('1 résultat')} />
            {r.donnees.length === 0 ? (
              <div className="card">
                <Vide icone="package-search" t={t('Aucune mission trouvée')} s={t('Tapez le numéro complet de l’étiquette ou ses 4 derniers chiffres.')} />
              </div>
            ) : (
              <div className="card tight">
                {r.donnees.map((x) => {
                  const [lib, ton] = statut(x, t)
                  return (
                    <Li
                      key={x.id}
                      icone="tag"
                      ton="acc"
                      t={etiquette(x)}
                      s={`${x.id} · ${t(NATURES[x.nature][0])} · ${x.zone} · ${jourCourt(x.heure, langue)} · ${heure(x.heure, langue)}`}
                      droite={
                        <Pill ton={ton} sm icone={x.statut === 'dossier' ? 'scale' : undefined}>
                          {lib}
                        </Pill>
                      }
                      vers={x.statut === 'en_cours' ? chemin('tournee') : chemin('historique', { mission: x.id })}
                      aria={`${etiquette(x)} · ${x.id}`}
                    />
                  )
                })}
              </div>
            )}
          </>
        ))}
      {recentes.length > 0 && (
        <>
          <Sec titre={t('Recherches récentes')} />
          <div className="card tight">
            {recentes.map((x) => (
              <Li key={x} icone="history" ton="ink" t={x} s={t('Relancer cette recherche')} onClick={() => (setSaisie(x), chercher(undefined, x))} />
            ))}
          </div>
        </>
      )}
    </Ecran>
  )
}

/** Photo de preuve (servie par une adresse signée de courte durée : jamais téléchargeable). */
function Photo({ legende, quand }: { legende: string; quand: number }) {
  const { t, langue } = usePreferences()
  const court = t(legende).replace(/^(Photo|Picture) \d+ · /, '')
  return (
    <div className="photo l9-photo" role="img" aria-label={`${t(legende)} · ${heure(quand, langue)}`} onContextMenu={(e) => e.preventDefault()} draggable={false}>
      <Icone nom="camera" taille={26} />
      <span className="ok">
        <Icone nom="check" taille={14} trait={3} />
      </span>
      <span className="ts">
        {heure(quand, langue)} · {court}
      </span>
    </div>
  )
}

function sousTitre(d: DetailMission, tf: Tf) {
  const classes = Object.entries(d.classes)
    .map(([c, n]) => `${n} ${c}`)
    .join(', ')
  const et = d.etiquettes.length > 1 ? tf('étiquettes {de} à {a}', { de: d.etiquettes[0], a: d.etiquettes[d.etiquettes.length - 1] }) : d.etiquettes.length ? tf('étiquette {e}', { e: d.etiquettes[0] }) : ''
  return [d.nature === 'domicile' ? d.libelle : null, tf(d.colis > 1 ? '{n} colis ({c})' : '{n} colis {c}', { n: d.colis, c: classes }), et].filter(Boolean).join(' · ')
}

function Mission({ id, etapes }: { id: string; etapes: boolean }) {
  const { t, tf, langue } = usePreferences()
  const entreprise = useEntreprise()
  const lec = useLecture(() => source.historique.mission(id).then((v) => ({ v })), [id])
  const coque = (enfants: ReactNode, retour = chemin('historique')) => (
    <Ecran route="historique" proto action="aucune" titre={id} retour={retour}>
      {enfants}
    </Ecran>
  )
  if (lec.erreur) return coque(<ErreurLecture relire={lec.relire} />)
  if (!lec.donnees) return coque(<Chargement lignes={3} />)
  const d = lec.donnees.v
  if (!d)
    return coque(
      <div className="card">
        <Vide icone="calendar-x" t={t('Mission plus consultable')} s={t('Elle est sortie de la période visible, ou n’existe pas. BelivaY la garde seulement si un dossier est ouvert.')}>
          <div className="btns">
            <Btn kind="acc-soft" icone="history" vers={chemin('historique')}>
              {t('Revenir à l’historique')}
            </Btn>
          </div>
        </Vide>
      </div>,
    )
  const dossier = d.dossier
  const fin = d.etapes[d.etapes.length - 1]
  const codes = d.etapes.filter((e) => e.preuve === 'code')
  const fait = t(d.nature === 'relais' ? 'Déposé' : d.nature === 'retour' ? 'Rendu' : 'Remis')
  const entete = (
    <div className="card acc">
      <div className="kick acc">{tf('{type} · zone {z}', { type: t(NATURES[d.nature][0]), z: d.zone })}</div>
      <div className="b8 t19 mt4 l9-id">{d.id}</div>
      <div className="t13 c3 mt4">
        {jourLong(d.heure, langue)} · {sousTitre(d, tf)}
      </div>
      <div className="row wrap mt10" style={{ gap: 6 }}>
        <Pill ton="green" point>
          {tf('{s} · mission validée', { s: fait })}
        </Pill>
        <Pill ton={d.incidents.length ? 'amber' : 'ink'} sm>
          {d.incidents.length ? t('Événement signalé') : t('Aucun incident')}
        </Pill>
        <Pill ton={dossier?.etat === 'en_cours' ? 'amber' : 'ink'} sm icone={dossier ? 'scale' : undefined}>
          {dossier ? (dossier.etat === 'en_cours' ? t('Dossier en cours') : t('Dossier décidé')) : t('Aucun dossier')}
        </Pill>
      </div>
    </div>
  )
  // Mission liée à un litige (prototype ?s=litige) : l'état du dossier d'abord ; les étapes restent ouvrables.
  if (dossier && !etapes) {
    const avant = `${jourLong(dossier.reponseEntrepriseAvant, langue)} ${t('à')} ${heure(dossier.reponseEntrepriseAvant, langue)}`
    const positions = d.etapes.filter((e) => e.preuve === 'position' && e.lieu)
    return coque(
      <>
        {entete}
        <div className="hero amber">
          <div className="hk" style={{ color: '#FFD98A' }}>
            {tf('Dossier {n} · commande {c}', { n: dossier.numero, c: dossier.commande })}
          </div>
          <div className="ht">{dossier.etat === 'en_cours' ? tf('Litige en cours : {m}', { m: t(dossier.motif).toLowerCase() }) : t('Dossier décidé')}</div>
          <div className="hs">
            {tf('Ouvert le {d} à {h}, contre la commande, jamais contre vous ; {e} répond avec vos preuves.', { d: jourCourt(dossier.ouvertLe, langue), h: heure(dossier.ouvertLe, langue), e: entreprise })} {dossier.etat === 'en_cours' && <b>{tf('Réponse de {e} au plus tard le {d}.', { e: entreprise, d: avant })}</b>}
          </div>
        </div>
        <Sec titre={t('État du dossier')} />
        <div className="card">
          <Chrono
            items={[
              { t: `${jourCourt(dossier.ouvertLe, langue)} · ${heure(dossier.ouvertLe, langue)} · ${t('dossier ouvert')}`, d: t('Contre la commande, jamais contre vous'), st: 'done' },
              { t: tf('Réponse de {e}', { e: entreprise }), d: tf('jusqu’au {d}', { d: avant }), st: dossier.etat === 'en_cours' ? 'cur' : 'done' },
              { t: t('Médiation BelivaY, puis médiateur senior'), d: t('48 h, puis 3 jours si aucun accord'), st: dossier.etat === 'decide' ? 'done' : '' },
              { t: t('Décision'), d: dossier.decision ? `${jourLong(dossier.decideLe ?? 0, langue)} · ${dossier.decision}` : t('Affichée ici dès qu’elle est prise'), st: dossier.decision ? 'done' : '' },
            ]}
          />
        </div>
        <Sec titre={t('Vos preuves, versées automatiquement')} />
        <div className="livc-ph3">
          {d.photos.map((x) => (
            <Photo key={x.id} legende={x.legende} quand={x.quand} />
          ))}
        </div>
        <div className="card tight">
          {codes.map((c, k) => (
            <Li key={k} icone="key-round" ton="green" t={tf('{c}, sans réserve', { c: t(c.texte) })} s={`${c.lieu ? c.lieu + ' · ' : ''}${heure(c.quand, langue)}`} />
          ))}
          {positions.length > 0 && <Li icone="map-pin" ton="acc" t={t('Positions de la mission')} s={`${positions.map((x) => `${x.lieu} ${heure(x.quand, langue)}`).join(' → ')} · ${d.incidents.length ? t('événement signalé') : t('aucun incident déclaré')}`} />}
        </div>
        <Note ton="green" icone="shield-check">
          {dossier.etat === 'en_cours' ? (
            <>
              {t('Litige en cours :')} <b>{t('aucun effet')}</b> {t('sur votre Trust Score. Perdu, il pèserait sur le critère Litiges ; gagné, il n’aurait aucun effet.')}
            </>
          ) : (
            t('Un litige gagné n’a aucun effet sur votre Trust Score ; perdu, il pèse sur le critère Litiges.')
          )}
        </Note>
        <Note ton="acc" icone="eye-off">
          {tf('Vous voyez l’état du dossier et la décision, jamais les données du client. Vous n’êtes jamais mis en contact avec lui ; la console peut vous entendre par l’intermédiaire de {e}.', { e: entreprise })}
        </Note>
        <div className="btns" style={{ marginTop: 12 }}>
          <Btn kind="secondary" icone="list" vers={chemin('historique', { mission: d.id, vue: 'etapes' })}>
            {t('Étapes horodatées et codes')}
          </Btn>
        </div>
      </>,
    )
  }
  return coque(
    <>
      {entete}
      <Sec titre={t('Étapes horodatées')} />
      <div className="card">
        <Chrono items={d.etapes.map((e) => ({ t: `${heure(e.quand, langue)} · ${t(e.texte)}`, d: `${e.lieu ? e.lieu + ' · ' : ''}${tf('reçu par le serveur à {h}', { h: heure(e.recu, langue) })}`, st: 'done' as const }))} />
      </div>
      <Sec titre={t('Photos')} />
      <div className="livc-ph3">
        {d.photos.map((x) => (
          <Photo key={x.id} legende={x.legende} quand={x.quand} />
        ))}
      </div>
      {codes.length > 0 && (
        <>
          <Sec titre={t('Codes')} />
          <div className="card tight">
            {codes.map((c, k) => (
              <Li
                key={k}
                icone="key-round"
                ton="green"
                t={t(c.texte)}
                s={`${c.lieu ? c.lieu + ' · ' : ''}${tf('validé à {h}', { h: heure(c.quand, langue) })}`}
                droite={
                  <span className="livc-code" aria-label={t('Code validé, jamais affiché')}>
                    <Icone nom="check" taille={13} trait={3} />
                    <span className="livc-dots" aria-hidden="true">
                      ••••••
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        </>
      )}
      {d.incidents.length > 0 && (
        <Note ton="amber" icone="triangle-alert">
          <b>{t('Incidents et événements')}</b> · {d.incidents.map((x) => t(x)).join(' · ')}
        </Note>
      )}
      <Note ton="acc" icone="eye-off">
        {t('Après la remise, plus aucune donnée du client : numéro de commande et zone seulement. Le nom de la boutique reste : c’est une donnée de ramassage.')} {t('Les codes validés sont notés, jamais les codes eux-mêmes.')}
      </Note>
      <Note ton="ink" icone="shield-check">
        {tf('Ces preuves sont identiques à celles que voient {e} et la console. Vous ne pouvez ni les supprimer ni les remplacer. Les captures d’écran pour les diffuser sont interdites.', { e: entreprise })} {tf('Visibles jusqu’au {d}.', { d: jourLong(d.visibleJusqua, langue) })}
      </Note>
      {fin && <Foot icone="shield-check">{tf('Mission validée par le serveur à {h}', { h: heure(fin.recu, langue) })}</Foot>}
    </>,
    dossier ? chemin('historique', { mission: d.id }) : chemin('historique'),
  )
}
