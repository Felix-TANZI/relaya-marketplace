// Client des comptes réels (serveur : site/serveur/routeur.js, fonction Vercel api/comptes.js ; guide : COMPTES-REELS.md).
// Commun aux six applications (même origine : /api/…). La session est un cookie HttpOnly que le navigateur envoie seul ;
// ce module ne voit ni ne garde jamais de jeton. Chaque appel rend un résultat, jamais une exception :
// - { ok: true, … } ;
// - { ok: false, code, message, statut, data } : refus du serveur (code stable : identifiants, bloque, existe…) ;
// - code « indisponible » : pas de base configurée (503 base_absente), pas de fonction (site servi sans /api, dev local
//   avec Vite seul), ou réseau coupé. L'application garde alors le compte de démonstration.

export type Espace = 'client' | 'vendeur' | 'entreprise' | 'livreur' | 'relais' | 'console'
export type StatutCompte = 'actif' | 'en_attente' | 'refuse' | 'suspendu'

/** Le compte tel que le serveur le rend (forme RUtilisateur du kit, plus l'espace, le rôle et le statut). */
export interface CompteReel {
  id: string
  email: string
  email_masque: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  has_usable_password: boolean
  /** Console : second facteur TOTP en place. */
  deuxieme_facteur: boolean
  espace: Espace
  role: string
  statut: StatutCompte
  type_compte: 'standard' | 'diaspora'
  pays: string | null
  organisation_id: string | null
  /** Nom donné à la candidature (entreprise, point relais) ou au dossier (vendeur). */
  organisation: string | null
  conditions: { version: string; acceptees_le: string } | null
  cree_le: string
}
export interface SessionReelle {
  user: CompteReel
  session: { expire_le: string; se_souvenir: boolean }
}
/** Console : le mot de passe est juste, la session attend le second facteur (TOTP) ; « enrolement » au premier accès. */
export interface DefiReel {
  deuxieme_facteur: 'totp' | 'enrolement'
  defi: string
  expire_le: string
  prenom: string
  nom: string
}
export interface EnrolementTotp {
  /** Secret à saisir à la main (groupes de 4). */
  secret: string
  otpauth: string
  /** QR à scanner (data:image/svg+xml). */
  qr: string
}
export type Refus = { ok: false; code: string; message: string; statut: number; data?: Record<string, unknown> }
export type Resultat<T extends object = object> = ({ ok: true } & T) | Refus

const BASE = '/api'

async function appel<T extends object>(methode: string, chemin: string, espace: Espace, corps?: unknown): Promise<Resultat<T>> {
  const sep = chemin.includes('?') ? '&' : '?'
  let r: Response
  try {
    r = await fetch(`${BASE}${chemin}${sep}espace=${espace}`, {
      method: methode,
      credentials: 'same-origin',
      headers: corps === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    })
  } catch {
    return { ok: false, code: 'indisponible', message: 'Service des comptes injoignable.', statut: 0 }
  }
  const type = r.headers.get('content-type') ?? ''
  // Pas de fonction derrière /api (page HTML de l'application, 404 du serveur de fichiers) : indisponible.
  if (!type.includes('application/json')) return { ok: false, code: 'indisponible', message: 'Service des comptes absent.', statut: r.status }
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}))
  if (r.ok) return { ok: true, ...(j as T) }
  const e = (j as { error?: { code?: string; message?: string; data?: Record<string, unknown> } }).error ?? {}
  const code = r.status === 503 ? 'indisponible' : (e.code ?? 'erreur')
  return { ok: false, code, message: e.message ?? '', statut: r.status, data: e.data }
}

export interface EtatComptes {
  base: boolean
  email: boolean
  premier_acces: boolean
}
let etatEnCours: Promise<EtatComptes> | null = null
/** Base configurée ? E-mails branchés ? (lu une fois par chargement de page) */
export function etat(): Promise<EtatComptes> {
  return (etatEnCours ??= appel<EtatComptes>('GET', '/auth/etat', 'client').then((r) => (r.ok ? { base: r.base, email: r.email, premier_acces: r.premier_acces } : { base: false, email: false, premier_acces: false })))
}

