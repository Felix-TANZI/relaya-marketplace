// ENT-P24 · Paramètres du compte, repris sur le prototype (route('parametres')) : liste des sections à gauche
// (ec8-snav), puis Utilisateurs internes et rôles (propriétaire), Mot de passe et sécurité (chacun pour soi), Mes
// notifications (zones suivies, matrice type × canal, alertes verrouillées ; confort DP-61 : résumé quotidien, plage
// calme), Langue, thème et fuseau, Point de stockage de nuit (modifiable par le propriétaire, journalisé), Moyen de
// règlement (propriétaire et comptable → Règlements ; en revue : versements bloqués, bandeau), Compte entreprise
// (suppression par résiliation, jamais par un bouton). Le répartiteur ne voit que ses préférences (sécurité,
// notifications, langue). Pages ajoutées : Journal des modifications (parametres-journal), Mes données (mes-donnees).
// Enrichi (M5, M8, M10, M11) : recherche dans les réglages (« / », ?q=, mots de chaque section, zéro résultat) ; réglages
// enregistrés par geste (gardés hors connexion) ; ce que chaque rôle règle et ce qui lui est interdit, écrit dans la
// liste des sections ; « Langue, thème et fuseau » regroupe l'affichage (taille du texte, thème, animations), les sons
// et vibrations, les données économes et les préférences de travail (liens vers les réglages qui les portent).
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApercuSons } from '@client/composants/ApercuSons'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { TailleDuTexte } from '../../composants/TailleDuTexte'
import { Ecran } from '../../composants/coque'
import { AucunResultat, Banniere, type Colonne, correspond, Hint, Interdit, Kv, Li, Note, Panel, Pill, Props, Px, Qui, Recherche, St, Table, Tete, Tg } from '../../composants/prototype'
import { NOM_ETAT, NOM_ROLE } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { Role } from '../../donnees/communs'
import type { PreferencesNotifications, RefusParametres, ReglagesEntreprise, UtilisateurInterne } from '../../donnees/domaines/parametres'
import type { MoyenReglement } from '../../donnees/domaines/reglements'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { OUTILS, motDePasseValide, type Canal, type TypeAlerte } from '../../calculs/ent08'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut, useSession } from '../../session'
import { CarteZones } from '../ENT-04/CarteZones'
import '../ENT-03/ent.css'
import { Chargement, ErreurLecture, useAnnonce, useDates, useEnLigne } from '../ENT-07/commun'
import { NOM_ALERTE, NOM_CANAL } from './libelles'
import { geste } from '../../donnees/fileHorsLigne'
import './ent08.css'

const CANAUX: Canal[] = ['portail', 'push', 'email', 'sms']
const TYPES: TypeAlerte[] = ['paquet', 'non_affecte', 'depart', 'incident', 'litige', 'versement_refuse', 'vente_flash', 'document']
// Colonne « Peut » du prototype : ce que chaque rôle permet.
const DROITS: Record<Role, string> = {
  proprietaire: 'tout, dont l’argent et le moyen de règlement',
  gerant: 'exploitation et décisions d’emploi des livreurs (essai, discipline, congés, fin de contrat)',
  repartiteur: 'paquets, affectation, flotte, incidents, emballages',
  comptable: 'règlements, relevés, factures, rapports',
}
// Mots de chaque section pour la recherche dans les réglages.
const MOTS: Record<string, string> = {
  utilisateurs: 'équipe, rôles, accès, invitation, retrait, répartiteur, comptable, journal',
  securite: 'mot de passe, code SMS, double facteur, session, appareils, connexion, mes données',
  notifications: 'zones suivies, alertes, canaux, push, e-mail, SMS, résumé quotidien, plage calme, heures calmes',
  langue: 'langue, thème sombre, affichage, taille du texte, sons, vibrations, animations, données économes, fuseau, préférences de travail',
  stockage: 'adresse, nuit, consignes, carte, visite',
  reglement: 'Mobile Money, versements, numéro, revue',
  compte: 'contrat, résiliation, suppression, pilote, propriétaire',
}
// Ce que chaque rôle règle ici (et donc ce qui lui est interdit).
const REGLE: Record<Role, string> = {
  proprietaire: 'tout : équipe, sécurité, notifications, affichage, point de stockage, moyen de règlement, compte',
  gerant: 'ses préférences : sécurité, notifications, affichage',
  repartiteur: 'ses préférences : sécurité, notifications, affichage',
  comptable: 'ses préférences, et lit le point de stockage, le moyen de règlement et le compte',
}
const DROITS_INVITE: Record<'gerant' | 'repartiteur' | 'comptable', string> = {
  gerant: 'tout ce que fait le répartiteur, plus les décisions d’emploi des livreurs ; aucun montant détaillé',
  repartiteur: 'paquets, affectation, flotte, incidents ; pas d’accès au moyen de règlement',
  comptable: 'règlements, relevés, factures ; ne peut pas accepter de paquet ni répondre aux litiges',
}

