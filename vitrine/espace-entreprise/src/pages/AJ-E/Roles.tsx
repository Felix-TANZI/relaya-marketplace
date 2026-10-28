// Rôles et accès (ORGANISATION.md, espace Mon entreprise) : qui a accès à l'espace de l'entreprise, avec quel rôle, et
// ce que chaque rôle peut faire. Réunit ce qui était éparpillé entre le Profil (« Ce que mon rôle permet ») et
// Sécurité et équipe (équipe, tableau des rôles) : mon rôle (droits et interdits expliqués), les membres et leur
// dernière connexion, le tableau des rôles. Inviter ou retirer reste dans Paramètres (#utilisateurs), au propriétaire.
import './aje.css'
import { Link } from 'react-router-dom'
import { PARAMETRES } from '../../calculs/registre'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Note, Panel, Pill, Plus, Table, type Colonne } from '../../composants/prototype'
import { DroitsReplies, droitCourt, groupesDroits } from '../../composants/DroitsReplies'
import { DROITS, droitsDe } from '../../config/droits'
import { NOM_ROLE } from '../../config/libelles'
import { chemin } from '../../config/pages'
import { ROLES, type Role } from '../../donnees/communs'
import type { UtilisateurInterne } from '../../donnees/domaines/parametres'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, useRouteOuverte, useSession } from '../../session'
import { Chargement, ErreurLecture, useDates } from '../ENT-03/outils'

const A = PARAMETRES.acces
const ICONE_ROLE: Record<Role, string> = { proprietaire: 'crown', gerant: 'briefcase', repartiteur: 'route', comptable: 'calculator' }

export default function Roles() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const ouverte = useRouteOuverte()
  const maintenant = useHorloge()
  const { relatif } = useDates()
  const equipe = useLecture(() => source.parametres.utilisateurs(), [s.utilisateur?.role])
  const role = s.utilisateur?.role ?? 'proprietaire'
  const proprio = role === 'proprietaire'
  const droits = droitsDe(role)
  const actifs = (equipe.donnees ?? []).filter((u) => u.statut !== 'retire')
  const colonnes: Colonne<UtilisateurInterne>[] = [
    { k: 'nom', t: t('Personne'), main: true, rendu: (u) => <b>{u.moi ? tf('{nom} (vous)', { nom: u.nom }) : u.nom}</b> },
    {
      k: 'role',
      t: t('Rôle'),
      rendu: (u) => (
        <Pill sm ton={u.role === 'proprietaire' ? 'acc' : 'ink'} icone={ICONE_ROLE[u.role]}>
          {t(NOM_ROLE[u.role])}
        </Pill>
      ),
    },
    { k: 'vu', t: t('Dernière connexion'), rendu: (u) => (u.statut === 'invite' ? t('invitation en attente') : u.derniereConnexion ? relatif(u.derniereConnexion, maintenant) : t('jamais')) },
    { k: 'sms', t: t('Code SMS'), hideM: true, rendu: (u) => t(u.codeSms ? 'à chaque connexion' : 'au changement d’appareil') },
  ]
  const inviter =
    proprio && ouverte('parametres') ? (
      <Link className="btn primary" to={chemin('parametres') + '#utilisateurs'}>
        <Icone nom="user-plus" taille={18} />
        <span>{t('Inviter ou retirer un utilisateur')}</span>
      </Link>
    ) : undefined
  return (
    <Ecran route="roles" actions={inviter}>
      <div className="g g21" style={{ alignItems: 'start', marginTop: 0 }}>
        <Panel titre={t('Membres')} icone="users" droite={<Pill sm>{tf('{n} accès sur {max}', { n: actifs.length, max: A.accesInternesMax })}</Pill>}>
          {equipe.erreur && <ErreurLecture erreur={equipe.erreur} relire={equipe.relire} />}
          {!equipe.donnees && !equipe.erreur && <Chargement lignes={2} />}
          {equipe.donnees && <Table cols={colonnes} rows={actifs} cle={(u) => u.id} legende={t('Membres')} />}
          <p className="t12 c3 mt10">
            {actifs.length >= A.accesInternesMax ? tf('Limite atteinte : {max} accès internes au plus. Retirez un accès avant d’en inviter un autre.', { max: A.accesInternesMax }) : tf('Chaque accès est nominatif et ne se partage pas ; {max} accès internes au plus.', { max: A.accesInternesMax })}
          </p>
          {!proprio && (
            <Note ton="ink" icone="lock" className="mt10">
              {t('Seul le propriétaire invite ou retire un utilisateur : les accès à l’espace sont donnés par lui, chacun à son nom.')}
            </Note>
          )}
        </Panel>
        <Panel titre={t('Votre rôle')} icone={ICONE_ROLE[role]} droite={<Pill ton="acc">{t(NOM_ROLE[role])}</Pill>}>
          <DroitsReplies groupes={groupesDroits(role)} oui={t('Ce que vous pouvez faire')} non={t('Ce que vous ne pouvez pas faire')} />
          {droits.non.length === 0 && <p className="t13 c3 mt8">{t('Le propriétaire peut tout faire dans l’espace ; il signe seul ce qui engage l’entreprise.')}</p>}
        </Panel>

      </div>

      <Panel titre={t('Rôles : qui peut faire quoi')} icone="shield-check" className="mt14">
        <details className="drt">
          <summary>
            <span className="drt-res">
              <span className="ok">
                <Icone nom="shield-check" taille={14} />
                {tf('{n} droits comparés entre {r} rôles', { n: DROITS.length, r: ROLES.length })}
              </span>
            </span>
            <span className="drt-voir">{t('Détail')}</span>
            <Icone nom="chevron-down" taille={18} />
          </summary>
          <div className="drt-c">
            <ul className="e-droits" aria-label={t('Rôles : qui peut faire quoi')}>
              {DROITS.map((d) => (
                <li key={d.id} title={t(d.quoi)}>
                  <span className="q">{t(droitCourt(d.id))}</span>
                  <span className="r">
                    {ROLES.map((r) => {
                      const oui = d.roles.includes(r)
                      return (
                        <Pill key={r} sm ton={oui ? 'green' : 'ink'} icone={oui ? 'check' : 'x'} className={oui ? '' : 'e-non'}>
                          <span className="vh">{oui ? t('permis') : t('non permis')} : </span>
                          {t(NOM_ROLE[r])}
                        </Pill>
                      )
                    })}
                  </span>
                </li>
              ))}
            </ul>
        <Plus libelle={t('Pourquoi ces interdits ?')} plat>
          {DROITS.filter((d) => d.roles.length < ROLES.length).map((d) => (
            <p key={d.id} className="t13 mt8">
              <b>{t(d.quoi)}</b> — {t(d.pourquoi)}
            </p>
          ))}
          <p className="t12 c3 mt10">{t('Le serveur refuse aussi chaque geste qu’un rôle n’a pas : cette liste l’explique, elle ne le remplace pas.')}</p>
        </Plus>
          </div>
        </details>
      </Panel>
    </Ecran>
  )
}
