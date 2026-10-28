// ADM-P07 · Versements du vendredi : payer tous les acteurs le même jour, à l'heure, sans demande — préparation le jeudi
// 23 h 59, contrôle et exécution le vendredi matin, rapprochement. Structure du prototype gardée (bandeau du prochain
// versement, barre des quatre étapes, « À traiter avant jeudi 23 h 59 », « Versements des vendredis », « Dernier
// cycle » ; cycle ouvert : lots, statuts, rapprochement et clôture). Contenu calculé par les règles :
// - vendeurs : ventes libérées − reprises − 1 % Mobile Money retenu sur le versement (v6) ;
// - relais : colis remis + 100 F par jour de garde − espèces de garde encaissées au comptoir ; négatif : versé 0 F, dette
//   reportée 4 vendredis au plus, puis plan d'apurement validé par la Finance (ADM-CACHEE-07) ;
// - entreprises de livraison : missions validées, preuves complètes, hors revue (ENT-VERSEMENT) ;
// - R43 (v2.0) : 1 % Mobile Money retenu sur CHAQUE versement, payé par celui qui le reçoit (vendeur, relais,
//   entreprise) ; R22 : arrondi au franc supérieur ;
// - livreurs : payés par LEUR entreprise ; la console voit seulement « versement fait » (ADM-CACHEE-30) ;
// - au-delà de VERSEMENT-CONTROLE-SEUIL : quatre yeux, Finance puis Direction ; exception (versement suspendu après trois
//   refus) : relance à quatre yeux ; numéro changé : blocage, report au vendredi suivant ; pièces incomplètes : attente.
// Support : jamais les versements (la route est fermée à son rôle, ADM-ROL-04).
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CarteQuatreYeux } from '../../composants/CarteQuatreYeux'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { ExportSigne } from '../../composants/ExportSigne'
import { Icone } from '../../composants/Icone'
import { Anneau, BarresH, Choix, Hint, Note, Panel, Pill, Plus, Rebours, Table, type Ton } from '../../composants/prototype'
import { Plie, useFonctionsS } from '../ADM-03/kit'
import { chemin } from '../../config/pages'
import type { Cycle, GenreLot, Lot } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { usePeut, useRole, useRouteOuverte } from '../../session'
import { Chk, Etapes, Fr, Hero, Lu, Mv, Xt, useDate, useDecision } from './commun'
import { ARGENT } from '../../calculs/argent'

const ETAPES: [string, string][] = [
  ['Préparation', 'Lot du jeudi 23 h 59'],
  ['Contrôle', 'Anomalies traitées'],
  ['Exécution', 'Statut par versement'],
  ['Rapprochement', 'Registre = agrégateur, clôture'],
]
const ETAT_LOT: Record<Lot['etat'], [string, Ton]> = {
  prevu: ['Prévu', 'ink'],
  reporte: ['Reporté', 'amber'],
  attente_kyc: ['Pièces attendues', 'amber'],
  controle_requis: ['Contrôle à quatre yeux', 'violet'],
  a_contresigner: ['À contresigner', 'violet'],
  controle: ['Contrôlé', 'acc'],
  bloque: ['Bloqué', 'red'],
  suspendu: ['Suspendu', 'red'],
  relance: ['Relancé', 'acc'],
  zero: ['0 F · dette reportée', 'amber'],
  confirme: ['Confirmé', 'green'],
}
const ICONE_GENRE: Record<GenreLot, string> = { vendeur: 'store', relais: 'package-check', entreprise: 'truck' }

