// DONNÉES DE DÉMONSTRATION — domaine « commandes » : les commandes BLV-00001 à 00009 du jeu d'essai et leur état
// (préparée, remise, rupture, délai…). Le montant gardé de chaque commande est CALCULÉ (src/calculs/commission.ts)
// au palier et à l'offre de découverte du jour de son paiement, puis figé (D5) : jamais écrit.
// Échéances en heures d'ouverture de la boutique (calendrier du domaine « preparation ») ; journal en ajout seul,
// rempli de l'histoire des commandes du jeu d'essai (paiement, entrée dans la file, retrait, litige, retour, versement)
// puis de chaque geste, signé par son auteur (GEN-09, JRN-01).
import type { Commande, CompteursDetail, DomaineCommandes, EntreeJournal, FiltreCommandes, MotifAnnulation, StatutCommande, VueCommandes } from '../donnees/domaines/commandes'
import { ajouterOuvertes, ouvertureSuivante, passageSuivant, type CalendrierBoutique } from '../donnees/domaines/preparation'
import type { Instant, Role } from '../donnees/communs'
import { decouverteActive, type ResultatCommission } from '../calculs/commission'
import { Dec } from '../calculs/argent'
import { commissionSousCommande, reglage } from '@client/calculs'
import type { Palier } from '../calculs/registre'
import { PARAMETRES } from '../calculs/registre'
import { HEURE, JOUR, debutDuJour, jourDe, yaounde } from '../calculs/temps'
import { dateDeLiberation, progressionPourCent, vendrediDeVersement } from '../calculs/versements'
import { etatDeLArgent, type EtatArgent as EtatDeLArgent } from '../calculs/argent-vendeur'
import { maintenant } from './horloge'
import { ARTICLES, BOUTIQUE, COMMANDES, LIVREUR, MEMBRES, OFFRES, type CommandeEssai, type EtapeCommande } from './jeu-essai'
import { magasin, repondre } from './stockage'
import { avecDroit, roleCourant } from './session'
import { etatBoutique } from './boutique'
import { litigesOuverts } from './litiges'
import { marquerRecuPont, tousLesRetours } from './retours'
import { ACTEURS_DEMO, RELAIS_DEMO, evenementsPour, publier, type Evenement } from './pont'
import { ajouterNotification } from './notifications'
import type { TypeNotification } from '../donnees/domaines/notifications'
import { avisConsole } from './pont-console'

const ETATS_COMMANDE: Record<EtatDeLArgent, 'en_cours' | 'se_libere' | 'gele' | 'a_verser' | 'verse'> = { 'En cours': 'en_cours', 'Se libère': 'se_libere', Gelé: 'gele', 'À verser': 'a_verser', Versé: 'verse' }

interface EtatCommande {
  etape: EtapeCommande | 'chez_le_livreur' | 'annulee'
  echeance: Instant | null
  prolongee: boolean
  preteA: Instant | null
  remiseA?: Instant | null // posé par la remise (VD-06) ; à défaut, lu dans le journal
  annulation?: { motif: MotifAnnulation; a: Instant } | null
  journal: EntreeJournal[]
}

// Référence de chaque variante (imprimée sur la boîte) et ce qui est livré avec l'article (fiche BelivaY).
const REFERENCES: Record<string, string> = { 'itel-noir': 'ITL-AC52-NR', 'itel-bleu': 'ITL-AC52-BL', iphone: 'APL-IP15PM-256', chargeur: 'ORM-CH18-BL', coque: 'ITL-AC52-CQ-NR', ecouteurs: 'ORM-EC35-NR', 'pagne-bleu': 'VLS-WAX6-BL', 'pagne-rouge': 'VLS-WAX6-RG', 'itel-64': 'ITL-AC52-64-NR', 'iphone-128': 'APL-IP15PM-128' }
const ACCESSOIRES: Record<string, string[]> = { 'itel-noir': ['chargeur', 'câble', 'boîte d’origine'], 'itel-bleu': ['chargeur', 'câble', 'boîte d’origine'], iphone: ['câble', 'boîte d’origine'], chargeur: ['câble USB-C', 'boîte d’origine'], 'pagne-bleu': ['étiquette d’origine'], 'pagne-rouge': ['étiquette d’origine'] }
export const referenceDe = (offreId: string) => REFERENCES[offreId] ?? offreId.toUpperCase()
export const accessoiresDe = (offreId: string) => ACCESSOIRES[offreId] ?? ['boîte d’origine']
const MOYENS: Record<CommandeEssai['moyen'], string> = { momo: 'Mobile Money', carte: 'carte bancaire', apple: 'Apple Pay', google: 'Google Pay', wallet: 'Portefeuille BelivaY', usd: 'carte en dollars', eur: 'carte en euros', comptoir: 'au comptoir du relais' }
const SYSTEME = 'Système BelivaY'
const INSPECTION_HEURES = 48 // inspection d'un retour à réception (VD-07)

const JOURS_PASSAGE: Record<string, number[]> = { 'lun–ven': [0, 1, 2, 3, 4], sam: [5], dim: [6] }

/** Calendrier de préparation : horaires de la boutique et passages du livreur. « Fermer aujourd'hui » n'arrête pas
 *  la préparation des commandes déjà reçues (« elles restent à préparer », Q-39) : il ne compte pas ici. */
export function calendrier(): CalendrierBoutique {
  const b = etatBoutique()
  return {
    horaires: b.horaires,
    fermeeLe: b.fermeeLe,
    fermetures: b.fermetures,
    passages: BOUTIQUE.passageLivreur.map((p) => ({ jours: JOURS_PASSAGE[p.jours] ?? [0, 1, 2, 3, 4], de: p.de, a: p.a })),
  }
}

