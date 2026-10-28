// Page ajoutée « Remboursements automatiques » (v6 D18, D24 ; ADM-CACHEE-12 ; QUESTIONS A09), servie par la route des
// remboursements (route « remb-auto ») : chaque cas journalisé avec ses contrôles (seuil, commandes sans litige perdu, photo
// comparée aux preuves de remise, demande sous 48 h, 1 par 30 jours et 3 par an par personne), le plafond mensuel
// global avec alerte ; un doute fait passer en retour normal ; un client pris en abus perd ce droit après validation
// humaine (il garde le retour normal) ; un vendeur dont les articles cumulent ces remboursements passe en contrôle.
// Payés par BelivaY : le vendeur est payé normalement.
import { useState } from 'react'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Barre, Kpi, Note, Panel, Pill, Table } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { CasAuto } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRole } from '../../session'
import { Fr, Lu, useDate } from './commun'
import { Plie, useFonctionsS } from '../ADM-03/kit'
import { ARGENT, controleAuto } from '../../calculs/argent'

const CONTROLES: Record<string, string> = { seuil: 'Seuil', commandes: 'Commandes sans litige perdu', photo: 'Photo comparée', delai: 'Demande sous 48 h', '30j': '1 par 30 jours', an: '3 par an', doute: 'Aucun doute' }

