// Catalogue du jeu d'essai (DP-54) : les 30 produits du prototype (D.p), avec ce que la fiche affiche : prix,
// prix barré, note et avis, ventes, stock, catégorie, paramètres (couleur, capacité, taille, pointure ;
// indisponibles), marque (null : sans marque), vendeur certifié, autres vendeurs, description et caractéristiques. L'API servira le vrai catalogue.
import { srcsetCarrousel } from '../donnees/photosCarrousel'
import petites from '../genere/produits-petites.json'
import type { Produit } from '../donnees/source'
import { etendre } from './catalogue-etendu'
import { avecFiches } from './fiches-produits'

const CATALOGUE_BASE: Record<string, Produit> = {
 camon30: {
  p: "camon30",
  marque: "Apple",
  titre: "iPhone 16 Pro Max",
  variante: "Titane désert · 256 Go",
  prix: 950000,
  prixBarre: 1059000,
  depuis: 950000,
  classe: "S",
  distance: "1,2 km",
  note: "4,6",
  avis: 128,
  ventes: 412,
  stock: 23,
  univers: "tel",
  universTitre: "Téléphones & tablettes",
  sousCategorie: "Smartphones",
  tags: [
   "Garantie 12 mois"
  ],
  dessins: [
   "6a3ecf2fe865",
   "8bf046203afd",
   "c8ed74acd931",
   "fc7577438531"
  ],
  options: [
   {
    nom: "Couleur",
    valeurs: [
     "Titane désert",
     "Titane naturel",
     "Titane noir",
     "Titane blanc"
    ],
    indispo: [
     "Titane blanc"
    ],
    choisi: "Titane désert"
   },
   {
    nom: "Capacité",
    valeurs: [
     "256 Go",
     "512 Go",
     "1 To"
    ],
    indispo: [
     "1 To"
    ],
    prix: {
     "256 Go": 950000,
     "512 Go": 1100000
    },
    choisi: "256 Go"
   }
  ],
  vendeur: {
   boutique: "Boutique A",
   zone: "Mvog-Ada",
   score: 91,
   palier: "Or",
   km: 1.2
  },
  autres: [
   {
    boutique: "Boutique E",
    zone: "Essos",
    prix: 929800,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique F",
    zone: "Mokolo",
    prix: 950000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique G",
    zone: "Mvan",
    prix: 914100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Écran Super Retina XDR 6,9 pouces, puce A18 Pro, boîtier en titane et bouton Commande de l’appareil photo. Triple appareil photo 48 MP avec téléobjectif 5x. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Écran",
    "Super Retina XDR 6,9″ · 120 Hz"
   ],
   [
    "Puce",
    "A18 Pro"
   ],
   [
    "Mémoire",
    "256 Go"
   ],
   [
    "Appareil photo",
    "48 MP + 48 MP + 12 MP (5x)"
   ],
   [
    "Réseau",
    "5G · eSIM"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 itelac52: {
  p: "itelac52",
  marque: "Samsung",
  titre: "Samsung Galaxy Watch7",
  variante: "44 mm · Vert",
  prix: 210000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "0,9 km",
  note: "4,2",
  avis: 57,
  ventes: 188,
  stock: 21,
  univers: "tel",
  universTitre: "Téléphones & tablettes",
  sousCategorie: "Accessoires",
  tags: [],
  dessins: [
   "1a984b0b264a",
   "45e558c52172"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique B",
   zone: "Essos",
   score: 78,
   palier: "Argent",
   km: 0.9
  },
  autres: [
   {
    boutique: "Boutique H",
    zone: "Mokolo",
    prix: 209000,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Mvan",
    prix: 210000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Bastos",
    prix: 207900,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Montre connectée Galaxy Watch7 44 mm : suivi du sommeil, de la fréquence cardiaque et de plus de 100 sports, GPS double fréquence. Compatible Android. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Écran",
    "Super AMOLED 1,5″"
   ],
   [
    "Boîtier",
    "Aluminium 44 mm"
   ],
   [
    "Étanchéité",
    "5 ATM · IP68"
   ],
   [
    "Autonomie",
    "Jusqu’à 40 h"
   ],
   [
    "Compatibilité",
    "Android"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 galaxya15: {
  p: "galaxya15",
  marque: "Samsung",
  titre: "Samsung Galaxy S25 Ultra",
  variante: "Titane gris · 256 Go",
  prix: 890000,
  prixBarre: 989000,
  depuis: null,
  classe: "S",
  distance: "2,4 km",
  note: "4,5",
  avis: 93,
  ventes: 301,
  stock: 17,
  univers: "tel",
  universTitre: "Téléphones & tablettes",
  sousCategorie: "Smartphones",
  tags: [],
  dessins: [
   "20344e766a88",
   "96013188e842"
  ],
  options: [
   {
    nom: "Couleur",
    valeurs: [
     "Titane gris",
     "Titane noir",
     "Titane argent bleu"
    ],
    choisi: "Titane gris"
   },
   {
    nom: "Capacité",
    valeurs: [
     "256 Go",
     "512 Go",
     "1 To"
    ],
    indispo: [
     "1 To"
    ],
    prix: {
     "256 Go": 890000,
     "512 Go": 990000
    },
    choisi: "256 Go"
   }
  ],
  vendeur: {
   boutique: "Boutique B",
   zone: "Melen",
   score: 78,
   palier: "Argent",
   km: 2.4
  },
  autres: [
   {
    boutique: "Boutique K",
    zone: "Emana",
    prix: 857300,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique E",
    zone: "Nlongkak",
    prix: 890000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique F",
    zone: "Mvog-Ada",
    prix: 831600,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Écran Dynamic AMOLED 6,9 pouces, Snapdragon 8 Elite, S Pen intégré et capteur principal 200 MP. Galaxy AI en français. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Écran",
    "Dynamic AMOLED 2X 6,9″ · 120 Hz"
   ],
   [
    "Processeur",
    "Snapdragon 8 Elite"
   ],
   [
    "Mémoire",
    "256 Go · 12 Go RAM"
   ],
   [
    "Appareil photo",
    "200 MP + 50 MP + 50 MP + 10 MP"
   ],
   [
    "Batterie",
    "5 000 mAh · 45 W"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 tablette8: {
  p: "tablette8",
  marque: "Apple",
  titre: "iPad Pro M4 11″",
  variante: "Noir sidéral · 256 Go",
  prix: 820000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "1,2 km",
  note: "4,3",
  avis: 21,
  ventes: 55,
  stock: 21,
  univers: "tel",
  universTitre: "Téléphones & tablettes",
  sousCategorie: "Tablettes",
  tags: [],
  dessins: [
   "56c508c32ab2",
   "6d95c1664bef"
  ],
  options: [
   {
    nom: "Couleur",
    valeurs: [
     "Noir sidéral",
     "Argent"
    ],
    choisi: "Noir sidéral"
   },
   {
    nom: "Capacité",
    valeurs: [
     "256 Go",
     "512 Go",
     "1 To"
    ],
    indispo: [
     "1 To"
    ],
    prix: {
     "256 Go": 820000,
     "512 Go": 960000
    },
    choisi: "256 Go"
   }
  ],
  vendeur: {
   boutique: "Boutique B",
   zone: "Melen",
   score: 78,
   palier: "Argent",
   km: 1.2
  },
  autres: [
   {
    boutique: "Boutique H",
    zone: "Emana",
    prix: 777700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Nlongkak",
    prix: 820000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Mvog-Ada",
    prix: 744400,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Écran Ultra Retina XDR tandem OLED 11 pouces, puce M4 et Face ID. Compatible Apple Pencil Pro et Magic Keyboard. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Écran",
    "Ultra Retina XDR 11″ OLED"
   ],
   [
    "Puce",
    "Apple M4"
   ],
   [
    "Mémoire",
    "256 Go"
   ],
   [
    "Connectivité",
    "Wi-Fi 6E"
   ],
   [
    "Appareil photo",
    "12 MP · LiDAR"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 ecouteurs: {
  p: "ecouteurs",
  marque: "Apple",
  titre: "AirPods 4 réduction de bruit",
  variante: null,
  prix: 120000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "0,8 km",
  note: "4,3",
  avis: 211,
  ventes: 640,
  stock: 23,
  univers: "elec",
  universTitre: "Électronique",
  sousCategorie: "Audio",
  tags: [],
  motsCles: [
   "écouteurs",
   "airpods"
  ],
  dessins: [
   "2b5bcef070f6",
   "47c0b20d4e26",
   "66d4c2481f0f",
   "8bfb5146603e"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique D",
   zone: "Nlongkak",
   score: 85,
   palier: "Argent",
   km: 0.8
  },
  autres: [
   {
    boutique: "Boutique F",
    zone: "Mvog-Ada",
    prix: 119300,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Essos",
    prix: 120000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Mokolo",
    prix: 118500,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Écouteurs sans fil avec réduction active du bruit, audio spatial personnalisé et boîtier de charge USB-C. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Réduction de bruit",
    "Active"
   ],
   [
    "Puce",
    "Apple H2"
   ],
   [
    "Autonomie",
    "5 h · 30 h avec le boîtier"
   ],
   [
    "Charge",
    "USB-C · sans fil"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 chargeur33: {
  p: "chargeur33",
  marque: "Apple",
  titre: "Chargeur Apple MagSafe 25 W",
  variante: null,
  prix: 35000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "0,6 km",
  note: "4,4",
  avis: 175,
  ventes: 902,
  stock: 23,
  univers: "tel",
  universTitre: "Téléphones & tablettes",
  sousCategorie: "Accessoires",
  tags: [
   "Populaire"
  ],
  dessins: [
   "35fceeb9f734",
   "d86ad7218c7b",
   "dc530be6c1cd"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique D",
   zone: "Nlongkak",
   score: 85,
   palier: "Argent",
   km: 0.6
  },
  autres: [
   {
    boutique: "Boutique H",
    zone: "Mvog-Ada",
    prix: 34500,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 35000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Mokolo",
    prix: 33900,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Chargeur magnétique MagSafe jusqu’à 25 W pour iPhone 16, câble USB-C tressé de 1 m. Compatible AirPods. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Puissance",
    "Jusqu’à 25 W"
   ],
   [
    "Connecteur",
    "USB-C"
   ],
   [
    "Câble",
    "1 m"
   ],
   [
    "Compatibilité",
    "iPhone 12 et suivants · AirPods"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 batterie: {
  p: "batterie",
  marque: "Anker",
  titre: "Anker Prime 20 000 mAh 200 W",
  variante: null,
  prix: 70000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "1,9 km",
  note: "4,5",
  avis: 66,
  ventes: 214,
  stock: 20,
  univers: "elec",
  universTitre: "Électronique",
  sousCategorie: "Énergie & batteries",
  tags: [],
  motsCles: [
   "batterie"
  ],
  dessins: [
   "7ca378829a90",
   "c746cb3b6c6e"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique A",
   zone: "Mvog-Ada",
   score: 91,
   palier: "Or",
   km: 1.9
  },
  autres: [
   {
    boutique: "Boutique G",
    zone: "Essos",
    prix: 69500,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique H",
    zone: "Mokolo",
    prix: 70000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique J",
    zone: "Mvan",
    prix: 69100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Batterie externe 20 000 mAh et 200 W au total : recharge un ordinateur portable et deux téléphones à la fois, écran d’état intelligent. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Capacité",
    "20 000 mAh"
   ],
   [
    "Puissance",
    "200 W au total"
   ],
   [
    "Ports",
    "2 USB-C · 1 USB-A"
   ],
   [
    "Écran",
    "Affichage numérique"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 tv43: {
  p: "tv43",
  marque: "Samsung",
  titre: "Samsung Neo QLED 4K 55″",
  variante: null,
  prix: 750000,
  prixBarre: null,
  depuis: null,
  classe: "XL",
  distance: "5,2 km",
  note: "4,4",
  avis: 31,
  ventes: 58,
  stock: 29,
  univers: "elec",
  universTitre: "Électronique",
  sousCategorie: "TV & vidéo",
  tags: [],
  motsCles: [
   "téléviseur",
   "tv"
  ],
  dessins: [
   "330d95174f5e",
   "430ff24b771d"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique B",
   zone: "Essos",
   score: 78,
   palier: "Argent",
   km: 5.2
  },
  autres: [
   {
    boutique: "Boutique F",
    zone: "Mokolo",
    prix: 736900,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Mvan",
    prix: 750000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Bastos",
    prix: 726600,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Téléviseur Neo QLED 4K 55 pouces, rétroéclairage Mini LED, 120 Hz et Smart TV Tizen. Livré et installé chez toi. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Taille",
    "55″ (139 cm)"
   ],
   [
    "Définition",
    "4K UHD · Mini LED"
   ],
   [
    "Fréquence",
    "120 Hz"
   ],
   [
    "Système",
    "Tizen · Wi-Fi"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 ventilo: {
  p: "ventilo",
  marque: "Dyson",
  titre: "Dyson Purifier Cool TP10",
  variante: "Blanc / Or",
  prix: 450000,
  prixBarre: null,
  depuis: null,
  classe: "L",
  distance: "3,1 km",
  note: "4,1",
  avis: 48,
  ventes: 170,
  stock: 21,
  univers: "maison",
  universTitre: "Maison & cuisine",
  sousCategorie: "Petit électroménager",
  tags: [],
  motsCles: [
   "ventilateur"
  ],
  dessins: [
   "02cc832346b3",
   "060353a0c342",
   "2f73bcd387c1"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique B",
   zone: "Essos",
   score: 78,
   palier: "Argent",
   km: 3.1
  },
  autres: [
   {
    boutique: "Boutique F",
    zone: "Mokolo",
    prix: 389400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Mvan",
    prix: 450000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Bastos",
    prix: 341600,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Purificateur et ventilateur 2 en 1 : filtre HEPA H13, capte 99,95 % des particules fines, oscillation 350°. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Fonction",
    "Purificateur · ventilateur"
   ],
   [
    "Filtration",
    "HEPA H13 · charbon actif"
   ],
   [
    "Oscillation",
    "350°"
   ],
   [
    "Commande",
    "Télécommande · application"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 mixeur: {
  p: "mixeur",
  marque: "Ninja",
  titre: "Ninja Blender professionnel 1 200 W",
  variante: null,
  prix: 120000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "4,8 km",
  note: "4,3",
  avis: 84,
  ventes: 260,
  stock: 18,
  univers: "maison",
  universTitre: "Maison & cuisine",
  sousCategorie: "Petit électroménager",
  tags: [],
  motsCles: [
   "mixeur",
   "blender"
  ],
  dessins: [
   "1bf387ebd71e",
   "6cd10aa8c291"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique C",
   zone: "Mokolo",
   score: 64,
   palier: "Bronze",
   km: 4.8
  },
  autres: [
   {
    boutique: "Boutique E",
    zone: "Mvan",
    prix: 109300,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique F",
    zone: "Bastos",
    prix: 120000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique G",
    zone: "Melen",
    prix: 100900,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Blender 1 200 W, bol de 2,1 L et lames Total Crushing pour glace pilée, smoothies et sauces. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Puissance",
    "1 200 W"
   ],
   [
    "Bol",
    "2,1 L"
   ],
   [
    "Vitesses",
    "3 + impulsion"
   ],
   [
    "Entretien",
    "Lavable au lave-vaisselle"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 fer: {
  p: "fer",
  marque: "Philips",
  titre: "Défroisseur vapeur Philips 3000",
  variante: null,
  prix: 65000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "1,6 km",
  note: "4,0",
  avis: 39,
  ventes: 121,
  stock: 29,
  univers: "maison",
  universTitre: "Maison & cuisine",
  sousCategorie: "Petit électroménager",
  tags: [],
  motsCles: [
   "repasser"
  ],
  dessins: [
   "2563d7011b1e",
   "3626f48d73f7"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique B",
   zone: "Melen",
   score: 78,
   palier: "Argent",
   km: 1.6
  },
  // La commande témoin de la démonstration commune (CAHIER-CONNECTIVITE.md) : Boutique B (Tonton PG) est la seule à
  // vendre ce défroisseur (65 000 F, sous le plafond de 75 000 F du palier Nouveau de Yafé Express, D11) ; la
  // meilleure offre (D8) l'attribue donc à Boutique B.
  autres: [],
  description: "Défroisseur vapeur vertical 2 000 W : prêt en 30 secondes, pour chemises, pagnes et rideaux sans table à repasser. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Puissance",
    "2 000 W"
   ],
   [
    "Vapeur",
    "Jusqu’à 40 g/min"
   ],
   [
    "Réservoir",
    "1,8 L"
   ],
   [
    "Chauffe",
    "30 secondes"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 marmite: {
  p: "marmite",
  marque: "Philips",
  titre: "Airfryer Philips XXL",
  variante: "7,2 L",
  prix: 145000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "2,7 km",
  note: "4,6",
  avis: 22,
  ventes: 74,
  stock: 23,
  univers: "maison",
  universTitre: "Maison & cuisine",
  sousCategorie: "Cuisine",
  tags: [],
  motsCles: [
   "friteuse"
  ],
  dessins: [
   "6aeead69d8da",
   "86c6d76d224e"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique D",
   zone: "Nlongkak",
   score: 85,
   palier: "Argent",
   km: 2.7
  },
  autres: [
   {
    boutique: "Boutique F",
    zone: "Mvog-Ada",
    prix: 123300,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Essos",
    prix: 145000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Mokolo",
    prix: 106100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Friteuse sans huile 7,2 L, technologie Rapid Air : cuisine pour toute la famille avec jusqu’à 90 % de matières grasses en moins. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Capacité",
    "7,2 L"
   ],
   [
    "Puissance",
    "2 000 W"
   ],
   [
    "Programmes",
    "16 modes de cuisson"
   ],
   [
    "Entretien",
    "Lavable au lave-vaisselle"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 ensemblewax: {
  p: "ensemblewax",
  marque: "Vlisco",
  titre: "Ensemble Vlisco Super Wax 3 pièces",
  variante: null,
  prix: 75000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "0,7 km",
  note: "4,7",
  avis: 64,
  ventes: 233,
  stock: 31,
  univers: "femme",
  universTitre: "Mode femme",
  sousCategorie: "Pagnes & wax",
  tags: [],
  dessins: [
   "0875c550060b",
   "133b889e63e7"
  ],
  options: [
   {
    nom: "Taille",
    valeurs: [
     "S",
     "M",
     "L",
     "XL"
    ],
    indispo: [
     "XL"
    ],
    choisi: "M"
   }
  ],
  vendeur: {
   boutique: "Boutique D",
   zone: "Mvan",
   score: 85,
   palier: "Argent",
   km: 0.7
  },
  autres: [
   {
    boutique: "Boutique H",
    zone: "Bastos",
    prix: 67300,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Melen",
    prix: 75000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Emana",
    prix: 61200,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Ensemble trois pièces en Vlisco Super Wax : haut, jupe et foulard assortis, coupe ajustée. Échange possible si la taille ne va pas (retour 7 jours).",
  specs: [
   [
    "Tissu",
    "Vlisco Super Wax"
   ],
   [
    "Pièces",
    "Haut · jupe · foulard"
   ],
   [
    "Entretien",
    "Lavage à 30 °C"
   ],
   [
    "Retour",
    "7 jours"
   ]
  ]
 },
 saccuir: {
  p: "saccuir",
  marque: "Michael Kors",
  titre: "Sac Michael Kors Jet Set",
  variante: "Cuir caramel",
  prix: 185000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "0,7 km",
  note: "4,8",
  avis: 41,
  ventes: 97,
  stock: 18,
  univers: "femme",
  universTitre: "Mode femme",
  sousCategorie: "Sacs",
  tags: [],
  motsCles: [
   "sac"
  ],
  dessins: [
   "30942470397d",
   "63612bb6f86f"
  ],
  options: [
   {
    nom: "Couleur",
    valeurs: [
     "Cuir caramel",
     "Noir",
     "Vanille"
    ],
    indispo: [
     "Vanille"
    ],
    choisi: "Cuir caramel"
   }
  ],
  vendeur: {
   boutique: "Boutique C",
   zone: "Mokolo",
   score: 64,
   palier: "Bronze",
   km: 0.7
  },
  autres: [
   {
    boutique: "Boutique G",
    zone: "Mvan",
    prix: 173300,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique H",
    zone: "Bastos",
    prix: 185000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique J",
    zone: "Melen",
    prix: 164000,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Sac cabas Jet Set en cuir grainé, fermeture zippée, poches intérieures et anses portées épaule.",
  specs: [
   [
    "Matière",
    "Cuir grainé"
   ],
   [
    "Fermeture",
    "Zip"
   ],
   [
    "Dimensions",
    "39 × 29 × 14 cm"
   ],
   [
    "Retour",
    "7 jours"
   ]
  ]
 },
 pagne: {
  p: "pagne",
  marque: "Vlisco",
  titre: "Pagne Vlisco Super Wax 6 yards · motif soleil",
  variante: null,
  prix: 42000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "0,5 km",
  note: "4,7",
  avis: 152,
  ventes: 518,
  stock: 15,
  univers: "femme",
  universTitre: "Mode femme",
  sousCategorie: "Pagnes & wax",
  tags: [
   "Le plus proche"
  ],
  dessins: [
   "3b1f75cfa3ab",
   "adff434c44d0",
   "bf4e892644c3"
  ],
  options: [
   {
    nom: "Taille",
    valeurs: [
     "S",
     "M",
     "L",
     "XL"
    ],
    indispo: [
     "XL"
    ],
    choisi: "M"
   }
  ],
  vendeur: {
   boutique: "Boutique D",
   zone: "Mvan",
   score: 85,
   palier: "Argent",
   km: 0.5
  },
  autres: [
   {
    boutique: "Boutique F",
    zone: "Bastos",
    prix: 41800,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Melen",
    prix: 42000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Emana",
    prix: 41500,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Pagne Vlisco Super Wax 6 yards, motif soleil, couleurs garanties grand teint.",
  specs: [
   [
    "Tissu",
    "Vlisco Super Wax 100 % coton"
   ],
   [
    "Longueur",
    "6 yards (5,5 m)"
   ],
   [
    "Motif",
    "Soleil"
   ],
   [
    "Retour",
    "7 jours"
   ]
  ]
 },
 robewax: {
  p: "robewax",
  marque: "Vlisco",
  titre: "Robe longue en wax, coupe moderne",
  variante: null,
  prix: 55000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "1,4 km",
  note: "4,5",
  avis: 58,
  ventes: 176,
  stock: 12,
  univers: "femme",
  universTitre: "Mode femme",
  sousCategorie: "Robes",
  tags: [],
  dessins: [
   "0e10b70ce5b2",
   "ebe6ccc0fef4"
  ],
  options: [
   {
    nom: "Taille",
    valeurs: [
     "S",
     "M",
     "L",
     "XL"
    ],
    indispo: [
     "XL"
    ],
    choisi: "M"
   }
  ],
  vendeur: {
   boutique: "Boutique A",
   zone: "Mvog-Ada",
   score: 91,
   palier: "Or",
   km: 1.4
  },
  autres: [
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 47400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique K",
    zone: "Mokolo",
    prix: 55000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique E",
    zone: "Mvan",
    prix: 41500,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Robe longue en wax Vlisco, coupe moderne cintrée à la taille, fermeture dans le dos.",
  specs: [
   [
    "Tissu",
    "Wax Vlisco 100 % coton"
   ],
   [
    "Coupe",
    "Longue, cintrée"
   ],
   [
    "Entretien",
    "Lavage à 30 °C"
   ],
   [
    "Retour",
    "7 jours"
   ]
  ]
 },
 chemise: {
  p: "chemise",
  marque: null,
  titre: "Chemise bazin brodée",
  variante: null,
  prix: 45000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "3,6 km",
  note: "4,4",
  avis: 37,
  ventes: 109,
  stock: 26,
  univers: "homme",
  universTitre: "Mode homme",
  sousCategorie: "Chemises",
  tags: [],
  dessins: [
   "d526d9d3fe62",
   "e95ef68e7182"
  ],
  options: [
   {
    nom: "Taille",
    valeurs: [
     "S",
     "M",
     "L",
     "XL"
    ],
    indispo: [
     "XL"
    ],
    choisi: "M"
   }
  ],
  vendeur: {
   boutique: "Boutique C",
   zone: "Emana",
   score: 64,
   palier: "Bronze",
   km: 3.6
  },
  autres: [
   {
    boutique: "Boutique G",
    zone: "Nlongkak",
    prix: 37900,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique H",
    zone: "Mvog-Ada",
    prix: 45000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 32400,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Chemise en bazin riche brodée à la main, col officier, pour les cérémonies.",
  specs: [
   [
    "Tissu",
    "Bazin riche"
   ],
   [
    "Finition",
    "Broderie main"
   ],
   [
    "Col",
    "Officier"
   ],
   [
    "Retour",
    "7 jours"
   ]
  ]
 },
 montre: {
  p: "montre",
  marque: "Garmin",
  titre: "Montre Garmin Fenix 8",
  variante: "47 mm · Ardoise",
  prix: 690000,
  prixBarre: 750000,
  depuis: null,
  classe: "S",
  distance: "2,2 km",
  note: "4,3",
  avis: 29,
  ventes: 88,
  stock: 13,
  univers: "homme",
  universTitre: "Mode homme",
  sousCategorie: "Montres",
  tags: [],
  motsCles: [
   "montre"
  ],
  dessins: [
   "4241cc89c7cc",
   "465a7de86fd7",
   "e5c0e2fb6ad6"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique B",
   zone: "Melen",
   score: 78,
   palier: "Argent",
   km: 2.2
  },
  autres: [
   {
    boutique: "Boutique F",
    zone: "Emana",
    prix: 607200,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Nlongkak",
    prix: 690000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Mvog-Ada",
    prix: 542000,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Montre GPS multisport 47 mm, écran AMOLED, lampe LED intégrée, cartes et jusqu’à 16 jours d’autonomie. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Écran",
    "AMOLED 1,4″"
   ],
   [
    "Boîtier",
    "47 mm · lunette titane"
   ],
   [
    "Autonomie",
    "Jusqu’à 16 jours"
   ],
   [
    "Étanchéité",
    "10 ATM · plongée 40 m"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 sandales: {
  p: "sandales",
  marque: "Nike",
  titre: "Nike Air Force 1 ’07",
  variante: "Blanc",
  prix: 85000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "0,9 km",
  note: "4,4",
  avis: 73,
  ventes: 245,
  stock: 15,
  univers: "chauss",
  universTitre: "Chaussures",
  sousCategorie: "Femme",
  tags: [],
  motsCles: [
   "baskets",
   "nike"
  ],
  dessins: [
   "46807d04a705",
   "9291006e5b10",
   "d904fc29309b"
  ],
  options: [
   {
    nom: "Pointure",
    valeurs: [
     "38",
     "39",
     "40",
     "41",
     "42",
     "43"
    ],
    indispo: [
     "43"
    ],
    choisi: "39"
   }
  ],
  vendeur: {
   boutique: "Boutique D",
   zone: "Mvan",
   score: 85,
   palier: "Argent",
   km: 0.9
  },
  autres: [
   {
    boutique: "Boutique H",
    zone: "Bastos",
    prix: 84400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Melen",
    prix: 85000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Emana",
    prix: 83900,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Baskets Nike Air Force 1 ’07 en cuir blanc, amorti Air, semelle cousue. Échange de pointure possible (retour 7 jours).",
  specs: [
   [
    "Dessus",
    "Cuir"
   ],
   [
    "Amorti",
    "Nike Air"
   ],
   [
    "Semelle",
    "Caoutchouc"
   ],
   [
    "Retour",
    "7 jours"
   ]
  ]
 },
 baskets: {
  p: "baskets",
  marque: "Nike",
  titre: "Nike Air Max Dn",
  variante: "Noir / volt",
  prix: 120000,
  prixBarre: 140000,
  depuis: null,
  classe: "S",
  distance: "3,3 km",
  note: "4,2",
  avis: 51,
  ventes: 163,
  stock: 21,
  univers: "chauss",
  universTitre: "Chaussures",
  sousCategorie: "Sport",
  tags: [],
  motsCles: [
   "baskets"
  ],
  dessins: [
   "032cafed79c8",
   "c72c9cf7429c"
  ],
  options: [
   {
    nom: "Pointure",
    valeurs: [
     "38",
     "39",
     "40",
     "41",
     "42",
     "43"
    ],
    indispo: [
     "43"
    ],
    choisi: "42"
   }
  ],
  vendeur: {
   boutique: "Boutique B",
   zone: "Melen",
   score: 78,
   palier: "Argent",
   km: 3.3
  },
  autres: [
   {
    boutique: "Boutique K",
    zone: "Emana",
    prix: 106800,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique E",
    zone: "Nlongkak",
    prix: 120000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique F",
    zone: "Mvog-Ada",
    prix: 96300,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Baskets Nike Air Max Dn, amorti Dynamic Air à quatre chambres, tige en mesh respirant.",
  specs: [
   [
    "Dessus",
    "Mesh et synthétique"
   ],
   [
    "Amorti",
    "Dynamic Air"
   ],
   [
    "Semelle",
    "Caoutchouc"
   ],
   [
    "Retour",
    "7 jours"
   ]
  ]
 },
 karite: {
  p: "karite",
  marque: "Dyson",
  titre: "Sèche-cheveux Dyson Supersonic",
  variante: "Fuchsia / nickel",
  prix: 420000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "1,0 km",
  note: "4,8",
  avis: 301,
  ventes: 1120,
  stock: 12,
  univers: "beaute",
  universTitre: "Beauté & santé",
  sousCategorie: "Cheveux",
  tags: [],
  motsCles: [
   "cheveux"
  ],
  dessins: [
   "4d520c8a165b",
   "603cb36e1d48"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique A",
   zone: "Mvog-Ada",
   score: 91,
   palier: "Or",
   km: 1
  },
  autres: [
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 408000,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique K",
    zone: "Mokolo",
    prix: 420000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique E",
    zone: "Mvan",
    prix: 396000,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Sèche-cheveux Dyson Supersonic, contrôle intelligent de la chaleur, cinq embouts dont diffuseur pour cheveux bouclés. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Puissance",
    "1 600 W"
   ],
   [
    "Embouts",
    "5 accessoires"
   ],
   [
    "Chaleur",
    "Contrôle intelligent"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 coco: {
  p: "coco",
  marque: "Oral-B",
  titre: "Brosse à dents Oral-B iO Series 9",
  variante: null,
  prix: 150000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "1,3 km",
  note: "4,6",
  avis: 118,
  ventes: 430,
  stock: 12,
  univers: "beaute",
  universTitre: "Beauté & santé",
  sousCategorie: "Hygiène",
  tags: [],
  dessins: [
   "25ee2829127a",
   "3a3895ec7b7b"
  ],
  options: [
   { nom: "Couleur", valeurs: ["Noir onyx", "Rose quartz", "Aquamarine"], indispo: ["Aquamarine"], choisi: "Noir onyx" },
   { nom: "Coffret", valeurs: ["Brosse seule", "Avec étui de voyage chargeur"], prix: { "Brosse seule": 150000, "Avec étui de voyage chargeur": 150699 }, choisi: "Brosse seule" }
  ],
  vendeur: {
   boutique: "Boutique A",
   zone: "Bastos",
   score: 91,
   palier: "Or",
   km: 1.3
  },
  autres: [
   {
    boutique: "Boutique E",
    zone: "Melen",
    prix: 149500,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique F",
    zone: "Emana",
    prix: 150000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique G",
    zone: "Nlongkak",
    prix: 149000,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Brosse à dents électrique Oral-B iO Series 9, intelligence artificielle de suivi, 7 modes et écran couleur. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Modes",
    "7"
   ],
   [
    "Capteur",
    "Pression intelligent"
   ],
   [
    "Autonomie",
    "2 semaines"
   ],
   [
    "Étui",
    "Étui de voyage chargeur"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 cremevisage: {
  p: "cremevisage",
  marque: "The Ordinary",
  titre: "Sérum The Ordinary Niacinamide 30 ml",
  variante: null,
  prix: 12000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "2,0 km",
  note: "4,4",
  avis: 46,
  ventes: 150,
  stock: 15,
  univers: "beaute",
  universTitre: "Beauté & santé",
  sousCategorie: "Soins visage",
  tags: [],
  motsCles: [
   "sérum"
  ],
  dessins: [
   "614b474fa05f",
   "9ae7c3ae964a"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique D",
   zone: "Mvan",
   score: 85,
   palier: "Argent",
   km: 2
  },
  autres: [
   {
    boutique: "Boutique K",
    zone: "Bastos",
    prix: 11800,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique E",
    zone: "Melen",
    prix: 12000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique F",
    zone: "Emana",
    prix: 11700,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Sérum Niacinamide 10 % + Zinc 1 % 30 ml : réduit les imperfections et resserre les pores. Produit scellé.",
  specs: [
   [
    "Contenance",
    "30 ml"
   ],
   [
    "Actifs",
    "Niacinamide 10 % · zinc 1 %"
   ],
   [
    "Peau",
    "Tous types"
   ],
   [
    "État",
    "Neuf, scellé"
   ]
  ]
 },
 riz: {
  p: "riz",
  marque: "Royal Umbrella",
  titre: "Riz parfumé Royal Umbrella 25 kg",
  variante: null,
  prix: 22000,
  prixBarre: null,
  depuis: null,
  classe: "L",
  distance: "1,7 km",
  note: "4,5",
  avis: 87,
  ventes: 390,
  stock: 13,
  univers: "marche",
  universTitre: "Supermarché",
  sousCategorie: "Épicerie",
  tags: [],
  dessins: [
   "3499c5c0a9f4",
   "8a529ed55590"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique B",
   zone: "Melen",
   score: 78,
   palier: "Argent",
   km: 1.7
  },
  autres: [
   {
    boutique: "Boutique K",
    zone: "Emana",
    prix: 21900,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique E",
    zone: "Nlongkak",
    prix: 22000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique F",
    zone: "Mvog-Ada",
    prix: 21800,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Riz parfumé Royal Umbrella, sac de 25 kg, grains longs. Produit scellé, date vérifiée par le vendeur.",
  specs: [
   [
    "Poids",
    "25 kg"
   ],
   [
    "Variété",
    "Jasmin parfumé"
   ],
   [
    "Origine",
    "Thaïlande"
   ],
   [
    "État",
    "Scellé"
   ]
  ]
 },
 huile5l: {
  p: "huile5l",
  marque: "Lesieur",
  titre: "Huile d’arachide Lesieur 5 L",
  variante: null,
  prix: 12500,
  prixBarre: null,
  depuis: null,
  classe: "M",
  distance: "1,7 km",
  note: "4,6",
  avis: 64,
  ventes: 280,
  stock: 28,
  univers: "marche",
  universTitre: "Supermarché",
  sousCategorie: "Épicerie",
  tags: [],
  dessins: [
   "56af8b436322",
   "6fbbd05006d1"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique A",
   zone: "Mvog-Ada",
   score: 91,
   palier: "Or",
   km: 1.7
  },
  autres: [
   {
    boutique: "Boutique E",
    zone: "Essos",
    prix: 12400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique F",
    zone: "Mokolo",
    prix: 12500,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique G",
    zone: "Mvan",
    prix: 12200,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Huile d’arachide Lesieur 5 L pour la friture et la cuisine. Produit scellé.",
  specs: [
   [
    "Contenance",
    "5 L"
   ],
   [
    "Type",
    "Arachide"
   ],
   [
    "Usage",
    "Cuisson · friture"
   ],
   [
    "État",
    "Scellé"
   ]
  ]
 },
 cafe: {
  p: "cafe",
  marque: "Nespresso",
  titre: "Capsules Nespresso Vertuo, coffret 50",
  variante: null,
  prix: 28000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "5,9 km",
  note: "4,7",
  avis: 52,
  ventes: 196,
  stock: 31,
  univers: "marche",
  universTitre: "Supermarché",
  sousCategorie: "Boissons",
  tags: [],
  motsCles: [
   "café"
  ],
  dessins: [
   "08be73d8e63b",
   "23c68d9299ea"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique D",
   zone: "Nlongkak",
   score: 85,
   palier: "Argent",
   km: 5.9
  },
  autres: [
   {
    boutique: "Boutique H",
    zone: "Mvog-Ada",
    prix: 27500,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 28000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Mokolo",
    prix: 27000,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Coffret de 50 capsules Nespresso Vertuo, assortiment de cafés, compatible machines Vertuo.",
  specs: [
   [
    "Quantité",
    "50 capsules"
   ],
   [
    "Système",
    "Vertuo"
   ],
   [
    "Assortiment",
    "5 cafés"
   ],
   [
    "État",
    "Scellé"
   ]
  ]
 },
 portebebe: {
  p: "portebebe",
  marque: "Cybex",
  titre: "Poussette Cybex Priam",
  variante: "Noir profond",
  prix: 780000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "2,9 km",
  note: "4,6",
  avis: 27,
  ventes: 64,
  stock: 24,
  univers: "bebe",
  universTitre: "Bébé & enfant",
  sousCategorie: "Puériculture",
  tags: [],
  motsCles: [
   "poussette"
  ],
  dessins: [
   "2b87fb3289d9",
   "ada19db4961b"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique A",
   zone: "Mvog-Ada",
   score: 91,
   palier: "Or",
   km: 2.9
  },
  autres: [
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 776100,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique K",
    zone: "Mokolo",
    prix: 780000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique E",
    zone: "Mvan",
    prix: 772200,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Poussette de luxe Cybex Priam, châssis tout-terrain, nacelle et siège réversible. Article neuf, conforme aux normes de sécurité.",
  specs: [
   [
    "Âge",
    "De la naissance à 22 kg"
   ],
   [
    "Châssis",
    "Aluminium, 4 roues suspendues"
   ],
   [
    "Pliage",
    "Une main"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 cartable: {
  p: "cartable",
  marque: "Amazon",
  titre: "Tablette enfant Amazon Fire HD 10 Kids",
  variante: "Bleu",
  prix: 120000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "1,5 km",
  note: "4,3",
  avis: 33,
  ventes: 140,
  stock: 22,
  univers: "bebe",
  universTitre: "Bébé & enfant",
  sousCategorie: "Jouets",
  tags: [],
  motsCles: [
   "tablette",
   "enfant"
  ],
  dessins: [
   "bfb8686109b5",
   "ce0ff7c5f5d4",
   "e1cc42b683d8"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique C",
   zone: "Emana",
   score: 64,
   palier: "Bronze",
   km: 1.5
  },
  autres: [
   {
    boutique: "Boutique G",
    zone: "Nlongkak",
    prix: 119000,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique H",
    zone: "Mvog-Ada",
    prix: 120000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 118100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Tablette Fire HD 10 Kids, écran 10,1 pouces, coque antichoc et un an d’Amazon Kids+ ; contrôle parental. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Écran",
    "10,1″ Full HD"
   ],
   [
    "Mémoire",
    "32 Go"
   ],
   [
    "Âge",
    "3 à 7 ans"
   ],
   [
    "Protection",
    "Coque antichoc"
   ],
   [
    "Garantie",
    "2 ans contre la casse"
   ]
  ]
 },
 ballon: {
  p: "ballon",
  marque: "Sony",
  titre: "PlayStation 5 Slim",
  variante: "Édition standard · 1 To",
  prix: 380000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "3,8 km",
  note: "4,4",
  avis: 45,
  ventes: 205,
  stock: 24,
  univers: "elec",
  universTitre: "Électronique",
  sousCategorie: "Jeux vidéo",
  tags: [],
  motsCles: [
   "ps5",
   "playstation",
   "console"
  ],
  dessins: [
   "4de2951979b3",
   "c84f1e9045b6"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique A",
   zone: "Mvog-Ada",
   score: 91,
   palier: "Or",
   km: 3.8
  },
  autres: [
   {
    boutique: "Boutique G",
    zone: "Essos",
    prix: 375500,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique H",
    zone: "Mokolo",
    prix: 380000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique J",
    zone: "Mvan",
    prix: 371100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Console PlayStation 5 Slim avec lecteur de disques, SSD 1 To et manette sans fil DualSense fournie. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Stockage",
    "SSD 1 To"
   ],
   [
    "Lecteur",
    "Blu-ray Ultra HD"
   ],
   [
    "Définition",
    "4K · jusqu’à 120 i/s"
   ],
   [
    "Manette",
    "DualSense fournie"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 tapisyoga: {
  p: "tapisyoga",
  marque: "Meta",
  titre: "Casque Meta Quest 3",
  variante: "128 Go",
  prix: 420000,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "4,1 km",
  note: "4,2",
  avis: 18,
  ventes: 52,
  stock: 29,
  univers: "elec",
  universTitre: "Électronique",
  sousCategorie: "Jeux vidéo",
  tags: [],
  motsCles: [
   "vr",
   "console"
  ],
  dessins: [
   "8b1c6fd7255f",
   "bc2a56f65d01"
  ],
  options: [],
  vendeur: {
   boutique: "Boutique B",
   zone: "Essos",
   score: 78,
   palier: "Argent",
   km: 4.1
  },
  autres: [
   {
    boutique: "Boutique K",
    zone: "Mokolo",
    prix: 415800,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique E",
    zone: "Mvan",
    prix: 420000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique F",
    zone: "Bastos",
    prix: 411500,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Casque de réalité mixte Meta Quest 3, autonome, contrôleurs Touch Plus fournis. Neuf, testé avant l’envoi ; facture fournie au retrait.",
  specs: [
   [
    "Stockage",
    "128 Go"
   ],
   [
    "Affichage",
    "2 064 × 2 208 par œil"
   ],
   [
    "Réalité",
    "Virtuelle et mixte"
   ],
   [
    "Manettes",
    "Touch Plus fournies"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 }
}

// Les 30 produits du prototype, puis la suite du jeu d'essai (catalogue-etendu.ts).
// Vraies photos des produits (src/assets/produits/<id>-<n>.webp|jpg, n = 1, 2, 3… dans l'ordre de la galerie) :
// une photo déposée remplace le dessin correspondant ; sans photo, le dessin reste (PROMPTS.md du même dossier).
const PHOTOS = import.meta.glob<string>('../assets/produits/*.{webp,jpg,jpeg,png}', { eager: true, query: '?url', import: 'default' })
// Vignettes de 360 px (outils/variantes-produits.mjs) : les cartes des listes les prennent par srcset (poids divisé par
// près de trois sur téléphone) ; la fiche produit garde l'originale.
const PETITES = import.meta.glob<string>('../assets/produits/petites/*.webp', { eager: true, query: '?url', import: 'default' })
const nomDe = (f: string) => f.replace(/^.*\//, '').replace(/\.\w+$/, '')
const PETITE = new Map(Object.entries(PETITES).map(([f, url]) => [nomDe(f), url]))
const LARGEUR_ORIGINALE = petites.originaux as Record<string, number>
const photo = (f: string, url: string): { url: string; srcset?: string } => {
  const n = nomDe(f)
  const petite = PETITE.get(n)
  return petite && LARGEUR_ORIGINALE[n] ? { url, srcset: `${petite} ${petites.largeur}w, ${url} ${LARGEUR_ORIGINALE[n]}w` } : { url }
}
const photosDe = (id: string) =>
  Object.entries(PHOTOS)
    .map(([f, url]) => ({ f, m: new RegExp(`/${id}-(\\d+)\\.\\w+$`).exec(f), url }))
    .filter((x) => x.m)
    .sort((a, b) => Number(a.m![1]) - Number(b.m![1]))
    .map((x) => photo(x.f, x.url))
const MARQUES: Record<string, string> = {'camon30': 'Apple', 'iphone15pm': 'Apple', 'galaxya15': 'Samsung', 'tel-a05': 'Samsung', 'tel-a06': 'Google', 'tel-pop': 'Tecno', 'itelac52': 'Samsung', 'tablette8': 'Apple', 'chargeur33': 'Apple', 'ecouteurs': 'Apple', 'elec-bt': 'Samsung', 'elec-casque': 'Sony', 'elec-enceinte': 'JBL', 'batterie': 'Anker', 'tv43': 'Samsung', 'ventilo': 'Dyson', 'mixeur': 'Ninja', 'fer': 'Philips', 'marmite': 'Philips', 'mai-blender': 'Vorwerk', 'mai-bouilloire': 'Nespresso', 'mai-cuiseur': 'Roborock', 'ensemblewax': 'Vlisco', 'saccuir': 'Michael Kors', 'pagne': 'Vlisco', 'robewax': 'Vlisco', 'fem-wax-4': 'Ray-Ban', 'fem-wax-f': 'Apple', 'fem-wax-3': 'Dior', 'montre': 'Garmin', 'hom-chemise-l': 'Tommy Hilfiger', 'hom-polo': 'Lacoste', 'sandales': 'Nike', 'baskets': 'Nike', 'cha-sandale-p': 'adidas', 'cha-sandale-c': 'New Balance', 'cha-claquette': 'Nike', 'karite': 'Dyson', 'coco': 'Oral-B', 'cremevisage': 'The Ordinary', 'bea-karite-p': 'Palmer’s', 'bea-aloe': 'Dyson', 'bea-savon': 'Fenty Beauty', 'riz': 'Royal Umbrella', 'huile5l': 'Lesieur', 'cafe': 'Nespresso', 'mar-riz-10': 'Bonnet Rouge', 'mar-riz-5': 'Supermont', 'mar-huile-2': 'Lindt', 'portebebe': 'Cybex', 'cartable': 'Amazon', 'beb-couches': 'Pampers', 'beb-lingettes': 'Philips Avent', 'beb-biberon': 'Philips Avent', 'ballon': 'Sony', 'tapisyoga': 'Meta', 'spo-ballon-b': 'Spalding', 'spo-ballon-h': 'Xiaomi', 'spo-maillot': 'One All Sports', 'macbookair': 'Apple', 'macbookpro': 'Apple', 'ps5pro': 'Sony', 'xboxsx': 'Microsoft', 'switch': 'Nintendo', 'dualsense': 'Sony', 'oledlg': 'LG', 'barresono': 'Sonos', 'djimini': 'DJI', 'gopro': 'GoPro', 'canonr': 'Canon', 'galaxytabs10': 'Samsung', 'iphone16e': 'Apple', 'airpodsmax': 'Apple'}
const avecPhotos = (c: Record<string, Produit>) =>
  Object.fromEntries(Object.entries(c).map(([id, p]) => { const images = photosDe(id); const marque = p.marque ?? MARQUES[id] ?? null; return [id, { ...p, marque, ...(images.length ? { images } : {}) }] }))
// Produits repris (catalogue-etendu.ts) : leur dessin est celui du produit d'origine ; avec leurs propres photos, ils
// prennent le dessin « produit:<id> » (leur photo de présentation), pour ne jamais montrer la photo de l'origine.
const repris = Object.fromEntries(Object.entries(etendre(CATALOGUE_BASE)).map(([id, p]) => [id, CATALOGUE_BASE[id] || !photosDe(id).length ? p : { ...p, dessins: ['produit:' + id] }]))
// Fiches détaillées (fiches-produits.ts) : description, caractéristiques, classe du colis, options ; elles prévalent
// sur les valeurs ci-dessus.
const TOUS = avecFiches(avecPhotos({ ...CATALOGUE_BASE, ...repris }))
// Ordre de pertinence servi (celui des listes, des catégories et des rangées de l'accueil) : les produits phares
// récents d'abord, dans cet ordre, puis les autres par ventes décroissantes.
const VEDETTES = [
  'camon30', 'galaxya15', 'macbookpro', 'ps5pro', 'oledlg', 'mai-blender', 'karite', 'macbookair', 'iphone15pm', 'tv43',
  'refrigerateur', 'lave-linge', 'airpodsmax', 'switch', 'bea-aloe', 'ventilo', 'tablette8', 'galaxytabs10', 'canonr', 'djimini',
  'xboxsx', 'barresono', 'tel-a05', 'tel-a06', 'fem-wax-f', 'saccuir', 'montre', 'sandales', 'baskets', 'portebebe',
  'mai-cuiseur', 'micro-ondes', 'cuiseur-riz', 'batterie-cuisine', 'iphone16e', 'elec-casque', 'fem-wax-3', 'coco', 'cha-sandale-c',
  'hom-chemise-l', 'beb-lingettes', 'spo-ballon-h', 'spo-maillot', 'cafe', 'riz', 'lait-poudre', 'sac-ecole', 'livres-enfants', 'romans',
]
const rang = (id: string) => (VEDETTES.includes(id) ? VEDETTES.indexOf(id) : VEDETTES.length)
export const CATALOGUE: Record<string, Produit> = Object.fromEntries(
  Object.entries(TOUS).sort(([a, pa], [b, pb]) => rang(a) - rang(b) || pb.ventes - pa.ventes),
)

/** Photo réelle d'un dessin du catalogue : celle du premier produit qui le porte (son produit d'origine), pour les
 *  écrans qui posent un dessin seul. Sans photo de ce produit, le dessin reste : un produit repris (même dessin)
 *  ne prête pas la sienne (la PS5 Slim ne montre pas le ballon de basket). */
export const PHOTO_DU_DESSIN: Record<string, { url: string; srcset?: string }> = {}
const porteur = new Set<string>()
// Photo de présentation de chaque produit, par un dessin « produit:<id> » (lignes de panier, commandes, litiges).
for (const p of Object.values(TOUS)) if (p.images?.[0]) PHOTO_DU_DESSIN['produit:' + p.p] = p.images[0]
for (const p of Object.values(TOUS)) p.dessins.forEach((d, i) => { if (!d || porteur.has(d)) return; porteur.add(d); if (p.images?.[i]) PHOTO_DU_DESSIN[d] = p.images[i] })
// Photos réelles des autres dessins (portraits, relais, articles hors catalogue) : src/assets/produits/d-<dessin>.webp ;
// tuiles d'univers : photos du carrousel du porteur.
for (const [f, url] of Object.entries(PHOTOS)) { const m = /\/d-([0-9a-f]{12})\.\w+$/.exec(f); if (m) PHOTO_DU_DESSIN[m[1]] = photo(f, url) }
const UNIVERS_PHOTO: Record<string, string> = { aae8368e5385: 'beaute', a00d64f30e5f: 'maison', '30a65dd8f0c3': 'femme', '6051650401c1': 'marche', '6cb441816096': 'tel', dba0f8ad24f9: 'elec' }
for (const [d, nom] of Object.entries(UNIVERS_PHOTO)) PHOTO_DU_DESSIN[d] ??= { url: `/images/carrousel/${nom}.webp`, srcset: srcsetCarrousel(nom) }