export default function Versements() {
  const { t, tf } = usePreferences()
  const d = useDate()
  const [p, setP] = useSearchParams()
  const l = useLecture(() => source.argent.versements(), [])
  const vue = p.get('vue')
  const lots = l.donnees?.courant.lots ?? []
  const nb = (f: (x: Lot) => boolean) => lots.filter(f).length
  const vers = () => document.getElementById('a-traiter')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const peut = usePeut('versement.executer')
  const fonctions = useFonctionsS('versements', [
    { verbe: 'Contrôler', n: nb((x) => x.etat === 'controle_requis'), unite: ['lot', 'lots'], icone: 'users', onClick: vers, geste: true, si: peut },
    { verbe: 'Relancer', n: nb((x) => x.etat === 'suspendu'), unite: ['versement suspendu', 'versements suspendus'], icone: 'rotate-cw', onClick: vers, geste: true, si: peut, alerte: true },
    { verbe: 'Apurer', n: nb((x) => x.dette > 0 && !x.plan), unite: ['dette', 'dettes'], icone: 'hand-coins', onClick: vers, geste: true, si: peut },
    { verbe: 'Valider', n: nb((x) => x.etat === 'attente_kyc'), unite: ['identité', 'identités'], icone: 'id-card', route: 'kyc' },
  ])
  return (
    <Ecran
      route="versements"
      titre={vue === 'cycle' ? tf('Cycle du vendredi {jour}', { jour: l.donnees ? d.jour(l.donnees.dernier.vendredi) : '' }) : undefined}
      retour={vue ? chemin('versements') : undefined}
      kicker={d.quand(Date.now())}
      fonctions={!vue && l.donnees ? fonctions : undefined}
      actions={
        <button type="button" className="btn secondary" aria-pressed={vue === 'historique'} onClick={() => setP(vue === 'historique' ? {} : { vue: 'historique' }, { replace: true })}>
          <Icone nom="history" taille={18} />
          <span>{t('Historique des cycles')}</span>
        </button>
      }
    >
      <Lu l={l}>{(v) => (vue === 'cycle' ? <CycleClos c={v.dernier} /> : <Apercu v={v} historique={vue === 'historique'} />)}</Lu>
    </Ecran>
  )
}

