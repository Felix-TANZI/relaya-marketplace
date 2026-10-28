// ADM-P28 · Diffusion de panne et mode papier, repris sur le prototype (route('panne') : normal, déclarer, panne
// déclarée, mode papier, rétabli ; étapes Déclarer · Diffuser · Suivre · Clore). Règles : « Déclarer et diffuser » est
// un seul geste (bandeau dans les six applications, objectif panne_diffusion_objectif_min, délais contractuels
// suspendus) ; une panne de l'agrégateur suspend les nouveaux paiements, jamais les remises de colis déjà payés ; mode
// papier : aucune remise sans pièce d'identité et code, ressaisie sous ADM-PAPIER-RESSAISIE-H, garde due encaissée en
// espèces et notée (DP-65) ; au retour, délais prolongés de la durée de la panne déclarée ; rapport sous
// ADM-PANNE-RAPPORT-H ; clôture seulement registre ressaisi. Opérations : ses zones seulement. Réseau instable : la
// page garde les dernières données lues et le dit.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { exporterPdf, Banniere, Frise, Interdit, Kv, Li, Note, Panel, Pill, Rebours, Table, Vide, useSurtitre, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { yaounde, jourDe } from '../../calculs/temps'
import type { Incident, ServiceEtat } from '../../donnees/domaines/communication'
import type { Espace } from '../../donnees/communs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, usePerimetre, useRole, useRouteOuverte } from '../../session'
import { Chargement, ChampMotif, Coche, ErreurLecture, Etapes, Mini, RAISONS, useDates, useDuree } from './commun-s5'
import { REGLES_S5, dureePanne, echeanceRapport, echeanceRessaisie, peutClore, prolongation } from './regles-s5'

const R = REGLES_S5
const ETAPES = ['Déclarer', 'Diffuser', 'Suivre', 'Clore']
const SVC: Record<ServiceEtat['etat'], [string, Ton]> = { normal: ['Normal', 'green'], degrade: ['Dégradé', 'amber'], panne: ['En panne', 'red'], ferme: ['Fermé', 'ink'] }
const ICONE_SVC: Record<string, string> = { api: 'server', paiement: 'wallet', 'paiement-secours': 'life-buoy', carte: 'credit-card', sms: 'message-square', push: 'bell', cartes: 'map', preuves: 'image', relais: 'package-check' }
const APP: Record<Espace, [string, string]> = { client: ['Client', 'shopping-bag'], vendeur: ['Vendeur', 'store'], relais: ['Point relais', 'package-check'], entreprise: ['Entreprise de livraison', 'truck'], livreur: ['Livreur', 'bike'], admin: ['Console', 'shield-check'] }
const EFFETS = ['Nouveaux paiements de l’opérateur touché suspendus ; l’autre opérateur continue', 'Remises des colis déjà payés : elles continuent', 'Délais de garde, de litige et de versement suspendus', 'Mode papier pour les relais hors ligne : dès confirmation']
const ZONES_RELAIS: Record<string, string[]> = {
  Z1: ['Relais Bastos Carrefour', 'Relais Nlongkak Pharmacie'],
  Z3: ['Relais Mokolo Marché', 'Relais Elobi'],
  Z6: ['Relais Melen Université', 'Relais Biyem-Assi Lycée'],
}

