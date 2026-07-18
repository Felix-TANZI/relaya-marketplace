"""
backend/apps/catalog/management/commands/seed_extended_taxonomy.py

Seed idempotent des 12 catégories BelivaY additionnelles (hors Electronics
et Téléphones qui sont couvertes par le seed Electronics existant).

═══════════════════════════════════════════════════════════════════════════
CONTENU — 12 catégories complètes basées sur recherches marché
═══════════════════════════════════════════════════════════════════════════

Recherches sur : Jumia Cameroun/Africa, créateurs de mode camerounais,
cosmétiques locaux, brasseries SABC/UCB, équipementiers Lions Indomptables,
éditeurs scolaires MINEDUB/MINESEC, artisanat régional CM (10 régions).

    Cat-1 (déjà livrée en v2) :
        1. menager     🔌  Électroménager
        2. super       🛒  Supermarché & Agroalimentaire
        3. femme       👗  Mode Femme
        4. beaute      💄  Beauté & Cosmétiques

    Cat-2 (livraison actuelle) :
        5. frais       ❄️  Frais & Premium (chaîne froid)
        6. homme       👔  Mode Homme
        7. shoes       👟  Chaussures
        8. maison      🏠  Maison & Déco
        9. bebe        🍼  Bébé & Enfant
       10. sport       ⚽  Sport & Fitness
       11. livres      📚  Fournitures scolaires & Livres
       12. artisanat   🎨  Artisanat Made in Cameroon

Total : 12 racines couvrant tout le catalogue BelivaY hors Electronics.

Idempotent : `get_or_create(slug=X)` partout. Rejouer sans risque.

═══════════════════════════════════════════════════════════════════════════
USAGE
═══════════════════════════════════════════════════════════════════════════

python manage.py seed_extended_taxonomy                # tout
python manage.py seed_extended_taxonomy --only artisanat  # une seule
python manage.py seed_extended_taxonomy --dry-run      # simulation
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from apps.catalog.models import Category, Brand, ProductAttribute


# ═══════════════════════════════════════════════════════════════════════════
# 🔌 ÉLECTROMÉNAGER
# ═══════════════════════════════════════════════════════════════════════════

MENAGER = {
    "name": "Électroménager",
    "icon_name": "Refrigerator",
    "description": (
        "Réfrigération, lavage, cuisson, ventilation/climatisation, énergie "
        "(groupes électrogènes, onduleurs, solaire — essentiel face au délestage), "
        "petit électroménager, entretien du sol."
    ),
    "display_order": 20,
    "children": [
        # ── Réfrigération dédiée (Jumia CM catégorie top) ──
        {
            "slug": "refrigeration",
            "name": "Réfrigération & congélation",
            "icon_name": "Refrigerator",
            "description": "Réfrigérateurs, congélateurs (majeur au CM pour conservation).",
            "display_order": 10,
            "variant_axes": [
                "menager-capacity-l", "menager-doors-count",
                "menager-defrost-type", "menager-energy-class", "menager-color",
            ],
        },
        # ── Lavage ──
        {
            "slug": "lavage-sechage",
            "name": "Lave-linge & sèche-linge",
            "icon_name": "WashingMachine",
            "description": "Machines à laver (top / hublot), sèche-linge, lave-vaisselle.",
            "display_order": 20,
            "variant_axes": [
                "menager-capacity-kg", "menager-programs-count",
                "menager-spin-speed", "menager-color",
            ],
        },
        # ── Cuisson (fours, cuisinières) ──
        {
            "slug": "cuisson",
            "name": "Cuisson & fours",
            "icon_name": "Flame",
            "description": (
                "Cuisinières à gaz, plaques électriques, fours, micro-ondes, "
                "cuiseurs à riz."
            ),
            "display_order": 30,
            "variant_axes": [
                "menager-energy-type", "menager-power-w",
                "menager-installation-type", "menager-color",
            ],
        },
        # ── Petit-déjeuner et machines à café ──
        {
            "slug": "petit-dej-cafe",
            "name": "Petit-déjeuner & café",
            "icon_name": "Coffee",
            "description": "Machines à café, grille-pains, bouilloires, presse-agrumes, mixeurs.",
            "display_order": 40,
            "variant_axes": ["menager-power-w", "menager-capacity-l", "menager-color"],
        },
        # ── Petit électroménager cuisine ──
        {
            "slug": "petit-electromenager-cuisine",
            "name": "Petit électroménager cuisine",
            "icon_name": "Utensils",
            "description": "Blenders, mixeurs, robots multifonctions, extracteurs de jus, batteurs.",
            "display_order": 50,
            "variant_axes": ["menager-power-w", "menager-color"],
        },
        # ── Ventilation & climatisation ──
        {
            "slug": "ventilation-climatisation",
            "name": "Ventilation & climatisation",
            "icon_name": "Fan",
            "description": "Ventilateurs, climatiseurs, purificateurs d'air, humidificateurs.",
            "display_order": 60,
            "variant_axes": [
                "menager-btu", "menager-power-w", "menager-installation-type",
                "menager-color", "menager-noise-level",
            ],
        },
        # ── Aspirateurs et entretien du sol ──
        {
            "slug": "aspirateurs-entretien-sol",
            "name": "Aspirateurs & entretien du sol",
            "icon_name": "Wind",
            "description": "Aspirateurs (traîneau, balai, robot), cireuses, nettoyeurs vapeur.",
            "display_order": 70,
            "variant_axes": ["menager-power-w", "menager-noise-level", "menager-color"],
        },
        # ── Fers à repasser ──
        {
            "slug": "repassage",
            "name": "Fers à repasser & défroisseurs",
            "icon_name": "Shirt",
            "description": "Fers à repasser vapeur, centrales vapeur, défroisseurs verticaux.",
            "display_order": 80,
            "variant_axes": ["menager-power-w", "menager-color"],
        },
        # ── Énergie (CM spécifique) ──
        {
            "slug": "energie",
            "name": "Énergie (groupes, onduleurs, solaire)",
            "icon_name": "BatteryCharging",
            "description": (
                "Groupes électrogènes (diesel/essence), onduleurs UPS, panneaux "
                "solaires, batteries, régulateurs — essentiel face au délestage."
            ),
            "display_order": 90,
            "variant_axes": [
                "menager-power-w", "menager-energy-type",
                "menager-battery-autonomy", "menager-fuel-consumption",
            ],
        },
        # ── Chauffage & chauffe-eau ──
        {
            "slug": "chauffage-eau",
            "name": "Chauffage & chauffe-eau",
            "icon_name": "Thermometer",
            "description": "Chauffe-eau électriques et à gaz, radiateurs, chauffe-plats.",
            "display_order": 100,
            "variant_axes": ["menager-capacity-l", "menager-power-w", "menager-energy-type"],
        },
        # ── Soins de la maison ──
        {
            "slug": "machines-a-coudre",
            "name": "Machines à coudre & tricot",
            "icon_name": "Scissors",
            "description": (
                "Machines à coudre — très demandées au CM avec la couture "
                "sur mesure."
            ),
            "display_order": 110,
            "variant_axes": ["menager-power-w", "menager-color"],
        },
    ],
    "brands": [
        # Grands internationaux
        {"name": "Samsung", "country": "Corée du Sud"},
        {"name": "LG", "country": "Corée du Sud"},
        {"name": "Hisense", "country": "Chine"},
        {"name": "Panasonic", "country": "Japon"},
        {"name": "Whirlpool", "country": "États-Unis"},
        {"name": "Bosch", "country": "Allemagne"},
        {"name": "Beko", "country": "Turquie"},
        {"name": "Haier", "country": "Chine"},
        {"name": "Sharp", "country": "Japon"},
        {"name": "Toshiba", "country": "Japon"},
        {"name": "Electrolux", "country": "Suède"},
        {"name": "Midea", "country": "Chine"},
        # Marques Jumia CM confirmées
        {"name": "Nasco", "country": "France"},
        {"name": "Binatone", "country": "Royaume-Uni"},
        {"name": "Sonashi", "country": "Émirats arabes unis"},
        {"name": "Moulinex", "country": "France"},
        {"name": "Tefal", "country": "France"},
        {"name": "Philips", "country": "Pays-Bas"},
        {"name": "Kenwood", "country": "Royaume-Uni"},
        {"name": "Sicomex", "country": "Chine"},
        {"name": "Icestream", "country": "Chine"},
        {"name": "Techwood", "country": "France"},
        {"name": "Smart Technology", "country": "Chine"},
        {"name": "Ilux", "country": "Chine"},
        {"name": "ATL", "country": "Turquie"},
        {"name": "Ligth Wave", "country": "Chine"},
        {"name": "Royality Line", "country": "Suisse"},
        {"name": "Solstar", "country": "Ghana"},
        {"name": "Restpoint", "country": "Chine"},
        {"name": "Astech", "country": "Chine"},
        # Groupes électrogènes / onduleurs
        {"name": "APC", "country": "États-Unis"},
        {"name": "Su-Kam", "country": "Inde"},
        {"name": "Firman", "country": "Chine"},
        {"name": "Yamaha", "country": "Japon"},
        {"name": "Honda", "country": "Japon"},
    ],
    "attributes": [
        # ── AXES ──
        {"slug": "menager-capacity-l", "name": "Capacité (litres)",
         "role": "AXE", "values_type": "NUMBER", "unit": "L", "values": []},
        {"slug": "menager-capacity-kg", "name": "Capacité (kg)",
         "role": "AXE", "values_type": "NUMBER", "unit": "kg", "values": []},
        {"slug": "menager-power-w", "name": "Puissance",
         "role": "AXE", "values_type": "NUMBER", "unit": "W", "values": []},
        {"slug": "menager-energy-type", "name": "Source d'énergie",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": ["Électrique", "Gaz butane", "Gaz naturel", "Solaire", "Diesel", "Essence", "Mixte"]},
        {"slug": "menager-color", "name": "Couleur",
         "role": "AXE", "values_type": "COLORDICT", "unit": "", "values": []},
        {"slug": "menager-doors-count", "name": "Nombre de portes",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": ["1 porte", "2 portes", "3 portes", "4 portes (Side-by-side)", "French Door"]},
        {"slug": "menager-programs-count", "name": "Nombre de programmes",
         "role": "AXE", "values_type": "NUMBER", "unit": "programmes", "values": []},
        {"slug": "menager-spin-speed", "name": "Vitesse d'essorage",
         "role": "AXE", "values_type": "NUMBER", "unit": "tr/min", "values": []},
        {"slug": "menager-btu", "name": "Puissance frigorifique",
         "role": "AXE", "values_type": "NUMBER", "unit": "BTU", "values": []},
        {"slug": "menager-installation-type", "name": "Type d'installation",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": ["Pose libre", "Encastrable", "Mural (Split)", "Portable / Mobile", "Intégré", "Fenêtre"]},
        {"slug": "menager-battery-autonomy", "name": "Autonomie batterie",
         "role": "AXE", "values_type": "NUMBER", "unit": "min", "values": []},
        {"slug": "menager-fuel-consumption", "name": "Consommation carburant",
         "role": "AXE", "values_type": "NUMBER", "unit": "L/h", "values": []},
        # ── SPECS ──
        {"slug": "menager-voltage", "name": "Tension",
         "role": "SPEC", "values_type": "SELECT", "unit": "V",
         "values": ["220V", "110V", "Bi-tension 110/220V", "12V (solaire/auto)", "24V"]},
        {"slug": "menager-energy-class", "name": "Classe énergétique",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": ["A+++", "A++", "A+", "A", "B", "C", "D"]},
        {"slug": "menager-defrost-type", "name": "Type de dégivrage",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": ["Automatique (No Frost)", "Semi-automatique", "Manuel"]},
        {"slug": "menager-noise-level", "name": "Niveau sonore",
         "role": "SPEC", "values_type": "NUMBER", "unit": "dB", "values": []},
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# 🛒 SUPERMARCHÉ & AGROALIMENTAIRE
# ═══════════════════════════════════════════════════════════════════════════

SUPER = {
    "name": "Supermarché & Agroalimentaire",
    "icon_name": "ShoppingCart",
    "description": (
        "Épicerie, boissons (locales SABC, Djino, Top, Supermont), épices "
        "camerounaises (pèbè, njangsa, poivre blanc de Penja), vivriers "
        "(gari, arachide, bâton de manioc), petit-déjeuner, hygiène."
    ),
    "display_order": 30,
    "children": [
        {
            "slug": "epicerie-seche",
            "name": "Épicerie sèche & féculents",
            "icon_name": "Wheat",
            "description": "Riz, pâtes, huile, sucre, farine, conserves, légumineuses.",
            "display_order": 10,
            "variant_axes": ["super-weight-g", "super-conditioning", "super-organic"],
        },
        {
            "slug": "petit-dejeuner",
            "name": "Petit-déjeuner",
            "icon_name": "Coffee",
            "description": "Céréales, corn flakes, confitures, tartinables, biscottes.",
            "display_order": 20,
            "variant_axes": ["super-weight-g", "super-conditioning"],
        },
        {
            "slug": "cafe-the-cacao",
            "name": "Café, thé & cacao",
            "icon_name": "Coffee",
            "description": "Cafés (Nescafé, Ricoré), thés, chocolats en poudre.",
            "display_order": 30,
            "variant_axes": ["super-weight-g", "super-conditioning"],
        },
        {
            "slug": "boissons-non-alcool",
            "name": "Boissons non-alcoolisées",
            "icon_name": "CupSoda",
            "description": (
                "Eaux (Supermont, Camtel Water, Aquabelle), jus (Djino, Foléré), "
                "sodas (Top, Coca-Cola), boissons énergisantes."
            ),
            "display_order": 40,
            "variant_axes": ["super-volume-ml", "super-conditioning", "super-flavor"],
        },
        {
            "slug": "boissons-alcool",
            "name": "Boissons alcoolisées",
            "icon_name": "Wine",
            "description": (
                "Bières camerounaises (SABC, UCB : 33 Export, Beaufort, Castel), "
                "vins, spiritueux, liqueurs. À encadrer selon la loi."
            ),
            "display_order": 50,
            "variant_axes": [
                "super-volume-ml", "super-conditioning", "super-alcohol-content",
            ],
        },
        {
            "slug": "epices-condiments",
            "name": "Épices & condiments",
            "icon_name": "Leaf",
            "description": (
                "Pèbè, njangsa, poivre blanc de Penja (IGP), gingembre, curcuma, "
                "cubes Maggi, Rondelé, sauces, vinaigres."
            ),
            "display_order": 60,
            "variant_axes": ["super-weight-g", "super-conditioning", "super-country-origin"],
        },
        {
            "slug": "vivriers",
            "name": "Produits vivriers locaux",
            "icon_name": "Sprout",
            "description": (
                "Gari, arachide, bâton de manioc, farine de manioc, tapioca, "
                "haricots, kwem, ndolé — cœur de l'alimentation camerounaise."
            ),
            "display_order": 70,
            "variant_axes": ["super-weight-g", "super-conditioning"],
        },
        {
            "slug": "conserves",
            "name": "Conserves & bocaux",
            "icon_name": "Package",
            "description": "Sardines, thon, tomate, légumes en conserve, olives.",
            "display_order": 80,
            "variant_axes": ["super-weight-g", "super-conditioning"],
        },
        {
            "slug": "miel-confitures",
            "name": "Miel & confitures",
            "icon_name": "Droplet",
            "description": "Miel local, confitures artisanales, sirops.",
            "display_order": 90,
            "variant_axes": ["super-weight-g", "super-flavor", "super-organic"],
        },
        {
            "slug": "snacks-biscuits",
            "name": "Snacks & biscuits",
            "icon_name": "Cookie",
            "description": "Biscuits (Bimo, Kelloggs), chips, chocolats (Chococam), bonbons.",
            "display_order": 100,
            "variant_axes": ["super-weight-g", "super-flavor"],
        },
        {
            "slug": "bio-dietetique",
            "name": "Bio, sans gluten & diététique",
            "icon_name": "Sprout",
            "description": "Produits bio, sans gluten, végan, halal, casher, allégés.",
            "display_order": 110,
            "variant_axes": ["super-weight-g", "super-diet-tags", "super-organic"],
        },
        {
            "slug": "complements-alim",
            "name": "Compléments alimentaires",
            "icon_name": "Pill",
            "description": "Vitamines, minéraux, protéines, superaliments.",
            "display_order": 120,
            "variant_axes": ["super-weight-g", "super-conditioning"],
        },
        {
            "slug": "hygiene-entretien",
            "name": "Hygiène & entretien maison",
            "icon_name": "SprayCan",
            "description": "Savons, lessives, désinfectants, papier hygiénique, éponges.",
            "display_order": 130,
            "variant_axes": ["super-volume-ml", "super-conditioning"],
        },
        {
            "slug": "animaux",
            "name": "Nourriture & accessoires animaux",
            "icon_name": "Dog",
            "description": "Croquettes chien/chat, litière, jouets, laisses.",
            "display_order": 140,
            "variant_axes": ["super-weight-g", "super-conditioning"],
        },
    ],
    "brands": [
        # Multinationales alimentation
        {"name": "Nestlé", "country": "Suisse"},
        {"name": "Coca-Cola", "country": "États-Unis"},
        {"name": "Unilever", "country": "Royaume-Uni"},
        {"name": "Ferrero", "country": "Italie"},
        {"name": "Kelloggs", "country": "États-Unis"},
        {"name": "Panzani", "country": "France"},
        {"name": "Maggi", "country": "Suisse"},
        {"name": "Danone", "country": "France"},
        {"name": "Bimo", "country": "Maroc"},
        {"name": "Dinor", "country": "Côte d'Ivoire"},
        {"name": "Kirène", "country": "Sénégal"},
        {"name": "Nescafé", "country": "Suisse"},
        {"name": "Ricoré", "country": "Suisse"},
        # Marques camerounaises alimentation
        {"name": "SIC-Cacaos", "country": "Cameroun"},
        {"name": "Chococam", "country": "Cameroun"},
        {"name": "SOSUCAM", "country": "Cameroun"},
        {"name": "Grand Moulin du Cameroun", "country": "Cameroun"},
        {"name": "Frissonnol", "country": "Cameroun"},
        {"name": "Vitalait", "country": "Cameroun"},
        {"name": "Bocom", "country": "Cameroun"},
        {"name": "MAYOR", "country": "Cameroun"},
        # Brasseries et boissons camerounaises
        {"name": "SABC", "country": "Cameroun"},
        {"name": "UCB", "country": "Cameroun"},
        {"name": "Boissons du Cameroun", "country": "Cameroun"},
        {"name": "Djino", "country": "Cameroun"},
        {"name": "Top", "country": "Cameroun"},
        {"name": "Supermont", "country": "Cameroun"},
        {"name": "Camtel Water", "country": "Cameroun"},
        {"name": "Aquabelle", "country": "Cameroun"},
        {"name": "Foléré", "country": "Cameroun"},
        {"name": "33 Export", "country": "Cameroun"},
        {"name": "Beaufort", "country": "Cameroun"},
        {"name": "Castel", "country": "France"},
        {"name": "Heineken", "country": "Pays-Bas"},
        # Nourriture animaux
        {"name": "Purina", "country": "Suisse"},
        {"name": "Whiskas", "country": "États-Unis"},
    ],
    "attributes": [
        # AXES
        {"slug": "super-weight-g", "name": "Poids",
         "role": "AXE", "values_type": "NUMBER", "unit": "g", "values": []},
        {"slug": "super-volume-ml", "name": "Volume",
         "role": "AXE", "values_type": "NUMBER", "unit": "mL", "values": []},
        {"slug": "super-conditioning", "name": "Conditionnement",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Unité", "Pack de 4", "Pack de 6", "Pack de 12", "Pack de 24",
             "Carton", "Sac", "Bidon", "Bouteille", "Sachet", "Boîte",
             "Bocal", "Format familial", "Vrac",
         ]},
        {"slug": "super-flavor", "name": "Saveur / parfum",
         "role": "AXE", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "super-alcohol-content", "name": "Taux d'alcool",
         "role": "AXE", "values_type": "NUMBER", "unit": "% vol", "values": []},
        # SPECS
        {"slug": "super-dlc", "name": "Date limite de consommation",
         "role": "SPEC", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "super-country-origin", "name": "Pays d'origine",
         "role": "SPEC", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "super-ingredients", "name": "Ingrédients",
         "role": "SPEC", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "super-batch-number", "name": "Numéro de lot",
         "role": "SPEC", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "super-organic", "name": "Produit bio",
         "role": "SPEC", "values_type": "BOOL", "unit": "", "values": []},
        {"slug": "super-diet-tags", "name": "Régime alimentaire",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Sans gluten", "Végan", "Végétarien", "Halal", "Casher",
             "Sans lactose", "Sans sucre ajouté", "Bio", "Allégé",
         ]},
    ],
}

# ═══════════════════════════════════════════════════════════════════════════
# 👗 MODE FEMME (enrichie)
# ═══════════════════════════════════════════════════════════════════════════

FEMME = {
    "name": "Mode Femme",
    "icon_name": "Shirt",
    "description": (
        "Vêtements, accessoires, chaussures pour femme. Traditionnel "
        "camerounais central (pagne wax, kaba, bazin riche, toghu, ndop, obom). "
        "Créateurs locaux (Imane Ayissi, Kibonen NY, LavieByCK). "
        "Couture sur mesure très demandée."
    ),
    "display_order": 50,
    "children": [
        # ── Vêtements de base ──
        {
            "slug": "robes",
            "name": "Robes",
            "icon_name": "Shirt",
            "description": "Robes courtes, longues, midi, soirée, cocktail, business, plage.",
            "display_order": 10,
            "variant_axes": [
                "femme-size", "femme-color", "femme-material",
                "femme-length", "femme-sleeve-type",
            ],
        },
        {
            "slug": "tops-chemisiers",
            "name": "Tops & chemisiers",
            "icon_name": "Shirt",
            "description": "T-shirts, chemisiers, blouses, débardeurs, tuniques, tops crop.",
            "display_order": 20,
            "variant_axes": [
                "femme-size", "femme-color", "femme-material",
                "femme-sleeve-type", "femme-neckline",
            ],
        },
        {
            "slug": "pantalons-jeans",
            "name": "Pantalons & jeans",
            "icon_name": "Shirt",
            "description": "Jeans (slim, skinny, bootcut, mom), pantalons tailleur, joggings, leggings.",
            "display_order": 30,
            "variant_axes": ["femme-size", "femme-color", "femme-material", "femme-closure"],
        },
        {
            "slug": "jupes",
            "name": "Jupes",
            "icon_name": "Shirt",
            "description": "Jupes courtes, mi-longues, longues, crayon, plissées, à volants.",
            "display_order": 40,
            "variant_axes": ["femme-size", "femme-color", "femme-material", "femme-length"],
        },
        {
            "slug": "manteaux-vestes",
            "name": "Manteaux & vestes",
            "icon_name": "Shirt",
            "description": "Vestes légères, blazers, blousons, manteaux, imperméables.",
            "display_order": 50,
            "variant_axes": ["femme-size", "femme-color", "femme-material", "femme-season"],
        },
        {
            "slug": "ensembles-tailleurs",
            "name": "Ensembles & tailleurs",
            "icon_name": "Shirt",
            "description": "Tailleurs pantalon / jupe, ensembles coordonnés, combinaisons deux pièces.",
            "display_order": 60,
            "variant_axes": ["femme-size", "femme-color", "femme-material", "femme-occasion"],
        },
        {
            "slug": "combinaisons",
            "name": "Combinaisons & combishorts",
            "icon_name": "Shirt",
            "description": "Combinaisons pantalon, combishorts, salopettes.",
            "display_order": 70,
            "variant_axes": ["femme-size", "femme-color", "femme-material"],
        },
        # ── Traditionnelles camerounaises ──
        {
            "slug": "traditionnelles",
            "name": "Tenues traditionnelles africaines",
            "icon_name": "Palette",
            "description": (
                "Boubous, caftans, kaba, bazin riche, wax, pagne, toghu (ndop), "
                "obom, dentelle africaine — patrimoine camerounais et africain."
            ),
            "display_order": 80,
            "variant_axes": [
                "femme-size", "femme-color", "femme-material",
                "femme-pattern", "femme-occasion",
            ],
        },
        {
            "slug": "enveloppements-tete",
            "name": "Enveloppements de tête (gele, foulards)",
            "icon_name": "Palette",
            "description": (
                "Gele, foulards traditionnels, turbans — accessoires essentiels "
                "des tenues cérémonielles."
            ),
            "display_order": 90,
            "variant_axes": ["femme-color", "femme-material", "femme-pattern"],
        },
        # ── Sous-vêtements et intimes ──
        {
            "slug": "lingerie-nuit",
            "name": "Lingerie & vêtements de nuit",
            "icon_name": "Heart",
            "description": "Soutiens-gorge, culottes, ensembles, pyjamas, nuisettes, robes de chambre.",
            "display_order": 100,
            "variant_axes": ["femme-size", "femme-color", "femme-material"],
        },
        # ── Segments spécifiques ──
        {
            "slug": "grossesse-maternite",
            "name": "Grossesse & maternité",
            "icon_name": "Baby",
            "description": "Vêtements grossesse, allaitement, jupes et pantalons évolutifs.",
            "display_order": 110,
            "variant_axes": ["femme-size", "femme-color", "femme-material"],
        },
        {
            "slug": "grandes-tailles",
            "name": "Grandes tailles",
            "icon_name": "Shirt",
            "description": "Vêtements en tailles étendues (44-58+), coupes adaptées.",
            "display_order": 120,
            "variant_axes": ["femme-size", "femme-color", "femme-material"],
        },
        {
            "slug": "voile-hijab",
            "name": "Voile & hijab",
            "icon_name": "Palette",
            "description": (
                "Hijabs, abayas, jilbabs, khimars, robes de prière — "
                "important pour la communauté musulmane camerounaise."
            ),
            "display_order": 130,
            "variant_axes": ["femme-color", "femme-material", "femme-length"],
        },
        {
            "slug": "maillots-plage",
            "name": "Maillots de bain & plage",
            "icon_name": "Waves",
            "description": "Maillots une pièce, bikinis, paréos, tuniques de plage.",
            "display_order": 140,
            "variant_axes": ["femme-size", "femme-color", "femme-material"],
        },
        {
            "slug": "sport-femme",
            "name": "Vêtements de sport",
            "icon_name": "Dumbbell",
            "description": "Leggings, brassières, tenues de yoga, fitness, running.",
            "display_order": 150,
            "variant_axes": ["femme-size", "femme-color", "femme-material"],
        },
        {
            "slug": "uniformes-travail",
            "name": "Uniformes & vêtements de travail",
            "icon_name": "Briefcase",
            "description": "Blouses, uniformes professionnels, tenues de travail.",
            "display_order": 160,
            "variant_axes": ["femme-size", "femme-color", "femme-material"],
        },
        # ── ACCESSOIRES (chacun est sa sous-catégorie) ──
        {
            "slug": "sacs-main",
            "name": "Sacs à main & portefeuilles",
            "icon_name": "ShoppingBag",
            "description": "Sacs à main, sacs à dos, pochettes, sacs bandoulière, portefeuilles.",
            "display_order": 170,
            "variant_axes": ["femme-color", "femme-material"],
        },
        {
            "slug": "bijoux",
            "name": "Bijoux",
            "icon_name": "Gem",
            "description": (
                "Colliers, boucles d'oreilles, bracelets, bagues, "
                "perles de hanche (héritage africain)."
            ),
            "display_order": 180,
            "variant_axes": ["femme-color", "femme-material"],
        },
        {
            "slug": "foulards-echarpes",
            "name": "Foulards & écharpes",
            "icon_name": "Palette",
            "description": "Foulards en soie, écharpes hiver, cheches, chèches.",
            "display_order": 190,
            "variant_axes": ["femme-color", "femme-material", "femme-pattern"],
        },
        {
            "slug": "ceintures",
            "name": "Ceintures",
            "icon_name": "Circle",
            "description": "Ceintures cuir, tressées, tissu, ceintures pagne.",
            "display_order": 200,
            "variant_axes": ["femme-color", "femme-material"],
        },
        {
            "slug": "chapeaux-bonnets",
            "name": "Chapeaux & bonnets",
            "icon_name": "Circle",
            "description": "Chapeaux de soleil, casquettes, bonnets, capelines, feutres.",
            "display_order": 210,
            "variant_axes": ["femme-color", "femme-material", "femme-season"],
        },
        {
            "slug": "lunettes-soleil",
            "name": "Lunettes de soleil",
            "icon_name": "Sun",
            "description": "Lunettes de soleil, montures optiques.",
            "display_order": 220,
            "variant_axes": ["femme-color"],
        },
        {
            "slug": "montres-femme",
            "name": "Montres femmes",
            "icon_name": "Clock",
            "description": "Montres à quartz, automatiques, connectées.",
            "display_order": 230,
            "variant_axes": ["femme-color", "femme-material"],
        },
    ],
    "brands": [
        # ── Fast fashion internationale ──
        {"name": "Zara", "country": "Espagne"},
        {"name": "H&M", "country": "Suède"},
        {"name": "Mango", "country": "Espagne"},
        {"name": "Bershka", "country": "Espagne"},
        {"name": "Pull&Bear", "country": "Espagne"},
        {"name": "Uniqlo", "country": "Japon"},
        {"name": "Shein", "country": "Chine"},
        {"name": "Kiabi", "country": "France"},
        {"name": "Primark", "country": "Irlande"},
        {"name": "DeFacto", "country": "Turquie"},
        # ── Jeans / casual ──
        {"name": "Levi's", "country": "États-Unis"},
        {"name": "Diesel", "country": "Italie"},
        {"name": "Wrangler", "country": "États-Unis"},
        # ── Haut de gamme accessoires ──
        {"name": "Guess", "country": "États-Unis"},
        {"name": "Michael Kors", "country": "États-Unis"},
        {"name": "Coach", "country": "États-Unis"},
        {"name": "Aldo", "country": "Canada"},
        # ── Wax et tissus africains (grands producteurs) ──
        {"name": "Vlisco", "country": "Pays-Bas"},
        {"name": "Uniwax", "country": "Côte d'Ivoire"},
        {"name": "Hollantex", "country": "Pays-Bas"},
        {"name": "Woodin", "country": "Ghana"},
        {"name": "GTP (Ghana Textiles Printing)", "country": "Ghana"},
        {"name": "ATL Cotton", "country": "Turquie"},
        # ── Créateurs camerounais (haut de gamme) ──
        {"name": "Imane Ayissi", "country": "Cameroun"},
        {"name": "Kibonen NY", "country": "Cameroun"},
        {"name": "LavieByCK", "country": "Cameroun"},
        {"name": "Soh Cameroun", "country": "Cameroun"},
        {"name": "Anna Ngann Yonn", "country": "Cameroun"},
        {"name": "Dorice Njamen (Clap Style)", "country": "Cameroun"},
        {"name": "Inesta Couture", "country": "Cameroun"},
        {"name": "Wazal", "country": "Cameroun"},
        {"name": "Stradel's Couture", "country": "Cameroun"},
        # ── Boutiques et labels camerounais accessibles ──
        {"name": "Adamastore", "country": "Cameroun"},
        {"name": "Roxanne", "country": "Cameroun"},
        {"name": "Claude Fashion Traditional Designs", "country": "Cameroun"},
    ],
    "attributes": [
        # ── AXES ──
        {"slug": "femme-size", "name": "Taille",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "XS", "S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL",
             "34", "36", "38", "40", "42", "44", "46", "48", "50", "52",
             "Taille Unique", "Sur mesure",
         ]},
        {"slug": "femme-color", "name": "Couleur",
         "role": "AXE", "values_type": "COLORDICT", "unit": "", "values": []},
        {"slug": "femme-material", "name": "Matière / tissu",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             # Tissus africains traditionnels
             "Wax", "Wax Vlisco", "Wax Hollandais", "Pagne", "Toghu (Ndop)",
             "Bazin Riche", "Bogolan", "Kente", "Obom (écorce)", "Dentelle africaine",
             "Kita", "Atoghu",
             # Tissus classiques
             "Coton", "Jean", "Soie", "Dentelle", "Lin", "Polyester",
             "Viscose", "Laine", "Cachemire", "Velours", "Synthétique",
             "Cuir", "Simili cuir", "Denim", "Jersey", "Mousseline", "Satin",
         ]},
        {"slug": "femme-pattern", "name": "Motif",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Uni", "Imprimé", "Floral", "Géométrique", "Ethnique",
             "Rayé", "À pois", "Animalier", "Camouflage", "Tie & dye",
             "Léopard", "Zébré", "Cachemire (motif)",
         ]},
        {"slug": "femme-sleeve-type", "name": "Manches",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Sans manches", "Manches courtes", "Manches 3/4",
             "Manches longues", "Manches ballon", "Manches bouffantes",
             "Manches chauve-souris", "Bretelles", "Bustier",
         ]},
        {"slug": "femme-length", "name": "Longueur",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Mini", "Courte", "Au-dessus du genou", "Genou",
             "Mi-longue", "Longue", "Maxi", "Traînante",
         ]},
        {"slug": "femme-neckline", "name": "Encolure",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Col V", "Col rond", "Col carré", "Col Bardot",
             "Col haut", "Col roulé", "Col Claudine", "Col chemise",
             "Décolleté profond", "Dos nu",
         ]},
        {"slug": "femme-closure", "name": "Type de fermeture",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Zip", "Boutons", "Laçage", "Élastique",
             "Sans fermeture", "Fermeture invisible", "Ceinture",
         ]},
        # ── SPECS ──
        {"slug": "femme-style", "name": "Style",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Traditionnel", "Moderne", "Casual", "Chic", "Élégant",
             "Sport", "Bohème", "Streetwear", "Rétro", "Vintage",
             "Minimaliste", "Romantique",
         ]},
        {"slug": "femme-occasion", "name": "Occasion",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Quotidien", "Soirée", "Cérémonie", "Mariage",
             "Deuil", "Plage", "Business / bureau", "Sport",
             "Fête traditionnelle", "Religieux",
         ]},
        {"slug": "femme-season", "name": "Saison",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Toutes saisons", "Saison chaude", "Saison des pluies",
             "Harmattan", "Printemps", "Été", "Automne", "Hiver",
         ]},
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# 💄 BEAUTÉ & COSMÉTIQUES (enrichie)
# ═══════════════════════════════════════════════════════════════════════════

BEAUTE = {
    "name": "Beauté & Cosmétiques",
    "icon_name": "Sparkles",
    "description": (
        "Soins peau, maquillage, cheveux (perruques/tissages/mèches — marché "
        "massif au CM), parfums, hygiène. Marques peaux noires (Fashion Fair, "
        "Iman, Black Opal). Cosmétiques camerounais naturels (Shu Anta, "
        "Maison SANZO'O, Kem Care, Kimia, Reen)."
    ),
    "display_order": 60,
    "children": [
        # ── Soins de la peau ──
        {
            "slug": "soins-peau-visage",
            "name": "Soins visage",
            "icon_name": "Droplet",
            "description": "Crèmes de jour/nuit, sérums, lotions toniques, gommages, masques.",
            "display_order": 10,
            "variant_axes": [
                "beaute-volume-ml", "beaute-skin-type",
                "beaute-formulation", "beaute-target-gender",
            ],
        },
        {
            "slug": "soins-peau-corps",
            "name": "Soins corps",
            "icon_name": "Droplet",
            "description": "Laits, crèmes hydratantes corps, gommages corps, huiles.",
            "display_order": 20,
            "variant_axes": [
                "beaute-volume-ml", "beaute-skin-type", "beaute-formulation",
            ],
        },
        # ── Maquillage ──
        {
            "slug": "maquillage-teint",
            "name": "Maquillage teint",
            "icon_name": "Palette",
            "description": "Fonds de teint, correcteurs, poudres, blush, highlighter, contouring.",
            "display_order": 30,
            "variant_axes": ["beaute-shade", "beaute-volume-ml", "beaute-formulation"],
        },
        {
            "slug": "maquillage-yeux",
            "name": "Maquillage yeux",
            "icon_name": "Eye",
            "description": "Mascaras, eye-liners, palettes fards, khôl, faux cils.",
            "display_order": 40,
            "variant_axes": ["beaute-shade", "beaute-color"],
        },
        {
            "slug": "maquillage-levres",
            "name": "Maquillage lèvres",
            "icon_name": "Lightbulb",
            "description": "Rouges à lèvres, gloss, crayons lèvres, baumes.",
            "display_order": 50,
            "variant_axes": ["beaute-shade", "beaute-color", "beaute-formulation"],
        },
        # ── Cheveux (marché massif au CM) ──
        {
            "slug": "cheveux-perruques",
            "name": "Perruques",
            "icon_name": "Scissors",
            "description": (
                "Perruques naturelles (human hair), synthétiques, Lace Front, "
                "Full Lace, HD Lace, closure — marché massif."
            ),
            "display_order": 60,
            "variant_axes": [
                "beaute-hair-length", "beaute-color", "beaute-hair-texture",
                "beaute-hair-style", "beaute-hair-lace-type",
            ],
        },
        {
            "slug": "cheveux-tissages-meches",
            "name": "Tissages, mèches & extensions",
            "icon_name": "Scissors",
            "description": (
                "Mèches brésiliennes, tissages, extensions, closures, frontales — "
                "central pour la clientèle camerounaise."
            ),
            "display_order": 70,
            "variant_axes": [
                "beaute-hair-length", "beaute-color",
                "beaute-hair-texture", "beaute-hair-style",
            ],
        },
        {
            "slug": "cheveux-produits",
            "name": "Produits capillaires",
            "icon_name": "Bath",
            "description": (
                "Shampooings, après-shampooings, masques, huiles, laits, "
                "gels coiffants, mousses — spécial cheveux crépus/frisés."
            ),
            "display_order": 80,
            "variant_axes": [
                "beaute-volume-ml", "beaute-hair-type",
                "beaute-formulation", "beaute-natural",
            ],
        },
        {
            "slug": "cheveux-coloration",
            "name": "Coloration cheveux",
            "icon_name": "Palette",
            "description": "Colorations permanentes, semi-permanentes, henné, décolorations.",
            "display_order": 90,
            "variant_axes": ["beaute-shade", "beaute-color", "beaute-volume-ml"],
        },
        {
            "slug": "cheveux-outils",
            "name": "Outils cheveux",
            "icon_name": "Scissors",
            "description": "Lisseurs, fers à boucler, sèche-cheveux, tondeuses, brosses.",
            "display_order": 100,
            "variant_axes": ["beaute-color", "beaute-target-gender"],
        },
        {
            "slug": "cheveux-accessoires-perruque",
            "name": "Adhésifs & accessoires perruques",
            "icon_name": "Package",
            "description": "Ghost Bond, colles, solvants, casquettes perruque, porte-perruques.",
            "display_order": 110,
            "variant_axes": ["beaute-volume-ml"],
        },
        # ── Parfums ──
        {
            "slug": "parfums-femme",
            "name": "Parfums femme",
            "icon_name": "Wind",
            "description": "Eaux de parfum, eaux de toilette, extraits féminins.",
            "display_order": 120,
            "variant_axes": [
                "beaute-volume-ml", "beaute-fragrance",
                "beaute-fragrance-concentration",
            ],
        },
        {
            "slug": "parfums-homme",
            "name": "Parfums homme",
            "icon_name": "Wind",
            "description": "EDT, EDP, extraits, eaux de Cologne pour homme.",
            "display_order": 130,
            "variant_axes": [
                "beaute-volume-ml", "beaute-fragrance",
                "beaute-fragrance-concentration",
            ],
        },
        {
            "slug": "parfums-unisex",
            "name": "Parfums unisex & niche",
            "icon_name": "Wind",
            "description": "Parfums unisex, parfums de niche, artisanaux.",
            "display_order": 140,
            "variant_axes": [
                "beaute-volume-ml", "beaute-fragrance",
                "beaute-fragrance-concentration",
            ],
        },
        # ── Hygiène ──
        {
            "slug": "hygiene-corps",
            "name": "Hygiène corps (savons, gels)",
            "icon_name": "Bath",
            "description": "Savons, gels douche, éponges, exfoliants corps.",
            "display_order": 150,
            "variant_axes": ["beaute-volume-ml", "beaute-fragrance", "beaute-natural"],
        },
        {
            "slug": "hygiene-buccale",
            "name": "Soins bucco-dentaires",
            "icon_name": "Smile",
            "description": "Dentifrices, brosses à dents, bains de bouche, fil dentaire.",
            "display_order": 160,
            "variant_axes": ["beaute-volume-ml", "beaute-formulation"],
        },
        {
            "slug": "hygiene-intime",
            "name": "Hygiène intime",
            "icon_name": "Heart",
            "description": "Savons intimes, lingettes, tampons, serviettes.",
            "display_order": 170,
            "variant_axes": ["beaute-volume-ml"],
        },
        {
            "slug": "deodorants",
            "name": "Déodorants & anti-transpirants",
            "icon_name": "Wind",
            "description": "Sticks, sprays, roll-on, crèmes, pierres d'alun.",
            "display_order": 180,
            "variant_axes": [
                "beaute-volume-ml", "beaute-fragrance",
                "beaute-target-gender", "beaute-natural",
            ],
        },
        {
            "slug": "rasage-epilation",
            "name": "Rasage & épilation",
            "icon_name": "Scissors",
            "description": "Rasoirs, mousses à raser, cires, crèmes dépilatoires.",
            "display_order": 190,
            "variant_axes": ["beaute-target-gender", "beaute-volume-ml"],
        },
        # ── Homme ──
        {
            "slug": "soins-hommes",
            "name": "Soins hommes (barbe & aftershave)",
            "icon_name": "User",
            "description": "Baumes à barbe, huiles à barbe, aftershaves, tondeuses.",
            "display_order": 200,
            "variant_axes": ["beaute-volume-ml", "beaute-fragrance", "beaute-formulation"],
        },
        # ── Solaire ──
        {
            "slug": "solaire",
            "name": "Solaire & autobronzant",
            "icon_name": "Sun",
            "description": "Crèmes solaires SPF, autobronzants, après-soleil, huiles.",
            "display_order": 210,
            "variant_axes": ["beaute-spf", "beaute-volume-ml", "beaute-formulation"],
        },
        # ── Bien-être & niches ──
        {
            "slug": "amincissant",
            "name": "Amincissant & minceur",
            "icon_name": "TrendingDown",
            "description": "Crèmes amincissantes, huiles minceur, ventouses.",
            "display_order": 220,
            "variant_axes": ["beaute-volume-ml", "beaute-formulation"],
        },
        {
            "slug": "pieds-mains",
            "name": "Soins pieds & mains",
            "icon_name": "Hand",
            "description": "Crèmes pieds, crèmes mains, gommages, soins callosités.",
            "display_order": 230,
            "variant_axes": ["beaute-volume-ml", "beaute-formulation"],
        },
        {
            "slug": "ongles",
            "name": "Ongles & vernis",
            "icon_name": "Sparkles",
            "description": "Vernis, faux ongles, dissolvants, décorations, gel UV.",
            "display_order": 240,
            "variant_axes": ["beaute-shade", "beaute-color", "beaute-volume-ml"],
        },
        # ── Naturels et bio ──
        {
            "slug": "naturels-locaux",
            "name": "Produits naturels & bio locaux",
            "icon_name": "Leaf",
            "description": (
                "Beurre de karité, manyanga, huile de baobab, huile de coco, "
                "obom — production camerounaise et africaine."
            ),
            "display_order": 250,
            "variant_axes": ["beaute-volume-ml", "beaute-natural"],
        },
        {
            "slug": "nutrition-beaute",
            "name": "Nutrition beauté (compléments)",
            "icon_name": "Pill",
            "description": "Compléments cheveux/peau/ongles, collagène, vitamines beauté.",
            "display_order": 260,
            "variant_axes": ["beaute-volume-ml", "beaute-natural"],
        },
        # ── Outils et accessoires ──
        {
            "slug": "outils-beaute",
            "name": "Outils & accessoires beauté",
            "icon_name": "Wrench",
            "description": "Pinceaux maquillage, éponges beauty, ciseaux, miroirs, roll-ons.",
            "display_order": 270,
            "variant_axes": ["beaute-color"],
        },
        {
            "slug": "coffrets-cadeaux",
            "name": "Coffrets cadeaux",
            "icon_name": "Gift",
            "description": "Coffrets parfums, soins, maquillage — idéal cadeaux.",
            "display_order": 280,
            "variant_axes": ["beaute-target-gender"],
        },
        {
            "slug": "bougies-bien-etre",
            "name": "Bougies parfumées & bien-être",
            "icon_name": "Flame",
            "description": "Bougies parfumées, huiles essentielles, diffuseurs, massage.",
            "display_order": 290,
            "variant_axes": ["beaute-fragrance", "beaute-natural"],
        },
    ],
    "brands": [
        # ── Grands maquilleurs internationaux ──
        {"name": "MAC Cosmetics", "country": "États-Unis"},
        {"name": "Fenty Beauty", "country": "États-Unis"},
        {"name": "Maybelline", "country": "États-Unis"},
        {"name": "L'Oréal Paris", "country": "France"},
        {"name": "Nyx", "country": "États-Unis"},
        {"name": "Revlon", "country": "États-Unis"},
        {"name": "Bourjois", "country": "France"},
        # ── Soins peau ──
        {"name": "Clinique", "country": "États-Unis"},
        {"name": "Estée Lauder", "country": "États-Unis"},
        {"name": "CeraVe", "country": "États-Unis"},
        {"name": "The Ordinary", "country": "Canada"},
        {"name": "Neutrogena", "country": "États-Unis"},
        {"name": "Nivea", "country": "Allemagne"},
        {"name": "Dove", "country": "Royaume-Uni"},
        {"name": "Vaseline", "country": "États-Unis"},
        {"name": "Johnson's", "country": "États-Unis"},
        {"name": "Garnier", "country": "France"},
        # ── Peaux noires spécifiques ──
        {"name": "Fashion Fair", "country": "États-Unis"},
        {"name": "Iman Cosmetics", "country": "États-Unis"},
        {"name": "Black Opal", "country": "États-Unis"},
        # ── Cheveux Afro ──
        {"name": "Shea Moisture", "country": "États-Unis"},
        {"name": "Cantu", "country": "États-Unis"},
        {"name": "Palmer's", "country": "États-Unis"},
        {"name": "African Pride", "country": "États-Unis"},
        {"name": "African's Best", "country": "États-Unis"},
        {"name": "Adore", "country": "États-Unis"},
        {"name": "Dark and Lovely", "country": "États-Unis"},
        {"name": "TReSemmé", "country": "États-Unis"},
        {"name": "Head & Shoulders", "country": "États-Unis"},
        {"name": "Nice & Lovely", "country": "Kenya"},
        # ── Parfumeries ──
        {"name": "Chanel", "country": "France"},
        {"name": "Dior", "country": "France"},
        {"name": "Yves Saint Laurent", "country": "France"},
        {"name": "Guerlain", "country": "France"},
        {"name": "Lancôme", "country": "France"},
        {"name": "Calvin Klein", "country": "États-Unis"},
        {"name": "Hugo Boss", "country": "Allemagne"},
        # ── Cameroun locales ──
        {"name": "Shu Anta", "country": "Cameroun"},
        {"name": "Maison SANZO'O", "country": "Cameroun"},
        {"name": "Kem Care", "country": "Cameroun"},
        {"name": "Kimia Cosmetics", "country": "Cameroun"},
        {"name": "Reen", "country": "Cameroun"},
        {"name": "Bissa'a Cosmetics", "country": "Cameroun"},
        {"name": "Madlyn Cazalis", "country": "Cameroun"},
        {"name": "Lola's Cosmetics", "country": "Cameroun"},
        {"name": "Bold Make-up", "country": "Cameroun"},
        {"name": "Nature Attitude", "country": "Cameroun"},
        {"name": "Baomix", "country": "Cameroun"},
        {"name": "Karité Zà", "country": "Cameroun"},
        {"name": "Lana Bio Cosmetic", "country": "Cameroun"},
    ],
    "attributes": [
        # ── AXES ──
        {"slug": "beaute-shade", "name": "Teinte / nuance",
         "role": "AXE", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "beaute-volume-ml", "name": "Contenance",
         "role": "AXE", "values_type": "NUMBER", "unit": "mL", "values": []},
        {"slug": "beaute-fragrance", "name": "Parfum",
         "role": "AXE", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "beaute-hair-length", "name": "Longueur cheveux",
         "role": "AXE", "values_type": "NUMBER", "unit": "pouces", "values": []},
        {"slug": "beaute-color", "name": "Couleur",
         "role": "AXE", "values_type": "COLORDICT", "unit": "", "values": []},
        {"slug": "beaute-hair-texture", "name": "Texture cheveux",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Cheveux humains 100%", "Cheveux Remy",
             "Cheveux humains vierges", "Synthétique",
             "Mixte (humain + synth)", "Fibre Kanekalon",
         ]},
        {"slug": "beaute-hair-style", "name": "Coupe / style perruque",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Lisse (Straight)", "Bouclé (Curly)", "Ondulé (Wavy)",
             "Frisé (Kinky)", "Water Wave", "Deep Wave", "Body Wave",
             "Loose Wave", "Yaki", "Bob court", "Long", "Afro",
         ]},
        {"slug": "beaute-hair-lace-type", "name": "Type de dentelle",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Sans dentelle (Full Machine)", "Lace Front",
             "Full Lace", "360 Lace", "HD Lace", "Transparent Lace",
             "Closure 4x4", "Closure 5x5",
         ]},
        {"slug": "beaute-spf", "name": "Protection solaire SPF",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": ["SPF 15", "SPF 20", "SPF 30", "SPF 50", "SPF 50+"]},
        {"slug": "beaute-formulation", "name": "Formulation",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Crème", "Gel", "Mousse", "Huile", "Sérum",
             "Lait", "Baume", "Beurre", "Spray", "Poudre",
             "Stick", "Liquide", "Roll-on", "Barre solide",
         ]},
        {"slug": "beaute-fragrance-concentration", "name": "Concentration parfum",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Extrait de parfum (Parfum)",
             "Eau de Parfum (EDP)",
             "Eau de Toilette (EDT)",
             "Eau de Cologne (EDC)",
             "Fresh / Body Splash",
         ]},
        # ── SPECS ──
        {"slug": "beaute-skin-type", "name": "Type de peau",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Peau sèche", "Peau grasse", "Peau mixte", "Peau sensible",
             "Peau normale", "Peau mature", "Peau à imperfections",
             "Peau noire", "Peau métissée",
         ]},
        {"slug": "beaute-hair-type", "name": "Type de cheveux",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Cheveux crépus (4a-4c)", "Cheveux frisés (3a-3c)",
             "Cheveux bouclés (2a-2c)", "Cheveux ondulés (1c)",
             "Cheveux lisses", "Cheveux abîmés", "Cheveux colorés",
             "Cheveux fins", "Cheveux épais", "Cuir chevelu sensible",
         ]},
        {"slug": "beaute-target-gender", "name": "Genre cible",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": ["Femme", "Homme", "Unisex", "Enfant", "Bébé"]},
        {"slug": "beaute-key-ingredients", "name": "Ingrédients clés",
         "role": "SPEC", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "beaute-natural", "name": "Naturel / Bio",
         "role": "SPEC", "values_type": "BOOL", "unit": "", "values": []},
        {"slug": "beaute-vegan", "name": "Végan",
         "role": "SPEC", "values_type": "BOOL", "unit": "", "values": []},
        {"slug": "beaute-halal", "name": "Halal",
         "role": "SPEC", "values_type": "BOOL", "unit": "", "values": []},
    ],
}



# ═══════════════════════════════════════════════════════════════════════════
# ❄️ FRAIS & PREMIUM (chaîne froid)
# ═══════════════════════════════════════════════════════════════════════════

FRAIS = {
    "name": "Frais & Premium",
    "icon_name": "Snowflake",
    "description": (
        "Viandes, poissons du golfe de Guinée (bar, capitaine, brochet), "
        "produits laitiers, fruits & légumes frais, surgelés, plats préparés. "
        "Chaîne froid — livraison express, zones limitées, créneaux courts."
    ),
    "display_order": 40,
    "children": [
        {
            "slug": "viandes-volailles",
            "name": "Viandes & volailles",
            "icon_name": "Beef",
            "description": (
                "Bœuf, poulet, chèvre, mouton, porc — coupes fraîches. "
                "Culture du poulet DG et du bœuf braisé au Cameroun."
            ),
            "display_order": 10,
            "variant_axes": [
                "frais-weight-kg", "frais-conditioning",
                "frais-conservation", "frais-origin-type",
            ],
        },
        {
            "slug": "charcuterie",
            "name": "Charcuterie",
            "icon_name": "Beef",
            "description": "Jambons, saucisses, saucissons, terrines.",
            "display_order": 20,
            "variant_axes": ["frais-weight-kg", "frais-conditioning"],
        },
        {
            "slug": "poissons-fruits-mer",
            "name": "Poissons & fruits de mer",
            "icon_name": "Fish",
            "description": (
                "Bar, capitaine, brochet, bossu, dorade, crevettes, "
                "crustacés — pêche artisanale du golfe de Guinée."
            ),
            "display_order": 30,
            "variant_axes": [
                "frais-weight-kg", "frais-conditioning",
                "frais-conservation", "frais-origin-type",
            ],
        },
        {
            "slug": "poissons-fumes",
            "name": "Poissons fumés & séchés",
            "icon_name": "Fish",
            "description": "Poissons fumés (technique traditionnelle CM), poissons séchés.",
            "display_order": 40,
            "variant_axes": ["frais-weight-kg", "frais-conditioning"],
        },
        {
            "slug": "produits-laitiers",
            "name": "Produits laitiers frais",
            "icon_name": "Milk",
            "description": (
                "Yaourts, fromages, beurre, crème, lait frais — la chaîne "
                "froid essentielle."
            ),
            "display_order": 50,
            "variant_axes": [
                "frais-volume-ml", "frais-conditioning", "frais-conservation",
            ],
        },
        {
            "slug": "fruits-legumes-frais",
            "name": "Fruits & légumes frais",
            "icon_name": "Carrot",
            "description": (
                "Fruits (mangues, papayes, ananas, bananes, avocats), légumes "
                "(tomates, oignons, aubergines, feuilles ndolè, kwem)."
            ),
            "display_order": 60,
            "variant_axes": [
                "frais-weight-kg", "frais-conditioning", "frais-origin-type",
            ],
        },
        {
            "slug": "surgeles",
            "name": "Surgelés",
            "icon_name": "Snowflake",
            "description": "Poissons surgelés, légumes surgelés, plats préparés surgelés, glaces.",
            "display_order": 70,
            "variant_axes": [
                "frais-weight-kg", "frais-conditioning",
            ],
        },
        {
            "slug": "plats-prepares",
            "name": "Plats préparés",
            "icon_name": "Utensils",
            "description": "Ndolè, poulet DG, koki, poisson braisé — plats prêts à consommer.",
            "display_order": 80,
            "variant_axes": ["frais-weight-kg", "frais-conditioning"],
        },
        {
            "slug": "oeufs",
            "name": "Œufs",
            "icon_name": "Egg",
            "description": "Œufs de poule, cailles, œufs bio.",
            "display_order": 90,
            "variant_axes": ["frais-conditioning", "frais-origin-type"],
        },
        {
            "slug": "patisserie-fraiche",
            "name": "Pâtisserie fraîche & pains",
            "icon_name": "Cookie",
            "description": "Pain frais, viennoiseries, pâtisseries, gâteaux frais.",
            "display_order": 100,
            "variant_axes": ["frais-weight-kg", "frais-conditioning"],
        },
        {
            "slug": "cuisine-monde",
            "name": "Cuisine du monde (frais)",
            "icon_name": "Utensils",
            "description": "Sushi, plats asiatiques, méditerranéens frais.",
            "display_order": 110,
            "variant_axes": ["frais-weight-kg", "frais-conditioning"],
        },
    ],
    "brands": [
        # Produits laitiers
        {"name": "Nestlé", "country": "Suisse"},
        {"name": "Danone", "country": "France"},
        {"name": "Yoplait", "country": "France"},
        {"name": "President", "country": "France"},
        {"name": "Bel (Vache qui rit)", "country": "France"},
        {"name": "Camerlait", "country": "Cameroun"},
        {"name": "Nutrilait", "country": "Cameroun"},
        # Volailles & viandes
        {"name": "Doux", "country": "France"},
        {"name": "Le Gaulois", "country": "France"},
        {"name": "SODEPA", "country": "Cameroun"},
        # Pêche
        {"name": "Congelcam", "country": "Cameroun"},
        {"name": "MIDACAM", "country": "Cameroun"},
        # Distributeurs locaux
        {"name": "Rachdorfood", "country": "Cameroun"},
        {"name": "Market Express", "country": "Cameroun"},
        {"name": "Fresh Direct CM", "country": "Cameroun"},
        # Fromages & épicerie fraîche
        {"name": "Kiri", "country": "France"},
        {"name": "Emmental", "country": "France"},
        # Surgelés
        {"name": "Findus", "country": "France"},
        {"name": "Picard", "country": "France"},
        # Boulangerie industrielle
        {"name": "La Pasta", "country": "Cameroun"},
    ],
    "attributes": [
        # AXES
        {"slug": "frais-weight-kg", "name": "Poids",
         "role": "AXE", "values_type": "NUMBER", "unit": "kg", "values": []},
        {"slug": "frais-volume-ml", "name": "Volume",
         "role": "AXE", "values_type": "NUMBER", "unit": "mL", "values": []},
        {"slug": "frais-conditioning", "name": "Conditionnement",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Barquette", "Sachet sous vide", "Pièce entière",
             "Filet", "Bocal", "Bouteille", "Pot", "Pack de 6",
             "Pack de 12", "Format familial", "Portion individuelle",
             "En vrac (poids demandé)",
         ]},
        {"slug": "frais-conservation", "name": "Mode de conservation",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Frais (0-4°C)", "Surgelé (-18°C)",
             "Congelé (-24°C)", "Fumé", "Séché", "Sous vide",
         ]},
        # SPECS
        {"slug": "frais-dlc", "name": "Date limite de consommation",
         "role": "SPEC", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "frais-freshness", "name": "Fraîcheur",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "24h maximum", "48h maximum", "3-5 jours",
             "7 jours", "15 jours", "1 mois", "3 mois", "6 mois",
         ]},
        {"slug": "frais-origin-type", "name": "Origine",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Local Cameroun", "Régional Afrique",
             "Importé Europe", "Importé Asie", "Importé Amérique",
         ]},
        {"slug": "frais-cut-type", "name": "Type de découpe",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Entier", "Filet", "Cuisse", "Poitrine",
             "Aile", "Émincé", "Haché", "En morceaux",
             "Steak", "Rôti", "Côtelette",
         ]},
        {"slug": "frais-halal", "name": "Halal",
         "role": "SPEC", "values_type": "BOOL", "unit": "", "values": []},
        {"slug": "frais-organic", "name": "Bio",
         "role": "SPEC", "values_type": "BOOL", "unit": "", "values": []},
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# 👔 MODE HOMME
# ═══════════════════════════════════════════════════════════════════════════

HOMME = {
    "name": "Mode Homme",
    "icon_name": "Shirt",
    "description": (
        "Vêtements, chaussures et accessoires homme. Tenues traditionnelles "
        "africaines (boubou, agbada, chemise africaine en wax). Créateurs "
        "camerounais (Stradel's Couture, Wazal, Soh Cameroun). Costumes et "
        "prêt-à-porter international."
    ),
    "display_order": 55,
    "children": [
        # ── Vêtements de base ──
        {
            "slug": "chemises",
            "name": "Chemises",
            "icon_name": "Shirt",
            "description": "Chemises business, casual, à manches courtes, longues.",
            "display_order": 10,
            "variant_axes": [
                "homme-size", "homme-color", "homme-material",
                "homme-cut", "homme-sleeve-type",
            ],
        },
        {
            "slug": "tshirts-polos",
            "name": "T-shirts & polos",
            "icon_name": "Shirt",
            "description": "T-shirts basiques, polos, tank tops, sweat-shirts.",
            "display_order": 20,
            "variant_axes": ["homme-size", "homme-color", "homme-material", "homme-neckline"],
        },
        {
            "slug": "pantalons-jeans-homme",
            "name": "Pantalons & jeans",
            "icon_name": "Shirt",
            "description": "Jeans (slim, regular, bootcut), chinos, pantalons tailleur, joggings.",
            "display_order": 30,
            "variant_axes": ["homme-size", "homme-color", "homme-material", "homme-cut"],
        },
        {
            "slug": "shorts-bermudas",
            "name": "Shorts & bermudas",
            "icon_name": "Shirt",
            "description": "Shorts, bermudas, shorts de bain.",
            "display_order": 40,
            "variant_axes": ["homme-size", "homme-color", "homme-material"],
        },
        {
            "slug": "costumes-vestes-homme",
            "name": "Costumes, vestes & blazers",
            "icon_name": "Briefcase",
            "description": "Costumes 2 pièces, 3 pièces, blazers, vestes, smokings.",
            "display_order": 50,
            "variant_axes": ["homme-size", "homme-color", "homme-material", "homme-cut"],
        },
        {
            "slug": "manteaux-blousons",
            "name": "Manteaux & blousons",
            "icon_name": "Shirt",
            "description": "Blousons, doudounes, imperméables, cardigans, pulls.",
            "display_order": 60,
            "variant_axes": ["homme-size", "homme-color", "homme-material", "homme-season"],
        },
        # ── Traditionnelles ──
        {
            "slug": "traditionnelles-homme",
            "name": "Tenues traditionnelles africaines",
            "icon_name": "Palette",
            "description": (
                "Boubou, agbada, dashiki, chemise africaine, bazin riche, "
                "wax masculin, toghu (Ndop) — patrimoine camerounais et "
                "africain."
            ),
            "display_order": 70,
            "variant_axes": [
                "homme-size", "homme-color", "homme-material",
                "homme-pattern",
            ],
        },
        # ── Sport ──
        {
            "slug": "sport-homme",
            "name": "Sport homme",
            "icon_name": "Dumbbell",
            "description": "Tenues de sport, joggings, tenues football, fitness.",
            "display_order": 80,
            "variant_axes": ["homme-size", "homme-color"],
        },
        # ── Sous-vêtements ──
        {
            "slug": "sous-vetements",
            "name": "Sous-vêtements & nuit",
            "icon_name": "Shirt",
            "description": "Boxers, slips, tricots, pyjamas, robes de chambre.",
            "display_order": 90,
            "variant_axes": ["homme-size", "homme-color", "homme-material"],
        },
        {
            "slug": "chaussettes",
            "name": "Chaussettes & bas",
            "icon_name": "Footprints",
            "description": "Chaussettes de ville, sport, invisibles.",
            "display_order": 100,
            "variant_axes": ["homme-size", "homme-color"],
        },
        # ── Uniformes ──
        {
            "slug": "uniformes-travail-homme",
            "name": "Uniformes & tenues de travail",
            "icon_name": "Briefcase",
            "description": "Bleus de travail, uniformes, tenues professionnelles.",
            "display_order": 110,
            "variant_axes": ["homme-size", "homme-color", "homme-material"],
        },
        # ── ACCESSOIRES ──
        {
            "slug": "sacs-homme",
            "name": "Sacs & bagagerie",
            "icon_name": "ShoppingBag",
            "description": "Sacs à main, portefeuilles, sacs à dos, sacs de voyage, mallettes.",
            "display_order": 120,
            "variant_axes": ["homme-color", "homme-material"],
        },
        {
            "slug": "ceintures-homme",
            "name": "Ceintures",
            "icon_name": "Circle",
            "description": "Ceintures cuir, tressées, avec boucle décorative.",
            "display_order": 130,
            "variant_axes": ["homme-color", "homme-material"],
        },
        {
            "slug": "cravates-noeuds",
            "name": "Cravates & nœuds papillons",
            "icon_name": "Shirt",
            "description": "Cravates, nœuds papillons, pochettes de costume.",
            "display_order": 140,
            "variant_axes": ["homme-color", "homme-material", "homme-pattern"],
        },
        {
            "slug": "chapeaux-casquettes",
            "name": "Chapeaux & casquettes",
            "icon_name": "Circle",
            "description": "Casquettes, chapeaux, bérets, bonnets.",
            "display_order": 150,
            "variant_axes": ["homme-color", "homme-material"],
        },
        {
            "slug": "lunettes-homme",
            "name": "Lunettes de soleil",
            "icon_name": "Sun",
            "description": "Lunettes de soleil, montures optiques.",
            "display_order": 160,
            "variant_axes": ["homme-color"],
        },
        {
            "slug": "montres-homme",
            "name": "Montres hommes",
            "icon_name": "Clock",
            "description": "Montres à quartz, automatiques, connectées, chronographes.",
            "display_order": 170,
            "variant_axes": ["homme-color", "homme-material"],
        },
        {
            "slug": "bijoux-homme",
            "name": "Bijoux homme",
            "icon_name": "Gem",
            "description": "Bracelets, colliers, bagues, chaînes, boutons de manchette.",
            "display_order": 180,
            "variant_axes": ["homme-color", "homme-material"],
        },
    ],
    "brands": [
        # Fast fashion
        {"name": "Zara Man", "country": "Espagne"},
        {"name": "H&M Man", "country": "Suède"},
        {"name": "Mango Man", "country": "Espagne"},
        {"name": "Uniqlo", "country": "Japon"},
        {"name": "DeFacto", "country": "Turquie"},
        {"name": "Celio", "country": "France"},
        {"name": "Jack & Jones", "country": "Danemark"},
        # Jeans
        {"name": "Levi's", "country": "États-Unis"},
        {"name": "Wrangler", "country": "États-Unis"},
        {"name": "Diesel", "country": "Italie"},
        {"name": "Lee", "country": "États-Unis"},
        # Sport & streetwear
        {"name": "Nike", "country": "États-Unis"},
        {"name": "Adidas", "country": "Allemagne"},
        {"name": "Puma", "country": "Allemagne"},
        {"name": "Lacoste", "country": "France"},
        {"name": "Fred Perry", "country": "Royaume-Uni"},
        {"name": "Ralph Lauren", "country": "États-Unis"},
        # Haut de gamme
        {"name": "Hugo Boss", "country": "Allemagne"},
        {"name": "Tommy Hilfiger", "country": "États-Unis"},
        {"name": "Calvin Klein", "country": "États-Unis"},
        {"name": "Armani", "country": "Italie"},
        {"name": "Timberland", "country": "États-Unis"},
        # Wax
        {"name": "Vlisco Homme", "country": "Pays-Bas"},
        {"name": "Uniwax Homme", "country": "Côte d'Ivoire"},
        # Créateurs camerounais
        {"name": "Stradel's Couture", "country": "Cameroun"},
        {"name": "Wazal", "country": "Cameroun"},
        {"name": "Soh Cameroun", "country": "Cameroun"},
        {"name": "Patrick Soh", "country": "Cameroun"},
        {"name": "Imane Ayissi Homme", "country": "Cameroun"},
    ],
    "attributes": [
        # AXES
        {"slug": "homme-size", "name": "Taille",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL", "6XL",
             "36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56",
             "Sur mesure",
         ]},
        {"slug": "homme-color", "name": "Couleur",
         "role": "AXE", "values_type": "COLORDICT", "unit": "", "values": []},
        {"slug": "homme-material", "name": "Matière / tissu",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             # Traditionnels africains
             "Wax", "Wax Vlisco", "Pagne", "Bazin Riche", "Toghu (Ndop)",
             "Dashiki",
             # Classiques
             "Coton", "Jean / denim", "Lin", "Polyester", "Laine",
             "Cachemire", "Soie", "Velours côtelé", "Cuir", "Simili cuir",
             "Nylon", "Polaire", "Molleton",
         ]},
        {"slug": "homme-cut", "name": "Coupe",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Slim", "Skinny", "Regular", "Straight",
             "Ample / Relaxed", "Ajusté", "Bootcut", "Loose fit",
             "Oversize",
         ]},
        {"slug": "homme-pattern", "name": "Motif",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Uni", "Rayé", "Carreaux (Vichy)", "Prince de Galles",
             "Imprimé", "Camouflage", "Ethnique wax", "Pied-de-poule",
             "À pois",
         ]},
        {"slug": "homme-sleeve-type", "name": "Manches",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Manches courtes", "Manches longues", "3/4",
             "Sans manches", "Amovibles",
         ]},
        {"slug": "homme-neckline", "name": "Encolure",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Col rond", "Col V", "Col polo", "Col chemise",
             "Col Mao", "Col roulé", "Col claudine",
         ]},
        # SPECS
        {"slug": "homme-occasion", "name": "Occasion",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Quotidien", "Business / bureau", "Soirée",
             "Cérémonie / mariage", "Sport", "Plage",
             "Fête traditionnelle", "Deuil",
         ]},
        {"slug": "homme-season", "name": "Saison",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Toutes saisons", "Saison chaude", "Saison des pluies",
             "Harmattan", "Été", "Hiver",
         ]},
    ],
}

# ═══════════════════════════════════════════════════════════════════════════
# 👟 CHAUSSURES
# ═══════════════════════════════════════════════════════════════════════════

SHOES = {
    "name": "Chaussures",
    "icon_name": "Footprints",
    "description": (
        "Chaussures pour femme, homme, enfant. Baskets, sandales, mocassins, "
        "chaussures de ville (Oxford, Derby, Richelieu), talons, chaussures "
        "de sport, traditionnelles. Pointures EU 35-46."
    ),
    "display_order": 57,
    "children": [
        # ── Femme ──
        {
            "slug": "baskets-femme",
            "name": "Baskets & sneakers femme",
            "icon_name": "Footprints",
            "description": "Sneakers, running, tennis, baskets fashion.",
            "display_order": 10,
            "variant_axes": [
                "shoes-size-eu", "shoes-color",
                "shoes-material", "shoes-heel-type",
            ],
        },
        {
            "slug": "talons-escarpins",
            "name": "Talons & escarpins",
            "icon_name": "Footprints",
            "description": "Escarpins, talons hauts, talons aiguilles, plateformes.",
            "display_order": 20,
            "variant_axes": [
                "shoes-size-eu", "shoes-color",
                "shoes-material", "shoes-heel-height",
            ],
        },
        {
            "slug": "ballerines-mocassins-femme",
            "name": "Ballerines & mocassins femme",
            "icon_name": "Footprints",
            "description": "Ballerines, mocassins, derbies féminins, slippers.",
            "display_order": 30,
            "variant_axes": ["shoes-size-eu", "shoes-color", "shoes-material"],
        },
        {
            "slug": "sandales-femme",
            "name": "Sandales & tongs femme",
            "icon_name": "Footprints",
            "description": "Sandales plates, à talons, tongs, nu-pieds.",
            "display_order": 40,
            "variant_axes": [
                "shoes-size-eu", "shoes-color", "shoes-material", "shoes-heel-height",
            ],
        },
        {
            "slug": "bottes-femme",
            "name": "Bottes & bottines femme",
            "icon_name": "Footprints",
            "description": "Bottines, bottes hautes, cuissardes, snow boots.",
            "display_order": 50,
            "variant_axes": ["shoes-size-eu", "shoes-color", "shoes-material"],
        },
        # ── Homme ──
        {
            "slug": "baskets-homme",
            "name": "Baskets & sneakers homme",
            "icon_name": "Footprints",
            "description": "Sneakers, running, tennis, streetwear.",
            "display_order": 60,
            "variant_axes": ["shoes-size-eu", "shoes-color", "shoes-material"],
        },
        {
            "slug": "chaussures-ville-homme",
            "name": "Chaussures de ville homme",
            "icon_name": "Footprints",
            "description": "Oxford, Derby, Richelieu, brogues, monk-strap.",
            "display_order": 70,
            "variant_axes": ["shoes-size-eu", "shoes-color", "shoes-material", "shoes-style"],
        },
        {
            "slug": "mocassins-homme",
            "name": "Mocassins & chaussures bateau",
            "icon_name": "Footprints",
            "description": "Mocassins, loafers, chaussures bateau, drivers.",
            "display_order": 80,
            "variant_axes": ["shoes-size-eu", "shoes-color", "shoes-material"],
        },
        {
            "slug": "sandales-homme",
            "name": "Sandales & tongs homme",
            "icon_name": "Footprints",
            "description": "Sandales, tongs, claquettes.",
            "display_order": 90,
            "variant_axes": ["shoes-size-eu", "shoes-color", "shoes-material"],
        },
        {
            "slug": "bottes-homme",
            "name": "Boots & bottes homme",
            "icon_name": "Footprints",
            "description": "Chelsea boots, chukka boots, boots de travail.",
            "display_order": 100,
            "variant_axes": ["shoes-size-eu", "shoes-color", "shoes-material"],
        },
        # ── Sport ──
        {
            "slug": "chaussures-sport",
            "name": "Chaussures de sport spécialisées",
            "icon_name": "Dumbbell",
            "description": "Football, basket, fitness, randonnée, cyclisme.",
            "display_order": 110,
            "variant_axes": [
                "shoes-size-eu", "shoes-color", "shoes-gender", "shoes-sport-discipline",
            ],
        },
        # ── Enfants ──
        {
            "slug": "chaussures-enfants",
            "name": "Chaussures enfants",
            "icon_name": "Baby",
            "description": "Chaussures bébé, garçon, fille, ados.",
            "display_order": 120,
            "variant_axes": ["shoes-size-eu", "shoes-color", "shoes-gender"],
        },
        # ── Traditionnelles / Made in CM ──
        {
            "slug": "traditionnelles-shoes",
            "name": "Chaussures traditionnelles",
            "icon_name": "Palette",
            "description": (
                "Babouches, sandales en cuir local, chaussures perlées "
                "cérémonielles, mules traditionnelles."
            ),
            "display_order": 130,
            "variant_axes": ["shoes-size-eu", "shoes-color", "shoes-material"],
        },
        # ── Accessoires ──
        {
            "slug": "accessoires-chaussures",
            "name": "Accessoires chaussures",
            "icon_name": "Package",
            "description": "Semelles, lacets, cirage, embauchoirs, chausse-pied.",
            "display_order": 140,
            "variant_axes": ["shoes-color"],
        },
    ],
    "brands": [
        # Sport
        {"name": "Nike", "country": "États-Unis"},
        {"name": "Adidas", "country": "Allemagne"},
        {"name": "Puma", "country": "Allemagne"},
        {"name": "Reebok", "country": "États-Unis"},
        {"name": "New Balance", "country": "États-Unis"},
        {"name": "Converse", "country": "États-Unis"},
        {"name": "Vans", "country": "États-Unis"},
        {"name": "Under Armour", "country": "États-Unis"},
        {"name": "Asics", "country": "Japon"},
        {"name": "Mizuno", "country": "Japon"},
        # Ville & lifestyle
        {"name": "Timberland", "country": "États-Unis"},
        {"name": "Clarks", "country": "Royaume-Uni"},
        {"name": "Dr. Martens", "country": "Royaume-Uni"},
        {"name": "Lacoste", "country": "France"},
        {"name": "Fila", "country": "Italie"},
        # Luxe
        {"name": "Louboutin", "country": "France"},
        {"name": "Versace", "country": "Italie"},
        {"name": "Gucci", "country": "Italie"},
        # Femme mode
        {"name": "Aldo", "country": "Canada"},
        {"name": "Steve Madden", "country": "États-Unis"},
        {"name": "Bata", "country": "Suisse"},  # Très présent en Afrique
        # Sandales
        {"name": "Havaianas", "country": "Brésil"},
        {"name": "Reef", "country": "États-Unis"},
        {"name": "Birkenstock", "country": "Allemagne"},
        # Africa
        {"name": "Enda", "country": "Kenya"},
    ],
    "attributes": [
        # AXES
        {"slug": "shoes-size-eu", "name": "Pointure (EU)",
         "role": "AXE", "values_type": "SELECT", "unit": "EU",
         "values": [
             "EU 20", "EU 21", "EU 22", "EU 23", "EU 24", "EU 25",
             "EU 26", "EU 27", "EU 28", "EU 29", "EU 30", "EU 31",
             "EU 32", "EU 33", "EU 34", "EU 35", "EU 36", "EU 37",
             "EU 38", "EU 39", "EU 40", "EU 41", "EU 42", "EU 43",
             "EU 44", "EU 45", "EU 46", "EU 47", "EU 48", "EU 49",
         ]},
        {"slug": "shoes-color", "name": "Couleur",
         "role": "AXE", "values_type": "COLORDICT", "unit": "", "values": []},
        {"slug": "shoes-material", "name": "Matière",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Cuir véritable", "Cuir verni", "Cuir suédé", "Nubuck",
             "Simili cuir / synthétique", "Toile / canvas",
             "Daim", "Caoutchouc", "Textile mesh", "Corde",
             "Raphia", "Perles",
         ]},
        {"slug": "shoes-heel-type", "name": "Type de talon",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Plat", "Petit talon", "Talon moyen",
             "Talon haut", "Talon aiguille", "Talon carré",
             "Talon compensé", "Plateforme", "Talon bloc",
         ]},
        {"slug": "shoes-heel-height", "name": "Hauteur du talon",
         "role": "AXE", "values_type": "NUMBER", "unit": "cm", "values": []},
        {"slug": "shoes-style", "name": "Style / modèle",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Oxford", "Derby", "Richelieu", "Brogue",
             "Monk-strap", "Loafer", "Chelsea Boot",
             "Chukka Boot", "Sneaker", "Espadrille",
             "Mocassin", "Slipper",
         ]},
        {"slug": "shoes-sport-discipline", "name": "Discipline sportive",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Football", "Basketball", "Running",
             "Tennis", "Fitness / Cross-training",
             "Randonnée", "Cyclisme", "Danse", "Volley-ball", "Skate",
         ]},
        # SPECS
        {"slug": "shoes-gender", "name": "Genre",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": ["Femme", "Homme", "Enfant garçon", "Enfant fille", "Bébé", "Mixte / Unisex"],
        },
        {"slug": "shoes-closure", "name": "Type de fermeture",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Lacets", "Scratch (Velcro)", "Boucle",
             "Zip", "À enfiler (slip-on)", "Élastique",
         ]},
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# 🏠 MAISON & DÉCO
# ═══════════════════════════════════════════════════════════════════════════

MAISON = {
    "name": "Maison & Déco",
    "icon_name": "Home",
    "description": (
        "Meubles (canapé rotin, salon d'angle très populaires au CM), literie, "
        "matelas, moustiquaires (essentiel), décoration, ustensiles de cuisine "
        "(marmites), rangement, luminaires. Magasins CM : Orca, Batirama, "
        "Lifemate, Vision Confort."
    ),
    "display_order": 65,
    "children": [
        # ── Meubles ──
        {
            "slug": "meubles-salon",
            "name": "Meubles de salon",
            "icon_name": "Sofa",
            "description": (
                "Canapés, canapés d'angle (très demandés au CM), fauteuils, "
                "salons en rotin, tables basses, meubles TV."
            ),
            "display_order": 10,
            "variant_axes": [
                "maison-dimensions", "maison-material",
                "maison-color", "maison-style",
            ],
        },
        {
            "slug": "meubles-chambre",
            "name": "Meubles chambre à coucher",
            "icon_name": "Bed",
            "description": "Lits, sommiers, têtes de lit, tables de chevet, armoires, commodes.",
            "display_order": 20,
            "variant_axes": [
                "maison-dimensions", "maison-material", "maison-color",
            ],
        },
        {
            "slug": "meubles-salle-manger",
            "name": "Meubles salle à manger",
            "icon_name": "Utensils",
            "description": "Tables à manger, chaises, buffets, vaisseliers.",
            "display_order": 30,
            "variant_axes": [
                "maison-dimensions", "maison-material", "maison-color",
            ],
        },
        {
            "slug": "meubles-bureau",
            "name": "Meubles de bureau",
            "icon_name": "Briefcase",
            "description": "Bureaux, chaises de bureau ergonomiques, bibliothèques, étagères.",
            "display_order": 40,
            "variant_axes": [
                "maison-dimensions", "maison-material", "maison-color",
            ],
        },
        {
            "slug": "meubles-enfant",
            "name": "Meubles enfant",
            "icon_name": "Baby",
            "description": "Lits enfants, lits superposés, bureaux enfants.",
            "display_order": 50,
            "variant_axes": ["maison-dimensions", "maison-color"],
        },
        # ── Literie ──
        {
            "slug": "matelas",
            "name": "Matelas",
            "icon_name": "Bed",
            "description": (
                "Matelas ressorts, mousse, mémoire de forme, latex. Marques "
                "locales (Matelas du Cameroun, Richbond)."
            ),
            "display_order": 60,
            "variant_axes": [
                "maison-dimensions", "maison-mattress-firmness",
                "maison-mattress-type",
            ],
        },
        {
            "slug": "literie-linge",
            "name": "Draps, couettes & oreillers",
            "icon_name": "Bed",
            "description": "Draps, housses de couette, taies, couettes, oreillers.",
            "display_order": 70,
            "variant_axes": ["maison-dimensions", "maison-color", "maison-material"],
        },
        {
            "slug": "moustiquaires",
            "name": "Moustiquaires",
            "icon_name": "Bed",
            "description": (
                "Moustiquaires imprégnées, sur lit, sur porte, sur fenêtre — "
                "protection essentielle contre le paludisme."
            ),
            "display_order": 80,
            "variant_axes": ["maison-dimensions", "maison-color"],
        },
        # ── Décoration ──
        {
            "slug": "decoration-murale",
            "name": "Décoration murale",
            "icon_name": "Palette",
            "description": "Tableaux, cadres, miroirs, stickers, papier peint.",
            "display_order": 90,
            "variant_axes": ["maison-dimensions", "maison-color", "maison-style"],
        },
        {
            "slug": "rideaux-stores",
            "name": "Rideaux, stores & tapis",
            "icon_name": "Palette",
            "description": "Rideaux, voilages, stores, tapis, moquettes.",
            "display_order": 100,
            "variant_axes": [
                "maison-dimensions", "maison-color", "maison-material", "maison-style",
            ],
        },
        {
            "slug": "objets-deco",
            "name": "Objets décoratifs",
            "icon_name": "Sparkles",
            "description": "Vases, statuettes, bougeoirs, horloges murales, plantes.",
            "display_order": 110,
            "variant_axes": ["maison-color", "maison-material", "maison-style"],
        },
        # ── Luminaires ──
        {
            "slug": "luminaires",
            "name": "Luminaires & éclairage",
            "icon_name": "Lightbulb",
            "description": "Plafonniers, suspensions, lampes de chevet, lampadaires, LED.",
            "display_order": 120,
            "variant_axes": ["maison-color", "maison-material", "maison-style"],
        },
        # ── Cuisine ──
        {
            "slug": "ustensiles-cuisine",
            "name": "Ustensiles de cuisine",
            "icon_name": "Utensils",
            "description": (
                "Casseroles, poêles, marmites en fonte (traditionnelles CM), "
                "batteries de cuisine, couteaux, planches."
            ),
            "display_order": 130,
            "variant_axes": ["maison-material", "maison-color"],
        },
        {
            "slug": "vaisselle",
            "name": "Vaisselle & arts de la table",
            "icon_name": "Utensils",
            "description": "Assiettes, verres, couverts, plats de service.",
            "display_order": 140,
            "variant_axes": ["maison-color", "maison-material"],
        },
        # ── Salle de bain ──
        {
            "slug": "salle-bain",
            "name": "Salle de bain",
            "icon_name": "Bath",
            "description": "Rideaux de douche, tapis, porte-savons, distributeurs, robinetterie.",
            "display_order": 150,
            "variant_axes": ["maison-color", "maison-material"],
        },
        # ── Rangement ──
        {
            "slug": "rangement",
            "name": "Rangement & organisation",
            "icon_name": "Package",
            "description": "Étagères, boîtes, paniers, penderies, séparateurs.",
            "display_order": 160,
            "variant_axes": ["maison-dimensions", "maison-color", "maison-material"],
        },
        # ── Jardin & extérieur ──
        {
            "slug": "jardin-exterieur",
            "name": "Jardin & extérieur",
            "icon_name": "TreePine",
            "description": "Mobilier de jardin, parasols, barbecues, jardinières.",
            "display_order": 170,
            "variant_axes": ["maison-dimensions", "maison-color", "maison-material"],
        },
        # ── Bricolage ──
        {
            "slug": "bricolage-outillage",
            "name": "Bricolage & outillage",
            "icon_name": "Wrench",
            "description": "Outils manuels, outils électriques, quincaillerie, peintures.",
            "display_order": 180,
            "variant_axes": ["maison-color"],
        },
        # ── Linge maison ──
        {
            "slug": "linge-maison",
            "name": "Linge de maison",
            "icon_name": "Shirt",
            "description": "Serviettes de bain, torchons, nappes, sets de table.",
            "display_order": 190,
            "variant_axes": ["maison-color", "maison-material", "maison-dimensions"],
        },
    ],
    "brands": [
        # Mobilier internationaux
        {"name": "IKEA", "country": "Suède"},
        {"name": "Conforama", "country": "France"},
        {"name": "But", "country": "France"},
        # Mobilier & literie CM
        {"name": "Orca Déco", "country": "Cameroun"},
        {"name": "Batirama", "country": "Cameroun"},
        {"name": "Arno Meubles", "country": "Cameroun"},
        {"name": "Tsekenis", "country": "Cameroun"},
        {"name": "Lifemate", "country": "Cameroun"},
        {"name": "Vision Confort", "country": "Cameroun"},
        {"name": "Matelas du Cameroun", "country": "Cameroun"},
        {"name": "Camaltra", "country": "Cameroun"},
        # Literie
        {"name": "Richbond", "country": "Maroc"},
        {"name": "Simmons", "country": "États-Unis"},
        {"name": "Dunlopillo", "country": "France"},
        # Ustensiles
        {"name": "Tefal", "country": "France"},
        {"name": "Le Creuset", "country": "France"},
        {"name": "Prestige", "country": "Inde"},
        # Décoration
        {"name": "Maisons du Monde", "country": "France"},
        # Bricolage
        {"name": "Bosch Outillage", "country": "Allemagne"},
        {"name": "Black & Decker", "country": "États-Unis"},
        {"name": "Stanley", "country": "États-Unis"},
        {"name": "Makita", "country": "Japon"},
        # Moustiquaires
        {"name": "PermaNet", "country": "Vietnam"},
        {"name": "Olyset", "country": "Japon"},
    ],
    "attributes": [
        # AXES
        {"slug": "maison-dimensions", "name": "Dimensions (L×l×h)",
         "role": "AXE", "values_type": "TEXT", "unit": "cm", "values": []},
        {"slug": "maison-material", "name": "Matière",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Bois massif", "Bois panneaux (MDF, aggloméré)",
             "Rotin", "Bambou", "Métal", "Fer forgé", "Aluminium",
             "Plastique", "Verre", "Tissu", "Cuir véritable", "Simili cuir",
             "Céramique", "Terre cuite", "Inox", "Fonte",
             "Bois ébène", "Bois padouk", "Bois wengué", "Bois ayous",
         ]},
        {"slug": "maison-color", "name": "Couleur",
         "role": "AXE", "values_type": "COLORDICT", "unit": "", "values": []},
        {"slug": "maison-style", "name": "Style",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Moderne", "Contemporain", "Classique", "Traditionnel",
             "Rustique", "Industriel", "Scandinave", "Bohème",
             "Ethnique africain", "Vintage", "Minimaliste",
             "Colonial", "Baroque",
         ]},
        {"slug": "maison-mattress-firmness", "name": "Fermeté matelas",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": ["Souple", "Mi-ferme", "Ferme", "Très ferme"]},
        {"slug": "maison-mattress-type", "name": "Type de matelas",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Mousse", "Mousse haute densité", "Mousse à mémoire de forme",
             "Ressorts biconiques", "Ressorts ensachés", "Latex", "Hybride",
         ]},
        # SPECS
        {"slug": "maison-assembly", "name": "Montage",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": ["Livré monté", "À monter soi-même", "Montage sur demande"]},
        {"slug": "maison-warranty", "name": "Garantie",
         "role": "SPEC", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "maison-usage-room", "name": "Pièce cible",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Salon", "Chambre", "Salle à manger", "Cuisine",
             "Salle de bain", "Bureau", "Entrée", "Terrasse / Balcon",
             "Jardin", "Chambre enfant",
         ]},
    ],
}

# ═══════════════════════════════════════════════════════════════════════════
# 🍼 BÉBÉ & ENFANT
# ═══════════════════════════════════════════════════════════════════════════

BEBE = {
    "name": "Bébé & Enfant",
    "icon_name": "Baby",
    "description": (
        "Couches (Pampers, Huggies), alimentation (Cerelac, Blédina, Nestlé), "
        "vêtements, puériculture, jouets, soins, portes-bébé traditionnels "
        "camerounais (pagne)."
    ),
    "display_order": 70,
    "children": [
        # ── Change & hygiène ──
        {
            "slug": "couches",
            "name": "Couches",
            "icon_name": "Baby",
            "description": "Couches jetables (T1-T6), couches lavables.",
            "display_order": 10,
            "variant_axes": [
                "bebe-diaper-stage", "bebe-conditioning", "bebe-diaper-type",
            ],
        },
        {
            "slug": "lingettes",
            "name": "Lingettes & soins hygiène",
            "icon_name": "Droplet",
            "description": "Lingettes bébé, coton, sérum physiologique.",
            "display_order": 20,
            "variant_axes": ["bebe-conditioning"],
        },
        {
            "slug": "changement",
            "name": "Change & tables à langer",
            "icon_name": "Package",
            "description": "Tables à langer, matelas à langer, sacs à langer.",
            "display_order": 30,
            "variant_axes": ["bebe-color", "bebe-material"],
        },
        # ── Alimentation ──
        {
            "slug": "lait-infantile",
            "name": "Laits infantiles",
            "icon_name": "Milk",
            "description": "Laits en poudre 1er âge, 2e âge, croissance.",
            "display_order": 40,
            "variant_axes": ["bebe-age", "bebe-conditioning"],
        },
        {
            "slug": "cereales-farines",
            "name": "Céréales & farines infantiles",
            "icon_name": "Wheat",
            "description": "Cerelac, farines vitaminées, céréales bio.",
            "display_order": 50,
            "variant_axes": ["bebe-age", "bebe-conditioning"],
        },
        {
            "slug": "petits-pots",
            "name": "Petits pots & purées",
            "icon_name": "Utensils",
            "description": "Petits pots fruits, légumes, viandes, purées.",
            "display_order": 60,
            "variant_axes": ["bebe-age", "bebe-conditioning"],
        },
        {
            "slug": "biberons",
            "name": "Biberons & tétines",
            "icon_name": "Milk",
            "description": "Biberons, tétines, sucettes, brosses de nettoyage.",
            "display_order": 70,
            "variant_axes": ["bebe-conditioning", "bebe-material"],
        },
        # ── Vêtements ──
        {
            "slug": "vetements-bebe-0-24",
            "name": "Vêtements bébé (0-24 mois)",
            "icon_name": "Shirt",
            "description": "Bodies, pyjamas, ensembles bébé.",
            "display_order": 80,
            "variant_axes": ["bebe-age", "bebe-color", "bebe-material"],
        },
        {
            "slug": "vetements-enfant",
            "name": "Vêtements enfant (2-14 ans)",
            "icon_name": "Shirt",
            "description": "T-shirts, robes, pantalons, ensembles enfant.",
            "display_order": 90,
            "variant_axes": ["bebe-age", "bebe-color", "bebe-material"],
        },
        {
            "slug": "chaussures-bebe-enfant",
            "name": "Chaussures bébé & enfant",
            "icon_name": "Footprints",
            "description": "Chaussons, premiers pas, chaussures enfant.",
            "display_order": 100,
            "variant_axes": ["bebe-age", "bebe-color"],
        },
        # ── Puériculture ──
        {
            "slug": "poussettes",
            "name": "Poussettes",
            "icon_name": "Baby",
            "description": "Poussettes canne, tout-terrain, doubles, poussettes 3 en 1.",
            "display_order": 110,
            "variant_axes": ["bebe-color", "bebe-age"],
        },
        {
            "slug": "porte-bebe",
            "name": "Porte-bébés (dont pagne traditionnel)",
            "icon_name": "Baby",
            "description": (
                "Porte-bébés physiologiques, écharpes de portage, "
                "pagne traditionnel camerounais."
            ),
            "display_order": 120,
            "variant_axes": ["bebe-color", "bebe-material"],
        },
        {
            "slug": "lits-berceaux",
            "name": "Lits & berceaux",
            "icon_name": "Bed",
            "description": "Lits parapluie, berceaux, lits à barreaux, cododo.",
            "display_order": 130,
            "variant_axes": ["bebe-color", "bebe-material"],
        },
        {
            "slug": "chaises-hautes",
            "name": "Chaises hautes & transats",
            "icon_name": "Baby",
            "description": "Chaises hautes, transats, rehausseurs, cosies.",
            "display_order": 140,
            "variant_axes": ["bebe-color", "bebe-material"],
        },
        {
            "slug": "sieges-auto",
            "name": "Sièges auto",
            "icon_name": "CarFront",
            "description": "Sièges auto groupe 0+, 1, 2, 3 (0-36 kg).",
            "display_order": 150,
            "variant_axes": ["bebe-age", "bebe-color"],
        },
        # ── Jouets ──
        {
            "slug": "jouets-eveil-bebe",
            "name": "Jouets d'éveil bébé",
            "icon_name": "Puzzle",
            "description": "Hochets, mobiles, tapis d'éveil, portiques.",
            "display_order": 160,
            "variant_axes": ["bebe-age", "bebe-color"],
        },
        {
            "slug": "jouets-educatifs",
            "name": "Jouets éducatifs",
            "icon_name": "GraduationCap",
            "description": "Puzzles, jeux d'apprentissage, construction, sciences.",
            "display_order": 170,
            "variant_axes": ["bebe-age"],
        },
        {
            "slug": "poupees-peluches",
            "name": "Poupées & peluches",
            "icon_name": "Heart",
            "description": "Poupées, peluches, poupons.",
            "display_order": 180,
            "variant_axes": ["bebe-color", "bebe-age"],
        },
        {
            "slug": "jeux-plein-air",
            "name": "Jeux de plein air",
            "icon_name": "Sun",
            "description": "Trottinettes, vélos enfants, tricycles, ballons.",
            "display_order": 190,
            "variant_axes": ["bebe-age", "bebe-color"],
        },
        {
            "slug": "jeux-societe-enfant",
            "name": "Jeux de société enfant",
            "icon_name": "Puzzle",
            "description": "Jeux de plateau, jeux de cartes, jeux d'ambiance.",
            "display_order": 200,
            "variant_axes": ["bebe-age"],
        },
        # ── Soins ──
        {
            "slug": "soins-bebe",
            "name": "Soins bébé (crèmes, savons)",
            "icon_name": "Droplet",
            "description": "Crèmes hydratantes, savons doux, huiles, liniments.",
            "display_order": 210,
            "variant_axes": ["bebe-conditioning"],
        },
        {
            "slug": "sante-bebe",
            "name": "Santé & sécurité",
            "icon_name": "Heart",
            "description": "Thermomètres, mouche-bébés, aspirateurs nasaux, barrières.",
            "display_order": 220,
            "variant_axes": ["bebe-color"],
        },
    ],
    "brands": [
        # Couches
        {"name": "Pampers", "country": "États-Unis"},
        {"name": "Huggies", "country": "États-Unis"},
        {"name": "Molfix", "country": "Turquie"},
        {"name": "Bambo Nature", "country": "Danemark"},
        {"name": "Sleepy", "country": "Turquie"},
        {"name": "Aiwibi", "country": "Chine"},
        {"name": "Joya", "country": "Turquie"},
        # Alimentation
        {"name": "Nestlé Cerelac", "country": "Suisse"},
        {"name": "Nestlé Nan", "country": "Suisse"},
        {"name": "Blédina", "country": "France"},
        {"name": "Babybio", "country": "France"},
        {"name": "Hipp", "country": "Allemagne"},
        {"name": "Guigoz", "country": "France"},
        {"name": "Nutriben", "country": "Espagne"},
        # Puériculture
        {"name": "Chicco", "country": "Italie"},
        {"name": "Bébé Confort", "country": "France"},
        {"name": "Nuby", "country": "États-Unis"},
        {"name": "MAM", "country": "Autriche"},
        {"name": "Avent (Philips)", "country": "Pays-Bas"},
        {"name": "Wee Baby", "country": "Turquie"},
        {"name": "Tigex", "country": "France"},
        {"name": "Dodie", "country": "France"},
        # Jouets
        {"name": "Fisher-Price", "country": "États-Unis"},
        {"name": "Lego", "country": "Danemark"},
        {"name": "Playmobil", "country": "Allemagne"},
        {"name": "VTech", "country": "Chine"},
        {"name": "Mattel", "country": "États-Unis"},
        {"name": "Hasbro", "country": "États-Unis"},
        {"name": "Barbie (Mattel)", "country": "États-Unis"},
        # Soins bébé
        {"name": "Mustela", "country": "France"},
        {"name": "Klorane Bébé", "country": "France"},
        {"name": "Biolane", "country": "France"},
        {"name": "Johnson's Baby", "country": "États-Unis"},
        {"name": "Cotonet", "country": "France"},
    ],
    "attributes": [
        # AXES
        {"slug": "bebe-age", "name": "Âge / étape",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "0-3 mois", "3-6 mois", "6-9 mois", "9-12 mois",
             "12-18 mois", "18-24 mois",
             "2-3 ans", "3-4 ans", "4-6 ans", "6-8 ans",
             "8-10 ans", "10-12 ans", "12-14 ans",
             "1er âge (0-6 mois)", "2e âge (6-12 mois)", "Croissance (12+ mois)",
         ]},
        {"slug": "bebe-diaper-stage", "name": "Taille couches",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Nouveau-né (jusqu'à 2 kg)",
             "T1 (2-5 kg)", "T2 (3-6 kg)", "T3 (4-9 kg)",
             "T4 (7-18 kg)", "T5 (11-25 kg)", "T6 (16+ kg)",
             "Culotte T4", "Culotte T5", "Culotte T6",
         ]},
        {"slug": "bebe-diaper-type", "name": "Type de couche",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Couche jetable classique",
             "Couche culotte / pants",
             "Couche lavable",
             "Couche de nuit",
             "Couche de piscine",
         ]},
        {"slug": "bebe-color", "name": "Couleur",
         "role": "AXE", "values_type": "COLORDICT", "unit": "", "values": []},
        {"slug": "bebe-material", "name": "Matière",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Coton bio", "Coton", "Laine",
             "Polyester", "Bambou", "Cuir",
             "Plastique alimentaire", "Silicone", "Bois",
             "Wax / pagne", "Éponge",
         ]},
        {"slug": "bebe-conditioning", "name": "Conditionnement",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Unité", "Boîte", "Sachet", "Pack économique",
             "Format familial (Jumbo)", "Format voyage",
             "Pack de 3", "Pack de 6", "Pack de 12",
         ]},
        # SPECS
        {"slug": "bebe-weight-range", "name": "Tranche de poids",
         "role": "SPEC", "values_type": "TEXT", "unit": "kg", "values": []},
        {"slug": "bebe-safety-cert", "name": "Certifications sécurité",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "CE", "NF Environnement",
             "OEKO-TEX", "GOTS Bio", "R44/R129 (siège auto)",
             "Sans BPA", "Sans phtalates",
         ]},
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# ⚽ SPORT & FITNESS
# ═══════════════════════════════════════════════════════════════════════════

SPORT = {
    "name": "Sport & Fitness",
    "icon_name": "Dumbbell",
    "description": (
        "Vêtements de sport, chaussures, équipements fitness, ballons, vélos. "
        "Football roi au Cameroun — Lions Indomptables (équipementier actuel "
        "14Quatorze, historique Puma/Adidas/Le Coq/One All Sports). Fitness "
        "urbain en croissance."
    ),
    "display_order": 75,
    "children": [
        # ── Football (roi au CM) ──
        {
            "slug": "football",
            "name": "Football",
            "icon_name": "Trophy",
            "description": (
                "Maillots Lions Indomptables, ballons, chaussures à crampons, "
                "gants gardien, tenues d'équipes."
            ),
            "display_order": 10,
            "variant_axes": [
                "sport-size", "sport-color",
                "sport-team", "sport-shoe-size-eu",
            ],
        },
        # ── Autres sports collectifs ──
        {
            "slug": "basket-volley-handball",
            "name": "Basket, volley, handball",
            "icon_name": "Trophy",
            "description": "Ballons, maillots, chaussures spécialisées.",
            "display_order": 20,
            "variant_axes": ["sport-size", "sport-color", "sport-discipline"],
        },
        # ── Vêtements sport ──
        {
            "slug": "vetements-sport-femme",
            "name": "Vêtements sport femme",
            "icon_name": "Shirt",
            "description": "Brassières, leggings, débardeurs, ensembles fitness.",
            "display_order": 30,
            "variant_axes": ["sport-size", "sport-color", "sport-discipline"],
        },
        {
            "slug": "vetements-sport-homme",
            "name": "Vêtements sport homme",
            "icon_name": "Shirt",
            "description": "T-shirts, shorts, joggings, sweat-shirts.",
            "display_order": 40,
            "variant_axes": ["sport-size", "sport-color", "sport-discipline"],
        },
        # ── Chaussures sport ──
        {
            "slug": "chaussures-sport-general",
            "name": "Chaussures de sport",
            "icon_name": "Footprints",
            "description": "Sneakers, running, cross-training, tennis.",
            "display_order": 50,
            "variant_axes": [
                "sport-shoe-size-eu", "sport-color",
                "sport-discipline",
            ],
        },
        # ── Fitness ──
        {
            "slug": "fitness-musculation",
            "name": "Fitness & musculation",
            "icon_name": "Dumbbell",
            "description": (
                "Haltères, kettlebells, barres, bancs, machines, "
                "tapis, cordes à sauter, poulies."
            ),
            "display_order": 60,
            "variant_axes": [
                "sport-equipment-weight", "sport-color",
            ],
        },
        {
            "slug": "yoga-pilates",
            "name": "Yoga & Pilates",
            "icon_name": "Heart",
            "description": "Tapis, blocs, élastiques, sangles, bolsters.",
            "display_order": 70,
            "variant_axes": ["sport-color", "sport-material"],
        },
        {
            "slug": "cardio",
            "name": "Cardio",
            "icon_name": "TrendingUp",
            "description": "Tapis de course, vélos d'appartement, elliptiques, rameurs.",
            "display_order": 80,
            "variant_axes": ["sport-color"],
        },
        # ── Vélo & mobilité ──
        {
            "slug": "velos-trottinettes",
            "name": "Vélos & trottinettes",
            "icon_name": "Bike",
            "description": "VTT, vélos de ville, vélos électriques, trottinettes, skateboards.",
            "display_order": 90,
            "variant_axes": ["sport-size", "sport-color", "sport-bike-type"],
        },
        # ── Ballons & équipement collectif ──
        {
            "slug": "ballons",
            "name": "Ballons",
            "icon_name": "Trophy",
            "description": "Ballons football, basket, volley, handball, rugby.",
            "display_order": 100,
            "variant_axes": ["sport-color", "sport-discipline"],
        },
        # ── Sports outdoor ──
        {
            "slug": "randonnee-camping",
            "name": "Randonnée & camping",
            "icon_name": "TreePine",
            "description": "Tentes, sacs de couchage, sacs à dos, bâtons, gourdes.",
            "display_order": 110,
            "variant_axes": ["sport-color", "sport-size"],
        },
        {
            "slug": "sports-nautiques",
            "name": "Natation & sports nautiques",
            "icon_name": "Waves",
            "description": "Maillots, lunettes, bonnets, palmes, planches.",
            "display_order": 120,
            "variant_axes": ["sport-size", "sport-color"],
        },
        # ── Sports de combat ──
        {
            "slug": "sports-combat",
            "name": "Sports de combat",
            "icon_name": "Zap",
            "description": "Gants de boxe, sacs de frappe, protège-dents, tenues arts martiaux.",
            "display_order": 130,
            "variant_axes": ["sport-size", "sport-color"],
        },
        # ── Accessoires ──
        {
            "slug": "accessoires-sport",
            "name": "Accessoires & bagages sport",
            "icon_name": "ShoppingBag",
            "description": "Sacs de sport, gourdes, serviettes, montres sport, tracker.",
            "display_order": 140,
            "variant_axes": ["sport-color"],
        },
        {
            "slug": "nutrition-sportive",
            "name": "Nutrition sportive",
            "icon_name": "Zap",
            "description": "Protéines, BCAA, créatine, barres, boissons énergétiques.",
            "display_order": 150,
            "variant_axes": ["sport-conditioning"],
        },
    ],
    "brands": [
        # Grands sport
        {"name": "Nike Sport", "country": "États-Unis"},
        {"name": "Adidas Sport", "country": "Allemagne"},
        {"name": "Puma Sport", "country": "Allemagne"},
        {"name": "Under Armour", "country": "États-Unis"},
        {"name": "Reebok", "country": "États-Unis"},
        {"name": "New Balance", "country": "États-Unis"},
        {"name": "Asics", "country": "Japon"},
        {"name": "Umbro", "country": "Royaume-Uni"},
        {"name": "Kappa", "country": "Italie"},
        {"name": "Mizuno", "country": "Japon"},
        # Équipementiers Lions Indomptables (historiques + actuel)
        {"name": "14Quatorze (équipementier Lions actuel)", "country": "Suisse"},
        {"name": "One All Sports (Lions 2022-2024)", "country": "États-Unis"},
        {"name": "Le Coq Sportif (Lions 2019-2022)", "country": "France"},
        # Décathlon (grand distributeur)
        {"name": "Decathlon", "country": "France"},
        {"name": "Quechua (Décathlon)", "country": "France"},
        {"name": "Kalenji (Décathlon)", "country": "France"},
        {"name": "Domyos (Décathlon)", "country": "France"},
        # Ballons
        {"name": "Wilson", "country": "États-Unis"},
        {"name": "Spalding", "country": "États-Unis"},
        {"name": "Molten", "country": "Japon"},
        # Vélo
        {"name": "Giant", "country": "Taïwan"},
        {"name": "Trek", "country": "États-Unis"},
        {"name": "Btwin", "country": "France"},
        # Yoga & fitness
        {"name": "Manduka", "country": "États-Unis"},
        {"name": "Reebok Fitness", "country": "États-Unis"},
        # Nutrition
        {"name": "Optimum Nutrition", "country": "États-Unis"},
        {"name": "MyProtein", "country": "Royaume-Uni"},
        {"name": "BSN", "country": "États-Unis"},
    ],
    "attributes": [
        # AXES
        {"slug": "sport-size", "name": "Taille",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "XS", "S", "M", "L", "XL", "XXL", "XXXL",
             "Enfant 6 ans", "Enfant 8 ans", "Enfant 10 ans",
             "Enfant 12 ans", "Enfant 14 ans", "Taille unique",
         ]},
        {"slug": "sport-shoe-size-eu", "name": "Pointure (EU)",
         "role": "AXE", "values_type": "SELECT", "unit": "EU",
         "values": [
             "EU 30", "EU 32", "EU 34", "EU 36", "EU 37",
             "EU 38", "EU 39", "EU 40", "EU 41", "EU 42",
             "EU 43", "EU 44", "EU 45", "EU 46", "EU 47", "EU 48",
         ]},
        {"slug": "sport-color", "name": "Couleur",
         "role": "AXE", "values_type": "COLORDICT", "unit": "", "values": []},
        {"slug": "sport-equipment-weight", "name": "Poids équipement",
         "role": "AXE", "values_type": "NUMBER", "unit": "kg", "values": []},
        {"slug": "sport-team", "name": "Équipe",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Cameroun (Lions Indomptables)",
             "France", "Brésil", "Argentine", "Allemagne", "Espagne",
             "Italie", "Portugal", "Belgique", "Angleterre",
             "Ghana (Black Stars)", "Nigeria", "Sénégal", "Côte d'Ivoire",
             "Barcelone", "Real Madrid", "PSG", "Manchester United",
             "Chelsea", "Liverpool", "Bayern Munich",
         ]},
        {"slug": "sport-discipline", "name": "Discipline",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Football", "Basketball", "Volley-ball",
             "Handball", "Rugby", "Tennis", "Badminton",
             "Running", "Cyclisme", "Natation",
             "Fitness / Musculation", "Yoga / Pilates",
             "Boxe", "MMA", "Arts martiaux",
             "Randonnée", "Skate", "Danse",
         ]},
        {"slug": "sport-bike-type", "name": "Type de vélo",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "VTT", "Vélo de route", "Vélo de ville",
             "Vélo électrique", "BMX", "Vélo enfant",
             "Vélo pliant", "Fixie",
         ]},
        # SPECS
        {"slug": "sport-material", "name": "Matière",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Polyester technique", "Coton", "Mesh respirant",
             "Néoprène", "Caoutchouc", "Acier",
             "Aluminium", "Carbone", "Silicone", "Cuir",
         ]},
        {"slug": "sport-conditioning", "name": "Conditionnement",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": ["Unité", "Pack de 2", "Boîte", "Sachet", "Tube", "Pot"]},
        {"slug": "sport-gender", "name": "Genre",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": ["Femme", "Homme", "Enfant", "Unisex"]},
    ],
}

# ═══════════════════════════════════════════════════════════════════════════
# 📚 FOURNITURES SCOLAIRES & LIVRES
# ═══════════════════════════════════════════════════════════════════════════

LIVRES = {
    "name": "Fournitures scolaires & Livres",
    "icon_name": "BookOpen",
    "description": (
        "Manuels programmes MINEDUB / MINESEC (système bilingue FR/EN), "
        "littérature camerounaise (Guillaume Oyono Mbia, Djaili Amadou Amal), "
        "fournitures scolaires, papeterie, matériel artistique. Éditeurs "
        "principaux : CLE (Cameroun), EDICEF, Hatier, Nathan, Africa Éducation."
    ),
    "display_order": 80,
    "children": [
        # ── Fournitures scolaires ──
        {
            "slug": "cahiers-carnets",
            "name": "Cahiers & carnets",
            "icon_name": "BookOpen",
            "description": "Cahiers grand format, petit format, cahiers de textes, agendas.",
            "display_order": 10,
            "variant_axes": [
                "livres-format", "livres-pages-count",
                "livres-color", "livres-conditioning",
            ],
        },
        {
            "slug": "stylos-crayons",
            "name": "Stylos, crayons & feutres",
            "icon_name": "Pen",
            "description": "Stylos bille, plume, roller, crayons de couleur, feutres, marqueurs.",
            "display_order": 20,
            "variant_axes": ["livres-color", "livres-conditioning"],
        },
        {
            "slug": "cartables-sacs",
            "name": "Cartables & sacs à dos",
            "icon_name": "ShoppingBag",
            "description": "Cartables primaires, sacs à dos collège/lycée, trousses.",
            "display_order": 30,
            "variant_axes": ["livres-color", "livres-school-level"],
        },
        {
            "slug": "fournitures-diverses",
            "name": "Fournitures diverses",
            "icon_name": "Package",
            "description": "Règles, gommes, taille-crayons, colles, ciseaux, correcteurs.",
            "display_order": 40,
            "variant_axes": ["livres-color", "livres-conditioning"],
        },
        # ── Manuels ──
        {
            "slug": "manuels-primaire",
            "name": "Manuels scolaires primaire",
            "icon_name": "Book",
            "description": (
                "Manuels CP, CE1, CE2, CM1, CM2 (sous-système francophone / "
                "anglophone). Français, mathématiques, anglais, sciences, EMC."
            ),
            "display_order": 50,
            "variant_axes": [
                "livres-school-level", "livres-subject", "livres-language",
            ],
        },
        {
            "slug": "manuels-college",
            "name": "Manuels scolaires collège (6e-3e)",
            "icon_name": "Book",
            "description": (
                "Manuels 6e à 3e. Français, anglais, maths, physique-chimie, "
                "SVT, histoire-géo, EMC, latin, grec, langues étrangères."
            ),
            "display_order": 60,
            "variant_axes": [
                "livres-school-level", "livres-subject", "livres-language",
            ],
        },
        {
            "slug": "manuels-lycee",
            "name": "Manuels scolaires lycée (2nde-Tle)",
            "icon_name": "Book",
            "description": (
                "Manuels 2nde, 1ère, Tle par filière (S, ES, L, technique). "
                "Programmes MINESEC."
            ),
            "display_order": 70,
            "variant_axes": [
                "livres-school-level", "livres-subject", "livres-language",
            ],
        },
        {
            "slug": "manuels-superieur",
            "name": "Manuels universitaires & supérieur",
            "icon_name": "GraduationCap",
            "description": "Manuels université, prépa, BTS, DUT, écoles.",
            "display_order": 80,
            "variant_axes": ["livres-subject", "livres-language"],
        },
        {
            "slug": "parascolaire",
            "name": "Parascolaire & annales",
            "icon_name": "Book",
            "description": "Annales BEPC, Probatoire, Baccalauréat, GCE, cahiers d'exercices.",
            "display_order": 90,
            "variant_axes": [
                "livres-school-level", "livres-subject", "livres-language",
            ],
        },
        # ── Littérature ──
        {
            "slug": "litterature-camerounaise",
            "name": "Littérature camerounaise",
            "icon_name": "BookOpen",
            "description": (
                "Auteurs camerounais : Djaili Amadou Amal (Cœur du Sahel), "
                "Guillaume Oyono Mbia (Trois prétendants un mari), Ernest "
                "Alima, Severin Cecil Abega, Lucien Anya Noa."
            ),
            "display_order": 100,
            "variant_axes": ["livres-language", "livres-book-format"],
        },
        {
            "slug": "romans-fiction",
            "name": "Romans & fiction",
            "icon_name": "BookOpen",
            "description": "Romans français, anglais, policiers, science-fiction, fantasy.",
            "display_order": 110,
            "variant_axes": ["livres-language", "livres-book-format"],
        },
        {
            "slug": "livres-jeunesse",
            "name": "Livres jeunesse",
            "icon_name": "BookOpen",
            "description": "Albums, contes, romans jeunesse (Le Caméléon vert, Poucette).",
            "display_order": 120,
            "variant_axes": [
                "livres-age", "livres-language", "livres-book-format",
            ],
        },
        {
            "slug": "livres-religieux",
            "name": "Livres religieux",
            "icon_name": "BookOpen",
            "description": "Bibles, Corans, livres de prière, ouvrages spirituels.",
            "display_order": 130,
            "variant_axes": ["livres-language", "livres-book-format"],
        },
        {
            "slug": "livres-pratiques",
            "name": "Livres pratiques",
            "icon_name": "Book",
            "description": "Cuisine, développement personnel, guides, dictionnaires.",
            "display_order": 140,
            "variant_axes": ["livres-language", "livres-book-format"],
        },
        # ── Papeterie / Bureau ──
        {
            "slug": "papeterie-bureau",
            "name": "Papeterie & bureau",
            "icon_name": "Newspaper",
            "description": "Papier ramette, classeurs, enveloppes, timbres, imprimantes.",
            "display_order": 150,
            "variant_axes": ["livres-conditioning"],
        },
        # ── Matériel artistique ──
        {
            "slug": "materiel-artistique",
            "name": "Matériel artistique",
            "icon_name": "Palette",
            "description": "Peintures, pinceaux, toiles, argile, pastels, aquarelles.",
            "display_order": 160,
            "variant_axes": ["livres-color"],
        },
        # ── Calculatrices ──
        {
            "slug": "calculatrices",
            "name": "Calculatrices & instruments scientifiques",
            "icon_name": "Calculator",
            "description": "Calculatrices standard, scientifiques, graphiques, compas.",
            "display_order": 170,
            "variant_axes": ["livres-color"],
        },
    ],
    "brands": [
        # Éditeurs scolaires internationaux + Cameroun
        {"name": "CLE (Éditions Clé Cameroun)", "country": "Cameroun"},
        {"name": "EDICEF", "country": "France"},
        {"name": "Hatier", "country": "France"},
        {"name": "Hatier-ERA", "country": "France"},
        {"name": "Nathan", "country": "France"},
        {"name": "Bordas", "country": "France"},
        {"name": "Africa Éducation", "country": "Cameroun"},
        {"name": "AFREDIT", "country": "Cameroun"},
        {"name": "Éditions Clé", "country": "Cameroun"},
        {"name": "COSMOS", "country": "Cameroun"},
        {"name": "ECLOSION", "country": "Cameroun"},
        {"name": "IFRIKIYA", "country": "Cameroun"},
        {"name": "PROXIMITE", "country": "Cameroun"},
        {"name": "VALLESSE", "country": "Côte d'Ivoire"},
        {"name": "NMI", "country": "Cameroun"},
        {"name": "MONDOUX", "country": "Cameroun"},
        {"name": "Hachette Livre International", "country": "France"},
        {"name": "Presses Universitaires de Yaoundé (PUY)", "country": "Cameroun"},
        # Fournitures scolaires
        {"name": "Bic", "country": "France"},
        {"name": "Stabilo", "country": "Allemagne"},
        {"name": "Faber-Castell", "country": "Allemagne"},
        {"name": "Staedtler", "country": "Allemagne"},
        {"name": "Pilot", "country": "Japon"},
        {"name": "Uni-ball", "country": "Japon"},
        {"name": "Papermate", "country": "États-Unis"},
        {"name": "Reynolds", "country": "France"},
        {"name": "Clairefontaine", "country": "France"},
        # Calculatrices
        {"name": "Casio", "country": "Japon"},
        {"name": "Texas Instruments", "country": "États-Unis"},
        {"name": "HP Calculatrices", "country": "États-Unis"},
        # Cartables
        {"name": "Tann's", "country": "France"},
        {"name": "Kipling", "country": "Belgique"},
        # Livres généralistes
        {"name": "Gallimard", "country": "France"},
        {"name": "Le Livre de Poche", "country": "France"},
        {"name": "Folio", "country": "France"},
        {"name": "HarperCollins", "country": "Royaume-Uni"},
        {"name": "Penguin Books", "country": "Royaume-Uni"},
    ],
    "attributes": [
        # AXES
        {"slug": "livres-school-level", "name": "Niveau scolaire",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             # Francophone
             "Maternelle", "CP", "CE1", "CE2", "CM1", "CM2",
             "6ème", "5ème", "4ème", "3ème",
             "2nde", "1ère", "Terminale",
             # Anglophone
             "Nursery", "Class 1", "Class 2", "Class 3",
             "Class 4", "Class 5", "Class 6",
             "Form 1", "Form 2", "Form 3", "Form 4", "Form 5",
             "Lower Sixth", "Upper Sixth",
             # Supérieur
             "Licence 1", "Licence 2", "Licence 3",
             "Master 1", "Master 2", "Doctorat",
             "BTS / DUT", "Classes préparatoires",
         ]},
        {"slug": "livres-subject", "name": "Matière",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Français", "Anglais", "Latin", "Grec", "Espagnol",
             "Allemand", "Arabe", "Langues nationales",
             "Mathématiques", "Physique-Chimie", "SVT",
             "Informatique", "Technologie",
             "Histoire", "Géographie", "Éducation à la citoyenneté",
             "Philosophie", "Économie", "Sciences économiques",
             "Religion / Éducation religieuse", "Musique",
             "Arts plastiques", "EPS",
             "Littérature", "Général",
         ]},
        {"slug": "livres-language", "name": "Langue",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Français", "English",
             "Bilingue FR/EN", "Espagnol", "Allemand",
             "Arabe", "Fulfulde", "Ewondo", "Duala", "Bassa", "Pidgin",
         ]},
        {"slug": "livres-format", "name": "Format (cahier)",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "A4 (21×29,7)", "A5 (14,8×21)", "17×22 (petit format)",
             "24×32 (grand format)", "Format Seyès", "Grands carreaux",
             "Petits carreaux", "Ligné", "Blanc / Uni", "Pointillé",
         ]},
        {"slug": "livres-color", "name": "Couleur",
         "role": "AXE", "values_type": "COLORDICT", "unit": "", "values": []},
        {"slug": "livres-book-format", "name": "Format du livre",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Broché", "Relié / cartonné", "Poche",
             "Grand format", "E-book",
             "Livre audio", "Édition illustrée",
         ]},
        {"slug": "livres-age", "name": "Âge conseillé (jeunesse)",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "0-2 ans", "3-5 ans", "6-8 ans",
             "9-12 ans", "Ado 12-15 ans", "Ado 15+",
             "Adulte", "Tout public",
         ]},
        {"slug": "livres-pages-count", "name": "Nombre de pages",
         "role": "AXE", "values_type": "NUMBER", "unit": "pages", "values": []},
        # SPECS
        {"slug": "livres-conditioning", "name": "Conditionnement",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Unité", "Pack de 2", "Pack de 5", "Pack de 10",
             "Pack de 12", "Lot scolaire complet", "Boîte", "Étui",
         ]},
        {"slug": "livres-author", "name": "Auteur",
         "role": "SPEC", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "livres-isbn", "name": "ISBN",
         "role": "SPEC", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "livres-education-system", "name": "Système éducatif",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Francophone (MINEDUB/MINESEC)",
             "Anglophone (Cameroon GCE Board)",
             "Bilingue", "Autre (français métropolitain, britannique...)",
         ]},
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# 🎨 ARTISANAT MADE IN CAMEROON
# ═══════════════════════════════════════════════════════════════════════════

ARTISANAT = {
    "name": "Artisanat Made in Cameroon",
    "icon_name": "Palette",
    "description": (
        "Patrimoine artisanal des 10 régions du Cameroun. Bronze (Noun), "
        "sculptures bois (Menoua, Littoral), poterie (Bamboutos, Nord), "
        "vannerie et raphia, perles et bijoux, tissus tissés (Toghu/Ndop), "
        "cosmétiques naturels. Certifications MINPMEESA et ANOR. "
        "Prisé de la diaspora."
    ),
    "display_order": 85,
    "children": [
        # ── Sculpture ──
        {
            "slug": "sculpture-bois",
            "name": "Sculpture sur bois",
            "icon_name": "Palette",
            "description": (
                "Masques traditionnels, statuettes, objets sculptés en ébène, "
                "wengué, ayous, padouk. Spécialité Menoua, Littoral."
            ),
            "display_order": 10,
            "variant_axes": [
                "artisanat-material", "artisanat-region",
                "artisanat-dimensions",
            ],
        },
        {
            "slug": "sculpture-bronze",
            "name": "Sculpture bronze & métaux",
            "icon_name": "Palette",
            "description": (
                "Objets en bronze (département du Noun), forge traditionnelle. "
                "Cuivre, laiton, fer forgé."
            ),
            "display_order": 20,
            "variant_axes": [
                "artisanat-material", "artisanat-region", "artisanat-dimensions",
            ],
        },
        # ── Poterie ──
        {
            "slug": "poterie",
            "name": "Poterie & céramique",
            "icon_name": "Palette",
            "description": (
                "Jarres, cruches, statuettes, bols en terre cuite. Spécialité "
                "Bamboutos (Ouest), Nord et Extrême-Nord (Kotoko, Tupuri, Massa)."
            ),
            "display_order": 30,
            "variant_axes": [
                "artisanat-material", "artisanat-region",
                "artisanat-dimensions",
            ],
        },
        # ── Vannerie ──
        {
            "slug": "vannerie-raphia",
            "name": "Vannerie & raphia",
            "icon_name": "Palette",
            "description": (
                "Paniers, chapeaux, tapis, nasses. Utilisation du raphia, "
                "bambou (Mifi, Koung-Khi), rotin."
            ),
            "display_order": 40,
            "variant_axes": [
                "artisanat-material", "artisanat-region",
                "artisanat-color", "artisanat-dimensions",
            ],
        },
        # ── Bijoux ──
        {
            "slug": "bijoux-perles",
            "name": "Bijoux & perles",
            "icon_name": "Gem",
            "description": (
                "Colliers, bracelets, boucles d'oreilles en perles colorées, "
                "coquillages, bois, cuir. Bijoux traditionnels."
            ),
            "display_order": 50,
            "variant_axes": [
                "artisanat-material", "artisanat-color", "artisanat-region",
            ],
        },
        # ── Textiles ──
        {
            "slug": "textiles-tisses",
            "name": "Textiles tissés (Toghu, pagne)",
            "icon_name": "Palette",
            "description": (
                "Toghu (Ndop) du Nord-Ouest, tissus foulbé du Nord, pagnes "
                "traditionnels, coton coloré tissé main."
            ),
            "display_order": 60,
            "variant_axes": [
                "artisanat-material", "artisanat-region",
                "artisanat-color", "artisanat-dimensions",
            ],
        },
        # ── Tabourets & meubles perlés ──
        {
            "slug": "tabourets-perles",
            "name": "Tabourets, calebasses perlés",
            "icon_name": "Palette",
            "description": (
                "Tabourets perlés, calebasses décorées, classeurs en bambou. "
                "Spécialité Hauts-plateaux (Ouest)."
            ),
            "display_order": 70,
            "variant_axes": [
                "artisanat-material", "artisanat-region", "artisanat-color",
            ],
        },
        # ── Masques ──
        {
            "slug": "masques-traditionnels",
            "name": "Masques traditionnels",
            "icon_name": "Palette",
            "description": (
                "Masques cérémoniels en bois, écorce d'arbre, cuir. Différentes "
                "ethnies (Bamiléké, Bamoun, Douala, Bakweri)."
            ),
            "display_order": 80,
            "variant_axes": [
                "artisanat-material", "artisanat-region",
                "artisanat-dimensions",
            ],
        },
        # ── Décoration ──
        {
            "slug": "objets-decoratifs-locaux",
            "name": "Objets décoratifs artisanaux",
            "icon_name": "Sparkles",
            "description": "Cadres, tableaux, miroirs, objets décoratifs faits main.",
            "display_order": 90,
            "variant_axes": [
                "artisanat-material", "artisanat-region",
                "artisanat-dimensions", "artisanat-color",
            ],
        },
        # ── Ustensiles & vaisselle ──
        {
            "slug": "ustensiles-artisanaux",
            "name": "Ustensiles & vaisselle artisanaux",
            "icon_name": "Utensils",
            "description": "Plats en bois d'ébène, cuillères sculptées, calebasses ustensiles.",
            "display_order": 100,
            "variant_axes": ["artisanat-material", "artisanat-region"],
        },
        # ── Produits du terroir ──
        {
            "slug": "produits-terroir",
            "name": "Produits du terroir",
            "icon_name": "Coffee",
            "description": (
                "Miel local, café d'origine, cacao, poivre blanc de Penja (IGP), "
                "vanille, épices — patrimoine agricole."
            ),
            "display_order": 110,
            "variant_axes": [
                "artisanat-region", "artisanat-conditioning",
            ],
        },
        # ── Cosmétiques ──
        {
            "slug": "cosmetiques-artisanaux",
            "name": "Cosmétiques naturels artisanaux",
            "icon_name": "Sparkles",
            "description": (
                "Savons artisanaux, huiles pressées, beurre de karité, "
                "manyanga, obom — cosmétiques locaux."
            ),
            "display_order": 120,
            "variant_axes": ["artisanat-region", "artisanat-conditioning"],
        },
        # ── Cuirs ──
        {
            "slug": "cuir-artisanal",
            "name": "Cuir & maroquinerie artisanale",
            "icon_name": "ShoppingBag",
            "description": "Sacs, ceintures, portefeuilles en cuir travaillé main.",
            "display_order": 130,
            "variant_axes": [
                "artisanat-material", "artisanat-color", "artisanat-region",
            ],
        },
        # ── Instruments de musique ──
        {
            "slug": "instruments-musique-tradi",
            "name": "Instruments de musique traditionnels",
            "icon_name": "Music",
            "description": "Balafons, tam-tams, mvet, kalimbas, sanza — patrimoine musical.",
            "display_order": 140,
            "variant_axes": ["artisanat-material", "artisanat-region"],
        },
    ],
    "brands": [
        # Ateliers / coopératives camerounais reconnus
        {"name": "Village Artisanal Bafoussam (MINPMEESA)", "country": "Cameroun"},
        {"name": "Village Artisanal Ndikiniméki", "country": "Cameroun"},
        {"name": "Coopérative Artisanale Ouest", "country": "Cameroun"},
        {"name": "Artisans du Noun (bronze)", "country": "Cameroun"},
        {"name": "Coopérative Bamiléké", "country": "Cameroun"},
        {"name": "Coopérative Bamoun", "country": "Cameroun"},
        {"name": "Poteries de Bamboutos", "country": "Cameroun"},
        {"name": "Sculpteurs Menoua", "country": "Cameroun"},
        {"name": "Tisserands du Ndop", "country": "Cameroun"},
        {"name": "Perleurs Hauts-plateaux", "country": "Cameroun"},
        # Terroir CM
        {"name": "Poivre Blanc de Penja (IGP)", "country": "Cameroun"},
        {"name": "Miel Blanc d'Oku", "country": "Cameroun"},
        {"name": "Cacao Cameroun", "country": "Cameroun"},
        {"name": "Café Robusta Cameroun", "country": "Cameroun"},
        # Plateformes vente artisanat
        {"name": "Madiba Shop", "country": "Cameroun"},
        {"name": "e-Diaba", "country": "Cameroun"},
        # Générique
        {"name": "Artisan indépendant (Made in Cameroon)", "country": "Cameroun"},
    ],
    "attributes": [
        # AXES
        {"slug": "artisanat-material", "name": "Matière / matériau",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             # Bois camerounais
             "Bois ébène", "Bois wengué", "Bois padouk", "Bois ayous",
             "Bois iroko", "Bambou", "Rotin",
             # Terre & céramique
             "Terre cuite", "Argile", "Céramique",
             # Métaux
             "Bronze", "Cuivre", "Laiton", "Fer forgé",
             # Végétal
             "Raphia", "Écorce d'arbre (obom)", "Calebasse",
             # Textile
             "Coton tissé main", "Toghu (Ndop)", "Foulbé",
             "Wax", "Pagne traditionnel", "Kente",
             # Autres
             "Perles de verre", "Coquillages", "Cuir tanné",
             "Cornes", "Os", "Pierre",
         ]},
        {"slug": "artisanat-region", "name": "Région d'origine",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Ouest (Bamiléké, grassfields)",
             "Nord-Ouest (Toghu, Ndop, Bamenda)",
             "Sud-Ouest (Bakweri)",
             "Littoral (Bassa, Yambassa, Douala)",
             "Centre (Ewondo, Yaoundé)",
             "Sud (Fang, Bulu)",
             "Est (Baka, forêt)",
             "Adamaoua (Ngaoundéré)",
             "Nord (Peuls, Foulbé)",
             "Extrême-Nord (Kotoko, Massa, Tupuri)",
             "Cameroun (multi-régional)",
         ]},
        {"slug": "artisanat-color", "name": "Couleur",
         "role": "AXE", "values_type": "COLORDICT", "unit": "", "values": []},
        {"slug": "artisanat-dimensions", "name": "Dimensions",
         "role": "AXE", "values_type": "TEXT", "unit": "cm", "values": []},
        {"slug": "artisanat-conditioning", "name": "Conditionnement",
         "role": "AXE", "values_type": "SELECT", "unit": "",
         "values": [
             "Unité", "Pièce unique", "Pack de 2",
             "Pot", "Bocal", "Sachet", "Boîte cadeau",
             "Lot artisanal",
         ]},
        # SPECS
        {"slug": "artisanat-handmade", "name": "Fait main",
         "role": "SPEC", "values_type": "BOOL", "unit": "", "values": []},
        {"slug": "artisanat-certification", "name": "Certification",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Made in Cameroon (autodéclaré)",
             "MINPMEESA (Ministère PME/Artisanat)",
             "ANOR (Agence des Normes)",
             "IGP Penja", "IGP Oku",
             "Aucune certification",
         ]},
        {"slug": "artisanat-ethnic-group", "name": "Ethnie / peuple",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Bamiléké", "Bamoun", "Ewondo", "Douala",
             "Bassa", "Bakweri", "Fang", "Bulu", "Baka",
             "Fulbé / Peul", "Kotoko", "Massa", "Tupuri",
             "Multi-ethnique",
         ]},
        {"slug": "artisanat-artist-name", "name": "Nom de l'artisan",
         "role": "SPEC", "values_type": "TEXT", "unit": "", "values": []},
        {"slug": "artisanat-piece-type", "name": "Type de pièce",
         "role": "SPEC", "values_type": "SELECT", "unit": "",
         "values": [
             "Pièce unique", "Série limitée",
             "Pièce en série", "Réplique",
             "Antique / ancien",
         ]},
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# ORCHESTRATION — Commande Django
# ═══════════════════════════════════════════════════════════════════════════

TAXONOMY = {
    "menager": MENAGER,
    "super": SUPER,
    "femme": FEMME,
    "beaute": BEAUTE,
    "frais": FRAIS,
    "homme": HOMME,
    "shoes": SHOES,
    "maison": MAISON,
    "bebe": BEBE,
    "sport": SPORT,
    "livres": LIVRES,
    "artisanat": ARTISANAT,
}


class Command(BaseCommand):
    help = "Seed idempotent des 12 catégories BelivaY additionnelles."

    def add_arguments(self, parser):
        parser.add_argument(
            "--only",
            type=str,
            default=None,
            help="Slug d'une catégorie racine à seeder uniquement.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulation : n'écrit rien en base de données.",
        )

    def handle(self, *args, **options):
        only = options.get("only")
        dry_run = options.get("dry_run", False)

        if only and only not in TAXONOMY:
            available = ", ".join(TAXONOMY.keys())
            self.stderr.write(self.style.ERROR(
                f"Slug '{only}' inconnu. Disponibles : {available}"
            ))
            return

        selected = {only: TAXONOMY[only]} if only else TAXONOMY

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING(
            f"SEED EXTENDED TAXONOMY {'(DRY RUN)' if dry_run else ''}"
        ))
        self.stdout.write("")

        total = {
            "cats_created": 0, "cats_existed": 0,
            "brands_created": 0, "brands_existed": 0,
            "attrs_created": 0, "attrs_existed": 0,
        }

        for root_slug, data in selected.items():
            self.stdout.write(self.style.MIGRATE_LABEL(
                f"\n> {data['name']} ({root_slug})"
            ))

            if dry_run:
                self._preview(root_slug, data)
                continue

            with transaction.atomic():
                stats = self._seed_one_category(root_slug, data)
                for k, v in stats.items():
                    total[k] += v

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("RECAPITULATIF"))
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(
                f"  Categories : {total['cats_created']} creees, "
                f"{total['cats_existed']} existantes"
            ))
            self.stdout.write(self.style.SUCCESS(
                f"  Marques    : {total['brands_created']} creees, "
                f"{total['brands_existed']} existantes"
            ))
            self.stdout.write(self.style.SUCCESS(
                f"  Attributs  : {total['attrs_created']} crees, "
                f"{total['attrs_existed']} existants"
            ))
        else:
            self.stdout.write(self.style.WARNING("  DRY RUN"))
        self.stdout.write("")

    def _preview(self, root_slug, data):
        self.stdout.write(f"  Racine : {data['name']} ({root_slug})")
        self.stdout.write(f"  Sous-categories ({len(data['children'])}) :")
        for c in data["children"]:
            axes = c.get("variant_axes", [])
            axes_str = f" [axes: {len(axes)}]" if axes else ""
            self.stdout.write(f"      - {c['name']}{axes_str}")
        self.stdout.write(f"  Marques : {len(data['brands'])}")
        self.stdout.write(f"  Attributs : {len(data['attributes'])}")

    def _seed_one_category(self, root_slug, data):
        stats = {
            "cats_created": 0, "cats_existed": 0,
            "brands_created": 0, "brands_existed": 0,
            "attrs_created": 0, "attrs_existed": 0,
        }

        # 1. Categorie racine
        root, created = Category.objects.get_or_create(
            slug=root_slug,
            defaults={
                "name": data["name"],
                "icon_name": data["icon_name"],
                "description": data["description"],
                "display_order": data["display_order"],
                "parent": None,
                "level": 0,
                "is_active": True,
            },
        )
        if created:
            stats["cats_created"] += 1
            self.stdout.write(f"    OK Racine creee : {root.name}")
        else:
            stats["cats_existed"] += 1
            self.stdout.write(f"    -- Racine existante : {root.name}")

        # 2. Sous-categories
        for child_data in data["children"]:
            child, created = Category.objects.get_or_create(
                slug=child_data["slug"],
                defaults={
                    "name": child_data["name"],
                    "icon_name": child_data.get("icon_name", ""),
                    "description": child_data.get("description", ""),
                    "display_order": child_data.get("display_order", 0),
                    "parent": root,
                    "level": 1,
                    "is_active": True,
                },
            )
            if created:
                stats["cats_created"] += 1
                self.stdout.write(f"      OK {child.name}")
            else:
                stats["cats_existed"] += 1

            axes = child_data.get("variant_axes", [])
            if axes and hasattr(child, "variant_axes"):
                child.variant_axes = axes
                child.save(update_fields=["variant_axes"])

        # 3. Marques
        for brand_data in data.get("brands", []):
            brand_slug = slugify(brand_data["name"])
            _, created = Brand.objects.get_or_create(
                slug=brand_slug,
                defaults={
                    "name": brand_data["name"],
                    "country_of_origin": brand_data.get("country", ""),
                    "is_verified": True,
                    "is_active": True,
                    "admin_note": f"Seed automatique — categorie {root_slug}",
                },
            )
            if created:
                stats["brands_created"] += 1
            else:
                stats["brands_existed"] += 1

        if data.get("brands"):
            self.stdout.write(
                f"    OK Marques : {stats['brands_created']} creees, "
                f"{stats['brands_existed']} existantes"
            )

        # 4. Attributs
        for attr_data in data.get("attributes", []):
            _, created = ProductAttribute.objects.get_or_create(
                slug=attr_data["slug"],
                defaults={
                    "name": attr_data["name"],
                    "role": attr_data["role"],
                    "values_type": attr_data["values_type"],
                    "unit": attr_data.get("unit", ""),
                    "is_universal": True,
                    "is_required": False,
                    "values": attr_data.get("values", []),
                    "attribute_type": self._infer_attribute_type(attr_data),
                    "display_order": 100,
                },
            )
            if created:
                stats["attrs_created"] += 1
            else:
                stats["attrs_existed"] += 1

        if data.get("attributes"):
            self.stdout.write(
                f"    OK Attributs : {stats['attrs_created']} crees, "
                f"{stats['attrs_existed']} existants"
            )

        return stats

    def _infer_attribute_type(self, attr_data):
        slug = attr_data["slug"].lower()
        if "color" in slug:
            return "COLOR"
        if "size" in slug or "weight" in slug or "capacity" in slug:
            return "SIZE"
        if "material" in slug:
            return "MATERIAL"
        return "OTHER"