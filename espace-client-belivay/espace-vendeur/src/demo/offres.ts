// DONNÉES DE DÉMONSTRATION — domaine « offres » : « Nouveau produit » sur une seule page (DP-58, interface réelle) :
// recherche obligatoire dans le catalogue (fiches de src/demo/produits.ts) et dans mes produits, code-barres,
// reconnaissance d'image ; brouillon sur une fiche du catalogue ou produit nouveau (catégorie et description proposées,
// doublon rattaché, FCH-02) ; photos réelles ordonnées ; aperçu « Vous gardez » pendant la saisie ; prix barré et fin
// de promotion (OFR-05) ; prix conseillé (DP-56, Q-36) ; publication vérifiée sous 48 h (prix minimum publiable et
// plafond de démarrage de src/calculs : « BelivaY ne perd jamais », DP-55, PRX-09) ; proposition de description relue
// par BelivaY (Q-34). Les offres vivent dans le magasin de src/demo/produits.ts.
import type { Apercu, DomaineOffres, FicheCatalogue, PhotoPrise, Publication, Reglages, Suggestion } from '../donnees/domaines/offres'
import type { PhotoReelle } from '../donnees/domaines/produits'
import { decouverteActive, familleDe, plagesCommissionMinimale, prixMinimumPubliable } from '../calculs/commission'
import { plafondDeDemarrage } from '../calculs/demarrage'
import { PARAMETRES, REGISTRE } from '../calculs/registre'
import { HEURE, JOUR, jourDe } from '../calculs/temps'
import { maintenant } from './horloge'
import { defautsLivraison } from '../pages/AJ-A/donnees/defauts' // AJ-A : défauts de Livraison et colis (INTEGRATION.md)
import { BOUTIQUE } from './jeu-essai'
import { commandesComptees } from './commandes'
import { estProprietaire, ouvertureEnCours } from './session'
import { repondre } from './stockage'
import {
  CATALOGUE,
  NOM_MIN,
  ZONES,
  LIVRAISON_ZONE,
  etatOffres,
  ficheDe,
  manquesDe,
  gardeOuNull,
  journal,
  nouvelId,
  partDe,
  premierDans,
  prixConseille,
  reserve,
  vue,
  type FicheDemo,
  type OffreEtat,
} from './produits'

