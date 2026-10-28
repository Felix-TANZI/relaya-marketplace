// DONNÉES DE DÉMONSTRATION — domaine « paliers » (GET /tiers, VD10-R08) : conditions lues au registre (VD-PAL-*),
// ce que chaque palier fait garder sur l'ITEL AC52 et le gain sur un iPhone CALCULÉS (src/calculs/commission.ts,
// offre de découverte comprise), libération lue au registre (VD-LIB-*), projection donnée par le service Scores
// (« 3 commandes sans incident mènent à environ 66 »), descente proposée lue dans le domaine trust.
import { calculerCommission20 } from './commission20'
import type { Condition, DomainePaliers, LignePalier, MonPalier } from '../donnees/domaines/paliers'
import { decouverteActive, familleDe, finDecouverte } from '../calculs/commission'
import { alerteDeSeuil, palierDeLancement, palierSuivant } from '../calculs/paliers'
import { Dec } from '../calculs/argent'
import { PALIERS, PARAMETRES, REGISTRE, type Palier } from '../calculs/registre'
import { ajouterJours, ajouterMois, debutDuJour, HEURE, jourDe } from '../calculs/temps'
import { maintenant } from './horloge'
import { ARTICLES, BOUTIQUE } from './jeu-essai'
import { commandesComptees } from './commandes'
import { litigesEnCours } from './litiges'
import { produitsActifs } from './produits'
import { decisionEnCours } from './trust'
import { estProprietaire } from './session'
import { repondre } from './stockage'

const nombre = (code: string, motif: RegExp) => {
  const m = motif.exec(REGISTRE[code] ?? '')
  if (!m) throw new Error(`${code} : forme inattendue`)
  return Number(m[1])
}
const REMPLACEMENT_MIN = nombre('REMPL-TRUST-MIN', /^(\d+)$/)
// Support vendeur : première réponse en 2 h pour tous les paliers, de 7 h à 21 h (DP-12, DP-56 Q-47) ; le Platine a
// en plus un responsable de compte. Valeur de la console (aucun code au registre vendeur).
const SUPPORT_HEURES = 2

// Projection du service Scores (VD10-R07, REFVD-R204) : commandes sans incident qui amènent le score au seuil, score
// d'arrivée, et les deux issues des litiges en cours (gagnés, perdus).
const PROJECTION = { commandes: 3, scoreApres: 66, siGagnes: 64, siPerdus: 55 }

const vir = (n: number) => n.toFixed(1).replace('.', ',')

