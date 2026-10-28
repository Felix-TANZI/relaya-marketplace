// ADM-P36 · Santé du système et maintenance (ADM-13 § 50). Structure du prototype : bandeau (service dégradé ou
// maintenance annoncée) avec « Déclarer une panne », résumé global, « Maintenances planifiées » et « Programmer une
// maintenance », « Services » (douze tuiles, voyant doublé d'un texte), « Files en attente », « Coût de l'IA »,
// latence de l’agrégateur, « Journal des appels aux services externes ». Déclarer une panne mène à l'écran Panne (décision
// humaine, S5) ; une maintenance s'annonce ADM-MAINTENANCE-PREAVIS-H à l'avance et jamais pendant le cycle des
// versements (jeudi soir, vendredi matin) : la source refuse (422). Réservé à la Direction.
import { useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Banniere, Courbe, Kv, Li, Panel, Pill, Px, Sec, St, Table, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { TableauSante } from '../../donnees/domaines/systeme'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { EtatLecture, useDate, useRaison } from '../ADM-12/commun-s6'

const ICONE: Record<string, string> = { Socle: 'server', Paiement: 'landmark', Messages: 'send', Logistique: 'truck', Catalogue: 'search', Confiance: 'id-card' }
const FILE: Record<string, [string, string]> = { preuves: ['Synchronisation des preuves', 'camera'], envois: ['Envois SMS, push, e-mail', 'send'], versements: ['Versements', 'banknote'] }

export default function Sante() {
  const surtitre = useSurtitre()
  const l = useLecture(() => source.systeme.tableauSante(), [])
  const d0 = l.donnees
  const degrades = (d0?.services ?? []).filter((x) => x.etat !== 'ok')
  const fonctions = useFonctions([
    { verbe: 'Déclarer', n: degrades.length, unite: ['service dégradé', 'services dégradés'], icone: 'siren', route: 'panne', params: { service: degrades[0]?.id }, alerte: true },
    { verbe: 'Relancer', n: d0?.tachesEnRetard ?? 0, unite: ['tâche en retard', 'tâches en retard'], icone: 'clock', route: 'taches' },
    { verbe: 'Programmer', n: (d0?.maintenances ?? []).filter((m) => m.etat === 'annoncee').length, unite: ['maintenance annoncée', 'maintenances annoncées'], icone: 'calendar-clock', onClick: () => document.getElementById('maintenance')?.scrollIntoView({ behavior: 'smooth' }) },
  ])
  return (
    <Ecran
      route="sante"
      kicker={surtitre}
      fonctions={fonctions}
    >
      <Px>
        <EtatLecture l={l} quoi="l’état des services">
          {(d) => <Corps d={d} />}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}

function Corps({ d }: { d: TableauSante }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const n = useHorloge()
  const degrades = d.services.filter((s) => s.etat !== 'ok')
  const prochaine = d.maintenances.filter((m) => m.etat === 'annoncee' && m.fin > n).sort((a, b) => a.debut - b.debut)[0]
  return (
    <>
      {degrades.map((s) => (
        <Banniere key={s.id} ton="amber" icone="triangle-alert" bouton={<Link className="btn sm secondary" to={chemin('panne', { service: s.id })}>{t('Déclarer une panne')}</Link>}>
          <b>{tf('{s} : {e}.', { s: t(s.nom), e: t(s.etat === 'lent' ? 'service dégradé' : 'service en panne') })}</b> {tf('Latence {l} ms · seuil {seuil} ms', { l: s.latenceMs, seuil: s.seuilMs })}
        </Banniere>
      ))}
      {prochaine && (
        <Banniere ton="acc" icone="wrench">
          <b>{t('Maintenance annoncée :')}</b> {tf('{d} · {s} — {m}', { d: date(prochaine.debut), s: t(prochaine.service), m: prochaine.motif })}
        </Banniere>
      )}
      <div className="g g21">
        <div className={'hero ' + (degrades.length ? 'amber' : 'night')} style={{ marginTop: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <span className="hk">{degrades.length ? tf('{n} service dégradé sur {total}', { n: degrades.length, total: d.services.length }) : t('Tous les services sont opérationnels')}</span>
            {d.demonstration && <Pill ton="dk" icone="flask-conical">{t('Données de démonstration')}</Pill>}
          </div>
          <div className="adme-m4">
            <div className="m4"><div className="l"><Icone nom="circle-check" taille={14} />{t('Services au vert')}</div><div className="v">{`${d.services.length - degrades.length} / ${d.services.length}`}</div></div>
            <div className="m4"><div className="l"><Icone nom="database" taille={14} />{t('Sauvegarde')}</div><div className="v" style={{ fontSize: 15 }}>{date(d.sauvegardes.derniere)}</div><div className="s">{tf('{g} Go · restauration testée {r}', { g: d.sauvegardes.tailleGo.toLocaleString('fr-FR'), r: date(d.sauvegardes.restaurationTesteeLe).split(' · ')[0] })}</div></div>
            <div className="m4"><div className="l"><Icone nom="bug" taille={14} />{t('Erreurs 24 h')}</div><div className="v">{d.erreurs24h}</div><div className="s">{t('suivi des erreurs')}</div></div>
            <Link className="m4" to={chemin('taches')} style={{ color: 'inherit', textDecoration: 'none' }}><div className="l"><Icone nom="clock" taille={14} />{t('Tâches')}</div><div className="v">{d.tachesEnRetard}</div><div className="s">{t('en retard ou en échec')}</div></Link>
          </div>
          {d.demonstration && <div className="hs mt12">{t('Ces données de démonstration n’existent jamais en production : le serveur refuse de les charger.')}</div>}
        </div>
        <Maintenances d={d} />
      </div>
      <Sec t={t('Services')} />
      <div className="g g4">
        {d.services.map((s) => (
          <div key={s.id} className={'adme-svc' + (s.etat !== 'ok' ? ' warn' : '')}>
            <div className="top">
              <span className="ic"><Icone nom={ICONE[s.couche] ?? 'server'} taille={18} /></span>
              <div className="grow">
                <div className="n">{t(s.nom)}</div>
                <div className="l">{`${t(s.couche)} · ${s.fournisseur}`}</div>
              </div>
            </div>
            <div className="mt8"><St t={t(s.etat === 'ok' ? 'Opérationnel' : s.etat === 'lent' ? 'Dégradé' : 'En panne')} ton={s.etat === 'ok' ? 'green' : s.etat === 'lent' ? 'amber' : 'red'} /></div>
            <div className="t12 c3 mt6">{tf('{l} ms · {d} % sur 30 jours', { l: s.latenceMs, d: s.disponibilite30j.toLocaleString('fr-FR') })}</div>
            <div className="t12 c3">{t(s.mesure)}</div>
          </div>
        ))}
      </div>
      <div className="g g3">
        <Panel titre={t('Files en attente')} icone="layers">
          {d.files.map((f) => (
            <div key={f.id} className="adme-ind">
              <span className="ic"><Icone nom={FILE[f.id][1]} taille={17} /></span>
              <div className="grow">
                <div className="t">{t(FILE[f.id][0])}</div>
                <div className="s">{f.plusVieuxMin === null ? t('rien en attente') : tf('plus ancien : {m} min · alerte au-delà de {s}', { m: f.plusVieuxMin, s: f.seuil })}</div>
              </div>
              <div className="v">{f.n}</div>
            </div>
          ))}
        </Panel>
        <Panel titre={t('Coût de l’IA')} icone="sparkles">
          <Kv k={t('Mesure de la consommation')} v={t(d.ia.mesure)} />
          <Kv k={t('Seuils d’internalisation')} v={d.ia.budget} />
          <Kv k={t('Serveur GPU')} v={t(d.ia.gpu)} />
        </Panel>
        <Panel titre={t('Latence des paiements · dernière heure')} icone="activity">
          <Courbe valeurs={d.latencePaiement} l={300} h={70} couleur="var(--amber)" />
          <div className="row t12 c3 mt6" style={{ justifyContent: 'space-between' }}>
            <span>{tf('{n} ms au plus', { n: Math.max(...d.latencePaiement) })}</span>
            <span>{tf('seuil : {s} ms', { s: d.services.find((s) => s.id === 'momo-mtn')?.seuilMs ?? 0 })}</span>
          </div>
        </Panel>
      </div>
      <Panel titre={t('Journal des appels aux services externes')} icone="scroll-text">
        <Table
          cle={(a) => `${a.le}-${a.appel}`}
          rows={d.appels}
          cols={[
            { k: 'h', t: t('Heure'), rendu: (a) => date(a.le).split(' · ')[1] },
            { k: 's', t: t('Service'), rendu: (a) => a.service },
            { k: 'a', t: t('Appel'), main: true, rendu: (a) => a.appel },
            { k: 'r', t: t('Résultat'), rendu: (a) => <St t={t(a.resultat === 'ok' ? 'Réussi' : a.resultat === 'lent' ? 'Lent' : 'Échec')} ton={a.resultat === 'ok' ? 'green' : a.resultat === 'lent' ? 'amber' : 'red'} /> },
            { k: 'd', t: t('Durée'), cls: 'r', rendu: (a) => `${a.dureeMs} ms` },
          ]}
          pied={<span>{t('Numéros et codes jamais écrits dans ce journal')}</span>}
        />
      </Panel>
    </>
  )
}

function Maintenances({ d }: { d: TableauSante }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const raison = useRaison()
  const [service, setService] = useState(d.services[0]?.nom ?? '')
  const [jour, setJour] = useState('')
  const [heure, setHeure] = useState('22:00')
  const [duree, setDuree] = useState(60)
  const [motif, setMotif] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [annuler, setAnnuler] = useState<string | null>(null)
  const programmer = async () => {
    if (!jour) return setMsg({ ok: false, t: t('Choisissez le jour et l’heure.') })
    const [a, m, j] = jour.split('-').map(Number)
    const [h, mi] = heure.split(':').map(Number)
    const debut = Date.UTC(a, m - 1, j, h - 1, mi)
    const r = await source.systeme.programmerMaintenance({ service, debut, dureeMin: duree, motif })
    if (r.ok) {
      setMotif('')
      setMsg({ ok: true, t: tf('Maintenance {id} annoncée aux six applications.', { id: r.id }) })
    } else setMsg({ ok: false, t: raison(r.raison, { preavis: tf('Une maintenance s’annonce {h} h à l’avance au moins.', { h: d.preavisH }), creneau_interdit: tf('Créneau interdit (cycle des versements) : {c}.', { c: d.creneauxInterdits.join(', ') }), inconnu: 'Service inconnu.' }) })
  }
  return (
    <Panel titre={t('Maintenances planifiées')} icone="calendar-clock" id="maintenance">
      {d.maintenances.map((m) => (
        <Li
          key={m.id}
          icone="wrench"
          ton={m.etat === 'annoncee' ? 'blue' : 'ink'}
          t={`${m.id} · ${t(m.service)}`}
          s={tf('{d} → {f} · {m} · annoncée par {p}', { d: date(m.debut), f: date(m.fin).split(' · ')[1], m: m.motif, p: m.par })}
          droite={m.etat === 'annoncee' ? <button type="button" className="btn sm ghost" onClick={() => setAnnuler(m.id)}>{t('Annuler')}</button> : <St t={t(m.etat === 'annulee' ? 'Annulée' : 'Faite')} ton="ink" />}
        />
      ))}
      <div className="adme-k mt14">{t('Programmer une maintenance')}</div>
      <label className="fld mt8">
        <span className="fld-t">{t('Service')}</span>
        <span className="inp">
          <select value={service} onChange={(e) => setService(e.target.value)}>
            {d.services.map((s) => <option key={s.id} value={s.nom}>{t(s.nom)}</option>)}
          </select>
        </span>
      </label>
      <div className="g g3" style={{ marginTop: 0 }}>
        <label className="fld mt8"><span className="fld-t">{t('Jour')}</span><span className="inp"><input type="date" value={jour} onChange={(e) => setJour(e.target.value)} /></span></label>
        <label className="fld mt8"><span className="fld-t">{t('Heure (Yaoundé)')}</span><span className="inp"><input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} /></span></label>
        <label className="fld mt8"><span className="fld-t">{t('Durée (min)')}</span><span className="inp"><input type="number" min={15} step={15} value={duree} onChange={(e) => setDuree(Number(e.target.value))} /></span></label>
      </div>
      <label className="fld mt8">
        <span className="fld-t">{t('Motif écrit (obligatoire, journalisé)')}</span>
        <span className="inp"><textarea rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} /></span>
      </label>
      <p className="t12 c3 mt6">{tf('Trois contrôles : annonce {h} h avant au moins · jamais {c} · annonce envoyée aux six applications.', { h: d.preavisH, c: d.creneauxInterdits.join(', ') })}</p>
      {msg && <p className={msg.ok ? 't13 cg b7 mt6' : 'e-erreur mt6'} role={msg.ok ? 'status' : 'alert'}>{msg.t}</p>}
      <div className="adme-btns">
        <button type="button" className="btn primary" onClick={() => void programmer()}>
          <Icone nom="calendar-plus" taille={18} />
          <span>{t('Programmer')}</span>
        </button>
      </div>
      <DecisionMotivee
        ouverte={!!annuler}
        fermer={() => setAnnuler(null)}
        titre={t('Annuler la maintenance')}
        resume={t('L’annulation est annoncée aux six applications et journalisée.')}
        libelle="Annuler la maintenance"
        danger
        envoyer={async (m) => {
          const r = await source.systeme.annulerMaintenance(annuler!, m)
          return r.ok ? null : raison(r.raison, { inconnu: 'Maintenance introuvable ou déjà passée.' })
        }}
      />
    </Panel>
  )
}