function histoire(c: CommandeEssai): EntreeJournal[] {
  const a = ARTICLES[c.article]
  const cal = calendrier()
  const j: EntreeJournal[] = [
    c.payableAuRetrait
      ? { a: c.payeeA, auteur: SYSTEME, role: 'systeme', action: 'Commande validée · payable au retrait', detail: 'Rien n’est encaissé avant le retrait' }
      : { a: c.payeeA, auteur: SYSTEME, role: 'systeme', action: 'Commande payée par le client', detail: 'Encaissée par BelivaY · ' + MOYENS[c.moyen] },
    { a: c.payeeA, auteur: SYSTEME, role: 'systeme', action: 'Entrée dans la file à préparer', detail: 'Système BelivaY · prête avant {h}', detailA: c.echeance ?? ajouterOuvertes(ouvertureSuivante(c.payeeA, cal), 4 * HEURE, cal) },
  ]
  // Faits du jeu d'essai (prototype, Journal de BLV-00008) : bon ouvert par le propriétaire, stock mis à jour par l'employée.
  if (c.ref === 'BLV-00008') {
    j.push({ a: yaounde(2026, 10, 13, 9, 12), auteur: 'Franck Penga', role: 'proprietaire', action: 'Bon de préparation ouvert' })
    j.push({ a: yaounde(2026, 10, 13, 9, 20), auteur: 'Aïcha N.', role: 'preparation', action: 'Stock de l’{p} mis à jour', detail: `${a.titre} ${a.variante}`, avant: '4', apres: '3' })
  }
  const preparateur = `${MEMBRES[1].prenom} ${MEMBRES[1].nom}`
  if (c.preteA) j.push({ a: c.preteA, auteur: preparateur, role: 'preparation', action: '« C’est prêt »' })
  if (c.remiseA) j.push({ a: c.remiseA, auteur: preparateur, role: 'preparation', action: 'Remis au livreur', detail: `${LIVREUR.nom} · ${LIVREUR.societe}` })
  if (c.annulation) j.push({ a: c.annulation.a, auteur: c.annulation.motif === 'rupture' ? `${MEMBRES[0].prenom} ${MEMBRES[0].nom}` : SYSTEME, role: c.annulation.motif === 'rupture' ? 'proprietaire' : 'systeme', action: c.annulation.motif === 'rupture' ? 'Rupture signalée · commande annulée' : 'Annulée par le client avant le ramassage', detail: 'Client remboursé en entier · rien ne vous est retenu' })
  if (c.retraitA) j.push({ a: c.retraitA, auteur: SYSTEME, role: 'systeme', action: 'Retirée par le client' })
  if (c.litige) j.push({ a: c.litige.ouvertA, auteur: SYSTEME, role: 'systeme', action: 'Litige ouvert par le client', detail: c.litige.motif })
  if (c.retour && c.retraitA) j.push({ a: c.retraitA + 30 * HEURE, auteur: SYSTEME, role: 'systeme', action: 'Retour signalé par le client', detail: c.retour.motif })
  if (c.fermetureA && c.retraitA) {
    const confirmee = c.fermetureA < c.retraitA + PARAMETRES.versements.fenetreRetourJours * JOUR
    j.push({ a: c.fermetureA, auteur: SYSTEME, role: 'systeme', action: confirmee ? 'Confirmée par le client' : 'Fenêtre de retour close' })
    const lib = dateDeLiberation(c.fermetureA, BOUTIQUE.palier, c.moyen === 'carte', PARAMETRES.versements)
    if (lib <= maintenant() || c.versement) j.push({ a: lib, auteur: SYSTEME, role: 'systeme', action: 'Argent libéré' })
    if (c.versement) j.push({ a: debutDuJour(vendrediDeVersement(lib, PARAMETRES.versements)) + PARAMETRES.versements.heureVersement * HEURE - HEURE, auteur: SYSTEME, role: 'systeme', action: 'Versée', detail: 'Versement ' + c.versement })
  }
  return j.sort((x, y) => x.a - y.a)
}

const initial = () =>
  Object.fromEntries(
    COMMANDES.map((c) => [
      c.ref,
      { etape: c.etape, echeance: c.echeance ?? null, prolongee: false, preteA: c.preteA ?? null, remiseA: c.remiseA ?? null, annulation: c.annulation ?? null, journal: histoire(c) } satisfies EtatCommande as EtatCommande,
    ]),
  ) as Record<string, EtatCommande>

export const etatCommandes = magasin('commandes', initial)

// ── Sous-commandes de remplacement (REFCL-R080, VD07-R31) ──────────────────────────────────────────────────────
// Un remplacement proposé au client crée une commande « à préparer » (même parcours : C'est prêt, remise au livreur),
// sans nouvel argent (la vente d'origine reste la seule). Gardées dans le magasin des commandes, rejointes à la liste.
const SOUS = magasin('commandes_remplacement', () => ({ liste: [] as { ref: string; origine: string; a: number; echeance: number }[] }))
function joindreSousCommandes() {
  for (const s of SOUS.lire().liste) {
    if (COMMANDES.some((c) => c.ref === s.ref)) continue
    const o = COMMANDES.find((c) => c.ref === s.origine)
    if (o && etatCommandes.lire()[s.ref]) COMMANDES.push({ ref: s.ref, article: o.article, quantite: o.quantite, colis: o.colis, payeeA: s.a, payableAuRetrait: false, moyen: o.moyen, etape: 'a_preparer', echeance: s.echeance, remplacementDe: s.origine })
  }
}
joindreSousCommandes()

/** Crée la sous-commande de remplacement d'un retour, à préparer avant `echeance` ; rend sa référence. */
export function creerSousCommande(origine: string, echeance: number): string {
  const ref = origine + '-R'
  if (!SOUS.lire().liste.some((s) => s.ref === ref)) {
    const a = maintenant()
    etatCommandes.ecrire((x) => {
      x[ref] = { etape: 'a_preparer', echeance, prolongee: false, preteA: null, remiseA: null, annulation: null, journal: [{ a, auteur: SYSTEME, role: 'systeme', action: 'Remplacement à préparer', detail: 'Retour ' + origine + ' · même parcours, aucun nouvel encaissement' }] }
    })
    SOUS.ecrire((e) => {
      e.liste.push({ ref, origine, a, echeance })
    })
    joindreSousCommandes()
  }
  return ref
}

// ── Nouvelle commande pendant la visite (son « nouvelle commande », src/composants/sons.ts) ─────────────────────────────
// Une seule par visite, environ 45 s après l'ouverture, jamais sous navigateur piloté (tests) : une vraie commande
// payée par Mobile Money, à la suite des références du jeu d'essai, qui entre dans « À préparer » (échéance : 4 h
// ouvertes, comme les autres), avec sa notification (notifications.ts, commandesArrivees) ; le badge des commandes
// monte, ce qui déclenche le son. Son montant gardé est calculé comme pour les autres (gardeFige, src/calculs).
const ARRIVEES = magasin('commandes_arrivees', () => ({ liste: [] as { ref: string; article: string; a: number; echeance: number }[] }))
function joindreArrivees() {
  for (const x of ARRIVEES.lire().liste)
    if (!COMMANDES.some((c) => c.ref === x.ref) && etatCommandes.lire()[x.ref])
      COMMANDES.push({ ref: x.ref, article: x.article, quantite: 1, colis: 'S', payeeA: x.a, payableAuRetrait: false, moyen: 'momo', etape: 'a_preparer', echeance: x.echeance })
}
joindreArrivees()

