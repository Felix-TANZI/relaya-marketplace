// DONNÉES DE DÉMONSTRATION — les quatre domaines des pages AJ-A (stock, promotions, questions, livraison), « serveur »
// de la démonstration comme src/demo/* : état gardé sur l'appareil (magasin), montants CALCULÉS par src/calculs
// (jamais écrits), offres lues et écrites dans le magasin des produits (src/demo/produits.ts : une seule vérité du
// stock, du prix, du colis, du délai et du paiement au retrait). Chiffres du jeu d'essai = données ; seules les règles
// comptent. Chargé à la demande (./source.ts), jamais par un écran.
import type { ClasseColis } from '../../../donnees/communs'
import { ReserveAuProprietaire } from '../../../donnees/communs'
import type { Produit } from '../../../donnees/domaines/produits'
import { calculerCommission, decouverteActive, familleDe } from '../../../calculs/commission'
import { OffreRefusee } from '../../../calculs/erreurs'
import { PARAMETRES, REGISTRE } from '../../../calculs/registre'
import { HEURE, JOUR, jourDe, yaounde } from '../../../calculs/temps'
import { maintenant } from '../../../demo/horloge'
import { BOUTIQUE, COMMANDES, MEMBRES } from '../../../demo/jeu-essai'
import { commandesComptees, etapeEffective } from '../../../demo/commandes'
import { demoProduits, etatOffres, ficheDe, journal, vue } from '../../../demo/produits'
import { filtrer as filtrerMessage } from '../../../demo/messages'
import { roleCourant, estProprietaire, exigerDroit } from '../../../demo/session'
import { magasin, repondre } from '../../../demo/stockage'
import { ajouterPromo, etatPromo, etatPromos, promoActive, RELECTURE_H, type PromoEtat } from '../../../demo/ventes-flash'
import { etatLivraison } from './defauts'
import type {
  ApercuPromotion,
  DomaineLivraison,
  DomainePromotions,
  DomaineQuestions,
  DomaineStock,
  Inventaire,
  LigneStock,
  ListeQuestions,
  ModeleReponse,
  Mouvement,
  MotifSignalement,
  OffrePromouvable,
  ProduitLivraison,
  ProjetPromotion,
  Promotion,
  QuestionClient,
  RefusPromotion,
  ReglagesLivraison,
  ReglesPromotion,
  SourceAJA,
  TypeMouvement,
} from './types'

const reserve = (quoi: string) => {
  if (!estProprietaire()) throw new ReserveAuProprietaire(quoi)
}
/** Auteur d'un geste : le membre connecté (« Franck P. », « Aïcha N. »), signé dans le journal (VD02-DR03). */
function auteur(): string {
  const role = roleCourant()
  const m = MEMBRES.find((x) => x.role === role) ?? MEMBRES[0]
  return `${m.prenom} ${m.nom.endsWith('.') ? m.nom : m.nom[0] + '.'}`
}
const offres = () => etatOffres.lire().offres
const produit = (id: string): Produit | null => {
  const o = offres().find((x) => x.id === id)
  return o ? vue(o) : null
}

// ═════════════════════════════ Stock et inventaire ═════════════════════════════

const JOURS_COUVERTURE = 14 // horizon du conseil de réapprovisionnement (valeur proposée, réglable en console)
const TRENTE_J = 30 * JOUR

interface MouvementEtat {
  id: string
  offreId: string
  type: TypeMouvement
  delta: number
  a: number
  auteur: string | null
  ref: string | null
  note: string | null
}
// Mouvements du jeu d'essai : réceptions et une correction, puis une vente par commande payée (le stock est réservé
// au paiement, VD02-C02). Les ventes viennent des commandes ; les avant / après se calculent à la lecture.
const etatStock = magasin<{ mouvements: MouvementEtat[]; n: number }>('aja_stock', () => ({
  mouvements: [
    { id: 'mv-1', offreId: 'itel-noir', type: 'reappro', delta: 8, a: yaounde(2026, 8, 25, 10, 5), auteur: 'Franck P.', ref: null, note: 'Carton de 8 reçu du grossiste' },
    { id: 'mv-2', offreId: 'iphone', type: 'reappro', delta: 4, a: yaounde(2026, 9, 1, 11, 20), auteur: 'Franck P.', ref: null, note: null },
    { id: 'mv-3', offreId: 'itel-noir', type: 'correction', delta: -1, a: yaounde(2026, 9, 10, 17, 40), auteur: 'Aïcha N.', ref: null, note: 'Boîte abîmée, retirée de la vente' },
    { id: 'mv-4', offreId: 'itel-bleu', type: 'reappro', delta: 5, a: yaounde(2026, 9, 20, 15, 30), auteur: 'Franck P.', ref: null, note: 'Première réception' },
  ],
  n: 4,
}))

