// Source hybride du point relais (VITE_SOURCE=hybride, site/COMPTES-REELS.md) : connexion RÉELLE par identifiant (numéro
// +237 ou e-mail) et PIN (ou mot de passe). Un relais naît par sa candidature (comptesReels.inscrire('relais',
// { candidature: { nom, … }, telephone, motDePasse }), « en attente » jusqu'à la validation par la console) ; ses
// membres par l'invitation du gérant (acces.invitation / accepterInvitation : PIN choisi à l'activation). Pas de SMS
// (fournisseur à venir) : un numéro qui n'est pas celui de la démonstration lie l'appareil et l'écran passe au PIN ; le
// serveur vérifie le PIN (haché) et compte les essais. Les numéros de la démonstration gardent le parcours d'essai.
import { comptesReels } from '@client/comptes-reels/client'
import { AVIS, AVIS_PIN, annoncer, annoncerStatut, appareilReel, choisirDemo, choixDemo, connecterParPin, fermerReel, fixerSession, indisponible, initiales, lierAppareil, masquerIdentifiant, sessionHabillee, sessionReelle, surcharger } from '@client/comptes-reels/hybride'
import type { DomaineAcces } from './domaines/acces'
import type { DomaineSession } from './domaines/session'

const E = 'relais' as const
const CLE_PASSAGE = 'blv_hybride_passage_' + E
const premierPassageFait = () => {
  try {
    return localStorage.getItem(CLE_PASSAGE) === '1'
  } catch {
    return true
  }
}
const marquerPremierPassage = () => {
  try {
    localStorage.setItem(CLE_PASSAGE, '1')
  } catch {
    /* stockage refusé */
  }
}
const ouvrirDemo = async () => {
  const m = await import('../demo/session')
  m.ouvrirParCompte(m.membreDeLAppareil())
}

export function sessionHybride(demo: DomaineSession): DomaineSession {
  const session = sessionHabillee(
    E,
    demo,
    async (r) => {
      await ouvrirDemo()
      annoncerStatut(r)
    },
    (s, r) => ({
      ...s,
      membre: s.membre ? { ...s.membre, prenom: r.user.first_name || s.membre.prenom, nom: r.user.last_name, initiales: initiales(r.user.first_name, r.user.last_name), photo: r.user.avatar_url ?? s.membre.photo } : s.membre,
      relais: s.relais && r.user.organisation ? { ...s.relais, nom: r.user.organisation } : s.relais,
    }),
  )
  return surcharger(demo, {
    // Premier passage en hybride sur cet appareil : la démonstration, ouverte d'avance sur le compte d'essai, est fermée
    // (un vrai utilisateur arrive sur la connexion, jamais sur la journée d'un autre). Ensuite, toute entrée dans la
    // démonstration (numéro d'essai, personnage, e-mail d'essai) est un choix gardé sur l'appareil.
    async session() {
      let s = await session()
      const reelle = await sessionReelle(E)
      if (!reelle && s.connecte && !premierPassageFait()) {
        await demo.deconnecter()
        s = await session()
      }
      marquerPremierPassage()
      if (!reelle && s.connecte) choisirDemo(E, true)
      return s
    },
    async ecranConnexion() {
      const e = await demo.ecranConnexion()
      const a = appareilReel(E)
      if (await sessionReelle(E)) return e
      // Ni compte réel lié ni démonstration choisie : le numéro d'abord (jamais l'écran PIN du compte d'essai).
      if (!a) return choixDemo(E) ? e : { ...e, etape: 'numero', prenom: null, numero: null, code: null, sessionExpiree: null }
      const bloque = a.bloqueJusqua && a.bloqueJusqua > Date.now() ? a.bloqueJusqua : null
      return { ...e, etape: 'pin', prenom: a.prenom, numero: masquerIdentifiant(a.identifiant), code: null, pin: { essaisRestants: a.essaisRestants, bloqueJusqua: bloque }, sessionExpiree: null }
    },
    async commencer(telephone, o) {
      const { estNumeroDemo } = await import('../demo/session')
      if (estNumeroDemo(telephone)) {
        lierAppareil(E, null)
        choisirDemo(E, true)
        return demo.commencer(telephone, o)
      }
      const n = telephone.replace(/\D/g, '').replace(/^237/, '')
      if (!/^6\d{8}$/.test(n)) return { ok: false, raison: 'numero_invalide' }
      // Même suite que le numéro ait un compte ou non : le PIN.
      choisirDemo(E, false)
      lierAppareil(E, { identifiant: '+237' + n, prenom: null, nom: null, essaisRestants: 5, bloqueJusqua: null })
      window.dispatchEvent(new CustomEvent('blv:donnees'))
      return { ok: true, etape: 'pin' }
    },
    async connecter(pin, o) {
      const a = appareilReel(E)
      if (!a) return demo.connecter(pin, o)
      const r = await connecterParPin(E, a, pin)
      if (r.ok) {
        await ouvrirDemo()
        annoncerStatut(r.reelle)
        window.dispatchEvent(new CustomEvent('blv:donnees'))
        return { ok: true }
      }
      if (r.raison === 'pin_faux') return { ok: false, raison: 'pin_faux' }
      if (r.raison === 'bloque') return { ok: false, raison: 'bloque' }
      if (r.raison === 'ferme') return { ok: false, raison: 'acces_retire' }
      annoncer(AVIS.base())
      return { ok: false, raison: 'inconnu' }
    },
    async pinOublie(o) {
      if (!appareilReel(E)) return demo.pinOublie(o)
      annoncer(AVIS_PIN.oubli())
      return { ok: false, raison: 'trop_d_envois' }
    },
    async changerNumero() {
      lierAppareil(E, null)
      return demo.changerNumero()
    },
    async deconnecter() {
      await fermerReel(E)
      return demo.deconnecter()
    },
  })
}

/** Invitation d'un membre par le gérant (lien /relais/invitation?jeton=…) : lue et activée sur le serveur réel. */
export function accesHybride(demo: DomaineAcces): DomaineAcces {
  return surcharger(demo, {
    async invitation(jeton) {
      const r = await comptesReels.lireInvitation(E, jeton)
      if (!r.ok) return r.code === 'expire' || r.code === 'utilise' ? null : demo.invitation(jeton)
      return { relais: r.organisation ?? '', quartier: '', invitePar: r.invitant ?? '', prenom: r.prenom, role: 'employe', droits: [], expireLe: Date.parse(r.expire_le), etat: 'valide', redemandeeLe: null }
    },
    async accepterInvitation(jeton, pin, o) {
      const lu = await comptesReels.lireInvitation(E, jeton)
      if (!lu.ok) return lu.code === 'expire' ? { ok: false, raison: 'expiree' } : lu.code === 'utilise' ? { ok: false, raison: 'deja_utilisee' } : demo.accepterInvitation(jeton, pin, o)
      const r = await comptesReels.inscrire(E, { jeton, motDePasse: pin, conditions: { acceptees: true } })
      if (r.ok) {
        fixerSession(E, r)
        lierAppareil(E, { identifiant: r.user.phone ?? r.user.email, prenom: r.user.first_name, nom: r.user.last_name, essaisRestants: 5, bloqueJusqua: null })
        await ouvrirDemo()
        return { ok: true }
      }
      if (r.code === 'pin_trop_simple' || r.code === 'mot_de_passe') return { ok: false, raison: 'pin_trop_simple' }
      if (r.code === 'utilise') return { ok: false, raison: 'deja_utilisee' }
      if (indisponible(r)) annoncer(AVIS.base())
      return { ok: false, raison: 'expiree' }
    },
  })
}
