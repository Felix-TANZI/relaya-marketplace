// ADM-P08 · Rapprochement, revenus et obligations : registre, agrégateur et comptabilité d'une seule voix. Structure du
// prototype gardée (revenus BelivaY du jour, onglets Hier / Aujourd'hui / Mois, registre ↔ agrégateur, revenus des
// 7 derniers jours, coûts enregistrés, relevés et obligations ; écart : origine probable et carte ; clôture : exports
// signés et transmission au comptable ; erreur de chargement). Règles : revenus = commissions et frais de livraison
// SEULS ; les frais Mobile Money du client et les retraits Wallet sont de l'argent de passage (QUESTIONS A02) ; aucune
// correction à la main, une régularisation passe par une écriture à quatre yeux ; un écart de moins de RAPPRO-ATTENTE-H
// est « en cours » ; non expliqué au-delà de RAPPRO-ECART-CARTE-H, carte Direction. Ajouts : import du relevé de
// l'agrégateur (CSV) et page « Frais de paiement du mois » (route « frais-paiement »).
import { Plie, useFonctionsS } from '../ADM-03/kit'
import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CarteQuatreYeux } from '../../composants/CarteQuatreYeux'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { csvSigne } from '../../composants/ExportSigne'
import { Icone } from '../../composants/Icone'
import { Banniere, BarresH, Choix, Hint, Li, Note, Panel, Pill, Table } from '../../composants/prototype'
import { REGISTRE } from '../../calculs/registre'
import { NOM_ROLE } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { EcartRappro, VueRapprochement } from '../../donnees/domaines/argent'
import { telecharger } from '../../donnees/exports'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { usePeut, useRole, useRouteOuverte, useSession } from '../../session'
import { Chk, Fr, Hero, Lu, Mv, Xt, useDate, useDecision } from './commun'
import { ARGENT, FAMILLES, minimumPerception } from '../../calculs/argent'

type Onglet = 'hier' | 'jour' | 'mois'

