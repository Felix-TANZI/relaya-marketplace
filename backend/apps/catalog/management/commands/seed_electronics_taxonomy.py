from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
 
from apps.catalog.models import Category
 
 
# ─── Convention de préfixage ──────────────────────────────────────────────
# Tous les slugs de la nouvelle hiérarchie sont préfixés "electronics-"
# pour éviter tout conflit avec les catégories legacy plates existantes
# (ex : "electronique" vs nouveau "electronics").
SLUG_PREFIX = "electronics"
 
 
# ─── Slugs des anciennes catégories Electronics à marquer legacy ──────────
# Détectées via analyse du repo (frontend) : elles existent en prod.
LEGACY_ELECTRONICS_SLUGS = [
    "electronique",           # "Électronique"
    "telephones-tablettes",   # "Téléphones & Tablettes"
    "telephones",             # "Téléphones"
    "audio",                  # cas ambigu — audio existe aussi en Electronics
    "gaming",                 # idem
    "montres",                # idem — mais Wearables est plus précis
    "ordinateurs",            # idem
    "tablettes",              # idem
]
 
 
# ═══════════════════════════════════════════════════════════════════════════
# STRUCTURE DE LA TAXONOMIE
# ═══════════════════════════════════════════════════════════════════════════
#
# Format : liste de dicts. Chaque dict décrit une catégorie racine ou
# intermédiaire, avec ses enfants récursivement.
#
# Champs par entrée :
#   slug_suffix : suffixe unique (préfixé automatiquement par "electronics-")
#   name        : nom affiché
#   icon        : nom de composant lucide-react (vide = pas d'icône)
#   description : phrase courte
#   requires_admin_approval : Rule 5 (drones, biométrie, batteries indus...)
#   children    : liste récursive
# ═══════════════════════════════════════════════════════════════════════════
 
