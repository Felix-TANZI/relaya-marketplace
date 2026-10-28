// ADM-P12 · Sanctions et recours (prototype route('sanctions') : 4 indicateurs, file par état — proposées, à quatre
// yeux, en recours, en vigueur, levées —, dossier à droite : acteur, échelle en 4 marches, déclencheurs, historique,
// décision motivée, liste noire proposée, validation à quatre yeux, recours ; « La même rigueur pour tous » ; règles).
// Niveaux 2 à 4 proposés par le système, décidés par un humain (Médiation, Direction), motif écrit, recours une fois ;
// exclusion et levée de liste noire à quatre yeux (second validateur d'un AUTRE compte, CarteQuatreYeux) ; un recours
// est décidé par une autre personne que l'auteur. Le Support propose, la Médiation décide ; l'Audit lit.
import { LienPoste } from '../../composants/poste/LienPoste'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CarteQuatreYeux } from '../../composants/CarteQuatreYeux'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Barre, Panel, Pill, Props, Table } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { DemandeSanction, EspaceActeur, Sanction } from '../../donnees/domaines/acteurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut, useRouteOuverte } from '../../session'
import { P3 } from './calculs/regles'
import { Ai, Av, BandeauErreur, BandeauOk, Chargement, Chk, Echelle, Ev, Historique, Item, Kick, NoteConflit, NoteLecture, Partage, Puce, Quand, Radios, Regles, Seen, Tete, useErreur } from './commun'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { useFonctionsS } from '../ADM-03/kit'
import { TexteTraduisible } from '@client/traduction/Traduisible'

const ESPACE: Record<EspaceActeur, [string, string]> = { vendeur: ['Vendeur', 'store'], relais: ['Point relais', 'package-check'], entreprise: ['Entreprise', 'truck'], livreur: ['Livreur', 'bike'], client: ['Client', 'user'] }
const GROUPES: { etats: Sanction['etat'][]; t: string }[] = [
  { etats: ['proposee'], t: 'Proposées' },
  { etats: ['quatre_yeux'], t: 'Quatre yeux en attente' },
  { etats: ['recours'], t: 'En recours' },
  { etats: ['vigueur'], t: 'En vigueur' },
  { etats: ['levee', 'classee'], t: 'Levées ou classées' },
]
const ETAT: Record<Sanction['etat'], [string, 'or' | 'amber' | 'red' | 'green' | 'ink']> = { proposee: ['Proposée', 'or'], quatre_yeux: ['Quatre yeux : 1 sur 2', 'amber'], recours: ['En recours', 'red'], vigueur: ['En vigueur', 'red'], levee: ['Levée', 'green'], classee: ['Classée sans suite', 'ink'] }
type Geste = 'valider' | 'niveau_inferieur' | 'classer' | 'recours' | 'lever'

