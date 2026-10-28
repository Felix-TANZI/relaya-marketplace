// ENT-P05 · Flotte : les livreurs. Compteurs égaux à la liste filtrée (ENT-RG-R64 : actifs, en activation, en ligne,
// suspendus ; toucher un compteur filtre la liste), recherche par nom ou plaque, filtres zone, statut, véhicule dans
// l'adresse, statuts en temps réel (la liste se relit à chaque événement : ENT-RG-R62). Chaque ligne : livreur
// partenaire (ENT-P05R-02), véhicule et plaque, capacité, zones, statut et son détail (suspension BelivaY avec niveau,
// motif et fin : ENT-P05R-03 ; retrait demandé), alertes, certification, Trust Score et palier (de ses livreurs
// seulement : ENT-P05R-04). Filtre « en tournée » : cartes de mission (avancement, position du moment, heure limite,
// marge). Gestes de fond dans la fiche (ENT-P06). Droits : propriétaire et répartiteur gèrent, le comptable lit.
// DP-66 : file « Départs » (« ?statut=departs » : demandes ouvertes, préavis, conditions, puis départs clos), repère
// « Départ demandé » et « Absence prévenue » sur chaque livreur ; propriétaire et répartiteur seulement. DP-67 : départs
// clos visibles DEPART-VISIBLE-J jours ; chacun s'ouvre (« sheet=depart&depart= ») : clôture, kit, dernier versement et
// « Marquer le versement Mobile Money fait » (propriétaire).
import { useMemo } from 'react'
import { Feuille } from '@client/composants/Feuille'
import { Link, useSearchParams } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { NOM_PALIER } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { DemandeDepart, Livreur, StatutLivreur } from '../../donnees/domaines/livreurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { PARAMETRES_FLOTTE, palierLivreur } from '../../calculs/flotte'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut, useSession } from '../../session'
import { exporterCsv, Hint, Kv, Li, Note, Panel, Pill, Rangee, Table, type Ton, Vide } from '../../composants/prototype'
import { Chargement, ErreurLecture, ICONE_VEHICULE, NOM_VEHICULE, useDates, useFeuilleParams } from '../ENT-03/outils'
import { DetailDepartClos, NOM_MANQUE, NOM_MOTIF, etatDepart, useJoursAbsence, veilleDernierJour } from './Depart'
import { Ecran } from '../../composants/coque'

const P = PARAMETRES_FLOTTE
export const NOM_STATUT: Record<StatutLivreur, string> = { en_activation: 'En activation', actif: 'Actif', en_ligne: 'En ligne', en_mission: 'En tournée', suspendu: 'Suspendu', retire: 'Retiré' }
export const NOM_ALERTE: Record<string, string> = { sans_vehicule: 'Aucun véhicule rattaché', vehicule_expire: 'Assurance du véhicule expirée', vehicule_panne: 'Véhicule indisponible', piece: 'Pièce à renouveler', certification: 'Certification à renouveler' }
const FILTRES: { id: string; titre: string; garde: (l: Livreur) => boolean }[] = [
  { id: 'actifs', titre: 'Actifs', garde: (l) => ['actif', 'en_ligne', 'en_mission'].includes(l.statut) },
  { id: 'en_activation', titre: 'En activation', garde: (l) => l.statut === 'en_activation' },
  { id: 'en_ligne', titre: 'En ligne maintenant', garde: (l) => l.statut === 'en_ligne' || l.statut === 'en_mission' },
  { id: 'en_tournee', titre: 'En tournée', garde: (l) => l.statut === 'en_mission' },
  { id: 'suspendus', titre: 'Suspendus', garde: (l) => l.statut === 'suspendu' },
]

