// DONNÉES DE DÉMONSTRATION — commandes et fiches commande (ADM-P04) : les commandes du jeu d'essai (jeu-essai.ts),
// plus deux commandes qui montrent les états sans escrow (payable au retrait) et « en vérification » (débit signalé
// par l'opérateur, pas encore confirmé), plus les commandes payées par le client sur le pont (order.paid), suivies
// d'après les événements des autres espaces (prise en charge, ramassage, relais, retrait). Les montants détaillés (commission, parts) sont des chiffres de démonstration,
// figés « au paiement » avec la version de grille ; la console ne les recalcule jamais (ADM-P04R-01).
// Rôles (ADM-04-R04) : la Finance reçoit l'argent, pas le contenu ni la chronologie des preuves ; le téléphone du
// client se démasque sur motif (Support, Direction) ; le code de retrait n'est jamais envoyé, seulement son état.
import { F } from '@client/i18n/format'
import { PARAMETRES } from '../calculs/registre'
import { droitDe } from '../config/droits'
import type { ArgentCommande, CommandeCourte, CommandeFiche, DomaineCommandes, EtapeCommande, EtatArgent, EtatCommande } from '../donnees/domaines/commandes'
import type { DecisionQuatreYeux } from '../donnees/domaines/quatreyeux'
import { REGLES_S1 } from '../pages/ADM-03/regles'
import { ACTEURS_DEMO, evenementsPour, publier, type Evenement } from './pont'
import { maintenant } from './horloge'
import { auPerimetre, exiger, exigerPage, roleCourant } from './acces'
import { journaliser } from './journal'
import { MINUTE } from '../calculs/temps'
import { AccesRefuse } from '../donnees/communs'
import { CLIENTS, COMMANDES, HEURE, JOUR, T, masquerTelephone } from './jeu-essai'
import { issueDe, litigesOuverts } from './litiges'
import { demanderSecond, effetQuatreYeux } from './quatreyeux'
import { magasin, repondre } from './stockage'

/** Ce que le jeu d'essai commun ne porte pas : article, paiement, étiquette, paquet, « C'est prêt ». */
const DETAILS: Record<string, { article: string; paiement: string; etiquette: string | null; paquet: string | null; pretLe: number | null; litige?: string }> = {
  'BLV-52107': { article: 'Ordinateur portable HP 15 · Robe wax', paiement: 'MTN MoMo ···· 17', etiquette: null, paquet: null, pretLe: null },
  'BLV-52089': { article: 'Pagne wax 6 yards', paiement: 'MTN MoMo ···· 17', etiquette: 'BV 24 8129', paquet: 'PQ-Z9-261013-001', pretLe: T(-6 * 60) },
  'BLV-51877': { article: 'Robe pagne wax · taille M', paiement: 'MTN MoMo ···· 17', etiquette: 'BV 24 7962', paquet: 'PQ-Z9-261011-002', pretLe: T(-75 * 60), litige: 'LT-0412' },
  'BLV-00008': { article: 'Chemise bazin brodée', paiement: 'Orange Money ···· 88', etiquette: 'BV 24 8137', paquet: 'PQ-Z1-261013-003', pretLe: T(-150) },
  'BLV-00009': { article: 'Sandales cuir · 42', paiement: 'Orange Money ···· 88', etiquette: 'BV 24 8138', paquet: 'PQ-Z1-261013-003', pretLe: T(-150) },
  'BLV-00011': { article: 'Ceinture tressée', paiement: 'MTN MoMo ···· 31', etiquette: 'BV 24 8141', paquet: 'PQ-Z1-261013-003', pretLe: T(-150) },
  'BLV-52230': { article: 'Pagne wax 6 yards · lot de 3', paiement: 'Orange Money ···· 31', etiquette: 'BV 24 8135', paquet: 'PQ-Z3-261013-003', pretLe: T(-5 * 60 - 20), litige: 'LT-0418' },
  'BLV-52241': { article: 'Coffret soins karité', paiement: 'MTN MoMo ···· 54', etiquette: 'BV 24 8150', paquet: 'PQ-Z6-261013-002', pretLe: T(-6 * 60 - 30) },
  'BLV-52245': { article: 'Plaquettes de frein · Corolla', paiement: 'MTN MoMo ···· 20', etiquette: null, paquet: null, pretLe: null },
  'BLV-52198': { article: 'Miel de l’Adamaoua · 1 L', paiement: 'Orange Money ···· 54', etiquette: 'BV 24 8077', paquet: 'PQ-Z6-261009-001', pretLe: T(-7 * 24 * 60), litige: 'LT-0399' },
  'BLV-52150': { article: 'Téléphone Tecno Camon 30 · 256 Go', paiement: 'MTN MoMo ···· 20', etiquette: 'BV 24 8101', paquet: 'PQ-Z6-261008-004', pretLe: T(-8 * 24 * 60 - 30), litige: 'LT-0405' },
  'BLV-52250': { article: 'Lampe solaire', paiement: 'Payable au retrait', etiquette: null, paquet: null, pretLe: null },
  'BLV-52252': { article: 'Écouteurs sans fil', paiement: 'Orange Money ···· 63', etiquette: null, paquet: null, pretLe: null },
}