// ── Commandes payées par le client (pont commun des cinq interfaces, src/demo/pont.ts) ──────────────────────────
// « order.paid » : chaque colis de la vitrine de la boutique (Boutique B, ACTEURS_DEMO) entre dans « À préparer »,
// avec sa notification, comme une commande arrivée pendant la visite ; l'article est celui du catalogue du client
// (titre, variante, prix payé, photo de la vitrine), jamais le client lui-même (GEN-01). Appliqué une fois par
// événement, avant chaque lecture des commandes ; l'heure est celle de la démonstration du vendeur à la réception.
const CLIENT = magasin('commandes_client', () => ({ vus: [] as string[], articles: {} as Record<string, (typeof ARTICLES)[string]>, colis: {} as Record<string, ColisClient>, commandes: {} as Record<string, CommandeEssai>, livreurs: {} as Record<string, typeof LIVREUR> }))
/** Une commande du client vue du vendeur : sa référence chez le client, son colis, où il part (relais ou quartier). */
export interface ColisClient {
  commande: string
  colis: string
  relais: string | null
  quartier: string | null
}
// Catégorie de commission v1.4 (D17) → catégorie du barème vendeur VD-02 (src/calculs/registre.ts) : le calcul du
// montant gardé reste celui du vendeur jusqu'à la grille par catégorie (étape 8 de la connectivité).
const CATEGORIES: Record<string, string> = { TEL: 'Électronique', ACC: 'Électronique', INF: 'Électronique', AUD: 'Électronique', GEM: 'Électroménager', PEM: 'Électroménager', MOD: 'Mode Femme', SAC: 'Mode Femme', PAG: 'Mode Femme', CHA: 'Mode Homme', BEA: 'Beauté & Cosmétique', SAN: 'Beauté & Cosmétique', SUP: 'Supermarché', MAI: 'Maison & Déco', BRI: 'Maison & Déco', AMO: 'Maison & Déco', DIV: 'Maison & Déco', BEB: 'Bébé & Enfant', JOU: 'Bébé & Enfant', SPO: 'Sport & Loisirs', ANI: 'Animaux', LIV: 'Livres & Médias', SCO: 'Livres & Médias' }
for (const [k, a] of Object.entries(CLIENT.lire().articles)) ARTICLES[k] ??= a
// Les commandes du client déjà reçues rejoignent la liste à chaque ouverture (avec leur état, gardé à part).
// (Elles remplacent l'entrée posée par les arrivées de la visite, qui ne connaît ni la classe ni la quantité.)
for (const c of Object.values(CLIENT.lire().commandes)) {
  const i = COMMANDES.findIndex((y) => y.ref === c.ref)
  if (i >= 0) COMMANDES[i] = c
  else COMMANDES.push(c)
}
// Code de commission v1.4 de la ligne payée (pont) → univers de BV-DEV-07 (R16).
const UNIVERS_V20: Record<string, string> = { TEL: 'TEL', ACC: 'TEL', INF: 'ELE', AUD: 'ELE', GEM: 'EMG', PEM: 'EMG', MOD: 'MOD', SAC: 'MOD', PAG: 'MOD', CHA: 'MOD', BEA: 'BEA', SAN: 'BEA', SUP: 'SUP', MAI: 'MAI', BRI: 'MAI', AMO: 'MAI', DIV: 'MAI', BEB: 'BEB', JOU: 'BEB', SPO: 'SPO', ANI: 'ANI', LIV: 'LIV', SCO: 'LIV' }
/** Référence vue par le vendeur : celle de la commande (un colis de la boutique), sinon celle du colis. */
export const refDuColis = (commande: string, colis: string, plusieurs: boolean) => (plusieurs ? colis : commande)
let appliquant = false
let journalLu: string | null = null
export function appliquerCommandesClient() {
  if (appliquant) return
  // Le journal n'a pas changé depuis la dernière lecture : rien à faire (les écrans relisent souvent).
  let brut = ''
  try {
    brut = (localStorage.getItem('blv_pont') ?? '') + (localStorage.getItem('blv_pont:client') ?? '') + (localStorage.getItem('blv_pont:admin') ?? '')
  } catch {
    return
  }
  if (brut === journalLu) return
  appliquant = true
  try {
    journalLu = brut
    const vus = new Set(CLIENT.lire().vus)
    const nouveaux = evenementsPour('vendeur').filter((e) => !vus.has(e.cle))
    if (!nouveaux.length) return
    for (const e of nouveaux) {
      // Décisions de la console d'administration (src/demo/pont-console.ts) : effet, puis notification « BelivaY · … ».
      if (e.app === 'admin') {
        appliquerConsole(e)
        continue
      }
      // Le livreur affecté par l'entreprise (prénom et initiale, entreprise, créneau ; jamais son numéro, REM-02).
      if (e.type === 'package.assigned') {
        const refs = Object.entries(CLIENT.lire().colis).filter(([, x]) => e.colis.includes(x.colis)).map(([r]) => r)
        const livreur = { nom: ACTEURS_DEMO.livreur.vu, societe: ACTEURS_DEMO.entreprise.nom, creneau: e.creneau ?? LIVREUR.creneau }
        CLIENT.ecrire((s) => refs.forEach((r) => (s.livreurs[r] = livreur)))
        refs.forEach((r) => journaliser(r, 'proprietaire', 'Livreur affecté', { detail: `${livreur.nom} · ${livreur.societe}`, auteur: SYSTEME, role: 'systeme' }))
        continue
      }
      // Le ramassage (étape 4) : le livreur est là, le colis lui est remis (code validé), refusé ou reclassé.
      const refDe = (colis: string) => Object.entries(CLIENT.lire().colis).find(([, x]) => x.colis === colis)?.[0] ?? null
      if (e.type === 'courier.arrived') {
        for (const r of e.colis.map(refDe).filter((x): x is string => !!x)) journaliser(r, 'proprietaire', 'Votre livreur est là', { detail: `${ACTEURS_DEMO.livreur.vu} · ${ACTEURS_DEMO.entreprise.nom}`, auteur: SYSTEME, role: 'systeme' })
        continue
      }
      if (e.type === 'parcel.collected') {
        for (const r of e.colis.map(refDe).filter((x): x is string => !!x)) {
          const a = maintenant()
          etatCommandes.ecrire((s) => void (s[r] && ((s[r].remiseA = a), (s[r].etape = 'chez_le_livreur'))))
          journaliser(r, 'proprietaire', 'Remis au livreur', { detail: `${ACTEURS_DEMO.livreur.vu} · ${ACTEURS_DEMO.entreprise.nom} · code validé`, auteur: SYSTEME, role: 'systeme' })
        }
        continue
      }
      if (e.type === 'parcel.refused_at_pickup') {
        const r = refDe(e.colis)
        if (r) {
          const a = maintenant()
          etatCommandes.ecrire((s) => void (s[r] && ((s[r].etape = 'annulee'), (s[r].annulation = { motif: 'belivay', a }))))
          journaliser(r, 'proprietaire', 'Refusé au ramassage', { detail: `${MOTIFS_REFUS[e.motif] ?? e.motif} · photo du livreur au dossier · déplacement imputé`, auteur: `${ACTEURS_DEMO.livreur.vu} · ${ACTEURS_DEMO.entreprise.nom}`, role: 'systeme' })
          ajouterNotification({ type: 'preparer', canal: 'notification', titre: { modele: 'Refusé au ramassage · {ref}', valeurs: { ref: r } }, texte: { modele: '{motif} : la photo du livreur est au dossier. Le client est remboursé ; le déplacement vous est imputé.', valeurs: { motif: MOTIFS_REFUS[e.motif] ?? e.motif } }, a, urgent: true, argent: false, lien: `commande?ref=${r}`, contester: null })
        }
        continue
      }
      if (e.type === 'relay.drop.completed') {
        for (const r of e.remis.map(refDe).filter((x): x is string => !!x)) journaliser(r, 'proprietaire', 'Déposé au relais', { detail: `${RELAIS_DEMO.nom} · lot ${e.lot}`, auteur: SYSTEME, role: 'systeme' })
        continue
      }
      if (e.type === 'handover.completed') {
        const r = refDe(e.colis)
        if (r) {
          // Retirée : la fenêtre de retour (7 jours) court ; l'argent se libère ensuite (étape 8).
          const a = maintenant()
          majClient(r, (c) => void Object.assign(c, { retraitA: a, fermetureA: a + 7 * JOUR, etape: 'se_libere' }))
          etatCommandes.ecrire((s) => void (s[r] && (s[r].etape = 'se_libere')))
          journaliser(r, 'proprietaire', 'Retirée par le client', { detail: `${RELAIS_DEMO.nom} · code, PIN du gérant, photo de la remise`, auteur: SYSTEME, role: 'systeme' })
        }
        continue
      }
      if (e.type === 'claim.opened' || e.type === 'parcel.returned' || e.type === 'return.dropped') {
        appliquerRetourClient(e, refDe)
        continue
      }
      if (e.type === 'parcel.unclaimed') {
        const r = refDe(e.colis)
        if (r) {
          const a = maintenant()
          etatCommandes.ecrire((s) => void (s[r] && ((s[r].etape = 'annulee'), (s[r].annulation = { motif: 'belivay', a }))))
          journaliser(r, 'proprietaire', 'Non retiré : renvoi au vendeur', { detail: `${RELAIS_DEMO.nom} · vente annulée, le colis vous revient · garde à la charge du client`, auteur: SYSTEME, role: 'systeme' })
          ajouterNotification({ type: 'retour', canal: 'notification', titre: { modele: 'Non retiré · {ref}', valeurs: { ref: r } }, texte: { modele: 'Non retiré en 7 jours au relais : la vente est annulée, le colis revient à la boutique. La garde est à la charge du client.', valeurs: {} }, a, urgent: false, argent: false, lien: `commande?ref=${r}`, contester: null })
        }
        continue
      }
      if (e.type === 'parcel.delivered') {
        for (const r of e.colis.map(refDe).filter((x): x is string => !!x)) journaliser(r, 'proprietaire', 'Remis au client', { detail: 'À domicile, contre le code de réception du client' + (e.photo ? ' · photo de la remise' : ''), auteur: SYSTEME, role: 'systeme' })
        continue
      }
      if (e.type === 'parcel.reclassified') {
        const r = refDe(e.colis)
        if (r) journaliser(r, 'proprietaire', 'Colis reclassé par le livreur', { detail: `Classe ${e.de} → ${e.vers} · reclassement facturé (classe dépassée)`, auteur: SYSTEME, role: 'systeme' })
        continue
      }
      if (e.type !== 'order.paid') continue
      const miens = e.colis.filter((c) => c.boutique === ACTEURS_DEMO.vendeur.vitrine)
      // Part de la livraison offerte (R07) portée par chaque colis : au prorata de son sous-total dans la commande, au franc
      // le plus proche (kit : regles20.part_de_couverture) ; elle relève le plancher R14 de la commission.
      const sousTotalDe = (x: (typeof e.colis)[number]) => x.lignes.reduce((t, l) => t + l.prix * l.qte, 0)
      const sousTotalCommande = e.colis.reduce((t, x) => t + sousTotalDe(x), 0)
      const partOfferte = (x: (typeof e.colis)[number]) => (e.livraisonOfferte > 0 && sousTotalCommande > 0 ? Math.floor((e.livraisonOfferte * sousTotalDe(x) * 2 + sousTotalCommande) / (2 * sousTotalCommande)) : 0)
      for (const x of miens) {
        const ref = refDuColis(e.commande, x.colis, miens.length > 1)
        if (etatCommandes.lire()[ref]) continue
        const l = x.lignes[0]
        const cle = 'cl-' + l.produit
        // categorie14 : code de commission v1.4 (D17) de la ligne payée, figé au paiement avec le palier du jour.
        const article = { offreId: cle, titre: l.titre, variante: l.variante ?? '', etat: 'Neuf', dessin: l.photo ?? 'itel', categorie: CATEGORIES[l.categorie ?? ''] ?? 'Électronique', prix: l.prix, madeInCameroon: false, categorie14: l.categorie ?? 'DIV', palier14: BOUTIQUE.palier } as (typeof ARTICLES)[string]
        ARTICLES[cle] = article
        CLIENT.ecrire((s) => void (s.articles[cle] = article))
        const a = maintenant()
        const cal = calendrier()
        const echeance = ajouterOuvertes(ouvertureSuivante(a, cal), e.delaiH * HEURE, cal)
        const c: CommandeEssai = { ref, article: cle, quantite: l.qte, colis: x.classe === 'XL' ? 'L' : x.classe, payeeA: a, payableAuRetrait: e.payableAuRetrait, couverture: partOfferte(x), moyen: e.payableAuRetrait ? 'comptoir' : 'momo', etape: 'a_preparer', echeance }
        ARRIVEES.ecrire((s) => void s.liste.push({ ref, article: cle, a, echeance }))
        etatCommandes.ecrire((s) => {
          s[ref] = { etape: 'a_preparer', echeance, prolongee: false, preteA: null, remiseA: null, annulation: null, journal: histoire(c) }
          if (!COMMANDES.some((y) => y.ref === ref)) COMMANDES.push(c)
        })
        PONT_COLIS.set(ref, { commande: e.commande, colis: x.colis, relais: e.relais, quartier: e.mode === 'domicile' ? (e.lieu.split(' · ').pop() ?? null) : null })
        const quartier = e.mode === 'domicile' ? (e.lieu.split(' · ').pop() ?? null) : null
        CLIENT.ecrire((s) => void ((s.colis[ref] = { commande: e.commande, colis: x.colis, relais: e.relais, quartier }), (s.commandes[ref] = c)))
      }
    }
    CLIENT.ecrire((s) => void s.vus.push(...nouveaux.map((e) => e.cle)))
  } finally {
    appliquant = false
  }
}
/** Type de la notification d'une décision de la console (filtres Tout · Urgent · Argent, VD11-R53). */
const TYPE_CONSOLE: Partial<Record<Evenement['type'], TypeNotification>> = {
  kyc_decide: 'securite',
  sanction_decidee: 'sanction',
  palier_decide: 'palier',
  litige_decide: 'litige',
  commande_annulee: 'preparer',
  versement_credite: 'versement',
  versement_gele: 'versement',
  versement_degele: 'versement',
  reprise_vendeur: 'versement',
  fiche_decidee: 'offre',
  fiche_a_valider: 'offre',
  offre_moderee: 'offre',
  flash: 'offre',
  rabais_retire: 'prix',
  avis_modere: 'avis',
}
/** Une décision de la console (une fois, clé) : effet sur la commande ou le dossier d'ouverture, puis la notification. */
function appliquerConsole(e: Evenement) {
  const a = maintenant()
  // Références de la boutique pour une commande du client (un colis de la boutique) ou du jeu d'essai.
  const refsDe = (commande: string) => [...new Set([...Object.entries(CLIENT.lire().colis).filter(([, x]) => x.commande === commande).map(([r]) => r), ...(etatCommandes.lire()[commande] ? [commande] : [])])]
  let lien = 'notifications'
  // kyc_decide : le dossier d'ouverture envoyé depuis cet appareil avance à sa lecture (session.ts, appliquerKycConsole).
  if (e.type === 'kyc_decide') lien = 'kyc'
  else if (e.type === 'litige_decide') {
    for (const r of refsDe(e.commande)) {
      journaliser(r, 'proprietaire', 'Décision de BelivaY sur le litige', { detail: `${e.id} · ${e.motif}`, auteur: SYSTEME, role: 'systeme' })
      lien = `commande?ref=${r}`
    }
  } else if (e.type === 'commande_annulee') {
    for (const r of refsDe(e.commande)) {
      etatCommandes.ecrire((s) => void (s[r] && s[r].etape !== 'annulee' && ((s[r].etape = 'annulee'), (s[r].annulation = { motif: 'belivay', a }))))
      journaliser(r, 'proprietaire', 'Annulée par BelivaY', { detail: `${e.motif} · le client est remboursé au moyen d’origine`, auteur: SYSTEME, role: 'systeme' })
      lien = `commande?ref=${r}`
    }
  }
  const x = avisConsole(e, 'vendeur')
  if (!x) return
  const type = TYPE_CONSOLE[e.type] ?? 'message'
  if (type === 'versement') lien = 'versements'
  ajouterNotification({ type, canal: 'notification', titre: { modele: x.titre }, texte: { modele: x.texte }, a, urgent: x.grave, argent: x.argent, lien, contester: null })
}
/** Une commande du client modifiée (liste de la session et copie gardée à part). */
function majClient(ref: string, f: (c: CommandeEssai) => void) {
  const c = COMMANDES.find((y) => y.ref === ref)
  if (c) f(c)
  CLIENT.ecrire((s) => void (s.commandes[ref] && f(s.commandes[ref])))
}
/** Dossiers ouverts par le client sur ses commandes (pont) : numéro du dossier, colis. */
const DOSSIERS = magasin('litiges_client', () => ({ dossiers: {} as Record<string, { dossier: string; colis: string; motif: string }> }))
export const dossierClientDe = (ref: string) => DOSSIERS.lire().dossiers[ref] ?? null
/** Étape 7 : le dossier du client arrive (à répondre sous 48 h), le retour est déposé au relais, puis remis à la boutique. */
function appliquerRetourClient(e: Evenement, refDe: (colis: string) => string | null) {
  const a = maintenant()
  if (e.type === 'claim.opened') {
    const r = refDe(e.colis)
    if (!r) return
    DOSSIERS.ecrire((s) => void (s.dossiers[r] = { dossier: e.dossier, colis: e.colis, motif: e.motif }))
    majClient(r, (c) => void (c.litige = { ouvertA: a, echeance: a + 48 * HEURE, motif: e.motif, ceQueDitLeClient: `${e.motif} · ${e.photos} photo${e.photos > 1 ? 's' : ''} du client au dossier` }))
    etatCommandes.ecrire((s) => void (s[r] && (s[r].etape = 'litige')))
    journaliser(r, 'proprietaire', 'Litige ouvert par le client', { detail: `${e.dossier} · ${e.motif} · réponse attendue sous 48 h`, auteur: SYSTEME, role: 'systeme' })
    ajouterNotification({ type: 'litige', canal: 'notification', titre: { modele: 'Litige à répondre · {ref}', valeurs: { ref: r } }, texte: { modele: '{motif} : vous avez 48 h pour répondre. Sans réponse, BelivaY tranche.', valeurs: { motif: e.motif } }, a, urgent: true, argent: false, lien: `litige?ref=${r}`, contester: null })
  } else if (e.type === 'return.dropped') {
    const r = refDe(e.colis)
    if (r) journaliser(r, 'proprietaire', 'Retour déposé au relais', { detail: `${RELAIS_DEMO.nom} · ${e.reference} · scellé et photographié`, auteur: SYSTEME, role: 'systeme' })
  } else if (e.type === 'parcel.returned') {
    for (const r of e.colis.map(refDe).filter((x): x is string => !!x)) {
      marquerRecuPont(r, a)
      journaliser(r, 'proprietaire', 'Retour reçu à la boutique', { detail: `${ACTEURS_DEMO.livreur.vu} · code de réception validé${e.photo ? ' · photo' : ''} · inspection sous 48 h`, auteur: SYSTEME, role: 'systeme' })
    }
  }
}
/** Le vendeur répond au dossier du client (litiges.repondre) : le client le voit ; accepté, le retour part par le relais. */
export function repondreAuClient(ref: string, posture: 'accepte' | 'arrangement' | 'conteste') {
  const d = dossierClientDe(ref)
  if (!d) return
  const retour = posture === 'accepte' ? 'RT-' + d.dossier.replace(/\D/g, '') : null
  publierVersClient(ref, (x) => ({ type: 'claim.answered', commande: x.commande, colis: x.colis, dossier: d.dossier, posture, retour }), 'claim.answered')
  if (posture !== 'accepte') return
  const jour = jourDe(maintenant() + 2 * JOUR)
  majClient(ref, (c) => void (c.retour = { motif: d.motif, arrivee: { jour, creneau: ['14:00', '18:00'] } }))
  etatCommandes.ecrire((s) => void (s[ref] && (s[ref].etape = 'retour')))
}
/** Issue du retour inspecté (remboursé, remplacé, ou médiation) : le client la voit. */
export function cloreRetourClient(ref: string, issue: 'rembourse' | 'remplace' | 'mediation') {
  publierVersClient(ref, (x) => ({ type: 'return.closed', commande: x.commande, colis: x.colis, issue }), 'return.closed')
}

