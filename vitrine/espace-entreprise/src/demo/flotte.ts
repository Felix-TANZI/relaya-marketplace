// DONNÉES DE DÉMONSTRATION — domaine « flotte » (ENT-P05, ENT-P07) : résumé lu dans les livreurs ; invitations
// (numéro +237 exigé comme le serveur, valables expiration_invitation_livreur jours tant qu'elles ne sont pas ouvertes,
// ENT-P07R-03) et le suivi de chaque invité. Jeu d'essai : Ange prêt à approuver (pièces vérifiées, quiz réussi), Hervé
// en activation (pièces en revue), Dimitri refusé par BelivaY (motif écrit), Sandrine invitée, Yves dont l'invitation a
// expiré. Numéros réservés à la démonstration : +237 6 99 00 00 01 est un livreur actif d'une autre entreprise (409),
// +237 6 99 00 00 02 est en liste noire (403 générique, la console est alertée).
import type { DetailsInvitation, DomaineFlotte, Invitation } from '../donnees/domaines/flotte'
import type { FicheLivreur } from '../donnees/domaines/livreurs'
import { PARAMETRES } from '../calculs/registre'
import { PARAMETRES_FLOTTE } from '../calculs/flotte'
import { JOUR, jourDe } from '../calculs/temps'
import { maintenant } from './horloge'
import { T } from './jeu-essai'
import { exiger } from './acces'
import { signer } from './journal'
import { ajouterLivreur, livreursDemo, piece } from './livreurs'
import { magasin, repondre } from './stockage'
import { normerPlaque, vehiculesDemo } from './vehicules'
import { zonesDemo } from './zones'

const P = PARAMETRES_FLOTTE
const AUTRE_ENTREPRISE = '+237699000001'
const LISTE_NOIRE = '+237699000002'
const TEL = /^\+237 ?6( ?\d){8}$/
const normerTel = (t: string) => t.replace(/\s/g, '')

const invitation = (id: string, nom: string, telephone: string, il: number, etat: Partial<Invitation>): Invitation => ({
  id,
  nom,
  telephone,
  envoyeeLe: T(-il * 24 * 60),
  expireLe: T(-il * 24 * 60) + P.invitationJours * JOUR,
  statut: 'acceptee',
  etape: 'invitation',
  vehicule: { type: 'moto', plaque: 'LT 220 CD' },
  capacite: 20,
  zones: ['Z3'],
  ouverteLe: T(-il * 24 * 60 + 90),
  quiz: null,
  refus: null,
  livreurId: null,
  ...etat,
})

export const invitationsDemo = magasin('flotte', () => ({
  invitations: [
    invitation('IV-ange', 'Ange M.', '+237 6 91 22 33 44', 6, { etape: 'approbation', quiz: P.quizMin + 2, vehicule: { type: 'moto', plaque: 'LT 220 CD' }, zones: ['Z3', 'Z2'] }),
    invitation('IV-herve', 'Hervé F.', '+237 6 99 45 81 03', 4, { etape: 'pieces', livreurId: 'l-herve', vehicule: { type: 'moto', plaque: 'CE 917 LT' }, zones: ['Z1'] }),
    invitation('IV-dimitri', 'Dimitri K.', '+237 6 93 44 55 66', 5, { statut: 'refusee', etape: 'pieces', refus: 'Pièce d’identité illisible : la photo du verso est floue. Le livreur peut la renvoyer depuis son application.', vehicule: { type: 'tricycle', plaque: 'CE 330 KL' }, zones: ['Z6'], capacite: 30 }),
    invitation('IV-sandrine', 'Sandrine E.', '+237 6 94 12 12 12', 2, { statut: 'envoyee', ouverteLe: null, vehicule: { type: 'moto', plaque: 'LT 118 EF' }, zones: ['Z1'] }),
    invitation('IV-yves', 'Yves T.', '+237 6 95 30 30 30', P.invitationJours + 2, { statut: 'envoyee', ouverteLe: null, vehicule: { type: 'voiture', plaque: 'CE 774 GH' }, zones: ['Z2'], capacite: 25 }),
  ],
}))

/** L'invitation vue par le serveur : une invitation non ouverte après sa date d'expiration a expiré. */
const vue = (i: Invitation, t = maintenant()): Invitation => (i.statut === 'envoyee' && !i.ouverteLe && i.expireLe <= t ? { ...i, statut: 'expiree' } : i)

