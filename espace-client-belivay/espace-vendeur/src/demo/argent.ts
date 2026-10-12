// DONNÉES DE DÉMONSTRATION — domaine « argent » (propriétaire seulement) : où est l'argent, calculé commande par
// commande (gardé figé au paiement, src/calculs/commission.ts ; libération et vendredi, src/calculs/versements.ts).
// en circulation = à verser + se libère + en cours + gelé (VD-D03.A04). Les états suivent l'heure : une somme dont la
// libération est passée est « à verser » (LIB-01) ; un litige ou un retour ouvert (domaines litiges, retours, via
// l'état des commandes) gèle la somme aussitôt (LIB-02). Délais et seuils lus dans le registre (aucun en dur).
import type { ArticleArgent, ContenuDocument, DemandeDocument, Documents, DomaineArgent, Gains, Gele, LigneGain, Mouvement, ResumeArgent, SeLibere } from '../donnees/domaines/argent'
import { ReserveAuProprietaire } from '../donnees/communs'
import { pourCentAffiche } from '../calculs/argent'
import { calculerCommission, decouverteActive, familleDe, type ResultatCommission } from '../calculs/commission'
import { PARAMETRES, REGISTRE } from '../calculs/registre'
import { HEURE, ajouterMois, debutDuJour, jourDe } from '../calculs/temps'
import { dateDeLiberation, heureLimite, montantDu, vendrediDeVersement, type Gain, type MotifGel } from '../calculs/versements'
import { dateDeVersement, etatDeLArgent, resume as resumeCalcule, type EtatArgent as EtatDeLArgent } from '../calculs/argent-vendeur'
import { maintenant } from './horloge'
import { ARTICLES, BOUTIQUE, COMMANDES, type CommandeEssai } from './jeu-essai'
import { commissionFigee, etatCommandes, etatEffectif, gardeFige, progressionDe } from './commandes'
import { estProprietaire } from './session'
import { repondre } from './stockage'
import { numeroActif, versementsPasses } from './versements'

const PV = PARAMETRES.versements
const PC = PARAMETRES.commission

/** Valeur entière d'un paramètre du registre (« 48 h », « jusqu’à 3 000 F ») : la forme est vérifiée. */
function nombreDe(code: string, motif: RegExp): number {
  const v = REGISTRE[code]
  const m = v ? motif.exec(v.trim()) : null
  if (!m) throw new Error(`paramètre ${code} illisible : « ${v} »`)
  return Number(m[1].replace(/[\s  ]/g, ''))
}
const HEURES = /^(\d+) h\b/
const FRANCS = /^jusqu’à (\d{1,3}(?:[\s  ]\d{3})*) F$/

export const articleDe = (c: CommandeEssai): ArticleArgent => {
  const a = ARTICLES[c.article]
  return { titre: a.titre, variante: a.variante, dessin: a.dessin }
}
export const prixDe = (c: CommandeEssai) => ARTICLES[c.article].prix * c.quantite

/** Commission, TVA et gardé figés au paiement (D5), comme gardeFige du domaine commandes (même calcul). */
export const figee = (c: CommandeEssai): ResultatCommission => commissionFigee(c)

export const liberationDe = (c: CommandeEssai) => (c.fermetureA ? dateDeLiberation(c.fermetureA, BOUTIQUE.palier, c.moyen === 'carte', PV) : null)

/** Reprises (vice caché tranché après libération, Q-11) : aucune dans le jeu d'essai ; le serveur les envoie datées. */
const REPRISES: LigneGain[] = []

const ETAT: Record<EtatDeLArgent, Mouvement['etat']> = { 'En cours': 'en_cours', 'Se libère': 'se_libere', Gelé: 'gele', 'À verser': 'a_verser', Versé: 'verse' }