export default function Panne() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const [p] = useSearchParams()
  const droit = useDroit('panne')
  const role = useRole()
  const peut = droit.acces !== 'lecture' && (role === 'superviseur' || role === 'operations')
  const incidents = useLecture(() => source.communication.incidents(), [])
  const services = useLecture(() => source.communication.services(), [])
  const l = incidents.donnees
  const choisi = l?.find((i) => i.id === p.get('id')) ?? l?.find((i) => i.etat !== 'clos') ?? null
  const declarer = p.get('s') === 'declarer'
  const ouverts = (l ?? []).filter((i) => i.etat !== 'clos')
  const fonctions = useFonctions([
    peut && { verbe: 'Déclarer', n: null, unite: ['panne', 'pannes'], icone: 'siren', route: 'panne', params: { s: 'declarer' } },
    { verbe: 'Suivre', n: ouverts.length, unite: ['panne en cours', 'pannes en cours'], icone: 'activity', route: 'panne', params: { id: ouverts[0]?.id }, alerte: ouverts.length > 0 },
    { verbe: 'Ressaisir', n: ouverts.reduce((n, i) => n + i.remises.filter((r) => !r.ressaisieLe).length, 0), unite: ['remise papier', 'remises papier'], icone: 'clipboard-pen', route: 'panne', params: { id: ouverts[0]?.id } },
  ])
  const actes =
    peut && !declarer ? (
      <Link className="btn primary auto" to={chemin('panne', { s: 'declarer' })}>
        <Icone nom="siren" taille={18} />
        <span>{t('Déclarer une panne')}</span>
      </Link>
    ) : undefined
  return (
    <Ecran route="panne" kicker={surtitre} fonctions={declarer ? undefined : fonctions} actions={actes}>
      {incidents.erreur && l && (
        <Note ton="amber" icone="wifi-off" className="mt12" role="status">
          {t('Réseau instable · dernières données lues')}
        </Note>
      )}
      <ErreurLecture erreur={l ? null : incidents.erreur} relire={incidents.relire} />
      {!l ? (
        !incidents.erreur && <Chargement n={3} />
      ) : declarer ? (
        peut ? <Declarer services={services.donnees ?? []} /> : <Interdit roles={['superviseur', 'operations']} quoi="Déclarer une panne" />
      ) : choisi && choisi.etat !== 'clos' ? (
        <IncidentVue i={choisi} peut={peut} relire={incidents.relire} />
      ) : (
        <Normal services={services.donnees ?? []} incidents={l} choisi={choisi} />
      )}
      {l && !declarer && choisi && choisi.etat !== 'clos' && <Historique incidents={l} />}
    </Ecran>
  )
}

function Normal({ services, incidents, choisi }: { services: ServiceEtat[]; incidents: Incident[]; choisi: Incident | null }) {
  const { t } = usePreferences()
  const d = useDates()
  const n = useHorloge()
  const vert = services.every((s) => s.etat === 'normal' || s.etat === 'ferme')
  return (
    <>
      {choisi?.etat === 'clos' && (
        <Note ton="green" icone="circle-check" className="mt12">
          {`${choisi.id} · ${choisi.service} · ${t('clos')} ${choisi.closLe ? d.complet(choisi.closLe) : ''}`}
        </Note>
      )}
      <div className={'hero ' + (vert ? 'acc' : 'night')}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="hk">{vert ? t('Normal · tous les services sont verts') : t('Un service est dégradé')}</span>
          <Pill ton="dk" icone="circle-check">{`${t('Vérifié à')} ${d.heure(n)}`}</Pill>
        </div>
        <div className="ht">{t('Aucun incident en cours')}</div>
        <div className="hs">{t('Services, relais et entreprises disponibles. Le dernier incident est clos avec son rapport.')}</div>
      </div>
      <div className="g g21">
        <Panel titre={t('État des services')} icone="activity">
          <Services services={services} />
        </Panel>
        <Pret />
      </div>
      <div className="g g2">
        <RelaisVague papier={[]} />
        <Historique incidents={incidents} seul />
      </div>
    </>
  )
}

function Services({ services }: { services: ServiceEtat[] }) {
  const { t } = usePreferences()
  return (
    <div className="admm-svcs">
      {services.map((s) => (
        <div key={s.id} className={'admm-svc ' + SVC[s.etat][1]}>
          <span className="i">
            <Icone nom={ICONE_SVC[s.id] ?? 'server'} taille={18} />
          </span>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="b8 t14">{t(s.nom)}</div>
            <div className="t12 c3">{t(s.detail)}</div>
          </div>
          <Pill ton={SVC[s.etat][1]} sm>
            {t(SVC[s.etat][0])}
          </Pill>
        </div>
      ))}
    </div>
  )
}

function Pret() {
  const { t } = usePreferences()
  return (
    <Panel titre={t('Prêts pour le mode papier')} icone="shield-check">
      <Li icone="notebook-pen" ton="acc" t={t('Registres papier')} s={t('Relais équipés · modèle imprimable dans la page de l’incident')} />
      <Li icone="battery-charging" ton="acc" t={t('Batteries externes')} s={t('Dans le kit des relais et des livreurs')} />
      <Li icone="users" ton="acc" t={t('Astreinte')} s={t('Franck Penga (Direction) · Yannick Owona (Opérations, Z1, Z2, Z3, Z6) · agents terrain en binôme')} />
    </Panel>
  )
}