const ok = { ok: true as const }
const non = <R extends string>(raison: R) => repondre({ ok: false as const, raison })

export const demoFlotte: DomaineFlotte = {
  async resume() {
    const ls = livreursDemo.lire().livreurs.filter((l) => l.statut !== 'retire')
    const n = (f: (s: string) => boolean) => ls.filter((l) => f(l.statut)).length
    return repondre({ total: ls.length, actifs: n((s) => ['actif', 'en_ligne', 'en_mission'].includes(s)), enLigne: n((s) => ['en_ligne', 'en_mission'].includes(s)), enActivation: n((s) => s === 'en_activation'), suspendus: n((s) => s === 'suspendu') })
  },
  async invitations() {
    return repondre(invitationsDemo.lire().invitations.map((i) => vue(i)).filter((i) => i.statut !== 'abandonnee' && i.statut !== 'activee'))
  },
  async inviter(nom, telephone, details?: DetailsInvitation) {
    exiger(['proprietaire', 'repartiteur'], 'Inviter un livreur')
    if (nom.trim().length < 2 || !/\p{L}/u.test(nom)) return non('nom')
    if (!TEL.test(telephone.trim())) return non('telephone')
    const norme = normerTel(telephone)
    if (norme === LISTE_NOIRE) {
      signer('courier_invitation.blocked', 'invitation:' + norme, 'numéro', '', 'liste noire : console alertée')
      return non('refuse') // 403 générique : aucun motif détaillé pour l'entreprise
    }
    if (norme === AUTRE_ENTREPRISE) return non('autre_entreprise') // 409 : un livreur, une entreprise (ENT-P05R-05)
    const vus = invitationsDemo.lire().invitations.map((i) => vue(i))
    if (vus.some((i) => normerTel(i.telephone) === norme && (i.statut === 'envoyee' || i.statut === 'acceptee')) || livreursDemo.lire().livreurs.some((l) => l.statut !== 'retire' && normerTel(l.telephone) === norme)) return non('doublon')
    if (details) {
      const declarees = zonesDemo.lire().zones.map((z) => z.code)
      if (!details.zones.length || details.zones.some((z) => !declarees.includes(z))) return non('zones')
      if (!Number.isInteger(details.capacite) || details.capacite < 1) return non('capacite')
      const plaque = normerPlaque(details.vehicule.plaque)
      if (!/^[A-Z]{2}\d{3,4}[A-Z]{1,2}$/.test(plaque) || vehiculesDemo.lire().vehicules.some((v) => normerPlaque(v.plaque) === plaque)) return non('plaque')
    }
    const t = maintenant()
    const nouvelle: Invitation = {
      id: 'IV-' + Math.random().toString(36).slice(2, 7),
      nom: nom.trim(),
      telephone: telephone.trim(),
      envoyeeLe: t,
      expireLe: t + P.invitationJours * JOUR,
      statut: 'envoyee',
      etape: 'invitation',
      vehicule: details ? { type: details.vehicule.type, plaque: details.vehicule.plaque.trim().toUpperCase() } : null,
      capacite: details?.capacite ?? null,
      zones: details?.zones ?? [],
      ouverteLe: null,
      quiz: null,
      refus: null,
      livreurId: null,
    }
    invitationsDemo.ecrire((s) => void s.invitations.unshift(nouvelle))
    signer('courier_invitation.sent', 'invitation:' + nouvelle.id, 'invitation', '', `${nouvelle.nom} · SMS`)
    return repondre({ ...ok, invitation: nouvelle })
  },
  async renvoyer(id) {
    exiger(['proprietaire', 'repartiteur'], 'Renvoyer une invitation')
    const i = invitationsDemo.lire().invitations.find((x) => x.id === id)
    if (!i) return non('statut')
    const v = vue(i)
    const t = maintenant()
    if (v.statut === 'refusee') {
      // Refus de BelivaY : le livreur est invité par SMS à renvoyer sa pièce depuis son application.
      const apres = invitationsDemo.ecrire((s) => Object.assign(s.invitations.find((x) => x.id === id)!, { statut: 'acceptee', etape: 'pieces', refus: null }))
      signer('courier_invitation.resubmit_requested', 'invitation:' + id, 'pièces', 'refusée', 'renvoi demandé au livreur')
      return repondre({ ...ok, invitation: apres.invitations.find((x) => x.id === id)! })
    }
    if (v.statut !== 'envoyee' && v.statut !== 'expiree') return non('statut')
    if (t - i.envoyeeLe < PARAMETRES.acces.renvoiCodeSecondes * 1000) return non('trop_tot') // idempotent pendant ce délai
    const apres = invitationsDemo.ecrire((s) => Object.assign(s.invitations.find((x) => x.id === id)!, { statut: 'envoyee', envoyeeLe: t, expireLe: t + P.invitationJours * JOUR }))
    signer('courier_invitation.resent', 'invitation:' + id, 'expiration', jourDe(i.expireLe), jourDe(t + P.invitationJours * JOUR))
    return repondre({ ...ok, invitation: apres.invitations.find((x) => x.id === id)! })
  },
  async abandonner(id) {
    exiger(['proprietaire', 'repartiteur'], 'Abandonner une invitation')
    const i = invitationsDemo.lire().invitations.find((x) => x.id === id)
    if (!i || i.statut === 'activee') return non('statut')
    invitationsDemo.ecrire((s) => void (s.invitations.find((x) => x.id === id)!.statut = 'abandonnee'))
    signer('courier_invitation.cancelled', 'invitation:' + id, 'statut', i.statut, 'abandonnée')
    return repondre(ok)
  },
  async approuver(id) {
    exiger(['proprietaire', 'repartiteur'], 'Approuver un livreur')
    const i = invitationsDemo.lire().invitations.find((x) => x.id === id)
    // Approbation : seulement à l'étape 5 (pièces vérifiées et certification réussie : ENT-RG-R74).
    if (!i || i.statut !== 'acceptee' || i.etape !== 'approbation' || (i.quiz ?? 0) < P.quizMin) return non('pas_pret')
    const t = maintenant()
    const lid = 'l-' + i.id.slice(3)
    const vid = 'v-' + i.id.slice(3)
    const type = i.vehicule?.type ?? 'moto'
    vehiculesDemo.ecrire((s) =>
      void s.vehicules.push({ id: vid, type, plaque: i.vehicule?.plaque ?? '', classes: P.classes[type], livreurId: lid, assuranceJusqua: t + 300 * JOUR, statut: 'actif', capacite: i.capacite ?? 1, carteGrise: { statut: 'valide', le: t - 3 * JOUR }, photos: { vehicule: t - 3 * JOUR, plaque: t - 3 * JOUR }, motifIndisponible: null }),
    )
    const initiales = i.nom
      .split(/\s+/)
      .map((m) => m[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    const l: FicheLivreur = {
      id: lid,
      nom: i.nom,
      initiales,
      vehicule: type,
      telephone: normerTel(i.telephone),
      statut: 'actif',
      zones: i.zones ?? [],
      trustScore: null,
      certifieJusqua: t + P.certificationMois * 30 * JOUR,
      missionsDuJour: 0,
      capacite: i.capacite ?? 1,
      suspension: null,
      retraitDemande: null,
      activeLe: t,
      pieces: [piece(lid, 'identite', 'valide', t + 1500 * JOUR, t - 3 * JOUR, t - 2 * JOUR), piece(lid, 'selfie', 'valide', null, t - 3 * JOUR, t - 2 * JOUR), piece(lid, 'permis', 'valide', t + 900 * JOUR, t - 3 * JOUR, t - 2 * JOUR)],
      vehiculeId: vid,
      note: null,
      charteLe: i.ouverteLe ?? t,
      certification: { quiz: i.quiz ?? null, le: t - 1 * JOUR, modules: 7, modulesFaits: 7 },
      criteres: undefined,
      evenements: [],
      activite: { jours: [], paquets: [], colisLivres: 0, dansLeDelai: 0, remis: 0 },
      tarifMission: null,
      notifications: [{ le: t, texte: 'Votre entreprise vous a approuvé : votre accès est actif.' }],
    }
    ajouterLivreur(l)
    invitationsDemo.ecrire((s) => Object.assign(s.invitations.find((x) => x.id === id)!, { statut: 'activee', etape: 'active', livreurId: lid }))
    signer('rider.approved', 'livreur:' + lid, 'statut', 'invité', 'actif (accès activé par BelivaY)')
    return repondre({ ...ok, livreurId: lid })
  },
}