export function useRefus() {
  const { t } = usePreferences()
  const R: Record<RefusParametres, string> = {
    nom: t('Prénom et nom attendus (accès nominatif).'),
    telephone: t('Numéro camerounais à 9 chiffres attendu (+237 6…).'),
    email: t('Adresse e-mail invalide.'),
    role: t('Un propriétaire ne s’invite pas : choisissez répartiteur ou comptable.'),
    limite: t('Nombre maximal d’accès atteint : retirez d’abord un accès.'),
    soi: t('Cet accès ne peut pas être retiré.'),
    mot_de_passe: t('Mot de passe actuel incorrect.'),
    faible: t('Nouveau mot de passe : 8 caractères au moins, dont un chiffre, différent de l’actuel.'),
    code: t('Code incorrect : vérifiez le SMS reçu.'),
    adresse: t('Adresse trop courte : quartier, rue, repère.'),
    doublon: t('Ce numéro ou cet e-mail a déjà un accès.'),
    plage: t('Plage calme : deux heures différentes, de 0 h à 23 h.'),
  }
  return (r: RefusParametres) => R[r]
}

export default function Parametres() {
  const { t, tf } = usePreferences()
  const proprio = usePeut(['proprietaire'])
  const argent = usePeut(['proprietaire', 'comptable'])
  const users = useLecture(() => source.parametres.utilisateurs(), [])
  const reglages = useLecture(() => source.parametres.reglages(), [])
  const moyen = useLecture(() => (argent ? source.reglements.moyen() : Promise.resolve(null)), [argent])
  const d = useDates()
  const erreur = users.erreur ?? reglages.erreur ?? moyen.erreur
  const moi = users.donnees?.find((u) => u.moi)
  const titulaire = users.donnees?.find((u) => u.role === 'proprietaire')
  const sections: [string, string, string, boolean][] = [
    ['utilisateurs', 'Utilisateurs et rôles', 'users', proprio],
    ['securite', 'Mot de passe et sécurité', 'key-round', true],
    ['notifications', 'Notifications', 'bell', true],
    ['langue', 'Langue, thème et fuseau', 'languages', true],
    ['stockage', 'Point de stockage de nuit', 'warehouse', argent],
    ['reglement', 'Moyen de règlement', 'wallet', argent],
    ['compte', 'Compte entreprise', 'building-2', argent],
  ]
  const permises = sections.filter((x) => x[3])
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const setQ = (v: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (v) n.set('q', v)
        else n.delete('q')
        return n
      },
      { replace: true },
    )
  const visibles = permises.filter(([id, titre]) => correspond(q, t(titre), t(MOTS[id])))
  const voir = (id: string) => visibles.some((x) => x[0] === id)
  const [active, setActive] = useState(permises[0][0])
  // Une ancre (« #notifications ») ouverte depuis un autre écran : la section vient sous les yeux.
  useEffect(() => {
    const h = location.hash.slice(1)
    if (h && users.donnees && reglages.donnees) {
      document.getElementById(h)?.scrollIntoView({ block: 'start' })
      if (visibles.some((x) => x[0] === h)) setActive(h)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users.donnees, reglages.donnees])
  const m = moyen.donnees
  return (
    <Ecran route="parametres">
      <Px>
        <Tete route="parametres" titre={t('Paramètres du compte')} />
        {m?.statut === 'en_revue' && m.bloqueJusqua && (
          <Banniere
            ton="amber"
            icone="lock"
            className="ec-bn"
            role="status"
            bouton={
              <Link className="btn secondary sm" to={chemin('reglements')}>
                <Icone nom="banknote" taille={16} />
                {t('Voir les règlements')}
              </Link>
            }
          >
            <b>{t('Changement en revue.')}</b> {tf('Nouveau moyen de règlement : versements bloqués et revue humaine, jusqu’au {j} à {h}.', { j: d.jourLong(m.bloqueJusqua), h: d.heure(m.bloqueJusqua) })}
          </Banniere>
        )}
        <ErreurLecture erreur={erreur} relire={() => (users.relire(), reglages.relire(), moyen.relire())} />
        {!users.donnees || !reglages.donnees ? (
          !erreur && <Chargement n={4} />
        ) : (
          <div className="g g13">
            <Panel style={{ alignSelf: 'start' }} aria={t('Sections des paramètres')}>
              <div className="e8-q"><Recherche q={q} setQ={setQ} placeholder={t('Chercher un réglage : sons, mot de passe…')} aria={t('Chercher dans les paramètres')} /></div>
              <nav className="ec8-snav" aria-label={t('Sections des paramètres')}>
                {visibles.map(([id, titre, ic]) => (
                  <a key={id} href={'#' + id} className={active === id ? 'on' : undefined} aria-current={active === id ? 'true' : undefined} onClick={() => setActive(id)}>
                    <Icone nom={ic} taille={18} />
                    {t(titre)}
                  </a>
                ))}
              </nav>
              {visibles.length === 0 && <AucunResultat effacer={() => setQ('')} texte={t('Aucun réglage ne correspond. Essayez « sons », « mot de passe » ou « zones ».')} />}
              <details className="e8-roles mt10">
                <summary>
                  <Icone nom="user-cog" taille={16} />
                  {t('Ce que chaque rôle règle')}
                </summary>
                {(['proprietaire', 'gerant', 'repartiteur', 'comptable'] as Role[]).map((r) => (
                  <Kv key={r} k={t(NOM_ROLE[r])} v={t(REGLE[r])} />
                ))}
              </details>
              {!proprio && <Interdit roles={['proprietaire']} quoi="Équipe et rôles, point de stockage, intégrations" />}
              {!argent && <Interdit roles={['proprietaire', 'comptable']} quoi="Moyen de règlement et compte entreprise" />}
              {!argent && (
                <Note ton="ink" icone="lock">
                  {titulaire ? tf('Utilisateurs, moyen de règlement et point de stockage : réservés au propriétaire, {n}.', { n: titulaire.nom }) : t('Utilisateurs, moyen de règlement et point de stockage : réservés au propriétaire.')}
                </Note>
              )}
            </Panel>
            <div className="e8-col">
              {voir('utilisateurs') && <Utilisateurs users={users.donnees} max={reglages.donnees.accesMax} />}
              {voir('securite') && <Securite codeSms={moi?.codeSms ?? true} moi={moi} journal={reglages.donnees.journal} />}
              {voir('notifications') && <MesNotifications zones={reglages.donnees.zonesExploitees} />}
              {voir('langue') && <Langue />}
              {voir('stockage') && <Stockage stockage={reglages.donnees.pointStockage} />}
              {voir('reglement') && <Reglement moyen={m ?? null} />}
              {voir('compte') && <Compte />}
            </div>
          </div>
        )}
      </Px>
    </Ecran>
  )
}

