// ADM-P11 · Paliers et Trust Score à valider (prototype route('paliers') : 4 indicateurs, file À valider · Contestée ·
// En observation, proposition à droite — courbe du score avec seuil et seuil de descente, anneau, événements,
// décomposition par critère, croisement des historiques visible AVANT la décision, proposition du système, barre de
// décision — puis « Règles appliquées sur cet écran »). Tous les acteurs : vendeurs, entreprises, livreurs, relais.
// Le système propose, un humain confirme : aucune descente automatique (ADM-TSC-06) ; motif écrit et événements cités ;
// une contestation (une fois, ADM-CACHEE-32) est décidée par une autre personne que l'auteur de la décision.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { BarresH, Note, Panel, Pill, Props, Table } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { PropositionPalier } from '../../donnees/domaines/acteurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge } from '../../session'
import { P3 } from './calculs/regles'
import { Ai, Av, BandeauErreur, BandeauOk, Cases, Chargement, Chk, Controles, CourbeScore, Ev, Item, Kick, NoteConflit, NoteLecture, Partage, Puce, Quand, Radios, Regles, Score, Seen, Tete, Tier, useErreur } from './commun'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { useFonctionsS } from '../ADM-03/kit'

const ESPACE: Record<string, [string, string]> = { vendeur: ['Vendeur', 'store'], livreur: ['Livreur', 'bike'], entreprise: ['Entreprise', 'truck'], relais: ['Point relais', 'package-check'] }
const GROUPES: { etats: PropositionPalier['etat'][]; t: string }[] = [
  { etats: ['a_valider'], t: 'À valider' },
  { etats: ['contestee'], t: 'Contestée' },
  { etats: ['observation'], t: 'En observation · montée automatique' },
  { etats: ['confirmee', 'refusee', 'revue_terrain', 'maintenue', 'annulee'], t: 'Traitées' },
]
const ETAT: Record<PropositionPalier['etat'], [string, 'amber' | 'or' | 'acc' | 'green' | 'ink' | 'red']> = { a_valider: ['Descente proposée', 'amber'], contestee: ['Contestée', 'or'], observation: ['En observation', 'acc'], confirmee: ['Confirmée', 'green'], refusee: ['Refusée', 'ink'], revue_terrain: ['Revue terrain demandée', 'acc'], maintenue: ['Recours : maintenu', 'ink'], annulee: ['Recours : annulé', 'green'] }

