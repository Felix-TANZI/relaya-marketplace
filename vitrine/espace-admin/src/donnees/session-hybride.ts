// Source hybride de la console (VITE_SOURCE=hybride, site/COMPTES-REELS.md) : connexion, second facteur, activation d'un
// membre invité, déconnexion et session passent par les comptes réels ; tout le reste reste la démonstration, ouverte
// sous le nom du compte réel et avec son rôle (propriétaire : Direction).
// Second facteur RÉEL et obligatoire (TOTP, application d'authentification) : le mot de passe juste ne donne qu'un défi ;
// verifierCode l'échange contre la session avec le code de l'application ou un code de secours. Jamais d'étape passée
// sans contrôle, jamais de code affiché, pas de SMS de secours (application seulement).
// - Premier accès d'un compte sans second facteur (propriétaire, membre) : l'enrôlement (QR et secret) est publié par
//   enrolementEnCours() et l'événement « blv:deuxieme-facteur » : l'écran le montre, puis le premier code juste ouvre.
// - Activation d'un membre invité : 1er envoi (mot de passe) → l'accès est créé, le secret réel remplace la clé de
//   l'invitation (relue par l'écran) et l'activation demande son code ; 2e envoi (code de l'application) → session.
// - Les dix codes de secours, rendus une seule fois au premier code juste : codesSecoursAMontrer() et le même événement.
// Le compte d'essai (mot de passe Belivay2026) reste la démonstration seule.
import { comptesReels, type DefiReel, type EnrolementTotp } from '@client/comptes-reels/client'
import { AVIS, annoncer, estMotDePasseDemo, fermerReel, fixerSession, indisponible, initiales, sessionHabillee, surcharger } from '@client/comptes-reels/hybride'
import type { Role } from './communs'
import type { DomaineSession, ResultatCode } from './domaines/session'

const E = 'console' as const
const estEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const ROLES: Role[] = ['superviseur', 'finance', 'support', 'mediation', 'operations', 'verification', 'audit', 'terrain', 'rh']
const roleDemo = (role: string): Role => (ROLES.includes(role as Role) ? (role as Role) : 'superviseur')

let defi: DefiReel | null = null
let enrolement: EnrolementTotp | null = null
let codesSecours: string[] | null = null
/** Activation en cours d'un membre invité (jeton d'invitation → défi et secret réels). */
const activations = new Map<string, { defi: DefiReel; enrolement: EnrolementTotp }>()

/** Un défi réel attend-il le code (écran : code de secours possible, pas de SMS) ? */
export const defiEnCours = () => defi !== null
/** Enrôlement à montrer (QR, secret) tant que le premier code n'est pas juste ; null sinon. */
export const enrolementEnCours = () => enrolement
/** Codes de secours à montrer une fois (puis oubliés par l'appel). */
export function codesSecoursAMontrer() {
  const c = codesSecours
  codesSecours = null
  return c
}
const prevenir = () => {
  window.dispatchEvent(new CustomEvent('blv:deuxieme-facteur', { detail: { enrolement, codesSecours: !!codesSecours } }))
  window.dispatchEvent(new CustomEvent('blv:donnees'))
}