TAXONOMY = [
    {
        "slug_suffix": "",   # racine → slug = "electronics"
        "name": "Electronics",
        "icon": "Cpu",
        "description": "Téléphones, ordinateurs, audio, gaming et high-tech.",
        "children": [
            # ─── 5.1 Téléphonie & Télécommunications ────────────────────
            {
                "slug_suffix": "phones",
                "name": "Téléphonie & Télécommunications",
                "icon": "Smartphone",
                "description": "Smartphones, feature phones et accessoires télécoms.",
                "children": [
                    {"slug_suffix": "phones-smartphones-ios",
                     "name": "Smartphones iOS", "icon": "Smartphone",
                     "description": "iPhone et gamme Apple mobile."},
                    {"slug_suffix": "phones-smartphones-android",
                     "name": "Smartphones Android", "icon": "Smartphone",
                     "description": "Samsung, Xiaomi, Tecno, Infinix, Oppo, Huawei..."},
                    {"slug_suffix": "phones-feature",
                     "name": "Feature Phones", "icon": "Phone",
                     "description": "Téléphones basiques (Nokia, Itel, appels/SMS)."},
                    {"slug_suffix": "phones-accessories",
                     "name": "Accessoires téléphones", "icon": "Cable",
                     "description": "Câbles, coques, écouteurs filaires, protège-écrans."},
                    {"slug_suffix": "phones-signal-boosters",
                     "name": "Amplificateurs de signal", "icon": "Antenna",
                     "description": "Boosters GSM/4G/5G — vente réglementée.",
                     "requires_admin_approval": True},
                ],
            },
            # ─── 5.2 Ordinateurs ──────────────────────────────────────────
            {
                "slug_suffix": "computers",
                "name": "Ordinateurs",
                "icon": "Laptop",
                "description": "Laptops, desktops et stations de travail.",
                "children": [
                    {"slug_suffix": "computers-laptops",
                     "name": "Laptops", "icon": "Laptop",
                     "description": "Portables Windows, Chromebooks, MacBooks."},
                    {"slug_suffix": "computers-desktops",
                     "name": "Desktops", "icon": "Monitor",
                     "description": "Ordinateurs de bureau tour."},
                    {"slug_suffix": "computers-all-in-one",
                     "name": "All-in-One", "icon": "Monitor",
                     "description": "PC tout-en-un intégrés à l'écran."},
                    {"slug_suffix": "computers-custom-builds",
                     "name": "Custom Builds", "icon": "Wrench",
                     "description": "Configurations sur mesure assemblées par le vendeur."},
                ],
            },
            # ─── 5.3 Composants informatiques ─────────────────────────────
            {
                "slug_suffix": "components",
                "name": "Composants informatiques",
                "icon": "Cpu",
                "description": "Processeurs, cartes graphiques, RAM, alimentations.",
                "children": [
                    {"slug_suffix": "components-cpu",
                     "name": "Processeurs (CPU)", "icon": "Cpu"},
                    {"slug_suffix": "components-gpu",
                     "name": "Cartes graphiques (GPU)", "icon": "Cpu"},
                    {"slug_suffix": "components-ram",
                     "name": "Mémoire vive (RAM)", "icon": "MemoryStick"},
                    {"slug_suffix": "components-motherboards",
                     "name": "Cartes mères", "icon": "CircuitBoard"},
                    {"slug_suffix": "components-psu",
                     "name": "Alimentations", "icon": "Plug"},
                    {"slug_suffix": "components-cases",
                     "name": "Boîtiers PC", "icon": "Box"},
                    {"slug_suffix": "components-cooling",
                     "name": "Refroidissement", "icon": "Wind"},
                ],
            },
            # ─── 5.4 Périphériques informatiques ──────────────────────────
            {
                "slug_suffix": "peripherals",
                "name": "Périphériques informatiques",
                "icon": "Keyboard",
                "description": "Claviers, souris, imprimantes, webcams.",
                "children": [
                    {"slug_suffix": "peripherals-keyboards",
                     "name": "Claviers", "icon": "Keyboard"},
                    {"slug_suffix": "peripherals-mice",
                     "name": "Souris", "icon": "Mouse"},
                    {"slug_suffix": "peripherals-combos",
                     "name": "Combos clavier-souris", "icon": "Keyboard"},
                    {"slug_suffix": "peripherals-printers",
                     "name": "Imprimantes", "icon": "Printer"},
                    {"slug_suffix": "peripherals-webcams",
                     "name": "Webcams", "icon": "Video"},
                ],
            },
            # ─── 5.5 Écrans & Moniteurs ───────────────────────────────────
            {
                "slug_suffix": "displays",
                "name": "Écrans & Moniteurs",
                "icon": "Monitor",
                "description": "Moniteurs bureautique, gaming, professionnels.",
            },
            # ─── 5.6 Tablettes & Liseuses ─────────────────────────────────
            {
                "slug_suffix": "tablets",
                "name": "Tablettes & Liseuses",
                "icon": "Tablet",
                "description": "iPad, tablettes Android, liseuses e-ink.",
                "children": [
                    {"slug_suffix": "tablets-standard",
                     "name": "Tablettes", "icon": "Tablet"},
                    {"slug_suffix": "tablets-ereaders",
                     "name": "Liseuses", "icon": "BookOpen"},
                ],
            },
            # ─── 5.7 Réseau ───────────────────────────────────────────────
            {
                "slug_suffix": "network",
                "name": "Réseau",
                "icon": "Wifi",
                "description": "Routeurs, mesh WiFi, switchs, hotspots LTE.",
                "children": [
                    {"slug_suffix": "network-routers",
                     "name": "Routeurs", "icon": "Router"},
                    {"slug_suffix": "network-mesh",
                     "name": "Mesh WiFi", "icon": "Wifi"},
                    {"slug_suffix": "network-switches",
                     "name": "Switchs & Hubs", "icon": "Network"},
                    {"slug_suffix": "network-lte-hotspots",
                     "name": "Hotspots LTE/5G", "icon": "Antenna"},
                    {"slug_suffix": "network-solar-routers",
                     "name": "Routeurs solaires", "icon": "Sun",
                     "description": "Routeurs alimentés par panneau solaire (Africa)."},
                ],
            },
            # ─── 5.8 Stockage & Mémoire ───────────────────────────────────
            {
                "slug_suffix": "storage",
                "name": "Stockage & Mémoire",
                "icon": "HardDrive",
                "description": "SSD, HDD, clés USB, cartes mémoire, NAS.",
                "children": [
                    {"slug_suffix": "storage-ssd",
                     "name": "SSD (interne/externe)", "icon": "HardDrive"},
                    {"slug_suffix": "storage-hdd",
                     "name": "Disques durs HDD", "icon": "HardDrive"},
                    {"slug_suffix": "storage-usb-drives",
                     "name": "Clés USB", "icon": "Usb"},
                    {"slug_suffix": "storage-memory-cards",
                     "name": "Cartes mémoire", "icon": "MemoryStick"},
                    {"slug_suffix": "storage-nas",
                     "name": "NAS & Serveurs de stockage", "icon": "Server"},
                ],
            },
            # ─── 5.9 Audio ────────────────────────────────────────────────
            {
                "slug_suffix": "audio",
                "name": "Audio",
                "icon": "Headphones",
                "description": "Casques, écouteurs, enceintes, home cinéma.",
                "children": [
                    {"slug_suffix": "audio-headphones",
                     "name": "Casques", "icon": "Headphones"},
                    {"slug_suffix": "audio-earbuds",
                     "name": "Écouteurs sans-fil", "icon": "Headphones"},
                    {"slug_suffix": "audio-wired-earphones",
                     "name": "Écouteurs filaires", "icon": "Headphones"},
                    {"slug_suffix": "audio-speakers",
                     "name": "Enceintes", "icon": "Speaker"},
                    {"slug_suffix": "audio-soundbars",
                     "name": "Barres de son", "icon": "Speaker"},
                    {"slug_suffix": "audio-hifi",
                     "name": "Hi-Fi & Amplification", "icon": "Radio"},
                ],
            },
            # ─── 5.10 Caméras & Imagerie ──────────────────────────────────
            {
                "slug_suffix": "cameras",
                "name": "Caméras & Imagerie",
                "icon": "Camera",
                "description": "Appareils photo, objectifs, caméras action, drones.",
                "children": [
                    {"slug_suffix": "cameras-dslr-mirrorless",
                     "name": "Reflex & Hybrides", "icon": "Camera"},
                    {"slug_suffix": "cameras-compact",
                     "name": "Compacts & Bridges", "icon": "Camera"},
                    {"slug_suffix": "cameras-action",
                     "name": "Caméras d'action", "icon": "Video"},
                    {"slug_suffix": "cameras-lenses",
                     "name": "Objectifs", "icon": "Aperture"},
                    {"slug_suffix": "cameras-accessories",
                     "name": "Accessoires photo/vidéo", "icon": "Camera"},
                    {"slug_suffix": "cameras-drones",
                     "name": "Drones", "icon": "Plane",
                     "description": "Drones grand public et professionnels — vente réglementée.",
                     "requires_admin_approval": True},
                    {"slug_suffix": "cameras-surveillance",
                     "name": "Caméras de surveillance", "icon": "Video",
                     "description": "CCTV, IP cams — vente réglementée.",
                     "requires_admin_approval": True},
                ],
            },
            # ─── 5.11 Gaming ──────────────────────────────────────────────
            {
                "slug_suffix": "gaming",
                "name": "Gaming",
                "icon": "Gamepad2",
                "description": "Consoles, jeux, manettes, accessoires gaming.",
                "children": [
                    {"slug_suffix": "gaming-consoles",
                     "name": "Consoles", "icon": "Gamepad2"},
                    {"slug_suffix": "gaming-games",
                     "name": "Jeux vidéo", "icon": "Gamepad2"},
                    {"slug_suffix": "gaming-controllers",
                     "name": "Manettes", "icon": "Gamepad2"},
                    {"slug_suffix": "gaming-accessories",
                     "name": "Accessoires gaming", "icon": "Gamepad2"},
                    {"slug_suffix": "gaming-vr",
                     "name": "Réalité virtuelle", "icon": "Glasses"},
                ],
            },
            # ─── 5.12 Wearables ───────────────────────────────────────────
            {
                "slug_suffix": "wearables",
                "name": "Wearables",
                "icon": "Watch",
                "description": "Montres connectées, bracelets fitness, lunettes.",
                "children": [
                    {"slug_suffix": "wearables-smartwatches",
                     "name": "Montres connectées", "icon": "Watch"},
                    {"slug_suffix": "wearables-fitness-trackers",
                     "name": "Bracelets fitness", "icon": "Activity"},
                    {"slug_suffix": "wearables-smart-glasses",
                     "name": "Lunettes connectées", "icon": "Glasses"},
                    {"slug_suffix": "wearables-bands",
                     "name": "Bracelets & Accessoires", "icon": "Watch"},
                ],
            },
            # ─── 5.13 Smart Home / IoT ────────────────────────────────────
            {
                "slug_suffix": "smart-home",
                "name": "Smart Home & IoT",
                "icon": "Home",
                "description": "Ampoules, prises, thermostats, capteurs connectés.",
                "children": [
                    {"slug_suffix": "smart-home-bulbs",
                     "name": "Ampoules connectées", "icon": "Lightbulb"},
                    {"slug_suffix": "smart-home-plugs",
                     "name": "Prises connectées", "icon": "Plug"},
                    {"slug_suffix": "smart-home-thermostats",
                     "name": "Thermostats", "icon": "Thermometer"},
                    {"slug_suffix": "smart-home-sensors",
                     "name": "Capteurs", "icon": "Radar"},
                    {"slug_suffix": "smart-home-hubs",
                     "name": "Hubs & Assistants", "icon": "Speaker"},
                    {"slug_suffix": "smart-home-locks",
                     "name": "Serrures connectées", "icon": "Lock",
                     "description": "Serrures intelligentes — vérification renforcée.",
                     "requires_admin_approval": True},
                ],
            },
            # ─── 5.14 Électronique de puissance ───────────────────────────
            {
                "slug_suffix": "power",
                "name": "Électronique de puissance",
                "icon": "Battery",
                "description": "Power banks, UPS, chargeurs, solaire.",
                "children": [
                    {"slug_suffix": "power-power-banks",
                     "name": "Power banks", "icon": "BatteryCharging"},
                    {"slug_suffix": "power-ups",
                     "name": "Onduleurs (UPS)", "icon": "Battery"},
                    {"slug_suffix": "power-chargers",
                     "name": "Chargeurs & Adaptateurs", "icon": "Plug"},
                    {"slug_suffix": "power-solar-kits",
                     "name": "Kits solaires domestiques", "icon": "Sun",
                     "description": "Panneaux + batterie pour usage domestique (Africa)."},
                    {"slug_suffix": "power-portable-stations",
                     "name": "Stations d'énergie portables", "icon": "BatteryCharging"},
                    {"slug_suffix": "power-industrial-batteries",
                     "name": "Batteries industrielles", "icon": "Battery",
                     "description": "Batteries industrielles — vente réglementée.",
                     "requires_admin_approval": True},
                ],
            },
            # ─── 5.15 Électronique de sécurité ────────────────────────────
            {
                "slug_suffix": "security",
                "name": "Électronique de sécurité",
                "icon": "Shield",
                "description": "DVR/NVR, kits CCTV, biométrie, contrôle d'accès.",
                "requires_admin_approval": True,   # Toute la branche est sensible
                "children": [
                    {"slug_suffix": "security-dvr-nvr",
                     "name": "DVR / NVR", "icon": "HardDrive"},
                    {"slug_suffix": "security-camera-kits",
                     "name": "Kits caméras CCTV", "icon": "Video"},
                    {"slug_suffix": "security-biometric",
                     "name": "Biométrie", "icon": "Fingerprint",
                     "description": "Lecteurs d'empreintes, reconnaissance faciale."},
                    {"slug_suffix": "security-access-control",
                     "name": "Contrôle d'accès", "icon": "Lock"},
                    {"slug_suffix": "security-alarms",
                     "name": "Alarmes", "icon": "Bell"},
                ],
            },
        ],
    },
]
 
 
class Command(BaseCommand):
    help = (
        "Peuple la hiérarchie Electronics conformément au Product "
        "Representation Model Volume 1. Idempotent, non-destructif."
    )
 
    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simule sans écrire en base.",
        )
        parser.add_argument(
            "--mark-legacy",
            action="store_true",
            help=(
                "Marque les anciennes catégories Electronics plates comme "
                "is_deprecated=True. Demande confirmation interactive."
            ),
        )
 
    # ─── Point d'entrée ────────────────────────────────────────────────
 
    def handle(self, *args, **opts):
        self.dry_run = opts["dry_run"]
        self.stats = {"created": 0, "updated": 0, "skipped": 0}
 
        if self.dry_run:
            self.stdout.write(self.style.WARNING(
                "── DRY RUN — aucune écriture en base ──"
            ))
 
        # Étape 1 : peuplement idempotent de la nouvelle hiérarchie
        with transaction.atomic():
            for root in TAXONOMY:
                self._seed_recursive(root, parent=None, order_counter=0)
 
            if self.dry_run:
                # Roll back explicitement pour un dry run 100% propre
                transaction.set_rollback(True)
 
        # Étape 2 (optionnelle) : marquer les catégories legacy
        if opts["mark_legacy"]:
            self._mark_legacy_categories()
 
        # Rapport final
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("── Rapport ──"))
        self.stdout.write(f"  Créées : {self.stats['created']}")
        self.stdout.write(f"  Mises à jour : {self.stats['updated']}")
        self.stdout.write(f"  Inchangées : {self.stats['skipped']}")
 
    # ─── Peuplement récursif ───────────────────────────────────────────
 
    def _seed_recursive(self, node, parent, order_counter):
        """Crée ou met à jour une catégorie et ses enfants."""
        slug = self._make_slug(node["slug_suffix"])
        name = node["name"]
        icon = node.get("icon", "")
        description = node.get("description", "")
        requires_approval = node.get("requires_admin_approval", False)
 
        # Payload des champs éditoriaux (mis à jour à chaque run)
        editorial_fields = {
            "name": name,
            "icon_name": icon,
            "description": description,
            "requires_admin_approval": requires_approval,
            "display_order": order_counter,
            "is_active": True,
            "is_deprecated": False,
        }
 
        if self.dry_run:
            action = self._simulate(slug, parent, editorial_fields)
        else:
            action = self._apply(slug, parent, editorial_fields)
 
        # Récupération de l'instance pour récursion (créée ou existante)
        category = Category.objects.get(slug=slug) if not self.dry_run else None
        self.stats[action] += 1
 
        # Log lisible avec indentation par profondeur
        indent = "  " * (parent.level + 1 if parent else 0)
        flag = " ⚠️  MOD-RENFORCÉE" if requires_approval else ""
        style = {
            "created": self.style.SUCCESS,
            "updated": self.style.WARNING,
            "skipped": self.style.NOTICE,
        }[action]
        self.stdout.write(f"{indent}{style(action.upper())} {name} ({slug}){flag}")
 
        # Récursion enfants
        for i, child in enumerate(node.get("children", [])):
            self._seed_recursive(child, parent=category, order_counter=i)
 
    def _apply(self, slug, parent, fields):
        """Crée ou met à jour la catégorie. Retourne 'created' | 'updated' | 'skipped'."""
        existing = Category.objects.filter(slug=slug).first()
        if existing is None:
            Category.objects.create(slug=slug, parent=parent, **fields)
            return "created"
 
        # Détection des changements
        changed = False
        for k, v in fields.items():
            if getattr(existing, k) != v:
                setattr(existing, k, v)
                changed = True
        if existing.parent_id != (parent.id if parent else None):
            existing.parent = parent
            changed = True
 
        if changed:
            existing.save()
            return "updated"
        return "skipped"
 
    def _simulate(self, slug, parent, fields):
        """Version dry-run : détecte l'action sans écrire."""
        existing = Category.objects.filter(slug=slug).first()
        if existing is None:
            return "created"
        for k, v in fields.items():
            if getattr(existing, k) != v:
                return "updated"
        if existing.parent_id != (parent.id if parent else None):
            return "updated"
        return "skipped"
 
    # ─── Utilitaires ───────────────────────────────────────────────────
 
    def _make_slug(self, suffix):
        """
        Convention : slug préfixé "electronics-" sauf pour la racine
        elle-même qui a le slug simple "electronics".
        """
        if not suffix:
            return SLUG_PREFIX
        # Sécurité : re-slugifier au cas où
        clean = slugify(suffix)
        # Éviter le double préfixe si suffix commence déjà par "electronics-"
        if clean.startswith(f"{SLUG_PREFIX}-"):
            return clean
        return f"{SLUG_PREFIX}-{clean}"
 
    def _mark_legacy_categories(self):
        """
        Marque comme deprecated les anciennes catégories Electronics plates.
        Demande confirmation interactive (destructif fonctionnellement).
        """
        candidates = Category.objects.filter(
            slug__in=LEGACY_ELECTRONICS_SLUGS,
            is_deprecated=False,
        )
        if not candidates.exists():
            self.stdout.write(self.style.NOTICE(
                "Aucune catégorie legacy Electronics à marquer."
            ))
            return
 
        self.stdout.write("")
        self.stdout.write(self.style.WARNING(
            "── Catégories legacy candidates à marquer deprecated ──"
        ))
        for cat in candidates:
            product_count = cat.master_products.count() if hasattr(cat, 'master_products') else 0
            self.stdout.write(
                f"  • {cat.name} (slug={cat.slug}) — "
                f"{product_count} MasterProduct rattaché(s)"
            )
 
        if self.dry_run:
            self.stdout.write(self.style.WARNING(
                "(dry-run) Aucun changement appliqué."
            ))
            return
 
        confirm = input(
            "\nMarquer ces catégories comme deprecated ? "
            "(elles resteront liées aux fiches existantes mais ne "
            "seront plus proposées dans les formulaires). [y/N] "
        )
        if confirm.lower() != "y":
            self.stdout.write("Annulé.")
            return
 
        with transaction.atomic():
            count = candidates.update(is_deprecated=True)
        self.stdout.write(self.style.SUCCESS(
            f"{count} catégorie(s) marquée(s) deprecated."
        ))