// Valeurs du registre vendeur (parametres-vendeur.json ; en API : GET /config). Données de démonstration pour la grille
// des colis (M03 attendu) : seules les règles (poids facturé, seuils de 5 kg et 50 cm) comptent.
// Valeurs de console lues au registre (DP-57 : VD-ETATS-PRODUIT, VD-PREPARATION-DELAIS, VD-PHOTOS, VD-FICHE-DELAI,
// VD-MODERATION, VD-COLIS, VD-RAPPEL-PRIX, VD-PRIX-AUTO, VD-DOUBLON).
const PC = PARAMETRES.console
const REGLAGES = {
  etats: PC.etatsProduit,
  delaisH: PC.preparation.choixH,
  delaiDefautH: PC.preparation.defautH,
  photosMin: PC.photos.min,
  photosMax: PC.photos.max,
  photoMinPx: PC.photos.minPx,
  compression: { cote: PC.photos.cotePx, qualite: PC.photos.qualite },
  ficheDelaiH: PC.fiche.delaiH,
  fichePrioDelaiH: PC.fiche.prioDelaiH,
  fichePrioPrix: PC.fiche.prioPrix,
  moderationH: PC.moderationH,
  colis: { seuilKg: PC.colis.seuilKg, seuilCm: PC.colis.seuilCm, diviseur: PC.colis.diviseur, classes: PC.colis.classes },
  rappelJours: PC.rappelPrixJours,
  prixAutoPct: PC.prixAutoBaissePct,
  nomMin: NOM_MIN,
  rechercheMin: 3, // DP-58 : « Ajouter un nouveau produit » s'active après une recherche de 3 caractères ou un scan
  promoRemiseMin: 10, // OFR-05 : remise réelle de 10 % au moins
  promoJoursMax: 30, // valeur de départ proposée, réglable en console
  noteMax: 300,
}
const FICHE_DOUBLON = PC.doublonPourCent / 100 // VD-DOUBLON (Q-96)
const DESCRIPTION_MIN = 20
const DESCRIPTION_MAX = 2000
/** Catégorie proposée d'après les mots du nom (service de catalogue ; démonstration : quelques mots par catégorie). */
const MOTS_CATEGORIE: [string, string[]][] = [
  ['Électronique', ['telephone', 'phone', 'smartphone', 'iphone', 'samsung', 'itel', 'tecno', 'infinix', 'chargeur', 'cable', 'ecouteur', 'ecouteurs', 'casque', 'enceinte', 'coque', 'batterie', 'powerbank', 'ordinateur', 'laptop', 'tablette', 'tv', 'television', 'montre', 'usb', 'airpods', 'radio']],
  ['Électroménager', ['frigo', 'refrigerateur', 'congelateur', 'ventilateur', 'climatiseur', 'mixeur', 'blender', 'fer', 'repasser', 'micro', 'ondes', 'cuisiniere', 'four', 'bouilloire', 'lave']],
  ['Mode Femme', ['robe', 'jupe', 'pagne', 'wax', 'sac', 'escarpin', 'perruque', 'kaba', 'foulard', 'sandale', 'chemisier']],
  ['Mode Homme', ['chemise', 'pantalon', 'costume', 'boubou', 'basket', 'baskets', 'chaussure', 'chaussures', 'ceinture', 'jean', 'tee', 'polo', 'casquette']],
  ['Beauté & Cosmétique', ['creme', 'savon', 'parfum', 'huile', 'lait', 'shampoing', 'beurre', 'karite', 'maquillage', 'rouge', 'vernis', 'lotion', 'gel']],
  ['Supermarché', ['riz', 'huile', 'sucre', 'farine', 'lait', 'cafe', 'the', 'eau', 'jus', 'biscuit', 'conserve', 'spaghetti', 'sel', 'cube']],
  ['Maison & Déco', ['rideau', 'drap', 'coussin', 'tapis', 'lampe', 'marmite', 'casserole', 'assiette', 'verre', 'matelas', 'chaise', 'table', 'miroir']],
  ['Sport & Loisirs', ['ballon', 'maillot', 'velo', 'haltere', 'raquette', 'sport', 'football', 'jeu']],
  ['Bébé & Enfant', ['bebe', 'couche', 'couches', 'biberon', 'poussette', 'enfant', 'jouet', 'porte']],
  ['Animaux', ['chien', 'chat', 'croquette', 'croquettes', 'aquarium', 'poisson']],
  ['Livres & Médias', ['livre', 'roman', 'cahier', 'manuel', 'dictionnaire', 'dvd', 'bd']],
]
const MARQUES = ['itel', 'tecno', 'infinix', 'samsung', 'apple', 'oraimo', 'nokia', 'xiaomi', 'vlisco', 'hp', 'lenovo', 'nike', 'adidas', 'binatone', 'lg']

/** Recherches sans résultat déjà faites dans la zone (30 jours glissants) : données de démonstration. */
const CHERCHE_ZONE: Record<string, number> = { 'chargeur itel': 14, chargeur: 9, 'ecouteurs sans fil': 6 }

const nrm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const mots = (s: string) => nrm(s).split(' ').filter(Boolean)
/** Similarité cosinus sur les mots des titres normalisés (Q-96). */
function similarite(a: string, b: string): number {
  const ca = new Map<string, number>()
  const cb = new Map<string, number>()
  for (const m of mots(a)) ca.set(m, (ca.get(m) ?? 0) + 1)
  for (const m of mots(b)) cb.set(m, (cb.get(m) ?? 0) + 1)
  let pv = 0
  for (const [m, v] of ca) pv += v * (cb.get(m) ?? 0)
  const na = Math.sqrt([...ca.values()].reduce((s, v) => s + v * v, 0))
  const nb = Math.sqrt([...cb.values()].reduce((s, v) => s + v * v, 0))
  return na && nb ? pv / (na * nb) : 0
}

const decouverte = () => decouverteActive(BOUTIQUE.premiereCommandePayee, jourDe(maintenant()), commandesComptees(), PARAMETRES.commission)
const plafond = () => plafondDeDemarrage(BOUTIQUE.commandesLivrees, PARAMETRES.paliers)

/** « Vous gardez X % à Y F » d'un résultat (NOF-05) : au milieu du prix du marché, arrondi aux 500 F supérieurs. */
function versFiche(f: FicheDemo): FicheCatalogue {
  const proprio = estProprietaire()
  const [min, max] = [Math.min(...f.marche.offres), Math.max(...f.marche.offres)]
  const prixRef = Math.ceil((min + max) / 2 / 500) * 500
  const garde = gardeOuNull(prixRef, f.categorie, false)
  return {
    id: f.id,
    titre: f.titre,
    marque: f.marque,
    categorie: f.categorie,
    rayon: f.rayon,
    dessin: f.dessin,
    variantes: f.variantes,
    fourchette: proprio ? [min, max] : null,
    vendeurs: f.marche.offres.length,
    part: proprio && garde !== null ? { pourCent: Math.round((100 * garde) / prixRef), prixRef } : null,
    dejaVendues: etatOffres
      .lire()
      .offres.filter((o) => o.ficheId === f.id && o.etat !== 'brouillon')
      .map((o) => o.variante),
  }
}

