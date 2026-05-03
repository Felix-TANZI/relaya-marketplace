import { type Product } from "@/services/api/products";

export interface V29MockVendor {
  id: number;
  shop_name: string;
  is_premium?: boolean;
}

export interface V29Product extends Product {
  vendor?: V29MockVendor;
  emoji?: string;
  bg?: string;
  delivery?: string;
  viewers?: number;
  top?: boolean;
}

interface RawV29 {
  id: number;
  name: string;
  vendor: string;
  price: number;
  old: number | null;
  disc: number;
  stars: number;
  reviews: number;
  emoji: string;
  img: string;
  cat: string;
  bg: string;
  delivery: string;
  top: boolean;
  stock: number;
  viewers: number;
  desc: string;
}

const CAT_NAMES: Record<string, string> = {
  femme: "Mode Femme",
  homme: "Mode Homme",
  beaute: "Beauté & Santé",
  phone: "Téléphones",
  shoes: "Chaussures",
  tech: "Électronique",
  maison: "Maison & Déco",
  super: "Supermarché",
  sport: "Sport & Loisirs",
  bebe: "Bébé & Enfant",
};

const CAT_IDS: Record<string, number> = {
  femme: 1, homme: 2, tech: 3, phone: 4, beaute: 5,
  maison: 6, super: 7, shoes: 8, sport: 9, bebe: 10,
};

const PREMIUM_VENDORS = new Set([
  "WaxLuxe", "ModeAfrique", "TechYaoundé", "BazinKing",
  "BeautyLab", "NaturaCMR", "BabyComfort", "TailorCMR",
  "ShoesBoulevard", "BioMarché237",
]);

const VENDOR_IDS: Record<string, number> = {};
let vendorIdCounter = 100;
function getVendor(name: string): V29MockVendor {
  if (!VENDOR_IDS[name]) VENDOR_IDS[name] = vendorIdCounter++;
  return {
    id: VENDOR_IDS[name],
    shop_name: name,
    is_premium: PREMIUM_VENDORS.has(name),
  };
}