export function sessionHybride(demo: DomaineSession): DomaineSession {
  const session = sessionHabillee(E, demo, (r) => demo.changerRole(roleDemo(r.user.role)), (s, r) => ({
    ...s,
    agent: s.agent ? { ...s.agent, prenom: r.user.first_name || s.agent.prenom, nom: r.user.last_name, initiales: initiales(r.user.first_name, r.user.last_name), email: r.user.email } : s.agent,
  }))

  /** Code de l'application (ou de secours) sur un défi réel. */
  async function verifierReel(d: DefiReel, code: string): Promise<ResultatCode> {
    const r = await comptesReels.deuxiemeFacteur.verifier(d.defi, code)
    if (r.ok) {
      fixerSession(E, { user: r.user, session: r.session })
      defi = null
      enrolement = null
      if (r.codes_secours?.length) codesSecours = r.codes_secours
      await session()
      prevenir()
      return { ok: true, nouvelAppareil: false }
    }
    if (r.code === 'code_faux') return { ok: false, raison: 'faux', restants: Number(r.data?.essais_restants ?? 0) }
    defi = null
    enrolement = null
    if (r.code === 'bloque' || indisponible(r)) annoncer(indisponible(r) ? AVIS.base() : r.message)
    return { ok: false, raison: r.code === 'defi_expire' ? 'expire' : 'retour_etape_1' }
  }

  return surcharger(demo, {
    session,
    async connecter(identifiant, motDePasse) {
      if (estMotDePasseDemo(motDePasse) || !estEmail(identifiant)) {
        defi = null
        await fermerReel(E)
        return demo.connecter(identifiant, motDePasse)
      }
      const r = await comptesReels.deuxiemeFacteur.connecter(identifiant.trim(), motDePasse)
      if (r.ok) {
        defi = { deuxieme_facteur: r.deuxieme_facteur, defi: r.defi, expire_le: r.expire_le, prenom: r.prenom, nom: r.nom }
        enrolement = null
        if (r.deuxieme_facteur === 'enrolement') {
          const e = await comptesReels.deuxiemeFacteur.enrolement(r.defi)
          if (e.ok) enrolement = { secret: e.secret, otpauth: e.otpauth, qr: e.qr }
          prevenir()
        }
        return { ok: true, agent: { prenom: r.prenom, nom: r.nom, initiales: initiales(r.prenom, r.nom), identifiant: identifiant.trim().toLowerCase(), secondFacteur: 'application' } }
      }
      if (indisponible(r)) {
        annoncer(AVIS.base())
        return demo.connecter(identifiant, motDePasse)
      }
      if (r.code === 'totp_indisponible') annoncer(r.message)
      if (r.code === 'bloque' || r.code === 'trop_de_tentatives') return { ok: false, raison: 'bloque', jusqua: Date.parse(String(r.data?.jusqua ?? '')) || Date.now() + 30 * 60_000 }
      if (r.code === 'compte_ferme') return { ok: false, raison: 'suspendu' }
      return { ok: false, raison: 'invalide', restants: Number(r.data?.essais_restants ?? 0) }
    },
    async verifierCode(code, canal) {
      if (!defi) return demo.verifierCode(code, canal)
      return verifierReel(defi, code)
    },
    async envoyerCodeSms() {
      // Comptes réels : application d'authentification seulement (aucun SMS ne part de ce site).
      if (defi) return { ok: false, raison: 'application_obligatoire' }
      return demo.envoyerCodeSms()
    },
    async invitation(jeton) {
      const a = activations.get(jeton)
      const r = await comptesReels.lireInvitation(E, jeton)
      if (!r.ok && !a) return r.code === 'expire' ? { ok: false, raison: 'expiree' } : r.code === 'utilise' ? { ok: false, raison: 'deja_active' } : demo.invitation(jeton)
      const lu = r.ok ? r : null
      return {
        ok: true,
        invitation: {
          jeton,
          prenom: lu?.prenom ?? a?.defi.prenom ?? '',
          nom: lu?.nom ?? a?.defi.nom ?? '',
          email: lu?.email ?? '',
          roles: [roleDemo(lu?.role ?? 'support')],
          zones: null,
          expireLe: Date.parse(lu?.expire_le ?? a?.defi.expire_le ?? '') || Date.now(),
          // Le secret réel n'existe qu'une fois l'accès créé (premier envoi de l'activation) ; jamais une clé inventée.
          cleSecondFacteur: a?.enrolement.secret ?? '',
        },
      }
    },
    async activer(jeton, x) {
      const a = activations.get(jeton)
      if (a) {
        const r = await verifierReel(a.defi, x.code)
        if (r.ok) activations.delete(jeton)
        return r.ok ? { ok: true } : r.raison === 'faux' ? { ok: false, raison: 'code_faux' } : { ok: false, raison: 'expiree' }
      }
      const lu = await comptesReels.lireInvitation(E, jeton)
      if (!lu.ok) return lu.code === 'expire' ? { ok: false, raison: 'expiree' } : lu.code === 'utilise' ? { ok: false, raison: 'deja_active' } : demo.activer(jeton, x)
      if (!x.charte) return { ok: false, raison: 'charte' }
      if (x.motDePasse !== x.confirmation) return { ok: false, raison: 'mots_de_passe_differents' }
      const r = await comptesReels.deuxiemeFacteur.activer(jeton, { motDePasse: x.motDePasse, conditions: { acceptees: true } })
      if (!r.ok) {
        if (r.code === 'mot_de_passe' || r.code === 'mot_de_passe_demo') return { ok: false, raison: 'mot_de_passe_court' }
        if (r.code === 'utilise' || r.code === 'existe') return { ok: false, raison: 'deja_active' }
        if (r.message) annoncer(r.message)
        return { ok: false, raison: 'expiree' }
      }
      const e = await comptesReels.deuxiemeFacteur.enrolement(r.defi)
      if (!e.ok) return { ok: false, raison: 'expiree' }
      activations.set(jeton, { defi: r, enrolement: { secret: e.secret, otpauth: e.otpauth, qr: e.qr } })
      enrolement = { secret: e.secret, otpauth: e.otpauth, qr: e.qr }
      prevenir()
      // L'accès existe, le second facteur n'est pas encore prouvé : l'activation redemande le code de l'application,
      // cette fois avec la vraie clé (relue dans l'invitation).
      return { ok: false, raison: 'code_faux' }
    },
    async deconnecter() {
      defi = null
      enrolement = null
      await fermerReel(E)
      return demo.deconnecter()
    },
  })
}
