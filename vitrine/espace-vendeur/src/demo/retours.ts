// DONNÉES DE DÉMONSTRATION — domaine « retours » : BLV-00004 (ITEL AC52 noir, défaut caché signalé 30 h après le
// retrait), en route vers la boutique le mardi 22 entre 14 h et 16 h ; inspection sous 48 h après la remise réelle
// (Q-72), remplacement sous 72 h ouvrées (dimanche non compté) ou remboursement.
// - Montant gelé = montant gardé figé au paiement (gardeFige, src/calculs/commission.ts) ; trajet retour et délais
//   lus dans le registre (REGLES, demo/litiges.ts).
// - Retards (tâches planifiées du serveur, H5, H6) : inspection non faite à l'échéance ⇒ remboursement
//   automatique (VD07-R25) ; remplacement non prêt à l'échéance ⇒ remboursement automatique (VD07-R31).
// - Non conforme : preuves en médiation, BelivaY décide au plus tard 24 h après (DP-57 L-4), jamais seul.
import type { BrouillonInspection, CompteursRetours, Controles, DomaineRetours, EvenementRetour, Inspection, Retour, Suite } from '../donnees/domaines/retours'
import type { PieceDossier } from '../donnees/domaines/litiges'
import type { Instant } from '../donnees/communs'
import { HEURE, debutDuJour, yaounde } from '../calculs/temps'
import { maintenant } from './horloge'
import { ARTICLES, COMMANDES, MEMBRES, OFFRES, type CommandeEssai } from './jeu-essai'
import { cloreRetourClient, colisClientDe, creerSousCommande, etatCommandes, gardeFige, journaliser } from './commandes'
import { codeDemo } from './pont'
import { demoProduits } from './produits'
import { estProprietaire, exigerDroit, roleCourant } from './session'
import { magasin, repondre } from './stockage'
import { REGLES, echeanceOuvree } from './litiges'
import { finInspection } from '../calculs/litiges'
import { PARAMETRES } from '../calculs/registre'

// Faits du jeu d'essai propres au retour (motif du client traduit en catégorie vendeur, DP-56 Q-29).
const FAITS: Record<string, { categorie: Retour['categorie']; phrase: string; signaleApresH: number }> = {
  'BLV-00004': { categorie: 'defaut_cache', phrase: 'L’écran reste noir après une journée', signaleApresH: 30 },
  'BLV-00020': { categorie: 'abime', phrase: 'Le câble est arraché à la sortie de la boîte', signaleApresH: 3 },
  'BLV-00021': { categorie: 'non_conforme', phrase: 'Je voulais la version 64 Go', signaleApresH: 20 },
  'BLV-00022': { categorie: 'contrefacon', phrase: 'Le logo ne ressemble pas à l’original', signaleApresH: 6 },
  'BLV-00023': { categorie: 'non_conforme', phrase: 'La couleur ne correspond pas à la photo', signaleApresH: 26 },
}
// Démonstration : retours déjà inspectés (conforme : à décider ; non conforme : médiation) ou clos (remboursé).
const piece = (ref: string, a: Instant): PieceDossier => ({ id: ref + '-insp', photo: 'box', quoi: 'vendeur', a, ajouteePar: 'Franck Penga', retirable: false })
const INSPECTIONS_DEMO: Record<string, Inspection> = {
  'BLV-00021': { verdict: 'conforme', controles: { scelle: true, serie: true }, photos: [piece('BLV-00021', yaounde(2026, 10, 10, 16, 40))], a: yaounde(2026, 10, 10, 16, 45), par: 'Aïcha N.' },
  'BLV-00022': { verdict: 'non_conforme', controles: { scelle: false, serie: false }, photos: [piece('BLV-00022', yaounde(2026, 10, 13, 8, 55))], a: yaounde(2026, 10, 13, 9, 0), par: 'Franck Penga' },
  'BLV-00023': { verdict: 'conforme', controles: { scelle: true, serie: true }, photos: [piece('BLV-00023', yaounde(2026, 10, 6, 16, 50))], a: yaounde(2026, 10, 6, 17, 0), par: 'Franck Penga' },
}
const MOTS: Record<Retour['categorie'], string> = { non_conforme: 'non conforme', abime: 'abîmé', contrefacon: 'contrefaçon', defaut_cache: 'défaut caché' }