const RAW_DATA: RawV29[] = [
  {id:1,name:"Robe Wax Ankara Premium",vendor:"ModeAfrique",price:14500,old:20700,disc:30,stars:5,reviews:47,emoji:"👗",img:"https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400&h=400&fit=crop",cat:"femme",bg:"#FFF0F5",delivery:"Yaoundé · 24h",top:true,stock:8,viewers:12,desc:"Magnifique robe wax authentique africain. Coupe élégante, tissu 100% coton premium. Tailles S à XXL."},
  {id:9,name:"Ensemble Wax 3 Pièces Luxe",vendor:"WaxLuxe",price:32000,old:45000,disc:29,stars:5,reviews:28,emoji:"🎭",img:"https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400&h=400&fit=crop",cat:"femme",bg:"#FFF3E8",delivery:"Yaoundé · 24h",top:true,stock:2,viewers:31,desc:"Tailleur + jupe + foulard wax premium. Broderies or. Tailles S–XL."},
  {id:12,name:"Sac à Main Cuir Artisanal",vendor:"ArtisanLeather",price:28000,old:null,disc:0,stars:4,reviews:9,emoji:"👜",img:"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop",cat:"femme",bg:"#FEF3C7",delivery:"Douala · 72h",top:false,stock:7,viewers:8,desc:"Cuir véritable, double compartiment, fermeture YKK."},
  {id:16,name:"Foulard Soie Imprimé Ankara",vendor:"WaxLuxe",price:7200,old:null,disc:0,stars:5,reviews:5,emoji:"🧣",img:"https://images.unsplash.com/photo-1601924921557-45e6dea0f5c8?w=400&h=400&fit=crop",cat:"femme",bg:"#FFF8E1",delivery:"Yaoundé · 24h",top:false,stock:18,viewers:4,desc:"Soie naturelle, imprimé ankara original."},
  {id:26,name:"Ensemble Pyjama Satin Femme",vendor:"ModeAfrique",price:11000,old:14500,disc:24,stars:4,reviews:21,emoji:"🌙",img:"https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=400&h=400&fit=crop",cat:"femme",bg:"#FFF0F5",delivery:"Yaoundé · 24h",top:false,stock:16,viewers:6,desc:"Satin doux et léger, haut + pantalon."},
  {id:28,name:"Pagne Hollandais Vlisco 6y",vendor:"WaxLuxe",price:42000,old:52000,disc:19,stars:5,reviews:18,emoji:"🎨",img:"https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400&h=400&fit=crop",cat:"femme",bg:"#FFF3E8",delivery:"Yaoundé · 48h",top:true,stock:7,viewers:19,desc:"Pagne hollandais Vlisco authentique certifié, 6 yards."},
  {id:31,name:"Sandales Dorées Élégantes",vendor:"ShoesBoulevard",price:12500,old:16800,disc:26,stars:5,reviews:42,emoji:"👡",img:"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop",cat:"femme",bg:"#FFF8DC",delivery:"Yaoundé · 24h",top:true,stock:24,viewers:9,desc:"Sandales dorées avec talons ergonomiques, très confortable."},
  {id:32,name:"Robe Cocktail Élégante",vendor:"ModeAfrique",price:28000,old:38000,disc:26,stars:5,reviews:31,emoji:"👗",img:"https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop",cat:"femme",bg:"#FFF0F5",delivery:"Yaoundé · 48h",top:true,stock:12,viewers:15,desc:"Robe de cocktail soirée, tissu premium, ajustement parfait."},
  {id:33,name:"Jeans Slim Délavé",vendor:"DenimCo",price:18900,old:24000,disc:21,stars:4,reviews:38,emoji:"👖",img:"https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop",cat:"femme",bg:"#EEF5FF",delivery:"Yaoundé · 24h",top:false,stock:28,viewers:8,desc:"Jeans slim délavé bleu marine, taille haute, coupe parfaite."},
  {id:34,name:"Bijoux Fantaisie Assortis",vendor:"GlamCMR",price:8500,old:11000,disc:23,stars:4,reviews:52,emoji:"💎",img:"https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop",cat:"femme",bg:"#FFE4E1",delivery:"Yaoundé · 24h",top:false,stock:45,viewers:11,desc:"Ensemble bijoux fantaisie dorés et argentés, très tendance."},
  {id:61,name:"Robe Longue Bohème Wax",vendor:"ModeAfrique",price:19500,old:27000,disc:28,stars:5,reviews:63,emoji:"👗",img:"https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop",cat:"femme",bg:"#FFF0F5",delivery:"Yaoundé · 24h",top:true,stock:14,viewers:22,desc:"Robe longue wax bohème, coupe fluide, imprimé exclusif."},
  {id:68,name:"Sac Bandoulière Cuir Petit",vendor:"ArtisanLeather",price:15500,old:20000,disc:23,stars:4,reviews:37,emoji:"👜",img:"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop",cat:"femme",bg:"#FEF3C7",delivery:"Douala · 72h",top:false,stock:18,viewers:9,desc:"Petit sac bandoulière cuir véritable, zip YKK."},
  {id:2,name:"Chemise Bazin Riche Brodée",vendor:"BazinKing",price:18000,old:null,disc:0,stars:4,reviews:23,emoji:"👔",img:"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop",cat:"homme",bg:"#EEF5FF",delivery:"Douala · 48h",top:false,stock:15,viewers:5,desc:"Chemise bazin riche, broderies artisanales dorées. Pour cérémonies et occasions formelles."},
  {id:14,name:"Grand Boubou Bazin Brodé Or",vendor:"BazinKing",price:25000,old:35000,disc:29,stars:5,reviews:42,emoji:"🥻",img:"https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop",cat:"homme",bg:"#FFF0F5",delivery:"Yaoundé · 48h",top:false,stock:5,viewers:16,desc:"Bazin riche, broderies dorées, toutes tailles."},
  {id:21,name:"Djellaba Homme Brodée",vendor:"BazinKing",price:19000,old:26000,disc:27,stars:4,reviews:16,emoji:"🧥",img:"https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop",cat:"homme",bg:"#EEF5FF",delivery:"Yaoundé · 48h",top:false,stock:9,viewers:5,desc:"Coton fin respirant, broderies col mao main, tailles M à 4XL."},
  {id:35,name:"Polo Sport Bleu Marine",vendor:"SportStyle",price:15000,old:20000,disc:25,stars:4,reviews:33,emoji:"🧢",img:"https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",cat:"homme",bg:"#EEF5FF",delivery:"Yaoundé · 24h",top:false,stock:35,viewers:7,desc:"Polo sport coton piqué, respirant, col contrasté."},
  {id:36,name:"Costume 2 Pièces Premium",vendor:"TailorCMR",price:85000,old:115000,disc:26,stars:5,reviews:19,emoji:"👔",img:"https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=400&fit=crop",cat:"homme",bg:"#F5F5DC",delivery:"Yaoundé · 48h",top:true,stock:8,viewers:18,desc:"Costume 2 pièces noir premium, coupe impeccable, tissu fin."},
  {id:37,name:"Bonnet Laine Tricoté",vendor:"WinterWear",price:6200,old:8500,disc:27,stars:4,reviews:28,emoji:"🧣",img:"https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400&h=400&fit=crop",cat:"homme",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:false,stock:42,viewers:5,desc:"Bonnet laine fine, doublé polaire, très chaud et doux."},
  {id:62,name:"Chemise Lin Blanche Homme",vendor:"TailorCMR",price:16000,old:21000,disc:24,stars:4,reviews:41,emoji:"👔",img:"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop",cat:"homme",bg:"#EEF5FF",delivery:"Douala · 48h",top:false,stock:22,viewers:11,desc:"Chemise lin pur, coupe ajustée, col italien."},
  {id:72,name:"Montre Classique Homme Cuir",vendor:"TailorCMR",price:28000,old:38000,disc:26,stars:4,reviews:29,emoji:"⌚",img:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",cat:"homme",bg:"#F5F5DC",delivery:"Yaoundé · 48h",top:true,stock:11,viewers:14,desc:"Montre classique bracelet cuir, mouvement quartz japonais."},
  {id:81,name:"Pantalon Chino Stretch Homme",vendor:"DenimCo",price:14500,old:19000,disc:24,stars:4,reviews:47,emoji:"👖",img:"https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop",cat:"homme",bg:"#EEF5FF",delivery:"Yaoundé · 24h",top:false,stock:33,viewers:9,desc:"Chino stretch confort, coupe droite, coton/élasthanne."},
  {id:88,name:"Ceinture Cuir Homme Élégante",vendor:"TailorCMR",price:8900,old:12000,disc:26,stars:4,reviews:38,emoji:"🪢",img:"https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=400&fit=crop",cat:"homme",bg:"#F5F5DC",delivery:"Yaoundé · 24h",top:false,stock:40,viewers:7,desc:"Ceinture cuir véritable, boucle acier brossé, ajustable."},
  {id:95,name:"Polo Homme Rayé Classique",vendor:"DenimCo",price:11500,old:15000,disc:23,stars:4,reviews:41,emoji:"👔",img:"https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",cat:"homme",bg:"#EEF5FF",delivery:"Yaoundé · 24h",top:false,stock:38,viewers:7,desc:"Polo rayé coton piqué, coupe classique, col contrasté."},
  {id:98,name:"Sacoche Homme Cuir Premium",vendor:"ArtisanLeather",price:22000,old:29000,disc:24,stars:4,reviews:27,emoji:"💼",img:"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop",cat:"homme",bg:"#FEF3C7",delivery:"Douala · 72h",top:false,stock:14,viewers:11,desc:"Sacoche homme cuir véritable, compartiment tablette, élégante."},
  {id:3,name:"Crème Karité Bio Pure 250ml",vendor:"NaturaCMR",price:5500,old:3050,disc:18,stars:5,reviews:112,emoji:"🧴",img:"https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=400&fit=crop",cat:"beaute",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:true,stock:3,viewers:24,desc:"Crème hydratante karité pur africain 24h. 100% naturelle, sans conservateurs."},
  {id:11,name:"Savon Noir Africain Artisanal",vendor:"NaturaCMR",price:5500,old:null,disc:0,stars:5,reviews:203,emoji:"🧼",img:"https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=400&h=400&fit=crop",cat:"beaute",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:true,stock:50,viewers:4,desc:"Savon noir pur artisanal, huile de palme et karité. Purifiant naturel."},
  {id:17,name:"Huile d'Argan Pure 100ml",vendor:"NaturaCMR",price:6800,old:8500,disc:20,stars:5,reviews:76,emoji:"✨",img:"https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop",cat:"beaute",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:true,stock:22,viewers:11,desc:"Pressée à froid, certifiée bio ECOCERT."},
  {id:22,name:"Gel Douche Coco & Karité",vendor:"NaturaCMR",price:6400,old:null,disc:0,stars:4,reviews:48,emoji:"🫧",img:"https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop",cat:"beaute",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:false,stock:35,viewers:3,desc:"PH neutre, sans sulfates, certifié vegan."},
  {id:44,name:"Parfum Floral 50ml Premium",vendor:"FragranceArt",price:22000,old:29000,disc:24,stars:5,reviews:38,emoji:"💐",img:"https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop",cat:"beaute",bg:"#FFE4E1",delivery:"Yaoundé · 24h",top:false,stock:21,viewers:8,desc:"Parfum floral délicieux, eau de toilette 50ml, tenue 8h."},
  {id:45,name:"Crème Solaire SPF50 Tropical",vendor:"SunProtect",price:16500,old:21000,disc:21,stars:4,reviews:49,emoji:"☀️",img:"https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop",cat:"beaute",bg:"#FFFBEB",delivery:"Yaoundé · 24h",top:false,stock:37,viewers:9,desc:"Crème solaire SPF50 waterproof, protection intense."},
  {id:46,name:"Kit Maquillage Professionnel 24pc",vendor:"BeautyLab",price:28500,old:37000,disc:23,stars:4,reviews:43,emoji:"💄",img:"https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",cat:"beaute",bg:"#F5E6FF",delivery:"Yaoundé · 48h",top:true,stock:13,viewers:16,desc:"Kit maquillage pro 24 pièces, pinceaux et produits premium."},
  {id:63,name:"Mascara Volume XXL",vendor:"BeautyLab",price:7800,old:10500,disc:26,stars:5,reviews:87,emoji:"💄",img:"https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",cat:"beaute",bg:"#F5E6FF",delivery:"Yaoundé · 24h",top:true,stock:48,viewers:15,desc:"Mascara volume extrême, tenue 24h, waterproof."},
  {id:73,name:"Sérum Vitamine C 30ml",vendor:"NaturaCMR",price:11200,old:15000,disc:25,stars:5,reviews:104,emoji:"✨",img:"https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop",cat:"beaute",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:true,stock:43,viewers:20,desc:"Sérum vitamine C 20%, acide hyaluronique, anti-âge."},
  {id:82,name:"Palette Ombres 16 Teintes",vendor:"BeautyLab",price:16800,old:22000,disc:24,stars:5,reviews:64,emoji:"🎨",img:"https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",cat:"beaute",bg:"#F5E6FF",delivery:"Yaoundé · 24h",top:false,stock:26,viewers:13,desc:"Palette ombres à paupières 16 teintes nude et colorées."},
  {id:93,name:"Huile Essentielle Citronnelle",vendor:"NaturaCMR",price:4200,old:5500,disc:24,stars:5,reviews:84,emoji:"🌿",img:"https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop",cat:"beaute",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:false,stock:55,viewers:4,desc:"Huile essentielle citronnelle 100% pure, anti-moustique naturel."},
  {id:97,name:"Savon Lait de Chèvre Bio",vendor:"NaturaCMR",price:3800,old:5200,disc:27,stars:5,reviews:118,emoji:"🧴",img:"https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=400&h=400&fit=crop",cat:"beaute",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:false,stock:70,viewers:6,desc:"Savon lait de chèvre bio, hydratant et apaisant, artisanal."},
  {id:139,name:"Huile Argan Pure 100ml",vendor:"NaturaCMR",price:8500,old:12000,disc:29,stars:5,reviews:94,emoji:"🧴",img:"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop",cat:"beaute",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:true,stock:25,viewers:11,desc:"Huile argan 100% pure, pressée à froid, visage et cheveux."},
  {id:140,name:"Palette Maquillage 18 Tons",vendor:"BeautéPro",price:16000,old:22000,disc:27,stars:4,reviews:37,emoji:"💄",img:"https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",cat:"beaute",bg:"#FFF0F5",delivery:"Douala · 48h",top:false,stock:14,viewers:16,desc:"Palette ombres 18 tons, pigments intenses, miroir inclus."},
  {id:4,name:"Samsung Galaxy A55 5G 128Go",vendor:"TechYaoundé",price:155000,old:null,disc:0,stars:4,reviews:8,emoji:"📱",img:"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop",cat:"phone",bg:"#F5F3FF",delivery:"Yaoundé · 48h",top:false,stock:6,viewers:18,desc:"AMOLED 6.6'', triple caméra 50MP, batterie 5000mAh. Garantie 1 an Samsung officiel."},
  {id:27,name:"iPhone 15 128Go Reconditionné",vendor:"TechYaoundé",price:420000,old:550000,disc:24,stars:5,reviews:11,emoji:"📱",img:"https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop",cat:"phone",bg:"#F5F3FF",delivery:"Yaoundé · 48h",top:true,stock:3,viewers:27,desc:"Grade A+, batterie >90%, garantie 12 mois BelivaY."},
  {id:42,name:"Tecno Spark 20 Pro",vendor:"MobileHouse",price:89000,old:115000,disc:23,stars:4,reviews:24,emoji:"📱",img:"https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop",cat:"phone",bg:"#FFF0F5",delivery:"Yaoundé · 48h",top:true,stock:11,viewers:19,desc:"Tecno Spark 20 Pro, écran 90Hz, batterie 5000mAh."},
  {id:43,name:"Redmi Note 13 5G",vendor:"TechYaoundé",price:145000,old:185000,disc:22,stars:5,reviews:35,emoji:"📱",img:"https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop",cat:"phone",bg:"#F0F9FF",delivery:"Yaoundé · 48h",top:true,stock:9,viewers:21,desc:"Redmi Note 13 5G, Snapdragon 6Gen1, caméra 108MP."},
  {id:78,name:"Coque iPhone 15 Silicone",vendor:"TechGear",price:5500,old:7500,disc:27,stars:4,reviews:82,emoji:"📱",img:"https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop",cat:"phone",bg:"#F5F3FF",delivery:"Yaoundé · 24h",top:false,stock:85,viewers:5,desc:"Coque silicone premium, protection complète, anti-choc."},
  {id:86,name:"Protège-Écran Verre Trempé",vendor:"DataStore",price:3500,old:5000,disc:30,stars:4,reviews:198,emoji:"📱",img:"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop",cat:"phone",bg:"#F5F3FF",delivery:"Yaoundé · 24h",top:false,stock:150,viewers:4,desc:"Verre trempé 9H, anti-traces, pose facile sans bulles."},
  {id:131,name:"iPhone 13 Reconditionné 128Go",vendor:"TechYaoundé",price:245000,old:320000,disc:23,stars:5,reviews:12,emoji:"📱",img:"https://images.unsplash.com/photo-1632661674596-df8be59a8056?w=400&h=400&fit=crop",cat:"phone",bg:"#F5F3FF",delivery:"Yaoundé · 48h",top:true,stock:3,viewers:35,desc:"iPhone 13 grade A, batterie 92%+, garantie 6 mois."},
  {id:132,name:"Xiaomi Redmi Note 13",vendor:"TechYaoundé",price:105000,old:135000,disc:22,stars:4,reviews:29,emoji:"📱",img:"https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop",cat:"phone",bg:"#F5F3FF",delivery:"Douala · 48h",top:false,stock:8,viewers:20,desc:"AMOLED 6.67'', 108MP, 5000mAh, charge 33W."},
  {id:5,name:"Escarpins Cuir Véritable",vendor:"ShoesDouala",price:12000,old:16000,disc:25,stars:4,reviews:34,emoji:"👠",img:"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop",cat:"shoes",bg:"#FFF8E1",delivery:"Douala · 48h",top:false,stock:11,viewers:7,desc:"Cuir véritable, semelle confort anti-fatigue, talon 7cm stable. Tailles 36–42."},
  {id:18,name:"Chaussures Sport Running",vendor:"ShoesDouala",price:24000,old:32000,disc:25,stars:5,reviews:38,emoji:"👟",img:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",cat:"shoes",bg:"#F5F3FF",delivery:"Douala · 48h",top:true,stock:13,viewers:9,desc:"Semelle EVA légère, mesh respirant, drop 8mm."},
  {id:47,name:"Baskets Plateforme Chic",vendor:"ShoesBoulevard",price:21000,old:28000,disc:25,stars:5,reviews:52,emoji:"👟",img:"https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop",cat:"shoes",bg:"#F0F9FF",delivery:"Yaoundé · 24h",top:true,stock:26,viewers:14,desc:"Baskets plateforme blanche/noire, très tendance, confortable."},
  {id:48,name:"Mocassins Cuir Homme",vendor:"ClassicShoes",price:34000,old:45000,disc:24,stars:4,reviews:31,emoji:"👞",img:"https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400&h=400&fit=crop",cat:"shoes",bg:"#FFF5EE",delivery:"Yaoundé · 48h",top:false,stock:15,viewers:7,desc:"Mocassins cuir véritable, doublure confortable, très élégant."},
  {id:49,name:"Sandales Tressées Été",vendor:"SeasideLiving",price:11200,old:14800,disc:24,stars:4,reviews:39,emoji:"🩴",img:"https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&h=400&fit=crop",cat:"shoes",bg:"#FEF3C7",delivery:"Yaoundé · 24h",top:false,stock:44,viewers:6,desc:"Sandales tressées style été, tissu respirant, semelle antidérapant."},
  {id:65,name:"Sneakers Montantes Urbaines",vendor:"ShoesBoulevard",price:27000,old:35000,disc:23,stars:5,reviews:44,emoji:"👟",img:"https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop",cat:"shoes",bg:"#F0F9FF",delivery:"Douala · 48h",top:true,stock:19,viewers:16,desc:"Sneakers montantes style urbain, cuir et textile."},
  {id:75,name:"Bottes Chelsea Cuir",vendor:"ClassicShoes",price:38000,old:48000,disc:21,stars:5,reviews:26,emoji:"👢",img:"https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400&h=400&fit=crop",cat:"shoes",bg:"#FFF5EE",delivery:"Douala · 48h",top:false,stock:13,viewers:9,desc:"Bottes chelsea cuir véritable, élastiques côtés, confort premium."},
  {id:87,name:"Tongs Confort Premium",vendor:"SeasideLiving",price:6800,old:9000,disc:24,stars:4,reviews:45,emoji:"🩴",img:"https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&h=400&fit=crop",cat:"shoes",bg:"#FEF3C7",delivery:"Yaoundé · 24h",top:false,stock:60,viewers:5,desc:"Tongs ergonomiques, mousse mémoire, séchage rapide."},
  {id:6,name:"Écouteurs Bluetooth 40h Pro",vendor:"SoundAfrik",price:8500,old:null,disc:0,stars:5,reviews:67,emoji:"🎧",img:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",cat:"tech",bg:"#F0F9FF",delivery:"Yaoundé · 24h",top:true,stock:20,viewers:9,desc:"Réduction de bruit active, 40h autonomie, charge rapide 15min."},
  {id:8,name:"Montre Connectée GPS Sport",vendor:"TechYaoundé",price:22500,old:null,disc:0,stars:4,reviews:11,emoji:"⌚",img:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",cat:"tech",bg:"#F0FFF4",delivery:"Yaoundé · 48h",top:false,stock:9,viewers:6,desc:"GPS intégré, cardio, étanche 50m, 14 jours autonomie."},
  {id:10,name:"Laptop HP Intel i5 8Go 256Go",vendor:"TechYaoundé",price:285000,old:320000,disc:11,stars:4,reviews:15,emoji:"💻",img:"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop",cat:"tech",bg:"#EEF5FF",delivery:"Yaoundé · 48h",top:false,stock:4,viewers:14,desc:"HP 15'' i5 11e génération, 8Go DDR4, SSD 256Go, Windows 11."},
  {id:15,name:"Écran PC 24'' Full HD 75Hz",vendor:"TechYaoundé",price:68500,old:null,disc:0,stars:4,reviews:14,emoji:"🖥️",img:"https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=400&fit=crop",cat:"tech",bg:"#EEF5FF",delivery:"Yaoundé · 72h",top:false,stock:8,viewers:7,desc:"IPS 24'' FHD 75Hz, 5ms, HDMI+VGA."},
  {id:20,name:"Casque Gaming RGB Pro",vendor:"SoundAfrik",price:18500,old:24000,disc:23,stars:4,reviews:28,emoji:"🎮",img:"https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop",cat:"tech",bg:"#F0F9FF",delivery:"Yaoundé · 48h",top:false,stock:6,viewers:13,desc:"Son surround 7.1, micro antibruit, RGB 16M couleurs."},
  {id:24,name:"Tablette Samsung Galaxy Tab A8",vendor:"TechYaoundé",price:125000,old:148000,disc:15,stars:4,reviews:17,emoji:"📋",img:"https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop",cat:"tech",bg:"#EEF5FF",delivery:"Yaoundé · 48h",top:false,stock:5,viewers:10,desc:"10.5'' TFT, Android 13, 3Go RAM."},
  {id:25,name:"Enceinte Bluetooth 20W Waterproof",vendor:"SoundAfrik",price:16500,old:22000,disc:25,stars:5,reviews:44,emoji:"🔊",img:"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop",cat:"tech",bg:"#F0F9FF",delivery:"Yaoundé · 24h",top:true,stock:12,viewers:8,desc:"IPX7, 20W, BT 5.0, 12h autonomie."},
  {id:38,name:"Clavier Mécanique RGB",vendor:"TechGear",price:32000,old:42000,disc:24,stars:5,reviews:55,emoji:"⌨️",img:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop",cat:"tech",bg:"#F0F9FF",delivery:"Yaoundé · 48h",top:true,stock:14,viewers:22,desc:"Clavier mécanique RGB 104 touches, switches Outemu blue."},
  {id:39,name:"Webcam HD 1080p Pro",vendor:"SoundAfrik",price:18900,old:24500,disc:23,stars:4,reviews:41,emoji:"📷",img:"https://images.unsplash.com/photo-1587826080692-f439cd0b70e8?w=400&h=400&fit=crop",cat:"tech",bg:"#F5F3FF",delivery:"Yaoundé · 24h",top:false,stock:19,viewers:12,desc:"Webcam HD 1080p, auto-focus, microphone intégré."},
  {id:40,name:"Powerbank 20000mAh Fast",vendor:"ChargeStation",price:19500,old:26000,disc:25,stars:5,reviews:67,emoji:"🔋",img:"https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop",cat:"tech",bg:"#FFFBEB",delivery:"Yaoundé · 24h",top:true,stock:38,viewers:13,desc:"Powerbank 20000mAh, charge rapide, 2 ports USB."},
  {id:41,name:"Clé USB 128Go Ultra",vendor:"DataStore",price:14000,old:18500,disc:24,stars:4,reviews:46,emoji:"💾",img:"https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=400&fit=crop",cat:"tech",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:false,stock:53,viewers:6,desc:"Clé USB 128Go, lecture rapide 100Mb/s, ultra compacte."},
  {id:64,name:"Câble USB-C Charge Rapide 2m",vendor:"TechGear",price:4500,old:6800,disc:34,stars:4,reviews:156,emoji:"🔌",img:"https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=400&fit=crop",cat:"tech",bg:"#F0F9FF",delivery:"Yaoundé · 24h",top:false,stock:120,viewers:7,desc:"Câble USB-C tressé nylon, charge rapide 65W, 2 mètres."},
  {id:69,name:"Souris Gaming Sans Fil",vendor:"TechGear",price:14500,old:19000,disc:24,stars:5,reviews:68,emoji:"🖱️",img:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop",cat:"tech",bg:"#F0F9FF",delivery:"Yaoundé · 24h",top:true,stock:31,viewers:18,desc:"Souris gaming sans fil, capteur 16000 DPI, RGB."},
  {id:74,name:"Hub USB-C 7-en-1",vendor:"TechGear",price:24500,old:32000,disc:23,stars:4,reviews:39,emoji:"🔗",img:"https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=400&fit=crop",cat:"tech",bg:"#EEF5FF",delivery:"Yaoundé · 48h",top:false,stock:22,viewers:13,desc:"Hub USB-C: HDMI 4K, 3xUSB 3.0, SD, PD 100W."},
  {id:7,name:"Coussin Déco Wax Ankara",vendor:"DecoMaison237",price:6800,old:4000,disc:15,stars:4,reviews:19,emoji:"🛋️",img:"https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=400&fit=crop",cat:"maison",bg:"#FFF0F5",delivery:"Yaoundé · 72h",top:false,stock:14,viewers:3,desc:"Tissu wax ankara authentique 45×45cm, rembourrage premium, housse lavable."},
  {id:30,name:"Sac à Dos Scolaire 30L",vendor:"KidsWorld",price:9800,old:13000,disc:25,stars:4,reviews:29,emoji:"🎒",img:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop",cat:"maison",bg:"#EEF5FF",delivery:"Yaoundé · 24h",top:false,stock:18,viewers:4,desc:"Compartiment ordi 15'', bretelles ergonomiques, imperméable."},
  {id:50,name:"Lampe de Chevet LED",vendor:"HomeDecor",price:14500,old:19000,disc:24,stars:4,reviews:36,emoji:"💡",img:"https://images.unsplash.com/photo-1507473885765-e6ed057ab793?w=400&h=400&fit=crop",cat:"maison",bg:"#FFFBEB",delivery:"Yaoundé · 24h",top:false,stock:32,viewers:8,desc:"Lampe de chevet LED dimmable, 3 modes de couleur."},
  {id:51,name:"Set de Cuisine 5 Pièces",vendor:"KitchenEssentials",price:23000,old:30000,disc:23,stars:4,reviews:44,emoji:"🍳",img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop",cat:"maison",bg:"#FFF0F5",delivery:"Yaoundé · 48h",top:false,stock:18,viewers:10,desc:"Set de cuisine 5 pièces, poêles antiadhésives inox."},
  {id:52,name:"Drap Housse 180x200 Coton",vendor:"ComfyBedding",price:12000,old:15500,disc:23,stars:5,reviews:58,emoji:"🛏️",img:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=400&fit=crop",cat:"maison",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:false,stock:41,viewers:5,desc:"Drap housse 180x200 coton biologique, très doux."},
  {id:66,name:"Ventilateur Silencieux 40cm",vendor:"HomeDecor",price:18500,old:24000,disc:23,stars:4,reviews:52,emoji:"🌬️",img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop",cat:"maison",bg:"#FFFBEB",delivery:"Yaoundé · 48h",top:false,stock:27,viewers:10,desc:"Ventilateur 40cm oscillant, 3 vitesses, ultra silencieux."},
  {id:76,name:"Miroir Mural Décoratif",vendor:"HomeDecor",price:21000,old:28000,disc:25,stars:4,reviews:34,emoji:"🪞",img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop",cat:"maison",bg:"#FFF0F5",delivery:"Yaoundé · 72h",top:false,stock:16,viewers:7,desc:"Miroir mural rond 60cm, cadre doré, style moderne."},
  {id:83,name:"Bouilloire Électrique 1.7L",vendor:"KitchenEssentials",price:12500,old:16500,disc:24,stars:4,reviews:55,emoji:"☕",img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop",cat:"maison",bg:"#FFFBEB",delivery:"Yaoundé · 48h",top:false,stock:29,viewers:8,desc:"Bouilloire inox 1.7L, ébullition rapide, arrêt auto."},
  {id:94,name:"Coussin Siège Auto Ergonomique",vendor:"HomeDecor",price:11000,old:14500,disc:24,stars:4,reviews:32,emoji:"🚗",img:"https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=400&fit=crop",cat:"maison",bg:"#FFF0F5",delivery:"Yaoundé · 48h",top:false,stock:23,viewers:6,desc:"Coussin siège ergonomique mousse mémoire, soulage le dos."},
  {id:149,name:"Nappe Wax Table 6 Places",vendor:"HomeDecor",price:8000,old:11000,disc:27,stars:5,reviews:52,emoji:"🏠",img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop",cat:"maison",bg:"#EFF6FF",delivery:"Yaoundé · 24h",top:true,stock:20,viewers:6,desc:"Nappe wax imperméable, 180x130cm, lavable machine."},
  {id:13,name:"Huile de Palme Rouge Bio 1L",vendor:"BioMarché237",price:5400,old:2000,disc:10,stars:5,reviews:88,emoji:"🫚",img:"https://images.unsplash.com/photo-1474979266404-7f28db35582f?w=400&h=400&fit=crop",cat:"super",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:true,stock:100,viewers:2,desc:"Bio, première pression à froid. Riche en vitamines A et E."},
  {id:19,name:"Riz Parfumé Long Grain 5kg",vendor:"BioMarché237",price:5500,old:6200,disc:11,stars:5,reviews:144,emoji:"🌾",img:"https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop",cat:"super",bg:"#FFFBEB",delivery:"Yaoundé · 24h",top:true,stock:80,viewers:1,desc:"Riz thaï jasmin premium, long grain, parfumé naturellement."},
  {id:23,name:"Miel Pur Cameroun 500g",vendor:"BioMarché237",price:7200,old:null,disc:0,stars:5,reviews:89,emoji:"🍯",img:"https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop",cat:"super",bg:"#FEF3C7",delivery:"Yaoundé · 24h",top:false,stock:45,viewers:2,desc:"Miel toutes fleurs récolté en forêt camerounaise."},
  {id:29,name:"Lait de Coco Naturel 400ml",vendor:"BioMarché237",price:6600,old:null,disc:0,stars:5,reviews:67,emoji:"🥥",img:"https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop",cat:"super",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:false,stock:60,viewers:1,desc:"100% pur, sans conservateurs."},
  {id:53,name:"Café Cameroun Torréfié 500g",vendor:"BioMarché237",price:9800,old:12500,disc:22,stars:5,reviews:71,emoji:"☕",img:"https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop",cat:"super",bg:"#FFFBEB",delivery:"Yaoundé · 24h",top:true,stock:48,viewers:11,desc:"Café Cameroun pur torréfié, moulu ou grain, arôme riche."},
  {id:54,name:"Pâte d'Arachide Pure 500g",vendor:"NaturalFood",price:8200,old:10500,disc:22,stars:4,reviews:63,emoji:"🥜",img:"https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop",cat:"super",bg:"#FFF9E6",delivery:"Yaoundé · 24h",top:false,stock:56,viewers:9,desc:"Pâte d'arachide pure sans conservateur, 100% naturelle."},
  {id:55,name:"Épices Ndolé Mix Premium",vendor:"SpiceMarket",price:7500,old:9800,disc:23,stars:4,reviews:47,emoji:"🌶️",img:"https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop",cat:"super",bg:"#FFF8DC",delivery:"Yaoundé · 24h",top:false,stock:39,viewers:6,desc:"Épices Ndolé mix premium, saveurs authentiques camerounaises."},
  {id:67,name:"Chocolat Artisanal Cameroun",vendor:"BioMarché237",price:6200,old:8000,disc:23,stars:5,reviews:93,emoji:"🍫",img:"https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&h=400&fit=crop",cat:"super",bg:"#FEF3C7",delivery:"Yaoundé · 24h",top:true,stock:65,viewers:8,desc:"Chocolat noir 70% cacao camerounais, production artisanale."},
  {id:77,name:"Jus Ananas Cameroun 1L Bio",vendor:"NaturalFood",price:3800,old:5000,disc:24,stars:5,reviews:112,emoji:"🍍",img:"https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop",cat:"super",bg:"#FFFBEB",delivery:"Yaoundé · 24h",top:false,stock:72,viewers:4,desc:"Jus ananas 100% pur camerounais, pasteurisé, sans sucre ajouté."},
  {id:85,name:"Huile de Noix de Coco 500ml",vendor:"NaturaCMR",price:4800,old:6500,disc:26,stars:5,reviews:138,emoji:"🥥",img:"https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop",cat:"super",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:true,stock:68,viewers:6,desc:"Huile de coco vierge bio, pressée à froid, multi-usage."},
  {id:56,name:"Ballon Football Officiel",vendor:"SportsPro",price:18500,old:24000,disc:23,stars:4,reviews:42,emoji:"⚽",img:"https://images.unsplash.com/photo-1614632537423-1e6078b6d3b5?w=400&h=400&fit=crop",cat:"sport",bg:"#F0FFF4",delivery:"Yaoundé · 48h",top:false,stock:20,viewers:12,desc:"Ballon football officiel taille 5, équilibre parfait."},
  {id:57,name:"Tapis Yoga Premium 6mm",vendor:"FitLife",price:16500,old:22000,disc:25,stars:5,reviews:59,emoji:"🧘",img:"https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop",cat:"sport",bg:"#F0F9FF",delivery:"Yaoundé · 24h",top:true,stock:29,viewers:14,desc:"Tapis yoga premium 6mm, antidérapant, très confortable."},
  {id:58,name:"Haltères 2x5kg Caoutchouc",vendor:"HomeFitness",price:24000,old:31000,disc:23,stars:4,reviews:35,emoji:"⛹️",img:"https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=400&fit=crop",cat:"sport",bg:"#FFEBEE",delivery:"Yaoundé · 48h",top:false,stock:16,viewers:8,desc:"Haltères 2x5kg caoutchouc ergonomiques, anti-bruit."},
  {id:70,name:"Short Sport Homme Running",vendor:"SportsPro",price:8900,old:12000,disc:26,stars:4,reviews:46,emoji:"🏃",img:"https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",cat:"sport",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:false,stock:55,viewers:6,desc:"Short sport running, tissu quick-dry, poches zippées."},
  {id:84,name:"Brassière Sport Femme",vendor:"FitLife",price:9500,old:13000,disc:27,stars:5,reviews:73,emoji:"🏋️",img:"https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=400&fit=crop",cat:"sport",bg:"#FFE4F0",delivery:"Yaoundé · 24h",top:true,stock:42,viewers:16,desc:"Brassière sport maintien fort, tissu respirant, anti-humidité."},
  {id:90,name:"Casquette Brodée Cameroun",vendor:"SportStyle",price:7500,old:10000,disc:25,stars:4,reviews:56,emoji:"🧢",img:"https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400&h=400&fit=crop",cat:"sport",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:false,stock:48,viewers:8,desc:"Casquette brodée drapeau Cameroun, ajustable, coton 100%."},
  {id:96,name:"Gourde Isotherme 750ml",vendor:"FitLife",price:8500,old:11000,disc:23,stars:5,reviews:66,emoji:"🧊",img:"https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop",cat:"sport",bg:"#F0F9FF",delivery:"Yaoundé · 24h",top:true,stock:50,viewers:10,desc:"Gourde isotherme inox, chaud 12h froid 24h, sans BPA."},
  {id:165,name:"Maillot Football CMR 2024",vendor:"SportZone",price:18000,old:25000,disc:28,stars:5,reviews:56,emoji:"⚽",img:"https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=400&fit=crop",cat:"sport",bg:"#F0FDF4",delivery:"Yaoundé · 24h",top:true,stock:12,viewers:20,desc:"Maillot Lions Indomptables officiel 2024."},
  {id:59,name:"Poussette Pliable Compacte",vendor:"BabyGear",price:42000,old:56000,disc:25,stars:5,reviews:28,emoji:"👶",img:"https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop",cat:"bebe",bg:"#FFE4F0",delivery:"Yaoundé · 48h",top:true,stock:10,viewers:17,desc:"Poussette pliable légère, système freinage sûr, harnais."},
  {id:60,name:"Body Bébé Coton Bio Lot 3",vendor:"BabyComfort",price:13500,old:18000,disc:25,stars:5,reviews:52,emoji:"👕",img:"https://images.unsplash.com/photo-1522771930-78848d9293e8?w=400&h=400&fit=crop",cat:"bebe",bg:"#F0FFF4",delivery:"Yaoundé · 24h",top:false,stock:35,viewers:9,desc:"Lot 3 bodys bébé coton bio certifié, très doux et sûr."},
  {id:89,name:"Set Bébé Naissance 10 Pcs",vendor:"BabyComfort",price:28000,old:37000,disc:24,stars:5,reviews:41,emoji:"🍼",img:"https://images.unsplash.com/photo-1522771930-78848d9293e8?w=400&h=400&fit=crop",cat:"bebe",bg:"#FFE4F0",delivery:"Yaoundé · 48h",top:true,stock:15,viewers:13,desc:"Set complet naissance: bodies, bonnets, chaussons, bavoirs."},
  {id:178,name:"Ensemble Bébé Wax 3pcs",vendor:"BébéJoie",price:8500,old:12000,disc:29,stars:5,reviews:58,emoji:"👶",img:"https://images.unsplash.com/photo-1522771930-78b353648ed1?w=400&h=400&fit=crop",cat:"bebe",bg:"#FFF0F5",delivery:"Yaoundé · 24h",top:true,stock:15,viewers:9,desc:"Ensemble bébé wax body+pantalon+bandeau, 0-18 mois."},
  {id:179,name:"Porte-Bébé Africain Kanga",vendor:"BébéJoie",price:12000,old:16000,disc:25,stars:4,reviews:41,emoji:"👶",img:"https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop",cat:"bebe",bg:"#FFF0F5",delivery:"Douala · 48h",top:false,stock:20,viewers:7,desc:"Porte-bébé kanga traditionnel, tissu renforcé."},
  {id:180,name:"Jouet Bois Éducatif Puzzle",vendor:"ArtisanWood",price:6500,old:9000,disc:28,stars:5,reviews:73,emoji:"🧸",img:"https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&h=400&fit=crop",cat:"bebe",bg:"#FEF3C7",delivery:"Yaoundé · 24h",top:true,stock:25,viewers:5,desc:"Puzzle bois animaux Afrique, 12 pièces, 2-5 ans."}
];

function toProduct(raw: RawV29): V29Product {
  return {
    id: raw.id,
    title: raw.name,
    slug: raw.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    description: raw.desc,
    price_xaf: raw.old || raw.price,
    discount: raw.disc,
    price_final: raw.price,
    stock_quantity: raw.stock,
    is_active: true,
    category: { id: CAT_IDS[raw.cat] || 99, name: CAT_NAMES[raw.cat] || "Autre", slug: raw.cat, is_active: true },
    media: raw.img ? [{ id: raw.id, url: raw.img, media_type: "image" as const, sort_order: 0 }] : [],
    images: raw.img ? [{ id: raw.id, image: raw.img, image_url: raw.img, is_primary: true, order: 0, created_at: "2026-04-01T00:00:00Z" }] : [],
    rating_average: raw.stars,
    reviews_count: raw.reviews,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    vendor: getVendor(raw.vendor),
    emoji: raw.emoji,
    bg: raw.bg,
    delivery: raw.delivery,
    viewers: raw.viewers,
    top: raw.top,
  };
}

export const V29_PRODUCTS: V29Product[] = RAW_DATA.map(toProduct);

/* ── Helpers ── */
export function getByCat(cat: string): V29Product[] {
  return V29_PRODUCTS.filter(p => p.category?.slug === cat);
}

export function getTopProducts(): V29Product[] {
  return V29_PRODUCTS.filter(p => p.top);
}

export function getPromoProducts(): V29Product[] {
  return V29_PRODUCTS.filter(p => p.discount >= 20);
}

export function getNewProducts(): V29Product[] {
  return [...V29_PRODUCTS].sort((a, b) => b.id - a.id).slice(0, 12);
}

export function getRecommended(): V29Product[] {
  // Mix of high-rated products
  return V29_PRODUCTS.filter(p => (p.rating_average ?? 0) >= 4.5).slice(0, 12);
}

/* ── Flash Deals ── */
export const FLASH_DEALS = [
  { name: "Ensemble Wax 3 Pièces", price: "32 000", old: "45 000", emoji: "🎭", img: "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400&h=400&fit=crop", bg: "#FFF3E8", stock: 12 },
  { name: "Laptop HP Intel i5", price: "285 000", old: "320 000", emoji: "💻", img: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop", bg: "#EEF5FF", stock: 4 },
  { name: "Coffret Beauté Naturelle", price: "11 800", old: "15 000", emoji: "🧴", img: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=400&fit=crop", bg: "#F0FFF4", stock: 18 },
  { name: "Chaussures Sport Running", price: "24 000", old: "32 000", emoji: "👟", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop", bg: "#F5F3FF", stock: 13 },
  { name: "Pagne Hollandais Vlisco", price: "42 000", old: "52 000", emoji: "🎨", img: "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400&h=400&fit=crop", bg: "#FFF3E8", stock: 7 },
];

/* ── Trust Banners ── */
export const TRUST_BANNERS = [
  { title: "Paiement Escrow", subtitle: "Argent protégé jusqu'à réception", img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=300&fit=crop&q=85" },
  { title: "Vendeurs Certifiés", subtitle: "Identité vérifiée, qualité garantie", img: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=300&fit=crop&q=85" },
  { title: "Livraison 24-72h", subtitle: "Suivi temps réel au Cameroun", img: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&h=300&fit=crop&q=85" },
  { title: "Retour Gratuit 7j", subtitle: "Remboursement sous 72h", img: "https://images.unsplash.com/photo-1586880244406-556ebe35f282?w=600&h=300&fit=crop&q=85" },
  { title: "Support 7j/7", subtitle: "WhatsApp · Email · Chat", img: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&h=300&fit=crop&q=85" },
];