function Utilisateurs({ users, max }: { users: UtilisateurInterne[]; max: number }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const feuille = useFeuille('inviter')
  const refus = useRefus()
  const enLigne = useEnLigne()
  const { annoncer, vue } = useAnnonce()
  const [confirmer, setConfirmer] = useState<string | null>(null)
  const actifs = users.filter((u) => u.statut !== 'retire').length
  const cols: Colonne<UtilisateurInterne>[] = [
    {
      k: 'w',
      t: t('Utilisateur'),
      main: true,
      rendu: (u) => <Qui nom={u.nom} sous={u.derniereConnexion ? tf('dernière connexion {q}', { q: d.quand(u.derniereConnexion, maintenant) }) : t('jamais connecté')} />,
    },
    {
      k: 'r',
      t: t('Rôle'),
      rendu: (u) => (
        <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <Pill ton={u.role === 'proprietaire' ? 'acc' : 'ink'} sm>
            {t(NOM_ROLE[u.role])}
          </Pill>
          {u.statut === 'invite' && <St t={t('Invité')} ton="amber" />}
          {u.statut === 'retire' && <St t={t('Retiré')} ton="ink" />}
        </span>
      ),
    },
    { k: 'p', t: t('Peut'), rendu: (u) => <span className="t13">{t(DROITS[u.role])}</span> },
    { k: 'f', t: t('Double facteur'), rendu: (u) => (u.codeSms ? <St t={t('Activé')} ton="green" /> : <span className="t13 c3">{t('code SMS au changement d’appareil')}</span>) },
    {
      k: 'a',
      t: '',
      l: '',
      rendu: (u) =>
        u.moi ? (
          <span className="c3 t12">{t('vous')}</span>
        ) : u.role !== 'proprietaire' && u.statut !== 'retire' ? (
          confirmer === u.id ? (
            <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn danger sm"
                disabled={!enLigne}
                onClick={async () => {
                  const r = await source.parametres.retirer(u.id)
                  setConfirmer(null)
                  annoncer(r.ok, r.ok ? t('Accès retiré : ses sessions sont fermées.') : refus(r.raison))
                }}
              >
                {t('Confirmer le retrait')}
              </button>
              <button type="button" className="btn ghost sm" onClick={() => setConfirmer(null)}>
                {t('Annuler')}
              </button>
            </span>
          ) : (
            <button type="button" className="btn danger sm" onClick={() => setConfirmer(u.id)}>
              {t('Retirer')}
            </button>
          )
        ) : null,
    },
  ]
  return (
    <Panel id="utilisateurs" titre={t('Utilisateurs internes et rôles')} icone="users">
      <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', margin: '-4px 0 8px' }}>
        <span className="t13 c3" data-acces>
          {tf('{n} accès sur {max} · accès nominatifs, jamais partagés', { n: actifs, max })}
        </span>
        <button type="button" className="btn primary sm" disabled={actifs >= max || !enLigne} onClick={feuille.ouvrir}>
          <Icone nom="user-plus" taille={16} />
          {t('Inviter un utilisateur')}
        </button>
      </div>
      <div className="ec-tb">
        <Table cols={cols} rows={users} cle={(u) => u.id} legende={t('Utilisateurs internes et rôles')} />
      </div>
      {actifs >= max && <p className="t13 c3 mt8">{t('Nombre maximal d’accès atteint.')}</p>}
      {vue}
      <Hint icone="history">
        {t('Le retrait d’un utilisateur prend effet immédiatement, y compris sur ses sessions ouvertes. Chaque modification est journalisée avec son auteur.')} <Link to={chemin('parametres-journal')}>{t('Voir le journal')}</Link>
      </Hint>
      <FeuilleInviter ouverte={feuille.ouverte} fermer={feuille.fermer} restants={max - actifs} max={max} annoncer={annoncer} />
    </Panel>
  )
}