function RelaisVague({ papier }: { papier: string[] }) {
  const { t } = usePreferences()
  return (
    <Panel titre={t('Relais de la vague 1')} icone="map">
      {Object.entries(ZONES_RELAIS).map(([z, l]) =>
        l.map((r) => <Li key={r} icone="package-check" ton={papier.includes(r) ? 'amber' : 'green'} t={r} s={z} droite={<Pill ton={papier.includes(r) ? 'amber' : 'green'} sm>{papier.includes(r) ? t('Mode papier') : t('En ligne')}</Pill>} />),
      )}
    </Panel>
  )
}

function Historique({ incidents, seul }: { incidents: Incident[]; seul?: boolean }) {
  const { t } = usePreferences()
  const d = useDates()
  const duree = useDuree()
  const contenu = (
    <Table
      legende={t('Derniers incidents')}
      rows={incidents}
      cle={(i) => i.id}
      cols={[
        { k: 'i', t: t('Incident'), main: true, rendu: (i) => <Link to={chemin('panne', { id: i.id })}><b>{i.service}</b> <div className="t2 mono">{i.id}</div></Link> },
        { k: 'd', t: t('Quand'), rendu: (i) => `${d.jour(i.declareLe)} · ${i.retabliLe ? duree(dureePanne(i.detecteLe, i.retabliLe)) : t('en cours')}` },
        { k: 'm', t: t('Mode papier'), hideM: true, rendu: (i) => (i.remises.length ? `${i.remises.length} ${t('remises')}` : t('non')) },
        { k: 'r', t: t('État'), rendu: (i) => <Pill ton={i.etat === 'clos' ? 'green' : i.etat === 'retabli' ? 'blue' : 'red'} sm>{i.etat === 'clos' && i.closLe ? `${t('Clos le')} ${d.court(i.closLe)}` : t({ declare: 'Déclarée', papier: 'Mode papier', retabli: 'Rétablie', clos: 'Close' }[i.etat])}</Pill> },
      ]}
    />
  )
  return seul ? (
    <Panel titre={t('Derniers incidents')} icone="history">
      {contenu}
    </Panel>
  ) : (
    <Panel titre={t('Derniers incidents')} icone="history" style={{ marginTop: 16 }}>
      {contenu}
    </Panel>
  )
}

