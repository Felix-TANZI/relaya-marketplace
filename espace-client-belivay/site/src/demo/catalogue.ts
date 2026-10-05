// Catalogue du jeu d'essai (DP-54) : les 30 produits du prototype (D.p), avec ce que la fiche affiche : prix,
// prix barré, note et avis, ventes, stock, catégorie, paramètres (couleur, capacité, taille, pointure ;
// indisponibles), marque (null : sans marque), vendeur certifié, autres vendeurs, description et caractéristiques. L'API servira le vrai catalogue.
import type { Produit } from '../donnees/source'

export const CATALOGUE: Record<string, Produit> = {
 camon30: {
  p: "camon30",
  marque: "Tecno",
  titre: "Tecno Camon 30",
  variante: "Gris titane · 256 Go",
  prix: 150699,
  prixBarre: 168000,
  depuis: 139000,
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
     "Gris titane",
     "Vert",
     "Noir"
    ],
    indispo: [
     "Noir"
    ],
    choisi: "Gris titane"
   },
   {
    nom: "Capacité",
    valeurs: [
     "128 Go",
     "256 Go",
     "512 Go"
    ],
    indispo: [
     "512 Go"
    ],
    prix: {
     "128 Go": 139000,
     "256 Go": 150699
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
    prix: 147500,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique F",
    zone: "Mokolo",
    prix: 150699,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique G",
    zone: "Mvan",
    prix: 145000,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Écran AMOLED 6,78 pouces, capteur principal 50 MP avec stabilisation, 256 Go, batterie 5 000 mAh et charge rapide 70 W. Double SIM compatible MTN et Orange. Garantie 12 mois assurée par la boutique, facture fournie au retrait.",
  specs: [
   [
    "Écran",
    "AMOLED 6,78″"
   ],
   [
    "Mémoire",
    "256 Go · 8 Go RAM"
   ],
   [
    "Appareil photo",
    "50 MP + 2 MP · selfie 50 MP"
   ],
   [
    "Batterie",
    "5 000 mAh · 70 W"
   ],
   [
    "Réseau",
    "4G · double SIM"
   ],
   [
    "Garantie",
    "12 mois"
   ]
  ]
 },
 itelac52: {
  p: "itelac52",
  marque: "itel",
  titre: "itel AC52 · noir",
  variante: null,
  prix: 20000,
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
  sousCategorie: "Téléphones simples",
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
    prix: 19900,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Mvan",
    prix: 20000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Bastos",
    prix: 19800,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Écran lumineux, grande autonomie, double SIM compatible MTN et Orange. Garantie 12 mois assurée par la boutique, facture fournie au retrait.",
  specs: [
   [
    "Catégorie",
    "Téléphones simples"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "12 mois"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 galaxya15: {
  p: "galaxya15",
  marque: "Samsung",
  titre: "Samsung Galaxy A15 · 128 Go",
  variante: "Noir",
  prix: 89900,
  prixBarre: 99900,
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
     "Noir",
     "Bleu",
     "Blanc"
    ],
    indispo: [
     "Blanc"
    ],
    choisi: "Noir"
   },
   {
    nom: "Capacité",
    valeurs: [
     "128 Go",
     "256 Go",
     "512 Go"
    ],
    indispo: [
     "512 Go"
    ],
    prix: {},
    choisi: "128 Go"
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
    prix: 86600,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique E",
    zone: "Nlongkak",
    prix: 89900,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique F",
    zone: "Mvog-Ada",
    prix: 84000,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Écran lumineux, grande autonomie, double SIM compatible MTN et Orange. Garantie 12 mois assurée par la boutique, facture fournie au retrait.",
  specs: [
   [
    "Catégorie",
    "Smartphones"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "12 mois"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 tablette8: {
  p: "tablette8",
  marque: "Lenovo",
  titre: "Tablette 8″ · 64 Go",
  variante: "Gris",
  prix: 64000,
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
     "Noir",
     "Bleu",
     "Blanc"
    ],
    indispo: [
     "Blanc"
    ],
    choisi: "Gris"
   },
   {
    nom: "Capacité",
    valeurs: [
     "128 Go",
     "256 Go",
     "512 Go"
    ],
    indispo: [
     "512 Go"
    ],
    prix: {},
    choisi: "128 Go"
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
    prix: 60700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Nlongkak",
    prix: 64000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Mvog-Ada",
    prix: 58100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Écran lumineux, grande autonomie, double SIM compatible MTN et Orange. Garantie 12 mois assurée par la boutique, facture fournie au retrait.",
  specs: [
   [
    "Catégorie",
    "Tablettes"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "12 mois"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 ecouteurs: {
  p: "ecouteurs",
  marque: "Oraimo",
  titre: "Écouteurs sans fil",
  variante: "Blanc",
  prix: 16500,
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
    prix: 16400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Essos",
    prix: 16500,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Mokolo",
    prix: 16300,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Appareil neuf, testé avant l’envoi. Garantie assurée par la boutique, facture fournie au retrait.",
  specs: [
   [
    "Catégorie",
    "Audio"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "12 mois"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 chargeur33: {
  p: "chargeur33",
  marque: "Oraimo",
  titre: "Chargeur rapide 33 W USB-C",
  variante: null,
  prix: 6500,
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
    prix: 6400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 6500,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Mokolo",
    prix: 6300,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Écran lumineux, grande autonomie, double SIM compatible MTN et Orange. Garantie 12 mois assurée par la boutique, facture fournie au retrait.",
  specs: [
   [
    "Catégorie",
    "Accessoires"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "12 mois"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 batterie: {
  p: "batterie",
  marque: "Oraimo",
  titre: "Batterie externe 20 000 mAh",
  variante: null,
  prix: 14900,
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
    prix: 14800,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique H",
    zone: "Mokolo",
    prix: 14900,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique J",
    zone: "Mvan",
    prix: 14700,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Appareil neuf, testé avant l’envoi. Garantie assurée par la boutique, facture fournie au retrait.",
  specs: [
   [
    "Catégorie",
    "Énergie & batteries"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "12 mois"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 tv43: {
  p: "tv43",
  marque: "Hisense",
  titre: "Téléviseur LED 43″",
  variante: null,
  prix: 189000,
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
    prix: 185700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Mvan",
    prix: 189000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Bastos",
    prix: 183100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Appareil neuf, testé avant l’envoi. Garantie assurée par la boutique, facture fournie au retrait.",
  specs: [
   [
    "Catégorie",
    "TV & vidéo"
   ],
   [
    "Classe du colis",
    "XL"
   ],
   [
    "Garantie",
    "12 mois"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 ventilo: {
  p: "ventilo",
  marque: "Binatone",
  titre: "Ventilateur sur pied 16″",
  variante: null,
  prix: 24500,
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
    prix: 21200,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Mvan",
    prix: 24500,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Bastos",
    prix: 18600,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit neuf, emballage d’origine. Mode d’emploi en français.",
  specs: [
   [
    "Catégorie",
    "Petit électroménager"
   ],
   [
    "Classe du colis",
    "L"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 mixeur: {
  p: "mixeur",
  marque: "Binatone",
  titre: "Mixeur-blender 2 L · 600 W",
  variante: null,
  prix: 37000,
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
    prix: 33700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique F",
    zone: "Bastos",
    prix: 37000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique G",
    zone: "Melen",
    prix: 31100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit neuf, emballage d’origine. Mode d’emploi en français.",
  specs: [
   [
    "Catégorie",
    "Petit électroménager"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 fer: {
  p: "fer",
  marque: "Philips",
  titre: "Fer à repasser vapeur 2 200 W",
  variante: null,
  prix: 15800,
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
  autres: [
   {
    boutique: "Boutique K",
    zone: "Emana",
    prix: 15700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique E",
    zone: "Nlongkak",
    prix: 15800,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique F",
    zone: "Mvog-Ada",
    prix: 15600,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit neuf, emballage d’origine. Mode d’emploi en français.",
  specs: [
   [
    "Catégorie",
    "Petit électroménager"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 marmite: {
  p: "marmite",
  marque: null,
  titre: "Marmite en fonte 8 L",
  variante: null,
  prix: 22000,
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
    prix: 18700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Essos",
    prix: 22000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Mokolo",
    prix: 16100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit neuf, emballage d’origine. Mode d’emploi en français.",
  specs: [
   [
    "Catégorie",
    "Cuisine"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 ensemblewax: {
  p: "ensemblewax",
  marque: "Vlisco",
  titre: "Ensemble wax 3 pièces",
  variante: "Taille M",
  prix: 32000,
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
    prix: 28700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Melen",
    prix: 32000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Emana",
    prix: 26100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Tissu de qualité, coutures solides. Échange possible si la taille ne va pas (retour 7 jours).",
  specs: [
   [
    "Catégorie",
    "Pagnes & wax"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 saccuir: {
  p: "saccuir",
  marque: null,
  titre: "Sac cuir artisanal",
  variante: "Marron",
  prix: 52000,
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
  dessins: [
   "30942470397d",
   "63612bb6f86f"
  ],
  options: [
   {
    nom: "Couleur",
    valeurs: [
     "Marron",
     "Noir",
     "Cognac"
    ],
    indispo: [
     "Cognac"
    ],
    choisi: "Marron"
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
    prix: 48700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique H",
    zone: "Bastos",
    prix: 52000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique J",
    zone: "Melen",
    prix: 46100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Tissu de qualité, coutures solides. Échange possible si la taille ne va pas (retour 7 jours).",
  specs: [
   [
    "Catégorie",
    "Sacs"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 pagne: {
  p: "pagne",
  marque: "Uniwax",
  titre: "Pagne wax 6 yards · motif soleil orange",
  variante: null,
  prix: 18500,
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
    prix: 18400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Melen",
    prix: 18500,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Emana",
    prix: 18300,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Tissu de qualité, coutures solides. Échange possible si la taille ne va pas (retour 7 jours).",
  specs: [
   [
    "Catégorie",
    "Pagnes & wax"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 robewax: {
  p: "robewax",
  marque: null,
  titre: "Robe wax longue",
  variante: "Taille M",
  prix: 24000,
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
    prix: 20700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique K",
    zone: "Mokolo",
    prix: 24000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique E",
    zone: "Mvan",
    prix: 18100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Tissu de qualité, coutures solides. Échange possible si la taille ne va pas (retour 7 jours).",
  specs: [
   [
    "Catégorie",
    "Robes"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 chemise: {
  p: "chemise",
  marque: null,
  titre: "Chemise bazin brodée",
  variante: "Taille L",
  prix: 21000,
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
    prix: 17700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique H",
    zone: "Mvog-Ada",
    prix: 21000,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 15100,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Tissu de qualité, finitions soignées. Échange possible si la taille ne va pas (retour 7 jours).",
  specs: [
   [
    "Catégorie",
    "Chemises"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 montre: {
  p: "montre",
  marque: "Casio",
  titre: "Montre acier bracelet cuir",
  variante: null,
  prix: 27500,
  prixBarre: 29900,
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
    prix: 24200,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique G",
    zone: "Nlongkak",
    prix: 27500,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique H",
    zone: "Mvog-Ada",
    prix: 21600,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Tissu de qualité, finitions soignées. Échange possible si la taille ne va pas (retour 7 jours).",
  specs: [
   [
    "Catégorie",
    "Montres"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 sandales: {
  p: "sandales",
  marque: null,
  titre: "Sandales cuir femme",
  variante: "Pointure 39",
  prix: 14900,
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
    prix: 14800,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Melen",
    prix: 14900,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Emana",
    prix: 14700,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Semelle confortable, matières résistantes. Échange de pointure possible (retour 7 jours).",
  specs: [
   [
    "Catégorie",
    "Femme"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 baskets: {
  p: "baskets",
  marque: "Adidas",
  titre: "Baskets running",
  variante: "Pointure 42",
  prix: 29900,
  prixBarre: 34900,
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
    prix: 26600,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique E",
    zone: "Nlongkak",
    prix: 29900,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique F",
    zone: "Mvog-Ada",
    prix: 24000,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Semelle confortable, matières résistantes. Échange de pointure possible (retour 7 jours).",
  specs: [
   [
    "Catégorie",
    "Sport"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 karite: {
  p: "karite",
  marque: null,
  titre: "Beurre de karité pur 500 g",
  variante: null,
  prix: 3500,
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
  sousCategorie: "Soins visage",
  tags: [],
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
   km: 1.0
  },
  autres: [
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 3400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique K",
    zone: "Mokolo",
    prix: 3500,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique E",
    zone: "Mvan",
    prix: 3300,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit d’origine, scellé, date de péremption vérifiée par le vendeur.",
  specs: [
   [
    "Catégorie",
    "Soins visage"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 coco: {
  p: "coco",
  marque: null,
  titre: "Huile de coco vierge 500 ml",
  variante: null,
  prix: 4800,
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
  sousCategorie: "Cheveux",
  tags: [],
  dessins: [
   "25ee2829127a",
   "3a3895ec7b7b"
  ],
  options: [],
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
    prix: 4700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique F",
    zone: "Emana",
    prix: 4800,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique G",
    zone: "Nlongkak",
    prix: 4600,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit d’origine, scellé, date de péremption vérifiée par le vendeur.",
  specs: [
   [
    "Catégorie",
    "Cheveux"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 cremevisage: {
  p: "cremevisage",
  marque: "Nivea",
  titre: "Crème visage karité & aloe 100 ml",
  variante: null,
  prix: 6900,
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
   km: 2.0
  },
  autres: [
   {
    boutique: "Boutique K",
    zone: "Bastos",
    prix: 6800,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique E",
    zone: "Melen",
    prix: 6900,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique F",
    zone: "Emana",
    prix: 6700,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit d’origine, scellé, date de péremption vérifiée par le vendeur.",
  specs: [
   [
    "Catégorie",
    "Soins visage"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 riz: {
  p: "riz",
  marque: "Tilda",
  titre: "Riz parfumé 25 kg",
  variante: null,
  prix: 18500,
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
    prix: 18400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique E",
    zone: "Nlongkak",
    prix: 18500,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique F",
    zone: "Mvog-Ada",
    prix: 18300,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit scellé, date de péremption vérifiée par le vendeur.",
  specs: [
   [
    "Catégorie",
    "Épicerie"
   ],
   [
    "Classe du colis",
    "L"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 huile5l: {
  p: "huile5l",
  marque: "Mayor",
  titre: "Huile d’arachide 5 L",
  variante: null,
  prix: 9800,
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
    prix: 9700,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique F",
    zone: "Mokolo",
    prix: 9800,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique G",
    zone: "Mvan",
    prix: 9600,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit scellé, date de péremption vérifiée par le vendeur.",
  specs: [
   [
    "Catégorie",
    "Épicerie"
   ],
   [
    "Classe du colis",
    "M"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 cafe: {
  p: "cafe",
  marque: "UCCAO",
  titre: "Café arabica de l’Ouest 500 g",
  variante: null,
  prix: 5500,
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
  sousCategorie: "Produits du terroir",
  tags: [],
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
    prix: 5400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 5500,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique K",
    zone: "Mokolo",
    prix: 5300,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit scellé, date de péremption vérifiée par le vendeur.",
  specs: [
   [
    "Catégorie",
    "Produits du terroir"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 portebebe: {
  p: "portebebe",
  marque: "Chicco",
  titre: "Porte-bébé ergonomique",
  variante: null,
  prix: 19900,
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
    prix: 19800,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique K",
    zone: "Mokolo",
    prix: 19900,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique E",
    zone: "Mvan",
    prix: 19700,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit neuf, normes de sécurité pour enfants.",
  specs: [
   [
    "Catégorie",
    "Puériculture"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 cartable: {
  p: "cartable",
  marque: null,
  titre: "Cartable scolaire 16″",
  variante: "Rouge",
  prix: 12500,
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
    prix: 12400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique H",
    zone: "Mvog-Ada",
    prix: 12500,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique J",
    zone: "Essos",
    prix: 12300,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit neuf, normes de sécurité pour enfants.",
  specs: [
   [
    "Catégorie",
    "Jouets"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 ballon: {
  p: "ballon",
  marque: "Puma",
  titre: "Ballon de football taille 5",
  variante: null,
  prix: 8500,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "3,8 km",
  note: "4,4",
  avis: 45,
  ventes: 205,
  stock: 24,
  univers: "sport",
  universTitre: "Sport & loisirs",
  sousCategorie: "Football",
  tags: [],
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
    prix: 8400,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique H",
    zone: "Mokolo",
    prix: 8500,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique J",
    zone: "Mvan",
    prix: 8300,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit neuf, matériaux résistants.",
  specs: [
   [
    "Catégorie",
    "Football"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 },
 tapisyoga: {
  p: "tapisyoga",
  marque: "Domyos",
  titre: "Tapis de yoga 6 mm",
  variante: "Vert",
  prix: 9900,
  prixBarre: null,
  depuis: null,
  classe: "S",
  distance: "4,1 km",
  note: "4,2",
  avis: 18,
  ventes: 52,
  stock: 29,
  univers: "sport",
  universTitre: "Sport & loisirs",
  sousCategorie: "Fitness",
  tags: [],
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
    prix: 9800,
    km: 0.9,
    score: 88,
    ventes: 41
   },
   {
    boutique: "Boutique E",
    zone: "Mvan",
    prix: 9900,
    km: 5.1,
    score: 94,
    ventes: 220
   },
   {
    boutique: "Boutique F",
    zone: "Bastos",
    prix: 9700,
    km: 7.8,
    score: 79,
    ventes: 12
   }
  ],
  description: "Produit neuf, matériaux résistants.",
  specs: [
   [
    "Catégorie",
    "Fitness"
   ],
   [
    "Classe du colis",
    "S"
   ],
   [
    "Garantie",
    "Retour 7 jours"
   ],
   [
    "Vendu par",
    "Vendeur certifié BelivaY"
   ]
  ]
 }
}
