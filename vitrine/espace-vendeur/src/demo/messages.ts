// DONNÉES DE DÉMONSTRATION — domaine « messages » : conversations anonymes par commande (BLV-00008 à préparer, litige
// BLV-00005, BLV-00002 fermée à la fin du délai), conversation « Support BelivaY » (Q-49) qui accuse réception ;
// numéros, e-mails, liens et réseaux sociaux retirés avant l'envoi (VD11-R59).
import type { DomaineMessages, Fil, Message, TypeFil } from '../donnees/domaines/messages'
import { yaounde } from '../calculs/temps'
import { maintenant } from './horloge'
import { ARTICLES, COMMANDES, MEMBRES } from './jeu-essai'
import { etatCommandes, etatEffectif } from './commandes'
import { aLeDroit, avecDroit, exigerDroit, roleCourant } from './session'
import { ReserveAuProprietaire } from '../donnees/communs'
import { magasin, repondre } from './stockage'

// Même règle que le serveur : numéros (8 chiffres et plus, espaces et points compris), e-mails, liens, @pseudos et
// réseaux sociaux nommés.
const FILTRE = /(\+?\d[\d\s.-]{6,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)|(https?:\/\/\S+|www\.\S+|\b[\w-]+\.(?:com|cm|net|org|me)\b\S*)|(@\w{3,})|(\b(?:whats\s?app|facebook|instagram|tiktok|telegram|snapchat)\b)/gi
export function filtrer(texte: string) {
  const propre = texte.replace(FILTRE, '•••')
  return { propre, filtre: propre !== texte }
}

interface FilEtat {
  id: string
  type: TypeFil
  ref: string | null
  lus: number
}
const versement = COMMANDES.find((c) => c.ref === 'BLV-00002')?.versement ?? ''
const initial = () => ({
  forme: 3,
  fils: [
    { id: 'f-00008', type: 'commande', ref: 'BLV-00008', lus: 3 },
    { id: 'f-00005', type: 'litige', ref: 'BLV-00005', lus: 1 },
    { id: 'f-00011', type: 'commande', ref: 'BLV-00011', lus: 2 },
    { id: 'f-00017', type: 'litige', ref: 'BLV-00017', lus: 2 },
    { id: 'f-support', type: 'support', ref: null, lus: 3 },
    { id: 'f-00002', type: 'commande', ref: 'BLV-00002', lus: 2 },
  ] as FilEtat[],
  messages: {
    'f-00008': [
      { id: 'm1', de: 'client', auteur: null, texte: 'Bonjour, la couleur noire est bien celle de la photo ?', a: yaounde(2026, 10, 13, 9, 21), filtre: false },
      { id: 'm2', de: 'vendeur', auteur: 'Franck', texte: 'Oui, noir, neuf, avec chargeur et boîte d’origine.', a: yaounde(2026, 10, 13, 9, 24), filtre: false },
      { id: 'm3', de: 'vendeur', auteur: 'Franck', texte: 'Appelez-moi au ••• si besoin.', a: yaounde(2026, 10, 13, 9, 30), filtre: true },
      { id: 'm4', de: 'client', auteur: null, texte: 'Le livreur passe à quelle heure ?', a: yaounde(2026, 10, 13, 9, 31), filtre: false },
    ],
    'f-00005': [{ id: 'm5', de: 'client', auteur: null, texte: 'J’ai commandé le 256 Go, la boîte indique 128 Go.', a: yaounde(2026, 10, 12, 5, 30), filtre: false }],
    'f-00011': [
      { id: 'm9', de: 'client', auteur: null, texte: 'Les deux coques sont bien noires ?', a: yaounde(2026, 10, 13, 8, 12), filtre: false },
      { id: 'm10', de: 'vendeur', auteur: 'Aïcha', texte: 'Oui, deux coques noires, emballées séparément.', a: yaounde(2026, 10, 13, 8, 40), filtre: false },
    ],
    'f-00017': [
      { id: 'm11', de: 'client', auteur: null, texte: 'Le chargeur ne charge plus après deux jours.', a: yaounde(2026, 10, 11, 10, 0), filtre: false },
      { id: 'm12', de: 'vendeur', auteur: 'Franck', texte: 'Désolé : je vous propose un chargeur neuf, testé devant le livreur.', a: yaounde(2026, 10, 11, 15, 6), filtre: false },
    ],
    'f-support': [
      { id: 'm6', de: 'support', auteur: null, texte: `Votre versement du 10 oct. est parti : ${versement}`, a: yaounde(2026, 10, 10, 11, 40), filtre: false },
      { id: 'm13', de: 'vendeur', auteur: 'Franck', texte: 'Réponse privée à l’avis, à transmettre sans le nom de ma boutique : « Merci, la boîte sera mieux protégée. »', a: yaounde(2026, 10, 10, 12, 5), filtre: false },
      { id: 'm14', de: 'support', auteur: null, texte: 'C’est transmis au client, sans le nom de votre boutique.', a: yaounde(2026, 10, 10, 14, 20), filtre: false },
    ],
    'f-00002': [
      { id: 'm7', de: 'client', auteur: null, texte: 'Bien reçu, merci !', a: yaounde(2026, 9, 29, 16, 20), filtre: false },
      { id: 'm8', de: 'vendeur', auteur: 'Franck', texte: 'Merci pour votre commande.', a: yaounde(2026, 9, 29, 16, 41), filtre: false },
    ],
  } as Record<string, Message[]>,
})
const etat = magasin('messages', initial)
if ((etat.lire() as { forme?: number }).forme !== 3) etat.reinitialiser()

const ETAPES: Record<string, string> = { a_preparer: 'à préparer', chez_le_livreur: 'chez le livreur', litige: 'litige', retour: 'retour', se_libere: 'livrée', a_verser: 'livrée', versee: 'livrée', annulee: 'annulée' }

function vue(): Fil[] {
  const e = etat.lire()
  const cmd = etatCommandes.lire()
  return e.fils.map((f) => {
    const m = e.messages[f.id] ?? []
    const c = f.ref ? COMMANDES.find((x) => x.ref === f.ref) : null
    // État effectif : la conversation d'un litige se ferme à la clôture du dossier (Q-70, CMD-07).
    const ec = f.ref && cmd[f.ref] ? etatEffectif(f.ref, cmd[f.ref]) : null
    // Fermée : délai de litige passé (commande versée ou à verser) ; conversation d'un litige : dossier clos (Q-70).
    const ferme = f.type === 'support' ? false : f.type === 'litige' ? ec?.etape !== 'litige' : ec?.etape === 'versee' || ec?.etape === 'a_verser'
    const a = c ? ARTICLES[c.article] : null
    return {
      id: f.id,
      type: f.type,
      ref: f.ref,
      sujet: f.type === 'support' ? 'Support BelivaY' : `Client de ${f.ref}`,
      nonLus: Math.max(m.length - f.lus, 0),
      dernier: m.at(-1) ?? null,
      ferme: !!ferme,
      commande: c && a && ec ? { titre: a.titre, variante: a.variante, dessin: a.dessin, etape: ETAPES[ec.etape] ?? ec.etape, echeance: ec.etape === 'a_preparer' ? ec.echeance : null } : null,
    }
  })
}
export const nonLusMessages = () => vue().reduce((s, f) => s + f.nonLus, 0)

const auteur = () => {
  const role = roleCourant()
  return (role === 'preparation' ? MEMBRES.find((m) => m.role === 'preparation') : MEMBRES.find((m) => m.role === 'proprietaire'))?.prenom ?? null
}

function poster(id: string, texte: string): Message {
  const t = texte.trim()
  if (!t) throw new Error('vide')
  const f = vue().find((x) => x.id === id)
  if (!f) throw new Error('inconnu')
  if (f.ferme) throw new Error('ferme')
  const { propre, filtre } = filtrer(t)
  const m: Message = { id: 'm-' + maintenant().toString(36) + Math.random().toString(36).slice(2, 5), de: 'vendeur', auteur: auteur(), texte: propre, a: maintenant(), filtre }
  etat.ecrire((e) => {
    ;(e.messages[id] ??= []).push(m)
    const x = e.fils.find((y) => y.id === id)
    if (x) x.lus = e.messages[id].length
  })
  return m
}

const REPONSES: Record<TypeFil, string[]> = {
  commande: ['C’est prêt', 'Le livreur passe aujourd’hui', 'Merci pour votre commande'],
  litige: ['Je regarde votre photo et je reviens vers vous', 'Pouvez-vous ajouter une photo de l’étiquette ?', 'Merci pour votre patience'],
  support: ['Pouvez-vous me rappeler la règle ?', 'Merci, c’est réglé'],
}

export const demoMessages: DomaineMessages = {
  fils: () =>
    avecDroit('messages.voir', 'messages', () => repondre(
      vue().sort((a, b) => Number(a.ferme) - Number(b.ferme) || (b.dernier?.a ?? 0) - (a.dernier?.a ?? 0)),
    )),
  fil: (id) => {
    if (!aLeDroit('messages.voir')) return Promise.reject(new ReserveAuProprietaire('messages'))
    const f = vue().find((x) => x.id === id)
    return repondre(f ? { fil: f, messages: etat.lire().messages[id] ?? [] } : null)
  },
  async envoyer(id, texte) {
    exigerDroit('messages.repondre', 'répondre')
    return poster(id, texte)
  },
  async lire(id) {
    if (!vue().find((f) => f.id === id)?.nonLus) return
    etat.ecrire((e) => {
      const f = e.fils.find((x) => x.id === id)
      if (f) f.lus = (e.messages[id] ?? []).length
    })
  },
  filtrer,
  async ecrireAuSupport(texte, ref) {
    poster('f-support', ref ? `${ref} · ${texte.trim()}` : texte)
    // Accusé de réception du support (première réponse en 2 h au plus, de 7 h à 21 h : Q-47).
    etat.ecrire((e) => {
      e.messages['f-support'].push({ id: 'm-ar-' + maintenant().toString(36), de: 'support', auteur: null, texte: 'Bien reçu. Une personne vous répond en 2 h au plus, de 7 h à 21 h, ici même.', a: maintenant() + 1000, filtre: false })
      const x = e.fils.find((y) => y.id === 'f-support')
      if (x) x.lus = e.messages['f-support'].length
    })
    return { fil: 'f-support' }
  },
  reponsesRapides: (type) => repondre(REPONSES[type]),
  async ouvrirFil(ref) {
    const existe = etat.lire().fils.find((f) => f.ref === ref)
    if (existe) return { fil: existe.id }
    const ec = etatCommandes.lire()[ref]
    if (!ec) return null
    const id = 'f-' + ref.replace(/^BLV-/, '')
    etat.ecrire((e) => {
      e.fils.push({ id, type: ec.etape === 'litige' ? 'litige' : 'commande', ref, lus: 0 })
    })
    return { fil: id }
  },
}
