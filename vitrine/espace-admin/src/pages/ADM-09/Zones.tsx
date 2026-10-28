// ADM-P21 Pilotage des zones (prototype : #zones, ?s=vente, ?s=exploitee, ?s=alerte, ?s=erreur). Tableau des douze
// zones et leur santé, UN chiffre expliqué par ses composantes (pondérations du registre : ZONE-SCORE), « où ouvrir »,
// recherches sans résultat. Fiche (?zone=) : exploitée (composantes, réseau, délai saisonnier), en alerte (raisons et
// plan d'action daté, motivé, journalisé), vente seulement (ce qui manque pour ouvrir ; le passage en exploitation est
// un paramètre versionné décidé par la Direction dans Paramétrage, jamais une bascule directe ici).
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { Banniere, Barre, Kpi, Li, Note, Panel, Pill, Table, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { SanteZone, ZonePilotage } from '../../donnees/domaines/logistique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { BoutonGeste, Check, Introuvable, Lu, RowSt, StatutPill, ZonePt, dateCourte, quand, useGestes } from '../ADM-08/commun'
import { STATUT_RELAIS } from '../ADM-08/Relais'
import { PARAM } from '../ADM-08/parametres'
import { CarteReseau, Legende } from './CarteReseau'
import { useFonctions } from '../AJ-A/fonctions-page'

const SANTE: Record<SanteZone, [string, 'green' | 'amber' | 'red' | 'ink']> = { saine: ['Saine', 'green'], surveiller: ['À surveiller', 'amber'], alerte: ['En alerte', 'red'], vente: ['Vente seulement', 'ink'] }
const COMPOSANTES: [keyof NonNullable<ZonePilotage['composantes']>, string][] = [
  ['delai', 'Délai sous 5 h tenu'],
  ['remplissage', 'Remplissage des tournées'],
  ['litiges', 'Litiges'],
  ['couverture', 'Couverture relais et entreprises'],
]
const tonCarte = (z: ZonePilotage) => (z.etat === 'vente' ? 'vente' : z.etat === 'alerte' ? 'alerte' : z.etat === 'surveiller' ? 'surveiller' : 'on') as 'on' | 'vente' | 'alerte' | 'surveiller'

export default function Zones() {
  const [p] = useSearchParams()
  const z = p.get('zone')
  return z ? <Fiche code={z} /> : <Tableau />
}

function Composantes({ z }: { z: ZonePilotage }) {
  const { t } = usePreferences()
  if (!z.composantes) return null
  return (
    <>
      {COMPOSANTES.map(([k, l]) => (
        <div key={k} className="admlg-comp">
          <span className="b7">{t(l)}</span>
          <Barre pct={z.composantes![k]} ton={z.composantes![k] >= 75 ? 'green' : z.composantes![k] >= 50 ? '' : 'red'} aria={`${t(l)} : ${z.composantes![k]}`} />
          <span className="w">{PARAM.zones.poids[k]} %</span>
          <span className="v">{z.composantes![k]}</span>
        </div>
      ))}
      <div className="admlg-comp" style={{ borderTop: '1.5px solid var(--line-2)' }}>
        <span className="b8">{t('Santé de la zone')}</span>
        <span className="t12 c3">{t('Σ poids × composante')}</span>
        <span className="w">100 %</span>
        <span className="v" style={{ fontSize: 16 }}>{z.sante}</span>
      </div>
    </>
  )
}

function Tableau() {
  const { t, tf } = usePreferences()
  const surtitre = useSurtitre()
  const naviguer = useNavigate()
  const l = useLecture(() => source.logistique.pilotage(), [])
  const z0 = l.donnees ?? []
  const al0 = z0.filter((z) => z.etat === 'alerte')
  // R59 : moins de deux entreprises actives dans une zone exploitée ; R74 : zone en vente sans entreprise active (pas de domicile).
  const sousMin0 = z0.filter((z) => z.exploitee && z.entreprisesActives < PARAM.entreprises.minParZone)
  const nonCouvertes0 = z0.filter((z) => !z.exploitee && z.entreprisesActives === 0)
  const fonctions = useFonctions([
    { verbe: 'Agir', n: al0.filter((z) => !z.plan).length, unite: ['zone en alerte', 'zones en alerte'], icone: 'siren', route: 'zones', params: { zone: al0.find((z) => !z.plan)?.code ?? al0[0]?.code }, geste: true, alerte: true },
    { verbe: 'Recruter', n: sousMin0.length, unite: ['zone sous 2 entreprises', 'zones sous 2 entreprises'], icone: 'truck', route: 'candidatures', params: { genre: 'entreprise' }, alerte: true },
    { verbe: 'Couvrir', n: nonCouvertes0.length, unite: ['zone sans domicile', 'zones sans domicile'], icone: 'map-pin-off', route: 'entreprises' },
  ])
  const actions = (
    <Link className="btn secondary" to={chemin('rapports')}>
      <Icone nom="calendar-check" taille={18} />
      <span>{t('Préparer la revue du lundi')}</span>
    </Link>
  )
  return (
    <Ecran route="zones" kicker={surtitre} actions={actions} fonctions={fonctions}>
      <Perimetre route="zones" />
      <Lu l={l} quoi="Le tableau des zones">
        {(zones) => {
          const ex = zones.filter((z) => z.exploitee)
          const livres = ex.reduce((n, z) => n + z.livres7j[1], 0)
          const dans = ex.reduce((n, z) => n + z.livres7j[0], 0)
          const delais = ex.filter((z) => z.delaiMoyenMin !== null)
          const delai = delais.length ? Math.round(delais.reduce((n, z) => n + z.delaiMoyenMin!, 0) / delais.length) : null
          const demandes = zones.reduce((n, z) => n + z.demandesNonServies, 0)
          const ouvrir = zones.filter((z) => !z.exploitee).sort((a, b) => b.demandesNonServies - a.demandesNonServies).slice(0, 3)
          const tete = [...zones].sort((a, b) => b.demandesNonServies - a.demandesNonServies)[0]
          return (
            <>
              <div className="g g4">
                <Kpi k={t('Zones exploitées')} v={ex.length} u={tf('/ {n}', { n: zones.length })} s={ex.map((z) => z.code).join(', ')} icone="map-pinned" ton="night" />
                <Kpi k={tf('Livraison sous {h} h · 7 j', { h: PARAM.paquets.slaH })} v={livres ? `${Math.round((100 * dans) / livres)} %` : '—'} s={tf('{a} colis sur {b} · seuil d’alerte {s} % par zone', { a: dans, b: livres, s: PARAM.zones.alerteTauxPct })} icone="timer" iton="green" />
                <Kpi k={t('Délai moyen')} v={delai === null ? '—' : `${Math.floor(delai / 60)} h ${String(delai % 60).padStart(2, '0')}`} s={t('« C’est prêt » → remise, zones exploitées')} icone="clock" />
                <Kpi k={t('Demandes non servies')} v={demandes} s={tete ? tf('7 jours · {z} en tête ({n})', { z: tete.code, n: tete.demandesNonServies }) : undefined} icone="search-x" iton="or" />
              </div>
              <div className="g g21">
                <Panel titre={tf('Les {n} zones de Yaoundé', { n: zones.length })} icone="map">
                  <CarteReseau titre={t('Zones de Yaoundé')} zones={Object.fromEntries(zones.map((z) => [z.code, tonCarte(z)]))} cadreZones={zones.map((z) => z.code)} surZone={(c) => naviguer(chemin('zones', { zone: c }))} />
                  <Legende zones={[['zone', 'Exploitée'], ['red', 'En alerte'], ['vente', 'Vente seulement']]} />
                </Panel>
                <div className="s4-pile">
                  <Panel titre={t('Où ouvrir')} icone="rocket">
                    {ouvrir.map((z, i) => (
                      <Li key={z.code} icone={i === 0 ? 'trophy' : 'medal'} ton={i === 0 ? 'or' : 'ink'} t={`${i + 1}. ${z.code} ${z.nom}`} s={tf('{d} demandes non servies · {v} vendeur(s) · {r}', { d: z.demandesNonServies, v: z.vendeurs, r: z.relais.length ? t('relais présent') : t('aucun relais') })} to={chemin('zones', { zone: z.code })} />
                    ))}
                    {ouvrir.length === 0 && <Li icone="circle-check" ton="green" t={t('Aucune zone hors exploitation dans votre périmètre')} />}
                  </Panel>
                  <Panel titre={tf('État des {n} zones', { n: zones.length })} icone="activity">
                    {(['saine', 'surveiller', 'alerte', 'vente'] as SanteZone[]).map((s) => (
                      <RowSt key={s} l={t(SANTE[s][0])} r={<b>{zones.filter((z) => z.etat === s).length}</b>} couleur={`var(--${SANTE[s][1] === 'ink' ? 'ink-4' : SANTE[s][1]})`} />
                    ))}
                  </Panel>
                </div>
              </div>
              <div className="mt16">
                <Table
                  legende={t('Zones')}
                  rows={zones}
                  cle={(z) => z.code}
                  ligneCls={(z) => (z.etat === 'alerte' ? 'bad' : z.etat === 'surveiller' ? 'warn' : undefined)}
                  cols={[
                    { k: 'z', t: t('Zone'), main: true, rendu: (z) => <Link to={chemin('zones', { zone: z.code })}><ZonePt code={z.code} nom={z.nom} ton={z.exploitee ? (z.etat === 'alerte' ? 'warn' : '') : 'sale'} /></Link> },
                    { k: 'st', t: t('Santé'), rendu: (z) => <StatutPill t={SANTE[z.etat][0]} ton={SANTE[z.etat][1]} /> },
                    { k: 'c', t: t('Commandes 7 j'), cls: 'r', rendu: (z) => z.commandes7j },
                    { k: 'd', t: t('Délai moyen'), cls: 'r', hideM: true, rendu: (z) => (z.delaiMoyenMin === null ? '—' : `${Math.floor(z.delaiMoyenMin / 60)} h ${String(z.delaiMoyenMin % 60).padStart(2, '0')}`) },
                    { k: 't', t: t('Sous 5 h'), cls: 'r', rendu: (z) => (z.taux5h === null ? '—' : <b className={z.taux5h < PARAM.zones.alerteTauxPct ? 's4-cr' : ''}>{z.taux5h} %</b>) },
                    { k: 'r', t: t('Relais'), hideM: true, rendu: (z) => z.relais.map((r) => `${r.taux} %`).join(' · ') || '—' },
                    { k: 'e', t: t('Entreprises actives'), cls: 'r', rendu: (z) => (z.exploitee && z.entreprisesActives < PARAM.entreprises.minParZone ? <b className="s4-cr">{tf('{n} · alerte', { n: z.entreprisesActives })}</b> : !z.exploitee && z.entreprisesActives === 0 ? <span className="c3">{t('0 · relais seul')}</span> : z.entreprisesActives) },
                    { k: 'v', t: t('Vendeurs'), cls: 'r', hideM: true, rendu: (z) => z.vendeurs },
                    { k: 'n', t: t('Demandes non servies'), cls: 'r', rendu: (z) => z.demandesNonServies },
                    { k: 's', t: t('Santé'), cls: 'r', rendu: (z) => <b>{z.sante ?? '—'}</b> },
                  ]}
                />
              </div>
              <div className="g g2">
                <Panel titre={t('Comment la santé est calculée')} icone="calculator" a={{ t: t('Paramétrage'), to: chemin('parametrage') }}>
                  {ex[0] ? <Composantes z={ex[0]} /> : null}
                </Panel>
                <Panel titre={t('Recherches sans résultat · 7 jours')} icone="search-x">
                  <Table
                    legende={t('Recherches sans résultat')}
                    rows={zones.flatMap((z) => z.recherches.map((r) => ({ ...r, z: z.code }))).sort((a, b) => b.n - a.n).slice(0, 8)}
                    cle={(r) => r.z + r.q}
                    cols={[
                      { k: 'q', t: t('Recherche'), main: true, rendu: (r) => <b>{r.q}</b> },
                      { k: 'z', t: t('Zone'), rendu: (r) => <Pill ton="acc" sm>{r.z}</Pill> },
                      { k: 'n', t: t('Nombre'), cls: 'r', rendu: (r) => r.n },
                    ]}
                  />
                </Panel>
              </div>
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}

function Fiche({ code }: { code: string }) {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const naviguer = useNavigate()
  const l = useLecture(() => source.logistique.pilotage(), [])
  const g = useGestes()
  const z = l.donnees?.find((x) => x.code === code) ?? null
  return (
    <Ecran route="zones" titre={z ? `${z.code} ${z.nom}` : code} nom={code} retour={chemin('zones')} kicker={`${t('Fiche zone')} · ${surtitre}`} actions={<><Link className="btn secondary" to={chemin('zones')}><Icone nom="layout-grid" taille={18} /><span>{t('Tableau des zones')}</span></Link><Link className="btn secondary" to={chemin('carte', { zone: code })}><Icone nom="map" taille={18} /><span>{t('Carte')}</span></Link></>}>
      {g.rendu}
      <Lu l={l} quoi="La fiche de la zone">
        {(zones) => {
          const x = zones.find((y) => y.code === code)
          if (!x) return <Introuvable quoi="Zone introuvable" retour={() => naviguer(chemin('zones'))} libelle="Tableau des zones" />
          return x.exploitee ? <Exploitee z={x} g={g} /> : <Vente z={x} />
        }}
      </Lu>
    </Ecran>
  )
}

function Exploitee({ z, g }: { z: ZonePilotage; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  return (
    <>
      {z.etat === 'alerte' && (
        <Banniere ton="red" icone="siren" className="admlg-bn">
          <b>{tf('{z} en alerte : {r}.', { z: z.code, r: z.raisons.map((r) => t(r)).join(' · ') })}</b>
        </Banniere>
      )}
      <div className="g g21">
        <Panel titre={t('Santé expliquée par ses composantes')} icone="activity" droite={<StatutPill t={SANTE[z.etat][0]} ton={SANTE[z.etat][1]} />}>
          <Composantes z={z} />
        </Panel>
        <Panel titre={tf('{z} sur la carte', { z: z.code })} icone="map">
          <CarteReseau titre={tf('{z} sur la carte', { z: z.code })} zones={{ [z.code]: tonCarte(z) }} cadreZones={[z.code]} />
        </Panel>
      </div>
      <div className="g g2">
        <Panel titre={t('Plan d’action')} icone="list-checks" droite={z.plan ? <Pill ton="green" sm icone="check">{t('Enregistré')}</Pill> : undefined}>
          {z.plan ? (
            <>
              <p className="t13">{`« ${z.plan.motif} »`}</p>
              <div className="t12 c3 mt8">{tf('Par {qui} · {h} · revue au plus tard le {e}', { qui: z.plan.par, h: quand(z.plan.le, langue), e: dateCourte(z.plan.echeance, langue) })}</div>
            </>
          ) : (
            <>
              <Check ok={false}>{t('Relancer les entreprises de la zone et relever la priorité des paquets menacés')}</Check>
              <Check ok={false}>{t('Prévenir les vendeurs et les clients des décalages')}</Check>
              <Check ok={false}>{t('Recruter une entreprise ou un relais de secours')}</Check>
            </>
          )}
          <div className="s4-actes">
            <BoutonGeste g={g} action="zone.plan" objet={z.code} resume={tf('Enregistrer le plan d’action de {z} : écrivez les actions, leur responsable et leur date dans le motif.', { z: z.code })} />
            <BoutonGeste g={g} action="zone.saison" objet={z.code} genre="secondary" resume={z.saison ? tf('Retirer le délai saisonnier de {z}.', { z: z.code }) : tf('Activer le délai saisonnier de {z} (pluies) : annoncé au client avant le paiement et compté dans l’heure limite des entreprises.', { z: z.code })} libelle={z.saison ? 'Retirer le délai saisonnier' : 'Activer le délai saisonnier'} />
          </div>
          {z.saison && <Note ton="amber" icone="cloud-rain" className="mt10">{tf('Délai saisonnier actif depuis {h} · {qui}', { h: quand(z.saison.depuis, langue), qui: z.saison.par })}</Note>}
        </Panel>
        <Panel titre={t('Réseau de la zone')} icone="network">
          {z.relais.map((r) => <Li key={r.nom} icone="package-check" ton={r.statut === 'sature' || r.statut === 'ferme' ? 'red' : 'blue'} t={`${r.nom} · ${t(STATUT_RELAIS[r.statut][0])}`} s={tf('{p} % des places', { p: r.taux })} to={chemin('relais')} />)}
          <Li icone="truck" ton={z.entreprisesActives >= PARAM.entreprises.minParZone ? 'green' : 'amber'} t={tf('{n} entreprise(s) active(s)', { n: z.entreprisesActives })} s={tf('Minimum {m} par zone exploitée', { m: PARAM.entreprises.minParZone })} to={chemin('entreprises')} />
          <Li icone="store" ton="or" t={tf('{n} vendeur(s) installé(s)', { n: z.vendeurs })} s={tf('{c} commandes sur 7 jours · {l} litige(s) ouvert(s)', { c: z.commandes7j, l: z.litigesOuverts })} to={chemin('vendeurs')} />
          <Li icone="boxes" ton="acc" t={t('Paquets de la zone')} s={tf('Remplissage moyen des tournées : {r} colis (objectif {o})', { r: z.remplissageTournees ?? '—', o: PARAM.zones.remplissage.objectif })} to={chemin('paquets')} />
        </Panel>
      </div>
    </>
  )
}

function Vente({ z }: { z: ZonePilotage }) {
  const { t, tf } = usePreferences()
  const pret = z.preparation.every((p) => p.ok)
  return (
    <>
      {z.entreprisesActives === 0 && <Note ton="amber" icone="map-pin-off">{tf('{z} : aucune entreprise active, livraison à domicile non proposée ; retrait au relais actif le plus proche (R74).', { z: z.code })}</Note>}
      <div className="g g21">
        <Panel titre={t('Préparer l’ouverture')} icone="rocket">
          {z.preparation.map((p) => <Check key={p.t} ok={p.ok} mauvais={!p.ok}>{t(p.t)}</Check>)}
          <div className="btns mt12">
            <Link className="btn secondary" to={chemin('parametrage', { parametre: 'ZONES-EXPLOITEES' })}>
              <Icone nom={pret ? 'sliders-horizontal' : 'lock'} taille={18} />
              <span>{t('Proposer le passage en exploitation')}</span>
            </Link>
          </div>
        </Panel>
        <Panel titre={tf('{z} sur la carte', { z: z.code })} icone="map">
          <CarteReseau titre={tf('{z} sur la carte', { z: z.code })} zones={{ [z.code]: 'vente' }} cadreZones={[z.code]} />
        </Panel>
      </div>
      <div className="g g2">
        <Panel titre={tf('Ce que les clients de {z} cherchent', { z: z.code })} icone="search-x">
          {z.recherches.length === 0 && <p className="t13 c3">{t('Aucune recherche sans résultat sur 7 jours.')}</p>}
          {z.recherches.map((r) => <RowSt key={r.q} l={r.q} r={<b>{r.n}</b>} />)}
          <div className="t12 c3 mt8">{tf('{n} demandes non servies sur 7 jours · {c} commandes', { n: z.demandesNonServies, c: z.commandes7j })}</div>
        </Panel>
        <Panel titre={tf('Qui livre les clients de {z} aujourd’hui', { z: z.code })} icone="truck">
          <Li icone="store" ton="or" t={t('Vendeurs d’autres zones')} s={t('Les commandes viennent des boutiques des zones exploitées')} />
          <Li icone="package-check" ton="blue" t={t('Retrait dans un relais ouvert')} s={t('Le client voit la livrabilité réelle et l’heure annoncée avant de payer')} to={chemin('relais')} />
        </Panel>
      </div>
    </>
  )
}
