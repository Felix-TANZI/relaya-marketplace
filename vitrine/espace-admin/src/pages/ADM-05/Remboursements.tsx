// ADM-P06 · Remboursements : chaque remboursement de la décision à la réception par le client — origine, montant calculé,
// moyen d'origine, statut de l'opérateur, auteur. Structure du prototype gardée (indicateurs, tableau, compteur séparé
// des non instruits, « D'où vient un remboursement » ; fiche : en-tête et étapes, suivi, montant calculé, moyen
// d'origine, liens ; échec : tentatives et quatre yeux ; au-delà du seuil : quatre yeux).
// Règles : toujours vers le moyen d'origine (v6), jamais réorienté, jamais en espèces ; seule exception, le moyen fermé
// après trois refus : autre numéro du même titulaire, à quatre yeux (QUESTIONS A07) ; au-delà de REMB-CONTROLE-SEUIL :
// premier validateur Support ou Médiation, second Finance (ou Direction), jamais le même compte ; exécution d'un
// remboursement de litige au retour inspecté, jamais à la simple demande. Page ajoutée : « Remboursements
// automatiques » (route « remb-auto »), plafond mensuel global et compteurs par personne (v6 D18).
import { LienPoste } from '../../composants/poste/LienPoste'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CarteQuatreYeux } from '../../composants/CarteQuatreYeux'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { Choix, Frise, Hint, Li, Note, Panel, Pill, Recherche, Table, Vide, correspond, type Ton } from '../../composants/prototype'
import { NOM_ROLE } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { EtatRemb, OrigineRemb, RemboursementVu } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRole, useRouteOuverte } from '../../session'
import { Fr, Lu, Mv, Stepper, Xt, useDate, useDecision } from './commun'
import { Plie, useFonctionsS } from '../ADM-03/kit'
import { ARGENT } from '../../calculs/argent'

export const NOM_ETAT_REMB: Record<EtatRemb, [string, Ton]> = {
  attente: ['En attente de la décision', 'ink'],
  decide: ['Décidé', 'acc'],
  a_contresigner: ['Décidé · quatre yeux', 'violet'],
  en_cours: ['En cours · opérateur', 'blue'],
  echoue: ['Échoué · moyen fermé', 'red'],
  rembourse: ['Remboursé', 'green'],
  refuse: ['Refusé au contrôle', 'red'],
}
export const NOM_ORIGINE: Record<OrigineRemb, [string, string, Ton]> = {
  auto: ['Automatique sous le seuil', 'zap', 'or'],
  litige: ['Décision de litige', 'scale', 'red'],
  annulation: ['Annulation', 'circle-x', 'ink'],
  rupture: ['Rupture sans vendeur de remplacement', 'package-x', 'amber'],
  renvoi_garde: ['Renvoi pour garde dépassée', 'undo-2', 'blue'],
}

export default function Remboursements() {
  return <Liste />
}

