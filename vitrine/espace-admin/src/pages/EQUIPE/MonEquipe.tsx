// Mon équipe (logique-metier/ACCES-CONSOLE.md § 1, § 3, § 7) : la vue du Responsable d'équipe — charge de travail par
// membre (dossiers en cours), Répartir (un dossier passe à un autre membre de l'équipe), Inviter dans son équipe (Agent
// ou Senior, dans son périmètre), Avertir l'équipe, Revoir les accès du trimestre (un geste par ligne). Tout le reste
// passe par Accès et personnel ; la source refuse un geste hors de son équipe.
import { useState } from 'react'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Px, Vide, useSurtitre } from '../../composants/prototype'
import { EQUIPES } from '../../config/acces-console'
import { chemin } from '../../config/pages'
import type { MonEquipe as Vue } from '../../donnees/domaines/equipe'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useFonctions } from '../AJ-A/fonctions-page'
import { EtatLecture, useDate } from '../ADM-12/commun-s6'
import { FeuilleAvertirEquipe, LigneMembre, Revue, useIssue } from './commun'
import { InvitationEquipe } from './Invitation'

export default function MonEquipe() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const l = useLecture(() => source.equipe.monEquipe(), [])
  const [avertir, setAvertir] = useState(false)
  const [inviter, setInviter] = useState(false)
  const d = l.donnees
  const dossiers = d ? d.membres.reduce((s, m) => s + m.liste.length, 0) : 0
  const fonctions = useFonctions([
    { verbe: 'Inviter', n: null, unite: ['membre', 'membres'], icone: 'user-plus', onClick: () => setInviter(true) },
    { verbe: 'Revoir', n: d ? d.revue.lignes.filter((x) => !x.decision).length : 0, unite: ['accès', 'accès'], icone: 'calendar-check', onClick: () => document.getElementById('revue')?.scrollIntoView({ behavior: 'smooth' }) },
    { verbe: 'Répartir', n: dossiers, unite: ['dossier en cours', 'dossiers en cours'], icone: 'shuffle', onClick: () => document.getElementById('charge')?.scrollIntoView({ behavior: 'smooth' }) },
    { verbe: 'Avertir', n: null, unite: ['l’équipe', 'l’équipe'], icone: 'megaphone', onClick: () => setAvertir(true) },
  ])
  return (
    <Ecran route="mon-equipe" kicker={d ? `${surtitre} · ${t(EQUIPES[d.equipe].nom)}` : surtitre} fonctions={fonctions}>
      <Px>
        <EtatLecture l={l} quoi="votre équipe">
          {(v) => (
            <>
              <Charge v={v} />
              <div id="revue" className="mt16">
                <Revue r={v.revue} peut />
              </div>
              <Messages v={v} />
              <FeuilleAvertirEquipe ouverte={avertir} fermer={() => setAvertir(false)} equipes={[v.equipe]} />
              <InvitationEquipe ouverte={inviter} fermer={() => setInviter(false)} equipe={v.equipe} />
            </>
          )}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}

function Charge({ v }: { v: Vue }) {
  const { t, tf } = usePreferences()
  const issue = useIssue()
  const [erreur, setErreur] = useState<string | null>(null)
  const max = Math.max(1, ...v.membres.map((m) => m.liste.length))
  const actifs = v.membres.filter((m) => m.etat === 'actif')
  return (
    <section id="charge" className="card" aria-label={t('Charge de travail')}>
      <h2 className="card-t">{tf('{n} membre(s) · charge de travail', { n: v.membres.length })}</h2>
      <div className="eq-liste">
        {v.membres.map((m) => (
          <div key={m.agent.id}>
            <LigneMembre
              m={m}
              to={chemin('membre', { id: m.agent.id })}
              droite={
                <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span className="eq-charge" aria-hidden="true">
                    <span style={{ width: `${(m.liste.length / max) * 100}%` }} />
                  </span>
                  <b className="t13">{tf('{n} dossier(s)', { n: m.liste.length })}</b>
                </span>
              }
            />
            {m.liste.length > 0 && (
              <details className="a-plie" style={{ marginTop: 0, marginBottom: 8 }}>
                <summary>{tf('Répartir les dossiers de {n}', { n: m.agent.prenom })}</summary>
                <div className="a-plie-c">
                  <ul className="eq-lignes">
                    {m.liste.map((x) => (
                      <li key={x.id}>
                        <span className="grow">
                          <b>{x.libelle}</b>
                        </span>
                        <label className="fld" style={{ minWidth: 180 }}>
                          <span className="vh">{tf('Donner {d} à', { d: x.id })}</span>
                          <span className="inp">
                            <select
                              aria-label={tf('Donner {d} à', { d: x.id })}
                              value=""
                              onChange={async (e) => {
                                if (!e.target.value) return
                                setErreur(issue(await source.equipe.repartir(x.id, e.target.value)))
                              }}
                            >
                              <option value="">{t('Donner à…')}</option>
                              {actifs
                                .filter((y) => y.agent.id !== m.agent.id)
                                .map((y) => (
                                  <option key={y.agent.id} value={y.agent.id}>{`${y.agent.prenom} ${y.agent.nom}`}</option>
                                ))}
                            </select>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
      {erreur && (
        <p className="e-erreur" role="alert">
          {erreur}
        </p>
      )}
    </section>
  )
}

function Messages({ v }: { v: Vue }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  if (!v.messages.length) return <Vide icone="message-circle" t={t('Aucun message à l’équipe')} />
  return (
    <details className="a-plie mt16">
      <summary>
        <Icone nom="message-circle" taille={16} />
        {tf('{n} message(s) de l’équipe', { n: v.messages.length })}
      </summary>
      <div className="a-plie-c">
        {v.messages.map((x) => (
          <div key={x.id} className={'eq-msg ' + x.genre}>
            <span className="t12 c3">{`${date(x.le)} · ${x.de} · ${tf('lu par {n} sur {d}', { n: x.lus, d: x.destinataires })}`}</span>
            <p>{x.texte}</p>
          </div>
        ))}
      </div>
    </details>
  )
}