/** Gain figé d'une commande (src/calculs/versements.ts) : le gel prime sur tout compte à rebours (LIB-02). */
function gainDe(c: CommandeEssai, etape: string): Gain {
  const gel: MotifGel | null = etape === 'litige' ? 'litige' : etape === 'retour' ? 'retour' : null
  return { reference: c.ref, garde: gardeFige(c), liberation: liberationDe(c), verse: etape === 'versee', gel }
}

/** Commandes payées (ou payées au retrait), non annulées, et l'état de leur argent (etatDeLArgent, VD09-R04). */
function vendues() {
  const e = etatCommandes.lire()
  // État effectif : un litige ou un retour clos ne gèle plus rien (accepté, perdu, remboursé : vente annulée ; gagné
  // après le délai de recours : libération reprise ; CMD-07, Q-26).
  const etape = (c: CommandeEssai) => etatEffectif(c.ref, e[c.ref]).etape
  // Une sous-commande de remplacement n'apporte aucun argent (la vente d'origine reste la seule).
  return COMMANDES.filter((c) => !c.remplacementDe && (!c.payableAuRetrait || etape(c) !== 'a_preparer') && etape(c) !== 'annulee').map((c) => ({ c, gain: gainDe(c, etape(c)) }))
}
export const gainsFiges = (): Gain[] => vendues().map((v) => v.gain)

export function mouvements(): Mouvement[] {
  const t = maintenant()
  return vendues().map(({ c, gain }) => {
    const etat = ETAT[etatDeLArgent(gain, t)]
    return {
      ref: c.ref,
      etat,
      garde: gain.garde,
      liberation: gain.liberation,
      vendredi: dateDeVersement(gain, t, PV) ?? (gain.verse && gain.liberation ? vendrediDeVersement(gain.liberation, PV) : null),
      progression: etat === 'se_libere' ? progressionDe(c.ref) : null,
      article: articleDe(c),
      prix: prixDe(c),
      payeeA: c.payeeA,
    } satisfies Mouvement
  })
}
const somme = (m: Mouvement[], etat: Mouvement['etat']) => m.filter((x) => x.etat === etat).reduce((s, x) => s + x.garde, 0)
/** Total gelé (point rouge de l'onglet Argent). */
export const argentGele = () => somme(mouvements(), 'gele')

const proprio = (quoi: string) => {
  if (!estProprietaire()) throw new ReserveAuProprietaire(quoi)
}
const essaiDe = (ref: string) => COMMANDES.find((c) => c.ref === ref)!

/** Vendredi du prochain versement et ce qu'il emporte (sans minimum, Q-12). */
export function prochainVendredi(m: Mouvement[] = mouvements()) {
  const t = maintenant()
  const n = numeroActif()
  // Numéro en revue : rien ne part avant le vendredi qui suit la revue (VD09-R32).
  const base = vendrediDeVersement(t, PV)
  const vendredi = n.revue && vendrediDeVersement(n.revue.jusqua, PV) > base ? vendrediDeVersement(n.revue.jusqua, PV) : base
  const montant = montantDu(vendredi, gainsFiges(), PV) // une somme gelée ne part pas (gel passé au calcul)
  const couvertes = m.filter((x) => (x.etat === 'a_verser' || x.etat === 'se_libere') && x.vendredi !== null && x.vendredi <= vendredi).sort((a, b) => a.liberation! - b.liberation!)
  const dejaLibere = couvertes.filter((x) => x.etat === 'a_verser').reduce((s, x) => s + x.garde, 0)
  const aVenir = couvertes.filter((x) => x.etat === 'se_libere')
  const passeA = aVenir.length ? { montant: dejaLibere + aVenir[0].garde, ref: aVenir[0].ref, a: aVenir[0].liberation! } : null
  return { vendredi, heureLimite: heureLimite(vendredi, PV), montant, dejaLibere, couvertes, passeA }
}

function venduLePlus(): CommandeEssai | null {
  const n = new Map<string, number>()
  for (const c of COMMANDES) if (!c.payableAuRetrait) n.set(c.article, (n.get(c.article) ?? 0) + c.quantite)
  const best = [...n].sort((a, b) => b[1] - a[1])[0]
  return best ? COMMANDES.find((c) => c.article === best[0])! : null
}

