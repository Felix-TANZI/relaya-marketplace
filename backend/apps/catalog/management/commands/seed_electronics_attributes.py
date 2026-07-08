from django.core.management.base import BaseCommand
from django.db import transaction
 
from apps.catalog.models import Category, ProductAttribute
 
 
# ═══════════════════════════════════════════════════════════════════════════
# ATTRIBUTS UNIVERSELS — s'appliquent à toutes les catégories
# ═══════════════════════════════════════════════════════════════════════════
#
# Format tuple : (slug, name, role, values_type, unit, values_list_or_None)
#
# La très grande majorité sont SPEC. Seul Condition est OFFRE (dépend vendeur).
# ═══════════════════════════════════════════════════════════════════════════
 
UNIVERSAL_ATTRIBUTES = [
    # ─── Identité (dominante SPEC / BRAND) ────────────────────────────
    ("brand",              "Marque",              "SPEC",  "BRAND",   "",   None),
 
    # ─── Physique (SPEC) ──────────────────────────────────────────────
    ("weight",             "Poids",               "SPEC",  "NUMBER",  "g",  None),
    ("dimensions",         "Dimensions",          "SPEC",  "TEXT",    "mm", None),
    ("material",           "Matériau",            "SPEC",  "SELECT",  "",
        ["Plastique", "Aluminium", "Verre", "Acier", "Titane", "Céramique", "Cuir", "Textile"]),
 
    # ─── Connectivité (SPEC) ──────────────────────────────────────────
    ("bluetooth",          "Bluetooth",           "SPEC",  "SELECT",  "",
        ["Non", "4.0", "4.2", "5.0", "5.1", "5.2", "5.3", "5.4"]),
    ("wifi_standard",      "Standard WiFi",       "SPEC",  "SELECT",  "",
        ["Non", "WiFi 4", "WiFi 5", "WiFi 6", "WiFi 6E", "WiFi 7"]),
    ("nfc",                "NFC",                 "SPEC",  "BOOL",    "",   None),
    ("usb_type",           "Type USB",            "SPEC",  "SELECT",  "",
        ["USB-A", "USB-C", "Micro-USB", "Lightning", "Aucun"]),
    ("hdmi_ports",         "Ports HDMI",          "SPEC",  "NUMBER",  "",   None),
 
    # ─── Énergie (SPEC) ───────────────────────────────────────────────
    ("voltage",            "Tension",             "SPEC",  "NUMBER",  "V",  None),
    ("wattage",            "Puissance",           "SPEC",  "NUMBER",  "W",  None),
    ("battery_type",       "Type de batterie",    "SPEC",  "SELECT",  "",
        ["Li-Ion", "Li-Po", "NiMH", "Plomb", "LiFePO4"]),
    ("solar_compatible",   "Compatible solaire",  "SPEC",  "BOOL",    "",   None),
 
    # ─── Régional (SPEC) ──────────────────────────────────────────────
    ("region_compatibility","Région compatible",  "SPEC",  "SELECT",  "",
        ["Global", "Afrique", "Europe", "USA", "Asie"]),
    ("voltage_region",     "Norme électrique",    "SPEC",  "SELECT",  "",
        ["220-240V (Afrique/Europe)", "110-120V (USA)", "Multi-voltage"]),
 
    # ─── Attributs OFFRE (dépendent du vendeur) ───────────────────────
    ("condition",          "État",                "OFFRE", "SELECT",  "",
        ["Neuf", "Reconditionné", "Occasion", "Open Box"]),
    ("import_source",      "Origine import",      "OFFRE", "SELECT",  "",
        ["Local", "Dubaï", "Chine", "USA", "Europe", "Autre"]),
    ("customs_cleared",    "Dédouané",            "OFFRE", "BOOL",    "",   None),
    ("warranty_months",    "Garantie",            "OFFRE", "NUMBER",  "mois", None),
]
 
 
# ═══════════════════════════════════════════════════════════════════════════
# ATTRIBUTS PAR CATÉGORIE ELECTRONICS (§5.1 à §5.15)
# ═══════════════════════════════════════════════════════════════════════════
#
# Format dict :
#   category_slug: [
#       (slug, name, role, values_type, unit, values_list_or_None),
#       ...
#   ]
#
# Convention de slug : préfixer par la famille catégorie pour éviter
# collisions entre catégories différentes (ex : phones-storage vs tablets-storage).
# ═══════════════════════════════════════════════════════════════════════════
 
