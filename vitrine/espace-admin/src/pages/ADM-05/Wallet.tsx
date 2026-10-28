// Page ajoutée « Suivi du Wallet » (v6 D16, D24 ; ADM-CACHEE-10 ; QUESTIONS A03), servie par la route de l'escrow
// (route « wallet ») : les fonds clients du Wallet sont un compte du grand livre (419), détenus chez l'agrégateur comme
// l'escrow. Deux sous-soldes : retirable (rechargé ou remboursé) et gestes commerciaux (non retirables, seulement pour
// acheter) ; solde plafonné (WALLET-PLAFOND-V6) ; retrait à 3 % payés par le client, minimum, seulement vers le
// numéro de recharge ; code à 4 chiffres au-delà du seuil. La console ne déplace jamais l'argent d'un client : elle
// surveille, signale à la fraude et, en cas de doute, gèle les retraits à quatre yeux (Finance et Direction).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Barre, Kpi, Note, Panel, Pill, Table } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { CompteWallet } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRole, useRouteOuverte } from '../../session'
import { Fr, Lu, Mv } from './commun'
import { ARGENT, retraitWallet } from '../../calculs/argent'
import { Plie, useFonctionsS } from '../ADM-03/kit'

export default function Wallet() {
  const { t, tf } = usePreferences()
  const role = useRole()
  const ouvre = useRouteOuverte()
  const l = useLecture(() => source.argent.wallet(), [])
  const [gel, setGel] = useState<CompteWallet | null>(null)
  const peut = role === 'superviseur' || role === 'finance'
  const comptes = l.donnees?.comptes ?? []
  const alertes = comptes.filter((c) => c.alerte)
  const fonctions = useFonctionsS('wallet', [
    { verbe: 'Geler', n: alertes.length, unite: ['compte en alerte', 'comptes en alerte'], icone: 'snowflake', onClick: () => alertes[0] && setGel(alertes[0]), si: peut, alerte: true },
    { verbe: 'Surveiller', n: comptes.filter((c) => c.retirable + c.gestes >= ARGENT.walletPlafond * 0.9).length, unite: ['compte au plafond', 'comptes au plafond'], icone: 'gauge', onClick: () => document.getElementById('wl-comptes')?.scrollIntoView({ behavior: 'smooth' }) },
    { verbe: 'Instruire', n: null, unite: ['', ''], icone: 'shield-alert', route: 'fraude' },
  ])
  return (
    <Ecran route="wallet" titre={t('Suivi du Wallet')} retour={chemin('escrow')} kicker={t('Argent')} fonctions={l.donnees ? fonctions : undefined}>
      <Lu l={l}>
        {(v) => {
          const total = v.comptes.reduce((n, c) => n + c.retirable + c.gestes, 0)
          const gestes = v.comptes.reduce((n, c) => n + c.gestes, 0)
          const proches = v.comptes.filter((c) => c.retirable + c.gestes >= ARGENT.walletPlafond * 0.9)
          return (
            <>
              <Note ton="violet" icone="shield-check">
                <b>{v.interrupteur.code}</b> · {v.interrupteur.etat}
              </Note>
              <div className="g g4">
                <Kpi k={t('Fonds clients Wallet')} v={Fr(total).replace(' F', '')} u="F" s={tf('{n} comptes · compte 419 du grand livre', { n: v.comptes.length })} icone="wallet" ton="night" />
                <Kpi k={t('Gestes commerciaux')} v={Fr(gestes).replace(' F', '')} u="F" s={t('non retirables · seulement pour acheter')} icone="gift" />
                <Kpi k={t('Recharges du mois')} v={Fr(v.mouvementsMois.recharges).replace(' F', '')} u="F" s={tf('{pct} % Mobile Money payés par BelivaY : {frais}', { pct: ARGENT.fraisClient, frais: Fr(Math.round((v.mouvementsMois.recharges * ARGENT.fraisClient) / 100)) })} icone="arrow-down-to-line" />
                <Kpi k={t('Retraits du mois')} v={Fr(v.mouvementsMois.retraits).replace(' F', '')} u="F" s={tf('{pct} % payés par le client, vers le numéro de recharge', { pct: ARGENT.walletRetraitFrais })} icone="arrow-up" iton="or" />
              </div>
              <div id="wl-comptes" />
              <Panel titre={t('Comptes Wallet')} icone="users" className="mt16">
                <Table
                  cle={(c) => c.id}
                  rows={v.comptes}
                  legende={t('Comptes Wallet')}
                  ligneCls={(c) => (c.alerte ? 'warn' : undefined)}
                  cols={[
                    { k: 'c', t: t('Client'), main: true, rendu: (c) => <><b>{c.client}</b><div className="t2">{c.id} · {c.numeroRecharge}</div></> },
                    { k: 'r', t: t('Retirable'), cls: 'r', rendu: (c) => Fr(c.retirable) },
                    { k: 'g', t: t('Gestes'), cls: 'r', hideM: true, rendu: (c) => Fr(c.gestes) },
                    {
                      k: 'p',
                      t: t('Plafond'),
                      rendu: (c) => (
                        <>
                          <Barre pct={((c.retirable + c.gestes) / ARGENT.walletPlafond) * 100} ton={c.retirable + c.gestes >= ARGENT.walletPlafond * 0.9 ? 'red' : 'acc'} aria={tf('{n} % du plafond', { n: Math.round(((c.retirable + c.gestes) / ARGENT.walletPlafond) * 100) })} />
                          <span className="t12 c3">{tf('{s} sur {p}', { s: Fr(c.retirable + c.gestes), p: Fr(ARGENT.walletPlafond) })}</span>
                        </>
                      ),
                    },
                    { k: 'x', t: t('Retraits 24 h'), hideM: true, rendu: (c) => (c.retraits24h.n ? `${c.retraits24h.n} · ${Fr(c.retraits24h.montant)}` : '—') },
                    {
                      k: 's',
                      t: t('État'),
                      rendu: (c) => (c.gele ? <Pill ton="red" sm dot>{t('Retraits gelés')}</Pill> : c.enAttenteQuatreYeux ? <Pill ton="violet" sm>{tf('Gel à contresigner · {id}', { id: c.enAttenteQuatreYeux })}</Pill> : c.alerte ? <Pill ton="amber" sm dot>{t('Alerte de fraude')}</Pill> : <Pill ton="green" sm dot>{t('Normal')}</Pill>),
                    },
                    {
                      k: 'a',
                      t: '',
                      rendu: (c) =>
                        peut && !c.gele && !c.enAttenteQuatreYeux ? (
                          <button type="button" className={'btn sm ' + (c.alerte ? 'primary' : 'secondary')} onClick={() => setGel(c)}>
                            {t('Geler les retraits')}
                          </button>
                        ) : null,
                    },
                  ]}
                  pied={<span>{tf('Plafond {p} par compte · code à 4 chiffres au-delà de {c} · retrait minimum {m}', { p: Fr(ARGENT.walletPlafond), c: Fr(ARGENT.walletCodeSeuil), m: Fr(ARGENT.walletRetraitMin) })}</span>}
                />
                {v.comptes.filter((c) => c.alerte).map((c) => (
                  <Note key={c.id} ton="amber" icone="shield-alert" className="mt10">
                    <b>{c.id}</b> · {c.alerte}{' '}
                    {ouvre('fraude') && <Link to={chemin('fraude')}>{t('Fraude et anneaux')}</Link>}
                  </Note>
                ))}
                {proches.length > 0 && <div className="admA-note">{tf('{n} compte(s) à 90 % du plafond', { n: proches.length })}</div>}
              </Panel>
              <div className="g g2">
                <Simulateur />
                <Panel titre={t('Règles du Wallet')} icone="book-open">
                  <Mv k={t('Recharge')} v={tf('gratuite pour le client · {pct} % Mobile Money payés par BelivaY', { pct: ARGENT.fraisClient })} />
                  <Mv k={t('Paiement d’une commande')} v={t('sans frais')} />
                  <Mv k={t('Retrait')} v={tf('{pct} % payés par le client, vers le numéro de recharge, {m} au moins', { pct: ARGENT.walletRetraitFrais, m: Fr(ARGENT.walletRetraitMin) })} />
                  <Mv k={t('Gestes commerciaux')} v={t('non retirables, plafonnés à la commission perçue')} />
                  <Mv k={t('Remboursement')} v={t('commande payée avec le Wallet → Wallet ; Mobile Money → Mobile Money')} />
                  <Mv k={t('Solde')} v={tf('plafonné à {p} · code au-delà de {c}', { p: Fr(ARGENT.walletPlafond), c: Fr(ARGENT.walletCodeSeuil) })} tot />
                  <Plie titre={t('Cadre légal')}>{t('Monnaie électronique CEMAC : seul ce qui est légalement faisable s’ouvre, après la vérification juridique.')}</Plie>
                </Panel>
              </div>
              {gel && (
                <DecisionMotivee
                  ouverte
                  fermer={() => setGel(null)}
                  titre={tf('Geler les retraits de {id}', { id: gel.id })}
                  action="wallet.geler"
                  objet={gel.id}
                  resume={tf('Gel conservatoire des retraits de {client} : le client peut toujours acheter avec son solde ; aucun argent ne bouge.', { client: gel.client })}
                  quatreYeux
                  rolesSecond={role === 'finance' ? ['superviseur'] : ['finance']}
                  preuves={gel.alerte ? [{ id: 'a', libelle: gel.alerte }] : []}
                />
              )}
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}

/** Ce que le client verrait avant de valider un retrait (v6 D16) : frais, montant reçu, refus et pourquoi. */
function Simulateur() {
  const { t, tf } = usePreferences()
  const [demande, setDemande] = useState(10000)
  const [retirable, setRetirable] = useState(41200)
  const r = retraitWallet(demande, retirable)
  return (
    <Panel titre={t('Simuler un retrait')} icone="calculator">
      <div className="row wrap" style={{ gap: 12 }}>
        <label className="fld grow">
          <span className="fld-t">{t('Montant demandé (F)')}</span>
          <span className="inp">
            <input type="number" min={0} step={500} value={demande} onChange={(e) => setDemande(Math.max(0, Number(e.target.value) || 0))} />
          </span>
        </label>
        <label className="fld grow">
          <span className="fld-t">{t('Solde retirable (F)')}</span>
          <span className="inp">
            <input type="number" min={0} step={500} value={retirable} onChange={(e) => setRetirable(Math.max(0, Number(e.target.value) || 0))} />
          </span>
        </label>
      </div>
      <Mv k={tf('Frais ({pct} %)', { pct: ARGENT.walletRetraitFrais })} v={Fr(r.frais)} />
      <Mv k={t('Reçu sur le numéro de recharge')} v={Fr(r.recu)} tot />
      {r.ok ? (
        <Note ton="green" icone="circle-check" className="mt10">
          {r.code ? t('Retrait possible, avec le code à 4 chiffres.') : t('Retrait possible.')}
        </Note>
      ) : (
        <Note ton="red" icone="circle-x" className="mt10">
          <Icone nom="info" taille={14} /> {r.raison === 'minimum' ? tf('Refusé : {m} au moins.', { m: Fr(ARGENT.walletRetraitMin) }) : t('Refusé : au-delà du solde retirable (les gestes commerciaux ne se retirent pas).')}
        </Note>
      )}
    </Panel>
  )
}
