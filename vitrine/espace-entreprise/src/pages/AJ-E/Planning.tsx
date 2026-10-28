// Planning des livreurs (AJ-E, comme les Ramassages du vendeur) : qui roule quand, aujourd'hui, demain ou sur sept
// jours (« ?j=aujourdhui|demain|semaine », lien profond). Lu dans la source : livreurs (statut, zones, capacité par
// jour) et missions (créneau annoncé, sinon heure limite). Pour chaque livreur : ses créneaux, sa charge face à sa
// capacité (limite visible ; au-delà, l'affectation le signale), ou la raison de son absence (suspendu, en
// activation). En tête : les missions encore à affecter, avec le geste vers l'Affectation (choix de l'entreprise, DP-63).
// DP-66 : le livreur ne modifie pas son planning, il PRÉVIENT d'une absence ; l'entreprise la voit ici (« Absences
// prévenues », et sur le livreur les jours concernés) et la marque vue (le livreur en est prévenu). Un départ demandé
// est signalé sur le livreur. Propriétaire et répartiteur (le comptable voit le planning sans ces demandes).
// DP-67 : motif de la liste et texte du livreur, repères « Imprévu » et « Prévenue après le début du créneau » ; départ :
// paquets jusqu'à la veille du dernier jour du préavis.
import './aje.css'
import { Link, useSearchParams } from 'react-router-dom'
import { JOUR } from '../../calculs/temps'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Av, Barre, Choix, Hint, Li, Panel, Pill, Vide } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { Livreur } from '../../donnees/domaines/livreurs'
import type { Mission } from '../../donnees/domaines/missions'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut, useRouteOuverte } from '../../session'
import { jouer } from '@client/composants/Sons'
import type { AbsenceLivreur, DemandeDepart } from '../../donnees/domaines/livreurs'
import { Chargement, ErreurLecture, useDates } from '../ENT-03/outils'
import { BadgesAbsence, NOM_MOTIF_ABSENCE, veilleDernierJour } from '../ENT-04/Depart'

type Vue = 'aujourdhui' | 'demain' | 'semaine'
const VUES: Vue[] = ['aujourdhui', 'demain', 'semaine']
const ZONE = 'Africa/Douala'
/** Jour civil de Yaoundé (« 2026-10-13 ») d'un instant. */
const jourDe = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(new Date(ms))
const debutDe = (m: Mission) => m.creneau?.debut ?? m.heureLimite
const ABSENT: Partial<Record<Livreur['statut'], string>> = { suspendu: 'Suspendu : aucune mission tant que la suspension dure', en_activation: 'En activation : pièces ou certification à terminer', retire: 'Retiré de la flotte' }

