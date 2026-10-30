// ADM-P22 Carte opérationnelle (prototype : #carte, ?s=relais, ?s=hors, ?s=erreur). Fond OpenStreetMap comme
// l'entreprise (repli sur le plan des zones hors ligne ou si une tuile échoue), calques activables et MÉMORISÉS par
// agent (zones, relais, boutiques, entreprises, livreurs en mission, paquets en cours, alertes), un clic ouvre la
// fiche courte puis la fiche complète (ADM-P17 à P20). Positions : livreurs en mission seulement, Direction et
// Opérations de la zone, chaque consultation journalisée (ADM-P22R-01/03) ; hors connexion : dernière position et
// son heure. Aucune adresse de client (quartier ou relais seulement) ; aucun export avec positions.
import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Ecran } from '../../composants/coque'
import { useFonctions } from '../AJ-A/fonctions-page'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { Li, Note, Panel, Pill, Tg, useSurtitre } from '../../composants/prototype'
import { PARAMETRES } from '../../calculs/registre'
import { chemin } from '../../config/pages'
import type { PointCarte } from '../../donnees/domaines/logistique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { usePerimetre, useSession } from '../../session'
import { Lu, RowSt, quand } from '../ADM-08/commun'
import { ACTEUR_CALQUE, CarteReseau, Legende } from './CarteReseau'

type Calque = PointCarte['calque'] | 'zones'
const CALQUES: [Calque, string, string, string][] = [
  ['zones', 'map-pinned', 'acc', 'Zones'],
  ['relais', 'package-check', 'blue', 'Relais et remplissage'],
  ['boutiques', 'store', 'or', 'Boutiques'],
  ['entreprises', 'warehouse', 'ink', 'Entreprises'],
  ['livreurs', 'bike', 'acc', 'Livreurs en mission'],
  ['paquets', 'route', 'acc', 'Paquets en cours'],
  ['alertes', 'triangle-alert', 'red', 'Alertes'],
]
const TOUS: Calque[] = CALQUES.map((c) => c[0])

function lireCalques(cle: string): Calque[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(cle) ?? 'null') as unknown
    return Array.isArray(v) ? (v.filter((x) => TOUS.includes(x as Calque)) as Calque[]) : null
  } catch {
    return null
  }
}

