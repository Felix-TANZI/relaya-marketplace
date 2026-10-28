// Source hybride du livreur (VITE_SOURCE=hybride, site/COMPTES-REELS.md) : connexion RÉELLE par identifiant (numéro
// +237 ou e-mail) et PIN choisi à l'activation de l'invitation de son entreprise (comptesReels.inscrire('livreur',
// { jeton, motDePasse: PIN })). Pas de SMS (fournisseur à venir) : un numéro qui n'est pas celui de la démonstration lie
// l'appareil et l'écran passe au PIN ; le serveur vérifie le PIN (haché) et compte les essais. La session réelle ouvre la
// démonstration sous le nom du livreur ; « Verrouiller » ferme la session réelle, l'appareil reste lié.
// Les numéros de la démonstration (Serge A., Hervé F.) gardent le parcours d'essai (code SMS simulé, PIN d'essai).
import { AVIS, AVIS_PIN, annoncer, appareilReel, choisirDemo, choixDemo, connecterParPin, fermerReel, initiales, lierAppareil, masquerIdentifiant, sessionHabillee, sessionReelle, surcharger } from '@client/comptes-reels/hybride'
import type { DomaineSession } from './domaines/session'

const E = 'livreur' as const
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
const ouvrirDemo = () => import('../demo/session').then((m) => m.ouvrirParCompte())

export function sessionHybride(demo: DomaineSession): DomaineSession {
  const session = sessionHabillee(E, demo, ouvrirDemo, (s, r) => ({
    ...s,
    livreur: s.livreur ? { ...s.livreur, prenom: r.user.first_name || s.livreur.prenom, nom: r.user.last_name, initiales: initiales(r.user.first_name, r.user.last_name), photo: r.user.avatar_url ?? s.livreur.photo } : s.livreur,
  }))
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
      if (!a) return choixDemo(E) ? e : { ...e, appareilLie: false, identite: null, numeroMasque: null, biometrie: false, pinCree: false, sessionExpiree: false, bloqueJusqua: null, smsObligatoire: false, code: null, bascule: null }
      const bloque = a.bloqueJusqua && a.bloqueJusqua > Date.now() ? a.bloqueJusqua : null
      return {
        ...e,
        appareilLie: true,
        identite: a.prenom ? { prenom: a.prenom, initiales: initiales(a.prenom, a.nom ?? ''), photo: null, entreprise: '', vehicule: '', immatriculation: null, zone: '' } : null,
        numeroMasque: masquerIdentifiant(a.identifiant),
        biometrie: false,
        pinCree: true,
        sessionExpiree: false,
        pinEssaisRestants: a.essaisRestants,
        bloqueJusqua: bloque,
        smsObligatoire: false,
        code: null,
        bascule: null,
      }
    },
    async saisirNumero(numero, origine) {
      const { estNumeroDemo } = await import('../demo/session')
      if (estNumeroDemo(numero)) {
        lierAppareil(E, null)
        choisirDemo(E, true)
        return demo.saisirNumero(numero, origine)
      }
      const n = numero.replace(/\D/g, '').slice(-9)
      if (!/^6\d{8}$/.test(n)) return { ok: false, raison: 'numero_invalide' }
      // Même suite que le numéro ait un compte ou non : le PIN (le serveur répond pareil à un numéro inconnu).
      choisirDemo(E, false)
      lierAppareil(E, { identifiant: '+237' + n, prenom: null, nom: null, essaisRestants: 5, bloqueJusqua: null })
      window.dispatchEvent(new CustomEvent('blv:donnees'))
      return { ok: true, bascule: false }
    },
    async verifierPin(pin, origine) {
      const a = appareilReel(E)
      if (!a) return demo.verifierPin(pin, origine)
      const r = await connecterParPin(E, a, pin)
      if (r.ok) {
        await ouvrirDemo()
        window.dispatchEvent(new CustomEvent('blv:donnees'))
        return { ok: true, suite: 'aujourdhui' }
      }
      if (r.raison === 'pin_faux') return { ok: false, raison: 'pin_faux', essaisRestants: r.essaisRestants }
      if (r.raison === 'bloque') return { ok: false, raison: 'bloque', debloqueA: r.jusqua }
      annoncer(r.raison === 'indisponible' ? AVIS.base() : AVIS.session())
      return { ok: false, raison: 'pas_de_session' }
    },
    async demanderCode(motif, origine) {
      if (!appareilReel(E)) return demo.demanderCode(motif, origine)
      annoncer(AVIS_PIN.oubli())
      return { ok: false, raison: 'pas_de_numero' }
    },
    async annulerCode() {
      // « Revenir au numéro » : l'appareil n'est plus lié au compte réel (sans session ouverte).
      if (appareilReel(E) && !(await sessionReelle(E))) lierAppareil(E, null)
      return demo.annulerCode()
    },
    async deconnecter() {
      await fermerReel(E)
      return demo.deconnecter()
    },
  })
}