function ventes(): MouvementEtat[] {
  return COMMANDES.filter((c) => offres().some((o) => o.id === c.article)).map((c) => ({ id: 'v-' + c.ref, offreId: c.article, type: 'vente' as const, delta: -c.quantite, a: c.payeeA, auteur: null, ref: c.ref, note: null }))
}

/** Changements de stock faits ailleurs (fiche de l'offre, rupture, import) : lus dans le journal de l'offre. */
function changementsAilleurs(propres: MouvementEtat[]): MouvementEtat[] {
  const out: MouvementEtat[] = []
  for (const o of offres())
    for (const h of o.historique) {
      if (!h.quoi.startsWith('Stock changé') || !h.valeurs) continue
      const de = Number(h.valeurs.de)
      const a = Number(h.valeurs.a)
      const vu = propres.some((m) => m.offreId === o.id && Math.abs(m.a - h.a) < 10_000 && m.delta === a - de)
      if (!vu) out.push({ id: `h-${o.id}-${h.a}`, offreId: o.id, type: a === 0 ? 'rupture' : 'correction', delta: a - de, a: h.a, auteur: null, ref: null, note: 'Changé depuis la fiche de l’offre' })
    }
  return out
}

function tousLesMouvements(offreId?: string | null): Mouvement[] {
  const propres = etatStock.lire().mouvements
  // À la même heure (gestes rapprochés), le plus récent est le dernier écrit.
  const rang = new Map(propres.map((m, i) => [m.id, i]))
  const tous = [...propres, ...ventes(), ...changementsAilleurs(propres)].sort((x, y) => y.a - x.a || (rang.get(y.id) ?? -1) - (rang.get(x.id) ?? -1))
  const out: Mouvement[] = []
  for (const o of offres()) {
    let courant = o.stock
    const p = vue(o)
    for (const m of tous.filter((x) => x.offreId === o.id)) {
      out.push({ ...m, titre: p.titre, variante: p.variante, apres: courant, avant: courant - m.delta })
      courant -= m.delta
    }
  }
  return out.filter((m) => !offreId || m.offreId === offreId).sort((x, y) => y.a - x.a || (rang.get(y.id) ?? -1) - (rang.get(x.id) ?? -1))
}

function ligne(p: Produit): LigneStock {
  const t = maintenant()
  const vendues30 = COMMANDES.filter((c) => c.article === p.id && c.payeeA > t - TRENTE_J).reduce((s, c) => s + c.quantite, 0)
  const reserveCmd = COMMANDES.filter((c) => c.article === p.id && etapeEffective(c.ref) === 'a_preparer').reduce((s, c) => s + c.quantite, 0)
  const parJour = vendues30 / 30
  const alerte = p.etat !== 'en_vente' ? null : p.stock === 0 ? ('rupture' as const) : p.stock <= p.seuilAlerte ? ('sous_seuil' as const) : null
  // Conseil : de quoi tenir l'horizon au rythme des 30 derniers jours, et repasser au-dessus du seuil.
  const cible = Math.max(p.seuilAlerte + 1, Math.ceil(parJour * JOURS_COUVERTURE))
  const mvts = tousLesMouvements(p.id)
  return {
    offreId: p.id,
    titre: p.titre,
    variante: p.variante,
    dessin: p.photos[0]?.image ?? p.dessin,
    etat: p.etat,
    stock: p.stock,
    seuil: p.seuilAlerte,
    reserve: reserveCmd,
    alerte,
    ventes30j: vendues30,
    joursRestants: parJour > 0 ? Math.floor(p.stock / parJour) : null,
    conseilReappro: alerte ? Math.max(0, cible - p.stock) : 0,
    prix: p.prix,
    dernierMouvement: mvts[0]?.a ?? null,
  }
}
const rangAlerte = (l: LigneStock) => (l.alerte === 'rupture' ? 0 : l.alerte === 'sous_seuil' ? 1 : 2)

function inventaire(): Inventaire {
  const lignes = offres()
    .filter((o) => o.etat !== 'brouillon')
    .map((o) => ligne(vue(o)))
    .sort((a, b) => rangAlerte(a) - rangAlerte(b) || a.stock - a.seuil - (b.stock - b.seuil) || a.titre.localeCompare(b.titre))
  const proprio = estProprietaire()
  return {
    lignes,
    compteurs: {
      produits: lignes.length,
      enVente: lignes.filter((l) => l.etat === 'en_vente').length,
      unites: lignes.reduce((s, l) => s + l.stock, 0),
      ruptures: lignes.filter((l) => l.alerte === 'rupture').length,
      sousSeuil: lignes.filter((l) => l.alerte === 'sous_seuil').length,
    },
    valeur: proprio ? lignes.reduce((s, l) => s + l.stock * (l.prix ?? 0), 0) : null,
    joursCouverture: JOURS_COUVERTURE,
    luA: maintenant(),
  }
}

const NOTE_MAX = 120

