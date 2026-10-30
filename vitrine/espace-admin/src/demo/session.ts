// DONNÉES DE DÉMONSTRATION — la session de la console : agent connecté, rôle courant, espace pays, compteurs, et la
// connexion en deux étapes (ADM-P01) : identifiant nominatif (e-mail de l'agent) et mot de passe, puis second facteur
// (code à 6 chiffres de l'application d'authentification, ou SMS de secours). echecs_avant_blocage échecs consécutifs
// (par compte) : blocage de duree_blocage minutes et alerte aux comptes Direction (journal) ; remise à zéro à la
// première réussite ; CODES_FAUX_MAX codes faux : retour à l'étape 1. Nouvel appareil : signalé (journal, Direction).
// « ?role=<code> » (coque : session.tsx) connecte l'agent de démonstration de ce rôle ; « Agir en tant que » change le
// rôle d'un agent qui en cumule plusieurs (Franck Penga : Direction et Médiation), et le journal le note.
import { PARAMETRES } from '../calculs/registre'
import { MINUTE } from '../calculs/temps'
import { ROLES, type Role } from '../donnees/communs'
import type { Agent, DomaineSession, SessionAdmin } from '../donnees/domaines/session'
import { CODES_FAUX_MAX } from '../pages/ADM-03/regles'
import { agentCourant, sessionDemo } from './acces'
import { agentActive, agentsActives, cleSecondFacteur, empreinteMotDePasse, lireJeton } from './agents-actives'
import { agentConnu, equipeDemo, etatDuCompte, etatMembre, noterRefus, sessionValable } from './equipe-etat'
import { incidentsActifs } from './communication'
import { compteurs } from './compteurs'
import { maintenant } from './horloge'
import { journaliser } from './journal'
import { AGENTS, AGENT_DU_ROLE, MOT_DE_PASSE_DEMO, PAYS, agent, nomAgent } from './jeu-essai'
import { magasin, repondre } from './stockage'
import { changerMotDePasse as changerMotDePasseCompte, compteParIdentifiant, initialesDe, masquerTelephone, motDePasseDe, motDePasseValide as motDePasseValideCompte, retouchesDe } from '../donnees/mon-compte'
import { interrupteursOuverts } from './systeme'

/** Code du second facteur de la démonstration (l'application d'authentification d'un vrai agent le calcule). */
export const CODE_DEMO = '246810'

interface EtatConnexion {
  echecs: Record<string, number> // par compte
  bloqueJusqua: Record<string, number>
  enCours: string | null // agent passé à l'étape 1
  codesFaux: number
  appareilsConnus: string[] // agents déjà connectés depuis cet appareil
}
const connexionDemo = magasin<EtatConnexion>('connexion', () => ({ echecs: {}, bloqueJusqua: {}, enCours: null, codesFaux: 0, appareilsConnus: [] }))
const cle = (identifiant: string) => identifiant.trim().toLowerCase()

/** Panne la plus récente encore ouverte (déclarée, mode papier ou rétablie mais pas close). */
function panneEnCours(): SessionAdmin['panne'] {
  const i = incidentsActifs().sort((a, b) => b.declareLe - a.declareLe)[0]
  return i && i.etat !== 'clos' ? { id: i.id, service: i.service, zones: i.zones, etat: i.etat, consignes: i.consignes } : null
}

/** Mon compte : nom, e-mail et téléphone retouchés par l'agent lui-même (src/donnees/mon-compte.ts). */
function retoucher(a: Agent): Agent {
  const r = retouchesDe(a.id)
  const prenom = r.prenom ?? a.prenom
  const nom = r.nom ?? a.nom
  return { ...a, prenom, nom, initiales: r.prenom || r.nom ? initialesDe(prenom, nom) : a.initiales, email: r.email ?? a.email, telephone: r.telephone ? masquerTelephone(r.telephone) : a.telephone }
}

