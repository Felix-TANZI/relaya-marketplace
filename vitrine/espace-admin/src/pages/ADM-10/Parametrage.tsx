// ADM-P24 · Paramétrage et simulation, repris sur le prototype (route('parametrage') : en-tête, quatre indicateurs,
// onglets Catalogue · Simulations · Quatre yeux · Historique des versions · Nouveautés, catalogue et fiche, encadré de
// l'assistant, nouveautés EX-01 à EX-06 ; simulation (proposition, rejeu, cas types, contrôles, barre d'action) ;
// quatre yeux ; version appliquée). Règles : tout paramètre est versionné (date d'effet, jamais rétroactif), simulé
// avant soumission (bloqué si un cas type passe sous zéro ou si une grille dépasse son plafond), un « Décidé » exige
// la référence d'une décision écrite, un critique passe à quatre yeux (Direction ou Finance, autre compte, source
// quatreyeux), annonce aux partenaires au moins ADM-PREAVIS-J jours avant. Les valeurs viennent du registre.
import { codeVu } from '../../config/libelles'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { CarteQuatreYeux } from '../../composants/CarteQuatreYeux'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { AucunResultat, Banniere, Divide, Frise, Interdit, Kpi, Kv, Note, Panel, Pill, Props, Recherche, Table, Tg, Vide, useSurtitre, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { yaounde, JOUR, jourDe } from '../../calculs/temps'
import type { ParametreVu, PropositionParametre } from '../../donnees/domaines/pilotage'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, usePeut, useRouteOuverte, useSession } from '../../session'
import { Chargement, ChampMotif, Coche, ErreurLecture, Etapes, Mini, Onglets, QuatreYeux, RAISONS, useDates, useDuree } from '../ADM-11/commun-s5'
import { useFonctions } from '../AJ-A/fonctions-page'
import { REGLES_S5, dateEffetMin, exigeReference, formeValeur, type CasType, type Controle } from '../ADM-11/regles-s5'

const R = REGLES_S5
type Etat = 'cat' | 'sim' | '4y' | 'his' | 'new'
const ETAT_DE: Record<string, Etat> = { '': 'cat', simulation: 'sim', bloque: 'sim', 'quatre-yeux': '4y', applique: 'his', nouveautes: 'new' }
const ETAPES = ['Proposer', 'Simuler', 'Quatre yeux', 'Appliquer']

