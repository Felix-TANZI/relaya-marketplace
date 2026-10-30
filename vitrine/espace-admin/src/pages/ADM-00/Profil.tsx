// Profil (ouvert par l'avatar ; distinct du Menu) : l'AGENT connecté — qui il est, ses rôles CUMULÉS et le sélecteur
// « Agir en tant que » (ADM-ROL-02 : chaque geste est journalisé sous le rôle choisi), son périmètre de zones
// (ADM-ROL-03), ce que son rôle permet et ne permet jamais (config/droits.ts), ses appareils connus, son second
// facteur, ses derniers gestes au journal, les préférences de l'appareil, et, en démonstration, « Se connecter comme »
// (un AUTRE agent par rôle : c'est ainsi que se montre le double contrôle). Se déconnecter ferme vraiment la session.
import { LiensLegaux } from '@client/composants/LiensLegaux'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { env } from '@client/config/env'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { LigneJournal, Heure } from '../../composants/LigneJournal'
import { MonCompte } from '../../composants/MonCompte'
import { Portrait } from '../../composants/Portrait'
import { PreferencesDuMenu } from '../../composants/PreferencesDuMenu'
import { ancienMotDePasseBon } from '../../demo/session' // DÉMONSTRATION : à retirer avec src/demo
import { changerMotDePasse } from '../../donnees/mon-compte'
import { Kv, Li, Note, Pill, Sec } from '../../composants/prototype'
import { DroitsReplies, gestesDuRole, groupesDroits } from '../../composants/DroitsReplies'
import { DOMAINES, accesDomaine } from '../../config/acces-console'
import { ICONE_ROLE, JAMAIS_ROLE, NOM_ROLE, PERIMETRE_ROLE } from '../../config/libelles'
import { ACCUEIL_ROLE, chemin } from '../../config/pages'
import { ROLES, type Role } from '../../donnees/communs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRouteOuverte, useSeDeconnecter, useSession } from '../../session'

/** Mes appareils et sessions : fermer les autres sessions ; second facteur (obligatoire en application pour les
 *  équipes sensibles) ; verrouillage après des échecs répétés (le membre est prévenu). */
function MesSessions() {
  const { t, tf } = usePreferences()
  const l = useLecture(() => source.equipe.mesSessions(), [])
  const [fait, setFait] = useState<string | null>(null)
  const d = l.donnees
  if (!d) return null
  const autres = d.sessions.filter((x) => !x.courante && !x.fermee).length
  return (
    <>
      <Sec t={tf('Mes appareils et sessions · {n}', { n: d.sessions.length })} />
      <div className="card tight">
        {d.sessions.map((x) => (
          <Li key={x.id} icone={/Téléphone|Tablette/.test(x.appareil) ? 'smartphone' : 'monitor'} ton={x.courante ? 'accs' : 'acc'} t={x.appareil} s={x.courante ? t('Cet appareil') : x.fermee ? t('Session fermée') : <Heure le={x.vuLe} />} chevron={false} />
        ))}
        <p className="t13 c3" style={{ padding: '10px 14px' }}>
          {d.applicationObligatoire ? t('Second facteur obligatoire : application d’authentification (pas de SMS de secours).') : tf('Second facteur : {f}', { f: t(d.secondFacteur === 'application' ? 'Application d’authentification' : 'Code SMS') })}
          {' · '}
          {tf('Bloqué {m} min après {n} essais refusés ; vous êtes prévenu.', { m: d.verrouillage.minutes, n: d.verrouillage.avant })}
        </p>
      </div>
      <div className="btns mt10">
        <button type="button" className="btn secondary" disabled={!autres} onClick={async () => setFait(tf('{n} session(s) fermée(s).', { n: (await source.equipe.fermerAutresSessions()).fermees }))}>
          <Icone nom="log-out" taille={18} />
          <span>{tf('Fermer {n} autre(s) session(s)', { n: autres })}</span>
        </button>
      </div>
      {fait && <p className="t13 mt8" role="status">{fait}</p>}
    </>
  )
}

