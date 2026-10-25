// Fiche d'un membre de l'équipe (logique-metier/ACCES-CONSOLE.md § 2, § 5, § 6) : qui il est (équipe, niveau,
// périmètre, état), « Ce que X peut faire » en clair (par domaine : oui, lecture, sa zone ; gestes repliés), ses accès
// temporaires, ses messages (accusé de lecture), l'historique de ses accès (journal). Gestes : Modifier le niveau,
// Changer le périmètre, Donner un accès temporaire, Rôle additionnel, Avertir, Suspendre, Réactiver, Désactiver — seulement
// ceux que le compte connecté peut faire (la source refuse de toute façon), un bouton principal.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { LigneJournal } from '../../composants/LigneJournal'
import { Av, Note, Pill, Px, Vide } from '../../composants/prototype'
import { EQUIPES, NOM_NIVEAU, texteConflit } from '../../config/acces-console'
import { NOM_ROLE } from '../../config/libelles'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { EtatLecture, useDate } from '../ADM-12/commun-s6'
import { DroitsReplies, groupesDroits } from '../../composants/DroitsReplies'
import { FeuillesGestes, PastilleEtat, PastilleNiveau, useIssue, useTextePerimetre, type GesteFeuille } from './commun'

export default function Membre() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const l = useLecture(() => source.equipe.membre(id), [id])
  const [geste, setGeste] = useState<GesteFeuille | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const p = useTextePerimetre()
  const date = useDate()
  const n = useHorloge()
  const issue = useIssue()
  const f = l.donnees
  const nom = f ? f.membre.agent.prenom : ''
  return (
    <Ecran route="membre" titre={f ? `${f.membre.agent.prenom} ${f.membre.agent.nom}` : t('Fiche d’un membre')} kicker={f ? `${t(EQUIPES[f.membre.equipe].nom)} · ${t(NOM_NIVEAU[f.membre.niveau])}` : undefined}>
      <Px>
        <EtatLecture l={l} quoi="la fiche du membre">
          {(fiche) => {
            if (!fiche) return <Vide icone="user-x" t={t('Membre introuvable')} />
            const m = fiche.membre
            const g = fiche.gestes
            const principal: [GesteFeuille, string, string] | null = g.reactiver ? ['reactiver', 'Réactiver', 'user-check'] : g.niveau ? ['niveau', 'Modifier le niveau', 'chevron-up'] : g.temporaire ? ['temporaire', 'Donner un accès temporaire', 'clock'] : g.avertir ? ['avertir', 'Avertir', 'megaphone'] : null
            const secondaires: [GesteFeuille, string, boolean][] = [
              ['niveau', 'Modifier le niveau', g.niveau],
              ['perimetre', 'Changer le périmètre', g.perimetre],
              ['temporaire', 'Donner un accès temporaire', g.temporaire],
              ['role', 'Rôle additionnel', g.role],
              ['avertir', 'Avertir', g.avertir],
              ['suspendre', 'Suspendre', g.suspendre],
              ['desactiver', 'Désactiver', g.desactiver],
            ]
            const temps = m.temporaires.filter((x) => x.etat === 'actif' || x.etat === 'a_valider')
            return (
              <>
                <div className="card">
                  <div className="row" style={{ gap: 14, alignItems: 'center' }}>
                    <Av initiales={m.agent.initiales} taille={56} ton={m.etat === 'suspendu' ? 'red' : m.etat === 'ferme' ? 'gris' : undefined} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="t17 b8">{`${m.agent.prenom} ${m.agent.nom}`}</div>
                      <div className="t13 c3">{p(m.perimetre)}</div>
                      <div className="eq-chips">
                        <PastilleNiveau n={m.niveau} />
                        <PastilleEtat e={m.etat} />
                        {m.roleAdditionnel && (
                          <Pill ton="blue" sm icone="plus">
                            {t(NOM_ROLE[m.roleAdditionnel])}
                          </Pill>
                        )}
                        {m.urgence && (
                          <Pill ton="red" sm icone="siren">
                            {t('Accès d’urgence')}
                          </Pill>
                        )}
                      </div>
                    </div>
                  </div>
                  {m.suspension && (
                    <Note ton="red" icone="user-x" className="mt12">
                      {tf('Suspendu le {d} par {p} : {m}', { d: date(m.suspension.le), p: m.suspension.par, m: m.suspension.motif })}
                    </Note>
                  )}
                  {m.depart && (
                    <Note ton="ink" icone="log-out" className="mt12">
                      {tf('Parti le {d} : {n} dossier(s) réattribué(s).', { d: date(m.depart.le), n: m.depart.reattribues })}
                    </Note>
                  )}
                  {m.conflits.map((c) => (
                    <Note key={c.roles.join()} ton={c.dossier ? 'amber' : 'red'} icone="triangle-alert" className="mt12">
                      {t(texteConflit(c))}
                    </Note>
                  ))}
                  {principal && (
                    <div className="eq-gestes">
                      <button type="button" className="btn primary" onClick={() => setGeste(principal[0])}>
                        <Icone nom={principal[2]} taille={18} />
                        <span>{t(principal[1])}</span>
                      </button>
                      {secondaires
                        .filter(([k, , ok]) => ok && k !== principal[0])
                        .map(([k, lib]) => (
                          <button key={k} type="button" className={'btn sm ' + (k === 'suspendre' || k === 'desactiver' ? 'ghost' : 'secondary')} onClick={() => setGeste(k)}>
                            {t(lib)}
                          </button>
                        ))}
                    </div>
                  )}
                  {info && (
                    <p className="t13 mt10" role="status">
                      {info}
                    </p>
                  )}
                </div>

                <div className="card mt16">
                  <h2 className="card-t">{tf('Ce que {n} peut faire', { n: nom })}</h2>
                  <DroitsReplies groupes={groupesDroits(fiche.droits.domaines, fiche.droits.gestes)} oui={tf('Ce que {n} peut faire', { n: nom })} non={tf('Ce que {n} ne peut pas faire', { n: nom })} />
                </div>

                <div className="g g2 mt16">
                  <div className="card">
                    <h2 className="card-t">{tf('{n} accès temporaire(s)', { n: temps.length })}</h2>
                    {temps.length ? (
                      <ul className="eq-lignes">
                        {temps.map((x) => (
                          <li key={x.id}>
                            <span className="grow">
                              <b>{t(NOM_ROLE[x.role])}</b>
                              <span className="t13 c3">{`${x.motif} · ${tf('jusqu’au {d}', { d: date(x.fin) })}`}</span>
                            </span>
                            {x.etat === 'a_valider' ? (
                              <Pill ton="amber" sm>
                                {t('À valider')}
                              </Pill>
                            ) : (
                              <Pill ton={x.fin - n < 48 * 3600_000 ? 'amber' : 'blue'} sm icone="clock">
                                {t('En cours')}
                              </Pill>
                            )}
                            {g.temporaire && (
                              <button type="button" className="lnk" onClick={async () => setInfo(issue(await source.equipe.retirerTemporaire(m.agent.id, x.id, tf('Retiré par la fiche de {n}', { n: nom }))) ?? t('Accès temporaire retiré.'))}>
                                {t('Retirer')}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="t13 c3 mt10">{t('Aucun')}</p>
                    )}
                  </div>
                  <div className="card">
                    <h2 className="card-t">{tf('{n} message(s)', { n: fiche.messages.length })}</h2>
                    {fiche.messages.slice(0, 4).map((x) => (
                      <div key={x.id} className={'eq-msg ' + x.genre}>
                        <span className="t12 c3">{`${date(x.le)} · ${x.de} · ${x.luParMoi ? t('lu') : t('non lu')}`}</span>
                        <p>{x.texte}</p>
                      </div>
                    ))}
                    {!fiche.messages.length && <p className="t13 c3 mt10">{t('Aucun')}</p>}
                  </div>
                </div>

                <details className="a-plie mt16">
                  <summary>{tf('Historique de ses accès · {n}', { n: fiche.historique.length })}</summary>
                  <div className="a-plie-c">
                    {fiche.historique.length ? (
                      <ul className="e-lj-l">
                        {fiche.historique.map((x) => (
                          <LigneJournal key={x.n} l={x} />
                        ))}
                      </ul>
                    ) : (
                      <p className="t13 c3">{t('Aucun changement journalisé.')}</p>
                    )}
                  </div>
                </details>

                <FeuillesGestes key={geste ?? 'x'} m={m} geste={geste} fermer={() => setGeste(null)} repreneurs={fiche.repreneurs} apres={setInfo} />
              </>
            )
          }}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}