export default function Paliers() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const maintenant = useHorloge()
  const droit = useDroit('paliers')
  const lecture = useLecture(() => source.acteurs.paliers(), [])
  const erreur = useErreur(lecture.erreur)
  const [feuille, setFeuille] = useState<'confirmer' | 'refuser' | 'revue_terrain' | 'recours' | null>(null)
  const [fait, setFait] = useState<string | null>(null)
  const l = lecture.donnees ?? []
  const ordre = GROUPES.flatMap((g) => l.filter((p) => g.etats.includes(p.etat)))
  const p = l.find((x) => x.id === params.get('id')) ?? ordre[0] ?? null
  const lien = (id: string) => chemin('paliers', { id })
  const n = (e: PropositionPalier['etat']) => l.filter((x) => x.etat === e).length
  const premier = (e: PropositionPalier['etat']) => l.find((x) => x.etat === e)?.id
  const fonctions = useFonctionsS('paliers', [
    { verbe: 'Valider', n: n('a_valider'), unite: ['descente', 'descentes'], icone: 'trending-down', route: 'paliers', params: premier('a_valider') ? { id: premier('a_valider')! } : undefined, geste: true },
    { verbe: 'Trancher', n: n('contestee'), unite: ['contestation', 'contestations'], icone: 'scale', route: 'paliers', params: premier('contestee') ? { id: premier('contestee')! } : undefined, geste: true, alerte: true },
    { verbe: 'Suivre', n: n('observation'), unite: ['montée en observation', 'montées en observation'], icone: 'trending-up', route: 'paliers', params: premier('observation') ? { id: premier('observation')! } : undefined },
  ])
  return (
    <Ecran
      route="paliers"
      kicker={<Quand le={maintenant} />}
      fonctions={lecture.donnees ? fonctions : undefined}
      actions={
        <Link className="btn secondary" to={chemin('parametrage')}>
          <Icone nom="book-open" taille={18} />
          <span>{t('Règles du moteur')}</span>
        </Link>
      }
    >
      {erreur && <BandeauErreur quoi="Les propositions de palier" relire={lecture.relire} />}
      {fait && (
        <BandeauOk
          bouton={
            <Link className="btn secondary sm" to={chemin('journal')}>
              <Icone nom="scroll-text" taille={16} />
              <span>{t('Voir au journal')}</span>
            </Link>
          }
        >
          {fait}
        </BandeauOk>
      )}
      {!lecture.donnees && !erreur ? (
        <Chargement />
      ) : (
        <Partage
          file={GROUPES.map((g) => {
            const d = l.filter((x) => g.etats.includes(x.etat))
            if (!d.length) return null
            return (
              <div key={g.t} style={{ display: 'contents' }}>
                <Kick className="mt12">{tf('{g} · {n}', { g: t(g.t), n: d.length })}</Kick>
                {d.map((x) => (
                  <Item key={x.id} to={lien(x.id)} on={x.id === p?.id} av={<Av nom={x.acteur} icone={x.espace === 'vendeur' ? undefined : ESPACE[x.espace][1]} />} t={x.acteur} pill={<Pill sm>{t(ESPACE[x.espace][0])}</Pill>} s={`${x.organisation} · Trust ${String(x.score).replace('.', ',')}`} x={<span className="row" style={{ gap: 6 }}><Tier palier={x.de} /><Icone nom="arrow-right" taille={14} /><Tier palier={x.vers} /></span>} xTon="ink" d={x.id} r={t(ETAT[x.etat][0])} />
                ))}
              </div>
            )
          })}
          puces={ordre.map((x) => (
            <Puce key={x.id} to={lien(x.id)} on={x.id === p?.id}>
              {x.acteur}
            </Puce>
          ))}
        >
          {p ? <Proposition p={p} lecture={droit.acces === 'lecture'} ouvrir={setFeuille} /> : <p className="card-s">{t('Aucune proposition en cours.')}</p>}
        </Partage>
      )}
      <Regles
        liste={[
          ['ADM-P11R-01', tf('Montée : seuil tenu {j} jours, automatique. Descente : {e} points sous le seuil {j} jours, puis validation humaine.', { j: P3.hystJ, e: P3.hystEcart })],
          ['ADM-P11R-02', tf('IFA d’un client : jamais avant {n} commandes, jamais sans croisement, jamais automatique.', { n: P3.ifaMinCmd })],
          ['ADM-P11R-03', tf('Un veto plafonne à {v} immédiatement et ouvre un dossier de sanction.', { v: P3.veto })],
          ['ADM-TSC-04', tf('Baisse maximale de {b} points par recalcul ; critères gelés après {g} jours d’inactivité.', { b: P3.baisseMax, g: P3.gelInactifJ })],
          ['ADM-TSC-06', 'Le système propose, un humain valide, avec le croisement des historiques affiché.'],
          ['ADM-PRI-03', tf('Toute décision défavorable exige un motif écrit de {n} caractères au moins.', { n: P3.motifMin })],
        ]}
      />
      {p && (
        <Feuilles
          key={p.id}
          p={p}
          feuille={feuille}
          fermer={() => setFeuille(null)}
          fait={(m) => {
            setFait(m)
            lecture.relire()
          }}
        />
      )}
    </Ecran>
  )
}

