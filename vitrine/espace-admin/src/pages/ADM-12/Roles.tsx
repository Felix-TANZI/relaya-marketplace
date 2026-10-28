// ADM-P32 · Équipe et accès (anciennement « Rôles et accès » ; logique-metier/ACCES-CONSOLE.md, validé par le porteur).
// Fonctions d'abord : Inviter, Valider les demandes d'accès (quatre yeux de la Direction), Revoir les accès du trimestre,
// Surveiller les accès temporaires qui expirent. Onglets : Personnes (groupées par équipe : initiales, niveau, périmètre,
// état ; filtres segmentés), Demandes, Qui peut faire quoi (recherche par geste, matrice équipe × domaine), Revue,
// Alertes (§ 6), Matrice des pages (le socle, config/droits.ts). Une personne s'ouvre en fiche (route « membre »).
// Les gestes sont ceux de la source (equipe) : elle refuse tout ce que le compte connecté ne peut pas attribuer.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PARAMETRES } from '../../calculs/registre'
import { CarteQuatreYeux } from '../../composants/CarteQuatreYeux'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Li, Note, Panel, Pill, Px, Sec, Table, Vide, normaliser, useSurtitre } from '../../composants/prototype'
import { CODES_EQUIPES, EQUIPES, NOM_NIVEAU } from '../../config/acces-console'
import { DROITS, type Acces } from '../../config/droits'
import { NOM_ROLE } from '../../config/libelles'
import { chemin } from '../../config/pages'
import { ROUTES } from '../../config/routes'
import { ROLES } from '../../donnees/communs'
import type { AlerteAcces, CodeEquipe, Membre, Niveau, TableauEquipe } from '../../donnees/domaines/equipe'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut, useSession } from '../../session'
import { useFonctions } from '../AJ-A/fonctions-page'
import { ACCES_DOMAINE, FeuilleAvertirEquipe, LigneMembre, Revue, useIssue } from '../EQUIPE/commun'
import { Invitation } from '../EQUIPE/Invitation'
import { EtatLecture, useDate } from './commun-s6'

type Onglet = 'personnes' | 'demandes' | 'qui' | 'revue' | 'alertes' | 'matrice'
type Filtre = 'tous' | 'actifs' | 'invites' | 'suspendus' | 'temporaires' | 'partis'

export default function Roles() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const [params, setParams] = useSearchParams()
  const onglet = (params.get('onglet') ?? 'personnes') as Onglet
  const filtre = (params.get('filtre') ?? 'tous') as Filtre
  const l = useLecture(() => source.equipe.tableau(), [])
  const [inviter, setInviter] = useState<boolean>(params.get('inviter') === '1')
  const [avertir, setAvertir] = useState(false)
  const aller = (o: Onglet, f?: Filtre) => setParams(o === 'personnes' ? (f && f !== 'tous' ? { filtre: f } : {}) : { onglet: o }, { replace: true })
  const d0 = l.donnees
  const gere = (d0?.gere.length ?? 0) > 0
  const fonctions = useFonctions([
    gere && { verbe: 'Inviter', n: null, unite: ['membre', 'membres'], icone: 'user-plus', onClick: () => setInviter(true) },
    { verbe: 'Valider', n: d0?.demandes.length ?? 0, unite: ['demande d’accès', 'demandes d’accès'], icone: 'users', onClick: () => aller('demandes'), alerte: true },
    { verbe: 'Revoir', n: d0?.aRevoir ?? 0, unite: ['accès', 'accès'], icone: 'calendar-check', onClick: () => aller('revue') },
    { verbe: 'Surveiller', n: d0?.expirent ?? 0, unite: ['accès temporaire qui expire', 'accès temporaires qui expirent'], icone: 'clock', onClick: () => aller('personnes', 'temporaires'), alerte: true },
  ])
  return (
    <Ecran
      route="roles"
      kicker={surtitre}
      fonctions={fonctions}
      actions={
        gere ? (
          <button type="button" className="btn secondary" onClick={() => setAvertir(true)}>
            <Icone nom="megaphone" taille={18} />
            <span>{t('Avertir une équipe')}</span>
          </button>
        ) : undefined
      }
    >
      <Px>
        <EtatLecture l={l} quoi="l’équipe et ses accès">
          {(d) => (
            <>
              <div className="tabs" role="group" aria-label={t('Équipe et accès')}>
                {(
                  [
                    ['personnes', 'Personnes', 'users', d.membres.filter((m) => m.etat !== 'ferme').length],
                    ['demandes', 'Demandes', 'users', d.demandes.length],
                    ['qui', 'Qui peut faire quoi', 'search', null],
                    ['revue', 'Revue', 'calendar-check', d.aRevoir],
                    ['alertes', 'Alertes', 'bell', d.alertes.length],
                    ['matrice', 'Matrice des pages', 'grid-3x3', null],
                  ] as const
                ).map(([id, txt, ic, n]) => (
                  <button key={id} type="button" className={onglet === id ? 'on' : ''} aria-pressed={onglet === id} onClick={() => aller(id)}>
                    <Icone nom={ic} taille={16} />
                    {t(txt)}
                    {n !== null && <span className="n">{n}</span>}
                  </button>
                ))}
                <Link to={chemin('journal')}>
                  <Icone nom="scroll-text" taille={16} />
                  {t('Journal')}
                </Link>
              </div>
              {onglet === 'demandes' ? <Demandes d={d} /> : onglet === 'qui' ? <QuiPeut /> : onglet === 'revue' ? <Revues gere={d.gere} /> : onglet === 'alertes' ? <Alertes l={d.alertes} /> : onglet === 'matrice' ? <Matrice /> : <Personnes d={d} filtre={filtre} choisir={(f) => aller('personnes', f)} />}
              {gere && <Invitation ouverte={inviter} fermer={() => setInviter(false)} gere={d.gere} responsableSeul={!!d.moi && d.gere.length === 1 && d.moi.niveau === 'responsable'} />}
              <FeuilleAvertirEquipe ouverte={avertir} fermer={() => setAvertir(false)} equipes={d.gere} />
            </>
          )}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}

