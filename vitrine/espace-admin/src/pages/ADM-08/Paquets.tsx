// ADM-P20 Paquets et dispatch (prototype : #paquets, ?s=constitution, publie, encours, sanspreneur, retard, escalade,
// clos). Tableau par zone (et la ligne des zones en vente seulement), paquets à suivre, carte des paquets en cours,
// règles du dispatch lues au registre, paquets clos repliés. Fiche (?id=) : état, échéances, chronologie, arrêts dans
// l'ordre imposé, colis (champs de la console seulement), part du relais et achat à l'entreprise, entreprises
// éligibles et leur rang, et « Ce que la console peut faire » : élargir, relever la priorité, prévenir le vendeur et
// le client, retirer un paquet vidé. AUCUNE affectation (ADM-PQ-02) ; aucun paquet composé à la main (ADM-PQ-01).
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { Banniere, Kpi, Li, Panel, Pill, Plus, Props, Sec, Table, Vide, useSurtitre } from '../../composants/prototype'
import { PARAMETRES } from '../../calculs/registre'
import { chemin } from '../../config/pages'
import type { EtatPaquet, PaquetCourt, PaquetFiche } from '../../donnees/domaines/logistique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { usePerimetre } from '../../session'
import { useFonctions } from '../AJ-A/fonctions-page'
import { CarteReseau, Legende } from '../ADM-09/CarteReseau'
import { Arret, BoutonGeste, Chronologie, Introuvable, Lu, Nb, RowSt, StatutPill, ZonePt, francs, quand, useGestes } from './commun'
import { NOM_PALIER } from './Entreprises'
import { PARAM } from './parametres'

export const ETAT_PAQUET: Record<EtatPaquet, [string, 'green' | 'red' | 'blue' | 'or' | 'ink' | 'acc' | 'amber']> = {
  constitution: ['En constitution', 'ink'],
  publie: ['Publié', 'acc'],
  sans_preneur: ['Publié · sans preneur', 'red'],
  accepte: ['Accepté', 'blue'],
  en_route: ['En cours', 'or'],
  en_retard: ['En retard', 'red'],
  incident: ['Incident', 'red'],
  livre: ['Clos', 'green'],
  rendu: ['Rendu', 'amber'],
  retire: ['Retiré', 'ink'],
}
const GENRE = { relais: 'Tournée relais', domicile: 'Course domicile', retour: 'Retour vendeur' }
const urgent = (p: PaquetCourt) => p.etat === 'sans_preneur' || p.etat === 'en_retard' || p.etat === 'incident'
const clos = (p: PaquetCourt) => p.etat === 'livre' || p.etat === 'retire' || p.etat === 'rendu'

export default function Paquets() {
  const [p] = useSearchParams()
  const id = p.get('id')
  return id ? <Fiche id={id} /> : <Tableau />
}

