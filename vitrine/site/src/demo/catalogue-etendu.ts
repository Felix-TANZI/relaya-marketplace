// Catalogue du jeu d'essai, suite (DP-54, DP-59) : une trentaine de produits de plus, de toutes les catégories, pour
// que le flux « Pour vous » de l'accueil (CL-04) se charge par 20 jusqu'à « Voir plus de produits » sans doublon
// et sans reprendre les produits déjà montrés plus haut sur l'accueil. Chaque produit reprend les dessins et la
// catégorie d'un produit d'origine (src) ; titres, marques, prix et fiches du catalogue modernisé
// (outils/produits-modernes.json) ; notes, ventes, distances et vendeurs de démonstration. Plus la fiche de
// l'iPhone 16 (iphone15pm) du vendeur de démonstration (ses campagnes publicitaires, demo/annonces.ts). Trois promotions
// crédibles (téléviseur OLED, AirPods Max, lave-linge) ; les 20 arrivages d'octobre portent l'étiquette « Nouveauté ».
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
  ['tel-a05', 'galaxya15', 'Samsung Galaxy Z Flip6', 'Menthe · 256 Go', 720000, '4,1', 74, 205, 17, 2.4],
  ['tel-a06', 'galaxya15', 'Google Pixel 9 Pro', 'Porcelaine · 256 Go', 780000, '4,4', 96, 260, 12, 1.8],
  ['tel-pop', 'camon30', 'Tecno Phantom V Fold2', 'Noir karst · 512 Go', 650000, '4,3', 112, 340, 20, 3.0],
  // Électronique
  ['elec-bt', 'ecouteurs', 'Samsung Galaxy Buds3 Pro', 'Argent', 165000, '4,2', 134, 520, 33, 2.1],
  ['elec-casque', 'ecouteurs', 'Sony WH-1000XM5', 'Noir', 230000, '4,3', 71, 230, 19, 3.4],
  ['elec-enceinte', 'ecouteurs', 'JBL Charge 5', 'Bleu', 95000, '4,5', 92, 310, 14, 1.9],
  // Maison & cuisine
  ['mai-blender', 'mixeur', 'Thermomix TM6', null, 1150000, '4,3', 83, 270, 21, 2.3],
  ['mai-bouilloire', 'fer', 'Machine Nespresso Vertuo Pop', 'Rouge', 95000, '4,2', 109, 410, 38, 1.4],
  ['mai-cuiseur', 'fer', 'Robot aspirateur Roborock S8', null, 380000, '4,4', 94, 330, 24, 3.2],
  // Mode femme
  ['fem-wax-4', 'pagne', 'Lunettes de soleil Ray-Ban Aviator', 'Or / vert classique', 120000, '4,6', 118, 402, 18, 1.1],
  ['fem-wax-f', 'pagne', 'Montre connectée Apple Watch Series 10', '42 mm · Or rose', 320000, '4,7', 141, 477, 14, 0.8],
  ['fem-wax-3', 'ensemblewax', 'Parfum Dior J’adore 100 ml', null, 135000, '4,5', 76, 210, 16, 2.0],
  // Mode homme
  ['hom-chemise-w', 'chemise', 'Chemise en wax manches courtes, coupe slim', null, 25000, '4,5', 92, 330, 22, 1.4],
  ['hom-chemise-l', 'chemise', 'Veste Tommy Hilfiger en coton', 'Bleu marine', 145000, '4,3', 61, 170, 17, 2.6],
  ['hom-polo', 'chemise', 'Polo Lacoste en coton piqué', 'Bleu marine', 65000, '4,2', 148, 620, 45, 1.8],
  // Chaussures
  ['cha-sandale-p', 'sandales', 'adidas Samba OG', 'Blanc / noir', 90000, '4,3', 108, 400, 24, 1.3],
  ['cha-sandale-c', 'sandales', 'New Balance 9060', 'Gris pluie', 110000, '4,4', 71, 230, 14, 2.7],
  ['cha-claquette', 'sandales', 'Claquettes Nike Calm', 'Noir', 35000, '4,1', 215, 960, 80, 0.8],
  // Beauté & santé
  ['bea-karite-p', 'karite', 'Beurre de karité pur Palmer’s 250 g', null, 8500, '4,7', 264, 980, 60, 0.9],
  ['bea-aloe', 'karite', 'Lisseur Dyson Airstrait', null, 520000, '4,4', 138, 460, 38, 1.8],
  ['bea-savon', 'karite', 'Coffret Fenty Beauty Gloss Bomb', null, 35000, '4,5', 302, 1480, 95, 0.7],
  // Supermarché
  ['mar-riz-10', 'riz', 'Riz parfumé Bonnet Rouge 10 kg', null, 9500, '4,5', 143, 710, 40, 1.5],
  ['mar-riz-5', 'riz', 'Eau minérale Supermont, pack de 12', '1,5 L', 4500, '4,3', 189, 940, 65, 1.1],
  ['mar-huile-2', 'huile5l', 'Chocolat Lindt Excellence 70 %, lot de 4', null, 9000, '4,4', 156, 800, 72, 0.9],
  // Bébé & enfant
  ['beb-couches', 'portebebe', 'Couches Pampers Premium Protection taille 3', 'Paquet de 60', 14500, '4,5', 197, 880, 46, 1.0],
  ['beb-lingettes', 'portebebe', 'Babyphone vidéo Philips Avent', null, 165000, '4,4', 156, 690, 62, 0.9],
  ['beb-biberon', 'portebebe', 'Biberon Philips Avent Natural 260 ml, lot de 2', null, 12000, '4,3', 104, 410, 39, 1.8],
  // Sport & loisirs
  ['spo-ballon-b', 'ballon', 'Ballon de basket Spalding NBA taille 7', null, 25000, '4,3', 64, 200, 18, 2.2],
  ['spo-ballon-h', 'ballon', 'Vélo électrique Xiaomi', 'Pliant', 520000, '4,2', 31, 88, 15, 3.5],
  ['spo-maillot', 'ballon', 'Maillot du Cameroun domicile 2025', 'Adulte', 35000, '4,4', 187, 780, 52, 1.0],
]

