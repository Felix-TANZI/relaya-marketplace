// DONNÉES DE DÉMONSTRATION — domaine « session » (ENT-P01, en-tête) : utilisateur connecté et son rôle, entreprise,
// compteurs lus dans les autres domaines (aucun compteur écrit). Connexion par numéro +237 ou e-mail et mot de passe
// d'essai ; échecs, blocage, code SMS, renvoi et session lus dans le registre (PARAMETRES.acces), mot de passe dans
// MDP-LONG (PARAMETRES_FLOTTE). Le propriétaire et le comptable reçoivent toujours un code ; le répartiteur seulement
// sur un appareil nouveau (ENT-P01R-03) ; le code tiré au sort est rendu sous « codeDemonstration » (l'API ne le
// renvoie jamais). Rodrigue Ndi a été retiré par la propriétaire : « Accès retiré » (ENT-03-R05). Invitations de
// démonstration : « bienvenue-serge » (première connexion de Serge, répartiteur) et « bienvenue-josiane » (expirée).
// Gaëlle a deux espaces (entreprise et point relais de l'agence, ENT-PAR-06). Scénario « ?role=… » : voir l'espace
// d'un rôle.
import type { DomaineSession, EspaceAcces, InvitationAcces, ResultatConnexion, SessionEntreprise } from '../donnees/domaines/session'
import { ROLES, type Role } from '../donnees/communs'
import { PARAMETRES } from '../calculs/registre'
import { motDePasseValide } from '../calculs/flotte'
import { plafondDe } from '../calculs/paliers'
import { HEURE, JOUR, MINUTE } from '../calculs/temps'
import { REFERENCE, maintenant } from './horloge'
import { ENTREPRISE, MOT_DE_PASSE_DEMO, UTILISATEURS, ZONES } from './jeu-essai'
import { parametresDemo } from './parametres'
import { roleCourant, sessionDemo } from './acces'
import { magasin, repondre } from './stockage'
import { etatCompte } from './compte'
import { compteurs } from './compteurs'
import { signer } from './journal'
import { compteParIdentifiant, initialesDe, retouchesDe } from '../donnees/mon-compte'

/** Mon compte : nom retouché par la personne elle-même (src/donnees/mon-compte.ts). */
function retoucher(u: { id: string; prenom: string; nom: string; initiales: string; role: Role }) {
  const r = retouchesDe(u.id)
  const prenom = r.prenom ?? u.prenom
  const nom = r.nom ?? u.nom
  return { id: u.id, prenom, nom, initiales: r.prenom || r.nom ? initialesDe(prenom, nom) : u.initiales, role: u.role }
}

const A = PARAMETRES.acces
const normer = (s: string) => s.trim().toLowerCase().replace(/[\s.-]/g, '')
const masquer = (tel: string) => '+237 ••• •• ' + tel.slice(-2)

/** Utilisateur retiré par la propriétaire : ses identifiants sont justes, son accès n'existe plus. */
const RETIRE = { id: 'u-rodrigue', telephone: '+237677000004', email: 'rodrigue@yafeexpress.cm' }
const ESPACES: Record<string, EspaceAcces[]> = { 'u-gaelle': [{ espace: 'entreprise', nom: ENTREPRISE.nom }, { espace: 'relais', nom: 'Relais Mokolo · Agence Yafé Express' }] }
const INVITATIONS: Record<string, { utilisateurId: string | null; prenom: string; nom: string; role: Role; telephone: string; expireLe: number }> = {
  'bienvenue-serge': { utilisateurId: 'u-serge', prenom: 'Serge', nom: 'Mbarga', role: 'repartiteur', telephone: '+237677000002', expireLe: REFERENCE + 6 * JOUR }, // envoyée hier
  'bienvenue-josiane': { utilisateurId: null, prenom: 'Josiane', nom: 'Mballa', role: 'comptable', telephone: '+237677000005', expireLe: REFERENCE - 2 * JOUR },
}

// Ce que la démonstration garde en plus de la session commune (acces.ts) : mots de passe changés, appareils connus,
// heure de connexion (session de sessionHeures), invitations utilisées, défis du mot de passe oublié.
const accesDemo = magasin('acces', () => ({
  motsDePasse: {} as Record<string, string>,
  appareils: [] as string[],
  connecteLe: null as number | null,
  expiree: false,
  invitationsUtilisees: [] as string[],
  oublis: {} as Record<string, { code: string; essais: number; envoyeLe: number; utilisateurId: string | null; telephone: string }>,
}))

function tirerCode(): string {
  let c = ''
  for (let i = 0; i < A.longueurCode; i++) c += Math.floor(Math.random() * 10)
  return c
}

