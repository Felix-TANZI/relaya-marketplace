// DONNÉES DE DÉMONSTRATION — domaine « equipe » : propriétaire + 3 accès employés au plus ; droits par employé (rôles
// prédéfinis ou personnalisé, src/donnees/droits.ts) ; inviter, changer des droits, réactiver et supprimer avec le
// code SMS du propriétaire (123456) ; suspendre sans code ; invitation en attente (7 jours), renvoyée ou annulée ;
// journal des actions signées par employé (journaux des commandes + gestes de l'équipe) ; réservé au propriétaire
// (ReserveAuProprietaire, comme le 403 owner_only).
import type { ActionMembre, DomaineEquipe, Equipe, MembreEquipe } from '../donnees/domaines/equipe'
import { ReserveAuProprietaire } from '../donnees/communs'
import { PROFILS, TOUS_LES_DROITS, normaliserDroits, profilDe, type Droit } from '../donnees/droits'
import { JOUR, yaounde } from '../calculs/temps'
import { PARAMETRES } from '../calculs/registre'
import { maintenant } from './horloge'
import { CODE_SMS_DEMO as CODE_DEMO, MEMBRES } from './jeu-essai'
import { masquer } from './compte'
import { estProprietaire } from './session'
import { etatCommandes } from './commandes'
import { magasin } from './stockage'

const MAX_EMPLOYES = PARAMETRES.console.equipeMax // VD-EQUIPE-MAX : « 3 accès employés par boutique, sur tous les plans » (VD02-P06)
const INVITATION_JOURS = 7 // proposé : une invitation non acceptée expire au bout de 7 jours, « Renvoyer » la prolonge
const RENVOI_MIN = 60_000 // un renvoi par minute au plus
// Numéros déjà liés à un autre compte BelivaY (démonstration du refus VD11-R24).
const DEJA_INSCRITS = ['690000000']

const initiales = (p: string, n: string) => (p[0] ?? '').toUpperCase() + (n.replace(/\W/g, '')[0] ?? '').toUpperCase()
const initial = () => ({
  forme: 5,
  membres: [...MEMBRES.map((m): MembreEquipe => ({
    id: m.id,
    prenom: m.prenom,
    nom: m.nom,
    initiales: m.initiales,
    telephone: m.telephone,
    role: m.role,
    profil: m.role === 'proprietaire' ? null : 'preparation',
    droits: m.role === 'proprietaire' ? TOUS_LES_DROITS : PROFILS.preparation.droits,
    depuis: m.depuis,
    etat: 'actif',
    inviteJusqua: null,
    suspenduLe: null,
    derniereAction: m.role === 'preparation' ? { texte: 'stock mis à jour', a: yaounde(2026, 10, 13, 9, 20) } : null,
  })),
    // Démonstration : un accès Stock suspendu et une invitation Service client en attente (3 accès employés sur 3).
    { id: 'm-paul', prenom: 'Paul', nom: 'E.', initiales: 'PE', telephone: '+237 6 55 23 71 04', role: 'preparation', profil: 'stock', droits: PROFILS.stock.droits, depuis: yaounde(2026, 4, 5, 10), etat: 'suspendu', inviteJusqua: null, suspenduLe: yaounde(2026, 10, 4, 18, 5), derniereAction: { texte: 'inventaire du soir', a: yaounde(2026, 10, 3, 19, 40) } },
    { id: 'm-mireille', prenom: 'Mireille', nom: 'T.', initiales: 'MT', telephone: '+237 6 94 18 52 66', role: 'preparation', profil: 'service_client', droits: PROFILS.service_client.droits, depuis: yaounde(2026, 10, 11, 16, 30), etat: 'invite', inviteJusqua: yaounde(2026, 10, 18, 16, 30), suspenduLe: null, derniereAction: null },
  ] as MembreEquipe[],
  invitations: {} as Record<string, { prenom: string; nom: string; telephone: string; droits: Droit[] }>,
  renvois: {} as Record<string, number>,
  // Gestes signés hors commandes (stock, connexion, équipe), par membre.
  actions: {
    'm-aicha': [
      { a: yaounde(2026, 10, 13, 9, 20), texte: 'Stock : ITEL AC52 noir 12 → 10', domaine: 'produits', ref: null, route: 'stock' },
      { a: yaounde(2026, 10, 13, 7, 58), texte: 'Connexion · Android · Yaoundé', domaine: 'connexion', ref: null, route: null },
    ],
    'm-paul': [
      { a: yaounde(2026, 10, 3, 19, 40), texte: 'Stock : Pagne wax bleu 5 → 3', domaine: 'produits', ref: null, route: 'stock' },
      { a: yaounde(2026, 10, 3, 19, 12), texte: 'Connexion · Android · Yaoundé', domaine: 'connexion', ref: null, route: null },
    ],
  } as Record<string, ActionMembre[]>,
  historique: [
    { a: yaounde(2026, 4, 5, 10), action: 'ajout', par: 'Franck', membre: 'Paul E.', detail: 'stock' },
    { a: yaounde(2026, 9, 24, 9), action: 'ajout', par: 'Franck', membre: 'Aïcha N.', detail: 'preparation' },
    { a: yaounde(2026, 10, 4, 18, 5), action: 'suspension', par: 'Franck', membre: 'Paul E.' },
    { a: yaounde(2026, 10, 11, 16, 30), action: 'ajout', par: 'Franck', membre: 'Mireille T.', detail: 'service_client' },
  ] as Equipe['historique'],
})
const etat = magasin('equipe', initial)
if ((etat.lire() as { forme?: number }).forme !== 5) etat.reinitialiser()