/** Lieu de la prise en mots : le quartier de la boutique quand la photo est prise à moins de 3 km, sinon la position. */
function lieuDe(pos: PhotoPrise['position']): string | null {
  if (!pos) return null
  const km = Math.hypot((pos.lat - BOUTIQUE.position.lat) * 111, (pos.lon - BOUTIQUE.position.lon) * 111 * Math.cos((pos.lat * Math.PI) / 180))
  if (km < 3) return BOUTIQUE.quartier.split(' / ').pop() ?? BOUTIQUE.quartier
  return `${pos.lat.toFixed(3)}, ${pos.lon.toFixed(3)}`
}

/** Classe du colis (VD08-R22) : poids facturé = max(poids ; volume ÷ 5 000) et plus grande dimension. */
function classeColis(poids: number | null, dims: [number, number, number] | null, defaut: OffreEtat['colis']): OffreEtat['colis'] {
  if (poids === null && dims === null) return defaut
  const facture = Math.max(poids ?? 0, dims ? (dims[0] * dims[1] * dims[2]) / REGLAGES.colis.diviseur : 0)
  const grand = dims ? Math.max(...dims) : 0
  const c = REGLAGES.colis.classes.find((x) => facture <= x.kg && grand <= x.cm)
  return (c?.classe ?? 'XXL') as OffreEtat['colis']
}

const flashOuvert = () => REGISTRE['FF-FLASH']?.startsWith('ouvert') ?? false

function publicationDe(o: OffreEtat, enFile: boolean, rattache = false): Publication {
  const f = ficheDe(o.ficheId)
  const premiers = f && o.prix !== null ? premierDans(f, o.prix) : []
  const n = premiers.filter(Boolean).length
  const meilleur = !!premiers.length && n === premiers.length
  return {
    offreId: o.id,
    titre: f?.titre ?? o.demande?.titre ?? '',
    variante: o.variante,
    prix: estProprietaire() ? o.prix : null,
    reponseAvant: o.verificationAvant ?? maintenant() + REGLAGES.moderationH * HEURE,
    meilleurPrix: meilleur,
    zonesPremier: n,
    zones: premiers.length,
    avantages: meilleur ? ['badge', ...(flashOuvert() ? (['flash'] as const) : []), 'vitrine'] : [],
    enFile,
    nouveau: !o.ficheId,
    rattache,
  }
}

const trouver = (id: string) => etatOffres.lire().offres.find((o) => o.id === id)
const estOffre = (cible: string) => etatOffres.lire().offres.some((o) => o.id === cible)
const COORDONNEES = /(\+?\d[\d\s.-]{7,}\d)|(@)|(https?:|www\.)|(whatsapp)/i
const categorieDe = (o: OffreEtat) => ficheDe(o.ficheId)?.categorie ?? o.demande?.categorie ?? 'Électronique'
/** Brouillon neuf : les réglages de la boutique sont posés (REFVD-R254) ; l'état de l'article reste à choisir. */
function brouillonVide(id: string, ficheId: string | null, variante: string): OffreEtat {
  const f = ficheDe(ficheId)
  return {
    id,
    ficheId,
    demande: null,
    variante,
    etat: 'brouillon',
    etatArticle: '',
    prix: null,
    stock: 0,
    seuilAlerte: 5,
    delaiPreparationH: defautsLivraison().delaiH, // AJ-A : défauts de la boutique (Livraison et colis)
    colis: f?.colis ?? defautsLivraison().colis,
    poidsKg: null,
    dimensionsCm: null,
    paiementAuRetrait: defautsLivraison().paiementAuRetrait, // selon la boutique (Livraison et colis ; accepté par défaut, OFR-02)
    madeInCameroon: false,
    prixAuto: false,
    plancherPrive: null,
    prixBarre: null,
    finPromo: null,
    noteVendeur: '',
    photos: [],
    envoyeeA: null,
    verificationAvant: null,
    verifieeA: null,
    motifRefus: null,
    ficheDemandee: null,
    descriptionProposee: null,
    dupliqueDe: null,
    resterJusqua: null,
    historique: [],
    creeA: maintenant(),
    majA: maintenant(),
    ouverture: ouvertureEnCours(), // brouillon d'une ouverture : en ligne dès l'accord des pièces (KYC-02)
  }
}
const variantesLibres = (ficheId: string, sauf?: string) => {
  const f = ficheDe(ficheId)
  const prises = etatOffres.lire().offres.filter((o) => o.ficheId === ficheId && o.id !== sauf && o.etat !== 'brouillon').map((o) => o.variante)
  return (f?.variantes ?? []).filter((v) => !prises.includes(v))
}
function suggestion(nom: string): Suggestion {
  const m = mots(nom)
  const categorie = MOTS_CATEGORIE.map(([c, ms]) => ({ c, n: m.filter((x) => ms.includes(x)).length })).sort((a, b) => b.n - a.n)[0]
  const marque = MARQUES.find((x) => m.includes(x)) ?? null
  const proche = m.length ? CATALOGUE.map((f) => ({ f, s: similarite(nom, f.titre) })).sort((a, b) => b.s - a.s)[0] : null
  const cat = categorie && categorie.n > 0 ? categorie.c : null
  return {
    categorie: cat,
    marque,
    description: nom.trim() ? `${nom.trim()}. ` + (cat === 'Électronique' || cat === 'Électroménager' ? 'Modèle exact : … · Contenu de la boîte : … · Garantie : …' : cat?.startsWith('Mode') ? 'Matière : … · Tailles : … · Entretien : …' : cat === 'Supermarché' ? 'Contenance : … · Date limite : … · Origine : …' : 'Matière ou composition : … · Dimensions : … · Contenu : …') : '',
    doublon: proche && proche.s >= FICHE_DOUBLON ? versFiche(proche.f) : null,
  }
}