function gelees(m: Mouvement[]) {
  const e = etatCommandes.lire()
  return m.filter((x) => x.etat === 'gele').map((x) => ({ x, c: essaiDe(x.ref), etape: e[x.ref].etape }))
}

function resume(): ResumeArgent {
  proprio('argent')
  const m = mouvements()
  const t = maintenant()
  const r = resumeCalcule(gainsFiges(), t) // une seule source (ARG-01)
  const { aVerser, seLibere, enCours, gele } = r
  const p = prochainVendredi(m)
  const n = numeroActif()
  const mois = jourDe(t).slice(0, 7)
  const liberesDuMois = m.filter((x) => (x.etat === 'verse' || x.etat === 'a_verser') && x.liberation !== null && jourDe(x.liberation).slice(0, 7) === mois)
  const reprisesDuMois = REPRISES.filter((r) => jourDe(r.liberation).slice(0, 7) === mois)
  const seLib = m.filter((x) => x.etat === 'se_libere').sort((a, b) => a.liberation! - b.liberation!)
  const enC = m.filter((x) => x.etat === 'en_cours').sort((a, b) => a.payeeA - b.payeeA)
  const g = gelees(m)
  const exemple = venduLePlus()
  const a = exemple && ARTICLES[exemple.article]
  const decouverte = decouverteActive(BOUTIQUE.premiereCommandePayee, jourDe(t), COMMANDES.filter((c) => !c.payableAuRetrait).length, PC)
  return {
    aVerser,
    seLibere,
    enCours,
    gele,
    enCirculation: r.enCirculation,
    verifications: { montant: r.verifications.amount, nombre: r.verifications.count },
    prochainVersement: p.montant || aVerser ? { vendredi: p.vendredi, montant: p.montant, numero: `${n.operateur} ${n.masque}`, heureLimite: p.heureLimite } : null,
    passeA: p.passeA,
    lignes: {
      seLibere: seLib.length ? { ref: seLib[0].ref, a: seLib[0].liberation!, autres: seLib.length - 1 } : null,
      enCours: enC.length ? { ref: enC[0].ref, autres: enC.length - 1 } : null,
      gele: { litiges: g.filter((y) => y.etape === 'litige').length, retours: g.filter((y) => y.etape === 'retour').length, verifications: r.verifications.count },
    },
    gagneDepuisInscription: m.filter((x) => x.etat === 'verse' || x.etat === 'a_verser').reduce((s, x) => s + x.garde, 0) + REPRISES.reduce((s, r) => s + r.garde, 0),
    gardeDuMois: liberesDuMois.reduce((s, x) => s + x.garde, 0) + reprisesDuMois.reduce((s, r) => s + r.garde, 0),
    ventesDuMois: liberesDuMois.reduce((s, x) => s + x.prix, 0),
    exemple: a ? { prix: a.prix, garde: calculerCommission([{ famille: familleDe(a.categorie, PC), prixUnitaire: a.prix, quantite: 1, madeInCameroon: a.madeInCameroon }], BOUTIQUE.palier, decouverte, PC).garde } : null,
    numero: { operateur: n.operateur, masque: n.masque, enRevue: !!n.revue },
    calculeA: t,
    mouvements: m,
  }
}

function seLibereDetail(): SeLibere {
  proprio('argent')
  const m = mouvements()
  const n = numeroActif()
  return {
    palier: BOUTIQUE.palier,
    delais: { standard: PV.libStandardJours, or: PV.libOrJours, carte: PV.libCarteJours },
    fenetreRetourJours: PV.fenetreRetourJours,
    numero: { operateur: n.operateur, masque: n.masque },
    cartes: m
      .filter((x) => x.etat === 'se_libere')
      .sort((a, b) => a.liberation! - b.liberation!)
      .map((x) => {
        const c = essaiDe(x.ref)
        return { ref: x.ref, article: x.article, fermeture: c.fermetureA!, liberation: x.liberation!, vendredi: x.vendredi!, garde: x.garde, carte: c.moyen === 'carte' }
      }),
    enCours: m
      .filter((x) => x.etat === 'en_cours')
      .sort((a, b) => a.payeeA - b.payeeA)
      .map((x) => ({ ref: x.ref, article: x.article, garde: x.garde, payeeA: x.payeeA })),
  }
}