export default function Planning() {
  const { t, tf } = usePreferences()
  const [params, setParams] = useSearchParams()
  const ouverte = useRouteOuverte()
  const maintenant = useHorloge()
  const { heure, date, jourCivil } = useDates()
  const peut = usePeut(['proprietaire', 'repartiteur'])
  const vue = (VUES.find((v) => v === params.get('j')) ?? 'aujourdhui') as Vue
  const lecture = useLecture(async () => {
    const [livreurs, missions] = await Promise.all([source.livreurs.liste(), ouverte('missions') ? Promise.all((['a_affecter', 'affectees', 'en_cours'] as const).map((o) => source.missions.liste(o))).then((x) => x.flat()) : Promise.resolve([] as Mission[])])
    const [absences, departs] = peut ? await Promise.all([source.livreurs.absences(), source.livreurs.departs()]) : [[] as AbsenceLivreur[], [] as DemandeDepart[]]
    return { livreurs, missions, absences, departs }
  }, [peut])
  const choisir = (v: Vue) => {
    const p = new URLSearchParams(params)
    if (v === 'aujourdhui') p.delete('j')
    else p.set('j', v)
    setParams(p, { replace: true })
  }
  const jours = vue === 'semaine' ? Array.from({ length: 7 }, (_, i) => jourDe(maintenant + i * JOUR)) : [jourDe(maintenant + (vue === 'demain' ? JOUR : 0))]
  const d = lecture.donnees
  const dansVue = (m: Mission) => jours.includes(jourDe(debutDe(m)))
  const missions = (d?.missions ?? []).filter(dansVue).sort((a, b) => debutDe(a) - debutDe(b))
  const aAffecter = missions.filter((m) => !m.livreur)
  const livreurs = (d?.livreurs ?? []).filter((l) => l.statut !== 'retire')
  // Absences prévenues qui touchent la période affichée (jours « AAAA-MM-JJ », « au » inclus).
  const absencesVue = (d?.absences ?? []).filter((a) => a.du <= jours[jours.length - 1] && a.au >= jours[0])
  const absenceDe = (id: string) => absencesVue.filter((a) => a.livreur.id === id)
  const departDe = (id: string) => (d?.departs ?? []).find((x) => x.livreur.id === id && x.etat === 'demande')
  const dates = (a: AbsenceLivreur) => (a.du === a.au ? tf('le {d}', { d: jourCivil(a.du) }) : tf('du {d} au {f}', { d: jourCivil(a.du), f: jourCivil(a.au) }))
  const marquerVue = (a: AbsenceLivreur) => void source.livreurs.absenceVue(a.id).then((r) => jouer(r.ok ? 'interrupteur' : 'erreur'))
  return (
    <Ecran route="planning">
      <Choix
        forme="seg"
        aria={t('Période')}
        actif={vue}
        choisir={choisir}
        items={[
          { id: 'aujourdhui', t: t('Aujourd’hui') },
          { id: 'demain', t: t('Demain') },
          { id: 'semaine', t: t('7 jours') },
        ]}
      />
      {lecture.erreur && <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />}
      {!d && !lecture.erreur && <Chargement lignes={3} />}
      {d && (
        <>
          {aAffecter.length > 0 && (
            <Panel titre={t('À affecter')} icone="user-plus" tonIcone="or" className="mt14" droite={<Pill sm ton="or">{aAffecter.length}</Pill>}>
              {aAffecter.map((m) => (
                <Li
                  key={m.id}
                  icone="boxes"
                  ton="or"
                  t={m.paquetId}
                  s={tf('{zone} · avant {h}', { zone: m.zone, h: vue === 'semaine' ? `${date(m.heureLimite)} ${heure(m.heureLimite)}` : heure(m.heureLimite) })}
                  to={ouverte('affectation') ? chemin('affectation', { id: m.paquetId }) : undefined}
                  droite={ouverte('affectation') ? <span className="pill sm or">{t('Affecter')}</span> : undefined}
                  chevron={false}
                />
              ))}
            </Panel>
          )}
          {(d.absences ?? []).length > 0 && (
            <Panel titre={t('Absences prévenues')} icone="calendar-x" tonIcone="amber" className="mt14" droite={<Pill sm ton="amber">{d.absences.filter((a) => a.vueLe === null).length}</Pill>}>
              {d.absences.map((a) => (
                <Li
                  key={a.id}
                  icone="calendar-x"
                  ton="amber"
                  t={`${a.livreur.nom} · ${dates(a)}`}
                  s={
                    <>
                      {[t(NOM_MOTIF_ABSENCE[a.motif]), a.texte ? `« ${a.texte} »` : null, a.vueLe ? tf('vue le {d}', { d: date(a.vueLe) }) : null].filter(Boolean).join(' · ')}
                      <BadgesAbsence a={a} />
                    </>
                  }
                  droite={
                    a.vueLe ? (
                      <Pill ton="green" sm icone="check">
                        {t('Vue')}
                      </Pill>
                    ) : (
                      <button type="button" className="btn sm primary" onClick={() => marquerVue(a)}>
                        <Icone nom="check" taille={16} />
                        <span>{t('Marquer comme vue')}</span>
                      </button>
                    )
                  }
                  chevron={false}
                />
              ))}
              <p className="t12 c3 mt10">{t('Le livreur ne modifie pas son planning : il prévient. Marquer l’absence comme vue le lui fait savoir ; confiez ses créneaux à un autre livreur.')}</p>
            </Panel>
          )}
          {livreurs.length === 0 ? (
            <Vide icone="users" t={t('Aucun livreur dans la flotte')} s={t('Invitez vos livreurs : ils apparaissent ici dès leur activation.')} action={ouverte('ajout') && <Link className="btn primary" to={chemin('ajout')}>{t('Ajouter un livreur')}</Link>} />
          ) : (
            <div className="g g2 mt14">
              {livreurs.map((l) => {
                const siennes = missions.filter((m) => m.livreur?.id === l.id)
                const capacite = (l.capacite ?? 0) * jours.length
                const colis = siennes.reduce((n, m) => n + m.colisTotal, 0)
                const prevenue = absenceDe(l.id)
                const depart = departDe(l.id)
                const absent = ABSENT[l.statut] ?? (prevenue.length && vue !== 'semaine' ? 'Absence prévenue' : undefined)
                return (
                  <section key={l.id} className="panel" aria-label={l.nom} style={{ marginTop: 0 }}>
                    <div className="row">
                      <Av initiales={l.initiales} taille={40} ton={absent ? 'gris' : undefined} />
                      <span className="grow">
                        <Link className="b8 e-lien-t" to={chemin('livreur', { id: l.id })}>
                          {l.nom}
                        </Link>
                        <span className="t12 c3" style={{ display: 'block' }}>
                          {[l.zones.join(', '), l.plaque].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <Pill sm dot ton={absent ? 'amber' : siennes.length ? 'acc' : 'green'}>
                        {absent ? t('Absent') : siennes.length ? tf('{n} mission(s)', { n: siennes.length }) : t('Libre')}
                      </Pill>
                    </div>
                    {depart && <p className="t12 b7 mt6" style={{ color: 'var(--amber)' }}>{depart.echu ? t('Préavis de départ échu') : depart.affectationJusqua > maintenant ? tf('Départ demandé · paquets jusqu’au {d}', { d: date(veilleDernierJour(depart)) }) : t('Dernier jour du préavis : plus de nouveau paquet')}</p>}
                    {prevenue.map((a) => (
                      <p key={a.id} className="t12 c3 mt6">
                        <Icone nom="calendar-x" taille={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                        {tf('Absence prévenue {j} · {m}', { j: dates(a), m: t(NOM_MOTIF_ABSENCE[a.motif]) })}
                        {a.imprevu && ' · ' + t('Imprévu')}
                        {a.vueLe === null && ' · ' + t('pas encore vue')}
                      </p>
                    ))}
                    {absent ? (
                      <Hint icone="calendar-x">{absent === 'Absence prévenue' ? t('Absence prévenue : ne lui confiez pas de créneau ce jour-là.') : t(absent)}</Hint>
                    ) : (
                      <>
                        {capacite > 0 && (
                          <div className="mt10">
                            <div className="row t12">
                              <span className="grow c3">{t('Charge face à la capacité déclarée')}</span>
                              <b className={colis > capacite ? 'cr' : ''}>{tf('{c} / {max} colis', { c: colis, max: capacite })}</b>
                            </div>
                            <Barre pct={(100 * colis) / capacite} ton={colis > capacite ? 'red' : 'acc'} aria={tf('{c} colis sur {max}', { c: colis, max: capacite })} />
                            {colis > capacite && <p className="t12 cr mt4">{t('Au-delà de sa capacité : l’affectation le signale avant de le choisir.')}</p>}
                          </div>
                        )}
                        {siennes.length === 0 ? (
                          <p className="t13 c3 mt10">{vue === 'semaine' ? t('Aucun créneau annoncé sur la semaine.') : t('Aucun créneau annoncé : disponible pour un paquet.')}</p>
                        ) : (
                          <ol className="e-creneaux mt10">
                            {siennes.map((m) => (
                              <li key={m.id}>
                                <span className="h">
                                  {vue === 'semaine' && <span className="t12 c3">{date(debutDe(m))}</span>}
                                  {m.creneau ? `${heure(m.creneau.debut)} – ${heure(m.creneau.fin)}` : tf('avant {h}', { h: heure(m.heureLimite) })}
                                </span>
                                <span className="grow">
                                  {ouverte('missions') ? <Link to={chemin('missions', { id: m.id })}>{m.paquetId}</Link> : m.paquetId}
                                  <span className="t12 c3" style={{ display: 'block' }}>
                                    {[m.zone, m.lieu, tf('{n} colis', { n: m.colisTotal })].filter(Boolean).join(' · ')}
                                  </span>
                                </span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </>
                    )}
                  </section>
                )
              })}
            </div>
          )}
          <p className="t12 c3 mt14">
            <Icone nom="info" taille={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
            {t('Le créneau est celui annoncé au livreur à l’affectation ; sans créneau, l’heure limite de la mission compte.')}
          </p>
        </>
      )}
    </Ecran>
  )
}