function Proposition({ p, lecture, ouvrir }: { p: PropositionPalier; lecture: boolean; ouvrir: (f: 'confirmer' | 'refuser' | 'revue_terrain' | 'recours') => void }) {
  const { t, tf } = usePreferences()
  return (
    <>
      <Panel>
        <Tete
          av={<Av nom={p.acteur} icone={p.espace === 'vendeur' ? undefined : ESPACE[p.espace][1]} taille={56} />}
          nom={p.acteur}
          sous={p.organisation}
          pills={
            <>
              <Pill sm>{t(ESPACE[p.espace][0])}</Pill>
              <Tier palier={p.de} />
              <Icone nom="arrow-right" taille={16} />
              <Tier palier={p.vers} />
              <Pill sm dot ton={ETAT[p.etat][1]}>
                {t(ETAT[p.etat][0])}
              </Pill>
            </>
          }
          droite={
            <>
              <div className="t12 c3 b7">{t('Carte Score')}</div>
              <div className="b8 t15">
                <Quand le={p.creeeLe} />
              </div>
              <div className="t12 c3 b7">{p.id}</div>
            </>
          }
        />
        {p.conflit && <NoteConflit />}
        <div className="s3-g2" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', alignItems: 'center' }}>
          <CourbeScore valeurs={p.historique} seuil={p.seuil} descente={p.seuilDescente} aria={tf('Trust Score sur 30 jours, de {a} à {b}', { a: p.historique[0], b: p.historique.at(-1)! })} />
          <div className="admk-bigscore" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
            <Score v={p.score} seuil={p.seuil} taille={96} />
            <div className="d">
              <b>{tf('Trust Score {v}', { v: String(p.score).replace('.', ',') })}</b>
              {p.seuil !== null && <> · {tf('seuil {s}', { s: p.seuil })}</>}
              <br />
              {p.seuilDescente !== null && tf('Seuil de descente : {s}', { s: p.seuilDescente })}
              <br />
              {p.seuilDescente !== null && p.sens === 'descente' && <b>{tf('Sous le seuil depuis {n} jour(s) (il en faut {j})', { n: p.joursSous, j: P3.hystJ })}</b>}
            </div>
          </div>
        </div>
        <div className="admk-legend">
          <span>
            <i style={{ background: 'var(--acc)' }}></i>
            {t('Trust Score')}
          </span>
          <span>
            <i style={{ background: 'var(--red)' }}></i>
            {t('Seuil du palier')}
          </span>
          <span>
            <i style={{ background: 'var(--amber)' }}></i>
            {t('Seuil de descente')}
          </span>
          <span>{tf('Baisse maximale par recalcul : {n} points', { n: P3.baisseMax })}</span>
        </div>
      </Panel>
      <div className="s3-g2">
        <Panel titre={t('Événements qui expliquent la proposition')} icone="list-tree">
          {p.evenements.map((e) => (
            <Ev key={e.id} e={e} />
          ))}
        </Panel>
        <Panel titre={t('Décomposition du score')} icone="chart-bar">
          {p.decomposition.length ? <BarresH lignes={p.decomposition.map((c) => ({ l: t(c.critere), v: c.v, max: c.max, r: `${c.v} / ${c.max}`, ton: c.v / c.max < 0.6 ? 'red' : 'acc' }))} /> : <p className="card-s">{t('Décomposition publiée au prochain recalcul nocturne.')}</p>}
        </Panel>
      </div>
      {!!p.croisement.length && (
        <Panel titre={t('Croisement des historiques')} icone="git-compare-arrows" className="mt16" droite={<Pill ton="acc" sm icone="eye">{t('Visible avant la décision')}</Pill>}>
          <Table
            cle={(c) => c.evenement}
            rows={p.croisement}
            legende={t('Croisement des historiques')}
            cols={[
              { k: 'e', t: t('Événement'), main: true, rendu: (c) => <b>{c.evenement}</b> },
              { k: 'c', t: t('Contrepartie'), rendu: (c) => c.contrepartie },
              { k: 'h', t: t('Historique de la contrepartie'), rendu: (c) => <span className="t12 c2">{c.historique}</span> },
              { k: 'l', t: t('Lecture'), rendu: (c) => <Pill sm ton={c.lecture === 'solide' ? 'green' : 'amber'}>{t(c.lecture === 'solide' ? 'Solide' : 'À relativiser')}</Pill> },
            ]}
          />
        </Panel>
      )}
      {p.contestation && (
        <Panel titre={t('La contestation')} icone="scale" className="mt16">
          <Seen k={t('Texte de l’acteur')}>
            « {p.contestation.texte} » · <Quand le={p.contestation.le} />
          </Seen>
          <div className="mt12">
            <Controles l={p.contestation.constats} />
          </div>
          {p.decision && <Chk ton="info">{tf('Décision contestée : {quoi} · {par}', { quoi: p.decision.quoi, par: p.decision.par })}</Chk>}
          {p.echeance && (
            <div className="t12 c3 mt8">
              {t('À décider avant')} <Quand le={p.echeance} />
            </div>
          )}
        </Panel>
      )}
      {(p.etat === 'a_valider' || p.etat === 'contestee') && (
        <div className="panel mt16" style={{ boxShadow: 'var(--shadow-card), inset 3px 0 0 var(--or)' }}>
          {p.proposition && <Ai texte={p.proposition.texte} confiance={p.proposition.confiance} />}
          {p.conflit ? (
            <NoteConflit />
          ) : lecture ? (
            <NoteLecture texte="Lecture seule : la Direction et la Médiation décident des paliers." />
          ) : p.etat === 'a_valider' ? (
            <div className="admk-dec mt14">
              <button type="button" className="btn primary" onClick={() => ouvrir('confirmer')}>
                <Icone nom="check" taille={18} />
                <span>{t('Confirmer la descente')}</span>
              </button>
              <button type="button" className="btn secondary" onClick={() => ouvrir('refuser')}>
                <Icone nom="x" taille={18} />
                <span>{t('Refuser')}</span>
              </button>
              <button type="button" className="btn ghost" onClick={() => ouvrir('revue_terrain')}>
                <Icone nom="map-pinned" taille={18} />
                <span>{t('Demander une revue terrain')}</span>
              </button>
              <span className="sp"></span>
              <span className="lock t12 c3 b7">
                <Icone nom="lock" taille={14} /> {tf('Motif écrit obligatoire ({n} caractères)', { n: P3.motifMin })}
              </span>
            </div>
          ) : (
            <div className="admk-dec mt14">
              <button type="button" className="btn primary" onClick={() => ouvrir('recours')}>
                <Icone nom="gavel" taille={18} />
                <span>{t('Décider le recours')}</span>
              </button>
              <span className="sp"></span>
              <span className="lock t12 c3 b7">
                <Icone nom="users" taille={14} /> {t('Par une autre personne que l’auteur de la décision')}
              </span>
            </div>
          )}
          <div className="t12 c3 mt10">{tf('Un veto (contrefaçon, faux document, auto-achat, fraude aux preuves) plafonne le score à {v} et ouvre un dossier de sanction. Un acteur inactif depuis {g} jours a ses critères gelés : aucune descente pour inactivité seule.', { v: P3.veto, g: P3.gelInactifJ })}</div>
        </div>
      )}
      {p.etat === 'observation' && (
        <Note ton="acc" icone="calendar-clock" className="mt16">
          {tf('Montée automatique après {j} jours au seuil', { j: P3.hystJ })} {p.echeance && <>({t('au plus tôt')} <Quand le={p.echeance} />)</>}
        </Note>
      )}
      {(p.decision && p.etat !== 'contestee') || p.recours ? (
        <Panel titre={t('Décision')} icone="gavel" className="mt16">
          {p.decision && <Props paires={[[t('Décision'), p.decision.quoi], [t('Auteur'), p.decision.par], [t('Date'), <Quand key="q" le={p.decision.le} />], [t('Motif'), p.decision.motif ?? '—'], [t('Événements cités'), p.evenements.filter((e) => p.decision!.evenements.includes(e.id)).map((e) => e.titre).join(' · ') || '—']]} />}
          {p.recours && <Props paires={[[t('Recours'), p.recours.quoi], [t('Auteur'), p.recours.par], [t('Motif'), p.recours.motif ?? '—']]} />}
          <div className="t12 c3 mt10">{t('L’acteur est prévenu avec le motif et les événements cités ; il peut contester une fois. Aucun score n’est modifié à la main : seul le palier change.')}</div>
        </Panel>
      ) : null}
    </>
  )
}