function Apercu({ v, historique }: { v: Awaited<ReturnType<typeof source.argent.versements>>; historique: boolean }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const c = v.courant
  const total = c.lots.reduce((n, l) => n + l.verse, 0)
  const somme = (g: GenreLot) => c.lots.filter((l) => l.genre === g)
  const reportes = c.lots.filter((l) => ['reporte', 'attente_kyc', 'suspendu', 'bloque'].includes(l.etat))
  const aTraiter = c.lots.filter((l) => l.etat !== 'prevu' && l.etat !== 'confirme')
  const dernier = v.dernier
  const totDernier = dernier.lots.reduce((n, l) => n + l.verse, 0)
  const max = Math.max(...v.historique.map((h) => h.montant), 1)
  return (
    <>
      <Hero
        k={tf('Prochain versement · {jour}', { jour: d.jour(c.vendredi) })}
        v={Fr(total).replace(' F', '')}
        s={tf('Arrêté {arrete} · versé avant {h} h · 1 % Mobile Money retenu à chaque bénéficiaire', { arrete: `${d.jour(c.arrete)} ${d.heure(c.arrete)}`, h: ARGENT.limiteVersementH })}
        droite={
          <>
            <div className="t12">
              {t('Clôture du cycle dans')}
            </div>
            <div className="b8" style={{ fontSize: 26 }}>
              <Rebours fin={c.arrete} />
            </div>
          </>
        }
        mesures={[
          { l: t('Vendeurs'), v: tf('{n} lots', { n: somme('vendeur').length }), s: Fr(somme('vendeur').reduce((n, l) => n + l.verse, 0)), icone: 'store' },
          { l: t('Points relais'), v: tf('{n} lots', { n: somme('relais').length }), s: Fr(somme('relais').reduce((n, l) => n + l.verse, 0)), icone: 'package-check' },
          { l: t('Entreprises'), v: tf('{n} lots', { n: somme('entreprise').length }), s: Fr(somme('entreprise').reduce((n, l) => n + l.verse, 0)), icone: 'truck' },
          { l: t('Reporté ou en attente'), v: tf('{n} lots', { n: reportes.length }), s: reportes.map((l) => l.beneficiaire).join(', ') || t('aucun'), icone: 'lock' },
        ]}
      />
      <Etapes etapes={ETAPES} cur={c.etat === 'prevision' ? 0 : 1} />
      <div className="g g21">
        <div className="col" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
          <div id="a-traiter" />
          <Panel titre={tf('À traiter avant {jour} {h}', { jour: d.jour(c.arrete), h: d.heure(c.arrete) })} icone="list-checks" droite={<Pill ton={aTraiter.length ? 'amber' : 'green'} sm>{tf('{n} point(s)', { n: aTraiter.length })}</Pill>}>
            {aTraiter.length === 0 ? <Chk ton="g" icone="check" t={t('Rien à traiter')} s={t('Tous les lots partiront à l’heure.')} /> : aTraiter.map((l) => <ATraiter key={l.id} l={l} />)}
          </Panel>
          {historique ? (
            <Panel titre={t('Historique des cycles')} icone="history">
              <Xt tete={[t('Vendredi'), t('Lots'), t('Montant'), t('État')]} lignes={v.historique.map((h) => [d.jour(h.vendredi), String(h.lots), Fr(h.montant), t(h.prevision ? 'prévision' : 'clos · rapprochement vert')])} />
            </Panel>
          ) : null}
          <Panel titre={t('Versements des vendredis')} icone="chart-column">
            <BarresH largeurLibelle={110} largeurValeur={90} lignes={v.historique.map((h) => ({ l: h.prevision ? tf('{j} · prévision', { j: d.jour(h.vendredi) }) : d.jour(h.vendredi), v: h.montant, max, r: Fr(h.montant), ton: h.prevision ? 'acc' : 'green' }))} />
          </Panel>
        </div>
        <Panel titre={tf('Dernier cycle · vendredi {jour}', { jour: d.jour(dernier.vendredi) })} icone="circle-check" droite={<Pill ton="green" sm dot>{t('Clos')}</Pill>}>
          <div className="row" style={{ gap: 14 }}>
            <Anneau v={dernier.lots.length} max={dernier.lots.length} couleur="var(--green)" taille={84} libelle={<span className="admA-ringl">{`${dernier.lots.length}/${dernier.lots.length}`}</span>} />
            <div className="grow">
              <div className="b8" style={{ fontSize: 22 }}>
                {Fr(totDernier)}
              </div>
              <div className="t13 c3">{tf('{n} lots · tous confirmés par l’opérateur avant {h} h', { n: dernier.lots.length, h: ARGENT.limiteVersementH })}</div>
            </div>
          </div>
          <div className="hr"></div>
          <Mv k={t('Rapprochement')} v={<span className="cg">{t('vert · 0 écart')}</span>} />
          <Mv k={t('Clos par')} v={dernier.closPar && dernier.closLe ? `${dernier.closPar} · ${d.heure(dernier.closLe)}` : '—'} />
          <Mv k={t('Frais retenus aux bénéficiaires')} v={Fr(dernier.lots.reduce((n, l) => n + l.frais, 0))} />
          <div className="btns">
            <Link className="btn secondary" to={chemin('versements', { vue: 'cycle' })}>
              <Icone nom="banknote" taille={18} />
              <span>{t('Voir le cycle')}</span>
            </Link>
          </div>
          <div className="divide">{t('Livreurs · payés par leur entreprise')}</div>
          {v.livreurs.map((x) => (
            <Chk key={x.entreprise} ton={x.marque ? 'g' : 'a'} icone={x.marque ? 'check' : 'hourglass'} t={tf('{e} · {n} livreurs', { e: x.entreprise, n: x.livreurs })} s={x.marque ? tf('« Versement fait » marqué {quand} · {par}', { quand: d.quand(x.marque), par: x.par ?? '' }) : t('Pas encore marqué « versement fait » cette semaine')} />
          ))}
          <Plie titre={t('Qui paie le livreur')}>{t('BelivaY ne paie jamais un livreur : son entreprise le paie et le marque ; la console le voit, sans montant individuel.')}</Plie>
        </Panel>
      </div>
      <Lots c={c} titre={tf('Lots du vendredi {jour} · prévision', { jour: d.jour(c.vendredi) })} />
    </>
  )
}