interface EtatRetours {
  recus: Record<string, Instant>
  brouillons: Record<string, BrouillonInspection>
  inspections: Record<string, Inspection>
  choix: Record<string, { choix: 'remplacer' | 'rembourser'; a: Instant; expedierAvant: Instant | null; pretA: Instant | null }>
  evenements: Record<string, EvenementRetour[]>
  compteur: number
}
const etat = magasin<EtatRetours>('retours.v2', () => ({ recus: {}, brouillons: {}, inspections: { ...INSPECTIONS_DEMO }, choix: { 'BLV-00023': { choix: 'rembourser', a: yaounde(2026, 10, 7, 9, 10), expedierAvant: null, pretA: null } }, evenements: {}, compteur: 0 }))

const membreCourant = () => {
  const m = MEMBRES.find((x) => x.role === roleCourant())!
  return `${m.prenom} ${m.nom}`
}
const VIDE: Controles = { scelle: false, serie: false }

/** Fin du créneau d'arrivée : remise par le livreur (scan) si le vendeur ne l'a pas confirmée plus tôt. */
const finDuCreneau = (c: CommandeEssai) => debutDuJour(c.retour!.arrivee.jour) + Number(c.retour!.arrivee.creneau[1].slice(0, 2)) * HEURE

function vue(c: CommandeEssai, stock: number): Retour {
  const e = etat.lire()
  const now = maintenant()
  const f = FAITS[c.ref] ?? { categorie: 'non_conforme' as const, phrase: c.retour!.motif, signaleApresH: 0 }
  const a = ARTICLES[c.article]
  const recuA = e.recus[c.ref] ?? (now >= finDuCreneau(c) ? finDuCreneau(c) : null)
  const inspecterAvant = finInspection(recuA ?? finDuCreneau(c), PARAMETRES.litiges)
  const insp = e.inspections[c.ref] ?? null
  const ch = e.choix[c.ref] ?? null
  let suite: Suite
  if (recuA === null) suite = { type: 'en_route' }
  else if (!insp) suite = now > inspecterAvant ? { type: 'rembourse', le: inspecterAvant, auto: true } : { type: 'a_inspecter' }
  else if (insp.verdict === 'non_conforme') suite = { type: 'mediation', decisionAvant: insp.a + REGLES.decisionH * HEURE }
  else if (!ch) suite = { type: 'a_choisir' }
  else if (ch.choix === 'rembourser') suite = { type: 'rembourse', le: ch.a, auto: false }
  else if (!ch.pretA && now > ch.expedierAvant!) suite = { type: 'rembourse', le: ch.expedierAvant!, auto: true }
  else suite = { type: 'remplacement', expedierAvant: ch.expedierAvant!, pretA: ch.pretA }
  const etatR: Retour['etat'] = suite.type === 'en_route' ? 'en_route' : suite.type === 'rembourse' || (suite.type === 'remplacement' && suite.pretA) ? 'clos' : 'a_decider'
  const retireA = c.retraitA!
  const signaleA = retireA + f.signaleApresH * HEURE
  const journal: EvenementRetour[] = [
    { a: retireA, code: 'retire' as const, auteur: null, detail: null },
    { a: signaleA, code: 'signale' as const, auteur: null, detail: MOTS[f.categorie] },
    ...(recuA !== null ? [{ a: recuA, code: 'recu' as const, auteur: null, detail: null }] : []),
    ...(e.evenements[c.ref] ?? []),
    ...(suite.type === 'rembourse' && suite.auto ? [{ a: suite.le, code: 'rembourse_auto' as const, auteur: null, detail: null }] : []),
  ].sort((x, y) => x.a - y.a)
  const proprio = estProprietaire()
  const b = e.brouillons[c.ref]
  return {
    ref: c.ref,
    etat: etatR,
    suite,
    categorie: f.categorie,
    motif: MOTS[f.categorie],
    phraseClient: f.phrase,
    article: { offreId: a.offreId, titre: a.titre, variante: a.variante, etat: a.etat, dessin: a.dessin, categorie: a.categorie },
    volumineux: c.colis === 'XL' || c.colis === 'XXL',
    gele: proprio && etatR !== 'clos' ? gardeFige(c) : null,
    arrivee: c.retour!.arrivee,
    recuA,
    inspecterAvant,
    retireA,
    signaleA,
    signalement: { heures: f.signaleApresH, limiteH: REGLES.defautH, recevable: f.categorie !== 'defaut_cache' || f.signaleApresH <= REGLES.defautH },
    inspection: insp,
    brouillon: insp ? null : (b ?? { controles: VIDE, photos: [], verdict: null }),
    couts: proprio ? { trajet: REGLES.trajet, garde: gardeFige(c), livraisonRetour: null } : null, // livraison : serveur (GEN-01)
    remplacement: { offreId: a.offreId, titre: a.titre, variante: a.variante, dessin: a.dessin, stock },
    journal,
    // Retour d'une commande du client (pont) : le code que le vendeur donne au livreur à la remise (recalculé comme le serveur).
    codeReception: recuA === null && colisClientDe(c.ref) ? codeDemo(colisClientDe(c.ref)!.colis, 'retour') : null,
  }
}

