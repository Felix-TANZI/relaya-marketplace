// ADM-P17 Points relais (prototype : #relais, ?s=fiche, ?s=configuration, ?s=sature, ?s=ferme). Réseau : indicateurs,
// tableau (remplissage avec repère du seuil de saturation), carte, saturation et fermetures, chaîne du candidat à
// l'ouverture, versement du vendredi (dette d'espèces, CACHEE-07), ouvrir ou fermer un relais. Fiche (?id=) selon
// l'état CALCULÉ par la source : en configuration (six étapes), saturé (bascule proposée), fermé (transfert des
// colis), ouvert (local, capacité par classe, KYC et contrat, visite, journée, constats et versements). La console
// propose et décide avec motif ; l'écran du gérant est tenu par l/relais (a-valider/S4.md « À brancher avec l/relais »).
import { LienPoste } from '../../composants/poste/LienPoste'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { PARAMETRES } from '../../calculs/registre'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { BoutonAppel } from '../../composants/BoutonAppel'
import { Perimetre } from '../../composants/Perimetre'
import { Anneau, Banniere, Kpi, Kv, Li, Note, Panel, Pill, Props, Recherche, Table, AucunResultat, normaliser, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { RelaisCourt, RelaisFiche, StatutRelais } from '../../donnees/domaines/logistique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { pageOuverte } from '../../config/droits'
import { useDroit, usePerimetre, useSession } from '../../session'
import { useFonctions } from '../AJ-A/fonctions-page'
import { CarteReseau, Legende } from '../ADM-09/CarteReseau'
import { BoutonGeste, Chaine, Check, Chronologie, Introuvable, Jauge, Lu, M4, RowSt, StatutPill, ZonePt, dateCourte, francs, quand, useGestes } from './commun'
import { PARAM } from './parametres'
import { AccesActeur } from '../SURVEILLER/AccesActeur'

export const STATUT_RELAIS: Record<StatutRelais, [string, 'green' | 'red' | 'amber' | 'ink']> = {
  ouvert: ['Ouvert', 'green'],
  sature: ['Saturé', 'red'],
  ferme: ['Fermé', 'red'],
  en_configuration: ['En configuration', 'amber'],
  fin_convention: ['Fin de convention', 'amber'],
}
const tonCarte = (r: RelaisCourt) => (r.statut === 'sature' || r.statut === 'ferme' ? 'red' : r.statut === 'en_configuration' ? 'ink' : 'blue')

export default function Relais() {
  const [p] = useSearchParams()
  const id = p.get('id')
  return id ? <FicheRelais id={id} /> : <Reseau />
}

function Reseau() {
  const { t, tf, langue } = usePreferences()
  const surtitre = useSurtitre()
  const naviguer = useNavigate()
  const droit = useDroit('relais')
  const zones = usePerimetre()
  const { role } = useSession()
  const [p, setP] = useSearchParams()
  const l = useLecture(() => source.logistique.relais(), [])
  const cands = useLecture(() => (pageOuverte('candidatures', role) ? source.logistique.candidatures() : Promise.resolve([])), [role])
  const g = useGestes()
  const [q, setQ] = useState('')
  const statut = (p.get('statut') ?? '') as '' | StatutRelais
  const setStatut = (v: '' | StatutRelais) => setP((x) => { const n = new URLSearchParams(x); if (v) n.set('statut', v); else n.delete('statut'); return n }, { replace: true })
  const rel = l.donnees ?? []
  const config = rel.filter((r) => r.statut === 'en_configuration')
  const satures = rel.filter((r) => r.statut === 'sature')
  const fermes = rel.filter((r) => r.statut === 'ferme' && r.fermeture && !r.fermeture.transfert)
  const manquants = rel.reduce((n, r) => n + r.manquants.reduce((m, x) => m + x.colis.length, 0), 0)
  const aRevoir = (cands.donnees ?? []).filter((c) => c.genre === 'relais' && c.etat !== 'acceptee' && c.etat !== 'refusee').length
  const fonctions = useFonctions([
    { verbe: 'Activer', n: config.length, unite: ['relais', 'relais'], icone: 'store', route: 'relais', params: { statut: 'en_configuration' }, geste: true },
    { verbe: 'Décider', n: satures.length, unite: ['relais saturé', 'relais saturés'], icone: 'gauge', route: 'relais', params: { statut: 'sature' }, geste: true, alerte: true },
    { verbe: 'Transférer', n: fermes.length, unite: ['relais fermé', 'relais fermés'], icone: 'truck', route: 'relais', params: { statut: 'ferme' }, geste: true, alerte: true },
    manquants > 0 && { verbe: 'Instruire', n: manquants, unite: ['colis manquant', 'colis manquants'], icone: 'package-search', route: 'relais', params: { id: rel.find((r) => r.manquants.length)?.id }, alerte: true },
    { verbe: 'Revoir', n: aRevoir, unite: ['candidature', 'candidatures'], icone: 'user-plus', route: 'candidatures', params: { genre: 'relais' } },
  ]).slice(0, 4)
  const actions = (
    <>
      <Link className="btn secondary" to={chemin('carte', { calque: 'relais' })}>
        <Icone nom="map" taille={18} />
        <span>{t('Voir sur la carte')}</span>
      </Link>
      {droit.acces !== 'lecture' && (
        <Link className="btn primary" to={chemin('candidatures', { genre: 'relais' })}>
          <Icone nom="plus" taille={18} />
          <span>{t('Ajouter un relais candidat')}</span>
        </Link>
      )}
    </>
  )
  return (
    <Ecran route="relais" kicker={surtitre} actions={<>{actions}<LienPoste genre="constat" /></>} fonctions={fonctions}>
      <Perimetre route="relais" />
      {g.rendu}
      <Lu l={l} quoi="La liste des relais">
        {(rel) => {
          const ouverts = rel.filter((r) => r.statut !== 'en_configuration' && r.statut !== 'ferme')
          const places = ouverts.reduce((n, r) => n + r.capacite, 0)
          const occ = ouverts.reduce((n, r) => n + r.occupes, 0)
          const garde = rel.reduce((n, r) => n + r.enGarde, 0)
          const plein = [...ouverts].sort((a, b) => b.enGarde - a.enGarde)[0]
          const annonces = rel.filter((r) => r.annonce)
          const vendredi = rel[0]?.versement.vendredi
          const filtres = rel
            .filter((r) => (!statut || r.statut === statut) && (!q || normaliser(`${r.nom} ${r.gerant} ${r.zone} ${r.zoneNom}`).includes(normaliser(q))))
            .sort((a, b) => b.taux - a.taux)
          const presents = (Object.keys(STATUT_RELAIS) as StatutRelais[]).filter((k) => rel.some((r) => r.statut === k))
          return (
            <>
              <div className="g g4">
                <Kpi k={t('Relais ouverts')} v={ouverts.length} u={tf('/ {n} zones exploitées', { n: PARAMETRES.zonesExploitees.length })} icone="package-check" ton="night" />
                <Kpi k={t('Remplissage du réseau')} v={places ? `${Math.round((100 * occ) / places)} %` : '—'} s={tf('{o} places occupées sur {c}', { o: occ, c: places })} icone="gauge" />
                <Kpi k={t('Colis en garde')} v={garde} s={plein ? tf('{n} au {nom}, le plus rempli', { n: plein.enGarde, nom: plein.nom }) : undefined} icone="boxes" />
                <Kpi k={t('En configuration')} v={config.length} s={config.map((r) => `${r.nom} (${r.zone})`).join(' · ') || t('Aucun')} icone="hourglass" iton="amber" />
              </div>
              <div className="chips a-segs mt16" role="group" aria-label={t('Statut')}>
                <button type="button" className={'chip' + (!statut ? ' on' : '')} aria-pressed={!statut} onClick={() => setStatut('')}>
                  {t('Tous')} <span className="n">{rel.length}</span>
                </button>
                {presents.map((k) => (
                  <button key={k} type="button" className={'chip' + (statut === k ? ' on' : '')} aria-pressed={statut === k} onClick={() => setStatut(k)}>
                    {t(STATUT_RELAIS[k][0])} <span className="n">{rel.filter((r) => r.statut === k).length}</span>
                  </button>
                ))}
              </div>
              <div className="mt10">
                <Table
                  legende={t('Relais du réseau')}
                  outils={
                    <div className="s4-filtres">
                      <Recherche q={q} setQ={setQ} placeholder={t('Relais, gérant, zone…')} aria={t('Rechercher un relais')} />
                    </div>
                  }
                  rows={filtres}
                  cle={(r) => r.id}
                  ligneCls={(r) => (r.statut === 'sature' || r.statut === 'ferme' ? 'bad' : r.statut === 'en_configuration' ? 'warn' : undefined)}
                  vide={<AucunResultat effacer={() => (setQ(''), setStatut(''))} />}
                  cols={[
                    { k: 'rel', t: t('Relais'), main: true, cls: 'admlg-w230', rendu: (r) => (
                      <Link to={chemin('relais', { id: r.id })} className="s4-ligne">
                        <span className={'ic ' + (r.statut === 'en_configuration' ? '' : 'blue')} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icone nom="package-check" taille={18} />
                        </span>
                        <span className="grow">
                          <b className="t14" style={{ display: 'block' }}>{r.nom}</b>
                          <span className="t12 c3">{tf('Gérant·e : {g}', { g: r.gerant })}</span>
                        </span>
                      </Link>
                    ) },
                    { k: 'zone', t: t('Zone'), rendu: (r) => <ZonePt code={r.zone} nom={r.zoneNom} ton={r.statut === 'en_configuration' ? 'sale' : ''} /> },
                    { k: 'st', t: t('Statut'), rendu: (r) => (<><StatutPill t={STATUT_RELAIS[r.statut][0]} ton={STATUT_RELAIS[r.statut][1]} />{r.annonce && <div className="t2 ca b7">{tf('Fermeture annoncée du {du} au {au}', { du: r.annonce.du.slice(5), au: r.annonce.au.slice(5) })}</div>}</>) },
                    { k: 'fill', t: t('Remplissage'), rendu: (r) => <Jauge occupes={r.occupes} capacite={r.capacite} off={r.statut === 'en_configuration'} sous /> },
                    { k: 'garde', t: t('En garde'), cls: 'r', rendu: (r) => (r.statut === 'en_configuration' ? '—' : <b>{r.enGarde}</b>) },
                    { k: 'ferme', t: t('Ferme à'), hideM: true, rendu: (r) => r.fermeA },
                    { k: 'ts', t: t('Trust Score'), hideM: true, rendu: (r) => (r.trustScore === null ? '—' : <b>{r.trustScore}</b>) },
                    { k: 'pay', t: tf('À verser le {d}', { d: vendredi ? dateCourte(vendredi, langue) : '—' }), cls: 'r', rendu: (r) => (r.statut === 'en_configuration' ? '—' : (
                      <>
                        <b>{francs(r.versement.aVerser)}</b>
                        <div className="t2">{r.versement.report ? <span className="s4-cr">{tf('report {m}', { m: francs(r.versement.report) })}</span> : tf('{n} colis remis', { n: r.versement.colisRemis })}</div>
                      </>
                    )) },
                  ]}
                  pied={<span>{tf('{n} relais · {o} ouverts · {c} en configuration', { n: rel.length, o: ouverts.length, c: config.length })}</span>}
                />
              </div>
              <div className="g g21">
                <Panel titre={t('Carte des relais')} icone="map" a={{ t: t('Carte opérationnelle'), to: chemin('carte', { calque: 'relais' }) }}>
                  <CarteReseau
                    titre={t('Carte des relais')}
                    zones={Object.fromEntries([...new Set(rel.map((r) => r.zone))].map((z) => [z, 'on' as const]))}
                    cadreZones={zones ?? [...new Set(rel.map((r) => r.zone))]}
                    points={rel.map((r) => ({ id: r.id, acteur: 'relais' as const, lat: r.lat, lng: r.lng, ton: tonCarte(r), nom: `${r.nom} · ${t(STATUT_RELAIS[r.statut][0])} · ${r.taux} %`, etiquette: r.statut === 'en_configuration' ? t('config.') : r.statut === 'ferme' ? t('fermé') : `${r.taux} %` }))}
                    surPoint={(x) => naviguer(chemin('relais', { id: x }))}
                  />
                  <Legende zones={[['zone', 'Zone exploitée']]} acteurs={['relais']} statuts={[['alerte', 'Saturé ou fermé'], ['inactif', 'En configuration']]} />
                </Panel>
                <Panel titre={t('Saturation et fermetures')} icone="siren">
                  {satures.map((r) => <Li key={r.id} icone="circle-alert" ton="red" t={tf('{nom} · saturé {p} %', { nom: r.nom, p: r.taux })} s={r.bascule ? tf('Bascule vers {v}', { v: r.bascule.versNom }) : r.secours ? tf('Secours proposé : {v} ({d} km)', { v: r.secours.nom, d: r.secours.distanceKm }) : t('Aucun relais de secours avec de la place')} to={chemin('relais', { id: r.id })} />)}
                  {fermes.map((r) => <Li key={r.id} icone="store" ton="red" t={tf('{nom} · fermé depuis {h}', { nom: r.nom, h: quand(r.fermeture!.depuis, langue, false) })} s={tf('{n} colis à transférer', { n: r.enGarde })} to={chemin('relais', { id: r.id })} />)}
                  {annonces.map((r) => <Li key={'a' + r.id} icone="calendar-x" ton="amber" t={tf('{nom} · fermeture annoncée', { nom: r.nom })} s={`${r.annonce!.du} → ${r.annonce!.au} · ${r.annonce!.motif}`} to={chemin('relais', { id: r.id })} />)}
                  {rel.filter((r) => r.manquants.length).map((r) => <Li key={'m' + r.id} icone="package-search" ton="red" t={tf('{nom} · {n} colis manquants', { nom: r.nom, n: r.manquants.reduce((m, x) => m + x.colis.length, 0) })} s={r.manquants.map((x) => x.inventaire).join(' · ')} to={chemin('relais', { id: r.id })} />)}
                  {!satures.length && !fermes.length && !annonces.length && !manquants && <Li icone="circle-check" ton="green" t={t('Aucun relais saturé ni fermé')} />}
                </Panel>
              </div>
              <Panel titre={tf('Versement du {d}', { d: vendredi ? dateCourte(vendredi, langue) : '—' })} icone="banknote" a={{ t: t('Versements'), to: chemin('versements') }}>
                {rel.filter((r) => r.versement.vendredisReport >= PARAM.relais.reportVendredis).map((r) => (
                  <div key={r.id} className="card flat s4-dette" style={{ padding: '12px 14px', marginBottom: 10 }}>
                    <b className="t14">{tf('{nom} : dette d’espèces reportée sur {n} vendredis ({m})', { nom: r.nom, n: r.versement.vendredisReport, m: francs(r.versement.report) })}</b>
                    <div className="mt10">{r.versement.plan ? <Pill ton="green" sm icone="check">{tf('Plan validé · {qui}', { qui: r.versement.plan.par })}</Pill> : <BoutonGeste g={g} action="relais.apurement" objet={r.id} resume={tf('Plan d’apurement de {m} pour {nom}, retenu sur les prochains versements.', { m: francs(r.versement.report), nom: r.nom })} sm />}</div>
                  </div>
                ))}
                {rel.filter((r) => r.statut !== 'en_configuration').map((r) => (
                  <Kv key={r.id} k={<>{r.nom} <span className="c3 t12">· {tf('{n} colis, {j} jours, espèces {e}', { n: r.versement.colisRemis, j: r.versement.jours, e: francs(r.versement.especes) })}</span></>} v={r.versement.report ? <span className="s4-cr">{tf('0 F · report {m}', { m: francs(r.versement.report) })}</span> : francs(r.versement.aVerser)} />
                ))}
                <Kv k={<b>{t('Total prévu pour les relais')}</b>} v={<b>{francs(rel.reduce((n, r) => n + r.versement.aVerser, 0))}</b>} />
                <details className="a-plie">
                  <summary>{t('Règles du réseau')}</summary>
                  <div className="a-plie-c t13 c3 lh">
                    <div>{tf('Rémunération : {s} / {m} / {l} F par colis remis, {g} F par jour de garde facturé, moins les espèces de garde encaissées par le gérant. Versé sans demande vers le numéro vérifié.', { s: PARAM.relais.gains.S, m: PARAM.relais.gains.M, l: PARAM.relais.gains.L, g: PARAM.relais.garde })}</div>
                    <div className="mt8">{tf('Seuil de {s} % : plus de nouveaux paquets et bascule proposée ; {r} % : dépôts refusés', { s: PARAM.relais.saturePct, r: PARAM.relais.refusPct })}</div>
                    <div className="mt8">{tf('Remplissage = places occupées ÷ places déclarées (S = {s}, M = {m}, L = {l})', { s: PARAM.relais.places.S, m: PARAM.relais.places.M, l: PARAM.relais.places.L })}</div>
                    <div className="mt8">{t('Six étapes avant « Ouvert » : dossier du gérant, numéro Mobile Money vérifié, convention signée, visite, formation, capacité et horaires.')}</div>
                  </div>
                </details>
              </Panel>
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}

function FicheRelais({ id }: { id: string }) {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const naviguer = useNavigate()
  const l = useLecture(() => source.logistique.relaisFiche(id).then((f) => ({ f })), [id])
  const g = useGestes()
  const r = l.donnees?.f ?? null
  const retour = () => naviguer(chemin('relais'))
  const actions = (
    <>
      {r && <BoutonAppel nom={r.nom} qui="Point relais" motif={t('Intervention ou déblocage au relais')} objet={id} />}
      <Link className="btn secondary" to={chemin('messagerie', { relais: id })}>
        <Icone nom="message-circle" taille={18} />
        <span>{t('Messagerie du relais')}</span>
      </Link>
      <Link className="btn secondary" to={chemin('carte', { calque: 'relais', id })}>
        <Icone nom="map" taille={18} />
        <span>{t('Voir sur la carte')}</span>
      </Link>
    </>
  )
  return (
    <Ecran route="relais" titre={r?.nom ?? t('Points relais')} nom={r?.nom} retour={chemin('relais')} kicker={r ? `${r.zone} ${r.zoneNom} · ${surtitre}` : surtitre} actions={actions}>
      {g.rendu}
      <Lu l={l} quoi="La fiche du relais">
        {({ f: f }) =>
          f ? (
            <>
              <AccesActeur espace="relais" id={f.id} nom={f.nom} zone={f.zone} />
              <ContenuFiche f={f} g={g} />
            </>
          ) : (
            <Introuvable quoi="Relais introuvable" retour={retour} libelle="Retour à la liste" />
          )
        }
      </Lu>
    </Ecran>
  )
}
function ContenuFiche({ f, g }: { f: RelaisFiche; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  if (f.statut === 'en_configuration') return <Configuration f={f} g={g} />
  if (f.statut === 'sature') return <Sature f={f} g={g} />
  if (f.statut === 'ferme' && f.fermeture) return <Ferme f={f} g={g} />
  const preavis = f.convention.finLe
  return (
    <>
      {f.statut === 'fin_convention' && preavis && (
        <Banniere ton="amber" icone="circle-x" className="admlg-bn">
          <b>{tf('Fin de convention le {d}.', { d: dateCourte(preavis, langue) })}</b>
        </Banniere>
      )}
      <div className="g g21">
        <div className="hero night">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="hk">{tf('{st} · Trust Score {ts}', { st: t(STATUT_RELAIS[f.statut][0]), ts: f.trustScore ?? '—' })}</span>
            <Pill ton="dk" icone="map-pin">{`${f.zone} ${f.zoneNom}`}</Pill>
          </div>
          <div className="row mt12" style={{ gap: 18, alignItems: 'center' }}>
            <Anneau v={f.occupes} max={f.capacite} couleur="var(--gold-l)" taille={96} libelle={`${f.taux} %`} aria={tf('{p} % des places occupées', { p: f.taux })} />
            <div className="grow">
              <div className="ht" style={{ margin: 0 }}>{tf('{n} colis en garde', { n: f.enGarde })}</div>
              <div className="hs">{tf('{o} places occupées sur {c} · saturation à {s} %, refus des dépôts à {r} %', { o: f.occupes, c: f.capacite, s: PARAM.relais.saturePct, r: PARAM.relais.refusPct })}</div>
              <div className="mt10"><Jauge occupes={f.occupes} capacite={f.capacite} grande /></div>
            </div>
          </div>
          <div className="money4 admlg-m4x4">
            <M4 l={t('Ferme à')} v={f.fermeA} s={t('lundi au samedi')} icone="clock" />
            <M4 l={t('Remis cette semaine')} v={tf('{n} colis', { n: f.versement.colisRemis })} icone="hand-helping" />
            <M4 l={tf('À verser le {d}', { d: dateCourte(f.versement.vendredi, langue) })} v={francs(f.versement.aVerser)} s={f.versement.report ? tf('report {m}', { m: francs(f.versement.report) }) : undefined} icone="banknote" />
            <M4 l={t('Constats ouverts')} v={f.constatsOuverts} s={tf('traités sous {h} h ouvrées', { h: PARAM.relais.constatH })} icone="clipboard-check" />
          </div>
        </div>
        <Panel titre={t('Photos du local')} icone="camera">
          {f.photos.length ? (
            <ul className="s4-photos">
              {f.photos.map((p) => (
                <li key={p.nature} className="card flat">
                  <Icone nom="image" taille={22} />
                  <b>{t(p.nature)}</b>
                  <span className="t12 c3">{quand(p.le, langue)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="t13 c3">{t('Aucune photo : la visite n’a pas eu lieu.')}</p>
          )}
        </Panel>
      </div>
      <div className="g g3">
        <Panel titre={t('Capacité par classe')} icone="boxes">
          {(['S', 'M', 'L'] as const).map((c) => (
            <RowSt key={c} l={<><b>{c}</b> · {tf('{p} place(s) par colis', { p: PARAM.relais.places[c] })}</>} r={tf('{n} colis · {p} places', { n: f.parClasse[c], p: f.parClasse[c] * PARAM.relais.places[c] })} />
          ))}
          <RowSt l={<b>{t('Total')}</b>} r={<b>{tf('{o} places sur {c}', { o: f.occupes, c: f.capacite })}</b>} />
        </Panel>
        <Panel titre={t('KYC et contrat')} icone="id-card">
          <Props
            paires={[
              [t('Gérant·e'), <b key="g">{f.gerant}</b>],
              [t('Pièce d’identité'), <StatutPill key="p" t={f.kyc.piece === 'verifiee' ? 'Vérifiée' : 'À revoir'} ton={f.kyc.piece === 'verifiee' ? 'green' : 'amber'} />],
              [t('Numéro de versement'), f.kyc.momo ?? t('À vérifier')],
              [t('Convention relais'), f.convention.signeeLe ? tf('Signée le {d} · version {v}', { d: dateCourte(f.convention.signeeLe, langue), v: f.convention.version }) : t('À signer')],
              [t('Fin de convention'), preavis ? dateCourte(preavis, langue) : t('Aucune')],
              [t('Caution, frais d’entrée'), <b key="c">{t('0 F · jamais')}</b>],
            ]}
          />
          <div className="s4-actes">
            <BoutonGeste g={g} action="relais.fin_convention" objet={f.id} genre="secondary" sm resume={tf('Mettre fin à la convention de {nom} avec un préavis de {j} jours ; le relais reste ouvert jusque-là.', { nom: f.nom, j: PARAM.relais.conventionPreavisJ })} />
            <BoutonGeste g={g} action="relais.fermer" objet={f.id} genre="ghost" sm resume={tf('Fermer définitivement {nom} : retiré du choix des clients et des paquets.', { nom: f.nom })} />
          </div>
        </Panel>
        <Panel titre={t('Visite et formation')} icone="clipboard-check">
          {f.visite ? (
            <>
              <div className="t13 c3">{tf('Visite du {d} · {a}', { d: dateCourte(f.visite.le, langue), a: f.visite.agents })}</div>
              {f.visite.points.map((p) => <Check key={p.t} ok={p.ok}>{t(p.t)}</Check>)}
            </>
          ) : (
            <p className="t13 c3">{t('Visite à planifier.')}</p>
          )}
          <div className="mt10">{f.formationLe ? <StatutPill t="Formation validée" ton="green" /> : <StatutPill t="Formation à faire" ton="amber" />}</div>
        </Panel>
      </div>
      <div className="g g2">
        <Panel titre={t('Aujourd’hui au relais')} icone="history">
          <Chronologie items={f.journee} />
        </Panel>
        <Panel titre={t('Constats, sanctions, versements, secours')} icone="layers">
          {f.annonce && <Li icone="calendar-x" ton="amber" t={tf('Fermeture annoncée du {du} au {au}', { du: f.annonce.du, au: f.annonce.au })} s={f.annonce.motif} />}
          {f.manquants.map((m) => <Li key={m.inventaire} icone="package-search" ton="red" t={tf('Inventaire {i} · {n} colis manquants', { i: m.inventaire, n: m.colis.length })} s={m.colis.join(' · ')} to={chemin('litige')} />)}
          <Li icone="clipboard-check" ton={f.constatsOuverts ? 'amber' : 'green'} t={f.constatsOuverts ? tf('{n} constat(s) ouvert(s)', { n: f.constatsOuverts }) : t('Aucun constat ouvert')} s={tf('Un constat (colis abîmé ou non conforme) est traité sous {h} h ouvrées', { h: PARAM.relais.constatH })} to={chemin('litige')} />
          <Li icone="gavel" ton="green" t={t('Sanctions')} s={t('Historique des sanctions du relais')} to={chemin('sanctions')} />
          <Li icone="banknote" ton="acc" t={tf('Prochain versement : {d}', { d: dateCourte(f.versement.vendredi, langue) })} s={tf('Gains {g} − espèces de garde {e} = {s}', { g: francs(f.versement.gains), e: francs(f.versement.especes), s: francs(f.versement.solde) })} to={chemin('versements')} />
          <Li icone="life-buoy" ton="amber" t={f.autresRelaisZone ? tf('{n} autre(s) relais dans la zone', { n: f.autresRelaisZone }) : tf('Aucun relais de secours en {z}', { z: f.zone })} s={t('Le secours est proposé au plus proche relais ouvert ayant de la place')} />
        </Panel>
      </div>
    </>
  )
}

function Configuration({ f, g }: { f: RelaisFiche; g: ReturnType<typeof useGestes> }) {
  const { t, tf } = usePreferences()
  const faites = f.etapes.filter((e) => e.etat === 'fait').length
  return (
    <>
      <Panel titre={tf('Chaîne d’ouverture · {n} étapes sur {t}', { n: faites, t: f.etapes.length })} icone="list-checks" droite={<StatutPill t="En configuration" ton="amber" />}>
        <Chaine etapes={[...f.etapes, { titre: 'Ouvert', detail: 'Bloqué tant qu’une étape manque', etat: faites === f.etapes.length ? 'en_cours' : 'bloque' }]} />
        <div className="btns mt16">
          {f.kyc.dossier && (
            <Link className="btn secondary" to={chemin('kyc', { id: f.kyc.dossier })}>
              <Icone nom="id-card" taille={18} />
              <span>{t('Revoir le KYC')}</span>
            </Link>
          )}
          <Link className="btn secondary" to={chemin('comptes')}>
            <Icone nom="calendar-plus" taille={18} />
            <span>{t('Planifier la visite')}</span>
          </Link>
          <Link className="btn secondary" to={chemin('messagerie', { relais: f.id })}>
            <Icone nom="graduation-cap" taille={18} />
            <span>{t('Envoyer la formation')}</span>
          </Link>
          <BoutonGeste g={g} action="relais.activer" objet={f.id} resume={tf('Ouvrir {nom} : il devient sélectionnable par les clients et reçoit des paquets.', { nom: f.nom })} />
        </div>
      </Panel>
      <div className="g g3">
        <Panel titre={t('Pourquoi il n’est pas « Ouvert »')} icone="circle-help">
          <ol className="t13 lh" style={{ margin: 0, paddingLeft: 18 }}>
            {f.etapes.filter((e) => e.etat !== 'fait').map((e) => (
              <li key={e.titre}>
                <b>{t(e.titre)}</b> : {t(e.detail)}
              </li>
            ))}
            {f.autresRelaisZone >= PARAM.relais.parZone && <li><b>{t('Second relais dans la zone')}</b> : {t('décision de la Direction, fondée sur le remplissage.')}</li>}
          </ol>
        </Panel>
        <Panel titre={t('Ce que déclare le gérant')} icone="store">
          <Props paires={[[t('Gérant·e'), <b key="g">{f.gerant}</b>], [t('Zone'), `${f.zone} ${f.zoneNom}`], [t('Places déclarées'), tf('{n} · à mesurer à la visite', { n: f.capacite })], [t('Fermeture'), f.fermeA], [t('Caution, frais d’entrée'), <b key="c">0 F</b>], [t('Rémunération prévue'), tf('{s} / {m} / {l} F par colis, {g} F par jour facturé', { s: PARAM.relais.gains.S, m: PARAM.relais.gains.M, l: PARAM.relais.gains.L, g: PARAM.relais.garde })]]} />
        </Panel>
        <Panel titre={tf('Zone {z}', { z: f.zone })} icone="map">
          <CarteReseau titre={tf('Zone {z}', { z: f.zone })} zones={{ [f.zone]: 'on' }} cadreZones={[f.zone]} points={[{ id: f.id, acteur: 'relais', lat: f.lat, lng: f.lng, ton: 'ink', nom: f.nom, etiquette: t('config.') }]} />
          <Li icone="map-pinned" ton="acc" t={t('Pilotage des zones')} s={t('Demande, vendeurs, entreprises, relais : tout est dans Pilotage des zones')} to={chemin('zones', { zone: f.zone })} />
        </Panel>
      </div>
    </>
  )
}

function Sature({ f, g }: { f: RelaisFiche; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  const resume = f.secours ? tf('Orienter les nouveaux paquets de {z} vers {v} jusqu’au retour sous {s} % ; les colis déjà en garde restent au {nom}.', { z: f.zone, v: f.secours.nom, s: PARAM.relais.saturePct, nom: f.nom }) : ''
  return (
    <>
      <Banniere ton="red" icone="circle-alert" className="admlg-bn" bouton={f.bascule ? undefined : <BoutonGeste g={g} action="relais.basculer" objet={f.id} resume={resume} genre="secondary" />}>
        <b>{tf('{nom} saturé : {p} % ({o} places sur {c}).', { nom: f.nom, p: f.taux, o: f.occupes, c: f.capacite })}</b> {f.bascule ? tf('Bascule en place vers {v} depuis {h}.', { v: f.bascule.versNom, h: quand(f.bascule.le, langue, false) }) : null}
      </Banniere>
      <div className="g g21">
        <Panel titre={f.nom} icone="package-check" droite={<StatutPill t="Saturé" ton="red" />}>
          <div className="row" style={{ gap: 18, alignItems: 'center' }}>
            <Anneau v={f.occupes} max={f.capacite} couleur="var(--red)" taille={92} libelle={`${f.taux} %`} aria={tf('{p} % des places occupées', { p: f.taux })} />
            <div className="grow">
              <div className="b8 t19">{tf('{o} places occupées sur {c}', { o: f.occupes, c: f.capacite })}</div>
              <div className="t13 c3 mt4">{tf('{n} colis en garde : {s} S, {m} M, {l} L', { n: f.enGarde, s: f.parClasse.S, m: f.parClasse.M, l: f.parClasse.L })}</div>
              <div className="mt14"><Jauge occupes={f.occupes} capacite={f.capacite} grande /></div>
            </div>
          </div>
          <div className="mt14"><Chronologie items={f.journee} /></div>
        </Panel>
        <Panel titre={t('Bascule proposée')} icone="arrow-right-left" droite={<Pill ton="or" sm>{tf('Décision Opérations {z}', { z: f.zone })}</Pill>}>
          {f.secours ? (
            <div className="card flat mt12" style={{ padding: '12px 14px' }}>
              <div className="s4-ligne">
                <span className="ic blue" style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icone nom="package-check" taille={18} /></span>
                <div className="grow">
                  <b className="t14">{f.secours.nom}</b>
                  <div className="t12 c3">{tf('{z} · à {d} km', { z: f.secours.zone, d: f.secours.distanceKm })}</div>
                </div>
              </div>
              <div className="mt10"><Jauge occupes={f.secours.occupes} capacite={f.secours.capacite} sous /></div>
            </div>
          ) : (
            <Note ton="red" icone="triangle-alert" className="mt12">{t('Aucun relais ouvert n’a de place : les paquets attendent sous la saturation.')}</Note>
          )}
          <details className="a-plie">
            <summary>{t('Effet si vous validez')}</summary>
            <ul className="a-plie-c t13 lh" style={{ margin: 0, paddingLeft: 32 }}>
              <li>{tf('Les nouveaux paquets de {z} sont orientés vers le relais de secours jusqu’au retour sous {s} %.', { z: f.zone, s: PARAM.relais.saturePct })}</li>
              <li>{t('Les clients des nouvelles commandes voient ce relais de retrait avant de payer.')}</li>
              <li>{tf('Les {n} colis déjà en garde restent au relais saturé.', { n: f.enGarde })}</li>
            </ul>
          </details>
          {f.bascule && <Note ton="green" icone="check" className="mt10">{tf('Bascule décidée par {qui} · {h}', { qui: f.bascule.par, h: quand(f.bascule.le, langue) })}</Note>}
          {f.attente && !f.bascule && <Note ton="amber" icone="pause" className="mt10">{tf('Gardé en attente par {qui} · {h}', { qui: f.attente.par, h: quand(f.attente.le, langue) })}</Note>}
          <div className="btns admlg-btnsv mt14">
            <BoutonGeste g={g} action="relais.basculer" objet={f.id} resume={resume} />
            <BoutonGeste g={g} action="relais.attendre" objet={f.id} genre="secondary" resume={tf('Garder {nom} en attente : aucun nouveau paquet n’y part, sans bascule, jusqu’au retour sous le seuil.', { nom: f.nom })} />
          </div>
        </Panel>
      </div>
    </>
  )
}

function Ferme({ f, g }: { f: RelaisFiche; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  const fe = f.fermeture!
  const resume = f.secours ? tf('Transférer les {n} colis en garde vers {v} ({d} km) : mission publiée en paquet de transfert, clients prévenus du nouveau relais, garde reprise au dépôt.', { n: f.enGarde, v: f.secours.nom, d: f.secours.distanceKm }) : ''
  return (
    <>
      {!fe.transfert && (
        <Banniere ton="red" icone="store" className="admlg-bn" bouton={<BoutonGeste g={g} action="relais.transferer" objet={f.id} resume={resume} genre="secondary" />}>
          <b>{tf('{nom} fermé sans prévenir depuis {h}.', { nom: f.nom, h: quand(fe.depuis, langue, false) })}</b> {tf('{n} colis à transférer', { n: f.enGarde })}
        </Banniere>
      )}
      <div className="hero night s4-rouge">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="hk">{t('Fermé · durée inconnue')}</span>
          <Pill ton="dk" icone="map-pin">{`${f.zone} ${f.zoneNom}`}</Pill>
        </div>
        <div className="ht" style={{ marginTop: 12 }}>{f.nom}</div>
        <div className="hs">{tf('Fermé sans prévenir depuis {h}. Signalé par : {qui}.', { h: quand(fe.depuis, langue), qui: fe.signalePar })}</div>
        <div className="money4 admlg-m4x4">
          <M4 l={t('Colis en garde')} v={f.enGarde} s={tf('{s} S, {m} M, {l} L', { s: f.parClasse.S, m: f.parClasse.M, l: f.parClasse.L })} icone="boxes" />
          <M4 l={t('Jours de garde')} v={t('suspendus')} s={t('jamais facturés pendant la fermeture')} icone="calendar-x" />
          <M4 l={t('Relance du gérant')} v={fe.relance ? quand(fe.relance, langue, false) : t('à faire')} icone="message-circle" />
          <M4 l={t('Transfert')} v={fe.transfert ? t('fait') : t('à décider')} s={fe.transfert ? fe.transfert.versNom : undefined} icone="truck" />
        </div>
      </div>
      <div className="g g2">
        <Panel titre={fe.transfert ? tf('{n} colis transférés', { n: fe.transfert.colis }) : tf('Transfert des {n} colis', { n: f.enGarde })} icone="arrow-right-left">
          {fe.transfert ? (
            <Note ton="green" icone="check">{tf('Transférés vers {v} · {h}. Les clients ont reçu leur nouveau relais et un nouveau code ; la garde reprend au dépôt.', { v: fe.transfert.versNom, h: quand(fe.transfert.le, langue) })}</Note>
          ) : (
            <>
              {f.secours && (
                <div className="card flat mt12" style={{ padding: '12px 14px' }}>
                  <b className="t14">{f.secours.nom}</b>
                  <div className="t12 c3">{tf('{z} · {a} → {b} places sur {c} après le transfert', { z: f.secours.zone, a: f.secours.occupes, b: f.secours.occupes + f.occupes, c: f.secours.capacite })}</div>
                  <div className="mt10"><Jauge occupes={f.secours.occupes + f.occupes} capacite={f.secours.capacite} sous /></div>
                </div>
              )}
              <div className="mt12">
                <Kv k={t('Mission')} v={t('Transfert entre relais, publié en paquet')} />
                <Kv k={t('Plafond d’achat')} v={tf('{sm} F (S, M) · {l} F (L) par colis, payé par BelivaY', { sm: PARAM.relais.transfertPlafond.SM, l: PARAM.relais.transfertPlafond.L })} />
                <Kv k={t('Clients')} v={tf('{n} prévenus du nouveau relais', { n: f.enGarde })} />
                <Kv k={t('Garde')} v={t('reprend au dépôt, jours de fermeture non facturés')} />
              </div>
            </>
          )}
          <div className="btns mt14">
            <BoutonGeste g={g} action="relais.transferer" objet={f.id} resume={resume} />
            <BoutonGeste g={g} action="relais.relancer" objet={f.id} genre="secondary" resume={tf('Relancer {g} dans la messagerie du relais ; une fermeture non annoncée pèse sur la Ponctualité.', { g: f.gerant })} />
            <BoutonGeste g={g} action="relais.fermer" objet={f.id} genre="ghost" resume={tf('Fermer définitivement {nom} : retiré du choix des clients et des paquets.', { nom: f.nom })} />
          </div>
        </Panel>
        <Panel titre={t('Déroulé de l’incident')} icone="history">
          <Chronologie items={f.journee} />
        </Panel>
      </div>
      <div className="g g21">
        <Panel titre={t('Carte du réseau')} icone="map">
          <CarteReseau titre={t('Carte du réseau')} zones={{ [f.zone]: 'alerte', ...(f.secours ? { [f.secours.zone]: 'on' } : {}) }} cadreZones={[f.zone, ...(f.secours ? [f.secours.zone] : [])]} points={[{ id: f.id, acteur: 'relais', lat: f.lat, lng: f.lng, ton: 'red', nom: f.nom, etiquette: t('fermé') }]} />
        </Panel>
        <details className="a-plie" style={{ alignSelf: 'start' }}>
          <summary>{t('Règles de fermeture')}</summary>
          <div className="a-plie-c">
          <Li icone="eye-off" ton="acc" t={t('Relais masqué pour les nouvelles commandes')} s={t('Dès la fermeture constatée')} />
          <Li icone="calendar-x" ton="green" t={t('Jours de fermeture jamais facturés')} s={t('Ni au client, ni payés au relais')} />
          <Li icone="clock" ton="ink" t={tf('Sans réponse du client sous {h} h', { h: PARAM.relais.transfertAutoH })} s={t('Transfert automatique au relais ouvert le plus proche, nouveau code')} />
          <Li icone="phone-call" ton="ink" t={tf('Au-delà de {j} jours', { j: PARAM.relais.fermeAppelJ })} s={t('Appel du gérant et décision Direction sur la suite de la convention')} />
          </div>
        </details>
      </div>
    </>
  )
}
