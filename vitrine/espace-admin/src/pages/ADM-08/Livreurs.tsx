// ADM-P19 Livreurs (prototype : #livreurs, ?s=fiche, ?s=activation, ?s=suspendu, ?s=retire). Tous rattachés à leur
// entreprise ; AUCUN bouton d'affectation (ADM-P19R-04 : seule l'entreprise affecte). Onglets du prototype (Tous,
// Actifs, En activation, Suspendus, Retirés), plus « Départs et identifiants » (DP-66, DP-67, ecrans-admin ADM-P19) :
// départs échus sans constat du kit (clôture d'office, kit non contesté, aucune retenue), retenues de kit contestées
// (Médiation ou Direction, sous 72 h), nouveau numéro ou nouvel appareil (quatre yeux, liste noire, un appareil = un
// compte). Les décisions partent au pont (depart_clos, kit_decide, livreur_suspendu, livreur_retabli).
import { LienPoste } from '../../composants/poste/LienPoste'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { BoutonAppel } from '../../composants/BoutonAppel'
import { Perimetre } from '../../composants/Perimetre'
import { AucunResultat, Banniere, Choix, Kpi, Kv, Li, Note, Panel, Pill, Props, Qui, Recherche, Table, Vide, Anneau, normaliser, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { Depart, EtatDepart, LivreurFiche, StatutLivreur } from '../../donnees/domaines/logistique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { useFonctions } from '../AJ-A/fonctions-page'
import { BoutonGeste, Chaine, Introuvable, Lu, M4, StatutPill, dateCourte, francs, quand, useGestes } from './commun'
import { NOM_PALIER } from './Entreprises'
import { PARAM } from './parametres'
import { AccesActeur } from '../SURVEILLER/AccesActeur'

export const STATUT_LIV: Record<StatutLivreur, [string, 'green' | 'amber' | 'red' | 'ink']> = {
  actif: ['Actif', 'green'],
  en_activation: ['En activation', 'amber'],
  suspendu: ['Suspendu', 'red'],
  retire: ['Retiré', 'ink'],
  parti: ['Parti', 'ink'],
}
const ETAT_DEPART: Record<EtatDepart, [string, 'acc' | 'amber' | 'red' | 'ink']> = {
  en_preavis: ['En préavis', 'acc'],
  attente_constat: ['Constat du kit attendu', 'amber'],
  echu: ['Échu sans constat', 'red'],
  clos: ['Clos', 'ink'],
}
const VEHICULE = { moto: 'Moto', tricycle: 'Tricycle cargo', voiture: 'Voiture' }
type Onglet = 'tous' | 'actifs' | 'activation' | 'suspendus' | 'retires' | 'departs'

export default function Livreurs() {
  const [p] = useSearchParams()
  const id = p.get('id')
  return id ? <Fiche id={id} /> : <Liste />
}

function Liste() {
  const { t, tf, langue } = usePreferences()
  const surtitre = useSurtitre()
  const maintenant = useHorloge()
  const [p, setP] = useSearchParams()
  const depart = p.get('depart')
  const entreprise = p.get('entreprise')
  const onglet: Onglet = depart ? 'departs' : ((p.get('onglet') as Onglet) ?? 'tous')
  const l = useLecture(() => Promise.all([source.logistique.livreurs(), source.logistique.departs(), source.logistique.changements(), source.logistique.dossiersLivreurs()]), [])
  const g = useGestes()
  const { role } = useSession()
  const [q, setQ] = useState('')
  const [livs0, dep0, ch0, dos0] = l.donnees ?? [[], [], [], []]
  const ops = role === 'superviseur' || role === 'operations'
  const fonctions = useFonctions([
    ops && { verbe: 'Certifier', n: livs0.filter((x) => x.statut === 'en_activation').length + dos0.filter((d) => d.etat === 'a_activer').length, unite: ['livreur', 'livreurs'], icone: 'badge-check', route: 'livreurs', params: { onglet: 'activation' }, geste: true },
    ops && { verbe: 'Clore', n: dep0.filter((d) => d.etat === 'echu').length, unite: ['départ échu', 'départs échus'], icone: 'log-out', route: 'livreurs', params: { onglet: 'departs' }, geste: true, alerte: true },
    (role === 'superviseur' || role === 'mediation') && { verbe: 'Trancher', n: dep0.filter((d) => d.contestation && !d.contestation.decision).length, unite: ['kit contesté', 'kits contestés'], icone: 'scale', route: 'livreurs', params: { onglet: 'departs' }, geste: true },
    ops && { verbe: 'Décider', n: ch0.filter((c) => c.etat === 'a_decider').length, unite: ['identifiant', 'identifiants'], icone: 'smartphone', route: 'livreurs', params: { onglet: 'departs' }, geste: true },
  ])
  const actions = (
    <Link className="btn secondary" to={chemin('kyc')}>
      <Icone nom="id-card" taille={18} />
      <span>{t('Revue KYC')}</span>
    </Link>
  )
  return (
    <Ecran route="livreurs" kicker={surtitre} actions={<>{actions}<LienPoste genre="kit" /></>} fonctions={fonctions}>
      <Perimetre route="livreurs" />
      {g.rendu}
      <Lu l={l} quoi="La liste des livreurs">
        {([livs, departs, changements, dossiers]) => {
          const base = livs.filter((x) => !entreprise || x.entrepriseId === entreprise)
          const n = (s: StatutLivreur[]) => base.filter((x) => s.includes(x.statut)).length
          const aTraiter = departs.filter((d) => d.etat === 'echu' || (d.contestation && !d.contestation.decision)).length + changements.filter((c) => c.etat === 'a_decider').length
          const filtre = { tous: base, actifs: base.filter((x) => x.statut === 'actif'), activation: base.filter((x) => x.statut === 'en_activation'), suspendus: base.filter((x) => x.statut === 'suspendu'), retires: base.filter((x) => x.statut === 'retire' || x.statut === 'parti'), departs: [] }[onglet].filter((x) => !q || normaliser(`${x.nom} ${x.entreprise} ${x.vehicule.plaque} ${x.zones.join(' ')}`).includes(normaliser(q)))
          const expirent = base.filter((x) => x.pieceAlerte && x.pieceAlerte.expireLe - maintenant < PARAM.entreprises.pieceAlerteJ * 86_400_000)
          const enMission = base.filter((x) => x.enMission)
          const choisir = (o: Onglet) => setP(o === 'tous' ? {} : { onglet: o }, { replace: true })
          return (
            <>
              <Choix
                forme="tabs"
                aria={t('Livreurs par statut')}
                actif={onglet}
                choisir={choisir}
                items={[
                  { id: 'tous', t: t('Tous'), n: base.length },
                  { id: 'actifs', t: t('Actifs'), n: n(['actif']) },
                  { id: 'activation', t: t('En activation'), n: n(['en_activation']) + dossiers.filter((d) => d.etat === 'a_activer').length },
                  { id: 'suspendus', t: t('Suspendus'), n: n(['suspendu']) },
                  { id: 'retires', t: t('Retirés'), n: n(['retire', 'parti']) },
                  { id: 'departs', t: t('Départs et identifiants'), n: aTraiter },
                ]}
              />
              {onglet === 'departs' ? (
                <Departs departs={departs} changements={changements} g={g} ouvert={depart} />
              ) : (
                <>
                  {onglet === 'tous' && (
                    <div className="g g4">
                      <Kpi k={t('Livreurs')} v={base.length} s={tf('rattachés à {n} entreprise(s) · livreurs BelivaY : 0', { n: new Set(base.map((x) => x.entreprise)).size })} icone="bike" ton="night" />
                      <Kpi k={t('Actifs')} v={n(['actif'])} s={t('KYC vérifié et certification réussie')} icone="user-check" iton="green" />
                      <Kpi k={t('En mission maintenant')} v={enMission.length} s={enMission.map((x) => x.nom).join(', ')} icone="navigation" />
                      <Kpi k={t('Pièces qui expirent')} v={expirent.length} s={tf('dans les {j} jours', { j: PARAM.entreprises.pieceAlerteJ })} icone="id-card" iton="amber" />
                    </div>
                  )}
                  {onglet === 'activation' && dossiers.length > 0 && (
                    <Panel titre={t('Demandes reçues de l’espace livreur')} icone="inbox" className="mt16">
                      {dossiers.map((d) => (
                        <Li
                          key={d.dossier}
                          icone="user-plus"
                          ton={d.etat === 'active' ? 'green' : 'amber'}
                          t={`${d.nom} · ${d.dossier}`}
                          s={tf('{e} · {n} pièces sur 3 · {h}', { e: d.entreprise ?? t('entreprise inconnue'), n: d.pieces, h: quand(d.le, langue) })}
                          droite={d.etat === 'active' ? <StatutPill t="Certification validée" ton="green" /> : <BoutonGeste g={g} action="livreur.activer" objet={d.dossier} sm resume={tf('Valider la certification de {n} : son espace et son entreprise le reçoivent ; l’entreprise l’approuve ensuite.', { n: d.nom })} />}
                        />
                      ))}
                    </Panel>
                  )}
                  {onglet === 'retires' && filtre.length === 0 ? (
                    <div className="g g21">
                      <Panel>
                        <Vide icone="user-x" t={t('Aucun livreur retiré')} s={t('Une fiche retirée affiche la décision de niveau 4, sa date et son auteur, le recours et son issue, et les identifiants mis en liste noire. Elle reste consultable ; aucune mission n’est possible.')} />
                      </Panel>
                      <ListeNoire />
                    </div>
                  ) : (
                    <div className="mt16">
                      <Table
                        legende={t('Livreurs')}
                        outils={
                          <div className="s4-filtres">
                            <Recherche q={q} setQ={setQ} placeholder={t('Livreur, plaque, entreprise…')} aria={t('Rechercher un livreur')} />
                            {entreprise && (
                              <button type="button" className="chip on" onClick={() => setP({}, { replace: true })}>
                                {tf('Entreprise : {e}', { e: base[0]?.entreprise ?? entreprise })}
                                <Icone nom="x" taille={14} />
                              </button>
                            )}
                            <span className="sp"></span>
                            <span className="lock hide-m"><Icone nom="ban" taille={15} />{t('Aucune affectation depuis la console')}</span>
                          </div>
                        }
                        rows={filtre}
                        cle={(x) => x.id}
                        ligneCls={(x) => (x.statut === 'en_activation' ? 'warn' : x.statut === 'suspendu' ? 'bad' : undefined)}
                        vide={<AucunResultat effacer={() => (setQ(''), choisir('tous'))} />}
                        cols={[
                          { k: 'n', t: t('Livreur'), main: true, rendu: (x) => <Link to={chemin('livreurs', { id: x.id })}><Qui nom={x.nom} sous={x.entreprise} /></Link> },
                          { k: 'z', t: t('Zones'), rendu: (x) => <span className="row wrap" style={{ gap: 4 }}>{x.zones.map((z) => <Pill key={z} ton="acc" sm>{z}</Pill>)}</span> },
                          { k: 'v', t: t('Véhicule'), rendu: (x) => <span>{t(VEHICULE[x.vehicule.type])} <small className="s4-mono">{x.vehicule.plaque}</small></span> },
                          { k: 'st', t: t('Statut'), rendu: (x) => <><StatutPill t={STATUT_LIV[x.statut][0]} ton={STATUT_LIV[x.statut][1]} />{x.enPreavis && <div className="t2">{tf('préavis jusqu’au {d}', { d: dateCourte(x.enPreavis.jusqua, langue) })}</div>}</> },
                          { k: 'ts', t: t('Trust Score'), cls: 'r', rendu: (x) => (x.trustScore === null ? <><span className="c3">—</span><div className="t2">{t('en calcul')}</div></> : <><b>{x.trustScore}</b><div className="t2">{t(NOM_PALIER[x.palier!])}</div></>) },
                          { k: 'auj', t: t('Missions du jour'), cls: 'r', rendu: (x) => (x.statut === 'en_activation' ? '—' : <><b>{x.missionsJour}</b><div className="t2">{x.enMission ? tf('en mission · {p}', { p: x.enMission.slice(-3) }) : t('disponible')}</div></>) },
                          { k: 'inc', t: t('Incidents 30 j'), cls: 'r', hideM: true, rendu: (x) => <b>{x.incidents30j}</b> },
                          { k: 'al', t: t('Pièces'), rendu: (x) => (x.pieceAlerte ? <Pill ton={x.pieceAlerte.expireLe - maintenant < 7 * 86_400_000 ? 'amber' : 'ink'} sm icone="id-card">{tf('{p} · {d}', { p: t(x.pieceAlerte.piece), d: dateCourte(x.pieceAlerte.expireLe, langue) })}</Pill> : x.reverification ? <Pill ton="amber" sm icone="camera">{t('Nouvelle photo demandée')}</Pill> : x.statut === 'en_activation' ? <Pill ton="amber" sm>{t('Pièces')}</Pill> : <span className="c3">—</span>) },
                        ]}
                        pied={<><span>{tf('{n} livreurs · tous rattachés à une entreprise · livreurs BelivaY : 0', { n: filtre.length })}</span><span>{tf('Missions du jour à {h}', { h: quand(maintenant, langue, false) })}</span></>}
                      />
                    </div>
                  )}
                  {onglet === 'tous' && (
                    <div className="g g2">
                      <Panel titre={t('Pièces qui expirent')} icone="calendar-clock">
                        {expirent.length === 0 && <Li icone="circle-check" ton="green" t={t('Aucune pièce n’expire bientôt')} />}
                        {expirent.map((x) => (
                          <Li key={x.id} icone="id-card" ton="amber" t={`${x.nom} · ${t(x.pieceAlerte!.piece)}`} s={tf('Expire le {d} : sans renouvellement, plus aucune nouvelle mission (suspension automatique, sans niveau de sanction)', { d: dateCourte(x.pieceAlerte!.expireLe, langue) })} to={chemin('livreurs', { id: x.id })} />
                        ))}
                        {base.filter((x) => x.reverification).map((x) => (
                          <Li key={'r' + x.id} icone="camera" ton="amber" t={tf('{n} · nouvelle photo demandée', { n: x.nom })} s={tf('À envoyer avant le {d} ({j} jours) ; ensuite, plus de nouvelle mission jusqu’à la validation', { d: dateCourte(x.reverification!, langue), j: PARAM.livreurs.photoReverifJ })} to={chemin('livreurs', { id: x.id })} />
                        ))}
                      </Panel>
                      <Panel titre={t('Certification et types')} icone="badge-check">
                        <Li icone="graduation-cap" ton="acc" t={tf('{n} certifiés · {m} en cours', { n: base.filter((x) => x.statut !== 'en_activation').length, m: n(['en_activation']) })} s={t('Quiz à réussir · recertification annuelle')} />
                        <Li icone="building-2" ton="violet" t={t('Livreurs BelivaY : 0')} s={t('Au lancement, seuls des livreurs partenaires, rattachés à une entreprise')} />
                        <Li icone="bike" ton="ink" t={(['moto', 'tricycle', 'voiture'] as const).map((v) => `${base.filter((x) => x.vehicule.type === v).length} ${t(VEHICULE[v]).toLowerCase()}`).join(' · ')} s={t('Classe portée selon le véhicule')} />
                      </Panel>
                    </div>
                  )}
                </>
              )}
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}

function ListeNoire() {
  const { t } = usePreferences()
  return (
    <Panel titre={t('Liste noire')} icone="shield-x">
      <Props
        paires={[
          [t('Identifiants bloqués'), t('Pièce d’identité, appareil, téléphone, numéro Mobile Money')],
          [t('À chaque invitation'), t('Contrôle automatique ; refus sans en donner le motif à l’entreprise')],
          [t('Levée'), t('Uniquement à quatre yeux, avec motif écrit')],
          [t('Réinscription'), t('Bloquée sur tous les identifiants')],
        ]}
      />
    </Panel>
  )
}

function Departs({ departs, changements, g, ouvert }: { departs: Depart[]; changements: Awaited<ReturnType<typeof source.logistique.changements>>; g: ReturnType<typeof useGestes>; ouvert: string | null }) {
  const { t, tf, langue } = usePreferences()
  const choisi = departs.find((d) => d.id === ouvert) ?? null
  return (
    <>
      {departs.some((d) => d.etat === 'echu') && (
        <Banniere ton="red" icone="log-out" className="admlg-bn">
          <b>{tf('{n} départ(s) échu(s) sans constat du kit.', { n: departs.filter((d) => d.etat === 'echu').length })}</b>
        </Banniere>
      )}
      {choisi && <DetailDepart d={choisi} g={g} />}
      <Panel titre={t('Départs des livreurs')} icone="log-out" className="mt16">
        <Table
          legende={t('Départs des livreurs')}
          rows={departs}
          cle={(d) => d.id}
          ligneCls={(d) => (d.etat === 'echu' || (d.contestation && !d.contestation.decision) ? 'bad' : d.id === ouvert ? 'hot' : undefined)}
          vide={<Vide icone="log-out" t={t('Aucun départ en cours')} s={t('Les demandes de départ arrivent de l’espace livreur ; l’entreprise les clôt.')} />}
          cols={[
            { k: 'id', t: t('Départ'), main: true, rendu: (d) => <Link to={chemin('livreurs', { depart: d.id })} replace><b className="s4-mono">{d.id}</b><div className="t2">{`${d.livreur} · ${d.entreprise}`}</div></Link> },
            { k: 'm', t: t('Motif'), hideM: true, rendu: (d) => t(d.motif) },
            { k: 'p', t: t('Fin du préavis'), rendu: (d) => quand(d.preavisJusqua, langue) },
            { k: 'e', t: t('État'), rendu: (d) => <StatutPill t={ETAT_DEPART[d.etat][0]} ton={ETAT_DEPART[d.etat][1]} /> },
            { k: 'k', t: t('Kit'), rendu: (d) => (d.contestation && !d.contestation.decision ? <Pill ton="red" sm icone="scale">{t('Retenue contestée')}</Pill> : d.kit.constat === 'incomplet' ? <Pill ton="amber" sm>{tf('Incomplet · {m}', { m: francs(d.kit.retenue) })}</Pill> : d.kit.constat === 'restitue' ? <Pill ton="green" sm>{t('Restitué')}</Pill> : d.clos?.kitNonConteste ? <Pill ton="ink" sm>{t('Non contesté')}</Pill> : <span className="c3">{t('non constaté')}</span>) },
            { k: 'a', t: t('Décision'), cls: 'r', rendu: (d) => (d.etat === 'echu' || (d.contestation && !d.contestation.decision) ? <Link className="btn sm primary" to={chemin('livreurs', { depart: d.id })} replace>{t('Traiter')}</Link> : <Link className="btn sm ghost" to={chemin('livreurs', { depart: d.id })} replace>{t('Ouvrir')}</Link>) },
          ]}
        />
      </Panel>
      <Panel titre={t('Nouveau numéro ou nouvel appareil')} icone="smartphone" className="mt16">
        {changements.length === 0 && <Vide icone="smartphone" t={t('Aucune demande')} />}
        {changements.map((c) => (
          <div key={c.id} className="card flat mt12" style={{ padding: '12px 14px' }}>
            <div className="s4-ligne">
              <span className="ic acc" style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icone nom={c.nature === 'telephone' ? 'smartphone' : 'tablet-smartphone'} taille={18} /></span>
              <div className="grow">
                <b>{`${c.id} · ${c.livreur} · ${c.entreprise}`}</b>
                <div className="t12 c3">{tf('{n} : {a} → {b} · demandé {h}', { n: t(c.nature === 'telephone' ? 'Nouveau numéro' : 'Nouvel appareil'), a: c.ancien, b: c.nouveau, h: quand(c.demandeLe, langue) })}</div>
              </div>
              <StatutPill t={{ a_decider: 'À décider', a_contresigner: 'À contresigner', accepte: 'Accepté', refuse: 'Refusé' }[c.etat]} ton={c.etat === 'a_decider' ? 'amber' : c.etat === 'accepte' ? 'green' : 'ink'} />
            </div>
            <p className="t13 mt8">{`« ${c.raison} »`}</p>
            <div className="row wrap mt8" style={{ gap: 6 }}>
              <Pill ton={c.controles.listeNoire ? 'red' : 'green'} sm icone={c.controles.listeNoire ? 'x' : 'check'}>{t(c.controles.listeNoire ? 'Liste noire : correspondance' : 'Liste noire : aucune correspondance')}</Pill>
              <Pill ton={c.controles.doublon ? 'red' : 'green'} sm icone={c.controles.doublon ? 'x' : 'check'}>{t(c.controles.doublon ? 'Déjà rattaché à un autre compte' : 'Aucun doublon')}</Pill>
            </div>
            {c.etat === 'a_decider' && (
              <div className="s4-actes">
                <BoutonGeste g={g} action="identifiant.accepter" objet={c.id} sm resume={tf('Rattacher le nouvel identifiant de {l} ; l’ancien est délié et ne peut plus servir.', { l: c.livreur })} />
                <BoutonGeste g={g} action="identifiant.refuser" objet={c.id} genre="secondary" sm resume={tf('Refuser le nouvel identifiant de {l} ; l’entreprise reçoit le refus, sans le détail des contrôles.', { l: c.livreur })} />
              </div>
            )}
          </div>
        ))}
      </Panel>
    </>
  )
}

function DetailDepart({ d, g }: { d: Depart; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  const v = d.versement
  return (
    <Panel titre={tf('Départ {id} · {l}', { id: d.id, l: d.livreur })} icone="log-out" droite={<StatutPill t={ETAT_DEPART[d.etat][0]} ton={ETAT_DEPART[d.etat][1]} />} className="mt16">
      <div className="g g2" style={{ marginTop: 0 }}>
        <div>
          <Props
            paires={[
              [t('Entreprise'), d.entreprise],
              [t('Demandé'), quand(d.demandeLe, langue)],
              [t('Motif'), t(d.motif)],
              [t('Fin du préavis'), tf('{d} ({j} jours)', { d: quand(d.preavisJusqua, langue), j: PARAM.livreurs.preavisJ })],
              [t('Constat du kit attendu jusqu’au'), quand(d.constatJusqua, langue)],
              [t('Mission en cours'), d.missionEnCours ? t('oui') : t('non')],
              [t('Colis sous sa garde'), d.colisSousGarde],
              [t('Kit'), d.kit.constat ? `${t(d.kit.constat === 'restitue' ? 'Restitué' : 'Incomplet')}${d.kit.manquants.length ? ' · ' + d.kit.manquants.join(', ') : ''}` : t('non constaté')],
            ]}
          />
          {d.contestation && (
            <Note ton={d.contestation.decision ? 'ink' : 'red'} icone="scale" className="mt10">
              <b>{tf('Retenue contestée le {h}', { h: quand(d.contestation.le, langue) })}</b> · {`« ${d.contestation.motif} »`}
              {d.contestation.decision && <div className="mt4">{tf('Décision : {d} · {qui}', { d: t(d.contestation.decision === 'retenue_annulee' ? 'retenue annulée' : 'retenue maintenue'), qui: d.contestation.par ?? '' })}</div>}
            </Note>
          )}
          {d.clos && <Note ton="green" icone="check" className="mt10">{tf('Clos le {h} par {qui}{kit} ; dernier versement le {v}.', { h: quand(d.clos.le, langue), qui: t(d.clos.par === 'admin' ? 'l’administrateur' : 'l’entreprise'), kit: d.clos.kitNonConteste ? ' · ' + t('kit non contesté') : '', v: dateCourte(d.clos.versementLe, langue) })}</Note>}
        </div>
        <div>
          <b className="t14">{t('Dernier versement (payé par l’entreprise)')}</b>
          <Kv k={tf('{n} missions validées', { n: v.missions })} v={francs(v.du)} />
          <Kv k={tf('Retenu pour {n} litige(s) ouvert(s)', { n: v.litiges })} v={v.retenuLitiges ? '− ' + francs(v.retenuLitiges) : francs(0)} />
          <Kv k={tf('Retenue du kit (au plus {m})', { m: francs(PARAM.livreurs.kitValeur) })} v={v.retenueKit ? '− ' + francs(v.retenueKit) : francs(0)} />
          {v.kitDeCote > 0 && <Kv k={t('Mis de côté pendant la contestation')} v={francs(v.kitDeCote)} />}
          <Kv k={<b>{t('Versé')}</b>} v={<b>{francs(v.verse)}</b>} />
          <div className="s4-actes">
            {!d.clos && <BoutonGeste g={g} action="depart.clore" objet={d.id} resume={tf('Clore le départ de {l} : kit non contesté, aucune retenue ; dernier versement le vendredi suivant, accès fermé, l’entreprise et le livreur prévenus.', { l: d.livreur })} />}
            {d.contestation && !d.contestation.decision && <>
            <BoutonGeste g={g} action="kit.annuler" objet={d.id} resume={tf('Annuler la retenue du kit de {l} : le montant mis de côté ({m}) part au vendredi suivant la décision.', { l: d.livreur, m: francs(v.kitDeCote || d.kit.retenue) })} />
            <BoutonGeste g={g} action="kit.maintenir" objet={d.id} genre="secondary" resume={tf('Maintenir la retenue du kit de {l} ({m}), au vu de la photo et de la liste de l’entreprise.', { l: d.livreur, m: francs(d.kit.retenue) })} />
            </>}
          </div>
        </div>
      </div>
    </Panel>
  )
}

function Fiche({ id }: { id: string }) {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const naviguer = useNavigate()
  const l = useLecture(() => source.logistique.livreurFiche(id).then((f) => ({ f })), [id])
  const g = useGestes()
  const f = l.donnees?.f ?? null
  const actions = (
    <>
      <Link className="btn secondary" to={chemin('kyc')}>
        <Icone nom="id-card" taille={18} />
        <span>{t('Revoir le KYC')}</span>
      </Link>
      {f && <BoutonAppel nom={f.nom} qui="Livreur" motif={t('Explication ou intervention sur une mission')} objet={id} />}
      <Link className="btn secondary" to={chemin('messagerie', { livreur: id })}>
        <Icone nom="message-circle" taille={18} />
        <span>{t('Messagerie de la mission')}</span>
      </Link>
    </>
  )
  return (
    <Ecran route="livreurs" titre={f?.nom ?? t('Livreurs')} nom={f?.nom} retour={chemin('livreurs')} kicker={`${t(f?.statut === 'en_activation' ? 'Livreur en activation' : f?.statut === 'suspendu' ? 'Livreur suspendu' : 'Livreur partenaire')} · ${surtitre}`} actions={actions}>
      {g.rendu}
      <Lu l={l} quoi="La fiche du livreur">
        {({ f: x }) =>
          !x ? (
            <Introuvable quoi="Livreur introuvable" retour={() => naviguer(chemin('livreurs'))} libelle="Retour à la liste" />
          ) : (
            <>
              <AccesActeur espace="livreur" id={x.id} nom={x.nom} zone={x.zones[0] ?? null} />
              {x.statut === 'en_activation' ? <Activation f={x} g={g} /> : <FicheActive f={x} g={g} />}
            </>
          )
        }
      </Lu>
    </Ecran>
  )
}

function Activation({ f, g }: { f: LivreurFiche; g: ReturnType<typeof useGestes> }) {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="g g21">
        <Panel titre={tf('Activation de {n} · {e}', { n: f.nom, e: f.entreprise })} icone="list-checks" droite={<StatutPill t="En activation" ton="amber" />}>
          <Chaine
            etapes={[
              { titre: 'Invitation', detail: tf('par {e}', { e: f.entreprise }), etat: 'fait' },
              { titre: 'Charte', detail: 'acceptée', etat: 'fait' },
              { titre: 'Pièces', detail: f.pieces.every((p) => p.statut === 'verifiee') ? 'vérifiées' : 'en revue humaine', etat: f.pieces.every((p) => p.statut === 'verifiee') ? 'fait' : 'en_cours', route: 'kyc' },
              { titre: 'Certification', detail: f.certification.le ? 'validée par BelivaY' : tf('{m} modules sur {t}', { m: f.certification.modules, t: f.certification.total }), etat: f.certification.le ? 'fait' : 'en_cours' },
              { titre: 'Approbation', detail: 'par l’entreprise', etat: 'a_faire' },
              { titre: 'Actif', detail: 'aucune mission avant', etat: 'bloque' },
            ]}
          />
        </Panel>
        <Panel titre={t('Véhicule et zone')} icone="bike">
          <Kv k={t('Véhicule')} v={`${t(VEHICULE[f.vehicule.type])} · ${f.vehicule.plaque}`} />
          <Kv k={t('Zones')} v={f.zones.join(', ')} />
          <Kv k={t('Entreprise')} v={f.entreprise} />
          <Kv k={t('Type')} v={t('Livreur partenaire')} />
        </Panel>
      </div>
      <div className="g g2">
        <Panel titre={t('Pièces à revoir')} icone="id-card">
          {f.pieces.map((p) => <Kv key={p.nature} k={t(p.nature)} v={<StatutPill t={p.statut === 'verifiee' ? 'Vérifiée' : p.statut === 'en_revue' ? 'En revue' : 'Manquante'} ton={p.statut === 'verifiee' ? 'green' : 'amber'} />} />)}
          <Kv k={t('Liste noire')} v={t('pièce, appareil, téléphone : aucune correspondance')} />
          <Kv k={t('Un seul compte')} v={t('appareil et pièce non rattachés ailleurs')} />
          <div className="btns mt12">
            <Link className="btn primary" to={chemin('kyc')}><Icone nom="id-card" taille={18} /><span>{t('Revoir le KYC')}</span></Link>
          </div>
        </Panel>
        <Panel titre={t('Certification')} icone="graduation-cap">
          <Kv k={t('Modules suivis')} v={`${f.certification.modules} / ${f.certification.total}`} />
          <Kv k={t('Quiz')} v={f.certification.quiz === null ? t('à passer') : `${f.certification.quiz} / ${PARAM.livreurs.quizQuestions}`} />
          <Kv k={t('Seuil')} v={`${PARAM.livreurs.quizSeuil} / ${PARAM.livreurs.quizQuestions}`} />
          <div className="btns mt12">
            <BoutonGeste g={g} action="livreur.activer" objet={f.id} resume={tf('Valider la certification de {n} : son espace et son entreprise le reçoivent ; l’entreprise l’approuve ensuite.', { n: f.nom })} />
          </div>
        </Panel>
      </div>
    </>
  )
}

function FicheActive({ f, g }: { f: LivreurFiche; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const hors = f.derniereSync !== null && maintenant - f.derniereSync > 10 * 60_000
  return (
    <>
      {f.suspension && (
        <Banniere ton="red" icone="user-x" className="admlg-bn" bouton={<BoutonGeste g={g} action="livreur.retablir" objet={f.id} genre="secondary" resume={tf('Rétablir {n} : il redevient affectable par son entreprise ; l’entreprise et le livreur sont prévenus.', { n: f.nom })} />}>
          <b>{tf('Suspendu depuis le {d} : {m}', { d: dateCourte(f.suspension.depuis, langue), m: f.suspension.motif })}</b> {tf('Aucune nouvelle mission ; il termine seulement les colis déjà sous sa garde. Décidé par {qui}.', { qui: f.suspension.par })}
        </Banniere>
      )}
      <div className="g g21">
        <div className={'hero night' + (f.suspension ? ' s4-rouge' : '')}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="hk">{`${t(STATUT_LIV[f.statut][0])}${f.enMission ? ' · ' + t('en mission') : ''}`}</span>
            <Pill ton="dk" icone="star">{f.trustScore === null ? t('Trust Score en calcul') : tf('Trust Score {ts} · {p}', { ts: f.trustScore, p: t(NOM_PALIER[f.palier!]) })}</Pill>
          </div>
          <div className="ht" style={{ marginTop: 12 }}>{f.nom}</div>
          <div className="hs">{tf('{e} · zones {z} · {v} {p}', { e: f.entreprise, z: f.zones.join(', '), v: t(VEHICULE[f.vehicule.type]), p: f.vehicule.plaque })}</div>
          {f.enMission && (
            <>
              <div className="hline"></div>
              <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div className="t12" style={{ opacity: 0.75 }}>{t('Mission en cours')}</div>
                  <div className="b8 t15 s4-mono">{f.enMission}</div>
                  {hors && <div className="t12" style={{ opacity: 0.75 }}>{tf('Hors connexion · dernière synchronisation à {h}', { h: quand(f.derniereSync, langue, false) })}</div>}
                </div>
                <Link className="btn sm white" to={chemin('paquets', { id: f.enMission })}><Icone nom="boxes" taille={16} /><span>{t('Voir le paquet')}</span></Link>
              </div>
            </>
          )}
          <div className="money4 admlg-m4x4">
            <M4 l={t('Paquets du jour')} v={f.missionsJour} icone="route" />
            <M4 l={t('Incidents')} v={f.incidents30j} s={t('30 derniers jours')} icone="triangle-alert" />
            <M4 l={t('Certification')} v={f.certification.quiz === null ? '—' : `${f.certification.quiz} / 20`} s={f.certification.le ? dateCourte(f.certification.le, langue) : undefined} icone="badge-check" />
            <M4 l={t('Étiquettes')} v={f.etiquettes ? `${f.etiquettes.consommees} / ${f.etiquettes.total}` : '—'} s={f.etiquettes?.plage} icone="tag" />
          </div>
        </div>
        <Panel titre={t('Trust Score livreur')} icone="star" a={{ t: t('Paliers'), to: chemin('paliers') }}>
          <div className="row" style={{ gap: 16 }}>
            <Anneau v={f.trustScore} max={100} taille={84} aria={t('Trust Score')} />
            <div className="grow t13 c3">{tf('Palier {p} · Confirmé ≥ {c} · Or ≥ {o}', { p: f.palier ? t(NOM_PALIER[f.palier]) : '—', c: PARAM.entreprises.seuils.Confirme, o: PARAM.entreprises.seuils.Or })}</div>
          </div>
        </Panel>
      </div>
      <div className="g g21">
        <Panel titre={t('Position de mission')} icone="navigation">
          {f.enMission ? (
            <>
              <p className="t13">{t('Visible seulement pendant une mission active, par la Direction et l’Opérations de la zone ; chaque consultation est journalisée.')}</p>
              <Link className="btn secondary mt10" to={chemin('carte', { livreur: f.id })}><Icone nom="map" taille={18} /><span>{t('Voir sur la carte opérationnelle')}</span></Link>
            </>
          ) : (
            <p className="t13 c3">{t('Aucune mission active : aucune position n’est affichée.')}</p>
          )}
        </Panel>
        <Panel titre={t('KYC et certification')} icone="badge-check">
          {f.pieces.map((p) => <Kv key={p.nature} k={t(p.nature)} v={<StatutPill t={p.statut === 'verifiee' ? 'Vérifiée' : p.statut === 'en_revue' ? 'En revue' : 'Manquante'} ton={p.statut === 'verifiee' ? 'green' : 'amber'} />} />)}
          <Kv k={t('Certification')} v={tf('{m} modules sur {t}', { m: f.certification.modules, t: f.certification.total })} />
          {f.reverification && <Note ton="amber" icone="camera" className="mt10">{tf('Nouvelle photo demandée : à envoyer avant le {d}, il continue de travailler jusque-là.', { d: dateCourte(f.reverification, langue) })}</Note>}
        </Panel>
      </div>
      <div className="g g2">
        <Panel titre={t('Équipement et étiquettes')} icone="package-open" a={{ t: t('Emballages'), to: chemin('emballages') }}>
          {f.etiquettes ? <Kv k={t('Plage d’étiquettes')} v={<span className="s4-mono">{f.etiquettes.plage}</span>} /> : <p className="t13 c3">{t('Aucune plage active.')}</p>}
          {f.etiquettes && <Kv k={t('Consommées')} v={`${f.etiquettes.consommees} / ${f.etiquettes.total}`} />}
          <Kv k={t('Véhicule')} v={`${t(VEHICULE[f.vehicule.type])} ${f.vehicule.plaque}`} />
        </Panel>
        <Panel titre={t('Incidents et sanctions')} icone="shield-check">
          <Li icone="triangle-alert" ton={f.incidents30j ? 'amber' : 'green'} t={f.incidents30j ? tf('{n} incident(s)', { n: f.incidents30j }) : t('Aucun incident')} s={t('30 derniers jours')} />
          <Li icone="gavel" ton={f.suspension ? 'red' : 'green'} t={f.suspension ? t('Suspendu') : t('Aucune sanction')} s={t('Un encaissement d’argent constaté serait une sanction de niveau 3')} to={chemin('sanctions')} />
          <Li icone="phone-off" ton="ink" t={t('Aucun numéro affiché')} s={t('Contact par la messagerie de la mission ou l’appel masqué')} />
          <div className="s4-actes">
            <BoutonGeste g={g} action="livreur.suspendre" objet={f.id} genre="ghost" sm resume={tf('Suspendre {n} : aucune nouvelle mission, il termine les colis sous sa garde ; {e} et le livreur voient le motif.', { n: f.nom, e: f.entreprise })} />
          </div>
        </Panel>
      </div>
      <Panel titre={t('Missions du jour et preuves')} icone="camera" className="mt16">
        {f.missions.length === 0 && <p className="t13 c3">{t('Aucune mission aujourd’hui.')}</p>}
        {f.missions.map((m) => <Li key={m.paquet} icone="route" ton={m.etat === 'livre' ? 'green' : m.etat === 'en_retard' || m.etat === 'incident' ? 'red' : 'or'} t={`${m.paquet}`} s={m.detail} to={chemin('paquets', { id: m.paquet })} />)}
      </Panel>
    </>
  )
}

