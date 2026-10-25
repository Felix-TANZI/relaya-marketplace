// ADM-P35 · Rapports et indicateurs (ADM-13 § 49). Structure du prototype : « Revenu BelivaY du jour », « Tendance de
// la semaine », « Logistique », « Marge par commande », « Qualité », « Coûts variables » ; rapport du lundi (?vue=lundi :
// aperçu, destinataires, rapports envoyés). Chaque indicateur a une définition écrite (formule, source, période) au
// survol ; calculé par la source sur des faits du jour et de la zone ; « échantillon insuffisant » sous
// RAPPORT-ECHANTILLON-MIN, sans décision automatique. Chaque rôle voit son périmètre (Opérations : sa zone,
// logistique ; Finance : activité et coûts ; Support, Médiation, Vérification : qualité). Le total payé par les clients
// n'est jamais présenté comme le chiffre d'affaires.
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { ExportSigne } from '../../composants/ExportSigne'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { Banniere, Choix, Courbe, Kpi, Kv, Li, Note, Panel, Pill, Px, Table, exporterPdf, useSurtitre } from '../../composants/prototype'
import { NOM_ROLE } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { Indicateur, TableauRapports } from '../../donnees/domaines/systeme'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { Def, EtatLecture, useDate } from '../ADM-12/commun-s6'

const ICONE: Record<string, string> = { delai: 'timer', sous5h: 'gauge', remplissage: 'boxes', nonPris: 'package-x', pertes: 'package-open', ramassage: 'route', retrait: 'store', litigesVendeur: 'scale', nonRetires: 'package-check', emballageColis: 'package', litiges100: 'scale', arbitrage: 'hourglass', rembAuto: 'undo-2', avis: 'star', smsCmd: 'message-square', momo: 'smartphone', emballages: 'package-open', ia: 'sparkles' }

export function useValeur() {
  const { langue } = usePreferences()
  return (v: number | null, unite: string) => {
    if (v === null) return '—'
    const n = unite === 'F' ? F(Math.round(v)) : v.toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR', { maximumFractionDigits: 1 })
    return unite ? `${n} ${unite}` : n
  }
}

function Ind({ i }: { i: Indicateur }) {
  const { t } = usePreferences()
  const valeur = useValeur()
  return (
    <div className="adme-ind">
      <span className="ic"><Icone nom={ICONE[i.id] ?? 'chart-column'} taille={17} /></span>
      <div className="grow">
        <div className="t"><Def t={i.libelle} def={i.definition} /></div>
        {i.echantillonInsuffisant && (
          <div className="s">
            <span className="adme-ins"><Icone nom="triangle-alert" taille={13} />{t('Échantillon insuffisant')}</span>
          </div>
        )}
      </div>
      <div className="v">{valeur(i.valeur, i.unite)}</div>
    </div>
  )
}

