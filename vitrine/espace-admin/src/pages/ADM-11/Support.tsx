// ADM-P29 · Support et centre d'aide, repris sur le prototype (route('support') : quatre indicateurs, onglets
// Demandes · Réponses types · Centre d'aide, boîte des demandes, conversation, dossier rattaché et délai ; réponses
// types et articles par acteur). Règles : chaque demande est rattachée à une commande, un dossier ou un motif avant
// toute réponse ; la décision se prend dans le dossier, jamais dans la conversation ; un brouillon (réponse type) ne
// part qu'après validation humaine ; jamais de code, de numéro ni d'adresse dans une réponse (CONTENU_INTERDIT) ;
// première réponse sous SUP-DELAI pendant SUP-HORAIRES ; geste commercial à montant fixe (SUP-GESTE), jamais au-delà
// de la commission perçue, remboursé au moyen d'origine, compté dans le budget de croissance ; un article qui cite une
// règle changée est signalé. Le Support répond ; la Direction tient les contenus ; l'Audit lit.
import { useEffect, useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { BoutonAppel } from '../../composants/BoutonAppel'
import { Anneau, Interdit, Kpi, Kv, Li, Note, Panel, Pill, Rebours, Table, Vide, useSurtitre, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { jourDe } from '../../calculs/temps'
import type { ReponseType, TicketSupport } from '../../donnees/domaines/communication'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { useHorloge, useRole, useRouteOuverte } from '../../session'
import { Chargement, ErreurLecture, ESPACES, Onglets, RAISONS, useDates, useDuree } from './commun-s5'
import { REGLES_S5, contenuInterdit, gestePossible } from './regles-s5'
import { TexteTraduisible } from '@client/traduction/Traduisible'

const R = REGLES_S5
type Vue = 'd' | 'r' | 'a'
const VUE: Record<string, Vue> = { '': 'd', reponses: 'r', articles: 'a' }
const ETAT: Record<TicketSupport['etat'], [string, Ton]> = { nouvelle: ['Nouvelle', 'or'], en_cours: ['En cours', 'blue'], resolue: ['Résolue', 'green'] }
const CANAL: Record<TicketSupport['canal'], [string, string, Ton]> = { whatsapp_clients: ['message-circle', 'Messagerie clients', 'green'], whatsapp_vendeurs: ['message-circle', 'Messagerie vendeurs', 'green'], app: ['smartphone', 'Dans l’application', 'acc'], portail: ['monitor', 'Portail', 'ink'] }

export default function Support() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const [p] = useSearchParams()
  const vue = VUE[p.get('s') ?? ''] ?? 'd'
  const tickets = useLecture(() => source.communication.tickets(), [])
  const reponses = useLecture(() => source.communication.reponsesTypes(), [])
  const articles = useLecture(() => source.communication.articles(), [])
  const l = tickets.donnees
  const fonctions = useFonctions([
    { verbe: 'Répondre', n: (l ?? []).filter((x) => x.etat === 'nouvelle').length, unite: ['demande', 'demandes'], icone: 'life-buoy', route: 'support', alerte: (l ?? []).some((x) => x.etat === 'nouvelle') },
    { verbe: 'Suivre', n: (l ?? []).filter((x) => x.etat === 'en_cours').length, unite: ['demande en cours', 'demandes en cours'], icone: 'messages-square', route: 'support' },
    { verbe: 'Mettre à jour', n: (articles.donnees ?? []).filter((a) => a.signale).length, unite: ['article signalé', 'articles signalés'], icone: 'book-open', route: 'support', params: { s: 'articles' } },
  ])
  const actes = (
    <Link className="btn secondary auto" to={chemin('support', { s: 'articles' })}>
      <Icone nom="book-open" taille={18} />
      <span>{t('Centre d’aide')}</span>
    </Link>
  )
  return (
    <Ecran route="support" kicker={surtitre} fonctions={fonctions} actions={actes}>
      <ErreurLecture erreur={tickets.erreur} relire={tickets.relire} />
      {!l ? (
        !tickets.erreur && <Chargement n={3} />
      ) : (
        <>
          <Indicateurs l={l} />
          <Onglets
            aria="Vues du support"
            actif={vue}
            items={[
              { id: 'd', t: 'Demandes', s: '', n: l.filter((x) => x.etat !== 'resolue').length, icone: 'inbox' },
              { id: 'r', t: 'Réponses types', s: 'reponses', n: reponses.donnees?.length ?? null, icone: 'reply' },
              { id: 'a', t: 'Centre d’aide', s: 'articles', n: articles.donnees?.filter((a) => a.signale).length || null, icone: 'book-open' },
            ]}
          />
          {vue === 'd' && <Demandes l={l} reponses={reponses.donnees ?? []} relire={tickets.relire} />}
          {vue === 'r' && <Reponses l={reponses.donnees ?? []} />}
          {vue === 'a' && <Articles l={articles.donnees ?? []} relire={articles.relire} />}
        </>
      )}
    </Ecran>
  )
}

function Indicateurs({ l }: { l: TicketSupport[] }) {
  const { t, tf } = usePreferences()
  const n = useHorloge()
  const auj = (x: number | null) => x !== null && jourDe(x) === jourDe(n)
  const delais = l.filter((x) => auj(x.premiereReponseLe)).map((x) => (x.premiereReponseLe! - x.ouvertLe) / 60000).sort((a, b) => a - b)
  const mediane = delais.length ? Math.round(delais[Math.floor((delais.length - 1) / 2)]) : null
  const gestes = l.filter((x) => x.geste && auj(x.geste.le))
  return (
    <div className="g g4">
      <Kpi k={t('Demandes ouvertes')} v={l.filter((x) => x.etat !== 'resolue').length} s={tf('{a} nouvelles · {b} en cours', { a: l.filter((x) => x.etat === 'nouvelle').length, b: l.filter((x) => x.etat === 'en_cours').length })} icone="inbox" ton="night" />
      <Kpi k={t('Première réponse')} v={mediane ?? '—'} u={mediane === null ? undefined : 'min'} s={tf('médiane du jour · objectif {h} h en heures d’ouverture', { h: R.supportDelaiH })} icone="timer" iton="green" />
      <Kpi k={t('Résolues')} v={l.filter((x) => x.etat === 'resolue').length} s={t('demandes closes, dossier rattaché')} icone="circle-check" iton="green" />
      <Kpi k={t('Gestes commerciaux')} v={gestes.length} s={tf('{m} F aujourd’hui · budget de croissance', { m: F(gestes.reduce((s, x) => s + x.geste!.montant, 0)) })} icone="gift" iton="or" />
    </div>
  )
}

function Demandes({ l, reponses, relire }: { l: TicketSupport[]; reponses: ReponseType[]; relire: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const [p, setP] = useSearchParams()
  const n = useHorloge()
  const x = l.find((y) => y.id === p.get('id')) ?? l[0]
  if (!x) return <Vide icone="inbox" t={t('Aucune demande')} s={t('Les demandes des cinq espaces arrivent ici.')} />
  return (
    <div className="admm-sup">
      <Panel titre={t('Demandes du jour')} icone="inbox" droite={<Pill ton="or" sm>{tf('{n} ouvertes', { n: l.filter((y) => y.etat !== 'resolue').length })}</Pill>}>
        <div className="admm-reqs">
          {l.map((y) => {
            const reste = y.echeance
            return (
              <button key={y.id} type="button" className={'admm-req' + (y.id === x.id ? ' on' : '') + (!y.premiereReponseLe && y.etat !== 'resolue' && reste - n < 0 ? ' late' : '')} aria-current={y.id === x.id ? 'true' : undefined} onClick={() => setP(new URLSearchParams({ id: y.id }), { replace: true })}>
                <div className="row" style={{ gap: 10 }}>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <b className="t14">{y.de}</b>
                      <span className="t12 c3 nw" style={{ marginLeft: 'auto' }}>
                        {d.heure(y.ouvertLe)}
                      </span>
                    </div>
                    <div className="t12 c3">{t(y.role)}</div>
                  </div>
                </div>
                <div className="t13 mt6">{`« ${t(y.sujet)} »`}</div>
                <div className="row wrap mt8" style={{ gap: 6 }}>
                  <Pill ton={ETAT[y.etat][1]} sm>
                    {t(ETAT[y.etat][0])}
                  </Pill>
                  <Pill ton={CANAL[y.canal][2]} sm icone={CANAL[y.canal][0]}>
                    {t(CANAL[y.canal][1])}
                  </Pill>
                  {y.rattache ? (
                    <Pill ton="ink" sm icone="link">
                      {y.rattache.ref}
                    </Pill>
                  ) : (
                    <Pill ton="amber" sm icone="link">
                      {t('à rattacher')}
                    </Pill>
                  )}
                </div>
                {!y.premiereReponseLe && y.etat !== 'resolue' && (
                  <div className="t12 b8 mt6">
                    <Rebours fin={y.echeance} urgent={R.supportAlerteMin * 60_000} critique={15 * 60_000} avant={t('Première réponse : ')} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </Panel>
      <Conversation key={x.id} x={x} reponses={reponses} relire={relire} />
      <Dossier key={'d' + x.id} x={x} relire={relire} />
    </div>
  )
}

function Conversation({ x, reponses, relire }: { x: TicketSupport; reponses: ReponseType[]; relire: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const role = useRole()
  const peut = role === 'support'
  const [texte, setTexte] = useState(x.brouillon?.texte ?? '')
  const [rt, setRt] = useState(x.brouillon?.reponseType ?? '')
  const [msg, setMsg] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => setTexte(x.brouillon?.texte ?? ''), [x.brouillon?.texte])
  const interdit = contenuInterdit(texte)
  const pour = reponses.filter((r) => r.pour.includes(x.espace))
  const geste = async (f: () => Promise<{ ok: boolean; raison?: string }>, ok: string) => {
    setEnvoi(true)
    try {
      const r = await f()
      setMsg(r.ok ? t(ok) : t(RAISONS[r.raison ?? ''] ?? 'Refusé.'))
    } catch {
      setMsg(t('Réponse non envoyée : la messagerie n’a pas répondu. Votre texte est gardé : réessayez.'))
    } finally {
      setEnvoi(false)
      relire()
    }
  }
  const envoyer = async () => {
    const r = await source.communication.preparerReponse(x.id, rt || null, texte)
    if (!r.ok) return { ok: false, raison: r.raison }
    return source.communication.envoyerReponse(x.id)
  }
  return (
    <div>
      <Panel
        titre={`${x.de} · ${t(CANAL[x.canal][1])}`}
        icone={CANAL[x.canal][0]}
        droite={
          <span className="row" style={{ gap: 6 }}>
            {x.etat !== 'resolue' && <BoutonAppel petit classe="btn ghost" nom={x.de} qui={x.role} motif={tf('Demande « {s} » : explication', { s: t(x.sujet) })} objet={x.id} />}
            <Pill ton={ETAT[x.etat][1]} sm>
              {t(ETAT[x.etat][0])}
            </Pill>
          </span>
        }
      >
        <div className="admm-thread">
          {x.messages.map((m, i) => (
            <div key={i} className={'admm-msg ' + (m.de === 'acteur' ? 'in' : m.de === 'support' ? 'out' : 'sys')}>
              <div className="w">{`${m.auteur} · ${d.heure(m.le)}`}</div>
              {m.de === 'acteur' ? <TexteTraduisible texte={m.texte} /> : m.texte}
            </div>
          ))}
        </div>
        {x.etat !== 'resolue' &&
          (peut ? (
            <>
              <label className="s5-champ s5-sel">
                <span>{t('Réponse type')}</span>
                <select value={rt} onChange={(e) => (setRt(e.target.value), setTexte(reponses.find((r) => r.id === e.target.value)?.texte ?? texte))}>
                  <option value="">{t('Réponse libre')}</option>
                  {pour.map((r) => (
                    <option key={r.id} value={r.id}>
                      {`${r.id} · ${t(r.titre)} · v${r.version}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="s5-champ">
                <span>{t('Brouillon (ne part qu’après votre validation)')}</span>
                <textarea rows={5} value={texte} onChange={(e) => setTexte(e.target.value)} aria-invalid={!!interdit} />
              </label>
              {interdit && (
                <p className="e-erreur mt10" role="alert">
                  <Icone nom="triangle-alert" taille={16} />
                  {t(RAISONS[interdit])}
                </p>
              )}
              <div className="row wrap mt12" style={{ gap: 8 }}>
                <button type="button" className="btn primary auto" disabled={envoi || !texte.trim() || !!interdit || !x.rattache} title={!x.rattache ? t(RAISONS.non_rattache) : undefined} onClick={() => void geste(envoyer, 'Réponse envoyée dans le canal de la demande.')}>
                  <Icone nom="send" taille={18} />
                  <span>{t('Envoyer la réponse')}</span>
                </button>
                <button type="button" className="btn secondary auto" disabled={envoi || !texte.trim() || !!interdit} onClick={() => void geste(() => source.communication.preparerReponse(x.id, rt || null, texte), 'Brouillon enregistré.')}>
                  <Icone nom="save" taille={18} />
                  <span>{t('Enregistrer le brouillon')}</span>
                </button>
              </div>
            </>
          ) : (
            <Interdit roles={['support']} quoi="Répondre aux demandes" />
          ))}
        {msg && (
          <Note ton="ink" icone="info" className="mt12" role="status">
            {msg}
          </Note>
        )}
      </Panel>
    </div>
  )
}

function Dossier({ x, relire }: { x: TicketSupport; relire: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const duree = useDuree()
  const n = useHorloge()
  const role = useRole()
  const ouverte = useRouteOuverte()
  const peut = role === 'support'
  const [ref, setRef] = useState(x.proposition?.ref ?? '')
  const [feuille, setFeuille] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const geste = async (f: () => Promise<{ ok: boolean; raison?: string }>, ok: string) => {
    const r = await f()
    setMsg(r.ok ? t(ok) : t(RAISONS[r.raison ?? ''] ?? 'Refusé.'))
    relire()
  }
  const lien = (r: string) => (/^BLV-/.test(r) && ouverte('commandes') ? chemin('commandes', { ref: r }) : /^KYC-/.test(r) && ouverte('kyc') ? chemin('kyc') : /^PQ-/.test(r) && ouverte('paquets') ? chemin('paquets') : /^INC-/.test(r) && ouverte('panne') ? chemin('panne', { id: r }) : null)
  const total = R.supportDelaiH * 60
  const restant = Math.max(0, Math.round((x.echeance - n) / 60000))
  return (
    <div>
      {!x.rattache ? (
        <Panel titre={t('À rattacher')} icone="link">
          {x.proposition && <p className="t13 c2">{tf('Proposé par le serveur : {l}.', { l: x.proposition.libelle })}</p>}
          {peut ? (
            <>
              <label className="s5-champ">
                <span>{t('Commande, dossier ou motif')}</span>
                <input type="text" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="BLV-00008 · KYC-0093 · motif : paiement" />
              </label>
              <div className="row wrap mt12" style={{ gap: 8 }}>
                <button type="button" className="btn primary auto" disabled={!ref.trim()} onClick={() => void geste(() => source.communication.rattacher(x.id, ref), 'Demande rattachée : le dossier est ouvert à côté.')}>
                  <Icone nom="link" taille={18} />
                  <span>{tf('Rattacher à {r}', { r: ref || '…' })}</span>
                </button>
              </div>
            </>
          ) : (
            <Interdit roles={['support']} quoi="Rattacher une demande" />
          )}
        </Panel>
      ) : (
        <Panel titre={tf('Dossier rattaché · {r}', { r: x.rattache.ref })} icone="link">
          <Kv k={t('Dossier')} v={t(x.rattache.libelle)} />
          {x.dossier && <Kv k={t('Moyen de paiement d’origine')} v={x.dossier.moyen} />}
          {x.dossier && <Kv k={t('Commission perçue')} v={`${F(x.dossier.commission)} F`} />}
          {lien(x.rattache.ref) && (
            <Link className="btn secondary mt12" to={lien(x.rattache.ref)!}>
              <Icone nom="folder-open" taille={18} />
              <span>{t('Ouvrir le dossier')}</span>
            </Link>
          )}
        </Panel>
      )}
      <Panel titre={t('Délai de première réponse')} icone="timer" style={{ marginTop: 16 }}>
        {x.premiereReponseLe ? (
          <p className="t13 c2">{tf('Première réponse en {d}, à {h}.', { d: duree(x.premiereReponseLe - x.ouvertLe), h: d.heure(x.premiereReponseLe) })}</p>
        ) : (
          <>
            <Anneau v={restant} max={total} taille={76} libelle={duree(Math.max(0, x.echeance - n))} couleur={restant < R.supportAlerteMin ? 'var(--or)' : 'var(--green)'} aria={t('Temps restant avant la première réponse')} />
            <p className="t13 c2 mt8">{tf('Arrivée à {a} · à répondre avant {b} ({h} h pendant les heures d’ouverture, {o} h – {f} h).', { a: d.heure(x.ouvertLe), b: d.complet(x.echeance), h: R.supportDelaiH, o: R.supportHeures[0], f: R.supportHeures[1] })}</p>
          </>
        )}
      </Panel>
      <Panel titre={t('Geste commercial')} icone="gift" style={{ marginTop: 16 }}>
        {x.geste ? (
          <div className="admm-geste">
            <span className="i">
              <Icone nom="gift" taille={20} />
            </span>
            <div className="grow">
              <b>{tf('Geste commercial · {m} F', { m: F(x.geste.montant) })}</b>
              <span>{tf('Remboursé vers {moyen}, le moyen de paiement d’origine · financé par BelivaY · {p} · {h}', { moyen: x.geste.moyen, p: x.geste.par, h: d.heure(x.geste.le) })}</span>
            </div>
          </div>
        ) : x.dossier && peut && x.etat !== 'resolue' ? (
          <>
            <p className="t13 c2">{gestePossible(x.dossier.commission) ? tf('Montant fixe : {m} F, sans validation hiérarchique, journalisé. Il ne dépasse jamais la commission perçue ({c} F).', { m: F(R.gesteMontant), c: F(x.dossier.commission) }) : t(RAISONS.geste_depasse)}</p>
            <button type="button" className="btn secondary mt12" disabled={!gestePossible(x.dossier.commission)} title={!gestePossible(x.dossier.commission) ? t(RAISONS.geste_depasse) : undefined} onClick={() => setFeuille(true)}>
              <Icone nom="gift" taille={18} />
              <span>{tf('Accorder le geste de {m} F', { m: F(R.gesteMontant) })}</span>
            </button>
          </>
        ) : (
          <p className="t13 c3">{x.dossier ? t('Aucun geste accordé.') : t('Un geste se rattache à une commande payée.')}</p>
        )}
      </Panel>
      {peut && x.etat !== 'resolue' && (
        <div className="row wrap mt16" style={{ gap: 8 }}>
          <button type="button" className="btn secondary auto" disabled={!x.rattache} title={!x.rattache ? t(RAISONS.non_rattache) : undefined} onClick={() => void geste(() => source.communication.resoudre(x.id), 'Demande résolue.')}>
            <Icone nom="circle-check" taille={18} />
            <span>{t('Marquer résolue')}</span>
          </button>
        </div>
      )}
      {msg && (
        <Note ton="ink" icone="info" className="mt12" role="status">
          {msg}
        </Note>
      )}
      <DecisionMotivee
        ouverte={feuille}
        fermer={() => setFeuille(false)}
        titre={tf('Accorder un geste commercial · {id}', { id: x.id })}
        resume={x.dossier ? tf('{m} F remboursés vers {moyen} (moyen d’origine), financés par BelivaY, comptés dans le budget de croissance.', { m: F(R.gesteMontant), moyen: x.dossier.moyen }) : ''}
        libelle="Accorder le geste"
        icone="gift"
        envoyer={async (m) => {
          const r = await source.communication.accorderGeste(x.id, m)
          relire()
          return r.ok ? null : t(RAISONS[r.raison] ?? 'Refusé.')
        }}
      />
    </div>
  )
}

function Reponses({ l }: { l: ReponseType[] }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  return (
    <div className="mt16">
      <Table
        legende={t('Réponses types')}
        rows={l}
        cle={(x) => x.id}
        cols={[
          { k: 'c', t: t('Réponse type'), main: true, rendu: (x) => <><b>{t(x.titre)}</b><div className="t2 mono">{x.id}</div></> },
          { k: 'p', t: t('Pour'), rendu: (x) => x.pour.map((e) => t(ESPACES.find((y) => y.id === e)!.t)).join(', ') },
          { k: 'r', t: t('Règles'), hideM: true, rendu: (x) => <span className="mono t12">{x.regles.join(' · ')}</span> },
          { k: 'v', t: t('Version'), rendu: (x) => `v${x.version} · ${d.court(x.majLe)}` },
          { k: 'u', t: t('Utilisée · 30 j'), cls: 'r', rendu: (x) => x.utilisee30j },
        ]}
        pied={
          <>
            <span>{tf('{n} réponses types', { n: l.length })}</span>
            <span>{t('Chacune renvoie à la règle qu’elle explique')}</span>
          </>
        }
      />
    </div>
  )
}

function Articles({ l, relire }: { l: Awaited<ReturnType<typeof source.communication.articles>>; relire: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const role = useRole()
  const peut = role === 'support' || role === 'superviseur'
  const [msg, setMsg] = useState<string | null>(null)
  const signales = l.filter((a) => a.signale)
  return (
    <div className="g g21">
      <Panel titre={t('Centre d’aide · articles par acteur')} icone="book-open">
        <div className="admm-acts">
          {ESPACES.map((e) => (
            <div key={e.id} className="admm-act">
              <span className="i">
                <Icone nom={e.icone} taille={18} />
              </span>
              <b>{l.filter((a) => a.pour === e.id).length}</b>
              <span>{t(e.t)}</span>
            </div>
          ))}
        </div>
        <div className="divide">{t('Articles')}</div>
        {l.map((a) => (
          <Li
            key={a.id}
            icone={a.signale ? 'triangle-alert' : 'circle-check'}
            ton={a.signale ? 'red' : 'green'}
            t={`${t(ESPACES.find((e) => e.id === a.pour)!.t)} · ${t(a.titre)}`}
            s={a.signale ? tf('{r} a une nouvelle version : article à mettre à jour', { r: a.signale }) : tf('{r} · à jour depuis le {d}', { r: a.regles.join(', '), d: d.court(a.majLe) })}
            droite={
              a.signale && peut ? (
                <button type="button" className="btn secondary sm" onClick={() => void source.communication.mettreAJourArticle(a.id).then((r) => (setMsg(r.ok ? t('Article marqué à jour et journalisé.') : t(RAISONS[r.raison] ?? 'Refusé.')), relire()))}>
                  <Icone nom="check" taille={16} />
                  {t('Marquer à jour')}
                </button>
              ) : undefined
            }
          />
        ))}
        {msg && (
          <Note ton="ink" icone="info" className="mt12" role="status">
            {msg}
          </Note>
        )}
      </Panel>
      <Panel titre={t('Signalés à mettre à jour')} icone="triangle-alert">
        {signales.length ? signales.map((a) => <Li key={a.id} icone="triangle-alert" ton="red" t={t(a.titre)} s={a.signale!} />) : <p className="t13 c3">{t('Aucun article à mettre à jour : aucune règle citée n’a changé depuis.')}</p>}
      </Panel>
    </div>
  )
}