export default function Sanctions() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const maintenant = useHorloge()
  const lecture = useLecture(() => source.acteurs.sanctions(), [])
  const erreur = useErreur(lecture.erreur)
  const [feuille, setFeuille] = useState<Geste | null>(null)
  const [fait, setFait] = useState<string | null>(null)
  const l = lecture.donnees ?? []
  const acteur = params.get('acteur')
  const vues = acteur ? l.filter((s) => s.acteurId === acteur) : l
  const ordre = GROUPES.flatMap((g) => vues.filter((s) => g.etats.includes(s.etat)))
  const s = l.find((x) => x.id === params.get('id')) ?? ordre[0] ?? null
  const n = (e: Sanction['etat']) => l.filter((x) => x.etat === e).length
  const decide = usePeut('sanction.decider')
  const vers = (e: Sanction['etat']) => {
    const x = l.find((y) => y.etat === e)
    return x ? { id: x.id } : undefined
  }
  const fonctions = useFonctionsS('sanctions', [
    { verbe: 'Décider', n: n('proposee'), unite: ['sanction', 'sanctions'], icone: 'gavel', route: 'sanctions', params: vers('proposee'), geste: true, si: decide },
    { verbe: 'Trancher', n: n('recours'), unite: ['recours', 'recours'], icone: 'scale', route: 'sanctions', params: vers('recours'), geste: true, si: decide, alerte: true },
    { verbe: 'Contresigner', n: n('quatre_yeux'), unite: ['exclusion', 'exclusions'], icone: 'users-round', route: 'quatreyeux' },
    { verbe: 'Suivre', n: n('vigueur'), unite: ['sanction en vigueur', 'sanctions en vigueur'], icone: 'ban', route: 'sanctions', params: vers('vigueur') },
  ])
  return (
    <Ecran
      route="sanctions"
      kicker={<Quand le={maintenant} />}
      fonctions={lecture.donnees ? fonctions : undefined}
      actions={
        <>
          <LienPoste genre="sanction" />
          <Link className="btn secondary" to={chemin('fraude')}>
            <Icone nom="shield-alert" taille={18} />
            <span>{t('Fraude et anneaux')}</span>
          </Link>
        </>
      }
    >
      {erreur && <BandeauErreur quoi="Les dossiers de sanction" relire={lecture.relire} />}
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
      {acteur && (
        <div className="row mt12" style={{ gap: 8 }}>
          <Pill sm icone="filter">{tf('Acteur : {a}', { a: vues[0]?.acteur ?? acteur })}</Pill>
          <Link className="btn ghost sm" to={chemin('sanctions')}>
            <Icone nom="x" taille={14} />
            <span>{t('Tous les dossiers')}</span>
          </Link>
        </div>
      )}
      {!lecture.donnees && !erreur ? (
        <Chargement />
      ) : (
        <Partage
          file={
            <>
              {GROUPES.map((g) => {
                const d = vues.filter((x) => g.etats.includes(x.etat))
                if (!d.length) return null
                return (
                  <div key={g.t} style={{ display: 'contents' }}>
                    <Kick className="mt12">{tf('{g} · {n}', { g: t(g.t), n: d.length })}</Kick>
                    {d.map((x) => (
                      <Item key={x.id} to={chemin('sanctions', { id: x.id, acteur: acteur ?? undefined })} on={x.id === s?.id} late={x.etat === 'recours'} av={<Av nom={x.acteur} icone={x.espace === 'vendeur' ? undefined : ESPACE[x.espace][1]} />} t={x.acteur} pill={<Pill sm ton={x.niveau >= 3 ? 'red' : x.niveau === 2 ? 'or' : 'ink'}>{tf('Niveau {n}', { n: x.niveau })}</Pill>} s={`${t(ESPACE[x.espace][0])} · ${x.origine}`} d={x.id} r={t(ETAT[x.etat][0])} />
                    ))}
                  </div>
                )
              })}
              {!ordre.length && <p className="card-s">{t('Aucun dossier de sanction.')}</p>}
            </>
          }
          puces={ordre.map((x) => (
            <Puce key={x.id} to={chemin('sanctions', { id: x.id })} on={x.id === s?.id}>
              {x.acteur}
            </Puce>
          ))}
        >
          {s ? <Dossier s={s} ouvrir={setFeuille} relire={lecture.relire} /> : <p className="card-s">{t('Aucun dossier de sanction.')}</p>}
        </Partage>
      )}
      <Rigueur />
      <Regles
        liste={[
          ['ADM-P12R-01', 'Échelle : 1 avertissement · 2 visibilité réduite · 3 suspension · 4 exclusion et liste noire.'],
          ['ADM-P12R-02', 'Niveaux 2 à 4 proposés par le système, validés par un humain, motif écrit, recours une fois.'],
          ['ADM-P12R-03', 'Un anneau de fraude ouvre une revue, jamais une sanction automatique.'],
          ['ADM-P12R-04', 'Un client n’est jamais banni : il est plafonné.'],
          ['ADM-RG-R18', tf('Exclusion et levée de liste noire à quatre yeux ; la demande expire après {h} heures sans seconde validation.', { h: P3.quatreYeuxH })],
          ['ENT-SAN-03', 'Aucune sanction n’est une amende : BelivaY agit sur l’accès, la priorité, le plafond et le contrat.'],
        ]}
      />
      {s && (
        <Feuilles
          key={s.id}
          s={s}
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

function Dossier({ s, ouvrir, relire }: { s: Sanction; ouvrir: (g: Geste) => void; relire: () => void }) {
  const { t, tf } = usePreferences()
  const peut = usePeut('sanction.decider')
  const ouverte = useRouteOuverte()
  const maintenant = useHorloge()
  const qy = useLecture(() => (s.quatreYeux && ouverte('quatreyeux') ? source.quatreyeux.enAttente() : Promise.resolve([])), [s.quatreYeux?.id])
  const carte = qy.donnees?.find((d) => d.id === s.quatreYeux?.id)
  const avance = s.debut && s.fin ? Math.min(100, Math.max(0, (100 * (maintenant - s.debut)) / (s.fin - s.debut))) : 0
  return (
    <>
      <Panel>
        <Tete
          av={<Av nom={s.acteur} icone={s.espace === 'vendeur' ? undefined : ESPACE[s.espace][1]} taille={56} />}
          nom={s.acteur}
          sous={`${t(ESPACE[s.espace][0])}${s.zone ? ' · ' + s.zone : ''} · ${s.origine}`}
          pills={
            <Pill sm dot ton={ETAT[s.etat][1]}>
              {tf('Niveau {n} · {etat}', { n: s.niveau, etat: t(ETAT[s.etat][0]) })}
            </Pill>
          }
          droite={
            s.fin ? (
              <>
                <div className="t12 c3 b7">{t('Fin')}</div>
                <div className="b8 t15">
                  <Quand le={s.fin} />
                </div>
              </>
            ) : undefined
          }
        />
        <div className="mt14">
          <Echelle niveau={s.niveau} rouge={s.etat === 'vigueur'} />
        </div>
        {s.etat === 'vigueur' && s.debut && s.fin && (
          <div className="mt14">
            <div className="row t12 b7" style={{ justifyContent: 'space-between' }}>
              <span>{t('Sanction en cours')}</span>
              {s.probatoireFin && (
                <span className="c3">
                  {t('Période probatoire jusqu’au')} <Quand le={s.probatoireFin} jour />
                </span>
              )}
            </div>
            <Barre pct={avance} ton="red" aria={tf('{p} % de la durée écoulée', { p: Math.round(avance) })} />
          </div>
        )}
        {s.conflit && <NoteConflit />}
      </Panel>
      <div className="s3-g2">
        <Panel titre={t('Déclencheurs')} icone="zap">
          {s.declencheurs.map((e) => (
            <Ev key={e.id} e={e} />
          ))}
          {!s.declencheurs.length && <p className="card-s">—</p>}
        </Panel>
        <Panel titre={t('Historique')} icone="history">
          {s.historique.length ? <Historique l={s.historique} /> : <p className="card-s">{t('Aucune sanction antérieure.')}</p>}
        </Panel>
      </div>
      {s.listeNoire.length > 0 && (
        <Panel titre={t(s.etat === 'vigueur' ? 'Liste noire active' : 'Liste noire proposée')} icone="shield-ban" className="mt16">
          <Table
            cle={(x) => x.identifiant}
            rows={s.listeNoire}
            legende={t('Liste noire')}
            cols={[
              { k: 'i', t: t('Identifiant'), main: true, rendu: (x) => <b>{x.identifiant}</b> },
              { k: 'v', t: t('Valeur'), rendu: (x) => <span className="mono t13">{x.valeur}</span> },
              { k: 'e', t: t('Effet'), rendu: (x) => <span className="t12 c2">{x.effet}</span> },
            ]}
          />
          <div className="t12 c3 mt10">{t('Un acteur sur la liste noire est refusé sans motif détaillé (une entreprise qui l’inviterait ne saura pas pourquoi).')}</div>
        </Panel>
      )}
      {s.etat === 'quatre_yeux' && (
        <Panel titre={t('Validation à quatre yeux')} icone="users" className="mt16">
          {s.quatreYeux && <Chk ton="ok">{tf('1re validation : {qui}', { qui: s.quatreYeux.premier })}</Chk>}
          <Chk ton="doute">{t('2e validation : Médiation ou Direction, une autre personne que la première ; vérifié par la source')}</Chk>
          {carte ? <div className="mt12"><CarteQuatreYeux d={carte} apres={() => (qy.relire(), relire())} /></div> : (
            <div className="btns mt12">
              <Link className="btn secondary" to={chemin('quatreyeux', { id: s.quatreYeux?.id })}>
                <Icone nom="users" taille={18} />
                <span>{t('Quatre yeux en attente')}</span>
              </Link>
            </div>
          )}
        </Panel>
      )}
      {s.recours && (
        <Panel titre={t('Le recours')} icone="scale" className="mt16">
          <Seen k={t('Texte de l’acteur')}>
            « <TexteTraduisible texte={s.recours.texte} /> » · <Quand le={s.recours.le} />
          </Seen>
          {s.decision && <Chk ton="info">{tf('Décision contestée : {quoi} · {par}', { quoi: s.decision.quoi, par: s.decision.par })}</Chk>}
        </Panel>
      )}
      {(s.etat === 'proposee' || s.etat === 'recours' || s.etat === 'vigueur') && (
        <div className="panel mt16" style={{ boxShadow: 'var(--shadow-card), inset 3px 0 0 var(--or)' }}>
          {s.proposition && <Ai texte={s.proposition.texte} confiance={s.proposition.confiance} />}
          <Seen k={tf('Effet du niveau {n}', { n: s.niveau })} className="mt10">
            {s.effet}
          </Seen>
          {s.conflit ? (
            <NoteConflit />
          ) : !peut ? (
            <NoteLecture texte="Le Support propose ; la Médiation et la Direction décident. L’Audit contrôle sans décider." />
          ) : (
            <div className="admk-dec mt14">
              {s.etat === 'proposee' && (
                <>
                  <button type="button" className="btn primary" onClick={() => ouvrir('valider')}>
                    <Icone nom={s.niveau === 4 ? 'users' : 'gavel'} taille={18} />
                    <span>{tf('Valider le niveau {n}', { n: s.niveau })}</span>
                  </button>
                  {s.niveau > 1 && (
                    <button type="button" className="btn secondary" onClick={() => ouvrir('niveau_inferieur')}>
                      <Icone nom="triangle-alert" taille={18} />
                      <span>{tf('Choisir le niveau {n}', { n: s.niveau - 1 })}</span>
                    </button>
                  )}
                  <button type="button" className="btn ghost" onClick={() => ouvrir('classer')}>
                    <Icone nom="archive" taille={18} />
                    <span>{t('Classer sans suite')}</span>
                  </button>
                </>
              )}
              {s.etat === 'recours' && (
                <button type="button" className="btn primary" onClick={() => ouvrir('recours')}>
                  <Icone nom="gavel" taille={18} />
                  <span>{t('Décider le recours')}</span>
                </button>
              )}
              {s.etat === 'vigueur' && (
                <button type="button" className="btn secondary" onClick={() => ouvrir('lever')}>
                  <Icone nom={s.listeNoire.length ? 'users' : 'lock-open'} taille={18} />
                  <span>{t(s.listeNoire.length ? 'Lever la liste noire' : 'Lever la sanction')}</span>
                </button>
              )}
              <span className="sp"></span>
              <span className="lock t12 c3 b7">
                <Icone nom="lock" taille={14} /> {tf('Motif écrit obligatoire ({n} caractères)', { n: P3.motifMin })}
              </span>
            </div>
          )}
        </div>
      )}
      {s.decision && (
        <Panel titre={t('Décision motivée')} icone="gavel" className="mt16" a={{ t: t('Journal'), to: chemin('journal', { objet: s.id }) }}>
          <Props paires={[[t('Décision'), s.decision.quoi], [t('Auteur'), s.decision.par], [t('Date'), <Quand key="q" le={s.decision.le} />], [t('Motif'), s.decision.motif ?? '—'], [t('Recours'), s.recours ? t('Déposé, à décider') : t('Possible une fois')]]} />
        </Panel>
      )}
    </>
  )
}

function Rigueur() {
  const { t } = usePreferences()
  return (
    <details className="a-plie mt16">
      <summary>{t('La même rigueur pour tous les acteurs')}</summary>
      <div className="a-plie-c">
      <Chk ton="info" icone="bike">
        <b>{t('Livreur en faute')}</b> : {t('la sanction vise le livreur ; l’entreprise n’est touchée que si la faute révèle un défaut de gestion (répétition, formation absente).')}
      </Chk>
      <Chk ton="info" icone="package-check">
        <b>{t('Exclusion d’un relais qui garde des colis')}</b> : {t('tous les colis partent vers le relais de secours avant la prise d’effet.')}
      </Chk>
      <Chk ton="info" icone="shield-alert">
        <b>{t('Anneau de fraude')}</b> : {t('la détection ouvre une revue, jamais une sanction automatique.')}
      </Chk>
      <Chk ton="info" icone="users">
        <b>{t('Client')}</b> : {t('jamais banni ; il est plafonné par son palier IFA.')}
      </Chk>
      <div className="row wrap mt12" style={{ gap: 8 }}>
        <Link className="btn ghost sm" to={chemin('fraude')}>
          <Icone nom="shield-alert" taille={16} />
          <span>{t('Fraude et anneaux')}</span>
        </Link>
        <Link className="btn ghost sm" to={chemin('clients')}>
          <Icone nom="users" taille={16} />
          <span>{t('Clients et IFA')}</span>
        </Link>
        <Link className="btn ghost sm" to={chemin('qualite')}>
          <Icone nom="activity" taille={16} />
          <span>{t('Qualité des acteurs')}</span>
        </Link>
      </div>
      </div>
    </details>
  )
}

function Feuilles({ s, feuille, fermer, fait }: { s: Sanction; feuille: Geste | null; fermer: () => void; fait: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const [recours, setRecours] = useState<'recours_maintenir' | 'recours_reduire' | 'recours_lever'>('recours_reduire')
  const envoyer = (action: DemandeSanction['action']) => async (m: string) => {
    const r = await source.acteurs.deciderSanction(s.id, { action, motif: m })
    return r
  }
  const vu = <Seen k={tf('Ce que voit {acteur}', { acteur: s.acteur })}>{t('La sanction, son niveau, ce motif, la date de fin et un bouton « Faire un recours » (une fois).')}</Seen>
  return (
    <>
      <DecisionMotivee ouverte={feuille === 'valider'} fermer={fermer} titre={tf('Valider le niveau {n} · {acteur}', { n: s.niveau, acteur: s.acteur })} resume={s.effet} libelle={tf('Valider le niveau {n}', { n: s.niveau })} icone="gavel" danger={s.niveau >= 3} quatreYeux={s.niveau === 4} vu={vu} envoyer={envoyer('valider')} apres={() => fait(s.niveau === 4 ? t('Première validation enregistrée : l’exclusion attend le second validateur d’un autre compte.') : t('Sanction validée : l’acteur est prévenu avec le motif et son recours.'))} />
      <DecisionMotivee ouverte={feuille === 'niveau_inferieur'} fermer={fermer} titre={tf('Choisir le niveau {n}', { n: s.niveau - 1 })} resume={t('Le niveau inférieur s’applique tout de suite, avec le même recours.')} libelle={tf('Valider le niveau {n}', { n: s.niveau - 1 })} icone="gavel" vu={vu} envoyer={envoyer('niveau_inferieur')} apres={() => fait(t('Niveau inférieur validé.'))} />
      <DecisionMotivee ouverte={feuille === 'classer'} fermer={fermer} titre={t('Classer sans suite')} resume={t('Aucune sanction ; le dossier et son motif restent au journal.')} libelle="Classer sans suite" icone="archive" envoyer={envoyer('classer')} apres={() => fait(t('Dossier classé sans suite.'))} />
      <DecisionMotivee ouverte={feuille === 'lever'} fermer={fermer} titre={t(s.listeNoire.length ? 'Lever la liste noire' : 'Lever la sanction')} resume={t('La levée est motivée et journalisée ; une liste noire ne se lève qu’à quatre yeux.')} libelle="Lever" icone="lock-open" quatreYeux={s.listeNoire.length > 0} envoyer={envoyer('lever')} apres={() => fait(t('Levée enregistrée.'))} />
      <DecisionMotivee
        ouverte={feuille === 'recours'}
        fermer={fermer}
        titre={t('Décider le recours')}
        resume={t('Décision motivée et définitive ; par une autre personne que l’auteur de la sanction.')}
        libelle="Enregistrer la décision du recours"
        icone="gavel"
        envoyer={async (m) => source.acteurs.deciderSanction(s.id, { action: recours, motif: m })}
        apres={() => fait(t('Décision du recours enregistrée et envoyée à l’acteur.'))}
      >
        <Radios
          nom="Décision"
          valeur={recours}
          choisir={setRecours}
          options={[
            { v: 'recours_maintenir', t: tf('Maintenir le niveau {n}', { n: s.niveau }) },
            { v: 'recours_reduire', t: tf('Réduire au niveau {n}', { n: Math.max(1, s.niveau - 1) }), s: 'Correction faite avant la décision du recours' },
            { v: 'recours_lever', t: 'Lever la sanction', s: 'Aucune trace de sanction active' },
          ]}
        />
      </DecisionMotivee>
    </>
  )
}