export const demoSession: DomaineSession = {
  async session() {
    let s = sessionDemo.lire()
    // Compte suspendu ou fermé, sessions fermées par Accès et personnel : la session se ferme (ACCES-CONSOLE § 5).
    if (s.connecte && !sessionValable(s.agentId, s.ouverteLe)) s = sessionDemo.ecrire((e) => void (e.connecte = false))
    const a = agentCourant()
    // Accès temporaire échu ou retiré : l'agent revient à son rôle de base.
    if (s.connecte && !a.roles.includes(s.role) && a.roles.length) s = sessionDemo.ecrire((e) => void (e.role = a.roles[0]))
    const m = etatMembre(a.id)
    const u = equipeDemo.lire().urgences.find((x) => x.agentId === a.id && !x.fermeeLe && x.jusqua > maintenant())
    const nonLus = equipeDemo.lire().messages.filter((x) => x.destinataires.includes(a.id) && !x.lus[a.id]).length
    const v: SessionAdmin = {
      connecte: s.connecte,
      agent: s.connecte ? retoucher(a) : null,
      role: s.role,
      pays: { ...PAYS, zonesExploitees: PARAMETRES.zonesExploitees.map((z) => z.code) },
      badges: compteurs(),
      interrupteurs: interrupteursOuverts(),
      astreinte: s.role === 'superviseur',
      panne: panneEnCours(),
      maintenant: maintenant(),
      expire: s.connecte ? maintenant() + PARAMETRES.console.sessionHeures * 3600_000 : null,
      membre: s.connecte && m ? { equipe: m.equipe, niveau: m.niveau, perimetre: m.perimetre, urgenceJusqua: u?.jusqua ?? null } : null,
      messagesNonLus: s.connecte ? nonLus : 0,
    }
    return repondre(v)
  },
  async blocage() {
    const c = connexionDemo.lire()
    const jusqua = Math.max(0, ...Object.values(c.bloqueJusqua))
    return repondre({ jusqua: jusqua > maintenant() ? jusqua : null, echecs: Math.max(0, ...Object.values(c.echecs)) })
  },
  async connecter(identifiant, motDePasse) {
    const k = cle(identifiant)
    const c = connexionDemo.lire()
    const bloque = c.bloqueJusqua[k] ?? 0
    if (bloque > maintenant()) return { ok: false, raison: 'bloque', jusqua: bloque }
    // Agents du jeu d'essai (mot de passe de démonstration) ou employés activés depuis leur invitation (leur mot de passe).
    const active = agentsActives.lire().comptes.find((x) => x.agent.email.toLowerCase() === k)
    // Mon compte : e-mail changé (ou e-mail Google associé) et mot de passe changé par l'agent lui-même.
    const retouche = compteParIdentifiant(k)
    const parRetouche = retouche ? AGENTS.find((x) => x.id === retouche) : undefined
    const attendu = (x: Agent) => motDePasseDe(x.id) ?? MOT_DE_PASSE_DEMO
    const a: Agent | undefined = parRetouche
      ? motDePasse === attendu(parRetouche)
        ? parRetouche
        : undefined
      : active
        ? active.empreinte === empreinteMotDePasse(k, motDePasse)
          ? active.agent
          : undefined
        : (() => {
            const x = AGENTS.find((y) => y.email === k)
            // L'ancienne adresse ne connecte plus une fois remplacée dans Mon compte.
            if (x && retouchesDe(x.id).email) return undefined
            return x && motDePasse === attendu(x) ? x : undefined
          })()
    if (!a) {
      noterRefus(k)
      const n = (c.echecs[k] ?? 0) + 1
      const max = PARAMETRES.console.echecsAvantBlocage
      if (n >= max) {
        const jusqua = maintenant() + PARAMETRES.console.blocageMinutes * MINUTE
        connexionDemo.ecrire((e) => {
          e.echecs[k] = 0
          e.bloqueJusqua[k] = jusqua
        })
        // Alerte aux comptes Direction : une ligne du journal, visible de la Direction (ADM-P01R-01) ; le membre aussi
        // est prévenu (message à son nom, lu à sa prochaine connexion).
        await journaliser({ action: 'securite.blocage_connexion', objet: k, motif: `${max} échecs consécutifs : compte bloqué, alerte aux comptes Direction` })
        const vise = AGENTS.find((x) => x.email === k)
        if (vise)
          equipeDemo.ecrire((e) => {
            e.nMessage++
            e.messages.unshift({ id: `AV-${String(e.nMessage).padStart(4, '0')}`, genre: 'avertissement', texte: `${max} essais de connexion refusés : votre compte est bloqué ${PARAMETRES.console.blocageMinutes} min. Si ce n’était pas vous, prévenez Accès et personnel.`, deId: 'systeme', de: 'Système BelivaY', le: maintenant(), pour: { genre: 'membre', id: vise.id }, destinataires: [vise.id], lus: {} })
          })
        return { ok: false, raison: 'bloque', jusqua }
      }
      connexionDemo.ecrire((e) => void (e.echecs[k] = n))
      return { ok: false, raison: 'invalide', restants: max - n }
    }
    // Compte suspendu ou fermé (ACCES-CONSOLE § 5) : aucune session ne s'ouvre, même avec le bon mot de passe.
    if (etatDuCompte(a.id) !== 'actif') {
      noterRefus(k)
      return { ok: false, raison: 'suspendu' }
    }
    connexionDemo.ecrire((e) => {
      e.echecs[k] = 0
      e.enCours = a.id
      e.codesFaux = 0
    })
    const vu = retoucher(a)
    return { ok: true, agent: { id: a.id, prenom: vu.prenom, nom: vu.nom, initiales: vu.initiales, identifiant: vu.email, secondFacteur: a.secondFacteur } }
  },
  async verifierCode(code) {
    const c = connexionDemo.lire()
    if (!c.enCours) return { ok: false, raison: 'expire' }
    if (code !== CODE_DEMO) {
      const n = c.codesFaux + 1
      if (n >= CODES_FAUX_MAX) {
        connexionDemo.ecrire((e) => {
          e.enCours = null
          e.codesFaux = 0
        })
        return { ok: false, raison: 'retour_etape_1' }
      }
      connexionDemo.ecrire((e) => void (e.codesFaux = n))
      return { ok: false, raison: 'faux', restants: CODES_FAUX_MAX - n }
    }
    const a = agentConnu(c.enCours) ?? agentActive(c.enCours) ?? agent(c.enCours)
    const nouvelAppareil = !c.appareilsConnus.includes(a.id)
    connexionDemo.ecrire((e) => {
      e.enCours = null
      e.codesFaux = 0
      if (nouvelAppareil) e.appareilsConnus.push(a.id)
    })
    sessionDemo.ecrire((e) => Object.assign(e, { connecte: true, agentId: a.id, role: a.roles[0], ouverteLe: maintenant() }))
    equipeDemo.ecrire((e) => void (e.membres[a.id] && (e.membres[a.id].derniereConnexion = maintenant())))
    await journaliser({ action: 'session.ouvrir', objet: 'Console' })
    if (nouvelAppareil) await journaliser({ action: 'securite.nouvel_appareil', objet: nomAgent(a), motif: 'Connexion depuis un appareil inconnu : e-mail à l’agent, visible des comptes Direction' })
    return { ok: true, nouvelAppareil }
  },
  async envoyerCodeSms() {
    const c = connexionDemo.lire()
    if (!c.enCours) return { ok: false, raison: 'sans_etape_1' }
    // Finance, Direction, Accès et personnel : l'application d'authentification seulement, jamais le SMS de secours.
    const m = etatMembre(c.enCours)
    if (m && ['finance', 'direction', 'acces'].includes(m.equipe)) return { ok: false, raison: 'application_obligatoire' }
    return { ok: true, telephone: (agentActive(c.enCours) ?? agent(c.enCours)).telephone }
  },
  async deconnecter() {
    // La session se ferme d'abord (aucune lecture ne la voit encore ouverte), puis le journal le note.
    const etait = sessionDemo.lire().connecte
    sessionDemo.ecrire((s) => void (s.connecte = false))
    if (etait) await journaliser({ action: 'session.fermer', objet: 'Console' })
  },
  async agirEnTantQue(role: Role) {
    if (!agentCourant().roles.includes(role)) return { ok: false as const, raison: 'role_non_tenu' as const }
    sessionDemo.ecrire((s) => void (s.role = role))
    await journaliser({ action: 'role.agir_en_tant_que', objet: nomAgent(agentCourant()) })
    return { ok: true as const }
  },
  async changerRole(role: Role) {
    const s = sessionDemo.lire()
    const id = AGENT_DU_ROLE[role]
    // Un compte suspendu ou fermé ne se connecte pas, même par la démonstration.
    if (etatDuCompte(id) !== 'actif') {
      if (s.connecte || s.agentId !== id) sessionDemo.ecrire((e) => Object.assign(e, { connecte: false, agentId: id, role }))
      return
    }
    if (s.connecte && s.agentId === id && s.role === role && sessionValable(id, s.ouverteLe)) return
    sessionDemo.ecrire((e) => Object.assign(e, { connecte: true, agentId: id, role, ouverteLe: maintenant() }))
  },
  async changerAgent(agentId: string) {
    const a = agentConnu(agentId)
    if (!a) return { ok: false as const, raison: 'inconnu' as const }
    if (etatDuCompte(agentId) !== 'actif') {
      // Un compte suspendu ou fermé : la démonstration ne garde pas la session d'un autre (comme ?role=).
      sessionDemo.ecrire((e) => Object.assign(e, { connecte: false, agentId }))
      return { ok: false as const, raison: 'suspendu' as const }
    }
    sessionDemo.ecrire((e) => Object.assign(e, { connecte: true, agentId, role: a.roles[0], ouverteLe: maintenant() }))
    return { ok: true as const }
  },
  async comptesDemo() {
    const e = equipeDemo.lire()
    return repondre(
      AGENTS.filter((a) => e.membres[a.id]).map((a) => {
        const m = e.membres[a.id]
        const x = agentConnu(a.id)!
        return { agentId: a.id, nom: nomAgent(a), initiales: a.initiales, equipe: m.equipe, niveau: m.niveau, role: x.roles[0], actif: etatDuCompte(a.id) === 'actif' }
      }),
    )
  },
  async invitation(jeton) {
    const r = invitationDe(jeton)
    return r.ok ? { ok: true, invitation: r.invitation } : r
  },
  async activer(jeton, x) {
    const r = invitationDe(jeton)
    if (!r.ok) return r
    const min = PARAMETRES.console.motDePasseMin
    if (x.motDePasse.length < min || !/\d/.test(x.motDePasse)) return { ok: false, raison: 'mot_de_passe_court' }
    if (x.motDePasse !== x.confirmation) return { ok: false, raison: 'mots_de_passe_differents' }
    if (x.code !== CODE_DEMO) return { ok: false, raison: 'code_faux' }
    if (!x.charte) return { ok: false, raison: 'charte' }
    const i = r.invitation
    const a: Agent = { ...r.agent, secondFacteur: 'application', appareils: [] }
    agentsActives.ecrire((e) => void e.comptes.push({ agent: a, empreinte: empreinteMotDePasse(i.email, x.motDePasse), cle: i.cleSecondFacteur, activeLe: maintenant() }))
    equipeDemo.ecrire((g) => {
      const c = g.membres[a.id]
      if (c) Object.assign(c, { etat: 'actif', derniereConnexion: maintenant() })
    })
    await journaliser({ action: 'compte.activer', objet: nomAgent(a), motif: 'Invitation acceptée : mot de passe choisi, second facteur enrôlé, charte acceptée' })
    return { ok: true }
  },
  agentsDemo: async () => repondre(ROLES.map((role) => ({ role, agentId: AGENT_DU_ROLE[role], nom: nomAgent(agent(AGENT_DU_ROLE[role])) }))),
}

