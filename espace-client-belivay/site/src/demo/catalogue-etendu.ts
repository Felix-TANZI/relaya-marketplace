// Catalogue du jeu d'essai, suite (DP-54, DP-59) : une trentaine de produits de plus, de toutes les catégories, pour
// que le flux « Pour vous » de l'accueil (CL-04) se charge par 20 jusqu'à « Voir plus de produits » sans doublon
// et sans reprendre les produits déjà montrés plus haut sur l'accueil. Chaque produit reprend les dessins et la
// catégorie d'un produit d'origine (src), sans marque visible ; prix en F CFA, notes, ventes, distances et
// vendeurs de démonstration. Plus la fiche de l'iPhone 15 Pro Max du vendeur de démonstration (ses campagnes
// publicitaires, demo/annonces.ts, s'affichent côté client). Aucun prix barré : l'encart « Promos » ne change pas.
import type { Produit } from '../donnees/source'

type Ligne = [id: string, src: string, titre: string, variante: string | null, prix: number, note: string, avis: number, ventes: number, stock: number, km: number]

const VENDEURS: Produit['vendeur'][] = [
  { boutique: 'Boutique A', zone: 'Mvog-Ada', score: 91, palier: 'Or', km: 0 },
  { boutique: 'Boutique B', zone: 'Essos', score: 78, palier: 'Argent', km: 0 },
  { boutique: 'Boutique C', zone: 'Bastos', score: 86, palier: 'Argent', km: 0 },
  { boutique: 'Boutique D', zone: 'Mvan', score: 85, palier: 'Argent', km: 0 },
  { boutique: 'Boutique E', zone: 'Mokolo', score: 88, palier: 'Argent', km: 0 },
  { boutique: 'Boutique F', zone: 'Melen', score: 94, palier: 'Or', km: 0 },
  { boutique: 'Boutique G', zone: 'Emana', score: 79, palier: 'Bronze', km: 0 },
  { boutique: 'Boutique H', zone: 'Nlongkak', score: 83, palier: 'Argent', km: 0 },
]
const GARANTIE: Record<string, string> = { tel: '6 mois', elec: '12 mois', maison: '6 mois' }
const DESCRIPTION: Record<string, string> = {
  tel: 'Appareil neuf, testé avant l’envoi. Facture fournie au retrait.',
  elec: 'Appareil neuf, testé avant l’envoi. Garantie assurée par la boutique, facture fournie au retrait.',
  maison: 'Article neuf, vérifié avant l’envoi. Garantie assurée par la boutique.',
  femme: 'Tissu et finitions de qualité. Échange possible si la taille ne va pas (retour 7 jours).',
  homme: 'Finitions soignées, matières résistantes. Échange possible (retour 7 jours).',
  chauss: 'Semelle confortable, matières résistantes. Échange de pointure possible (retour 7 jours).',
  beaute: 'Produit scellé, date de péremption vérifiée par le vendeur.',
  marche: 'Produit scellé, date de péremption vérifiée par le vendeur.',
  bebe: 'Article neuf, conforme aux normes de sécurité. Retour 7 jours.',
  sport: 'Produit neuf, matériaux résistants.',
}

const L: Ligne[] = [
  // Téléphones & tablettes
  ['tel-a05', 'galaxya15', 'Samsung Galaxy A05 · 64 Go', 'Noir', 68500, '4,1', 74, 205, 17, 2.4],
  ['tel-a06', 'galaxya15', 'Samsung Galaxy A06 · 128 Go', 'Bleu nuit', 99000, '4,4', 96, 260, 12, 1.8],
  ['tel-pop', 'camon30', 'Infinix Hot 50 · 128 Go · double SIM', 'Vert menthe', 84900, '4,3', 112, 340, 20, 3.0],
  // Électronique
  ['elec-bt', 'ecouteurs', 'Apple AirPods Pro (2ᵉ génération)', 'Blanc', 18900, '4,2', 134, 520, 33, 2.1],
  ['elec-casque', 'ecouteurs', 'Casque audio pliable Sony', 'Noir', 23500, '4,3', 71, 230, 19, 3.4],
  ['elec-enceinte', 'ecouteurs', 'Enceinte portable étanche JBL Charge', 'Bleu', 27000, '4,5', 92, 310, 14, 1.9],
  // Maison & cuisine
  ['mai-blender', 'mixeur', 'Blender Philips 1,5 L 600 W', null, 28500, '4,3', 83, 270, 21, 2.3],
  ['mai-bouilloire', 'fer', 'Bouilloire électrique Tefal 1,8 L', null, 9900, '4,2', 109, 410, 38, 1.4],
  ['mai-cuiseur', 'fer', 'Cuiseur à riz Moulinex 1,8 L', null, 19500, '4,4', 94, 330, 24, 3.2],
  // Mode femme
  ['fem-wax-4', 'pagne', 'Pagne Vlisco Super Wax 6 yards · motif géométrique bleu', null, 17500, '4,6', 118, 402, 18, 1.1],
  ['fem-wax-f', 'pagne', 'Pagne Vlisco Super Wax 6 yards · fleurs jaunes', null, 19000, '4,7', 141, 477, 14, 0.8],
  ['fem-wax-3', 'ensemblewax', 'Ensemble pagne et haut en wax', null, 29500, '4,5', 76, 210, 16, 2.0],
  // Mode homme
  ['hom-chemise-w', 'chemise', 'Chemise en wax manches courtes', null, 16500, '4,5', 92, 330, 22, 1.4],
  ['hom-chemise-l', 'chemise', 'Chemise en lin manches longues', null, 19500, '4,3', 61, 170, 17, 2.6],
  ['hom-polo', 'chemise', 'Polo Lacoste en coton piqué', null, 8900, '4,2', 148, 620, 45, 1.8],
  // Chaussures
  ['cha-sandale-p', 'sandales', 'Sandales plates en cuir Minelli', 'Pointure 39', 12500, '4,3', 108, 400, 24, 1.3],
  ['cha-sandale-c', 'sandales', 'Sandales à talon compensé Aldo', 'Pointure 38', 18500, '4,4', 71, 230, 14, 2.7],
  ['cha-claquette', 'sandales', 'Claquettes de piscine Nike', 'Pointure 41', 4500, '4,1', 215, 960, 80, 0.8],
  // Beauté & santé
  ['bea-karite-p', 'karite', 'Beurre de karité pur Palmer’s 250 g', null, 2200, '4,7', 264, 980, 60, 0.9],
  ['bea-aloe', 'karite', 'Gel d’aloe vera Disaar 200 ml', null, 3900, '4,4', 138, 460, 38, 1.8],
  ['bea-savon', 'karite', 'Savon noir africain Dudu-Osun 250 g', null, 1500, '4,5', 302, 1480, 95, 0.7],
  // Supermarché
  ['mar-riz-10', 'riz', 'Riz parfumé Bonnet Rouge 10 kg', null, 8200, '4,5', 143, 710, 40, 1.5],
  ['mar-riz-5', 'riz', 'Riz long grain Asiko 5 kg', null, 4300, '4,3', 189, 940, 65, 1.1],
  ['mar-huile-2', 'huile5l', 'Huile végétale Dinor 2 L', null, 3800, '4,4', 156, 800, 72, 0.9],
  // Bébé & enfant
  ['beb-couches', 'portebebe', 'Couches Pampers Baby-Dry taille 3, paquet de 60', null, 9500, '4,5', 197, 880, 46, 1.0],
  ['beb-lingettes', 'portebebe', 'Lingettes Huggies Pure, lot de 3 paquets', null, 3500, '4,4', 156, 690, 62, 0.9],
  ['beb-biberon', 'portebebe', 'Biberon Philips Avent 240 ml anticolique, lot de 2', null, 4800, '4,3', 104, 410, 39, 1.8],
  // Sport & loisirs
  ['spo-ballon-b', 'ballon', 'Ballon de basket Spalding NBA taille 7', null, 9500, '4,3', 64, 200, 18, 2.2],
  ['spo-ballon-h', 'ballon', 'Ballon de handball Molten', null, 7500, '4,2', 31, 88, 15, 3.5],
  ['spo-maillot', 'ballon', 'Maillot de football adidas adulte', null, 6500, '4,4', 187, 780, 52, 1.0],
]

