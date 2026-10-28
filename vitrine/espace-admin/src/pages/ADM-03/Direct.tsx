// Vue d'ensemble en direct (page ajoutée « direct », liée depuis la File d'action) : la plateforme maintenant, pour le
// rôle et ses zones — commandes du jour, livraisons au-delà de SLA-ZONE-H, colis bloqués, colis en garde et capacité des
// relais (alerte à RELAIS-CAPACITE-ALERTE), incidents, litiges, cartes en retard, santé du système (Direction).
// Chaque chiffre mène à sa liste, filtrée ; rien n'est décidé ici (lecture). Relue à chaque changement des données
// (gestes ici ou dans les autres espaces : événement blv:donnees) et toutes les 30 s.
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Heure } from '../../composants/LigneJournal'
import { Perimetre } from '../../composants/Perimetre'
import { BarresH, Kpi, Li, Note, Panel, Pill, Sec, Vide, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRouteOuverte, useSession } from '../../session'
import { Plie, Quand, useFonctionsS } from './kit'
import { REGLES_S1 } from './regles'
import './s1.css'

const ESPACE: Record<string, [string, 'acc' | 'or' | 'blue' | 'green' | 'violet' | 'ink']> = { client: ['Client', 'blue'], vendeur: ['Vendeur', 'or'], entreprise: ['Entreprise', 'violet'], livreur: ['Livreur', 'green'], relais: ['Relais', 'acc'], admin: ['Console', 'ink'] }
const ICONE: Record<string, string> = { jour: 'shopping-bag', retard: 'timer', bloques: 'package-x', garde: 'package-check', litiges: 'scale', files: 'alarm-clock' }

