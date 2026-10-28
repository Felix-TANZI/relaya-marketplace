// Commandes et fiche commande (ADM-P04). Liste (prototype gardé) : indicateurs du registre (commandes du jour, payées
// avec escrow bloqué, validées payables au retrait, gelées, en vérification ; un clic filtre), barre d'outils
// (recherche numéro, étiquette, paquet ; téléphone réservé au Support et à la Direction ; filtres état, zone, paiement),
// tableau, pied « montants lus dans le registre ». Fiche (?ref=) : en-tête et action principale (paquet, dossier,
// versement), chronologie horodatée avec la preuve de chaque étape (« saisi à · reçu à » hors connexion),
// sous-commandes et dossiers, versions figées au paiement, héros Argent (rôles qui ont l'argent), client et remise
// (téléphone masqué, démasquage motivé et journalisé ; code de retrait : état seulement), annulation (Direction, motif,
// remboursement intégral au moyen d'origine, impossible après le code de remise ; quatre yeux au-delà du seuil).
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { ExportSigne } from '../../composants/ExportSigne'
import { Icone } from '../../composants/Icone'
import { BoutonAppel } from '../../composants/BoutonAppel'
import { Masque } from '../../composants/Masque'
import { Perimetre } from '../../composants/Perimetre'
import { AucunResultat, Frise, Kv, Li, Note, Panel, Pill, Recherche, Table, Vide, correspond, useSurtitre, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { CommandeCourte, CommandeFiche, EtatArgent, EtatCommande } from '../../donnees/domaines/commandes'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, useRouteOuverte, useSession } from '../../session'
import { PARAMETRES } from '../../calculs/registre'
import { ChampMotif, Plie, Quand, motifSuffisant, useFonctionsS } from '../ADM-03/kit'
import { REGLES_S1 } from '../ADM-03/regles'

const ETAT: Record<EtatCommande, { t: string; ton: Ton }> = {
  payee: { t: 'Payée · escrow bloqué', ton: 'blue' },
  validee: { t: 'Validée · payable au retrait', ton: 'amber' },
  verification: { t: 'En vérification', ton: 'amber' },
  preparation: { t: 'Chez le vendeur', ton: 'blue' },
  en_route: { t: 'En route', ton: 'blue' },
  au_relais: { t: 'Au relais', ton: 'acc' },
  retiree: { t: 'Retirée · se libère', ton: 'green' },
  litige: { t: 'Gelée · litige', ton: 'red' },
  annulee: { t: 'Annulée · remboursée', ton: 'ink' },
  remboursee: { t: 'Remboursée', ton: 'ink' },
}
const ARGENT: Record<EtatArgent, string> = { attente: 'En attente de confirmation', bloque: 'Bloqué', gele: 'Gelé · sans date', se_libere: 'Se libère', libere: 'Libéré', rembourse: 'Remboursé au moyen d’origine', sans_escrow: 'Pas d’escrow (payable au retrait)' }
const CODE: Record<CommandeFiche['codeRetrait'], string> = { non_envoye: 'Pas encore envoyé', envoye: 'Envoyé au client', utilise: 'Utilisé', bloque: 'Bloqué (3 essais)' }

type Filtre = 'toutes' | 'jour' | 'retard' | 'bloque' | 'validee' | 'gelee' | 'verification'