/** Familles du registre, nom court (le libellé complet porte la référence du document). */
const FAMILLES: Record<string, string> = {
  'Livraison et panier': 'Livraison et panier',
  Paiement: 'Paiement',
  'Code de retrait, garde et retrait': 'Code de retrait, garde et retrait',
  'Litiges, retours, annulation': 'Litiges, retours, annulation',
  'Argent du vendeur vu par le client': 'Argent du vendeur vu par le client',
  Messages: 'Messages',
  'Recherche, accueil, avis': 'Recherche, accueil, avis',
  'Codes du lancement absents du registre 20': 'Codes du lancement absents du registre 20',
  'Après le lancement · interrupteurs': 'Après le lancement · interrupteurs',
  'Après le lancement · abonnement': 'Après le lancement · abonnement',
  'Après le lancement · liste d’envies': 'Après le lancement · liste d’envies',
  'Après le lancement · ventes flash et IA': 'Après le lancement · ventes flash et IA',
  'Après le lancement · nouveautés': 'Après le lancement · nouveautés',
  'Codes ajoutés par les documents d’écrans CL-03 à CL-15': 'Codes ajoutés par les documents d’écrans CL-03 à CL-15',
  'Valeurs sans code dans la spécification ou les documents : codes proposés par CL-16': 'Valeurs sans code : codes proposés par CL-16',
  'Proposés pour la console d\'administration': 'Proposés pour la console d’administration',
  'Créés par une décision du porteur': 'Créés par une décision du porteur',
  'Paramètres du paquet ADMIN (hors registre officiel)': 'Paramètres du paquet ADMIN (hors registre officiel)',
}
const court = (f: string) => {
  const k = f.replace(/\s*\(.*$/, '').trim()
  return FAMILLES[k] ?? k
}
const STATUT: Record<string, { ton: Ton; icone: string }> = { Décidé: { ton: 'green', icone: 'check' }, Proposé: { ton: 'amber', icone: 'pencil' }, Recommandé: { ton: 'blue', icone: 'git-branch' }, 'À trancher': { ton: 'red', icone: 'circle-help' } }
const ETAT_PP: Record<PropositionParametre['etat'], [string, Ton]> = { simulee: ['Simulée', 'blue'], bloquee: ['Bloquée', 'red'], a_contresigner: ['À contresigner', 'violet'], appliquee: ['Appliquée', 'green'], refusee: ['Refusée', 'red'], expiree: ['Expirée', 'ink'], retiree: ['Retirée', 'ink'] }
const CONTROLE: Record<Controle['id'], string> = {
  marge: 'Aucun cas type sous zéro, marge de sécurité comprise',
  grille: 'Grille de l’entreprise sous contrat sous le plafond d’achat',
  pas: 'Valeur sur le pas imposé, différente de la valeur en vigueur',
  preavis: 'Date d’effet au moins {j} jours après l’annonce',
  retroactif: 'Nouvelle version, jamais rétroactive',
  motif: 'Motif de {n} caractères au moins',
  reference: 'Référence de la décision écrite (paramètre « Décidé »)',
}

function StatutPill({ s }: { s: string }) {
  const { t } = usePreferences()
  const x = STATUT[s] ?? STATUT['Proposé']
  return (
    <Pill ton={x.ton} sm icone={x.icone}>
      {t(s)}
    </Pill>
  )
}
function Critique() {
  const { t } = usePreferences()
  return (
    <span className="admp-crit">
      <Icone nom="users" taille={12} />
      {t('quatre yeux')}
    </span>
  )
}

export default function Parametrage() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const [p, setP] = useSearchParams()
  const etat = ETAT_DE[p.get('s') ?? ''] ?? 'cat'
  const droit = useDroit('parametrage')
  const peutProposer = usePeut('parametre.proposer')
  const ouverte = useRouteOuverte()
  const params = useLecture(() => source.pilotage.parametres(), [])
  const props = useLecture(() => source.pilotage.propositions(), [])
  const modules = useLecture(() => source.pilotage.modules(), [])
  const enAttente = useLecture(() => (ouverte('quatreyeux') ? source.quatreyeux.enAttente() : Promise.resolve([])), [ouverte])
  const aller = (o: Record<string, string | null>) => {
    const n = new URLSearchParams(p)
    for (const [k, v] of Object.entries(o)) if (v === null) n.delete(k)
    else n.set(k, v)
    setP(n)
  }
  const pendantes = (props.donnees ?? []).filter((x) => x.etat === 'a_contresigner')
  const bascules = (enAttente.donnees ?? []).filter((d) => d.action.startsWith('interrupteur.'))
  const actes = (
    <>
      <Link className="btn secondary auto" to={chemin('parametrage', { s: 'applique' })}>
        <Icone nom="history" taille={18} />
        <span>{t('Historique')}</span>
      </Link>
      {peutProposer && (
        <Link className="btn primary auto" to={chemin('parametrage', { s: 'simulation', code: p.get('code') })}>
          <Icone nom="square-pen" taille={18} />
          <span>{t('Proposer un changement')}</span>
        </Link>
      )}
    </>
  )
  const peutValider = usePeut('parametre.valider')
  const peutContresigner = usePeut('contresigner')
  const valider = peutValider || peutContresigner
  const pp = props.donnees ?? []
  const n0 = useHorloge()
  const fonctions = useFonctions([
    valider && { verbe: 'Valider', n: pendantes.length + bascules.length, unite: ['paramètre', 'paramètres'], icone: 'users', route: 'parametrage', params: { s: 'quatre-yeux' }, alerte: pendantes.length + bascules.length > 0 },
    peutProposer && { verbe: 'Proposer', n: null, unite: ['changement', 'changements'], icone: 'square-pen', route: 'parametrage', params: { s: 'simulation' } },
    { verbe: 'Simuler', n: pp.filter((x) => x.etat === 'simulee' || x.etat === 'bloquee').length, unite: ['proposition', 'propositions'], icone: 'flask-conical', route: 'parametrage', params: { s: 'simulation' } },
    { verbe: 'Annoncer', n: pp.filter((x) => x.etat === 'appliquee' && x.dateEffet > n0).length, unite: ['version à venir', 'versions à venir'], icone: 'megaphone', route: 'parametrage', params: { s: 'applique' } },
  ])
  return (
    <Ecran route="parametrage" kicker={surtitre} actions={actes} fonctions={droit.acces === 'aucun' ? undefined : fonctions}>
      <ErreurLecture erreur={params.erreur} relire={params.relire} />
      {!params.donnees ? (
        !params.erreur && <Chargement n={3} />
      ) : (
        <>
          {etat === 'cat' && <Indicateurs params={params.donnees} pendantes={pendantes.length + bascules.length} modules={modules.donnees ?? []} />}
          <Onglets
            aria="Vues du paramétrage"
            actif={etat}
            items={[
              { id: 'cat', t: 'Catalogue', s: '', n: params.donnees.length, icone: 'list' },
              { id: 'sim', t: 'Simulations', s: 'simulation', n: (props.donnees ?? []).filter((x) => x.etat === 'simulee' || x.etat === 'bloquee').length, icone: 'flask-conical' },
              { id: '4y', t: 'Quatre yeux', s: 'quatre-yeux', n: pendantes.length + bascules.length, icone: 'users' },
              { id: 'his', t: 'Historique des versions', s: 'applique', icone: 'history' },
              { id: 'new', t: 'Nouveautés', s: 'nouveautes', n: (modules.donnees ?? []).filter((m) => /^FF-EX/.test(m.code)).length, icone: 'sparkles' },
            ]}
          />
          {droit.acces === 'lecture' && <Interdit roles={['superviseur', 'finance', 'operations']} quoi="Proposer un changement de paramètre" />}
          {etat === 'cat' && <Catalogue params={params.donnees} aller={aller} code={p.get('code')} />}
          {etat === 'sim' && <Simulation params={params.donnees} props={props.donnees ?? []} aller={aller} relire={props.relire} />}
          {etat === '4y' && <QuatreYeuxVue props={props.donnees ?? []} cartes={enAttente.donnees ?? []} erreur={enAttente.erreur} relire={() => (props.relire(), enAttente.relire())} />}
          {etat === 'his' && <Historique props={props.donnees ?? []} />}
          {(etat === 'cat' || etat === 'new') && <Nouveautes modules={modules.donnees ?? []} params={params.donnees} />}
        </>
      )}
    </Ecran>
  )
}

function Indicateurs({ params, pendantes, modules }: { params: ParametreVu[]; pendantes: number; modules: { ouvert: boolean }[] }) {
  const { t } = usePreferences()
  return (
    <div className="g g4">
      <Kpi k={t('Paramètres versionnés')} v={F(params.length)} s={t('Espace Cameroun · aucun écrit dans le code')} icone="sliders-horizontal" ton="night" />
      <Kpi k={t('Critiques à quatre yeux')} v={F(params.filter((x) => x.critique).length)} s={t('Commissions, grilles, plafonds, IFA, garde, escrow')} icone="users" />
      <Kpi k={t('Quatre yeux en attente')} v={pendantes} s={t('Paramètres et interrupteurs')} icone="hourglass" iton={pendantes ? 'or' : ''} to={chemin('parametrage', { s: 'quatre-yeux' })} />
      <Kpi k={t('Modules fermés')} v={modules.filter((m) => !m.ouvert).length} s={t('Nouveautés, IA, sponsorisé, Wallet, abonnement…')} icone="lock" iton="amber" to={chemin('parametrage', { s: 'nouveautes' })} />
    </div>
  )
}

