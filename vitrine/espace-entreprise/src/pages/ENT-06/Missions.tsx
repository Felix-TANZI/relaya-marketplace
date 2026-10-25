// ENT-P13 — Missions et carte de la flotte, reprise sur route('missions') du prototype : tête datée, un seul bandeau
// (le plus grave : erreur, retard prévisible, hors connexion, paquets en attente), onglets de la machine à états (à
// affecter, affectées, en cours, déposées, closes, incidents : ENT-02-R23, RG-R107 ; compteur masqué à 0), tableau
// (paquet, livreur, avancement et colis sous garde, en ce moment, heure limite, marge = heure limite − fin estimée :
// rouge si négative ou sous le seuil d'alerte, ENT-P13R-02 ; ambre hors connexion, ENT-RG-R103), mis à jour en direct
// (RG-R106) ; closes : colis, dépôt, rémunération et vendredi de versement (montants masqués au répartiteur) ; carte des
// livreurs en mission active seulement (ENT-P13R-01, RG-R108) ; alertes ; livreurs (position suivie pendant la
// mission seulement). Détail d'une mission (feuille) : appel masqué (DP-61), relance, preuves, colis, transfert.
// BelivaY n'intervient jamais auprès du livreur.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Banniere, Barre, BarrePouce, Choix, type Colonne, correspond, exporterCsv, Exports, Hint, Li, Panel, Pill, Px, Qui, Rebours, Recherche, St, Table, Tete, useLarge, Vide as VideP } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import type { Mission, MomentMission, OngletMissions } from '../../donnees/domaines/missions'
import type { Livreur } from '../../donnees/domaines/livreurs'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { Avatar, BandeauErreur, Chargement, Montant, NOM_GENRE, Retour, useDonnees, useDuree, useHeure, useJour } from '../ENT-05/commun'
import { NOM_VEHICULE } from '../ENT-05/Affectation'
import { PARAMETRES } from '../../calculs/registre'
import { REGLES, tonMarge } from '../../calculs/livraison/regles-ecrans'
import { geste } from '../../donnees/fileHorsLigne'
import { FeuilleAppel } from './Appel'
import { Carte, type TraceCarte } from './Carte'
import { sonner } from '../../composants/marque-sonore'
import './missions.css'

// Ordre des onglets du prototype (entB_tabs) : la vie du paquet.
export const ONGLETS: { id: OngletMissions; titre: string }[] = [
  { id: 'a_affecter', titre: 'À affecter' },
  { id: 'affectees', titre: 'Affectées' },
  { id: 'en_cours', titre: 'En cours' },
  { id: 'deposees', titre: 'Déposées' },
  { id: 'closes', titre: 'Closes' },
  { id: 'incidents', titre: 'Incidents' },
]
const MOMENT: Record<MomentMission, string> = {
  a_affecter: 'Attend un livreur',
  non_parti: 'Pas encore parti',
  vers_boutique: 'En route vers {l}',
  chez_boutique: 'Chez {l}',
  vers_relais: 'En route vers {l}',
  au_relais: 'Au relais {l}',
  vers_client: 'En route vers le client à {l}',
  arret: 'À l’arrêt : incident à {l}',
  depose: 'Déposé à {l}',
  clos: 'Clos',
}

export function useMoment() {
  const { t, tf } = usePreferences()
  return (m: Mission) => (MOMENT[m.moment].includes('{l}') ? tf(MOMENT[m.moment], { l: m.lieu ?? '—' }) : t(MOMENT[m.moment]))
}

function Marge({ m }: { m: Mission }) {
  const { t, tf } = usePreferences()
  const duree = useDuree()
  if (m.horsConnexionDepuis) return <span className="pill ambre">{t('Hors connexion')}</span>
  if (m.margeMin === null) return <span className="lv-s">—</span>
  const ton = tonMarge(m.margeMin)
  return <span className={'pill ' + ton}>{m.margeMin < 0 ? tf('{d} de retard prévu', { d: duree(-m.margeMin) }) : tf('{d} de marge', { d: duree(m.margeMin) })}</span>
}

function Avancement({ m }: { m: Mission }) {
  const { tf } = usePreferences()
  return (
    <div style={{ minWidth: 110 }}>
      <span className="lv-s">
        {tf('Arrêt {e} sur {n}', { e: Math.min(m.etape + (m.etape < m.etapes ? 1 : 0), m.etapes), n: m.etapes })}
        {m.colisSousGarde > 0 && ' · ' + tf('{n} sous garde', { n: m.colisSousGarde })}
      </span>
      <div className="lv-av-barre" aria-hidden="true">
        {Array.from({ length: m.etapes }, (_, i) => (
          <i key={i} className={i < m.etape ? 'f' : ''}></i>
        ))}
      </div>
    </div>
  )
}

/** entB_progress du prototype : barre et « Arrêt 2/3 · 5/8 colis sous garde ». */
function Progres({ m }: { m: Mission }) {
  const { tf } = usePreferences()
  const e = Math.min(m.etape + (m.etape < m.etapes ? 1 : 0), m.etapes)
  const pct = m.etapes ? Math.round((m.etape / m.etapes) * 100) : 0
  return (
    <div className="entb-prog">
      <Barre pct={Math.max(pct, 6)} ton={m.margeMin !== null && m.margeMin < 0 ? 'red' : 'acc'} />
      <span>{tf('Arrêt {e}/{n} · {g}/{t} colis sous garde', { e, n: m.etapes, g: m.colisSousGarde, t: m.colisTotal })}</span>
    </div>
  )
}