const commandesEnRetour = () => {
  const cmds = etatCommandes.lire()
  return COMMANDES.filter((c) => c.retour && cmds[c.ref]?.etape === 'retour')
}
const stockInitial = (offreId: string) => OFFRES.find((o) => o.id === offreId)?.stock ?? 0
async function stockDe(offreId: string): Promise<number> {
  return (await demoProduits.detail(offreId))?.stock ?? 0
}
async function toutes(): Promise<Retour[]> {
  const r: Retour[] = []
  for (const c of commandesEnRetour()) r.push(vue(c, await stockDe(ARTICLES[c.article].offreId)))
  return r
}
async function une(ref: string): Promise<Retour | null> {
  const c = commandesEnRetour().find((x) => x.ref === ref)
  return c ? vue(c, await stockDe(ARTICLES[c.article].offreId)) : null
}

/** Retour d'une commande du client remis à la boutique par le livreur (pont : parcel.returned). */
export function marquerRecuPont(ref: string, a: Instant) {
  if (etat.lire().recus[ref]) return
  etat.ecrire((e) => void (e.recus[ref] = a))
}

/** Remplacement prêt (carte du retour, ou « C'est prêt » de la sous-commande) : noté une fois. */
export function marquerRemplacementPret(ref: string): boolean {
  const ch = etat.lire().choix[ref]
  if (!ch || ch.choix !== 'remplacer') return false
  if (ch.pretA) return true
  const par = membreCourant()
  etat.ecrire((e) => {
    e.choix[ref].pretA = maintenant()
    noter(e, ref, { code: 'pret', auteur: par, detail: null })
  })
  journaliser(ref, roleCourant(), 'Remplacement prêt pour le livreur')
  return true
}

/** Tous les retours, clos compris (notifications : arrivée, remboursement automatique), lus sans attendre. */
export const tousLesRetours = () => commandesEnRetour().map((c) => vue(c, stockInitial(ARTICLES[c.article].offreId)))
/** Retours en cours (accueil) : lus sans attendre, le stock n'y sert pas. */
export const retoursOuverts = () => commandesEnRetour().map((c) => vue(c, stockInitial(ARTICLES[c.article].offreId))).filter((r) => r.etat !== 'clos')

function noter(e: EtatRetours, ref: string, ev: Omit<EvenementRetour, 'a'>) {
  ;(e.evenements[ref] ??= []).push({ a: maintenant(), ...ev })
}