type Base = { ref: string; client: string; vendeurs: string[]; relais: string | null; zone: string; total: number; payeeLe: number; etat: EtatCommande }
const EXTRAS: Base[] = [
  { ref: 'BLV-52250', client: 'c-0388', vendeurs: ['Techno Bastos'], relais: 'Relais Bastos Carrefour', zone: 'Z1', total: 18500, payeeLe: T(-40), etat: 'validee' },
  { ref: 'BLV-52252', client: 'c-7731', vendeurs: ['Maman Wax Mokolo'], relais: 'Relais Mokolo Marché', zone: 'Z3', total: 15900, payeeLe: T(-12), etat: 'verification' },
]

// ── Commandes payées par le client sur le pont (order.paid, références BLV-…) ────────────────────────────────────
type Ev<T extends Evenement['type']> = Extract<Evenement, { type: T }>
/** Client d'une commande du pont : le pont ne porte jamais son identité (GEN-01). */
const CLIENT_PONT = { id: 'c-pont', masque: 'Client •••', telephone: '', zone: ACTEURS_DEMO.vendeur.zone }
/** Les commandes du pont, une fois par référence, avec leur état suivi d'après les événements des autres espaces. */
function commandesDuPont(): (Base & { details: (typeof DETAILS)[string] })[] {
  const ev = evenementsPour('admin')
  const de = <T extends Evenement['type']>(t: T) => ev.filter((e): e is Ev<T> => e.type === t)
  const vues = new Set<string>()
  const l: (Base & { details: (typeof DETAILS)[string] })[] = []
  for (const o of de('order.paid')) {
    if (vues.has(o.commande) || COMMANDES.some((c) => c.ref === o.commande)) continue
    vues.add(o.commande)
    const colis = o.colis.map((c) => c.colis)
    const sur = (x: { colis?: string | string[]; commande?: string }) => (x.commande === o.commande) || (Array.isArray(x.colis) ? x.colis.some((c) => colis.includes(c)) : !!x.colis && colis.includes(x.colis))
    const a = (t: Evenement['type']) => ev.some((e) => e.type === t && sur(e as { colis?: string | string[]; commande?: string }))
    const pret = de('suborder.ready').find(sur)
    const paquet = de('package.published').find(sur)?.paquet ?? de('package.assigned').find(sur)?.paquet ?? null
    const etat: EtatCommande = a('suborder.out_of_stock') || ev.some((e) => e.type === 'commande_annulee' && e.commande === o.commande) ? 'remboursee' : a('handover.completed') || a('parcel.delivered') ? 'retiree' : a('parcel.arrival_notice') || a('parcel.pickup_code') ? 'au_relais' : a('parcel.collected') || a('home.departed') ? 'en_route' : a('suborder.accepted') || pret ? 'preparation' : o.payableAuRetrait ? 'validee' : 'payee'
    const total = o.colis.reduce((n, c) => n + c.lignes.reduce((m, x) => m + x.prix * x.qte, 0), 0)
    l.push({
      ref: o.commande, client: CLIENT_PONT.id, vendeurs: [...new Set(o.colis.map((c) => c.boutique))], relais: o.relais ? (o.relais === ACTEURS_DEMO.relais.id ? ACTEURS_DEMO.relais.nom : o.lieu) : null, zone: o.zone ?? CLIENT_PONT.zone, total, payeeLe: o.le, etat,
      details: { article: o.colis.flatMap((c) => c.lignes.map((x) => x.titre)).join(' · '), paiement: o.payableAuRetrait ? 'Payable au retrait' : 'Mobile Money', etiquette: null, paquet, pretLe: pret?.le ?? null },
    })
  }
  return l
}
const detailsDe = (ref: string) => DETAILS[ref] ?? commandesDuPont().find((c) => c.ref === ref)?.details

