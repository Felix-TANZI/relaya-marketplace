// Source hybride du vendeur (VITE_SOURCE=hybride, site/COMPTES-REELS.md) : le domaine « session » passe par les comptes
// réels pour la connexion (e-mail et mot de passe), la déconnexion et le mot de passe oublié ; tout le reste (boutique,
// commandes, argent…) reste la démonstration, ouverte sous le nom du compte réel. Un compte vendeur réel naît « en
// attente de validation » (comptesReels.inscrire('vendeur', …), site/src/comptes-reels/client.ts) ; la session le dit
// (compteReel.statut) et l'avis l'annonce à la connexion.
// Le compte d'essai (@Penga12, mot de passe Belivay2026) reste la démonstration seule.
import { comptesReels, type SessionReelle } from '@client/comptes-reels/client'
import { AVIS, annoncer, estMotDePasseDemo, etatAuChargement, fixerSession, indisponible, marque, marquerPremierPassage, premierPassageFait, sessionReelle } from '@client/comptes-reels/hybride'
import type { DomaineSession, SessionVendeur } from './domaines/session'

const E = 'vendeur' as const
const estEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const initiales = (p: string, n: string) => ((p[0] ?? '') + (n[0] ?? '')).toUpperCase() || '•'
const ouvrirDemo = (seSouvenir: boolean) => import('../demo/session').then((m) => m.ouvrirParCompte(seSouvenir))

/** Lien « mot de passe oublié » d'un compte réel : il n'y a pas de SMS ici, le lien reçu par e-mail suffit. */
const jetonsReels = new Set<string>()

function habiller(s: SessionVendeur, r: SessionReelle): SessionVendeur {
  const u = r.user
  return {
    ...s,
    membre: s.membre ? { ...s.membre, prenom: u.first_name, nom: u.last_name, initiales: initiales(u.first_name, u.last_name) } : s.membre,
    proprietaire: { prenom: u.first_name, nom: u.last_name },
    compteReel: { statut: u.statut, email: u.email },
  }
}

const annoncerStatut = (r: SessionReelle) => {
  const en = document.documentElement.lang.startsWith('en')
  if (r.user.statut === 'en_attente')
    annoncer(en ? 'Your seller account is awaiting validation by BelivaY: the shop shown is the demo shop.' : 'Votre compte vendeur est en attente de validation par BelivaY : la boutique affichée est celle de la démonstration.')
}

export function sessionHybride(demo: DomaineSession): DomaineSession {
  const fermerReel = async () => {
    if (marque(E) || (await sessionReelle(E))) await comptesReels.deconnecter(E)
    fixerSession(E, null)
  }
  const d: Partial<DomaineSession> & Pick<DomaineSession, 'session'> = {
    async session() {
      const { reelle, perdue } = await etatAuChargement(E)
      if (perdue) {
        await demo.deconnecter()
        annoncer(AVIS.session())
      }
      if (!reelle) {
        // Premier passage sur cet appareil : la démonstration ouverte d'avance est fermée ; l'espace s'ouvre sur sa page
        // de connexion (décision du porteur), le compte de démonstration à un clic.
        let s = await demo.session()
        if (s.connecte && !premierPassageFait(E)) {
          await demo.deconnecter()
          s = await demo.session()
        }
        marquerPremierPassage(E)
        return s
      }
      let s = await demo.session()
      if (!s.connecte) {
        await ouvrirDemo(reelle.session.se_souvenir)
        s = await demo.session()
      }
      return habiller(s, reelle)
    },
    async connecter(identifiant, motDePasse, o) {
      if (estMotDePasseDemo(motDePasse) || !estEmail(identifiant)) {
        await fermerReel()
        return demo.connecter(identifiant, motDePasse, o)
      }
      const seSouvenir = o?.seSouvenir ?? true
      const r = await comptesReels.connecter(E, identifiant.trim(), motDePasse, seSouvenir)
      if (r.ok) {
        fixerSession(E, r)
        await ouvrirDemo(seSouvenir)
        annoncerStatut(r)
        return { ok: true, session: await d.session() }
      }
      if (indisponible(r)) {
        annoncer(AVIS.base())
        return demo.connecter(identifiant, motDePasse, o)
      }
      if (r.code === 'bloque' || r.code === 'trop_de_tentatives') return { ok: false, raison: 'bloque', jusqua: Date.parse(String(r.data?.jusqua ?? '')) || Date.now() + 15 * 60_000 }
      if (r.code === 'compte_ferme') annoncer(r.message)
      return { ok: false, raison: 'identifiants', essaisRestants: Number(r.data?.essais_restants ?? 0) }
    },
    async deconnecter() {
      await fermerReel()
      return demo.deconnecter()
    },
    async demanderLienMotDePasse(identifiant) {
      if (!estEmail(identifiant) || identifiant.trim().toLowerCase() === 'franck.penga@exemple.cm') return demo.demanderLienMotDePasse(identifiant)
      const r = await comptesReels.oubli(E, identifiant.trim())
      if (!r.ok) {
        annoncer(indisponible(r) ? AVIS.base() : r.message)
        return demo.demanderLienMotDePasse(identifiant)
      }
      if (r.envoi === 'support') annoncer(AVIS.email())
      return { ok: true, lien: { envoyeA: Date.now(), valideMinutes: r.valide_minutes, renvoiSecondes: 60 } }
    },
    async ouvrirLienMotDePasse(jeton) {
      const r = await comptesReels.lireReinitialisation(E, jeton)
      if (!r.ok) return r.code === 'expire' || r.code === 'utilise' ? { ok: false, raison: 'expire' } : demo.ouvrirLienMotDePasse(jeton)
      jetonsReels.add(jeton)
      // Compte réel : le lien reçu par e-mail est la preuve, il n'y a pas d'étape de code (sansCode : l'écran la retire ;
      // aucun SMS ne part, aucun code n'est affiché ni attendu, choisirMotDePasse ne lit pas le code).
      return {
        ok: true,
        nouveau: { identifiant: r.email, sansCode: true, envoi: { id: 'lien', canal: 'sms', destination: r.email, envoyeA: Date.now(), valideMinutes: 30, renvoiSecondes: 0, renvoisRestants: 0 } },
      }
    },
    async choisirMotDePasse(jeton, code, motDePasse) {
      if (!jetonsReels.has(jeton)) return demo.choisirMotDePasse(jeton, code, motDePasse)
      // Le code n'a pas de sens ici (lien e-mail) : il n'est ni lu ni exigé.
      const r = await comptesReels.reinitialiser(E, jeton, motDePasse)
      if (r.ok) {
        jetonsReels.delete(jeton)
        return { ok: true }
      }
      if (r.code === 'regle') return { ok: false, raison: 'faible' }
      return { ok: false, raison: 'expire' }
    },
  }
  // La démonstration est un Proxy (chargée à la demande) : ce qui n'est pas réécrit ici lui est passé tel quel.
  return new Proxy(d as DomaineSession, { get: (t, k) => (k in t ? t[k as keyof DomaineSession] : demo[k as keyof DomaineSession]) })
}
