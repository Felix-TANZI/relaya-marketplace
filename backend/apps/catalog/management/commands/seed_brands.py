from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
 
from apps.catalog.models import Brand
 
 
# ═══════════════════════════════════════════════════════════════════════════
# DICTIONNAIRE DES MARQUES OFFICIELLES ELECTRONICS
# ═══════════════════════════════════════════════════════════════════════════
#
# Organisé par groupe fonctionnel (juste pour la lisibilité — techniquement,
# une marque n'est pas liée à une catégorie).
#
# Format : (name, country, description_courte)
# ═══════════════════════════════════════════════════════════════════════════
 
BRANDS = [
    # ─── Smartphones & Téléphonie ─────────────────────────────────────
    ("Apple",       "USA",              "Fabricant américain d'iPhone, iPad, Mac et accessoires."),
    ("Samsung",     "Corée du Sud",     "Conglomérat sud-coréen, leader des smartphones Android."),
    ("Xiaomi",      "Chine",            "Constructeur chinois, gamme large de smartphones et objets connectés."),
    ("Huawei",      "Chine",            "Constructeur chinois de smartphones et équipements réseau."),
    ("Honor",       "Chine",            "Ancienne filiale de Huawei, désormais indépendante."),
    ("Tecno",       "Chine (HK)",       "Marque très populaire en Afrique, spécialisée en smartphones abordables."),
    ("Infinix",     "Chine (HK)",       "Filiale de Transsion, forte présence sur le marché africain."),
    ("Itel",        "Chine (HK)",       "Filiale de Transsion, feature phones et smartphones entrée de gamme."),
    ("Oppo",        "Chine",            "Constructeur chinois de smartphones, marque grand public."),
    ("Vivo",        "Chine",            "Constructeur chinois de smartphones, focus photo/design."),
    ("Realme",      "Chine",            "Marque de smartphones, filiale d'Oppo."),
    ("OnePlus",     "Chine",            "Marque premium, filiale d'Oppo."),
    ("Nokia",       "Finlande",         "Marque historique de téléphonie, licence HMD Global."),
    ("Google",      "USA",              "Fabricant des Pixel, Chromecast, Nest."),
    ("Motorola",    "USA (Lenovo)",     "Marque historique, filiale de Lenovo."),
 
    # ─── Ordinateurs & Périphériques ──────────────────────────────────
    ("HP",          "USA",              "Constructeur américain d'ordinateurs, imprimantes, accessoires."),
    ("Dell",        "USA",              "Constructeur américain d'ordinateurs et serveurs."),
    ("Lenovo",      "Chine",            "Constructeur chinois d'ordinateurs (ex-IBM PC), leader mondial."),
    ("Asus",        "Taïwan",           "Constructeur taïwanais d'ordinateurs, cartes mères, ROG gaming."),
    ("Acer",        "Taïwan",           "Constructeur taïwanais d'ordinateurs grand public."),
    ("MSI",         "Taïwan",           "Constructeur taïwanais, focus gaming et cartes mères."),
    ("Toshiba",     "Japon",            "Marque historique d'ordinateurs et accessoires."),
    ("Microsoft",   "USA",              "Surface, Xbox, périphériques et logiciels."),
    ("Logitech",    "Suisse",           "Périphériques informatiques : claviers, souris, webcams."),
    ("Razer",       "USA/Singapour",    "Marque gaming premium : périphériques et laptops."),
    ("Corsair",     "USA",              "Périphériques et composants PC : claviers, RAM, alimentations."),
 
    # ─── Composants ──────────────────────────────────────────────────
    ("Intel",       "USA",              "Processeurs, chipsets, réseau."),
    ("AMD",         "USA",              "Processeurs Ryzen, cartes graphiques Radeon."),
    ("NVIDIA",      "USA",              "Cartes graphiques GeForce, calcul IA."),
    ("Gigabyte",    "Taïwan",           "Cartes mères, cartes graphiques, laptops Aorus."),
    ("ASRock",      "Taïwan",           "Cartes mères, mini PC."),
    ("Kingston",    "USA",              "Mémoire RAM, SSD, clés USB."),
    ("G.Skill",     "Taïwan",           "Mémoire RAM haute performance."),
    ("Western Digital", "USA",          "Disques durs, SSD, cartes microSD SanDisk."),
    ("Seagate",     "USA",              "Disques durs, solutions de stockage."),
    ("SanDisk",     "USA (WD)",         "Cartes mémoire, clés USB, SSD portables."),
    ("Crucial",     "USA",              "Mémoire RAM et SSD grand public (Micron)."),
 
    # ─── Audio ────────────────────────────────────────────────────────
    ("JBL",         "USA",              "Enceintes Bluetooth, casques, home cinéma."),
    ("Bose",        "USA",              "Audio premium : casques, enceintes, home cinéma."),
    ("Sony",        "Japon",            "Électronique grand public, audio, PlayStation."),
    ("Beats",       "USA (Apple)",      "Casques et écouteurs, filiale d'Apple."),
    ("Sennheiser",  "Allemagne",        "Casques et micros professionnels et grand public."),
    ("Anker",       "Chine",            "Accessoires : Soundcore, Powercore, chargeurs."),
    ("Marshall",    "Royaume-Uni",      "Casques et enceintes au style rock."),
    ("Skullcandy",  "USA",              "Casques et écouteurs urbains."),
 
    # ─── Gaming ───────────────────────────────────────────────────────
    ("PlayStation", "Japon (Sony)",     "Consoles PlayStation, jeux et accessoires."),
    ("Xbox",        "USA (Microsoft)",  "Consoles Xbox, jeux et Game Pass."),
    ("Nintendo",    "Japon",            "Consoles Switch, jeux Mario, Zelda, Pokémon."),
    ("SteelSeries", "Danemark",         "Périphériques gaming pro."),
    ("HyperX",      "USA",              "Périphériques gaming grand public."),
 
    # ─── Wearables ────────────────────────────────────────────────────
    ("Fitbit",      "USA (Google)",     "Bracelets et montres fitness."),
    ("Garmin",      "USA",              "Montres GPS, sport, aviation."),
    ("Amazfit",     "Chine",            "Montres et bracelets connectés (Huami)."),
 
    # ─── Caméras & Imagerie ───────────────────────────────────────────
    ("Canon",       "Japon",            "Appareils photo, imprimantes, matériel pro."),
    ("Nikon",       "Japon",            "Appareils photo réflex et hybrides."),
    ("Fujifilm",    "Japon",            "Appareils photo hybrides, films instantanés."),
    ("GoPro",       "USA",              "Caméras d'action et accessoires."),
    ("DJI",         "Chine",            "Drones grand public et professionnels, stabilisateurs."),
 
    # ─── Périphériques réseau ────────────────────────────────────────
    ("TP-Link",     "Chine",            "Routeurs, mesh WiFi, switchs grand public."),
    ("Netgear",     "USA",              "Routeurs et équipements réseau."),
    ("Ubiquiti",    "USA",              "Réseau professionnel et grand public (UniFi)."),
    ("D-Link",      "Taïwan",           "Réseau grand public : routeurs, cameras IP."),
 
    # ─── Puissance / Énergie ─────────────────────────────────────────
    ("Baseus",      "Chine",            "Chargeurs, câbles, accessoires mobiles."),
    ("Ugreen",      "Chine",            "Câbles, chargeurs, docks USB-C."),
    ("APC",         "USA",              "Onduleurs et solutions d'alimentation."),
    ("EcoFlow",     "Chine",            "Stations d'énergie portables, panneaux solaires."),
    ("Jackery",     "USA/Chine",        "Stations d'énergie portables solaires."),
 
    # ─── Smart Home ──────────────────────────────────────────────────
    ("Philips Hue", "Pays-Bas",         "Ampoules connectées Philips."),
    ("Amazon",      "USA",              "Echo, Alexa, Fire TV, Kindle."),
    ("Ring",        "USA (Amazon)",     "Sonnettes et caméras de sécurité connectées."),
    ("Yale",        "Suède",            "Serrures connectées et systèmes de sécurité."),
 
    # ─── Sécurité ────────────────────────────────────────────────────
    ("Hikvision",   "Chine",            "Caméras de surveillance IP et DVR/NVR."),
    ("Dahua",       "Chine",            "Caméras de surveillance et systèmes CCTV."),
    ("ZKTeco",      "Chine",            "Biométrie et contrôle d'accès."),
]
 
 
class Command(BaseCommand):
    help = (
        "Peuple le registre Brand avec les marques mainstream Electronics "
        "pour le marché camerounais et africain."
    )
 
    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simule sans écrire en base.",
        )
        parser.add_argument(
            "--update-existing",
            action="store_true",
            help=(
                "Met à jour is_verified, country_of_origin et description des "
                "marques déjà présentes. Par défaut, on ne touche pas."
            ),
        )
 
    def handle(self, *args, **opts):
        self.dry_run = opts["dry_run"]
        self.update_existing = opts["update_existing"]
        stats = {"created": 0, "updated": 0, "skipped": 0}
 
        if self.dry_run:
            self.stdout.write(self.style.WARNING(
                "── DRY RUN — aucune écriture en base ──"
            ))
 
        with transaction.atomic():
            for name, country, description in BRANDS:
                action = self._process_brand(name, country, description)
                stats[action] += 1
 
                style = {
                    "created": self.style.SUCCESS,
                    "updated": self.style.WARNING,
                    "skipped": self.style.NOTICE,
                }[action]
                self.stdout.write(f"  {style(action.upper())} {name}")
 
            if self.dry_run:
                transaction.set_rollback(True)
 
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("── Rapport ──"))
        self.stdout.write(f"  Créées : {stats['created']}")
        self.stdout.write(f"  Mises à jour : {stats['updated']}")
        self.stdout.write(f"  Inchangées : {stats['skipped']}")
 
    def _process_brand(self, name, country, description):
        """Retourne 'created' | 'updated' | 'skipped'."""
        # Lookup case-insensitive pour éviter les doublons
        existing = Brand.objects.filter(name__iexact=name).first()
 
        if existing is None:
            if not self.dry_run:
                slug = slugify(name)
                # Éviter conflit de slug si "SamsungGalaxy" existe déjà
                counter = 1
                while Brand.objects.filter(slug=slug).exists():
                    slug = f"{slugify(name)}-{counter}"
                    counter += 1
                Brand.objects.create(
                    name=name,
                    slug=slug,
                    country_of_origin=country,
                    description=description,
                    is_verified=True,
                    is_active=True,
                )
            return "created"
 
        # Marque existe
        if not self.update_existing:
            return "skipped"
 
        # Mode update-existing : on force verified + on met à jour
        changed = False
        if not existing.is_verified:
            existing.is_verified = True
            changed = True
        if country and existing.country_of_origin != country:
            existing.country_of_origin = country
            changed = True
        if description and not existing.description:
            existing.description = description
            changed = True
 
        if changed:
            if not self.dry_run:
                existing.save(update_fields=[
                    "is_verified", "country_of_origin", "description", "updated_at",
                ])
            return "updated"
        return "skipped"