/** Motifs d'un refus au ramassage, dans les mots du vendeur. */
const MOTIFS_REFUS: Record<string, string> = { non_conforme: 'Article non conforme', abime: 'Article abîmé', contrefacon: 'Contrefaçon suspectée', interdit: 'Produit interdit', controle_refuse: 'Contrôle refusé', valeur_plafond: 'Valeur au-dessus du plafond', emballage_impossible: 'Emballage impossible' }
/** La commande et le colis du client derrière une référence du vendeur (null : commande du jeu d'essai). */
const PONT_COLIS = new Map<string, ColisClient>(Object.entries(CLIENT.lire().colis))
export const colisClientDe = (ref: string) => PONT_COLIS.get(ref) ?? null
/** Le livreur d'une commande : celui du jeu d'essai ; pour une commande du client, celui que l'entreprise a affecté. */
export const livreurDe = (ref: string): typeof LIVREUR | null => (colisClientDe(ref) ? (CLIENT.lire().livreurs[ref] ?? null) : LIVREUR)
/** Un geste du vendeur sur une commande du client part vers le client (pont commun). */
export function publierVersClient(ref: string, f: (x: ColisClient) => Parameters<typeof publier>[0], cle: string) {
  const x = colisClientDe(ref)
  if (x) publier(f(x), cle + '-' + x.colis, maintenant())
}

