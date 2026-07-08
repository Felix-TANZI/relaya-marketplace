from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
 
from apps.catalog.models import ColorDictionary, ColorFamily
 
 
# ═══════════════════════════════════════════════════════════════════════════
# LES 17 COULEURS UNIVERSELLES
# ═══════════════════════════════════════════════════════════════════════════
# Format : (name_fr, name_en, hex_code, is_neutral, display_order)
#
# Convention display_order :
#   0-99   : couleurs neutres (Noir, Blanc, Gris, Argent, Or, Titane, Champagne)
#   100-199 : couleurs primaires (Rouge, Bleu, Vert, Jaune)
#   200+    : couleurs secondaires (Rose, Orange, Violet, Bleu ciel, Marron, Beige)
# ═══════════════════════════════════════════════════════════════════════════
 
COLORS = [
    # ─── Neutres (0-99) ───────────────────────────────────────────────
    ("Noir",       "Black",     "#000000", True,  10),
    ("Blanc",      "White",     "#FFFFFF", True,  20),
    ("Gris",       "Gray",      "#6B7280", True,  30),
    ("Gris sidéral","Space Gray", "#3F3F46", True, 35),
    ("Argent",     "Silver",    "#C0C0C0", True,  40),
    ("Or",         "Gold",      "#D4AF37", True,  50),
    ("Or rose",    "Rose Gold", "#B76E79", True,  55),
    ("Titane",     "Titanium",  "#878681", True,  60),
    ("Champagne",  "Champagne", "#F7E7CE", True,  70),
 
    # ─── Primaires (100-199) ──────────────────────────────────────────
    ("Rouge",      "Red",       "#DC2626", False, 110),
    ("Bleu",       "Blue",      "#2563EB", False, 120),
    ("Vert",       "Green",     "#16A34A", False, 130),
    ("Jaune",      "Yellow",    "#FACC15", False, 140),
 
    # ─── Secondaires (200+) ───────────────────────────────────────────
    ("Rose",       "Pink",      "#EC4899", False, 210),
    ("Orange",     "Orange",    "#F97316", False, 220),
    ("Violet",     "Purple",    "#9333EA", False, 230),
    ("Bleu ciel",  "Sky Blue",  "#38BDF8", False, 240),
    ("Marron",     "Brown",     "#92400E", False, 250),
    ("Beige",      "Beige",     "#E7D0B4", False, 260),
]
 
 
# ═══════════════════════════════════════════════════════════════════════════
# LES FINITIONS ELECTRONICS
# ═══════════════════════════════════════════════════════════════════════════
# Format : (name_fr, name_en, hex_code_representatif_ou_vide, display_order)
#
# Les finitions n'ont pas de hex_code strict — elles décrivent un traitement
# de surface. On donne un hex représentatif quand ça a du sens (Aluminium =
# gris métallique clair) ou vide.
# ═══════════════════════════════════════════════════════════════════════════
 
FINISHES = [
    ("Mat",         "Matte",       "",        10),
    ("Brillant",    "Glossy",      "",        20),
    ("Satiné",      "Satin",       "",        30),
    ("Métallique",  "Metallic",    "#B8B8B8", 40),
    ("Aluminium",   "Aluminum",    "#A9A9A9", 50),
    ("Verre",       "Glass",       "",        60),
    ("Cuir",        "Leather",     "#8B4513", 70),
    ("Bois",        "Wood",        "#A0522D", 80),
    ("Texturé",     "Textured",    "",        90),
]
 
 
class Command(BaseCommand):
    help = (
        "Peuple le ColorDictionary avec les couleurs universelles et "
        "les finitions Electronics standard."
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
            help="Met à jour hex_code / name_en des entrées déjà présentes.",
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
            # Couleurs
            self.stdout.write(self.style.MIGRATE_HEADING("── COULEURS ──"))
            for name_fr, name_en, hex_code, is_neutral, order in COLORS:
                action = self._process(
                    family=ColorFamily.COLOR,
                    name=name_fr,
                    name_en=name_en,
                    hex_code=hex_code,
                    is_neutral=is_neutral,
                    display_order=order,
                )
                stats[action] += 1
                self._log(action, name_fr, hex_code)
 
            # Finitions
            self.stdout.write(self.style.MIGRATE_HEADING("── FINITIONS ──"))
            for name_fr, name_en, hex_code, order in FINISHES:
                action = self._process(
                    family=ColorFamily.FINISH,
                    name=name_fr,
                    name_en=name_en,
                    hex_code=hex_code,
                    is_neutral=False,
                    display_order=order,
                )
                stats[action] += 1
                self._log(action, name_fr, hex_code)
 
            if self.dry_run:
                transaction.set_rollback(True)
 
        # Rapport final
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("── Rapport ──"))
        self.stdout.write(f"  Créées : {stats['created']}")
        self.stdout.write(f"  Mises à jour : {stats['updated']}")
        self.stdout.write(f"  Inchangées : {stats['skipped']}")
 
    def _process(self, family, name, name_en, hex_code, is_neutral, display_order):
        """Retourne 'created' | 'updated' | 'skipped'."""
        existing = ColorDictionary.objects.filter(family=family, name=name).first()
 
        if existing is None:
            if not self.dry_run:
                # Le slug est calculé automatiquement dans le save() du modèle
                ColorDictionary.objects.create(
                    family=family,
                    name=name,
                    name_en=name_en,
                    hex_code=hex_code,
                    is_neutral=is_neutral,
                    display_order=display_order,
                    is_active=True,
                )
            return "created"
 
        if not self.update_existing:
            return "skipped"
 
        # Mode update-existing
        changed = False
        for field, new_value in [
            ("name_en", name_en),
            ("hex_code", hex_code),
            ("is_neutral", is_neutral),
            ("display_order", display_order),
        ]:
            if getattr(existing, field) != new_value:
                setattr(existing, field, new_value)
                changed = True
 
        if changed:
            if not self.dry_run:
                existing.save()
            return "updated"
        return "skipped"
 
    def _log(self, action, name, hex_code):
        style = {
            "created": self.style.SUCCESS,
            "updated": self.style.WARNING,
            "skipped": self.style.NOTICE,
        }[action]
        hex_display = f" [{hex_code}]" if hex_code else ""
        self.stdout.write(f"  {style(action.upper())} {name}{hex_display}")