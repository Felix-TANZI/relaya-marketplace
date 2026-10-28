// Source hybride de l'espace client (VITE_SOURCE=hybride) : la démonstration (src/demo), dont les méthodes de COMPTE
// passent par les comptes réels (src/comptes-reels, serveur site/serveur). Ce qui change :
// - inscription, connexion par e-mail, déconnexion, mot de passe oublié et lien reçu, changement de mot de passe,
//   profil (prénom, nom, photo), suppression du compte ;
// - la session : un compte réel ouvert apparaît partout sous son nom ; fermé ailleurs (autre appareil, expiration), la
//   démonstration se ferme aussi.
// Le compte d'essai (mot de passe Belivay2026, adresse du jeu d'essai) reste la démonstration seule. Sans base
// configurée, tout reste la démonstration et l'écran le dit (avis).
// Suppression d'un compte réel : le « code » saisi est le MOT DE PASSE du compte (le serveur le redemande) ; l'envoi de
// code de cet écran le dit à la place du SMS de démonstration.
import { comptesReels, type CompteReel, type SessionReelle } from '../comptes-reels/client'
import { AVIS, annoncer, estMotDePasseDemo, etatAuChargement, fixerSession, indisponible, marque, sessionReelle } from '../comptes-reels/hybride'
import { effacerCompteDemo, emailCompteDemo, estCompteEssai, ouvrirCompteReel } from '../demo/source-demo'
import type { Session, Source } from './source'

const E = 'client' as const
// Version des conditions que l'écran d'inscription fait accepter (« En créant ton compte, tu acceptes nos conditions
// (version 1.0) »).
const VERSION_CONDITIONS = '1.0'
const masque = (e: string) => {
  const [u, d] = e.split('@')
  return (u[0] ?? '') + '•'.repeat(Math.max(3, Math.min(6, u.length - 1))) + '@' + d
}