const proprio = () => {
  if (!estProprietaire()) throw new ReserveAuProprietaire('équipe')
  return etat.lire().membres.find((m) => m.role === 'proprietaire')!
}
const employes = () => etat.lire().membres.filter((m) => m.role !== 'proprietaire')
const vue = (): Equipe => {
  const e = etat.lire()
  return { membres: e.membres, maxEmployes: MAX_EMPLOYES, employes: employes().length, historique: [...e.historique].sort((a, b) => b.a - a.a) }
}
const nomDe = (m: { prenom: string; nom: string }) => `${m.prenom} ${m.nom}`
const membre = (id: string) => etat.lire().membres.find((x) => x.id === id)

/** Membres qui gardent leur session : ni retirés, ni suspendus (EQU-04, VD11-R22). */
export const membresActifs = (): string[] => etat.lire().membres.filter((m) => m.etat === 'actif' || m.etat === 'invite').map((m) => m.id)

/** Membre de l'équipe (session de démonstration : droits du membre connecté). */
export const membreEquipe = (id: string): MembreEquipe | null => membre(id) ?? null

/** Note un geste signé d'un employé hors commandes (stock, boutique) : journal du membre et « dernière action ». */
export function noterAction(id: string, action: Omit<ActionMembre, 'a'>) {
  if (!etat.lire().membres.some((m) => m.id === id && m.role !== 'proprietaire')) return
  const a = maintenant()
  etat.ecrire((e) => {
    ;(e.actions[id] ??= []).push({ ...action, a })
    e.membres.find((x) => x.id === id)!.derniereAction = { texte: action.texte, a }
  })
}