// Avant chaque lecture des commandes : les commandes payées par le client depuis la dernière lecture.
const lireCommandes = etatCommandes.lire
etatCommandes.lire = () => (appliquerCommandesClient(), lireCommandes())

/** Commandes arrivées pendant les visites (notifications « à préparer »). */
export const commandesArrivees = () => ARRIVEES.lire().liste.map((x) => essaiDe(x.ref)).filter((c): c is CommandeEssai => !!c)

function faireArriverUneCommande() {
  const offre = OFFRES.find((o) => o.etat === 'en_vente' && o.stock > 0 && ARTICLES[o.id])
  if (!offre) return
  // Numérotation du jeu d'essai du vendeur (les commandes du client, BLV-52108…, ont leur propre suite).
  const n = Math.max(...COMMANDES.map((c) => Number(/^BLV-(\d+)$/.exec(c.ref)?.[1] ?? 0)).filter((x) => x < 50000)) + 1
  const ref = 'BLV-' + String(n).padStart(5, '0')
  const a = maintenant()
  const cal = calendrier()
  const echeance = ajouterOuvertes(ouvertureSuivante(a, cal), 4 * HEURE, cal)
  const c: CommandeEssai = { ref, article: offre.id, quantite: 1, colis: 'S', payeeA: a, payableAuRetrait: false, moyen: 'momo', etape: 'a_preparer', echeance }
  ARRIVEES.ecrire((e) => {
    e.liste.push({ ref, article: offre.id, a, echeance })
  })
  // Jointe à la liste dans la même écriture : la session relue à l'événement compte déjà la nouvelle commande.
  etatCommandes.ecrire((x) => {
    x[ref] = { etape: 'a_preparer', echeance, prolongee: false, preteA: null, remiseA: null, annulation: null, journal: histoire(c) }
    COMMANDES.push(c)
  })
}

