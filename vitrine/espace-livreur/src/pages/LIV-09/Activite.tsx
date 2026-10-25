// LIV-P25 · Mes gains — activité et relevés (DP-66 : une seule page « Mes gains » ; LIV-09-R02, R16 à R21, LIV-P25R-01 à R03, LIV-STA-06, DED-12, I-04).
// Structure du prototype (route('activite') : en-tête secondaire, onglet Moi) : segments Jour · Semaine · Mois (mémorisés
// sur l'appareil), héros nuit (missions validées, ou gains selon le tarif de l'entreprise), « Vous êtes payé par … »
// toujours visible (BelivaY ne paie jamais un livreur partenaire et n'affiche jamais ce qu'elle paie à l'entreprise).
// - Jour : tableau des missions validées par type (colis, ou tarif et gain si l'entreprise affiche son tarif par
//   mission, calculés par le serveur), paquet en cours en orange, tuiles Ramassés · Déposés · Remis, aucun argent ;
// - Semaine : barres des missions validées par jour, évolution jour par jour ;
// - Mois : anneau par type, missions en revue (date de décision attendue, hors compteurs), changement d'entreprise ;
// - hors connexion : bandeau, derniers compteurs reçus, gestes en file à part (ils comptent une fois validés).
// - Relevés (?vue=releves ; l'ancienne page « Mes relevés », /gains, y mène) : relevé de chaque semaine arrêté le
//   vendredi, en PDF ou en CSV, semaines précédentes (Releves.tsx).
// Enrichissements : chiffres qui défilent (M9), gains masqués au toucher (réglage « Masquer mes gains », M20), journée
// sans mission expliquée (M7).
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { debutDuJour } from '../../calculs/temps'
import { Ecran } from '../../composants/coque'
import { Compteur, Masquable } from '../../composants/enrichis'
import { Icone } from '../../composants/Icone'
import { Foot, Hint, HorsConnexion, Kv, Li, Note, Pill, Sec, Seg } from '../../composants/proto'
import { chemin } from '../../config/pages'
import { enAttente, useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import type { Activite as DonneesActivite, Periode, TypeMission } from '../../donnees/domaines/activite'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Chargement, ErreurLecture } from '../LIV-08/commun'
import { Barres, Donut } from './graphes'
import { Releves } from './Releves'
import './liv09.css'

const CLE = 'blv_l_activite_onglet'
const TYPES: Record<TypeMission, string> = {
  ramassage: 'Ramassages',
  depot: 'Dépôts au relais',
  domicile: 'Remise à domicile',
  retour: 'Retours, transferts',
}
const COULEURS: Record<TypeMission, string> = { ramassage: 'var(--acc)', depot: 'var(--or)', domicile: 'var(--gold)', retour: 'var(--blue)' }