function FeuilleInviter({ ouverte, fermer, restants, max, annoncer }: { ouverte: boolean; fermer(): void; restants: number; max: number; annoncer(ok: boolean, texte: string): void }) {
  const { t, tf } = usePreferences()
  const refus = useRefus()
  const [nom, setNom] = useState('')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'gerant' | 'repartiteur' | 'comptable'>('repartiteur')
  const [erreur, setErreur] = useState<string | null>(null)
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Inviter un utilisateur')}>
      <div className="px">
        <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <h2 className="card-t">{t('Inviter un utilisateur')}</h2>
          <Pill ton="acc" sm>
            {tf('{n} accès restant(s) sur {max}', { n: restants, max })}
          </Pill>
        </div>
        <p className="t13 c3" style={{ margin: '6px 0 12px' }}>
          {t('Un accès nominatif par personne. L’invité reçoit un lien par SMS et par e-mail et crée son mot de passe.')}
        </p>
        <label className="champ">
          <span>{t('Nom et prénom')}</span>
          <input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="off" required />
        </label>
        <label className="champ">
          <span>{t('Téléphone (+237)')}</span>
          <input inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="off" placeholder="6XX XX XX XX" required />
        </label>
        <p className="t12 c3">{t('9 chiffres après l’indicatif')}</p>
        <label className="champ">
          <span>{t('E-mail')}</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </label>
        <div className="t13 b8 mt12" id="e8-role">
          {t('Rôle')}
        </div>
        <div role="radiogroup" aria-labelledby="e8-role" className="e8-radios">
          {(['gerant', 'repartiteur', 'comptable'] as const).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={role === r} className={'radio' + (role === r ? ' on' : '')} onClick={() => setRole(r)}>
              <span className="rd"></span>
              <span className="grow">
                <span className="rt" style={{ display: 'block' }}>
                  {t(NOM_ROLE[r])}
                </span>
                <span className="rs" style={{ display: 'block' }}>
                  {t(DROITS_INVITE[r])}
                </span>
              </span>
            </button>
          ))}
        </div>
        <Note ton="ink" icone="crown">
          {t('Le rôle propriétaire ne s’attribue pas ici : un seul propriétaire, transfert par BelivaY sur preuve écrite.')}
        </Note>
        {erreur && (
          <Note ton="red" icone="circle-alert" role="alert">
            {erreur}
          </Note>
        )}
        <div className="btns ec-btns mt14">
          <button type="button" className="btn secondary" onClick={fermer}>
            {t('Annuler')}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={async () => {
              const r = await source.parametres.inviter({ nom, telephone: tel, email, role })
              if (!r.ok) return setErreur(refus(r.raison))
              setErreur(null)
              setNom('')
              setTel('')
              setEmail('')
              fermer()
              annoncer(true, t('Invitation envoyée.'))
            }}
          >
            <Icone nom="send" taille={16} />
            {t('Envoyer l’invitation')}
          </button>
        </div>
      </div>
    </Feuille>
  )
}