function Liste() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const surtitre = useSurtitre()
  const n = useHorloge()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const filtre = (params.get('filtre') ?? 'toutes') as Filtre
  const q = params.get('q') ?? ''
  const zone = params.get('zone') ?? ''
  const liste = useLecture(() => source.commandes.liste(), [s.role, s.agent?.id])
  const poser = (k: string, v: string) =>
    setParams(
      (p) => {
        const x = new URLSearchParams(p)
        if (v) x.set(k, v)
        else x.delete(k)
        return x
      },
      { replace: true },
    )
  const toutes = liste.donnees ?? []
  const jour = (c: CommandeCourte) => new Date(c.payeeLe + 3_600_000).toISOString().slice(0, 10) === new Date(n + 3_600_000).toISOString().slice(0, 10)
  const PAR: Record<Filtre, (c: CommandeCourte) => boolean> = {
    toutes: () => true,
    jour,
    retard: (c) => c.enRetard,
    bloque: (c) => c.argent === 'bloque',
    validee: (c) => c.etat === 'validee',
    gelee: (c) => c.argent === 'gele',
    verification: (c) => c.etat === 'verification',
  }
  const lignes = toutes.filter((c) => PAR[filtre](c) && (!zone || c.zone === zone) && correspond(q, c.ref, c.article, c.etiquette, c.paquet, c.vendeurs.join(' '), c.relais))
  const zones = [...new Set(toutes.map((c) => c.zone))].sort()
  const telephone = /^\+?\d[\d\s]{5,}$/.test(q.trim())
  const nb = (f: Filtre) => toutes.filter(PAR[f]).length
  const SEGS: [Filtre, string][] = [['toutes', 'Toutes'], ['jour', 'Aujourd’hui'], ['retard', 'En retard'], ['bloque', 'Escrow bloqué'], ['validee', 'Au retrait'], ['gelee', 'Gelées'], ['verification', 'En vérification']]
  const fonctions = useFonctionsS('commandes', [
    { verbe: 'Relancer', n: nb('retard'), unite: ['livraison en retard', 'livraisons en retard'], icone: 'timer', onClick: () => poser('filtre', 'retard'), alerte: true },
    { verbe: 'Arbitrer', n: nb('gelee'), unite: ['commande gelée', 'commandes gelées'], icone: 'scale', route: 'litige' },
    { verbe: 'Vérifier', n: nb('verification'), unite: ['paiement', 'paiements'], icone: 'refresh-cw', onClick: () => poser('filtre', 'verification') },
    { verbe: 'Suivre', n: nb('jour'), unite: ['commande du jour', 'commandes du jour'], icone: 'shopping-bag', onClick: () => poser('filtre', 'jour') },
  ])
  const actions = <ExportSigne nom="commandes.csv" objet="Commandes" entetes={['Commande', 'Article', 'Vendeurs', 'Relais', 'Zone', 'Montant', 'Paiement', 'État']} lignes={() => lignes.map((c) => [c.ref, c.article, c.vendeurs.join(' + '), c.relais ?? 'domicile', c.zone, c.total, c.paiement, t(ETAT[c.etat].t)])} />
  return (
    <Ecran route="commandes" kicker={surtitre} titre={liste.donnees ? tf('{n} commandes · {r} en retard', { n: toutes.length, r: nb('retard') }) : undefined} actions={actions} fonctions={liste.donnees ? fonctions : undefined}>
      <Perimetre route="commandes" />
      <div className="chips a-segs" role="group" aria-label={t('Filtrer par état')}>
        {SEGS.map(([f, l]) => (
          <button key={f} type="button" className={'chip' + (filtre === f ? ' on' : '')} aria-pressed={filtre === f} onClick={() => poser('filtre', f === 'toutes' ? '' : f)}>
            {t(l)} <span className="n">{nb(f)}</span>
          </button>
        ))}
      </div>
      {liste.erreur && (
        <Note ton="red" icone="circle-alert" className="mt14" role="alert">
          {t('La liste n’a pas pu être lue.')}{' '}
          <button type="button" className="btn sm secondary" onClick={liste.relire}>
            {t('Réessayer')}
          </button>
        </Note>
      )}
      <div className="admA-ord" style={{ marginTop: 16 }}>
        <Table<CommandeCourte>
          outils={
            <>
              <Recherche q={q} setQ={(v) => poser('q', v)} placeholder={t('Numéro, étiquette, paquet, téléphone (Support)…')} aria={t('Rechercher une commande')} />
              <label className="flt">
                <Icone nom="map-pinned" taille={15} />
                <select value={zone} onChange={(e) => poser('zone', e.target.value)} aria-label={t('Zone')}>
                  <option value="">{t('Toutes les zones')}</option>
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </label>
            </>
          }
          legende={t('Commandes')}
          rows={lignes}
          cle={(c) => c.ref}
          ligneCls={(c) => (c.argent === 'gele' ? 'red' : c.enRetard ? 'amber' : c.etat === 'verification' ? 'or' : undefined)}
          vide={
            telephone && (s.role === 'support' || s.role === 'superviseur') ? (
              <Vide icone="phone" t={t('Recherche par téléphone')} action={<button type="button" className="btn secondary" onClick={() => naviguer(chemin('recherche', { q: q.trim() }))}>{t('Chercher ce numéro')}</button>} />
            ) : liste.donnees ? (
              <AucunResultat effacer={() => setParams({}, { replace: true })} />
            ) : (
              <p className="t13 c3" aria-busy="true">
                {t('Chargement…')}
              </p>
            )
          }
          cols={[
            { k: 'ref', t: t('Commande'), main: true, rendu: (c) => <Link to={chemin('commandes', { ref: c.ref })} className="row" style={{ gap: 10 }}><span><b className="mono nw">{c.ref}</b><div className="t2">{c.article}</div></span></Link> },
            { k: 'when', t: t('Payée ou validée'), rendu: (c) => <Quand le={c.payeeLe} /> },
            { k: 'v', t: t('Vendeur'), rendu: (c) => c.vendeurs.join(' + ') },
            { k: 'to', t: t('Relais ou domicile'), hideM: true, rendu: (c) => c.relais ?? t('Domicile') },
            { k: 'amt', t: t('Montant et paiement'), cls: 'r', rendu: (c) => <><b className="nw">{`${F(c.total)} F`}</b><div className="t2 nw">{c.paiement}</div></> },
            { k: 'st', t: t('État'), rendu: (c) => <><Pill ton={ETAT[c.etat].ton} dot sm>{t(ETAT[c.etat].t)}</Pill>{c.enRetard && <Pill ton="amber" sm>{tf('+{h} h', { h: REGLES_S1.livraisonH })}</Pill>}</> },
            { k: 'pq', t: t('Paquet ou suite'), hideM: true, rendu: (c) => <span className="t12">{c.litige ?? c.paquet ?? '—'}</span> },
          ]}
          pied={
            <>
              <span>{tf('{n} lignes sur {total}', { n: lignes.length, total: toutes.length })}</span>
              <span>{t('Montants lus dans le registre, jamais recalculés')}</span>
            </>
          }
        />
      </div>
    </Ecran>
  )
}