function geleDetail(): Gele {
  proprio('argent')
  const litigeH = nombreDe('LIT-VENDEUR-H', HEURES)
  const inspectionH = nombreDe('RET-INSPECT-H', HEURES)
  const cartes = gelees(mouvements())
    .map(({ x, c, etape }) => {
      if (etape === 'litige' && c.litige) return { type: 'litige' as const, ref: x.ref, garde: x.garde, article: x.article, motif: c.litige.motif, echeance: c.litige.echeance, arrivee: null }
      if (etape === 'retour' && c.retour) {
        const arrivee = debutDuJour(c.retour.arrivee.jour) + Number(c.retour.arrivee.creneau[1].slice(0, 2)) * HEURE
        return { type: 'retour' as const, ref: x.ref, garde: x.garde, article: x.article, motif: c.retour.motif, echeance: arrivee + inspectionH * HEURE, arrivee }
      }
      return { type: 'verification' as const, ref: x.ref, garde: x.garde, article: x.article, motif: 'Vérification en cours', echeance: null, arrivee: null }
    })
    .sort((a, b) => (a.echeance ?? Infinity) - (b.echeance ?? Infinity))
  return {
    total: cartes.reduce((s, c) => s + c.garde, 0),
    cartes,
    delais: { litigeHeures: litigeH, inspectionHeures: inspectionH, verificationHeures: nombreDe('VD-GEL-ANTIFRAUDE', /^motif écrit sous (\d+) h\b/) },
    remboursementAuto: { standard: nombreDe('LIT-AUTO-STD', FRANCS), tresFiable: nombreDe('LIT-AUTO-ELEVE', FRANCS) },
  }
}

/** Mois civils de la signature du contrat jusqu'au mois en cours (« 2026-08 », « 2026-09 »). */
export function moisDepuisSignature(): string[] {
  const fin = jourDe(maintenant()).slice(0, 7)
  const out: string[] = []
  for (let j = BOUTIQUE.signature.slice(0, 7) + '-01'; j.slice(0, 7) <= fin; j = ajouterMois(j, 1)) out.push(j.slice(0, 7))
  return out
}

function lignesDuMois(m: Mouvement[], mois: string): LigneGain[] {
  const ventes: LigneGain[] = m
    .filter((x) => (x.etat === 'verse' || x.etat === 'a_verser') && x.liberation !== null && jourDe(x.liberation).slice(0, 7) === mois)
    .map((x) => ({ type: 'vente', ref: x.ref, article: x.article, prix: x.prix, garde: x.garde, liberation: x.liberation!, motif: null }))
  return [...ventes, ...REPRISES.filter((r) => jourDe(r.liberation).slice(0, 7) === mois)].sort((a, b) => b.liberation - a.liberation)
}

/** Ventes libérées d'un mois (prix payés), même base que Mes gains ; par défaut le mois en cours (Q-83). */
export const ventesLibereesDuMois = (mois = jourDe(maintenant()).slice(0, 7)) =>
  lignesDuMois(mouvements(), mois)
    .filter((l) => l.type === 'vente')
    .reduce((s, l) => s + l.prix, 0)