function Securite({ codeSms, moi, journal }: { codeSms: boolean; moi?: UtilisateurInterne; journal: ReglagesEntreprise['journal'] }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const appareils = useLecture(() => source.parametres.appareils(), [])
  const feuille = useFeuille('mot-de-passe')
  const refus = useRefus()
  const { annoncer, vue } = useAnnonce()
  const [actuel, setActuel] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const autres = (appareils.donnees ?? []).filter((a) => !a.actuel)
  const change = moi ? journal.filter((j) => j.par === moi.nom && /^Mot de passe/.test(j.quoi)).sort((a, b) => b.le - a.le)[0] : undefined
  return (
    <Panel id="securite" titre={t('Mot de passe et sécurité')} icone="key-round">
      <Kv k={t('Mot de passe')} v={change ? tf('modifié {q}', { q: d.quand(change.le, maintenant) }) : t('8 caractères au moins, dont un chiffre')} />
      <Kv k={t('Double facteur (code SMS)')} v={codeSms ? t('à chaque connexion (rôle d’argent) · activé') : t('code SMS au changement d’appareil')} />
      <Kv k={t('Session')} v={tf('{h} heures, puis reconnexion', { h: OUTILS.sessionH })} />
      <Kv k={t('Appareils')} v={appareils.donnees ? appareils.donnees.map((a) => (a.actuel ? tf('{n} (cet appareil)', { n: t(a.nom) }) : `${t(a.nom)} · ${a.lieu}`)).join(' · ') : '…'} />
      <div className="btns ec-btns">
        <button type="button" className="btn secondary" onClick={feuille.ouvrir}>
          <Icone nom="key-round" taille={16} />
          {t('Changer le mot de passe')}
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={autres.length === 0}
          onClick={async () => {
            for (const a of autres) await source.parametres.deconnecterAppareil(a.id)
            appareils.relire()
            annoncer(true, t('Autres appareils déconnectés.'))
          }}
        >
          <Icone nom="log-out" taille={16} />
          {t('Déconnecter les autres appareils')}
        </button>
      </div>
      {vue}
      <Hint icone="database">
        {t('Vos données personnelles : consulter, exporter ou demander leur effacement.')} <Link to={chemin('mes-donnees')}>{t('Mes données')}</Link>
      </Hint>
      <Feuille ouverte={feuille.ouverte} fermer={feuille.fermer} titre={t('Changer le mot de passe')}>
        <h2 className="card-t">{t('Changer le mot de passe')}</h2>
        <label className="champ">
          <span>{t('Mot de passe actuel')}</span>
          <input type="password" autoComplete="current-password" value={actuel} onChange={(e) => setActuel(e.target.value)} />
        </label>
        <label className="champ">
          <span>{t('Nouveau mot de passe')}</span>
          <input type="password" autoComplete="new-password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} />
        </label>
        <p className={'e7-aide' + (nouveau && !motDePasseValide(nouveau) ? ' rouge' : '')}>{t('8 caractères au moins, dont un chiffre. Vos autres appareils seront déconnectés.')}</p>
        {erreur && (
          <p className="note red mt10" role="alert">
            {erreur}
          </p>
        )}
        <button
          type="button"
          className="btn primary bloc mt16"
          disabled={!actuel || !nouveau}
          onClick={async () => {
            const r = await source.parametres.changerMotDePasse(actuel, nouveau)
            if (!r.ok) return setErreur(refus(r.raison))
            setErreur(null)
            setActuel('')
            setNouveau('')
            feuille.fermer()
            appareils.relire()
            annoncer(true, t('Mot de passe changé ; vos autres appareils sont déconnectés.'))
          }}
        >
          {t('Enregistrer')}
        </button>
      </Feuille>
    </Panel>
  )
}