export default function Flotte() {
  const { t, tf } = usePreferences()
  const { date, heure, duree } = useDates()
  const maintenant = useHorloge()
  const peut = usePeut(['proprietaire', 'repartiteur'])
  const [params, setParams] = useSearchParams()
  const livreurs = useLecture(() => source.livreurs.liste())
  // Pièces à contrôler de la flotte (propriétaire et répartiteur) : bandeau vers la page « Contrôle des pièces ».
  const controles = useLecture(() => (peut ? source.livreurs.controles() : Promise.resolve([])), [peut])
  const zones = useLecture(() => source.zones.zones())
  // Demandes des livreurs (DP-66) : départs et absences prévenues.
  const departs = useLecture(() => (peut ? source.livreurs.departs() : Promise.resolve([])), [peut])
  const feuilleDepart = useFeuilleParams('depart', ['depart'])
  const departOuvert = (departs.donnees ?? []).find((d) => d.id === feuilleDepart.param('depart') && d.etat === 'close') ?? null
  const absences = useLecture(() => (peut ? source.livreurs.absences() : Promise.resolve([])), [peut])
  const joursAbsence = useJoursAbsence()
  const enTournee = params.get('statut') === 'en_tournee'
  const missions = useLecture(() => (enTournee ? source.missions.liste('en_cours') : Promise.resolve([])), [enTournee])
  const positions = useLecture(() => (enTournee ? source.carte.positions() : Promise.resolve([])), [enTournee])
  const q = params.get('q') ?? ''
  const zone = params.get('zone') ?? ''
  const statut = params.get('statut') ?? ''
  const vehicule = params.get('vehicule') ?? ''
  const poser = (k: string, v: string) =>
    setParams(
      () => {
        // L'adresse réelle (deux gestes rapides : la recherche ne remet pas un filtre que l'on vient d'enlever).
        const p = new URLSearchParams(window.location.search)
        if (v) p.set(k, v)
        else p.delete(k)
        return p
      },
      { replace: true },
    )
  const ls = livreurs.donnees
  // Base des compteurs : la liste avec la recherche et les filtres zone et véhicule (le statut est ce que les compteurs choisissent).
  const base = useMemo(
    () =>
      (ls ?? []).filter(
        (l) =>
          (!zone || l.zones.includes(zone)) &&
          (!vehicule || l.vehicule === vehicule) &&
          (!q || [l.nom, l.plaque ?? ''].some((x) => x.toLowerCase().replace(/\s/g, '').includes(q.toLowerCase().replace(/\s/g, '')))),
      ),
    [ls, zone, vehicule, q],
  )
  const ouverts = (departs.donnees ?? []).filter((d) => d.etat === 'demande')
  const departDe = (id: string) => ouverts.find((d) => d.livreur.id === id)
  const absencesDe = (id: string) => (absences.donnees ?? []).filter((a) => a.livreur.id === id)
  const nonVues = (absences.donnees ?? []).filter((a) => a.vueLe === null)
  const vueDeparts = statut === 'departs' && peut
  const filtreStatut = vueDeparts ? { id: 'departs', titre: 'Départs', garde: (l: Livreur) => !!departDe(l.id) } : FILTRES.find((f) => f.id === statut)
  // Tri (M5) : nom, Trust Score, activité du jour, en tournée d'abord ; gardé dans l'adresse (« ?tri=score »).
  const tri = (['nom', 'score', 'activite', 'tournee'] as const).find((x) => x === params.get('tri')) ?? 'nom'
  const ordre = (a: Livreur, b: Livreur) =>
    tri === 'score'
      ? (b.trustScore ?? -1) - (a.trustScore ?? -1)
      : tri === 'activite'
        ? b.missionsDuJour - a.missionsDuJour
        : tri === 'tournee'
          ? Number(b.statut === 'en_mission') - Number(a.statut === 'en_mission')
          : 0
  const visibles = [...(filtreStatut ? base.filter(filtreStatut.garde) : base)].sort((a, b) => ordre(a, b) || a.nom.localeCompare(b.nom, 'fr'))
  const exporter = () =>
    exporterCsv('flotte.csv', [t('Livreur'), t('Statut'), t('Véhicule'), t('Plaque'), t('Zones'), t('Capacité (colis par jour)'), t('Trust Score'), t('Missions du jour')], visibles.map((l) => [l.nom, t(NOM_STATUT[l.statut]), t(NOM_VEHICULE[l.vehicule]), l.plaque ?? '', l.zones.join(' '), l.capacite ?? '', l.trustScore ?? '', l.missionsDuJour]))
  const alertes = (ls ?? []).filter((l) => (l.alertes ?? []).length > 0)
  const nom = useSession().entreprise?.nom ?? ''
  const PILL_STATUT: Record<StatutLivreur, Ton> = { en_activation: 'amber', actif: 'ink', en_ligne: 'green', en_mission: 'acc', suspendu: 'red', retire: 'ink' }
  const actions = (
    <>
      <Link className="btn secondary" to={chemin('vehicules')}>
        <Icone nom="bike" taille={18} />
        <span>{t('Véhicules')}</span>
      </Link>
      {peut && (
        <Link className="btn primary" to={chemin('ajout')}>
          <Icone nom="user-plus" taille={18} />
          <span>{t('Ajouter un livreur')}</span>
        </Link>
      )}
    </>
  )
  const KPI: Record<string, { icone: string; fond?: string; iton?: string; detail: (n: number) => string }> = {
    actifs: { icone: 'user-round-check', fond: 'night', detail: () => t('Pièces, certification et approbation valides') },
    en_activation: { icone: 'hourglass', iton: 'amber', detail: (n) => (n ? t('Pièces ou certification en cours') : t('Aucun livreur en activation')) },
    en_ligne: { icone: 'radio', iton: 'green', detail: () => t('Disponibles ou en tournée') },
    suspendus: {
      icone: 'ban',
      iton: 'red',
      detail: (n) => {
        const parBelivay = base.filter((l) => l.statut === 'suspendu' && l.suspension?.par === 'belivay').length
        return !n ? t('Aucune suspension en cours') : parBelivay === n ? t('Décidée par BelivaY, non levable ici') : parBelivay ? tf('{e} par votre entreprise · {b} par BelivaY', { e: n - parBelivay, b: parBelivay }) : t('Décidée par votre entreprise, levable depuis la fiche')
      },
    },
  }
  const choixFiltre = (cle: string, valeur: string, libelle: string, icone: string, options: [string, string][]) => (
    <label className={'flt' + (valeur ? ' on' : '')}>
      <Icone nom={icone} taille={15} />
      <span className="vh">{libelle}</span>
      <select value={valeur} onChange={(e) => poser(cle, e.target.value)} aria-label={libelle}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <Ecran
      route="flotte"
      actions={actions}
      fixes={
        <Feuille ouverte={feuilleDepart.ouverte && peut && !!departOuvert} fermer={feuilleDepart.fermer} titre={t('Départ clôturé')}>
          {departOuvert && <DetailDepartClos d={departOuvert} relire={departs.relire} />}
        </Feuille>
      }
    >
      {livreurs.erreur && <ErreurLecture erreur={livreurs.erreur} relire={livreurs.relire} lu={ls ? maintenant : null} />}
      {!ls ? (
        !livreurs.erreur && <Chargement lignes={4} />
      ) : ls.length === 0 ? (
        <div className="g g21" style={{ alignItems: 'start' }}>
          <Panel>
            <Vide
              icone="users"
              t={t('Ajoutez votre premier livreur')}
              s={t('Saisissez son nom, son téléphone +237, son véhicule et ses zones : il reçoit une invitation par SMS, envoie lui-même ses pièces et passe la certification BelivaY. Vous l’approuvez ensuite.')}
              action={
                peut ? (
                  <Link className="btn primary" to={chemin('ajout')}>
                    <Icone nom="user-plus" taille={18} />
                    <span>{t('Ajouter un livreur')}</span>
                  </Link>
                ) : undefined
              }
            />
          </Panel>
          <Panel titre={t('Avant d’inviter')} icone="list-checks">
            {[t('Le livreur a 18 ans révolus et un permis adapté à son véhicule'), t('Il a un smartphone avec appareil photo et GPS'), t('Votre entreprise reste son employeur : contrat, CNPS, assurances'), t('Un compte par personne : jamais de compte prêté')].map((c) => (
              <div key={c} className="check">
                <span className="cbx on">
                  <Icone nom="check" taille={14} trait={3} />
                </span>
                <span className="grow">{c}</span>
              </div>
            ))}
          </Panel>
        </div>
      ) : (
        <>
          <div className="g g4 e-segs" role="group" aria-label={t('Compteurs de la flotte')}>
            {FILTRES.filter((f) => f.id !== 'en_tournee').map((f) => {
              const n = base.filter(f.garde).length
              const on = statut === f.id
              const k = KPI[f.id]
              return (
                <button key={f.id} type="button" className={'kpi e-kpi-b' + (k.fond ? ' ' + k.fond : '') + (on ? ' on' : '')} aria-pressed={on} onClick={() => poser('statut', on ? '' : f.id)}>
                  <span className={'i' + (k.iton && (n || f.id === 'en_ligne') ? ' ' + k.iton : '')}>
                    <Icone nom={k.icone} taille={18} />
                  </span>
                  <span className="k">{t(f.titre)}</span>
                  <span className="v">{n}</span>
                  <span className="s">{k.detail(n)}</span>
                </button>
              )
            })}
          </div>
          {(controles.donnees ?? []).length > 0 && (
            <div className="dk-banner amber mt10" role="status">
              <Icone nom="id-card" taille={20} />
              <div className="grow">
                {tf('{a} pièce(s) à contrôler · {e} expirée(s) ou bientôt · {r} à renvoyer par le livreur', {
                  a: (controles.donnees ?? []).filter((x) => x.raison === 'a_controler').length,
                  e: (controles.donnees ?? []).filter((x) => x.raison === 'expiree' || x.raison === 'expire_bientot').length,
                  r: (controles.donnees ?? []).filter((x) => x.raison === 'refusee' || x.raison === 'manquante').length,
                })}
              </div>
              <Link className="btn sm primary" to={chemin('pieces')}>
                <Icone nom="eye" taille={16} />
                <span>{t('Contrôler les pièces')}</span>
              </Link>
            </div>
          )}
          {peut && !vueDeparts && (ouverts.length > 0 || nonVues.length > 0) && (
            <div className="dk-banner amber mt10" role="status">
              <Icone nom="log-out" taille={20} />
              <div className="grow">{tf('{d} départ(s) demandé(s) · {a} absence(s) prévenue(s) pas encore vue(s)', { d: ouverts.length, a: nonVues.length })}</div>
              <button type="button" className="btn sm primary" onClick={() => poser('statut', 'departs')}>
                <Icone nom="eye" taille={16} />
                <span>{t('Voir les départs')}</span>
              </button>
            </div>
          )}
          {vueDeparts && <FileDeparts departs={departs.donnees ?? []} clos={params.get('clos')} ouvrir={(id) => feuilleDepart.ouvrir({ depart: id })} />}
          {filtreStatut && (
            <Note ton="acc" icone="filter">
              {tf('Filtre « {f} » : les compteurs correspondent exactement à la liste affichée, {n} livreur(s) sur {t}.', { f: t(filtreStatut.titre), n: visibles.length, t: ls.length })}
            </Note>
          )}

          <div style={{ marginTop: 16 }}>
            <Table
              legende={t('Livreurs')}
              outils={
                <>
                  <label className="srch">
                    <Icone nom="search" taille={16} />
                    <input type="search" value={q} onChange={(e) => poser('q', e.target.value)} placeholder={t('Nom, plaque…')} aria-label={t('Chercher un livreur par nom ou plaque')} />
                  </label>
                  <div className="e-filtres">
                  {choixFiltre('zone', zone, t('Zone'), 'map-pin', [['', t('Zone : toutes')], ...(zones.donnees ?? []).map((z) => [z.code, `${z.code} · ${z.nom}`] as [string, string])])}
                  {choixFiltre('statut', statut, t('Statut'), 'circle-dot', [['', t('Statut : tous')], ...FILTRES.map((f) => [f.id, t(f.titre)] as [string, string]), ...(peut ? [['departs', t('Départs')] as [string, string]] : [])])}
                  {choixFiltre('vehicule', vehicule, t('Véhicule'), 'bike', [['', t('Véhicule : tous')], ...['moto', 'tricycle', 'voiture', 'camionnette'].map((v) => [v, t(NOM_VEHICULE[v])] as [string, string])])}
                  {choixFiltre('tri', tri === 'nom' ? '' : tri, t('Trier'), 'arrow-down-up', [['', t('Tri : nom')], ['score', t('Tri : Trust Score')], ['activite', t('Tri : missions du jour')], ['tournee', t('Tri : en tournée d’abord')]])}
                  <button type="button" className="btn sm ghost" onClick={exporter} disabled={!visibles.length}>
                    <Icone nom="download" taille={16} />
                    <span>{t('Exporter (CSV)')}</span>
                  </button>
                  </div>
                  <span className="sp"></span>
                  <span className="lock" title={t('La liste se met à jour à chaque changement de statut')}>
                    <Icone nom="radio" taille={14} />
                    {tf('Statuts en temps réel · {h}', { h: heure(maintenant) })}
                  </span>
                </>
              }
              pied={
                <>
                  <span>{tf('{n} livreur(s) · tous « livreur partenaire » au lancement', { n: visibles.length })}</span>
                  <Link to={chemin('planning')}>{t('Planning des livreurs')}</Link>
                  <span>{tf('{nom} ne voit que le Trust Score de ses propres livreurs', { nom })}</span>
                </>
              }
              cle={(l) => l.id}
              ligneCls={(l) => (l.statut === 'suspendu' ? 'bad' : (l.alertes ?? []).length ? 'warn' : l.statut === 'en_mission' ? 'hot' : '')}
              rows={visibles}
              cols={[
                {
                  k: 'who',
                  t: t('Livreur'),
                  main: true,
                  rendu: (l) => (
                    <Link to={chemin('livreur', { id: l.id })} className="who" style={{ color: 'inherit' }}>
                      <span className="av">{l.initiales}</span>
                      <span>
                        <b>{l.nom}</b>
                        <span>{t('Livreur partenaire')}</span>
                      </span>
                    </Link>
                  ),
                },
                {
                  k: 'veh',
                  t: t('Véhicule'),
                  rendu: (l) => (
                    <div className="entA-c">
                      <span className="entA-veh">
                        <span className="vi">
                          <Icone nom={ICONE_VEHICULE[l.vehicule]} taille={22} />
                        </span>
                        <span>
                          <b style={{ display: 'block', fontSize: '.84rem' }}>{t(NOM_VEHICULE[l.vehicule])}</b>
                          <span className="t12 c3 mono" style={{ display: 'block', whiteSpace: 'nowrap' }}>
                            {l.plaque ?? '—'}
                          </span>
                        </span>
                      </span>
                    </div>
                  ),
                },
                {
                  k: 'cap',
                  t: t('Capacité'),
                  rendu: (l) =>
                    l.statut === 'en_activation' ? (
                      <span className="t12 c3">{tf('prévue : {n} colis', { n: l.capacite ?? 0 })}</span>
                    ) : (
                      <div className="entA-c">
                        <b>{l.capacite ?? 0}</b> <span className="t12 c3">{t('colis')}</span>
                      </div>
                    ),
                },
                {
                  k: 'zones',
                  t: t('Zones'),
                  rendu: (l) => (
                    <div className="entA-c">
                      {l.zones.map((z) => (
                        <span key={z} className={'entA-zc' + (l.statut === 'en_activation' ? ' off' : '')}>
                          {z}
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  k: 'st',
                  t: t('Statut'),
                  rendu: (l) => (
                    <div className="entA-c">
                      <Pill ton={PILL_STATUT[l.statut]} dot sm>
                        {l.statut === 'suspendu' && l.suspension?.par === 'belivay' ? t('Suspendu par BelivaY') : t(NOM_STATUT[l.statut])}
                      </Pill>
                      {l.suspension && (
                        <div className="t12 c3 mt4" style={{ maxWidth: 220 }}>
                          {l.suspension.par === 'belivay' ? tf('Niveau {n}{fin}', { n: l.suspension.niveau ?? '—', fin: l.suspension.jusqua ? ' · ' + tf('jusqu’au {d}', { d: date(l.suspension.jusqua) }) : '' }) : t('Par votre entreprise')}
                        </div>
                      )}
                      {l.retraitDemande && <div className="t12 c3 mt4">{t('Retrait décidé : après les missions en cours')}</div>}
                      {departDe(l.id) && (
                        <div className="t12 b7 mt4" style={{ color: 'var(--amber)' }}>
                          <Icone nom="log-out" taille={12} /> {departDe(l.id)!.echu ? t('Préavis de départ échu') : departDe(l.id)!.initiative === 'entreprise' ? tf('Fin de contrat · préavis jusqu’au {d}', { d: date(departDe(l.id)!.preavisJusqua) }) : tf('Départ demandé · préavis jusqu’au {d}', { d: date(departDe(l.id)!.preavisJusqua) })}
                        </div>
                      )}
                      {absencesDe(l.id).map((a) => (
                        <div key={a.id} className="t12 c3 mt4">
                          <Icone nom="calendar-x" taille={12} /> {tf('Absence prévenue {j}', { j: joursAbsence(a) })}
                        </div>
                      ))}
                      {l.statut === 'en_mission' && <div className="t12 c3 mt4">{tf('{n} mission(s) aujourd’hui', { n: l.missionsDuJour })}</div>}
                      {(l.alertes ?? []).map((al) => (
                        <div key={al} className="t12 b7 mt4" style={{ color: 'var(--amber)' }}>
                          <Icone nom="triangle-alert" taille={12} /> {t(NOM_ALERTE[al] ?? al)}
                        </div>
                      ))}
                    </div>
                  ),
                },
                {
                  k: 'cert',
                  t: t('Certification'),
                  rendu: (l) => {
                    const j = l.certifieJusqua ? Math.ceil((l.certifieJusqua - maintenant) / 86_400_000) : null
                    return (
                      <div className="entA-c">
                        {l.statut === 'en_activation' || !l.certifieJusqua ? (
                          <Pill ton="amber" sm>
                            {t('À passer')}
                          </Pill>
                        ) : l.statut === 'suspendu' ? (
                          <Pill ton="red" sm>
                            {t('Suspendue avec l’accès')}
                          </Pill>
                        ) : (
                          <Pill ton="green" icone="badge-check" sm>
                            {t('Certifié')}
                          </Pill>
                        )}
                        {l.certifieJusqua && <div className="t12 c3 mt4">{tf('expire le {d}', { d: date(l.certifieJusqua, true) })}</div>}
                        {j !== null && j <= P.alerteCertificationJours && <div className="t12 b7 mt4" style={{ color: 'var(--amber)' }}>{tf('dans {n} j', { n: j })}</div>}
                      </div>
                    )
                  },
                },
                {
                  k: 'ts',
                  t: t('Trust Score'),
                  rendu: (l) =>
                    l.trustScore === null ? (
                      <span className="t12 c3">{t('au neutre à l’activation')}</span>
                    ) : (
                      <span className="row" style={{ gap: 8 }}>
                        <b className="t15">{l.trustScore}</b>
                        <Pill ton={palierLivreur(l.trustScore) === 'Nouveau' ? 'ink' : 'acc'} sm>
                          {t(NOM_PALIER[palierLivreur(l.trustScore)])}
                        </Pill>
                      </span>
                    ),
                },
                {
                  k: 'go',
                  t: <span className="vh">{t('Fiche')}</span>,
                  l: t('Fiche'),
                  rendu: (l) =>
                    enTournee && l.statut === 'en_mission' ? (
                      <Link className="btn sm primary" to={chemin('missions')}>
                        <Icone nom="map" taille={18} />
                        <span>{t('Voir la mission')}</span>
                      </Link>
                    ) : (
                      <span className="e-l-acts">
                        {l.statut === 'en_mission' && (
                          // Appel masqué, ouvert pendant une mission seulement : il passe par la mission (Livreur.tsx).
                          <Link className="btn sm primary" to={chemin('missions', { livreur: l.id })} aria-label={tf('Appeler {n}', { n: l.nom })}>
                            <Icone nom="phone" taille={16} />
                            <span>{t('Appeler')}</span>
                          </Link>
                        )}
                        <Link className="btn sm ghost" to={chemin('livreur', { id: l.id })} aria-label={tf('Fiche de {nom}', { nom: l.nom })}>
                          <span>{t('Fiche')}</span>
                          <Icone nom="chevron-right" taille={18} />
                        </Link>
                      </span>
                    ),
                },
              ]}
            />
            {visibles.length === 0 && (
              <Vide
                icone="search-x"
                t={t('Aucun livreur ne correspond')}
                s={t('Changez la recherche ou les filtres.')}
                action={
                  <button type="button" className="btn secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                    {t('Effacer les filtres')}
                  </button>
                }
              />
            )}
          </div>

          {enTournee && (
            <>
              <div className="g g3">
                {(missions.donnees ?? []).map((m) => {
                  const pos = (positions.donnees ?? []).find((x) => x.missionId === m.id)
                  const marge = m.heureLimite - maintenant
                  return (
                    <Panel key={m.id} titre={tf('{nom} · en tournée', { nom: m.livreur?.nom ?? '' })} icone="route">
                      <Kv k={t('Paquet')} v={<span className="mono">{m.paquetId}</span>} />
                      <Kv k={t('Avancement')} v={tf('Étape {e} sur {n}', { e: m.etape, n: m.etapes })} />
                      <Kv k={t('En ce moment')} v={pos ? tf('{zone} · {etat} à {h}', { zone: pos.zone, etat: t(pos.etat === 'en_mouvement' ? 'en mouvement' : pos.etat === 'arret' ? 'à l’arrêt' : 'hors connexion'), h: heure(pos.le) }) : t('dernier état connu indisponible')} />
                      <Kv k={t('Heure limite')} v={marge >= 0 ? tf('{h} · marge {d}', { h: heure(m.heureLimite), d: duree(marge) }) : tf('{h} · en retard', { h: heure(m.heureLimite) })} />
                      <div className="btns">
                        <Link className="btn primary" to={chemin('missions', { id: m.id })}>
                          <Icone nom="map" taille={18} />
                          <span>{t('Voir la mission')}</span>
                        </Link>
                      </div>
                    </Panel>
                  )
                })}
              </div>
              {missions.donnees && missions.donnees.length === 0 && <Hint>{t('Aucune mission en cours.')}</Hint>}
              <Hint icone="eye-off">{t('La position d’un livreur n’est suivie que pendant une mission active ; les livreurs disponibles n’ont pas de position affichée.')}</Hint>
            </>
          )}

          <div className="g g3">
            <Panel titre={t('Approuver, suspendre, retirer')} icone="user-cog">
              <div className="t13 c2 lh">{tf('{nom} décide seule de la suite avec ses livreurs. Un retrait ferme le rattachement après les missions en cours. Un livreur qui veut partir le demande : il finit ses missions pendant le préavis et {nom} clôture son départ. Une suspension décidée par BelivaY ne se lève pas ici.', { nom })}</div>
            </Panel>
            <Panel titre={t('Un livreur, une entreprise')} icone="fingerprint">
              <div className="t13 c2 lh">{t('Un livreur n’est rattaché qu’à une seule entreprise à la fois. Personne d’autre ne travaille sous son compte : chaque preuve porte son nom et sa photo.')}</div>
            </Panel>
            <Panel titre={t('Alertes de la flotte')} icone="bell">
              {alertes.length === 0 ? (
                <div className="t13 c3">{t('Aucune alerte : pièces, certifications et véhicules sont à jour.')}</div>
              ) : (
                alertes.map((l) => (
                  <Rangee
                    key={l.id}
                    icone={(l.alertes ?? []).some((a) => a.startsWith('vehicule') || a === 'sans_vehicule') ? 'car' : 'id-card'}
                    ton="amber"
                    titre={l.nom}
                    sous={(l.alertes ?? []).map((a) => t(NOM_ALERTE[a] ?? a)).join(' · ')}
                    droite={
                      <Link className="btn sm secondary" to={(l.alertes ?? []).some((a) => a.startsWith('vehicule')) ? chemin('vehicules') : chemin('livreur', { id: l.id })}>
                        {t('Voir')}
                      </Link>
                    }
                  />
                ))
              )}
            </Panel>
          </div>
        </>
      )}
    </Ecran>
  )
}

/** File « Départs » de la flotte (DP-66) : demandes ouvertes (préavis, conditions), puis départs clos récemment. */
function FileDeparts({ departs, clos, ouvrir }: { departs: DemandeDepart[]; clos: string | null; ouvrir: (id: string) => void }) {
  const { t, tf } = usePreferences()
  const { date } = useDates()
  const ouverts = departs.filter((d) => d.etat === 'demande')
  const fermes = departs.filter((d) => d.etat === 'close')
  const juste = fermes.find((d) => d.livreur.id === clos)
  const ligne = (d: DemandeDepart) => {
    const [libelle, ton] = etatDepart(d)
    const sous =
      d.etat === 'close'
        ? `${t(NOM_MOTIF[d.motif])} · ${tf('clôturé le {c}', { c: d.closLe ? date(d.closLe) : '—' })}${d.kitNonConteste ? ' · ' + t('kit non contesté') : d.kit.constat === 'incomplet' ? ' · ' + t('kit incomplet') : ''} · ${d.versement.faitLe ? tf('dernier versement fait le {v}', { v: date(d.versement.faitLe) }) : tf('dernier versement le {v}, pas encore marqué fait', { v: d.versementLe ? date(d.versementLe) : '—' })}`
        : `${t(NOM_MOTIF[d.motif])} · ${tf('demandé le {d}', { d: date(d.demandeLe) })} · ${d.echu ? tf('préavis échu le {d}', { d: date(d.preavisJusqua) }) : tf('préavis jusqu’au {d} · paquets jusqu’au {v}', { d: date(d.preavisJusqua), v: date(veilleDernierJour(d)) })}${d.manquantes.length ? ' · ' + d.manquantes.map((m) => t(NOM_MANQUE[m])).join(', ') : ''}`
    return (
      <Li
        key={d.id}
        gauche={<span className="e-av-l">{d.livreur.initiales}</span>}
        t={d.livreur.nom}
        s={sous}
        droite={
          <Pill ton={ton} dot sm>
            {t(libelle)}
          </Pill>
        }
        to={d.etat === 'demande' ? chemin('livreur', { id: d.livreur.id }) + '#depart' : undefined}
        onClick={d.etat === 'close' ? () => ouvrir(d.id) : undefined}
      />
    )
  }
  return (
    <section className="mt14" aria-label={t('Départs')}>
      {juste && (
        <div className="dk-banner acc" role="status">
          <Icone nom="circle-check" taille={20} />
          <div className="grow">{tf('Départ de {nom} clôturé : dernier relevé versé le {v} en Mobile Money (SMS envoyé) ; accès fermé, téléphone délié, administrateur prévenu.', { nom: juste.livreur.nom, v: juste.versementLe ? date(juste.versementLe) : '—' })}</div>
        </div>
      )}
      <Panel titre={t('Départs demandés')} icone="log-out" tonIcone="amber" droite={<Pill ton="amber" sm>{ouverts.length}</Pill>}>
        {ouverts.length === 0 ? <div className="t13 c3">{t('Aucune demande de départ en cours.')}</div> : <div className="card tight">{ouverts.map(ligne)}</div>}
        <p className="t12 c3 mt10 lh">{tf('Le livreur demande à partir, avec un motif : rien ne change tout de suite. Pendant le préavis ({n} jours au registre), il travaille normalement : vous pouvez lui confier des paquets jusqu’à la veille du dernier jour. Vous clôturez, même avant la fin, d’un commun accord, quand aucune mission n’est en cours, aucun colis sous sa garde et son kit constaté.', { n: PARAMETRES_FLOTTE.preavisDepartJours })}</p>
      </Panel>
      {fermes.length > 0 && (
        <Panel titre={t('Départs clôturés')} icone="history" className="mt14">
          <div className="card tight">{fermes.map(ligne)}</div>
          <p className="t12 c3 mt10 lh">{tf('Visibles ici {n} jours après la clôture ; le journal garde tout.', { n: PARAMETRES_FLOTTE.departVisibleJours })}</p>
        </Panel>
      )}
    </section>
  )
}