function gainsDetail(mois: string): Gains {
  proprio('argent')
  const m = mouvements()
  const t = maintenant()
  const lignes = lignesDuMois(m, mois)
  const parProduit = new Map<string, { titre: string; dessin: string; quantite: number; garde: number }>()
  for (const l of lignes.filter((x) => x.type === 'vente')) {
    const p = parProduit.get(l.article.titre) ?? { titre: l.article.titre, dessin: l.article.dessin, quantite: 0, garde: 0 }
    p.quantite += essaiDe(l.ref).quantite
    p.garde += l.garde
    parProduit.set(l.article.titre, p)
  }
  const parJour = new Map<string, number>()
  for (const l of lignes.filter((x) => x.type === 'vente')) parJour.set(jourDe(l.liberation), (parJour.get(jourDe(l.liberation)) ?? 0) + l.garde)
  const meilleur = [...parJour].sort((a, b) => b[1] - a[1])[0]
  const gagne = m.filter((x) => x.etat === 'verse' || x.etat === 'a_verser').reduce((s, x) => s + x.garde, 0) + REPRISES.reduce((s, r) => s + r.garde, 0)
  const ceSoir = m.filter((x) => x.etat === 'se_libere' && x.liberation !== null && jourDe(x.liberation) === jourDe(t))
  const p = prochainVendredi(m)
  return {
    mois,
    total: lignes.reduce((s, l) => s + l.garde, 0),
    ventes: lignes.reduce((s, l) => s + l.prix, 0),
    parProduit: [...parProduit.values()].sort((a, b) => b.garde - a.garde),
    lignes,
    meilleurJour: meilleur && parJour.size > 1 ? { jour: meilleur[0], garde: meilleur[1] } : null,
    historique: moisDepuisSignature().map((mo) => {
      const l = lignesDuMois(m, mo)
      return { mois: mo, garde: l.reduce((s, x) => s + x.garde, 0), ventes: l.filter((x) => x.type === 'vente').length }
    }),
    gagne,
    ceSoir: ceSoir.length ? { montant: gagne + ceSoir.reduce((s, x) => s + x.garde, 0), refs: ceSoir.map((x) => x.ref), a: Math.max(...ceSoir.map((x) => x.liberation!)) } : null,
    dejaVerses: somme(m, 'verse'),
    aVerser: somme(m, 'a_verser') ? { vendredi: p.vendredi, montant: somme(m, 'a_verser') } : null,
    impayes: 0, // toutes les ventes sont payées d'avance ; un paiement au retrait non payé ne coûte rien
    transport: 0, // livraison gérée par BelivaY
  }
}

const premierDuMoisSuivant = (mois: string) => ajouterMois(mois + '-01', 1)

function documentsDetail(): Documents {
  proprio('documents')
  const mois = moisDepuisSignature()
  const courant = mois[mois.length - 1]
  return {
    releves: [...mois].reverse().map((p) => (p === courant ? { periode: p, statut: 'open', emisLe: null, formats: ['csv'] } : { periode: p, statut: 'issued', emisLe: premierDuMoisSuivant(p), formats: ['pdf', 'csv'] })),
    recus: { nombre: COMMANDES.length, refs: [...COMMANDES].sort((a, b) => a.payeeA - b.payeeA).map((c) => c.ref) }, // par date de paiement : premier et dernier reçus
    factures: {
      commission: [...mois].reverse().map((p) => (p === courant ? { periode: p, statut: 'pending', emisLe: null, disponibleLe: premierDuMoisSuivant(p) } : { periode: p, statut: 'issued', emisLe: premierDuMoisSuivant(p), disponibleLe: null })),
      abonnement: [],
      visibilite: [],
    },
    entreprise: { rccm: BOUTIQUE.statut !== 'particulier', niu: BOUTIQUE.statut !== 'particulier' },
    contrat: { signeLe: BOUTIQUE.signature },
  }
}