function MesNotifications({ zones }: { zones: { code: string; nom: string }[] }) {
  const { t, tf } = usePreferences()
  const argent = usePeut(['proprietaire', 'comptable'])
  const lecture = useLecture(() => source.parametres.notifications(), [])
  const refus = useRefus()
  const { annoncer, vue } = useAnnonce()
  const [p, setP] = useState<PreferencesNotifications | null>(null)
  useEffect(() => {
    if (lecture.donnees) setP(lecture.donnees)
  }, [lecture.donnees])
  const verrou = (x: TypeAlerte) => OUTILS.alertesVerrouillees.includes(x)
  const smsPermis = (x: TypeAlerte) => OUTILS.typesSms.includes(x)
  // Le répartiteur ne voit aucun montant : pas de ligne sur les versements.
  const types = TYPES.filter((x) => argent || x !== 'versement_refuse')
  return (
    <Panel id="notifications" titre={t('Mes notifications')} icone="bell">
      {!p ? (
        <Chargement n={1} />
      ) : (
        <>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '-4px 0 10px' }}>
            <span className="t13 c3">{t('Zones suivies :')}</span>
            <div className="chips" role="group" aria-label={t('Zones suivies')}>
              {zones.map((z) => {
                const on = p.zones.includes(z.code)
                return (
                  <button key={z.code} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setP({ ...p, zones: on ? p.zones.filter((x) => x !== z.code) : [...p.zones, z.code] })}>
                    {`${z.code} ${z.nom}`}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="e8-mx-boite">
            <table className="ec8-mx">
              <thead>
                <tr>
                  <th scope="col">{t('Type')}</th>
                  {CANAUX.map((c) => (
                    <th key={c} scope="col">
                      {t(NOM_CANAL[c])}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {types.map((x) => (
                  <tr key={x}>
                    <td>
                      {t(NOM_ALERTE[x])}
                      {verrou(x) && <div className="t2">{t('non désactivable')}</div>}
                    </td>
                    {CANAUX.map((c) => (
                      <td key={c}>
                        {c === 'sms' && !smsPermis(x) ? (
                          <span className="c4" title={t('SMS non prévu pour cette alerte')}>
                            —
                          </span>
                        ) : (
                          <Tg
                            on={verrou(x) || p.matrice[x].includes(c)}
                            lock={verrou(x)}
                            libelle={`${t(NOM_ALERTE[x])} · ${t(NOM_CANAL[c])}`}
                            changer={(v) => setP({ ...p, matrice: { ...p.matrice, [x]: v ? [...p.matrice[x], c] : p.matrice[x].filter((y) => y !== c) } })}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="e8-confort">
            <span className="grow t13">{tf('Résumé quotidien par e-mail à {h} h', { h: OUTILS.resumeH })}</span>
            <Tg on={p.resumeQuotidien} libelle={tf('Résumé quotidien par e-mail à {h} h', { h: OUTILS.resumeH })} changer={(v) => setP({ ...p, resumeQuotidien: v })} />
          </div>
          <div className="e8-confort">
            <span className="grow t13">{p.plageCalme ? tf('Plage calme de {de} h à {a} h : pas de push hors alertes obligatoires et incidents bloquants', { de: p.plageCalme.de, a: p.plageCalme.a }) : t('Plage calme : pas de push hors alertes obligatoires et incidents bloquants')}</span>
            <Tg on={!!p.plageCalme} libelle={t('Plage calme')} changer={(v) => setP({ ...p, plageCalme: v ? (p.plageCalme ?? { de: 21, a: 7 }) : null })} />
          </div>
          {p.plageCalme && (
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {(['de', 'a'] as const).map((k) => (
                <label key={k} className="flt on">
                  <span>{t(k === 'de' ? 'De' : 'À')}</span>
                  <select aria-label={t(k === 'de' ? 'Début de la plage calme' : 'Fin de la plage calme')} value={p.plageCalme![k]} onChange={(e) => setP({ ...p, plageCalme: { ...p.plageCalme!, [k]: Number(e.target.value) } })}>
                    {[...Array(24).keys()].map((h) => (
                      <option key={h} value={h}>
                        {tf('{h} h', { h })}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          <div className="e8-confort">
            <span className="grow t13">{t('Heures calmes, push sur cet appareil et message d’essai : aussi dans Notifications.')}</span>
            <Link className="btn ghost sm" to={chemin('notifications')}>
              {t('Ouvrir')}
            </Link>
          </div>
          <Hint icone="info">{t('Réglage par utilisateur, par zone et par type. SMS réservé au litige ouvert et au versement refusé ; aucune promotion par SMS.')}</Hint>
          <div className="btns ec-btns mt10">
            <button
              type="button"
              className="btn primary sm"
              onClick={async () => {
                const x = await geste('Enregistrer mes notifications', (s) => s.parametres.reglerNotifications(p))
                if (x.etat === 'en_file') return annoncer(true, t('Hors connexion : réglage gardé, envoyé au retour du réseau.'))
                annoncer(x.r.ok, x.r.ok ? t('Préférences enregistrées.') : x.r.raison === 'plage' ? refus('plage') : t('Suivez au moins une zone.'))
              }}
            >
              {t('Enregistrer mes notifications')}
            </button>
          </div>
          {vue}
        </>
      )}
    </Panel>
  )
}

function Langue() {
  const { t, langue, setLangue, choixTheme, setTheme, sons, setSons, vibrations, setVibrations, animationsReduites, setAnimationsReduites, donneesEconomes, setDonneesEconomes } = usePreferences()
  const argent = usePeut(['proprietaire', 'comptable'])
  const langues = [
    ['fr', 'Français'],
    ['en', 'English'],
  ] as const
  const themes = [
    ['light', 'Clair', 'sun'],
    ['dark', 'Sombre', 'moon'],
    ['auto', 'Automatique', 'monitor'],
  ] as const
  return (
    <Panel id="langue" titre={t('Langue, thème et fuseau')} icone="languages">
      <div className="t13 b8" id="e8-langue">
        {t('Langue')}
      </div>
      <div className="seg mt8" role="radiogroup" aria-labelledby="e8-langue">
        {langues.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={langue === v} className={langue === v ? 'on' : ''} onClick={() => setLangue(v)}>
            {l}
          </button>
        ))}
      </div>
      <div className="mt14">
        <TailleDuTexte />
      </div>
      <div className="t13 b8 mt14" id="e8-theme">
        {t('Thème')}
      </div>
      <div className="seg mt8" role="radiogroup" aria-labelledby="e8-theme">
        {themes.map(([v, l, ic]) => (
          <button key={v} type="button" role="radio" aria-checked={choixTheme === v} className={choixTheme === v ? 'on' : ''} onClick={() => setTheme(v)}>
            <Icone nom={ic} taille={16} />
            {t(l)}
          </button>
        ))}
      </div>
      <div className="ec7-grp mt14">{t('Sons, vibrations et affichage')}</div>
      {(
        [
          ['Sons', 'signal d’un nouveau paquet, d’un seuil bas, d’un geste réussi', sons, setSons],
          ['Vibrations', 'au téléphone, avec les sons', vibrations, setVibrations],
          ['Animations réduites', 'moins de mouvement à l’écran', animationsReduites, setAnimationsReduites],
          ['Données économes', 'cartes et images allégées sur un réseau lent', donneesEconomes, setDonneesEconomes],
        ] as const
      ).map(([titre, sous, on, changer]) => (
        <div key={titre} className="e8-confort">
          <span className="grow t13">
            <b>{t(titre)}</b> · {t(sous)}
          </span>
          <Tg on={on} libelle={t(titre)} changer={(v) => changer(v)} />
        </div>
      ))}
      <ApercuSons />
      <Kv k={t('Fuseau horaire')} v={t('Afrique/Douala (UTC+1) · fixé par l’espace pays Cameroun')} />
      <div className="ec7-grp mt14">{t('Préférences de travail')}</div>
      <Li icone="map-pinned" ton="acc" t={t('Zones suivies et alertes')} s={t('les paquets de vos zones, par canal')} to={chemin('parametres') + '#notifications'} />
      <Li icone="calendar-clock" ton="acc" t={t('Rapport du vendredi')} s={argent ? t('reçu chaque vendredi par e-mail, en PDF ou CSV') : t('réglé par le propriétaire ou le comptable')} to={chemin('rapports', { sheet: 'programme' })} />
      <Li icone="package-open" ton="acc" t={t('Seuils des emballages')} s={t('commande proposée au seuil de réassort, signalée par un son')} to={chemin('emballages', { onglet: 'commandes' })} />
      <Hint icone="smartphone">{t('Sons, vibrations, animations et données économes valent pour cet appareil.')}</Hint>
    </Panel>
  )
}

function Stockage({ stockage }: { stockage: ReglagesEntreprise['pointStockage'] }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const proprio = usePeut(['proprietaire'])
  const refus = useRefus()
  const carte = useLecture(() => source.zones.carte(), [])
  const { annoncer, vue } = useAnnonce()
  const [edition, setEdition] = useState(false)
  const [adresse, setAdresse] = useState(stockage.adresse)
  const [consignes, setConsignes] = useState(stockage.consignes)
  // Zone du point de stockage : celle dont le nom figure dans l'adresse déclarée (la carte BelivaY fait foi).
  const zone = carte.donnees?.find((z) => stockage.adresse.toLowerCase().includes(z.nom.toLowerCase()))
  return (
    <Panel id="stockage" titre={t('Point de stockage de nuit')} icone="warehouse">
      <div className="g g2" style={{ marginTop: 0 }}>
        <div>
          {edition ? (
            <>
              <label className="champ" style={{ marginTop: 0 }}>
                <span>{t('Adresse')}</span>
                <input value={adresse} onChange={(e) => setAdresse(e.target.value)} />
              </label>
              <label className="champ">
                <span>{t('Consignes')}</span>
                <textarea rows={2} value={consignes} onChange={(e) => setConsignes(e.target.value)} />
              </label>
              <div className="btns ec-btns">
                <button
                  type="button"
                  className="btn primary"
                  onClick={async () => {
                    const x = await geste('Modifier le point de stockage', (s) => s.parametres.modifierStockage(adresse, consignes))
                    if (x.etat === 'en_file') return setEdition(false), annoncer(true, t('Hors connexion : modification gardée, envoyée au retour du réseau.'))
                    if (x.r.ok) (setEdition(false), annoncer(true, t('Point de stockage modifié et journalisé.')))
                    else annoncer(false, refus(x.r.raison))
                  }}
                >
                  {t('Enregistrer')}
                </button>
                <button type="button" className="btn secondary" onClick={() => (setEdition(false), setAdresse(stockage.adresse), setConsignes(stockage.consignes))}>
                  {t('Annuler')}
                </button>
              </div>
            </>
          ) : (
            <>
              <Props
                paires={[
                  [t('Lieu'), zone ? `${stockage.adresse} (${zone.code})` : stockage.adresse],
                  [t('Consignes'), t(stockage.consignes)],
                  [t('Colis la nuit'), t('ici ou au relais, jamais chez un livreur')],
                  [t('Visite'), t('possible à tout moment par BelivaY')],
                  [t('Modifié'), tf('{q} par {par}', { q: d.quand(stockage.modifieLe, maintenant), par: stockage.par })],
                ]}
              />
              {proprio ? (
                <div className="btns ec-btns">
                  <button type="button" className="btn secondary" onClick={() => setEdition(true)}>
                    <Icone nom="pencil" taille={16} />
                    {t('Modifier l’adresse')}
                  </button>
                </div>
              ) : (
                <div className="lock mt10">
                  <Icone nom="lock" taille={14} /> {t('Seul le propriétaire modifie le point de stockage.')}
                </div>
              )}
            </>
          )}
          {vue}
        </div>
        {carte.donnees && <CarteZones zones={carte.donnees} titre={t('Point de stockage de nuit')} choisie={zone?.code ?? null} hauteurMax={240} etiquettes="code" />}
      </div>
    </Panel>
  )
}

function Reglement({ moyen }: { moyen: MoyenReglement | null }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const nom = (m: MoyenReglement) => `${m.operateur === 'MTN' ? 'MTN Mobile Money' : 'Orange Money'} ${m.numero}`
  return (
    <Panel id="reglement" titre={t('Moyen de règlement')} icone="wallet">
      {!moyen ? (
        <Chargement n={1} />
      ) : moyen.statut === 'en_revue' ? (
        <>
          <Li
            icone="smartphone"
            ton="amber"
            t={tf('{m} · en revue', { m: nom(moyen) })}
            s={moyen.bloqueJusqua ? tf('versements bloqués jusqu’au {j} à {h}', { j: d.jourLong(moyen.bloqueJusqua), h: d.heure(moyen.bloqueJusqua) }) : undefined}
            droite={<St t={t('En revue')} ton="amber" />}
          />
          <div className="lock mt8">
            <Icone nom="hourglass" taille={14} /> {t('Attendre la revue humaine de la Finance BelivaY')}
          </div>
        </>
      ) : (
        <Li
          icone="smartphone"
          ton="acc"
          t={nom(moyen)}
          s={moyen.verifieLe ? tf('au nom de {n} · vérifié le {j}', { n: moyen.titulaire, j: d.jourLong(moyen.verifieLe) }) : tf('au nom de {n}', { n: moyen.titulaire })}
          droite={<St t={t('Vérifié')} ton="green" />}
        />
      )}
      <div className="row mt10" style={{ gap: 10, flexWrap: 'wrap' }}>
        <Link className="btn secondary sm" to={chemin('reglements')}>
          <Icone nom="banknote" taille={16} />
          {t('Gérer dans Règlements')}
        </Link>
        <span className="lock">
          <Icone nom="lock" taille={14} /> {t('propriétaire seulement · un changement bloque les versements et passe en revue humaine')}
        </span>
      </div>
    </Panel>
  )
}

function Compte() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const e = s.entreprise
  return (
    <Panel id="compte" titre={t('Compte entreprise')} icone="building-2">
      {e && <Kv k={e.nom} v={e.pilote ? tf('pilote · jour {j} sur {n}', { j: e.pilote.jour, n: e.pilote.duree }) : t(NOM_ETAT[e.etat])} />}
      <Kv k={t('Supprimer le compte')} v={tf('pas de bouton : résiliation du contrat, préavis de {n} jours', { n: OUTILS.preavisJours })} />
      <Kv k={t('Après la fin du contrat')} v={t('relevés et preuves lisibles 180 jours')} />
      <Note ton="ink" icone="user-cog">
        {t('Propriétaire injoignable : BelivaY ne transfère jamais les droits sans preuve écrite ; les opérations continuent avec les rôles existants.')}
      </Note>
      <Note ton="red" icone="ban">
        <b>{t('Interdit')}</b> : {t('donner le rôle propriétaire à un répartiteur pour éviter une démarche.')}
      </Note>
      <div className="btns ec-btns">
        <Link className="btn secondary" to={chemin('contrat')}>
          <Icone nom="file-signature" taille={16} />
          {t('Contrat et documents')}
        </Link>
        <Link className="btn secondary" to={chemin('etat')}>
          <Icone nom="shield-check" taille={16} />
          {t('État du compte')}
        </Link>
      </div>
    </Panel>
  )
}