const FILTRES: [Filtre, string][] = [
  ['tous', 'Tous'],
  ['actifs', 'Actifs'],
  ['invites', 'Invités'],
  ['suspendus', 'Suspendus'],
  ['temporaires', 'Temporaires'],
  ['partis', 'Partis'],
]

function Personnes({ d, filtre, choisir }: { d: TableauEquipe; filtre: Filtre; choisir: (f: Filtre) => void }) {
  const { t, tf } = usePreferences()
  const n = useHorloge()
  const passe = (m: Membre, f: Filtre) =>
    f === 'tous' ? m.etat !== 'ferme' : f === 'actifs' ? m.etat === 'actif' : f === 'invites' ? m.etat === 'invitation' || m.etat === 'a_contresigner' : f === 'suspendus' ? m.etat === 'suspendu' : f === 'partis' ? m.etat === 'ferme' : m.temporaires.some((x) => (x.etat === 'actif' && x.fin > n) || x.etat === 'a_valider')
  return (
    <>
      <div className="chips a-segs mt16" role="group" aria-label={t('Filtrer les personnes')}>
        {FILTRES.map(([f, lib]) => (
          <button key={f} type="button" className={'chip' + (filtre === f ? ' on' : '')} aria-pressed={filtre === f} onClick={() => choisir(f)}>
            {t(lib)} <span className="n">{d.membres.filter((m) => passe(m, f)).length}</span>
          </button>
        ))}
      </div>
      {d.directionActifs < d.directionMin && (
        <Note ton="red" icone="crown" className="mt12">
          {tf('{n} compte(s) Direction actif(s) sur {min} exigés.', { n: d.directionActifs, min: d.directionMin })}
        </Note>
      )}
      {CODES_EQUIPES.map((e) => {
        const l = d.membres.filter((m) => m.equipe === e && passe(m, filtre))
        if (!l.length) return null
        const eq = d.equipes.find((x) => x.code === e)!
        const ordre: Niveau[] = ['responsable', 'senior', 'agent']
        return (
          <section key={e} className="card eq-groupe" aria-label={t(EQUIPES[e].nom)}>
            <div className="eq-tete">
              <h2 className="card-t">
                <Icone nom={EQUIPES[e].icone} taille={18} />
                {t(EQUIPES[e].nom)}
              </h2>
              <span className="t13">{tf('{n} actif(s) · {m} membre(s)', { n: eq.actifs, m: eq.membres })}</span>
            </div>
            <div className="eq-liste">
              {[...l]
                .sort((a, b) => ordre.indexOf(a.niveau) - ordre.indexOf(b.niveau) || a.agent.nom.localeCompare(b.agent.nom))
                .map((m) => (
                  <LigneMembre key={m.agent.id} m={m} to={chemin('membre', { id: m.agent.id })} droite={<Icone nom="chevron-right" taille={18} />} />
                ))}
            </div>
          </section>
        )
      })}
      {!d.membres.some((m) => passe(m, filtre)) && <Vide icone="users" t={t('Personne dans ce filtre')} />}
      <Urgence />
    </>
  )
}

