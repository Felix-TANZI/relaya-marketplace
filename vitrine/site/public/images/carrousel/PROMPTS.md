# Prompts des 10 photos du carrousel de l'accueil — BelivaY

Fichiers à déposer dans ce dossier : `femme`, `homme`, `chauss`, `tel`, `elec`, `beaute`, `maison`, `marche`, `bebe`,
`sport` (`.webp` ou `.jpg`). Prompts en anglais (meilleurs résultats : Midjourney v6+, Flux 1.1 Pro, Ideogram 2,
DALL·E 3, Firefly). Chaque prompt est complet et autonome : le copier tel quel.

---

## 1. Analyse de l'emplacement (mesurée sur le site, pas estimée)

Mesures faites dans le site (bande du carrousel, texte, voile) :

| Écran | Bande affichée (px) | Rapport | Texte (étiquette + titre + sous-titre) occupe |
|---|---|---|---|
| Téléphone 375 | 343 × 168 | 2,04 : 1 | de 52 % à 92 % de la hauteur (39 % si le titre passe sur 2 lignes), presque toute la largeur |
| Téléphone 430 | 398 × 168 | 2,37 : 1 | de 52 % à 92 % de la hauteur |
| Tablette 768 | 720 × 300 | 2,40 : 1 | de 66 % à 92 % de la hauteur |
| Tablette 1024 | 818 × 340 | 2,41 : 1 | de 70 % à 93 % de la hauteur |
| Ordinateur 1280 | 750 × 360 | 2,08 : 1 | de 72 % à 93 % de la hauteur |
| Ordinateur 1440 | 718 × 360 | 1,99 : 1 | de 72 % à 93 % de la hauteur |
| Grand écran 1920 | 1110 × 400 | 2,77 : 1 | de 75 % à 94 % de la hauteur, jusqu'à 60 % de la largeur |

- L'image est recadrée en `cover`, ancrée à **70 % horizontal / 50 % vertical**.
- Un voile sombre (#100E14) part de **30 % de la hauteur** (transparent) et monte à **86 % d'opacité en bas**.
- Le texte est blanc. L'étiquette est un rectangle orange braise (#EA6C1F), en majuscules, en haut à gauche du bloc de
  texte.

Conséquences pour la composition :
1. **Format maître : 2,8 : 1, paysage** (par exemple 2800 × 1000 px). C'est le rapport le plus large mesuré (1920 px) :
   aucun écran n'élargit l'image au-delà, et les écrans plus étroits ne font que rogner les côtés.
2. **Rognage horizontal** : sur les écrans les plus étroits (1,99 : 1), seuls **71 % de la largeur** restent visibles,
   pris entre **20 % et 91 %** de l'image maître (ancrage à 70 %). Tout ce qui compte doit donc tenir entre **25 % et
   88 % de la largeur**. Les 20 % de gauche et les 9 % de droite ne sont visibles que sur les écrans larges : y mettre
   seulement du fond et des éléments secondaires.
3. **Zone produit (héros)** : le produit principal et ses détails doivent tenir entre **12 % et 60 % de la hauteur**.
   Sur téléphone, le texte commence à 52 % (39 % si le titre passe sur 2 lignes) et le voile assombrit tout le bas.
   Les produits peuvent descendre plus bas (base, reflet au sol, ombre), mais rien d'important sous 60 %.
4. **Bande du bas, de 60 % à 100 % de la hauteur** : surface sombre, calme, peu détaillée (sol brillant, reflets doux).
   C'est là que s'affichent l'étiquette orange, le titre et le sous-titre blancs.
5. **Centre de gravité** : produit principal centré vers **58 % de la largeur et 36 % de la hauteur**, produits
   secondaires de part et d'autre, entre 30 % et 85 % de la largeur.
6. **Couleurs** : rien d'orange vif en bas à gauche (l'étiquette doit ressortir), rien de blanc pur en bas (le texte doit
   ressortir).
7. **Cohérence de la série** : même fond, même lumière, même hauteur d'horizon (sol vers 62 % de la hauteur), même
   distance de prise de vue. Les 10 bandes défilent à la suite et doivent sembler faites par le même studio.