const CLE_ARRIVEE = 'blv_v_arrivee'
if (typeof window !== 'undefined' && !navigator.webdriver) {
  let deja = true
  try {
    deja = !!sessionStorage.getItem(CLE_ARRIVEE)
  } catch {
    /* stockage refusé : pas de commande surprise */
  }
  if (!deja)
    setTimeout(() => {
      try {
        if (sessionStorage.getItem(CLE_ARRIVEE)) return
        sessionStorage.setItem(CLE_ARRIVEE, '1')
      } catch {
        return
      }
      faireArriverUneCommande()
    }, 45_000)
}

/** Commandes encaissées comptées par l'offre de découverte (Q-62) : payées, hors payables au retrait non payées. */
export const commandesComptees = () => COMMANDES.filter((c) => !c.payableAuRetrait && !c.remplacementDe).length

/** Commission, TVA et gardé figés au paiement (D5) : palier et découverte du jour du paiement (aussi lus par l'argent :
 * facture des commissions). */
export function commissionFigee(c: CommandeEssai): ResultatCommission {
  const a = ARTICLES[c.article]
  // Commande du client (pont) : commission BV-DEV v2.0 (R13 à R22 ; calcul du client : site/src/calculs/commission.ts) :
  // barème par familles × palier, planchers R14 (dont la part de livraison offerte portée par le colis, au prorata du
  // sous-total, comme le kit), frais de versement de 1 % (R22) ; « Vous gardez » = reçu.
  const v14 = a as typeof a & { categorie14?: string; palier14?: Palier }
  if (v14.categorie14) {
    const univers = UNIVERS_V20[v14.categorie14] ?? 'TEL'
    const couverture = c.couverture ?? 0
    const r = commissionSousCommande([{ prix: a.prix, quantite: c.quantite, univers }], v14.palier14 ?? BOUTIQUE.palier, { couverture })
    const d = Dec.de(String(r.commission))
    const plancherOffert = couverture ? couverture + Math.max(reglage('marge_min_f'), r.sousTotal * reglage('marge_min_part')) : 0
    const plancher = Math.ceil(Math.max(reglage('com_min'), r.sousTotal * reglage('com_taux_min'), plancherOffert))
    return { prixArticles: r.sousTotal, bareme: Dec.de(String(r.bareme)), reduite: d, plancher: Dec.de(String(plancher)), plancherApplique: r.motif !== 'barème', commission: r.commission, tva: r.tva, garde: r.recu, margeSurPlancher: Math.max(0, r.commission - plancher), trace: [`R14-R22 · ${univers} · ${r.motif} · commission ${r.commission} F · frais de versement ${r.fraisVersement} F`] }
  }
  const p = PARAMETRES.commission
  const rang = COMMANDES.filter((x) => !x.payableAuRetrait && x.payeeA < c.payeeA).length
  // L'offre de découverte part de la première commande payée : une vente plus ancienne (comptoir) n'en profite pas.
  const decouverte = jourDe(c.payeeA) >= BOUTIQUE.premiereCommandePayee && decouverteActive(BOUTIQUE.premiereCommandePayee, jourDe(c.payeeA), rang, p)
  // BV-DEV v2.0 (DP-69) : barème par famille et tranches, planchers R14 (700 F, 2 %), palier, découverte ; « Vous
  // gardez » = sous-total − commission − TVA ; le 1 % Mobile Money est retenu sur le versement du vendredi (R22).
  const r = commissionSousCommande([{ prix: a.prix, quantite: c.quantite, univers: universDe(a.categorie), madeInCameroon: a.madeInCameroon }], BOUTIQUE.palier, { decouverte })
  const d = Dec.de(String(r.commission))
  return { prixArticles: r.sousTotal, bareme: Dec.de(String(Math.round(r.bareme))), reduite: d, plancher: Dec.de('700'), plancherApplique: r.motif !== 'barème', commission: r.commission, tva: r.tva, garde: r.net, margeSurPlancher: 0, trace: [`v2.0 · ${r.motif} · commission ${r.commission} F`] }
}
/** Univers du barème v2.0 (BV-DEV-03) pour une catégorie du jeu d'essai (téléphones et accessoires ; mode). */
export const universDe = (categorie: string) => (/mode/i.test(categorie) ? 'MOD' : /beaut/i.test(categorie) ? 'BEA' : /maison/i.test(categorie) ? 'MAI' : 'TEL')
/** Montant gardé figé au paiement (D5). */
export const gardeFige = (c: CommandeEssai): number => commissionFigee(c).garde