// ── Déclarer ───────────────────────────────────────────────────────────────────────────────────────────────────────
function Declarer({ services }: { services: ServiceEtat[] }) {
  const { t, tf } = usePreferences()
  const n = useHorloge()
  const navig = useNavigate()
  const perimetre = usePerimetre()
  const zonesPermises = R.zones.filter((z) => !perimetre || perimetre.includes(z.code))
  const [service, setService] = useState('')
  const [zones, setZones] = useState<string[]>([])
  const [effets, setEffets] = useState<string[]>([EFFETS[1], EFFETS[2]])
  const [consignes, setConsignes] = useState('')
  const [debut, setDebut] = useState(() => {
    const d = new Date(n + 3600_000)
    return `${jourDe(n)}T${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  })
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const declarer = async () => {
    setEnvoi(true)
    setErreur(null)
    const [j, h] = debut.split('T')
    const [a, m, jj] = j.split('-').map(Number)
    const [hh, mm] = h.split(':').map(Number)
    try {
      const r = await source.communication.declarer({ service, zones, effets, consignes, detecteLe: yaounde(a, m, jj, hh, mm) })
      if (!r.ok) setErreur(t(RAISONS[r.raison] ?? 'Refusé.'))
      else navig(chemin('panne', { id: r.id }))
    } catch {
      setErreur(t('La déclaration n’a pas pu partir. Réessayez : rien n’a été diffusé.'))
    } finally {
      setEnvoi(false)
    }
  }
  return (
    <>
      <Etapes etapes={ETAPES} cur={0} />
      <div className="g g21">
        <Panel titre={t('Déclaration')} icone="siren">
          <label className="s5-champ s5-sel">
            <span>{t('Service touché')}</span>
            <select value={service} onChange={(e) => setService(e.target.value)}>
              <option value="">{t('Choisir…')}</option>
              {services.map((s) => (
                <option key={s.id} value={t(s.nom)}>
                  {t(s.nom)}
                </option>
              ))}
              <option value={t('Coupure de courant au relais')}>{t('Coupure de courant au relais')}</option>
              <option value={t('Réseau d’un opérateur mobile')}>{t('Réseau d’un opérateur mobile')}</option>
            </select>
          </label>
          <fieldset className="s5-champ" style={{ border: 0, padding: 0 }}>
            <legend className="b8 t13">{t('Zones')}</legend>
            <div className="chips">
              {zonesPermises.map((z) => (
                <button key={z.code} type="button" className={'chip' + (zones.includes(z.code) ? ' on' : '')} aria-pressed={zones.includes(z.code)} onClick={() => setZones(zones.includes(z.code) ? zones.filter((x) => x !== z.code) : [...zones, z.code])}>
                  <Icone nom="map-pin" taille={15} />
                  {`${z.code} ${z.nom}`}
                </button>
              ))}
            </div>
            {perimetre && <span className="t12 c3">{t('Opérations : vos zones seulement.')}</span>}
          </fieldset>
          <label className="s5-champ">
            <span>{t('Début (détection)')}</span>
            <input type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} />
          </label>
          <fieldset className="s5-champ" style={{ border: 0, padding: 0 }}>
            <legend className="b8 t13">{t('Effet')}</legend>
            <div className="admm-chk">
              {EFFETS.map((e) => (
                <label key={e} className="e-case">
                  <input type="checkbox" checked={effets.includes(e)} onChange={() => setEffets(effets.includes(e) ? effets.filter((x) => x !== e) : [...effets, e])} />
                  <span>{t(e)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt12">
            <ChampMotif valeur={consignes} changer={setConsignes} libelle="Consignes (reprises dans le bandeau de chaque application)" lignes={4} />
          </div>
          {erreur && (
            <p className="e-erreur mt10" role="alert">
              <Icone nom="triangle-alert" taille={16} />
              {erreur}
            </p>
          )}
        </Panel>
        <Panel titre={t('Aperçu du bandeau')} icone="smartphone">
          <div className="admm-app big">
            <div className="bar">
              <Icone nom="shopping-bag" taille={14} />
              <span>{t('Application client')}</span>
            </div>
            <div className="bn">
              <Icone nom="triangle-alert" taille={15} />
              <span>{consignes || t('Vos consignes apparaîtront ici.')}</span>
            </div>
          </div>
          <div className="mt12">
            <Kv k={t('Applications')} v={t('6 · client, vendeur, relais, entreprise, livreur, console')} />
            <Kv k={t('Objectif')} v={tf('bandeau partout en moins de {n} min', { n: R.diffusionObjectifMin })} />
          </div>
          <div className="btns mt12">
            <button type="button" className="btn primary" disabled={envoi || !service || !zones.length || consignes.trim().length < R.motifMin} title={!service || !zones.length || consignes.trim().length < R.motifMin ? t('Complétez le service, les zones et les consignes.') : undefined} onClick={() => void declarer()}>
              <Icone nom="siren" taille={18} />
              <span>{t('Déclarer et diffuser')}</span>
            </button>
          </div>
        </Panel>
      </div>
    </>
  )
}

// ── Incident en cours ──────────────────────────────────────────────────────────────────────────────────────────────
function IncidentVue({ i, peut, relire }: { i: Incident; peut: boolean; relire: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const duree = useDuree()
  const n = useHorloge()
  const ouverte = useRouteOuverte()
  const [msg, setMsg] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [choix, setChoix] = useState<string[]>([])
  const [maj, setMaj] = useState<string | null>(null)
  const [rap, setRap] = useState(i.rapport ?? { cause: '', effets: '', change: '' })
  const geste = async (f: () => Promise<{ ok: boolean; raison?: string }>, ok: string) => {
    setEnvoi(true)
    try {
      const r = await f()
      setMsg(r.ok ? t(ok) : t(RAISONS[r.raison ?? ''] ?? 'Refusé.'))
    } catch {
      setMsg(t('Le geste n’a pas pu partir : réseau instable. Réessayez, rien n’est perdu.'))
    } finally {
      setEnvoi(false)
      relire()
    }
  }
  const accuses = i.accuses.filter((a) => a.le !== null && a.le <= n)
  const dernier = accuses.length ? Math.max(...accuses.map((a) => a.le!)) : null
  const relaisZones = i.zones.flatMap((z) => ZONES_RELAIS[z] ?? [])
  const ressaisies = i.remises.filter((r) => r.ressaisieLe !== null && r.ressaisieLe <= n).length
  const echeance = i.remises.filter((r) => r.ressaisieLe === null).map((r) => echeanceRessaisie(r.le))
  const clore = peutClore(i, n)
  const etape = i.etat === 'retabli' ? 3 : 2
  const banniere = { declare: ['red', 'siren', tf('Panne déclarée à {h}', { h: d.heure(i.declareLe) })], papier: ['amber', 'notebook-pen', tf('Mode papier actif depuis {h}', { h: i.papierLe ? d.heure(i.papierLe) : '' })], retabli: ['acc', 'circle-check', tf('Service rétabli à {h}', { h: i.retabliLe ? d.heure(i.retabliLe) : '' })], clos: ['acc', 'circle-check', t('Incident clos')] }[i.etat] as ['red' | 'amber' | 'acc', string, string]
  const apps = (fini: boolean) => (
    <div className="admm-apps">
      {i.accuses.map((a) => (
        <div key={a.app} className="admm-app">
          <div className="bar">
            <Icone nom={APP[a.app][1]} taille={14} />
            <span>{t(APP[a.app][0])}</span>
            <span className="sp"></span>
            <Icone nom={a.le !== null && a.le <= n ? 'circle-check' : 'loader'} taille={14} />
          </div>
          <div className={'bn' + (fini ? ' ok' : '')}>
            <Icone nom={fini ? 'circle-check' : 'triangle-alert'} taille={15} />
            <span>{fini ? t('Service rétabli. Merci de votre patience : tout fonctionne de nouveau.') : i.consignes}</span>
          </div>
          <div className="ln t12 c3">{a.le !== null && a.le <= n ? tf('Affiché à {h}', { h: d.heure(a.le) }) : t('En attente d’accusé')}</div>
        </div>
      ))}
    </div>
  )
  return (
    <>
      <Banniere ton={banniere[0]} icone={banniere[1]} className="mt16" role="status">
        <b>{banniere[2]}</b> · {`${i.service} · ${i.zones.join(', ')}`}
      </Banniere>
      {msg && (
        <Note ton="ink" icone="info" className="mt12" role="status">
          {msg}
        </Note>
      )}
      <Etapes etapes={ETAPES} cur={etape} />
      {i.etat !== 'retabli' && (
        <div className={'hero ' + (i.etat === 'papier' ? 'amber' : 'red')}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="hk">{`${i.etat === 'papier' ? t('Mode papier') : t('Panne déclarée')} · ${i.id}`}</span>
            <Pill ton="dk" icone="timer">
              {tf('Depuis {d}', { d: duree(n - i.declareLe) })}
            </Pill>
          </div>
          <div className="ht">{i.service}</div>
          <div className="hs">{tf('Détectée à {a}, déclarée à {b} par {p}. Les remises des colis déjà payés continuent.', { a: d.heure(i.detecteLe), b: d.heure(i.declareLe), p: i.par })}</div>
          <div className="money4 admm-m4">
            <Mini l={t('Bandeau diffusé')} v={dernier ? duree(dernier - i.declareLe) : '—'} s={tf('{n} applications sur 6 · objectif {o} min', { n: accuses.length, o: R.diffusionObjectifMin })} />
            <Mini l={t('Remises papier')} v={i.remises.length} s={i.relaisPapier.join(', ') || t('aucun relais en papier')} />
            <Mini l={t('À ressaisir avant')} v={echeance.length ? d.heure(Math.min(...echeance)) : '—'} s={tf('{h} h après la remise', { h: R.ressaisieH })} />
            <Mini l={t('Délais')} v={t('gelés')} s={tf('depuis {h}', { h: d.heure(i.declareLe) })} />
          </div>
        </div>
      )}
      {i.etat === 'retabli' && i.retabliLe && (
        <div className="hero green">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="hk">{tf('Rétabli à {h} · {id}', { h: d.heure(i.retabliLe), id: i.id })}</span>
            <Pill ton="dk" icone="timer">
              {tf('{d} de panne', { d: duree(dureePanne(i.detecteLe, i.retabliLe)) })}
            </Pill>
          </div>
          <div className="ht">{t('Le service fonctionne de nouveau')}</div>
          <div className="hs">{tf('Délais relancés, prolongés de {p} (durée de la panne déclarée). Rapport de clôture avant le {d}.', { p: duree(prolongation(i.declareLe, i.retabliLe)), d: d.complet(echeanceRapport(i.retabliLe)) })}</div>
          <div className="money4 admm-m4">
            <Mini l={t('Remises ressaisies')} v={`${ressaisies} / ${i.remises.length}`} s={i.relaisPapier.join(', ')} />
            <Mini l={t('Messages de reprise')} v={`${accuses.length} / 6`} s={t('applications')} />
            <Mini l={t('Rapport')} v={i.rapport ? t('écrit') : t('à écrire')} s={<Rebours fin={echeanceRapport(i.retabliLe)} urgent={6 * 3600_000} critique={3600_000} />} />
            <Mini l={t('Clôture')} v={clore === 'ok' ? t('possible') : t('bloquée')} s={clore === 'ok' ? '' : t(RAISONS[clore])} />
          </div>
        </div>
      )}
      <Panel titre={i.etat === 'retabli' ? t('Message de reprise diffusé') : t('Bandeau diffusé dans les 6 applications')} icone="megaphone" style={{ marginTop: 16 }}>
        {apps(i.etat === 'retabli')}
      </Panel>
      <div className="g g2">
        {i.etat === 'retabli' ? (
          <Panel titre={t('Retour à la normale')} icone="list-checks">
            <Coche ok>{t('Paiements rouverts, bandeau remplacé par le message de reprise')}</Coche>
            <Coche ok>{t('Délais de garde, de litige et de versement relancés et prolongés')}</Coche>
            <Coche ok>{t('Preuves hors ligne reçues avec leur heure et leur position d’origine')}</Coche>
            <Coche ok={ressaisies === i.remises.length}>{tf('Registre papier ressaisi : {a} sur {b}', { a: ressaisies, b: i.remises.length })}</Coche>
            {i.remises
              .filter((r) => r.ressaisieLe === null)
              .map((r) => (
                <Li
                  key={r.id}
                  icone="notebook-pen"
                  ton="amber"
                  t={tf('{e} · remise à un tiers à {h}', { e: r.etiquette, h: d.heure(r.le) })}
                  s={tf('À ressaisir avant {h} · {n} relance(s)', { h: d.complet(echeanceRessaisie(r.le)), n: r.relances })}
                  droite={
                    peut ? (
                      <button type="button" className="btn secondary sm" disabled={envoi} onClick={() => void geste(() => source.communication.relancerRessaisie(i.id, r.id), 'Gérant relancé : la ressaisie est faite.')}>
                        <Icone nom="bell-ring" taille={16} />
                        {t('Relancer le gérant')}
                      </button>
                    ) : undefined
                  }
                />
              ))}
            {ouverte('support') && <Li icone="life-buoy" ton="acc" t={t('Demandes au support liées à l’incident')} s={i.id} to={chemin('support')} />}
          </Panel>
        ) : (
          <Panel titre={t('Effets en cours')} icone="list">
            {i.effets.map((e) => (
              <Li key={e} icone="circle-check" ton="green" t={t(e)} />
            ))}
            <Li icone="timer-off" ton="acc" t={t('Délais suspendus')} s={t('Garde, litiges, constats et versements des acteurs touchés')} />
          </Panel>
        )}
        <Panel titre={t('Suivi')} icone="history">
          <Frise items={i.journal.map((j) => ({ t: t(j.quoi), d: `${d.heure(j.le)} · ${j.par}`, st: 'done' as const }))} />
        </Panel>
      </div>
      {i.etat === 'papier' && (
        <div className="g g2">
          <Panel titre={t('Consignes envoyées aux relais et aux livreurs')} icone="list-checks">
            <ol className="admm-steps">
              <li>
                <b>{t('Aucune remise sans vérification.')}</b> {t('Le gérant vérifie la pièce d’identité du porteur ; le client écrit lui-même son code au registre, jamais lu à voix haute.')}
              </li>
              <li>
                <b>{t('Garde due.')}</b> {t('Imprimée sur la fiche de remise, encaissée en espèces et notée (DP-65) ; ressaisie avec la remise.')}
              </li>
              <li>
                <b>{t('Preuves hors ligne.')}</b> {t('Photos et positions restent en file et partent au retour du réseau, avec l’heure et la position d’origine.')}
              </li>
              <li>
                <b>{t('Commande payable au retrait.')}</b> {t('Jamais payée en espèces : elle attend le retour du paiement Mobile Money.')}
              </li>
            </ol>
            <p className="t13 c2 mt8 s5-texte">{i.consignes}</p>
          </Panel>
          <Registre i={i} />
        </div>
      )}
      {i.etat === 'retabli' && (
        <Panel titre={tf('Rapport de clôture · sous {h} heures', { h: R.rapportH })} icone="file-pen" style={{ marginTop: 16 }}>
          {peut ? (
            <>
              <ChampMotif valeur={rap.cause} changer={(v) => setRap({ ...rap, cause: v })} libelle="Cause" />
              <ChampMotif valeur={rap.effets} changer={(v) => setRap({ ...rap, effets: v })} libelle="Effets" />
              <ChampMotif valeur={rap.change} changer={(v) => setRap({ ...rap, change: v })} libelle="Ce qui change" />
              <div className="row wrap mt12" style={{ gap: 8 }}>
                <button type="button" className="btn secondary auto" disabled={envoi} onClick={() => void geste(() => source.communication.ecrireRapport(i.id, rap), 'Rapport enregistré.')}>
                  <Icone nom="save" taille={18} />
                  <span>{t('Enregistrer le rapport')}</span>
                </button>
                <button type="button" className="btn primary auto" disabled={envoi || clore !== 'ok'} title={clore !== 'ok' ? t(RAISONS[clore]) : undefined} onClick={() => void geste(() => source.communication.clore(i.id), 'Incident clos et journalisé.')}>
                  <Icone nom="circle-check" taille={18} />
                  <span>{t('Clore l’incident')}</span>
                </button>
              </div>
            </>
          ) : (
            <Interdit roles={['superviseur', 'operations']} quoi="Clore un incident" />
          )}
        </Panel>
      )}
      {i.etat === 'declare' && (
        <div className="g g2">
          <RelaisVague papier={[]} />
          <Panel titre={t('Relais hors ligne à passer en mode papier')} icone="wifi-off">
            {relaisZones.map((r) => (
              <label key={r} className="e-case">
                <input type="checkbox" checked={choix.includes(r)} disabled={!peut} onChange={() => setChoix(choix.includes(r) ? choix.filter((x) => x !== r) : [...choix, r])} />
                <span>{r}</span>
              </label>
            ))}
            <Note ton="acc" icone="footprints" className="mt8">
              {t('Agents terrain : ils apportent les consignes papier au relais. Aucun appel sur un numéro personnel.')}
            </Note>
          </Panel>
        </div>
      )}
      {i.etat === 'papier' && <RelaisVague papier={i.relaisPapier} />}
      {peut && maj !== null && (
        <Panel titre={t('Mettre à jour le message')} icone="pencil" style={{ marginTop: 16 }}>
          <ChampMotif valeur={maj} changer={setMaj} libelle="Consignes (rediffusées dans les six applications)" lignes={4} />
          <div className="btns mt12">
            <button type="button" className="btn ghost" onClick={() => setMaj(null)}>
              {t('Annuler')}
            </button>
            <button type="button" className="btn primary" disabled={envoi} onClick={() => void geste(() => source.communication.mettreAJour(i.id, maj), 'Message mis à jour et rediffusé.').then(() => setMaj(null))}>
              <Icone nom="send" taille={18} />
              <span>{t('Rediffuser')}</span>
            </button>
          </div>
        </Panel>
      )}
      {peut && i.etat !== 'retabli' && (
        <div className="admm-bar">
          {i.etat === 'declare' && (
            <button type="button" className="btn primary auto" disabled={envoi || !choix.length} title={!choix.length ? t('Cochez d’abord les relais hors ligne.') : undefined} onClick={() => void geste(() => source.communication.passerPapier(i.id, choix), 'Mode papier diffusé aux relais choisis et aux livreurs.')}>
              <Icone nom="notebook-pen" taille={18} />
              <span>{t('Passer les relais hors ligne en mode papier')}</span>
            </button>
          )}
          <button type="button" className="btn secondary auto" onClick={() => setMaj(i.consignes)}>
            <Icone nom="pencil" taille={18} />
            <span>{t('Mettre à jour le message')}</span>
          </button>
          <button type="button" className="btn secondary auto" disabled={envoi} onClick={() => void geste(() => source.communication.retablir(i.id), 'Service rétabli : délais relancés et prolongés, message de reprise diffusé.')}>
            <Icone nom="circle-check" taille={18} />
            <span>{t('Déclarer le retour du service')}</span>
          </button>
          <span className="t12 c3 b7">
            <Icone nom="timer-off" taille={14} /> {t('Délais de garde, de litige et de versement suspendus')}
          </span>
        </div>
      )}
    </>
  )
}

function Registre({ i }: { i: Incident }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const imprimer = () =>
    exporterPdf(`registre-${i.id}.pdf`, [
      { texte: t('Registre de remise · mode papier'), taille: 16, espace: 8 },
      { texte: `${i.relaisPapier.join(', ')} · ${d.jour(i.declareLe)} · ${i.id}`, espace: 12 },
      { texte: t('Heure | Étiquette | Porteur | Pièce vérifiée | Code écrit par le client | Garde encaissée | Signature'), espace: 8 },
      ...i.remises.map((r) => ({ texte: `${d.heure(r.le)} | ${r.etiquette} | ${t(r.porteur === 'client' ? 'client lui-même' : 'tiers désigné')} | ☐ | ●●●●●● | ☐ | ________` })),
      ...Array.from({ length: 12 }, () => ({ texte: '______ | ______ | ______ | ☐ | ☐☐☐☐☐☐ | ☐ | ________' })),
      { texte: t('Le code n’est jamais lu par le gérant : le client l’écrit lui-même ; il est ressaisi et vérifié par le serveur au retour du réseau.'), espace: 12 },
    ])
  return (
    <Panel titre={t('Registre de remise imprimable')} icone="notebook-pen">
      <div>
        <div>
          <div className="grow">
            <b>{t('Registre de remise · mode papier')}</b>
            <div className="t12 c3">{`${i.relaisPapier.join(', ')} · ${d.jour(i.declareLe)} · ${i.id}`}</div>
          </div>
        </div>
        <div className="s5-wrap mt8">
          <table className="s5-mx">
            <thead>
              <tr>
                <th>{t('Heure')}</th>
                <th>{t('Étiquette')}</th>
                <th>{t('Porteur')}</th>
                <th>{t('Ressaisie')}</th>
              </tr>
            </thead>
            <tbody>
              {i.remises.map((r) => (
                <tr key={r.id}>
                  <td className="hw">{d.heure(r.le)}</td>
                  <td className="hw">{r.etiquette}</td>
                  <td className="hw">{t(r.porteur === 'client' ? 'client lui-même' : 'tiers désigné')}</td>
                  <td>{r.ressaisieLe ? t('faite') : tf('avant {h}', { h: d.heure(echeanceRessaisie(r.le)) })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="t12 c3 mt8">{t('Le code n’est jamais lu par le gérant : le client l’écrit lui-même ; il est ressaisi et vérifié par le serveur au retour du réseau.')}</div>
      </div>
      <div className="row wrap mt12" style={{ gap: 8 }}>
        <button type="button" className="btn secondary auto" onClick={imprimer}>
          <Icone nom="printer" taille={18} />
          <span>{t('Imprimer le registre (PDF)')}</span>
        </button>
      </div>
      {!i.remises.length && <Vide icone="notebook-pen" t={t('Aucune remise papier')} s={t('Les remises notées au registre apparaissent ici à la reconnexion du relais.')} />}
    </Panel>
  )
}