**Identité BelivaY** (variables CSS du site) :
- fond espresso #1A1720 → #100E14 ;
- braise #EA6C1F / #D95D12 / #F07A2E ;
- or #E8A10E ;
- crème chaude pour les reflets.

---

## 2. Bloc de style commun (déjà inclus dans chaque prompt ci-dessous)

Ultra-wide 2.8:1 cinematic e-commerce hero still life, photorealistic product photography shot on a medium format
camera with a 90mm lens at eye level, f/5.6, sharp product detail, studio backdrop of deep warm espresso black with a
faint violet undertone (#1A1720 at top fading to #100E14), a dark glossy floor whose horizon sits at 62% of the image
height reflecting the products softly, key light: warm ember orange (#EA6C1F → #F07A2E) softbox from upper right,
golden rim light (#E8A10E) outlining every product edge, a soft circular orange glow behind the hero product, a few
tiny defocused ember particles in the air, lower 40% of the frame dark, calm and nearly empty for text overlay,
far-left 20% and far-right 9% contain only background, premium African-modern editorial mood, no people.

**Négatif (commun)** : no people, no hands, no faces, no mannequins, no text, no letters, no numbers, no logos, no
brand names, no watermark, no price tags, no labels with writing, no white background, no cold blue light, no
cluttered composition, no cartoon or 3D render look, no neon oversaturation, no important object below 60% of the
image height, no bright orange object in the lower-left area.

---

## 3. Les 10 prompts

### femme — Mode femme (Robes · Pagnes & wax)
Ressenti visé : élégance, couleurs du wax, envie d'essayer.
```
Ultra-wide 2.8:1 cinematic e-commerce hero still life, photorealistic, medium format 90mm at eye level f/5.6, deep warm espresso-black studio backdrop with faint violet undertone (#1A1720 to #100E14), dark glossy floor with horizon at 62% of image height. HERO, centered at 58% width and 36% height: a sleeveless A-line midi dress in authentic African wax print — large concentric circles in ember orange (#EA6C1F), ochre and deep emerald on a cream base — hanging on a thin curved light-oak hanger from an invisible line, fabric slightly swaying, crisp waxed cotton sheen, visible fine weave, neat princess seams and a hidden side zip; to its left at 38% width, a tidy stack of three folded 6-yard wax pagnes (orange/green circles, gold/brown geometric, indigo/ochre leaves) with sharp folded edges showing the patterns; to its right at 78% width, a structured caramel full-grain leather top-handle handbag with gold-tone clasp and visible stitching, and a pair of large gold hoop earrings laid on the glossy floor catching golden highlights. Lighting: warm ember-orange softbox from upper right, golden rim light outlining the dress silhouette and bag edges, soft circular orange glow behind the dress, tiny defocused embers. Lower 40% dark and calm (only soft reflections of the dress hem), far-left 20% and far-right 9% only background. Premium African-modern fashion editorial.
Negative: no people, no hands, no mannequin, no text, no logos, no brand names, no labels, no white background, no cold light, no clutter, nothing important below 60% height.
```

### homme — Mode homme (Chemises · Costumes & tenues africaines)
Ressenti visé : allure, sur-mesure, confiance.
```
Ultra-wide 2.8:1 cinematic e-commerce hero still life, photorealistic, medium format 90mm at eye level f/5.6, deep warm espresso-black studio backdrop with faint violet undertone (#1A1720 to #100E14), dark glossy floor with horizon at 62% of image height. HERO, centered at 58% width and 36% height: a dark wooden valet stand dressed with a tailored navy wool two-button blazer (notch lapels, flap pockets, fine visible twill weave) over a crisp white cotton shirt with a semi-spread collar and mother-of-pearl buttons, a folded wax-print pocket square in orange and black peeking from the breast pocket; at 36% width, a folded light-blue oxford shirt and a rolled brown full-grain leather belt with a brushed brass buckle; at 80% width on the glossy floor, a pair of polished cognac leather oxford shoes with fine broguing, visible welt stitching and mirror-shine toe caps, and a classic steel watch with a brown leather strap lying beside them. Lighting: warm ember-orange key from upper right, golden rim light tracing the blazer shoulders, lapels and shoe toes, soft orange glow behind the blazer, tiny defocused embers. Lower 40% dark and calm, far-left 20% and far-right 9% only background. Luxury menswear editorial with subtle African accent.
Negative: no people, no hands, no mannequin head, no text, no logos, no brand names, no tags, no white background, no cold light, no clutter, nothing important below 60% height.
```

### chauss — Chaussures (Baskets · Chaussures de ville)
Ressenti visé : précision, matières, envie de toucher.
```
Ultra-wide 2.8:1 cinematic e-commerce hero still life, photorealistic, medium format 100mm macro-capable lens at slightly low eye level f/6.3, deep warm espresso-black studio backdrop with faint violet undertone (#1A1720 to #100E14), dark glossy floor with horizon at 62% of image height. HERO, centered at 58% width and 34% height: one premium running sneaker floating slightly above a matte dark cylindrical pedestal, angled three-quarter from the front-left, white engineered knit upper with fine visible mesh texture, ember-orange (#EA6C1F) heel tab and swoosh-free side panel, sculpted white foam midsole with subtle orange gradient, flat waxed laces neatly tied, visible stitching and reflective heel detail; its pair resting on the pedestal below, tilted to show the multi-directional rubber tread. At 36% width on a lower stepped pedestal: polished cognac leather derby shoes with blind eyelets, fine welt stitching and burnished toe. At 80% width: tan leather sandals with braided straps and brass buckles. Lighting: warm ember-orange softbox from upper right, crisp golden rim light outlining every sole edge and stitch, a thin horizontal orange light line glowing behind the floating sneaker, soft circular orange glow, tiny defocused embers, gentle reflections on the glossy floor. Lower 40% dark and calm, far-left 20% and far-right 9% only background. High-end footwear campaign.
Negative: no people, no feet, no hands, no text, no logos, no brand marks on shoes, no labels, no white background, no cold light, no clutter, nothing important below 60% height.
```

### tel — Téléphones & tablettes (Smartphones · Téléphones simples)
Ressenti visé : modernité, finesse, technologie accessible.
```
Ultra-wide 2.8:1 cinematic e-commerce hero still life, photorealistic, medium format 90mm at eye level f/6.3, deep warm espresso-black studio backdrop with faint violet undertone (#1A1720 to #100E14), dark glossy floor with horizon at 62% of image height. HERO, centered at 58% width and 36% height: a modern bezel-less smartphone standing upright, rotated 20° to show its slim titanium-grey frame and triple-lens camera bump with sapphire lens rings; the screen is on, showing an abstract flowing gradient of ember orange, gold and deep plum (no icons, no text); fine reflections on the glass. Behind it at 72% width, a 11-inch tablet leaning at an angle with the same glowing gradient screen and thin aluminum edges. At 38% width, a compact robust feature phone with a physical keypad (keys blank, no characters) in matte black. On the glossy floor at 80% width: a pair of white wireless earbuds with their open charging case, and a compact fast charger with a neatly coiled braided USB-C cable. Lighting: warm ember-orange key from upper right, golden rim light along every device edge and camera ring, soft orange glow behind the smartphone, screens casting a faint warm light on the floor, tiny defocused embers. Lower 40% dark and calm, far-left 20% and far-right 9% only background. Premium tech launch aesthetic.
Negative: no people, no hands, no text, no icons, no app UI, no logos, no brand names, no white background, no cold blue light, no clutter, nothing important below 60% height.
```

### elec — Électronique (Audio · TV & vidéo)
Ressenti visé : divertissement, soirée, son immersif.
```
Ultra-wide 2.8:1 cinematic e-commerce hero still life, photorealistic, medium format 80mm at eye level f/6.3, deep warm espresso-black studio backdrop with faint violet undertone (#1A1720 to #100E14), dark glossy floor with horizon at 62% of image height. HERO, centered at 60% width and 34% height: an ultra-thin 55-inch flat-screen TV seen at three-quarter angle on a low dark walnut media console, edge-to-edge screen showing an abstract warm sunset gradient over soft dunes (no text, no logos), razor-thin metal bezel; below it a slim fabric-wrapped soundbar. At 36% width on the console: a round portable wireless speaker with a woven graphite fabric grille and an orange accent ring. At 80% width on the glossy floor: premium over-ear headphones with memory-foam cushions and brushed metal hinges, and a compact power bank. Lighting: warm ember-orange key from upper right, golden rim light on the TV edge, console and headphones, the TV screen glow spilling warm light onto the floor, soft orange halo behind the TV, tiny defocused embers. Lower 40% dark and calm, far-left 20% and far-right 9% only background. Premium home-entertainment campaign.
Negative: no people, no hands, no text, no UI, no logos, no brand names, no white background, no cold blue light, no clutter, nothing important below 60% height.
```

### beaute — Beauté & santé (Soins visage · Cheveux)
Ressenti visé : douceur, naturel, soin de soi.
```
Ultra-wide 2.8:1 cinematic e-commerce hero still life, photorealistic, medium format 100mm macro at slightly high angle f/5.6, deep warm espresso-black studio backdrop with faint violet undertone (#1A1720 to #100E14), dark glossy travertine-like stone blocks as platforms, floor horizon at 62% of image height. HERO, centered at 58% width and 36% height: an amber glass serum bottle with a black rubber dropper, a drop of golden oil suspended at the pipette tip, standing on the tallest stone block; next to it an open frosted-glass jar of rich cream showing a smooth swirled texture. At 38% width: a carved wooden bowl of raw ivory shea butter with a wooden spatula, and a small clear bottle of golden coconut oil. At 80% width: a wide-tooth sandalwood comb, a satin bonnet in ember orange folded softly, and two dried hibiscus flowers. Tiny water droplets on the glass. Lighting: warm golden backlight making the oils glow, ember-orange key from upper right, golden rim light on the bottles, soft orange halo behind the serum, tiny defocused embers. Lower 40% dark and calm, far-left 20% and far-right 9% only background. Clean natural beauty editorial.
Negative: no people, no hands, no faces, no text, no labels with writing, no logos, no brand names, no white background, no cold light, no clutter, nothing important below 60% height.
```

### maison — Maison & cuisine (Cuisine · Petit électroménager)
Ressenti visé : chaleur du foyer, cuisine qui donne faim, qualité durable.
```
Ultra-wide 2.8:1 cinematic e-commerce hero still life, photorealistic, medium format 80mm at eye level f/6.3, deep warm espresso-black studio backdrop with faint violet undertone (#1A1720 to #100E14), dark glossy floor and a dark walnut countertop with horizon at 62% of image height. HERO, centered at 58% width and 34% height: a brushed stainless-steel high-speed blender with a clear jug half filled with a vibrant mango smoothie, fine condensation on the glass; behind it at 72% width, a matte cream electric kettle with a light steam wisp catching orange light. At 38% width: a set of two copper-bottom stainless cooking pots with glass lids, one gently steaming. At 82% width: a thick wooden chopping board with ripe plantains, glossy tomatoes, a red chili and fresh basil, a chef's knife with a wooden handle, and a woven raffia placemat edge. Lighting: warm ember-orange key from upper right, golden rim light on metal edges and steam, soft orange glow behind the blender, tiny defocused embers. Lower 40% dark and calm, far-left 20% and far-right 9% only background. Warm premium kitchen campaign.
Negative: no people, no hands, no text, no logos, no brand names, no labels, no white background, no cold light, no clutter, nothing important below 60% height.
```

### marche — Supermarché (Épicerie · Boissons)
Ressenti visé : abondance, fraîcheur, courses faciles.
```
Ultra-wide 2.8:1 cinematic e-commerce hero still life, photorealistic, medium format 80mm at slightly high angle f/7.1, deep warm espresso-black studio backdrop with faint violet undertone (#1A1720 to #100E14), dark glossy floor with horizon at 62% of image height. HERO, centered at 58% width and 36% height: a hand-woven straw market basket overflowing with a whole golden pineapple, ripe yellow-red mangoes, a bunch of bananas and limes, every fruit crisp and glossy with tiny water droplets. At 36% width: a small burlap sack of long-grain rice open at the top with grains spilling, a clear glass bottle of golden peanut oil, and a kraft bag of roasted coffee beans with a few beans scattered. At 80% width: three unlabeled glass bottles of fresh juice (orange, hibiscus red, ginger gold) with condensation, and small glass spice jars of chili and curry. Lighting: warm ember-orange key from upper right, golden rim light on the fruits and bottles, soft orange glow behind the basket, tiny defocused embers. Lower 40% dark and calm, far-left 20% and far-right 9% only background. Fresh, appetizing premium grocery campaign.
Negative: no people, no hands, no text, no labels with writing, no logos, no brand names, no price tags, no white background, no cold light, no clutter, nothing important below 60% height.
```

### bebe — Bébé & enfant (Puériculture · Jouets)
Ressenti visé : tendresse, sécurité, douceur.
```
Ultra-wide 2.8:1 cinematic e-commerce hero still life, photorealistic, medium format 90mm at eye level f/5.6, deep warm espresso-black studio backdrop with faint violet undertone (#1A1720 to #100E14) but with a softer, slightly lighter warm glow than the other banners, dark glossy floor with horizon at 62% of image height. HERO, centered at 58% width and 36% height: an ergonomic baby carrier in sand-beige and terracotta cotton with padded shoulder straps, visible quilted stitching and a soft head support, displayed upright as if worn (empty), resting on a low cream pouf. At 38% width: a neatly folded muslin blanket with a subtle wax-inspired orange-and-cream pattern and tiny knitted booties in cream. At 80% width: natural wooden stacking rings in soft orange, ochre and sage, a glass baby bottle, and a small plush lion toy. Lighting: gentle ember-orange key from upper right, soft golden rim light, warm diffuse orange halo behind the carrier, a few soft defocused embers. Lower 40% dark and calm, far-left 20% and far-right 9% only background. Tender, safe, premium baby-care editorial.
Negative: no people, no babies, no hands, no text, no logos, no brand names, no labels, no white background, no cold light, no clutter, nothing important below 60% height.
```

### sport — Sport & loisirs (Fitness · Football)
Ressenti visé : énergie, mouvement, motivation.
```
Ultra-wide 2.8:1 cinematic e-commerce hero still life, photorealistic, medium format 85mm at eye level f/6.3, high-speed freeze motion, deep warm espresso-black studio backdrop with faint violet undertone (#1A1720 to #100E14), dark glossy floor with horizon at 62% of image height. HERO, centered at 58% width and 34% height: a premium leather football with white panels and ember-orange (#EA6C1F) accent panels, frozen mid-bounce slightly above the floor with fine visible stitching and a few airborne dust particles. At 36% width: a terracotta yoga mat partly unrolled with visible grip texture, and a pair of matte black hexagonal dumbbells. At 80% width: a brushed stainless-steel water bottle with condensation, a coiled jump rope with orange handles, and lightweight running shoes. Lighting: dynamic diagonal ember-orange light beam from upper right, golden rim light on the ball seams and dumbbell edges, soft orange glow behind the ball, motion-blurred ember particles. Lower 40% dark and calm, far-left 20% and far-right 9% only background. Energetic premium sports campaign.
Negative: no people, no hands, no text, no logos, no brand names, no labels, no white background, no cold light, no clutter, nothing important below 60% height.
```

---

## 4. Contrôle avant de déposer une image (2 minutes)
1. Ouvrir l'image et masquer mentalement **le bas 40 %** : le produit héros et ses détails sont-ils entièrement au-dessus ?
2. Masquer **les 20 % de gauche et les 9 % de droite** : la composition tient-elle encore ? (C'est le rendu sur
   téléphone et à 1440 px.)
3. Aucun texte, logo ni marque visible ; fond espresso et lumière braise identiques aux 9 autres.
4. Exporter en WebP qualité 82, environ 2800 px de large, sous 400 Ko. Le site gère le reste.
