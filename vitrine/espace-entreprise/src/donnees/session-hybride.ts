// Source hybride de l'entreprise de livraison (VITE_SOURCE=hybride, site/COMPTES-REELS.md) : connexion par e-mail et mot
// de passe, déconnexion et session passent par les comptes réels ; tout le reste reste la démonstration (Yafé Express),
// ouverte sous le nom du compte réel. Une entreprise réelle naît par sa candidature (comptesReels.inscrire('entreprise',
// { candidature: { nom, … } }), « en attente » jusqu'à la validation par la console) ; inviter un livreur :
// comptesReels.inviter('entreprise', …). Le compte d'essai (mot de passe Belivay2026) reste la démonstration seule.
import { comptesReels } from '@client/comptes-reels/client'
import { AVIS, annoncer, annoncerStatut, estMotDePasseDemo, fermerReel, fixerSession, indisponible, initiales, sessionHabillee, surcharger } from '@client/comptes-reels/hybride'
import type { DomaineSession } from './domaines/session'

const E = 'entreprise' as const
const estEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

export function sessionHybride(demo: DomaineSession): DomaineSession {
  const session = sessionHabillee(E, demo, () => demo.changerRole('proprietaire'), (s, r) => ({
    ...s,
    utilisateur: s.utilisateur ? { ...s.utilisateur, prenom: r.user.first_name, nom: r.user.last_name, initiales: initiales(r.user.first_name, r.user.last_name) } : s.utilisateur,
    entreprise: s.entreprise && r.user.organisation ? { ...s.entreprise, nom: r.user.organisation } : s.entreprise,
  }))
  return surcharger(demo, {
    session,
    async connecter(identifiant, motDePasse) {
      if (estMotDePasseDemo(motDePasse) || !estEmail(identifiant)) {
        await fermerReel(E)
        return demo.connecter(identifiant, motDePasse)
      }
      const r = await comptesReels.connecter(E, identifiant.trim(), motDePasse)
      if (r.ok) {
        fixerSession(E, r)
        await demo.changerRole('proprietaire')
        annoncerStatut(r)
        return { ok: true, code: false }
      }
      if (indisponible(r)) {
        annoncer(AVIS.base())
        return demo.connecter(identifiant, motDePasse)
      }
      if (r.code === 'bloque' || r.code === 'trop_de_tentatives') return { ok: false, raison: 'bloque', jusqua: Date.parse(String(r.data?.jusqua ?? '')) || Date.now() + 15 * 60_000 }
      if (r.code === 'compte_ferme') return { ok: false, raison: 'retire' }
      return { ok: false, raison: 'identifiants', essaisRestants: Number(r.data?.essais_restants ?? 0) }
    },
    async deconnecter() {
      await fermerReel(E)
      return demo.deconnecter()
    },
  })
}