export default function Rapports() {
  const { t, tf } = usePreferences()
  const surtitre = useSurtitre()
  const [params, setParams] = useSearchParams()
  const vue = params.get('vue')
  const periode = (params.get('periode') ?? 'jour') as TableauRapports['periode']
  const zone = params.get('zone')
  const l = useLecture(() => source.systeme.rapports({ periode: vue === 'lundi' ? '7j' : periode, zone }), [periode, zone, vue])
  const poser = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }
  const fonctions = useFonctions([
    { verbe: 'Lire', n: null, unite: ['rapport du lundi', 'rapports du lundi'], icone: 'calendar-check', route: 'rapports', params: { vue: 'lundi' } },
    { verbe: 'Revoir', n: (l.donnees?.zones ?? []).length, unite: ['zone', 'zones'], icone: 'map-pinned', route: 'zones' },
    { verbe: 'Exporter', n: null, unite: ['rapport', 'rapports'], icone: 'download', route: 'export', droit: 'export' },
  ])
  return (
    <Ecran
      route="rapports"
      titre={vue === 'lundi' ? t('Rapport du lundi') : undefined}
      retour={vue === 'lundi' ? chemin('rapports') : undefined}
      kicker={surtitre}
      fonctions={vue === 'lundi' ? undefined : fonctions}
      actions={
        vue === 'lundi' ? (
          <Link className="btn secondary" to={chemin('rapports')}>
            <Icone nom="layout-dashboard" taille={18} />
            <span>{t('Tableau du jour')}</span>
          </Link>
        ) : (
          <>
            <Link className="btn secondary" to={chemin('rapports', { vue: 'lundi' })}>
              <Icone nom="calendar-clock" taille={18} />
              <span>{t('Rapport du lundi')}</span>
            </Link>
            {l.donnees && (
              <ExportSigne
                nom={`indicateurs-${periode}.csv`}
                objet={`Indicateurs · ${periode}${zone ? ' · ' + zone : ''}`}
                entetes={['indicateur', 'valeur', 'unite', 'definition']}
                lignes={() => l.donnees!.parties.flatMap((p) => l.donnees![p]).map((i) => [i.libelle, i.valeur, i.unite, i.definition])}
              />
            )}
          </>
        )
      }
    >
      <Px>
        <Perimetre route="rapports" />
        <EtatLecture l={l} quoi="les indicateurs">
          {(d) => (vue === 'lundi' ? <Lundi d={d} /> : (
            <>
              <div className="row wrap mt10" style={{ gap: 10, alignItems: 'center' }}>
                <Choix forme="seg" aria={t('Période')} actif={periode} choisir={(v) => poser('periode', v === 'jour' ? '' : v)} items={[{ id: 'jour', t: t('Aujourd’hui') }, { id: '7j', t: t('7 jours') }, { id: '30j', t: t('30 jours') }]} />
                {d.zones.length > 1 && (
                  <label className="flt">
                    <Icone nom="map-pinned" taille={15} />
                    <select value={zone ?? ''} onChange={(e) => poser('zone', e.target.value)} aria-label={t('Zone')}>
                      <option value="">{t('Toutes vos zones')}</option>
                      {d.zones.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </label>
                )}
                <span className="t12 c3">{tf('Données arrêtées à {h}', { h: new Date(d.arreteLe + 3600_000).toISOString().slice(11, 16).replace(':', ' h ') })}</span>
              </div>
              {!d.parties.length && (
                <Note ton="ink" icone="footprints" className="mt14">
                  {t('Votre périmètre : vos visites.')} <Link to={chemin('comptes')}>{t('Voir le rendement des visites')}</Link>
                </Note>
              )}
              {d.parties.includes('activite') && <Activite d={d} />}
              <div className="g g2">
                {d.parties.includes('logistique') && (
                  <Panel titre={tf('Logistique · {p}', { p: t(periode === 'jour' ? 'aujourd’hui' : periode === '7j' ? '7 derniers jours' : '30 derniers jours') })} icone="truck">
                    {d.logistique.map((i) => <Ind key={i.id} i={i} />)}
                  </Panel>
                )}
                {d.parties.includes('activite') && <Marge d={d} />}
                {d.parties.includes('qualite') && (
                  <Panel titre={tf('Qualité · {p}', { p: t(periode === 'jour' ? 'aujourd’hui' : periode === '7j' ? '7 derniers jours' : '30 derniers jours') })} icone="shield-check">
                    {d.qualite.map((i) => <Ind key={i.id} i={i} />)}
                  </Panel>
                )}
                {d.parties.includes('couts') && (
                  <Panel titre={tf('Coûts variables · {p}', { p: t(periode === 'jour' ? 'aujourd’hui' : periode === '7j' ? '7 derniers jours' : '30 derniers jours') })} icone="receipt">
                    {d.couts.map((i) => <Ind key={i.id} i={i} />)}
                  </Panel>
                )}
              </div>

            </>
          ))}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}

function Activite({ d }: { d: TableauRapports }) {
  const { t, tf } = usePreferences()
  const valeur = useValeur()
  const [cmd, val, panier, revenu] = d.activite
  return (
    <>
      <div className="g g21">
        <div className="hero night" style={{ marginTop: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <span className="hk"><Def t={d.periode === 'jour' ? 'Revenu BelivaY du jour' : 'Revenu BelivaY de la période'} def={revenu.definition} /></span>
            <Pill ton="dk" icone="landmark">{t('Commissions + livraison nette')}</Pill>
          </div>
          <div className="bigN mt10">{F(revenu.valeur ?? 0)}<small style={{ fontSize: 20, opacity: 0.75 }}> F</small></div>
          <div className="adme-m4">
            <div className="m4"><div className="l">{t('Commandes')}</div><div className="v">{cmd.valeur}</div></div>
            <div className="m4"><div className="l"><Def t="Valeur des commandes" def={val.definition} /></div><div className="v" style={{ fontSize: 18 }}>{valeur(val.valeur, 'F')}</div><div className="s">{t('payée par les clients, pas un chiffre d’affaires')}</div></div>
            <div className="m4"><div className="l">{t('Marge de la période')}</div><div className="v" style={{ fontSize: 18 }}>{valeur(d.marge.marge, 'F')}</div></div>
            <div className="m4"><div className="l">{t('Marge par commande')}</div><div className="v" style={{ fontSize: 18 }}>{d.marge.parCommande === null ? t('Échantillon insuffisant') : valeur(d.marge.parCommande, 'F')}</div></div>
          </div>
        </div>
        <Panel titre={t('Tendance de la semaine')} icone="trending-up">
          <Courbe valeurs={d.semaine.map((x) => x.revenu)} l={320} h={60} />
          <Table
            cle={(x) => x.jour}
            rows={d.semaine}
            cols={[
              { k: 'j', t: t('Jour'), main: true, rendu: (x) => x.jour.slice(5).split('-').reverse().join('/') },
              { k: 'c', t: t('Commandes'), cls: 'r', rendu: (x) => x.commandes },
              { k: 'r', t: t('Revenu'), cls: 'r', rendu: (x) => valeur(x.revenu, 'F') },
            ]}
          />
        </Panel>
      </div>
      <div className="g g4">
        <Kpi k={<Def t="Commandes" def={cmd.definition} />} v={cmd.valeur ?? '—'} icone="shopping-bag" />
        <Kpi k={<Def t="Valeur des commandes" def={val.definition} />} v={F(val.valeur ?? 0)} u="F" icone="receipt" />
        <Kpi k={<Def t="Panier moyen" def={panier.definition} />} v={panier.valeur === null ? '—' : F(panier.valeur)} u={panier.valeur === null ? undefined : 'F'} s={panier.echantillonInsuffisant ? t('Échantillon insuffisant') : undefined} icone="shopping-cart" />
        <Kpi k={<Def t="Revenu BelivaY" def={revenu.definition} />} v={F(revenu.valeur ?? 0)} u="F" s={tf('{n} commandes', { n: cmd.valeur ?? 0 })} icone="landmark" ton="night" />
      </div>
    </>
  )
}

function Marge({ d }: { d: TableauRapports }) {
  const { t } = usePreferences()
  const valeur = useValeur()
  return (
    <Panel titre={t('Marge par commande')} icone="calculator">
      <Kv k={t('Revenu')} v={valeur(d.marge.revenu, 'F')} />
      {d.marge.lignes.map((x) => <Kv key={x.libelle} k={`− ${t(x.libelle)}`} v={valeur(x.montant, 'F')} />)}
      <Kv k={<b>{t('= Marge de la période')}</b>} v={<b>{valeur(d.marge.marge, 'F')}</b>} />
      <Kv k={<b>{t('÷ commandes = marge par commande')}</b>} v={<b>{d.marge.parCommande === null ? t('Échantillon insuffisant') : valeur(d.marge.parCommande, 'F')}</b>} />
    </Panel>
  )
}

function Lundi({ d }: { d: TableauRapports }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const valeur = useValeur()
  const cmd = d.semaine.reduce((a, x) => a + x.commandes, 0)
  const val = d.semaine.reduce((a, x) => a + x.valeur, 0)
  const rev = d.semaine.reduce((a, x) => a + x.revenu, 0)
  const telecharger = () =>
    exporterPdf('rapport-du-lundi.pdf', [
      { texte: t('Rapport du lundi · BelivaY · Cameroun'), taille: 16, espace: 10 },
      { texte: tf('Envoi automatique : {d}', { d: date(d.lundi.prochain) }) },
      { texte: `${t('Commandes')} : ${cmd}` },
      { texte: `${t('Valeur des commandes')} : ${valeur(val, 'F')}` },
      { texte: `${t('Revenu BelivaY')} : ${valeur(rev, 'F')}` },
      ...[...d.logistique, ...d.qualite].map((i) => ({ texte: `${t(i.libelle)} : ${valeur(i.valeur, i.unite)}` })),
    ])
  return (
    <>
      <Banniere ton="acc" icone="calendar-clock" bouton={<button type="button" className="btn sm secondary" onClick={telecharger}><Icone nom="download" taille={16} /><span>{t('Télécharger l’aperçu')}</span></button>}>
        <b>{tf('Envoi automatique chaque {h}.', { h: t(d.lundi.heure) })}</b> {tf('Chacun reçoit son périmètre ; personne n’a besoin de l’envoyer. Prochain envoi : {d}.', { d: date(d.lundi.prochain) })}
      </Banniere>
      <div className="g g21">
        <div className="adme-rep">
          <div className="adme-rep-h">
            <div className="k">{t('Rapport du lundi · 7 derniers jours')}</div>
            <h3>{t('BelivaY · Cameroun · Yaoundé')}</h3>
          </div>
          <div className="adme-rep-b">
            <div className="g g4" style={{ marginTop: 0 }}>
              <Kpi k={t('Commandes')} v={cmd} icone="shopping-bag" />
              <Kpi k={t('Valeur des commandes')} v={F(val)} u="F" s={tf('panier moyen {p} F', { p: F(Math.round(val / Math.max(1, cmd))) })} icone="receipt" />
              <Kpi k={t('Revenu BelivaY')} v={F(rev)} u="F" s={t('commissions + livraison nette')} icone="landmark" ton="night" />
              <Kpi k={t('Livrées sous 5 h')} v={d.logistique.find((i) => i.id === 'sous5h')?.valeur ?? '—'} u="%" icone="timer" iton="green" />
            </div>
            <div className="g g2">
              <Panel titre={t('Logistique')} icone="truck">{d.logistique.slice(0, 5).map((i) => <Ind key={i.id} i={i} />)}</Panel>
              <Panel titre={t('Qualité')} icone="shield-check">{d.qualite.map((i) => <Ind key={i.id} i={i} />)}</Panel>
            </div>
          </div>
        </div>
        <div className="adme-stack">
          <Panel titre={t('Destinataires')} icone="users">
            {d.lundi.destinataires.map((x) => <Li key={x.nom} icone="mail" ton="acc" t={x.nom} s={`${t(NOM_ROLE[x.role])} · ${t(x.perimetre)}`} />)}
          </Panel>
          <Panel titre={t('Rapports envoyés')} icone="send">
            {d.lundi.envoyes.map((x) => <Li key={x.semaine} icone="circle-check" ton="green" t={tf('Semaine du {s}', { s: x.semaine.split('-').reverse().join('/') })} s={tf('{d} · {n} destinataires', { d: date(x.le), n: x.destinataires })} />)}
          </Panel>
        </div>
      </div>
    </>
  )
}