// Catalogue modernisé (outils/produits-modernes.json) : marque, sous-catégorie, description, caractéristiques et
// options propres à chaque produit ; prévalent sur les valeurs génériques reprises du produit d'origine.
const FICHES: Record<string, Partial<Produit>> = {
  iphone15pm: {
    marque: "Apple",
    sousCategorie: "Smartphones",
    description: "Écran Super Retina XDR 6,1 pouces, puce A18, bouton Action et bouton Commande de l’appareil photo. Double appareil photo 48 MP, boîtier en aluminium. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Écran", "Super Retina XDR 6,1″"], ["Puce", "A18"], ["Mémoire", "128 Go"], ["Appareil photo", "48 MP + 12 MP ultra grand-angle"], ["Réseau", "5G · eSIM"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Outremer", "Sarcelle", "Rose", "Blanc", "Noir"], choisi: "Outremer"}, {nom: "Capacité", valeurs: ["128 Go", "256 Go", "512 Go"], indispo: ["512 Go"], prix: {"128 Go":620000, "256 Go":700000}, choisi: "128 Go"}],
  },
  'tel-a05': {
    marque: "Samsung",
    sousCategorie: "Smartphones",
    description: "Smartphone pliable à clapet : écran 6,7 pouces, écran externe 3,4 pouces, capteur 50 MP et Galaxy AI. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Écran", "Dynamic AMOLED 6,7″ pliable"], ["Écran externe", "Super AMOLED 3,4″"], ["Mémoire", "256 Go · 12 Go RAM"], ["Appareil photo", "50 MP + 12 MP"], ["Batterie", "4 000 mAh"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Menthe", "Bleu", "Argent ombré", "Jaune"], choisi: "Menthe"}],
  },
  'tel-a06': {
    marque: "Google",
    sousCategorie: "Smartphones",
    description: "Écran Super Actua 6,3 pouces, puce Google Tensor G4 et triple appareil photo avec téléobjectif 5x. Sept ans de mises à jour. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Écran", "Super Actua OLED 6,3″ · 120 Hz"], ["Puce", "Google Tensor G4"], ["Mémoire", "256 Go · 16 Go RAM"], ["Appareil photo", "50 MP + 48 MP + 48 MP (5x)"], ["Réseau", "5G · eSIM"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Porcelaine", "Noir volcanique", "Vert sauge", "Rose quartz"], choisi: "Porcelaine"}],
  },
  'tel-pop': {
    marque: "Tecno",
    sousCategorie: "Smartphones",
    description: "Smartphone pliable façon livre : grand écran 7,85 pouces, écran externe 6,42 pouces, triple capteur 50 MP. Double SIM compatible MTN et Orange. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Écran", "AMOLED 7,85″ pliable"], ["Écran externe", "AMOLED 6,42″"], ["Mémoire", "512 Go · 12 Go RAM"], ["Appareil photo", "50 MP + 50 MP + 50 MP"], ["Batterie", "5 750 mAh · 70 W"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Noir karst", "Blanc glacier"], choisi: "Noir karst"}],
  },
  'elec-bt': {
    marque: "Samsung",
    sousCategorie: "Audio",
    description: "Écouteurs sans fil haut de gamme : réduction active du bruit adaptative, son Hi-Fi 24 bits et Galaxy AI pour l’interprète en direct. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Réduction de bruit", "Active adaptative"], ["Son", "Hi-Fi 24 bits"], ["Autonomie", "6 h · 26 h avec le boîtier"], ["Étanchéité", "IP57"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Argent", "Blanc"], choisi: "Argent"}],
    motsCles: ["écouteurs"],
  },
  'elec-casque': {
    marque: "Sony",
    sousCategorie: "Audio",
    description: "Casque sans fil à réduction de bruit de référence, huit micros pour des appels clairs, 30 heures d’autonomie. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Réduction de bruit", "Active · 8 micros"], ["Autonomie", "30 h"], ["Charge rapide", "3 min = 3 h"], ["Connexion", "Bluetooth 5.2 · multipoint"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Noir", "Argent", "Bleu nuit"], choisi: "Noir"}],
    motsCles: ["casque"],
  },
  'elec-enceinte': {
    marque: "JBL",
    sousCategorie: "Audio",
    description: "Enceinte Bluetooth portable étanche IP67, son puissant JBL Pro Sound, 20 heures d’autonomie ; recharge aussi le téléphone. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Puissance", "40 W"], ["Autonomie", "20 h"], ["Étanchéité", "IP67"], ["Fonction", "Batterie externe intégrée"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Bleu", "Noir", "Rouge"], choisi: "Bleu"}],
    motsCles: ["enceinte"],
  },
  'mai-blender': {
    marque: "Vorwerk",
    sousCategorie: "Cuisine",
    description: "Robot cuiseur multifonction : hache, mixe, pétrit et cuit à la vapeur, avec recettes guidées sur écran tactile. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Bol", "2,2 L"], ["Fonctions", "Plus de 20"], ["Écran", "Tactile 6,8″"], ["Puissance", "1 500 W"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["robot"],
  },
  'mai-bouilloire': {
    marque: "Nespresso",
    sousCategorie: "Petit électroménager",
    description: "Machine à café à capsules Vertuo : lecture du code-barres, cinq tailles de tasse, crème onctueuse. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Système", "Capsules Vertuo"], ["Tasses", "5 tailles"], ["Réservoir", "0,56 L"], ["Puissance", "1 260 W"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["café"],
  },
  'mai-cuiseur': {
    marque: "Roborock",
    sousCategorie: "Petit électroménager",
    description: "Robot aspirateur et laveur : aspiration 6 000 Pa, double brosse, navigation laser et pilotage par application. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Aspiration", "6 000 Pa"], ["Lavage", "Serpillière vibrante"], ["Navigation", "Laser LiDAR"], ["Autonomie", "180 min"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["aspirateur"],
  },
  'fem-wax-4': {
    marque: "Ray-Ban",
    sousCategorie: "Accessoires",
    description: "Lunettes de soleil aviateur Ray-Ban, monture métal dorée, verres verts G-15 protection 100 % UV.",
    specs: [["Monture", "Métal doré"], ["Verres", "G-15 verts"], ["Protection", "100 % UV"], ["Étui", "Fourni"], ["Retour", "7 jours"]],
    options: [],
    motsCles: ["lunettes"],
  },
  'fem-wax-f': {
    marque: "Apple",
    sousCategorie: "Accessoires",
    description: "Apple Watch Series 10 42 mm : écran plus grand et plus fin, suivi de la santé et du sommeil, charge rapide. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Écran", "OLED LTPO3 42 mm"], ["Boîtier", "Aluminium or rose"], ["Étanchéité", "50 m"], ["Compatibilité", "iPhone"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["montre"],
  },
  'fem-wax-3': {
    marque: "Dior",
    sousCategorie: "Parfums",
    description: "Eau de parfum J’adore 100 ml, bouquet floral d’ylang-ylang, rose et jasmin. Flacon scellé.",
    specs: [["Contenance", "100 ml"], ["Type", "Eau de parfum"], ["Notes", "Ylang-ylang · rose · jasmin"], ["État", "Neuf, scellé"]],
    options: [],
    motsCles: ["parfum"],
  },
  'hom-chemise-w': {
    marque: null,
    sousCategorie: "Chemises",
    description: "Chemise en wax manches courtes, coupe slim, boutons nacrés. Échange possible (retour 7 jours).",
    specs: [["Tissu", "Wax 100 % coton"], ["Coupe", "Slim"], ["Manches", "Courtes"], ["Retour", "7 jours"]],
  },
  'hom-chemise-l': {
    marque: "Tommy Hilfiger",
    sousCategorie: "Vestes",
    description: "Veste légère Tommy Hilfiger en coton, col montant, fermeture zippée et drapeau brodé.",
    specs: [["Matière", "100 % coton"], ["Fermeture", "Zip"], ["Poches", "2 poches zippées"], ["Retour", "7 jours"]],
    motsCles: ["veste"],
  },
  'hom-polo': {
    marque: "Lacoste",
    sousCategorie: "Chemises",
    description: "Polo Lacoste classique en coton piqué, coupe L.12.12, crocodile brodé.",
    specs: [["Matière", "Coton piqué"], ["Coupe", "Classique L.12.12"], ["Col", "Polo, 2 boutons"], ["Retour", "7 jours"]],
  },
  'cha-sandale-p': {
    marque: "adidas",
    sousCategorie: "Homme",
    description: "Baskets adidas Samba OG, dessus en cuir et daim, semelle en gomme.",
    specs: [["Dessus", "Cuir et daim"], ["Semelle", "Gomme"], ["Style", "Terrace"], ["Retour", "7 jours"]],
    motsCles: ["baskets"],
  },
  'cha-sandale-c': {
    marque: "New Balance",
    sousCategorie: "Sport",
    description: "Baskets New Balance 9060, amorti ABZORB et SBS, semelle sculptée.",
    specs: [["Dessus", "Daim et mesh"], ["Amorti", "ABZORB · SBS"], ["Semelle", "Caoutchouc"], ["Retour", "7 jours"]],
    motsCles: ["baskets"],
  },
  'cha-claquette': {
    marque: "Nike",
    sousCategorie: "Homme",
    description: "Claquettes Nike Calm en mousse moulée d’une seule pièce, légères et imperméables.",
    specs: [["Matière", "Mousse moulée"], ["Usage", "Piscine · maison"], ["Entretien", "Lavable à l’eau"], ["Retour", "7 jours"]],
    motsCles: ["claquettes"],
  },
  'bea-karite-p': {
    marque: "Palmer’s",
    sousCategorie: "Soins visage",
    description: "Beurre de karité pur Palmer’s 250 g, nourrit la peau et les cheveux secs. Produit scellé, date de péremption vérifiée par le vendeur.",
    specs: [["Contenance", "250 g"], ["Composition", "Karité pur"], ["Usage", "Peau · cheveux"], ["État", "Neuf, scellé"]],
    motsCles: ["karité"],
  },
  'bea-aloe': {
    marque: "Dyson",
    sousCategorie: "Cheveux",
    description: "Lisseur Dyson Airstrait : sèche et lisse en même temps à l’air, sans plaques chauffantes. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Technologie", "Air à haute pression"], ["Modes", "Cheveux mouillés · secs"], ["Températures", "3 réglages"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["lisseur"],
  },
  'bea-savon': {
    marque: "Fenty Beauty",
    sousCategorie: "Maquillage",
    description: "Coffret de gloss Fenty Beauty Gloss Bomb, brillance universelle à reflets, formule hydratante.",
    specs: [["Contenu", "Coffret de gloss"], ["Fini", "Brillant"], ["Formule", "Beurre de karité"], ["État", "Neuf, scellé"]],
    options: [],
    motsCles: ["gloss"],
  },
  'mar-riz-10': {
    marque: "Bonnet Rouge",
    sousCategorie: "Épicerie",
    description: "Riz parfumé Bonnet Rouge, sac de 10 kg. Produit scellé, date vérifiée par le vendeur.",
    specs: [["Poids", "10 kg"], ["Type", "Parfumé"], ["État", "Scellé"]],
  },
  'mar-riz-5': {
    marque: "Supermont",
    sousCategorie: "Boissons",
    description: "Eau minérale naturelle Supermont, pack de 12 bouteilles de 1,5 L.",
    specs: [["Contenance", "12 × 1,5 L"], ["Type", "Eau minérale naturelle"], ["Origine", "Cameroun"], ["État", "Scellé"]],
    options: [],
    motsCles: ["eau"],
  },
  'mar-huile-2': {
    marque: "Lindt",
    sousCategorie: "Épicerie",
    description: "Chocolat noir Lindt Excellence 70 % cacao, lot de 4 tablettes de 100 g.",
    specs: [["Quantité", "4 × 100 g"], ["Cacao", "70 %"], ["Conservation", "Au frais, à l’abri de la lumière"], ["État", "Scellé"]],
    options: [],
    motsCles: ["chocolat"],
  },
  'beb-couches': {
    marque: "Pampers",
    sousCategorie: "Puériculture",
    description: "Couches Pampers Premium Protection taille 3 (6-10 kg), paquet de 60. Article neuf, conforme aux normes.",
    specs: [["Taille", "3 (6-10 kg)"], ["Quantité", "60 couches"], ["Protection", "Jusqu’à 12 h"], ["État", "Scellé"]],
    motsCles: ["couches"],
  },
  'beb-lingettes': {
    marque: "Philips Avent",
    sousCategorie: "Puériculture",
    description: "Babyphone vidéo Philips Avent, écran 4,3 pouces, vision nocturne, portée 300 m, connexion privée sécurisée. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Écran", "4,3″"], ["Portée", "300 m"], ["Vision", "Nocturne"], ["Autonomie", "10 h"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["babyphone"],
  },
  'beb-biberon': {
    marque: "Philips Avent",
    sousCategorie: "Puériculture",
    description: "Biberons Philips Avent Natural 260 ml, tétine à réponse naturelle, lot de 2. Sans BPA.",
    specs: [["Contenance", "260 ml"], ["Quantité", "2 biberons"], ["Âge", "Dès 1 mois"], ["Matière", "Sans BPA"]],
    motsCles: ["biberon"],
  },
  'spo-ballon-b': {
    univers: 'sport', // le ballon d'origine (PS5 Slim) est passé en Électronique › Jeux vidéo
    universTitre: 'Sport & loisirs',
    marque: "Spalding",
    sousCategorie: "Basketball",
    description: "Ballon de basket Spalding NBA taille 7, cuir composite, intérieur et extérieur.",
    specs: [["Taille", "7"], ["Matière", "Cuir composite"], ["Usage", "Intérieur · extérieur"]],
    motsCles: ["basket"],
  },
  'spo-ballon-h': {
    univers: 'sport', // le ballon d'origine (PS5 Slim) est passé en Électronique › Jeux vidéo
    universTitre: 'Sport & loisirs',
    marque: "Xiaomi",
    sousCategorie: "Vélos",
    description: "Vélo électrique pliant Xiaomi, moteur 250 W, roues 16 pouces, jusqu’à 40 km d’autonomie. Article neuf, monté et vérifié avant l’envoi.",
    specs: [["Moteur", "250 W"], ["Autonomie", "Jusqu’à 40 km"], ["Roues", "16″"], ["Pliage", "Oui"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["vélo"],
  },
  'spo-maillot': {
    univers: 'sport', // le ballon d'origine (PS5 Slim) est passé en Électronique › Jeux vidéo
    universTitre: 'Sport & loisirs',
    marque: "One All Sports",
    sousCategorie: "Football",
    description: "Maillot domicile des Lions indomptables 2025, coupe adulte, tissu respirant.",
    specs: [["Équipe", "Cameroun"], ["Saison", "2025 domicile"], ["Matière", "Polyester respirant"], ["Retour", "7 jours"]],
    options: [{nom: "Taille", valeurs: ["S", "M", "L", "XL", "XXL"], indispo: ["XXL"], choisi: "L"}],
    motsCles: ["cameroun", "lions"],
  },
  macbookair: {
    marque: "Apple",
    sousCategorie: "Informatique",
    description: "Ordinateur portable 13,6 pouces ultra fin, puce M3, jusqu’à 18 heures d’autonomie, sans ventilateur. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Écran", "Liquid Retina 13,6″"], ["Puce", "Apple M3"], ["Mémoire", "256 Go SSD · 16 Go"], ["Autonomie", "Jusqu’à 18 h"], ["Poids", "1,24 kg"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Minuit", "Lumière stellaire", "Argent", "Gris sidéral"], choisi: "Minuit"}],
    motsCles: ["ordinateur", "laptop", "apple"],
  },
  macbookpro: {
    marque: "Apple",
    sousCategorie: "Informatique",
    description: "Ordinateur portable 14 pouces, puce M4, écran Liquid Retina XDR et jusqu’à 24 heures d’autonomie. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Écran", "Liquid Retina XDR 14,2″"], ["Puce", "Apple M4"], ["Mémoire", "512 Go SSD · 16 Go"], ["Autonomie", "Jusqu’à 24 h"], ["Ports", "3 Thunderbolt 4 · HDMI · SD"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Noir sidéral", "Argent"], choisi: "Noir sidéral"}],
    motsCles: ["ordinateur", "laptop", "apple"],
  },
  ps5pro: {
    marque: "Sony",
    sousCategorie: "Jeux vidéo",
    description: "Console PlayStation 5 Pro : GPU plus puissant, PSSR pour une 4K plus nette, 2 To de stockage, manette DualSense fournie. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Stockage", "SSD 2 To"], ["Définition", "4K · jusqu’à 120 i/s"], ["Lecteur", "Sans lecteur (en option)"], ["Manette", "DualSense fournie"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["ps5", "console", "playstation"],
  },
  xboxsx: {
    marque: "Microsoft",
    sousCategorie: "Jeux vidéo",
    description: "Console Xbox Series X, 4K jusqu’à 120 images par seconde, SSD 1 To et lecteur Blu-ray 4K. Manette sans fil fournie. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Stockage", "SSD 1 To"], ["Définition", "4K · jusqu’à 120 i/s"], ["Lecteur", "Blu-ray 4K"], ["Manette", "Manette sans fil fournie"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["console"],
  },
  switch: {
    marque: "Nintendo",
    sousCategorie: "Jeux vidéo",
    description: "Console Nintendo Switch modèle OLED : écran 7 pouces, à jouer en salon ou en mobilité, deux Joy-Con fournis. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Écran", "OLED 7″"], ["Stockage", "64 Go"], ["Modes", "Salon · sur table · portable"], ["Manettes", "2 Joy-Con fournis"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["console"],
  },
  dualsense: {
    marque: "Sony",
    sousCategorie: "Jeux vidéo",
    description: "Manette sans fil professionnelle pour PS5 : sticks remplaçables, gâchettes réglables, boutons arrière et profils personnalisés. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Compatibilité", "PlayStation 5 · PS5 Pro"], ["Connexion", "Sans fil · USB-C"], ["Personnalisation", "Sticks et boutons arrière"], ["Étui", "Étui de transport fourni"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["ps5", "playstation", "manette"],
  },
  oledlg: {
    marque: "LG",
    sousCategorie: "TV & vidéo",
    description: "Téléviseur OLED evo 65 pouces, processeur α9 Gen7, noirs parfaits et 144 Hz pour le jeu. Livré et installé chez toi. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Taille", "65″ (164 cm)"], ["Définition", "4K UHD · OLED"], ["Fréquence", "144 Hz"], ["Système", "webOS · Wi-Fi"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["tv"],
  },
  barresono: {
    marque: "Sonos",
    sousCategorie: "Audio",
    description: "Barre de son Dolby Atmos 9.1.4 avec 14 haut-parleurs, amélioration des voix par IA et Wi-Fi. Pour téléviseurs 55 pouces et plus. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Son", "Dolby Atmos 9.1.4"], ["Haut-parleurs", "14"], ["Connexion", "HDMI eARC · Wi-Fi · Bluetooth"], ["Longueur", "1,18 m"], ["Garantie", "12 mois"]],
    options: [],
  },
  djimini: {
    marque: "DJI",
    sousCategorie: "Photo & vidéo",
    description: "Drone de moins de 249 g, vidéo 4K/60 HDR, détection d’obstacles omnidirectionnelle. Combo avec trois batteries et sacoche. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Poids", "Moins de 249 g"], ["Vidéo", "4K/60 HDR"], ["Autonomie", "34 min par batterie"], ["Portée", "20 km (O4)"], ["Garantie", "12 mois"]],
    options: [],
  },
  gopro: {
    marque: "GoPro",
    sousCategorie: "Photo & vidéo",
    description: "Caméra d’action étanche 10 m, vidéo 5,3K, stabilisation HyperSmooth 6.0 et GPS intégré. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Vidéo", "5,3K60 · 4K120"], ["Photo", "27 MP"], ["Étanchéité", "10 m sans caisson"], ["Stabilisation", "HyperSmooth 6.0"], ["Garantie", "12 mois"]],
    options: [],
  },
  canonr: {
    marque: "Canon",
    sousCategorie: "Photo & vidéo",
    description: "Appareil photo hybride plein format 24 MP, rafale 40 i/s, vidéo 4K 60p. Livré avec l’objectif RF 24-105 mm f/4. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Capteur", "Plein format 24,2 MP"], ["Rafale", "Jusqu’à 40 i/s"], ["Vidéo", "4K 60p"], ["Objectif", "RF 24-105 mm f/4 L"], ["Garantie", "12 mois"]],
    options: [],
  },
  galaxytabs10: {
    marque: "Samsung",
    sousCategorie: "Tablettes",
    description: "Grand écran Dynamic AMOLED 14,6 pouces, S Pen fourni, processeur MediaTek Dimensity 9300+ et Galaxy AI. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Écran", "Dynamic AMOLED 2X 14,6″"], ["Processeur", "Dimensity 9300+"], ["Mémoire", "256 Go · 12 Go RAM"], ["Batterie", "11 200 mAh · 45 W"], ["Accessoire", "S Pen fourni"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Gris", "Argent"], choisi: "Gris"}],
  },
  iphone16e: {
    marque: "Apple",
    sousCategorie: "Smartphones",
    description: "Écran OLED 6,1 pouces, puce A18, appareil photo 48 MP Fusion et Face ID. Le plus abordable des iPhone 16. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Écran", "Super Retina XDR OLED 6,1″"], ["Puce", "A18"], ["Mémoire", "128 Go"], ["Appareil photo", "48 MP · selfie 12 MP"], ["Réseau", "5G · eSIM"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Blanc", "Noir"], choisi: "Blanc"}],
    motsCles: ["apple"],
  },
  airpodsmax: {
    marque: "Apple",
    sousCategorie: "Audio",
    description: "Casque circum-auriculaire Apple : réduction active du bruit, audio spatial, port USB-C, coussinets à mémoire de forme. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Réduction de bruit", "Active"], ["Puce", "Apple H1 (×2)"], ["Autonomie", "20 h"], ["Connecteur", "USB-C"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Lumière stellaire", "Minuit", "Bleu", "Violet", "Orange"], choisi: "Lumière stellaire"}],
    motsCles: ["casque"],
  },
  'cuiseur-riz': {
    marque: "Tefal",
    sousCategorie: "Petit électroménager",
    description: "Cuiseur à riz en inox brossé, cuve antiadhésive amovible de 1,8 L (10 tasses), cuisson automatique puis maintien au chaud. Couvercle en verre, verre doseur et spatule fournis. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Capacité", "1,8 L · 10 tasses"], ["Puissance", "700 W"], ["Cuve", "Antiadhésive, amovible"], ["Fonctions", "Cuisson · maintien au chaud"], ["Accessoires", "Verre doseur, spatule"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["cuiseur", "riz", "rice cooker", "autocuiseur", "électroménager"],
  },
  'micro-ondes': {
    marque: "Samsung",
    sousCategorie: "Petit électroménager",
    description: "Four à micro-ondes compact 25 L en inox, deux boutons mécaniques simples (puissance et minuterie), plateau tournant en verre et fonction décongélation. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Capacité", "25 L"], ["Puissance", "900 W · 5 niveaux"], ["Commandes", "Mécaniques, 2 boutons"], ["Plateau", "Verre, 28,8 cm"], ["Finition", "Inox"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["micro-ondes", "micro onde", "microondes", "four", "électroménager"],
  },
  'lave-linge': {
    marque: "LG",
    sousCategorie: "Gros électroménager",
    description: "Lave-linge hublot 9 kg à moteur Inverter Direct Drive, silencieux et économe, programme vapeur anti-allergènes et essorage 1 400 tr/min. Livraison à domicile et mise en service. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Capacité", "9 kg"], ["Essorage", "1 400 tr/min"], ["Moteur", "Inverter Direct Drive"], ["Programmes", "14, dont vapeur"], ["Dimensions", "85 × 60 × 56 cm"], ["Garantie", "24 mois"]],
    options: [],
    motsCles: ["machine à laver", "lave linge", "lessive", "électroménager"],
  },
  refrigerateur: {
    marque: "Samsung",
    sousCategorie: "Gros électroménager",
    description: "Réfrigérateur combiné 384 L en inox brossé, froid ventilé No Frost (sans givre) et compresseur Digital Inverter, congélateur en bas. Livraison à domicile et mise en service. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Volume", "384 L (270 L + 114 L congélateur)"], ["Froid", "No Frost"], ["Compresseur", "Digital Inverter"], ["Classe énergétique", "A+"], ["Dimensions", "185 × 60 × 67 cm"], ["Garantie", "24 mois"]],
    options: [],
    motsCles: ["frigo", "frigidaire", "congélateur", "électroménager"],
  },
  'batterie-cuisine': {
    marque: "WMF",
    sousCategorie: "Cuisine",
    description: "Batterie de cuisine en inox 18/10, 10 pièces : casseroles, faitout, sauteuse et poêles avec couvercles. Fond épais tous feux, induction comprise, passe au lave-vaisselle. Article neuf, vérifié avant l’envoi.",
    specs: [["Pièces", "10 (6 ustensiles, 4 couvercles)"], ["Matière", "Inox 18/10"], ["Feux", "Tous feux, induction comprise"], ["Entretien", "Lave-vaisselle"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["casserole", "marmite", "poêle", "faitout", "ustensiles"],
  },
  'service-table': {
    marque: "Luminarc",
    sousCategorie: "Cuisine",
    description: "Service de table en grès émaillé beige sable, 16 pièces pour 4 personnes : assiettes plates, creuses, à dessert et bols. Va au micro-ondes et au lave-vaisselle. Article neuf, emballé avec soin.",
    specs: [["Pièces", "16 (4 couverts)"], ["Matière", "Grès émaillé"], ["Couleur", "Beige sable"], ["Entretien", "Micro-ondes · lave-vaisselle"], ["Retour", "7 jours"]],
    options: [],
    motsCles: ["assiettes", "vaisselle", "bols", "service"],
  },
  'parure-lit': {
    marque: "Blanc des Vosges",
    sousCategorie: "Linge de maison",
    description: "Parure de lit 4 pièces en coton lavé, toucher doux et froissé naturel : housse de couette, drap-housse et deux taies d’oreiller. Lavable à 40 °C. Échange possible (retour 7 jours).",
    specs: [["Contenu", "Housse, drap-housse, 2 taies"], ["Matière", "100 % coton lavé"], ["Couleur", "Lin naturel"], ["Entretien", "Machine 40 °C"], ["Retour", "7 jours"]],
    options: [{nom: "Taille", valeurs: ["140 × 190", "160 × 200", "180 × 200"], choisi: "160 × 200"}],
    motsCles: ["draps", "drap", "literie", "housse de couette", "linge"],
  },
  'serviettes-bain': {
    marque: "Blanc des Vosges",
    sousCategorie: "Linge de maison",
    description: "Lot de 6 serviettes en coton épais 550 g/m² : 2 draps de bain, 2 serviettes de toilette et 2 serviettes invité. Moelleuses et très absorbantes. Échange possible (retour 7 jours).",
    specs: [["Contenu", "2 × 70 × 140, 2 × 50 × 100, 2 × 30 × 50"], ["Matière", "100 % coton, 550 g/m²"], ["Entretien", "Machine 60 °C"], ["Retour", "7 jours"]],
    options: [{nom: "Couleur", valeurs: ["Taupe", "Blanc", "Gris perle"], choisi: "Taupe"}],
    motsCles: ["serviette", "drap de bain", "linge", "salle de bain"],
  },
  'boites-rangement': {
    marque: "IKEA",
    sousCategorie: "Rangement",
    description: "Lot de 6 boîtes de rangement transparentes de 22 L avec couvercle à clips, empilables : vêtements, linge, jouets ou provisions restent visibles et à l’abri de la poussière.",
    specs: [["Contenance", "22 L par boîte"], ["Quantité", "6 boîtes"], ["Matière", "Polypropylène sans BPA"], ["Couvercle", "À clips, empilable"], ["Retour", "7 jours"]],
    options: [],
    motsCles: ["boîte", "boite", "rangement", "bac", "caisse"],
  },
  'panier-linge': {
    marque: null,
    sousCategorie: "Rangement",
    description: "Panier à linge de 60 L tressé à la main en fibres naturelles par des artisans de l’Ouest, poignées intégrées. Robuste, léger et aéré.",
    specs: [["Contenance", "60 L"], ["Matière", "Fibres naturelles tressées"], ["Dimensions", "Ø 40 × 55 cm"], ["Fabrication", "Artisanale, Cameroun"], ["Retour", "7 jours"]],
    options: [],
    motsCles: ["panier", "linge", "corbeille", "rangement", "artisanat"],
  },
  'sac-ecole': {
    marque: "Eastpak",
    sousCategorie: "Rentrée scolaire",
    description: "Sac à dos scolaire ergonomique 24 L, dos et bretelles rembourrés, grand compartiment pour classeurs A4, poche avant zippée et poche gourde. Garantie fabricant 2 ans.",
    specs: [["Volume", "24 L"], ["Format", "Classeurs A4"], ["Dos", "Rembourré, bretelles réglables"], ["Poches", "Avant zippée, gourde"], ["Garantie", "2 ans"]],
    options: [{nom: "Couleur", valeurs: ["Bleu marine / jaune", "Noir", "Rouge"], choisi: "Bleu marine / jaune"}],
    motsCles: ["cartable", "sac", "sac à dos", "école", "rentrée", "fournitures"],
  },
  'trousse-scolaire': {
    marque: "Maped",
    sousCategorie: "Rentrée scolaire",
    description: "Trousse en tissu fleuri, garnie de 24 fournitures : crayons de couleur, stylos bleu, rouge et vert, crayon à papier, gomme, taille-crayon, règle 15 cm, ciseaux et bâton de colle.",
    specs: [["Contenu", "24 fournitures"], ["Matière", "Polyester déperlant"], ["Fermeture", "Zip"], ["Âge", "Dès 6 ans"]],
    options: [],
    motsCles: ["trousse", "crayons", "stylos", "école", "rentrée", "fournitures"],
  },
  'cahiers-scolaires': {
    marque: "Clairefontaine",
    sousCategorie: "Rentrée scolaire",
    description: "Lot de 5 cahiers reliés 24 × 32 cm, 96 pages grands carreaux Seyès, papier 90 g lisse et couvertures pastel souples.",
    specs: [["Quantité", "5 cahiers"], ["Format", "24 × 32 cm"], ["Pages", "96, grands carreaux"], ["Papier", "90 g"]],
    options: [],
    motsCles: ["cahier", "cahiers", "école", "rentrée", "fournitures"],
  },
  'manuels-scolaires': {
    marque: "Edicef",
    sousCategorie: "Rentrée scolaire",
    description: "Lot de 4 manuels scolaires illustrés conformes au programme camerounais : français, mathématiques, sciences et histoire-géographie. Livres neufs.",
    specs: [["Contenu", "4 manuels"], ["Matières", "Français, maths, sciences, histoire-géo"], ["Programme", "Cameroun, section francophone"], ["État", "Neuf"]],
    options: [{nom: "Classe", valeurs: ["CE2", "CM1", "CM2"], choisi: "CM1"}],
    motsCles: ["manuel", "manuels", "livres scolaires", "école", "rentrée"],
  },
  'livres-enfants': {
    marque: "L’École des loisirs",
    sousCategorie: "Livres",
    description: "Coffret de 6 albums jeunesse illustrés, des histoires à lire ensemble puis seul. Couvertures rigides, en français. Livres neufs.",
    specs: [["Contenu", "6 albums"], ["Âge", "4 à 8 ans"], ["Langue", "Français"], ["Couverture", "Rigide"]],
    options: [],
    motsCles: ["livre", "livres", "enfants", "histoires", "album", "lecture"],
  },
  romans: {
    marque: "Folio",
    sousCategorie: "Livres",
    description: "Sélection de 5 romans contemporains en poche, primés et salués par la critique, dont des voix africaines francophones. Livres neufs.",
    specs: [["Contenu", "5 romans"], ["Format", "Poche"], ["Langue", "Français"], ["État", "Neuf"]],
    options: [],
    motsCles: ["roman", "romans", "livre", "livres", "lecture"],
  },
  'lampe-bureau': {
    marque: "Philips",
    sousCategorie: "Luminaires",
    description: "Lampe de bureau LED à bras articulé, variateur tactile, trois teintes de lumière et port USB pour recharger le téléphone. Article neuf, vérifié avant l’envoi.",
    specs: [["Puissance", "7 W LED"], ["Lumière", "3 teintes, variateur"], ["Bras", "Articulé"], ["Port", "USB"], ["Garantie", "12 mois"]],
    options: [{nom: "Couleur", valeurs: ["Noir", "Blanc"], choisi: "Noir"}],
    motsCles: ["lampe", "éclairage", "bureau", "lumière"],
  },
  'imprimante-maison': {
    marque: "HP",
    sousCategorie: "Informatique",
    description: "Imprimante multifonction jet d’encre : impression, copie et numérisation, Wi-Fi et application HP Smart pour imprimer depuis le téléphone. Neuf, testé avant l’envoi ; facture fournie au retrait.",
    specs: [["Fonctions", "Impression, copie, numérisation"], ["Connexion", "Wi-Fi · USB"], ["Vitesse", "8,5 pages/min en noir"], ["Cartouches", "HP 305"], ["Garantie", "12 mois"]],
    options: [],
    motsCles: ["imprimante", "scanner", "photocopie", "impression"],
  },
  pates: {
    marque: "Panzani",
    sousCategorie: "Épicerie",
    description: "Pâtes penne rigate de blé dur, paquet de 1 kg, cuisson 11 minutes. Produit scellé, date de péremption vérifiée par le vendeur.",
    specs: [["Poids", "1 kg"], ["Composition", "Semoule de blé dur"], ["Cuisson", "11 min"], ["État", "Scellé"]],
    options: [],
    motsCles: ["pâtes", "pates", "macaroni", "spaghetti", "penne"],
  },
  'meches-body-wave': {
    marque: "Sensationnel",
    sousCategorie: "Cheveux",
    description: "Trois paquets de mèches Body Wave en cheveux humains vierges (100 %), ondulation souple qui tient au lavage, couleur noir naturel qui se teint et se lisse. Longueurs 18, 20 et 22 pouces pour une tête complète, tissage ou perruque. Paquets scellés, vérifiés par le vendeur ; retour 7 jours si le paquet n’a pas été ouvert.",
    specs: [["Matière", "100 % cheveux humains vierges"], ["Texture", "Body Wave"], ["Couleur", "Noir naturel (1B)"], ["Longueurs", "18, 20 et 22 pouces"], ["Poids", "3 × 100 g"], ["État", "Scellé"]],
    options: [],
    motsCles: ["mèches", "meches", "tissage", "perruque", "cheveux naturels", "body wave", "brésiliennes", "extensions"],
  },
  'lait-poudre': {
    marque: "Bonnet Rouge",
    sousCategorie: "Épicerie",
    description: "Lait en poudre entier, boîte refermable de 900 g, enrichi en vitamines A et D. Produit scellé, date de péremption vérifiée par le vendeur.",
    specs: [["Poids", "900 g"], ["Type", "Lait entier"], ["Vitamines", "A et D"], ["État", "Scellé"]],
    options: [],
    motsCles: ["lait", "lait en poudre", "petit-déjeuner"],
  },
}

// Produits ajoutés (nouveau: true) : clonés depuis src (dessins, classe), dans l'univers donné ; photos réelles (assets/produits/<id>-1..4).
const UNIVERS_TITRE: Record<string, string> = { tel: 'Téléphones & tablettes', elec: 'Électronique', maison: 'Maison & cuisine', bebe: 'Bébé & enfant', sport: 'Sport & loisirs', marche: 'Supermarché', beaute: 'Beauté & santé' }
// Troisième colonne (facultative) : classe du colis et étiquettes propres au produit (les 20 arrivages d'octobre : « Nouveauté »).
// Quatrième colonne (facultative) : rang du vendeur (Boutique A = 0, B = 1…), pour qu'une ligne du panier de
// référence soit vendue par sa propre boutique, au prix du catalogue.
const NOUVEAUX: [Ligne, string, Partial<Produit>?, number?][] = [
  [['macbookair', 'tablette8', 'MacBook Air M3 13″', 'Minuit · 256 Go', 890000, '4,8', 42, 96, 6, 1.6], 'elec'],
  [['macbookpro', 'tablette8', 'MacBook Pro M4 14″', 'Noir sidéral · 512 Go', 1450000, '4,9', 28, 51, 4, 2.3], 'elec'],
  [['ps5pro', 'tv43', 'PlayStation 5 Pro', '2 To', 650000, '4,8', 57, 140, 5, 1.9], 'elec'],
  [['xboxsx', 'tv43', 'Xbox Series X', '1 To', 420000, '4,7', 39, 88, 7, 2.8], 'elec'],
  [['switch', 'tablette8', 'Nintendo Switch OLED', 'Blanc', 230000, '4,8', 73, 210, 11, 1.2], 'elec'],
  [['dualsense', 'ecouteurs', 'Manette DualSense Edge', null, 140000, '4,6', 31, 74, 9, 2.0], 'elec'],
  [['oledlg', 'tv43', 'Téléviseur LG OLED evo C4 65″', null, 1250000, '4,9', 22, 37, 3, 4.6], 'elec', { prixBarre: 1450000 }],
  [['barresono', 'elec-enceinte', 'Barre de son Sonos Arc Ultra', 'Noir', 650000, '4,7', 18, 29, 4, 3.3], 'elec'],
  [['djimini', 'batterie', 'Drone DJI Mini 4 Pro', 'Fly More Combo', 620000, '4,8', 26, 48, 5, 2.5], 'elec'],
  [['gopro', 'batterie', 'Caméra GoPro HERO13 Black', null, 310000, '4,6', 44, 102, 8, 1.7], 'elec'],
  [['canonr', 'batterie', 'Appareil photo Canon EOS R6 Mark II', 'Avec objectif 24-105 mm', 1650000, '4,9', 12, 19, 2, 3.9], 'elec'],
  [['galaxytabs10', 'tablette8', 'Samsung Galaxy Tab S10 Ultra', 'Gris · 256 Go', 980000, '4,7', 21, 45, 5, 1.4], 'tel'],
  [['iphone16e', 'iphone15pm', 'iPhone 16e', 'Blanc · 128 Go', 480000, '4,6', 64, 180, 12, 1.1], 'tel'],
  [['airpodsmax', 'elec-casque', 'AirPods Max USB-C', 'Lumière stellaire', 380000, '4,7', 35, 82, 7, 2.2], 'elec', { prixBarre: 430000 }],
  // Arrivages d'octobre (20 produits, photos réelles) : maison, rentrée, livres, bureau, supermarché.
  [['refrigerateur', 'ventilo', 'Réfrigérateur combiné Samsung 384 L No Frost', 'Inox brossé', 560000, '4,7', 38, 92, 6, 3.1], 'maison', { classe: 'XL', tags: ['Nouveauté'] }],
  [['lave-linge', 'ventilo', 'Lave-linge hublot LG 9 kg Inverter', 'Blanc', 420000, '4,6', 47, 118, 7, 2.6], 'maison', { classe: 'XL', prixBarre: 475000, tags: ['Nouveauté'] }],
  [['micro-ondes', 'marmite', 'Four à micro-ondes Samsung 25 L', 'Inox', 85000, '4,5', 96, 340, 18, 1.4], 'maison', { classe: 'L', tags: ['Nouveauté'] }],
  [['cuiseur-riz', 'marmite', 'Cuiseur à riz Tefal 1,8 L inox', null, 32000, '4,6', 168, 620, 34, 1.2], 'maison', { classe: 'M', tags: ['Nouveauté'] }, 1],
  [['batterie-cuisine', 'marmite', 'Batterie de cuisine WMF inox, 10 pièces', null, 165000, '4,7', 41, 110, 9, 2.2], 'maison', { classe: 'M', tags: ['Nouveauté'] }],
  [['service-table', 'marmite', 'Service de table en grès Luminarc, 16 pièces', 'Beige sable', 37000, '4,4', 57, 190, 15, 1.7], 'maison', { classe: 'M', tags: ['Nouveauté'] }],
  [['parure-lit', 'pagne', 'Parure de lit en coton lavé, 4 pièces', 'Lin naturel', 48000, '4,6', 73, 260, 21, 1.0], 'maison', { classe: 'S', tags: ['Nouveauté'] }],
  [['serviettes-bain', 'pagne', 'Serviettes de bain en coton, lot de 6', 'Taupe', 32000, '4,5', 88, 310, 26, 1.3], 'maison', { classe: 'S', tags: ['Nouveauté'] }],
  [['boites-rangement', 'marmite', 'Boîtes de rangement IKEA SAMLA 22 L, lot de 6', 'Transparent', 24500, '4,4', 64, 280, 30, 2.4], 'maison', { classe: 'L', tags: ['Nouveauté'] }],
  [['panier-linge', 'marmite', 'Panier à linge tressé main, 60 L', null, 15800, '4,5', 52, 170, 14, 0.9], 'maison', { classe: 'M', tags: ['Nouveauté'] }],
  [['lampe-bureau', 'ventilo', 'Lampe de bureau LED Philips articulée', 'Noir', 27500, '4,4', 61, 230, 22, 1.6], 'maison', { classe: 'S', tags: ['Nouveauté'] }],
  [['imprimante-maison', 'batterie', 'Imprimante multifonction HP DeskJet 4220e', 'Blanc', 52000, '4,3', 79, 260, 13, 2.0], 'elec', { classe: 'M', tags: ['Nouveauté'] }, 1],
  [['sac-ecole', 'cartable', 'Sac à dos scolaire Eastpak 24 L', 'Bleu marine / jaune', 28000, '4,7', 134, 520, 40, 1.1], 'bebe', { classe: 'S', tags: ['Nouveauté'] }],
  [['trousse-scolaire', 'cartable', 'Trousse scolaire garnie Maped, 24 pièces', 'Bleu nuit fleuri', 9900, '4,5', 112, 640, 55, 0.8], 'bebe', { classe: 'S', tags: ['Nouveauté'] }],
  [['cahiers-scolaires', 'cartable', 'Cahiers Clairefontaine 96 pages, lot de 5', '24 × 32 cm', 6500, '4,6', 205, 1150, 120, 0.7], 'bebe', { classe: 'S', tags: ['Nouveauté'] }],
  [['manuels-scolaires', 'cartable', 'Manuels scolaires illustrés Edicef, lot de 4', 'CM1', 18500, '4,5', 98, 470, 35, 1.5], 'bebe', { classe: 'S', tags: ['Nouveauté'] }],
  [['livres-enfants', 'cartable', 'Coffret L’École des loisirs, 6 albums jeunesse', 'Dès 4 ans', 22000, '4,8', 66, 210, 17, 1.9], 'bebe', { classe: 'S', tags: ['Nouveauté'] }],
  [['romans', 'cartable', 'Romans contemporains Folio, sélection de 5', 'Format poche', 23000, '4,6', 48, 150, 19, 2.1], 'sport', { classe: 'S', tags: ['Nouveauté'] }],
  [['pates', 'riz', 'Pâtes Panzani Penne rigate 1 kg', null, 1600, '4,5', 231, 1320, 150, 0.6], 'marche', { classe: 'S', tags: ['Nouveauté'] }],
  [['lait-poudre', 'huile5l', 'Lait en poudre entier Bonnet Rouge 900 g', null, 7800, '4,7', 186, 980, 90, 0.8], 'marche', { classe: 'S', tags: ['Nouveauté'] }],
  // Produit 96 (porteur, 17 oct. 2026) : beauté, coiffure.
  [['meches-body-wave', 'karite', 'Mèches Body Wave 100 % cheveux humains, lot de 3', 'Noir naturel · 18, 20 et 22 pouces', 65000, '4,6', 87, 340, 24, 1.3], 'beaute', { classe: 'S', sousCategorie: 'Cheveux', tags: ['Nouveauté'] }],
]

const km = (v: number) => String(v).replace('.', ',') + ' km'

// Produits d'origine (catalogue.ts) : dessins, catégorie, classe et options des produits repris.
export function etendre(base: Record<string, Produit>): Record<string, Produit> {
  const sortie: Record<string, Produit> = {}
  const ajouter = (l: Ligne, i: number, surcharge: Partial<Produit> = {}) => {
    const [id, src, titre, variante, prix, note, avis, ventes, stock, d] = l
    const o = sortie[src] ?? base[src]
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
      ...FICHES[id],
      ...surcharge,
    }
  }
  L.forEach((l, i) => ajouter(l, i))
  // iPhone 16 du vendeur de démonstration (Boutique B, Essos), identifiant iphone15pm gardé (campagnes, paniers).
  ajouter(['iphone15pm', 'camon30', 'iPhone 16', 'Outremer · 128 Go', 620000, '4,8', 36, 14, 2, 1.0], 1, {
    vendeur: { ...VENDEURS[1], km: 1 },
    tags: ['Garantie 12 mois'],
  })
  NOUVEAUX.forEach(([l, u, plus, rang], i) => ajouter(l, rang ?? L.length + 1 + i, { univers: u, universTitre: UNIVERS_TITRE[u], ...plus }))
  return sortie
}