export const commandesDemo = magasin<{ etats: Record<string, EtatCommande>; annulees: Record<string, { motif: string; le: number; qy: string | null }>; attente: Record<string, string> }>('commandes', () => ({ etats: {}, annulees: {}, attente: {} }))

// Un litige ouvert gèle la sous-commande (ADM-CYC-02) : l'état suit le dossier, jamais l'inverse.
const toutes = (): Base[] => {
  const geles = new Set(litigesOuverts().filter((l) => l.etat !== 'recours').map((l) => l.commande))
  return [...(COMMANDES as Base[]), ...EXTRAS, ...commandesDuPont().map(({ details: _d, ...c }) => c)].map((c) => ({ ...c, etat: commandesDemo.lire().etats[c.ref] ?? (geles.has(c.ref) ? 'litige' : c.etat === 'litige' ? (issueDe(c.ref) === 'debouter' || issueDe(c.ref) === 'remplacer' ? 'retiree' : 'remboursee') : c.etat) }))
}
const client = (id: string) => CLIENTS.find((c) => c.id === id) ?? CLIENT_PONT

const ARGENT: Record<EtatCommande, EtatArgent> = { payee: 'bloque', validee: 'sans_escrow', verification: 'attente', preparation: 'bloque', en_route: 'bloque', au_relais: 'bloque', retiree: 'se_libere', litige: 'gele', annulee: 'rembourse', remboursee: 'rembourse' }
const AVANT_REMISE: EtatCommande[] = ['payee', 'validee', 'verification', 'preparation']

function court(c: Base): CommandeCourte {
  const d = detailsDe(c.ref)
  const livree = ['retiree', 'annulee', 'remboursee', 'litige'].includes(c.etat)
  return {
    ref: c.ref,
    article: d?.article ?? '—',
    client: client(c.client).masque,
    telephoneClient: client(c.client).telephone ? masquerTelephone(client(c.client).telephone) : 'Non transmis',
    vendeurs: c.vendeurs,
    relais: c.relais,
    zone: c.zone,
    total: c.total,
    paiement: d?.paiement ?? '—',
    payeeLe: c.payeeLe,
    etat: c.etat,
    argent: ARGENT[c.etat],
    etiquette: d?.etiquette ?? null,
    paquet: d?.paquet ?? null,
    litige: d?.litige ?? null,
    enRetard: !livree && !!d?.pretLe && c.etat !== 'au_relais' && maintenant() - d.pretLe > REGLES_S1.livraisonH * HEURE,
  }
}

/** Montants de démonstration, « figés au paiement » (grille COM-V02). */
export function argent(c: Base): ArgentCommande {
  const livraison = c.relais ? 1000 : 1500
  const article = c.total - livraison
  const commission = Math.max(700, Math.round(article * 0.08))
  const partRelais = c.relais ? 300 : 0
  const partTransporteur = Math.round(livraison * 0.6)
  const d = detailsDe(c.ref)
  return { paye: c.total, article, livraison, commission, netVendeur: article - commission, partRelais, partTransporteur, revenus: commission + livraison - partRelais - partTransporteur, versionGrille: 'COM-V02 · 1er oct. 2026', liberationLe: c.etat === 'retiree' && d?.pretLe ? d.pretLe + 10 * JOUR : null }
}

