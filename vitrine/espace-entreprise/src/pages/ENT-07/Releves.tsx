// ENT-P19 · Relevés, factures et obligations, repris sur le prototype (route('releves') ; domaine
// src/donnees/domaines/releves.ts). g12 : à gauche Périodes (semaines : un versement chaque vendredi ; mois :
// récapitulatif) et Facturation et obligations ; à droite, si une facture est attendue, Téléverser la facture, puis le
// relevé « papier » (ec7-paper : logo, numéro, parties avec les mentions de BELIVAY SARL, lignes par jour, totaux,
// mentions légales), puis l'aperçu du CSV (définitif) ou la note du relevé provisoire. Téléphone : le relevé résumé par
// jour, le détail repliable. Provisoire tant que la période n'est pas arrêtée : PDF, CSV et facture attendent
// (409 STATEMENT_NOT_FINAL). Facture téléversée ou autofacturation fixée au contrat ; écart facture / relevé : écrire
// à la Finance. Aucune donnée de client. Propriétaire et comptable (fiche de la route).
// Enrichissements (ENRICHISSEMENTS.md P19) : puces de période (?f= : toutes, semaines, mois, en cours, closes) avec leurs
// compteurs, totaux des relevés affichés (les mois récapitulent les semaines : on n'additionne jamais les deux), relevé
// de période en VRAI PDF et en CSV rendus par la source (plus d'impression seule) ; montants réservés expliqués.
import { useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import logo from '../../assets/logo-belivay.png'
import { Icone } from '../../composants/Icone'
import { AucunResultat, Banniere, BarrePouce, type Colonne, Compte, Hint, Interdit, Kv, Li, Note, Panel, Plus, Props, Puces, Px, St, Table, Tete, useLarge, Vide } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { LigneReleve, MentionsReleve, Releve } from '../../donnees/domaines/releves'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { PARAMETRES } from '../../calculs/registre'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { Chargement, telecharger, useAnnonce, useDates, useEnLigne, useF } from './commun'
import { Col, ErreurPx, LECTURE_APRES_FIN_J } from './px'
import { Ecran } from '../../composants/coque'
import { useMontantsVisibles } from '../../session'

const FILTRES = ['tout', 'semaine', 'mois', 'en_cours', 'clos'] as const
type Filtre = (typeof FILTRES)[number]
const TITRE_FILTRE: Record<Filtre, string> = { tout: 'Toutes', semaine: 'Semaines', mois: 'Mois', en_cours: 'En cours', clos: 'Closes' }
const garde = (f: Filtre, r: Releve) => (f === 'tout' ? true : f === 'semaine' || f === 'mois' ? r.periode === f : f === 'en_cours' ? r.statut === 'provisoire' : r.statut === 'definitif')

type Rangee = { jour: string; l: LigneReleve | null; i: number }

export default function Releves() {
  const { t, tf } = usePreferences()
  const d = useDates()
  const f = useF()
  const large = useLarge()
  const maintenant = useHorloge()
  const nom = useSession().entreprise?.nom ?? t('votre entreprise')
  const semaines = useLecture(() => source.releves.liste('semaine'), [])
  const mois = useLecture(() => source.releves.liste('mois'), [])
  const mentions = useLecture(() => source.releves.mentions(), [])
  const [params, setParams] = useSearchParams()
  // ?id=RL-2026-S41 : relevé ouvert d'emblée (lien de l'historique des règlements).
  const [choisiId, setChoisi] = useState<string | null>(() => params.get('id'))
  const fp = params.get('f') as Filtre | null
  const filtre: Filtre = fp && FILTRES.includes(fp) ? fp : 'tout'
  const setFiltre = (x: Filtre) => {
    const p = new URLSearchParams(window.location.search) // l’adresse du moment : les mises à jour du routeur arrivent en transition
    if (x === 'tout') p.delete('f')
    else p.set('f', x)
    setParams(p, { replace: true })
  }
  const voir = useMontantsVisibles()
  const { annoncer, vue } = useAnnonce()
  const enLigne = useEnLigne()
  const champ = useRef<HTMLInputElement>(null)
  const tous = [...(semaines.donnees ?? []), ...(mois.donnees ?? [])]
  const sem = (semaines.donnees ?? []).filter((x) => garde(filtre, x))
  const moi = (mois.donnees ?? []).filter((x) => garde(filtre, x))
  const r = [...sem, ...moi].find((x) => x.id === choisiId) ?? sem[0] ?? moi[0] ?? null
  const m = mentions.donnees
  const provisoire = r?.statut === 'provisoire'
  const attendue = r?.statut === 'definitif' && r.facture.mode === 'televersee' && r.facture.statut === 'attendue'
  const erreur = semaines.erreur ?? mois.erreur ?? mentions.erreur
  const relire = () => (semaines.relire(), mois.relire(), mentions.relire())
  const exporter = async (format: 'pdf' | 'csv') => {
    if (!r) return
    const x = await source.releves.fichier(r.id, format)
    if (!x.ok) return annoncer(false, t('Relevé provisoire : le fichier est disponible après l’arrêté de la période.'))
    telecharger(x.nom, x.contenu, x.type)
    annoncer(true, tf('{nom} téléchargé.', { nom: x.nom }))
  }
  const envoyerFacture = async (x: File | undefined) => {
    if (!x || !r) return
    const res = await source.releves.televerserFacture(r.id, { nom: x.name, taille: x.size, type: x.type })
    if (res.ok) annoncer(true, t('Facture envoyée.'))
    else annoncer(false, t(res.raison === 'taille' ? 'Fichier trop lourd.' : res.raison === 'format' ? 'Un PDF est attendu.' : 'Facture impossible pour cette période.'))
  }
  const choisirFacture = () => champ.current?.click()
  const acts = (
    <>
      <button type="button" className="btn secondary sm" disabled={!r || provisoire || !enLigne} onClick={() => void exporter('pdf')}>
        <Icone nom="download" taille={16} />
        <span>{provisoire ? t('PDF à la clôture') : t('Télécharger le PDF')}</span>
      </button>
      <button type="button" className="btn secondary sm" disabled={!r || provisoire || !enLigne} onClick={() => void exporter('csv')}>
        <Icone nom="file-spreadsheet" taille={16} />
        <span>{provisoire ? t('CSV à la clôture') : t('Exporter en CSV')}</span>
      </button>
      {attendue && (
        <button type="button" className="btn primary sm" disabled={!enLigne} onClick={choisirFacture}>
          <Icone nom="upload" taille={16} />
          <span>{t('Envoyer la facture')}</span>
        </button>
      )}
    </>
  )
  const periode = (x: Releve) => tf('Du {du} au {au}', { du: d.jourLong(x.du), au: d.jourLong(x.au) })
  const carte = (x: Releve) => {
    const on = x.id === r?.id
    const etat = x.statut === 'provisoire' ? <St t={t('En cours')} ton="amber" /> : x.facture.statut === 'attendue' ? <St t={t('Facture attendue')} ton="amber" /> : <St t={t('Close')} ton="green" />
    return (
      <button key={x.id} type="button" className={'ec7-card' + (on ? ' ec7-sel' : '')} aria-pressed={on} onClick={() => setChoisi(x.id)} data-periode={x.id}>
        <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span className="b8 t14">{x.periode === 'semaine' ? tf('{du} → {au}', { du: d.jour(x.du), au: d.jour(x.au) }) : periode(x)}</span>
          {etat}
        </span>
        <span className="t12 c3 mt4" style={{ display: 'block' }}>
          {x.statut === 'provisoire' ? tf('{id} · {m} à ce jour · arrêté {q}', { id: x.id, m: f(x.net), q: d.quand(x.arreteLe, maintenant) }) : tf('{id} · net {m}', { id: x.id, m: f(x.net) })}
        </span>
      </button>
    )
  }
  // Totaux des relevés affichés : semaines (ou mois si seuls les mois sont choisis) — jamais les deux additionnés.
  const base = filtre === 'mois' ? moi : sem
  const totaux = { p: base.reduce((a, x) => a + x.totalPrestations, 0), r: base.reduce((a, x) => a + x.totalRetenues, 0), n: base.reduce((a, x) => a + x.net, 0) }
  const periodes = (
    <Panel titre={t('Périodes')} icone="calendar-range">
      {tous.length > 0 && (
        <>
          <Puces aria={t('Périodes des relevés')} actif={filtre} choisir={setFiltre} items={FILTRES.map((x) => ({ id: x, t: TITRE_FILTRE[x], n: tous.filter((y) => garde(x, y)).length }))} />
          <Compte n={sem.length + moi.length} total={tous.length} />
        </>
      )}
      {filtre !== 'mois' && (
        <>
          <div className="ec7-grp">{t('Semaines · un versement chaque vendredi')}</div>
          <div className="mt8">{semaines.donnees ? sem.length ? sem.map(carte) : <div className="t13 c3">{semaines.donnees.length ? t('Aucune semaine pour cette puce.') : t('Le premier relevé couvre la première semaine de missions.')}</div> : !semaines.erreur && <Chargement n={1} />}</div>
        </>
      )}
      {filtre !== 'semaine' && (
        <>
          <div className="ec7-grp">{t('Mois · récapitulatif')}</div>
          <div className="mt8">{mois.donnees ? moi.length ? moi.map(carte) : <div className="t13 c3">{mois.donnees.length ? t('Aucun mois pour cette puce.') : t('Aucun récapitulatif pour l’instant.')}</div> : !mois.erreur && <Chargement n={1} />}</div>
        </>
      )}
      {base.length > 0 && (
        <div className="e7-totaux" data-totaux>
          <div className="ec7-grp">{tf('Totaux · {n} relevé(s) de {p}', { n: base.length, p: t(filtre === 'mois' ? 'mois' : 'semaine') })}</div>
          {voir ? (
            <>
              <Kv k={t('Prestations validées')} v={f(totaux.p)} />
              <Kv k={t('Retenues motivées')} v={f(-totaux.r)} cls={totaux.r ? 'cr' : undefined} />
              <Kv k={<b>{t('Net')}</b>} v={<b className={totaux.n < 0 ? 'cr' : undefined}>{f(totaux.n)}</b>} />
            </>
          ) : (
            <Interdit roles={['proprietaire', 'comptable']} quoi="Montants des relevés" />
          )}
          {base.some((x) => x.statut === 'provisoire') && <div className="t12 c3 mt4">{t('Dont des périodes provisoires : les totaux bougent jusqu’à l’arrêté.')}</div>}
        </div>
      )}
      <Hint icone="calendar">{t('Un relevé par semaine, un récapitulatif par mois ; il vaut pièce justificative pour votre facture. Les mois récapitulent les semaines : leurs totaux ne s’additionnent pas.')}</Hint>
    </Panel>
  )
  const facturation = (
    <Panel titre={t('Facturation et obligations')} icone="receipt">
      {m ? (
        <>
          <Kv
            k={t('Mode de facturation')}
            v={
              <>
                {m.modeFacturation === 'televersee' ? tf('facture téléversée par {n}', { n: nom }) : t('autofacturation par BelivaY')}
                <div className="t12 c3" style={{ fontWeight: 600 }}>
                  {t('fixé au contrat')}
                </div>
              </>
            }
          />
          <Note ton="amber" icone="circle-help">
            <b>{t('Paramètre à confirmer')}</b> : {tf('retenue fiscale à la source {x}.', { x: t(m.retenueSource) })}
          </Note>
          <Kv k={t('Obligations fiscales et sociales')} v={tf('{n}, y compris envers ses livreurs', { n: nom })} />
          <Kv
            k={t('Écart facture / relevé')}
            v={
              <>
                {t('le relevé fait foi')} ·{' '}
                <Link className="cor" to={chemin('messages', { sheet: 'nouveau', sujet: 'releve', ref: r?.id ?? '' })}>
                  {t('Écrire à la Finance')}
                </Link>
              </>
            }
          />
          {r && r.facture.mode === 'televersee' && <Kv k={t('Facture de cette période')} v={r.facture.statut === 'recue' ? tf('reçue {q}', { q: d.quand(r.facture.recueLe!, maintenant) }) : r.facture.statut === 'attendue' ? t('attendue') : t('après l’arrêté de la période')} />}
        </>
      ) : (
        !mentions.erreur && <Chargement n={1} />
      )}
      <Note ton="red" icone="ban">
        <b>{t('Interdit')}</b> : {t('facturer au client ou au vendeur une prestation déjà payée par BelivaY.')}
      </Note>
    </Panel>
  )
  return (
    <Ecran route="releves" actions={large ? acts : undefined}>
      <Px>
        <Tete route="releves" titre={t('Relevés et factures')} actes={acts} />
        <ErreurPx erreur={erreur} relire={relire} quoi="les relevés" />
        {attendue && r && (
          <Banniere
            ton="amber"
            icone="file-clock"
            className="ec-bn"
            role="status"
            bouton={
              <button type="button" className="btn primary sm" disabled={!enLigne} onClick={choisirFacture}>
                <Icone nom="upload" taille={16} />
                <span>{t('Téléverser la facture')}</span>
              </button>
            }
          >
            <b>{t('Facture attendue')}</b> {tf('pour la période {p} : {m}, relevé {id}.', { p: periode(r).toLowerCase(), m: f(r.net), id: r.id })}
          </Banniere>
        )}
        <input ref={champ} type="file" accept="application/pdf" className="vh" aria-label={t('Facture (PDF)')} onChange={(e) => (void envoyerFacture(e.target.files?.[0]), (e.target.value = ''))} />
        {vue}
        {!semaines.donnees && !mois.donnees ? (
          !erreur && <Chargement />
        ) : !r ? (
          <div className="g g12">
            <Col>
              {periodes}
              {facturation}
            </Col>
            <Panel>{tous.length ? <AucunResultat effacer={() => setFiltre('tout')} texte={t('Aucun relevé pour cette puce.')} /> : <Vide icone="file-text" t={t('Aucun relevé')} s={t('Le premier relevé couvre la première semaine de missions.')} />}</Panel>
          </div>
        ) : large ? (
          <div className="g g12">
            <Col>
              {periodes}
              {facturation}
            </Col>
            <Col>
              {attendue && m && <Televerser r={r} m={m} nom={nom} choisir={choisirFacture} />}
              {m ? <Papier r={r} m={m} nom={nom} /> : <Chargement n={2} />}
              {provisoire ? (
                <Note ton="ink" icone="clock">
                  {tf('Relevé provisoire, arrêté {q} : il se complète à chaque prestation validée. Le PDF, le CSV et la facture définitifs sont produits ensuite.', { q: d.quand(r.arreteLe, maintenant) })}
                </Note>
              ) : (
                <ApercuCsv r={r} />
              )}
              {r.statut === 'definitif' && <FactureEtat r={r} />}
            </Col>
          </div>
        ) : (
          <div className="g">
            {provisoire && (
              <Note ton="ink" icone="clock">
                {tf('Relevé provisoire, arrêté {q} : il se complète à chaque prestation validée. Le PDF, le CSV et la facture définitifs sont produits ensuite.', { q: d.quand(r.arreteLe, maintenant) })}
              </Note>
            )}
            {attendue && m && <Televerser r={r} m={m} nom={nom} choisir={choisirFacture} />}
            {m ? <Papier r={r} m={m} nom={nom} resume /> : <Chargement n={2} />}
            <Hint icone="file-text">{t('Le détail ligne par ligne (paquet, mission, classe, zone, date) est dans le PDF et le CSV.')}</Hint>
            {r.statut === 'definitif' && <FactureEtat r={r} />}
            {periodes}
            {facturation}
          </div>
        )}
      </Px>
      {r && (
        <BarrePouce aria={t('Actions du relevé')}>
          <button type="button" className="btn secondary" disabled={provisoire || !enLigne} onClick={() => void exporter('pdf')}>
            <Icone nom="file-down" taille={18} />
            <span>{provisoire ? t('PDF à la clôture') : 'PDF'}</span>
          </button>
          <button type="button" className="btn secondary" disabled={provisoire || !enLigne} onClick={() => void exporter('csv')}>
            <Icone nom="file-spreadsheet" taille={18} />
            <span>{provisoire ? t('CSV à la clôture') : 'CSV'}</span>
          </button>
        </BarrePouce>
      )}
    </Ecran>
  )
}

/** Relevé « papier » (entC7_paper) : en-tête, parties, lignes (par jour, ou résumé par jour au téléphone), totaux. */
function Papier({ r, m, nom, resume }: { r: Releve; m: MentionsReleve; nom: string; resume?: boolean }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const f = useF()
  const jours = [...new Set(r.lignes.map((l) => l.jour))]
  const rangees: Rangee[] = jours.flatMap((j) => [{ jour: j, l: null, i: -1 }, ...r.lignes.map((l, i) => ({ jour: j, l, i })).filter((x) => x.l.jour === j)])
  const cols: Colonne<Rangee>[] = [
    {
      k: 'pq',
      t: t('Référence'),
      main: true,
      rendu: (x) =>
        !x.l ? (
          d.jourLong(x.jour)
        ) : x.l.genre === 'retenue' ? (
          <Link className="cor b8 mono" to={chemin('litiges', { id: x.l.reference })}>
            {x.l.reference}
          </Link>
        ) : (
          <>
            <b className="mono nw">{x.l.reference.split(' · ')[0]}</b>
            {x.l.reference.includes(' · ') && <div className="t2 mono">{x.l.reference.split(' · ').slice(1).join(' · ')}</div>}
          </>
        ),
    },
    { k: 'pr', t: t('Prestation ou retenue'), rendu: (x) => (x.l ? <>{t(x.l.genre === 'retenue' ? 'Retenue motivée' : 'Prestation validée')}<div className="t2">{t(x.l.detail)}</div></> : '') },
    { k: 'm', t: t('Montant'), cls: 'r', rendu: (x) => (x.l ? <b className={x.l.montant < 0 ? 'cr' : undefined}>{f(x.l.montant)}</b> : '') },
  ]
  const parJour = jours.map((j) => ({ j, n: r.lignes.filter((l) => l.jour === j).length, m: r.lignes.filter((l) => l.jour === j).reduce((a, l) => a + l.montant, 0) }))
  const colsJour: Colonne<(typeof parJour)[number]>[] = [
    { k: 'd', t: t('Jour'), main: true, rendu: (x) => <b>{d.jourLong(x.j)}</b> },
    { k: 'n', t: t('Lignes'), rendu: (x) => tf('{n} ligne(s)', { n: x.n }) },
    { k: 'm', t: t('Montant'), cls: 'r', rendu: (x) => <b className={x.m < 0 ? 'cr' : undefined}>{f(x.m)}</b> },
  ]
  const tot: [ReactNode, ReactNode, string?][] = [
    [t('Prestations validées'), f(r.totalPrestations)],
    [t('Retenues motivées'), f(-r.totalRetenues)],
  ]
  return (
    <div className="ec7-paper" data-releve={r.id}>
      <div className="hdr">
        <div>
          <img src={logo} alt="BelivaY" />
          <div className="kick mt8">{t(r.periode === 'semaine' ? 'Relevé de prestations' : 'Récapitulatif mensuel')}</div>
          <div className="b8 t17 mt4">{tf('Du {du} au {au}', { du: d.jourLong(r.du), au: d.jourLong(r.au) })}</div>
        </div>
        <div className="right" style={{ textAlign: 'right' }}>
          <div className="t12 c3 b7">{t('Numéro')}</div>
          <div className="b8 mono">{r.id}</div>
          <div className="mt6">{r.statut === 'definitif' ? <St t={t('Définitif')} ton="green" /> : <St t={t('Provisoire')} ton="amber" />}</div>
        </div>
      </div>
      <div className="parties">
        <div className="party">
          <div className="k">{t('Émis par')}</div>
          <b className="no-tr">{m.emetteur.denomination}</b>
          {`${t(m.emetteur.forme)} · ${t('capital')} ${m.emetteur.capital}`}
          <br />
          {m.emetteur.siege}
          <br />
          <span className="no-tr">{`RCCM ${m.emetteur.rccm} · NIU ${m.emetteur.niu}`}</span>
        </div>
        <div className="party">
          <div className="k">{t('Pour')}</div>
          <b>{m.destinataire.denomination}</b>
          {m.destinataire.quartier}
          <br />
          <span className="no-tr">{`NIU ${m.destinataire.niu}`}</span>
        </div>
      </div>
      {r.lignes.length === 0 ? (
        <Vide icone="file-text" t={t('Aucune ligne')} s={t('Aucune prestation validée ni retenue sur cette période.')} />
      ) : resume ? (
        <>
          <div className="ec-tb">
            <Table cols={colsJour} rows={parJour} cle={(x) => x.j} legende={t('Relevé par jour')} />
          </div>
          <Plus libelle={t('Détail ligne par ligne')} icone="list" plat>
            {r.lignes.map((l, i) => (
              <Kv key={i} k={`${l.reference} · ${t(l.detail)}`} v={f(l.montant)} cls={l.montant < 0 ? 'cr' : undefined} />
            ))}
          </Plus>
        </>
      ) : (
        <div className="ec-tb">
          <Table cols={cols} rows={rangees} cle={(x) => x.jour + x.i} legende={t('Lignes du relevé')} ligneCls={(x) => (x.l ? (x.l.genre === 'retenue' ? 'bad' : undefined) : 'ec7-day')} />
        </div>
      )}
      <div className="ec7-tot">
        {tot.map(([k, v], i) => (
          <span key={i} style={{ display: 'contents' }}>
            <span className="k">{k}</span>
            <span className="v">{v}</span>
          </span>
        ))}
        <span className="k big">{r.statut === 'provisoire' ? t('Net de la période à ce jour (provisoire)') : t('Net de la période')}</span>
        <span className="v big e7-net">{f(r.net)}</span>
      </div>
      <div className="legal">
        {tf('Relevé établi par {e} à partir des prestations validées par le serveur ; il vaut pièce justificative pour la facture de {n}. {n} reste seule responsable de ses obligations fiscales et sociales, y compris vis-à-vis de ses livreurs. Frais Mobile Money à la charge de BelivaY. Aucune donnée de client final ; consultable en lecture seule {j} jours après la fin du contrat.', { e: m.emetteur.denomination, n: nom, j: LECTURE_APRES_FIN_J })}
      </div>
    </div>
  )
}

/** Export CSV · aperçu des premières lignes (relevé définitif). */
function ApercuCsv({ r }: { r: Releve }) {
  const { t } = usePreferences()
  const lignes = ['jour;genre;reference;detail;montant', ...r.lignes.slice(0, 5).map((l) => [l.jour, l.genre, l.reference, l.detail, l.montant].join(';'))]
  if (r.lignes.length > 5) lignes.push('…')
  return (
    <Panel titre={t('Export CSV · aperçu des premières lignes')} icone="table">
      <div className="codeblk no-tr">{lignes.join('\n')}</div>
      <Hint icone="file-spreadsheet">{t('Une ligne par prestation et par retenue, séparateur point-virgule, encodage UTF-8 ; aucune donnée de client.')}</Hint>
    </Panel>
  )
}

/** Téléverser la facture (période close, facture attendue). */
function Televerser({ r, m, nom, choisir }: { r: Releve; m: MentionsReleve; nom: string; choisir: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const f = useF()
  const enLigne = useEnLigne()
  return (
    <Panel titre={tf('Téléverser la facture de {n}', { n: nom })} icone="file-up">
      <button type="button" className="ec7-drop" style={{ width: '100%', font: 'inherit', cursor: 'pointer' }} disabled={!enLigne} onClick={choisir}>
        <Icone nom="file-up" taille={30} />
        <b>{t('Déposez votre facture (PDF)')}</b>
        {tf('Montant attendu : {m} · référence à rappeler : {id} · {mo} Mo au plus', { m: f(r.net), id: r.id, mo: PARAMETRES.acces.tailleMaxPieceMo })}
      </button>
      <Props
        paires={[
          [t('Période'), tf('du {du} au {au}', { du: d.jourLong(r.du), au: d.jourLong(r.au) })],
          [t('Destinataire'), <span className="no-tr">{`${m.emetteur.denomination} · NIU ${m.emetteur.niu}`}</span>],
          [t('Montant du relevé'), f(r.net)],
          [t('Si votre facture diffère'), t('le relevé fait foi ; l’écart se règle par message avec la Finance BelivaY')],
        ]}
      />
      <div className="btns ec-btns">
        <Link className="btn secondary" to={chemin('messages', { sheet: 'nouveau', sujet: 'releve', ref: r.id })}>
          <Icone nom="message-circle" taille={18} />
          <span>{t('Écrire à la Finance')}</span>
        </Link>
        <button type="button" className="btn primary" disabled={!enLigne} onClick={choisir}>
          <Icone nom="upload" taille={18} />
          <span>{t('Téléverser la facture')}</span>
        </button>
      </div>
    </Panel>
  )
}

/** Facture reçue ou autofacturation (période close). */
function FactureEtat({ r }: { r: Releve }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  if (r.facture.mode === 'autofacturation') return <Hint icone="receipt">{t('Autofacturation : BelivaY émet la facture en votre nom, rien à téléverser.')}</Hint>
  if (r.facture.statut !== 'recue') return null
  return <Li icone="file-check" ton="green" t={t('Facture reçue')} s={tf('{nom} · {q}', { nom: r.facture.fichier ?? '', q: d.quand(r.facture.recueLe!, maintenant) })} droite={<St t={t('Reçue')} ton="green" />} />
}