export interface Inscription {
  email?: string
  motDePasse: string
  prenom?: string
  nom?: string
  telephone?: string
  /** Version des conditions acceptées (la date est celle du serveur). */
  conditions: { version?: string; acceptees: true }
  seSouvenir?: boolean
  typeCompte?: 'standard' | 'diaspora'
  pays?: string
  /** Vendeur, entreprise, point relais : ce qui est demandé à la candidature (textes courts). */
  candidature?: Record<string, string | number | boolean | string[]>
  /** Livreur, membre de la console : le jeton du lien d'invitation. */
  jeton?: string
}

export const comptesReels = {
  etat,
  session: (espace: Espace) => appel<SessionReelle>('GET', '/auth/me/', espace),
  inscrire: (espace: Espace, i: Inscription) =>
    appel<SessionReelle>('POST', '/auth/register/', espace, {
      email: i.email,
      password: i.motDePasse,
      first_name: i.prenom,
      last_name: i.nom,
      phone: i.telephone,
      conditions_acceptees: i.conditions.acceptees,
      conditions_version: i.conditions.version,
      se_souvenir: i.seSouvenir ?? true,
      type_compte: i.typeCompte,
      pays: i.pays,
      candidature: i.candidature,
      jeton: i.jeton,
    }),
  /** identifiant : e-mail, ou numéro de téléphone (livreur, point relais) ; mot de passe ou PIN. Console : deuxiemeFacteur. */
  connecter: (espace: Espace, identifiant: string, motDePasse: string, seSouvenir = true) =>
    appel<SessionReelle>('POST', '/auth/login/', espace, { username: identifiant, password: motDePasse, se_souvenir: seSouvenir }),
  deconnecter: (espace: Espace) => appel('POST', '/auth/logout/', espace, {}),
  changerMotDePasse: (espace: Espace, ancien: string | null, nouveau: string) => appel('POST', '/auth/change-password/', espace, { old_password: ancien ?? '', new_password: nouveau }),
  /** Champs absents : inchangés ; photo null : retirée (data:image/… de 150 Ko au plus). */
  modifierProfil: (espace: Espace, p: { prenom?: string; nom?: string; telephone?: string | null; photo?: string | null }) =>
    appel<{ user: CompteReel }>('PATCH', '/auth/profile', espace, {
      ...(p.prenom !== undefined ? { first_name: p.prenom } : {}),
      ...(p.nom !== undefined ? { last_name: p.nom } : {}),
      ...(p.telephone !== undefined ? { phone: p.telephone } : {}),
      ...(p.photo !== undefined ? { avatar: p.photo } : {}),
    }),
  /** Export de ses données (droit d'accès) : tout ce que le serveur des comptes garde, en JSON. */
  exporter: (espace: Espace) => appel<{ exporte_le: string; compte: Record<string, unknown> }>('GET', '/auth/export', espace),
  /** Le même export, enregistré par le navigateur (« mes-donnees-belivay.json »). */
  async telechargerMesDonnees(espace: Espace): Promise<Resultat> {
    const r = await comptesReels.exporter(espace)
    if (!r.ok) return r
    const { ok: _ok, ...donnees } = r
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' }))
    a.download = 'mes-donnees-belivay.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    return { ok: true }
  },
  /** Suppression réelle du compte (mot de passe demandé). */
  supprimer: (espace: Espace, motDePasse: string) => appel('DELETE', '/auth/account', espace, { mot_de_passe: motDePasse }),
  /** Toujours la même réponse ; envoi « support » : aucun e-mail ne part sur ce site (contacter le support). */
  oubli: (espace: Espace, email: string) => appel<{ envoi: 'email' | 'support'; destination: string; valide_minutes: number }>('POST', '/auth/password/forgot', espace, { email }),
  lireReinitialisation: (espace: Espace, jeton: string) => appel<{ email: string }>('GET', '/auth/password/reset?jeton=' + encodeURIComponent(jeton), espace),
  reinitialiser: (espace: Espace, jeton: string, motDePasse: string) => appel<{ email: string }>('POST', '/auth/password/reset', espace, { jeton, mot_de_passe: motDePasse }),
  /** Entreprise → livreur ; gérant d'un point relais → membre ; propriétaire de la console → membre (role). Le lien
   *  revient toujours à l'invitant. */
  inviter: (espace: 'entreprise' | 'relais' | 'console', i: { email: string; prenom?: string; nom?: string; telephone?: string; role?: string }) =>
    appel<{ lien: string; envoye: boolean; expire_le: string }>('POST', '/auth/invitations', espace, i),
  lireInvitation: (espace: 'livreur' | 'relais' | 'console', jeton: string) =>
    appel<{ email: string; prenom: string; nom: string; role: string | null; invitant: string | null; organisation: string | null; expire_le: string }>('GET', '/auth/invitations/' + encodeURIComponent(jeton), espace),
  sessions: (espace: Espace) => appel<{ sessions: { id: string; appareil: string; cree_le: string; vu_le: string; courante: boolean }[] }>('GET', '/auth/sessions', espace),
  revoquerSession: (espace: Espace, id: string) => appel('DELETE', '/auth/sessions/' + encodeURIComponent(id), espace),
  revoquerAutres: (espace: Espace) => appel('POST', '/auth/sessions/revoke-others', espace, {}),
  /** Premier mot de passe du propriétaire de la console (ADMIN_BOOTSTRAP_EMAIL + ADMIN_BOOTSTRAP_CODE) → enrôlement. */
  premierAcces: (email: string, code: string, motDePasse: string) => appel<DefiReel>('POST', '/auth/console/premier-acces', 'console', { email, code, mot_de_passe: motDePasse }),
  /**
   * Console : jamais de session sans second facteur. connecter → défi ; enrôlement (QR) si deuxieme_facteur vaut
   * « enrolement » ; verifier(code à 6 chiffres ou code de secours « ABCD-EFGH ») → session. Au premier code juste,
   * codes_secours (dix, montrés une seule fois) arrivent avec la session.
   */
  deuxiemeFacteur: {
    connecter: (email: string, motDePasse: string, seSouvenir = true) => appel<DefiReel>('POST', '/auth/login/', 'console', { username: email, password: motDePasse, se_souvenir: seSouvenir }),
    /** Membre invité : mot de passe choisi, puis enrôlement. */
    activer: (jeton: string, i: { motDePasse: string; prenom?: string; nom?: string; conditions: { version?: string; acceptees: true } }) =>
      appel<DefiReel>('POST', '/auth/register/', 'console', { jeton, password: i.motDePasse, first_name: i.prenom, last_name: i.nom, conditions_acceptees: i.conditions.acceptees, conditions_version: i.conditions.version }),
    enrolement: (defi: string) => appel<EnrolementTotp>('POST', '/auth/2fa/enrolement', 'console', { defi }),
    verifier: (defi: string, code: string) => appel<SessionReelle & { codes_secours?: string[] }>('POST', '/auth/2fa/verifier', 'console', { defi, code }),
    nouveauxCodesSecours: (motDePasse: string) => appel<{ codes_secours: string[] }>('POST', '/auth/2fa/codes-secours', 'console', { mot_de_passe: motDePasse }),
  },
  console: {
    comptes: (filtre: { espace?: Espace; statut?: StatutCompte } = {}) =>
      appel<{ comptes: (CompteReel & { candidature: Record<string, unknown> })[] }>(
        'GET',
        '/admin/comptes' + (filtre.espace || filtre.statut ? '?' + new URLSearchParams({ ...(filtre.espace ? { filtre_espace: filtre.espace } : {}), ...(filtre.statut ? { statut: filtre.statut } : {}) }) : ''),
        'console',
      ),
    statut: (id: string, statut: StatutCompte) => appel<{ user: CompteReel }>('POST', `/admin/comptes/${encodeURIComponent(id)}/statut`, 'console', { statut }),
    supprimer: (id: string) => appel('DELETE', `/admin/comptes/${encodeURIComponent(id)}`, 'console'),
  },
}

/** « Awa Ngono » */
export const nomComplet = (c: Pick<CompteReel, 'first_name' | 'last_name'>) => [c.first_name, c.last_name].filter(Boolean).join(' ')