function chronologie(c: Base): EtapeCommande[] {
  const d = detailsDe(c.ref)
  const e = (t: string, le: number | null, par: string | null, preuve: string | null, st: EtapeCommande['st'] = 'done', saisieLe: number | null = null): EtapeCommande => ({ t, le, par, preuve, saisieLe, st })
  const l: EtapeCommande[] = [e(c.etat === 'validee' ? 'Validée · payable au retrait' : c.etat === 'verification' ? 'Débit signalé par l’opérateur' : 'Payée', c.payeeLe, 'Client', c.etat === 'verification' ? 'Confirmation de l’agrégateur attendue' : d?.paiement ?? null, c.etat === 'verification' ? 'cur' : 'done')]
  if (c.etat === 'annulee' || c.etat === 'remboursee') return [...l, e(c.etat === 'annulee' ? 'Annulée par la console' : 'Remboursée', commandesDemo.lire().annulees[c.ref]?.le ?? c.payeeLe + JOUR, 'Console', 'Remboursement intégral au moyen d’origine', 'bad')]
  if (!d?.pretLe) return [...l, e('Chez le vendeur', null, c.vendeurs.join(', '), null, 'cur')]
  l.push(e('C’est prêt', d.pretLe, c.vendeurs.join(', '), null))
  l.push(e('Paquet', d.pretLe + 20 * MINUTE, 'BelivaY', d.paquet))
  l.push(e('C1 · remise au livreur', d.pretLe + 60 * MINUTE, 'Livreur', `Photo · étiquette ${d.etiquette} · code de remise validé`, 'done', c.ref === 'BLV-00011' ? d.pretLe + 55 * MINUTE : null))
  if (c.etat === 'en_route') return [...l, e(c.relais ? 'C2 · dépôt au relais' : 'C3 · remise à domicile', null, null, null, 'cur')]
  if (c.relais) l.push(e('C2 · dépôt au relais', d.pretLe + 150 * MINUTE, c.relais, 'QR de mission scanné · scellé intact'))
  if (c.etat === 'au_relais') return [...l, e('C3 · retrait', null, null, 'Code de retrait envoyé au client', 'cur')]
  l.push(e(c.relais ? 'C3 · retrait au comptoir' : 'C3 · remise à domicile', d.pretLe + 26 * HEURE, c.relais ?? 'Livreur', 'Photo · code validé'))
  if (c.etat === 'litige') return [...l, e(`Litige ${d.litige}`, d.pretLe + 27 * HEURE, 'Client', 'Escrow gelé', 'bad')]
  return [...l, e('Libération', argent(c).liberationLe, 'Registre', 'À la fermeture du droit de retour + délai du palier', 'cur')]
}

function fiche(c: Base): CommandeFiche {
  const r = roleCourant()
  const vue: CommandeFiche['vue'] = r === 'finance' ? 'argent' : droitDe('commandes', r).acces === 'oui' ? 'complete' : 'lecture'
  const x = court(c)
  const annulable = AVANT_REMISE.includes(c.etat) && !commandesDemo.lire().attente[c.ref]
  const code = c.etat === 'au_relais' ? 'envoye' : ['retiree', 'litige'].includes(c.etat) ? 'utilise' : 'non_envoye'
  return {
    ...x,
    chronologie: vue === 'argent' ? [] : chronologie(c),
    sousCommandes: c.vendeurs.map((v, i) => ({ vendeur: v, articles: x.article.split(' · ')[i] ?? x.article, montant: Math.round(c.total / c.vendeurs.length), argent: x.argent, dossier: i === 0 ? x.litige : null })),
    argentDetail: r === 'support' || r === 'operations' ? null : argent(c),
    codeRetrait: code,
    ifa: 'Standard',
    commandesClient: COMMANDES.filter((y) => y.client === c.client).length,
    messages:
      vue === 'argent'
        ? []
        : [
            { le: c.payeeLe + MINUTE, canal: 'SMS', quoi: `Confirmation de paiement · ${client(c.client).masque}` },
            ...(code !== 'non_envoye' ? [{ le: (detailsDe(c.ref)?.pretLe ?? c.payeeLe) + 150 * MINUTE, canal: 'SMS', quoi: 'Code de retrait envoyé (jamais affiché ici)' }] : []),
          ],
    annulable: annulable && vue === 'complete',
    raisonNonAnnulable: annulable ? null : commandesDemo.lire().attente[c.ref] ? `Annulation en attente du second validateur (${commandesDemo.lire().attente[c.ref]})` : c.etat === 'annulee' || c.etat === 'remboursee' ? 'Commande annulée et remboursée au moyen d’origine.' : 'Le code de remise a été validé : la commande ne s’annule plus, elle passe par un litige ou un retour.',
    vue,
  }
}

