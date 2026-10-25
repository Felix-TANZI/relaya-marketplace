// ADM-P18 Entreprises de livraison (prototype : #entreprises, ?s=pilote, ?s=grille, ?s=configuration, ?s=suspendue).
// Liste : bandeau des zones à une seule entreprise, indicateurs, tableau (aucune exclusivité de zone), couverture par
// zone exploitée (ENTREPRISES-MIN-ZONE), entreprises en négociation, correspondance quartier → zone et adresses non
// placées (placement par la Direction, journalisé). Fiche (?id=) selon l'état : configuration (chaîne d'activation
// en sept étapes, pièces), suspendue (motif, niveau, recours, effet sur le réseau), pilote ou active (rapport du
// pilote, identité sans numéros, zones et capacité, palier et plafond, accès) ; ?vue=grille : la grille contrôlée
// ligne par ligne sous les plafonds d'achat (une ligne au-dessus est bloquée, jamais de dérogation manuelle).
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { Ecran } from '../../composants/coque'
import { ExportSigne } from '../../composants/ExportSigne'
import { Icone } from '../../composants/Icone'
import { BoutonAppel } from '../../composants/BoutonAppel'
import { Perimetre } from '../../composants/Perimetre'
import { AucunResultat, Banniere, BarresH, Choix, Kpi, Li, Note, Panel, Pill, Props, Recherche, Table, normaliser, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { ControleGrille, EntrepriseCourte, EntrepriseFiche, Palier, StatutEntreprise } from '../../donnees/domaines/logistique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { pageOuverte } from '../../config/droits'
import { useDroit, useHorloge, useSession } from '../../session'
import { useFonctions } from '../AJ-A/fonctions-page'
import { BoutonGeste, Chaine, Chronologie, Introuvable, Lu, M4, RowSt, StatutPill, ZonePt, dateCourte, francs, jourCourt, quand, useGestes } from './commun'
import { PARAM } from './parametres'
import { AccesActeur } from '../SURVEILLER/AccesActeur'

export const STATUT_ENT: Record<StatutEntreprise, [string, 'green' | 'red' | 'amber' | 'acc' | 'ink']> = {
  configuration: ['En configuration', 'amber'],
  pilote: ['Pilote', 'acc'],
  active: ['Active', 'green'],
  restreinte: ['Restreinte', 'amber'],
  suspendue: ['Suspendue', 'red'],
}
export const NOM_PALIER: Record<Palier, string> = { Nouveau: 'Nouveau', Confirme: 'Confirmé', Or: 'Or' }
const CONTROLE: Record<ControleGrille, [string, 'green' | 'red' | 'blue' | 'ink' | 'amber', string?]> = {
  ok: ['Acceptée', 'green', 'check'],
  bloquee: ['Bloquée', 'red', 'lock'],
  colis: ['Contrôle au colis', 'blue'],
  refacturee: ['Refacturée', 'ink'],
  minoration: ['Minoration', 'amber'],
  indicative: ['Indicative', 'ink'],
}
const plafondTexte = (n: number | null, t: (s: string) => string) => (n === null ? t('sans plafond') : francs(n))

export default function Entreprises() {
  const [p] = useSearchParams()
  const id = p.get('id')
  return id ? <Fiche id={id} vue={p.get('vue') === 'grille' ? 'grille' : 'fiche'} /> : <Liste />
}

function Liste() {
  const { t, tf, langue } = usePreferences()
  const surtitre = useSurtitre()
  const droit = useDroit('entreprises')
  const { role } = useSession()
  const [p, setP] = useSearchParams()
  const l = useLecture(() => Promise.all([source.logistique.entreprises(), source.logistique.couverture(), source.logistique.placements()]), [])
  const cands = useLecture(() => (pageOuverte('candidatures', role) ? source.logistique.candidatures() : Promise.resolve([])), [role])
  const g = useGestes()
  const [q, setQ] = useState('')
  const statut = (p.get('statut') ?? '') as '' | StatutEntreprise
  const setStatut = (v: '' | StatutEntreprise) => setP((x) => { const n = new URLSearchParams(x); if (v) n.set('statut', v); else n.delete('statut'); return n }, { replace: true })
  const [placer, setPlacer] = useState<Record<string, string>>({})
  const [ents0, couv0, pl0] = l.donnees ?? [[], [], []]
  const sousMin = couv0.filter((z) => z.actives < PARAM.entreprises.minParZone)
  const fonctions = useFonctions([
    { verbe: 'Activer', n: ents0.filter((e) => e.statut === 'configuration').length, unite: ['entreprise', 'entreprises'], icone: 'circle-check', route: 'entreprises', params: { statut: 'configuration' }, geste: true },
    { verbe: 'Recruter', n: sousMin.length, unite: ['zone sous le minimum', 'zones sous le minimum'], icone: 'triangle-alert', route: 'candidatures', params: { genre: 'entreprise' }, alerte: true },
    { verbe: 'Revoir', n: (cands.donnees ?? []).filter((c) => c.genre === 'entreprise' && c.etat !== 'acceptee' && c.etat !== 'refusee').length, unite: ['candidature', 'candidatures'], icone: 'user-plus', route: 'candidatures', params: { genre: 'entreprise' } },
    ents0.some((e) => e.statut === 'suspendue')
      ? { verbe: 'Lever', n: ents0.filter((e) => e.statut === 'suspendue').length, unite: ['suspension', 'suspensions'], icone: 'ban', route: 'entreprises', params: { statut: 'suspendue' }, geste: true }
      : role === 'superviseur' && { verbe: 'Placer', n: pl0.filter((x) => !x.zone).length, unite: ['quartier', 'quartiers'], icone: 'map-pin-off', onClick: () => document.getElementById('s4-placer')?.scrollIntoView({ behavior: 'smooth' }), droit: 'entreprises', geste: true },
  ])
  const actions = (
    <>
      <Link className="btn secondary" to={chemin('entreprises', { id: 'e-yafe', vue: 'grille' })}>
        <Icone nom="table-2" taille={18} />
        <span>{t('Grille contrôlée')}</span>
      </Link>
      {droit.acces !== 'lecture' && (
        <Link className="btn primary" to={chemin('candidatures', { genre: 'entreprise' })}>
          <Icone nom="plus" taille={18} />
          <span>{t('Nouvelle candidature')}</span>
        </Link>
      )}
    </>
  )
  return (
    <Ecran route="entreprises" kicker={surtitre} actions={actions} fonctions={fonctions}>
      <Perimetre route="entreprises" />
      {g.rendu}
      <Lu l={l} quoi="La liste des entreprises">
        {([ents, couv, placements]) => {
          const actives = ents.filter((e) => e.statut === 'pilote' || e.statut === 'active')
          const seules = couv.filter((z) => z.actives < PARAM.entreprises.minParZone)
          const config = ents.filter((e) => e.statut === 'configuration')
          const plafonds = actives.map((e) => e.plafond)
          const haut = plafonds.includes(null) ? null : Math.max(0, ...(plafonds as number[]))
          const liste = ents.filter((e) => (!statut || e.statut === statut) && (!q || normaliser(`${e.nom} ${e.quartier} ${e.zones.join(' ')}`).includes(normaliser(q))))
          const nonPlaces = placements.filter((x) => !x.zone)
          return (
            <>
              <div className="g g4">
                <Kpi k={t('Entreprises actives')} v={actives.length} u={tf('dont {n} en pilote', { n: actives.filter((e) => e.statut === 'pilote').length })} s={actives.map((e) => e.nom).join(' · ')} icone="truck" ton="night" />
                <Kpi k={t('En configuration')} v={config.length} s={config.map((e) => e.nom).join(' · ') || t('Aucune')} icone="hourglass" iton="amber" />
                <Kpi k={t('Zones sous le minimum')} v={seules.length} u={tf('/ {n}', { n: couv.length })} s={seules.length ? seules.map((z) => z.zone).join(', ') : undefined} icone="triangle-alert" iton={seules.length ? 'red' : 'green'} />
                <Kpi k={t('Plafond le plus haut')} v={haut === null ? t('sans plafond') : francs(haut)} s={haut !== null && !actives.some((e) => e.palier === 'Or') ? t('Aucune entreprise Or : les colis de valeur attendent') : undefined} icone="gauge" iton={actives.some((e) => e.palier === 'Or') ? 'green' : 'red'} />
              </div>
              <div className="chips a-segs mt16" role="group" aria-label={t('Statut')}>
                <button type="button" className={'chip' + (!statut ? ' on' : '')} aria-pressed={!statut} onClick={() => setStatut('')}>
                  {t('Toutes')} <span className="n">{ents.length}</span>
                </button>
                {(Object.keys(STATUT_ENT) as StatutEntreprise[]).filter((k) => ents.some((e) => e.statut === k)).map((k) => (
                  <button key={k} type="button" className={'chip' + (statut === k ? ' on' : '')} aria-pressed={statut === k} onClick={() => setStatut(k)}>
                    {t(STATUT_ENT[k][0])} <span className="n">{ents.filter((e) => e.statut === k).length}</span>
                  </button>
                ))}
              </div>
              <div className="mt10">
                <Table
                  legende={t('Entreprises de livraison')}
                  outils={
                    <div className="s4-filtres">
                      <Recherche q={q} setQ={setQ} placeholder={t('Entreprise, quartier, zone…')} aria={t('Rechercher une entreprise')} />
                    </div>
                  }
                  rows={liste}
                  cle={(e) => e.id}
                  ligneCls={(e) => (e.statut === 'suspendue' ? 'bad' : e.statut === 'configuration' || e.statut === 'restreinte' ? 'warn' : undefined)}
                  vide={<AucunResultat effacer={() => (setQ(''), setStatut(''))} />}
                  cols={[
                    { k: 'e', t: t('Entreprise'), main: true, cls: 'admlg-w230', rendu: (e) => (
                      <Link to={chemin('entreprises', { id: e.id })} className="s4-ligne">
                        <span className="ic accs" style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icone nom="truck" taille={18} /></span>
                        <span className="grow"><b className="t14" style={{ display: 'block' }}>{e.nom}</b><span className="t12 c3">{tf('Agence à {q}', { q: e.quartier })}</span></span>
                      </Link>
                    ) },
                    { k: 'st', t: t('Statut'), rendu: (e) => <StatutPill t={STATUT_ENT[e.statut][0]} ton={STATUT_ENT[e.statut][1]} /> },
                    { k: 'z', t: t('Zones'), rendu: (e) => <span className="row wrap" style={{ gap: 4 }}>{e.zones.map((z) => <Pill key={z} ton="acc" sm>{z}</Pill>)}</span> },
                    { k: 'pal', t: t('Palier'), rendu: (e) => <Pill ton="ink" sm>{t(NOM_PALIER[e.palier])}</Pill> },
                    { k: 'pl', t: t('Plafond de valeur'), cls: 'r', rendu: (e) => <><b>{plafondTexte(e.plafond, t)}</b><div className="t2">{t('par colis')}</div></> },
                    { k: 'cap', t: t('Capacité'), cls: 'r', hideM: true, rendu: (e) => <><b>{Object.values(e.capacites).reduce((n, c) => n + c.capacite, 0)}</b><div className="t2">{t('colis par jour')}</div></> },
                    { k: 'acc', t: t('Acceptation'), cls: 'r', rendu: (e) => (e.acceptation ? <><b>{Math.round((100 * e.acceptation.acceptes) / e.acceptation.publies)} %</b><div className="t2">{tf('{a} sur {p}', { a: e.acceptation.acceptes, p: e.acceptation.publies })}</div></> : '—') },
                    { k: 'del', t: t('Délai'), cls: 'r', hideM: true, rendu: (e) => (e.delaiMin === null ? '—' : <b>{tf('{n} min', { n: e.delaiMin })}</b>) },
                    { k: 'per', t: t('Pertes'), cls: 'r', hideM: true, rendu: (e) => <b>{e.pertes}</b> },
                    { k: 'ts', t: t('Trust Score'), cls: 'r', rendu: (e) => <b>{e.trustScore ?? '—'}</b> },
                  ]}
                  pied={<><span>{tf('{n} entreprises · {a} actives · {c} en configuration', { n: ents.length, a: actives.length, c: config.length })}</span></>}
                />
              </div>
              <div className="g g2">
                <Panel titre={t('Couverture par zone exploitée')} icone="map-pinned">
                  <Table
                    legende={t('Couverture par zone exploitée')}
                    rows={couv}
                    cle={(z) => z.zone}
                    ligneCls={(z) => (z.actives < PARAM.entreprises.minParZone ? 'bad' : undefined)}
                    cols={[
                      { k: 'z', t: t('Zone'), main: true, rendu: (z) => <ZonePt code={z.zone} nom={z.nom} ton={z.actives < PARAM.entreprises.minParZone ? 'warn' : ''} /> },
                      { k: 'e', t: t('Entreprises'), rendu: (z) => <span className="row wrap" style={{ gap: 4 }}>{z.entreprises.map((e) => <Pill key={e.id} ton={e.active ? 'acc' : 'ink'} sm>{e.nom}</Pill>)}</span> },
                      { k: 'a', t: t('Entreprises actives'), rendu: (z) => <StatutPill t={tf('{a} sur {m}', { a: z.actives, m: PARAM.entreprises.minParZone }) + (z.actives < PARAM.entreprises.minParZone ? ' · ' + t('alerte') : '')} ton={z.actives < PARAM.entreprises.minParZone ? 'red' : 'green'} /> },
                    ]}
                  />
                </Panel>
                <Panel titre={t('Entreprises en négociation au lancement')} icone="handshake">
                  {ents.map((e) => (
                    <Li key={e.id} icone="truck" ton={e.statut === 'configuration' ? 'amber' : 'accs'} t={`${e.nom} · ${t(STATUT_ENT[e.statut][0])}`} s={e.statut === 'restreinte' && e.restrictionJusqua ? tf('{n} paquets rendus sur {j} jours : restreinte jusqu’au {d}', { n: e.rendus7j, j: PARAM.entreprises.rendus.surJours, d: dateCourte(e.restrictionJusqua, langue) }) : tf('Palier {p} · {z}', { p: t(NOM_PALIER[e.palier]), z: e.zones.join(', ') })} to={chemin('entreprises', { id: e.id })} />
                  ))}
                </Panel>
              </div>
              <div className="g g2">
                <Panel titre={t('Correspondance quartier → zone')} icone="map">
                  <Table
                    legende={t('Correspondance quartier → zone')}
                    rows={placements.filter((x) => x.zone)}
                    cle={(x) => x.quartier}
                    cols={[
                      { k: 'q', t: t('Saisi'), main: true, rendu: (x) => <b>{x.quartier}</b> },
                      { k: 'z', t: t('Zone'), rendu: (x) => <Pill ton="acc" sm>{x.zone!}</Pill> },
                      { k: 'r', t: t('Résolution'), rendu: (x) => <span className="t12 c3">{x.alias ? tf('alias : {a}', { a: x.alias }) : t('placé par la Direction')}</span> },
                    ]}
                  />
                </Panel>
                <Panel id="s4-placer" titre={t('Adresses non placées')} icone="map-pin-off" droite={<Pill ton={nonPlaces.length ? 'red' : 'green'} sm>{tf('{n} à placer', { n: nonPlaces.length })}</Pill>}>
                  {nonPlaces.length === 0 && <Li icone="circle-check" ton="green" t={t('Toutes les adresses sont placées')} />}
                  {nonPlaces.map((x) => (
                    <div key={x.quartier} className="li">
                      <span className="ic red"><Icone nom="map-pin-off" taille={20} /></span>
                      <span className="grow">
                        <span className="lt" style={{ display: 'block' }}>{x.quartier}</span>
                        <span className="ls" style={{ display: 'block' }}>{tf('{n} demande(s) non servie(s)', { n: x.demandes })}</span>
                      </span>
                      <span className="s4-filtres">
                        <select aria-label={tf('Zone de {q}', { q: x.quartier })} value={placer[x.quartier] ?? ''} onChange={(e) => setPlacer((p) => ({ ...p, [x.quartier]: e.target.value }))}>
                          <option value="">{t('Zone…')}</option>
                          {['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'Z10', 'Z11', 'Z12'].map((z) => <option key={z} value={z}>{z}</option>)}
                        </select>
                        {placer[x.quartier] && <BoutonGeste g={g} action="zone.placer" objet={`${x.quartier} → ${placer[x.quartier]}`} sm resume={tf('Placer « {q} » dans la zone {z} : les adresses de ce quartier y sont rattachées.', { q: x.quartier, z: placer[x.quartier] })} />}
                      </span>
                    </div>
                  ))}
                  <Li icone="map-pinned" ton="acc" t={t('Pilotage des zones')} s={t('Demande non servie par zone et recommandation « où ouvrir »')} to={chemin('zones')} />
                </Panel>
              </div>
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}

function Fiche({ id, vue }: { id: string; vue: 'fiche' | 'grille' }) {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const naviguer = useNavigate()
  const l = useLecture(() => source.logistique.entrepriseFiche(id).then((f) => ({ f })), [id])
  const g = useGestes()
  const e = l.donnees?.f ?? null
  const actions = (
    <>
      {e && <BoutonAppel nom={e.nom} qui="Entreprise de livraison" motif={t('Explication ou intervention auprès de l’entreprise')} objet={id} />}
      <Link className="btn secondary" to={chemin('messagerie', { entreprise: id })}>
        <Icone nom="message-circle" taille={18} />
        <span>{t('Messagerie')}</span>
      </Link>
      {e?.pilote && <ExportPilote e={e} />}
    </>
  )
  return (
    <Ecran route="entreprises" titre={e ? (vue === 'grille' ? `${t('Grille')} · ${e.nom}` : e.nom) : t('Entreprises de livraison')} nom={e?.nom} retour={chemin('entreprises')} kicker={`${t(e?.statut === 'configuration' ? 'Entreprise candidate' : 'Entreprise partenaire')} · ${surtitre}`} actions={actions}>
      {g.rendu}
      <Lu l={l} quoi="La fiche de l’entreprise">
        {({ f }) =>
          !f ? (
            <Introuvable quoi="Entreprise introuvable" retour={() => naviguer(chemin('entreprises'))} libelle="Retour à la liste" />
          ) : (
            <>
              <AccesActeur espace="entreprise" id={f.id} nom={f.nom} zone={f.zones[0] ?? null} />
              <Choix
                forme="tabs"
                aria={t('Vues de la fiche')}
                actif={vue}
                items={[
                  { id: 'fiche', t: t('Vue d’ensemble'), to: chemin('entreprises', { id }) },
                  { id: 'grille', t: t('Grille'), to: chemin('entreprises', { id, vue: 'grille' }) },
                  { id: 'livreurs', t: t('Livreurs'), n: f.livreurs, to: chemin('livreurs', { entreprise: f.id }) },
                  { id: 'paquets', t: t('Paquets'), n: f.paquetsJour, to: chemin('paquets', { entreprise: f.nom }) },
                  { id: 'versements', t: t('Versements'), to: chemin('versements') },
                  { id: 'sanctions', t: t('Sanctions'), to: chemin('sanctions') },
                ]}
              />
              {vue === 'grille' ? <Grille f={f} /> : f.statut === 'configuration' ? <Configuration f={f} g={g} /> : f.statut === 'suspendue' ? <Suspendue f={f} g={g} /> : <Pilote f={f} g={g} />}
            </>
          )
        }
      </Lu>
    </Ecran>
  )
}

function ExportPilote({ e }: { e: EntrepriseFiche }) {
  return (
    <ExportSigne
      nom={`bilan-pilote-${e.id}.csv`}
      objet={`Bilan du pilote · ${e.nom}`}
      entetes={['Jour', 'Paquets', 'Colis', 'Acceptation (min)', 'Ramassage (min)', 'Sous 5 h', 'Rémunération (F)']}
      lignes={() => e.pilote!.rapport.map((r) => [new Date(r.jour).toISOString().slice(0, 10), r.paquets, r.colis, r.acceptationMin, r.ramassageMin, `${r.sous5h[0]}/${r.sous5h[1]}`, r.remuneration])}
    />
  )
}

function Hero({ f, ton, k, pill, children }: { f: EntrepriseCourte; ton: 'night' | 'red'; k: string; pill?: ReactNode; children?: ReactNode }) {
  const { t, tf } = usePreferences()
  return (
    <div className={'hero night' + (ton === 'red' ? ' s4-rouge' : '')}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="hk">{k}</span>
        {pill}
      </div>
      <div className="row mt10" style={{ gap: 14, alignItems: 'center' }}>
        <span className="ico-b" style={{ width: 52, height: 52, borderRadius: 15 }}><Icone nom="truck" taille={26} /></span>
        <div className="grow">
          <div className="ht" style={{ margin: 0 }}>{f.nom}</div>
          <div className="hs" style={{ marginTop: 2 }}>{tf('Agence à {q} · zones {z}', { q: f.quartier, z: f.zones.join(', ') })}</div>
        </div>
      </div>
      {children}
      <span className="vh">{t(STATUT_ENT[f.statut][0])}</span>
    </div>
  )
}

function Pilote({ f, g }: { f: EntrepriseFiche; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const p = f.pilote
  const lignes = f.pilote?.rapport ?? []
  const tot = lignes.reduce((n, r) => n + r.remuneration, 0)
  const seuilSuivant = f.palier === 'Nouveau' ? PARAM.entreprises.seuils.Confirme : f.palier === 'Confirme' ? PARAM.entreprises.seuils.Or : null
  return (
    <>
      {f.statut === 'restreinte' && f.restrictionJusqua && (
        <Banniere ton="amber" icone="octagon-alert" className="admlg-bn">
          <b>{tf('Restreinte jusqu’au {d} : {n} paquets rendus sur {j} jours glissants (seuil {m}).', { d: dateCourte(f.restrictionJusqua, langue), n: f.rendus7j, j: PARAM.entreprises.rendus.surJours, m: PARAM.entreprises.rendus.max })}</b>
        </Banniere>
      )}
      <Hero f={f} ton="night" k={p ? tf('Phase pilote · jour {j} sur {d}', { j: p.jour, d: p.duree }) : t(STATUT_ENT[f.statut][0])} pill={<Pill ton="dk" icone="file-signature">{t('Contrat signé')}</Pill>}>
        {p && (
          <>
            <div className="mt14"><div className="bar acc"><i style={{ width: `${Math.round((100 * p.jour) / p.duree)}%` }}></i></div></div>
            <div className="row mt8 t12" style={{ justifyContent: 'space-between', opacity: 0.85 }}>
              <span>{tf('Commencé le {d}', { d: dateCourte(p.debut, langue) })}</span>
              <span>{tf('Bilan conjoint écrit le {d}, puis contrat définitif', { d: dateCourte(p.bilanLe, langue) })}</span>
            </div>
          </>
        )}
        <div className="money4 admlg-m4x4">
          <M4 l={t('Palier')} v={t(NOM_PALIER[f.palier])} s={tf('plafond {p} par colis', { p: plafondTexte(f.plafond, t) })} icone="gauge" />
          <M4 l={t('Trust Score')} v={f.trustScore ?? '—'} s={t('entreprise')} icone="star" />
          <M4 l={t('Livreurs')} v={f.livreurs} s={tf('{n} actifs', { n: f.livreursActifs })} icone="users" />
          <M4 l={t('Capacité')} v={Object.values(f.capacites).reduce((n, c) => n + c.capacite, 0)} s={tf('colis par jour, {n} zones', { n: f.zones.length })} icone="map-pinned" />
        </div>
      </Hero>
      <div className="g g21">
        <Panel titre={t('Rapport du pilote · mesuré chaque jour')} icone="chart-column">
          <Table
            legende={t('Rapport du pilote')}
            rows={lignes}
            cle={(r) => String(r.jour)}
            vide={<p className="t13 c3">{t('Aucun pilote en cours.')}</p>}
            cols={[
              { k: 'j', t: t('Jour'), main: true, rendu: (r) => <b style={{ whiteSpace: 'nowrap' }}>{jourCourt(r.jour, langue)}</b> },
              { k: 'pq', t: t('Paquets'), cls: 'r', rendu: (r) => r.paquets },
              { k: 'c', t: t('Colis'), cls: 'r', rendu: (r) => r.colis },
              { k: 'a', t: t('Acceptation'), cls: 'r', rendu: (r) => (r.acceptationMin === null ? '—' : tf('{n} min', { n: r.acceptationMin })) },
              { k: 'r', t: t('Ramassage'), cls: 'r', rendu: (r) => (r.ramassageMin === null ? '—' : tf('{n} min', { n: r.ramassageMin })) },
              { k: 'd', t: t('Sous 5 h'), cls: 'r', rendu: (r) => <b className={r.sous5h[0] === r.sous5h[1] ? 's4-cg' : 's4-cr'}>{tf('{a} sur {b}', { a: r.sous5h[0], b: r.sous5h[1] })}</b> },
              { k: 'm', t: t('Rémunération'), cls: 'r', rendu: (r) => francs(r.remuneration) },
            ]}
            pied={<><span>{tf('Pertes {p} · incidents {i} · paquets rendus {r}', { p: f.pertes, i: f.incidents, r: f.rendus7j })}</span><span>{tf('Validé sur la période : {m}', { m: francs(tot) })}</span></>}
          />
          <div className="btns mt12">
            {p && <ExportPilote e={f} />}
            <Link className="btn secondary" to={chemin('entreprises', { id: f.id, vue: 'grille' })}><Icone nom="table-2" taille={18} /><span>{t('Grille contrôlée')}</span></Link>
          </div>
        </Panel>
        <Panel titre={t('Identité et contrat')} icone="file-signature">
          <Props
            paires={[
              ...f.pieces.slice(0, 2).map((x) => [t(x.nature), <StatutPill key={x.nature} t={x.statut === 'verifiee' ? 'Vérifié' : 'En vérification'} ton={x.statut === 'verifiee' ? 'green' : 'amber'} />] as [string, ReactNode]),
              [t('Dirigeant·e'), <b key="d">{f.dirigeant}</b>],
              ...f.pieces.slice(3, 5).map((x) => [t(x.nature), <span key={x.nature}><StatutPill t={x.statut === 'verifiee' ? 'Vérifiée' : x.statut === 'expiree' ? 'Expirée' : 'En vérification'} ton={x.statut === 'verifiee' ? 'green' : x.statut === 'expiree' ? 'red' : 'amber'} />{x.expireLe && x.expireLe - maintenant < PARAM.entreprises.pieceAlerteJ * 86_400_000 && <span className="t12 c3"> · {tf('expire le {d}', { d: dateCourte(x.expireLe, langue) })}</span>}</span>] as [string, ReactNode]),
              [t('Contrat'), f.contrat],
              [t('Caution, dépôt, frais d’entrée'), <b key="c">0 F</b>],
            ]}
          />
        </Panel>
      </div>
      <div className="g g3">
        <Panel titre={t('Zones et capacité déclarées')} icone="map-pinned">
          <BarresH lignes={Object.entries(f.capacites).map(([z, c]) => ({ l: z, v: c.acceptes, max: Math.max(1, c.capacite), r: `${c.acceptes} / ${c.capacite}` }))} />
        </Panel>
        <Panel titre={t('Palier et plafond')} icone="gauge" a={{ t: t('Paliers'), to: chemin('paliers') }}>
          {(['Nouveau', 'Confirme', 'Or'] as Palier[]).map((x) => (
            <RowSt key={x} l={<span>{t(NOM_PALIER[x])}{x === f.palier && <b> · {t('actuel')}</b>}{x !== 'Nouveau' && <span className="t12 c3" style={{ display: 'block' }}>{tf('Trust Score ≥ {s} tenu {j} jours', { s: PARAM.entreprises.seuils[x as 'Confirme' | 'Or'], j: PARAM.entreprises.tenuJ })}</span>}</span>} r={<b style={{ whiteSpace: 'nowrap' }}>{tf('≤ {p}', { p: plafondTexte(PARAM.entreprises.plafonds[x], t) })}</b>} couleur={x === f.palier ? 'var(--acc)' : 'var(--ink-4)'} />
          ))}
          {seuilSuivant !== null && f.trustScore !== null && (
            <Note ton={f.trustScore >= seuilSuivant ? 'acc' : 'ink'} icone="trending-up" className="mt10">
              {f.trustScore >= seuilSuivant ? tf('{ts} ≥ {s} : passage proposé dès que le score tient {j} jours ; validation humaine dans Paliers et Trust Score.', { ts: f.trustScore, s: seuilSuivant, j: PARAM.entreprises.tenuJ }) : tf('{ts} sous {s} : le palier suivant attend.', { ts: f.trustScore, s: seuilSuivant })}
            </Note>
          )}
        </Panel>
        <Panel titre={t('Accès, règlement, sanctions')} icone="key-round">
          <Li icone="users" ton="acc" t={tf('{n} accès nominatifs sur {m}', { n: f.acces.noms.length, m: f.acces.max })} s={f.acces.noms.join(' · ')} />
          <Li icone="banknote" ton="green" t={f.reglement} s={t('Versement chaque vendredi, 1 % retenu sur le versement (R43) ; changement de numéro : versements bloqués et revue humaine')} to={chemin('versements')} />
          <div className="s4-actes">
            <BoutonGeste g={g} action="entreprise.suspendre" objet={f.id} genre="ghost" sm resume={tf('Suspendre {nom} : plus aucun nouveau paquet, les colis déjà sous sa garde sont livrés, ce qui est dû reste versé.', { nom: f.nom })} />
          </div>
        </Panel>
      </div>
    </>
  )
}

function Configuration({ f, g }: { f: EntrepriseFiche; g: ReturnType<typeof useGestes> }) {
  const { t, tf } = usePreferences()
  const faites = f.etapes.filter((e) => e.etat === 'fait').length
  return (
    <>
      <Panel titre={tf('Chaîne d’activation · {n} étapes sur {m}', { n: faites, m: f.etapes.length })} icone="list-checks" droite={<StatutPill t="En configuration" ton="amber" />}>
        <Chaine etapes={f.etapes} />
        <div className="btns mt16">
          <Link className="btn secondary" to={chemin('kyc')}><Icone nom="id-card" taille={18} /><span>{t('Vérifier les pièces')}</span></Link>
          <Link className="btn secondary" to={chemin('comptes')}><Icone nom="calendar-plus" taille={18} /><span>{t('Planifier la visite')}</span></Link>
          <Link className="btn secondary" to={chemin('messagerie', { entreprise: f.id })}><Icone nom="message-circle" taille={18} /><span>{t('Relancer pour la grille')}</span></Link>
          <BoutonGeste g={g} action="entreprise.activer" objet={f.id} resume={tf('Activer {nom} en phase pilote de {j} jours : ses zones et sa capacité reçoivent des paquets.', { nom: f.nom, j: PARAM.entreprises.piloteJ })} />
        </div>
      </Panel>
      <div className="g g21">
        <Panel titre={t('Pièces du dossier')} icone="files">
          <Table
            legende={t('Pièces du dossier')}
            rows={f.pieces}
            cle={(x) => x.nature}
            cols={[
              { k: 'd', t: t('Pièce'), main: true, rendu: (x) => <b>{t(x.nature)}</b> },
              { k: 's', t: t('Statut'), rendu: (x) => <StatutPill t={{ verifiee: 'Vérifiée', en_verification: 'En vérification', expiree: 'Expirée', non_requise: 'Non requise', manquante: 'Manquante' }[x.statut]} ton={x.statut === 'verifiee' ? 'green' : x.statut === 'non_requise' ? 'ink' : x.statut === 'expiree' || x.statut === 'manquante' ? 'red' : 'amber'} /> },
              { k: 'r', t: t('Règle'), rendu: (x) => <span className="t12 c3">{t(x.regle)}</span> },
            ]}
          />
        </Panel>
        <Panel titre={tf('Ce qu’apporte {nom}', { nom: f.nom })} icone="handshake">
          <Li icone="map-pinned" ton="acc" t={tf('{z} prévues', { z: f.zones.join(' et ') })} s={t('Ces zones passeraient à une entreprise active de plus')} />
          <Li icone="circle-help" ton="amber" t={t('Prix d’achat à obtenir')} s={t('La grille sera contrôlée ligne par ligne sous les plafonds avant activation')} />
          <Li icone="shield-check" ton="green" t={t('0 F demandé')} s={t('Aucune caution, aucun dépôt, aucun frais d’entrée')} />
        </Panel>
      </div>
    </>
  )
}

function Suspendue({ f, g }: { f: EntrepriseFiche; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  const s = f.suspension!
  return (
    <>
      <Banniere ton="red" icone="ban" className="admlg-bn">
        <b>{tf('{nom} est suspendue.', { nom: f.nom })}</b>
      </Banniere>
      <Hero f={f} ton="red" k={t('Suspendue · aucun nouveau paquet')} pill={<Pill ton="dk" icone="shield-alert">{t('Décision motivée')}</Pill>}>
        <div className="money4 admlg-m4x4">
          <M4 l={t('Depuis')} v={quand(s.depuis, langue)} icone="calendar-x" />
          <M4 l={t('Zones touchées')} v={f.zones.length} s={f.zones.join(', ')} icone="map-pinned" />
          <M4 l={t('Versement')} v={t('maintenu')} s={t('prestations déjà validées')} icone="banknote" />
          <M4 l={t('Recours')} v={t('une fois')} s={s.recours} icone="gavel" />
        </div>
      </Hero>
      <div className="g g2">
        <Panel titre={t('Motif, niveau et recours')} icone="gavel" droite={<StatutPill t="Suspendue" ton="red" />}>
          <Props paires={[[t('Motif'), <b key="m">{s.motif}</b>], [t('Niveau'), t(s.niveau)], [t('Décidée par'), s.par], [t('Ce qui continue'), t('Colis déjà sous sa garde, versement des prestations validées')], [t('Ce qui s’arrête'), t('Tout nouveau paquet, dans toutes ses zones ; les paquets acceptés non commencés sont republiés')], [t('Recours'), s.recours]]} />
          <Chronologie items={[{ le: s.depuis, titre: 'Suspension décidée', detail: s.par, etat: 'mauvais' }, { le: null, titre: 'Recours possible une fois', detail: 'Tranché par la Médiation', etat: 'en_cours' }]} />
          <div className="btns mt12">
            <BoutonGeste g={g} action="entreprise.lever" objet={f.id} resume={tf('Lever la suspension de {nom} : elle revoit les paquets de ses zones.', { nom: f.nom })} />
            <Link className="btn secondary" to={chemin('sanctions')}><Icone nom="gavel" taille={18} /><span>{t('Sanctions et recours')}</span></Link>
          </div>
        </Panel>
        <Panel titre={t('Effet sur le réseau')} icone="network">
          <Li icone="boxes" ton="red" t={t('Paquets publiés sans preneur')} s={t('Ils remontent dans la file d’action avant leur échéance')} to={chemin('paquets')} />
          <Li icone="search" ton="amber" t={t('Recrutement prioritaire')} s={t('Candidatures des entreprises')} to={chemin('candidatures', { genre: 'entreprise' })} />
        </Panel>
      </div>
    </>
  )
}

function Grille({ f }: { f: EntrepriseFiche }) {
  const { t, tf } = usePreferences()
  const bloquees = f.grille.filter((l) => l.controle === 'bloquee')
  return (
    <>
      {bloquees.length > 0 && (
        <Banniere ton="amber" icone="lock" className="admlg-bn">
          <b>{tf('{n} ligne(s) bloquée(s) sur {m}', { n: bloquees.length, m: f.grille.length })}</b> : {bloquees.map((l) => tf('{p} F dépasse le plafond de {pl} F', { p: l.prix ?? 0, pl: l.plafond ?? 0 })).join(' · ')}.
        </Banniere>
      )}
      <Table
        legende={t('Grille contrôlée')}
        rows={f.grille}
        cle={(l) => l.id}
        ligneCls={(l) => (l.controle === 'bloquee' ? 'bad' : undefined)}
        cols={[
          { k: 'p', t: t('Ligne de la grille'), main: true, cls: 'admlg-w200', rendu: (l) => <><b>{t(l.prestation)}</b><div className="t2">{t(l.detail)}</div></> },
          { k: 'prix', t: t('Prix proposé'), cls: 'r', rendu: (l) => (l.prix === null ? '—' : <span className={'admlg-price' + (l.controle === 'bloquee' ? ' s4-cr' : '')}>{(l.supplement ? '+' : '') + francs(l.prix)}</span>) },
          { k: 'pl', t: t('Plafond BelivaY'), cls: 'r', rendu: (l) => (l.plafond === null ? '—' : <b>{francs(l.plafond)}</b>) },
          { k: 'calc', t: t('Calcul'), hideM: true, rendu: (l) => <span className="t12 c3">{t(l.calcul)}</span> },
          { k: 'marge', t: t('Marge de sécurité'), cls: 'r', rendu: (l) => (l.marge === null ? '—' : <b className={l.marge < 0 ? 's4-cr' : 's4-cg'}>{(l.marge < 0 ? '−' : '+') + francs(Math.abs(l.marge))}</b>) },
          { k: 'v', t: t('Contrôle'), rendu: (l) => <Pill ton={CONTROLE[l.controle][1]} sm icone={CONTROLE[l.controle][2]}>{t(CONTROLE[l.controle][0])}</Pill> },
        ]}
        pied={<><span>{f.grilleVersion}</span><span>{tf('{n} lignes · {a} acceptées · {b} bloquée(s)', { n: f.grille.length, a: f.grille.filter((l) => l.controle === 'ok').length, b: bloquees.length })}</span></>}
      />
      <div className="g g2">
        <Panel titre={t('Révision de la grille')} icone="circle-help" droite={bloquees.length ? <StatutPill t="Ligne bloquée" ton="red" /> : undefined}>
          <div className="fourEyes mt10"><Icone nom="users" taille={18} /><span>{t('Direction, puis Direction ou Finance.')}</span></div>
          <div className="btns mt12"><Link className="btn secondary" to={chemin('parametrage')}><Icone nom="sliders-horizontal" taille={18} /><span>{t('Proposer une révision')}</span></Link></div>
        </Panel>
        <Panel titre={t('Comment la console contrôle')} icone="calculator">
          <div className="codeblk">{[tf('plafond d’achat par colis (relais) : {s} F', { s: Math.min(PARAM.entreprises.achat.S, PARAM.entreprises.achat.M, PARAM.entreprises.achat.L) }), tf('plafond d’achat domicile : {d} F', { d: PARAM.entreprises.achat.domicile }), t('prix d’achat ≤ plafond, ligne par ligne'), tf('marge de sécurité : {m} % des coûts', { m: PARAM.entreprises.margePct })].join('\n')}</div>
          <details className="a-plie">
            <summary>{tf('Annonce {j} jours avant', { j: PARAM.entreprises.preavisGrilleJ })}</summary>
            <div className="a-plie-c t13 lh">{tf('Un changement de grille est annoncé {j} jours à l’avance et ne touche jamais les paquets déjà publiés : chaque paquet garde la version de grille appliquée.', { j: PARAM.entreprises.preavisGrilleJ })}</div>
          </details>
        </Panel>
      </div>
    </>
  )
}