export default function RemboursementsAuto() {
  const { t, tf } = usePreferences()
  const d = useDate()
  const role = useRole()
  const l = useLecture(() => source.argent.remboursements(), [])
  const [feuille, setFeuille] = useState<{ genre: 'retour' | 'droit' | 'vendeur'; c: CasAuto } | null>(null)
  const argent = role === 'superviseur' || role === 'finance'
  const decide = role === 'superviseur' || role === 'mediation'
  const cas = l.donnees?.auto.cas ?? []
  const enControle = l.donnees?.auto.vendeursEnControle ?? []
  const parV = new Map<string, number>()
  for (const c of cas.filter((x) => x.etat === 'rembourse')) parV.set(c.vendeur, (parV.get(c.vendeur) ?? 0) + 1)
  const aller = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const fonctions = useFonctionsS('remb-auto', [
    { verbe: 'Instruire', n: cas.filter((c) => c.etat === 'en_revue').length, unite: ['cas en revue', 'cas en revue'], icone: 'search', onClick: aller('ra-cas'), si: argent || decide, alerte: true },
    { verbe: 'Contrôler', n: [...parV].filter(([v, n]) => n > 1 && !enControle.includes(v)).length, unite: ['vendeur', 'vendeurs'], icone: 'store', onClick: aller('ra-vendeurs'), si: argent || decide },
    { verbe: 'Retirer', n: cas.filter((c) => !c.droitRetire && c.surAn >= ARGENT.autoParAn).length, unite: ['droit', 'droits'], icone: 'user-x', onClick: aller('ra-cas'), si: decide },
  ])
  return (
    <Ecran route="remb-auto" titre={t('Remboursements automatiques')} retour={chemin('remboursements')} kicker={t('Argent')} fonctions={l.donnees ? fonctions : undefined}>
      <Lu l={l}>
        {(v) => {
          const pct = (v.auto.moisTotal / ARGENT.autoPlafondMois) * 100
          const alerte = pct >= ARGENT.autoAlerte
          const parVendeur = new Map<string, number>()
          for (const c of v.auto.cas.filter((x) => x.etat === 'rembourse')) parVendeur.set(c.vendeur, (parVendeur.get(c.vendeur) ?? 0) + 1)
          return (
            <>
              {alerte && (
                <Note ton="amber" icone="triangle-alert">
                  {tf('Plafond mensuel atteint à {p} % : alerte à l’administration ; au-delà du plafond, chaque demande passe en retour normal.', { p: Math.round(pct) })}
                </Note>
              )}
              <div className="g g2">
                <Kpi k={t('Remboursés ce mois')} v={Fr(v.auto.moisTotal).replace(' F', '')} u="F" s={tf('sur {p} de plafond global', { p: Fr(ARGENT.autoPlafondMois) })} icone="zap" ton="night" />
                <Kpi k={t('Cas du mois')} v={v.auto.cas.length} s={tf('{n} en revue · {r} passés en retour normal', { n: v.auto.cas.filter((c) => c.etat === 'en_revue').length, r: v.auto.cas.filter((c) => c.etat === 'retour_normal').length })} icone="list" />
              </div>
              <Panel titre={t('Plafond mensuel global')} icone="gauge" className="mt16">
                <Barre pct={Math.min(100, pct)} ton={alerte ? 'red' : 'acc'} aria={tf('{p} % du plafond', { p: Math.round(pct) })} />
                <div className="row t12 c3 mt6" style={{ justifyContent: 'space-between' }}>
                  <span>{tf('{m} remboursés', { m: Fr(v.auto.moisTotal) })}</span>
                  <span>{tf('alerte à {a} %', { a: ARGENT.autoAlerte })}</span>
                  <span>{Fr(ARGENT.autoPlafondMois)}</span>
                </div>
              </Panel>
              <div className="mt16" id="ra-cas">
                <Table
                  cle={(c) => c.id}
                  rows={v.auto.cas}
                  legende={t('Remboursements automatiques du mois')}
                  ligneCls={(c) => (c.etat === 'en_revue' ? 'warn' : undefined)}
                  cols={[
                    { k: 'id', t: t('Cas'), main: true, rendu: (c) => <><b className="mono">{c.id}</b><div className="t2">{c.commande} · {d.quand(c.le)}</div></> },
                    { k: 'cl', t: t('Client'), rendu: (c) => <>{c.client}{c.droitRetire && <div><Pill ton="red" sm>{t('Droit retiré')}</Pill></div>}</> },
                    { k: 'a', t: t('Article'), hideM: true, rendu: (c) => `${c.article} · ${c.vendeur}` },
                    { k: 'm', t: t('Montant'), cls: 'r', rendu: (c) => <b>{Fr(c.montant)}</b> },
                    {
                      k: 'ctl',
                      t: t('Contrôles'),
                      rendu: (c) => {
                        const k = controleAuto({ ...c, article: c.montant, doute: !!c.doute })
                        const ko = k.checks.filter((x) => !x.ok)
                        return ko.length ? <span className="t12">{ko.map((x) => t(CONTROLES[x.id])).join(' · ')}</span> : <span className="t12 cg b7">{t('tous tenus')}</span>
                      },
                    },
                    { k: 'st', t: t('État'), rendu: (c) => <Pill ton={c.etat === 'rembourse' ? 'green' : c.etat === 'en_revue' ? 'amber' : 'ink'} sm dot>{t(c.etat === 'rembourse' ? 'Remboursé' : c.etat === 'en_revue' ? 'En revue' : 'Retour normal')}</Pill> },
                    {
                      k: 'go',
                      t: '',
                      rendu: (c) => (
                        <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                          {c.etat === 'en_revue' && (argent || decide) && (
                            <button type="button" className="btn sm primary" onClick={() => setFeuille({ genre: 'retour', c })}>
                              {t('Retour normal')}
                            </button>
                          )}
                          {decide && !c.droitRetire && c.surAn >= ARGENT.autoParAn && (
                            <button type="button" className="btn sm secondary" onClick={() => setFeuille({ genre: 'droit', c })}>
                              {t('Retirer le droit')}
                            </button>
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
              <div className="g g2" id="ra-vendeurs">
                <Panel titre={t('Vendeurs à contrôler')} icone="store">
                  {[...parVendeur].sort((a, b) => b[1] - a[1]).map(([vendeur, n]) => (
                    <div className="admA-chk" key={vendeur}>
                      <span className={'i ' + (v.auto.vendeursEnControle.includes(vendeur) ? 'v' : n > 1 ? 'a' : 'g')}>
                        <Icone nom={v.auto.vendeursEnControle.includes(vendeur) ? 'search-check' : 'store'} taille={15} />
                      </span>
                      <span className="grow">
                        <b>{vendeur}</b>
                        <span>{v.auto.vendeursEnControle.includes(vendeur) ? t('En contrôle : articles et photos revus par la Vérification') : tf('{n} remboursement(s) automatique(s) ce mois', { n })}</span>
                      </span>
                      {(argent || decide) && !v.auto.vendeursEnControle.includes(vendeur) && n > 1 && (
                        <button type="button" className="btn sm secondary" onClick={() => setFeuille({ genre: 'vendeur', c: v.auto.cas.find((x) => x.vendeur === vendeur)! })}>
                          {t('Mettre en contrôle')}
                        </button>
                      )}
                    </div>
                  ))}
                  <Plie titre={t('Effet sur le vendeur')}>{t('Le vendeur est payé normalement et son Trust Score n’est pas touché par un remboursement automatique ; le contrôle vérifie ses articles.')}</Plie>
                </Panel>
                <Panel titre={t('Règles strictes')} icone="book-open">
                  <Plie titre={tf('{n} contrôles', { n: Object.keys(CONTROLES).length })}>
                  {Object.entries(CONTROLES).map(([k, x]) => (
                    <div className="admA-chk" key={k}>
                      <span className="i g">
                        <Icone nom="check" taille={15} />
                      </span>
                      <span className="grow">
                        <b>{t(x)}</b>
                        <span>
                          {k === 'seuil' ? tf('{s} au plus ({e} au palier Élevé), frais de livraison exclus', { s: Fr(ARGENT.autoStd), e: Fr(ARGENT.autoEleve) }) : k === 'commandes' ? tf('{n} commandes livrées au moins', { n: ARGENT.autoMinCmd }) : k === 'delai' ? tf('{h} h après la remise ; au-delà, retour normal', { h: ARGENT.autoDelaiH }) : k === 'photo' ? t('Comparée aux photos de preuve de la remise') : k === 'doute' ? t('Un doute fait passer en retour normal, avec retour du colis') : t('Compté par personne : compte, numéro Mobile Money, téléphone, relais habituel')}
                        </span>
                      </span>
                    </div>
                  ))}
                  </Plie>
                </Panel>
              </div>
              {feuille && (
                <DecisionMotivee
                  ouverte
                  fermer={() => setFeuille(null)}
                  titre={feuille.genre === 'retour' ? tf('Passer {id} en retour normal', { id: feuille.c.id }) : feuille.genre === 'droit' ? tf('Retirer le remboursement automatique à {c}', { c: feuille.c.client }) : tf('Mettre {v} en contrôle', { v: feuille.c.vendeur })}
                  action={feuille.genre === 'retour' ? 'remb_auto.retour_normal' : feuille.genre === 'droit' ? 'remb_auto.retirer_droit' : 'remb_auto.controle_vendeur'}
                  objet={feuille.genre === 'retour' ? feuille.c.id : feuille.genre === 'droit' ? feuille.c.client : feuille.c.vendeur}
                  resume={feuille.genre === 'retour' ? t('Le client dépose le colis au relais ; le remboursement suit l’inspection du retour.') : feuille.genre === 'droit' ? t('Le client perd définitivement le remboursement automatique ; il garde le retour normal.') : t('Les articles du vendeur sont revus par la Vérification ; il reste payé normalement.')}
                  libelle="Décider"
                  preuves={feuille.c.doute ? [{ id: 'd', libelle: feuille.c.doute }] : []}
                />
              )}
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}