function Demandes({ d }: { d: TableauEquipe }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const ouverte = usePeut('contresigner')
  const q = useLecture(() => source.quatreyeux.enAttente().catch(() => []), [d.demandes.length])
  if (!d.demandes.length) return <Vide icone="check" t={t('Aucune demande d’accès à valider')} />
  return (
    <div className="mt16">
      {d.demandes.map((x) => {
        const qy = (q.donnees ?? []).find((y) => y.id === x.qy)
        return (
          <div key={x.qy} className="mt12">
            {qy && ouverte ? (
              <CarteQuatreYeux d={qy} />
            ) : (
              <div className="card">
                <Li icone="users" ton="acc" t={x.resume} s={tf('Demandé par {p} · {d} · validation de la Direction', { p: x.par, d: date(x.le) })} to={chemin('membre', { id: x.membreId })} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function QuiPeut() {
  const { t } = usePreferences()
  const [q, setQ] = useState('')
  const l = useLecture(() => source.equipe.quiPeut(), [])
  return (
    <EtatLecture l={l} quoi="qui peut faire quoi">
      {(d) => {
        const k = normaliser(q.replace(/^qui peut\s*/i, '').replace(/\?$/, ''))
        const res = k ? d.gestes.filter((g) => normaliser(g.quoi).includes(k) || g.mots.some((m) => normaliser(m).includes(k) || k.includes(normaliser(m)))) : []
        return (
          <>
            <label className="fld eq-cherche">
              <span className="fld-t">{t('Qui peut…')}</span>
              <span className="inp">
                <Icone nom="search" taille={18} />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('rembourser, trancher, inviter, planifier une descente')} aria-label={t('Qui peut faire ce geste ?')} />
              </span>
            </label>
            {k && (
              <div className="eq-res" aria-live="polite">
                {res.length ? (
                  res.map((g) => (
                    <div key={g.id} className="card">
                      <b className="t15">{t(g.quoi)}</b>
                      <div className="eq-chips">
                        {g.membres.length ? (
                          g.membres.map((m) => (
                            <Link key={m.id} className="eq-chip" to={chemin('membre', { id: m.id })}>
                              <span className="av av-seul" style={{ width: 28, height: 28, fontSize: 10 }} aria-hidden="true">
                                {m.nom
                                  .split(' ')
                                  .map((x) => x[0])
                                  .slice(0, 2)
                                  .join('')}
                              </span>
                              {m.nom}
                              <small>{m.limite ? t(m.limite) : t(NOM_NIVEAU[m.niveau])}</small>
                            </Link>
                          ))
                        ) : (
                          <span className="t13 c3">{t('Personne aujourd’hui')}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <Vide icone="search" t={t('Aucun geste ne correspond')} />
                )}
              </div>
            )}
            <Sec t={t('Équipes × domaines')} />
            <div className="eq-mx">
              <Table
                cle={(r) => r.equipe}
                rows={d.matrice}
                cols={[
                  { k: 'e', t: t('Équipe'), main: true, rendu: (r) => <b>{t(EQUIPES[r.equipe as CodeEquipe].nom)}</b> },
                  ...d.domaines.map((dom) => ({
                    k: dom.id,
                    t: t(dom.nom),
                    rendu: (r: (typeof d.matrice)[number]) => {
                      const x = r.domaines.find((y) => y.id === dom.id)!
                      const [lib, ton, ic] = ACCES_DOMAINE[x.acces]
                      return ton ? (
                        <Pill ton={ton} sm icone={ic}>
                          {t(x.note ?? lib)}
                        </Pill>
                      ) : (
                        <span className="c4 b8">—</span>
                      )
                    },
                  })),
                ]}
              />
            </div>
          </>
        )
      }}
    </EtatLecture>
  )
}

function Revues({ gere }: { gere: CodeEquipe[] }) {
  const l = useLecture(() => Promise.all(CODES_EQUIPES.map((e) => source.equipe.revue(e))), [])
  return (
    <EtatLecture l={l} quoi="la revue des accès">
      {(rs) => (
        <div className="mt16">
          {rs
            .filter((r) => r.lignes.length)
            .sort((a, b) => b.lignes.filter((x) => !x.decision).length - a.lignes.filter((x) => !x.decision).length)
            .map((r) => (
              <div key={r.equipe} className="mt12">
                <Revue r={r} peut={gere.includes(r.equipe)} />
              </div>
            ))}
        </div>
      )}
    </EtatLecture>
  )
}

const ICONE_ALERTE: Record<AlerteAcces['genre'], string> = { inactif: 'user-x', temporaire_expire: 'clock', conflit: 'triangle-alert', connexions_refusees: 'lock', revue_retard: 'calendar-x', urgence_a_revoir: 'siren' }
function Alertes({ l }: { l: AlerteAcces[] }) {
  const { t } = usePreferences()
  const s = useSession()
  const issue = useIssue()
  const [revoir, setRevoir] = useState<string | null>(null)
  if (!l.length) return <Vide icone="check" t={t('Aucune alerte')} />
  return (
    <div className="card tight mt16">
      {l.map((a) => (
        <Li
          key={a.id}
          icone={ICONE_ALERTE[a.genre]}
          ton={a.genre === 'conflit' || a.genre === 'revue_retard' || a.genre === 'urgence_a_revoir' ? 'acc' : 'acc'}
          t={a.titre}
          s={a.sous}
          to={a.membreId && a.genre !== 'urgence_a_revoir' ? chemin('membre', { id: a.membreId }) : a.genre === 'revue_retard' ? '?onglet=revue' : undefined}
          onClick={a.genre === 'urgence_a_revoir' && s.role === 'superviseur' && a.membreId !== s.agent?.id ? () => setRevoir(a.id.slice(3)) : undefined}
          droite={a.genre === 'urgence_a_revoir' && s.role === 'superviseur' && a.membreId !== s.agent?.id ? <span className="btn sm primary">{t('Revoir')}</span> : undefined}
        />
      ))}
      <DecisionMotivee ouverte={!!revoir} fermer={() => setRevoir(null)} titre={t('Revoir un accès d’urgence')} resume={l.find((x) => x.id === `UR-${revoir}`)?.sous ?? ''} libelle="Revu" envoyer={async (m) => issue(await source.equipe.revoirUrgence(revoir!, m))} />
    </div>
  )
}

function Urgence() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const issue = useIssue()
  const n = useHorloge(10_000)
  const [ouvrir, setOuvrir] = useState(false)
  const [h, setH] = useState(String(PARAMETRES.acces.urgenceH))
  if (s.role !== 'superviseur') return null
  const jusqua = s.membre?.urgenceJusqua ?? null
  return (
    <Panel titre={t('Accès d’urgence')} icone="siren" className="mt16">
      {jusqua && jusqua > n ? (
        <>
          <Note ton="red" icone="siren">
            {tf('Ouvert jusqu’à {h} ; revu demain par un second membre de la Direction.', { h: new Date(jusqua + 3600_000).toISOString().slice(11, 16) })}
          </Note>
          <div className="btns mt10">
            <button type="button" className="btn secondary" onClick={() => void source.equipe.fermerUrgence()}>
              {t('Fermer l’accès d’urgence')}
            </button>
          </div>
        </>
      ) : (
        <details className="a-plie">
          <summary>{tf('Direction seulement · {h} h au plus', { h: PARAMETRES.acces.urgenceH })}</summary>
          <div className="a-plie-c">
            <button type="button" className="btn danger" onClick={() => setOuvrir(true)}>
              <Icone nom="siren" taille={18} />
              <span>{t('Ouvrir l’accès d’urgence')}</span>
            </button>
          </div>
        </details>
      )}
      <DecisionMotivee ouverte={ouvrir} fermer={() => setOuvrir(false)} titre={t('Ouvrir l’accès d’urgence')} resume={t('Une décision à quatre yeux s’applique seule ; tout est journalisé et revu le lendemain.')} libelle="Ouvrir" icone="siren" danger envoyer={async (m) => issue(await source.equipe.ouvrirUrgence(m, Number(h) || 0))}>
        <label className="fld mt10">
          <span className="fld-t">{tf('Durée en heures (au plus {h})', { h: PARAMETRES.acces.urgenceH })}</span>
          <span className="inp">
            <input type="number" min={1} max={PARAMETRES.acces.urgenceH} value={h} onChange={(e) => setH(e.target.value)} />
          </span>
        </label>
      </DecisionMotivee>
    </Panel>
  )
}

const CASE: Record<Acces, [string, 'acc' | 'ink' | 'blue' | null]> = { oui: ['Oui', 'acc'], lecture: ['Lecture', 'ink'], zone: ['Sa zone', 'blue'], part: ['Une partie', 'blue'], aucun: ['—', null] }
function Matrice() {
  const { t } = usePreferences()
  const routes = Object.keys(DROITS).filter((r) => ROUTES[r] && !['connexion', 'menu', 'profil', 'recherche', 'activation'].includes(r))
  return (
    <>
      <Sec t={t('Matrice des droits par page')} />
      <div className="adme-mx eq-mx">
        <Table
          cle={(r) => r}
          rows={routes}
          cols={[
            { k: 'm', t: t('Page'), main: true, rendu: (r) => <b>{t(ROUTES[r].titre)}</b> },
            ...ROLES.map((role) => ({
              k: role,
              t: t(NOM_ROLE[role]),
              rendu: (r: string) => {
                const x = DROITS[r][role]
                const [txt, ton] = CASE[x.acces]
                return ton ? (
                  <span title={x.note ? t(x.note) : undefined}>
                    <Pill ton={ton} sm icone={x.acces === 'oui' ? 'check' : x.acces === 'lecture' ? 'eye' : undefined}>
                      {t(txt)}
                    </Pill>
                  </span>
                ) : (
                  <span className="c4 b8">—</span>
                )
              },
            })),
          ]}
        />
      </div>
    </>
  )
}