export function creerSourceHybride(demo: Source): Source {
  const ouvrir = (s: SessionReelle, seSouvenir: boolean) => {
    fixerSession(E, s)
    ouvrirCompteReel({ email: s.user.email, prenom: s.user.first_name, nom: s.user.last_name, photo: s.user.avatar_url }, seSouvenir)
  }
  const fermerReel = async () => {
    if (marque(E) || (await sessionReelle(E))) await comptesReels.deconnecter(E)
    fixerSession(E, null)
  }
  // Le compte réel par-dessus la session de démonstration : nom, adresse et photo viennent du serveur.
  const habiller = (s: Session, u: CompteReel): Session =>
    s.client
      ? {
          ...s,
          client: {
            ...s.client,
            prenom: u.first_name,
            nom: u.last_name,
            nomComplet: [u.first_name, u.last_name].filter(Boolean).join(' '),
            email: u.email,
            emailMasque: u.email_masque,
            connexion: 'email',
            photo: u.avatar_url ?? s.client.photo,
          },
        }
      : s

  const source: Source = {
    ...demo,
    async session() {
      const { reelle, perdue } = await etatAuChargement(E)
      if (perdue) {
        await demo.deconnecter()
        annoncer(AVIS.session())
      }
      if (!reelle) return demo.session()
      let s = await demo.session()
      if (!s.connecte || s.client?.email.toLowerCase() !== reelle.user.email) {
        ouvrirCompteReel({ email: reelle.user.email, prenom: reelle.user.first_name, nom: reelle.user.last_name, photo: reelle.user.avatar_url }, reelle.session.se_souvenir)
        s = await demo.session()
      }
      return habiller(s, reelle.user)
    },
    async connecterEmail(email, motDePasse, seSouvenir) {
      const adresse = email ?? (marque(E) ? emailCompteDemo() : null)
      if (adresse === null || estMotDePasseDemo(motDePasse) || estCompteEssai(adresse)) {
        await fermerReel()
        return demo.connecterEmail(email, motDePasse, seSouvenir)
      }
      const r = await comptesReels.connecter(E, adresse, motDePasse, seSouvenir)
      if (r.ok) {
        ouvrir(r, seSouvenir)
        return { ok: true, session: await source.session() }
      }
      if (indisponible(r)) {
        annoncer(AVIS.base())
        return demo.connecterEmail(email, motDePasse, seSouvenir)
      }
      if (r.code === 'bloque' || r.code === 'trop_de_tentatives') return { ok: false, raison: 'bloque', jusqua: Date.parse(String(r.data?.jusqua ?? '')) || Date.now() + 15 * 60_000 }
      if (r.code === 'compte_ferme') annoncer(r.message)
      return { ok: false, raison: 'incorrect', essaisRestants: Number(r.data?.essais_restants ?? 0) }
    },
    async inscrire(i, seSouvenir) {
      if (estMotDePasseDemo(i.motDePasse)) return { ok: false, raison: 'mdp' }
      const email = i.email ?? emailCompteDemo()
      // L'écran d'inscription porte l'acceptation des conditions (CL-13 : acceptées une fois, à l'inscription) ; le
      // serveur en garde la version et la date.
      const r = await comptesReels.inscrire(E, { email, motDePasse: i.motDePasse, prenom: i.prenom, conditions: { version: VERSION_CONDITIONS, acceptees: true }, seSouvenir })
      if (r.ok) {
        ouvrir(r, seSouvenir)
        return { ok: true, session: await source.session() }
      }
      if (indisponible(r)) {
        annoncer(AVIS.base())
        return demo.inscrire(i, seSouvenir)
      }
      if (r.code === 'existe') return { ok: false, raison: 'existe' }
      if (r.code === 'prenom' || r.code === 'nom') return { ok: false, raison: 'prenom' }
      if (r.code === 'mot_de_passe' || r.code === 'mot_de_passe_demo' || r.code === 'mot_de_passe2') return { ok: false, raison: 'mdp' }
      if (r.message) annoncer(r.message)
      return { ok: false, raison: 'email' }
    },
    // Diaspora par e-mail : les contrôles de l'écran (codes, âge, pays) d'abord, puis le vrai compte (type diaspora,
    // pays, numéro étranger). Google, Apple et numéro seul restent à la démonstration (fournisseurs pas encore branchés).
    async inscrireDiaspora(i) {
      if (i.fournisseur !== 'email' || !i.motDePasse || estMotDePasseDemo(i.motDePasse)) return demo.inscrireDiaspora(i)
      const d = await demo.inscrireDiaspora(i)
      if (!d.ok) return d
      const r = await comptesReels.inscrire(E, {
        email: i.email.trim(),
        motDePasse: i.motDePasse,
        prenom: i.prenom,
        nom: i.nom,
        telephone: i.indicatif + i.numero,
        typeCompte: 'diaspora',
        pays: i.pays,
        conditions: { version: VERSION_CONDITIONS, acceptees: true },
      })
      if (r.ok) {
        fixerSession(E, r)
        return { ok: true, session: await source.session() }
      }
      if (indisponible(r)) {
        annoncer(AVIS.base())
        return d
      }
      await demo.deconnecter()
      if (r.code === 'existe') return { ok: false, raison: 'existe' }
      if (r.code === 'mot_de_passe' || r.code === 'mot_de_passe_demo') return { ok: false, raison: 'mdp' }
      if (r.message) annoncer(r.message)
      return { ok: false, raison: 'email' }
    },
    async deconnecter() {
      await fermerReel()
      await demo.deconnecter()
    },
    async demanderLienMdp(email) {
      const adresse = (email ?? emailCompteDemo()).trim()
      if (estCompteEssai(adresse)) return demo.demanderLienMdp(email)
      const r = await comptesReels.oubli(E, adresse)
      if (!r.ok) {
        if (!indisponible(r) && r.message) annoncer(r.message)
        else annoncer(AVIS.base())
        return demo.demanderLienMdp(email)
      }
      if (r.envoi === 'support') annoncer(AVIS.email())
      return { destination: r.destination, valideMinutes: r.valide_minutes, envoi: r.envoi }
    },
    async nouveauMotDePasse(jeton, motDePasse) {
      const r = await comptesReels.reinitialiser(E, jeton, motDePasse)
      if (r.ok) return { ok: true, email: r.email }
      if (r.code === 'regle') return { ok: false, raison: 'regle' }
      if (r.code === 'expire') return { ok: false, raison: 'expire' }
      if (r.code === 'utilise') return { ok: false, raison: 'invalide' }
      // Jeton inconnu du serveur, ou service indisponible : peut-être un lien de la démonstration.
      return demo.nouveauMotDePasse(jeton, motDePasse)
    },
    async securite() {
      const s = await demo.securite()
      return marque(E) ? { ...s, methodes: { ...s.methodes, motDePasse: true } } : s
    },
    async changerMotDePasse(ancien, nouveau) {
      if (!marque(E)) return demo.changerMotDePasse(ancien, nouveau)
      const r = await comptesReels.changerMotDePasse(E, ancien, nouveau)
      if (r.ok) return { ok: true }
      if (r.code === 'old_password') return { ok: false, raison: 'ancien' }
      if (r.code !== 'new_password' && r.message) annoncer(r.message)
      return { ok: false, raison: 'regle' }
    },
    async confirmerProfil(c, code) {
      const r = await demo.confirmerProfil(c, code)
      if (r.ok && marque(E)) {
        let m = await comptesReels.modifierProfil(E, { prenom: c.prenom, nom: c.nom, photo: c.photo })
        // Photo trop lourde pour le serveur : le nom part quand même ; la photo reste sur cet appareil.
        if (!m.ok && m.code === 'photo') m = await comptesReels.modifierProfil(E, { prenom: c.prenom, nom: c.nom })
        if (m.ok) {
          const s = await sessionReelle(E)
          if (s) fixerSession(E, { ...s, user: m.user })
        } else if (m.message) annoncer(m.message)
      }
      return r
    },
    async envoyerCode(objet, destination, canal) {
      if (objet === 'suppression' && marque(E)) {
        const en = document.documentElement.lang.startsWith('en')
        return { destination: en ? 'your account password' : 'le mot de passe de votre compte', valideMinutes: 10, renvoiSecondes: 60 }
      }
      return demo.envoyerCode(objet, destination, canal)
    },
    async supprimerCompte(code) {
      if (!marque(E)) return demo.supprimerCompte(code)
      const avant = (await source.session()).client
      const r = await comptesReels.supprimer(E, code)
      if (r.ok && avant) {
        fixerSession(E, null)
        effacerCompteDemo()
        return { ok: true, client: avant }
      }
      if (!r.ok && (r.code === 'bloque' || r.code === 'trop_de_tentatives')) return { ok: false, bloqueJusqua: Date.parse(String(r.data?.jusqua ?? '')) || Date.now() + 15 * 60_000 }
      if (!r.ok && indisponible(r)) annoncer(AVIS.base())
      return { ok: false, essaisRestants: 3 }
    },
    async compteRetenu() {
      const s = marque(E) ? await sessionReelle(E) : null
      return s ? { emailMasque: masque(s.user.email) } : demo.compteRetenu()
    },
  }
  return source
}