const km = (v: number) => String(v).replace('.', ',') + ' km'

// Produits d'origine (catalogue.ts) : dessins, catégorie, classe et options des produits repris.
export function etendre(base: Record<string, Produit>): Record<string, Produit> {
  const sortie: Record<string, Produit> = {}
  const ajouter = (l: Ligne, i: number, surcharge: Partial<Produit> = {}) => {
    const [id, src, titre, variante, prix, note, avis, ventes, stock, d] = l
    const o = base[src]
    const v = { ...VENDEURS[i % VENDEURS.length], km: d }
    const autres = [0.9, 5.1, 7.8].map((k, j) => {
      const a = VENDEURS[(i + j + 1) % VENDEURS.length]
      return { boutique: a.boutique, zone: a.zone, prix: Math.round((prix * [0.98, 1, 1.03][j]) / 100) * 100, km: k, score: a.score, ventes: [41, 220, 12][j] }
    })
    sortie[id] = {
      p: id,
      marque: null,
      titre,
      variante,
      prix,
      prixBarre: null,
      depuis: null,
      classe: o.classe,
      distance: km(d),
      note,
      avis,
      ventes,
      stock,
      univers: o.univers,
      universTitre: o.universTitre,
      sousCategorie: o.sousCategorie,
      tags: [],
      dessins: o.dessins,
      // Tailles et pointures du produit d'origine ; pas les capacités (leurs prix sont ceux de l'origine).
      options: o.options.filter((x) => !x.prix).map((x) => ({ ...x })),
      vendeur: v,
      autres,
      description: DESCRIPTION[o.univers] ?? DESCRIPTION.sport,
      specs: [
        ['Catégorie', o.sousCategorie ?? o.universTitre],
        ['Classe du colis', o.classe],
        ['Garantie', GARANTIE[o.univers] ? GARANTIE[o.univers] : 'Retour 7 jours'],
        ['Vendu par', 'Vendeur certifié BelivaY'],
      ],
      ...surcharge,
    }
  }
  L.forEach((l, i) => ajouter(l, i))
  // iPhone 15 Pro Max du vendeur de démonstration (Boutique B, Essos : même boutique que l'itel AC52) : mêmes prix,
  // variante et stock que son espace vendeur (jeu-essai.ts : « iphone », 256 Go, 350 000 F, 2 en stock).
  ajouter(['iphone15pm', 'camon30', 'iPhone 15 Pro Max', 'Titane naturel · 256 Go', 350000, '4,8', 36, 14, 2, 1.0], 1, {
    marque: 'Apple',
    vendeur: { ...VENDEURS[1], km: 1 },
    options: [],
    tags: ['Garantie 12 mois'],
    description: 'Écran Super Retina XDR 6,7 pouces, puce A17 Pro, boîtier en titane, 256 Go. Neuf, testé avant l’envoi ; facture fournie au retrait.',
    specs: [
      ['Écran', 'Super Retina XDR 6,7″'],
      ['Mémoire', '256 Go'],
      ['Appareil photo', '48 MP + 12 MP + 12 MP'],
      ['Réseau', '5G · eSIM'],
      ['État', 'Neuf'],
      ['Garantie', '12 mois'],
    ],
  })
  return sortie
}