/** Invitation lue depuis son jeton : un compte « invitation » de l'équipe (Rôles et accès), pas encore activé, dans le délai. */
function invitationDe(jeton: string): { ok: true; invitation: import('../donnees/domaines/session').Invitation; agent: Agent } | { ok: false; raison: 'inconnue' | 'expiree' | 'deja_active' } {
  const j = lireJeton(jeton)
  if (!j) return { ok: false, raison: 'inconnue' }
  if (agentActive(j.id)) return { ok: false, raison: 'deja_active' }
  const g = equipeDemo.lire()
  const a = g.nouveaux.find((x) => x.id === j.id)
  if (!a || g.membres[j.id]?.etat !== 'invitation') return { ok: false, raison: a ? 'deja_active' : 'inconnue' }
  const expireLe = j.inviteLe + PARAMETRES.console.invitationH * 3600_000
  if (maintenant() > expireLe) return { ok: false, raison: 'expiree' }
  return { ok: true, agent: a, invitation: { jeton, prenom: a.prenom, nom: a.nom, email: a.email, roles: a.roles, zones: a.zones, expireLe, cleSecondFacteur: cleSecondFacteur(a.id) } }
}

/** Démonstration de « Mon compte » (ADM-00/Profil) : l'ancien mot de passe saisi est-il le bon ? Celui changé par
 *  l'agent, sinon le mot de passe de démonstration. Avec l'API, le serveur vérifie l'ancien (POST /me/password). */