const motifValable = (m: string) => m.trim().length >= PARAMETRES.console.motifMin

function annulerVraiment(ref: string, motif: string, qy: string | null) {
  commandesDemo.ecrire((e) => {
    e.etats[ref] = 'annulee'
    e.annulees[ref] = { motif, le: maintenant(), qy }
    delete e.attente[ref]
  })
  // Client : remboursement au moyen d'origine ; vendeur : commande retirée.
  const c = toutes().find((x) => x.ref === ref)
  publier({ type: 'commande_annulee', commande: ref, motif, montant: c?.total ?? 0 }, `admin-annulation-${ref}`, maintenant())
}
effetQuatreYeux('commande.annuler', (objet, q: DecisionQuatreYeux) => {
  if (q.etat === 'contresignee') annulerVraiment(objet, q.motif, q.id)
  else commandesDemo.ecrire((e) => void delete e.attente[objet])
})

export const demoCommandes: DomaineCommandes = {
  async liste() {
    exigerPage('commandes', 'Commandes')
    return repondre(auPerimetre(toutes()).sort((a, b) => b.payeeLe - a.payeeLe).map(court))
  },
  async commande(ref) {
    exigerPage('commandes', 'Commandes')
    const c = auPerimetre(toutes()).find((x) => x.ref === ref)
    return repondre(c ? fiche(c) : null)
  },
  async demasquer(ref, champ, motif) {
    exiger('demasquer')
    // Le téléphone du client : Support et Direction seulement (ADM-P04R-03).
    if (!['support', 'superviseur'].includes(roleCourant())) throw new AccesRefuse('Afficher le téléphone du client', ['superviseur', 'support'])
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const c = auPerimetre(toutes()).find((x) => x.ref === ref)
    if (!c) throw new Error(`commande inconnue : ${ref}`)
    // La ligne du journal est écrite AVANT de rendre la donnée (ADM-SEC-04).
    await journaliser({ action: 'donnee.demasquer', objet: `${ref} · ${champ}`, motif, zone: c.zone })
    return { ok: true, valeur: client(c.client).telephone || 'Non transmis par l’application client' }
  },
  async annuler(ref, motif) {
    exigerPage('commandes', 'Commandes')
    if (droitDe('commandes', roleCourant()).acces !== 'oui' || roleCourant() === 'finance') throw new AccesRefuse('Annuler une commande', ['superviseur'])
    const c = auPerimetre(toutes()).find((x) => x.ref === ref)
    if (!c) throw new Error(`commande inconnue : ${ref}`)
    if (!AVANT_REMISE.includes(c.etat) || commandesDemo.lire().attente[ref]) return { ok: false, raison: 'non_annulable' }
    if (!motifValable(motif)) return { ok: false, raison: 'motif_court' }
    const resume = `Annuler ${ref} et rembourser ${F(c.total)} F au client vers ${detailsDe(ref)?.paiement ?? 'le moyen d’origine'}`
    if (c.total > REGLES_S1.seuilQuatreYeux) {
      const q = await demanderSecond({ action: 'commande.annuler', objet: ref, resume, motif: motif.trim(), preuves: [{ id: 'cmd', libelle: `Commande ${ref}`, route: 'commandes', params: { ref } }], montant: c.total, quatreYeux: true, rolesSecond: ['finance', 'superviseur'] })
      commandesDemo.ecrire((e) => void (e.attente[ref] = q))
      return { ok: true, etat: 'a_contresigner', id: q }
    }
    await journaliser({ action: 'commande.annuler', objet: ref, motif: motif.trim(), zone: c.zone })
    annulerVraiment(ref, motif.trim(), null)
    return { ok: true, etat: 'appliquee', id: ref }
  },
}

/** Pour la vue d'ensemble et la recherche : toutes les commandes, telles qu'une ligne les montre. */
export const commandesCourtes = () => toutes().map(court)
/** Commandes brutes (montants de démonstration : vue d'ensemble, chiffres du jour). */
export const commandesBrutes = toutes