function monPalier(): MonPalier {
  const proprio = estProprietaire() // l'accès Préparation ne reçoit aucun montant (DP-55, VD-02 p8)
  const p = PARAMETRES.paliers
  const pc = PARAMETRES.commission
  const pv = PARAMETRES.versements
  const jour = jourDe(maintenant())
  const actuel = BOUTIQUE.palier
  const suivant = palierSuivant(actuel)
  const score = BOUTIQUE.trustScore
  const arrondi = Math.round(score)
  const c = suivant ? p.conditions[suivant as 'Argent' | 'Or' | 'Platine'] : null
  const comptees = commandesComptees()
  const dec = decouverteActive(BOUTIQUE.premiereCommandePayee, jour, comptees, pc)
  const itel = ARTICLES['itel-noir']
  const iphone = ARTICLES.iphone
  const garde = (a: typeof itel, palier: Palier) => calculerCommission20([{ famille: familleDe(a.categorie, pc), prixUnitaire: a.prix, madeInCameroon: a.madeInCameroon }], palier, dec, pc).garde
  const liberation = (palier: Palier) => (palier === 'Or' || palier === 'Platine' ? pv.libOrJours : pv.libStandardJours)

  const conditions: Condition[] = []
  if (c) {
    conditions.push({ cle: 'score', libelle: `Trust Score ${c.trustScore} au moins`, valeur: String(arrondi), tenue: score >= c.trustScore, manque: score >= c.trustScore ? null : `+ ${Math.max(1, c.trustScore - arrondi)}` })
    if (c.commandesLivrees) conditions.push({ cle: 'livrees', libelle: `${c.commandesLivrees} commandes livrées`, valeur: String(BOUTIQUE.commandesLivrees), tenue: BOUTIQUE.commandesLivrees >= c.commandesLivrees, manque: BOUTIQUE.commandesLivrees >= c.commandesLivrees ? null : `+ ${c.commandesLivrees - BOUTIQUE.commandesLivrees}` })
    if (Number(c.note.texte()) > 0) conditions.push({ cle: 'note', libelle: `Note moyenne ${vir(Number(c.note.texte()))} au moins`, valeur: vir(BOUTIQUE.note), tenue: BOUTIQUE.note >= Number(c.note.texte()), manque: null })
    if (c.visite) conditions.push({ cle: 'visite', libelle: 'Visite de la boutique par l’agent de zone', valeur: 'à prévoir', tenue: false, manque: null })
    if (c.audit) conditions.push({ cle: 'audit', libelle: 'Audit chaque trimestre', valeur: 'à prévoir', tenue: false, manque: null })
  }
  const livreesManquantes = c ? Math.max(0, c.commandesLivrees - BOUTIQUE.commandesLivrees) : 0
  const toutTenu = conditions.length > 0 && conditions.every((x) => x.tenue)
  const litiges = litigesEnCours().length

  // Alerte avant un seuil (VD-ALERTE-SEUIL, DP-57 A-5) : montée vers le seuil suivant, descente sous le seuil actuel.
  const seuilActuel = actuel === 'Bronze' ? null : p.conditions[actuel as 'Argent' | 'Or' | 'Platine'].trustScore
  const a = alerteDeSeuil(actuel, Dec.de(String(score)), p)
  const alerte: MonPalier['alerte'] = a ? { sens: a.sens === 'montée' ? 'montee' : 'descente', seuil: a.seuil, points: a.pointsAffiches } : null

  const d = decisionEnCours()
  const descente = d && d.type === 'descente' && d.palierVise ? { decisionId: d.id, vers: d.palierVise, motif: d.motif, effetA: d.effetA, contestee: !!d.contestation, reponseAvant: d.contestation?.reponseAvant ?? null } : null

  const gardeActuel = garde(itel, actuel)
  const rangActuel = PALIERS.indexOf(actuel)
  const libelles: Record<Palier, string> = {
    Bronze: 'Pièce d’identité et selfie validés',
    Argent: '',
    Or: '',
    Platine: '',
  }
  for (const nom of ['Argent', 'Or', 'Platine'] as const) {
    const k = p.conditions[nom]
    libelles[nom] = [`Trust Score ${k.trustScore}`, k.commandesLivrees ? `${k.commandesLivrees} commandes livrées` : '', Number(k.note.texte()) > 0 ? `note ${vir(Number(k.note.texte()))}` : '', k.visite ? 'visite de la boutique' : '', k.audit ? 'audit chaque trimestre' : '']
      .filter(Boolean)
      .join(', ')
  }
  const manqueSuivant = (() => {
    const pts = conditions.find((x) => x.cle === 'score' && !x.tenue)
    const parts = [pts ? `${pts.manque!.replace('+ ', '')} points` : '', livreesManquantes ? `${livreesManquantes} commandes livrées` : ''].filter(Boolean)
    return parts.length ? `Il vous manque ${parts.join(' et ')}` : null
  })()
  const paliers: LignePalier[] = PALIERS.map((pal, i) => {
    const g = garde(itel, pal)
    return {
      palier: pal,
      conditions: libelles[pal],
      garde: proprio ? g : null,
      gardeExemple: proprio ? garde(iphone, pal) : null,
      gainSurActuel: proprio ? (i > rangActuel ? g - gardeActuel : 0) : null,
      liberationJours: liberation(pal),
      responsableDeCompte: pal === 'Platine',
      vous: pal === actuel,
      manque: pal === suivant ? manqueSuivant : null,
    }
  })

  const lancement = palierDeLancement(BOUTIQUE.signature, jour, produitsActifs(), p)
  return {
    palier: actuel,
    score,
    calculeA: debutDuJour(jour) + 3 * HEURE,
    suivant,
    seuilSuivant: c?.trustScore ?? null,
    seuilActuel,
    conditions,
    commandesAFaire: c ? Math.max(livreesManquantes, PROJECTION.commandes) : null,
    projection: c ? { commandes: Math.max(livreesManquantes, PROJECTION.commandes), scoreApres: PROJECTION.scoreApres, litigesEnCours: litiges, siGagnes: litiges ? PROJECTION.siGagnes : null, siPerdus: litiges ? PROJECTION.siPerdus : null } : null,
    montee: toutTenu ? { date: ajouterJours(jour, p.monteeJours) } : null,
    descente,
    alerte,
    reference: !proprio ? null : { titre: itel.titre, prix: itel.prix, actuel: gardeActuel, suivant: suivant ? garde(itel, suivant) : null },
    exemple: proprio && suivant ? { titre: iphone.titre, prix: iphone.prix, gain: garde(iphone, suivant) - garde(iphone, actuel) } : null,
    liberationJours: { actuel: liberation(actuel), suivant: suivant ? liberation(suivant) : null },
    supportHeures: SUPPORT_HEURES,
    decouverte: dec ? { commandes: comptees, max: pc.decouverteCommandes, fin: finDecouverte(BOUTIQUE.premiereCommandePayee, pc) } : null,
    lancement: lancement ? { palier: lancement, jusqua: ajouterMois(BOUTIQUE.signature, p.lancementMois), produitsActifs: produitsActifs() } : null,
    montee14: p.monteeJours,
    descente14: p.descenteJours,
    remplacementMin: REMPLACEMENT_MIN,
    paliers,
  }
}

export const demoPaliers: DomainePaliers = { monPalier: () => repondre(monPalier()) }
