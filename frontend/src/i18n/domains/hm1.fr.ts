// frontend/src/i18n/domains/hm1.fr.ts
// Copie FR des 11 thèmes de catégorie (frontend/src/data/categoryThemes.ts).
// Cette copie est la référence : le fichier source y renvoie en `defaultValue`
// si une clé venait à manquer. La version EN (hm1.en.ts) doit garder
// exactement les mêmes clés.

export default {
  category_theme: {
    all: {
      name: 'Tout voir',
      shortName: 'Tout',
      label: 'Marketplace BelivaY',
      title: 'Tout le catalogue BelivaY',
      subtitle: '15 240 produits · 3 200 vendeurs certifiés',
      description:
        "L'intégralité de l'offre BelivaY, tous thèmes confondus : mode, électronique, beauté, maison, supermarché et bien plus. Paiement Mobile Money sécurisé par escrow, vendeurs vérifiés et livraison partout au Cameroun et en Afrique centrale.",
      facets: ['Nouveautés', 'Promotions', 'Made in Cameroon', 'Livraison 24h', 'Coup de cœur'],
    },
    femme: {
      name: 'Mode Femme',
      shortName: 'Femme',
      label: 'Mode Femme',
      title: 'Robes · Pagnes · Wax Premium',
      subtitle: '3 400 produits · Vendeurs certifiés BelivaY',
      description:
        "Le vestiaire féminin africain dans toute sa richesse : wax authentique, pagne hollandais Vlisco, robes de cérémonie, tenues casual, sacs en cuir artisanal et bijoux. Toutes les tailles, du S au XXL, chez des couturiers et boutiques vérifiés.",
      facets: ['Robes', 'Pagne & Wax', 'Sacs', 'Bijoux', 'Pyjamas', 'Jeans'],
    },
    homme: {
      name: 'Mode Homme',
      shortName: 'Homme',
      label: 'Mode Homme',
      title: 'Bazin · Costume · Chemise Brodée',
      subtitle: '2 100 produits · Tenues de cérémonie et casual',
      description:
        "Du grand boubou en bazin riche brodé main au costume deux pièces taillé sur mesure, en passant par les chemises en lin, chinos et accessoires en cuir. Des tailleurs camerounais reconnus, du M au 4XL.",
      facets: ['Bazin & Boubou', 'Costumes', 'Chemises', 'Pantalons', 'Polos', 'Maroquinerie'],
    },
    tech: {
      name: 'Électronique',
      shortName: 'Électro',
      label: 'Électronique',
      title: 'Ordinateurs, TV & Accessoires',
      subtitle: 'Livraison gratuite dès 30 000 FCFA · Vendeurs certifiés Or',
      description:
        "Laptops, téléviseurs, audio, gaming, sécurité et petits accessoires. Produits neufs sous garantie constructeur, importés par des revendeurs certifiés Or dont l'identité et la licence commerciale ont été vérifiées par BelivaY.",
      facets: ['Ordinateurs', 'Télévisions', 'Audio', 'Gaming', 'Stockage', 'Sécurité'],
    },
    phone: {
      name: 'Téléphones',
      shortName: 'Phones',
      label: 'Téléphonie',
      title: 'Smartphones & Tablettes',
      subtitle: '980 références · Garantie constructeur 12 mois',
      description:
        "Smartphones Android et iOS, tablettes, montres connectées, coques, chargeurs rapides et écouteurs. Chaque appareil est vendu avec sa garantie officielle et un IMEI vérifiable avant expédition.",
      facets: ['Smartphones', 'Tablettes', 'Montres connectées', 'Chargeurs', 'Écouteurs', 'Coques'],
    },
    beaute: {
      name: 'Beauté & Santé',
      shortName: 'Beauté',
      label: 'Beauté & Soins',
      title: 'Cosmétiques & Soins Authentiques',
      subtitle: '2 600 produits vérifiés · Livraison express',
      description:
        "Karité pur, savon noir artisanal, huile d'argan pressée à froid, sérums, maquillage et parfums. Les cosmétiques naturels sont sourcés auprès de producteurs locaux et les références importées portent leur certification d'origine.",
      facets: ['Soins visage', 'Cheveux', 'Maquillage', 'Parfums', 'Savons', 'Bio & naturel'],
    },
    maison: {
      name: 'Maison & Déco',
      shortName: 'Maison',
      label: 'Maison & Déco',
      title: 'Aménagez votre intérieur',
      subtitle: '1 720 produits · Meubles · Déco · Électroménager',
      description:
        "Mobilier, literie, art de la table, décoration murale et petit électroménager. Les meubles volumineux sont livrés et montés à domicile à Yaoundé et Douala par les équipes logistique BelivaY.",
      facets: ['Meubles', 'Literie', 'Cuisine', 'Décoration', 'Luminaires', 'Électroménager'],
    },
    super: {
      name: 'Supermarché',
      shortName: 'Marché',
      label: 'Supermarché',
      title: 'Courses & Produits du terroir',
      subtitle: '890 références · Producteurs camerounais',
      description:
        "Épicerie sèche, huiles, épices, céréales, boissons et produits d'entretien. Une large part du rayon vient directement de coopératives et PME camerounaises, avec des dates de péremption contrôlées avant chaque expédition.",
      facets: ['Épicerie', 'Épices', 'Boissons', 'Céréales', 'Entretien', 'Made in Cameroon'],
    },
    shoes: {
      name: 'Chaussures',
      shortName: 'Chauss.',
      label: 'Chaussures',
      title: 'Sneakers · Escarpins · Sandales',
      subtitle: '1 100 produits · Toutes pointures disponibles',
      description:
        "Sneakers, mocassins, escarpins, sandales et chaussures de sécurité, du 36 au 47. Chaque fiche indique le guide des pointures du vendeur, et l'échange de taille est gratuit sous 7 jours.",
      facets: ['Sneakers', 'Escarpins', 'Sandales', 'Mocassins', 'Sport', 'Sécurité'],
    },
    sport: {
      name: 'Sport & Loisirs',
      shortName: 'Sport',
      label: 'Sport & Loisirs',
      title: 'Équipez-vous et bougez',
      subtitle: '640 produits · Fitness · Football · Plein air',
      description:
        "Matériel de fitness, tenues techniques, ballons, vélos et équipement de plein air. Les articles encombrants sont expédiés depuis les entrepôts partenaires de Douala avec suivi temps réel.",
      facets: ['Fitness', 'Football', 'Vélos', 'Tenues', 'Plein air', 'Accessoires'],
    },
    bebe: {
      name: 'Bébé & Enfant',
      shortName: 'Bébé',
      label: 'Bébé & Enfant',
      title: 'Tout pour les tout-petits',
      subtitle: '520 produits · Puériculture & vêtements enfant',
      description:
        "Poussettes, lits, sièges auto, vêtements, jouets d'éveil et soins bébé. Les articles de puériculture référencés répondent aux normes de sécurité européennes, contrôlées à l'entrée du catalogue.",
      facets: ['Puériculture', 'Vêtements', 'Jouets', 'Soins bébé', 'Repas', 'Sécurité'],
    },
  },
};