export const essaiDe = (ref: string) => COMMANDES.find((c) => c.ref === ref) ?? null

const remiseDe = (e: EtatCommande) => e.remiseA ?? e.journal.find((x) => x.action.startsWith('Remis au livreur'))?.a ?? null

function statut(c: CommandeEssai, e: EtatCommande): StatutCommande {
  switch (e.etape) {
    case 'a_preparer':
      return c.payableAuRetrait ? 'payable_au_retrait' : 'a_preparer'
    case 'chez_le_livreur':
      return remiseDe(e) ? 'chez_le_livreur' : 'prete'
    case 'litige':
      return 'litige_gele'
    case 'retour':
      return 'retour_gele'
    case 'annulee':
      return 'annulee'
    default:
      return 'livree'
  }
}

export function vueCommande(c: CommandeEssai, role: Role): Commande {
  const e = etatEffectif(c.ref)
  const a = ARTICLES[c.article]
  const proprio = role === 'proprietaire'
  const figee = commissionFigee(c)
  const garde = figee.garde
  const cal = calendrier()
  const debut = ouvertureSuivante(c.payeeA, cal)
  const lib = c.fermetureA ? dateDeLiberation(c.fermetureA, BOUTIQUE.palier, c.moyen === 'carte', PARAMETRES.versements) : null
  // État de l'argent par la même règle que Mon argent (etatDeLArgent, VD09-R04) : une vente dont la libération est
  // passée est « à verser » ; le gel prime (LIB-02).
  const gel = e.etape === 'litige' ? 'litige' : e.etape === 'retour' ? 'retour' : null
  const enVente = ['versee', 'a_verser', 'se_libere', 'litige', 'retour'].includes(e.etape)
  const etatArgent = enVente ? ETATS_COMMANDE[etatDeLArgent({ reference: c.ref, garde: 0, liberation: lib, verse: e.etape === 'versee', gel }, maintenant())] : 'en_cours'
  const st = statut(c, e)
  const enPrep = e.etape === 'a_preparer'
  const pv = PARAMETRES.versements
  const litige = c.litige && e.etape === 'litige' ? litigesOuverts().find((l) => l.ref === c.ref) : null
  return {
    ref: c.ref,
    statut: st,
    payableAuRetrait: c.payableAuRetrait,
    payeeA: c.payeeA,
    debut,
    echeance: enPrep ? e.echeance : null,
    echeanceAbsolue: enPrep ? ajouterOuvertes(debut, 24 * HEURE, cal) : null,
    prolongee: e.prolongee,
    calendrier: cal,
    lignes: [{ article: { offreId: a.offreId, titre: a.titre, variante: a.variante, etat: a.etat, dessin: a.dessin, categorie: a.categorie }, quantite: c.quantite, prixUnitaire: proprio ? a.prix : null, reference: referenceDe(a.offreId), aMettreDeCote: accessoiresDe(a.offreId) }],
    colis: c.colis,
    garde: proprio && !c.remplacementDe ? garde : null,
    commissionMinimale: proprio && !c.remplacementDe && figee.plancherApplique ? figee.commission : null,
    remplacementDe: c.remplacementDe ?? null,
    liberationJours: c.moyen === 'carte' ? pv.libCarteJours : BOUTIQUE.palier === 'Or' || BOUTIQUE.palier === 'Platine' ? pv.libOrJours : pv.libStandardJours,
    argent: proprio && !c.remplacementDe ? { etat: etatArgent, liberation: lib, vendredi: lib ? vendrediDeVersement(lib, PARAMETRES.versements) : null, versement: c.versement ?? null } : null,
    livreur: (st === 'a_preparer' || st === 'payable_au_retrait' || st === 'prete' || st === 'chez_le_livreur') && livreurDe(c.ref) ? { ...livreurDe(c.ref)!, photo: 'person' } : null,
    ramassage: enPrep && e.echeance ? passageSuivant(e.echeance, cal) : st === 'prete' && e.preteA ? passageSuivant(e.preteA, cal) : null,
    preteA: e.preteA,
    remiseA: remiseDe(e),
    retireeA: c.retraitA ?? null,
    confirmeeParLeClient: !!(c.fermetureA && c.retraitA && c.fermetureA < c.retraitA + pv.fenetreRetourJours * JOUR),
    annulation: e.etape === 'annulee' ? (e.annulation ?? { motif: 'rupture', a: maintenant() }) : null,
    probleme:
      c.litige && e.etape === 'litige'
        ? { type: 'litige', echeance: c.litige.echeance, motif: c.litige.motif, repondu: !!litige?.reponse }
        : c.retour && e.etape === 'retour'
          ? { type: 'retour', motif: c.retour.motif, arrivee: c.retour.arrivee, inspectionHeures: INSPECTION_HEURES }
          : null,
    gele: proprio && (e.etape === 'litige' || e.etape === 'retour') ? garde : null,
    moyenPaiement: c.moyen,
  }
}