export default function Rapprochement() {
  const { t } = usePreferences()
  const d = useDate()
  const [p, setP] = useSearchParams()
  const l = useLecture(() => source.argent.rapprochement(), [])
  const onglet = (['jour', 'mois'].includes(p.get('s') ?? '') ? p.get('s') : 'hier') as Onglet
  const ouvre = useRouteOuverte()
  const ecarts = (l.donnees?.aujourdhui.ecarts ?? []).filter((e) => e.etat !== 'regularise' && e.etat !== 'en_attente').length
  const aller = (o: Onglet) => () => setP(o === 'hier' ? {} : { s: o }, { replace: true })
  const fonctions = useFonctionsS('rapprochement', [
    { verbe: 'Expliquer', n: ecarts, unite: ['écart', 'écarts'], icone: 'search', onClick: aller('jour'), alerte: true },
    { verbe: 'Importer', n: null, unite: ['', ''], icone: 'file-up', onClick: aller('jour'), geste: true },
    { verbe: 'Clôturer', n: null, unite: ['', ''], icone: 'calendar-check', onClick: aller('mois'), geste: true },
    { verbe: 'Exporter', n: null, unite: ['', ''], icone: 'download', route: 'export' },
  ])
  return (
    <Ecran
      route="rapprochement"
      kicker={d.quand(l.donnees?.le ?? Date.now())}
      fonctions={l.donnees ? fonctions : undefined}
      actions={
        <>
          <Link className="btn secondary" to={chemin('frais-paiement')}>
            <Icone nom="receipt" taille={18} />
            <span>{t('Frais de paiement du mois')}</span>
          </Link>
          {ouvre('export') && (
            <Link className="btn secondary" to={chemin('export')}>
              <Icone nom="download" taille={18} />
              <span>{t('Exports (lecture seule)')}</span>
            </Link>
          )}
        </>
      }
    >
      <Lu l={l}>
        {(v) => {
          const ecartsOuverts = v.aujourdhui.ecarts.filter((e) => e.etat !== 'regularise' && e.etat !== 'en_attente')
          return (
            <>
              {ecartsOuverts.length > 0 && onglet !== 'mois' && (
                <Banniere ton="amber" icone="triangle-alert">
                  <b>{t('Écart en cours d’explication')}</b> · {ecartsOuverts.map((e) => Fr(e.montant)).join(', ')}
                </Banniere>
              )}
              <RevenusHero v={v} />
              <div style={{ marginTop: 16 }}>
                <Choix
                  forme="tabs"
                  aria={t('Période du rapprochement')}
                  actif={onglet}
                  choisir={(o) => setP(o === 'hier' ? {} : { s: o }, { replace: true })}
                  items={[
                    { id: 'hier', t: `${t('Hier')} · ${d.jour(v.hier.jour)}`, n: v.hier.lignes.some((x) => x.registre !== x.agregateur) ? 1 : 0 },
                    { id: 'jour', t: t('Aujourd’hui · en continu'), n: ecartsOuverts.length },
                    { id: 'mois', t: `${t('Mois de')} ${v.cloture.mois}` },
                  ]}
                />
              </div>
              {onglet === 'mois' ? (
                <Cloture v={v} />
              ) : (
                <div className="g g21">
                  <div className="col" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
                    {onglet === 'hier' ? <Hier v={v} /> : <Jour v={v} />}
                    <Revenus v={v} />
                  </div>
                  <div className="col" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
                    <Panel titre={t('Coûts enregistrés aujourd’hui')} icone="receipt">
                      {v.couts.map((c) => (
                        <Mv key={c.libelle} k={t(c.libelle)} v={`${Fr(c.montant)} · ${c.detail}`} />
                      ))}
                      <Mv k={t('Total')} v={Fr(v.couts.reduce((n, c) => n + c.montant, 0))} tot />
                      <Plie titre={t('Frais hors contrat')}>{t('Frais de l’agrégateur différents du contrat : carte Finance et Direction, le coût réel est repris dans les simulations.')}</Plie>
                    </Panel>
                    <Obligations v={v} />
                  </div>
                </div>
              )}
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}

function RevenusHero({ v }: { v: VueRapprochement }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const r = v.revenusJour
  return (
    <Hero
      k={tf('Revenus BelivaY · aujourd’hui à {h}', { h: d.heure(v.le) })}
      v={Fr(r.commissions + r.livraison).replace(' F', '')}
      s={tf('Commissions et livraison · {m} payés par les clients, en transit', { m: Fr(r.payeClients) })}
      droite={<Pill ton="dk" icone="landmark">{t('Assiette fiscale : revenus seuls')}</Pill>}
      mesures={[
        { l: t('Commissions'), v: Fr(r.commissions), s: t('figées au paiement'), icone: 'percent' },
        { l: t('Frais de livraison'), v: Fr(r.livraison), s: t('nets des remboursements'), icone: 'truck' },
        { l: t('Minimum de perception'), v: Fr(minimumPerception(v.revenusMois)), s: tf('{p} % des revenus du mois à ce jour', { p: String(ARGENT.minPerception).replace('.', ',') }), icone: 'landmark' },
        { l: t('TVA'), v: `${ARGENT.tva} %`, s: t('19,25 % quand BelivaY y sera assujettie, annoncée 30 jours avant'), icone: 'receipt' },
      ]}
    />
  )
}

function Hier({ v }: { v: VueRapprochement }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const ecart = v.hier.lignes.some((x) => x.registre !== x.agregateur)
  return (
    <Panel titre={tf('Hier · {jour} · registre ↔ agrégateur', { jour: d.jour(v.hier.jour) })} icone="scale" droite={<Pill ton={ecart ? 'amber' : 'green'} sm dot>{t(ecart ? 'Écart expliqué' : 'Vert')}</Pill>}>
      <Xt tete={[t('Flux'), t('Registre'), t('Agrégateur'), t('Écart')]} lignes={v.hier.lignes.map((x) => [x.flux, Fr(x.registre), Fr(x.agregateur), Fr(x.agregateur - x.registre)])} alerte={(i) => v.hier.lignes[i].registre !== v.hier.lignes[i].agregateur} />
      {ecart ? (
        <Note ton="amber" icone="search" className="mt10">
          <b>{t('Écart sur les frais')}</b> · {t('expliqué : frais facturés au-delà du contrat (voir « Aujourd’hui »).')} {tf('Calculé à {h}.', { h: d.heure(v.hier.calculeLe) })}
        </Note>
      ) : (
        <Note ton="green" icone="circle-check" className="mt10">
          <b>{t('Rapprochement vert.')}</b> {tf('Aucun écart sur les encaissements, les versements du vendredi, les remboursements et les frais. Calculé à {h}.', { h: d.heure(v.hier.calculeLe) })}
        </Note>
      )}
    </Panel>
  )
}

function Jour({ v }: { v: VueRapprochement }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const role = useRole()
  const finance = role === 'finance' || role === 'superviseur'
  const fichier = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const importer = async (f: File) => {
    setMsg(null)
    const r = await source.argent.importerReleve(f.name, await f.text())
    setMsg(r.ok ? tf('{n} lignes lues, {e} écart(s).', { n: r.lignes, e: r.ecarts }) : r.raison === 'vide' ? t('Le fichier est vide.') : t('Forme inattendue : une ligne « reference;montant;statut » par paiement (BLV-…).'))
  }
  return (
    <>
      <Panel titre={t('Aujourd’hui · registre ↔ agrégateur, en continu')} icone="scale" droite={<Pill ton={v.aujourdhui.ecarts.some((e) => e.etat !== 'regularise') ? 'amber' : 'green'} sm dot>{tf('{n} écart(s)', { n: v.aujourdhui.ecarts.filter((e) => e.etat !== 'regularise').length })}</Pill>}>
        <Xt tete={[t('Flux'), t('Registre'), t('Agrégateur'), t('Écart')]} lignes={v.aujourdhui.lignes.map((x) => [x.flux, Fr(x.registre), Fr(x.agregateur), Fr(x.agregateur - x.registre)])} alerte={(i) => v.aujourdhui.lignes[i].registre !== v.aujourdhui.lignes[i].agregateur} />
        {v.aujourdhui.ecarts.map((e) => (
          <Ecart key={e.id} e={e} />
        ))}
        <Plie titre={t('Régularisation')}>{tf('Aucune correction à la main : la régularisation passe par une écriture à quatre yeux. Moins de {a} h : « en cours », pas un écart ; non expliqué au-delà de {c} h, carte Direction.', { a: ARGENT.attenteH, c: ARGENT.ecartCarteH })}</Plie>
      </Panel>
      <Panel titre={t('Relevé de l’agrégateur')} icone="file-up">
        {v.import ? (
          <>
            <Mv k={t('Dernier import')} v={`${v.import.nom} · ${d.quand(v.import.le)}`} />
            <Mv k={t('Lignes concordantes')} v={`${v.import.concordantes} / ${v.import.lignes}`} />
            {v.import.ecarts.map((x) => (
              <Chk key={x.ref} ton="a" icone="search" t={x.ref} s={tf('Registre {r} · relevé {l}', { r: Fr(x.registre), l: Fr(x.releve) })} />
            ))}
          </>
        ) : (
          <p className="t13 c2">{t('Aucun relevé importé aujourd’hui')}</p>
        )}
        {msg && (
          <p className="t13 b7 mt8" role="status">
            {msg}
          </p>
        )}
        <div className="btns">
          {finance && (
            <>
              <input ref={fichier} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && void importer(e.target.files[0])} />
              <button type="button" className="btn primary" onClick={() => fichier.current?.click()}>
                <Icone nom="file-up" taille={18} />
                <span>{t('Importer le relevé')}</span>
              </button>
            </>
          )}
          <button type="button" className="btn secondary" onClick={() => telecharger(new Blob(['﻿' + v.releveModele], { type: 'text/csv;charset=utf-8' }), 'releve-agregateur-modele.csv')}>
            <Icone nom="download" taille={18} />
            <span>{t('Relevé de paiement du jour (modèle)')}</span>
          </button>
        </div>
      </Panel>
    </>
  )
}

function Ecart({ e }: { e: EcartRappro }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const role = useRole()
  const ouvre = useRouteOuverte()
  const finance = role === 'finance' || role === 'superviseur'
  const [feuille, setFeuille] = useState(false)
  const qy = useDecision(e.etat === 'a_contresigner' ? e.quatreYeux : null)
  const nom = { en_attente: 'En cours · moins de 24 h', ecart: 'Écart à expliquer', carte: 'Carte Finance ouverte', a_contresigner: 'Régularisation à contresigner', regularise: 'Régularisé' }[e.etat]
  return (
    <div className="mt10">
      <Chk
        ton={e.etat === 'regularise' ? 'g' : e.etat === 'en_attente' ? 'v' : 'a'}
        icone="search"
        t={tf('Origine probable · {m}', { m: Fr(e.montant) })}
        s={`${e.origine} · ${t(nom)} · ${d.quand(e.ouvertLe)}${e.carte ? ' · ' + e.carte : ''}`}
      />
      {qy && <CarteQuatreYeux d={qy} />}
      {e.etat !== 'regularise' && (
        <div className="btns">
          {finance && e.etat !== 'carte' && e.etat !== 'a_contresigner' && (
            <button type="button" className="btn sm primary" onClick={() => void source.argent.ouvrirCarte(e.id, e.origine)}>
              <Icone nom="inbox" taille={16} />
              <span>{t('Ouvrir une carte Finance')}</span>
            </button>
          )}
          {finance && e.etat !== 'a_contresigner' && e.etat !== 'en_attente' && (
            <button type="button" className="btn sm secondary" onClick={() => setFeuille(true)}>
              <Icone nom="users" taille={16} />
              <span>{t('Proposer une écriture de régularisation')}</span>
            </button>
          )}
          {e.commande && ouvre('commandes') && (
            <Link className="btn sm secondary" to={chemin('commandes', { ref: e.commande })}>
              <Icone nom="shopping-bag" taille={16} />
              <span>{t('Voir la commande')}</span>
            </Link>
          )}
        </div>
      )}
      <DecisionMotivee
        ouverte={feuille}
        fermer={() => setFeuille(false)}
        titre={tf('Régulariser l’écart {id}', { id: e.id })}
        action="registre.regularisation"
        objet={e.id}
        resume={tf('Écriture de régularisation de {m} au registre, avec la pièce de l’agrégateur ; aucune correction à la main.', { m: Fr(e.montant) })}
        montant={e.montant}
        quatreYeux
        rolesSecond={role === 'finance' ? ['superviseur'] : ['finance']}
        preuves={[{ id: 'o', libelle: e.origine }]}
      />
    </div>
  )
}

function Revenus({ v }: { v: VueRapprochement }) {
  const { t } = usePreferences()
  const max = Math.max(...v.sept.map((x) => x.v), 1)
  const mz = Math.max(...v.parZone.map((x) => x.v), 1)
  const mc = Math.max(...v.parCategorie.map((x) => x.v), 1)
  return (
    <Panel titre={t('Revenus des 7 derniers jours')} icone="chart-column">
      <BarresH largeurLibelle={60} largeurValeur={90} lignes={v.sept.map((x, i) => ({ l: t(x.l), v: x.v, max, r: Fr(x.v), ton: i === v.sept.length - 1 ? 'acc' : '' }))} />
      <div className="g g2" style={{ marginTop: 8 }}>
        <div>
          <div className="kick">{t('Par zone · commandes libérées')}</div>
          <BarresH largeurLibelle={60} largeurValeur={80} lignes={v.parZone.map((x) => ({ l: x.l, v: x.v, max: mz, r: Fr(x.v) }))} />
        </div>
        <div>
          <div className="kick">{t('Par catégorie · commissions')}</div>
          <BarresH largeurLibelle={110} largeurValeur={80} lignes={v.parCategorie.map((x) => ({ l: t(FAMILLES.find((f) => f.id === x.l)?.nom ?? x.l), v: x.v, max: mc, r: Fr(x.v), ton: 'green' }))} />
        </div>
      </div>
    </Panel>
  )
}

function Obligations({ v }: { v: VueRapprochement }) {
  const { t, tf } = usePreferences()
  const ouvre = useRouteOuverte()
  return (
    <Panel titre={t('Relevés et obligations')} icone="file-check">
      <Li icone="file-text" ton="acc" t={t('Relevés mensuels des commissions')} s={tf('Valent facture : {m} · TVA {tva} %', { m: REGISTRE['BLV-MENTIONS-LEGALES']?.valeur ?? '', tva: ARGENT.tva })} to={ouvre('commissions') ? chemin('commissions', { s: 'releves' }) : undefined} />
      <Li icone="calendar-check" ton="acc" t={t('Relevés hebdomadaires des partenaires')} s={t('Relais et entreprises · émis avec le versement du vendredi')} to={ouvre('versements') ? chemin('versements') : undefined} />
      <Li icone="landmark" ton="or" t={t('Minimum de perception · ce mois')} s={tf('{p} % × {r} de revenus à ce jour = {m} · déclaration mensuelle', { p: String(ARGENT.minPerception).replace('.', ','), r: Fr(v.revenusMois), m: Fr(minimumPerception(v.revenusMois)) })} />
      <Li icone="receipt" ton="ink" t={tf('TVA · paramètre {tva} %', { tva: ARGENT.tva })} s={t('Passe à 19,25 % à l’assujettissement · annoncée 30 jours avant le premier prélèvement · aucune commande passée touchée')} />
    </Panel>
  )
}

function Cloture({ v }: { v: VueRapprochement }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const s = useSession()
  const role = useRole()
  const peut = usePeut('exporter')
  const [empreintes, setEmpreintes] = useState<Record<string, string>>({})
  const c = v.cloture
  const signer = async (id: string, telecharge: boolean) => {
    const e = c.exports.find((x) => x.id === id)!
    const qui = `${s.agent?.prenom ?? ''} ${s.agent?.nom ?? ''} · ${NOM_ROLE[s.role]} · ${new Date(s.maintenant).toISOString()}`
    const r = await csvSigne(e.entetes, e.lignes, qui)
    setEmpreintes((x) => ({ ...x, [id]: r.empreinte }))
    if (telecharge) {
      await source.gouvernance.ecrire({ action: 'export.csv', objet: `${e.nom} · ${r.empreinte.slice(0, 16)}` })
      telecharger(new Blob([r.contenu], { type: 'text/csv;charset=utf-8' }), e.nom)
    }
  }
  return (
    <>
      <div className="mt16">
        <Hero
          k={tf('Clôture de {mois}', { mois: c.mois })}
          v={Fr(c.revenus).replace(' F', '')}
          s={tf('Revenus du mois recalculés à l’identique depuis le registre : commissions {c} et frais de livraison {l}.', { c: Fr(c.commissions), l: Fr(c.livraison) })}
          droite={<Pill ton="dk" icone="lock">{t('Exports prêts · lecture seule')}</Pill>}
          mesures={[
            { l: t('Minimum de perception'), v: Fr(minimumPerception(c.revenus)), s: tf('{p} % des revenus', { p: String(ARGENT.minPerception).replace('.', ',') }), icone: 'landmark' },
            { l: t('TVA'), v: Fr(0), s: t('non assujettie'), icone: 'receipt' },
            { l: t('Rapprochements'), v: c.rapprochements.split(',')[0], s: t('verts ou expliqués'), icone: 'scale' },
            { l: t('Versements'), v: t('4 vendredis'), s: t('à l’heure'), icone: 'banknote' },
          ]}
        />
      </div>
      <div className="g g21">
        <Panel titre={t('Exports comptables · empreinte de chaque fichier')} icone="folder-lock">
          {c.exports.map((e) => (
            <div className="admA-chk" key={e.id}>
              <span className="i v">
                <Icone nom="file-check" taille={15} />
              </span>
              <span className="grow">
                <b>{e.nom}</b>
                <span>{e.detail}</span>
                {empreintes[e.id] ? <div className="admA-hash">{`SHA-256 · ${empreintes[e.id].slice(0, 16)} …`}</div> : null}
              </span>
              {peut ? (
                <button type="button" className="btn sm secondary" onClick={() => void signer(e.id, true)}>
                  <Icone nom="download" taille={16} />
                  <span>{t('Télécharger')}</span>
                </button>
              ) : (
                <button type="button" className="btn sm secondary" onClick={() => void signer(e.id, false)}>
                  <Icone nom="fingerprint" taille={16} />
                  <span>{t('Voir l’empreinte')}</span>
                </button>
              )}
            </div>
          ))}
        </Panel>
        <Panel titre={t('Transmettre au comptable externe')} icone="send">
          {c.transmis ? (
            <Note ton="green" icone="circle-check" className="mt10">
              {tf('Transmis {quand} par {par}.', { quand: d.quand(c.transmis.le), par: c.transmis.par })}
            </Note>
          ) : (
            (role === 'finance' || role === 'superviseur') && (
              <button type="button" className="btn primary mt10" onClick={() => void source.argent.transmettreComptable('2026-09')}>
                <Icone nom="send" taille={18} />
                <span>{t('Transmettre au comptable')}</span>
              </button>
            )
          )}
          <Hint icone="scroll-text">{t('Transmission journalisée : auteur, heure, empreintes.')}</Hint>
          <div className="hr"></div>
          <Mv k={t('Seuls revenus')} v={t('commissions + livraison')} />
          <Mv k={t('Argent d’autrui en transit')} v={t('jamais dans l’assiette')} />
        </Panel>
      </div>
    </>
  )
}

export function Frais({ l }: { l: ReturnType<typeof useLecture<VueRapprochement>> }) {
  const { t, tf } = usePreferences()
  const QUI = { client: 'Le client', vendeur: 'Le vendeur', beneficiaire: 'Relais ou entreprise', belivay: 'BelivaY' }
  return (
    <Ecran route="frais-paiement" titre={t('Frais de paiement du mois')} retour={chemin('rapprochement')} kicker={t('Argent')}>
      <Lu l={l}>
        {(v) => {
          const charge = v.frais.filter((f) => f.paye === 'belivay').reduce((n, f) => n + f.frais, 0)
          const passage = v.frais.filter((f) => f.paye !== 'belivay').reduce((n, f) => n + f.frais, 0)
          return (
            <>
              <div className="g g2">
                <Note ton="ink" icone="arrow-right-left">
                  <b>{tf('{m} d’argent de passage', { m: Fr(passage) })}</b> · {t('payés par les clients et retenus aux bénéficiaires des versements')}
                </Note>
                <Note ton="amber" icone="receipt">
                  <b>{tf('{m} à la charge de BelivaY', { m: Fr(charge) })}</b> · {t('recharges du Wallet, remboursements')}
                </Note>
              </div>
              <Panel titre={t('Frais par flux · ce mois')} icone="receipt" className="mt16">
                <Table
                  cle={(f) => f.flux}
                  rows={v.frais}
                  legende={t('Frais de paiement du mois')}
                  cols={[
                    { k: 'f', t: t('Flux'), main: true, rendu: (f) => <b>{t(f.flux)}</b> },
                    { k: 'b', t: t('Base'), cls: 'r', rendu: (f) => Fr(f.base) },
                    { k: 'x', t: t('Taux'), cls: 'r', rendu: (f) => `${f.taux} %` },
                    { k: 'm', t: t('Frais'), cls: 'r', rendu: (f) => <b>{Fr(f.frais)}</b> },
                    { k: 'p', t: t('Payé par'), rendu: (f) => <Pill ton={f.paye === 'belivay' ? 'amber' : 'ink'} sm>{t(QUI[f.paye])}</Pill> },
                  ]}
                  pied={<span>{tf('Contrat : {c} % à l’encaissement, {v} % sur chaque versement, payé par celui qui le reçoit ; retrait du Wallet {w} % payés par le client', { c: ARGENT.fraisClient, v: ARGENT.fraisVersementVendeur, w: ARGENT.walletRetraitFrais })}</span>}
                />
              </Panel>
              <Plie titre={t('Frais hors contrat')}>{t('Frais réellement facturés au-delà du contrat : écart au rapprochement, carte Finance et Direction.')}</Plie>
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}