function Annuler({ c, relire }: { c: CommandeFiche; relire: () => void }) {
  const { t, tf } = usePreferences()
  const [ouvert, setOuvert] = useState(false)
  const [motif, setMotif] = useState('')
  const [issue, setIssue] = useState<{ ton: 'green' | 'amber' | 'red'; texte: string } | null>(null)
  const annuler = async () => {
    const r = await source.commandes.annuler(c.ref, motif)
    if (!r.ok) setIssue({ ton: 'red', texte: r.raison === 'motif_court' ? tf('Le motif doit compter au moins {n} caractères.', { n: PARAMETRES.console.motifMin }) : t('Cette commande ne s’annule plus.') })
    else {
      setIssue(r.etat === 'a_contresigner' ? { ton: 'amber', texte: tf('Au-delà du seuil : l’annulation attend un second validateur d’un autre compte ({id}).', { id: r.id }) } : { ton: 'green', texte: t('Commande annulée ; remboursement intégral vers le moyen d’origine, client et vendeur prévenus.') })
      setOuvert(false)
      relire()
    }
  }
  return (
    <section className="panel" aria-label={t('Annuler la commande')}>
      {!c.annulable ? (
        c.raisonNonAnnulable && (
          <Note ton="ink" icone="lock">
            {t(c.raisonNonAnnulable)}
          </Note>
        )
      ) : !ouvert ? (
        <button type="button" className="btn danger" onClick={() => setOuvert(true)}>
          <Icone nom="circle-x" taille={18} />
          <span>{t('Annuler la commande')}</span>
        </button>
      ) : (
        <>
          <h2 className="card-t">{t('Annuler la commande')}</h2>
          <p className="card-s">{tf('{montant} F rendus au client vers {moyen}, le moyen d’origine.', { montant: F(c.total), moyen: c.paiement })}</p>
          <ChampMotif valeur={motif} changer={setMotif} />
          <div className="btns mt10">
            <button type="button" className="btn ghost" onClick={() => setOuvert(false)}>
              {t('Garder la commande')}
            </button>
            <button type="button" className="btn danger" disabled={!motifSuffisant(motif)} title={!motifSuffisant(motif) ? tf('{n} caractères au moins', { n: PARAMETRES.console.motifMin }) : undefined} onClick={() => void annuler()}>
              <Icone nom="circle-x" taille={18} />
              <span>{c.total > REGLES_S1.seuilQuatreYeux ? t('Envoyer au second validateur') : t('Annuler et rembourser')}</span>
            </button>
          </div>
        </>
      )}
      {issue && (
        <Note ton={issue.ton} icone={issue.ton === 'red' ? 'triangle-alert' : 'circle-check'} className="mt10" role="status">
          {issue.texte}
        </Note>
      )}
    </section>
  )
}