// Scénario de démonstration : « ?role=… » dans l'adresse choisit l'utilisateur de ce rôle (gardé ensuite).
function suivreScenario() {
  if (typeof location === 'undefined') return
  const r = new URLSearchParams(location.search).get('role') as Role | null
  if (!r || !ROLES.includes(r) || r === roleCourant()) return
  const u = UTILISATEURS.find((x) => x.role === r)!
  sessionDemo.ecrire((e) => {
    e.connecte = true
    e.utilisateurId = u.id
  })
}

/** Ouvre la session (code juste, ou répartiteur sur un appareil connu). */
function ouvrir(utilisateurId: string) {
  sessionDemo.ecrire((s) => Object.assign(s, { connecte: true, utilisateurId, echecs: 0, bloqueJusqua: null, defi: null }))
  accesDemo.ecrire((s) => {
    s.connecteLe = maintenant()
    s.expiree = false
    if (!s.appareils.includes(utilisateurId)) s.appareils.push(utilisateurId)
  })
  signer('auth.login', 'utilisateur:' + utilisateurId, 'connexion', '', 'session ouverte', UTILISATEURS.find((u) => u.id === utilisateurId)!.prenom)
}

export const demoSession: DomaineSession = {
  async session() {
    suivreScenario()
    const t = maintenant()
    // Session de sessionHeures : au-delà, elle se ferme d'elle-même et la connexion le dit.
    const a = accesDemo.lire()
    if (sessionDemo.lire().connecte) {
      if (a.connecteLe === null) accesDemo.ecrire((s) => void (s.connecteLe = t))
      else if (t > a.connecteLe + A.sessionHeures * HEURE) {
        sessionDemo.ecrire((s) => void (s.connecte = false))
        accesDemo.ecrire((s) => Object.assign(s, { connecteLe: null, expiree: true }))
      }
    }
    const e = sessionDemo.lire()
    const u = UTILISATEURS.find((x) => x.id === e.utilisateurId)!
    const compte = etatCompte()
    const debut = accesDemo.lire().connecteLe ?? t
    const s: SessionEntreprise = {
      connecte: e.connecte,
      utilisateur: e.connecte ? retoucher(u) : null,
      entreprise: e.connecte
        ? { id: ENTREPRISE.id, nom: ENTREPRISE.nom, etat: compte.etat, pilote: compte.pilote, palier: ENTREPRISE.palier, plafond: plafondDe(ENTREPRISE.palier), livreurs: compteurs().livreurs, zones: ZONES.length, quartier: ENTREPRISE.quartier }
        : null,
      badges: e.connecte ? compteurs().badges : { paquets: 0, missions: 0, incidents: 0, litiges: 0, pieces: 0, notifications: 0, messages: 0 },
      maintenant: t,
      expire: e.connecte ? debut + A.sessionHeures * HEURE : null,
      expiree: !e.connecte && accesDemo.lire().expiree,
    }
    return repondre(s)
  },

  async connecter(identifiant, motDePasse) {
    const t = maintenant()
    const e = sessionDemo.lire()
    if (e.bloqueJusqua && e.bloqueJusqua > t) return repondre<ResultatConnexion>({ ok: false, raison: 'bloque', jusqua: e.bloqueJusqua })
    const id = normer(identifiant)
    const corresponds = (x: { telephone: string; email: string }) => normer(x.telephone) === id || normer(x.telephone).slice(4) === id || x.email === identifiant.trim().toLowerCase()
    const mdp = accesDemo.lire().motsDePasse
    if (corresponds(RETIRE) && motDePasse === MOT_DE_PASSE_DEMO) return repondre<ResultatConnexion>({ ok: false, raison: 'retire' })
    // Mon compte : e-mail ou téléphone changés par la personne elle-même (et e-mail Google associé).
    const retouche = compteParIdentifiant(identifiant)
    const ancien = UTILISATEURS.find(corresponds)
    // L'ancienne adresse (ou l'ancien numéro) ne connecte plus une fois remplacée.
    const remplace = ancien && ((retouchesDe(ancien.id).email && ancien.email === identifiant.trim().toLowerCase()) || (retouchesDe(ancien.id).telephone && normer(ancien.telephone).slice(-9) === id.slice(-9)))
    const u = (retouche ? UTILISATEURS.find((x) => x.id === retouche) : undefined) ?? (remplace ? undefined : ancien)
    // Mot de passe changé dans Paramètres (ENT-P24) ou par la réinitialisation : le plus récent fait foi.
    if (!u || motDePasse !== (parametresDemo.lire().motsDePasse[u.id] ?? mdp[u.id] ?? MOT_DE_PASSE_DEMO)) {
      const apres = sessionDemo.ecrire((s) => {
        s.echecs += 1
        if (s.echecs >= A.echecsAvantBlocage) {
          s.bloqueJusqua = t + A.blocageMinutes * MINUTE
          s.echecs = 0
        }
      })
      signer('auth.failed', 'compte:' + ENTREPRISE.id, 'connexion', '', apres.bloqueJusqua && apres.bloqueJusqua > t ? 'blocage' : 'échec', 'appareil')
      if (apres.bloqueJusqua && apres.bloqueJusqua > t) return repondre<ResultatConnexion>({ ok: false, raison: 'bloque', jusqua: apres.bloqueJusqua })
      return repondre<ResultatConnexion>({ ok: false, raison: 'identifiants', essaisRestants: A.echecsAvantBlocage - apres.echecs })
    }
    // Second facteur : rôles d'argent toujours ; le répartiteur sur un appareil nouveau seulement.
    if (u.role === 'repartiteur' && accesDemo.lire().appareils.includes(u.id)) {
      ouvrir(u.id)
      return repondre<ResultatConnexion>({ ok: true, code: false, espaces: ESPACES[u.id] })
    }
    const defi = { id: 'defi-' + Math.random().toString(36).slice(2, 8), code: tirerCode(), essais: 0, envoyeLe: t, renvois: 0, utilisateurId: u.id }
    sessionDemo.ecrire((s) => Object.assign(s, { echecs: 0, defi }))
    return repondre<ResultatConnexion & { codeDemonstration: string }>({ ok: true, code: true, defi: defi.id, destination: masquer(u.telephone), renvoiDans: A.renvoiCodeSecondes, codeDemonstration: defi.code })
  },

  async verifierCode(defi, code) {
    const e = sessionDemo.lire()
    if (!e.defi || e.defi.id !== defi) return repondre({ ok: false as const, raison: 'expire' as const, essaisRestants: 0 })
    if (code.trim() !== e.defi.code) {
      const apres = sessionDemo.ecrire((s) => void (s.defi!.essais += 1))
      const restants = A.echecsAvantBlocage - apres.defi!.essais
      if (restants <= 0) sessionDemo.ecrire((s) => Object.assign(s, { defi: null, bloqueJusqua: maintenant() + A.blocageMinutes * MINUTE }))
      return repondre({ ok: false as const, raison: 'code_faux' as const, essaisRestants: Math.max(0, restants) })
    }
    ouvrir(e.defi.utilisateurId)
    return repondre({ ok: true as const, espaces: ESPACES[e.defi.utilisateurId] })
  },

  async renvoyerCode(defi) {
    const t = maintenant()
    const oubli = accesDemo.lire().oublis[defi]
    const e = sessionDemo.lire()
    const envoye = oubli ? oubli.envoyeLe : e.defi?.id === defi ? e.defi.envoyeLe : null
    if (envoye === null) return repondre({ ok: false as const, raison: 'support' as const })
    const attente = Math.ceil((envoye + A.renvoiCodeSecondes * 1000 - t) / 1000)
    if (attente > 0) return repondre({ ok: false as const, raison: 'trop_tot' as const, renvoiDans: attente })
    if (oubli) {
      accesDemo.ecrire((s) => Object.assign(s.oublis[defi], { code: tirerCode(), envoyeLe: t, essais: 0 }))
      return repondre({ ok: true as const, renvoiDans: A.renvoiCodeSecondes, codeDemonstration: accesDemo.lire().oublis[defi].code })
    }
    if (e.defi!.renvois >= A.renvoisAvantSupport) return repondre({ ok: false as const, raison: 'support' as const })
    const apres = sessionDemo.ecrire((s) => Object.assign(s.defi!, { code: tirerCode(), envoyeLe: t, renvois: s.defi!.renvois + 1, essais: 0 }))
    return repondre({ ok: true as const, renvoiDans: A.renvoiCodeSecondes, codeDemonstration: apres.defi!.code })
  },

  async oublie(identifiant) {
    const id = normer(identifiant)
    const u = UTILISATEURS.find((x) => normer(x.telephone) === id || normer(x.telephone).slice(4) === id || x.email === identifiant.trim().toLowerCase())
    const defi = 'oubli-' + Math.random().toString(36).slice(2, 8)
    const code = tirerCode()
    // La réponse est la même que le compte existe ou non (aucune énumération) ; seul un vrai compte reçoit un code.
    accesDemo.ecrire((s) => void (s.oublis[defi] = { code, essais: 0, envoyeLe: maintenant(), utilisateurId: u?.id ?? null, telephone: u?.telephone ?? '' }))
    return repondre({ ok: true as const, defi, destination: u ? masquer(u.telephone) : '+237 ••• •• ••', renvoiDans: A.renvoiCodeSecondes, ...(u ? { codeDemonstration: code } : {}) })
  },

  async reinitialiser(defi, code, motDePasse) {
    const o = accesDemo.lire().oublis[defi]
    if (!o) return repondre({ ok: false as const, raison: 'expire' as const, essaisRestants: 0 })
    if (!o.utilisateurId || code.trim() !== o.code) {
      const essais = accesDemo.ecrire((s) => void (s.oublis[defi].essais += 1)).oublis[defi].essais
      const restants = A.echecsAvantBlocage - essais
      if (restants <= 0) accesDemo.ecrire((s) => void delete s.oublis[defi])
      return repondre({ ok: false as const, raison: restants <= 0 ? ('expire' as const) : ('code_faux' as const), essaisRestants: Math.max(0, restants) })
    }
    if (!motDePasseValide(motDePasse)) return repondre({ ok: false as const, raison: 'mot_de_passe' as const })
    accesDemo.ecrire((s) => {
      s.motsDePasse[o.utilisateurId!] = motDePasse
      delete s.oublis[defi]
    })
    signer('auth.password_reset', 'utilisateur:' + o.utilisateurId, 'mot de passe', '', 'changé par code SMS', 'appareil')
    return repondre({ ok: true as const })
  },

  async invitation(jeton) {
    const i = INVITATIONS[jeton]
    if (!i) return repondre(null)
    const statut: InvitationAcces['statut'] = accesDemo.lire().invitationsUtilisees.includes(jeton) ? 'utilisee' : i.expireLe < maintenant() ? 'expiree' : 'valide'
    return repondre<InvitationAcces>({ jeton, prenom: i.prenom, nom: i.nom, role: i.role, entreprise: ENTREPRISE.nom, telephone: masquer(i.telephone), expireLe: i.expireLe, statut })
  },

  async creerAcces(jeton, motDePasse) {
    const i = INVITATIONS[jeton]
    const t = maintenant()
    if (!i || i.expireLe < t || !i.utilisateurId) return repondre({ ok: false as const, raison: 'expiree' as const })
    if (accesDemo.lire().invitationsUtilisees.includes(jeton)) return repondre({ ok: false as const, raison: 'utilisee' as const })
    if (!motDePasseValide(motDePasse)) return repondre({ ok: false as const, raison: 'mot_de_passe' as const })
    accesDemo.ecrire((s) => {
      s.motsDePasse[i.utilisateurId!] = motDePasse
      s.invitationsUtilisees.push(jeton)
    })
    // Le code SMS confirme le numéro ; la session s'ouvre à la vérification.
    const defi = { id: 'defi-' + Math.random().toString(36).slice(2, 8), code: tirerCode(), essais: 0, envoyeLe: t, renvois: 0, utilisateurId: i.utilisateurId }
    sessionDemo.ecrire((s) => Object.assign(s, { defi }))
    signer('auth.invitation_used', 'utilisateur:' + i.utilisateurId, 'accès', 'invité', 'mot de passe créé', i.prenom)
    return repondre({ ok: true as const, defi: defi.id, destination: masquer(i.telephone), renvoiDans: A.renvoiCodeSecondes, codeDemonstration: defi.code })
  },

  async deconnecter() {
    sessionDemo.ecrire((s) => Object.assign(s, { connecte: false, defi: null }))
    accesDemo.ecrire((s) => Object.assign(s, { connecteLe: null, expiree: false }))
  },

  async changerRole(role) {
    const u = UTILISATEURS.find((x) => x.role === role)!
    sessionDemo.ecrire((s) => Object.assign(s, { connecte: true, utilisateurId: u.id }))
    accesDemo.ecrire((s) => Object.assign(s, { connecteLe: maintenant(), expiree: false }))
  },
}

/**
 * Démonstration du lien de connexion par e-mail (Mon compte, ConnexionPlus) : ouvrir le lien fait ce que le serveur
 * ferait — la connexion de l'accès à cette adresse, avec le code SMS là où il est demandé. Adresse inconnue : refus
 * ordinaire (la réponse ne dit jamais si l'adresse existe).
 */
export async function connecterParLien(email: string): Promise<ResultatConnexion> {
  const k = email.trim().toLowerCase()
  const u = UTILISATEURS.find((x) => x.id === compteParIdentifiant(k)) ?? UTILISATEURS.find((x) => x.email === k && !retouchesDe(x.id).email)
  if (!u) return demoSession.connecter(k, '')
  return demoSession.connecter(k, parametresDemo.lire().motsDePasse[u.id] ?? (accesDemo.lire() as { motsDePasse: Record<string, string> }).motsDePasse[u.id] ?? MOT_DE_PASSE_DEMO)
}