function ATraiter({ l }: { l: Lot }) {
  const { t, tf } = usePreferences()
  const role = useRole()
  const ouvre = useRouteOuverte()
  const qy = useDecision(l.etat === 'a_contresigner' ? l.quatreYeux : null)
  const [feuille, setFeuille] = useState<'controle' | 'exception' | 'plan' | null>(null)
  const [carte, setCarte] = useState<string | null>(null)
  const finance = role === 'finance' || role === 'superviseur'
  const ton = l.etat === 'controle' || l.etat === 'relance' ? 'g' : l.etat === 'controle_requis' || l.etat === 'a_contresigner' ? 'v' : l.etat === 'suspendu' || l.etat === 'bloque' ? 'r' : 'a'
  const bouton = (nom: string, faire: () => void, primaire = true) => (
    <button type="button" className={'btn sm ' + (primaire ? 'primary' : 'secondary')} onClick={faire}>
      {t(nom)}
    </button>
  )
  let droite = null
  if (finance && l.etat === 'controle_requis') droite = bouton('Demander le contrôle', () => setFeuille('controle'))
  else if (finance && l.etat === 'suspendu') droite = bouton('Relancer ce vendredi', () => setFeuille('exception'))
  else if (finance && l.genre !== 'vendeur' && l.dette > 0 && l.reports >= ARGENT.reportDetteVendredis && !l.plan) droite = bouton('Valider un plan d’apurement', () => setFeuille('plan'))
  else if (finance && l.dette > 0 && !l.plan && !carte) droite = bouton('Ouvrir une carte Finance', () => void source.argent.ouvrirCarte(l.id, `${l.beneficiaire} : ${l.raison}`).then((r) => setCarte(r.ok ? r.id : t('déjà ouverte'))), false)
  else if (l.etat === 'attente_kyc' && ouvre('kyc')) droite = <Link className="btn sm secondary" to={chemin('kyc')}>{t('Revue KYC')}</Link>
  return (
    <>
      <Chk ton={ton} icone={l.etat === 'controle_requis' || l.etat === 'a_contresigner' ? 'users' : l.dette ? 'hand-coins' : l.etat === 'controle' || l.etat === 'relance' ? 'check' : 'lock'} t={`${l.beneficiaire} · ${Fr(l.verse || l.dette)}${l.dette ? ' ' + t('de dette') : ''}`} s={`${t(ETAT_LOT[l.etat][0])}${l.raison ? ' : ' + l.raison : ''}${carte ? ' · ' + tf('carte {id}', { id: carte }) : ''}`} droite={droite} />
      {qy && <CarteQuatreYeux d={qy} />}
      <DecisionMotivee
        ouverte={feuille === 'controle'}
        fermer={() => setFeuille(null)}
        titre={tf('Contrôle à quatre yeux · {b}', { b: l.beneficiaire })}
        action="versement.controle"
        objet={l.id}
        resume={tf('Laisser partir {m} vers {n} ({b}) ce vendredi : numéro vérifié, hors blocage, aucune retenue de litige.', { m: Fr(l.verse), n: l.numero, b: l.beneficiaire })}
        montant={l.verse}
        quatreYeux
        rolesSecond={['superviseur']}
        preuves={l.lignes.map((x, i) => ({ id: String(i), libelle: `${x.libelle} : ${Fr(x.montant)}` }))}
      />
      <DecisionMotivee
        ouverte={feuille === 'exception'}
        fermer={() => setFeuille(null)}
        titre={tf('Exception de versement · {b}', { b: l.beneficiaire })}
        action="versement.exception"
        objet={l.id}
        resume={tf('Relancer le versement suspendu de {m} vers le numéro vérifié, ce vendredi. Aucun versement hors cycle.', { m: Fr(l.verse) })}
        montant={l.verse}
        quatreYeux
        rolesSecond={['superviseur']}
        preuves={[{ id: 'r', libelle: l.raison ?? '' }]}
      />
      <DecisionMotivee ouverte={feuille === 'plan'} fermer={() => setFeuille(null)} titre={tf('Plan d’apurement · {b}', { b: l.beneficiaire })} action="versement.plan_apurement" objet={l.id} resume={tf('Étaler la dette d’espèces de {m} sur les prochains vendredis ; jamais de caution, jamais de suspension automatique.', { m: Fr(l.dette) })} libelle="Valider le plan" />
    </>
  )
}