export const ancienMotDePasseBon = (id: string, ancien: string) => ancien === (motDePasseDe(id) ?? MOT_DE_PASSE_DEMO)

/**
 * Démonstration du lien de connexion par e-mail (ConnexionPlus) : ouvrir le lien fait ce que le serveur ferait — l'étape 1
 * passée ; le second facteur reste obligatoire. Adresse inconnue : refus ordinaire.
 */
export async function connecterParLien(email: string) {
  const k = email.trim().toLowerCase()
  const a = AGENTS.find((x) => x.id === compteParIdentifiant(k)) ?? AGENTS.find((x) => x.email === k && !retouchesDe(x.id).email)
  return demoSession.connecter(k, a ? (motDePasseDe(a.id) ?? MOT_DE_PASSE_DEMO) : '')
}

/** Démonstration du mot de passe oublié (lien par e-mail) : le nouveau mot de passe remplace l'ancien ; le second
 * facteur reste demandé à la connexion suivante. Adresse inconnue : rien ne change (la réponse ne le dit pas). */
export async function reinitialiserParLien(email: string, nouveau: string) {
  const k = email.trim().toLowerCase()
  const a = AGENTS.find((x) => x.id === compteParIdentifiant(k)) ?? AGENTS.find((x) => x.email === k && !retouchesDe(x.id).email)
  if (!motDePasseValideCompte(nouveau)) return { ok: false as const, raison: 'faible' as const }
  if (a) await changerMotDePasseCompte(a.id, true, '', nouveau, retouchesDe(a.id).email ?? a.email)
  return { ok: true as const }
}