export default function Activite() {
  const { t, tf, langue } = usePreferences()
  const en = useEnLigne()
  const file = useFile()
  const [params, setParams] = useSearchParams()
  const releves = params.get('vue') === 'releves'
  const [periode, setPeriodeEtat] = useState<Periode>(() => {
    try {
      const v = localStorage.getItem(CLE)
      return v === 'semaine' || v === 'mois' ? v : 'jour'
    } catch {
      return 'jour'
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(CLE, periode)
    } catch {
      /* stockage refusé */
    }
  }, [periode])
  // Jour, semaine, mois : la période mémorisée ; Relevés : une vue de l'adresse (lien de notification, ancienne adresse).
  const setPeriode = (v: Periode) => {
    setPeriodeEtat(v)
    if (releves) setParams({}, { replace: true })
  }
  const a = useLecture(() => source.activite.activite(periode), [periode])
  const d = a.donnees && a.donnees.periode === periode ? a.donnees : null
  const enFile = enAttente(file)
  const km = (n: number) => `${n.toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
  return (
    <Ecran route="activite" proto action="aucune">
      {!en && d && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> · {tf('dernières données téléchargées à {h}. Les compteurs se mettent à jour au retour du réseau.', { h: heure(d.calculeA, langue) })}
        </HorsConnexion>
      )}
      <Seg
        label={t('Période')}
        items={(
          [
            ['jour', 'Jour'],
            ['semaine', 'Semaine'],
            ['mois', 'Mois'],
          ] as const
        )
          .map(([v, lib]) => ({ t: t(lib), on: !releves && periode === v, onClick: () => setPeriode(v) }))
          .concat({ t: t('Relevés'), on: releves, onClick: () => setParams({ vue: 'releves' }, { replace: true }) })}
      />
      {releves ? <Releves /> : a.erreur ? <ErreurLecture relire={a.relire} /> : !d ? <Chargement lignes={3} /> : periode === 'semaine' ? <Semaine d={d} km={km} /> : periode === 'mois' ? <Mois d={d} km={km} /> : <Jour d={d} km={km} enFile={enFile.length} en={en} />}
    </Ecran>
  )
}

/** « Vous êtes payé par … » (LIVC_PAYER du prototype) : toujours visible. */
function Payeur({ e }: { e: string }) {
  const { t } = usePreferences()
  return (
    <div className="livc-pay">
      <Icone nom="building-2" taille={18} />
      <div>
        {t('Vous êtes payé par')} <b>{e}</b>
        {t(', selon votre accord avec elle.')}
      </div>
    </div>
  )
}

function Hm({ items }: { items: [string | number, string][] }) {
  return (
    <div className="livc-hm l9-hm">
      {items.map(([v, l]) => (
        <div key={l}>
          <b>{v}</b>
          <span>{l}</span>
        </div>
      ))}
    </div>
  )
}

function Jour({ d, km, enFile, en }: { d: DonneesActivite; km: (n: number) => string; enFile: number; en: boolean }) {
  const { t, tf, langue } = usePreferences()
  const tarif = d.affichage === 'tarif' && d.gains !== null
  const colis = d.missions.reduce((s, m) => s + m.colis, 0)
  const enCours = d.enCours && (
    <div className="card tight">
      <Li icone="route" ton="or" t={tf('{id} · en cours', { id: d.enCours.paquetId })} s={tf(d.enCours.arretsFaits > 1 ? '{n} missions validées sur {total} ; les suivantes comptent à leur validation par le serveur' : '{n} mission validée sur {total} ; les suivantes comptent à leur validation par le serveur', { n: d.enCours.arretsFaits, total: d.enCours.arretsTotal })} droite={<Pill ton="or" sm>{t('En cours')}</Pill>} vers={chemin('tournee')} />
    </div>
  )
  const zeroEspece = (
    <Note ton="ink" icone="hand-coins">
      {t('Aucun argent ne passe par vous : le client a tout payé en ligne. BelivaY ne paie jamais un livreur partenaire et n’affiche jamais le prix qu’elle paie à votre entreprise.')}
    </Note>
  )
  return (
    <>
      <div className="hero night">
        <div className="hk">
          {jourLong(debutDuJour(d.a), langue)} · {en ? heure(d.calculeA, langue) : tf('données de {h}', { h: heure(d.calculeA, langue) })}
        </div>
        {tarif ? (
          <>
            <div className="t13 b7 l9-hero-l">{t('Gains du jour, selon le tarif de votre entreprise')}</div>
            <div className="livc-big" style={{ marginTop: 2 }}>
              <Masquable texte={F(d.gains!)} quoi="Gains du jour" />
            </div>
            <Hm
              items={[
                [d.totalMissions, d.totalMissions > 1 ? t('missions validées') : t('mission validée')],
                [d.colis.ramasses, t('colis ramassés')],
                [km(d.distanceKm), t('parcourus')],
              ]}
            />
          </>
        ) : (
          <>
            <div className="livc-big">
              <Compteur valeur={d.totalMissions} />
              <small>{d.totalMissions > 1 ? t('missions validées aujourd’hui') : t('mission validée aujourd’hui')}</small>
            </div>
            {d.totalMissions === 0 && !d.enCours && <div className="hs">{t('Aucune mission validée pour l’instant : une mission compte dès que le serveur a reçu toutes ses preuves.')}</div>}
            <div className="hs">
              {tf('{e} a choisi d’afficher un', { e: d.payePar })} <b>{t('compteur de missions')}</b>
              {t(', sans montant.')}
            </div>
            <Hm
              items={[
                [d.colis.ramasses, t('colis ramassés')],
                [d.colis.deposes + d.colis.remis, t('déposés ou remis')],
                [km(d.distanceKm), t('parcourus')],
              ]}
            />
          </>
        )}
      </div>
      <Payeur e={d.payePar} />
      <Sec titre={t('Missions validées par type')} />
      <div className="card">
        <table className="livc-kit">
          <thead>
            <tr>
              <th>{t('Mission')}</th>
              <th>{t('Nombre')}</th>
              {tarif ? (
                <>
                  <th>{tf('Tarif {e}', { e: d.payePar })}</th>
                  <th>{t('Gain')}</th>
                </>
              ) : (
                <th>{t('Colis')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {d.missions.map((l) => (
              <tr key={l.type}>
                <td>{t(TYPES[l.type])}</td>
                <td>{l.nombre}</td>
                {tarif ? (
                  <>
                    <td>{l.tarif !== null ? F(l.tarif) : '—'}</td>
                    <td>{l.gain !== null ? F(l.gain) : '—'}</td>
                  </>
                ) : (
                  <td>{l.colis}</td>
                )}
              </tr>
            ))}
            <tr>
              <td>
                <b>{t('Total')}</b>
              </td>
              <td>
                <b>{d.totalMissions}</b>
              </td>
              {tarif ? (
                <>
                  <td></td>
                  <td>
                    <b>{F(d.gains!)}</b>
                  </td>
                </>
              ) : (
                <td>
                  <b>{colis}</b>
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
      {enFile > 0 && (
        <div className="card tight">
          <Li icone="cloud-off" ton="amber" t={enFile > 1 ? tf('{n} gestes en file d’envoi', { n: enFile }) : t('1 geste en file d’envoi')} s={t('Preuves en file d’envoi : la mission comptera quand le serveur l’aura validée')} droite={<Pill ton="amber" sm>{t('En file')}</Pill>} vers={chemin('synchronisation')} />
        </div>
      )}
      {enCours}
      {tarif ? (
        <Note ton="ink" icone="building-2">
          {tf('Tarif par mission fixé par {e} pour son livreur. C’est un accord entre vous et elle : BelivaY ne le fixe pas et ne le paie pas.', { e: d.payePar })}
        </Note>
      ) : (
        <div className="tiles t3">
          <div className="tile">
            <div className="tk">{t('Ramassés')}</div>
            <div className="tv">{d.colis.ramasses}</div>
            <div className="ts">{t('colis')}</div>
          </div>
          <div className="tile acc">
            <div className="tk">{t('Déposés')}</div>
            <div className="tv">{d.colis.deposes}</div>
            <div className="ts">{t('au relais')}</div>
          </div>
          <div className="tile">
            <div className="tk">{t('Remis')}</div>
            <div className="tv">{d.colis.remis}</div>
            <div className="ts">{t('à domicile')}</div>
          </div>
        </div>
      )}
      {zeroEspece}
      <Foot icone={en ? 'wifi' : 'wifi-off'}>{en ? tf('Connecté · compteurs à jour à {h}', { h: heure(d.calculeA, langue) }) : tf('Hors connexion · dernière synchronisation à {h}', { h: heure(d.calculeA, langue) })}</Foot>
    </>
  )
}

function Semaine({ d, km }: { d: DonneesActivite; km: (n: number) => string }) {
  const { t, tf, langue } = usePreferences()
  const actifs = d.parJour.filter((j) => j.missions > 0 || j.jour === d.a)
  return (
    <>
      <div className="hero night">
        <div className="hk">{tf('Semaine du {de} au {a}', { de: jourCourt(debutDuJour(d.de), langue), a: jourLong(debutDuJour(d.a), langue) })}</div>
        <div className="livc-big">
          {d.totalMissions}
          <small>{d.totalMissions > 1 ? t('missions validées') : t('mission validée')}</small>
        </div>
        <div className="hs">
          {d.enRevue.length === 0 ? t('Aucune mission en revue.') : d.enRevue.length > 1 ? tf('{n} missions en revue, hors compteurs.', { n: d.enRevue.length }) : t('1 mission en revue, hors compteurs.')} {tf('Compteur arrêté à {h}.', { h: heure(d.calculeA, langue) })}
        </div>
        <Hm
          items={[
            [d.colis.ramasses, t('colis ramassés')],
            [d.colis.deposes + d.colis.remis, t('déposés ou remis')],
            [km(d.distanceKm), t('parcourus')],
          ]}
        />
      </div>
      <Sec titre={t('Missions validées par jour')} />
      <div className="card">
        <Barres label={d.parJour.map((j) => `${jourCourt(debutDuJour(j.jour), langue)} : ${j.missions}`).join(', ')} data={d.parJour.map((j) => ({ l: jourCourt(debutDuJour(j.jour), langue).slice(0, 3), v: j.missions, on: j.jour === d.a }))} />
        <Hint icone="info">{tf('Une mission compte une fois validée par le serveur (preuves complètes). Aujourd’hui : compté jusqu’à {h}.', { h: heure(d.calculeA, langue) })}</Hint>
      </div>
      <Sec titre={t('Évolution')} />
      <div className="card tight">
        {actifs
          .slice()
          .reverse()
          .map((j) => (
            <Li
              key={j.jour}
              icone="calendar-days"
              ton={j.jour === d.a ? 'or' : 'acc'}
              t={j.jour === d.a ? tf('{j} · en cours', { j: jourLong(debutDuJour(j.jour), langue) }) : jourLong(debutDuJour(j.jour), langue)}
              s={tf('{c} colis ramassés · {km}', { c: j.colis, km: km(j.km) })}
              droite={<span className="rv">{j.missions}</span>}
            />
          ))}
      </div>
      <Payeur e={d.payePar} />
    </>
  )
}

function Mois({ d, km }: { d: DonneesActivite; km: (n: number) => string }) {
  const { t, tf, langue } = usePreferences()
  const mois = new Date(debutDuJour(d.a) + 12 * 3600_000).toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', { month: 'long', year: 'numeric', timeZone: 'Africa/Douala' })
  const nom = mois.charAt(0).toUpperCase() + mois.slice(1)
  return (
    <>
      <div className="hero night">
        <div className="hk">{nom}</div>
        <div className="livc-big">
          {d.totalMissions}
          <small>{d.totalMissions > 1 ? t('missions validées') : t('mission validée')}</small>
        </div>
        <div className="hs">{tf('Du {de} au {a}, comptées une fois validées par le serveur.', { de: jourCourt(debutDuJour(d.de), langue), a: jourLong(debutDuJour(d.a), langue) })}</div>
        <Hm
          items={[
            [d.colis.ramasses, t('colis ramassés')],
            [d.enRevue.length, t('en revue')],
            [km(d.distanceKm), t('parcourus')],
          ]}
        />
      </div>
      <Sec titre={t('Missions validées par type')} />
      <div className="card">
        <div className="row l9-donut" style={{ gap: 16 }}>
          <Donut parts={d.missions.map((m) => ({ v: m.nombre, couleur: COULEURS[m.type] }))} centre={d.totalMissions} sous={t('missions')} label={d.missions.map((m) => `${t(TYPES[m.type])} : ${m.nombre}`).join(', ')} />
          <div className="grow">
            {d.missions.map((m) => (
              <Kv
                key={m.type}
                k={
                  <>
                    <i className="l9-puce" style={{ background: COULEURS[m.type] }}></i>
                    {t(TYPES[m.type])}
                  </>
                }
                v={m.nombre}
              />
            ))}
          </div>
        </div>
      </div>
      <Sec titre={tf('Missions en revue · {n}', { n: d.enRevue.length })} />
      <div className="card">
        {d.enRevue.length === 0 ? (
          <Li icone="circle-check" ton="green" t={t('Aucune mission en revue')} s={t('Toutes vos preuves sont complètes et validées par le serveur')} />
        ) : (
          d.enRevue.map((x) => (
            <Li
              key={x.mission}
              icone="scale"
              ton="amber"
              t={x.mission}
              s={tf('{motif} · décision attendue le {d}', { motif: t(x.motif), d: jourLong(debutDuJour(x.decisionAttendue), langue) })}
              droite={
                <Pill ton="amber" sm>
                  {t('Dossier')}
                </Pill>
              }
              vers={chemin('historique', { mission: x.mission })}
            />
          ))
        )}
      </div>
      <Note ton="ink" icone="info">
        {tf('Une mission n’est comptée qu’une fois validée par le serveur (preuves complètes). En revue depuis plus de 7 jours, elle le reste : {e} est relancée et vous voyez la date de décision attendue.', { e: d.payePar })}
      </Note>
      <Payeur e={d.payePar} />
      <Note ton="ink" icone="history">
        {t('Si vous changez un jour d’entreprise, vous gardez l’historique de vos missions ; les gains affichés restent ceux de l’entreprise d’origine.')}
      </Note>
    </>
  )
}
