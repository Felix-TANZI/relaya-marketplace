// Mon entreprise (le Profil, ouvert par l'avatar ; ORGANISATION.md) : en haut, l'identité (la carte de l'entreprise, la
// personne connectée et son rôle) et trois actions prioritaires (Rôles et accès, Sécurité, Aide et support) ; ensuite
// des sections nommées, chaque chose à sa place : Entreprise et documents · Rôles et accès · Zones et tarifs ·
// Paiement et versements · Sécurité · Préférences · Messages et aide ; en démonstration, « Voir l'espace comme » ;
// enfin Se déconnecter (la session se ferme vraiment) et la version. Les droits détaillés du rôle sont dans Rôles et
// accès (pas de doublon) ; les changements de numéro, d'e-mail et de mot de passe restent dans Paramètres.
import { LiensLegaux } from '@client/composants/LiensLegaux'
import { createElement, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { env } from '@client/config/env'
import { badge } from '@client/i18n/format'
import { CarteEntreprise, Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Couverture } from '../../composants/Couverture'
import { MonCompte } from '../../composants/MonCompte'
import { Portrait } from '../../composants/Portrait'
import { PreferencesDuMenu } from '../../composants/PreferencesDuMenu'
import { masquerEmail, noterAlerte } from '../../donnees/mon-compte'
import { Kv, Li, Note, Plus, Sec } from '../../composants/prototype'
import { Tuiles } from '../../composants/tuiles'
import { droitsDe } from '../../config/droits'
import { NOM_ROLE } from '../../config/libelles'
import { chemin } from '../../config/pages'
import { ROLES, type Role } from '../../donnees/communs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRouteOuverte, useSeDeconnecter, useSession } from '../../session'

const ICONE_ROLE: Record<Role, string> = { proprietaire: 'crown', gerant: 'briefcase', repartiteur: 'route', comptable: 'calculator' }

export default function Profil() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const naviguer = useNavigate()
  const ouverte = useRouteOuverte()
  const deconnecter = useSeDeconnecter()
  const u = s.utilisateur
  const users = useLecture(() => source.parametres.utilisateurs(), [u?.role])
  const moi = users.donnees?.find((x) => x.moi)
  if (!u) return <Ecran route="profil" />
  const voirComme = async (r: Role) => {
    await source.session.changerRole(r)
    // Le rôle change ce qu'on peut ouvrir : retour au tableau de bord (toujours ouvert).
    naviguer(chemin('tableau'), { replace: true })
  }
  const droits = droitsDe(u.role)
  const notifs = badge(s.badges.notifications)
  const messages = badge(s.badges.messages)
  const proprio = u.role === 'proprietaire'
  const lien = (route: string, icone: string, titre: string, sous?: string, droite?: ReactNode, ancre = '') =>
    ouverte(route) && <Li icone={icone} ton="acc" t={t(titre)} s={sous && t(sous)} to={chemin(route) + ancre} droite={droite} />
  // Une section : titre, puis ses lignes dans une carte ; vide pour ce rôle, elle disparaît.
  const section = (titre: string, lignes: ReactNode[]) => {
    const presentes = lignes.filter(Boolean)
    if (presentes.length === 0) return null
    return (
      <section aria-label={t(titre)}>
        <Sec t={t(titre)} />
        {createElement('div', { className: 'card tight' }, ...presentes)}
      </section>
    )
  }
  return (
    <Ecran route="profil">
      {/* Identité : l'entreprise (vers l'état du compte), puis la personne connectée et son rôle (vers Rôles et accès). */}
      <div className="e-ident">
        <CarteEntreprise />
        <div className="card e-moi">
          <span className="avatar" aria-hidden="true">
            <Portrait id={u.id} initiales={u.initiales} />
          </span>
          <div className="grow">
            <div className="t17 b8">{`${u.prenom} ${u.nom}`}</div>
            <div className="t13 c3">{tf('{role} · {n} droits sur {total}', { role: t(NOM_ROLE[u.role]), n: droits.oui.length, total: droits.oui.length + droits.non.length })}</div>
          </div>
          <span className="pill acc">
            <Icone nom={ICONE_ROLE[u.role]} taille={13} />
            {t(NOM_ROLE[u.role])}
          </span>
        </div>
      </div>

      <Tuiles
        aria={t('Actions prioritaires')}
        items={[
          { route: 'roles', to: chemin('roles'), titre: 'Rôles et accès', sous: 'Membres, rôles et droits', icone: 'shield-check' },
          { route: 'securite', to: chemin('securite'), titre: 'Sécurité du compte', sous: 'Appareils, connexions, code SMS', icone: 'lock' },
          { route: 'messages', to: chemin('messages', { sheet: 'nouveau', sujet: 'compte' }), titre: 'Aide et support', sous: 'Écrire au support BelivaY', icone: 'headset' },
        ]}
      />

      {moi && (
        <section aria-label={t('Mon compte')}>
          <Sec t={t('Mon compte')} />
          <MonCompte
            id={u.id}
            base={{ prenom: u.prenom, nom: u.nom, telephone: moi.telephone, email: moi.email }}
            changerMotDePasse={async (ancien, nouveau) => {
              const r = await source.parametres.changerMotDePasse(ancien, nouveau)
              if (!r.ok) return { ok: false, raison: r.raison === 'faible' ? 'faible' : 'mot_de_passe' }
              noterAlerte(u.id, 'Mot de passe changé', masquerEmail(moi.email))
              return { ok: true }
            }}
          />
          {proprio && s.entreprise && <Couverture entreprise={s.entreprise.id} />}
        </section>
      )}

      {section('Entreprise et documents', [
        lien('parametres', 'settings', 'Paramètres du compte', 'Téléphone, e-mail, stockage de nuit, règlement', undefined, '#profil'),
        lien('contrat', 'file-signature', 'Contrat et documents', 'Contrat signé, pièces de l’entreprise'),
        lien('etat', 'badge-check', 'État du compte', 'Phase, palier, plafond et restrictions'),
        lien('integrations', 'plug', 'Intégrations', 'Clés d’API et rappels pour votre logiciel'),
      ])}

      {section('Rôles et accès', [
        lien('roles', 'shield-check', 'Rôles et accès', 'Membres, rôles et droits'),
        proprio && lien('parametres', 'user-plus', 'Équipe et rôles', 'Inviter ou retirer un utilisateur', undefined, '#utilisateurs'),
        lien('activite', 'history', 'Activité de l’équipe', 'Qui a fait quoi, et quand'),
      ])}

      {section('Zones et tarifs', [lien('zones', 'map-pinned', 'Zones et capacité', 'Où vous livrez, combien de colis par jour'), lien('sla', 'timer', 'Prix et délais', 'Grille de rémunération et délais promis')])}

      {section('Paiement et versements', [
        lien('reglements', 'banknote', 'Règlements', 'Ce qui sera versé vendredi, et pourquoi'),
        lien('releves', 'file-text', 'Relevés et factures', 'Pièces comptables du mois'),
        proprio && lien('parametres', 'wallet', 'Moyen de règlement', 'Compte qui reçoit les versements', undefined, '#reglement'),
      ])}

      <section aria-label={t('Sécurité du compte')}>
        <Sec t={t('Sécurité du compte')} />
        <div className="card tight">
          <div className="e-kv-bloc">
            <Kv k={t('Code SMS à la connexion')} v={moi ? t(moi.codeSms ? 'Activé' : 'Désactivé') : '…'} />
          </div>
          {users.erreur && (
            <Note ton="red" icone="cloud-off">
              {t('Impossible de charger vos coordonnées.')}{' '}
              <button type="button" className="lien-b" onClick={() => users.relire()}>
                {t('Réessayer')}
              </button>
            </Note>
          )}
          {lien('securite', 'lock', 'Sécurité du compte', 'Appareils, connexions, code SMS')}
          {lien('parametres', 'key-round', 'Mot de passe', 'Changer, déconnecter les autres appareils', undefined, '#securite')}
        </div>
      </section>

      <section aria-label={t('Préférences')}>
        <Sec t={t('Préférences')} />
        <PreferencesDuMenu />
        <div className="card tight mt10">
          {lien('parametres', 'bell-ring', 'Mes notifications', 'Alertes par canal, zones, heures calmes', undefined, '#notifications')}
          <Li icone="keyboard" ton="acc" t={t('Raccourcis du clavier')} s={t('⌘K pour chercher, « g » puis une lettre pour aller vite')} to="?pop=raccourcis" />
        </div>
        <Plus libelle={t('Où sont gardés ces réglages ?')} plat>
          <p className="t13">{t('Langue, thème, taille du texte, sons et données sont gardés sur cet appareil. Vos notifications, votre mot de passe et votre équipe sont gardés sur le compte, pour tous vos appareils.')}</p>
        </Plus>
      </section>

      {section('Messages et aide', [
        lien('messages', 'message-circle', 'Messages', 'Fils avec BelivaY et vos livreurs', messages && <span className="badge-num acc">{messages}</span>),
        lien('notifications', 'bell', 'Notifications reçues', undefined, notifs && <span className="badge-num">{notifs}</span>),
        lien('apprendre', 'graduation-cap', 'Apprendre', 'Fiches sur les délais, preuves, litiges et score'),
      ])}

      {env.source !== 'api' && (
        <>
          <Sec t={t('Démonstration : voir l’espace comme')} />
          <div className="card tight" role="radiogroup" aria-label={t('Démonstration : voir l’espace comme')}>
            {ROLES.map((r) => (
              <Li key={r} icone={ICONE_ROLE[r]} ton={u.role === r ? 'accs' : 'acc'} t={t(NOM_ROLE[r])} s={u.role === r ? t('Rôle affiché') : undefined} onClick={() => void voirComme(r)} chevron={false} aria={tf('Voir l’espace comme {role}', { role: t(NOM_ROLE[r]) })} />
            ))}
          </div>
        </>
      )}

      <button type="button" className="btn danger mt16" onClick={() => void deconnecter()}>
        <Icone nom="log-out" taille={18} />
        <span>{t('Se déconnecter')}</span>
      </button>
      <div className="foot">
        <Icone nom="shield-check" taille={16} />
        <span>{tf('BelivaY entreprise · version {v}', { v: import.meta.env.VITE_VERSION_ENTREPRISE })}</span>
      </div>
      <LiensLegaux />
    </Ecran>
  )
}