function contenu(d: DemandeDocument): ContenuDocument {
  proprio('documents')
  const m = mouvements()
  const titulaire = `${BOUTIQUE.titulaire.prenom} ${BOUTIQUE.titulaire.nom}`
  if (d.type === 'releve') {
    const l = lignesDuMois(m, d.periode)
    return {
      titre: 'Relevé des ventes',
      sousTitre: `${BOUTIQUE.nom} · ${titulaire} · ${d.periode}`,
      colonnes: ['Commande', 'Libérée le', 'Produit', 'Prix de vente', 'Vous gardez'],
      lignes: l.map((x) => [x.ref, jourDe(x.liberation), x.type === 'reprise' ? `Reprise · ${x.motif ?? ''}` : `${x.article.titre} · ${x.article.variante}`, x.prix, x.garde]),
      totaux: ['Total', '', '', l.reduce((s, x) => s + x.prix, 0), l.reduce((s, x) => s + x.garde, 0)],
      mentions: ['Versements sans frais, chaque vendredi avant 12 h.', 'Aucune donnée du client.'],
    }
  }
  if (d.type === 'facture') {
    const l = lignesDuMois(m, d.periode).filter((x) => x.type === 'vente')
    const r = l.map((x) => ({ x, f: figee(essaiDe(x.ref)) }))
    const complet = BOUTIQUE.statut !== 'particulier'
    return {
      titre: 'Facture des commissions',
      sousTitre: `${BOUTIQUE.nom} · ${titulaire} · ${d.periode}`,
      colonnes: ['Commande', 'Libérée le', 'Prix de vente', 'Commission HT', 'TVA', 'Total TTC'],
      lignes: r.map(({ x, f }) => [x.ref, jourDe(x.liberation), x.prix, f.commission, f.tva, f.commission + f.tva]),
      totaux: ['Total', '', r.reduce((s, y) => s + y.x.prix, 0), r.reduce((s, y) => s + y.f.commission, 0), r.reduce((s, y) => s + y.f.tva, 0), r.reduce((s, y) => s + y.f.commission + y.f.tva, 0)],
      mentions: [
        "Émise le 1er du mois suivant. Prélevée à la libération de chaque vente, jamais avant.",
        complet ? 'Dénomination, forme, capital, siège, RCCM, NIU et TVA portés sur la facture.' : 'Facture simplifiée : déclarez votre RCCM et votre NIU pour une facture complète.',
      ],
    }
  }
  if (d.type === 'contrat') {
    const prix = [10000, 50000, 200000]
    return {
      titre: 'Contrat vendeur · part que vous gardez',
      sousTitre: `${titulaire} · signé électroniquement le ${BOUTIQUE.signature} · palier ${BOUTIQUE.palier}`,
      colonnes: ['Catégorie', ...prix.map((p) => `${p.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`)],
      lignes: Object.keys(PC.familles).map((cat) => [
        cat,
        ...prix.map((p) => {
          const g = calculerCommission([{ famille: familleDe(cat, PC), prixUnitaire: p, quantite: 1, madeInCameroon: false }], BOUTIQUE.palier, false, PC).garde
          return `${pourCentAffiche(g, p)} %`
        }),
      ]),
      totaux: null,
      mentions: ['Part gardée sur une vente, TVA comprise, hors offre de découverte.', 'Versements chaque vendredi avant 12 h, sans frais ni minimum.'],
    }
  }
  const v = versementsPasses(d.periode)
  return {
    titre: 'Historique des versements',
    sousTitre: `${titulaire} · ${d.periode === 'tout' ? 'depuis la signature' : d.periode + ' mois'}`,
    colonnes: ['Vendredi', 'Référence', 'Commandes', 'Montant'],
    lignes: v.map((x) => [x.vendredi, x.reference, x.commandes.map((c) => c.ref).join(' '), x.montant]),
    totaux: ['Total', '', '', v.reduce((s, x) => s + x.montant, 0)],
    mentions: ['0 F de frais.'],
  }
}

export const demoArgent: DomaineArgent = {
  resume: async () => repondre(resume()),
  seLibere: async () => repondre(seLibereDetail()),
  gele: async () => repondre(geleDetail()),
  gains: async (mois) => repondre(gainsDetail(mois)),
  documents: async () => repondre(documentsDetail()),
  document: async (d) => repondre(contenu(d)),
}