function Tableau() {
  const { t, tf } = usePreferences()
  const surtitre = useSurtitre()
  const naviguer = useNavigate()
  const zonesAgent = usePerimetre()
  const [p] = useSearchParams()
  const entreprise = p.get('entreprise')
  const l = useLecture(() => source.logistique.paquets(), [])
  // Points de la carte : seulement pour les rôles qui ouvrent la carte opérationnelle (sinon, les zones seules).
  const carte = useLecture(() => source.logistique.carte().catch(() => []), [])
  const pq0 = l.donnees ?? []
  const premier0 = (e: EtatPaquet) => [...pq0.filter((x) => x.etat === e)].sort((a, b) => a.margeMin - b.margeMin)[0]?.id
  const fonctions = useFonctions([
    { verbe: 'Débloquer', n: pq0.filter((x) => x.etat === 'sans_preneur').length, unite: ['paquet sans preneur', 'paquets sans preneur'], icone: 'boxes', route: 'paquets', params: { id: premier0('sans_preneur') }, geste: true, alerte: true },
    { verbe: 'Suivre', n: pq0.filter((x) => x.etat === 'en_retard').length, unite: ['paquet en retard', 'paquets en retard'], icone: 'clock-alert', route: 'paquets', params: { id: premier0('en_retard') }, geste: true, alerte: true },
    { verbe: 'Traiter', n: pq0.filter((x) => x.etat === 'incident').length, unite: ['incident', 'incidents'], icone: 'circle-alert', route: 'paquets', params: { id: premier0('incident') }, geste: true },
  ])
  const actions = (
    <Link className="btn secondary" to={chemin('parametrage')}>
      <Icone nom="sliders-horizontal" taille={18} />
      <span>{t('Paramètres de constitution')}</span>
    </Link>
  )
  return (
    <Ecran route="paquets" kicker={surtitre} actions={actions} fonctions={fonctions}>
      <Perimetre route="paquets" />
      <Lu l={l} quoi="Les paquets">
        {(tous) => {
          const pq = tous.filter((x) => !entreprise || x.entreprise === entreprise)
          const exploitees = PARAMETRES.zonesExploitees.filter((z) => !zonesAgent || zonesAgent.includes(z.code))
          const livres = pq.filter((x) => x.etat === 'livre')
          const enCours = pq.filter((x) => ['en_route', 'en_retard', 'incident', 'accepte'].includes(x.etat))
          const sansPreneur = pq.filter((x) => x.etat === 'sans_preneur')
          const compte = (z: string, e: EtatPaquet[]) => pq.filter((x) => x.zone === z && e.includes(x.etat)).length
          return (
            <>
              <div className="g g4">
                <Kpi k={t('Paquets aujourd’hui')} v={pq.length} s={tf('{c} clos · {n} colis', { c: livres.length, n: pq.reduce((n, x) => n + x.colis, 0) })} icone="boxes" ton="night" />
                <Kpi k={t('En cours')} v={enCours.length} s={enCours.map((x) => x.id.slice(-3)).join(', ')} icone="route" />
                <Kpi k={tf('Livrés sous {h} h', { h: PARAM.paquets.slaH })} v={livres.length} u={`/ ${livres.length}`} s={t('Mesuré de « C’est prêt » à la remise')} icone="timer" iton="green" />
                <Kpi k={t('Sans preneur')} v={sansPreneur.length} s={sansPreneur.map((x) => x.id).join(' · ') || t('Aucun')} icone="siren" iton={sansPreneur.length ? 'red' : 'green'} />
              </div>
              <div className="mt16">
                <Table
                  legende={t('Tableau par zone')}
                  outils={<div className="s4-filtres"><span className="sp"></span><span className="lock hide-m"><Icone nom="radio-tower" taille={15} />{t('Temps réel')}</span></div>}
                  rows={exploitees}
                  cle={(z) => z.code}
                  ligneCls={(z) => (pq.some((x) => x.zone === z.code && urgent(x)) ? 'bad' : undefined)}
                  cols={[
                    { k: 'z', t: t('Zone'), main: true, cls: 'admlg-w200', rendu: (z) => <ZonePt code={z.code} nom={z.nom} ton={pq.some((x) => x.zone === z.code && urgent(x)) ? 'warn' : ''} /> },
                    { k: 'c', t: t('En constitution'), cls: 'admlg-cc', l: 'Constit.', rendu: (z) => <Nb v={compte(z.code, ['constitution'])} /> },
                    { k: 'p', t: t('Publiés'), cls: 'admlg-cc', rendu: (z) => <Nb v={compte(z.code, ['publie', 'sans_preneur'])} ton={compte(z.code, ['sans_preneur']) ? 'red' : 'on'} /> },
                    { k: 'a', t: t('Acceptés'), cls: 'admlg-cc', rendu: (z) => <Nb v={compte(z.code, ['accepte'])} /> },
                    { k: 'e', t: t('En cours'), cls: 'admlg-cc', rendu: (z) => <Nb v={compte(z.code, ['en_route', 'incident'])} ton="or" /> },
                    { k: 'l', t: t('Livrés'), cls: 'admlg-cc', rendu: (z) => <Nb v={compte(z.code, ['livre'])} ton="green" /> },
                    { k: 'r', t: t('En retard'), cls: 'admlg-cc', rendu: (z) => <Nb v={compte(z.code, ['en_retard'])} ton="red" /> },
                    { k: 'rd', t: t('Rendus'), cls: 'admlg-cc', rendu: (z) => <Nb v={compte(z.code, ['rendu'])} ton="amber" /> },
                    { k: 'n', t: t('Colis'), cls: 'r', rendu: (z) => <b>{pq.filter((x) => x.zone === z.code).reduce((n, x) => n + x.colis, 0)}</b> },
                  ]}
                  pied={<><span>{tf('{n} zones vente seulement : aucun paquet, la livrabilité est affichée au client', { n: 12 - PARAMETRES.zonesExploitees.length })}</span><span>{tf('Tournée relais : {c} colis visés, départ dès {d}', { c: PARAM.paquets.cible, d: PARAM.paquets.seuilDepart })}</span></>}
                />
              </div>
              <Sec t={t('Paquets à suivre')} />
              <ListePaquets l={pq.filter((x) => !clos(x))} />
              <div className="g g21">
                <Panel titre={t('Paquets en cours')} icone="map" a={{ t: t('Carte opérationnelle'), to: chemin('carte', { calque: 'paquets' }) }}>
                  <CarteReseau
                    titre={t('Paquets en cours')}
                    zones={Object.fromEntries(exploitees.map((z) => [z.code, pq.some((x) => x.zone === z.code && urgent(x)) ? ('alerte' as const) : ('on' as const)]))}
                    cadreZones={exploitees.map((z) => z.code)}
                    points={(carte.donnees ?? []).filter((x) => x.calque === 'paquets' && !clos(pq.find((y) => y.id === x.id) ?? ({ etat: 'livre' } as PaquetCourt))).map((x) => ({ id: x.id, acteur: 'paquet' as const, lat: x.lat, lng: x.lng, ton: x.ton, nom: `${x.nom} · ${x.sous}`, etiquette: x.nom.slice(-3) }))}
                    trajets={(carte.donnees ?? []).filter((x) => x.calque === 'paquets' && x.trajet).map((x) => ({ id: x.id, pts: x.trajet! }))}
                    surPoint={(x) => naviguer(chemin('paquets', { id: x }))}
                  />
                  <Legende zones={[['zone', 'Zone exploitée']]} acteurs={['paquet']} statuts={[['alerte', 'Paquet urgent']]} />
                </Panel>
                <Panel titre={t('Règles du dispatch')} icone="book-open-check">
                  <RowSt l={t('Acceptation')} r={<b>{tf('{a} min · priorité {p} min', { a: PARAM.paquets.acceptationMin, p: PARAM.paquets.prioriteMin })}</b>} />
                  <RowSt l={t('Ramassage après acceptation')} r={<b>{tf('{m} min', { m: PARAM.paquets.ramassageMin })}</b>} />
                  <RowSt l={t('Livraison')} r={<b>{tf('moins de {h} h', { h: PARAM.paquets.slaH })}</b>} />
                  <RowSt l={t('En retard')} r={<b>{tf('marge sous {m} min', { m: PARAM.paquets.retardMin })}</b>} />
                  <RowSt l={t('Tournée relais')} r={<b>{tf('{c} colis visés · départ dès {d}', { c: PARAM.paquets.cible, d: PARAM.paquets.seuilDepart })}</b>} />
                  <RowSt l={t('Heures de service')} r={PARAM.paquets.heures} />
                </Panel>
              </div>
              <Plus libelle={tf('{n} paquet(s) clos aujourd’hui', { n: pq.filter(clos).length })} icone="circle-check">
                <ListePaquets l={pq.filter(clos)} />
              </Plus>
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}

function ListePaquets({ l }: { l: PaquetCourt[] }) {
  const { t, tf, langue } = usePreferences()
  return (
    <Table
      legende={t('Paquets')}
      rows={[...l].sort((a, b) => Number(urgent(b)) - Number(urgent(a)) || a.margeMin - b.margeMin)}
      cle={(p) => p.id}
      ligneCls={(p) => (urgent(p) ? 'bad' : p.etat === 'en_route' ? 'hot' : undefined)}
      vide={<Vide icone="boxes" t={t('Aucun paquet')} />}
      cols={[
        { k: 'id', t: t('Paquet'), main: true, rendu: (p) => <Link to={chemin('paquets', { id: p.id })}><span className="admlg-id" style={{ display: 'block' }}>{p.id}</span><div className="t2">{tf('{n} colis · valeur max {v}', { n: p.colis, v: francs(p.valeurMax) })}</div></Link> },
        { k: 'ty', t: t('Type et destination'), rendu: (p) => <>{t(GENRE[p.genre])}<div className="t2">{p.destination}</div></> },
        { k: 'st', t: t('État'), rendu: (p) => <StatutPill t={ETAT_PAQUET[p.etat][0]} ton={ETAT_PAQUET[p.etat][1]} /> },
        { k: 'w', t: t('Entreprise · livreur'), rendu: (p) => (p.entreprise ? <><b>{p.entreprise}</b><div className="t2">{p.livreur ?? t('à affecter par l’entreprise')}</div></> : p.etat === 'sans_preneur' ? <><b className="s4-cr">{t('aucune n’a accepté')}</b><div className="t2">{tf('paliers éligibles : {p}', { p: p.paliersEligibles.map((x) => t(NOM_PALIER[x])).join(', ') })}</div></> : <span className="c3">{t('pas encore publié')}</span>) },
        { k: 'lim', t: t('Heure limite'), cls: 'r', rendu: (p) => <><b>{quand(p.heureLimite, langue, false)}</b>{!clos(p) && <div className={'t2' + (p.margeMin < PARAM.paquets.retardMin ? ' s4-cr' : '')}>{p.margeMin < 0 ? t('dépassée') : tf('dans {m} min', { m: p.margeMin })}</div>}</> },
      ]}
    />
  )
}

function Fiche({ id }: { id: string }) {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const naviguer = useNavigate()
  const l = useLecture(() => source.logistique.paquetFiche(id).then((f) => ({ f })), [id])
  const g = useGestes()
  const f = l.donnees?.f ?? null
  const actions = (
    <>
      <Link className="btn secondary" to={chemin('paquets')}><Icone nom="layout-grid" taille={18} /><span>{t('Tableau par zone')}</span></Link>
      <Link className="btn secondary" to={chemin('messagerie', { paquet: id })}><Icone nom="message-circle" taille={18} /><span>{t('Messagerie de la mission')}</span></Link>
    </>
  )
  return (
    <Ecran route="paquets" titre={id} nom={id} retour={chemin('paquets')} kicker={f ? `${t(GENRE[f.genre])} · ${surtitre}` : surtitre} actions={actions}>
      {g.rendu}
      <Lu l={l} quoi="La fiche du paquet">
        {({ f: x }) => (!x ? <Introuvable quoi="Paquet introuvable" retour={() => naviguer(chemin('paquets'))} libelle="Tableau par zone" /> : <ContenuFiche f={x} g={g} />)}
      </Lu>
    </Ecran>
  )
}

function ContenuFiche({ f, g }: { f: PaquetFiche; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  const [nom, ton] = ETAT_PAQUET[f.etat]
  const peut = (a: boolean, txt: string) => <Pill ton={a ? 'or' : 'ink'} sm>{t(a ? 'Possible' : txt)}</Pill>
  const resumePrevenir = tf('Prévenir le vendeur et le client de {id} d’un décalage, par la messagerie officielle et le SMS de criticité 1 : aucun montant, aucune promesse d’heure.', { id: f.id })
  return (
    <>
      {urgent(f) && (
        <Banniere ton="red" icone={f.etat === 'en_retard' ? 'clock-alert' : 'circle-alert'} className="admlg-bn" bouton={<BoutonGeste g={g} action="paquet.prevenir" objet={f.id} genre="secondary" resume={resumePrevenir} />}>
          <b>{tf('{id} · {etat}.', { id: f.id, etat: t(nom) })}</b> {f.etat === 'sans_preneur' ? null : tf('Marge : {m} min', { m: f.margeMin })}
        </Banniere>
      )}
      <div className="g g21">
        <div className={'hero night' + (urgent(f) ? ' s4-rouge' : '')}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="hk">{`${t(nom)} · ${t(GENRE[f.genre])} ${f.zone}`}</span>
            <Pill ton="dk" icone="clock">{tf('Heure limite {h}', { h: quand(f.heureLimite, langue, false) })}</Pill>
          </div>
          <div className="ht" style={{ marginTop: 12 }}>{f.destination}</div>
          <div className="hs">{tf('{n} colis · valeur max {v} · {e}', { n: f.colis, v: francs(f.valeurMax), e: f.entreprise ? `${f.entreprise}${f.livreur ? ' · ' + f.livreur : ''}` : t('aucune entreprise') })}</div>
          <div className="mt10"><StatutPill t={nom} ton={ton} /></div>
        </div>
        <Panel titre={t('Échéances surveillées')} icone="timer">
          <RowSt l={tf('Acceptation ({m} min)', { m: PARAM.paquets.acceptationMin })} r={f.publieLe ? quand(f.publieLe + PARAM.paquets.acceptationMin * 60_000, langue, false) : '—'} />
          <RowSt l={tf('Ramassage ({m} min après acceptation)', { m: PARAM.paquets.ramassageMin })} r={f.entreprise && f.publieLe ? quand(f.publieLe + (6 + PARAM.paquets.ramassageMin) * 60_000, langue, false) : '—'} />
          <RowSt l={tf('Alerte de retard ({m} min)', { m: PARAM.paquets.retardMin })} r={<b>{quand(f.heureLimite - PARAM.paquets.retardMin * 60_000, langue, false)}</b>} />
          <RowSt l={t('Heure limite')} r={<b>{quand(f.heureLimite, langue, false)}</b>} />
          <RowSt l={t('Version de grille')} r={f.grilleVersion} />
        </Panel>
      </div>
      <div className="g g2">
        <Panel titre={t('Arrêts dans l’ordre imposé')} icone="route">
          {f.arrets.map((a) => <Arret key={a.n} n={a.n} etat={a.etat} t={a.t} s={a.s} droite={a.depot ? <Pill ton="blue" sm>{t('Dépôt')}</Pill> : undefined} />)}
        </Panel>
        <Panel titre={t('Chronologie')} icone="history">
          <Chronologie items={f.chronologie} />
        </Panel>
      </div>
      <div className="mt16">
        <Table
          legende={t('Colis du paquet')}
          rows={f.colisDetail}
          cle={(c) => c.etiquette}
          cols={[
            { k: 'l', t: t('Étiquette'), main: true, rendu: (c) => <span className="label-bv"><Icone nom="tag" taille={15} />{c.etiquette}</span> },
            { k: 'c', t: t('Classe'), rendu: (c) => <b>{c.classe}</b> },
            { k: 'v', t: t('Vendeur'), rendu: (c) => c.vendeur },
            { k: 'val', t: t('Valeur'), cls: 'r', rendu: (c) => <b>{francs(c.valeur)}</b> },
            { k: 'p', t: t('Paiement'), hideM: true, rendu: (c) => <span className="t12">{c.paiement}</span> },
            { k: 's', t: t('Preuves'), rendu: (c) => <Pill ton={c.preuves.includes('✓') ? 'green' : 'ink'} sm>{c.preuves}</Pill> },
          ]}
          pied={<><span>{tf('{n} colis', { n: f.colis })}</span><span>{tf('Valeur maximale {v}', { v: francs(f.valeurMax) })}</span></>}
        />
      </div>
      <div className="g g2">
        <Panel titre={t('Entreprises éligibles et ordre de priorité')} icone="list-ordered">
          <Table
            legende={t('Entreprises éligibles')}
            rows={f.eligibles}
            cle={(e) => e.entreprise}
            ligneCls={(e) => (e.rang === null ? 'warn' : undefined)}
            vide={<p className="t13 c3">{t('Aucune entreprise ne couvre cette zone.')}</p>}
            cols={[
              { k: 'e', t: t('Entreprise'), main: true, rendu: (e) => <><b>{e.entreprise}</b><div className="t2">{tf('{p} · Trust Score {ts}', { p: t(NOM_PALIER[e.palier]), ts: e.trustScore ?? '—' })}</div></> },
              { k: 'r', t: t('Contrôle'), rendu: (e) => <Pill ton={e.rang === null ? 'amber' : 'green'} sm icone={e.rang === null ? 'x' : 'check'}>{t(e.raison)}</Pill> },
              { k: 'n', t: t('Rang'), cls: 'r', rendu: (e) => (e.rang === null ? <span className="c3">{t('non éligible')}</span> : <b>{e.rang}</b>) },
            ]}
          />
          <div className="t12 c3 mt8">{tf('Paliers qui peuvent porter cette valeur : {p}', { p: f.paliersEligibles.map((x) => t(NOM_PALIER[x])).join(', ') })}</div>
          {f.argent && (
            <Props paires={[[t('Achat à l’entreprise (grille)'), francs(f.argent.achat)], ...(f.genre === 'relais' ? [[t('Part du relais'), francs(f.argent.relais)] as [string, string]] : [])]} />
          )}
        </Panel>
        <Panel titre={t('Ce que la console peut faire')} icone="hand">
          <Li icone="megaphone" ton={['publie', 'sans_preneur'].includes(f.etat) ? 'or' : undefined} t={t('Élargir la publication')} s={f.escalade.elargi ? tf('Fait à {h}', { h: quand(f.escalade.elargi, langue, false) }) : t('À toutes les entreprises éligibles de la zone')} droite={peut(['publie', 'sans_preneur'].includes(f.etat) && !f.escalade.elargi, f.escalade.elargi ? 'Fait' : 'Sans objet')} />
          <Li icone="arrow-up-wide-narrow" ton={!clos(f) ? 'or' : undefined} t={t('Relever la priorité')} s={f.escalade.priorite ? tf('Fait à {h}', { h: quand(f.escalade.priorite, langue, false) }) : t('Le paquet passe en tête des listes et des alertes')} droite={peut(!clos(f) && !f.escalade.priorite, f.escalade.priorite ? 'Fait' : 'Sans objet')} />
          <Li icone="send" ton={urgent(f) ? 'or' : undefined} t={t('Prévenir les vendeurs et les clients')} s={f.escalade.prevenu ? tf('Fait à {h}', { h: quand(f.escalade.prevenu, langue, false) }) : t('Message de décalage, sans montant ni engagement')} droite={peut(urgent(f) && !f.escalade.prevenu, f.escalade.prevenu ? 'Fait' : 'Sans objet')} />
          <Li icone="package-x" t={t('Retirer un paquet vidé')} s={t('Seulement si des annulations l’ont vidé')} droite={peut(f.colis === 0, 'Sans objet')} />
          <div className="s4-actes">
            <BoutonGeste g={g} action="paquet.elargir" objet={f.id} sm resume={tf('Élargir la publication de {id} à toutes les entreprises éligibles de {z}.', { id: f.id, z: f.zone })} />
            <BoutonGeste g={g} action="paquet.priorite" objet={f.id} genre="secondary" sm resume={tf('Relever la priorité de {id} : en tête des listes des entreprises et des alertes.', { id: f.id })} />
            <BoutonGeste g={g} action="paquet.prevenir" objet={f.id} genre="secondary" sm resume={resumePrevenir} />
            <Link className="btn sm ghost" to={chemin('entreprises')}><Icone nom="phone-call" taille={16} /><span>{t('Appeler les entreprises')}</span></Link>
          </div>
        </Panel>
      </div>
    </>
  )
}