export const demoEquipe: DomaineEquipe = {
  async membres() {
    proprio()
    return vue()
  },
  async inviter(prenomNom, telephone, droits = PROFILS.preparation.droits) {
    const p = proprio()
    if (vue().employes >= MAX_EMPLOYES) return { ok: false, raison: 'plein' }
    const mots = prenomNom.trim().split(/\s+/).filter(Boolean)
    if (mots.length < 2 || mots.some((m) => !/^[\p{L}'’.-]+$/u.test(m))) return { ok: false, raison: 'nom' }
    const n = telephone.replace(/\D/g, '').replace(/^237/, '')
    if (!/^6\d{8}$/.test(n)) return { ok: false, raison: 'telephone' }
    if (DEJA_INSCRITS.includes(n) || etat.lire().membres.some((x) => x.telephone.replace(/\D/g, '').endsWith(n))) return { ok: false, raison: 'deja' }
    const d = normaliserDroits(droits)
    if (!d.length) return { ok: false, raison: 'droits' }
    const id = 'inv-' + maintenant().toString(36) + Math.random().toString(36).slice(2, 5)
    etat.ecrire((e) => {
      e.invitations[id] = { prenom: mots[0], nom: mots.slice(1).join(' '), telephone: '+237 ' + n, droits: d }
    })
    return { ok: true, invitation: id, masque: masquer(p.telephone) }
  },
  async confirmerInvitation(invitation, code) {
    const p = proprio()
    const inv = etat.lire().invitations[invitation]
    if (!inv) return { ok: false, raison: 'expire' }
    if (code !== CODE_DEMO) return { ok: false, raison: 'code' }
    if (vue().employes >= MAX_EMPLOYES) return { ok: false, raison: 'expire' }
    const t = maintenant()
    const m: MembreEquipe = {
      id: 'm-' + t.toString(36) + Math.random().toString(36).slice(2, 5),
      prenom: inv.prenom,
      nom: inv.nom,
      initiales: initiales(inv.prenom, inv.nom),
      telephone: inv.telephone,
      role: 'preparation',
      profil: profilDe(inv.droits),
      droits: inv.droits,
      depuis: t,
      etat: 'invite',
      inviteJusqua: t + INVITATION_JOURS * JOUR,
      suspenduLe: null,
      derniereAction: null,
    }
    etat.ecrire((e) => {
      e.membres.push(m)
      delete e.invitations[invitation]
      e.historique.push({ a: t, action: 'ajout', par: p.prenom, membre: nomDe(inv), detail: profilDe(inv.droits) })
    })
    return { ok: true, membre: m }
  },
  async renvoyerInvitation(id) {
    proprio()
    const t = maintenant()
    if (membre(id)?.etat !== 'invite' || t - (etat.lire().renvois[id] ?? 0) < RENVOI_MIN) return { ok: false, raison: 'trop_tot' }
    const jusqua = t + INVITATION_JOURS * JOUR
    etat.ecrire((e) => {
      e.renvois[id] = t
      e.membres.find((x) => x.id === id)!.inviteJusqua = jusqua
    })
    return { ok: true, jusqua }
  },
  async annulerInvitation(id) {
    const p = proprio()
    const m = membre(id)
    if (m?.etat !== 'invite') return { ok: false, raison: 'introuvable' }
    etat.ecrire((e) => {
      e.membres = e.membres.filter((x) => x.id !== id)
      e.historique.push({ a: maintenant(), action: 'annulation', par: p.prenom, membre: nomDe(m) })
    })
    return { ok: true, equipe: vue() }
  },
  async demanderCodeRetrait() {
    return { masque: masquer(proprio().telephone) }
  },
  async demanderCodeMembre() {
    return { masque: masquer(proprio().telephone) }
  },
  async retirer(id, code) {
    const p = proprio()
    const m = membre(id)
    if (!m || m.role === 'proprietaire') return { ok: false, raison: 'proprietaire' }
    if (code !== CODE_DEMO) return { ok: false, raison: 'code' }
    etat.ecrire((e) => {
      e.membres = e.membres.filter((x) => x.id !== id)
      e.historique.push({ a: maintenant(), action: 'retrait', par: p.prenom, membre: nomDe(m) })
    })
    return { ok: true, equipe: vue() }
  },
  async changerDroits(id, droits, code) {
    const p = proprio()
    const m = membre(id)
    if (!m || m.role === 'proprietaire') return { ok: false, raison: 'proprietaire' }
    const d = normaliserDroits(droits)
    if (!d.length) return { ok: false, raison: 'droits' }
    if (code !== CODE_DEMO) return { ok: false, raison: 'code' }
    const profil = profilDe(d)
    etat.ecrire((e) => {
      const x = e.membres.find((y) => y.id === id)!
      x.droits = d
      x.profil = profil
      e.historique.push({ a: maintenant(), action: 'droits', par: p.prenom, membre: nomDe(m), detail: profil })
    })
    return { ok: true, membre: membre(id)! }
  },
  async suspendre(id) {
    const p = proprio()
    const m = membre(id)
    if (!m || m.role === 'proprietaire') return { ok: false, raison: 'proprietaire' }
    if (m.etat !== 'actif') return { ok: false, raison: 'etat' }
    const t = maintenant()
    etat.ecrire((e) => {
      const x = e.membres.find((y) => y.id === id)!
      x.etat = 'suspendu'
      x.suspenduLe = t
      e.historique.push({ a: t, action: 'suspension', par: p.prenom, membre: nomDe(m) })
    })
    return { ok: true, membre: membre(id)! }
  },
  async reactiver(id, code) {
    const p = proprio()
    const m = membre(id)
    if (!m || m.role === 'proprietaire') return { ok: false, raison: 'proprietaire' }
    if (m.etat !== 'suspendu') return { ok: false, raison: 'etat' }
    if (code !== CODE_DEMO) return { ok: false, raison: 'code' }
    etat.ecrire((e) => {
      const x = e.membres.find((y) => y.id === id)!
      x.etat = 'actif'
      x.suspenduLe = null
      e.historique.push({ a: maintenant(), action: 'reactivation', par: p.prenom, membre: nomDe(m) })
    })
    return { ok: true, membre: membre(id)! }
  },
  async journal(id) {
    proprio()
    const m = membre(id)
    if (!m) return []
    // Journaux des commandes : chaque geste y est signé par son auteur (EQU-03).
    const auteur = nomDe(m)
    const commandes: ActionMembre[] = Object.entries(etatCommandes.lire()).flatMap(([ref, c]) =>
      c.journal.filter((j) => j.auteur === auteur).map((j) => ({ a: j.a, texte: j.action, domaine: 'commandes' as const, ref, route: `commande?ref=${ref}` })),
    )
    return [...commandes, ...(etat.lire().actions[id] ?? [])].sort((a, b) => b.a - a.a)
  },
}