function FeuilleMission({ m, fermer, ouverte }: { m: Mission | null; fermer(): void; ouverte: boolean }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const jour = useJour()
  const moment = useMoment()
  const appel = useFeuille('appel')
  const [relance, setRelance] = useState<{ ton: 'ok' | 'ambre'; texte: string } | null>(null)
  if (!m) return null
  // Geste qui tient sans réseau (file hors connexion) : gardé sur l'appareil, envoyé au retour du réseau.
  const relancer = async (sujet: 'preuves' | 'position' | 'depart') => {
    const g = await geste('Relancer le livreur', (s) => s.missions.relancer(m.id, sujet), m.paquetId)
    if (g.etat === 'en_file') return setRelance({ ton: 'ambre', texte: t('Relance gardée sur cet appareil : elle partira au retour du réseau.') })
    const r = g.r
    if (r.ok) setRelance({ ton: 'ok', texte: tf('Notification envoyée à {n} à {h}.', { n: m.livreur?.nom ?? '', h: h(r.envoyeLe) }) })
    else setRelance({ ton: 'ambre', texte: tf('Déjà relancé il y a moins de {n} min : {l} a reçu la notification.', { n: PARAMETRES.saisies.relanceMin, l: m.livreur?.nom ?? '' }) })
  }
  const actif = ['en_cours', 'incidents', 'affectees', 'deposees'].includes(m.onglet)
  return (
    <>
      <Feuille ouverte={ouverte && !appel.ouverte} fermer={fermer} titre={m.paquetId} forme="tiroir">
        <div className="grab"></div>
        <h2 className="lv-h2">
          <Icone nom="route" taille={18} />
          <span className="grow">{m.paquetId}</span>
          <span className="pill">{m.zone}</span>
        </h2>
        <p className="lv-s">
          {t(NOM_GENRE[m.genre])} · {moment(m)}
        </p>
        {m.livreur && (
          <div className="lv-livreur mt10">
            <Avatar initiales={m.livreur.initiales} />
            <div className="grow">
              <p className="n">{m.livreur.nom}</p>
              <p className="s">{t(NOM_VEHICULE[m.livreur.vehicule])}</p>
            </div>
            {actif && (
              <button type="button" className="btn primary sm" onClick={appel.ouvrir}>
                <Icone nom="phone" taille={16} />
                {t('Appeler')}
              </button>
            )}
          </div>
        )}
        {m.horsConnexionDepuis && <Retour ton="ambre">{tf('Dernier état connu à {h} : la mission reste en cours ; alerte de perte après {n} h sans signe. Les actions du livreur partiront dans l’ordre au retour du réseau.', { h: h(m.horsConnexionDepuis), n: REGLES.horsConnexionH })}</Retour>}
        {relance && <Retour ton={relance.ton}>{relance.texte}</Retour>}
        <div className="mt10">
          <div className="kv">
            <span className="k">{t('Avancement')}</span>
            <span className="v">
              <Avancement m={m} />
            </span>
          </div>
          <div className="kv">
            <span className="k">{t('Heure limite')}</span>
            <span className="v">
              {h(m.heureLimite)}
              {actif && m.onglet !== 'deposees' && (
                <>
                  {' · '}
                  <Rebours fin={m.heureLimite} echu={t('Heure limite passée')} />
                </>
              )}
            </span>
          </div>
          {m.eta && (
            <div className="kv">
              <span className="k">{t('Arrivée estimée')}</span>
              <span className="v">{h(m.eta)}</span>
            </div>
          )}
          <div className="kv">
            <span className="k">{t('Marge')}</span>
            <span className="v">
              <Marge m={m} />
            </span>
          </div>
          {m.creneau && (
            <div className="kv">
              <span className="k">{t('Créneau annoncé au vendeur')}</span>
              <span className="v">
                {h(m.creneau.debut)} – {h(m.creneau.fin)}
              </span>
            </div>
          )}
          {m.montant !== null && (
            <div className="kv">
              <span className="k">{t('Montant de la mission')}</span>
              <span className="v">
                <Montant n={m.montant} />
              </span>
            </div>
          )}
          {m.versementLe && (
            <div className="kv">
              <span className="k">{t('Versé le')}</span>
              <span className="v">{jour(m.versementLe)}</span>
            </div>
          )}
        </div>
        <ol className="lv-arrets mt14">
          {m.itineraire.map((a, i) => (
            <li key={i} className={(a.fait ? 'fait ' : '') + (a.type === 'relais' ? 'relais' : '')}>
              <span className="pt">{a.fait ? <Icone nom="check" taille={14} /> : i + 1}</span>
              <div>
                <p className="t">{a.type === 'domicile' ? tf('Client à {q}', { q: a.nom }) : a.nom}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="btns mt16">
          {m.onglet === 'a_affecter' && (
            <Link className="btn primary" to={chemin('affectation', { id: m.paquetId })}>
              <Icone nom="user-check" taille={18} />
              {t('Affecter un livreur')}
            </Link>
          )}
          {m.onglet === 'incidents' && (
            <Link className="btn primary" to={chemin('incidents', { id: m.incidentId })}>
              <Icone nom="triangle-alert" taille={18} />
              {t('Décider de l’incident')}
            </Link>
          )}
          {(m.onglet === 'en_cours' || m.onglet === 'incidents') && (
            <Link className="btn secondary" to={chemin('incidents', { transfert: m.paquetId })}>
              <Icone nom="arrow-left-right" taille={18} />
              {t('Transférer')}
            </Link>
          )}
          {m.onglet !== 'a_affecter' && (
            <Link className="btn secondary" to={chemin('preuves', { paquet: m.paquetId })}>
              <Icone nom="camera" taille={18} />
              {t('Preuves')}
            </Link>
          )}
          <Link className="btn ghost" to={chemin('paquet', { id: m.paquetId })}>
            {t('Détail du paquet')}
          </Link>
          {m.onglet === 'closes' && (
            <Link className="btn ghost" to={chemin('reglements')}>
              {t('Règlements')}
            </Link>
          )}
        </div>
        {actif && (
          <>
            <h3 className="sec">{t('Relancer le livreur')}</h3>
            <div className="btns">
              {m.onglet === 'affectees' && (
                <button type="button" className="btn ghost sm" onClick={() => relancer('depart')}>
                  {t('Départ')}
                </button>
              )}
              <button type="button" className="btn ghost sm" onClick={() => relancer('position')}>
                {t('Position')}
              </button>
              <button type="button" className="btn ghost sm" onClick={() => relancer('preuves')}>
                {t('Preuves')}
              </button>
            </div>
          </>
        )}
        <p className="lv-note">
          <Icone nom="shield" taille={16} />
          <span>{t('La position ne s’affiche que pendant la mission active et n’est jamais transmise à un tiers ni exportée.')}</span>
        </p>
      </Feuille>
      {m.livreur && <FeuilleAppel ouverte={appel.ouverte} fermer={appel.fermer} missionId={m.id} livreur={m.livreur.nom} />}
    </>
  )
}


/** entB_marge du prototype : la marge en couleur (vert, ambre, rouge) et la fin estimée dessous. */
function MargeP({ m }: { m: Mission }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const duree = useDuree()
  if (m.margeMin === null) return <span className="t2">—</span>
  const ton = tonMarge(m.margeMin)
  return (
    <>
      <b className={ton === 'rouge' ? 'cr' : ton === 'ambre' ? 'ca' : 'cg'}>{m.margeMin < 0 ? '−' + duree(-m.margeMin) : duree(m.margeMin)}</b>
      <div className="t2">{m.eta ? tf('fin estimée {h}', { h: h(m.eta) }) : m.margeMin < 0 ? t('retard prévisible') : ''}</div>
    </>
  )
}

const ETAT_LIVREUR: Record<Livreur['statut'], [string, 'green' | 'amber' | 'red' | 'ink' | 'acc']> = {
  en_activation: ['Non activé', 'amber'],
  actif: ['Disponible', 'green'],
  en_ligne: ['Disponible', 'green'],
  en_mission: ['En mission', 'acc'],
  suspendu: ['Suspendu', 'red'],
  retire: ['Retiré', 'ink'],
}

export default function Missions() {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const jour = useJour()
  const duree = useDuree()
  const moment = useMoment()
  const large = useLarge()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const onglet = (ONGLETS.find((o) => o.id === params.get('onglet'))?.id ?? 'en_cours') as OngletMissions
  const sel = params.get('mission')
  const badges = useSession().badges
  const tic = useHorloge(REGLES.positionS * 1000)
  const vague = Math.floor(tic / (REGLES.positionS * 1000))
  const liste = useDonnees(() => source.missions.liste(onglet), [onglet, vague])
  const compteurs = useDonnees(() => source.missions.compteurs(), [vague])
  const actives = useDonnees(() => source.missions.liste('en_cours'), [vague])
  const incid = useDonnees(() => source.missions.liste('incidents'), [vague])
  const affectees = useDonnees(() => source.missions.liste('affectees'), [vague])
  const pos = useDonnees(() => source.carte.positions(), [vague])
  const fond = useDonnees(() => source.carte.fond(), [])
  const flotte = useDonnees(() => source.livreurs.liste(), [])
  const detail = useDonnees(() => (sel ? source.missions.mission(sel) : Promise.resolve(null)), [sel, vague])
  const feuille = useFeuille('mission')
  const [q, setQ] = useState('')
  const [zone, setZone] = useState('')
  const [qui, setQui] = useState('')
  // Plein écran de la carte (ordinateur) : l'API du navigateur, sinon un cadre fixe (Échap pour sortir).
  const cadre = useRef<HTMLDivElement>(null)
  const [natif, setNatif] = useState(false)
  const [secours, setSecours] = useState(false)
  const plein = natif || secours
  useEffect(() => {
    const f = () => setNatif(!!cadre.current && document.fullscreenElement === cadre.current)
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])
  useEffect(() => {
    if (!secours) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), setSecours(false))
    window.addEventListener('keydown', f, true)
    return () => window.removeEventListener('keydown', f, true)
  }, [secours])
  const basculerPlein = async () => {
    if (plein) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
      setNatif(false)
      setSecours(false)
      return
    }
    // Le plein écran du navigateur, sinon (refusé ou sans réponse sous 1 s) le cadre fixe.
    const el = cadre.current
    const ok = el?.requestFullscreen ? await Promise.race([el.requestFullscreen().then(() => true, () => false), new Promise<boolean>((r) => setTimeout(() => r(false), 1000))]) : false
    if (ok) setNatif(true)
    else setSecours(true)
  }

  const enMission = useMemo(() => [...(actives.donnees ?? []), ...(incid.donnees ?? [])], [actives.donnees, incid.donnees])
  const retards = enMission.filter((m) => !m.horsConnexionDepuis && m.margeMin !== null && m.margeMin < REGLES.margeAlerteMin)
  const hors = enMission.filter((m) => m.horsConnexionDepuis)
  // Un livreur qui passe hors connexion sonne « attention » (jamais au premier affichage).
  const horsVus = useRef<Set<string> | null>(null)
  const horsCle = actives.donnees ? hors.map((m) => m.id).join(' ') : null
  useEffect(() => {
    if (horsCle === null) return
    const ids = new Set(horsCle.split(' ').filter(Boolean))
    if (horsVus.current && [...ids].some((id) => !horsVus.current!.has(id))) sonner('livreurHorsConnexion')
    horsVus.current = ids
  }, [horsCle])
  const departs = (affectees.donnees ?? []).filter((m) => m.creneau && m.creneau.debut - tic < REGLES.departMin * 60_000)
  const aAffecter = compteurs.donnees?.a_affecter ?? 0
  const marges = enMission.filter((m) => !m.horsConnexionDepuis && m.margeMin !== null).map((m) => m.margeMin!)
  const traces: TraceCarte[] = enMission.map((m) => ({
    missionId: m.id,
    points: m.itineraire.filter((p) => !p.fait),
    depart: pos.donnees?.find((p) => p.missionId === m.id) ?? null,
    ton: m.horsConnexionDepuis ? 'ambre' : tonMarge(m.margeMin),
  }))

  const ouvrir = (id: string, sheet: 'mission' | 'appel' = 'mission') => {
    const p = new URLSearchParams(params)
    p.set('mission', id)
    p.set('sheet', sheet)
    naviguer({ search: p.toString() }, { state: { feuille: true } })
  }
  const choisir = (id: string) => ouvrir(id)
  const versOnglet = (o: OngletMissions) => {
    const p = new URLSearchParams(params)
    p.set('onglet', o)
    p.delete('mission')
    p.delete('sheet')
    return '?' + p.toString()
  }
  const erreur = liste.erreur ?? pos.erreur ?? compteurs.erreur

  // Filtres du tableau (recherche, zone, livreur), appliqués à l'onglet affiché.
  const toutes = liste.donnees ?? []
  const zonesDispo = [...new Set(toutes.map((m) => m.zone))].sort()
  const livreursDispo = [...new Map(toutes.filter((m) => m.livreur).map((m) => [m.livreur!.id, m.livreur!.nom])).entries()]
  const s = q.trim()
  const lignes = toutes.filter((m) => (!zone || m.zone === zone) && (!qui || m.livreur?.id === qui) && correspond(s, m.paquetId, m.livreur?.nom, m.lieu, m.zone))

  // Export CSV de la journée (tous les onglets, sans aucune position : elle n'est jamais exportée).
  const exporterJournee = async () => {
    const parOnglet = await Promise.all(ONGLETS.map((o) => source.missions.liste(o.id)))
    const vues = new Map<string, Mission>()
    for (const m of parOnglet.flat()) if (!vues.has(m.id)) vues.set(m.id, m)
    const ms = [...vues.values()]
    exporterCsv(
      `missions-${new Date(tic).toISOString().slice(0, 10)}.csv`,
      [t('Paquet'), t('Onglet'), t('Genre'), t('Zone'), t('Livreur'), t('Colis'), t('Heure limite'), t('Arrivée estimée'), t('Marge (min)'), t('En ce moment'), t('Clos à'), t('Rémunération (F)')],
      ms.map((m) => [m.paquetId, t(ONGLETS.find((o) => o.id === m.onglet)?.titre ?? m.onglet), t(NOM_GENRE[m.genre]), m.zone, m.livreur?.nom ?? '', m.colisTotal, h(m.heureLimite), m.eta ? h(m.eta) : '', m.margeMin ?? '', m.horsConnexionDepuis ? t('Hors connexion') : moment(m), m.closLe ? h(m.closLe) : '', m.montant ?? '']),
    )
  }

  const acts = (
    <>
      <Exports csv={exporterJournee} libelle={t('Exporter les missions de la journée')} />
      <Link className="btn secondary sm" to={chemin('paquets')}>
        <Icone nom="boxes" taille={16} />
        {t('Paquets disponibles')}
        {badges.paquets > 0 && <span className="compteur alerte">{badges.paquets}</span>}
      </Link>
    </>
  )
  const prenom = (m: Mission) => m.livreur?.nom.split(' ')[0] ?? ''

  // Un seul bandeau, le plus grave (prototype : retard, hors connexion, paquets en attente, erreur).
  const r0 = retards[0]
  const h0 = hors[0]
  const bandeau = erreur ? (
    <BandeauErreur erreur={erreur} relire={() => (liste.relire(), pos.relire(), compteurs.relire())} derniere={liste.derniere} echecs={liste.echecs} />
  ) : r0 ? (
    <Banniere
      ton="red"
      className="fin-retard"
      icone="siren"
      role="status"
      bouton={
        <span className="entb-bbtn">
          <button type="button" className="btn secondary sm" onClick={() => ouvrir(r0.id, 'appel')}>
            <Icone nom="phone" taille={16} />
            {tf('Appeler {n}', { n: prenom(r0) })}
          </button>
          <Link className="btn primary sm" to={chemin('incidents', { transfert: r0.paquetId })}>
            <Icone nom="arrow-right-left" taille={16} />
            {t('Transférer')}
          </Link>
        </span>
      }
    >
      <b>{r0.margeMin! < 0 ? tf('Retard prévisible · {p} : {d} après l’heure limite.', { p: r0.paquetId, d: duree(-r0.margeMin!) }) : tf('Retard prévisible · {p} : {d} de marge seulement.', { p: r0.paquetId, d: duree(r0.margeMin!) })}</b>{' '}
      {tf('{l} : arrivée estimée {e} pour une heure limite à {h}, {n} colis sous garde. Le paquet remonte aussi dans la file de l’opérateur de zone BelivaY.', { l: r0.livreur?.nom ?? '', e: r0.eta ? h(r0.eta) : '—', h: h(r0.heureLimite), n: r0.colisSousGarde })}
    </Banniere>
  ) : h0 ? (
    <Banniere
      ton="amber"
      icone="wifi-off"
      role="status"
      bouton={
        <span className="entb-bbtn">
          <button type="button" className="btn secondary sm" onClick={() => ouvrir(h0.id, 'appel')}>
            <Icone nom="phone" taille={16} />
            {tf('Appeler {n}', { n: prenom(h0) })}
          </button>
        </span>
      }
    >
      <b>{tf('{n} est hors connexion depuis {h}.', { n: h0.livreur?.nom ?? '', h: h(h0.horsConnexionDepuis!) })}</b>{' '}
      {tf('Dernière position connue affichée ; la mission reste « en cours ». Aucune alerte de perte avant {n} heures sans signe ({h}) ; ses preuves partiront au retour du réseau.', { n: REGLES.horsConnexionH, h: h(h0.horsConnexionDepuis! + REGLES.horsConnexionH * 3_600_000) })}
    </Banniere>
  ) : badges.paquets > 0 ? (
    <Banniere
      ton="acc"
      icone="boxes"
      role="status"
      bouton={
        <span className="entb-bbtn">
          <Link className="btn primary sm" to={chemin('paquets')}>
            <Icone nom="boxes" taille={16} />
            {t('Voir les paquets')}
          </Link>
        </span>
      }
    >
      <b>{badges.paquets === 1 ? t('1 paquet publié dans vos zones attend une réponse.') : tf('{n} paquets publiés dans vos zones attendent une réponse.', { n: badges.paquets })}</b>
    </Banniere>
  ) : null

  const pqCellule = (m: Mission, sous: string) => (
    <>
      <button type="button" className="entb-pqid lien-pq" onClick={() => choisir(m.id)}>
        {m.paquetId}
      </button>
      <div className="t2">{sous}</div>
    </>
  )
  const sousPaquet = (m: Mission) => `${t(NOM_GENRE[m.genre])} · ${m.zone} · ${m.colisTotal === 1 ? t('1 colis') : tf('{n} colis', { n: m.colisTotal })}`
  const livreurCellule = (m: Mission) => (m.livreur ? <Qui nom={m.livreur.nom} sous={t(NOM_VEHICULE[m.livreur.vehicule])} av={m.livreur.initiales} /> : <Pill ton="or" sm dot>{t('À affecter')}</Pill>)

  const cols: Colonne<Mission>[] = [
    { k: 'p', t: t('Paquet'), main: true, rendu: (m) => pqCellule(m, sousPaquet(m)) },
    { k: 'l', t: t('Livreur'), rendu: livreurCellule },
    { k: 'a', t: t('Avancement'), rendu: (m) => <Progres m={m} /> },
    {
      k: 'm',
      t: t('En ce moment'),
      rendu: (m) =>
        m.horsConnexionDepuis ? (
          <span>
            <b>{tf('Hors connexion depuis {h}', { h: h(m.horsConnexionDepuis) })}</b>
            <div className="t2">{tf('dernière position connue : {l}', { l: m.lieu ?? '—' })}</div>
          </span>
        ) : m.creneau && (m.moment === 'non_parti' || m.onglet === 'affectees') ? (
          <span>
            <b>{tf('Créneau annoncé {a} – {b}', { a: h(m.creneau.debut), b: h(m.creneau.fin) })}</b>
            <div className="t2">{moment(m)}</div>
          </span>
        ) : (
          <span>
            <b className={m.margeMin !== null && m.margeMin < 0 ? 'cr' : undefined}>{moment(m)}</b>
            {m.eta && <div className="t2">{tf('arrivée vers {h}', { h: h(m.eta) })}</div>}
          </span>
        ),
    },
    {
      k: 'h',
      t: t('Heure limite'),
      cls: 'r',
      rendu: (m) => (
        <>
          <b>{h(m.heureLimite)}</b>
          {m.onglet !== 'deposees' && (
            <div>
              <Rebours fin={m.heureLimite} echu={t('Heure limite passée')} />
            </div>
          )}
        </>
      ),
    },
    { k: 'g', t: t('Marge'), cls: 'r', rendu: (m) => (m.horsConnexionDepuis ? <Pill ton="amber" sm icone="wifi-off">{t('Hors connexion')}</Pill> : <MargeP m={m} />) },
    {
      k: 'o',
      t: <span className="vh">{t('Ouvrir')}</span>,
      l: '',
      cls: 'r',
      hideM: true,
      rendu: (m) => (
        <button type="button" className="entb-open" onClick={() => choisir(m.id)} aria-label={tf('Ouvrir la mission {p}', { p: m.paquetId })}>
          <Icone nom="chevron-right" taille={18} />
        </button>
      ),
    },
  ]
  const colsCloses: Colonne<Mission>[] = [
    { k: 'p', t: t('Paquet'), main: true, rendu: (m) => pqCellule(m, `${t(NOM_GENRE[m.genre])} · ${m.zone}`) },
    { k: 'l', t: t('Livreur'), rendu: livreurCellule },
    { k: 'c', t: t('Colis'), rendu: (m) => (m.colisTotal === 1 ? t('1 colis') : tf('{n} colis', { n: m.colisTotal })) },
    {
      k: 'd',
      t: t('Déposé ou remis'),
      rendu: (m) => (
        <span>
          <b>{m.genre === 'domicile' ? tf('Remis à {h}', { h: h(m.closLe ?? m.misAJour) }) : tf('Déposés à {h}', { h: h(m.closLe ?? m.misAJour) })}</b>
          {m.lieu && <div className="t2">{m.lieu}</div>}
        </span>
      ),
    },
    { k: 'x', t: t('Clos'), rendu: (m) => <St t={m.closLe ? tf('Preuves complètes · {h}', { h: h(m.closLe) }) : t('Preuves complètes')} ton="green" /> },
    { k: 'r', t: t('Rémunération'), cls: 'r', rendu: (m) => (m.montant !== null ? <b><Montant n={m.montant} /></b> : <span className="t2">—</span>) },
    { k: 'v', t: t('Paiement'), rendu: (m) => <span className="t13">{m.versementLe ? jour(m.versementLe) : '—'}</span> },
  ]
  const totalCloses = lignes.reduce((x, m) => x + (m.montant ?? 0), 0)
  const montantsVus = lignes.some((m) => m.montant !== null)
  const versement = lignes.find((m) => m.versementLe)?.versementLe ?? null

  const outils = (
    <>
      <Recherche q={q} setQ={setQ} placeholder={t('Paquet, livreur, boutique…')} aria={t('Rechercher une mission')} />
      <label className={'flt' + (zone ? ' on' : '')}>
        <Icone nom="map-pin" taille={15} />
        <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label={t('Zone')}>
          <option value="">{t('Zone : toutes')}</option>
          {zonesDispo.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>
      <label className={'flt' + (qui ? ' on' : '')}>
        <select value={qui} onChange={(e) => setQui(e.target.value)} aria-label={t('Livreur')}>
          <option value="">{t('Livreur')}</option>
          {livreursDispo.map(([id, n]) => (
            <option key={id} value={id}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <span className="sp"></span>
      {onglet === 'closes' ? (
        <span className="lock">
          <Icone nom="banknote" taille={15} /> {t('Validés au plus tard jeudi 23 h 59 → payés le vendredi')}
        </span>
      ) : (
        <span className="lock">
          <Icone nom="radio" taille={15} /> {tf('Temps réel · mis à jour à {h}', { h: h(tic) })}
        </span>
      )}
    </>
  )
  const vide = (
    <VideP
      icone={onglet === 'closes' ? 'archive' : 'route'}
      t={t('Aucune mission dans cet onglet')}
      s={t(s || zone || qui ? 'Aucune mission ne répond à ces filtres.' : onglet === 'a_affecter' ? 'Chaque paquet accepté a déjà son livreur.' : onglet === 'incidents' ? 'Aucun incident bloquant en cours.' : 'Les paquets acceptés et affectés apparaissent ici, onglet par onglet, jusqu’à leur clôture.')}
    >
      <div className="btns" style={{ maxWidth: 420, margin: '12px auto 0' }}>
        <Link className="btn primary" to={chemin('paquets')}>
          <Icone nom="boxes" taille={18} />
          {t('Voir les paquets disponibles')}
        </Link>
      </div>
    </VideP>
  )

  // Livreurs (entB_fleetList) : en mission (position suivie), affectés (pas encore partis), puis le reste de la flotte.
  const positions = pos.donnees ?? []
  const affectes = affectees.donnees ?? []
  const vus = new Set<string>()
  const rangs: { id: string; nom: string; init: string; sous: string; pill: ReactNode; mission?: string }[] = []
  for (const p of positions) {
    vus.add(p.livreurId)
    rangs.push({
      id: p.livreurId,
      nom: p.nom,
      init: p.initiales,
      sous: p.etat === 'hors_connexion' ? tf('{p} · dernière position {h}', { p: p.paquetId, h: h(p.le) }) : tf('{p} · position {h}', { p: p.paquetId, h: h(p.le) }),
      pill: p.etat === 'hors_connexion' ? <Pill ton="amber" sm icone="wifi-off">{t('Hors connexion')}</Pill> : <Pill ton="acc" sm dot>{t('En mission')}</Pill>,
      mission: p.missionId,
    })
  }
  for (const m of affectes) {
    if (!m.livreur || vus.has(m.livreur.id)) continue
    vus.add(m.livreur.id)
    rangs.push({ id: m.livreur.id, nom: m.livreur.nom, init: m.livreur.initiales, sous: m.creneau ? tf('{p} · créneau {a} – {b}', { p: m.paquetId, a: h(m.creneau.debut), b: h(m.creneau.fin) }) : m.paquetId, pill: <Pill ton="ink" sm dot>{t('Affecté')}</Pill>, mission: m.id })
  }
  for (const l of flotte.donnees ?? []) {
    if (vus.has(l.id) || l.statut === 'retire') continue
    const [e, ton] = ETAT_LIVREUR[l.statut]
    rangs.push({
      id: l.id,
      nom: l.nom,
      init: l.initiales,
      sous: l.statut === 'en_activation' ? t('En activation : pas encore proposé') : l.statut === 'suspendu' ? t('Suspendu : jamais proposé') : t('Disponible · hors mission : position non suivie'),
      pill: <Pill ton={ton} sm dot={ton !== 'amber'}>{t(e)}</Pill>,
    })
  }

  const enMissionN = positions.length
  // Heure de la donnée : la position la plus récente reçue d'un livreur joignable.
  const recues = positions.filter((p) => p.etat !== 'hors_connexion').map((p) => p.le)
  const derniere = recues.length ? Math.max(...recues) : null
  const ancienne = derniere !== null && tic - derniere > 3 * REGLES.positionS * 1000
  return (
    <Ecran route="missions" actions={large ? acts : undefined}>
      <Px>
        {bandeau}
        <Tete route="missions" titre={t('Missions et carte')} />
        <Choix
          forme="tabs"
          aria={t('Onglets des missions')}
          actif={onglet}
          items={ONGLETS.map((o) => {
            const n = compteurs.donnees?.[o.id] ?? 0
            return { id: o.id, t: t(o.titre), n: n > 0 ? n : null, to: versOnglet(o.id) }
          })}
        />
        <div className="entb-t" style={{ marginTop: 16 }}>
          {!liste.donnees ? (
            <div className="dt-wrap" style={{ padding: 16 }}>
              <Chargement n={3} hauteur={56} />
            </div>
          ) : onglet === 'closes' ? (
            <Table
              cols={colsCloses}
              rows={lignes}
              cle={(m) => m.id}
              ligneCls={(m) => (sel === m.id ? 'sel' : undefined)}
              legende={t('Missions closes')}
              outils={outils}
              vide={vide}
              pied={
                lignes.length > 0 ? (
                  <>
                    <span>
                      {lignes.length === 1 ? t('1 paquet clos') : tf('{n} paquets clos', { n: lignes.length })}
                      {montantsVus && <> · {versement ? tf('{m} F à verser le {j}', { m: F(totalCloses), j: jour(versement) }) : tf('{m} F à verser', { m: F(totalCloses) })}</>}
                    </span>
                    <Link className="b8 cor" to={chemin('reglements')}>
                      {t('Règlements')} <Icone nom="chevron-right" taille={14} />
                    </Link>
                  </>
                ) : undefined
              }
            />
          ) : (
            <Table
              cols={cols}
              rows={lignes}
              cle={(m) => m.id}
              ligneCls={(m) => (m.horsConnexionDepuis ? 'warn' : m.margeMin !== null && tonMarge(m.margeMin) === 'rouge' ? 'bad' : sel === m.id ? 'sel' : undefined)}
              legende={t(ONGLETS.find((o) => o.id === onglet)!.titre)}
              outils={outils}
              vide={vide}
              pied={
                lignes.length > 0 ? (
                  <>
                    <span>{t('Marge = heure limite − fin estimée (itinéraire, arrêts compris)')}</span>
                    <span>{retards.length === 0 ? t('Aucune marge négative') : retards.length === 1 ? t('1 mission en retard prévisible') : tf('{n} missions en retard prévisible', { n: retards.length })}</span>
                  </>
                ) : undefined
              }
            />
          )}
        </div>
        {/* Téléphone : la liste d'abord ; l'export de la journée vient dessous (Paquets disponibles est dans la barre du bas). */}
        {!large && (
          <div className="mt10">
            <Exports csv={exporterJournee} libelle={t('Exporter les missions de la journée')} />
          </div>
        )}

        <div className="g g21">
          <div>
            <Panel
              titre={t('Carte de la flotte')}
              icone="map"
              droite={
                <span className="lv-carte-d">
                  <Pill ton="acc" sm dot>{enMissionN === 0 ? t('Aucun livreur en mission') : enMissionN === 1 ? t('1 livreur en mission') : tf('{n} livreurs en mission', { n: enMissionN })}</Pill>
                  {large && (
                    <button type="button" className="btn ghost sm" onClick={basculerPlein} aria-pressed={plein}>
                      <Icone nom={plein ? 'x' : 'scan'} taille={16} />
                      {plein ? t('Quitter le plein écran') : t('Plein écran')}
                    </button>
                  )}
                </span>
              }
            >
              <div ref={cadre} className={'lv-carte-cadre' + (secours ? ' lv-plein' : '')} role={plein ? 'dialog' : undefined} aria-label={plein ? t('Carte de la flotte') : undefined}>
              {plein && (
                <div className="lv-plein-t">
                  <b className="grow">{t('Carte de la flotte')}</b>
                  <button type="button" className="btn secondary sm" onClick={basculerPlein}>
                    <Icone nom="x" taille={16} />
                    {t('Quitter le plein écran')}
                  </button>
                </div>
              )}
              {fond.donnees && pos.donnees ? (
                <Carte
                  zones={fond.donnees.zones}
                  lieux={fond.donnees.lieux}
                  positions={pos.donnees}
                  traces={traces}
                  selection={sel}
                  choisir={choisir}
                  hauteur={plein ? 4000 : 640}
                  dessus={enMissionN === 0 ? <VideP icone="map" t={t('Aucune mission en cours')} s={t('Les livreurs apparaissent ici pendant leurs missions actives seulement.')} /> : undefined}
                />
              ) : (
                <Chargement n={1} hauteur={320} />
              )}
              <div className={'lv-maj' + (ancienne ? ' ancienne' : '')} role="status">
                <Icone nom={ancienne ? 'clock-alert' : 'radio'} taille={15} />
                <span className="grow">
                  {derniere ? tf('Dernière position reçue à {h}', { h: h(derniere) }) : t('Aucune position reçue pour le moment')}
                  {ancienne && <b> · {t('donnée ancienne : vérifiez le réseau du livreur')}</b>}
                </span>
                <button type="button" className="btn ghost sm" onClick={() => pos.relire()}>
                  <Icone nom="refresh-cw" taille={16} />
                  {t('Actualiser')}
                </button>
              </div>
              </div>
              <Hint icone="radio">{tf('Position mise à jour toutes les {s} s, du départ de la tournée à sa clôture.', { s: REGLES.positionS })}</Hint>
            </Panel>
          </div>
          <div>
            <Panel titre={t('Alertes')} icone="bell" className="lv-etroit">
              {retards.map((m) => (
                <Li key={'r' + m.id} icone="siren" ton="red" t={m.margeMin! < 0 ? tf('Retard prévisible · {d} après l’heure limite', { d: duree(-m.margeMin!) }) : tf('Marge de {d} seulement', { d: duree(m.margeMin!) })} s={`${m.paquetId} · ${m.livreur?.nom ?? ''}`} onClick={() => choisir(m.id)} />
              ))}
              {hors.map((m) => (
                <Li key={'h' + m.id} icone="wifi-off" ton="amber" t={tf('{n} hors connexion', { n: m.livreur?.nom ?? '' })} s={tf('depuis {h} · alerte de perte à {p} sans signe', { h: h(m.horsConnexionDepuis!), p: h(m.horsConnexionDepuis! + REGLES.horsConnexionH * 3_600_000) })} onClick={() => choisir(m.id)} />
              ))}
              {departs.map((m) => (
                <Li key={'d' + m.id} icone="alarm-clock" ton="or" t={tf('Départ attendu · {n}', { n: m.livreur?.nom ?? '' })} s={tf('créneau du vendeur à {h}', { h: h(m.creneau!.debut) })} onClick={() => choisir(m.id)} />
              ))}
              {aAffecter > 0 && <Li icone="user-plus" ton="or" t={aAffecter === 1 ? t('1 paquet à affecter') : tf('{n} paquets à affecter', { n: aAffecter })} s={tf('alerte {m} minutes après l’acceptation', { m: REGLES.nonAffecteMin })} to={chemin('missions', { onglet: 'a_affecter' })} />}
              {retards.length === 0 ? (
                <>
                  <Li icone="circle-check" ton="green" t={t('Aucun retard prévisible')} s={marges.length === 0 ? t('aucune mission active') : marges.length === 1 ? tf('marge de {a}', { a: duree(marges[0]) }) : tf('marges de {a} à {b}', { a: duree(Math.min(...marges)), b: duree(Math.max(...marges)) })} />
                  <Li icone="bell-ring" ton="or" t={t('Alerte dès qu’une marge devient négative')} s={t('la mission passe en rouge et remonte chez l’opérateur de zone')} />
                </>
              ) : (
                <Li icone="eye" ton="ink" t={t('Visible par l’opérateur de zone')} s={t('Il vous appelle au besoin ; il ne contacte jamais le livreur directement.')} />
              )}
            </Panel>
            <Panel titre={t('Livreurs')} icone="users" a={{ t: t('Flotte'), to: chemin('flotte') }} className="lv-etroit lv-livs" style={{ marginTop: 16 }}>
              {rangs.length === 0 && !flotte.donnees ? (
                <Chargement n={2} hauteur={48} />
              ) : (
                rangs.map((r) => <Li key={r.id} gauche={<Avatar initiales={r.init} />} t={r.nom} s={r.sous} droite={r.pill} onClick={r.mission ? () => choisir(r.mission!) : undefined} />)
              )}
              <Hint icone="eye-off">{t('La position d’un livreur n’est visible que pendant une mission active ; elle n’est jamais donnée à un tiers.')}</Hint>
            </Panel>
          </div>
        </div>
      </Px>
      <BarrePouce>
        <Link className="btn primary" to={versOnglet('a_affecter')}>
          <Icone nom="user-plus" taille={18} />
          <span>{aAffecter > 0 ? tf('À affecter ({n})', { n: aAffecter }) : t('À affecter')}</span>
        </Link>
        <Link className="btn secondary" to={chemin('incidents')}>
          <Icone nom="triangle-alert" taille={18} />
          <span>{(compteurs.donnees?.incidents ?? 0) > 0 ? tf('Incidents ({n})', { n: compteurs.donnees!.incidents }) : t('Incidents')}</span>
        </Link>
      </BarrePouce>
      <FeuilleMission m={detail.donnees} ouverte={feuille.ouverte} fermer={feuille.fermer} />
    </Ecran>
  )
}