export default function Carte() {
  const { t, tf, langue } = usePreferences()
  const surtitre = useSurtitre()
  const s = useSession()
  const zonesAgent = usePerimetre()
  const [p] = useSearchParams()
  const cle = `blv_a_calques_${s.agent?.id ?? 'agent'}`
  const filtre = p.get('calque')
  const [on, setOn] = useState<Calque[]>(() => (filtre ? ['zones', filtre as Calque] : (lireCalques(cle) ?? TOUS)))
  const [choisi, setChoisi] = useState<string | null>(p.get('livreur') ? 'pos-' + p.get('livreur') : p.get('id'))
  const [consulte, setConsulte] = useState<{ id: string; le: number } | null>(null)
  const l = useLecture(() => source.logistique.carte(), [])
  useEffect(() => {
    if (filtre) return
    try {
      localStorage.setItem(cle, JSON.stringify(on))
    } catch {
      /* préférence pour la visite seulement */
    }
  }, [on, cle, filtre])
  const basculer = (c: Calque) => setOn((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))
  const point = l.donnees?.find((x) => x.id === choisi) ?? null
  // Une position de livreur ne s'affiche qu'après une consultation journalisée (ADM-P22R-03).
  useEffect(() => {
    if (!point || point.calque !== 'livreurs' || !point.livreurId || consulte?.id === point.id) return
    let vivant = true
    source.logistique.consulterPosition(point.livreurId).then((r) => vivant && r.ok && setConsulte({ id: point.id, le: r.le }))
    return () => {
      vivant = false
    }
  }, [point, consulte])
  const zoneCadre = p.get('zone')
  const pts0 = l.donnees ?? []
  const fonctions = useFonctions([
    { verbe: 'Traiter', n: pts0.filter((x) => x.calque === 'alertes').length, unite: ['alerte', 'alertes'], icone: 'siren', route: 'paquets', alerte: true },
    { verbe: 'Suivre', n: pts0.filter((x) => x.calque === 'livreurs').length, unite: ['livreur en mission', 'livreurs en mission'], icone: 'navigation', route: 'livreurs' },
    { verbe: 'Contrôler', n: null, unite: ['consultation', 'consultations'], icone: 'scroll-text', route: 'journal', params: { action: 'carte.position' } },
  ])
  return (
    <Ecran route="carte" kicker={surtitre} fonctions={fonctions} actions={<Link className="btn secondary" to={chemin('journal', { action: 'carte.position' })}><Icone nom="scroll-text" taille={18} /><span>{t('Journal des consultations')}</span></Link>}>
      <Perimetre route="carte" />
      <Lu l={l} quoi="La carte">
        {(pts) => {
          const visibles = pts.filter((x) => on.includes(x.calque))
          const n = (c: Calque) => (c === 'zones' ? PARAMETRES.zonesExploitees.length : pts.filter((x) => x.calque === c).length)
          const exploitees = PARAMETRES.zonesExploitees.map((z) => z.code)
          const zones = on.includes('zones') ? Object.fromEntries(['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'Z10', 'Z11', 'Z12'].map((z) => [z, exploitees.includes(z) ? (pts.some((x) => x.calque === 'alertes' && x.zone === z) ? ('alerte' as const) : ('on' as const)) : ('vente' as const)])) : {}
          const hors = pts.filter((x) => x.calque === 'livreurs' && x.horsConnexion)
          return (
            <>
              <div className="g g31">
                <Panel titre={t('Réseau')} icone="map">
                  <CarteReseau
                    titre={t('Carte opérationnelle')}
                    zones={zones}
                    cadreZones={zoneCadre ? [zoneCadre] : (zonesAgent ?? exploitees)}
                    points={visibles.map((x) => ({ id: x.id, acteur: ACTEUR_CALQUE[x.calque], lat: x.lat, lng: x.lng, ton: x.calque === 'livreurs' && x.horsConnexion ? 'ink' : x.ton, etat: x.calque === 'livreurs' ? (x.horsConnexion ? 'hors_ligne' : 'mission') : undefined, nom: `${x.nom} · ${x.sous}`, etiquette: x.calque === 'paquets' ? x.nom.slice(-3) : x.calque === 'relais' ? x.sous.split(' · ')[0] : undefined }))}
                    trajets={on.includes('paquets') ? visibles.filter((x) => x.trajet).map((x) => ({ id: x.id, pts: x.trajet! })) : []}
                    choisi={choisi}
                    surPoint={setChoisi}
                  />
                  <Legende acteurs={(['relais', 'boutique', 'entreprise', 'livreur', 'paquet', 'alerte'] as const).filter((a) => on.includes(CALQUES.find((c) => ACTEUR_CALQUE[c[0]] === a)![0]))} etats={on.includes('livreurs') ? ['mission', 'hors_ligne'] : []} statuts={[['alerte', 'Saturé, fermé ou en retard'], ['inactif', 'En configuration']]} />
                </Panel>
                <div className="s4-pile">
                  <Panel titre={t('Calques')} icone="layers">
                    {CALQUES.map(([c, icone, ton, lib]) => (
                      <div key={c} className="admlg-lay">
                        <span className={'ic ' + ton}><Icone nom={icone} taille={15} /></span>
                        <span className="grow">{t(lib)}</span>
                        <span className="n">{n(c)}</span>
                        <Tg on={on.includes(c)} changer={() => basculer(c)} libelle={tf('Calque : {c}', { c: t(lib) })} />
                      </div>
                    ))}
                  </Panel>
                  <Panel titre={point ? t('Fiche courte') : t('Sélection')} icone="hand">
                    {!point ? (
                      <p className="t13 c3">{t('Aucun point choisi.')}</p>
                    ) : (
                      <>
                        <div className="kick t12 c3">{t(CALQUES.find((c) => c[0] === point.calque)![3])}</div>
                        <div className="b8 t15">{point.nom}</div>
                        <div className="t13 c3">{point.sous}</div>
                        {point.calque === 'livreurs' && (
                          <Note ton={point.horsConnexion ? 'amber' : 'ink'} icone={point.horsConnexion ? 'wifi-off' : 'eye'} className="mt10">
                            {point.horsConnexion ? tf('Hors connexion · dernière position {h}', { h: quand(point.horsConnexion, langue, false) }) : consulte?.id === point.id ? tf('Position consultée à {h} et journalisée.', { h: quand(consulte.le, langue, false) }) : t('Consultation en cours de journalisation…')}
                          </Note>
                        )}
                        <div className="btns mt10">
                          <Link className="btn sm secondary" to={chemin(point.route, point.params)}><Icone nom="arrow-up-right" taille={16} /><span>{t('Ouvrir la fiche')}</span></Link>
                          <button type="button" className="btn sm ghost" onClick={() => setChoisi(null)}>{t('Fermer')}</button>
                        </div>
                      </>
                    )}
                  </Panel>
                </div>
              </div>
              <div className="g g2">
                <Panel titre={t('Sur la carte maintenant')} icone="radio-tower">
                  <RowSt l={t('Relais')} r={<b>{tf('{n} dont {c} en alerte', { n: n('relais'), c: pts.filter((x) => x.calque === 'alertes' && x.route === 'relais').length })}</b>} couleur="var(--blue)" />
                  <RowSt l={t('Boutiques')} r={<b>{n('boutiques')}</b>} couleur="var(--or)" />
                  <RowSt l={t('Livreurs en mission')} r={<b>{pts.filter((x) => x.calque === 'livreurs').map((x) => x.nom).join(', ') || '0'}</b>} couleur="var(--acc)" />
                  <RowSt l={t('Paquets en cours')} r={<b>{n('paquets')}</b>} couleur="var(--or)" />
                  <RowSt l={t('Alertes')} r={<b>{n('alertes')}</b>} couleur="var(--red)" />
                  {hors.map((x) => <Li key={x.id} icone="wifi-off" ton="amber" t={tf('{n} hors connexion', { n: x.nom })} s={tf('Dernière position à {h}', { h: quand(x.horsConnexion!, langue, false) })} onClick={() => setChoisi(x.id)} />)}
                </Panel>
                <Panel titre={t('Confidentialité de la carte')} icone="shield-check">
                  <Li icone="eye-off" ton="acc" t={t('Aucune adresse de client')} s={t('Seuls le relais ou le quartier de destination sont montrés')} />
                  <Li icone="navigation-off" ton="acc" t={t('Aucune position hors mission')} s={t('Visible pendant une mission active, par la Direction et l’Opérations de la zone')} />
                  <Li icone="file-lock" ton="ink" t={t('Pas d’export avec positions')} s={t('Toute consultation est journalisée')} />
                  <Li icone="scale" ton="ink" t={t('Demande d’un tiers')} s={t('Police ou famille : seulement sur réquisition légale écrite, traitée par la Direction et journalisée')} />
                  <Pill ton="ink" sm icone="map">{t('Fond OpenStreetMap ; plan des zones hors ligne')}</Pill>
                </Panel>
              </div>
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}