function Lots({ c, titre }: { c: Cycle; titre: string }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const [genre, setGenre] = useState<GenreLot | 'tous'>('tous')
  const lots = c.lots.filter((l) => genre === 'tous' || l.genre === genre)
  const n = (g: GenreLot) => c.lots.filter((l) => l.genre === g).length
  return (
    <Panel titre={titre} icone="banknote" className="mt16" droite={<ExportSigne nom={`versements-${c.id}.csv`} objet={`Versements ${c.id}`} entetes={['Lot', 'Bénéficiaire', 'Genre', 'Numéro', 'Versé', 'Frais du bénéficiaire', 'État']} lignes={() => c.lots.map((l) => [l.id, l.beneficiaire, l.genre, l.numero, l.verse, l.frais, l.etat])} />}>
      <Table
        cle={(l) => l.id}
        rows={lots}
        legende={titre}
        ligneCls={(l) => (['suspendu', 'bloque'].includes(l.etat) ? 'bad' : l.etat === 'prevu' || l.etat === 'confirme' ? undefined : 'warn')}
        outils={<Choix forme="chips" className="a-segs" aria={t('Filtrer les lots')} actif={genre} choisir={setGenre} items={[{ id: 'tous', t: t('Tous'), n: c.lots.length }, { id: 'vendeur', t: t('Vendeurs'), n: n('vendeur'), icone: 'store' }, { id: 'relais', t: t('Points relais'), n: n('relais') }, { id: 'entreprise', t: t('Entreprises'), n: n('entreprise') }]} />}
        cols={[
          {
            k: 'b',
            t: t('Bénéficiaire'),
            main: true,
            rendu: (l) => (
              <>
                <b>
                  <Icone nom={ICONE_GENRE[l.genre]} taille={14} /> {l.beneficiaire}
                </b>
                <div className="t2">{l.sous}</div>
                <Plus libelle={t('Décomposition')} plat>
                  {l.lignes.map((x, i) => (
                    <Mv key={i} k={x.libelle} v={Fr(x.montant)} />
                  ))}
                  <Mv k={t('Versé')} v={Fr(l.verse)} tot />
                </Plus>
              </>
            ),
          },
          { k: 'n', t: t('Numéro de versement'), hideM: true, rendu: (l) => <>{l.numero} <span className="cg b7">{t('✓ vérifié')}</span></> },
          { k: 'm', t: t('Montant'), cls: 'r', rendu: (l) => <b>{Fr(l.verse)}</b> },
          { k: 'f', t: t('Frais'), cls: 'r', hideM: true, rendu: (l) => (l.frais ? tf('{m} retenus', { m: Fr(l.frais) }) : '—') },
          { k: 's', t: t('Statut'), rendu: (l) => <Pill ton={ETAT_LOT[l.etat][1]} sm dot>{t(ETAT_LOT[l.etat][0])}</Pill> },
          { k: 'h', t: t('Confirmé à'), hideM: true, rendu: (l) => (l.confirmeLe ? d.heure(l.confirmeLe) : '—') },
        ]}
        pied={
          <>
            <span>{tf('{n} lots · {m}', { n: c.lots.length, m: Fr(c.lots.reduce((s, l) => s + l.verse, 0)) })}</span>
            <span>{t('1 % Mobile Money retenu à chaque bénéficiaire')}</span>
          </>
        }
      />
    </Panel>
  )
}

function CycleClos({ c }: { c: Cycle }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const total = c.lots.reduce((n, l) => n + l.verse, 0)
  const frais = c.lots.reduce((n, l) => n + l.frais + l.fraisBelivay, 0)
  return (
    <>
      <Hero
        k={tf('Cycle du vendredi {jour} · clos', { jour: d.jour(c.vendredi) })}
        v={Fr(total).replace(' F', '')}
        s={tf('{n} versements confirmés par l’opérateur, le dernier avant {h} h.', { n: c.lots.length, h: ARGENT.limiteVersementH })}
        droite={<Pill ton="dk" icone="circle-check">{tf('{n} sur {n} confirmés', { n: c.lots.length })}</Pill>}
        mesures={[
          { l: t('Confirmés'), v: String(c.lots.length), s: Fr(total), icone: 'circle-check' },
          { l: t('Échecs'), v: '0', s: t('aucune nouvelle tentative'), icone: 'circle-x' },
          { l: t('Frais Mobile Money'), v: Fr(frais), s: t('1 % payé par chaque bénéficiaire'), icone: 'receipt' },
          { l: t('Rapprochement'), v: t('vert'), s: t('registre = relevé'), icone: 'scale' },
        ]}
      />
      <Etapes etapes={ETAPES} cur={4} fini />
      <div className="g g21">
        <Lots c={c} titre={t('Lots du cycle')} />
        <Panel titre={t('Rapprochement et clôture')} icone="scale">
          <Xt tete={[t('Flux'), t('Registre'), t('Relevé'), t('Écart')]} lignes={[[t('Versements'), Fr(total), Fr(total), '0 F'], [t('Nombre'), String(c.lots.length), String(c.lots.length), '0'], [t('Frais'), Fr(frais), Fr(frais), '0 F']]} />
          <Note ton="green" icone="circle-check" className="mt10">
            <b>{t('Rapprochement vert.')}</b> {t('Chaque bénéficiaire a reçu son relevé hebdomadaire.')}
          </Note>
          <Hint icone="scroll-text">{tf('Clôture journalisée ; le cycle clos ne se modifie plus. {par} l’a clos à {h}.', { par: c.closPar ?? '', h: c.closLe ? d.heure(c.closLe) : '' })}</Hint>
        </Panel>
      </div>
    </>
  )
}