CATEGORY_ATTRIBUTES = {
 
    # ─────────────────────────────────────────────────────────────────
    # §5.1 — Smartphones (Android / iOS)
    # ─────────────────────────────────────────────────────────────────
    "electronics-phones-smartphones-android": [
        # AXES (créent des Variants)
        ("phone-storage",     "Stockage",     "AXE",  "SELECT",   "GB",
            ["64", "128", "256", "512", "1024"]),
        ("phone-ram",         "RAM",          "AXE",  "SELECT",   "GB",
            ["3", "4", "6", "8", "12", "16"]),
        ("phone-color",       "Couleur",      "AXE",  "COLORDICT","",   None),
 
        # SPECS (fixes du modèle)
        ("phone-display-type","Type d'écran", "SPEC", "SELECT",   "",
            ["LCD", "IPS", "OLED", "AMOLED", "Super AMOLED"]),
        ("phone-refresh-rate","Taux de rafraîchissement", "SPEC", "SELECT", "Hz",
            ["60", "90", "120", "144"]),
        ("phone-screen-size", "Taille d'écran","SPEC", "NUMBER",  "pouces", None),
        ("phone-network",     "Réseau",       "SPEC", "SELECT",   "",
            ["3G", "4G", "4G+", "5G"]),
        ("phone-sim",         "SIM",          "SPEC", "SELECT",   "",
            ["Single SIM", "Dual SIM", "eSIM", "Dual SIM + eSIM"]),
        ("phone-battery",     "Batterie",     "SPEC", "NUMBER",   "mAh", None),
        ("phone-camera-main", "Caméra principale", "SPEC", "NUMBER", "MP", None),
    ],
 
    "electronics-phones-smartphones-ios": [
        # Mêmes axes (mais slug distincts pour éviter conflit)
        ("iphone-storage",    "Stockage",     "AXE",  "SELECT",   "GB",
            ["64", "128", "256", "512", "1024"]),
        ("iphone-color",      "Couleur",      "AXE",  "COLORDICT","",   None),
 
        ("iphone-display",    "Type d'écran", "SPEC", "SELECT",   "",
            ["Retina", "Super Retina", "Super Retina XDR", "Liquid Retina"]),
        ("iphone-refresh-rate","ProMotion",   "SPEC", "SELECT",   "Hz",
            ["60", "120"]),
        ("iphone-screen-size","Taille d'écran","SPEC", "NUMBER",  "pouces", None),
        ("iphone-battery",    "Batterie",     "SPEC", "NUMBER",   "mAh", None),
        ("iphone-chip",       "Processeur",   "SPEC", "SELECT",   "",
            ["A15 Bionic", "A16 Bionic", "A17 Pro", "A18", "A18 Pro"]),
    ],
 
    "electronics-phones-feature": [
        ("feature-color",     "Couleur",      "AXE",  "COLORDICT","",   None),
        ("feature-network",   "Réseau",       "SPEC", "SELECT",   "",
            ["2G", "3G", "4G"]),
        ("feature-sim",       "SIM",          "SPEC", "SELECT",   "",
            ["Single SIM", "Dual SIM"]),
        ("feature-battery",   "Batterie",     "SPEC", "NUMBER",   "mAh", None),
        ("feature-torch",     "Lampe torche", "SPEC", "BOOL",     "",   None),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.2 — Ordinateurs
    # ─────────────────────────────────────────────────────────────────
    "electronics-computers-laptops": [
        # AXES — Config préassemblée (§5.2 stratégie : paliers vs axes libres)
        ("laptop-config",     "Configuration","AXE",  "SELECT",   "",
            ["i3/8/256/Iris", "i5/8/512/Iris", "i5/16/512/RTX3050",
             "i7/16/1To/RTX4060", "i7/32/1To/RTX4070", "M2/8/256", "M2/16/512", "M3/16/512"]),
        ("laptop-color",      "Couleur",      "AXE",  "COLORDICT","",   None),
 
        # SPECS
        ("laptop-display",    "Résolution",   "SPEC", "SELECT",   "",
            ["HD", "FHD", "QHD", "4K", "Retina"]),
        ("laptop-screen-size","Taille d'écran","SPEC", "NUMBER",  "pouces", None),
        ("laptop-keyboard",   "Clavier",      "SPEC", "SELECT",   "",
            ["ANSI", "ISO", "AZERTY"]),
        ("laptop-os",         "Système d'exploitation", "SPEC", "SELECT", "",
            ["Windows 11", "Windows 10", "macOS", "Ubuntu", "Chrome OS", "Sans OS"]),
        ("laptop-touchscreen","Écran tactile","SPEC", "BOOL",     "",   None),
    ],
 
    "electronics-computers-desktops": [
        ("desktop-config",    "Configuration","AXE",  "SELECT",   "",
            ["i3/8/256", "i5/16/512", "i7/16/1To", "i7/32/1To/RTX4060",
             "Ryzen5/16/512", "Ryzen7/32/1To/RTX4070"]),
        ("desktop-color",     "Couleur",      "AXE",  "COLORDICT","",   None),
        ("desktop-form",      "Format",       "SPEC", "SELECT",   "",
            ["Tour ATX", "Mini-ITX", "SFF", "Mini PC"]),
        ("desktop-os",        "OS",           "SPEC", "SELECT",   "",
            ["Windows 11", "Windows 10", "Linux", "Sans OS"]),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.3 — Composants (spec-lourds, peu d'axes)
    # ─────────────────────────────────────────────────────────────────
    "electronics-components-cpu": [
        # Attributs SPEC dominants
        ("cpu-socket",        "Socket",       "SPEC", "SELECT",   "",
            ["LGA 1700", "LGA 1200", "AM4", "AM5", "TR4", "sTRX4"]),
        ("cpu-cores",         "Cœurs",        "SPEC", "NUMBER",   "",   None),
        ("cpu-clock-base",    "Fréquence base","SPEC", "NUMBER",  "GHz", None),
        ("cpu-clock-boost",   "Fréquence boost","SPEC","NUMBER",  "GHz", None),
        ("cpu-tdp",           "TDP",          "SPEC", "NUMBER",   "W",  None),
        # Axe rare : format d'emballage
        ("cpu-packaging",     "Emballage",    "AXE",  "SELECT",   "",
            ["Boxed", "Tray"]),
    ],
 
    "electronics-components-gpu": [
        ("gpu-vram",          "VRAM",         "SPEC", "NUMBER",   "GB", None),
        ("gpu-bus",           "Bus mémoire",  "SPEC", "SELECT",   "",
            ["64-bit", "128-bit", "192-bit", "256-bit", "384-bit"]),
        ("gpu-raytracing",    "Ray Tracing",  "SPEC", "BOOL",     "",   None),
        ("gpu-power-connector","Connecteur alim","SPEC", "SELECT", "",
            ["Aucun", "6-pin", "8-pin", "6+8-pin", "12VHPWR"]),
    ],
 
    "electronics-components-ram": [
        ("ram-capacity",      "Capacité",     "AXE",  "SELECT",   "GB",
            ["4", "8", "16", "32", "64", "128"]),
        ("ram-rgb",           "RGB",          "AXE",  "BOOL",     "",   None),
        ("ram-type",          "Type",         "SPEC", "SELECT",   "",
            ["DDR3", "DDR4", "DDR5"]),
        ("ram-frequency",     "Fréquence",    "SPEC", "NUMBER",   "MHz", None),
        ("ram-latency",       "Latence CAS",  "SPEC", "TEXT",     "",   None),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.4 — Périphériques
    # ─────────────────────────────────────────────────────────────────
    "electronics-peripherals-keyboards": [
        ("kb-switch",         "Type de switch","AXE", "SELECT",   "",
            ["Membrane", "Ciseaux", "Rouge (linéaire)", "Bleu (clicky)",
             "Brun (tactile)", "Optique"]),
        ("kb-layout",         "Layout",       "AXE",  "SELECT",   "",
            ["ANSI", "ISO", "AZERTY"]),
        ("kb-color",          "Couleur",      "AXE",  "COLORDICT","",   None),
        ("kb-connectivity",   "Connectivité", "AXE",  "SELECT",   "",
            ["Filaire", "Sans-fil", "Bluetooth"]),
        ("kb-format",         "Format",       "SPEC", "SELECT",   "",
            ["Full-size", "TKL (Ten Keyless)", "75%", "65%", "60%"]),
        ("kb-rgb",            "RGB",          "SPEC", "BOOL",     "",   None),
    ],
 
    "electronics-peripherals-mice": [
        ("mouse-color",       "Couleur",      "AXE",  "COLORDICT","",   None),
        ("mouse-connectivity","Connectivité", "AXE",  "SELECT",   "",
            ["Filaire", "Sans-fil", "Bluetooth"]),
        ("mouse-dpi-max",     "DPI max",      "SPEC", "NUMBER",   "DPI", None),
        ("mouse-polling",     "Polling rate", "SPEC", "SELECT",   "Hz",
            ["125", "250", "500", "1000", "2000", "4000", "8000"]),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.5 — Écrans
    # ─────────────────────────────────────────────────────────────────
    "electronics-displays": [
        ("display-size",      "Taille",       "AXE",  "SELECT",   "pouces",
            ["21", "24", "27", "32", "34", "43", "49"]),
        ("display-resolution","Résolution",   "SPEC", "SELECT",   "",
            ["HD", "FHD", "QHD", "4K UHD", "5K", "8K"]),
        ("display-panel",     "Type de dalle","SPEC", "SELECT",   "",
            ["TN", "IPS", "VA", "OLED", "Mini-LED"]),
        ("display-refresh",   "Taux de rafraîchissement","SPEC", "SELECT", "Hz",
            ["60", "75", "120", "144", "165", "240", "360"]),
        ("display-hdr",       "HDR",          "SPEC", "SELECT",   "",
            ["Non", "HDR10", "HDR10+", "Dolby Vision"]),
        ("display-curved",    "Incurvé",      "SPEC", "BOOL",     "",   None),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.6 — Tablettes
    # ─────────────────────────────────────────────────────────────────
    "electronics-tablets-standard": [
        ("tab-storage",       "Stockage",     "AXE",  "SELECT",   "GB",
            ["32", "64", "128", "256", "512", "1024"]),
        ("tab-color",         "Couleur",      "AXE",  "COLORDICT","",   None),
        ("tab-cellular",      "Connectivité", "AXE",  "SELECT",   "",
            ["WiFi", "WiFi + Cellular"]),
        ("tab-screen-size",   "Taille d'écran","SPEC", "NUMBER",  "pouces", None),
        ("tab-stylus",        "Stylet compatible","SPEC","BOOL",  "",   None),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.7 — Réseau
    # ─────────────────────────────────────────────────────────────────
    "electronics-network-mesh": [
        ("mesh-pack",         "Pack",         "AXE",  "SELECT",   "nœuds",
            ["1", "2", "3", "4"]),
        ("mesh-wifi-standard","Standard WiFi","SPEC", "SELECT",   "",
            ["WiFi 5", "WiFi 6", "WiFi 6E", "WiFi 7"]),
        ("mesh-speed",        "Vitesse max",  "SPEC", "NUMBER",   "Mbps", None),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.8 — Stockage
    # ─────────────────────────────────────────────────────────────────
    "electronics-storage-ssd": [
        ("ssd-capacity",      "Capacité",     "AXE",  "SELECT",   "",
            ["120GB", "240GB", "500GB", "1TB", "2TB", "4TB", "8TB"]),
        ("ssd-interface",     "Interface",    "AXE",  "SELECT",   "",
            ["SATA III", "M.2 SATA", "M.2 NVMe PCIe 3.0", "M.2 NVMe PCIe 4.0", "M.2 NVMe PCIe 5.0"]),
        ("ssd-read-speed",    "Vitesse lecture","SPEC","NUMBER",  "MB/s", None),
        ("ssd-write-speed",   "Vitesse écriture","SPEC","NUMBER", "MB/s", None),
        ("ssd-endurance",     "Endurance",    "SPEC", "SELECT",   "",
            ["Consumer", "Prosumer", "Enterprise"]),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.9 — Audio
    # ─────────────────────────────────────────────────────────────────
    "electronics-audio-headphones": [
        ("hp-color",          "Couleur",      "AXE",  "COLORDICT","",   None),
        ("hp-connectivity",   "Connectivité", "AXE",  "SELECT",   "",
            ["Filaire", "Sans-fil", "Filaire + Sans-fil"]),
        ("hp-anc",            "ANC (Réduction bruit active)", "SPEC", "BOOL", "", None),
        ("hp-codecs",         "Codecs supportés","SPEC", "TEXT",  "",   None),
        ("hp-driver",         "Diamètre driver","SPEC","NUMBER",  "mm", None),
        ("hp-battery-life",   "Autonomie",    "SPEC", "NUMBER",   "h",  None),
    ],
 
    "electronics-audio-speakers": [
        ("speaker-color",     "Couleur",      "AXE",  "COLORDICT","",   None),
        ("speaker-connectivity","Connectivité","AXE", "SELECT",   "",
            ["Filaire", "Bluetooth", "WiFi", "Bluetooth + WiFi"]),
        ("speaker-power",     "Puissance",    "SPEC", "NUMBER",   "W",  None),
        ("speaker-waterproof","Étanchéité",   "SPEC", "SELECT",   "",
            ["Non", "IPX4", "IPX5", "IPX7", "IP67"]),
        ("speaker-channels",  "Canaux",       "SPEC", "SELECT",   "",
            ["Mono", "Stéréo", "2.1", "5.1", "7.1"]),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.10 — Caméras
    # ─────────────────────────────────────────────────────────────────
    "electronics-cameras-dslr-mirrorless": [
        ("cam-kit",           "Kit",          "AXE",  "SELECT",   "",
            ["Boîtier nu", "Kit 1 objectif", "Kit 2 objectifs"]),
        ("cam-color",         "Couleur",      "AXE",  "COLORDICT","",   None),
        ("cam-sensor",        "Capteur",      "SPEC", "SELECT",   "",
            ["Full Frame", "APS-C", "Micro 4/3", "Medium Format"]),
        ("cam-resolution",    "Résolution",   "SPEC", "NUMBER",   "MP", None),
        ("cam-iso-max",       "ISO max",      "SPEC", "NUMBER",   "",   None),
        ("cam-stabilization", "Stabilisation","SPEC", "SELECT",   "",
            ["Non", "Optique", "Capteur (IBIS)", "5-axes"]),
        ("cam-video-max",     "Vidéo max",    "SPEC", "SELECT",   "",
            ["1080p60", "4K30", "4K60", "6K", "8K"]),
    ],
 
    "electronics-cameras-surveillance": [
        ("cctv-pack",         "Pack caméras", "AXE",  "SELECT",   "",
            ["1", "2", "4", "8", "16"]),
        ("cctv-resolution",   "Résolution",   "AXE",  "SELECT",   "",
            ["720p", "1080p", "2K", "4K", "8K"]),
        ("cctv-night-vision", "Vision nocturne","SPEC","SELECT",  "",
            ["Non", "IR", "Couleur nocturne"]),
        ("cctv-solar",        "Alimentation solaire","SPEC","BOOL","",  None),
        ("cctv-storage",      "Stockage",     "SPEC", "SELECT",   "",
            ["Local (SD)", "NVR/DVR", "Cloud", "Hybride"]),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.11 — Gaming
    # ─────────────────────────────────────────────────────────────────
    "electronics-gaming-consoles": [
        ("console-edition",   "Édition",      "AXE",  "SELECT",   "",
            ["Standard", "Digital", "Slim", "Pro", "Édition Collector"]),
        ("console-storage",   "Stockage",     "AXE",  "SELECT",   "",
            ["500GB", "1TB", "2TB"]),
        ("console-bundle",    "Bundle",       "AXE",  "SELECT",   "",
            ["Console seule", "Console + 1 jeu", "Console + 2 jeux", "Bundle famille"]),
        ("console-color",     "Couleur",      "AXE",  "COLORDICT","",   None),
        ("console-platform",  "Plateforme",   "SPEC", "SELECT",   "",
            ["PlayStation 5", "Xbox Series X", "Xbox Series S", "Nintendo Switch"]),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.12 — Wearables (§5.12 note : la plus forte combinatoire)
    # ─────────────────────────────────────────────────────────────────
    "electronics-wearables-smartwatches": [
        ("watch-case-size",   "Taille du boîtier","AXE","SELECT", "mm",
            ["38", "40", "41", "42", "44", "45", "46", "49"]),
        ("watch-case-color",  "Couleur boîtier","AXE","COLORDICT","",   None),
        ("watch-connectivity","Connectivité", "AXE",  "SELECT",   "",
            ["GPS", "GPS + Cellular"]),
        # Bracelet comme spec, pas comme axe (§5.12 recommendation)
        ("watch-strap-material","Matière bracelet","SPEC","SELECT","",
            ["Silicone", "Cuir", "Tissu", "Métal (maille)", "Métal (lien)"]),
        ("watch-display",     "Type d'écran", "SPEC", "SELECT",   "",
            ["LCD", "OLED", "AMOLED"]),
        ("watch-water",       "Étanchéité",   "SPEC", "SELECT",   "",
            ["Non", "IP67", "IP68", "5 ATM", "10 ATM"]),
        ("watch-heart-rate",  "Cardiofréquencemètre","SPEC","BOOL","",  None),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.13 — Smart Home
    # ─────────────────────────────────────────────────────────────────
    "electronics-smart-home-bulbs": [
        ("bulb-pack",         "Pack",         "AXE",  "SELECT",   "",
            ["1", "2", "3", "4", "6", "10"]),
        ("bulb-color-mode",   "Type",         "AXE",  "SELECT",   "",
            ["Blanc chaud", "Blanc réglable", "Couleur (RGB)"]),
        ("bulb-protocol",     "Protocole",    "AXE",  "SELECT",   "",
            ["WiFi", "Zigbee", "Matter", "Bluetooth"]),
        ("bulb-socket",       "Culot",        "SPEC", "SELECT",   "",
            ["E27", "E14", "B22", "GU10"]),
        ("bulb-lumens",       "Lumens",       "SPEC", "NUMBER",   "lm", None),
        ("bulb-voice-assistant","Assistant vocal","SPEC","SELECT","",
            ["Aucun", "Alexa", "Google", "HomeKit", "Alexa + Google", "Universel"]),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.14 — Puissance
    # ─────────────────────────────────────────────────────────────────
    "electronics-power-power-banks": [
        ("pb-capacity",       "Capacité",     "AXE",  "SELECT",   "mAh",
            ["5000", "10000", "20000", "26800", "30000", "50000"]),
        ("pb-wattage",        "Puissance sortie","AXE","SELECT",  "W",
            ["10", "18", "20", "30", "45", "65", "100", "140"]),
        ("pb-color",          "Couleur",      "AXE",  "COLORDICT","",   None),
        ("pb-ports",          "Configuration ports","SPEC","TEXT","",   None),
        ("pb-fast-charge",    "Charge rapide","SPEC", "BOOL",     "",   None),
        ("pb-wireless",       "Charge sans-fil","SPEC","BOOL",    "",   None),
    ],
 
    "electronics-power-ups": [
        ("ups-capacity",      "Capacité",     "AXE",  "SELECT",   "VA",
            ["600", "800", "1000", "1500", "2000", "3000", "5000"]),
        ("ups-color",         "Couleur",      "AXE",  "COLORDICT","",   None),
        ("ups-technology",    "Technologie",  "SPEC", "SELECT",   "",
            ["Offline (Standby)", "Line Interactive", "Online (double conversion)"]),
        ("ups-runtime",       "Autonomie à mi-charge","SPEC","NUMBER","min", None),
    ],
 
    "electronics-power-solar-kits": [
        ("solar-panel-power", "Puissance panneau","AXE","SELECT", "W",
            ["50", "100", "200", "300", "400", "600"]),
        ("solar-battery",     "Capacité batterie","AXE","SELECT", "Wh",
            ["100", "300", "500", "1000", "2000", "3000"]),
        ("solar-outlets",     "Prises AC",    "SPEC", "NUMBER",   "",   None),
        ("solar-mppt",        "Régulateur MPPT","SPEC","BOOL",    "",   None),
    ],
 
    # ─────────────────────────────────────────────────────────────────
    # §5.15 — Sécurité
    # ─────────────────────────────────────────────────────────────────
    "electronics-security-dvr-nvr": [
        ("dvr-channels",      "Nombre de canaux","AXE","SELECT",  "",
            ["4", "8", "16", "32", "64"]),
        ("dvr-resolution",    "Résolution max","AXE","SELECT",    "",
            ["1080p", "2K", "4K", "8K"]),
        ("dvr-hdd-support",   "Baies HDD",    "SPEC", "NUMBER",   "",   None),
        ("dvr-cloud-support", "Support Cloud","SPEC", "BOOL",     "",   None),
    ],
 
    "electronics-security-biometric": [
        ("bio-auth-method",   "Méthode d'authentification","AXE","SELECT","",
            ["Empreinte", "Reconnaissance faciale", "Iris", "Multi-modal"]),
        ("bio-users-max",     "Utilisateurs max","SPEC","NUMBER", "",   None),
        ("bio-network",       "Connectivité", "SPEC", "SELECT",   "",
            ["Standalone", "TCP/IP", "WiFi", "RS485"]),
    ],
}
 
 
# ═══════════════════════════════════════════════════════════════════════════
# COMMAND
# ═══════════════════════════════════════════════════════════════════════════
 
class Command(BaseCommand):
    help = (
        "Peuple ProductAttribute avec les attributs universels + les "
        "attributs par catégorie Electronics selon le document Volume 1."
    )
 
    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Simule sans écrire en base.")
        parser.add_argument("--update-existing", action="store_true",
                            help="Met à jour name/role/values des attributs déjà créés.")
 
    def handle(self, *args, **opts):
        self.dry_run = opts["dry_run"]
        self.update_existing = opts["update_existing"]
        self.stats = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}
 
        if self.dry_run:
            self.stdout.write(self.style.WARNING("── DRY RUN — aucune écriture en base ──"))
 
        with transaction.atomic():
            # 1. Attributs universels
            self.stdout.write(self.style.MIGRATE_HEADING("── ATTRIBUTS UNIVERSELS ──"))
            for attr_data in UNIVERSAL_ATTRIBUTES:
                self._process_attribute(attr_data, category=None, is_universal=True)
 
            # 2. Attributs par catégorie
            for cat_slug, attrs in CATEGORY_ATTRIBUTES.items():
                self.stdout.write("")
                self.stdout.write(self.style.MIGRATE_HEADING(f"── {cat_slug} ──"))
                try:
                    category = Category.objects.get(slug=cat_slug)
                except Category.DoesNotExist:
                    self.stdout.write(self.style.ERROR(
                        f"  ✗ Catégorie '{cat_slug}' introuvable. "
                        f"Lance d'abord seed_electronics_taxonomy."
                    ))
                    self.stats["errors"] += 1
                    continue
 
                for attr_data in attrs:
                    self._process_attribute(attr_data, category=category, is_universal=False)
 
            if self.dry_run:
                transaction.set_rollback(True)
 
        # Rapport final
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("── Rapport ──"))
        self.stdout.write(f"  Créés : {self.stats['created']}")
        self.stdout.write(f"  Mis à jour : {self.stats['updated']}")
        self.stdout.write(f"  Inchangés : {self.stats['skipped']}")
        if self.stats["errors"]:
            self.stdout.write(self.style.ERROR(f"  Erreurs : {self.stats['errors']}"))
 
    def _process_attribute(self, attr_data, category, is_universal):
        slug, name, role, values_type, unit, values = attr_data
 
        # Lookup par slug
        existing = ProductAttribute.objects.filter(slug=slug).first()
 
        payload = {
            "name": name,
            "role": role,
            "values_type": values_type,
            "unit": unit or "",
            "values": values or [],
            "is_universal": is_universal,
            "category": category,
        }
        # `attribute_type` sémantique — on essaie de le déduire (utilisé par le
        # frontend legacy). Correspondance approximative :
        if values_type == "COLORDICT":
            payload["attribute_type"] = "COLOR"
        elif "size" in slug or "capacity" in slug:
            payload["attribute_type"] = "SIZE"
        elif "material" in slug:
            payload["attribute_type"] = "MATERIAL"
        else:
            payload["attribute_type"] = "OTHER"
 
        if existing is None:
            if not self.dry_run:
                ProductAttribute.objects.create(slug=slug, **payload)
            self._log("created", slug, name, role)
            self.stats["created"] += 1
            return
 
        if not self.update_existing:
            self._log("skipped", slug, name, role)
            self.stats["skipped"] += 1
            return
 
        # Update mode : rafraîchir les champs éditoriaux
        changed = False
        for k, v in payload.items():
            if getattr(existing, k) != v:
                setattr(existing, k, v)
                changed = True
        if changed:
            if not self.dry_run:
                existing.save()
            self._log("updated", slug, name, role)
            self.stats["updated"] += 1
        else:
            self._log("skipped", slug, name, role)
            self.stats["skipped"] += 1
 
    def _log(self, action, slug, name, role):
        style = {
            "created": self.style.SUCCESS,
            "updated": self.style.WARNING,
            "skipped": self.style.NOTICE,
        }[action]
        badge = {"AXE": "🎯", "SPEC": "📊", "OFFRE": "🏷️"}.get(role, "")
        self.stdout.write(f"  {style(action.upper())} {badge} {name} ({slug}) [{role}]")