/** Messages reçus (accusé de lecture) et changements de mes accès (logique-metier/ACCES-CONSOLE.md § 6). */
function MesMessages() {
  const { t, tf } = usePreferences()
  const l = useLecture(() => source.equipe.mesMessages(), [])
  const d = l.donnees
  if (!d) return null
  const recus = d.messages
  return (
    <>
      <Sec t={tf('Mes messages · {n} non lu(s)', { n: d.nonLus })} />
      <div className="card">
        {recus.length ? (
          recus.slice(0, 6).map((m) => (
            <div key={m.id} className={'eq-msg ' + m.genre + (m.luParMoi ? '' : ' non-lu')}>
              <span className="t12 c3">{`${m.de} · ${t(m.genre === 'rappel' ? 'Rappel' : m.genre === 'consigne' ? 'Consigne' : 'Avertissement')}`}</span>
              <p>{m.texte}</p>
              {!m.luParMoi && (
                <button type="button" className="btn sm secondary mt8" onClick={() => void source.equipe.lireMessage(m.id)}>
                  <Icone nom="check" taille={16} />
                  <span>{t('J’ai lu')}</span>
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="t13 c3">{t('Aucun message.')}</p>
        )}
      </div>
      <Sec t={tf('Changements de mes accès · {n}', { n: d.changements.length })} />
      <div className="card tight">
        {d.changements.length ? (
          d.changements.slice(0, 6).map((c, i) => <Li key={i} icone="key-round" ton="acc" t={c.quoi} s={<>{`${c.par}${c.motif ? ' · ' + c.motif : ''} · `}<Heure le={c.le} /></>} chevron={false} />)
        ) : (
          <p className="t13 c3" style={{ padding: '10px 14px' }}>{t('Aucun changement.')}</p>
        )}
      </div>
    </>
  )
}

export default function Profil() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const naviguer = useNavigate()
  const ouverte = useRouteOuverte()
  const deconnecter = useSeDeconnecter()
  const a = s.agent
  const agents = useLecture(() => (env.source !== 'api' ? source.session.agentsDemo() : Promise.resolve([])), [])
  const journal = useLecture(() => (ouverte('journal') ? source.gouvernance.journal({ limite: 50 }) : Promise.resolve([])), [s.role, a?.id])
  if (!a) return <Ecran route="profil" />
  const agir = async (r: Role) => {
    const x = await source.session.agirEnTantQue(r)
    if (x.ok) naviguer(chemin(ACCUEIL_ROLE[r]), { replace: true })
  }
  const connecterComme = async (r: Role) => {
    await source.session.changerRole(r)
    naviguer(chemin(ACCUEIL_ROLE[r]), { replace: true })
  }
  const miens = (journal.donnees ?? []).filter((l) => l.agentId === a.id).slice(0, 5)
  return (
    <Ecran route="profil" kicker={t('Console d’administration')} sous={t('Votre accès est nominatif : chaque geste est journalisé à votre nom, sous le rôle choisi.')}>
      <div className="card">
        <div className="row" style={{ gap: 14, alignItems: 'center' }}>
          <span className="avatar" style={{ width: 56, height: 56, fontSize: '1.125rem', marginLeft: 0 }} aria-hidden="true">
            <Portrait id={a.id} initiales={a.initiales} />
          </span>
          <div className="grow">
            <div className="t17 b8">{`${a.prenom} ${a.nom}`}</div>
            <div className="t13 c3">{`${t(NOM_ROLE[s.role])} · ${t(s.pays.nom)} · ${s.pays.devise}`}</div>
          </div>
          {a.note && <Pill ton="amber">{t(a.note)}</Pill>}
        </div>
        <div className="mt10">
          <Kv k={t('Second facteur')} v={t(a.secondFacteur === 'application' ? 'Application d’authentification' : 'Code SMS')} />
          <Kv k={t('Périmètre')} v={a.zones ? a.zones.join(', ') : t('Tous les périmètres')} />
        </div>
      </div>

      <Sec t={t('Mon compte')} />
      <MonCompte
        id={a.id}
        base={{ prenom: a.prenom, nom: a.nom, telephone: a.telephone, email: a.email }}
        changerMotDePasse={(ancien, nouveau) => changerMotDePasse(a.id, ancienMotDePasseBon(a.id, ancien), ancien, nouveau, a.email)}
      />

      <MesMessages />

      <Sec t={t('Agir en tant que')} />
      <div className="card tight" role="radiogroup" aria-label={t('Agir en tant que')}>
        {a.roles.map((r) => (
          <Li key={r} icone={ICONE_ROLE[r]} ton={s.role === r ? 'accs' : 'acc'} t={t(NOM_ROLE[r])} s={s.role === r ? t('Rôle en cours : vos gestes sont journalisés sous ce rôle') : t(PERIMETRE_ROLE[r])} onClick={s.role === r ? undefined : () => void agir(r)} chevron={false} aria={tf('Agir en tant que {role}', { role: t(NOM_ROLE[r]) })} />
        ))}
        {a.roles.length < 2 && <p className="t13 c3" style={{ padding: '10px 14px' }}>{t('Vous tenez un seul rôle. Un rôle de plus s’attribue par la Direction, avec la validation d’un autre compte.')}</p>}
      </div>

      <Sec t={t('Ce que mon rôle permet')} />
      <DroitsReplies
        groupes={groupesDroits(
          DOMAINES.map((d) => ({ id: d.id, acces: accesDomaine(d.routes, [s.role]) })),
          gestesDuRole(s.role),
        )}
        oui={t('Ce que vous pouvez faire')}
        non={t('Ce que vous ne pouvez pas faire')}
        jamais={JAMAIS_ROLE[s.role]}
        pied={ouverte('roles') && <div className="card tight mt10"><Li icone="key-round" ton="acc" t={t('Tous les rôles et leurs droits')} s={t('Rôles et accès')} to={chemin('roles')} /></div>}
      />

      <MesSessions />

      {ouverte('journal') && (
        <>
          <Sec t={t('Mes derniers gestes')} a={t('Journal d’audit')} to={chemin('journal')} />
          <div className="card">
            {journal.erreur && (
              <Note ton="red" icone="cloud-off">
                {t('Impossible de lire le journal.')}{' '}
                <button type="button" className="lien-b" onClick={() => journal.relire()}>
                  {t('Réessayer')}
                </button>
              </Note>
            )}
            {miens.length ? (
              <ul className="e-lj-l">
                {miens.map((l) => (
                  <LigneJournal key={l.n} l={l} />
                ))}
              </ul>
            ) : (
              journal.donnees && <p className="t13 c3">{t('Aucun geste journalisé à votre nom pour l’instant.')}</p>
            )}
          </div>
        </>
      )}

      <Sec t={t('Préférences de l’appareil')} />
      <PreferencesDuMenu />
      <div className="card tight mt10">
        <Li icone="keyboard" ton="acc" t={t('Raccourcis du clavier')} s={t('⌘K pour chercher, « g » puis une lettre pour aller vite')} to="?pop=raccourcis" />
      </div>

      {env.source !== 'api' && (
        <>
          <Sec t={t('Démonstration : se connecter comme')} />
          <Note ton="ink" icone="users">
            {t('Chaque rôle est tenu par une autre personne : une décision à quatre yeux se contresigne en changeant de compte.')}
          </Note>
          <div className="card tight mt10" role="radiogroup" aria-label={t('Démonstration : se connecter comme')}>
            {ROLES.map((r) => {
              const qui = agents.donnees?.find((x) => x.role === r)
              const actif = qui?.agentId === a.id && s.role === r
              return <Li key={r} icone={ICONE_ROLE[r]} ton={actif ? 'accs' : 'acc'} t={t(NOM_ROLE[r])} s={qui?.nom} onClick={actif ? undefined : () => void connecterComme(r)} chevron={false} aria={tf('Se connecter comme {role}', { role: t(NOM_ROLE[r]) })} />
            })}
          </div>
        </>
      )}

      <button type="button" className="btn danger mt16" onClick={() => void deconnecter()}>
        <Icone nom="log-out" taille={18} />
        <span>{t('Se déconnecter')}</span>
      </button>
      <div className="foot">
        <Icone nom="shield-check" taille={16} />
        <span>{tf('BelivaY console · version {v}', { v: import.meta.env.VITE_VERSION_ADMIN })}</span>
      </div>
      <LiensLegaux />
    </Ecran>
  )
}