export const demoOffres: DomaineOffres = {
  async reglages() {
    const proprio = estProprietaire()
    const cap = plafond()
    const v = PARAMETRES.versements
    const r: Reglages = {
      ...REGLAGES,
      fichePrioPrix: proprio ? REGLAGES.fichePrioPrix : null,
      flash: flashOuvert(),
      prixMin: PARAMETRES.commission.prixMin,
      categories: Object.keys(PARAMETRES.commission.familles).map((c) => ({ categorie: c, rayon: c })),
      liberation: { bronzeArgentJ: v.libStandardJours, orPlatineJ: v.libOrJours, confirmationJ: v.fenetreRetourJours },
      versement: proprio ? { operateur: BOUTIQUE.numeroVersement.operateur, masque: BOUTIQUE.numeroVersement.masque } : null,
      plafond: cap.actif ? { montant: cap.amount, livrees: cap.deliveredOk, requises: cap.needed } : null,
    }
    return repondre(r)
  },
  async rechercher(q, code) {
    const m = mots(q)
    const texte = (f: FicheDemo) => nrm(`${f.titre} ${f.marque} ${f.variantes.join(' ')}`)
    const parCode = code ? CATALOGUE.find((x) => x.codeBarres && x.codeBarres === code.replace(/\D/g, '')) : null
    const exacts = parCode ? [parCode] : m.length ? CATALOGUE.filter((f) => m.every((x) => texte(f).includes(x))) : []
    const proches = code || !m.length || exacts.length ? [] : CATALOGUE.filter((f) => m.some((x) => x.length > 2 && texte(f).includes(x)))
    const cherche = m.length && !exacts.length ? (CHERCHE_ZONE[nrm(q)] ?? 0) : 0
    const miens = etatOffres
      .lire()
      .offres.filter((o) => (parCode ? o.ficheId === parCode.id : m.length > 0 && m.every((x) => nrm(`${ficheDe(o.ficheId)?.titre ?? o.demande?.titre ?? ''} ${ficheDe(o.ficheId)?.marque ?? o.demande?.marque ?? ''} ${o.variante}`).includes(x))))
      .map(vue)
    return repondre({ q, code: code ?? null, exacts: exacts.map(versFiche), proches: proches.map(versFiche), mesProduits: miens, cherche })
  },
  async suggerer(nom) {
    return repondre(suggestion(nom))
  },
  async parCodeBarres(code) {
    const f = CATALOGUE.find((x) => x.codeBarres && x.codeBarres === code.replace(/\D/g, ''))
    return f ? versFiche(f) : null
  },
  async reconnaitre() {
    // Reconnaissance d'image côté serveur (démonstration : les fiches les plus cherchées de la zone).
    return CATALOGUE.filter((f) => f.id === 'itel-ac52' || f.id === 'itel-ac52-64').map(versFiche)
  },
  async commencer(ficheId, variante) {
    if (!estProprietaire()) return { ok: false, raison: 'reserve' }
    const f = ficheDe(ficheId)
    if (!f) return { ok: false, raison: 'fiche' }
    const libres = variantesLibres(ficheId)
    const v = variante && libres.includes(variante) ? variante : (libres[0] ?? f.variantes[0])
    const deja = etatOffres.lire().offres.find((o) => o.etat === 'brouillon' && o.ficheId === ficheId && o.variante === v)
    if (deja) return { ok: true, brouillonId: deja.id }
    let id = ''
    etatOffres.ecrire((e) => {
      id = nouvelId(e)
      const o = brouillonVide(id, ficheId, v)
      journal(o, 'Brouillon créé sur la fiche du catalogue')
      e.offres.push(o)
    })
    return { ok: true, brouillonId: id }
  },
  async creer({ nom, code }) {
    if (!estProprietaire()) return { ok: false, raison: 'reserve' }
    // DP-58, NOF-01 : aucun produit nouveau sans recherche préalable (3 caractères au moins, ou un code-barres lu).
    if (nom.trim().length < REGLAGES.rechercheMin && !(code && /^\d{6,14}$/.test(code))) return { ok: false, raison: 'recherche' }
    const sug = suggestion(nom)
    let id = ''
    etatOffres.ecrire((e) => {
      id = nouvelId(e)
      const o = brouillonVide(id, null, '')
      o.demande = { titre: nom.trim(), marque: sug.marque ?? '', categorie: sug.categorie ?? '', description: '', prioritaire: false, code: code ?? null }
      journal(o, 'Produit nouveau commencé après la recherche')
      e.offres.push(o)
    })
    return { ok: true, brouillonId: id }
  },
  async rattacher(id, ficheId) {
    const f = ficheDe(ficheId)
    const o = trouver(id)
    if (!f) return { ok: false, raison: 'fiche' }
    if (!o || o.etat !== 'brouillon') return { ok: false, raison: 'etat' }
    const libres = variantesLibres(ficheId, id)
    etatOffres.ecrire((e) => {
      const y = e.offres.find((z) => z.id === id)!
      y.ficheId = ficheId
      y.demande = null
      y.variante = libres.includes(y.variante) ? y.variante : (libres[0] ?? f.variantes[0])
      y.colis = f.colis
      journal(y, 'Ce produit existe déjà : offre rattachée à sa fiche')
    })
    return { ok: true, brouillonId: id }
  },
  async brouillon(id) {
    const offres = etatOffres.lire().offres
    const o = id ? offres.find((x) => x.id === id) : [...offres].filter((x) => x.etat === 'brouillon').sort((a, b) => b.majA - a.majA)[0]
    return repondre(o ? vue(o) : null)
  },
  async modifier(id, c) {
    const o = trouver(id)
    if (!o) return { ok: false, raison: 'variante' }
    const proprio = estProprietaire()
    if (!proprio && (c.prix !== undefined || c.plancherPrive !== undefined)) return { ok: false, raison: 'prix' }
    if (c.stock !== undefined && (!Number.isInteger(c.stock) || c.stock < 0 || c.stock > 99999)) return { ok: false, raison: 'stock' }
    if (c.seuilAlerte !== undefined && (!Number.isInteger(c.seuilAlerte) || c.seuilAlerte < 0 || c.seuilAlerte > 9999)) return { ok: false, raison: 'seuil' }
    if (c.prix !== undefined && c.prix !== null && (!Number.isInteger(c.prix) || c.prix < 1 || c.prix > 100_000_000)) return { ok: false, raison: 'prix' }
    if (c.plancherPrive !== undefined && c.plancherPrive !== null && (!Number.isInteger(c.plancherPrive) || c.plancherPrive < PARAMETRES.commission.prixMin)) return { ok: false, raison: 'plancher' }
    if (c.poidsKg !== undefined && c.poidsKg !== null && !(c.poidsKg > 0 && c.poidsKg < 1000)) return { ok: false, raison: 'colis' }
    if (c.dimensionsCm !== undefined && c.dimensionsCm !== null && c.dimensionsCm.some((d) => !(d > 0 && d < 1000))) return { ok: false, raison: 'colis' }
    if (c.prixBarre !== undefined && c.prixBarre !== null && (!Number.isInteger(c.prixBarre) || c.prixBarre < 1 || c.prixBarre > 100_000_000)) return { ok: false, raison: 'promo' }
    if (c.finPromo !== undefined && c.finPromo !== null && !(Number.isFinite(c.finPromo) && c.finPromo > maintenant())) return { ok: false, raison: 'promo' }
    if (c.noteVendeur !== undefined && (c.noteVendeur.length > REGLAGES.noteMax || COORDONNEES.test(c.noteVendeur))) return { ok: false, raison: 'note' }
    if (o.ficheId && (c.titre !== undefined || c.marque !== undefined || c.categorie !== undefined || c.description !== undefined)) return { ok: false, raison: 'nom' } // la fiche appartient à BelivaY (OFR-01)
    if (c.titre !== undefined && c.titre.length > 100) return { ok: false, raison: 'nom' }
    if (c.categorie !== undefined && c.categorie !== '' && !(c.categorie in PARAMETRES.commission.familles)) return { ok: false, raison: 'categorie' }
    if (c.description !== undefined && (c.description.length > DESCRIPTION_MAX || COORDONNEES.test(c.description))) return { ok: false, raison: 'description' }
    if (c.variante !== undefined && c.variante !== o.variante && o.ficheId) {
      const f = ficheDe(o.ficheId)
      const prise = etatOffres.lire().offres.some((x) => x.id !== id && x.ficheId === o.ficheId && x.variante === c.variante)
      if ((f && !f.variantes.includes(c.variante)) || prise) return { ok: false, raison: 'variante' }
    }
    const { titre, marque, categorie, description, prioritaire, ...champs } = c
    if (champs.etatArticle !== undefined && champs.etatArticle !== '' && !REGLAGES.etats.includes(champs.etatArticle)) delete champs.etatArticle
    if (champs.variante !== undefined) champs.variante = champs.variante.slice(0, 40)
    const e = etatOffres.ecrire((x) => {
      const y = x.offres.find((z) => z.id === id)!
      if (champs.stock !== undefined && champs.stock !== y.stock && y.etat !== 'brouillon') journal(y, 'Stock changé : {de} → {a}', { de: y.stock, a: champs.stock })
      if (champs.prix !== undefined && champs.prix !== null && y.prix !== null && champs.prix !== y.prix && y.etat !== 'brouillon') journal(y, 'Prix changé : {de} F → {a} F', { de: y.prix, a: champs.prix })
      Object.assign(y, champs)
      if (!y.ficheId && y.demande) {
        if (titre !== undefined) y.demande.titre = titre
        if (marque !== undefined) y.demande.marque = marque.slice(0, 40)
        if (categorie !== undefined) y.demande.categorie = categorie
        if (description !== undefined) y.demande.description = description
        if (prioritaire !== undefined) y.demande.prioritaire = prioritaire
      }
      if (champs.poidsKg !== undefined || champs.dimensionsCm !== undefined) y.colis = classeColis(y.poidsKg, y.dimensionsCm, ficheDe(y.ficheId)?.colis ?? 'S')
      y.majA = maintenant()
    })
    return { ok: true, produit: vue(e.offres.find((z) => z.id === id)!) }
  },
  async photos(cible) {
    return repondre(estOffre(cible) ? trouver(cible)!.photos : (etatOffres.lire().attente[cible] ?? []))
  },
  async ajouterPhoto(cible, p) {
    if (p.largeur < REGLAGES.photoMinPx || p.hauteur < REGLAGES.photoMinPx) return { ok: false, raison: 'petite' }
    const avant = estOffre(cible) ? trouver(cible)!.photos : (etatOffres.lire().attente[cible] ?? [])
    if (avant.length >= REGLAGES.photosMax) return { ok: false, raison: 'max' }
    const photo: PhotoReelle = {
      id: 'ph' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      image: p.image,
      prise: p.prise,
      lieu: lieuDe(p.position),
      largeur: p.largeur,
      hauteur: p.hauteur,
      octetsAvant: p.octetsAvant,
      octetsApres: p.octetsApres,
    }
    etatOffres.ecrire((e) => {
      const o = e.offres.find((x) => x.id === cible)
      if (o) {
        o.photos.push(photo)
        if (o.etat !== 'brouillon') journal(o, 'Photo réelle ajoutée')
        o.majA = maintenant()
      } else e.attente[cible] = [...(e.attente[cible] ?? []), photo]
    })
    return { ok: true, photo, nombre: avant.length + 1 }
  },
  async retirerPhoto(cible, photoId) {
    etatOffres.ecrire((e) => {
      const o = e.offres.find((x) => x.id === cible)
      if (o) o.photos = o.photos.filter((p) => p.id !== photoId)
      else e.attente[cible] = (e.attente[cible] ?? []).filter((p) => p.id !== photoId)
    })
  },
  async ordonnerPhotos(cible, ids) {
    etatOffres.ecrire((e) => {
      const o = e.offres.find((x) => x.id === cible)
      if (!o) return
      const rang = (id: string) => (ids.includes(id) ? ids.indexOf(id) : ids.length)
      o.photos = [...o.photos].sort((a, b) => rang(a.id) - rang(b.id))
    })
  },
  async apercu(offreId, prix, mic) {
    reserve('offres.apercu')
    const o = offreId ? trouver(offreId) : null
    const categorie = (o ? categorieDe(o) : '') || 'Électronique'
    const madeIn = mic ?? o?.madeInCameroon ?? false
    const p = PARAMETRES.commission
    const famille = familleDe(categorie, p)
    const minimum = prixMinimumPubliable(famille, madeIn, p)
    const cap = plafond()
    const valide = Number.isInteger(prix) && prix >= minimum
    const garde = valide ? gardeOuNull(prix, categorie, madeIn) : null
    const a: Apercu = {
      prix,
      garde,
      partPourCent: garde !== null ? partDe(garde, prix) : null,
      petitPrix: prix < p.seuilPetitPrix,
      points: Number(p.pointsPetitPrix.texte().replace(',', '.')),
      minimum,
      plagesMinimale: plagesCommissionMinimale(famille, BOUTIQUE.palier, decouverte(), madeIn, p),
      commissionMinimale: p.plancherCommande,
      seuilPetitPrix: p.seuilPetitPrix,
      plafond: cap.actif ? { montant: cap.amount, livrees: cap.deliveredOk, requises: cap.needed } : null,
      refus: !valide ? 'minimum' : cap.actif && prix > cap.amount ? 'plafond' : null,
    }
    return a
  },
  async conseil(offreId, prix) {
    reserve('offres.conseil')
    const o = trouver(offreId)
    const f = ficheDe(o?.ficheId ?? null)
    if (!o || !f || !Number.isInteger(prix) || prix < 1) return null
    const conseille = prixConseille(f, prix, o.plancherPrive)
    const gardeConseille = gardeOuNull(conseille, f.categorie, o.madeInCameroon)
    if (gardeConseille === null) return null
    const auPrix = premierDans(f, prix)
    const auConseil = premierDans(f, conseille)
    const ecarts = ZONES.map((_, i) => f.marche.meilleurLivre[i % f.marche.meilleurLivre.length] - (conseille + LIVRAISON_ZONE[i % LIVRAISON_ZONE.length]))
    return {
      prixSaisi: prix,
      conseille,
      gardeConseille,
      partConseille: partDe(gardeConseille, conseille),
      zones: ZONES.map((nom, i) => ({ nom, premier: auPrix[i], premierAuConseille: auConseil[i] })),
      marche: { nombre: f.marche.offres.length, min: Math.min(...f.marche.offres), max: Math.max(...f.marche.offres) },
      economieClient: Math.max(0, ...ecarts),
      clientsSemaine: f.marche.clientsSemaine,
      commandesAuxMoinsChers: f.marche.commandesAuxMoinsChers,
      dejaLeMoinsCher: auPrix.every(Boolean) || prix <= conseille,
    }
  },
  async publier(id, choix) {
    reserve('offres.publier')
    const o = trouver(id)
    if (!o || !(o.etat === 'brouillon' || o.etat === 'refusee')) return { ok: false, raison: 'etat' }
    const manque = manquesDe(o)
    if (!o.ficheId && !o.demande) return { ok: false, raison: 'fiche' }
    if (manque.includes('produit')) return { ok: false, raison: !o.demande || o.demande.titre.trim().length < NOM_MIN ? 'nom' : 'categorie' }
    const texte = o.demande?.description?.trim() ?? ''
    if (!o.ficheId && texte && (texte.length < DESCRIPTION_MIN || COORDONNEES.test(texte))) return { ok: false, raison: 'description' }
    if (o.prix === null) return { ok: false, raison: 'prix' }
    if (o.stock < 1) return { ok: false, raison: 'stock' }
    if (!o.etatArticle) return { ok: false, raison: 'etat' }
    if (o.photos.length < REGLAGES.photosMin) return { ok: false, raison: 'photos', detail: String(REGLAGES.photosMin - o.photos.length) }
    const min = prixMinimumPubliable(familleDe(categorieDe(o), PARAMETRES.commission), o.madeInCameroon, PARAMETRES.commission)
    if (o.prix < min) return { ok: false, raison: 'prix_minimum', detail: String(min) }
    const cap = plafond()
    if (cap.actif && o.prix > cap.amount) return { ok: false, raison: 'plafond', detail: String(cap.amount) }
    // OFR-05 : un prix barré exige une vraie remise (10 % au moins) et une fin de promotion proche ; BelivaY vérifie
    // pendant la modération que ce prix a réellement été pratiqué.
    if (o.prixBarre != null) {
      const remise = (100 * (o.prixBarre - o.prix)) / o.prixBarre
      if (remise < REGLAGES.promoRemiseMin || !o.finPromo || o.finPromo <= maintenant() || o.finPromo > maintenant() + REGLAGES.promoJoursMax * JOUR) return { ok: false, raison: 'promo' }
    }
    if (o.noteVendeur && COORDONNEES.test(o.noteVendeur)) return { ok: false, raison: 'note' }
    // Produit nouveau : BelivaY vérifie les doublons à l'envoi (FCH-02, Q-96) ; sinon il écrit la fiche pendant la
    // vérification (48 h, 24 h en prioritaire).
    const proche = !o.ficheId && o.demande ? CATALOGUE.map((f) => ({ f, s: similarite(o.demande!.titre, f.titre) })).sort((a, b) => b.s - a.s)[0] : null
    const rattacheA = proche && proche.s >= FICHE_DOUBLON ? proche.f : null
    const prio = !o.ficheId && !rattacheA && !!o.demande?.prioritaire
    const delaiH = prio ? REGLAGES.fichePrioDelaiH : REGLAGES.moderationH
    const e = etatOffres.ecrire((x) => {
      const y = x.offres.find((z) => z.id === id)!
      if (rattacheA) {
        y.ficheId = rattacheA.id
        y.demande = null
        const libres = variantesLibres(rattacheA.id, id)
        if (!libres.includes(y.variante)) y.variante = libres[0] ?? rattacheA.variantes[0]
        journal(y, 'Ce produit existe déjà : offre rattachée à sa fiche')
      } else if (!y.ficheId) {
        y.ficheDemandee = { reponseAvant: maintenant() + delaiH * HEURE, prioritaire: prio }
        if (texte) y.descriptionProposee = { texte, envoyeeA: maintenant(), reponseAvant: maintenant() + delaiH * HEURE }
      }
      y.etat = 'en_verification'
      y.envoyeeA = maintenant()
      y.verificationAvant = maintenant() + delaiH * HEURE
      y.motifRefus = null
      y.resterJusqua = choix.rester ? maintenant() + REGLAGES.rappelJours * JOUR : null
      journal(y, choix.horsLigne ? 'Offre gardée, envoyée au retour du réseau' : y.ficheId ? 'Offre envoyée en vérification' : 'Produit nouveau envoyé : BelivaY écrit sa fiche')
      x.publications[id] = publicationDe(y, choix.horsLigne, !!rattacheA)
      x.derniere = id
    })
    return { ok: true, ...e.publications[id] }
  },
  async changerPrix(id, prix, rester) {
    reserve('offres.changerPrix')
    const o = trouver(id)
    const f = ficheDe(o?.ficheId ?? null)
    if (!o || !f || !Number.isInteger(prix) || prix < 1) return { ok: false, raison: 'prix' }
    const min = prixMinimumPubliable(familleDe(f.categorie, PARAMETRES.commission), o.madeInCameroon, PARAMETRES.commission)
    if (prix < min) return { ok: false, raison: 'prix_minimum', detail: String(min) }
    const cap = plafond()
    if (cap.actif && prix > cap.amount) return { ok: false, raison: 'plafond', detail: String(cap.amount) }
    const e = etatOffres.ecrire((x) => {
      const y = x.offres.find((z) => z.id === id)!
      if (y.prix !== prix) journal(y, 'Prix changé : {de} F → {a} F', { de: y.prix ?? 0, a: prix })
      y.prix = prix
      y.resterJusqua = rester ? maintenant() + REGLAGES.rappelJours * JOUR : null
      if (y.prixAuto && y.plancherPrive !== null && y.plancherPrive > prix) y.plancherPrive = prix
    })
    return { ok: true, produit: vue(e.offres.find((z) => z.id === id)!) }
  },
  async publication(id) {
    const e = etatOffres.lire()
    const cle = id ?? e.derniere
    const p = cle ? e.publications[cle] : null
    if (!p) return null
    const o = e.offres.find((x) => x.id === cle)
    return o ? { ...publicationDe(o, p.enFile, p.rattache), reponseAvant: p.reponseAvant } : p
  },
  async proposerDescription(offreId, texte) {
    reserve('offres.proposerDescription')
    const t = texte.trim()
    if (t.length < DESCRIPTION_MIN) return { ok: false, raison: 'court' }
    if (t.length > DESCRIPTION_MAX) return { ok: false, raison: 'long' }
    if (COORDONNEES.test(t)) return { ok: false, raison: 'coordonnees' }
    const reponseAvant = maintenant() + REGLAGES.ficheDelaiH * HEURE
    etatOffres.ecrire((x) => {
      const o = x.offres.find((y) => y.id === offreId)
      if (!o) return
      o.descriptionProposee = { texte: t, envoyeeA: maintenant(), reponseAvant }
      journal(o, 'Description proposée à BelivaY')
    })
    return { ok: true, reponseAvant }
  },
}