function Liste() {
  const { t, tf } = usePreferences()
  const d = useDate()
  const [p, setP] = useSearchParams()
  const l = useLecture(() => source.argent.remboursements(), [])
  const id = p.get('id')
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<'tous' | 'actifs' | 'echoues' | 'faits'>('tous')
  const choisi = l.donnees?.liste.find((r) => r.id === id) ?? null
  const tous = l.donnees?.liste ?? []
  const premier = (f: (r: RemboursementVu) => boolean) => () => {
    const r = tous.find(f)
    if (r) setP({ id: r.id })
  }
  const fonctions = useFonctionsS('remboursements', [
    { verbe: 'Exécuter', n: tous.filter((r) => r.gestes.executer).length, unite: ['remboursement', 'remboursements'], icone: 'undo-2', onClick: premier((r) => r.gestes.executer), geste: true },
    { verbe: 'Relancer', n: tous.filter((r) => r.etat === 'echoue').length, unite: ['échec', 'échecs'], icone: 'circle-x', onClick: premier((r) => r.etat === 'echoue'), geste: true, alerte: true },
    { verbe: 'Relever', n: tous.filter((r) => r.etat === 'en_cours').length, unite: ['statut', 'statuts'], icone: 'refresh-cw', onClick: premier((r) => r.etat === 'en_cours') },
    { verbe: 'Instruire', n: l.donnees?.auto.cas.filter((c) => c.etat === 'en_revue').length ?? 0, unite: ['cas automatique', 'cas automatiques'], icone: 'zap', route: 'remb-auto' },
  ])
  if (id && choisi) return <Fiche r={choisi} />
  return (
    <Ecran
      route="remboursements"
      kicker={d.quand(Date.now())}
      fonctions={l.donnees ? fonctions : undefined}
      actions={
        <>
          <LienPoste genre="remboursement" />
          <Link className="btn secondary" to={chemin('remb-auto')}>
            <Icone nom="zap" taille={18} />
            <span>{t('Remboursements automatiques')}</span>
          </Link>
        </>
      }
    >
      <Perimetre route="remboursements" />
      <Lu l={l}>
        {(v) => {
          const fini = (r: RemboursementVu) => ['rembourse', 'refuse'].includes(r.etat)
          const nf = { tous: v.liste.length, actifs: v.liste.filter((r) => !fini(r)).length, echoues: v.liste.filter((r) => r.etat === 'echoue').length, faits: v.liste.filter(fini).length }
          const autos = v.auto.cas.filter((c) => c.etat === 'rembourse')
          const lignes = v.liste
            .filter((r) => correspond(q, r.id, r.commande, r.vendeur, r.moyen))
            .filter((r) => (filtre === 'tous' ? true : filtre === 'faits' ? fini(r) : filtre === 'echoues' ? r.etat === 'echoue' : !fini(r)))
          const parClient = new Map<string, { n: number; m: number; eleve: boolean }>()
          for (const c of autos) parClient.set(c.client, { n: (parClient.get(c.client)?.n ?? 0) + 1, m: (parClient.get(c.client)?.m ?? 0) + c.montant, eleve: c.palierEleve })
          return (
            <>
              <div style={{ marginTop: 16 }}>
                <Table
                  cle={(r) => r.id}
                  rows={lignes}
                  legende={t('Remboursements')}
                  ligneCls={(r) => (r.etat === 'echoue' ? 'bad' : r.etat === 'a_contresigner' || r.etat === 'decide' ? 'hot' : undefined)}
                  outils={
                    <>
                      <Recherche q={q} setQ={setQ} placeholder={t('Remboursement, commande…')} aria={t('Chercher un remboursement')} />
                      <Choix forme="chips" className="a-segs" aria={t('Filtrer les remboursements')} actif={filtre} choisir={setFiltre} items={[{ id: 'tous', t: t('Tous'), n: nf.tous }, { id: 'actifs', t: t('À suivre'), n: nf.actifs }, { id: 'echoues', t: t('Échoués'), n: nf.echoues }, { id: 'faits', t: t('Terminés'), n: nf.faits }]} />
                    </>
                  }
                  vide={<Vide icone="search-x" t={t('Aucun remboursement ne correspond')} action={<button type="button" className="btn sm secondary" onClick={() => (setQ(''), setFiltre('tous'))}>{t('Effacer')}</button>} />}
                  cols={[
                    { k: 'id', t: t('Remboursement'), main: true, rendu: (r) => <><b className="mono">{r.id}</b><div className="t2">{r.commande} · {r.vendeur}</div></> },
                    { k: 'o', t: t('Origine'), rendu: (r) => t(NOM_ORIGINE[r.origine][0]) },
                    { k: 'm', t: t('Montant calculé'), cls: 'r', rendu: (r) => <b>{Fr(r.montant)}</b> },
                    { k: 'mo', t: t('Moyen d’origine'), hideM: true, rendu: (r) => r.moyen },
                    { k: 'st', t: t('Statut'), rendu: (r) => <Pill ton={NOM_ETAT_REMB[r.etat][1]} sm dot>{t(NOM_ETAT_REMB[r.etat][0])}{r.etat === 'rembourse' && r.rembourseLe ? ` · ${d.quand(r.rembourseLe)}` : ''}</Pill> },
                    { k: 'a', t: t('Auteur'), hideM: true, rendu: (r) => r.auteur },
                    {
                      k: 'go',
                      t: '',
                      rendu: (r) => (
                        <button type="button" className={'btn sm ' + (r.gestes.executer || r.gestes.autreNumero || r.gestes.relever ? 'primary' : 'secondary')} onClick={() => setP({ id: r.id })}>
                          {t(r.gestes.executer || r.gestes.autreNumero ? 'Traiter' : r.etat === 'en_cours' ? 'Suivre' : 'Ouvrir')}
                        </button>
                      ),
                    },
                  ]}
                  pied={
                    <>
                      <span>{tf('{n} remboursements instruits', { n: v.liste.length })}</span>
                      <span>{t('Toujours vers le moyen d’origine · Wallet → Wallet, Mobile Money → Mobile Money')}</span>
                    </>
                  }
                />
              </div>
              <div className="g g2">
                <Panel titre={t('Compteur séparé · non instruits')} icone="hash" a={{ t: t('Suivi'), to: chemin('remb-auto') }}>
                  <Xt tete={[t('Client (ce mois)'), t('Non instruits'), t('Montant'), t('Palier')]} lignes={[...parClient].map(([c, x]) => [c, String(x.n), Fr(x.m), t(x.eleve ? 'Élevé' : 'Standard')])} />
                  <Plie titre={t('Seuils')}>{tf('Sous le seuil ({std} Standard, {eleve} Élevé) : remboursé sans enquête ni retour, payé par BelivaY ; le vendeur est payé normalement et son Trust Score n’est pas touché. Le compteur alimente l’IFA.', { std: Fr(ARGENT.autoStd), eleve: Fr(ARGENT.autoEleve) })}</Plie>
                </Panel>
                <Panel titre={t('D’où vient un remboursement')} icone="git-branch">
                  <Plie titre={tf('{n} origines', { n: 5 })}>
                  <Li icone="zap" ton="or" t={t('Automatique sous le seuil')} s={t('Jamais dans la file ; compté à part, voir le compteur des non instruits')} />
                  <Li icone="scale" ton="red" t={t('Décision de litige')} s={tf('Colis récupéré et inspecté, 48 h au plus après réception, sinon d’office ; quatre yeux au-delà de {s}', { s: Fr(ARGENT.seuilRemboursement) })} />
                  <Li icone="circle-x" ton="ink" t={t('Annulation')} s={t('Commande payée : remboursement intégral vers le moyen d’origine')} />
                  <Li icone="package-x" ton="amber" t={t('Rupture sans vendeur de remplacement')} s={t('Intégral, le jour même ; frais Mobile Money du client rendus, repris sur le vendeur')} />
                  <Li icone="undo-2" ton="blue" t={t('Renvoi pour garde dépassée')} s={tf('Payé − garde des 7 jours ({g}) − renvoi ({r})', { g: Fr(ARGENT.gardeGrille.reduce((n, x) => n + x, 0)), r: Fr(ARGENT.gardeRenvoi) })} />
                  <Li icone="receipt" ton="ink" t={t('Frais Mobile Money du client')} s={t('Rendus quand il n’est pas en faute ; gardés s’il annule lui-même, refuse un colis conforme ou ne le retire pas')} />
                  </Plie>
                </Panel>
              </div>
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}

function Fiche({ r }: { r: RemboursementVu }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const role = useRole()
  const ouvre = useRouteOuverte()
  const [feuille, setFeuille] = useState<'quatre' | 'autre' | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const qy = useDecision(r.etat === 'a_contresigner' ? r.quatreYeux?.id ?? null : null)
  const audessus = r.montant > ARGENT.seuilRemboursement
  const step = r.etat === 'rembourse' ? 3 : r.etat === 'en_cours' || r.etat === 'echoue' ? (r.etat === 'echoue' ? 2 : 1) : 0
  const [nom, ton] = NOM_ETAT_REMB[r.etat]
  const premiers = ['superviseur', 'support', 'mediation', 'finance']
  const executer = async () => {
    setErreur(null)
    const x = await source.argent.executer(r.id)
    if (!x.ok) setErreur(x.raison === 'seuil' ? t('Au-delà du seuil : la décision passe à quatre yeux.') : x.raison === 'deja_rembourse' ? t('Commande déjà remboursée (annulation) : un seul remboursement par commande.') : t('Ce remboursement n’est plus à exécuter.'))
  }
  const relever = async () => {
    setErreur(null)
    const x = await source.argent.releverStatut(r.id)
    if (!x.ok) setErreur(t('Le statut n’a pas pu être relevé.'))
  }
  return (
    <Ecran route="remboursements" titre={r.id} retour={chemin('remboursements')} kicker={tf('Argent · Remboursements · {cmd}', { cmd: r.commande })}>
      <div className="admA-lhead">
        <span className="li" style={{ padding: 0, border: 0, minHeight: 0 }}>
          <span className={'ic ' + ton} style={{ width: 44, height: 44, borderRadius: 13 }}>
            <Icone nom="undo-2" taille={22} />
          </span>
        </span>
        <div className="grow">
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="id">{`${r.id} · ${r.commande}`}</span>
            <Pill ton={ton} sm dot>
              {t(nom)}
            </Pill>
            {r.etat === 'echoue' && (
              <Pill ton="violet" sm>
                {t('Carte Finance')}
              </Pill>
            )}
          </div>
          <div className="sub2">
            {r.article} · {r.vendeur} · {tf('décidé {quand}', { quand: d.quand(r.decideLe) })}
          </div>
        </div>
        <div className="hide-m" style={{ width: 250, flexShrink: 0 }}>
          <Stepper etapes={['Décidé', 'En cours', r.etat === 'echoue' ? 'Échoué' : 'Remboursé']} cur={step} />
        </div>
        <div className="amt">
          {Fr(r.montant)}
          <small style={{ color: 'var(--ink-3)' }}>{t(r.etat === 'rembourse' ? 'reçus par le client' : 'montant calculé')}</small>
        </div>
      </div>
      {erreur && (
        <p className="e-erreur mt10" role="alert">
          <Icone nom="triangle-alert" taille={16} />
          {erreur}
        </p>
      )}
      <div className="g g21">
        <div className="col" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
          {(r.etat === 'a_contresigner' || r.etat === 'echoue' || (r.etat === 'decide' && audessus) || (r.quatreYeux && r.etat === 'rembourse')) && (
            <Panel titre={r.etat === 'echoue' ? t('Quatre yeux · remboursement vers un autre moyen du même payeur') : tf('Quatre yeux · remboursement au-delà de {s}', { s: Fr(ARGENT.seuilRemboursement) })} icone="users" tonIcone="violet">
              {qy ? (
                <CarteQuatreYeux d={qy} />
              ) : r.quatreYeux ? (
                <>
                  <Mv k={t('Premier validateur')} v={r.quatreYeux.premier ?? '—'} />
                  <Mv k={t('Second validateur')} v={r.quatreYeux.second ?? t('en attente, d’un autre compte')} />
                  {r.etat === 'a_contresigner' && ouvre('quatreyeux') && (
                    <Link className="btn sm secondary mt10" to={chemin('quatreyeux', { id: r.quatreYeux.id ?? '' })}>
                      {t('Ouvrir la décision')}
                    </Link>
                  )}
                </>
              ) : (
                <Note ton="ink" icone="info">
                  {r.etat === 'echoue' ? tf('Moyen d’origine fermé après {n} refus : revue Finance, puis remboursement vers un moyen au nom du même payeur, avec preuve. Jamais vers le numéro d’un autre payeur, jamais en espèces.', { n: ARGENT.essaisVersement }) : t('Premier : Support ou Médiation. Second : Finance. Le serveur refuse que la même personne valide deux fois, même sous un autre rôle.')}
                </Note>
              )}
              {r.etat === 'echoue' && r.gestes.autreNumero && (
                <button type="button" className="btn primary mt10" onClick={() => setFeuille('autre')}>
                  <Icone nom="shield-check" taille={18} />
                  <span>{t('Proposer l’autre numéro du même titulaire')}</span>
                </button>
              )}
              {r.etat === 'decide' && audessus && premiers.includes(role) && (
                <button type="button" className="btn primary mt10" onClick={() => setFeuille('quatre')}>
                  <Icone nom="users" taille={18} />
                  <span>{t('Valider en premier')}</span>
                </button>
              )}
            </Panel>
          )}
          {r.tentatives.length > 0 && (
            <Panel titre={t('Tentatives vers le moyen d’origine')} icone="refresh-cw">
              {r.tentatives.map((x, i) => (
                <div className="admA-chk" key={i}>
                  <span className={'i ' + (x.issue === 'ok' ? 'g' : x.issue === 'refus' ? 'r' : 'a')}>
                    <Icone nom={x.issue === 'ok' ? 'check' : x.issue === 'refus' ? 'x' : 'hourglass'} taille={15} />
                  </span>
                  <span className="grow">
                    <b>{d.quand(x.le)}</b>
                    <span>
                      {x.vers} · {x.detail}
                    </span>
                  </span>
                </div>
              ))}
            </Panel>
          )}
          <Panel titre={t('Suivi')} icone="list-checks" droite={<Pill ton={ton} sm>{t(nom)}</Pill>}>
            <div className="admA-tl">
              <Frise
                items={[
                  { t: `${d.quand(r.decideLe)} · ${t('remboursement décidé')}`, d: `${r.auteur} · ${r.motif}`, st: 'done' },
                  ...(r.dossier ? [{ t: tf('Dossier {id}', { id: r.dossier }), d: t(r.etat === 'attente' ? 'Exécution à la récupération physique et à l’inspection du retour, jamais à la simple demande' : 'Décision rendue ; effet appliqué par le registre'), st: (r.etat === 'attente' ? 'cur' : 'done') as 'cur' | 'done' }] : []),
                  ...(audessus ? [{ t: t('Validation à quatre yeux'), d: r.quatreYeux?.second ? tf('{a} puis {b}', { a: r.quatreYeux.premier ?? '', b: r.quatreYeux.second }) : t('En attente du second validateur'), st: (r.quatreYeux?.second ? 'done' : r.etat === 'a_contresigner' ? 'cur' : '') as 'done' | 'cur' | '' }] : []),
                  { t: t('Envoyé à l’agrégateur'), d: tf('Clé rfd:{cmd}:1 · vers {vers}', { cmd: r.commande, vers: r.vers }), st: (r.etat === 'en_cours' ? 'cur' : r.etat === 'rembourse' || r.etat === 'echoue' ? 'done' : '') as 'cur' | 'done' | '' },
                  { t: t(r.etat === 'echoue' ? 'Refusé par l’opérateur' : 'Confirmé par l’opérateur'), d: r.rembourseLe ? tf('{quand} · SMS et reçu au client', { quand: d.quand(r.rembourseLe) }) : t('Reçu sur le numéro qui a payé · SMS au client'), st: (r.etat === 'rembourse' ? 'done' : r.etat === 'echoue' ? 'bad' : '') as 'done' | 'bad' | '' },
                ]}
              />
            </div>
          </Panel>
          <Panel titre={t('Origine et montant calculé')} icone="calculator">
            <Mv k={t('Origine')} v={t(NOM_ORIGINE[r.origine][0])} />
            <Mv k={t('Article')} v={Fr(r.articles)} />
            <Mv k={t('Livraison')} v={r.livraison ? Fr(r.livraison) : t('offerte · 0 F payé')} />
            {r.retenues > 0 && <Mv k={t('Garde des 7 jours et renvoi')} v={`− ${Fr(r.retenues)}`} />}
            {r.fraisRendus > 0 && <Mv k={t('Frais Mobile Money du client rendus')} v={`+ ${Fr(r.fraisRendus)}`} />}
            <Mv k={t('Commission')} v={t('aucune · jamais prélevée avant la libération ; annulée si remboursement total')} />
            <Mv k={t('À rembourser')} v={Fr(r.montant)} tot />
            {r.repriseVendeur > 0 && <Hint icone="undo-2">{tf('{m} avancés par BelivaY, repris sur les versements suivants du vendeur fautif.', { m: Fr(r.repriseVendeur) })}</Hint>}
          </Panel>
        </div>
        <div className="col" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
          <div className="hero night" style={{ marginTop: 0 }}>
            <div className="hk">{t('Vers le moyen d’origine')}</div>
            <div className="big">
              {Fr(r.montant).replace(' F', '')}
              <small>F</small>
            </div>
            <div className="hs">{tf('{moyen} · le moyen qui a payé. Jamais réorienté, jamais en espèces.', { moyen: r.moyen })}</div>
            <div className="hline"></div>
            <Mv k={t('Statut opérateur')} v={t(r.etat === 'rembourse' ? 'confirmé' : r.etat === 'en_cours' ? 'en attente de confirmation' : r.etat === 'echoue' ? 'refusé' : 'pas encore envoyé')} />
            <Mv k={t('Auteur')} v={r.auteur} />
            <Mv k={t('Échec éventuel')} v={tf('{n} nouvelles tentatives, puis carte Finance', { n: ARGENT.essaisVersement })} />
            {r.gestes.executer && !audessus && (
              <button type="button" className="btn primary mt10" onClick={() => void executer()}>
                <Icone nom="send" taille={18} />
                <span>{tf('Exécuter vers {moyen}', { moyen: r.moyen })}</span>
              </button>
            )}
            {r.gestes.relever && (
              <button type="button" className="btn secondary mt10" onClick={() => void relever()}>
                <Icone nom="refresh-cw" taille={18} />
                <span>{t('Relever le statut de l’opérateur')}</span>
              </button>
            )}
          </div>
          <Panel titre={t('Liens')} icone="link-2">
            {ouvre('commandes') && <Li icone="shopping-bag" ton="acc" t={tf('Fiche commande {ref}', { ref: r.commande })} s={t('Page de référence de tout échange')} to={chemin('commandes', { ref: r.commande })} />}
            {ouvre('escrow') && <Li icone="landmark" ton="acc" t={t('Registre de la commande')} s={t('Écriture de remboursement et clé')} to={chemin('escrow', { ref: r.commande, s: r.etat === 'rembourse' ? 'libere' : undefined })} />}
            {r.dossier && ouvre('litige') && <Li icone="scale" ton="acc" t={tf('Dossier {id}', { id: r.dossier })} s={t('Décision et preuves')} to={chemin('litige', { id: r.dossier })} />}
            {!ouvre('litige') && r.dossier && <Li icone="lock" ton="ink" t={tf('Dossier {id}', { id: r.dossier })} s={tf('Contenu réservé au Support et à la Médiation ; votre rôle : {role}', { role: t(NOM_ROLE[role]) })} />}
          </Panel>
        </div>
      </div>
      <DecisionMotivee
        ouverte={feuille === 'quatre'}
        fermer={() => setFeuille(null)}
        titre={tf('Rembourser {m} · {id}', { m: Fr(r.montant), id: r.id })}
        action="remboursement.executer"
        objet={r.id}
        resume={tf('Rembourser {m} au client de {cmd} vers {moyen} (au-delà du seuil : second validateur Finance)', { m: Fr(r.montant), cmd: r.commande, moyen: r.moyen })}
        montant={r.montant}
        quatreYeux
        rolesSecond={['finance', 'superviseur']}
        preuves={[{ id: 'c', libelle: tf('Commande {ref}', { ref: r.commande }), route: 'commandes', params: { ref: r.commande } }]}
      />
      <DecisionMotivee
        ouverte={feuille === 'autre'}
        fermer={() => setFeuille(null)}
        titre={tf('Autre numéro du même titulaire · {id}', { id: r.id })}
        action="remboursement.autre_numero"
        objet={r.id}
        resume={tf('Rembourser {m} vers un autre numéro Mobile Money au nom du même titulaire, vérifié par code SMS et nom chez l’opérateur ; moyen d’origine fermé après {n} refus.', { m: Fr(r.montant), n: ARGENT.essaisVersement })}
        montant={r.montant}
        quatreYeux
        rolesSecond={role === 'finance' ? ['superviseur'] : ['finance', 'superviseur']}
        preuves={[{ id: 't', libelle: t('Trois refus de l’opérateur : numéro résilié') }, { id: 'p', libelle: t('Code reçu sur le nouveau numéro et nom du titulaire vérifiés') }]}
      />
    </Ecran>
  )
}