export default function Direct() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const surtitre = useSurtitre()
  const ouverte = useRouteOuverte()
  const vue = useLecture(() => source.direct.vue(), [s.role, s.agent?.id])
  const { relire } = vue
  useEffect(() => {
    const x = setInterval(relire, 30_000)
    return () => clearInterval(x)
  }, [relire])
  const v = vue.donnees
  const n = (id: string) => v?.indicateurs.find((i) => i.id === id)?.valeur ?? 0
  const fonctions = useFonctionsS('direct', [
    { verbe: 'Relancer', n: n('retard'), unite: ['livraison en retard', 'livraisons en retard'], icone: 'timer', route: 'commandes', params: { filtre: 'retard' }, alerte: true },
    { verbe: 'Débloquer', n: n('bloques'), unite: ['colis', 'colis'], icone: 'package-x', route: 'paquets', params: { etat: 'incident' }, alerte: true },
    { verbe: 'Traiter', n: n('files'), unite: ['carte en retard', 'cartes en retard'], icone: 'alarm-clock', route: 'file', params: { filtre: 'retard' } },
    { verbe: 'Suivre', n: n('jour'), unite: ['commande du jour', 'commandes du jour'], icone: 'shopping-bag', route: 'commandes', params: { filtre: 'jour' } },
  ])
  return (
    <Ecran
      route="direct"
      kicker={surtitre}
      fonctions={v ? fonctions : undefined}
      actions={
        <Link className="btn secondary" to={chemin('file')}>
          <Icone nom="inbox" taille={18} />
          <span>{t('File d’action')}</span>
        </Link>
      }
    >
      <Perimetre route="direct" />
      {vue.erreur && (
        <Note ton="red" icone="circle-alert" role="alert">
          {t('La vue d’ensemble n’a pas pu être lue.')}{' '}
          <button type="button" className="btn sm secondary" onClick={relire}>
            {t('Réessayer')}
          </button>
        </Note>
      )}
      {!v && !vue.erreur && (
        <p className="t13 c3" aria-busy="true">
          {t('Chargement…')}
        </p>
      )}
      {v && (
        <>
          <div className="g g3 s1-ind">
            {v.indicateurs.map((i) => (
              <Kpi key={i.id} k={tf(i.libelle, { h: REGLES_S1.livraisonH })} v={i.unite === 'francs' ? F(i.valeur) : i.valeur} u={i.unite === 'francs' ? 'F' : i.unite === 'pourcent' ? '%' : undefined} s={i.sous} icone={ICONE[i.id] ?? 'activity'} iton={i.ton === 'alerte' ? 'red' : i.ton === 'ok' ? 'green' : ''} to={chemin(i.route, i.params)} className={i.ton === 'alerte' ? 'alerte' : undefined} aria={tf('{k} : {v}, voir la liste', { k: tf(i.libelle, { h: REGLES_S1.livraisonH }), v: i.valeur })} />
            ))}
          </div>
          {v.escrow !== null && (
            <div className="admA-day" style={{ gridTemplateColumns: 'minmax(0,260px)' }}>
              <Link className="d n" to={chemin('escrow')} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="k">{t('Escrow bloqué')}</div>
                <div className="v">{`${F(v.escrow)} F`}</div>
                <div className="s">{t('argent des clients, chez l’agrégateur')}</div>
              </Link>
            </div>
          )}
          <Panel titre={t('Activité en direct')} icone="activity" className="mt16">
            {(v.activite ?? []).length === 0 ? (
              <div className="t13 c3">{t('Rien de nouveau')}</div>
            ) : (
              <ul className="s1-act">
                {v.activite.map((a) => {
                  const corps = (
                    <>
                      <Pill ton={ESPACE[a.espace]?.[1] ?? 'ink'} sm>
                        {t(ESPACE[a.espace]?.[0] ?? a.espace)}
                      </Pill>
                      <span className="grow">{a.quoi}</span>
                      <span className="t12 c3 nw">
                        <Heure le={a.le} />
                      </span>
                    </>
                  )
                  return <li key={a.cle}>{a.route ? <Link to={chemin(a.route, a.params)}>{corps}</Link> : <div>{corps}</div>}</li>
                })}
              </ul>
            )}
          </Panel>
          <Sec t={t('Zones')} a={ouverte('zones') ? t('Pilotage des zones') : undefined} to={ouverte('zones') ? chemin('zones') : undefined} />
          <div className="s1-zones">
            {v.zones.filter((z) => z.exploitee || z.commandes > 0).map((z) => (
              <Link key={z.code} className={'s1-zone' + (z.exploitee ? '' : ' off')} to={chemin('commandes', { zone: z.code })}>
                <div className="row" style={{ gap: 6 }}>
                  <b>{`${z.code} · ${z.nom}`}</b>
                  {!z.exploitee && (
                    <Pill ton="ink" sm>
                      {t('Non exploitée')}
                    </Pill>
                  )}
                </div>
                <div className="t12 c3 mt4">{tf('{n} commande(s) · {r} en retard · {p} relais saturé(s)', { n: z.commandes, r: z.enRetard, p: z.relaisSatures })}</div>
              </Link>
            ))}
          </div>
          <div className="g g2" style={{ marginTop: 16 }}>
            {v.relais.length > 0 && (
              <Panel titre={t('Colis en garde et capacité des relais')} icone="package-check" a={{ t: t('Points relais'), to: chemin('relais') }}>
                <BarresH largeurLibelle={170} largeurValeur={70} lignes={v.relais.map((r) => ({ l: r.nom, v: r.colis, max: r.capacite, r: `${r.colis} / ${r.capacite}`, ton: 100 * r.colis >= REGLES_S1.relaisAlertePct * r.capacite ? 'red' : 'acc', label: tf('{nom} : {n} colis sur {max}', { nom: r.nom, n: r.colis, max: r.capacite }) }))} />
                <Plie titre={t('Seuil d’alerte')}>{tf('À {p} % de sa capacité, un relais passe en alerte ; plein, les nouveaux envois vers lui sont suspendus.', { p: REGLES_S1.relaisAlertePct })}</Plie>
              </Panel>
            )}
            <Panel titre={t('Incidents')} icone="siren">
              {v.incidents.length === 0 ? (
                <Vide icone="check-check" t={t('Aucun incident')} />
              ) : (
                v.incidents.map((i) => <Li key={i.id} icone="triangle-alert" ton="red" t={`${i.id}${i.zone ? ` · ${i.zone}` : ''}`} s={<>{i.quoi} · <Quand le={i.le} /></>} to={chemin(i.route, i.params)} />)
              )}
            </Panel>
            {v.sante && (
              <Panel titre={t('Santé du système')} icone="activity" a={{ t: t('Détail'), to: chemin('sante') }}>
                {v.sante.map((x) => (
                  <div key={x.nom} className="kv">
                    <span className="k">
                      <span className={'s1-dot ' + x.etat}></span>
                      {x.nom}
                    </span>
                    <span className="v">{t(x.etat === 'ok' ? 'Normal' : x.etat === 'lent' ? 'Lent' : 'En panne')}</span>
                  </div>
                ))}
              </Panel>
            )}
          </div>
          <p className="t12 c3 mt14">
            {t('Mis à jour à')} <Quand le={v.le} /> · {t('relu toutes les 30 secondes et à chaque geste')}
          </p>
        </>
      )}
    </Ecran>
  )
}