function Feuilles({ p, feuille, fermer, fait }: { p: PropositionPalier; feuille: string | null; fermer: () => void; fait: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const [evs, setEvs] = useState(p.evenements.map((e) => e.id))
  const [recours, setRecours] = useState<'maintenir' | 'annuler'>('maintenir')
  const vu = <Seen k={tf('Ce que voit {acteur}', { acteur: p.acteur })}>{t('Son nouveau palier, ce motif, les événements cités et un bouton « Contester » (une fois).')}</Seen>
  return (
    <>
      <DecisionMotivee
        ouverte={feuille === 'confirmer'}
        fermer={fermer}
        titre={tf('Confirmer la descente de {acteur}', { acteur: p.acteur })}
        resume={tf('Trust Score {s} · sous le seuil de descente depuis {n} jour(s).', { s: String(p.score).replace('.', ','), n: p.joursSous })}
        libelle="Confirmer la descente"
        vu={vu}
        bloque={evs.length ? null : t('Citez au moins un événement.')}
        envoyer={(m) => source.acteurs.deciderPalier(p.id, { action: 'confirmer', motif: m, evenements: evs })}
        apres={() => fait(tf('Descente confirmée : {acteur} est prévenu avec le motif et les événements cités ; il peut contester une fois.', { acteur: p.acteur }))}
      >
        <Cases legende="Événements cités dans la décision" items={p.evenements.map((e) => ({ id: e.id, t: e.titre }))} cochees={evs} changer={setEvs} />
      </DecisionMotivee>
      <DecisionMotivee ouverte={feuille === 'refuser'} fermer={fermer} titre={t('Refuser la descente')} resume={t('Le palier reste inchangé ; la proposition est close et journalisée.')} libelle="Refuser" icone="x" envoyer={(m) => source.acteurs.deciderPalier(p.id, { action: 'refuser', motif: m, evenements: [] })} apres={() => fait(t('Descente refusée : le palier est inchangé.'))} />
      <DecisionMotivee ouverte={feuille === 'revue_terrain'} fermer={fermer} titre={t('Demander une revue terrain')} resume={t('Les Opérations de la zone vérifient sur place ; la proposition attend leur retour.')} libelle="Demander la revue" icone="map-pinned" motif="facultatif" envoyer={(m) => source.acteurs.deciderPalier(p.id, { action: 'revue_terrain', motif: m, evenements: [] })} apres={() => fait(t('Revue terrain demandée aux Opérations de la zone.'))} />
      <DecisionMotivee
        ouverte={feuille === 'recours'}
        fermer={fermer}
        titre={t('Décider le recours')}
        resume={t('Une contestation par décision ; la décision du recours est motivée et définitive.')}
        libelle="Enregistrer la décision du recours"
        icone="gavel"
        envoyer={(m) => source.acteurs.deciderPalier(p.id, { action: recours, motif: m, evenements: [] })}
        apres={() => fait(t('Décision du recours enregistrée et envoyée à l’acteur.'))}
      >
        <Radios
          nom="Décision"
          valeur={recours}
          choisir={setRecours}
          options={[
            { v: 'maintenir', t: 'Maintenir', s: 'L’événement contesté reste compté' },
            { v: 'annuler', t: 'Annuler l’événement', s: 'Le score est recalculé sans lui ; jamais modifié à la main' },
          ]}
        />
      </DecisionMotivee>
    </>
  )
}
