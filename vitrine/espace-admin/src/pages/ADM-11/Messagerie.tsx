// ADM-P27 · Messagerie et notifications, repris sur le prototype (route('messagerie') : quatre indicateurs, onglets
// Journal des envois · Modèles · Budget SMS · Diffusions, carte du message critique non délivré, journal, envois par
// canal, garde-fous ; états échec critique, budget, modèles, diffusion générale). Règles : un événement, un seul envoi
// (clé d'idempotence, renvoyer réutilise la même clé) ; code de retrait jamais affiché ; destinataires masqués ;
// aucune promotion par SMS (push seulement, 9 h – 20 h) ; diffusion au-delà du seuil de destinataires à quatre yeux ;
// un SMS en échec n'est pas facturé. La Finance n'y voit que les coûts (onglet Budget SMS).
import { useMemo, useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { AucunResultat, Banniere, BarresH, Frise, Hint, Interdit, Kpi, Kv, Li, Note, Panel, Pill, Rebours, Recherche, Table, Tg, Vide, useSurtitre, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { jourDe, yaounde } from '../../calculs/temps'
import type { BudgetSms, Canal, Envoi, Espaces } from '../../donnees/domaines/communication'
import { source } from '../../donnees/source'
import { useLecture, type Lecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, useRole, useRouteOuverte } from '../../session'
import { CANAL, Chargement, ESPACES, ErreurLecture, Onglets, PillCanal, QuatreYeux, RAISONS, useDates } from './commun-s5'
import { REGLES_S5, contenuInterdit, coutParCommande, dansHeuresPromo, diffusionQuatreYeux, partiesSms, tauxDelivrance } from './regles-s5'

const R = REGLES_S5
type Vue = 'j' | 'e' | 'b' | 'm' | 'd'
const VUE: Record<string, Vue> = { '': 'j', echec: 'e', budget: 'b', modeles: 'm', diffusion: 'd' }
const STATUT: Record<Envoi['statut'], [string, Ton]> = { delivre: ['Délivré', 'green'], echec: ['Échec', 'red'], en_cours: ['En cours', 'blue'], enregistre: ['Enregistré', 'ink'] }
export default function Messagerie() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const role = useRole()
  const finance = role === 'finance'
  const [p] = useSearchParams()
  const vue: Vue = finance ? 'b' : (VUE[p.get('s') ?? ''] ?? 'j')
  const droit = useDroit('messagerie')
  const envois = useLecture(() => (finance ? Promise.resolve([] as Envoi[]) : source.communication.envois()), [finance])
  const budget = useLecture(() => source.communication.budgetSms(), [])
  const modeles = useLecture(() => (finance ? Promise.resolve([]) : source.communication.modeles().catch(() => [])), [finance])
  const e = envois.donnees ?? []
  const critiques = e.filter((x) => x.criticite === 1 && x.statut === 'echec')
  const fonctions = useFonctions([
    !finance && { verbe: 'Renvoyer', n: critiques.length, unite: ['SMS critique', 'SMS critiques'], icone: 'send', route: 'messagerie', params: { s: 'echec' }, alerte: true },
    !finance && { verbe: 'Diffuser', n: null, unite: ['message', 'messages'], icone: 'megaphone', route: 'messagerie', params: { s: 'diffusion' }, geste: true },
    { verbe: 'Suivre', n: e.filter((x) => x.statut === 'echec').length, unite: ['envoi échoué', 'envois échoués'], icone: 'wallet', route: 'messagerie', params: { s: 'budget' } },
  ])
  const actes =
    !finance && droit.acces !== 'lecture' ? (
      <Link className="btn primary auto" to={chemin('messagerie', { s: 'diffusion' })}>
        <Icone nom="megaphone" taille={18} />
        <span>{t('Nouvelle diffusion')}</span>
      </Link>
    ) : undefined
  return (
    <Ecran route="messagerie" kicker={surtitre} fonctions={fonctions} actions={actes}>
      <ErreurLecture erreur={envois.erreur} relire={envois.relire} quoi="Journal des envois" />
      {!finance && !envois.donnees && !envois.erreur ? (
        <Chargement n={3} />
      ) : (
        <>
          {!finance && <Indicateurs envois={e} commandesJour={budget.donnees?.commandesJour ?? null} />}
          {finance ? (
            <span className="mt16" />
          ) : (
            <Onglets
              aria="Vues de la messagerie"
              actif={vue === 'e' ? 'j' : vue}
              items={[
                { id: 'j', t: 'Journal des envois', s: '', icone: 'list' },
                { id: 'm', t: 'Modèles', s: 'modeles', n: modeles.donnees?.length ?? null, icone: 'file-text' },
                { id: 'b', t: 'Budget SMS', s: 'budget', icone: 'wallet' },
                { id: 'd', t: 'Diffusions', s: 'diffusion', icone: 'megaphone' },
              ]}
            />
          )}
          {vue === 'j' && <Journal envois={e} critiques={critiques} />}
          {vue === 'e' && <Echec envois={e} relire={envois.relire} />}
          {vue === 'b' && <Budget l={budget} />}
          {vue === 'm' && <Modeles l={modeles.donnees ?? []} />}
          {vue === 'd' && <Diffusions />}
        </>
      )}
    </Ecran>
  )
}

function Indicateurs({ envois, commandesJour }: { envois: Envoi[]; commandesJour: number | null }) {
  const { t, tf } = usePreferences()
  const n = useHorloge()
  const jour = envois.filter((x) => jourDe(x.le) === jourDe(n))
  const total = jour.reduce((s, x) => s + x.destinataires, 0)
  const sms = jour.filter((x) => x.canaux.includes('sms') && x.statut !== 'enregistre')
  const delivres = sms.filter((x) => x.statut === 'delivre').length
  const taux = tauxDelivrance(delivres, sms.length)
  const cout = jour.reduce((s, x) => s + x.cout, 0)
  const parCmd = commandesJour ? coutParCommande(cout, commandesJour) : null
  const crit = jour.filter((x) => x.criticite === 1 && x.statut === 'echec')
  const parCanal = (c: Canal) => jour.filter((x) => x.canaux.includes(c)).reduce((s, x) => s + x.destinataires, 0)
  return (
    <div className="g g4">
      <Kpi k={t('Envois aujourd’hui')} v={F(total)} s={tf('{p} push · {s} SMS · {a} dans l’application', { p: parCanal('push'), s: parCanal('sms'), a: parCanal('app') })} icone="send" ton="night" />
      <Kpi k={t('SMS délivrés')} v={taux === null ? '—' : String(Math.round(taux * 10) / 10).replace('.', ',')} u={taux === null ? undefined : '%'} s={tf('{d} sur {n} · alerte sous {a} %', { d: delivres, n: sms.length, a: R.delivranceAlertePct })} icone="signal" iton={taux !== null && taux < R.delivranceAlertePct ? 'amber' : 'green'} />
      <Kpi k={t('Coût SMS par commande')} v={parCmd === null ? '—' : parCmd} u="F" s={tf('{c} F pour {n} commandes · budget {b} F', { c: F(cout), n: commandesJour ?? 0, b: R.smsBudgetCommande })} icone="coins" iton={parCmd !== null && parCmd > R.smsBudgetCommande ? 'red' : 'green'} />
      <Kpi k={t('Critique non délivré')} v={crit.length} s={crit[0] ? tf('{e} · {r}', { e: t(crit[0].evenement), r: crit[0].objet }) : t('aucun')} icone="siren" iton={crit.length ? 'red' : 'green'} to={crit[0] ? chemin('messagerie', { s: 'echec', id: crit[0].id }) : undefined} />
    </div>
  )
}

// ── Journal ────────────────────────────────────────────────────────────────────────────────────────────────────────
function Journal({ envois, critiques }: { envois: Envoi[]; critiques: Envoi[] }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const [p, setP] = useSearchParams()
  const q = p.get('q') ?? ''
  const canal = (p.get('canal') ?? '') as Canal | ''
  const statut = p.get('statut') ?? ''
  const c1 = p.get('c1') === '1'
  const poser = (k: string, v: string | null) => {
    const n = new URLSearchParams(p)
    if (v) n.set(k, v)
    else n.delete(k)
    setP(n, { replace: true })
  }
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const l = envois.filter((x) => (!q || norm(`${x.objet} ${x.modele} ${x.cle} ${x.evenement}`).includes(norm(q))) && (!canal || x.canaux.includes(canal)) && (!statut || x.statut === statut) && (!c1 || x.criticite === 1))
  const parCanal = (c: Canal) => envois.filter((x) => x.canaux.includes(c)).reduce((s, x) => s + x.destinataires, 0)
  const total = envois.reduce((s, x) => s + x.destinataires, 0)
  const gratuits = total - parCanal('sms')
  return (
    <>
      {critiques.map((c) => (
        <Link key={c.id} className="admm-crit" to={chemin('messagerie', { s: 'echec', id: c.id })}>
          <Icone nom="siren" taille={20} />
          <div className="grow">
            <b>{tf('1 message critique non délivré · {e}', { e: t(c.evenement) })}</b>
            <span>
              {`${c.objet} · ${tf('{n} essais en échec', { n: c.essais.filter((x) => !x.ok).length })} · `}
              {c.echeanceCarte && <Rebours fin={c.echeanceCarte} urgent={600_000} critique={180_000} avant={t('reste ')} />}
            </span>
          </div>
          <Pill ton="solid-or" icone="rotate-cw">
            {t('Renvoyer')}
          </Pill>
        </Link>
      ))}
      <div className="mt16">
        <Table
          legende={t('Journal des envois')}
          rows={l}
          cle={(x) => x.id}
          ligneCls={(x) => (x.statut === 'echec' ? 'bad' : undefined)}
          vide={<AucunResultat effacer={() => setP(new URLSearchParams(), { replace: true })} />}
          outils={
            <>
              <Recherche q={q} setQ={(v) => poser('q', v || null)} placeholder={t('Commande, modèle, clé…')} aria={t('Rechercher un envoi')} />
              <label className="flt">
                <Icone nom="send" taille={15} />
                <select value={canal} onChange={(e) => poser('canal', e.target.value || null)} aria-label={t('Canal')}>
                  <option value="">{t('Canal : tous')}</option>
                  {(Object.keys(CANAL) as Canal[]).map((c) => (
                    <option key={c} value={c}>
                      {t(CANAL[c][1])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flt">
                <Icone nom="circle-check" taille={15} />
                <select value={statut} onChange={(e) => poser('statut', e.target.value || null)} aria-label={t('Statut')}>
                  <option value="">{t('Statut : tous')}</option>
                  {(Object.keys(STATUT) as Envoi['statut'][]).map((s) => (
                    <option key={s} value={s}>
                      {t(STATUT[s][0])}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className={'flt' + (c1 ? ' on' : '')} aria-pressed={c1} onClick={() => poser('c1', c1 ? null : '1')}>
                <Icone nom="siren" taille={15} />
                {t('Criticité 1')}
              </button>
              <span className="sp"></span>
              <span className="lock">
                <Icone nom="eye-off" taille={15} /> {t('Destinataires masqués · code jamais affiché')}
              </span>
            </>
          }
          cols={[
            { k: 'h', t: t('Heure'), rendu: (x) => d.heure(x.le) },
            { k: 'e', t: t('Événement · destinataire masqué'), main: true, rendu: (x) => <><b>{t(x.evenement)}</b><div className="t2">{`${x.objet} · ${x.destinataire}`}</div></> },
            { k: 'c', t: t('Canal'), rendu: (x) => <span className="row wrap" style={{ gap: 4 }}>{x.canaux.map((c) => <PillCanal key={c} c={c} />)}</span> },
            { k: 'm', t: t('Modèle'), hideM: true, rendu: (x) => <span className="mono">{`${x.modele} v${x.version}`}</span> },
            { k: 'st', t: t('Statut'), rendu: (x) => (x.statut === 'echec' ? <Link to={chemin('messagerie', { s: 'echec', id: x.id })}><Pill ton="red" sm>{t('Échec · opérateur')}</Pill></Link> : <Pill ton={STATUT[x.statut][1]} sm>{x.destinataires > 1 && x.delivres !== null ? tf('Délivré {d} / {n}', { d: x.delivres, n: x.destinataires }) : t(STATUT[x.statut][0])}</Pill>) },
            { k: 'f', t: t('Coût'), cls: 'r', rendu: (x) => `${F(x.cout)} F` },
            { k: 'k', t: t('Clé d’idempotence'), hideM: true, rendu: (x) => <span className="mono t12 c3">{x.cle}</span> },
          ]}
          pied={
            <>
              <span>{tf('{n} envois affichés sur {t} · chaque envoi est relié à son événement d’origine', { n: l.length, t: envois.length })}</span>
              <span>{tf('Conservation {m} mois', { m: R.conservationMois })}</span>
            </>
          }
        />
      </div>
      <div className="g g2">
        <Panel titre={t('Envois du jour par canal')} icone="chart-pie">
          <BarresH
            lignes={(['push', 'sms', 'app', 'email'] as Canal[]).map((c) => ({ l: t(CANAL[c][1]), v: parCanal(c), max: Math.max(1, total), r: String(parCanal(c)), ton: c === 'sms' ? '' : 'acc' }))}
          />
          <p className="t12 c3 mt8">{tf('{p} % des envois du jour sont gratuits. Le SMS reste réservé au paiement, au code, aux rappels, à l’incident et au remerciement.', { p: total ? Math.round((gratuits / total) * 100) : 0 })}</p>
        </Panel>
        <Panel titre={t('Garde-fous')} icone="shield-check">
          <Li icone="key-round" ton="acc" t={t('Un événement, un seul envoi')} s={t('La clé d’idempotence empêche tout second SMS pour le même événement')} />
          <Li icone="eye-off" ton="acc" t={t('Code de retrait jamais affiché')} s={t('Ni dans la console, ni dans le journal, ni dans les modèles')} />
          <Li icone="message-square-off" ton="red" t={t('Aucune promotion par SMS')} s={t('Refusée par le serveur, quel que soit le rôle')} />
          <Li icone="lock" ton="ink" t={t('Messages entre acteurs')} s={t('Seulement dans le dossier ou la commande · aucun numéro personnel')} />
        </Panel>
      </div>
    </>
  )
}

// ── Échec critique ─────────────────────────────────────────────────────────────────────────────────────────────────
function Echec({ envois, relire }: { envois: Envoi[]; relire: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const [p] = useSearchParams()
  const droit = useDroit('messagerie')
  const role = useRole()
  const ouverte = useRouteOuverte()
  const e = envois.find((x) => x.id === p.get('id')) ?? envois.find((x) => x.statut === 'echec' && x.criticite === 1)
  const [msg, setMsg] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  if (!e) return <Vide icone="circle-check" t={t('Aucun message critique en échec')} s={t('Un SMS de criticité 1 non délivré est retenté, puis remonte ici.')} action={<Link className="btn secondary" to={chemin('messagerie')}>{t('Journal des envois')}</Link>} />
  const peut = droit.acces !== 'lecture' && (role === 'superviseur' || role === 'support')
  const renvoyer = async () => {
    setEnvoi(true)
    const r = await source.communication.renvoyer(e.id)
    setMsg(r.ok ? t('Renvoyé avec la même clé : délivré. Le client ne reçoit jamais deux SMS.') : t(RAISONS[r.raison] ?? 'Refusé.'))
    setEnvoi(false)
    relire()
  }
  const commande = /^BLV-/.test(e.objet)
  return (
    <>
      {e.statut === 'echec' && (
        <Banniere ton="red" icone="siren" className="mt16" role="alert">
          <b>{t('1 message critique non délivré.')}</b> {`${t(e.evenement)} · ${e.objet}`}
        </Banniere>
      )}
      {msg && (
        <Note ton="ink" icone="info" className="mt12" role="status">
          {msg}
        </Note>
      )}
      <div className="g g21">
        <div>
          <div className={'hero ' + (e.statut === 'echec' ? 'red' : 'green')} style={{ marginTop: 0 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="hk">{e.statut === 'echec' ? tf('Criticité {c} · non délivré', { c: e.criticite }) : t('Délivré')}</span>
              {e.echeanceCarte && e.statut === 'echec' && <Rebours fin={e.echeanceCarte} urgent={600_000} critique={180_000} echu={t('Carte en retard')} />}
            </div>
            <div className="ht">{`${t(e.evenement)} · ${e.objet}`}</div>
            <div className="hs">{tf('{dest} · essais à {h}. Le code s’affiche déjà dans son application, en plein écran.', { dest: e.destinataire, h: e.essais.map((x) => d.heure(x.le)).join(', ') })}</div>
            <div className="row wrap mt14" style={{ gap: 8 }}>
              {e.statut === 'echec' &&
                (peut ? (
                  <button type="button" className="btn primary auto" disabled={envoi} onClick={() => void renvoyer()}>
                    <Icone nom="rotate-cw" taille={18} />
                    <span>{t('Renvoyer maintenant')}</span>
                  </button>
                ) : (
                  <Interdit roles={['superviseur', 'support']} quoi="Renvoyer un message" />
                ))}
              {commande && ouverte('commandes') && (
                <Link className="btn secondary auto" to={chemin('commandes', { ref: e.objet })}>
                  <Icone nom="shopping-bag" taille={18} />
                  <span>{t('Ouvrir la commande')}</span>
                </Link>
              )}
            </div>
          </div>
          <Panel titre={t('Le message')} icone="message-square" style={{ marginTop: 16 }}>
            <div className="admm-sms">
              <div className="from">{`BelivaY · ${e.canaux.map((c) => t(CANAL[c][1])).join(' + ')} · ${e.modele} v${e.version}`}</div>
              {e.texte}
            </div>
            <Kv k={t('Clé d’idempotence')} v={<span className="mono">{e.cle}</span>} />
            <Kv k={t('Validité')} v={tf('{h} heures · criticité {c}', { h: R.validiteH[e.criticite - 1], c: e.criticite })} />
            <Kv k={t('Coût')} v={e.statut === 'delivre' ? `${F(e.cout)} F` : t('0 F tant qu’il n’est pas délivré')} />
            <Hint icone="key-round">{tf('Renvoyer relance le même envoi, avec la même clé : si l’un des essais finit par arriver, le client ne reçoit jamais deux SMS. Le client peut demander {n} renvois par 24 heures.', { n: R.codeRenvois24h })}</Hint>
          </Panel>
        </div>
        <div>
          <Panel titre={t('Essais')} icone="history">
            <Frise items={e.essais.map((x) => ({ t: x.ok ? t('Délivré') : t('Échec'), d: `${d.heure(x.le)} · ${t(x.detail)}`, st: x.ok ? 'done' : 'bad' }))} />
          </Panel>
          <Panel titre={t('Autour de ce message')} icone="link" style={{ marginTop: 16 }}>
            <Li icone="smartphone" ton="green" t={t('Code visible dans l’application')} s={t('Bouton plein écran, à montrer au comptoir')} />
            {ouverte('support') && <Li icone="message-circle" ton="acc" t={t('Demandes au support')} s={t('Une demande « code non reçu » se rattache à la commande')} to={chemin('support')} />}
            {ouverte('panne') && <Li icone="siren" ton="amber" t={t('Panne et mode papier')} s={t('Un incident en cours peut expliquer un refus de l’opérateur')} to={chemin('panne')} />}
            <Li icone="package-check" ton="acc" t={t('Le gérant ne voit jamais le code')} s={t('Le client le saisit lui-même au comptoir')} />
          </Panel>
        </div>
      </div>
    </>
  )
}

// ── Budget SMS ─────────────────────────────────────────────────────────────────────────────────────────────────────
function Budget({ l }: { l: Lecture<BudgetSms> }) {
  const { t, tf } = usePreferences()
  const ouverte = useRouteOuverte()
  const b = l.donnees
  if (!b) return l.erreur ? <ErreurLecture erreur={l.erreur} relire={l.relire} /> : <Chargement n={2} />
  const sms = b.jours.reduce((s, x) => s + x.sms, 0)
  const cout = b.jours.reduce((s, x) => s + x.cout, 0)
  const max = Math.max(...b.jours.map((x) => x.cout))
  const parCmd = coutParCommande(cout, b.commandesMois)
  return (
    <>
      <div className="g g4">
        <Kpi k={tf('SMS de {m}', { m: t(b.mois) })} v={F(sms)} s={tf('{n} commandes', { n: b.commandesMois })} icone="message-square" />
        <Kpi k={t('Coût du mois')} v={F(cout)} u="F" s={tf('soit {c} F par commande', { c: parCmd ?? '—' })} icone="wallet" iton={parCmd !== null && parCmd > R.smsBudgetCommande ? 'red' : 'or'} />
        <Kpi k={t('Messages gratuits')} v={Math.round((b.gratuits / (b.gratuits + sms)) * 100)} u="%" s={tf('{n} push et messages dans l’application', { n: F(b.gratuits) })} icone="bell" iton="green" />
        <Kpi k={t('Promotions par SMS')} v="0" s={t('interdit, bloqué par le serveur')} icone="message-square-off" iton="red" />
      </div>
      <div className="g g21">
        <Panel titre={tf('Coût SMS par jour · {m}', { m: t(b.mois) })} icone="chart-column">
          <BarresH lignes={b.jours.map((x) => ({ l: x.jour, v: x.cout, max, r: `${F(x.cout)} F`, ton: 'acc' as const }))} largeurLibelle={40} largeurValeur={80} />
          <p className="t12 c3 mt4">{tf('En francs, à {p} F le SMS délivré ; les échecs ne sont pas facturés.', { p: R.smsPrix })}</p>
        </Panel>
        <Panel titre={t('Seuils et paramètres')} icone="gauge">
          <Kv k={t('SMS payants par commande')} v={tf('{n} au plus', { n: R.smsMaxCommande })} />
          <Kv k={t('Budget SMS par commande')} v={tf('{n} F · alerte au-delà', { n: R.smsBudgetCommande })} />
          <Kv k={t('Taux de délivrance')} v={tf('alerte sous {n} %', { n: R.delivranceAlertePct })} />
          <Kv k={t('Prix d’un SMS')} v={tf('{n} F · fournisseur principal', { n: R.smsPrix })} />
          <Kv k={t('Fournisseur de secours')} v={t('à trancher · SMS-SECOURS')} />
          {ouverte('parametrage') && (
            <Link className="btn secondary mt12" to={chemin('parametrage', { q: 'SMS' })}>
              <Icone nom="sliders-horizontal" taille={18} />
              <span>{t('Ajuster les seuils')}</span>
            </Link>
          )}
        </Panel>
      </div>
      <div className="g g2">
        <Panel titre={tf('SMS par modèle · {m}', { m: t(b.mois) })} icone="file-text">
          <BarresH lignes={b.parModele.map((x) => ({ l: t(x.libelle), v: x.sms, max: Math.max(...b.parModele.map((y) => y.sms)), r: `${F(x.cout)} F` }))} largeurLibelle={170} largeurValeur={80} />
        </Panel>
        <Panel titre={t('Le parcours d’une commande')} icone="route">
          <Li icone="message-square" ton="or" t={tf('{n} SMS payants au plus', { n: R.smsMaxCommande })} s={t('Paiement protégé, code de retrait, rappels J+2 et J+4, incident, remerciement')} />
          <Li icone="bell" ton="acc" t={t('Toute la progression en push, gratuite')} s={t('Préparée, en route, arrivée au relais ; repli en SMS seulement si critique')} />
          <Li icone="moon" ton="ink" t={t('Nuit calme')} s={tf('Aucune notification non critique de {a} h à {b} h · {n} au plus par 24 h', { a: R.nuit[0], b: R.nuit[1], n: R.pushMax24h })} />
        </Panel>
      </div>
    </>
  )
}

// ── Modèles ────────────────────────────────────────────────────────────────────────────────────────────────────────
function Modeles({ l }: { l: Awaited<ReturnType<typeof source.communication.modeles>> }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const ouverte = useRouteOuverte()
  return (
    <div className="g g21">
      <div>
        <Table
          legende={t('Modèles de messages')}
          rows={l}
          cle={(x) => x.id}
          outils={
            <>
              <span className="sp"></span>
              {ouverte('modeles') && (
                <Link className="btn secondary sm" to={chemin('modeles')}>
                  <Icone nom="file-pen" taille={16} />
                  {t('Gérer les modèles')}
                </Link>
              )}
            </>
          }
          cols={[
            { k: 'm', t: t('Modèle · événement'), main: true, rendu: (x) => <>{ouverte('modeles') ? <Link to={chemin('modeles', { id: x.id })}><b>{x.id}</b></Link> : <b>{x.id}</b>}<div className="t2">{`${t(x.nom)} · ${t(x.evenement)}`}</div></> },
            { k: 'c', t: t('Canaux'), rendu: (x) => <span className="row wrap" style={{ gap: 4 }}>{x.canaux.map((c) => <PillCanal key={c} c={c} />)}</span> },
            { k: 'cr', t: t('Criticité'), rendu: (x) => <Pill ton={x.criticite === 1 ? 'red' : x.criticite === 2 ? 'amber' : 'ink'} sm>{tf('Criticité {c}', { c: x.criticite })}</Pill> },
            { k: 'v', t: t('Version'), hideM: true, rendu: (x) => `v${x.versions.at(-1)!.version} · ${d.court(x.versions.at(-1)!.le)}` },
            { k: 'l', t: t('Langues'), hideM: true, rendu: () => t('Français, anglais') },
          ]}
          pied={
            <>
              <span>{tf('{n} modèles · chaque modification crée une version', { n: l.length })}</span>
              <span>{tf('Validité : criticité 1 · {a} h ; 2 · {b} h ; 3 · {c} h', { a: R.validiteH[0], b: R.validiteH[1], c: R.validiteH[2] })}</span>
            </>
          }
        />
      </div>
      <Panel titre={t('Règles d’envoi')} icone="list-checks">
        <Kv k={t('Essais d’un message critique')} v={t('1, 5 et 15 min, puis repli')} />
        <Kv k={t('Repli d’un push critique non ouvert')} v={t('SMS après 10 min')} />
        <Kv k={t('Notifications par 24 h')} v={tf('{n} au plus', { n: R.pushMax24h })} />
        <Kv k={t('Nuit')} v={tf('rien de non critique de {a} h à {b} h', { a: R.nuit[0], b: R.nuit[1] })} />
        <Kv k={t('Promotions')} v={tf('push {n} par semaine au plus, {a} h – {b} h ; jamais de SMS', { n: R.promoParSemaine, a: R.promoHeures[0], b: R.promoHeures[1] })} />
      </Panel>
    </div>
  )
}

// ── Diffusions ────────────────────────────────────────────────────────────────────────────────────────────────────
function Diffusions() {
  const { t, tf } = usePreferences()
  const d = useDates()
  const n = useHorloge()
  const droit = useDroit('messagerie')
  const role = useRole()
  const peut = droit.acces !== 'lecture' && (role === 'superviseur' || role === 'support')
  const liste = useLecture(() => source.communication.diffusions(), [])
  const [objet, setObjet] = useState('')
  const [texte, setTexte] = useState('')
  const [espaces, setEspaces] = useState<Espaces[]>(['client'])
  const [zones, setZones] = useState<string[]>(R.zones.map((z) => z.code))
  const [canaux, setCanaux] = useState<Canal[]>(['push', 'app'])
  const [promotion, setPromotion] = useState(false)
  const demain = jourDe(n + 86_400_000)
  const [quand, setQuand] = useState(`${demain}T10:00`)
  const [feuille, setFeuille] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const audience = useLecture(() => source.communication.audience(espaces, zones, promotion), [espaces.join(), zones.join(), promotion])
  const nb = audience.donnees ?? 0
  const programmee = useMemo(() => {
    const [j, h] = quand.split('T')
    const [a, m, jj] = j.split('-').map(Number)
    const [hh, mm] = (h ?? '10:00').split(':').map(Number)
    return yaounde(a, m, jj, hh, mm)
  }, [quand])
  const interdit = contenuInterdit(texte) ?? contenuInterdit(objet)
  const parties = partiesSms(texte)
  const bascule = <T,>(l: T[], x: T) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x])
  const problemes = [
    !objet.trim() && 'objet',
    !texte.trim() && 'vide',
    interdit && 'contenu',
    promotion && canaux.includes('sms') && 'sms_promo',
    promotion && !dansHeuresPromo(programmee) && 'heures_promo',
    programmee < n - 60_000 && 'passe',
  ].filter(Boolean) as string[]
  const quatre = diffusionQuatreYeux(nb)
  return (
    <>
      {msg && (
        <Note ton="ink" icone="info" className="mt12" role="status">
          {msg}
        </Note>
      )}
      <div className="g g21">
        <Panel titre={t('Diffusion générale')} icone="send">
          {!peut ? (
            <Interdit roles={['superviseur', 'support']} quoi="Diffusion générale" />
          ) : (
            <>
              <label className="s5-champ">
                <span>{t('Objet')}</span>
                <input type="text" value={objet} onChange={(e) => setObjet(e.target.value)} maxLength={120} />
              </label>
              <fieldset className="s5-champ" style={{ border: 0, padding: 0 }}>
                <legend className="b8 t13">{t('Destinataires')}</legend>
                <div className="chips">
                  {ESPACES.map((e) => (
                    <button key={e.id} type="button" className={'chip' + (espaces.includes(e.id) ? ' on' : '')} aria-pressed={espaces.includes(e.id)} onClick={() => setEspaces(bascule(espaces, e.id))}>
                      <Icone nom={e.icone} taille={15} />
                      {t(e.t)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="s5-champ" style={{ border: 0, padding: 0 }}>
                <legend className="b8 t13">{t('Zones')}</legend>
                <div className="chips">
                  {R.zones.map((z) => (
                    <button key={z.code} type="button" className={'chip' + (zones.includes(z.code) ? ' on' : '')} aria-pressed={zones.includes(z.code)} onClick={() => setZones(bascule(zones, z.code))}>
                      <Icone nom="map-pin" taille={15} />
                      {`${z.code} ${z.nom}`}
                    </button>
                  ))}
                </div>
                <span className="t12 c3">{promotion ? tf('{n} destinataires qui ont accepté les notifications « Promotions »', { n: F(nb) }) : tf('{n} destinataires', { n: F(nb) })}</span>
              </fieldset>
              <div className="s5-champ">
                <span>{t('Promotion')}</span>
                <span className="s5-ligne">
                  <Tg on={promotion} changer={(v) => (setPromotion(v), v && setCanaux(canaux.filter((c) => c !== 'sms')))} libelle={t('Message de promotion')} />
                  <span className="t13 c3">{tf('push seulement, {a} h – {b} h, {n} par semaine au plus', { a: R.promoHeures[0], b: R.promoHeures[1], n: R.promoParSemaine })}</span>
                </span>
              </div>
              <fieldset className="s5-champ" style={{ border: 0, padding: 0 }}>
                <legend className="b8 t13">{t('Canaux, gratuits d’abord')}</legend>
                <div className="admm-chk">
                  {(['push', 'app', 'email', 'sms'] as Canal[]).map((c) => (
                    <label key={c} className="e-case">
                      <input type="checkbox" checked={canaux.includes(c)} disabled={promotion && c === 'sms'} onChange={() => setCanaux(bascule(canaux, c))} />
                      <span>{c === 'sms' ? (promotion ? t('SMS · interdit pour une promotion') : tf('SMS · {p} F par destinataire', { p: R.smsPrix * parties.parties })) : `${t(CANAL[c][1])} · ${t('gratuit')}`}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="s5-champ">
                <span>{t('Envoi programmé')}</span>
                <input type="datetime-local" value={quand} onChange={(e) => setQuand(e.target.value)} />
              </label>
              <label className="s5-champ">
                <span>{t('Message')}</span>
                <textarea rows={4} value={texte} onChange={(e) => setTexte(e.target.value)} aria-invalid={!!interdit} />
                <span className="t12 c3">{tf('{n} caractères · {p} partie(s) de SMS', { n: parties.caracteres, p: parties.parties })}</span>
              </label>
              {problemes.length > 0 && (objet || texte) && (
                <p className="e-erreur mt10" role="alert">
                  <Icone nom="triangle-alert" taille={16} />
                  {problemes.map((x) => t(RAISONS[x])).join(' ')}
                </p>
              )}
            </>
          )}
        </Panel>
        <div>
          <Panel titre={t('Aperçu sur le téléphone')} icone="smartphone">
            <div className="admm-sms">
              <div className="from">{`BelivaY · ${d.complet(programmee)}`}</div>
              {texte || t('Votre message apparaîtra ici.')}
            </div>
          </Panel>
          <Panel titre={t('Validation')} icone="shield-check" style={{ marginTop: 16 }}>
            {quatre ? <QuatreYeux>{tf('Plus de {n} destinataires : seconde validation obligatoire, par la Direction ou la Finance.', { n: F(R.diffusionSeuil) })}</QuatreYeux> : <Note ton="ink" icone="info">{tf('{n} destinataires au plus : envoi sans seconde validation.', { n: F(R.diffusionSeuil) })}</Note>}
            <Kv k={t('Destinataires')} v={F(nb)} />
            <Kv k={t('Coût estimé')} v={canaux.includes('sms') ? `${F(nb * R.smsPrix * parties.parties)} F` : t('0 F · aucun SMS')} />
            {peut && (
              <div className="row wrap mt12" style={{ gap: 8 }}>
                <button type="button" className="btn primary auto" disabled={problemes.length > 0 || !espaces.length || !zones.length || !canaux.length} title={problemes.length ? problemes.map((x) => t(RAISONS[x])).join(' ') : undefined} onClick={() => setFeuille(true)}>
                  <Icone nom={quatre ? 'users' : 'send'} taille={18} />
                  <span>{quatre ? t('Soumettre à quatre yeux') : t('Programmer la diffusion')}</span>
                </button>
              </div>
            )}
          </Panel>
        </div>
      </div>
      <Note ton="ink" icone="info" className="mt16">
        {t('Une diffusion générale sert une panne, une fête ou un changement de règle. Elle se programme, passe par les canaux gratuits d’abord, se prévisualise, et va à quatre yeux au-delà du seuil de destinataires.')}
      </Note>
      <Panel titre={t('Diffusions')} icone="megaphone" style={{ marginTop: 16 }}>
        <ErreurLecture erreur={liste.erreur} relire={liste.relire} />
        {(liste.donnees ?? []).map((x) => (
          <div key={x.id} className="li">
            <span className="ic acc">
              <Icone nom="megaphone" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>{`${x.id} · ${x.objet}`}</span>
              <span className="ls" style={{ display: 'block' }}>{tf('{n} destinataires · {q} · {p}', { n: F(x.destinataires), q: d.complet(x.programmeeLe), p: x.par })}</span>
            </span>
            <Pill ton={x.etat === 'envoyee' ? 'green' : x.etat === 'a_contresigner' ? 'violet' : x.etat === 'refusee' ? 'red' : 'blue'} sm>
              {t({ envoyee: 'Envoyée', programmee: 'Programmée', a_contresigner: 'À contresigner', refusee: 'Refusée' }[x.etat])}
            </Pill>
          </div>
        ))}
      </Panel>
      <DecisionMotivee
        ouverte={feuille}
        fermer={() => setFeuille(false)}
        titre={t('Diffuser le message')}
        resume={tf('« {o} » à {n} destinataires, {q}.', { o: objet, n: F(nb), q: d.complet(programmee) })}
        libelle="Programmer la diffusion"
        icone="send"
        quatreYeux={quatre}
        rolesSecond={['superviseur', 'finance']}
        envoyer={async (motif) => {
          const r = await source.communication.diffuser({ objet, texte, espaces, zones, canaux, promotion, programmeeLe: programmee, motif })
          liste.relire()
          if (!r.ok) return t(RAISONS[r.raison] ?? 'Refusé.')
          setMsg(r.etat === 'a_contresigner' ? tf('{id} attend son second validateur.', { id: r.id }) : tf('{id} programmée : elle part dans les applications choisies.', { id: r.id }))
          setObjet('')
          setTexte('')
          return null
        }}
      />
    </>
  )
}