export const demoStock: DomaineStock = {
  inventaire: async () => (exigerDroit('produits.voir', 'stock'), repondre(inventaire())),
  mouvements: async (offreId) => repondre(tousLesMouvements(offreId).slice(0, 80)),
  async ajuster(offreId, c) {
    exigerDroit('produits.stock', 'stock')
    const p = produit(offreId)
    if (!p) return { ok: false, raison: 'introuvable' }
    if (!Number.isInteger(c.nouveau) || c.nouveau < 0 || c.nouveau > 99999) return { ok: false, raison: 'stock' }
    const note = c.note?.trim() || null
    if (note && note.length > NOTE_MAX) return { ok: false, raison: 'note' }
    if (c.type === 'reappro' && c.nouveau <= p.stock) return { ok: false, raison: 'stock' }
    if (c.nouveau === p.stock) return { ok: true, ligne: ligne(p), mouvement: null }
    const delta = c.nouveau - p.stock
    const r = await demoProduits.changerStock(offreId, c.nouveau)
    if (!r.ok) return { ok: false, raison: 'stock' }
    const a = maintenant()
    let id = ''
    etatStock.ecrire((e) => {
      e.n++
      id = 'mv-' + e.n + '-' + a.toString(36)
      e.mouvements.push({ id, offreId, type: c.type === 'reappro' ? 'reappro' : c.nouveau === 0 ? 'rupture' : 'correction', delta, a, auteur: auteur(), ref: null, note })
    })
    const mouvement = tousLesMouvements(offreId).find((m) => m.id === id) ?? null
    return { ok: true, ligne: ligne(produit(offreId)!), mouvement }
  },
  async regler(offreId, seuil) {
    const r = await demoProduits.regler(offreId, { seuilAlerte: seuil })
    if (!r.ok) return { ok: false, raison: r.raison === 'reserve' ? 'reserve' : 'seuil' }
    return { ok: true, ligne: ligne(r.produit) }
  },
  async exporter() {
    const proprio = estProprietaire()
    const i = inventaire()
    const champ = (v: string | number | null) => (v === null ? '' : /[;"]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
    const tete = ['identifiant', 'produit', 'variante', 'stock', 'seuil', 'reserve', 'alerte', 'ventes_30j', ...(proprio ? ['prix'] : [])]
    const lignes = i.lignes.map((l) => [l.offreId, l.titre, l.variante, l.stock, l.seuil, l.reserve, l.alerte ?? '', l.ventes30j, ...(proprio ? [l.prix] : [])].map(champ).join(';'))
    return [tete.join(';'), ...lignes].join('\n')
  },
}

// ═════════════════════════════ Promotions (vente flash à remise vérifiée) ═════════════════════════════

const lireRegistre = (code: string, motif: RegExp) => {
  const m = motif.exec(REGISTRE[code] ?? '')
  if (!m) throw new Error(`${code} : forme inattendue (« ${REGISTRE[code]} »)`)
  return m
}
const VIS = PARAMETRES.console.visibilite
const REGLES: ReglesPromotion = {
  ouvert: /^ouvert/.test(REGISTRE['FF-FLASH'] ?? ''),
  remiseMin: Number(lireRegistre('FLASH-REMISE-MIN', /^(\d+) %$/)[1]),
  relueAuDela: VIS.remiseReluePct,
  dureeMaxHeures: Number(lireRegistre('FLASH-DUREE-MAX', /^(\d+) h$/)[1]),
  programmerJoursMax: 30, // valeur proposée, réglable en console
  joursReference: 30, // prix barré = le plus bas pratiqué sur 30 jours (prix réellement pratiqué, OFR-05)
  scoreMin: VIS.scoreMin,
  trustScore: BOUTIQUE.trustScore,
  prixMin: PARAMETRES.commission.prixMin,
  relectureHeures: RELECTURE_H, // P-3 : remise au-delà du seuil relue sous 24 h
}

function gardeA(prix: number, p: Produit): { garde: number; commission: number; plancher: boolean } | null {
  const pc = PARAMETRES.commission
  const dec = decouverteActive(BOUTIQUE.premiereCommandePayee, jourDe(maintenant()), commandesComptees(), pc)
  try {
    const r = calculerCommission([{ famille: familleDe(p.categorie, pc), prixUnitaire: prix, madeInCameroon: p.madeInCameroon }], BOUTIQUE.palier, dec, pc)
    return { garde: r.garde, commission: r.commission, plancher: r.plancherApplique }
  } catch (e) {
    if (e instanceof OffreRefusee) return null
    throw e
  }
}

/** Prix de référence (prix barré) : le plus bas réellement pratiqué sur les N derniers jours (historique des prix). */
function prixReference(offreId: string): number | null {
  const o = offres().find((x) => x.id === offreId)
  if (!o || o.prix === null) return null
  const depuis = maintenant() - REGLES.joursReference * JOUR
  const anciens = o.historique.filter((h) => h.quoi.startsWith('Prix changé') && h.a >= depuis && h.valeurs).map((h) => Number(h.valeurs!.de))
  return Math.min(o.prix, ...anciens.filter((x) => Number.isFinite(x) && x > 0))
}

function vuePromo(x: PromoEtat): Promotion {
  const p = produit(x.offreId)
  const ga = p ? gardeA(x.prixReference, p) : null
  const gp = p ? gardeA(x.prixPromo, p) : null
  const fin = x.arreteeA ?? x.fin
  return {
    id: x.id,
    offreId: x.offreId,
    titre: p?.titre ?? '',
    variante: p?.variante ?? '',
    dessin: p?.photos[0]?.image ?? p?.dessin ?? 'itel',
    type: x.type,
    valeur: x.valeur,
    prixReference: x.prixReference,
    prixPromo: x.prixPromo,
    remisePourCent: Math.round(((x.prixReference - x.prixPromo) / x.prixReference) * 1000) / 10,
    gardeAvant: ga?.garde ?? 0,
    gardePromo: gp?.garde ?? 0,
    debut: x.debut,
    fin: x.fin,
    etat: etatPromo(x),
    origine: x.origine,
    creeeA: x.creeeA,
    relueAvant: x.relue ? x.creeeA + RELECTURE_H * HEURE : null,
    arreteeA: x.arreteeA,
    vendues: COMMANDES.filter((c) => c.article === x.offreId && c.payeeA >= x.debut && c.payeeA < fin).reduce((s, c) => s + c.quantite, 0),
  }
}
const active = promoActive

function apercu(pr: ProjetPromotion): ApercuPromotion {
  const p = produit(pr.offreId)
  const ref = prixReference(pr.offreId) ?? 0
  const vide = (refus: RefusPromotion): ApercuPromotion => ({ prixReference: ref, prixPromo: ref, remisePourCent: 0, gardeAvant: 0, gardePromo: null, commissionPromo: null, plancherApplique: false, relue: false, refus })
  if (!REGLES.ouvert) return vide('ferme')
  if (!p || p.prix === null || !ref) return vide('etat')
  if (!Number.isFinite(pr.valeur) || pr.valeur <= 0 || (pr.type === 'pourcent' && (!Number.isInteger(pr.valeur) || pr.valeur >= 100)) || (pr.type === 'montant' && !Number.isInteger(pr.valeur))) return vide('valeur')
  // Prix remisé arrondi à la dizaine inférieure (jamais une remise plus petite qu'annoncée).
  const brut = pr.type === 'pourcent' ? ref * (1 - pr.valeur / 100) : ref - pr.valeur
  const prixPromo = Math.floor(brut / 10) * 10
  const remise = Math.round(((ref - prixPromo) / ref) * 1000) / 10
  const ga = gardeA(ref, p)
  const gp = prixPromo >= REGLES.prixMin ? gardeA(prixPromo, p) : null
  const base: ApercuPromotion = { prixReference: ref, prixPromo, remisePourCent: remise, gardeAvant: ga?.garde ?? 0, gardePromo: gp?.garde ?? null, commissionPromo: gp?.commission ?? null, plancherApplique: gp?.plancher ?? false, relue: remise > REGLES.relueAuDela, refus: null }
  const t = maintenant()
  const refus: RefusPromotion | null =
    p.etat !== 'en_vente'
      ? 'etat'
      : p.stock < 1
        ? 'rupture'
        : BOUTIQUE.trustScore < REGLES.scoreMin
          ? 'score'
          : remise < REGLES.remiseMin
            ? 'remise_min'
            : remise >= 90
              ? 'remise_max'
              : prixPromo < REGLES.prixMin
                ? 'prix_min'
                : !gp
                  ? 'garde_negatif'
                  : !(pr.fin > pr.debut) || pr.debut < t - 5 * 60_000
                    ? 'dates'
                    : pr.fin - pr.debut > REGLES.dureeMaxHeures * HEURE
                      ? 'duree'
                      : pr.debut > t + REGLES.programmerJoursMax * JOUR
                        ? 'trop_loin'
                        : etatPromos.lire().promos.some((x) => x.offreId === pr.offreId && active(x) && x.debut < pr.fin && pr.debut < x.fin)
                          ? 'chevauche'
                          : null
  return { ...base, refus }
}

export const demoPromotions: DomainePromotions = {
  regles: async () => (reserve('promotions'), repondre(REGLES)),
  liste: async () => (reserve('promotions'), repondre(etatPromos.lire().promos.map(vuePromo).sort((a, b) => b.debut - a.debut))),
  async offres() {
    reserve('promotions')
    const promos = etatPromos.lire().promos
    const l: OffrePromouvable[] = offres()
      .filter((o) => o.prix !== null && o.etat !== 'brouillon')
      .map((o) => {
        const p = vue(o)
        return {
          offreId: o.id,
          titre: p.titre,
          variante: p.variante,
          dessin: p.photos[0]?.image ?? p.dessin,
          prix: o.prix!,
          prixReference: prixReference(o.id) ?? o.prix!,
          stock: o.stock,
          bloque: o.etat !== 'en_vente' ? 'etat' : o.stock < 1 ? 'rupture' : promos.some((x) => x.offreId === o.id && active(x)) ? 'promotion' : null,
        }
      })
    return repondre(l)
  },
  apercu: async (pr) => (reserve('promotions'), repondre(apercu(pr))),
  async creer(pr) {
    reserve('promotions')
    const a = apercu(pr)
    if (a.refus) return { ok: false, raison: a.refus }
    const id = ajouterPromo({ offreId: pr.offreId, origine: 'vendeur', type: pr.type, valeur: pr.valeur, prixReference: a.prixReference, prixPromo: a.prixPromo, debut: pr.debut, fin: pr.fin, relue: a.relue })
    etatOffres.ecrire((e) => {
      const o = e.offres.find((x) => x.id === pr.offreId)
      if (o) journal(o, 'Vente flash prévue : −{r} %', { r: String(a.remisePourCent).replace('.', ',') })
    })
    return { ok: true, promotion: vuePromo(etatPromos.lire().promos.find((x) => x.id === id)!) }
  },
  async arreter(id) {
    reserve('promotions')
    const x = etatPromos.lire().promos.find((y) => y.id === id)
    if (!x || !active(x)) return { ok: false, raison: 'etat' }
    etatPromos.ecrire((e) => {
      const y = e.promos.find((z) => z.id === id)!
      y.arreteeA = maintenant()
    })
    return { ok: true, promotion: vuePromo(etatPromos.lire().promos.find((y) => y.id === id)!) }
  },
}

// ═════════════════════════════ Questions des clients ═════════════════════════════

const OBJECTIF_H = 24 // répondre en moins de 24 h (valeur proposée, réglable en console)
const REPONSE_MIN = 10
const REPONSE_MAX = 600
const MODELES_MAX = 10
const RELECTURE_SIGNALEMENT_H = 48 // VD-MODERATION

interface QuestionEtat {
  id: string
  offreId: string
  texte: string
  poseeA: number
  reponse: { texte: string; a: number; auteur: string } | null
  signalement: { motif: MotifSignalement; a: number } | null
  utile: number
}
const MODELES_BELIVAY: ModeleReponse[] = [
  { id: 'mb-boite', titre: 'Contenu de la boîte', texte: 'Bonjour, l’article est neuf, dans sa boîte d’origine, avec les accessoires indiqués sur la fiche. Le livreur le contrôle devant moi avant de le sceller.', propre: false },
  { id: 'mb-dispo', titre: 'Disponibilité', texte: 'Bonjour, il est disponible : le stock affiché sur la fiche est le stock réel. Vous pouvez commander dès maintenant.', propre: false },
  { id: 'mb-livraison', titre: 'Livraison', texte: 'Bonjour, la date de livraison et le relais vous sont donnés au moment de payer. Je prépare la commande le jour même.', propre: false },
  { id: 'mb-retour', titre: 'Retour', texte: 'Bonjour, vous avez 7 jours après le retrait pour le retourner, article non utilisé, avec sa boîte et ses accessoires.', propre: false },
]
const etatQuestions = magasin<{ questions: QuestionEtat[]; modeles: ModeleReponse[]; n: number }>('aja_questions', () => ({
  questions: [
    { id: 'q-1', offreId: 'itel-noir', texte: 'Bonjour, le chargeur est-il inclus dans la boîte ?', poseeA: yaounde(2026, 9, 21, 7, 55), reponse: null, signalement: null, utile: 0 },
    { id: 'q-2', offreId: 'itel-noir', texte: 'La batterie tient combien de temps en utilisation normale ?', poseeA: yaounde(2026, 9, 20, 19, 10), reponse: null, signalement: null, utile: 0 },
    { id: 'q-3', offreId: 'iphone', texte: 'Il accepte les cartes SIM d’Orange et de MTN ?', poseeA: yaounde(2026, 9, 18, 10, 2), reponse: { texte: 'Bonjour, oui : il est débloqué, il accepte les cartes Orange et MTN (une SIM physique et une eSIM).', a: yaounde(2026, 9, 18, 11, 40), auteur: 'Franck P.' }, signalement: null, utile: 4 },
    { id: 'q-4', offreId: 'iphone', texte: 'Donnez votre WhatsApp, on s’arrange en dehors de BelivaY pour un meilleur prix.', poseeA: yaounde(2026, 9, 16, 21, 3), reponse: null, signalement: { motif: 'coordonnees', a: yaounde(2026, 9, 17, 8, 15) }, utile: 0 },
    { id: 'q-5', offreId: 'itel-noir', texte: 'Il y a combien de Go de stockage ?', poseeA: yaounde(2026, 9, 12, 14, 30), reponse: { texte: 'Bonjour, 32 Go de stockage, extensible par carte microSD.', a: yaounde(2026, 9, 12, 18, 5), auteur: 'Franck P.' }, signalement: null, utile: 2 },
    { id: 'q-6', offreId: 'pagne-bleu', texte: 'Le tissu est-il du vrai wax hollandais ?', poseeA: yaounde(2026, 9, 10, 9, 45), reponse: { texte: 'Bonjour, oui : wax hollandais, 6 yards, avec l’étiquette d’origine.', a: yaounde(2026, 9, 10, 12, 0), auteur: 'Franck P.' }, signalement: null, utile: 3 },
    { id: 'q-7', offreId: 'chargeur', texte: 'Il charge aussi un iPhone avec le bon câble ?', poseeA: yaounde(2026, 9, 8, 16, 20), reponse: { texte: 'Bonjour, oui : avec un câble USB-C vers Lightning, en charge rapide.', a: yaounde(2026, 9, 8, 17, 2), auteur: 'Aïcha N.' }, signalement: null, utile: 1 },
  ],
  modeles: [],
  n: 5,
}))

function vueQuestion(q: QuestionEtat): QuestionClient {
  const p = produit(q.offreId)
  return {
    id: q.id,
    offreId: q.offreId,
    titre: p?.titre ?? '',
    variante: p?.variante ?? '',
    dessin: p?.photos[0]?.image ?? p?.dessin ?? 'itel',
    texte: q.texte,
    poseeA: q.poseeA,
    etat: q.signalement ? 'signalee' : q.reponse ? 'repondue' : 'a_repondre',
    reponse: q.reponse,
    signalement: q.signalement ? { ...q.signalement, relueAvant: q.signalement.a + RELECTURE_SIGNALEMENT_H * HEURE } : null,
    utile: q.utile,
  }
}
/** Questions sans réponse (notifications : une par question, VD11-R53). */
export function questionsSansReponse(): { id: string; titre: string; poseeA: number }[] {
  return etatQuestions
    .lire()
    .questions.filter((q) => !q.reponse && !q.signalement)
    .map((q) => ({ id: q.id, titre: produit(q.offreId)?.titre ?? '', poseeA: q.poseeA }))
}

export const demoQuestions: DomaineQuestions = {
  async liste() {
    const qs = etatQuestions.lire().questions.map(vueQuestion)
    const ordre = { a_repondre: 0, signalee: 2, repondue: 1 }
    // Sans réponse d'abord, la plus ancienne en tête (elle attend depuis le plus longtemps) ; puis le plus récent.
    qs.sort((a, b) => ordre[a.etat] - ordre[b.etat] || (a.etat === 'a_repondre' ? a.poseeA - b.poseeA : b.poseeA - a.poseeA))
    const t = maintenant()
    const repondues = qs.filter((q) => q.reponse && q.reponse.a > t - TRENTE_J)
    const l: ListeQuestions = {
      questions: qs,
      compteurs: { a_repondre: qs.filter((q) => q.etat === 'a_repondre').length, repondue: qs.filter((q) => q.etat === 'repondue').length, signalee: qs.filter((q) => q.etat === 'signalee').length, toutes: qs.length },
      delaiMoyenMs: repondues.length ? Math.round(repondues.reduce((s, q) => s + (q.reponse!.a - q.poseeA), 0) / repondues.length) : null,
      objectifH: OBJECTIF_H,
      plusAncienne: qs.find((q) => q.etat === 'a_repondre')?.poseeA ?? null,
    }
    return repondre(l)
  },
  filtrer: async (texte) => filtrerMessage(texte),
  async repondre(id, texte) {
    if (!estProprietaire()) return { ok: false, raison: 'reserve' }
    const q = etatQuestions.lire().questions.find((x) => x.id === id)
    if (!q || q.reponse || q.signalement) return { ok: false, raison: 'deja' }
    const t = texte.trim()
    if (t.length < REPONSE_MIN) return { ok: false, raison: 'court' }
    if (t.length > REPONSE_MAX) return { ok: false, raison: 'long' }
    if (filtrerMessage(t).filtre) return { ok: false, raison: 'coordonnees' }
    etatQuestions.ecrire((e) => {
      e.questions.find((x) => x.id === id)!.reponse = { texte: t, a: maintenant(), auteur: auteur() }
    })
    return { ok: true, question: vueQuestion(etatQuestions.lire().questions.find((x) => x.id === id)!) }
  },
  async signaler(id, motif) {
    if (!['coordonnees', 'insulte', 'hors_sujet', 'concurrence', 'autre'].includes(motif)) return { ok: false, raison: 'motif' }
    const q = etatQuestions.lire().questions.find((x) => x.id === id)
    if (!q || q.signalement) return { ok: false, raison: 'deja' }
    etatQuestions.ecrire((e) => {
      e.questions.find((x) => x.id === id)!.signalement = { motif, a: maintenant() }
    })
    return { ok: true, question: vueQuestion(etatQuestions.lire().questions.find((x) => x.id === id)!) }
  },
  modeles: async () => repondre([...etatQuestions.lire().modeles, ...MODELES_BELIVAY]),
  async enregistrerModele(titre, texte) {
    if (!estProprietaire()) return { ok: false, raison: 'reserve' }
    const ti = titre.trim()
    const tx = texte.trim()
    if (ti.length < 2 || ti.length > 40) return { ok: false, raison: 'titre' }
    if (tx.length < REPONSE_MIN || tx.length > REPONSE_MAX) return { ok: false, raison: 'court' }
    if (filtrerMessage(tx).filtre) return { ok: false, raison: 'coordonnees' }
    if (etatQuestions.lire().modeles.length >= MODELES_MAX) return { ok: false, raison: 'max' }
    let m: ModeleReponse | null = null
    etatQuestions.ecrire((e) => {
      e.n++
      m = { id: 'mp-' + e.n, titre: ti, texte: tx, propre: true }
      e.modeles.unshift(m)
    })
    return { ok: true, modele: m! }
  },
  async supprimerModele(id) {
    etatQuestions.ecrire((e) => {
      e.modeles = e.modeles.filter((m) => m.id !== id)
    })
  },
}

// ═════════════════════════════ Livraison et colis ═════════════════════════════

const PC = PARAMETRES.console
// Créneaux de ramassage des tournées de la zone (proposés par BelivaY : le livreur passe à l'un d'eux).
const CRENEAUX = [
  { id: 'lv-10', jours: 'lun–ven', de: '10:00', a: '12:00' },
  { id: 'lv-14', jours: 'lun–ven', de: '14:00', a: '16:00' },
  { id: 'sa-11', jours: 'sam', de: '11:00', a: '13:00' },
]
// Relais BelivaY de la zone (données de démonstration ; GET /relays/near côté serveur).
const RELAIS = [
  { id: 'r-mvog-ada', nom: 'Relais Mvog-Ada', quartier: 'Mvog-Ada', position: { lat: 3.8559, lon: 11.5226 }, horaires: 'lun–sam · 08 h – 20 h' },
  { id: 'r-essos', nom: 'Relais Essos', quartier: 'Essos', position: { lat: 3.8695, lon: 11.5355 }, horaires: 'lun–sam · 08 h – 19 h' },
  { id: 'r-ngoa', nom: 'Relais Ngoa-Ekellé', quartier: 'Ngoa-Ekellé', position: { lat: 3.8612, lon: 11.4995 }, horaires: 'lun–dim · 07 h – 21 h' },
  { id: 'r-omnisport', nom: 'Relais Omnisport', quartier: 'Omnisport', position: { lat: 3.8825, lon: 11.5408 }, horaires: 'lun–sam · 08 h – 20 h' },
  { id: 'r-melen', nom: 'Relais Melen', quartier: 'Melen', position: { lat: 3.8676, lon: 11.4917 }, horaires: 'lun–sam · 08 h – 19 h' },
  { id: 'r-biyem', nom: 'Relais Biyem-Assi', quartier: 'Biyem-Assi', position: { lat: 3.8355, lon: 11.4847 }, horaires: 'lun–dim · 08 h – 20 h' },
]
const RELAIS_MAX = 3

function metres(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const r = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * r * Math.asin(Math.sqrt(h)))
}

/** Classe du colis (VD08-R22, VD-COLIS) : poids facturé = max(poids ; volume ÷ diviseur) et plus grande dimension. */
export function classeDe(poids: number, dims: [number, number, number]): ClasseColis {
  const facture = Math.max(poids, (dims[0] * dims[1] * dims[2]) / PC.colis.diviseur)
  const grand = Math.max(...dims)
  return (PC.colis.classes.find((c) => facture <= c.kg && grand <= c.cm)?.classe ?? 'XXL') as ClasseColis
}

function produitLivraison(p: Produit): ProduitLivraison {
  const o = offres().find((x) => x.id === p.id)!
  return {
    offreId: p.id,
    titre: p.titre,
    variante: p.variante,
    dessin: p.photos[0]?.image ?? p.dessin,
    colis: p.colis,
    colisFiche: ficheDe(o.ficheId)?.colis ?? etatLivraison.lire().defauts.colis,
    poidsKg: p.poidsKg,
    dimensionsCm: p.dimensionsCm,
    delaiPreparationH: p.delaiPreparationH,
    paiementAuRetrait: p.paiementAuRetrait,
  }
}

function reglages(): ReglagesLivraison {
  const e = etatLivraison.lire()
  return {
    defauts: e.defauts,
    delaisH: PC.preparation.choixH,
    classes: PC.colis.classes.map((c) => ({ classe: c.classe as ClasseColis, kg: c.kg, cm: c.cm })),
    mesures: { seuilKg: PC.colis.seuilKg, seuilCm: PC.colis.seuilCm, diviseur: PC.colis.diviseur },
    creneaux: CRENEAUX.map((c) => ({ ...c, prefere: e.creneaux.includes(c.id) })),
    relais: RELAIS.map((r) => ({ ...r, distanceM: metres(BOUTIQUE.position, r.position), prefere: e.relais.includes(r.id) })).sort((a, b) => Number(b.prefere) - Number(a.prefere) || a.distanceM - b.distanceM),
    relaisMax: RELAIS_MAX,
    boutique: { position: BOUTIQUE.position, quartier: BOUTIQUE.quartier },
    produits: offres()
      .filter((o) => o.etat !== 'brouillon')
      .map((o) => produitLivraison(vue(o))),
    peutRegler: estProprietaire(),
  }
}

export const demoLivraison: DomaineLivraison = {
  reglages: async () => repondre(reglages()),
  async regler(d) {
    if (!estProprietaire()) return { ok: false, raison: 'reserve' }
    if (d.delaiH !== undefined && !PC.preparation.choixH.includes(d.delaiH)) return { ok: false, raison: 'delai' }
    etatLivraison.ecrire((e) => {
      e.defauts = { ...e.defauts, ...d }
    })
    return { ok: true, reglages: reglages() }
  },
  async reglerProduit(offreId, c) {
    if (!estProprietaire()) return { ok: false, raison: 'reserve' }
    const o0 = offres().find((x) => x.id === offreId)
    if (!o0) return { ok: false, raison: 'introuvable' }
    if (c.delaiPreparationH !== undefined && !PC.preparation.choixH.includes(c.delaiPreparationH)) return { ok: false, raison: 'delai' }
    // Au-delà de S et M, poids et dimensions sont obligatoires : la classe se calcule, elle ne se choisit pas.
    if (c.poidsKg !== undefined || c.dimensionsCm !== undefined) {
      const p = c.poidsKg
      const d = c.dimensionsCm
      if (p == null || d == null || !(p > 0 && p < 1000) || d.some((x) => !(x > 0 && x < 1000))) return { ok: false, raison: 'mesures' }
    }
    if (c.colis !== undefined && !['S', 'M'].includes(c.colis)) return { ok: false, raison: 'mesures' }
    if (c.paiementAuRetrait !== undefined) await demoProduits.regler(offreId, { paiementAuRetrait: c.paiementAuRetrait })
    etatOffres.ecrire((e) => {
      const o = e.offres.find((x) => x.id === offreId)!
      if (c.delaiPreparationH !== undefined && c.delaiPreparationH !== o.delaiPreparationH) {
        journal(o, 'Délai de préparation : {de} h → {a} h', { de: o.delaiPreparationH, a: c.delaiPreparationH })
        o.delaiPreparationH = c.delaiPreparationH
      }
      if (c.colis !== undefined && (c.colis !== o.colis || o.poidsKg !== null)) {
        journal(o, 'Colis : {de} → {a}', { de: o.colis, a: c.colis })
        o.colis = c.colis
        o.poidsKg = null
        o.dimensionsCm = null
      }
      if (c.poidsKg != null && c.dimensionsCm != null) {
        const classe = classeDe(c.poidsKg, c.dimensionsCm)
        if (classe !== o.colis) journal(o, 'Colis : {de} → {a}', { de: o.colis, a: classe })
        o.poidsKg = c.poidsKg
        o.dimensionsCm = c.dimensionsCm
        o.colis = classe
      }
      o.majA = maintenant()
    })
    return { ok: true, produit: produitLivraison(produit(offreId)!) }
  },
  async creneau(id, prefere) {
    if (!estProprietaire()) return { ok: false, raison: 'reserve' }
    const e = etatLivraison.lire()
    if (!prefere && e.creneaux.length <= 1 && e.creneaux.includes(id)) return { ok: false, raison: 'dernier' }
    etatLivraison.ecrire((x) => {
      x.creneaux = prefere ? [...new Set([...x.creneaux, id])] : x.creneaux.filter((c) => c !== id)
    })
    return { ok: true, reglages: reglages() }
  },
  async relais(id, prefere) {
    if (!estProprietaire()) return { ok: false, raison: 'reserve' }
    const e = etatLivraison.lire()
    if (prefere && !e.relais.includes(id) && e.relais.length >= RELAIS_MAX) return { ok: false, raison: 'max' }
    etatLivraison.ecrire((x) => {
      x.relais = prefere ? [...new Set([...x.relais, id])] : x.relais.filter((r) => r !== id)
    })
    return { ok: true, reglages: reglages() }
  },
}

export const demoAJA: SourceAJA = { stock: demoStock, promotions: demoPromotions, questions: demoQuestions, livraison: demoLivraison }