function Fiche({ refCmd }: { refCmd: string }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const ouverte = useRouteOuverte()
  const f = useLecture(() => source.commandes.commande(refCmd), [refCmd, s.role, s.agent?.id])
  const c = f.donnees
  if (f.erreur)
    return (
      <Ecran route="commandes" titre={refCmd}>
        <Note ton="red" icone="circle-alert" role="alert">
          {t('La fiche n’a pas pu être lue.')}{' '}
          <button type="button" className="btn sm secondary" onClick={f.relire}>
            {t('Réessayer')}
          </button>
        </Note>
      </Ecran>
    )
  if (!c)
    return (
      <Ecran route="commandes" titre={refCmd}>
        {f.donnees === null && <Vide icone="search-x" t={t('Commande introuvable dans votre périmètre')} action={<Link className="btn secondary" to={chemin('commandes')}>{t('Toutes les commandes')}</Link>} />}
      </Ecran>
    )
  const action = c.litige && ouverte('litige') ? { t: 'Ouvrir le dossier', i: 'scale', to: chemin('litige', { id: c.litige }) } : c.paquet && ouverte('paquets') ? { t: 'Voir le paquet', i: 'boxes', to: chemin('paquets', { id: c.paquet }) } : ouverte('versements') && c.argent === 'se_libere' ? { t: 'Voir le versement', i: 'banknote', to: chemin('versements') } : null
  const a = c.argentDetail
  return (
    <Ecran route="commandes" titre={c.ref}>
      <div className="admA-lhead">
        <span className="li" style={{ padding: 0, border: 0, minHeight: 0 }}>
          <span className="ic acc" style={{ width: 44, height: 44, borderRadius: 13 }}>
            <Icone nom="shopping-bag" taille={22} />
          </span>
        </span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="id mono">{c.ref}</span>
            <Pill ton={ETAT[c.etat].ton} dot sm>
              {t(ETAT[c.etat].t)}
            </Pill>
            {c.enRetard && <Pill ton="amber" sm>{tf('Livraison au-delà de {h} h', { h: REGLES_S1.livraisonH })}</Pill>}
          </div>
          <div className="sub2">{`${c.article} · ${c.vendeurs.join(' + ')} → ${c.relais ?? t('domicile')}${c.etiquette ? ` · ${t('étiquette')} ${c.etiquette}` : ''}`}</div>
        </div>
        <BoutonAppel nom={c.client} qui="Client" motif={tf('Commande {r} : explication ou déblocage', { r: c.ref })} objet={c.ref} />
        {action && (
          <Link className="btn secondary" to={action.to}>
            <Icone nom={action.i} taille={18} />
            <span>{t(action.t)}</span>
          </Link>
        )}
      </div>
      <div className="g g21 mt14">
        <div>
          {c.vue !== 'argent' ? (
            <Panel titre={t('Chronologie complète')} icone="list-checks">
              <div className="admA-tl">
                <Frise items={c.chronologie.map((e) => ({ t: <>{t(e.t)}{e.le !== null && <> · <Quand le={e.le} /></>}</>, d: <>{[e.par, e.preuve].filter(Boolean).join(' · ')}{e.saisieLe !== null && <span className="s1-hl"> · {t('saisi à')} <Quand le={e.saisieLe} /> · {t('reçu à')} <Quand le={e.le ?? e.saisieLe} /></span>}</>, st: e.st }))} />
              </div>
            </Panel>
          ) : (
            <Note ton="ink" icone="eye-off">
              {t('Chronologie et preuves réservées aux autres rôles')}
            </Note>
          )}
          <div className="g g2" style={{ marginTop: 16 }}>
            <Panel titre={t('Sous-commandes, messages, dossiers')} icone="link-2">
              {c.sousCommandes.map((x) => (
                <Li key={x.vendeur} icone="store" ton="acc" t={`${x.vendeur} · ${F(x.montant)} F`} s={`${x.articles} · ${t(ARGENT[x.argent])}`} to={x.dossier && ouverte('litige') ? chemin('litige', { id: x.dossier }) : undefined} />
              ))}
              {c.messages.map((m, i) => (
                <Li key={i} icone="message-square" ton="ink" t={m.quoi} s={<>{m.canal} · <Quand le={m.le} /></>} />
              ))}
            </Panel>
            {a && (
              <Panel titre={t('Versions appliquées')} icone="layers">
                <div className="admA-kvs">
                  <Kv k={t('Grille des commissions')} v={a.versionGrille} />
                  <Kv k={t('Palier du vendeur')} v={t('figé au paiement')} />
                </div>
              </Panel>
            )}
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          {a && (
            <div className="hero night" style={{ marginTop: 0 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="hk">{tf('Argent · {ref}', { ref: c.ref })}</span>
                <Pill ton="dk" sm dot>
                  {t(ARGENT[c.argent])}
                </Pill>
              </div>
              <div className="big">
                {F(a.paye)}
                <small>F</small>
              </div>
              <div className="hs">{c.paiement}</div>
              <div className="hline"></div>
              <Kv k={t('Article')} v={`${F(a.article)} F`} />
              <Kv k={t('Livraison')} v={`${F(a.livraison)} F`} />
              <Kv k={t('Commission figée au paiement')} v={`${F(a.commission)} F`} />
              <Kv k={t('Net vendeur')} v={`${F(a.netVendeur)} F`} />
              {a.partRelais > 0 && <Kv k={t('Part du relais (à la remise)')} v={`${F(a.partRelais)} F`} />}
              <Kv k={t('Part du transporteur')} v={`${F(a.partTransporteur)} F`} />
              <Kv k={t('Revenus BelivaY')} v={`${F(a.revenus)} F`} />
              {a.liberationLe && <Kv k={t('Libération')} v={<Quand le={a.liberationLe} />} />}
            </div>
          )}
          {c.vue !== 'argent' && (
            <Panel titre={t('Client et remise')} icone="user-round">
              <div className="b8 t14">{c.client}</div>
              <div className="t12 c3">{tf('{n} commandes · IFA {ifa}', { n: c.commandesClient, ifa: t(c.ifa) })}</div>
              <div className="admA-kvs mt8">
                <Kv k={t('Téléphone')} v={<Masque donnee="Numéro de téléphone du client" masque={c.telephoneClient} roles={['support', 'superviseur']} demasquer={(m) => source.commandes.demasquer(c.ref, 'telephoneClient', m)} />} />
                <Kv k={t('Code de retrait')} v={t(CODE[c.codeRetrait])} />
                <Kv k={t('Relais')} v={c.relais ?? t('Domicile')} />
              </div>
              <Plie titre={t('Données masquées')}>{t('Le numéro complet n’est visible que du Support et de la Direction ; chaque consultation est journalisée. Le code de retrait n’est jamais affiché, seulement son état.')}</Plie>
            </Panel>
          )}
          {c.vue === 'complete' && s.role === 'superviseur' && <Annuler c={c} relire={f.relire} />}
        </div>
      </div>
    </Ecran>
  )
}

export default function Commandes() {
  const [params] = useSearchParams()
  const ref = params.get('ref')
  return ref ? <Fiche refCmd={ref} /> : <Liste />
}