// ── Catalogue ──────────────────────────────────────────────────────────────────────────────────────────────────────
const PAGE = 30
function Catalogue({ params, aller, code }: { params: ParametreVu[]; aller: (o: Record<string, string | null>) => void; code: string | null }) {
  const { t, tf } = usePreferences()
  const [p] = useSearchParams()
  const q = p.get('q') ?? ''
  const fam = p.get('fam') ?? ''
  const st = p.get('st') ?? ''
  const crit = p.get('crit') === '1'
  const [n, setN] = useState(PAGE)
  const familles = useMemo(() => [...new Set(params.map((x) => court(x.famille)))], [params])
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const liste = params.filter((x) => (!q || norm(x.code + ' ' + x.valeur + ' ' + x.famille).includes(norm(q))) && (!fam || court(x.famille) === fam) && (!st || x.statut === st) && (!crit || x.critique))
  const choisi = params.find((x) => x.code === code) ?? liste[0] ?? null
  const effacer = () => aller({ q: null, fam: null, st: null, crit: null })
  const outils = (
    <>
      <Recherche q={q} setQ={(v) => aller({ q: v || null })} placeholder={t('Code ou paramètre…')} aria={t('Rechercher un paramètre')} />
      <label className="flt">
        <Icone nom="layers" taille={15} />
        <select value={fam} onChange={(e) => aller({ fam: e.target.value || null })} aria-label={t('Famille')}>
          <option value="">{t('Famille : toutes')}</option>
          {familles.map((f) => (
            <option key={f} value={f}>
              {t(f)}
            </option>
          ))}
        </select>
      </label>
      <label className="flt">
        <Icone nom="tag" taille={15} />
        <select value={st} onChange={(e) => aller({ st: e.target.value || null })} aria-label={t('Statut')}>
          <option value="">{t('Statut : tous')}</option>
          {Object.keys(STATUT).map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className={'flt' + (crit ? ' on' : '')} aria-pressed={crit} onClick={() => aller({ crit: crit ? null : '1' })}>
        <Icone nom="users" taille={15} />
        {t('Critiques seulement')}
      </button>
      <span className="sp"></span>
      <span className="lock">
        <Icone nom="globe" taille={15} /> {t('Espace pays : Cameroun · XAF')}
      </span>
    </>
  )
  return (
    <>
      <div className="mt16">
        <Table
          legende={t('Catalogue des paramètres')}
          outils={outils}
          rows={liste.slice(0, n)}
          cle={(x) => x.code}
          ligneCls={(x) => (choisi?.code === x.code ? 'sel' : x.statut === 'À trancher' ? 'warn' : undefined)}
          vide={<AucunResultat effacer={effacer} />}
          cols={[
            {
              k: 'p',
              t: t('Paramètre'),
              main: true,
              rendu: (x) => (
                <button type="button" className="s5-lien" onClick={() => aller({ code: x.code })} aria-current={choisi?.code === x.code ? 'true' : undefined}>
                  <span className="b8 mono">{codeVu(x.code)}</span>
                  <span className="t2">
                    {t(court(x.famille))}
                    {x.critique && <> · <Critique /></>}
                  </span>
                </button>
              ),
            },
            { k: 'v', t: t('Valeur'), rendu: (x) => <span className="b8">{x.valeur}{x.unite && !x.valeur.includes(x.unite) ? ` ${x.unite}` : ''}</span> },
            { k: 's', t: t('Statut'), rendu: (x) => <StatutPill s={x.statut} /> },
            { k: 'ver', t: t('Version'), hideM: true, rendu: (x) => <>{`v${x.version}`}{x.annoncee && <> · <Pill ton="violet" sm>{tf('v{v} annoncée', { v: x.annoncee.version })}</Pill></>}{x.propositionOuverte && <> · <Pill ton="blue" sm>{x.propositionOuverte}</Pill></>}</> },
            { k: 'eff', t: t('Date d’effet'), hideM: true, rendu: (x) => <DateEffet x={x} /> },
          ]}
          pied={
            <>
              <span>{tf('{n} paramètres affichés sur {total}', { n: Math.min(n, liste.length), total: params.length })}</span>
              <span>
                <Icone nom="lock" taille={13} /> {t('Aucune modification possible hors de cette console')}
              </span>
            </>
          }
        />
        {liste.length > n && (
          <div className="s5-plus">
            <button type="button" className="btn secondary sm" onClick={() => setN(n + PAGE)}>
              <Icone nom="chevron-down" taille={16} />
              {tf('Afficher {n} de plus', { n: Math.min(PAGE, liste.length - n) })}
            </button>
          </div>
        )}
      </div>
      <div className="g g2">
        {choisi && <Fiche x={choisi} />}
      </div>
    </>
  )
}

function DateEffet({ x }: { x: ParametreVu }) {
  const { t } = usePreferences()
  const d = useDates()
  return <>{x.annoncee ? d.annee(x.annoncee.dateEffet) : x.depuis ? d.annee(x.depuis) : t('registre en vigueur')}</>
}

function Fiche({ x }: { x: ParametreVu }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const peut = usePeut('parametre.proposer')
  const versions = useLecture(() => source.pilotage.versions(x.code), [x.code])
  const v = versions.donnees ?? []
  return (
    <Panel titre={codeVu(x.code)} icone="percent">
      <div className="row wrap" style={{ gap: 6 }}>
        <StatutPill s={x.statut} />
        {x.critique && (
          <Pill ton="violet" sm icone="users">
            {t('Paramètre critique')}
          </Pill>
        )}
        <Pill ton="ink" sm>
          {t('Cameroun')}
        </Pill>
      </div>
      <div className="mt12">
        <Props
          paires={[
            [t('Valeur'), x.valeur + (x.unite && !x.valeur.includes(x.unite) ? ` ${x.unite}` : '')],
            [t('Version en vigueur'), x.depuis ? tf('v{v} · depuis le {d}', { v: x.version, d: d.annee(x.depuis) }) : tf('v{v} · registre en vigueur', { v: x.version })],
            [t('Famille'), t(court(x.famille))],
            [t('Propriétaire'), t('Direction')],
            [t('Se propose'), x.proposable ? t('par pas imposés, avec simulation') : t('valeur écrite : par décision écrite')],
          ]}
        />
      </div>
      {x.annoncee && (
        <Note ton="violet" icone="calendar-check" className="mt12">
          {tf('v{v} annoncée : {val}, en vigueur le {d}.', { v: x.annoncee.version, val: x.annoncee.valeur, d: d.annee(x.annoncee.dateEffet) })}
        </Note>
      )}
      <Divide>{t('Historique')}</Divide>
      {v.length ? (
        <Frise items={v.map((y) => ({ t: tf('v{v} · {val}', { v: y.version, val: y.valeur }), d: `${d.annee(y.dateEffet)} · ${y.par}${y.validePar ? ' · ' + y.validePar : ''}${y.reference ? ' · ' + y.reference : ''}`, st: y.etat === 'annoncee' ? 'cur' : 'done' }))} />
      ) : (
        <p className="t13 c3">{t('v1 : valeur du registre officiel, aucune autre version.')}</p>
      )}
      <div className="row wrap mt12" style={{ gap: 8 }}>
        {peut && x.proposable && !x.propositionOuverte && (
          <Link className="btn primary auto" to={chemin('parametrage', { s: 'simulation', code: x.code })}>
            <Icone nom="square-pen" taille={18} />
            <span>{t('Proposer un changement')}</span>
          </Link>
        )}
        {x.propositionOuverte && (
          <Link className="btn secondary auto" to={chemin('parametrage', { s: 'simulation', id: x.propositionOuverte })}>
            <Icone nom="flask-conical" taille={18} />
            <span>{tf('Voir {id}', { id: x.propositionOuverte })}</span>
          </Link>
        )}
        <Link className="btn ghost auto" to={chemin('journal')}>
          <Icone nom="scroll-text" taille={18} />
          <span>{t('Journal d’audit')}</span>
        </Link>
      </div>
    </Panel>
  )
}

// ── Simulation ─────────────────────────────────────────────────────────────────────────────────────────────────────
function Simulation({ params, props, aller, relire }: { params: ParametreVu[]; props: PropositionParametre[]; aller: (o: Record<string, string | null>) => void; relire: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const n = useHorloge()
  const navig = useNavigate()
  const peut = usePeut('parametre.proposer')
  const [sp] = useSearchParams()
  const pid = sp.get('id')
  const courante = props.find((x) => x.id === pid) ?? null
  const code = courante?.code ?? sp.get('code') ?? ''
  const x = params.find((y) => y.code === code) ?? null
  const forme = x ? formeValeur(x.valeur, x.unite) : null
  const minJour = jourDe(dateEffetMin(n, R.preavisJ) + JOUR)
  const [valeur, setValeur] = useState<string>(() => (courante ? String(courante.apresN) : forme && forme.genre !== 'texte' ? String(forme.n) : ''))
  const [jour, setJour] = useState(() => (courante ? jourDe(courante.dateEffet) : minJour))
  const [motif, setMotif] = useState(courante?.motif ?? '')
  const [reference, setReference] = useState(courante?.reference ?? '')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const proposables = params.filter((y) => y.proposable && (s.role !== 'operations' || !y.critique))
  const mien = courante && courante.par.agentId === s.agent?.id
  const simuler = async () => {
    if (!x) return
    setEnvoi(true)
    setErreur(null)
    const [a, m, j] = jour.split('-').map(Number)
    try {
      const r = await source.pilotage.preparer({ code: x.code, apres: Number(valeur.replace(',', '.')), dateEffet: yaounde(a, m, j), motif, reference })
      if (!r.ok) setErreur(t(RAISONS[r.raison] ?? 'Refusé.'))
      else aller({ id: r.id, code: null })
    } catch {
      setErreur(t('La simulation n’a pas pu être enregistrée. Réessayez.'))
    } finally {
      setEnvoi(false)
      relire()
    }
  }
  const geste = async (f: () => Promise<{ ok: boolean; raison?: string }>, apres?: () => void) => {
    setEnvoi(true)
    setErreur(null)
    try {
      const r = await f()
      if (!r.ok) setErreur(t(RAISONS[r.raison ?? ''] ?? 'Refusé.'))
      else apres?.()
    } catch {
      setErreur(t('La décision n’a pas pu être enregistrée. Rien n’a été appliqué : réessayez.'))
    } finally {
      setEnvoi(false)
      relire()
    }
  }
  const bloquee = courante?.etat === 'bloquee'
  return (
    <>
      {bloquee && (
        <Banniere ton="red" icone="octagon-alert" className="mt16" role="alert">
          <b>{tf('Validation bloquée : {n} contrôle(s) en échec.', { n: courante!.simulation.controles.filter((c) => !c.ok).length })}</b> {tf('Le paramètre {c} ne peut pas être appliqué à {v}.', { c: courante!.code, v: courante!.apres })}
        </Banniere>
      )}
      <Etapes etapes={ETAPES} cur={courante && courante.etat !== 'retiree' ? 1 : 0} />
      <div className="g g12">
        <div>
          <Panel titre={t('La proposition')} icone="square-pen">
            {!peut ? (
              <Interdit roles={['superviseur', 'finance', 'operations']} quoi="Proposer un changement de paramètre" />
            ) : (
              <>
                <label className="s5-champ s5-sel">
                  <span>{t('Paramètre')}</span>
                  <select value={code} onChange={(e) => (aller({ code: e.target.value, id: null }), setValeur(''))}>
                    <option value="">{t('Choisir un paramètre chiffré…')}</option>
                    {proposables.map((y) => (
                      <option key={y.code} value={y.code}>
                        {`${codeVu(y.code)} · ${y.valeur}`}
                      </option>
                    ))}
                  </select>
                </label>
                {x && forme && forme.genre !== 'texte' && (
                  <>
                    <div className="row wrap mt10" style={{ gap: 6 }}>
                      <span className="mono b8">{codeVu(x.code)}</span>
                      <StatutPill s={x.statut} />
                      {x.critique ? (
                        <Pill ton="violet" sm icone="users">
                          {t('Critique · quatre yeux')}
                        </Pill>
                      ) : (
                        <Pill ton="ink" sm>
                          {t('Non critique : appliqué à la soumission')}
                        </Pill>
                      )}
                    </div>
                    <label className="s5-champ s5-num">
                      <span>{tf('Valeur proposée (en vigueur : {v})', { v: x.valeur })}</span>
                      <span className="s5-ligne">
                        <input type="number" inputMode="decimal" step={forme.pas} min={forme.pas} value={valeur} onChange={(e) => setValeur(e.target.value)} />
                        <span className="t13 c3">{forme.genre === 'montant' ? t('pas de 50 F') : forme.genre === 'pourcent' ? t('pas de 0,5 point') : t('pas de 1')}</span>
                      </span>
                    </label>
                    <label className="s5-champ">
                      <span>{t('Date d’effet')}</span>
                      <input type="date" min={minJour} value={jour} onChange={(e) => setJour(e.target.value)} />
                      <span className="t12 c3">{tf('Au plus tôt {j} jours après l’annonce aux partenaires.', { j: R.preavisJ })}</span>
                    </label>
                    {exigeReference(x.statut) && (
                      <label className="s5-champ">
                        <span>{t('Référence de la décision écrite (obligatoire : paramètre « Décidé »)')}</span>
                        <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="DP-68" />
                      </label>
                    )}
                    <div className="mt12">
                      <ChampMotif valeur={motif} changer={setMotif} lignes={4} />
                    </div>
                    <div className="btns mt12">
                      <button type="button" className="btn primary" disabled={envoi || !valeur} onClick={() => void simuler()}>
                        <Icone nom="flask-conical" taille={18} />
                        <span>{t('Simuler sur 30 jours')}</span>
                      </button>
                    </div>
                  </>
                )}
                {x && forme?.genre === 'texte' && <Note ton="ink" icone="info" className="mt12">{t('Valeur écrite en mots : elle change par décision écrite, pas ici.')}</Note>}
              </>
            )}
            {erreur && (
              <p className="e-erreur mt10" role="alert">
                <Icone nom="triangle-alert" taille={16} />
                {erreur}
              </p>
            )}
          </Panel>
          {bloquee && (
            <Panel titre={t('Pourquoi c’est bloqué')} icone="shield-alert" style={{ marginTop: 16 }}>
              {courante!.simulation.controles
                .filter((c) => !c.ok)
                .map((c) => (
                  <Coche key={c.id} ok={false} mauvais>
                    {tf(CONTROLE[c.id], { j: R.preavisJ, n: R.motifMin })}
                  </Coche>
                ))}
            </Panel>
          )}
        </div>
        <div>{courante ? <Resultat p={courante} /> : <Vide icone="flask-conical" t={t('Aucune simulation en cours')} s={t('Choisissez un paramètre, une valeur et une date d’effet, puis simulez : rien n’est soumis avant.')} />}</div>
      </div>
      {courante && <CasTypes cas={courante.simulation.cas} avant={courante.simulation.avant} />}
      {courante && (courante.etat === 'simulee' || courante.etat === 'bloquee') && (
        <div className="admp-bar">
          {courante.etat === 'bloquee' ? (
            <Note ton="red" icone="octagon-alert">
              <b>{t('Rien n’est soumis.')}</b> {t('Corrigez la valeur ou abandonnez ; la simulation reste dans l’historique avec son résultat.')}
            </Note>
          ) : courante.critique ? (
            <QuatreYeux>{t('Paramètre critique : la validation revient à une autre personne que vous, Direction ou Finance ; le serveur le vérifie.')}</QuatreYeux>
          ) : (
            <Note ton="ink" icone="info">
              {t('Paramètre non critique : la nouvelle version est créée à la soumission, avec sa date d’effet.')}
            </Note>
          )}
          {mien ? (
            <div className="row wrap" style={{ gap: 8 }}>
              <button type="button" className="btn ghost auto" disabled={envoi} onClick={() => void geste(() => source.pilotage.retirer(courante.id), () => aller({ id: null }))}>
                <Icone nom="x" taille={18} />
                <span>{t('Abandonner')}</span>
              </button>
              <button type="button" className="btn primary auto" disabled={envoi || courante.etat === 'bloquee'} title={courante.etat === 'bloquee' ? t('La simulation bloque la validation.') : undefined} onClick={() => void geste(() => source.pilotage.soumettre(courante.id), () => navig(chemin('parametrage', { s: courante.critique ? 'quatre-yeux' : 'applique' })))}>
                <Icone nom={courante.etat === 'bloquee' ? 'lock' : courante.critique ? 'send' : 'check'} taille={18} />
                <span>{courante.critique ? t('Soumettre à quatre yeux') : t('Appliquer la nouvelle version')}</span>
              </button>
            </div>
          ) : (
            <p className="t13 c3">{tf('Proposition de {nom} : seul le demandeur la soumet.', { nom: courante.par.nom })}</p>
          )}
        </div>
      )}
      {courante && courante.etat !== 'simulee' && courante.etat !== 'bloquee' && (
        <Note ton="ink" icone="info" className="mt16">
          {tf('{id} est {etat}.', { id: courante.id, etat: t(ETAT_PP[courante.etat][0]).toLowerCase() })}
        </Note>
      )}
      <Simulations props={props.filter((y) => y.etat === 'simulee' || y.etat === 'bloquee')} />
    </>
  )
}

function Resultat({ p }: { p: PropositionParametre }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const s = p.simulation
  const bloquee = p.etat === 'bloquee'
  return (
    <>
      <div className={'hero ' + (bloquee ? 'red' : 'night')} style={{ marginTop: 0 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="hk">{bloquee ? t('Validation bloquée') : t('Rejeu des 30 derniers jours')}</span>
          <Pill ton="dk" icone={s.negatifs ? 'octagon-alert' : 'circle-check'}>
            {s.negatifs ? tf('{n} cas types en marge négative', { n: s.negatifs }) : t('Aucun cas type en marge négative')}
          </Pill>
        </div>
        <div className="ht">{`${p.code} : ${p.avant} → ${p.apres}`}</div>
        <div className="hs">{tf('Date d’effet : {d}. Simulée par {nom} à {h}.', { d: d.annee(p.dateEffet), nom: p.par.nom, h: d.heure(p.par.le) })}</div>
        <div className="money4 admp-m4">
          <Mini l={t('Cas types rejoués')} v={s.cas.length} s={tf('{z} zones exploitées', { z: R.zones.length })} />
          <Mini l={t('Marges négatives')} v={s.negatifs} s={tf('marge de sécurité {m} %', { m: R.margeSecuritePct })} />
          <Mini l={t('Plafond d’achat S relais')} v={`${F(s.plafondS)} F`} s={t('(prix − part du gérant) ÷ 1,1')} />
          <Mini l={t('Grille sous contrat')} v={s.grilleAuDessus ? t('refusée') : t('acceptée')} s={tf('{p} F par colis (1 à 4)', { p: F(R.tourneeYafé[0]) })} />
        </div>
      </div>
      <Panel titre={t('Ce que la simulation vérifie')} icone="list-checks" style={{ marginTop: 16 }}>
        {s.controles.map((c) => (
          <Coche key={c.id} ok={c.ok} mauvais>
            {tf(CONTROLE[c.id], { j: R.preavisJ, n: R.motifMin })}
          </Coche>
        ))}
        <Coche ok={p.etat === 'appliquee'}>{p.critique ? t('Seconde validation : à venir') : t('Application à la soumission')}</Coche>
      </Panel>
    </>
  )
}

function CasTypes({ cas, avant }: { cas: CasType[]; avant: CasType[] }) {
  const { t, tf } = usePreferences()
  const lignes = [...new Set(cas.map((c) => c.mode + c.tranche))]
  return (
    <Panel titre={tf('Cas types logistiques · marge après {m} % de sécurité', { m: R.margeSecuritePct })} icone="grid-3x3" style={{ marginTop: 16 }}>
      <div className="s5-wrap">
        <table className="s5-mx">
          <thead>
            <tr>
              <th scope="col">{t('Cas type (colis S)')}</th>
              {R.zones.map((z) => (
                <th key={z.code} scope="col">{`${z.code} ${z.nom}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => {
              const c0 = cas.find((c) => c.mode + c.tranche === l)!
              return (
                <tr key={l}>
                  <td>{c0.mode === 'relais' ? tf('Relais · tournée de {n} colis · {p} F', { n: c0.tranche, p: F(c0.prix) }) : tf('Domicile · {p} F', { p: F(c0.prix) })}</td>
                  {R.zones.map((z) => {
                    const c = cas.find((x) => x.mode + x.tranche === l && x.zone === z.code)!
                    const a = avant.find((x) => x.id === c.id)
                    return (
                      <td key={z.code} className={c.marge < 0 ? 'neg' : 'pos'}>
                        {`${c.marge < 0 ? '−' : '+'}${F(Math.abs(c.marge))} F`}
                        {a && a.marge !== c.marge && <span className="t12 c3" style={{ display: 'block' }}>{tf('avant {v} F', { v: F(a.marge) })}</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="t12 c3 mt8">{t('Marge = prix client − (part du gérant + prix d’achat) × (1 + marge de sécurité). Prix d’achat : grille de l’entreprise sous contrat (registre). Une baisse de prix ciblée se finance par le budget de croissance, jamais par une marge négative.')}</p>
    </Panel>
  )
}

function Simulations({ props }: { props: PropositionParametre[] }) {
  const { t } = usePreferences()
  const d = useDates()
  if (!props.length) return null
  return (
    <Panel titre={t('Simulations en cours')} icone="flask-conical" style={{ marginTop: 16 }}>
      {props.map((p) => (
        <Link key={p.id} className="li" to={chemin('parametrage', { s: 'simulation', id: p.id })}>
          <span className={'ic ' + (p.etat === 'bloquee' ? 'red' : 'acc')}>
            <Icone nom={p.etat === 'bloquee' ? 'octagon-alert' : 'flask-conical'} taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>{`${p.id} · ${p.code} : ${p.avant} → ${p.apres}`}</span>
            <span className="ls" style={{ display: 'block' }}>{`${p.par.nom} · ${d.complet(p.par.le)}`}</span>
          </span>
          <Pill ton={ETAT_PP[p.etat][1]} sm>
            {t(ETAT_PP[p.etat][0])}
          </Pill>
        </Link>
      ))}
    </Panel>
  )
}

// ── Quatre yeux ────────────────────────────────────────────────────────────────────────────────────────────────────
function QuatreYeuxVue({ props, cartes, erreur, relire }: { props: PropositionParametre[]; cartes: Awaited<ReturnType<typeof source.quatreyeux.enAttente>>; erreur: Error | null; relire: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const d = useDates()
  const duree = useDuree()
  const n = useHorloge()
  const pendantes = props.filter((p) => p.etat === 'a_contresigner')
  const bascules = cartes.filter((c) => c.action.startsWith('interrupteur.'))
  const [envoi, setEnvoi] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const retirer = async (id: string) => {
    setEnvoi(true)
    const r = await source.pilotage.retirer(id)
    setMsg(r.ok ? t('Demande retirée et journalisée.') : t(RAISONS[r.raison] ?? 'Refusé.'))
    setEnvoi(false)
    relire()
  }
  return (
    <>
      {pendantes.length + bascules.length > 0 && (
        <Banniere ton="acc" icone="users" className="mt16">
          <b>{tf('{n} demande(s) à quatre yeux en attente', { n: pendantes.length + bascules.length })}</b> · {t('paramètres critiques et interrupteurs.')}
        </Banniere>
      )}
      <Etapes etapes={ETAPES} cur={2} />
      {msg && <Note ton="ink" icone="info" className="mt12" role="status">{msg}</Note>}
      {!pendantes.length && !bascules.length && <Vide icone="users" t={t('Aucune demande à quatre yeux')} s={t('Une proposition critique soumise apparaît ici, avec sa simulation, jusqu’à la décision du second validateur.')} />}
      {pendantes.map((p) => {
        const carte = cartes.find((c) => c.id === p.quatreYeux)
        const moi = p.par.agentId === s.agent?.id
        return (
          <section key={p.id} className="mt16" aria-label={p.id}>
            <div className="g g2">
              <div className="hero night" style={{ marginTop: 0 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="hk">{tf('Demande à quatre yeux · {c}', { c: p.code })}</span>
                  {p.expireLe && (
                    <Pill ton="dk" icone="hourglass">
                      {p.expireLe > n ? tf('Expire dans {d}', { d: duree(p.expireLe - n) }) : t('Échue')}
                    </Pill>
                  )}
                </div>
                <div className="ht">{`${p.avant} → ${p.apres}`}</div>
                <div className="hs">{tf('En vigueur le {d}, annoncée aux partenaires {j} jours avant au moins.', { d: d.annee(p.dateEffet), j: R.preavisJ })}</div>
                <div className="hline"></div>
                <Kv k={t('Demandeur')} v={`${p.par.nom} · ${d.complet(p.par.le)}`} />
                <Kv k={t('Second validateur')} v={t('Direction ou Finance, une autre personne')} />
                <Kv k={t('Référence')} v={p.reference || t('aucune (paramètre « Proposé »)')} />
              </div>
              <Panel titre={t('Ce qui change')} icone="git-compare">
                <Kv k={t('Avant')} v={p.avant} />
                <Kv k={t('Après')} v={<b className="cacc">{p.apres}</b>} />
                <Divide>{t('Motif du demandeur')}</Divide>
                <p className="t13 c2 s5-texte">{`« ${p.motif} »`}</p>
                <Divide>{t('Simulation jointe')}</Divide>
                <div className="tiles" style={{ marginTop: 0 }}>
                  <div className={'tile' + (p.simulation.negatifs ? '' : ' green')}>
                    <div className="tk">{t('Cas types')}</div>
                    <div className="tv" style={{ fontSize: 22 }}>{`${p.simulation.cas.length - p.simulation.negatifs} / ${p.simulation.cas.length}`}</div>
                    <div className="ts">{t('sans marge négative')}</div>
                  </div>
                  <div className="tile">
                    <div className="tk">{t('Contrôles')}</div>
                    <div className="tv" style={{ fontSize: 22 }}>{`${p.simulation.controles.filter((c) => c.ok).length} / ${p.simulation.controles.length}`}</div>
                    <div className="ts">{t('au moment de la soumission')}</div>
                  </div>
                </div>
                <Link className="btn secondary mt12" to={chemin('parametrage', { s: 'simulation', id: p.id })}>
                  <Icone nom="flask-conical" taille={18} />
                  <span>{t('Revoir la simulation')}</span>
                </Link>
              </Panel>
            </div>
            <div className="g g2">
              {carte ? (
                <CarteQuatreYeux d={carte} apres={relire} />
              ) : (
                <ErreurLecture erreur={erreur} relire={relire} quoi="Contresigner" />
              )}
              <Panel titre={moi ? t('Vous êtes le demandeur') : t('Suivi de la demande')} icone="user-check">
                {moi && <p className="t13 c2">{t('Vous ne pouvez pas valider votre propre demande, même sous un autre rôle : le serveur le refuse.')}</p>}
                <Frise
                  items={[
                    { t: t('Simulation lancée'), d: d.complet(p.par.le), st: 'done' },
                    { t: t('Soumise à quatre yeux'), d: tf('motif de {n} caractères', { n: p.motif.length }), st: 'done' },
                    { t: t('Second validateur prévenu'), d: t('carte dans la file des quatre yeux de la Direction et de la Finance'), st: 'done' },
                    { t: t('Expiration sans seconde validation'), d: p.expireLe ? d.complet(p.expireLe) : '', st: 'cur' },
                  ]}
                />
                {moi && (
                  <div className="row wrap mt12" style={{ gap: 8 }}>
                    <button type="button" className="btn ghost auto" disabled={envoi} onClick={() => void retirer(p.id)}>
                      <Icone nom="undo-2" taille={18} />
                      <span>{t('Retirer la demande')}</span>
                    </button>
                  </div>
                )}
              </Panel>
            </div>
          </section>
        )
      })}
      {bascules.length > 0 && (
        <>
          <h2 className="sec">{t('Interrupteurs à contresigner')}</h2>
          <div className="g g2">
            {bascules.map((c) => (
              <CarteQuatreYeux key={c.id} d={c} apres={relire} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ── Historique ─────────────────────────────────────────────────────────────────────────────────────────────────────
function Historique({ props }: { props: PropositionParametre[] }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const ouverte = useRouteOuverte()
  const versions = useLecture(() => source.pilotage.versions(), [])
  const v = versions.donnees ?? []
  const derniere = v[0]
  const closes = props.filter((p) => ['refusee', 'expiree', 'retiree'].includes(p.etat))
  const ETAT_V: Record<string, [string, Ton]> = { annoncee: ['Annoncée', 'violet'], en_vigueur: ['En vigueur', 'green'], remplacee: ['Remplacée', 'ink'] }
  return (
    <>
      <Etapes etapes={ETAPES} cur={derniere?.etat === 'annoncee' ? 4 : 3} />
      {derniere && (
        <div className="hero acc">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="hk">{tf('Appliqué · version v{v} créée', { v: derniere.version })}</span>
            <Pill ton="dk" icone="calendar-check">
              {tf('En vigueur le {d}', { d: d.annee(derniere.dateEffet) })}
            </Pill>
          </div>
          <div className="ht">{`${derniere.code} : ${derniere.avant} → ${derniere.valeur}`}</div>
          <div className="hs">{derniere.validePar ? tf('Proposée par {a}, validée par {b}.', { a: derniere.par, b: derniere.validePar }) : tf('Proposée et appliquée par {a} (paramètre non critique).', { a: derniere.par })}</div>
          <div className="money4 admp-m4">
            <Mini l={t('Version')} v={`v${derniere.version}`} s={`${derniere.code} · ${t('Cameroun')}`} />
            <Mini l={t('Date d’effet')} v={d.court(derniere.dateEffet)} s={d.heure(derniere.dateEffet)} />
            <Mini l={t('Annonce')} v={t('cinq espaces')} s={t('pont des applications')} />
            <Mini l={t('Commandes en cours')} v={`v${derniere.version - 1}`} s={t('aucune rétroactivité')} />
          </div>
        </div>
      )}
      <div className="g g21">
        <div>
          <ErreurLecture erreur={versions.erreur} relire={versions.relire} />
          <Table
            legende={t('Historique des versions')}
            rows={v}
            cle={(x) => `${x.code}-${x.version}`}
            vide={<Vide icone="history" t={t('Aucune version créée')} s={t('Toutes les valeurs sont celles du registre officiel (v1).')} />}
            cols={[
              { k: 'v', t: t('Version'), main: true, rendu: (x) => <b>{`${codeVu(x.code)} · v${x.version}`}</b> },
              { k: 'c', t: t('Contenu'), rendu: (x) => `${x.avant} → ${x.valeur}` },
              { k: 'e', t: t('Date d’effet'), rendu: (x) => d.annee(x.dateEffet) },
              { k: 'w', t: t('Demandée · validée'), hideM: true, rendu: (x) => `${x.par}${x.validePar ? ' · ' + x.validePar : ''}${x.reference ? ' · ' + x.reference : ''}` },
              { k: 's', t: t('État'), rendu: (x) => <Pill ton={ETAT_V[x.etat][1]} sm>{t(ETAT_V[x.etat][0])}</Pill> },
            ]}
          />
          {closes.length > 0 && (
            <Panel titre={t('Propositions closes sans version')} icone="archive" style={{ marginTop: 16 }}>
              {closes.map((p) => (
                <div key={p.id} className="li">
                  <span className="grow">
                    <span className="lt" style={{ display: 'block' }}>{`${p.id} · ${p.code} : ${p.avant} → ${p.apres}`}</span>
                    <span className="ls" style={{ display: 'block' }}>{p.second ? `${p.second.nom} : ${p.second.motif}` : p.par.nom}</span>
                  </span>
                  <Pill ton={ETAT_PP[p.etat][1]} sm>{t(ETAT_PP[p.etat][0])}</Pill>
                </div>
              ))}
            </Panel>
          )}
        </div>
        <Panel titre={t('Ce qui suit')} icone="list-checks">
          {ouverte('messagerie') && <LiLien icone="send" titre="Annonce aux partenaires" sous="Diffusion générale, canaux gratuits ; jamais de promotion par SMS" to={chemin('messagerie', { s: 'diffusion' })} />}
          {ouverte('support') && <LiLien icone="book-open" titre="Articles d’aide signalés à mettre à jour" sous="Chaque article qui cite le paramètre est signalé" to={chemin('support', { s: 'articles' })} />}
          {ouverte('journal') && <LiLien icone="scroll-text" titre="Journal d’audit" sous="Avant, après, auteur, rôle, motif, second validateur" to={chemin('journal')} />}
        </Panel>
      </div>
    </>
  )
}
function LiLien({ icone, titre, sous, to }: { icone: string; titre: string; sous: string; to: string }) {
  const { t } = usePreferences()
  return (
    <Link className="li" to={to}>
      <span className="ic acc">
        <Icone nom={icone} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>{t(titre)}</span>
        <span className="ls" style={{ display: 'block' }}>{t(sous)}</span>
      </span>
      <span className="chev">
        <Icone nom="chevron-right" taille={18} />
      </span>
    </Link>
  )
}

// ── Nouveautés EX-01 à EX-06 ───────────────────────────────────────────────────────────────────────────────────────
const ICONE_EX: Record<string, string> = { 'FF-EX01': 'school', 'FF-EX02': 'gift', 'FF-EX03': 'calendar-clock', 'FF-EX04': 'repeat', 'FF-EX05': 'users', 'FF-EX06': 'bot' }
function Nouveautes({ modules, params }: { modules: Awaited<ReturnType<typeof source.pilotage.modules>>; params: ParametreVu[] }) {
  const { t, tf } = usePreferences()
  const ouverte = useRouteOuverte()
  const ex = modules.filter((m) => /^FF-EX/.test(m.code))
  const valeur = (c: string) => params.find((p) => p.code === c)?.valeur ?? '—'
  return (
    <>
      <h2 className="sec">{t('Nouveautés EX-01 à EX-06 · inactives au lancement')}</h2>
      <div className="g g3">
        {ex.map((m) => {
          const atrancher = m.parametres.filter((x) => x.statut === 'À trancher').map((x) => x.code)
          return (
            <div key={m.code} className="admp-mod">
              <div className="row">
                <span className="admp-mi">
                  <Icone nom={ICONE_EX[m.code] ?? 'sparkles'} taille={18} />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="kick">{m.code}</div>
                  <div className="b8 t14">{t(m.libelle)}</div>
                </div>
                <Tg on={m.ouvert} lock libelle={tf('{c} : interrupteur (bascule dans Interrupteurs de fonctions, à quatre yeux)', { c: m.code })} />
              </div>
              <div className="mt8">
                {m.parametres.map((x) => (
                  <div key={x.code} className="admp-pl">
                    <div className="row" style={{ gap: 8 }}>
                      <span className="mono grow">{codeVu(x.code)}</span>
                      <StatutPill s={x.statut} />
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 2 }}>
                      <b>{valeur(x.code)}</b>
                    </div>
                  </div>
                ))}
              </div>
              <div className={'t12 mt8 b7 ' + (atrancher.length ? 'cr' : 'c3')}>
                <Icone nom={atrancher.length ? 'lock' : 'moon'} taille={13} /> {atrancher.length ? tf('Ne peut pas s’ouvrir : {c} à trancher', { c: atrancher.join(', ') }) : t('Fermé au lancement : ouvert plus tard, sur décision')}
              </div>
            </div>
          )
        })}
      </div>
      <details className="a-plie">
        <summary>{t('Les nouveautés réutilisent les règles de base.')}</summary>
        <div className="a-plie-c t13">{t('Zéro espèce pour une commande, argent bloqué, code de retrait unique, relais et livraison inchangés ; la mise de côté est sans intérêt ni frais et le produit n’est remis qu’une fois payé ; BelivaY ne rachète jamais un téléphone ; l’IA WhatsApp propose et attend un « OUI », elle ne paie jamais et n’envoie jamais de code.')}</div>
      </details>
      {ouverte('interrupteurs') && (
        <div className="row mt12">
          <Link className="btn secondary auto" to={chemin('interrupteurs')}>
            <Icone nom="toggle-right" taille={18} />
            <span>{t('Interrupteurs de fonctions')}</span>
          </Link>
        </div>
      )}
    </>
  )
}