/** Progression « Se libère » d'une commande (barre), ou null. */
export function progressionDe(ref: string): number | null {
  const c = essaiDe(ref)
  if (!c?.fermetureA) return null
  const lib = dateDeLiberation(c.fermetureA, BOUTIQUE.palier, c.moyen === 'carte', PARAMETRES.versements)
  return progressionPourCent(c.fermetureA, lib, maintenant())
}

/** État effectif d'une commande (CMD-07) : un litige ou un retour CLOS quitte « Problèmes » et l'argent gelé. Litige
 * accepté ou perdu, retour remboursé : la vente est annulée (client remboursé) ; litige gagné (délai de recours passé)
 * ou remplacement fait : l'argent reprend sa libération. Pendant le délai de recours, un litige gagné reste gelé
 * (Q-26). Le magasin garde l'étape écrite ; seule la lecture change. */
export function etatEffectif(ref: string, e: EtatCommande = etatCommandes.lire()[ref]): EtatCommande {
  if (e?.etape === 'litige') {
    const l = litigesOuverts().find((x) => x.ref === ref)
    if (l?.etat === 'clos') return l.issue === 'gagne' ? { ...e, etape: 'se_libere' } : { ...e, etape: 'annulee', annulation: e.annulation ?? { motif: 'litige_perdu', a: l.decision?.a ?? l.reponse?.envoyeeA ?? maintenant() } }
  }
  if (e?.etape === 'retour') {
    const r = tousLesRetours().find((x) => x.ref === ref)
    if (r?.etat === 'clos') return r.suite.type === 'rembourse' ? { ...e, etape: 'annulee', annulation: e.annulation ?? { motif: 'litige_perdu', a: r.suite.le } } : { ...e, etape: 'se_libere' }
  }
  return e
}
export const etapeEffective = (ref: string) => etatEffectif(ref).etape

/** Filtre d'une commande : une annulée reste dans « Terminées » avec son motif (Q-73), hors de la file à préparer. */
export function filtreDe(etape: EtatCommande['etape']): FiltreCommandes {
  if (etape === 'a_preparer') return 'prep'
  if (etape === 'chez_le_livreur') return 'cours'
  if (etape === 'litige' || etape === 'retour') return 'pb'
  return 'fin'
}

export function compterCommandes(): Record<FiltreCommandes, number> {
  const e = etatCommandes.lire()
  const n: Record<FiltreCommandes, number> = { prep: 0, cours: 0, fin: 0, pb: 0 }
  for (const c of COMMANDES) n[filtreDe(etatEffectif(c.ref, e[c.ref]).etape)]++
  return n
}

function detailCompteurs(): CompteursDetail {
  const e = etatCommandes.lire()
  const d: CompteursDetail = { prep: 0, cours: 0, litiges: 0, retours: 0, terminees: 0, annulees: 0 }
  for (const c of COMMANDES) {
    const x = etatEffectif(c.ref, e[c.ref]).etape
    if (x === 'a_preparer') d.prep++
    else if (x === 'chez_le_livreur') d.cours++
    else if (x === 'litige') d.litiges++
    else if (x === 'retour') d.retours++
    else if (x === 'annulee') d.annulees++
    else d.terminees++
  }
  return d
}

/** Note une action signée dans le journal de la commande (GEN-09) ; `a` : heure d'origine (action gardée hors connexion). */
export function journaliser(ref: string, role: Role, action: string, plus: Partial<EntreeJournal> = {}) {
  const membre = MEMBRES.find((m) => m.role === role)!
  etatCommandes.ecrire((e) => {
    e[ref].journal.push({ a: maintenant(), auteur: `${membre.prenom} ${membre.nom}`, role, action, ...plus })
  })
}

// Ordre de chaque filtre : la plus urgente d'abord (CMD-08), puis la plus récente.
function trier(f: FiltreCommandes, items: Commande[]): Commande[] {
  const cle = (c: Commande) =>
    f === 'prep' ? (c.echeance ?? 0) : f === 'pb' ? (c.probleme?.type === 'litige' ? c.probleme.echeance : Number.MAX_SAFE_INTEGER) : -(c.remiseA ?? c.preteA ?? c.annulation?.a ?? c.retireeA ?? c.payeeA)
  return items.sort((a, b) => cle(a) - cle(b))
}

function vue(filtre: FiltreCommandes): VueCommandes {
  const e = etatCommandes.lire()
  const role = roleCourant()
  const items = trier(filtre, COMMANDES.filter((c) => filtreDe(etatEffectif(c.ref, e[c.ref]).etape) === filtre).map((c) => vueCommande(c, role)))
  return { compteurs: compterCommandes(), detail: detailCompteurs(), total: COMMANDES.length, items, maintenant: maintenant() }
}

export const demoCommandes: DomaineCommandes = {
  vue: (filtre) => avecDroit('commandes.voir', 'commandes', () => repondre(vue(filtre))),
  liste: (filtre) => avecDroit('commandes.voir', 'commandes', () => repondre(vue(filtre).items)),
  compteurs: () => repondre(compterCommandes()),
  detail: (ref) => avecDroit('commandes.voir', 'commande', () => {
    const c = essaiDe(ref)
    return repondre(c ? vueCommande(c, roleCourant()) : null)
  }),
  journal: (ref) => repondre((etatCommandes.lire()[ref]?.journal ?? []).map((e, i) => ({ e, i })).sort((x, y) => y.e.a - x.e.a || y.i - x.i).map((x) => x.e)),
}