export const demoRetours: DomaineRetours = {
  liste: async (x) => repondre((await toutes()).filter((r) => !x || r.etat === x)),
  async compteurs() {
    const t = await toutes()
    const c: CompteursRetours = { a_decider: 0, en_route: 0, clos: 0 }
    for (const r of t) c[r.etat]++
    return repondre(c)
  },
  detail: async (ref) => repondre(await une(ref)),
  async recevoir(ref) {
    exigerDroit('retours.inspecter', 'retours')
    const r = await une(ref)
    if (!r) return { ok: false, raison: 'introuvable' }
    if (r.recuA !== null) return { ok: false, raison: 'deja_recu' }
    const a = maintenant()
    etat.ecrire((e) => {
      e.recus[ref] = a
    })
    journaliser(ref, roleCourant(), 'Retour reçu à la boutique')
    return { ok: true, inspecterAvant: a + REGLES.inspectionH * HEURE }
  },
  async ajouterPhoto(ref, photo) {
    exigerDroit('retours.inspecter', 'retours')
    const r = await une(ref)
    if (!r) return { ok: false, raison: 'introuvable' }
    if (r.inspection) return { ok: false, raison: 'deja_inspecte' }
    let piece: PieceDossier | null = null
    const par = membreCourant()
    etat.ecrire((e) => {
      e.compteur++
      piece = { id: `${ref}-i${e.compteur}`, photo, quoi: 'vendeur', a: maintenant(), ajouteePar: par, retirable: true }
      const b = (e.brouillons[ref] ??= { controles: { ...VIDE }, photos: [], verdict: null })
      b.photos.push(piece)
    })
    return { ok: true, piece: piece! }
  },
  async retirerPhoto(ref, id) {
    etat.ecrire((e) => {
      const b = e.brouillons[ref]
      if (b) b.photos = b.photos.filter((p) => p.id !== id)
    })
  },
  async garderBrouillon(ref, b) {
    etat.ecrire((e) => {
      const x = (e.brouillons[ref] ??= { controles: { ...VIDE }, photos: [], verdict: null })
      x.controles = { ...b.controles }
      x.verdict = b.verdict
    })
  },
  async inspecter(ref, verdict, controles) {
    exigerDroit('retours.inspecter', 'retours')
    const r = await une(ref)
    if (!r) return { ok: false, raison: 'introuvable' }
    if (r.inspection) return { ok: false, raison: 'deja_inspecte' }
    if (r.recuA === null) return { ok: false, raison: 'pas_recu' }
    if (r.suite.type === 'rembourse') return { ok: false, raison: 'delai_depasse' }
    if (!controles.scelle || !controles.serie) return { ok: false, raison: 'controles' }
    const photos = r.brouillon?.photos ?? []
    if (photos.length < 2) return { ok: false, raison: 'photos' }
    const par = membreCourant()
    etat.ecrire((e) => {
      e.inspections[ref] = { verdict, controles: { ...controles }, photos: photos.map((p) => ({ ...p, retirable: false })), a: maintenant(), par }
      delete e.brouillons[ref]
      noter(e, ref, { code: 'inspecte', auteur: par, detail: verdict })
      if (verdict === 'non_conforme') noter(e, ref, { code: 'mediation', auteur: null, detail: null })
    })
    journaliser(ref, roleCourant(), 'Retour inspecté : ' + (verdict === 'conforme' ? 'conforme au motif' : 'non conforme, preuves en médiation'))
    if (verdict === 'non_conforme') cloreRetourClient(ref, 'mediation')
    return { ok: true }
  },
  async proposer(ref, choix) {
    const r = await une(ref)
    if (!r) return { ok: false, raison: 'introuvable' }
    if (!estProprietaire()) return { ok: false, raison: 'reserve_proprietaire' }
    if (r.suite.type !== 'a_choisir') return { ok: false, raison: r.inspection?.verdict === 'conforme' ? 'deja_choisi' : 'pas_conforme' }
    if (choix === 'remplacer' && r.remplacement.stock < 1) return { ok: false, raison: 'stock' }
    const a = maintenant()
    // Le choix « Être remplacé » du client vaut accord (DP-56 Q-30) : l'échéance part de maintenant.
    const expedierAvant = choix === 'remplacer' ? echeanceOuvree(a) : null
    if (choix === 'remplacer') await demoProduits.changerStock(r.remplacement.offreId, r.remplacement.stock - 1)
    const par = membreCourant()
    etat.ecrire((e) => {
      e.choix[ref] = { choix, a, expedierAvant, pretA: null }
      noter(e, ref, { code: choix === 'remplacer' ? 'remplacement' : 'rembourse', auteur: par, detail: null })
    })
    journaliser(ref, roleCourant(), choix === 'remplacer' ? 'Remplacement proposé au client' : 'Client remboursé : l’article défectueux reste à la boutique')
    cloreRetourClient(ref, choix === 'remplacer' ? 'remplace' : 'rembourse')
    // Le remplacement devient une commande à préparer (REFCL-R080), même parcours que toute commande.
    if (choix === 'remplacer') creerSousCommande(ref, expedierAvant!)
    return choix === 'remplacer' ? { ok: true, expedierAvant: expedierAvant! } : { ok: true }
  },
  async remplacementPret(ref) {
    if (!marquerRemplacementPret(ref)) return { ok: false, raison: 'introuvable' }
    // La sous-commande de remplacement passe chez le livreur, comme après « C'est prêt ».
    const sous = ref + '-R'
    if (etatCommandes.lire()[sous]?.etape === 'a_preparer')
      etatCommandes.ecrire((x) => {
        x[sous].etape = 'chez_le_livreur'
        x[sous].preteA = maintenant()
      })
    return { ok: true }
  },
}
